const pool = require('../config/database');
const { minioClient, BUCKET_NAME } = require('../config/minio');
const latexService = require('./latexService');
const LLMResumeParser = require('../utils/llmResumeParser');
const { recordTokenUsage } = require('../controllers/tokenController');
const sseManager = require('./sseManager');
const logger = require('../utils/logger');

/**
 * Generate PDF from resume JSON data and store in MinIO
 * This function runs asynchronously in the background
 */
async function generatePDFInBackground(resumeId, userId, resumeData) {
  try {
    logger.info('🚀 Starting background PDF generation', { resumeId, userId });

    // Update status to 'generating'
    await pool.query(
      'UPDATE parsed_resumes SET pdf_status = $1 WHERE id = $2',
      ['generating', resumeId]
    );

    // Broadcast SSE event
    sseManager.broadcastPDFUpdate(userId, {
      resumeId,
      status: 'generating',
      message: 'PDF generation started'
    });

    let latexContent;
    let totalTokensUsed = 0;
    let correctionAttempts = 0;
    const MAX_CORRECTION_ATTEMPTS = 3;

    // Fetch structure metadata from database
    logger.info('📋 Fetching structure metadata...', { resumeId });
    let structureMetadata = null;
    try {
      const metadataResult = await pool.query(
        'SELECT structure_metadata FROM parsed_resumes WHERE id = $1',
        [resumeId]
      );
      if (metadataResult.rows.length > 0 && metadataResult.rows[0].structure_metadata) {
        structureMetadata = metadataResult.rows[0].structure_metadata;
        logger.info('✅ Structure metadata found', { resumeId });
      } else {
        logger.warn('⚠️ No structure metadata found, using default', { resumeId });
      }
    } catch (metadataError) {
      logger.error('Failed to fetch structure metadata, continuing without it', {
        resumeId,
        error: metadataError.message
      });
    }

    // Step 1: Convert JSON to LaTeX using LLM with structure preservation
    logger.info('📝 Converting JSON to LaTeX...', { resumeId });
    try {
      const result = await LLMResumeParser.jsonToLatex(resumeData, structureMetadata);
      latexContent = result.latexCode;

      // Track initial conversion tokens
      if (result.usage && result.usage.total_tokens) {
        totalTokensUsed += result.usage.total_tokens;
        await recordTokenUsage(userId, 'json_to_latex', result.usage.total_tokens, {
          operation: 'pdf_generation',
          resume_id: resumeId
        });
      }
    } catch (error) {
      logger.error('❌ JSON to LaTeX conversion failed', { resumeId, error: error.message });
      await pool.query(
        'UPDATE parsed_resumes SET pdf_status = $1 WHERE id = $2',
        ['failed', resumeId]
      );

      // Broadcast SSE event
      sseManager.broadcastPDFUpdate(userId, {
        resumeId,
        status: 'failed',
        message: 'Failed to convert resume to LaTeX format'
      });

      return;
    }

    // Step 2: Convert LaTeX to PDF with retry logic for compilation errors
    logger.info('📄 Converting LaTeX to PDF...', { resumeId });
    let pdfBuffer;
    const baseFileName = `${resumeData.personalInfo.firstName}_${resumeData.personalInfo.lastName}_Resume`;

    while (correctionAttempts <= MAX_CORRECTION_ATTEMPTS) {
      try {
        pdfBuffer = await latexService.convertLatexToPdf(latexContent, baseFileName);
        logger.info('✅ LaTeX compiled successfully to PDF', { resumeId });
        break; // Success! Exit the retry loop
      } catch (error) {
        logger.error(`LaTeX compilation error (attempt ${correctionAttempts + 1}/${MAX_CORRECTION_ATTEMPTS + 1})`, {
          resumeId,
          error: error.message
        });

        if (correctionAttempts >= MAX_CORRECTION_ATTEMPTS) {
          // Max attempts reached, mark as failed
          logger.error('❌ Max correction attempts reached. PDF generation failed.', { resumeId });
          await pool.query(
            'UPDATE parsed_resumes SET pdf_status = $1 WHERE id = $2',
            ['failed', resumeId]
          );

          // Broadcast SSE event
          sseManager.broadcastPDFUpdate(userId, {
            resumeId,
            status: 'failed',
            message: 'PDF compilation failed after multiple attempts'
          });

          return;
        }

        // Try to fix the LaTeX using LLM
        logger.info(`🔧 Attempting to fix LaTeX errors using LLM (attempt ${correctionAttempts + 1})...`, { resumeId });
        try {
          const fixResult = await LLMResumeParser.fixLatexErrors(latexContent, error.message);
          latexContent = fixResult.latexCode;
          correctionAttempts++;

          // Track correction tokens separately
          if (fixResult.usage && fixResult.usage.total_tokens) {
            totalTokensUsed += fixResult.usage.total_tokens;
            await recordTokenUsage(userId, 'latex_error_correction', fixResult.usage.total_tokens, {
              operation: 'pdf_generation_fix',
              attempt: correctionAttempts,
              resume_id: resumeId,
              error_type: 'compilation_error'
            });
          }

          logger.info(`✅ LaTeX code corrected by LLM. Retrying compilation...`, { resumeId });
        } catch (fixError) {
          logger.error('Failed to fix LaTeX errors', { resumeId, error: fixError.message });
          await pool.query(
            'UPDATE parsed_resumes SET pdf_status = $1 WHERE id = $2',
            ['failed', resumeId]
          );

          // Broadcast SSE event
          sseManager.broadcastPDFUpdate(userId, {
            resumeId,
            status: 'failed',
            message: 'Failed to correct LaTeX errors automatically'
          });

          return;
        }
      }
    }

    // Step 3: Store PDF in MinIO
    logger.info('💾 Storing PDF in MinIO...', { resumeId });
    const pdfFileName = `pdf-${Date.now()}-${baseFileName}.pdf`;

    try {
      await minioClient.putObject(
        BUCKET_NAME,
        pdfFileName,
        pdfBuffer,
        pdfBuffer.length,
        {
          'Content-Type': 'application/pdf',
          'X-Resume-Id': resumeId.toString(),
          'X-User-Id': userId.toString()
        }
      );

      logger.info('✅ PDF stored successfully in MinIO', { resumeId, pdfFileName });
    } catch (error) {
      logger.error('❌ Failed to store PDF in MinIO', { resumeId, error: error.message });
      await pool.query(
        'UPDATE parsed_resumes SET pdf_status = $1 WHERE id = $2',
        ['failed', resumeId]
      );

      // Broadcast SSE event
      sseManager.broadcastPDFUpdate(userId, {
        resumeId,
        status: 'failed',
        message: 'Failed to store PDF file'
      });

      return;
    }

    // Step 4: Update database with PDF info
    try {
      await pool.query(
        `UPDATE parsed_resumes
         SET pdf_file_name = $1, pdf_status = $2, pdf_generated_at = NOW()
         WHERE id = $3`,
        [pdfFileName, 'ready', resumeId]
      );

      logger.info('🎉 PDF generation completed successfully', {
        resumeId,
        pdfFileName,
        totalTokensUsed,
        correctionAttempts
      });

      // Broadcast SSE event - PDF is ready!
      sseManager.broadcastPDFUpdate(userId, {
        resumeId,
        status: 'ready',
        pdfFileName,
        message: 'PDF generated successfully and ready for download'
      });
    } catch (error) {
      logger.error('❌ Failed to update database with PDF info', { resumeId, error: error.message });
    }

  } catch (error) {
    logger.error('❌ Unexpected error in PDF generation', {
      resumeId,
      error: error.message,
      stack: error.stack
    });

    try {
      await pool.query(
        'UPDATE parsed_resumes SET pdf_status = $1 WHERE id = $2',
        ['failed', resumeId]
      );

      // Broadcast SSE event
      sseManager.broadcastPDFUpdate(userId, {
        resumeId,
        status: 'failed',
        message: 'Unexpected error during PDF generation'
      });
    } catch (dbError) {
      logger.error('❌ Failed to update PDF status to failed', { resumeId, error: dbError.message });
    }
  }
}

/**
 * Trigger PDF generation (fire and forget)
 */
function triggerPDFGeneration(resumeId, userId, resumeData) {
  // Run in background without blocking
  generatePDFInBackground(resumeId, userId, resumeData).catch(error => {
    logger.error('❌ Unhandled error in PDF generation background task', {
      resumeId,
      error: error.message,
      stack: error.stack
    });
  });

  logger.info('📤 PDF generation triggered in background', { resumeId });
}

module.exports = {
  triggerPDFGeneration,
  generatePDFInBackground
};
