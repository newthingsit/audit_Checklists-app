/**
 * Integration Test Mock Providers
 * Provides all necessary contexts and navigation for integration tests
 * Service-layer mocking - no React component rendering
 */

// Mock context hooks
export const createMockAuthContext = (overrides = {}) => {
  const defaultAuth = {
    user: {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'auditor',
    },
    isLoggedIn: true,
    token: 'test-token-12345',
    permissions: ['canStartSchedule', 'canRescheduleSchedule', 'canEditAudit'],
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    hasPermission: jest.fn((perm) => defaultAuth.permissions.includes(perm)),
  };

  return { ...defaultAuth, ...overrides };
};

export const createMockLocationContext = (overrides = {}) => {
  const defaultLocation = {
    currentLocation: {
      latitude: 40.7128,
      longitude: -74.006,
      accuracy: 10,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: 0,
      speed: 0,
    },
    selectedLocationId: 1,
    locations: [
      {
        id: 1,
        name: 'Main Office',
        latitude: 40.7128,
        longitude: -74.006,
        address: '123 Main St, New York, NY',
      },
    ],
    isTracking: false,
    permissionStatus: 'granted',
    requestPermission: jest.fn(),
    startTracking: jest.fn(),
    stopTracking: jest.fn(),
    getDistance: jest.fn(() => 0.5),
  };

  return { ...defaultLocation, ...overrides };
};

export const createMockNetworkContext = (overrides = {}) => {
  const defaultNetwork = {
    isOnline: true,
    networkType: 'wifi',
    isConnected: true,
    checkConnection: jest.fn(),
    subscribeToNetworkChange: jest.fn(),
  };

  return { ...defaultNetwork, ...overrides };
};

export const createMockNotificationContext = (overrides = {}) => {
  const defaultNotification = {
    notifications: [],
    unreadCount: 0,
    hasPermission: true,
    requestPermission: jest.fn(),
    scheduleNotification: jest.fn(),
    sendNotification: jest.fn(),
    clearNotifications: jest.fn(),
    markAsRead: jest.fn(),
  };

  return { ...defaultNotification, ...overrides };
};

/**
 * Create mock navigation object
 */
export const createMockNavigation = () => {
  return {
    navigate: jest.fn(),
    push: jest.fn(),
    pop: jest.fn(),
    popToTop: jest.fn(),
    replace: jest.fn(),
    setParams: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    isFocused: jest.fn(() => true),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    getState: jest.fn(() => ({
      routes: [{ name: 'Dashboard' }],
      index: 0,
    })),
  };
};

/**
 * Create mock route object
 */
export const createMockRoute = (overrides = {}) => {
  return {
    key: 'screen-key',
    name: 'TestScreen',
    params: {},
    ...overrides,
  };
};

/**
 * Create mock focus/isFocused hooks
 */
export const createMockUseFocused = (isFocused = true) => {
  return jest.fn(() => isFocused);
};

/**
 * Integration test wrapper factory
 * Provides all contexts and navigation needed for integration tests (service layer only)
 */
export const createIntegrationTestWrapper = ({
  authContext = {},
  locationContext = {},
  networkContext = {},
  notificationContext = {},
  navigation = null,
  route = null,
} = {}) => {
  // Create context values
  const auth = createMockAuthContext(authContext);
  const location = createMockLocationContext(locationContext);
  const network = createMockNetworkContext(networkContext);
  const notification = createMockNotificationContext(notificationContext);
  const nav = navigation || createMockNavigation();
  const rt = route || createMockRoute();

  // Return context values for use in test assertions
  return {
    contexts: { auth, location, network, notification },
    navigation: nav,
    route: rt,
  };
};

/**
 * Mock all necessary React Navigation and Context hooks at test level
 * Call jest.mock() at the top of each test file before importing components
 */
export const setupContextMocks = (overrides = {}) => {
  const auth = createMockAuthContext(overrides.auth || {});
  const location = createMockLocationContext(overrides.location || {});
  const network = createMockNetworkContext(overrides.network || {});
  const notification = createMockNotificationContext(overrides.notification || {});
  const nav = overrides.navigation || createMockNavigation();
  const rt = overrides.route || createMockRoute();

  return { auth, location, network, notification, nav, rt };
};
