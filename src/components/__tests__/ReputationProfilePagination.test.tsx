/**
 * ReputationProfilePagination.test.tsx
 *
 * Covers pagination / load-more behavior for the ReputationProfile component
 * as required by issue #811.
 *
 * Test matrix
 * ──────────────────────────────────────────────────────────────────────────
 *  1. First page   – only the first PAGE_SIZE items are shown on mount.
 *  2. Load-more    – clicking "Load more" appends the next page of items
 *                    without removing previously visible items.
 *  3. End of list  – "Load more" disappears and the "All N events shown"
 *                    sentinel is displayed once every item is visible.
 *  4. Reset        – visible count snaps back to page 1 when the history
 *                    prop is replaced (simulates a data reload or filter
 *                    change at the parent level).
 *  5. Edge cases   – history whose length is an exact multiple of pageSize,
 *                    history shorter than one page, history of exactly one
 *                    item, custom pageSize prop.
 *  6. Accessibility – button has a meaningful aria-label; no axe violations
 *                    in the paginated state.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * All tests are deterministic and make no real network calls.
 */

import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import ReputationProfile, {
  REPUTATION_PAGE_SIZE,
  ReputationEvent,
  ReputationProfileProps,
} from '../ReputationProfile';
import { assertNoA11yViolations } from '@/test-utils/a11y';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a deterministic array of N fake reputation events. */
function makeHistory(count: number): ReputationEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `event-${i + 1}`,
    type: `Type ${i + 1}`,
    summary: `Summary for event ${i + 1}`,
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
  }));
}

/** Convenience render with required props pre-filled. */
function renderProfile(overrides: Partial<ReputationProfileProps> & { history: ReputationEvent[] }) {
  const props: ReputationProfileProps = {
    name: 'Test User',
    score: 3,
    level: 'Trusted Partner',
    maxScore: 5,
    ...overrides,
  };
  return render(<ReputationProfile {...props} />);
}

/** Return all visible list items inside the history <ol>. */
function getHistoryItems(): HTMLElement[] {
  const ol = document.querySelector('ol');
  if (!ol) return [];
  return within(ol).queryAllByRole('listitem');
}

/** Return the "Load more" button if present, null otherwise. */
function getLoadMoreButton(): HTMLElement | null {
  return screen.queryByRole('button', { name: /load more/i });
}

/** Return the end-of-list sentinel element if present, null otherwise. */
function getEndSentinel(): HTMLElement | null {
  return document.querySelector('[data-testid="reputation-history-end"]');
}

// ---------------------------------------------------------------------------
// 1. First page – initial render shows only PAGE_SIZE items
// ---------------------------------------------------------------------------

describe('Pagination – first page', () => {
  const PAGE = REPUTATION_PAGE_SIZE; // 5 by default

  it('shows exactly PAGE_SIZE items when history length > PAGE_SIZE', () => {
    renderProfile({ history: makeHistory(PAGE + 3) });
    expect(getHistoryItems()).toHaveLength(PAGE);
  });

  it('renders the "Load more" button when there are more items beyond the first page', () => {
    renderProfile({ history: makeHistory(PAGE + 1) });
    expect(getLoadMoreButton()).toBeInTheDocument();
  });

  it('does NOT render the end-of-list sentinel on the first page when more items exist', () => {
    renderProfile({ history: makeHistory(PAGE + 1) });
    expect(getEndSentinel()).not.toBeInTheDocument();
  });

  it('shows the first PAGE_SIZE summaries in DOM order', () => {
    const history = makeHistory(PAGE + 2);
    renderProfile({ history });
    const items = getHistoryItems();
    history.slice(0, PAGE).forEach((ev, idx) => {
      expect(within(items[idx]).getByText(ev.summary)).toBeInTheDocument();
    });
  });

  it('does NOT render items beyond PAGE_SIZE on initial mount', () => {
    const history = makeHistory(PAGE + 2);
    renderProfile({ history });
    // Items from index PAGE onward must not appear.
    history.slice(PAGE).forEach((ev) => {
      expect(screen.queryByText(ev.summary)).not.toBeInTheDocument();
    });
  });

  it('uses a custom pageSize prop when provided', () => {
    const customPageSize = 3;
    renderProfile({ history: makeHistory(customPageSize + 2), pageSize: customPageSize });
    expect(getHistoryItems()).toHaveLength(customPageSize);
  });

  it('shows all items when history length equals PAGE_SIZE exactly', () => {
    renderProfile({ history: makeHistory(PAGE) });
    expect(getHistoryItems()).toHaveLength(PAGE);
    // No "Load more" – already showing everything.
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  it('shows all items when history length is less than PAGE_SIZE', () => {
    const count = PAGE - 2;
    renderProfile({ history: makeHistory(count) });
    expect(getHistoryItems()).toHaveLength(count);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  it('handles a single-item history without crashing', () => {
    renderProfile({ history: makeHistory(1) });
    expect(getHistoryItems()).toHaveLength(1);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Load-more – clicking appends next page without removing existing items
// ---------------------------------------------------------------------------

describe('Pagination – load-more appends items', () => {
  const PAGE = REPUTATION_PAGE_SIZE;

  it('adds PAGE_SIZE more items after one click', () => {
    renderProfile({ history: makeHistory(PAGE * 2) });
    fireEvent.click(getLoadMoreButton()!);
    expect(getHistoryItems()).toHaveLength(PAGE * 2);
  });

  it('preserves previously visible items after clicking "Load more"', () => {
    const history = makeHistory(PAGE + 3);
    renderProfile({ history });
    // Verify first-page items are visible before click.
    history.slice(0, PAGE).forEach((ev) => {
      expect(screen.getByText(ev.summary)).toBeInTheDocument();
    });
    fireEvent.click(getLoadMoreButton()!);
    // They must still be in the DOM after the click.
    history.slice(0, PAGE).forEach((ev) => {
      expect(screen.getByText(ev.summary)).toBeInTheDocument();
    });
  });

  it('reveals the next-page items after clicking "Load more"', () => {
    const history = makeHistory(PAGE + 3);
    renderProfile({ history });
    fireEvent.click(getLoadMoreButton()!);
    history.slice(PAGE, PAGE + 3).forEach((ev) => {
      expect(screen.getByText(ev.summary)).toBeInTheDocument();
    });
  });

  it('handles multiple sequential "Load more" clicks correctly', () => {
    const history = makeHistory(PAGE * 3 + 1);
    renderProfile({ history });

    // After 1st click: 2 pages visible.
    fireEvent.click(getLoadMoreButton()!);
    expect(getHistoryItems()).toHaveLength(PAGE * 2);

    // After 2nd click: 3 pages visible.
    fireEvent.click(getLoadMoreButton()!);
    expect(getHistoryItems()).toHaveLength(PAGE * 3);

    // The last 1 item is still behind "Load more".
    expect(getLoadMoreButton()).toBeInTheDocument();
    expect(getHistoryItems()).toHaveLength(PAGE * 3);
  });

  it('shows partial last page items correctly when history is not a multiple of PAGE_SIZE', () => {
    // 7 items, pageSize 5: first click shows all 7 (5 + 2).
    const history = makeHistory(PAGE + 2);
    renderProfile({ history });
    fireEvent.click(getLoadMoreButton()!);
    expect(getHistoryItems()).toHaveLength(PAGE + 2);
  });

  it('"Load more" button remains visible as long as more items exist', () => {
    const history = makeHistory(PAGE * 3);
    renderProfile({ history });

    fireEvent.click(getLoadMoreButton()!);
    // Still more items after the first click.
    expect(getLoadMoreButton()).toBeInTheDocument();

    fireEvent.click(getLoadMoreButton()!);
    // All items now visible: button disappears.
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. End of list – sentinel appears, button disappears
// ---------------------------------------------------------------------------

describe('Pagination – end of list', () => {
  const PAGE = REPUTATION_PAGE_SIZE;

  it('shows the end-of-list sentinel when all items are visible from the start', () => {
    renderProfile({ history: makeHistory(PAGE - 1) });
    expect(getEndSentinel()).toBeInTheDocument();
  });

  it('shows the end-of-list sentinel after loading all pages', () => {
    renderProfile({ history: makeHistory(PAGE * 2) });
    fireEvent.click(getLoadMoreButton()!);
    expect(getEndSentinel()).toBeInTheDocument();
  });

  it('hides the "Load more" button when the end sentinel is shown', () => {
    renderProfile({ history: makeHistory(PAGE) });
    expect(getLoadMoreButton()).not.toBeInTheDocument();
    expect(getEndSentinel()).toBeInTheDocument();
  });

  it('sentinel text includes the total number of events', () => {
    const count = PAGE - 1;
    renderProfile({ history: makeHistory(count) });
    expect(getEndSentinel()).toHaveTextContent(`All ${count} events shown`);
  });

  it('sentinel text updates correctly after loading more items', () => {
    const count = PAGE + 2;
    renderProfile({ history: makeHistory(count) });
    fireEvent.click(getLoadMoreButton()!);
    expect(getEndSentinel()).toHaveTextContent(`All ${count} events shown`);
  });

  it('shows the end sentinel immediately when history has exactly 1 item', () => {
    renderProfile({ history: makeHistory(1) });
    expect(getEndSentinel()).toBeInTheDocument();
    expect(getEndSentinel()).toHaveTextContent('All 1 events shown');
  });

  it('shows the end sentinel when history length equals pageSize exactly', () => {
    renderProfile({ history: makeHistory(PAGE) });
    expect(getEndSentinel()).toBeInTheDocument();
    expect(getEndSentinel()).toHaveTextContent(`All ${PAGE} events shown`);
  });
});

// ---------------------------------------------------------------------------
// 4. Reset – visible count resets when history prop changes
// ---------------------------------------------------------------------------

describe('Pagination – reset on history change', () => {
  const PAGE = REPUTATION_PAGE_SIZE;

  it('resets to the first page when a new (larger) history prop is passed', () => {
    const { rerender } = renderProfile({ history: makeHistory(PAGE + 3) });

    // Load more so we are past the first page.
    fireEvent.click(getLoadMoreButton()!);
    expect(getHistoryItems()).toHaveLength(PAGE + 3);

    // Replace history with a fresh larger dataset.
    const newHistory = makeHistory(PAGE * 2 + 1);
    rerender(
      <ReputationProfile
        name="Test User"
        score={3}
        level="Trusted Partner"
        history={newHistory}
      />
    );

    // Should snap back to the first page.
    expect(getHistoryItems()).toHaveLength(PAGE);
    expect(getLoadMoreButton()).toBeInTheDocument();
  });

  it('resets to the first page when a shorter history prop replaces a longer one', () => {
    const { rerender } = renderProfile({ history: makeHistory(PAGE + 5) });
    fireEvent.click(getLoadMoreButton()!);

    // Replace with a short dataset (fewer than PAGE items).
    const shortHistory = makeHistory(3);
    rerender(
      <ReputationProfile
        name="Test User"
        score={3}
        level="Trusted Partner"
        history={shortHistory}
      />
    );

    expect(getHistoryItems()).toHaveLength(3);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
    expect(getEndSentinel()).toBeInTheDocument();
  });

  it('resets when the same-length but different-content history is passed', () => {
    const first = makeHistory(PAGE + 2);
    const { rerender } = renderProfile({ history: first });
    fireEvent.click(getLoadMoreButton()!);
    // All items visible.
    expect(getHistoryItems()).toHaveLength(PAGE + 2);

    // Swap in a different array of the same length.
    const second = makeHistory(PAGE + 2).map((e) => ({
      ...e,
      summary: `New ${e.summary}`,
    }));
    rerender(
      <ReputationProfile
        name="Test User"
        score={3}
        level="Trusted Partner"
        history={second}
      />
    );

    // Only PAGE items should be visible – reset occurred.
    expect(getHistoryItems()).toHaveLength(PAGE);
    // New content should be shown.
    second.slice(0, PAGE).forEach((ev) => {
      expect(screen.getByText(ev.summary)).toBeInTheDocument();
    });
    // Old content beyond first page should not appear.
    first.slice(PAGE).forEach((ev) => {
      expect(screen.queryByText(ev.summary)).not.toBeInTheDocument();
    });
  });

  it('resets to the first page when an empty history replaces a non-empty one', () => {
    const { rerender } = renderProfile({ history: makeHistory(PAGE + 1) });
    fireEvent.click(getLoadMoreButton()!);

    rerender(
      <ReputationProfile
        name="Test User"
        score={3}
        level="Trusted Partner"
        history={[]}
      />
    );

    // Empty history shows the empty-state message, not a list.
    expect(document.querySelector('ol')).toBeNull();
    expect(screen.getByText(/No reputation history available yet/i)).toBeInTheDocument();
  });

  it('resets when the pageSize prop changes', () => {
    const history = makeHistory(10);
    const { rerender } = renderProfile({ history, pageSize: 5 });

    // Load more once: 10 visible, no more button.
    fireEvent.click(getLoadMoreButton()!);
    expect(getHistoryItems()).toHaveLength(10);

    // Change pageSize – should reset to new pageSize.
    rerender(
      <ReputationProfile
        name="Test User"
        score={3}
        level="Trusted Partner"
        history={history}
        pageSize={3}
      />
    );
    expect(getHistoryItems()).toHaveLength(3);
    expect(getLoadMoreButton()).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 5. Edge cases
// ---------------------------------------------------------------------------

describe('Pagination – edge cases', () => {
  const PAGE = REPUTATION_PAGE_SIZE;

  it('handles history whose length is an exact multiple of pageSize', () => {
    // 3 full pages; after loading all, button disappears cleanly.
    renderProfile({ history: makeHistory(PAGE * 3) });
    fireEvent.click(getLoadMoreButton()!); // page 2
    fireEvent.click(getLoadMoreButton()!); // page 3
    expect(getHistoryItems()).toHaveLength(PAGE * 3);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
    expect(getEndSentinel()).toBeInTheDocument();
  });

  it('does not render the <ol> or Load-more when history is empty', () => {
    renderProfile({ history: [] });
    expect(document.querySelector('ol')).toBeNull();
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  it('renders correctly with pageSize=1', () => {
    const history = makeHistory(3);
    renderProfile({ history, pageSize: 1 });
    expect(getHistoryItems()).toHaveLength(1);
    fireEvent.click(getLoadMoreButton()!);
    expect(getHistoryItems()).toHaveLength(2);
    fireEvent.click(getLoadMoreButton()!);
    expect(getHistoryItems()).toHaveLength(3);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
    expect(getEndSentinel()).toBeInTheDocument();
  });

  it('renders correctly with pageSize larger than history length', () => {
    renderProfile({ history: makeHistory(2), pageSize: 100 });
    expect(getHistoryItems()).toHaveLength(2);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
    expect(getEndSentinel()).toBeInTheDocument();
  });

  it('preserves item order across multiple load-more clicks', () => {
    const history = makeHistory(PAGE * 2 + 1);
    renderProfile({ history });
    fireEvent.click(getLoadMoreButton()!);
    fireEvent.click(getLoadMoreButton()!);
    const items = getHistoryItems();
    history.forEach((ev, idx) => {
      expect(within(items[idx]).getByText(ev.summary)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// 6. Accessibility – aria-label on button; axe audits
// ---------------------------------------------------------------------------

describe('Pagination – accessibility', () => {
  const PAGE = REPUTATION_PAGE_SIZE;

  it('"Load more" button has a descriptive aria-label', () => {
    const history = makeHistory(PAGE + 3);
    renderProfile({ history });
    const btn = getLoadMoreButton();
    expect(btn).toBeInTheDocument();
    const label = btn?.getAttribute('aria-label') ?? '';
    // Should mention current count and total.
    expect(label).toMatch(/showing/i);
    expect(label).toMatch(String(PAGE));
    expect(label).toMatch(String(history.length));
  });

  it('"Load more" button aria-label updates after each click', () => {
    const history = makeHistory(PAGE * 3);
    renderProfile({ history });

    fireEvent.click(getLoadMoreButton()!);
    const labelAfterFirstClick = getLoadMoreButton()?.getAttribute('aria-label') ?? '';
    expect(labelAfterFirstClick).toMatch(String(PAGE * 2));
    expect(labelAfterFirstClick).toMatch(String(history.length));
  });

  it('paginated first-page state has no axe violations', async () => {
    const { container } = renderProfile({ history: makeHistory(PAGE + 3) });
    await assertNoA11yViolations(container);
  });

  it('post-load-more state has no axe violations', async () => {
    const { container } = renderProfile({ history: makeHistory(PAGE * 2) });
    fireEvent.click(getLoadMoreButton()!);
    await assertNoA11yViolations(container);
  });

  it('end-of-list state has no axe violations', async () => {
    const { container } = renderProfile({ history: makeHistory(PAGE - 1) });
    await assertNoA11yViolations(container);
  });
});
