const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const tokenController = require('../controllers/tokenController');

// Get current token usage for authenticated user
router.get('/usage', auth, tokenController.getCurrentUsage);

// Get token usage history with pagination
router.get('/history', auth, tokenController.getTokenHistory);

// Reset token count for authenticated user
router.post('/reset', auth, tokenController.resetTokenCount);

// Get detailed usage statistics
router.get('/stats', auth, tokenController.getUsageStats);

module.exports = router;