'use client';

import React, { memo } from 'react';
import ContractListItem from './ContractListItem';
import type { Contract } from '@/types/domain';

export interface ContractsListProps {
  contracts: Contract[];
}

/**
 * ContractsList renders a list of contracts.
 *
 * Memoized with React.memo to prevent re-renders when the contracts array
 * reference hasn't changed. This allows parent components to re-render without
 * triggering unnecessary re-renders of the entire list and all its child items.
 *
 * Uses ContractListItem (also memoized) to further optimize rendering when
 * individual contracts haven't changed.
 *
 * @param props - Component props
 * @param props.contracts - Array of contracts to display
 *
 * @example
 * ```tsx
 * <ContractsList contracts={contracts} />
 * ```
 */
const ContractsList = memo(
  ({ contracts }: ContractsListProps) => (
    <>
      <div className="mb-4 flex justify-end">
        {/* Button moved to parent for event handling */}
      </div>
      <ul className="space-y-4">
        {contracts.map((contract, idx) => (
          <ContractListItem key={`${contract.contractName}-${idx}`} contract={contract} index={idx} />
        ))}
      </ul>
    </>
  ),
  (prevProps, nextProps) => {
    // Return true if props are equal (don't re-render)
    // Check array length first for quick bail-out
    if (prevProps.contracts.length !== nextProps.contracts.length) {
      return false;
    }

    // Check if each contract in the array is the same reference or has same values
    for (let i = 0; i < prevProps.contracts.length; i++) {
      const prev = prevProps.contracts[i];
      const next = nextProps.contracts[i];

      if (
        prev.contractName !== next.contractName ||
        prev.status !== next.status ||
        prev.createdAt !== next.createdAt
      ) {
        return false;
      }
    }

    return true;
  },
);

ContractsList.displayName = 'ContractsList';

export default ContractsList;
