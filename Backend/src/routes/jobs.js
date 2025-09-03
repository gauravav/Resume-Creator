const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  upload,
  createJobDescription,
  uploadJobDescription,
  getJobDescriptions,
  deleteJobDescription,
} = require('../controllers/jobController');

const router = express.Router();

router.use(authenticateToken);

router.post('/', createJobDescription);
router.post('/upload', upload.single('jobDescription'), uploadJobDescription);
router.get('/', getJobDescriptions);
router.delete('/:jobId', deleteJobDescription);

module.exports = router;