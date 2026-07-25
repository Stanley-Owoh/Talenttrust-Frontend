import { useState, useRef } from 'react';
import StatusBadge, { StatusType, statusColorMap, statusIconMap } from './StatusBadge';
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

export type MilestonesListProps = {
  milestones: Milestone[];
  contractCurrency?: string;
};

export const REMINDER_WINDOW_DAYS = 7;

const MilestonesList = ({ milestones, contractCurrency }: MilestonesListProps) => {
  const { formatAmount } = usePreferences();
  const [isDismissed, setIsDismissed] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const today = new Date();

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
      isDueSoon(m.dueDate, today, REMINDER_WINDOW_DAYS)
  );

  const showBanner = dueSoonMilestones.length > 0 && !isDismissed;

  const handleDismiss = () => {
    setIsDismissed(true);
    // Programmatically shift focus to the list container to avoid focus loss (WCAG 2.1.1)
    listContainerRef.current?.focus();
  };

  return (
    <section aria-labelledby="milestones-title" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 id="milestones-title" className="text-xl font-semibold text-slate-900">
          Milestones
        </h2>
        <span id="milestones-count" className="text-sm text-slate-500">{milestones.length} total</span>
      </div>

      {tallies.length > 0 && (
        <div
          role="list"
          aria-label="Milestone status summary"
          className="mt-4 flex flex-wrap gap-2"
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
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-amber-600 hover:bg-amber-100 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 dark:text-amber-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-200 transition-colors"
          >
            <span aria-hidden="true" className="text-lg leading-none">&times;</span>
          </button>
        </div>
      )}

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
        className="mt-6 space-y-4 max-h-[calc(100vh-260px)] overflow-y-auto pr-2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
      >
        {milestones.map((milestone) => (
          <article
            key={milestone.id}
            id={`milestone-${milestone.id}`}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{milestone.title}</p>
                <p className="mt-1 text-sm text-slate-500">Due {milestone.dueDate ?? 'TBD'}</p>
              </div>
              <StatusBadge status={milestone.status} />
            </div>
            <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-200 pt-4 text-sm text-slate-600">
              <p>Payout</p>
              <p className="font-semibold text-slate-900">
                {formatAmount(milestone.payout, milestone.currency)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default MilestonesList;
