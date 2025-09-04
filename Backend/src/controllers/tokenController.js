const TokenUsage = require('../models/TokenUsage');

const getCurrentUsage = async (req, res) => {
  try {
    const userId = req.user.id;
    const totalTokens = await TokenUsage.getCurrentUsage(userId);
    
    res.json({
      success: true,
      data: {
        totalTokens,
        userId
      }
    });
  } catch (error) {
    console.error('Get current usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current token usage'
    });
  }
};

const getTokenHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await TokenUsage.getUsageHistory(userId, page, limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get token history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get token usage history'
    });
  }
};

const resetTokenCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await TokenUsage.resetTokens(userId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Reset token count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset token count'
    });
  }
};

const getUsageStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get total usage
    const totalTokens = await TokenUsage.getCurrentUsage(userId);
    
    // Get usage by operation
    const operationStats = await TokenUsage.getUsageByOperation(userId);
    
    // Get daily stats for last 30 days
    const dailyStats = await TokenUsage.getDailyUsageStats(userId, 30);
    
    res.json({
      success: true,
      data: {
        totalTokens,
        operationStats,
        dailyStats
      }
    });
  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage statistics'
    });
  }
};

// Internal function to record token usage (called by other controllers)
const recordTokenUsage = async (userId, operation, tokensUsed, metadata = {}) => {
  try {
    const result = await TokenUsage.recordUsage(userId, operation, tokensUsed, metadata);
    return result;
  } catch (error) {
    console.error('Record token usage error:', error);
    throw error;
  }
};

module.exports = {
  getCurrentUsage,
  getTokenHistory,
  resetTokenCount,
  getUsageStats,
  recordTokenUsage
};