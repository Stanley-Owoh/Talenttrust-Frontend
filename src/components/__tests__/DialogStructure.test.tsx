import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ConfirmDialog } from '../ConfirmDialog';
import { ContractCreationForm } from '../ContractCreationForm';
import { MilestoneCreationForm } from '../milestones/MilestoneCreationForm';
import { SettingsPanel } from '../settings/SettingsPanel';
import { PreferencesProvider } from '@/lib/preferences';
import { resetCache } from '@/lib/safeStorage';

type ControlStructure = {
  id: string;
  tag: string;
  type: string;
  value: string;
  text: string;
};

/**
 * Captures the stable, user-visible shape of a dialog without snapshotting
 * implementation-generated IDs, callback identities, or timestamps.
 */
function controlsIn(dialog: HTMLElement): ControlStructure[] {
  return Array.from(dialog.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>(
    'input, select, button',
  )).map((control) => ({
    id: control.id,
    tag: control.tagName.toLowerCase(),
    type: control instanceof HTMLButtonElement ? control.type : control.type,
    value: control.value,
    text: control.textContent?.trim() ?? '',
  }));
}

describe('dialog rendered structure', () => {
  describe('ConfirmDialog', () => {
    const props = {
      title: 'Release funds',
      description: 'This action cannot be undone.',
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
    };

    it('renders no output while closed', () => {
      const { container } = render(<ConfirmDialog {...props} isOpen={false} />);

      expect(container).toBeEmptyDOMElement();
      expect(container.firstChild).toMatchSnapshot();
    });

    it('renders the loaded confirmation structure with its backdrop, labels, and actions', () => {
      const { container } = render(<ConfirmDialog {...props} isOpen />);

      const dialog = screen.getByRole('dialog', { name: 'Release funds' });
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-describedby');
      expect(dialog.previousElementSibling).toHaveAttribute('aria-hidden', 'true');
      expect(controlsIn(dialog)).toEqual([
        { id: '', tag: 'button', type: 'button', value: '', text: 'Cancel' },
        { id: '', tag: 'button', type: 'button', value: '', text: 'Confirm' },
      ]);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('keeps destructive confirmations structurally equivalent while exposing alertdialog semantics', () => {
      const { container } = render(<ConfirmDialog {...props} isOpen tone="destructive" />);

      const dialog = screen.getByRole('alertdialog', { name: 'Release funds' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(within(dialog).getByText('This action cannot be undone.')).toBeInTheDocument();
      expect(controlsIn(dialog)).toHaveLength(2);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('ContractCreationForm', () => {
    const props = { onSubmit: jest.fn(), onCancel: jest.fn() };

    it('renders the empty creation form with its stable initial control structure', () => {
      const { container } = render(<ContractCreationForm {...props} />);

      const dialog = screen.getByRole('dialog', { name: 'Create New Contract' });
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(within(dialog).queryByRole('alert', { name: 'There is a problem' })).not.toBeInTheDocument();
      expect(controlsIn(dialog)).toEqual([
        { id: 'contractName', tag: 'input', type: 'text', value: '', text: '' },
        { id: 'totalValue', tag: 'input', type: 'text', value: '', text: '' },
        { id: 'currency', tag: 'select', type: 'select-one', value: 'USD', text: 'USDEURGBPXLM' },
        { id: 'party-label-0', tag: 'input', type: 'text', value: '', text: '' },
        { id: 'party-address-0', tag: 'input', type: 'text', value: '', text: '' },
        { id: 'party-label-1', tag: 'input', type: 'text', value: '', text: '' },
        { id: 'party-address-1', tag: 'input', type: 'text', value: '', text: '' },
        { id: '', tag: 'button', type: 'button', value: '', text: '+ Add Another Party' },
        { id: '', tag: 'button', type: 'button', value: '', text: 'Cancel' },
        { id: '', tag: 'button', type: 'submit', value: '', text: 'Create Contract' },
      ]);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('renders the loaded/populated state with user data', () => {
      const { container } = render(<ContractCreationForm {...props} />);

      const dialog = screen.getByRole('dialog', { name: 'Create New Contract' });
      fireEvent.change(within(dialog).getByLabelText(/contract name/i), { target: { value: 'Design System Escrow' } });
      fireEvent.change(within(dialog).getByLabelText(/total value/i), { target: { value: '5000' } });

      expect(controlsIn(dialog)).toEqual([
        { id: 'contractName', tag: 'input', type: 'text', value: 'Design System Escrow', text: '' },
        { id: 'totalValue', tag: 'input', type: 'text', value: '5000', text: '' },
        { id: 'currency', tag: 'select', type: 'select-one', value: 'USD', text: 'USDEURGBPXLM' },
        { id: 'party-label-0', tag: 'input', type: 'text', value: '', text: '' },
        { id: 'party-address-0', tag: 'input', type: 'text', value: '', text: '' },
        { id: 'party-label-1', tag: 'input', type: 'text', value: '', text: '' },
        { id: 'party-address-1', tag: 'input', type: 'text', value: '', text: '' },
        { id: '', tag: 'button', type: 'button', value: '', text: '+ Add Another Party' },
        { id: '', tag: 'button', type: 'button', value: '', text: 'Cancel' },
        { id: '', tag: 'button', type: 'submit', value: '', text: 'Create Contract' },
      ]);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('renders a deterministic error summary and inline errors for an invalid empty submission', () => {
      const { container } = render(<ContractCreationForm {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'Create Contract' }));

      const dialog = screen.getByRole('dialog');
      const summary = within(dialog).getByRole('alert', { name: 'There is a problem' });
      expect(Array.from(summary.querySelectorAll('a')).map((link) => ({
        href: link.getAttribute('href'),
        text: link.textContent,
      }))).toEqual([
        { href: '#contractName', text: 'Contract name is required' },
        { href: '#totalValue', text: 'Total value is required' },
        { href: '#parties', text: 'At least two parties are required' },
      ]);
      expect(Array.from(dialog.querySelectorAll('[aria-invalid="true"]')).map((field) => ({
        id: field.id,
        describedBy: field.getAttribute('aria-describedby'),
      }))).toEqual([
        { id: 'contractName', describedBy: 'contractName-error' },
        { id: 'totalValue', describedBy: 'totalValue-error' },
      ]);
      expect(dialog.querySelector('#parties-error')).toHaveTextContent('At least two parties are required');
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('MilestoneCreationForm', () => {
    const props = { onSubmit: jest.fn(), onCancel: jest.fn() };

    it('renders the empty creation form with its stable initial control structure', () => {
      const { container } = render(<MilestoneCreationForm {...props} />);

      const dialog = screen.getByRole('dialog', { name: 'Add Milestone' });
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(within(dialog).queryByRole('alert', { name: 'There is a problem' })).not.toBeInTheDocument();
      expect(controlsIn(dialog)).toEqual([
        { id: 'milestone-title', tag: 'input', type: 'text', value: '', text: '' },
        { id: 'milestone-payout', tag: 'input', type: 'text', value: '', text: '' },
        { id: 'milestone-currency', tag: 'select', type: 'select-one', value: 'USD', text: 'USDEURGBPXLM' },
        { id: 'milestone-status', tag: 'select', type: 'select-one', value: 'Pending', text: 'PendingActiveCompletedPaidDisputed' },
        { id: 'milestone-dueDate', tag: 'input', type: 'text', value: '', text: '' },
        { id: '', tag: 'button', type: 'button', value: '', text: 'Cancel' },
        { id: '', tag: 'button', type: 'submit', value: '', text: 'Add Milestone' },
      ]);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('renders the loaded/populated state with milestone data', () => {
      const { container } = render(<MilestoneCreationForm {...props} />);

      const dialog = screen.getByRole('dialog', { name: 'Add Milestone' });
      fireEvent.change(within(dialog).getByLabelText(/title/i), { target: { value: 'Initial Prototype' } });
      fireEvent.change(within(dialog).getByLabelText(/payout amount/i), { target: { value: '1500' } });

      expect(controlsIn(dialog)).toEqual([
        { id: 'milestone-title', tag: 'input', type: 'text', value: 'Initial Prototype', text: '' },
        { id: 'milestone-payout', tag: 'input', type: 'text', value: '1500', text: '' },
        { id: 'milestone-currency', tag: 'select', type: 'select-one', value: 'USD', text: 'USDEURGBPXLM' },
        { id: 'milestone-status', tag: 'select', type: 'select-one', value: 'Pending', text: 'PendingActiveCompletedPaidDisputed' },
        { id: 'milestone-dueDate', tag: 'input', type: 'text', value: '', text: '' },
        { id: '', tag: 'button', type: 'button', value: '', text: 'Cancel' },
        { id: '', tag: 'button', type: 'submit', value: '', text: 'Add Milestone' },
      ]);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('renders a deterministic error summary and inline errors for an invalid empty submission', () => {
      const { container } = render(<MilestoneCreationForm {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'Add Milestone' }));

      const dialog = screen.getByRole('dialog');
      const summary = within(dialog).getByRole('alert', { name: 'There is a problem' });
      expect(Array.from(summary.querySelectorAll('a')).map((link) => ({
        href: link.getAttribute('href'),
        text: link.textContent,
      }))).toEqual([
        { href: '#milestone-title', text: 'Title is required' },
        { href: '#milestone-payout', text: 'Payout amount is required' },
      ]);
      expect(Array.from(dialog.querySelectorAll('[aria-invalid="true"]')).map((field) => ({
        id: field.id,
        describedBy: field.getAttribute('aria-describedby'),
      }))).toEqual([
        { id: 'milestone-title', describedBy: 'milestone-title-error' },
        { id: 'milestone-payout', describedBy: 'milestone-payout-error' },
      ]);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('SettingsPanel', () => {
    beforeEach(() => {
      localStorage.clear();
      resetCache();
    });

    it('renders no output while closed', () => {
      const { container } = render(
        <PreferencesProvider>
          <SettingsPanel isOpen={false} onClose={jest.fn()} />
        </PreferencesProvider>
      );

      expect(container.firstChild).toBeNull();
      expect(container.firstChild).toMatchSnapshot();
    });

    it('renders the loaded settings dialog structure when open', () => {
      const { container } = render(
        <PreferencesProvider>
          <SettingsPanel isOpen={true} onClose={jest.fn()} />
        </PreferencesProvider>
      );

      const dialog = screen.getByRole('dialog', { name: 'Settings' });
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(controlsIn(dialog).length).toBeGreaterThan(0);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});

