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
import { listContracts, saveContract } from '@/lib/repository';
import { getRelativeTime } from '@/lib/relativeTime';
import type { Contract } from '@/types/domain';

const ContractsPage: React.FC = () => {
  // Initialise from localStorage on first render; subsequent saves trigger
  // a state update so the list reflects newly added items immediately.
  const [allContracts, setAllContracts] = useState<Contract[]>(() => listContracts());
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 10;

  const filteredContracts = filterStatus === 'All'
    ? allContracts
    : allContracts.filter((c) => c.status === filterStatus);

  const displayedContracts = filteredContracts.slice(0, page * PAGE_SIZE);
  const hasMore = displayedContracts.length < filteredContracts.length;

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value);
    setPage(1);
  };

  const handleLoadMore = () => {
    setPage((p) => p + 1);
  };

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
    setAllContracts(listContracts());
    setShowForm(false);
    // Clear selection after new contract is added
    setSelectedIds(new Set());
  }, []);

  /**
   * Closes the contract creation form modal.
   */
  const handleCancelForm = useCallback(() => {
    setShowForm(false);
  }, []);

  /**
   * Handles individual contract row selection
   */
  const handleSelectContract = useCallback(
    (index: number, selected: boolean) => {
      const newSelected = new Set(selectedIds);
      const contractId = getContractId(contracts[index], index);

      if (selected) {
        newSelected.add(contractId);
      } else {
        newSelected.delete(contractId);
      }

      setSelectedIds(newSelected);
    },
    [selectedIds, contracts, getContractId]
  );

  /**
   * Handles select all contracts
   */
  const handleSelectAll = useCallback(() => {
    const allIds = new Set(
      contracts.map((contract, index) => getContractId(contract, index))
    );
    setSelectedIds(allIds);
  }, [contracts, getContractId]);

  /**
   * Handles clear all selections
   */
  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  /**
   * Handles bulk delete of selected contracts
   */
  const handleBulkDelete = useCallback(() => {
    const contractsToDelete = contracts.filter((_, index) => {
      const contractId = getContractId(contracts[index], index);
      return selectedIds.has(contractId);
    });

    contractsToDelete.forEach((contract) => {
      deleteContract(contract.contractName);
    });

    // Re-read storage and clear selection
    setContracts(listContracts());
    setSelectedIds(new Set());
  }, [contracts, selectedIds, getContractId]);

  /**
   * Handles bulk export of selected contracts
   */
  const handleBulkExport = useCallback(() => {
    const contractsToExport = contracts.filter((_, index) => {
      const contractId = getContractId(contracts[index], index);
      return selectedIds.has(contractId);
    });

    if (contractsToExport.length === 0) {
      addToast({
        type: 'error',
        message: 'No contracts selected for export.',
      });
      return;
    }

    // Create JSON export
    const dataStr = JSON.stringify(contractsToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    // Create and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `contracts-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [contracts, selectedIds, getContractId, addToast]);

  return (
    <main className="min-h-screen p-8 pb-24">
      <h1 className="text-2xl font-bold mb-6">Contracts</h1>

      {!showForm && allContracts.length === 0 && (
        <EmptyState
          illustration="contracts"
          title="No contracts found"
          description="You haven't created any contracts yet. Start by creating your first contract to begin freelancing securely."
          actionLabel="Create Contract"
          onAction={handleCreateContract}
        />
      )}

      {!showForm && allContracts.length > 0 && (
        <>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm font-medium text-slate-700">
                Filter by status:
              </label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={handleFilterChange}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="All">All Contracts</option>
                <option value="Pending">Pending</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Disputed">Disputed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleCreateContract}
              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Create Contract
            </button>
          </div>
          {/* TODO: Replace with a proper ContractSummary list component. */}
          <ul className="space-y-4" role="list">
            {displayedContracts.map((contract, idx) => (
              <li
                key={`${contract.contractName}-${idx}`}
                className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="font-semibold text-slate-900">{contract.contractName}</p>
                <p className="text-sm text-slate-500">
                  {contract.status} · Created{' '}
                  <span title={contract.createdAt}>
                    {getRelativeTime(contract.createdAt)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
          
          {filteredContracts.length === 0 && filterStatus !== 'All' && (
            <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
              No contracts found with status &quot;{filterStatus}&quot;.
            </div>
          )}

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                className="rounded-2xl border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}

      {showForm && (
        <ContractCreationForm
          onSubmit={handleSubmitContract}
          onCancel={handleCancelForm}
        />
      )}

      {/* Bulk action toolbar */}
      <BulkActionToolbar
        selectedCount={selectedIds.size}
        totalCount={contracts.length}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onDelete={handleBulkDelete}
        onExport={handleBulkExport}
        isOpen={selectedIds.size > 0}
      />
    </main>
  );
};

export default ContractsPage;