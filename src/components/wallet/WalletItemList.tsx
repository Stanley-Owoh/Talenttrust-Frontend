'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import type { WalletItem } from '@/types/domain';
import EditableWalletRow from './EditableWalletRow';

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
  /** The ID of the item currently being edited, or null */
  editingId?: string | null;
  /** Callback fired when an item enters edit mode */
  onEditItem?: (id: string) => void;
  /** Callback fired when an edit is saved */
  onSaveEdit?: (id: string, updated: WalletItem) => void;
  /** Callback fired when editing is cancelled */
  onCancelEdit?: (id: string) => void;
}

export const WalletItemList: React.FC<WalletItemListProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDeleteItem,
  editingId,
  onEditItem,
  onSaveEdit,
  onCancelEdit,
}) => {
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const handleDelete = useCallback((id: string) => {
    onDeleteItem?.(id);
  }, [onDeleteItem]);

  const hasDelete = typeof onDeleteItem === 'function';

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < items.length;

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
            const isEditing = editingId === item.id;

            const editProps = {
              item,
              selected: isSelected,
              onToggleSelect,
              onEdit: onEditItem ?? (() => {}),
              onSave: onSaveEdit ?? (() => {}),
              onCancel: onCancelEdit ?? (() => {}),
              onDelete: hasDelete ? handleDelete : undefined,
            };

            if (isEditing && onSaveEdit && onCancelEdit && onEditItem) {
              return (
                <EditableWalletRow
                  key={item.id}
                  editing
                  {...editProps}
                />
              );
            }

            return (
              <EditableWalletRow
                key={item.id}
                editing={false}
                {...editProps}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default WalletItemList;
