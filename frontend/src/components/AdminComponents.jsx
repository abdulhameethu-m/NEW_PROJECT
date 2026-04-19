import React from 'react';

/**
 * Status Badge Component
 * Displays status with color coding
 */
export function StatusBadge({ status, variant = 'default' }) {
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

/**
 * Alert Badge Component
 * Shows alert/notification badges
 */
export function AlertBadge({ count, type = 'primary', label }) {
  const typeStyles = {
    primary: 'bg-blue-600 text-white',
    danger: 'bg-red-600 text-white',
    warning: 'bg-amber-600 text-white',
    success: 'bg-emerald-600 text-white',
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 ${typeStyles[type]}`}>
      <span className="text-sm font-semibold">{count}</span>
      {label && <span className="text-xs">{label}</span>}
    </div>
  );
}

/**
 * KPI Card Component
 * Displays key performance indicators
 */
export function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  onClick,
  loading = false,
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {title}
          </p>
          {loading ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          ) : (
            <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
              {value}
            </p>
          )}
          {subtitle && (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-2xl dark:bg-slate-800">
            {icon}
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className={`mt-4 text-xs font-medium ${
          trend === 'up' ? 'text-emerald-600' : 'text-red-600'
        }`}>
          {trend === 'up' ? '↑' : '↓'} {trendValue} from last period
        </div>
      )}
    </div>
  );
}

/**
 * Confirmation Dialog Component
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {description}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Toast Notification Component
 */
export function Toast({ message, type = 'info', icon, onClose, autoClose = true }) {
  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  const typeStyles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200',
    warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200',
  };

  return (
    <div className={`fixed bottom-4 right-4 flex max-w-sm items-center gap-3 rounded-lg border p-4 ${typeStyles[type]}`}>
      {icon && <span className="text-lg">{icon}</span>}
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="ml-auto text-lg font-bold opacity-70 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

export default {
  StatusBadge,
  AlertBadge,
  KPICard,
  ConfirmDialog,
  Toast,
};
