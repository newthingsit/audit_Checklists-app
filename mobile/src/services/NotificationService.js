import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Storage keys
const NOTIFICATION_TOKEN_KEY = '@notification_token';
const NOTIFICATION_PREFS_KEY = '@notification_preferences';

// Default notification preferences
const DEFAULT_PREFERENCES = {
  enabled: true,
  scheduledAuditReminders: true,
  overdueActionAlerts: true,
  auditCompletionNotices: true,
  reminderTime: 24, // hours before scheduled audit
  quietHoursStart: 22, // 10 PM
  quietHoursEnd: 7, // 7 AM
};

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationServiceClass {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.onNotificationReceived = null;
    this.onNotificationResponse = null;
  }

  // ==================== INITIALIZATION ====================

  async initialize() {
    try {
      // Get push token
      const token = await this.registerForPushNotifications();
      
      if (token) {
        this.expoPushToken = token;
        await this.savePushToken(token);
        
        // Register token with backend
        await this.registerTokenWithServer(token);
      }

      // Set up notification listeners
      this.setupListeners();

      return { success: true, token };
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return { success: false, error: error.message };
    }
  }

  async registerForPushNotifications() {
    let token;

    if (Platform.OS === 'android') {
      // Set up Android notification channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0d9488',
      });

      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Audit Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#f97316',
      });

      await Notifications.setNotificationChannelAsync('alerts', {
        name: 'Important Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#ef4444',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return null;
      }

      token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // Replace with your Expo project ID
      })).data;
    } else {
      console.log('Push notifications require a physical device');
    }

    return token;
  }

  setupListeners() {
    // Handle notification received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      notification => {
        if (this.onNotificationReceived) {
          this.onNotificationReceived(notification);
        }
      }
    );

    // Handle user tapping on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      response => {
        if (this.onNotificationResponse) {
          this.onNotificationResponse(response);
        }
      }
    );
  }

  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  // ==================== TOKEN MANAGEMENT ====================

  async savePushToken(token) {
    try {
      await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  async getPushToken() {
    try {
      return await AsyncStorage.getItem(NOTIFICATION_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  async registerTokenWithServer(token) {
    try {
      await axios.post(`${API_BASE_URL}/notifications/register`, {
        push_token: token,
        platform: Platform.OS,
        device_name: Device.deviceName || 'Unknown Device',
      });
      return true;
    } catch (error) {
      console.error('Error registering token with server:', error);
      return false;
    }
  }

  // ==================== PREFERENCES ====================

  async getPreferences() {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
      return DEFAULT_PREFERENCES;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  async savePreferences(preferences) {
    try {
      const merged = { ...DEFAULT_PREFERENCES, ...preferences };
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(merged));
      return true;
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      return false;
    }
  }

  async updatePreference(key, value) {
    const current = await this.getPreferences();
    current[key] = value;
    return await this.savePreferences(current);
  }

  // ==================== LOCAL NOTIFICATIONS ====================

  async scheduleLocalNotification(options) {
    const {
      title,
      body,
      data = {},
      trigger,
      channelId = 'default',
    } = options;

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          ...(Platform.OS === 'android' && { channelId }),
        },
        trigger,
      });
      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async scheduleAuditReminder(audit, hoursBeforeAudit = 24) {
    const prefs = await this.getPreferences();
    if (!prefs.enabled || !prefs.scheduledAuditReminders) {
      return null;
    }

    const scheduledDate = new Date(audit.scheduled_date);
    const reminderDate = new Date(scheduledDate.getTime() - hoursBeforeAudit * 60 * 60 * 1000);

    // Don't schedule if reminder time has passed
    if (reminderDate <= new Date()) {
      return null;
    }

    // Check quiet hours
    const reminderHour = reminderDate.getHours();
    if (reminderHour >= prefs.quietHoursStart || reminderHour < prefs.quietHoursEnd) {
      // Adjust to end of quiet hours
      reminderDate.setHours(prefs.quietHoursEnd, 0, 0, 0);
    }

    return await this.scheduleLocalNotification({
      title: '📋 Upcoming Audit Reminder',
      body: `Audit at ${audit.location_name || audit.restaurant_name} is scheduled for ${scheduledDate.toLocaleDateString()}`,
      data: {
        type: 'audit_reminder',
        auditId: audit.id,
        scheduledDate: audit.scheduled_date,
      },
      trigger: reminderDate,
      channelId: 'reminders',
    });
  }

  async scheduleOverdueAlert(actionItem) {
    const prefs = await this.getPreferences();
    if (!prefs.enabled || !prefs.overdueActionAlerts) {
      return null;
    }

    const dueDate = new Date(actionItem.due_date);
    const alertDate = new Date(dueDate.getTime() + 24 * 60 * 60 * 1000); // 1 day after due

    if (alertDate <= new Date()) {
      // Send immediately if already overdue
      return await this.sendImmediateNotification({
        title: '⚠️ Overdue Action Item',
        body: `"${actionItem.title}" was due on ${dueDate.toLocaleDateString()}`,
        data: {
          type: 'overdue_action',
          actionId: actionItem.id,
        },
        channelId: 'alerts',
      });
    }

    return await this.scheduleLocalNotification({
      title: '⚠️ Action Item Overdue',
      body: `"${actionItem.title}" is now overdue`,
      data: {
        type: 'overdue_action',
        actionId: actionItem.id,
      },
      trigger: alertDate,
      channelId: 'alerts',
    });
  }

  async sendImmediateNotification(options) {
    return await this.scheduleLocalNotification({
      ...options,
      trigger: null, // Immediate
    });
  }

  async sendAuditCompletionNotice(audit) {
    const prefs = await this.getPreferences();
    if (!prefs.enabled || !prefs.auditCompletionNotices) {
      return null;
    }

    return await this.sendImmediateNotification({
      title: '✅ Audit Completed',
      body: `Audit at ${audit.restaurant_name} completed with score: ${audit.score}%`,
      data: {
        type: 'audit_completed',
        auditId: audit.id,
        score: audit.score,
      },
    });
  }

  // ==================== NOTIFICATION MANAGEMENT ====================

  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      return true;
    } catch (error) {
      console.error('Error canceling notification:', error);
      return false;
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return true;
    } catch (error) {
      console.error('Error canceling all notifications:', error);
      return false;
    }
  }

  async getScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
      return true;
    } catch (error) {
      console.error('Error setting badge count:', error);
      return false;
    }
  }

  async clearBadge() {
    return await this.setBadgeCount(0);
  }

  // ==================== EVENT HANDLERS ====================

  setNotificationReceivedHandler(handler) {
    this.onNotificationReceived = handler;
  }

  setNotificationResponseHandler(handler) {
    this.onNotificationResponse = handler;
  }
}

export const NotificationService = new NotificationServiceClass();
export default NotificationService;
