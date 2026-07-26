/**
 * @file repository.ts
 *
 * Client-side persistence layer for TalentTrust.
 *
 * Provides synchronous read/write access to Contract and Milestone records
 * stored in the browser's localStorage under a single namespaced key.
 *
 * For a complete overview of the API, the AppData shape, update operations,
 * and maintenance helpers, please refer to `docs/data-model.md`.
 *
 * Design principles:
 * - **Pure & synchronous** — no React dependencies; safe to call from any context.
 * - **SSR-safe** — guards every storage access with a `typeof window` check so
 *   Next.js server-side builds never throw.
 * - **Resilient** — all reads are wrapped in try/catch; corrupt or missing data
 *   falls back to `[]` with a report via the central error reporter rather than crashing.
 * - **Non-mutating** — callers own their data; this module never mutates the
 *   objects it receives or returns.
 *
 * Maintenance helpers:
 * - {@link clearAppData} — removes the single `STORAGE_KEY` entry; useful for
 *   testing, demos, and user-initiated "start over" flows.
 * - {@link clearByPrefix} — removes every localStorage key that starts with a
 *   given prefix; iterates a frozen key snapshot to avoid index-shift bugs.
 */

import type { Contract } from '@/types/domain';
import type { Milestone } from '@/components/MilestonesList';
import { reportError } from './errorReporter';

// ---------------------------------------------------------------------------
// Storage key & data shape
// ---------------------------------------------------------------------------

/** Single localStorage key that houses all persisted app data. */
export const STORAGE_KEY = 'talenttrust_app_data';

interface AppData {
  contracts: Contract[];
  milestones: Milestone[];
}

const EMPTY_DATA: AppData = { contracts: [], milestones: [] };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` when code is running inside a real browser environment.
 * Guards against Next.js SSR / build-time execution where `window` is absent.
 */
/**
 * Returns `true` when code is running inside a real browser environment.
 * Guards against Next.js SSR / build-time execution where `window` is absent.
 *
 * Exported for testing — use `jest.spyOn` in SSR simulation tests.
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Reads and parses the full persisted data object from localStorage.
 *
 * On failure the error is forwarded to the central `reportError` reporter
 * before falling back to the empty state.
 *
 * @returns The parsed `AppData` object, or `EMPTY_DATA` on any failure
 *          (missing key, unparseable JSON, unexpected shape).
 */
function readStore(): AppData {
  if (!isBrowser()) return { ...EMPTY_DATA };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_DATA };

    const parsed = JSON.parse(raw) as Partial<AppData>;

    return {
      contracts: Array.isArray(parsed.contracts) ? parsed.contracts : [],
      milestones: Array.isArray(parsed.milestones) ? parsed.milestones : [],
    };
  } catch (err) {
    reportError(err, '[repository] Failed to read from localStorage. Falling back to empty state.');
    return { ...EMPTY_DATA };
  }
}

/**
 * Serialises and writes the full data object back to localStorage.
 *
 * On failure the error is forwarded to the central `reportError` reporter.
 * The call is a no-op in SSR contexts (no `window`).
 *
 * @param data - The complete `AppData` object to persist.
 * @returns `true` when the write succeeds; otherwise `false`.
 */
function writeStore(data: AppData): boolean {
  if (!isBrowser()) return false;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    reportError(err, '[repository] Failed to write to localStorage.');
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public API — Contracts
// ---------------------------------------------------------------------------

/**
 * Returns all persisted contracts.
 *
 * Reads from localStorage and returns the stored array. If localStorage is
 * unavailable (SSR) or the stored value is corrupt, returns an empty array
 * `[]` and reports the failure via the central error reporter — it never throws.
 *
 * @returns A new array of `Contract` objects (may be empty).
 *
 * @example
 * ```ts
 * const contracts = listContracts();
 * // → [{ contractName: 'Design Sprint', ... }, ...]
 * ```
 */
export function listContracts(): Contract[] {
  return readStore().contracts;
}

/**
 * Appends a contract to the persisted list.
 *
 * The write is additive — existing milestones and other contracts are
 * preserved. Passing a contract whose `contractName` already exists will
 * result in a duplicate; deduplication is the caller's responsibility.
 *
 * @param contract - The `Contract` record to persist.
 *
 * @example
 * ```ts
 * saveContract({
 *   contractName: 'Design Sprint',
 *   parties: [{ label: 'Client', address: '0xABC...' }],
 *   totalValue: 5000,
 *   currency: 'USD',
 *   status: 'Active',
 *   createdAt: '2025-01-01',
 *   milestoneCount: 3,
 * });
 * ```
 */
export function saveContract(contract: Contract): boolean {
  const store = readStore();
  return writeStore({ ...store, contracts: [...store.contracts, contract] });
}

/**
 * Replaces an existing contract that shares the same `contractName`, or appends
 * the contract when no persisted match exists yet.
 *
 * The helper returns a success flag so calling UI code can surface a toast or
 * fallback message when persistence fails instead of assuming the write worked.
 *
 * @param contract - The full `Contract` record to insert or replace.
 * @returns `true` when the contract is persisted successfully; otherwise `false`.
 *
 * @example
 * ```ts
 * const updated = upsertContract({
 *   contractName: 'Design Sprint',
 *   parties: [{ label: 'Client', address: '0xABC...' }],
 *   totalValue: 5000,
 *   currency: 'USD',
 *   status: 'Completed',
 *   createdAt: '2025-01-01',
 *   milestoneCount: 3,
 * });
 * ```
 */
export function upsertContract(contract: Contract): boolean {
  const store = readStore();
  const existingIndex = store.contracts.findIndex(
    (existingContract) => existingContract.contractName === contract.contractName,
  );

  const contracts =
    existingIndex === -1
      ? [...store.contracts, contract]
      : store.contracts.map((existingContract, index) =>
          index === existingIndex ? contract : existingContract,
        );

  return writeStore({ ...store, contracts });
}

// ---------------------------------------------------------------------------
// Public API — Milestones
// ---------------------------------------------------------------------------

/**
 * Returns all persisted milestones.
 *
 * Reads from localStorage and returns the stored array. If localStorage is
 * unavailable (SSR) or the stored value is corrupt, returns an empty array
 * `[]` and reports the failure via the central error reporter — it never throws.
 *
 * @returns A new array of `Milestone` objects (may be empty).
 *
 * @example
 * ```ts
 * const milestones = listMilestones();
 * // → [{ id: 'ms-1', title: 'Kickoff', status: 'Pending', ... }, ...]
 * ```
 */
export function listMilestones(): Milestone[] {
  return readStore().milestones;
}

/**
 * Returns every persisted milestone whose `contractId` matches the given
 * `contractId`.
 *
 * Milestones saved without a `contractId` (e.g. legacy records, or ones
 * created outside a contract context) are never matched, since `undefined`
 * cannot equal a caller-supplied `contractId` string.
 *
 * @param contractId - The parent contract id to filter milestones by.
 * @returns A new array of `Milestone` objects belonging to `contractId`
 *   (may be empty).
 *
 * @example
 * ```ts
 * const milestones = listMilestonesByContract('contract-123');
 * // → [{ id: 'ms-1', contractId: 'contract-123', ... }, ...]
 * ```
 */
export function listMilestonesByContract(contractId: string): Milestone[] {
  return readStore().milestones.filter((milestone) => milestone.contractId === contractId);
}

/**
 * Appends a milestone to the persisted list.
 *
 * The write is additive — existing contracts and other milestones are
 * preserved. Callers are responsible for ensuring `id` uniqueness.
 *
 * @param milestone - The `Milestone` record to persist.
 *
 * @example
 * ```ts
 * saveMilestone({
 *   id: 'ms-1',
 *   title: 'Project Kickoff',
 *   status: 'Pending',
 *   payout: 1000,
 *   currency: 'USD',
 *   dueDate: 'Jun 1, 2025',
 * });
 * ```
 */
export function saveMilestone(milestone: Milestone): boolean {
  const store = readStore();
  return writeStore({ ...store, milestones: [...store.milestones, milestone] });
}

/**
 * Updates an existing milestone identified by `id` with the provided `patch`.
 *
 * The operation is pure – it does not mutate the original milestone objects
 * but returns a new array with the updated record. If the `id` cannot be found
 * a warning is emitted via `console.warn` and the store is left unchanged.
 *
 * @param id - The unique identifier of the milestone to update.
 * @param patch - A partial milestone object containing the fields to merge.
 * @returns `true` when the update is persisted successfully; otherwise `false`.
 *
 * @example
 * ```ts
 * updateMilestone('ms-1', { status: 'Completed' });
 * // → true (milestone status persisted)
 * ```
 */
export function updateMilestone(id: string, patch: Partial<Milestone>): boolean {
  const store = readStore();
  const index = store.milestones.findIndex((m) => m.id === id);

  if (index === -1) {
    console.warn(`[repository] updateMilestone: No milestone found with id '${id}'.`);
    return false;
  }

  const updatedMilestones = store.milestones.map((m, i) =>
    i === index ? { ...m, ...patch } : m,
  );

  return writeStore({ ...store, milestones: updatedMilestones });
}

// ---------------------------------------------------------------------------
// Public API — Maintenance helpers
// ---------------------------------------------------------------------------

/**
 * Removes the single `STORAGE_KEY` entry from `localStorage`, effectively
 * resetting all persisted app data (contracts **and** milestones).
 *
 * This is the recommended path for testing, demo resets, and user-initiated
 * "start over" flows because it routes through the same `isBrowser()` guard
 * and `reportError` plumbing as every other repository operation.
 *
 * @returns `true` when the item was successfully removed; `false` when running
 *   in an SSR context (no `window`) or when `localStorage.removeItem` throws.
 *
 * @example
 * ```ts
 * import { clearAppData } from '@/lib/repository';
 *
 * // User clicks "Reset all data"
 * const ok = clearAppData();
 * if (!ok) console.warn('Could not clear persisted data.');
 * ```
 */
export function clearAppData(): boolean {
  if (!isBrowser()) return false;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    reportError(err, '[repository] Failed to clear app data from localStorage.');
    return false;
  }
}

/**
 * Removes every `localStorage` key whose name starts with the given `prefix`
 * and returns the number of keys that were deleted.
 *
 * Key iteration is performed over a **snapshot** of the current key list so
 * that removing a key while iterating can never cause index-shift bugs.
 * The function never touches keys that do not start with `prefix`, and it
 * never throws — any error from a single `removeItem` call is forwarded to
 * the central `reportError` reporter and the removal counter is **not**
 * incremented for that key.
 *
 * @param prefix - The string prefix to match against every localStorage key.
 *   Passing an empty string (`''`) will match **all** keys — callers should
 *   ensure the prefix is intentionally scoped.
 * @returns The number of keys successfully removed. Returns `0` in an SSR
 *   context (no `window`) or when no keys match the prefix.
 *
 * @example
 * ```ts
 * import { clearByPrefix } from '@/lib/repository';
 *
 * // Remove every key belonging to TalentTrust (e.g. during test teardown)
 * const removed = clearByPrefix('talenttrust_');
 * console.log(`Cleared ${removed} localStorage entries.`);
 * ```
 */
export function clearByPrefix(prefix: string): number {
  if (!isBrowser()) return 0;

  // Snapshot the current keys so that removing entries does not affect
  // the iteration order or length of the live key list.
  // We use the index-based localStorage.key() API instead of Object.keys()
  // because some environments (e.g. jsdom) do not expose storage entries as
  // own enumerable properties on the localStorage object.
  const length = window.localStorage.length;
  const keys: string[] = [];
  for (let i = 0; i < length; i += 1) {
    const k = window.localStorage.key(i);
    if (k !== null) keys.push(k);
  }

  let removed = 0;
  for (const key of keys) {
    if (!key.startsWith(prefix)) continue;
    try {
      window.localStorage.removeItem(key);
      removed += 1;
    } catch (err) {
      reportError(
        err,
        `[repository] Failed to remove localStorage key "${key}" during clearByPrefix.`,
      );
    }
  }

  return removed;
}
