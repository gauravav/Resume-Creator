import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface Resume {
  id: number;
  fileName: string;
  resumeFileName: string;
  jsonFileName: string;
  originalName: string;
  uploadDate: string;
  size: number;
  isBaseResume: boolean;
}

interface MinioObject {
  name: string;
  size: number;
  lastModified: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },
  
  register: async (credentials: RegisterCredentials) => {
    const response = await api.post('/api/auth/register', credentials);
    return response.data;
  },
  
  getMe: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
  
  validateToken: async () => {
    const response = await api.get('/api/auth/validate');
    return response.data;
  },
};

export const resumeApi = {
  
  getAll: async (): Promise<Resume[]> => {
    const response = await api.get('/api/resumes');
    const resumes = response.data.resumes || [];
    return resumes.map((resume: any) => ({
      id: resume.id,
      fileName: resume.fileName || resume.resumeFileName,
      resumeFileName: resume.resumeFileName,
      jsonFileName: resume.jsonFileName,
      originalName: resume.originalName,
      uploadDate: resume.uploadDate,
      size: parseInt(resume.size),
      isBaseResume: resume.isBaseResume,
    }));
  },
  
  getParsed: async () => {
    const response = await api.get('/api/resumes/parsed');
    return response.data;
  },
  
  getBase: async () => {
    const response = await api.get('/api/resumes/base');
    return response.data;
  },
  
  setBase: async (resumeId: string) => {
    const response = await api.put(`/api/resumes/base/${resumeId}`);
    return response.data;
  },
  
  download: async (fileName: string) => {
    const response = await api.get(`/api/resumes/download/${fileName}`, {
      responseType: 'blob',
    });
    return response.data;
  },
  
  delete: async (resumeId: number) => {
    await api.delete(`/api/resumes/${resumeId}`);
  },

  parse: async (file: File) => {
    console.log('=== FRONTEND DEBUG: Starting resume parse ===');
    console.log('File name:', file.name);
    console.log('File size:', file.size);
    console.log('API Base URL:', API_BASE_URL);
    
    const formData = new FormData();
    formData.append('resume', file);
    
    try {
      console.log('Making request to /api/resumes/parse...');
      const response = await api.post('/api/resumes/parse', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Parse response received:', response.status);
      console.log('Response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('=== FRONTEND PARSE ERROR ===');
      console.error('Error:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  },


  getParsedData: async (resumeId: number) => {
    const response = await api.get(`/api/resumes/parsed-data/${resumeId}`);
    return response.data.parsedData;
  },

  updateParsedData: async (resumeId: number, parsedData: any, resumeName?: string) => {
    const payload: any = { parsedData };
    if (resumeName) {
      payload.resumeName = resumeName;
    }
    
    const response = await api.put(`/api/resumes/parsed-data/${resumeId}`, payload);
    return response.data;
  },

  saveParsed: async (parsedData: any, resumeName: string) => {
    console.log('API saveParsed called with:', {
      resumeName,
      parsedDataType: typeof parsedData,
      parsedDataKeys: parsedData ? Object.keys(parsedData) : 'null'
    });

    const payload = {
      parsedData: JSON.stringify(parsedData),
      resumeName: resumeName
    };
    
    console.log('API payload prepared:', {
      resumeName: payload.resumeName,
      parsedDataLength: payload.parsedData?.length,
      parsedDataPreview: payload.parsedData?.substring(0, 200) + '...'
    });

    try {
      console.log('Making POST request to /api/resumes/save-parsed');
      const response = await api.post('/api/resumes/save-parsed', payload);
      console.log('API saveParsed response:', {
        status: response.status,
        data: response.data
      });
      return response.data;
    } catch (error) {
      console.error('API saveParsed error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data
      });
      throw error;
    }
  },

  customizeForJob: async (resumeId: number, jobDescription: { description: string }) => {
    const payload = {
      resumeId: resumeId,
      jobDescription: jobDescription
    };
    
    const response = await api.post('/api/resumes/customize-for-job', payload);
    return response.data;
  },

  downloadPDF: async (resumeId: number) => {
    const response = await api.get(`/api/resumes/pdf/${resumeId}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export const jobApi = {
  create: async (jobData: {title: string; company?: string; description: string}) => {
    const response = await api.post('/api/jobs', jobData);
    return response.data;
  },
  
  upload: async (file: File, title: string, company?: string) => {
    const formData = new FormData();
    formData.append('jobDescription', file);
    formData.append('title', title);
    if (company) formData.append('company', company);
    
    const response = await api.post('/api/jobs/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getAll: async () => {
    const response = await api.get('/api/jobs');
    return response.data;
  },
  
  delete: async (jobId: string) => {
    await api.delete(`/api/jobs/${jobId}`);
  },
};