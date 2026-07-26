'use client';

import { useCallback, useRef } from 'react';
import { upsertContract, getContractVersion } from '@/lib/repository';
import type { ContractData } from '@/lib/contractResolver';
import type { Contract } from '@/types/domain';

export type BuildPersistedContract = (
  data: ContractData,
  status: ContractData['status'],
  version: number,
) => Contract;

export type PersistResult =
  | { ok: true }
  | { ok: false; stale: boolean; error: string };

export function useOptimisticContractStatus(
  contractData: ContractData | null,
  setContractData: React.Dispatch<React.SetStateAction<ContractData | null>>,
  buildPersistedContract: BuildPersistedContract,
): (nextStatus: ContractData['status']) => PersistResult {
  const rollbackRef = useRef<ContractData | null>(null);

  const persistStatus = useCallback(
    (nextStatus: ContractData['status']): PersistResult => {
      if (!contractData) {
        return {
          ok: false,
          stale: false,
          error: 'Contract details are unavailable, so the status could not be updated.',
        };
      }

      rollbackRef.current = contractData;

      setContractData({ ...contractData, status: nextStatus });

      const version = getContractVersion(contractData.name);
      const persisted = buildPersistedContract(contractData, nextStatus, version);
      const result = upsertContract(persisted);

      if (!result.success) {
        if (rollbackRef.current) {
          setContractData(rollbackRef.current);
        }
        rollbackRef.current = null;
        return result.stale
          ? {
              ok: false,
              stale: true,
              error:
                'This contract was updated in another session. Please reload and try again.',
            }
          : {
              ok: false,
              stale: false,
              error:
                'The contract status could not be persisted. Please try again.',
            };
      }

      rollbackRef.current = null;
      return { ok: true };
    },
    [contractData, setContractData, buildPersistedContract],
  );

  return persistStatus;
}
