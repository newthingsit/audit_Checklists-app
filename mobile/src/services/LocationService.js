import * as Location from 'expo-location';
import { Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const LOCATION_HISTORY_KEY = '@location_history';
const LOCATION_SETTINGS_KEY = '@location_settings';

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  highAccuracy: true,
  captureOnAuditStart: true,
  captureOnAuditComplete: true,
  verifyLocation: true,
  maxDistanceMeters: 500, // Max distance from expected location
};

class LocationServiceClass {
  constructor() {
    this.currentLocation = null;
    this.watchSubscription = null;
    this.permissionStatus = null;
  }

  // ==================== PERMISSIONS ====================

  async requestPermissions() {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      this.permissionStatus = foregroundStatus;
      
      if (foregroundStatus !== 'granted') {
        return {
          granted: false,
          status: foregroundStatus,
          message: 'Location permission is required to verify audit locations.',
        };
      }

      return {
        granted: true,
        status: foregroundStatus,
      };
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return {
        granted: false,
        status: 'error',
        message: error.message,
      };
    }
  }

  async checkPermissions() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      this.permissionStatus = status;
      return {
        granted: status === 'granted',
        status,
      };
    } catch (error) {
      console.error('Error checking location permissions:', error);
      return {
        granted: false,
        status: 'error',
      };
    }
  }

  async ensurePermissions() {
    const check = await this.checkPermissions();
    if (check.granted) {
      return check;
    }
    return await this.requestPermissions();
  }

  openSettings() {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }

  // ==================== GET LOCATION ====================

  async getCurrentLocation(options = {}) {
    try {
      const permission = await this.ensurePermissions();
      if (!permission.granted) {
        return {
          success: false,
          error: 'Location permission not granted',
          permissionDenied: true,
        };
      }

      const settings = await this.getSettings();
      
      const locationOptions = {
        accuracy: settings.highAccuracy 
          ? Location.Accuracy.High 
          : Location.Accuracy.Balanced,
        ...options,
      };

      const location = await Location.getCurrentPositionAsync(locationOptions);
      
      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: new Date(location.timestamp).toISOString(),
      };

      return {
        success: true,
        location: this.currentLocation,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getLastKnownLocation() {
    try {
      const location = await Location.getLastKnownPositionAsync();
      if (location) {
        return {
          success: true,
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            accuracy: location.coords.accuracy,
            timestamp: new Date(location.timestamp).toISOString(),
          },
        };
      }
      return {
        success: false,
        error: 'No last known location available',
      };
    } catch (error) {
      console.error('Error getting last known location:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==================== LOCATION WATCHING ====================

  async startWatching(callback, options = {}) {
    try {
      const permission = await this.ensurePermissions();
      if (!permission.granted) {
        return { success: false, error: 'Permission denied' };
      }

      const settings = await this.getSettings();
      
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: settings.highAccuracy 
            ? Location.Accuracy.High 
            : Location.Accuracy.Balanced,
          distanceInterval: 10, // Update every 10 meters
          timeInterval: 5000, // Or every 5 seconds
          ...options,
        },
        (location) => {
          this.currentLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            accuracy: location.coords.accuracy,
            heading: location.coords.heading,
            speed: location.coords.speed,
            timestamp: new Date(location.timestamp).toISOString(),
          };
          
          if (callback) {
            callback(this.currentLocation);
          }
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Error starting location watch:', error);
      return { success: false, error: error.message };
    }
  }

  stopWatching() {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
  }

  // ==================== LOCATION VERIFICATION ====================

  calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  async verifyLocation(expectedLat, expectedLon, maxDistanceMeters = null) {
    const locationResult = await this.getCurrentLocation();
    
    if (!locationResult.success) {
      return {
        verified: false,
        error: locationResult.error,
        permissionDenied: locationResult.permissionDenied,
      };
    }

    const settings = await this.getSettings();
    const maxDistance = maxDistanceMeters || settings.maxDistanceMeters;

    const distance = this.calculateDistance(
      locationResult.location.latitude,
      locationResult.location.longitude,
      expectedLat,
      expectedLon
    );

    const verified = distance <= maxDistance;

    return {
      verified,
      distance: Math.round(distance),
      maxDistance,
      currentLocation: locationResult.location,
      expectedLocation: {
        latitude: expectedLat,
        longitude: expectedLon,
      },
      message: verified
        ? `Location verified (${Math.round(distance)}m from expected location)`
        : `Too far from expected location (${Math.round(distance)}m away, max ${maxDistance}m)`,
    };
  }

  // ==================== GEOCODING ====================

  async getAddressFromCoordinates(latitude, longitude) {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        const formattedAddress = [
          addr.streetNumber,
          addr.street,
          addr.district,
          addr.city,
          addr.region,
          addr.postalCode,
          addr.country,
        ]
          .filter(Boolean)
          .join(', ');

        return {
          success: true,
          address: formattedAddress,
          details: addr,
        };
      }

      return {
        success: false,
        error: 'No address found',
      };
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getCoordinatesFromAddress(address) {
    try {
      const locations = await Location.geocodeAsync(address);

      if (locations && locations.length > 0) {
        return {
          success: true,
          location: {
            latitude: locations[0].latitude,
            longitude: locations[0].longitude,
          },
        };
      }

      return {
        success: false,
        error: 'Address not found',
      };
    } catch (error) {
      console.error('Error geocoding address:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==================== SETTINGS ====================

  async getSettings() {
    try {
      const stored = await AsyncStorage.getItem(LOCATION_SETTINGS_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error getting location settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings) {
    try {
      const merged = { ...DEFAULT_SETTINGS, ...settings };
      await AsyncStorage.setItem(LOCATION_SETTINGS_KEY, JSON.stringify(merged));
      return true;
    } catch (error) {
      console.error('Error saving location settings:', error);
      return false;
    }
  }

  // ==================== LOCATION HISTORY ====================

  async saveLocationToHistory(location, context = 'manual') {
    try {
      const history = await this.getLocationHistory();
      
      history.unshift({
        ...location,
        context,
        savedAt: new Date().toISOString(),
      });

      // Keep only last 100 locations
      const trimmed = history.slice(0, 100);
      
      await AsyncStorage.setItem(LOCATION_HISTORY_KEY, JSON.stringify(trimmed));
      return true;
    } catch (error) {
      console.error('Error saving location to history:', error);
      return false;
    }
  }

  async getLocationHistory() {
    try {
      const stored = await AsyncStorage.getItem(LOCATION_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting location history:', error);
      return [];
    }
  }

  async clearLocationHistory() {
    try {
      await AsyncStorage.removeItem(LOCATION_HISTORY_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing location history:', error);
      return false;
    }
  }

  // ==================== AUDIT LOCATION HELPERS ====================

  async captureAuditLocation(auditId, type = 'start') {
    const locationResult = await this.getCurrentLocation();
    
    if (locationResult.success) {
      await this.saveLocationToHistory(locationResult.location, `audit_${type}_${auditId}`);
    }

    return locationResult;
  }

  formatCoordinates(latitude, longitude, format = 'decimal') {
    if (format === 'decimal') {
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
    
    // DMS format
    const toDMS = (coord, isLat) => {
      const absolute = Math.abs(coord);
      const degrees = Math.floor(absolute);
      const minutesNotTruncated = (absolute - degrees) * 60;
      const minutes = Math.floor(minutesNotTruncated);
      const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);
      
      const direction = isLat
        ? coord >= 0 ? 'N' : 'S'
        : coord >= 0 ? 'E' : 'W';
      
      return `${degrees}°${minutes}'${seconds}"${direction}`;
    };

    return `${toDMS(latitude, true)} ${toDMS(longitude, false)}`;
  }

  getGoogleMapsUrl(latitude, longitude) {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }

  getAppleMapsUrl(latitude, longitude) {
    return `https://maps.apple.com/?ll=${latitude},${longitude}`;
  }
}

export const LocationService = new LocationServiceClass();
export default LocationService;

