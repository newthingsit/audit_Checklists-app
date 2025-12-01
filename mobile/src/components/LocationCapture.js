import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useLocation } from '../context/LocationContext';
import { themeConfig } from '../config/theme';

// Location Capture Button
export const LocationCaptureButton = ({ 
  onCapture, 
  disabled = false,
  label = 'Capture Location',
  capturedLabel = 'Location Captured',
  captured = false,
  showCoordinates = true,
  location = null,
}) => {
  const { getCurrentLocation, isLoading, formatCoordinates } = useLocation();
  const [localLocation, setLocalLocation] = useState(location);

  const handleCapture = async () => {
    const result = await getCurrentLocation();
    if (result.success) {
      setLocalLocation(result.location);
      if (onCapture) {
        onCapture(result.location);
      }
    }
  };

  const displayLocation = localLocation || location;
  const isCaptured = captured || !!displayLocation;

  return (
    <TouchableOpacity
      style={[
        styles.captureButton,
        isCaptured && styles.captureButtonCaptured,
        disabled && styles.captureButtonDisabled,
      ]}
      onPress={handleCapture}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
    >
      <View style={styles.captureButtonContent}>
        <View style={[
          styles.captureButtonIcon,
          isCaptured && styles.captureButtonIconCaptured,
        ]}>
          {isLoading ? (
            <ActivityIndicator size="small" color={themeConfig.primary.main} />
          ) : (
            <Icon 
              name={isCaptured ? 'check-circle' : 'my-location'} 
              size={24} 
              color={isCaptured ? themeConfig.success.main : themeConfig.primary.main} 
            />
          )}
        </View>
        <View style={styles.captureButtonText}>
          <Text style={[
            styles.captureButtonLabel,
            isCaptured && styles.captureButtonLabelCaptured,
          ]}>
            {isCaptured ? capturedLabel : label}
          </Text>
          {showCoordinates && displayLocation && (
            <Text style={styles.captureButtonCoords}>
              {formatCoordinates(displayLocation.latitude, displayLocation.longitude)}
            </Text>
          )}
          {!isCaptured && (
            <Text style={styles.captureButtonHint}>
              Tap to capture your current location
            </Text>
          )}
        </View>
      </View>
      <Icon 
        name={isCaptured ? 'refresh' : 'chevron-right'} 
        size={22} 
        color={themeConfig.text.disabled} 
      />
    </TouchableOpacity>
  );
};

// Location Display Card
export const LocationDisplay = ({ 
  location, 
  label = 'Location',
  showOpenMaps = true,
  showAccuracy = true,
  compact = false,
}) => {
  const { formatCoordinates, openInMaps, getAddress } = useLocation();
  const [address, setAddress] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  useEffect(() => {
    if (location && !compact) {
      loadAddress();
    }
  }, [location]);

  const loadAddress = async () => {
    if (!location) return;
    setLoadingAddress(true);
    const result = await getAddress(location.latitude, location.longitude);
    if (result.success) {
      setAddress(result.address);
    }
    setLoadingAddress(false);
  };

  if (!location) {
    return (
      <View style={[styles.locationDisplay, styles.locationDisplayEmpty]}>
        <Icon name="location-off" size={24} color={themeConfig.text.disabled} />
        <Text style={styles.noLocationText}>No location data</Text>
      </View>
    );
  }

  if (compact) {
    return (
      <View style={styles.locationDisplayCompact}>
        <Icon name="place" size={16} color={themeConfig.primary.main} />
        <Text style={styles.locationDisplayCompactText}>
          {formatCoordinates(location.latitude, location.longitude)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.locationDisplay}>
      <View style={styles.locationDisplayHeader}>
        <View style={styles.locationDisplayIcon}>
          <Icon name="place" size={20} color={themeConfig.primary.main} />
        </View>
        <Text style={styles.locationDisplayLabel}>{label}</Text>
      </View>

      <View style={styles.locationDisplayContent}>
        <Text style={styles.locationDisplayCoords}>
          {formatCoordinates(location.latitude, location.longitude)}
        </Text>
        
        {loadingAddress ? (
          <ActivityIndicator size="small" color={themeConfig.text.secondary} />
        ) : address && (
          <Text style={styles.locationDisplayAddress} numberOfLines={2}>
            {address}
          </Text>
        )}

        <View style={styles.locationDisplayMeta}>
          {showAccuracy && location.accuracy && (
            <View style={styles.locationDisplayMetaItem}>
              <Icon name="gps-fixed" size={14} color={themeConfig.text.secondary} />
              <Text style={styles.locationDisplayMetaText}>
                ±{Math.round(location.accuracy)}m accuracy
              </Text>
            </View>
          )}
          {location.timestamp && (
            <View style={styles.locationDisplayMetaItem}>
              <Icon name="schedule" size={14} color={themeConfig.text.secondary} />
              <Text style={styles.locationDisplayMetaText}>
                {new Date(location.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {showOpenMaps && (
        <TouchableOpacity
          style={styles.openMapsButton}
          onPress={() => openInMaps(location.latitude, location.longitude)}
          activeOpacity={0.7}
        >
          <Icon name="map" size={16} color={themeConfig.primary.main} />
          <Text style={styles.openMapsButtonText}>Open in Maps</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Location Verification Component
export const LocationVerification = ({
  expectedLocation,
  maxDistance = 500,
  onVerificationComplete,
  locationName = 'the expected location',
}) => {
  const { verifyLocation, isLoading, currentLocation } = useLocation();
  const [verificationResult, setVerificationResult] = useState(null);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isLoading]);

  const handleVerify = async () => {
    if (!expectedLocation) return;

    const result = await verifyLocation(
      expectedLocation.latitude,
      expectedLocation.longitude,
      maxDistance
    );

    setVerificationResult(result);

    if (onVerificationComplete) {
      onVerificationComplete(result);
    }
  };

  const getStatusColor = () => {
    if (!verificationResult) return themeConfig.primary.main;
    return verificationResult.verified 
      ? themeConfig.success.main 
      : themeConfig.error.main;
  };

  const getStatusIcon = () => {
    if (isLoading) return 'my-location';
    if (!verificationResult) return 'location-searching';
    return verificationResult.verified ? 'check-circle' : 'error';
  };

  return (
    <View style={styles.verification}>
      <View style={styles.verificationHeader}>
        <Text style={styles.verificationTitle}>Location Verification</Text>
        <Text style={styles.verificationSubtitle}>
          Verify you are at {locationName}
        </Text>
      </View>

      <Animated.View 
        style={[
          styles.verificationStatus,
          { transform: [{ scale: pulseAnim }] },
          { borderColor: getStatusColor() },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={getStatusColor()} />
        ) : (
          <Icon name={getStatusIcon()} size={48} color={getStatusColor()} />
        )}
      </Animated.View>

      {verificationResult && (
        <View style={[
          styles.verificationResult,
          { backgroundColor: verificationResult.verified 
            ? themeConfig.success.bg 
            : themeConfig.error.bg 
          },
        ]}>
          <Icon 
            name={verificationResult.verified ? 'check' : 'close'} 
            size={20} 
            color={verificationResult.verified 
              ? themeConfig.success.dark 
              : themeConfig.error.dark
            } 
          />
          <View style={styles.verificationResultText}>
            <Text style={[
              styles.verificationResultTitle,
              { color: verificationResult.verified 
                ? themeConfig.success.dark 
                : themeConfig.error.dark 
              },
            ]}>
              {verificationResult.verified ? 'Location Verified' : 'Location Mismatch'}
            </Text>
            <Text style={styles.verificationResultMessage}>
              {verificationResult.message}
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.verifyButton,
          isLoading && styles.verifyButtonDisabled,
        ]}
        onPress={handleVerify}
        disabled={isLoading || !expectedLocation}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isLoading 
            ? [themeConfig.text.disabled, themeConfig.text.disabled]
            : themeConfig.dashboardCards.card1
          }
          style={styles.verifyButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Icon 
            name={isLoading ? 'sync' : 'my-location'} 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.verifyButtonText}>
            {isLoading ? 'Verifying...' : (verificationResult ? 'Verify Again' : 'Verify Location')}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// Location Permission Request
export const LocationPermissionRequest = ({ onPermissionGranted }) => {
  const { requestPermissions, permissionGranted } = useLocation();
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (permissionGranted && onPermissionGranted) {
      onPermissionGranted();
    }
  }, [permissionGranted]);

  const handleRequest = async () => {
    setRequesting(true);
    await requestPermissions();
    setRequesting(false);
  };

  if (permissionGranted) {
    return null;
  }

  return (
    <View style={styles.permissionRequest}>
      <View style={styles.permissionRequestIcon}>
        <Icon name="location-off" size={48} color={themeConfig.warning.main} />
      </View>
      <Text style={styles.permissionRequestTitle}>Location Access Required</Text>
      <Text style={styles.permissionRequestText}>
        This app needs access to your location to verify you are at the correct audit location.
      </Text>
      <TouchableOpacity
        style={styles.permissionRequestButton}
        onPress={handleRequest}
        disabled={requesting}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={themeConfig.dashboardCards.card1}
          style={styles.permissionRequestButtonGradient}
        >
          {requesting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="location-on" size={20} color="#fff" />
              <Text style={styles.permissionRequestButtonText}>Enable Location</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // Capture Button
  captureButton: {
    backgroundColor: themeConfig.background.paper,
    borderRadius: themeConfig.borderRadius.medium,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: themeConfig.border.default,
    ...themeConfig.shadows.small,
  },
  captureButtonCaptured: {
    borderColor: themeConfig.success.light,
    backgroundColor: themeConfig.success.bg,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  captureButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: themeConfig.primary.main + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  captureButtonIconCaptured: {
    backgroundColor: themeConfig.success.bg,
  },
  captureButtonText: {
    flex: 1,
  },
  captureButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: themeConfig.text.primary,
  },
  captureButtonLabelCaptured: {
    color: themeConfig.success.dark,
  },
  captureButtonCoords: {
    fontSize: 12,
    color: themeConfig.text.secondary,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  captureButtonHint: {
    fontSize: 12,
    color: themeConfig.text.secondary,
    marginTop: 2,
  },

  // Location Display
  locationDisplay: {
    backgroundColor: themeConfig.background.paper,
    borderRadius: themeConfig.borderRadius.medium,
    padding: 16,
    ...themeConfig.shadows.small,
  },
  locationDisplayEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  noLocationText: {
    color: themeConfig.text.disabled,
    fontSize: 14,
    marginLeft: 8,
  },
  locationDisplayCompact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationDisplayCompactText: {
    fontSize: 12,
    color: themeConfig.text.secondary,
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  locationDisplayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationDisplayIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: themeConfig.primary.main + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  locationDisplayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeConfig.text.primary,
  },
  locationDisplayContent: {
    paddingLeft: 42,
  },
  locationDisplayCoords: {
    fontSize: 14,
    color: themeConfig.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  locationDisplayAddress: {
    fontSize: 13,
    color: themeConfig.text.secondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  locationDisplayMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  locationDisplayMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationDisplayMetaText: {
    fontSize: 12,
    color: themeConfig.text.secondary,
    marginLeft: 4,
  },
  openMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: themeConfig.border.light,
  },
  openMapsButtonText: {
    fontSize: 13,
    color: themeConfig.primary.main,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Verification
  verification: {
    backgroundColor: themeConfig.background.paper,
    borderRadius: themeConfig.borderRadius.large,
    padding: 20,
    alignItems: 'center',
    ...themeConfig.shadows.small,
  },
  verificationHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 4,
  },
  verificationSubtitle: {
    fontSize: 13,
    color: themeConfig.text.secondary,
    textAlign: 'center',
  },
  verificationStatus: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: themeConfig.background.default,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    marginBottom: 20,
  },
  verificationResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: themeConfig.borderRadius.medium,
    marginBottom: 16,
    width: '100%',
  },
  verificationResultText: {
    marginLeft: 10,
    flex: 1,
  },
  verificationResultTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  verificationResultMessage: {
    fontSize: 12,
    color: themeConfig.text.secondary,
    marginTop: 2,
  },
  verifyButton: {
    width: '100%',
    borderRadius: themeConfig.borderRadius.medium,
    overflow: 'hidden',
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Permission Request
  permissionRequest: {
    backgroundColor: themeConfig.background.paper,
    borderRadius: themeConfig.borderRadius.large,
    padding: 24,
    alignItems: 'center',
    ...themeConfig.shadows.small,
  },
  permissionRequestIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: themeConfig.warning.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionRequestTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 8,
  },
  permissionRequestText: {
    fontSize: 14,
    color: themeConfig.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  permissionRequestButton: {
    width: '100%',
    borderRadius: themeConfig.borderRadius.medium,
    overflow: 'hidden',
  },
  permissionRequestButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  permissionRequestButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default {
  LocationCaptureButton,
  LocationDisplay,
  LocationVerification,
  LocationPermissionRequest,
};

