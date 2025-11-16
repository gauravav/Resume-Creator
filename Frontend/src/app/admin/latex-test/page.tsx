'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  FileCode,
  Loader,
  FileText
} from 'lucide-react';
import { authApi, getApiBaseUrl } from '@/lib/api';
import { isAuthenticatedWithValidation } from '@/lib/auth';
import Layout from '@/components/Layout';

export default function LatexTestPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(true);
  const [user, setUser] = useState<{id: number; email: string; firstName: string; lastName: string; isAdmin: boolean} | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [latexContent, setLatexContent] = useState('');
  const [fileName, setFileName] = useState('test-document');
  const [isConverting, setIsConverting] = useState(false);
  const [latexStatus, setLatexStatus] = useState<{installed: boolean; message: string} | null>(null);

  const router = useRouter();

  // Sample LaTeX template
  const sampleLatex = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{enumitem}

\\begin{document}

\\begin{center}
{\\LARGE \\textbf{John Doe}}\\\\
\\vspace{0.2cm}
Email: john.doe@example.com | Phone: (555) 123-4567\\\\
LinkedIn: linkedin.com/in/johndoe | GitHub: github.com/johndoe
\\end{center}

\\section*{Summary}
Experienced software engineer with 5+ years of experience in full-stack development.
Proficient in JavaScript, Python, and cloud technologies.

\\section*{Experience}

\\textbf{Senior Software Engineer} \\hfill \\textit{Jan 2021 - Present}\\\\
\\textit{Tech Company Inc., San Francisco, CA}
\\begin{itemize}[leftmargin=*]
\\item Led development of microservices architecture serving 1M+ users
\\item Improved system performance by 40\\% through optimization
\\item Mentored junior developers and conducted code reviews
\\end{itemize}

\\textbf{Software Engineer} \\hfill \\textit{Jun 2019 - Dec 2020}\\\\
\\textit{Startup Co., New York, NY}
\\begin{itemize}[leftmargin=*]
\\item Developed RESTful APIs using Node.js and Express
\\item Implemented CI/CD pipelines reducing deployment time by 60\\%
\\item Collaborated with cross-functional teams on product features
\\end{itemize}

\\section*{Education}

\\textbf{Bachelor of Science in Computer Science} \\hfill \\textit{2015 - 2019}\\\\
\\textit{University of Technology}

\\section*{Skills}

\\textbf{Languages:} JavaScript, Python, Java, TypeScript\\\\
\\textbf{Frameworks:} React, Node.js, Express, Django\\\\
\\textbf{Tools:} Git, Docker, Kubernetes, AWS

\\end{document}`;

  useEffect(() => {
    const validateAndLoad = async () => {
      try {
        setIsValidating(true);
        const isValid = await isAuthenticatedWithValidation();
        if (!isValid) {
          router.push('/login');
          return;
        }

        const userData = await authApi.getMe();
        setUser(userData.user);

        // Check if user is admin
        if (!userData.user.isAdmin) {
          router.push('/dashboard');
          return;
        }

        // Check LaTeX status
        await checkLatexStatus();

        // Load sample template
        setLatexContent(sampleLatex);
      } catch (error) {
        console.error('Validation error:', error);
        setError('Authentication failed. Please login again.');
        setTimeout(() => router.push('/login'), 2000);
      } finally {
        setIsValidating(false);
        setIsLoading(false);
      }
    };

    validateAndLoad();
  }, [router]);

  const checkLatexStatus = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      const API_BASE_URL = getApiBaseUrl();

      const response = await fetch(`${API_BASE_URL}/api/latex/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLatexStatus(data.pdflatex);
      }
    } catch (error) {
      console.error('Failed to check LaTeX status:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.tex')) {
      setError('Please upload a .tex file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setLatexContent(content);
      setFileName(file.name.replace('.tex', ''));
      setSuccess('LaTeX file loaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setLatexContent(sampleLatex);
    setFileName('sample-resume');
    setSuccess('Sample template loaded!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleConvertToPdf = async () => {
    if (!latexContent.trim()) {
      setError('Please provide LaTeX content');
      return;
    }

    setIsConverting(true);
    setError('');
    setSuccess('');

    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      const API_BASE_URL = getApiBaseUrl();

      const response = await fetch(`${API_BASE_URL}/api/latex/convert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latexContent,
          fileName
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setSuccess('PDF generated and downloaded successfully!');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to convert LaTeX to PDF');
      }
    } catch (error) {
      console.error('Conversion error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  if (isValidating || isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white text-sm">
              {isValidating ? 'Validating admin access...' : 'Loading LaTeX test page...'}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Messages */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-300 mr-2 flex-shrink-0" />
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4 mb-6">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400 dark:text-green-300 mr-2 flex-shrink-0" />
                <p className="text-green-700 dark:text-green-300 text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* LaTeX Status */}
          {latexStatus && (
            <div className={`${latexStatus.installed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'} border rounded-md p-4 mb-6`}>
              <div className="flex items-center">
                {latexStatus.installed ? (
                  <CheckCircle className="h-5 w-5 text-green-400 dark:text-green-300 mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-300 mr-2" />
                )}
                <p className={`${latexStatus.installed ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'} text-sm font-medium`}>
                  {latexStatus.message}
                </p>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileCode className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-3" />
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">LaTeX to PDF Converter Test</h2>
                </div>
                <Link
                  href="/admin"
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium"
                >
                  ← Back to Admin Dashboard
                </Link>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* File Upload and Actions */}
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload .tex File
                  <input
                    type="file"
                    accept=".tex"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleLoadSample}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Load Sample Template
                </button>
              </div>

              {/* File Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Output File Name (without extension)
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
                  placeholder="document-name"
                />
              </div>

              {/* LaTeX Content Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  LaTeX Content
                </label>
                <textarea
                  value={latexContent}
                  onChange={(e) => setLatexContent(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent font-mono text-sm"
                  rows={20}
                  placeholder="Paste your LaTeX content here or upload a .tex file..."
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Characters: {latexContent.length}
                </p>
              </div>

              {/* Convert Button */}
              <div>
                <button
                  onClick={handleConvertToPdf}
                  disabled={isConverting || !latexContent.trim() || !latexStatus?.installed}
                  className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConverting ? (
                    <>
                      <Loader className="h-5 w-5 mr-2 animate-spin" />
                      Converting to PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5 mr-2" />
                      Convert to PDF & Download
                    </>
                  )}
                </button>
                {!latexStatus?.installed && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-center">
                    pdflatex is not installed. Please install MacTeX to use this feature.
                  </p>
                )}
              </div>

              {/* Help Text */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">How to use:</h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                  <li>Upload a .tex file or paste LaTeX content directly</li>
                  <li>Click "Load Sample Template" to see an example resume</li>
                  <li>Modify the content as needed</li>
                  <li>Click "Convert to PDF & Download" to generate the PDF</li>
                  <li>The PDF will be automatically downloaded to your computer</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
