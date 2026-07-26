import React, { Suspense } from 'react';
import EmptyState from '../../components/EmptyState';
import ReputationProfile from '../../components/ReputationProfile';
import SafeBoundary from '../../components/SafeBoundary';
import type { Reputation } from '@/types/domain';
import ReputationPageClient from './ReputationPageClient';

export type ReputationPageContentProps = {
  reputationData?: Reputation | null;
  userName?: string;
};

export function ReputationPageContent({
  reputationData,
  userName = 'User',
}: ReputationPageContentProps) {
  const score = reputationData?.score;
  const hasReputation = typeof score === 'number' && score >= 0;

  return (
    <SafeBoundary>
      {!reputationData || !hasReputation ? (
        <main className="min-h-screen p-8">
          <h1 className="text-2xl font-bold mb-6">Reputation</h1>
          <EmptyState
            illustration="reputation"
            title="No reputation yet"
            description="Your reputation will be built as you complete contracts and receive feedback from clients. Start by creating and fulfilling your first contract."
          />
        </main>
      ) : (
        <main className="min-h-screen p-8">
          <h1 className="text-2xl font-bold mb-6">Reputation</h1>
          <ReputationProfile
            name={userName}
            score={score}
            level={reputationData.level}
            history={reputationData.history}
          />
        </main>
      )}
    </SafeBoundary>
  if (!reputationData || !hasReputation) {
    return (
      <>
        <h1 className="text-2xl font-bold mb-6">Reputation</h1>
        <EmptyState
          illustration="reputation"
          title="No reputation yet"
          description="Your reputation will be built as you complete contracts and receive feedback from clients. Start by creating and fulfilling your first contract."
        />
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Reputation</h1>
      <Suspense fallback={null}>
        <ReputationProfile
          name={userName}
          score={score}
          level={reputationData.level}
          history={reputationData.history}
        />
      </Suspense>
    </main>
  );
}

const ReputationPage: React.FC = () => {
  const reputation: Reputation[] = [];

  return (
    <ReputationPageClient
      reputationData={reputation.length > 0 ? reputation[0] : null}
    />
  );
};

export default ReputationPage;
