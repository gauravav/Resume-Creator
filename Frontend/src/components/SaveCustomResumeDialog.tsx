'use client';

import { useState } from 'react';
import { 
  X,
  AlertCircle,
  CheckCircle,
  FileText,
  User,
  Briefcase,
  GraduationCap,
  FolderOpen,
  Code,
  Save,
  Loader2
} from 'lucide-react';
import { ResumeData } from '@/types/resume';

interface SaveCustomResumeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (resumeName: string) => Promise<void>;
  originalData: ResumeData;
  modifiedData: ResumeData;
  initialResumeName: string;
  basedOnResumeName?: string;
}

interface ChangesSummary {
  summary?: {
    hasChanges: boolean;
    changeType: 'modified' | 'added' | 'removed';
    description: string;
  };
  personalInfo?: {
    hasChanges: boolean;
    changeType: 'modified' | 'added' | 'removed';
    description: string;
  };
  education?: {
    hasChanges: boolean;
    changeType: 'modified' | 'added' | 'removed';
    description: string;
  };
  experience?: {
    hasChanges: boolean;
    changeType: 'modified' | 'added' | 'removed';
    description: string;
  };
  projects?: {
    hasChanges: boolean;
    changeType: 'modified' | 'added' | 'removed';
    description: string;
  };
  technologies?: {
    hasChanges: boolean;
    changeType: 'modified' | 'added' | 'removed';
    description: string;
  };
}

export default function SaveCustomResumeDialog({ 
  isOpen, 
  onClose, 
  onSave, 
  originalData, 
  modifiedData, 
  initialResumeName,
  basedOnResumeName
}: SaveCustomResumeDialogProps) {
  const [resumeName, setResumeName] = useState(initialResumeName);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>('');

  const analyzeChanges = (): ChangesSummary => {
    const changes: ChangesSummary = {};

    // Summary changes
    if (originalData.summary !== modifiedData.summary) {
      changes.summary = {
        hasChanges: true,
        changeType: 'modified',
        description: modifiedData.summary ? 'Professional summary optimized for job requirements' : 'Professional summary removed'
      };
    }

    // Experience changes
    const expChanges = [];
    if (originalData.experience.length !== modifiedData.experience.length) {
      expChanges.push(`${Math.abs(originalData.experience.length - modifiedData.experience.length)} experience entries ${originalData.experience.length > modifiedData.experience.length ? 'removed' : 'added'}`);
    }
    
    // Check for responsibility changes
    const respChanges = modifiedData.experience.reduce((acc, exp, index) => {
      const originalExp = originalData.experience[index];
      if (originalExp && originalExp.responsibilities.length !== exp.responsibilities.length) {
        acc += Math.abs(originalExp.responsibilities.length - exp.responsibilities.length);
      } else if (originalExp) {
        // Check if any responsibilities were modified
        const modifiedCount = exp.responsibilities.filter((resp, respIndex) => 
          originalExp.responsibilities[respIndex] !== resp
        ).length;
        acc += modifiedCount;
      }
      return acc;
    }, 0);

    if (expChanges.length > 0 || respChanges > 0) {
      const descriptions = [];
      if (expChanges.length > 0) descriptions.push(...expChanges);
      if (respChanges > 0) descriptions.push(`${respChanges} responsibility descriptions enhanced`);
      
      changes.experience = {
        hasChanges: true,
        changeType: 'modified',
        description: descriptions.join(', ')
      };
    }

    // Projects changes
    if (originalData.projects.length !== modifiedData.projects.length) {
      changes.projects = {
        hasChanges: true,
        changeType: originalData.projects.length > modifiedData.projects.length ? 'removed' : 'added',
        description: `${Math.abs(originalData.projects.length - modifiedData.projects.length)} project entries ${originalData.projects.length > modifiedData.projects.length ? 'removed' : 'added'}`
      };
    } else {
      // Check for project description changes
      const projectDescChanges = modifiedData.projects.reduce((acc, proj, index) => {
        const originalProj = originalData.projects[index];
        if (originalProj && JSON.stringify(originalProj.description) !== JSON.stringify(proj.description)) {
          acc++;
        }
        return acc;
      }, 0);

      if (projectDescChanges > 0) {
        changes.projects = {
          hasChanges: true,
          changeType: 'modified',
          description: `${projectDescChanges} project descriptions enhanced`
        };
      }
    }

    // Technologies changes
    if (JSON.stringify(originalData.technologies) !== JSON.stringify(modifiedData.technologies)) {
      changes.technologies = {
        hasChanges: true,
        changeType: 'modified',
        description: 'Technology skills reorganized and prioritized'
      };
    }

    return changes;
  };

  const handleSave = async () => {
    if (!resumeName.trim()) {
      setSaveError('Please enter a resume name');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    
    try {
      console.log('Dialog attempting to save with name:', resumeName.trim());
      console.log('Dialog - modifiedData available:', !!modifiedData);
      console.log('Dialog - originalData available:', !!originalData);
      
      await onSave(resumeName.trim());
      console.log('Dialog - onSave completed successfully');
      // onClose will be called from the parent component after successful save
    } catch (error) {
      console.error('Dialog - Save failed:', error);
      console.error('Dialog - Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        response: error?.response?.data,
        status: error?.response?.status
      });
      setSaveError(error instanceof Error ? error.message : 'Failed to save resume. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  console.log('SaveCustomResumeDialog render - isOpen:', isOpen);
  
  if (!isOpen) return null;

  const changes = analyzeChanges();
  const hasAnyChanges = Object.values(changes).some(change => change?.hasChanges);

  const sectionIcons = {
    summary: FileText,
    personalInfo: User,
    education: GraduationCap,
    experience: Briefcase,
    projects: FolderOpen,
    technologies: Code
  };

  const sectionNames = {
    summary: 'Professional Summary',
    personalInfo: 'Personal Information',
    education: 'Education',
    experience: 'Work Experience',
    projects: 'Projects',
    technologies: 'Technologies'
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
          onClick={() => {
            console.log('Backdrop clicked - closing dialog');
            onClose();
          }} 
        />

        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Save Customized Resume</h3>
              <p className="text-sm text-gray-500 mt-1">
                Review the AI-generated changes and save your customized resume
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Base Resume Info */}
          {basedOnResumeName && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Based on</h4>
              <div className="flex items-center">
                <FileText className="h-4 w-4 text-gray-600 mr-2" />
                <span className="text-sm text-gray-700">{basedOnResumeName}</span>
              </div>
            </div>
          )}

          {/* Changes Summary */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Changes Summary</h4>
            
            {hasAnyChanges ? (
              <div className="space-y-3">
                {Object.entries(changes).map(([section, change]) => {
                  if (!change?.hasChanges) return null;
                  
                  const IconComponent = sectionIcons[section as keyof typeof sectionIcons];
                  const sectionName = sectionNames[section as keyof typeof sectionNames];
                  
                  return (
                    <div key={section} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex-shrink-0">
                        <IconComponent className="h-4 w-4 text-yellow-600 mt-0.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-medium text-yellow-800">{sectionName}</h5>
                        <p className="text-sm text-yellow-700 mt-1">{change.description}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <AlertCircle className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <h5 className="text-sm font-medium text-blue-800">No Changes Detected</h5>
                  <p className="text-sm text-blue-700 mt-1">
                    The AI customization didn't make any changes to your original resume.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Resume Name Input */}
          <div className="mb-6">
            <label htmlFor="resumeName" className="block text-sm font-medium text-gray-700 mb-2">
              Resume Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="resumeName"
              value={resumeName}
              onChange={(e) => {
                setResumeName(e.target.value);
                if (saveError) setSaveError(''); // Clear error when user starts typing
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter a name for this customized resume"
              disabled={isSaving}
            />
            {saveError && (
              <p className="mt-2 text-sm text-red-600">{saveError}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !resumeName.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Resume
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}