'use client';

import React, { useState, useCallback } from 'react';
import EmptyState from '../../components/EmptyState';
import { ContractCreationForm } from '../../components/ContractCreationForm';
import EditableContractRow from '../../components/EditableContractRow';
import { listContracts, saveContract, updateContract } from '@/lib/repository';
import type { Contract } from '@/types/domain';

const ContractsPage: React.FC = () => {
  // Initialise from localStorage on first render; subsequent saves trigger
  // a state update so the list reflects newly added items immediately.
  const [contracts, setContracts] = useState<Contract[]>(() => listContracts());
  const [showForm, setShowForm] = useState(false);

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
   * Persists an inline row edit (keyed by the row's original name so renames
   * update in place) and refreshes the list from storage.
   */
  const handleInlineSave = useCallback((originalName: string, updated: Contract) => {
    updateContract(originalName, updated);
    setContracts(listContracts());
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
          <ul className="space-y-4">
            {contracts.map((contract, idx) => (
              <EditableContractRow
                key={`${contract.contractName}-${idx}`}
                contract={contract}
                onSave={handleInlineSave}
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

export default ContractsPage;

