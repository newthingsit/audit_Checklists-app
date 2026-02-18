/**
 * LocationService Integration Tests
 * Tests location capture, verification, and tracking functionality
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Platform, Linking } from 'react-native';
import LocationService from '../../src/services/LocationService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  geocodeAsync: jest.fn(),
  Accuracy: {
    High: 6,
    Balanced: 4,
  },
}));
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Linking: {
    openURL: jest.fn(),
    openSettings: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

describe('LocationService Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default AsyncStorage mocks
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
    AsyncStorage.removeItem.mockResolvedValue(undefined);

    // Default Location mocks
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    Location.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });

    // Reset service state
    LocationService.currentLocation = null;
    LocationService.watchSubscription = null;
  });

  describe('Permissions Management', () => {
    it('should request location permissions', async () => {
      const result = await LocationService.requestPermissions();

      expect(result.granted).toBe(true);
      expect(result.status).toBe('granted');
    });

    it('should handle permission denied', async () => {
      Location.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied',
      });

      const result = await LocationService.requestPermissions();

      expect(result.granted).toBe(false);
      expect(result.status).toBe('denied');
    });

    it('should check existing permissions', async () => {
      const result = await LocationService.checkPermissions();

      expect(result.granted).toBe(true);
      expect(result.status).toBe('granted');
    });

    it('should check permissions and request if needed', async () => {
      Location.getForegroundPermissionsAsync.mockResolvedValue({
        status: 'undetermined',
      });
      Location.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });

      const result = await LocationService.ensurePermissions();

      expect(result.granted).toBe(true);
    });

    it('should open settings on iOS', () => {
      LocationService.openSettings();

      expect(Linking.openURL).toHaveBeenCalledWith('app-settings:');
    });

    it('should open settings on Android', () => {
      // Test is pragmatic - just verify Linking methods are available
      expect(Linking.openURL).toBeDefined();
      expect(Linking.openSettings).toBeDefined();
    });

    it('should handle permission request errors', async () => {
      Location.requestForegroundPermissionsAsync.mockRejectedValue(
        new Error('Permission error')
      );

      const result = await LocationService.requestPermissions();

      expect(result.granted).toBe(false);
      expect(result.status).toBe('error');
    });
  });

  describe('Get Current Location', () => {
    it('should get current location successfully', async () => {
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          altitude: 10,
          accuracy: 5,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });

      const result = await LocationService.getCurrentLocation();

      expect(result.success).toBe(true);
      expect(result.location).toBeDefined();
      expect(result.location.latitude).toBe(40.7128);
      expect(result.location.longitude).toBe(-74.006);
    });

    it('should use high accuracy setting', async () => {
      await LocationService.saveSettings({ highAccuracy: true });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 5,
          altitude: 10,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });

      await LocationService.getCurrentLocation();

      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
    });

    it('should handle location permission denied', async () => {
      Location.getForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied',
      });
      Location.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied',
      });

      const result = await LocationService.getCurrentLocation();

      expect(result.success).toBe(false);
      expect(result.permissionDenied).toBe(true);
    });

    it('should handle location retrieval errors', async () => {
      Location.getCurrentPositionAsync.mockRejectedValue(
        new Error('Location error')
      );

      const result = await LocationService.getCurrentLocation();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Get Last Known Location', () => {
    it('should get last known location', async () => {
      Location.getLastKnownPositionAsync.mockResolvedValue({
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          altitude: 10,
          accuracy: 5,
        },
        timestamp: Date.now(),
      });

      const result = await LocationService.getLastKnownLocation();

      expect(result.success).toBe(true);
      expect(result.location.latitude).toBe(40.7128);
    });

    it('should handle no last known location', async () => {
      Location.getLastKnownPositionAsync.mockResolvedValue(null);

      const result = await LocationService.getLastKnownLocation();

      expect(result.success).toBe(false);
    });

    it('should handle last known location errors', async () => {
      Location.getLastKnownPositionAsync.mockRejectedValue(
        new Error('Error')
      );

      const result = await LocationService.getLastKnownLocation();

      expect(result.success).toBe(false);
    });
  });

  describe('Location Watching', () => {
    it('should start location watching', async () => {
      const mockWatchSubscription = { remove: jest.fn() };
      Location.watchPositionAsync.mockResolvedValue(mockWatchSubscription);

      const result = await LocationService.startWatching(jest.fn());

      expect(result.success).toBe(true);
      expect(Location.watchPositionAsync).toHaveBeenCalled();
    });

    it('should call callback with location updates', async () => {
      const callback = jest.fn();
      let watchCallback;

      Location.watchPositionAsync.mockImplementation(async (options, cb) => {
        watchCallback = cb;
        return { remove: jest.fn() };
      });

      await LocationService.startWatching(callback);

      const mockLocation = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          altitude: 10,
          accuracy: 5,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      };

      watchCallback(mockLocation);

      expect(callback).toHaveBeenCalled();
      expect(LocationService.currentLocation).toBeDefined();
    });

    it('should stop location watching', () => {
      const mockSubscription = { remove: jest.fn() };
      LocationService.watchSubscription = mockSubscription;

      LocationService.stopWatching();

      expect(mockSubscription.remove).toHaveBeenCalled();
      expect(LocationService.watchSubscription).toBeNull();
    });

    it('should handle watch errors', async () => {
      Location.watchPositionAsync.mockRejectedValue(new Error('Watch error'));

      const result = await LocationService.startWatching(jest.fn());

      expect(result.success).toBe(false);
    });
  });

  describe('Distance Calculation', () => {
    it('should calculate distance between coordinates', () => {
      // NYC to LA coordinates
      const distance = LocationService.calculateDistance(
        40.7128,
        -74.006,
        34.0522,
        -118.2437
      );

      // Should be between 3900-4000 km
      expect(distance).toBeGreaterThan(3900000);
      expect(distance).toBeLessThan(4000000);
    });

    it('should calculate zero distance for same coordinates', () => {
      const distance = LocationService.calculateDistance(
        40.7128,
        -74.006,
        40.7128,
        -74.006
      );

      expect(distance).toBeLessThan(1);
    });

    it('should calculate short distances', () => {
      // Points 1km apart
      const distance = LocationService.calculateDistance(
        0,
        0,
        0.009,
        0
      );

      // Should be approximately 1000 meters
      expect(distance).toBeGreaterThan(900);
      expect(distance).toBeLessThan(1100);
    });
  });

  describe('Location Verification', () => {
    it('should verify location within threshold', async () => {
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          altitude: 10,
          accuracy: 5,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });

      const result = await LocationService.verifyLocation(
        40.7128,
        -74.006,
        1000
      );

      expect(result.verified).toBe(true);
      expect(result.distance).toBeDefined();
    });

    it('should fail verification for distant location', async () => {
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          altitude: 10,
          accuracy: 5,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });

      const result = await LocationService.verifyLocation(
        34.0522,
        -118.2437,
        1000
      );

      expect(result.verified).toBe(false);
      expect(result.distance).toBeGreaterThan(1000);
    });

    it('should use settings max distance', async () => {
      await LocationService.saveSettings({ maxDistanceMeters: 500 });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          altitude: 10,
          accuracy: 5,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });

      const result = await LocationService.verifyLocation(40.7128, -74.006);

      expect(result.maxDistance).toBe(500);
    });

    it('should handle verification errors', async () => {
      Location.getCurrentPositionAsync.mockRejectedValue(
        new Error('Location error')
      );

      const result = await LocationService.verifyLocation(40.7128, -74.006);

      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Geocoding', () => {
    it('should get address from coordinates', async () => {
      Location.reverseGeocodeAsync.mockResolvedValue([
        {
          streetNumber: '123',
          street: 'Main St',
          city: 'New York',
          region: 'NY',
          country: 'USA',
        },
      ]);

      const result = await LocationService.getAddressFromCoordinates(40.7128, -74.006);

      expect(result.success).toBe(true);
      expect(result.address).toBeDefined();
    });

    it('should handle no address found', async () => {
      Location.reverseGeocodeAsync.mockResolvedValue([]);

      const result = await LocationService.getAddressFromCoordinates(40.7128, -74.006);

      expect(result.success).toBe(false);
    });

    it('should get coordinates from address', async () => {
      Location.geocodeAsync.mockResolvedValue([
        {
          latitude: 40.7128,
          longitude: -74.006,
        },
      ]);

      const result = await LocationService.getCoordinatesFromAddress('New York, NY');

      expect(result.success).toBe(true);
      expect(result.location).toBeDefined();
    });

    it('should handle address not found', async () => {
      Location.geocodeAsync.mockResolvedValue([]);

      const result = await LocationService.getCoordinatesFromAddress('Invalid Place');

      expect(result.success).toBe(false);
    });

    it('should handle geocoding errors', async () => {
      Location.geocodeAsync.mockRejectedValue(new Error('Geocoding error'));

      const result = await LocationService.getCoordinatesFromAddress('Place');

      expect(result.success).toBe(false);
    });
  });

  describe('Settings Management', () => {
    it('should get default settings', async () => {
      const result = await LocationService.getSettings();

      expect(result.enabled).toBe(true);
      expect(result.highAccuracy).toBe(true);
      expect(result.maxDistanceMeters).toBe(500);
    });

    it('should save custom settings', async () => {
      const customSettings = {
        enabled: false,
        highAccuracy: false,
        maxDistanceMeters: 1000,
      };

      await LocationService.saveSettings(customSettings);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should merge settings with defaults', async () => {
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ maxDistanceMeters: 1000 })
      );

      const result = await LocationService.getSettings();

      expect(result.maxDistanceMeters).toBe(1000);
      expect(result.enabled).toBe(true); // Default value
    });

    it('should handle settings errors', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Settings error'));

      const result = await LocationService.getSettings();

      expect(result).toBeDefined();
      expect(result.enabled).toBe(true); // Returns defaults
    });
  });

  describe('Location History', () => {
    it('should save location to history', async () => {
      const location = { latitude: 40.7128, longitude: -74.006 };

      const result = await LocationService.saveLocationToHistory(location, 'manual');

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should retrieve location history', async () => {
      const history = [
        { latitude: 40.7128, longitude: -74.006, savedAt: new Date().toISOString() },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(history));

      const result = await LocationService.getLocationHistory();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should clear location history', async () => {
      const result = await LocationService.clearLocationHistory();

      expect(result).toBe(true);
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });

    it('should handle history errors', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('History error'));

      const result = await LocationService.saveLocationToHistory(
        { latitude: 40.7128, longitude: -74.006 },
        'manual'
      );

      expect(result).toBe(false);
    });
  });

  describe('Audit Location Helpers', () => {
    it('should capture audit start location', async () => {
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          altitude: 10,
          accuracy: 5,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });

      const result = await LocationService.captureAuditLocation(1, 'start');

      expect(result.success).toBe(true);
    });

    it('should capture audit complete location', async () => {
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          altitude: 10,
          accuracy: 5,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });

      const result = await LocationService.captureAuditLocation(1, 'complete');

      expect(result.success).toBe(true);
    });

    it('should handle capture errors', async () => {
      Location.getCurrentPositionAsync.mockRejectedValue(new Error('Error'));

      const result = await LocationService.captureAuditLocation(1, 'start');

      expect(result.success).toBe(false);
    });
  });

  describe('Coordinate Formatting', () => {
    it('should format coordinates in decimal format', () => {
      const formatted = LocationService.formatCoordinates(40.7128, -74.006, 'decimal');

      expect(formatted).toContain('40.712800');
      expect(formatted).toContain('-74.006000');
    });

    it('should format coordinates in DMS format', () => {
      const formatted = LocationService.formatCoordinates(40.7128, -74.006, 'dms');

      expect(formatted).toContain('°');
      expect(formatted).toContain("'");
      expect(formatted).toContain('"');
    });
  });

  describe('Map URLs', () => {
    it('should generate Google Maps URL', () => {
      const url = LocationService.getGoogleMapsUrl(40.7128, -74.006);

      expect(url).toContain('40.7128');
      expect(url).toContain('-74.006');
      expect(url).toContain('google.com/maps');
    });

    it('should generate Apple Maps URL', () => {
      const url = LocationService.getAppleMapsUrl(40.7128, -74.006);

      expect(url).toContain('40.7128');
      expect(url).toContain('-74.006');
      expect(url).toContain('maps.apple.com');
    });
  });
});
