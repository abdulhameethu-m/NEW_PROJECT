/**
 * Prefetching System
 * Preload modules and resources on user interaction
 */

import { prefetchModule, getCachedModules } from './moduleLazyLoader';

/**
 * Prefetch manager
 */
class PrefetchManager {
  constructor() {
    this.prefetchedModules = new Set();
    this.prefetchQueue = [];
    this.isProcessing = false;
  }

  /**
   * Prefetch a single module
   */
  async prefetch(moduleName, importFn) {
    if (this.prefetchedModules.has(moduleName)) {
      return;
    }

    // Add to queue
    this.prefetchQueue.push({ moduleName, importFn });

    // Process queue
    await this.processQueue();
  }

  /**
   * Batch prefetch modules
   */
  async prefetchBatch(modules) {
    modules.forEach(({ moduleName, importFn }) => {
      if (!this.prefetchedModules.has(moduleName)) {
        this.prefetchQueue.push({ moduleName, importFn });
      }
    });

    await this.processQueue();
  }

  /**
   * Process prefetch queue
   */
  async processQueue() {
    if (this.isProcessing || this.prefetchQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.prefetchQueue.length > 0) {
      const { moduleName, importFn } = this.prefetchQueue.shift();

      try {
        await prefetchModule(importFn, moduleName);
        this.prefetchedModules.add(moduleName);
      } catch (error) {
        console.warn(`Prefetch failed for ${moduleName}:`, error);
      }

      // Use requestIdleCallback to avoid blocking
      if (this.prefetchQueue.length > 0) {
        await new Promise(resolve => {
          if ('requestIdleCallback' in window) {
            requestIdleCallback(resolve);
          } else {
            setTimeout(resolve, 100);
          }
        });
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get prefetch status
   */
  getStatus() {
    return {
      prefetched: Array.from(this.prefetchedModules),
      queued: this.prefetchQueue.length,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Clear prefetch cache
   */
  clear() {
    this.prefetchedModules.clear();
    this.prefetchQueue = [];
    this.isProcessing = false;
  }
}

const prefetchManager = new PrefetchManager();

/**
 * Hook for prefetching on hover
 */
export function usePrefetch() {
  const handlePrefetch = (moduleName, importFn) => {
    prefetchManager.prefetch(moduleName, importFn);
  };

  const handlePrefetchBatch = (modules) => {
    prefetchManager.prefetchBatch(modules);
  };

  return {
    prefetch: handlePrefetch,
    prefetchBatch: handlePrefetchBatch,
  };
}

/**
 * Prefetch on hover directive
 */
export function withPrefetch(moduleName, importFn) {
  return {
    onMouseEnter: () => prefetchManager.prefetch(moduleName, importFn),
    onTouchStart: () => prefetchManager.prefetch(moduleName, importFn),
  };
}

/**
 * Prefetch route modules
 */
export function prefetchRoute(routeName, importFn) {
  // Prefetch after main bundle is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => prefetchManager.prefetch(routeName, importFn), 2000);
    });
  } else {
    setTimeout(() => prefetchManager.prefetch(routeName, importFn), 1000);
  }
}

/**
 * Prefetch sidebar routes
 */
export function prefetchSidebarRoutes(sidebarItems, getModuleLoader) {
  const modules = sidebarItems
    .filter(item => item.route && !item.external)
    .map(item => {
      const loader = getModuleLoader(item.route);
      if (loader) {
        return {
          moduleName: item.route,
          importFn: loader,
        };
      }
      return null;
    })
    .filter(Boolean);

  if (modules.length > 0) {
    prefetchManager.prefetchBatch(modules);
  }
}

/**
 * Prefetch with intersection observer
 */
export function setupIntersectionPrefetch() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const moduleName = entry.target.dataset.prefetch;
          const importFn = entry.target.dataset.importFn;

          if (moduleName && importFn) {
            try {
              const fn = eval(importFn);
              prefetchManager.prefetch(moduleName, fn);
            } catch (e) {
              console.warn(`Failed to prefetch ${moduleName}:`, e);
            }
          }
        }
      });
    },
    {
      rootMargin: '50px',
    }
  );

  // Observe all elements with data-prefetch
  document.querySelectorAll('[data-prefetch]').forEach(el => {
    observer.observe(el);
  });

  return observer;
}

/**
 * Prefetch on connection type
 */
export function prefetchByConnection(modules) {
  if ('connection' in navigator) {
    const connection = navigator.connection;
    const effectiveType = connection.effectiveType;

    // Only prefetch on 4g or faster
    if (effectiveType === '4g') {
      prefetchManager.prefetchBatch(modules);
    } else if (effectiveType === '3g' || effectiveType === '2g') {
      console.log('Skipping prefetch on slow connection');
    }
  } else {
    // Fallback: prefetch anyway if connection info not available
    prefetchManager.prefetchBatch(modules);
  }
}

/**
 * Prefetch strategy configuration
 */
export const prefetchConfig = {
  // Prefetch sidebar routes
  sidebar: {
    enabled: true,
    delay: 1000,
  },

  // Prefetch on page idle
  idle: {
    enabled: true,
    delay: 3000,
  },

  // Prefetch on hover
  hover: {
    enabled: true,
    immediate: false,
  },

  // Prefetch based on connection
  connection: {
    enabled: true,
    minSpeed: '4g',
  },

  // Prefetch commonly used routes
  common: {
    enabled: true,
    routes: [
      { moduleName: 'dashboard', importFn: () => import('../pages/UserDashboardPage') },
      { moduleName: 'profile', importFn: () => import('../pages/ProfilePage') },
      { moduleName: 'settings', importFn: () => import('../pages/SettingsPage') },
    ],
  },
};

/**
 * Setup prefetch strategy
 */
export function setupPrefetchStrategy(config = prefetchConfig) {
  // Prefetch common routes
  if (config.common?.enabled) {
    setTimeout(() => {
      prefetchManager.prefetchBatch(config.common.routes);
    }, config.common?.delay || 2000);
  }

  // Setup idle prefetch
  if (config.idle?.enabled && 'requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Additional prefetch on idle
    }, { timeout: config.idle.delay });
  }
}

/**
 * Get prefetch manager instance
 */
export function getPrefetchManager() {
  return prefetchManager;
}

export default {
  PrefetchManager,
  prefetchManager,
  usePrefetch,
  withPrefetch,
  prefetchRoute,
  prefetchSidebarRoutes,
  setupIntersectionPrefetch,
  prefetchByConnection,
  prefetchConfig,
  setupPrefetchStrategy,
  getPrefetchManager,
};
