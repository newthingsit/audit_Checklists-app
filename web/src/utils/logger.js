/**
 * Frontend logger — guards console output behind environment checks.
 * In production builds (process.env.NODE_ENV === 'production') only
 * warn and error are emitted; info/debug/log are silenced.
 *
 * Usage:
 *   import logger from '../utils/logger';
 *   logger.info('loaded', data);   // dev only
 *   logger.error('fail', err);     // always
 */

const isProd = process.env.NODE_ENV === 'production';

const noop = () => {};

const logger = {
  log: isProd ? noop : console.log.bind(console),
  info: isProd ? noop : console.log.bind(console, '[INFO]'),
  debug: isProd ? noop : console.debug.bind(console, '[DEBUG]'),
  warn: console.warn.bind(console, '[WARN]'),
  error: console.error.bind(console, '[ERROR]'),
};

export default logger;
