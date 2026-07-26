import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import {
  CommandPaletteProvider,
  CommandPalette,
  useRegisterCommandAction,
  useCommandPalette,
  type CommandAction,
} from '../CommandPalette';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Renders a component tree with the provider and palette mounted. */
function renderWithPalette(ui?: React.ReactElement) {
  return render(
    <CommandPaletteProvider>
      {ui}
      <CommandPalette />
    </CommandPaletteProvider>,
  );
}

/** Registers up to three actions using individual hook calls (avoids hook-in-loop). */
function ActionRegistrar({
  actions,
}: {
  actions: CommandAction[];
}): React.JSX.Element {
  useRegisterCommandAction(actions[0]!);
  if (actions.length > 1) {
    useRegisterCommandAction(actions[1]!);
  }
  if (actions.length > 2) {
    useRegisterCommandAction(actions[2]!);
  }
  return <span data-testid="registrar" />;
}

/** Opens the palette via the keyboard shortcut. */
async function openPalette() {
  await act(async () => {
    await userEvent.keyboard('{Meta>}k{/Meta}');
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CommandPalette', () => {
  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------
  describe('action registration', () => {
    it('registers an action and displays it when the palette opens', async () => {
      const onSelect = jest.fn();
      const action: CommandAction = {
        id: 'test-action',
        label: 'Test Action',
        keywords: ['test', 'example'],
        section: 'Tests',
        onSelect,
      };

      renderWithPalette(<ActionRegistrar actions={[action]} />);
      await openPalette();

      expect(screen.getByRole('option', { name: /test action/i })).toBeInTheDocument();
    });

    it('unregisters an action when its component unmounts', async () => {
      const action: CommandAction = {
        id: 'transient',
        label: 'Transient Action',
        keywords: [],
        onSelect: jest.fn(),
      };

      const { unmount } = render(
        <CommandPaletteProvider>
          <ActionRegistrar actions={[action]} />
          <CommandPalette />
        </CommandPaletteProvider>,
      );

      await openPalette();
      expect(screen.getByRole('option', { name: /transient action/i })).toBeInTheDocument();

      // Close palette, unmount registrar, reopen
      await userEvent.keyboard('{Escape}');
      unmount();
      await openPalette();

      expect(screen.queryByRole('option', { name: /transient action/i })).not.toBeInTheDocument();
    });

    it('deduplicates actions by id (last registration wins)', async () => {
      const firstFn = jest.fn();
      const secondFn = jest.fn();

      function DoubleRegistrar() {
        useRegisterCommandAction({
          id: 'dup',
          label: 'First',
          keywords: [],
          onSelect: firstFn,
        });
        useRegisterCommandAction({
          id: 'dup',
          label: 'Second',
          keywords: [],
          onSelect: secondFn,
        });
        return null;
      }

      renderWithPalette(<DoubleRegistrar />);
      await openPalette();

      // Only one entry should appear — the last one registered.
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('Second');

      await userEvent.click(options[0]);
      expect(firstFn).not.toHaveBeenCalled();
      expect(secondFn).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // Activation (opening & closing)
  // -----------------------------------------------------------------------
  describe('activation', () => {
    it('opens on Cmd+K (Meta+K)', async () => {
      renderWithPalette();
      await openPalette();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('opens on Ctrl+K', async () => {
      renderWithPalette();
      await act(async () => {
        await userEvent.keyboard('{Control>}k{/Control}');
      });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes on Escape', async () => {
      renderWithPalette();
      await openPalette();
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes when clicking the backdrop', async () => {
      renderWithPalette();
      await openPalette();

      const backdrop = document.querySelector('.bg-black\\/50');
      expect(backdrop).toBeTruthy();
      await userEvent.click(backdrop!);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('toggles open/closed with Cmd+K', async () => {
      renderWithPalette();
      await openPalette();
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await act(async () => {
        await userEvent.keyboard('{Meta>}k{/Meta}');
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('focuses the search input when opened', async () => {
      renderWithPalette();
      await openPalette();

      const input = screen.getByLabelText('Search command palette');
      expect(input).toHaveFocus();
    });

    it('clears the search query when reopened', async () => {
      renderWithPalette();
      await openPalette();

      const input = screen.getByLabelText('Search command palette');
      await userEvent.type(input, 'test');
      expect(input).toHaveValue('test');

      await userEvent.keyboard('{Escape}');
      await openPalette();
      expect(screen.getByLabelText('Search command palette')).toHaveValue('');
    });
  });

  // -----------------------------------------------------------------------
  // Keyboard navigation
  // -----------------------------------------------------------------------
  describe('keyboard navigation', () => {
    const actions: CommandAction[] = [
      { id: 'a', label: 'Alpha', keywords: [], onSelect: jest.fn() },
      { id: 'b', label: 'Bravo', keywords: [], onSelect: jest.fn() },
      { id: 'c', label: 'Charlie', keywords: [], onSelect: jest.fn() },
    ];

    it('selects the first action by default', async () => {
      renderWithPalette(<ActionRegistrar actions={actions} />);
      await openPalette();

      const first = screen.getByRole('option', { name: 'Alpha' });
      expect(first).toHaveAttribute('aria-selected', 'true');
    });

    it('navigates down through options with ArrowDown', async () => {
      renderWithPalette(<ActionRegistrar actions={actions} />);
      await openPalette();

      await userEvent.keyboard('{ArrowDown}');
      expect(screen.getByRole('option', { name: 'Bravo' })).toHaveAttribute('aria-selected', 'true');

      await userEvent.keyboard('{ArrowDown}');
      expect(screen.getByRole('option', { name: 'Charlie' })).toHaveAttribute('aria-selected', 'true');

      // Wrap around
      await userEvent.keyboard('{ArrowDown}');
      expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true');
    });

    it('navigates up through options with ArrowUp', async () => {
      renderWithPalette(<ActionRegistrar actions={actions} />);
      await openPalette();

      await userEvent.keyboard('{ArrowUp}');
      expect(screen.getByRole('option', { name: 'Charlie' })).toHaveAttribute('aria-selected', 'true');

      await userEvent.keyboard('{ArrowUp}');
      expect(screen.getByRole('option', { name: 'Bravo' })).toHaveAttribute('aria-selected', 'true');
    });

    it('activates the selected action on Enter', async () => {
      renderWithPalette(<ActionRegistrar actions={actions} />);
      await openPalette();

      await userEvent.keyboard('{ArrowDown}'); // Bravo
      await userEvent.keyboard('{Enter}');

      expect(actions[1].onSelect).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does nothing on Enter when no actions match', async () => {
      const onSelect = jest.fn();
      const action: CommandAction = { id: 'only', label: 'Only', keywords: [], onSelect };
      renderWithPalette(<ActionRegistrar actions={[action]} />);
      await openPalette();

      const input = screen.getByLabelText('Search command palette');
      await userEvent.type(input, 'nonexistent');
      await userEvent.keyboard('{Enter}');

      expect(onSelect).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument(); // still open
    });

    it('closes on Escape after interacting with the palette (dialog remains keyboard-operable)', async () => {
      renderWithPalette(<ActionRegistrar actions={actions} />);
      await openPalette();

      // Navigate down a few times to ensure keyboard state is active
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
      // Escape should still close regardless of navigation state
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('retains focus on the input after ArrowDown navigation (aria-activedescendant pattern)', async () => {
      renderWithPalette(<ActionRegistrar actions={actions} />);
      await openPalette();

      // Arrow navigation changes aria-activedescendant but doesn't move DOM focus
      await userEvent.keyboard('{ArrowDown}');
      expect(screen.getByLabelText('Search command palette')).toHaveFocus();
    });
  });

  // -----------------------------------------------------------------------
  // Search / filtering
  // -----------------------------------------------------------------------
  describe('search filtering', () => {
    const actions: CommandAction[] = [
      { id: 'settings', label: 'Open Settings', keywords: ['preferences', 'theme', 'config'], onSelect: jest.fn() },
      { id: 'contract', label: 'Create Contract', keywords: ['new', 'escrow'], onSelect: jest.fn() },
      { id: 'milestone', label: 'Add Milestone', keywords: ['new', 'deliverable'], onSelect: jest.fn() },
    ];

    it('filters actions by label text', async () => {
      renderWithPalette(<ActionRegistrar actions={actions} />);
      await openPalette();

      const input = screen.getByLabelText('Search command palette');
      await userEvent.type(input, 'contract');

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('Create Contract');
    });

    it('filters actions by keywords', async () => {
      renderWithPalette(<ActionRegistrar actions={actions} />);
      await openPalette();

      const input = screen.getByLabelText('Search command palette');
      await userEvent.type(input, 'preferences');

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('Open Settings');
    });

    it('shows "No matching actions" when nothing matches', async () => {
      renderWithPalette(<ActionRegistrar actions={actions} />);
      await openPalette();

      const input = screen.getByLabelText('Search command palette');
      await userEvent.type(input, 'zzzzyyyyxxx');

      expect(screen.getByText('No matching actions found.')).toBeInTheDocument();
    });

    it('shows all actions when query is empty', async () => {
      renderWithPalette(<ActionRegistrar actions={actions} />);
      await openPalette();

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
    });

    it('filters case-insensitively', async () => {
      renderWithPalette(<ActionRegistrar actions={actions} />);
      await openPalette();

      const input = screen.getByLabelText('Search command palette');
      await userEvent.type(input, 'SETTINGS');

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('Open Settings');
    });

    it('searches with multiple space-separated tokens (AND logic)', async () => {
      renderWithPalette(<ActionRegistrar actions={actions} />);
      await openPalette();

      const input = screen.getByLabelText('Search command palette');
      await userEvent.type(input, 'new escrow');

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('Create Contract');
    });
  });

  // -----------------------------------------------------------------------
  // Action selection via click
  // -----------------------------------------------------------------------
  describe('click selection', () => {
    it('invokes onSelect and closes palette when an option is clicked', async () => {
      const onSelect = jest.fn();
      const action: CommandAction = { id: 'click-test', label: 'Click Me', keywords: [], onSelect };
      renderWithPalette(<ActionRegistrar actions={[action]} />);
      await openPalette();

      await userEvent.click(screen.getByRole('option', { name: 'Click Me' }));
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('selects action on mouse hover', async () => {
      const actionsHover: CommandAction[] = [
        { id: 'hover-a', label: 'A', keywords: [], onSelect: jest.fn() },
        { id: 'hover-b', label: 'B', keywords: [], onSelect: jest.fn() },
      ];
      renderWithPalette(<ActionRegistrar actions={actionsHover} />);
      await openPalette();

      await userEvent.hover(screen.getByRole('option', { name: 'B' }));
      expect(screen.getByRole('option', { name: 'B' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('option', { name: 'A' })).toHaveAttribute('aria-selected', 'false');
    });
  });

  // -----------------------------------------------------------------------
  // Section grouping
  // -----------------------------------------------------------------------
  describe('section grouping', () => {
    it('groups actions by section', async () => {
      const actionsGrouped: CommandAction[] = [
        { id: 'd1', label: 'Dialog One', keywords: [], section: 'Dialogs', onSelect: jest.fn() },
        { id: 'n1', label: 'Nav One', keywords: [], section: 'Navigation', onSelect: jest.fn() },
        { id: 'd2', label: 'Dialog Two', keywords: [], section: 'Dialogs', onSelect: jest.fn() },
      ];

      renderWithPalette(<ActionRegistrar actions={actionsGrouped} />);
      await openPalette();

      // Section headers should be visible (using text content because they have role="presentation")
      expect(screen.getByText('Dialogs')).toBeInTheDocument();
      expect(screen.getByText('Navigation')).toBeInTheDocument();
    });

    it('assigns default section "Actions" when section is undefined', async () => {
      const action: CommandAction = { id: 'no-section', label: 'No Section', keywords: [], onSelect: jest.fn() };
      renderWithPalette(<ActionRegistrar actions={[action]} />);
      await openPalette();

      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Action count footer
  // -----------------------------------------------------------------------
  describe('footer', () => {
    it('displays the correct action count', async () => {
      const actionsFooter: CommandAction[] = [
        { id: 'f1', label: 'One', keywords: [], onSelect: jest.fn() },
        { id: 'f2', label: 'Two', keywords: [], onSelect: jest.fn() },
      ];
      renderWithPalette(<ActionRegistrar actions={actionsFooter} />);
      await openPalette();

      expect(screen.getByText('2 actions')).toBeInTheDocument();
    });

    it('displays singular "action" when exactly one', async () => {
      const action: CommandAction = { id: 'single', label: 'Only', keywords: [], onSelect: jest.fn() };
      renderWithPalette(<ActionRegistrar actions={[action]} />);
      await openPalette();

      expect(screen.getByText('1 action')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // useCommandPalette hook
  // -----------------------------------------------------------------------
  describe('useCommandPalette hook', () => {
    it('throws when used outside provider', () => {
      // Suppress console.error for the expected error boundary
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      function BadComponent() {
        useCommandPalette();
        return null;
      }

      expect(() => render(<BadComponent />)).toThrow(
        'useCommandPalette must be used within a <CommandPaletteProvider>',
      );

      spy.mockRestore();
    });

    it('returns the context when used inside provider', () => {
      function GoodComponent() {
        const ctx = useCommandPalette();
        expect(ctx).toBeDefined();
        expect(typeof ctx.registerAction).toBe('function');
        expect(typeof ctx.setIsOpen).toBe('function');
        return <span data-testid="good" />;
      }

      renderWithPalette(<GoodComponent />);
      expect(screen.getByTestId('good')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe('edge cases', () => {
    it('renders nothing when closed', () => {
      renderWithPalette();
      // Dialog should not be in the DOM when closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('works with zero registered actions', async () => {
      renderWithPalette();
      await openPalette();

      expect(screen.getByText('No matching actions found.')).toBeInTheDocument();
    });

    it('empty keywords array is handled gracefully', async () => {
      const action: CommandAction = { id: 'no-kw', label: 'No Keywords', keywords: [], onSelect: jest.fn() };
      renderWithPalette(<ActionRegistrar actions={[action]} />);
      await openPalette();

      expect(screen.getByRole('option', { name: /no keywords/i })).toBeInTheDocument();
    });

    it('keyword display does not error with empty keywords', async () => {
      const action: CommandAction = { id: 'empty-kw', label: 'Empty KW', keywords: [], onSelect: jest.fn() };
      renderWithPalette(<ActionRegistrar actions={[action]} />);
      await openPalette();

      // Should render without error — just checking no crash
      expect(screen.getByRole('option', { name: /empty kw/i })).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Accessibility
  // -----------------------------------------------------------------------
  describe('accessibility', () => {
    it('has no axe violations when open', async () => {
      const action: CommandAction = { id: 'a11y', label: 'A11y Action', keywords: ['accessible'], onSelect: jest.fn() };
      const { container } = renderWithPalette(<ActionRegistrar actions={[action]} />);
      await openPalette();

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('has dialog role and aria-modal', async () => {
      const action: CommandAction = { id: 'modal-test', label: 'Modal', keywords: [], onSelect: jest.fn() };
      renderWithPalette(<ActionRegistrar actions={[action]} />);
      await openPalette();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', 'Command palette');
    });

    it('search input has aria-controls pointing to the listbox', async () => {
      const action: CommandAction = { id: 'aria-test', label: 'ARIA', keywords: [], onSelect: jest.fn() };
      renderWithPalette(<ActionRegistrar actions={[action]} />);
      await openPalette();

      const input = screen.getByLabelText('Search command palette');
      const listbox = screen.getByRole('listbox');
      expect(input).toHaveAttribute('aria-controls', listbox.id);
    });

    it('listbox has an accessible name', async () => {
      const action: CommandAction = { id: 'listbox-name', label: 'Listbox', keywords: [], onSelect: jest.fn() };
      renderWithPalette(<ActionRegistrar actions={[action]} />);
      await openPalette();

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-label', 'Command palette actions');
    });

    it('selected option has aria-selected="true"', async () => {
      const action: CommandAction = { id: 'sel', label: 'Selected', keywords: [], onSelect: jest.fn() };
      renderWithPalette(<ActionRegistrar actions={[action]} />);
      await openPalette();

      expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true');
    });

    it('input has aria-activedescendant pointing to selected option', async () => {
      const actionsAct: CommandAction[] = [
        { id: 'first', label: 'First', keywords: [], onSelect: jest.fn() },
        { id: 'second', label: 'Second', keywords: [], onSelect: jest.fn() },
      ];
      renderWithPalette(<ActionRegistrar actions={actionsAct} />);
      await openPalette();

      const input = screen.getByLabelText('Search command palette');
      const firstOption = screen.getByRole('option', { name: 'First' });
      expect(input).toHaveAttribute('aria-activedescendant', firstOption.id);
    });

    it('options have tabIndex={-1} so focus stays on the input', async () => {
      const action: CommandAction = { id: 'tab-idx', label: 'Tab Index', keywords: [], onSelect: jest.fn() };
      renderWithPalette(<ActionRegistrar actions={[action]} />);
      await openPalette();

      const option = screen.getByRole('option', { name: 'Tab Index' });
      expect(option).toHaveAttribute('tabindex', '-1');
    });
  });
});
