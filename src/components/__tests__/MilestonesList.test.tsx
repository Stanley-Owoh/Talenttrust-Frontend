import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import MilestonesList from '../MilestonesList';
import type { Milestone } from '../MilestonesList';
import { parseLocalDate, isDueSoon } from '../../lib/dueSoon';
import { ToastProvider } from '@/components/toast/toast-provider';

function r(element: React.ReactElement) {
  return render(element, { wrapper: ToastProvider });
}

const SAMPLE: Milestone[] = [
  {
    id: '1',
    title: 'Milestone 1',
    status: 'Pending',
    payout: 500,
    currency: 'USD',
    dueDate: 'May 10, 2026',
  },
  {
    id: '2',
    title: 'Milestone 2',
    status: 'Completed',
    payout: 1000,
    currency: 'USD',
    dueDate: 'Jun 1, 2026',
  },
];

const MIXED_CURRENCY_SAMPLE: Milestone[] = [
  {
    id: '1',
    title: 'Milestone 1',
    status: 'Pending',
    payout: 500,
    currency: 'USD',
    dueDate: 'May 10, 2026',
  },
  {
    id: '2',
    title: 'Milestone 2',
    status: 'Completed',
    payout: 1000,
    currency: 'EUR',
    dueDate: 'Jun 1, 2026',
  },
  {
    id: '3',
    title: 'Milestone 3',
    status: 'Pending',
    payout: 250,
    currency: 'GBP',
    dueDate: 'Jun 15, 2026',
  },
];

const scrollRegion = (container: HTMLElement) =>
  container.querySelector('.max-h-\\[calc\\(100vh-260px\\)\\]') as HTMLElement;

describe('MilestonesList', () => {
  it('renders each milestone item with status and payout', () => {
    r(<MilestonesList milestones={SAMPLE} />);

    expect(screen.getByText('Milestone 1')).toBeInTheDocument();
    expect(screen.getByText('Milestone 2')).toBeInTheDocument();
    expect(screen.getAllByText('Pending')).toHaveLength(2);
    expect(screen.getAllByText('Completed')).toHaveLength(2);
    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
  });

  describe('scroll region labelling', () => {
    it('associates the region with the visible heading via aria-labelledby', () => {
      const { container } = r(<MilestonesList milestones={SAMPLE} />);

      const heading = screen.getByRole('heading', { name: 'Milestones' });
      expect(heading).toHaveAttribute('id', 'milestones-title');

      const region = scrollRegion(container);
      expect(region).toHaveAttribute('role', 'region');
      expect(region.getAttribute('aria-labelledby')).toContain(
        'milestones-title',
      );
    });

    it('includes the count span id in aria-labelledby', () => {
      const { container } = r(<MilestonesList milestones={SAMPLE} />);

      const countSpan = container.querySelector('#milestones-count');
      expect(countSpan).toBeInTheDocument();
      expect(countSpan).toHaveTextContent('2 total');

      const region = scrollRegion(container);
      expect(region.getAttribute('aria-labelledby')).toContain(
        'milestones-count',
      );
    });

    it('count span reflects a single-item list', () => {
      const { container } = r(
        <MilestonesList milestones={[SAMPLE[0]]} />
      );
    });

    it('does not apply region attributes when the list is empty', () => {
      const { container } = r(<MilestonesList milestones={[]} />);
      const region = scrollRegion(container);
      expect(region).not.toHaveAttribute('role');
      expect(region).not.toHaveAttribute('tabIndex');
      expect(region).not.toHaveAttribute('aria-labelledby');
    });

    it('does not use a static aria-label on the scroll region', () => {
      const { container } = r(<MilestonesList milestones={SAMPLE} />);
      expect(scrollRegion(container)).not.toHaveAttribute('aria-label');
    });
  });

  describe('density toggle', () => {
    beforeEach(() => {
      localStorage.clear();
      resetCache();
    });

    const renderWithProvider = (ui: React.ReactElement) =>
      render(<PreferencesProvider>{ui}</PreferencesProvider>);

    it('renders the density toggle button with comfortable as default', () => {
      renderWithProvider(<MilestonesList milestones={SAMPLE} />);
      const toggle = screen.getByRole('button', { name: 'Switch to compact density' });
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
      expect(toggle).toHaveTextContent('Comfortable');
    });

    it('renders the toggle button reflecting stored compact preference', () => {
      localStorage.setItem(
        'talenttrust-user-preferences',
        JSON.stringify({ milestonesDensity: 'compact' }),
      );
      renderWithProvider(<MilestonesList milestones={SAMPLE} />);
      const toggle = screen.getByRole('button', { name: 'Switch to comfortable density' });
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
      expect(toggle).toHaveTextContent('Compact');
    });

    it('toggles from comfortable to compact on click', () => {
      renderWithProvider(<MilestonesList milestones={SAMPLE} />);
      const toggle = screen.getByRole('button', { name: 'Switch to compact density' });
      fireEvent.click(toggle);

      expect(toggle).toHaveAttribute('aria-pressed', 'true');
      expect(toggle).toHaveTextContent('Compact');
      expect(toggle).toHaveAttribute('aria-label', 'Switch to comfortable density');
    });

    it('toggles from compact back to comfortable on second click', () => {
      localStorage.setItem(
        'talenttrust-user-preferences',
        JSON.stringify({ milestonesDensity: 'compact' }),
      );
      renderWithProvider(<MilestonesList milestones={SAMPLE} />);
      const toggle = screen.getByRole('button', { name: 'Switch to comfortable density' });
      fireEvent.click(toggle);

      expect(toggle).toHaveAttribute('aria-pressed', 'false');
      expect(toggle).toHaveTextContent('Comfortable');
      expect(toggle).toHaveAttribute('aria-label', 'Switch to compact density');
    });

    it('persists density preference to localStorage on toggle', () => {
      renderWithProvider(<MilestonesList milestones={SAMPLE} />);
      const toggle = screen.getByRole('button', { name: 'Switch to compact density' });
      fireEvent.click(toggle);

      const saved = JSON.parse(
        localStorage.getItem('talenttrust-user-preferences') || '{}',
      );
      expect(saved.milestonesDensity).toBe('compact');
    });

    it('applies comfortable (default) spacing classes', () => {
      const { container } = renderWithProvider(<MilestonesList milestones={SAMPLE} />);
      const region = scrollRegion(container);
      expect(region.className).toContain('space-y-4');
      expect(region.className).toContain('mt-6');
      expect(region.className).not.toContain('space-y-2');
    });

    it('applies compact spacing classes when toggled', () => {
      localStorage.setItem(
        'talenttrust-user-preferences',
        JSON.stringify({ milestonesDensity: 'compact' }),
      );
      const { container } = renderWithProvider(<MilestonesList milestones={SAMPLE} />);
      const region = scrollRegion(container);
      expect(region.className).toContain('space-y-2');
      expect(region.className).toContain('mt-4');
      expect(region.className).not.toContain('space-y-4');
    });

    it('falls back to comfortable when stored value is invalid', () => {
      localStorage.setItem(
        'talenttrust-user-preferences',
        JSON.stringify({ milestonesDensity: 'invalid' }),
      );
      renderWithProvider(<MilestonesList milestones={SAMPLE} />);
      const toggle = screen.getByRole('button', { name: 'Switch to compact density' });
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });

    it('passes axe accessibility checks with density toggle present', async () => {
      const { container } = renderWithProvider(<MilestonesList milestones={SAMPLE} />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  it('makes the scroll region keyboard-focusable with focus-ring styles when populated', () => {
    const { container } = r(<MilestonesList milestones={SAMPLE} />);
    const region = scrollRegion(container);
    expect(region).toHaveAttribute('tabIndex', '0');
    expect(region).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-[var(--ring)]',
      'focus-visible:ring-offset-2',
    );
  });

  it('matches the expected per-status text counts (1 tally chip + 1 StatusBadge per row)', () => {
    render(<MilestonesList milestones={SAMPLE} />);
    // Each pending row contributes 2 'Pending' text nodes: one in the
    // status tally chip at the top of the list, one inside that row's
    // StatusBadge. With SAMPLE containing 1 Pending row and 1 Completed
    // row we expect exactly 2 of each.
    expect(screen.getAllByText('Pending')).toHaveLength(2);
    expect(screen.getAllByText('Completed')).toHaveLength(2);
  });

  it('does not render a currency warning when the contract currency is absent', () => {
    r(<MilestonesList milestones={MIXED_CURRENCY_SAMPLE} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders an accessible warning for milestone currencies that differ from the contract', () => {
    r(
      <MilestonesList
        milestones={MIXED_CURRENCY_SAMPLE}
        contractCurrency="usd"
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('2 milestones use EUR, GBP instead of USD.');
    // The same formatted amount can appear multiple times on the page
    // (e.g. inside the row's payout AND inside the warning's list), so
    // assert presence with getAllByText + index 0 to avoid strict-mode errors.
    expect(screen.getAllByText(/€1,000\.00/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/£250\.00/)[0]).toBeInTheDocument();
    expect(alert).toHaveTextContent('Milestone 2:');
    expect(alert).toHaveTextContent('Milestone 3:');
  });

  it('enters edit mode with the current values prefilled', async () => {
    render(<MilestonesList milestones={SAMPLE} />);

    fireEvent.click(
      screen.getAllByRole('button', { name: /edit milestone/i })[0],
    );

    const titleInput = screen.getByLabelText(/title/i);
    expect(titleInput).toHaveValue('Milestone 1');
    expect(screen.getByLabelText(/payout amount/i)).toHaveValue('500');
    expect(screen.getByLabelText(/currency/i)).toHaveValue('USD');
  });

  it('saves inline edits and calls the update handler once', async () => {
    const user = userEvent.setup();
    const onUpdateMilestone = jest.fn().mockReturnValue(true);
    render(
      <MilestonesList
        milestones={SAMPLE}
        onUpdateMilestone={onUpdateMilestone}
      />,
    );

    fireEvent.click(
      screen.getAllByRole('button', { name: /edit milestone/i })[0],
    );
    await user.clear(screen.getByLabelText(/title/i));
    await user.type(screen.getByLabelText(/title/i), 'Updated milestone');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onUpdateMilestone).toHaveBeenCalledTimes(1);
    expect(onUpdateMilestone).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        title: 'Updated milestone',
        payout: 500,
        currency: 'USD',
        dueDate: 'May 10, 2026',
      }),
    );
  });

  it('blocks save and keeps the row in edit mode when validation fails', async () => {
    const user = userEvent.setup();
    render(<MilestonesList milestones={SAMPLE} />);

    fireEvent.click(
      screen.getAllByRole('button', { name: /edit milestone/i })[0],
    );
    await user.clear(screen.getByLabelText(/title/i));
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveFocus();
  });

  it('cancels edits and restores the original values', async () => {
    const user = userEvent.setup();
    render(<MilestonesList milestones={SAMPLE} />);

    fireEvent.click(
      screen.getAllByRole('button', { name: /edit milestone/i })[0],
    );
    await user.clear(screen.getByLabelText(/title/i));
    await user.type(screen.getByLabelText(/title/i), 'Changed title');
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.getByText('Milestone 1')).toBeInTheDocument();
    expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();
  });

  it('cancels editing on Escape', async () => {
    const user = userEvent.setup();
    render(<MilestonesList milestones={SAMPLE} />);

    fireEvent.click(
      screen.getAllByRole('button', { name: /edit milestone/i })[0],
    );
    await user.type(screen.getByLabelText(/title/i), '{Escape}');

    expect(screen.getByText('Milestone 1')).toBeInTheDocument();
    expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();
  });

  it('passes axe accessibility checks with a populated list', async () => {
    const { container } = r(<MilestonesList milestones={SAMPLE} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('passes axe accessibility checks with a currency mismatch warning', async () => {
    const { container } = r(
      <MilestonesList
        milestones={MIXED_CURRENCY_SAMPLE}
        contractCurrency="USD"
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('passes axe accessibility checks with an empty list', async () => {
    const { container } = r(<MilestonesList milestones={[]} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  describe('due-soon reminder banner', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-10T12:00:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does not render banner if no milestones are due soon', () => {
      const milestones: Milestone[] = [
        {
          id: '1',
          title: 'Future Milestone',
          status: 'Pending',
          payout: 500,
          currency: 'USD',
          dueDate: 'May 20, 2026',
        }, // 10 days away
        {
          id: '2',
          title: 'TBD Milestone',
          status: 'Pending',
          payout: 1000,
          currency: 'USD',
          dueDate: undefined,
        },
      ];
      r(<MilestonesList milestones={milestones} />);
      expect(screen.queryByText(/due within/i)).not.toBeInTheDocument();
    });

    it('renders banner with correct pluralization for 1 due-soon milestone', () => {
      const milestones: Milestone[] = [
        {
          id: '1',
          title: 'Due Soon Milestone',
          status: 'Pending',
          payout: 500,
          currency: 'USD',
          dueDate: 'May 15, 2026',
        }, // 5 days away
      ];
      r(<MilestonesList milestones={milestones} />);
      expect(screen.getByText('1 milestone is due within 7 days')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Due Soon Milestone' })).toHaveAttribute('href', '#milestone-1');
    });

    it('renders banner with correct pluralization for multiple due-soon milestones', () => {
      const milestones: Milestone[] = [
        {
          id: '1',
          title: 'Milestone A',
          status: 'Pending',
          payout: 500,
          currency: 'USD',
          dueDate: 'May 12, 2026',
        }, // 2 days away
        {
          id: '2',
          title: 'Milestone B',
          status: 'Active',
          payout: 1000,
          currency: 'USD',
          dueDate: 'May 17, 2026',
        }, // 7 days away
      ];
      r(<MilestonesList milestones={milestones} />);
      expect(screen.getByText('2 milestones are due within 7 days')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Milestone A' })).toHaveAttribute('href', '#milestone-1');
      expect(screen.getByRole('link', { name: 'Milestone B' })).toHaveAttribute('href', '#milestone-2');
    });

    it('excludes milestones with terminal statuses (Paid, Completed)', () => {
      const milestones: Milestone[] = [
        {
          id: '1',
          title: 'Milestone A',
          status: 'Paid',
          payout: 500,
          currency: 'USD',
          dueDate: 'May 12, 2026',
        }, // 2 days away (Paid)
        {
          id: '2',
          title: 'Milestone B',
          status: 'Completed',
          payout: 1000,
          currency: 'USD',
          dueDate: 'May 15, 2026',
        }, // 5 days away (Completed)
      ];
      r(<MilestonesList milestones={milestones} />);
      expect(screen.queryByText(/due within/i)).not.toBeInTheDocument();
    });

    it('handles exactly-at-boundary due dates (today and 7 days from now)', () => {
      const milestones: Milestone[] = [
        {
          id: '1',
          title: 'Due Today',
          status: 'Pending',
          payout: 500,
          currency: 'USD',
          dueDate: '2026-05-10',
        }, // Today (May 10)
        {
          id: '2',
          title: 'Due in 7 Days',
          status: 'Pending',
          payout: 1000,
          currency: 'USD',
          dueDate: '2026-05-17',
        }, // Exactly 7 days
      ];
      r(<MilestonesList milestones={milestones} />);
      expect(screen.getByText('2 milestones are due within 7 days')).toBeInTheDocument();
    });

    it('ignores milestones with invalid/unparseable due dates', () => {
      const milestones: Milestone[] = [
        {
          id: '1',
          title: 'Invalid Date',
          status: 'Pending',
          payout: 500,
          currency: 'USD',
          dueDate: 'Not a Date',
        },
      ];
      r(<MilestonesList milestones={milestones} />);
      expect(screen.queryByText(/due within/i)).not.toBeInTheDocument();
    });

    it('hides the banner on dismiss and shifts focus to the scroll region', async () => {
      const milestones: Milestone[] = [
        {
          id: '1',
          title: 'Due Soon',
          status: 'Pending',
          payout: 500,
          currency: 'USD',
          dueDate: 'May 15, 2026',
        },
      ];
      const { container } = r(<MilestonesList milestones={milestones} />);
      
      const dismissBtn = screen.getByRole('button', { name: 'Dismiss reminder' });
      expect(dismissBtn).toBeInTheDocument();

      // Focus the dismiss button first to simulate user keyboard interaction
      dismissBtn.focus();
      expect(document.activeElement).toBe(dismissBtn);

      // Click the dismiss button
      fireEvent.click(dismissBtn);

      // Banner should be removed
      expect(screen.queryByText(/due within/i)).not.toBeInTheDocument();

      // Focus should shift to the scroll container
      const region = container.querySelector(
        '.max-h-\\[calc\\(100vh-260px\\)\\]',
      );
      expect(document.activeElement).toBe(region);
    });
  });

  it('passes axe accessibility checks when banner is rendered', async () => {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toLocaleDateString('en-US');
    const milestones: Milestone[] = [
      {
        id: '1',
        title: 'Due Soon',
        status: 'Pending',
        payout: 500,
        currency: 'USD',
        dueDate: tomorrowStr,
      },
    ];
    const { container } = r(<MilestonesList milestones={milestones} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  describe('dueSoon helper utilities', () => {
    it('parseLocalDate returns null for invalid types and empty values', () => {
      expect(parseLocalDate('')).toBeNull();
      expect(parseLocalDate(null as any)).toBeNull();
      expect(parseLocalDate(undefined as any)).toBeNull();
      expect(parseLocalDate(123 as any)).toBeNull();
    });

    it('parseLocalDate returns null for invalid date strings', () => {
      expect(parseLocalDate('not-a-date')).toBeNull();
      expect(parseLocalDate('2026-99-99')).toBeNull();
    });

    it('parseLocalDate parses ISO format to local midnight correctly', () => {
      const date = parseLocalDate('2026-05-15');
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(4); // 0-indexed May
      expect(date?.getDate()).toBe(15);
    });

    it('isDueSoon returns false for missing or invalid dates', () => {
      const today = new Date('2026-05-10');
      expect(isDueSoon(undefined, today, 7)).toBe(false);
      expect(isDueSoon('not-a-date', today, 7)).toBe(false);
    });
  });

  describe('pagination / load-more', () => {
    const SEVEN_MILESTONES: Milestone[] = [
      { id: 'a', title: 'Alpha',   status: 'Pending',   payout: 100, currency: 'USD', dueDate: 'May 10, 2026' },
      { id: 'b', title: 'Bravo',   status: 'Active',    payout: 200, currency: 'USD', dueDate: 'May 11, 2026' },
      { id: 'c', title: 'Charlie', status: 'Completed', payout: 300, currency: 'USD', dueDate: 'May 12, 2026' },
      { id: 'd', title: 'Delta',   status: 'Pending',   payout: 400, currency: 'USD', dueDate: 'May 13, 2026' },
      { id: 'e', title: 'Echo',    status: 'Paid',      payout: 500, currency: 'USD', dueDate: 'May 14, 2026' },
      { id: 'f', title: 'Foxtrot', status: 'Pending',   payout: 600, currency: 'USD', dueDate: 'May 15, 2026' },
      { id: 'g', title: 'Golf',    status: 'Disputed',  payout: 700, currency: 'USD', dueDate: 'May 16, 2026' },
    ];

    it('shows only the first page (pageSize items) on initial render', () => {
      render(<MilestonesList milestones={SEVEN_MILESTONES} pageSize={3} />);

      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Bravo')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
      expect(screen.queryByText('Delta')).not.toBeInTheDocument();
      expect(screen.queryByText('Echo')).not.toBeInTheDocument();
      expect(screen.queryByText('Foxtrot')).not.toBeInTheDocument();
      expect(screen.queryByText('Golf')).not.toBeInTheDocument();
      expect(screen.getByTestId('load-more-btn')).toBeInTheDocument();
    });

    it('load-more button displays the remaining count', () => {
      render(<MilestonesList milestones={SEVEN_MILESTONES} pageSize={3} />);

      const btn = screen.getByTestId('load-more-btn');
      expect(btn).toHaveTextContent('Load More (4 remaining)');
    });

    it('clicking load-more appends the next page of milestones', () => {
      render(<MilestonesList milestones={SEVEN_MILESTONES} pageSize={3} />);

      fireEvent.click(screen.getByTestId('load-more-btn'));

      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Bravo')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
      expect(screen.getByText('Delta')).toBeInTheDocument();
      expect(screen.getByText('Echo')).toBeInTheDocument();
      expect(screen.getByText('Foxtrot')).toBeInTheDocument();
      expect(screen.queryByText('Golf')).not.toBeInTheDocument();
      expect(screen.getByTestId('load-more-btn')).toHaveTextContent('Load More (1 remaining)');
    });

    it('load-more button disappears when all milestones are visible', () => {
      render(<MilestonesList milestones={SEVEN_MILESTONES} pageSize={3} />);

      fireEvent.click(screen.getByTestId('load-more-btn'));
      fireEvent.click(screen.getByTestId('load-more-btn'));

      expect(screen.getByText('Golf')).toBeInTheDocument();
      expect(screen.queryByTestId('load-more-btn')).not.toBeInTheDocument();
    });

    it('no load-more button when total milestones equals or is less than pageSize', () => {
      render(<MilestonesList milestones={SEVEN_MILESTONES.slice(0, 3)} pageSize={3} />);

      expect(screen.queryByTestId('load-more-btn')).not.toBeInTheDocument();
    });

    it('resets pagination when milestones prop changes (filter change)', () => {
      const { rerender } = render(<MilestonesList milestones={SEVEN_MILESTONES} pageSize={3} />);

      expect(screen.queryByText('Delta')).not.toBeInTheDocument();
      expect(screen.getByTestId('load-more-btn')).toBeInTheDocument();

      rerender(<MilestonesList milestones={SEVEN_MILESTONES.slice(0, 4)} pageSize={3} />);

      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Delta')).not.toBeInTheDocument();
      expect(screen.getByTestId('load-more-btn')).toHaveTextContent('Load More (1 remaining)');
    });

    it('passes axe accessibility checks with load-more button visible', async () => {
      const { container } = render(<MilestonesList milestones={SEVEN_MILESTONES} pageSize={3} />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
