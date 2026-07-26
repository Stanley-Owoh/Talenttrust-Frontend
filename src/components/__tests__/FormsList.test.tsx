import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormsList, Form } from '../FormsList';

const createForms = (count: number): Form[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `id-${i}`,
    title: `Form ${i}`,
    status: i % 2 === 0 ? 'Draft' : 'Published',
  }));
};

describe('FormsList Pagination Boundaries', () => {
  it('renders the first page of forms', () => {
    const forms = createForms(15);
    render(<FormsList forms={forms} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(10);
  });

  it('handles load-more append behavior', () => {
    const forms = createForms(15);
    render(<FormsList forms={forms} />);
    const button = screen.getByText('Load More');
    fireEvent.click(button);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(15);
  });

  it('handles end-of-list behavior', () => {
    const forms = createForms(15);
    render(<FormsList forms={forms} />);
    const button = screen.getByText('Load More');
    fireEvent.click(button);
    expect(screen.queryByText('Load More')).not.toBeInTheDocument();
    expect(screen.getByText('End of list')).toBeInTheDocument();
  });

  it('handles reset-on-filter behavior', () => {
    const forms = createForms(25); // 13 Draft, 12 Published
    render(<FormsList forms={forms} />);
    const loadMoreButton = screen.getByText('Load More');
    fireEvent.click(loadMoreButton); // Load 20
    
    // Now switch filter
    const draftFilter = screen.getByText('Filter Draft');
    fireEvent.click(draftFilter);

    // Should reset page to 1, showing max 10 draft forms
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(10);
    expect(screen.getByText('Load More')).toBeInTheDocument(); // Because there are 13 draft forms in total
  });
});
