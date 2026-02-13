const crypto = require('crypto');
const logger = require('../utils/logger');

const shouldLogRequests = () => {
  const explicit = String(process.env.LOG_REQUESTS || '').toLowerCase();
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return process.env.NODE_ENV === 'production';
};

const requestContext = (req, res, next) => {
  const incomingId = req.headers['x-request-id'];
  const requestId = typeof incomingId === 'string' && incomingId.trim()
    ? incomingId.trim()
    : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    if (!shouldLogRequests()) return;
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info('request', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
    });
  });

  next();
};

module.exports = requestContext;
