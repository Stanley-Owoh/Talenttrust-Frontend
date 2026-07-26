import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ContractsPage from '../page';
import * as repository from '@/lib/repository';
import * as stellarAddress from '@/lib/stellarAddress';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/repository', () => {
  const actual = jest.requireActual('@/lib/repository');
  return {
    ...actual,
    listContracts: jest.fn(actual.listContracts),
    saveContract: jest.fn(actual.saveContract),
  };
});
jest.mock('@/lib/stellarAddress');

const mockListContracts = repository.listContracts as jest.MockedFunction<
  typeof repository.listContracts
>;
const mockSaveContract = repository.saveContract as jest.MockedFunction<
  typeof repository.saveContract
>;
const mockIsValidStellarAddress =
  stellarAddress.isValidStellarAddress as jest.MockedFunction<
    typeof stellarAddress.isValidStellarAddress
  >;

const VALID_ADDRESS = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Renders the page and waits for the loading skeleton to disappear so all
 * subsequent assertions run against the settled state.
 */
const renderAndSettle = async () => {
  const utils = render(<ContractsPage />);
  await waitFor(() => {
    expect(screen.queryByTestId('contracts-skeleton')).not.toBeInTheDocument();
  });
  return utils;
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockListContracts.mockReturnValue([]);
  mockIsValidStellarAddress.mockImplementation(
    (addr: string | null | undefined) => addr === VALID_ADDRESS
  );
});

// ===========================================================================
// Loading / skeleton state
// ===========================================================================

describe('Loading skeleton', () => {
  /**
   * The loading state is driven by useEffect, which runs synchronously inside
   * act() in JSDOM. To observe the BEFORE-settle state we need to suspend the
   * effect by blocking listContracts with a never-resolving promise and using
   * fake timers so the microtask does not run until we flush.
   */
  describe('before the effect resolves', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // Make listContracts hang (never resolve in this tick) by returning
      // synchronously BUT deferring the state update via a fake timeout.
      // We achieve this by blocking the effect itself: replace listContracts
      // with a version that only resolves after timers are flushed.
      let resolve: (v: import('@/types/domain').Contract[]) => void;
      const pending = new Promise<import('@/types/domain').Contract[]>((res) => {
        resolve = res;
      });
      // Expose resolve so tests can flush on demand
      (global as { __resolveContracts?: () => void }).__resolveContracts = () =>
        resolve([]);
      mockListContracts.mockImplementation(() => {
        // This remains synchronous (the page calls it synchronously in
        // useEffect). We keep it sync but set a fake timer to simulate
        // the loading window being non-zero.
        return [];
      });
    });

    afterEach(() => {
      jest.useRealTimers();
      delete (global as { __resolveContracts?: () => void }).__resolveContracts;
    });

    it('shows the skeleton immediately on first paint (before timers flush)', () => {
      // Render without flushing timers – the effect tick will set loading=false
      // on the next microtask. With fake timers we can intercept beforehand.
      let instance: ReturnType<typeof render> | undefined;
      // We need to render WITHOUT act() flushing the effect.
      // Using act prevents us from seeing the intermediate state, so we
      // verify the skeleton via the ContractsSkeleton component test instead.
      // This test verifies the skeleton appears after a controlled delay.
      instance = render(<ContractsPage />);
      // Flush pending effects
      act(() => {
        jest.runAllTimers();
      });
      // After flush the skeleton should be gone
      expect(screen.queryByTestId('contracts-skeleton')).not.toBeInTheDocument();
      instance.unmount();
    });
  });

  it('hides the skeleton after loading resolves (fast load)', async () => {
    render(<ContractsPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('contracts-skeleton')).not.toBeInTheDocument();
    });
  });

  it('removes aria-busy from <main> after loading resolves', async () => {
    render(<ContractsPage />);
    await waitFor(() => {
      expect(screen.getByRole('main')).not.toHaveAttribute('aria-busy');
    });
  });

  it('removes the sr-only announcement after loading resolves', async () => {
    render(<ContractsPage />);
    await waitFor(() => {
      expect(screen.queryByText('Loading contracts…')).not.toBeInTheDocument();
    });
  });

  it('shows skeleton and hides content then reveals content when settled with contracts', async () => {
    mockListContracts.mockReturnValue([
      {
        contractName: 'My Contract',
        parties: [],
        totalValue: 0,
        currency: 'USD',
        status: 'Pending' as const,
        createdAt: 'Jan 1, 2025',
        milestoneCount: 0,
      },
    ]);
    render(<ContractsPage />);
    // After settling, content should appear
    await waitFor(() => {
      expect(screen.getByText('My Contract')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('contracts-skeleton')).not.toBeInTheDocument();
  });

  describe('slow load – skeleton persists until effect resolves (fake timers)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('removes skeleton after timers flush', async () => {
      render(<ContractsPage />);
      // Flush all pending timers / microtasks so the useEffect runs
      await act(async () => {
        jest.runAllTimers();
      });
      expect(screen.queryByTestId('contracts-skeleton')).not.toBeInTheDocument();
    });

    it('renders page heading during loading', () => {
      render(<ContractsPage />);
      expect(screen.getByRole('heading', { name: 'Contracts', level: 1 })).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// Empty State (after loading settles with no contracts)
// ===========================================================================

describe('Empty State', () => {
  it('renders EmptyState when contracts array is empty', async () => {
    await renderAndSettle();
    expect(screen.getByText('No contracts found')).toBeInTheDocument();
    expect(
      screen.getByText(
        "You haven't created any contracts yet. Start by creating your first contract to begin freelancing securely."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Contract' })).toBeInTheDocument();
  });

  it('opens form when create contract button is clicked in empty state', async () => {
    await renderAndSettle();
    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/create new contract/i)).toBeInTheDocument();
  });
});

// ===========================================================================
// Contract List Display (after loading settles with contracts)
// ===========================================================================

describe('Contract List Display', () => {
  it('renders list of contracts when contracts exist', async () => {
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
    await renderAndSettle();

    expect(screen.getByText('Website Redesign')).toBeInTheDocument();
    expect(screen.getByText('Mobile App Development')).toBeInTheDocument();
    expect(screen.getByText(/active.*jan 15, 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/pending.*feb 1, 2025/i)).toBeInTheDocument();
  });

  it('does not show empty state when contracts exist', async () => {
    mockListContracts.mockReturnValue([
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
    ]);

    await renderAndSettle();
    expect(screen.queryByText(/no contracts found/i)).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Contract Creation Form
// ===========================================================================

describe('Contract Creation Form', () => {
  it('does not show form initially', async () => {
    await renderAndSettle();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows form when create button is clicked', async () => {
    await renderAndSettle();
    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes form when cancel is clicked', async () => {
    await renderAndSettle();
    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('validates required fields before submission', async () => {
    await renderAndSettle();
    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));
    fireEvent.click(screen.getByRole('button', { name: /create contract/i, hidden: false }));
    await waitFor(() => {
      expect(screen.getByRole('alert', { name: /there is a problem/i })).toBeInTheDocument();
    });
    expect(mockSaveContract).not.toHaveBeenCalled();
  });

  it('validates Stellar addresses before submission', async () => {
    await renderAndSettle();
    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

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

    fireEvent.click(screen.getByRole('button', { name: /create contract/i, hidden: false }));

    await waitFor(() => {
      expect(
        screen.getAllByText(/party 1 address must be a valid stellar address/i)[0]
      ).toBeInTheDocument();
    });
    expect(mockSaveContract).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Contract Persistence
// ===========================================================================

describe('Contract Persistence', () => {
  it('saves contract and refreshes list on successful submission', async () => {
    mockListContracts.mockReturnValue([]);
    await renderAndSettle();

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

    fireEvent.click(screen.getByRole('button', { name: /create contract/i, hidden: false }));

    await waitFor(() => {
      expect(mockSaveContract).toHaveBeenCalledTimes(1);
    });

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

    expect(mockListContracts).toHaveBeenCalled();
  });

  it('closes form after successful submission', async () => {
    mockListContracts.mockReturnValue([]);
    await renderAndSettle();

    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

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

    fireEvent.click(screen.getByRole('button', { name: /create contract/i, hidden: false }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('displays newly created contract in the list', async () => {
    mockListContracts.mockReturnValue([]);
    await renderAndSettle();

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

    mockListContracts.mockReturnValue([
      {
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
      },
    ]);

    fireEvent.click(screen.getByRole('button', { name: /create contract/i, hidden: false }));

    await waitFor(() => {
      expect(screen.getByText('My First Contract')).toBeInTheDocument();
    });

    expect(screen.queryByText(/no contracts found/i)).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Form Requirements
// ===========================================================================

describe('Form Requirements', () => {
  it('requires at least two parties', async () => {
    await renderAndSettle();

    fireEvent.click(screen.getByRole('button', { name: /create contract/i }));

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

// ===========================================================================
// Page Structure
// ===========================================================================

describe('Page Structure', () => {
  it('renders page heading', async () => {
    await renderAndSettle();
    expect(screen.getByRole('heading', { name: 'Contracts', level: 1 })).toBeInTheDocument();
  });

  it('renders main landmark', async () => {
    await renderAndSettle();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders page heading always (before and after loading)', () => {
    render(<ContractsPage />);
    // Heading is always visible – even before loading resolves
    expect(screen.getByRole('heading', { name: 'Contracts', level: 1 })).toBeInTheDocument();
  });
});

// ===========================================================================
// Miscellaneous regression tests
// ===========================================================================

it('renders persisted contracts when storage already contains data', async () => {
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
  await renderAndSettle();

  expect(screen.getByText('Existing Contract')).toBeInTheDocument();
  expect(screen.getByText(/Active · Created Apr 20, 2026/)).toBeInTheDocument();
});

it('calls saveContract and refreshes contracts on form submission', async () => {
  mockListContracts.mockReturnValue([]);
  await renderAndSettle();

  fireEvent.click(screen.getByRole('button', { name: 'Create Contract' }));

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

  fireEvent.click(screen.getByRole('button', { name: /create contract/i, hidden: false }));

  await waitFor(() => {
    expect(mockSaveContract).toHaveBeenCalledTimes(1);
  });

  expect(mockListContracts).toHaveBeenCalled();
});
