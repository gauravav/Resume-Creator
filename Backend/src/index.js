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
const latexRoutes = require('./routes/latex');
const tutorialRoutes = require('./routes/tutorial');
const { initializeBucket } = require('./config/minio');
const { initializeDatabase, checkDatabaseConnection } = require('./config/dbInit');
const migrationRunner = require('../migrations/migrationRunner');
const emailService = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 3200;

app.use(helmet());

// Dynamic CORS configuration to support localhost, network IPs, and production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Define allowed patterns
    const allowedPatterns = [
      /^http:\/\/localhost:300[01]$/,           // localhost:3000 or localhost:3001
      /^http:\/\/127\.0\.0\.1:300[01]$/,        // 127.0.0.1:3000 or 127.0.0.1:3001
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:300[01]$/, // 192.168.x.x:3000 or :3001
      /^http:\/\/172\.\d{1,3}\.\d{1,3}\.\d{1,3}:300[01]$/, // 172.x.x.x:3000 or :3001
      /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:300[01]$/, // 10.x.x.x:3000 or :3001
      /^http:\/\/143\.198\.11\.73:3000$/,       // Production server 1
      /^http:\/\/45\.55\.129\.63:3000$/,        // Production server 2
    ];

    const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn('CORS request from unauthorized origin', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

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
app.use('/api/latex', latexRoutes);
app.use('/api/tutorial', tutorialRoutes);

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
  const startupErrors = [];
  let dbConnected = false;
  let dbInitialized = false;
  let migrationsRun = false;
  let minioConnected = false;

  try {
    // Step 1: Check database connection
    logger.info('🔍 Step 1/4: Checking database connection...');
    try {
      await checkDatabaseConnection();
      dbConnected = true;
      logger.info('✅ Database connection successful');
    } catch (error) {
      startupErrors.push({
        step: 'Database Connection',
        error: error.message,
        critical: true
      });
      logger.error('❌ Database connection failed', { error: error.message });
      throw new Error('Database connection failed');
    }

    // Step 2: Initialize database (create tables)
    logger.info('🔍 Step 2/4: Initializing database schema...');
    try {
      await initializeDatabase();
      dbInitialized = true;
      logger.info('✅ Database schema initialized');
    } catch (error) {
      startupErrors.push({
        step: 'Database Initialization',
        error: error.message,
        critical: true
      });
      logger.error('❌ Database initialization failed', { error: error.message });
      throw new Error('Database initialization failed');
    }

    // Step 3: Run database migrations
    logger.info('🔍 Step 3/4: Running database migrations...');
    try {
      const migrationResult = await migrationRunner.runPendingMigrations();
      migrationsRun = true;

      if (migrationResult.executed > 0) {
        logger.info(`✅ Database migrations completed (${migrationResult.executed} executed, ${migrationResult.skipped} skipped)`);
      } else {
        logger.info('✅ Database is up to date - no migrations to run');
      }
    } catch (error) {
      startupErrors.push({
        step: 'Database Migrations',
        error: error.message,
        critical: true
      });
      logger.error('❌ Database migrations failed', { error: error.message });
      throw new Error('Database migrations failed');
    }

    // Step 4: Check MinIO connection
    logger.info('🔍 Step 4/4: Checking file storage (MinIO) connection...');
    try {
      await initializeBucket();
      minioConnected = true;
      logger.info('✅ File storage (MinIO) connected');
    } catch (error) {
      startupErrors.push({
        step: 'MinIO Connection',
        error: error.message,
        critical: true
      });
      logger.error('❌ File storage (MinIO) connection failed', { error: error.message });
      throw new Error('MinIO connection failed');
    }

    // All checks passed - start the server
    logger.info('🚀 All pre-flight checks passed. Starting server...');

    const server = app.listen(PORT, async () => {
      logger.info(`✅ Server started successfully on port ${PORT}`, {
        port: PORT,
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });

      // Log LLM configuration
      const llmProvider = process.env.LLM_PROVIDER || 'local';
      if (llmProvider === 'cloud') {
        const deepseekModel = process.env.DEEPSEEKER_MODEL || 'deepseek-chat';
        logger.info(`🤖 LLM Provider: DeepSeek Cloud (${deepseekModel})`, {
          provider: 'cloud',
          model: deepseekModel,
          service: 'DeepSeek API'
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

      // Send success startup notification email
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
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Terminate worker pools
          const LLMResumeParser = require('./utils/llmResumeParser');
          if (LLMResumeParser.textExtractionWorkerPool) {
            await LLMResumeParser.textExtractionWorkerPool.terminate();
          }
          logger.info('Worker pools terminated');
        } catch (error) {
          logger.error('Error terminating worker pools:', error);
        }

        logger.info('Process terminated');
        process.exit(0);
      });

      // Force shutdown after 30 seconds if graceful shutdown fails
      setTimeout(() => {
        logger.error('Graceful shutdown timeout, forcing exit');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

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
    logger.error('❌ Server startup failed', {
      error: error.message,
      stack: error.stack
    });

    // Send failure notification email
    try {
      const errorDetails = {
        databaseConnection: dbConnected ? 'Connected ✅' : 'Failed ❌',
        databaseInitialization: dbInitialized ? 'Initialized ✅' : 'Failed ❌',
        databaseMigrations: migrationsRun ? 'Completed ✅' : 'Failed ❌',
        fileStorage: minioConnected ? 'Connected ✅' : 'Failed ❌',
        errors: startupErrors.map(e => `${e.step}: ${e.error}`).join('\n'),
        timestamp: new Date().toISOString()
      };

      await emailService.sendServerStartupFailureNotification(PORT, process.env.NODE_ENV, errorDetails);
      logger.info('📧 Failure notification email sent');
    } catch (emailError) {
      logger.error('Failed to send failure notification email', {
        error: emailError.message
      });
    }

    // Don't start the server - exit with error code
    logger.error('🛑 Server startup aborted due to errors. Please fix the issues and restart.');
    process.exit(1);
  }
};

startServer();