'use client';

import React, { useState, useCallback, useEffect } from 'react';
import EmptyState from '../../components/EmptyState';
import { ContractCreationForm } from '../../components/ContractCreationForm';
import { ContractsSkeleton } from '../../components/contracts/ContractsSkeleton';
import { listContracts, saveContract } from '@/lib/repository';
import type { Contract } from '@/types/domain';

const ContractsPage: React.FC = () => {
  /**
   * `loading` is true while the initial contract list has not yet been read.
   * Using a one-tick deferred load (useEffect) ensures:
   *   1. The skeleton is always rendered on the first paint (no layout shift).
   *   2. The component remains compatible with SSR/hydration because
   *      localStorage is only accessed on the client after mount.
   */
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Load contracts from localStorage after the component mounts so the
  // skeleton is guaranteed to appear on the first paint.
  useEffect(() => {
    const stored = listContracts();
    setContracts(stored);
    setLoading(false);
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

  return (
    <main className="min-h-screen p-8" aria-busy={loading ? 'true' : undefined}>
      {/* Accessible announcement for loading state */}
      {loading && (
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          Loading contracts…
        </span>
      )}

      {/* Page heading – always visible to anchor the layout */}
      <h1 className="text-2xl font-bold mb-6">Contracts</h1>

      {/* ── Loading state ─────────────────────────────────────────────── */}
      {loading && <ContractsSkeleton count={3} />}

      {/* ── Settled state ─────────────────────────────────────────────── */}
      {!loading && !showForm && contracts.length === 0 && (
        <EmptyState
          illustration="contracts"
          title="No contracts found"
          description="You haven't created any contracts yet. Start by creating your first contract to begin freelancing securely."
          actionLabel="Create Contract"
          onAction={handleCreateContract}
        />
      )}

      {!loading && !showForm && contracts.length > 0 && (
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

      {!loading && showForm && (
        <ContractCreationForm
          onSubmit={handleSubmitContract}
          onCancel={handleCancelForm}
        />
      )}
    </main>
  );
};

export default ContractsPage;
