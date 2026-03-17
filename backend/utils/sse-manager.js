/**
 * Server-Sent Events (SSE) Manager
 * Manages SSE connections for real-time audit updates.
 * Clients subscribe per userId; events are broadcast to relevant users.
 */
const logger = require('./logger');
const {
  setSseActiveConnections,
  recordSseEventsSent,
} = require('./metrics');

class SSEManager {
  constructor() {
    // Map<userId, Set<response>>
    this.clients = new Map();
    // Heartbeat every 30 seconds to keep connections alive
    this.heartbeatInterval = setInterval(() => this._sendHeartbeats(), 30000);
  }

  /**
   * Register an SSE client connection
   * @param {number} userId 
   * @param {object} res - Express response object
   */
  addClient(userId, res) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(res);
    setSseActiveConnections(this._totalClients());
    logger.info(`[SSE] Client connected for user ${userId}. Total connections: ${this._totalClients()}`);
  }

  /**
   * Remove an SSE client connection
   * @param {number} userId 
   * @param {object} res 
   */
  removeClient(userId, res) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(res);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
    setSseActiveConnections(this._totalClients());
    logger.info(`[SSE] Client disconnected for user ${userId}. Total connections: ${this._totalClients()}`);
  }

  /**
   * Send an event to a specific user
   * @param {number} userId 
   * @param {string} eventType - e.g. 'audit_scheduled', 'audit_completed', 'audit_updated'
   * @param {object} data 
   */
  sendToUser(userId, eventType, data = {}) {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) return;

    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    const deadClients = [];
    let sentCount = 0;

    for (const res of userClients) {
      try {
        res.write(payload);
        sentCount += 1;
      } catch (err) {
        logger.warn(`[SSE] Failed to send to user ${userId}, removing dead client`);
        deadClients.push(res);
      }
    }

    if (sentCount > 0) {
      recordSseEventsSent(eventType, sentCount);
    }

    // Cleanup dead clients
    for (const res of deadClients) {
      userClients.delete(res);
    }
    if (userClients.size === 0) {
      this.clients.delete(userId);
    }
    setSseActiveConnections(this._totalClients());
  }

  /**
   * Broadcast an event to multiple users
   * @param {number[]} userIds 
   * @param {string} eventType 
   * @param {object} data 
   */
  sendToUsers(userIds, eventType, data = {}) {
    for (const userId of userIds) {
      this.sendToUser(userId, eventType, data);
    }
  }

  /**
   * Broadcast to ALL connected clients (e.g. for admin-level events)
   * @param {string} eventType 
   * @param {object} data 
   */
  broadcast(eventType, data = {}) {
    for (const [userId] of this.clients) {
      this.sendToUser(userId, eventType, data);
    }
  }

  /** Send heartbeat to all clients to keep connections alive */
  _sendHeartbeats() {
    const payload = `: heartbeat\n\n`;
    for (const [userId, userClients] of this.clients) {
      const deadClients = [];
      for (const res of userClients) {
        try {
          res.write(payload);
        } catch (err) {
          deadClients.push(res);
        }
      }
      for (const res of deadClients) {
        userClients.delete(res);
      }
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
    setSseActiveConnections(this._totalClients());
  }

  _totalClients() {
    let total = 0;
    for (const [, clients] of this.clients) {
      total += clients.size;
    }
    return total;
  }

  /** Cleanup on server shutdown */
  shutdown() {
    clearInterval(this.heartbeatInterval);
    for (const [, userClients] of this.clients) {
      for (const res of userClients) {
        try { res.end(); } catch (e) { /* ignore */ }
      }
    }
    this.clients.clear();
    setSseActiveConnections(0);
  }
}

// Singleton instance
const sseManager = new SSEManager();

module.exports = sseManager;
