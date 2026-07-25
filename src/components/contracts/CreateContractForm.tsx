'use client';

import React, { useState, useCallback } from 'react';
import { FormField } from '@/components/FormField';
import { ErrorSummary } from '@/components/ErrorSummary';
import { WalletAddressInput } from '@/components/WalletAddressInput';
import { useToast } from '@/components/toast/toast-provider';
import { saveContract } from '@/lib/repository';
import { normalizeStellarAddress } from '@/lib/stellarAddress';
import { validateContract } from '@/lib/validateContract';
import type { ValidationError } from '@/lib/validateLogin';
import type { Contract } from '@/types/domain';

/**
 * Props for the `CreateContractForm` component.
 */
export interface CreateContractFormProps {
  /**
   * Called with the newly constructed and persisted `Contract` object
   * immediately after a successful form submission.
   * The parent is responsible for updating its own state (e.g. re-reading
   * from localStorage) and dismissing the form.
   */
  onSuccess: (contract: Contract) => void;
  /**
   * Called when the user presses the Cancel button without submitting.
   * The parent is responsible for hiding the form.
   */
  onCancel: () => void;
}

/** Supported currency options presented in the currency selector. */
const CURRENCY_OPTIONS = ['USD', 'XLM', 'EUR', 'GBP'] as const;

/**
 * `CreateContractForm` — an accessible, validated inline form for creating
 * a new TalentTrust escrow contract.
 *
 * Accessibility contract:
 * - The form is labelled by a visible `<h2>` via `aria-labelledby`.
 * - Every field is wrapped in `FormField`, which wires `<label>`,
 *   `aria-invalid`, and `aria-describedby` automatically.
 * - On validation failure, `ErrorSummary` is rendered and auto-focused
 *   via its own internal `useEffect`, moving screen reader focus to the
 *   error digest without an explicit `ref` here.
 * - Success is communicated through a polite `useToast` notification;
 *   no `alert()` is used.
 */
const CreateContractForm: React.FC<CreateContractFormProps> = ({ onSuccess, onCancel }) => {
  const { showSuccess } = useToast();

  const [contractName, setContractName] = useState('');
  const [freelancerAddress, setFreelancerAddress] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [currency, setCurrency] = useState<string>(CURRENCY_OPTIONS[0]);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  /**
   * Called by WalletAddressInput on blur to update the parent's errors
   * state so ErrorSummary stays in sync with the inline error.
   */
  const handleWalletValidation = useCallback(
    (fieldId: string, error: string | null) => {
      setErrors((prev) => {
        const filtered = prev.filter((e) => e.fieldId !== fieldId);
        if (error) {
          return [...filtered, { fieldId, message: error }];
        }
        return filtered;
      });
    },
    []
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validateContract({
      contractName,
      freelancerAddress,
      totalValue,
      currency,
    });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Clear any previous errors before persisting.
    setErrors([]);

    const contract: Contract = {
      contractName: contractName.trim(),
      parties: [
        { label: 'Client', address: 'TalentTrust Client' },
        { label: 'Freelancer', address: normalizeStellarAddress(freelancerAddress) },
      ],
      totalValue: parseFloat(totalValue),
      currency,
      status: 'Pending',
      createdAt: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      milestoneCount: 0,
    };

    saveContract(contract);
    showSuccess({ title: 'Contract created', description: `"${contract.contractName}" has been saved.` });
    onSuccess(contract);
  };

  const inputClass =
    'w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition';

  return (
    <section
      aria-labelledby="create-contract-heading"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2
        id="create-contract-heading"
        className="text-xl font-semibold text-slate-900 mb-6"
      >
        Create a new contract
      </h2>

      <ErrorSummary errors={errors} />

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="contractName"
          label="Contract name"
          error={errors.find((e) => e.fieldId === 'contractName')?.message}
          required
        >
          <input
            type="text"
            value={contractName}
            onChange={(e) => setContractName(e.target.value)}
            placeholder="e.g. Website Redesign"
            autoComplete="off"
            className={inputClass}
          />
        </FormField>

        <WalletAddressInput
          id="freelancerAddress"
          label="Freelancer Stellar address"
          helperText="Must be a valid Stellar public key starting with G"
          value={freelancerAddress}
          onChange={setFreelancerAddress}
          error={errors.find((e) => e.fieldId === 'freelancerAddress')?.message}
          required
          onValidation={handleWalletValidation}
        />

        <FormField
          id="totalValue"
          label="Total value"
          error={errors.find((e) => e.fieldId === 'totalValue')?.message}
          required
        >
          <input
            type="number"
            value={totalValue}
            onChange={(e) => setTotalValue(e.target.value)}
            placeholder="0.00"
            min="0.01"
            step="any"
            className={inputClass}
          />
        </FormField>

        <FormField
          id="currency"
          label="Currency"
          error={errors.find((e) => e.fieldId === 'currency')?.message}
          required
        >
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={inputClass}
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FormField>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="rounded-2xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            Create Contract
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-400 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
};

export default CreateContractForm;
