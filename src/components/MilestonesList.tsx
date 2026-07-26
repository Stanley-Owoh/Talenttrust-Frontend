import { useState, useRef, useEffect, useCallback } from 'react';
import StatusBadge, { StatusType, statusColorMap, statusIconMap } from './StatusBadge';
import { usePreferences } from '@/lib/preferences';
import { isDueSoon } from '@/lib/dueSoon';
import { findCurrencyMismatches, normalizeCurrencyCode } from '@/lib/currencyMismatch';
import { milestoneStatusTally } from '@/lib/milestoneStatusTally';
import { BulkActionToolbar } from './milestones/BulkActionToolbar';
import { ConfirmDialog } from './ConfirmDialog';

export type Milestone = {
  id: string;
  title: string;
  status: StatusType;
  payout: number;
  currency: string;
  dueDate?: string;
  contractId?: string;
};

export type MilestonesListProps = {
  milestones: Milestone[];
  contractCurrency?: string;
  onBulkDelete?: (ids: string[]) => number;
  onBulkStatusUpdate?: (ids: string[], status: StatusType) => number;
  onBulkExport?: (milestones: Milestone[]) => void;
  onSelectionChange?: (ids: string[]) => void;
};

export const REMINDER_WINDOW_DAYS = 7;

type SelectionState = Set<string>;

const MilestonesList = ({
  milestones,
  contractCurrency,
  onBulkDelete,
  onBulkStatusUpdate,
  onBulkExport,
  onSelectionChange,
}: MilestonesListProps) => {
  const { formatAmount } = usePreferences();
  const [isDismissed, setIsDismissed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<SelectionState>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const listContainerRef = useRef<HTMLDivElement>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);

  const today = new Date();

  const mismatchedMilestoneIds = contractCurrency
    ? new Set(findCurrencyMismatches(contractCurrency, milestones))
    : new Set<string>();

  const mismatchedMilestones = milestones.filter((milestone) =>
    mismatchedMilestoneIds.has(milestone.id),
  );

  const mismatchCurrencies = Array.from(
    new Set(mismatchedMilestones.map((milestone) => normalizeCurrencyCode(milestone.currency))),
  ).sort();

  const normalizedContractCurrency = contractCurrency
    ? normalizeCurrencyCode(contractCurrency)
    : undefined;

  const tallies = milestoneStatusTally(milestones);

  const dueSoonMilestones = milestones.filter(
    (m) =>
      m.status !== 'Paid' &&
      m.status !== 'Completed' &&
      isDueSoon(m.dueDate, today, REMINDER_WINDOW_DAYS)
  );

  const showBanner = dueSoonMilestones.length > 0 && !isDismissed;
  const selectedCount = selectedIds.size;
  const totalCount = milestones.length;
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const someSelected = selectedCount > 0 && selectedCount < totalCount;

  useEffect(() => {
    const checkbox = selectAllCheckboxRef.current;
    if (checkbox) {
      checkbox.indeterminate = someSelected;
    }
  }, [someSelected]);

  useEffect(() => {
    onSelectionChange?.(Array.from(selectedIds));
  }, [selectedIds, onSelectionChange]);

  const announce = useCallback((message: string) => {
    setAnnouncement('');
    const frame = requestAnimationFrame(() => {
      setAnnouncement(message);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    listContainerRef.current?.focus();
  };

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const wasSelected = next.has(id);
      if (wasSelected) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = milestones.map((m) => m.id);
      setSelectedIds(new Set(allIds));
      announce(`${allIds.length} items selected`);
    } else {
      setSelectedIds(new Set());
      announce('Selection cleared');
    }
  };

  const handleItemCheckboxChange = (id: string) => {
    const wasSelected = selectedIds.has(id);
    toggleSelection(id);
    const milestone = milestones.find((m) => m.id === id);
    if (milestone) {
      announce(
        wasSelected
          ? `${milestone.title} deselected`
          : `${milestone.title} selected`
      );
    }
  };

  const handleItemKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleItemCheckboxChange(id);
    }
  };

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    announce('Selection cleared');
  }, [announce]);

  const getSelectedMilestones = useCallback(() => {
    return milestones.filter((m) => selectedIds.has(m.id));
  }, [milestones, selectedIds]);

  const getSelectedIdsArray = useCallback(() => {
    return Array.from(selectedIds);
  }, [selectedIds]);

  const handleExport = useCallback(() => {
    const selected = getSelectedMilestones();
    if (onBulkExport) {
      onBulkExport(selected);
    }
    announce(
      `${selected.length} ${selected.length === 1 ? 'milestone' : 'milestones'} exported`
    );
  }, [getSelectedMilestones, onBulkExport, announce]);

  const handleStatusUpdate = useCallback((status: StatusType) => {
    const ids = getSelectedIdsArray();
    const changed = onBulkStatusUpdate ? onBulkStatusUpdate(ids, status) : ids.length;
    setSelectedIds(new Set());
    announce(
      `${changed} ${changed === 1 ? 'milestone status' : 'milestone statuses'} updated to ${status}`
    );
  }, [getSelectedIdsArray, onBulkStatusUpdate, announce]);

  const handleDeleteRequest = () => {
    deleteTriggerRef.current =
      document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = useCallback(() => {
    const ids = getSelectedIdsArray();
    const removed = onBulkDelete ? onBulkDelete(ids) : ids.length;
    setDeleteDialogOpen(false);
    setSelectedIds(new Set());
    announce(
      `${removed} ${removed === 1 ? 'milestone' : 'milestones'} successfully deleted`
    );
    deleteTriggerRef.current?.focus();
  }, [getSelectedIdsArray, onBulkDelete, announce]);

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    deleteTriggerRef.current?.focus();
  };

  return (
    <section aria-labelledby="milestones-title" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 id="milestones-title" className="text-xl font-semibold text-slate-900">
          Milestones
        </h2>
        <span id="milestones-count" className="text-sm text-slate-500">{milestones.length} total</span>
      </div>

      <div
        role="status"
        aria-label="Milestone selection announcements"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {tallies.length > 0 && (
        <div
          role="list"
          aria-label="Milestone status summary"
          className="mt-4 flex flex-wrap gap-2"
        >
          {tallies.map(({ status, count }) => (
            <span
              key={status}
              role="listitem"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusColorMap[status]}`}
            >
              <span aria-hidden="true">{statusIconMap[status]}</span>
              {status}
              <span className="ml-0.5 rounded-full bg-white/40 px-1.5 py-0.5 text-[10px] font-bold leading-none">
                {count}
              </span>
            </span>
          ))}
        </div>
      )}

      {normalizedContractCurrency && mismatchedMilestones.length > 0 ? (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
        >
          <p className="font-semibold">
            {mismatchedMilestones.length}{' '}
            {mismatchedMilestones.length === 1 ? 'milestone uses' : 'milestones use'}{' '}
            {mismatchCurrencies.join(', ')} instead of {normalizedContractCurrency}.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {mismatchedMilestones.map((milestone) => (
              <li key={milestone.id}>
                {milestone.title}: {formatAmount(milestone.payout, milestone.currency)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showBanner && (
        <div
          role="status"
          className="mt-6 flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50/50 p-4 text-amber-900 shadow-sm backdrop-blur-sm dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-200"
        >
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {dueSoonMilestones.length} {dueSoonMilestones.length === 1 ? 'milestone is' : 'milestones are'} due within {REMINDER_WINDOW_DAYS} days
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-amber-800 dark:text-amber-300">
              {dueSoonMilestones.map((m, idx) => (
                <li key={m.id} className="flex items-center gap-1.5">
                  {idx > 0 && <span className="text-amber-400 select-none" aria-hidden="true">•</span>}
                  <a
                    href={`#milestone-${m.id}`}
                    className="font-medium underline hover:text-amber-950 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 rounded"
                  >
                    {m.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss reminder"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-amber-600 hover:bg-amber-100 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 dark:text-amber-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-200 transition-colors"
          >
            <span aria-hidden="true" className="text-lg leading-none">&times;</span>
          </button>
        </div>
      )}

      {milestones.length > 0 && (
        <div
          role="group"
          aria-label="Milestone selection controls"
          className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
        >
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <input
              ref={selectAllCheckboxRef}
              type="checkbox"
              aria-label={
                someSelected
                  ? 'Deselect all milestones (partial selection)'
                  : allSelected
                  ? 'Deselect all milestones'
                  : 'Select all milestones'
              }
              aria-checked={someSelected ? 'mixed' : allSelected}
              checked={allSelected}
              onChange={handleSelectAllChange}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
            <span className="text-sm font-medium text-slate-700">
              {allSelected ? 'Deselect All' : 'Select All'}
            </span>
          </label>
          <span className="text-xs text-slate-500" aria-hidden="true">
            {selectedCount > 0 ? `${selectedCount} selected` : 'Use checkboxes to select milestones for bulk actions'}
          </span>
        </div>
      )}

      <BulkActionToolbar
        selectedCount={selectedCount}
        totalCount={totalCount}
        onClearSelection={handleClearSelection}
        onExport={handleExport}
        onStatusUpdate={handleStatusUpdate}
        onDelete={handleDeleteRequest}
      />

      <div
        ref={listContainerRef}
        role={milestones.length > 0 ? 'region' : undefined}
        aria-labelledby={milestones.length > 0 ? 'milestones-title milestones-count' : undefined}
        tabIndex={milestones.length > 0 ? 0 : undefined}
        className="mt-6 space-y-4 max-h-[calc(100vh-260px)] overflow-y-auto pr-2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
      >
        {milestones.map((milestone) => {
          const isSelected = selectedIds.has(milestone.id);
          const checkboxId = `select-milestone-${milestone.id}`;
          const titleId = `milestone-title-${milestone.id}`;
          return (
            <article
              key={milestone.id}
              id={`milestone-${milestone.id}`}
              aria-labelledby={titleId}
              data-selected={isSelected ? 'true' : 'false'}
              className={`rounded-3xl border p-4 shadow-sm transition-colors ${
                isSelected
                  ? 'border-blue-400 bg-blue-50/50 ring-2 ring-blue-200'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <label
                    htmlFor={checkboxId}
                    className="sr-only"
                  >
                    Select milestone: {milestone.title}
                  </label>
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleItemCheckboxChange(milestone.id)}
                    onKeyDown={(e) => handleItemKeyDown(e, milestone.id)}
                    aria-label={isSelected ? `Deselect ${milestone.title}` : `Select ${milestone.title}`}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  />
                  <div>
                    <p id={titleId} className="text-sm font-medium text-slate-600">{milestone.title}</p>
                    <p className="mt-1 text-sm text-slate-500">Due {milestone.dueDate ?? 'TBD'}</p>
                  </div>
                </div>
                <StatusBadge status={milestone.status} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-200 pt-4 text-sm text-slate-600">
                <p>Payout</p>
                <p className="font-semibold text-slate-900">
                  {formatAmount(milestone.payout, milestone.currency)}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title={`Delete ${selectedCount} ${selectedCount === 1 ? 'Milestone' : 'Milestones'}?`}
        description={`You are about to permanently delete ${selectedCount} ${selectedCount === 1 ? 'milestone' : 'milestones'}. This action cannot be undone. Are you sure you want to continue?`}
        confirmLabel={`Delete ${selectedCount} ${selectedCount === 1 ? 'Item' : 'Items'}`}
        cancelLabel="Cancel"
        tone="destructive"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </section>
  );
};

export default MilestonesList;
