/**
 * Service Worker Registration and Management
 */

import { performanceMonitor } from './performanceMonitor';

/**
 * Register service worker
 */
export async function registerServiceWorker(swPath = '/sw.js') {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(swPath, {
      scope: '/',
    });

    console.log('Service Worker registered:', registration);

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          performanceMonitor.notifyObservers('swUpdate', {
            available: true,
          });
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
      console.log('Service Workers unregistered');
    } catch (error) {
      console.error('Failed to unregister service workers:', error);
    }
  }
}

/**
 * Cache specific URLs via service worker
 */
export function cacheUrls(urls) {
  if (!navigator.serviceWorker.controller) {
    console.warn('Service Worker not available');
    return Promise.reject(new Error('Service Worker not available'));
  }

  return new Promise((resolve, reject) => {
    const messageHandler = (event) => {
      if (event.data.type === 'CACHE_URLS_COMPLETE') {
        navigator.serviceWorker.controller.controller.removeEventListener('message', messageHandler);
        resolve();
      }
    };

    navigator.serviceWorker.controller.addEventListener('message', messageHandler);
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_URLS',
      payload: urls,
    });
  });
}

/**
 * Clear service worker cache
 */
export function clearServiceWorkerCache(cacheType = null) {
  if (!navigator.serviceWorker.controller) {
    console.warn('Service Worker not available');
    return;
  }

  navigator.serviceWorker.controller.postMessage({
    type: 'CLEAR_CACHE',
    payload: cacheType,
  });
}

/**
 * Get service worker cache size
 */
export function getServiceWorkerCacheSize() {
  if (!navigator.serviceWorker.controller) {
    return Promise.reject(new Error('Service Worker not available'));
  }

  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();

    channel.port1.onmessage = (event) => {
      if (event.data.type === 'CACHE_SIZE') {
        resolve(event.data.size);
      } else if (event.data.type === 'ERROR') {
        reject(new Error(event.data.error));
      }
    };

    navigator.serviceWorker.controller.postMessage(
      {
        type: 'GET_CACHE_SIZE',
      },
      [channel.port2]
    );
  });
}

/**
 * Skip waiting for new service worker
 */
export function skipWaitingServiceWorker() {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SKIP_WAITING',
    });
  }
}

/**
 * Setup service worker auto-update
 */
export async function setupServiceWorkerAutoUpdate(interval = 60000) {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await registerServiceWorker();

    if (!registration) {
      return;
    }

    // Check for updates periodically
    setInterval(() => {
      registration.update().catch(error => {
        console.error('Service Worker update check failed:', error);
      });
    }, interval);

    // Notify when update is ready
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        performanceMonitor.notifyObservers('swUpdated', {
          timestamp: new Date().toISOString(),
        });
      });
    }
  } catch (error) {
    console.error('Failed to setup service worker auto-update:', error);
  }
}

/**
 * Check if service worker is available
 */
export function isServiceWorkerAvailable() {
  return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
}

/**
 * Get service worker registration
 */
export async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.length > 0 ? registrations[0] : null;
  } catch (error) {
    console.error('Failed to get service worker registration:', error);
    return null;
  }
}

export default {
  registerServiceWorker,
  unregisterServiceWorker,
  cacheUrls,
  clearServiceWorkerCache,
  getServiceWorkerCacheSize,
  skipWaitingServiceWorker,
  setupServiceWorkerAutoUpdate,
  isServiceWorkerAvailable,
  getServiceWorkerRegistration,
};
