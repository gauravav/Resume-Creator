-- Migration: Add email verification and admin approval system
-- Date: 2025-09-04

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'pending_verification';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_admin_approved ON users(admin_approved);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);

-- Create admin_actions table to track admin activities
CREATE TABLE IF NOT EXISTS admin_actions (
  id SERIAL PRIMARY KEY,
  admin_email VARCHAR(255) NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- 'approve_user', 'reject_user', 'reset_tokens', etc.
  target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_email ON admin_actions(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);

-- Update existing users to have verified email and admin approval for backward compatibility
UPDATE users 
SET email_verified = TRUE, 
    admin_approved = TRUE, 
    account_status = 'active',
    approved_at = CURRENT_TIMESTAMP
WHERE email_verified IS NULL OR email_verified = FALSE;