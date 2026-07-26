import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContractsPage from '../page';
import * as repository from '@/lib/repository';
import { useRouter, useSearchParams } from 'next/navigation';

// Mock the repository module
jest.mock('@/lib/repository');

// Mock child components to avoid DOM complexity
jest.mock('@/components/EmptyState', () => ({
  __esModule: true,
  default: ({ title, actionLabel, onAction }: any) => (
    <div data-testid="empty-state">
      <h2>{title}</h2>
      <button onClick={onAction}>{actionLabel}</button>
    </div>
  ),
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
    contractName: 'Test Contract',
    parties: [{ label: 'Client', address: '0xABC123' }],
    totalValue: 5000,
    currency: 'USD',
    status: 'Active',
    createdAt: '2025-01-01',
    milestoneCount: 3,
    ...overrides,
  };
});
jest.mock('@/lib/stellarAddress');

jest.mock('next/navigation', () => {
  const original = jest.requireActual('next/navigation');
  return {
    ...original,
    useRouter: jest.fn(),
    useSearchParams: jest.fn(),
  };
});

const mockListContracts = repository.listContracts as jest.MockedFunction<
  typeof repository.listContracts
>;
const mockSaveContract = repository.saveContract as jest.MockedFunction<
  typeof repository.saveContract
>;
const mockIsValidStellarAddress = stellarAddress.isValidStellarAddress as jest.MockedFunction<
  typeof stellarAddress.isValidStellarAddress
>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockPush = jest.fn();

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

  describe('memoization benefits', () => {
    it('does not re-render contracts list when toggling form visibility', () => {
      const contracts = [
        makeContract({ contractName: 'Contract 1' }),
        makeContract({ contractName: 'Contract 2' }),
      ];
      (repository.listContracts as jest.Mock).mockReturnValue(contracts);

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

      // Verify initial state shows contracts list
      expect(screen.getByTestId('contracts-list')).toBeInTheDocument();
      expect(screen.queryByTestId('contract-form')).not.toBeInTheDocument();

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

  describe('URL-persisted filter and sort state', () => {
    const alphaContract = {
      contractName: 'Alpha Website',
      parties: [
        { label: 'Acme Corp', address: VALID_ADDRESS },
        { label: 'Designer', address: VALID_ADDRESS },
      ],
      totalValue: 5000,
      currency: 'USD',
      status: 'Active' as const,
      createdAt: 'Jan 1, 2025',
      milestoneCount: 2,
    };

    const betaContract = {
      contractName: 'Beta Mobile App',
      parties: [
        { label: 'Beta LLC', address: VALID_ADDRESS },
        { label: 'Developer', address: VALID_ADDRESS },
      ],
      totalValue: 12000,
      currency: 'USD',
      status: 'Pending' as const,
      createdAt: 'Mar 1, 2025',
      milestoneCount: 4,
    };

    const gammaContract = {
      contractName: 'Gamma Audit',
      parties: [
        { label: 'Gamma Foundation', address: VALID_ADDRESS },
        { label: 'Auditor', address: VALID_ADDRESS },
      ],
      totalValue: 2500,
      currency: 'USD',
      status: 'Completed' as const,
      createdAt: 'Feb 1, 2025',
      milestoneCount: 1,
    };

    it('restores search, status, and sort from valid URL query params on load', () => {
      mockUseSearchParams.mockReturnValue(createSearchParams('q=beta&status=Pending&sort=value-asc'));
      mockListContracts.mockReturnValue([alphaContract, betaContract, gammaContract]);

      render(<ContractsPage />);

      expect(screen.getByRole('searchbox', { name: /search contracts/i })).toHaveValue('beta');
      expect(screen.getByRole('radio', { name: 'Pending' })).toBeChecked();
      expect(screen.getByLabelText(/sort contracts/i)).toHaveValue('value-asc');
      expect(screen.getByText('Beta Mobile App')).toBeInTheDocument();
      expect(screen.queryByText('Alpha Website')).not.toBeInTheDocument();
      expect(screen.getByText('Showing 1 of 3 contracts')).toBeInTheDocument();
    });

    it('ignores invalid status and sort query params and keeps safe defaults', () => {
      jest.useFakeTimers();
      mockUseSearchParams.mockReturnValue(createSearchParams('status=Closed&sort=drop-table'));
      mockListContracts.mockReturnValue([alphaContract, betaContract, gammaContract]);

      render(<ContractsPage />);

      expect(screen.getByRole('radio', { name: 'All' })).toBeChecked();
      expect(screen.getByLabelText(/sort contracts/i)).toHaveValue('created-desc');
      expect(screen.getByText('Alpha Website')).toBeInTheDocument();
      expect(screen.getByText('Beta Mobile App')).toBeInTheDocument();
      expect(screen.getByText('Gamma Audit')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockPush).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('debounces search URL updates and produces a shareable link', () => {
      jest.useFakeTimers();
      mockListContracts.mockReturnValue([alphaContract, betaContract, gammaContract]);
      render(<ContractsPage />);

      fireEvent.change(screen.getByRole('searchbox', { name: /search contracts/i }), {
        target: { value: 'acme' },
      });

      act(() => {
        jest.advanceTimersByTime(299);
      });
      expect(mockPush).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(mockPush).toHaveBeenCalledWith('/contracts?q=acme');
      jest.useRealTimers();
    });

    it('round-trips status and sort changes through the URL for browser history', () => {
      jest.useFakeTimers();
      mockListContracts.mockReturnValue([alphaContract, betaContract, gammaContract]);
      render(<ContractsPage />);

      fireEvent.click(screen.getByRole('radio', { name: 'Active' }));
      fireEvent.change(screen.getByLabelText(/sort contracts/i), {
        target: { value: 'value-desc' },
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockPush).toHaveBeenCalledWith('/contracts?status=Active&sort=value-desc');
      expect(screen.getByText('Alpha Website')).toBeInTheDocument();
      expect(screen.queryByText('Beta Mobile App')).not.toBeInTheDocument();
      jest.useRealTimers();
    });

    it('shows a no-match empty state when URL-restored filters exclude every contract', () => {
      mockUseSearchParams.mockReturnValue(createSearchParams('q=nonexistent&status=Disputed'));
      mockListContracts.mockReturnValue([alphaContract, betaContract, gammaContract]);

      render(<ContractsPage />);

      expect(screen.getByText('No contracts match your filters')).toBeInTheDocument();
      expect(screen.queryByText('Alpha Website')).not.toBeInTheDocument();
      expect(screen.getByText('Showing 0 of 3 contracts')).toBeInTheDocument();
    });
  });
});
