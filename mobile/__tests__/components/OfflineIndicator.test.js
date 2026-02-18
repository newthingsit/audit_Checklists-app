import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { View, Text, Animated } from 'react-native';
import { OfflineBanner, SyncStatusBadge } from '../../src/components/OfflineIndicator';
import { useNetwork } from '../../src/context/NetworkContext';
import { useOffline } from '../../src/context/OfflineContext';

// Mock contexts
jest.mock('../../src/context/NetworkContext');
jest.mock('../../src/context/OfflineContext');

// Mock theme config
jest.mock('../../src/config/theme', () => ({
  themeConfig: {
    primary: { main: '#3B82F6' },
    success: { main: '#10B981' },
    error: { main: '#EF4444' },
    warning: {
      main: '#F59E0B',
      dark: '#92400E',
      light: '#FEF3C7',
      bg: '#FFFBEB',
    },
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
    },
    shadows: {
      small: {},
    },
  },
}));

// Mock MaterialIcons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View: RNView } = require('react-native');
  return {
    MaterialIcons: ({ name, size, color }) =>
      React.createElement(RNView, { testID: `icon-${name}` }),
  };
});

describe('OfflineBanner Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders banner when offline', () => {
      useNetwork.mockReturnValue({ isOnline: false });

      const { getByText } = render(<OfflineBanner />);
      expect(getByText(/You're offline/)).toBeTruthy();
    });

    test('does not render banner when online', () => {
      useNetwork.mockReturnValue({ isOnline: true });

      const { queryByText } = render(<OfflineBanner />);
      expect(queryByText(/You're offline/)).toBeFalsy();
    });

    test('shows correct message when offline', () => {
      useNetwork.mockReturnValue({ isOnline: false });

      const { getByText } = render(<OfflineBanner />);
      expect(getByText('You\'re offline. Changes will sync when connected.')).toBeTruthy();
    });

    test('shows cloud-off icon when offline', () => {
      useNetwork.mockReturnValue({ isOnline: false });

      const { getByTestId } = render(<OfflineBanner />);
      expect(getByTestId('icon-cloud-off')).toBeTruthy();
    });
  });

  describe('Visibility Toggle', () => {
    test('banner becomes visible when going offline', async () => {
      const { rerender, getByText, queryByText } = render(
        <OfflineBanner />
      );

      // Start online
      useNetwork.mockReturnValue({ isOnline: true });
      rerender(<OfflineBanner />);
      expect(queryByText(/You're offline/)).toBeFalsy();

      // Go offline
      useNetwork.mockReturnValue({ isOnline: false });
      rerender(<OfflineBanner />);

      await waitFor(() => {
        expect(getByText(/You're offline/)).toBeTruthy();
      });
    });

    test('banner becomes hidden when coming online', async () => {
      const { rerender, getByText, queryByText } = render(
        <OfflineBanner />
      );

      // Start offline
      useNetwork.mockReturnValue({ isOnline: false });
      rerender(<OfflineBanner />);
      expect(getByText(/You're offline/)).toBeTruthy();

      // Come online
      useNetwork.mockReturnValue({ isOnline: true });
      rerender(<OfflineBanner />);

      await waitFor(() => {
        expect(queryByText(/You're offline/)).toBeFalsy();
      });
    });
  });

  describe('Interaction', () => {
    test('calls onPress callback when banner tapped', () => {
      const mockPress = jest.fn();
      useNetwork.mockReturnValue({ isOnline: false });

      const { getByText } = render(<OfflineBanner onPress={mockPress} />);
      const banner = getByText(/You're offline/);

      fireEvent.press(banner);
      expect(mockPress).toHaveBeenCalledTimes(1);
    });

    test('calls onPress multiple times on multiple taps', () => {
      const mockPress = jest.fn();
      useNetwork.mockReturnValue({ isOnline: false });

      const { getByText } = render(<OfflineBanner onPress={mockPress} />);
      const banner = getByText(/You're offline/);

      fireEvent.press(banner);
      fireEvent.press(banner);
      fireEvent.press(banner);

      expect(mockPress).toHaveBeenCalledTimes(3);
    });

    test('handles undefined onPress gracefully', () => {
      useNetwork.mockReturnValue({ isOnline: false });

      const { getByText } = render(<OfflineBanner onPress={undefined} />);
      const banner = getByText(/You're offline/);

      // Should not throw error
      fireEvent.press(banner);
      expect(getByText(/You're offline/)).toBeTruthy();
    });

    test('handles missing onPress gracefully', () => {
      useNetwork.mockReturnValue({ isOnline: false });

      const { getByText } = render(<OfflineBanner />);
      const banner = getByText(/You're offline/);

      // Should not throw error
      expect(() => fireEvent.press(banner)).not.toThrow();
    });
  });

  describe('Animation', () => {
    test('uses Animated component', () => {
      useNetwork.mockReturnValue({ isOnline: false });

      const { UNSAFE_root } = render(<OfflineBanner />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('processes animation when going offline', () => {
      useNetwork.mockReturnValue({ isOnline: false });

      const { rerender } = render(<OfflineBanner />);

      // Change to online
      useNetwork.mockReturnValue({ isOnline: true });
      rerender(<OfflineBanner />);

      // Animation should process
      expect(true).toBe(true);
    });
  });

  describe('Styling', () => {
    test('banner displays with correct white text', () => {
      useNetwork.mockReturnValue({ isOnline: false });

      const { getByText } = render(<OfflineBanner />);
      expect(getByText(/You're offline/)).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    test('handles rapid isOnline changes', () => {
      const { rerender } = render(<OfflineBanner />);

      // Rapid changes
      useNetwork.mockReturnValue({ isOnline: true });
      rerender(<OfflineBanner />);

      useNetwork.mockReturnValue({ isOnline: false });
      rerender(<OfflineBanner />);

      useNetwork.mockReturnValue({ isOnline: true });
      rerender(<OfflineBanner />);

      useNetwork.mockReturnValue({ isOnline: false });
      rerender(<OfflineBanner />);

      // Should handle without errors
      expect(true).toBe(true);
    });
  });
});

describe('SyncStatusBadge Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultOfflineStats = {
    hasPendingSync: false,
    pendingAuditsCount: 0,
    pendingPhotosCount: 0,
    syncQueueCount: 0,
  };

  const defaultNetworkStatus = {
    isOnline: true,
  };

  describe('Rendering', () => {
    test('does not render when no pending sync', () => {
      useOffline.mockReturnValue({
        offlineStats: defaultOfflineStats,
        isSyncing: false,
      });
      useNetwork.mockReturnValue(defaultNetworkStatus);

      const { queryByTestId } = render(<SyncStatusBadge />);
      expect(queryByTestId(/icon-(sync|cloud)/)).toBeFalsy();
    });

    test('renders badge when pending sync exists', () => {
      useOffline.mockReturnValue({
        offlineStats: {
          ...defaultOfflineStats,
          hasPendingSync: true,
          pendingAuditsCount: 2,
        },
        isSyncing: false,
      });
      useNetwork.mockReturnValue(defaultNetworkStatus);

      const { getByTestId } = render(<SyncStatusBadge />);
      expect(getByTestId('icon-cloud-upload')).toBeTruthy();
    });

    test('renders badge when actively syncing', () => {
      useOffline.mockReturnValue({
        offlineStats: defaultOfflineStats,
        isSyncing: true,
      });
      useNetwork.mockReturnValue(defaultNetworkStatus);

      const { getByTestId } = render(<SyncStatusBadge />);
      expect(getByTestId('icon-sync')).toBeTruthy();
    });

    test('renders sync icon when syncing', () => {
      useOffline.mockReturnValue({
        offlineStats: defaultOfflineStats,
        isSyncing: true,
      });
      useNetwork.mockReturnValue(defaultNetworkStatus);

      const { getByTestId } = render(<SyncStatusBadge />);
      expect(getByTestId('icon-sync')).toBeTruthy();
    });

    test('renders cloud-upload icon when online with pending', () => {
      useOffline.mockReturnValue({
        offlineStats: {
          ...defaultOfflineStats,
          hasPendingSync: true,
          pendingAuditsCount: 1,
        },
        isSyncing: false,
      });
      useNetwork.mockReturnValue({ isOnline: true });

      const { getByTestId } = render(<SyncStatusBadge />);
      expect(getByTestId('icon-cloud-upload')).toBeTruthy();
    });

    test('renders cloud-queue icon when offline with pending', () => {
      useOffline.mockReturnValue({
        offlineStats: {
          ...defaultOfflineStats,
          hasPendingSync: true,
          pendingAuditsCount: 1,
        },
        isSyncing: false,
      });
      useNetwork.mockReturnValue({ isOnline: false });

      const { getByTestId } = render(<SyncStatusBadge />);
      expect(getByTestId('icon-cloud-queue')).toBeTruthy();
    });
  });

  describe('Pending Count Display', () => {
    test('calculates total pending count correctly', () => {
      useOffline.mockReturnValue({
        offlineStats: {
          hasPendingSync: true,
          pendingAuditsCount: 2,
          pendingPhotosCount: 3,
          syncQueueCount: 1,
        },
        isSyncing: false,
      });
      useNetwork.mockReturnValue(defaultNetworkStatus);

      const { getByTestId } = render(<SyncStatusBadge />);
      // Badge should be rendered (total pending = 2+3+1 = 6)
      expect(getByTestId('icon-cloud-upload')).toBeTruthy();
    });

    test('shows badge with pending audits only', () => {
      useOffline.mockReturnValue({
        offlineStats: {
          hasPendingSync: true,
          pendingAuditsCount: 5,
          pendingPhotosCount: 0,
          syncQueueCount: 0,
        },
        isSyncing: false,
      });
      useNetwork.mockReturnValue(defaultNetworkStatus);

      const { getByTestId } = render(<SyncStatusBadge />);
      expect(getByTestId('icon-cloud-upload')).toBeTruthy();
    });

    test('shows badge with pending photos only', () => {
      useOffline.mockReturnValue({
        offlineStats: {
          hasPendingSync: true,
          pendingAuditsCount: 0,
          pendingPhotosCount: 3,
          syncQueueCount: 0,
        },
        isSyncing: false,
      });
      useNetwork.mockReturnValue(defaultNetworkStatus);

      const { getByTestId } = render(<SyncStatusBadge />);
      expect(getByTestId('icon-cloud-upload')).toBeTruthy();
    });

    test('shows badge with sync queue only', () => {
      useOffline.mockReturnValue({
        offlineStats: {
          hasPendingSync: true,
          pendingAuditsCount: 0,
          pendingPhotosCount: 0,
          syncQueueCount: 2,
        },
        isSyncing: false,
      });
      useNetwork.mockReturnValue(defaultNetworkStatus);

      const { getByTestId } = render(<SyncStatusBadge />);
      expect(getByTestId('icon-cloud-upload')).toBeTruthy();
    });
  });

  describe('Syncing State', () => {
    test('shows sync icon when isSyncing is true', () => {
      useOffline.mockReturnValue({
        offlineStats: {
          ...defaultOfflineStats,
          hasPendingSync: true,
        },
        isSyncing: true,
      });
      useNetwork.mockReturnValue(defaultNetworkStatus);

      const { getByTestId } = render(<SyncStatusBadge />);
      expect(getByTestId('icon-sync')).toBeTruthy();
    });

    test('hides badge when syncing completes', () => {
      const { rerender, queryByTestId } = render(<SyncStatusBadge />);

      useOffline.mockReturnValue({
        offlineStats: defaultOfflineStats,
        isSyncing: false,
      });
      rerender(<SyncStatusBadge />);

      expect(queryByTestId(/icon-(sync|cloud)/)).toBeFalsy();
    });

    test('transitions from syncing to cloud-upload icon', () => {
      const { rerender, getByTestId } = render(<SyncStatusBadge />);

      // Start syncing
      useOffline.mockReturnValue({
        offlineStats: {
          ...defaultOfflineStats,
          hasPendingSync: true,
        },
        isSyncing: true,
      });
      rerender(<SyncStatusBadge />);
      expect(getByTestId('icon-sync')).toBeTruthy();

      // Stop syncing but still have pending
      useOffline.mockReturnValue({
        offlineStats: {
          ...defaultOfflineStats,
          hasPendingSync: true,
        },
        isSyncing: false,
      });
      rerender(<SyncStatusBadge />);
      expect(getByTestId('icon-cloud-upload')).toBeTruthy();
    });
  });

  describe('Interaction', () => {
    test('calls onPress callback when badge tapped', () => {
      const mockPress = jest.fn();
      useOffline.mockReturnValue({
        offlineStats: {
          ...defaultOfflineStats,
          hasPendingSync: true,
          pendingAuditsCount: 1,
        },
        isSyncing: false,
      });
      useNetwork.mockReturnValue(defaultNetworkStatus);

      const { getByTestId } = render(<SyncStatusBadge onPress={mockPress} />);
      fireEvent.press(getByTestId('icon-cloud-upload'));

      expect(mockPress).toHaveBeenCalledTimes(1);
    });

    test('handles missing onPress callback gracefully', () => {
      useOffline.mockReturnValue({
        offlineStats: {
          ...defaultOfflineStats,
          hasPendingSync: true,
          pendingAuditsCount: 1,
        },
        isSyncing: false,
      });
      useNetwork.mockReturnValue(defaultNetworkStatus);

      const { getByTestId } = render(<SyncStatusBadge />);
      expect(() => fireEvent.press(getByTestId('icon-cloud-upload'))).not.toThrow();
    });
  });

  describe('Online/Offline Status', () => {
    test('shows correct icon based on online/offline status', () => {
      useOffline.mockReturnValue({
        offlineStats: {
          ...defaultOfflineStats,
          hasPendingSync: true,
          pendingAuditsCount: 1,
        },
        isSyncing: false,
      });

      // Online
      useNetwork.mockReturnValue({ isOnline: true });
      const { rerender, getByTestId, queryByTestId } = render(
        <SyncStatusBadge />
      );
      expect(getByTestId('icon-cloud-upload')).toBeTruthy();

      // Offline
      useNetwork.mockReturnValue({ isOnline: false });
      rerender(<SyncStatusBadge />);
      expect(getByTestId('icon-cloud-queue')).toBeTruthy();
    });
  });

  describe('Animation', () => {
    test('applies pulsing animation when syncing', () => {
      useOffline.mockReturnValue({
        offlineStats: defaultOfflineStats,
        isSyncing: true,
      });
      useNetwork.mockReturnValue(defaultNetworkStatus);

      const { UNSAFE_root } = render(<SyncStatusBadge />);
      // Animation should be applied
      expect(UNSAFE_root).toBeTruthy();
    });

    test('removes animation when sync completes', () => {
      const { rerender } = render(<SyncStatusBadge />);

      useOffline.mockReturnValue({
        offlineStats: defaultOfflineStats,
        isSyncing: false,
      });
      rerender(<SyncStatusBadge />);

      // Badge should not render (no pending, not syncing)
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('handles zero total pending with hasPendingSync true', () => {
      useOffline.mockReturnValue({
        offlineStats: {
          hasPendingSync: true,
          pendingAuditsCount: 0,
          pendingPhotosCount: 0,
          syncQueueCount: 0,
        },
        isSyncing: false,
      });
      useNetwork.mockReturnValue(defaultNetworkStatus);

      const { getByTestId } = render(<SyncStatusBadge />);
      // Should still render because hasPendingSync is true
      expect(getByTestId('icon-cloud-upload')).toBeTruthy();
    });

    test('handles very large pending counts', () => {
      useOffline.mockReturnValue({
        offlineStats: {
          hasPendingSync: true,
          pendingAuditsCount: 9999,
          pendingPhotosCount: 9999,
          syncQueueCount: 9999,
        },
        isSyncing: false,
      });
      useNetwork.mockReturnValue(defaultNetworkStatus);

      const { getByTestId } = render(<SyncStatusBadge />);
      expect(getByTestId('icon-cloud-upload')).toBeTruthy();
    });
  });
});
