const axios = require('axios');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.modelName = process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash-lite';
  }

  async generateContent(prompt, options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('Gemini API key not found in environment variables');
      }

      console.log('=== GEMINI API CALL ===');
      console.log('Model:', this.modelName);
      console.log('Prompt length:', prompt.length);

      const requestData = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 1000,
          topP: options.topP || 0.8,
          topK: options.topK || 10
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/models/${this.modelName}:generateContent`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': this.apiKey
          },
          timeout: 30000 // 30 second timeout
        }
      );

      console.log('Gemini API responded with status:', response.status);

      if (response.data && response.data.candidates && response.data.candidates[0]) {
        const content = response.data.candidates[0].content;
        if (content && content.parts && content.parts[0]) {
          const generatedText = content.parts[0].text;
          console.log('Generated text length:', generatedText.length);
          return generatedText;
        }
      }

      throw new Error('Invalid response structure from Gemini API');

    } catch (error) {
      console.error('=== GEMINI API ERROR ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);

      if (error.code === 'ECONNABORTED') {
        console.error('❌ CONNECTION TIMEOUT - Gemini API took too long to respond');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('❌ CONNECTION REFUSED - Cannot connect to Gemini API');
      } else if (error.response) {
        console.error('HTTP Status:', error.response.status);
        console.error('Response data:', error.response.data);
      }

      throw error;
    }
  }

  async chatCompletion(messages, options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('Gemini API key not found in environment variables');
      }

      console.log('=== GEMINI CHAT COMPLETION ===');
      console.log('Messages count:', messages.length);

      // Convert messages to Gemini format
      const contents = messages.map(message => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }]
      }));

      const requestData = {
        contents: contents,
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 1000,
          topP: options.topP || 0.8,
          topK: options.topK || 10
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/models/${this.modelName}:generateContent`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': this.apiKey
          },
          timeout: 30000
        }
      );

      console.log('Gemini API responded with status:', response.status);

      if (response.data && response.data.candidates && response.data.candidates[0]) {
        const content = response.data.candidates[0].content;
        if (content && content.parts && content.parts[0]) {
          const generatedText = content.parts[0].text;
          return {
            content: generatedText,
            usage: response.data.usageMetadata || null
          };
        }
      }

      throw new Error('Invalid response structure from Gemini API');

    } catch (error) {
      console.error('=== GEMINI CHAT COMPLETION ERROR ===');
      console.error('Error:', error.message);
      throw error;
    }
  }
}

module.exports = new GeminiService();