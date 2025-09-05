const express = require('express');
const { body } = require('express-validator');
const AccountController = require('../controllers/accountController');
const { authenticateToken: auth } = require('../middleware/auth');
const router = express.Router();


// Get user profile
router.get('/profile', auth, AccountController.getProfile);

// Update user profile (name, timezone)
router.put('/profile', 
  auth,
  [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('First name must be between 1 and 100 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name must be between 1 and 100 characters'),
    body('timezone')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Timezone must be a valid timezone identifier')
  ],
  AccountController.updateProfile
);

// Change password
router.put('/password',
  auth,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match');
        }
        return true;
      })
  ],
  AccountController.changePassword
);

// Get available timezones
router.get('/timezones', auth, AccountController.getTimezones);

module.exports = router;