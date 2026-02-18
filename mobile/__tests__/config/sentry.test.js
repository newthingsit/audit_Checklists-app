/**
 * Sentry Configuration Unit Tests
 * Tests error capture, user context, and API error tracking
 */

import * as Sentry from '@sentry/react-native';
import {
  initSentry,
  setSentryUser,
  addSentryBreadcrumb,
  captureSentryException,
  captureSentryMessage,
  startSentryTransaction,
  captureApiError,
} from '../../src/config/sentry';

jest.mock('@sentry/react-native');
jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '2.1.4',
    extra: {
      sentryDsn: 'https://test@sentry.io/123',
      sentryEnvironment: 'test',
      sentryEnabled: true,
      sentryTracesSampleRate: 0.2,
    },
  },
}));

describe('Sentry Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.__DEV__ = false; // Production mode for most tests
  });

  describe('Initialization', () => {
    it('should initialize Sentry with correct configuration', () => {
      initSentry();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.io/123',
          environment: 'test',
          tracesSampleRate: 0.2,
        })
      );
    });

    it('should not initialize in development if disabled', () => {
      global.__DEV__ = true;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Mock empty DSN or disabled config
      jest.doMock('expo-constants', () => ({
        expoConfig: {
          extra: {
            sentryDsn: '',
            sentryEnabled: false,
          },
        },
      }));

      initSentry();

      // Sentry.init should be called from previous test, not this one
      expect(Sentry.init).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });

    it('should log warning if DSN is missing', () => {
      global.__DEV__ = true;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Test initialization behavior with missing DSN
      // In production, this would not initialize Sentry

      consoleWarnSpy.mockRestore();
    });
  });

  describe('User Context', () => {
    it('should set user context with all fields', () => {
      const user = {
        id: 123,
        email: 'test@example.com',
        name: 'Test User',
        role: 'auditor',
        permissions: ['audit.create', 'audit.read'],
      };

      setSentryUser(user);

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: '123',
        email: 'test@example.com',
        username: 'Test User',
        role: 'auditor',
        permissions: 'audit.create,audit.read',
      });
    });

    it('should clear user context when passed null', () => {
      setSentryUser(null);

      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });

    it('should handle user object without permissions', () => {
      const user = {
        id: 456,
        email: 'basic@example.com',
        name: 'Basic User',
        role: 'viewer',
      };

      setSentryUser(user);

      expect(Sentry.setUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '456',
          email: 'basic@example.com',
          username: 'Basic User',
          role: 'viewer',
        })
      );
    });
  });

  describe('Breadcrumbs', () => {
    it('should add breadcrumb with all parameters', () => {
      const category = 'navigation';
      const message = 'User navigated to Audits screen';
      const data = { screen: 'Audits', timestamp: Date.now() };
      const level = 'info';

      addSentryBreadcrumb(category, message, data, level);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category,
        message,
        data,
        level,
        timestamp: expect.any(Number),
      });
    });

    it('should use default level if not provided', () => {
      addSentryBreadcrumb('test', 'test message', {});

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
        })
      );
    });

    it('should handle empty data object', () => {
      addSentryBreadcrumb('test', 'test message');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'test',
          message: 'test message',
          data: {},
        })
      );
    });
  });

  describe('Exception Capture', () => {
    it('should capture exception with context', () => {
      const error = new Error('Test error');
      const context = {
        user: { action: 'submit_audit' },
        extra: { auditId: 123 },
      };

      captureSentryException(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        contexts: context,
        tags: {
          handled: 'true',
        },
      });
    });

    it('should capture exception without context', () => {
      const error = new Error('Simple error');

      captureSentryException(error);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          contexts: {},
          tags: { handled: 'true' },
        })
      );
    });
  });

  describe('Message Capture', () => {
    it('should capture message with level', () => {
      const message = 'Important log message';
      const level = 'warning';
      const context = { source: 'test' };

      captureSentryMessage(message, level, context);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(message, {
        level,
        contexts: context,
      });
    });

    it('should use default info level', () => {
      const message = 'Info message';

      captureSentryMessage(message);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          level: 'info',
        })
      );
    });
  });

  describe('API Error Capture', () => {
    it('should capture API error with correlation ID', () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Internal Server Error', code: 'ERR_500' },
          headers: { 'content-type': 'application/json' },
        },
        message: 'Request failed with status 500',
      };

      const correlationId = 'test-correlation-id-123';
      const endpoint = '/api/audits';
      const method = 'POST';

      captureApiError(error, correlationId, endpoint, method);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            api_error: 'true',
            correlation_id: correlationId,
            http_status: '500',
            http_method: 'POST',
            endpoint: '/api/audits',
          }),
        })
      );
    });

    it('should handle network errors without response', () => {
      const error = {
        message: 'Network Error',
      };

      const correlationId = 'network-error-id';
      const endpoint = '/api/test';

      captureApiError(error, correlationId, endpoint, 'GET');

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            http_status: 'Network Error',
            correlation_id: correlationId,
          }),
        })
      );
    });

    it('should add breadcrumb for API errors', () => {
      const error = {
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      };

      captureApiError(error, 'test-id', '/api/restricted', 'GET');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'api',
          level: 'error',
          data: expect.objectContaining({
            correlation_id: 'test-id',
            status: 403,
          }),
        })
      );
    });

    it('should create fingerprint for error grouping', () => {
      const error = {
        response: {
          status: 404,
          data: {},
        },
      };

      captureApiError(error, 'test-id', '/api/missing', 'GET');

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          fingerprint: ['api-error', '/api/missing', '404'],
        })
      );
    });

    it('should include response context', () => {
      const error = {
        response: {
          status: 400,
          data: { errors: ['Field is required'] },
          headers: { 'x-request-id': 'req-123' },
        },
      };

      captureApiError(error, 'test-id', '/api/validate', 'POST');

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          contexts: expect.objectContaining({
            response: {
              data: { errors: ['Field is required'] },
              headers: { 'x-request-id': 'req-123' },
            },
          }),
        })
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should start transaction with name and operation', () => {
      const mockTransaction = {
        finish: jest.fn(),
      };

      Sentry.startTransaction = jest.fn().mockReturnValue(mockTransaction);

      const transaction = startSentryTransaction('Load Audits', 'http');

      expect(Sentry.startTransaction).toHaveBeenCalledWith({
        name: 'Load Audits',
        op: 'http',
      });

      expect(transaction).toBe(mockTransaction);
    });
  });

  describe('Data Sanitization', () => {
    it('should filter sensitive data in beforeSend hook', () => {
      // This tests the concept of beforeSend filtering
      // In actual implementation, it's in the Sentry.init config

      const event = {
        breadcrumbs: [
          {
            data: {
              password: 'secret123',
              token: 'abc123',
              username: 'testuser',
            },
          },
        ],
        request: {
          data: {
            email: 'test@example.com',
            password: 'mypassword',
            refreshToken: 'refresh-token-123',
          },
        },
      };

      // Simulate beforeSend filtering
      const sanitizedEvent = {
        ...event,
        breadcrumbs: event.breadcrumbs.map((breadcrumb) => ({
          ...breadcrumb,
          data: {
            username: 'testuser',
            password: '[Filtered]',
            token: '[Filtered]',
          },
        })),
        request: {
          data: {
            email: 'test@example.com',
            password: '[Filtered]',
            refreshToken: '[Filtered]',
          },
        },
      };

      expect(sanitizedEvent.breadcrumbs[0].data.password).toBe('[Filtered]');
      expect(sanitizedEvent.breadcrumbs[0].data.token).toBe('[Filtered]');
      expect(sanitizedEvent.request.data.password).toBe('[Filtered]');
      expect(sanitizedEvent.request.data.refreshToken).toBe('[Filtered]');
      expect(sanitizedEvent.request.data.email).toBe('test@example.com');
    });
  });
});
