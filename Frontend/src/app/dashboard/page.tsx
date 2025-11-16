'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Download,
  Trash2,
  Sparkles,
  Edit,
  FileDown,
  Zap,
  RotateCcw
} from 'lucide-react';
import { resumeApi, Resume, authApi, tokenApi, accountApi } from '@/lib/api';
import { isAuthenticatedWithValidation } from '@/lib/auth';
import { formatDateTime } from '@/lib/timezone';
import Layout from '@/components/Layout';
import ConfirmDialog from '@/components/ConfirmDialog';
import WelcomeDialog from '@/components/WelcomeDialog';
import TutorialOverlay from '@/components/TutorialOverlay';
import { useTutorial } from '@/context/TutorialContext';
import { dashboardTutorialSteps } from '@/config/tutorialSteps';

export default function DashboardPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState('');
  // Initialize user from localStorage to persist across rate limit errors
  const [user, setUser] = useState<{id: number; email: string; firstName: string; lastName: string; isAdmin?: boolean} | null>(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('dashboardUser');
      return storedUser ? JSON.parse(storedUser) : null;
    }
    return null;
  });
  const [userTimezone, setUserTimezone] = useState<string>('UTC');
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    resumeId: number | null;
    resumeName: string;
  }>({
    isOpen: false,
    resumeId: null,
    resumeName: ''
  });
  const [tokenUsage, setTokenUsage] = useState<{totalTokens: number} | null>(null);
  const [tokenResetLoading, setTokenResetLoading] = useState(false);
  const [generatingPDFs, setGeneratingPDFs] = useState<Set<number>>(new Set());
  const router = useRouter();

  // Tutorial hook
  const { setTutorialSteps } = useTutorial();

  // Initialize tutorial steps
  useEffect(() => {
    setTutorialSteps(dashboardTutorialSteps);
  }, [setTutorialSteps]);

  useEffect(() => {
    const validateAndLoad = async () => {
      try {
        setIsValidating(true);
        const isValid = await isAuthenticatedWithValidation();
        if (!isValid) {
          // Clear cached user data when authentication fails
          if (typeof window !== 'undefined') {
            localStorage.removeItem('dashboardUser');
          }
          router.push('/login');
          return;
        }

        fetchUserData();
        fetchResumes();
        fetchTokenUsage();
      } catch (error) {
        console.error('Token validation error:', error);
        setError('Authentication failed. Please login again.');
        // Clear cached user data on authentication failure
        if (typeof window !== 'undefined') {
          localStorage.removeItem('dashboardUser');
        }
        setTimeout(() => router.push('/login'), 2000);
      } finally {
        setIsValidating(false);
      }
    };

    validateAndLoad();
  }, [router]);

  // Subscribe to real-time PDF status updates via SSE
  // Only establish connection after authentication is validated
  useEffect(() => {
    // Don't establish connection if still validating or user not authenticated
    if (isValidating) {
      return;
    }

    console.log('Setting up SSE connection...');

    const eventSource = resumeApi.subscribeToPDFUpdates(
      (data) => {
        console.log('Received PDF status update:', data);

        // Type guard for PDF update data
        const updateData = data as {
          type?: string;
          resumeId?: number;
          status?: 'pending' | 'generating' | 'ready' | 'failed';
          pdfFileName?: string;
          pdfGeneratedAt?: string;
          message?: string;
        };

        if (updateData.type === 'pdf_status_update' && updateData.resumeId) {
          // Update the resume in state
          setResumes(prev => prev.map(r =>
            r.id === updateData.resumeId
              ? {
                  ...r,
                  ...(updateData.status && { pdfStatus: updateData.status }),
                  ...(updateData.pdfFileName && { pdfFileName: updateData.pdfFileName }),
                  ...(updateData.pdfGeneratedAt && { pdfGeneratedAt: updateData.pdfGeneratedAt })
                }
              : r
          ));

          // Show success notification when PDF is ready
          if (updateData.status === 'ready') {
            console.log(`PDF ready for resume ${updateData.resumeId}`);
          } else if (updateData.status === 'failed') {
            console.error(`PDF generation failed for resume ${updateData.resumeId}:`, updateData.message);
          }
        }
      },
      (error) => {
        console.error('SSE connection error:', error);
        // SSE will automatically reconnect, so we don't need to handle this explicitly
      }
    );

    // Cleanup: close SSE connection when component unmounts
    return () => {
      if (eventSource) {
        eventSource.close();
        console.log('SSE connection closed');
      }
    };
  }, [isValidating]); // Wait for authentication validation to complete

  const fetchUserData = async () => {
    try {
      const response = await authApi.getMe();
      const userData = response.user;
      setUser(userData);

      // Persist user data to localStorage to maintain access even during rate limit errors
      if (typeof window !== 'undefined') {
        localStorage.setItem('dashboardUser', JSON.stringify(userData));
      }

      // Fetch user profile to get timezone
      const profileResponse = await accountApi.getProfile();
      if (profileResponse.data && profileResponse.data.timezone) {
        setUserTimezone(profileResponse.data.timezone);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      // Don't clear user state on error - keep the localStorage cached version
      // This ensures user menu remains accessible during rate limits
    }
  };

  const fetchResumes = async () => {
    try {
      setError('');
      const resumeList = await resumeApi.getAll();
      setResumes(resumeList);
    } catch {
      setError('Failed to load resumes');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTokenUsage = async () => {
    try {
      const response = await tokenApi.getCurrentUsage();
      setTokenUsage(response.data);
    } catch (error) {
      console.error('Failed to fetch token usage:', error);
    }
  };

  const handleResetTokens = async () => {
    if (!confirm('Are you sure you want to reset your token count? This action cannot be undone.')) {
      return;
    }

    setTokenResetLoading(true);
    try {
      await tokenApi.resetTokenCount();
      await fetchTokenUsage(); // Refresh the usage count
    } catch (error) {
      console.error('Failed to reset tokens:', error);
      setError('Failed to reset token count');
    } finally {
      setTokenResetLoading(false);
    }
  };

  const handleDownload = async (resume: Resume) => {
    try {
      // Download JSON data
      const blob = await resumeApi.download(resume.jsonFileName);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${resume.originalName}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download resume data');
    }
  };

  const handleDownloadPDF = async (resume: Resume) => {
    if (resume.pdfStatus !== 'ready') {
      if (resume.pdfStatus === 'generating') {
        setError('PDF is still being generated. Please wait a moment.');
      } else if (resume.pdfStatus === 'failed') {
        setError('PDF generation failed. Please try re-uploading the resume.');
      } else {
        setError('PDF is not ready yet. Please wait for generation to complete.');
      }
      return;
    }

    try {
      const blob = await resumeApi.downloadPDF(resume.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${resume.originalName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      console.error('PDF download error:', error);
      const err = error as { response?: { data?: { pdfStatus?: string } } };
      if (err?.response?.data?.pdfStatus) {
        const status = err.response.data.pdfStatus;
        if (status === 'generating') {
          setError('PDF is still being generated. Please try again in a moment.');
        } else if (status === 'failed') {
          setError('PDF generation failed. Please contact support.');
        } else {
          setError('PDF is not ready yet. Please wait.');
        }
      } else {
        setError('Failed to download PDF. Please ensure the resume has valid data.');
      }
    }
  };

  const handleDeleteClick = (resume: Resume) => {
    setDeleteDialog({
      isOpen: true,
      resumeId: resume.id,
      resumeName: resume.originalName
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.resumeId) return;

    setIsDeleting(deleteDialog.resumeId);
    try {
      await resumeApi.delete(deleteDialog.resumeId);
      setResumes(resumes.filter(resume => resume.id !== deleteDialog.resumeId));
      setDeleteDialog({ isOpen: false, resumeId: null, resumeName: '' });
    } catch {
      setError('Failed to delete resume');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, resumeId: null, resumeName: '' });
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return formatDateTime(dateString, userTimezone);
  };

  if (isValidating || isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white text-sm">
              {isValidating ? 'Validating authentication...' : 'Loading dashboard...'}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            {user && (
              <p className="text-gray-200">
                Welcome back, {user.firstName} {user.lastName}!
              </p>
            )}
          </div>

        {/* Token Usage Section */}
        {tokenUsage && (
          <div className="token-usage-section bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <Zap className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mr-2" />
                  Token Usage
                </h2>
                <div className="flex items-center space-x-3">
                  <Link
                    href="/token-history"
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                  >
                    View History
                  </Link>
                  <button
                    onClick={handleResetTokens}
                    disabled={tokenResetLoading}
                    className="inline-flex items-center px-3 py-1 border border-red-300 dark:border-red-700 rounded-md text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                    title="Reset your token count to zero"
                  >
                    {tokenResetLoading ? (
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-1" />
                    )}
                    Reset
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {tokenUsage.totalTokens.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total tokens used</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Track your API usage</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Includes resume parsing, customization, and rewriting
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* New Resume */}
          <div className="new-resume-card bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">New Resume</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Create a new resume from an uploaded file and save the structured data for editing and customization.
              </p>
              <Link
                href="/parse-resume"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600"
                title="Upload and parse a new resume file to create structured data"
              >
                <FileText className="h-4 w-4 mr-2" />
                New Resume
              </Link>
            </div>
          </div>

          {/* Create Custom Resume */}
          <div className="custom-resume-card bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Create Custom Resume</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Create a tailored resume for a specific job opportunity using your base resume.
              </p>
              <Link
                href="/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600"
                title="Create a tailored resume for a specific job using AI customization"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Create Custom Resume
              </Link>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md p-4 mb-6">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Resumes List */}
        <div className="resumes-list-section bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Your Resumes</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {resumes.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No resumes yet</h3>
                <p className="text-gray-500 dark:text-gray-400">Upload your first resume to get started.</p>
              </div>
            ) : (
              resumes.map((resume) => (
                <div key={resume.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-3" />
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {resume.originalName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(resume.uploadDate)} • {formatFileSize(resume.size)}
                          {resume.isBaseResume && '• Base Resume'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/edit-resume/${resume.id}`}
                        className="inline-flex items-center p-2 border border-blue-300 dark:border-blue-700 rounded-md text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        title="Edit resume content and structure"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDownloadPDF(resume)}
                        disabled={resume.pdfStatus !== 'ready'}
                        className={`inline-flex items-center p-2 border rounded-md ${
                          resume.pdfStatus === 'ready'
                            ? 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                            : resume.pdfStatus === 'generating'
                            ? 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 cursor-not-allowed opacity-75'
                            : resume.pdfStatus === 'failed'
                            ? 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 cursor-not-allowed opacity-75'
                            : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-500 cursor-not-allowed opacity-75'
                        }`}
                        title={
                          resume.pdfStatus === 'ready'
                            ? 'Download resume as PDF file'
                            : resume.pdfStatus === 'generating'
                            ? 'PDF is being generated... Please wait'
                            : resume.pdfStatus === 'failed'
                            ? 'PDF generation failed'
                            : 'PDF generation pending...'
                        }
                      >
                        {resume.pdfStatus === 'generating' ? (
                          <RotateCcw className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDownload(resume)}
                        className="inline-flex items-center p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        title="Download resume data as JSON file"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(resume)}
                        disabled={isDeleting === resume.id}
                        className="inline-flex items-center p-2 border border-red-300 dark:border-red-700 rounded-md text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                        title="Permanently delete this resume"
                      >
                        {isDeleting === resume.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </main>
      </div>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Resume"
        message={`Are you sure you want to delete "${deleteDialog.resumeName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting === deleteDialog.resumeId}
      />

      {/* Tutorial Components */}
      <WelcomeDialog />
      <TutorialOverlay />
    </Layout>
  );
}