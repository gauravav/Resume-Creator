const axios = require('axios');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const geminiService = require('../services/geminiService');

// Helper function to estimate token count (rough approximation)
const estimateTokenCount = (text) => {
  // Rough estimate: 1 token ≈ 4 characters on average
  return Math.ceil(text.length / 4);
};

class LLMResumeParser {
  constructor() {
    // LLM Provider Configuration
    this.provider = process.env.LLM_PROVIDER || 'local'; // 'local' or 'cloud'
    
    // LM Studio Configuration (Local)
    this.llmApiUrl = process.env.LLM_API_URL || 'http://localhost:1234/v1';
    this.modelName = process.env.LLM_MODEL_NAME || 'deepseek-r1-distill-qwen-32b';
    
    console.log(`🤖 LLM Provider: ${this.provider === 'cloud' ? 'Gemini Cloud' : 'LM Studio Local'}`);
  }

  async callLLM(messages, options = {}) {
    if (this.provider === 'cloud') {
      // Use Gemini API
      try {
        const response = await geminiService.chatCompletion(messages, {
          temperature: options.temperature || 0.1,
          maxTokens: options.maxTokens || 12000,
          topP: options.topP || 0.8,
          topK: options.topK || 10
        });
        
        return {
          content: response.content,
          usage: response.usage ? {
            total_tokens: response.usage.totalTokenCount || estimateTokenCount(messages.map(m => m.content).join('') + response.content)
          } : null
        };
      } catch (error) {
        console.error('Gemini API error:', error.message);
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
      let text = '';
      
      if (mimeType === 'application/pdf') {
        const data = await pdfParse(buffer);
        text = data.text;
      } else if (mimeType === 'application/msword') {
        // For .doc files (older format)
        text = buffer.toString('utf8');
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // For .docx files
        const result = await mammoth.extractRawText({buffer});
        text = result.value;
      }
      
      return text;
    } catch (error) {
      console.error('Text extraction error:', error);
      return '';
    }
  }

  async parseResumeWithLLM(resumeText, userId = null) {
    try {
      console.log('=== LLM PARSING DEBUG ===');
      console.log('Provider:', this.provider === 'cloud' ? 'Gemini Cloud' : 'LM Studio Local');
      if (this.provider === 'local') {
        console.log('LLM API URL:', this.llmApiUrl);
        console.log('Model Name:', this.modelName);
      }
      console.log('Resume text length:', resumeText.length);
      console.log('=== RAW PDF TEXT BEING SENT TO LLM ===');
      console.log(resumeText);
      console.log('=== END RAW PDF TEXT ===');
      
      const prompt = this.createResumeParsingPrompt(resumeText);
      console.log(`Sending request to ${this.provider === 'cloud' ? 'Gemini' : 'LM Studio'}...`);
      
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
      
      console.log(`${this.provider === 'cloud' ? 'Gemini' : 'LM Studio'} responded successfully`);

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
        console.error(`❌ CONNECTION TIMEOUT - The ${this.provider === 'cloud' ? 'Gemini API' : 'LLM service'} took too long to respond`);
        if (this.provider === 'local') {
          console.error('💡 Possible solutions:');
          console.error('   - Check if LLM service is running at', this.llmApiUrl);
          console.error('   - Verify the model', this.modelName, 'is loaded and available');
          console.error('   - Try restarting the LLM service');
          console.error('   - Consider using a smaller/faster model for testing');
        } else {
          console.error('💡 Check your internet connection and Gemini API status');
        }
      } else if (error.code === 'ECONNREFUSED') {
        console.error(`❌ CONNECTION REFUSED - Cannot connect to ${this.provider === 'cloud' ? 'Gemini API' : 'LLM service'}`);
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

  createResumeParsingPrompt(resumeText) {
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
  "summary": "",
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
  "technologies": {
    "languages": [],
    "backend": [],
    "frontend": [],
    "databases": {
      "sql": [],
      "nosql": []
    },
    "cloudAndDevOps": [],
    "cicdAndAutomation": [],
    "testingAndDebugging": []
  }
}

PARSING INSTRUCTIONS:
1. Use the above template structure EXACTLY - do not add, remove, or rename any fields
2. Fill in the empty strings and arrays with extracted data from the resume
3. Split full names: "John Doe" becomes firstName: "John", lastName: "Doe"
4. For dates: use month names (e.g., "January") and 4-digit years, set day to null
5. For current positions: leave end month empty "", but include current year
6. Set remote: true only if location explicitly mentions remote work
7. Categorize technologies properly:
   - languages: Python, Java, JavaScript, C++, etc.
   - backend: Node.js, Express, Django, Spring Boot, etc.
   - frontend: React, Vue, Angular, HTML, CSS, etc.
   - databases.sql: PostgreSQL, MySQL, SQL Server, etc.
   - databases.nosql: MongoDB, Redis, Cassandra, etc.
   - cloudAndDevOps: AWS, Azure, Docker, Kubernetes, etc.
   - cicdAndAutomation: GitHub Actions, Jenkins, GitLab CI, etc.
   - testingAndDebugging: Jest, Mocha, Cypress, Selenium, etc.

8. If no data is found for a section, use empty arrays [] or empty strings ""
9. Return ONLY the JSON object with no additional text, explanations, or comments

Resume text to parse:
${resumeText}`;
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
      summary: data.summary || "",
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
        responsibilities: Array.isArray(exp.responsibilities) ? exp.responsibilities : []
      })) : [],
      internships: Array.isArray(data.internships) ? data.internships.map(int => ({
        position: int.position || "",
        company: int.company || "",
        location: ensureLocation(int.location),
        duration: ensureDuration(int.duration),
        responsibilities: Array.isArray(int.responsibilities) ? int.responsibilities : []
      })) : [],
      projects: Array.isArray(data.projects) ? data.projects.map(proj => ({
        name: proj.name || "",
        description: Array.isArray(proj.description) ? proj.description : [],
        toolsUsed: Array.isArray(proj.toolsUsed) ? proj.toolsUsed : []
      })) : [],
      technologies: {
        languages: Array.isArray(data.technologies?.languages) ? data.technologies.languages : [],
        backend: Array.isArray(data.technologies?.backend) ? data.technologies.backend : [],
        frontend: Array.isArray(data.technologies?.frontend) ? data.technologies.frontend : [],
        databases: {
          sql: Array.isArray(data.technologies?.databases?.sql) ? data.technologies.databases.sql : [],
          nosql: Array.isArray(data.technologies?.databases?.nosql) ? data.technologies.databases.nosql : []
        },
        cloudAndDevOps: Array.isArray(data.technologies?.cloudAndDevOps) ? data.technologies.cloudAndDevOps : [],
        cicdAndAutomation: Array.isArray(data.technologies?.cicdAndAutomation) ? data.technologies.cicdAndAutomation : [],
        testingAndDebugging: Array.isArray(data.technologies?.testingAndDebugging) ? data.technologies.testingAndDebugging : []
      }
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
      technologies: {
        languages: [],
        backend: [],
        frontend: [],
        databases: {
          sql: [],
          nosql: []
        },
        cloudAndDevOps: [],
        cicdAndAutomation: [],
        testingAndDebugging: []
      }
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
      console.log('Provider:', this.provider === 'cloud' ? 'Gemini Cloud' : 'LM Studio Local');
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
      
      const prompt = this.createResumeCustomizationPrompt(resumeData, jobDescription);
      console.log(`Sending customization request to ${this.provider === 'cloud' ? 'Gemini' : 'LM Studio'}...`);
      
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
      
      console.log(`${this.provider === 'cloud' ? 'Gemini' : 'LM Studio'} responded successfully`);

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

  createResumeCustomizationPrompt(resumeData, jobDescription) {
    return `You are an expert resume optimizer. I need you to modify ONLY specific sections of the following resume to better match a job opportunity.

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME DATA:
${JSON.stringify(resumeData, null, 2)}

TARGETED CUSTOMIZATION INSTRUCTIONS:
1. Keep the EXACT same JSON structure and format - do not add, remove, or rename any fields
2. Analyze the job description and identify key requirements, skills, and keywords
3. ONLY modify these THREE sections (leave everything else unchanged):

   A. SUMMARY SECTION:
   - Rewrite the "summary" field to highlight relevant experience for this specific role
   - Use keywords from the job description
   - Emphasize skills and experience that match the job requirements
   - Keep it concise and impactful (2-3 sentences)

   B. WORK EXPERIENCE RESPONSIBILITIES:
   - Modify ONLY the "responsibilities" arrays within the "experience" section
   - Reorder and rewrite bullet points to emphasize relevant achievements
   - Use action verbs and quantifiable results where possible
   - Highlight technologies, skills, and accomplishments that match the job
   - Do NOT change position titles, company names, dates, or locations

   C. TECHNOLOGIES SECTION:
   - Reorder the technology arrays to put most relevant technologies first
   - Ensure technologies mentioned in the job description are prominently placed
   - Do NOT add technologies that weren't already in the original resume
   - Do NOT remove existing technologies, only reorder them

4. CRITICAL CONSTRAINTS:
   - Do NOT modify personal information, education, project details, internships, or any other sections
   - Do NOT fabricate new experiences, skills, or technologies
   - Do NOT change company names, job titles, dates, or educational institutions
   - Only enhance and reorder existing content within the specified sections

5. Return ONLY the complete modified JSON resume data - no explanations or additional text

Focus on making the summary, work experience points, and technology ordering highly relevant to this job opportunity:`;
  }

  async rewriteResponsibility(originalText, userPrompt, userId = null) {
    try {
      console.log('=== RESPONSIBILITY REWRITE DEBUG ===');
      console.log('Original text:', originalText);
      console.log('User prompt:', userPrompt);
      
      const prompt = `You are an expert resume writer. Your task is to rewrite a single responsibility/bullet point from a resume based on the user's specific instructions.

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
      
      const messages = [
        {
          role: "user",
          content: prompt
        }
      ];

      console.log(`Sending rewrite request to ${this.provider === 'cloud' ? 'Gemini' : 'LM Studio'}...`);
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
}

module.exports = new LLMResumeParser();