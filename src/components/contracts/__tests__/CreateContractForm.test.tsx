import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CreateContractForm from '../CreateContractForm';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

jest.mock('@/lib/repository', () => ({
  saveContract: jest.fn(),
}));

jest.mock('@/lib/stellarAddress', () => ({
  isValidStellarAddress: jest.fn((addr: string) => addr.length === 56 && addr.startsWith('G')),
  normalizeStellarAddress: jest.fn((addr: string) => addr.trim()),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A valid Stellar public key for use in tests. */
const VALID_ADDRESS = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

const onSuccess = jest.fn();
const onCancel = jest.fn();

function renderForm() {
  return render(<CreateContractForm onSuccess={onSuccess} onCancel={onCancel} />);
}

// ---------------------------------------------------------------------------
// Test harness for focus-management tests
// ---------------------------------------------------------------------------

function createFocusTestHarness() {
  const dialogOnCancel = jest.fn();
  const dialogOnSuccess = jest.fn();

  function Harness() {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
      <>
        <button type="button" onClick={() => setIsOpen(true)}>
          Open contract form
        </button>
        <button type="button" onClick={() => setIsOpen(false)}>
          External close
        </button>
        {isOpen && (
          <CreateContractForm
            onSuccess={(contract) => {
              dialogOnSuccess(contract);
              setIsOpen(false);
            }}
            onCancel={() => {
              dialogOnCancel();
              setIsOpen(false);
            }}
          />
        )}
      </>
    );
  }

  return { Harness, dialogOnCancel, dialogOnSuccess };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CreateContractForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all four fields and both action buttons', () => {
    renderForm();

    expect(screen.getByLabelText(/contract name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/freelancer stellar address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/total value/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create contract/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders as a modal dialog with correct ARIA attributes', () => {
    renderForm();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'create-contract-heading');
  });

  it('matches the empty-state form structure', () => {
    const { container } = renderForm();

    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches the populated-state form structure', () => {
    const { container } = renderForm();

    fireEvent.change(screen.getByLabelText(/contract name/i), {
      target: { value: 'Design Sprint' },
    });
    fireEvent.change(screen.getByLabelText(/freelancer stellar address/i), {
      target: { value: VALID_ADDRESS },
    });
    fireEvent.change(screen.getByLabelText(/total value/i), {
      target: { value: '5000' },
    });
    fireEvent.change(screen.getByLabelText(/currency/i), {
      target: { value: 'XLM' },
    });

    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches the error-state form structure after validation failures', async () => {
    const { container } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert', { name: /there is a problem/i })).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchSnapshot();
  });

  it('calls onCancel when the Cancel button is clicked', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows an ErrorSummary with all required-field errors on empty submit', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert', { name: /there is a problem/i })).toBeInTheDocument();
    });

    const summary = screen.getByRole('alert', { name: /there is a problem/i });
    expect(summary).toHaveTextContent(/contract name is required/i);
    expect(summary).toHaveTextContent(/freelancer address is required/i);
    expect(summary).toHaveTextContent(/total value must be a positive number/i);

    // onSuccess must NOT fire on a validation failure.
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows a validation error for an invalid Stellar address', async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/contract name/i), {
      target: { value: 'Design Sprint' },
    });
    fireEvent.change(screen.getByLabelText(/freelancer stellar address/i), {
      target: { value: 'INVALID_ADDRESS' },
    });
    fireEvent.change(screen.getByLabelText(/total value/i), {
      target: { value: '1000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert', { name: /there is a problem/i })).toHaveTextContent(
        /must be a valid stellar g\.\.\. address/i
      );
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows a validation error for a non-positive total value', async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/contract name/i), {
      target: { value: 'Design Sprint' },
    });
    fireEvent.change(screen.getByLabelText(/freelancer stellar address/i), {
      target: { value: VALID_ADDRESS },
    });
    fireEvent.change(screen.getByLabelText(/total value/i), {
      target: { value: '-50' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert', { name: /there is a problem/i })).toHaveTextContent(
        /total value must be a positive number/i
      );
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows a validation error for a zero total value', async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/contract name/i), {
      target: { value: 'Design Sprint' },
    });
    fireEvent.change(screen.getByLabelText(/freelancer stellar address/i), {
      target: { value: VALID_ADDRESS },
    });
    fireEvent.change(screen.getByLabelText(/total value/i), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert', { name: /there is a problem/i })).toHaveTextContent(
        /total value must be a positive number/i
      );
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('marks invalid fields with aria-invalid="true"', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/contract name/i)).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText(/freelancer stellar address/i)).toHaveAttribute(
        'aria-invalid',
        'true'
      );
      expect(screen.getByLabelText(/total value/i)).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('calls onSuccess and showSuccess toast on a valid submission', async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/contract name/i), {
      target: { value: 'Design Sprint' },
    });
    fireEvent.change(screen.getByLabelText(/freelancer stellar address/i), {
      target: { value: VALID_ADDRESS },
    });
    fireEvent.change(screen.getByLabelText(/total value/i), {
      target: { value: '5000' },
    });
    // Currency already defaults to USD — no interaction needed.

    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Contract created' })
      );
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    // No error summary should be visible.
    expect(screen.queryByRole('alert', { name: /there is a problem/i })).not.toBeInTheDocument();
  });

  it('passes the correctly shaped Contract to onSuccess', async () => {
    const { saveContract } = await import('@/lib/repository');
    renderForm();

    fireEvent.change(screen.getByLabelText(/contract name/i), {
      target: { value: 'Design Sprint' },
    });
    fireEvent.change(screen.getByLabelText(/freelancer stellar address/i), {
      target: { value: VALID_ADDRESS },
    });
    fireEvent.change(screen.getByLabelText(/total value/i), {
      target: { value: '2500' },
    });
    // Keep default currency (USD).

    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

    expect(saveContract).toHaveBeenCalledWith(
      expect.objectContaining({
        contractName: 'Design Sprint',
        totalValue: 2500,
        currency: 'USD',
        status: 'Pending',
        milestoneCount: 0,
        parties: expect.arrayContaining([
          expect.objectContaining({ label: 'Freelancer', address: VALID_ADDRESS }),
        ]),
      })
    );
  });

  it('ErrorSummary anchor links point to the corresponding field ids', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert', { name: /there is a problem/i })).toBeInTheDocument();
    });

    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('#contractName');
    expect(hrefs).toContain('#freelancerAddress');
    expect(hrefs).toContain('#totalValue');
  });

  // ---------------------------------------------------------------------------
  // Per-field inline validation messages
  // ---------------------------------------------------------------------------

  it('displays inline validation messages per field on empty submit', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => {
      // Each message appears twice: once in ErrorSummary + once inline
      expect(screen.getAllByText('Contract name is required')).toHaveLength(2);
    });

    expect(screen.getAllByText('Freelancer address is required')).toHaveLength(2);
    expect(screen.getAllByText('Total value must be a positive number')).toHaveLength(2);
  });

  // ---------------------------------------------------------------------------
  // Error clearing on fix
  // ---------------------------------------------------------------------------

  it('clears contract name error when the user starts typing', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Contract name is required')).toHaveLength(2);
    });

    fireEvent.change(screen.getByLabelText(/contract name/i), {
      target: { value: 'Website Redesign' },
    });

    expect(screen.queryByText('Contract name is required')).not.toBeInTheDocument();
    // Other errors must still show (both ErrorSummary + inline)
    expect(screen.getAllByText('Freelancer address is required')).toHaveLength(2);
    expect(screen.getAllByText('Total value must be a positive number')).toHaveLength(2);
  });

  it('clears Stellar address error when the user fixes the address', async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/contract name/i), {
      target: { value: 'Design Sprint' },
    });
    fireEvent.change(screen.getByLabelText(/freelancer stellar address/i), {
      target: { value: 'INVALID' },
    });
    fireEvent.change(screen.getByLabelText(/total value/i), {
      target: { value: '1000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => {
      // Appears twice: ErrorSummary link + inline error (helper text also contains 'Stellar' but we match exact error)
      expect(screen.getAllByText('Freelancer address must be a valid Stellar G... address')).toHaveLength(2);
    });

    fireEvent.change(screen.getByLabelText(/freelancer stellar address/i), {
      target: { value: VALID_ADDRESS },
    });

    expect(screen.queryByText('Freelancer address must be a valid Stellar G... address')).not.toBeInTheDocument();
  });

  it('clears total value error when the user enters a positive number', async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/contract name/i), {
      target: { value: 'Design Sprint' },
    });
    fireEvent.change(screen.getByLabelText(/freelancer stellar address/i), {
      target: { value: VALID_ADDRESS },
    });
    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Total value must be a positive number')).toHaveLength(2);
    });

    fireEvent.change(screen.getByLabelText(/total value/i), {
      target: { value: '500' },
    });

    expect(screen.queryByText('Total value must be a positive number')).not.toBeInTheDocument();
  });

  it('clears all errors and ErrorSummary on valid re-submission', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert', { name: /there is a problem/i })).toBeInTheDocument();
    });

    // Fix all fields
    fireEvent.change(screen.getByLabelText(/contract name/i), {
      target: { value: 'Website Redesign' },
    });
    fireEvent.change(screen.getByLabelText(/freelancer stellar address/i), {
      target: { value: VALID_ADDRESS },
    });
    fireEvent.change(screen.getByLabelText(/total value/i), {
      target: { value: '2500' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalled();
    });

    expect(screen.queryByRole('alert', { name: /there is a problem/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Contract name is required')).not.toBeInTheDocument();
    expect(screen.queryByText('Freelancer address is required')).not.toBeInTheDocument();
    expect(screen.queryByText('Total value must be a positive number')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Focus management
  // ---------------------------------------------------------------------------

  describe('focus management', () => {
    it('sets initial focus to the contract name field when opened', async () => {
      const user = userEvent.setup();
      const { Harness } = createFocusTestHarness();
      render(<Harness />);

      await user.click(screen.getByRole('button', { name: 'Open contract form' }));

      expect(screen.getByLabelText(/contract name/i)).toHaveFocus();
    });

    it('invokes onCancel when Escape is pressed', async () => {
      const user = userEvent.setup();
      const { Harness, dialogOnCancel } = createFocusTestHarness();
      render(<Harness />);

      await user.click(screen.getByRole('button', { name: 'Open contract form' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(dialogOnCancel).toHaveBeenCalledTimes(1);
    });

    it('traps Tab focus within the dialog while open', async () => {
      const user = userEvent.setup();
      const { Harness } = createFocusTestHarness();
      render(<Harness />);

      await user.click(screen.getByRole('button', { name: 'Open contract form' }));
      const dialog = screen.getByRole('dialog');

      // First get all focusable elements inside the dialog
      const focusable = dialog.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const focusableArray = Array.from(focusable) as HTMLElement[];
      expect(focusableArray.length).toBeGreaterThan(0);

      const firstFocusable = focusableArray[0];
      const lastFocusable = focusableArray[focusableArray.length - 1];

      // Focus the last element, then Tab — should wrap to the first
      lastFocusable.focus();
      await user.tab();

      expect(firstFocusable).toHaveFocus();
    });

    it('cycles Shift+Tab from the first control back to the last control', async () => {
      const user = userEvent.setup();
      const { Harness } = createFocusTestHarness();
      render(<Harness />);

      await user.click(screen.getByRole('button', { name: 'Open contract form' }));
      const dialog = screen.getByRole('dialog');
      const contractNameInput = screen.getByLabelText(/contract name/i);

      contractNameInput.focus();
      await user.tab({ shift: true });

      const focusable = dialog.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const focusableArray = Array.from(focusable);
      const lastFocusable = focusableArray[focusableArray.length - 1];

      expect(lastFocusable).toHaveFocus();
    });

    it('restores focus to the trigger after closing with Escape', async () => {
      const user = userEvent.setup();
      const { Harness, dialogOnCancel } = createFocusTestHarness();
      render(<Harness />);

      const trigger = screen.getByRole('button', { name: 'Open contract form' });
      await user.click(trigger);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(dialogOnCancel).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('restores focus to the trigger after cancel button closes the dialog', async () => {
      const user = userEvent.setup();
      const { Harness } = createFocusTestHarness();
      render(<Harness />);

      const trigger = screen.getByRole('button', { name: 'Open contract form' });
      await user.click(trigger);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('restores focus to the trigger after successful submission', async () => {
      const user = userEvent.setup();
      const { Harness, dialogOnSuccess } = createFocusTestHarness();
      render(<Harness />);

      const trigger = screen.getByRole('button', { name: 'Open contract form' });
      await user.click(trigger);

      // Fill valid form data
      await user.type(screen.getByLabelText(/contract name/i), 'Test Contract');
      await user.type(screen.getByLabelText(/freelancer stellar address/i), VALID_ADDRESS);
      await user.type(screen.getByLabelText(/total value/i), '1000');

      await user.click(screen.getByRole('button', { name: /create contract/i }));

      expect(dialogOnSuccess).toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });
});
