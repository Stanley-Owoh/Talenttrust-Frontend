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
import { downloadContractsCsv, downloadContractsJson } from '@/lib/exportContracts';
import type { Contract } from '@/types/domain';

const ContractsPage: React.FC = () => {
  // Initialise from localStorage on first render; subsequent saves trigger
  // a state update so the list reflects newly added items immediately.
  const [contracts, setContracts] = useState<Contract[]>(() => listContracts());
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { addToast } = useToast();

  /**
   * Generates a unique identifier for a contract
   */
  const getContractId = useCallback((contract: Contract, index: number): string => {
    return `${contract.contractName}-${index}`;
  }, []);

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
    const optimisticId = `optimistic-contract-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticContract = { ...contract, __optimisticId: optimisticId } as OptimisticContract;

    setContracts((prev) => [...prev, optimisticContract as Contract]);
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
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                {contracts.length} {contracts.length === 1 ? 'contract' : 'contracts'}
              </span>
              <button
                type="button"
                onClick={() => downloadContractsCsv(contracts)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                aria-label="Export contracts as CSV"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() => downloadContractsJson(contracts)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                aria-label="Export contracts as JSON"
              >
                JSON
              </button>
            </div>
            <button
              type="button"
              onClick={handleCreateContract}
              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Create Contract
            </button>
          </div>

          {/* Contract list with bulk selection */}
          <ul className="space-y-4" role="presentation">
            {contracts.map((contract, idx) => (
              <ContractRowItem
                key={`${contract.contractName}-${idx}`}
                contractName={contract.contractName}
                parties={contract.parties}
                totalValue={contract.totalValue}
                currency={contract.currency}
                status={contract.status}
                createdAt={contract.createdAt}
                milestoneCount={contract.milestoneCount}
                isSelected={selectedIds.has(getContractId(contract, idx))}
                onSelect={(selected) => handleSelectContract(idx, selected)}
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

const ContractsPage: React.FC = () => (
  <Suspense fallback={null}>
    <ContractsContent />
  </Suspense>
);

export default ContractsPage;
