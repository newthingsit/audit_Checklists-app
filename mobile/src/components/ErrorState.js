import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { themeConfig } from '../config/theme';

// Error type configurations
const errorConfigs = {
  network: {
    icon: 'wifi-off',
    title: 'Connection Error',
    description: 'Unable to connect to the server. Please check your internet connection.',
    actionLabel: 'Try Again',
  },
  server: {
    icon: 'cloud-off',
    title: 'Server Error',
    description: 'Something went wrong on our end. Please try again later.',
    actionLabel: 'Retry',
  },
  notFound: {
    icon: 'search-off',
    title: 'Not Found',
    description: 'The requested resource could not be found.',
    actionLabel: 'Go Back',
  },
  permission: {
    icon: 'lock',
    title: 'Access Denied',
    description: "You don't have permission to view this content.",
    actionLabel: null,
  },
  auth: {
    icon: 'account-circle',
    title: 'Session Expired',
    description: 'Your session has expired. Please log in again.',
    actionLabel: 'Log In',
  },
  generic: {
    icon: 'error-outline',
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again.',
    actionLabel: 'Retry',
  },
};

const ErrorState = ({
  type = 'generic',
  icon,
  title,
  description,
  actionLabel,
  onAction,
  showAction = true,
}) => {
  const config = errorConfigs[type] || errorConfigs.generic;
  const finalIcon = icon || config.icon;
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const finalActionLabel = actionLabel !== undefined ? actionLabel : config.actionLabel;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon name={finalIcon} size={48} color={themeConfig.error.main} />
      </View>
      <Text style={styles.title}>{finalTitle}</Text>
      <Text style={styles.description}>{finalDescription}</Text>
      
      {showAction && finalActionLabel && onAction && (
        <TouchableOpacity 
          onPress={onAction} 
          style={styles.actionButton}
          activeOpacity={0.7}
        >
          <Icon name="refresh" size={18} color="#fff" style={styles.actionIcon} />
          <Text style={styles.actionText}>{finalActionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Specific Error State Components
export const NetworkError = ({ onRetry }) => (
  <ErrorState type="network" onAction={onRetry} />
);

export const ServerError = ({ onRetry }) => (
  <ErrorState type="server" onAction={onRetry} />
);

export const NotFoundError = ({ onGoBack }) => (
  <ErrorState type="notFound" onAction={onGoBack} />
);

export const PermissionError = () => (
  <ErrorState type="permission" showAction={false} />
);

export const AuthError = ({ onLogin }) => (
  <ErrorState type="auth" onAction={onLogin} />
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: themeConfig.background.paper,
    borderRadius: themeConfig.borderRadius.large,
    marginHorizontal: 16,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: themeConfig.error.light,
    ...themeConfig.shadows.small,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: themeConfig.error.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: themeConfig.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeConfig.error.main,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: themeConfig.borderRadius.medium,
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ErrorState;

