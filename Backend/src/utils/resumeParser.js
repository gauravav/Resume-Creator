const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

class ResumeParser {
  static async extractText(buffer, mimeType) {
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

  static parseResumeContent(text) {
    const parsed = {
      personalInfo: this.extractPersonalInfo(text),
      contact: this.extractContactInfo(text),
      experience: this.extractExperience(text),
      education: this.extractEducation(text),
      skills: this.extractSkills(text),
      summary: this.extractSummary(text),
      rawText: text
    };
    
    return parsed;
  }

  static extractPersonalInfo(text) {
    const personalInfo = {};
    
    // Extract name (usually at the beginning)
    const nameMatch = text.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/m);
    if (nameMatch) {
      personalInfo.name = nameMatch[1];
    }
    
    return personalInfo;
  }

  static extractContactInfo(text) {
    const contact = {};
    
    // Extract email
    const emailMatch = text.match(/([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      contact.email = emailMatch[1];
    }
    
    // Extract phone number
    const phoneMatch = text.match(/(\+?[\d\s\-\(\)]{10,})/);
    if (phoneMatch) {
      contact.phone = phoneMatch[1].trim();
    }
    
    // Extract LinkedIn
    const linkedinMatch = text.match(/(linkedin\.com\/in\/[a-zA-Z0-9\-]+)/i);
    if (linkedinMatch) {
      contact.linkedin = 'https://' + linkedinMatch[1];
    }
    
    return contact;
  }

  static extractExperience(text) {
    const experiences = [];
    
    // Look for common experience patterns
    const experienceSection = text.match(/(?:EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT|PROFESSIONAL EXPERIENCE)([\s\S]*?)(?:EDUCATION|SKILLS|$)/i);
    if (experienceSection) {
      const expText = experienceSection[1];
      
      // Split by potential job entries (dates patterns)
      const jobEntries = expText.split(/\n(?=\d{4}|\w+\s+\d{4})/);
      
      jobEntries.forEach(entry => {
        const trimmed = entry.trim();
        if (trimmed.length > 20) { // Filter out very short entries
          const lines = trimmed.split('\n').filter(line => line.trim());
          if (lines.length >= 2) {
            experiences.push({
              title: lines[0].trim(),
              company: lines[1].trim(),
              description: lines.slice(2).join(' ').trim()
            });
          }
        }
      });
    }
    
    return experiences;
  }

  static extractEducation(text) {
    const education = [];
    
    const educationSection = text.match(/(?:EDUCATION|ACADEMIC BACKGROUND)([\s\S]*?)(?:EXPERIENCE|SKILLS|$)/i);
    if (educationSection) {
      const eduText = educationSection[1];
      const lines = eduText.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        if (line.length > 10 && (line.includes('University') || line.includes('College') || line.includes('Degree'))) {
          education.push(line.trim());
        }
      });
    }
    
    return education;
  }

  static extractSkills(text) {
    const skills = [];
    
    const skillsSection = text.match(/(?:SKILLS|TECHNICAL SKILLS|COMPETENCIES)([\s\S]*?)(?:EXPERIENCE|EDUCATION|$)/i);
    if (skillsSection) {
      const skillsText = skillsSection[1];
      
      // Split by commas, newlines, or bullet points
      const skillsList = skillsText.split(/[,\n•·-]/).map(s => s.trim()).filter(s => s.length > 1);
      skills.push(...skillsList.slice(0, 20)); // Limit to 20 skills
    }
    
    return skills;
  }

  static extractSummary(text) {
    // Look for summary section
    const summaryMatch = text.match(/(?:SUMMARY|PROFILE|OBJECTIVE|ABOUT)([\s\S]*?)(?:EXPERIENCE|EDUCATION|SKILLS|$)/i);
    if (summaryMatch) {
      return summaryMatch[1].trim().substring(0, 500); // Limit length
    }
    
    // If no explicit summary section, take first paragraph
    const firstParagraph = text.split('\n\n')[0];
    if (firstParagraph && firstParagraph.length > 50) {
      return firstParagraph.substring(0, 500);
    }
    
    return '';
  }
}

module.exports = ResumeParser;