import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import offlineStorage from './OfflineStorage';

class SyncManagerService {
  constructor() {
    this.isSyncing = false;
    this.syncListeners = [];
    this.maxRetries = 3;
  }

  // ==================== LISTENERS ====================
  
  addSyncListener(callback) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(event, data) {
    this.syncListeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  // ==================== MAIN SYNC ====================
  
  async syncAll() {
    if (this.isSyncing) {
      console.log('Sync already in progress...');
      return { success: false, reason: 'already_syncing' };
    }

    this.isSyncing = true;
    this.notifyListeners('sync_started', {});

    try {
      const results = {
        audits: { synced: 0, failed: 0 },
        photos: { synced: 0, failed: 0 },
        queue: { synced: 0, failed: 0 },
      };

      // 1. Sync pending audits
      const auditResults = await this.syncPendingAudits();
      results.audits = auditResults;

      // 2. Sync pending photos
      const photoResults = await this.syncPendingPhotos();
      results.photos = photoResults;

      // 3. Process sync queue
      const queueResults = await this.processSyncQueue();
      results.queue = queueResults;

      // 4. Refresh cached data
      await this.refreshCachedData();

      // 5. Update last sync time
      await offlineStorage.setLastSync();

      this.notifyListeners('sync_completed', results);
      
      return { 
        success: true, 
        results,
        totalSynced: results.audits.synced + results.photos.synced + results.queue.synced,
        totalFailed: results.audits.failed + results.photos.failed + results.queue.failed,
      };
    } catch (error) {
      console.error('Sync error:', error);
      this.notifyListeners('sync_error', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  // ==================== SYNC PENDING AUDITS ====================
  
  async syncPendingAudits() {
    const results = { synced: 0, failed: 0, errors: [] };
    
    try {
      const pendingAudits = await offlineStorage.getPendingAudits();
      
      for (const audit of pendingAudits) {
        if (audit.syncStatus === 'synced') continue;
        
        try {
          this.notifyListeners('syncing_audit', { tempId: audit.tempId });
          
          // Update status to syncing
          await offlineStorage.updatePendingAudit(audit.tempId, { 
            syncStatus: 'syncing' 
          });
          
          // Prepare audit data for API
          const auditData = {
            template_id: audit.template_id,
            location_id: audit.location_id,
            restaurant_name: audit.restaurant_name,
            status: audit.status || 'in_progress',
            notes: audit.notes,
            items: audit.items,
          };

          // Create audit on server
          const response = await axios.post(`${API_BASE_URL}/audits`, auditData);
          
          if (response.data && response.data.audit) {
            // Update any photos that reference this temp ID
            await this.updatePhotoReferences(audit.tempId, response.data.audit.id);
            
            // Remove from pending
            await offlineStorage.removePendingAudit(audit.tempId);
            
            // Cache the synced audit
            await offlineStorage.cacheAudit(response.data.audit);
            
            results.synced++;
            this.notifyListeners('audit_synced', { 
              tempId: audit.tempId, 
              serverId: response.data.audit.id 
            });
          }
        } catch (error) {
          console.error(`Error syncing audit ${audit.tempId}:`, error);
          
          // Update status to failed
          await offlineStorage.updatePendingAudit(audit.tempId, { 
            syncStatus: 'failed',
            lastError: error.message,
            lastAttempt: new Date().toISOString(),
          });
          
          results.failed++;
          results.errors.push({
            tempId: audit.tempId,
            error: error.message,
          });
        }
      }
    } catch (error) {
      console.error('Error in syncPendingAudits:', error);
    }
    
    return results;
  }

  // ==================== SYNC PENDING PHOTOS ====================
  
  async syncPendingPhotos() {
    const results = { synced: 0, failed: 0, errors: [] };
    
    try {
      const pendingPhotos = await offlineStorage.getPendingPhotos();
      
      for (const photo of pendingPhotos) {
        try {
          this.notifyListeners('syncing_photo', { uri: photo.uri });
          
          // Skip if audit hasn't been synced yet
          if (photo.auditTempId && !photo.auditId) {
            const pendingAudits = await offlineStorage.getPendingAudits();
            const audit = pendingAudits.find(a => a.tempId === photo.auditTempId);
            if (audit && audit.syncStatus !== 'synced') {
              continue; // Wait for audit to sync first
            }
          }
          
          // Create form data for upload
          const formData = new FormData();
          formData.append('photo', {
            uri: photo.uri,
            type: photo.type || 'image/jpeg',
            name: photo.name || `photo_${Date.now()}.jpg`,
          });
          
          if (photo.auditId) {
            formData.append('audit_id', photo.auditId);
          }
          if (photo.itemId) {
            formData.append('item_id', photo.itemId);
          }

          // Upload photo
          const response = await axios.post(`${API_BASE_URL}/upload/photo`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          
          if (response.data && response.data.success) {
            await offlineStorage.removePendingPhoto(photo.uri);
            results.synced++;
            this.notifyListeners('photo_synced', { uri: photo.uri });
          }
        } catch (error) {
          console.error(`Error syncing photo:`, error);
          results.failed++;
          results.errors.push({
            uri: photo.uri,
            error: error.message,
          });
        }
      }
    } catch (error) {
      console.error('Error in syncPendingPhotos:', error);
    }
    
    return results;
  }

  // ==================== PROCESS SYNC QUEUE ====================
  
  async processSyncQueue() {
    const results = { synced: 0, failed: 0, errors: [] };
    
    try {
      const queue = await offlineStorage.getSyncQueue();
      
      for (const item of queue) {
        if (item.status === 'completed') continue;
        if (item.attempts >= this.maxRetries) {
          results.failed++;
          continue;
        }
        
        try {
          // Update attempts
          await offlineStorage.updateSyncQueueItem(item.id, {
            attempts: item.attempts + 1,
            lastAttempt: new Date().toISOString(),
            status: 'processing',
          });
          
          // Execute the operation
          let response;
          switch (item.operation) {
            case 'CREATE':
              response = await axios.post(`${API_BASE_URL}${item.endpoint}`, item.data);
              break;
            case 'UPDATE':
              response = await axios.put(`${API_BASE_URL}${item.endpoint}`, item.data);
              break;
            case 'DELETE':
              response = await axios.delete(`${API_BASE_URL}${item.endpoint}`);
              break;
            default:
              throw new Error(`Unknown operation: ${item.operation}`);
          }
          
          // Success - remove from queue
          await offlineStorage.removeSyncQueueItem(item.id);
          results.synced++;
          
        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error);
          
          await offlineStorage.updateSyncQueueItem(item.id, {
            status: item.attempts + 1 >= this.maxRetries ? 'failed' : 'pending',
            lastError: error.message,
          });
          
          if (item.attempts + 1 >= this.maxRetries) {
            results.failed++;
            results.errors.push({
              id: item.id,
              error: error.message,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in processSyncQueue:', error);
    }
    
    return results;
  }

  // ==================== REFRESH CACHED DATA ====================
  
  async refreshCachedData() {
    try {
      // Refresh templates with cache-busting parameter
      const templatesResponse = await axios.get(`${API_BASE_URL}/templates`, {
        params: { _t: Date.now() }
      });
      if (templatesResponse.data && templatesResponse.data.templates) {
        await offlineStorage.saveTemplates(templatesResponse.data.templates);
      }
      
      // Refresh locations
      const locationsResponse = await axios.get(`${API_BASE_URL}/locations`);
      if (locationsResponse.data && locationsResponse.data.locations) {
        await offlineStorage.saveLocations(locationsResponse.data.locations);
      }
      
      this.notifyListeners('cache_refreshed', {});
      return true;
    } catch (error) {
      console.error('Error refreshing cached data:', error);
      return false;
    }
  }

  // ==================== HELPER METHODS ====================
  
  async updatePhotoReferences(tempId, serverId) {
    try {
      const pendingPhotos = await offlineStorage.getPendingPhotos();
      for (const photo of pendingPhotos) {
        if (photo.auditTempId === tempId) {
          // Update photo with actual audit ID
          const updated = { ...photo, auditId: serverId, auditTempId: null };
          await offlineStorage.removePendingPhoto(photo.uri);
          await offlineStorage.queuePhoto(updated);
        }
      }
    } catch (error) {
      console.error('Error updating photo references:', error);
    }
  }

  // ==================== PREFETCH DATA ====================
  
  async prefetchDataForOffline() {
    try {
      this.notifyListeners('prefetch_started', {});
      
      // Fetch and cache templates with cache-busting parameter
      const templatesResponse = await axios.get(`${API_BASE_URL}/templates`, {
        params: { _t: Date.now() }
      });
      if (templatesResponse.data && templatesResponse.data.templates) {
        await offlineStorage.saveTemplates(templatesResponse.data.templates);
      }
      
      // Fetch and cache locations
      const locationsResponse = await axios.get(`${API_BASE_URL}/locations`);
      if (locationsResponse.data && locationsResponse.data.locations) {
        await offlineStorage.saveLocations(locationsResponse.data.locations);
      }
      
      // Cache recent audits
      const auditsResponse = await axios.get(`${API_BASE_URL}/audits?limit=20`);
      if (auditsResponse.data && auditsResponse.data.audits) {
        for (const audit of auditsResponse.data.audits) {
          await offlineStorage.cacheAudit(audit);
        }
      }
      
      await offlineStorage.setLastSync();
      this.notifyListeners('prefetch_completed', {});
      
      return { success: true };
    } catch (error) {
      console.error('Error prefetching data:', error);
      this.notifyListeners('prefetch_error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Get sync status
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
    };
  }
}

export const syncManager = new SyncManagerService();
export default syncManager;

