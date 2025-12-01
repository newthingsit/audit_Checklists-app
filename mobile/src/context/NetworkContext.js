import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';

const NetworkContext = createContext();

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

export const NetworkProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const [connectionType, setConnectionType] = useState(null);
  const [lastOnline, setLastOnline] = useState(new Date());

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasConnected = isConnected;
      const nowConnected = state.isConnected && state.isInternetReachable;
      
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
      setConnectionType(state.type);
      
      if (nowConnected) {
        setLastOnline(new Date());
      }
      
      // Log connection changes in development
      if (__DEV__) {
        console.log('Network state changed:', {
          isConnected: state.isConnected,
          isInternetReachable: state.isInternetReachable,
          type: state.type,
        });
      }
    });

    // Check initial state
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
      setConnectionType(state.type);
      if (state.isConnected && state.isInternetReachable) {
        setLastOnline(new Date());
      }
    });

    return () => unsubscribe();
  }, []);

  // Manual refresh of network state
  const refreshNetworkState = useCallback(async () => {
    const state = await NetInfo.fetch();
    setIsConnected(state.isConnected);
    setIsInternetReachable(state.isInternetReachable);
    setConnectionType(state.type);
    return state.isConnected && state.isInternetReachable;
  }, []);

  // Check if we're truly online (connected + internet reachable)
  const isOnline = isConnected && isInternetReachable;

  // Get connection quality indicator
  const getConnectionQuality = useCallback(() => {
    if (!isOnline) return 'offline';
    if (connectionType === 'wifi') return 'good';
    if (connectionType === 'cellular') return 'moderate';
    return 'unknown';
  }, [isOnline, connectionType]);

  const value = {
    isConnected,
    isInternetReachable,
    isOnline,
    connectionType,
    lastOnline,
    refreshNetworkState,
    getConnectionQuality,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};

export default NetworkContext;

