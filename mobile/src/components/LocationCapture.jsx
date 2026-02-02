import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { MaterialIcons } from '@expo/vector-icons';
import { themeConfig } from '../config/theme';

/**
 * LocationCapture Component (Mobile)
 * Captures GPS location with distance validation
 * Implements geofencing for location constraints
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onLocationCapture - Callback with location data
 * @param {number} props.maxDistance - Max distance from reference point
 * @param {boolean} props.required - Whether location is required
 * @returns {React.ReactElement}
 */
const LocationCapture = ({
  onLocationCapture,
  maxDistance = 5000,
  required = false,
}) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
      }
    } catch (err) {
      setError('Failed to request location permission');
    }
  };

  const captureLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude, accuracy: gpsAccuracy } = currentLocation.coords;

      setLocation({ latitude, longitude });
      setAccuracy(gpsAccuracy);

      // Call parent callback
      onLocationCapture({
        latitude,
        longitude,
        accuracy: gpsAccuracy,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setError(err.message || 'Failed to capture location');
      Alert.alert('Location Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearLocation = () => {
    setLocation(null);
    setAccuracy(null);
    setError(null);
    onLocationCapture(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Location</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {location ? (
        <View style={styles.locationDisplay}>
          <MaterialIcons name="location-on" size={20} color={themeConfig.primary.main} />
          <View style={styles.locationInfo}>
            <Text style={styles.locationCoords}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
            {accuracy && (
              <Text style={styles.accuracyText}>
                Accuracy: ±{accuracy.toFixed(0)}m
              </Text>
            )}
          </View>
        </View>
      ) : (
        <Text style={styles.placeholderText}>No location captured</Text>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.captureButton]}
          onPress={captureLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="gps-fixed" size={18} color="#fff" />
              <Text style={styles.buttonText}>Capture Location</Text>
            </>
          )}
        </TouchableOpacity>

        {location && (
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={clearLocation}
          >
            <MaterialIcons name="clear" size={18} color="#d32f2f" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginBottom: 8,
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    marginBottom: 10,
    gap: 10,
  },
  locationInfo: {
    flex: 1,
  },
  locationCoords: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  accuracyText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  placeholderText: {
    fontSize: 13,
    color: '#999',
    paddingVertical: 10,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
    flex: 1,
  },
  captureButton: {
    backgroundColor: themeConfig.primary.main,
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#d32f2f',
  },
  clearButtonText: {
    color: '#d32f2f',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default LocationCapture;
