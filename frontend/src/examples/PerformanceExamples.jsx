/**
 * Performance Optimization System - Implementation Examples
 * Real-world usage examples for the optimization system
 */

// ============================================
// EXAMPLE 1: Lazy Loading Routes with Fallback
// ============================================

import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { PageSkeleton, DashboardSkeleton, TableSkeleton } from './components/SkeletonLoaders.jsx';
import { ModuleErrorBoundary } from './components/ErrorBoundaries.jsx';

const DashboardPage = lazy(() => import('./pages/UserDashboardPage'));
const VendorDashboardPage = lazy(() => import('./pages/VendorDashboardPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const CampaignsPage = lazy(() => import('./pages/influencer/campaigns'));

// Usage in Routes
export const dashboardRoutes = [
  {
    path: '/dashboard',
    element: (
      <ModuleErrorBoundary moduleName="user-dashboard">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardPage />
        </Suspense>
      </ModuleErrorBoundary>
    ),
  },
  {
    path: '/vendor/dashboard',
    element: (
      <ModuleErrorBoundary moduleName="vendor-dashboard">
        <Suspense fallback={<DashboardSkeleton />}>
          <VendorDashboardPage />
        </Suspense>
      </ModuleErrorBoundary>
    ),
  },
  {
    path: '/admin/dashboard',
    element: (
      <ModuleErrorBoundary moduleName="admin-dashboard">
        <Suspense fallback={<DashboardSkeleton />}>
          <AdminDashboardPage />
        </Suspense>
      </ModuleErrorBoundary>
    ),
  },
  {
    path: '/influencer/campaigns',
    element: (
      <ModuleErrorBoundary moduleName="campaigns">
        <Suspense fallback={<PageSkeleton />}>
          <CampaignsPage />
        </Suspense>
      </ModuleErrorBoundary>
    ),
  },
];

// ============================================
// EXAMPLE 2: Smart Prefetching in Navigation
// ============================================

import { usePrefetch, withPrefetch } from './utils/prefetchManager.js';
import { getModuleLoader } from './utils/moduleLazyLoader.js';

export function Sidebar() {
  const { prefetch } = usePrefetch();

  const menuItems = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      module: 'dashboard',
      icon: '📊',
    },
    {
      label: 'Campaigns',
      route: '/influencer/campaigns',
      module: 'campaigns',
      icon: '📢',
    },
    {
      label: 'Products',
      route: '/products',
      module: 'commerce',
      icon: '📦',
    },
    {
      label: 'Wallet',
      route: '/wallet',
      module: 'finance',
      icon: '💰',
    },
    {
      label: 'Analytics',
      route: '/analytics',
      module: 'analytics',
      icon: '📈',
    },
  ];

  return (
    <nav className="space-y-2">
      {menuItems.map((item) => (
        <div
          key={item.route}
          className="p-3 cursor-pointer hover:bg-gray-100 rounded"
          onMouseEnter={() => {
            // Prefetch on hover
            const loader = getModuleLoader(item.module, item.route.split('/')[1]);
            if (loader) prefetch(item.module, loader);
          }}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </nav>
  );
}

// ============================================
// EXAMPLE 3: Optimized API Data Fetching
// ============================================

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './utils/apiOptimization.js';

// Custom hook for dashboard data with caching
export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () =>
      apiClient.get('/api/dashboard/metrics', {
        cache: true,
        cacheTTL: 5 * 60 * 1000, // 5 minutes
        deduplicate: true,
      }),
    staleTime: 4 * 60 * 1000, // Consider stale after 4 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Usage in component
export function Dashboard() {
  const { data, isLoading, error } = useDashboardMetrics();

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <div>Error loading dashboard</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      {data && <MetricsCards metrics={data} />}
    </div>
  );
}

// ============================================
// EXAMPLE 4: Image Optimization
// ============================================

import { ResponsiveImage, ProgressiveImage, LazyImageGallery } from './utils/imageOptimization.jsx';

export function ProductCard({ product }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <ResponsiveImage
        src={product.imageUrl}
        alt={product.name}
        className="w-full h-64 object-cover"
      />
      <div className="p-4">
        <h3>{product.name}</h3>
        <p className="text-gray-600">${product.price}</p>
      </div>
    </div>
  );
}

export function ProductGallery({ images }) {
  return (
    <LazyImageGallery
      images={images}
      columns={3}
      gap={4}
      className="my-8"
    />
  );
}

export function InfluencerBanner({ influencer }) {
  return (
    <ProgressiveImage
      src={influencer.bannerUrl}
      blurSrc={influencer.bannerBlur}
      alt={influencer.name}
      width={1200}
      height={300}
      className="w-full rounded-lg"
    />
  );
}

// ============================================
// EXAMPLE 5: Large List Virtualization
// ============================================

import { VirtualTable, VirtualList, VirtualGrid } from './components/VirtualList.jsx';

export function OrdersTableOptimized({ orders }) {
  const columns = [
    { key: 'id', label: 'Order ID', width: 0.1, minWidth: '80px' },
    { key: 'customer', label: 'Customer', width: 0.25 },
    { key: 'amount', label: 'Amount', width: 0.15 },
    { key: 'status', label: 'Status', width: 0.2 },
    { key: 'date', label: 'Date', width: 0.3 },
  ];

  return (
    <VirtualTable
      columns={columns}
      rows={orders}
      rowHeight={50}
      containerHeight={600}
      renderCell={(row, column) => {
        if (column.key === 'status') {
          return <StatusBadge status={row.status} />;
        }
        if (column.key === 'date') {
          return new Date(row.date).toLocaleDateString();
        }
        return row[column.key];
      }}
    />
  );
}

export function ProductListOptimized({ products }) {
  return (
    <VirtualList
      items={products}
      itemHeight={120}
      height={800}
      renderItem={(product) => (
        <ProductCard key={product.id} product={product} />
      )}
    />
  );
}

export function InfluencersGridOptimized({ influencers }) {
  return (
    <VirtualGrid
      items={influencers}
      columnCount={3}
      itemHeight={280}
      containerHeight={800}
      renderItem={(influencer) => (
        <InfluencerCard key={influencer.id} influencer={influencer} />
      )}
    />
  );
}

// ============================================
// EXAMPLE 6: Performance Tracking
// ============================================

import {
  useComponentPerformance,
  useRenderPerformance,
  useApiPerformance,
  useMemoryMonitor,
} from './hooks/usePerformance.js';

export function OptimizedDashboard() {
  // Track component mount
  useComponentPerformance('OptimizedDashboard');

  // Track render performance
  useRenderPerformance('OptimizedDashboard');

  // Track memory usage
  useMemoryMonitor('OptimizedDashboard');

  // Track API performance
  const { trackStart, trackEnd } = useApiPerformance('/api/dashboard/full');

  useEffect(() => {
    trackStart();
    loadDashboard().finally(() => trackEnd(200));
  }, []);

  return (
    <div>
      {/* Dashboard content */}
    </div>
  );
}

// ============================================
// EXAMPLE 7: Skeleton Loaders with Real Component
// ============================================

import { SkeletonWrapper, DashboardSkeleton, TableSkeleton } from './components/SkeletonLoaders.jsx';

export function DashboardWithLoading() {
  const { data, isLoading } = useDashboardMetrics();

  return (
    <SkeletonWrapper isLoading={isLoading} fallback={<DashboardSkeleton />}>
      <Dashboard data={data} />
    </SkeletonWrapper>
  );
}

export function OrdersTableWithLoading() {
  const { data, isLoading } = useOrdersQuery();

  return (
    <SkeletonWrapper isLoading={isLoading} fallback={<TableSkeleton rows={10} columns={5} />}>
      <OrdersTableOptimized orders={data} />
    </SkeletonWrapper>
  );
}

// ============================================
// EXAMPLE 8: Error Handling with Boundaries
// ============================================

import { ModuleErrorBoundary, withErrorBoundary } from './components/ErrorBoundaries.jsx';

// Per-module error handling
export function AnalyticsSection() {
  return (
    <ModuleErrorBoundary moduleName="analytics">
      <Suspense fallback={<ChartSkeleton />}>
        <AnalyticsCharts />
      </Suspense>
    </ModuleErrorBoundary>
  );
}

// HOC-based error handling
export const OptimizedAnalytics = withErrorBoundary(AnalyticsCharts, {
  componentName: 'AnalyticsCharts',
});

// ============================================
// EXAMPLE 9: Intersection-based Prefetching
// ============================================

import { useIntersectionObserver, useIntersectionPrefetch } from './hooks/usePerformance.js';

export function LazyModuleSection() {
  const { ref, isVisible } = useIntersectionObserver({ rootMargin: '50px' });

  // Prefetch when section becomes visible
  useIntersectionPrefetch(
    ref,
    () => import('./components/HeavyModule'),
    'heavy-module'
  );

  return (
    <div ref={ref}>
      {isVisible && <HeavyModule />}
    </div>
  );
}

// ============================================
// EXAMPLE 10: Batch API Requests
// ============================================

import { batchApiRequests } from './utils/apiOptimization.js';

export async function loadDashboardData() {
  const results = await batchApiRequests(
    [
      {
        method: 'GET',
        url: '/api/dashboard/revenue',
      },
      {
        method: 'GET',
        url: '/api/dashboard/campaigns',
      },
      {
        method: 'GET',
        url: '/api/dashboard/wallet',
      },
      {
        method: 'GET',
        url: '/api/dashboard/commissions',
      },
    ],
    { parallel: true }
  );

  return {
    revenue: results[0],
    campaigns: results[1],
    wallet: results[2],
    commissions: results[3],
  };
}

// ============================================
// EXPORT ALL EXAMPLES
// ============================================

export default {
  dashboardRoutes,
  Sidebar,
  Dashboard,
  ProductCard,
  ProductGallery,
  OrdersTableOptimized,
  ProductListOptimized,
  OptimizedDashboard,
  DashboardWithLoading,
  AnalyticsSection,
  LazyModuleSection,
  loadDashboardData,
};
