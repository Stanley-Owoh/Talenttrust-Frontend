import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Delete"
        description="Remove this item?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the dialog content and calls handlers', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete contract"
        description="Do you want to continue?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete contract')).toBeInTheDocument();
    expect(screen.getByText('Do you want to continue?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Yes' }));
    await user.click(screen.getByRole('button', { name: 'No' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('assigns role="dialog" by default and role="alertdialog" when tone="destructive"', () => {
    const { rerender } = render(
      <ConfirmDialog
        isOpen={true}
        title="Default action"
        description="Are you sure?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(
      <ConfirmDialog
        isOpen={true}
        title="Destructive action"
        description="This cannot be undone!"
        tone="destructive"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('matches aria-labelledby and aria-describedby exactly with generated title and description IDs', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Accessible Title"
        description="Accessible Description"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');
    const titleEl = screen.getByText('Accessible Title');
    const descEl = screen.getByText('Accessible Description');

    const titleId = titleEl.getAttribute('id');
    const descId = descEl.getAttribute('id');

    expect(titleId).toBeTruthy();
    expect(descId).toBeTruthy();
    expect(dialog).toHaveAttribute('aria-labelledby', titleId!);
    expect(dialog).toHaveAttribute('aria-describedby', descId!);
  });

  it('has aria-modal="true" attribute present', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Modal Dialog"
        description="Should be modal"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('restricts and restores background content with aria-hidden and inert when open/closed', () => {
    const { rerender, container } = render(
      <div>
        <main id="main-content">
          <h1>Main Content</h1>
        </main>
        <ConfirmDialog
          isOpen={true}
          title="Restricted Dialog"
          description="Background should be hidden"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      </div>
    );

    const mainElement = container.querySelector('#main-content');
    expect(mainElement).toHaveAttribute('aria-hidden', 'true');
    expect(mainElement).toHaveAttribute('inert');

    rerender(
      <div>
        <main id="main-content">
          <h1>Main Content</h1>
        </main>
        <ConfirmDialog
          isOpen={false}
          title="Restricted Dialog"
          description="Background should be hidden"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      </div>
    );

    expect(mainElement).not.toHaveAttribute('aria-hidden');
    expect(mainElement).not.toHaveAttribute('inert');
  });

  it('triggers cancel when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Discard"
        description="Lose your changes?"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('wraps focus when tabbing past the last focusable element', async () => {
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Wrap focus"
        description="Keep focus inside the dialog"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons[1].focus();
    await user.tab();

    expect(buttons[0]).toHaveFocus();
  });

  it('wraps focus backwards when shift+tab reaches the first focusable element', async () => {
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Wrap focus backwards"
        description="Keep focus inside the dialog"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons[0].focus();
    await user.tab({ shift: true });

    expect(buttons[1]).toHaveFocus();
  });

  it('renders loading state and disables buttons', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Loading"
        description="Please wait"
        isLoading={true}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: 'Loading...' });
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });

    expect(confirmBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
  });

  it('renders empty state message and disables confirm button', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Empty"
        description="Normal description"
        isEmpty={true}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByText('No data available.')).toBeInTheDocument();
    expect(screen.queryByText('Normal description')).not.toBeInTheDocument();
    
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn).toBeDisabled();
  });

  it('renders error message and keeps confirm button enabled', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Error"
        description="Normal description"
        error="Something went wrong"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveTextContent('Something went wrong');
    
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('renders success state message and disables confirm button', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Success"
        description="Normal description"
        isSuccess={true}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const successStatus = screen.getByRole('status');
    expect(successStatus).toHaveTextContent('Action successful.');
    expect(screen.queryByText('Normal description')).not.toBeInTheDocument();
    
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn).toBeDisabled();
  });
});
