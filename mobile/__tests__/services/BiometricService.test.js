/**
 * BiometricService Integration Tests
 * Tests biometric authentication and credential storage
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import BiometricService from '../../src/services/BiometricService';

// Mock dependencies
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  AuthenticationType: {
    FACIAL_RECOGNITION: 1,
    FINGERPRINT: 2,
    IRIS: 3,
  },
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

describe('BiometricService Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default LocalAuthentication mocks
    LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
    LocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([2]); // FINGERPRINT
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
    LocalAuthentication.authenticateAsync.mockResolvedValue({
      success: true,
      warning: null,
      error: null,
    });

    // Default SecureStore mocks
    SecureStore.getItemAsync.mockResolvedValue(null);
    SecureStore.setItemAsync.mockResolvedValue(undefined);
    SecureStore.deleteItemAsync.mockResolvedValue(undefined);

    // Reset service state
    BiometricService.isAvailable = false;
    BiometricService.supportedTypes = [];
    BiometricService.isEnrolled = false;
  });

  describe('Device Capability', () => {
    it('should check device capability', async () => {
      const result = await BiometricService.checkDeviceCapability();

      expect(result.isAvailable).toBe(true);
      expect(result.isEnrolled).toBe(true);
      expect(Array.isArray(result.supportedTypes)).toBe(true);
    });

    it('should handle no biometric hardware', async () => {
      LocalAuthentication.hasHardwareAsync.mockResolvedValue(false);

      const result = await BiometricService.checkDeviceCapability();

      expect(result.isAvailable).toBe(false);
    });

    it('should handle biometric not enrolled', async () => {
      LocalAuthentication.isEnrolledAsync.mockResolvedValue(false);

      const result = await BiometricService.checkDeviceCapability();

      expect(result.isEnrolled).toBe(false);
    });

    it('should identify Face ID on iOS', async () => {
      LocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([1]); // FACIAL_RECOGNITION
      Platform.OS = 'ios';

      const result = await BiometricService.checkDeviceCapability();

      expect(result.biometricType).toContain('Face');
    });

    it('should identify Fingerprint/Touch ID', async () => {
      LocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([2]); // FINGERPRINT

      const result = await BiometricService.checkDeviceCapability();

      expect(result.biometricType).toBeDefined();
    });

    it('should handle capability check errors', async () => {
      LocalAuthentication.hasHardwareAsync.mockRejectedValue(
        new Error('Capability error')
      );

      const result = await BiometricService.checkDeviceCapability();

      expect(result.isAvailable).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Biometric Type Names', () => {
    it('should return Face ID for iOS with facial recognition', async () => {
      await BiometricService.checkDeviceCapability();
      LocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([1]); // FACIAL_RECOGNITION

      const typeName = BiometricService.getBiometricTypeName();

      expect(typeName).toBeDefined();
    });

    it('should return null when biometric not available', () => {
      BiometricService.isAvailable = false;

      const typeName = BiometricService.getBiometricTypeName();

      expect(typeName).toBeNull();
    });

    it('should return icon for biometric type', async () => {
      await BiometricService.checkDeviceCapability();

      const icon = BiometricService.getBiometricIcon();

      expect(icon).toBeDefined();
      expect(typeof icon).toBe('string');
    });
  });

  describe('Authentication', () => {
    it('should authenticate successfully', async () => {
      const result = await BiometricService.authenticate();

      expect(result.success).toBe(true);
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalled();
    });

    it('should store last auth time on success', async () => {
      await BiometricService.authenticate();

      expect(SecureStore.setItemAsync).toHaveBeenCalled();
    });

    it('should handle authentication failure', async () => {
      LocalAuthentication.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'User canceled',
      });

      const result = await BiometricService.authenticate();

      expect(result.success).toBe(false);
    });

    it('should handle biometric not available', async () => {
      LocalAuthentication.hasHardwareAsync.mockResolvedValue(false);

      const result = await BiometricService.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('should handle biometric not enrolled', async () => {
      LocalAuthentication.isEnrolledAsync.mockResolvedValue(false);

      const result = await BiometricService.authenticate();

      expect(result.success).toBe(false);
      expect(result.notEnrolled).toBe(true);
    });

    it('should support custom prompt options', async () => {
      const customOptions = {
        promptMessage: 'Verify your identity',
        cancelLabel: 'Close',
      };

      await BiometricService.authenticate(customOptions);

      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalled();
    });

    it('should handle authentication errors', async () => {
      LocalAuthentication.authenticateAsync.mockRejectedValue(
        new Error('Auth error')
      );

      const result = await BiometricService.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Enable/Disable Biometric', () => {
    it('should check if biometric is enabled', async () => {
      SecureStore.getItemAsync.mockResolvedValue('true');

      const result = await BiometricService.isEnabled();

      expect(result).toBe(true);
    });

    it('should return false when biometric is disabled', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);

      const result = await BiometricService.isEnabled();

      expect(result).toBe(false);
    });

    it('should enable biometric after authentication', async () => {
      LocalAuthentication.authenticateAsync.mockResolvedValue({
        success: true,
      });

      const result = await BiometricService.enable();

      expect(result.success).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
    });

    it('should fail to enable if authentication fails', async () => {
      LocalAuthentication.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'User canceled',
      });

      const result = await BiometricService.enable();

      expect(result.success).toBe(false);
    });

    it('should disable biometric and clear data', async () => {
      const result = await BiometricService.disable();

      expect(result.success).toBe(true);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
    });

    it('should handle enable errors', async () => {
      LocalAuthentication.authenticateAsync.mockRejectedValue(
        new Error('Enable error')
      );

      const result = await BiometricService.enable();

      expect(result.success).toBe(false);
    });

    it('should handle disable errors', async () => {
      SecureStore.deleteItemAsync.mockRejectedValue(
        new Error('Disable error')
      );

      const result = await BiometricService.disable();

      expect(result.success).toBe(false);
    });
  });

  describe('Credential Storage', () => {
    it('should store credentials securely', async () => {
      const result = await BiometricService.storeCredentials('user@example.com', 'token123');

      expect(result.success).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
    });

    it('should retrieve stored credentials', async () => {
      const credentials = {
        email: 'user@example.com',
        token: 'token123',
        storedAt: new Date().toISOString(),
      };

      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(credentials));

      const result = await BiometricService.getStoredCredentials();

      expect(result.success).toBe(true);
      expect(result.credentials).toBeDefined();
    });

    it('should handle missing stored credentials', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);

      const result = await BiometricService.getStoredCredentials();

      expect(result.success).toBe(false);
    });

    it('should clear stored credentials', async () => {
      const result = await BiometricService.clearStoredCredentials();

      expect(result.success).toBe(true);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });

    it('should handle credential storage errors', async () => {
      SecureStore.setItemAsync.mockRejectedValue(
        new Error('Storage error')
      );

      const result = await BiometricService.storeCredentials('user@example.com', 'token');

      expect(result.success).toBe(false);
    });

    it('should handle credential retrieval errors', async () => {
      SecureStore.getItemAsync.mockRejectedValue(
        new Error('Retrieval error')
      );

      const result = await BiometricService.getStoredCredentials();

      expect(result.success).toBe(false);
    });
  });

  describe('Quick Unlock (Authenticate and Get Credentials)', () => {
    it('should authenticate and return stored credentials', async () => {
      SecureStore.getItemAsync
        .mockResolvedValueOnce('true') // isEnabled
        .mockResolvedValueOnce(JSON.stringify({
          email: 'user@example.com',
          token: 'token123',
        })); // getStoredCredentials

      LocalAuthentication.authenticateAsync.mockResolvedValue({
        success: true,
      });

      const result = await BiometricService.authenticateAndGetCredentials();

      expect(result.success).toBe(true);
      expect(result.credentials).toBeDefined();
    });

    it('should fail if biometric is not enabled', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null); // isEnabled returns false

      const result = await BiometricService.authenticateAndGetCredentials();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not enabled');
    });

    it('should fail if no stored credentials', async () => {
      SecureStore.getItemAsync
        .mockResolvedValueOnce('true') // isEnabled
        .mockResolvedValueOnce(null); // getStoredCredentials

      const result = await BiometricService.authenticateAndGetCredentials();

      expect(result.success).toBe(false);
      expect(result.error).toContain('credentials');
    });

    it('should fail if authentication fails', async () => {
      SecureStore.getItemAsync
        .mockResolvedValueOnce('true')
        .mockResolvedValueOnce(JSON.stringify({ email: 'user@example.com', token: 'token' }));

      LocalAuthentication.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'User canceled',
      });

      const result = await BiometricService.authenticateAndGetCredentials();

      expect(result.success).toBe(false);
    });

    it('should handle quick unlock errors', async () => {
      SecureStore.getItemAsync.mockRejectedValue(
        new Error('Quick unlock error')
      );

      const result = await BiometricService.authenticateAndGetCredentials();

      expect(result.success).toBe(false);
    });
  });

  describe('Last Authentication Info', () => {
    it('should get last authentication time', async () => {
      const timestamp = new Date().toISOString();
      SecureStore.getItemAsync.mockResolvedValue(timestamp);

      const result = await BiometricService.getLastAuthTime();

      expect(result).toBeInstanceOf(Date);
    });

    it('should return null when no last auth time', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);

      const result = await BiometricService.getLastAuthTime();

      expect(result).toBeNull();
    });

    it('should determine if reauth is required', async () => {
      const recentTime = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
      SecureStore.getItemAsync.mockResolvedValue(recentTime.toISOString());

      const result = await BiometricService.shouldRequireReauth(5); // Max 5 minutes

      expect(result).toBe(false);
    });

    it('should require reauth if last auth is too old', async () => {
      const oldTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      SecureStore.getItemAsync.mockResolvedValue(oldTime.toISOString());

      const result = await BiometricService.shouldRequireReauth(5); // Max 5 minutes

      expect(result).toBe(true);
    });

    it('should require reauth if no last auth time', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);

      const result = await BiometricService.shouldRequireReauth(5);

      expect(result).toBe(true);
    });

    it('should handle last auth time errors', async () => {
      SecureStore.getItemAsync.mockRejectedValue(
        new Error('Time error')
      );

      const result = await BiometricService.getLastAuthTime();

      expect(result).toBeNull();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle SecureStore not available', async () => {
      SecureStore.getItemAsync.mockRejectedValue(
        new Error('SecureStore unavailable')
      );

      const result = await BiometricService.isEnabled();

      expect(result).toBe(false);
    });

    it('should handle invalid JSON in stored data gracefully', async () => {
      SecureStore.getItemAsync.mockResolvedValue('invalid json');

      const result = await BiometricService.getStoredCredentials();

      // Service handles JSON errors gracefully and returns failure
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle concurrent authentication requests', async () => {
      const promise1 = BiometricService.authenticate();
      const promise2 = BiometricService.authenticate();

      const results = await Promise.all([promise1, promise2]);

      expect(results.length).toBe(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });
});
