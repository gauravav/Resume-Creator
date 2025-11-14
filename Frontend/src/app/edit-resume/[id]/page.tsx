'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { isAuthenticatedWithValidation } from '@/lib/auth';
import { resumeApi } from '@/lib/api';
import { ResumeData } from '@/types/resume';
import EditableResumeForm from '@/components/EditableResumeForm';
import Layout from '@/components/Layout';
import ThemeToggle from '@/components/ThemeToggle';

export default function EditResumePage() {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [resumeName, setResumeName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useParams();
  const resumeId = params.id as string;

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
    <Layout showNav={false}>
      <div className="min-h-screen">
        {/* Header */}
        <header className="relative z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mr-4"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Dashboard
                </Link>
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-3" />
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Resume</h1>
                </div>
              </div>

              {/* Resume Name Editor and Theme Toggle */}
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <div>
                  <label htmlFor="resumeName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Resume Name
                  </label>
                  <input
                    type="text"
                    id="resumeName"
                    value={resumeName}
                    onChange={handleNameChange}
                    className="mt-1 block w-64 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 sm:text-sm placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2"
                    placeholder="Enter resume name"
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
    </Layout>
  );
}