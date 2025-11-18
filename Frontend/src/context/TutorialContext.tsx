'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tutorialApi } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement: string; // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: string; // Optional action hint
}

interface TutorialContextType {
  isWelcomeDialogOpen: boolean;
  isTutorialActive: boolean;
  currentStep: number;
  tutorialSteps: TutorialStep[];
  hasCompletedTutorial: boolean;
  startTutorial: () => void;
  startTutorialDirectly: () => void; // Start tutorial without welcome dialog
  nextStep: () => void;
  previousStep: () => void;
  exitTutorial: () => void;
  closeWelcomeDialog: () => void;
  setTutorialSteps: (steps: TutorialStep[]) => void;
  resetTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

interface TutorialProviderProps {
  children: ReactNode;
}

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children }) => {
  const [isWelcomeDialogOpen, setIsWelcomeDialogOpen] = useState(false);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tutorialSteps, setTutorialSteps] = useState<TutorialStep[]>([]);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(true);

  // Check if user has completed tutorial on mount
  useEffect(() => {
    const fetchTutorialStatus = async () => {
      // Check if user is authenticated before calling API
      const token = getAccessToken();

      if (token) {
        // User is authenticated, fetch from API
        try {
          const response = await tutorialApi.getStatus();
          const isCompleted = response.data.tutorialCompleted;
          setHasCompletedTutorial(isCompleted);

          // Show welcome dialog only if tutorial not completed
          if (!isCompleted) {
            // Delay slightly to ensure page is fully loaded
            const timer = setTimeout(() => {
              setIsWelcomeDialogOpen(true);
            }, 500);
            return () => clearTimeout(timer);
          }
        } catch (error) {
          // Fallback to localStorage if API fails
          console.warn('Failed to fetch tutorial status from API, using localStorage', error);
          const completed = localStorage.getItem('tutorialCompleted');
          const isCompleted = completed === 'true';
          setHasCompletedTutorial(isCompleted);

          // Show welcome dialog only if tutorial not completed
          if (!isCompleted) {
            const timer = setTimeout(() => {
              setIsWelcomeDialogOpen(true);
            }, 500);
            return () => clearTimeout(timer);
          }
        }
      } else {
        // User is not authenticated, use localStorage only
        const completed = localStorage.getItem('tutorialCompleted');
        const isCompleted = completed === 'true';
        setHasCompletedTutorial(isCompleted);

        // Don't show welcome dialog on public pages (login/register)
        // Only show when user is authenticated
      }
    };

    fetchTutorialStatus();
  }, []);

  const startTutorial = () => {
    setIsWelcomeDialogOpen(false);
    setIsTutorialActive(true);
    setCurrentStep(0);
  };

  const startTutorialDirectly = () => {
    // Start tutorial immediately without welcome dialog
    // Useful for page-specific tutorials
    setIsWelcomeDialogOpen(false);
    setIsTutorialActive(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Tutorial completed
      completeTutorial();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const exitTutorial = () => {
    setIsTutorialActive(false);
    setCurrentStep(0);
    completeTutorial();
  };

  const completeTutorial = async () => {
    setIsTutorialActive(false);
    setCurrentStep(0);
    setHasCompletedTutorial(true);
    localStorage.setItem('tutorialCompleted', 'true');

    // Sync with backend
    try {
      await tutorialApi.markCompleted();
    } catch (error) {
      console.error('Failed to mark tutorial as completed in database:', error);
      // Continue anyway - localStorage will serve as backup
    }
  };

  const closeWelcomeDialog = async () => {
    setIsWelcomeDialogOpen(false);
    setHasCompletedTutorial(true);
    localStorage.setItem('tutorialCompleted', 'true');

    // Mark as skipped in backend
    try {
      await tutorialApi.markSkipped();
    } catch (error) {
      console.error('Failed to mark tutorial as skipped in database:', error);
    }
  };

  const resetTutorial = async () => {
    localStorage.removeItem('tutorialCompleted');
    setHasCompletedTutorial(false);
    setIsWelcomeDialogOpen(true);
    setIsTutorialActive(false);
    setCurrentStep(0);

    // Reset in backend
    try {
      await tutorialApi.reset();
    } catch (error) {
      console.error('Failed to reset tutorial in database:', error);
    }
  };

  return (
    <TutorialContext.Provider
      value={{
        isWelcomeDialogOpen,
        isTutorialActive,
        currentStep,
        tutorialSteps,
        hasCompletedTutorial,
        startTutorial,
        startTutorialDirectly,
        nextStep,
        previousStep,
        exitTutorial,
        closeWelcomeDialog,
        setTutorialSteps,
        resetTutorial,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = (): TutorialContextType => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};
