const pool = require('../config/database');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only text, PDF, DOC, and DOCX files are allowed for job descriptions'), false);
    }
  },
});

const createJobDescription = async (req, res) => {
  try {
    const { title, company, description } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const query = `
      INSERT INTO job_descriptions (user_id, title, company, description)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, company, description, created_at
    `;
    
    const result = await pool.query(query, [req.user.id, title, company || null, description]);
    
    res.json({
      message: 'Job description created successfully',
      jobDescription: result.rows[0]
    });
  } catch (error) {
    console.error('Create job description error:', error);
    res.status(500).json({ error: 'Failed to create job description' });
  }
};

const uploadJobDescription = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, company } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Extract text from uploaded file
    let description = '';
    if (req.file.mimetype === 'text/plain') {
      description = req.file.buffer.toString('utf8');
    } else {
      // For PDF/Word files, we would need to parse them similar to resume parser
      description = req.file.buffer.toString('utf8');
    }

    const query = `
      INSERT INTO job_descriptions (user_id, title, company, description)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, company, description, created_at
    `;
    
    const result = await pool.query(query, [req.user.id, title, company || null, description]);
    
    res.json({
      message: 'Job description uploaded successfully',
      jobDescription: result.rows[0]
    });
  } catch (error) {
    console.error('Upload job description error:', error);
    res.status(500).json({ error: 'Failed to upload job description' });
  }
};

const getJobDescriptions = async (req, res) => {
  try {
    const query = `
      SELECT id, title, company, description, created_at
      FROM job_descriptions 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [req.user.id]);
    
    res.json({
      jobDescriptions: result.rows
    });
  } catch (error) {
    console.error('Get job descriptions error:', error);
    res.status(500).json({ error: 'Failed to retrieve job descriptions' });
  }
};

const deleteJobDescription = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM job_descriptions WHERE id = $1 AND user_id = $2 RETURNING id',
      [jobId, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job description not found' });
    }
    
    res.json({ message: 'Job description deleted successfully' });
  } catch (error) {
    console.error('Delete job description error:', error);
    res.status(500).json({ error: 'Failed to delete job description' });
  }
};

module.exports = {
  upload,
  createJobDescription,
  uploadJobDescription,
  getJobDescriptions,
  deleteJobDescription,
};