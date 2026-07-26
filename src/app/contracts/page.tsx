'use client';

import React, { useState, useCallback, useMemo } from 'react';
import EmptyState from '../../components/EmptyState';
import ContractsList from '../../components/contracts/ContractsList';
import { ContractCreationForm } from '../../components/ContractCreationForm';
import { listContracts, saveContract } from '@/lib/repository';
import type { Contract } from '@/types/domain';

const ContractsPage: React.FC = () => {
  // Initialise from localStorage on first render; subsequent saves trigger
  // a state update so the list reflects newly added items immediately.
  const [contracts, setContracts] = useState<Contract[]>(() => listContracts());
  const [showForm, setShowForm] = useState(false);

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

  /**
   * Memoized button element to prevent re-creation on every parent render.
   */
  const createButton = useMemo(
    () => (
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={handleCreateContract}
          className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          Create Contract
        </button>
      </div>
    ),
    [handleCreateContract],
  );

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
          {createButton}
          <ContractsList contracts={memoizedContracts} />
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

