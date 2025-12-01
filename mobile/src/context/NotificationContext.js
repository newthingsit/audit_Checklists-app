import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import NotificationService from '../services/NotificationService';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [pushToken, setPushToken] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [lastNotification, setLastNotification] = useState(null);
  const [scheduledNotifications, setScheduledNotifications] = useState([]);

  // Initialize notification service
  useEffect(() => {
    const init = async () => {
      const result = await NotificationService.initialize();
      if (result.success) {
        setPushToken(result.token);
      }
      
      const prefs = await NotificationService.getPreferences();
      setPreferences(prefs);
      
      setIsInitialized(true);
    };

    init();

    return () => {
      NotificationService.cleanup();
    };
  }, []);

  // Set up notification handlers
  useEffect(() => {
    if (!isInitialized) return;

    NotificationService.setNotificationReceivedHandler((notification) => {
      setLastNotification({
        type: 'received',
        notification,
        timestamp: new Date(),
      });
    });

    NotificationService.setNotificationResponseHandler((response) => {
      setLastNotification({
        type: 'response',
        response,
        timestamp: new Date(),
      });
      
      // Handle navigation based on notification data
      handleNotificationNavigation(response.notification.request.content.data);
    });
  }, [isInitialized]);

  // Handle navigation based on notification type
  const handleNotificationNavigation = useCallback((data) => {
    if (!data) return;

    // Navigation will be handled by the component that uses this context
    // This is just for setting the last notification data
  }, []);

  // Update preferences
  const updatePreferences = useCallback(async (newPrefs) => {
    const success = await NotificationService.savePreferences(newPrefs);
    if (success) {
      setPreferences({ ...preferences, ...newPrefs });
    }
    return success;
  }, [preferences]);

  // Toggle notification enabled state
  const toggleNotifications = useCallback(async (enabled) => {
    return await updatePreferences({ enabled });
  }, [updatePreferences]);

  // Schedule audit reminder
  const scheduleAuditReminder = useCallback(async (audit, hoursBeforeAudit) => {
    const notificationId = await NotificationService.scheduleAuditReminder(
      audit,
      hoursBeforeAudit || preferences?.reminderTime || 24
    );
    
    if (notificationId) {
      await refreshScheduledNotifications();
    }
    
    return notificationId;
  }, [preferences]);

  // Schedule overdue alert
  const scheduleOverdueAlert = useCallback(async (actionItem) => {
    const notificationId = await NotificationService.scheduleOverdueAlert(actionItem);
    
    if (notificationId) {
      await refreshScheduledNotifications();
    }
    
    return notificationId;
  }, []);

  // Send audit completion notice
  const sendAuditCompletionNotice = useCallback(async (audit) => {
    return await NotificationService.sendAuditCompletionNotice(audit);
  }, []);

  // Cancel notification
  const cancelNotification = useCallback(async (notificationId) => {
    const success = await NotificationService.cancelNotification(notificationId);
    if (success) {
      await refreshScheduledNotifications();
    }
    return success;
  }, []);

  // Cancel all notifications
  const cancelAllNotifications = useCallback(async () => {
    const success = await NotificationService.cancelAllNotifications();
    if (success) {
      setScheduledNotifications([]);
    }
    return success;
  }, []);

  // Refresh scheduled notifications list
  const refreshScheduledNotifications = useCallback(async () => {
    const notifications = await NotificationService.getScheduledNotifications();
    setScheduledNotifications(notifications);
    return notifications;
  }, []);

  // Set badge count
  const setBadgeCount = useCallback(async (count) => {
    return await NotificationService.setBadgeCount(count);
  }, []);

  // Clear badge
  const clearBadge = useCallback(async () => {
    return await NotificationService.clearBadge();
  }, []);

  // Send immediate notification
  const sendNotification = useCallback(async (title, body, data = {}) => {
    return await NotificationService.sendImmediateNotification({
      title,
      body,
      data,
    });
  }, []);

  const value = {
    // State
    isInitialized,
    pushToken,
    preferences,
    lastNotification,
    scheduledNotifications,
    
    // Actions
    updatePreferences,
    toggleNotifications,
    scheduleAuditReminder,
    scheduleOverdueAlert,
    sendAuditCompletionNotice,
    sendNotification,
    cancelNotification,
    cancelAllNotifications,
    refreshScheduledNotifications,
    setBadgeCount,
    clearBadge,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
