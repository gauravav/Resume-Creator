'use client';

import React from 'react';
import { ResumeData } from '@/types/resume';
import { Sparkles } from 'lucide-react';

interface ChangeHighlighterProps {
  originalData: ResumeData;
  modifiedData: ResumeData;
  children: React.ReactNode;
}


export default function ChangeHighlighter({ originalData, modifiedData, children }: ChangeHighlighterProps) {
  const hasChanges = (original: unknown, modified: unknown): boolean => {
    if (typeof original !== typeof modified) return true;
    if (original === null || modified === null) return original !== modified;

    if (Array.isArray(original) && Array.isArray(modified)) {
      if (original.length !== modified.length) return true;
      return original.some((item, index) => hasChanges(item, modified[index]));
    }

    if (typeof original === 'object') {
      const originalKeys = Object.keys(original);
      const modifiedKeys = Object.keys(modified || {});

      if (originalKeys.length !== modifiedKeys.length) return true;

      return originalKeys.some(key => hasChanges((original as Record<string, unknown>)[key], (modified as Record<string, unknown>)[key]));
    }

    return original !== modified;
  };

  // Helper to detect added and removed items in arrays
  const getArrayChanges = (original: string[], modified: string[]) => {
    const origSet = new Set(original || []);
    const modSet = new Set(modified || []);

    const added = (modified || []).filter(item => !origSet.has(item));
    const removed = (original || []).filter(item => !modSet.has(item));

    return {
      hasChanges: added.length > 0 || removed.length > 0,
      added,
      removed
    };
  };

  // Granular change detection
  const summaryChanged = hasChanges(originalData.summary, modifiedData.summary);
  const personalInfoChanged = hasChanges(originalData.personalInfo, modifiedData.personalInfo);
  const educationChanged = hasChanges(originalData.education, modifiedData.education);
  const experienceChanged = hasChanges(originalData.experience, modifiedData.experience);
  const projectsChanged = hasChanges(originalData.projects, modifiedData.projects);
  const technologiesChanged = hasChanges(originalData.technologies, modifiedData.technologies);

  // Detailed change detection for individual elements
  console.log('ChangeHighlighter - Original vs Modified data:', {
    originalSummary: originalData.summary?.slice(0, 100),
    modifiedSummary: modifiedData.summary?.slice(0, 100),
    summaryChanged,
    originalExperience: originalData.experience?.length,
    modifiedExperience: modifiedData.experience?.length,
    experienceChanged,
  });

  const detailedChanges = {
    // Personal Info field-level changes
    personalInfo: {
      firstName: originalData.personalInfo?.firstName !== modifiedData.personalInfo?.firstName,
      lastName: originalData.personalInfo?.lastName !== modifiedData.personalInfo?.lastName,
      email: originalData.personalInfo?.email !== modifiedData.personalInfo?.email,
      phone: originalData.personalInfo?.phone !== modifiedData.personalInfo?.phone,
      website: originalData.personalInfo?.website !== modifiedData.personalInfo?.website,
      location: hasChanges(originalData.personalInfo?.location, modifiedData.personalInfo?.location),
      socialMedia: hasChanges(originalData.personalInfo?.socialMedia, modifiedData.personalInfo?.socialMedia),
    },

    // Education changes per entry
    education: (originalData.education || []).map((edu, index) => {
      const modifiedEdu = modifiedData.education?.[index];
      if (!modifiedEdu) return { changed: true, fields: {} };

      return {
        changed: hasChanges(edu, modifiedEdu),
        fields: {
          institution: edu.institution !== modifiedEdu.institution,
          degree: edu.degree !== modifiedEdu.degree,
          major: edu.major !== modifiedEdu.major,
          duration: hasChanges(edu.duration, modifiedEdu.duration),
          coursework: hasChanges(edu.coursework, modifiedEdu.coursework),
        }
      };
    }),

    // Experience changes per entry and per responsibility
    experience: (originalData.experience || []).map((exp, index) => {
      const modifiedExp = modifiedData.experience?.[index];
      if (!modifiedExp) return { changed: true, fields: {}, responsibilities: [], newResponsibilities: [] };

      const originalResps = exp.responsibilities || [];
      const modifiedResps = modifiedExp.responsibilities || [];

      // Track which responsibilities are changed and which are new
      const responsibilityChanges = modifiedResps.map((modResp, respIndex) => {
        const origResp = originalResps[respIndex];
        const isNew = respIndex >= originalResps.length;
        const isEdited = !isNew && origResp !== modResp;

        if (isNew) {
          console.log(`Experience ${index} Responsibility ${respIndex} is NEW:`, modResp?.slice(0, 50));
        } else if (isEdited) {
          console.log(`Experience ${index} Responsibility ${respIndex} EDITED:`, {
            original: origResp?.slice(0, 50),
            modified: modResp?.slice(0, 50)
          });
        }

        return {
          changed: isEdited,
          isNew: isNew
        };
      });

      return {
        changed: hasChanges(exp, modifiedExp),
        fields: {
          position: exp.position !== modifiedExp.position,
          company: exp.company !== modifiedExp.company,
          location: hasChanges(exp.location, modifiedExp.location),
          duration: hasChanges(exp.duration, modifiedExp.duration),
        },
        responsibilities: responsibilityChanges.map(r => r.changed),
        newResponsibilities: responsibilityChanges.map(r => r.isNew)
      };
    }),

    // Projects changes per entry and per description
    projects: (originalData.projects || []).map((proj, index) => {
      const modifiedProj = modifiedData.projects?.[index];
      if (!modifiedProj) return { changed: true, fields: {}, descriptions: [] };

      return {
        changed: hasChanges(proj, modifiedProj),
        fields: {
          name: proj.name !== modifiedProj.name,
          toolsUsed: hasChanges(proj.toolsUsed, modifiedProj.toolsUsed),
        },
        descriptions: (proj.description || []).map((desc, descIndex) => {
          const modifiedDesc = modifiedProj.description?.[descIndex];
          return desc !== modifiedDesc;
        })
      };
    }),

    // Technology changes - handle both array and object formats
    technologies: (() => {
      // If technologies is in array format (dynamic categories)
      if (Array.isArray(originalData.technologies) && Array.isArray(modifiedData.technologies)) {
        const origTech = originalData.technologies as Array<{ category: string; items: string[] }>;
        const modTech = modifiedData.technologies as Array<{ category: string; items: string[] }>;

        return {
          isArrayFormat: true,
          categories: modTech.map((modCat, index) => {
            const origCat = origTech.find(o => o.category === modCat.category) || origTech[index];
            const categoryRenamed = origCat && origCat.category !== modCat.category;
            const isNewCategory = !origTech.some(o => o.category === modCat.category) && index >= origTech.length;

            return {
              category: modCat.category,
              originalCategory: origCat?.category,
              categoryRenamed,
              isNewCategory,
              technologies: getArrayChanges(origCat?.items || [], modCat.items)
            };
          })
        };
      }

      // If technologies is in object format (fixed categories)
      return {
        isArrayFormat: false,
        languages: getArrayChanges(
          (originalData.technologies as { languages?: string[] })?.languages || [],
          (modifiedData.technologies as { languages?: string[] })?.languages || []
        ),
        backend: getArrayChanges(
          (originalData.technologies as { backend?: string[] })?.backend || [],
          (modifiedData.technologies as { backend?: string[] })?.backend || []
        ),
        frontend: getArrayChanges(
          (originalData.technologies as { frontend?: string[] })?.frontend || [],
          (modifiedData.technologies as { frontend?: string[] })?.frontend || []
        ),
        cloudAndDevOps: getArrayChanges(
          (originalData.technologies as { cloudAndDevOps?: string[] })?.cloudAndDevOps || [],
          (modifiedData.technologies as { cloudAndDevOps?: string[] })?.cloudAndDevOps || []
        ),
        databases: {
          sql: getArrayChanges(
            (originalData.technologies as { databases?: { sql?: string[] } })?.databases?.sql || [],
            (modifiedData.technologies as { databases?: { sql?: string[] } })?.databases?.sql || []
          ),
          nosql: getArrayChanges(
            (originalData.technologies as { databases?: { nosql?: string[] } })?.databases?.nosql || [],
            (modifiedData.technologies as { databases?: { nosql?: string[] } })?.databases?.nosql || []
          ),
        },
        cicdAndAutomation: getArrayChanges(
          (originalData.technologies as { cicdAndAutomation?: string[] })?.cicdAndAutomation || [],
          (modifiedData.technologies as { cicdAndAutomation?: string[] })?.cicdAndAutomation || []
        ),
        testingAndDebugging: getArrayChanges(
          (originalData.technologies as { testingAndDebugging?: string[] })?.testingAndDebugging || [],
          (modifiedData.technologies as { testingAndDebugging?: string[] })?.testingAndDebugging || []
        ),
      };
    })()
  };

  // Debug the detailed changes
  console.log('ChangeHighlighter - Detailed changes object:', JSON.stringify(detailedChanges, null, 2));

  // Inject change indicators into the children
  const childrenWithChanges = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    
    // Pass detailed changes to child components
    return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
      ...(child.props || {}),
      summaryChanged,
      personalInfoChanged,
      educationChanged,
      experienceChanged,
      projectsChanged,
      technologiesChanged,
      detailedChanges, // Pass the detailed change information
    });
  });

  return (
    <div className="relative">
      {(summaryChanged || personalInfoChanged || educationChanged || 
        experienceChanged || projectsChanged || technologiesChanged) && (
        <div className="mb-6 relative">
          {/* Magical glow background */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-500 to-indigo-600 rounded-xl blur opacity-20 animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/50 dark:via-blue-950/50 dark:to-indigo-950/50 border-2 border-transparent bg-clip-padding rounded-xl p-6">
            {/* Gradient border */}
            <div className="absolute inset-0 rounded-xl p-[2px] bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500">
              <div className="h-full w-full rounded-lg bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/50 dark:via-blue-950/50 dark:to-indigo-950/50"></div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center mb-3">
                <div className="relative mr-3">
                  <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400 animate-pulse" />
                  <div className="absolute -inset-1 bg-purple-400 dark:bg-purple-500 rounded-full blur opacity-30 animate-ping"></div>
                </div>
                <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 dark:from-purple-400 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  ✨ AI Magic Applied!
                </h3>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Your resume has been intelligently enhanced. Look for the glowing sections below:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {summaryChanged && (
                  <div className="flex items-center p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400 mr-2" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Professional Summary</span>
                  </div>
                )}
                {personalInfoChanged && (
                  <div className="flex items-center p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400 mr-2" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Personal Information</span>
                  </div>
                )}
                {educationChanged && (
                  <div className="flex items-center p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400 mr-2" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Education</span>
                  </div>
                )}
                {experienceChanged && (
                  <div className="flex items-center p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400 mr-2" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Work Experience</span>
                  </div>
                )}
                {projectsChanged && (
                  <div className="flex items-center p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400 mr-2" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Projects</span>
                  </div>
                )}
                {technologiesChanged && (
                  <div className="flex items-center p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400 mr-2" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Technologies</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {childrenWithChanges}
    </div>
  );
}