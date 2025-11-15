-- Migration: Add tutorial tracking system
-- Date: 2025-01-15
-- Description: Track user tutorial completion status for better onboarding

-- Add tutorial tracking columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tutorial_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS tutorial_skipped BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_tutorial_completed ON users(tutorial_completed);

-- Update existing users to have tutorial as completed (for backward compatibility)
-- This ensures existing users won't see the tutorial unexpectedly
UPDATE users
SET tutorial_completed = TRUE,
    tutorial_completed_at = CURRENT_TIMESTAMP
WHERE tutorial_completed IS NULL OR tutorial_completed = FALSE;
