'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  FileText, 
  Check,
  ChevronRight,
  Briefcase,
  Building,
  Loader2,
  Sparkles
} from 'lucide-react';
import { isAuthenticatedWithValidation } from '@/lib/auth';
import { resumeApi, Resume } from '@/lib/api';
import { ResumeData } from '@/types/resume';
import EditableResumeForm from '@/components/EditableResumeForm';
import CustomResumeForm from '@/components/CustomResumeForm';
import Layout from '@/components/Layout';
import ChangeHighlighter from '@/components/ChangeHighlighter';
import SaveCustomResumeDialog from '@/components/SaveCustomResumeDialog';

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
  const [isSaving, setIsSaving] = useState(false);
  const [customResumeName, setCustomResumeName] = useState('');
  const [originalResumeData, setOriginalResumeData] = useState<ResumeData | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const router = useRouter();

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

  const handleSelectResume = async (resume: Resume) => {
    try {
      setError('');
      setSelectedResume(resume);
      
      // Fetch the parsed data for the selected resume
      const parsedData = await resumeApi.getParsedData(resume.id);
      setResumeData(parsedData);
      setOriginalResumeData(JSON.parse(JSON.stringify(parsedData))); // Deep clone
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
    setError('');

    try {
      // Use LLM integration to customize resume for the job
      const result = await resumeApi.customizeForJob(selectedResume.id, {
        description: jobDescription
      });
      
      console.log('Custom resume created successfully:', result);
      
      // Set the customized resume data for preview
      setCustomizedResumeData(result.modifiedResumeData);
      setCustomResumeName(result.customResumeName || `${selectedResume.originalName} - Custom`);
      
    } catch (error) {
      console.error('Failed to create custom resume:', error);
      setError('Failed to create custom resume. Please try again.');
    } finally {
      setIsCreating(false);
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
        response: error?.response,
        status: error?.response?.status,
        data: error?.response?.data
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
    <Layout showNav={false}>
      <div className="min-h-screen">
        {/* Header - Fixed Position */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link 
                  href="/dashboard"
                  className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
                >
                  <ArrowLeft className="h-5 w-5 mr-1" />
                  Back to Dashboard
                </Link>
                <FileText className="h-8 w-8 text-indigo-600 mr-3" />
                <h1 className="text-xl font-semibold text-gray-900">Create Custom Resume</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10">
          {/* Preview Mode - Show after LLM customization */}
          {customizedResumeData && (
            <div className="flex fixed top-16 left-0 right-0 bottom-0">
              {/* Left Panel - Resume Name and Actions */}
              <div className="w-1/3 bg-white/90 backdrop-blur-sm border-r border-gray-200 flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                  <h2 className="text-lg font-medium text-gray-900">Save Custom Resume</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Review your customized resume and save with a custom name
                  </p>
                </div>
                
                <div className="flex-1 px-6 py-4 space-y-6 overflow-y-auto min-h-0">
                  {/* Original Resume Info */}
                  <div className="bg-gray-50 rounded-lg p-4 flex-shrink-0">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Based on</h3>
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-indigo-600 mr-2" />
                      <span className="text-sm text-gray-700">{selectedResume?.originalName}</span>
                    </div>
                  </div>

                  {/* Job Details */}
                  <div className="bg-blue-50 rounded-lg p-4 flex-shrink-0">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Customized for Job</h3>
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm text-gray-700">Custom job requirements</span>
                      </div>
                    </div>
                  </div>

                  {/* Resume Name Input */}
                  <div className="flex-shrink-0">
                    <label htmlFor="customName" className="block text-sm font-medium text-gray-700 mb-2">
                      Resume Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="customName"
                      value={customResumeName}
                      onChange={(e) => setCustomResumeName(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Enter a name for this resume"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
                  <div className="flex space-x-3">
                    <button
                      onClick={handleBackToCustomize}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      title="Go back to edit mode to make changes"
                    >
                      Back to Edit
                    </button>
                    <button
                      onClick={(e) => {
                        console.log('Save Resume button clicked');
                        e.preventDefault();
                        handleShowSaveDialog();
                      }}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      title="Save the customized resume to your dashboard"
                    >                      
                      <Check className="w-4 h-4 mr-2" />
                      Save Resume
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Panel - Resume Preview */}
              <div className="flex-1 bg-gray-50 overflow-y-auto">
                <div className="max-w-4xl mx-auto p-6">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                    <div className="flex items-center">
                      <Sparkles className="h-5 w-5 text-green-600 mr-2" />
                      <p className="text-green-800 text-sm font-medium">
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
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Progress Steps */}
              <div className="mb-8">
                <div className="flex items-center">
                  <div className="flex items-center text-indigo-600">
                    <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-full text-white text-sm font-medium">
                      1
                    </div>
                    <div className="ml-4 text-sm font-medium">Select Base Resume</div>
                  </div>
                  <div className="flex-auto border-t-2 border-gray-300 mx-4"></div>
                  <div className="flex items-center text-gray-500">
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-300 rounded-full text-white text-sm font-medium">
                      2
                    </div>
                    <div className="ml-4 text-sm font-medium">Customize for Job</div>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-md p-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Resume Selection */}
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Select a Base Resume</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose a resume to customize for a specific job opportunity
                  </p>
                </div>
                <div className="divide-y divide-gray-200">
                  {resumes.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No resumes available</h3>
                      <p className="text-gray-500 mb-4">Parse a resume first to create custom versions.</p>
                      <Link
                        href="/parse-resume"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Parse Resume
                      </Link>
                    </div>
                  ) : (
                    resumes.map((resume) => (
                      <div key={resume.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer" onClick={() => handleSelectResume(resume)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FileText className="h-8 w-8 text-indigo-600 mr-3" />
                            <div>
                              <h3 className="text-sm font-medium text-gray-900">
                                {resume.originalName}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {formatDate(resume.uploadDate)} • {formatFileSize(resume.size)}
                                {resume.isBaseResume && ' • Base Resume'}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'customize' && selectedResume && resumeData && !customizedResumeData && (
            <div className="flex fixed top-16 left-0 right-0 bottom-0">
              {/* Left Panel - Job Description */}
              <div className="w-1/3 bg-white/90 backdrop-blur-sm border-r border-gray-200 flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                  <h2 className="text-lg font-medium text-gray-900">Job Description</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Provide job details to customize your resume
                  </p>
                </div>
                
                <div className="flex-1 px-6 py-4 space-y-6 overflow-y-auto min-h-0">
                  {/* Selected Resume Info */}
                  <div className="bg-gray-50 rounded-lg p-4 flex-shrink-0">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Selected Resume</h3>
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-indigo-600 mr-2" />
                      <span className="text-sm text-gray-700">{selectedResume.originalName}</span>
                    </div>
                  </div>

                  {/* Job Description Form */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2 flex-shrink-0">
                      Job Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="description"
                      value={jobDescription}
                      onChange={(e) => handleJobDescriptionChange(e.target.value)}
                      className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 min-h-0"
                      placeholder="Paste the full job description here including requirements, responsibilities, and preferred skills..."
                      required
                      style={{ minHeight: '300px' }}
                    />
                    <p className="text-xs text-gray-500 mt-2 flex-shrink-0">
                      The AI will analyze this description and optimize your summary, work experience points, and skills accordingly.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setStep('select')}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      title="Go back to resume selection"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCreateCustomResume}
                      disabled={isCreating || !jobDescription.trim()}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Generate customized resume using AI based on job description"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Create Resume
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Panel - Resume Editor */}
              <div className="flex-1 bg-gray-50 overflow-y-auto">
                <div className="max-w-4xl mx-auto p-6">
                  {/* Error Message */}
                  {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                      <p className="text-red-700 text-sm">{error}</p>
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
        />
      )}
    </Layout>
  );
}