/**
 * Job Posting Extraction Prompt
 *
 * Extracts structured job information from scraped webpage content
 *
 * @param {string} webpageContent - The scraped webpage text/HTML content
 * @returns {string} - The formatted prompt for the LLM
 */
function createJobPostingExtractionPrompt(webpageContent) {
  return `Analyze the following webpage content and extract job posting information. You MUST return a JSON object with the following structure:

REQUIRED JSON FORMAT:
{
  "companyName": "",
  "jobTitle": "",
  "location": "",
  "jobDescription": "",
  "responsibilities": [],
  "requirements": [],
  "benefits": []
}

EXTRACTION INSTRUCTIONS:
1. companyName: Extract the hiring company name
2. jobTitle: Extract the job title/position name
3. location: Extract job location (city, state, country, or "Remote")
4. jobDescription: Extract the full job description - combine all relevant sections into a comprehensive paragraph or multiple paragraphs. This should include overview, what the role entails, and any additional context about the position.
5. responsibilities: Extract ONLY the key responsibilities/duties as an array of strings. Each item should be a clear, standalone responsibility.
6. requirements: Extract qualifications, skills, experience requirements as an array of strings
7. benefits: Extract any mentioned benefits, perks, compensation info as an array of strings

IMPORTANT GUIDELINES:
- If a field is not found, use empty string "" or empty array []
- For jobDescription: Combine all descriptive text about the role into coherent paragraphs
- For responsibilities: Extract bullet points or list items that describe what the person will DO in the role
- Be thorough - extract ALL relevant information from the posting
- Remove any HTML tags or formatting artifacts
- Clean up the text - remove extra whitespace and newlines
- Return ONLY the JSON object, no additional text or explanation

WEBPAGE CONTENT:
${webpageContent}`;
}

module.exports = createJobPostingExtractionPrompt;
