import axios from 'axios';
import Cookies from 'js-cookie';
import { ResumeData } from '@/types/resume';

/**
 * Dynamically construct API URL based on current hostname
 * Always uses port 3200 for backend API
 * Works with localhost, network IPs (192.168.x.x), and production servers
 */
export const getApiBaseUrl = () => {
  // Server-side rendering fallback
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL_DEV || 'http://localhost:3200';
  }

  // Get current hostname and protocol
  const hostname = window.location.hostname;
  const protocol = window.location.protocol; // 'http:' or 'https:'

  // Backend always runs on port 3200
  const API_PORT = '3200';

  // Construct dynamic API URL: protocol://hostname:3200
  return `${protocol}//${hostname}:${API_PORT}`;
};

const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken') || Cookies.get('token'); // Support both old and new token names
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Rate limit toast deduplication
let lastRateLimitToast: { message: string; timestamp: number } | null = null;
const RATE_LIMIT_TOAST_COOLDOWN = 10000; // 10 seconds cooldown between same rate limit toasts

// Session expiration toast deduplication
let sessionExpiredShown = false;

// Track if we're currently refreshing to avoid multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{resolve: (value?: unknown) => void; reject: (reason?: unknown) => void}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

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

    // Handle expired/invalid token (401 Unauthorized)
    if (error.response?.status === 401 &&
        !error.config?.url?.includes('/api/auth/login') &&
        !error.config?.url?.includes('/api/auth/register') &&
        !error.config?.url?.includes('/api/auth/resend-verification')) {

      // Check if it's a token expiration error
      const errorCode = error.response?.data?.code;
      const errorMessage = error.response?.data?.message;

      // Handle token expiration with refresh token
      if (errorCode === 'TOKEN_EXPIRED' && !originalRequest._retry) {
        if (isRefreshing) {
          // If already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(() => {
            return api(originalRequest);
          }).catch(err => {
            return Promise.reject(err);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = Cookies.get('refreshToken');
        if (!refreshToken) {
          // No refresh token available, redirect to login
          isRefreshing = false;
          if (!sessionExpiredShown && typeof window !== 'undefined') {
            sessionExpiredShown = true;
            const toastEvent = new CustomEvent('showToast', {
              detail: {
                type: 'error',
                message: 'Your session has expired. Please log in again.',
                duration: 5000
              }
            });
            window.dispatchEvent(toastEvent);

            Cookies.remove('accessToken');
            Cookies.remove('refreshToken');
            Cookies.remove('token'); // Remove old token cookie
            localStorage.removeItem('navbarUser');
            localStorage.removeItem('dashboardUser');

            setTimeout(() => {
              sessionExpiredShown = false;
              window.location.href = '/login';
            }, 1500);
          }
          return Promise.reject(error);
        }

        try {
          // Attempt to refresh the token
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {
            refreshToken
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          // Update tokens in cookies
          Cookies.set('accessToken', accessToken, { expires: 7 });
          Cookies.set('refreshToken', newRefreshToken, { expires: 7 });
          Cookies.remove('token'); // Remove old token cookie

          // Update authorization header for the original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          // Process queued requests
          processQueue(null, accessToken);
          isRefreshing = false;

          // Retry the original request
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh token failed or expired
          processQueue(refreshError, null);
          isRefreshing = false;

          if (!sessionExpiredShown && typeof window !== 'undefined') {
            sessionExpiredShown = true;
            const toastEvent = new CustomEvent('showToast', {
              detail: {
                type: 'error',
                message: 'Your session has expired. Please log in again.',
                duration: 5000
              }
            });
            window.dispatchEvent(toastEvent);

            Cookies.remove('accessToken');
            Cookies.remove('refreshToken');
            Cookies.remove('token'); // Remove old token cookie
            localStorage.removeItem('navbarUser');
            localStorage.removeItem('dashboardUser');

            setTimeout(() => {
              sessionExpiredShown = false;
              window.location.href = '/login';
            }, 1500);
          }

          return Promise.reject(refreshError);
        }
      }

      if (errorCode === 'PENDING_APPROVAL' || errorMessage?.includes('pending approval')) {
        // User is waiting for admin approval - show friendly message
        if (typeof window !== 'undefined') {
          const toastEvent = new CustomEvent('showToast', {
            detail: {
              type: 'warning',
              message: '⏳ Your account is pending admin approval. You will receive an email once approved.',
              duration: 8000
            }
          });
          window.dispatchEvent(toastEvent);

          // Redirect to login (but don't clear token - they have a valid token, just pending)
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
      } else if (errorCode === 'EMAIL_NOT_VERIFIED') {
        // User hasn't verified email yet
        if (typeof window !== 'undefined') {
          const toastEvent = new CustomEvent('showToast', {
            detail: {
              type: 'warning',
              message: '📧 Please verify your email address before accessing your account.',
              duration: 6000
            }
          });
          window.dispatchEvent(toastEvent);

          // Clear token and redirect to login
          Cookies.remove('token');
          localStorage.removeItem('navbarUser');
          localStorage.removeItem('dashboardUser');

          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        }
      } else {
        // Actual session expiration - only show the message once
        if (!sessionExpiredShown && typeof window !== 'undefined') {
          sessionExpiredShown = true;

          // Show session expired toast
          const toastEvent = new CustomEvent('showToast', {
            detail: {
              type: 'error',
              message: 'Your session has expired. Please log in again.',
              duration: 5000
            }
          });
          window.dispatchEvent(toastEvent);

          // Clear all auth-related data
          Cookies.remove('token');
          localStorage.removeItem('navbarUser');
          localStorage.removeItem('dashboardUser');

          // Redirect to login after a short delay to show the toast
          setTimeout(() => {
            sessionExpiredShown = false; // Reset for next session
            window.location.href = '/login';
          }, 1500);
        }
      }
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
  pdfFileName?: string;
  pdfStatus?: 'pending' | 'generating' | 'ready' | 'failed';
  pdfGeneratedAt?: string;
  originalName: string;
  uploadDate: string;
  size: number;
  isBaseResume: boolean;
}

interface UpdatePayload {
  parsedData: ResumeData;
  resumeName?: string;
}

interface ResumeApiResponse {
  id: number;
  fileName?: string;
  resumeFileName: string;
  jsonFileName: string;
  pdfFileName?: string;
  pdfStatus?: string;
  pdfGeneratedAt?: string;
  originalName: string;
  uploadDate: string;
  size: string | number;
  isBaseResume: boolean;
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

  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/api/auth/refresh-token', { refreshToken });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },
};

export const resumeApi = {
  
  getAll: async (): Promise<Resume[]> => {
    const response = await api.get('/api/resumes');
    const resumes = response.data.resumes || [];
    return resumes.map((resume: ResumeApiResponse) => ({
      id: resume.id,
      fileName: resume.fileName || resume.resumeFileName,
      resumeFileName: resume.resumeFileName,
      jsonFileName: resume.jsonFileName,
      pdfFileName: resume.pdfFileName,
      pdfStatus: resume.pdfStatus || 'pending',
      pdfGeneratedAt: resume.pdfGeneratedAt,
      originalName: resume.originalName,
      uploadDate: resume.uploadDate,
      size: typeof resume.size === 'string' ? parseInt(resume.size) : resume.size,
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

  parse: async (file: File, format: 'json' | 'latex' = 'json') => {
    console.log('=== FRONTEND DEBUG: Starting resume parse ===');
    console.log('File name:', file.name);
    console.log('File size:', file.size);
    console.log('Format:', format);
    console.log('API Base URL:', API_BASE_URL);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      console.log(`Making request to /api/resumes/parse?format=${format}...`);
      const response = await api.post(`/api/resumes/parse?format=${format}`, formData, {
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
    return response.data; // Returns JSON data
  },

  updateParsedData: async (resumeId: number, parsedData: ResumeData, resumeName?: string) => {
    const payload: UpdatePayload = { parsedData };
    if (resumeName) {
      payload.resumeName = resumeName;
    }
    
    const response = await api.put(`/api/resumes/parsed-data/${resumeId}`, payload);
    return response.data;
  },

  saveParsed: async (parsedData: ResumeData | string, resumeName: string, structureMetadata?: Record<string, unknown>) => {
    console.log('API saveParsed called with:', {
      resumeName,
      parsedDataType: typeof parsedData,
      parsedDataKeys: typeof parsedData === 'object' ? Object.keys(parsedData) : 'string',
      hasStructureMetadata: !!structureMetadata
    });

    const payload = {
      parsedData: JSON.stringify(parsedData),
      resumeName: resumeName,
      structureMetadata: structureMetadata ? JSON.stringify(structureMetadata) : undefined
    };

    console.log('API payload prepared:', {
      resumeName: payload.resumeName,
      parsedDataLength: payload.parsedData.length,
      parsedDataPreview: payload.parsedData.substring(0, 200) + '...',
      hasStructureMetadata: !!payload.structureMetadata
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

  downloadWord: async (resumeId: number) => {
    const response = await api.get(`/api/resumes/docx/${resumeId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  checkPDFStatus: async (resumeId: number) => {
    const response = await api.get(`/api/resumes/pdf-status/${resumeId}`);
    return response.data;
  },

  subscribeToPDFUpdates: (onUpdate: (data: unknown) => void, onError?: (error: Error) => void): EventSource | null => {
    // Check if we're in browser context
    if (typeof window === 'undefined') {
      console.warn('subscribeToPDFUpdates called in non-browser context');
      return null;
    }

    // Get token from cookies (same as other API calls)
    const token = Cookies.get('token');
    if (!token) {
      console.error('No authentication token found for SSE connection');
      if (onError) {
        onError(new Error('No authentication token available'));
      }
      return null;
    }

    const baseURL = getApiBaseUrl();

    // EventSource doesn't support custom headers, so we pass token as query param
    const url = `${baseURL}/api/resumes/pdf-updates?token=${encodeURIComponent(token)}`;

    console.log('Establishing SSE connection to:', url.replace(/token=[^&]+/, 'token=***'));

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE message received:', data);
        onUpdate(data);
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = () => {
      // EventSource error events don't provide much detail, but we can check the readyState
      const readyState = eventSource.readyState;
      const states = {
        0: 'CONNECTING',
        1: 'OPEN',
        2: 'CLOSED'
      };

      const errorDetails = {
        readyState: states[readyState as keyof typeof states] || readyState,
        url: url.replace(/token=[^&]+/, 'token=***'),
        timestamp: new Date().toISOString()
      };

      console.error('SSE connection error:', errorDetails);

      // Only call onError if connection is permanently closed
      if (readyState === EventSource.CLOSED) {
        console.error('SSE connection closed. This could be due to:');
        console.error('1. Network connectivity issues');
        console.error('2. CORS configuration problems');
        console.error('3. Backend server not running');
        console.error('4. Authentication token expired or invalid');

        if (onError) {
          onError(new Error(`SSE connection failed (state: ${states[readyState as keyof typeof states]})`));
        }
      }
    };

    eventSource.onopen = () => {
      console.log('SSE connection opened successfully');
    };

    return eventSource;
  },

  convertLatexToPDF: async (latexCode: string) => {
    const response = await api.post('/api/latex/convert', {
      latexContent: latexCode
    }, {
      responseType: 'blob',
    });
    return response.data;
  },

  validateLatex: async (latexCode: string) => {
    const response = await api.post('/api/latex/validate', {
      latexContent: latexCode
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

export interface TutorialStatus {
  tutorialCompleted: boolean;
  tutorialCompletedAt: string | null;
  tutorialSkipped: boolean;
}

export const tutorialApi = {
  getStatus: async (): Promise<{success: boolean; data: TutorialStatus}> => {
    const response = await api.get('/api/tutorial/status');
    return response.data;
  },

  markCompleted: async () => {
    const response = await api.post('/api/tutorial/complete');
    return response.data;
  },

  markSkipped: async () => {
    const response = await api.post('/api/tutorial/skip');
    return response.data;
  },

  reset: async () => {
    const response = await api.post('/api/tutorial/reset');
    return response.data;
  },
};