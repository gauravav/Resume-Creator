'use client';

import { useState } from 'react';
import { 
  User, 
  MapPin, 
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
  Save,
  X,
  Wand2,
  ChevronDown
} from 'lucide-react';
import { ResumeData } from '@/types/resume';
import ResponsibilityRewriteDialog from './ResponsibilityRewriteDialog';

// Magic glow wrapper component
const MagicalSection = ({ isChanged, children }: { isChanged: boolean; children: React.ReactNode }) => {
  if (!isChanged) {
    return <div>{children}</div>;
  }
  
  return (
    <div className="relative group">
      {/* Magical glow effect */}
      <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 via-blue-500 to-indigo-600 rounded-lg blur opacity-30 animate-pulse group-hover:opacity-50 transition duration-1000"></div>
      <div className="relative bg-white rounded-lg shadow-lg border-2 border-transparent bg-clip-padding">
        {/* Gradient border effect */}
        <div className="absolute inset-0 rounded-lg p-[2px] bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500">
          <div className="h-full w-full rounded-md bg-white"></div>
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </div>
      
      {/* Sparkle indicator */}
      <div className="absolute -right-3 -top-3 z-20">
        <div className="relative">
          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center animate-bounce shadow-lg">
            <div className="text-white text-xs">✨</div>
          </div>
          <div className="absolute inset-0 w-6 h-6 bg-purple-400 rounded-full animate-ping opacity-30"></div>
        </div>
      </div>
      
      {/* Floating sparkle particles */}
      <div className="absolute top-4 right-8 w-1 h-1 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
      <div className="absolute bottom-6 right-4 w-1 h-1 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '1s', animationDuration: '3s' }}></div>
      <div className="absolute top-8 right-2 w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '2s', animationDuration: '3s' }}></div>
    </div>
  );
};

interface EditableResumeFormProps {
  initialData: ResumeData;
  onSave: (data: ResumeData) => void;
  isSaving?: boolean;
  summaryChanged?: boolean;
  personalInfoChanged?: boolean;
  educationChanged?: boolean;
  experienceChanged?: boolean;
  projectsChanged?: boolean;
  technologiesChanged?: boolean;
}

export default function EditableResumeForm({ 
  initialData, 
  onSave, 
  isSaving = false,
  summaryChanged = false,
  personalInfoChanged = false,
  educationChanged = false,
  experienceChanged = false,
  projectsChanged = false,
  technologiesChanged = false
}: EditableResumeFormProps) {
  const [data, setData] = useState<ResumeData>(initialData);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['personalInfo', 'summary'])
  );
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

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const updatePersonalInfo = (field: string, value: any) => {
    setData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value
      }
    }));
  };

  const updatePersonalLocation = (field: string, value: any) => {
    setData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        location: {
          ...prev.personalInfo.location,
          [field]: value
        }
      }
    }));
  };

  const updateSocialMedia = (field: string, value: string) => {
    setData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        socialMedia: {
          ...prev.personalInfo.socialMedia,
          [field]: value
        }
      }
    }));
  };

  const addEducation = () => {
    setData(prev => ({
      ...prev,
      education: [...prev.education, {
        institution: '',
        degree: '',
        major: '',
        duration: {
          start: { month: '', year: null, day: null },
          end: { month: '', year: null, day: null }
        },
        coursework: []
      }]
    }));
  };

  const updateEducation = (index: number, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      education: prev.education.map((edu, i) => 
        i === index ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const updateEducationDuration = (index: number, period: 'start' | 'end', field: string, value: any) => {
    setData(prev => ({
      ...prev,
      education: prev.education.map((edu, i) => 
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
    }));
  };

  const removeEducation = (index: number) => {
    setData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const addExperience = () => {
    setData(prev => ({
      ...prev,
      experience: [...prev.experience, {
        position: '',
        company: '',
        location: { city: '', state: '', country: '', remote: false },
        duration: {
          start: { month: '', year: null, day: null },
          end: { month: '', year: null, day: null }
        },
        responsibilities: []
      }]
    }));
  };

  const updateExperience = (index: number, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) => 
        i === index ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const updateExperienceLocation = (index: number, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) => 
        i === index ? {
          ...exp,
          location: { ...exp.location, [field]: value }
        } : exp
      )
    }));
  };

  const updateExperienceDuration = (index: number, period: 'start' | 'end', field: string, value: any) => {
    setData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) => 
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
    }));
  };

  const removeExperience = (index: number) => {
    setData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const addProject = () => {
    setData(prev => ({
      ...prev,
      projects: [...prev.projects, {
        name: '',
        description: [],
        toolsUsed: []
      }]
    }));
  };

  const updateProject = (index: number, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.map((proj, i) => 
        i === index ? { ...proj, [field]: value } : proj
      )
    }));
  };

  const removeProject = (index: number) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }));
  };

  const updateTechnologyArray = (category: string, value: string[]) => {
    setData(prev => ({
      ...prev,
      technologies: {
        ...prev.technologies,
        [category]: value
      }
    }));
  };

  const updateDatabaseArray = (type: 'sql' | 'nosql', value: string[]) => {
    setData(prev => ({
      ...prev,
      technologies: {
        ...prev.technologies,
        databases: {
          ...prev.technologies.databases,
          [type]: value
        }
      }
    }));
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
      setData(prev => ({
        ...prev,
        summary: newText
      }));
    } else if (isProject) {
      setData(prev => ({
        ...prev,
        projects: prev.projects.map((proj, projIndex) => 
          projIndex === experienceIndex ? {
            ...proj,
            description: proj.description.map((desc, descIndex) => 
              descIndex === responsibilityIndex ? newText : desc
            )
          } : proj
        )
      }));
    } else {
      setData(prev => ({
        ...prev,
        experience: prev.experience.map((exp, expIndex) => 
          expIndex === experienceIndex ? {
            ...exp,
            responsibilities: exp.responsibilities.map((resp, respIndex) => 
              respIndex === responsibilityIndex ? newText : resp
            )
          } : exp
        )
      }));
    }
    
    closeRewriteDialog();
  };

  const addResponsibility = (experienceIndex: number) => {
    setData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, index) => 
        index === experienceIndex ? {
          ...exp,
          responsibilities: [...exp.responsibilities, '']
        } : exp
      )
    }));
  };

  const updateResponsibility = (experienceIndex: number, responsibilityIndex: number, value: string) => {
    setData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, expIndex) => 
        expIndex === experienceIndex ? {
          ...exp,
          responsibilities: exp.responsibilities.map((resp, respIndex) => 
            respIndex === responsibilityIndex ? value : resp
          )
        } : exp
      )
    }));
  };

  const removeResponsibility = (experienceIndex: number, responsibilityIndex: number) => {
    setData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, expIndex) => 
        expIndex === experienceIndex ? {
          ...exp,
          responsibilities: exp.responsibilities.filter((_, respIndex) => respIndex !== responsibilityIndex)
        } : exp
      )
    }));
  };

  const addProjectDescription = (projectIndex: number) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.map((proj, index) => 
        index === projectIndex ? {
          ...proj,
          description: [...proj.description, '']
        } : proj
      )
    }));
  };

  const updateProjectDescription = (projectIndex: number, descriptionIndex: number, value: string) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.map((proj, projIndex) => 
        projIndex === projectIndex ? {
          ...proj,
          description: proj.description.map((desc, descIndex) => 
            descIndex === descriptionIndex ? value : desc
          )
        } : proj
      )
    }));
  };

  const removeProjectDescription = (projectIndex: number, descriptionIndex: number) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.map((proj, projIndex) => 
        projIndex === projectIndex ? {
          ...proj,
          description: proj.description.filter((_, descIndex) => descIndex !== descriptionIndex)
        } : proj
      )
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Edit Resume</h1>
        <button
          onClick={() => onSave(data)}
          disabled={isSaving}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          title="Save all changes made to this resume"
        >
          <Save className="h-5 w-5 mr-2" />
          {isSaving ? 'Saving...' : 'Save Resume'}
        </button>
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
                <input
                  type="text"
                  value={data.personalInfo.firstName}
                  onChange={(e) => updatePersonalInfo('firstName', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={data.personalInfo.lastName}
                  onChange={(e) => updatePersonalInfo('lastName', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
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
                <textarea
                  value={data.summary}
                  onChange={(e) => setData(prev => ({ ...prev, summary: e.target.value }))}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Write a brief professional summary..."
                />
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
                          <textarea
                            value={responsibility}
                            onChange={(e) => updateResponsibility(index, respIndex, e.target.value)}
                            rows={2}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            placeholder="Enter responsibility..."
                          />
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
                        No responsibilities added yet. Click "Add" to add your first responsibility.
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
                            <textarea
                              value={description}
                              onChange={(e) => updateProjectDescription(index, descIndex, e.target.value)}
                              rows={2}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                              placeholder="Enter description point..."
                            />
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
                          No description points added yet. Click "Add" to add your first point.
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
                <input
                  type="text"
                  value={arrayToString(data.technologies.languages)}
                  onChange={(e) => updateTechnologyArray('languages', handleArrayInput(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="JavaScript, Python, Java, C++"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Backend Technologies</label>
                <input
                  type="text"
                  value={arrayToString(data.technologies.backend)}
                  onChange={(e) => updateTechnologyArray('backend', handleArrayInput(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Node.js, Express, Django, Spring Boot"
                />
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

      {/* Save Button */}
      <div className="flex justify-center">
        <button
          onClick={() => onSave(data)}
          disabled={isSaving}
          className="inline-flex items-center px-8 py-3 border border-transparent text-lg font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          title="Save all changes made to this resume"
        >
          <Save className="h-6 w-6 mr-3" />
          {isSaving ? 'Saving Resume...' : 'Save Resume'}
        </button>
      </div>

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