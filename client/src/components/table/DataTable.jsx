import { ChevronLeft, ChevronRight } from 'lucide-react';
import EmptyState from '../feedback/EmptyState.jsx';
import ErrorState from '../feedback/ErrorState.jsx';
import LoadingSkeleton from '../feedback/LoadingSkeleton.jsx';
import Button from '../ui/Button.jsx';

export default function DataTable({
  columns,
  emptyDescription,
  emptyTitle = 'No results found',
  error,
  getRowKey = (row, index) => row.id ?? row._id ?? index,
  loading = false,
  onRetry,
  pagination,
  rows = [],
}) {
  const page = Math.max(1, pagination?.page || 1);
  const pages = Math.max(1, pagination?.pages || 1);
  const limit = Math.max(1, pagination?.limit || 10);
  const total = Math.max(0, pagination?.total || 0);
  const firstItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const lastItem = Math.min(page * limit, total);

  return (
    <div className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-5">
            <LoadingSkeleton lines={5} />
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : rows.length === 0 ? (
          <EmptyState description={emptyDescription} title={emptyTitle} />
        ) : (
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {columns.map((column) => (
                  <th
                    className={`whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 ${column.headerClassName || ''}`}
                    key={column.key}
                    scope="col"
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {rows.map((row, index) => (
                <tr
                  className="transition-colors hover:bg-slate-50/70"
                  key={getRowKey(row, index)}
                >
                  {columns.map((column) => (
                    <td
                      className={`px-5 py-4 text-slate-700 ${column.cellClassName || ''}`}
                      key={column.key}
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination &&
        typeof pagination.onPageChange === 'function' &&
        !loading &&
        !error &&
        rows.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Showing <span className="font-medium text-slate-700">{firstItem}</span> to{' '}
            <span className="font-medium text-slate-700">{lastItem}</span> of{' '}
            <span className="font-medium text-slate-700">{total}</span> results
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => pagination.onPageChange(page - 1)}
              size="sm"
              variant="secondary"
            >
              <ChevronLeft aria-hidden="true" size={16} />
              Previous
            </Button>
            <span aria-live="polite" className="min-w-16 text-center text-xs text-slate-500">
              Page {page} of {pages}
            </span>
            <Button
              aria-label="Next page"
              disabled={page >= pages}
              onClick={() => pagination.onPageChange(page + 1)}
              size="sm"
              variant="secondary"
            >
              Next
              <ChevronRight aria-hidden="true" size={16} />
            </Button>
          </div>
        </div>
        )}
    </div>
  );
}
