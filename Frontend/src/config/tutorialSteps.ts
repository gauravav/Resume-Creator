import { TutorialStep } from '@/context/TutorialContext';

export const dashboardTutorialSteps: TutorialStep[] = [
  {
    id: 'theme-toggle',
    title: 'Theme Toggle',
    description: 'Switch between light and dark mode to suit your preference. Your choice will be saved for future sessions.',
    targetElement: '[data-theme-toggle]',
    position: 'bottom',
    action: 'Try clicking to toggle between themes'
  },
  {
    id: 'token-usage',
    title: 'Token Usage Tracker',
    description: 'Monitor your AI token consumption here. Tokens are used when parsing, customizing, or rewriting resumes. View detailed history or reset your count anytime.',
    targetElement: '.token-usage-section',
    position: 'bottom',
  },
  {
    id: 'new-resume',
    title: 'Create New Resume',
    description: 'Upload a resume file (PDF, DOCX, TXT) to parse and extract structured data. This is your first step to creating a professional resume.',
    targetElement: '.new-resume-card',
    position: 'top',
    action: 'Click "New Resume" to upload your first resume'
  },
  {
    id: 'custom-resume',
    title: 'Create Custom Resume',
    description: 'Tailor your existing resume for specific job opportunities using AI. Customize content to match job descriptions and improve your chances.',
    targetElement: '.custom-resume-card',
    position: 'top',
    action: 'Use this when you want to customize a resume for a job'
  },
  {
    id: 'resume-list',
    title: 'Your Resumes',
    description: 'All your uploaded and created resumes appear here. Each resume shows its upload date, file size, and status.',
    targetElement: '.resumes-list-section',
    position: 'top',
  },
  {
    id: 'resume-actions',
    title: 'Resume Actions',
    description: 'Edit your resume content, download as PDF or JSON, and delete resumes you no longer need. PDF downloads are available once generation is complete.',
    targetElement: '.resumes-list-section',
    position: 'left',
    action: 'Hover over the action buttons to see what each one does'
  },
  {
    id: 'user-menu',
    title: 'User Menu',
    description: 'Access your account settings, view your profile, and sign out from here. Admin users will also see admin dashboard access.',
    targetElement: '[data-user-menu]',
    position: 'bottom',
    action: 'Click to explore your account options'
  }
];

export const parseResumeTutorialSteps: TutorialStep[] = [
  {
    id: 'file-upload-area',
    title: 'Upload Your Resume',
    description: 'Drag and drop your resume file here, or click to browse. We support PDF, DOC, and DOCX formats up to 5MB.',
    targetElement: '.file-upload-area',
    position: 'bottom',
    action: 'Try dragging a file here or click to select one'
  },
  {
    id: 'resume-name-input',
    title: 'Name Your Resume',
    description: 'Give your resume a descriptive name. This will help you identify it later when selecting resumes for customization.',
    targetElement: '.resume-name-input',
    position: 'bottom',
    action: 'Enter a memorable name for your resume'
  },
  {
    id: 'parse-button',
    title: 'Parse Resume',
    description: 'Click this button to extract and structure your resume data using AI. The parsing process usually takes 10-30 seconds.',
    targetElement: '.parse-button',
    position: 'top',
    action: 'Click to start parsing your resume'
  },
  {
    id: 'editable-form',
    title: 'Review & Edit',
    description: 'After parsing, review the extracted data and make any necessary edits. You can modify all fields including personal info, experience, education, and skills.',
    targetElement: '.editable-resume-form',
    position: 'top',
    action: 'Review and edit the parsed resume data'
  },
  {
    id: 'save-button',
    title: 'Save Your Resume',
    description: 'Once you\'re satisfied with the data, click Save to store your resume. It will then be available in your dashboard for downloading or customizing.',
    targetElement: '.save-resume-button',
    position: 'top',
    action: 'Click Save when you\'re ready'
  }
];

export const createResumeTutorialSteps: TutorialStep[] = [
  {
    id: 'select-base-resume',
    title: 'Select Base Resume',
    description: 'Choose a resume from your existing resumes to use as the foundation for your customized version. This will be tailored for a specific job.',
    targetElement: '.resume-selection-list',
    position: 'right',
    action: 'Click on a resume to select it'
  },
  {
    id: 'job-description-input',
    title: 'Paste Job Description',
    description: 'Paste the full job description here. Our AI will analyze it and customize your resume to highlight relevant skills and experience.',
    targetElement: '.job-description-textarea',
    position: 'top',
    action: 'Paste the job description you want to target'
  },
  {
    id: 'customize-button',
    title: 'Generate Custom Resume',
    description: 'Click this button to let AI customize your resume for the job. It will reorder, rephrase, and emphasize relevant content while maintaining accuracy.',
    targetElement: '.customize-button',
    position: 'top',
    action: 'Click to start AI customization'
  },
  {
    id: 'change-highlighter',
    title: 'Review Changes',
    description: 'The AI-customized version appears here with changes highlighted. Green shows additions, yellow shows modifications, and red shows removals.',
    targetElement: '.change-highlighter',
    position: 'left',
    action: 'Review all changes carefully'
  },
  {
    id: 'save-custom-resume',
    title: 'Save Custom Resume',
    description: 'Save your customized resume with a new name. It will be added to your dashboard where you can download it as PDF or make further edits.',
    targetElement: '.save-custom-button',
    position: 'top',
    action: 'Click to save your customized resume'
  }
];

export const editResumeTutorialSteps: TutorialStep[] = [
  {
    id: 'personal-info-section',
    title: 'Personal Information',
    description: 'Update your contact details, professional title, and personal summary. Keep this information current and professional.',
    targetElement: '.personal-info-section',
    position: 'right',
  },
  {
    id: 'experience-section',
    title: 'Work Experience',
    description: 'Add, edit, or remove work experiences. Use bullet points to describe your achievements and responsibilities for each role.',
    targetElement: '.experience-section',
    position: 'right',
    action: 'Click Add Experience to add new entries'
  },
  {
    id: 'education-section',
    title: 'Education',
    description: 'Manage your educational background including degrees, institutions, and graduation dates. You can add multiple entries.',
    targetElement: '.education-section',
    position: 'right',
    action: 'Add or edit your educational background'
  },
  {
    id: 'skills-section',
    title: 'Skills & Technologies',
    description: 'List your technical skills, tools, and technologies. Organize them by category for better readability.',
    targetElement: '.skills-section',
    position: 'right',
  },
  {
    id: 'save-changes-button',
    title: 'Save Your Changes',
    description: 'Don\'t forget to save your changes! Your updated resume will be saved and a new PDF will be generated automatically.',
    targetElement: '.save-changes-button',
    position: 'left',
    action: 'Click Save Changes when done editing'
  }
];
