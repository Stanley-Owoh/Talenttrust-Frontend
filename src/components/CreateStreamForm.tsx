'use client';

import React, { FormEvent, useCallback, useRef, useState } from 'react';
import { KbdHint } from '@/components/KbdHint';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of a new payment stream as filled in by the form. */
export interface StreamFormValues {
  /** Human-readable stream title / description. */
  title: string;
  /** Recipient Stellar address (G…). */
  recipient: string;
  /** Flow rate in the chosen currency per second. */
  ratePerSecond: string;
  /** Currency ticker (e.g. "XLM", "USDC"). */
  currency: string;
}

export interface CreateStreamFormProps {
  /**
   * Called with the validated form values when the user submits.
   * The host component is responsible for the actual blockchain call.
   */
  onSubmit: (values: StreamFormValues) => void;
  /** Called when the user cancels without submitting. */
  onCancel?: () => void;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type FormErrors = Partial<Record<keyof StreamFormValues, string>>;

const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;
const CURRENCIES = ['XLM', 'USDC', 'EURC'] as const;

function validateStreamForm(values: StreamFormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.title.trim()) {
    errors.title = 'Stream title is required.';
  } else if (values.title.trim().length > 200) {
    errors.title = 'Title must be 200 characters or fewer.';
  }

  const normalised = values.recipient.trim().toUpperCase();
  if (!normalised) {
    errors.recipient = 'Recipient address is required.';
  } else if (!STELLAR_ADDRESS_RE.test(normalised)) {
    errors.recipient = 'Enter a valid Stellar public key (starts with G, 56 characters).';
  }

  const rate = parseFloat(values.ratePerSecond);
  if (!values.ratePerSecond.trim()) {
    errors.ratePerSecond = 'Rate per second is required.';
  } else if (isNaN(rate) || rate <= 0) {
    errors.ratePerSecond = 'Rate must be a positive number.';
  }

  if (!values.currency.trim()) {
    errors.currency = 'Currency is required.';
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the platform-aware modifier key label.
 * Prefers "⌘" on macOS, "Ctrl" elsewhere.
 */
function modKey(): string {
  if (typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)) {
    return '⌘';
  }
  return 'Ctrl';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CreateStreamForm — accessible form for initiating a Stellar payment stream.
 *
 * Keyboard shortcuts:
 *   `Ctrl/⌘ + Enter` — submit the form from any field.
 *   `Escape`          — invoke `onCancel`.
 *
 * Accessibility:
 *   - Each field has an associated `<label>` and error message linked via
 *     `aria-describedby` + `aria-invalid`.
 *   - Keyboard shortcut hints are rendered using the `KbdHint` component,
 *     which uses `role="img"` with a synthesised `aria-label` so screen
 *     readers hear the shortcut as a single meaningful unit.
 *   - The form itself is labelled by the visible heading.
 *   - Required fields carry `aria-required="true"`.
 *   - Error messages use `role="alert"` so they are announced immediately.
 *
 * Design tokens:
 *   - Uses `--border`, `--card`, `--muted-foreground` CSS variables so the
 *     form adapts automatically to light and dark themes.
 *
 * @example
 * ```tsx
 * <CreateStreamForm
 *   onSubmit={(values) => initiateStream(values)}
 *   onCancel={() => setShowForm(false)}
 * />
 * ```
 */
export const CreateStreamForm: React.FC<CreateStreamFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [values, setValues] = useState<StreamFormValues>({
    title: '',
    recipient: '',
    ratePerSecond: '',
    currency: 'XLM',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const firstErrorRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const mod = modKey();

  const set = useCallback(
    (field: keyof StreamFormValues) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setValues((prev) => ({ ...prev, [field]: e.target.value }));
        // Clear the per-field error as the user corrects their input
        if (errors[field]) {
          setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
      },
    [errors],
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const errs = validateStreamForm(values);
      setErrors(errs);

      if (Object.keys(errs).length > 0) {
        // Move focus to the first invalid field for screen reader users
        firstErrorRef.current?.focus();
        return;
      }

      onSubmit({
        title: values.title.trim(),
        recipient: values.recipient.trim().toUpperCase(),
        ratePerSecond: values.ratePerSecond.trim(),
        currency: values.currency,
      });
    },
    [values, onSubmit],
  );

  /** Keyboard shortcut: Ctrl/⌘+Enter submits; Escape cancels. */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(e as unknown as FormEvent);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      }
    },
    [handleSubmit, onCancel],
  );

  // Helper: collect ref for the first erring field after submit
  const errorRef = (field: keyof StreamFormValues) =>
    errors[field] && !firstErrorRef.current
      ? (el: HTMLInputElement | HTMLSelectElement | null) => {
          firstErrorRef.current = el;
        }
      : undefined;

  return (
    <section
      aria-labelledby="create-stream-heading"
      className="w-full max-w-lg rounded-2xl border border-[var(--border,theme(colors.slate.200))] bg-[var(--card,white)] p-6 shadow-sm"
      onKeyDown={handleKeyDown}
    >
      {/* Heading */}
      <h2
        id="create-stream-heading"
        className="text-xl font-semibold text-[var(--foreground,theme(colors.slate.900))] mb-1"
      >
        Create Payment Stream
      </h2>
      <p className="text-sm text-[var(--muted-foreground,theme(colors.slate.500))] mb-5">
        Set up a continuous Stellar payment stream to a recipient.
      </p>

      <form onSubmit={handleSubmit} noValidate aria-label="Create payment stream">

        {/* Title */}
        <div className="mb-4">
          <label
            htmlFor="stream-title"
            className="block text-sm font-medium text-[var(--foreground,theme(colors.slate.900))] mb-1"
          >
            Stream title <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="stream-title"
            type="text"
            value={values.title}
            onChange={set('title')}
            aria-required="true"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'stream-title-error' : undefined}
            ref={errorRef('title') as React.RefCallback<HTMLInputElement>}
            placeholder="e.g., Weekly design retainer"
            className={[
              'w-full rounded-lg border px-3 py-2 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              errors.title
                ? 'border-red-500 bg-red-50'
                : 'border-[var(--border,theme(colors.slate.300))] bg-white',
            ].join(' ')}
          />
          {errors.title && (
            <p id="stream-title-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.title}
            </p>
          )}
        </div>

        {/* Recipient */}
        <div className="mb-4">
          <label
            htmlFor="stream-recipient"
            className="block text-sm font-medium text-[var(--foreground,theme(colors.slate.900))] mb-1"
          >
            Recipient address <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="stream-recipient"
            type="text"
            value={values.recipient}
            onChange={set('recipient')}
            aria-required="true"
            aria-invalid={!!errors.recipient}
            aria-describedby={errors.recipient ? 'stream-recipient-error' : undefined}
            ref={errorRef('recipient') as React.RefCallback<HTMLInputElement>}
            placeholder="GABC…"
            className={[
              'w-full rounded-lg border px-3 py-2 text-sm font-mono',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              errors.recipient
                ? 'border-red-500 bg-red-50'
                : 'border-[var(--border,theme(colors.slate.300))] bg-white',
            ].join(' ')}
          />
          {errors.recipient && (
            <p id="stream-recipient-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.recipient}
            </p>
          )}
        </div>

        {/* Rate + Currency */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label
              htmlFor="stream-rate"
              className="block text-sm font-medium text-[var(--foreground,theme(colors.slate.900))] mb-1"
            >
              Rate / second <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="stream-rate"
              type="text"
              inputMode="decimal"
              value={values.ratePerSecond}
              onChange={set('ratePerSecond')}
              aria-required="true"
              aria-invalid={!!errors.ratePerSecond}
              aria-describedby={errors.ratePerSecond ? 'stream-rate-error' : undefined}
              ref={errorRef('ratePerSecond') as React.RefCallback<HTMLInputElement>}
              placeholder="e.g., 0.001"
              className={[
                'w-full rounded-lg border px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                errors.ratePerSecond
                  ? 'border-red-500 bg-red-50'
                  : 'border-[var(--border,theme(colors.slate.300))] bg-white',
              ].join(' ')}
            />
            {errors.ratePerSecond && (
              <p id="stream-rate-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.ratePerSecond}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="stream-currency"
              className="block text-sm font-medium text-[var(--foreground,theme(colors.slate.900))] mb-1"
            >
              Currency <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <select
              id="stream-currency"
              value={values.currency}
              onChange={set('currency')}
              aria-required="true"
              aria-invalid={!!errors.currency}
              aria-describedby={errors.currency ? 'stream-currency-error' : undefined}
              ref={errorRef('currency') as React.RefCallback<HTMLSelectElement>}
              className={[
                'w-full rounded-lg border px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                errors.currency
                  ? 'border-red-500 bg-red-50'
                  : 'border-[var(--border,theme(colors.slate.300))] bg-white',
              ].join(' ')}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.currency && (
              <p id="stream-currency-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.currency}
              </p>
            )}
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between mt-6 gap-3">
          {/* Keyboard hint — visible on md+ screens */}
          <div className="hidden sm:flex items-center gap-3" aria-hidden="true">
            <KbdHint keys={[mod, 'Enter']} label="to submit" />
            {onCancel && (
              <KbdHint keys={['Esc']} label="to cancel" />
            )}
          </div>

          {/* Screen-reader-only hint (announced, not displayed) */}
          <KbdHint
            keys={[mod === '⌘' ? 'Command' : 'Control', 'Enter']}
            label="to submit the form"
            srOnly
          />

          <div className="flex gap-3 ml-auto">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-lg border border-[var(--border,theme(colors.slate.300))] text-sm font-medium text-[var(--foreground,theme(colors.slate.700))] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition"
            >
              Create Stream
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};

export default CreateStreamForm;
