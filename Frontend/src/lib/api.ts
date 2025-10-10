import axios from 'axios';
import Cookies from 'js-cookie';
import { ResumeData } from '@/types/resume';

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE_URL = isLocalhost 
  ? process.env.NEXT_PUBLIC_API_URL_DEV || 'http://localhost:3200'
  : process.env.NEXT_PUBLIC_API_URL_PROD || 'http://143.198.11.73:3200';

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

// Rate limit toast deduplication
let lastRateLimitToast: { message: string; timestamp: number } | null = null;
const RATE_LIMIT_TOAST_COOLDOWN = 10000; // 10 seconds cooldown between same rate limit toasts

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle rate limiting errors
    if (error.response?.status === 429) {
      const errorData = error.response.data;
      const retryAfter = errorData?.retryAfter || 'a few minutes';
      const message = `Rate limit exceeded. Please try again after ${retryAfter}.`;
      const now = Date.now();
      
      // Check if we should show this toast (deduplication)
      const shouldShowToast = !lastRateLimitToast || 
        lastRateLimitToast.message !== message || 
        (now - lastRateLimitToast.timestamp) > RATE_LIMIT_TOAST_COOLDOWN;
      
      if (shouldShowToast && typeof window !== 'undefined') {
        lastRateLimitToast = { message, timestamp: now };
        
        // Use a timeout to ensure toast manager is initialized
        setTimeout(() => {
          const toastEvent = new CustomEvent('showToast', {
            detail: {
              type: 'warning',
              message: message,
              duration: 8000 // Show for 8 seconds for rate limit errors
            }
          });
          window.dispatchEvent(toastEvent);
        }, 100);
      }
    }
    
    // Only redirect to login if it's an invalid/expired token, not login failures
    if (error.response?.status === 401 && 
        !error.config?.url?.includes('/api/auth/login') &&
        !error.config?.url?.includes('/api/auth/register')) {
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

interface ResumeResponse {
  id: number;
  fileName?: string;
  resumeFileName: string;
  jsonFileName: string;
  originalName: string;
  uploadDate: string;
  size: string;
  isBaseResume?: boolean;
}

interface UpdatePayload {
  parsedData: ResumeData;
  resumeName?: string;
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
  
  verifyEmail: async (token: string) => {
    const response = await api.get(`/api/auth/verify-email?token=${token}`);
    return response.data;
  },
  
  resendVerificationEmail: async (email: string) => {
    const response = await api.post('/api/auth/resend-verification', { email });
    return response.data;
  },
};

export const resumeApi = {
  
  getAll: async (): Promise<Resume[]> => {
    const response = await api.get('/api/resumes');
    const resumes = response.data.resumes || [];
    return resumes.map((resume: ResumeResponse) => ({
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
      if ((error as {response?: {status?: number; data?: unknown}})?.response) {
        console.error('Response status:', (error as {response?: {status?: number; data?: unknown}}).response?.status);
        console.error('Response data:', (error as {response?: {status?: number; data?: unknown}}).response?.data);
      }
      throw error;
    }
  },


  getParsedData: async (resumeId: number) => {
    const response = await api.get(`/api/resumes/parsed-data/${resumeId}`);
    return response.data.parsedData;
  },

  updateParsedData: async (resumeId: number, parsedData: ResumeData, resumeName?: string) => {
    const payload: UpdatePayload = { parsedData };
    if (resumeName) {
      payload.resumeName = resumeName;
    }
    
    const response = await api.put(`/api/resumes/parsed-data/${resumeId}`, payload);
    return response.data;
  },

  saveParsed: async (parsedData: ResumeData, resumeName: string) => {
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
        status: (error as {response?: {status?: number; statusText?: string; data?: unknown}})?.response?.status,
        statusText: (error as {response?: {status?: number; statusText?: string; data?: unknown}})?.response?.statusText,
        data: (error as {response?: {status?: number; statusText?: string; data?: unknown}})?.response?.data
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

export interface TokenUsage {
  id: number;
  operation_type: string;
  tokens_used: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TokenStats {
  totalTokens: number;
  operationStats: {
    operation_type: string;
    operation_count: string;
    total_tokens: string;
    avg_tokens: string;
    last_used: string;
  }[];
  dailyStats: {
    usage_date: string;
    daily_tokens: string;
    daily_operations: string;
  }[];
}

export interface TokenHistory {
  history: TokenUsage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const tokenApi = {
  getCurrentUsage: async () => {
    const response = await api.get('/api/tokens/usage');
    return response.data;
  },

  getTokenHistory: async (page = 1, limit = 20) => {
    const response = await api.get(`/api/tokens/history?page=${page}&limit=${limit}`);
    return response.data;
  },

  resetTokenCount: async () => {
    const response = await api.post('/api/tokens/reset');
    return response.data;
  },

  getUsageStats: async (): Promise<{success: boolean; data: TokenStats}> => {
    const response = await api.get('/api/tokens/stats');
    return response.data;
  },
};

export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  timezone: string;
  email_verified: boolean;
  admin_approved: boolean;
  account_status: string;
  created_at: string;
  approved_at?: string;
}

export interface Timezone {
  value: string;
  label: string;
}

export const accountApi = {
  getProfile: async (): Promise<{success: boolean; data: UserProfile}> => {
    const response = await api.get('/api/account/profile');
    return response.data;
  },

  updateProfile: async (updates: {
    firstName?: string;
    lastName?: string;
    timezone?: string;
  }) => {
    const response = await api.put('/api/account/profile', updates);
    return response.data;
  },

  changePassword: async (passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    const response = await api.put('/api/account/password', passwordData);
    return response.data;
  },

  getTimezones: async (): Promise<{success: boolean; data: Timezone[]}> => {
    const response = await api.get('/api/account/timezones');
    return response.data;
  },
};