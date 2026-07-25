# MilestonesList Component

## Overview

The `MilestonesList` component displays the list of milestones associated with a contract. It renders each milestone's status, payout amount, and due date.

## Due-Soon Reminder Banner

An accessible, dismissible banner is surfaced above the milestones list when there are milestones approaching their deadlines. This banner alerts both freelancers and clients about imminent payout dates, ensuring time-sensitive work is not missed.

### Features

- **Configurable Window**: Surfaces milestones due within a configurable timeframe defined by a named constant (default: `7` days).
- **Status Exclusions**: Excludes milestones that are already in terminal statuses (`Paid` or `Completed`).
- **Date Handling**: Uses a robust local-time date parser to prevent UTC-to-local shifts, ensuring that boundaries are computed accurately against local calendar days.
- **Keyboard accessibility**:
  - The banner container has `role="status"` to announce updates to screen readers.
  - Links inside the banner target the specific milestone element ID (`#milestone-${id}`) to allow users to jump or scroll directly to the milestone card.
  - Dismiss and in-list links use `focus-visible` rings so keyboard focus is visible without changing layout.
  - Focus is programmatically restored to the scrollable milestones list container when the banner is dismissed, preventing loss of keyboard focus (WCAG 2.1.1).
  - Enter and Space activate the dismiss control; Tab reaches links, dismiss, then the scroll region.

## Implementation Details

- **File**: [src/components/MilestonesList.tsx](file:///c:/Users/USER/Desktop/Talenttrust-Frontend/src/components/MilestonesList.tsx)
- **Helper**: [src/lib/dueSoon.ts](file:///c:/Users/USER/Desktop/Talenttrust-Frontend/src/lib/dueSoon.ts)
- **Constant**: `REMINDER_WINDOW_DAYS = 7`

## Testing

Comprehensive test coverage is provided in [MilestonesList.test.tsx](file:///c:/Users/USER/Desktop/Talenttrust-Frontend/src/components/__tests__/MilestonesList.test.tsx):
- Renders banner when due-soon milestones exist.
- Correct pluralization (e.g., "1 milestone is due..." vs "2 milestones are due...").
- Exclusion of terminal statuses.
- Proper handling of due-date boundaries (exactly today, exactly 7 days from now).
- Graceful skipping of invalid/unparseable due date strings.
- Dismiss interaction and focus restoration checking.
- Accessibility validation using `axe`.

Run tests with:
```bash
npx jest src/components/__tests__/MilestonesList.test.tsx
```

## URL Status Filtering

The milestones page synchronizes the active status filter with the URL query parameter `?status=`.

- **Initial State**: Read from the `?status=` URL query parameter using `useSearchParams`. Defaults to `'All'` if omitted or invalid.
- **Filter Changes**: When a user selects a filter option, `router.replace` updates the URL query string without creating extra history entries.
- **Accessibility**: Preserves the `aria-live` announcement for screen readers on filter change.
