'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import EmptyState from '../../components/EmptyState';
import MilestonesList from '../../components/MilestonesList';
import MilestoneFilter, { type MilestoneStatusFilter } from '../../components/milestones/MilestoneFilter';
import { MilestoneCreationForm } from '../../components/milestones/MilestoneCreationForm';
import MilestonesErrorBoundary from '../../components/milestones/MilestonesErrorBoundary';
import { listMilestones, saveMilestone, updateMilestone } from '@/lib/repository';
import { getItem, setItem } from '@/lib/safeStorage';
import { exportMilestonesToCSV, exportMilestonesToJSON } from '@/lib/exportMilestones';
import { useToast } from '@/components/toast/toast-provider';
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
type MilestoneSortOption = 'newest' | 'oldest';
const VALID_SORT_OPTIONS: MilestoneSortOption[] = ['newest', 'oldest'];

function getValidStatus(param: string | null): MilestoneStatusFilter {
  return param && (VALID_STATUSES as string[]).includes(param)
    ? (param as MilestoneStatusFilter)
    : 'All';
}

function getValidSortOption(param: string | null): MilestoneSortOption {
  return param && (VALID_SORT_OPTIONS as string[]).includes(param)
    ? (param as MilestoneSortOption)
    : 'newest';
}

const MilestonesContent: React.FC = () => {
  const [milestones, setMilestones] = useState<Milestone[]>(SAMPLE_MILESTONES);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const startFromScratchRef = useRef<HTMLButtonElement | null>(null);
  const hasAppliedUrlStateRef = useRef(false);

  const initialStatus = getValidStatus(searchParams.get('status'));
  const initialSort = getValidSortOption(searchParams.get('sort'));
  const [statusFilter, setStatusFilter] = useState<MilestoneStatusFilter>(initialStatus);
  const [sortOrder, setSortOrder] = useState<MilestoneSortOption>(initialSort);
  const [showForm, setShowForm] = useState(false);
  const { showError } = useToast();

  // Sync state if searchParams change externally (e.g. back/forward navigation)
  useEffect(() => {
    setStatusFilter(getValidStatus(searchParams.get('status')));
    setSortOrder(getValidSortOption(searchParams.get('sort')));
  }, [searchParams]);

  // Sync filter/sort state changes to the URL without adding browser history entries.
  useEffect(() => {
    if (!hasAppliedUrlStateRef.current) {
      hasAppliedUrlStateRef.current = true;
      return;
    }

    const currentStatusParam = searchParams.get('status');
    const currentSortParam = searchParams.get('sort');
    const nextStatusParam = statusFilter === 'All' ? null : statusFilter;
    const nextSortParam = sortOrder === 'newest' ? null : sortOrder;

    if (currentStatusParam === nextStatusParam && currentSortParam === nextSortParam) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextStatusParam) {
        params.set('status', nextStatusParam);
      } else {
        params.delete('status');
      }

      if (nextSortParam) {
        params.set('sort', nextSortParam);
      } else {
        params.delete('sort');
      }

      const query = params.toString();
      router.replace(query ? `?${query}` : '?');
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [statusFilter, sortOrder, router, searchParams]);

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

  const sortedMilestones = useMemo(() => {
    const nextMilestones = [...filtered];

    if (sortOrder === 'oldest') {
      nextMilestones.sort((left, right) => {
        const leftTime = left.dueDate ? Date.parse(left.dueDate) : Number.POSITIVE_INFINITY;
        const rightTime = right.dueDate ? Date.parse(right.dueDate) : Number.POSITIVE_INFINITY;
        return leftTime - rightTime;
      });
    } else {
      nextMilestones.sort((left, right) => {
        const leftTime = left.dueDate ? Date.parse(left.dueDate) : Number.NEGATIVE_INFINITY;
        const rightTime = right.dueDate ? Date.parse(right.dueDate) : Number.NEGATIVE_INFINITY;
        return rightTime - leftTime;
      });
    }

    return nextMilestones;
  }, [filtered, sortOrder]);

  const handleAddMilestone = useCallback(() => {
    setShowForm(true);
  }, []);

  const handleSubmitMilestone = useCallback((milestone: Milestone) => {
    const previousIsDismissed = isDismissed;

    setMilestones((prev) => [...prev, milestone]);
    setIsDismissed(true);
    setShowForm(false);

    const persisted = saveMilestone(milestone);
    if (!persisted) {
      setMilestones((prev) => prev.filter((item) => item.id !== milestone.id));
      setIsDismissed(previousIsDismissed);
      showError({
        title: 'Unable to create milestone',
        description: 'Your milestone could not be saved. Please try again.',
      });
      return;
    }

    setIsDismissed(true);
  }, [isDismissed, showError]);

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
    /*
     * ACCESSIBILITY LANDMARK STRUCTURE (WCAG 2.1 AA / issue #682)
     *
     * No <main> landmark here — the root layout (src/app/layout.tsx) already
     * provides the single <main id="main-content" tabIndex={-1}> landmark that
     * RouteAnnouncer targets for focus-on-route-change (WCAG 2.4.3). A nested
     * <main> would produce duplicate landmarks and break that focus management.
     * Same fix applied to loading.tsx below.
     *
     * Heading hierarchy: <h1> is used here (correct, since layout's <header>
     * does not render an <h1> — the app name is a <span>, not a heading).
     */
    <div className="min-h-screen p-8">
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
              className="rounded-sm text-blue-500 hover:text-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
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
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <MilestoneFilter
              selected={statusFilter}
              onChange={setStatusFilter}
              resultCount={sortedMilestones.length}
            />
            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="milestone-sort"
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm"
              >
                <span className="font-medium text-slate-700">Sort</span>
                <select
                  id="milestone-sort"
                  aria-label="Sort milestones"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value as MilestoneSortOption)}
                  className="rounded-xl border border-slate-200 bg-transparent px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
              <button
                type="button"
                onClick={handleAddMilestone}
                className="flex-shrink-0 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Add Milestone
              </button>
            </div>
          </div>

          {sortedMilestones.length === 0 ? (
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
    </div>
  );
};

const MilestonesPage: React.FC = () => (
  <MilestonesErrorBoundary>
    <Suspense fallback={null}>
      <MilestonesContent />
    </Suspense>
  </MilestonesErrorBoundary>
);

export default MilestonesPage;
