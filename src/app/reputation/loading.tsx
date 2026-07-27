/**
 * loading.tsx – /reputation
 *
 * App Router Suspense boundary for the reputation page. Mirrors the layout
 * of ReputationProfile:
 *
 *   Card 1 – Profile card:
 *     - Avatar block + name/label text
 *     - Privacy note panel
 *     - Three metric tiles: score, level, explanation
 *
 *   Card 2 – Reputation history card:
 *     - Heading + "Private by default" badge
 *     - 3 history event rows
 *
 * Accessibility:
 * - Visually-hidden `role="status"` announces "Loading reputation…".
 * - All shimmer blocks carry `aria-hidden="true"`.
 * - Animation disabled for `prefers-reduced-motion` via globals.css rule
 *   and `motion-reduce:animate-none`.
 * - Focus management is handled by ReputationLoadingClient wrapper.
 */

// ---------------------------------------------------------------------------
// Local sub-skeletons
// ---------------------------------------------------------------------------

/** Mirrors the top profile card (avatar, name, privacy note, metric tiles). */
const ProfileCardSkeleton = () => (
  <div
    aria-hidden="true"
    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
  >
    {/* Avatar + name row */}
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        {/* Avatar square */}
        <div className="h-16 w-16 rounded-2xl bg-slate-200 animate-shimmer motion-reduce:animate-none" />
        <div className="space-y-2">
          <div className="h-3.5 w-28 rounded bg-slate-200 animate-shimmer motion-reduce:animate-none" />
          <div className="h-6 w-40 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none" />
        </div>
      </div>
      {/* Privacy note panel */}
      <div className="flex flex-col gap-2 rounded-3xl bg-slate-50 p-4 sm:p-5 lg:w-72">
        <div className="h-3.5 w-36 rounded bg-slate-200 animate-shimmer motion-reduce:animate-none" />
        <div className="h-3 w-full rounded bg-slate-200 animate-shimmer motion-reduce:animate-none" />
        <div className="h-3 w-4/5 rounded bg-slate-200 animate-shimmer motion-reduce:animate-none" />
      </div>
    </div>

    {/* Three metric tiles */}
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      {['Reputation score', 'Level', 'Explanation'].map((label) => (
        <div
          key={label}
          className="rounded-3xl border border-slate-200 bg-slate-50 p-5 space-y-3"
        >
          <p className="h-3.5 text-xs font-medium text-slate-500">{label}</p>
          <div className="h-8 w-20 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  </div>
);

/** Mirrors the reputation history card with 3 event rows. */
const HistoryCardSkeleton = () => (
  <div
    aria-hidden="true"
    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
  >
    {/* Heading row + badge */}
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="space-y-2">
        <div className="h-6 w-44 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none" />
        <div className="h-3.5 w-64 rounded bg-slate-200 animate-shimmer motion-reduce:animate-none" />
      </div>
      <div className="h-6 w-28 rounded-full bg-slate-200 animate-shimmer motion-reduce:animate-none" />
    </div>

    {/* History event rows */}
    <ol className="space-y-4">
      {Array.from({ length: 3 }, (_, i) => (
        <li
          key={i}
          className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="h-3.5 w-24 rounded bg-slate-200 animate-shimmer motion-reduce:animate-none" />
              <div className="h-5 w-56 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none" />
            </div>
            <div className="h-3.5 w-20 rounded bg-slate-200 animate-shimmer motion-reduce:animate-none" />
          </div>
        </li>
      ))}
    </ol>
  </div>
);

// ---------------------------------------------------------------------------
// Route loading export
// ---------------------------------------------------------------------------

export default function ReputationLoading() {
  return (
    <main className="min-h-screen p-8" aria-busy="true">
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        Loading reputation…
      </span>

      {/* Page heading skeleton */}
      <div
        aria-hidden="true"
        className="mb-6 h-8 w-32 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none"
      />

      {/* ReputationProfile layout */}
      <section className="w-full max-w-5xl mx-auto space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <ProfileCardSkeleton />
        <HistoryCardSkeleton />
      </section>
    </main>
  );
}
