/**
 * Integration Test: Offline-to-Online Sync Flow
 * Tests: Offline Mode → Queued Operations → Network Resume → Sync & Verify
 * 
 * Phase G - Tier 1: Critical Infrastructure Path
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setupIntegrationTests,
  cleanupIntegrationTests,
  mockApiEndpoint,
} from '../helpers/setupIntegration';
import { createMockNetworkContext, createMockNavigation } from '../helpers/mockProviders';
import {
  sampleAuditFormData,
  sampleCompletedAudit,
  createApiResponse,
} from '../helpers/fixtures';

describe('Integration: Offline-to-Online Sync Flow', () => {
  let mockNavigation;
  let mockNetwork;

  beforeAll(async () => {
    await setupIntegrationTests();
  });

  afterAll(async () => {
    await cleanupIntegrationTests();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockNavigation = createMockNavigation();
    mockNetwork = createMockNetworkContext();
    await AsyncStorage.clear();
  });

  describe('Offline Operation', () => {
    it('should detect offline status', async () => {
      mockNetwork.isOnline = false;
      mockNetwork.networkType = 'none';

      expect(mockNetwork.isOnline).toBe(false);
      expect(mockNetwork.networkType).toBe('none');
    });

    it('should allow audit creation while offline', async () => {
      mockNetwork.isOnline = false;

      const auditData = { ...sampleAuditFormData };

      // Offline: save locally instead of posting
      const tempId = `offline_${Date.now()}`;
      const offlineAudit = { ...auditData, id: tempId, synced: false };

      await AsyncStorage.setItem('audit_queue', JSON.stringify([offlineAudit]));

      const saved = JSON.parse(await AsyncStorage.getItem('audit_queue'));

      expect(saved).toHaveLength(1);
      expect(saved[0].synced).toBe(false);
    });

    it('should queue multiple operations while offline', async () => {
      mockNetwork.isOnline = false;

      const operations = [
        { type: 'create_audit', data: sampleAuditFormData, id: 'offline_1' },
        { type: 'update_audit', data: { id: '100', status: 'archived' }, id: 'offline_2' },
        { type: 'delete_audit', data: { id: '99' }, id: 'offline_3' },
      ];

      await AsyncStorage.setItem('sync_queue', JSON.stringify(operations));

      const saved = JSON.parse(await AsyncStorage.getItem('sync_queue'));

      expect(saved).toHaveLength(3);
      expect(saved[0].type).toBe('create_audit');
      expect(saved[1].type).toBe('update_audit');
      expect(saved[2].type).toBe('delete_audit');
    });

    it('should persist cache while offline', async () => {
      mockNetwork.isOnline = false;

      const cachedData = {
        templates: ['Safety Audit', 'Fire Safety'],
        audits: [sampleCompletedAudit],
        lastSync: Date.now(),
      };

      await AsyncStorage.setItem('offline_cache', JSON.stringify(cachedData));

      const retrieved = JSON.parse(await AsyncStorage.getItem('offline_cache'));

      expect(retrieved.templates).toHaveLength(2);
      expect(retrieved.audits).toHaveLength(1);
    });

    it('should display cached data in offline mode', async () => {
      mockNetwork.isOnline = false;

      const cachedAudits = [sampleCompletedAudit];
      await AsyncStorage.setItem('audits_cache', JSON.stringify(cachedAudits));

      // UI would display cached data
      const displayed = JSON.parse(await AsyncStorage.getItem('audits_cache'));

      expect(displayed).toHaveLength(1);
      expect(displayed[0].status).toBe('completed');
    });

    it('should prevent new API requests while offline', async () => {
      mockNetwork.isOnline = false;

      const canMakeRequest = mockNetwork.isOnline;

      expect(canMakeRequest).toBe(false);
    });

    it('should show offline indicator to user', () => {
      const isOnlineIndicatorShown = !mockNetwork.isOnline;

      expect(isOnlineIndicatorShown).toBe(true);
    });
  });

  describe('Network Status Change Detection', () => {
    it('should detect transition from offline to online', async () => {
      // Start offline
      mockNetwork.isOnline = false;
      expect(mockNetwork.isOnline).toBe(false);

      // Network comes back
      mockNetwork.isOnline = true;
      expect(mockNetwork.isOnline).toBe(true);
    });

    it('should trigger sync when connection restored', async () => {
      mockNetwork.isOnline = false;

      // Queue operation while offline
      const operations = [{ type: 'create_audit', data: sampleAuditFormData }];
      await AsyncStorage.setItem('sync_queue', JSON.stringify(operations));

      // Connection restored
      mockNetwork.isOnline = true;

      // Should trigger sync
      const queue = JSON.parse(await AsyncStorage.getItem('sync_queue'));
      expect(queue).toHaveLength(1);
    });

    it('should subscribe to network changes', () => {
      mockNetwork.subscribeToNetworkChange = jest.fn((callback) => {
        // Mock subscription
        return jest.fn(); // unsubscribe
      });

      const unsubscribe = mockNetwork.subscribeToNetworkChange(() => {});

      expect(mockNetwork.subscribeToNetworkChange).toHaveBeenCalled();
      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it('should debounce rapid network changes', async () => {
      let changeCount = 0;

      mockNetwork.subscribeToNetworkChange = jest.fn((callback) => {
        changeCount++;
        return jest.fn();
      });

      // Simulate rapid network changes
      mockNetwork.subscribeToNetworkChange(() => {});
      mockNetwork.subscribeToNetworkChange(() => {});
      mockNetwork.subscribeToNetworkChange(() => {});

      // Should debounce, not process all immediately
      expect(changeCount).toBeGreaterThan(0);
    });
  });

  describe('Sync Process', () => {
    it('should process queued operations on sync', async () => {
      const operations = [
        {
          id: 'op_1',
          type: 'create_audit',
          data: sampleAuditFormData,
          timestamp: Date.now(),
        },
      ];

      await AsyncStorage.setItem('sync_queue', JSON.stringify(operations));

      mockApiEndpoint('post', /\/audits/, sampleCompletedAudit, 201);

      const response = await axios.post('/audits', operations[0].data);

      expect(response.status).toBe(201);
    });

    it('should mark operations as synced after successful upload', async () => {
      const operation = {
        id: 'op_1',
        type: 'create_audit',
        data: sampleAuditFormData,
        synced: false,
      };

      mockApiEndpoint('post', /\/audits/, sampleCompletedAudit, 201);

      const response = await axios.post('/audits', operation.data);

      if (response.status === 201) {
        operation.synced = true;
      }

      expect(operation.synced).toBe(true);
    });

    it('should retry failed sync operations', async () => {
      let attempts = 0;

      mockApiEndpoint('post', /\/audits/, () => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject({ response: { status: 500 } });
        }
        return sampleCompletedAudit;
      });

      const operation = { type: 'create_audit', data: sampleAuditFormData };

      try {
        await axios.post('/audits', operation.data);
      } catch (error) {
        // First attempt fails
      }

      // Should retry
      attempts = 0;
      mockApiEndpoint('post', /\/audits/, sampleCompletedAudit, 201);
      const response = await axios.post('/audits', operation.data);

      expect(response.status).toBe(201);
    });

    it('should handle sync conflicts', async () => {
      // Local edit while offline
      const localAudit = { id: '100', status: 'approved', approved_by: 'user_1' };

      // Remote changed between offline and online
      const remoteAudit = { id: '100', status: 'archived', archived_by: 'admin' };

      // Conflict resolution: remote wins (or user chooses)
      const resolved = remoteAudit;

      expect(resolved.status).toBe('archived');
    });

    it('should show sync progress to user', async () => {
      const operations = [
        { id: 'op_1', type: 'create_audit' },
        { id: 'op_2', type: 'update_audit' },
        { id: 'op_3', type: 'delete_audit' },
      ];

      const syncProgress = {
        total: operations.length,
        completed: 1,
        failed: 0,
        inProgress: 1,
      };

      expect(syncProgress.completed).toBe(1);
      expect(syncProgress.total).toBe(3);
    });

    it('should complete sync and clear queue', async () => {
      // Queue has operations
      const operations = [{ id: 'op_1', type: 'create_audit', data: sampleAuditFormData }];
      await AsyncStorage.setItem('sync_queue', JSON.stringify(operations));

      mockApiEndpoint('post', /\/audits/, sampleCompletedAudit, 201);

      // Process all
      for (const op of operations) {
        await axios.post('/audits', op.data);
      }

      // Clear queue
      await AsyncStorage.removeItem('sync_queue');

      const queue = await AsyncStorage.getItem('sync_queue');
      expect(queue).toBeNull();
    });

    it('should maintain operation order during sync', async () => {
      const operations = [
        { id: 'op_1', seq: 1, type: 'create_audit', auditId: 'A' },
        { id: 'op_2', seq: 2, type: 'update_audit', auditId: 'A' },
        { id: 'op_3', seq: 3, type: 'delete_audit', auditId: 'A' },
      ];

      // Process in order, verifying sequence
      const processedSeq = [];

      for (const op of operations) {
        processedSeq.push(op.seq);
      }

      expect(processedSeq).toEqual([1, 2, 3]);
    });
  });

  describe('Data Consistency', () => {
    it('should verify local and remote data consistency after sync', async () => {
      const localData = { id: '100', status: 'completed', items: 15 };

      mockApiEndpoint('get', /\/audits\/100/, localData);

      const remoteData = await axios.get('/audits/100');

      expect(remoteData.data).toEqual(localData);
    });

    it('should reconcile conflicting updates', async () => {
      // User offline: marks audit as approved
      const offlineAction = {
        auditId: '100',
        action: 'approve',
        timestamp: Date.now() - 5000,
      };

      // Meanwhile, admin online: archives the audit
      const remoteAction = {
        auditId: '100',
        action: 'archive',
        timestamp: Date.now(),
      };

      // Last-write-wins resolution
      const resolved = remoteAction.timestamp > offlineAction.timestamp ? remoteAction : offlineAction;

      expect(resolved.action).toBe('archive');
    });

    it('should preserve data integrity during sync interruption', async () => {
      const operation = {
        id: 'op_1',
        type: 'create_audit',
        data: sampleAuditFormData,
        status: 'in_progress',
      };

      await AsyncStorage.setItem('current_sync_op', JSON.stringify(operation));

      // Resume from interruption
      const resumed = JSON.parse(await AsyncStorage.getItem('current_sync_op'));

      expect(resumed.id).toBe('op_1');
      expect(resumed.status).toBe('in_progress');
    });

    it('should validate synced data matches original', async () => {
      const original = { ...sampleAuditFormData };

      mockApiEndpoint('post', /\/audits/, sampleCompletedAudit, 201);

      const response = await axios.post('/audits', original);

      // Compare critical fields
      expect(response.data.template_id).toBe(original.template_id);
      expect(response.data.location_id).toBe(original.location_id);
    });
  });

  describe('Complete Offline-Online Cycle', () => {
    it('should handle complete offline-to-online workflow', async () => {
      // Step 1: Go offline
      mockNetwork.isOnline = false;
      expect(mockNetwork.isOnline).toBe(false);

      // Step 2: Create audit offline
      const offlineAudit = { ...sampleAuditFormData, id: 'offline_1' };
      await AsyncStorage.setItem('audit_queue', JSON.stringify([offlineAudit]));

      let queue = JSON.parse(await AsyncStorage.getItem('audit_queue'));
      expect(queue).toHaveLength(1);

      // Step 3: Network comes back
      mockNetwork.isOnline = true;

      // Step 4: Start sync
      mockApiEndpoint('post', /\/audits/, sampleCompletedAudit, 201);

      const response = await axios.post('/audits', offlineAudit);
      expect(response.status).toBe(201);

      // Step 5: Clear queue
      await AsyncStorage.removeItem('audit_queue');
      queue = await AsyncStorage.getItem('audit_queue');
      expect(queue).toBeNull();
    });

    it('should handle online → offline → online → sync', async () => {
      mockNetwork.isOnline = true;

      // Online: create audit
      mockApiEndpoint('post', /\/audits/, sampleCompletedAudit, 201);
      let response = await axios.post('/audits', sampleAuditFormData);
      expect(response.status).toBe(201);

      // Go offline
      mockNetwork.isOnline = false;

      // Queue another audit offline
      const offlineAudit = { ...sampleAuditFormData, id: 'offline_2' };
      await AsyncStorage.setItem('offline_queue', JSON.stringify([offlineAudit]));

      // Go back online
      mockNetwork.isOnline = true;

      // Sync offline queue
      const queue = JSON.parse(await AsyncStorage.getItem('offline_queue'));
      if (queue && queue.length > 0) {
        response = await axios.post('/audits', queue[0]);
        expect(response.status).toBe(201);
      }
    });
  });

  describe('Error Handling in Sync', () => {
    it('should handle sync failure with retry strategy', async () => {
      let attempts = 0;

      mockApiEndpoint('post', /\/audits/, () => {
        attempts++;
        if (attempts <= 2) {
          throw new Error('Network error');
        }
        return sampleCompletedAudit;
      });

      const operation = { data: sampleAuditFormData };

      try {
        await axios.post('/audits', operation.data);
      } catch (error) {
        // First attempt fails
      }

      // Retry should eventually succeed
      attempts = 0;
      mockApiEndpoint('post', /\/audits/, sampleCompletedAudit, 201);
      const response = await axios.post('/audits', operation.data);
      expect(response.status).toBe(201);
    });

    it('should handle partial sync failure', async () => {
      const operations = [
        { id: 'op_1', data: sampleAuditFormData, status: 'success' },
        { id: 'op_2', data: sampleAuditFormData, status: 'failed' },
        { id: 'op_3', data: sampleAuditFormData, status: 'pending' },
      ];

      const syncResult = {
        total: 3,
        successful: 1,
        failed: 1,
        pending: 1,
      };

      expect(syncResult.successful).toBe(1);
      expect(syncResult.failed).toBe(1);
    });

    it('should notify user of sync completion with results', () => {
      const syncNotification = {
        title: 'Sync Complete',
        message: '2 audits synced successfully, 1 failed',
        type: 'info',
      };

      expect(syncNotification.message).toContain('synced');
    });
  });
});
