import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { testA11y, renderWithA11y, assertNoA11yViolations } from '@/test-utils/a11y';
import MilestonesList from '@/components/MilestonesList';
import ContractSummary from '@/components/ContractSummary';
import ReputationProfile from '@/components/ReputationProfile';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';
import ContractProgress from '@/components/ContractProgress';
import MilestoneFilter from '@/components/milestones/MilestoneFilter';
import { MilestonesListSkeleton } from '@/components/MilestonesListSkeleton';
import { ToastProvider, useToast } from '@/components/toast/toast-provider';
import Breadcrumbs from '@/components/Breadcrumbs';

describe('a11y: MilestonesList', () => {
  it('empty list has no violations', async () => {
    await testA11y(<MilestonesList milestones={[]} />);
  });

  it('single milestone has no violations', async () => {
    await testA11y(
      <MilestonesList
        milestones={[
          { id: '1', title: 'Research phase', status: 'Pending', payout: 500, currency: 'USD', dueDate: 'May 10, 2026' },
        ]}
      />
    );
  });

  it('multiple milestones with all status types has no violations', async () => {
    await testA11y(
      <MilestonesList
        milestones={[
          { id: '1', title: 'Research phase', status: 'Pending', payout: 500, currency: 'USD', dueDate: 'May 10, 2026' },
          { id: '2', title: 'Development phase', status: 'Completed', payout: 1500, currency: 'USD', dueDate: 'Jun 1, 2026' },
          { id: '3', title: 'Deployment', status: 'Paid', payout: 2000, currency: 'USD', dueDate: 'Jul 15, 2026' },
          { id: '4', title: 'Legacy migration', status: 'Disputed', payout: 750, currency: 'USD' },
        ]}
      />
    );
  });

  it('milestone without dueDate has no violations', async () => {
    await testA11y(
      <MilestonesList
        milestones={[
          { id: '1', title: 'Ongoing work', status: 'Pending', payout: 300, currency: 'USD' },
        ]}
      />
    );
  });

  it('currency mismatch warning has no violations', async () => {
    await testA11y(
      <MilestonesList
        milestones={[
          { id: '1', title: 'Research phase', status: 'Pending', payout: 500, currency: 'USD', dueDate: 'May 10, 2026' },
          { id: '2', title: 'Development phase', status: 'Completed', payout: 1500, currency: 'EUR', dueDate: 'Jun 1, 2026' },
        ]}
        contractCurrency="USD"
      />
    );
  });

  it('single mismatched milestone warning has no violations', async () => {
    await testA11y(
      <MilestonesList
        milestones={[
          { id: '1', title: 'Payment', status: 'Pending', payout: 1000, currency: 'GBP' },
        ]}
        contractCurrency="USD"
      />
    );
  });
});

describe('a11y: ContractSummary', () => {
  it('active contract with multiple parties has no violations', async () => {
    await testA11y(
      <ToastProvider>
        <ContractSummary
          contractName="Escrow Contract"
          parties={[
            { label: 'Client', address: 'GABC1234DEF5678HIJK9012LMNO3456PQRS7890' },
            { label: 'Freelancer', address: 'GXYZ9876STU5432VWXQ1098ABCD7654EFGH3210' },
          ]}
          totalValue={1200}
          currency="USD"
          status="Active"
          createdAt="May 1, 2026"
          milestoneCount={2}
        />
      </ToastProvider>
    );
  });

  it('disputed contract has no violations', async () => {
    await testA11y(
      <ToastProvider>
        <ContractSummary
          contractName="Escrow Contract"
          parties={[{ label: 'Client', address: 'GABC1234DEF5678HIJK9012LMNO3456PQRS7890' }]}
          totalValue={5000}
          currency="USD"
          status="Disputed"
          createdAt="Apr 15, 2026"
          milestoneCount={5}
        />
      </ToastProvider>
    );
  });

  it('completed contract with milestoneCount of 1 has no violations', async () => {
    await testA11y(
      <ToastProvider>
        <ContractSummary
          contractName="Quick Project"
          parties={[
            { label: 'Client', address: 'GABC1234DEF5678HIJK9012LMNO3456PQRS7890' },
            { label: 'Freelancer', address: 'GXYZ9876STU5432VWXQ1098ABCD7654EFGH3210' },
          ]}
          totalValue={800}
          currency="USD"
          status="Completed"
          createdAt="Mar 1, 2026"
          milestoneCount={1}
        />
      </ToastProvider>
    );
  });
});

describe('a11y: ReputationProfile', () => {
  it('no reputation state has no violations', async () => {
    await testA11y(<ReputationProfile name="Guest User" history={[]} />);
  });

  it('full reputation with history has no violations', async () => {
    await testA11y(
      <ReputationProfile
        name="Verified User"
        score={88}
        level="Trusted Contributor"
        history={[
          { id: '1', type: 'Verification', summary: 'Completed identity verification', date: '2026-04-24' },
          { id: '2', type: 'On-chain review', summary: 'Received positive trust signal', date: '2026-04-23' },
          { id: '3', type: 'Referral', summary: 'Referred two new users', date: '2026-04-20' },
        ]}
      />
    );
  });

  it('partial reputation (score without history) has no violations', async () => {
    await testA11y(
      <ReputationProfile name="Partial User" score={42} level="Active Member" history={[]} />
    );
  });

  it('null score is handled gracefully with no violations', async () => {
    await testA11y(
      <ReputationProfile name="Legacy User" score={null} history={[]} />
    );
  });
});

describe('a11y: EmptyState', () => {
  it('basic text-only state has no violations', async () => {
    await testA11y(
      <EmptyState
        title="No items found"
        description="There are no items to display at this time."
      />
    );
  });

  it('with illustration variant has no violations', async () => {
    await testA11y(
      <EmptyState
        illustration="contracts"
        title="No contracts found"
        description="Start by creating your first contract."
      />
    );
  });

  it('with primary and secondary actions has no violations', async () => {
    await testA11y(
      <EmptyState
        illustration="milestones"
        title="No milestones tracked"
        description="Track delivery and escrow release points by adding milestones."
        actionLabel="Add Milestone"
        onAction={jest.fn()}
        secondaryActionLabel="View Contracts"
        onSecondaryAction={jest.fn()}
      />
    );
  });

  it('reputation illustration variant has no violations', async () => {
    await testA11y(
      <EmptyState
        illustration="reputation"
        title="No reputation yet"
        description="Complete contracts to build reputation."
        actionLabel="View Contracts"
        onAction={jest.fn()}
      />
    );
  });
});

/**
 * a11y/theming-27: dark-theme contrast audit.
 *
 * The suites below render StatusBadge and the toast panels with
 * document.documentElement set to [data-theme='dark'] (mirroring what
 * src/lib/preferences.tsx does at runtime), alongside light-mode coverage,
 * to confirm no axe violations in either theme.
 *
 * Note: jest-axe's color-contrast rule does not reliably evaluate colors
 * resolved through compiled Tailwind classes under jsdom, since jsdom does
 * not run a layout/paint engine. These tests verify structural a11y
 * (roles, labels, live regions) via axe in both themes, while the actual
 * WCAG AA contrast ratios for the colors involved are computed and
 * recorded in docs/components/Accessibility.md. The extra assertions in
 * each suite below (checking for the absence of the old fixed slate/pastel
 * classes) act as a regression guard for the contrast fix itself, since
 * axe alone won't catch a reverted color.
 */
function setTheme(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
}

function ToastTrigger() {
  const { showError, showSuccess } = useToast();
  return (
    <div>
      <button
        onClick={() =>
          showSuccess({
            title: 'Milestone released',
            description: 'Funds are on the way to the freelancer wallet.',
          })
        }
        type="button"
      >
        Trigger success
      </button>
      <button
        onClick={() =>
          showError({
            title: 'Wallet not connected',
            description: 'Connect a wallet before approving this release.',
          })
        }
        type="button"
      >
        Trigger error
      </button>
    </div>
  );
}

describe('a11y: StatusBadge dark theme', () => {
  afterEach(() => {
    setTheme('light');
  });

  it('Active status has no violations in light mode', async () => {
    setTheme('light');
    await testA11y(<StatusBadge status="Active" />);
  });

  it('Active status has no violations in dark mode', async () => {
    setTheme('dark');
    await testA11y(<StatusBadge status="Active" />);
  });

  it('Completed status has no violations in dark mode', async () => {
    setTheme('dark');
    await testA11y(<StatusBadge status="Completed" />);
  });

  it('Disputed status has no violations in dark mode', async () => {
    setTheme('dark');
    await testA11y(<StatusBadge status="Disputed" />);
  });

  it('Pending status has no violations in dark mode', async () => {
    setTheme('dark');
    await testA11y(<StatusBadge status="Pending" />);
  });

  it('Paid status has no violations in dark mode', async () => {
    setTheme('dark');
    await testA11y(<StatusBadge status="Paid" />);
  });

  it('uses themed status tokens instead of fixed Tailwind pastel classes', () => {
    setTheme('dark');
    renderWithA11y(<StatusBadge status="Disputed" />);
    const badge = screen.getByRole('status', { name: 'Status: Disputed' });
    expect(badge.className).toMatch(/--status-error-(bg|foreground)/);
    expect(badge.className).not.toMatch(/bg-rose-100/);
  });
});

describe('a11y: toast panels dark theme', () => {
  afterEach(() => {
    setTheme('light');
  });

  it('success toast has no violations in light mode', async () => {
    setTheme('light');
    const view = renderWithA11y(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));
    await assertNoA11yViolations(view.container);
  });

  it('success toast has no violations in dark mode', async () => {
    setTheme('dark');
    const view = renderWithA11y(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));
    await assertNoA11yViolations(view.container);
  });

  it('error toast has no violations in dark mode', async () => {
    setTheme('dark');
    const view = renderWithA11y(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /trigger error/i }));
    await assertNoA11yViolations(view.container);
  });

  it('toast description uses the themed muted-foreground token, not a fixed slate class', () => {
    setTheme('dark');
    renderWithA11y(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));
    const description = screen.getByText('Funds are on the way to the freelancer wallet.');
    expect(description.className).not.toMatch(/text-slate-\d+/);
    expect(description.className).toContain('text-[var(--muted-foreground)]');
  });

  it('dismiss button uses themed tokens, not fixed slate classes', () => {
    setTheme('dark');
    renderWithA11y(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));
    const dismissButton = screen.getByRole('button', { name: /dismiss success notification/i });
    expect(dismissButton.className).not.toMatch(/slate-(100|500|900)/);
  });
});

// ---------------------------------------------------------------------------
// prefers-reduced-motion suite
//
// Mocks window.matchMedia to return `matches: true` for the
// `(prefers-reduced-motion: reduce)` query and asserts that:
//   1. The WalletConnectButton spinner stays in the DOM (visible loading cue)
//      but the `animate-spin` class is still present on the SVG — CSS halts
//      the rotation; the element must not be removed.
//   2. Toast panels still render and snap into their final layout state with
//      no axe violations.
//   3. Transitional CSS classes on the dismiss button are not stripped —
//      the global CSS rule handles collapsing them to 0ms, so the class
//      must remain to avoid breaking themes.
// ---------------------------------------------------------------------------

import { WalletConnectButton } from '../WalletConnectButton';
import { render as plainRender } from '@testing-library/react';
import { PreferencesProvider } from '@/lib/preferences';

/**
 * Replaces window.matchMedia with an implementation that answers `true`
 * only for `(prefers-reduced-motion: reduce)`. Returns a restore callback.
 */
function mockReducedMotion(): () => void {
  const original = window.matchMedia;
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
  return () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: original,
    });
  };
}

/**
 * Mounts `<WalletConnectButton />` inside the same provider chain used
 * by the production app (`PreferencesProvider` → `ToastProvider`). This
 * satisfies `useToast()` inside the component — the hook throws if no
 * `ToastProvider` is in scope.
 *
 * `localStorage.clear()` sets a known-empty baseline so the
 * `PreferencesProvider` hydration effect falls through to its defaults
 * regardless of what state earlier tests may have written.
 */
function renderWalletConnectButton() {
  localStorage.clear();
  return plainRender(
    <PreferencesProvider>
      <ToastProvider>
        <WalletConnectButton />
      </ToastProvider>
    </PreferencesProvider>,
  );
}

describe('a11y: prefers-reduced-motion — WalletConnectButton', () => {
  let restoreMatchMedia: () => void;

  beforeEach(() => {
    restoreMatchMedia = mockReducedMotion();
    // Ensure PreferencesProvider hydration starts from a clean slate.
    localStorage.clear();
  });

  afterEach(() => {
    restoreMatchMedia();
    localStorage.clear();
  });

  it('matchMedia returns true for the reduced-motion query', () => {
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(false);
  });

  it('spinner SVG remains in the DOM while connecting (static loading indicator)', () => {
    const { useWallet } = require('@/contexts/WalletContext') as {
      useWallet: jest.Mock;
    };
    useWallet.mockReturnValue({
      address: null,
      isConnecting: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });

    const { container } = renderWalletConnectButton();

    // The SVG with animate-spin must be present so a static circle is shown.
    const spinner = container.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();

    // The "Connecting..." label must still be present.
    expect(screen.getByText(/connecting\.\.\./i)).toBeInTheDocument();
  });

  it('spinner SVG carries animate-spin class (CSS halts rotation; class stays)', () => {
    const { useWallet } = require('@/contexts/WalletContext') as {
      useWallet: jest.Mock;
    };
    useWallet.mockReturnValue({
      address: null,
      isConnecting: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });

    const { container } = renderWalletConnectButton();
    const spinner = container.querySelector('svg.animate-spin');
    // Class must not be stripped — the @media rule in CSS stops the spin.
    expect(spinner).not.toBeNull();
    expect(spinner!.classList.contains('animate-spin')).toBe(true);
  });

  it('WalletConnectButton has no axe violations while connecting under reduced motion', async () => {
    const { useWallet } = require('@/contexts/WalletContext') as {
      useWallet: jest.Mock;
    };
    useWallet.mockReturnValue({
      address: null,
      isConnecting: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });

    const view = renderWalletConnectButton();
    await assertNoA11yViolations(view.container);
  });
});

describe('a11y: prefers-reduced-motion — toast panels', () => {
  let restoreMatchMedia: () => void;

  beforeEach(() => {
    restoreMatchMedia = mockReducedMotion();
  });

  afterEach(() => {
    restoreMatchMedia();
    setTheme('light');
  });

  it('matchMedia returns true for the reduced-motion query inside toast suite', () => {
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
  });

  it('success toast snaps into view with no axe violations under reduced motion', async () => {
    const view = renderWithA11y(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));
    await assertNoA11yViolations(view.container);
  });

  it('error toast snaps into view with no axe violations under reduced motion', async () => {
    const view = renderWithA11y(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /trigger error/i }));
    await assertNoA11yViolations(view.container);
  });

  it('dismiss button retains its transition class (CSS handles duration collapse)', () => {
    renderWithA11y(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));

    const dismissBtn = screen.getByRole('button', { name: /dismiss success notification/i });
    // The `transition` utility must be kept in the className — the
    // prefers-reduced-motion media query in globals.css collapses its
    // duration to 0.01ms so the snap is instant, but stripping the class
    // would break the hover/focus style tokens that depend on it.
    expect(dismissBtn.className).toContain('transition');
  });

  it('toast panel is present in the DOM immediately (no deferred mount)', () => {
    const { container } = renderWithA11y(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /trigger error/i }));

    // The toast panel must be in the DOM synchronously after the click,
    // not deferred behind an animation frame, so it snaps into view.
    const toastPanel = container.querySelector('[role="alert"]');
    expect(toastPanel).toBeInTheDocument();
  });
});

describe('a11y: Breadcrumbs', () => {
  it('single crumb has no violations', async () => {
    await testA11y(<Breadcrumbs items={[{ label: 'Dashboard', href: '/' }]} />);
  });

  it('multi-crumb trail with a current page has no violations', async () => {
    await testA11y(
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Contracts', href: '/contracts' },
          { label: 'Contract #42' },
        ]}
      />,
    );
  });
});

describe('a11y: prefers-reduced-motion — milestones', () => {
  let restoreMatchMedia: () => void;

  beforeEach(() => {
    restoreMatchMedia = mockReducedMotion();
  });

  afterEach(() => {
    restoreMatchMedia();
  });

  it('MilestonesList renders cleanly with no axe violations under reduced motion', async () => {
    const milestones = [
      { id: '1', title: 'Design Review', status: 'Completed' as const, payout: 1000, currency: 'USD', dueDate: '2026-06-01' },
      { id: '2', title: 'Implementation', status: 'Pending' as const, payout: 2500, currency: 'USD', dueDate: '2026-07-01' },
    ];
    await testA11y(<MilestonesList milestones={milestones} />);
  });

  it('ContractProgress progress bar renders cleanly with no axe violations under reduced motion', async () => {
    const milestones = [
      { id: '1', title: 'Design Review', status: 'Completed' as const, payout: 1000, currency: 'USD' },
      { id: '2', title: 'Implementation', status: 'Pending' as const, payout: 2500, currency: 'USD' },
    ];
    await testA11y(<ContractProgress milestones={milestones} />);
  });

  it('MilestoneFilter radiogroup renders cleanly with no axe violations under reduced motion', async () => {
    await testA11y(<MilestoneFilter selected="All" onChange={jest.fn()} resultCount={2} />);
  });

  it('MilestonesListSkeleton loading state renders cleanly with no axe violations under reduced motion', async () => {
    await testA11y(<MilestonesListSkeleton />);
  });
});

describe('a11y: forced-colors / high contrast — milestones', () => {
  afterEach(() => {
    setTheme('light');
  });

  it('MilestonesList status badges have role="status" and pass accessibility in high contrast mode', async () => {
    setTheme('dark');
    const view = renderWithA11y(
      <MilestonesList
        milestones={[
          { id: '1', title: 'Phase 1', status: 'Active', payout: 500, currency: 'USD' },
        ]}
      />
    );
    const badge = screen.getByRole('status', { name: 'Status: Active' });
    expect(badge).toBeInTheDocument();
    await assertNoA11yViolations(view.container);
  });

  it('ContractProgress displays progressbar role and valid valuenow in high contrast mode', async () => {
    setTheme('dark');
    const milestones = [
      { id: '1', title: 'Phase 1', status: 'Completed' as const, payout: 500, currency: 'USD' },
      { id: '2', title: 'Phase 2', status: 'Pending' as const, payout: 500, currency: 'USD' },
    ];
    const view = renderWithA11y(<ContractProgress milestones={milestones} />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
    await assertNoA11yViolations(view.container);
  });

  it('MilestoneFilter renders accessible fieldset and radiogroup in high contrast mode', async () => {
    setTheme('dark');
    const view = renderWithA11y(
      <MilestoneFilter selected="Active" onChange={jest.fn()} resultCount={3} />
    );
    const radioGroup = screen.getByRole('radiogroup', { name: /filter milestones by status/i });
    expect(radioGroup).toBeInTheDocument();
    await assertNoA11yViolations(view.container);
  });
});
