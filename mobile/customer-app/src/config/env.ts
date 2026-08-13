export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api',
  ENVIRONMENT: process.env.EXPO_PUBLIC_ENV || 'development',
  IS_DEV: process.env.EXPO_PUBLIC_ENV !== 'production',
};
