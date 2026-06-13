/**
 * Skeleton Loading System
 * Standardized loading UI components
 */

import React from 'react';

/**
 * Generic skeleton loading component
 */
export function Skeleton({ width = '100%', height = '20px', className = '', radius = '4px' }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 ${className}`}
      style={{
        width,
        height,
        borderRadius: radius,
      }}
    />
  );
}

/**
 * Page skeleton - for full page loads
 */
export function PageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton height="32px" width="40%" />
        <Skeleton height="16px" width="60%" />
      </div>

      {/* Content area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton height="20px" width="100%" />
              <Skeleton height="20px" width="95%" />
              <Skeleton height="20px" width="90%" />
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height="100px" width="100%" radius="8px" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Table skeleton
 */
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height="40px" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="grid gap-2 mb-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} height="48px" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Card skeleton
 */
export function CardSkeleton({ count = 3, columns = 3 }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <Skeleton height="200px" width="100%" radius="8px" />
          <Skeleton height="20px" width="80%" />
          <Skeleton height="16px" width="60%" />
          <Skeleton height="40px" width="100%" radius="4px" />
        </div>
      ))}
    </div>
  );
}

/**
 * Chart skeleton
 */
export function ChartSkeleton() {
  return (
    <div className="w-full h-64 border rounded-lg p-4 space-y-4">
      <Skeleton height="20px" width="30%" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton height="16px" width="60px" />
            <Skeleton height="16px" width={`${Math.random() * 40 + 60}%`} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Dashboard skeleton - multiple widgets
 */
export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <Skeleton height="32px" width="40%" className="mb-2" />
        <Skeleton height="16px" width="60%" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <Skeleton height="16px" width="70%" />
            <Skeleton height="24px" width="60%" />
            <Skeleton height="12px" width="80%" />
          </div>
        ))}
      </div>

      {/* Charts and tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Table */}
      <div className="border rounded-lg p-4">
        <Skeleton height="20px" width="30%" className="mb-4" />
        <TableSkeleton rows={5} columns={4} />
      </div>
    </div>
  );
}

/**
 * List skeleton
 */
export function ListSkeleton({ items = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 flex items-center gap-4">
          <Skeleton height="48px" width="48px" radius="50%" />
          <div className="flex-1 space-y-2">
            <Skeleton height="16px" width="40%" />
            <Skeleton height="14px" width="60%" />
          </div>
          <Skeleton height="24px" width="80px" />
        </div>
      ))}
    </div>
  );
}

/**
 * Form skeleton
 */
export function FormSkeleton({ fields = 5 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton height="16px" width="30%" />
          <Skeleton height="40px" width="100%" radius="4px" />
        </div>
      ))}
      <Skeleton height="40px" width="100px" radius="4px" />
    </div>
  );
}

/**
 * Product details skeleton
 */
export function ProductDetailsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {/* Image */}
      <Skeleton height="400px" width="100%" radius="8px" />

      {/* Details */}
      <div className="space-y-4">
        <Skeleton height="32px" width="80%" />
        <Skeleton height="20px" width="40%" />
        <Skeleton height="60px" width="100%" radius="4px" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height="20px" width="100%" />
          ))}
        </div>
        <Skeleton height="48px" width="100%" radius="4px" />
      </div>
    </div>
  );
}

/**
 * Custom skeleton wrapper
 */
export function SkeletonWrapper({ isLoading, children, fallback }) {
  if (isLoading) {
    return fallback || <PageSkeleton />;
  }
  return children;
}

export default {
  Skeleton,
  PageSkeleton,
  TableSkeleton,
  CardSkeleton,
  ChartSkeleton,
  DashboardSkeleton,
  ListSkeleton,
  FormSkeleton,
  ProductDetailsSkeleton,
  SkeletonWrapper,
};
