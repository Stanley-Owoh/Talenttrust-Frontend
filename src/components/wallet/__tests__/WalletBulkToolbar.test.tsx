import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WalletBulkToolbar } from '../WalletBulkToolbar';

describe('WalletBulkToolbar', () => {
  const defaultProps = {
    selectedCount: 2,
    onClearSelection: jest.fn(),
    onExport: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when selectedCount is 0', () => {
    const { container } = render(<WalletBulkToolbar {...defaultProps} selectedCount={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders toolbar with correct count for 1 selected item', () => {
    render(<WalletBulkToolbar {...defaultProps} selectedCount={1} />);
    expect(screen.getByTestId('wallet-bulk-toolbar')).toBeInTheDocument();
    expect(screen.getByText('1 item selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export 1 selected item/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete 1 selected item/i })).toBeInTheDocument();
  });

  it('renders toolbar with correct count for multiple selected items', () => {
    render(<WalletBulkToolbar {...defaultProps} selectedCount={3} />);
    expect(screen.getByText('3 items selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export 3 selected items/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete 3 selected items/i })).toBeInTheDocument();
  });

  it('calls onClearSelection when Clear selection button is clicked', () => {
    render(<WalletBulkToolbar {...defaultProps} />);
    const clearBtn = screen.getByRole('button', { name: /clear item selection/i });
    fireEvent.click(clearBtn);
    expect(defaultProps.onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('calls onExport when Export button is clicked', () => {
    render(<WalletBulkToolbar {...defaultProps} />);
    const exportBtn = screen.getByRole('button', { name: /export 2 selected items/i });
    fireEvent.click(exportBtn);
    expect(defaultProps.onExport).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when Delete button is clicked', () => {
    render(<WalletBulkToolbar {...defaultProps} />);
    const deleteBtn = screen.getByRole('button', { name: /delete 2 selected items/i });
    fireEvent.click(deleteBtn);
    expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
  });

  it('clears selection when Escape key is pressed', () => {
    render(<WalletBulkToolbar {...defaultProps} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClearSelection).toHaveBeenCalledTimes(1);
  });
});
