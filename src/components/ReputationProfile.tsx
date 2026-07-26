"use client";

import { useState, useMemo } from 'react';

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

export default function ReputationProfile({
  name,
  score,
  level,
  history = [],
  maxScore = 5,
}: ReputationProfileProps) {
  const hasReputation = typeof score === 'number' && score >= 0;
  const showPartial = hasReputation && history.length === 0;

  const [selectedType, setSelectedType] = useState<string>('All');

  const availableTypes = useMemo(() => {
    const types = new Set(history.map((event) => event.type));
    return ['All', ...Array.from(types).sort()];
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (selectedType === 'All') return history;
    return history.filter((event) => event.type === selectedType);
  }, [history, selectedType]);

  const resolvedLevel = level !== undefined
    ? level
    : (hasReputation ? resolveReputationLevel(score, maxScore) : 'Community Member');

  return (
    <section className="w-full max-w-5xl mx-auto space-y-8 px-4 py-10 sm:px-6 lg:px-8" aria-labelledby="profile-heading">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="sr-only" id="profile-heading">Reputation profile for {name}</h2>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-2xl font-semibold text-white">
              {name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Reputation profile</p>
              <h1 className="text-2xl font-semibold text-slate-950">{name}</h1>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-3xl bg-slate-50 p-4 text-slate-700 sm:p-5">
            <p className="text-sm font-medium text-slate-500">Privacy-friendly defaults</p>
            <p className="text-sm leading-6">Only summary trust signals are shown by default. Sensitive metadata remains hidden.</p>
          </div>
        </div>

        {/**
          * Reputation score meter with accessible semantics.
          *
          * The score is rendered within a span with role="meter" to expose
          * the measured value to assistive technologies. The meter includes
          * aria-valuenow, aria-valuemin (0), and aria-valuemax (configurable
          * maxScore, defaulting to 5) so screen readers understand the score
          * as a quantified range value rather than plain text.
          *
          * When score is absent or null, the "No reputation yet" text is shown
          * without a meter role.
          */}
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
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-500" id="reputation-level-label">Level</p>
            <p className="mt-3 text-xl font-semibold text-slate-950" aria-labelledby="reputation-level-label">
              {hasReputation ? (
                <>
                  <span className="sr-only">Level </span>{resolvedLevel}
                </>
              ) : 'Pending'}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-500">Explanation</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">{reputationSummary}</p>
          </div>
        </div>

        {hasReputation && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <h2 className="text-sm font-semibold text-slate-900" id="reputation-legend-title">
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
                    className={`rounded-2xl border p-3 transition-colors ${
                      isActive
                        ? 'border-indigo-200 bg-indigo-50/50 text-indigo-900 font-semibold'
                        : 'border-slate-200 bg-slate-50/50 text-slate-600'
                    }`}
                  >
                    <p className="font-bold text-xs uppercase tracking-wider text-slate-400">
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
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">Partial reputation data</p>
            <p className="mt-1 text-sm leading-6">
              A score exists but history is currently hidden until verified actions are available. This keeps your profile safe and private.
            </p>
          </div>
        )}
      </div>

      {/**
       * Reputation history section.
       *
       * Semantic notes:
       * - Uses `<ol>` (ordered list) because reputation history is inherently
       *   chronological — the order of events is meaningful.
       * - Each event date is wrapped in a `<time>` element whose `dateTime`
       *   attribute carries a machine-readable ISO-8601 value, improving
       *   assistive-technology support and SEO date parsing.
       * - When the date string is not a valid ISO date the `dateTime` attribute
       *   is omitted, keeping the markup valid.
       */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Reputation history</h2>
            <p className="mt-1 text-sm text-slate-500">
              History is shown as safe, aggregated events with no wallet or personal metadata by default.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {history.length > 0 && (
              <div className="flex items-center gap-2">
                <label htmlFor="history-type-filter" className="text-sm font-medium text-slate-700">
                  Filter:
                </label>
                <select
                  id="history-type-filter"
                  className="rounded-lg border border-slate-300 py-1 pl-3 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  {availableTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <div aria-live="polite" className="sr-only">
                  Showing {filteredHistory.length} {filteredHistory.length === 1 ? 'event' : 'events'}
                </div>
              </div>
            )}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-600 self-start sm:self-auto">
              {history.length ? 'Visible' : 'Private by default'}
            </span>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
            <p className="font-semibold text-slate-900">No reputation history available yet.</p>
            <p className="mt-2 text-sm leading-6">
              Reputation history appears once you complete verified actions. Your profile remains safe and privacy-friendly until then.
            </p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
            <p className="font-semibold text-slate-900">No matching events.</p>
            <p className="mt-2 text-sm leading-6">
              Try selecting a different filter type or "All" to view your reputation history.
            </p>
          </div>
        ) : (
          <ol className="space-y-4">
            {filteredHistory.map((event) => {
              // Determine whether the date string is a parseable ISO date.
              // If it is, expose the ISO value via dateTime for machine readability.
              const isValidDate = event.date && !Number.isNaN(Date.parse(event.date));
              return (
                <li key={event.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{event.type}</p>
                      <p className="mt-1 text-base font-semibold text-slate-950">{event.summary}</p>
                    </div>
                    <time
                      className="text-sm text-slate-500"
                      {...(isValidDate ? { dateTime: event.date } : {})}
                    >
                      {event.date}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
