'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  FileText, 
  Loader2,
  Save,
  AlertCircle
} from 'lucide-react';
import { isAuthenticatedWithValidation } from '@/lib/auth';
import { resumeApi } from '@/lib/api';
import { ResumeData } from '@/types/resume';
import EditableResumeForm from '@/components/EditableResumeForm';
import Layout from '@/components/Layout';

export default function EditResumePage() {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [originalName, setOriginalName] = useState('');
  const [resumeName, setResumeName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useParams();
  const resumeId = params.id as string;

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
  }, [router, resumeId]);

  const fetchResumeData = async () => {
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

      setOriginalName(resume.originalName);
      setResumeName(resume.originalName.replace(/\.(pdf|doc|docx)$/i, ''));

      // Then get parsed JSON data
      const parsedData = await resumeApi.getParsedData(parseInt(resumeId));
      setResumeData(parsedData);
    } catch (error) {
      console.error('Failed to fetch resume data:', error);
      setError('Failed to load resume data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (updatedData: ResumeData) => {
    setIsSaving(true);
    try {
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
        <header className="relative z-50 bg-white/90 backdrop-blur-sm shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link 
                  href="/dashboard"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Dashboard
                </Link>
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-indigo-600 mr-3" />
                  <h1 className="text-xl font-semibold text-gray-900">Edit Resume</h1>
                </div>
              </div>
              
              {/* Resume Name Editor */}
              <div className="flex items-center space-x-4">
                <div>
                  <label htmlFor="resumeName" className="block text-sm font-medium text-gray-700">
                    Resume Name
                  </label>
                  <input
                    type="text"
                    id="resumeName"
                    value={resumeName}
                    onChange={handleNameChange}
                    className="mt-1 block w-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
            <div className="mb-6 bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-md p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {resumeData ? (
            <EditableResumeForm
              initialData={resumeData}
              onSave={handleSave}
              isSaving={isSaving}
            />
          ) : (
            <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow p-6">
              <div className="text-center py-12">
                <Loader2 className="mx-auto h-12 w-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-gray-600">Loading resume data...</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}