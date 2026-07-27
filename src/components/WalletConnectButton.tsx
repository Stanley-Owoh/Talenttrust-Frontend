'use client';

import React from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/components/toast/toast-provider';
import { usePreferences } from '@/lib/preferences';
import { truncateAddress } from '@/lib/truncateAddress';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useWalletFocus } from '@/hooks/useWalletFocus';

export const WalletConnectButton = () => {
  const { address, isConnecting, error, connect, disconnect } = useWallet();
  const { showError } = useToast();
  const { preferences, updatePreference } = usePreferences();
  const { connectButtonRef, connectedElementRef } = useWalletFocus(address, isConnecting);

  const isCompact = preferences.walletDensity === 'compact';
  const btnPadding = isCompact ? 'p-1' : 'p-1.5';
  const toggleDensity = () => {
    updatePreference('walletDensity', isCompact ? 'comfortable' : 'compact');
  };

  const { copied, copy } = useCopyToClipboard({
    delay: 2000,
    onError: (err) => {
      if (err instanceof Error && err.message.includes('supported')) {
        showError({
          title: 'Copy not supported',
          description: 'Your browser does not support clipboard access. Please copy the address manually.',
        });
      } else {
        showError({
          title: 'Copy failed',
          description: 'Unable to copy the address to your clipboard. Please try again.',
        });
      }
    },
  });

  /**
   * Copies the connected wallet address to the system clipboard.
   *
   * Guards against environments where the Clipboard API is unavailable
   * (insecure contexts, older browsers, or denied permissions) and wraps
   * the async write in a try/catch so failures surface as user-visible
   * error toasts rather than unhandled promise rejections.
   *
   * - Sets `copied = true` **only** when the write actually succeeds,
   *   reverting to `false` after 2 seconds.
   * - On any failure, triggers an error toast via `showError` without
   *   logging sensitive address data to the console.
   */
  const handleCopy = async () => {
    if (!address) return;
    await copy(address);
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-red-600 ring-1 ring-red-200">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-sm font-medium">Connection Error</span>
        <button
          onClick={connect}
          className="ml-2 rounded text-sm font-semibold underline hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1"
          aria-label="Retry wallet connection"
        >
          Retry
        </button>
      </div>
    );
  }

  if (address) {
    const densityLabel = isCompact ? 'Switch to comfortable view' : 'Switch to compact view';
    return (
      <div ref={connectedElementRef} tabIndex={-1} className="flex items-center gap-2 rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
          <span className="text-sm font-medium text-slate-700 font-mono">
            {truncateAddress(address)}
          </span>
        </div>
        <button
          onClick={toggleDensity}
          className={`rounded-lg ${btnPadding} text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500`}
          aria-label={densityLabel}
          title={densityLabel}
          data-testid="wallet-density-btn"
        >
          {isCompact ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="4" y1="5" x2="20" y2="5" />
              <line x1="4" y1="9" x2="20" y2="9" />
              <line x1="4" y1="13" x2="20" y2="13" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="4" y1="5" x2="20" y2="5" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="19" x2="20" y2="19" />
            </svg>
          )}
        </button>
        <button
          onClick={handleCopy}
          className={`rounded-lg ${btnPadding} text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500`}
          aria-label="Copy address to clipboard"
          title="Copy address"
        >
          {copied ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
        <button
          onClick={disconnect}
          className={`rounded-lg ${btnPadding} text-slate-500 hover:bg-red-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500`}
          aria-label="Disconnect wallet"
          title="Disconnect wallet"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      ref={connectButtonRef}
      onClick={connect}
      disabled={isConnecting}
      aria-label="Connect wallet"
      className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isConnecting ? (
        <>
          {/* animate-spin is halted by the @media (prefers-reduced-motion: reduce)
              rule in globals.css. The SVG remains visible as a static loading
              indicator so the connecting state is still perceivable without motion. */}
          <svg
            className="h-4 w-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Connecting...</span>
        </>
      ) : (
        <span>Connect Wallet</span>
      )}
    </button>
  );
};
