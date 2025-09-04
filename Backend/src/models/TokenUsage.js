const pool = require('../config/database');

class TokenUsage {
  // Create a new token usage record
  static async recordUsage(userId, operation, tokensUsed, metadata = {}) {
    const query = `
      INSERT INTO token_usage (user_id, operation_type, tokens_used, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, operation_type, tokens_used, metadata, created_at
    `;
    const values = [userId, operation, tokensUsed, JSON.stringify(metadata)];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Get current total usage for a user
  static async getCurrentUsage(userId) {
    const query = `
      SELECT COALESCE(SUM(tokens_used), 0) as total_tokens
      FROM token_usage
      WHERE user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].total_tokens);
  }

  // Get token usage history for a user with pagination
  static async getUsageHistory(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT id, operation_type, tokens_used, metadata, created_at
      FROM token_usage
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [userId, limit, offset]);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM token_usage
      WHERE user_id = $1
    `;
    const countResult = await pool.query(countQuery, [userId]);
    
    return {
      history: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
    };
  }

  // Reset token count for a user
  static async resetTokens(userId) {
    const deleteQuery = `
      DELETE FROM token_usage
      WHERE user_id = $1
    `;
    await pool.query(deleteQuery, [userId]);
    
    // Record the reset action
    await this.recordUsage(userId, 'reset', 0, { 
      action: 'tokens_reset', 
      reset_at: new Date().toISOString() 
    });
    
    return { success: true, message: 'Token count reset successfully' };
  }

  // Get usage statistics by operation type
  static async getUsageByOperation(userId) {
    const query = `
      SELECT 
        operation_type,
        COUNT(*) as operation_count,
        SUM(tokens_used) as total_tokens,
        AVG(tokens_used) as avg_tokens,
        MAX(created_at) as last_used
      FROM token_usage
      WHERE user_id = $1 AND operation_type != 'reset'
      GROUP BY operation_type
      ORDER BY total_tokens DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Get daily usage stats for the last 30 days
  static async getDailyUsageStats(userId, days = 30) {
    const query = `
      SELECT 
        DATE(created_at) as usage_date,
        SUM(tokens_used) as daily_tokens,
        COUNT(*) as daily_operations
      FROM token_usage
      WHERE user_id = $1 
        AND operation_type != 'reset'
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY usage_date DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
}

module.exports = TokenUsage;