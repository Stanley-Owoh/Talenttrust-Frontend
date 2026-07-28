'use client';

import { useCallback, useRef } from 'react';
import { upsertMilestone, getMilestoneVersion, deleteMilestones } from '@/lib/repository';
import type { Milestone } from '@/components/MilestonesList';
import type { MilestoneUpsertResult } from '@/lib/repository';

/**
 * Result returned by optimistic mutation operations.
 */
export type OptimisticResult =
  | { ok: true }
  | { ok: false; stale: boolean; error: string };

/**
 * A hook that applies milestone mutations (create, update, delete) optimistically
 * to the UI and rolls back on persistence failure.
 *
 * **Optimistic flow for create / update:**
 * 1. Snapshot the current milestone list as a rollback reference.
 * 2. Apply the change immediately to the React state (UI updates instantly).
 * 3. Fetch the stored version from the repository and persist via
 *    {@link upsertMilestone}, which guards against stale overwrites.
 * 4. On success — clear the rollback ref.
 * 5. On failure — restore the snapshot, return `{ ok: false, stale, error }`.
 *
 * **Optimistic flow for delete:**
 * 1. Snapshot the current milestone list as a rollback reference.
 * 2. Filter out the deleted milestones from state (UI updates instantly).
 * 3. Persist the deletion via `deleteMilestones`.
 * 4. On success — clear the rollback ref.
 * 5. On failure — restore the snapshot, return error.
 *
 * @param milestones - The current milestones array from React state.
 * @param setMilestones - State setter to apply optimistic changes and rollbacks.
 *
 * @example
 * ```tsx
 * const { optimisticCreate, optimisticUpdate, optimisticDelete } =
 *   useOptimisticMilestoneMutation(milestones, setMilestones);
 *
 * const result = optimisticCreate(newMilestone);
 * if (!result.ok) {
 *   showError({ title: 'Failed to create milestone', description: result.error });
 * }
 * ```
 */
export function useOptimisticMilestoneMutation(
  milestones: Milestone[],
  setMilestones: React.Dispatch<React.SetStateAction<Milestone[]>>,
) {
  /**
   * Snapshot of the milestones array taken right before an optimistic mutation.
   * Restored on persistence failure to roll back the UI.
   */
  const rollbackRef = useRef<Milestone[]>([]);

  // ---------------------------------------------------------------------------
  // Optimistic create
  // ---------------------------------------------------------------------------

  const optimisticCreate = useCallback(
    (milestone: Milestone): OptimisticResult => {
      rollbackRef.current = milestones;
      setMilestones((prev) => [...prev, milestone]);

      const result = upsertMilestone(milestone);

      if (!result.success) {
        if (rollbackRef.current) {
          setMilestones(rollbackRef.current);
        }
        rollbackRef.current = [];
        return result.stale
          ? {
              ok: false,
              stale: true,
              error:
                'This milestone was updated in another session. Please reload and try again.',
            }
          : {
              ok: false,
              stale: false,
              error:
                'The milestone could not be saved. Please try again.',
            };
      }

      rollbackRef.current = [];
      return { ok: true };
    },
    [milestones],
  );

  // ---------------------------------------------------------------------------
  // Optimistic update
  // ---------------------------------------------------------------------------

  const optimisticUpdate = useCallback(
    (id: string, patch: Partial<Milestone>): OptimisticResult => {
      rollbackRef.current = milestones;
      setMilestones((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      );

      const version = getMilestoneVersion(id);
      const existing = milestones.find((m) => m.id === id);
      if (!existing) {
        // Milestone not found in current state – roll back and warn.
        if (rollbackRef.current) {
          setMilestones(rollbackRef.current);
        }
        rollbackRef.current = [];
        return {
          ok: false,
          stale: false,
          error: 'Milestone not found in the current list. Please reload and try again.',
        };
      }

      const updatedMilestone: Milestone = { ...existing, ...patch, version };
      const result = upsertMilestone(updatedMilestone);

      if (!result.success) {
        if (rollbackRef.current) {
          setMilestones(rollbackRef.current);
        }
        rollbackRef.current = [];
        return result.stale
          ? {
              ok: false,
              stale: true,
              error:
                'This milestone was updated in another session. Please reload and try again.',
            }
          : {
              ok: false,
              stale: false,
              error:
                'The milestone could not be saved. Please try again.',
            };
      }

      rollbackRef.current = [];
      return { ok: true };
    },
    [milestones],
  );

  // ---------------------------------------------------------------------------
  // Optimistic delete
  // ---------------------------------------------------------------------------

  const optimisticDelete = useCallback(
    (ids: string[]): OptimisticResult => {
      rollbackRef.current = milestones;
      setMilestones((prev) => prev.filter((m) => !ids.includes(m.id)));

      const removed = deleteMilestones(ids);

      if (removed === 0 && ids.length > 0) {
        // Nothing was actually deleted — roll back.
        if (rollbackRef.current) {
          setMilestones(rollbackRef.current);
        }
        rollbackRef.current = [];
        return {
          ok: false,
          stale: false,
          error: 'No milestones were found to delete. Please reload and try again.',
        };
      }

      rollbackRef.current = [];
      return { ok: true };
    },
    [milestones],
  );

  return { optimisticCreate, optimisticUpdate, optimisticDelete };
}
