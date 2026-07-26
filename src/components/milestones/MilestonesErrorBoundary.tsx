'use client';

import React, { Component, type ReactNode } from 'react';
import { reportError } from '../../lib/errorReporter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MilestonesErrorBoundaryProps {
  /** Content to protect. */
  children: ReactNode;
  /**
   * Optional override for the fallback UI. When provided it replaces the
   * built-in accessible fallback entirely — the consumer is responsible for
   * rendering a retry affordance if desired.
   */
  fallback?: ReactNode;
  /**
   * Optional callback fired after an error is caught, in addition to the
   * internal `reportError` call. Useful for testing or custom instrumentation.
   */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * MilestonesErrorBoundary
 *
 * An error boundary scoped to the milestones section. When a descendant
 * throws during render, the boundary:
 *   1. Reports the error via `reportError` (the existing error-reporter seam).
 *   2. Renders an accessible fallback UI with a visible "Try again" button.
 *   3. Resets its own state on retry so the milestones section re-mounts.
 *
 * Accessibility:
 *   - The fallback container uses `role="alert"` so assistive-technology users
 *     are immediately informed that the section failed.
 *   - The "Try again" button receives focus automatically (via `autoFocus`)
 *     when the fallback renders, providing a clear keyboard entry point.
 *   - All interactive elements meet WCAG 2.4.7 focus-visible requirements.
 */
export default class MilestonesErrorBoundary extends Component<
  MilestonesErrorBoundaryProps,
  State
> {
  state: State = { hasError: false, error: null };

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportError(error, 'MilestonesErrorBoundary', 'error', {
      componentStack: info.componentStack ?? undefined,
    });
    this.props.onError?.(error, info);
  }

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  /** Clears the error state so the children are re-mounted on the next render. */
  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    // Custom fallback supplied by the consumer takes full precedence.
    if (fallback !== undefined) {
      return fallback;
    }

    // ----------------------------------------------------------------
    // Built-in accessible fallback
    // ----------------------------------------------------------------
    return (
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm"
      >
        <p className="text-base font-semibold text-red-800">
          The milestones section couldn&rsquo;t load.
        </p>

        {error?.message && (
          <p className="mt-1 text-sm text-red-600" data-testid="milestones-error-message">
            {error.message}
          </p>
        )}

        <p className="mt-2 text-sm text-red-700">
          This is likely a temporary issue. Use the button below to try again.
        </p>

        <button
          type="button"
          autoFocus
          onClick={this.handleRetry}
          className={[
            'mt-4 inline-flex items-center gap-2 rounded-xl',
            'bg-red-700 px-4 py-2 text-sm font-semibold text-white',
            'transition hover:bg-red-800',
            'focus-visible:outline focus-visible:outline-4',
            'focus-visible:outline-offset-2 focus-visible:outline-red-600',
          ].join(' ')}
        >
          Try again
        </button>
      </div>
    );
  }
}
