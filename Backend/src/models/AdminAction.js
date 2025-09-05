const pool = require('../config/database');

class AdminAction {
  static async recordAction(adminEmail, actionType, targetUserId, details = {}) {
    const query = `
      INSERT INTO admin_actions (admin_email, action_type, target_user_id, details)
      VALUES ($1, $2, $3, $4)
      RETURNING id, admin_email, action_type, target_user_id, details, created_at
    `;
    const values = [adminEmail, actionType, targetUserId, JSON.stringify(details)];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getActionHistory(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT 
        aa.id, aa.admin_email, aa.action_type, aa.target_user_id, aa.details, aa.created_at,
        u.first_name, u.last_name, u.email as target_user_email
      FROM admin_actions aa
      LEFT JOIN users u ON aa.target_user_id = u.id
      ORDER BY aa.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    
    // Get total count for pagination
    const countQuery = 'SELECT COUNT(*) as total FROM admin_actions';
    const countResult = await pool.query(countQuery);
    
    return {
      actions: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
    };
  }

  static async getActionsByAdmin(adminEmail, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT 
        aa.id, aa.admin_email, aa.action_type, aa.target_user_id, aa.details, aa.created_at,
        u.first_name, u.last_name, u.email as target_user_email
      FROM admin_actions aa
      LEFT JOIN users u ON aa.target_user_id = u.id
      WHERE aa.admin_email = $1
      ORDER BY aa.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [adminEmail, limit, offset]);
    
    // Get total count for pagination
    const countQuery = 'SELECT COUNT(*) as total FROM admin_actions WHERE admin_email = $1';
    const countResult = await pool.query(countQuery, [adminEmail]);
    
    return {
      actions: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
    };
  }

  static async getActionsByUser(targetUserId) {
    const query = `
      SELECT 
        aa.id, aa.admin_email, aa.action_type, aa.target_user_id, aa.details, aa.created_at
      FROM admin_actions aa
      WHERE aa.target_user_id = $1
      ORDER BY aa.created_at DESC
    `;
    const result = await pool.query(query, [targetUserId]);
    return result.rows;
  }
}

module.exports = AdminAction;