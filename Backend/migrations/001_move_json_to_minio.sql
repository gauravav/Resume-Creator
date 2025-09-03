-- Migration to move JSON data from PostgreSQL to MinIO
-- This script should be run AFTER the application is updated to handle the new structure

-- First, add new columns to parsed_resumes table
ALTER TABLE parsed_resumes 
ADD COLUMN json_file_name VARCHAR(255),
ADD COLUMN original_name VARCHAR(255),
ADD COLUMN file_size BIGINT;

-- Remove the old parsed_data column (after data migration)
-- ALTER TABLE parsed_resumes DROP COLUMN parsed_data;

-- Note: The actual data migration should be done through the application
-- to properly handle uploading JSON files to MinIO