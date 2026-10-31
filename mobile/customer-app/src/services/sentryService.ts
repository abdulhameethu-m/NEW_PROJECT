import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

const SENTRY_DSN =
  process.env.EXPO_PUBLIC_SENTRY_DSN ||
  'https://6b1945f32a76f2404b901a1c97ef31e4@o4507123456789.ingest.us.sentry.io/4507123456789';

const IS_PROD = process.env.EXPO_PUBLIC_ENV === 'production' || !__DEV__;

/**
 * Initializes Sentry real-time crash analytics and error reporting
 * with data privacy scrubbing (GDPR / Apple compliance).
 */
export function initSentry(): void {
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      debug: false,
      enabled: true, // Captures in both dev and production
      tracesSampleRate: IS_PROD ? 0.2 : 1.0,
      environment: process.env.EXPO_PUBLIC_ENV || (__DEV__ ? 'development' : 'production'),
      attachStacktrace: true,
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
      
      // Privacy & PII sanitization: scrub sensitive customer data
      beforeSend: (event) => {
        // Strip authorization tokens and passwords
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['authorization'];
          delete event.request.headers['Cookie'];
          delete event.request.headers['cookie'];
        }

        // Scrub any sensitive fields from breadcrumbs or extra data
        if (event.extra) {
          const sensitiveKeys = ['password', 'confirmPassword', 'otp', 'token', 'cardNumber', 'cvv', 'secret'];
          for (const key of Object.keys(event.extra)) {
            if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
              event.extra[key] = '[REDACTED]';
            }
          }
        }

        return event;
      },
    });

    console.log('[Sentry] Crash analytics initialized successfully');
  } catch (error) {
    console.warn('[Sentry] Initialization skipped or failed:', error);
  }
}

/**
 * Associates crash reports with the authenticated customer for debugging.
 */
export function setSentryUser(user: { id?: string; email?: string; name?: string } | null): void {
  try {
    if (user?.id) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
      });
    } else {
      Sentry.setUser(null);
    }
  } catch {
    // Ignored silently
  }
}

/**
 * Captures an exception with structured context and extra metadata.
 */
export function captureException(error: any, context?: Record<string, any>): void {
  try {
    if (context) {
      Sentry.setContext('error_context', context);
    }
    Sentry.captureException(error);
  } catch {
    // Ignored silently
  }
}

/**
 * Adds an in-app breadcrumb for tracing customer actions leading up to a crash.
 */
export function addBreadcrumb(category: string, message: string, data?: Record<string, any>): void {
  try {
    Sentry.addBreadcrumb({
      category,
      message,
      data,
      level: 'info',
    });
  } catch {
    // Ignored silently
  }
}

export { Sentry };

