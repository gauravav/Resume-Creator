const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const logger = require('../utils/logger');

class LatexService {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'latex-conversions');
    this.platform = os.platform(); // 'darwin', 'win32', 'linux', etc.
    this.pdflatexPath = null;

    // Get custom LaTeX path from environment if set
    const customPath = process.env.LATEX_PDFLATEX_PATH;
    if (customPath) {
      logger.info('Using custom pdflatex path from environment', { path: customPath });
      this.pdflatexPaths = [customPath];
    } else {
      // Build OS-specific paths
      this.pdflatexPaths = this.getDefaultPdfLatexPaths();
    }

    this.ensureTempDir();
  }

  /**
   * Get default pdflatex paths based on operating system
   */
  getDefaultPdfLatexPaths() {
    const paths = ['pdflatex']; // Always check PATH first

    if (this.platform === 'darwin') {
      // macOS paths
      paths.push(
        '/Library/TeX/texbin/pdflatex', // MacTeX default
        '/usr/local/texlive/2023/bin/universal-darwin/pdflatex',
        '/usr/local/texlive/2023/bin/x86_64-darwin/pdflatex',
        '/usr/local/texlive/2024/bin/universal-darwin/pdflatex',
        '/usr/local/texlive/2024/bin/x86_64-darwin/pdflatex',
        '/usr/local/texlive/2025/bin/universal-darwin/pdflatex',
        '/usr/local/texlive/2025/bin/x86_64-darwin/pdflatex',
        '/opt/homebrew/bin/pdflatex' // Homebrew on Apple Silicon
      );
    } else if (this.platform === 'win32') {
      // Windows paths
      paths.push(
        'C:\\texlive\\2023\\bin\\windows\\pdflatex.exe',
        'C:\\texlive\\2024\\bin\\windows\\pdflatex.exe',
        'C:\\texlive\\2025\\bin\\windows\\pdflatex.exe',
        'C:\\texlive\\2023\\bin\\win32\\pdflatex.exe',
        'C:\\texlive\\2024\\bin\\win32\\pdflatex.exe',
        'C:\\texlive\\2025\\bin\\win32\\pdflatex.exe',
        'C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe',
        'C:\\Program Files (x86)\\MiKTeX\\miktex\\bin\\pdflatex.exe',
        process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local', 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64', 'pdflatex.exe') : null
      ).filter(Boolean); // Remove null entries
    } else {
      // Linux and other Unix-like systems
      paths.push(
        '/usr/bin/pdflatex',
        '/usr/local/bin/pdflatex',
        '/usr/local/texlive/2023/bin/x86_64-linux/pdflatex',
        '/usr/local/texlive/2024/bin/x86_64-linux/pdflatex',
        '/usr/local/texlive/2025/bin/x86_64-linux/pdflatex',
        '/opt/texlive/2023/bin/x86_64-linux/pdflatex',
        '/opt/texlive/2024/bin/x86_64-linux/pdflatex',
        '/opt/texlive/2025/bin/x86_64-linux/pdflatex'
      );
    }

    logger.info('Initialized LaTeX service', {
      platform: this.platform,
      searchPaths: paths.length
    });

    return paths;
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
          // Check if it's in PATH (OS-specific command)
          const checkCommand = this.platform === 'win32' ? 'where pdflatex' : 'which pdflatex';
          await new Promise((resolve, reject) => {
            exec(checkCommand, (error, stdout) => {
              if (error || !stdout.trim()) {
                reject(new Error('Not in PATH'));
              } else {
                resolve(stdout.trim());
              }
            });
          });
          this.pdflatexPath = 'pdflatex';
          logger.info('Found pdflatex in PATH', { platform: this.platform });
          return this.pdflatexPath;
        } else {
          // Check if file exists at specific path
          // On Windows, fs.constants.X_OK doesn't work the same way, so just check if file exists
          if (this.platform === 'win32') {
            await fs.access(pdflatexPath, fs.constants.F_OK);
          } else {
            await fs.access(pdflatexPath, fs.constants.X_OK);
          }
          this.pdflatexPath = pdflatexPath;
          logger.info('Found pdflatex', { path: pdflatexPath, platform: this.platform });
          return this.pdflatexPath;
        }
      } catch (error) {
        // Continue to next path
        continue;
      }
    }

    logger.error('pdflatex not found', {
      platform: this.platform,
      searchedPaths: this.pdflatexPaths.length
    });

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
        const installInstructions = this.getInstallInstructions();
        throw new Error(`pdflatex is not installed on this system. ${installInstructions}`);
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
   * Get OS-specific installation instructions
   */
  getInstallInstructions() {
    if (this.platform === 'darwin') {
      return 'Please install MacTeX: brew install --cask mactex or visit https://tug.org/mactex/';
    } else if (this.platform === 'win32') {
      return 'Please install MiKTeX from https://miktex.org/download or TeX Live from https://tug.org/texlive/';
    } else {
      return 'Please install TeX Live: sudo apt-get install texlive-full (Ubuntu/Debian) or sudo dnf install texlive-scheme-full (Fedora/RHEL)';
    }
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
