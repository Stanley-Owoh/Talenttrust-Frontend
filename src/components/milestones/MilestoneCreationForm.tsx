'use client';

import React, { useState, useCallback, FormEvent, useRef } from 'react';
import { FormField } from '@/components/FormField';
import { ErrorSummary } from '@/components/ErrorSummary';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';
import { sanitizeUserText } from '@/lib/sanitizeUserText';
import type { Milestone } from '@/types/domain';

export const MAX_MILESTONE_TITLE_LENGTH = 200;

/** Status options available when creating a milestone. */
const STATUS_OPTIONS: Milestone['status'][] = [
  'Pending',
  'Active',
  'Completed',
  'Paid',
  'Disputed',
];

/** Currency options available when creating a milestone. */
const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'XLM'] as const;

export interface MilestoneCreationFormProps {
  /**
   * Called with the fully-constructed `Milestone` object when the form
   * passes validation and the user submits.
   */
  onSubmit: (milestone: Milestone) => void;
  /** Called when the user cancels out of the form without saving. */
  onCancel: () => void;
  /**
   * Id of the parent contract this milestone is being created for. When
   * supplied (i.e. the form is opened from a contract detail context),
   * it is stamped onto the constructed `Milestone` so
   * `listMilestonesByContract` can later resolve it back to that contract.
   */
  contractId?: string;
}

/**
 * Accessible modal form for creating a new milestone.
 *
 * Mirrors the style and accessibility patterns of `ContractCreationForm`:
 * - `role="dialog"` / `aria-modal` for correct AT announcement.
 * - Shared dialog focus trapping, Escape handling, and trigger-focus restoration.
 * - `ErrorSummary` with `role="alert"` focus management for invalid submissions.
 * - `FormField` handles per-field `aria-invalid`, `aria-describedby`, and
 *   error-border injection.
 * - `id` is generated from the title slug + a timestamp so duplicate titles
 *   never collide across sessions.
 *
 * @example
 * ```tsx
 * <MilestoneCreationForm
 *   onSubmit={(m) => { saveMilestone(m); setMilestones(listMilestones()); }}
 *   onCancel={() => setShowForm(false)}
 * />
 * ```
 */
export const MilestoneCreationForm: React.FC<MilestoneCreationFormProps> = ({
  onSubmit,
  onCancel,
  contractId,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [payout, setPayout] = useState('');
  const [currency, setCurrency] = useState<string>('USD');
  const [status, setStatus] = useState<Milestone['status']>('Pending');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<Array<{ fieldId: string; message: string }>>([]);

  /**
   * Validates form fields and returns an array of error objects.
   * An empty array means the form is valid.
   */
  const validateForm = useCallback((): Array<{ fieldId: string; message: string }> => {
    const errs: Array<{ fieldId: string; message: string }> = [];

    const sanitizedTitle = sanitizeUserText(title, MAX_MILESTONE_TITLE_LENGTH);
    const unboundedTitle = sanitizeUserText(title, Number.MAX_SAFE_INTEGER);
    if (!sanitizedTitle) {
      errs.push({ fieldId: 'milestone-title', message: 'Title is required' });
    } else if (unboundedTitle.length > MAX_MILESTONE_TITLE_LENGTH) {
      errs.push({
        fieldId: 'milestone-title',
        message: `Title must be no more than ${MAX_MILESTONE_TITLE_LENGTH} characters`,
      });
    }

    const numericPayout = parseFloat(payout);
    if (!payout.trim()) {
      errs.push({ fieldId: 'milestone-payout', message: 'Payout amount is required' });
    } else if (isNaN(numericPayout) || numericPayout <= 0) {
      errs.push({ fieldId: 'milestone-payout', message: 'Payout must be a positive number' });
    }

    if (!currency.trim()) {
      errs.push({ fieldId: 'milestone-currency', message: 'Currency is required' });
    }

    return errs;
  }, [title, payout, currency]);

  /**
   * Handles form submission: validates, then calls `onSubmit` with the
   * constructed `Milestone` object on success.
   */
  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const validationErrors = validateForm();
      setErrors(validationErrors);

      if (validationErrors.length > 0) return;

      // Generate a stable id from title slug + current timestamp
      const sanitizedTitle = sanitizeUserText(title, MAX_MILESTONE_TITLE_LENGTH);
      const slug = sanitizedTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const id = `${slug}-${Date.now()}`;

      const milestone: Milestone = {
        id,
        title: sanitizedTitle,
        status,
        payout: parseFloat(payout),
        currency: currency.trim(),
        dueDate: dueDate.trim() || undefined,
        contractId,
      };

      onSubmit(milestone);
    },
    [title, payout, currency, status, dueDate, contractId, validateForm, onSubmit],
  );

  const getFieldError = (fieldId: string): string | undefined =>
    errors.find((e) => e.fieldId === fieldId)?.message;

  useDialogFocusTrap({
    isOpen: true,
    dialogRef,
    initialFocusRef: titleInputRef,
    onEscape: onCancel,
    restoreFocus: true,
  });

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-labelledby="create-milestone-title"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <h2
          id="create-milestone-title"
          className="text-2xl font-bold text-slate-900 mb-6"
        >
          Add Milestone
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          <ErrorSummary errors={errors} />

          <FormField
            label="Title"
            id="milestone-title"
            error={getFieldError('milestone-title')}
            required
          >
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Frontend Development – Sprint 1"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Payout Amount"
              id="milestone-payout"
              error={getFieldError('milestone-payout')}
              required
            >
              <input
                type="text"
                inputMode="decimal"
                value={payout}
                onChange={(e) => setPayout(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 2500"
              />
            </FormField>

            <FormField
              label="Currency"
              id="milestone-currency"
              error={getFieldError('milestone-currency')}
              required
            >
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Status" id="milestone-status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Milestone['status'])}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Due Date"
            id="milestone-dueDate"
            helperText="Optional — e.g., Jun 1, 2025"
          >
            <input
              type="text"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Jun 1, 2025"
            />
          </FormField>

          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Add Milestone
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
