'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  FileText, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  User, 
  Briefcase, 
  GraduationCap, 
  Code,
  Upload,
  Save,
  Edit3,
  X
} from 'lucide-react';
import { isAuthenticatedWithValidation } from '@/lib/auth';
import { resumeApi } from '@/lib/api';
import { parseResumeWithLLM, ParsedResume } from '@/lib/llm';
import Layout from '@/components/Layout';
import EditableResumeForm from '@/components/EditableResumeForm';

export default function ParseOnlyResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [resumeName, setResumeName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null);
  const [showParseOption, setShowParseOption] = useState(false);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const router = useRouter();

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
      const result = await parseResumeWithLLM(file);
      setParsedData(result);
    } catch (error) {
      console.error('Parse error:', error);
      setError('Failed to parse resume. Please try again.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!parsedData || !resumeName.trim()) {
      setError('Please enter a resume name');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await resumeApi.saveParsed(parsedData, resumeName.trim());
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
    setIsEditingMode(false);
    setShowParseOption(false);
  };

  const handleEditData = () => {
    setIsEditingMode(true);
  };

  const handleSaveEditedData = (editedData: ParsedResume) => {
    setParsedData(editedData);
    setIsEditingMode(false);
  };

  const handleCancelEdit = () => {
    setIsEditingMode(false);
  };

  return (
    <Layout showNav={false}>
      <div className="min-h-screen">
        {/* Header */}
        <header className="relative z-50 bg-white/90 backdrop-blur-sm shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Link 
                href="/dashboard"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-indigo-600 mr-3" />
                <h1 className="text-xl font-semibold text-gray-900">New Resume</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-md p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Create New Resume</h2>
              <p className="text-sm text-gray-600 mt-1">
                Upload a resume file to extract and save structured data for editing and customization
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* File Upload Section */}
              {!file && (
                <div
                  className={`relative border-2 border-dashed rounded-xl p-8 transition-colors ${
                    isDragOver
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-300 hover:border-gray-400'
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
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        Drop your resume here, or click to select
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Supports PDF, DOC, DOCX files up to 5MB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected File & Name Input */}
              {file && !parsedData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-green-500 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={clearFile}
                      className="text-gray-400 hover:text-gray-600"
                      title="Remove selected file and start over"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div>
                    <label htmlFor="resumeName" className="block text-sm font-medium text-gray-700 mb-2">
                      Resume Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="resumeName"
                      value={resumeName}
                      onChange={(e) => setResumeName(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Enter resume name"
                      required
                    />
                  </div>

                  {showParseOption && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        <h3 className="text-sm font-medium text-green-800">File uploaded successfully!</h3>
                      </div>
                      <p className="text-sm text-green-700 mb-3">
                        Your resume file is ready to be processed. Click below to extract structured data.
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={handleParse}
                    disabled={isParsing || !resumeName.trim() || !showParseOption}
                    className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

              {/* Parsed Data Preview */}
              {parsedData && !isEditingMode && (
                <div className="space-y-6">
                  <div className="text-center py-6">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Resume Created Successfully!</h3>
                    <p className="text-gray-600">
                      Your resume data has been extracted. Review and save the structured information.
                    </p>
                  </div>

                  {/* Resume Name (editable) */}
                  <div>
                    <label htmlFor="editResumeName" className="block text-sm font-medium text-gray-700 mb-2">
                      Resume Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="editResumeName"
                      value={resumeName}
                      onChange={(e) => setResumeName(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Enter resume name"
                      required
                    />
                  </div>

                  {/* Parsed Data Preview */}
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Extracted Information Preview</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Personal Info */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Personal Information
                        </h5>
                        <div className="space-y-1 text-sm">
                          <div><strong>Name:</strong> {parsedData.personalInfo.firstName} {parsedData.personalInfo.lastName}</div>
                          <div><strong>Email:</strong> {parsedData.personalInfo.email}</div>
                          <div><strong>Phone:</strong> {parsedData.personalInfo.phone}</div>
                          <div><strong>Location:</strong> {[parsedData.personalInfo.location.city, parsedData.personalInfo.location.state, parsedData.personalInfo.location.country].filter(Boolean).join(', ')}</div>
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                          <Code className="h-4 w-4 mr-2" />
                          Skills
                        </h5>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-gray-700">Languages:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {parsedData.technologies?.languages?.slice(0, 5).map((skill, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-800">
                                  {skill}
                                </span>
                              ))}
                              {(parsedData.technologies?.languages?.length || 0) > 5 && (
                                <span className="text-xs text-gray-500">+{(parsedData.technologies?.languages?.length || 0) - 5} more</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Experience */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                          <Briefcase className="h-4 w-4 mr-2" />
                          Experience
                        </h5>
                        <div className="space-y-2">
                          {parsedData.experience?.slice(0, 2).map((exp, index) => (
                            <div key={index} className="text-sm">
                              <div className="font-medium">{exp.position}</div>
                              <div className="text-gray-600">{exp.company}</div>
                            </div>
                          ))}
                          {(parsedData.experience?.length || 0) > 2 && (
                            <div className="text-xs text-gray-500">+{(parsedData.experience?.length || 0) - 2} more positions</div>
                          )}
                        </div>
                      </div>

                      {/* Education */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                          <GraduationCap className="h-4 w-4 mr-2" />
                          Education
                        </h5>
                        <div className="space-y-2">
                          {parsedData.education?.slice(0, 2).map((edu, index) => (
                            <div key={index} className="text-sm">
                              <div className="font-medium">{edu.degree} in {edu.major}</div>
                              <div className="text-gray-600">{edu.institution}</div>
                            </div>
                          ))}
                          {(parsedData.education?.length || 0) > 2 && (
                            <div className="text-xs text-gray-500">+{(parsedData.education?.length || 0) - 2} more</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    {parsedData.summary && (
                      <div className="mt-4 bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">Professional Summary</h5>
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {parsedData.summary.length > 200 
                            ? `${parsedData.summary.substring(0, 200)}...` 
                            : parsedData.summary
                          }
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-center space-x-4 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleEditData}
                      className="inline-flex items-center px-6 py-3 border border-indigo-600 text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
                      title="Edit and modify the parsed resume data before saving"
                    >
                      <Edit3 className="w-5 h-5 mr-2" />
                      Modify Data
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !resumeName.trim()}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Save the parsed resume data to your dashboard"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-2" />
                          Save Resume Data
                        </>
                      )}
                    </button>
                    <button
                      onClick={clearFile}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      title="Clear current progress and upload a new file"
                    >
                      Start Over
                    </button>
                  </div>
                </div>
              )}

              {/* Editing Mode */}
              {isEditingMode && parsedData && (
                <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">Edit Resume Data</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Make changes to the parsed resume data before saving
                      </p>
                    </div>
                    <button
                      onClick={handleCancelEdit}
                      className="text-gray-400 hover:text-gray-600"
                      title="Cancel editing and return to preview mode"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="p-6">
                    <EditableResumeForm
                      initialData={parsedData}
                      onSave={handleSaveEditedData}
                      isSaving={false}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}