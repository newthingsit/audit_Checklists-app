import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { useNetwork } from './NetworkContext';
import offlineStorage from '../services/OfflineStorage';
import syncManager from '../services/SyncManager';

const OfflineContext = createContext();

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  const { isOnline } = useNetwork();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [offlineStats, setOfflineStats] = useState({
    pendingAuditsCount: 0,
    pendingPhotosCount: 0,
    syncQueueCount: 0,
    lastSync: null,
    hasPendingSync: false,
  });
  const [lastSyncResult, setLastSyncResult] = useState(null);

  // Load offline stats on mount and when sync completes
  const loadOfflineStats = useCallback(async () => {
    const stats = await offlineStorage.getOfflineStats();
    setOfflineStats(stats);
  }, []);

  // Subscribe to sync manager events
  useEffect(() => {
    const unsubscribe = syncManager.addSyncListener((event, data) => {
      switch (event) {
        case 'sync_started':
          setIsSyncing(true);
          setSyncProgress({ status: 'starting', message: 'Starting sync...' });
          break;
        case 'syncing_audit':
          setSyncProgress({ status: 'syncing', message: 'Syncing audits...' });
          break;
        case 'syncing_photo':
          setSyncProgress({ status: 'syncing', message: 'Uploading photos...' });
          break;
        case 'audit_synced':
          loadOfflineStats();
          break;
        case 'photo_synced':
          loadOfflineStats();
          break;
        case 'sync_completed':
          setIsSyncing(false);
          setSyncProgress(null);
          setLastSyncResult(data);
          loadOfflineStats();
          break;
        case 'sync_error':
          setIsSyncing(false);
          setSyncProgress({ status: 'error', message: data.error });
          break;
        case 'prefetch_started':
          setSyncProgress({ status: 'prefetch', message: 'Downloading data for offline use...' });
          break;
        case 'prefetch_completed':
          setSyncProgress(null);
          break;
        case 'cache_refreshed':
          loadOfflineStats();
          break;
        default:
          break;
      }
    });

    return () => unsubscribe();
  }, [loadOfflineStats]);

  // Load stats on mount
  useEffect(() => {
    loadOfflineStats();
  }, [loadOfflineStats]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && offlineStats.hasPendingSync && !isSyncing) {
      // Delay sync slightly to ensure connection is stable
      const timer = setTimeout(() => {
        triggerSync();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, offlineStats.hasPendingSync, isSyncing]);

  // Listen for app state changes to sync when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && isOnline && offlineStats.hasPendingSync && !isSyncing) {
        triggerSync();
      }
    });

    return () => subscription?.remove();
  }, [isOnline, offlineStats.hasPendingSync, isSyncing]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!isOnline) {
      return { success: false, reason: 'offline' };
    }
    if (isSyncing) {
      return { success: false, reason: 'already_syncing' };
    }
    return await syncManager.syncAll();
  }, [isOnline, isSyncing]);

  // Prefetch data for offline use
  const prefetchForOffline = useCallback(async () => {
    if (!isOnline) {
      return { success: false, reason: 'offline' };
    }
    return await syncManager.prefetchDataForOffline();
  }, [isOnline]);

  // Save audit offline
  const saveAuditOffline = useCallback(async (audit) => {
    const result = await offlineStorage.savePendingAudit(audit);
    await loadOfflineStats();
    return result;
  }, [loadOfflineStats]);

  // Queue photo for upload
  const queuePhotoForUpload = useCallback(async (photo) => {
    const result = await offlineStorage.queuePhoto(photo);
    await loadOfflineStats();
    return result;
  }, [loadOfflineStats]);

  // Get cached templates
  const getCachedTemplates = useCallback(async () => {
    return await offlineStorage.getTemplates();
  }, []);

  // Get cached locations
  const getCachedLocations = useCallback(async () => {
    return await offlineStorage.getLocations();
  }, []);

  // Get pending audits
  const getPendingAudits = useCallback(async () => {
    return await offlineStorage.getPendingAudits();
  }, []);

  // Get cached audit by ID
  const getCachedAudit = useCallback(async (id) => {
    return await offlineStorage.getCachedAuditById(id);
  }, []);

  // Clear all offline data
  const clearOfflineData = useCallback(async () => {
    const result = await offlineStorage.clearAllOfflineData();
    await loadOfflineStats();
    return result;
  }, [loadOfflineStats]);

  const value = {
    // Status
    isSyncing,
    syncProgress,
    offlineStats,
    lastSyncResult,
    
    // Actions
    triggerSync,
    prefetchForOffline,
    saveAuditOffline,
    queuePhotoForUpload,
    loadOfflineStats,
    clearOfflineData,
    
    // Data access
    getCachedTemplates,
    getCachedLocations,
    getPendingAudits,
    getCachedAudit,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export default OfflineContext;

