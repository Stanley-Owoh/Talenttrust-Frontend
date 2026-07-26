import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ContractCreationForm,
  MAX_CONTRACT_NAME_LENGTH,
  MAX_PARTY_LABEL_LENGTH,
} from '../ContractCreationForm';
import * as stellarAddress from '@/lib/stellarAddress';

// Mock the stellarAddress module
jest.mock('@/lib/stellarAddress', () => ({
  isValidStellarAddress: jest.fn(),
}));

describe('ContractCreationForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  };

  // Valid Stellar address for testing
  const VALID_ADDRESS = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
  const INVALID_ADDRESS = 'INVALID123';

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation
    (stellarAddress.isValidStellarAddress as jest.Mock).mockImplementation((addr: string) => {
      return addr === VALID_ADDRESS;
    });
  });

  describe('Rendering', () => {
    it('renders the form with all required fields', () => {
      render(<ContractCreationForm {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/contract name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/total value/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
      expect(screen.getByText(/parties/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create contract/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders with two initial party fields', () => {
      render(<ContractCreationForm {...defaultProps} />);

      expect(screen.getByText(/party 1/i)).toBeInTheDocument();
      expect(screen.getByText(/party 2/i)).toBeInTheDocument();
    });

    it('has accessible modal attributes', () => {
      render(<ContractCreationForm {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'create-contract-title');
    });
  });

  describe('Form Validation - Missing Fields', () => {
    it('shows validation errors when submitting empty form', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => {
        const errorSummary = screen.getByRole('alert', { name: /there is a problem/i });
        expect(errorSummary).toBeInTheDocument();
        expect(errorSummary).toHaveTextContent(/contract name is required/i);
        expect(errorSummary).toHaveTextContent(/total value is required/i);
        expect(errorSummary).toHaveTextContent(/at least two parties are required/i);
      });

      expect(screen.getAllByText(/contract name is required/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/total value is required/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/at least two parties are required/i)[0]).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('validates that contract name is required', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      const contractNameInput = screen.getByLabelText(/contract name/i);
      fireEvent.change(contractNameInput, { target: { value: '   ' } });
      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => {
        expect(screen.getAllByText(/contract name is required/i)[0]).toBeInTheDocument();
      });
    });

    it('validates that total value is required', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      const totalValueInput = screen.getByLabelText(/total value/i);
      fireEvent.change(totalValueInput, { target: { value: '   ' } });
      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => {
        expect(screen.getAllByText(/total value is required/i)[0]).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation - Invalid Data', () => {
    it('validates that total value must be a positive number', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      const totalValueInput = screen.getByLabelText(/total value/i);
      fireEvent.change(totalValueInput, { target: { value: '-100' } });
      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => {
        expect(screen.getAllByText(/total value must be a positive number/i)[0]).toBeInTheDocument();
      });
    });

    it('validates that total value must be numeric', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      const totalValueInput = screen.getByLabelText(/total value/i);
      fireEvent.change(totalValueInput, { target: { value: 'not-a-number' } });
      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => {
        expect(screen.getAllByText(/total value must be a positive number/i)[0]).toBeInTheDocument();
      });
    });

    it('validates Stellar address format', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      // Fill in required fields
      fireEvent.change(screen.getByLabelText(/contract name/i), {
        target: { value: 'Test Contract' },
      });
      fireEvent.change(screen.getByLabelText(/total value/i), {
        target: { value: '5000' },
      });

      // Fill in first party with invalid address
      const partyLabels = screen.getAllByPlaceholderText(/e\.g\., client, freelancer/i);
      const partyAddresses = screen.getAllByPlaceholderText(/GXXXXXXXXXX/i);

      fireEvent.change(partyLabels[0], { target: { value: 'Client' } });
      fireEvent.change(partyAddresses[0], { target: { value: INVALID_ADDRESS } });

      fireEvent.change(partyLabels[1], { target: { value: 'Freelancer' } });
      fireEvent.change(partyAddresses[1], { target: { value: VALID_ADDRESS } });

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => {
        expect(screen.getAllByText(/party 1 address must be a valid stellar address/i)[0]).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('validates that party label is required when address is provided', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      const partyAddresses = screen.getAllByPlaceholderText(/GXXXXXXXXXX/i);
      fireEvent.change(partyAddresses[0], { target: { value: VALID_ADDRESS } });

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => {
        expect(screen.getAllByText(/party 1 label is required/i)[0]).toBeInTheDocument();
      });
    });

    it('validates that party address is required when label is provided', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      const partyLabels = screen.getAllByPlaceholderText(/e\.g\., client, freelancer/i);
      fireEvent.change(partyLabels[0], { target: { value: 'Client' } });

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => {
        expect(screen.getAllByText(/party 1 address is required/i)[0]).toBeInTheDocument();
      });
    });
  });

  describe('Party Management', () => {
    it('allows adding additional parties', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      expect(screen.queryByText(/party 3/i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /add another party/i }));

      await waitFor(() => {
        expect(screen.getByText(/party 3/i)).toBeInTheDocument();
      });
    });

    it('allows removing parties when more than two exist', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      // Add a third party
      fireEvent.click(screen.getByRole('button', { name: /add another party/i }));
      await waitFor(() => {
        expect(screen.getByText(/party 3/i)).toBeInTheDocument();
      });

      // Remove the third party
      const removeButtons = screen.getAllByRole('button', { name: /remove party/i });
      fireEvent.click(removeButtons[2]);

      await waitFor(() => {
        expect(screen.queryByText(/party 3/i)).not.toBeInTheDocument();
      });
    });

    it('does not show remove button when only two parties exist', () => {
      render(<ContractCreationForm {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /remove party/i })).not.toBeInTheDocument();
    });
  });

  describe('Valid Submission', () => {
    it('submits valid form data successfully', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      // Fill in contract details
      fireEvent.change(screen.getByLabelText(/contract name/i), {
        target: { value: 'Website Redesign' },
      });
      fireEvent.change(screen.getByLabelText(/total value/i), {
        target: { value: '5000' },
      });
      fireEvent.change(screen.getByLabelText(/currency/i), {
        target: { value: 'EUR' },
      });

      // Fill in parties
      const partyLabels = screen.getAllByPlaceholderText(/e\.g\., client, freelancer/i);
      const partyAddresses = screen.getAllByPlaceholderText(/GXXXXXXXXXX/i);

      fireEvent.change(partyLabels[0], { target: { value: 'Client' } });
      fireEvent.change(partyAddresses[0], { target: { value: VALID_ADDRESS } });

      fireEvent.change(partyLabels[1], { target: { value: 'Freelancer' } });
      fireEvent.change(partyAddresses[1], { target: { value: VALID_ADDRESS } });

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedContract = mockOnSubmit.mock.calls[0][0];
      expect(submittedContract).toMatchObject({
        contractName: 'Website Redesign',
        totalValue: 5000,
        currency: 'EUR',
        status: 'Pending',
        milestoneCount: 0,
        parties: [
          { label: 'Client', address: VALID_ADDRESS },
          { label: 'Freelancer', address: VALID_ADDRESS },
        ],
      });
      expect(submittedContract.createdAt).toBeDefined();
    });

    it('trims whitespace from input fields', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/contract name/i), {
        target: { value: '  Website Redesign  ' },
      });
      fireEvent.change(screen.getByLabelText(/total value/i), {
        target: { value: '5000' },
      });

      const partyLabels = screen.getAllByPlaceholderText(/e\.g\., client, freelancer/i);
      const partyAddresses = screen.getAllByPlaceholderText(/GXXXXXXXXXX/i);

      fireEvent.change(partyLabels[0], { target: { value: '  Client  ' } });
      fireEvent.change(partyAddresses[0], { target: { value: VALID_ADDRESS } });

      fireEvent.change(partyLabels[1], { target: { value: '  Freelancer  ' } });
      fireEvent.change(partyAddresses[1], { target: { value: VALID_ADDRESS } });

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      const submittedContract = mockOnSubmit.mock.calls[0][0];
      expect(submittedContract.contractName).toBe('Website Redesign');
    });

    it('normalizes control characters and whitespace before submitting text fields', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/contract name/i), {
        target: { value: '  Website\u0000\n  Redesign  ' },
      });
      fireEvent.change(screen.getByLabelText(/total value/i), { target: { value: '5000' } });

      const partyLabels = screen.getAllByPlaceholderText(/e\.g\., client, freelancer/i);
      const partyAddresses = screen.getAllByPlaceholderText(/GXXXXXXXXXX/i);
      fireEvent.change(partyLabels[0], { target: { value: '  Client\u0007  Team ' } });
      fireEvent.change(partyAddresses[0], { target: { value: VALID_ADDRESS } });
      fireEvent.change(partyLabels[1], { target: { value: ' Freelancer ' } });
      fireEvent.change(partyAddresses[1], { target: { value: VALID_ADDRESS } });

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledTimes(1));
      expect(mockOnSubmit.mock.calls[0][0]).toMatchObject({
        contractName: 'Website Redesign',
        parties: [
          { label: 'Client Team', address: VALID_ADDRESS },
          { label: 'Freelancer', address: VALID_ADDRESS },
        ],
      });
    });

    it('filters out empty parties when submitting', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      // Add a third party but leave it empty
      fireEvent.click(screen.getByRole('button', { name: /add another party/i }));

      // Fill in contract details
      fireEvent.change(screen.getByLabelText(/contract name/i), {
        target: { value: 'Test Contract' },
      });
      fireEvent.change(screen.getByLabelText(/total value/i), {
        target: { value: '1000' },
      });

      // Fill in first two parties
      const partyLabels = screen.getAllByPlaceholderText(/e\.g\., client, freelancer/i);
      const partyAddresses = screen.getAllByPlaceholderText(/GXXXXXXXXXX/i);

      fireEvent.change(partyLabels[0], { target: { value: 'Client' } });
      fireEvent.change(partyAddresses[0], { target: { value: VALID_ADDRESS } });

      fireEvent.change(partyLabels[1], { target: { value: 'Freelancer' } });
      fireEvent.change(partyAddresses[1], { target: { value: VALID_ADDRESS } });

      // Leave third party empty

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      const submittedContract = mockOnSubmit.mock.calls[0][0];
      expect(submittedContract.parties).toHaveLength(2);
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is clicked', () => {
      render(<ContractCreationForm {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('displays error summary with proper ARIA attributes', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => {
        const errorSummary = screen.getByRole('alert', { name: /there is a problem/i });
        expect(errorSummary).toBeInTheDocument();
        expect(errorSummary).toHaveAttribute('tabIndex', '-1');
      });
    });

    it('links error messages to form fields via IDs', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      const contractNameInput = screen.getByLabelText(/contract name/i);
      expect(contractNameInput).toHaveAttribute('id', 'contractName');

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => {
        expect(screen.getAllByText(/contract name is required/i)[0]).toBeInTheDocument();
      });

      // Check aria-invalid is set
      expect(contractNameInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('marks required fields with asterisk and aria attributes', () => {
      render(<ContractCreationForm {...defaultProps} />);

      // Required fields should have asterisks
      const contractNameLabel = screen.getByText(/contract name/i).closest('label');
      expect(contractNameLabel?.textContent).toContain('*');
    });
  });

  describe('Currency Selection', () => {
    it('allows selecting different currencies', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      const currencySelect = screen.getByLabelText(/currency/i);

      fireEvent.change(currencySelect, { target: { value: 'GBP' } });
      expect(currencySelect).toHaveValue('GBP');

      fireEvent.change(currencySelect, { target: { value: 'XLM' } });
      expect(currencySelect).toHaveValue('XLM');
    });

    it('defaults to USD', () => {
      render(<ContractCreationForm {...defaultProps} />);

      const currencySelect = screen.getByLabelText(/currency/i) as HTMLSelectElement;
      expect(currencySelect.value).toBe('USD');
    });
  });

  describe('Error Field Highlighting', () => {
    it('applies error styling to invalid fields', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => {
        const contractNameInput = screen.getByLabelText(/contract name/i);
        expect(contractNameInput.className).toContain('border-red-500');
      });
    });
  });

  describe('Text length validation', () => {
    it('rejects an over-length contract name instead of truncating it', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/contract name/i), {
        target: { value: 'a'.repeat(MAX_CONTRACT_NAME_LENGTH + 1) },
      });
      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => {
        expect(screen.getAllByText(
          `Contract name must be no more than ${MAX_CONTRACT_NAME_LENGTH} characters`,
        )[0]).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('rejects an over-length party label instead of truncating it', async () => {
      render(<ContractCreationForm {...defaultProps} />);
      const partyLabels = screen.getAllByPlaceholderText(/e\.g\., client, freelancer/i);
      const partyAddresses = screen.getAllByPlaceholderText(/GXXXXXXXXXX/i);
      fireEvent.change(partyLabels[0], { target: { value: 'a'.repeat(MAX_PARTY_LABEL_LENGTH + 1) } });
      fireEvent.change(partyAddresses[0], { target: { value: VALID_ADDRESS } });

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => {
        expect(screen.getAllByText(
          `Party 1 label must be no more than ${MAX_PARTY_LABEL_LENGTH} characters`,
        )[0]).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Integration with isValidStellarAddress', () => {
    it('calls isValidStellarAddress for each party address', async () => {
      render(<ContractCreationForm {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/contract name/i), {
        target: { value: 'Test' },
      });
      fireEvent.change(screen.getByLabelText(/total value/i), {
        target: { value: '1000' },
      });

      const partyLabels = screen.getAllByPlaceholderText(/e\.g\., client, freelancer/i);
      const partyAddresses = screen.getAllByPlaceholderText(/GXXXXXXXXXX/i);

      fireEvent.change(partyLabels[0], { target: { value: 'Client' } });
      fireEvent.change(partyAddresses[0], { target: { value: VALID_ADDRESS } });

      fireEvent.change(partyLabels[1], { target: { value: 'Freelancer' } });
      fireEvent.change(partyAddresses[1], { target: { value: VALID_ADDRESS } });

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      await waitFor(() => {
        expect(stellarAddress.isValidStellarAddress).toHaveBeenCalledWith(VALID_ADDRESS);
      });
    });
  });
  describe('Focus Management', () => {
    it('moves focus to the first input on open and restores it to the trigger on close', async () => {
      const Wrapper = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        return (
          <div>
            <button onClick={() => setIsOpen(true)}>Open Dialog</button>
            {isOpen && <ContractCreationForm onSubmit={mockOnSubmit} onCancel={() => setIsOpen(false)} />}
          </div>
        );
      };
      
      const user = userEvent.setup();
      render(<Wrapper />);
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      trigger.focus();
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/contract name/i)).toHaveFocus();
      });
      
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      
      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });
    });

    it('traps focus within the dialog', async () => {
      const user = userEvent.setup();
      render(<ContractCreationForm {...defaultProps} />);

      const firstInput = screen.getByLabelText(/contract name/i);
      
      // Shift+Tab from the first input should wrap to the last focusable element
      firstInput.focus();
      await user.tab({ shift: true });
      
      // The "Create Contract" button is the last focusable element
      expect(screen.getByRole('button', { name: /create contract/i })).toHaveFocus();
      
      // Tab from the last focusable element should wrap back to the first
      await user.tab();
      expect(firstInput).toHaveFocus();
    });
  });
});
