const logger = require('../utils/logger');

class SSEManager {
  constructor() {
    // Map of userId -> array of response objects
    this.clients = new Map();
    // Map of response -> heartbeat interval
    this.heartbeats = new Map();
  }

  /**
   * Add a new SSE client connection
   * @param {number} userId - The user ID
   * @param {object} res - Express response object
   */
  addClient(userId, res) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, []);
    }

    this.clients.get(userId).push(res);

    logger.info('SSE client connected', {
      userId,
      totalClients: this.clients.get(userId).length
    });

    // Note: Headers are already set in the controller
    // Send initial connection event
    this.sendToClient(res, {
      type: 'connected',
      message: 'SSE connection established'
    });

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(heartbeat);
        this.heartbeats.delete(res);
        return;
      }
      try {
        res.write(': heartbeat\n\n');
      } catch (error) {
        clearInterval(heartbeat);
        this.heartbeats.delete(res);
        logger.error('Failed to send heartbeat', { error: error.message });
      }
    }, 30000);

    // Store heartbeat interval for cleanup
    this.heartbeats.set(res, heartbeat);

    // Handle client disconnect
    res.on('close', () => {
      clearInterval(heartbeat);
      this.heartbeats.delete(res);
      this.removeClient(userId, res);
    });
  }

  /**
   * Remove a client connection
   * @param {number} userId - The user ID
   * @param {object} res - Express response object to remove
   */
  removeClient(userId, res) {
    if (!this.clients.has(userId)) return;

    const userClients = this.clients.get(userId);
    const index = userClients.indexOf(res);

    if (index !== -1) {
      userClients.splice(index, 1);
      logger.info('SSE client disconnected', {
        userId,
        remainingClients: userClients.length
      });
    }

    // Remove user entry if no more clients
    if (userClients.length === 0) {
      this.clients.delete(userId);
    }
  }

  /**
   * Send event to a specific client
   * @param {object} res - Express response object
   * @param {object} data - Data to send
   */
  sendToClient(res, data) {
    if (res.writableEnded) return;

    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      logger.error('Failed to send SSE to client', { error: error.message });
    }
  }

  /**
   * Broadcast PDF status update to all user's connected clients
   * @param {number} userId - The user ID
   * @param {object} pdfUpdate - PDF update data
   */
  broadcastPDFUpdate(userId, pdfUpdate) {
    const userClients = this.clients.get(userId);

    if (!userClients || userClients.length === 0) {
      logger.debug('No SSE clients connected for user', { userId });
      return;
    }

    logger.info('Broadcasting PDF update via SSE', {
      userId,
      resumeId: pdfUpdate.resumeId,
      status: pdfUpdate.status,
      clientCount: userClients.length
    });

    const eventData = {
      type: 'pdf_status_update',
      ...pdfUpdate
    };

    userClients.forEach(res => {
      this.sendToClient(res, eventData);
    });
  }

  /**
   * Get count of connected clients for a user
   * @param {number} userId - The user ID
   * @returns {number} Number of connected clients
   */
  getClientCount(userId) {
    return this.clients.get(userId)?.length || 0;
  }

  /**
   * Get total number of connected clients across all users
   * @returns {number} Total number of connected clients
   */
  getTotalClientCount() {
    let total = 0;
    for (const clients of this.clients.values()) {
      total += clients.length;
    }
    return total;
  }
}

// Singleton instance
const sseManager = new SSEManager();

module.exports = sseManager;
