import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { SettingsTrigger } from '../SettingsTrigger';
import { PreferencesProvider } from '@/lib/preferences';
import { ToastProvider } from '@/components/toast/toast-provider';

expect.extend(toHaveNoViolations);

const renderWithProvider = (ui: React.ReactElement) =>
  render(
    <PreferencesProvider>
      <ToastProvider>
        {ui}
      </ToastProvider>
    </PreferencesProvider>
  );

describe('SettingsTrigger', () => {
  beforeAll(() => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the trigger button and does not render the settings panel initially', () => {
    renderWithProvider(<SettingsTrigger />);

    const triggerButton = screen.getByRole('button', { name: /open settings/i });
    expect(triggerButton).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the settings panel when the trigger button is clicked', async () => {
    renderWithProvider(<SettingsTrigger />);

    await userEvent.click(screen.getByRole('button', { name: /open settings/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
  });

  it('passes an accessibility audit while the panel is open', async () => {
    const { container } = renderWithProvider(<SettingsTrigger />);

    await userEvent.click(screen.getByRole('button', { name: /open settings/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('closes the panel when the close button is clicked and returns focus to the trigger', async () => {
    renderWithProvider(<SettingsTrigger />);
    const triggerButton = screen.getByRole('button', { name: /open settings/i });

    await userEvent.click(triggerButton);
    const closeButton = await screen.findByRole('button', { name: /close settings/i });

    await userEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(document.activeElement).toBe(triggerButton);
  });

  it('closes the panel on Escape and restores focus to the trigger button', async () => {
    renderWithProvider(<SettingsTrigger />);
    const triggerButton = screen.getByRole('button', { name: /open settings/i });

    await userEvent.click(triggerButton);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape', keyCode: 27 });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(document.activeElement).toBe(triggerButton);
  });
});
