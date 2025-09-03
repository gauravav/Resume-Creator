const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDirectory = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
    
    // Different log levels
    this.levels = {
      ERROR: 'ERROR',
      WARN: 'WARN',
      INFO: 'INFO',
      DEBUG: 'DEBUG'
    };

    // Log files for different types
    this.logFiles = {
      error: path.join(this.logDirectory, 'error.log'),
      security: path.join(this.logDirectory, 'security.log'),
      access: path.join(this.logDirectory, 'access.log'),
      application: path.join(this.logDirectory, 'application.log')
    };
  }

  ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logDirectory)) {
        fs.mkdirSync(this.logDirectory, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  formatLogEntry(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const sanitizedMessage = this.sanitizeMessage(message);
    
    const logEntry = {
      timestamp,
      level,
      message: sanitizedMessage,
      ...metadata
    };

    return JSON.stringify(logEntry) + '\n';
  }

  sanitizeMessage(message) {
    if (typeof message !== 'string') {
      message = JSON.stringify(message);
    }
    
    // Remove sensitive data patterns
    return message
      .replace(/password[\"']?\s*[:=]\s*[\"']?[^,\s}\"']+/gi, 'password: [REDACTED]')
      .replace(/token[\"']?\s*[:=]\s*[\"']?[^,\s}\"']+/gi, 'token: [REDACTED]')
      .replace(/secret[\"']?\s*[:=]\s*[\"']?[^,\s}\"']+/gi, 'secret: [REDACTED]')
      .replace(/authorization:\s*bearer\s+[^\s]+/gi, 'authorization: Bearer [REDACTED]')
      .replace(/jwt[\"']?\s*[:=]\s*[\"']?[^,\s}\"']+/gi, 'jwt: [REDACTED]');
  }

  writeToFile(filename, content) {
    try {
      fs.appendFileSync(filename, content, 'utf8');
    } catch (error) {
      console.error(`Failed to write to log file ${filename}:`, error);
    }
  }

  error(message, metadata = {}) {
    const logEntry = this.formatLogEntry(this.levels.ERROR, message, metadata);
    this.writeToFile(this.logFiles.error, logEntry);
    this.writeToFile(this.logFiles.application, logEntry);
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[ERROR] ${message}`, metadata);
    }
  }

  warn(message, metadata = {}) {
    const logEntry = this.formatLogEntry(this.levels.WARN, message, metadata);
    this.writeToFile(this.logFiles.application, logEntry);
    
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[WARN] ${message}`, metadata);
    }
  }

  info(message, metadata = {}) {
    const logEntry = this.formatLogEntry(this.levels.INFO, message, metadata);
    this.writeToFile(this.logFiles.application, logEntry);
    
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[INFO] ${message}`, metadata);
    }
  }

  debug(message, metadata = {}) {
    if (process.env.NODE_ENV === 'development') {
      const logEntry = this.formatLogEntry(this.levels.DEBUG, message, metadata);
      this.writeToFile(this.logFiles.application, logEntry);
      console.debug(`[DEBUG] ${message}`, metadata);
    }
  }

  security(message, metadata = {}) {
    const logEntry = this.formatLogEntry('SECURITY', message, metadata);
    this.writeToFile(this.logFiles.security, logEntry);
    this.writeToFile(this.logFiles.application, logEntry);
    
    console.warn(`[SECURITY] ${message}`, metadata);
  }

  access(req, res, metadata = {}) {
    const userId = req.user ? req.user.id : 'anonymous';
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';
    
    const accessLog = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      userId,
      ip,
      userAgent,
      responseTime: metadata.responseTime || 0,
      ...metadata
    };

    const logEntry = this.formatLogEntry('ACCESS', 'Request processed', accessLog);
    this.writeToFile(this.logFiles.access, logEntry);
  }

  // Log authentication events
  authEvent(event, userId, metadata = {}) {
    this.security(`Authentication event: ${event}`, {
      userId,
      ...metadata
    });
  }

  // Log file operation events
  fileEvent(event, userId, fileName, metadata = {}) {
    this.security(`File operation: ${event}`, {
      userId,
      fileName,
      ...metadata
    });
  }

  // Log database events
  dbEvent(event, metadata = {}) {
    this.info(`Database event: ${event}`, metadata);
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;