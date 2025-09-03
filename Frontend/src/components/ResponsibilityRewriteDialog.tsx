'use client';

import { useState } from 'react';
import { X, Wand2, Loader2, Replace, Trash2 } from 'lucide-react';

interface ResponsibilityRewriteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  onReplace: (newText: string) => void;
}

export default function ResponsibilityRewriteDialog({
  isOpen,
  onClose,
  originalText,
  onReplace
}: ResponsibilityRewriteDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [rewrittenText, setRewrittenText] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);

  if (!isOpen) return null;

  const handleRewrite = async () => {
    // Prompt is now optional - if empty, use a default rewriting instruction
    const rewritePrompt = prompt.trim() || 'Make this more professional and impactful';

    setIsRewriting(true);
    setError('');

    try {
      // Get token from cookies
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200'}/api/rewrite/responsibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          originalText,
          prompt: rewritePrompt
        })
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
    handleClose();
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
      className="fixed inset-0 backdrop-blur-md bg-white/20 z-[60] overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Rewrite Responsibility</h3>
          <button
            onClick={handleDiscard}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Original Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Original Text
            </label>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-gray-800">
              {originalText}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
              How would you like this rewritten? <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Make it more action-oriented, Add quantifiable results, Use stronger verbs, Make it more concise... (Leave empty for general improvement)"
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              disabled={isRewriting}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Rewrite Button */}
          {!rewrittenText && (
            <button
              onClick={handleRewrite}
              disabled={isRewriting}
              className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRewriting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rewriting...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Rewrite with AI
                </>
              )}
            </button>
          )}

          {/* Rewritten Text */}
          {rewrittenText && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Rewritten Version
              </label>
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-gray-800">
                {rewrittenText}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {rewrittenText && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={handleDiscard}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Discard
            </button>
            <button
              onClick={handleReplace}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <Replace className="w-4 h-4 mr-2" />
              Replace Original
            </button>
            <button
              onClick={() => setRewrittenText('')}
              className="inline-flex items-center px-4 py-2 border border-indigo-300 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        )}

        {/* Discard Confirmation */}
        {showConfirmDiscard && (
          <div className="px-6 py-4 border-t border-gray-200 bg-red-50">
            <div className="flex items-center justify-between">
              <p className="text-red-700 text-sm">
                Are you sure you want to discard the rewritten text?
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowConfirmDiscard(false)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClose}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium"
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