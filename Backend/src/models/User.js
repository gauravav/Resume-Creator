const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class User {
  static async createUser(email, password, firstName, lastName) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if this is the super admin email
    const isSuperAdmin = email.toLowerCase() === 'avulagaurav@gmail.com';
    
    let query, values;
    
    if (isSuperAdmin) {
      // Super admin gets auto-verified and approved
      query = `
        INSERT INTO users (
          email, password, first_name, last_name, 
          email_verified, admin_approved, account_status,
          approved_at, approved_by
        )
        VALUES ($1, $2, $3, $4, TRUE, TRUE, 'active', NOW(), 'system')
        RETURNING id, email, first_name, last_name, email_verified, admin_approved, account_status, created_at
      `;
      values = [email, hashedPassword, firstName, lastName];
    } else {
      // Regular users need verification and approval
      const verificationToken = uuidv4();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      query = `
        INSERT INTO users (
          email, password, first_name, last_name, 
          email_verification_token, email_verification_expires, 
          account_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'pending_verification')
        RETURNING id, email, first_name, last_name, email_verification_token, account_status, created_at
      `;
      values = [email, hashedPassword, firstName, lastName, verificationToken, verificationExpires];
    }
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async findByVerificationToken(token) {
    const query = `
      SELECT * FROM users 
      WHERE email_verification_token = $1 
      AND email_verification_expires > NOW()
    `;
    const result = await pool.query(query, [token]);
    return result.rows[0];
  }

  static async verifyEmail(userId) {
    const query = `
      UPDATE users 
      SET email_verified = TRUE, 
          email_verification_token = NULL, 
          email_verification_expires = NULL,
          account_status = 'pending_approval',
          approval_requested_at = NOW()
      WHERE id = $1
      RETURNING id, email, first_name, last_name, email_verified, account_status
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async approveUser(userId, adminEmail) {
    const query = `
      UPDATE users 
      SET admin_approved = TRUE, 
          approved_at = NOW(),
          approved_by = $2,
          account_status = 'active'
      WHERE id = $1
      RETURNING id, email, first_name, last_name, admin_approved, account_status, approved_at
    `;
    const result = await pool.query(query, [userId, adminEmail]);
    return result.rows[0];
  }

  static async rejectUser(userId, adminEmail, reason) {
    const query = `
      UPDATE users 
      SET account_status = 'rejected',
          rejection_reason = $2,
          approved_by = $3
      WHERE id = $1
      RETURNING id, email, first_name, last_name, account_status, rejection_reason
    `;
    const result = await pool.query(query, [userId, reason, adminEmail]);
    return result.rows[0];
  }

  static async getPendingApprovalUsers() {
    const query = `
      SELECT id, email, first_name, last_name, 
             email_verified, account_status, approval_requested_at, created_at
      FROM users 
      WHERE account_status = 'pending_approval'
      ORDER BY approval_requested_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getAllUsersWithStats() {
    const query = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.email_verified, 
        u.admin_approved, u.account_status, u.created_at, u.approved_at,
        COALESCE(SUM(tu.tokens_used), 0) as total_tokens_used,
        COUNT(tu.id) as total_operations
      FROM users u
      LEFT JOIN token_usage tu ON u.id = tu.user_id AND tu.operation_type != 'reset'
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.email_verified, 
               u.admin_approved, u.account_status, u.created_at, u.approved_at
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getUserById(userId) {
    const query = `
      SELECT id, email, first_name, last_name, email_verified, 
             admin_approved, account_status, timezone, created_at, approved_at
      FROM users 
      WHERE id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async updateProfile(userId, updates) {
    const allowedFields = ['first_name', 'last_name', 'timezone'];
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.includes(field) && value !== undefined) {
        setClause.push(`${field} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(userId);
    
    const query = `
      UPDATE users 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, email, first_name, last_name, timezone, updated_at
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async changePassword(userId, currentPassword, newPassword) {
    // First verify current password
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const query = `
      UPDATE users 
      SET password = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, updated_at
    `;
    
    const result = await pool.query(query, [hashedNewPassword, userId]);
    return result.rows[0];
  }

  static async generateNewVerificationToken(email) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.email_verified) {
      throw new Error('Email already verified');
    }

    const verificationToken = uuidv4();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const query = `
      UPDATE users
      SET email_verification_token = $1,
          email_verification_expires = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE email = $3
      RETURNING id, email, first_name, last_name, email_verification_token
    `;

    const result = await pool.query(query, [verificationToken, verificationExpires, email]);
    return result.rows[0];
  }

  static async updateTutorialStatus(userId, updates) {
    const allowedFields = ['tutorial_completed', 'tutorial_completed_at', 'tutorial_skipped'];
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.includes(field) && value !== undefined) {
        setClause.push(`${field} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(userId);

    const query = `
      UPDATE users
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, tutorial_completed, tutorial_completed_at, tutorial_skipped
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }
}

module.exports = User;