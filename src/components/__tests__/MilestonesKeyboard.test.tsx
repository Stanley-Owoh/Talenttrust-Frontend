/**
 * #618 — Milestones keyboard operability
 *
 * Covers:
 *  - Visible focus styles on every interactive milestones control
 *  - Enter / Space activation
 *  - Logical tab order (filter → Add → due-soon → scroll region)
 *  - Edge cases: Cancel via keyboard, filter arrow keys, dismiss focus move
 */

import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import MilestonesPage from '@/app/milestones/page';
import { MilestoneCreationForm } from '@/components/milestones/MilestoneCreationForm';
import MilestoneFilter from '@/components/milestones/MilestoneFilter';
import MilestonesList from '@/components/MilestonesList';
import { listMilestones, saveMilestone } from '@/lib/repository';
import { resetCache as resetSafeStorageCache } from '@/lib/safeStorage';
import type { Milestone } from '@/types/domain';

const mockSearchParams = {
  get: jest.fn(() => null),
  toString: jest.fn(() => ''),
};
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), prefetch: jest.fn() }),
}));

jest.mock('@/lib/repository', () => ({
  listMilestones: jest.fn(),
  saveMilestone: jest.fn(),
}));

const mockedListMilestones = jest.mocked(listMilestones);
const mockedSaveMilestone = jest.mocked(saveMilestone);

const FOCUS_OUTLINE = [
  'focus-visible:outline',
  'focus-visible:outline-4',
  'focus-visible:outline-offset-2',
  'focus-visible:outline-blue-500',
] as const;

const persisted: Milestone[] = [
  {
    id: 'kb-1',
    title: 'Keyboard Kickoff',
    status: 'Pending',
    payout: 1000,
    currency: 'USD',
    dueDate: '2026-07-25',
  },
  {
    id: 'kb-2',
    title: 'Keyboard Review',
    status: 'Active',
    payout: 2000,
    currency: 'USD',
    dueDate: '2026-08-10',
  },
];

async function renderMilestonesPage() {
  const result = render(<MilestonesPage />);
  await act(async () => {});
  return result;
}

beforeEach(() => {
  // Pin "today" so kb-1 falls inside the due-soon window (7 days).
  jest.useFakeTimers({
    now: new Date('2026-07-22T12:00:00Z'),
    advanceTimers: true,
  });
  mockedListMilestones.mockReturnValue(persisted);
  mockedSaveMilestone.mockImplementation(() => {});
  window.localStorage.clear();
  resetSafeStorageCache();
  mockSearchParams.get.mockReturnValue(null);
  mockSearchParams.toString.mockReturnValue('');
  mockReplace.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
  window.localStorage.clear();
  resetSafeStorageCache();
});

// ---------------------------------------------------------------------------
// Visible focus styles
// ---------------------------------------------------------------------------

describe('milestones keyboard — visible focus styles', () => {
  it('Add Milestone toolbar button exposes focus-visible outline classes', async () => {
    await renderMilestonesPage();

    const addBtn = screen.getByRole('button', { name: /^add milestone$/i });
    FOCUS_OUTLINE.forEach((cls) => expect(addBtn).toHaveClass(cls));
  });

  it('sample banner dismiss × exposes focus-visible outline classes', async () => {
    mockedListMilestones.mockReturnValue([]);
    await renderMilestonesPage();

    const dismiss = screen.getByRole('button', {
      name: /dismiss sample data notice/i,
    });
    FOCUS_OUTLINE.forEach((cls) => expect(dismiss).toHaveClass(cls));
  });

  it('sample banner Start from scratch exposes focus-visible outline classes', async () => {
    mockedListMilestones.mockReturnValue([]);
    await renderMilestonesPage();

    const cta = screen.getByTestId('start-from-scratch-btn');
    FOCUS_OUTLINE.forEach((cls) => expect(cta).toHaveClass(cls));
  });

  it('MilestoneCreationForm Cancel and Submit expose focus-visible outlines', () => {
    render(
      <MilestoneCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />,
    );

    const cancel = screen.getByRole('button', { name: /cancel/i });
    const submit = screen.getByRole('button', { name: /add milestone/i });

    FOCUS_OUTLINE.forEach((cls) => {
      expect(cancel).toHaveClass(cls);
      expect(submit).toHaveClass(cls);
    });
  });

  it('MilestoneFilter option labels expose focus-within ring classes', () => {
    const { container } = render(
      <MilestoneFilter selected="All" onChange={jest.fn()} resultCount={2} />,
    );

    const labels = container.querySelectorAll('label');
    expect(labels.length).toBeGreaterThan(0);
    labels.forEach((label) => {
      expect(label.className).toMatch(/focus-within:ring-2/);
      expect(label.className).toMatch(/focus-within:ring-indigo-500/);
    });
  });

  it('due-soon dismiss and in-list links expose focus-visible ring classes', () => {
    render(<MilestonesList milestones={persisted} />);

    const dismiss = screen.getByRole('button', { name: /dismiss reminder/i });
    expect(dismiss).toHaveClass('focus-visible:ring-2');
    expect(dismiss).toHaveClass('focus-visible:ring-amber-500');
    expect(dismiss.className).not.toMatch(/(?:^|\s)focus:ring-2(?:\s|$)/);

    const link = screen.getByRole('link', { name: /keyboard kickoff/i });
    expect(link).toHaveClass('focus-visible:ring-2');
  });
});

// ---------------------------------------------------------------------------
// Enter / Space activation
// ---------------------------------------------------------------------------

describe('milestones keyboard — Enter/Space activation', () => {
  it('Enter on Add Milestone opens the creation dialog', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderMilestonesPage();

    const addBtn = screen.getByRole('button', { name: /^add milestone$/i });
    addBtn.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Space on Add Milestone opens the creation dialog', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderMilestonesPage();

    const addBtn = screen.getByRole('button', { name: /^add milestone$/i });
    addBtn.focus();
    await user.keyboard('[Space]');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Enter on sample dismiss × hides the banner', async () => {
    mockedListMilestones.mockReturnValue([]);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderMilestonesPage();

    const dismiss = screen.getByRole('button', {
      name: /dismiss sample data notice/i,
    });
    dismiss.focus();
    await user.keyboard('{Enter}');

    expect(screen.queryByTestId('sample-data-banner')).not.toBeInTheDocument();
  });

  it('Space on sample dismiss × hides the banner', async () => {
    mockedListMilestones.mockReturnValue([]);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderMilestonesPage();

    const dismiss = screen.getByRole('button', {
      name: /dismiss sample data notice/i,
    });
    dismiss.focus();
    await user.keyboard('[Space]');

    expect(screen.queryByTestId('sample-data-banner')).not.toBeInTheDocument();
  });

  it('Enter on Cancel closes the creation dialog', async () => {
    const onCancel = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<MilestoneCreationForm onSubmit={jest.fn()} onCancel={onCancel} />);

    const cancel = screen.getByRole('button', { name: /cancel/i });
    cancel.focus();
    await user.keyboard('{Enter}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Space on Cancel closes the creation dialog', async () => {
    const onCancel = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<MilestoneCreationForm onSubmit={jest.fn()} onCancel={onCancel} />);

    const cancel = screen.getByRole('button', { name: /cancel/i });
    cancel.focus();
    await user.keyboard('[Space]');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Space selects a MilestoneFilter radio option', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <MilestoneFilter selected="All" onChange={onChange} resultCount={4} />,
    );

    const pending = screen.getByRole('radio', { name: 'Pending' });
    pending.focus();
    await user.keyboard('[Space]');

    expect(onChange).toHaveBeenCalledWith('Pending');
  });

  it('Enter/Space dismisses the due-soon reminder and moves focus to the list', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { container } = render(<MilestonesList milestones={persisted} />);

    const dismiss = screen.getByRole('button', { name: /dismiss reminder/i });
    dismiss.focus();
    await user.keyboard('{Enter}');

    expect(
      screen.queryByRole('button', { name: /dismiss reminder/i }),
    ).not.toBeInTheDocument();

    const region = container.querySelector('[role="region"]');
    expect(region).toHaveFocus();
  });
});

// ---------------------------------------------------------------------------
// Tab order
// ---------------------------------------------------------------------------

describe('milestones keyboard — logical tab order', () => {
  it('tabs from filter radios to Add Milestone to due-soon controls to scroll region', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { container } = await renderMilestonesPage();

    const allRadio = screen.getByRole('radio', { name: 'All' });
    allRadio.focus();
    expect(allRadio).toHaveFocus();

    // Within a radiogroup only the checked radio is in the tab order;
    // next Tab leaves the group to the sort select, Add Milestone, then links, then dismiss, then scroll region.
    await user.tab();
    expect(screen.getByLabelText(/sort milestones/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: /^add milestone$/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: /switch to compact density/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('link', { name: /keyboard kickoff/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: /dismiss reminder/i })).toHaveFocus();

    await user.tab();
    // After dismiss, focus moves to the next checkbox or the select-all checkbox
    const selectAll = screen.getByLabelText(/select all milestones/i);
    expect(selectAll).toHaveFocus();

    await user.tab();
    const region = container.querySelector('[role="region"]');
    expect(region).toHaveFocus();
  });

  it('creation form action buttons remain in tab order and can receive focus', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <MilestoneCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />,
    );

    const dialog = screen.getByRole('dialog');
    const cancel = within(dialog).getByRole('button', { name: /cancel/i });
    const submit = within(dialog).getByRole('button', { name: /add milestone/i });

    expect(cancel).not.toHaveAttribute('tabindex', '-1');
    expect(submit).not.toHaveAttribute('tabindex', '-1');

    cancel.focus();
    expect(cancel).toHaveFocus();
    await user.tab();
    expect(submit).toHaveFocus();
  });

  it('arrow keys move selection within the MilestoneFilter radiogroup', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <MilestoneFilter selected="All" onChange={onChange} resultCount={3} />,
    );

    screen.getByRole('radio', { name: 'All' }).focus();
    await user.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenCalledWith('Active');
  });
});

// ---------------------------------------------------------------------------
// Axe
// ---------------------------------------------------------------------------

describe('milestones keyboard — axe', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('page with toolbar controls has no axe violations', async () => {
    mockedListMilestones.mockReturnValue(persisted);
    const { container } = render(<MilestonesPage />);
    await act(async () => {});
    expect(await axe(container)).toHaveNoViolations();
  }, 20000);

  it('creation form actions have no axe violations', async () => {
    const { container } = render(
      <MilestoneCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  }, 20000);
});
