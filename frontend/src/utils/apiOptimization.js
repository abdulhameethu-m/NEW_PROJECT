/**
 * API Optimization and Caching System
 * Implements request deduplication, caching, and optimization
 */

import { performanceMonitor } from './performanceMonitor';

/**
 * Cache for API responses
 */
class ApiCache {
  constructor() {
    this.cache = new Map();
    this.timeouts = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Set cache item with TTL
   */
  set(key, value, ttl = this.defaultTTL) {
    // Clear existing timeout
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });

    // Set expiration timeout
    const timeout = setTimeout(() => {
      this.cache.delete(key);
      this.timeouts.delete(key);
    }, ttl);

    this.timeouts.set(key, timeout);
  }

  /**
   * Get cache item
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    const age = Date.now() - item.timestamp;
    if (age > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Check if key exists and is valid
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete cache item
   */
  delete(key) {
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
      this.timeouts.delete(key);
    }
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.cache.clear();
    this.timeouts.clear();
  }

  /**
   * Get cache size
   */
  size() {
    return this.cache.size;
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      items: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Request deduplication
 */
class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * Get or create pending request
   */
  getOrCreate(key, requestFn) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Clear pending request
   */
  clear(key) {
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all
   */
  clearAll() {
    this.pendingRequests.clear();
  }
}

// Singleton instances
const apiCache = new ApiCache();
const requestDeduplicator = new RequestDeduplicator();

/**
 * Optimized API client
 */
export class OptimizedApiClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
    this.cache = apiCache;
    this.deduplicator = requestDeduplicator;
    this.interceptors = {
      request: [],
      response: [],
      error: [],
    };
  }

  /**
   * Generate cache key
   */
  generateCacheKey(method, url, params) {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${method}:${url}:${paramStr}`;
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor) {
    this.interceptors.response.push(interceptor);
  }

  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor) {
    this.interceptors.error.push(interceptor);
  }

  /**
   * Make GET request
   */
  async get(url, options = {}) {
    const {
      params = null,
      cache = true,
      cacheTTL = apiCache.defaultTTL,
      deduplicate = true,
      timeout = 30000,
    } = options;

    const fullUrl = this.buildUrl(url, params);
    const cacheKey = this.generateCacheKey('GET', fullUrl, params);

    // Check cache
    if (cache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        performanceMonitor.notifyObservers('cacheHit', {
          endpoint: url,
          cached: true,
        });
        return cached;
      }
    }

    // Deduplicate requests
    if (deduplicate) {
      return this.deduplicator.getOrCreate(cacheKey, async () => {
        const response = await this.request('GET', fullUrl, null, { timeout });
        if (cache) {
          this.cache.set(cacheKey, response, cacheTTL);
        }
        return response;
      });
    }

    // Regular request
    const response = await this.request('GET', fullUrl, null, { timeout });
    if (cache) {
      this.cache.set(cacheKey, response, cacheTTL);
    }

    return response;
  }

  /**
   * Make POST request
   */
  async post(url, data, options = {}) {
    const { timeout = 30000 } = options;
    return this.request('POST', this.buildUrl(url), data, { timeout });
  }

  /**
   * Make PUT request
   */
  async put(url, data, options = {}) {
    const { timeout = 30000 } = options;
    return this.request('PUT', this.buildUrl(url), data, { timeout });
  }

  /**
   * Make PATCH request
   */
  async patch(url, data, options = {}) {
    const { timeout = 30000 } = options;
    return this.request('PATCH', this.buildUrl(url), data, { timeout });
  }

  /**
   * Make DELETE request
   */
  async delete(url, options = {}) {
    const { timeout = 30000 } = options;
    return this.request('DELETE', this.buildUrl(url), null, { timeout });
  }

  /**
   * Base request method
   */
  async request(method, url, data = null, options = {}) {
    const { timeout = 30000 } = options;

    const metricId = performanceMonitor.startMetric(`api_${method}_${url}`);
    const startTime = performance.now();

    let config = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Apply request interceptors
    for (const interceptor of this.interceptors.request) {
      config = await interceptor(config);
    }

    if (data) {
      config.body = JSON.stringify(data);
    }

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    config.signal = controller.signal;

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      const duration = performance.now() - startTime;
      performanceMonitor.endMetric(metricId, 'apiResponseTimes');
      performanceMonitor.trackApiCall(url, duration, response.status);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      let responseData = await response.json();

      // Apply response interceptors
      for (const interceptor of this.interceptors.response) {
        responseData = await interceptor(responseData);
      }

      return responseData;
    } catch (error) {
      clearTimeout(timeoutId);

      const duration = performance.now() - startTime;
      performanceMonitor.trackApiCall(url, duration, error.status || 'error');

      // Apply error interceptors
      for (const interceptor of this.interceptors.error) {
        await interceptor(error);
      }

      throw error;
    }
  }

  /**
   * Build full URL
   */
  buildUrl(path, params = null) {
    let url = this.baseURL + path;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      url = `${url}?${queryString}`;
    }
    return url;
  }

  /**
   * Invalidate cache
   */
  invalidateCache(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}

/**
 * Batch API requests
 */
export async function batchApiRequests(requests, options = {}) {
  const {
    parallel = true,
    timeout = 30000,
  } = options;

  const metricId = performanceMonitor.startMetric('batch_api_request');
  const startTime = performance.now();

  try {
    let results;

    if (parallel) {
      results = await Promise.all(
        requests.map(({ method, url, data }) =>
          fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: data ? JSON.stringify(data) : null,
          }).then(r => r.json())
        )
      );
    } else {
      results = [];
      for (const { method, url, data } of requests) {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: data ? JSON.stringify(data) : null,
        });
        results.push(await response.json());
      }
    }

    const duration = performance.now() - startTime;
    performanceMonitor.endMetric(metricId, 'apiResponseTimes');

    return results;
  } catch (error) {
    console.error('Batch API request failed:', error);
    throw error;
  }
}

/**
 * Create optimized client instance
 */
export function createOptimizedApiClient(baseURL = '') {
  return new OptimizedApiClient(baseURL);
}

/**
 * Global API client
 */
export const apiClient = createOptimizedApiClient(
  import.meta.env.VITE_API_URL || ''
);

// Setup auth interceptor
apiClient.addRequestInterceptor(async (config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default {
  OptimizedApiClient,
  createOptimizedApiClient,
  apiClient,
  batchApiRequests,
  ApiCache,
  RequestDeduplicator,
};
