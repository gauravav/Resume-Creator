'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader, Mail } from 'lucide-react';
import Layout from '@/components/Layout';
import { authApi } from '@/lib/api';
import { useToast } from '@/components/ToastContainer';

function VerifyEmailContent() {
  const [status, setStatus] = useState<'ready' | 'loading' | 'success' | 'error'>('ready');
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }
  }, [searchParams]);

  const handleVerifyClick = async () => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    setStatus('loading');

    try {
      const response = await authApi.verifyEmail(token);
      setStatus('success');
      setMessage(response.message || 'Email verified successfully!');

      showToast({
        type: 'success',
        message: '✅ Email verified successfully! Your account is now pending admin approval.',
        duration: 6000
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (err) {
      console.error('Email verification error:', err);
      const error = err as {response?: {data?: {error?: string, message?: string}}};

      setStatus('error');

      let errorMessage = 'Email verification failed. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      setMessage(errorMessage);

      showToast({
        type: 'error',
        message: errorMessage,
        duration: 8000
      });
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-lg p-8 rounded-xl shadow-2xl border border-white/20 relative z-10">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 flex items-center justify-center mb-6">
              {status === 'ready' && (
                <Mail className="h-16 w-16 text-indigo-600" />
              )}
              {status === 'loading' && (
                <div className="relative">
                  <Loader className="h-16 w-16 text-indigo-600 animate-spin" />
                  <Mail className="h-8 w-8 text-indigo-600 absolute top-4 left-4" />
                </div>
              )}
              {status === 'success' && (
                <CheckCircle className="h-16 w-16 text-green-600" />
              )}
              {status === 'error' && (
                <XCircle className="h-16 w-16 text-red-600" />
              )}
            </div>

            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
              {status === 'ready' && 'Verify Your Email'}
              {status === 'loading' && 'Verifying Email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
            </h2>

            {status === 'ready' && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Click the button below to verify your email address and complete your registration.
                </p>
                <div className="text-center">
                  <button
                    onClick={handleVerifyClick}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 ease-in-out transform hover:scale-105"
                  >
                    Verify Email Address
                  </button>
                </div>
              </div>
            )}

            {status === 'loading' && (
              <div className="text-sm mb-6 p-4 rounded-lg bg-blue-50 text-blue-800">
                Please wait while we verify your email address...
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <div className="text-sm mb-6 p-4 rounded-lg bg-green-50 text-green-800">
                  {message}
                </div>
                <p className="text-gray-600">
                  Your email has been successfully verified! Your account is now pending admin approval. You will receive an email notification once approved.
                </p>
                <div className="text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 ease-in-out transform hover:scale-105"
                  >
                    Go to Login
                  </Link>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <div className="text-sm mb-6 p-4 rounded-lg bg-red-50 text-red-800">
                  {message}
                </div>
                <div className="text-center space-y-3">
                  <Link
                    href="/register"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 ease-in-out transform hover:scale-105 mr-3"
                  >
                    Try Registering Again
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300"
                  >
                    Go to Login
                  </Link>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  If you continue to have problems, please contact support.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-lg p-8 rounded-xl shadow-2xl border border-white/20 relative z-10">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 flex items-center justify-center mb-6">
                <Loader className="h-16 w-16 text-indigo-600 animate-spin" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Loading...</h2>
              <p className="text-sm text-gray-600">Please wait while we prepare the verification page.</p>
            </div>
          </div>
        </div>
      </Layout>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}