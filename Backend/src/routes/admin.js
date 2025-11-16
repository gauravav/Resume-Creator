const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  requireAdmin,
  getDashboardStats,
  getAllUsers,
  getUserTokenHistory,
  approveUser,
  rejectUser,
  resetUserTokens,
  getAdminActions,
  deleteUser
} = require('../controllers/adminController');

const router = express.Router();

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/users/:userId/tokens', getUserTokenHistory);
router.get('/actions', getAdminActions);

// User management routes
router.post('/users/:userId/approve', approveUser);
router.post('/users/:userId/reject', rejectUser);
router.post('/users/:userId/reset-tokens', resetUserTokens);
router.delete('/users/:userId', deleteUser);

module.exports = router;