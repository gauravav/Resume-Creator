/**
 * Responsibility Rewrite Prompt
 *
 * Rewrites a single resume bullet point based on user instructions
 *
 * @param {string} originalText - The original responsibility text
 * @param {string} userPrompt - The user's rewrite instructions
 * @returns {string} - The formatted prompt for the LLM
 */
function createResponsibilityRewritePrompt(originalText, userPrompt) {
  return `You are an expert resume writer. Your task is to rewrite a single responsibility/bullet point from a resume based on the user's specific instructions.

ORIGINAL TEXT:
"${originalText}"

USER'S REWRITE INSTRUCTIONS:
"${userPrompt}"

GUIDELINES:
1. Follow the user's instructions precisely
2. Keep it as a single bullet point (don't create multiple points)
3. Use strong action verbs and quantifiable results when possible
4. Make it concise and impactful
5. Maintain professional resume language
6. If the user asks for specific improvements (like adding metrics, making it more action-oriented, etc.), implement those changes

Return ONLY the rewritten bullet point - no explanations or additional text.`;
}

module.exports = createResponsibilityRewritePrompt;
