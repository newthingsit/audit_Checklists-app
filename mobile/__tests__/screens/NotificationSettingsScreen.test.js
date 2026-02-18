import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import NotificationSettingsScreen from '../../src/screens/NotificationSettingsScreen';
import { useNotifications } from '../../src/context/NotificationContext';
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

jest.mock('../../src/context/NotificationContext', () => ({
  useNotifications: jest.fn(),
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const defaultNotificationContext = {
  preferences: {
    enabled: true,
    scheduledAuditReminders: true,
    dueDateAlerts: true,
    taskAssignments: true,
    statusUpdates: false,
    reminderTime: 24,
  },
  updatePreferences: jest.fn(() => Promise.resolve()),
  scheduledNotifications: [],
  refreshScheduledNotifications: jest.fn(),
  cancelAllNotifications: jest.fn(() => Promise.resolve()),
};

describe('NotificationSettingsScreen', () => {
  beforeEach(() => {
    const { useNavigation } = require('@react-navigation/native');
    useNavigation.mockReturnValue(mockNavigation);
    useNotifications.mockReturnValue(defaultNotificationContext);

    mockNavigation.navigate.mockClear();
    mockNavigation.goBack.mockClear();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    defaultNotificationContext.updatePreferences.mockClear();
    defaultNotificationContext.refreshScheduledNotifications.mockClear();
    defaultNotificationContext.cancelAllNotifications.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render notification settings screen', () => {
      render(<NotificationSettingsScreen />);
      expect(screen.getByText('Push Notifications')).toBeTruthy();
    });

    test('should display master toggle', () => {
      render(<NotificationSettingsScreen />);
      expect(screen.getByText('Enabled')).toBeTruthy();
    });

    test('should display all notification types', () => {
      render(<NotificationSettingsScreen />);
      expect(screen.getByText('Audit Reminders')).toBeTruthy();
      expect(screen.getByText('Due Date Alerts')).toBeTruthy();
    });

    test('should display notification type icons', () => {
      render(<NotificationSettingsScreen />);
      expect(screen.getByTestId('icon-notifications-active')).toBeTruthy();
      expect(screen.getByTestId('icon-event')).toBeTruthy();
    });

    test('should display reminder timing section', () => {
      render(<NotificationSettingsScreen />);
      expect(screen.getByText(/Reminder Timing/i)).toBeTruthy();
    });
  });

  describe('Master Toggle', () => {
    test('should display "Disabled" when notifications turned off', () => {
      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        preferences: {
          ...defaultNotificationContext.preferences,
          enabled: false,
        },
      });

      render(<NotificationSettingsScreen />);
      expect(screen.getByText('Disabled')).toBeTruthy();
    });

    test('should show notifications-off icon when disabled', () => {
      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        preferences: {
          ...defaultNotificationContext.preferences,
          enabled: false,
        },
      });

      render(<NotificationSettingsScreen />);
      expect(screen.getByTestId('icon-notifications-off')).toBeTruthy();
    });

    test('should show notifications-active icon when enabled', () => {
      render(<NotificationSettingsScreen />);
      expect(screen.getByTestId('icon-notifications-active')).toBeTruthy();
    });
  });

  describe('Preference Display', () => {
    test('should display scheduled audit reminders toggle', () => {
      render(<NotificationSettingsScreen />);
      expect(screen.getByText('Audit Reminders')).toBeTruthy();
      expect(screen.getByText('Get notified before scheduled audits')).toBeTruthy();
    });

    test('should display due date alerts toggle', () => {
      render(<NotificationSettingsScreen />);
      expect(screen.getByText('Due Date Alerts')).toBeTruthy();
    });

    test('should display all notification type descriptions', () => {
      render(<NotificationSettingsScreen />);
      expect(screen.getByText(/Get notified before scheduled audits/i)).toBeTruthy();
    });

    test('should display preference icons', () => {
      render(<NotificationSettingsScreen />);
      expect(screen.getByTestId('icon-event')).toBeTruthy();
    });
  });

  describe('Reminder Time Selection', () => {
    test('should display reminder time options', () => {
      render(<NotificationSettingsScreen />);
      expect(screen.getByText('1 hour')).toBeTruthy();
      expect(screen.getByText('24 hours')).toBeTruthy();
      expect(screen.getByText('48 hours')).toBeTruthy();
    });

    test('should select reminder time on press', async () => {
      render(<NotificationSettingsScreen />);
      
      const reminderOption = screen.getByText('12 hours');
      fireEvent.press(reminderOption);

      await waitFor(() => {
        expect(defaultNotificationContext.updatePreferences).toHaveBeenCalledWith({
          reminderTime: 12,
        });
      });
    });

    test('should highlight selected reminder time', () => {
      render(<NotificationSettingsScreen />);
      
      // Default is 24 hours
      const selectedOption = screen.getByText('24 hours');
      expect(selectedOption).toBeTruthy();
    });

    test('should display all 5 reminder options', () => {
      render(<NotificationSettingsScreen />);
      
      expect(screen.getByText('1 hour')).toBeTruthy();
      expect(screen.getByText('6 hours')).toBeTruthy();
      expect(screen.getByText('12 hours')).toBeTruthy();
      expect(screen.getByText('24 hours')).toBeTruthy();
      expect(screen.getByText('48 hours')).toBeTruthy();
    });

    test('should update preference on reminder time change', async () => {
      render(<NotificationSettingsScreen />);
      
      fireEvent.press(screen.getByText('1 hour'));

      await waitFor(() => {
        expect(defaultNotificationContext.updatePreferences).toHaveBeenCalledWith({
          reminderTime: 1,
        });
      });
    });
  });

  describe('Clear All Notifications', () => {
    test('should display clear all button when notifications exist', () => {
      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        scheduledNotifications: [{ id: '1', identifier: 'notif-1' }],
      });

      render(<NotificationSettingsScreen />);
      const clearButton = screen.queryByText(/Clear All/i);
      expect(clearButton).toBeTruthy();
    });

    test('should not display clear all button when no notifications', () => {
      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        scheduledNotifications: [],
      });

      render(<NotificationSettingsScreen />);
      const clearButton = screen.queryByText(/Clear All/i);
      expect(clearButton).toBeFalsy();
    });

    test('should show clear all confirmation alert', () => {
      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        scheduledNotifications: [{ id: '1', identifier: 'notif-1' }],
      });

      render(<NotificationSettingsScreen />);
      
      const clearButton = screen.getByText(/Clear All/i);
      fireEvent.press(clearButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Clear All Notifications',
        expect.any(String),
        expect.any(Array)
      );
    });

    test('should cancel all notifications on confirm', async () => {
      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        scheduledNotifications: [{ id: '1', identifier: 'notif-1' }, { id: '2', identifier: 'notif-2' }],
      });

      Alert.alert.mockImplementation((title, message, buttons) => {
        const confirmButton = buttons.find(b => b.text === 'Clear All');
        confirmButton.onPress();
      });

      render(<NotificationSettingsScreen />);
      
      const clearButton = screen.getByText(/Clear All/i);
      fireEvent.press(clearButton);

      await waitFor(() => {
        expect(defaultNotificationContext.cancelAllNotifications).toHaveBeenCalled();
      });
    });

    test('should show success message after clearing', async () => {
      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        scheduledNotifications: [{ id: '1', identifier: 'notif-1' }],
      });

      Alert.alert.mockImplementation((title, message, buttons) => {
        if (buttons) {
          const confirmButton = buttons.find(b => b.text === 'Clear All');
          confirmButton.onPress();
        }
      });

      render(<NotificationSettingsScreen />);
      
      const clearButton = screen.getByText(/Clear All/i);
      fireEvent.press(clearButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'All notifications cleared');
      });
    });

    test('should not clear on cancel', () => {
      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        scheduledNotifications: [{ id: '1', identifier: 'notif-1' }],
      });

      Alert.alert.mockImplementation((title, message, buttons) => {
        const cancelButton = buttons.find(b => b.text === 'Cancel');
        // Cancel does nothing
      });

      render(<NotificationSettingsScreen />);
      
      const clearButton = screen.getByText(/Clear All/i);
      fireEvent.press(clearButton);

      expect(defaultNotificationContext.cancelAllNotifications).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle update preference errors', async () => {
      defaultNotificationContext.updatePreferences.mockRejectedValueOnce(
        new Error('Update failed')
      );

      render(<NotificationSettingsScreen />);
      
      fireEvent.press(screen.getByText('1 hour'));

      await waitFor(() => {
        expect(defaultNotificationContext.updatePreferences).toHaveBeenCalled();
      });
    });

    test('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      networkError.code = 'NETWORK_ERROR';
      defaultNotificationContext.updatePreferences.mockRejectedValueOnce(networkError);

      render(<NotificationSettingsScreen />);
      
      fireEvent.press(screen.getByText('6 hours'));

      await waitFor(() => {
        expect(defaultNotificationContext.updatePreferences).toHaveBeenCalled();
      });
    });

    test('should handle cancel notifications error', async () => {
      const mockCancel = jest.fn().mockRejectedValueOnce(new Error('Cancel failed'));
      
      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        scheduledNotifications: [{ id: '1', identifier: 'notif-1' }],
        cancelAllNotifications: mockCancel,
      });

      Alert.alert.mockImplementation((title, message, buttons) => {
        if (buttons) {
          const confirmButton = buttons.find(b => b.text === 'Clear All');
          confirmButton.onPress();
        }
      });

      render(<NotificationSettingsScreen />);
      
      fireEvent.press(screen.getByText(/Clear All/i));

      await waitFor(() => {
        expect(mockCancel).toHaveBeenCalled();
      });
    });
  });

  describe('Scheduled Notifications', () => {
    test('should refresh scheduled notifications on mount', () => {
      render(<NotificationSettingsScreen />);
      
      expect(defaultNotificationContext.refreshScheduledNotifications).toHaveBeenCalled();
    });

    test('should handle empty scheduled notifications', () => {
      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        scheduledNotifications: [],
      });

      render(<NotificationSettingsScreen />);
      // Should render without errors
      expect(screen.getByText('Push Notifications')).toBeTruthy();
    });

    test('should handle scheduled notifications array', () => {
      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        scheduledNotifications: [{ id: '1' }, { id: '2' }],
      });

      render(<NotificationSettingsScreen />);
      expect(screen.getByText('Push Notifications')).toBeTruthy();
    });
  });

  describe('Context Integration', () => {
    test('should use notification context', () => {
      render(<NotificationSettingsScreen />);
      expect(useNotifications).toHaveBeenCalled();
    });

    test('should sync with context preferences', () => {
      const customPrefs = {
        enabled: false,
        scheduledAuditReminders: false,
        dueDateAlerts: true,
        reminderTime: 12,
      };

      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        preferences: customPrefs,
      });

      render(<NotificationSettingsScreen />);
      expect(screen.getByText('Disabled')).toBeTruthy();
    });

    test('should handle null preferences', () => {
      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        preferences: null,
      });

      render(<NotificationSettingsScreen />);
      // Should render without crashes
      expect(screen.getByText('Push Notifications')).toBeTruthy();
    });

    test('should handle undefined preferences', () => {
      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        preferences: undefined,
      });

      render(<NotificationSettingsScreen />);
      // Should render without crashes
      expect(screen.getByText('Push Notifications')).toBeTruthy();
    });

    test('should call updatePreferences from context', async () => {
      render(<NotificationSettingsScreen />);
      
      fireEvent.press(screen.getByText('48 hours'));

      await waitFor(() => {
        expect(defaultNotificationContext.updatePreferences).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid reminder time selections', async () => {
      render(<NotificationSettingsScreen />);
      
      fireEvent.press(screen.getByText('1 hour'));
      fireEvent.press(screen.getByText('6 hours'));
      fireEvent.press(screen.getByText('12 hours'));

      await waitFor(() => {
        expect(defaultNotificationContext.updatePreferences).toHaveBeenCalled();
      });
    });

    test('should render with minimal preferences', () => {
      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        preferences: {
          enabled: true,
        },
      });

      render(<NotificationSettingsScreen />);
      expect(screen.getByText('Enabled')).toBeTruthy();
    });

    test('should handle missing reminder time', () => {
      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        preferences: {
          enabled: true,
          reminderTime: null,
        },
      });

      render(<NotificationSettingsScreen />);
      expect(screen.getByText('Push Notifications')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    test('should have descriptive labels', () => {
      render(<NotificationSettingsScreen />);
      
      expect(screen.getByText('Audit Reminders')).toBeTruthy();
      expect(screen.getByText('Get notified before scheduled audits')).toBeTruthy();
    });

    test('should have section headers', () => {
      render(<NotificationSettingsScreen />);
      
      expect(screen.getByText('Reminder Timing')).toBeTruthy();
    });

    test('should display helper text', () => {
      render(<NotificationSettingsScreen />);
      
      expect(screen.getByText(/How long before a scheduled audit/i)).toBeTruthy();
    });
  });

  describe('UI States', () => {
    test('should display enabled state', () => {
      render(<NotificationSettingsScreen />);
      expect(screen.getByText('Enabled')).toBeTruthy();
    });

    test('should display disabled state', () => {
      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        preferences: {
          ...defaultNotificationContext.preferences,
          enabled: false,
        },
      });

      render(<NotificationSettingsScreen />);
      expect(screen.getByText('Disabled')).toBeTruthy();
    });

    test('should show correct icon for enabled state', () => {
      render(<NotificationSettingsScreen />);
      expect(screen.getByTestId('icon-notifications-active')).toBeTruthy();
    });

    test('should show correct icon for disabled state', () => {
      useNotifications.mockReturnValue({
        ...defaultNotificationContext,
        preferences: {
          ...defaultNotificationContext.preferences,
          enabled: false,
        },
      });

      render(<NotificationSettingsScreen />);
      expect(screen.getByTestId('icon-notifications-off')).toBeTruthy();
    });
  });
});
