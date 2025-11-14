-- Migration: Add structure_metadata column to preserve resume layout/formatting
-- This allows generated resumes to match the structure of the original uploaded resume

ALTER TABLE parsed_resumes
ADD COLUMN IF NOT EXISTS structure_metadata JSONB DEFAULT '{}';

-- Add index for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_parsed_resumes_structure_metadata
ON parsed_resumes USING GIN (structure_metadata);

-- Comment on the column
COMMENT ON COLUMN parsed_resumes.structure_metadata IS
'Stores structural and formatting information from the original resume including section order, layout style, fonts, colors, and spacing preferences';

-- Example structure_metadata format:
-- {
--   "sectionOrder": ["summary", "experience", "education", "projects", "technologies"],
--   "sectionTitles": {
--     "summary": "Professional Summary",
--     "experience": "Work Experience",
--     "education": "Education",
--     "projects": "Notable Projects",
--     "technologies": "Technical Skills"
--   },
--   "layout": {
--     "style": "single-column",
--     "headerStyle": "centered",
--     "margins": {"top": "2cm", "bottom": "2cm", "left": "2cm", "right": "2cm"}
--   },
--   "formatting": {
--     "fonts": {"main": "Charter", "heading": "Charter-Bold"},
--     "fontSize": {"name": "25pt", "section": "14pt", "body": "10pt"},
--     "colors": {"primary": "RGB(0,0,0)", "accent": "RGB(0,0,0)"},
--     "spacing": {"sectionGap": "0.3cm", "itemGap": "0.2cm"},
--     "bulletStyle": "bullet"
--   },
--   "visualElements": {
--     "useSectionLines": true,
--     "useHeaderLine": false,
--     "contactLayout": "horizontal"
--   }
-- }
