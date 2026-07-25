/**
 * @file CommandPalette.test.tsx
 *
 * Comprehensive test suite for the CommandPalette component.
 *
 * Coverage targets:
 *  1. Global keyboard shortcut (Cmd+K / Ctrl+K) opens the palette.
 *  2. Escape closes the palette and restores focus.
 *  3. ARIA combobox / listbox roles and attributes.
 *  4. Arrow-key navigation through route options.
 *  5. Enter selects the active route and navigates.
 *  6. Fuzzy filtering matches routes and keywords.
 *  7. Mouse hover updates the active index.
 *  8. Backdrop click closes the palette.
 *  9. Reduced-motion preference disables transition animation.
 * 10. Focus management: input receives focus on open, trigger regains focus on close.
 * 11. Accessibility: jest-axe audit passes.
 */

import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import CommandPalette from '../CommandPalette';

expect.extend(toHaveNoViolations);

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: jest.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fire the platform-appropriate shortcut. Uses CtrlKey since jsdom is not Mac. */
const openPalette = () => {
  fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
};

const closePalette = () => {
  fireEvent.keyDown(document, { key: 'Escape' });
};

// ---------------------------------------------------------------------------
// Suite 1 — Open / close via keyboard shortcut
// ---------------------------------------------------------------------------

describe('CommandPalette — open/close', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders nothing initially', () => {
    render(<CommandPalette />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on Ctrl+K', () => {
    render(<CommandPalette />);
    openPalette();
    expect(screen.getByRole('dialog', { name: /command palette/i })).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<CommandPalette />);
    openPalette();
    closePalette();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('toggles open/closed on repeated Ctrl+K', () => {
    render(<CommandPalette />);
    openPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    openPalette();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    openPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Search input
// ---------------------------------------------------------------------------

describe('CommandPalette — search input', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders a combobox input with placeholder', () => {
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole('combobox', { name: /search routes/i });
    expect(input).toHaveAttribute('placeholder', 'Search routes...');
  });

  it('input receives focus on open', async () => {
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole('combobox', { name: /search routes/i });
    await waitFor(() => expect(input).toHaveFocus());
  });

  it('has aria-expanded="true" and aria-controls pointing to the listbox', () => {
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole('combobox', { name: /search routes/i });
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls');
  });

  it('has aria-autocomplete="list"', () => {
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole('combobox', { name: /search routes/i });
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — Route list rendering
// ---------------------------------------------------------------------------

describe('CommandPalette — route list', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('lists all three routes by default', () => {
    render(<CommandPalette />);
    openPalette();
    const listbox = screen.getByRole('listbox', { name: /navigation routes/i });
    expect(within(listbox).getByRole('option', { name: /contracts/i })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: /milestones/i })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: /reputation/i })).toBeInTheDocument();
  });

  it('shows the href for each route', () => {
    render(<CommandPalette />);
    openPalette();
    expect(screen.getByText('/contracts')).toBeInTheDocument();
    expect(screen.getByText('/milestones')).toBeInTheDocument();
    expect(screen.getByText('/reputation')).toBeInTheDocument();
  });

  it('first option is aria-selected by default', () => {
    render(<CommandPalette />);
    openPalette();
    const listbox = screen.getByRole('listbox', { name: /navigation routes/i });
    const options = within(listbox).getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
    expect(options[2]).toHaveAttribute('aria-selected', 'false');
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — Arrow key navigation
// ---------------------------------------------------------------------------

describe('CommandPalette — arrow key navigation', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('ArrowDown moves selection to the next option', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole('combobox', { name: /search routes/i });

    await user.click(input);
    await user.keyboard('{ArrowDown}');

    const listbox = screen.getByRole('listbox', { name: /navigation routes/i });
    const options = within(listbox).getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowUp moves selection to the previous option', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole('combobox', { name: /search routes/i });

    await user.click(input);
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowUp}');

    const listbox = screen.getByRole('listbox', { name: /navigation routes/i });
    const options = within(listbox).getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowDown wraps from last to first', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole('combobox', { name: /search routes/i });

    await user.click(input);
    // Navigate to last option
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    // Wrap to first
    await user.keyboard('{ArrowDown}');

    const listbox = screen.getByRole('listbox', { name: /navigation routes/i });
    const options = within(listbox).getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowUp wraps from first to last', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole('combobox', { name: /search routes/i });

    await user.click(input);
    await user.keyboard('{ArrowUp}');

    const listbox = screen.getByRole('listbox', { name: /navigation routes/i });
    const options = within(listbox).getAllByRole('option');
    expect(options[2]).toHaveAttribute('aria-selected', 'true');
  });

  it('aria-activedescendant updates as arrow keys are pressed', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole('combobox', { name: /search routes/i });

    await user.click(input);
    await user.keyboard('{ArrowDown}');

    expect(input).toHaveAttribute('aria-activedescendant');
    const activedescendant = input.getAttribute('aria-activedescendant');
    const listbox = screen.getByRole('listbox', { name: /navigation routes/i });
    const options = within(listbox).getAllByRole('option');
    expect(activedescendant).toBe(options[1].id);
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — Enter to navigate
// ---------------------------------------------------------------------------

describe('CommandPalette — Enter navigation', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('Enter navigates to the active route', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole('combobox', { name: /search routes/i });

    await user.click(input);
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(mockPush).toHaveBeenCalledWith('/milestones');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Enter navigates to the first route by default', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole('combobox', { name: /search routes/i });

    await user.click(input);
    await user.keyboard('{Enter}');

    expect(mockPush).toHaveBeenCalledWith('/contracts');
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — Fuzzy filtering
// ---------------------------------------------------------------------------

describe('CommandPalette — fuzzy filtering', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('filters routes by label substring', () => {
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole('combobox', { name: /search routes/i });

    fireEvent.change(input, { target: { value: 'mile' } });

    const listbox = screen.getByRole('listbox', { name: /navigation routes/i });
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Milestones');
  });

  it('filters routes by keyword', () => {
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole('combobox', { name: /search routes/i });

    fireEvent.change(input, { target: { value: 'escrow' } });

    const listbox = screen.getByRole('listbox', { name: /navigation routes/i });
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Contracts');
  });

  it('shows "No routes found" when nothing matches', () => {
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole('combobox', { name: /search routes/i });

    fireEvent.change(input, { target: { value: 'xyz123' } });

    expect(screen.getByText('No routes found.')).toBeInTheDocument();
  });

  it('fuzzy match works with non-contiguous characters', () => {
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole('combobox', { name: /search routes/i });

    // "Ctr" matches "Contracts" (C, t, r in order)
    fireEvent.change(input, { target: { value: 'ctr' } });

    const listbox = screen.getByRole('listbox', { name: /navigation routes/i });
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Contracts');
  });

  it('filtering is case-insensitive', () => {
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole('combobox', { name: /search routes/i });

    fireEvent.change(input, { target: { value: 'REPUTATION' } });

    const listbox = screen.getByRole('listbox', { name: /navigation routes/i });
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Reputation');
  });

  it('empty query shows all routes', () => {
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole('combobox', { name: /search routes/i });

    fireEvent.change(input, { target: { value: 'mile' } });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '' } });
    const listbox = screen.getByRole('listbox', { name: /navigation routes/i });
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — Mouse interaction
// ---------------------------------------------------------------------------

describe('CommandPalette — mouse interaction', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('hovering an option updates the active selection', () => {
    render(<CommandPalette />);
    openPalette();

    const listbox = screen.getByRole('listbox', { name: /navigation routes/i });
    const options = within(listbox).getAllByRole('option');

    fireEvent.mouseEnter(options[2]);

    expect(options[2]).toHaveAttribute('aria-selected', 'true');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
  });

  it('clicking an option navigates and closes', () => {
    render(<CommandPalette />);
    openPalette();

    const listbox = screen.getByRole('listbox', { name: /navigation routes/i });
    const reputation = within(listbox).getByRole('option', { name: /reputation/i });

    fireEvent.click(reputation);

    expect(mockPush).toHaveBeenCalledWith('/reputation');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clicking the backdrop closes the palette', () => {
    render(<CommandPalette />);
    openPalette();

    // The backdrop is the first element with aria-hidden="true"
    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop!);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Suite 8 — Reduced motion
// ---------------------------------------------------------------------------

describe('CommandPalette — reduced motion', () => {
  it('does not apply animation classes when prefers-reduced-motion is reduce', () => {
    const useMediaQuery = require('@/hooks/useMediaQuery').useMediaQuery;
    useMediaQuery.mockReturnValue(true);

    render(<CommandPalette />);
    openPalette();

    const panel = screen.getByRole('dialog').querySelector('.max-w-lg');
    expect(panel?.className).not.toContain('animate-in');
  });

  it('applies animation classes when reduced motion is not preferred', () => {
    const useMediaQuery = require('@/hooks/useMediaQuery').useMediaQuery;
    useMediaQuery.mockReturnValue(false);

    render(<CommandPalette />);
    openPalette();

    const panel = screen.getByRole('dialog').querySelector('.max-w-lg');
    expect(panel?.className).toContain('animate-in');
  });
});

// ---------------------------------------------------------------------------
// Suite 9 — Focus management
// ---------------------------------------------------------------------------

describe('CommandPalette — focus management', () => {
  it('restores focus to the previously focused element on close', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button" data-testid="trigger">
          Open
        </button>
        <CommandPalette />
      </>,
    );

    const trigger = screen.getByTestId('trigger');
    trigger.focus();

    // Open via keyboard
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    // Input should be focused now (after rAF flush)
    const input = screen.getByRole('combobox', { name: /search routes/i });
    await waitFor(() => expect(input).toHaveFocus());

    // Close
    await user.keyboard('{Escape}');

    // Focus should return to trigger
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});

// ---------------------------------------------------------------------------
// Suite 10 — Keyboard hint footer
// ---------------------------------------------------------------------------

describe('CommandPalette — footer hints', () => {
  it('displays keyboard hints', () => {
    render(<CommandPalette />);
    openPalette();

    expect(screen.getByText('Navigate with ↑↓')).toBeInTheDocument();
    expect(screen.getByText('↵ Open')).toBeInTheDocument();
    expect(screen.getByText('Esc Close')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Suite 11 — Accessibility (jest-axe)
// ---------------------------------------------------------------------------

describe('CommandPalette — accessibility', () => {
  it('has no axe violations when open', async () => {
    const { container } = render(<CommandPalette />);
    openPalette();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations when open with filtered results', async () => {
    const { container } = render(<CommandPalette />);
    openPalette();

    const input = screen.getByRole('combobox', { name: /search routes/i });
    fireEvent.change(input, { target: { value: 'mile' } });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// Suite 12 — Unmount
// ---------------------------------------------------------------------------

describe('CommandPalette — unmount', () => {
  it('unmounts cleanly while open', () => {
    const { unmount } = render(<CommandPalette />);
    openPalette();
    expect(() => unmount()).not.toThrow();
  });

  it('unmounts cleanly while closed', () => {
    const { unmount } = render(<CommandPalette />);
    expect(() => unmount()).not.toThrow();
  });
});
