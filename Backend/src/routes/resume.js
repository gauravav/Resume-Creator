const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const RateLimiter = require('../middleware/rateLimiter');
const {
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
  checkPDFStatus,
  subscribePDFUpdates,
} = require('../controllers/resumeController');

const router = express.Router();

// Create rate limiters for different operations
const fileUploadLimiter = RateLimiter.createFileUploadLimiter();
const fileDownloadLimiter = RateLimiter.createFileDownloadLimiter();
const userResumeUploadLimiter = RateLimiter.createUserResourceLimiter('resume_upload', 20, 60 * 60 * 1000); // 20 per hour
const userParseLimiter = RateLimiter.createUserResourceLimiter('resume_parse', 10, 60 * 60 * 1000); // 10 per hour
const userCustomizationLimiter = RateLimiter.createUserResourceLimiter('resume_customize', 15, 60 * 60 * 1000); // 15 per hour

// SSE endpoint for real-time PDF status updates (handles auth manually, no rate limiting for long-lived connections)
router.get('/pdf-updates', subscribePDFUpdates);

// Apply authentication middleware to all other routes
router.use(authenticateToken);

router.post('/upload', fileUploadLimiter, userResumeUploadLimiter, upload.single('resume'), uploadResume);
router.post('/parse', fileUploadLimiter, userParseLimiter, upload.single('resume'), parseResume);
router.post('/save-parsed', userResumeUploadLimiter, saveParsedResume);
router.post('/upload-parsed', fileUploadLimiter, userResumeUploadLimiter, upload.single('resume'), uploadParsedResume);
router.post('/customize-for-job', userCustomizationLimiter, customizeResumeForJob);
router.get('/', getResumes);
router.get('/parsed', getParsedResumes);
router.get('/parsed-data/:resumeId', getParsedData);
router.put('/parsed-data/:resumeId', updateParsedData);
router.get('/base', getBaseResume);
router.put('/base/:resumeId', setBaseResume);
router.get('/pdf/:resumeId', generateResumePDF);
router.get('/pdf-status/:resumeId', checkPDFStatus);
router.get('/download/:fileName(*)', fileDownloadLimiter, downloadResume);
router.delete('/:resumeId', deleteResume);

module.exports = router;