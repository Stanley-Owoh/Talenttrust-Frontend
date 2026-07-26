'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import ContractSummary from '@/components/ContractSummary';
import MilestonesList from '@/components/MilestonesList';
import ActionPanel from '@/components/ActionPanel';
import ContractProgress from '@/components/ContractProgress';
import { ContractProgressSkeleton } from '@/components/ContractProgressSkeleton';
import { ContractSummarySkeleton } from '@/components/ContractSummarySkeleton';
import { MilestonesListSkeleton } from '@/components/MilestonesListSkeleton';
import ContractStatusAnnouncer from '@/components/ContractStatusAnnouncer';
import SafeBoundary from '@/components/SafeBoundary';
import { resolveContractData, ContractData } from '@/lib/contractResolver';
import { useToast } from '@/components/toast/toast-provider';
import { upsertContract, listMilestonesByContract } from '@/lib/repository';
import { isValidContractId } from '@/lib/validateContractId';
import type { Contract, Milestone } from '@/types/domain';

/**
 * Merges the contract's resolved milestones with any milestones persisted in
 * the repository under the same `contractId`, de-duplicating by `id`.
 *
 * Persisted records take precedence over resolver records that share an id,
 * since the repository holds the most recently edited state.
 *
 * @param baseMilestones - Milestones returned by `resolveContractData`.
 * @param contractId - The contract id to filter persisted milestones by.
 * @returns The merged, de-duplicated milestone list for this contract.
 */
function mergeContractMilestones(baseMilestones: Milestone[], contractId: string): Milestone[] {
  const merged = new Map<string, Milestone>();
  baseMilestones.forEach((milestone) => merged.set(milestone.id, milestone));
  listMilestonesByContract(contractId).forEach((milestone) => merged.set(milestone.id, milestone));
  return Array.from(merged.values());
}

interface ContractDetailPageProps {
  params: Promise<{ id: string }>;
}

const ContractDetailPageContent = ({ id }: { id: string }) => {
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPersistingStatus, setIsPersistingStatus] = useState(false);
  const isMountedRef = useRef(true);
  const { showError, showSuccess } = useToast();

  /**
   * Maps the resolved contract detail shape into the repository contract shape.
   *
   * The repository stores summary-friendly contract records, so the detail page
   * narrows `ContractData` into the fields that persistence already expects.
   *
   * @param data - The loaded detail-page contract data.
   * @param status - The next status to persist for that contract.
   * @returns A repository-ready `Contract` record.
   */
  const buildPersistedContract = useCallback(
    (data: ContractData, status: Contract['status']): Contract => ({
      contractName: data.name,
      parties: data.parties,
      totalValue: data.totalValue,
      currency: data.currency,
      status,
      createdAt: data.createdAt,
      milestoneCount: data.milestones.length,
    }),
    [],
  );

  /**
   * Persists a contract status transition and mirrors the result into page state.
   *
   * The write is intentionally client-side because repository persistence is
   * backed by `localStorage`. Success and failure are surfaced through toasts so
   * the confirmed ActionPanel flows provide immediate feedback.
   *
   * @param nextStatus - The status to persist to the repository.
   * @param successTitle - The toast title shown after a successful write.
   * @param successDescription - The toast description shown after success.
   */
  const persistContractStatus = useCallback(
    (
      nextStatus: ContractData['status'],
      successTitle: string,
      successDescription: string,
    ) => {
      if (!contractData) {
        const message = 'Contract details are unavailable, so the status could not be updated.';
        setErrorMessage(message);
        showError({
          title: 'Unable to update contract',
          description: message,
        });
        return;
      }

      setIsPersistingStatus(true);
      setErrorMessage(null);

      const persisted = upsertContract(buildPersistedContract(contractData, nextStatus));

      if (!persisted) {
        const message = 'The contract status could not be persisted. Please try again.';
        setErrorMessage(message);
        showError({
          title: 'Unable to update contract',
          description: message,
        });
        setIsPersistingStatus(false);
        return;
      }

      const updatedContract = { ...contractData, status: nextStatus };
      setContractData(updatedContract);
      setErrorMessage(null);
      showSuccess({
        title: successTitle,
        description: successDescription,
      });
      setIsPersistingStatus(false);
    },
    [buildPersistedContract, contractData, showError, showSuccess],
  );

  useEffect(() => {
    isMountedRef.current = true;

    const loadContract = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const data = await resolveContractData(id);

        if (isMountedRef.current) {
          setContractData(data);
          setMilestones(mergeContractMilestones(data.milestones, id));
        }
      } catch (error) {
        if (isMountedRef.current) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Failed to load contract. Please try again.'
          );
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadContract();

    return () => {
      isMountedRef.current = false;
    };
  }, [id]);

  /**
   * Placeholder for the future milestone-submission workflow.
   */
  const handleSubmitMilestone = () => {
    // Replace with real milestone submission flow.
  };

  /**
   * Persists the confirmed release-funds action as a completed contract.
   */
  const handleReleaseFunds = useCallback(() => {
    persistContractStatus(
      'Completed',
      'Funds released',
      'The contract was marked as Completed and the change was saved.',
    );
  }, [persistContractStatus]);

  /**
   * Persists the confirmed dispute action as a disputed contract.
   */
  const handleDispute = useCallback(() => {
    persistContractStatus(
      'Disputed',
      'Dispute opened',
      'The contract was marked as Disputed and the change was saved.',
    );
  }, [persistContractStatus]);

  const handleViewSummary = () => {
    // Replace with summary navigation.
  };

  const status = contractData?.status || 'Active';

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      {contractData ? <ContractStatusAnnouncer status={contractData.status} /> : null}
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <Breadcrumbs
              items={[
                { label: 'Dashboard', href: '/' },
                { label: 'Contracts', href: '/contracts' },
                { label: `#${id}` },
              ]}
            />
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Contract #{id}</h1>
          </div>
          <Link
            href="/contracts"
            className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400"
          >
            Back to contracts
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <SafeBoundary>
              {isLoading ? (
                <ContractSummarySkeleton />
              ) : contractData ? (
                <ContractSummary
                  contractName={contractData.name}
                  parties={contractData.parties}
                  totalValue={contractData.totalValue}
                  currency={contractData.currency}
                  status={contractData.status}
                  createdAt={contractData.createdAt}
                  milestoneCount={milestones.length}
                />
              ) : null}
            </SafeBoundary>

            <SafeBoundary>
              {isLoading ? (
                <ContractProgressSkeleton />
              ) : contractData ? (
                <ContractProgress milestones={milestones} />
              ) : null}
            </SafeBoundary>

            <SafeBoundary>
              {isLoading ? (
                <MilestonesListSkeleton />
              ) : contractData ? (
                <MilestonesList milestones={milestones} contractCurrency={contractData.currency} />
              ) : null}
            </SafeBoundary>
          </div>

          <div className="space-y-6">
            <ActionPanel
              status={status}
              onSubmitMilestone={handleSubmitMilestone}
              onReleaseFunds={handleReleaseFunds}
              onDispute={handleDispute}
              onViewSummary={handleViewSummary}
              isLoading={isLoading || isPersistingStatus}
              errorMessage={errorMessage || undefined}
              disputeFlow="confirm"
            />
          </div>
        </div>
      </div>
    </main>
  );
};

const ContractDetailPage = async ({ params }: ContractDetailPageProps) => {
  const { id } = await params;

  if (!isValidContractId(id)) {
    const { notFound } = await import('next/navigation');
    notFound();
  }

  return <ContractDetailPageContent id={id} />;
};

export default ContractDetailPage;
