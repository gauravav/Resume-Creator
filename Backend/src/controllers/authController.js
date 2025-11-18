const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { registerSchema, loginSchema } = require('../utils/validation');
const logger = require('../utils/logger');
const ErrorHandler = require('../utils/errorHandler');
const emailService = require('../services/emailService');

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '6h' });
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

const generateTokens = (userId) => {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken();
  return { accessToken, refreshToken };
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
      await emailService.sendVerificationEmail(email, user.email_verification_token, firstName, req);
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

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token in database with 1 day expiry
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 1); // 1 day from now
    await User.updateRefreshToken(user.id, refreshToken, refreshTokenExpiry);

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
      accessToken,
      refreshToken,
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
      verifiedUser.id,
      req
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

const resendVerificationEmail = ErrorHandler.asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw ErrorHandler.invalidInput('Email address is required');
  }

  try {
    // Generate new verification token
    const user = await User.generateNewVerificationToken(email);

    // Send new verification email
    await emailService.sendVerificationEmail(
      user.email,
      user.email_verification_token,
      user.first_name,
      req
    );

    logger.info('Verification email resent successfully', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    });

    logger.authEvent('VERIFICATION_EMAIL_RESENT', user.id, {
      email: user.email,
      ip: req.ip
    });

    res.json({
      message: 'Verification email has been resent. Please check your inbox.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (error) {
    if (error.message === 'User not found') {
      logger.security('Resend verification attempt with non-existent email', {
        email,
        ip: req.ip
      });
      throw ErrorHandler.createError('If an account with this email exists, a verification email has been sent.', 200, 'EMAIL_SENT');
    } else if (error.message === 'Email already verified') {
      logger.info('Resend verification attempt for already verified email', {
        email,
        ip: req.ip
      });
      throw ErrorHandler.createError('This email address is already verified.', 400, 'ALREADY_VERIFIED');
    }

    logger.error('Failed to resend verification email', {
      email,
      error: error.message,
      ip: req.ip
    });
    throw ErrorHandler.createError('Failed to resend verification email. Please try again later.', 500, 'RESEND_FAILED');
  }
});

const refreshToken = ErrorHandler.asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw ErrorHandler.invalidInput('Refresh token is required');
  }

  try {
    // Find user by refresh token
    const user = await User.findByRefreshToken(refreshToken);

    if (!user) {
      logger.security('Invalid refresh token attempt', {
        ip: req.ip
      });
      throw ErrorHandler.createError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Check if refresh token has expired
    const now = new Date();
    if (user.refresh_token_expires < now) {
      // Clear expired refresh token
      await User.clearRefreshToken(user.id);

      logger.security('Expired refresh token attempt', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });
      throw ErrorHandler.createError('Refresh token has expired. Please log in again.', 401, 'REFRESH_TOKEN_EXPIRED');
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);

    // Update refresh token in database
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 1); // 1 day from now
    await User.updateRefreshToken(user.id, newRefreshToken, refreshTokenExpiry);

    logger.info('Access token refreshed successfully', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    });

    logger.authEvent('TOKEN_REFRESH_SUCCESS', user.id, {
      email: user.email,
      ip: req.ip
    });

    res.json({
      message: 'Token refreshed successfully',
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error('Token refresh failed', {
      error: error.message,
      ip: req.ip
    });
    throw error;
  }
});

const logout = ErrorHandler.asyncHandler(async (req, res) => {
  try {
    // Clear refresh token from database
    await User.clearRefreshToken(req.user.id);

    logger.info('User logged out successfully', {
      userId: req.user.id,
      email: req.user.email,
      ip: req.ip
    });

    logger.authEvent('LOGOUT_SUCCESS', req.user.id, {
      email: req.user.email,
      ip: req.ip
    });

    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout failed', {
      userId: req.user.id,
      error: error.message,
      ip: req.ip
    });
    throw ErrorHandler.createError('Logout failed. Please try again.', 500, 'LOGOUT_FAILED');
  }
});

module.exports = {
  register,
  login,
  getMe,
  validateToken,
  verifyEmail,
  resendVerificationEmail,
  refreshToken,
  logout,
};