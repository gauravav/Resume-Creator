const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { registerSchema, loginSchema } = require('../utils/validation');
const logger = require('../utils/logger');
const ErrorHandler = require('../utils/errorHandler');
const emailService = require('../services/emailService');

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
    const isSuperAdmin = email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
    
    if (!isSuperAdmin) {
      // Send verification email for regular users only
      await emailService.sendVerificationEmail(email, user.email_verification_token, firstName);
    }

    logger.info(isSuperAdmin ? 'Super admin registered successfully' : 'User registered successfully, verification email sent', {
      userId: user.id,
      email: user.email,
      isSuperAdmin,
      ip: req.ip
    });

    logger.authEvent('REGISTRATION_SUCCESS', user.id, {
      email: user.email,
      isSuperAdmin,
      ip: req.ip
    });

    const message = isSuperAdmin 
      ? 'Super admin registration successful! You can now log in immediately.'
      : 'Registration successful! Please check your email to verify your account.';

    res.status(201).json({
      message,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        accountStatus: user.account_status,
        emailVerified: user.email_verified || false,
        adminApproved: user.admin_approved || false
      }
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

    const isSuperAdmin = email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();

    // Skip verification and approval checks for super admin
    if (!isSuperAdmin) {
      // Check email verification
      if (!user.email_verified) {
        logger.security('Login attempt with unverified email', {
          userId: user.id,
          email,
          ip: req.ip
        });
        throw ErrorHandler.createError('Please verify your email address before logging in', 401, 'EMAIL_NOT_VERIFIED');
      }

      // Check admin approval
      if (!user.admin_approved) {
        logger.security('Login attempt without admin approval', {
          userId: user.id,
          email,
          ip: req.ip,
          accountStatus: user.account_status
        });
        
        if (user.account_status === 'rejected') {
          throw ErrorHandler.createError('Your account application has been rejected', 401, 'ACCOUNT_REJECTED');
        }
        
        throw ErrorHandler.createError('Your account is pending admin approval', 401, 'PENDING_APPROVAL');
      }
    }

    const token = generateToken(user.id);

    logger.info(isSuperAdmin ? 'Super admin login successful' : 'User login successful', {
      userId: user.id,
      email: user.email,
      isSuperAdmin,
      ip: req.ip
    });

    logger.authEvent('LOGIN_SUCCESS', user.id, {
      email: user.email,
      isSuperAdmin,
      ip: req.ip
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isAdmin: isSuperAdmin,
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
    const user = await User.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isAdmin = user.email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        timezone: user.timezone || 'UTC',
        isAdmin: isAdmin,
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
    const user = await User.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isAdmin = user.email.toLowerCase() === 'avulagaurav@gmail.com';
    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        timezone: user.timezone || 'UTC',
        isAdmin: isAdmin,
      }
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const verifyEmail = ErrorHandler.asyncHandler(async (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    throw ErrorHandler.invalidInput('Verification token is required');
  }

  try {
    const user = await User.findByVerificationToken(token);
    if (!user) {
      logger.security('Invalid or expired verification token', {
        token,
        ip: req.ip
      });
      throw ErrorHandler.createError('Invalid or expired verification token', 400, 'INVALID_TOKEN');
    }

    const verifiedUser = await User.verifyEmail(user.id);
    
    // Send admin notification
    await emailService.sendAdminNotification(
      verifiedUser.email, 
      verifiedUser.first_name, 
      verifiedUser.last_name, 
      verifiedUser.id
    );

    logger.info('Email verified successfully', {
      userId: verifiedUser.id,
      email: verifiedUser.email,
      ip: req.ip
    });

    logger.authEvent('EMAIL_VERIFICATION_SUCCESS', verifiedUser.id, {
      email: verifiedUser.email,
      ip: req.ip
    });

    res.json({
      message: 'Email verified successfully! Your account is now pending admin approval.',
      user: {
        id: verifiedUser.id,
        email: verifiedUser.email,
        firstName: verifiedUser.first_name,
        lastName: verifiedUser.last_name,
        emailVerified: verifiedUser.email_verified,
        accountStatus: verifiedUser.account_status
      }
    });
  } catch (error) {
    logger.error('Email verification failed', {
      token,
      error: error.message,
      ip: req.ip
    });
    throw error;
  }
});

module.exports = {
  register,
  login,
  getMe,
  validateToken,
  verifyEmail,
};