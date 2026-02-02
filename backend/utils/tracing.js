/**
 * OpenTelemetry Tracing Setup for Audit App Backend
 * Configures distributed tracing to monitor API performance and errors
 */

const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { resourceFromAttributes, defaultResource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-node');
const { trace, context } = require('@opentelemetry/api');

/**
 * Initialize OpenTelemetry tracing
 * Must be called at the very beginning of the application
 * Returns true if successful, false if failed
 */
function initializeTracing() {
  try {
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
  
  // Create resource with service name and version
  const resource = defaultResource().merge(
    resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: 'audit-backend',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '2.0.0',
      environment: process.env.NODE_ENV || 'development',
    }),
  );

  // Create and register the trace provider
  // Set up OTLP exporter to send spans to the trace collector
  const otlpExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  });

  const tracerProvider = new NodeTracerProvider({
    resource: resource,
    spanProcessors: [new BatchSpanProcessor(otlpExporter)]
  });

  tracerProvider.register();

  // Register auto-instrumentations for common libraries
  registerInstrumentations({
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-express': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-http': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-knex': {
          enabled: false, // Not using Knex
        },
      }),
    ],
  });

  console.log(`🔍 OpenTelemetry initialized - tracing to ${otlpEndpoint}`);
  
  return tracerProvider;
  } catch (error) {
    console.error('❌ Failed to initialize OpenTelemetry:', error.message);
    return null;
  }
}

/**
 * Get a named tracer for creating spans in your application code
 */
function getTracer(name = 'audit-backend') {
  try {
    return trace.getTracer(name, '1.0.0');
  } catch (error) {
    console.warn('⚠️  Tracer not available:', error.message);
    return null;
  }
}

/**
 * Helper to wrap async operations with span context
 */
async function withSpan(spanName, attributes = {}, fn) {
  try {
    const tracer = getTracer();
    if (!tracer) {
      // Tracing not available, just execute the function
      return await fn();
    }
    
    const span = tracer.startSpan(spanName, { attributes });
  
    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await fn();
        span.setStatus({ code: 0 }); // OK
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: 2, message: error.message }); // ERROR
        throw error;
      } finally {
        span.end();
      }
    });
  } catch (error) {
    // If tracing fails, just execute the function without tracing
    console.warn('⚠️  Span creation failed:', error.message);
    return await fn();
  }
}

module.exports = {
  initializeTracing,
  getTracer,
  withSpan,
};
