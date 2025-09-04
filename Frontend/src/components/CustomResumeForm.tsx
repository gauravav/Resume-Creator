'use client';

import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Globe, 
  Linkedin, 
  Github,
  GraduationCap,
  Briefcase,
  Code,
  FolderOpen,
  Plus,
  Trash2,
  Wand2,
  ChevronDown
} from 'lucide-react';
import { ResumeData } from '@/types/resume';
import ResponsibilityRewriteDialog from './ResponsibilityRewriteDialog';

// Magic glow wrapper for individual fields that have changed
const MagicalField = ({ isChanged, children, intensity = 'normal' }: { 
  isChanged: boolean; 
  children: React.ReactNode;
  intensity?: 'subtle' | 'normal' | 'strong';
}) => {
  // Debug logging
  if (isChanged) {
    console.log('MagicalField - Field should be glowing with intensity:', intensity);
  }

  if (!isChanged) {
    return <>{children}</>;
  }
  
  const intensityClasses = {
    subtle: {
      glow: "absolute -inset-1 bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400 rounded-lg blur opacity-30 animate-pulse",
      border: "border-purple-300",
      ring: "ring-2 ring-purple-300 ring-opacity-50",
    },
    normal: {
      glow: "absolute -inset-1.5 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 rounded-lg blur opacity-40 animate-pulse",
      border: "border-purple-400",
      ring: "ring-2 ring-purple-400 ring-opacity-60",
    },
    strong: {
      glow: "absolute -inset-2 bg-gradient-to-r from-purple-600 via-blue-500 to-indigo-600 rounded-lg blur opacity-50 animate-pulse",
      border: "border-purple-500",
      ring: "ring-3 ring-purple-500 ring-opacity-70",
    }
  };
  
  const classes = intensityClasses[intensity];
  
  return (
    <div className="relative group">
      {/* Magical glow effect */}
      <div className={`${classes.glow} group-hover:opacity-100 transition duration-500`}></div>
      
      {/* Content with enhanced styling */}
      <div className="relative">
        <div className="absolute -right-2 -top-2 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center animate-pulse shadow-sm">
            <div className="text-white text-[10px]">✨</div>
          </div>
        </div>
        
        {/* Apply magical styling to input/textarea elements */}
        <div className="magical-field">
          {React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            className: `${(children as React.ReactElement<{className?: string}>).props.className || ''} ${
              intensity === 'strong' 
                ? 'border-purple-500 ring-2 ring-purple-500 ring-opacity-40 focus:ring-purple-500 shadow-lg shadow-purple-200' 
                : intensity === 'normal' 
                  ? 'border-purple-400 ring-2 ring-purple-400 ring-opacity-30 focus:ring-purple-400 shadow-md shadow-purple-100'
                  : 'border-purple-300 ring-1 ring-purple-300 ring-opacity-20 focus:ring-purple-300 shadow-sm shadow-purple-50'
            }`,
            style: {
              ...((children as React.ReactElement<{style?: React.CSSProperties}>).props.style || {}),
              boxShadow: intensity === 'strong' 
                ? '0 0 20px rgba(139, 92, 246, 0.3), inset 0 1px 3px rgba(139, 92, 246, 0.1)'
                : intensity === 'normal'
                  ? '0 0 15px rgba(167, 139, 250, 0.2), inset 0 1px 2px rgba(167, 139, 250, 0.1)' 
                  : '0 0 10px rgba(196, 181, 253, 0.15), inset 0 1px 1px rgba(196, 181, 253, 0.1)',
            }
          })}
        </div>
      </div>
    </div>
  );
};

// Regular section wrapper (no individual field highlighting)
const MagicalSection = ({ isChanged, children }: { isChanged: boolean; children: React.ReactNode }) => {
  // For sections, we only show a subtle indicator, not full glow since individual fields will glow
  if (!isChanged) {
    return <div>{children}</div>;
  }
  
  return (
    <div className="relative">
      {/* Subtle section indicator */}
      <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 via-blue-400 to-indigo-400 rounded-full opacity-60"></div>
      <div className="pl-2">
        {children}
      </div>
    </div>
  );
};

interface CustomResumeFormProps {
  initialData: ResumeData;
  onChange: (data: ResumeData) => void;
  summaryChanged?: boolean;
  personalInfoChanged?: boolean;
  educationChanged?: boolean;
  experienceChanged?: boolean;
  projectsChanged?: boolean;
  technologiesChanged?: boolean;
  detailedChanges?: Record<string, unknown>; // Detailed change information for individual fields
}

export default function CustomResumeForm({ 
  initialData, 
  onChange,
  summaryChanged = false,
  personalInfoChanged = false,
  educationChanged = false,
  experienceChanged = false,
  projectsChanged = false,
  technologiesChanged = false,
  detailedChanges = null
}: CustomResumeFormProps) {
  const [data, setData] = useState<ResumeData>(initialData);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['personalInfo', 'summary'])
  );

  // Debug logging
  console.log('CustomResumeForm - Props received:', {
    summaryChanged,
    personalInfoChanged,
    experienceChanged,
    detailedChanges: detailedChanges ? 'Present' : 'Missing',
    detailedChangesKeys: detailedChanges ? Object.keys(detailedChanges) : 'N/A'
  });
  const [rewriteDialog, setRewriteDialog] = useState<{
    isOpen: boolean;
    originalText: string;
    experienceIndex: number;
    responsibilityIndex: number;
    isProject: boolean;
    isSummary: boolean;
  }>({
    isOpen: false,
    originalText: '',
    experienceIndex: -1,
    responsibilityIndex: -1,
    isProject: false,
    isSummary: false
  });

  // Update parent component whenever data changes
  const updateData = (newData: ResumeData) => {
    setData(newData);
    onChange(newData);
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const updatePersonalInfo = (field: string, value: string) => {
    const newData = {
      ...data,
      personalInfo: {
        ...data.personalInfo,
        [field]: value
      }
    };
    updateData(newData);
  };

  const updatePersonalLocation = (field: string, value: string | boolean) => {
    const newData = {
      ...data,
      personalInfo: {
        ...data.personalInfo,
        location: {
          ...data.personalInfo.location,
          [field]: value
        }
      }
    };
    updateData(newData);
  };

  const updateSocialMedia = (field: string, value: string) => {
    const newData = {
      ...data,
      personalInfo: {
        ...data.personalInfo,
        socialMedia: {
          ...data.personalInfo.socialMedia,
          [field]: value
        }
      }
    };
    updateData(newData);
  };

  const addEducation = () => {
    const newData = {
      ...data,
      education: [...data.education, {
        institution: '',
        degree: '',
        major: '',
        duration: {
          start: { month: '', year: null, day: null },
          end: { month: '', year: null, day: null }
        },
        coursework: []
      }]
    };
    updateData(newData);
  };

  const updateEducation = (index: number, field: string, value: string | string[]) => {
    const newData = {
      ...data,
      education: data.education.map((edu, i) => 
        i === index ? { ...edu, [field]: value } : edu
      )
    };
    updateData(newData);
  };

  const updateEducationDuration = (index: number, period: 'start' | 'end', field: string, value: string | number) => {
    const newData = {
      ...data,
      education: data.education.map((edu, i) => 
        i === index ? {
          ...edu,
          duration: {
            ...edu.duration,
            [period]: {
              ...edu.duration[period],
              [field]: value
            }
          }
        } : edu
      )
    };
    updateData(newData);
  };

  const removeEducation = (index: number) => {
    const newData = {
      ...data,
      education: data.education.filter((_, i) => i !== index)
    };
    updateData(newData);
  };

  const addExperience = () => {
    const newData = {
      ...data,
      experience: [...data.experience, {
        position: '',
        company: '',
        location: { city: '', state: '', country: '', remote: false },
        duration: {
          start: { month: '', year: null, day: null },
          end: { month: '', year: null, day: null }
        },
        responsibilities: []
      }]
    };
    updateData(newData);
  };

  const updateExperience = (index: number, field: string, value: string | string[]) => {
    const newData = {
      ...data,
      experience: data.experience.map((exp, i) => 
        i === index ? { ...exp, [field]: value } : exp
      )
    };
    updateData(newData);
  };

  const updateExperienceLocation = (index: number, field: string, value: string | boolean) => {
    const newData = {
      ...data,
      experience: data.experience.map((exp, i) => 
        i === index ? {
          ...exp,
          location: { ...exp.location, [field]: value }
        } : exp
      )
    };
    updateData(newData);
  };

  const updateExperienceDuration = (index: number, period: 'start' | 'end', field: string, value: string | number) => {
    const newData = {
      ...data,
      experience: data.experience.map((exp, i) => 
        i === index ? {
          ...exp,
          duration: {
            ...exp.duration,
            [period]: {
              ...exp.duration[period],
              [field]: value
            }
          }
        } : exp
      )
    };
    updateData(newData);
  };

  const removeExperience = (index: number) => {
    const newData = {
      ...data,
      experience: data.experience.filter((_, i) => i !== index)
    };
    updateData(newData);
  };

  const addProject = () => {
    const newData = {
      ...data,
      projects: [...data.projects, {
        name: '',
        description: [],
        toolsUsed: []
      }]
    };
    updateData(newData);
  };

  const updateProject = (index: number, field: string, value: string | string[]) => {
    const newData = {
      ...data,
      projects: data.projects.map((proj, i) => 
        i === index ? { ...proj, [field]: value } : proj
      )
    };
    updateData(newData);
  };

  const removeProject = (index: number) => {
    const newData = {
      ...data,
      projects: data.projects.filter((_, i) => i !== index)
    };
    updateData(newData);
  };

  const updateTechnologyArray = (category: string, value: string[]) => {
    const newData = {
      ...data,
      technologies: {
        ...data.technologies,
        [category]: value
      }
    };
    updateData(newData);
  };

  const updateDatabaseArray = (type: 'sql' | 'nosql', value: string[]) => {
    const newData = {
      ...data,
      technologies: {
        ...data.technologies,
        databases: {
          ...data.technologies.databases,
          [type]: value
        }
      }
    };
    updateData(newData);
  };

  const handleArrayInput = (value: string): string[] => {
    return value.split(',').map(item => item.trim()).filter(item => item !== '');
  };

  const arrayToString = (arr: string[]): string => {
    return arr.join(', ');
  };

  const openRewriteDialog = (text: string, expIndex: number, respIndex: number, isProject: boolean = false, isSummary: boolean = false) => {
    setRewriteDialog({
      isOpen: true,
      originalText: text,
      experienceIndex: expIndex,
      responsibilityIndex: respIndex,
      isProject,
      isSummary
    });
  };

  const closeRewriteDialog = () => {
    setRewriteDialog({
      isOpen: false,
      originalText: '',
      experienceIndex: -1,
      responsibilityIndex: -1,
      isProject: false,
      isSummary: false
    });
  };

  const handleReplaceResponsibility = (newText: string) => {
    const { experienceIndex, responsibilityIndex, isProject, isSummary } = rewriteDialog;
    
    if (isSummary) {
      const newData = { ...data, summary: newText };
      updateData(newData);
    } else if (isProject) {
      const newData = {
        ...data,
        projects: data.projects.map((proj, projIndex) => 
          projIndex === experienceIndex ? {
            ...proj,
            description: proj.description.map((desc, descIndex) => 
              descIndex === responsibilityIndex ? newText : desc
            )
          } : proj
        )
      };
      updateData(newData);
    } else {
      const newData = {
        ...data,
        experience: data.experience.map((exp, expIndex) => 
          expIndex === experienceIndex ? {
            ...exp,
            responsibilities: exp.responsibilities.map((resp, respIndex) => 
              respIndex === responsibilityIndex ? newText : resp
            )
          } : exp
        )
      };
      updateData(newData);
    }
    
    closeRewriteDialog();
  };

  const addResponsibility = (experienceIndex: number) => {
    const newData = {
      ...data,
      experience: data.experience.map((exp, index) => 
        index === experienceIndex ? {
          ...exp,
          responsibilities: [...exp.responsibilities, '']
        } : exp
      )
    };
    updateData(newData);
  };

  const updateResponsibility = (experienceIndex: number, responsibilityIndex: number, value: string) => {
    const newData = {
      ...data,
      experience: data.experience.map((exp, expIndex) => 
        expIndex === experienceIndex ? {
          ...exp,
          responsibilities: exp.responsibilities.map((resp, respIndex) => 
            respIndex === responsibilityIndex ? value : resp
          )
        } : exp
      )
    };
    updateData(newData);
  };

  const removeResponsibility = (experienceIndex: number, responsibilityIndex: number) => {
    const newData = {
      ...data,
      experience: data.experience.map((exp, expIndex) => 
        expIndex === experienceIndex ? {
          ...exp,
          responsibilities: exp.responsibilities.filter((_, respIndex) => respIndex !== responsibilityIndex)
        } : exp
      )
    };
    updateData(newData);
  };

  const addProjectDescription = (projectIndex: number) => {
    const newData = {
      ...data,
      projects: data.projects.map((proj, index) => 
        index === projectIndex ? {
          ...proj,
          description: [...proj.description, '']
        } : proj
      )
    };
    updateData(newData);
  };

  const updateProjectDescription = (projectIndex: number, descriptionIndex: number, value: string) => {
    const newData = {
      ...data,
      projects: data.projects.map((proj, projIndex) => 
        projIndex === projectIndex ? {
          ...proj,
          description: proj.description.map((desc, descIndex) => 
            descIndex === descriptionIndex ? value : desc
          )
        } : proj
      )
    };
    updateData(newData);
  };

  const removeProjectDescription = (projectIndex: number, descriptionIndex: number) => {
    const newData = {
      ...data,
      projects: data.projects.map((proj, projIndex) => 
        projIndex === projectIndex ? {
          ...proj,
          description: proj.description.filter((_, descIndex) => descIndex !== descriptionIndex)
        } : proj
      )
    };
    updateData(newData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header - No Save Button for Custom Resume */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Custom Resume Preview</h1>
        <div className="text-sm text-gray-500 italic">
          Edit and preview your customized resume
        </div>
      </div>

      {/* Personal Information */}
      <MagicalSection isChanged={personalInfoChanged}>
        <div className="bg-white rounded-lg shadow-md">
        <div 
          className="flex items-center justify-between p-4 border-b cursor-pointer"
          onClick={() => toggleSection('personalInfo')}
        >
          <div className="flex items-center">
            <User className="h-5 w-5 text-indigo-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${expandedSections.has('personalInfo') ? 'rotate-180' : ''}`} />
        </div>
        
        {expandedSections.has('personalInfo') && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <MagicalField isChanged={detailedChanges?.personalInfo?.firstName} intensity="subtle">
                  <input
                    type="text"
                    value={data.personalInfo.firstName}
                    onChange={(e) => updatePersonalInfo('firstName', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </MagicalField>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <MagicalField isChanged={detailedChanges?.personalInfo?.lastName} intensity="subtle">
                  <input
                    type="text"
                    value={data.personalInfo.lastName}
                    onChange={(e) => updatePersonalInfo('lastName', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </MagicalField>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={data.personalInfo.email}
                    onChange={(e) => updatePersonalInfo('email', e.target.value)}
                    className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <div className="relative">
                  <Phone className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={data.personalInfo.phone}
                    onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                    className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  value={data.personalInfo.location.city}
                  onChange={(e) => updatePersonalLocation('city', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={data.personalInfo.location.state}
                  onChange={(e) => updatePersonalLocation('state', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Country"
                  value={data.personalInfo.location.country}
                  onChange={(e) => updatePersonalLocation('country', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="mt-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={data.personalInfo.location.remote}
                    onChange={(e) => updatePersonalLocation('remote', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Remote work available</span>
                </label>
              </div>
            </div>

            {/* Website and Social Media */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <div className="relative">
                  <Globe className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    value={data.personalInfo.website}
                    onChange={(e) => updatePersonalInfo('website', e.target.value)}
                    className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                <div className="relative">
                  <Linkedin className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    value={data.personalInfo.socialMedia.linkedin}
                    onChange={(e) => updateSocialMedia('linkedin', e.target.value)}
                    className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GitHub</label>
                <div className="relative">
                  <Github className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    value={data.personalInfo.socialMedia.github}
                    onChange={(e) => updateSocialMedia('github', e.target.value)}
                    className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </MagicalSection>

      {/* Summary */}
      <MagicalSection isChanged={summaryChanged}>
        <div className="bg-white rounded-lg shadow-md">
        <div 
          className="flex items-center justify-between p-4 border-b cursor-pointer"
          onClick={() => toggleSection('summary')}
        >
          <h2 className="text-xl font-semibold text-gray-900">Professional Summary</h2>
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${expandedSections.has('summary') ? 'rotate-180' : ''}`} />
        </div>
        
        {expandedSections.has('summary') && (
          <div className="p-6">
            <div className="flex items-start space-x-2">
              <div className="flex-1">
                <MagicalField isChanged={summaryChanged} intensity="normal">
                  <textarea
                    value={data.summary}
                    onChange={(e) => {
                      const newData = { ...data, summary: e.target.value };
                      updateData(newData);
                    }}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Write a brief professional summary..."
                  />
                </MagicalField>
              </div>
              <div className="flex flex-col space-y-1 pt-1">
                <button
                  onClick={() => openRewriteDialog(data.summary, -1, -1, false, true)}
                  className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                  title="Rewrite professional summary using AI to make it more impactful and tailored"
                  disabled={!data.summary.trim()}
                >
                  <Wand2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </MagicalSection>

      {/* Education */}
      <MagicalSection isChanged={educationChanged}>
        <div className="bg-white rounded-lg shadow-md">
        <div 
          className="flex items-center justify-between p-4 border-b cursor-pointer"
          onClick={() => toggleSection('education')}
        >
          <div className="flex items-center">
            <GraduationCap className="h-5 w-5 text-indigo-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Education</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                addEducation();
                setExpandedSections(prev => new Set([...prev, 'education']));
              }}
              className="p-1 text-indigo-600 hover:text-indigo-800"
              title="Add new education entry"
            >
              <Plus className="h-5 w-5" />
            </button>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${expandedSections.has('education') ? 'rotate-180' : ''}`} />
          </div>
        </div>
        
        {expandedSections.has('education') && (
          <div className="p-6 space-y-6">
            {data.education.map((edu, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Education {index + 1}</h3>
                  <button
                    onClick={() => removeEducation(index)}
                    className="p-1 text-red-600 hover:text-red-800"
                    title="Delete this education entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Major</label>
                  <input
                    type="text"
                    value={edu.major}
                    onChange={(e) => updateEducation(index, 'major', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-4 mb-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Month"
                          value={edu.duration.start.month}
                          onChange={(e) => updateEducationDuration(index, 'start', 'month', e.target.value)}
                          className="w-20 sm:w-24 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Year"
                          value={edu.duration.start.year || ''}
                          onChange={(e) => updateEducationDuration(index, 'start', 'year', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-20 sm:w-24 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Month"
                          value={edu.duration.end.month}
                          onChange={(e) => updateEducationDuration(index, 'end', 'month', e.target.value)}
                          className="w-20 sm:w-24 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Year"
                          value={edu.duration.end.year || ''}
                          onChange={(e) => updateEducationDuration(index, 'end', 'year', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-20 sm:w-24 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Leave empty if ongoing</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relevant Coursework (comma-separated)</label>
                  <input
                    type="text"
                    value={arrayToString(edu.coursework)}
                    onChange={(e) => updateEducation(index, 'coursework', handleArrayInput(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Data Structures, Algorithms, Database Systems"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </MagicalSection>

      {/* Experience */}
      <MagicalSection isChanged={experienceChanged}>
        <div className="bg-white rounded-lg shadow-md">
        <div 
          className="flex items-center justify-between p-4 border-b cursor-pointer"
          onClick={() => toggleSection('experience')}
        >
          <div className="flex items-center">
            <Briefcase className="h-5 w-5 text-indigo-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Work Experience</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                addExperience();
                setExpandedSections(prev => new Set([...prev, 'experience']));
              }}
              className="p-1 text-indigo-600 hover:text-indigo-800"
              title="Add new work experience entry"
            >
              <Plus className="h-5 w-5" />
            </button>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${expandedSections.has('experience') ? 'rotate-180' : ''}`} />
          </div>
        </div>
        
        {expandedSections.has('experience') && (
          <div className="p-6 space-y-6">
            {data.experience.map((exp, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Experience {index + 1}</h3>
                  <button
                    onClick={() => removeExperience(index)}
                    className="p-1 text-red-600 hover:text-red-800"
                    title="Delete this work experience entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                    <input
                      type="text"
                      value={exp.position}
                      onChange={(e) => updateExperience(index, 'position', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => updateExperience(index, 'company', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exp.location.remote}
                        onChange={(e) => {
                          const isRemote = e.target.checked;
                          // Update remote status
                          updateExperienceLocation(index, 'remote', isRemote);
                          // If remote is checked, clear location data
                          if (isRemote) {
                            updateExperienceLocation(index, 'city', '');
                            updateExperienceLocation(index, 'state', '');
                            updateExperienceLocation(index, 'country', '');
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Remote position</span>
                    </label>
                  </div>
                  {!exp.location.remote && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        type="text"
                        placeholder="City"
                        value={exp.location.city}
                        onChange={(e) => updateExperienceLocation(index, 'city', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="State"
                        value={exp.location.state}
                        onChange={(e) => updateExperienceLocation(index, 'state', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="Country"
                        value={exp.location.country}
                        onChange={(e) => updateExperienceLocation(index, 'country', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                  {exp.location.remote && (
                    <div className="text-sm text-gray-500 italic">
                      Location fields are hidden for remote positions
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div className="space-y-4 mb-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Month"
                          value={exp.duration.start.month}
                          onChange={(e) => updateExperienceDuration(index, 'start', 'month', e.target.value)}
                          className="w-20 sm:w-24 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Year"
                          value={exp.duration.start.year || ''}
                          onChange={(e) => updateExperienceDuration(index, 'start', 'year', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-20 sm:w-24 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Month"
                          value={exp.duration.end.month}
                          onChange={(e) => updateExperienceDuration(index, 'end', 'month', e.target.value)}
                          className="w-20 sm:w-24 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Year"
                          value={exp.duration.end.year || ''}
                          onChange={(e) => updateExperienceDuration(index, 'end', 'year', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-20 sm:w-24 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Leave empty if current position</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Responsibilities</label>
                    <button
                      onClick={() => addResponsibility(index)}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100"
                      title="Add new responsibility for this role"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {exp.responsibilities.map((responsibility, respIndex) => (
                      <div key={respIndex} className="flex items-start space-x-2">
                        <div className="flex-1">
                          <MagicalField 
                            isChanged={detailedChanges?.experience?.[index]?.responsibilities?.[respIndex]} 
                            intensity="strong"
                          >
                            <textarea
                              value={responsibility}
                              onChange={(e) => updateResponsibility(index, respIndex, e.target.value)}
                              rows={2}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                              placeholder="Enter responsibility..."
                            />
                          </MagicalField>
                        </div>
                        <div className="flex flex-col space-y-1 pt-1">
                          <button
                            onClick={() => openRewriteDialog(responsibility, index, respIndex)}
                            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                            title="Rewrite this responsibility using AI to improve clarity and impact"
                            disabled={!responsibility.trim()}
                          >
                            <Wand2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeResponsibility(index, respIndex)}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            title="Remove this responsibility"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {exp.responsibilities.length === 0 && (
                      <div className="text-gray-500 text-sm italic py-2">
                        No responsibilities added yet. Click &quot;Add&quot; to add your first responsibility.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </MagicalSection>

      {/* Projects */}
      <MagicalSection isChanged={projectsChanged}>
        <div className="bg-white rounded-lg shadow-md">
        <div 
          className="flex items-center justify-between p-4 border-b cursor-pointer"
          onClick={() => toggleSection('projects')}
        >
          <div className="flex items-center">
            <FolderOpen className="h-5 w-5 text-indigo-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                addProject();
                setExpandedSections(prev => new Set([...prev, 'projects']));
              }}
              className="p-1 text-indigo-600 hover:text-indigo-800"
              title="Add new project entry"
            >
              <Plus className="h-5 w-5" />
            </button>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${expandedSections.has('projects') ? 'rotate-180' : ''}`} />
          </div>
        </div>
        
        {expandedSections.has('projects') && (
          <div className="p-6 space-y-6">
            {data.projects.map((project, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Project {index + 1}</h3>
                  <button
                    onClick={() => removeProject(index)}
                    className="p-1 text-red-600 hover:text-red-800"
                    title="Delete this project entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                    <input
                      type="text"
                      value={project.name}
                      onChange={(e) => updateProject(index, 'name', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <button
                        onClick={() => addProjectDescription(index)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100"
                        title="Add new description point for this project"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {project.description.map((description, descIndex) => (
                        <div key={descIndex} className="flex items-start space-x-2">
                          <div className="flex-1">
                            <MagicalField 
                              isChanged={detailedChanges?.projects?.[index]?.descriptions?.[descIndex]} 
                              intensity="strong"
                            >
                              <textarea
                                value={description}
                                onChange={(e) => updateProjectDescription(index, descIndex, e.target.value)}
                                rows={2}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                placeholder="Enter description point..."
                              />
                            </MagicalField>
                          </div>
                          <div className="flex flex-col space-y-1 pt-1">
                            <button
                              onClick={() => openRewriteDialog(description, index, descIndex, true)}
                              className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                              title="Rewrite this project description using AI to improve clarity and impact"
                              disabled={!description.trim()}
                            >
                              <Wand2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeProjectDescription(index, descIndex)}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                              title="Remove this project description"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {project.description.length === 0 && (
                        <div className="text-gray-500 text-sm italic py-2">
                          No description points added yet. Click &quot;Add&quot; to add your first point.
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tools Used (comma-separated)</label>
                    <input
                      type="text"
                      value={arrayToString(project.toolsUsed)}
                      onChange={(e) => updateProject(index, 'toolsUsed', handleArrayInput(e.target.value))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="React, Node.js, MongoDB, Docker"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </MagicalSection>

      {/* Technologies */}
      <MagicalSection isChanged={technologiesChanged}>
        <div className="bg-white rounded-lg shadow-md">
        <div 
          className="flex items-center justify-between p-4 border-b cursor-pointer"
          onClick={() => toggleSection('technologies')}
        >
          <div className="flex items-center">
            <Code className="h-5 w-5 text-indigo-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Technologies</h2>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${expandedSections.has('technologies') ? 'rotate-180' : ''}`} />
        </div>
        
        {expandedSections.has('technologies') && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Programming Languages</label>
                <MagicalField isChanged={detailedChanges?.technologies?.languages} intensity="subtle">
                  <input
                    type="text"
                    value={arrayToString(data.technologies.languages)}
                    onChange={(e) => updateTechnologyArray('languages', handleArrayInput(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="JavaScript, Python, Java, C++"
                  />
                </MagicalField>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Backend Technologies</label>
                <MagicalField isChanged={detailedChanges?.technologies?.backend} intensity="subtle">
                  <input
                    type="text"
                    value={arrayToString(data.technologies.backend)}
                    onChange={(e) => updateTechnologyArray('backend', handleArrayInput(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Node.js, Express, Django, Spring Boot"
                  />
                </MagicalField>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frontend Technologies</label>
                <input
                  type="text"
                  value={arrayToString(data.technologies.frontend)}
                  onChange={(e) => updateTechnologyArray('frontend', handleArrayInput(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="React, Vue, Angular, HTML, CSS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cloud & DevOps</label>
                <input
                  type="text"
                  value={arrayToString(data.technologies.cloudAndDevOps)}
                  onChange={(e) => updateTechnologyArray('cloudAndDevOps', handleArrayInput(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="AWS, Docker, Kubernetes, Azure"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SQL Databases</label>
                <input
                  type="text"
                  value={arrayToString(data.technologies.databases.sql)}
                  onChange={(e) => updateDatabaseArray('sql', handleArrayInput(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="PostgreSQL, MySQL, SQL Server"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NoSQL Databases</label>
                <input
                  type="text"
                  value={arrayToString(data.technologies.databases.nosql)}
                  onChange={(e) => updateDatabaseArray('nosql', handleArrayInput(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="MongoDB, Redis, Cassandra"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CI/CD & Automation</label>
                <input
                  type="text"
                  value={arrayToString(data.technologies.cicdAndAutomation)}
                  onChange={(e) => updateTechnologyArray('cicdAndAutomation', handleArrayInput(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="GitHub Actions, Jenkins, GitLab CI"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Testing & Debugging</label>
                <input
                  type="text"
                  value={arrayToString(data.technologies.testingAndDebugging)}
                  onChange={(e) => updateTechnologyArray('testingAndDebugging', handleArrayInput(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Jest, Cypress, Selenium, Mocha"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      </MagicalSection>

      {/* Responsibility Rewrite Dialog */}
      <ResponsibilityRewriteDialog
        isOpen={rewriteDialog.isOpen}
        onClose={closeRewriteDialog}
        originalText={rewriteDialog.originalText}
        onReplace={handleReplaceResponsibility}
      />
    </div>
  );
}