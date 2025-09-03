const path = require('path');

class PathValidator {
  /**
   * Validates and sanitizes file paths to prevent path traversal attacks
   * @param {string} filePath - The file path to validate
   * @param {string} userId - The user ID for access control
   * @param {string} baseDirectory - Base directory for user files (optional)
   * @returns {Object} Validation result with sanitized path
   */
  static validateAndSanitizePath(filePath, userId, baseDirectory = '') {
    const result = {
      isValid: false,
      sanitizedPath: null,
      error: null
    };

    try {
      if (!filePath || typeof filePath !== 'string') {
        result.error = 'Invalid file path provided';
        return result;
      }

      if (!userId || typeof userId !== 'string') {
        result.error = 'Invalid user ID provided';
        return result;
      }

      // Remove any URL encoding
      let decodedPath = decodeURIComponent(filePath);
      
      // Normalize the path to handle different path separators
      let normalizedPath = path.normalize(decodedPath);
      
      // Convert backslashes to forward slashes for consistency
      normalizedPath = normalizedPath.replace(/\\/g, '/');

      // Check for path traversal attempts
      if (this.containsPathTraversal(normalizedPath)) {
        result.error = 'Path traversal detected in file path';
        return result;
      }

      // Ensure the path starts with the user ID
      if (!normalizedPath.startsWith(`${userId}/`)) {
        result.error = 'Access denied: file does not belong to user';
        return result;
      }

      // Remove any double slashes
      normalizedPath = normalizedPath.replace(/\/+/g, '/');

      // Validate the path structure
      if (!this.isValidPathStructure(normalizedPath, userId)) {
        result.error = 'Invalid path structure';
        return result;
      }

      // Create the full path if base directory is provided
      const sanitizedPath = baseDirectory ? 
        path.join(baseDirectory, normalizedPath) : 
        normalizedPath;

      result.isValid = true;
      result.sanitizedPath = sanitizedPath.replace(/\\/g, '/'); // Ensure forward slashes
      
      return result;

    } catch (error) {
      result.error = `Path validation error: ${error.message}`;
      return result;
    }
  }

  /**
   * Check if path contains traversal attempts
   * @param {string} filePath - Path to check
   * @returns {boolean} True if traversal detected
   */
  static containsPathTraversal(filePath) {
    // Check for various path traversal patterns
    const dangerousPatterns = [
      /\.\.\//g,    // ../
      /\.\.\\/g,    // ..\
      /\.\.$/g,     // .. at end
      /^\.\.$/g,    // exactly ..
      /%2e%2e/gi,   // URL encoded ..
      /%252e%252e/gi, // Double URL encoded ..
      /%c0%ae/gi,   // UTF-8 encoded .
      /%c1%9c/gi,   // Alternative UTF-8 encoding
      /\0/g,        // Null bytes
      /\/\.\.\//g,  // /../
      /\\\.\.\\/g,  // \..\
      /\/\.\.$/g,   // /.. at end
      /\\\.\.\$/g   // \.. at end
    ];

    return dangerousPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Validate path structure against allowed patterns
   * @param {string} normalizedPath - Normalized path
   * @param {string} userId - User ID
   * @returns {boolean} True if valid structure
   */
  static isValidPathStructure(normalizedPath, userId) {
    // Expected path patterns for the application
    const allowedPatterns = [
      new RegExp(`^${userId}/resumes/[\\w\\-_\\.]+$`), // User resume files
      new RegExp(`^${userId}/json/[\\w\\-_\\.]+\\.json$`), // User JSON files
      new RegExp(`^${userId}/[\\w\\-_\\.]+$`), // Legacy user files
    ];

    return allowedPatterns.some(pattern => pattern.test(normalizedPath));
  }

  /**
   * Extract and validate filename from path
   * @param {string} filePath - File path
   * @returns {Object} Validation result with filename
   */
  static validateFilename(filePath) {
    const result = {
      isValid: false,
      filename: null,
      error: null
    };

    try {
      const filename = path.basename(filePath);
      
      if (!filename || filename === '.' || filename === '..') {
        result.error = 'Invalid filename';
        return result;
      }

      // Check for control characters and invalid characters
      if (/[\x00-\x1f\x7f-\x9f<>:"|?*]/.test(filename)) {
        result.error = 'Filename contains invalid characters';
        return result;
      }

      // Check filename length
      if (filename.length > 255) {
        result.error = 'Filename too long';
        return result;
      }

      // Check for reserved names (Windows)
      const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 
                           'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 
                           'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 
                           'LPT7', 'LPT8', 'LPT9'];
      
      const nameWithoutExt = path.basename(filename, path.extname(filename)).toUpperCase();
      if (reservedNames.includes(nameWithoutExt)) {
        result.error = 'Filename uses reserved system name';
        return result;
      }

      result.isValid = true;
      result.filename = filename;
      return result;

    } catch (error) {
      result.error = `Filename validation error: ${error.message}`;
      return result;
    }
  }

  /**
   * Generate safe download filename for client
   * @param {string} originalPath - Original file path
   * @returns {string} Safe filename for download
   */
  static generateSafeDownloadName(originalPath) {
    try {
      const filename = path.basename(originalPath);
      
      // Remove or replace potentially dangerous characters
      const safeFilename = filename
        .replace(/[<>:"|?*\x00-\x1f\x7f-\x9f]/g, '_')
        .replace(/^\.+/, '') // Remove leading dots
        .substring(0, 100); // Limit length
      
      return safeFilename || 'download';
    } catch (error) {
      return 'download';
    }
  }

  /**
   * Validate if user has access to file based on path
   * @param {string} filePath - File path to check
   * @param {string} userId - Current user ID
   * @returns {boolean} True if user has access
   */
  static hasUserAccess(filePath, userId) {
    try {
      const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
      return normalizedPath.startsWith(`${userId}/`) && 
             !this.containsPathTraversal(normalizedPath);
    } catch (error) {
      return false;
    }
  }
}

module.exports = PathValidator;