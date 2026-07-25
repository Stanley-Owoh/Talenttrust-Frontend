import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '../CommandPalette';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn((...args) => mockPush(...args)), replace: jest.fn(), prefetch: jest.fn() }),
}));

beforeEach(() => {
  mockPush.mockClear();
});

function openPalette() {
  fireEvent.keyDown(document, { key: 'k', metaKey: true });
}

describe('CommandPalette', () => {
  describe('shortcut', () => {
    it('opens on Cmd+K', () => {
      render(<CommandPalette />);
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
      expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    });

    it('opens on Ctrl+K', () => {
      render(<CommandPalette />);
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
      expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    });

    it('does not open on plain K', () => {
      render(<CommandPalette />);
      fireEvent.keyDown(document, { key: 'k' });
      expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();
    });

    it('does not open while typing in an input', () => {
      render(
        <div>
          <input placeholder="Type here" />
          <CommandPalette />
        </div>,
      );
      const input = screen.getByPlaceholderText('Type here');
      fireEvent.keyDown(input, { key: 'k', metaKey: true });
      expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();
    });

    it('does not open while typing in a contenteditable', () => {
      render(
        <div>
          <div contentEditable role="textbox" />
          <CommandPalette />
        </div>,
      );
      const editable = screen.getByRole('textbox');
      fireEvent.keyDown(editable, { key: 'k', metaKey: true });
      expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('shows all entries when query is empty', () => {
      render(<CommandPalette />);
      openPalette();
      expect(screen.getByRole('option', { name: /Home/ })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Contracts/ })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Milestones/ })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Reputation/ })).toBeInTheDocument();
    });

    it('filters by label prefix', () => {
      render(<CommandPalette />);
      openPalette();
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'con' } });
      expect(screen.getByRole('option', { name: /Contracts/ })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Home/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Milestones/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Reputation/ })).not.toBeInTheDocument();
    });

    it('filters by label substring', () => {
      render(<CommandPalette />);
      openPalette();
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'put' } });
      expect(screen.getByRole('option', { name: /Reputation/ })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Contracts/ })).not.toBeInTheDocument();
    });

    it('filters by keyword match', () => {
      render(<CommandPalette />);
      openPalette();
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'trust' } });
      expect(screen.getByRole('option', { name: /Reputation/ })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Contracts/ })).not.toBeInTheDocument();
    });

    it('shows no results for an unmatched query', () => {
      render(<CommandPalette />);
      openPalette();
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'xyzzy' } });
      expect(screen.getByText('No results')).toBeInTheDocument();
    });

    it('returns a single result for an overlapping query (no duplicates)', () => {
      render(<CommandPalette />);
      openPalette();
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'home' } });
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('Home');
    });
  });

  describe('activation', () => {
    it('navigates on Enter and closes', async () => {
      const user = userEvent.setup();
      render(<CommandPalette />);
      openPalette();
      await user.type(screen.getByRole('combobox'), 'mil');
      await user.keyboard('{Enter}');
      expect(mockPush).toHaveBeenCalledWith('/milestones');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('navigates on click and closes', async () => {
      const user = userEvent.setup();
      render(<CommandPalette />);
      openPalette();
      await user.click(screen.getByRole('option', { name: /Reputation/ }));
      expect(mockPush).toHaveBeenCalledWith('/reputation');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('closes on Escape', () => {
      render(<CommandPalette />);
      openPalette();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('cycles with ArrowDown and ArrowUp', () => {
      render(<CommandPalette />);
      openPalette();
      const combobox = screen.getByRole('combobox');

      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      expect(screen.getByRole('option', { name: /Contracts/ })).toHaveAttribute('aria-selected', 'true');

      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      expect(screen.getByRole('option', { name: /Milestones/ })).toHaveAttribute('aria-selected', 'true');

      fireEvent.keyDown(combobox, { key: 'ArrowUp' });
      expect(screen.getByRole('option', { name: /Contracts/ })).toHaveAttribute('aria-selected', 'true');
    });

    it('combined flow: open → type → ArrowDown → Enter navigates highlighted item', async () => {
      const user = userEvent.setup();
      render(<CommandPalette />);
      openPalette();

      const combobox = screen.getByRole('combobox');
      await user.type(combobox, 'rep');

      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      await user.keyboard('{Enter}');

      expect(mockPush).toHaveBeenCalledWith('/reputation');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('focus', () => {
    it('focuses the search input when opened', () => {
      render(<CommandPalette />);
      openPalette();
      expect(screen.getByRole('combobox')).toHaveFocus();
    });

    it('restores focus to the trigger element after closing', () => {
      render(
        <div>
          <button type="button">Trigger</button>
          <CommandPalette />
        </div>,
      );
      const trigger = screen.getByRole('button', { name: 'Trigger' });
      trigger.focus();
      openPalette();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(trigger).toHaveFocus();
    });
  });
});
