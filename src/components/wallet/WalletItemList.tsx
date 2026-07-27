'use client';

import React, { useEffect, useRef } from 'react';
import type { WalletItem } from '@/types/domain';

export interface WalletItemListProps {
  /** Array of wallet items to render */
  items: WalletItem[];
  /** Set of currently selected item IDs */
  selectedIds: Set<string>;
  /** Callback fired when an item's selection status is toggled */
  onToggleSelect: (id: string) => void;
  /** Callback fired when Select All / Deselect All checkbox is clicked */
  onToggleSelectAll: () => void;
  /** Single item delete handler */
  onDeleteItem?: (id: string) => void;
}

export const WalletItemList: React.FC<WalletItemListProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDeleteItem,
}) => {
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  // Set indeterminate state on select-all checkbox
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="w-full overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" data-wallet-table>
      <table className="w-full text-left text-sm" aria-label="Wallet items table">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
          <tr>
            <th scope="col" className="w-12 px-4 py-3 text-center">
              <input
                ref={selectAllCheckboxRef}
                type="checkbox"
                checked={isAllSelected}
                onChange={onToggleSelectAll}
                aria-label={isAllSelected ? 'Deselect all wallet items' : 'Select all wallet items'}
                data-testid="select-all-checkbox"
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </th>
            <th scope="col" className="px-4 py-3">Item</th>
            <th scope="col" className="px-4 py-3">Type</th>
            <th scope="col" className="px-4 py-3">Balance</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3">Created</th>
            <th scope="col" className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id);

            return (
              <tr
                key={item.id}
                data-testid={`wallet-item-row-${item.id}`}
                data-selected={isSelected || undefined}
                className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                  isSelected ? 'bg-blue-50/40 dark:bg-slate-800/60' : ''
                }`}
              >
                <td className="w-12 px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(item.id)}
                    aria-label={`Select ${item.name}`}
                    data-testid={`select-item-checkbox-${item.id}`}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                </td>
                <td className="px-4 py-4 font-semibold text-slate-900 dark:text-slate-100">
                  {item.name}
                  {item.address && (
                    <span className="block font-mono text-xs text-slate-400 truncate max-w-[160px]">
                      {item.address}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{item.type}</td>
                <td className="px-4 py-4 font-medium text-slate-900 dark:text-slate-100">
                  {item.balance.toLocaleString()} {item.currency}
                </td>
                <td className="px-4 py-4">
                  <span
                    data-wallet-status={item.status}
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      item.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : item.status === 'Pending'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">{item.createdAt}</td>
                <td className="px-4 py-4 text-right">
                  {onDeleteItem && (
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:hover:bg-rose-950/50"
                      aria-label={`Delete ${item.name}`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default WalletItemList;
