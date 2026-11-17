/* eslint-env jest */
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  setContext: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-webview', () => {
  const mockReact = require('react');
  return {
    WebView: mockReact.forwardRef((props, ref) => null),
  };
});

jest.mock('expo-linking', () => ({
  parse: jest.fn((rawUrl) => {
    try {
      const u = new URL(rawUrl);
      const queryParams = {};
      u.searchParams.forEach((val, key) => {
        queryParams[key] = val;
      });
      return {
        path: u.pathname.replace(/^\//, ''),
        queryParams,
      };
    } catch {
      return { path: '', queryParams: {} };
    }
  }),
  createURL: jest.fn(),
  openURL: jest.fn().mockResolvedValue(true),
  canOpenURL: jest.fn().mockResolvedValue(true),
}));

require('@shopify/flash-list/jestSetup');
