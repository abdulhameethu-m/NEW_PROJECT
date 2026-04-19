import React, { useState } from 'react';

/**
 * Reusable Admin Data Table Component
 * Features:
 * - Pagination
 * - Sorting
 * - Search
 * - Bulk actions
 * - Status badges
 * - Responsive design
 */
export function AdminDataTable({
  columns = [],
  data = [],
  isLoading = false,
  total = 0,
  page = 1,
  limit = 20,
  onPageChange = () => {},
  onSort = () => {},
  onSearch = () => {},
  bulkActions = [],
  onBulkAction = () => {},
  rowActions = [],
  onRowAction = () => {},
  getRowKey = (row) => row._id,
  onSelectionChange = () => {},
}) {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (key) => {
    const newOrder = sortBy === key && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(key);
    setSortOrder(newOrder);
    onSort({ field: key, order: newOrder });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(data.map(row => getRowKey(row)));
      setSelectedRows(allIds);
      onSelectionChange(Array.from(allIds));
    } else {
      setSelectedRows(new Set());
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (rowId, e) => {
    e.stopPropagation();
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    setSelectedRows(newSelected);
    onSelectionChange(Array.from(newSelected));
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Search Bar & Bulk Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {selectedRows.size > 0 && bulkActions.length > 0 && (
          <div className="flex gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {selectedRows.size} selected
            </span>
            {bulkActions.map(action => (
              <button
                key={action.key}
                onClick={() => onBulkAction(action.key, Array.from(selectedRows))}
                disabled={action.disabled}
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr>
              {bulkActions.length > 0 && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 ${
                    col.sortable ? 'cursor-pointer hover:text-slate-700' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    {col.sortable && sortBy === col.key && (
                      <span className="text-blue-600">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {rowActions.length > 0 && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + 2} className="p-8 text-center">
                  <div className="animate-spin">Loading...</div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="p-8 text-center text-slate-500">
                  No data found
                </td>
              </tr>
            ) : (
              data.map(row => (
                <tr
                  key={getRowKey(row)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  {bulkActions.length > 0 && (
                    <td className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(getRowKey(row))}
                        onChange={(e) => handleSelectRow(getRowKey(row), e)}
                        className="rounded"
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td
                      key={`${getRowKey(row)}-${col.key}`}
                      className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100"
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key]}
                    </td>
                  ))}
                  {rowActions.length > 0 && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {rowActions.map(action => (
                          <button
                            key={action.key}
                            onClick={() => onRowAction(action.key, row)}
                            disabled={action.disabled?.(row)}
                            className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-slate-800"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600 dark:text-slate-300">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium disabled:opacity-50 dark:border-slate-700"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === pages}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium disabled:opacity-50 dark:border-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDataTable;
