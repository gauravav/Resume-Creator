require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./utils/logger');
const ErrorHandler = require('./utils/errorHandler');
const RateLimiter = require('./middleware/rateLimiter');

const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const jobRoutes = require('./routes/jobs');
const rewriteRoutes = require('./routes/rewrite');
const tokenRoutes = require('./routes/token');
const adminRoutes = require('./routes/admin');
const accountRoutes = require('./routes/account');
const { initializeBucket } = require('./config/minio');
const { initializeDatabase, checkDatabaseConnection } = require('./config/dbInit');
const emailService = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 3200;

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001', 'http://143.198.11.73:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Apply general rate limiting
app.use(RateLimiter.createGeneralLimiter());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request ID and access logging middleware
app.use((req, res, next) => {
  const requestId = require('crypto').randomBytes(16).toString('hex');
  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.access(req, res, { responseTime, requestId });
  });
  
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/rewrite', rewriteRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/account', accountRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  ErrorHandler.handleError(err, req, res, next);
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const startServer = async () => {
  try {
    // Initialize database first
    await checkDatabaseConnection();
    await initializeDatabase();
    
    // Then initialize MinIO
    await initializeBucket();
    
    const server = app.listen(PORT, async () => {
      logger.info(`Server started successfully on port ${PORT}`, {
        port: PORT,
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });

      // Log LLM configuration
      const llmProvider = process.env.LLM_PROVIDER || 'local';
      if (llmProvider === 'cloud') {
        const geminiModel = process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash-lite';
        logger.info(`🤖 LLM Provider: Gemini Cloud (${geminiModel})`, {
          provider: 'cloud',
          model: geminiModel,
          service: 'Gemini API'
        });
      } else {
        const lmStudioModel = process.env.LLM_MODEL_NAME || 'deepseek-r1-distill-qwen-32b';
        const lmStudioUrl = process.env.LLM_API_URL || 'http://localhost:1234/v1';
        logger.info(`🤖 LLM Provider: LM Studio Local (${lmStudioModel})`, {
          provider: 'local',
          model: lmStudioModel,
          url: lmStudioUrl,
          service: 'LM Studio'
        });
      }

      // Send startup notification email
      try {
        const result = await emailService.sendServerStartupNotification(PORT, process.env.NODE_ENV);
        if (result.success) {
          logger.info('✅ Server startup notification email sent successfully');
        } else {
          logger.warn('⚠️ Server startup notification email failed to send', {
            error: result.error
          });
        }
      } catch (error) {
        logger.warn('⚠️ Server startup notification error (non-critical)', {
          error: error.message
        });
      }
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', {
        reason: reason.toString(),
        promise: promise.toString()
      });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

startServer();