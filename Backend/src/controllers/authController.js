const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { registerSchema, loginSchema } = require('../utils/validation');
const logger = require('../utils/logger');
const ErrorHandler = require('../utils/errorHandler');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

const register = ErrorHandler.asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    logger.warn('Registration validation failed', {
      error: error.details[0].message,
      ip: req.ip
    });
    throw ErrorHandler.invalidInput(error.details[0].message);
  }

  const { email, password, firstName, lastName } = value;

  try {
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      logger.security('Registration attempt with existing email', {
        email,
        ip: req.ip
      });
      throw ErrorHandler.createError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    const user = await User.createUser(email, password, firstName, lastName);
    const token = generateToken(user.id);

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    });

    logger.authEvent('REGISTRATION_SUCCESS', user.id, {
      email: user.email,
      ip: req.ip
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      token,
    });
  } catch (dbError) {
    // Handle database-specific errors
    if (dbError.code === '42P01') { // Table does not exist
      logger.error('Database table missing during registration', {
        error: dbError.message,
        email,
        ip: req.ip
      });
      throw ErrorHandler.createError('Service temporarily unavailable. Please try again later.', 503, 'DATABASE_ERROR');
    } else if (dbError.code === 'ECONNREFUSED') {
      logger.error('Database connection refused during registration', {
        error: dbError.message,
        ip: req.ip
      });
      throw ErrorHandler.createError('Service temporarily unavailable. Please try again later.', 503, 'DATABASE_CONNECTION_ERROR');
    } else if (dbError.code === '23505') { // Unique violation
      logger.security('Registration attempt with existing email (DB constraint)', {
        email,
        ip: req.ip
      });
      throw ErrorHandler.createError('Email already registered', 409, 'EMAIL_EXISTS');
    }
    // Re-throw if it's already an ErrorHandler error
    throw dbError;
  }
});

const login = ErrorHandler.asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    logger.warn('Login validation failed', {
      error: error.details[0].message,
      ip: req.ip
    });
    throw ErrorHandler.invalidInput(error.details[0].message);
  }

  const { email, password } = value;

  try {
    const user = await User.findByEmail(email);
    if (!user) {
      logger.security('Login attempt with non-existent email', {
        email,
        ip: req.ip
      });
      throw ErrorHandler.createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const isValidPassword = await User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      logger.security('Login attempt with invalid password', {
        userId: user.id,
        email,
        ip: req.ip
      });
      throw ErrorHandler.createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const token = generateToken(user.id);

    logger.info('User login successful', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    });

    logger.authEvent('LOGIN_SUCCESS', user.id, {
      email: user.email,
      ip: req.ip
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      token,
    });
  } catch (dbError) {
    // Handle database-specific errors
    if (dbError.code === '42P01') { // Table does not exist
      logger.error('Database table missing during login', {
        error: dbError.message,
        email,
        ip: req.ip
      });
      throw ErrorHandler.createError('Service temporarily unavailable. Please try again later.', 503, 'DATABASE_ERROR');
    } else if (dbError.code === 'ECONNREFUSED') {
      logger.error('Database connection refused during login', {
        error: dbError.message,
        ip: req.ip
      });
      throw ErrorHandler.createError('Service temporarily unavailable. Please try again later.', 503, 'DATABASE_CONNECTION_ERROR');
    }
    // Re-throw if it's already an ErrorHandler error
    throw dbError;
  }
});

const getMe = async (req, res) => {
  try {
    const user = req.user;
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const validateToken = async (req, res) => {
  try {
    // If we reach here, the token is valid (middleware passed)
    res.json({
      valid: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.first_name,
        lastName: req.user.last_name,
      }
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  validateToken,
};