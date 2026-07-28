import React from 'react';
import type { Reputation } from '@/types/domain';
import ReputationPageClient from './ReputationPageClient';
import { ReputationPageContent } from './ReputationPageContent';

const ReputationPage: React.FC = () => {
  const reputation: Reputation[] = [];

  return (
    <ReputationPageClient
      reputationData={reputation.length > 0 ? reputation[0] : null}
    />
  );
};

export default ReputationPage;
