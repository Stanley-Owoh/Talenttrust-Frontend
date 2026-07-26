import { parseLocalDate } from './dueSoon';

/**
 * Formats a creation date string as a short, human-readable relative time
 * label (e.g. "Today", "3 days ago", "2 years ago").
 *
 * Reuses `parseLocalDate` so the same calendar-date parsing rules (and the
 * same invalid-date guarding) apply here as they do for milestone due dates.
 *
 * @param dateStr - The stored date string (e.g. "Apr 20, 2026" or "2026-04-20").
 * @param now - The reference "current" date; defaults to `new Date()`. Exposed
 *   as a parameter so tests can pin it for deterministic assertions.
 * @returns A relative label, or the original string (unchanged) when the date
 *   cannot be parsed, so callers never render nothing for malformed input.
 */
export function getRelativeTime(dateStr: string | undefined, now: Date = new Date()): string {
  if (!dateStr) return 'Unknown date';

  const parsed = parseLocalDate(dateStr);
  if (!parsed) return dateStr;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today.getTime() - parsed.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Future-dated or same-day creation both read naturally as "Today" here,
  // since createdAt only carries day-level precision, not a time-of-day.
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffDays < 365) return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;

  const diffYears = Math.floor(diffDays / 365);
  return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
}
