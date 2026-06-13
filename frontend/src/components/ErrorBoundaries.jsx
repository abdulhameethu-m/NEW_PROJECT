/**
 * Error Boundary System
 * Handles module failures gracefully without crashing the app
 */

import React from 'react';
import { performanceMonitor } from '../utils/performanceMonitor';

/**
 * Global Error Boundary
 */
export class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Global Error Boundary caught:', error, errorInfo);
    }

    // Track error in performance monitor
    performanceMonitor.notifyObservers('error', {
      error,
      errorInfo,
      errorCount: this.state.errorCount + 1,
    });

    // Send to backend in production
    if (import.meta.env.PROD) {
      this.reportError(error, errorInfo);
    }
  }

  reportError = async (error, errorInfo) => {
    try {
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.toString(),
          stack: errorInfo?.componentStack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        }),
      });
    } catch (err) {
      console.error('Failed to report error:', err);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full space-y-4 text-center">
            <div className="text-4xl">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
            <p className="text-gray-600">We're sorry for the inconvenience. Please try again.</p>

            {import.meta.env.DEV && this.state.error && (
              <details className="text-left">
                <summary className="cursor-pointer font-mono text-sm text-gray-600 hover:text-gray-900">
                  Error details
                </summary>
                <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-medium"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Module Error Boundary
 * Catches errors in module-level components
 */
export class ModuleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error(`Module Error in ${this.props.moduleName}:`, error, errorInfo);
    }

    performanceMonitor.notifyObservers('moduleError', {
      module: this.props.moduleName,
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-red-200 bg-red-50 rounded-lg">
          <h3 className="font-semibold text-red-900 mb-2">
            Failed to load {this.props.moduleName || 'module'}
          </h3>
          <p className="text-sm text-red-700 mb-4">
            This module encountered an error. Please try refreshing or navigating away and back.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 font-medium"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Component Error Boundary
 * Catches errors in individual components
 */
export class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error(
        `Component Error in ${this.props.componentName}:`,
        error,
        errorInfo
      );
    }

    performanceMonitor.notifyObservers('componentError', {
      component: this.props.componentName,
      error,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="inline-block p-4 border border-orange-200 bg-orange-50 rounded text-sm">
          <p className="text-orange-800">Failed to load component</p>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap component with error boundary
 */
export function withErrorBoundary(Component, { componentName, fallback = null } = {}) {
  const WrappedComponent = (props) => (
    <ComponentErrorBoundary componentName={componentName || Component.name}>
      {fallback || <Component {...props} />}
    </ComponentErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${componentName || Component.name})`;
  return WrappedComponent;
}

/**
 * Error boundary for async operations
 */
export class AsyncErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800 mb-2">An error occurred while loading this content.</p>
          <button
            onClick={this.handleRetry}
            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error logger middleware
 */
export function setupErrorLogger() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    performanceMonitor.notifyObservers('unhandledRejection', {
      reason: event.reason,
      timestamp: new Date().toISOString(),
    });
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    performanceMonitor.notifyObservers('globalError', {
      error: event.error,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
}

export default {
  GlobalErrorBoundary,
  ModuleErrorBoundary,
  ComponentErrorBoundary,
  withErrorBoundary,
  AsyncErrorBoundary,
  setupErrorLogger,
};
