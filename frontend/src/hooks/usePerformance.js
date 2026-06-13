/**
 * Custom Performance Hooks
 * Hooks for performance monitoring and optimization
 */

import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { performanceMonitor } from '../utils/performanceMonitor';

/**
 * Hook to track component mount time
 */
export function useComponentPerformance(componentName) {
  const ref = useRef(null);
  const metricIdRef = useRef(null);

  useEffect(() => {
    metricIdRef.current = performanceMonitor.startMetric(`component_mount_${componentName}`);

    return () => {
      if (metricIdRef.current) {
        const duration = performanceMonitor.endMetric(metricIdRef.current, 'componentMountTimes');
        performanceMonitor.trackComponentMount(componentName, duration);
      }
    };
  }, [componentName]);

  return ref;
}

/**
 * Hook to track render time
 */
export function useRenderPerformance(componentName) {
  const renderCountRef = useRef(0);
  const lastRenderRef = useRef(0);

  useEffect(() => {
    renderCountRef.current++;
    const now = performance.now();

    if (lastRenderRef.current > 0) {
      const renderTime = now - lastRenderRef.current;

      if (renderTime > 100) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
        performanceMonitor.notifyObservers('slowRender', {
          component: componentName,
          duration: renderTime,
        });
      }
    }

    lastRenderRef.current = now;
  });

  return renderCountRef.current;
}

/**
 * Hook to debounce expensive operations
 */
export function useDebouncedValue(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook to throttle callback
 */
export function useThrottledCallback(callback, delay = 300) {
  const lastCallRef = useRef(0);

  return useCallback(
    (...args) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        return callback(...args);
      }
    },
    [callback, delay]
  );
}

/**
 * Hook for lazy loading components
 */
export function useLazyComponent(importFn, componentName) {
  const [Component, setComponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const metricId = performanceMonitor.startMetric(`lazy_component_${componentName}`);

    const loadComponent = async () => {
      try {
        const module = await importFn();
        const duration = performanceMonitor.endMetric(metricId, 'chunkLoadTimes');
        performanceMonitor.trackModuleLoad(componentName, duration);

        if (mounted) {
          setComponent(module.default || module);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
          setLoading(false);
          performanceMonitor.notifyObservers('componentLoadError', {
            component: componentName,
            error: err,
          });
        }
      }
    };

    loadComponent();

    return () => {
      mounted = false;
    };
  }, [importFn, componentName]);

  return { Component, loading, error };
}

/**
 * Hook to prefetch on intersection
 */
export function useIntersectionPrefetch(ref, importFn, moduleName) {
  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Prefetch the module
            importFn()
              .then(() => {
                performanceMonitor.notifyObservers('prefetchSuccess', {
                  module: moduleName,
                });
              })
              .catch(err => {
                console.warn(`Prefetch failed for ${moduleName}:`, err);
              });

            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '50px' }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, importFn, moduleName]);
}

/**
 * Hook to track API call performance
 */
export function useApiPerformance(endpoint) {
  const metricIdRef = useRef(null);

  const trackStart = useCallback(() => {
    metricIdRef.current = performanceMonitor.startMetric(`api_${endpoint}`);
  }, [endpoint]);

  const trackEnd = useCallback((status = 200) => {
    if (metricIdRef.current) {
      const duration = performanceMonitor.endMetric(metricIdRef.current, 'apiResponseTimes');
      performanceMonitor.trackApiCall(endpoint, duration, status);
    }
  }, [endpoint]);

  return { trackStart, trackEnd };
}

/**
 * Hook for memoized callback with dependency tracking
 */
export function useMemoizedCallback(callback, dependencies, onDependencyChange) {
  const memoCallback = useCallback(callback, dependencies);
  const prevDepsRef = useRef(dependencies);

  useEffect(() => {
    const depsChanged = JSON.stringify(prevDepsRef.current) !== JSON.stringify(dependencies);

    if (depsChanged && onDependencyChange) {
      onDependencyChange();
      prevDepsRef.current = dependencies;
    }
  }, [dependencies, onDependencyChange]);

  return memoCallback;
}

/**
 * Hook to detect slow renders and memory leaks
 */
export function useMemoryMonitor(componentName) {
  useEffect(() => {
    if (!('memory' in performance)) {
      return;
    }

    const checkMemory = () => {
      const memory = performance.memory;

      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
        console.warn(`High memory usage in ${componentName}: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`);
        performanceMonitor.notifyObservers('highMemoryUsage', {
          component: componentName,
          usedMemory: memory.usedJSHeapSize,
          heapLimit: memory.jsHeapSizeLimit,
        });
      }
    };

    const intervalId = setInterval(checkMemory, 5000);

    return () => clearInterval(intervalId);
  }, [componentName]);
}

/**
 * Hook to track visible elements (for intersection observer)
 */
export function useIntersectionObserver(options = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [options]);

  return { ref, isVisible };
}

/**
 * Hook to measure layout shifts
 */
export function useLayoutShiftDetection() {
  useEffect(() => {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            console.warn('Layout Shift detected:', entry.value);
            performanceMonitor.notifyObservers('layoutShift', {
              value: entry.value,
              timestamp: entry.startTime,
            });
          }
        }
      });

      observer.observe({ entryTypes: ['layout-shift'] });

      return () => observer.disconnect();
    } catch (e) {
      console.warn('Layout Shift Observer not supported');
    }
  }, []);
}

/**
 * Hook to batch state updates
 */
export function useBatchedState(initialState) {
  const [state, setState] = useState(initialState);
  const batchRef = useRef({});
  const timerRef = useRef(null);

  const updateBatch = useCallback((updates) => {
    Object.assign(batchRef.current, updates);

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, ...batchRef.current }));
      batchRef.current = {};
    }, 0);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return [state, updateBatch];
}

export default {
  useComponentPerformance,
  useRenderPerformance,
  useDebouncedValue,
  useThrottledCallback,
  useLazyComponent,
  useIntersectionPrefetch,
  useApiPerformance,
  useMemoizedCallback,
  useMemoryMonitor,
  useIntersectionObserver,
  useLayoutShiftDetection,
  useBatchedState,
};
