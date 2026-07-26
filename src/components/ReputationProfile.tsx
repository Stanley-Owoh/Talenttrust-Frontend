'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { validateReputationEvent } from '@/lib/validateReputationEvent';
import type { ValidationError } from '@/lib/validateLogin';

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
  /** Called when the user saves an edited reputation event. */
  onSave?: (event: ReputationEvent) => void;
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

/** Default number of history items shown per page. */
export const REPUTATION_PAGE_SIZE = 5;

export default function ReputationProfile({
  name,
  score,
  level,
  history = [],
  maxScore = 5,
  onSave,
}: ReputationProfileProps) {
  const hasReputation = typeof score === 'number' && score >= 0;
  const showPartial = hasReputation && history.length === 0;

  // Pagination: tracks how many history items are currently visible.
  // Resets to the first page whenever history or pageSize changes so
  // a data reload (or prop swap) always starts from the beginning.
  const [visibleCount, setVisibleCount] = useState(pageSize);
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [history, pageSize]);

  const visibleHistory = history.slice(0, visibleCount);
  const hasMore = visibleCount < history.length;

  const resolvedLevel = level !== undefined
    ? level
    : (hasReputation ? resolveReputationLevel(score, maxScore) : 'Community Member');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<{ type: string; summary: string; date: string }>({
    type: '',
    summary: '',
    date: '',
  });
  const [editErrors, setEditErrors] = useState<ValidationError[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const editTypeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId !== null) {
      editTypeRef.current?.focus();
    }
  }, [editingId]);

  const startEditing = useCallback((event: ReputationEvent) => {
    setEditingId(event.id);
    setEditedValues({ type: event.type, summary: event.summary, date: event.date });
    setEditErrors([]);
    setAnnouncement('');
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditedValues({ type: '', summary: '', date: '' });
    setEditErrors([]);
    setAnnouncement('');
  }, []);

  const handleSave = useCallback(
    (eventId: string) => {
      const errors = validateReputationEvent(editedValues);
      if (errors.length > 0) {
        setEditErrors(errors);
        setAnnouncement(`Validation error: ${errors.map((e) => e.message).join('. ')}`);
        return;
      }

      const updated: ReputationEvent = { id: eventId, ...editedValues };
      onSave?.(updated);
      setEditingId(null);
      setEditedValues({ type: '', summary: '', date: '' });
      setEditErrors([]);
      setAnnouncement('Reputation event updated successfully.');
    },
    [editedValues, onSave],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, eventId: string) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelEditing();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave(eventId);
      }
    },
    [cancelEditing, handleSave],
  );

  const fieldError = (fieldId: string): string | undefined =>
    editErrors.find((e) => e.fieldId === fieldId)?.message;

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
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-500" id="reputation-score-label">Reputation score</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950" aria-labelledby="reputation-score-label">
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
           <div className="rounded-3xl border-[var(--border)] bg-[var(--surface)] p-5">
             <p className="text-sm font-medium text-[var(--muted-foreground)]" id="reputation-level-label">Level</p>
             <p className="mt-3 text-xl font-semibold text-[var(--foreground)]" aria-labelledby="reputation-level-label">
              {hasReputation ? (
                <>
                  <span className="sr-only">Level </span>{resolvedLevel}
                </>
              ) : 'Pending'}
            </p>
          </div>
           <div className="rounded-3xl border-[var(--border)] bg-[var(--surface)] p-5">
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
                        ? 'border-indigo-200 bg-indigo-50/50 text-indigo-900 font-semibold'
                        : 'border-slate-200 bg-slate-50/50 text-slate-600'
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

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Reputation history</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              History is shown as safe, aggregated events with no wallet or personal metadata by default.
            </p>
          </div>
          <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            {history.length ? 'Visible' : 'Private by default'}
          </span>
        </div>

        {history.length === 0 ? (
           <div className="rounded-3xl border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted-foreground)]">
             <p className="font-semibold text-[var(--foreground)]">No reputation history available yet.</p>
             <p className="mt-2 text-sm leading-6">
              Reputation history appears once you complete verified actions. Your profile remains safe and privacy-friendly until then.
            </p>
          </div>
        ) : (
          <ol className="space-y-4">
            {history.map((event) => {
              const isEditing = editingId === event.id;
              const isValidDate = event.date && !Number.isNaN(Date.parse(event.date));

              if (isEditing) {
                return (
                  <li
                    key={event.id}
                    className="rounded-3xl border border-indigo-200 bg-indigo-50/30 p-5"
                    onKeyDown={(e) => handleKeyDown(e, event.id)}
                  >
                    <div className="flex flex-col gap-3">
                      <div>
                        <label htmlFor={`edit-type-${event.id}`} className="block text-sm font-medium text-slate-700">
                          Type
                        </label>
                        <input
                          ref={editTypeRef}
                          id={`edit-type-${event.id}`}
                          type="text"
                          value={editedValues.type}
                          onChange={(e) => setEditedValues((v) => ({ ...v, type: e.target.value }))}
                          className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          aria-invalid={!!fieldError('type')}
                          aria-describedby={fieldError('type') ? `edit-type-error-${event.id}` : undefined}
                        />
                        {fieldError('type') && (
                          <p id={`edit-type-error-${event.id}`} className="mt-1 text-sm text-red-600">
                            {fieldError('type')}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor={`edit-summary-${event.id}`} className="block text-sm font-medium text-slate-700">
                          Summary
                        </label>
                        <input
                          id={`edit-summary-${event.id}`}
                          type="text"
                          value={editedValues.summary}
                          onChange={(e) => setEditedValues((v) => ({ ...v, summary: e.target.value }))}
                          className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          aria-invalid={!!fieldError('summary')}
                          aria-describedby={fieldError('summary') ? `edit-summary-error-${event.id}` : undefined}
                        />
                        {fieldError('summary') && (
                          <p id={`edit-summary-error-${event.id}`} className="mt-1 text-sm text-red-600">
                            {fieldError('summary')}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor={`edit-date-${event.id}`} className="block text-sm font-medium text-slate-700">
                          Date
                        </label>
                        <input
                          id={`edit-date-${event.id}`}
                          type="text"
                          value={editedValues.date}
                          onChange={(e) => setEditedValues((v) => ({ ...v, date: e.target.value }))}
                          className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          aria-invalid={!!fieldError('date')}
                          aria-describedby={fieldError('date') ? `edit-date-error-${event.id}` : undefined}
                        />
                        {fieldError('date') && (
                          <p id={`edit-date-error-${event.id}`} className="mt-1 text-sm text-red-600">
                            {fieldError('date')}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSave(event.id)}
                          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </li>
                );
              }

              return (
                <li key={event.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-500">{event.type}</p>
                      <p className="mt-1 text-base font-semibold text-slate-950">{event.summary}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <time
                        className="text-sm text-slate-500"
                        {...(isValidDate ? { dateTime: event.date } : {})}
                      >
                        {event.date}
                      </time>
                      {onSave && (
                        <button
                          type="button"
                          onClick={() => startEditing(event)}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                          aria-label={`Edit ${event.type} event`}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </section>
  );
});

export default ReputationProfile;
