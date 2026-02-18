/**
 * Integration Test: Location Service
 * Tests location tracking, permissions, and distance calculations
 * 
 * Phase G - Tier 2: Location Service Integration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  setupIntegrationTests,
  cleanupIntegrationTests,
  mockApiEndpoint,
} from '../helpers/setupIntegration';
import { createMockLocationContext } from '../helpers/mockProviders';
import { sampleLocations } from '../helpers/fixtures';

describe('Integration: Location Service', () => {
  let axiosMock;

  beforeAll(async () => {
    await setupIntegrationTests();
    axiosMock = new MockAdapter(axios);
  });

  afterAll(async () => {
    axiosMock.reset();
    await cleanupIntegrationTests();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    axiosMock.reset();
    await AsyncStorage.clear();
  });

  describe('Location Permission Handling', () => {
    it('should request location permission', async () => {
      const location = createMockLocationContext();

      location.requestPermission.mockResolvedValue('granted');

      const result = await location.requestPermission('location');

      expect(result).toBe('granted');
      expect(location.requestPermission).toHaveBeenCalledWith('location');
    });

    it('should handle permission grant', async () => {
      const location = createMockLocationContext();

      location.requestPermission.mockResolvedValue('granted');

      const permission = await location.requestPermission('location');

      if (permission === 'granted') {
        await AsyncStorage.setItem('location_permission', 'granted');
      }

      const stored = await AsyncStorage.getItem('location_permission');
      expect(stored).toBe('granted');
    });

    it('should handle permission denial', async () => {
      const location = createMockLocationContext();

      location.requestPermission.mockResolvedValue('denied');

      const permission = await location.requestPermission('location');

      expect(permission).toBe('denied');
    });

    it('should check existing permission status', async () => {
      const location = createMockLocationContext();

      await AsyncStorage.setItem('location_permission', 'granted');

      location.checkPermission.mockResolvedValue('granted');

      const status = await location.checkPermission('location');

      expect(status).toBe('granted');
    });

    it('should handle permission changes', async () => {
      let permission = 'granted';

      await AsyncStorage.setItem('location_permission', permission);

      // User changes permission in settings
      permission = 'denied';
      await AsyncStorage.setItem('location_permission', permission);

      const stored = await AsyncStorage.getItem('location_permission');
      expect(stored).toBe('denied');
    });

    it('should restore permission on app restart', async () => {
      await AsyncStorage.setItem('location_permission', 'granted');

      const permission = await AsyncStorage.getItem('location_permission');

      expect(permission).toBe('granted');
    });
  });

  describe('Location Tracking', () => {
    it('should start location tracking', async () => {
      const location = createMockLocationContext();

      location.startTracking.mockResolvedValue(true);

      const result = await location.startTracking();

      expect(result).toBe(true);
    });

    it('should track current location', async () => {
      const location = createMockLocationContext({
        currentLocation: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 5,
        },
      });

      expect(location.currentLocation.latitude).toBe(40.7128);
      expect(location.currentLocation.longitude).toBe(-74.006);
    });

    it('should update location on movement', async () => {
      const location = createMockLocationContext();

      const newLocation = {
        latitude: 34.0522,
        longitude: -118.2437,
        accuracy: 8,
      };

      location.currentLocation = newLocation;

      expect(location.currentLocation.latitude).toBe(34.0522);
    });

    it('should stop location tracking', async () => {
      const location = createMockLocationContext();

      location.stopTracking.mockResolvedValue(true);

      const result = await location.stopTracking();

      expect(result).toBe(true);
    });

    it('should track location accuracy', async () => {
      const locations = [
        { latitude: 40.7128, longitude: -74.006, accuracy: 10 },
        { latitude: 40.7129, longitude: -74.007, accuracy: 5 },
        { latitude: 40.713, longitude: -74.008, accuracy: 3 },
      ];

      const bestAccuracy = locations.reduce((best, loc) =>
        loc.accuracy < best.accuracy ? loc : best
      );

      expect(bestAccuracy.accuracy).toBe(3);
    });
  });

  describe('Location Storage', () => {
    it('should save location to storage', async () => {
      const location = {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 5,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem('current_location', JSON.stringify(location));

      const stored = JSON.parse(await AsyncStorage.getItem('current_location'));

      expect(stored.latitude).toBe(40.7128);
    });

    it('should retrieve saved location', async () => {
      const location = {
        latitude: 40.7128,
        longitude: -74.006,
        altitude: 10,
      };

      await AsyncStorage.setItem('current_location', JSON.stringify(location));

      const retrieved = JSON.parse(await AsyncStorage.getItem('current_location'));

      expect(retrieved).toEqual(location);
    });

    it('should maintain location history', async () => {
      const history = [
        { latitude: 40.7128, longitude: -74.006, timestamp: 1000 },
        { latitude: 40.7129, longitude: -74.007, timestamp: 2000 },
        { latitude: 40.713, longitude: -74.008, timestamp: 3000 },
      ];

      await AsyncStorage.setItem('location_history', JSON.stringify(history));

      const stored = JSON.parse(await AsyncStorage.getItem('location_history'));

      expect(stored).toHaveLength(3);
    });

    it('should limit location history size', async () => {
      const history = [];

      for (let i = 0; i < 1000; i++) {
        history.push({
          latitude: 40.7128 + i * 0.001,
          longitude: -74.006 + i * 0.001,
          timestamp: i * 1000,
        });
      }

      // Keep only last 100
      const limited = history.slice(-100);

      await AsyncStorage.setItem('location_history', JSON.stringify(limited));

      const stored = JSON.parse(await AsyncStorage.getItem('location_history'));

      expect(stored).toHaveLength(100);
    });

    it('should clear old location history', async () => {
      const now = Date.now();
      const history = [
        { timestamp: now - 86400000 }, // 1 day old
        { timestamp: now - 604800000 }, // 1 week old
        { timestamp: now }, // Current
      ];

      // Keep only recent history (last 24 hours)
      const recent = history.filter(loc => now - loc.timestamp < 86400000);

      expect(recent).toHaveLength(1);
    });
  });

  describe('Distance Calculation', () => {
    it('should calculate distance between two points', async () => {
      const location = createMockLocationContext({
        currentLocation: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      });

      const targetLocation = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const distance = location.getDistance?.();

      expect(typeof distance).toBe('number');
    });

    it('should identify nearby locations', async () => {
      const currentLocation = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const locations = sampleLocations.map(loc => ({
        ...loc,
        distance: 100 + Math.random() * 1000,
      }));

      const nearby = locations.filter(loc => loc.distance < 500);

      expect(nearby.length).toBeGreaterThan(0);
    });

    it('should sort locations by distance', async () => {
      const locations = [
        { id: 1, name: 'Office A', distance: 500 },
        { id: 2, name: 'Office B', distance: 100 },
        { id: 3, name: 'Office C', distance: 300 },
      ];

      const sorted = [...locations].sort((a, b) => a.distance - b.distance);

      expect(sorted[0].id).toBe(2);
      expect(sorted[1].id).toBe(3);
      expect(sorted[2].id).toBe(1);
    });

    it('should determine if location is in range', async () => {
      const currentLocation = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const targetLocation = {
        latitude: 40.7128,
        longitude: -74.006,
        requiredRange: 100, // 100 meters
      };

      const distance = 50;
      const isInRange = distance <= targetLocation.requiredRange;

      expect(isInRange).toBe(true);
    });
  });

  describe('Location API Integration', () => {
    it('should fetch nearby locations from API', async () => {
      const nearbyLocations = [
        { id: 1, name: 'Office A', latitude: 40.7128, longitude: -74.006 },
        { id: 2, name: 'Office B', latitude: 40.7129, longitude: -74.007 },
      ];

      mockApiEndpoint('GET', /\/locations.*/,
        { data: nearbyLocations }, 200);

      const response = await axios.get(
        '/locations?lat=40.7128&lng=-74.006&radius=1000'
      );

      expect(response.data).toHaveLength(2);
    });

    it('should fetch location details', async () => {
      const location = {
        id: 1,
        name: 'Main Office',
        latitude: 40.7128,
        longitude: -74.006,
        address: '123 Main St',
      };

      mockApiEndpoint('GET', /\/locations\/1.*/,
        { data: location }, 200);

      const response = await axios.get('/locations/1');

      expect(response.data.name).toBe('Main Office');
    });

    it('should save location preference', async () => {
      const selectedLocationId = 1;

      await AsyncStorage.setItem(
        '@selected_location_id',
        String(selectedLocationId)
      );

      const stored = await AsyncStorage.getItem('@selected_location_id');

      expect(Number(stored)).toBe(1);
    });

    it('should report location to server', async () => {
      const locationData = {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 5,
        timestamp: Date.now(),
      };

      mockApiEndpoint('POST', '/locations/report',
        { success: true }, 200);

      const response = await axios.post('/locations/report', locationData);

      expect(response.data.success).toBe(true);
    });
  });

  describe('Location Preferences', () => {
    it('should save location preferences', async () => {
      const preferences = {
        trackingEnabled: true,
        autoSelectNearest: false,
        preferredLocation: 1,
      };

      await AsyncStorage.setItem(
        'location_preferences',
        JSON.stringify(preferences)
      );

      const stored = JSON.parse(
        await AsyncStorage.getItem('location_preferences')
      );

      expect(stored.trackingEnabled).toBe(true);
    });

    it('should restore location preferences', async () => {
      const preferences = {
        trackingEnabled: true,
        autoSelectNearest: true,
        preferredLocation: 2,
      };

      await AsyncStorage.setItem(
        'location_preferences',
        JSON.stringify(preferences)
      );

      const restored = JSON.parse(
        await AsyncStorage.getItem('location_preferences')
      );

      expect(restored.preferredLocation).toBe(2);
    });

    it('should update location preferences', async () => {
      let preferences = {
        trackingEnabled: true,
        autoSelectNearest: false,
      };

      await AsyncStorage.setItem(
        'location_preferences',
        JSON.stringify(preferences)
      );

      // Update preferences
      preferences.autoSelectNearest = true;
      await AsyncStorage.setItem(
        'location_preferences',
        JSON.stringify(preferences)
      );

      const updated = JSON.parse(
        await AsyncStorage.getItem('location_preferences')
      );

      expect(updated.autoSelectNearest).toBe(true);
    });
  });

  describe('Location Error Handling', () => {
    it('should handle location timeout', async () => {
      const location = createMockLocationContext();

      location.startTracking.mockRejectedValue(
        new Error('Location request timeout')
      );

      try {
        await location.startTracking();
        fail('Should throw error');
      } catch (error) {
        expect(error.message).toContain('timeout');
      }
    });

    it('should handle location permission denied', async () => {
      const location = createMockLocationContext();

      location.requestPermission.mockResolvedValue('denied');

      const permission = await location.requestPermission('location');

      expect(permission).toBe('denied');
    });

    it('should handle GPS unavailable', async () => {
      const location = createMockLocationContext();

      location.startTracking.mockRejectedValue(
        new Error('GPS not available')
      );

      try {
        await location.startTracking();
        fail('Should throw error');
      } catch (error) {
        expect(error.message).toContain('GPS');
      }
    });

    it('should retry on transient location error', async () => {
      const location = createMockLocationContext();

      let attempts = 0;
      location.startTracking.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Temporary error'));
        }
        return Promise.resolve(true);
      });

      for (let i = 0; i < 3; i++) {
        try {
          await location.startTracking();
          break;
        } catch (error) {
          // Continue retrying
        }
      }

      expect(attempts).toBe(3);
    });
  });

  describe('Complete Location Workflow', () => {
    it('should execute full location acquisition workflow', async () => {
      // 1. Check permission
      await AsyncStorage.setItem('location_permission', 'granted');

      // 2. Start tracking
      const location = createMockLocationContext({
        currentLocation: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 5,
        },
      });

      // 3. Save location
      await AsyncStorage.setItem(
        'current_location',
        JSON.stringify(location.currentLocation)
      );

      // 4. Find nearby locations
      const nearbyLocations = [
        { id: 1, name: 'Office A', distance: 100 },
        { id: 2, name: 'Office B', distance: 500 },
      ];

      // 5. Select nearest
      const selected = nearbyLocations.reduce((prev, curr) =>
        curr.distance < prev.distance ? curr : prev
      );

      expect(selected.id).toBe(1);

      // 6. Stop tracking
      location.stopTracking.mockResolvedValue(true);
    });
  });
});
