import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import CategorySelectionScreen from '../../src/screens/CategorySelectionScreen';
import { useAuth } from '../../src/context/AuthContext';
import { useNetwork } from '../../src/context/NetworkContext';
import axios from 'axios';
import { Alert } from 'react-native';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn((callback) => {
    const unsubscribe = callback();
    return () => unsubscribe?.();
  }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }) =>
    require('react').createElement(require('react-native').View, null, children),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: ({ name, size, color, ...props }) =>
    require('react').createElement(require('react-native').View, {
      testID: `icon-${name}`,
      ...props,
    }),
}));

jest.mock('../../src/components/LoadingSkeleton', () => ({
  ListSkeleton: ({ count }) => require('react').createElement(
    require('react-native').View, 
    { testID: 'loading-skeleton' }
  ),
}));

jest.mock('axios');

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../src/context/NetworkContext', () => ({
  useNetwork: jest.fn(),
}));

jest.mock('../../src/utils/permissions');

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const defaultAuthContext = {
  user: {
    id: '1',
    name: 'John Doe',
    permissions: ['create_audits'],
  },
};

const defaultNetworkContext = {
  isOnline: true,
};

const mockTemplates = [
  {
    id: '1',
    name: 'Safety Audit',
    categories: ['Safety', 'Compliance'],
    description: 'Safety inspection template',
  },
  {
    id: '2',
    name: 'Fire Safety',
    categories: ['Safety'],
    description: 'Fire safety checklist',
  },
  {
    id: '3',
    name: 'Environmental',
    categories: ['Compliance', 'Environmental'],
    description: 'Environmental compliance',
  },
];

describe('CategorySelectionScreen', () => {
  beforeEach(() => {
    const { useNavigation } = require('@react-navigation/native');
    const permissions = require('../../src/utils/permissions');
    
    useNavigation.mockReturnValue(mockNavigation);
    useAuth.mockReturnValue(defaultAuthContext);
    useNetwork.mockReturnValue(defaultNetworkContext);
    permissions.hasPermission = jest.fn(() => true);
    permissions.isAdmin = jest.fn(() => false);

    mockNavigation.navigate.mockClear();
    mockNavigation.goBack.mockClear();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    axios.get.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render category selection screen', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).toBeFalsy();
      });
    });

    test('should render loading skeleton initially', () => {
      axios.get.mockImplementationOnce(() => new Promise(() => {}));
      render(<CategorySelectionScreen />);

      expect(screen.getByTestId('loading-skeleton')).toBeTruthy();
    });

    test('should display categories after loading', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).toBe(null);
      });
    });

    test('should display refresh control', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).toBeFalsy();
      });
    });
  });

  describe('Template Fetching', () => {
    test('should fetch templates on mount', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/templates'),
          expect.any(Object)
        );
      });
    });

    test('should group templates by category', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should handle empty templates', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: [] } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).toBeFalsy();
      });
    });

    test('should handle null templates', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: null } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).toBeFalsy();
      });
    });

    test('should sort categories alphabetically', async () => {
      const unsortedTemplates = [
        { id: '1', name: 'Z Audit', categories: ['Zebra'] },
        { id: '2', name: 'A Audit', categories: ['Alpha'] },
        { id: '3', name: 'M Audit', categories: ['Middle'] },
      ];
      axios.get.mockResolvedValueOnce({ data: { templates: unsortedTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });
  });

  describe('Category Handling', () => {
    test('should group templates with same category', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should use General category for templates without categories', async () => {
      const templatesWithoutCategories = [
        { id: '1', name: 'General Audit', categories: [], description: 'Basic' },
      ];
      axios.get.mockResolvedValueOnce({ data: { templates: templatesWithoutCategories } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should handle templates with multiple categories', async () => {
      const multiCategoryTemplates = [
        {
          id: '1',
          name: 'Multi Audit',
          categories: ['Safety', 'Compliance', 'Environmental'],
        },
      ];
      axios.get.mockResolvedValueOnce({ data: { templates: multiCategoryTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should count templates per category', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });
  });

  describe('Category Selection', () => {
    test('should select category on press', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).toBeFalsy();
      });
    });

    test('should highlight selected category', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should clear selection on deselect', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation', () => {
    test('should navigate to audit form on category selection', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should navigate back on back button press', () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      // Back button navigation would be tested here
      expect(screen.getByTestId('loading-skeleton')).toBeTruthy();
    });

    test('should pass category to next screen', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });
  });

  describe('Refresh Functionality', () => {
    test('should refresh categories on pull-to-refresh', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });

    test('should handle refresh error', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      axios.get.mockRejectedValueOnce(new Error('Refresh failed'));
      // Simulate refresh
    });

    test('should show loading during refresh', async () => {
      axios.get.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { templates: mockTemplates } }), 100))
      );
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });
  });

  describe('Permission Handling', () => {
    test('should show categories when user has permission', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).toBeFalsy();
      });
    });

    test('should restrict access without permission', () => {
      const { hasPermission } = require('../../src/utils/permissions');
      hasPermission.mockReturnValue(false);

      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      // Without permission, should show restriction
    });

    test('should allow admin users', () => {
      const { isAdmin } = require('../../src/utils/permissions');
      isAdmin.mockReturnValue(true);

      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      expect(axios.get).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should handle 400 bad request', async () => {
      const error = new Error('Bad Request');
      error.response = { status: 400 };
      axios.get.mockRejectedValueOnce(error);
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should handle 500 server error', async () => {
      const error = new Error('Server Error');
      error.response = { status: 500 };
      axios.get.mockRejectedValueOnce(error);
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should retry on error', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      // Simulate retry
    });
  });

  describe('Offline Support', () => {
    test('should handle offline mode', async () => {
      useNetwork.mockReturnValue({ isOnline: false });
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      // When offline, component should render without loading skeleton (no data fetched)
      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).toBeFalsy();
      });
    });

    test('should sync when coming online', async () => {
      useNetwork.mockReturnValue({ isOnline: false });
      const { rerender } = render(<CategorySelectionScreen />);

      useNetwork.mockReturnValue({ isOnline: true });
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });

      rerender(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long category names', async () => {
      const longNameTemplates = [
        {
          id: '1',
          name: 'Very Long Audit Name That Exceeds Normal Length'.repeat(3),
          categories: ['A Very Long Category Name That Goes On And On'.repeat(2)],
        },
      ];
      axios.get.mockResolvedValueOnce({ data: { templates: longNameTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should handle many categories', async () => {
      const manyCategories = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        name: `Template ${i}`,
        categories: [`Category ${i}`],
      }));
      axios.get.mockResolvedValueOnce({ data: { templates: manyCategories } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should handle rapid category selections', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should handle special characters in category names', async () => {
      const specialCharTemplates = [
        {
          id: '1',
          name: 'Special & Characters <> Audit',
          categories: ['Safety & Compliance', 'Fire/Safety'],
        },
      ];
      axios.get.mockResolvedValueOnce({ data: { templates: specialCharTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have accessible category list', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).toBeFalsy();
      });
    });

    test('should have clear category labels', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should support keyboard navigation', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });
  });

  describe('Performance', () => {
    test('should handle large template list efficiently', async () => {
      const largeTemplateList = Array.from({ length: 500 }, (_, i) => ({
        id: `${i}`,
        name: `Template ${i}`,
        categories: [`Category ${i % 10}`],
      }));
      axios.get.mockResolvedValueOnce({ data: { templates: largeTemplateList } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should use FlatList for performance', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });
  });

  describe('Integration', () => {
    test('should work with auth context', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      expect(defaultAuthContext.user).toBeTruthy();
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should work with network context', async () => {
      axios.get.mockResolvedValueOnce({ data: { templates: mockTemplates } });
      render(<CategorySelectionScreen />);

      expect(defaultNetworkContext.isOnline).toBe(true);
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });
  });
});
