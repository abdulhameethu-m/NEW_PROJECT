/**
 * Performance Monitoring System
 * Tracks and reports frontend performance metrics
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoadTimes: [],
      chunkLoadTimes: [],
      renderTimes: [],
      apiResponseTimes: [],
      componentMountTimes: {},
      cacheHits: 0,
      cacheMisses: 0,
    };
    this.startTimes = new Map();
    this.observers = [];
    this.isProduction = import.meta.env.MODE === 'production';
  }

  /**
   * Start tracking a metric
   */
  startMetric(metricName) {
    const id = `${metricName}_${Date.now()}`;
    this.startTimes.set(id, performance.now());
    return id;
  }

  /**
   * End tracking and store metric
   */
  endMetric(metricId, category = 'general') {
    if (!this.startTimes.has(metricId)) {
      console.warn(`Metric ID not found: ${metricId}`);
      return null;
    }

    const startTime = this.startTimes.get(metricId);
    const endTime = performance.now();
    const duration = endTime - startTime;

    this.startTimes.delete(metricId);

    // Store metric based on category
    const categoryMetrics = this.metrics[category] || [];
    categoryMetrics.push({
      timestamp: new Date().toISOString(),
      duration,
      metricId,
    });

    if (!Array.isArray(this.metrics[category])) {
      this.metrics[category] = categoryMetrics;
    }

    return duration;
  }

  /**
   * Track module load time
   */
  trackModuleLoad(moduleName, duration) {
    this.metrics.chunkLoadTimes.push({
      module: moduleName,
      duration,
      timestamp: new Date().toISOString(),
      cached: duration < 100, // Assume cached if < 100ms
    });

    if (duration < 100) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }

    this.notifyObservers('moduleLoad', { moduleName, duration });
  }

  /**
   * Track API response time
   */
  trackApiCall(endpoint, duration, status) {
    this.metrics.apiResponseTimes.push({
      endpoint,
      duration,
      status,
      timestamp: new Date().toISOString(),
    });

    this.notifyObservers('apiCall', { endpoint, duration, status });
  }

  /**
   * Track component mount time
   */
  trackComponentMount(componentName, duration) {
    if (!this.metrics.componentMountTimes[componentName]) {
      this.metrics.componentMountTimes[componentName] = [];
    }

    this.metrics.componentMountTimes[componentName].push({
      duration,
      timestamp: new Date().toISOString(),
    });

    this.notifyObservers('componentMount', { componentName, duration });
  }

  /**
   * Track page load time
   */
  trackPageLoad(pageName, duration) {
    this.metrics.pageLoadTimes.push({
      page: pageName,
      duration,
      timestamp: new Date().toISOString(),
    });

    this.notifyObservers('pageLoad', { pageName, duration });
  }

  /**
   * Get Web Vitals metrics
   */
  getWebVitals() {
    const paintEntries = performance.getEntriesByType('paint');
    const navigationTiming = performance.getEntriesByType('navigation')[0];

    const vitals = {
      fcp: null, // First Contentful Paint
      lcp: null, // Largest Contentful Paint
      tti: null, // Time To Interactive
      cls: null, // Cumulative Layout Shift
      ttfb: null, // Time To First Byte
    };

    // FCP
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcpEntry) {
      vitals.fcp = fcpEntry.startTime;
    }

    // TTFB
    if (navigationTiming) {
      vitals.ttfb = navigationTiming.responseStart - navigationTiming.fetchStart;
    }

    // For LCP, CLS, TTI - these require PerformanceObserver
    // See setupWebVitalsObserver()

    return vitals;
  }

  /**
   * Get average metric
   */
  getAverageMetric(category) {
    const metrics = this.metrics[category];
    if (!Array.isArray(metrics) || metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + (m.duration || 0), 0);
    return sum / metrics.length;
  }

  /**
   * Get summary report
   */
  getSummaryReport() {
    return {
      totalPageLoads: this.metrics.pageLoadTimes.length,
      avgPageLoadTime: this.getAverageMetric('pageLoadTimes'),
      totalChunkLoads: this.metrics.chunkLoadTimes.length,
      avgChunkLoadTime: this.getAverageMetric('chunkLoadTimes'),
      totalApiCalls: this.metrics.apiResponseTimes.length,
      avgApiResponseTime: this.getAverageMetric('apiResponseTimes'),
      cacheHitRate: this.metrics.chunkLoadTimes.length > 0
        ? (this.metrics.cacheHits / this.metrics.chunkLoadTimes.length) * 100
        : 0,
      webVitals: this.getWebVitals(),
    };
  }

  /**
   * Subscribe to metric updates
   */
  subscribe(observer) {
    this.observers.push(observer);
    return () => {
      this.observers = this.observers.filter(o => o !== observer);
    };
  }

  /**
   * Notify all observers
   */
  notifyObservers(eventType, data) {
    this.observers.forEach(observer => {
      if (observer[eventType]) {
        observer[eventType](data);
      }
    });
  }

  /**
   * Send metrics to backend
   */
  async sendMetrics(endpoint = '/api/performance-metrics') {
    if (!this.isProduction) {
      console.log('Performance Metrics (Dev):', this.getSummaryReport());
      return;
    }

    try {
      const report = this.getSummaryReport();
      const payload = {
        ...report,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = {
      pageLoadTimes: [],
      chunkLoadTimes: [],
      renderTimes: [],
      apiResponseTimes: [],
      componentMountTimes: {},
      cacheHits: 0,
      cacheMisses: 0,
    };
    this.startTimes.clear();
  }

  /**
   * Get metrics for specific module
   */
  getModuleMetrics(moduleName) {
    return {
      loads: this.metrics.chunkLoadTimes.filter(m => m.module === moduleName),
      avgLoadTime: this.metrics.chunkLoadTimes
        .filter(m => m.module === moduleName)
        .reduce((sum, m) => sum + m.duration, 0) / 
        (this.metrics.chunkLoadTimes.filter(m => m.module === moduleName).length || 1),
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Setup Web Vitals observation
 */
export function setupWebVitalsObserver() {
  if ('web-vital' in window) {
    return;
  }

  // Observe Largest Contentful Paint
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        performanceMonitor.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
        performanceMonitor.notifyObservers('lcp', { lcp: performanceMonitor.metrics.lcp });
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // LCP observer not supported
    }

    // Observe Cumulative Layout Shift
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            performanceMonitor.metrics.cls = clsValue;
            performanceMonitor.notifyObservers('cls', { cls: clsValue });
          }
        }
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // CLS observer not supported
    }
  }

  window['web-vital'] = true;
}

export default performanceMonitor;
