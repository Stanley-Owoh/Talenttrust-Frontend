import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MilestoneTimestamp } from '../MilestoneTimestamp';

jest.mock('@/lib/relativeTime', () => ({
  formatRelativeTime: jest.fn(),
  INVALID_DATE_FALLBACK: '—',
}));

import { formatRelativeTime } from '@/lib/relativeTime';

describe('MilestoneTimestamp', () => {
  const mockDate = new Date('2024-01-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the relative time', () => {
    (formatRelativeTime as jest.Mock).mockReturnValue('5 minutes ago');
    render(<MilestoneTimestamp date={mockDate} />);
    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });

  it('updates the timestamp every minute', () => {
    // The component calls formatRelativeTime:
    // 1. once in the useState initializer
    // 2. once in the useEffect on mount
    // 3. once more when the interval fires
    (formatRelativeTime as jest.Mock)
      .mockReturnValueOnce('5 minutes ago') // useState initializer
      .mockReturnValueOnce('5 minutes ago') // useEffect on mount
      .mockReturnValueOnce('6 minutes ago'); // interval tick

    render(<MilestoneTimestamp date={mockDate} updateInterval={1000} />);
    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText('6 minutes ago')).toBeInTheDocument();
  });

  it('handles null date', () => {
    render(<MilestoneTimestamp date={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('has accessible absolute time in aria-label', () => {
    (formatRelativeTime as jest.Mock).mockReturnValue('just now');
    render(<MilestoneTimestamp date={mockDate} />);
    const time = screen.getByRole('time');
    expect(time).toHaveAttribute('aria-label', expect.stringContaining('January 15, 2024'));
  });

  it('applies custom className', () => {
    (formatRelativeTime as jest.Mock).mockReturnValue('just now');
    render(<MilestoneTimestamp date={mockDate} className="text-blue-500" />);
    expect(screen.getByRole('time')).toHaveClass('text-blue-500');
  });
});
