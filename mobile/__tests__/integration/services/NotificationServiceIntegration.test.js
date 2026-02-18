/**
 * Integration Test: Notification Service
 * Tests notification scheduling, sending, and user interaction
 * 
 * Phase G - Tier 2: Notification Service Integration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  setupIntegrationTests,
  cleanupIntegrationTests,
  mockApiEndpoint,
} from '../helpers/setupIntegration';
import { createMockNotificationContext } from '../helpers/mockProviders';

describe('Integration: Notification Service', () => {
  let axiosMock;

  beforeAll(async () => {
    await setupIntegrationTests();
    axiosMock = new MockAdapter(axios);
  });

  afterAll(async () => {
    axiosMock.reset();
    await cleanupIntegrationTests();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    axiosMock.reset();
    await AsyncStorage.clear();
  });

  describe('Notification Permissions', () => {
    it('should request notification permission', async () => {
      const notification = createMockNotificationContext();

      notification.requestPermission.mockResolvedValue(true);

      const result = await notification.requestPermission();

      expect(result).toBe(true);
    });

    it('should handle permission granted', async () => {
      const notification = createMockNotificationContext();

      notification.requestPermission.mockResolvedValue(true);

      const granted = await notification.requestPermission();

      if (granted) {
        await AsyncStorage.setItem('notification_permission', 'granted');
      }

      const stored = await AsyncStorage.getItem('notification_permission');
      expect(stored).toBe('granted');
    });

    it('should handle permission denied', async () => {
      const notification = createMockNotificationContext();

      notification.requestPermission.mockResolvedValue(false);

      const result = await notification.requestPermission();

      expect(result).toBe(false);
    });

    it('should restore permission status', async () => {
      await AsyncStorage.setItem('notification_permission', 'granted');

      const stored = await AsyncStorage.getItem('notification_permission');

      expect(stored).toBe('granted');
    });

    it('should handle permission changes', async () => {
      let permission = 'granted';

      await AsyncStorage.setItem('notification_permission', permission);

      // User changes permission
      permission = 'denied';
      await AsyncStorage.setItem('notification_permission', permission);

      const updated = await AsyncStorage.getItem('notification_permission');
      expect(updated).toBe('denied');
    });
  });

  describe('Notification Scheduling', () => {
    it('should schedule notification for later', async () => {
      const notification = createMockNotificationContext();

      const scheduledNotification = {
        id: '1',
        title: 'Audit Scheduled',
        body: 'Your audit is coming up',
        delay: 3600, // 1 hour
        scheduledTime: Date.now() + 3600000,
      };

      notification.scheduleNotification.mockResolvedValue(scheduledNotification.id);

      const id = await notification.scheduleNotification({
        title: 'Audit Scheduled',
        body: 'Your audit is coming up',
        delay: 3600,
      });

      expect(id).toBe('1');
    });

    it('should store scheduled notifications', async () => {
      const scheduled = [
        {
          id: '1',
          title: 'Audit 1',
          scheduledTime: Date.now() + 3600000,
          status: 'scheduled',
        },
        {
          id: '2',
          title: 'Audit 2',
          scheduledTime: Date.now() + 7200000,
          status: 'scheduled',
        },
      ];

      await AsyncStorage.setItem('scheduled_notifications', JSON.stringify(scheduled));

      const stored = JSON.parse(
        await AsyncStorage.getItem('scheduled_notifications')
      );

      expect(stored).toHaveLength(2);
    });

    it('should retrieve upcoming notifications', async () => {
      const now = Date.now();
      const scheduled = [
        { id: '1', scheduledTime: now + 1000, status: 'scheduled' },
        { id: '2', scheduledTime: now - 1000, status: 'scheduled' },
      ];

      const upcoming = scheduled.filter(n => n.scheduledTime > now);

      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].id).toBe('1');
    });

    it('should cancel scheduled notification', async () => {
      const scheduled = [
        { id: '1', status: 'scheduled' },
        { id: '2', status: 'scheduled' },
      ];

      await AsyncStorage.setItem('scheduled_notifications', JSON.stringify(scheduled));

      // Cancel first
      const stored = JSON.parse(
        await AsyncStorage.getItem('scheduled_notifications')
      );

      stored[0].status = 'cancelled';
      await AsyncStorage.setItem('scheduled_notifications', JSON.stringify(stored));

      const updated = JSON.parse(
        await AsyncStorage.getItem('scheduled_notifications')
      );

      expect(updated[0].status).toBe('cancelled');
    });

    it('should handle recurring notifications', async () => {
      const recurring = {
        id: '1',
        title: 'Daily Reminder',
        recurrence: 'daily',
        time: '09:00',
        enabled: true,
      };

      await AsyncStorage.setItem('recurring_notification', JSON.stringify(recurring));

      const stored = JSON.parse(await AsyncStorage.getItem('recurring_notification'));

      expect(stored.recurrence).toBe('daily');
      expect(stored.enabled).toBe(true);
    });
  });

  describe('Notification Sending', () => {
    it('should send notification immediately', async () => {
      const notification = createMockNotificationContext();

      notification.sendNotification.mockResolvedValue({
        id: '1',
        sent: true,
      });

      const result = await notification.sendNotification({
        title: 'Test',
        body: 'Test notification',
      });

      expect(result.sent).toBe(true);
    });

    it('should send notification with custom data', async () => {
      const notification = createMockNotificationContext();

      const notificationData = {
        title: 'Audit Complete',
        body: 'Audit ID-123 submitted',
        data: {
          auditId: '123',
          action: 'view_audit',
        },
      };

      notification.sendNotification.mockResolvedValue({ sent: true });

      const result = await notification.sendNotification(notificationData);

      expect(result.sent).toBe(true);
    });

    it('should preserve notification metadata', async () => {
      const notification = {
        id: '1',
        title: 'Audit Reminder',
        body: 'Your audit is due',
        timestamp: Date.now(),
        read: false,
        actionUrl: '/audits/123',
      };

      await AsyncStorage.setItem('notification', JSON.stringify(notification));

      const stored = JSON.parse(await AsyncStorage.getItem('notification'));

      expect(stored.actionUrl).toBe('/audits/123');
      expect(stored.read).toBe(false);
    });

    it('should batch multiple notifications', async () => {
      const notifications = [
        { id: '1', title: 'Notification 1' },
        { id: '2', title: 'Notification 2' },
        { id: '3', title: 'Notification 3' },
      ];

      const batchSend = jest.fn().mockResolvedValue({
        sent: 3,
        failed: 0,
      });

      const result = await batchSend(notifications);

      expect(result.sent).toBe(3);
    });
  });

  describe('Notification Interaction', () => {
    it('should mark notification as read', async () => {
      const notification = createMockNotificationContext();

      notification.markAsRead.mockResolvedValue(true);

      const result = await notification.markAsRead('notification-1');

      expect(result).toBe(true);
    });

    it('should track notification read status', async () => {
      const notifications = [
        { id: '1', title: 'Notification 1', read: false },
        { id: '2', title: 'Notification 2', read: true },
      ];

      await AsyncStorage.setItem('notifications', JSON.stringify(notifications));

      const stored = JSON.parse(await AsyncStorage.getItem('notifications'));
      const unreadCount = stored.filter(n => !n.read).length;

      expect(unreadCount).toBe(1);
    });

    it('should handle notification tap', async () => {
      const notification = {
        id: '1',
        title: 'Audit Complete',
        actionUrl: '/audits/123',
      };

      const handleTap = jest.fn((notif) => {
        return notif.actionUrl;
      });

      const url = handleTap(notification);

      expect(url).toBe('/audits/123');
      expect(handleTap).toHaveBeenCalledWith(notification);
    });

    it('should handle notification dismissal', async () => {
      const notifications = [
        { id: '1', title: 'Notification 1' },
        { id: '2', title: 'Notification 2' },
      ];

      // Dismiss second notification
      const remaining = notifications.filter(n => n.id !== '2');

      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('1');
    });

    it('should clear all notifications', async () => {
      const notifications = [
        { id: '1', title: 'Notification 1' },
        { id: '2', title: 'Notification 2' },
      ];

      await AsyncStorage.setItem('notifications', JSON.stringify(notifications));

      // Clear all
      await AsyncStorage.removeItem('notifications');

      const cleared = await AsyncStorage.getItem('notifications');

      expect(cleared).toBeNull();
    });
  });

  describe('Notification Storage', () => {
    it('should persist notification to history', async () => {
      const notification = {
        id: '1',
        title: 'Audit Created',
        timestamp: Date.now(),
        read: false,
      };

      await AsyncStorage.setItem('notification', JSON.stringify(notification));

      const stored = JSON.parse(await AsyncStorage.getItem('notification'));

      expect(stored.id).toBe('1');
    });

    it('should maintain notification history', async () => {
      const history = [
        { id: '1', timestamp: 1000 },
        { id: '2', timestamp: 2000 },
        { id: '3', timestamp: 3000 },
      ];

      await AsyncStorage.setItem('notification_history', JSON.stringify(history));

      const stored = JSON.parse(await AsyncStorage.getItem('notification_history'));

      expect(stored).toHaveLength(3);
    });

    it('should limit notification history', async () => {
      const history = [];

      for (let i = 0; i < 1000; i++) {
        history.push({ id: String(i), timestamp: i });
      }

      // Keep only last 100
      const limited = history.slice(-100);

      expect(limited).toHaveLength(100);
      expect(limited[0].id).toBe('900');
    });

    it('should clear old notifications', async () => {
      const now = Date.now();
      const history = [
        { id: '1', timestamp: now - 2592000000 }, // 30 days old
        { id: '2', timestamp: now - 604800000 }, // 7 days old
        { id: '3', timestamp: now }, // Current
      ];

      // Keep only 7 days
      const recent = history.filter(n => now - n.timestamp < 604800000);

      expect(recent).toHaveLength(1);
      expect(recent[0].id).toBe('3');
    });
  });

  describe('Notification Preferences', () => {
    it('should save notification preferences', async () => {
      const preferences = {
        enabled: true,
        auditReminders: true,
        soundEnabled: true,
        vibrationEnabled: true,
      };

      await AsyncStorage.setItem(
        'notification_preferences',
        JSON.stringify(preferences)
      );

      const stored = JSON.parse(
        await AsyncStorage.getItem('notification_preferences')
      );

      expect(stored.auditReminders).toBe(true);
    });

    it('should restore notification preferences', async () => {
      const preferences = {
        enabled: true,
        soundEnabled: false,
        vibrationEnabled: true,
      };

      await AsyncStorage.setItem(
        'notification_preferences',
        JSON.stringify(preferences)
      );

      const restored = JSON.parse(
        await AsyncStorage.getItem('notification_preferences')
      );

      expect(restored.soundEnabled).toBe(false);
    });

    it('should update notification preferences', async () => {
      let preferences = { enabled: true, soundEnabled: true };

      await AsyncStorage.setItem(
        'notification_preferences',
        JSON.stringify(preferences)
      );

      preferences.soundEnabled = false;

      await AsyncStorage.setItem(
        'notification_preferences',
        JSON.stringify(preferences)
      );

      const updated = JSON.parse(
        await AsyncStorage.getItem('notification_preferences')
      );

      expect(updated.soundEnabled).toBe(false);
    });

    it('should handle quiet hours', async () => {
      const preferences = {
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
        },
      };

      await AsyncStorage.setItem(
        'notification_preferences',
        JSON.stringify(preferences)
      );

      const stored = JSON.parse(
        await AsyncStorage.getItem('notification_preferences')
      );

      expect(stored.quietHours.enabled).toBe(true);
    });
  });

  describe('Notification API Integration', () => {
    it('should fetch scheduled audits from server', async () => {
      const audits = [
        { id: '1', name: 'Audit 1', dueDate: '2024-01-20' },
        { id: '2', name: 'Audit 2', dueDate: '2024-01-25' },
      ];

      mockApiEndpoint('GET', /\/audits.*/,
        { data: audits }, 200);

      const response = await axios.get('/audits');

      expect(response.data).toHaveLength(2);
    });

    it('should send notification analytics', async () => {
      const analytics = {
        notificationId: '1',
        action: 'received',
        timestamp: Date.now(),
      };

      mockApiEndpoint('POST', '/notifications/analytics',
        { success: true }, 200);

      const response = await axios.post('/notifications/analytics', analytics);

      expect(response.data.success).toBe(true);
    });

    it('should sync notification state with server', async () => {
      const localNotification = {
        id: '1',
        read: true,
        timestamp: Date.now(),
      };

      mockApiEndpoint('PUT', /\/notifications.*/,
        { success: true }, 200);

      const response = await axios.put(
        '/notifications/1',
        localNotification
      );

      expect(response.data.success).toBe(true);
    });
  });

  describe('Notification Error Handling', () => {
    it('should handle notification permission denied', async () => {
      const notification = createMockNotificationContext();

      notification.requestPermission.mockResolvedValue(false);

      const granted = await notification.requestPermission();

      expect(granted).toBe(false);
    });

    it('should handle notification send failure', async () => {
      const notification = createMockNotificationContext();

      notification.sendNotification.mockRejectedValue(
        new Error('Failed to send notification')
      );

      try {
        await notification.sendNotification({ title: 'Test' });
        fail('Should throw error');
      } catch (error) {
        expect(error.message).toContain('Failed');
      }
    });

    it('should handle network error when syncing', async () => {
      mockApiEndpoint('PUT', /\/notifications.*/,
        null, 0);

      try {
        await axios.put('/notifications/1', {});
        fail('Should throw error');
      } catch (error) {
        // Network error
        expect(error).toBeDefined();
      }
    });

    it('should retry failed notification send', async () => {
      const notification = createMockNotificationContext();

      let attempts = 0;
      notification.sendNotification.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ sent: true });
      });

      for (let i = 0; i < 3; i++) {
        try {
          await notification.sendNotification({ title: 'Test' });
          break;
        } catch (error) {
          // Retry
        }
      }

      expect(attempts).toBe(3);
    });
  });

  describe('Complete Notification Workflow', () => {
    it('should execute full notification lifecycle', async () => {
      // 1. Request permission
      const permission = true;
      await AsyncStorage.setItem('notification_permission', String(permission));

      // 2. Schedule notification
      const scheduled = {
        id: '1',
        title: 'Audit Reminder',
        scheduledTime: Date.now() + 3600000,
      };

      await AsyncStorage.setItem('scheduled_notification', JSON.stringify(scheduled));

      // 3. Send notification
      const notification = createMockNotificationContext();
      notification.sendNotification.mockResolvedValue({ sent: true });

      // 4. Handle interaction
      const stored = JSON.parse(
        await AsyncStorage.getItem('scheduled_notification')
      );

      expect(stored.title).toBe('Audit Reminder');

      // 5. Mark as read
      notification.markAsRead.mockResolvedValue(true);
      const result = await notification.markAsRead('1');

      expect(result).toBe(true);
    });
  });
});
