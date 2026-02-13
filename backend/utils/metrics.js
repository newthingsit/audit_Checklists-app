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

registry.registerMetric(httpDuration);

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

module.exports = {
  registry,
  metricsMiddleware,
  metricsHandler,
};
