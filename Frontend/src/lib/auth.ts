import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { authApi } from './api';

interface TokenPayload {
  userId: number;
  email?: string;
  exp: number;
}

export const setToken = (token: string) => {
  Cookies.set('token', token, { expires: 7 });
};

export const getToken = (): string | null => {
  return Cookies.get('token') || null;
};

export const removeToken = () => {
  Cookies.remove('token');
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
    console.warn('Token validation network error, assuming valid:', error.message);
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