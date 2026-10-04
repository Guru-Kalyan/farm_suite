import React from 'react';
import { Button } from './Button';

export const Pagination = ({
  pagination, // { total, page, pages, page_size, has_next, has_previous }
  onPageChange
}) => {
  if (!pagination || pagination.pages <= 1) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      fontSize: '12.5px',
      color: 'var(--text-secondary)',
      flexWrap: 'wrap',
      gap: '10px'
    }}>
      <div>
        Showing page <b>{pagination.page}</b> of <b>{pagination.pages}</b> ({pagination.total} total records)
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Button
          size="sm"
          variant="secondary"
          disabled={!pagination.has_previous}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          Previous
        </Button>
        <span style={{ padding: '0 6px', fontWeight: '600' }}>{pagination.page}</span>
        <Button
          size="sm"
          variant="secondary"
          disabled={!pagination.has_next}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
