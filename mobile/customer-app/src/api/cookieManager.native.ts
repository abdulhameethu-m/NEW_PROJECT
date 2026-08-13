import CookieManager from '@preeternal/react-native-cookie-manager';

export const clearCookies = async () => {
  try {
    await CookieManager.clearAll();
  } catch (error) {
    console.error('Failed to clear native cookies:', error);
  }
};
