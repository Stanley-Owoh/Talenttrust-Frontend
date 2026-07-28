"use client";

import React, { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import EmptyState from "../../components/EmptyState";
import ContractsList from "../../components/contracts/ContractsList";
import { listContracts, saveContract } from "@/lib/repository";
import {
  downloadContractsCsv,
  downloadContractsJson,
} from "@/lib/exportContracts";
import { useToast } from "@/components/toast/toast-provider";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import type { Contract } from "@/types/domain";

const ContractCreationFormFallback = () => (
  <div
    data-testid="contract-form-loading"
    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg"
  >
    <LoadingSkeleton rows={4} className="mb-4" />
    <LoadingSkeleton rows={1} width="w-3/4" />
  </div>
);

const ContractCreationForm = dynamic(
  () =>
    import("@/components/ContractCreationForm").then(
      (mod) => mod.ContractCreationForm,
    ),
  {
    ssr: false,
    loading: ContractCreationFormFallback,
  },
);

type ContractsFetchState =
  | { status: 'loading'; contracts: Contract[] }
  | { status: 'success'; contracts: Contract[] }
  | { status: 'error'; contracts: Contract[] };

const getInitialFetchState = (): ContractsFetchState => {
  try {
    return { status: 'success', contracts: listContracts() };
  } catch {
    return { status: 'error', contracts: [] };
  }
};

const ContractsPage: React.FC = () => {
  const [fetchState, setFetchState] = useState<ContractsFetchState>(getInitialFetchState);
  const [showForm, setShowForm] = useState(false);
  const { showError } = useToast();
  const { contracts } = fetchState;

  /** Re-reads persisted contracts after a recoverable load failure. */
  const loadContracts = useCallback(() => {
    setFetchState((current) => ({ ...current, status: 'loading' }));

    // Defer the synchronous local-storage read so the loading state is
    // announced before the result replaces it.
    queueMicrotask(() => {
      try {
        setFetchState({ status: 'success', contracts: listContracts() });
      } catch {
        setFetchState({ status: 'error', contracts: [] });
      }
    });
  }, []);

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
      setFetchState((current) => ({
        status: 'success',
        contracts: [...current.contracts, contract],
      }));
      setShowForm(false);

      const persisted = saveContract(contract);
      if (!persisted) {
        setFetchState((current) => ({
          status: 'success',
          contracts: current.contracts.filter((item) => item.id !== contract.id),
        }));
        showError({
          title: "Unable to create contract",
          description: "Your contract could not be saved. Please try again.",
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

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {fetchState.status === 'loading'
          ? 'Loading contracts'
          : fetchState.status === 'error'
            ? 'Unable to load contracts'
            : contracts.length === 0
              ? 'No contracts found'
              : `${contracts.length} ${contracts.length === 1 ? 'contract' : 'contracts'} loaded`}
      </p>

      {fetchState.status === 'loading' && !showForm && (
        <div
          role="status"
          aria-label="Loading contracts"
          aria-busy="true"
          className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600"
        >
          Loading contracts…
        </div>
      )}

      {fetchState.status === 'error' && !showForm && (
        <section
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900"
        >
          <h2 className="text-lg font-semibold">Unable to load contracts</h2>
          <p className="mt-2 text-sm">Please check your connection and try again.</p>
          <button
            type="button"
            onClick={loadContracts}
            className="mt-4 rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-red-900"
          >
            Retry loading contracts
          </button>
        </section>
      )}

      {fetchState.status === 'success' && !showForm && contracts.length === 0 && (
        <EmptyState
          illustration="contracts"
          title="No contracts found"
          description="You haven't created any contracts yet. Start by creating your first contract to begin freelancing securely."
          actionLabel="Create Contract"
          onAction={handleCreateContract}
        />
      )}

      {fetchState.status === 'success' && !showForm && contracts.length > 0 && (
        <>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                {contracts.length}{" "}
                {contracts.length === 1 ? "contract" : "contracts"}
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
