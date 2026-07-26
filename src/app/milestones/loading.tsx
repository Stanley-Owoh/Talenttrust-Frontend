/**
 * loading.tsx – /milestones
 *
 * App Router Suspense boundary for the milestones list page. Mirrors the
 * layout of MilestonesPage:
 *   - Page heading
 *   - Filter bar (MilestoneFilter pill row)
 *   - MilestonesListSkeleton (scrollable list of 5 milestone card rows)
 *
 * Accessibility:
 * - `aria-busy="true"` on <main>.
 * - Visually-hidden `role="status"` announces "Loading milestones…".
 * - All decorative shimmer blocks carry `aria-hidden="true"`.
 * - Animation disabled for `prefers-reduced-motion` via globals.css rule
 *   and `motion-reduce:animate-none` belt-and-suspenders guard.
 */

import { MilestonesListSkeleton } from '@/components/MilestonesListSkeleton';

// ---------------------------------------------------------------------------
// Local sub-skeletons
// ---------------------------------------------------------------------------

/** Mirrors the MilestoneFilter pill row + result count. */
const FilterBarSkeleton = () => (
  <div
    aria-hidden="true"
    className="mb-4 flex flex-wrap items-center gap-2"
  >
    {/* Filter pills – one "All" + four status options */}
    {Array.from({ length: 5 }, (_, i) => (
      <div
        key={i}
        className="h-8 w-20 rounded-full bg-slate-200 animate-shimmer motion-reduce:animate-none"
      />
    ))}
    {/* Result count badge */}
    <div className="ml-auto h-5 w-24 rounded-full bg-slate-200 animate-shimmer motion-reduce:animate-none" />
  </div>
);

// ---------------------------------------------------------------------------
// Route loading export
// ---------------------------------------------------------------------------

export default function MilestonesLoading() {
  return (
    /*
     * No <main> here — the root layout owns the single <main id="main-content">
     * landmark. A nested <main> would duplicate the landmark and confuse
     * screen readers (WCAG 2.4.1 / issue #682). aria-busy is moved to
     * the wrapping <div> which is the direct child of layout's <main>.
     */
    <div className="min-h-screen p-8" aria-busy="true">
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        Loading milestones…
      </span>

      {/* Page heading skeleton */}
      <div
        aria-hidden="true"
        className="mb-6 h-8 w-36 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none"
      />

      {/* Filter bar skeleton */}
      <FilterBarSkeleton />

      {/* Milestone card list skeleton */}
      <MilestonesListSkeleton />
    </div>
  );
}
