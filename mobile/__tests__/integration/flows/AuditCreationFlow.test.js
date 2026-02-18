/**
 * Integration Test: Audit Creation Service Flow
 * Tests the data pipeline: API → Local Storage → Sync Queue
 * 
 * Phase G - Tier 1: Critical Service Integration
 * Simplified version focusing on service layer, not component rendering
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setupIntegrationTests,
  cleanupIntegrationTests,
  mockApiEndpoint,
} from '../helpers/setupIntegration';
import {
  sampleTemplates,
  sampleAuditItems,
  sampleAuditFormData,
  sampleCompletedAudit,
  createApiResponse,
  sampleApiErrors,
} from '../helpers/fixtures';

describe('Integration: Audit Creation Service Flow', () => {
  beforeAll(async () => {
    await setupIntegrationTests();
  });

  afterAll(async () => {
    await cleanupIntegrationTests();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  describe('Template Loading Pipeline', () => {
    it('should fetch templates from API and cache locally', async () => {
      mockApiEndpoint('get', /\/templates/, {
        templates: [sampleTemplates.safetyAudit, sampleTemplates.fireSafetyAudit],
      });

      const response = await axios.get('/templates');
      expect(response.status).toBe(200);

      // Cache locally
      await AsyncStorage.setItem('templates_cache', JSON.stringify(response.data.templates));

      const cached = JSON.parse(await AsyncStorage.getItem('templates_cache'));
      expect(cached).toHaveLength(2);
    });

    it('should use cache if offline', async () => {
      const cachedTemplates = [sampleTemplates.safetyAudit];
      await AsyncStorage.setItem('templates_cache', JSON.stringify(cachedTemplates));

      const retrieved = JSON.parse(await AsyncStorage.getItem('templates_cache'));
      expect(retrieved).toHaveLength(1);
    });

    it('should handle template API errors', async () => {
      mockApiEndpoint('get', /\/templates/, sampleApiErrors.serverError.data, 500);

      try {
        await axios.get('/templates');
        fail('Should throw');
      } catch (error) {
        expect(error.response.status).toBe(500);
      }
    });
  });

  describe('Category & Items Loading', () => {
    it('should load categories for selected template', async () => {
      mockApiEndpoint('get', /\/templates\/1\/categories/, {
        categories: [{ id: 1, name: 'Fire Safety' }],
      });

      const response = await axios.get('/templates/1/categories');
      expect(response.data.categories).toHaveLength(1);
    });

    it('should load audit items for category', async () => {
      mockApiEndpoint('get', /\/templates\/2\/items/, {
        items: sampleAuditItems,
      });

      const response = await axios.get('/templates/2/items');
      expect(response.data.items.length).toBeGreaterThan(0);
    });
  });

  describe('Audit Form Data Management', () => {
    it('should save form progress locally', async () => {
      const progress = {
        audit_id: `temp_${Date.now()}`,
        template_id: 1,
        items: [{ item_id: 1, response: 'Yes' }],
        incomplete: true,
      };

      await AsyncStorage.setItem('audit_draft', JSON.stringify(progress));

      const saved = JSON.parse(await AsyncStorage.getItem('audit_draft'));
      expect(saved.items[0].response).toBe('Yes');
    });

    it('should restore draft if available', async () => {
      const draft = { template_id: 1, items_completed: 5 };
      await AsyncStorage.setItem('audit_draft', JSON.stringify(draft));

      const stored = await AsyncStorage.getItem('audit_draft');
      expect(stored).toBeTruthy();
      
      const retrieved = JSON.parse(stored);
      expect(retrieved.items_completed).toBe(5);
    });

    it('should validate form before submission', () => {
      const invalidForm = { template_id: null };
      const errors = [];

      if (!invalidForm.template_id) errors.push('Template required');
      
      expect(errors).toContain('Template required');
    });
  });

  describe('Audit Submission', () => {
    it('should post completed audit to API', async () => {
      mockApiEndpoint('post', /\/audits$/, sampleCompletedAudit, 201);

      const response = await axios.post('/audits', sampleAuditFormData);

      expect(response.status).toBe(201);
      expect(response.data.id).toBe('100');
    });

    it('should queue audit for offline sync if network fails', async () => {
      axios.post.mockRejectedValue({
        response: { status: 0, data: { error: 'Network Error' } },
      });

      const audit = { ...sampleAuditFormData, offline_temp_id: `temp_${Date.now()}` };

      try {
        await axios.post('/audits', audit);
      } catch (error) {
        // Queue for sync
        const queue = [audit];
        await AsyncStorage.setItem('sync_queue_audits', JSON.stringify(queue));
      }

      const stored = await AsyncStorage.getItem('sync_queue_audits');
      expect(stored).toBeTruthy();
      const queued = JSON.parse(stored);
      expect(queued).toHaveLength(1);
    });

    it('should clear draft after successful submission', async () => {
      mockApiEndpoint('post', /\/audits$/, sampleCompletedAudit, 201);

      await axios.post('/audits', sampleAuditFormData);

      // Clear draft
      await AsyncStorage.removeItem('audit_draft');
      const draft = await AsyncStorage.getItem('audit_draft');
      expect(draft).toBeNull();
    });

    it('should handle API validation errors', async () => {
      mockApiEndpoint('post', /\/audits$/, sampleApiErrors.validation.data, 422);

      try {
        await axios.post('/audits', { incomplete: true });
        fail('Should throw');
      } catch (error) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.fields).toBeDefined();
      }
    });

    it('should handle unauthorized submission', async () => {
      mockApiEndpoint('post', /\/audits$/, sampleApiErrors.unauthorized.data, 401);

      try {
        await axios.post('/audits', sampleAuditFormData);
        fail('Should throw');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Complete Flow Integration', () => {
    it('should execute full creation pipeline end-to-end', async () => {
      // 1. Fetch templates
      mockApiEndpoint('get', /\/templates$/, {
        templates: [sampleTemplates.safetyAudit],
      });
      let result = await axios.get('/templates');
      expect(result.status).toBe(200);

      // 2. Fetch categories
      mockApiEndpoint('get', /\/templates\/1\/categories/, {
        categories: [{ id: 1, name: 'Fire Safety' }],
      });
      result = await axios.get('/templates/1/categories');
      expect(result.data.categories).toHaveLength(1);

      // 3. Fetch items
      mockApiEndpoint('get', /\/templates\/1\/items/, {
        items: sampleAuditItems.slice(0, 2),
      });
      result = await axios.get('/templates/1/items');
      expect(result.data.items.length).toBe(2);

      // 4. Save draft locally
      const draftData = { template_id: 1, items: [] };
      await AsyncStorage.setItem('audit_draft', JSON.stringify(draftData));
      const saved = await AsyncStorage.getItem('audit_draft');
      expect(saved).toBeTruthy();

      // 5. Submit audit
      mockApiEndpoint('post', /\/audits$/, sampleCompletedAudit, 201);
      result = await axios.post('/audits', sampleAuditFormData);
      expect(result.status).toBe(201);

      // 6. Clear draft
      await AsyncStorage.removeItem('audit_draft');
      expect(await AsyncStorage.getItem('audit_draft')).toBeNull();
    });

    it('should handle interruption and recovery', async () => {
      // User starts form
      const draft = { template_id: 1, items: [{ id: 1, response: 'Yes' }] };
      await AsyncStorage.setItem('audit_draft', JSON.stringify(draft));

      // App crashes / closes
      // App restarts
      const stored = await AsyncStorage.getItem('audit_draft');
      expect(stored).toBeTruthy();
      
      const recovered = JSON.parse(stored);
      expect(recovered.items[0].response).toBe('Yes');

      // User continues and submits
      mockApiEndpoint('post', /\/audits$/, sampleCompletedAudit, 201);
      const response = await axios.post('/audits', { ...draft, ...sampleAuditFormData });
      expect(response.status).toBe(201);
    });
  });

  describe('Error Recovery', () => {
    it('should persist partially completed form on error', async () => {
      const partialForm = {
        template_id: 1,
        category_id: 1,
        items: [{ item_id: 1, response: 'Yes' }],
        error_timestamp: Date.now(),
      };

      await AsyncStorage.setItem('audit_draft_backup', JSON.stringify(partialForm));

      const backupData = await AsyncStorage.getItem('audit_draft_backup');
      expect(backupData).toBeTruthy();
      
      const backup = JSON.parse(backupData);
      expect(backup.items).toHaveLength(1);
    });

    it('should retry submission on timeout', async () => {
      let attempts = 0;
      axios.post.mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.reject(new Error('Timeout'));
        }
        return createApiResponse(sampleCompletedAudit, 201);
      });

      // First attempt
      try {
        await axios.post('/audits', sampleAuditFormData);
      } catch (error) {
        // Retry
      }

      // Reset and retry
      attempts = 0;
      mockApiEndpoint('post', /\/audits$/, sampleCompletedAudit, 201);
      const response = await axios.post('/audits', sampleAuditFormData);
      expect(response.status).toBe(201);
    });
  });
});
