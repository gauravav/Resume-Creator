const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class FileValidator {
  constructor() {
    // File signatures (magic numbers) for validation
    this.signatures = {
      'application/pdf': [
        Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
      ],
      'application/msword': [
        Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]), // DOC
      ],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        Buffer.from([0x50, 0x4B, 0x03, 0x04]), // DOCX (ZIP)
        Buffer.from([0x50, 0x4B, 0x05, 0x06]), // DOCX (empty ZIP)
        Buffer.from([0x50, 0x4B, 0x07, 0x08]), // DOCX (spanned ZIP)
      ]
    };

    // Dangerous file extensions to block
    this.blockedExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
      '.jsp', '.php', '.asp', '.aspx', '.sh', '.ps1', '.py', '.pl', '.rb',
      '.dll', '.sys', '.msi', '.app', '.deb', '.rpm', '.dmg', '.pkg'
    ];

    // Maximum file sizes (in bytes)
    this.maxFileSizes = {
      'application/pdf': 10 * 1024 * 1024, // 10MB
      'application/msword': 10 * 1024 * 1024, // 10MB
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 10 * 1024 * 1024 // 10MB
    };

    // Suspicious content patterns to detect
    this.suspiciousPatterns = [
      /<%[\s\S]*%>/gi, // ASP/JSP tags
      /<\?php[\s\S]*\?>/gi, // PHP tags
      /<script[\s\S]*<\/script>/gi, // Script tags
      /javascript:/gi, // JavaScript protocol
      /eval\s*\(/gi, // Eval function
      /exec\s*\(/gi, // Exec function
      /system\s*\(/gi, // System function
    ];
  }

  /**
   * Validate file based on multiple security criteria
   * @param {Buffer} fileBuffer - File content as buffer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - MIME type from client
   * @param {number} size - File size
   * @returns {Object} Validation result
   */
  validateFile(fileBuffer, originalName, mimeType, size) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // 1. Validate file extension
      const extValidation = this.validateExtension(originalName);
      if (!extValidation.isValid) {
        result.isValid = false;
        result.errors.push(...extValidation.errors);
      }

      // 2. Validate MIME type
      const mimeValidation = this.validateMimeType(mimeType);
      if (!mimeValidation.isValid) {
        result.isValid = false;
        result.errors.push(...mimeValidation.errors);
      }

      // 3. Validate file size
      const sizeValidation = this.validateFileSize(size, mimeType);
      if (!sizeValidation.isValid) {
        result.isValid = false;
        result.errors.push(...sizeValidation.errors);
      }

      // 4. Validate file signature (magic numbers)
      const signatureValidation = this.validateFileSignature(fileBuffer, mimeType);
      if (!signatureValidation.isValid) {
        result.isValid = false;
        result.errors.push(...signatureValidation.errors);
      }

      // 5. Check for suspicious content
      const contentValidation = this.validateFileContent(fileBuffer);
      if (!contentValidation.isValid) {
        result.isValid = false;
        result.errors.push(...contentValidation.errors);
      }
      result.warnings.push(...contentValidation.warnings);

      // 6. Validate filename for path traversal attempts
      const filenameValidation = this.validateFilename(originalName);
      if (!filenameValidation.isValid) {
        result.isValid = false;
        result.errors.push(...filenameValidation.errors);
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push('File validation failed: ' + error.message);
    }

    return result;
  }

  /**
   * Validate file extension
   */
  validateExtension(filename) {
    const result = { isValid: true, errors: [] };
    
    if (!filename || typeof filename !== 'string') {
      result.isValid = false;
      result.errors.push('Invalid filename');
      return result;
    }

    const ext = path.extname(filename).toLowerCase();
    
    // Check for blocked extensions
    if (this.blockedExtensions.includes(ext)) {
      result.isValid = false;
      result.errors.push(`File extension '${ext}' is not allowed for security reasons`);
    }

    // Check for allowed extensions
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    if (!allowedExtensions.includes(ext)) {
      result.isValid = false;
      result.errors.push(`File extension '${ext}' is not supported. Allowed: ${allowedExtensions.join(', ')}`);
    }

    return result;
  }

  /**
   * Validate MIME type
   */
  validateMimeType(mimeType) {
    const result = { isValid: true, errors: [] };
    
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedMimes.includes(mimeType)) {
      result.isValid = false;
      result.errors.push(`MIME type '${mimeType}' is not allowed`);
    }

    return result;
  }

  /**
   * Validate file size
   */
  validateFileSize(size, mimeType) {
    const result = { isValid: true, errors: [] };
    
    const maxSize = this.maxFileSizes[mimeType] || 5 * 1024 * 1024; // Default 5MB
    
    if (size > maxSize) {
      result.isValid = false;
      result.errors.push(`File size (${Math.round(size/1024/1024)}MB) exceeds maximum allowed (${Math.round(maxSize/1024/1024)}MB)`);
    }

    if (size < 100) { // Minimum 100 bytes
      result.isValid = false;
      result.errors.push('File is too small to be a valid document');
    }

    return result;
  }

  /**
   * Validate file signature (magic numbers)
   */
  validateFileSignature(fileBuffer, mimeType) {
    const result = { isValid: true, errors: [] };
    
    if (!fileBuffer || fileBuffer.length < 8) {
      result.isValid = false;
      result.errors.push('File is too small or corrupted');
      return result;
    }

    const signatures = this.signatures[mimeType];
    if (!signatures) {
      result.isValid = false;
      result.errors.push('Unknown MIME type for signature validation');
      return result;
    }

    // Check if file starts with any of the valid signatures
    const fileStart = fileBuffer.subarray(0, 8);
    const isValidSignature = signatures.some(signature => {
      return fileStart.subarray(0, signature.length).equals(signature);
    });

    if (!isValidSignature) {
      result.isValid = false;
      result.errors.push('File signature does not match declared MIME type - possible file type spoofing');
    }

    return result;
  }

  /**
   * Validate file content for suspicious patterns
   */
  validateFileContent(fileBuffer) {
    const result = { isValid: true, errors: [], warnings: [] };
    
    try {
      // Convert buffer to string for pattern matching (first 1KB only for performance)
      const content = fileBuffer.subarray(0, 1024).toString('utf8', 0, Math.min(fileBuffer.length, 1024));
      
      // Check for suspicious patterns
      for (const pattern of this.suspiciousPatterns) {
        if (pattern.test(content)) {
          result.isValid = false;
          result.errors.push('File contains suspicious content that may pose a security risk');
          break;
        }
      }

      // Check for null bytes (potential for binary exploits)
      if (content.includes('\0')) {
        result.warnings.push('File contains null bytes - ensure this is expected');
      }

    } catch (error) {
      result.warnings.push('Could not validate file content encoding');
    }

    return result;
  }

  /**
   * Validate filename for security issues
   */
  validateFilename(filename) {
    const result = { isValid: true, errors: [] };
    
    if (!filename || typeof filename !== 'string') {
      result.isValid = false;
      result.errors.push('Invalid filename');
      return result;
    }

    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      result.isValid = false;
      result.errors.push('Filename contains invalid path characters');
    }

    // Check for control characters
    if (/[\x00-\x1f\x7f-\x9f]/.test(filename)) {
      result.isValid = false;
      result.errors.push('Filename contains control characters');
    }

    // Check filename length
    if (filename.length > 255) {
      result.isValid = false;
      result.errors.push('Filename is too long (max 255 characters)');
    }

    // Check for reserved names (Windows)
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    const nameWithoutExt = path.basename(filename, path.extname(filename)).toUpperCase();
    if (reservedNames.includes(nameWithoutExt)) {
      result.isValid = false;
      result.errors.push('Filename uses a reserved system name');
    }

    return result;
  }

  /**
   * Generate secure filename
   */
  generateSecureFilename(originalName, userId) {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    
    // Sanitize original name (keep only alphanumeric and basic chars)
    const safeName = path.basename(originalName, ext)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 50);
    
    return `${userId}_${timestamp}_${random}_${safeName}${ext}`;
  }

  /**
   * Calculate file hash for integrity checking
   */
  calculateFileHash(fileBuffer) {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }
}

module.exports = FileValidator;