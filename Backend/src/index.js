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
const { initializeBucket } = require('./config/minio');
const { initializeDatabase, checkDatabaseConnection } = require('./config/dbInit');

const app = express();
const PORT = process.env.PORT || 3200;

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
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
    
    const server = app.listen(PORT, () => {
      logger.info(`Server started successfully on port ${PORT}`, {
        port: PORT,
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
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