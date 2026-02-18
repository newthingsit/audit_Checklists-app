/**
 * NetworkContext Integration Tests
 * Tests network state monitoring and connectivity handling
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { NetworkProvider, useNetwork } from '../../src/context/NetworkContext';

// Mock NetInfo
jest.mock('@react-native-community/netinfo');

describe('NetworkContext', () => {
  let netInfoListeners = [];
  let mockNetState;

  beforeEach(() => {
    jest.clearAllMocks();
    netInfoListeners = [];
    
    // Default network state
    mockNetState = {
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    };

    // Mock NetInfo.addEventListener
    NetInfo.addEventListener = jest.fn((callback) => {
      netInfoListeners.push(callback);
      return jest.fn(); // Unsubscribe function
    });

    // Mock NetInfo.fetch
    NetInfo.fetch = jest.fn(() => Promise.resolve(mockNetState));

    global.__DEV__ = false;
  });

  afterEach(() => {
    netInfoListeners = [];
  });

  const wrapper = ({ children }) => (
    <NetworkProvider>{children}</NetworkProvider>
  );

  describe('Initialization', () => {
    it('should initialize with default online state', async () => {
      const { result } = renderHook(() => useNetwork(), { wrapper });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.isInternetReachable).toBe(true);
        expect(result.current.isOnline).toBe(true);
        expect(result.current.connectionType).toBe('wifi');
      });
    });

    it('should fetch initial network state on mount', async () => {
      renderHook(() => useNetwork(), { wrapper });

      await waitFor(() => {
        expect(NetInfo.fetch).toHaveBeenCalled();
      });
    });

    it('should set up network state listener', () => {
      renderHook(() => useNetwork(), { wrapper });

      expect(NetInfo.addEventListener).toHaveBeenCalled();
      expect(netInfoListeners.length).toBeGreaterThan(0);
    });
  });

  describe('Network State Changes', () => {
    it('should update state when network becomes available', async () => {
      mockNetState = {
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      };

      const { result } = renderHook(() => useNetwork(), { wrapper });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      // Simulate network coming back online
      act(() => {
        netInfoListeners[0]({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
        });
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.isInternetReachable).toBe(true);
        expect(result.current.isOnline).toBe(true);
        expect(result.current.connectionType).toBe('wifi');
      });
    });

    it('should update state when network becomes unavailable', async () => {
      const { result } = renderHook(() => useNetwork(), { wrapper });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      // Simulate network going offline
      act(() => {
        netInfoListeners[0]({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
        });
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
        expect(result.current.isInternetReachable).toBe(false);
        expect(result.current.isOnline).toBe(false);
        expect(result.current.connectionType).toBe('none');
      });
    });

    it('should update lastOnline when connection is restored', async () => {
      mockNetState = {
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      };

      const { result } = renderHook(() => useNetwork(), { wrapper });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      const beforeOnline = result.current.lastOnline;

      // Wait a bit then go online
      await new Promise(resolve => setTimeout(resolve, 100));

      act(() => {
        netInfoListeners[0]({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
        });
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
        expect(result.current.lastOnline.getTime()).toBeGreaterThanOrEqual(
          beforeOnline.getTime()
        );
      });
    });

    it('should handle connection type changes', async () => {
      const { result } = renderHook(() => useNetwork(), { wrapper });

      await waitFor(() => {
        expect(result.current.connectionType).toBe('wifi');
      });

      // Switch to cellular
      act(() => {
        netInfoListeners[0]({
          isConnected: true,
          isInternetReachable: true,
          type: 'cellular',
        });
      });

      await waitFor(() => {
        expect(result.current.connectionType).toBe('cellular');
        expect(result.current.isOnline).toBe(true);
      });
    });
  });

  describe('Manual Network Refresh', () => {
    it('should refresh network state manually', async () => {
      const { result } = renderHook(() => useNetwork(), { wrapper });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      // Update mock state
      mockNetState = {
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      };

      // Manually refresh
      let refreshResult;
      await act(async () => {
        refreshResult = await result.current.refreshNetworkState();
      });

      expect(refreshResult).toBe(false); // Not online
      expect(result.current.isOnline).toBe(false);
    });

    it('should return true when refreshing shows online', async () => {
      mockNetState = {
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      };

      const { result } = renderHook(() => useNetwork(), { wrapper });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      // Update mock to online
      mockNetState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      };

      let refreshResult;
      await act(async () => {
        refreshResult = await result.current.refreshNetworkState();
      });

      expect(refreshResult).toBe(true);
      expect(result.current.isOnline).toBe(true);
    });
  });

  describe('Connection Quality', () => {
    it('should return "offline" when not connected', async () => {
      mockNetState = {
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      };

      const { result } = renderHook(() => useNetwork(), { wrapper });

      await waitFor(() => {
        expect(result.current.getConnectionQuality()).toBe('offline');
      });
    });

    it('should return "good" for wifi connection', async () => {
      mockNetState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      };

      const { result } = renderHook(() => useNetwork(), { wrapper });

      await waitFor(() => {
        expect(result.current.getConnectionQuality()).toBe('good');
      });
    });

    it('should return "moderate" for cellular connection', async () => {
      mockNetState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
      };

      const { result } = renderHook(() => useNetwork(), { wrapper });

      await waitFor(() => {
        expect(result.current.getConnectionQuality()).toBe('moderate');
      });
    });

    it('should return "unknown" for other connection types', async () => {
      mockNetState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'ethernet',
      };

      const { result } = renderHook(() => useNetwork(), { wrapper });

      await waitFor(() => {
        expect(result.current.getConnectionQuality()).toBe('unknown');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle connected but no internet reachable', async () => {
      mockNetState = {
        isConnected: true,
        isInternetReachable: false,
        type: 'wifi',
      };

      const { result } = renderHook(() => useNetwork(), { wrapper });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.isInternetReachable).toBe(false);
        expect(result.current.isOnline).toBe(false); // Not truly online
      });
    });

    it('should cleanup listener on unmount', () => {
      const unsubscribeMock = jest.fn();
      NetInfo.addEventListener.mockReturnValue(unsubscribeMock);

      const { unmount } = renderHook(() => useNetwork(), { wrapper });

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should throw error when useNetwork used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useNetwork());
      }).toThrow('useNetwork must be used within a NetworkProvider');

      consoleError.mockRestore();
    });
  });

  describe('Development Logging', () => {
    it('should log network changes in dev mode', async () => {
      global.__DEV__ = true;
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();

      renderHook(() => useNetwork(), { wrapper });

      await waitFor(() => {
        expect(NetInfo.addEventListener).toHaveBeenCalled();
      });

      act(() => {
        netInfoListeners[0]({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
        });
      });

      await waitFor(() => {
        expect(consoleLog).toHaveBeenCalledWith(
          'Network state changed:',
          expect.objectContaining({
            isConnected: false,
            isInternetReachable: false,
            type: 'none',
          })
        );
      });

      consoleLog.mockRestore();
      global.__DEV__ = false;
    });
  });
});
