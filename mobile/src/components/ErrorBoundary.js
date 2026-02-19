import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { captureSentryException } from '../config/sentry';

/**
 * React Native Error Boundary — catches unhandled rendering errors
 * and shows a fallback UI instead of a crash.
 * Reports errors to Sentry for monitoring and debugging.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console in development
    if (__DEV__) {
      console.error('[ErrorBoundary] Component error:', error, errorInfo);
    }
    
    // Report to Sentry
    captureSentryException(error, {
      react: {
        componentStack: errorInfo.componentStack,
      },
      errorBoundary: {
        parentComponent: this.props.parentComponent || 'App',
        screen: this.props.currentScreen || 'Unknown',
      },
    });
    
    // Store error info for display
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            An unexpected error occurred. Please try again.
          </Text>
          {this.state.error && (
            <ScrollView style={styles.errorBox}>
              <Text style={styles.errorText}>{this.state.error.toString()}</Text>
              {this.state.errorInfo?.componentStack && (
                <Text style={styles.errorText}>{'\n'}Component Stack:{'\n'}{this.state.errorInfo.componentStack}</Text>
              )}
            </ScrollView>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 300,
  },
  errorBox: {
    maxHeight: 250,
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 11,
    color: '#991B1B',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#B91C1C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ErrorBoundary;
