import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const KEYS = {
  TEMPLATES: '@offline_templates',
  LOCATIONS: '@offline_locations',
  CACHED_AUDITS: '@offline_cached_audits',
  PENDING_AUDITS: '@offline_pending_audits',
  PENDING_PHOTOS: '@offline_pending_photos',
  SYNC_QUEUE: '@offline_sync_queue',
  LAST_SYNC: '@offline_last_sync',
  USER_DATA: '@offline_user_data',
};

class OfflineStorageService {
  // ==================== TEMPLATES ====================
  
  async saveTemplates(templates) {
    try {
      const data = {
        templates,
        cachedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving templates offline:', error);
      return false;
    }
  }

  async getTemplates() {
    try {
      const data = await AsyncStorage.getItem(KEYS.TEMPLATES);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          templates: parsed.templates || [],
          cachedAt: parsed.cachedAt,
          isStale: this.isDataStale(parsed.cachedAt, 24), // 24 hours
        };
      }
      return { templates: [], cachedAt: null, isStale: true };
    } catch (error) {
      console.error('Error getting offline templates:', error);
      return { templates: [], cachedAt: null, isStale: true };
    }
  }

  // ==================== LOCATIONS ====================
  
  async saveLocations(locations) {
    try {
      const data = {
        locations,
        cachedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(KEYS.LOCATIONS, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving locations offline:', error);
      return false;
    }
  }

  async getLocations() {
    try {
      const data = await AsyncStorage.getItem(KEYS.LOCATIONS);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          locations: parsed.locations || [],
          cachedAt: parsed.cachedAt,
          isStale: this.isDataStale(parsed.cachedAt, 24), // 24 hours
        };
      }
      return { locations: [], cachedAt: null, isStale: true };
    } catch (error) {
      console.error('Error getting offline locations:', error);
      return { locations: [], cachedAt: null, isStale: true };
    }
  }

  // ==================== AUDITS (CACHED FOR VIEWING) ====================
  
  async cacheAudit(audit) {
    try {
      const existing = await this.getCachedAudits();
      const audits = existing.audits.filter(a => a.id !== audit.id);
      audits.unshift({ ...audit, cachedAt: new Date().toISOString() });
      
      // Keep only last 50 audits cached
      const trimmed = audits.slice(0, 50);
      
      await AsyncStorage.setItem(KEYS.CACHED_AUDITS, JSON.stringify({
        audits: trimmed,
        updatedAt: new Date().toISOString(),
      }));
      return true;
    } catch (error) {
      console.error('Error caching audit:', error);
      return false;
    }
  }

  async getCachedAudits() {
    try {
      const data = await AsyncStorage.getItem(KEYS.CACHED_AUDITS);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          audits: parsed.audits || [],
          updatedAt: parsed.updatedAt,
        };
      }
      return { audits: [], updatedAt: null };
    } catch (error) {
      console.error('Error getting cached audits:', error);
      return { audits: [], updatedAt: null };
    }
  }

  async getCachedAuditById(id) {
    try {
      const { audits } = await this.getCachedAudits();
      return audits.find(a => a.id === id) || null;
    } catch (error) {
      console.error('Error getting cached audit by id:', error);
      return null;
    }
  }

  // ==================== PENDING AUDITS (CREATED OFFLINE) ====================
  
  async savePendingAudit(audit) {
    try {
      const pending = await this.getPendingAudits();
      const tempId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const offlineAudit = {
        ...audit,
        tempId,
        isOffline: true,
        createdOfflineAt: new Date().toISOString(),
        syncStatus: 'pending', // pending, syncing, synced, failed
      };
      
      pending.push(offlineAudit);
      await AsyncStorage.setItem(KEYS.PENDING_AUDITS, JSON.stringify(pending));
      
      return { success: true, tempId };
    } catch (error) {
      console.error('Error saving pending audit:', error);
      return { success: false, error };
    }
  }

  async getPendingAudits() {
    try {
      const data = await AsyncStorage.getItem(KEYS.PENDING_AUDITS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting pending audits:', error);
      return [];
    }
  }

  async updatePendingAudit(tempId, updates) {
    try {
      const pending = await this.getPendingAudits();
      const index = pending.findIndex(a => a.tempId === tempId);
      if (index !== -1) {
        pending[index] = { ...pending[index], ...updates };
        await AsyncStorage.setItem(KEYS.PENDING_AUDITS, JSON.stringify(pending));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating pending audit:', error);
      return false;
    }
  }

  async removePendingAudit(tempId) {
    try {
      const pending = await this.getPendingAudits();
      const filtered = pending.filter(a => a.tempId !== tempId);
      await AsyncStorage.setItem(KEYS.PENDING_AUDITS, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error removing pending audit:', error);
      return false;
    }
  }

  // ==================== PENDING PHOTOS ====================
  
  async queuePhoto(photo) {
    try {
      const pending = await this.getPendingPhotos();
      const photoItem = {
        ...photo,
        queuedAt: new Date().toISOString(),
        syncStatus: 'pending',
      };
      pending.push(photoItem);
      await AsyncStorage.setItem(KEYS.PENDING_PHOTOS, JSON.stringify(pending));
      return true;
    } catch (error) {
      console.error('Error queuing photo:', error);
      return false;
    }
  }

  async getPendingPhotos() {
    try {
      const data = await AsyncStorage.getItem(KEYS.PENDING_PHOTOS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting pending photos:', error);
      return [];
    }
  }

  async removePendingPhoto(uri) {
    try {
      const pending = await this.getPendingPhotos();
      const filtered = pending.filter(p => p.uri !== uri);
      await AsyncStorage.setItem(KEYS.PENDING_PHOTOS, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error removing pending photo:', error);
      return false;
    }
  }

  // ==================== SYNC QUEUE ====================
  
  async addToSyncQueue(operation) {
    try {
      const queue = await this.getSyncQueue();
      const queueItem = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...operation,
        queuedAt: new Date().toISOString(),
        attempts: 0,
        status: 'pending',
      };
      queue.push(queueItem);
      await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
      return queueItem.id;
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      return null;
    }
  }

  async getSyncQueue() {
    try {
      const data = await AsyncStorage.getItem(KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  async updateSyncQueueItem(id, updates) {
    try {
      const queue = await this.getSyncQueue();
      const index = queue.findIndex(item => item.id === id);
      if (index !== -1) {
        queue[index] = { ...queue[index], ...updates };
        await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating sync queue item:', error);
      return false;
    }
  }

  async removeSyncQueueItem(id) {
    try {
      const queue = await this.getSyncQueue();
      const filtered = queue.filter(item => item.id !== id);
      await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error removing sync queue item:', error);
      return false;
    }
  }

  async clearSyncQueue() {
    try {
      await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify([]));
      return true;
    } catch (error) {
      console.error('Error clearing sync queue:', error);
      return false;
    }
  }

  // ==================== LAST SYNC ====================
  
  async setLastSync(timestamp = new Date().toISOString()) {
    try {
      await AsyncStorage.setItem(KEYS.LAST_SYNC, timestamp);
      return true;
    } catch (error) {
      console.error('Error setting last sync:', error);
      return false;
    }
  }

  async getLastSync() {
    try {
      return await AsyncStorage.getItem(KEYS.LAST_SYNC);
    } catch (error) {
      console.error('Error getting last sync:', error);
      return null;
    }
  }

  // ==================== USER DATA ====================
  
  async saveUserData(user) {
    try {
      await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(user));
      return true;
    } catch (error) {
      console.error('Error saving user data:', error);
      return false;
    }
  }

  async getUserData() {
    try {
      const data = await AsyncStorage.getItem(KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // ==================== UTILITIES ====================
  
  isDataStale(cachedAt, maxAgeHours) {
    if (!cachedAt) return true;
    const cachedDate = new Date(cachedAt);
    const now = new Date();
    const hoursDiff = (now - cachedDate) / (1000 * 60 * 60);
    return hoursDiff > maxAgeHours;
  }

  async getOfflineStats() {
    try {
      const [
        pendingAudits,
        pendingPhotos,
        syncQueue,
        lastSync,
      ] = await Promise.all([
        this.getPendingAudits(),
        this.getPendingPhotos(),
        this.getSyncQueue(),
        this.getLastSync(),
      ]);

      return {
        pendingAuditsCount: pendingAudits.length,
        pendingPhotosCount: pendingPhotos.length,
        syncQueueCount: syncQueue.length,
        lastSync,
        hasPendingSync: pendingAudits.length > 0 || pendingPhotos.length > 0 || syncQueue.length > 0,
      };
    } catch (error) {
      console.error('Error getting offline stats:', error);
      return {
        pendingAuditsCount: 0,
        pendingPhotosCount: 0,
        syncQueueCount: 0,
        lastSync: null,
        hasPendingSync: false,
      };
    }
  }

  async clearAllOfflineData() {
    try {
      await Promise.all([
        AsyncStorage.removeItem(KEYS.TEMPLATES),
        AsyncStorage.removeItem(KEYS.LOCATIONS),
        AsyncStorage.removeItem(KEYS.CACHED_AUDITS),
        AsyncStorage.removeItem(KEYS.PENDING_AUDITS),
        AsyncStorage.removeItem(KEYS.PENDING_PHOTOS),
        AsyncStorage.removeItem(KEYS.SYNC_QUEUE),
        AsyncStorage.removeItem(KEYS.LAST_SYNC),
        AsyncStorage.removeItem(KEYS.USER_DATA),
      ]);
      return true;
    } catch (error) {
      console.error('Error clearing offline data:', error);
      return false;
    }
  }
}

export const offlineStorage = new OfflineStorageService();
export default offlineStorage;

