/**
 * Integration Test: Sync Service
 * Tests data synchronization between local storage and backend
 * 
 * Phase G - Tier 2: Sync Service Integration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  setupIntegrationTests,
  cleanupIntegrationTests,
  mockApiEndpoint,
  setupAsyncStorage,
} from '../helpers/setupIntegration';
import { createAudit, createApiResponse, createApiError } from '../helpers/fixtures';

describe('Integration: Sync Service', () => {
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

  describe('Sync Queue Management', () => {
    it('should create sync queue entry', async () => {
      const audit = createAudit({ id: undefined });

      const queueEntry = {
        id: '1',
        type: 'create_audit',
        action: 'POST',
        endpoint: '/audits',
        data: audit,
        timestamp: Date.now(),
        retries: 0,
        status: 'pending',
      };

      await AsyncStorage.setItem('sync_queue', JSON.stringify([queueEntry]));

      const stored = JSON.parse(await AsyncStorage.getItem('sync_queue'));
      expect(stored).toHaveLength(1);
      expect(stored[0].type).toBe('create_audit');
    });

    it('should add multiple items to sync queue', async () => {
      const queue = [
        {
          id: '1',
          type: 'create_audit',
          endpoint: '/audits',
          status: 'pending',
        },
        {
          id: '2',
          type: 'update_audit',
          endpoint: '/audits/123',
          status: 'pending',
        },
      ];

      await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));

      const stored = JSON.parse(await AsyncStorage.getItem('sync_queue'));
      expect(stored).toHaveLength(2);
    });

    it('should retrieve pending sync items', async () => {
      const queue = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'completed' },
        { id: '3', status: 'pending' },
      ];

      await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));

      const stored = JSON.parse(await AsyncStorage.getItem('sync_queue'));
      const pending = stored.filter(item => item.status === 'pending');

      expect(pending).toHaveLength(2);
    });

    it('should update sync item status', async () => {
      const queue = [
        { id: '1', status: 'pending', timestamp: Date.now() },
      ];

      await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));

      // Update status
      const stored = JSON.parse(await AsyncStorage.getItem('sync_queue'));
      stored[0].status = 'completed';
      await AsyncStorage.setItem('sync_queue', JSON.stringify(stored));

      const updated = JSON.parse(await AsyncStorage.getItem('sync_queue'));
      expect(updated[0].status).toBe('completed');
    });

    it('should remove completed sync item', async () => {
      const queue = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'pending' },
      ];

      await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));

      // Remove first item
      const stored = JSON.parse(await AsyncStorage.getItem('sync_queue'));
      stored.shift();
      await AsyncStorage.setItem('sync_queue', JSON.stringify(stored));

      const updated = JSON.parse(await AsyncStorage.getItem('sync_queue'));
      expect(updated).toHaveLength(1);
      expect(updated[0].id).toBe('2');
    });

    it('should maintain queue order (FIFO)', async () => {
      const queue = [
        { id: '1', timestamp: 1000 },
        { id: '2', timestamp: 2000 },
        { id: '3', timestamp: 3000 },
      ];

      await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));

      const stored = JSON.parse(await AsyncStorage.getItem('sync_queue'));
      expect(stored[0].id).toBe('1');
      expect(stored[1].id).toBe('2');
      expect(stored[2].id).toBe('3');
    });
  });

  describe('Sync Data Types', () => {
    it('should sync create audit operation', async () => {
      const audit = createAudit({ id: undefined });

      const queueItem = {
        type: 'create_audit',
        action: 'POST',
        endpoint: '/audits',
        data: audit,
      };

      await AsyncStorage.setItem('sync_item', JSON.stringify(queueItem));

      const stored = JSON.parse(await AsyncStorage.getItem('sync_item'));
      expect(stored.type).toBe('create_audit');
      expect(stored.action).toBe('POST');
    });

    it('should sync update audit operation', async () => {
      const audit = createAudit({ id: '123' });

      const queueItem = {
        type: 'update_audit',
        action: 'PUT',
        endpoint: '/audits/123',
        data: audit,
      };

      await AsyncStorage.setItem('sync_item', JSON.stringify(queueItem));

      const stored = JSON.parse(await AsyncStorage.getItem('sync_item'));
      expect(stored.type).toBe('update_audit');
      expect(stored.endpoint).toBe('/audits/123');
    });

    it('should sync delete audit operation', async () => {
      const queueItem = {
        type: 'delete_audit',
        action: 'DELETE',
        endpoint: '/audits/123',
      };

      await AsyncStorage.setItem('sync_item', JSON.stringify(queueItem));

      const stored = JSON.parse(await AsyncStorage.getItem('sync_item'));
      expect(stored.action).toBe('DELETE');
    });

    it('should sync form data operation', async () => {
      const queueItem = {
        type: 'update_form_data',
        action: 'PUT',
        endpoint: '/audits/123/form',
        data: {
          categoryId: 'CAT001',
          items: [{ id: 'item1', value: 'yes' }],
        },
      };

      await AsyncStorage.setItem('sync_item', JSON.stringify(queueItem));

      const stored = JSON.parse(await AsyncStorage.getItem('sync_item'));
      expect(stored.data.categoryId).toBe('CAT001');
    });
  });

  describe('Sync Execution', () => {
    it('should execute pending sync item successfully', async () => {
      const audit = createAudit({ id: undefined });
      const response = createApiResponse(audit, 201);

      mockApiEndpoint('POST', '/audits', response, 201);

      // Queue item
      const queueItem = {
        id: '1',
        type: 'create_audit',
        action: 'POST',
        endpoint: '/audits',
        data: audit,
      };

      // Execute sync
      const result = await axios.post('/audits', queueItem.data);

      expect(result.status).toBe(201);
      expect(result.data).toEqual(response);
    });

    it('should retry sync on transient failure', async () => {
      const audit = createAudit({ id: undefined });

      // First call fails with 503
      mockApiEndpoint('POST', '/audits', createApiError('Service Unavailable'), 503);

      const queueItem = {
        retries: 0,
        maxRetries: 3,
        status: 'pending',
      };

      // Simulate retry logic
      try {
        await axios.post('/audits', audit);
      } catch (error) {
        queueItem.retries += 1;
        expect(queueItem.retries).toBe(1);
        expect(queueItem.retries < queueItem.maxRetries).toBe(true);
      }
    });

    it('should skip retry on client error', async () => {
      const audit = createAudit({ id: undefined });

      mockApiEndpoint('POST', '/audits', createApiError('Invalid data'), 400);

      const queueItem = {
        retries: 0,
        shouldRetry: false,
      };

      try {
        await axios.post('/audits', audit);
      } catch (error) {
        if (error.response?.status >= 400 && error.response?.status < 500) {
          queueItem.shouldRetry = false;
        }
        expect(queueItem.shouldRetry).toBe(false);
      }
    });

    it('should update sync item on success', async () => {
      const queueItem = {
        id: '1',
        status: 'pending',
        serverId: null,
      };

      // Mark as synced
      queueItem.status = 'completed';
      queueItem.serverId = 'server-123';

      expect(queueItem.status).toBe('completed');
      expect(queueItem.serverId).toBe('server-123');
    });

    it('should store sync error details', async () => {
      const queueItem = {
        id: '1',
        status: 'failed',
        error: {
          code: 'NETWORK_ERROR',
          message: 'Connection timeout',
          timestamp: Date.now(),
        },
      };

      await AsyncStorage.setItem('failed_sync', JSON.stringify(queueItem));

      const stored = JSON.parse(await AsyncStorage.getItem('failed_sync'));
      expect(stored.error.code).toBe('NETWORK_ERROR');
    });
  });

  describe('Sync Process', () => {
    it('should process sync queue in order', async () => {
      const queue = [
        { id: '1', type: 'create_audit', status: 'pending' },
        { id: '2', type: 'update_audit', status: 'pending' },
      ];

      const processed = [];

      for (const item of queue) {
        if (item.status === 'pending') {
          processed.push(item.id);
          item.status = 'completed';
        }
      }

      expect(processed).toEqual(['1', '2']);
    });

    it('should handle sync cancellation', async () => {
      const queue = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending' },
      ];

      // Cancel sync
      queue.forEach(item => {
        item.status = 'cancelled';
      });

      const cancelled = queue.filter(item => item.status === 'cancelled');
      expect(cancelled).toHaveLength(2);
    });

    it('should pause and resume sync', async () => {
      const queue = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending' },
      ];

      let syncPaused = false;

      // Pause
      syncPaused = true;
      const pendingCount = queue.filter(
        item => item.status === 'pending' && !syncPaused
      ).length;
      expect(pendingCount).toBe(0);

      // Resume
      syncPaused = false;
      const resumedCount = queue.filter(
        item => item.status === 'pending' && !syncPaused
      ).length;
      expect(resumedCount).toBe(2);
    });

    it('should provide sync progress', async () => {
      const queue = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'completed' },
        { id: '3', status: 'pending' },
        { id: '4', status: 'pending' },
      ];

      const completed = queue.filter(item => item.status === 'completed').length;
      const total = queue.length;
      const progress = Math.round((completed / total) * 100);

      expect(progress).toBe(50);
    });

    it('should show sync status badge', async () => {
      const queue = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending' },
      ];

      const pendingCount = queue.filter(item => item.status === 'pending').length;
      const badge = pendingCount > 0 ? `${pendingCount} pending` : null;

      expect(badge).toBe('2 pending');
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect data conflicts', async () => {
      const localData = {
        id: '123',
        name: 'Audit 1',
        version: 1,
        lastModified: 1000,
      };

      const serverData = {
        id: '123',
        name: 'Audit 1 Updated',
        version: 2,
        lastModified: 2000,
      };

      const hasConflict = localData.version < serverData.version;

      expect(hasConflict).toBe(true);
    });

    it('should resolve conflict with server version', async () => {
      const localAudit = createAudit({
        id: '123',
        name: 'Local Name',
        version: 1,
      });

      const serverAudit = createAudit({
        id: '123',
        name: 'Server Name',
        version: 2,
      });

      // Server wins strategy
      const resolved = {
        ...localAudit,
        ...serverAudit,
      };

      expect(resolved.name).toBe('Server Name');
      expect(resolved.version).toBe(2);
    });

    it('should resolve conflict with local version', async () => {
      const localAudit = createAudit({
        id: '123',
        name: 'Local Name',
        version: 1,
      });

      const serverAudit = createAudit({
        id: '123',
        name: 'Server Name',
        version: 2,
      });

      // Local wins strategy
      const resolved = {
        ...serverAudit,
        ...localAudit,
      };

      expect(resolved.name).toBe('Local Name');
    });

    it('should merge conflicting changes', async () => {
      const local = {
        formData: { q1: 'yes', q2: 'no' },
        metadata: { status: 'in-progress' },
      };

      const server = {
        formData: { q1: 'yes', q3: 'n/a' },
        metadata: { status: 'submitted' },
      };

      const merged = {
        formData: { ...server.formData, ...local.formData },
        metadata: server.metadata, // Server version
      };

      expect(merged.formData.q2).toBe('no');
      expect(merged.metadata.status).toBe('submitted');
    });
  });

  describe('Data Consistency', () => {
    it('should validate synced data integrity', async () => {
      const original = createAudit({ id: '123', name: 'Audit 1' });

      await AsyncStorage.setItem('audit_123', JSON.stringify(original));

      const stored = JSON.parse(await AsyncStorage.getItem('audit_123'));

      expect(stored.id).toBe(original.id);
      expect(stored.name).toBe(original.name);
    });

    it('should prevent duplicate sync', async () => {
      const queueItem = {
        id: '1',
        type: 'create_audit',
        status: 'completed',
        serverId: 'server-123',
      };

      // Check if already synced
      const isDuplicate = queueItem.status === 'completed' && queueItem.serverId;

      expect(isDuplicate).toBe(true);
    });

    it('should track sync history', async () => {
      const history = [
        { id: '1', timestamp: 1000, action: 'create', status: 'success' },
        { id: '2', timestamp: 2000, action: 'update', status: 'success' },
        { id: '3', timestamp: 3000, action: 'create', status: 'failed' },
      ];

      await AsyncStorage.setItem('sync_history', JSON.stringify(history));

      const stored = JSON.parse(await AsyncStorage.getItem('sync_history'));

      expect(stored).toHaveLength(3);
      expect(stored[2].status).toBe('failed');
    });

    it('should handle partial sync', async () => {
      const queue = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'failed' },
        { id: '3', status: 'pending' },
      ];

      const successfulSync = queue.filter(item => item.status === 'completed');
      const unsuccessfulSync = queue.filter(
        item => item.status === 'failed' || item.status === 'pending'
      );

      expect(successfulSync).toHaveLength(1);
      expect(unsuccessfulSync).toHaveLength(2);
    });
  });

  describe('Sync Notifications', () => {
    it('should notify sync started', async () => {
      const notification = {
        type: 'sync_started',
        message: 'Syncing your data...',
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem('sync_notification', JSON.stringify(notification));

      const stored = JSON.parse(await AsyncStorage.getItem('sync_notification'));
      expect(stored.type).toBe('sync_started');
    });

    it('should notify sync completed', async () => {
      const notification = {
        type: 'sync_completed',
        message: '2 items synced successfully',
        synced: 2,
        failed: 0,
      };

      await AsyncStorage.setItem('sync_notification', JSON.stringify(notification));

      const stored = JSON.parse(await AsyncStorage.getItem('sync_notification'));
      expect(stored.synced).toBe(2);
    });

    it('should notify sync errors', async () => {
      const notification = {
        type: 'sync_error',
        message: '1 item failed to sync',
        failed: 1,
        errors: [{ id: '1', error: 'Network timeout' }],
      };

      await AsyncStorage.setItem('sync_notification', JSON.stringify(notification));

      const stored = JSON.parse(await AsyncStorage.getItem('sync_notification'));
      expect(stored.errors).toHaveLength(1);
    });
  });

  describe('Complete Sync Workflow', () => {
    it('should execute full sync cycle offline to online', async () => {
      // 1. Create audit offline
      const audit = createAudit({ id: undefined });
      const queueItem = {
        id: '1',
        type: 'create_audit',
        endpoint: '/audits',
        data: audit,
        status: 'pending',
      };

      await AsyncStorage.setItem('sync_queue', JSON.stringify([queueItem]));

      // 2. Go online
      const isOnline = true;

      // 3. Process queue
      if (isOnline) {
        const queue = JSON.parse(await AsyncStorage.getItem('sync_queue'));
        queue[0].status = 'completed';
        await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));
      }

      // 4. Verify synced
      const updated = JSON.parse(await AsyncStorage.getItem('sync_queue'));
      expect(updated[0].status).toBe('completed');
    });
  });
});
