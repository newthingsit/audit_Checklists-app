import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import LocationService from '../services/LocationService';

const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(null);
  const [settings, setSettings] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [isWatching, setIsWatching] = useState(false);

  // Check permissions on mount
  useEffect(() => {
    const checkInitialPermissions = async () => {
      const result = await LocationService.checkPermissions();
      setPermissionGranted(result.granted);
      
      const locationSettings = await LocationService.getSettings();
      setSettings(locationSettings);
    };
    
    checkInitialPermissions();
  }, []);

  // Request permissions
  const requestPermissions = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);
    
    try {
      const result = await LocationService.requestPermissions();
      setPermissionGranted(result.granted);
      
      if (!result.granted) {
        Alert.alert(
          'Location Permission Required',
          'This app needs location access to verify audit locations. Please enable location permissions in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => LocationService.openSettings() },
          ]
        );
      }
      
      return result;
    } catch (error) {
      setLastError(error.message);
      return { granted: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setLastError(null);
    
    try {
      const result = await LocationService.getCurrentLocation();
      
      if (result.success) {
        setCurrentLocation(result.location);
      } else if (result.permissionDenied) {
        setPermissionGranted(false);
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions to capture your location.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => LocationService.openSettings() },
          ]
        );
      } else {
        setLastError(result.error);
      }
      
      return result;
    } catch (error) {
      setLastError(error.message);
      return { success: false, error: error.message };
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  // Start watching location
  const startWatching = useCallback(async () => {
    const result = await LocationService.startWatching((location) => {
      setCurrentLocation(location);
    });
    
    if (result.success) {
      setIsWatching(true);
    }
    
    return result;
  }, []);

  // Stop watching location
  const stopWatching = useCallback(() => {
    LocationService.stopWatching();
    setIsWatching(false);
  }, []);

  // Verify location against expected coordinates
  const verifyLocation = useCallback(async (expectedLat, expectedLon, maxDistance) => {
    setIsLoading(true);
    setLastError(null);
    
    try {
      const result = await LocationService.verifyLocation(
        expectedLat, 
        expectedLon, 
        maxDistance
      );
      
      if (result.currentLocation) {
        setCurrentLocation(result.currentLocation);
      }
      
      if (result.permissionDenied) {
        setPermissionGranted(false);
      }
      
      return result;
    } catch (error) {
      setLastError(error.message);
      return { verified: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get address from coordinates
  const getAddress = useCallback(async (latitude, longitude) => {
    return await LocationService.getAddressFromCoordinates(latitude, longitude);
  }, []);

  // Capture location for audit
  const captureAuditLocation = useCallback(async (auditId, type = 'start') => {
    setIsLoading(true);
    
    try {
      const result = await LocationService.captureAuditLocation(auditId, type);
      
      if (result.success) {
        setCurrentLocation(result.location);
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update settings
  const updateSettings = useCallback(async (newSettings) => {
    const merged = { ...settings, ...newSettings };
    const success = await LocationService.saveSettings(merged);
    
    if (success) {
      setSettings(merged);
    }
    
    return success;
  }, [settings]);

  // Open location in maps
  const openInMaps = useCallback((latitude, longitude) => {
    const url = Platform.OS === 'ios'
      ? LocationService.getAppleMapsUrl(latitude, longitude)
      : LocationService.getGoogleMapsUrl(latitude, longitude);
    
    Linking.openURL(url).catch((err) => {
      console.error('Error opening maps:', err);
      // Fallback to Google Maps web
      Linking.openURL(LocationService.getGoogleMapsUrl(latitude, longitude));
    });
  }, []);

  // Format coordinates
  const formatCoordinates = useCallback((latitude, longitude, format = 'decimal') => {
    return LocationService.formatCoordinates(latitude, longitude, format);
  }, []);

  // Calculate distance between two points
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    return LocationService.calculateDistance(lat1, lon1, lat2, lon2);
  }, []);

  const value = {
    // State
    currentLocation,
    isLoading,
    permissionGranted,
    settings,
    lastError,
    isWatching,
    
    // Actions
    requestPermissions,
    getCurrentLocation,
    startWatching,
    stopWatching,
    verifyLocation,
    getAddress,
    captureAuditLocation,
    updateSettings,
    openInMaps,
    formatCoordinates,
    calculateDistance,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export default LocationContext;

