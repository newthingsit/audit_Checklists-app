import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationContext';
import { themeConfig } from '../config/theme';

const NotificationSettingsScreen = () => {
  const { 
    preferences, 
    updatePreferences, 
    scheduledNotifications,
    refreshScheduledNotifications,
    cancelAllNotifications,
  } = useNotifications();

  const [localPrefs, setLocalPrefs] = useState(preferences || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
    }
    refreshScheduledNotifications();
  }, [preferences]);

  const handleToggle = async (key, value) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
    setSaving(true);
    try {
      await updatePreferences({ [key]: value });
    } catch (error) {
      console.error('Error updating preference:', error);
      // Revert on error
      setLocalPrefs(prev => ({ ...prev, [key]: !value }));
    } finally {
      setSaving(false);
    }
  };

  const handleReminderTimeChange = async (hours) => {
    setLocalPrefs(prev => ({ ...prev, reminderTime: hours }));
    await updatePreferences({ reminderTime: hours });
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'This will cancel all scheduled notifications. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            await cancelAllNotifications();
            Alert.alert('Success', 'All notifications cleared');
          }
        },
      ]
    );
  };

  const renderToggleItem = (key, title, subtitle, icon) => (
    <View style={styles.settingItem}>
      <View style={[styles.settingIcon, { backgroundColor: themeConfig.primary.main + '15' }]}>
        <Icon name={icon} size={22} color={themeConfig.primary.main} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={localPrefs[key] || false}
        onValueChange={(value) => handleToggle(key, value)}
        trackColor={{ 
          false: themeConfig.border.default, 
          true: themeConfig.primary.light 
        }}
        thumbColor={localPrefs[key] ? themeConfig.primary.main : '#f4f4f4'}
        disabled={saving || (!localPrefs.enabled && key !== 'enabled')}
      />
    </View>
  );

  const reminderOptions = [
    { label: '1 hour', value: 1 },
    { label: '6 hours', value: 6 },
    { label: '12 hours', value: 12 },
    { label: '24 hours', value: 24 },
    { label: '48 hours', value: 48 },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Master Toggle */}
      <View style={styles.section}>
        <View style={styles.masterToggle}>
          <View style={styles.masterToggleContent}>
            <View style={[styles.masterIcon, { 
              backgroundColor: localPrefs.enabled 
                ? themeConfig.success.bg 
                : themeConfig.error.bg 
            }]}>
              <Icon 
                name={localPrefs.enabled ? 'notifications-active' : 'notifications-off'} 
                size={28} 
                color={localPrefs.enabled ? themeConfig.success.main : themeConfig.error.main} 
              />
            </View>
            <View style={styles.masterToggleText}>
              <Text style={styles.masterToggleTitle}>
                Push Notifications
              </Text>
              <Text style={styles.masterToggleSubtitle}>
                {localPrefs.enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
          <Switch
            value={localPrefs.enabled || false}
            onValueChange={(value) => handleToggle('enabled', value)}
            trackColor={{ 
              false: themeConfig.border.default, 
              true: themeConfig.primary.light 
            }}
            thumbColor={localPrefs.enabled ? themeConfig.primary.main : '#f4f4f4'}
          />
        </View>
      </View>

      {/* Notification Types */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Types</Text>
        
        {renderToggleItem(
          'scheduledAuditReminders',
          'Audit Reminders',
          'Get notified before scheduled audits',
          'event'
        )}
        
        {renderToggleItem(
          'overdueActionAlerts',
          'Overdue Alerts',
          'Alerts for overdue action items',
          'warning'
        )}
        
        {renderToggleItem(
          'auditCompletionNotices',
          'Completion Notices',
          'Confirmation when audits are completed',
          'check-circle'
        )}
      </View>

      {/* Reminder Timing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reminder Timing</Text>
        <Text style={styles.sectionSubtitle}>
          How long before a scheduled audit should you be reminded?
        </Text>
        
        <View style={styles.reminderOptions}>
          {reminderOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.reminderOption,
                localPrefs.reminderTime === option.value && styles.reminderOptionActive
              ]}
              onPress={() => handleReminderTimeChange(option.value)}
              activeOpacity={0.7}
              disabled={!localPrefs.enabled}
            >
              <Text style={[
                styles.reminderOptionText,
                localPrefs.reminderTime === option.value && styles.reminderOptionTextActive
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quiet Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiet Hours</Text>
        <Text style={styles.sectionSubtitle}>
          Notifications won't disturb you during these hours
        </Text>
        
        <View style={styles.quietHoursDisplay}>
          <View style={styles.quietTimeBox}>
            <Text style={styles.quietTimeLabel}>From</Text>
            <Text style={styles.quietTimeValue}>
              {localPrefs.quietHoursStart || 22}:00
            </Text>
          </View>
          <Icon name="arrow-forward" size={20} color={themeConfig.text.disabled} />
          <View style={styles.quietTimeBox}>
            <Text style={styles.quietTimeLabel}>Until</Text>
            <Text style={styles.quietTimeValue}>
              {localPrefs.quietHoursEnd || 7}:00
            </Text>
          </View>
        </View>
      </View>

      {/* Scheduled Notifications */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Scheduled Notifications</Text>
            <Text style={styles.sectionSubtitle}>
              {scheduledNotifications.length} pending notification{scheduledNotifications.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {scheduledNotifications.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={handleClearAll}
              activeOpacity={0.7}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {scheduledNotifications.length === 0 ? (
          <View style={styles.emptyScheduled}>
            <Icon name="notifications-none" size={32} color={themeConfig.text.disabled} />
            <Text style={styles.emptyScheduledText}>
              No scheduled notifications
            </Text>
          </View>
        ) : (
          scheduledNotifications.slice(0, 5).map((notification, index) => (
            <View key={notification.identifier || index} style={styles.scheduledItem}>
              <Icon name="schedule" size={18} color={themeConfig.text.secondary} />
              <View style={styles.scheduledContent}>
                <Text style={styles.scheduledTitle} numberOfLines={1}>
                  {notification.content?.title || 'Notification'}
                </Text>
                <Text style={styles.scheduledTime}>
                  {notification.trigger?.date 
                    ? new Date(notification.trigger.date).toLocaleString()
                    : 'Scheduled'
                  }
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeConfig.background.default,
  },
  section: {
    backgroundColor: themeConfig.background.paper,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: themeConfig.borderRadius.large,
    padding: 16,
    ...themeConfig.shadows.small,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: themeConfig.text.secondary,
    marginBottom: 16,
  },
  
  // Master Toggle
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  masterToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  masterIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  masterToggleText: {
    flex: 1,
  },
  masterToggleTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: themeConfig.text.primary,
  },
  masterToggleSubtitle: {
    fontSize: 13,
    color: themeConfig.text.secondary,
    marginTop: 2,
  },
  
  // Setting Items
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeConfig.border.light,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: themeConfig.text.primary,
  },
  settingSubtitle: {
    fontSize: 12,
    color: themeConfig.text.secondary,
    marginTop: 2,
  },
  
  // Reminder Options
  reminderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: themeConfig.borderRadius.round,
    backgroundColor: themeConfig.background.default,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
  },
  reminderOptionActive: {
    backgroundColor: themeConfig.primary.main,
    borderColor: themeConfig.primary.main,
  },
  reminderOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: themeConfig.text.primary,
  },
  reminderOptionTextActive: {
    color: '#fff',
  },
  
  // Quiet Hours
  quietHoursDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  quietTimeBox: {
    alignItems: 'center',
    backgroundColor: themeConfig.background.default,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: themeConfig.borderRadius.medium,
  },
  quietTimeLabel: {
    fontSize: 11,
    color: themeConfig.text.secondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  quietTimeValue: {
    fontSize: 20,
    fontWeight: '600',
    color: themeConfig.text.primary,
  },
  
  // Scheduled Notifications
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    fontSize: 13,
    color: themeConfig.error.main,
    fontWeight: '600',
  },
  emptyScheduled: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyScheduledText: {
    fontSize: 14,
    color: themeConfig.text.secondary,
    marginTop: 8,
  },
  scheduledItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: themeConfig.border.light,
  },
  scheduledContent: {
    flex: 1,
    marginLeft: 10,
  },
  scheduledTitle: {
    fontSize: 14,
    color: themeConfig.text.primary,
  },
  scheduledTime: {
    fontSize: 12,
    color: themeConfig.text.secondary,
    marginTop: 2,
  },
  
  bottomSpacing: {
    height: 40,
  },
});

export default NotificationSettingsScreen;

