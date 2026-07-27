import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import MilestonesList from '../MilestonesList';
import type { Milestone } from '../MilestonesList';

// All fixture due dates below are fixed in the past relative to any
// plausible "now", so the due-soon reminder banner (computed from
// `new Date()` inside the component) never leaks non-deterministically
// into these structural/snapshot assertions. The one test that needs the
// banner to render freezes the clock itself, scoped to just that test, so
// it doesn't interfere with jest-axe's use of real timers elsewhere in this
// file.
const LOADED_MILESTONES: Milestone[] = [
  { id: 'm1', title: 'Kickoff call', status: 'Completed', payout: 1200, currency: 'USD', dueDate: '2025-01-01' },
  { id: 'm2', title: 'Design handoff', status: 'Pending', payout: 3400, currency: 'USD', dueDate: '2025-02-01' },
  { id: 'm3', title: 'Final delivery', status: 'Disputed', payout: 5000, currency: 'USD', dueDate: '2025-03-01' },
];

describe('MilestonesList structural/snapshot tests', () => {
  describe('loaded state', () => {
    it('matches the structural snapshot for a populated list', () => {
      const { container } = render(<MilestonesList milestones={LOADED_MILESTONES} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('renders one article per milestone, in the same order supplied', () => {
      const { container } = render(<MilestonesList milestones={LOADED_MILESTONES} />);
      const articles = container.querySelectorAll('article');
      expect(articles).toHaveLength(LOADED_MILESTONES.length);
      expect(Array.from(articles).map((a) => a.id)).toEqual([
        'milestone-m1',
        'milestone-m2',
        'milestone-m3',
      ]);
    });

    it('renders one status-tally chip per distinct status present', () => {
      const { container } = render(<MilestonesList milestones={LOADED_MILESTONES} />);
      const tallyList = container.querySelector('[aria-label="Milestone status summary"]');
      expect(tallyList).not.toBeNull();
      expect(tallyList?.querySelectorAll('[role="listitem"]')).toHaveLength(3);
    });

    it('marks the scroll region as a focusable, labelled region containing every article', () => {
      const { container } = render(<MilestonesList milestones={LOADED_MILESTONES} />);
      const region = container.querySelector('[role="region"]');
      expect(region).toHaveAttribute('tabIndex', '0');
      expect(region?.children).toHaveLength(LOADED_MILESTONES.length);
    });

    it('renders sections in a stable top-to-bottom order: header, tally, scroll region', () => {
      const { container } = render(<MilestonesList milestones={LOADED_MILESTONES} />);
      const section = container.querySelector('section');
      const children = Array.from(section?.children ?? []);
      // No contractCurrency and no due-soon milestones here, so the header
      // row, the two sr-only live regions (density + save announcements),
      // the status-tally chips, and the scroll region render — in that order.
      expect(children).toHaveLength(5);
      expect(children[0].querySelector('#milestones-title')).not.toBeNull();
      expect(children[2]).toHaveAttribute('role', 'list');
      expect(children[4]).toHaveAttribute('role', 'region');
    });
  });

  describe('empty state', () => {
    it('matches the structural snapshot for an empty list', () => {
      const { container } = render(<MilestonesList milestones={[]} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('renders zero articles and omits the status-tally list', () => {
      const { container } = render(<MilestonesList milestones={[]} />);
      expect(container.querySelectorAll('article')).toHaveLength(0);
      expect(container.querySelector('[aria-label="Milestone status summary"]')).toBeNull();
    });

    it('renders exactly the header row and an unlabelled, non-focusable, empty scroll region', () => {
      const { container } = render(<MilestonesList milestones={[]} />);
      const section = container.querySelector('section');
      const children = Array.from(section?.children ?? []);
      // Header row plus the two sr-only live regions (density + save
      // announcements) always render; the tally list is omitted when empty.
      expect(children).toHaveLength(4);

      const region = children[3];
      expect(region).not.toHaveAttribute('role');
      expect(region).not.toHaveAttribute('tabIndex');
      expect(region.children).toHaveLength(0);
    });

    it('passes axe accessibility checks in the empty state', async () => {
      const { container } = render(<MilestonesList milestones={[]} />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('edge cases', () => {
    it('renders "Due TBD" and matches the snapshot when a milestone has no dueDate', () => {
      const milestones: Milestone[] = [
        { id: 'm1', title: 'Undated milestone', status: 'Pending', payout: 100, currency: 'USD' },
      ];
      const { getByText, container } = render(<MilestonesList milestones={milestones} />);
      expect(getByText('Due TBD')).toBeInTheDocument();
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches the structural snapshot when a currency-mismatch warning is present', () => {
      const milestones: Milestone[] = [
        { id: 'm1', title: 'Local milestone', status: 'Pending', payout: 500, currency: 'USD', dueDate: '2025-01-01' },
        { id: 'm2', title: 'Foreign milestone', status: 'Pending', payout: 400, currency: 'EUR', dueDate: '2025-01-02' },
      ];
      const { container } = render(
        <MilestonesList milestones={milestones} contractCurrency="USD" />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches the structural snapshot when the due-soon reminder banner is present', () => {
      // Freeze the clock, scoped to this test only, so the due date lands
      // deterministically inside the reminder window regardless of when the
      // suite actually runs. jest-axe (used elsewhere in this file) relies on
      // real timers, so this is intentionally not a file-wide beforeEach.
      jest.useFakeTimers().setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
      try {
        const milestones: Milestone[] = [
          { id: 'm1', title: 'Urgent milestone', status: 'Pending', payout: 750, currency: 'USD', dueDate: '2026-01-03' },
        ];
        const { container } = render(<MilestonesList milestones={milestones} />);
        expect(container.firstChild).toMatchSnapshot();
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
