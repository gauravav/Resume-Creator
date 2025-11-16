/**
 * LLM Prompts Module
 *
 * Central export for all LLM prompts used in the Resume Creator application
 */

const createResumeParsingPrompt = require('./resumeParsingPrompt');
const createResumeCustomizationPrompt = require('./resumeCustomizationPrompt');
const createResponsibilityRewritePrompt = require('./responsibilityRewritePrompt');
const createLatexParsingPrompt = require('./latexParsingPrompt');
const createLatexToJsonPrompt = require('./latexToJsonPrompt');
const createJsonToLatexPrompt = require('./jsonToLatexPrompt');
const createLatexFixPrompt = require('./latexFixPrompt');
const createResumeStructureExtractionPrompt = require('./resumeStructureExtractionPrompt');
const createJobPostingExtractionPrompt = require('./jobPostingExtractionPrompt');

module.exports = {
  createResumeParsingPrompt,
  createResumeCustomizationPrompt,
  createResponsibilityRewritePrompt,
  createLatexParsingPrompt,
  createLatexToJsonPrompt,
  createJsonToLatexPrompt,
  createLatexFixPrompt,
  createResumeStructureExtractionPrompt,
  createJobPostingExtractionPrompt
};
