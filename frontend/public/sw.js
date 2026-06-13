/**
 * Service Worker
 * Handles caching, offline support, and performance optimization
 */

const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  static: `static-${CACHE_VERSION}`,
  dynamic: `dynamic-${CACHE_VERSION}`,
  api: `api-${CACHE_VERSION}`,
  images: `images-${CACHE_VERSION}`,
};

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.warn('Failed to cache static assets:', error);
      });
    })
  );
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old cache versions
          if (
            !Object.values(CACHE_NAMES).includes(cacheName) &&
            cacheName.includes('v')
          ) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

/**
 * Fetch event - implement caching strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Route-specific caching strategies
  if (url.pathname.match(/\.(js|css)$/)) {
    // Cache chunks and styles - cache first
    event.respondWith(cacheChunkStrategy(request));
  } else if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/i)) {
    // Cache images - cache first with update
    event.respondWith(cacheImageStrategy(request));
  } else if (url.pathname.startsWith('/api/')) {
    // API calls - network first with cache fallback
    event.respondWith(networkFirstApiStrategy(request));
  } else {
    // HTML and other - network first
    event.respondWith(networkFirstStrategy(request));
  }
});

/**
 * Cache-first strategy for chunks and CSS
 */
async function cacheChunkStrategy(request) {
  try {
    const cache = await caches.open(CACHE_NAMES.static);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    const response = await fetch(request);

    if (!response.ok) {
      return response;
    }

    // Cache successful response
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    console.error('Chunk cache strategy error:', error);
    return new Response('Offline - resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Cache-first strategy for images with update
 */
async function cacheImageStrategy(request) {
  try {
    const cache = await caches.open(CACHE_NAMES.images);
    const cached = await cache.match(request);

    // Return cached image
    if (cached) {
      // Update cache in background
      fetch(request)
        .then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
        })
        .catch(() => {
          // Ignore errors in background update
        });

      return cached;
    }

    // Fetch and cache new image
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('Image cache strategy error:', error);
    
    // Return placeholder if offline
    if (cached) {
      return cached;
    }

    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#ccc" width="100" height="100"/></svg>',
      {
        headers: { 'Content-Type': 'image/svg+xml' },
        status: 503,
      }
    );
  }
}

/**
 * Network-first strategy for API calls
 */
async function networkFirstApiStrategy(request) {
  try {
    // Try network first
    const response = await fetch(request);

    if (response.ok) {
      // Cache successful response
      const cache = await caches.open(CACHE_NAMES.api);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed, try cache
    try {
      const cache = await caches.open(CACHE_NAMES.api);
      const cached = await cache.match(request);

      if (cached) {
        return cached;
      }

      // No cache available
      return new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (cacheError) {
      console.error('API cache strategy error:', cacheError);
      return new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}

/**
 * Network-first strategy for HTML
 */
async function networkFirstStrategy(request) {
  try {
    // Try network first
    const response = await fetch(request);

    if (response.ok) {
      // Cache successful response
      const cache = await caches.open(CACHE_NAMES.dynamic);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed, try cache
    try {
      const cache = await caches.open(CACHE_NAMES.dynamic);
      const cached = await cache.match(request);

      if (cached) {
        return cached;
      }

      // Try root/index.html as fallback
      return cache.match('/');
    } catch (cacheError) {
      console.error('Network-first strategy error:', cacheError);
      return new Response('Offline - please check your connection', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }
}

/**
 * Message handling for cache management
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'CACHE_URLS':
      handleCacheUrls(payload);
      break;

    case 'CLEAR_CACHE':
      handleClearCache(payload);
      break;

    case 'GET_CACHE_SIZE':
      handleGetCacheSize(event);
      break;

    default:
      break;
  }
});

/**
 * Cache specific URLs
 */
async function handleCacheUrls(urls) {
  try {
    const cache = await caches.open(CACHE_NAMES.dynamic);
    await cache.addAll(urls);
  } catch (error) {
    console.error('Failed to cache URLs:', error);
  }
}

/**
 * Clear specific cache
 */
async function handleClearCache(cacheType) {
  try {
    const cacheName = CACHE_NAMES[cacheType] || cacheType;
    await caches.delete(cacheName);
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

/**
 * Get cache size
 */
async function handleGetCacheSize(event) {
  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      totalSize += keys.length;
    }

    event.ports[0].postMessage({ type: 'CACHE_SIZE', size: totalSize });
  } catch (error) {
    console.error('Failed to get cache size:', error);
    event.ports[0].postMessage({ type: 'ERROR', error: error.message });
  }
}

// Log service worker status
console.log('Service Worker initialized');
