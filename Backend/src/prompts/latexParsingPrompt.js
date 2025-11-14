/**
 * LaTeX Parsing Prompt
 *
 * Converts raw resume text into professional LaTeX format
 *
 * @param {string} resumeText - The raw resume text to convert
 * @returns {string} - The formatted prompt for the LLM
 */
function createLatexParsingPrompt(resumeText) {
  return `Parse the following resume text and convert it to a professional LaTeX document format.

REQUIREMENTS:
1. Use \\documentclass{article} with appropriate packages (geometry, enumitem, hyperref, xcolor, etc.)
2. Create a clean, professional single-column resume layout
3. Include all sections: Personal Information, Summary/Objective, Education, Experience, Skills/Technologies, Projects
4. Use proper LaTeX formatting for:
   - Section headers (\\section{})
   - Subsections for job positions
   - Bullet points for responsibilities (\\begin{itemize})
   - Dates and durations
   - Contact information with hyperlinks for email, LinkedIn, GitHub, etc.
5. Apply professional styling with proper spacing and margins
6. Use modern resume design patterns (no outdated formatting)
7. Ensure the document compiles correctly with pdflatex
8. Include proper LaTeX escaping for special characters (&, %, $, #, etc.)

FORMATTING GUIDELINES:
- Use \\textbf{} for emphasis on job titles, company names, and section headers
- Use \\textit{} for dates and locations
- Use \\href{}{} for all URLs
- Keep margins reasonable (1 inch or 0.75 inch)
- Use consistent spacing between sections
- Format dates as "Month Year - Month Year" or "Month Year - Present"

Return ONLY the complete LaTeX code that can be directly compiled. Do not include any explanations or markdown formatting.

Resume text to convert:
${resumeText}`;
}

module.exports = createLatexParsingPrompt;
