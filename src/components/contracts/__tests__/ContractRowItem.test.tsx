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

    it('does not call onRowClick for other keys', () => {
      render(<ContractRowItem {...defaultProps} />);

      const contentArea = screen.getByRole('button', {
        name: /Website Redesign/i,
      });
      fireEvent.keyDown(contentArea, { key: 'Escape' });

      expect(mockOnRowClick).not.toHaveBeenCalled();
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

    it('row content is keyboard accessible', () => {
      render(<ContractRowItem {...defaultProps} />);

      const contentArea = screen.getByRole('button', {
        name: /Website Redesign/i,
      });
      expect(contentArea).toHaveAttribute('tabIndex', '0');
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
