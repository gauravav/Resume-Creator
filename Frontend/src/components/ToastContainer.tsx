'use client';

import { useState, useCallback, useEffect } from 'react';
import Toast from './Toast';

interface ToastData {
  id: string;
  type: 'success' | 'error' | 'warning';
  message: string;
  duration?: number;
  timestamp?: number;
}

let toastManager: {
  addToast: (toast: Omit<ToastData, 'id' | 'timestamp'>) => void;
} | null = null;

export function useToast() {
  return {
    showToast: (toast: Omit<ToastData, 'id' | 'timestamp'>) => {
      if (toastManager) {
        toastManager.addToast(toast);
      }
    }
  };
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const timestamp = Date.now();
    
    // Check for duplicate toasts (especially rate limit ones)
    setToasts(prev => {
      // If this is a rate limit toast, check for existing similar toasts
      if (toast.message.includes('Rate limit exceeded')) {
        const existingRateLimitToast = prev.find(t => 
          t.message.includes('Rate limit exceeded') && 
          t.type === 'warning'
        );
        
        // If we already have a rate limit toast showing, don't add another
        if (existingRateLimitToast) {
          return prev;
        }
      }
      
      // Check for exact duplicate messages within the last 5 seconds
      const duplicateToast = prev.find(t => 
        t.message === toast.message && 
        t.type === toast.type &&
        t.timestamp &&
        (timestamp - t.timestamp) < 5000
      );
      
      if (duplicateToast) {
        return prev;
      }
      
      return [...prev, { ...toast, id, timestamp }];
    });
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

    // Listen for custom toast events (e.g., from API interceptors)
    const handleCustomToast = (event: CustomEvent) => {
      addToast(event.detail);
    };

    window.addEventListener('showToast', handleCustomToast as EventListener);

    return () => {
      toastManager = null;
      window.removeEventListener('showToast', handleCustomToast as EventListener);
    };
  }, [addToast]);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-4 pointer-events-none">
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