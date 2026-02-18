module.exports = {
  preset: 'react-native',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Transform files - Transform React Native, Expo, and other ESM packages
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@sentry|@expo|expo|expo-.*)/)',
  ],
  
  // Module paths
  moduleFileExtensions: ['js', 'jsx', 'json'],
  
  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js'
  ],
  
  // Coverage
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/__tests__/**',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
  ],
  
  // Coverage thresholds - Per-file thresholds instead of global
  // Global thresholds disabled since we're building test coverage incrementally
  coverageThreshold: {
    './src/components/ErrorBoundary.js': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/config/sentry.js': {
      branches: 45,
      functions: 60,
      lines: 55,
      statements: 55,
    },
  },
  
  // Module name mapper for assets
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|svg|ttf|woff|woff2)$': '<rootDir>/__mocks__/fileMock.js',
  },
  
  // Globals
  globals: {
    __DEV__: true,
  },
};
