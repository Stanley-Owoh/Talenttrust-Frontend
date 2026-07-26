'use client';

/**
 * FormsList
 *
 * Renders a paginated, filterable list of forms.  Each row now includes an
 * accessible copy-to-clipboard control for the form identifier so users can
 * quickly grab an id without selecting text manually.
 *
 * Copy behaviour:
 *  - Uses the Clipboard API (`navigator.clipboard.writeText`) when available.
 *  - Falls back to a `document.execCommand('copy')` textarea trick in
 *    environments that do not expose the async Clipboard API.
 *  - After a successful copy a toast is shown via `useToast`.
 *  - On failure a toast describes the problem so the user can act.
 *
 * Requires `<ToastProvider>` in the component tree (provided by the root layout).
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useToast } from '@/components/toast/toast-provider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FormStatus = 'All' | 'Draft' | 'Published';

export interface Form {
  id: string;
  title: string;
  status: FormStatus;
}

export interface FormsListProps {
  forms: Form[];
  /** When true the loading skeleton is shown. */
  isLoading?: boolean;
  /** When provided the error state is rendered. */
  error?: string | null;
}

// ---------------------------------------------------------------------------
// Copy button for a single form id
// ---------------------------------------------------------------------------

interface CopyIdButtonProps {
  formId: string;
}

/**
 * Renders a small copy-to-clipboard button for a form identifier.
 *
 * Accessibility:
 *  - `aria-label` identifies the action and target id.
 *  - `aria-pressed` reflects the transient "copied" state.
 *  - Keyboard-operable via natural focus/tab order.
 */
function CopyIdButton({ formId }: CopyIdButtonProps) {
  const { showSuccess, showError } = useToast();

  const { copied, copy } = useCopyToClipboard({
    onSuccess: () => {
      showSuccess({ title: `Copied "${formId}" to clipboard.` });
    },
    onError: () => {
      // Clipboard API unavailable — attempt the execCommand fallback
      const success = execCommandFallback(formId);
      if (success) {
        showSuccess({ title: `Copied "${formId}" to clipboard.` });
      } else {
        showError({ title: `Failed to copy "${formId}". Please copy it manually.` });
      }
    },
  });

  const handleClick = useCallback(() => {
    copy(formId);
  }, [copy, formId]);

  return (
    <button
      type="button"
      aria-label={`Copy id ${formId}`}
      aria-pressed={copied}
      data-testid={`copy-id-${formId}`}
      onClick={handleClick}
      className={[
        'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500',
        copied
          ? 'bg-green-50 border-green-400 text-green-700'
          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50',
      ].join(' ')}
    >
      {copied ? (
        <>
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4 1h6a1 1 0 0 1 1 1v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// execCommand fallback
// ---------------------------------------------------------------------------

/**
 * Fallback copy using the legacy `document.execCommand('copy')` approach.
 * Creates a hidden textarea, selects its content, and fires the copy command.
 * Returns `true` when the command reported success, `false` otherwise.
 *
 * This path executes when `navigator.clipboard` is unavailable (e.g. non-HTTPS
 * or older browsers) and is documented inline for reviewer clarity.
 */
export function execCommandFallback(text: string): boolean {
  // Guard: execCommand is not available in non-browser environments
  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  // Off-screen so it is not visible to users
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  textarea.setAttribute('aria-hidden', 'true');
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {
    // execCommand not supported — success remains false
  } finally {
    document.body.removeChild(textarea);
  }
  return success;
}

// ---------------------------------------------------------------------------
// FormsList
// ---------------------------------------------------------------------------

export const FormsList = ({ forms, isLoading = false, error = null }: FormsListProps) => {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FormStatus>('All');
  const pageSize = 10;

  const filteredForms = useMemo(() => {
    if (filter === 'All') return forms;
    return forms.filter((f) => f.status === filter);
  }, [forms, filter]);

  const displayedForms = filteredForms.slice(0, page * pageSize);
  const hasMore = displayedForms.length < filteredForms.length;

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading forms…"
        data-testid="forms-loading"
        className="flex flex-col gap-3 p-4 animate-pulse"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        role="alert"
        data-testid="forms-error"
        className="p-4 text-red-700 bg-red-50 rounded"
      >
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter controls */}
      <div role="group" aria-label="Filter forms by status">
        <button onClick={() => { setFilter('All'); setPage(1); }}>Filter All</button>
        <button onClick={() => { setFilter('Draft'); setPage(1); }}>Filter Draft</button>
        <button onClick={() => { setFilter('Published'); setPage(1); }}>Filter Published</button>
      </div>

      {/* Empty state */}
      {filteredForms.length === 0 ? (
        <div data-testid="forms-empty" className="py-12 text-center text-gray-500">
          <p className="text-lg font-medium">No forms found</p>
          <p className="text-sm mt-1">
            {filter === 'All'
              ? 'There are no forms to display.'
              : `No forms match the "${filter}" filter.`}
          </p>
        </div>
      ) : (
        <>
          <ul data-testid="forms-list">
            {displayedForms.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2">
                <span>{f.title}</span>
                <span className="flex items-center gap-2">
                  <code
                    className="text-xs text-gray-500 font-mono"
                    data-testid={`form-id-${f.id}`}
                  >
                    {f.id}
                  </code>
                  <CopyIdButton formId={f.id} />
                </span>
              </li>
            ))}
          </ul>

          {hasMore && (
            <button onClick={() => setPage((p) => p + 1)}>Load More</button>
          )}
          {!hasMore && displayedForms.length > 0 && (
            <div>End of list</div>
          )}
        </>
      )}
    </div>
  );
};
