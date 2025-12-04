import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useBiometric } from '../context/BiometricContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { themeConfig } from '../config/theme';

const { width } = Dimensions.get('window');

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const { login, loginWithToken } = useAuth();
  const { isEnabled, biometricType, biometricIcon, canUseBiometric, quickUnlock } = useBiometric();
  const navigation = useNavigation();

  // Auto-prompt biometric on mount if available
  useEffect(() => {
    if (isEnabled && canUseBiometric) {
      // Small delay to let screen render first
      const timer = setTimeout(() => {
        handleBiometricLogin();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // Navigation will happen automatically via AuthContext
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Invalid credentials';
      
      if (error.response) {
        errorMessage = error.response.data?.error || error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Cannot connect to server. Please check:\n\n1. Backend server is running\n2. Correct IP address in API config\n3. Device and computer are on same network';
      } else {
        errorMessage = error.message || 'An unexpected error occurred';
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!isEnabled || !canUseBiometric) return;

    setBiometricLoading(true);
    try {
      const result = await quickUnlock();
      
      if (result.success && result.credentials) {
        // Use stored token to login
        await loginWithToken(result.credentials.token, result.credentials.email);
      } else if (result.error) {
        // Only show error if it's not a user cancel
        if (!result.error.includes('cancel') && !result.error.includes('Cancel')) {
          Alert.alert('Biometric Login Failed', 'Please use your email and password.');
        }
      }
    } catch (error) {
      console.error('Biometric login error:', error);
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={themeConfig.auth.gradientColors}
        locations={themeConfig.auth.gradientLocations}
        style={styles.gradient}
      >
        {/* Decorative circles */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={themeConfig.dashboardCards.card1}
                style={styles.logoBackground}
              >
                <Icon name="restaurant" size={45} color="#fff" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>Lite Bite Foods</Text>
            <Text style={styles.brandSubtitle}>AUDIT PRO</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

            {/* Form Card */}
            <View style={styles.formCard}>
              {/* Email Input */}
              <View style={[
                styles.inputContainer,
                focusedInput === 'email' && styles.inputFocused
              ]}>
                <Icon 
                  name="email" 
                  size={20} 
                  color={focusedInput === 'email' ? themeConfig.primary.main : themeConfig.text.secondary} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={themeConfig.text.disabled}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              {/* Password Input */}
              <View style={[
                styles.inputContainer,
                focusedInput === 'password' && styles.inputFocused
              ]}>
                <Icon 
                  name="lock" 
                  size={20} 
                  color={focusedInput === 'password' ? themeConfig.primary.main : themeConfig.text.secondary} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={themeConfig.text.disabled}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Icon 
                    name={showPassword ? 'visibility-off' : 'visibility'} 
                    size={20} 
                    color={themeConfig.text.secondary} 
                  />
                </TouchableOpacity>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={themeConfig.dashboardCards.card1}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Biometric Login Button */}
              {isEnabled && canUseBiometric && (
                <>
                  <View style={styles.orDivider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={[styles.biometricButton, biometricLoading && styles.buttonDisabled]}
                    onPress={handleBiometricLogin}
                    disabled={biometricLoading}
                    activeOpacity={0.8}
                  >
                    {biometricLoading ? (
                      <ActivityIndicator color={themeConfig.primary.main} />
                    ) : (
                      <>
                        <Icon name={biometricIcon} size={24} color={themeConfig.primary.main} />
                        <Text style={styles.biometricButtonText}>
                          Sign in with {biometricType}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

{/* Sign Up link hidden - registration disabled */}
            </View>

            {/* Footer */}
            <Text style={styles.footer}>© 2025 Audit Pro. All rights reserved.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(196, 30, 58, 0.08)',
    top: -150,
    right: -120,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    bottom: -80,
    left: -80,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBackground: {
    width: 90,
    height: 90,
    borderRadius: themeConfig.borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    ...themeConfig.shadows.glow,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: themeConfig.primary.main,
    textAlign: 'center',
    letterSpacing: 3,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 32,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: themeConfig.borderRadius.xl,
    padding: 24,
    ...themeConfig.shadows.large,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeConfig.background.default,
    borderRadius: themeConfig.borderRadius.medium,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputFocused: {
    borderColor: themeConfig.primary.main,
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: themeConfig.text.primary,
  },
  button: {
    marginTop: 8,
    borderRadius: themeConfig.borderRadius.medium,
    overflow: 'hidden',
  },
  buttonGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: themeConfig.text.secondary,
    fontSize: 14,
  },
  linkBold: {
    color: themeConfig.primary.main,
    fontWeight: '600',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: themeConfig.border.default,
  },
  dividerText: {
    marginHorizontal: 12,
    color: themeConfig.text.secondary,
    fontSize: 14,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: themeConfig.borderRadius.medium,
    borderWidth: 2,
    borderColor: themeConfig.primary.main,
    backgroundColor: themeConfig.primary.main + '08',
  },
  biometricButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: themeConfig.primary.main,
  },
  footer: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
  },
});

export default LoginScreen;
