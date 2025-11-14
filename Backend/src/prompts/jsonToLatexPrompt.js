/**
 * JSON to LaTeX Conversion Prompt
 *
 * Converts structured JSON resume data into LaTeX code using a template
 *
 * @param {Object} jsonData - The structured resume data
 * @param {string} latexTemplate - The LaTeX template to fill
 * @returns {string} - The formatted prompt for the LLM
 */
function createJsonToLatexPrompt(jsonData, latexTemplate, structureMetadata = null) {
  let structureInstructions = '';

  if (structureMetadata) {
    structureInstructions = `

STRUCTURE PRESERVATION INSTRUCTIONS:
The original resume had the following structure and formatting. PRESERVE THESE CHARACTERISTICS in the generated LaTeX:

Section Order: ${structureMetadata.sectionOrder ? structureMetadata.sectionOrder.join(' → ') : 'Default order'}
Section Titles: ${JSON.stringify(structureMetadata.sectionTitles, null, 2)}

Layout Style: ${structureMetadata.layout?.style || 'single-column'}
Header Style: ${structureMetadata.layout?.headerStyle || 'centered'}
Margins: Top ${structureMetadata.layout?.margins?.top || '2cm'}, Bottom ${structureMetadata.layout?.margins?.bottom || '2cm'}, Left ${structureMetadata.layout?.margins?.left || '2cm'}, Right ${structureMetadata.layout?.margins?.right || '2cm'}

Fonts: Main = ${structureMetadata.formatting?.fonts?.main || 'Charter'}, Heading = ${structureMetadata.formatting?.fonts?.heading || 'Charter-Bold'}
Font Sizes: Name = ${structureMetadata.formatting?.fontSize?.name || '25pt'}, Section = ${structureMetadata.formatting?.fontSize?.section || '14pt'}, Body = ${structureMetadata.formatting?.fontSize?.body || '10pt'}
Colors: Primary = ${structureMetadata.formatting?.colors?.primary || 'RGB(0,0,0)'}, Accent = ${structureMetadata.formatting?.colors?.accent || 'RGB(0,0,0)'}
Spacing: Section Gap = ${structureMetadata.formatting?.spacing?.sectionGap || '0.3cm'}, Item Gap = ${structureMetadata.formatting?.spacing?.itemGap || '0.2cm'}
Bullet Style: ${structureMetadata.formatting?.bulletStyle || 'bullet'}

Visual Elements:
- Use section lines: ${structureMetadata.visualElements?.useSectionLines ? 'YES' : 'NO'}
- Use header line: ${structureMetadata.visualElements?.useHeaderLine ? 'YES' : 'NO'}
- Contact layout: ${structureMetadata.visualElements?.contactLayout || 'horizontal'}

IMPORTANT:
1. Follow the section order EXACTLY as specified above
2. Use the EXACT section titles from the original resume
3. Apply the specified margins, fonts, and spacing
4. Match the visual style (lines, bullet points, etc.)
5. If the original used a two-column layout, replicate that structure
6. Maintain the overall visual aesthetic of the original resume`;
  }

  return `You are a LaTeX resume generator. Convert the following JSON resume data into LaTeX code using the template format provided below.

IMPORTANT INSTRUCTIONS:
1. Use the template structure provided - keep the preamble, packages, and environment definitions
2. Fill in the template with data from the JSON - replace all "EDIT:" comments with actual data
3. For the header section, use the personalInfo data
4. For dates, format as "Month Year" (e.g., "January 2022", "December 2023")
5. For current positions, use "Current" or "Present" as the end date
6. Include ALL sections from the JSON data (Education, Experience, Internships if present, Technologies)
7. For Technologies section, use the table format from the template
8. Remove any rows in the Technologies table that don't apply to this resume
${structureInstructions}

TEMPLATE TO USE:
${latexTemplate}

JSON RESUME DATA:
${JSON.stringify(jsonData, null, 2)}

Return ONLY the complete filled LaTeX code. Do not include any explanations, comments, or markdown formatting. The output should be ready to compile directly.`;
}

module.exports = createJsonToLatexPrompt;
