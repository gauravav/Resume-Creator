const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class ResumePDF {
  constructor() {
    this.doc = new PDFDocument({
      margin: 50,
      size: 'A4'
    });
    this.currentY = 50;
    this.leftMargin = 50;
    this.rightMargin = 50;
    this.pageWidth = 612 - this.leftMargin - this.rightMargin;
  }

  async generatePDF(resumeData) {
    try {
      this.addHeader(resumeData.personalInfo);
      this.addSummarySection(resumeData.summary);
      this.addExperienceSection(resumeData.experience);
      this.addEducationSection(resumeData.education);
      this.addProjectsSection(resumeData.projects);
      this.addTechnologiesSection(resumeData.technologies);

      if (resumeData.internships && resumeData.internships.length > 0) {
        this.addInternshipsSection(resumeData.internships);
      }

      return this.doc;
    } catch (error) {
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  addHeader(personalInfo) {
    const fullName = `${personalInfo.firstName} ${personalInfo.lastName}`;
    
    this.doc.fontSize(24)
           .font('Helvetica-Bold')
           .text(fullName, this.leftMargin, this.currentY, {
             width: this.pageWidth,
             align: 'center'
           });
    
    this.currentY += 30;

    const contactInfo = [];
    if (personalInfo.email) contactInfo.push(personalInfo.email);
    if (personalInfo.phone) contactInfo.push(personalInfo.phone);
    if (personalInfo.website) contactInfo.push(personalInfo.website);
    
    const location = this.formatLocation(personalInfo.location);
    if (location) contactInfo.push(location);

    this.doc.fontSize(10)
           .font('Helvetica')
           .text(contactInfo.join(' | '), this.leftMargin, this.currentY, {
             width: this.pageWidth,
             align: 'center'
           });

    this.currentY += 20;

    if (personalInfo.socialMedia?.linkedin || personalInfo.socialMedia?.github) {
      const socialLinks = [];
      if (personalInfo.socialMedia.linkedin) socialLinks.push(`LinkedIn: ${personalInfo.socialMedia.linkedin}`);
      if (personalInfo.socialMedia.github) socialLinks.push(`GitHub: ${personalInfo.socialMedia.github}`);
      
      this.doc.fontSize(10)
             .text(socialLinks.join(' | '), this.leftMargin, this.currentY, {
               width: this.pageWidth,
               align: 'center'
             });
      this.currentY += 20;
    }

    this.currentY += 10;
  }

  addSection(title, content) {
    this.checkPageBreak(60);

    this.doc.fontSize(14)
           .font('Helvetica-Bold')
           .text(title, this.leftMargin, this.currentY);

    this.currentY += 20;

    this.doc.moveTo(this.leftMargin, this.currentY)
           .lineTo(this.leftMargin + this.pageWidth, this.currentY)
           .stroke();

    this.currentY += 10;

    if (content) {
      this.doc.fontSize(11)
             .font('Helvetica')
             .text(content, this.leftMargin, this.currentY, {
               width: this.pageWidth,
               align: 'justify'
             });
      this.currentY += this.doc.heightOfString(content, { width: this.pageWidth }) + 15;
    }
  }

  addSummarySection(summary) {
    if (!summary || (Array.isArray(summary) && summary.length === 0)) return;

    this.checkPageBreak(60);

    this.doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('PROFESSIONAL SUMMARY', this.leftMargin, this.currentY);

    this.currentY += 20;

    this.doc.moveTo(this.leftMargin, this.currentY)
           .lineTo(this.leftMargin + this.pageWidth, this.currentY)
           .stroke();

    this.currentY += 10;

    // Handle both array (new format) and string (old format for backward compatibility)
    const summaryPoints = Array.isArray(summary) ? summary : [summary];

    summaryPoints.forEach((point) => {
      if (point && point.trim()) {
        this.checkPageBreak(30);

        // Add bullet point
        this.doc.fontSize(11)
               .font('Helvetica')
               .text('•', this.leftMargin, this.currentY, {
                 continued: true,
                 width: 15
               })
               .text(' ' + point, this.leftMargin + 15, this.currentY, {
                 width: this.pageWidth - 15,
                 align: 'justify'
               });

        const pointHeight = this.doc.heightOfString(point, { width: this.pageWidth - 15 });
        this.currentY += pointHeight + 8;
      }
    });

    this.currentY += 7; // Extra spacing after summary section
  }

  addExperienceSection(experiences) {
    if (!experiences || experiences.length === 0) return;

    this.addSection('PROFESSIONAL EXPERIENCE');

    experiences.forEach((exp, index) => {
      this.checkPageBreak(100);

      this.doc.fontSize(12)
             .font('Helvetica-Bold')
             .text(exp.position, this.leftMargin, this.currentY);

      const duration = this.formatDuration(exp.duration);
      this.doc.fontSize(10)
             .font('Helvetica')
             .text(duration, this.leftMargin + this.pageWidth - 100, this.currentY, {
               width: 100,
               align: 'right'
             });

      this.currentY += 15;

      const companyLocation = `${exp.company} - ${this.formatLocation(exp.location)}`;
      this.doc.fontSize(11)
             .font('Helvetica-Oblique')
             .text(companyLocation, this.leftMargin, this.currentY);

      this.currentY += 15;

      if (exp.responsibilities && exp.responsibilities.length > 0) {
        exp.responsibilities.forEach(responsibility => {
          this.checkPageBreak(20);
          this.doc.fontSize(10)
                 .font('Helvetica')
                 .text(`• ${responsibility}`, this.leftMargin + 10, this.currentY, {
                   width: this.pageWidth - 10
                 });
          this.currentY += this.doc.heightOfString(`• ${responsibility}`, { width: this.pageWidth - 10 }) + 3;
        });
      }

      if (index < experiences.length - 1) {
        this.currentY += 10;
      }
    });
  }

  addEducationSection(education) {
    if (!education || education.length === 0) return;

    this.addSection('EDUCATION');

    education.forEach((edu, index) => {
      this.checkPageBreak(80);

      this.doc.fontSize(12)
             .font('Helvetica-Bold')
             .text(edu.degree, this.leftMargin, this.currentY);

      const duration = this.formatDuration(edu.duration);
      this.doc.fontSize(10)
             .font('Helvetica')
             .text(duration, this.leftMargin + this.pageWidth - 100, this.currentY, {
               width: 100,
               align: 'right'
             });

      this.currentY += 15;

      this.doc.fontSize(11)
             .font('Helvetica-Oblique')
             .text(`${edu.institution}${edu.major ? ` - ${edu.major}` : ''}`, this.leftMargin, this.currentY);

      this.currentY += 15;

      if (edu.coursework && edu.coursework.length > 0) {
        this.doc.fontSize(10)
               .font('Helvetica')
               .text('Relevant Coursework:', this.leftMargin + 10, this.currentY);
        this.currentY += 12;

        const courseworkText = edu.coursework.join(', ');
        this.doc.text(courseworkText, this.leftMargin + 10, this.currentY, {
          width: this.pageWidth - 10
        });
        this.currentY += this.doc.heightOfString(courseworkText, { width: this.pageWidth - 10 });
      }

      if (index < education.length - 1) {
        this.currentY += 10;
      }
    });
  }

  addProjectsSection(projects) {
    if (!projects || projects.length === 0) return;

    this.addSection('PROJECTS');

    projects.forEach((project, index) => {
      this.checkPageBreak(80);

      this.doc.fontSize(12)
             .font('Helvetica-Bold')
             .text(project.name, this.leftMargin, this.currentY);

      this.currentY += 15;

      if (project.description && project.description.length > 0) {
        project.description.forEach(desc => {
          this.doc.fontSize(10)
                 .font('Helvetica')
                 .text(`• ${desc}`, this.leftMargin + 10, this.currentY, {
                   width: this.pageWidth - 10
                 });
          this.currentY += this.doc.heightOfString(`• ${desc}`, { width: this.pageWidth - 10 }) + 3;
        });
      }

      if (project.toolsUsed && project.toolsUsed.length > 0) {
        this.doc.fontSize(10)
               .font('Helvetica-Bold')
               .text('Technologies: ', this.leftMargin + 10, this.currentY, { continued: true })
               .font('Helvetica')
               .text(project.toolsUsed.join(', '));
        
        this.currentY += 15;
      }

      if (index < projects.length - 1) {
        this.currentY += 10;
      }
    });
  }

  addInternshipsSection(internships) {
    this.addSection('INTERNSHIPS');

    internships.forEach((intern, index) => {
      this.checkPageBreak(100);

      this.doc.fontSize(12)
             .font('Helvetica-Bold')
             .text(intern.position, this.leftMargin, this.currentY);

      const duration = this.formatDuration(intern.duration);
      this.doc.fontSize(10)
             .font('Helvetica')
             .text(duration, this.leftMargin + this.pageWidth - 100, this.currentY, {
               width: 100,
               align: 'right'
             });

      this.currentY += 15;

      const companyLocation = `${intern.company} - ${this.formatLocation(intern.location)}`;
      this.doc.fontSize(11)
             .font('Helvetica-Oblique')
             .text(companyLocation, this.leftMargin, this.currentY);

      this.currentY += 15;

      if (intern.responsibilities && intern.responsibilities.length > 0) {
        intern.responsibilities.forEach(responsibility => {
          this.checkPageBreak(20);
          this.doc.fontSize(10)
                 .font('Helvetica')
                 .text(`• ${responsibility}`, this.leftMargin + 10, this.currentY, {
                   width: this.pageWidth - 10
                 });
          this.currentY += this.doc.heightOfString(`• ${responsibility}`, { width: this.pageWidth - 10 }) + 3;
        });
      }

      if (index < internships.length - 1) {
        this.currentY += 10;
      }
    });
  }

  addTechnologiesSection(technologies) {
    if (!technologies || !Array.isArray(technologies) || technologies.length === 0) return;

    this.addSection('TECHNICAL SKILLS');

    // Technologies is now an array of { category, items } objects
    technologies.forEach(tech => {
      if (tech.category && tech.items && tech.items.length > 0) {
        this.checkPageBreak(30);

        this.doc.fontSize(11)
               .font('Helvetica-Bold')
               .text(`${tech.category}: `, this.leftMargin, this.currentY, { continued: true })
               .font('Helvetica')
               .text(tech.items.join(', '));

        this.currentY += 15;
      }
    });
  }

  formatLocation(location) {
    if (!location) return '';
    
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
    if (location.country && location.country !== 'US') parts.push(location.country);
    
    let result = parts.join(', ');
    if (location.remote) {
      result += result ? ' (Remote)' : 'Remote';
    }
    
    return result;
  }

  formatDuration(duration) {
    if (!duration || !duration.start) return '';
    
    const formatDate = (date) => {
      if (!date || (!date.month && !date.year)) return '';
      const month = date.month || '';
      const year = date.year || '';
      return `${month} ${year}`.trim();
    };

    const start = formatDate(duration.start);
    const end = duration.end ? formatDate(duration.end) : 'Present';
    
    return `${start} - ${end}`;
  }

  checkPageBreak(requiredSpace) {
    if (this.currentY + requiredSpace > 750) { // Page height minus margin
      this.doc.addPage();
      this.currentY = 50;
    }
  }
}

module.exports = ResumePDF;