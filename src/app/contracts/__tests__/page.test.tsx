import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContractsPage from '../page';
import * as repository from '@/lib/repository';

import * as stellarAddress from '@/lib/stellarAddress';


// Mock dependencies
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

const VALID_ADDRESS = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

describe('ContractsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockListContracts.mockReturnValue([]);
    mockIsValidStellarAddress.mockImplementation((addr: string | null | undefined) => addr === VALID_ADDRESS);
  });

  describe('Empty State', () => {
    it('renders EmptyState when contracts array is empty', () => {
      render(<ContractsPage />);

      expect(screen.getByText('No contracts found')).toBeInTheDocument();
      expect(screen.getByText('You haven\'t created any contracts yet. Start by creating your first contract to begin freelancing securely.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Contract' })).toBeInTheDocument();
    });

    it('opens form when create contract button is clicked in empty state', () => {
      mockListContracts.mockReturnValue([]);
      render(<ContractsPage />);

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/create new contract/i)).toBeInTheDocument();
    });
  });

  describe('Contract List Display', () => {
    it('renders list of contracts when contracts exist', () => {
      const mockContracts = [
        {
          contractName: 'Website Redesign',
          parties: [
            { label: 'Client', address: VALID_ADDRESS },
            { label: 'Freelancer', address: VALID_ADDRESS },
          ],
          totalValue: 5000,
          currency: 'USD',
          status: 'Active' as const,
          createdAt: 'Jan 15, 2025',
          milestoneCount: 3,
        },
        {
          contractName: 'Mobile App Development',
          parties: [
            { label: 'Client', address: VALID_ADDRESS },
            { label: 'Developer', address: VALID_ADDRESS },
          ],
          totalValue: 10000,
          currency: 'EUR',
          status: 'Pending' as const,
          createdAt: 'Feb 1, 2025',
          milestoneCount: 5,
        },
      ];

      mockListContracts.mockReturnValue(mockContracts);
      render(<ContractsPage />);

      expect(screen.getByText('Website Redesign')).toBeInTheDocument();
      expect(screen.getByText('Mobile App Development')).toBeInTheDocument();
      expect(screen.getByText(/active.*jan 15, 2025/i)).toBeInTheDocument();
      expect(screen.getByText(/pending.*feb 1, 2025/i)).toBeInTheDocument();
    });

    it('does not show empty state when contracts exist', () => {
      const mockContracts = [
        {
          contractName: 'Test Contract',
          parties: [
            { label: 'Client', address: VALID_ADDRESS },
            { label: 'Freelancer', address: VALID_ADDRESS },
          ],
          totalValue: 1000,
          currency: 'USD',
          status: 'Pending' as const,
          createdAt: 'Jan 1, 2025',
          milestoneCount: 1,
        },
      ];

      mockListContracts.mockReturnValue(mockContracts);
      render(<ContractsPage />);

      expect(screen.queryByText(/no contracts found/i)).not.toBeInTheDocument();
    });
  });

  describe('Contract Creation Form', () => {
    it('does not show form initially', () => {
      mockListContracts.mockReturnValue([]);
      render(<ContractsPage />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows form when create button is clicked', () => {
      mockListContracts.mockReturnValue([]);
      render(<ContractsPage />);

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes form when cancel is clicked', async () => {
      mockListContracts.mockReturnValue([]);
      render(<ContractsPage />);

      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('validates required fields before submission', async () => {
      mockListContracts.mockReturnValue([]);
      render(<ContractsPage />);

      // Open form
      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      // Try to submit empty form
      fireEvent.click(screen.getByRole('button', { name: /create contract/i, hidden: false }));

      await waitFor(() => {
        expect(screen.getByRole('alert', { name: /there is a problem/i })).toBeInTheDocument();
      });

      expect(mockSaveContract).not.toHaveBeenCalled();
    });

    it('validates Stellar addresses before submission', async () => {
      mockListContracts.mockReturnValue([]);
      render(<ContractsPage />);

      // Open form
      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      // Fill in form with invalid address
      fireEvent.change(screen.getByLabelText(/contract name/i), {
        target: { value: 'Test Contract' },
      });
      fireEvent.change(screen.getByLabelText(/total value/i), {
        target: { value: '5000' },
      });

      const partyLabels = screen.getAllByPlaceholderText(/e\.g\., client, freelancer/i);
      const partyAddresses = screen.getAllByPlaceholderText(/GXXXXXXXXXX/i);

      fireEvent.change(partyLabels[0], { target: { value: 'Client' } });
      fireEvent.change(partyAddresses[0], { target: { value: 'INVALID_ADDRESS' } });

      fireEvent.change(partyLabels[1], { target: { value: 'Freelancer' } });
      fireEvent.change(partyAddresses[1], { target: { value: VALID_ADDRESS } });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /create contract/i, hidden: false }));

      await waitFor(() => {
        expect(screen.getAllByText(/party 1 address must be a valid stellar address/i)[0]).toBeInTheDocument();
      });
      expect(mockSaveContract).not.toHaveBeenCalled();
    });
  });

  describe('Contract Persistence', () => {
    it('saves contract and refreshes list on successful submission', async () => {
      // Start with empty list
      mockListContracts.mockReturnValue([]);
      render(<ContractsPage />);

      // Open form
      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      // Fill in valid form data
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

      // Mock the updated list after save
      const newContract = {
        contractName: 'New Contract',
        parties: [
          { label: 'Client Corp', address: VALID_ADDRESS },
          { label: 'Designer', address: VALID_ADDRESS },
        ],
        totalValue: 7500,
        currency: 'EUR',
        status: 'Pending' as const,
        createdAt: 'Jan 1, 2025',
        milestoneCount: 0,
      };
      mockListContracts.mockReturnValue([newContract]);

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /create contract/i, hidden: false }));

      await waitFor(() => {
        expect(mockSaveContract).toHaveBeenCalledTimes(1);
      });

      // Verify saveContract was called with correct data
      expect(mockSaveContract).toHaveBeenCalledWith(
        expect.objectContaining({
          contractName: 'New Contract',
          totalValue: 7500,
          currency: 'EUR',
          status: 'Pending',
          milestoneCount: 0,
          parties: [
            { label: 'Client Corp', address: VALID_ADDRESS },
            { label: 'Designer', address: VALID_ADDRESS },
          ],
        })
      );

      // Verify listContracts was called to refresh
      expect(mockListContracts).toHaveBeenCalled();
    });

    it('closes form after successful submission', async () => {
      mockListContracts.mockReturnValue([]);
      render(<ContractsPage />);

      // Open form
      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Fill in valid form data
      fireEvent.change(screen.getByLabelText(/contract name/i), {
        target: { value: 'Test Contract' },
      });
      fireEvent.change(screen.getByLabelText(/total value/i), {
        target: { value: '1000' },
      });

      const partyLabels = screen.getAllByPlaceholderText(/e\.g\., client, freelancer/i);
      const partyAddresses = screen.getAllByPlaceholderText(/GXXXXXXXXXX/i);

      fireEvent.change(partyLabels[0], { target: { value: 'Party 1' } });
      fireEvent.change(partyAddresses[0], { target: { value: VALID_ADDRESS } });

      fireEvent.change(partyLabels[1], { target: { value: 'Party 2' } });
      fireEvent.change(partyAddresses[1], { target: { value: VALID_ADDRESS } });

      // Mock updated list
      mockListContracts.mockReturnValue([
        {
          contractName: 'Test Contract',
          parties: [
            { label: 'Party 1', address: VALID_ADDRESS },
            { label: 'Party 2', address: VALID_ADDRESS },
          ],
          totalValue: 1000,
          currency: 'USD',
          status: 'Pending' as const,
          createdAt: 'Jan 1, 2025',
          milestoneCount: 0,
        },
      ]);

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /create contract/i, hidden: false }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('displays newly created contract in the list', async () => {
      // Start with empty list
      mockListContracts.mockReturnValue([]);
      render(<ContractsPage />);

      // Open and submit form
      fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

      fireEvent.change(screen.getByLabelText(/contract name/i), {
        target: { value: 'My First Contract' },
      });
      fireEvent.change(screen.getByLabelText(/total value/i), {
        target: { value: '2500' },
      });

      const partyLabels = screen.getAllByPlaceholderText(/e\.g\., client, freelancer/i);
      const partyAddresses = screen.getAllByPlaceholderText(/GXXXXXXXXXX/i);

      fireEvent.change(partyLabels[0], { target: { value: 'Client' } });
      fireEvent.change(partyAddresses[0], { target: { value: VALID_ADDRESS } });

      fireEvent.change(partyLabels[1], { target: { value: 'Worker' } });
      fireEvent.change(partyAddresses[1], { target: { value: VALID_ADDRESS } });

      // Update mock to return the new contract
      const createdContract = {
        contractName: 'My First Contract',
        parties: [
          { label: 'Client', address: VALID_ADDRESS },
          { label: 'Worker', address: VALID_ADDRESS },
        ],
        totalValue: 2500,
        currency: 'USD',
        status: 'Pending' as const,
        createdAt: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        milestoneCount: 0,
      };
      mockListContracts.mockReturnValue([createdContract]);

      fireEvent.click(screen.getByRole('button', { name: /create contract/i, hidden: false }));

      await waitFor(() => {
        expect(screen.getByText('My First Contract')).toBeInTheDocument();
      });

      expect(screen.queryByText(/no contracts found/i)).not.toBeInTheDocument();
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

  describe('Bulk Selection', () => {
    const mockContracts = [
      {
        contractName: 'Contract 1',
        parties: [
          { label: 'Client', address: VALID_ADDRESS },
          { label: 'Freelancer', address: VALID_ADDRESS },
        ],
        totalValue: 5000,
        currency: 'USD',
        status: 'Active' as const,
        createdAt: 'Jan 15, 2025',
        milestoneCount: 3,
      },
      {
        contractName: 'Contract 2',
        parties: [
          { label: 'Client', address: VALID_ADDRESS },
          { label: 'Developer', address: VALID_ADDRESS },
        ],
        totalValue: 10000,
        currency: 'EUR',
        status: 'Pending' as const,
        createdAt: 'Feb 1, 2025',
        milestoneCount: 5,
      },
      {
        contractName: 'Contract 3',
        parties: [
          { label: 'Client', address: VALID_ADDRESS },
          { label: 'Designer', address: VALID_ADDRESS },
        ],
        totalValue: 7500,
        currency: 'USD',
        status: 'Completed' as const,
        createdAt: 'Mar 1, 2025',
        milestoneCount: 2,
      },
    ];

    beforeEach(() => {
      mockListContracts.mockReturnValue(mockContracts);
    });

    it('selects a single contract when checkbox is clicked', () => {
      render(<ContractsPage />);

      const checkboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
      fireEvent.change(checkboxes[0], { target: { checked: true } });

      expect(checkboxes[0]).toBeChecked();
    });

    it('displays bulk action toolbar when contracts are selected', async () => {
      render(<ContractsPage />);

      expect(screen.queryByRole('region', { name: /bulk actions/i })).not.toBeInTheDocument();

      const checkboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
      await userEvent.click(checkboxes[0]);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: /bulk actions/i })).toBeInTheDocument();
      });
    });

    it('hides bulk action toolbar when no contracts are selected', async () => {
      render(<ContractsPage />);

      const checkboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
      await userEvent.click(checkboxes[0]);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: /bulk actions/i })).toBeInTheDocument();
      });

      await userEvent.click(checkboxes[0]);

      await waitFor(() => {
        expect(screen.queryByRole('region', { name: /bulk actions/i })).not.toBeInTheDocument();
      });
    });

    it('shows correct count of selected contracts', async () => {
      render(<ContractsPage />);

      const checkboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
      await userEvent.click(checkboxes[0]);
      await userEvent.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByText('2 of 3 selected')).toBeInTheDocument();
        expect(screen.getByText('1 remaining')).toBeInTheDocument();
      });
    });
  });

  describe('Bulk Actions - Select All', () => {
    const mockContracts = [
      {
        contractName: 'Contract 1',
        parties: [
          { label: 'Client', address: VALID_ADDRESS },
          { label: 'Freelancer', address: VALID_ADDRESS },
        ],
        totalValue: 5000,
        currency: 'USD',
        status: 'Active' as const,
        createdAt: 'Jan 15, 2025',
        milestoneCount: 3,
      },
      {
        contractName: 'Contract 2',
        parties: [
          { label: 'Client', address: VALID_ADDRESS },
          { label: 'Developer', address: VALID_ADDRESS },
        ],
        totalValue: 10000,
        currency: 'EUR',
        status: 'Pending' as const,
        createdAt: 'Feb 1, 2025',
        milestoneCount: 5,
      },
    ];

    beforeEach(() => {
      mockListContracts.mockReturnValue(mockContracts);
    });

    it('selects all contracts when Select All button is clicked', async () => {
      render(<ContractsPage />);

      const checkboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
      await userEvent.click(checkboxes[0]);

      fireEvent.click(screen.getByRole('button', { name: /select all/i }));

      await waitFor(() => {
        const updatedCheckboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
        updatedCheckboxes.forEach((checkbox) => {
          expect(checkbox).toBeChecked();
        });
      });

      expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
    });

    it('shows all contracts selected in toolbar', () => {
      render(<ContractsPage />);

      const checkboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
      fireEvent.change(checkboxes[0], { target: { checked: true } });

      fireEvent.click(screen.getByRole('button', { name: /select all/i }));

      expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
      expect(screen.getByText('0 remaining')).toBeInTheDocument();
    });
  });

  describe('Bulk Actions - Clear Selection', () => {
    const mockContracts = [
      {
        contractName: 'Contract 1',
        parties: [
          { label: 'Client', address: VALID_ADDRESS },
          { label: 'Freelancer', address: VALID_ADDRESS },
        ],
        totalValue: 5000,
        currency: 'USD',
        status: 'Active' as const,
        createdAt: 'Jan 15, 2025',
        milestoneCount: 3,
      },
      {
        contractName: 'Contract 2',
        parties: [
          { label: 'Client', address: VALID_ADDRESS },
          { label: 'Developer', address: VALID_ADDRESS },
        ],
        totalValue: 10000,
        currency: 'EUR',
        status: 'Pending' as const,
        createdAt: 'Feb 1, 2025',
        milestoneCount: 5,
      },
    ];

    beforeEach(() => {
      mockListContracts.mockReturnValue(mockContracts);
    });

    it('clears all selections when Clear button is clicked', () => {
      render(<ContractsPage />);

      const checkboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
      fireEvent.change(checkboxes[0], { target: { checked: true } });
      fireEvent.change(checkboxes[1], { target: { checked: true } });

      expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /clear/i }));

      const updatedCheckboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
      updatedCheckboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });

      expect(screen.queryByRole('region', { name: /bulk actions/i })).not.toBeInTheDocument();
    });
  });

  describe('Bulk Actions - Delete', () => {
    const mockContracts = [
      {
        contractName: 'Contract 1',
        parties: [
          { label: 'Client', address: VALID_ADDRESS },
          { label: 'Freelancer', address: VALID_ADDRESS },
        ],
        totalValue: 5000,
        currency: 'USD',
        status: 'Active' as const,
        createdAt: 'Jan 15, 2025',
        milestoneCount: 3,
      },
      {
        contractName: 'Contract 2',
        parties: [
          { label: 'Client', address: VALID_ADDRESS },
          { label: 'Developer', address: VALID_ADDRESS },
        ],
        totalValue: 10000,
        currency: 'EUR',
        status: 'Pending' as const,
        createdAt: 'Feb 1, 2025',
        milestoneCount: 5,
      },
    ];

    beforeEach(() => {
      mockListContracts.mockReturnValue(mockContracts);
      mockDeleteContract.mockReturnValue(true);
    });

    it('shows confirmation dialog before deleting', () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      render(<ContractsPage />);

      const checkboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
      fireEvent.change(checkboxes[0], { target: { checked: true } });

      fireEvent.click(screen.getByRole('button', { name: /delete 1/i }));

      expect(confirmSpy).toHaveBeenCalledWith('Delete 1 contract?');
      confirmSpy.mockRestore();
    });

    it('deletes selected contract when user confirms', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      mockListContracts.mockReturnValue([mockContracts[1]]);

      render(<ContractsPage />);

      const checkboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
      fireEvent.change(checkboxes[0], { target: { checked: true } });

      fireEvent.click(screen.getByRole('button', { name: /delete 1/i }));

      expect(mockDeleteContract).toHaveBeenCalledWith('Contract 1');
    });

    it('does not delete when user cancels', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      render(<ContractsPage />);

      const checkboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
      fireEvent.change(checkboxes[0], { target: { checked: true } });

      fireEvent.click(screen.getByRole('button', { name: /delete 1/i }));

      expect(mockDeleteContract).not.toHaveBeenCalled();
    });

    it('refreshes contract list after deletion', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      mockListContracts.mockReturnValue([mockContracts[1]]);

      render(<ContractsPage />);

      const checkboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
      fireEvent.change(checkboxes[0], { target: { checked: true } });

      fireEvent.click(screen.getByRole('button', { name: /delete 1/i }));

      await waitFor(() => {
        expect(mockListContracts).toHaveBeenCalled();
      });

      expect(screen.getByText('Contract 2')).toBeInTheDocument();
      expect(screen.queryByText('Contract 1')).not.toBeInTheDocument();
    });

    it('clears selection after deletion', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      mockListContracts.mockReturnValue([mockContracts[1]]);

      render(<ContractsPage />);

      const checkboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
      fireEvent.change(checkboxes[0], { target: { checked: true } });

      fireEvent.click(screen.getByRole('button', { name: /delete 1/i }));

      expect(screen.queryByRole('region', { name: /bulk actions/i })).not.toBeInTheDocument();
    });
  });

  describe('Bulk Actions - Export', () => {
    const mockContracts = [
      {
        contractName: 'Contract 1',
        parties: [
          { label: 'Client', address: VALID_ADDRESS },
          { label: 'Freelancer', address: VALID_ADDRESS },
        ],
        totalValue: 5000,
        currency: 'USD',
        status: 'Active' as const,
        createdAt: 'Jan 15, 2025',
        milestoneCount: 3,
      },
      {
        contractName: 'Contract 2',
        parties: [
          { label: 'Client', address: VALID_ADDRESS },
          { label: 'Developer', address: VALID_ADDRESS },
        ],
        totalValue: 10000,
        currency: 'EUR',
        status: 'Pending' as const,
        createdAt: 'Feb 1, 2025',
        milestoneCount: 5,
      },
    ];

    beforeEach(() => {
      mockListContracts.mockReturnValue(mockContracts);
      // Mock URL and download functionality
      URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      URL.revokeObjectURL = jest.fn();
    });

    it('exports selected contracts as JSON', () => {
      render(<ContractsPage />);

      const checkboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
      fireEvent.change(checkboxes[0], { target: { checked: true } });
      fireEvent.change(checkboxes[1], { target: { checked: true } });

      fireEvent.click(screen.getByRole('button', { name: /export 2/i }));

      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('exports only selected contracts', () => {
      render(<ContractsPage />);

      const checkboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
      fireEvent.change(checkboxes[0], { target: { checked: true } });

      fireEvent.click(screen.getByRole('button', { name: /export 1/i }));

      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('Bulk Actions - Partial Select', () => {
    const mockContracts = [
      {
        contractName: 'Contract 1',
        parties: [
          { label: 'Client', address: VALID_ADDRESS },
          { label: 'Freelancer', address: VALID_ADDRESS },
        ],
        totalValue: 5000,
        currency: 'USD',
        status: 'Active' as const,
        createdAt: 'Jan 15, 2025',
        milestoneCount: 3,
      },
      {
        contractName: 'Contract 2',
        parties: [
          { label: 'Client', address: VALID_ADDRESS },
          { label: 'Developer', address: VALID_ADDRESS },
        ],
        totalValue: 10000,
        currency: 'EUR',
        status: 'Pending' as const,
        createdAt: 'Feb 1, 2025',
        milestoneCount: 5,
      },
      {
        contractName: 'Contract 3',
        parties: [
          { label: 'Client', address: VALID_ADDRESS },
          { label: 'Designer', address: VALID_ADDRESS },
        ],
        totalValue: 7500,
        currency: 'USD',
        status: 'Completed' as const,
        createdAt: 'Mar 1, 2025',
        milestoneCount: 2,
      },
    ];

    beforeEach(() => {
      mockListContracts.mockReturnValue(mockContracts);
    });

    it('allows partial selection of contracts', () => {
      render(<ContractsPage />);

      const checkboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
      fireEvent.change(checkboxes[0], { target: { checked: true } });
      fireEvent.change(checkboxes[2], { target: { checked: true } });

      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
      expect(checkboxes[2]).toBeChecked();

      expect(screen.getByText('2 of 3 selected')).toBeInTheDocument();
    });

    it('allows toggling individual selections', () => {
      render(<ContractsPage />);

      const checkboxes = screen.getAllByRole('checkbox', { name: /select contract/i });

      // Select all
      fireEvent.change(checkboxes[0], { target: { checked: true } });
      fireEvent.change(checkboxes[1], { target: { checked: true } });
      fireEvent.change(checkboxes[2], { target: { checked: true } });

      expect(screen.getByText('3 of 3 selected')).toBeInTheDocument();

      // Deselect one
      fireEvent.change(checkboxes[1], { target: { checked: false } });

      const updatedCheckboxes = screen.getAllByRole('checkbox', { name: /select contract/i });
      expect(updatedCheckboxes[0]).toBeChecked();
      expect(updatedCheckboxes[1]).not.toBeChecked();
      expect(updatedCheckboxes[2]).toBeChecked();

      expect(screen.getByText('2 of 3 selected')).toBeInTheDocument();
    });
  });
});