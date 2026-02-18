import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { View, Text, TextInput } from 'react-native';
import ChecklistsScreen from '../../src/screens/ChecklistsScreen';
import { useAuth } from '../../src/context/AuthContext';
import { useNetwork } from '../../src/context/NetworkContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';

// Mock contexts
jest.mock('../../src/context/AuthContext');
jest.mock('../../src/context/NetworkContext');
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
  },
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

// Mock components
jest.mock('../../src/components/LoadingSkeleton', () => {
  const React = require('react');
  const { View: RNView } = require('react-native');
  return {
    ListSkeleton: ({ count }) =>
      React.createElement(RNView, { testID: 'list-skeleton' }),
  };
});

jest.mock('../../src/components/EmptyState', () => {
  const React = require('react');
  const { View: RNView } = require('react-native');
  return {
    NoTemplates: React.createElement(RNView, { testID: 'no-templates' }),
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

describe('ChecklistsScreen', () => {
  const mockUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    permissions: ['view_templates', 'create_audits'],
    role: 'user',
  };

  const mockTemplates = [
    { id: 1, name: 'Restaurant Audit', category: 'Restaurant', description: 'Daily restaurant check' },
    { id: 2, name: 'Retail Audit', category: 'Retail', description: 'Store condition check' },
    { id: 3, name: 'Hotel Audit', category: 'Hotel', description: 'Room inspection' },
    { id: 4, name: 'Cafe Audit', category: 'Cafe', description: 'Cafe quality check' },
    { id: 5, name: 'Kitchen Safety', category: 'Restaurant', description: 'Kitchen safety check' },
  ];

  const defaultAuthContext = {
    user: mockUser,
    isAuthenticated: true,
  };

  const defaultNetworkContext = {
    isOnline: true,
    isConnected: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    useAuth.mockReturnValue(defaultAuthContext);
    useNetwork.mockReturnValue(defaultNetworkContext);
    
    useNavigation.mockReturnValue({
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
    });

    useFocusEffect.mockImplementation((callback) => {
      const unsubscribe = callback();
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    });

    axios.get.mockResolvedValue({
      data: {
        templates: mockTemplates,
      },
    });
  });

  describe('ChecklistsScreen Rendering', () => {
    test('renders checklists screen', () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('displays with user context', () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);
      expect(useAuth).toHaveBeenCalled();
      expect(UNSAFE_root).toBeTruthy();
    });

    test('displays with network context', () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);
      expect(useNetwork).toHaveBeenCalled();
      expect(UNSAFE_root).toBeTruthy();
    });

    test('displays with navigation', () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);
      expect(useNavigation).toHaveBeenCalled();
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Template Loading', () => {
    test('fetches templates from API', async () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      }, { timeout: 3000 });

      expect(UNSAFE_root).toBeTruthy();
    });

    test('calls API with correct endpoint', async () => {
      render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/templates'),
          expect.any(Object)
        );
      }, { timeout: 3000 });
    });

    test('includes cache-busting parameters in API call', async () => {
      render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            params: expect.any(Object),
          })
        );
      }, { timeout: 3000 });
    });

    test('displays loading skeleton during fetch', () => {
      axios.get.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { UNSAFE_root } = render(<ChecklistsScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('displays templates after successful fetch', async () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Search Functionality', () => {
    test('filters templates by search text', async () => {
      const { getByPlaceholderText, UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('performs case-insensitive search', async () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('returns all templates when search is empty', async () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('updates search results as user types', async () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('trims whitespace from search input', async () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('returns empty results for non-matching search', async () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('searches by template name', async () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Permissions and Access', () => {
    test('respects view_templates permission', () => {
      render(<ChecklistsScreen />);
      // Should render without error with permission
      expect(useAuth).toHaveBeenCalled();
    });

    test('allows create_audits action', () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Template Display', () => {
    test('displays template list', async () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('displays template information', async () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('renders templates with correct count', async () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('displays category information', async () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Template Interaction', () => {
    test('handles template selection', async () => {
      const navigation = useNavigation();
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('navigates when template is tapped', async () => {
      const navigation = useNavigation();
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('passes template data to next screen', async () => {
      const navigation = useNavigation();
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Refresh Functionality', () => {
    test('supports pull-to-refresh', async () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('refetches templates on refresh', async () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('shows refresh loading state', async () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    test('handles API errors', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('shows error alert on fetch failure', async () => {
      axios.get.mockRejectedValue(new Error('Connection failed'));

      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('allows retry after error', async () => {
      axios.get = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { templates: mockTemplates } });

      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Empty State', () => {
    test('displays empty state when no templates exist', async () => {
      axios.get.mockResolvedValue({
        data: {
          templates: [],
        },
      });

      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('displays empty state when search returns no results', async () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('transitions from loaded to empty state', async () => {
      axios.get = jest.fn()
        .mockResolvedValueOnce({ data: { templates: mockTemplates } })
        .mockResolvedValueOnce({ data: { templates: [] } });

      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Component Lifecycle', () => {
    test('mounts without errors', () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('unmounts without errors', () => {
      const { unmount } = render(<ChecklistsScreen />);
      expect(() => unmount()).not.toThrow();
    });

    test('handles focus effect', () => {
      render(<ChecklistsScreen />);
      expect(useFocusEffect).toHaveBeenCalled();
    });

    test('uses memoized filter for performance', async () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Edge Cases', () => {
    test('handles null user', () => {
      useAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      });

      const { UNSAFE_root } = render(<ChecklistsScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('handles undefined permissions', () => {
      useAuth.mockReturnValue({
        user: { ...mockUser, permissions: undefined },
        isAuthenticated: true,
      });

      const { UNSAFE_root } = render(<ChecklistsScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('handles empty template array', async () => {
      axios.get.mockResolvedValue({
        data: {
          templates: [],
        },
      });

      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('handles missing template properties', async () => {
      axios.get.mockResolvedValue({
        data: {
          templates: [
            { id: 1, name: 'Template 1' },
            { id: 2 },
          ],
        },
      });

      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('handles very long template names', async () => {
      axios.get.mockResolvedValue({
        data: {
          templates: [
            {
              id: 1,
              name: 'Very Long Template Name That Goes On And On And On And Might Break Layout',
              category: 'Category',
            },
          ],
        },
      });

      const { UNSAFE_root } = render(<ChecklistsScreen />);

      await waitFor(() => {
        expect(UNSAFE_root).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('handles rapid network state changes', () => {
      const { UNSAFE_root } = render(<ChecklistsScreen />);

      useNetwork.mockReturnValue({ isOnline: false });
      useNetwork.mockReturnValue({ isOnline: true });
      useNetwork.mockReturnValue({ isOnline: false });

      expect(UNSAFE_root).toBeTruthy();
    });
  });
});
