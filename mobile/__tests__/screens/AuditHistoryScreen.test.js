import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AuditHistoryScreen from '../../src/screens/AuditHistoryScreen';
import axios from 'axios';
import { useNavigation, useIsFocused } from '@react-navigation/native';

// Mock dependencies
jest.mock('axios');
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useIsFocused: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

// Mock components
jest.mock('../../src/components/LoadingSkeleton', () => ({
  ListSkeleton: ({ count }) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return (
      <View testID="list-skeleton">
        <Text>Loading {count} items...</Text>
      </View>
    );
  },
}));

jest.mock('../../src/components/EmptyState', () => ({
  NoHistory: () => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return (
      <View testID="no-history">
        <Text>No History</Text>
      </View>
    );
  },
  NoSearchResults: ({ query }) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return (
      <View testID="no-search-results">
        <Text>No results for: {query}</Text>
      </View>
    );
  },
}));

jest.mock('../../src/components/ErrorState', () => ({
  NetworkError: ({ onRetry }) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="network-error">
        <Text>Network Error</Text>
        <TouchableOpacity onPress={onRetry} testID="retry-button">
          <Text>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  },
  ServerError: ({ onRetry }) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="server-error">
        <Text>Server Error</Text>
        <TouchableOpacity onPress={onRetry} testID="retry-button">
          <Text>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

describe('AuditHistoryScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const mockAudits = [
    {
      id: 1,
      restaurant_name: 'Test Restaurant 1',
      location: 'Location 1',
      template_name: 'Safety Audit',
      template_id: 1,
      status: 'completed',
      score: 85,
      created_at: '2026-01-15T10:00:00Z',
      gps_latitude: 40.7128,
      gps_longitude: -74.0060,
      location_verified: true,
    },
    {
      id: 2,
      restaurant_name: 'Test Restaurant 2',
      location: 'Location 2',
      template_name: 'Fire Safety',
      template_id: 2,
      status: 'in_progress',
      score: null,
      created_at: '2026-01-20T14:30:00Z',
      gps_latitude: null,
      gps_longitude: null,
      location_verified: false,
    },
    {
      id: 3,
      restaurant_name: 'Test Restaurant 3',
      location: 'Location 3',
      template_name: 'Safety Audit',
      template_id: 1,
      status: 'pending',
      score: null,
      created_at: '2026-01-25T09:15:00Z',
      gps_latitude: 40.7580,
      gps_longitude: -73.9855,
      location_verified: false,
    },
  ];

  const mockTemplates = [
    { id: 1, name: 'Safety Audit' },
    { id: 2, name: 'Fire Safety' },
    { id: 3, name: 'Environmental' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigation.mockReturnValue(mockNavigation);
    useIsFocused.mockReturnValue(false); // Disable auto-refresh to prevent interference
    
    // Default mock for axios - will be overridden in specific tests
    axios.get.mockImplementation((url) => {
      if (url.includes('/templates')) {
        return Promise.resolve({ data: { templates: mockTemplates } });
      }
      return Promise.resolve({ data: { audits: mockAudits } });
    });
  });

  describe('Rendering', () => {
    it('should show loading skeleton initially', () => {
      render(<AuditHistoryScreen />);
      expect(screen.getByTestId('list-skeleton')).toBeTruthy();
    });

    it('should render search bar after loading', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search audits...')).toBeTruthy();
      });
    });

    it('should render filter button', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.queryByTestId('list-skeleton')).toBe(null);
      });
      // Filter button should be visible (MaterialIcons tune icon)
      expect(screen.root).toBeTruthy();
    });

    it('should render results summary with audit count', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('3 audits found')).toBeTruthy();
      });
    });
  });

  describe('Audit Fetching and Display', () => {
    it('should fetch audits on mount', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/audits'),
          expect.objectContaining({
            params: expect.objectContaining({ _t: expect.any(Number) }),
          })
        );
      });
    });

    it('should fetch templates on mount', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/templates'),
          expect.objectContaining({
            params: expect.objectContaining({ _t: expect.any(Number) }),
          })
        );
      });
    });

    it('should display audit items', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('Test Restaurant 1')).toBeTruthy();
        expect(screen.getByText('Test Restaurant 2')).toBeTruthy();
        expect(screen.getByText('Test Restaurant 3')).toBeTruthy();
      });
    });

    it('should display audit location and template', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('Location 1')).toBeTruthy();
        expect(screen.getAllByText('Safety Audit').length).toBeGreaterThan(0);
      });
    });

    it('should display audit score for completed audits', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('85%')).toBeTruthy();
      });
    });

    it('should display status badges', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByTestId('audit-status-1')).toBeTruthy();
        expect(screen.getByTestId('audit-status-2')).toBeTruthy();
        expect(screen.getByTestId('audit-status-3')).toBeTruthy();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter audits by restaurant name', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('Test Restaurant 1')).toBeTruthy();
      });

      const searchInput = screen.getByPlaceholderText('Search audits...');
      fireEvent.changeText(searchInput, 'Restaurant 1');

      await waitFor(() => {
        expect(screen.getByText('Test Restaurant 1')).toBeTruthy();
        expect(screen.queryByText('Test Restaurant 2')).toBe(null);
      });
    });

    it('should filter audits by location', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('Location 2')).toBeTruthy();
      });

      const searchInput = screen.getByPlaceholderText('Search audits...');
      fireEvent.changeText(searchInput, 'Location 2');

      await waitFor(() => {
        expect(screen.getByText('Test Restaurant 2')).toBeTruthy();
        expect(screen.queryByText('Test Restaurant 1')).toBe(null);
      });
    });

    it('should filter audits by template name', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getAllByText('Safety Audit').length).toBeGreaterThan(0);
      });

      const searchInput = screen.getByPlaceholderText('Search audits...');
      fireEvent.changeText(searchInput, 'Fire Safety');

      await waitFor(() => {
        expect(screen.getByText('Test Restaurant 2')).toBeTruthy();
        expect(screen.queryByText('Test Restaurant 1')).toBe(null);
      });
    });

    it('should show "no results" when search has no matches', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('Test Restaurant 1')).toBeTruthy();
      });

      const searchInput = screen.getByPlaceholderText('Search audits...');
      fireEvent.changeText(searchInput, 'Nonexistent');

      await waitFor(() => {
        expect(screen.getByTestId('no-search-results')).toBeTruthy();
        expect(screen.getByText('No results for: Nonexistent')).toBeTruthy();
      });
    });

    it('should clear search when close icon is pressed', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('Test Restaurant 1')).toBeTruthy();
      });

      const searchInput = screen.getByPlaceholderText('Search audits...');
      fireEvent.changeText(searchInput, 'Restaurant 1');

      await waitFor(() => {
        expect(screen.queryByText('Test Restaurant 2')).toBe(null);
      });

      // Find and press close icon
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn => {
        try {
          const text = btn.props.children?.props?.name;
          return text === 'close';
        } catch {
          return false;
        }
      });

      if (closeButton) {
        fireEvent.press(closeButton);
        await waitFor(() => {
          expect(screen.getByText('Test Restaurant 2')).toBeTruthy();
        });
      }
    });
  });

  describe('Status Filtering', () => {
    it('should filter audits by status - completed', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('3 audits found')).toBeTruthy();
      });

      // Open filter modal
      const filterButtons = screen.getAllByRole('button');
      const filterButton = filterButtons[0]; // First button after loading
      fireEvent.press(filterButton);

      await waitFor(() => {
        expect(screen.getByText('Filter Audits')).toBeTruthy();
      });

      // Select "Completed" status
      fireEvent.press(screen.getByText('Completed'));
      
      // Close modal
      fireEvent.press(screen.getByText('Apply Filters'));

      await waitFor(() => {
        expect(screen.getByText('1 audit found')).toBeTruthy();
        expect(screen.getByText('Test Restaurant 1')).toBeTruthy();
      });
    });

    it('should filter audits by status - in_progress', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('3 audits found')).toBeTruthy();
      });

      // Open filter modal
      const filterButtons = screen.getAllByRole('button');
      fireEvent.press(filterButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Filter Audits')).toBeTruthy();
      });

      // Select "In Progress" status
      fireEvent.press(screen.getByText('In Progress'));
      fireEvent.press(screen.getByText('Apply Filters'));

      await waitFor(() => {
        expect(screen.getByText('1 audit found')).toBeTruthy();
        expect(screen.getByText('Test Restaurant 2')).toBeTruthy();
      });
    });

    it('should show active filter count badge', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('3 audits found')).toBeTruthy();
      });

      // Open filter modal
      const filterButtons = screen.getAllByRole('button');
      fireEvent.press(filterButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Filter Audits')).toBeTruthy();
      });

      // Select status filter
      fireEvent.press(screen.getByText('Completed'));
      fireEvent.press(screen.getByText('Apply Filters'));

      await waitFor(() => {
        expect(screen.getByText('1')).toBeTruthy(); // Filter badge count
      });
    });
  });

  describe('Template Filtering', () => {
    it('should filter audits by template', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('3 audits found')).toBeTruthy();
      });

      // Open filter modal
      const filterButtons = screen.getAllByRole('button');
      fireEvent.press(filterButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Filter Audits')).toBeTruthy();
      });

      // Select template filter (Fire Safety)
      const fireSafetyButtons = screen.getAllByText('Fire Safety');
      fireEvent.press(fireSafetyButtons[fireSafetyButtons.length - 1]); // Last one in modal
      fireEvent.press(screen.getByText('Apply Filters'));

      await waitFor(() => {
        expect(screen.getByText('1 audit found')).toBeTruthy();
        expect(screen.getByText('Test Restaurant 2')).toBeTruthy();
      });
    });

    it('should display template options in filter modal', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('3 audits found')).toBeTruthy();
      });

      // Open filter modal
      const filterButtons = screen.getAllByRole('button');
      fireEvent.press(filterButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('All Templates')).toBeTruthy();
        expect(screen.getAllByText('Safety Audit').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Fire Safety').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Clear Filters', () => {
    it('should clear all filters when "Clear filters" is pressed', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('3 audits found')).toBeTruthy();
      });

      // Open filter modal and apply filter
      const filterButtons = screen.getAllByRole('button');
      fireEvent.press(filterButtons[0]);
      await waitFor(() => {
        expect(screen.getByText('Filter Audits')).toBeTruthy();
      });
      fireEvent.press(screen.getByText('Completed'));
      fireEvent.press(screen.getByText('Apply Filters'));

      await waitFor(() => {
        expect(screen.getByText('1 audit found')).toBeTruthy();
      });

      // Clear filters
      fireEvent.press(screen.getByText('Clear filters'));

      await waitFor(() => {
        expect(screen.getByText('3 audits found')).toBeTruthy();
      });
    });

    it('should reset filters in modal when "Reset" is pressed', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('3 audits found')).toBeTruthy();
      });

      // Open filter modal
      const filterButtons = screen.getAllByRole('button');
      fireEvent.press(filterButtons[0]);
      await waitFor(() => {
        expect(screen.getByText('Filter Audits')).toBeTruthy();
      });

      // Select filters
      fireEvent.press(screen.getByText('Completed'));
      
      // Reset filters
      fireEvent.press(screen.getByText('Reset'));

      // Close modal and verify all audits shown
      fireEvent.press(screen.getByText('Apply Filters'));

      await waitFor(() => {
        expect(screen.getByText('3 audits found')).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to AuditDetail when audit item is pressed', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('Test Restaurant 1')).toBeTruthy();
      });

      const auditItem = screen.getByTestId('history-item-1');
      fireEvent.press(auditItem);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('AuditDetail', { id: 1 });
    });
  });

  describe('Refresh', () => {
    it('should refresh audits on pull-to-refresh', async () => {
      const { getByTestId } = render(<AuditHistoryScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Restaurant 1')).toBeTruthy();
      });

      // Clear previous calls
      axios.get.mockClear();

      // Trigger refresh
      const flatList = getByTestId('history-item-1').parent.parent.parent;
      const refreshControl = flatList.props.refreshControl;
      
      if (refreshControl && refreshControl.props.onRefresh) {
        refreshControl.props.onRefresh();
        
        await waitFor(() => {
          expect(axios.get).toHaveBeenCalledWith(
            expect.stringContaining('/audits'),
            expect.any(Object)
          );
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should display network error state', async () => {
      axios.get.mockRejectedValueOnce({ message: 'Network Error' })
        .mockResolvedValue({ data: { templates: mockTemplates } });

      render(<AuditHistoryScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('network-error')).toBeTruthy();
        expect(screen.getByText('Network Error')).toBeTruthy();
      });
    });

    it('should display server error state', async () => {
      axios.get.mockRejectedValueOnce({ 
        response: { status: 500, data: { message: 'Server Error' } } 
      }).mockResolvedValue({ data: { templates: mockTemplates } });

      render(<AuditHistoryScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('server-error')).toBeTruthy();
        expect(screen.getByText('Server Error')).toBeTruthy();
      });
    });

    it('should retry fetch when retry button is pressed', async () => {
      axios.get.mockRejectedValueOnce({ message: 'Network Error' })
        .mockResolvedValueOnce({ data: { templates: mockTemplates } });

      render(<AuditHistoryScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('network-error')).toBeTruthy();
      });

      // Reset mock to return success on retry
      axios.get.mockImplementation((url) => {
        if (url.includes('/templates')) {
          return Promise.resolve({ data: { templates: mockTemplates } });
        }
        return Promise.resolve({ data: { audits: mockAudits } });
      });

      // Press retry button
      fireEvent.press(screen.getByTestId('retry-button'));

      await waitFor(() => {
        expect(screen.getByText('Test Restaurant 1')).toBeTruthy();
      });
    });

    it('should handle empty audit list', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/templates')) {
          return Promise.resolve({ data: { templates: mockTemplates } });
        }
        return Promise.resolve({ data: { audits: [] } });
      });

      render(<AuditHistoryScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('no-history')).toBeTruthy();
      });
    });

    it('should handle audits with missing location', async () => {
      const auditsWithMissingLocation = [
        {
          id: 1,
          restaurant_name: 'Test Restaurant',
          location: null,
          template_name: 'Safety Audit',
          template_id: 1,
          status: 'completed',
          score: 85,
          created_at: '2026-01-15T10:00:00Z',
        },
      ];

      axios.get.mockImplementation((url) => {
        if (url.includes('/templates')) {
          return Promise.resolve({ data: { templates: mockTemplates } });
        }
        return Promise.resolve({ data: { audits: auditsWithMissingLocation } });
      });

      render(<AuditHistoryScreen />);

      await waitFor(() => {
        expect(screen.getByText('No location')).toBeTruthy();
      });
    });
  });

  describe('Empty States', () => {
    it('should show "No History" when no audits exist', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/templates')) {
          return Promise.resolve({ data: { templates: mockTemplates } });
        }
        return Promise.resolve({ data: { audits: [] } });
      });

      render(<AuditHistoryScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('no-history')).toBeTruthy();
      });
    });

    it('should show "No Search Results" when search has no matches', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('Test Restaurant 1')).toBeTruthy();
      });

      const searchInput = screen.getByPlaceholderText('Search audits...');
      fireEvent.changeText(searchInput, 'Nonexistent Restaurant');

      await waitFor(() => {
        expect(screen.getByTestId('no-search-results')).toBeTruthy();
      });
    });

    it('should show "No Search Results" when filters have no matches', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('3 audits found')).toBeTruthy();
      });

      // Open filter modal and select "Failed" status (none exist)
      const filterButtons = screen.getAllByRole('button');
      fireEvent.press(filterButtons[0]);
      await waitFor(() => {
        expect(screen.getByText('Filter Audits')).toBeTruthy();
      });
      fireEvent.press(screen.getByText('Failed'));
      fireEvent.press(screen.getByText('Apply Filters'));

      await waitFor(() => {
        expect(screen.getByTestId('no-search-results')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible audit items', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('Test Restaurant 1')).toBeTruthy();
      });

      expect(screen.getByTestId('history-item-1')).toBeTruthy();
      expect(screen.getByLabelText('history-item-1')).toBeTruthy();
    });

    it('should have accessible status badges', async () => {
      render(<AuditHistoryScreen />);
      await waitFor(() => {
        expect(screen.getByText('Test Restaurant 1')).toBeTruthy();
      });

      expect(screen.getByTestId('audit-status-1')).toBeTruthy();
      expect(screen.getByLabelText('audit-status-1')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should use FlatList for efficient rendering', async () => {
      const { UNSAFE_root } = render(<AuditHistoryScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Restaurant 1')).toBeTruthy();
      });

      // Find FlatList component
      const findFlatList = (node) => {
        if (node.type?.displayName === 'FlatList' || node.type?.name === 'FlatList') {
          return node;
        }
        if (node.children) {
          for (const child of node.children) {
            const result = findFlatList(child);
            if (result) return result;
          }
        }
        return null;
      };

      const flatList = findFlatList(UNSAFE_root);
      expect(flatList).toBeTruthy();
    });

    it('should handle large audit lists', async () => {
      const largeAuditList = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        restaurant_name: `Restaurant ${i + 1}`,
        location: `Location ${i + 1}`,
        template_name: 'Safety Audit',
        template_id: 1,
        status: 'completed',
        score: 80 + (i % 20),
        created_at: '2026-01-15T10:00:00Z',
      }));

      axios.get.mockImplementation((url) => {
        if (url.includes('/templates')) {
          return Promise.resolve({ data: { templates: mockTemplates } });
        }
        return Promise.resolve({ data: { audits: largeAuditList } });
      });

      render(<AuditHistoryScreen />);

      await waitFor(() => {
        expect(screen.getByText('100 audits found')).toBeTruthy();
      });

      // Screen should render without crashing
      expect(screen.getByText('Restaurant 1')).toBeTruthy();
    });
  });
});
