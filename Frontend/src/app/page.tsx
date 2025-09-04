'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, LogIn, UserPlus, Upload, Shield } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';
import Layout from '@/components/Layout';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <Layout showNav={false}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="pt-8 pb-12">
          <nav className="flex justify-between items-center">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-indigo-400 mr-2" />
              <span className="text-xl font-bold text-white">Resume Creator</span>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white/90 backdrop-blur-sm hover:bg-white/95 transition-all"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Sign Up
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <main className="text-center py-16 relative overflow-hidden">
          <div className="max-w-4xl mx-auto relative z-10">
            <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-8">
              Create & Edit
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
                {' '}AI-Powered{' '}
              </span>
              Resumes
            </h1>
            
            <p className="text-xl text-gray-200 mb-12 max-w-2xl mx-auto">
              Upload your resume and use our AI to create, edit, and customize every section. 
              Rewrite responsibilities, enhance summaries, and tailor content for any opportunity.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all"
              >
                <FileText className="h-5 w-5 mr-2" />
                Get Started Free
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center px-8 py-4 border border-gray-300 text-lg font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all"
              >
                <LogIn className="h-5 w-5 mr-2" />
                Sign In
              </Link>
            </div>
          </div>
        </main>

        {/* How It Works Section */}
        <section className="py-16 bg-black/20 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-white mb-12">
              How It Works - Simple 3-Step Process
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
                <h3 className="text-xl font-semibold text-white mb-2">Create New Resume</h3>
                <p className="text-gray-200">
                  Upload your resume file and our AI extracts all your experience, skills, and achievements into structured data.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
                <h3 className="text-xl font-semibold text-white mb-2">AI-Powered Editing</h3>
                <p className="text-gray-200">
                  Use AI to rewrite responsibilities, enhance your summary, and perfect every detail with custom prompts.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-green-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
                <h3 className="text-xl font-semibold text-white mb-2">Export & Apply</h3>
                <p className="text-gray-200">
                  Download your perfected resume and apply with confidence. Keep multiple versions organized in your dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-white mb-12">
              Powerful AI-driven resume creation and editing
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Resume Import</h3>
                <p className="text-gray-600">
                  Upload PDF, DOC, or DOCX files and our AI extracts all content into editable, structured data automatically.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Rewriting</h3>
                <p className="text-gray-600">
                  Enhance every responsibility and summary with AI. Give custom prompts to make content more impactful and professional.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Organized</h3>
                <p className="text-gray-600">
                  Keep all your resume versions organized in a clean dashboard. Edit, download, and manage with ease.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 text-center text-gray-300">
          <div className="flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-indigo-400 mr-2" />
            <span className="font-semibold text-white">Resume Creator (Restor)</span>
          </div>
          <p>&copy; 2024 Resume Creator (Restor). Transform your career with AI-powered resume customization.</p>
        </footer>
      </div>
    </Layout>
  );
}
