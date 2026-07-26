'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import EmptyState from '../../components/EmptyState';
import MilestonesList from '../../components/MilestonesList';
import MilestoneFilter, { type MilestoneStatusFilter } from '../../components/milestones/MilestoneFilter';
import { MilestoneCreationForm } from '../../components/milestones/MilestoneCreationForm';
import { listMilestones, saveMilestone, updateMilestone } from '@/lib/repository';
import { getItem, setItem } from '@/lib/safeStorage';
import type { Milestone } from '@/types/domain';

export const SAMPLE_DISMISSED_KEY = 'talenttrust-milestones-sample-dismissed';

export const SAMPLE_MILESTONES: Milestone[] = [
  {
    id: '1',
    title: 'Project Kickoff & Discovery',
    status: 'Completed',
    payout: 2500,
    currency: 'USD',
    dueDate: '2026-03-15',
  },
  {
    id: '2',
    title: 'UI/UX Design Handoff',
    status: 'Paid',
    payout: 3500,
    currency: 'USD',
    dueDate: '2026-04-01',
  },
  {
    id: '3',
    title: 'Frontend Development – Sprint 1',
    status: 'Pending',
    payout: 5000,
    currency: 'USD',
    dueDate: '2026-05-01',
  },
  {
    id: '4',
    title: 'API Integration & Testing',
    status: 'Pending',
    payout: 4000,
    currency: 'USD',
    dueDate: '2026-05-15',
  },
  {
    id: '5',
    title: 'Payment Gateway Integration',
    status: 'Disputed',
    payout: 3000,
    currency: 'USD',
    dueDate: '2026-04-20',
  },
];

const VALID_STATUSES: MilestoneStatusFilter[] = ['All', 'Pending', 'Completed', 'Paid', 'Disputed'];

function getValidStatus(param: string | null): MilestoneStatusFilter {
  return param && (VALID_STATUSES as string[]).includes(param)
    ? (param as MilestoneStatusFilter)
    : 'All';
}

const MilestonesContent: React.FC = () => {
  const [milestones, setMilestones] = useState<Milestone[]>(SAMPLE_MILESTONES);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const startFromScratchRef = useRef<HTMLButtonElement | null>(null);

  const initialStatus = getValidStatus(searchParams.get('status'));
  const [statusFilter, setStatusFilter] = useState<MilestoneStatusFilter>(initialStatus);
  const [showForm, setShowForm] = useState(false);

  // Sync state if searchParams change externally (e.g. back/forward navigation)
  useEffect(() => {
    const currentParam = searchParams.get('status');
    setStatusFilter(getValidStatus(currentParam));
  }, [searchParams]);

  // Sync statusFilter state changes to URL without adding browser history entries
  useEffect(() => {
    const currentUrlStatus = searchParams.get('status');
    if (currentUrlStatus !== statusFilter && !(currentUrlStatus === null && statusFilter === 'All')) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('status', statusFilter);
      router.replace(`?${params.toString()}`);
    }
  }, [statusFilter, router, searchParams]);

  // Rehydrate from localStorage after the client mounts to avoid SSR mismatches.
  useEffect(() => {
    const persisted = listMilestones();
    if (persisted.length > 0) {
      setMilestones(persisted);
      setIsDismissed(true);
    } else {
      try {
        const dismissed = getItem(SAMPLE_DISMISSED_KEY) === 'true';
        setIsDismissed(dismissed);
      } catch {
        setIsDismissed(true);
      }
      setMilestones(SAMPLE_MILESTONES);
    }
  }, []);

  const handleDismissSampleBanner = useCallback(() => {
    try {
      setItem(SAMPLE_DISMISSED_KEY, 'true');
    } catch {
      // safeStorage failure resilience
    }
    setIsDismissed(true);
    setMilestones([]);
    setTimeout(() => {
      startFromScratchRef.current?.focus();
    }, 0);
  }, []);

  const isUsingSampleData = milestones === SAMPLE_MILESTONES;
  const showSampleBanner = isUsingSampleData && !isDismissed;
  const displayMilestones = isUsingSampleData && isDismissed ? [] : milestones;

  const filtered = useMemo(() => {
    if (statusFilter === 'All') return displayMilestones;
    return displayMilestones.filter((m) => m.status === statusFilter);
  }, [displayMilestones, statusFilter]);

  const handleAddMilestone = useCallback(() => {
    setShowForm(true);
  }, []);

  const handleSubmitMilestone = useCallback((milestone: Milestone) => {
    saveMilestone(milestone);
    const persisted = listMilestones();
    setMilestones(persisted);
    setIsDismissed(true);
    setShowForm(false);
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
  }, []);

  /**
   * Inline-edit save handler.
   *
   * Persistence layer:
   *   1. Call `updateMilestone(id, patch)` to push the change into
   *      localStorage. Returns `true` on success, `false` if the milestone
   *      no longer exists in storage.
   *   2. Refresh local state from storage so the UI immediately reflects the
   *      persisted version (defensive against stale React state).
   *
   * Returning the boolean up to `MilestonesList` lets it surface a failure
   * announcement to assistive technologies.
   */
  const handleUpdateMilestone = useCallback(
    (id: string, patch: Partial<Milestone>): boolean => {
      const ok = updateMilestone(id, patch);
      if (ok) {
        const persisted = listMilestones();
        setMilestones(persisted);
      }
      return ok;
    },
    [],
  );

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Milestones</h1>

      {showSampleBanner && (
        <div
          data-testid="sample-data-banner"
          role="status"
          aria-label="Sample data notice"
          className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-900">
                You're viewing sample data
              </p>
              <p className="mt-1 text-sm text-blue-700">
                These are example milestones to help you get started.
              </p>
              <button
                ref={startFromScratchRef}
                data-testid="start-from-scratch-btn"
                type="button"
                onClick={handleDismissSampleBanner}
                className="mt-3 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Start from scratch
              </button>
            </div>
            <button
              type="button"
              onClick={handleDismissSampleBanner}
              aria-label="Dismiss sample data notice"
              className="text-blue-500 hover:text-blue-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {displayMilestones.length === 0 ? (
        <EmptyState
          illustration="milestones"
          title="No milestones tracked"
          description="Track your progress by adding milestones to your contracts. Milestones help you stay organized and ensure timely delivery."
          actionLabel="Add Milestone"
          onAction={handleAddMilestone}
        />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-4">
            <MilestoneFilter
              selected={statusFilter}
              onChange={setStatusFilter}
              resultCount={filtered.length}
            />
            <button
              type="button"
              onClick={handleAddMilestone}
              className="flex-shrink-0 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Add Milestone
            </button>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              illustration="milestones"
              title="No milestones match this filter"
              description={`There are no ${statusFilter.toLowerCase()} milestones at the moment. Try a different filter or add a new milestone.`}
              actionLabel="Add Milestone"
              onAction={handleAddMilestone}
            />
          ) : (
            <MilestonesList
              milestones={filtered}
              onUpdateMilestone={handleUpdateMilestone}
            />
          )}
        </>
      )}

      {showForm && (
        <MilestoneCreationForm
          onSubmit={handleSubmitMilestone}
          onCancel={handleCancelForm}
        />
      )}
    </main>
  );
};

const MilestonesPage: React.FC = () => (
  <Suspense fallback={null}>
    <MilestonesContent />
  </Suspense>
);

export default MilestonesPage;
