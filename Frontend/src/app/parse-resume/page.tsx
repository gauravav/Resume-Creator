'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Code,
  Upload,
  X,
  FileText
} from 'lucide-react';
import { resumeApi } from '@/lib/api';
import { ResumeData } from '@/types/resume';
import Layout from '@/components/Layout';
import EditableResumeForm from '@/components/EditableResumeForm';
import ParsingGames from '@/components/ParsingGames';
import TutorialOverlay from '@/components/TutorialOverlay';
import { useTutorial } from '@/context/TutorialContext';
import { parseResumeTutorialSteps } from '@/config/tutorialSteps';
import { HelpCircle } from 'lucide-react';

export default function ParseOnlyResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [resumeName, setResumeName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedData, setParsedData] = useState<ResumeData | null>(null);
  const [structureMetadata, setStructureMetadata] = useState<any>(null);
  const [showParseOption, setShowParseOption] = useState(false);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const router = useRouter();

  // Tutorial hook
  const { setTutorialSteps, startTutorialDirectly, isTutorialActive } = useTutorial();

  // Initialize tutorial steps
  useEffect(() => {
    setTutorialSteps(parseResumeTutorialSteps);
  }, [setTutorialSteps]);

  const validateFile = useCallback((file: File): string | null => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptedTypes = ['.pdf', '.doc', '.docx'];
    
    if (!acceptedTypes.includes(fileExtension)) {
      return 'Please select a PDF or Word document (.pdf, .doc, .docx)';
    }
    
    if (file.size > 5 * 1024 * 1024) {
      return 'File size must be less than 5MB';
    }
    
    return null;
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(file);
    setResumeName(file.name.replace(/\.(pdf|doc|docx)$/i, ''));
    setError('');
    setParsedData(null);
    setShowParseOption(true);
  }, [validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleParse = async () => {
    if (!file) return;

    setIsParsing(true);
    setError('');

    try {
      // Parse to JSON format (default)
      const result = await resumeApi.parse(file, 'json');
      setParsedData(result.parsedResume);
      setStructureMetadata(result.structureMetadata);
      console.log('Structure metadata received:', result.structureMetadata);
    } catch (error) {
      console.error('Parse error:', error);
      setError('Failed to parse resume. Please try again.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async (updatedData: ResumeData) => {
    if (!resumeName.trim()) {
      setError('Please enter a resume name');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await resumeApi.saveParsed(updatedData, resumeName.trim(), structureMetadata);
      router.push('/dashboard');
    } catch (error) {
      console.error('Save error:', error);
      setError('Failed to save resume. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setResumeName('');
    setParsedData(null);
    setError('');
    setShowParseOption(false);
  };


  return (
    <Layout>
      <div className="min-h-screen">
        <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50/90 dark:bg-red-900/30 backdrop-blur-sm border border-red-200 dark:border-red-700 rounded-md p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-400 mr-2" />
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Create New Resume</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Upload PDF, Word, or LaTeX file - AI will parse it into structured JSON format
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* File Upload Section */}
              {!file && (
                <div
                  className={`file-upload-area relative border-2 border-dashed rounded-xl p-8 transition-colors ${
                    isDragOver
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-400'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isParsing}
                  />

                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        Drop your resume here, or click to select
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Supports PDF, DOC, DOCX files up to 5MB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected File & Name Input */}
              {file && !parsedData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-green-500 dark:text-green-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={clearFile}
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Remove selected file and start over"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="resume-name-input">
                    <label htmlFor="resumeName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Resume Name <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="resumeName"
                      value={resumeName}
                      onChange={(e) => setResumeName(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2"
                      placeholder="Enter resume name"
                      required
                    />
                  </div>

                  {showParseOption && (
                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-4">
                      <div className="flex items-center mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                        <h3 className="text-sm font-medium text-green-800 dark:text-green-300">File uploaded successfully!</h3>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-400 mb-3">
                        Click below to parse your resume into structured JSON format using AI.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleParse}
                    disabled={isParsing || !resumeName.trim() || !showParseOption}
                    className="parse-button w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Extract structured data from uploaded resume file using AI"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Parsing Resume...
                      </>
                    ) : (
                      <>
                        <Code className="w-5 h-5 mr-2" />
                        Parse Resume
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Editable Resume Form */}
              {parsedData && (
                <div className="space-y-6">
                  <div className="text-center py-6">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 dark:text-green-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Resume Parsed Successfully!</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Review and edit your resume details below before saving.
                    </p>
                  </div>

                  {/* Resume Name (editable) */}
                  <div>
                    <label htmlFor="editResumeName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Resume Name <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="editResumeName"
                      value={resumeName}
                      onChange={(e) => setResumeName(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2"
                      placeholder="Enter resume name"
                      required
                    />
                  </div>

                  {/* Editable Resume Form */}
                  <div className="editable-resume-form border-t border-gray-200 dark:border-gray-700 pt-6">
                    <EditableResumeForm
                      initialData={parsedData}
                      onSave={handleSave}
                      isSaving={isSaving}
                    />
                  </div>

                  {/* Start Over Button */}
                  <div className="flex justify-center pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={clearFile}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                      title="Clear and upload new file"
                    >
                      Start Over
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Mini Games Modal */}
      <ParsingGames isOpen={isParsing} />

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