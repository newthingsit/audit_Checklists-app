const client = require('prom-client');
const logger = require('./logger');

const registry = new client.Registry();

client.collectDefaultMetrics({
  register: registry,
  prefix: 'audit_',
});

const httpDuration = new client.Histogram({
  name: 'audit_http_request_duration_ms',
  help: 'HTTP request duration in ms',
  labelNames: ['method', 'route', 'status'],
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
});

const sseActiveConnections = new client.Gauge({
  name: 'audit_sse_active_connections',
  help: 'Current number of active SSE client connections',
});

const sseEventsSent = new client.Counter({
  name: 'audit_sse_events_sent_total',
  help: 'Total SSE events successfully sent to clients',
  labelNames: ['event_type'],
});

const sseConnectionAttempts = new client.Counter({
  name: 'audit_sse_connection_attempts_total',
  help: 'Total SSE connection attempts by result',
  labelNames: ['result'],
});

registry.registerMetric(httpDuration);
registry.registerMetric(sseActiveConnections);
registry.registerMetric(sseEventsSent);
registry.registerMetric(sseConnectionAttempts);

const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    try {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const route = req.route?.path || req.path || 'unknown';
      httpDuration.observe({
        method: req.method,
        route,
        status: res.statusCode,
      }, durationMs);
    } catch (error) {
      logger.warn('[Metrics] Failed to record http duration:', error.message);
    }
  });
  next();
};

const metricsHandler = async (req, res) => {
  res.setHeader('Content-Type', registry.contentType);
  res.end(await registry.metrics());
};

const setSseActiveConnections = (count) => {
  sseActiveConnections.set(Number(count) || 0);
};

const recordSseEventsSent = (eventType, count = 1) => {
  sseEventsSent.inc({ event_type: eventType || 'unknown' }, Math.max(0, Number(count) || 0));
};

const recordSseConnectionAttempt = (result) => {
  sseConnectionAttempts.inc({ result: result || 'unknown' });
};

module.exports = {
  registry,
  metricsMiddleware,
  metricsHandler,
  setSseActiveConnections,
  recordSseEventsSent,
  recordSseConnectionAttempt,
};
