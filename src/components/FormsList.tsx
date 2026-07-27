import React, { useState, useMemo } from 'react';
import { Skeleton } from './Skeleton';

export type FormStatus = 'All' | 'Draft' | 'Published';

export interface Form {
  id: string;
  title: string;
  status: FormStatus;
}

export interface FormsListProps {
  forms: Form[];
  isLoading?: boolean;
  error?: string | null;
}

export const FormsList = ({ forms, isLoading = false, error }: FormsListProps) => {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FormStatus>('All');
  const pageSize = 10;

  const filteredForms = useMemo(() => {
    if (filter === 'All') return forms;
    return forms.filter((f) => f.status === filter);
  }, [forms, filter]);

  const displayedForms = filteredForms.slice(0, page * pageSize);
  const hasMore = displayedForms.length < filteredForms.length;

  if (isLoading) {
    return (
      <div>
        <div role="status" aria-label="Loading forms" aria-live="polite" aria-busy="true">
          <div className="mb-4 flex flex-wrap gap-2" aria-hidden="true">
            <Skeleton width="w-24" height="h-9" rounded="rounded-lg" />
            <Skeleton width="w-24" height="h-9" rounded="rounded-lg" />
            <Skeleton width="w-28" height="h-9" rounded="rounded-lg" />
          </div>
          <ul data-testid="forms-list-skeleton" aria-hidden="true" className="space-y-2">
            {Array.from({ length: 10 }, (_, index) => (
              <li key={`skeleton-${index}`} data-testid="forms-skeleton-row" className="py-2">
                <Skeleton width="w-full" height="h-5" rounded="rounded-md" className="max-w-[18rem]" />
              </li>
            ))}
          </ul>
          <span className="sr-only">Loading forms</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div>
        <button type="button" onClick={() => { setFilter('All'); setPage(1); }}>Filter All</button>
        <button type="button" onClick={() => { setFilter('Draft'); setPage(1); }}>Filter Draft</button>
        <button type="button" onClick={() => { setFilter('Published'); setPage(1); }}>Filter Published</button>
      </div>
      <ul data-testid="forms-list">
        {displayedForms.map((f) => (
          <li key={f.id}>{f.title}</li>
        ))}
      </ul>
      {hasMore && (
        <button type="button" onClick={() => setPage((p) => p + 1)}>Load More</button>
      )}
      {!hasMore && displayedForms.length > 0 && <div>End of list</div>}
    </div>
  );
};
