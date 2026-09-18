import { LogBox } from 'react-native';

/**
 * Configure global error handling for the mobile app:
 * 1. Suppresses all on-screen LogBox warnings and RedBox error popups/banners so users are not disturbed.
 * 2. Routes all errors to the Metro / Expo developer terminal.
 */
export function initErrorHandler() {
  // 1. Suppress all on-screen error/warning overlays & popups in the mobile app UI
  LogBox.ignoreAllLogs(true);

  // 2. Route global JS uncaught exceptions to the terminal
  const globalAny = (typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : {}) as any;
  if (globalAny.ErrorUtils) {
    const originalHandler = globalAny.ErrorUtils.getGlobalHandler?.();
    globalAny.ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      console.error(
        `\n🛑 [MOBILE TERMINAL ERROR] ${isFatal ? '(FATAL) ' : ''}EXCEPTION:\n` +
        `  Message: ${error?.message || error}\n` +
        (error?.stack ? `  Stack:\n${error.stack}\n` : '')
      );

      // In production, let default handler cleanly close/restart if fatal
      if (!__DEV__ && originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }

  // 3. Catch unhandled promise rejections on web/platforms with window
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('unhandledrejection', (event) => {
      console.error(
        `\n🛑 [MOBILE TERMINAL ERROR] UNHANDLED PROMISE REJECTION:\n` +
        `  Reason: ${event.reason?.message || event.reason}\n` +
        (event.reason?.stack ? `  Stack:\n${event.reason.stack}\n` : '')
      );
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
    });
  }
}

/**
 * Explicit helper to log errors cleanly to the terminal instead of showing them in UI
 */
export function logToTerminal(tag: string, error: any) {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.message ||
    String(error);
  const status = error?.response?.status;
  const data = error?.response?.data;

  console.error(
    `\n📱 [TERMINAL: ${tag}]` +
    (status ? ` [HTTP ${status}]` : '') +
    `\n  Message: ${message}` +
    (data ? `\n  Data: ${JSON.stringify(data, null, 2)}` : '') +
    (error?.stack ? `\n  Stack:\n${error.stack}` : '') +
    '\n'
  );
}
