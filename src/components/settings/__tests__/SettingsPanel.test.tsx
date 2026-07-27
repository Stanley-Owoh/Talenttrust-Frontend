import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe';
import { SettingsPanel, ThemeErrorBoundary } from '../SettingsPanel';
import { reportError } from '@/lib/errorReporter';

jest.mock('@/lib/errorReporter', () => ({
  reportError: jest.fn(),
}));
import { PreferencesProvider } from '@/lib/preferences';
import { resetCache } from '@/lib/safeStorage';
import { ToastProvider } from '@/components/toast/toast-provider';


const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <PreferencesProvider>
      <ToastProvider>
        {ui}
      </ToastProvider>
    </PreferencesProvider>
  );
};

describe('ThemeErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ThemeErrorBoundary>
        <div data-testid="child">Healthy Child</div>
      </ThemeErrorBoundary>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders fallback UI when a child throws an error and calls reportError', () => {
    // Suppress React's default console.error for unhandled exceptions in tests
    const originalError = console.error;
    console.error = jest.fn();

    const ProblemChild = () => {
      throw new Error('Test Theme Error');
    };

    render(
      <ThemeErrorBoundary>
        <ProblemChild />
      </ThemeErrorBoundary>
    );

    expect(screen.getByText('Theme section failed to load.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), 'ThemeErrorBoundary');

    // Restore console.error
    console.error = originalError;
  });

  it('recovers when Retry is clicked', () => {
    const originalError = console.error;
    console.error = jest.fn();

    let shouldThrow = true;
    const RecoverableChild = () => {
      if (shouldThrow) {
        throw new Error('Initial crash');
      }
      return <div>Recovered!</div>;
    };

    render(
      <ThemeErrorBoundary>
        <RecoverableChild />
      </ThemeErrorBoundary>
    );

    expect(screen.getByText('Theme section failed to load.')).toBeInTheDocument();

    // Change condition so it doesn't throw next time
    shouldThrow = false;
    
    // Click retry
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    
    expect(screen.getByText('Recovered!')).toBeInTheDocument();
    expect(screen.queryByText('Theme section failed to load.')).not.toBeInTheDocument();

    console.error = originalError;
  });

  it('keeps the rest of the settings panel visible when the theme section fails', () => {
    const originalError = console.error;
    console.error = jest.fn();

    const ProblemChild = () => {
      throw new Error('Theme section crash');
    };

    render(
      <PreferencesProvider>
        <div>
          <ThemeErrorBoundary>
            <ProblemChild />
          </ThemeErrorBoundary>
          <section aria-label="Currency Display">Currency Controls</section>
          <section aria-label="Notifications">Notification Controls</section>
        </div>
      </PreferencesProvider>
    );

    expect(screen.getByText('Theme section failed to load.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByText('Currency Controls')).toBeInTheDocument();
    expect(screen.getByText('Notification Controls')).toBeInTheDocument();

    console.error = originalError;
  });
});

describe('SettingsPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    resetCache();
  });

  it('renders nothing when closed', () => {
    renderWithProvider(
      <SettingsPanel isOpen={false} onClose={() => {}} />
    );
    // The render tree also includes ToastProvider's viewport (its own idle
    // skeleton is intentional, tested behaviour), so we assert SettingsPanel
    // itself contributed nothing rather than asserting the whole container
    // is empty.
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByLabelText('Close settings')).toBeNull();
  });

  it('renders correctly when open', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Settings')).toBeDefined();
    expect(screen.getByText('Appearance')).toBeDefined();
    expect(screen.getByText('Notifications')).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    renderWithProvider(<SettingsPanel isOpen={true} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /Close settings/i });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('updates theme preference when theme button is clicked', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);
    
    const darkButton = screen.getByRole('radio', { name: /dark/i });
    fireEvent.click(darkButton);
    
    expect(darkButton.getAttribute('aria-checked')).toBe('true');
    expect(darkButton.className).toContain('bg-[var(--primary)]');
  });

  it('updates currency preference when currency button is clicked', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);
    
    const ngnButton = screen.getByRole('radio', { name: /ngn/i });
    fireEvent.click(ngnButton);
    
    expect(ngnButton.getAttribute('aria-checked')).toBe('true');
  });

  it('updates toast density preference', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);

    const densityGroup = screen.getByRole('radiogroup', { name: /toast density/i });
    const compactButton = within(densityGroup).getByRole('radio', { name: /compact/i });
    fireEvent.click(compactButton);

    expect(compactButton.getAttribute('aria-checked')).toBe('true');
  });

  it('toggles quiet mode switch', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);
    
    const quietSwitch = screen.getByRole('switch', { name: /Quiet Mode/i });
    expect(quietSwitch.getAttribute('aria-checked')).toBe('false');
    
    fireEvent.click(quietSwitch);
    expect(quietSwitch.getAttribute('aria-checked')).toBe('true');
  });

  it('persists theme preference to localStorage when changed', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);

    const darkButton = screen.getByRole('radio', { name: /dark/i });
    fireEvent.click(darkButton);

    const saved = JSON.parse(
      localStorage.getItem('talenttrust-user-preferences') || '{}'
    );
    expect(saved.theme).toBe('dark');
  });

  it('persists currency preference to localStorage when changed', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);

    const ngnButton = screen.getByRole('radio', { name: /ngn/i });
    fireEvent.click(ngnButton);

    const saved = JSON.parse(
      localStorage.getItem('talenttrust-user-preferences') || '{}'
    );
    expect(saved.amountFormat).toBe('ngn');
  });

  it('persists quietMode to localStorage when toggled', async () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);

    const quietSwitch = screen.getByRole('switch', { name: /Quiet Mode/i });
    fireEvent.click(quietSwitch);

    // Should update optimistically immediately
    const savedOptimistic = JSON.parse(
      localStorage.getItem('talenttrust-user-preferences') || '{}'
    );
    expect(savedOptimistic.quietMode).toBe(true);
  });

  it('rolls back and shows error toast when setting update fails', async () => {
    // Simulate server error
    (window as any).__SIMULATE_SETTINGS_ERROR = true;
    
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);

    const darkButton = screen.getByRole('radio', { name: /dark/i });
    fireEvent.click(darkButton);

    // Optimistically updated
    expect(darkButton.getAttribute('aria-checked')).toBe('true');

    // Wait for the mock API to fail and rollback
    const toasts = await screen.findAllByText(/Failed to update settings/i);
    expect(toasts.length).toBeGreaterThan(0);

    // Reverted back to initial state (system)
    expect(darkButton.getAttribute('aria-checked')).toBe('false');

    // Cleanup
    delete (window as any).__SIMULATE_SETTINGS_ERROR;
  });

  it('persists toastDensity preference to localStorage when changed', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);

    const densityGroup = screen.getByRole('radiogroup', { name: /toast density/i });
    const compactButton = within(densityGroup).getByRole('radio', { name: /compact/i });
    fireEvent.click(compactButton);

    const saved = JSON.parse(
      localStorage.getItem('talenttrust-user-preferences') || '{}'
    );
    expect(saved.toastDensity).toBe('compact');
  });

  it('updates form density preference', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);

    const formDensityGroup = screen.getByRole('radiogroup', { name: /form density/i });
    const compactButton = within(formDensityGroup).getByRole('radio', { name: /compact/i });
    fireEvent.click(compactButton);

    expect(compactButton.getAttribute('aria-checked')).toBe('true');
  });

  it('persists formDensity to localStorage when changed', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);

    const formDensityGroup = screen.getByRole('radiogroup', { name: /form density/i });
    const compactButton = within(formDensityGroup).getByRole('radio', { name: /compact/i });
    fireEvent.click(compactButton);

    const saved = JSON.parse(
      localStorage.getItem('talenttrust-user-preferences') || '{}'
    );
    expect(saved.formDensity).toBe('compact');
  });

  it('restores preferences from localStorage on remount (simulated reload)', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ theme: 'dark', amountFormat: 'ngn', toastDensity: 'compact', formDensity: 'compact', quietMode: true })
    );

    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);

    const themeGroup = screen.getByRole('radiogroup', { name: /theme/i });
    expect(within(themeGroup).getByRole('radio', { name: /dark/i }).getAttribute('aria-checked')).toBe('true');
    expect(within(themeGroup).getByRole('radio', { name: /light/i }).getAttribute('aria-checked')).toBe('false');

    const currencyGroup = screen.getByRole('radiogroup', { name: /currency display/i });
    expect(within(currencyGroup).getByRole('radio', { name: /ngn/i }).getAttribute('aria-checked')).toBe('true');

    const densityGroup = screen.getByRole('radiogroup', { name: /toast density/i });
    expect(within(densityGroup).getByRole('radio', { name: /compact/i }).getAttribute('aria-checked')).toBe('true');

    // Form density: compact should be checked
    const formDensityGroup = screen.getByRole('radiogroup', { name: /form density/i });
    expect(within(formDensityGroup).getByRole('radio', { name: /compact/i }).getAttribute('aria-checked')).toBe('true');

    // Quiet mode: on
    expect(screen.getByRole('switch', { name: /quiet mode/i }).getAttribute('aria-checked')).toBe('true');
  });

  it('closes when backdrop is clicked', () => {
    const onClose = jest.fn();
    const { container } = renderWithProvider(
      <SettingsPanel isOpen={true} onClose={onClose} />
    );

    const backdrop = container.querySelector('.absolute.inset-0');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when Done button is clicked', () => {
    const onClose = jest.fn();
    renderWithProvider(<SettingsPanel isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('all interactive controls are keyboard-accessible (have focus-visible ring classes)', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);

    const focusableControls = [
      screen.getByRole('button', { name: /close settings/i }),
      screen.getByRole('switch', { name: /quiet mode/i }),
      screen.getByRole('button', { name: /done/i }),
    ];

    focusableControls.forEach((el) => {
      expect(el.className).toMatch(/focus-visible/);
    });
  });

  // --- Accessibility: dialog semantics ---

  it('has role="dialog" when open', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('has aria-modal="true" on the dialog', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
  });

  it('aria-labelledby points to the "Settings" heading', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const heading = document.getElementById(labelId!);
    expect(heading).not.toBeNull();
    expect(heading!.textContent).toBe('Settings');
  });

  // --- Accessibility: keyboard interactions ---

  it('closes when Escape is pressed', () => {
    const onClose = jest.fn();
    renderWithProvider(<SettingsPanel isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  // --- Focus management ---

  it('sets initial focus on the close button when opened', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /close settings/i })
    );
  });

  it('restores focus to the trigger after the dialog closes', async () => {
    const TestHarness = () => {
      const [isOpen, setIsOpen] = React.useState(false);

      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open settings
          </button>
          <SettingsPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
      );
    };

    renderWithProvider(<TestHarness />);
    const trigger = screen.getByRole('button', { name: /open settings/i });

    trigger.focus();
    fireEvent.click(trigger);

    const closeButton = await screen.findByRole('button', { name: /close settings/i });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it('Tab on the last focusable element wraps focus to the first', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    const last = focusable[focusable.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(focusable[0]);
  });

  it('Shift+Tab on the first focusable element wraps focus to the last', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    const first = focusable[0];
    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(focusable[focusable.length - 1]);
  });

  // --- Accessibility: radiogroup keyboard interactions ---

  it('supports arrow key navigation in radiogroups', async () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);

    const themeGroup = screen.getByRole('radiogroup', { name: /theme/i });
    const themeOptions = within(themeGroup).getAllByRole('radio');

    fireEvent.keyDown(themeGroup, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(themeOptions[0]).toHaveAttribute('aria-checked', 'true');
      expect(document.activeElement).toBe(themeOptions[0]);
    });

    fireEvent.keyDown(themeGroup, { key: 'ArrowLeft' });
    await waitFor(() => {
      expect(themeOptions[2]).toHaveAttribute('aria-checked', 'true');
      expect(document.activeElement).toBe(themeOptions[2]);
    });

    const currencyGroup = screen.getByRole('radiogroup', { name: /currency display/i });
    const currencyOptions = within(currencyGroup).getAllByRole('radio');
    fireEvent.keyDown(currencyGroup, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(currencyOptions[1]).toHaveAttribute('aria-checked', 'true');
      expect(document.activeElement).toBe(currencyOptions[1]);
    });

    const densityGroup = screen.getByRole('radiogroup', { name: /toast density/i });
    const densityOptions = within(densityGroup).getAllByRole('radio');
    fireEvent.keyDown(densityGroup, { key: 'ArrowUp' });
    await waitFor(() => {
      expect(densityOptions[1]).toHaveAttribute('aria-checked', 'true');
      expect(document.activeElement).toBe(densityOptions[1]);
    });
  });

  it('manages roving tabIndex for radiogroups', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);

    const themeGroup = screen.getByRole('radiogroup', { name: /theme/i });
    const currencyGroup = screen.getByRole('radiogroup', { name: /currency display/i });
    const densityGroup = screen.getByRole('radiogroup', { name: /toast density/i });

    const themeButtons = within(themeGroup).getAllByRole('radio');
    const currencyButtons = within(currencyGroup).getAllByRole('radio');
    const densityButtons = within(densityGroup).getAllByRole('radio');

    expect(themeButtons[2]).toHaveAttribute('tabIndex', '0');
    expect(themeButtons[0]).toHaveAttribute('tabIndex', '-1');
    expect(themeButtons[1]).toHaveAttribute('tabIndex', '-1');

    expect(currencyButtons[0]).toHaveAttribute('tabIndex', '0');
    expect(currencyButtons[1]).toHaveAttribute('tabIndex', '-1');
    expect(currencyButtons[2]).toHaveAttribute('tabIndex', '-1');

    expect(densityButtons[0]).toHaveAttribute('tabIndex', '0');
    expect(densityButtons[1]).toHaveAttribute('tabIndex', '-1');
  });

  it('activates radios with Enter and Space', async () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);

    const themeGroup = screen.getByRole('radiogroup', { name: /theme/i });
    const lightRadio = within(themeGroup).getByRole('radio', { name: /light/i });
    const darkRadio = within(themeGroup).getByRole('radio', { name: /dark/i });

    lightRadio.focus();
    fireEvent.keyDown(lightRadio, { key: ' ' });
    await waitFor(() => {
      expect(lightRadio).toHaveAttribute('aria-checked', 'true');
    });

    darkRadio.focus();
    fireEvent.keyDown(darkRadio, { key: 'Enter' });
    await waitFor(() => {
      expect(darkRadio).toHaveAttribute('aria-checked', 'true');
    });
  });

  // --- Accessibility validation with jest-axe ---

  it('passes accessibility audit with jest-axe when open', async () => {
    const { container } = renderWithProvider(
      <SettingsPanel isOpen={true} onClose={() => {}} />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes accessibility audit with jest-axe when closed', async () => {
    const { container } = renderWithProvider(
      <SettingsPanel isOpen={false} onClose={() => {}} />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });



  // --- Edge cases for focus management ---

  it('does not call onClose when Escape is pressed while dialog is closed', () => {
    const onClose = jest.fn();
    renderWithProvider(<SettingsPanel isOpen={false} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('initial focus is not set when panel is not open', () => {
    renderWithProvider(<SettingsPanel isOpen={false} onClose={() => {}} />);
    
    // Should not have any dialog content
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).not.toBe(screen.queryByRole('button', { name: /close settings/i }));
  });

  // --- Verify all preference controls are properly labeled ---

  it('all preference controls have proper ARIA labels and roles', () => {
    renderWithProvider(<SettingsPanel isOpen={true} onClose={() => {}} />);
    
    // Theme radiogroup
    const themeGroup = screen.getByRole('radiogroup', { name: /theme/i });
    expect(themeGroup).toBeInTheDocument();
    
    // Currency radiogroup
    const currencyGroup = screen.getByRole('radiogroup', { name: /currency display/i });
    expect(currencyGroup).toBeInTheDocument();
    
    // Toast density radiogroup
    const densityGroup = screen.getByRole('radiogroup', { name: /toast density/i });
    expect(densityGroup).toBeInTheDocument();
    
    // Form density radiogroup
    const formDensityGroup = screen.getByRole('radiogroup', { name: /form density/i });
    expect(formDensityGroup).toBeInTheDocument();
    
    // Quiet mode switch
    const quietSwitch = screen.getByRole('switch', { name: /quiet mode/i });
    expect(quietSwitch).toBeInTheDocument();
    
    // All theme radio buttons should be properly labeled
    const themeButtons = within(themeGroup).getAllByRole('radio');
    expect(themeButtons).toHaveLength(3);
    expect(themeButtons[0]).toHaveAccessibleName('light');
    expect(themeButtons[1]).toHaveAccessibleName('dark');
    expect(themeButtons[2]).toHaveAccessibleName('system');
  });
});
