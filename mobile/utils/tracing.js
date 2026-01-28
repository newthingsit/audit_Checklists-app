/**
 * OpenTelemetry Tracing for React Native/Expo Mobile App
 * Captures performance metrics and error tracking for audit flow
 */

import { fetch as fetchAPI } from 'react-native';
import { setJSExceptionHandler, getJSExceptionHandler } from 'react-native-exception-handler';

/**
 * Initialize tracing for mobile app
 * Monitors:
 * - API request/response times
 * - Audit form interactions
 * - Navigation flows
 * - Errors and crashes
 */
export class MobileTracer {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'audit-mobile';
    this.collectorUrl = options.collectorUrl || 'http://localhost:4318';
    this.spans = [];
    this.maxSpans = 100;
    
    // Patch fetch to track API calls
    this.patchFetch();
    
    // Patch error handler for crash reporting
    this.setupErrorTracking();
  }

  /**
   * Start a named span for tracking operations
   */
  startSpan(name, attributes = {}) {
    const span = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      startTime: Date.now(),
      attributes,
      events: [],
    };
    return span;
  }

  /**
   * End a span and record it
   */
  endSpan(span, status = 'OK', error = null) {
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = error ? 'ERROR' : status;
    if (error) {
      span.error = error.message;
    }
    
    this.recordSpan(span);
    return span;
  }

  /**
   * Record a span to be sent to collector
   */
  recordSpan(span) {
    this.spans.push(span);
    
    // Keep only recent spans
    if (this.spans.length > this.maxSpans) {
      this.spans = this.spans.slice(-this.maxSpans);
    }

    // Send in batches
    if (this.spans.length % 10 === 0) {
      this.flushSpans();
    }
  }

  /**
   * Send collected spans to trace collector
   */
  async flushSpans() {
    if (this.spans.length === 0) return;

    try {
      const sendFetch = globalThis.fetch || fetchAPI;
      if (typeof sendFetch !== 'function') {
        console.warn('[Tracing] fetch is not available; skipping trace flush');
        return;
      }

      const batch = this.spans.splice(0, this.maxSpans);
      
      const payload = {
        resourceSpans: [
          {
            resource: {
              attributes: [
                { key: 'service.name', value: { stringValue: this.serviceName } },
                { key: 'service.version', value: { stringValue: '2.1.4' } },
              ],
            },
            scopeSpans: [
              {
                scope: { name: 'audit-mobile-tracer' },
                spans: batch.map(span => ({
                  traceId: this.generateTraceId(),
                  spanId: span.id,
                  name: span.name,
                  startTimeUnixNano: String(span.startTime * 1000000),
                  endTimeUnixNano: String(span.endTime * 1000000),
                  attributes: Object.entries(span.attributes).map(([key, value]) => ({
                    key,
                    value: { stringValue: String(value) },
                  })),
                  status: { code: span.status === 'ERROR' ? 2 : 0 },
                })),
              },
            ],
          },
        ],
      };

      await sendFetch(`${this.collectorUrl}/v1/traces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.warn('Failed to flush traces:', error);
    }
  }

  /**
   * Generate a trace ID
   */
  generateTraceId() {
    return Array.from({ length: 16 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  /**
   * Patch fetch to track API calls
   */
  patchFetch() {
    if (this._fetchPatched) {
      return;
    }

    const originalFetch = globalThis.fetch || fetchAPI;
    if (typeof originalFetch !== 'function') {
      console.warn('[Tracing] fetch is not available; skipping fetch patch');
      return;
    }

    const self = this;
    this._fetchPatched = true;

    globalThis.fetch = function(url, options = {}) {
      const span = self.startSpan('http.request', {
        'http.method': options.method || 'GET',
        'http.url': String(url),
      });

      return originalFetch(url, options)
        .then(response => {
          self.endSpan(span, 'OK');
          span.attributes['http.status_code'] = response.status;
          self.recordSpan(span);
          return response;
        })
        .catch(error => {
          self.endSpan(span, 'ERROR', error);
          throw error;
        });
    };
  }

  /**
   * Set up error tracking for crashes
   */
  setupErrorTracking() {
    setJSExceptionHandler((error, isFatal) => {
      const span = this.startSpan('error', {
        'error.type': error.name,
        'error.message': error.message,
        'error.fatal': isFatal,
        'error.stack': error.stack,
      });
      
      this.endSpan(span, 'ERROR', error);
    });
  }

  /**
   * Track audit form interactions
   */
  trackAuditAction(action, details = {}) {
    const span = this.startSpan(`audit.${action}`, details);
    // Auto-end after short delay to capture synchronous operations
    setTimeout(() => {
      this.endSpan(span);
    }, 100);
    return span;
  }

  /**
   * Track category navigation
   */
  trackCategoryNavigation(fromCategory, toCategory) {
    this.trackAuditAction('category_navigation', {
      'category.from': fromCategory,
      'category.to': toCategory,
    });
  }

  /**
   * Track item submission
   */
  trackItemSubmission(itemId, status) {
    this.trackAuditAction('item_submission', {
      'item.id': itemId,
      'submission.status': status,
    });
  }

  /**
   * Track data sync
   */
  trackDataSync(itemCount, duration) {
    this.trackAuditAction('data_sync', {
      'sync.item_count': itemCount,
      'sync.duration_ms': duration,
    });
  }
}

// Create and export global instance
let tracer = null;

export function initTracing(options = {}) {
  tracer = new MobileTracer(options);
  console.log('📱 Mobile tracing initialized');
  return tracer;
}

export function getTracer() {
  if (!tracer) {
    tracer = new MobileTracer();
  }
  return tracer;
}
