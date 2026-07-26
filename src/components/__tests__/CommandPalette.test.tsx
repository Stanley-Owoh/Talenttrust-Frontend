import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CommandPalette } from '../CommandPalette';
import { WalletContextType, useWallet } from '@/contexts/WalletContext';
import { testA11y } from '@/test-utils/a11y';

jest.mock('@/contexts/WalletContext', () => ({
  useWallet: jest.fn(),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

function createWalletState(overrides: Partial<WalletContextType> = {}): WalletContextType {
  return {
    address: null,
    isConnecting: false,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  };
}

const getTrigger = () => screen.getByRole('button', { name: 'Open command palette' });
const getInput = () => screen.getByRole('combobox');

describe('CommandPalette — registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue(createWalletState());
  });

  it('registers exactly one wallet entry, with no duplicates, once opened', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(getTrigger());

    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'Open Wallet' })).toBeInTheDocument();
  });

  it('the wallet entry is searchable by label', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(getTrigger());
    await user.type(getInput(), 'Open Wallet');

    expect(screen.getByRole('option', { name: 'Open Wallet' })).toBeInTheDocument();
  });

  it('the wallet entry is searchable by keyword (not just its label)', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(getTrigger());
    await user.type(getInput(), 'freighter');

    expect(screen.getByRole('option', { name: 'Open Wallet' })).toBeInTheDocument();
  });

  it('shows a no-results message for a query that matches nothing', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(getTrigger());
    await user.type(getInput(), 'nonexistent-command-xyz');

    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.getByText('No matching commands')).toBeInTheDocument();
  });
});

describe('CommandPalette — opening and closing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue(createWalletState());
  });

  it('is closed by default', () => {
    render(<CommandPalette />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens when the trigger button is clicked and focuses the input', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(getTrigger());

    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    expect(getInput()).toHaveFocus();
  });

  it('opens via the Ctrl+K keyboard shortcut from anywhere in the document', () => {
    render(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
  });

  it('opens via the Cmd+K (metaKey) keyboard shortcut', () => {
    render(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
  });

  it('toggles closed if Ctrl+K is pressed again while open', () => {
    render(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(getTrigger());
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(getTrigger()).toHaveFocus());
  });

  it('closes when clicking the backdrop', async () => {
    const user = userEvent.setup();
    const { container } = render(<CommandPalette />);

    await user.click(getTrigger());
    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();

    fireEvent.click(backdrop as Element);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clears the query when reopened after a previous search', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(getTrigger());
    await user.type(getInput(), 'freighter');
    await user.keyboard('{Escape}');

    await user.click(getTrigger());

    expect(getInput()).toHaveValue('');
  });
});

describe('CommandPalette — activation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('activating the wallet entry via Enter triggers wallet connect and closes the palette', async () => {
    const connect = jest.fn();
    mockUseWallet.mockReturnValue(createWalletState({ connect }));
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(getTrigger());
    await user.keyboard('{Enter}');

    expect(connect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('activating the wallet entry via click triggers wallet connect', async () => {
    const connect = jest.fn();
    mockUseWallet.mockReturnValue(createWalletState({ connect }));
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(getTrigger());
    await user.click(screen.getByRole('option', { name: 'Open Wallet' }));

    expect(connect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pressing Enter with no matching results does nothing and stays open', async () => {
    const connect = jest.fn();
    mockUseWallet.mockReturnValue(createWalletState({ connect }));
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(getTrigger());
    await user.type(getInput(), 'nonexistent-command-xyz');
    await user.keyboard('{Enter}');

    expect(connect).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('is keyboard-operable via ArrowDown/ArrowUp to move the active option', async () => {
    mockUseWallet.mockReturnValue(createWalletState());
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(getTrigger());

    const option = screen.getByRole('option', { name: 'Open Wallet' });
    expect(option).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowDown}');
    expect(option).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowUp}');
    expect(option).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowDown/ArrowUp are no-ops when there are no matching results', async () => {
    mockUseWallet.mockReturnValue(createWalletState());
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(getTrigger());
    await user.type(getInput(), 'nonexistent-command-xyz');

    await expect(user.keyboard('{ArrowDown}')).resolves.not.toThrow();
    await expect(user.keyboard('{ArrowUp}')).resolves.not.toThrow();
    expect(screen.getByText('No matching commands')).toBeInTheDocument();
  });
});

describe('CommandPalette — accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue(createWalletState());
  });

  it('has no accessibility violations when closed', async () => {
    await testA11y(<CommandPalette />);
  });

  it('has no accessibility violations when open', async () => {
    const { container } = render(<CommandPalette />);
    fireEvent.click(getTrigger());
    const { assertNoA11yViolations } = await import('@/test-utils/a11y');
    await assertNoA11yViolations(container);
  });
});

describe('CommandPalette — unmount', () => {
  it('unmounts cleanly while open without throwing', async () => {
    mockUseWallet.mockReturnValue(createWalletState());
    const user = userEvent.setup();
    const { unmount } = render(<CommandPalette />);

    await user.click(getTrigger());

    expect(() => unmount()).not.toThrow();
  });
});
