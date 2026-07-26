'use client';

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EmptyState from '../../components/EmptyState';
import ContractsList from '../../components/contracts/ContractsList';
import { ContractCreationForm } from '../../components/ContractCreationForm';
import { ContractRow } from '../../components/contracts/ContractRow';
import { listContracts, saveContract } from '@/lib/repository';
import type { Contract, StatusType } from '@/types/domain';

const CONTRACTS_PATH = '/contracts';
const URL_UPDATE_DEBOUNCE_MS = 300;
const MAX_SEARCH_QUERY_LENGTH = 120;

export type ContractStatusFilter = 'All' | StatusType;
export type ContractSortOption =
  | 'created-desc'
  | 'created-asc'
  | 'value-desc'
  | 'value-asc';

const CONTRACT_STATUS_FILTERS: ContractStatusFilter[] = [
  'All',
  'Pending',
  'Active',
  'Completed',
  'Paid',
  'Disputed',
];

const CONTRACT_SORT_OPTIONS: Array<{ value: ContractSortOption; label: string }> = [
  { value: 'created-desc', label: 'Created date (newest first)' },
  { value: 'created-asc', label: 'Created date (oldest first)' },
  { value: 'value-desc', label: 'Value (high to low)' },
  { value: 'value-asc', label: 'Value (low to high)' },
];

const DEFAULT_URL_STATE: ContractsUrlState = {
  query: '',
  status: 'All',
  sort: 'created-desc',
};

interface ContractsUrlState {
  query: string;
  status: ContractStatusFilter;
  sort: ContractSortOption;
}

interface IndexedContract {
  contract: Contract;
  index: number;
}

/**
 * Removes unsafe/control characters from a URL-provided search query and caps
 * its length before the value is reflected into component state.
 */
function sanitizeSearchQuery(value: string | null): string {
  if (!value) return '';

  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
}

/**
 * Returns a canonical contract status filter when the URL value is recognized;
 * otherwise returns the safe default so invalid params are ignored.
 */
function parseStatusFilter(value: string | null): ContractStatusFilter {
  if (!value) return DEFAULT_URL_STATE.status;

  const match = CONTRACT_STATUS_FILTERS.find(
    (status) => status.toLowerCase() === value.toLowerCase(),
  );

  return match ?? DEFAULT_URL_STATE.status;
}

/**
 * Returns a validated sort option from the URL, falling back to newest first for
 * unknown values.
 */
function parseSortOption(value: string | null): ContractSortOption {
  if (!value) return DEFAULT_URL_STATE.sort;

  const match = CONTRACT_SORT_OPTIONS.find((option) => option.value === value);

  return match?.value ?? DEFAULT_URL_STATE.sort;
}

/**
 * Converts the current URLSearchParams into the validated contracts toolbar
 * state used by the page.
 */
function parseContractsUrlState(searchParams: URLSearchParams | ReadonlyURLSearchParamsLike): ContractsUrlState {
  return {
    query: sanitizeSearchQuery(searchParams.get('q')),
    status: parseStatusFilter(searchParams.get('status')),
    sort: parseSortOption(searchParams.get('sort')),
  };
}

interface ReadonlyURLSearchParamsLike {
  get(name: string): string | null;
  toString(): string;
}

function areUrlStatesEqual(a: ContractsUrlState, b: ContractsUrlState): boolean {
  return a.query === b.query && a.status === b.status && a.sort === b.sort;
}

/**
 * Builds a shareable /contracts URL while preserving unrelated query params and
 * omitting default toolbar state for clean links.
 */
function buildContractsUrl(
  currentSearchParams: URLSearchParams | ReadonlyURLSearchParamsLike,
  state: ContractsUrlState,
): string {
  const params = new URLSearchParams(currentSearchParams.toString());
  const query = sanitizeSearchQuery(state.query);

  if (query) {
    params.set('q', query);
  } else {
    params.delete('q');
  }

  if (state.status !== DEFAULT_URL_STATE.status) {
    params.set('status', state.status);
  } else {
    params.delete('status');
  }

  if (state.sort !== DEFAULT_URL_STATE.sort) {
    params.set('sort', state.sort);
  } else {
    params.delete('sort');
  }

  const queryString = params.toString();
  return queryString ? `${CONTRACTS_PATH}?${queryString}` : CONTRACTS_PATH;
}

function getContractSearchText(contract: Contract): string {
  return [
    contract.contractName,
    contract.status,
    contract.currency,
    contract.createdAt,
    ...contract.parties.flatMap((party) => [party.label, party.address]),
  ]
    .join(' ')
    .toLowerCase();
}

function getContractCreatedTime(contract: Contract): number {
  const timestamp = Date.parse(contract.createdAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

/**
 * Applies the contracts toolbar state without mutating the persisted array.
 */
function filterAndSortContracts(
  contracts: Contract[],
  state: ContractsUrlState,
): Contract[] {
  const normalizedQuery = state.query.toLowerCase();

  return contracts
    .map<IndexedContract>((contract, index) => ({ contract, index }))
    .filter(({ contract }) => {
      const matchesQuery = normalizedQuery
        ? getContractSearchText(contract).includes(normalizedQuery)
        : true;
      const matchesStatus = state.status === 'All' || contract.status === state.status;

      return matchesQuery && matchesStatus;
    })
    .sort((a, b) => {
      let comparison: number;

      switch (state.sort) {
        case 'created-asc':
          comparison = getContractCreatedTime(a.contract) - getContractCreatedTime(b.contract);
          break;
        case 'value-desc':
          comparison = b.contract.totalValue - a.contract.totalValue;
          break;
        case 'value-asc':
          comparison = a.contract.totalValue - b.contract.totalValue;
          break;
        case 'created-desc':
        default:
          comparison = getContractCreatedTime(b.contract) - getContractCreatedTime(a.contract);
          break;
      }

      if (comparison !== 0) return comparison;

      const nameComparison = a.contract.contractName.localeCompare(b.contract.contractName);
      return nameComparison !== 0 ? nameComparison : a.index - b.index;
    })
    .map(({ contract }) => contract);
}

const ContractsContent: React.FC = () => {
  // Initialise from localStorage on first render; subsequent saves trigger
  // a state update so the list reflects newly added items immediately.
  const [contracts, setContracts] = useState<Contract[]>(() => listContracts());
  const [showForm, setShowForm] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialUrlState = parseContractsUrlState(searchParams);

  const [searchQuery, setSearchQuery] = useState(initialUrlState.query);
  const [statusFilter, setStatusFilter] = useState<ContractStatusFilter>(initialUrlState.status);
  const [sortOption, setSortOption] = useState<ContractSortOption>(initialUrlState.sort);

  const urlState = useMemo(
    () => ({ query: searchQuery, status: statusFilter, sort: sortOption }),
    [searchQuery, statusFilter, sortOption],
  );

  const filteredContracts = useMemo(
    () => filterAndSortContracts(contracts, urlState),
    [contracts, urlState],
  );

  // Restore toolbar state from the URL on load and whenever users navigate with
  // the browser back/forward controls.
  useEffect(() => {
    const nextUrlState = parseContractsUrlState(searchParams);

    setSearchQuery((current) => (current === nextUrlState.query ? current : nextUrlState.query));
    setStatusFilter((current) => (current === nextUrlState.status ? current : nextUrlState.status));
    setSortOption((current) => (current === nextUrlState.sort ? current : nextUrlState.sort));
  }, [searchParams]);

  // Debounce toolbar URL writes so typing in the search field remains smooth.
  // router.push keeps each settled toolbar state in browser history, making the
  // filters shareable and back-button friendly.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const currentUrlState = parseContractsUrlState(searchParams);
      if (areUrlStatesEqual(currentUrlState, urlState)) return;

      router.push(buildContractsUrl(searchParams, urlState));
    }, URL_UPDATE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [router, searchParams, urlState]);

  /**
   * Memoizes the contracts array to prevent unnecessary re-renders of child
   * components (ContractsList) when unrelated state changes (like showForm).
   *
   * The memo dependency is the contracts array reference. When contracts
   * changes, the memoized value is recalculated; otherwise it returns the
   * same reference, preventing child re-renders.
   */
  const memoizedContracts = useMemo(() => contracts, [contracts]);

  /**
   * Opens the contract creation form modal.
   */
  const handleCreateContract = useCallback(() => {
    setShowForm(true);
  }, []);

  /**
   * Handles form submission by persisting the contract and refreshing the list.
   */
  const handleSubmitContract = useCallback((contract: Contract) => {
    saveContract(contract);
    // Re-read storage so the component reflects the persisted state.
    setContracts(listContracts());
    setShowForm(false);
  }, []);

  /**
   * Closes the contract creation form modal.
   */
  const handleCancelForm = useCallback(() => {
    setShowForm(false);
  }, []);

  const resultCountText = `Showing ${filteredContracts.length} of ${contracts.length} contract${contracts.length === 1 ? '' : 's'}`;

  return (
    <main className="min-h-screen p-8">
      <h1 className="mb-6 text-2xl font-bold">Contracts</h1>

      {!showForm && contracts.length === 0 && (
        <EmptyState
          illustration="contracts"
          title="No contracts found"
          description="You haven't created any contracts yet. Start by creating your first contract to begin freelancing securely."
          actionLabel="Create Contract"
          onAction={handleCreateContract}
        />
      )}

      {!showForm && contracts.length > 0 && (
        <>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={handleCreateContract}
              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Create Contract
            </button>
          </div>
          {/* TODO: Replace with a proper ContractSummary list component. */}
          <ul className="space-y-4">
            {contracts.map((contract, idx) => (
              <ContractRow
                key={contract.id || `${contract.contractName}-${idx}`}
                contract={contract}
              />
            ))}
          </ul>
        </>
      )}

      {showForm && (
        <ContractCreationForm
          onSubmit={handleSubmitContract}
          onCancel={handleCancelForm}
        />
      )}
    </main>
  );
};

const ContractsPage: React.FC = () => (
  <Suspense fallback={null}>
    <ContractsContent />
  </Suspense>
);

export default ContractsPage;
