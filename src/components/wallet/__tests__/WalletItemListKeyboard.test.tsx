import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { WalletItemList } from '../WalletItemList';
import type { WalletItem } from '@/types/domain';

const ITEMS: WalletItem[] = [
  {
    id: 'w-1',
    name: 'Stellar Lumens (XLM)',
    type: 'Native Asset',
    balance: 12500,
    currency: 'XLM',
    address: 'GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H',
    status: 'Active',
    createdAt: '2026-01-15',
  },
  {
    id: 'w-2',
    name: 'USD Coin (USDC)',
    type: 'Stablecoin',
    balance: 3200,
    currency: 'USDC',
    address: 'GA2C456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
    status: 'Pending',
    createdAt: '2026-02-01',
  },
  {
    id: 'w-3',
    name: 'Archived Client Token',
    type: 'Custom Asset',
    balance: 50,
    currency: 'ACT',
    status: 'Archived',
    createdAt: '2025-11-20',
  },
];

describe('WalletItemList — keyboard operation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('select-all checkbox is first in tab order within the table', async () => {
    const user = userEvent.setup();
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    await user.tab();
    expect(screen.getByTestId('select-all-checkbox')).toHaveFocus();
  });

  it('tabs through row checkboxes in order', async () => {
    const user = userEvent.setup();
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    await user.tab();
    expect(screen.getByTestId('select-all-checkbox')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('select-item-checkbox-w-1')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('select-item-checkbox-w-2')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('select-item-checkbox-w-3')).toHaveFocus();
  });

  it('Space key toggles individual selection checkbox', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={onToggle}
        onToggleSelectAll={jest.fn()}
      />
    );

    const checkbox = screen.getByTestId('select-item-checkbox-w-1');
    checkbox.focus();
    await user.keyboard('[Space]');

    expect(onToggle).toHaveBeenCalledWith('w-1');
  });

  it('Enter key on a checkbox does not toggle (Enter submits forms, not toggles checkboxes)', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={onToggle}
        onToggleSelectAll={jest.fn()}
      />
    );

    const checkbox = screen.getByTestId('select-item-checkbox-w-1');
    checkbox.focus();
    await user.keyboard('{Enter}');

    // Enter does not toggle checkbox; only Space does
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('Space key activates select-all checkbox', async () => {
    const onToggleSelectAll = jest.fn();
    const user = userEvent.setup();
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={onToggleSelectAll}
      />
    );

    const selectAll = screen.getByTestId('select-all-checkbox');
    selectAll.focus();
    await user.keyboard('[Space]');

    expect(onToggleSelectAll).toHaveBeenCalledTimes(1);
  });

  it('tabs to delete button when delete handler is provided', async () => {
    const user = userEvent.setup();
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
        onDeleteItem={jest.fn()}
      />
    );

    // tab through select-all, row 1 checkbox, row 1 delete, row 2 checkbox, row 2 delete, row 3 checkbox, row 3 delete
    await user.tab();
    await user.tab();
    await user.tab();

    expect(screen.getByRole('button', { name: 'Delete Stellar Lumens (XLM)' })).toHaveFocus();
  });

  it('Enter key activates delete button', async () => {
    const onDelete = jest.fn();
    const user = userEvent.setup();
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
        onDeleteItem={onDelete}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: 'Delete Stellar Lumens (XLM)' });
    deleteBtn.focus();
    await user.keyboard('{Enter}');

    expect(onDelete).toHaveBeenCalledWith('w-1');
  });

  it('Space key activates delete button', async () => {
    const onDelete = jest.fn();
    const user = userEvent.setup();
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
        onDeleteItem={onDelete}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: 'Delete Stellar Lumens (XLM)' });
    deleteBtn.focus();
    await user.keyboard('[Space]');

    expect(onDelete).toHaveBeenCalledWith('w-1');
  });

  it('row has focus-within class for visible focus tracking', () => {
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    const row = screen.getByTestId('wallet-item-row-w-1');
    expect(row.className).toContain('focus-within:bg-slate-100/80');
  });

  it('focus-within style is applied to dark mode variant', () => {
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    const row = screen.getByTestId('wallet-item-row-w-1');
    expect(row.className).toContain('dark:focus-within:bg-slate-800/60');
  });

  describe('focus ring styles', () => {
    it('select-all checkbox has focus ring classes', () => {
      render(
        <WalletItemList
          items={ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />
      );

      const selectAll = screen.getByTestId('select-all-checkbox');
      expect(selectAll.className).toMatch(/focus:ring-2/);
      expect(selectAll.className).toMatch(/focus:ring-blue-500/);
    });

    it('item checkbox has focus ring classes', () => {
      render(
        <WalletItemList
          items={ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />
      );

      const checkbox = screen.getByTestId('select-item-checkbox-w-1');
      expect(checkbox.className).toMatch(/focus:ring-2/);
      expect(checkbox.className).toMatch(/focus:ring-blue-500/);
    });

    it('delete button has focus ring classes', () => {
      render(
        <WalletItemList
          items={ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
          onDeleteItem={jest.fn()}
        />
      );

      const deleteBtn = screen.getByRole('button', { name: 'Delete Stellar Lumens (XLM)' });
      expect(deleteBtn.className).toMatch(/focus:ring-2/);
      expect(deleteBtn.className).toMatch(/focus:ring-rose-500/);
    });
  });

  describe('logical focus order', () => {
    it('focus order follows table column-major DOM order: select-all, row checkboxes, then row delete buttons', () => {
      render(
        <WalletItemList
          items={ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
          onDeleteItem={jest.fn()}
        />
      );

      // In a table, focusable elements follow DOM order which is column-major:
      // all checkboxes first (from thead + tbody), then all delete buttons
      const allCheckboxes = screen.getAllByRole('checkbox');
      const allButtons = screen.getAllByRole('button');
      const focusableOrder = [...allCheckboxes, ...allButtons];

      const actualLabels = focusableOrder
        .filter(el => el.getAttribute('aria-label'))
        .map(el => el.getAttribute('aria-label'));

      const expectedLabels = [
        'Select all wallet items',
        'Select Stellar Lumens (XLM)',
        'Select USD Coin (USDC)',
        'Select Archived Client Token',
        'Delete Stellar Lumens (XLM)',
        'Delete USD Coin (USDC)',
        'Delete Archived Client Token',
      ];

      expect(actualLabels).toEqual(expectedLabels);
    });
  });

  describe('empty state', () => {
    it('renders nothing when items array is empty', () => {
      const { container } = render(
        <WalletItemList
          items={[]}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });
});
