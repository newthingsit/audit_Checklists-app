/**
 * OfflineStorage Integration Tests
 * Tests offline data persistence and sync queue management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import offlineStorage from '../../src/services/OfflineStorage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('OfflineStorage Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.setItem.mockResolvedValue(undefined);
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  describe('Templates Storage', () => {
    it('should save templates to offline storage', async () => {
      const templates = [{ id: 1, name: 'Template 1' }];

      const result = await offlineStorage.saveTemplates(templates);

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should retrieve saved templates', async () => {
      const templates = [{ id: 1, name: 'Template 1' }];
      const storedData = {
        templates,
        cachedAt: new Date().toISOString(),
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedData));

      const result = await offlineStorage.getTemplates();

      expect(result.templates).toEqual(templates);
      expect(result.cachedAt).toBeDefined();
    });

    it('should return empty templates when none saved', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await offlineStorage.getTemplates();

      expect(result.templates).toEqual([]);
      expect(result.isStale).toBe(true);
    });

    it('should handle storage errors gracefully', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await offlineStorage.getTemplates();

      expect(result.templates).toEqual([]);
      expect(result.isStale).toBe(true);
    });
  });

  describe('Locations Storage', () => {
    it('should save locations to offline storage', async () => {
      const locations = [{ id: 1, name: 'Location 1', lat: 0, lng: 0 }];

      const result = await offlineStorage.saveLocations(locations);

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should retrieve saved locations', async () => {
      const locations = [{ id: 1, name: 'Location 1' }];
      const storedData = {
        locations,
        cachedAt: new Date().toISOString(),
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedData));

      const result = await offlineStorage.getLocations();

      expect(result.locations).toEqual(locations);
      expect(result.cachedAt).toBeDefined();
    });

    it('should return empty locations when none saved', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await offlineStorage.getLocations();

      expect(result.locations).toEqual([]);
      expect(result.isStale).toBe(true);
    });
  });

  describe('Cached Audits', () => {
    it('should cache a new audit', async () => {
      const audit = { id: 1, title: 'Audit 1', items: [] };

      const result = await offlineStorage.cacheAudit(audit);

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should retrieve cached audits', async () => {
      const audits = [{ id: 1, title: 'Audit 1', cachedAt: new Date().toISOString() }];
      const storedData = {
        audits,
        updatedAt: new Date().toISOString(),
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedData));

      const result = await offlineStorage.getCachedAudits();

      expect(result.audits).toEqual(audits);
      expect(result.updatedAt).toBeDefined();
    });

    it('should get cached audit by ID', async () => {
      const audits = [
        { id: 1, title: 'Audit 1' },
        { id: 2, title: 'Audit 2' },
      ];
      const storedData = {
        audits,
        updatedAt: new Date().toISOString(),
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedData));

      const result = await offlineStorage.getCachedAuditById(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('should return null for non-existent cached audit', async () => {
      const storedData = {
        audits: [],
        updatedAt: new Date().toISOString(),
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedData));

      const result = await offlineStorage.getCachedAuditById(999);

      expect(result).toBeNull();
    });
  });

  describe('Pending Audits', () => {
    it('should save a pending audit with temp ID', async () => {
      const audit = { title: 'New Audit', items: [] };

      const result = await offlineStorage.savePendingAudit(audit);

      expect(result.success).toBe(true);
      expect(result.tempId).toBeDefined();
    });

    it('should retrieve pending audits', async () => {
      const audits = [
        {
          tempId: 'offline_123',
          title: 'Pending Audit',
          isOffline: true,
          syncStatus: 'pending',
        },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(audits));

      const result = await offlineStorage.getPendingAudits();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should update a pending audit', async () => {
      const audits = [
        { tempId: 'offline_123', title: 'Audit', syncStatus: 'pending' },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(audits));

      const result = await offlineStorage.updatePendingAudit('offline_123', {
        syncStatus: 'synced',
      });

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should remove a pending audit', async () => {
      const audits = [
        { tempId: 'offline_123', title: 'Audit' },
        { tempId: 'offline_456', title: 'Audit 2' },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(audits));

      const result = await offlineStorage.removePendingAudit('offline_123');

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Pending Photos', () => {
    it('should queue a photo for upload', async () => {
      const photo = { uri: 'file:///photo.jpg', auditId: 1 };

      const result = await offlineStorage.queuePhoto(photo);

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should retrieve pending photos', async () => {
      const photos = [
        {
          uri: 'file:///photo.jpg',
          queuedAt: new Date().toISOString(),
          syncStatus: 'pending',
        },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(photos));

      const result = await offlineStorage.getPendingPhotos();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should remove a pending photo', async () => {
      const photos = [
        { uri: 'file:///photo1.jpg', syncStatus: 'pending' },
        { uri: 'file:///photo2.jpg', syncStatus: 'pending' },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(photos));

      const result = await offlineStorage.removePendingPhoto('file:///photo1.jpg');

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Sync Queue', () => {
    it('should add operation to sync queue', async () => {
      const operation = { type: 'create_audit', data: { title: 'Audit' } };

      const result = await offlineStorage.addToSyncQueue(operation);

      expect(result).toBeDefined();
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should retrieve sync queue', async () => {
      const queue = [
        {
          id: 'sync_123',
          type: 'create_audit',
          status: 'pending',
          attempts: 0,
        },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));

      const result = await offlineStorage.getSyncQueue();

      expect(Array.isArray(result)).toBe(true);
    });

    it('should update sync queue item', async () => {
      const queue = [
        {
          id: 'sync_123',
          type: 'create_audit',
          status: 'pending',
          attempts: 0,
        },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));

      const result = await offlineStorage.updateSyncQueueItem('sync_123', {
        status: 'syncing',
        attempts: 1,
      });

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should remove sync queue item', async () => {
      const queue = [
        { id: 'sync_123', type: 'create_audit' },
        { id: 'sync_456', type: 'update_audit' },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));

      const result = await offlineStorage.removeSyncQueueItem('sync_123');

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should clear entire sync queue', async () => {
      const result = await offlineStorage.clearSyncQueue();

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Last Sync', () => {
    it('should set last sync timestamp', async () => {
      const result = await offlineStorage.setLastSync();

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should set last sync with custom timestamp', async () => {
      const timestamp = '2026-02-18T10:00:00Z';

      const result = await offlineStorage.setLastSync(timestamp);

      expect(result).toBe(true);
    });

    it('should retrieve last sync timestamp', async () => {
      const timestamp = '2026-02-18T10:00:00Z';

      AsyncStorage.getItem.mockResolvedValue(timestamp);

      const result = await offlineStorage.getLastSync();

      expect(result).toBe(timestamp);
    });

    it('should return null when last sync not set', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await offlineStorage.getLastSync();

      expect(result).toBeNull();
    });
  });

  describe('User Data', () => {
    it('should save user data offline', async () => {
      const user = { id: 1, name: 'John', email: 'john@example.com' };

      const result = await offlineStorage.saveUserData(user);

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should retrieve saved user data', async () => {
      const user = { id: 1, name: 'John', email: 'john@example.com' };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(user));

      const result = await offlineStorage.getUserData();

      expect(result).toEqual(user);
    });

    it('should return null when no user data stored', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await offlineStorage.getUserData();

      expect(result).toBeNull();
    });
  });

  describe('Utilities', () => {
    it('should detect fresh data within max age', () => {
      const now = new Date();
      const cachedAt = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago

      const isStale = offlineStorage.isDataStale(cachedAt.toISOString(), 24);

      expect(isStale).toBe(false);
    });

    it('should detect stale data beyond max age', () => {
      const now = new Date();
      const cachedAt = new Date(now.getTime() - 30 * 60 * 60 * 1000); // 30 hours ago

      const isStale = offlineStorage.isDataStale(cachedAt.toISOString(), 24);

      expect(isStale).toBe(true);
    });

    it('should consider null cachedAt as stale', () => {
      const isStale = offlineStorage.isDataStale(null, 24);

      expect(isStale).toBe(true);
    });

    it('should get offline stats', async () => {
      const pendingAudits = [{ tempId: 'offline_1' }];
      const pendingPhotos = [{ uri: 'file:///photo.jpg' }];
      const syncQueue = [{ id: 'sync_1' }];
      const lastSync = '2026-02-18T10:00:00Z';

      AsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(pendingAudits))
        .mockResolvedValueOnce(JSON.stringify(pendingPhotos))
        .mockResolvedValueOnce(JSON.stringify(syncQueue))
        .mockResolvedValueOnce(lastSync);

      const result = await offlineStorage.getOfflineStats();

      expect(result.pendingAuditsCount).toBe(1);
      expect(result.pendingPhotosCount).toBe(1);
      expect(result.syncQueueCount).toBe(1);
      expect(result.hasPendingSync).toBe(true);
    });

    it('should return zero stats when storage empty', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await offlineStorage.getOfflineStats();

      expect(result.pendingAuditsCount).toBe(0);
      expect(result.pendingPhotosCount).toBe(0);
      expect(result.syncQueueCount).toBe(0);
      expect(result.hasPendingSync).toBe(false);
    });
  });

  describe('Clearing Data', () => {
    it('should clear all offline data', async () => {
      const result = await offlineStorage.clearAllOfflineData();

      expect(result).toBe(true);
      expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(8);
    });

    it('should handle errors when clearing data', async () => {
      AsyncStorage.removeItem.mockRejectedValue(new Error('Clear error'));

      const result = await offlineStorage.clearAllOfflineData();

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle AsyncStorage errors in saveTemplates', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const result = await offlineStorage.saveTemplates([]);

      expect(result).toBe(false);
    });

    it('should handle JSON parse errors gracefully', async () => {
      AsyncStorage.getItem.mockResolvedValue('invalid json');

      const result = await offlineStorage.getTemplates();

      // Service handles parse errors and returns default
      expect(result.templates).toEqual([]);
      expect(result.isStale).toBe(true);
    });

    it('should recover from sync queue errors', async () => {
      AsyncStorage.getSyncQueue = jest.fn().mockRejectedValue(new Error('Queue error'));
      AsyncStorage.getItem.mockRejectedValue(new Error('Queue error'));

      const result = await offlineStorage.getSyncQueue();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});
