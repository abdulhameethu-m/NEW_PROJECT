import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { AdminDataTable, StatusBadge } from '../components/AdminComponents';
import { formatDateTime, truncate } from '../utils/adminUtils';

/**
 * Audit Logs Viewer Page
 * Enterprise audit trail for compliance and security
 */
export function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });
  const [filters, setFilters] = useState({
    action: '',
    actorRole: '',
    entityType: '',
    status: '',
  });

  useEffect(() => {
    loadLogs();
  }, [pagination.page, filters]);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const data = await adminService.getAuditLogs({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });

      setLogs(data.data || data);
      if (data.pagination) {
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
        }));
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-slate-900 dark:text-white">
          {value?.replace(/_/g, ' ') || '-'}
        </span>
      ),
    },
    {
      key: 'actorRole',
      label: 'Actor Role',
      render: (value) => (
        <span className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
          {value || '-'}
        </span>
      ),
    },
    {
      key: 'entityType',
      label: 'Entity',
      render: (value) => (
        <span className="text-sm text-slate-700 dark:text-slate-200">
          {value || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'createdAt',
      label: 'Timestamp',
      sortable: true,
      render: (value) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {formatDateTime(value)}
        </span>
      ),
    },
  ];

  const pages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
          Audit Logs
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Complete activity trail of all admin actions
        </p>
      </div>

      {/* Filters */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            Action
          </label>
          <input
            type="text"
            placeholder="Search actions..."
            value={filters.action}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, action: e.target.value }));
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            Actor Role
          </label>
          <select
            value={filters.actorRole}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, actorRole: e.target.value }));
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
            <option value="support_admin">Support Admin</option>
            <option value="finance_admin">Finance Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            Entity Type
          </label>
          <select
            value={filters.entityType}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, entityType: e.target.value }));
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All entities</option>
            <option value="User">User</option>
            <option value="Vendor">Vendor</option>
            <option value="Product">Product</option>
            <option value="Order">Order</option>
            <option value="Payment">Payment</option>
            <option value="PlatformConfig">Configuration</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <AdminDataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        total={pagination.total}
        page={pagination.page}
        limit={pagination.limit}
        onPageChange={(page) =>
          setPagination(prev => ({ ...prev, page }))
        }
        getRowKey={(row) => row._id}
      />

      {/* Pagination Info */}
      <div className="text-center text-xs text-slate-600 dark:text-slate-300">
        Showing {logs.length} of {pagination.total} logs
      </div>
    </div>
  );
}

export default AuditLogsPage;
