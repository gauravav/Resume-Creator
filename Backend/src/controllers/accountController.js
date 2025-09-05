const User = require('../models/User');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

class AccountController {
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      
      const user = await User.getUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Remove sensitive data
      const { password, email_verification_token, email_verification_expires, ...userProfile } = user;
      
      res.json({
        success: true,
        data: userProfile
      });

    } catch (error) {
      logger.error('Get profile error', {
        error: error.message,
        userId: req.user?.id,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve profile'
      });
    }
  }

  static async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user.id;
      const { firstName, lastName, timezone } = req.body;

      const updates = {};
      if (firstName !== undefined) updates.first_name = firstName;
      if (lastName !== undefined) updates.last_name = lastName;
      if (timezone !== undefined) updates.timezone = timezone;

      const updatedUser = await User.updateProfile(userId, updates);
      
      logger.info('Profile updated successfully', {
        userId,
        updatedFields: Object.keys(updates)
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
      });

    } catch (error) {
      logger.error('Update profile error', {
        error: error.message,
        userId: req.user?.id,
        body: req.body,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }

  static async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      const result = await User.changePassword(userId, currentPassword, newPassword);
      
      logger.info('Password changed successfully', {
        userId,
        timestamp: result.updated_at
      });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      logger.error('Change password error', {
        error: error.message,
        userId: req.user?.id,
        stack: error.stack
      });

      // Handle specific error cases
      if (error.message === 'Current password is incorrect') {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to change password'
      });
    }
  }

  static async getTimezones(req, res) {
    try {
      // List of common timezones with user-friendly names
      const timezones = [
        { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
        { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
        { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
        { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
        { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
        { value: 'America/Phoenix', label: 'Arizona' },
        { value: 'America/Anchorage', label: 'Alaska' },
        { value: 'Pacific/Honolulu', label: 'Hawaii' },
        { value: 'Europe/London', label: 'GMT (Greenwich Mean Time)' },
        { value: 'Europe/Berlin', label: 'Central European Time' },
        { value: 'Europe/Paris', label: 'Central European Time (Paris)' },
        { value: 'Europe/Rome', label: 'Central European Time (Rome)' },
        { value: 'Europe/Madrid', label: 'Central European Time (Madrid)' },
        { value: 'Europe/Amsterdam', label: 'Central European Time (Amsterdam)' },
        { value: 'Europe/Moscow', label: 'Moscow Standard Time' },
        { value: 'Asia/Dubai', label: 'Gulf Standard Time' },
        { value: 'Asia/Kolkata', label: 'India Standard Time' },
        { value: 'Asia/Singapore', label: 'Singapore Standard Time' },
        { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
        { value: 'Asia/Shanghai', label: 'China Standard Time' },
        { value: 'Asia/Hong_Kong', label: 'Hong Kong Time' },
        { value: 'Asia/Seoul', label: 'Korea Standard Time' },
        { value: 'Australia/Sydney', label: 'Australian Eastern Time' },
        { value: 'Australia/Melbourne', label: 'Australian Eastern Time (Melbourne)' },
        { value: 'Australia/Brisbane', label: 'Australian Eastern Time (Brisbane)' },
        { value: 'Australia/Adelaide', label: 'Australian Central Time' },
        { value: 'Australia/Perth', label: 'Australian Western Time' },
        { value: 'Pacific/Auckland', label: 'New Zealand Standard Time' }
      ];

      res.json({
        success: true,
        data: timezones
      });

    } catch (error) {
      logger.error('Get timezones error', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve timezones'
      });
    }
  }
}

module.exports = AccountController;