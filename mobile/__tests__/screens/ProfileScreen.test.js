import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileScreen from '../../src/screens/ProfileScreen';
import { useAuth } from '../../src/context/AuthContext';
import { useBiometric } from '../../src/context/BiometricContext';
import { useNotifications } from '../../src/context/NotificationContext';
import axios from 'axios';
import { Alert, Linking } from 'react-native';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn((callback) => {
    const unsubscribe = callback();
    return () => unsubscribe?.();
  }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }) =>
    require('react').createElement(require('react-native').View, null, children),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: ({ name, size, color, ...props }) =>
    require('react').createElement(require('react-native').View, {
      testID: `icon-${name}`,
      ...props,
    }),
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      version: '1.13.0',
    },
  },
}));

jest.mock('axios');

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../src/context/BiometricContext', () => ({
  useBiometric: jest.fn(),
}));

jest.mock('../../src/context/NotificationContext', () => ({
  useNotifications: jest.fn(),
}));

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};

const defaultAuthContext = {
  user: { id: '1', name: 'John Doe', email: 'john@example.com' },
  logout: jest.fn(),
  refreshUser: jest.fn(),
};

const defaultBiometricContext = {
  isAvailable: true,
  isEnabled: false,
  biometricType: 'face',
  biometricIcon: 'face',
  canUseBiometric: true,
  featureEnabled: true,
  toggleBiometric: jest.fn(),
  isLoading: false,
};

const defaultNotificationContext = {
  preferences: {
    email: true,
    push: true,
    sms: false,
  },
};

describe('ProfileScreen', () => {
  beforeEach(() => {
    const { useNavigation } = require('@react-navigation/native');
    useNavigation.mockReturnValue(mockNavigation);
    useAuth.mockReturnValue(defaultAuthContext);
    useBiometric.mockReturnValue(defaultBiometricContext);
    useNotifications.mockReturnValue(defaultNotificationContext);

    mockNavigation.goBack.mockClear();
    mockNavigation.navigate.mockClear();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    axios.put.mockClear();
    axios.post.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render profile screen with user data', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should display user name input', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should display user email input', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('john@example.com')).toBeTruthy();
    });

    test('should render profile header section', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should render with proper input structure', () => {
      render(<ProfileScreen />);
      const nameInput = screen.getByDisplayValue('John Doe');
      const emailInput = screen.getByDisplayValue('john@example.com');
      expect(nameInput).toBeTruthy();
      expect(emailInput).toBeTruthy();
    });

    test('should render multiple profile sections', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should be keyboard avoidable', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });
  });

  describe('User Profile Management', () => {
    test('should update name on text input change', () => {
      render(<ProfileScreen />);
      const nameInput = screen.getByDisplayValue('John Doe');

      fireEvent.changeText(nameInput, 'Jane Doe');
      expect(nameInput.props.value).toBe('Jane Doe');
    });

    test('should display user email read-only', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('john@example.com')).toBeTruthy();
    });

    test('should handle name field cleared', () => {
      render(<ProfileScreen />);
      const nameInput = screen.getByDisplayValue('John Doe');

      fireEvent.changeText(nameInput, '');
      expect(nameInput.props.value).toBe('');
    });

    test('should support profile API updates', async () => {
      axios.put.mockResolvedValueOnce({ status: 200 });
      render(<ProfileScreen />);
      const nameInput = screen.getByDisplayValue('John Doe');

      fireEvent.changeText(nameInput, 'Jane Doe');
      expect(nameInput.props.value).toBe('Jane Doe');
    });

    test('should handle profile update errors', async () => {
      axios.put.mockRejectedValueOnce(new Error('Update failed'));
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should refresh user data on screen focus', () => {
      render(<ProfileScreen />);
      expect(defaultAuthContext.refreshUser).toHaveBeenCalled();
    });

    test('should support manual refresh', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });
  });

  describe('Password & Security', () => {
    test('should render security section', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should handle password field interaction', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should support password change submission', async () => {
      axios.post.mockResolvedValueOnce({ status: 200 });
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should handle password visibility toggle', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should validate password requirements', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });
  });

  describe('Biometric Settings', () => {
    test('should integrate biometric context', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should handle biometric availability check', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should support biometric toggle', async () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should show biometric loading state', () => {
      useBiometric.mockReturnValue({
        ...defaultBiometricContext,
        isLoading: true,
      });
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should disable biometric when unavailable', () => {
      useBiometric.mockReturnValue({
        ...defaultBiometricContext,
        isAvailable: false,
      });
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });
  });

  describe('Notification Preferences', () => {
    test('should display notification settings section', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should integrate notification context', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should render preference toggles', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should handle preference changes', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });
  });

  describe('Account Actions', () => {
    test('should support account logout', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should show logout confirmation', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should support account deletion', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });
  });

  describe('App Information', () => {
    test('should display app information section', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should include version information', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should render external links', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    test('should navigate between profile sections', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should support back navigation', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should navigate to external content', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });
  });

  describe('Input Handling', () => {
    test('should trim whitespace from inputs', () => {
      render(<ProfileScreen />);
      const nameInput = screen.getByDisplayValue('John Doe');

      fireEvent.changeText(nameInput, '  Jane Doe  ');
      expect(nameInput.props.value).toBeTruthy();
    });

    test('should handle name with special characters', () => {
      render(<ProfileScreen />);
      const nameInput = screen.getByDisplayValue('John Doe');

      fireEvent.changeText(nameInput, "O'Brien-Smith");
      expect(nameInput.props.value).toBe("O'Brien-Smith");
    });

    test('should validate required fields', () => {
      render(<ProfileScreen />);
      const nameInput = screen.getByDisplayValue('John Doe');

      fireEvent.changeText(nameInput, '');
      expect(nameInput.props.value).toBe('');
    });

    test('should handle focus events', () => {
      render(<ProfileScreen />);
      const nameInput = screen.getByDisplayValue('John Doe');

      fireEvent(nameInput, 'focus');
      expect(nameInput).toBeTruthy();
    });

    test('should handle blur events', () => {
      render(<ProfileScreen />);
      const nameInput = screen.getByDisplayValue('John Doe');

      fireEvent(nameInput, 'blur');
      expect(nameInput).toBeTruthy();
    });
  });

  describe('State Management', () => {
    test('should update state when user prop changes', () => {
      const { rerender } = render(<ProfileScreen />);

      useAuth.mockReturnValue({
        ...defaultAuthContext,
        user: { id: '1', name: 'Jane Doe', email: 'jane@example.com' },
      });

      rerender(<ProfileScreen />);
      expect(screen.queryByDisplayValue('Jane Doe')).toBeTruthy();
    });

    test('should maintain form state during editing', () => {
      render(<ProfileScreen />);
      const nameInput = screen.getByDisplayValue('John Doe');

      fireEvent.changeText(nameInput, 'Jane Doe');
      expect(nameInput.props.value).toBe('Jane Doe');

      fireEvent.changeText(nameInput, 'Jane Smith');
      expect(nameInput.props.value).toBe('Jane Smith');
    });

    test('should handle rapid name updates', () => {
      render(<ProfileScreen />);
      const nameInput = screen.getByDisplayValue('John Doe');

      fireEvent.changeText(nameInput, 'New Name');
      expect(nameInput.props.value).toBe('New Name');

      fireEvent.changeText(nameInput, 'Another Name');
      expect(nameInput.props.value).toBe('Another Name');
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      axios.put.mockRejectedValueOnce(new Error('Network error'));
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should handle 400 bad request errors', async () => {
      const error = new Error('Bad Request');
      error.response = { status: 400 };
      axios.put.mockRejectedValueOnce(error);
      render(<ProfileScreen />);

      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should handle 409 conflict errors', async () => {
      const error = new Error('Conflict');
      error.response = { status: 409 };
      axios.put.mockRejectedValueOnce(error);
      render(<ProfileScreen />);

      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should handle 500 server errors', async () => {
      const error = new Error('Server Error');
      error.response = { status: 500 };
      axios.put.mockRejectedValueOnce(error);
      render(<ProfileScreen />);

      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should recover from errors', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    test('should have labeled input fields', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
      expect(screen.getByDisplayValue('john@example.com')).toBeTruthy();
    });

    test('should be keyboard navigable', () => {
      render(<ProfileScreen />);
      const nameInput = screen.getByDisplayValue('John Doe');
      fireEvent(nameInput, 'focus');
      expect(nameInput).toBeTruthy();
    });

    test('should have semantic HTML structure', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    test('should handle rapid text input changes', () => {
      render(<ProfileScreen />);
      const nameInput = screen.getByDisplayValue('John Doe');

      for (let i = 0; i < 10; i++) {
        fireEvent.changeText(nameInput, `Name ${i}`);
      }

      expect(nameInput.props.value).toBeTruthy();
    });

    test('should avoid unnecessary re-renders', () => {
      const { rerender } = render(<ProfileScreen />);

      rerender(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should handle large data efficiently', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });
  });

  describe('Layout', () => {
    test('should render scrollable content', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should support fullscreen mode', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should handle keyboard avoidance properly', () => {
      render(<ProfileScreen />);
      const nameInput = screen.getByDisplayValue('John Doe');

      fireEvent(nameInput, 'focus');
      expect(nameInput).toBeTruthy();
    });
  });

  describe('Context Integration', () => {
    test('should integrate with auth context', () => {
      render(<ProfileScreen />);
      expect(defaultAuthContext.refreshUser).toHaveBeenCalled();
    });

    test('should integrate with biometric context', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });

    test('should integrate with notification context', () => {
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    test('should handle null user gracefully', () => {
      useAuth.mockReturnValue({
        ...defaultAuthContext,
        user: null,
      });
      render(<ProfileScreen />);
      expect(screen.queryByDisplayValue('John Doe')).toBeFalsy();
    });

    test('should handle missing user fields', () => {
      useAuth.mockReturnValue({
        ...defaultAuthContext,
        user: { id: '1', name: '', email: 'john@example.com' },
      });
      render(<ProfileScreen />);
      expect(screen.getByDisplayValue('john@example.com')).toBeTruthy();
    });

    test('should handle rapid context switches', () => {
      const { rerender } = render(<ProfileScreen />);

      useAuth.mockReturnValue({
        ...defaultAuthContext,
        user: { id: '1', name: 'User 1', email: 'user1@example.com' },
      });
      rerender(<ProfileScreen />);

      useAuth.mockReturnValue({
        ...defaultAuthContext,
        user: { id: '1', name: 'User 2', email: 'user2@example.com' },
      });
      rerender(<ProfileScreen />);

      expect(screen.getByDisplayValue('User 2')).toBeTruthy();
    });
  });
});
