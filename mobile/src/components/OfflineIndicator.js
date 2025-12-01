import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useNetwork } from '../context/NetworkContext';
import { useOffline } from '../context/OfflineContext';
import { themeConfig } from '../config/theme';

const { width } = Dimensions.get('window');

// Offline Banner - Shows at top when offline
export const OfflineBanner = ({ onPress }) => {
  const { isOnline } = useNetwork();
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOnline ? -60 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [isOnline, slideAnim]);

  if (isOnline) return null;

  return (
    <Animated.View 
      style={[
        styles.offlineBanner,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <TouchableOpacity 
        style={styles.offlineBannerContent}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Icon name="cloud-off" size={18} color="#fff" />
        <Text style={styles.offlineBannerText}>
          You're offline. Changes will sync when connected.
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Sync Status Badge - Shows pending sync count
export const SyncStatusBadge = ({ onPress }) => {
  const { offlineStats, isSyncing } = useOffline();
  const { isOnline } = useNetwork();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isSyncing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSyncing, pulseAnim]);

  if (!offlineStats.hasPendingSync && !isSyncing) return null;

  const totalPending = 
    offlineStats.pendingAuditsCount + 
    offlineStats.pendingPhotosCount + 
    offlineStats.syncQueueCount;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View 
        style={[
          styles.syncBadge,
          isSyncing && styles.syncBadgeSyncing,
          { transform: [{ scale: pulseAnim }] }
        ]}
      >
        <Icon 
          name={isSyncing ? "sync" : (isOnline ? "cloud-upload" : "cloud-queue")} 
          size={16} 
          color="#fff" 
        />
        {!isSyncing && totalPending > 0 && (
          <Text style={styles.syncBadgeText}>{totalPending}</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Sync Progress Indicator
export const SyncProgressIndicator = () => {
  const { syncProgress, isSyncing } = useOffline();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isSyncing ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isSyncing, fadeAnim]);

  if (!isSyncing || !syncProgress) return null;

  return (
    <Animated.View style={[styles.syncProgress, { opacity: fadeAnim }]}>
      <View style={styles.syncProgressContent}>
        <Icon name="sync" size={20} color={themeConfig.primary.main} />
        <Text style={styles.syncProgressText}>
          {syncProgress.message || 'Syncing...'}
        </Text>
      </View>
    </Animated.View>
  );
};

// Connection Status Dot - Small indicator
export const ConnectionStatusDot = ({ size = 10 }) => {
  const { isOnline, connectionType } = useNetwork();
  
  const getColor = () => {
    if (!isOnline) return themeConfig.error.main;
    if (connectionType === 'wifi') return themeConfig.success.main;
    return themeConfig.warning.main;
  };

  return (
    <View 
      style={[
        styles.statusDot, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          backgroundColor: getColor() 
        }
      ]} 
    />
  );
};

// Offline Mode Card - For displaying offline data notice
export const OfflineModeCard = ({ lastSync }) => {
  const { isOnline } = useNetwork();
  
  if (isOnline) return null;

  const formatLastSync = () => {
    if (!lastSync) return 'Never';
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.offlineModeCard}>
      <View style={styles.offlineModeHeader}>
        <Icon name="cloud-off" size={20} color={themeConfig.warning.dark} />
        <Text style={styles.offlineModeTitle}>Offline Mode</Text>
      </View>
      <Text style={styles.offlineModeText}>
        Showing cached data. Last synced: {formatLastSync()}
      </Text>
    </View>
  );
};

// Pending Sync Summary
export const PendingSyncSummary = ({ onSyncPress }) => {
  const { offlineStats, isSyncing, triggerSync } = useOffline();
  const { isOnline } = useNetwork();

  if (!offlineStats.hasPendingSync) return null;

  return (
    <View style={styles.pendingSyncCard}>
      <View style={styles.pendingSyncHeader}>
        <Icon name="cloud-queue" size={24} color={themeConfig.primary.main} />
        <View style={styles.pendingSyncInfo}>
          <Text style={styles.pendingSyncTitle}>Pending Sync</Text>
          <Text style={styles.pendingSyncSubtitle}>
            {offlineStats.pendingAuditsCount} audits, {offlineStats.pendingPhotosCount} photos
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[
          styles.syncButton,
          (!isOnline || isSyncing) && styles.syncButtonDisabled
        ]}
        onPress={onSyncPress || triggerSync}
        disabled={!isOnline || isSyncing}
        activeOpacity={0.7}
      >
        <Icon 
          name={isSyncing ? "sync" : "cloud-upload"} 
          size={18} 
          color="#fff" 
        />
        <Text style={styles.syncButtonText}>
          {isSyncing ? 'Syncing...' : (isOnline ? 'Sync Now' : 'Offline')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // Offline Banner
  offlineBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: themeConfig.warning.dark,
    zIndex: 1000,
  },
  offlineBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },

  // Sync Badge
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeConfig.warning.main,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  syncBadgeSyncing: {
    backgroundColor: themeConfig.primary.main,
  },
  syncBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },

  // Sync Progress
  syncProgress: {
    backgroundColor: themeConfig.background.paper,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: themeConfig.borderRadius.medium,
    ...themeConfig.shadows.small,
  },
  syncProgressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncProgressText: {
    color: themeConfig.text.secondary,
    fontSize: 14,
    marginLeft: 10,
  },

  // Status Dot
  statusDot: {
    marginRight: 8,
  },

  // Offline Mode Card
  offlineModeCard: {
    backgroundColor: themeConfig.warning.bg,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: themeConfig.borderRadius.medium,
    borderWidth: 1,
    borderColor: themeConfig.warning.light,
  },
  offlineModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  offlineModeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: themeConfig.warning.dark,
    marginLeft: 8,
  },
  offlineModeText: {
    fontSize: 12,
    color: themeConfig.text.secondary,
    marginLeft: 28,
  },

  // Pending Sync Card
  pendingSyncCard: {
    backgroundColor: themeConfig.background.paper,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: themeConfig.borderRadius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...themeConfig.shadows.small,
  },
  pendingSyncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pendingSyncInfo: {
    marginLeft: 12,
  },
  pendingSyncTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: themeConfig.text.primary,
  },
  pendingSyncSubtitle: {
    fontSize: 12,
    color: themeConfig.text.secondary,
    marginTop: 2,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeConfig.primary.main,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: themeConfig.borderRadius.medium,
  },
  syncButtonDisabled: {
    backgroundColor: themeConfig.text.disabled,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default {
  OfflineBanner,
  SyncStatusBadge,
  SyncProgressIndicator,
  ConnectionStatusDot,
  OfflineModeCard,
  PendingSyncSummary,
};

