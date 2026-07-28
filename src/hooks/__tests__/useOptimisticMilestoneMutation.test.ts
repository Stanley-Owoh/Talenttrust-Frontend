import { renderHook, act } from '@testing-library/react';
import { useOptimisticMilestoneMutation } from '../useOptimisticMilestoneMutation';
import * as repository from '@/lib/repository';
import type { Milestone } from '@/components/MilestonesList';

jest.mock('@/lib/repository', () => ({
  ...jest.requireActual('@/lib/repository'),
  upsertMilestone: jest.fn(),
  getMilestoneVersion: jest.fn(),
  deleteMilestones: jest.fn(),
}));

const mockedUpsertMilestone = jest.mocked(repository.upsertMilestone);
const mockedGetMilestoneVersion = jest.mocked(repository.getMilestoneVersion);
const mockedDeleteMilestones = jest.mocked(repository.deleteMilestones);

const baseMilestones: Milestone[] = [
  {
    id: 'ms-1',
    title: 'Project Kickoff',
    status: 'Pending',
    payout: 2500,
    currency: 'USD',
    dueDate: '2026-03-15',
  },
  {
    id: 'ms-2',
    title: 'UI Design',
    status: 'Completed',
    payout: 3500,
    currency: 'USD',
    dueDate: '2026-04-01',
  },
];

// =============================================================================
// optimisticCreate
// =============================================================================

describe('useOptimisticMilestoneMutation — optimisticCreate', () => {
  const newMilestone: Milestone = {
    id: 'ms-new',
    title: 'New Sprint',
    status: 'Pending',
    payout: 1500,
    currency: 'USD',
    dueDate: '2026-05-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies the new milestone optimistically before persistence', () => {
    mockedUpsertMilestone.mockReturnValue({ success: true, stale: false });

    const setMilestones = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticMilestoneMutation(baseMilestones, setMilestones),
    );

    act(() => {
      result.current.optimisticCreate(newMilestone);
    });

    // Must have added the milestone to state
    expect(setMilestones).toHaveBeenCalledWith(expect.any(Function));
    // And must have called upsertMilestone
    expect(mockedUpsertMilestone).toHaveBeenCalledWith(newMilestone);
  });

  it('returns { ok: true } on successful persistence', () => {
    mockedUpsertMilestone.mockReturnValue({ success: true, stale: false });

    const setMilestones = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticMilestoneMutation(baseMilestones, setMilestones),
    );

    let outcome: ReturnType<typeof result.current.optimisticCreate> | undefined;
    act(() => {
      outcome = result.current.optimisticCreate(newMilestone);
    });

    expect(outcome).toEqual({ ok: true });
  });

  it('rolls back the optimistic milestone when persistence fails', () => {
    mockedUpsertMilestone.mockReturnValue({ success: false, stale: false });

    const setMilestones = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticMilestoneMutation(baseMilestones, setMilestones),
    );

    let outcome: ReturnType<typeof result.current.optimisticCreate> | undefined;
    act(() => {
      outcome = result.current.optimisticCreate(newMilestone);
    });

    expect(outcome).toEqual({
      ok: false,
      stale: false,
      error: 'The milestone could not be saved. Please try again.',
    });

    // Must have been called twice: optimistic add + rollback
    expect(setMilestones).toHaveBeenCalledTimes(2);

    // The rollback should restore the original list (passed directly as array)
    expect(setMilestones.mock.calls[1][0]).toEqual(baseMilestones);
  });

  it('rolls back and returns stale:true when a stale overwrite is detected', () => {
    mockedUpsertMilestone.mockReturnValue({ success: false, stale: true });

    const setMilestones = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticMilestoneMutation(baseMilestones, setMilestones),
    );

    let outcome: ReturnType<typeof result.current.optimisticCreate> | undefined;
    act(() => {
      outcome = result.current.optimisticCreate(newMilestone);
    });

    expect(outcome).toEqual({
      ok: false,
      stale: true,
      error: 'This milestone was updated in another session. Please reload and try again.',
    });
  });
});

// =============================================================================
// optimisticUpdate
// =============================================================================

describe('useOptimisticMilestoneMutation — optimisticUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetMilestoneVersion.mockReturnValue(0);
  });

  it('applies the patch optimistically before persistence', () => {
    mockedUpsertMilestone.mockReturnValue({ success: true, stale: false });

    const setMilestones = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticMilestoneMutation(baseMilestones, setMilestones),
    );

    act(() => {
      result.current.optimisticUpdate('ms-1', { status: 'Completed', payout: 3000 });
    });

    // Must have applied the patch to state
    const stateUpdater = setMilestones.mock.calls[0][0];
    const updatedState = stateUpdater(baseMilestones);
    expect(updatedState[0]).toEqual(
      expect.objectContaining({ id: 'ms-1', status: 'Completed', payout: 3000 }),
    );
    expect(updatedState[1]).toEqual(baseMilestones[1]); // unchanged

    // Must have called upsertMilestone with the patched milestone + version
    expect(mockedGetMilestoneVersion).toHaveBeenCalledWith('ms-1');
    expect(mockedUpsertMilestone).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ms-1', status: 'Completed', payout: 3000, version: 0 }),
    );
  });

  it('returns { ok: true } on successful persistence', () => {
    mockedUpsertMilestone.mockReturnValue({ success: true, stale: false });

    const setMilestones = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticMilestoneMutation(baseMilestones, setMilestones),
    );

    let outcome: ReturnType<typeof result.current.optimisticUpdate> | undefined;
    act(() => {
      outcome = result.current.optimisticUpdate('ms-1', { status: 'Completed' });
    });

    expect(outcome).toEqual({ ok: true });
  });

  it('rolls back the optimistic update when persistence fails', () => {
    mockedUpsertMilestone.mockReturnValue({ success: false, stale: false });

    const setMilestones = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticMilestoneMutation(baseMilestones, setMilestones),
    );

    act(() => {
      result.current.optimisticUpdate('ms-1', { status: 'Completed' });
    });

    // optimistic update + rollback
    expect(setMilestones).toHaveBeenCalledTimes(2);

    // The rollback should restore the original list (passed directly as array)
    expect(setMilestones.mock.calls[1][0]).toEqual(baseMilestones);
  });

  it('rolls back and returns stale:true when a stale overwrite is detected', () => {
    mockedUpsertMilestone.mockReturnValue({ success: false, stale: true });

    const setMilestones = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticMilestoneMutation(baseMilestones, setMilestones),
    );

    let outcome: ReturnType<typeof result.current.optimisticUpdate> | undefined;
    act(() => {
      outcome = result.current.optimisticUpdate('ms-1', { status: 'Completed' });
    });

    expect(outcome).toEqual({
      ok: false,
      stale: true,
      error: 'This milestone was updated in another session. Please reload and try again.',
    });
  });

  it('rolls back and returns error when the milestone id is not found in state', () => {
    const setMilestones = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticMilestoneMutation(baseMilestones, setMilestones),
    );

    let outcome: ReturnType<typeof result.current.optimisticUpdate> | undefined;
    act(() => {
      outcome = result.current.optimisticUpdate('nonexistent-id', { status: 'Completed' });
    });

    expect(outcome).toEqual({
      ok: false,
      stale: false,
      error: 'Milestone not found in the current list. Please reload and try again.',
    });

    // Should have been rolled back
    expect(setMilestones).toHaveBeenCalledTimes(2);
  });

  it('passes the correct stored version to upsertMilestone', () => {
    mockedGetMilestoneVersion.mockReturnValue(3);
    mockedUpsertMilestone.mockReturnValue({ success: true, stale: false });

    const setMilestones = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticMilestoneMutation(baseMilestones, setMilestones),
    );

    act(() => {
      result.current.optimisticUpdate('ms-1', { status: 'Completed' });
    });

    expect(mockedGetMilestoneVersion).toHaveBeenCalledWith('ms-1');
    expect(mockedUpsertMilestone).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ms-1', version: 3 }),
    );
  });
});

// =============================================================================
// optimisticDelete
// =============================================================================

describe('useOptimisticMilestoneMutation — optimisticDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes milestones optimistically before persistence', () => {
    mockedDeleteMilestones.mockReturnValue(1);

    const setMilestones = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticMilestoneMutation(baseMilestones, setMilestones),
    );

    act(() => {
      result.current.optimisticDelete(['ms-1']);
    });

    // Must have filtered out the milestone from state
    const stateUpdater = setMilestones.mock.calls[0][0];
    const updatedState = stateUpdater(baseMilestones);
    expect(updatedState).toHaveLength(1);
    expect(updatedState[0].id).toBe('ms-2');

    // Must have called deleteMilestones
    expect(mockedDeleteMilestones).toHaveBeenCalledWith(['ms-1']);
  });

  it('returns { ok: true } on successful deletion', () => {
    mockedDeleteMilestones.mockReturnValue(1);

    const setMilestones = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticMilestoneMutation(baseMilestones, setMilestones),
    );

    let outcome: ReturnType<typeof result.current.optimisticDelete> | undefined;
    act(() => {
      outcome = result.current.optimisticDelete(['ms-1']);
    });

    expect(outcome).toEqual({ ok: true });
  });

  it('rolls back when no milestones were actually deleted', () => {
    mockedDeleteMilestones.mockReturnValue(0);

    const setMilestones = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticMilestoneMutation(baseMilestones, setMilestones),
    );

    act(() => {
      result.current.optimisticDelete(['nonexistent-id']);
    });

    // optimistic delete + rollback
    expect(setMilestones).toHaveBeenCalledTimes(2);

    // The rollback should restore the original list (passed directly as array)
    expect(setMilestones.mock.calls[1][0]).toEqual(baseMilestones);
  });
});
