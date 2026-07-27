import React, { useState, useMemo } from 'react';

export type FormStatus = 'All' | 'Draft' | 'Published';

export interface Form {
  id: string;
  title: string;
  status: FormStatus;
}

export interface FormsListProps {
  forms: Form[];
}

export const FormsList = ({ forms }: FormsListProps) => {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FormStatus>('All');
  const pageSize = 10;

  const filteredForms = useMemo(() => {
    if (filter === 'All') return forms;
    return forms.filter((f) => f.status === filter);
  }, [forms, filter]);

  const displayedForms = filteredForms.slice(0, page * pageSize);
  const hasMore = displayedForms.length < filteredForms.length;

  return (
    <div>
      <div>
        <button onClick={() => { setFilter('All'); setPage(1); }}>Filter All</button>
        <button onClick={() => { setFilter('Draft'); setPage(1); }}>Filter Draft</button>
        <button onClick={() => { setFilter('Published'); setPage(1); }}>Filter Published</button>
      </div>
      <ul data-testid="forms-list">
        {displayedForms.map((f) => (
          <li key={f.id}>{f.title}</li>
        ))}
      </ul>
      {hasMore && (
        <button onClick={() => setPage((p) => p + 1)}>Load More</button>
      )}
      {!hasMore && displayedForms.length > 0 && <div>End of list</div>}
    </div>
  );
};
