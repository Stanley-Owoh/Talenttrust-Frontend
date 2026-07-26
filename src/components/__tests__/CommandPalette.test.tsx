import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import CommandPalette from '../CommandPalette';

expect.extend(toHaveNoViolations);

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

function renderPalette() {
  return render(<CommandPalette />);
}

function openPalette() {
  fireEvent.keyDown(document, { key: 'k', metaKey: true, code: 'KeyK', bubbles: true });
}

beforeAll(() => {
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('CommandPalette — trigger', () => {
  it('renders a visually hidden trigger button', () => {
    renderPalette();
    const trigger = screen.getByRole('button', { name: /open command palette/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger.className).toMatch(/sr-only/);
  });
});

describe('CommandPalette — open / close', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('opens on Meta+K', () => {
    renderPalette();
    openPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeInTheDocument();
    expect(combobox).toHaveFocus();
  });

  it('opens on Ctrl+K', () => {
    renderPalette();
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true, code: 'KeyK', bubbles: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    renderPalette();
    openPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape', bubbles: true });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes when clicking the backdrop', async () => {
    renderPalette();
    openPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeInTheDocument();
    if (backdrop) fireEvent.click(backdrop);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('Meta+K toggles closed when already open', () => {
    renderPalette();
    openPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    openPalette();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('CommandPalette — entries', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists all palette entries when query is empty', () => {
    renderPalette();
    openPalette();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(5);
    expect(screen.getByText('New Contract')).toBeInTheDocument();
    expect(screen.getByText('New Milestone')).toBeInTheDocument();
    expect(screen.getByText('Go to Contracts')).toBeInTheDocument();
    expect(screen.getByText('Go to Milestones')).toBeInTheDocument();
    expect(screen.getByText('Go to Reputation')).toBeInTheDocument();
  });

  it('filters by label text', () => {
    renderPalette();
    openPalette();

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'reputation' } });

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(screen.getByText('Go to Reputation')).toBeInTheDocument();
  });

  it('filters by keyword', () => {
    renderPalette();
    openPalette();

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'agreement' } });

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(screen.getByText('New Contract')).toBeInTheDocument();
  });

  it('shows no results when no match', () => {
    renderPalette();
    openPalette();

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'zzznonexistent' } });

    expect(screen.queryByRole('option')).toBeNull();
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('the forms entries are searchable via the label', () => {
    renderPalette();
    openPalette();

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'New Contract' } });

    expect(screen.getByText('New Contract')).toBeInTheDocument();
    expect(screen.queryByText('New Milestone')).toBeNull();
  });

  it('the forms entries are searchable via the keyword "form"', () => {
    renderPalette();
    openPalette();

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'form' } });

    expect(screen.getByText('New Contract')).toBeInTheDocument();
    expect(screen.getByText('New Milestone')).toBeInTheDocument();
    expect(screen.queryByText('Go to Reputation')).toBeNull();
  });

  it('has no duplicate entries', () => {
    renderPalette();
    openPalette();

    const options = screen.getAllByRole('option');
    const ids = options.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('CommandPalette — navigation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('navigates on click', async () => {
    renderPalette();
    openPalette();

    await userEvent.click(screen.getByText('New Contract'));

    expect(mockPush).toHaveBeenCalledWith('/contracts');
  });

  it('closes after navigation on click', async () => {
    renderPalette();
    openPalette();

    await userEvent.click(screen.getByText('New Contract'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('navigates with Enter on the active item', () => {
    renderPalette();
    openPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Enter', code: 'Enter', bubbles: true });

    expect(mockPush).toHaveBeenCalledWith('/contracts');
  });

  it('navigates to the correct item after arrow down', () => {
    renderPalette();
    openPalette();

    fireEvent.keyDown(document, { key: 'ArrowDown', code: 'ArrowDown', bubbles: true });
    fireEvent.keyDown(document, { key: 'Enter', code: 'Enter', bubbles: true });

    expect(mockPush).toHaveBeenCalledWith('/milestones');
  });

  it('navigates to the correct item after arrow up', () => {
    renderPalette();
    openPalette();

    fireEvent.keyDown(document, { key: 'ArrowUp', code: 'ArrowUp', bubbles: true });
    fireEvent.keyDown(document, { key: 'Enter', code: 'Enter', bubbles: true });

    expect(mockPush).toHaveBeenCalledWith('/reputation');
  });

  it('closes after navigation via Enter', () => {
    renderPalette();
    openPalette();

    fireEvent.keyDown(document, { key: 'Enter', code: 'Enter', bubbles: true });

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('CommandPalette — keyboard navigation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('first item is active by default', () => {
    renderPalette();
    openPalette();

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowDown moves active index forward', () => {
    renderPalette();
    openPalette();

    fireEvent.keyDown(document, { key: 'ArrowDown', code: 'ArrowDown', bubbles: true });

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowDown wraps to first item', () => {
    renderPalette();
    openPalette();

    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(document, { key: 'ArrowDown', code: 'ArrowDown', bubbles: true });
    }

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowUp wraps to last item', () => {
    renderPalette();
    openPalette();

    fireEvent.keyDown(document, { key: 'ArrowUp', code: 'ArrowUp', bubbles: true });

    const options = screen.getAllByRole('option');
    expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true');
  });

  it('mouse hover selects an item', () => {
    renderPalette();
    openPalette();

    fireEvent.mouseEnter(screen.getByText('Go to Reputation'));

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[4]).toHaveAttribute('aria-selected', 'true');
  });
});

describe('CommandPalette — ARIA attributes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('combobox has proper ARIA attributes', () => {
    renderPalette();
    openPalette();

    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    expect(combobox).toHaveAttribute('aria-autocomplete', 'list');
    expect(combobox).toHaveAttribute('aria-controls', 'command-palette-listbox');
  });

  it('listbox has proper role and label', () => {
    renderPalette();
    openPalette();

    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-label', 'Commands');
  });

  it('dialog has proper label', () => {
    renderPalette();
    openPalette();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Command palette');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});

describe('CommandPalette — accessibility', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('has no axe violations when open', async () => {
    const { container } = renderPalette();
    openPalette();

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations when closed', async () => {
    const { container } = renderPalette();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations after filter shows no results', async () => {
    const { container } = renderPalette();
    openPalette();

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'zzznonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('CommandPalette — unmount', () => {
  it('unmounts cleanly without throwing', () => {
    const { unmount } = renderPalette();
    expect(() => unmount()).not.toThrow();
  });

  it('unmounts while open without throwing', () => {
    const { unmount } = renderPalette();
    openPalette();
    expect(() => unmount()).not.toThrow();
  });
});
