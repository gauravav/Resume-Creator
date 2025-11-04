const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const logger = require('../utils/logger');

class LatexService {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'latex-conversions');
    // Common pdflatex paths on different systems
    this.pdflatexPaths = [
      'pdflatex', // If in PATH
      '/Library/TeX/texbin/pdflatex', // MacTeX on macOS
      '/usr/local/texlive/2023/bin/x86_64-darwin/pdflatex',
      '/usr/local/texlive/2024/bin/x86_64-darwin/pdflatex',
      '/usr/bin/pdflatex', // Linux
      '/usr/local/bin/pdflatex'
    ];
    this.pdflatexPath = null;
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory for LaTeX', {
        error: error.message,
        path: this.tempDir
      });
    }
  }

  /**
   * Find and cache the pdflatex executable path
   */
  async findPdfLatex() {
    if (this.pdflatexPath) {
      return this.pdflatexPath;
    }

    for (const pdflatexPath of this.pdflatexPaths) {
      try {
        // Check if the executable exists
        if (pdflatexPath === 'pdflatex') {
          // Check if it's in PATH
          await new Promise((resolve, reject) => {
            exec('which pdflatex', (error, stdout) => {
              if (error || !stdout.trim()) {
                reject(new Error('Not in PATH'));
              } else {
                resolve(stdout.trim());
              }
            });
          });
          this.pdflatexPath = 'pdflatex';
          logger.info('Found pdflatex in PATH');
          return this.pdflatexPath;
        } else {
          // Check if file exists at specific path
          await fs.access(pdflatexPath, fs.constants.X_OK);
          this.pdflatexPath = pdflatexPath;
          logger.info('Found pdflatex', { path: pdflatexPath });
          return this.pdflatexPath;
        }
      } catch (error) {
        // Continue to next path
        continue;
      }
    }

    return null;
  }

  /**
   * Check if pdflatex is installed on the system
   */
  async checkPdfLatexInstalled() {
    const path = await this.findPdfLatex();
    return path !== null;
  }

  /**
   * Convert LaTeX content to PDF
   * @param {string} latexContent - The LaTeX source code
   * @param {string} fileName - Optional filename (without extension)
   * @returns {Promise<Buffer>} - PDF file as Buffer
   */
  async convertLatexToPdf(latexContent, fileName = 'document') {
    const jobId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const workDir = path.join(this.tempDir, jobId);
    const texFilePath = path.join(workDir, `${fileName}.tex`);
    const pdfFilePath = path.join(workDir, `${fileName}.pdf`);

    try {
      // Find pdflatex executable
      const pdflatexPath = await this.findPdfLatex();
      if (!pdflatexPath) {
        throw new Error('pdflatex is not installed on this system. Please install MacTeX or TeX Live.');
      }

      // Create working directory
      await fs.mkdir(workDir, { recursive: true });

      // Write LaTeX content to file
      await fs.writeFile(texFilePath, latexContent, 'utf8');

      logger.info('Starting LaTeX to PDF conversion', {
        jobId,
        fileName,
        workDir
      });

      // Run pdflatex
      // -interaction=nonstopmode: Don't stop for errors
      // -output-directory: Specify output directory
      // Run twice to resolve references
      await this.runPdfLatex(pdflatexPath, texFilePath, workDir);
      await this.runPdfLatex(pdflatexPath, texFilePath, workDir);

      // Check if PDF was generated
      try {
        await fs.access(pdfFilePath);
      } catch (error) {
        throw new Error('PDF file was not generated. Please check your LaTeX syntax.');
      }

      // Read the generated PDF
      const pdfBuffer = await fs.readFile(pdfFilePath);

      logger.info('LaTeX to PDF conversion successful', {
        jobId,
        fileName,
        pdfSize: pdfBuffer.length
      });

      return pdfBuffer;

    } catch (error) {
      logger.error('LaTeX to PDF conversion failed', {
        jobId,
        fileName,
        error: error.message
      });
      throw error;
    } finally {
      // Clean up temporary files
      try {
        await fs.rm(workDir, { recursive: true, force: true });
      } catch (cleanupError) {
        logger.warn('Failed to clean up LaTeX temp directory', {
          jobId,
          path: workDir,
          error: cleanupError.message
        });
      }
    }
  }

  /**
   * Run pdflatex command
   */
  runPdfLatex(pdflatexPath, texFilePath, workDir) {
    return new Promise((resolve, reject) => {
      const command = `"${pdflatexPath}" -interaction=nonstopmode -output-directory="${workDir}" "${texFilePath}"`;

      exec(command, {
        cwd: workDir,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
      }, (error, stdout, stderr) => {
        if (error) {
          // Check if PDF was still generated despite errors
          const pdfPath = texFilePath.replace('.tex', '.pdf');
          if (require('fs').existsSync(pdfPath)) {
            // PDF was generated, consider it a success
            logger.warn('pdflatex reported errors but PDF was generated', {
              stdout: stdout.substring(0, 500),
              stderr: stderr.substring(0, 500)
            });
            resolve(stdout);
          } else {
            logger.error('pdflatex execution failed', {
              error: error.message,
              stdout: stdout.substring(0, 1000),
              stderr: stderr.substring(0, 1000)
            });
            reject(new Error(`LaTeX compilation failed: ${this.extractLatexError(stdout, stderr)}`));
          }
        } else {
          resolve(stdout);
        }
      });
    });
  }

  /**
   * Extract meaningful error message from LaTeX output
   */
  extractLatexError(stdout, stderr) {
    // Look for common LaTeX error patterns
    const errorPatterns = [
      /! (.+)/,
      /Error: (.+)/i,
      /Fatal error: (.+)/i
    ];

    for (const pattern of errorPatterns) {
      const match = stdout.match(pattern) || stderr.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Return a generic message if no specific error found
    return 'LaTeX compilation encountered errors. Please check your LaTeX syntax.';
  }

  /**
   * Validate LaTeX content for basic syntax
   */
  validateLatexContent(latexContent) {
    if (!latexContent || typeof latexContent !== 'string') {
      return { valid: false, error: 'LaTeX content must be a non-empty string' };
    }

    // Check for required document class
    if (!latexContent.includes('\\documentclass')) {
      return { valid: false, error: 'LaTeX content must include \\documentclass' };
    }

    // Check for document environment
    if (!latexContent.includes('\\begin{document}') || !latexContent.includes('\\end{document}')) {
      return { valid: false, error: 'LaTeX content must include \\begin{document} and \\end{document}' };
    }

    return { valid: true };
  }
}

module.exports = new LatexService();
