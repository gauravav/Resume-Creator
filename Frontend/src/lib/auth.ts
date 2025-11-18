import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { authApi } from './api';

interface TokenPayload {
  userId: number;
  email?: string;
  exp: number;
}

// New token management for access and refresh tokens
export const setTokens = (accessToken: string, refreshToken: string) => {
  Cookies.set('accessToken', accessToken, { expires: 7 });
  Cookies.set('refreshToken', refreshToken, { expires: 7 });
  // Remove old token cookie if it exists
  Cookies.remove('token');
};

export const getAccessToken = (): string | null => {
  return Cookies.get('accessToken') || Cookies.get('token') || null; // Support both old and new
};

export const getRefreshToken = (): string | null => {
  return Cookies.get('refreshToken') || null;
};

export const removeTokens = () => {
  Cookies.remove('accessToken');
  Cookies.remove('refreshToken');
  Cookies.remove('token'); // Remove old token cookie
};

// Legacy methods for backward compatibility
export const setToken = (token: string) => {
  Cookies.set('accessToken', token, { expires: 7 });
  Cookies.remove('token'); // Remove old token cookie
};

export const getToken = (): string | null => {
  return getAccessToken();
};

export const removeToken = () => {
  removeTokens();
};

export const isAuthenticated = (): boolean => {
  const token = getToken();
  if (!token) return false;
  
  try {
    const decoded: TokenPayload = jwtDecode(token);
    return decoded.exp > Date.now() / 1000;
  } catch {
    removeToken();
    return false;
  }
};

export const getCurrentUser = (): TokenPayload | null => {
  const token = getToken();
  if (!token) return null;
  
  try {
    return jwtDecode(token);
  } catch {
    removeToken();
    return null;
  }
};

export const validateTokenWithServer = async (): Promise<boolean> => {
  const token = getToken();
  if (!token) return false;
  
  try {
    const result = await authApi.validateToken();
    return result.valid === true;
  } catch (error: unknown) {
    // Token is invalid on server side
    if ((error as {response?: {status?: number}}).response?.status === 401 || (error as {response?: {status?: number}}).response?.status === 403) {
      removeToken();
      return false;
    }
    // Network or other errors - assume token is valid for now
    console.warn('Token validation network error, assuming valid:', error instanceof Error ? error.message : 'Unknown error');
    return true;
  }
};

export const isAuthenticatedWithValidation = async (): Promise<boolean> => {
  // First check local expiration
  if (!isAuthenticated()) {
    return false;
  }
  
  // Then validate with server
  return await validateTokenWithServer();
};