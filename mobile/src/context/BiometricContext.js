import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import BiometricService from '../services/BiometricService';
import { useAuth } from './AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const BiometricContext = createContext();

export const useBiometric = () => {
  const context = useContext(BiometricContext);
  if (!context) {
    throw new Error('useBiometric must be used within a BiometricProvider');
  }
  return context;
};

export const BiometricProvider = ({ children }) => {
  const { user, token } = useAuth();
  
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const [biometricIcon, setBiometricIcon] = useState('lock');
  const [isLoading, setIsLoading] = useState(true);
  const [featureEnabled, setFeatureEnabled] = useState(true); // Admin-controlled

  // Check device capability and settings on mount
  useEffect(() => {
    initializeBiometrics();
  }, []);

  // Re-check when user changes
  useEffect(() => {
    if (user) {
      checkFeatureFlag();
      checkBiometricSettings();
    }
  }, [user]);

  const initializeBiometrics = async () => {
    setIsLoading(true);
    try {
      const capability = await BiometricService.checkDeviceCapability();
      setIsAvailable(capability.isAvailable);
      setIsEnrolled(capability.isEnrolled);
      setBiometricType(capability.biometricType);
      setBiometricIcon(BiometricService.getBiometricIcon());

      const enabled = await BiometricService.isEnabled();
      setIsEnabled(enabled);
    } catch (error) {
      console.error('Error initializing biometrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if admin has enabled biometric auth feature
  const checkFeatureFlag = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings/features/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.data?.features) {
        setFeatureEnabled(response.data.features.feature_biometric_auth !== false);
      }
    } catch (error) {
      // Default to enabled if can't check
      console.log('Could not check feature flags, defaulting to enabled');
      setFeatureEnabled(true);
    }
  };

  const checkBiometricSettings = async () => {
    const enabled = await BiometricService.isEnabled();
    setIsEnabled(enabled);
  };

  // Enable biometric auth for the current user
  const enableBiometric = useCallback(async () => {
    if (!isAvailable) {
      Alert.alert('Not Available', 'Biometric authentication is not available on this device.');
      return { success: false };
    }

    if (!isEnrolled) {
      Alert.alert(
        'Not Enrolled',
        `Please set up ${biometricType || 'biometrics'} in your device settings first.`
      );
      return { success: false };
    }

    if (!featureEnabled) {
      Alert.alert('Feature Disabled', 'Biometric login has been disabled by your administrator.');
      return { success: false };
    }

    setIsLoading(true);
    try {
      const result = await BiometricService.enable();
      
      if (result.success && token) {
        // Store credentials for quick unlock
        await BiometricService.storeCredentials(user?.email, token);
        setIsEnabled(true);
        Alert.alert('Success', `${biometricType} login enabled!`);
      }
      
      return result;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, isEnrolled, featureEnabled, token, user, biometricType]);

  // Disable biometric auth
  const disableBiometric = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await BiometricService.disable();
      
      if (result.success) {
        setIsEnabled(false);
        Alert.alert('Disabled', `${biometricType || 'Biometric'} login has been disabled.`);
      }
      
      return result;
    } catch (error) {
      console.error('Error disabling biometric:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [biometricType]);

  // Authenticate with biometrics
  const authenticate = useCallback(async (options = {}) => {
    if (!isAvailable || !isEnrolled) {
      return { success: false, error: 'Biometrics not available' };
    }

    if (!featureEnabled) {
      return { success: false, error: 'Feature disabled by admin' };
    }

    return await BiometricService.authenticate({
      promptMessage: options.promptMessage || `Sign in with ${biometricType}`,
      ...options,
    });
  }, [isAvailable, isEnrolled, featureEnabled, biometricType]);

  // Quick unlock with stored credentials
  const quickUnlock = useCallback(async () => {
    if (!isEnabled) {
      return { success: false, error: 'Biometric login not enabled' };
    }

    if (!featureEnabled) {
      return { success: false, error: 'Feature disabled by admin' };
    }

    return await BiometricService.authenticateAndGetCredentials();
  }, [isEnabled, featureEnabled]);

  // Store new credentials after successful login
  const storeCredentials = useCallback(async (email, newToken) => {
    if (isEnabled) {
      return await BiometricService.storeCredentials(email, newToken);
    }
    return { success: false };
  }, [isEnabled]);

  // Clear stored credentials (on logout)
  const clearCredentials = useCallback(async () => {
    return await BiometricService.clearStoredCredentials();
  }, []);

  // Toggle biometric
  const toggleBiometric = useCallback(async () => {
    if (isEnabled) {
      return await disableBiometric();
    } else {
      return await enableBiometric();
    }
  }, [isEnabled, enableBiometric, disableBiometric]);

  const value = {
    // State
    isAvailable,
    isEnabled,
    isEnrolled,
    biometricType,
    biometricIcon,
    isLoading,
    featureEnabled,
    
    // Computed
    canUseBiometric: isAvailable && isEnrolled && featureEnabled,
    
    // Actions
    enableBiometric,
    disableBiometric,
    toggleBiometric,
    authenticate,
    quickUnlock,
    storeCredentials,
    clearCredentials,
    refreshStatus: initializeBiometrics,
  };

  return (
    <BiometricContext.Provider value={value}>
      {children}
    </BiometricContext.Provider>
  );
};

export default BiometricContext;

