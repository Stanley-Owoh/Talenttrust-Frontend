// Pin timezone for deterministic tests
process.env.TZ = 'UTC';

import { getRelativeTime } from '../relativeTime';

describe('getRelativeTime', () => {
  const today = new Date(2026, 4, 10); // May 10, 2026

  it('returns "Today" for a same-day creation date (just now)', () => {
    expect(getRelativeTime('2026-05-10', today)).toBe('Today');
  });

  it('returns "Yesterday" for a one-day-old date', () => {
    expect(getRelativeTime('2026-05-09', today)).toBe('Yesterday');
  });

  it('returns "N days ago" for dates within the last week', () => {
    expect(getRelativeTime('2026-05-06', today)).toBe('4 days ago');
  });

  it('returns "N weeks ago" for dates within the last month', () => {
    expect(getRelativeTime('2026-04-20', today)).toBe('2 weeks ago');
  });

  it('returns singular "1 week ago" correctly', () => {
    expect(getRelativeTime('2026-05-03', today)).toBe('1 week ago');
  });

  it('returns "N months ago" for dates within the last year', () => {
    expect(getRelativeTime('2026-01-10', today)).toBe('4 months ago');
  });

  it('returns singular "1 month ago" correctly', () => {
    expect(getRelativeTime('2026-04-08', today)).toBe('1 month ago');
  });

  it('returns "N years ago" for far past dates', () => {
    expect(getRelativeTime('2021-05-10', today)).toBe('5 years ago');
  });

  it('returns singular "1 year ago" correctly', () => {
    expect(getRelativeTime('2025-05-01', today)).toBe('1 year ago');
  });

  it('handles the "Apr 20, 2026"-style formatted strings the app actually stores', () => {
    expect(getRelativeTime('Apr 20, 2026', today)).toBe('2 weeks ago');
  });

  it('falls back to the raw string for an invalid date', () => {
    expect(getRelativeTime('not-a-date', today)).toBe('not-a-date');
    expect(getRelativeTime('2026-02-30', today)).toBe('2026-02-30');
  });

  it('falls back to "Unknown date" when no date is provided', () => {
    expect(getRelativeTime(undefined, today)).toBe('Unknown date');
    expect(getRelativeTime('', today)).toBe('Unknown date');
  });
});
