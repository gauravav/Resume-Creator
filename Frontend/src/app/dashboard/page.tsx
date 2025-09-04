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
  ChevronDown,
  User,
  LogOut,
  FileDown,
  Zap,
  RotateCcw
} from 'lucide-react';
import { resumeApi, Resume, authApi, tokenApi } from '@/lib/api';
import { removeToken, isAuthenticatedWithValidation } from '@/lib/auth';
import Layout from '@/components/Layout';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function DashboardPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{id: number; email: string; firstName: string; lastName: string} | null>(null);
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<{totalTokens: number} | null>(null);
  const [tokenResetLoading, setTokenResetLoading] = useState(false);
  const router = useRouter();

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-user-menu]')) {
          setUserMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  useEffect(() => {
    const validateAndLoad = async () => {
      try {
        setIsValidating(true);
        const isValid = await isAuthenticatedWithValidation();
        if (!isValid) {
          router.push('/login');
          return;
        }

        fetchUserData();
        fetchResumes();
        fetchTokenUsage();
      } catch (error) {
        console.error('Token validation error:', error);
        setError('Authentication failed. Please login again.');
        setTimeout(() => router.push('/login'), 2000);
      } finally {
        setIsValidating(false);
      }
    };

    validateAndLoad();
  }, [router]);

  const fetchUserData = async () => {
    try {
      const response = await authApi.getMe();
      setUser(response.user);
    } catch {
      console.error('Failed to fetch user data');
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

  const handleLogout = () => {
    removeToken();
    router.push('/');
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
    try {
      // Download PDF
      const blob = await resumeApi.downloadPDF(resume.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${resume.originalName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF download error:', error);
      setError('Failed to download PDF. Please ensure the resume has valid data.');
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    <Layout showNav={false}>
      <div className="min-h-screen">
        {/* Custom Header */}
        <div className="relative z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="pt-8 pb-6">
              <div className="flex justify-between items-center">
                <Link href="/" className="flex items-center group">
                  <FileText className="h-8 w-8 text-indigo-400 mr-2 group-hover:text-indigo-300 transition-colors" />
                  <span className="text-xl font-bold text-white group-hover:text-indigo-100 transition-colors">Resume Creator</span>
                </Link>
                
                {user && (
                  <div className="relative" data-user-menu>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center space-x-3 text-white hover:text-indigo-200 transition-colors bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20"
                    >
                      <div className="flex items-center space-x-2">
                        <User className="h-5 w-5" />
                        <span className="font-medium">{user.firstName} {user.lastName}</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              // TODO: Navigate to account page when implemented
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <User className="h-4 w-4 mr-2" />
                            Account
                          </button>
                          <hr className="border-gray-100" />
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              handleLogout();
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>

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
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <Zap className="h-5 w-5 text-yellow-500 mr-2" />
                  Token Usage
                </h2>
                <div className="flex items-center space-x-3">
                  <Link
                    href="/token-history"
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    View History
                  </Link>
                  <button
                    onClick={handleResetTokens}
                    disabled={tokenResetLoading}
                    className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
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
                  <p className="text-3xl font-bold text-gray-900">
                    {tokenUsage.totalTokens.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Total tokens used</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Track your API usage</p>
                  <p className="text-xs text-gray-500">
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
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">New Resume</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-4">
                Create a new resume from an uploaded file and save the structured data for editing and customization.
              </p>
              <Link
                href="/parse-resume"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                title="Upload and parse a new resume file to create structured data"
              >
                <FileText className="h-4 w-4 mr-2" />
                New Resume
              </Link>
            </div>
          </div>

          {/* Create Custom Resume */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Create Custom Resume</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-4">
                Create a tailored resume for a specific job opportunity using your base resume.
              </p>
              <Link
                href="/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
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
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Resumes List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Your Resumes</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {resumes.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No resumes yet</h3>
                <p className="text-gray-500">Upload your first resume to get started.</p>
              </div>
            ) : (
              resumes.map((resume) => (
                <div key={resume.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-indigo-600 mr-3" />
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {resume.originalName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(resume.uploadDate)} • {formatFileSize(resume.size)} 
                          {resume.isBaseResume && '• Base Resume'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/edit-resume/${resume.id}`}
                        className="inline-flex items-center p-2 border border-blue-300 rounded-md text-blue-700 hover:bg-blue-50"
                        title="Edit resume content and structure"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDownloadPDF(resume)}
                        className="inline-flex items-center p-2 border border-green-300 rounded-md text-green-700 hover:bg-green-50"
                        title="Download resume as PDF file"
                      >
                        <FileDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(resume)}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        title="Download resume data as JSON file"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(resume)}
                        disabled={isDeleting === resume.id}
                        className="inline-flex items-center p-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50 disabled:opacity-50"
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
    </Layout>
  );
}