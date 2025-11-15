const User = require('../models/User');
const logger = require('../utils/logger');

class TutorialController {
  /**
   * Get tutorial completion status for the authenticated user
   */
  static async getStatus(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.getUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          tutorialCompleted: user.tutorial_completed || false,
          tutorialCompletedAt: user.tutorial_completed_at || null,
          tutorialSkipped: user.tutorial_skipped || false
        }
      });

    } catch (error) {
      logger.error('Get tutorial status error', {
        error: error.message,
        userId: req.user?.id,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve tutorial status'
      });
    }
  }

  /**
   * Mark tutorial as completed
   */
  static async markCompleted(req, res) {
    try {
      const userId = req.user.id;

      await User.updateTutorialStatus(userId, {
        tutorial_completed: true,
        tutorial_completed_at: new Date(),
        tutorial_skipped: false
      });

      logger.info('Tutorial marked as completed', { userId });

      res.json({
        success: true,
        message: 'Tutorial marked as completed',
        data: {
          tutorialCompleted: true,
          tutorialCompletedAt: new Date()
        }
      });

    } catch (error) {
      logger.error('Mark tutorial completed error', {
        error: error.message,
        userId: req.user?.id,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Failed to mark tutorial as completed'
      });
    }
  }

  /**
   * Mark tutorial as skipped
   */
  static async markSkipped(req, res) {
    try {
      const userId = req.user.id;

      await User.updateTutorialStatus(userId, {
        tutorial_completed: true,
        tutorial_completed_at: new Date(),
        tutorial_skipped: true
      });

      logger.info('Tutorial marked as skipped', { userId });

      res.json({
        success: true,
        message: 'Tutorial marked as skipped',
        data: {
          tutorialCompleted: true,
          tutorialSkipped: true
        }
      });

    } catch (error) {
      logger.error('Mark tutorial skipped error', {
        error: error.message,
        userId: req.user?.id,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Failed to mark tutorial as skipped'
      });
    }
  }

  /**
   * Reset tutorial status
   */
  static async reset(req, res) {
    try {
      const userId = req.user.id;

      await User.updateTutorialStatus(userId, {
        tutorial_completed: false,
        tutorial_completed_at: null,
        tutorial_skipped: false
      });

      logger.info('Tutorial status reset', { userId });

      res.json({
        success: true,
        message: 'Tutorial status reset successfully',
        data: {
          tutorialCompleted: false,
          tutorialCompletedAt: null,
          tutorialSkipped: false
        }
      });

    } catch (error) {
      logger.error('Reset tutorial error', {
        error: error.message,
        userId: req.user?.id,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Failed to reset tutorial status'
      });
    }
  }
}

module.exports = TutorialController;
