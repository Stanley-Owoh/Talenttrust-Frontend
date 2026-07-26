/**
 * Snapshot / structural regression tests for SettingsPanel.
 *
 * These tests guard the rendered DOM output so unintentional markup changes
 * are caught immediately. Snapshots must be updated deliberately when the
 * component output is intentionally changed:
 *
 *   npx jest --testPathPattern=SettingsPanel.snapshot --updateSnapshot
 *
 * Coverage targets
 * ─────────────────
 * - closed state (renders null)
 * - open / default state (all defaults: theme=system, amountFormat=usd,
 *   toastDensity=relaxed, quietMode=false)
 * - each theme active (light, dark, system)
 * - each currency active (usd, ngn, compact)
 * - each toast-density active (relaxed, compact)
 * - quietMode on / off
 * - pre-seeded "fully-loaded" state (all non-default values)
 * - structural assertions (section headings, button counts, ARIA roles)
 *   so regressions are human-readable without diffing raw HTML blobs
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsPanel } from '../SettingsPanel';
import { PreferencesProvider } from '@/lib/preferences';
import { resetCache } from '@/lib/safeStorage';

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Seed localStorage before rendering so the Provider picks it up on mount.
 */
function seedPreferences(overrides: Record<string, unknown> = {}) {
  localStorage.setItem(
    'talenttrust-user-preferences',
    JSON.stringify(overrides),
  );
}

/**
 * Render SettingsPanel inside a fresh PreferencesProvider.
 * localStorage and the safeStorage cache are cleared before every test via
 * the global beforeEach — no need to do it here.
 */
function renderPanel(isOpen: boolean, onClose = jest.fn()) {
  return render(
    <PreferencesProvider>
      <SettingsPanel isOpen={isOpen} onClose={onClose} />
    </PreferencesProvider>,
  );
}

// ─── setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  resetCache();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. CLOSED STATE
// ─────────────────────────────────────────────────────────────────────────────

describe('SettingsPanel – closed state', () => {
  it('renders null when isOpen is false', () => {
    const { container } = renderPanel(false);
    expect(container.firstChild).toBeNull();
  });

  it('matches snapshot when closed (empty output)', () => {
    const { container } = renderPanel(false);
    expect(container).toMatchSnapshot();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. OPEN / DEFAULT STATE
// ─────────────────────────────────────────────────────────────────────────────

describe('SettingsPanel – open, default preferences', () => {
  it('matches snapshot with all default preferences', () => {
    // No localStorage seed → defaults: theme=system, amountFormat=usd,
    // toastDensity=relaxed, quietMode=false
    const { container } = renderPanel(true);
    expect(container).toMatchSnapshot();
  });

  it('renders the dialog wrapper as the direct container child', () => {
    const { container } = renderPanel(true);
    // The outermost element is the fixed backdrop wrapper, not the dialog itself
    expect(container.firstChild).not.toBeNull();
  });

  it('renders the panel with role="dialog"', () => {
    renderPanel(true);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('dialog has aria-modal="true"', () => {
    renderPanel(true);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('dialog is labelled by the Settings heading', () => {
    renderPanel(true);
    const dialog = screen.getByRole('dialog');
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)).toHaveTextContent('Settings');
  });

  // ── section headings ──────────────────────────────────────────────────────

  it('renders the "Appearance" section heading', () => {
    renderPanel(true);
    expect(
      screen.getByText('Appearance', { selector: 'h3' }),
    ).toBeInTheDocument();
  });

  it('renders the "Notifications" section heading', () => {
    renderPanel(true);
    expect(
      screen.getByText('Notifications', { selector: 'h3' }),
    ).toBeInTheDocument();
  });

  // ── control counts ────────────────────────────────────────────────────────

  it('renders exactly 3 theme radio buttons (light, dark, system)', () => {
    renderPanel(true);
    const themeGroup = screen.getByRole('radiogroup', { name: /theme/i });
    expect(within(themeGroup).getAllByRole('radio')).toHaveLength(3);
  });

  it('renders exactly 3 currency radio buttons (usd, ngn, compact)', () => {
    renderPanel(true);
    const currencyGroup = screen.getByRole('radiogroup', { name: /currency display/i });
    expect(within(currencyGroup).getAllByRole('radio')).toHaveLength(3);
  });

  it('renders exactly 2 toast-density radio buttons (relaxed, compact)', () => {
    renderPanel(true);
    const densityGroup = screen.getByRole('radiogroup', { name: /toast density/i });
    expect(within(densityGroup).getAllByRole('radio')).toHaveLength(2);
  });

  it('renders the quiet-mode switch', () => {
    renderPanel(true);
    expect(screen.getByRole('switch', { name: /quiet mode/i })).toBeInTheDocument();
  });

  it('renders a "Close settings" button', () => {
    renderPanel(true);
    expect(
      screen.getByRole('button', { name: /close settings/i }),
    ).toBeInTheDocument();
  });

  it('renders a "Done" button', () => {
    renderPanel(true);
    expect(
      screen.getByRole('button', { name: /done/i }),
    ).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. THEME OPTION STATES
// ─────────────────────────────────────────────────────────────────────────────

describe('SettingsPanel – theme states', () => {
  it('matches snapshot when theme is "light"', () => {
    seedPreferences({ theme: 'light' });
    const { container } = renderPanel(true);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot when theme is "dark"', () => {
    seedPreferences({ theme: 'dark' });
    const { container } = renderPanel(true);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot when theme is "system" (default)', () => {
    seedPreferences({ theme: 'system' });
    const { container } = renderPanel(true);
    expect(container).toMatchSnapshot();
  });

  it('marks only the active theme button as aria-checked=true (light)', () => {
    seedPreferences({ theme: 'light' });
    renderPanel(true);
    const group = screen.getByRole('radiogroup', { name: /theme/i });
    expect(within(group).getByRole('radio', { name: /light/i })).toHaveAttribute('aria-checked', 'true');
    expect(within(group).getByRole('radio', { name: /dark/i })).toHaveAttribute('aria-checked', 'false');
    expect(within(group).getByRole('radio', { name: /system/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('marks only the active theme button as aria-checked=true (dark)', () => {
    seedPreferences({ theme: 'dark' });
    renderPanel(true);
    const group = screen.getByRole('radiogroup', { name: /theme/i });
    expect(within(group).getByRole('radio', { name: /dark/i })).toHaveAttribute('aria-checked', 'true');
    expect(within(group).getByRole('radio', { name: /light/i })).toHaveAttribute('aria-checked', 'false');
    expect(within(group).getByRole('radio', { name: /system/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('marks only the active theme button as aria-checked=true (system)', () => {
    seedPreferences({ theme: 'system' });
    renderPanel(true);
    const group = screen.getByRole('radiogroup', { name: /theme/i });
    expect(within(group).getByRole('radio', { name: /system/i })).toHaveAttribute('aria-checked', 'true');
    expect(within(group).getByRole('radio', { name: /light/i })).toHaveAttribute('aria-checked', 'false');
    expect(within(group).getByRole('radio', { name: /dark/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('active theme button carries the primary background class', () => {
    seedPreferences({ theme: 'dark' });
    renderPanel(true);
    const group = screen.getByRole('radiogroup', { name: /theme/i });
    const darkBtn = within(group).getByRole('radio', { name: /dark/i });
    expect(darkBtn.className).toContain('bg-[var(--primary)]');
  });

  it('inactive theme buttons do NOT carry the primary background class', () => {
    seedPreferences({ theme: 'dark' });
    renderPanel(true);
    const group = screen.getByRole('radiogroup', { name: /theme/i });
    const lightBtn = within(group).getByRole('radio', { name: /light/i });
    expect(lightBtn.className).not.toContain('bg-[var(--primary)]');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. CURRENCY DISPLAY OPTION STATES
// ─────────────────────────────────────────────────────────────────────────────

describe('SettingsPanel – currency display states', () => {
  it('matches snapshot when amountFormat is "usd"', () => {
    seedPreferences({ amountFormat: 'usd' });
    const { container } = renderPanel(true);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot when amountFormat is "ngn"', () => {
    seedPreferences({ amountFormat: 'ngn' });
    const { container } = renderPanel(true);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot when amountFormat is "compact"', () => {
    seedPreferences({ amountFormat: 'compact' });
    const { container } = renderPanel(true);
    expect(container).toMatchSnapshot();
  });

  it('marks only the active currency button as aria-checked=true (ngn)', () => {
    seedPreferences({ amountFormat: 'ngn' });
    renderPanel(true);
    const group = screen.getByRole('radiogroup', { name: /currency display/i });
    expect(within(group).getByRole('radio', { name: /ngn/i })).toHaveAttribute('aria-checked', 'true');
    expect(within(group).getByRole('radio', { name: /usd/i })).toHaveAttribute('aria-checked', 'false');
    expect(within(group).getByRole('radio', { name: /compact/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('marks only the active currency button as aria-checked=true (compact)', () => {
    seedPreferences({ amountFormat: 'compact' });
    renderPanel(true);
    const group = screen.getByRole('radiogroup', { name: /currency display/i });
    expect(within(group).getByRole('radio', { name: /compact/i })).toHaveAttribute('aria-checked', 'true');
    expect(within(group).getByRole('radio', { name: /usd/i })).toHaveAttribute('aria-checked', 'false');
    expect(within(group).getByRole('radio', { name: /ngn/i })).toHaveAttribute('aria-checked', 'false');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. TOAST DENSITY STATES
// ─────────────────────────────────────────────────────────────────────────────

describe('SettingsPanel – toast density states', () => {
  it('matches snapshot when toastDensity is "relaxed"', () => {
    seedPreferences({ toastDensity: 'relaxed' });
    const { container } = renderPanel(true);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot when toastDensity is "compact"', () => {
    seedPreferences({ toastDensity: 'compact' });
    const { container } = renderPanel(true);
    expect(container).toMatchSnapshot();
  });

  it('marks only the active density button as aria-checked=true (relaxed)', () => {
    seedPreferences({ toastDensity: 'relaxed' });
    renderPanel(true);
    const group = screen.getByRole('radiogroup', { name: /toast density/i });
    expect(within(group).getByRole('radio', { name: /relaxed/i })).toHaveAttribute('aria-checked', 'true');
    expect(within(group).getByRole('radio', { name: /compact/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('marks only the active density button as aria-checked=true (compact)', () => {
    seedPreferences({ toastDensity: 'compact' });
    renderPanel(true);
    const group = screen.getByRole('radiogroup', { name: /toast density/i });
    expect(within(group).getByRole('radio', { name: /compact/i })).toHaveAttribute('aria-checked', 'true');
    expect(within(group).getByRole('radio', { name: /relaxed/i })).toHaveAttribute('aria-checked', 'false');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. QUIET MODE STATES
// ─────────────────────────────────────────────────────────────────────────────

describe('SettingsPanel – quiet mode states', () => {
  it('matches snapshot when quietMode is false (default)', () => {
    seedPreferences({ quietMode: false });
    const { container } = renderPanel(true);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot when quietMode is true', () => {
    seedPreferences({ quietMode: true });
    const { container } = renderPanel(true);
    expect(container).toMatchSnapshot();
  });

  it('switch has aria-checked=false when quietMode is off', () => {
    seedPreferences({ quietMode: false });
    renderPanel(true);
    expect(
      screen.getByRole('switch', { name: /quiet mode/i }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('switch has aria-checked=true when quietMode is on', () => {
    seedPreferences({ quietMode: true });
    renderPanel(true);
    expect(
      screen.getByRole('switch', { name: /quiet mode/i }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('switch thumb is shifted right when quietMode is on', () => {
    seedPreferences({ quietMode: true });
    const { container } = renderPanel(true);
    // The thumb <span> carries translate-x-6 when on, translate-x-1 when off
    const thumb = container.querySelector('.translate-x-6');
    expect(thumb).toBeInTheDocument();
  });

  it('switch thumb is in left position when quietMode is off', () => {
    seedPreferences({ quietMode: false });
    const { container } = renderPanel(true);
    const thumb = container.querySelector('.translate-x-1');
    expect(thumb).toBeInTheDocument();
  });

  it('switch carries primary bg class when quietMode is on', () => {
    seedPreferences({ quietMode: true });
    renderPanel(true);
    const sw = screen.getByRole('switch', { name: /quiet mode/i });
    expect(sw.className).toContain('bg-[var(--primary)]');
  });

  it('switch carries muted bg class when quietMode is off', () => {
    seedPreferences({ quietMode: false });
    renderPanel(true);
    const sw = screen.getByRole('switch', { name: /quiet mode/i });
    expect(sw.className).toContain('bg-[var(--muted)]');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. FULLY-LOADED STATE (all non-default values)
// ─────────────────────────────────────────────────────────────────────────────

describe('SettingsPanel – fully-loaded state', () => {
  beforeEach(() => {
    seedPreferences({
      theme: 'dark',
      amountFormat: 'ngn',
      toastDensity: 'compact',
      quietMode: true,
      toastDuration: 'long',
    });
  });

  it('matches snapshot when all preferences are non-default', () => {
    const { container } = renderPanel(true);
    expect(container).toMatchSnapshot();
  });

  it('all four controls reflect the loaded values simultaneously', () => {
    renderPanel(true);

    const themeGroup = screen.getByRole('radiogroup', { name: /theme/i });
    expect(within(themeGroup).getByRole('radio', { name: /dark/i })).toHaveAttribute('aria-checked', 'true');

    const currencyGroup = screen.getByRole('radiogroup', { name: /currency display/i });
    expect(within(currencyGroup).getByRole('radio', { name: /ngn/i })).toHaveAttribute('aria-checked', 'true');

    const densityGroup = screen.getByRole('radiogroup', { name: /toast density/i });
    expect(within(densityGroup).getByRole('radio', { name: /compact/i })).toHaveAttribute('aria-checked', 'true');

    expect(
      screen.getByRole('switch', { name: /quiet mode/i }),
    ).toHaveAttribute('aria-checked', 'true');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. STRUCTURAL / REGRESSION GUARDS (class-name & ARIA anatomy)
// ─────────────────────────────────────────────────────────────────────────────

describe('SettingsPanel – structural anatomy', () => {
  it('renders a backdrop element with expected classes', () => {
    const { container } = renderPanel(true);
    const backdrop = container.querySelector('.absolute.inset-0');
    expect(backdrop).toBeInTheDocument();
  });

  it('renders the drawer with max-w-md constraint', () => {
    const { container } = renderPanel(true);
    // The drawer panel carries max-w-md as a CSS class
    const drawer = container.querySelector('.max-w-md');
    expect(drawer).toBeInTheDocument();
  });

  it('all radiogroup elements have accessible aria-label or aria-labelledby', () => {
    renderPanel(true);
    document.querySelectorAll('[role="radiogroup"]').forEach((group) => {
      const hasLabel =
        group.hasAttribute('aria-label') ||
        group.hasAttribute('aria-labelledby');
      expect(hasLabel).toBe(true);
    });
  });

  it('every radio button has a discernible accessible name', () => {
    renderPanel(true);
    screen.getAllByRole('radio').forEach((radio) => {
      // Non-empty accessible name guaranteed by visible text content
      expect(radio.textContent?.trim().length).toBeGreaterThan(0);
    });
  });

  it('Close and Done buttons both have focus-visible ring classes', () => {
    renderPanel(true);
    [
      screen.getByRole('button', { name: /close settings/i }),
      screen.getByRole('button', { name: /done/i }),
    ].forEach((btn) => {
      expect(btn.className).toMatch(/focus-visible/);
    });
  });

  it('all radio buttons have focus-visible ring classes', () => {
    renderPanel(true);
    screen.getAllByRole('radio').forEach((radio) => {
      expect(radio.className).toMatch(/focus-visible/);
    });
  });

  it('quiet-mode switch has focus-visible ring classes', () => {
    renderPanel(true);
    expect(
      screen.getByRole('switch', { name: /quiet mode/i }).className,
    ).toMatch(/focus-visible/);
  });

  it('renders exactly two section headings inside the dialog', () => {
    renderPanel(true);
    const dialog = screen.getByRole('dialog');
    // h3 elements for "Appearance" and "Notifications"
    const h3s = within(dialog).getAllByRole('heading', { level: 3 });
    expect(h3s).toHaveLength(2);
    expect(h3s[0]).toHaveTextContent('Appearance');
    expect(h3s[1]).toHaveTextContent('Notifications');
  });

  it('renders the "Suppress success notifications" description under Quiet Mode', () => {
    renderPanel(true);
    expect(
      screen.getByText('Suppress success notifications'),
    ).toBeInTheDocument();
  });

  it('dialog heading level is h2', () => {
    renderPanel(true);
    const dialog = screen.getByRole('dialog');
    const heading = within(dialog).getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Settings');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. SETTINGSTRIGGER snapshot
// ─────────────────────────────────────────────────────────────────────────────

import { SettingsTrigger } from '../SettingsTrigger';

describe('SettingsTrigger – snapshot', () => {
  beforeAll(() => {
    // SettingsTrigger calls requestAnimationFrame on close; stub it out
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('matches snapshot in closed (default) state', () => {
    const { container } = render(
      <PreferencesProvider>
        <SettingsTrigger />
      </PreferencesProvider>,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders the trigger FAB with "Open Settings" label', () => {
    render(
      <PreferencesProvider>
        <SettingsTrigger />
      </PreferencesProvider>,
    );
    expect(
      screen.getByRole('button', { name: /open settings/i }),
    ).toBeInTheDocument();
  });

  it('does not render the dialog until the FAB is clicked', () => {
    render(
      <PreferencesProvider>
        <SettingsTrigger />
      </PreferencesProvider>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
