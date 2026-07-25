/**
 * ReputationProfile.snapshot.test.tsx – structural / snapshot tests
 *
 * Guards the full rendered DOM tree of the ReputationProfile component for
 * every meaningful state so unintentional markup changes are caught at CI.
 *
 * States covered:
 *   1. No reputation  – undefined score
 *   2. No reputation  – null score
 *   3. Edge           – score === 0 (falsy-but-valid, hasReputation = true)
 *   4. Partial        – score present, history empty (amber banner)
 *   5. Loaded / full  – score + history (ordered list + <time> elements)
 *   6. Custom maxScore – score rendered against a non-default scale
 *
 * Determinism rules:
 *   - All fixture ids, dates, names, scores are hard-coded constants.
 *   - No `Date.now()`, `Math.random()`, or dynamic values appear in props.
 *   - Snapshots auto-generate on first run; update with `--updateSnapshot`
 *     when a change is intentional.
 *
 * Structural guards below the snapshot block give plain-english failure
 * messages for the most important DOM contracts, making regressions obvious
 * without reading a raw snapshot diff.
 */

import React from 'react';
import { render } from '@testing-library/react';
import ReputationProfile, {
  ReputationEvent,
  ReputationProfileProps,
} from './ReputationProfile';

// ---------------------------------------------------------------------------
// Shared fixtures
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

function snap(props: ReputationProfileProps) {
  const { container } = render(<ReputationProfile {...props} />);
  return container.firstChild;
}

// ---------------------------------------------------------------------------
// 1. No-reputation snapshot – undefined score
// ---------------------------------------------------------------------------

describe('ReputationProfile snapshot – no reputation (undefined score)', () => {
  it('matches snapshot', () => {
    expect(
      snap({ name: 'Guest User', history: [] })
    ).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// 2. No-reputation snapshot – null score
// ---------------------------------------------------------------------------

describe('ReputationProfile snapshot – no reputation (null score)', () => {
  it('matches snapshot', () => {
    expect(
      snap({ name: 'Legacy User', score: null, history: [] })
    ).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// 3. Edge snapshot – score === 0
// ---------------------------------------------------------------------------

describe('ReputationProfile snapshot – edge: score === 0', () => {
  it('matches snapshot (falsy-but-valid score)', () => {
    expect(
      snap({ name: 'New Member', score: 0, level: 'Newcomer', history: [] })
    ).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// 4. Partial-reputation snapshot – score present, history empty
// ---------------------------------------------------------------------------

describe('ReputationProfile snapshot – partial reputation (score, no history)', () => {
  it('matches snapshot with amber banner', () => {
    expect(
      snap({
        name: 'Partial User',
        score: 2.5,
        level: 'Active Contributor',
        history: [],
      })
    ).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// 5. Full-reputation snapshot – score + history
// ---------------------------------------------------------------------------

describe('ReputationProfile snapshot – full reputation (score + history)', () => {
  it('matches snapshot with history events', () => {
    expect(
      snap({
        name: 'Verified User',
        score: 3.8,
        level: 'Trusted Partner',
        history: HISTORY_EVENTS,
      })
    ).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// 6. Custom maxScore snapshot
// ---------------------------------------------------------------------------

describe('ReputationProfile snapshot – custom maxScore', () => {
  it('matches snapshot with maxScore=10', () => {
    expect(
      snap({
        name: 'Scaled User',
        score: 7.5,
        level: 'Trusted Partner',
        maxScore: 10,
        history: HISTORY_EVENTS,
      })
    ).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Structural guards – supplement snapshots with plain-language assertions
// ---------------------------------------------------------------------------

describe('ReputationProfile structure – no-reputation state', () => {
  it('renders a <section> with aria-labelledby="profile-heading"', () => {
    const { container } = render(<ReputationProfile name="Guest" history={[]} />);
    const section = container.querySelector('section[aria-labelledby="profile-heading"]');
    expect(section).not.toBeNull();
  });

  it('does NOT render a meter role', () => {
    const { container } = render(<ReputationProfile name="Guest" history={[]} />);
    expect(container.querySelector('[role="meter"]')).toBeNull();
  });

  it('does NOT render an <ol>', () => {
    const { container } = render(<ReputationProfile name="Guest" history={[]} />);
    // The loading skeleton uses <ol> for event rows; but the history-empty
    // state in ReputationProfile must not render an <ol> at all.
    expect(container.querySelector('ol')).toBeNull();
  });

  it('does NOT render the amber partial banner', () => {
    const { container } = render(<ReputationProfile name="Guest" score={undefined} history={[]} />);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/Partial reputation data/i);
  });

  it('does NOT render the reputation level legend', () => {
    const { container } = render(<ReputationProfile name="Guest" history={[]} />);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/Reputation Level Legend/i);
  });

  it('renders the sr-only profile heading element', () => {
    const { container } = render(<ReputationProfile name="Test User" history={[]} />);
    const heading = container.querySelector('#profile-heading');
    expect(heading).not.toBeNull();
    expect(heading?.classList.contains('sr-only')).toBe(true);
    expect(heading?.textContent).toMatch(/Reputation profile for Test User/i);
  });
});

describe('ReputationProfile structure – partial state', () => {
  it('renders a meter role with correct ARIA attributes', () => {
    const { container } = render(
      <ReputationProfile name="Partial User" score={2.5} level="Active Contributor" history={[]} />
    );
    const meter = container.querySelector('[role="meter"]');
    expect(meter).not.toBeNull();
    expect(meter?.getAttribute('aria-valuenow')).toBe('2.5');
    expect(meter?.getAttribute('aria-valuemin')).toBe('0');
    expect(meter?.getAttribute('aria-valuemax')).toBe('5');
    expect(meter?.getAttribute('aria-labelledby')).toBe('reputation-score-label');
  });

  it('renders the amber partial-data banner', () => {
    const { container } = render(
      <ReputationProfile name="Partial User" score={2.5} level="Active Contributor" history={[]} />
    );
    const text = container.textContent ?? '';
    expect(text).toMatch(/Partial reputation data/i);
  });

  it('renders the reputation level legend', () => {
    const { container } = render(
      <ReputationProfile name="Partial User" score={2.5} level="Active Contributor" history={[]} />
    );
    const text = container.textContent ?? '';
    expect(text).toMatch(/Reputation Level Legend/i);
  });

  it('does NOT render an <ol> (no history events)', () => {
    const { container } = render(
      <ReputationProfile name="Partial User" score={2.5} history={[]} />
    );
    expect(container.querySelector('ol')).toBeNull();
  });
});

describe('ReputationProfile structure – full/loaded state', () => {
  it('renders an <ol> for the history events', () => {
    const { container } = render(
      <ReputationProfile
        name="Verified User"
        score={3.8}
        level="Trusted Partner"
        history={HISTORY_EVENTS}
      />
    );
    const ol = container.querySelector('ol');
    expect(ol).not.toBeNull();
    expect(ol?.querySelectorAll('li').length).toBe(HISTORY_EVENTS.length);
  });

  it('renders each date inside a <time> element with the correct dateTime', () => {
    const { container } = render(
      <ReputationProfile
        name="Verified User"
        score={3.8}
        level="Trusted Partner"
        history={HISTORY_EVENTS}
      />
    );
    const timeEls = Array.from(container.querySelectorAll('time'));
    // Only history-section <time> elements (not any stray ones)
    expect(timeEls.length).toBe(HISTORY_EVENTS.length);
    HISTORY_EVENTS.forEach((ev, idx) => {
      expect(timeEls[idx].getAttribute('dateTime')).toBe(ev.date);
      expect(timeEls[idx].textContent).toBe(ev.date);
    });
  });

  it('omits dateTime attribute when event.date is not parseable', () => {
    const badDateEvent: ReputationEvent = {
      id: 'ev-bad',
      type: 'Unknown',
      summary: 'Event with bad date',
      date: 'not-a-date',
    };
    const { container } = render(
      <ReputationProfile
        name="Bad Date User"
        score={3.8}
        history={[badDateEvent]}
      />
    );
    const timeEl = container.querySelector('time');
    expect(timeEl).not.toBeNull();
    expect(timeEl?.hasAttribute('dateTime')).toBe(false);
    expect(timeEl?.textContent).toBe('not-a-date');
  });

  it('renders the "Visible" badge when history is non-empty', () => {
    const { container } = render(
      <ReputationProfile name="Verified User" score={3.8} history={HISTORY_EVENTS} />
    );
    // The badge is a <span> containing the exact text "Visible"
    const spans = Array.from(container.querySelectorAll('span'));
    const visibleBadge = spans.find((el) => el.textContent?.trim() === 'Visible');
    expect(visibleBadge).toBeDefined();
  });

  it('does NOT render the partial amber banner', () => {
    const { container } = render(
      <ReputationProfile name="Verified User" score={3.8} history={HISTORY_EVENTS} />
    );
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/Partial reputation data/i);
  });

  it('meter aria-valuenow equals the score value', () => {
    const { container } = render(
      <ReputationProfile name="Verified User" score={3.8} history={HISTORY_EVENTS} />
    );
    const meter = container.querySelector('[role="meter"]');
    expect(meter?.getAttribute('aria-valuenow')).toBe('3.8');
  });

  it('meter aria-valuemax reflects custom maxScore', () => {
    const { container } = render(
      <ReputationProfile name="Scaled User" score={7.5} maxScore={10} history={HISTORY_EVENTS} />
    );
    const meter = container.querySelector('[role="meter"]');
    expect(meter?.getAttribute('aria-valuemax')).toBe('10');
  });

  it('renders the reputation level legend', () => {
    const { container } = render(
      <ReputationProfile name="Verified User" score={3.8} history={HISTORY_EVENTS} />
    );
    const text = container.textContent ?? '';
    expect(text).toMatch(/Reputation Level Legend/i);
  });
});
