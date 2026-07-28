/**
 * Tests for DialogIdBadge — copy-to-clipboard affordance for dialog identifiers.
 *
 * Coverage:
 *  1. Rendering — label, value, copy button, live region
 *  2. Clipboard API — success path (toast + icon toggle + live region)
 *  3. execCommand fallback — Clipboard API unavailable
 *  4. Failure path — both copy methods fail
 *  5. Keyboard accessibility — Enter, Space
 *  6. Stoppage of event propagation
 *  7. Icon state — copy → check → copy after reset
 *  8. aria-label updates reflecting copy state
 *  9. Default label
 * 10. Axe accessibility (no violations)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { DialogIdBadge } from '../DialogIdBadge';
import { ToastProvider } from '../toast/toast-provider';
import { PreferencesProvider } from '@/lib/preferences';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wrap the component in the providers it depends on. */
function renderBadge(props: Partial<React.ComponentProps<typeof DialogIdBadge>> & { id: string }) {
  return render(
    <PreferencesProvider>
      <ToastProvider>
        <DialogIdBadge {...props} />
      </ToastProvider>
    </PreferencesProvider>,
  );
}

function mockClipboard(impl: () => Promise<void> = () => Promise.resolve()) {
  const writeText = jest.fn().mockImplementation(impl);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

function removeClipboard() {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: undefined,
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let originalClipboard: typeof navigator.clipboard;
let execCommandSpy: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  originalClipboard = navigator.clipboard;
  execCommandSpy = jest.spyOn(document, 'execCommand').mockReturnValue(true);
});

afterEach(() => {
  act(() => { jest.runAllTimers(); });
  jest.useRealTimers();
  execCommandSpy.mockRestore();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: originalClipboard,
  });
});

// ---------------------------------------------------------------------------
// 1. Rendering
// ---------------------------------------------------------------------------

describe('DialogIdBadge — rendering', () => {
  it('renders the label text', () => {
    renderBadge({ id: 'contract-123', label: 'Contract ID' });
    expect(screen.getByText('Contract ID:')).toBeInTheDocument();
  });

  it('renders the identifier value', () => {
    renderBadge({ id: 'contract-123', label: 'Contract ID' });
    expect(screen.getByTestId('dialog-id-badge-value')).toHaveTextContent('contract-123');
  });

  it('renders the copy button', () => {
    renderBadge({ id: 'abc' });
    expect(screen.getByTestId('dialog-id-badge-button')).toBeInTheDocument();
  });

  it('renders the copy icon initially', () => {
    renderBadge({ id: 'abc' });
    expect(screen.getByTestId('dialog-id-badge-copy-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('dialog-id-badge-check-icon')).not.toBeInTheDocument();
  });

  it('renders an empty live region initially', () => {
    renderBadge({ id: 'abc' });
    expect(screen.getByTestId('dialog-id-badge-live-region')).toHaveTextContent('');
  });

  it('uses "ID" as the default label when label prop is omitted', () => {
    renderBadge({ id: 'dispute-99' });
    expect(screen.getByText('ID:')).toBeInTheDocument();
  });

  it('sets the copy button aria-label to "Copy <label>" initially', () => {
    renderBadge({ id: 'abc', label: 'Dispute ID' });
    expect(screen.getByRole('button', { name: 'Copy Dispute ID' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Clipboard API — success path
// ---------------------------------------------------------------------------

describe('DialogIdBadge — Clipboard API success', () => {
  it('calls navigator.clipboard.writeText with the identifier', async () => {
    const writeText = mockClipboard();
    renderBadge({ id: 'contract-42', label: 'Contract ID' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    expect(writeText).toHaveBeenCalledWith('contract-42');
  });

  it('shows the check icon after a successful copy', async () => {
    mockClipboard();
    renderBadge({ id: 'contract-42' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    expect(screen.getByTestId('dialog-id-badge-check-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('dialog-id-badge-copy-icon')).not.toBeInTheDocument();
  });

  it('updates the live region to announce the copy', async () => {
    mockClipboard();
    renderBadge({ id: 'abc', label: 'Contract ID' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    expect(screen.getByTestId('dialog-id-badge-live-region')).toHaveTextContent('Contract ID copied');
  });

  it('updates aria-label on the button to reflect copied state', async () => {
    mockClipboard();
    renderBadge({ id: 'abc', label: 'Contract ID' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    expect(screen.getByRole('button', { name: 'Contract ID copied' })).toBeInTheDocument();
  });

  it('shows a success toast with the label and id', async () => {
    mockClipboard();
    renderBadge({ id: 'contract-99', label: 'Contract ID' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    // Toast title uses the label
    expect(screen.getByText('Contract ID copied')).toBeInTheDocument();
    // Toast description uses the id
    expect(screen.getByText('contract-99')).toBeInTheDocument();
  });

  it('reverts to the copy icon after the 2000 ms reset delay', async () => {
    mockClipboard();
    renderBadge({ id: 'abc' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    expect(screen.getByTestId('dialog-id-badge-check-icon')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(2000); });

    expect(screen.queryByTestId('dialog-id-badge-check-icon')).not.toBeInTheDocument();
    expect(screen.getByTestId('dialog-id-badge-copy-icon')).toBeInTheDocument();
  });

  it('reverts the live region to empty after the reset delay', async () => {
    mockClipboard();
    renderBadge({ id: 'abc', label: 'ID' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    act(() => { jest.advanceTimersByTime(2000); });

    expect(screen.getByTestId('dialog-id-badge-live-region')).toHaveTextContent('');
  });
});

// ---------------------------------------------------------------------------
// 3. execCommand fallback — Clipboard API unavailable
// ---------------------------------------------------------------------------

describe('DialogIdBadge — execCommand fallback', () => {
  it('uses execCommand when navigator.clipboard is absent', async () => {
    removeClipboard();
    renderBadge({ id: 'fallback-id', label: 'Contract ID' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    expect(execCommandSpy).toHaveBeenCalledWith('copy');
  });

  it('shows the check icon after a successful fallback copy', async () => {
    removeClipboard();
    renderBadge({ id: 'abc' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    expect(screen.getByTestId('dialog-id-badge-check-icon')).toBeInTheDocument();
  });

  it('shows a success toast after a successful fallback copy', async () => {
    removeClipboard();
    renderBadge({ id: 'fallback-id', label: 'Contract ID' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    expect(screen.getByText('Contract ID copied')).toBeInTheDocument();
  });

  it('uses execCommand when Clipboard API writeText throws', async () => {
    mockClipboard(() => Promise.reject(new Error('Permission denied')));
    renderBadge({ id: 'abc' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    expect(execCommandSpy).toHaveBeenCalledWith('copy');
    expect(screen.getByTestId('dialog-id-badge-check-icon')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. Failure path — both copy methods fail
// ---------------------------------------------------------------------------

describe('DialogIdBadge — both copy methods fail', () => {
  it('shows an error toast when both Clipboard API and fallback fail', async () => {
    mockClipboard(() => Promise.reject(new Error('denied')));
    execCommandSpy.mockReturnValue(false);
    renderBadge({ id: 'abc', label: 'Contract ID' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    expect(screen.getByText('Copy failed')).toBeInTheDocument();
  });

  it('does not show the check icon when copy fails', async () => {
    removeClipboard();
    execCommandSpy.mockReturnValue(false);
    renderBadge({ id: 'abc' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    expect(screen.queryByTestId('dialog-id-badge-check-icon')).not.toBeInTheDocument();
    expect(screen.getByTestId('dialog-id-badge-copy-icon')).toBeInTheDocument();
  });

  it('keeps the live region empty when copy fails', async () => {
    removeClipboard();
    execCommandSpy.mockReturnValue(false);
    renderBadge({ id: 'abc', label: 'ID' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    expect(screen.getByTestId('dialog-id-badge-live-region')).toHaveTextContent('');
  });
});

// ---------------------------------------------------------------------------
// 5. Keyboard accessibility — Enter and Space
// ---------------------------------------------------------------------------

describe('DialogIdBadge — keyboard operation', () => {
  it('triggers copy on Enter key press', async () => {
    const writeText = mockClipboard();
    renderBadge({ id: 'kb-test', label: 'ID' });

    const button = screen.getByTestId('dialog-id-badge-button');
    button.focus();

    await act(async () => {
      fireEvent.keyDown(button, { key: 'Enter' });
    });

    expect(writeText).toHaveBeenCalledWith('kb-test');
  });

  it('triggers copy on Space key press', async () => {
    const writeText = mockClipboard();
    renderBadge({ id: 'kb-test', label: 'ID' });

    const button = screen.getByTestId('dialog-id-badge-button');
    button.focus();

    await act(async () => {
      fireEvent.keyDown(button, { key: ' ' });
    });

    expect(writeText).toHaveBeenCalledWith('kb-test');
  });

  it('does not trigger copy on unrelated key presses', async () => {
    const writeText = mockClipboard();
    renderBadge({ id: 'kb-test' });

    const button = screen.getByTestId('dialog-id-badge-button');
    button.focus();
    fireEvent.keyDown(button, { key: 'ArrowDown' });

    expect(writeText).not.toHaveBeenCalled();
  });

  it('the copy button is reachable via tab navigation', () => {
    renderBadge({ id: 'abc' });
    const button = screen.getByTestId('dialog-id-badge-button');
    // type="button" elements are naturally focusable
    expect(button.tagName).toBe('BUTTON');
    expect(button).not.toHaveAttribute('tabindex', '-1');
  });
});

// ---------------------------------------------------------------------------
// 6. Event propagation
// ---------------------------------------------------------------------------

describe('DialogIdBadge — event propagation', () => {
  it('stops click event from propagating to parent elements', async () => {
    mockClipboard();
    const parentClickHandler = jest.fn();

    render(
      <PreferencesProvider>
        <ToastProvider>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
              jsx-a11y/no-static-element-interactions */}
          <div onClick={parentClickHandler}>
            <DialogIdBadge id="abc" label="ID" />
          </div>
        </ToastProvider>
      </PreferencesProvider>,
    );

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    expect(parentClickHandler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 7. Custom label
// ---------------------------------------------------------------------------

describe('DialogIdBadge — custom label prop', () => {
  it('renders the custom label in the prefix', () => {
    renderBadge({ id: 'dispute-7', label: 'Dispute ID' });
    expect(screen.getByText('Dispute ID:')).toBeInTheDocument();
  });

  it('uses the custom label in the success toast title', async () => {
    mockClipboard();
    renderBadge({ id: 'dispute-7', label: 'Dispute ID' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    expect(screen.getByText('Dispute ID copied')).toBeInTheDocument();
  });

  it('uses the custom label in the live region announcement', async () => {
    mockClipboard();
    renderBadge({ id: 'dispute-7', label: 'Dispute ID' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    expect(screen.getByTestId('dialog-id-badge-live-region')).toHaveTextContent('Dispute ID copied');
  });
});

// ---------------------------------------------------------------------------
// 8. ConfirmDialog integration — dialogId prop
// ---------------------------------------------------------------------------

describe('ConfirmDialog — dialogId prop', () => {
  // Inline import to keep this suite self-contained
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ConfirmDialog } = require('../ConfirmDialog');

  it('renders DialogIdBadge when dialogId is provided', () => {
    render(
      <PreferencesProvider>
        <ToastProvider>
          <ConfirmDialog
            isOpen
            title="Delete contract"
            description="Are you sure?"
            dialogId="contract-42"
            dialogIdLabel="Contract ID"
            onConfirm={jest.fn()}
            onCancel={jest.fn()}
          />
        </ToastProvider>
      </PreferencesProvider>,
    );

    expect(screen.getByTestId('dialog-id-badge-value')).toHaveTextContent('contract-42');
    expect(screen.getByText('Contract ID:')).toBeInTheDocument();
  });

  it('does not render DialogIdBadge when dialogId is omitted', () => {
    render(
      <PreferencesProvider>
        <ToastProvider>
          <ConfirmDialog
            isOpen
            title="Delete"
            description="Are you sure?"
            onConfirm={jest.fn()}
            onCancel={jest.fn()}
          />
        </ToastProvider>
      </PreferencesProvider>,
    );

    expect(screen.queryByTestId('dialog-id-badge-button')).not.toBeInTheDocument();
  });

  it('copies the dialogId via the badge button inside the dialog', async () => {
    const writeText = mockClipboard();
    render(
      <PreferencesProvider>
        <ToastProvider>
          <ConfirmDialog
            isOpen
            title="Cancel contract"
            description="This cannot be undone."
            dialogId="contract-99"
            dialogIdLabel="Contract ID"
            onConfirm={jest.fn()}
            onCancel={jest.fn()}
          />
        </ToastProvider>
      </PreferencesProvider>,
    );

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    expect(writeText).toHaveBeenCalledWith('contract-99');
  });
});

// ---------------------------------------------------------------------------
// 9. Accessibility — no axe violations
// ---------------------------------------------------------------------------

describe('DialogIdBadge — accessibility', () => {
  it('has no axe violations in default (copy) state', async () => {
    mockClipboard();
    const { container } = renderBadge({ id: 'contract-42', label: 'Contract ID' });
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('has no axe violations in copied state', async () => {
    mockClipboard();
    const { container } = renderBadge({ id: 'contract-42', label: 'Contract ID' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('has no axe violations when clipboard is absent (fallback state)', async () => {
    removeClipboard();
    const { container } = renderBadge({ id: 'abc', label: 'ID' });

    await act(async () => {
      await userEvent.click(screen.getByTestId('dialog-id-badge-button'));
    });

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('live region has aria-live="polite" and aria-atomic="true"', () => {
    renderBadge({ id: 'abc' });
    const region = screen.getByTestId('dialog-id-badge-live-region');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
  });

  it('copy button has a descriptive aria-label', () => {
    renderBadge({ id: 'abc', label: 'Contract ID' });
    const btn = screen.getByRole('button', { name: 'Copy Contract ID' });
    expect(btn).toBeInTheDocument();
  });
});
