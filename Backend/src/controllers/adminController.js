const User = require('../models/User');
const TokenUsage = require('../models/TokenUsage');
const AdminAction = require('../models/AdminAction');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const ErrorHandler = require('../utils/errorHandler');

const ADMIN_EMAIL = 'avulagaurav@gmail.com';

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  const user = req.user;
  if (!user || user.email !== ADMIN_EMAIL) {
    logger.security('Non-admin attempted to access admin endpoint', {
      userId: user ? user.id : null,
      email: user ? user.email : null,
      ip: req.ip,
      endpoint: req.originalUrl
    });
    throw ErrorHandler.createError('Admin access required', 403, 'ADMIN_ACCESS_REQUIRED');
  }
  next();
};

const getDashboardStats = ErrorHandler.asyncHandler(async (req, res) => {
  try {
    // Get pending approval users
    const pendingUsers = await User.getPendingApprovalUsers();
    
    // Get all users with stats
    const allUsers = await User.getAllUsersWithStats();
    
    // Calculate overview stats
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter(u => u.account_status === 'active').length;
    const pendingApproval = pendingUsers.length;
    const rejectedUsers = allUsers.filter(u => u.account_status === 'rejected').length;
    const totalTokensUsed = allUsers.reduce((sum, u) => sum + parseInt(u.total_tokens_used || 0), 0);
    
    // Get recent admin actions
    const recentActions = await AdminAction.getActionHistory(1, 10);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        pendingApproval,
        rejectedUsers,
        totalTokensUsed
      },
      pendingUsers,
      recentActions: recentActions.actions
    });

    logger.info('Admin dashboard stats retrieved', {
      adminEmail: req.user.email,
      totalUsers,
      pendingApproval,
      ip: req.ip
    });

  } catch (error) {
    logger.error('Error retrieving dashboard stats', {
      adminEmail: req.user.email,
      error: error.message,
      ip: req.ip
    });
    throw error;
  }
});

const getAllUsers = ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const users = await User.getAllUsersWithStats();
    
    res.json({
      users,
      total: users.length
    });

    logger.info('All users retrieved by admin', {
      adminEmail: req.user.email,
      userCount: users.length,
      ip: req.ip
    });

  } catch (error) {
    logger.error('Error retrieving all users', {
      adminEmail: req.user.email,
      error: error.message,
      ip: req.ip
    });
    throw error;
  }
});

const getUserTokenHistory = ErrorHandler.asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  try {
    const user = await User.getUserById(userId);
    if (!user) {
      throw ErrorHandler.createError('User not found', 404, 'USER_NOT_FOUND');
    }

    const tokenHistory = await TokenUsage.getUsageHistory(userId, parseInt(page), parseInt(limit));
    const usageByOperation = await TokenUsage.getUsageByOperation(userId);
    const dailyStats = await TokenUsage.getDailyUsageStats(userId, 30);
    const currentUsage = await TokenUsage.getCurrentUsage(userId);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        accountStatus: user.account_status
      },
      currentUsage,
      tokenHistory,
      usageByOperation,
      dailyStats
    });

    logger.info('User token history retrieved by admin', {
      adminEmail: req.user.email,
      targetUserId: userId,
      currentUsage,
      ip: req.ip
    });

  } catch (error) {
    logger.error('Error retrieving user token history', {
      adminEmail: req.user.email,
      targetUserId: userId,
      error: error.message,
      ip: req.ip
    });
    throw error;
  }
});

const approveUser = ErrorHandler.asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.getUserById(userId);
    if (!user) {
      throw ErrorHandler.createError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (user.account_status !== 'pending_approval') {
      throw ErrorHandler.createError('User is not pending approval', 400, 'INVALID_STATUS');
    }

    const approvedUser = await User.approveUser(userId, req.user.email);
    
    // Record admin action
    await AdminAction.recordAction(req.user.email, 'approve_user', userId, {
      previousStatus: user.account_status,
      newStatus: 'active'
    });

    // Send approval email to user
    await emailService.sendApprovalEmail(approvedUser.email, approvedUser.first_name, req);

    res.json({
      message: 'User approved successfully',
      user: {
        id: approvedUser.id,
        email: approvedUser.email,
        firstName: approvedUser.first_name,
        lastName: approvedUser.last_name,
        accountStatus: approvedUser.account_status,
        approvedAt: approvedUser.approved_at
      }
    });

    logger.info('User approved by admin', {
      adminEmail: req.user.email,
      approvedUserId: userId,
      approvedUserEmail: approvedUser.email,
      ip: req.ip
    });

  } catch (error) {
    logger.error('Error approving user', {
      adminEmail: req.user.email,
      targetUserId: userId,
      error: error.message,
      ip: req.ip
    });
    throw error;
  }
});

const rejectUser = ErrorHandler.asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  try {
    const user = await User.getUserById(userId);
    if (!user) {
      throw ErrorHandler.createError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (user.account_status !== 'pending_approval') {
      throw ErrorHandler.createError('User is not pending approval', 400, 'INVALID_STATUS');
    }

    const rejectedUser = await User.rejectUser(userId, req.user.email, reason);
    
    // Record admin action
    await AdminAction.recordAction(req.user.email, 'reject_user', userId, {
      previousStatus: user.account_status,
      newStatus: 'rejected',
      reason: reason
    });

    // Send rejection email to user
    await emailService.sendRejectionEmail(rejectedUser.email, rejectedUser.first_name, reason);

    res.json({
      message: 'User rejected successfully',
      user: {
        id: rejectedUser.id,
        email: rejectedUser.email,
        firstName: rejectedUser.first_name,
        lastName: rejectedUser.last_name,
        accountStatus: rejectedUser.account_status,
        rejectionReason: rejectedUser.rejection_reason
      }
    });

    logger.info('User rejected by admin', {
      adminEmail: req.user.email,
      rejectedUserId: userId,
      rejectedUserEmail: rejectedUser.email,
      reason: reason,
      ip: req.ip
    });

  } catch (error) {
    logger.error('Error rejecting user', {
      adminEmail: req.user.email,
      targetUserId: userId,
      error: error.message,
      ip: req.ip
    });
    throw error;
  }
});

const resetUserTokens = ErrorHandler.asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.getUserById(userId);
    if (!user) {
      throw ErrorHandler.createError('User not found', 404, 'USER_NOT_FOUND');
    }

    const currentUsage = await TokenUsage.getCurrentUsage(userId);
    await TokenUsage.resetTokens(userId);
    
    // Record admin action
    await AdminAction.recordAction(req.user.email, 'reset_tokens', userId, {
      previousTokenCount: currentUsage,
      newTokenCount: 0
    });

    res.json({
      message: 'User token count reset successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      previousTokenCount: currentUsage,
      newTokenCount: 0
    });

    logger.info('User tokens reset by admin', {
      adminEmail: req.user.email,
      targetUserId: userId,
      targetUserEmail: user.email,
      previousTokenCount: currentUsage,
      ip: req.ip
    });

  } catch (error) {
    logger.error('Error resetting user tokens', {
      adminEmail: req.user.email,
      targetUserId: userId,
      error: error.message,
      ip: req.ip
    });
    throw error;
  }
});

const getAdminActions = ErrorHandler.asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  try {
    const actions = await AdminAction.getActionHistory(parseInt(page), parseInt(limit));
    
    res.json(actions);

    logger.info('Admin action history retrieved', {
      adminEmail: req.user.email,
      page: parseInt(page),
      limit: parseInt(limit),
      ip: req.ip
    });

  } catch (error) {
    logger.error('Error retrieving admin actions', {
      adminEmail: req.user.email,
      error: error.message,
      ip: req.ip
    });
    throw error;
  }
});

module.exports = {
  requireAdmin,
  getDashboardStats,
  getAllUsers,
  getUserTokenHistory,
  approveUser,
  rejectUser,
  resetUserTokens,
  getAdminActions
};