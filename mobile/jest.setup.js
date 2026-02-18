// Jest setup file for React Native testing

// Mock expo constants first
jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '2.1.4',
    extra: {},
  },
  default: {
    expoConfig: {
      version: '2.1.4',
      extra: {},
    },
  },
}));

// Mock expo modules
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'mock-token' })),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View: RNView } = require('react-native');
  return {
    LinearGradient: ({ children }) =>
      React.createElement(RNView, {}, children),
  };
});

// Mock @expo/vector-icons - CRITICAL for test suites
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View: RNView } = require('react-native');
  return {
    MaterialIcons: ({ name, size, color, testID }) =>
      React.createElement(RNView, { testID: testID || `icon-${name}` }),
    FontAwesome: ({ name, size, color, testID }) =>
      React.createElement(RNView, { testID: testID || `icon-${name}` }),
    AntDesign: ({ name, size, color, testID }) =>
      React.createElement(RNView, { testID: testID || `icon-${name}` }),
    Ionicons: ({ name, size, color, testID }) =>
      React.createElement(RNView, { testID: testID || `icon-${name}` }),
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(),
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn(),
  startTransaction: jest.fn(() => ({
    finish: jest.fn(),
  })),
  wrap: jest.fn((component) => component),
  ReactNativeTracing: jest.fn(),
  ReactNavigationInstrumentation: jest.fn(),
}));

// Mock AsyncStorage with in-memory implementation
const asyncStorageData = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((key, value) => {
    asyncStorageData[key] = value;
    return Promise.resolve();
  }),
  getItem: jest.fn((key) => Promise.resolve(asyncStorageData[key] || null)),
  removeItem: jest.fn((key) => {
    delete asyncStorageData[key];
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(asyncStorageData))),
  multiGet: jest.fn((keys) =>
    Promise.resolve(
      keys.map((key) => [key, asyncStorageData[key] || null])
    )
  ),
  multiSet: jest.fn((entries) => {
    entries.forEach(([ key, value ]) => {
      asyncStorageData[key] = value;
    });
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys) => {
    keys.forEach((key) => {
      delete asyncStorageData[key];
    });
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(asyncStorageData).forEach((key) => {
      delete asyncStorageData[key];
    });
    return Promise.resolve();
  }),
}));

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    defaults: {
      headers: {
        common: {},
      },
    },
  })),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
  defaults: {
    headers: {
      common: {},
    },
  },
}));

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Set up globals
global.__DEV__ = true;
