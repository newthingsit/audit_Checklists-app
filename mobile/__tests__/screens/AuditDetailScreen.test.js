import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AuditDetailScreen from '../../src/screens/AuditDetailScreen';
import axios from 'axios';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useLocation } from '../../src/context/LocationContext';

// Mock dependencies
jest.mock('axios');
jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
  useNavigation: jest.fn(),
}));
jest.mock('../../src/context/LocationContext', () => ({
  useLocation: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

// Mock LocationDisplay component
jest.mock('../../src/components/LocationCapture', () => ({
  LocationDisplay: ({ latitude, longitude, verified }) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return (
      <View testID="location-display">
        <Text>{verified ? 'Verified' : 'Not Verified'}</Text>
        <Text>{latitude}, {longitude}</Text>
      </View>
    );
  },
}));

describe('AuditDetailScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    addListener: jest.fn((event, callback) => {
      // Return unsubscribe function
      return jest.fn();
    }),
    setParams: jest.fn(),
  };

  const mockLocation = {
    getCurrentLocation: jest.fn(),
    calculateDistance: jest.fn(),
  };

  const mockRouteParams = {
    id: 1,
  };

  const mockAudit = {
    id: 1,
    restaurant_name: 'Test Restaurant',
    location: 'Test Location',
    template_name: 'Safety Audit',
    template_id: 1,
    status: 'completed',
    score: 85,
    total_items: 10,
    completed_items: 10,
    location_id: 1,
    gps_latitude: 40.7128,
    gps_longitude: -74.0060,
    location_verified: true,
  };

  const mockItems = [
    {
      id: 1,
      description: 'Item 1',
      status: 'completed',
      mark: 5,
      selected_option_id: null,
      comment: 'Good',
      photo_url: null,
    },
    {
      id: 2,
      description: 'Item 2',
      status: 'failed',
      mark: 2,
      selected_option_id: null,
      comment: 'Needs improvement',
      photo_url: null,
    },
  ];

  const mockTimeStats = {
    averageTime: 5.2,
    totalTime: 52,
    itemsWithTime: 8,
    totalItems: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useRoute.mockReturnValue({ params: mockRouteParams });
    useNavigation.mockReturnValue(mockNavigation);
    useLocation.mockReturnValue(mockLocation);
    
    axios.get.mockResolvedValue({
      data: {
        audit: mockAudit,
        items: mockItems,
        timeStats: mockTimeStats,
      },
    });
  });

  describe('Rendering', () => {
    it('should show loading indicator initially', () => {
      render(<AuditDetailScreen />);
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });

    it('should render audit details after loading', async () => {
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Restaurant')).toBeTruthy();
        expect(screen.getByText('Test Location')).toBeTruthy();
        expect(screen.getByText('Safety Audit')).toBeTruthy();
      });
    });

    it('should display status badge', async () => {
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByTestId('audit-status')).toBeTruthy();
        expect(screen.getByText('Completed')).toBeTruthy();
      });
    });

    it('should display score for completed audits', async () => {
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('85%')).toBeTruthy();
        expect(screen.getByText('Score')).toBeTruthy();
      });
    });

    it('should display progress bar', async () => {
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('10 / 10 items completed')).toBeTruthy();
      });
    });
  });

  describe('Audit Fetching', () => {
    it('should fetch audit data on mount', async () => {
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/audits/1')
        );
      });
    });

    it('should handle fetch errors gracefully', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));
      
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        // Should not crash, loading should stop
        expect(screen.queryByTestId('activity-indicator')).toBe(null);
      });
    });

    it('should display "Audit not found" when audit is null', async () => {
      axios.get.mockResolvedValue({
        data: {
          audit: null,
          items: [],
          timeStats: null,
        },
      });
      
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Audit not found')).toBeTruthy();
      });
    });
  });

  describe('Time Statistics', () => {
    it('should display time statistics when available', async () => {
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('⏱️ Item Making Performance')).toBeTruthy();
        expect(screen.getByText('5.2 min')).toBeTruthy();
        expect(screen.getByText('52 min')).toBeTruthy();
        expect(screen.getByText('8 / 10')).toBeTruthy();
      });
    });

    it('should not display time stats when not available', async () => {
      axios.get.mockResolvedValue({
        data: {
          audit: mockAudit,
          items: mockItems,
          timeStats: null,
        },
      });
      
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.queryByText('⏱️ Item Making Performance')).toBe(null);
      });
    });

    it('should not display time stats when no items have time', async () => {
      axios.get.mockResolvedValue({
        data: {
          audit: mockAudit,
          items: mockItems,
          timeStats: { ...mockTimeStats, itemsWithTime: 0 },
        },
      });
      
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.queryByText('⏱️ Item Making Performance')).toBe(null);
      });
    });
  });

  describe('In Progress Status', () => {
    it('should show "Continue Audit" button for in-progress audits', async () => {
      const inProgressAudit = { ...mockAudit, status: 'in_progress', score: null };
      axios.get.mockResolvedValue({
        data: {
          audit: inProgressAudit,
          items: mockItems,
          timeStats: null,
        },
      });
      
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Continue Audit')).toBeTruthy();
      });
    });

    it('should not show "Continue Audit" button for completed audits', async () => {
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.queryByText('Continue Audit')).toBe(null);
      });
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress correctly', async () => {
      const partialAudit = { 
        ...mockAudit, 
        status: 'in_progress',
        completed_items: 5,
        total_items: 10,
      };
      
      axios.get.mockResolvedValue({
        data: {
          audit: partialAudit,
          items: mockItems,
          timeStats: null,
        },
      });
      
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('5 / 10 items completed')).toBeTruthy();
      });
    });

    it('should handle 0% progress', async () => {
      const newAudit = { 
        ...mockAudit, 
        status: 'in_progress',
        completed_items: 0,
        total_items: 10,
      };
      
      axios.get.mockResolvedValue({
        data: {
          audit: newAudit,
          items: [],
          timeStats: null,
        },
      });
      
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('0 / 10 items completed')).toBeTruthy();
      });
    });

    it('should handle 100% progress', async () => {
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('10 / 10 items completed')).toBeTruthy();
      });
    });
  });

  describe('Status Display', () => {
    it('should display "In Progress" status correctly', async () => {
      const inProgressAudit = { ...mockAudit, status: 'in_progress' };
      axios.get.mockResolvedValue({
        data: {
          audit: inProgressAudit,
          items: mockItems,
          timeStats: null,
        },
      });
      
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('In Progress')).toBeTruthy();
      });
    });

    it('should display "Failed" status correctly', async () => {
      const failedAudit = { ...mockAudit, status: 'failed' };
      axios.get.mockResolvedValue({
        data: {
          audit: failedAudit,
          items: mockItems,
          timeStats: null,
        },
      });
      
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeTruthy();
      });
    });

    it('should display "Pending" status correctly', async () => {
      const pendingAudit = { ...mockAudit, status: 'pending' };
      axios.get.mockResolvedValue({
        data: {
          audit: pendingAudit,
          items: mockItems,
          timeStats: null,
        },
      });
      
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeTruthy();
      });
    });
  });

  describe('Location Display', () => {
    it('should display location when provided', async () => {
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Location')).toBeTruthy();
      });
    });

    it('should display "No location" when location is null', async () => {
      const noLocationAudit = { ...mockAudit, location: null };
      axios.get.mockResolvedValue({
        data: {
          audit: noLocationAudit,
          items: mockItems,
          timeStats: null,
        },
      });
      
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('No location')).toBeTruthy();
      });
    });
  });

  describe('ScrollView', () => {
    it('should render ScrollView with testID', async () => {
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByTestId('report-view')).toBeTruthy();
      });
    });

    it('should have accessibility label', async () => {
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('report-view')).toBeTruthy();
      });
    });
  });

  describe('Navigation Integration', () => {
    it('should add focus listener on mount', async () => {
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(mockNavigation.addListener).toHaveBeenCalledWith('focus', expect.any(Function));
      });
    });

    it('should refresh when route params include refresh flag', async () => {
      useRoute.mockReturnValue({ params: { id: 1, refresh: true } });
      
      render(<AuditDetailScreen />);
      
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
        expect(mockNavigation.setParams).toHaveBeenCalledWith({ refresh: false, refreshAuditDetail: false });
      });
    });
  });
});
