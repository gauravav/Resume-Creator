/**
 * Resume Parsing Prompt
 *
 * Converts raw resume text into structured JSON format
 *
 * @param {string} resumeText - The raw resume text to parse
 * @returns {string} - The formatted prompt for the LLM
 */
function createResumeParsingPrompt(resumeText) {
  return `Parse the following resume text and extract structured information. You MUST return a JSON object that follows this EXACT template structure. Do not deviate from this format:

TEMPLATE TO FOLLOW STRICTLY:
{
  "personalInfo": {
    "firstName": "",
    "lastName": "",
    "location": {
      "city": "",
      "state": "",
      "country": "",
      "remote": false
    },
    "email": "",
    "phone": "",
    "website": "",
    "socialMedia": {
      "linkedin": "",
      "github": ""
    }
  },
  "summary": [""],
  "education": [
    {
      "institution": "",
      "degree": "",
      "major": "",
      "duration": {
        "start": {
          "month": "",
          "year": null,
          "day": null
        },
        "end": {
          "month": "",
          "year": null,
          "day": null
        }
      },
      "coursework": []
    }
  ],
  "experience": [
    {
      "position": "",
      "company": "",
      "location": {
        "city": "",
        "state": "",
        "country": "",
        "remote": false
      },
      "duration": {
        "start": {
          "month": "",
          "year": null,
          "day": null
        },
        "end": {
          "month": "",
          "year": null,
          "day": null
        }
      },
      "responsibilities": []
    }
  ],
  "internships": [
    {
      "position": "",
      "company": "",
      "location": {
        "city": "",
        "state": "",
        "country": "",
        "remote": false
      },
      "duration": {
        "start": {
          "month": "",
          "year": null,
          "day": null
        },
        "end": {
          "month": "",
          "year": null,
          "day": null
        }
      },
      "responsibilities": []
    }
  ],
  "projects": [
    {
      "name": "",
      "description": [],
      "toolsUsed": []
    }
  ],
  "technologies": [
    {
      "category": "",
      "items": []
    }
  ]
}

PARSING INSTRUCTIONS:
1. Use the above template structure EXACTLY - do not add, remove, or rename any fields
2. Fill in the empty strings and arrays with extracted data from the resume
3. For summary: Extract professional summary as an ARRAY.
   - If the summary is a SINGLE PARAGRAPH with no bullet points, keep it as ONE array element (do not split it)
   - If the summary has MULTIPLE BULLET POINTS or distinct separate points, then each bullet point should be a separate array element
   - Preserve the original structure - only split if the resume already has it split into bullets
4. Split full names: "John Doe" becomes firstName: "John", lastName: "Doe"
5. For dates: use month names (e.g., "January") and 4-digit years, set day to null
6. For current positions: leave end month empty "", but include current year
7. Set remote: true only if location explicitly mentions remote work
8. For technologies: IMPORTANT - Look for ANY section that lists technical skills, tools, or technologies.
   These sections may be named:
   - "Technical Skills" / "Skills" / "Core Skills"
   - "Technologies" / "Tech Stack"
   - "Technical Competencies" / "Core Competencies"
   - "Tools & Technologies" / "Tools"
   - "Areas of Expertise"
   - Or any similar variation

   Extract ALL technologies from these sections and organize them into DYNAMIC categories.
   Each category should have a meaningful name and contain relevant technologies.

   Examples of good categories:
   - "Programming Languages": ["Python", "Java", "JavaScript", "C++"]
   - "Frameworks & Libraries": ["React", "Node.js", "Django", "Express"]
   - "Databases": ["PostgreSQL", "MongoDB", "Redis"]
   - "Cloud & DevOps": ["AWS", "Docker", "Kubernetes", "Azure"]
   - "Tools & Technologies": ["Git", "Jenkins", "GitHub Actions"]
   - "Data Science & ML": ["TensorFlow", "Pandas", "Scikit-learn"]
   - "Mobile Development": ["React Native", "Swift", "Kotlin"]

   Create categories that make sense for THIS specific resume. Don't force technologies into predefined categories.
   If the resume has web technologies, you might create "Frontend" and "Backend" categories.
   If it has data science tools, create a "Data Science" or "Machine Learning" category.
   Be flexible and contextual. Look at how the resume organizes its skills and mirror that structure.

9. If no data is found for a section, use empty arrays [] or empty strings ""
10. Return ONLY the JSON object with no additional text, explanations, or comments

Resume text to parse:
${resumeText}`;
}

module.exports = createResumeParsingPrompt;
