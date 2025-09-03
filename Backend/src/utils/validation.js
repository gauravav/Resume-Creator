const Joi = require('joi');

// Custom password validation function
const passwordValidator = (value, helpers) => {
  const password = value;
  
  // Check minimum length
  if (password.length < 12) {
    return helpers.error('password.minLength');
  }
  
  // Check maximum length
  if (password.length > 128) {
    return helpers.error('password.maxLength');
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return helpers.error('password.uppercase');
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return helpers.error('password.lowercase');
  }
  
  // Check for at least one digit
  if (!/\d/.test(password)) {
    return helpers.error('password.digit');
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return helpers.error('password.special');
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password123', '123456789', 'qwerty123', 'admin123',
    'welcome123', 'letmein123', 'password1', 'Password123', 'Admin123',
    'Welcome123', 'Qwerty123', 'Password1234'
  ];
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common.toLowerCase()))) {
    return helpers.error('password.common');
  }
  
  // Check for repeated characters (more than 2 consecutive)
  if (/(.)\1{2,}/.test(password)) {
    return helpers.error('password.repeated');
  }
  
  // Check for sequential characters
  const sequences = [
    'abcdefghijklmnopqrstuvwxyz',
    '0123456789',
    'qwertyuiopasdfghjklzxcvbnm'
  ];
  
  for (const seq of sequences) {
    for (let i = 0; i <= seq.length - 4; i++) {
      const subSeq = seq.substring(i, i + 4);
      if (password.toLowerCase().includes(subSeq)) {
        return helpers.error('password.sequential');
      }
    }
  }
  
  return password;
};

// Enhanced password schema with custom validation
const passwordSchema = Joi.string()
  .custom(passwordValidator)
  .required()
  .messages({
    'password.minLength': 'Password must be at least 12 characters long',
    'password.maxLength': 'Password must not exceed 128 characters',
    'password.uppercase': 'Password must contain at least one uppercase letter',
    'password.lowercase': 'Password must contain at least one lowercase letter',
    'password.digit': 'Password must contain at least one number',
    'password.special': 'Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?~`)',
    'password.common': 'Password is too common. Please choose a more unique password',
    'password.repeated': 'Password must not contain more than 2 consecutive identical characters',
    'password.sequential': 'Password must not contain sequential characters (e.g., abcd, 1234, qwer)'
  });

const registerSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: true } })
    .max(254) // RFC 5321 maximum email length
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email address is too long',
      'any.required': 'Email address is required'
    }),
  
  password: passwordSchema,
  
  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref('password'))
    .messages({ 
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    }),
  
  firstName: Joi.string()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      'string.min': 'First name is required',
      'string.max': 'First name must not exceed 50 characters',
      'string.pattern.base': 'First name must contain only letters, spaces, hyphens, and apostrophes',
      'any.required': 'First name is required'
    }),
  
  lastName: Joi.string()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      'string.min': 'Last name is required',
      'string.max': 'Last name must not exceed 50 characters',
      'string.pattern.base': 'Last name must contain only letters, spaces, hyphens, and apostrophes',
      'any.required': 'Last name is required'
    }),
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: true } })
    .max(254)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email address is too long',
      'any.required': 'Email address is required'
    }),
  
  password: Joi.string()
    .min(1)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password is required',
      'string.max': 'Password is too long',
      'any.required': 'Password is required'
    }),
});

// Password change schema (for existing users)
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  
  newPassword: passwordSchema,
  
  confirmNewPassword: Joi.string()
    .required()
    .valid(Joi.ref('newPassword'))
    .messages({
      'any.only': 'New passwords do not match',
      'any.required': 'New password confirmation is required'
    }),
});

// Password reset schema
const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required'
    }),
  
  newPassword: passwordSchema,
  
  confirmNewPassword: Joi.string()
    .required()
    .valid(Joi.ref('newPassword'))
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    }),
});

// Email validation schema
const emailSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: true } })
    .max(254)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email address is too long',
      'any.required': 'Email address is required'
    }),
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  resetPasswordSchema,
  emailSchema,
  passwordSchema,
};