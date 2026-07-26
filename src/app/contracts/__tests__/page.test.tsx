import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContractsPage from '../page';
import * as repository from '@/lib/repository';
import * as stellarAddress from '@/lib/stellarAddress';

// Prevent actual download calls during tests
jest.mock('@/lib/exportContracts', () => ({
  ...jest.requireActual('@/lib/exportContracts'),
  downloadContractsCsv: jest.fn(),
  downloadContractsJson: jest.fn(),
}));

jest.mock('@/components/contracts/ContractsList', () => ({
  __esModule: true,
  default: ({ contracts }: any) => (
    <ul data-testid="contracts-list">
      {contracts.map((contract: any, idx: number) => (
        <li key={`${contract.contractName}-${idx}`}>
          {contract.contractName}
        </li>
      ))}
    </ul>
  ),
}));

jest.mock('@/components/ContractCreationForm', () => ({
  ContractCreationForm: ({ onSubmit, onCancel }: any) => (
    <div data-testid="contract-form">
      <button onClick={() => onCancel()}>Cancel</button>
      <button
        onClick={() =>
          onSubmit({
            contractName: 'New Contract',
            parties: [],
            totalValue: 1000,
            currency: 'USD',
            status: 'Active',
            createdAt: '2025-01-01',
            milestoneCount: 0,
          })
        }
      >
        Submit
      </button>
    </div>
  ),
}));

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    ...actual,
    listContracts: jest.fn(actual.listContracts),
    saveContract: jest.fn(actual.saveContract),
    deleteContract: jest.fn(actual.deleteContract),
  };
});
jest.mock('@/lib/stellarAddress');
jest.mock('@/components/toast/toast-provider', () => ({
  useToast: jest.fn(() => ({
    addToast: jest.fn(),
  })),
}));

const mockListContracts = repository.listContracts as jest.MockedFunction<
  typeof repository.listContracts
>;
const mockSaveContract = repository.saveContract as jest.MockedFunction<
  typeof repository.saveContract
>;
const mockDeleteContract = repository.deleteContract as jest.MockedFunction<
  typeof repository.deleteContract
>;
const mockIsValidStellarAddress = stellarAddress.isValidStellarAddress as jest.MockedFunction<
  typeof stellarAddress.isValidStellarAddress
>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockPush = jest.fn();

const mockDownloadCsv = jest.requireMock('@/lib/exportContracts').downloadContractsCsv as jest.Mock;
const mockDownloadJson = jest.requireMock('@/lib/exportContracts').downloadContractsJson as jest.Mock;

const VALID_ADDRESS = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

const createSearchParams = (query = '') => {
  const params = new URLSearchParams(query);
  return {
    get: (name: string) => params.get(name),
    toString: () => params.toString(),
  } as ReturnType<typeof useSearchParams>;
};

describe('ContractsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockListContracts.mockReturnValue([]);
    mockUseRouter.mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>);
    mockUseSearchParams.mockReturnValue(createSearchParams());
    mockIsValidStellarAddress.mockImplementation((addr: string | null | undefined) => addr === VALID_ADDRESS);
    mockShowError.mockReset();
  });

  describe('empty state', () => {
    it('renders empty state when no contracts exist', () => {
      (repository.listContracts as jest.Mock).mockReturnValue([]);

      render(<ContractsPage />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No contracts found')).toBeInTheDocument();
    });

    it('allows creating a contract from empty state', async () => {
      const contracts = [makeContract({ contractName: 'New Contract' })];
      (repository.listContracts as jest.Mock)
        .mockReturnValueOnce([]) // Initial render
        .mockReturnValueOnce(contracts); // After form submission

      (repository.saveContract as jest.Mock).mockImplementation(() => {});

      render(<ContractsPage />);

      const createButton = screen.getByRole('button', {
        name: /Create Contract/i,
      });
      fireEvent.click(createButton);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(repository.saveContract).toHaveBeenCalled();
      });

      expect(screen.getByTestId('contracts-list')).toBeInTheDocument();
    });
  });

  describe('contracts list rendering', () => {
    it('renders contracts list when contracts exist', () => {
      const contracts = [
        makeContract({ contractName: 'Contract 1' }),
        makeContract({ contractName: 'Contract 2' }),
      ];
      (repository.listContracts as jest.Mock).mockReturnValue(contracts);

      render(<ContractsPage />);

      expect(screen.getByTestId('contracts-list')).toBeInTheDocument();
      expect(screen.getByText('Contract 1')).toBeInTheDocument();
      expect(screen.getByText('Contract 2')).toBeInTheDocument();
    });

    it('displays create button when contracts exist', () => {
      const contracts = [makeContract()];
      (repository.listContracts as jest.Mock).mockReturnValue(contracts);

      render(<ContractsPage />);

      const createButton = screen.getByRole('button', {
        name: /Create Contract/i,
      });
      expect(createButton).toBeInTheDocument();
    });

    it('hides form when showing contracts list', () => {
      const contracts = [makeContract()];
      (repository.listContracts as jest.Mock).mockReturnValue(contracts);

      render(<ContractsPage />);

      expect(screen.queryByTestId('contract-form')).not.toBeInTheDocument();
    });
  });

  describe('form interactions', () => {
    it('shows form when create button is clicked', () => {
      const contracts = [makeContract()];
      (repository.listContracts as jest.Mock).mockReturnValue(contracts);

      render(<ContractsPage />);

      const createButton = screen.getByRole('button', {
        name: /Create Contract/i,
      });
      fireEvent.click(createButton);

      expect(screen.getByTestId('contract-form')).toBeInTheDocument();
      expect(screen.queryByTestId('contracts-list')).not.toBeInTheDocument();
    });

    it('hides form when cancel is clicked', () => {
      const contracts = [makeContract()];
      (repository.listContracts as jest.Mock).mockReturnValue(contracts);

      render(<ContractsPage />);

      const createButton = screen.getByRole('button', {
        name: /Create Contract/i,
      });
      fireEvent.click(createButton);

      expect(screen.getByTestId('contract-form')).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(screen.queryByTestId('contract-form')).not.toBeInTheDocument();
      expect(screen.getByTestId('contracts-list')).toBeInTheDocument();
    });

    it('persists contract and updates list on form submission', async () => {
      const initialContracts = [makeContract({ contractName: 'Existing' })];
      const updatedContracts = [
        makeContract({ contractName: 'Existing' }),
        makeContract({ contractName: 'New Contract' }),
      ];

      (repository.listContracts as jest.Mock)
        .mockReturnValueOnce(initialContracts) // Initial render
        .mockReturnValueOnce(updatedContracts); // After submission

      (repository.saveContract as jest.Mock).mockImplementation(() => {});

      render(<ContractsPage />);

      const createButton = screen.getByRole('button', {
        name: /Create Contract/i,
      });
      fireEvent.click(createButton);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(repository.saveContract).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('New Contract')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('contract-form')).not.toBeInTheDocument();
    });
  });

  describe('Contract Persistence', () => {
    it('adds the contract optimistically and keeps the list in sync on success', async () => {
      // Start with empty list
      mockListContracts.mockReturnValue([]);
      mockSaveContract.mockReturnValue(true);
      render(<ContractsPage />);

      const contractsList = screen.getByTestId('contracts-list');
      expect(contractsList).toBeInTheDocument();

      // Simulate opening form (triggers parent re-render)
      // List should still exist (memoization prevents re-render)
      expect(screen.getByTestId('contracts-list')).toBeInTheDocument();
      expect(screen.getByText('Contract 1')).toBeInTheDocument();
      expect(screen.getByText('Contract 2')).toBeInTheDocument();
    });

    it('handles large contract lists efficiently', () => {
      const contracts = Array.from({ length: 500 }, (_, i) =>
        makeContract({ contractName: `Contract ${i + 1}` })
      );
      (repository.listContracts as jest.Mock).mockReturnValue(contracts);

      // Verify listContracts was called to refresh
      expect(mockListContracts).toHaveBeenCalled();
    });

    it('rolls back the optimistic contract and shows an error toast on save failure', async () => {
      const existingContract = {
        contractName: 'Existing Contract',
        parties: [
          { label: 'Client', address: VALID_ADDRESS },
          { label: 'Freelancer', address: VALID_ADDRESS },
        ],
        totalValue: 2500,
        currency: 'USD',
        status: 'Active' as const,
        createdAt: 'Jan 1, 2025',
        milestoneCount: 1,
      };

      mockListContracts.mockReturnValue([existingContract]);
      mockSaveContract.mockReturnValue(false);
      render(<ContractsPage />);

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      fireEvent.change(screen.getByLabelText(/contract name/i), {
        target: { value: 'New Contract' },
      });
      fireEvent.change(screen.getByLabelText(/total value/i), {
        target: { value: '7500' },
      });
      fireEvent.change(screen.getByLabelText(/currency/i), {
        target: { value: 'EUR' },
      });

      const partyLabels = screen.getAllByPlaceholderText(/e\.g\., client, freelancer/i);
      const partyAddresses = screen.getAllByPlaceholderText(/GXXXXXXXXXX/i);

      fireEvent.change(partyLabels[0], { target: { value: 'Client Corp' } });
      fireEvent.change(partyAddresses[0], { target: { value: VALID_ADDRESS } });

      fireEvent.change(partyLabels[1], { target: { value: 'Designer' } });
      fireEvent.change(partyAddresses[1], { target: { value: VALID_ADDRESS } });

      fireEvent.click(screen.getByRole('button', { name: /create contract/i, hidden: false }));

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Unable to create contract',
            description: 'Your contract could not be saved. Please try again.',
          }),
        );
      });

      expect(screen.getByText('Existing Contract')).toBeInTheDocument();
      expect(screen.queryByText('New Contract')).not.toBeInTheDocument();
    });

    it('closes form after successful submission', async () => {
      mockListContracts.mockReturnValue([]);
      render(<ContractsPage />);

      // Verify a few contracts are rendered
      expect(screen.getByText('Contract 1')).toBeInTheDocument();
      expect(screen.getByText('Contract 250')).toBeInTheDocument();
      expect(screen.getByText('Contract 500')).toBeInTheDocument();

      const contractsList = screen.getByTestId('contracts-list');
      const items = contractsList.querySelectorAll('li');
      expect(items.length).toBe(500);
    });

    it('maintains memoization when form state changes', async () => {
      const contracts = [makeContract({ contractName: 'Contract 1' })];
      (repository.listContracts as jest.Mock)
        .mockReturnValueOnce(contracts) // Initial
        .mockReturnValueOnce(contracts); // After form toggle

      render(<ContractsPage />);

      expect(screen.getByTestId('contracts-list')).toBeInTheDocument();

      // Toggle form open
      const createButton = screen.getByRole('button', {
        name: /Create Contract/i,
      });
      fireEvent.click(createButton);

      expect(screen.getByTestId('contract-form')).toBeInTheDocument();
      expect(screen.queryByTestId('contracts-list')).not.toBeInTheDocument();

      // Toggle form closed
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(screen.getByTestId('contracts-list')).toBeInTheDocument();
      expect(screen.getByText('Contract 1')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles repository errors gracefully', () => {
      (repository.listContracts as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Should not crash
      expect(() => render(<ContractsPage />)).not.toThrow();
    });

    it('handles rapid form toggles', () => {
      const contracts = [makeContract()];
      (repository.listContracts as jest.Mock).mockReturnValue(contracts);

      render(<ContractsPage />);

      mockSaveContract.mockReturnValue(true);

      // The memoization ensures that repeated renders don't cause excessive re-renders
      const createButton = screen.getByRole('button', {
        name: /Create Contract/i,
      });

      fireEvent.click(createButton);
      // After clicking, form should be visible (though the actual form is mocked)
      // This tests that the state toggle works correctly
    });

    it('preserves contracts list when switching between empty and non-empty states', async () => {
      const contracts = [makeContract({ contractName: 'New Contract' })];

      (repository.listContracts as jest.Mock)
        .mockReturnValueOnce([]) // Initial empty
        .mockReturnValueOnce(contracts); // After submission

      (repository.saveContract as jest.Mock).mockImplementation(() => {});

      render(<ContractsPage />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();

      // Simulate form submission
      const createButton = screen.getByRole('button', {
        name: /Create Contract/i,
      });
      fireEvent.click(createButton);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('contracts-list')).toBeInTheDocument();
      });

      expect(screen.getByText('New Contract')).toBeInTheDocument();
    });
  });

  describe('Contract Creation Form Focus Management', () => {
    it('moves focus to the Contract Name field when the form opens', async () => {
      mockListContracts.mockReturnValue([]);
      render(<ContractsPage />);

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      expect(screen.getByLabelText(/contract name/i)).toHaveFocus();
    });

    it('closes the dialog when Escape is pressed', async () => {
      mockListContracts.mockReturnValue([]);
      const user = userEvent.setup();
      render(<ContractsPage />);

      await user.click(screen.getByRole('button', { name: /create contract/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('traps Tab focus within the dialog while open', async () => {
      mockListContracts.mockReturnValue([]);
      const user = userEvent.setup();
      render(<ContractsPage />);

      await user.click(screen.getByRole('button', { name: /create contract/i }));
      const dialog = screen.getByRole('dialog');
      const contractNameInput = screen.getByLabelText(/contract name/i);

      contractNameInput.focus();
      await user.tab();
      expect(screen.getByLabelText(/total value/i)).toHaveFocus();

      const focusable = dialog.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const focusableArray = Array.from(focusable);
      const lastFocusable = focusableArray[focusableArray.length - 1];
      lastFocusable.focus();
      await user.tab();

      expect(contractNameInput).toHaveFocus();
    });
  });

  describe('Form Requirements', () => {
    it('requires at least two parties', async () => {
      mockListContracts.mockReturnValue([]);
      render(<ContractsPage />);

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      // Fill only one party
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

      fireEvent.click(screen.getByRole('button', { name: /create contract/i, hidden: false }));

      await waitFor(() => {
        expect(screen.getAllByText(/at least two parties are required/i)[0]).toBeInTheDocument();
      });
    });
  });

  describe('Page Structure', () => {
    it('renders page heading', () => {
      mockListContracts.mockReturnValue([]);
      render(<ContractsPage />);

      expect(screen.getByRole('heading', { name: 'Contracts', level: 1 })).toBeInTheDocument();
    });

    it('renders main landmark', () => {
      mockListContracts.mockReturnValue([]);
      render(<ContractsPage />);

      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  it('renders persisted contracts when storage already contains data', () => {
    const existingContracts = [
      {
        contractName: 'Existing Contract',
        parties: [],
        totalValue: 1000,
        currency: 'USD',
        status: 'Active' as const,
        createdAt: 'Apr 20, 2026',
        milestoneCount: 1,
      },
    ];
    mockListContracts.mockReturnValue(existingContracts);

    render(<ContractsPage />);

    expect(screen.getByText('Existing Contract')).toBeInTheDocument();
    expect(screen.getByText(/Active · Created Apr 20, 2026/)).toBeInTheDocument();
  });

  it('calls saveContract and refreshes contracts on form submission', async () => {
    mockListContracts.mockReturnValue([]);
    render(<ContractsPage />);

    // Open the form
    fireEvent.click(screen.getByRole('button', { name: 'Create Contract' }));

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/contract name/i), {
      target: { value: 'My New Contract' },
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

    const newContract = {
      contractName: 'My New Contract',
      parties: [
        { label: 'Client', address: VALID_ADDRESS },
        { label: 'Freelancer', address: VALID_ADDRESS },
      ],
      totalValue: 1000,
      currency: 'USD',
      status: 'Pending' as const,
      createdAt: 'Jan 1, 2025',
      milestoneCount: 0,
    };
    mockListContracts.mockReturnValue([newContract]);

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /create contract/i, hidden: false }));

    await waitFor(() => {
      expect(mockSaveContract).toHaveBeenCalledTimes(1);
    });

    expect(mockListContracts).toHaveBeenCalled();
  });

  describe('Export Buttons', () => {
    beforeEach(() => {
      mockDownloadCsv.mockClear();
      mockDownloadJson.mockClear();
    });

    it('renders CSV and JSON export buttons when contracts exist', () => {
      const contracts = [
        {
          contractName: 'Test Contract',
          parties: [{ label: 'Client', address: VALID_ADDRESS }],
          totalValue: 1000,
          currency: 'USD',
          status: 'Active' as const,
          createdAt: 'Jan 1, 2025',
          milestoneCount: 1,
        },
      ];
      mockListContracts.mockReturnValue(contracts);
      render(<ContractsPage />);

      expect(screen.getByRole('button', { name: /export contracts as csv/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export contracts as json/i })).toBeInTheDocument();
    });

    it('does not render export buttons when no contracts exist', () => {
      mockListContracts.mockReturnValue([]);
      render(<ContractsPage />);

      expect(screen.queryByRole('button', { name: /export contracts as csv/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /export contracts as json/i })).not.toBeInTheDocument();
    });

    it('calls downloadContractsCsv when CSV button is clicked', () => {
      const contracts = [
        {
          contractName: 'Test Contract',
          parties: [{ label: 'Client', address: VALID_ADDRESS }],
          totalValue: 1000,
          currency: 'USD',
          status: 'Active' as const,
          createdAt: 'Jan 1, 2025',
          milestoneCount: 1,
        },
      ];
      mockListContracts.mockReturnValue(contracts);
      render(<ContractsPage />);

      fireEvent.click(screen.getByRole('button', { name: /export contracts as csv/i }));
      expect(mockDownloadCsv).toHaveBeenCalledTimes(1);
      expect(mockDownloadCsv).toHaveBeenCalledWith(contracts);
    });

    it('calls downloadContractsJson when JSON button is clicked', () => {
      const contracts = [
        {
          contractName: 'Test Contract',
          parties: [{ label: 'Client', address: VALID_ADDRESS }],
          totalValue: 1000,
          currency: 'USD',
          status: 'Active' as const,
          createdAt: 'Jan 1, 2025',
          milestoneCount: 1,
        },
      ];
      mockListContracts.mockReturnValue(contracts);
      render(<ContractsPage />);

      fireEvent.click(screen.getByRole('button', { name: /export contracts as json/i }));
      expect(mockDownloadJson).toHaveBeenCalledTimes(1);
      expect(mockDownloadJson).toHaveBeenCalledWith(contracts);
    });

    it('passes correct contracts data to export functions', () => {
      const contracts = [
        {
          contractName: 'Alpha',
          parties: [{ label: 'Client', address: VALID_ADDRESS }],
          totalValue: 500,
          currency: 'USD',
          status: 'Pending' as const,
          createdAt: 'Mar 1, 2025',
          milestoneCount: 2,
        },
        {
          contractName: 'Beta',
          parties: [{ label: 'Client', address: VALID_ADDRESS }],
          totalValue: 1500,
          currency: 'EUR',
          status: 'Active' as const,
          createdAt: 'Apr 10, 2025',
          milestoneCount: 4,
        },
      ];
      mockListContracts.mockReturnValue(contracts);
      render(<ContractsPage />);

      fireEvent.click(screen.getByRole('button', { name: /export contracts as csv/i }));
      expect(mockDownloadCsv).toHaveBeenCalledWith(contracts);

      fireEvent.click(screen.getByRole('button', { name: /export contracts as json/i }));
      expect(mockDownloadJson).toHaveBeenCalledWith(contracts);
    });

    it('shows contract count text when contracts exist', () => {
      const contracts = [
        {
          contractName: 'Alpha',
          parties: [{ label: 'Client', address: VALID_ADDRESS }],
          totalValue: 500,
          currency: 'USD',
          status: 'Active' as const,
          createdAt: 'Mar 1, 2025',
          milestoneCount: 2,
        },
      ];
      mockListContracts.mockReturnValue(contracts);
      render(<ContractsPage />);

      expect(screen.getByText('1 contract')).toBeInTheDocument();
    });

    it('shows plural contract count when multiple contracts exist', () => {
      const contracts = [
        {
          contractName: 'Alpha',
          parties: [{ label: 'Client', address: VALID_ADDRESS }],
          totalValue: 500,
          currency: 'USD',
          status: 'Active' as const,
          createdAt: 'Mar 1, 2025',
          milestoneCount: 2,
        },
        {
          contractName: 'Beta',
          parties: [{ label: 'Client', address: VALID_ADDRESS }],
          totalValue: 1500,
          currency: 'EUR',
          status: 'Active' as const,
          createdAt: 'Apr 10, 2025',
          milestoneCount: 4,
        },
      ];
      mockListContracts.mockReturnValue(contracts);
      render(<ContractsPage />);

      expect(screen.getByText('2 contracts')).toBeInTheDocument();
    });

    it('buttons have accessible labels', () => {
      const contracts = [
        {
          contractName: 'Test',
          parties: [{ label: 'Client', address: VALID_ADDRESS }],
          totalValue: 100,
          currency: 'USD',
          status: 'Active' as const,
          createdAt: 'Jan 1, 2025',
          milestoneCount: 1,
        },
      ];
      mockListContracts.mockReturnValue(contracts);
      render(<ContractsPage />);

      expect(screen.getByRole('button', { name: 'Export contracts as CSV' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Export contracts as JSON' })).toBeInTheDocument();
    });
  });
});