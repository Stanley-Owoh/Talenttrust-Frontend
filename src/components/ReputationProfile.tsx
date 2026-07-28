 'use client';

export type ReputationEvent = {
  id: string;
  type: string;
  summary: string;
  date: string;
};

export type ReputationProfileProps = {
  name: string;
  score?: number | null;
  level?: string;
  history?: ReputationEvent[];
  /** Maximum possible score value. Used for aria-valuemax on the meter role. */
  maxScore?: number;
  /**
   * When false, filter/sort stay local and are not written to the URL.
   * Defaults to true so shareable links work on the reputation page.
   */
  syncUrl?: boolean;
  /** Number of history events shown per page before "Load more" appears. */
  pageSize?: number;
};

export type ReputationBand = {
  min: number;
  max: number;
  label: string;
};

const BASELINE_BANDS = [
  { min: 0, max: 1, label: 'Newcomer' },
  { min: 1, max: 2, label: 'Contributor' },
  { min: 2, max: 3, label: 'Active Contributor' },
  { min: 3, max: 4, label: 'Trusted Partner' },
  { min: 4, max: 5, label: 'Expert' },
];

export function getReputationBands(maxScore: number): ReputationBand[] {
  const scale = maxScore / 5;
  return BASELINE_BANDS.map((band) => ({
    min: band.min * scale,
    max: band.max * scale,
    label: band.label,
  }));
}

export function resolveReputationLevel(score: number, maxScore: number): string {
  const bands = getReputationBands(maxScore);
  if (score < 0) return bands[0].label;
  if (score >= maxScore) return bands[bands.length - 1].label;

  const band = bands.find((b, idx) => {
    if (idx === bands.length - 1) {
      return score >= b.min && score <= b.max;
    }
    return score >= b.min && score < b.max;
  });
  return band ? band.label : bands[0].label;
}

const reputationSummary =
  'Reputation represents verified trust signals and activity history, not sensitive personal metadata. Privacy-friendly defaults keep your profile safe.';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './toast/toast-provider';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import {
  DEFAULT_DIR,
  DEFAULT_TYPE,
  REPUTATION_URL_DEBOUNCE_MS,
  buildReputationQueryString,
  filterAndSortHistory,
  getAvailableHistoryTypes,
  getValidDir,
  getValidType,
  isReputationUrlInSync,
  type ReputationSortDir,
} from '@/lib/reputationUrlState';

/** Number of history events shown per page before "Load more" is needed. */
export const REPUTATION_PAGE_SIZE = 5;

// ---------------------------------------------------------------------------
// execCommandFallback — documented clipboard fallback when Clipboard API is
// unavailable (e.g. non-HTTPS, older browsers).
// ---------------------------------------------------------------------------

/**
 * Falls back to the deprecated `document.execCommand('copy')` API when the
 * Clipboard API is not available. Creates an off-screen textarea, selects its
 * value, and invokes execCommand. The textarea is always removed from the DOM.
 *
 * @param text - The string to copy to the clipboard.
 * @returns `true` if the execCommand succeeded; `false` otherwise.
 */
export function execCommandFallback(text: string): boolean {
  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  textarea.setAttribute('aria-hidden', 'true');
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {
    // execCommand not supported — success remains false
  } finally {
    document.body.removeChild(textarea);
  }
  return success;
}

// ---------------------------------------------------------------------------
// CopyIdButton — accessible copy control for a single reputation event ID
// ---------------------------------------------------------------------------

interface CopyIdButtonProps {
  /** The reputation event ID to copy. */
  eventId: string;
}

/**
 * Icon-button (with visible "Copy" label) that copies the given reputation
 * event ID to the clipboard.
 *
 * - Uses the Clipboard API with a documented `execCommand` fallback.
 * - Surfaces success/failure through the global toast system.
 * - Keyboard-operable; has a descriptive `aria-label` for screen readers.
 * - `aria-pressed` reflects the transient "copied" confirmation state.
 */
function CopyIdButton({ eventId }: CopyIdButtonProps) {
  const { showSuccess, showError } = useToast();

  const { copied, copy } = useCopyToClipboard({
    onSuccess: () => {
      showSuccess({ title: `Copied "${eventId}" to clipboard.` });
    },
    onError: () => {
      // Documented fallback: try execCommand when Clipboard API is unavailable
      const success = execCommandFallback(eventId);
      if (success) {
        showSuccess({ title: `Copied "${eventId}" to clipboard.` });
      } else {
        showError({ title: `Failed to copy "${eventId}". Please copy it manually.` });
      }
    },
  });

  const handleClick = React.useCallback(() => {
    copy(eventId);
  }, [copy, eventId]);

  return (
    <button
      type="button"
      aria-label={`Copy reputation event ID ${eventId} to clipboard`}
      aria-pressed={copied}
      data-testid={`copy-reputation-id-btn-${eventId}`}
      title="Copy ID to clipboard"
      onClick={handleClick}
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500',
        copied
          ? 'bg-green-50 border-green-400 text-green-700'
          : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--surface)]',
      ].join(' ')}
    >
      {copied ? (
        <>
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4 1h6a1 1 0 0 1 1 1v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Copy ID
        </>
      )}
    </button>
  );
}

export default function ReputationProfile({
  name,
  score,
  level,
  history = [],
  maxScore = 5,
  syncUrl = true,
  pageSize = REPUTATION_PAGE_SIZE,
}: ReputationProfileProps) {
  let showSuccess: ReturnType<typeof useToast>['showSuccess'] | null = null;
  try {
    ({ showSuccess } = useToast());
  } catch {
    showSuccess = null;
  }
  const hasReputation = typeof score === 'number' && score >= 0;
  const showPartial = hasReputation && history.length === 0;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [events, setEvents] = useState(history);
  const [announcement, setAnnouncement] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(pageSize);

  // Keep the local, deletable copy of history in sync whenever the parent
  // supplies a new history array (data reload, filter change upstream, etc.).
  useEffect(() => {
    setEvents(history);
  }, [history]);

  // Reset pagination to the first page whenever the underlying history data
  // or the page size changes, so a reload/filter never leaves "Load more"
  // pointing past the end of a shorter list.
  useEffect(() => {
    setDisplayCount(pageSize);
  }, [history, pageSize]);

  const selectedCount = selectedIds.length;
  const allSelected = events.length > 0 && selectedCount === events.length;
  const hasPartialSelection = selectedCount > 0 && selectedCount < events.length;

  const selectedEvents = useMemo(
    () => events.filter((event) => selectedIds.includes(event.id)),
    [events, selectedIds],
  );

  const searchParams = useSearchParams();
  const router = useRouter();

  const availableTypes = useMemo(() => getAvailableHistoryTypes(history), [history]);
  const typeOptions = useMemo(() => [DEFAULT_TYPE, ...availableTypes], [availableTypes]);

  const [selectedType, setSelectedType] = useState<string>(() =>
    syncUrl ? getValidType(searchParams.get('type'), availableTypes) : DEFAULT_TYPE
  );
  const [sortDir, setSortDir] = useState<ReputationSortDir>(() =>
    syncUrl ? getValidDir(searchParams.get('dir')) : DEFAULT_DIR
  );

  // Restore filter/sort from the URL on load and on back/forward navigation.
  useEffect(() => {
    if (!syncUrl) return;
    setSelectedType(getValidType(searchParams.get('type'), availableTypes));
    setSortDir(getValidDir(searchParams.get('dir')));
  }, [searchParams, availableTypes, syncUrl]);

  // Debounced write of filter/sort into the URL (shareable + reload-safe).
  useEffect(() => {
    if (!syncUrl) return;

    const state = { type: selectedType, sort: 'date' as const, dir: sortDir };
    if (isReputationUrlInSync((key) => searchParams.get(key), state, availableTypes)) {
      return;
    }

    const timer = window.setTimeout(() => {
      const query = buildReputationQueryString(searchParams, state);
      router.replace(query ? `?${query}` : '?');
    }, REPUTATION_URL_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [selectedType, sortDir, router, searchParams, availableTypes, syncUrl]);

  // At the default sort direction, preserve the order the caller supplied
  // (only the type filter is applied) rather than forcing a date sort — this
  // keeps "newest first" a byproduct of well-ordered input instead of an
  // implicit reorder callers didn't ask for. Explicitly choosing a direction
  // (including re-selecting the default) always applies a real date sort.
  const filteredHistory = useMemo(() => {
    const byType =
      selectedType === DEFAULT_TYPE
        ? events
        : events.filter((event) => event.type === selectedType);
    return sortDir === DEFAULT_DIR ? byType : filterAndSortHistory(events, selectedType, sortDir);
  }, [events, selectedType, sortDir]);

  const visibleHistory = useMemo(
    () => filteredHistory.slice(0, displayCount),
    [filteredHistory, displayCount],
  );
  const hasMoreHistory = displayCount < filteredHistory.length;
  const isHistoryFullyShown = filteredHistory.length > 0 && !hasMoreHistory;

  const handleLoadMore = () => {
    setDisplayCount((current) => Math.min(current + pageSize, filteredHistory.length));
  };

  const resolvedLevel = level !== undefined
    ? level
    : (hasReputation ? resolveReputationLevel(score, maxScore) : 'Community Member');

  const announce = (message: string) => {
    setAnnouncement(message);
  };

  const clearSelection = () => {
    setSelectedIds([]);
    announce('Selection cleared.');
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => (
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    ));
  };

  const toggleAll = () => {
    setSelectedIds((current) => (
      current.length === filteredHistory.length ? [] : filteredHistory.map((event) => event.id)
    ));
  };

  const handleDeleteSelected = () => {
    if (selectedEvents.length === 0) return;
    setConfirmOpen(true);
  };

  const confirmDeleteSelected = () => {
    const count = selectedEvents.length;
    setEvents((current) => current.filter((event) => !selectedIds.includes(event.id)));
    setSelectedIds([]);
    setConfirmOpen(false);
    announce(`Deleted ${count} reputation ${count === 1 ? 'item' : 'items'}.`);
    showSuccess?.({
      title: 'Bulk delete complete',
      description: `Deleted ${count} reputation ${count === 1 ? 'item' : 'items'}.`,
      duration: 3000,
    });
  };

  const handleExportSelected = () => {
    if (selectedEvents.length === 0) return;
    const payload = selectedEvents.map((event) => ({
      id: event.id,
      type: event.type,
      summary: event.summary,
      date: event.date,
    }));
    void payload;
    announce(`Exported ${selectedEvents.length} reputation ${selectedEvents.length === 1 ? 'item' : 'items'}.`);
  };

  return (
    <section className="w-full max-w-5xl mx-auto space-y-8 px-4 py-10 sm:px-6 lg:px-8" aria-labelledby="profile-heading">
      <div className="rounded-3xl border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8">
        <h2 className="sr-only" id="profile-heading">Reputation profile for {name}</h2>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--foreground)] text-2xl font-semibold text-[var(--background)]">
              {name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Reputation profile</p>
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">{name}</h1>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-3xl bg-[var(--muted)] p-4 text-[var(--muted-foreground)] sm:p-5">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Privacy-friendly defaults</p>
            <p className="text-sm leading-6">Only summary trust signals are shown by default. Sensitive metadata remains hidden.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-sm font-medium text-[var(--muted-foreground)]" id="reputation-score-label">Reputation score</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]" aria-labelledby="reputation-score-label">
              {hasReputation ? (
                <>
                  <span
                    role="meter"
                    aria-valuenow={score}
                    aria-valuemin={0}
                    aria-valuemax={maxScore}
                    aria-labelledby="reputation-score-label"
                    aria-describedby="reputation-legend"
                  >
                    <span className="sr-only">Reputation score </span>{score}<span className="sr-only"> out of {maxScore}</span>
                  </span>
                </>
              ) : 'No reputation yet'}
            </p>
          </div>
           <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
             <p className="text-sm font-medium text-[var(--muted-foreground)]" id="reputation-level-label">Level</p>
             <p className="mt-3 text-xl font-semibold text-[var(--foreground)]" aria-labelledby="reputation-level-label">
              {hasReputation ? (
                <>
                  <span className="sr-only">Level </span>{resolvedLevel}
                </>
              ) : 'Pending'}
            </p>
          </div>
           <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
             <p className="text-sm font-medium text-[var(--muted-foreground)]">Explanation</p>
             <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{reputationSummary}</p>
          </div>
        </div>

        {hasReputation && (
           <div className="mt-6 border-t border-[var(--border)] pt-6">
             <h2 className="text-sm font-semibold text-[var(--foreground)]" id="reputation-legend-title">
              Reputation Level Legend
            </h2>
            <ul
              id="reputation-legend"
              aria-labelledby="reputation-legend-title"
              className="mt-3 grid gap-3 sm:grid-cols-5 text-sm"
            >
              {getReputationBands(maxScore).map((band) => {
                const isActive = score >= band.min && (
                  band.max === maxScore ? score <= band.max : score < band.max
                );
                return (
                  <li
                    key={band.label}
                    className={`rounded-2xl border p-3 transition-colors ${isActive
                        ? 'border-[var(--legend-active-border)] bg-[var(--legend-active-bg)] text-[var(--legend-active-foreground)] font-semibold'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)]'
                      }`}
                  >
                    <p className="font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                      {band.min.toFixed(1)} - {band.max.toFixed(1)}
                    </p>
                    <p className="mt-1 text-sm">{band.label}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {showPartial && (
           <div className="mt-6 rounded-3xl border-[var(--status-warning-bg)] bg-[var(--status-warning-bg)] p-4 text-[var(--status-warning-foreground)]">
             <p className="font-semibold">Partial reputation data</p>
             <p className="mt-1 text-sm leading-6">
              A score exists but history is currently hidden until verified actions are available. This keeps your profile safe and private.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-3xl border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Reputation history</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              History is shown as safe, aggregated events with no wallet or personal metadata by default.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {history.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <label htmlFor="history-type-filter" className="text-sm font-medium text-[var(--foreground)]">
                    Filter:
                  </label>
                  <select
                    id="history-type-filter"
                    data-testid="reputation-type-filter"
                    className="rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 pl-3 pr-8 text-sm text-[var(--foreground)] focus:border-[var(--ring)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    {typeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="history-sort-dir" className="text-sm font-medium text-[var(--foreground)]">
                    Sort:
                  </label>
                  <select
                    id="history-sort-dir"
                    data-testid="reputation-sort-dir"
                    className="rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 pl-3 pr-8 text-sm text-[var(--foreground)] focus:border-[var(--ring)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as ReputationSortDir)}
                  >
                    <option value="desc">Newest first</option>
                    <option value="asc">Oldest first</option>
                  </select>
                </div>
                <div aria-live="polite" className="sr-only">
                  Showing {filteredHistory.length}{' '}
                  {filteredHistory.length === 1 ? 'event' : 'events'}
                  {selectedType !== DEFAULT_TYPE ? ` of type ${selectedType}` : ''}
                  , {sortDir === 'asc' ? 'oldest first' : 'newest first'}
                </div>
              </>
            )}
            <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              {history.length ? 'Visible' : 'Private by default'}
            </span>
          </div>
        </div>

        <p aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </p>

        {events.length === 0 ? (
          <div className="rounded-3xl border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted-foreground)]">
            <p className="font-semibold text-[var(--foreground)]">No reputation history available yet.</p>
            <p className="mt-2 text-sm leading-6">
              Reputation history appears once you complete verified actions. Your profile remains safe and privacy-friendly until then.
            </p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="rounded-3xl border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted-foreground)]">
            <p className="font-semibold text-[var(--foreground)]">No events match this filter.</p>
            <p className="mt-2 text-sm leading-6">
              Try choosing a different event type, or select All to see the full reputation history.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-3xl border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(node) => {
                    if (node) {
                      node.indeterminate = hasPartialSelection;
                    }
                  }}
                  onChange={toggleAll}
                  aria-label="Select all reputation items"
                  className="h-4 w-4 rounded border-[var(--border)] text-[var(--foreground)] focus:ring-[var(--ring)]"
                />
                Select all
              </label>
              <div
                role="toolbar"
                aria-label="Reputation history actions"
                className="flex flex-wrap gap-2"
              >
                <button
                  type="button"
                  onClick={handleExportSelected}
                  disabled={selectedCount === 0}
                  aria-label="Export selected reputation items"
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--muted-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export selected
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={selectedCount === 0}
                  aria-label="Delete selected reputation items"
                  className="rounded-2xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete selected
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={selectedCount === 0}
                  aria-label="Clear selected reputation items; clear selection"
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--muted-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear selection
                </button>
              </div>
            </div>
            <ol className="space-y-4">
              {visibleHistory.map((event) => {
                const isValidDate = event.date && !Number.isNaN(Date.parse(event.date));
                const isSelected = selectedIds.includes(event.id);
                return (
                  <li key={event.id} className={`rounded-3xl border p-5 ${isSelected ? 'border-[var(--foreground)] bg-[var(--muted)]' : 'border-[var(--border)] bg-[var(--card)]'}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(event.id)}
                          aria-label={`Select reputation item ${event.type}: ${event.summary}`}
                          className="mt-1 h-4 w-4 rounded border-[var(--border)] text-[var(--foreground)] focus:ring-[var(--ring)]"
                        />
                        <span>
                          <span className="block text-sm font-medium text-[var(--muted-foreground)]">{event.type}</span>
                          <span className="mt-1 block text-base font-semibold text-[var(--foreground)]">{event.summary}</span>
                        </span>
                      </label>
                      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                        <time
                          className="text-sm text-[var(--muted-foreground)] sm:text-right"
                          {...(isValidDate ? { dateTime: event.date } : {})}
                        >
                          {event.date}
                        </time>
                        <div className="flex items-center gap-1.5">
                          <code
                            data-testid={`reputation-event-id-${event.id}`}
                            className="text-xs text-[var(--muted-foreground)] font-mono"
                          >
                            {event.id}
                          </code>
                          <CopyIdButton eventId={event.id} />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            {hasMoreHistory && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  aria-label={`Showing ${displayCount} of ${filteredHistory.length} events. Load more`}
                  className="w-full rounded-xl border-[var(--border)] bg-[var(--card)] py-2.5 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  Load more
                </button>
              </div>
            )}

            {isHistoryFullyShown && (
              <p
                data-testid="reputation-history-end"
                className="pt-2 text-center text-sm text-slate-500"
              >
                All {filteredHistory.length} events shown
              </p>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        tone="destructive"
        title="Delete selected reputation items?"
        description={`This will permanently delete ${selectedCount} selected reputation ${selectedCount === 1 ? 'item' : 'items'}. This action cannot be undone.`}
        confirmLabel="Delete selected"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteSelected}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}
