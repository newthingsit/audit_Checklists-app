import React from 'react';
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
      
      <NavigationContainer>
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
