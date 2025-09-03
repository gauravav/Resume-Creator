const LLMResumeParser = require('../utils/llmResumeParser');

const rewriteResponsibility = async (req, res) => {
  try {
    const { originalText, prompt } = req.body;
    
    if (!originalText || !prompt) {
      return res.status(400).json({ error: 'Original text and rewrite prompt are required' });
    }

    console.log('Rewriting responsibility:', {
      originalText: originalText.substring(0, 100) + '...',
      prompt: prompt.substring(0, 100) + '...'
    });

    // Use the LLM to rewrite the responsibility point
    const rewrittenText = await LLMResumeParser.rewriteResponsibility(originalText.trim(), prompt.trim());
    
    res.json({
      success: true,
      rewrittenText: rewrittenText.trim()
    });
  } catch (error) {
    console.error('Rewrite responsibility error:', error);
    res.status(500).json({ error: 'Failed to rewrite responsibility' });
  }
};

module.exports = {
  rewriteResponsibility
};