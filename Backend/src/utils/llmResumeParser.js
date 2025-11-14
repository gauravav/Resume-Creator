const axios = require('axios');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');
const geminiService = require('../services/geminiService');
const deepseekService = require('../services/deepseekService');
const WorkerPool = require('../workers/workerPool');
const {
  createResumeParsingPrompt,
  createResumeCustomizationPrompt,
  createResponsibilityRewritePrompt,
  createLatexParsingPrompt,
  createLatexToJsonPrompt,
  createJsonToLatexPrompt,
  createLatexFixPrompt,
  createResumeStructureExtractionPrompt
} = require('../prompts');

// Helper function to estimate token count (rough approximation)
const estimateTokenCount = (text) => {
  // Rough estimate: 1 token ≈ 4 characters on average
  return Math.ceil(text.length / 4);
};

// Initialize worker pool for text extraction (CPU-intensive operations)
const textExtractionWorkerPool = new WorkerPool(
  path.join(__dirname, '../workers/textExtractor.worker.js')
);

class LLMResumeParser {
  constructor() {
    // LLM Provider Configuration
    this.provider = process.env.LLM_PROVIDER || 'local'; // 'local' or 'cloud'

    // LM Studio Configuration (Local)
    this.llmApiUrl = process.env.LLM_API_URL || 'http://localhost:1234/v1';
    this.modelName = process.env.LLM_MODEL_NAME || 'deepseek-r1-distill-qwen-32b';

    // Reference to the shared worker pool
    this.workerPool = textExtractionWorkerPool;

    console.log(`🤖 LLM Provider: ${this.provider === 'cloud' ? 'DeepSeek Cloud' : 'LM Studio Local'}`);
  }

  async callLLM(messages, options = {}) {
    if (this.provider === 'cloud') {
      // Use DeepSeek API (max_tokens limit: 8192)
      try {
        const maxTokens = Math.min(options.maxTokens || 8192, 8192);
        const response = await deepseekService.chatCompletion(messages, {
          temperature: options.temperature || 0.1,
          maxTokens: maxTokens
        });

        return {
          content: response.content,
          usage: response.usage ? {
            total_tokens: response.usage.total_tokens || estimateTokenCount(messages.map(m => m.content).join('') + response.content)
          } : null
        };
      } catch (error) {
        console.error('DeepSeek API error:', error.message);
        throw error;
      }
    } else {
      // Use LM Studio
      const requestData = {
        model: this.modelName,
        messages: messages,
        temperature: options.temperature || 0.1,
        max_tokens: options.maxTokens || 12000
      };

      const response = await axios.post(`${this.llmApiUrl}/chat/completions`, requestData, {
        timeout: 240000 // 4 minute timeout
      });

      return {
        content: response.data.choices[0].message.content.trim(),
        usage: response.data.usage
      };
    }
  }

  async extractText(buffer, mimeType) {
    try {
      // Use worker pool for CPU-intensive text extraction
      // This prevents blocking the main event loop during PDF/DOCX parsing
      const startTime = Date.now();
      console.log(`📄 Starting text extraction using worker pool (MIME: ${mimeType})`);

      const text = await this.workerPool.execute({
        buffer: Array.from(buffer), // Convert Buffer to array for worker transfer
        mimeType
      });

      const duration = Date.now() - startTime;
      const stats = this.workerPool.getStats();
      console.log(`✅ Text extraction completed in ${duration}ms`);
      console.log(`📊 Worker Pool Stats:`, stats);

      return text;
    } catch (error) {
      console.error('Text extraction error:', error);

      // Fallback to synchronous extraction if worker fails
      console.warn('⚠️ Falling back to synchronous text extraction');
      try {
        let text = '';

        if (mimeType === 'application/pdf') {
          const data = await pdfParse(buffer);
          text = data.text;
        } else if (mimeType === 'application/msword') {
          text = buffer.toString('utf8');
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const result = await mammoth.extractRawText({buffer});
          text = result.value;
        }

        return text;
      } catch (fallbackError) {
        console.error('Fallback extraction also failed:', fallbackError);
        return '';
      }
    }
  }

  async parseResumeWithLLM(resumeText, userId = null) {
    try {
      console.log('=== LLM PARSING DEBUG ===');
      console.log('Provider:', this.provider === 'cloud' ? 'DeepSeek Cloud' : 'LM Studio Local');
      if (this.provider === 'local') {
        console.log('LLM API URL:', this.llmApiUrl);
        console.log('Model Name:', this.modelName);
      }
      console.log('Resume text length:', resumeText.length);
      console.log('=== RAW PDF TEXT BEING SENT TO LLM ===');
      console.log(resumeText);
      console.log('=== END RAW PDF TEXT ===');

      const prompt = createResumeParsingPrompt(resumeText);
      console.log(`Sending request to ${this.provider === 'cloud' ? 'DeepSeek' : 'LM Studio'}...`);
      
      const messages = [
        {
          role: "system",
          content: "You are an expert resume parser. Extract information from resumes and return ONLY valid JSON format. Do not include any explanation or additional text outside the JSON."
        },
        {
          role: "user", 
          content: prompt
        }
      ];
      
      console.log('Request payload prepared, making HTTP request...');
      
      const response = await this.callLLM(messages, {
        temperature: 0.1,
        maxTokens: 12000
      });
      
      console.log(`${this.provider === 'cloud' ? 'DeepSeek' : 'LM Studio'} responded successfully`);

      const llmResponse = response.content;
      
      // Track token usage if userId is provided
      if (userId && response.usage) {
        const tokensUsed = response.usage.total_tokens || estimateTokenCount(prompt + llmResponse);
        try {
          const { recordTokenUsage } = require('../controllers/tokenController');
          await recordTokenUsage(userId, 'resume_parsing', tokensUsed, {
            operation: 'parse_resume',
            input_length: resumeText.length,
            response_length: llmResponse.length
          });
          console.log(`✅ Recorded ${tokensUsed} tokens for resume parsing`);
        } catch (tokenError) {
          console.error('Failed to record token usage:', tokenError);
        }
      }
      
      console.log('=== LLM JSON OUTPUT ===');
      console.log('Raw LLM Response:', llmResponse);
      
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonString = jsonMatch[0];
        
        // Clean up common JSON issues
        jsonString = this.cleanJsonString(jsonString);
        
        try {
          const parsedData = JSON.parse(jsonString);
          console.log('✅ Successfully parsed JSON from LLM');
          console.log('Parsed JSON Output:', JSON.stringify(parsedData, null, 2));
          return this.validateAndNormalizeParsedData(parsedData);
        } catch (parseError) {
          console.error('❌ JSON Parse Error:', parseError.message);
          console.error('📍 Error occurred around position:', parseError.message.match(/position (\d+)/)?.[1] || 'unknown');
          console.log('🔧 Attempting JSON repair...');
          
          // Try to repair and parse again
          const repairedJson = this.repairJsonString(jsonString);
          try {
            const parsedData = JSON.parse(repairedJson);
            console.log('✅ Successfully repaired and parsed JSON');
            console.log('Repaired JSON Output:', JSON.stringify(parsedData, null, 2));
            return this.validateAndNormalizeParsedData(parsedData);
          } catch (repairError) {
            console.error('❌ JSON repair failed:', repairError.message);
            throw new Error('Failed to parse JSON from LLM response');
          }
        }
      } else {
        throw new Error('No valid JSON found in LLM response');
      }
      
    } catch (error) {
      console.error('=== LLM PARSING ERROR ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      
      if (error.code === 'ECONNABORTED') {
        console.error(`❌ CONNECTION TIMEOUT - The ${this.provider === 'cloud' ? 'DeepSeek API' : 'LLM service'} took too long to respond`);
        if (this.provider === 'local') {
          console.error('💡 Possible solutions:');
          console.error('   - Check if LLM service is running at', this.llmApiUrl);
          console.error('   - Verify the model', this.modelName, 'is loaded and available');
          console.error('   - Try restarting the LLM service');
          console.error('   - Consider using a smaller/faster model for testing');
        } else {
          console.error('💡 Check your internet connection and DeepSeek API status');
        }
      } else if (error.code === 'ECONNREFUSED') {
        console.error(`❌ CONNECTION REFUSED - Cannot connect to ${this.provider === 'cloud' ? 'DeepSeek API' : 'LLM service'}`);
        if (this.provider === 'local') {
          console.error('💡 Make sure the LLM service is running at', this.llmApiUrl);
        } else {
          console.error('💡 Check your internet connection and API key');
        }
      } else if (error.response) {
        console.error('HTTP Status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      if (error.code) {
        console.error('Error code:', error.code);
      }
      console.log('⚠️  Falling back to basic parsing...');
      
      // Fallback to basic parsing if LLM fails
      return this.fallbackParsing(resumeText);
    }
  }


  cleanJsonString(jsonString) {
    // Remove any trailing commas before closing brackets/braces
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix common escaping issues
    jsonString = jsonString.replace(/\\"/g, '"');
    jsonString = jsonString.replace(/\\n/g, '\\n');
    jsonString = jsonString.replace(/\\t/g, '\\t');
    
    return jsonString;
  }

  repairJsonString(jsonString) {
    try {
      // More aggressive repair attempts
      let repaired = jsonString;
      
      // Remove trailing commas more aggressively
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
      
      // Fix unescaped quotes in strings (basic attempt)
      repaired = repaired.replace(/"([^"]*)"([^"]*)"([^"]*)":/g, '"$1\\"$2\\"$3":');
      
      // Fix incomplete arrays/objects at the end
      let openBraces = (repaired.match(/\{/g) || []).length;
      let closeBraces = (repaired.match(/\}/g) || []).length;
      let openBrackets = (repaired.match(/\[/g) || []).length;
      let closeBrackets = (repaired.match(/\]/g) || []).length;
      
      // Add missing closing braces
      while (openBraces > closeBraces) {
        repaired += '}';
        closeBraces++;
      }
      
      // Add missing closing brackets
      while (openBrackets > closeBrackets) {
        repaired += ']';
        closeBrackets++;
      }
      
      return repaired;
    } catch (error) {
      console.error('Error during JSON repair:', error);
      return jsonString; // Return original if repair fails
    }
  }

  validateAndNormalizeParsedData(data) {
    // Helper function to ensure duration structure
    const ensureDuration = (duration) => ({
      start: {
        month: duration?.start?.month || "",
        year: duration?.start?.year || null,
        day: duration?.start?.day || null
      },
      end: {
        month: duration?.end?.month || "",
        year: duration?.end?.year || null,
        day: duration?.end?.day || null
      }
    });

    // Helper function to ensure location structure
    const ensureLocation = (location) => ({
      city: location?.city || "",
      state: location?.state || "",
      country: location?.country || "",
      remote: location?.remote || false
    });

    // Helper function to clean responsibilities (remove empty entries)
    const cleanResponsibilities = (responsibilities) => {
      return Array.isArray(responsibilities)
        ? responsibilities.filter(r => r && r.trim())
        : [];
    };

    // Ensure all required fields exist with defaults
    const normalized = {
      personalInfo: {
        firstName: data.personalInfo?.firstName || "",
        lastName: data.personalInfo?.lastName || "",
        location: ensureLocation(data.personalInfo?.location),
        email: data.personalInfo?.email || "",
        phone: data.personalInfo?.phone || "",
        website: data.personalInfo?.website || "",
        socialMedia: {
          linkedin: data.personalInfo?.socialMedia?.linkedin || "",
          github: data.personalInfo?.socialMedia?.github || ""
        }
      },
      summary: Array.isArray(data.summary) ? data.summary : (typeof data.summary === 'string' && data.summary.trim() ? [data.summary] : []),
      education: Array.isArray(data.education) ? data.education.map(edu => ({
        institution: edu.institution || "",
        degree: edu.degree || "",
        major: edu.major || "",
        duration: ensureDuration(edu.duration),
        coursework: Array.isArray(edu.coursework) ? edu.coursework : []
      })) : [],
      experience: Array.isArray(data.experience) ? data.experience.map(exp => ({
        position: exp.position || "",
        company: exp.company || "",
        location: ensureLocation(exp.location),
        duration: ensureDuration(exp.duration),
        responsibilities: cleanResponsibilities(exp.responsibilities)
      })) : [],
      internships: Array.isArray(data.internships) ? data.internships.map(int => ({
        position: int.position || "",
        company: int.company || "",
        location: ensureLocation(int.location),
        duration: ensureDuration(int.duration),
        responsibilities: cleanResponsibilities(int.responsibilities)
      })) : [],
      projects: Array.isArray(data.projects) ? data.projects.map(proj => ({
        name: proj.name || "",
        description: Array.isArray(proj.description) ? proj.description : [],
        toolsUsed: Array.isArray(proj.toolsUsed) ? proj.toolsUsed : []
      })) : [],
      technologies: Array.isArray(data.technologies) ? data.technologies.map(tech => ({
        category: tech.category || "",
        items: Array.isArray(tech.items) ? tech.items : []
      })) : []
    };

    return normalized;
  }

  // Fallback parsing using basic regex (updated to match new format)
  fallbackParsing(text) {
    console.log('Using fallback parsing method');
    
    const fullName = this.extractName(text);
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(' ') || "";
    
    return {
      personalInfo: {
        firstName,
        lastName,
        location: {
          city: "",
          state: "",
          country: "",
          remote: false
        },
        email: this.extractEmail(text),
        phone: this.extractPhone(text),
        website: "",
        socialMedia: {
          linkedin: this.extractLinkedIn(text),
          github: ""
        }
      },
      summary: this.extractSummary(text),
      education: [],
      experience: [],
      internships: [],
      projects: [],
      technologies: []
    };
  }

  extractName(text) {
    const nameMatch = text.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/m);
    return nameMatch ? nameMatch[1] : '';
  }

  extractEmail(text) {
    const emailMatch = text.match(/([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return emailMatch ? emailMatch[1] : '';
  }

  extractPhone(text) {
    const phoneMatch = text.match(/(\+?[\d\s\-\(\)]{10,})/);
    return phoneMatch ? phoneMatch[1].trim() : '';
  }

  extractLinkedIn(text) {
    const linkedinMatch = text.match(/(linkedin\.com\/in\/[a-zA-Z0-9\-]+)/i);
    return linkedinMatch ? 'https://' + linkedinMatch[1] : '';
  }

  extractSummary(text) {
    const summaryMatch = text.match(/(?:SUMMARY|PROFILE|OBJECTIVE|ABOUT)([\s\S]*?)(?:EXPERIENCE|EDUCATION|SKILLS|$)/i);
    if (summaryMatch) {
      return summaryMatch[1].trim().substring(0, 500);
    }
    
    const firstParagraph = text.split('\n\n')[0];
    if (firstParagraph && firstParagraph.length > 50) {
      return firstParagraph.substring(0, 500);
    }
    
    return '';
  }

  extractExperience(text) {
    const experiences = [];
    
    const experienceSection = text.match(/(?:EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT|PROFESSIONAL EXPERIENCE)([\s\S]*?)(?:EDUCATION|SKILLS|$)/i);
    if (experienceSection) {
      const expText = experienceSection[1];
      const jobEntries = expText.split(/\n(?=\d{4}|\w+\s+\d{4})/);
      
      jobEntries.forEach(entry => {
        const trimmed = entry.trim();
        if (trimmed.length > 20) {
          const lines = trimmed.split('\n').filter(line => line.trim());
          if (lines.length >= 2) {
            experiences.push({
              position: lines[0].trim(),
              company: lines[1].trim(),
              startDate: '',
              endDate: '',
              location: '',
              description: [lines.slice(2).join(' ').trim()]
            });
          }
        }
      });
    }
    
    return experiences;
  }

  extractEducation(text) {
    const education = [];
    
    const educationSection = text.match(/(?:EDUCATION|ACADEMIC BACKGROUND)([\s\S]*?)(?:EXPERIENCE|SKILLS|$)/i);
    if (educationSection) {
      const eduText = educationSection[1];
      const lines = eduText.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        if (line.length > 10 && (line.includes('University') || line.includes('College') || line.includes('Degree'))) {
          education.push({
            institution: line.trim(),
            degree: '',
            field: '',
            startDate: '',
            endDate: '',
            gpa: '',
            location: ''
          });
        }
      });
    }
    
    return education;
  }

  extractSkills(text) {
    const skills = [];
    
    const skillsSection = text.match(/(?:SKILLS|TECHNICAL SKILLS|COMPETENCIES)([\s\S]*?)(?:EXPERIENCE|EDUCATION|$)/i);
    if (skillsSection) {
      const skillsText = skillsSection[1];
      const skillsList = skillsText.split(/[,\n•·-]/).map(s => s.trim()).filter(s => s.length > 1);
      skills.push(...skillsList.slice(0, 20));
    }
    
    return skills;
  }

  async customizeResumeForJob(resumeData, jobDescription, userId = null) {
    try {
      console.log('=== LLM RESUME CUSTOMIZATION DEBUG ===');
      console.log('Provider:', this.provider === 'cloud' ? 'DeepSeek Cloud' : 'LM Studio Local');
      if (this.provider === 'local') {
        console.log('LLM API URL:', this.llmApiUrl);
        console.log('Model Name:', this.modelName);
      }
      console.log('Job Description Length:', jobDescription?.length || 0);
      console.log('Job Description Preview:', jobDescription?.substring(0, 200) + '...' || 'No description provided');
      
      // Validate inputs
      if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
        throw new Error('Invalid job description provided');
      }
      
      if (!resumeData || typeof resumeData !== 'object') {
        throw new Error('Invalid resume data provided');
      }
      
      const prompt = createResumeCustomizationPrompt(resumeData, jobDescription);
      console.log(`Sending customization request to ${this.provider === 'cloud' ? 'DeepSeek' : 'LM Studio'}...`);
      
      const messages = [
        {
          role: "system",
          content: "You are an expert resume optimizer. Your task is to modify and tailor resumes to match specific job requirements. You MUST return only valid JSON in the same format as the input resume data. Do not include any explanation or additional text outside the JSON."
        },
        {
          role: "user", 
          content: prompt
        }
      ];
      
      console.log('Request payload prepared, making HTTP request...');
      
      const response = await this.callLLM(messages, {
        temperature: 0.3,
        maxTokens: 12000
      });
      
      console.log(`${this.provider === 'cloud' ? 'DeepSeek' : 'LM Studio'} responded successfully`);

      const llmResponse = response.content;
      
      // Track token usage if userId is provided
      if (userId && response.usage) {
        const tokensUsed = response.usage.total_tokens || estimateTokenCount(prompt + llmResponse);
        try {
          const { recordTokenUsage } = require('../controllers/tokenController');
          await recordTokenUsage(userId, 'resume_customization', tokensUsed, {
            operation: 'customize_resume',
            job_description_length: jobDescription.length,
            response_length: llmResponse.length
          });
          console.log(`✅ Recorded ${tokensUsed} tokens for resume customization`);
        } catch (tokenError) {
          console.error('Failed to record token usage:', tokenError);
        }
      }
      
      console.log('=== LLM CUSTOMIZATION OUTPUT ===');
      console.log('Raw LLM Response:', llmResponse.substring(0, 500) + '...');
      
      // Extract JSON from response
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonString = jsonMatch[0];
        
        // Clean up common JSON issues
        jsonString = this.cleanJsonString(jsonString);
        
        try {
          const parsedData = JSON.parse(jsonString);
          console.log('✅ Successfully parsed customized resume JSON from LLM');
          return this.validateAndNormalizeParsedData(parsedData);
        } catch (parseError) {
          console.error('❌ JSON Parse Error during customization:', parseError.message);
          console.log('🔧 Attempting JSON repair...');
          
          // Try to repair and parse again
          const repairedJson = this.repairJsonString(jsonString);
          try {
            const parsedData = JSON.parse(repairedJson);
            console.log('✅ Successfully repaired and parsed customized JSON');
            return this.validateAndNormalizeParsedData(parsedData);
          } catch (repairError) {
            console.error('❌ JSON repair failed during customization:', repairError.message);
            console.log('⚠️  Falling back to original resume data...');
            // Return original data if LLM customization fails
            return resumeData;
          }
        }
      } else {
        throw new Error('No valid JSON found in LLM customization response');
      }
      
    } catch (error) {
      console.error('=== LLM RESUME CUSTOMIZATION ERROR ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      
      if (error.code === 'ECONNABORTED') {
        console.error('❌ CONNECTION TIMEOUT - LLM service took too long (>4 minutes)');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('❌ CONNECTION REFUSED - Cannot connect to LLM service');
      } else if (error.response) {
        console.error('HTTP Status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      console.log('⚠️  Falling back to original resume data...');
      // Return original data if LLM fails completely
      return resumeData;
    }
  }


  async rewriteResponsibility(originalText, userPrompt, userId = null) {
    try {
      console.log('=== RESPONSIBILITY REWRITE DEBUG ===');
      console.log('Original text:', originalText);
      console.log('User prompt:', userPrompt);

      const prompt = createResponsibilityRewritePrompt(originalText, userPrompt);

      const messages = [
        {
          role: "user",
          content: prompt
        }
      ];

      console.log(`Sending rewrite request to ${this.provider === 'cloud' ? 'DeepSeek' : 'LM Studio'}...`);
      const response = await this.callLLM(messages, {
        temperature: 0.7,
        maxTokens: 200
      });

      const rewrittenText = response.content;
      console.log('LLM rewrite response:', rewrittenText);

        // Track token usage if userId is provided
        if (userId && response.usage) {
          const tokensUsed = response.usage.total_tokens || estimateTokenCount(prompt + rewrittenText);
          try {
            const { recordTokenUsage } = require('../controllers/tokenController');
            await recordTokenUsage(userId, 'responsibility_rewrite', tokensUsed, {
              operation: 'rewrite_responsibility',
              original_length: originalText.length,
              prompt_length: userPrompt.length,
              response_length: rewrittenText.length
            });
            console.log(`✅ Recorded ${tokensUsed} tokens for responsibility rewrite`);
          } catch (tokenError) {
            console.error('Failed to record token usage:', tokenError);
          }
        }

        // Clean up the response - remove any quotes or extra formatting
        let cleanedText = rewrittenText.replace(/^["'](.*)["']$/, '$1').trim();

        // Remove bullet point markers if they were added
        cleanedText = cleanedText.replace(/^[•\-\*]\s*/, '').trim();

        return cleanedText;
    } catch (error) {
      console.error('LLM responsibility rewrite error:', error);
      throw new Error(`Failed to rewrite responsibility: ${error.message}`);
    }
  }

  async parseResumeToLatex(resumeText, userId = null) {
    try {
      console.log('=== LLM LATEX PARSING DEBUG ===');
      console.log('Provider:', this.provider === 'cloud' ? 'DeepSeek Cloud' : 'LM Studio Local');
      if (this.provider === 'local') {
        console.log('LLM API URL:', this.llmApiUrl);
        console.log('Model Name:', this.modelName);
      }
      console.log('Resume text length:', resumeText.length);

      const prompt = createLatexParsingPrompt(resumeText);
      console.log(`Sending LaTeX parsing request to ${this.provider === 'cloud' ? 'DeepSeek' : 'LM Studio'}...`);

      const messages = [
        {
          role: "system",
          content: "You are an expert resume formatter. Convert resumes to professional LaTeX format. Return ONLY valid LaTeX code. Do not include any explanation or additional text outside the LaTeX code."
        },
        {
          role: "user",
          content: prompt
        }
      ];

      console.log('Request payload prepared, making HTTP request...');

      const response = await this.callLLM(messages, {
        temperature: 0.1,
        maxTokens: 12000
      });

      console.log(`${this.provider === 'cloud' ? 'DeepSeek' : 'LM Studio'} responded successfully`);

      const llmResponse = response.content;

      // Track token usage if userId is provided
      if (userId && response.usage) {
        const tokensUsed = response.usage.total_tokens || estimateTokenCount(prompt + llmResponse);
        try {
          const { recordTokenUsage } = require('../controllers/tokenController');
          await recordTokenUsage(userId, 'resume_parsing_latex', tokensUsed, {
            operation: 'parse_resume_to_latex',
            input_length: resumeText.length,
            response_length: llmResponse.length
          });
          console.log(`✅ Recorded ${tokensUsed} tokens for LaTeX resume parsing`);
        } catch (tokenError) {
          console.error('Failed to record token usage:', tokenError);
        }
      }

      console.log('=== LLM LATEX OUTPUT ===');
      console.log('Raw LLM Response:', llmResponse.substring(0, 500) + '...');

      // Extract LaTeX code from response (in case there's extra text)
      let latexCode = llmResponse;

      // Try to extract LaTeX if wrapped in code blocks
      const latexMatch = llmResponse.match(/\\documentclass[\s\S]*\\end\{document\}/);
      if (latexMatch) {
        latexCode = latexMatch[0];
      } else {
        // Remove markdown code block markers if present
        latexCode = llmResponse.replace(/```latex\n?/g, '').replace(/```\n?/g, '').trim();
      }

      // Validate LaTeX structure
      if (!latexCode.includes('\\documentclass') || !latexCode.includes('\\begin{document}') || !latexCode.includes('\\end{document}')) {
        throw new Error('Invalid LaTeX structure: Missing required LaTeX document elements');
      }

      console.log('✅ Successfully parsed resume to LaTeX');
      return latexCode;

    } catch (error) {
      console.error('=== LLM LATEX PARSING ERROR ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);

      if (error.code === 'ECONNABORTED') {
        console.error(`❌ CONNECTION TIMEOUT - The ${this.provider === 'cloud' ? 'DeepSeek API' : 'LLM service'} took too long to respond`);
      } else if (error.code === 'ECONNREFUSED') {
        console.error(`❌ CONNECTION REFUSED - Cannot connect to ${this.provider === 'cloud' ? 'DeepSeek API' : 'LLM service'}`);
      } else if (error.response) {
        console.error('HTTP Status:', error.response.status);
        console.error('Response data:', error.response.data);
      }

      throw error;
    }
  }


  // Convert LaTeX code to JSON structure for editing
  async latexToJson(latexCode) {
    const prompt = createLatexToJsonPrompt(latexCode);

    const messages = [
      { role: 'user', content: prompt }
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.1,
      maxTokens: 8000
    });

    try {
      // Extract content from response object
      const responseText = typeof response === 'string' ? response : response.content;

      // Clean the response to get pure JSON
      let jsonText = responseText.trim();
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '');
      jsonText = jsonText.trim();

      const parsedData = JSON.parse(jsonText);
      return parsedData;
    } catch (error) {
      console.error('Failed to parse LaTeX to JSON:', error);
      throw new Error('Failed to convert LaTeX to JSON format');
    }
  }

  // Convert JSON structure back to LaTeX code
  async jsonToLatex(jsonData, structureMetadata = null) {
    // Read the LaTeX template
    const fs = require('fs');
    const path = require('path');
    const templatePath = path.join(__dirname, '../templates/latexTemplate.tex');
    const latexTemplate = fs.readFileSync(templatePath, 'utf-8');

    const prompt = createJsonToLatexPrompt(jsonData, latexTemplate, structureMetadata);

    const messages = [
      { role: 'user', content: prompt }
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.1,
      maxTokens: 12000
    });

    // Extract content from response object
    const responseText = typeof response === 'string' ? response : response.content;

    // Clean the response to get pure LaTeX
    let latexCode = responseText.trim();
    // Remove markdown code blocks if present
    latexCode = latexCode.replace(/^```latex\s*\n?/i, '').replace(/^```\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    latexCode = latexCode.trim();

    return {
      latexCode: latexCode,
      usage: response.usage
    };
  }

  // Fix LaTeX compilation errors using LLM
  async fixLatexErrors(buggyLatexCode, compilationError) {
    const prompt = createLatexFixPrompt(buggyLatexCode, compilationError);

    const messages = [
      { role: 'user', content: prompt }
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.1,
      maxTokens: 12000
    });

    // Extract content from response object
    const responseText = typeof response === 'string' ? response : response.content;

    // Clean the response to get pure LaTeX
    let latexCode = responseText.trim();
    // Remove markdown code blocks if present
    latexCode = latexCode.replace(/^```latex\s*\n?/i, '').replace(/^```\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    latexCode = latexCode.trim();

    return {
      latexCode: latexCode,
      usage: response.usage
    };
  }

  // Extract structure metadata from resume text
  async extractStructureMetadata(resumeText, userId = null) {
    try {
      console.log('=== STRUCTURE METADATA EXTRACTION DEBUG ===');
      console.log('Provider:', this.provider === 'cloud' ? 'DeepSeek Cloud' : 'LM Studio Local');
      console.log('Resume text length:', resumeText.length);

      const prompt = createResumeStructureExtractionPrompt(resumeText);
      console.log(`Sending structure extraction request to ${this.provider === 'cloud' ? 'DeepSeek' : 'LM Studio'}...`);

      const messages = [
        {
          role: "system",
          content: "You are an expert at analyzing resume layouts and structure. Extract structural information from resumes and return ONLY valid JSON format. Do not include any explanation or additional text outside the JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ];

      const response = await this.callLLM(messages, {
        temperature: 0.1,
        maxTokens: 4000
      });

      const llmResponse = response.content;

      // Track token usage if userId is provided
      if (userId && response.usage) {
        const tokensUsed = response.usage.total_tokens || estimateTokenCount(prompt + llmResponse);
        try {
          const { recordTokenUsage } = require('../controllers/tokenController');
          await recordTokenUsage(userId, 'structure_extraction', tokensUsed, {
            operation: 'extract_resume_structure',
            input_length: resumeText.length,
            response_length: llmResponse.length
          });
          console.log(`✅ Recorded ${tokensUsed} tokens for structure extraction`);
        } catch (tokenError) {
          console.error('Failed to record token usage:', tokenError);
        }
      }

      console.log('=== LLM STRUCTURE METADATA OUTPUT ===');
      console.log('Raw LLM Response:', llmResponse);

      // Extract JSON from response
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonString = jsonMatch[0];
        jsonString = this.cleanJsonString(jsonString);

        try {
          const structureMetadata = JSON.parse(jsonString);
          console.log('✅ Successfully parsed structure metadata JSON');
          console.log('Structure metadata:', JSON.stringify(structureMetadata, null, 2));
          return structureMetadata;
        } catch (parseError) {
          console.error('❌ JSON Parse Error:', parseError.message);
          console.log('⚠️  Falling back to default structure...');
          return this.getDefaultStructureMetadata();
        }
      } else {
        console.warn('No valid JSON found in structure extraction response');
        return this.getDefaultStructureMetadata();
      }

    } catch (error) {
      console.error('=== STRUCTURE EXTRACTION ERROR ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.log('⚠️  Falling back to default structure...');
      return this.getDefaultStructureMetadata();
    }
  }

  // Get default structure metadata
  getDefaultStructureMetadata() {
    return {
      sectionOrder: ["summary", "experience", "education", "projects", "technologies"],
      sectionTitles: {
        summary: "Summary",
        experience: "Experience",
        education: "Education",
        projects: "Projects",
        technologies: "Technologies"
      },
      layout: {
        style: "single-column",
        headerStyle: "centered",
        margins: {
          top: "2cm",
          bottom: "2cm",
          left: "2cm",
          right: "2cm"
        }
      },
      formatting: {
        fonts: {
          main: "Charter",
          heading: "Charter-Bold"
        },
        fontSize: {
          name: "25pt",
          section: "14pt",
          body: "10pt"
        },
        colors: {
          primary: "RGB(0,0,0)",
          accent: "RGB(0,0,0)"
        },
        spacing: {
          sectionGap: "0.3cm",
          itemGap: "0.2cm"
        },
        bulletStyle: "bullet"
      },
      visualElements: {
        useSectionLines: true,
        useHeaderLine: false,
        contactLayout: "horizontal"
      }
    };
  }
}

module.exports = new LLMResumeParser();