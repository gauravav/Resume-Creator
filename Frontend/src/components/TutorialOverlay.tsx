'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useTutorial } from '@/context/TutorialContext';

const TutorialOverlay: React.FC = () => {
  const {
    isTutorialActive,
    currentStep,
    tutorialSteps,
    nextStep,
    previousStep,
    exitTutorial,
  } = useTutorial();

  const [overlayPosition, setOverlayPosition] = useState({ top: 0, left: 0 });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const currentStepData = tutorialSteps[currentStep];
  const totalSteps = tutorialSteps.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  useEffect(() => {
    if (!isTutorialActive || !currentStepData) return;

    const updatePosition = () => {
      const targetElement = document.querySelector(currentStepData.targetElement);
      if (!targetElement) {
        console.warn(`Target element not found: ${currentStepData.targetElement}`);
        return;
      }

      const rect = targetElement.getBoundingClientRect();
      setTargetRect(rect);

      // Calculate overlay position based on target element and position preference
      const overlayWidth = overlayRef.current?.offsetWidth || 320;
      const overlayHeight = overlayRef.current?.offsetHeight || 200;
      const spacing = 20; // Gap between target and overlay
      const arrowSize = 12;

      let top = 0;
      let left = 0;

      switch (currentStepData.position) {
        case 'top':
          top = rect.top - overlayHeight - spacing - arrowSize;
          left = rect.left + rect.width / 2 - overlayWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + spacing + arrowSize;
          left = rect.left + rect.width / 2 - overlayWidth / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - overlayHeight / 2;
          left = rect.left - overlayWidth - spacing - arrowSize;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - overlayHeight / 2;
          left = rect.right + spacing + arrowSize;
          break;
      }

      // Ensure overlay stays within viewport
      const viewportPadding = 10;
      top = Math.max(viewportPadding, Math.min(top, window.innerHeight - overlayHeight - viewportPadding));
      left = Math.max(viewportPadding, Math.min(left, window.innerWidth - overlayWidth - viewportPadding));

      setOverlayPosition({ top, left });

      // Scroll target into view if needed
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    };

    // Initial position calculation
    updatePosition();

    // Recalculate on window resize or scroll
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isTutorialActive, currentStep, currentStepData]);

  if (!isTutorialActive || !currentStepData) return null;

  const getArrowStyles = (): React.CSSProperties => {
    if (!targetRect) return {};

    const arrowSize = 12;
    const baseStyles: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderTopWidth: `${arrowSize}px`,
      borderTopStyle: 'solid',
      borderTopColor: 'transparent',
      borderRightWidth: `${arrowSize}px`,
      borderRightStyle: 'solid',
      borderRightColor: 'transparent',
      borderBottomWidth: `${arrowSize}px`,
      borderBottomStyle: 'solid',
      borderBottomColor: 'transparent',
      borderLeftWidth: `${arrowSize}px`,
      borderLeftStyle: 'solid',
      borderLeftColor: 'transparent',
    };

    switch (currentStepData.position) {
      case 'top':
        return {
          ...baseStyles,
          bottom: -arrowSize * 2,
          left: '50%',
          transform: 'translateX(-50%)',
          borderTopColor: 'rgb(59 130 246)', // blue-500
          borderBottomWidth: 0,
        };
      case 'bottom':
        return {
          ...baseStyles,
          top: -arrowSize * 2,
          left: '50%',
          transform: 'translateX(-50%)',
          borderBottomColor: 'rgb(59 130 246)',
          borderTopWidth: 0,
        };
      case 'left':
        return {
          ...baseStyles,
          right: -arrowSize * 2,
          top: '50%',
          transform: 'translateY(-50%)',
          borderLeftColor: 'rgb(59 130 246)',
          borderRightWidth: 0,
        };
      case 'right':
        return {
          ...baseStyles,
          left: -arrowSize * 2,
          top: '50%',
          transform: 'translateY(-50%)',
          borderRightColor: 'rgb(59 130 246)',
          borderLeftWidth: 0,
        };
      default:
        return baseStyles;
    }
  };

  return (
    <>
      {/* Backdrop with spotlight effect */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
        {targetRect && (
          <div
            className="absolute bg-transparent border-4 border-blue-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] animate-pulse-subtle pointer-events-auto"
            style={{
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
            }}
          />
        )}
      </div>

      {/* Tutorial overlay card */}
      <div
        ref={overlayRef}
        className="fixed z-[9999] animate-slideIn"
        style={{
          top: `${overlayPosition.top}px`,
          left: `${overlayPosition.left}px`,
        }}
      >
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-2xl max-w-sm w-80 relative">
          {/* Arrow pointer */}
          <div style={getArrowStyles()} />

          {/* Close button */}
          <button
            onClick={exitTutorial}
            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors z-10"
            aria-label="Exit tutorial"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="p-4 pb-3 border-b border-white/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80 text-xs font-medium">
                Step {currentStep + 1} of {totalSteps}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: totalSteps }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentStep
                        ? 'w-6 bg-white'
                        : idx < currentStep
                        ? 'w-1.5 bg-white/60'
                        : 'w-1.5 bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>
            <h3 className="text-white text-lg font-bold">{currentStepData.title}</h3>
          </div>

          {/* Body */}
          <div className="p-4">
            <p className="text-white/90 text-sm leading-relaxed mb-3">
              {currentStepData.description}
            </p>

            {currentStepData.action && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-4 border border-white/20">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                  </svg>
                  <div>
                    <p className="text-xs text-white/70 font-medium mb-1">Try it out:</p>
                    <p className="text-white text-sm">{currentStepData.action}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-2">
              <button
                onClick={previousStep}
                disabled={isFirstStep}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isFirstStep
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
              >
                Previous
              </button>
              <button
                onClick={nextStep}
                className="flex-1 px-4 py-2 bg-white hover:bg-gray-100 text-blue-600 rounded-lg font-medium transition-colors shadow-lg"
              >
                {isLastStep ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default TutorialOverlay;
