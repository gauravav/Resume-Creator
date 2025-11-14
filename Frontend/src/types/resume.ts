export interface ResumeData {
  personalInfo: {
    firstName: string;
    lastName: string;
    location: {
      city: string;
      state: string;
      country: string;
      remote: boolean;
    };
    email: string;
    phone: string;
    website: string;
    socialMedia: {
      linkedin: string;
      github: string;
    };
  };
  summary: string[];
  education: Array<{
    institution: string;
    degree: string;
    major: string;
    duration: {
      start: {
        month: string;
        year: number | null;
        day: number | null;
      };
      end: {
        month: string;
        year: number | null;
        day: number | null;
      };
    };
    coursework: string[];
  }>;
  experience: Array<{
    position: string;
    company: string;
    location: {
      city: string;
      state: string;
      country: string;
      remote: boolean;
    };
    duration: {
      start: {
        month: string;
        year: number | null;
        day: number | null;
      };
      end: {
        month: string;
        year: number | null;
        day: number | null;
      };
    };
    responsibilities: string[];
  }>;
  internships: Array<{
    position: string;
    company: string;
    location: {
      city: string;
      state: string;
      country: string;
      remote: boolean;
    };
    duration: {
      start: {
        month: string;
        year: number | null;
        day: number | null;
      };
      end: {
        month: string;
        year: number | null;
        day: number | null;
      };
    };
    responsibilities: string[];
  }>;
  projects: Array<{
    name: string;
    description: string[];
    toolsUsed: string[];
  }>;
  // Technologies can be in two formats:
  // 1. Array format (from backend): [{ category, items }]
  // 2. Object format (for CustomResumeForm): { languages, backend, etc. }
  technologies:
    | Array<{
        category: string;
        items: string[];
      }>
    | {
        languages: string[];
        backend: string[];
        frontend: string[];
        cloudAndDevOps: string[];
        databases: {
          sql: string[];
          nosql: string[];
        };
        cicdAndAutomation: string[];
        testingAndDebugging: string[];
      };
}