'use client';

import React, { useState, useCallback } from 'react';
import EmptyState from '../../components/EmptyState';
import { ContractCreationForm } from '../../components/ContractCreationForm';
import { useToast } from '@/components/toast/toast-provider';
import { listContracts, saveContract } from '@/lib/repository';
import type { Contract } from '@/types/domain';

type OptimisticContract = Contract & { __optimisticId?: string };

const ContractsPage: React.FC = () => {
  // Initialise from localStorage on first render; subsequent saves trigger
  // a state update so the list reflects newly added items immediately.
  const [contracts, setContracts] = useState<Contract[]>(() => listContracts());
  const [showForm, setShowForm] = useState(false);
  const { showError } = useToast();

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

    const persisted = saveContract(contract);
    if (!persisted) {
      setContracts((prev) => prev.filter((item) => (item as OptimisticContract).__optimisticId !== optimisticId));
      showError({
        title: 'Unable to create contract',
        description: 'Your contract could not be saved. Please try again.',
      });
      return;
    }
  }, [showError]);

  /**
   * Closes the contract creation form modal.
   */
  const handleCancelForm = useCallback(() => {
    setShowForm(false);
  }, []);

  return (
    <main className="min-h-screen p-8">
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
              <li
                key={`${contract.contractName}-${idx}`}
                className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="font-semibold text-slate-900">{contract.contractName}</p>
                <p className="text-sm text-slate-500">
                  {contract.status} · Created {contract.createdAt}
                </p>
              </li>
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

export default ContractsPage;

