const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const RateLimiter = require('../middleware/rateLimiter');
const {
  convertLatexToPdf,
  checkLatexStatus,
  validateLatex
} = require('../controllers/latexController');

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken);

// Create rate limiter for LaTeX conversion (resource intensive)
const latexConversionLimiter = RateLimiter.createUserResourceLimiter(
  'latex_conversion',
  20, // 20 conversions
  60 * 60 * 1000 // per hour
);

// LaTeX endpoints
router.post('/convert', latexConversionLimiter, convertLatexToPdf);
router.get('/status', checkLatexStatus);
router.post('/validate', validateLatex);

module.exports = router;
