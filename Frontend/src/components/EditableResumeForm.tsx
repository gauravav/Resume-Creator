'use client';

import { useState } from 'react';
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
  Save,
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
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-transparent bg-clip-padding">
        {/* Gradient border effect */}
        <div className="absolute inset-0 rounded-lg p-[2px] bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500">
          <div className="h-full w-full rounded-md bg-white dark:bg-gray-800"></div>
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

// Helper function to migrate old technology structure to new dynamic structure
const migrateTechnologies = (technologies: any): Array<{ category: string; items: string[] }> => {
  // If already in new format (array), return as is
  if (Array.isArray(technologies)) {
    return technologies;
  }

  // If in old format (object), convert to new format
  if (technologies && typeof technologies === 'object') {
    const categories: Array<{ category: string; items: string[] }> = [];

    // Map old fixed categories to new dynamic format
    const categoryMappings: Array<{ key: string; name: string; path?: string }> = [
      { key: 'languages', name: 'Programming Languages' },
      { key: 'backend', name: 'Backend Technologies' },
      { key: 'frontend', name: 'Frontend Technologies' },
      { key: 'databases.sql', name: 'SQL Databases', path: 'databases.sql' },
      { key: 'databases.nosql', name: 'NoSQL Databases', path: 'databases.nosql' },
      { key: 'cloudAndDevOps', name: 'Cloud & DevOps' },
      { key: 'cicdAndAutomation', name: 'CI/CD & Automation' },
      { key: 'testingAndDebugging', name: 'Testing & Debugging' }
    ];

    categoryMappings.forEach(mapping => {
      let items: string[] = [];

      if (mapping.path) {
        // Handle nested paths like databases.sql
        const parts = mapping.path.split('.');
        let current: any = technologies;
        for (const part of parts) {
          current = current?.[part];
        }
        items = Array.isArray(current) ? current : [];
      } else {
        items = Array.isArray(technologies[mapping.key]) ? technologies[mapping.key] : [];
      }

      if (items.length > 0) {
        categories.push({
          category: mapping.name,
          items: items
        });
      }
    });

    return categories;
  }

  // Default: return empty array
  return [];
};

// Helper function to migrate old summary string to new array format
const migrateSummary = (summary: any): string[] => {
  // If already in new format (array), return as is
  if (Array.isArray(summary)) {
    return summary;
  }

  // If in old format (string), convert to array
  if (typeof summary === 'string' && summary.trim().length > 0) {
    const trimmedSummary = summary.trim();

    // Check if summary contains bullet points (•, -, *, or numbered lists)
    const hasBullets = /^[\s]*[•\-*\d]+[\.\):\s]/m.test(trimmedSummary);

    if (hasBullets) {
      // Split by bullet points and clean up
      const points = trimmedSummary
        .split(/\n+/)
        .map(line => line.replace(/^[\s]*[•\-*\d]+[\.\):\s]+/, '').trim())
        .filter(s => s.length > 0);
      return points;
    }

    // If no bullets, check if there are multiple paragraphs (double newlines)
    if (trimmedSummary.includes('\n\n')) {
      const points = trimmedSummary.split(/\n\n+/).map(s => s.trim()).filter(s => s.length > 0);
      return points;
    }

    // Otherwise, keep as single point (even if it contains single newlines or multiple sentences)
    return [trimmedSummary];
  }

  // Default: return empty array
  return [];
};

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
  // Migrate data if needed
  const migratedData = {
    ...initialData,
    summary: migrateSummary(initialData.summary),
    technologies: migrateTechnologies(initialData.technologies)
  };

  const [data, setData] = useState<ResumeData>(migratedData);
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
    isNewItem: boolean;
  }>({
    isOpen: false,
    originalText: '',
    experienceIndex: -1,
    responsibilityIndex: -1,
    isProject: false,
    isSummary: false,
    isNewItem: false
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

  const updatePersonalInfo = (field: string, value: string) => {
    setData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value
      }
    }));
  };

  const updatePersonalLocation = (field: string, value: string | boolean) => {
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

  const updateEducation = (index: number, field: string, value: string | string[]) => {
    setData(prev => ({
      ...prev,
      education: prev.education.map((edu, i) => 
        i === index ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const updateEducationDuration = (index: number, period: 'start' | 'end', field: string, value: string | number) => {
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

  const updateExperience = (index: number, field: string, value: string | string[]) => {
    setData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) => 
        i === index ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const updateExperienceLocation = (index: number, field: string, value: string | boolean) => {
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

  const updateExperienceDuration = (index: number, period: 'start' | 'end', field: string, value: string | number) => {
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

  const updateProject = (index: number, field: string, value: string | string[]) => {
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

  const addSummaryPoint = () => {
    setData(prev => ({
      ...prev,
      summary: [...prev.summary, '']
    }));
  };

  const updateSummaryPoint = (index: number, value: string) => {
    setData(prev => ({
      ...prev,
      summary: prev.summary.map((point, i) => i === index ? value : point)
    }));
  };

  const removeSummaryPoint = (index: number) => {
    setData(prev => ({
      ...prev,
      summary: prev.summary.filter((_, i) => i !== index)
    }));
  };

  const addTechnologyCategory = () => {
    setData(prev => ({
      ...prev,
      technologies: [...prev.technologies, { category: '', items: [] }]
    }));
  };

  const updateTechnologyCategory = (index: number, category: string) => {
    setData(prev => ({
      ...prev,
      technologies: prev.technologies.map((tech, i) =>
        i === index ? { ...tech, category } : tech
      )
    }));
  };

  const updateTechnologyItems = (index: number, items: string[]) => {
    setData(prev => ({
      ...prev,
      technologies: prev.technologies.map((tech, i) =>
        i === index ? { ...tech, items } : tech
      )
    }));
  };

  const removeTechnologyCategory = (index: number) => {
    setData(prev => ({
      ...prev,
      technologies: prev.technologies.filter((_, i) => i !== index)
    }));
  };

  const handleArrayInput = (value: string): string[] => {
    return value.split(',').map(item => item.trim()).filter(item => item !== '');
  };

  const arrayToString = (arr: string[]): string => {
    return arr.join(', ');
  };

  const openRewriteDialog = (text: string, expIndex: number, respIndex: number, isProject: boolean = false, isSummary: boolean = false, isNewItem: boolean = false) => {
    setRewriteDialog({
      isOpen: true,
      originalText: text,
      experienceIndex: expIndex,
      responsibilityIndex: respIndex,
      isProject,
      isSummary,
      isNewItem
    });
  };

  const closeRewriteDialog = (skipCleanup: boolean = false) => {
    const { isNewItem, experienceIndex, responsibilityIndex, isProject, originalText } = rewriteDialog;

    // If closing a new item dialog without adding text, remove the empty item
    // Skip cleanup when the user successfully added text via "Use This Text" button
    if (!skipCleanup && isNewItem && !originalText.trim()) {
      if (isProject) {
        // Remove empty project description
        setData(prev => ({
          ...prev,
          projects: prev.projects.map((proj, projIndex) =>
            projIndex === experienceIndex ? {
              ...proj,
              description: proj.description.filter((_, descIndex) => descIndex !== responsibilityIndex)
            } : proj
          )
        }));
      } else {
        // Remove empty responsibility
        setData(prev => ({
          ...prev,
          experience: prev.experience.map((exp, expIndex) =>
            expIndex === experienceIndex ? {
              ...exp,
              responsibilities: exp.responsibilities.filter((_, respIndex) => respIndex !== responsibilityIndex)
            } : exp
          )
        }));
      }
    }

    setRewriteDialog({
      isOpen: false,
      originalText: '',
      experienceIndex: -1,
      responsibilityIndex: -1,
      isProject: false,
      isSummary: false,
      isNewItem: false
    });
  };

  const handleReplaceResponsibility = (newText: string) => {
    const { experienceIndex, responsibilityIndex, isProject, isSummary } = rewriteDialog;

    if (isSummary) {
      setData(prev => ({
        ...prev,
        summary: prev.summary.map((point, index) =>
          index === responsibilityIndex ? newText : point
        )
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

    // Skip cleanup since we just successfully added text
    closeRewriteDialog(true);
  };

  const addResponsibility = (experienceIndex: number) => {
    // Calculate the index that the new item will have (current length = new index)
    const newResponsibilityIndex = data.experience[experienceIndex].responsibilities.length;

    // Add empty responsibility to the array
    setData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, index) =>
        index === experienceIndex ? {
          ...exp,
          responsibilities: [...exp.responsibilities, '']
        } : exp
      )
    }));

    // Open the dialog for the new item with the calculated index
    openRewriteDialog('', experienceIndex, newResponsibilityIndex, false, false, true);
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
    // Calculate the index that the new item will have (current length = new index)
    const newDescriptionIndex = data.projects[projectIndex].description.length;

    // Add empty description to the array
    setData(prev => ({
      ...prev,
      projects: prev.projects.map((proj, index) =>
        index === projectIndex ? {
          ...proj,
          description: [...proj.description, '']
        } : proj
      )
    }));

    // Open the dialog for the new item with the calculated index
    openRewriteDialog('', projectIndex, newDescriptionIndex, true, false, true);
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Resume</h1>
        <button
          onClick={() => onSave(data)}
          disabled={isSaving}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50"
          title="Save all changes made to this resume"
        >
          <Save className="h-5 w-5 mr-2" />
          {isSaving ? 'Saving...' : 'Save Resume'}
        </button>
      </div>

      {/* Personal Information */}
      <MagicalSection isChanged={personalInfoChanged}>
        <div className="personal-info-section bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div 
          className="flex items-center justify-between p-4 border-b cursor-pointer"
          onClick={() => toggleSection('personalInfo')}
        >
          <div className="flex items-center">
            <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Personal Information</h2>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${expandedSections.has('personalInfo') ? 'rotate-180' : ''}`} />
        </div>
        
        {expandedSections.has('personalInfo') && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                <input
                  type="text"
                  value={data.personalInfo.firstName}
                  onChange={(e) => updatePersonalInfo('firstName', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                <input
                  type="text"
                  value={data.personalInfo.lastName}
                  onChange={(e) => updatePersonalInfo('lastName', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <div className="relative">
                  <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={data.personalInfo.email}
                    onChange={(e) => updatePersonalInfo('email', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md pl-10 pr-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <div className="relative">
                  <Phone className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={data.personalInfo.phone}
                    onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md pl-10 pr-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  value={data.personalInfo.location.city}
                  onChange={(e) => updatePersonalLocation('city', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={data.personalInfo.location.state}
                  onChange={(e) => updatePersonalLocation('state', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
                <input
                  type="text"
                  placeholder="Country"
                  value={data.personalInfo.location.country}
                  onChange={(e) => updatePersonalLocation('country', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
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
                  <span className="text-sm text-gray-700 dark:text-gray-300">Remote work available</span>
                </label>
              </div>
            </div>

            {/* Website and Social Media */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                <div className="relative">
                  <Globe className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    value={data.personalInfo.website}
                    onChange={(e) => updatePersonalInfo('website', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md pl-10 pr-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn</label>
                <div className="relative">
                  <Linkedin className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    value={data.personalInfo.socialMedia.linkedin}
                    onChange={(e) => updateSocialMedia('linkedin', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md pl-10 pr-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GitHub</label>
                <div className="relative">
                  <Github className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    value={data.personalInfo.socialMedia.github}
                    onChange={(e) => updateSocialMedia('github', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md pl-10 pr-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div 
          className="flex items-center justify-between p-4 border-b cursor-pointer"
          onClick={() => toggleSection('summary')}
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Professional Summary</h2>
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${expandedSections.has('summary') ? 'rotate-180' : ''}`} />
        </div>
        
        {expandedSections.has('summary') && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Summary Points</label>
              <button
                onClick={addSummaryPoint}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                title="Add new summary point"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {data.summary.map((point, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="flex-1">
                    <textarea
                      value={point}
                      onChange={(e) => updateSummaryPoint(index, e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm"
                      placeholder="Enter a professional summary point..."
                    />
                  </div>
                  <div className="flex flex-col space-y-1 pt-1">
                    <button
                      onClick={() => openRewriteDialog(point, -1, index, false, true)}
                      className="p-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded"
                      title="Rewrite this summary point using AI"
                      disabled={!point.trim()}
                    >
                      <Wand2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeSummaryPoint(index)}
                      className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Remove this summary point"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {data.summary.length === 0 && (
                <div className="text-gray-500 dark:text-gray-400 text-sm italic py-2">
                  No summary points added yet. Click &quot;Add&quot; to add your first point.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </MagicalSection>

      {/* Education */}
      <MagicalSection isChanged={educationChanged}>
        <div className="education-section bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div 
          className="flex items-center justify-between p-4 border-b cursor-pointer"
          onClick={() => toggleSection('education')}
        >
          <div className="flex items-center">
            <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Education</h2>
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
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 dark:bg-gray-750">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Education {index + 1}</h3>
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Institution</label>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Degree</label>
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Major</label>
                  <input
                    type="text"
                    value={edu.major}
                    onChange={(e) => updateEducation(index, 'major', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-4 mb-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Month"
                          value={edu.duration.start.month}
                          onChange={(e) => updateEducationDuration(index, 'start', 'month', e.target.value)}
                          className="w-20 sm:w-24 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Year"
                          value={edu.duration.start.year || ''}
                          onChange={(e) => updateEducationDuration(index, 'start', 'year', e.target.value ? parseInt(e.target.value) : '')}
                          className="w-20 sm:w-24 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Month"
                          value={edu.duration.end.month}
                          onChange={(e) => updateEducationDuration(index, 'end', 'month', e.target.value)}
                          className="w-20 sm:w-24 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Year"
                          value={edu.duration.end.year || ''}
                          onChange={(e) => updateEducationDuration(index, 'end', 'year', e.target.value ? parseInt(e.target.value) : '')}
                          className="w-20 sm:w-24 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Leave empty if ongoing</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Relevant Coursework (comma-separated)</label>
                  <input
                    type="text"
                    value={arrayToString(edu.coursework)}
                    onChange={(e) => updateEducation(index, 'coursework', handleArrayInput(e.target.value))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
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
        <div className="experience-section bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div 
          className="flex items-center justify-between p-4 border-b cursor-pointer"
          onClick={() => toggleSection('experience')}
        >
          <div className="flex items-center">
            <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Work Experience</h2>
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
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 dark:bg-gray-750">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Experience {index + 1}</h3>
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position</label>
                    <input
                      type="text"
                      value={exp.position}
                      onChange={(e) => updateExperience(index, 'position', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => updateExperience(index, 'company', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
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
                      <span className="text-sm text-gray-700 dark:text-gray-300">Remote position</span>
                    </label>
                  </div>
                  {!exp.location.remote && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        type="text"
                        placeholder="City"
                        value={exp.location.city}
                        onChange={(e) => updateExperienceLocation(index, 'city', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                      />
                      <input
                        type="text"
                        placeholder="State"
                        value={exp.location.state}
                        onChange={(e) => updateExperienceLocation(index, 'state', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                      />
                      <input
                        type="text"
                        placeholder="Country"
                        value={exp.location.country}
                        onChange={(e) => updateExperienceLocation(index, 'country', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Month"
                          value={exp.duration.start.month}
                          onChange={(e) => updateExperienceDuration(index, 'start', 'month', e.target.value)}
                          className="w-20 sm:w-24 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Year"
                          value={exp.duration.start.year || ''}
                          onChange={(e) => updateExperienceDuration(index, 'start', 'year', e.target.value ? parseInt(e.target.value) : '')}
                          className="w-20 sm:w-24 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Month"
                          value={exp.duration.end.month}
                          onChange={(e) => updateExperienceDuration(index, 'end', 'month', e.target.value)}
                          className="w-20 sm:w-24 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Year"
                          value={exp.duration.end.year || ''}
                          onChange={(e) => updateExperienceDuration(index, 'end', 'year', e.target.value ? parseInt(e.target.value) : '')}
                          className="w-20 sm:w-24 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Leave empty if current position</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Responsibilities</label>
                    <button
                      onClick={() => addResponsibility(index)}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
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
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm"
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div 
          className="flex items-center justify-between p-4 border-b cursor-pointer"
          onClick={() => toggleSection('projects')}
        >
          <div className="flex items-center">
            <FolderOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Projects</h2>
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
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 dark:bg-gray-750">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Project {index + 1}</h3>
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name</label>
                    <input
                      type="text"
                      value={project.name}
                      onChange={(e) => updateProject(index, 'name', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                      <button
                        onClick={() => addProjectDescription(index)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
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
                              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm"
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
                          No description points added yet. Click &quot;Add&quot; to add your first point.
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tools Used (comma-separated)</label>
                    <input
                      type="text"
                      value={arrayToString(project.toolsUsed)}
                      onChange={(e) => updateProject(index, 'toolsUsed', handleArrayInput(e.target.value))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
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
        <div className="skills-section bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div 
          className="flex items-center justify-between p-4 border-b cursor-pointer"
          onClick={() => toggleSection('technologies')}
        >
          <div className="flex items-center">
            <Code className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Technologies</h2>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${expandedSections.has('technologies') ? 'rotate-180' : ''}`} />
        </div>
        
        {expandedSections.has('technologies') && (
          <div className="p-6 space-y-6">
            {data.technologies.map((tech, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 dark:bg-gray-750">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Category {index + 1}</h3>
                  <button
                    onClick={() => removeTechnologyCategory(index)}
                    className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    title="Delete this technology category"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category Name</label>
                    <input
                      type="text"
                      value={tech.category}
                      onChange={(e) => updateTechnologyCategory(index, e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                      placeholder="e.g., Programming Languages, Frameworks, Tools"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Technologies (comma-separated)</label>
                    <input
                      type="text"
                      value={arrayToString(tech.items)}
                      onChange={(e) => updateTechnologyItems(index, handleArrayInput(e.target.value))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                      placeholder="e.g., JavaScript, Python, Java, C++"
                    />
                  </div>
                </div>
              </div>
            ))}

            {data.technologies.length === 0 && (
              <div className="text-gray-500 dark:text-gray-400 text-sm italic py-4 text-center">
                No technology categories added yet. Click &quot;Add Category&quot; to add your first category.
              </div>
            )}

            <button
              onClick={addTechnologyCategory}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-indigo-300 dark:border-indigo-600 text-sm font-medium rounded-md text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </button>
          </div>
        )}
      </div>
      </MagicalSection>

      {/* Save Button */}
      <div className="flex justify-center">
        <button
          onClick={() => onSave(data)}
          disabled={isSaving}
          className="save-resume-button inline-flex items-center px-8 py-3 border border-transparent text-lg font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
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
        isNewItem={rewriteDialog.isNewItem}
      />
    </div>
  );
}