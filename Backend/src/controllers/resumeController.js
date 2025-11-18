const { minioClient, BUCKET_NAME } = require('../config/minio');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const ResumeParser = require('../utils/resumeParser');
const LLMResumeParser = require('../utils/llmResumeParser');
const latexService = require('../services/latexService');
const pdfGenerationService = require('../services/pdfGenerationService');
const sseManager = require('../services/sseManager');
const pool = require('../config/database');
const FileValidator = require('../utils/fileValidator');
const PathValidator = require('../utils/pathValidator');

const fileValidator = new FileValidator();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1, // Only allow 1 file at a time
    fields: 10, // Limit number of fields
  },
  fileFilter: (req, file, cb) => {
    // Basic MIME type check (deep validation happens later)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
    }
  },
});

const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Comprehensive file validation
    const validation = fileValidator.validateFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      req.file.size
    );

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'File validation failed',
        details: validation.errors
      });
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('File upload warnings:', validation.warnings);
    }

    // Check if new columns exist (backward compatibility)
    const checkColumns = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'parsed_resumes' 
      AND column_name IN ('json_file_name', 'original_name', 'file_size');
    `;
    
    const existingColumns = await pool.query(checkColumns);
    const hasNewColumns = existingColumns.rows.length === 3;
    
    if (!hasNewColumns) {
      // Fall back to legacy format
      console.warn('⚠️  Using legacy upload format. Please run migration: node run_migration.js');
      
      const fileName = `${req.user.id}/${uuidv4()}_${req.file.originalname}`;
      
      // Upload to MinIO
      await minioClient.putObject(
        BUCKET_NAME,
        fileName,
        req.file.buffer,
        req.file.size,
        {
          'Content-Type': req.file.mimetype,
        }
      );

      // Parse resume content with LLM
      const extractedText = await LLMResumeParser.extractText(req.file.buffer, req.file.mimetype);
      const parsedData = await LLMResumeParser.parseResumeWithLLM(extractedText, req.user.id);
      
      // Store parsed data in database (legacy format)
      const query = `
        INSERT INTO parsed_resumes (user_id, resume_file_name, parsed_data, is_base_resume)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `;
      
      // Check if this is the user's first resume (make it base by default)
      const countQuery = 'SELECT COUNT(*) as count FROM parsed_resumes WHERE user_id = $1';
      const countResult = await pool.query(countQuery, [req.user.id]);
      const isFirstResume = countResult.rows[0].count == 0;
      
      await pool.query(query, [req.user.id, fileName, JSON.stringify(parsedData), isFirstResume]);

      res.json({
        message: 'Resume uploaded and parsed successfully (legacy format)',
        fileName,
        originalName: req.file.originalname,
        size: req.file.size,
        parsed: parsedData,
        isBaseResume: isFirstResume
      });
      
      return;
    }

    // New format with separate file storage
    const fileId = uuidv4();
    const secureFileName = fileValidator.generateSecureFilename(req.file.originalname, req.user.id);
    const resumeFileName = `${req.user.id}/resumes/${secureFileName}`;
    const jsonFileName = `${req.user.id}/json/${fileId}_parsed.json`;

    // Calculate file hash for integrity
    const fileHash = fileValidator.calculateFileHash(req.file.buffer);
    
    // Upload original file to MinIO
    await minioClient.putObject(
      BUCKET_NAME,
      resumeFileName,
      req.file.buffer,
      req.file.size,
      {
        'Content-Type': req.file.mimetype,
      }
    );

    // Parse resume content with LLM
    const extractedText = await LLMResumeParser.extractText(req.file.buffer, req.file.mimetype);
    const parsedData = await LLMResumeParser.parseResumeWithLLM(extractedText, req.user.id);
    
    // Upload parsed JSON to MinIO
    const jsonBuffer = Buffer.from(JSON.stringify(parsedData, null, 2));
    await minioClient.putObject(
      BUCKET_NAME,
      jsonFileName,
      jsonBuffer,
      jsonBuffer.length,
      {
        'Content-Type': 'application/json',
      }
    );
    
    // Store metadata in database
    const query = `
      INSERT INTO parsed_resumes (user_id, resume_file_name, json_file_name, original_name, file_size, is_base_resume)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    
    // Check if this is the user's first resume (make it base by default)
    const countQuery = 'SELECT COUNT(*) as count FROM parsed_resumes WHERE user_id = $1';
    const countResult = await pool.query(countQuery, [req.user.id]);
    const isFirstResume = countResult.rows[0].count == 0;
    
    await pool.query(query, [
      req.user.id, 
      resumeFileName, 
      jsonFileName, 
      req.file.originalname, 
      req.file.size, 
      isFirstResume
    ]);

    res.json({
      message: 'Resume uploaded and parsed successfully',
      resumeFileName,
      jsonFileName,
      originalName: req.file.originalname,
      size: req.file.size,
      parsed: parsedData,
      isBaseResume: isFirstResume
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload resume' });
  }
};

const getResumes = async (req, res) => {
  try {
    const query = `
      SELECT id, resume_file_name, json_file_name, pdf_file_name, pdf_status, pdf_generated_at,
             original_name, file_size, is_base_resume,
             created_at AT TIME ZONE 'UTC' as created_at
      FROM parsed_resumes
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [req.user.id]);

    const resumes = result.rows.map(row => ({
      id: row.id,
      resumeFileName: row.resume_file_name,
      jsonFileName: row.json_file_name,
      pdfFileName: row.pdf_file_name,
      pdfStatus: row.pdf_status || 'pending',
      pdfGeneratedAt: row.pdf_generated_at ? new Date(row.pdf_generated_at).toISOString() : null,
      originalName: row.original_name,
      size: row.file_size,
      isBaseResume: row.is_base_resume,
      uploadDate: new Date(row.created_at).toISOString(),
      // Legacy support - keeping fileName for backward compatibility
      fileName: row.resume_file_name
    }));

    res.json({ resumes: resumes });
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({ error: 'Failed to retrieve resumes' });
  }
};

const downloadResume = async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName) {
      return res.status(400).json({ error: 'File name is required' });
    }

    // Validate and sanitize the file path
    const pathValidation = PathValidator.validateAndSanitizePath(fileName, req.user.id.toString());
    
    if (!pathValidation.isValid) {
      console.warn(`Path validation failed for user ${req.user.id}: ${pathValidation.error}`);
      return res.status(403).json({ error: 'Access denied' });
    }

    const sanitizedPath = pathValidation.sanitizedPath;

    // Additional filename validation
    const filenameValidation = PathValidator.validateFilename(sanitizedPath);
    if (!filenameValidation.isValid) {
      console.warn(`Filename validation failed: ${filenameValidation.error}`);
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Verify user access one more time
    if (!PathValidator.hasUserAccess(sanitizedPath, req.user.id.toString())) {
      console.warn(`Access denied for user ${req.user.id} to file ${sanitizedPath}`);
      return res.status(403).json({ error: 'Access denied' });
    }

    // Attempt to get the file from MinIO
    const dataStream = await minioClient.getObject(BUCKET_NAME, sanitizedPath);
    
    // Determine file type for proper headers
    const isJsonFile = sanitizedPath.includes('/json/') || sanitizedPath.endsWith('.json');
    const safeDownloadName = PathValidator.generateSafeDownloadName(sanitizedPath);
    
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    
    if (isJsonFile) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
    }
    
    dataStream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    if (error.code === 'NoSuchKey') {
      res.status(404).json({ error: 'File not found' });
    } else if (error.code === 'AccessDenied') {
      res.status(403).json({ error: 'Access denied' });
    } else {
      res.status(500).json({ error: 'Failed to download file' });
    }
  }
};

const deleteResume = async (req, res) => {
  try {
    const { resumeId } = req.params;
    
    // Get resume info from database
    const query = 'SELECT resume_file_name, json_file_name FROM parsed_resumes WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [resumeId, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    const { resume_file_name, json_file_name } = result.rows[0];
    
    // Delete files from MinIO (only if they exist)
    const deletePromises = [];
    
    if (resume_file_name) {
      deletePromises.push(minioClient.removeObject(BUCKET_NAME, resume_file_name));
    }
    
    if (json_file_name) {
      deletePromises.push(minioClient.removeObject(BUCKET_NAME, json_file_name));
    }
    
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }
    
    // Delete record from database
    await pool.query('DELETE FROM parsed_resumes WHERE id = $1 AND user_id = $2', [resumeId, req.user.id]);
    
    res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
};

const getParsedResumes = async (req, res) => {
  try {
    const query = `
      SELECT id, resume_file_name, json_file_name, original_name, file_size, is_base_resume,
             created_at AT TIME ZONE 'UTC' as created_at
      FROM parsed_resumes
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [req.user.id]);

    const parsedResumes = result.rows.map(row => ({
      id: row.id,
      resumeFileName: row.resume_file_name,
      jsonFileName: row.json_file_name,
      originalName: row.original_name,
      fileSize: row.file_size,
      isBaseResume: row.is_base_resume,
      createdAt: new Date(row.created_at).toISOString()
    }));

    res.json({
      parsedResumes: parsedResumes
    });
  } catch (error) {
    console.error('Get parsed resumes error:', error);
    res.status(500).json({ error: 'Failed to retrieve parsed resumes' });
  }
};

const setBaseResume = async (req, res) => {
  try {
    const { resumeId } = req.params;
    
    // First, unset all base resumes for this user
    await pool.query(
      'UPDATE parsed_resumes SET is_base_resume = FALSE WHERE user_id = $1',
      [req.user.id]
    );
    
    // Then set the selected resume as base
    const result = await pool.query(
      'UPDATE parsed_resumes SET is_base_resume = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
      [resumeId, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    res.json({
      message: 'Base resume updated successfully',
      baseResume: result.rows[0]
    });
  } catch (error) {
    console.error('Set base resume error:', error);
    res.status(500).json({ error: 'Failed to set base resume' });
  }
};

const getBaseResume = async (req, res) => {
  try {
    const query = `
      SELECT id, resume_file_name, json_file_name, original_name, file_size,
             created_at AT TIME ZONE 'UTC' as created_at
      FROM parsed_resumes
      WHERE user_id = $1 AND is_base_resume = TRUE
      LIMIT 1
    `;
    const result = await pool.query(query, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No base resume found' });
    }

    const row = result.rows[0];

    // Optionally fetch the parsed data from MinIO
    let parsedData = null;
    try {
      const jsonStream = await minioClient.getObject(BUCKET_NAME, row.json_file_name);
      const chunks = [];
      for await (const chunk of jsonStream) {
        chunks.push(chunk);
      }
      const jsonContent = Buffer.concat(chunks).toString();
      parsedData = JSON.parse(jsonContent);
    } catch (error) {
      console.error('Error fetching JSON from MinIO:', error);
    }

    res.json({
      baseResume: {
        id: row.id,
        resumeFileName: row.resume_file_name,
        jsonFileName: row.json_file_name,
        originalName: row.original_name,
        fileSize: row.file_size,
        createdAt: new Date(row.created_at).toISOString(),
        parsedData: parsedData
      }
    });
  } catch (error) {
    console.error('Get base resume error:', error);
    res.status(500).json({ error: 'Failed to retrieve base resume' });
  }
};

const parseResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Comprehensive file validation
    const validation = fileValidator.validateFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      req.file.size
    );

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'File validation failed',
        details: validation.errors
      });
    }

    // Get format preference from query params (default: json)
    const format = req.query.format || 'json';

    if (!['json', 'latex'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Must be "json" or "latex"' });
    }

    console.log(`Starting LLM resume parsing for: ${req.file.originalname} (format: ${format})`);

    // Extract text from file
    const extractedText = await LLMResumeParser.extractText(req.file.buffer, req.file.mimetype);

    if (!extractedText || extractedText.trim().length < 50) {
      return res.status(400).json({ error: 'Unable to extract sufficient text from resume' });
    }

    console.log('Extracted text length:', extractedText.length);

    let parsedResult;
    let structureMetadata;

    // Extract structure metadata from the resume (works for both formats)
    console.log('Extracting structure metadata...');
    try {
      structureMetadata = await LLMResumeParser.extractStructureMetadata(extractedText, req.user.id);
      console.log('Structure metadata extraction completed');
    } catch (structureError) {
      console.warn('Structure extraction failed, using default structure:', structureError.message);
      structureMetadata = LLMResumeParser.getDefaultStructureMetadata();
    }

    if (format === 'latex') {
      // Parse to LaTeX format
      parsedResult = await LLMResumeParser.parseResumeToLatex(extractedText, req.user.id);
      console.log('LLM LaTeX parsing completed successfully');

      res.json({
        message: 'Resume parsed successfully to LaTeX format',
        parsedResume: parsedResult,
        structureMetadata,
        format: 'latex',
        originalName: req.file.originalname,
        size: req.file.size
      });
    } else {
      // Parse to JSON format (default)
      parsedResult = await LLMResumeParser.parseResumeWithLLM(extractedText, req.user.id);
      console.log('LLM JSON parsing completed successfully');

      res.json({
        message: 'Resume parsed successfully with LLM',
        parsedResume: parsedResult,
        structureMetadata,
        format: 'json',
        originalName: req.file.originalname,
        size: req.file.size
      });
    }
  } catch (error) {
    console.error('LLM parse error:', error);
    res.status(500).json({ error: 'Failed to parse resume with LLM', details: error.message });
  }
};

const saveParsedResume = async (req, res) => {
  try {
    if (!req.body.parsedData) {
      return res.status(400).json({ error: 'No parsed data provided' });
    }

    if (!req.body.resumeName) {
      return res.status(400).json({ error: 'Resume name is required' });
    }

    const { resumeName, parsedData, structureMetadata } = req.body;
    const fileId = uuidv4();

    // Parse and validate JSON data
    let jsonData;
    try {
      jsonData = typeof parsedData === 'string' ? JSON.parse(parsedData) : parsedData;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(400).json({ error: 'Invalid JSON in parsed data' });
    }

    // Parse and validate structure metadata
    let structureData = structureMetadata;
    if (typeof structureMetadata === 'string') {
      try {
        structureData = JSON.parse(structureMetadata);
      } catch (parseError) {
        console.warn('Structure metadata parse error, using default:', parseError.message);
        structureData = LLMResumeParser.getDefaultStructureMetadata();
      }
    } else if (!structureMetadata) {
      console.warn('No structure metadata provided, using default');
      structureData = LLMResumeParser.getDefaultStructureMetadata();
    }

    // Validate the parsed data has the required structure
    if (!jsonData.personalInfo || !jsonData.personalInfo.firstName || !jsonData.personalInfo.email) {
      return res.status(400).json({ error: 'Invalid resume data structure - missing required personal information' });
    }

    // Save JSON to MinIO
    const jsonFileName = `${req.user.id}/json/${fileId}_parsed.json`;
    const jsonBuffer = Buffer.from(JSON.stringify(jsonData, null, 2));
    await minioClient.putObject(
      BUCKET_NAME,
      jsonFileName,
      jsonBuffer,
      jsonBuffer.length,
      {
        'Content-Type': 'application/json',
      }
    );

    const fileSize = jsonBuffer.length;

    // Store metadata in database (includes structure metadata)
    const query = `
      INSERT INTO parsed_resumes (user_id, resume_file_name, json_file_name, original_name, file_size, is_base_resume, structure_metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;

    // Check if this is the user's first resume (make it base by default)
    const countQuery = 'SELECT COUNT(*) as count FROM parsed_resumes WHERE user_id = $1';
    const countResult = await pool.query(countQuery, [req.user.id]);
    const isFirstResume = countResult.rows[0].count == 0;

    const result = await pool.query(query, [
      req.user.id,
      resumeName, // Use resume name as file name
      jsonFileName,
      resumeName,
      fileSize,
      isFirstResume,
      JSON.stringify(structureData) // Save structure metadata as JSONB
    ]);

    const resumeId = result.rows[0]?.id;

    console.log('Resume saved successfully (JSON format):', {
      resumeId,
      jsonFileName,
      resumeName
    });

    // Trigger PDF generation in background
    pdfGenerationService.triggerPDFGeneration(resumeId, req.user.id, jsonData);

    res.json({
      success: true,
      message: 'Resume data saved successfully. PDF generation started.',
      resumeId,
      jsonFileName,
      originalName: resumeName,
      size: fileSize,
      isBaseResume: isFirstResume,
      pdfStatus: 'pending' // PDF generation is in progress
    });
  } catch (error) {
    console.error('Save parsed resume error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({ error: 'Failed to save resume data', details: error.message });
  }
};

const uploadParsedResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.body.parsedData) {
      return res.status(400).json({ error: 'No parsed data provided' });
    }

    // Comprehensive file validation
    const validation = fileValidator.validateFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      req.file.size
    );

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'File validation failed',
        details: validation.errors
      });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(req.body.parsedData);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(400).json({ error: 'Invalid JSON in parsed data' });
    }

    // Validate the parsed data has the required structure
    if (!parsedData.personalInfo || !parsedData.personalInfo.firstName || !parsedData.personalInfo.email) {
      return res.status(400).json({ error: 'Invalid resume data structure - missing required personal information' });
    }

    // Check if new columns exist (backward compatibility)
    const checkColumns = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'parsed_resumes' 
      AND column_name IN ('json_file_name', 'original_name', 'file_size');
    `;
    
    const existingColumns = await pool.query(checkColumns);
    const hasNewColumns = existingColumns.rows.length === 3;
    
    if (!hasNewColumns) {
      // Fall back to legacy format
      console.warn('⚠️  Using legacy uploadParsedResume format. Please run migration: node run_migration.js');
      
      const fileName = `${req.user.id}/${uuidv4()}_${req.file.originalname}`;
      
      // Upload to MinIO
      await minioClient.putObject(
        BUCKET_NAME,
        fileName,
        req.file.buffer,
        req.file.size,
        {
          'Content-Type': req.file.mimetype,
        }
      );

      // Store parsed data in database (legacy format)
      const query = `
        INSERT INTO parsed_resumes (user_id, resume_file_name, parsed_data, is_base_resume)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `;
      
      // Check if this is the user's first resume (make it base by default)
      const countQuery = 'SELECT COUNT(*) as count FROM parsed_resumes WHERE user_id = $1';
      const countResult = await pool.query(countQuery, [req.user.id]);
      const isFirstResume = countResult.rows[0].count == 0;
      
      const result = await pool.query(query, [req.user.id, fileName, JSON.stringify(parsedData), isFirstResume]);

      res.json({
        success: true,
        message: 'Resume uploaded and saved successfully (legacy format)',
        fileName,
        originalName: req.file.originalname,
        size: req.file.size,
        isBaseResume: isFirstResume,
        parsedData: parsedData
      });
      
      return;
    }

    // New format with separate file storage
    const fileId = uuidv4();
    const resumeFileName = `${req.user.id}/resumes/${fileId}_${req.file.originalname}`;
    const jsonFileName = `${req.user.id}/json/${fileId}_parsed.json`;
    
    // Upload original file to MinIO
    await minioClient.putObject(
      BUCKET_NAME,
      resumeFileName,
      req.file.buffer,
      req.file.size,
      {
        'Content-Type': req.file.mimetype,
      }
    );

    // Upload parsed JSON to MinIO
    const jsonBuffer = Buffer.from(JSON.stringify(parsedData, null, 2));
    await minioClient.putObject(
      BUCKET_NAME,
      jsonFileName,
      jsonBuffer,
      jsonBuffer.length,
      {
        'Content-Type': 'application/json',
      }
    );

    // Store metadata in database
    const query = `
      INSERT INTO parsed_resumes (user_id, resume_file_name, json_file_name, original_name, file_size, is_base_resume)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    
    // Check if this is the user's first resume (make it base by default)
    const countQuery = 'SELECT COUNT(*) as count FROM parsed_resumes WHERE user_id = $1';
    const countResult = await pool.query(countQuery, [req.user.id]);
    const isFirstResume = countResult.rows[0].count == 0;
    
    // Use resumeName from request body, or fall back to original filename
    const displayName = req.body.resumeName || req.file.originalname.replace(/\.(pdf|doc|docx)$/i, '');
    
    const result = await pool.query(query, [
      req.user.id, 
      resumeFileName, 
      jsonFileName, 
      displayName, 
      req.file.size, 
      isFirstResume
    ]);

    console.log('Resume saved successfully with new format:', {
      resumeId: result.rows[0]?.id,
      resumeFileName,
      jsonFileName,
      personalInfo: `${parsedData.personalInfo.firstName} ${parsedData.personalInfo.lastName}`,
      sections: {
        education: parsedData.education?.length || 0,
        experience: parsedData.experience?.length || 0,
        internships: parsedData.internships?.length || 0,
        projects: parsedData.projects?.length || 0
      }
    });

    res.json({
      success: true,
      message: 'Resume uploaded and saved successfully',
      resumeFileName,
      jsonFileName,
      originalName: displayName,
      size: req.file.size,
      isBaseResume: isFirstResume,
      parsedData: parsedData
    });
  } catch (error) {
    console.error('Upload parsed resume error:', error);
    if (error.message.includes('JSON')) {
      res.status(400).json({ error: 'Invalid JSON format in parsed data' });
    } else {
      res.status(500).json({ error: 'Failed to upload parsed resume' });
    }
  }
};

const getParsedData = async (req, res) => {
  try {
    const { resumeId } = req.params;

    // Get resume info from database
    const query = 'SELECT json_file_name FROM parsed_resumes WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [resumeId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const { json_file_name } = result.rows[0];

    try {
      // Fetch JSON from MinIO
      const jsonStream = await minioClient.getObject(BUCKET_NAME, json_file_name);
      const chunks = [];
      for await (const chunk of jsonStream) {
        chunks.push(chunk);
      }
      const jsonContent = Buffer.concat(chunks).toString();
      const parsedData = JSON.parse(jsonContent);

      res.json({
        parsedData: parsedData
      });
    } catch (error) {
      console.error('Error fetching data from MinIO:', error);
      res.status(500).json({ error: 'Failed to fetch parsed data' });
    }
  } catch (error) {
    console.error('Get parsed data error:', error);
    res.status(500).json({ error: 'Failed to retrieve parsed data' });
  }
};

const updateParsedData = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const { parsedData, resumeName } = req.body;

    // Get resume info from database
    const query = 'SELECT json_file_name, original_name FROM parsed_resumes WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [resumeId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const { json_file_name } = result.rows[0];

    try {
      // Update JSON in MinIO
      const jsonBuffer = Buffer.from(JSON.stringify(parsedData, null, 2), 'utf-8');
      await minioClient.putObject(BUCKET_NAME, json_file_name, jsonBuffer, jsonBuffer.length, {
        'Content-Type': 'application/json'
      });

      // Update name in database if provided
      if (resumeName) {
        const updateNameQuery = 'UPDATE parsed_resumes SET original_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3';
        await pool.query(updateNameQuery, [resumeName, resumeId, req.user.id]);
      }

      res.json({
        success: true,
        message: 'Resume data updated successfully'
      });
    } catch (error) {
      console.error('Error updating data in MinIO:', error);
      res.status(500).json({ error: 'Failed to update parsed data' });
    }
  } catch (error) {
    console.error('Update parsed data error:', error);
    res.status(500).json({ error: 'Failed to update parsed data' });
  }
};

const customizeResumeForJob = async (req, res) => {
  try {
    const { resumeId, jobDescription } = req.body;
    
    if (!resumeId || !jobDescription?.description?.trim()) {
      return res.status(400).json({ error: 'Resume ID and job description are required' });
    }

    // Get resume info from database
    const query = 'SELECT json_file_name, original_name FROM parsed_resumes WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [resumeId, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    const { json_file_name, original_name } = result.rows[0];
    
    // Fetch current resume data from MinIO
    const jsonStream = await minioClient.getObject(BUCKET_NAME, json_file_name);
    const chunks = [];
    for await (const chunk of jsonStream) {
      chunks.push(chunk);
    }
    const jsonContent = Buffer.concat(chunks).toString();
    const currentResumeData = JSON.parse(jsonContent);

    // Use LLM to modify the resume for the specific job (only pass description)
    const modifiedResumeData = await LLMResumeParser.customizeResumeForJob(
      currentResumeData, 
      jobDescription.description,
      req.user.id
    );

    // Generate suggested custom resume name
    const customResueName = `${original_name} - Custom`;

    // Return the modified data for preview (don't save yet)
    res.json({
      success: true,
      message: 'Resume customized successfully for job opportunity',
      customResueName,
      modifiedResumeData
    });

  } catch (error) {
    console.error('Resume customization error:', error);
    res.status(500).json({ error: 'Failed to customize resume for job', details: error.message });
  }
};

const generateResumePDF = async (req, res) => {
  try {
    const { resumeId } = req.params;

    if (!resumeId) {
      return res.status(400).json({ error: 'Resume ID is required' });
    }

    // Get resume data from database
    const query = 'SELECT * FROM parsed_resumes WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [resumeId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const resume = result.rows[0];

    // Check PDF status
    if (!resume.pdf_file_name || resume.pdf_status !== 'ready') {
      return res.status(400).json({
        error: 'PDF not ready for download',
        pdfStatus: resume.pdf_status || 'pending',
        message: resume.pdf_status === 'generating'
          ? 'PDF is being generated. Please try again in a moment.'
          : resume.pdf_status === 'failed'
            ? 'PDF generation failed. Please contact support.'
            : 'PDF generation is pending. Please wait.'
      });
    }

    // Fetch pre-generated PDF from MinIO
    try {
      const pdfStream = await minioClient.getObject(BUCKET_NAME, resume.pdf_file_name);
      const chunks = [];
      for await (const chunk of pdfStream) {
        chunks.push(chunk);
      }
      const pdfBuffer = Buffer.concat(chunks);

      // Get resume data for filename
      const jsonStream = await minioClient.getObject(BUCKET_NAME, resume.json_file_name);
      const jsonChunks = [];
      for await (const chunk of jsonStream) {
        jsonChunks.push(chunk);
      }
      const jsonContent = Buffer.concat(jsonChunks).toString();
      const resumeData = JSON.parse(jsonContent);

      const fileName = `${resumeData.personalInfo.firstName}_${resumeData.personalInfo.lastName}_Resume.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');

      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error fetching PDF from MinIO:', error);
      return res.status(500).json({ error: 'Failed to fetch PDF file' });
    }

  } catch (error) {
    console.error('PDF download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download PDF', details: error.message });
    }
  }
};

const generateResumeDOCX = async (req, res) => {
  try {
    const { resumeId } = req.params;

    if (!resumeId) {
      return res.status(400).json({ error: 'Resume ID is required' });
    }

    // Get resume data from database
    const query = 'SELECT * FROM parsed_resumes WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [resumeId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const resume = result.rows[0];

    // Fetch resume JSON data from MinIO
    try {
      const jsonStream = await minioClient.getObject(BUCKET_NAME, resume.json_file_name);
      const jsonChunks = [];
      for await (const chunk of jsonStream) {
        jsonChunks.push(chunk);
      }
      const jsonContent = Buffer.concat(jsonChunks).toString();
      const resumeData = JSON.parse(jsonContent);

      // Generate DOCX using the docx library
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Header with name
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `${resumeData.personalInfo.firstName} ${resumeData.personalInfo.lastName}`,
                  bold: true,
                  size: 32,
                }),
              ],
            }),

            // Contact Information
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: [
                    resumeData.personalInfo.email,
                    resumeData.personalInfo.phone,
                    resumeData.personalInfo.location
                  ].filter(Boolean).join(' | '),
                  size: 20,
                }),
              ],
            }),

            // Links
            ...(resumeData.personalInfo.linkedin || resumeData.personalInfo.github || resumeData.personalInfo.website ? [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: [
                      resumeData.personalInfo.linkedin,
                      resumeData.personalInfo.github,
                      resumeData.personalInfo.website
                    ].filter(Boolean).join(' | '),
                    size: 18,
                  }),
                ],
              }),
            ] : []),

            new Paragraph({ text: '' }), // Spacing

            // Summary
            ...(resumeData.summary && resumeData.summary.length > 0 ? [
              new Paragraph({
                text: 'PROFESSIONAL SUMMARY',
                heading: HeadingLevel.HEADING_1,
              }),
              ...resumeData.summary.map(item => new Paragraph({
                text: `• ${item}`,
                spacing: { before: 100, after: 100 },
              })),
              new Paragraph({ text: '' }),
            ] : []),

            // Experience
            ...(resumeData.experience && resumeData.experience.length > 0 ? [
              new Paragraph({
                text: 'PROFESSIONAL EXPERIENCE',
                heading: HeadingLevel.HEADING_1,
              }),
              ...resumeData.experience.flatMap(exp => [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: exp.company,
                      bold: true,
                      size: 24,
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${exp.title} | ${exp.location} | ${exp.dates}`,
                      italics: true,
                    }),
                  ],
                }),
                ...exp.responsibilities.map(resp => new Paragraph({
                  text: `• ${resp}`,
                  spacing: { before: 50, after: 50 },
                })),
                new Paragraph({ text: '' }),
              ]),
            ] : []),

            // Education
            ...(resumeData.education && resumeData.education.length > 0 ? [
              new Paragraph({
                text: 'EDUCATION',
                heading: HeadingLevel.HEADING_1,
              }),
              ...resumeData.education.flatMap(edu => [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: edu.institution,
                      bold: true,
                      size: 24,
                    }),
                  ],
                }),
                new Paragraph({
                  text: `${edu.degree} | ${edu.dates}`,
                  italics: true,
                }),
                new Paragraph({ text: '' }),
              ]),
            ] : []),

            // Technologies/Skills
            ...(resumeData.technologies ? [
              new Paragraph({
                text: 'TECHNICAL SKILLS',
                heading: HeadingLevel.HEADING_1,
              }),
              ...(Array.isArray(resumeData.technologies)
                ? resumeData.technologies.map(tech => new Paragraph({
                    text: `• ${tech.category}: ${tech.items.join(', ')}`,
                    spacing: { before: 100, after: 100 },
                  }))
                : Object.entries(resumeData.technologies).map(([category, items]) => new Paragraph({
                    text: `• ${category}: ${Array.isArray(items) ? items.join(', ') : items}`,
                    spacing: { before: 100, after: 100 },
                  }))
              ),
              new Paragraph({ text: '' }),
            ] : []),

            // Projects
            ...(resumeData.projects && resumeData.projects.length > 0 ? [
              new Paragraph({
                text: 'PROJECTS',
                heading: HeadingLevel.HEADING_1,
              }),
              ...resumeData.projects.flatMap(proj => [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: proj.name,
                      bold: true,
                      size: 24,
                    }),
                  ],
                }),
                new Paragraph({
                  text: proj.description,
                }),
                ...(proj.technologies ? [new Paragraph({
                  text: `Technologies: ${proj.technologies}`,
                  italics: true,
                })] : []),
                new Paragraph({ text: '' }),
              ]),
            ] : []),
          ],
        }],
      });

      // Generate DOCX buffer
      const buffer = await Packer.toBuffer(doc);

      const fileName = `${resumeData.personalInfo.firstName}_${resumeData.personalInfo.lastName}_Resume.docx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache');

      res.send(buffer);
    } catch (error) {
      console.error('Error generating DOCX:', error);
      return res.status(500).json({ error: 'Failed to generate Word document' });
    }

  } catch (error) {
    console.error('DOCX generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate Word document', details: error.message });
    }
  }
};

const checkPDFStatus = async (req, res) => {
  try {
    const { resumeId } = req.params;

    if (!resumeId) {
      return res.status(400).json({ error: 'Resume ID is required' });
    }

    // Get PDF status from database
    const query = 'SELECT pdf_status, pdf_file_name, pdf_generated_at FROM parsed_resumes WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [resumeId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const resume = result.rows[0];

    res.json({
      pdfStatus: resume.pdf_status || 'pending',
      pdfFileName: resume.pdf_file_name,
      pdfGeneratedAt: resume.pdf_generated_at ? new Date(resume.pdf_generated_at).toISOString() : null,
      isReady: resume.pdf_status === 'ready'
    });
  } catch (error) {
    console.error('Check PDF status error:', error);
    res.status(500).json({ error: 'Failed to check PDF status', details: error.message });
  }
};

// SSE endpoint for real-time PDF status updates
const subscribePDFUpdates = (req, res) => {
  try {
    // EventSource doesn't support custom headers, so we get token from query param
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      console.error('SSE: No token provided');
      res.status(401).send('Unauthorized: No token provided');
      return;
    }

    // Verify JWT token manually since middleware isn't applied to this route
    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error('SSE: Invalid token', err.message);
      res.status(401).send('Unauthorized: Invalid token');
      return;
    }

    const userId = decoded.userId;
    console.log('SSE connection established for user:', userId);

    // Set SSE headers before adding to manager
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // CORS headers for EventSource
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    res.status(200);

    // Add client to SSE manager (which will send initial connection event)
    sseManager.addClient(userId, res);

    // Handle client disconnect
    req.on('close', () => {
      console.log('SSE connection closed for user:', userId);
      sseManager.removeClient(userId, res);
    });

  } catch (error) {
    console.error('SSE subscription error:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  }
};

module.exports = {
  upload,
  uploadResume,
  getResumes,
  downloadResume,
  deleteResume,
  getParsedResumes,
  setBaseResume,
  getBaseResume,
  parseResume,
  saveParsedResume,
  uploadParsedResume,
  getParsedData,
  updateParsedData,
  customizeResumeForJob,
  generateResumePDF,
  generateResumeDOCX,
  checkPDFStatus,
  subscribePDFUpdates,
};