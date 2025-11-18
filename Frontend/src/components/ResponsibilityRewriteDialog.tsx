'use client';

import { useState, useEffect } from 'react';
import { X, Wand2, Loader2, Replace, Trash2 } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface ResponsibilityRewriteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  onReplace: (newText: string) => void;
  isNewItem?: boolean;
}

export default function ResponsibilityRewriteDialog({
  isOpen,
  onClose,
  originalText,
  onReplace,
  isNewItem = false
}: ResponsibilityRewriteDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [rewrittenText, setRewrittenText] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);

  // Clean up internal state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setPrompt('');
      setRewrittenText('');
      setError('');
      setShowConfirmDiscard(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRewrite = async () => {
    setIsRewriting(true);
    setError('');

    try {
      // Get token from auth library
      const token = getToken();

      // For new items, handle the request differently
      let requestBody;
      if (isNewItem) {
        // If user provided a prompt, use it as the base text to improve
        // Otherwise, generate a professional resume point from scratch
        const userPrompt = prompt.trim();
        if (userPrompt) {
          requestBody = {
            originalText: userPrompt,
            prompt: 'Convert this into a professional, impactful resume bullet point with strong action verbs and quantifiable results where possible'
          };
        } else {
          requestBody = {
            originalText: 'Create a professional resume bullet point',
            prompt: 'Generate a strong, professional resume bullet point with action verbs and measurable impact'
          };
        }
      } else {
        // For existing items, use the original rewrite logic
        const rewritePrompt = prompt.trim() || 'Make this more professional and impactful';
        requestBody = {
          originalText,
          prompt: rewritePrompt
        };
      }

      const response = await fetch(`${getApiBaseUrl()}/api/rewrite/responsibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to rewrite responsibility');
      }

      const data = await response.json();
      setRewrittenText(data.rewrittenText);
    } catch (error) {
      console.error('Rewrite error:', error);
      setError('Failed to rewrite responsibility. Please try again.');
    } finally {
      setIsRewriting(false);
    }
  };

  const handleReplace = () => {
    onReplace(rewrittenText);
    // Don't call handleClose here - the parent's onReplace handler will close the dialog
    // Calling handleClose would trigger onClose() again, causing a double-close
  };

  const handleDiscard = () => {
    if (rewrittenText && !showConfirmDiscard) {
      setShowConfirmDiscard(true);
      return;
    }
    handleClose();
  };

  const handleClose = () => {
    setPrompt('');
    setRewrittenText('');
    setError('');
    setShowConfirmDiscard(false);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleDiscard();
    }
  };

  return (
    <div
      className="fixed inset-0 backdrop-blur-md bg-white/20 dark:bg-black/40 z-[60] overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="min-h-screen w-full flex items-center justify-center p-4 py-20">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isNewItem ? 'Create New Point' : 'Rewrite Responsibility'}
          </h3>
          <button
            onClick={handleDiscard}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Original Text - Only show when editing existing text */}
          {!isNewItem && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Original Text
              </label>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200">
                {originalText}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isNewItem
                ? 'Describe the point you want to create'
                : 'How would you like this rewritten?'
              } <span className="text-gray-400 dark:text-gray-500 text-xs">(optional)</span>
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={isNewItem
                ? "e.g., Developed a REST API using Node.js and Express, Led a team of 5 developers, Improved system performance by 40%... (Leave empty for AI to generate a professional resume point)"
                : "e.g., Make it more action-oriented, Add quantifiable results, Use stronger verbs, Make it more concise... (Leave empty for general improvement)"
              }
              className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 resize-none"
              disabled={isRewriting}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Rewrite Button */}
          {!rewrittenText && (
            <button
              onClick={handleRewrite}
              disabled={isRewriting}
              className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRewriting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isNewItem ? 'Creating...' : 'Rewriting...'}
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  {isNewItem ? 'Create with AI' : 'Rewrite with AI'}
                </>
              )}
            </button>
          )}

          {/* Rewritten Text */}
          {rewrittenText && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isNewItem ? 'AI Generated Text' : 'AI Rewritten Version'}
              </label>
              <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-md text-gray-800 dark:text-gray-200">
                {rewrittenText}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {rewrittenText && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button
              onClick={handleDiscard}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Discard
            </button>
            <button
              onClick={handleReplace}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
            >
              <Replace className="w-4 h-4 mr-2" />
              {isNewItem ? 'Use This Text' : 'Replace Original'}
            </button>
            <button
              onClick={() => setRewrittenText('')}
              className="inline-flex items-center px-4 py-2 border border-indigo-300 dark:border-indigo-600 text-sm font-medium rounded-md text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        )}

        {/* Discard Confirmation */}
        {showConfirmDiscard && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/30">
            <div className="flex items-center justify-between">
              <p className="text-red-700 dark:text-red-400 text-sm">
                Are you sure you want to discard the rewritten text?
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowConfirmDiscard(false)}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClose}
                  className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}