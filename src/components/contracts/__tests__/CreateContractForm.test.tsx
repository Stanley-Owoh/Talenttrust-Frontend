import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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
});
