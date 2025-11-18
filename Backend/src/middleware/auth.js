const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      code: 'TOKEN_REQUIRED'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    // Skip verification checks for admin user
    const isAdminUser = user.email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();

    if (!isAdminUser) {
      // Check email verification for non-admin users
      if (!user.email_verified) {
        return res.status(401).json({
          error: 'Email not verified',
          code: 'EMAIL_NOT_VERIFIED'
        });
      }

      // Check admin approval for non-admin users
      if (!user.admin_approved) {
        return res.status(401).json({
          error: 'Account pending approval',
          code: 'PENDING_APPROVAL'
        });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    // Check if the error is specifically a token expiration error
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Access token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
};

module.exports = { authenticateToken };