const express = require('express');
const TutorialController = require('../controllers/tutorialController');
const { authenticateToken: auth } = require('../middleware/auth');
const router = express.Router();

// Get tutorial completion status
router.get('/status', auth, TutorialController.getStatus);

// Mark tutorial as completed
router.post('/complete', auth, TutorialController.markCompleted);

// Mark tutorial as skipped
router.post('/skip', auth, TutorialController.markSkipped);

// Reset tutorial (for testing or user preference)
router.post('/reset', auth, TutorialController.reset);

module.exports = router;
