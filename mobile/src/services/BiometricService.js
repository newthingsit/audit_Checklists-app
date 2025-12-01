import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Storage keys
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';
const BIOMETRIC_LAST_AUTH_KEY = 'biometric_last_auth';

class BiometricServiceClass {
  constructor() {
    this.isAvailable = false;
    this.supportedTypes = [];
    this.isEnrolled = false;
  }

  // ==================== DEVICE CAPABILITY ====================

  async checkDeviceCapability() {
    try {
      // Check if hardware supports biometrics
      this.isAvailable = await LocalAuthentication.hasHardwareAsync();
      
      if (this.isAvailable) {
        // Check supported biometric types
        this.supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        
        // Check if user has enrolled biometrics
        this.isEnrolled = await LocalAuthentication.isEnrolledAsync();
      }

      return {
        isAvailable: this.isAvailable,
        isEnrolled: this.isEnrolled,
        supportedTypes: this.supportedTypes,
        biometricType: this.getBiometricTypeName(),
      };
    } catch (error) {
      console.error('Error checking biometric capability:', error);
      return {
        isAvailable: false,
        isEnrolled: false,
        supportedTypes: [],
        error: error.message,
      };
    }
  }

  getBiometricTypeName() {
    if (!this.isAvailable || this.supportedTypes.length === 0) {
      return null;
    }

    const AuthType = LocalAuthentication.AuthenticationType;
    
    // Prioritize Face ID/Recognition over Fingerprint
    if (this.supportedTypes.includes(AuthType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    }
    
    if (this.supportedTypes.includes(AuthType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    
    if (this.supportedTypes.includes(AuthType.IRIS)) {
      return 'Iris';
    }

    return 'Biometric';
  }

  getBiometricIcon() {
    const typeName = this.getBiometricTypeName();
    
    switch (typeName) {
      case 'Face ID':
      case 'Face Recognition':
        return 'face';
      case 'Touch ID':
      case 'Fingerprint':
        return 'fingerprint';
      case 'Iris':
        return 'visibility';
      default:
        return 'lock';
    }
  }

  // ==================== AUTHENTICATION ====================

  async authenticate(options = {}) {
    try {
      const capability = await this.checkDeviceCapability();
      
      if (!capability.isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
        };
      }

      if (!capability.isEnrolled) {
        return {
          success: false,
          error: `No ${capability.biometricType || 'biometrics'} enrolled. Please set up biometrics in your device settings.`,
          notEnrolled: true,
        };
      }

      const defaultOptions = {
        promptMessage: `Authenticate with ${capability.biometricType}`,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      };

      const result = await LocalAuthentication.authenticateAsync({
        ...defaultOptions,
        ...options,
      });

      if (result.success) {
        // Update last successful auth timestamp
        await SecureStore.setItemAsync(BIOMETRIC_LAST_AUTH_KEY, new Date().toISOString());
      }

      return {
        success: result.success,
        error: result.error,
        warning: result.warning,
      };
    } catch (error) {
      console.error('Error during biometric authentication:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==================== ENABLE/DISABLE ====================

  async isEnabled() {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking if biometric is enabled:', error);
      return false;
    }
  }

  async enable() {
    try {
      // First, verify the user can authenticate
      const authResult = await this.authenticate({
        promptMessage: 'Verify your identity to enable biometric login',
      });

      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error || 'Authentication failed',
        };
      }

      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      
      return { success: true };
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return { success: false, error: error.message };
    }
  }

  async disable() {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_LAST_AUTH_KEY);
      
      return { success: true };
    } catch (error) {
      console.error('Error disabling biometric:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== CREDENTIAL STORAGE ====================

  async storeCredentials(email, token) {
    try {
      const credentials = JSON.stringify({ email, token, storedAt: new Date().toISOString() });
      await SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_KEY, credentials);
      return { success: true };
    } catch (error) {
      console.error('Error storing credentials:', error);
      return { success: false, error: error.message };
    }
  }

  async getStoredCredentials() {
    try {
      const credentials = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      if (credentials) {
        return { success: true, credentials: JSON.parse(credentials) };
      }
      return { success: false, error: 'No stored credentials' };
    } catch (error) {
      console.error('Error getting stored credentials:', error);
      return { success: false, error: error.message };
    }
  }

  async clearStoredCredentials() {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      return { success: true };
    } catch (error) {
      console.error('Error clearing stored credentials:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== QUICK UNLOCK ====================

  async authenticateAndGetCredentials() {
    try {
      // Check if biometric is enabled
      const enabled = await this.isEnabled();
      if (!enabled) {
        return { success: false, error: 'Biometric login is not enabled' };
      }

      // Check if we have stored credentials
      const storedResult = await this.getStoredCredentials();
      if (!storedResult.success) {
        return { success: false, error: 'No stored credentials. Please login with password first.' };
      }

      // Authenticate with biometrics
      const authResult = await this.authenticate({
        promptMessage: 'Sign in with biometrics',
      });

      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error || 'Biometric authentication failed',
        };
      }

      return {
        success: true,
        credentials: storedResult.credentials,
      };
    } catch (error) {
      console.error('Error in authenticateAndGetCredentials:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== LAST AUTH INFO ====================

  async getLastAuthTime() {
    try {
      const lastAuth = await SecureStore.getItemAsync(BIOMETRIC_LAST_AUTH_KEY);
      return lastAuth ? new Date(lastAuth) : null;
    } catch (error) {
      console.error('Error getting last auth time:', error);
      return null;
    }
  }

  async shouldRequireReauth(maxAgeMinutes = 5) {
    const lastAuth = await this.getLastAuthTime();
    if (!lastAuth) return true;
    
    const ageMs = Date.now() - lastAuth.getTime();
    const maxAgeMs = maxAgeMinutes * 60 * 1000;
    
    return ageMs > maxAgeMs;
  }
}

export const BiometricService = new BiometricServiceClass();
export default BiometricService;

