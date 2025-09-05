const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
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
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authenticateToken };