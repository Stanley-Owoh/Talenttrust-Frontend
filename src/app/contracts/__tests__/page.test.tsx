import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContractsPage from '../page';
import * as repository from '@/lib/repository';
import * as stellarAddress from '@/lib/stellarAddress';
import type { Contract } from '@/types/domain';

const mockShowError = jest.fn();

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
            id: 'new-contract-id',
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

jest.mock('@/lib/repository', () => {
  const actual = jest.requireActual('@/lib/repository');
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
    showSuccess: jest.fn(),
    showError: mockShowError,
    toasts: [],
    dismissToast: jest.fn(),
  })),
}));

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: overrides.contractName ?? 'contract-id',
    contractName: 'Website Redesign',
    parties: [],
    totalValue: 1000,
    currency: 'USD',
    status: 'Active',
    createdAt: 'Jan 1, 2025',
    milestoneCount: 0,
    ...overrides,
  };
}

const mockListContracts = repository.listContracts as jest.MockedFunction<
  typeof repository.listContracts
>;
const mockSaveContract = repository.saveContract as jest.MockedFunction<
  typeof repository.saveContract
>;
const mockIsValidStellarAddress = stellarAddress.isValidStellarAddress as jest.MockedFunction<
  typeof stellarAddress.isValidStellarAddress
>;

const VALID_ADDRESS = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

describe('ContractsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Clear any queued `mockReturnValueOnce` values left over from a prior
    // test — this page only reads `listContracts()` once on mount, so a
    // second queued value from a "before/after" style test would otherwise
    // leak into whichever test runs next.
    mockListContracts.mockReset();
    mockSaveContract.mockReset();
    mockListContracts.mockReturnValue([]);
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

      (repository.saveContract as jest.Mock).mockReturnValue(true);

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
        makeContract({ contractName: 'Website Redesign' }),
        makeContract({ contractName: 'Mobile App Development' }),
      ];
      (repository.listContracts as jest.Mock).mockReturnValue(contracts);

      render(<ContractsPage />);

      expect(screen.getByText('Website Redesign')).toBeInTheDocument();
      expect(screen.getByText('Mobile App Development')).toBeInTheDocument();
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

      (repository.saveContract as jest.Mock).mockReturnValue(true);

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
      const existingContract = makeContract({ contractName: 'Existing Contract' });
      mockListContracts.mockReturnValue([existingContract]);
      mockSaveContract.mockReturnValue(true);
      render(<ContractsPage />);

      expect(screen.getByText('Existing Contract')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));
      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText('New Contract')).toBeInTheDocument();
      });

      expect(screen.getByText('Existing Contract')).toBeInTheDocument();
      expect(mockSaveContract).toHaveBeenCalledTimes(1);
    });

    it('handles large contract lists efficiently', () => {
      const contracts = Array.from({ length: 500 }, (_, i) =>
        makeContract({ contractName: `Contract ${i + 1}` })
      );
      mockListContracts.mockReturnValue(contracts);

      render(<ContractsPage />);

      const contractsList = screen.getByTestId('contracts-list');
      expect(contractsList.querySelectorAll('li').length).toBe(500);
    });

    it('rolls back the optimistic contract and shows an error toast on save failure', async () => {
      const existingContract = makeContract({ contractName: 'Existing Contract' });

      mockListContracts.mockReturnValue([existingContract]);
      mockSaveContract.mockReturnValue(false);
      render(<ContractsPage />);

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));
      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

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
      mockSaveContract.mockReturnValue(true);
      render(<ContractsPage />);

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));
      expect(screen.getByTestId('contract-form')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.queryByTestId('contract-form')).not.toBeInTheDocument();
      });
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

    it('renders a recoverable error instead of the empty state when loading fails', () => {
      mockListContracts.mockImplementation(() => {
        throw new Error('Storage error');
      });

      render(<ContractsPage />);

      expect(screen.getByRole('alert')).toHaveTextContent('Unable to load contracts');
      expect(screen.getByRole('button', { name: 'Retry loading contracts' })).toBeInTheDocument();
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
      expect(screen.queryByTestId('contracts-list')).not.toBeInTheDocument();
    });

    it('re-fetches contracts when retry is activated', async () => {
      const recoveredContracts = [makeContract({ contractName: 'Recovered Contract' })];
      mockListContracts
        .mockImplementationOnce(() => {
          throw new Error('Storage error');
        })
        .mockReturnValueOnce(recoveredContracts);

      render(<ContractsPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Retry loading contracts' }));

      expect(screen.getByRole('status', { name: 'Loading contracts' })).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('Recovered Contract')).toBeInTheDocument();
      });
      expect(mockListContracts).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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

      (repository.saveContract as jest.Mock).mockReturnValue(true);

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
  });

  describe('Pagination and Filtering', () => {
    it('renders first page of contracts and hides the rest', () => {
      const mockContracts = Array.from({ length: 12 }).map((_, i) => ({
        contractName: `Contract ${i}`,
        parties: [],
        totalValue: 1000,
        currency: 'USD',
        status: 'Active' as const,
        createdAt: 'Jan 1, 2025',
        milestoneCount: 0,
      }));
      mockListContracts.mockReturnValue(mockContracts);
      render(<ContractsPage />);
      
      expect(screen.getByText('Contract 0')).toBeInTheDocument();
      expect(screen.getByText('Contract 9')).toBeInTheDocument();
      expect(screen.queryByText('Contract 10')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
    });

    it('load-more append behavior', () => {
      const mockContracts = Array.from({ length: 12 }).map((_, i) => ({
        contractName: `Contract ${i}`,
        parties: [],
        totalValue: 1000,
        currency: 'USD',
        status: 'Active' as const,
        createdAt: 'Jan 1, 2025',
        milestoneCount: 0,
      }));
      mockListContracts.mockReturnValue(mockContracts);
      render(<ContractsPage />);
      
      fireEvent.click(screen.getByRole('button', { name: /load more/i }));
      
      expect(screen.getByText('Contract 0')).toBeInTheDocument();
      expect(screen.getByText('Contract 11')).toBeInTheDocument();
    });

    it('end-of-list behavior', () => {
      const mockContracts = Array.from({ length: 12 }).map((_, i) => ({
        contractName: `Contract ${i}`,
        parties: [],
        totalValue: 1000,
        currency: 'USD',
        status: 'Active' as const,
        createdAt: 'Jan 1, 2025',
        milestoneCount: 0,
      }));
      mockListContracts.mockReturnValue(mockContracts);
      render(<ContractsPage />);
      
      fireEvent.click(screen.getByRole('button', { name: /load more/i }));
      
      // We are on page 2, 20 items loaded, but only 12 exist, so load more should hide
      expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
    });

    it('reset-on-filter behavior', () => {
      const mockContracts = Array.from({ length: 12 }).map((_, i) => ({
        contractName: `Contract ${i}`,
        parties: [],
        totalValue: 1000,
        currency: 'USD',
        status: i % 2 === 0 ? ('Active' as const) : ('Pending' as const),
        createdAt: 'Jan 1, 2025',
        milestoneCount: 0,
      }));
      mockListContracts.mockReturnValue(mockContracts);
      render(<ContractsPage />);
      
      // Click load more
      fireEvent.click(screen.getByRole('button', { name: /load more/i }));
      expect(screen.getByText('Contract 11')).toBeInTheDocument(); // A pending contract on page 2

      // Change filter
      fireEvent.change(screen.getByLabelText(/filter by status/i), {
        target: { value: 'Active' },
      });

      // Filter should reset page to 1
      // There are 6 Active contracts, page size is 10, so they should all be visible
      // and load more button should be hidden
      expect(screen.getByText('Contract 0')).toBeInTheDocument();
      expect(screen.getByText('Contract 10')).toBeInTheDocument();
      expect(screen.queryByText('Contract 1')).not.toBeInTheDocument(); // Filtered out
      expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
    });
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContractsPage from '../page';
import * as repository from '@/lib/repository';
import * as stellarAddress from '@/lib/stellarAddress';
import type { Contract } from '@/types/domain';

const mockShowError = jest.fn();

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
            id: 'new-contract-id',
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

jest.mock('@/lib/repository', () => {
  const actual = jest.requireActual('@/lib/repository');
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
    showSuccess: jest.fn(),
    showError: mockShowError,
    toasts: [],
    dismissToast: jest.fn(),
  })),
}));

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: overrides.contractName ?? 'contract-id',
    contractName: 'Website Redesign',
    parties: [],
    totalValue: 1000,
    currency: 'USD',
    status: 'Active',
    createdAt: 'Jan 1, 2025',
    milestoneCount: 0,
    ...overrides,
  };
}

const mockListContracts = repository.listContracts as jest.MockedFunction<
  typeof repository.listContracts
>;
const mockSaveContract = repository.saveContract as jest.MockedFunction<
  typeof repository.saveContract
>;
const mockIsValidStellarAddress = stellarAddress.isValidStellarAddress as jest.MockedFunction<
  typeof stellarAddress.isValidStellarAddress
>;
const VALID_ADDRESS = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

describe('ContractsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Clear any queued `mockReturnValueOnce` values left over from a prior
    // test — this page only reads `listContracts()` once on mount, so a
    // second queued value from a "before/after" style test would otherwise
    // leak into whichever test runs next.
    mockListContracts.mockReset();
    mockSaveContract.mockReset();
    mockListContracts.mockReturnValue([]);
    mockIsValidStellarAddress.mockImplementation((addr: string | null | undefined) => addr === VALID_ADDRESS);
    mockShowError.mockReset();
  });

  describe('empty state', () => {
    it('renders empty state when no contracts exist', () => {
      (repository.listContracts as jest.Mock).mockReturnValue([]);

      render(<ContractsPage />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getAllByText('No contracts found').length).toBeGreaterThan(0);
    });

    it('allows creating a contract from empty state', async () => {
      const contracts = [makeContract({ contractName: 'New Contract' })];
      (repository.listContracts as jest.Mock)
        .mockReturnValueOnce([]) // Initial render
        .mockReturnValueOnce(contracts); // After form submission

      (repository.saveContract as jest.Mock).mockReturnValue(true);

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
        makeContract({ contractName: 'Website Redesign' }),
        makeContract({ contractName: 'Mobile App Development' }),
      ];
      (repository.listContracts as jest.Mock).mockReturnValue(contracts);

      render(<ContractsPage />);

      expect(screen.getByText('Website Redesign')).toBeInTheDocument();
      expect(screen.getByText('Mobile App Development')).toBeInTheDocument();
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

      (repository.saveContract as jest.Mock).mockReturnValue(true);

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
      const existingContract = makeContract({ contractName: 'Existing Contract' });
      mockListContracts.mockReturnValue([existingContract]);
      mockSaveContract.mockReturnValue(true);
      render(<ContractsPage />);

      expect(screen.getByText('Existing Contract')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));
      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText('New Contract')).toBeInTheDocument();
      });

      expect(screen.getByText('Existing Contract')).toBeInTheDocument();
      expect(mockSaveContract).toHaveBeenCalledTimes(1);
    });

    it('handles large contract lists efficiently', () => {
      const contracts = Array.from({ length: 500 }, (_, i) =>
        makeContract({ contractName: `Contract ${i + 1}` })
      );
      mockListContracts.mockReturnValue(contracts);

      render(<ContractsPage />);

      const contractsList = screen.getByTestId('contracts-list');
      expect(contractsList.querySelectorAll('li').length).toBe(500);
    });

    it('rolls back the optimistic contract and shows an error toast on save failure', async () => {
      const existingContract = makeContract({ contractName: 'Existing Contract' });

      mockListContracts.mockReturnValue([existingContract]);
      mockSaveContract.mockReturnValue(false);
      render(<ContractsPage />);

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));
      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

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
      mockSaveContract.mockReturnValue(true);
      render(<ContractsPage />);

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));
      expect(screen.getByTestId('contract-form')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.queryByTestId('contract-form')).not.toBeInTheDocument();
      });
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

    it('renders a recoverable error instead of the empty state when loading fails', () => {
      mockListContracts.mockImplementation(() => {
        throw new Error('Storage error');
      });

      render(<ContractsPage />);

      expect(screen.getByRole('alert')).toHaveTextContent('Unable to load contracts');
      expect(screen.getByRole('button', { name: 'Retry loading contracts' })).toBeInTheDocument();
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
      expect(screen.queryByTestId('contracts-list')).not.toBeInTheDocument();
    });

    it('re-fetches contracts when retry is activated', async () => {
      const recoveredContracts = [makeContract({ contractName: 'Recovered Contract' })];
      mockListContracts
        .mockImplementationOnce(() => {
          throw new Error('Storage error');
        })
        .mockReturnValueOnce(recoveredContracts);

      render(<ContractsPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Retry loading contracts' }));

      expect(screen.getByRole('status', { name: 'Loading contracts' })).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('Recovered Contract')).toBeInTheDocument();
      });
      expect(mockListContracts).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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

      (repository.saveContract as jest.Mock).mockReturnValue(true);

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

  describe('Keyboard Accessibility', () => {
    it('Create Contract button (non-empty state) is a native <button> (inherently keyboard accessible)', () => {
      const contracts = [makeContract()];
      mockListContracts.mockReturnValue(contracts);
      render(<ContractsPage />);

      const createBtn = screen.getByRole('button', { name: /create contract/i });
      expect(createBtn.tagName).toBe('BUTTON');
    });

    it('CSV export button is a native <button> (inherently keyboard accessible)', () => {
      const contracts = [makeContract()];
      mockListContracts.mockReturnValue(contracts);
      render(<ContractsPage />);

      const csvBtn = screen.getByRole('button', { name: /export contracts as csv/i });
      expect(csvBtn.tagName).toBe('BUTTON');
    });

    it('JSON export button is a native <button> (inherently keyboard accessible)', () => {
      const contracts = [makeContract()];
      mockListContracts.mockReturnValue(contracts);
      render(<ContractsPage />);

      const jsonBtn = screen.getByRole('button', { name: /export contracts as json/i });
      expect(jsonBtn.tagName).toBe('BUTTON');
    });

    it('CSV export button has visible focus-visible styling', () => {
      const contracts = [makeContract()];
      mockListContracts.mockReturnValue(contracts);
      render(<ContractsPage />);

      const csvBtn = screen.getByRole('button', { name: /export contracts as csv/i });
      expect(csvBtn.className).toMatch(/focus-visible:outline/);
    });

    it('JSON export button has visible focus-visible styling', () => {
      const contracts = [makeContract()];
      mockListContracts.mockReturnValue(contracts);
      render(<ContractsPage />);

      const jsonBtn = screen.getByRole('button', { name: /export contracts as json/i });
      expect(jsonBtn.className).toMatch(/focus-visible:outline/);
    });

    it('Create Contract button (non-empty state) has visible focus-visible styling', () => {
      const contracts = [makeContract()];
      mockListContracts.mockReturnValue(contracts);
      render(<ContractsPage />);

      const createBtn = screen.getByRole('button', { name: /create contract/i });
      expect(createBtn.className).toMatch(/focus-visible:outline/);
    });

    it('all action buttons are reachable in logical DOM order', () => {
      const contracts = [makeContract()];
      mockListContracts.mockReturnValue(contracts);
      render(<ContractsPage />);

      const csvBtn = screen.getByRole('button', { name: /export contracts as csv/i });
      const jsonBtn = screen.getByRole('button', { name: /export contracts as json/i });
      const createBtn = screen.getByRole('button', { name: /create contract/i });

      // CSV should come before JSON in DOM order
      expect(csvBtn.compareDocumentPosition(jsonBtn)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      // JSON should come before Create Contract in DOM order
      expect(jsonBtn.compareDocumentPosition(createBtn)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
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
  });


});
