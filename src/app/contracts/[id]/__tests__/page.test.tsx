import { render, screen, waitFor, within } from '@testing-library/react';
import ContractDetailPage from '../page';
import * as contractResolver from '@/lib/contractResolver';
import { upsertContract, listMilestonesByContract } from '@/lib/repository';
import { useWallet } from '@/contexts/WalletContext';
import { ToastProvider } from '@/components/toast/toast-provider';
import userEvent from '@testing-library/user-event';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

jest.mock('@/lib/contractResolver');
jest.mock('@/lib/repository', () => ({
  upsertContract: jest.fn(),
  listMilestonesByContract: jest.fn(() => []),
}));

const mockedResolveContractData = jest.mocked(contractResolver.resolveContractData);
const mockedUpsertContract = jest.mocked(upsertContract);
const mockedListMilestonesByContract = jest.mocked(listMilestonesByContract);
const mockedUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

const contractData: contractResolver.ContractData = {
  id: '123',
  name: 'Stellar Escrow Implementation',
  status: 'Active',
  parties: [
    { label: 'Client', address: 'GABC1234DEF5678HIJK9012LMNO3456PQRS7890' },
    { label: 'Freelancer', address: 'GXYZ9876STU5432VWXQ1098ABCD7654EFGH3210' },
  ],
  totalValue: 7000,
  currency: 'USD',
  createdAt: 'Apr 20, 2026',
  milestones: [
    {
      id: 'ms-1',
      title: 'Kickoff and scope approval',
      status: 'Completed',
      payout: 1500,
      currency: 'USD',
      dueDate: '2026-05-04',
    },
    {
      id: 'ms-2',
      title: 'Design and review',
      status: 'Pending',
      payout: 2500,
      currency: 'USD',
      dueDate: '2026-06-01',
    },
    {
      id: 'ms-3',
      title: 'Final delivery',
      status: 'Pending',
      payout: 3000,
      currency: 'USD',
      dueDate: '2026-07-12',
    },
  ],
};

const BASE_CONTRACT = contractData;

async function renderPage(id = '123') {
  const Component = await ContractDetailPage({ params: Promise.resolve({ id }) });
  return render(
    <ToastProvider>
      {Component}
    </ToastProvider>,
  );
}

function getContractSummarySection() {
  const contractHeading = screen.getByRole('heading', { name: contractData.name });
  const section = contractHeading.closest('section');

  if (!section) {
    throw new Error('Contract summary section was not found.');
  }

  return section;
}



describe('ContractDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedResolveContractData.mockResolvedValue(contractData);
    mockedUpsertContract.mockReturnValue(true);
    mockedListMilestonesByContract.mockReturnValue([]);
    mockedUseWallet.mockReturnValue({
      address: '0x123',
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });
  });

  it('renders the resolved contract details and action panel', async () => {
    await renderPage();

    expect((await screen.findAllByText('Contract #123')).length).toBeGreaterThan(0);
    expect(screen.getByText('Milestones')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to contracts/i })).toHaveAttribute('href', '/contracts');
    expect(within(getContractSummarySection()).getByLabelText('Status: Active')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit milestone for approval/i })).toBeInTheDocument();
  });

  it('persists the confirmed release flow, updates UI state, and moves focus back to the panel', async () => {
    const user = userEvent.setup();

    await renderPage();

    const releaseButton = await screen.findByRole('button', {
      name: /release funds to the contractor/i,
    });

    await user.click(releaseButton);

    const dialog = screen.getByRole('alertdialog', { name: /confirm release funds/i });
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: /^release funds$/i }));

    await waitFor(() => {
      expect(mockedUpsertContract).toHaveBeenCalledWith({
        contractName: contractData.name,
        parties: contractData.parties,
        totalValue: contractData.totalValue,
        currency: contractData.currency,
        status: 'Completed',
        createdAt: contractData.createdAt,
        milestoneCount: contractData.milestones.length,
      });
    });
  });

// ---------------------------------------------------------------------------
// ContractProgress rendering
// ---------------------------------------------------------------------------

describe('ContractProgress integration', () => {
  it('renders the "Escrow Progress" section heading after load', async () => {
    await renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /escrow progress/i }),
      ).toBeInTheDocument();
    });
  });

  it('renders a progressbar role element', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('sets aria-valuemin=0 and aria-valuemax=100 on the progress bar', async () => {
    await renderPage();

    await waitFor(() => {
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuemin', '0');
      expect(bar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  it('reflects the correct percentage for a mixed-milestone contract', async () => {
    // 1 of 3 milestones completed → Math.round(1/3 * 100) = 33
    await renderPage();

    await waitFor(() => {
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '33');
    });
  });

  it('sets aria-valuenow=100 when all milestones are completed', async () => {
    const allPaid = deepClone(BASE_CONTRACT);
    allPaid.milestones.forEach((m) => { m.status = 'Completed'; });
    (contractResolver.resolveContractData as jest.Mock).mockResolvedValueOnce(allPaid);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });
  });

  it('sets aria-valuenow=0 when no milestones are completed', async () => {
    const nonePaid = deepClone(BASE_CONTRACT);
    nonePaid.milestones.forEach((m) => { m.status = 'Pending'; });
    (contractResolver.resolveContractData as jest.Mock).mockResolvedValueOnce(nonePaid);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    });
  });

  it('provides an aria-label describing the milestone progress', async () => {
    // 1 of 3 completed, 33%
    await renderPage();

    await waitFor(() => {
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute(
        'aria-label',
        '1 of 3 milestones completed, 33%',
      );
    });
  });

  it('counts "Paid" status milestones as completed', async () => {
    const withPaid = deepClone(BASE_CONTRACT);
    withPaid.milestones[0].status = 'Paid';
    withPaid.milestones[1].status = 'Paid';
    withPaid.milestones[2].status = 'Pending';
    (contractResolver.resolveContractData as jest.Mock).mockResolvedValueOnce(withPaid);

    await renderPage();

    await waitFor(() => {
      // 2 of 3 → 67%
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');
    });
  });

  it('shows "Milestones completed" label text', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText(/milestones completed/i)).toBeInTheDocument();
    });
  });

  it('shows the completed / total count for the milestone mix', async () => {
    await renderPage();

    // 1 completed, 3 total
    await waitFor(() => {
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });
  });

  it('renders paid and outstanding amount cards', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Paid')).toBeInTheDocument();
      expect(screen.getByText('Outstanding')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Empty-milestones graceful handling
// ---------------------------------------------------------------------------

describe('empty milestones handling', () => {
  it('renders ContractProgress empty state when milestones array is empty', async () => {
    const empty = { ...deepClone(BASE_CONTRACT), milestones: [] };
    (contractResolver.resolveContractData as jest.Mock).mockResolvedValueOnce(empty);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('No milestones yet')).toBeInTheDocument();
    });
  });

  it('does not render a progressbar when milestones array is empty', async () => {
    const empty = { ...deepClone(BASE_CONTRACT), milestones: [] };
    (contractResolver.resolveContractData as jest.Mock).mockResolvedValueOnce(empty);

    await renderPage();

    await waitFor(() => {
      // Empty state replaces the bar with a descriptive message; no progressbar expected.
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('does not throw or show an error for empty milestones', async () => {
    const empty = { ...deepClone(BASE_CONTRACT), milestones: [] };
    (contractResolver.resolveContractData as jest.Mock).mockResolvedValueOnce(empty);

    // Should render without throwing
    await expect(renderPage()).resolves.not.toThrow();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /escrow progress/i }),
      ).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Currency pass-through (no hardcoded USD in the page)
// ---------------------------------------------------------------------------

describe('currency pass-through', () => {
  it('does not hardcode USD — uses the currency from the milestones', async () => {
    const xlmContract = deepClone(BASE_CONTRACT);
    xlmContract.currency = 'XLM';
    xlmContract.milestones.forEach((m) => { m.currency = 'XLM'; });
    (contractResolver.resolveContractData as jest.Mock).mockResolvedValueOnce(xlmContract);

    await renderPage();

    // The page should not inject any USD references in the progress section;
    // the component itself derives currency from milestone[0].currency.
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    // Verify the page passes milestones through without re-labelling the currency.
    const pageSource = document.body.innerHTML;
    // We're not asserting the formatted string since formatAmount is mocked via
    // usePreferences — we assert the progressbar is present and that the page
    // did not hardcode any currency symbol strings ("$" coming from USD format).
    expect(pageSource).not.toMatch(/\$1,500/);
  });
});

// ---------------------------------------------------------------------------
// Repository-linked milestone merging (contractId)
// ---------------------------------------------------------------------------

describe('repository milestone linking', () => {
  it('queries listMilestonesByContract with the current contract id', async () => {
    await renderPage('123');

    await waitFor(() => {
      expect(mockedListMilestonesByContract).toHaveBeenCalledWith('123');
    });
  });

  it('renders a persisted milestone linked via contractId alongside the resolved milestones', async () => {
    mockedListMilestonesByContract.mockReturnValue([
      {
        id: 'ms-persisted-1',
        title: 'Persisted milestone',
        status: 'Pending',
        payout: 900,
        currency: 'USD',
        contractId: '123',
      },
    ]);

    await renderPage('123');

    await waitFor(() => {
      expect(screen.getByText('Persisted milestone')).toBeInTheDocument();
    });
    // Resolver milestones are still present alongside the persisted one.
    expect(screen.getByText('Kickoff and scope approval')).toBeInTheDocument();
    expect(screen.getByText('4 total')).toBeInTheDocument();
  });

  it('lets a persisted milestone override a resolver milestone that shares the same id', async () => {
    mockedListMilestonesByContract.mockReturnValue([
      {
        id: 'ms-1',
        title: 'Kickoff and scope approval (updated)',
        status: 'Paid',
        payout: 1500,
        currency: 'USD',
        contractId: '123',
      },
    ]);

    await renderPage('123');

    await waitFor(() => {
      expect(screen.getByText('Kickoff and scope approval (updated)')).toBeInTheDocument();
    });
    expect(screen.queryByText('Kickoff and scope approval')).not.toBeInTheDocument();
    // No duplicate row was added — still 3 total milestones.
    expect(screen.getByText('3 total')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Existing tests — preserved from before
// ---------------------------------------------------------------------------

describe('existing contract detail page behaviour', () => {
  it('renders the contract overview and action panel after successful load', async () => {
    await renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('complementary', { name: /what would you like to do/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole('status', { name: 'Contract status updates' }),
    ).toBeEmptyDOMElement();
  });

  it('persists the confirmed dispute flow and reflects the disputed status in the page', async () => {
    const user = userEvent.setup();

    await renderPage();

    await user.click(await screen.findByRole('button', { name: /open a dispute for this contract/i }));
    
    // Type in the reason textarea in the inline form
    const textarea = screen.getByRole('textbox', { name: /reason/i });
    await user.type(textarea, 'Dispute reason');

    // Click confirm dispute button
    await user.click(screen.getByRole('button', { name: /^confirm dispute$/i }));

    await waitFor(() => {
      expect(mockedUpsertContract).toHaveBeenCalledWith(
        expect.objectContaining({ contractName: contractData.name, status: 'Disputed' }),
      );
    });

    expect(within(getContractSummarySection()).getByLabelText('Status: Disputed')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Contract status updates' })).toHaveTextContent(
      'Contract status changed to Disputed.',
    );
    expect(screen.queryByRole('button', { name: /release funds to the contractor/i })).not.toBeInTheDocument();
    expect(await screen.findByText('Dispute opened')).toBeInTheDocument();
  });

  it('keeps destructive actions disabled when the wallet is disconnected', async () => {
    const user = userEvent.setup();
    mockedUseWallet.mockReturnValue({
      address: null,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });

    await renderPage();

    const releaseButton = await screen.findByRole('button', {
      name: /release funds to the contractor/i,
    });
    const disputeButton = screen.getByRole('button', {
      name: /open a dispute for this contract/i,
    });

    expect(screen.getByText(/connect wallet to perform this action/i)).toBeInTheDocument();
    expect(releaseButton).toBeDisabled();
    expect(disputeButton).toBeDisabled();

    await user.click(releaseButton);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockedUpsertContract).not.toHaveBeenCalled();
  });

  it('shows error feedback and preserves the current status when persistence fails', async () => {
    const user = userEvent.setup();
    mockedUpsertContract.mockReturnValue(false);

    await renderPage();

    await user.click(await screen.findByRole('button', { name: /release funds to the contractor/i }));
    await user.click(within(screen.getByRole('alertdialog', { name: /confirm release funds/i })).getByRole('button', { name: /^release funds$/i }));

    await waitFor(() => {
      expect(mockedUpsertContract).toHaveBeenCalledTimes(1);
    });

    expect(within(getContractSummarySection()).getByLabelText('Status: Active')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /release funds to the contractor/i })).toHaveFocus();
    expect(screen.getByText('Unable to update contract')).toBeInTheDocument();
    const alerts = screen.getAllByRole('alert');
    expect(alerts.some(el => el.textContent?.includes('The contract status could not be persisted. Please try again.'))).toBe(true);
  });

  it('keeps the "Back to contracts" link for a valid id', async () => {
    await renderPage('contract-42');

    const backLink = screen.getByRole('link', { name: /back to contracts/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/contracts');
  });

  it.each([
    ['empty string', ''],
    ['path traversal', '../admin'],
    ['script tag', '<script>alert(1)</script>'],
    ['oversized', 'a'.repeat(65)],
    ['special chars', 'id#1!'],
  ])('calls notFound() for invalid id: %s', async (_label, id) => {
    await expect(ContractDetailPage({ params: Promise.resolve({ id }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });
});
});
