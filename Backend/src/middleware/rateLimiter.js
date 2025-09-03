const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Store for tracking custom limits per user
const userLimits = new Map();

class RateLimiter {
  /**
   * Create general API rate limiter
   */
  static createGeneralLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true, // Return rate limit info in headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      handler: (req, res) => {
        logger.security('Rate limit exceeded - general', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.originalUrl,
          method: req.method
        });
        
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: '15 minutes'
        });
      }
    });
  }

  /**
   * Create authentication rate limiter (stricter)
   */
  static createAuthLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 login attempts per 15 minutes
      skipSuccessfulRequests: true, // Don't count successful requests
      message: {
        error: 'Too many authentication attempts',
        message: 'Too many failed login attempts. Please try again later.',
        retryAfter: '15 minutes'
      },
      handler: (req, res) => {
        logger.security('Authentication rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.originalUrl,
          method: req.method,
          body: req.body.email ? { email: req.body.email } : {}
        });
        
        res.status(429).json({
          error: 'Too many authentication attempts',
          message: 'Too many failed login attempts. Please try again later.',
          retryAfter: '15 minutes'
        });
      }
    });
  }

  /**
   * Create file upload rate limiter
   */
  static createFileUploadLimiter() {
    return rateLimit({
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 10, // Limit to 10 file uploads per 10 minutes per IP
      message: {
        error: 'Too many file uploads',
        message: 'Upload rate limit exceeded. Please try again later.',
        retryAfter: '10 minutes'
      },
      handler: (req, res) => {
        logger.security('File upload rate limit exceeded', {
          ip: req.ip,
          userId: req.user ? req.user.id : 'anonymous',
          userAgent: req.get('User-Agent'),
          url: req.originalUrl
        });
        
        res.status(429).json({
          error: 'Too many file uploads',
          message: 'Upload rate limit exceeded. Please try again later.',
          retryAfter: '10 minutes'
        });
      }
    });
  }

  /**
   * Create file download rate limiter
   */
  static createFileDownloadLimiter() {
    return rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 50, // Limit to 50 downloads per 5 minutes per IP
      message: {
        error: 'Too many download requests',
        message: 'Download rate limit exceeded. Please try again later.',
        retryAfter: '5 minutes'
      },
      handler: (req, res) => {
        logger.security('File download rate limit exceeded', {
          ip: req.ip,
          userId: req.user ? req.user.id : 'anonymous',
          userAgent: req.get('User-Agent'),
          fileName: req.params.fileName
        });
        
        res.status(429).json({
          error: 'Too many download requests',
          message: 'Download rate limit exceeded. Please try again later.',
          retryAfter: '5 minutes'
        });
      }
    });
  }

  /**
   * Create password reset rate limiter
   */
  static createPasswordResetLimiter() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // Limit to 3 password reset attempts per hour per IP
      message: {
        error: 'Too many password reset attempts',
        message: 'Password reset rate limit exceeded. Please try again later.',
        retryAfter: '1 hour'
      },
      handler: (req, res) => {
        logger.security('Password reset rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          email: req.body.email
        });
        
        res.status(429).json({
          error: 'Too many password reset attempts',
          message: 'Password reset rate limit exceeded. Please try again later.',
          retryAfter: '1 hour'
        });
      }
    });
  }

  /**
   * Create API key request limiter
   */
  static createAPIKeyLimiter() {
    return rateLimit({
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      max: 5, // Limit to 5 API key requests per day per IP
      message: {
        error: 'Too many API key requests',
        message: 'API key request limit exceeded. Please try again tomorrow.',
        retryAfter: '24 hours'
      },
      handler: (req, res) => {
        logger.security('API key request rate limit exceeded', {
          ip: req.ip,
          userId: req.user ? req.user.id : 'anonymous',
          userAgent: req.get('User-Agent')
        });
        
        res.status(429).json({
          error: 'Too many API key requests',
          message: 'API key request limit exceeded. Please try again tomorrow.',
          retryAfter: '24 hours'
        });
      }
    });
  }

  /**
   * Custom middleware for per-user resource limits
   */
  static createUserResourceLimiter(resourceType, maxCount, windowMs) {
    return (req, res, next) => {
      if (!req.user) {
        return next(); // Skip if no authenticated user
      }

      const userId = req.user.id;
      const key = `${resourceType}_${userId}`;
      const now = Date.now();
      
      // Get or initialize user limit data
      let userData = userLimits.get(key) || { count: 0, resetTime: now + windowMs };
      
      // Reset counter if window expired
      if (now > userData.resetTime) {
        userData = { count: 0, resetTime: now + windowMs };
      }
      
      // Check if limit exceeded
      if (userData.count >= maxCount) {
        const remainingTime = Math.ceil((userData.resetTime - now) / 1000 / 60); // minutes
        
        logger.security(`User resource limit exceeded: ${resourceType}`, {
          userId,
          resourceType,
          count: userData.count,
          maxCount,
          remainingTime: `${remainingTime} minutes`
        });
        
        return res.status(429).json({
          error: 'Resource limit exceeded',
          message: `You have exceeded the ${resourceType} limit. Please try again in ${remainingTime} minutes.`,
          retryAfter: `${remainingTime} minutes`
        });
      }
      
      // Increment counter and update
      userData.count++;
      userLimits.set(key, userData);
      
      next();
    };
  }

  /**
   * Clean up expired user limits periodically
   */
  static startCleanupJob() {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [key, data] of userLimits.entries()) {
        if (now > data.resetTime) {
          userLimits.delete(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        logger.debug(`Cleaned up ${cleaned} expired user limits`);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Get current user limit status
   */
  static getUserLimitStatus(userId, resourceType) {
    const key = `${resourceType}_${userId}`;
    const userData = userLimits.get(key);
    
    if (!userData) {
      return { count: 0, remaining: 0, resetTime: null };
    }
    
    const now = Date.now();
    if (now > userData.resetTime) {
      return { count: 0, remaining: 0, resetTime: null };
    }
    
    return {
      count: userData.count,
      remaining: Math.max(0, userData.resetTime - now),
      resetTime: userData.resetTime
    };
  }
}

// Start the cleanup job
RateLimiter.startCleanupJob();

module.exports = RateLimiter;