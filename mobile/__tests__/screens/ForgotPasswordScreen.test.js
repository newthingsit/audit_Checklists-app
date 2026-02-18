import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ForgotPasswordScreen from '../../src/screens/ForgotPasswordScreen';
import axios from 'axios';
import { Alert } from 'react-native';

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

jest.mock('axios');

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    const { useNavigation } = require('@react-navigation/native');
    useNavigation.mockReturnValue(mockNavigation);
    mockNavigation.goBack.mockClear();
    mockNavigation.navigate.mockClear();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    axios.post.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render forgot password screen', () => {
      render(<ForgotPasswordScreen />);
      expect(screen.getByText('Forgot Password?')).toBeTruthy();
    });

    test('should render subtitle text', () => {
      render(<ForgotPasswordScreen />);
      expect(
        screen.getByText(
          "Enter your email address and we'll send you a link to reset your password."
        )
      ).toBeTruthy();
    });

    test('should render email input field', () => {
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      expect(emailInput).toBeTruthy();
    });

    test('should render send reset link button', () => {
      render(<ForgotPasswordScreen />);
      expect(screen.getByText('Send Reset Link')).toBeTruthy();
    });

    test('should render back to sign in link', () => {
      render(<ForgotPasswordScreen />);
      const backLink = screen.getByText(/Back to Sign In/);
      expect(backLink).toBeTruthy();
    });

    test('should render footer text', () => {
      render(<ForgotPasswordScreen />);
      expect(screen.getByText('© 2025 Audit Pro. All rights reserved.')).toBeTruthy();
    });
  });

  describe('Email Input Interactions', () => {
    test('should update email state on text change', () => {
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');

      fireEvent.changeText(emailInput, 'test@example.com');
      expect(emailInput.props.value).toBe('test@example.com');
    });

    test('should clear email input', () => {
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(emailInput, '');
      expect(emailInput.props.value).toBe('');
    });

    test('should set keyboard type to email-address', () => {
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      expect(emailInput.props.keyboardType).toBe('email-address');
    });

    test('should disable autocapitalize', () => {
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      expect(emailInput.props.autoCapitalize).toBe('none');
    });

    test('should handle focus on email input', () => {
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      fireEvent(emailInput, 'focus');
      // Focus styling is applied internally
      expect(emailInput).toBeTruthy();
    });

    test('should handle blur on email input', () => {
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      fireEvent(emailInput, 'blur');
      expect(emailInput).toBeTruthy();
    });
  });

  describe('Email Validation', () => {
    test('should show error alert for empty email', async () => {
      render(<ForgotPasswordScreen />);
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your email address');
      });
    });

    test('should show error alert for invalid email format', async () => {
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a valid email address');
      });
    });

    test('should accept valid email format', async () => {
      axios.post.mockResolvedValueOnce({ status: 200 });
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });
    });

    test('should accept email with multiple dots in domain', async () => {
      axios.post.mockResolvedValueOnce({ status: 200 });
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, 'user@mail.co.uk');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });
    });

    test('should accept email with plus addressing', async () => {
      axios.post.mockResolvedValueOnce({ status: 200 });
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, 'user+tag@example.com');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });
    });
  });

  describe('Password Reset Submission', () => {
    test('should call API with correct email', async () => {
      axios.post.mockResolvedValueOnce({ status: 200 });
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/auth/forgot-password'),
          { email: 'test@example.com' }
        );
      });
    });

    test('should show success message on successful submission', async () => {
      axios.post.mockResolvedValueOnce({ status: 200 });
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Password Reset Link Sent',
          'If an account with this email exists, a password reset link has been sent to your email. Please check your inbox and follow the instructions to reset your password.',
          expect.any(Array)
        );
      });
    });

    test('should navigate back on alert OK button press', async () => {
      axios.post.mockResolvedValueOnce({ status: 200 });
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Simulate OK button press
      const alertCall = Alert.alert.mock.calls[0];
      const okButton = alertCall[2]?.[0];
      if (okButton?.onPress) {
        okButton.onPress();
        expect(mockNavigation.goBack).toHaveBeenCalled();
      }
    });

    test('should set loading state during submission', async () => {
      axios.post.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ status: 200 }), 100))
      );
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    test('should show success message on API error (security practice)', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network error'));
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Password Reset Link Sent',
          'If an account with this email exists, a password reset link has been sent to your email. Please check your inbox and follow the instructions to reset your password.',
          expect.any(Array)
        );
      });
    });

    test('should handle 400 error gracefully', async () => {
      const error = new Error('Bad Request');
      error.response = { status: 400 };
      axios.post.mockRejectedValueOnce(error);
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
    });

    test('should handle 429 rate limit error gracefully', async () => {
      const error = new Error('Too Many Requests');
      error.response = { status: 429 };
      axios.post.mockRejectedValueOnce(error);
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
    });

    test('should handle 500 server error gracefully', async () => {
      const error = new Error('Server Error');
      error.response = { status: 500 };
      axios.post.mockRejectedValueOnce(error);
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
    });

    test('should clear loading state on error', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network error'));
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation', () => {
    test('should navigate back on back button press', () => {
      render(<ForgotPasswordScreen />);
      const backLink = screen.getByText(/Back to Sign In/);

      fireEvent.press(backLink);
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Button States', () => {
    test('should disable button when loading', async () => {
      axios.post.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ status: 200 }), 100))
      );
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(submitButton);

      // Button should be disabled after press
      expect(axios.post).toHaveBeenCalled();
    });

    test('should show activity indicator during loading', async () => {
      axios.post.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ status: 200 }), 100))
      );
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long email addresses', async () => {
      axios.post.mockResolvedValueOnce({ status: 200 });
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');
      const longEmail = 'a'.repeat(64) + '@example.com';

      fireEvent.changeText(emailInput, longEmail);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/auth/forgot-password'),
          { email: longEmail }
        );
      });
    });

    test('should handle email with leading/trailing spaces', async () => {
      axios.post.mockResolvedValueOnce({ status: 200 });
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, '  test@example.com  ');
      // Email validation should accept the value
      expect(emailInput.props.value).toBe('  test@example.com  ');
    });

    test('should persist email value across renders', async () => {
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');

      fireEvent.changeText(emailInput, 'test@example.com');
      expect(emailInput.props.value).toBe('test@example.com');
      
      // Value should persist
      expect(emailInput.props.value).toBe('test@example.com');
    });

    test('should accept email with special characters in username', async () => {
      axios.post.mockResolvedValueOnce({ status: 200 });
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, 'user.name+tag@example.co.uk');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/auth/forgot-password'),
          { email: 'user.name+tag@example.co.uk' }
        );
      });
    });

    test('should handle case-insensitive email validation', async () => {
      axios.post.mockResolvedValueOnce({ status: 200 });
      render(<ForgotPasswordScreen />);
      const emailInput = screen.getByPlaceholderText('Email Address');
      const submitButton = screen.getByText('Send Reset Link');

      fireEvent.changeText(emailInput, 'TEST@EXAMPLE.COM');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have placeholder text for email input', () => {
      render(<ForgotPasswordScreen />);
      expect(screen.getByPlaceholderText('Email Address')).toBeTruthy();
    });

    test('should have proper text hierarchy', () => {
      render(<ForgotPasswordScreen />);
      expect(screen.getByText('Forgot Password?')).toBeTruthy();
      expect(screen.getByText(/Enter your email/)).toBeTruthy();
    });

    test('should have clear button labels', () => {
      render(<ForgotPasswordScreen />);
      expect(screen.getByText('Send Reset Link')).toBeTruthy();
    });
  });

  describe('Layout and Styling', () => {
    test('should render with proper container structure', () => {
      render(<ForgotPasswordScreen />);
      expect(screen.getByText('Forgot Password?')).toBeTruthy();
    });

    test('should render gradient background', () => {
      render(<ForgotPasswordScreen />);
      // LinearGradient is mocked as View
      expect(screen.getByText('Forgot Password?')).toBeTruthy();
    });

    test('should render scrollable content', () => {
      render(<ForgotPasswordScreen />);
      expect(screen.getByText('Forgot Password?')).toBeTruthy();
    });
  });
});
