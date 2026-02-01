// Initialize tracing FIRST
import { initTracing } from './utils/tracing';
initTracing();

import { registerRootComponent } from 'expo';
import React, { useRef, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { OfflineProvider } from './src/context/OfflineContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { LocationProvider } from './src/context/LocationContext';
import { BiometricProvider } from './src/context/BiometricContext';
import AuthStack from './src/navigation/AuthStack';
import AppStack from './src/navigation/AppStack';
import { OfflineBanner } from './src/components/OfflineIndicator';
import { themeConfig } from './src/config/theme';

const Stack = createStackNavigator();

function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const navigationRef = useRef(null);
  const prevAuthRef = useRef(isAuthenticated);

  // Reset to Dashboard when user becomes authenticated (after login)
  useEffect(() => {
    if (isAuthenticated && !prevAuthRef.current && navigationRef.current) {
      // User just logged in, ensure we're on Dashboard
      const state = navigationRef.current.getRootState();
      if (state) {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      }
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeConfig.primary.main} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Offline Banner - Shows when offline */}
      {isAuthenticated && <OfflineBanner />}
      
      <NavigationContainer ref={navigationRef}>
        {isAuthenticated ? <AppStack /> : <AuthStack />}
      </NavigationContainer>
    </View>
  );
}

function AppWithProviders() {
  return (
    <NetworkProvider>
      <OfflineProvider>
        <NotificationProvider>
          <LocationProvider>
            <AuthProvider>
              <BiometricProvider>
                <AppNavigator />
              </BiometricProvider>
            </AuthProvider>
          </LocationProvider>
        </NotificationProvider>
      </OfflineProvider>
    </NetworkProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AppWithProviders />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeConfig.background.default,
  },
});

registerRootComponent(App);
