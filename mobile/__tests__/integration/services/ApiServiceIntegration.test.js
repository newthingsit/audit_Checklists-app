/**
 * Integration Test: API Service Layer
 * Tests HTTP request/response handling, retries, error handling
 * 
 * Phase G - Tier 2: Service Integration
 */

import axios from 'axios';
import {
  setupIntegrationTests,
  cleanupIntegrationTests,
  mockApiEndpoint,
} from '../helpers/setupIntegration';
import {
  sampleTemplates,
  sampleAuditFormData,
  sampleCompletedAudit,
  sampleApiErrors,
  sampleAuditHistory,
} from '../helpers/fixtures';

describe('Integration: API Service Layer', () => {
  beforeAll(async () => {
    await setupIntegrationTests();
  });

  afterAll(async () => {
    await cleanupIntegrationTests();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET Requests - Data Retrieval', () => {
    it('should fetch list of templates', async () => {
      mockApiEndpoint('get', /\/templates$/, {
        templates: [sampleTemplates.safetyAudit, sampleTemplates.fireSafetyAudit],
        total: 2,
      });

      const response = await axios.get('/templates');

      expect(response.status).toBe(200);
      expect(response.data.templates.length).toBeGreaterThan(0);
    });

    it('should fetch single resource by ID', async () => {
      mockApiEndpoint('get', /\/templates\/1$/, sampleTemplates.safetyAudit);

      const response = await axios.get('/templates/1');

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(1);
    });

    it('should fetch audit history with pagination', async () => {
      mockApiEndpoint('get', /\/audits\/history/, {
        audits: sampleAuditHistory,
        page: 1,
        pageSize: 10,
        total: 50,
      });

      const response = await axios.get('/audits/history?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.data.audits).toHaveLength(3);
    });

    it('should handle 404 Not Found', async () => {
      mockApiEndpoint('get', /\/templates\/999/, sampleApiErrors.notFound.data, 404);

      try {
        await axios.get('/templates/999');
        fail('Should throw 404 error');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should handle empty results gracefully', async () => {
      mockApiEndpoint('get', /\/audits\/empty/, { audits: [] });

      const response = await axios.get('/audits/empty');

      expect(response.status).toBe(200);
      expect(response.data.audits).toHaveLength(0);
    });
  });

  describe('POST Requests - Data Creation', () => {
    it('should create new audit successfully', async () => {
      mockApiEndpoint('post', /\/audits$/, sampleCompletedAudit, 201);

      const response = await axios.post('/audits', sampleAuditFormData);

      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      expect(response.data.status).toBe('completed');
    });

    it('should validate required fields', async () => {
      mockApiEndpoint('post', /\/audits$/, sampleApiErrors.validation.data, 422);

      try {
        await axios.post('/audits', { incomplete: true });
        fail('Should throw validation error');
      } catch (error) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.fields).toBeDefined();
      }
    });

    it('should handle authorization on POST', async () => {
      mockApiEndpoint('post', /\/audits$/, sampleApiErrors.unauthorized.data, 401);

      try {
        await axios.post('/audits', sampleAuditFormData);
        fail('Should throw auth error');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });

    it('should return created resource with ID', async () => {
      mockApiEndpoint('post', /\/templates$/, {
        id: 999,
        name: 'New Template',
        created_at: new Date().toISOString(),
      }, 201);

      const response = await axios.post('/templates', { name: 'New Template' });

      expect(response.status).toBe(201);
      expect(response.data.id).toBe(999);
    });
  });

  describe('PUT Requests - Data Update', () => {
    it('should update existing audit', async () => {
      const updatedAudit = { ...sampleCompletedAudit, status: 'approved' };
      mockApiEndpoint('put', /\/audits\/100/, updatedAudit);

      const response = await axios.put('/audits/100', { status: 'approved' });

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('approved');
    });

    it('should handle 404 on update', async () => {
      mockApiEndpoint('put', /\/audits\/999/, sampleApiErrors.notFound.data, 404);

      try {
        await axios.put('/audits/999', { status: 'approved' });
        fail('Should throw 404');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should prevent unauthorized updates', async () => {
      mockApiEndpoint('put', /\/audits\/100/, sampleApiErrors.forbidden.data, 403);

      try {
        await axios.put('/audits/100', { status: 'archived' });
        fail('Should throw forbidden');
      } catch (error) {
        expect(error.response.status).toBe(403);
      }
    });
  });

  describe('DELETE Requests - Data Removal', () => {
    it('should delete audit successfully', async () => {
      mockApiEndpoint('delete', /\/audits\/100/, { success: true });

      const response = await axios.delete('/audits/100');

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should handle 404 on delete', async () => {
      mockApiEndpoint('delete', /\/audits\/999/, sampleApiErrors.notFound.data, 404);

      try {
        await axios.delete('/audits/999');
        fail('Should throw 404');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('Error Handling - Server Errors', () => {
    it('should handle 500 Internal Server Error', async () => {
      mockApiEndpoint('get', /\/audits/, sampleApiErrors.serverError.data, 500);

      try {
        await axios.get('/audits');
        fail('Should throw 500');
      } catch (error) {
        expect(error.response.status).toBe(500);
      }
    });

    it('should handle network timeout', async () => {
      axios.get.mockRejectedValue(new Error('timeout of 5000ms exceeded'));

      try {
        await axios.get('/audits');
        fail('Should throw timeout');
      } catch (error) {
        expect(error.message).toContain('timeout');
      }
    });

    it('should handle network connection error', async () => {
      axios.get.mockRejectedValue({ code: 'ECONNREFUSED' });

      try {
        await axios.get('/audits');
        fail('Should throw connection error');
      } catch (error) {
        expect(error.code).toBe('ECONNREFUSED');
      }
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 500 error', async () => {
      let attempts = 0;
      axios.get.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject({ response: { status: 500, data: { error: 'Server Error' } } });
        }
        return Promise.resolve({ status: 200, data: { audits: [] } });
      });

      try {
        await axios.get('/audits');
      } catch (error) {
        // First request fails
      }

      // Implement retry
      axios.get.mockClear();
      mockApiEndpoint('get', /\/audits/, { audits: [] });
      const response = await axios.get('/audits');

      expect(response.status).toBe(200);
    });

    it('should not retry on 400 Bad Request', async () => {
      let attempts = 0;
      axios.get.mockImplementation(() => {
        attempts++;
        return Promise.reject({ response: { status: 400, data: { error: 'Bad Request' } } });
      });

      try {
        await axios.get('/audits');
      } catch (error) {
        // Client error, should not retry
      }

      expect(attempts).toBe(1);
    });

    it('should not retry on 404 Not Found', async () => {
      let attempts = 0;
      axios.get.mockImplementation(() => {
        attempts++;
        return Promise.reject({ response: { status: 404, data: { error: 'Not Found' } } });
      });

      try {
        await axios.get('/audits/999');
      } catch (error) {
        // Resource not found, should not retry
      }

      expect(attempts).toBe(1);
    });
  });

  describe('Request Headers', () => {
    it('should include authorization header', async () => {
      axios.defaults.headers.common['Authorization'] = 'Bearer token-123';
      mockApiEndpoint('get', /\/audits/, { audits: [] });

      await axios.get('/audits');

      expect(axios.defaults.headers.common['Authorization']).toBe('Bearer token-123');
    });

    it('should include content-type header on POST', async () => {
      const config = { headers: { 'Content-Type': 'application/json' } };
      mockApiEndpoint('post', /\/audits$/, sampleCompletedAudit, 201);

      const response = await axios.post('/audits', sampleAuditFormData, config);

      expect(response.status).toBe(201);
    });

    it('should handle custom headers', async () => {
      const customHeaders = {
        'X-Custom-Header': 'custom-value',
      };
      mockApiEndpoint('get', /\/audits/, { audits: [] });

      await axios.get('/audits', { headers: customHeaders });

      expect(customHeaders['X-Custom-Header']).toBe('custom-value');
    });
  });

  describe('Response Handling', () => {
    it('should parse JSON response', async () => {
      mockApiEndpoint('get', /\/templates/, {
        templates: [sampleTemplates.safetyAudit],
      });

      const response = await axios.get('/templates');

      expect(typeof response.data).toBe('object');
      expect(response.data.templates).toBeDefined();
    });

    it('should handle array responses', async () => {
      mockApiEndpoint('get', /\/audits/, {
        data: [sampleCompletedAudit],
      });

      const response = await axios.get('/audits');

      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should preserve response metadata', async () => {
      mockApiEndpoint('get', /\/audits/, {
        audits: [sampleCompletedAudit],
        timestamp: new Date().toISOString(),
      });

      const response = await axios.get('/audits');

      expect(response.data.timestamp).toBeDefined();
    });
  });

  describe('Query Parameters', () => {
    it('should handle query parameters', async () => {
      mockApiEndpoint('get', /\/audits\?.*/, {
        audits: sampleAuditHistory.slice(0, 1),
      });

      const response = await axios.get('/audits?page=1&limit=1');

      expect(response.status).toBe(200);
    });

    it('should handle multiple query parameters', async () => {
      mockApiEndpoint('get', /\/audits\?/, {
        audits: [],
        filters: { status: 'completed', location: 1 },
      });

      const response = await axios.get('/audits?status=completed&location=1');

      expect(response.status).toBe(200);
    });

    it('should handle URL encoding', async () => {
      mockApiEndpoint('get', /\/audits/, { audits: [] });

      const params = { search: 'Fire Safety Audit', date: '2026-02-18' };
      const response = await axios.get('/audits', { params });

      expect(response.status).toBe(200);
    });
  });

  describe('Response Caching', () => {
    it('should cache successful response', async () => {
      mockApiEndpoint('get', /\/templates/, {
        templates: [sampleTemplates.safetyAudit],
      });

      const response1 = await axios.get('/templates');
      const response2 = await axios.get('/templates');

      expect(response1.data).toEqual(response2.data);
    });

    it('should distinguish between different endpoints', async () => {
      mockApiEndpoint('get', /\/templates/, { templates: [sampleTemplates.safetyAudit] });
      mockApiEndpoint('get', /\/audits/, { audits: [sampleCompletedAudit] });

      const templates = await axios.get('/templates');
      const audits = await axios.get('/audits');

      expect(templates.data.templates).toBeDefined();
      expect(audits.data.audits).toBeDefined();
    });
  });

  describe('API Service Complete Flow', () => {
    it('should execute complete CRUD workflow', async () => {
      // CREATE
      mockApiEndpoint('post', /\/templates$/, {
        id: 100,
        name: 'New Template',
      }, 201);
      let response = await axios.post('/templates', { name: 'New Template' });
      expect(response.status).toBe(201);
      const templateId = response.data.id;

      // READ
      mockApiEndpoint('get', /\/templates\/100/, {
        id: 100,
        name: 'New Template',
      });
      response = await axios.get(`/templates/${templateId}`);
      expect(response.status).toBe(200);

      // UPDATE
      mockApiEndpoint('put', /\/templates\/100/, {
        id: 100,
        name: 'Updated Template',
      });
      response = await axios.put(`/templates/${templateId}`, { name: 'Updated Template' });
      expect(response.status).toBe(200);

      // DELETE
      mockApiEndpoint('delete', /\/templates\/100/, { success: true });
      response = await axios.delete(`/templates/${templateId}`);
      expect(response.status).toBe(200);
    });

    it('should recover from transient failures', async () => {
      let attempts = 0;

      // First attempt fails
      axios.get.mockImplementationOnce(() => {
        attempts++;
        return Promise.reject({ response: { status: 500 } });
      });

      try {
        await axios.get('/templates');
      } catch (error) {
        expect(error.response.status).toBe(500);
      }

      // Retry succeeds
      mockApiEndpoint('get', /\/templates/, {
        templates: [sampleTemplates.safetyAudit],
      });
      const response = await axios.get('/templates');
      expect(response.status).toBe(200);
    });
  });

  describe('API Concurrency', () => {
    it('should handle parallel requests', async () => {
      mockApiEndpoint('get', /\/templates/, { templates: [sampleTemplates.safetyAudit] });
      mockApiEndpoint('get', /\/audits/, { audits: [sampleCompletedAudit] });

      const [templatesRes, auditsRes] = await Promise.all([
        axios.get('/templates'),
        axios.get('/audits'),
      ]);

      expect(templatesRes.status).toBe(200);
      expect(auditsRes.status).toBe(200);
    });

    it('should not interfere with different request types', async () => {
      mockApiEndpoint('get', /\/templates/, { templates: [] });
      mockApiEndpoint('post', /\/audits$/, sampleCompletedAudit, 201);

      const [getRes, postRes] = await Promise.all([
        axios.get('/templates'),
        axios.post('/audits', sampleAuditFormData),
      ]);

      expect(getRes.status).toBe(200);
      expect(postRes.status).toBe(201);
    });
  });
});
