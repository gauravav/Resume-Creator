const { parentPort } = require('worker_threads');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Worker thread for CPU-intensive text extraction operations
 * This prevents blocking the main event loop during PDF/DOCX parsing
 */

if (!parentPort) {
  throw new Error('This file must be run as a Worker thread');
}

parentPort.on('message', async ({ buffer, mimeType, taskId }) => {
  try {
    let text = '';

    if (mimeType === 'application/pdf') {
      // CPU-intensive PDF parsing
      const data = await pdfParse(Buffer.from(buffer));
      text = data.text;
    } else if (mimeType === 'application/msword') {
      // For .doc files (older format)
      text = Buffer.from(buffer).toString('utf8');
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // For .docx files - CPU intensive
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      text = result.value;
    } else {
      throw new Error(`Unsupported MIME type: ${mimeType}`);
    }

    // Send success result back to main thread
    parentPort.postMessage({
      taskId,
      success: true,
      text
    });
  } catch (error) {
    // Send error back to main thread
    parentPort.postMessage({
      taskId,
      success: false,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
});

// Handle worker errors
process.on('uncaughtException', (error) => {
  console.error('Worker uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Worker unhandled rejection:', reason);
  process.exit(1);
});
