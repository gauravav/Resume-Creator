-- Migration: Add LaTeX support to parsed_resumes table
-- Date: 2025-11-05

-- Add new columns for LaTeX support
ALTER TABLE parsed_resumes
ADD COLUMN IF NOT EXISTS latex_file_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS format_type VARCHAR(20) DEFAULT 'json';

-- Add constraint for format_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'parsed_resumes_format_type_check'
    ) THEN
        ALTER TABLE parsed_resumes
        ADD CONSTRAINT parsed_resumes_format_type_check
        CHECK (format_type IN ('json', 'latex'));
    END IF;
END$$;

-- Update existing records to have 'json' format type
UPDATE parsed_resumes
SET format_type = 'json'
WHERE format_type IS NULL;

-- Make format_type NOT NULL after setting defaults
ALTER TABLE parsed_resumes
ALTER COLUMN format_type SET DEFAULT 'json';
