'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { FileText, User, ChevronDown, LogOut, LogIn, UserPlus } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { authApi, accountApi } from '@/lib/api';
import { isAuthenticated, validateTokenWithServer, removeToken } from '@/lib/auth';

interface NavbarUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin?: boolean;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<NavbarUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Initialize user from localStorage to persist across rate limit errors
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('navbarUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  useEffect(() => {
    const validateAuth = async () => {
      // First quick local check
      const localAuth = isAuthenticated();
      setAuthenticated(localAuth);

      // Then validate with server if locally authenticated
      if (localAuth) {
        const serverValid = await validateTokenWithServer();
        setAuthenticated(serverValid);

        if (serverValid) {
          fetchUserData();
        } else {
          // Clear cached user data when authentication fails
          if (typeof window !== 'undefined') {
            localStorage.removeItem('navbarUser');
          }
          setUser(null);
        }
      }
    };

    validateAuth();
  }, [pathname]); // Re-validate on pathname change

  const fetchUserData = async () => {
    try {
      const response = await authApi.getMe();
      const userData = response.user;
      setUser(userData);

      // Persist user data to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('navbarUser', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      // Keep the localStorage cached version on error
    }
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-user-menu]')) {
          setUserMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const handleLogout = () => {
    removeToken();
    setAuthenticated(false);
    setUser(null);
    // Clear cached user data from localStorage on explicit logout
    if (typeof window !== 'undefined') {
      localStorage.removeItem('navbarUser');
      localStorage.removeItem('dashboardUser');
    }
    router.push('/');
  };

  const getAuthButtons = () => {
    if (authenticated === null) {
      // Return empty div during hydration to prevent mismatch
      return <div className="flex items-center space-x-3"></div>;
    }

    if (authenticated && user) {
      return (
        <div className="relative" data-user-menu>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center space-x-2 sm:space-x-3 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors bg-white dark:bg-gray-800 rounded-lg px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600"
          >
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span className="hidden sm:inline font-medium">
                {user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.email || 'User'}
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black dark:ring-gray-700 ring-opacity-5 z-50">
              <div className="py-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    router.push('/dashboard');
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    router.push('/account');
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <User className="h-4 w-4 mr-2" />
                  Account
                </button>
                {user.isAdmin && (
                  <>
                    <hr className="border-gray-100 dark:border-gray-700" />
                    <Link
                      href="/admin"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center w-full px-4 py-2 text-sm text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Admin Dashboard
                    </Link>
                  </>
                )}
                <hr className="border-gray-100 dark:border-gray-700" />
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 sm:space-x-3">
        {pathname !== '/login' && (
          <Link
            href="/login"
            className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Sign In"
          >
            <LogIn className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign In</span>
          </Link>
        )}
        {pathname !== '/register' && (
          <Link
            href="/register"
            className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
            title="Sign Up"
          >
            <UserPlus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign Up</span>
          </Link>
        )}
      </div>
    );
  };

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - App name */}
          <Link href="/" className="flex items-center group">
            <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-600 dark:text-indigo-400 mr-2 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors" />
            <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              <span className="hidden xs:inline">Resume Creator</span>
              <span className="xs:hidden">Resume</span>
            </span>
          </Link>

          {/* Right side - Theme toggle and user menu/auth buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <ThemeToggle />
            {getAuthButtons()}
          </div>
        </div>
      </div>
    </nav>
  );
}
