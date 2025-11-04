const latexService = require('../services/latexService');
const logger = require('../utils/logger');

/**
 * Convert LaTeX to PDF
 * POST /api/latex/convert
 * Body: { latexContent: string, fileName?: string }
 */
exports.convertLatexToPdf = async (req, res) => {
  const startTime = Date.now();
  const { latexContent, fileName } = req.body;

  try {
    // Validate request
    if (!latexContent) {
      return res.status(400).json({
        success: false,
        message: 'LaTeX content is required'
      });
    }

    // Validate LaTeX content
    const validation = latexService.validateLatexContent(latexContent);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    logger.info('LaTeX to PDF conversion requested', {
      userId: req.user?.id,
      fileName: fileName || 'document',
      contentLength: latexContent.length
    });

    // Convert LaTeX to PDF
    const pdfBuffer = await latexService.convertLatexToPdf(
      latexContent,
      fileName || 'document'
    );

    const processingTime = Date.now() - startTime;

    logger.info('LaTeX to PDF conversion completed', {
      userId: req.user?.id,
      fileName: fileName || 'document',
      pdfSize: pdfBuffer.length,
      processingTime
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName || 'document'}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('X-Processing-Time', processingTime);

    // Send PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    logger.error('LaTeX to PDF conversion failed', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to convert LaTeX to PDF',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Check LaTeX system status
 * GET /api/latex/status
 */
exports.checkLatexStatus = async (req, res) => {
  try {
    const isInstalled = await latexService.checkPdfLatexInstalled();

    res.json({
      success: true,
      pdflatex: {
        installed: isInstalled,
        message: isInstalled
          ? 'pdflatex is available and ready to use'
          : 'pdflatex is not installed. Please install MacTeX or TeX Live.'
      }
    });
  } catch (error) {
    logger.error('LaTeX status check failed', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to check LaTeX status'
    });
  }
};

/**
 * Validate LaTeX content
 * POST /api/latex/validate
 * Body: { latexContent: string }
 */
exports.validateLatex = async (req, res) => {
  try {
    const { latexContent } = req.body;

    if (!latexContent) {
      return res.status(400).json({
        success: false,
        message: 'LaTeX content is required'
      });
    }

    const validation = latexService.validateLatexContent(latexContent);

    res.json({
      success: validation.valid,
      valid: validation.valid,
      message: validation.valid ? 'LaTeX content is valid' : validation.error
    });

  } catch (error) {
    logger.error('LaTeX validation failed', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to validate LaTeX content'
    });
  }
};
