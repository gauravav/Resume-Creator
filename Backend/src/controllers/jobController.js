const pool = require('../config/database');
const multer = require('multer');
const axios = require('axios');
const llmResumeParser = require('../utils/llmResumeParser');
const { createJobPostingExtractionPrompt } = require('../prompts');

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

const scrapeJobPosting = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    let validUrl;
    try {
      validUrl = new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log('=== JOB POSTING SCRAPE DEBUG ===');
    console.log('URL:', url);
    console.log('User ID:', req.user.id);

    // Fetch webpage content
    let webpageContent;
    try {
      console.log('Fetching webpage...');
      const response = await axios.get(url, {
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      webpageContent = response.data;
      console.log('Webpage fetched successfully, length:', webpageContent.length);

      // Strip HTML tags to get clean text
      // Basic HTML stripping - replace common tags with spaces/newlines
      let cleanText = webpageContent
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      console.log('Cleaned text length:', cleanText.length);
      webpageContent = cleanText;

    } catch (error) {
      console.error('Failed to fetch webpage:', error.message);
      return res.status(400).json({
        error: 'Failed to fetch webpage. Please check the URL and try again.',
        details: error.message
      });
    }

    // Use LLM to extract job posting information
    console.log('Sending to LLM for extraction...');
    const prompt = createJobPostingExtractionPrompt(webpageContent);

    const messages = [
      {
        role: "system",
        content: "You are an expert at extracting structured job posting information from webpage content. Return ONLY valid JSON format with no additional text or explanation."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    try {
      const response = await llmResumeParser.callLLM(messages, {
        temperature: 0.1,
        maxTokens: 4000
      });

      const llmResponse = response.content;
      console.log('LLM response received');

      // Extract JSON from response
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in LLM response');
      }

      let jsonString = jsonMatch[0];
      // Clean up common JSON issues
      jsonString = llmResumeParser.cleanJsonString(jsonString);

      const extractedData = JSON.parse(jsonString);

      console.log('Extracted job data:', {
        companyName: extractedData.companyName,
        jobTitle: extractedData.jobTitle,
        location: extractedData.location,
        responsibilitiesCount: extractedData.responsibilities?.length || 0,
        requirementsCount: extractedData.requirements?.length || 0
      });

      // Track token usage if available
      if (response.usage) {
        const tokensUsed = response.usage.total_tokens;
        try {
          const { recordTokenUsage } = require('./tokenController');
          await recordTokenUsage(req.user.id, 'job_posting_extraction', tokensUsed, {
            operation: 'scrape_job_posting',
            url: url,
            response_length: llmResponse.length
          });
          console.log(`✅ Recorded ${tokensUsed} tokens for job posting extraction`);
        } catch (tokenError) {
          console.error('Failed to record token usage:', tokenError);
        }
      }

      res.json({
        success: true,
        data: extractedData
      });

    } catch (error) {
      console.error('LLM extraction error:', error);
      return res.status(500).json({
        error: 'Failed to extract job information from webpage',
        details: error.message
      });
    }

  } catch (error) {
    console.error('Scrape job posting error:', error);
    res.status(500).json({
      error: 'Failed to scrape job posting',
      details: error.message
    });
  }
};

module.exports = {
  upload,
  createJobDescription,
  uploadJobDescription,
  getJobDescriptions,
  deleteJobDescription,
  scrapeJobPosting,
};