/**
 * page.snapshot.test.tsx – structural / snapshot tests for ReputationPageContent
 *
 * These tests guard the rendered HTML structure of every state of the
 * ReputationPageContent component so accidental markup regressions are caught
 * immediately. They complement the behavioural tests in page.test.tsx.
 *
 * States covered:
 *   1. Empty state   – no reputation data (null)
 *   2. Empty state   – no reputation data (undefined)
 *   3. Empty state   – invalid score (negative)
 *   4. Partial state – score present, history empty
 *   5. Loaded state  – score + history present (full profile)
 *   6. Loading skeleton – ReputationLoading component
 *
 * All fixture data is fully deterministic: no Date.now(), Math.random(), or
 * dynamic ids. If rendered output changes intentionally, run:
 *   npx jest --updateSnapshot
 * and commit the updated .snap file alongside the component change.
 *
 * The real ReputationProfile component is used (not mocked) so the snapshots
 * cover the full DOM tree including all ARIA attributes.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ReputationPageContent } from '../ReputationPageContent';
import ReputationLoading from '../loading';
import type { Reputation } from '@/types/domain';
import type { ReputationEvent } from '@/components/ReputationProfile';

// ---------------------------------------------------------------------------
// Shared fixtures – must stay deterministic
// ---------------------------------------------------------------------------

const HISTORY_EVENTS: ReputationEvent[] = [
  {
    id: 'ev-1',
    type: 'Verification',
    summary: 'Completed identity verification',
    date: '2026-04-24',
  },
  {
    id: 'ev-2',
    type: 'On-chain review',
    summary: 'Received positive trust signal',
    date: '2026-04-23',
  },
  {
    id: 'ev-3',
    type: 'Referral',
    summary: 'Referred two new community members',
    date: '2026-04-20',
  },
];

const FULL_REPUTATION: Reputation = {
  score: 3.8,
  level: 'Trusted Partner',
  history: HISTORY_EVENTS,
};

const PARTIAL_REPUTATION: Reputation = {
  score: 2.1,
  level: 'Active Contributor',
  history: [],
};

const ZERO_SCORE_REPUTATION: Reputation = {
  score: 0,
  level: 'Newcomer',
  history: [],
};

// ---------------------------------------------------------------------------
// 1. Empty state – null data
// ---------------------------------------------------------------------------

describe('ReputationPageContent snapshot – empty state (null data)', () => {
  it('matches snapshot when reputationData is null', () => {
    const { container } = render(
      <ReputationPageContent reputationData={null} userName="Alice" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// 2. Empty state – undefined data
// ---------------------------------------------------------------------------

describe('ReputationPageContent snapshot – empty state (undefined data)', () => {
  it('matches snapshot when reputationData is undefined', () => {
    const { container } = render(
      <ReputationPageContent reputationData={undefined} userName="Bob" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// 3. Empty state – invalid score (negative)
// ---------------------------------------------------------------------------

describe('ReputationPageContent snapshot – empty state (negative score)', () => {
  it('matches snapshot when score is negative', () => {
    const data: Reputation = { score: -1, history: [] };
    const { container } = render(
      <ReputationPageContent reputationData={data} userName="Charlie" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// 4. Empty state – null score
// ---------------------------------------------------------------------------

describe('ReputationPageContent snapshot – empty state (null score)', () => {
  it('matches snapshot when score is null', () => {
    const data: Reputation = { score: null, history: [] };
    const { container } = render(
      <ReputationPageContent reputationData={data} userName="Dana" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// 5. Partial state – score present, history empty
// ---------------------------------------------------------------------------

describe('ReputationPageContent snapshot – partial state (score, no history)', () => {
  it('matches snapshot for partial reputation (score only)', () => {
    const { container } = render(
      <ReputationPageContent
        reputationData={PARTIAL_REPUTATION}
        userName="Eve"
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// 6. Partial state – score 0 (falsy-but-valid)
// ---------------------------------------------------------------------------

describe('ReputationPageContent snapshot – partial state (score === 0)', () => {
  it('matches snapshot when score is exactly 0 (edge: falsy-but-valid)', () => {
    const { container } = render(
      <ReputationPageContent
        reputationData={ZERO_SCORE_REPUTATION}
        userName="Frank"
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// 7. Loaded state – full reputation (score + history)
// ---------------------------------------------------------------------------

describe('ReputationPageContent snapshot – loaded state (full reputation)', () => {
  it('matches snapshot for full reputation with history', () => {
    const { container } = render(
      <ReputationPageContent
        reputationData={FULL_REPUTATION}
        userName="Grace"
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// 8. Loaded state – default userName fallback
// ---------------------------------------------------------------------------

describe('ReputationPageContent snapshot – loaded state (default userName)', () => {
  it('matches snapshot when userName is omitted (defaults to "User")', () => {
    const { container } = render(
      <ReputationPageContent reputationData={FULL_REPUTATION} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// 9. Loading skeleton
// ---------------------------------------------------------------------------

describe('ReputationLoading snapshot – loading skeleton', () => {
  it('matches snapshot for the loading skeleton (aria-busy state)', () => {
    const { container } = render(<ReputationLoading />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// 10. Structure assertions – confirm key elements are present in snapshots
//     These structural guards make regressions explicit even before looking
//     at a diff.
// ---------------------------------------------------------------------------

describe('ReputationPageContent structure – empty state', () => {
  it('renders a <main> element with the "Reputation" heading', () => {
    const { container } = render(<ReputationPageContent reputationData={null} />);
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
    const h1 = main?.querySelector('h1');
    expect(h1?.textContent).toBe('Reputation');
  });

  it('does NOT render a meter role in empty state', () => {
    const { container } = render(<ReputationPageContent reputationData={null} />);
    expect(container.querySelector('[role="meter"]')).toBeNull();
  });

  it('does NOT render an ordered list in empty state', () => {
    const { container } = render(<ReputationPageContent reputationData={null} />);
    expect(container.querySelector('ol')).toBeNull();
  });
});

describe('ReputationPageContent structure – partial state', () => {
  it('renders a meter role in partial state', () => {
    const { container } = render(
      <ReputationPageContent reputationData={PARTIAL_REPUTATION} userName="Eve" />
    );
    expect(container.querySelector('[role="meter"]')).not.toBeNull();
  });

  it('does NOT render an <ol> in partial state (no history events)', () => {
    const { container } = render(
      <ReputationPageContent reputationData={PARTIAL_REPUTATION} userName="Eve" />
    );
    expect(container.querySelector('ol')).toBeNull();
  });
});

describe('ReputationPageContent structure – loaded state', () => {
  it('renders an <ol> for reputation history', () => {
    const { container } = render(
      <ReputationPageContent reputationData={FULL_REPUTATION} userName="Grace" />
    );
    const ol = container.querySelector('ol');
    expect(ol).not.toBeNull();
    const items = ol?.querySelectorAll('li');
    expect(items?.length).toBe(HISTORY_EVENTS.length);
  });

  it('wraps each event date in a <time> element', () => {
    const { container } = render(
      <ReputationPageContent reputationData={FULL_REPUTATION} userName="Grace" />
    );
    const timeEls = container.querySelectorAll('time');
    expect(timeEls.length).toBe(HISTORY_EVENTS.length);
    HISTORY_EVENTS.forEach((ev, idx) => {
      expect(timeEls[idx].getAttribute('dateTime')).toBe(ev.date);
      expect(timeEls[idx].textContent).toBe(ev.date);
    });
  });

  it('renders a meter role in loaded state', () => {
    const { container } = render(
      <ReputationPageContent reputationData={FULL_REPUTATION} userName="Grace" />
    );
    const meter = container.querySelector('[role="meter"]');
    expect(meter).not.toBeNull();
    expect(meter?.getAttribute('aria-valuenow')).toBe(String(FULL_REPUTATION.score));
  });
});

describe('ReputationLoading structure – aria attributes', () => {
  it('renders <main> with aria-busy="true"', () => {
    const { container } = render(<ReputationLoading />);
    const main = container.querySelector('main');
    expect(main?.getAttribute('aria-busy')).toBe('true');
  });

  it('renders a role="status" announcement element', () => {
    const { container } = render(<ReputationLoading />);
    const status = container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.textContent).toMatch(/Loading reputation/i);
  });
});
