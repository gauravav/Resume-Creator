'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { isAuthenticatedWithValidation } from '@/lib/auth';
import { resumeApi } from '@/lib/api';
import { ResumeData } from '@/types/resume';
import EditableResumeForm from '@/components/EditableResumeForm';
import Layout from '@/components/Layout';
import TutorialOverlay from '@/components/TutorialOverlay';
import { useTutorial } from '@/context/TutorialContext';
import { editResumeTutorialSteps } from '@/config/tutorialSteps';

export default function EditResumePage() {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [resumeName, setResumeName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useParams();
  const resumeId = params.id as string;

  // Tutorial hook
  const { setTutorialSteps, startTutorialDirectly, isTutorialActive } = useTutorial();

  // Initialize tutorial steps
  useEffect(() => {
    setTutorialSteps(editResumeTutorialSteps);
  }, [setTutorialSteps]);

  const fetchResumeData = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);

      // First get resume metadata
      const resumesResponse = await resumeApi.getAll();
      const resume = resumesResponse.find(r => r.id.toString() === resumeId);

      if (!resume) {
        setError('Resume not found');
        return;
      }

      setResumeName(resume.originalName.replace(/\.(pdf|doc|docx)$/i, ''));

      // Get parsed data - it's always JSON now
      const response = await resumeApi.getParsedData(parseInt(resumeId));

      // Check response format
      if (typeof response === 'object' && 'parsedData' in response) {
        setResumeData(response.parsedData);
      } else {
        // Direct data
        setResumeData(response);
      }
    } catch (error) {
      console.error('Failed to fetch resume data:', error);
      setError('Failed to load resume data');
    } finally {
      setIsLoading(false);
    }
  }, [resumeId]);

  useEffect(() => {
    const validateAndLoad = async () => {
      const isValid = await isAuthenticatedWithValidation();
      if (!isValid) {
        router.push('/login');
        return;
      }

      fetchResumeData();
    };

    validateAndLoad();
  }, [router, resumeId, fetchResumeData]);

  const handleSave = async (updatedData: ResumeData) => {
    setIsSaving(true);
    try {
      // Send the JSON data - backend will handle conversion to LaTeX if needed
      await resumeApi.updateParsedData(parseInt(resumeId), updatedData, resumeName);
      router.push('/dashboard');
    } catch (error) {
      console.error('Save error:', error);
      setError('Failed to save resume. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResumeName(e.target.value);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error && !resumeData) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Error</h3>
            <p className="text-gray-200 mb-6">{error}</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen">
        <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Resume Name Editor */}
          <div className="mb-6">
            <label htmlFor="resumeName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Resume Name
            </label>
            <input
              type="text"
              id="resumeName"
              value={resumeName}
              onChange={handleNameChange}
              className="block w-full max-w-md rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 sm:text-sm placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2"
              placeholder="Enter resume name"
            />
          </div>
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50/90 dark:bg-red-900/30 backdrop-blur-sm border border-red-200 dark:border-red-700 rounded-md p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          {resumeData ? (
            <EditableResumeForm
              initialData={resumeData as ResumeData}
              onSave={handleSave}
              isSaving={isSaving}
            />
          ) : (
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow p-6">
              <div className="text-center py-12">
                <Loader2 className="mx-auto h-12 w-12 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Loading resume data...</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Tutorial Help Button */}
      {!isTutorialActive && (
        <button
          onClick={startTutorialDirectly}
          className="fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all"
          title="Start tutorial"
          aria-label="Start tutorial"
        >
          <HelpCircle className="h-6 w-6" />
        </button>
      )}

      {/* Tutorial Overlay */}
      <TutorialOverlay />
    </Layout>
  );
}