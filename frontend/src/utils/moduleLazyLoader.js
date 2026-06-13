/**
 * Module Lazy Loading Utilities
 * Provides smart lazy loading for modules and chunks
 */

import { lazy, Suspense } from 'react';
import { performanceMonitor } from './performanceMonitor';

/**
 * Cache for loaded modules
 */
const moduleCache = new Map();

/**
 * Create a lazy-loaded component with performance tracking
 * @param {Function} importFn - Dynamic import function
 * @param {String} moduleName - Name of the module for tracking
 * @param {Object} options - Configuration options
 */
export function lazyLoadModule(importFn, moduleName, options = {}) {
  const {
    timeout = 30000,
    track = true,
    cache = true,
  } = options;

  const cacheKey = moduleName;

  // Return from cache if available
  if (cache && moduleCache.has(cacheKey)) {
    return moduleCache.get(cacheKey);
  }

  const LazyComponent = lazy(async () => {
    if (track) {
      const metricId = performanceMonitor.startMetric(`module_load_${moduleName}`);

      try {
        const startTime = performance.now();
        const module = await Promise.race([
          importFn(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Module ${moduleName} load timeout`)), timeout)
          ),
        ]);

        const duration = performance.now() - startTime;
        performanceMonitor.endMetric(metricId, 'chunkLoadTimes');
        performanceMonitor.trackModuleLoad(moduleName, duration);

        return module;
      } catch (error) {
        const duration = performance.now() - startTime;
        console.error(`Failed to load module ${moduleName}:`, error);
        performanceMonitor.trackModuleLoad(moduleName, duration);
        throw error;
      }
    } else {
      return importFn();
    }
  });

  if (cache) {
    moduleCache.set(cacheKey, LazyComponent);
  }

  return LazyComponent;
}

/**
 * Preload a module into cache
 */
export async function preloadModule(importFn, moduleName) {
  if (moduleCache.has(moduleName)) {
    return moduleCache.get(moduleName);
  }

  try {
    const module = await importFn();
    const LazyComponent = lazy(() => Promise.resolve(module));
    moduleCache.set(moduleName, LazyComponent);
    return LazyComponent;
  } catch (error) {
    console.error(`Failed to preload module ${moduleName}:`, error);
  }
}

/**
 * Prefetch a module (start downloading without rendering)
 */
export function prefetchModule(importFn, moduleName) {
  if (moduleCache.has(moduleName)) {
    return Promise.resolve();
  }

  return preloadModule(importFn, moduleName).catch(error => {
    console.warn(`Prefetch failed for ${moduleName}:`, error);
  });
}

/**
 * Clear module cache
 */
export function clearModuleCache(moduleName = null) {
  if (moduleName) {
    moduleCache.delete(moduleName);
  } else {
    moduleCache.clear();
  }
}

/**
 * Get cached modules
 */
export function getCachedModules() {
  return Array.from(moduleCache.keys());
}

/**
 * Create a named export lazy loader
 */
export function lazyLoadNamedExport(importFn, exportName, moduleName) {
  return lazy(async () => {
    const module = await importFn();
    return {
      default: module[exportName],
    };
  });
}

/**
 * Batch preload multiple modules
 */
export async function preloadModules(moduleList) {
  return Promise.allSettled(
    moduleList.map(({ importFn, moduleName }) =>
      preloadModule(importFn, moduleName)
    )
  );
}

/**
 * Module loader configuration for routes
 * Organizes modules by feature
 */
export const moduleLoaders = {
  // Core modules (always loaded)
  core: {
    auth: () => import('../modules/auth'),
    layout: () => import('../components/Layout'),
  },

  // Dashboard module
  dashboard: {
    user: () => import('../pages/UserDashboardPage'),
    vendor: () => import('../pages/VendorDashboardPage'),
    influencer: () => import('../pages/influencer/dashboard'),
    admin: () => import('../pages/AdminDashboardPage'),
  },

  // Campaign module
  campaigns: {
    main: () => import('../pages/influencer/campaigns'),
    execution: () => import('../pages/influencer/campaignExecution'),
  },

  // Commerce modules
  commerce: {
    products: () => import('../pages/ProductsPage'),
    productDetails: () => import('../pages/ProductDetailsPage'),
    cart: () => import('../pages/CartPage'),
    checkout: () => import('../pages/CheckoutPage'),
    orders: () => import('../pages/OrdersPage'),
    wishlist: () => import('../pages/WishlistPage'),
  },

  // Wallet & Finance
  finance: {
    wallet: () => import('../pages/VendorEarningsPage'),
    payouts: () => import('../pages/VendorPayoutsPage'),
    invoices: () => import('../pages/VendorInvoicesPage'),
  },

  // Affiliate module
  affiliate: {
    products: () => import('../pages/influencer/affiliateProducts'),
    links: () => import('../pages/influencer/affiliateLinks'),
  },

  // Analytics
  analytics: {
    vendor: () => import('../pages/VendorAnalyticsPage'),
    admin: () => import('../pages/AdminAnalyticsPage'),
    influencer: () => import('../pages/influencer/earnings'),
  },

  // Admin
  admin: {
    dashboard: () => import('../pages/AdminDashboardPage'),
    users: () => import('../pages/AdminUsersPage'),
    products: () => import('../pages/AdminProductsPage'),
    sellers: () => import('../pages/AdminSellersPage'),
    orders: () => import('../pages/AdminOrdersPage'),
    settings: () => import('../pages/AdminSettingsPage'),
  },

  // Vendor module
  vendor: {
    dashboard: () => import('../pages/VendorDashboardPage'),
    products: () => import('../pages/VendorProductsPage'),
    orders: () => import('../pages/VendorOrdersPage'),
    inventory: () => import('../pages/InventoryPage'),
    analytics: () => import('../pages/VendorAnalyticsPage'),
    settings: () => import('../pages/VendorSettingsPage'),
  },

  // Influencer module
  influencer: {
    dashboard: () => import('../pages/influencer/dashboard'),
    campaigns: () => import('../pages/influencer/campaigns'),
    affiliate: () => import('../pages/influencer/affiliateProducts'),
    storefront: () => import('../pages/influencer/storefrontBuilder'),
    earnings: () => import('../pages/influencer/earnings'),
    profile: () => import('../pages/influencer/profile'),
  },

  // Settings & Support
  settings: {
    profile: () => import('../pages/ProfilePage'),
    account: () => import('../pages/SettingsPage'),
    support: () => import('../pages/SupportPage'),
    notifications: () => import('../pages/NotificationsPage'),
  },
};

/**
 * Get module loader by category and name
 */
export function getModuleLoader(category, name) {
  const categoryModules = moduleLoaders[category];
  if (!categoryModules) {
    console.warn(`Module category not found: ${category}`);
    return null;
  }

  const loader = categoryModules[name];
  if (!loader) {
    console.warn(`Module not found: ${category}.${name}`);
    return null;
  }

  return loader;
}

export default {
  lazyLoadModule,
  preloadModule,
  prefetchModule,
  clearModuleCache,
  getCachedModules,
  preloadModules,
  moduleLoaders,
  getModuleLoader,
};
