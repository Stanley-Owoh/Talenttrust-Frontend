'use client';

import React, { useCallback, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import ContractsList from '../../components/contracts/ContractsList';
import { ContractCreationForm } from '../../components/ContractCreationForm';
import { listContracts, saveContract } from '@/lib/repository';
import { downloadContractsCsv, downloadContractsJson } from '@/lib/exportContracts';
import { useToast } from '@/components/toast/toast-provider';
import type { Contract } from '@/types/domain';

const ContractsPage: React.FC = () => {
  // Initialise from localStorage on first render; subsequent saves trigger
  // a state update so the list reflects newly added items immediately.
  const [contracts, setContracts] = useState<Contract[]>(() => {
    try {
      return listContracts();
    } catch {
      return [];
    }
  });
  const [showForm, setShowForm] = useState(false);
  const { showError } = useToast();

  /**
   * Opens the contract creation form modal.
   */
  const handleCreateContract = useCallback(() => {
    setShowForm(true);
  }, []);

  /**
   * Applies the new contract to the list immediately, then persists it.
   * Rolls back the optimistic update and surfaces an error toast if the
   * write fails.
   */
  const handleSubmitContract = useCallback(
    (contract: Contract) => {
      setContracts((prev) => [...prev, contract]);
      setShowForm(false);

      const persisted = saveContract(contract);
      if (!persisted) {
        setContracts((prev) => prev.filter((item) => item.id !== contract.id));
        showError({
          title: 'Unable to create contract',
          description: 'Your contract could not be saved. Please try again.',
        });
      }
    },
    [showError],
  );

  /**
   * Closes the contract creation form modal.
   */
  const handleCancelForm = useCallback(() => {
    setShowForm(false);
  }, []);

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

          <ContractsList contracts={contracts} />
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

export default ContractsPage;
