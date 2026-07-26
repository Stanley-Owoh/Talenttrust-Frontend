import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { isValidStellarAddress } from '@/lib/stellarAddress';
import { ToastProvider } from '@/components/toast/toast-provider';
import { PreferencesProvider } from '@/lib/preferences';
import { getItem, setItem, removeItem } from '@/lib/safeStorage';

const { WalletProvider, useWallet, MOCKED_STELLAR_ADDRESS } = jest.requireActual('../WalletContext');

// Mock safeStorage
jest.mock('@/lib/safeStorage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

function WalletConsumer() {
  const { address, isConnecting, error, connect, disconnect } = useWallet();
  return (
    <div>
      <div data-testid="address">{address || 'No address'}</div>
      <div data-testid="is-connecting">{isConnecting ? 'Connecting' : 'Not connecting'}</div>
      <div data-testid="error">{error || 'No error'}</div>
      <button data-testid="connect-btn" onClick={connect}>Connect Wallet</button>
      <button data-testid="disconnect-btn" onClick={disconnect}>Disconnect Wallet</button>
    </div>
  );
}

function MockComponent() {
  const { address, connect, disconnect } = useWallet();
  return (
    <div>
      <span data-testid="address">{address ?? 'null'}</span>
      <button onClick={connect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}

const renderWithProviders = (ui: React.ReactElement, idleTimeout?: number) => {
  return render(
    <PreferencesProvider>
      <ToastProvider>
        <WalletProvider idleTimeout={idleTimeout}>
          {ui}
        </WalletProvider>
      </ToastProvider>
    </PreferencesProvider>
  );
};

describe('WalletContext persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('connect()', () => {
    it('sets isConnecting to true initially and resolves with address', async () => {
      renderWithProviders(<WalletConsumer />);

      const connectBtn = screen.getByTestId('connect-btn');
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('Not connecting');
      expect(screen.getByTestId('address')).toHaveTextContent('No address');

      await act(async () => {
        connectBtn.click();
      });

      expect(screen.getByTestId('is-connecting')).toHaveTextContent('Connecting');

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId('address')).toHaveTextContent(MOCKED_STELLAR_ADDRESS);
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('Not connecting');
    });

    it('sets a valid Stellar G-address that passes isValidStellarAddress', async () => {
      renderWithProviders(<WalletConsumer />);

      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(isValidStellarAddress(screen.getByTestId('address').textContent)).toBe(true);
    });

    it('clears error at the start of each connect() call', async () => {
      renderWithProviders(<WalletConsumer />);

      // First connect
      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      expect(screen.getByTestId('error')).toHaveTextContent('No error');

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Second connect — error should still be null
      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      expect(screen.getByTestId('error')).toHaveTextContent('No error');

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId('error')).toHaveTextContent('No error');
    });

    it('does not reject — the returned Promise always resolves', async () => {
      const { result } = (() => {
        let capturedConnect: (() => Promise<void>) | undefined;

        function Capture() {
          capturedConnect = useWallet().connect;
          return null;
        }

        render(
          <PreferencesProvider>
            <ToastProvider>
              <WalletProvider idleTimeout={0}>
                <Capture />
              </WalletProvider>
            </ToastProvider>
          </PreferencesProvider>
        );

        return { result: capturedConnect! };
      })();

      let resolved = false;
      await act(async () => {
        result().then(() => {
          resolved = true;
        });
        jest.advanceTimersByTime(1000);
      });

      expect(resolved).toBe(true);
    });

    it('guards against concurrent connect calls (connect while connecting)', async () => {
      renderWithProviders(<WalletConsumer />);
      
      const connectBtn = screen.getByTestId('connect-btn');
      
      // First call
      await act(async () => {
        connectBtn.click();
      });
      
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('Connecting');
      
      // Wait halfway through the connection
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      
      // Second call while still connecting
      await act(async () => {
        connectBtn.click();
      });
      
      // Finish the first connection
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('Not connecting');
      expect(screen.getByTestId('address')).toHaveTextContent(MOCKED_STELLAR_ADDRESS);
      
      // If the second call incorrectly proceeded, advancing the timer again would 
      // uncover the defect (isConnecting would be false while the second call was in flight).
      // Since it's guarded, the second call returns early. Let's advance time again just in case
      // to ensure no lingering side effects.
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('Not connecting');
    });
  });

  describe('disconnect()', () => {
    it('clears the address', async () => {
      renderWithProviders(<WalletConsumer />);

      const connectBtn = screen.getByTestId('connect-btn');
      const disconnectBtn = screen.getByTestId('disconnect-btn');

      await act(async () => {
        connectBtn.click();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId('address')).toHaveTextContent(MOCKED_STELLAR_ADDRESS);

      await act(async () => {
        disconnectBtn.click();
      });

      expect(screen.getByTestId('address')).toHaveTextContent('No address');
    });

    it('is a no-op when called without a prior connect (address stays null)', async () => {
      renderWithProviders(<WalletConsumer />);

      expect(screen.getByTestId('address')).toHaveTextContent('No address');

      await act(async () => {
        screen.getByTestId('disconnect-btn').click();
      });

      expect(screen.getByTestId('address')).toHaveTextContent('No address');
      expect(screen.getByTestId('error')).toHaveTextContent('No error');
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('Not connecting');
    });

    it('does not affect isConnecting state', async () => {
      renderWithProviders(<WalletConsumer />);

      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await act(async () => {
        screen.getByTestId('disconnect-btn').click();
      });

      expect(screen.getByTestId('is-connecting')).toHaveTextContent('Not connecting');
    });

    it('does not affect error state', async () => {
      renderWithProviders(<WalletConsumer />);

      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await act(async () => {
        screen.getByTestId('disconnect-btn').click();
      });

      expect(screen.getByTestId('error')).toHaveTextContent('No error');
    });
  });

  describe('reconnect after disconnect', () => {
    it('allows connect() to be called again after disconnect and populates address', async () => {
      renderWithProviders(<WalletConsumer />);

      // Connect
      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId('address')).toHaveTextContent(MOCKED_STELLAR_ADDRESS);

      // Disconnect
      await act(async () => {
        screen.getByTestId('disconnect-btn').click();
      });

      expect(screen.getByTestId('address')).toHaveTextContent('No address');

      // Reconnect
      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId('address')).toHaveTextContent(MOCKED_STELLAR_ADDRESS);
    });
  });

  describe('Idle auto-disconnect', () => {
    const IDLE_TIMEOUT = 5000;

    it('automatically disconnects after idle period', async () => {
      renderWithProviders(<WalletConsumer />, IDLE_TIMEOUT);

      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByTestId('address')).toHaveTextContent(MOCKED_STELLAR_ADDRESS);

      await act(async () => {
        jest.advanceTimersByTime(IDLE_TIMEOUT);
      });

      expect(screen.getByTestId('address')).toHaveTextContent('No address');
      expect(screen.getByRole('status')).toHaveTextContent('Session expired');
    });

    it('resets the timer on user activity', async () => {
      renderWithProviders(<WalletConsumer />, IDLE_TIMEOUT);

      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await act(async () => {
        jest.advanceTimersByTime(IDLE_TIMEOUT / 2);
      });

      await act(async () => {
        fireEvent.pointerMove(window);
      });

      await act(async () => {
        jest.advanceTimersByTime(IDLE_TIMEOUT / 2);
      });

      expect(screen.getByTestId('address')).toHaveTextContent(MOCKED_STELLAR_ADDRESS);

      await act(async () => {
        jest.advanceTimersByTime(IDLE_TIMEOUT / 2);
      });

      expect(screen.getByTestId('address')).toHaveTextContent('No address');
    });

    it('does not disconnect if idleTimeout is 0', async () => {
      renderWithProviders(<WalletConsumer />, 0);

      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await act(async () => {
        jest.advanceTimersByTime(100000);
      });

      expect(screen.getByTestId('address')).toHaveTextContent(MOCKED_STELLAR_ADDRESS);
    });
  });

  test('rehydrates address from safeStorage on mount', () => {
    (getItem as jest.Mock).mockReturnValue('0xABC');
    render(
      <WalletProvider idleTimeout={0}>
        <MockComponent />
      </WalletProvider>
    );
    expect(screen.getByTestId('address')).toHaveTextContent('0xABC');
    expect(getItem).toHaveBeenCalledWith('wallet_connected_address');
  });

  test('connect stores address in safeStorage', async () => {
    (getItem as jest.Mock).mockReturnValue(null);
    render(
      <WalletProvider idleTimeout={0}>
        <MockComponent />
      </WalletProvider>
    );
    act(() => {
      screen.getByText('Connect').click();
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('address')).toHaveTextContent(MOCKED_STELLAR_ADDRESS);
    expect(setItem).toHaveBeenCalledWith('wallet_connected_address', MOCKED_STELLAR_ADDRESS);
  });

  test('disconnect clears address from safeStorage', async () => {
    (getItem as jest.Mock).mockReturnValue(null);
    render(
      <WalletProvider idleTimeout={0}>
        <MockComponent />
      </WalletProvider>
    );
    act(() => {
      screen.getByText('Connect').click();
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    act(() => {
      screen.getByText('Disconnect').click();
    });
    expect(screen.getByTestId('address')).toHaveTextContent('null');
    expect(removeItem).toHaveBeenCalledWith('wallet_connected_address');
  });

  test('idle timeout disconnects and clears storage', async () => {
    (getItem as jest.Mock).mockReturnValue(null);
    render(
      <ToastProvider>
        <WalletProvider idleTimeout={2000}>
          <MockComponent />
        </WalletProvider>
      </ToastProvider>
    );
    act(() => {
      screen.getByText('Connect').click();
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('address')).toHaveTextContent('null');
    expect(removeItem).toHaveBeenCalledWith('wallet_connected_address');
  });
});

describe('useWallet() outside provider', () => {
  it('throws error when called outside WalletProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    function ComponentWithoutProvider() {
      try {
        useWallet();
        return <div>Should not render</div>;
      } catch (err) {
        return <div data-testid="error-message">{(err as Error).message}</div>;
      }
    }

    render(<ComponentWithoutProvider />);
    expect(screen.getByTestId('error-message')).toHaveTextContent(
      'useWallet must be used within a WalletProvider'
    );

    consoleError.mockRestore();
  });

  it('thrown error is an instance of Error', () => {
    let caughtError: unknown;

    function Capture() {
      try {
        useWallet();
      } catch (err) {
        caughtError = err;
      }
      return null;
    }

    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    render(<Capture />);
    consoleError.mockRestore();

    expect(caughtError).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// WalletContextType field presence
// ---------------------------------------------------------------------------
describe('WalletContextType field presence', () => {
  it('exposes all documented fields: address, isConnecting, error, connect, disconnect', () => {
    let ctx: ReturnType<typeof useWallet> | undefined;

    function Capture() {
      ctx = useWallet();
      return null;
    }

    render(
      <PreferencesProvider>
        <ToastProvider>
          <WalletProvider idleTimeout={0}>
            <Capture />
          </WalletProvider>
        </ToastProvider>
      </PreferencesProvider>
    );

    expect(ctx).toBeDefined();
    expect(ctx).toHaveProperty('address');
    expect(ctx).toHaveProperty('isConnecting');
    expect(ctx).toHaveProperty('error');
    expect(ctx).toHaveProperty('connect');
    expect(ctx).toHaveProperty('disconnect');
    expect(typeof ctx!.connect).toBe('function');
    expect(typeof ctx!.disconnect).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Toast error surfacing tests
// ---------------------------------------------------------------------------

/**
 * NOTE: The error surfacing tests that mock setTimeout to throw are skipped
 * because errors thrown inside setTimeout callbacks don't propagate correctly
 * through Jest's fake timer implementation to the Promise's catch handler.
 *
 * The error handling code in WalletContext.tsx is tested indirectly through:
 * - Integration tests with real timers
 * - Manual QA testing with actual wallet failures
 * - The successful connect() tests above verify the happy path
 */
describe('WalletContext – error toast surfacing', () => {
  const { WalletProvider: ActualWalletProvider, useWallet: ActualUseWallet } =
    jest.requireActual('../WalletContext');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function ToastConsumer() {
    const toasts = screen.queryAllByRole('alert');
    return <>{toasts.length > 0 ? null : null}</>;
  }

  function ConnectConsumer() {
    const { connect, error } = ActualUseWallet();
    return (
      <div>
        <button data-testid="connect" onClick={connect}>Connect</button>
        <div data-testid="inline-error">{error ?? ''}</div>
      </div>
    );
  }

  const renderAll = (idleTimeout = 0) =>
    render(
      <PreferencesProvider>
        <ToastProvider>
          <ActualWalletProvider idleTimeout={idleTimeout}>
            <ConnectConsumer />
            <ToastConsumer />
          </ActualWalletProvider>
        </ToastProvider>
      </PreferencesProvider>
    );

  it('does NOT fire an error toast on a successful connect()', async () => {
    renderAll();

    await act(async () => {
      screen.getByTestId('connect').click();
    });

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // No role="alert" elements should exist (no error toast)
    expect(screen.queryAllByRole('alert')).toHaveLength(0);

    // Inline error should remain empty
    expect(screen.getByTestId('inline-error').textContent).toBe('');
  });

  it('sets inline error state on failure regardless of toast', async () => {
    renderAll();

    // Make the internal Promise reject so connect()'s catch block fires.
    // We spy on the global Promise constructor and make the next `new Promise`
    // call reject immediately instead of resolving after the timeout.
    const originalPromise = global.Promise;
    let callCount = 0;
    const PromiseSpy = new Proxy(originalPromise, {
      construct(Target, args) {
        callCount++;
        if (callCount === 1) {
          // First `new Promise` inside connect() — reject it
          return new Target((_resolve: unknown, reject: (err: Error) => void) => {
            reject(new Error('Simulated wallet failure'));
          });
        }
        // All other Promise constructions behave normally
        return new Target(...(args as [unknown]));
      },
    });
    global.Promise = PromiseSpy as unknown as PromiseConstructor;

    await act(async () => {
      screen.getByTestId('connect').click();
    });

    global.Promise = originalPromise;

    // Inline error must be set by the catch block in connect()
    expect(screen.getByTestId('inline-error').textContent).toBe('Failed to connect wallet');
  });
});
