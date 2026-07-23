import React from 'react';

/**
 * Status Badge Component
 * Displays status with color coding
 */
export function StatusBadge({ status }) {
  const statusConfig = {
    active: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Active' },
    inactive: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Inactive' },
    blocked: { bg: 'bg-red-100', text: 'text-red-700', label: 'Blocked' },
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
    approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
    draft: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Draft' },
    success: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Success' },
    failure: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Processing' },
  };

  const config = statusConfig[status?.toLowerCase()] || statusConfig.default;

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${config.bg} ${config.text}`}>
      {status || config.label}
    </span>
  );
}
