import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusType, statusColorMap, statusIconMap } from './StatusBadge';
import MilestoneRow from './milestones/MilestoneRow';
import { usePreferences } from '@/lib/preferences';
import { isDueSoon } from '@/lib/dueSoon';
import { findCurrencyMismatches, normalizeCurrencyCode } from '@/lib/currencyMismatch';
import { milestoneStatusTally } from '@/lib/milestoneStatusTally';

export type Milestone = {
  id: string;
  title: string;
  status: StatusType;
  payout: number;
  currency: string;
  dueDate?: string;
  /** Id of the parent `Contract` this milestone belongs to, when known. */
  contractId?: string;
};

export const PAGE_SIZE_DEFAULT = 5;

export type MilestonesListProps = {
  milestones: Milestone[];
  contractCurrency?: string;
  onUpdateMilestone?: (id: string, patch: Partial<Milestone>) => boolean;
  pageSize?: number;
};

export const REMINDER_WINDOW_DAYS = 7;

const MilestonesList = ({
  milestones,
  contractCurrency,
  onUpdateMilestone,
  pageSize = PAGE_SIZE_DEFAULT,
}: MilestonesListProps) => {
  const { formatAmount, preferences, updatePreference } = usePreferences();
  const [displayCount, setDisplayCount] = useState(pageSize);
  const [isDensityAnnounced, setIsDensityAnnounced] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  /**
   * Tracks which row is currently in inline edit mode. Mutually exclusive —
   * opening one row closes any other row that was being edited so we never
   * have two dirty unsaved edit states competing for focus or screen reader
   * output.
   */
  const [editingId, setEditingId] = useState<string | null>(null);
  /**
   * Polite live-region message conveyed to assistive technologies after a
   * save / save-failure. Cleared on the *next* save so repeated messages
   * are always announced (screen readers intentionally skip repeat strings).
   */
  const [announcement, setAnnouncement] = useState('');
  /**
   * We force-bump a key on the live region right before writing the message
   * so ATs re-announce identical strings ("Milestone saved.") on repeat.
   */
  const [announcementNonce, setAnnouncementNonce] = useState(0);

  const listContainerRef = useRef<HTMLDivElement>(null);

  const isCompact = preferences.milestonesDensity === 'compact';

  // Reset to the first page whenever the underlying list or page size
  // changes (e.g. a status filter narrows the results).
  useEffect(() => {
    setDisplayCount(pageSize);
  }, [milestones, pageSize]);

  const today = new Date();
  const visibleMilestones = milestones.slice(0, displayCount);
  const hasMore = displayCount < milestones.length;

  const mismatchedMilestoneIds = contractCurrency
    ? new Set(findCurrencyMismatches(contractCurrency, milestones))
    : new Set<string>();

  const mismatchedMilestones = milestones.filter((milestone) =>
    mismatchedMilestoneIds.has(milestone.id),
  );

  const mismatchCurrencies = Array.from(
    new Set(mismatchedMilestones.map((milestone) => normalizeCurrencyCode(milestone.currency))),
  ).sort();

  const normalizedContractCurrency = contractCurrency
    ? normalizeCurrencyCode(contractCurrency)
    : undefined;

  const tallies = milestoneStatusTally(milestones);

  // Filter due-soon milestones:
  // - Exclude terminal statuses: Paid, Completed
  // - Check if due date is within REMINDER_WINDOW_DAYS
  const dueSoonMilestones = milestones.filter(
    (m) =>
      m.status !== 'Paid' &&
      m.status !== 'Completed' &&
      isDueSoon(m.dueDate, today, REMINDER_WINDOW_DAYS),
  );

  const showBanner = dueSoonMilestones.length > 0 && !isDismissed;

  const handleToggleDensity = () => {
    const next: 'comfortable' | 'compact' = isCompact ? 'comfortable' : 'compact';
    updatePreference('milestonesDensity', next);
    setIsDensityAnnounced(true);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Programmatically shift focus to the list container to avoid focus loss (WCAG 2.1.1)
    listContainerRef.current?.focus();
  };

  const pushAnnouncement = useCallback((message: string) => {
    setAnnouncement('');
    // Bump the nonce on the wrapper span so a same-message repeat still
    // announces (some SRs dedupe on identical text + key).
    setAnnouncementNonce((n) => n + 1);
    // Defer the actual write so React mounts a fresh text node first.
    requestAnimationFrame(() => setAnnouncement(message));
  }, []);

  const handleSave = useCallback(
    (id: string, patch: Partial<Milestone>) => {
      const ok = onUpdateMilestone ? onUpdateMilestone(id, patch) : true;
      if (ok) {
        setEditingId(null);
        // The row component also announces via `onAnnounce`. We deliberately
        // re-announce here so an `onUpdateMilestone` that returns `true`
        // still resolves to a "saved" status even if the row's local
        // announcer was bypassed (e.g. parent owns the milestone copy).
      } else {
        pushAnnouncement('Failed to save milestone.');
      }
    },
    [onUpdateMilestone, pushAnnouncement],
  );

  const handleCancel = useCallback(() => {
    setEditingId(null);
    setAnnouncement('');
  }, []);

  return (
    <section aria-labelledby="milestones-title" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 id="milestones-title" className="text-xl font-semibold text-slate-900">
          Milestones
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleDensity}
            aria-pressed={isCompact}
            aria-label={isCompact ? 'Switch to comfortable density' : 'Switch to compact density'}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          >
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {isCompact ? (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
                </>
              ) : (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </>
              )}
            </svg>
            {isCompact ? 'Compact' : 'Comfortable'}
          </button>
          <span id="milestones-count" className="text-sm text-slate-500">{milestones.length} total</span>
        </div>
      </div>

      {/* aria-live region: announces density change to screen readers */}
      <span
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {isDensityAnnounced ? `Milestones density set to ${isCompact ? 'compact' : 'comfortable'}` : ''}
      </span>

      {tallies.length > 0 && (
        <div
          role="list"
          aria-label="Milestone status summary"
          className={`flex flex-wrap gap-2 ${isCompact ? 'mt-2' : 'mt-4'}`}
        >
          {tallies.map(({ status, count }) => (
            <span
              key={status}
              role="listitem"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusColorMap[status]}`}
            >
              <span aria-hidden="true">{statusIconMap[status]}</span>
              {status}
              <span className="ml-0.5 rounded-full bg-white/40 px-1.5 py-0.5 text-[10px] font-bold leading-none">
                {count}
              </span>
            </span>
          ))}
        </div>
      )}

      {normalizedContractCurrency && mismatchedMilestones.length > 0 ? (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
        >
          <p className="font-semibold">
            {mismatchedMilestones.length}{' '}
            {mismatchedMilestones.length === 1 ? 'milestone uses' : 'milestones use'}{' '}
            {mismatchCurrencies.join(', ')} instead of {normalizedContractCurrency}.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {mismatchedMilestones.map((milestone) => (
              <li key={milestone.id}>
                {milestone.title}: {formatAmount(milestone.payout, milestone.currency)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showBanner && (
        <div
          role="status"
          className="mt-6 flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50/50 p-4 text-amber-900 shadow-sm backdrop-blur-sm dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-200"
        >
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {dueSoonMilestones.length} {dueSoonMilestones.length === 1 ? 'milestone is' : 'milestones are'} due within {REMINDER_WINDOW_DAYS} days
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-amber-800 dark:text-amber-300">
              {dueSoonMilestones.map((m, idx) => (
                <li key={m.id} className="flex items-center gap-1.5">
                  {idx > 0 && <span className="text-amber-400 select-none" aria-hidden="true">•</span>}
                  <a
                    href={`#milestone-${m.id}`}
                    className="font-medium underline hover:text-amber-950 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 rounded"
                  >
                    {m.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss reminder"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-amber-600 hover:bg-amber-100 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 dark:text-amber-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-200 transition-colors"
          >
            <span aria-hidden="true" className="text-lg leading-none">&times;</span>
          </button>
        </div>
      )}

      {/* Polite live region for save / save-failure announcements. The wrapping
          span's `key` (via `key={announcementNonce}`) is bumped on every
          write so screen readers re-announce identical strings. Controlled
          entirely from `MilestoneRow.onAnnounce` and the parent save handler. */}
      <span
        key={announcementNonce}
        data-testid="milestones-announcement"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </span>

      {/*
        Keyboard Accessibility (WCAG 2.1.1):
        The scrollable container is focusable (tabIndex={0}) with role="region" so keyboard-only users
        can navigate to it and scroll with arrow keys.

        Labelling (WCAG 1.3.1 / 4.1.2):
        aria-labelledby references both the visible "Milestones" heading (milestones-title) and the live
        count span (milestones-count) so AT users hear e.g. "Milestones, 3 total – region" rather than
        a disconnected static string. This keeps the accessible name in sync with both the heading and
        the rendered item count without duplicating text.

        Why tabIndex is always applied when the list is populated:
        1. Consistency between SSR and client hydration avoids layout/hydration shifts.
        2. Testability in JSDOM where clientHeight/scrollHeight are always zero.
      */}
      <div
        ref={listContainerRef}
        role={milestones.length > 0 ? 'region' : undefined}
        aria-labelledby={milestones.length > 0 ? 'milestones-title milestones-count' : undefined}
        tabIndex={milestones.length > 0 ? 0 : undefined}
        className={`max-h-[calc(100vh-260px)] overflow-y-auto pr-2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 ${isCompact ? 'mt-4 space-y-2' : 'mt-6 space-y-4'}`}
      >
        {visibleMilestones.map((milestone) => (
          <MilestoneRow
            key={milestone.id}
            milestone={milestone}
            isEditing={editingId === milestone.id}
            onRequestEdit={() => setEditingId(milestone.id)}
            onSave={handleSave}
            onCancel={handleCancel}
            onAnnounce={pushAnnouncement}
          />
        ))}
        {hasMore && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setDisplayCount((prev) => Math.min(prev + pageSize, milestones.length))}
              data-testid="load-more-btn"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Load More ({milestones.length - displayCount} remaining)
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default MilestonesList;
