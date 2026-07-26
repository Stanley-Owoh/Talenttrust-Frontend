import type { StatusType } from '@/components/StatusBadge';
import type { Milestone } from '@/components/MilestonesList';
import type {
  ContractParty,
  ContractSummaryProps,
} from '@/components/ContractSummary';
import type {
  ReputationEvent,
  ReputationProfileProps,
} from '@/components/ReputationProfile';

export type {
  StatusType,
  Milestone,
  ContractParty,
  ContractSummaryProps,
  ReputationEvent,
  ReputationProfileProps,
};

/** Canonical contract shape aligned with ContractSummary props. */
export type Contract = ContractSummaryProps & { id: string };

/** Canonical reputation profile shape for list and detail views. */
export type Reputation = Omit<ReputationProfileProps, 'name'> & { name?: string };

