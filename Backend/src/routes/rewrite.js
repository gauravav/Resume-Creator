const express = require('express');
const { rewriteResponsibility } = require('../controllers/rewriteController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/rewrite-responsibility
router.post('/responsibility', authenticateToken, rewriteResponsibility);

module.exports = router;