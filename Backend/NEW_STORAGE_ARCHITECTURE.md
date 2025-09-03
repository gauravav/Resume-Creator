# New Resume Storage Architecture

## Overview
The system has been modified to store JSON data in MinIO instead of PostgreSQL, providing better separation of concerns and improved scalability.

## Changes Made

### Database Schema Changes
- **Removed**: `parsed_data` JSONB column from `parsed_resumes` table
- **Added**: `json_file_name`, `original_name`, `file_size` columns
- **Migration**: See `migrations/001_move_json_to_minio.sql`

### File Storage Structure in MinIO
```
{userId}/
├── resumes/
│   ├── {uuid}_original_resume.pdf
│   ├── {uuid}_another_resume.docx
│   └── ...
└── json/
    ├── {uuid}_parsed.json
    ├── {uuid}_parsed.json
    └── ...
```

## API Endpoints

### Updated Endpoints

#### GET /api/resumes
Returns list of resumes with both file names:
```json
{
  "resumes": [
    {
      "id": 1,
      "resumeFileName": "123/resumes/abc-123_resume.pdf",
      "jsonFileName": "123/json/abc-123_parsed.json",
      "originalName": "resume.pdf",
      "size": 1024000,
      "isBaseResume": true,
      "uploadDate": "2024-01-01T00:00:00Z",
      "fileName": "123/resumes/abc-123_resume.pdf" // Legacy support
    }
  ]
}
```

#### GET /api/resumes/parsed
Returns metadata about parsed resumes:
```json
{
  "parsedResumes": [
    {
      "id": 1,
      "resumeFileName": "123/resumes/abc-123_resume.pdf",
      "jsonFileName": "123/json/abc-123_parsed.json",
      "originalName": "resume.pdf",
      "fileSize": 1024000,
      "isBaseResume": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### New Endpoints

#### GET /api/resumes/parsed-data/:resumeId
Fetches the parsed JSON data from MinIO for a specific resume:
```json
{
  "parsedData": {
    "personalInfo": { ... },
    "summary": "...",
    "education": [...],
    "experience": [...],
    // ... full parsed resume structure
  }
}
```

#### GET /api/resumes/download/:fileName
Downloads either raw resume files or JSON files:
- Raw files: `/api/resumes/download/123/resumes/abc-123_resume.pdf`
- JSON files: `/api/resumes/download/123/json/abc-123_parsed.json`

#### DELETE /api/resumes/:resumeId
Deletes both the raw file and JSON file from MinIO, plus the database record.

## Benefits

### 1. **Improved Performance**
- Database queries are faster without large JSONB data
- JSON files can be cached at the CDN level
- Separate concerns: metadata in DB, content in object storage

### 2. **Better Scalability**  
- MinIO can handle large files better than PostgreSQL
- Easy to implement file versioning and backups
- Reduced database size and backup times

### 3. **Enhanced User Experience**
- Users can download both raw resumes and structured JSON
- Easier to implement file sharing and collaboration features
- Clear separation between file storage and metadata

### 4. **Developer Benefits**
- JSON files are human-readable and debuggable
- Easy to implement data migration and transformation
- Better error handling and recovery options

## Migration Guide

### For Existing Data
1. Run the migration SQL script to add new columns
2. Create a data migration script to:
   - Extract JSON data from existing records
   - Upload JSON to MinIO with proper file structure
   - Update records with new file names
   - Remove old `parsed_data` column

### For Frontend Applications
Update API calls to use new response structure:
```javascript
// Old way
const parsedData = resume.parsed_data;

// New way  
const parsedDataResponse = await fetch(`/api/resumes/parsed-data/${resume.id}`);
const { parsedData } = await parsedDataResponse.json();

// Download links
const rawResumeUrl = `/api/resumes/download/${resume.resumeFileName}`;
const jsonUrl = `/api/resumes/download/${resume.jsonFileName}`;
```

## File Organization

### Raw Resume Files
- **Path**: `{userId}/resumes/{uuid}_{originalName}`
- **Purpose**: Original uploaded files
- **Access**: Direct download via API

### Parsed JSON Files  
- **Path**: `{userId}/json/{uuid}_parsed.json`
- **Purpose**: Structured resume data
- **Format**: Pretty-printed JSON for readability
- **Access**: Direct download or API endpoint

This architecture provides a solid foundation for future features like resume templates, collaboration, and advanced analytics.