const logger = require('./logger');

class ErrorHandler {
  /**
   * Handle different types of errors and provide appropriate responses
   * @param {Error} error - The error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static handleError(error, req, res, next) {
    // Log the error with context
    logger.error('Unhandled error occurred', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      userId: req.user ? req.user.id : 'anonymous',
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Determine error type and respond appropriately
    if (error.name === 'ValidationError') {
      return this.handleValidationError(error, res);
    }

    if (error.name === 'UnauthorizedError' || error.message.includes('jwt')) {
      return this.handleAuthError(error, res);
    }

    if (error.code && error.code.startsWith('23')) { // PostgreSQL constraint errors
      return this.handleDatabaseError(error, res);
    }

    if (error.name === 'MulterError') {
      return this.handleMulterError(error, res);
    }

    if (error.code === 'ENOENT' || error.code === 'NoSuchKey') {
      return this.handleNotFoundError(error, res);
    }

    // Default server error
    return this.handleGenericError(error, res);
  }

  static handleValidationError(error, res) {
    const message = process.env.NODE_ENV === 'production' ? 
      'Invalid input data' : 
      error.message;

    res.status(400).json({
      error: 'Validation Error',
      message,
      ...(process.env.NODE_ENV !== 'production' && { details: error.details })
    });
  }

  static handleAuthError(error, res) {
    logger.security('Authentication/Authorization error', {
      error: error.message,
      type: 'auth_error'
    });

    res.status(401).json({
      error: 'Authentication Failed',
      message: 'Invalid or expired credentials'
    });
  }

  static handleDatabaseError(error, res) {
    logger.error('Database error', {
      code: error.code,
      constraint: error.constraint,
      detail: error.detail
    });

    let message = 'Database operation failed';
    let statusCode = 500;

    if (error.code === '23505') { // Unique violation
      message = 'Resource already exists';
      statusCode = 409;
    } else if (error.code === '23503') { // Foreign key violation
      message = 'Referenced resource does not exist';
      statusCode = 400;
    } else if (error.code === '23502') { // Not null violation
      message = 'Required field is missing';
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: 'Database Error',
      message
    });
  }

  static handleMulterError(error, res) {
    let message = 'File upload error';
    let statusCode = 400;

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = 'File upload failed';
    }

    res.status(statusCode).json({
      error: 'Upload Error',
      message
    });
  }

  static handleNotFoundError(error, res) {
    res.status(404).json({
      error: 'Resource Not Found',
      message: 'The requested resource could not be found'
    });
  }

  static handleGenericError(error, res) {
    const statusCode = error.statusCode || error.status || 500;
    
    res.status(statusCode).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 
        'An unexpected error occurred' : 
        error.message,
      ...(process.env.NODE_ENV !== 'production' && { 
        requestId: res.locals.requestId || 'unknown' 
      })
    });
  }

  /**
   * Async error handler wrapper for route handlers
   * @param {Function} fn - Async route handler function
   * @returns {Function} - Wrapped function with error handling
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Create a standardized API error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode - Application error code
   * @returns {Error} - Standardized error object
   */
  static createError(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.errorCode = errorCode;
    return error;
  }

  /**
   * Validate required fields and throw error if missing
   * @param {Object} data - Data object to validate
   * @param {Array} requiredFields - Array of required field names
   * @throws {Error} - Validation error if fields are missing
   */
  static validateRequiredFields(data, requiredFields) {
    const missing = requiredFields.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw this.createError(
        `Missing required fields: ${missing.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  /**
   * Rate limit exceeded error
   */
  static rateLimitExceeded() {
    return this.createError(
      'Rate limit exceeded. Please try again later.',
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  }

  /**
   * Access denied error
   */
  static accessDenied(reason = 'Insufficient permissions') {
    return this.createError(reason, 403, 'ACCESS_DENIED');
  }

  /**
   * Resource not found error
   */
  static notFound(resource = 'Resource') {
    return this.createError(`${resource} not found`, 404, 'NOT_FOUND');
  }

  /**
   * Invalid input error
   */
  static invalidInput(message = 'Invalid input provided') {
    return this.createError(message, 400, 'INVALID_INPUT');
  }
}

module.exports = ErrorHandler;