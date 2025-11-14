/**
 * LaTeX to JSON Conversion Prompt
 *
 * Converts LaTeX resume code into structured JSON format
 *
 * @param {string} latexCode - The LaTeX code to convert
 * @returns {string} - The formatted prompt for the LLM
 */
function createLatexToJsonPrompt(latexCode) {
  return `Convert the following LaTeX resume code into a structured JSON format that matches this schema:

{
  "personalInfo": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "website": "string",
    "location": {
      "city": "string",
      "state": "string",
      "country": "string",
      "remote": boolean
    },
    "socialMedia": {
      "linkedin": "string",
      "github": "string"
    }
  },
  "summary": ["string"],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "major": "string",
      "duration": {
        "start": { "month": "string", "year": number, "day": null },
        "end": { "month": "string", "year": number, "day": null }
      },
      "coursework": ["string"]
    }
  ],
  "experience": [
    {
      "position": "string",
      "company": "string",
      "location": { "city": "string", "state": "string", "country": "string", "remote": boolean },
      "duration": {
        "start": { "month": "string", "year": number, "day": null },
        "end": { "month": "string", "year": number, "day": null }
      },
      "responsibilities": ["string"]
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": ["string"],
      "toolsUsed": ["string"]
    }
  ],
  "technologies": [
    {
      "category": "string",
      "items": ["string"]
    }
  ]
}

Extract all information from the LaTeX code accurately. Return ONLY valid JSON with no additional text or explanations.

LaTeX code:
${latexCode}`;
}

module.exports = createLatexToJsonPrompt;
