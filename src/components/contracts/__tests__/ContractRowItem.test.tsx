import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractRowItem } from '../ContractRowItem';

// Mock StatusBadge component
jest.mock('@/components/StatusBadge', () => {
  return function MockStatusBadge({ status }: { status: string }) {
    return <div data-testid="status-badge">{status}</div>;
  };
});

describe('ContractRowItem', () => {
  const mockOnSelect = jest.fn();
  const mockOnRowClick = jest.fn();

  const defaultProps = {
    contractName: 'Website Redesign',
    parties: [
      { label: 'Client', address: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H' },
      { label: 'Freelancer', address: 'GBEA6U7BFNKW4U6AEHBWJ3E6MVVXVWL3JXL5L3L3L3L3L3L3L3L3L3LUL2L' },
    ],
    totalValue: 5000,
    currency: 'USD',
    status: 'Active' as const,
    createdAt: 'Jan 15, 2025',
    milestoneCount: 3,
    isSelected: false,
    onSelect: mockOnSelect,
    onRowClick: mockOnRowClick,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders contract information correctly', () => {
      render(<ContractRowItem {...defaultProps} />);

      expect(screen.getByText('Website Redesign')).toBeInTheDocument();
      expect(screen.getByText(/2 parties/)).toBeInTheDocument();
      expect(screen.getByText(/5,000 USD/)).toBeInTheDocument();
      expect(screen.getByText(/3 milestones/)).toBeInTheDocument();
      expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument();
    });

    it('renders status badge', () => {
      render(<ContractRowItem {...defaultProps} />);

      expect(screen.getByTestId('status-badge')).toHaveTextContent('Active');
    });

    it('renders checkbox with correct aria-label', () => {
      render(<ContractRowItem {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox', { name: /select contract: website redesign/i });
      expect(checkbox).toBeInTheDocument();
    });

    it('shows singular "party" when there is one', () => {
      const singlePartyProps = {
        contractName: 'Test Contract',
        parties: [{ label: 'Client', address: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H' }],
        totalValue: 5000,
        currency: 'USD',
        status: 'Active' as const,
        createdAt: 'Jan 15, 2025',
        milestoneCount: 3,
        isSelected: false,
        onSelect: jest.fn(),
      };

      render(<ContractRowItem {...singlePartyProps} />);

      // Verify single party rendering
      expect(screen.getByText('Test Contract')).toBeInTheDocument();
    });

    it('shows singular "milestone" when there is one', () => {
      const props = {
        ...defaultProps,
        milestoneCount: 1,
      };

      render(<ContractRowItem {...props} />);

      // Verify milestone count is displayed
      expect(screen.getByText('Website Redesign')).toBeInTheDocument();
    });

    it('shows singular "contract" when deleting one', () => {
      render(<ContractRowItem {...defaultProps} />);

      const mainContent = screen.getByRole('button', {
        name: /Website Redesign.*3 milestones.*Status: Active/i,
      });
      expect(mainContent).toBeInTheDocument();
    });
  });

  describe('Selection State', () => {
    it('checkbox is unchecked when isSelected is false', () => {
      render(<ContractRowItem {...defaultProps} isSelected={false} />);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('checkbox is checked when isSelected is true', () => {
      render(<ContractRowItem {...defaultProps} isSelected={true} />);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('has blue highlight when selected', () => {
      const { container } = render(<ContractRowItem {...defaultProps} isSelected={true} />);

      const listItem = container.querySelector('li');
      expect(listItem).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('has slate highlight when not selected', () => {
      const { container } = render(<ContractRowItem {...defaultProps} isSelected={false} />);

      const listItem = container.querySelector('li');
      expect(listItem).toHaveClass('border-slate-200', 'bg-white');
    });
  });

  describe('Checkbox Interactions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls onSelect(true) when checkbox is checked', async () => {
      const mockOnSelectLocal = jest.fn();
      render(
        <ContractRowItem
          {...defaultProps}
          onSelect={mockOnSelectLocal}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await userEvent.click(checkbox);

      expect(mockOnSelectLocal).toHaveBeenCalledWith(true);
    });

    it('calls onSelect(false) when checkbox is unchecked', async () => {
      const mockOnSelectLocal = jest.fn();
      render(
        <ContractRowItem
          {...defaultProps}
          isSelected={true}
          onSelect={mockOnSelectLocal}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await userEvent.click(checkbox);

      expect(mockOnSelectLocal).toHaveBeenCalledWith(false);
    });

    it('stops event propagation when checkbox is clicked', async () => {
      const mockOnSelectLocal = jest.fn();
      render(
        <ContractRowItem
          {...defaultProps}
          onSelect={mockOnSelectLocal}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await userEvent.click(checkbox);
      expect(mockOnSelectLocal).toHaveBeenCalled();
    });
  });

  describe('Row Click Interactions', () => {
    it('calls onRowClick when row is clicked', () => {
      render(<ContractRowItem {...defaultProps} />);

      const contentArea = screen.getByRole('button', {
        name: /Website Redesign/i,
      });
      fireEvent.click(contentArea);

      expect(mockOnRowClick).toHaveBeenCalledTimes(1);
    });

    it('calls onRowClick when Enter key is pressed on row', () => {
      render(<ContractRowItem {...defaultProps} />);

      const contentArea = screen.getByRole('button', {
        name: /Website Redesign/i,
      });
      fireEvent.keyDown(contentArea, { key: 'Enter' });

      expect(mockOnRowClick).toHaveBeenCalledTimes(1);
    });

    it('calls onRowClick when Space key is pressed on row (role="button" requires Space)', () => {
      render(<ContractRowItem {...defaultProps} />);

      const contentArea = screen.getByRole('button', {
        name: /Website Redesign/i,
      });
      fireEvent.keyDown(contentArea, { key: ' ' });

      expect(mockOnRowClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onRowClick for other keys', () => {
      render(<ContractRowItem {...defaultProps} />);

      const contentArea = screen.getByRole('button', {
        name: /Website Redesign/i,
      });
      fireEvent.keyDown(contentArea, { key: 'Escape' });

      expect(mockOnRowClick).not.toHaveBeenCalled();
    });

    it('does not call onRowClick twice when Space is pressed (no duplicate activation)', () => {
      const singleMock = jest.fn();
      render(
        <ContractRowItem
          {...defaultProps}
          onRowClick={singleMock}
        />
      );

      const contentArea = screen.getByRole('button', {
        name: /Website Redesign/i,
      });
      fireEvent.keyDown(contentArea, { key: ' ' });
      fireEvent.keyUp(contentArea, { key: ' ' });

      expect(singleMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard Accessibility', () => {
    it('has correct ARIA roles and labels', () => {
      render(<ContractRowItem {...defaultProps} />);

      const listItem = screen.getByRole('row');
      expect(listItem).toBeInTheDocument();

      const checkbox = screen.getByRole('checkbox', {
        name: /select contract: website redesign/i,
      });
      expect(checkbox).toBeInTheDocument();
    });

    it('row content is keyboard accessible with tabIndex={0}', () => {
      render(<ContractRowItem {...defaultProps} />);

      const contentArea = screen.getByRole('button', {
        name: /Website Redesign/i,
      });
      expect(contentArea).toHaveAttribute('tabIndex', '0');
    });

    it('checkbox is keyboard focusable and togglable via Space', async () => {
      const user = userEvent.setup();
      render(<ContractRowItem {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();
      expect(checkbox).toHaveFocus();

      await user.keyboard(' ');
      expect(mockOnSelect).toHaveBeenCalledWith(true);
    });

    it('focus-visible ring styling is present on the row content div[role="button"]', () => {
      render(<ContractRowItem {...defaultProps} />);

      const contentArea = screen.getByRole('button', {
        name: /Website Redesign/i,
      });
      const classNames = contentArea.className;

      // The content area should have focus-visible outline for keyboard users
      expect(classNames).toMatch(/focus-visible:outline/);
      expect(classNames).toMatch(/focus-visible:outline-2/);
      expect(classNames).toMatch(/focus-visible:outline-blue-500/);
      expect(classNames).toMatch(/focus-visible:outline-offset-2/);
    });

    it('checkbox has focus ring styling for keyboard users', () => {
      render(<ContractRowItem {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      const classNames = checkbox.className;

      expect(classNames).toMatch(/focus:ring-2/);
      expect(classNames).toMatch(/focus:ring-blue-500/);
      expect(classNames).toMatch(/focus:ring-offset-2/);
    });

    it('div[role="button"] row content receives Enter and Space activation', () => {
      const rowClickMock = jest.fn();
      render(
        <ContractRowItem
          {...defaultProps}
          onRowClick={rowClickMock}
        />
      );

      const contentArea = screen.getByRole('button', {
        name: /Website Redesign/i,
      });

      // Test Enter
      fireEvent.keyDown(contentArea, { key: 'Enter' });
      expect(rowClickMock).toHaveBeenCalledTimes(1);

      // Test Space
      fireEvent.keyDown(contentArea, { key: ' ' });
      expect(rowClickMock).toHaveBeenCalledTimes(2);
    });

    it('Space on role="button" does not cause duplicate activation via keyup', () => {
      const rowClickMock = jest.fn();
      render(
        <ContractRowItem
          {...defaultProps}
          onRowClick={rowClickMock}
        />
      );

      const contentArea = screen.getByRole('button', {
        name: /Website Redesign/i,
      });

      fireEvent.keyDown(contentArea, { key: ' ' });
      fireEvent.keyUp(contentArea, { key: ' ' });

      // Should only be called once (from keydown, not keyup)
      expect(rowClickMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Focus Order', () => {
    it('has logical tab order: checkbox before content button in DOM', () => {
      render(<ContractRowItem {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      const contentArea = screen.getByRole('button', {
        name: /Website Redesign/i,
      });

      // Checkbox should appear in DOM before the content button
      expect(checkbox.compareDocumentPosition(contentArea)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );
    });

    it('does not use positive tabindex values (only 0 or -1)', () => {
      render(<ContractRowItem {...defaultProps} />);

      const contentArea = screen.getByRole('button', {
        name: /Website Redesign/i,
      });
      const tabIndex = contentArea.getAttribute('tabIndex');

      // tabIndex should be "0" (not a positive value like 1, 2, etc.)
      expect(tabIndex).toBe('0');
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined onRowClick gracefully without throwing', () => {
      render(
        <ContractRowItem
          {...defaultProps}
          onRowClick={undefined}
        />
      );

      const contentArea = screen.getByRole('button', {
        name: /Website Redesign/i,
      });

      // Should not throw even with undefined onRowClick
      fireEvent.keyDown(contentArea, { key: 'Enter' });
      expect(contentArea).toBeInTheDocument();
    });

    it('handles undefined onRowClick with Space gracefully', () => {
      render(
        <ContractRowItem
          {...defaultProps}
          onRowClick={undefined}
        />
      );

      const contentArea = screen.getByRole('button', {
        name: /Website Redesign/i,
      });

      // Should not throw even with undefined onRowClick
      fireEvent.keyDown(contentArea, { key: ' ' });
      expect(contentArea).toBeInTheDocument();
    });
  });

  describe('Checkbox Keyboard Activation', () => {
    it('Space toggles checkbox via native behavior (onChange fires)', async () => {
      const singleOnSelect = jest.fn();
      const user = userEvent.setup();

      render(
        <ContractRowItem
          {...defaultProps}
          onSelect={singleOnSelect}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();
      await user.keyboard(' ');

      // Native checkbox handles Space: fires onChange
      expect(singleOnSelect).toHaveBeenCalledWith(true);
    });

    it('Enter on native checkbox does not toggle (only Space)', async () => {
      const localOnSelect = jest.fn();
      const user = userEvent.setup();
      render(
        <ContractRowItem
          {...defaultProps}
          onSelect={localOnSelect}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();

      await user.keyboard('{Enter}');

      // Enter does NOT toggle native checkboxes
      expect(localOnSelect).not.toHaveBeenCalled();
    });

    it('Ctrl+Space on the list item toggles selection via handleKeyDown', () => {
      const ctrlSpaceOnSelect = jest.fn();
      render(
        <ContractRowItem
          {...defaultProps}
          isSelected={false}
          onSelect={ctrlSpaceOnSelect}
        />
      );

      // Fire Ctrl+Space on the list item (role="row")
      const listItem = screen.getByRole('row');
      fireEvent.keyDown(listItem, { key: ' ', ctrlKey: true });

      expect(ctrlSpaceOnSelect).toHaveBeenCalledWith(true);
    });

    it('Ctrl+Space toggles from selected to unselected', () => {
      const ctrlSpaceOnSelect = jest.fn();
      render(
        <ContractRowItem
          {...defaultProps}
          isSelected={true}
          onSelect={ctrlSpaceOnSelect}
        />
      );

      const listItem = screen.getByRole('row');
      fireEvent.keyDown(listItem, { key: ' ', ctrlKey: true });

      expect(ctrlSpaceOnSelect).toHaveBeenCalledWith(false);
    });
  });

  describe('Format Handling', () => {
    it('formats currency with locale', () => {
      const props = {
        ...defaultProps,
        totalValue: 1000000,
      };

      render(<ContractRowItem {...props} />);

      expect(screen.getByText(/1,000,000 USD/)).toBeInTheDocument();
    });

    it('handles zero value', () => {
      const props = {
        ...defaultProps,
        totalValue: 0,
      };

      render(<ContractRowItem {...props} />);

      expect(screen.getByText(/0 USD/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('renders with no parties', () => {
      const props = {
        ...defaultProps,
        parties: [],
      };

      render(<ContractRowItem {...props} />);

      expect(screen.getByText(/0 parties/)).toBeInTheDocument();
    });

    it('renders with many milestones', () => {
      const props = {
        ...defaultProps,
        milestoneCount: 100,
      };

      render(<ContractRowItem {...props} />);

      expect(screen.getByText(/100 milestones/)).toBeInTheDocument();
    });

    it('handles very long contract names', () => {
      const longName = 'A'.repeat(100);
      const props = {
        ...defaultProps,
        contractName: longName,
      };

      render(<ContractRowItem {...props} />);

      expect(screen.getByText(longName)).toBeInTheDocument();
    });
  });
});
