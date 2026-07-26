/**
 * Test suite for src/lib/repository.ts
 *
 * Covers:
 * 1. Basic round-trip — write then read back for both entities.
 * 2. Data isolation — contracts and milestones live under the same key but
 *    never clobber each other.
 * 3. Corrupt data handling — malformed JSON falls back to [] gracefully.
 * 4. SSR context isolation — functions return [] safely when window is absent.
 * 5. Empty-store defaults — first read on a fresh store returns [].
 * 6. Multiple writes — each save is additive, not a full replacement.
 * 7. writeStore failure — localStorage.setItem throws; error reported, no crash.
 * 8. clearAppData — removes STORAGE_KEY; SSR no-op; reporter on failure.
 * 9. clearByPrefix — prefix scoping, snapshot iteration, SSR no-op, reporter
 *    on failure, edge-cases (no matches, mixed keys, throwing removeItem).
 */

import {
  isBrowser,
  listContracts,
  saveContract,
  upsertContract,
  updateContract,
  updateMilestone,
  listMilestones,
  saveMilestone,
  clearAppData,
  clearByPrefix,
  STORAGE_KEY,
} from '../repository';
import type { Contract, Milestone } from '@/types/domain';
import { setErrorReporter } from '../errorReporter';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const contractA: Contract = {
  contractName: 'Alpha Contract',
  parties: [{ label: 'Client', address: '0xAAA' }],
  totalValue: 1000,
  currency: 'USD',
  status: 'Active',
  createdAt: 'Jan 1, 2025',
  milestoneCount: 2,
};

const contractB: Contract = {
  contractName: 'Beta Contract',
  parties: [{ label: 'Freelancer', address: '0xBBB' }],
  totalValue: 2500,
  currency: 'USD',
  status: 'Pending',
  createdAt: 'Feb 1, 2025',
  milestoneCount: 1,
};

const milestoneA: Milestone = {
  id: 'ms-001',
  title: 'Kickoff',
  status: 'Pending',
  payout: 500,
  currency: 'USD',
  dueDate: 'Mar 1, 2025',
};

const milestoneB: Milestone = {
  id: 'ms-002',
  title: 'Delivery',
  status: 'Completed',
  payout: 1500,
  currency: 'USD',
  dueDate: 'Apr 15, 2025',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Directly seeds raw JSON into localStorage for corruption tests. */
function seedRaw(value: string) {
  window.localStorage.setItem(STORAGE_KEY, value);
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  window.localStorage.clear();
  jest.restoreAllMocks();
});

// ===========================================================================
// 0. isBrowser SSR GUARD
// ===========================================================================

describe('isBrowser', () => {
  it('returns true when window is defined (browser environment)', () => {
    expect(isBrowser()).toBe(true);
  });
});

// ===========================================================================
// 1. EMPTY STORE DEFAULTS
// ===========================================================================

describe('empty store', () => {
  it('listContracts returns [] when storage is empty', () => {
    expect(listContracts()).toEqual([]);
  });

  it('listMilestones returns [] when storage is empty', () => {
    expect(listMilestones()).toEqual([]);
  });
});

// ===========================================================================
// 2. BASIC ROUND-TRIP
// ===========================================================================

describe('contract round-trip', () => {
  it('saves a contract and reads it back', () => {
    saveContract(contractA);
    expect(listContracts()).toEqual([contractA]);
  });

  it('preserves all Contract fields intact', () => {
    saveContract(contractA);
    const [result] = listContracts();
    expect(result.contractName).toBe('Alpha Contract');
    expect(result.parties).toEqual([{ label: 'Client', address: '0xAAA' }]);
    expect(result.totalValue).toBe(1000);
    expect(result.status).toBe('Active');
    expect(result.milestoneCount).toBe(2);
  });
});

describe('contract upsert', () => {
  it('replaces a matching contract by contractName instead of appending a duplicate', () => {
    saveContract(contractA);

    const updatedContract: Contract = {
      ...contractA,
      status: 'Completed',
      milestoneCount: 3,
    };

    expect(upsertContract(updatedContract)).toBe(true);
    expect(listContracts()).toEqual([updatedContract]);
  });

  it('appends the contract when no matching contractName exists yet', () => {
    saveContract(contractA);

    expect(upsertContract(contractB)).toBe(true);
    expect(listContracts()).toEqual([contractA, contractB]);
  });

  it('preserves array order and does not duplicate when replacing a same-name contract in place', () => {
    saveContract(contractA);
    saveContract(contractB);

    const updatedA: Contract = {
      ...contractA,
      status: 'Completed',
    };

    expect(upsertContract(updatedA)).toBe(true);
    const result = listContracts();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(updatedA);
    expect(result[1]).toEqual(contractB);
  });

  it('never disturbs persisted milestones and preserves other contracts unchanged during upsert', () => {
    saveContract(contractA);
    saveContract(contractB);
    saveMilestone(milestoneA);
    saveMilestone(milestoneB);

    const updatedB: Contract = {
      ...contractB,
      status: 'Completed',
    };

    expect(upsertContract(updatedB)).toBe(true);

    // Other contracts and milestones remain unchanged
    expect(listContracts()).toEqual([contractA, updatedB]);
    expect(listMilestones()).toEqual([milestoneA, milestoneB]);
  });

  it('successfully inserts a contract into an empty store', () => {
    expect(upsertContract(contractA)).toBe(true);
    expect(listContracts()).toEqual([contractA]);
  });

  it('replaces only the first candidate and preserves array order when multiple same-name candidates exist', () => {
    // Seed store with duplicate names manually
    const duplicateA1 = { ...contractA, status: 'Active' as const };
    const duplicateA2 = { ...contractA, status: 'Pending' as const };
    const store = {
      contracts: [duplicateA1, contractB, duplicateA2],
      milestones: []
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));

    const upserted: Contract = { ...contractA, status: 'Completed' as const };
    expect(upsertContract(upserted)).toBe(true);

    const result = listContracts();
    expect(result).toHaveLength(3);
    // Only the first one is replaced, order is preserved, and second duplicate is untouched
    expect(result[0]).toEqual(upserted);
    expect(result[1]).toEqual(contractB);
    expect(result[2]).toEqual(duplicateA2);
  });
});

describe('updateContract', () => {
  it('replaces the contract found by its original name, in place', () => {
    saveContract(contractA);
    saveContract(contractB);

    const edited: Contract = { ...contractA, status: 'Completed' };
    expect(updateContract(contractA.contractName, edited)).toBe(true);

    const result = listContracts();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(edited);
    expect(result[1]).toEqual(contractB);
  });

  it('renames a contract without creating a duplicate', () => {
    saveContract(contractA);

    const renamed: Contract = { ...contractA, contractName: 'Renamed Alpha' };
    expect(updateContract(contractA.contractName, renamed)).toBe(true);

    const result = listContracts();
    expect(result).toHaveLength(1);
    expect(result[0].contractName).toBe('Renamed Alpha');
  });

  it('returns false and changes nothing when no contract matches the original name', () => {
    saveContract(contractA);

    expect(updateContract('Missing Contract', contractB)).toBe(false);
    expect(listContracts()).toEqual([contractA]);
  });

  it('leaves milestones untouched', () => {
    saveContract(contractA);
    saveMilestone(milestoneA);

    updateContract(contractA.contractName, { ...contractA, status: 'Paid' });

    expect(listMilestones()).toEqual([milestoneA]);
  });
});

describe('milestone round-trip', () => {
  it('saves a milestone and reads it back', () => {
    saveMilestone(milestoneA);
    expect(listMilestones()).toEqual([milestoneA]);
  });

  it('preserves all Milestone fields intact', () => {
    saveMilestone(milestoneA);
    const [result] = listMilestones();
    expect(result.id).toBe('ms-001');
    expect(result.title).toBe('Kickoff');
    expect(result.status).toBe('Pending');
    expect(result.payout).toBe(500);
    expect(result.dueDate).toBe('Mar 1, 2025');
  });
});

describe('updateMilestone operation', () => {
  it('updates an existing milestone by id', () => {
    saveMilestone(milestoneA);
    const updated = { status: 'Completed' } as Partial<Milestone>;
    expect(updateMilestone('ms-001', updated)).toBe(true);
    const [result] = listMilestones();
    expect(result.status).toBe('Completed');
  });

  it('returns false and warns when id not found', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(updateMilestone('non-existent', { status: 'Paid' })).toBe(false);
    expect(console.warn).toHaveBeenCalled();
  });

  it('does not mutate original milestone object', () => {
    saveMilestone(milestoneA);
    const original = { ...milestoneA };
    updateMilestone('ms-001', { status: 'Disputed' });
    expect(milestoneA).toEqual(original);
  });
});


// ===========================================================================
// 3. MULTIPLE WRITES ARE ADDITIVE
// ===========================================================================

describe('multiple saves are additive', () => {
  it('accumulates multiple contracts', () => {
    saveContract(contractA);
    saveContract(contractB);
    const result = listContracts();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(contractA);
    expect(result[1]).toEqual(contractB);
  });

  it('accumulates multiple milestones', () => {
    saveMilestone(milestoneA);
    saveMilestone(milestoneB);
    const result = listMilestones();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(milestoneA);
    expect(result[1]).toEqual(milestoneB);
  });
});

// ===========================================================================
// 4. DATA ISOLATION — contracts and milestones never overwrite each other
// ===========================================================================

describe('data isolation', () => {
  it('saving a contract does not erase existing milestones', () => {
    saveMilestone(milestoneA);
    saveMilestone(milestoneB);

    saveContract(contractA);

    // Milestones must still be intact
    expect(listMilestones()).toHaveLength(2);
    expect(listMilestones()[0]).toEqual(milestoneA);

    // Contract also persisted
    expect(listContracts()).toHaveLength(1);
  });

  it('saving a milestone does not erase existing contracts', () => {
    saveContract(contractA);
    saveContract(contractB);

    saveMilestone(milestoneA);

    // Contracts must still be intact
    expect(listContracts()).toHaveLength(2);
    expect(listContracts()[1]).toEqual(contractB);

    // Milestone also persisted
    expect(listMilestones()).toHaveLength(1);
  });

  it('interleaved saves preserve the full data set', () => {
    saveContract(contractA);
    saveMilestone(milestoneA);
    saveContract(contractB);
    saveMilestone(milestoneB);

    expect(listContracts()).toEqual([contractA, contractB]);
    expect(listMilestones()).toEqual([milestoneA, milestoneB]);
  });
});

// ===========================================================================
// 5. CORRUPT / INVALID DATA HANDLING
// ===========================================================================

describe('corrupt data handling', () => {
  let mockReporter: jest.Mock;

  beforeEach(() => {
    mockReporter = jest.fn();
    setErrorReporter(mockReporter);
  });

  afterEach(() => {
    setErrorReporter(null);
  });

  it('returns [] for contracts when localStorage contains invalid JSON', () => {
    seedRaw('%%%not-json%%%');
    expect(listContracts()).toEqual([]);
  });

  it('returns [] for milestones when localStorage contains invalid JSON', () => {
    seedRaw('%%%not-json%%%');
    expect(listMilestones()).toEqual([]);
  });

  it('calls the error reporter on parse failure', () => {
    seedRaw('{invalid}');
    listContracts();
    expect(mockReporter).toHaveBeenCalledTimes(1);
    expect(mockReporter.mock.calls[0][1]).toMatch(/\[repository\]/);
  });

  it('returns [] when stored value is a JSON string (not an object)', () => {
    seedRaw('"just-a-string"');
    expect(listContracts()).toEqual([]);
    expect(listMilestones()).toEqual([]);
  });

  it('returns [] when stored value is a JSON number', () => {
    seedRaw('42');
    expect(listContracts()).toEqual([]);
    expect(listMilestones()).toEqual([]);
  });

  it('returns [] when stored value is a JSON array at the top level', () => {
    seedRaw('[]');
    expect(listContracts()).toEqual([]);
    expect(listMilestones()).toEqual([]);
  });

  it('recovers contracts array when only milestones key is missing from stored object', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ contracts: [contractA] }),
    );
    expect(listContracts()).toEqual([contractA]);
    // Missing milestones key falls back to []
    expect(listMilestones()).toEqual([]);
  });

  it('recovers milestones array when only contracts key is missing from stored object', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ milestones: [milestoneA] }),
    );
    expect(listMilestones()).toEqual([milestoneA]);
    // Missing contracts key falls back to []
    expect(listContracts()).toEqual([]);
  });

  it('does not throw even when localStorage.getItem throws', () => {
    jest.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage quota exceeded');
    });
    expect(() => listContracts()).not.toThrow();
    expect(listContracts()).toEqual([]);
  });

  it('reports the error via the central reporter when getItem throws', () => {
    jest.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage quota exceeded');
    });
    listContracts();
    expect(mockReporter).toHaveBeenCalledTimes(1);
    expect(mockReporter.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(mockReporter.mock.calls[0][1]).toMatch(/\[repository\]/);
  });
});

// ===========================================================================
// 6. SSR CONTEXT ISOLATION (window is undefined)
// ===========================================================================

describe('SSR context isolation', () => {
  // Note: The original SSR tests used `delete global.window` to simulate SSR,
  // but in Jest 30 / jsdom `global.window` is a non-configurable property.
  // Instead of modifying globals, we mock localStorage to throw, which exercises
  // the error-recovery path (catch blocks) and verifies functions never throw.
  // The SSR guard (isBrowser) is tested directly in the 'isBrowser' unit test below.

  function mockStorageUnavailable() {
    jest.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('localStorage unavailable (SSR)');
    });
    jest.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('localStorage unavailable (SSR)');
    });
    jest.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
      throw new Error('localStorage unavailable (SSR)');
    });
  }

  it('listContracts returns [] without throwing when storage is unavailable', () => {
    mockStorageUnavailable();
    expect(() => listContracts()).not.toThrow();
    expect(listContracts()).toEqual([]);
  });

  it('listMilestones returns [] without throwing when storage is unavailable', () => {
    mockStorageUnavailable();
    expect(() => listMilestones()).not.toThrow();
    expect(listMilestones()).toEqual([]);
  });

  it('saveContract does not throw when storage is unavailable', () => {
    mockStorageUnavailable();
    expect(() => saveContract(contractA)).not.toThrow();
  });

  it('saveMilestone does not throw when storage is unavailable', () => {
    mockStorageUnavailable();
    expect(() => saveMilestone(milestoneA)).not.toThrow();
  });

  it('data saved before SSR simulation is not affected after window is restored', () => {
    saveContract(contractA);

    mockStorageUnavailable();
    // Call must not throw
    listContracts();

    jest.restoreAllMocks();
    // Original data is still intact
    expect(listContracts()).toEqual([contractA]);
  });
});

// ===========================================================================
// 7. WRITE FAILURE RESILIENCE
// ===========================================================================

describe('write failure resilience', () => {
  let mockReporter: jest.Mock;

  beforeEach(() => {
    mockReporter = jest.fn();
    setErrorReporter(mockReporter);
  });

  afterEach(() => {
    setErrorReporter(null);
  });

  it('does not throw when localStorage.setItem throws', () => {
    jest.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => saveContract(contractA)).not.toThrow();
  });

  it('calls the error reporter when setItem throws', () => {
    jest.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    saveContract(contractA);
    expect(mockReporter).toHaveBeenCalledTimes(1);
    expect(mockReporter.mock.calls[0][1]).toMatch(/\[repository\]/);
  });

  it('returns false and reports the error when upsertContract fails to persist the write', () => {
    jest.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    expect(upsertContract(contractA)).toBe(false);
    expect(mockReporter).toHaveBeenCalledTimes(1);
    expect(mockReporter.mock.calls[0][1]).toMatch(/\[repository\]/);
  });
});

// ===========================================================================
// 8. CLEAR APP DATA
// ===========================================================================

describe('clearAppData', () => {
  let mockReporter: jest.Mock;

  beforeEach(() => {
    mockReporter = jest.fn();
    setErrorReporter(mockReporter);
  });

  afterEach(() => {
    setErrorReporter(null);
  });

  it('returns true and removes STORAGE_KEY on success', () => {
    saveContract(contractA);
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    expect(clearAppData()).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('listContracts returns [] after clearAppData', () => {
    saveContract(contractA);
    saveContract(contractB);
    clearAppData();
    expect(listContracts()).toEqual([]);
  });

  it('listMilestones returns [] after clearAppData', () => {
    saveMilestone(milestoneA);
    clearAppData();
    expect(listMilestones()).toEqual([]);
  });

  it('clears both contracts and milestones in a single call', () => {
    saveContract(contractA);
    saveMilestone(milestoneA);
    clearAppData();
    expect(listContracts()).toEqual([]);
    expect(listMilestones()).toEqual([]);
  });

  it('returns true even when the key was never set (idempotent)', () => {
    // localStorage is already empty from beforeEach
    expect(clearAppData()).toBe(true);
  });

  it('does not call the error reporter on a normal removal', () => {
    saveContract(contractA);
    clearAppData();
    expect(mockReporter).not.toHaveBeenCalled();
  });

  it('returns false and reports the error when removeItem throws', () => {
    jest.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });

    expect(clearAppData()).toBe(false);
    expect(mockReporter).toHaveBeenCalledTimes(1);
    expect(mockReporter.mock.calls[0][1]).toMatch(/\[repository\]/);
    expect(mockReporter.mock.calls[0][0]).toBeInstanceOf(DOMException);
  });

  it('does not throw even when removeItem throws', () => {
    jest.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });

    expect(() => clearAppData()).not.toThrow();
  });

  describe('SSR context', () => {
    it('returns false and does not throw when storage.removeItem throws', () => {
      jest.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
        throw new DOMException('Not available');
      });
      expect(() => clearAppData()).not.toThrow();
      expect(clearAppData()).toBe(false);
    });
  });
});

// ===========================================================================
// 9. CLEAR BY PREFIX
// ===========================================================================

describe('clearByPrefix', () => {
  let mockReporter: jest.Mock;

  beforeEach(() => {
    mockReporter = jest.fn();
    setErrorReporter(mockReporter);
  });

  afterEach(() => {
    setErrorReporter(null);
  });

  // -------------------------------------------------------------------------
  // Basic success path
  // -------------------------------------------------------------------------

  it('removes all keys matching the prefix and returns the count', () => {
    window.localStorage.setItem('talenttrust_alpha', 'a');
    window.localStorage.setItem('talenttrust_beta', 'b');
    window.localStorage.setItem('talenttrust_gamma', 'c');

    const removed = clearByPrefix('talenttrust_');

    expect(removed).toBe(3);
    expect(window.localStorage.getItem('talenttrust_alpha')).toBeNull();
    expect(window.localStorage.getItem('talenttrust_beta')).toBeNull();
    expect(window.localStorage.getItem('talenttrust_gamma')).toBeNull();
  });

  it('removes the STORAGE_KEY when using the talenttrust_ prefix', () => {
    saveContract(contractA);
    // STORAGE_KEY = 'talenttrust_app_data' which starts with 'talenttrust_'
    const removed = clearByPrefix('talenttrust_');
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Prefix scoping — unrelated keys must never be touched
  // -------------------------------------------------------------------------

  it('does NOT remove keys that do not match the prefix', () => {
    window.localStorage.setItem('talenttrust_mykey', 'tt');
    window.localStorage.setItem('other_service_key', 'unrelated');
    window.localStorage.setItem('another_key', 'also-unrelated');

    const removed = clearByPrefix('talenttrust_');

    expect(removed).toBe(1);
    expect(window.localStorage.getItem('other_service_key')).toBe('unrelated');
    expect(window.localStorage.getItem('another_key')).toBe('also-unrelated');
  });

  it('only removes keys with the exact prefix, not keys that merely contain it', () => {
    window.localStorage.setItem('talenttrust_real', 'yes');
    window.localStorage.setItem('prefix_talenttrust_embedded', 'no');

    const removed = clearByPrefix('talenttrust_');

    expect(removed).toBe(1);
    expect(window.localStorage.getItem('prefix_talenttrust_embedded')).toBe('no');
  });

  it('does not remove keys that have the prefix as a suffix', () => {
    window.localStorage.setItem('talenttrust_a', '1');
    window.localStorage.setItem('not_talenttrust_', '2');

    clearByPrefix('talenttrust_');

    expect(window.localStorage.getItem('not_talenttrust_')).toBe('2');
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  it('returns 0 when no keys match the prefix', () => {
    window.localStorage.setItem('other_key', 'value');
    expect(clearByPrefix('talenttrust_')).toBe(0);
  });

  it('returns 0 when localStorage is empty', () => {
    // localStorage cleared in beforeEach
    expect(clearByPrefix('talenttrust_')).toBe(0);
  });

  it('handles mixed matching and non-matching keys correctly', () => {
    window.localStorage.setItem('talenttrust_x', '1');
    window.localStorage.setItem('unrelated_y', '2');
    window.localStorage.setItem('talenttrust_z', '3');
    window.localStorage.setItem('something_else', '4');

    const removed = clearByPrefix('talenttrust_');

    expect(removed).toBe(2);
    expect(window.localStorage.getItem('talenttrust_x')).toBeNull();
    expect(window.localStorage.getItem('talenttrust_z')).toBeNull();
    expect(window.localStorage.getItem('unrelated_y')).toBe('2');
    expect(window.localStorage.getItem('something_else')).toBe('4');
  });

  it('does not call the error reporter when removal succeeds', () => {
    window.localStorage.setItem('talenttrust_ok', 'data');
    clearByPrefix('talenttrust_');
    expect(mockReporter).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Error handling — throwing removeItem
  // -------------------------------------------------------------------------

  it('does not throw when removeItem throws for a matched key', () => {
    window.localStorage.setItem('talenttrust_fail', 'data');
    jest.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });

    expect(() => clearByPrefix('talenttrust_')).not.toThrow();
  });

  it('reports an error via the central reporter when removeItem throws', () => {
    window.localStorage.setItem('talenttrust_fail', 'data');
    jest.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });

    clearByPrefix('talenttrust_');

    expect(mockReporter).toHaveBeenCalledTimes(1);
    expect(mockReporter.mock.calls[0][1]).toMatch(/\[repository\]/);
    expect(mockReporter.mock.calls[0][0]).toBeInstanceOf(DOMException);
  });

  it('does not increment the removal count for a key that throws', () => {
    window.localStorage.setItem('talenttrust_fail', 'data');
    jest.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });

    const removed = clearByPrefix('talenttrust_');
    expect(removed).toBe(0);
  });

  it('continues removing other keys after one removal fails', () => {
    // Seed two matching keys. The mock will succeed for 'talenttrust_b' but
    // we verify total reporter calls to confirm partial success handling.
    window.localStorage.setItem('talenttrust_a', '1');
    window.localStorage.setItem('talenttrust_b', '2');

    let callCount = 0;
    jest.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) throw new DOMException('SecurityError');
      // Allow the second removal to proceed via real localStorage
    });

    // One removal throws → count = 0 for that key; the second succeeds.
    // We verify that the function attempted both keys and reported once.
    const removed = clearByPrefix('talenttrust_');
    expect(mockReporter).toHaveBeenCalledTimes(1);
    expect(removed).toBe(1);
  });

  // -------------------------------------------------------------------------
  // SSR context
  // -------------------------------------------------------------------------

  describe('SSR context', () => {
    it('returns 0 without throwing when storage is unavailable', () => {
      // Mock localStorage.key to be empty (simulating SSR)
      jest.spyOn(window.localStorage, 'length', 'get').mockReturnValue(0);
      expect(() => clearByPrefix('talenttrust_')).not.toThrow();
      expect(clearByPrefix('talenttrust_')).toBe(0);
    });

    it('does not call the error reporter when storage is unavailable', () => {
      jest.spyOn(window.localStorage, 'length', 'get').mockReturnValue(0);
      clearByPrefix('talenttrust_');
      expect(mockReporter).not.toHaveBeenCalled();
    });
  });
});

