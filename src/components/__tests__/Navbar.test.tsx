import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import Navbar from '../Navbar';

expect.extend(toHaveNoViolations);

// Mock next/navigation usePathname
const mockUsePathname = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('Navbar', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders navigation links to /contracts, /milestones, and /reputation', () => {
    render(<Navbar />);

    expect(screen.getByRole('link', { name: 'Contracts' })).toHaveAttribute('href', '/contracts');
    expect(screen.getByRole('link', { name: 'Milestones' })).toHaveAttribute('href', '/milestones');
    expect(screen.getByRole('link', { name: 'Reputation' })).toHaveAttribute('href', '/reputation');
  });

  it('marks the current route with aria-current="page"', () => {
    mockUsePathname.mockReturnValue('/contracts');
    render(<Navbar />);

    const contractsLink = screen.getByRole('link', { name: 'Contracts' });
    expect(contractsLink).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark inactive routes with aria-current', () => {
    mockUsePathname.mockReturnValue('/contracts');
    render(<Navbar />);

    const milestonesLink = screen.getByRole('link', { name: 'Milestones' });
    const reputationLink = screen.getByRole('link', { name: 'Reputation' });

    expect(milestonesLink).not.toHaveAttribute('aria-current');
    expect(reputationLink).not.toHaveAttribute('aria-current');
  });

  it('updates active highlight when route changes', () => {
    const { rerender } = render(<Navbar />);
    mockUsePathname.mockReturnValue('/milestones');

    rerender(<Navbar />);

    expect(screen.getByRole('link', { name: 'Milestones' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Contracts' })).not.toHaveAttribute('aria-current');
  });

  it('maintains logical focus order (keyboard tab navigation)', () => {
    render(<Navbar />);

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const links = screen.getAllByRole('link');

    // All links must be focusable and inside the nav landmark
    links.forEach((link) => {
      expect(nav).toContainElement(link);
      expect(link).not.toHaveAttribute('tabindex'); // Link elements are naturally focusable
    });

    // Verify natural tab order matches DOM order
    expect(links[0]).toHaveTextContent('Contracts');
    expect(links[1]).toHaveTextContent('Milestones');
    expect(links[2]).toHaveTextContent('Reputation');
  });

  it('applies visible focus rings to all interactive elements', () => {
    render(<Navbar />);

    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link.className).toMatch(/focus:ring-2/);
      expect(link.className).toMatch(/focus:outline-none/);
    });
  });

  it('renders without horizontal overflow on 320px viewport (mobile)', () => {
    // Simulate mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 320,
    });

    render(<Navbar />);

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const list = nav.querySelector('ul');

    expect(list?.className).toMatch(/flex-wrap/);
  });

  it('passes jest-axe accessibility audit', async () => {
    const { container } = render(<Navbar />);
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  describe('rendered structure snapshots', () => {
    it('matches the loaded navigation structure with an active route', () => {
      mockUsePathname.mockReturnValue('/contracts');

      const { container } = render(<Navbar />);

      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches the empty default navigation structure without an active route', () => {
      mockUsePathname.mockReturnValue('/');

      const { container } = render(<Navbar />);

      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches the fallback navigation structure for an unknown route', () => {
      mockUsePathname.mockReturnValue('/not-found');

      const { container } = render(<Navbar />);

      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
