/**
 * LaTeX Error Fix Prompt
 *
 * Fixes compilation errors in LaTeX code
 *
 * @param {string} buggyLatexCode - The LaTeX code with errors
 * @param {string} compilationError - The error message from the LaTeX compiler
 * @returns {string} - The formatted prompt for the LLM
 */
function createLatexFixPrompt(buggyLatexCode, compilationError) {
  return `The following LaTeX code has compilation errors. Please fix the errors and return the corrected LaTeX code.

IMPORTANT INSTRUCTIONS:
1. Fix ONLY the compilation errors - do NOT change the template structure, formatting, or style
2. Keep all packages, environment definitions, and custom commands unchanged
3. Preserve the exact spacing, indentation, and layout of the original code
4. Only modify the specific parts causing the compilation error
5. Maintain the professional resume template format

COMPILATION ERROR:
${compilationError}

BUGGY LATEX CODE:
${buggyLatexCode}

Please analyze the error and fix the LaTeX code. Return ONLY the complete corrected LaTeX code that can be directly compiled. Do not include any explanations or markdown formatting.`;
}

module.exports = createLatexFixPrompt;
