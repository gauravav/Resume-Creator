/**
 * Resume Customization Prompt
 *
 * Tailors a resume to match a specific job description by modifying
 * summary, responsibilities, and technologies sections
 *
 * @param {Object} resumeData - The structured resume data (JSON)
 * @param {string} jobDescription - The job description to tailor the resume for
 * @returns {string} - The formatted prompt for the LLM
 */
function createResumeCustomizationPrompt(resumeData, jobDescription) {
  return `You are an expert resume optimizer. I need you to modify ONLY specific sections of the following resume to better match a job opportunity.

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME DATA:
${JSON.stringify(resumeData, null, 2)}

TARGETED CUSTOMIZATION INSTRUCTIONS:
1. Keep the EXACT same JSON structure and format - do not add, remove, or rename any fields
2. Analyze the job description and identify key requirements, skills, and keywords
3. ONLY modify these THREE sections (leave everything else unchanged):

   A. SUMMARY SECTION:
   - Rewrite the "summary" field to highlight relevant experience for this specific role
   - Use keywords from the job description
   - Emphasize skills and experience that match the job requirements
   - Keep it concise and impactful (2-3 sentences)

   B. WORK EXPERIENCE RESPONSIBILITIES:
   - Modify ONLY the "responsibilities" arrays within the "experience" section
   - CRITICAL: Maintain the SAME number of responsibility points as in the original resume for each experience
   - Edit existing responsibility points to emphasize relevant achievements and match job requirements
   - You MAY add new responsibility points ONLY if highly relevant to the job description
   - If adding new points, keep the total reasonable (don't exceed original count by more than 1-2 points)
   - Reorder points to put most relevant ones first
   - Use action verbs and quantifiable results where possible
   - Highlight technologies, skills, and accomplishments that match the job
   - Do NOT remove existing responsibilities unless they are completely irrelevant
   - Do NOT change position titles, company names, dates, or locations

   C. TECHNOLOGIES SECTION:
   - Review ALL technology categories and items
   - You MAY rename category names to better match the job description (e.g., "Programming Languages" → "Languages", "Backend" → "Server-Side Technologies")
   - You MAY create NEW technology categories if they align with the job requirements (e.g., "Machine Learning", "Data Engineering", "Mobile Development")
   - You MAY add technologies mentioned in the job description IF they are commonly associated with existing skills
   - You MAY remove technologies that are completely unrelated to the job requirements
   - Reorder items within each category to put most relevant technologies first
   - Ensure technologies mentioned in the job description are prominently placed
   - Keep the overall technology list realistic and honest - don't add technologies you don't have
   - Prioritize categories and technologies that match the job description

4. CRITICAL CONSTRAINTS:
   - Do NOT modify personal information, education, project details, internships, or any other sections
   - Do NOT fabricate new experiences, skills, or technologies
   - Do NOT change company names, job titles, dates, or educational institutions
   - Only enhance and reorder existing content within the specified sections

5. Return ONLY the complete modified JSON resume data - no explanations or additional text

Focus on making the summary, work experience points, and technology ordering highly relevant to this job opportunity:`;
}

module.exports = createResumeCustomizationPrompt;
