const OpenAI = require('openai');

class DeepSeekService {
  constructor() {
    this.apiKey = process.env.DEEPSEEKER_API_KEY;
    this.baseURL = process.env.DEEPSEEKER_BASE_URL || 'https://api.deepseek.com';
    this.modelName = process.env.DEEPSEEKER_MODEL || 'deepseek-chat';
    this.timeout = parseInt(process.env.DEEPSEEKER_TIMEOUT || '30000');

    this.client = new OpenAI({
      baseURL: this.baseURL,
      apiKey: this.apiKey,
      timeout: this.timeout
    });
  }

  async generateContent(prompt, options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('DeepSeek API key not found in environment variables');
      }

      console.log('=== DEEPSEEK API CALL ===');
      console.log('Model:', this.modelName);
      console.log('Prompt length:', prompt.length);

      const completion = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000
      });

      console.log('DeepSeek API responded successfully');

      if (completion.choices && completion.choices[0]) {
        const generatedText = completion.choices[0].message.content;
        console.log('Generated text length:', generatedText.length);
        return generatedText;
      }

      throw new Error('Invalid response structure from DeepSeek API');

    } catch (error) {
      console.error('=== DEEPSEEK API ERROR ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);

      if (error.code === 'ECONNABORTED') {
        console.error('❌ CONNECTION TIMEOUT - DeepSeek API took too long to respond');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('❌ CONNECTION REFUSED - Cannot connect to DeepSeek API');
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
        throw new Error('DeepSeek API key not found in environment variables');
      }

      console.log('=== DEEPSEEK CHAT COMPLETION ===');
      console.log('Messages count:', messages.length);

      const completion = await this.client.chat.completions.create({
        model: this.modelName,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000
      });

      console.log('DeepSeek API responded successfully');

      if (completion.choices && completion.choices[0]) {
        const generatedText = completion.choices[0].message.content;
        return {
          content: generatedText,
          usage: completion.usage || null
        };
      }

      throw new Error('Invalid response structure from DeepSeek API');

    } catch (error) {
      console.error('=== DEEPSEEK CHAT COMPLETION ERROR ===');
      console.error('Error:', error.message);
      throw error;
    }
  }
}

module.exports = new DeepSeekService();
