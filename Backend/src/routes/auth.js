const express = require('express');
const { register, login, getMe, validateToken, verifyEmail, resendVerificationEmail } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const RateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// Apply auth-specific rate limiting
const authLimiter = RateLimiter.createAuthLimiter();

router.post('/register', authLimiter, register);
router.post('/signup', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerificationEmail);
router.get('/me', authenticateToken, getMe);
router.get('/validate', authenticateToken, validateToken);

module.exports = router;