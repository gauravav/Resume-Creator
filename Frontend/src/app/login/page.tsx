'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react';
import { authApi } from '@/lib/api';
import { setToken } from '@/lib/auth';
import Layout from '@/components/Layout';
import { useToast } from '@/components/ToastContainer';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(254, 'Email address is too long'),
  password: z.string().min(1, 'Password is required').max(128, 'Password is too long'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);

    try {
      const response = await authApi.login(data);
      setToken(response.token);
      
      showToast({
        type: 'success',
        message: 'Successfully logged in! Welcome back.',
        duration: 3000
      });
      
      // Small delay to show the toast before redirecting
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (err) {
      console.error('Login error:', err);
      const error = err as {response?: {data?: {error?: string, message?: string, code?: string}, status?: number}};
      
      let errorMessage = 'Login failed. Please try again.';
      let toastType: 'error' | 'warning' = 'error';
      let duration = 6000;
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        
        // Handle specific error types with enhanced messaging
        if (error.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
          errorMessage = '📧 Please verify your email address before logging in. Check your inbox for the verification link.';
          toastType = 'warning';
          duration = 10000;
        } else if (error.response?.data?.code === 'PENDING_APPROVAL') {
          errorMessage = '⏳ Your account is pending admin approval. You will receive an email once approved.';
          toastType = 'warning';
          duration = 15000;
        } else if (error.response?.data?.code === 'ACCOUNT_REJECTED') {
          errorMessage = '❌ Your account application has been rejected. Please contact support if you believe this is an error.';
          duration = 10000;
        }
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      showToast({
        type: toastType,
        message: errorMessage,
        duration: duration
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-lg p-8 rounded-xl shadow-2xl border border-white/20 relative z-10">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-full flex items-center justify-center">
            <LogIn className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your Resume Creator account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Email address"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/25 active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300 ease-in-out"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700 ease-out"></div>
              <span className="relative z-10 flex items-center justify-center">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="transform group-hover:scale-110 transition-transform duration-200">Sign in</span>
                    <LogIn className="ml-2 h-4 w-4 transform translate-x-0 group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </span>
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Create one here
              </Link>
            </p>
          </div>
        </form>
        </div>
      </div>
    </Layout>
  );
}