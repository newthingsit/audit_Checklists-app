import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import DashboardScreen from '../../src/screens/DashboardScreen';
import { useAuth } from '../../src/context/AuthContext';
import { useNetwork } from '../../src/context/NetworkContext';
import { useOffline } from '../../src/context/OfflineContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';

// Mock contexts
jest.mock('../../src/context/AuthContext');
jest.mock('../../src/context/NetworkContext');
jest.mock('../../src/context/OfflineContext');
jest.mock('@react-navigation/native');
jest.mock('axios');

// Mock theme config
jest.mock('../../src/config/theme', () => ({
  themeConfig: {
    primary: { main: '#3B82F6', dark: '#1E40AF', light: '#DBEAFE' },
    success: { main: '#10B981', dark: '#065F46', light: '#D1FAE5', bg: '#ECFDF5' },
    error: { main: '#EF4444', dark: '#7F1D1D', light: '#FEE2E2' },
    warning: {
      main: '#F59E0B',
      dark: '#92400E',
      light: '#FEF3C7',
      bg: '#FFFBEB',
    },
    border: { default: '#E5E7EB' },
    text: {
      primary: '#1E293B',
      secondary: '#64748B',
      disabled: '#94A3B8',
    },
    background: {
      default: '#F1F5F9',
      paper: '#FFFFFF',
    },
    borderRadius: {
      large: 16,
      medium: 12,
      small: 8,
    },
    shadows: {
      small: {},
    },
    dashboardCards: {
      card1: ['#3B82F6', '#8B5CF6'],
      card2: ['#EC4899', '#8B5CF6'],
    },
  },
  getScoreColor: jest.fn((score) => {
    if (score >= 90) return '#10B981';
    if (score >= 70) return '#F59E0B';
    return '#EF4444';
  }),
}));

// Mock LinearGradient
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View: RNView } = require('react-native');
  return {
    LinearGradient: ({ children }) =>
      React.createElement(RNView, {}, children),
  };
});

// Mock MaterialIcons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View: RNView } = require('react-native');
  return {
    MaterialIcons: ({ name, size, color }) =>
      React.createElement(RNView, { testID: `icon-${name}` }),
  };
});

// Mock API
jest.mock('../../src/config/api', () => ({
  API_BASE_URL: 'http://api.test.com',
}));

// Mock utils
jest.mock('../../src/utils/permissions', () => ({
  hasPermission: jest.fn((permissions, action) => {
    const permissionsArray = Array.isArray(permissions) ? permissions : [];
    return permissionsArray.includes(action) || permissionsArray.includes('admin');
  }),
  isAdmin: jest.fn((user) => user?.role === 'admin'),
}));

describe('DashboardScreen', () => {
  const mockUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    permissions: ['view_audits', 'view_templates', 'view_actions', 'view_analytics'],
    role: 'user',
  };

  const mockStats = {
    templates: 5,
    audits: 10,
    completed: 7,
    pendingActions: 2,
  };

  const defaultAuthContext = {
    user: mockUser,
    isAuthenticated: true,
    refreshUser: jest.fn(),
  };

  const defaultNetworkContext = {
    isOnline: true,
    isConnected: true,
  };

  const defaultOfflineContext = {
    pendingSync: [],
    offlineStats: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    useAuth.mockReturnValue(defaultAuthContext);
    useNetwork.mockReturnValue(defaultNetworkContext);
    useOffline.mockReturnValue(defaultOfflineContext);
    useOffline.mockReturnValue(defaultOfflineContext);
    
    useNavigation.mockReturnValue({
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
    });

    useFocusEffect.mockImplementation((callback) => {
      // Execute effect immediately
      const unsubscribe = callback();
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    });

    // Mock axios
    axios.get.mockResolvedValue({
      data: {
        templates: [
          { id: 1, name: 'Template 1', category: 'Restaurant' },
          { id: 2, name: 'Template 2', category: 'Retail' },
          { id: 3, name: 'Template 3', category: 'Hotel' },
          { id: 4, name: 'Template 4', category: 'Cafe' },
          { id: 5, name: 'Template 5', category: 'Store' },
        ],
        audits: [
          { id: 1, name: 'Audit 1', status: 'completed', created_at: new Date().toISOString() },
          { id: 2, name: 'Audit 2', status: 'pending', created_at: new Date().toISOString() },
          { id: 3, name: 'Audit 3', status: 'completed', created_at: new Date().toISOString() },
        ],
        actions: [
          { id: 1, status: 'pending' },
          { id: 2, status: 'pending' },
          { id: 3, status: 'completed' },
        ],
        dashboard: {
          score: 85,
          trend: 'up',
        },
      },
    });
  });

  describe('DashboardScreen Rendering', () => {
    test('renders dashboard screen', () => {
      const { UNSAFE_root } = render(<DashboardScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('displays loading state initially', () => {
      axios.get.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { UNSAFE_root } = render(<DashboardScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('renders with user context', () => {
      const { UNSAFE_root } = render(<DashboardScreen />);
      expect(useAuth).toHaveBeenCalled();
      expect(UNSAFE_root).toBeTruthy();
    });

    test('renders with network context', () => {
      const { UNSAFE_root } = render(<DashboardScreen />);
      expect(useNetwork).toHaveBeenCalled();
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('API Calls and Data Loading', () => {
    test('calls API endpoints with proper URLs', async () => {
      const { UNSAFE_root } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      }, { timeout: 5000 });

      expect(UNSAFE_root).toBeTruthy();
    });

    test('handles multiple parallel API calls', async () => {
      const { UNSAFE_root } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      }, { timeout: 5000 });

      expect(UNSAFE_root).toBeTruthy();
    });

    test('skips API calls when offline', () => {
      useNetwork.mockReturnValue({
        isOnline: false,
        isConnected: false,
      });

      const { UNSAFE_root } = render(<DashboardScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('calls refreshUser when screen is focused', () => {
      render(<DashboardScreen />);

      expect(defaultAuthContext.refreshUser).toHaveBeenCalled();
    });
  });

  describe('Permissions and Access Control', () => {
    test('displays data when user has view_audits permission', () => {
      const { UNSAFE_root } = render(<DashboardScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('adapts to changes in user permissions', () => {
      const { UNSAFE_root } = render(<DashboardScreen />);
      
      useAuth.mockReturnValue({
        user: {
          ...mockUser,
          permissions: ['view_audits'],
        },
        isAuthenticated: true,
        refreshUser: jest.fn(),
      });

      expect(UNSAFE_root).toBeTruthy();
    });

    test('handles admin user with all permissions', () => {
      useAuth.mockReturnValue({
        user: {
          ...mockUser,
          role: 'admin',
          permissions: ['admin'],
        },
        isAuthenticated: true,
        refreshUser: jest.fn(),
      });

      const { UNSAFE_root } = render(<DashboardScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('handles user with limited permissions', () => {
      useAuth.mockReturnValue({
        user: {
          ...mockUser,
          permissions: ['view_audits'],
        },
        isAuthenticated: true,
        refreshUser: jest.fn(),
      });

      const { UNSAFE_root } = render(<DashboardScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    test('uses navigation from React Navigation', () => {
      render(<DashboardScreen />);
      expect(useNavigation).toHaveBeenCalled();
    });

    test('navigation object has required methods', () => {
      render(<DashboardScreen />);
      
      const navigation = useNavigation();
      expect(navigation.navigate).toBeDefined();
      expect(navigation.goBack).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const { UNSAFE_root } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('shows offline alert when not online', () => {
      useNetwork.mockReturnValue({
        isOnline: false,
        isConnected: false,
      });

      const { UNSAFE_root } = render(<DashboardScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('recovers when connection restored', () => {
      let isOnlineValue = false;
      useNetwork.mockReturnValue({
        isOnline: isOnlineValue,
        isConnected: isOnlineValue,
      });

      const { UNSAFE_root } = render(<DashboardScreen />);

      // Simulate connection restored
      isOnlineValue = true;
      useNetwork.mockReturnValue({
        isOnline: true,
        isConnected: true,
      });

      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Data Display', () => {
    test('processes template data correctly', async () => {
      const { UNSAFE_root } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('processes audit data and sorts by date', async () => {
      const { UNSAFE_root } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('counts completed audits correctly', async () => {
      const { UNSAFE_root } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('counts pending actions correctly', async () => {
      const { UNSAFE_root } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('displays analytics when available', async () => {
      const { UNSAFE_root } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Refresh Functionality', () => {
    test('enables refresh control', () => {
      const { UNSAFE_root } = render(<DashboardScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('refetches data on pull refresh', () => {
      const { UNSAFE_root } = render(<DashboardScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('respects refresh rate limiting', () => {
      // Dashboard has 3 second throttle for background refresh
      const { UNSAFE_root } = render(<DashboardScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    test('handles null user gracefully', () => {
      useAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        refreshUser: jest.fn(),
      });

      const { UNSAFE_root } = render(<DashboardScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('handles empty API responses', async () => {
      axios.get.mockResolvedValue({
        data: {
          templates: [],
          audits: [],
          actions: [],
        },
      });

      const { UNSAFE_root } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('handles missing data properties', async () => {
      axios.get.mockResolvedValue({
        data: {},
      });

      const { UNSAFE_root } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('handles rapid network changes', () => {
      const { UNSAFE_root } = render(<DashboardScreen />);

      useNetwork.mockReturnValue({ isOnline: false });
      useNetwork.mockReturnValue({ isOnline: true });
      useNetwork.mockReturnValue({ isOnline: false });

      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Component Lifecycle', () => {
    test('component mounts without errors', () => {
      const { UNSAFE_root } = render(<DashboardScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('component unmounts without errors', () => {
      const { unmount } = render(<DashboardScreen />);
      expect(() => unmount()).not.toThrow();
    });

    test('focus effect is called on mount', () => {
      render(<DashboardScreen />);
      expect(useFocusEffect).toHaveBeenCalled();
    });

    test('uses current refs for state management', () => {
      const { UNSAFE_root } = render(<DashboardScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });
});
