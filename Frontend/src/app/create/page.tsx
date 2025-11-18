'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Check,
  ChevronRight,
  Loader2,
  Sparkles,
  Calendar,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { isAuthenticatedWithValidation, getToken } from '@/lib/auth';
import { resumeApi, Resume, getApiBaseUrl } from '@/lib/api';
import { ResumeData } from '@/types/resume';

// Helper function to ensure technologies is in array format
// Keep it as array so LLM can freely rename categories and add new ones
const normalizeTechnologies = (data: ResumeData): ResumeData => {
  // If it's already an array, return as-is
  if (Array.isArray(data.technologies)) {
    return data;
  }

  // If it's an object format (from old data), keep it as-is for backward compatibility
  // The UI will handle both formats
  return data;
};
import EditableResumeForm from '@/components/EditableResumeForm';
import CustomResumeForm from '@/components/CustomResumeForm';
import Layout from '@/components/Layout';
import ChangeHighlighter from '@/components/ChangeHighlighter';
import SaveCustomResumeDialog from '@/components/SaveCustomResumeDialog';
import ParsingGames from '@/components/ParsingGames';
import TutorialOverlay from '@/components/TutorialOverlay';
import { useTutorial } from '@/context/TutorialContext';
import { createResumeTutorialSteps } from '@/config/tutorialSteps';

type CreateStep = 'select' | 'customize';

export default function CreateResumePage() {
  const [step, setStep] = useState<CreateStep>('select');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [customizedResumeData, setCustomizedResumeData] = useState<ResumeData | null>(null);
  const [customResumeName, setCustomResumeName] = useState('');
  const [originalResumeData, setOriginalResumeData] = useState<ResumeData | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showGamesModal, setShowGamesModal] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const [urlError, setUrlError] = useState('');
  const router = useRouter();

  // Tutorial hook
  const { setTutorialSteps, startTutorialDirectly, isTutorialActive } = useTutorial();

  // Initialize tutorial steps
  useEffect(() => {
    setTutorialSteps(createResumeTutorialSteps);
  }, [setTutorialSteps]);

  useEffect(() => {
    const validateAndLoad = async () => {
      const isValid = await isAuthenticatedWithValidation();
      if (!isValid) {
        router.push('/login');
        return;
      }

      fetchResumes();
    };

    validateAndLoad();
  }, [router]);

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

  const handleScrapeUrl = async () => {
    if (!jobUrl.trim()) {
      setUrlError('Please enter a URL');
      return;
    }

    setIsScrapingUrl(true);
    setUrlError('');

    try {
      const token = getToken();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3200'}/api/jobs/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ url: jobUrl })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to scrape job posting');
      }

      const result = await response.json();
      const { companyName, jobDescription, responsibilities } = result.data;

      // Auto-fill company name
      if (companyName) {
        setCompanyName(companyName);
      }

      // Combine job description and responsibilities
      let fullJobDescription = '';
      if (jobDescription) {
        fullJobDescription = jobDescription;
      }
      if (responsibilities && responsibilities.length > 0) {
        fullJobDescription += fullJobDescription ? '\n\nKey Responsibilities:\n' : 'Key Responsibilities:\n';
        fullJobDescription += responsibilities.map((r: string) => `• ${r}`).join('\n');
      }

      setJobDescription(fullJobDescription);
      setUrlError('');

    } catch (error) {
      console.error('URL scraping error:', error);
      setUrlError(error instanceof Error ? error.message : 'Failed to scrape URL. Please try again.');
    } finally {
      setIsScrapingUrl(false);
    }
  };

  const handleSelectResume = async (resume: Resume) => {
    try {
      setError('');
      setSelectedResume(resume);

      // Fetch the parsed data for the selected resume
      const response = await resumeApi.getParsedData(resume.id);

      // Extract parsedData from response
      const parsedData = typeof response === 'object' && 'parsedData' in response
        ? response.parsedData
        : response;

      // Normalize technologies format
      const normalizedData = normalizeTechnologies(parsedData);

      setResumeData(normalizedData);
      setOriginalResumeData(JSON.parse(JSON.stringify(normalizedData))); // Deep clone
      setStep('customize');
    } catch (error) {
      console.error('Failed to fetch resume data:', error);
      setError('Failed to load resume data');
    }
  };

  const handleJobDescriptionChange = (value: string) => {
    setJobDescription(value);
  };

  const handleResumeDataChange = (updatedData: ResumeData) => {
    setResumeData(updatedData);
  };

  const handleCreateCustomResume = async () => {
    if (!selectedResume || !resumeData || !jobDescription.trim()) {
      setError('Please provide a job description');
      return;
    }

    setIsCreating(true);
    setShowGamesModal(true);
    setError('');

    try {
      // Use LLM integration to customize resume for the job
      const result = await resumeApi.customizeForJob(selectedResume.id, {
        description: jobDescription
      });

      console.log('Custom resume created successfully:', result);

      // Normalize technologies format (keep as array for flexibility)
      const normalizedData = normalizeTechnologies(result.modifiedResumeData);

      // Set the customized resume data for preview
      setCustomizedResumeData(normalizedData);
      setCustomResumeName(result.customResumeName || `${selectedResume.originalName} - Custom`);

    } catch (error) {
      console.error('Failed to create custom resume:', error);
      setError('Failed to create custom resume. Please try again.');
      setShowGamesModal(false); // Close on error
    } finally {
      setIsCreating(false);
      // Don't close modal here - let user close it manually
    }
  };

  const handleSaveCustomResume = async (resumeName: string) => {
    if (!customizedResumeData) {
      console.error('No customized resume data available');
      throw new Error('No customized resume data available');
    }

    console.log('Starting handleSaveCustomResume with:', {
      resumeName,
      dataAvailable: !!customizedResumeData,
      dataKeys: customizedResumeData ? Object.keys(customizedResumeData) : []
    });

    try {
      console.log('Calling resumeApi.saveParsed with:', {
        resumeName,
        dataPreview: {
          personalInfo: customizedResumeData.personalInfo?.firstName + ' ' + customizedResumeData.personalInfo?.lastName,
          experienceCount: customizedResumeData.experience?.length,
          projectsCount: customizedResumeData.projects?.length
        }
      });
      
      const result = await resumeApi.saveParsed(customizedResumeData, resumeName);
      console.log('resumeApi.saveParsed result:', result);
      
      // Close the dialog
      setShowSaveDialog(false);
      console.log('Dialog closed, redirecting to dashboard');
      
      // Redirect to dashboard after saving
      router.push('/dashboard');
    } catch (error) {
      console.error('handleSaveCustomResume error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        response: (error as {response?: unknown}).response,
        status: (error as {response?: {status?: unknown}}).response?.status,
        data: (error as {response?: {data?: unknown}}).response?.data
      });
      throw error; // Re-throw to let the dialog handle it
    }
  };

  const handleShowSaveDialog = () => {
    console.log('Opening save dialog');
    console.log('Customized resume data available:', !!customizedResumeData);
    console.log('Original resume data available:', !!originalResumeData);
    setShowSaveDialog(true);
  };


  const handleBackToCustomize = () => {
    setCustomizedResumeData(null);
    setCustomResumeName('');
    setError('');
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes: number): string => {
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white text-sm">Loading your resumes...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="relative z-10 pt-4">
          {/* Preview Mode - Show after LLM customization */}
          {customizedResumeData && (
            <div className="flex fixed top-16 left-0 right-0 bottom-0">
              {/* Left Panel - Resume Name and Actions */}
              <div className="w-1/3 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 border-r border-indigo-200 dark:border-gray-700 flex flex-col">
                <div className="px-6 py-5 border-b border-indigo-200 dark:border-gray-700 flex-shrink-0 bg-white/50 dark:bg-gray-800/50">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Check className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
                    Save Custom Resume
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Review your AI-customized resume and save it
                  </p>
                </div>

                <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto min-h-0">
                  {/* Original Resume Info */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border-2 border-indigo-200 dark:border-indigo-700 flex-shrink-0">
                    <h3 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-3">Based On</h3>
                    <div className="flex items-start bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 dark:bg-indigo-500 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white break-words">{selectedResume?.originalName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Job Details */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border-2 border-blue-200 dark:border-blue-700 flex-shrink-0">
                    <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-3">Customized For Job</h3>
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 max-h-48 overflow-y-auto">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                        {jobDescription || 'No job description provided'}
                      </p>
                    </div>
                  </div>

                  {/* Resume Name Input */}
                  <div className="flex-shrink-0">
                    <label htmlFor="customName" className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Resume Name <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <div className="bg-white dark:bg-gray-700 rounded-xl shadow-md border-2 border-gray-200 dark:border-gray-600 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-200 dark:focus-within:ring-indigo-800 transition-all">
                      <input
                        type="text"
                        id="customName"
                        value={customResumeName}
                        onChange={(e) => setCustomResumeName(e.target.value)}
                        className="block w-full rounded-xl border-0 p-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0"
                        placeholder="Enter a name for this resume"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Give this customized resume a descriptive name
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 py-5 border-t border-indigo-200 dark:border-gray-700 flex-shrink-0 bg-white/50 dark:bg-gray-800/50">
                  <div className="flex space-x-3">
                    <button
                      onClick={handleBackToCustomize}
                      className="flex-1 inline-flex items-center justify-center px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
                      title="Go back to edit mode to make changes"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Edit
                    </button>
                    <button
                      onClick={(e) => {
                        console.log('Save Resume button clicked');
                        e.preventDefault();
                        handleShowSaveDialog();
                      }}
                      className="save-custom-button flex-1 inline-flex items-center justify-center px-4 py-3 border-2 border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-500 dark:to-blue-500 hover:from-indigo-700 hover:to-blue-700 dark:hover:from-indigo-600 dark:hover:to-blue-600 shadow-lg hover:shadow-xl transition-all"
                      title="Save the customized resume to your dashboard"
                    >
                      <Check className="w-5 h-5 mr-2" />
                      Save Resume
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Panel - Resume Preview */}
              <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
                <div className="max-w-4xl mx-auto p-6">
                  <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-md p-4 mb-6">
                    <div className="flex items-center">
                      <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                      <p className="text-green-800 dark:text-green-300 text-sm font-medium">
                        Resume customized successfully! Review the changes below.
                      </p>
                    </div>
                  </div>

                  {originalResumeData && customizedResumeData ? (
                    <ChangeHighlighter
                      originalData={originalResumeData}
                      modifiedData={customizedResumeData}
                    >
                      <CustomResumeForm
                        initialData={customizedResumeData}
                        onChange={setCustomizedResumeData}
                        originalData={originalResumeData}
                      />
                    </ChangeHighlighter>
                  ) : customizedResumeData ? (
                    <CustomResumeForm
                      initialData={customizedResumeData}
                      onChange={setCustomizedResumeData}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {step === 'select' && !customizedResumeData && (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10">
              {/* Progress Steps */}
              <div className="mb-10">
                <div className="flex items-center">
                  <div className="flex items-center text-indigo-600 dark:text-indigo-400">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-500 dark:to-blue-500 rounded-full text-white text-sm font-semibold shadow-lg">
                      1
                    </div>
                    <div className="ml-4 text-base font-semibold">Select Base Resume</div>
                  </div>
                  <div className="flex-auto border-t-2 border-gray-300 dark:border-gray-600 mx-6"></div>
                  <div className="flex items-center text-gray-400 dark:text-gray-500">
                    <div className="flex items-center justify-center w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 text-sm font-semibold">
                      2
                    </div>
                    <div className="ml-4 text-base font-medium">Customize for Job</div>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-700 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-2" />
                    <p className="text-red-800 dark:text-red-300 text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Resume Selection */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
                <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <FileText className="h-7 w-7 text-indigo-600 dark:text-indigo-400 mr-3" />
                    Select Your Base Resume
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Choose a resume to customize for a specific job opportunity using AI
                  </p>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {resumes.length === 0 ? (
                    <div className="px-8 py-16 text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                        <FileText className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Resumes Available</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        You need to parse a resume first before creating custom versions for specific jobs.
                      </p>
                      <Link
                        href="/parse-resume"
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-500 dark:to-blue-500 hover:from-indigo-700 hover:to-blue-700 dark:hover:from-indigo-600 dark:hover:to-blue-600 shadow-lg hover:shadow-xl transition-all"
                      >
                        <FileText className="h-5 w-5 mr-2" />
                        Parse New Resume
                      </Link>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="resume-selection-list grid gap-4">
                        {resumes.map((resume) => (
                          <div
                            key={resume.id}
                            className="group relative bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-xl p-5 cursor-pointer transition-all hover:shadow-lg"
                            onClick={() => handleSelectResume(resume)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center flex-1">
                                <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/50 dark:to-blue-900/50 rounded-xl flex items-center justify-center group-hover:from-indigo-200 group-hover:to-blue-200 dark:group-hover:from-indigo-800/50 dark:group-hover:to-blue-800/50 transition-colors">
                                  <FileText className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="ml-4 flex-1">
                                  <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {resume.originalName}
                                  </h3>
                                  <div className="flex items-center mt-1 text-sm text-gray-500 dark:text-gray-400 space-x-3">
                                    <span className="flex items-center">
                                      <Calendar className="h-3.5 w-3.5 mr-1" />
                                      {formatDate(resume.uploadDate)}
                                    </span>
                                    <span>•</span>
                                    <span>{formatFileSize(resume.size)}</span>
                                    {resume.isBaseResume && (
                                      <>
                                        <span>•</span>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                                          Base Resume
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="h-6 w-6 text-gray-400 dark:text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'customize' && selectedResume && resumeData && !customizedResumeData && (
            <div className="flex fixed top-16 left-0 right-0 bottom-0">
              {/* Left Panel - Job Description */}
              <div className="w-1/3 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 border-r border-indigo-200 dark:border-gray-700 flex flex-col">
                <div className="px-6 py-5 border-b border-indigo-200 dark:border-gray-700 flex-shrink-0 bg-white/50 dark:bg-gray-800/50">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
                    Customize Resume
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Provide job details to tailor your resume with AI
                  </p>
                </div>

                <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto min-h-0">
                  {/* Selected Resume Info */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border-2 border-indigo-200 dark:border-indigo-700 flex-shrink-0">
                    <h3 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-3">Selected Base Resume</h3>
                    <div className="flex items-center bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 dark:bg-indigo-500 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedResume.originalName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(selectedResume.size)}</p>
                      </div>
                      <Check className="h-5 w-5 text-green-500 dark:text-green-400 ml-2" />
                    </div>
                  </div>

                  {/* Job URL (Optional but Suggested) */}
                  <div className="flex-shrink-0 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <label htmlFor="jobUrl" className="block text-sm font-semibold text-gray-900 dark:text-white">
                        Job Posting URL <span className="text-blue-600 dark:text-blue-400 text-xs">(optional but recommended)</span>
                      </label>
                      <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        id="jobUrl"
                        value={jobUrl}
                        onChange={(e) => {
                          setJobUrl(e.target.value);
                          setUrlError('');
                        }}
                        className="flex-1 border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                        placeholder="https://linkedin.com/jobs/view/..."
                        disabled={isScrapingUrl}
                      />
                      <button
                        onClick={handleScrapeUrl}
                        disabled={isScrapingUrl || !jobUrl.trim()}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isScrapingUrl ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Fetching...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Auto-Fill
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                      Paste a job posting URL to automatically extract company name, job description, and responsibilities
                    </p>
                    {urlError && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {urlError}
                      </p>
                    )}
                  </div>

                  {/* Company Name (Optional) */}
                  <div className="flex-shrink-0">
                    <label htmlFor="companyName" className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Company Name <span className="text-gray-400 dark:text-gray-500 text-xs">(optional)</span>
                    </label>
                    <input
                      type="text"
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                      placeholder="e.g., Google, Microsoft, Amazon"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Used to auto-generate resume name (auto-filled from URL if available)
                    </p>
                  </div>

                  {/* Job Description Form */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <label htmlFor="description" className="block text-sm font-semibold text-gray-900 dark:text-white mb-3 flex-shrink-0">
                      Job Description <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <div className="flex-1 flex flex-col bg-white dark:bg-gray-700 rounded-xl shadow-md border-2 border-gray-200 dark:border-gray-600 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-200 dark:focus-within:ring-indigo-800 transition-all">
                      <textarea
                        id="description"
                        value={jobDescription}
                        onChange={(e) => handleJobDescriptionChange(e.target.value)}
                        className="job-description-textarea flex-1 block w-full rounded-xl border-0 p-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0 min-h-0 resize-none"
                        placeholder="📋 Paste the full job description here...

Include:
• Job title and company
• Required qualifications
• Key responsibilities
• Desired skills and experience
• Any specific requirements"
                        required
                        style={{ minHeight: '300px' }}
                      />
                    </div>
                    <div className="mt-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 flex-shrink-0">
                      <div className="flex items-start">
                        <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-800 dark:text-blue-300">
                          AI will optimize your summary, highlight relevant experience, and tailor skills to match the job requirements.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 py-5 border-t border-indigo-200 dark:border-gray-700 flex-shrink-0 bg-white/50 dark:bg-gray-800/50">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setStep('select')}
                      className="flex-1 inline-flex items-center justify-center px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
                      title="Go back to resume selection"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </button>
                    <button
                      onClick={handleCreateCustomResume}
                      disabled={isCreating || !jobDescription.trim()}
                      className="customize-button flex-1 inline-flex items-center justify-center px-4 py-3 border-2 border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-500 dark:to-blue-500 hover:from-indigo-700 hover:to-blue-700 dark:hover:from-indigo-600 dark:hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
                      title="Generate customized resume using AI based on job description"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Creating with AI...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Create Custom Resume
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Panel - Resume Editor */}
              <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
                <div className="max-w-4xl mx-auto p-6">
                  {/* Error Message */}
                  {error && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md p-4">
                      <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                    </div>
                  )}

                  <EditableResumeForm
                    initialData={resumeData}
                    onSave={handleResumeDataChange}
                    isSaving={false}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      
      {/* Save Custom Resume Dialog */}
      {showSaveDialog && customizedResumeData && (
        <SaveCustomResumeDialog
          isOpen={showSaveDialog}
          onClose={() => {
            console.log('Dialog onClose called');
            setShowSaveDialog(false);
          }}
          onSave={handleSaveCustomResume}
          originalData={originalResumeData || customizedResumeData}
          modifiedData={customizedResumeData}
          initialResumeName={customResumeName}
          basedOnResumeName={selectedResume?.originalName}
          companyName={companyName}
          existingResumes={resumes}
        />
      )}

      {/* Mini Games Modal */}
      <ParsingGames
        isOpen={showGamesModal}
        isProcessing={isCreating}
        onClose={() => setShowGamesModal(false)}
      />

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