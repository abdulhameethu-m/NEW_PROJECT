let CookieManager: any = null;

try {
  const mod = require('@preeternal/react-native-cookie-manager');
  CookieManager = mod?.default || mod;
} catch {
  // Gracefully fallback if the native module is not registered in the current binary
}

export const clearCookies = async () => {
  try {
    if (CookieManager && typeof CookieManager.clearAll === 'function') {
      await CookieManager.clearAll();
    }
  } catch (error) {
    console.warn('Failed to clear native cookies:', error);
  }
};
