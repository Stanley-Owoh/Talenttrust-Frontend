import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  MAX_MILESTONE_TITLE_LENGTH,
  MilestoneCreationForm,
} from './MilestoneCreationForm';

describe('MilestoneCreationForm', () => {
  const onSubmit = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('matches the empty-state form structure', () => {
    const { container } = render(<MilestoneCreationForm onSubmit={onSubmit} onCancel={onCancel} />);

    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches the loaded-state form structure with user-entered values', () => {
    const { container } = render(<MilestoneCreationForm onSubmit={onSubmit} onCancel={onCancel} />);

    fireEvent.change(screen.getByLabelText(/^title/i), {
      target: { value: 'Frontend Sprint' },
    });
    fireEvent.change(screen.getByLabelText(/payout amount/i), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText(/currency/i), { target: { value: 'XLM' } });
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'Active' } });
    fireEvent.change(screen.getByLabelText(/due date/i), {
      target: { value: 'Jun 1, 2025' },
    });

    expect(container.firstChild).toMatchSnapshot();
  });

  it('normalizes a title before submitting the milestone', async () => {
    render(<MilestoneCreationForm onSubmit={onSubmit} onCancel={onCancel} />);

    fireEvent.change(screen.getByLabelText(/^title/i), {
      target: { value: '  Design\u0000\n  review  ' },
    });
    fireEvent.change(screen.getByLabelText(/payout amount/i), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /add milestone/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].title).toBe('Design review');
  });

  it('rejects an over-length title instead of truncating it', async () => {
    render(<MilestoneCreationForm onSubmit={onSubmit} onCancel={onCancel} />);

    fireEvent.change(screen.getByLabelText(/^title/i), {
      target: { value: 'a'.repeat(MAX_MILESTONE_TITLE_LENGTH + 1) },
    });
    fireEvent.change(screen.getByLabelText(/payout amount/i), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /add milestone/i }));

    await waitFor(() => {
      expect(screen.getAllByText(
        `Title must be no more than ${MAX_MILESTONE_TITLE_LENGTH} characters`,
      )[0]).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
