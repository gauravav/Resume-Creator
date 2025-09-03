'use client';

import { useState, useCallback, useEffect } from 'react';
import Toast from './Toast';

interface ToastData {
  id: string;
  type: 'success' | 'error' | 'warning';
  message: string;
  duration?: number;
}

let toastManager: {
  addToast: (toast: Omit<ToastData, 'id'>) => void;
} | null = null;

export function useToast() {
  return {
    showToast: (toast: Omit<ToastData, 'id'>) => {
      if (toastManager) {
        toastManager.addToast(toast);
      }
    }
  };
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  useEffect(() => {
    toastManager = { addToast };
    
    // Check for success message from URL params or sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const successMessage = urlParams.get('success') || sessionStorage.getItem('successMessage');
    
    if (successMessage) {
      addToast({
        type: 'success',
        message: successMessage
      });
      
      // Clear the message
      sessionStorage.removeItem('successMessage');
      
      // Remove from URL without reloading
      if (urlParams.get('success')) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }

    return () => {
      toastManager = null;
    };
  }, [addToast]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-4 pointer-events-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={removeToast}
        />
      ))}
    </div>
  );
}