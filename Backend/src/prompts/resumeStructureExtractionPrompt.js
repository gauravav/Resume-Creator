/**
 * Resume Structure Extraction Prompt
 *
 * Extracts structural and formatting information from resume text
 * This metadata is used to preserve the original layout when generating new resumes
 *
 * @param {string} resumeText - The raw resume text to analyze
 * @returns {string} - The formatted prompt for the LLM
 */
function createResumeStructureExtractionPrompt(resumeText) {
  return `Analyze the following resume text and extract its structural and formatting characteristics. You MUST return a JSON object following this EXACT template:

TEMPLATE TO FOLLOW STRICTLY:
{
  "sectionOrder": [],
  "sectionTitles": {},
  "layout": {
    "style": "single-column",
    "headerStyle": "centered",
    "margins": {
      "top": "2cm",
      "bottom": "2cm",
      "left": "2cm",
      "right": "2cm"
    }
  },
  "formatting": {
    "fonts": {
      "main": "Charter",
      "heading": "Charter-Bold"
    },
    "fontSize": {
      "name": "25pt",
      "section": "14pt",
      "body": "10pt"
    },
    "colors": {
      "primary": "RGB(0,0,0)",
      "accent": "RGB(0,0,0)"
    },
    "spacing": {
      "sectionGap": "0.3cm",
      "itemGap": "0.2cm"
    },
    "bulletStyle": "bullet"
  },
  "visualElements": {
    "useSectionLines": true,
    "useHeaderLine": false,
    "contactLayout": "horizontal"
  }
}

EXTRACTION INSTRUCTIONS:

1. **sectionOrder** (array of strings):
   - Determine the ORDER in which sections appear in the resume (top to bottom)
   - Common sections: "summary", "experience", "education", "projects", "technologies", "internships", "certifications", "awards"
   - Example: ["summary", "experience", "education", "projects", "technologies"]
   - Only include sections that are actually present in the resume

2. **sectionTitles** (object):
   - Extract the EXACT titles/headings used for each section in the original resume
   - Key: section type (normalized), Value: actual title as it appears in the resume
   - Examples:
     * "summary": "Professional Summary" or "Career Objective" or "About Me"
     * "experience": "Work Experience" or "Professional Experience" or "Employment History"
     * "education": "Education" or "Academic Background" or "Qualifications"
     * "projects": "Projects" or "Notable Projects" or "Key Projects"
     * "technologies": "Technical Skills" or "Skills" or "Technologies" or "Core Competencies"

3. **layout.style**:
   - "single-column": All content in one column
   - "two-column": Content split into two columns (typically left/right)
   - "hybrid": Mix of single and two-column sections

4. **layout.headerStyle**:
   - "centered": Name and contact info centered at top
   - "left-aligned": Name and contact info aligned to left
   - "two-column": Name on left, contact info on right
   - "full-width": Name spans full width, contact info below

5. **layout.margins**:
   - Estimate the page margins based on text density
   - Standard: {"top": "2cm", "bottom": "2cm", "left": "2cm", "right": "2cm"}
   - Compact: {"top": "1.5cm", "bottom": "1.5cm", "left": "1.5cm", "right": "1.5cm"}
   - Spacious: {"top": "2.5cm", "bottom": "2.5cm", "left": "2.5cm", "right": "2.5cm"}

6. **formatting.fonts**:
   - Infer font family from visual cues if possible
   - Default to professional fonts: Charter, Times New Roman, Calibri, Arial, Helvetica
   - "main": body text font
   - "heading": section heading font (often same as main but bold)

7. **formatting.fontSize**:
   - Estimate relative font sizes:
   - "name": size for the person's name (typically 20-28pt)
   - "section": size for section headings (typically 12-16pt)
   - "body": size for regular text (typically 10-12pt)

8. **formatting.colors**:
   - Detect if any colors are used for emphasis
   - Default to black RGB(0,0,0) if no colors detected
   - Common patterns: accent color for section headers or name

9. **formatting.spacing**:
   - "sectionGap": Space between sections (0.2cm to 0.5cm typical)
   - "itemGap": Space between items within a section (0.1cm to 0.3cm typical)
   - Compact resume: smaller values, Spacious resume: larger values

10. **formatting.bulletStyle**:
    - "bullet": Traditional bullet points (•)
    - "dash": Dashes (-)
    - "arrow": Arrows (→)
    - "none": No bullets, just indented text
    - "numbered": Numbered list (1., 2., 3.)

11. **visualElements.useSectionLines**:
    - true: Horizontal lines under section headings
    - false: No lines

12. **visualElements.useHeaderLine**:
    - true: Horizontal line under header/contact info
    - false: No line under header

13. **visualElements.contactLayout**:
    - "horizontal": Contact info in a single line with separators (|)
    - "vertical": Contact info stacked vertically
    - "grid": Contact info in a grid/table format

IMPORTANT:
- Analyze the resume text carefully to detect its actual structure
- Be specific about section titles - use the EXACT wording from the resume
- For fonts, colors, and sizes, make educated guesses based on typical resume patterns
- Return ONLY the JSON object with no additional text or explanations

Resume text to analyze:
${resumeText}`;
}

module.exports = createResumeStructureExtractionPrompt;
