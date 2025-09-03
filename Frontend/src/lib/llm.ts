import { resumeApi } from './api';

export interface ParsedResume {
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
  summary: string;
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
  technologies: {
    languages: string[];
    backend: string[];
    frontend: string[];
    databases: {
      sql: string[];
      nosql: string[];
    };
    cloudAndDevOps: string[];
    cicdAndAutomation: string[];
    testingAndDebugging: string[];
  };
}

export async function parseResumeWithLLM(file: File): Promise<ParsedResume> {
  try {
    const response = await resumeApi.parse(file);
    return response.parsedResume;
  } catch (error) {
    console.error('Resume parsing error:', error);
    throw new Error('Failed to parse resume');
  }
}

export async function saveResumeWithParsedData(
  file: File, 
  parsedData: ParsedResume
): Promise<{success: boolean; message: string}> {
  try {
    const response = await resumeApi.uploadParsed(file, parsedData);
    return response;
  } catch (error) {
    console.error('Resume save error:', error);
    throw new Error('Failed to save resume');
  }
}