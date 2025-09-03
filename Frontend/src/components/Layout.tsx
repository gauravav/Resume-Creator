'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { FileText, LogIn, UserPlus, Home, LayoutDashboard, LogOut } from 'lucide-react';
import { isAuthenticated, validateTokenWithServer, removeToken } from '@/lib/auth';

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export default function Layout({ children, showNav = true }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const validateAuth = async () => {
      // First quick local check
      const localAuth = isAuthenticated();
      setAuthenticated(localAuth);
      
      // Then validate with server if locally authenticated
      if (localAuth) {
        const serverValid = await validateTokenWithServer();
        setAuthenticated(serverValid);
      }
    };
    
    validateAuth();
  }, []);

  const handleLogout = () => {
    removeToken();
    setAuthenticated(false);
    router.push('/');
  };

  const getNavButtons = () => {
    if (authenticated === null) {
      // Return empty div during hydration to prevent mismatch
      return <div className="flex space-x-4"></div>;
    }

    if (authenticated) {
      return (
        <div className="flex space-x-4">
          {pathname !== '/dashboard' && (
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white/90 backdrop-blur-sm hover:bg-white/95 transition-all"
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          )}
          {pathname !== '/parse-resume' && (
            <Link
              href="/parse-resume"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
            >
              <FileText className="h-4 w-4 mr-2" />
              New Resume
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white/90 backdrop-blur-sm hover:bg-red-50/95 transition-all"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </button>
        </div>
      );
    }

    return (
      <div className="flex space-x-4">
        {pathname !== '/' && (
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white/90 backdrop-blur-sm hover:bg-white/95 transition-all"
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Link>
        )}
        {pathname !== '/login' && (
          <Link
            href="/login"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white/90 backdrop-blur-sm hover:bg-white/95 transition-all"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Link>
        )}
        {pathname !== '/register' && (
          <Link
            href="/register"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Sign Up
          </Link>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Magical Background Styles */}
      <style jsx global>{`
        @keyframes resumeFloat {
          0%, 100% {
            transform: translateY(0px) rotate(var(--rotation));
          }
          50% {
            transform: translateY(-20px) rotate(calc(var(--rotation) + 5deg));
          }
        }

        @keyframes resumeMorph {
          0% {
            opacity: 1;
            transform: scale(1) rotate(var(--rotation));
          }
          25% {
            opacity: 0.7;
            transform: scale(1.05) rotate(calc(var(--rotation) + 3deg));
          }
          50% {
            opacity: 0.9;
            transform: scale(0.98) rotate(calc(var(--rotation) - 2deg));
          }
          75% {
            opacity: 0.8;
            transform: scale(1.02) rotate(calc(var(--rotation) + 1deg));
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(var(--rotation));
          }
        }

        @keyframes particleFloat {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.6;
          }
          33% {
            transform: translateY(-30px) translateX(20px);
            opacity: 1;
          }
          66% {
            transform: translateY(10px) translateX(-15px);
            opacity: 0.8;
          }
        }

        @keyframes colorShift {
          0%, 100% {
            filter: hue-rotate(0deg) brightness(1);
          }
          25% {
            filter: hue-rotate(45deg) brightness(1.1);
          }
          50% {
            filter: hue-rotate(90deg) brightness(0.9);
          }
          75% {
            filter: hue-rotate(135deg) brightness(1.05);
          }
        }

        .resume-template {
          animation: resumeFloat 8s ease-in-out infinite, resumeMorph 12s ease-in-out infinite, colorShift 15s ease-in-out infinite;
          backdrop-filter: blur(1px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .resume-1 {
          --rotation: 12deg;
          animation-delay: 0s, 0s, 0s;
        }

        .resume-2 {
          --rotation: -6deg;
          animation-delay: 2s, 3s, 2.5s;
        }

        .resume-3 {
          --rotation: 3deg;
          animation-delay: 4s, 6s, 5s;
        }

        .resume-4 {
          --rotation: -12deg;
          animation-delay: 6s, 9s, 7.5s;
        }

        .particle {
          animation: particleFloat 6s ease-in-out infinite;
        }

        .particle-1 {
          top: 20%;
          left: 15%;
          animation-delay: 0s;
        }

        .particle-2 {
          top: 60%;
          right: 20%;
          animation-delay: 2s;
        }

        .particle-3 {
          bottom: 30%;
          left: 25%;
          animation-delay: 1s;
        }

        .particle-4 {
          top: 80%;
          right: 40%;
          animation-delay: 3s;
        }

        .particle-5 {
          top: 40%;
          left: 70%;
          animation-delay: 1.5s;
        }
      `}</style>

      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800"></div>
      
      {/* Floating Orbs */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255,255,255,0.1) 2px, transparent 0)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Magical Resume Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Resume Template 1 - Classic */}
        <div className="resume-template resume-1 absolute top-20 right-10 w-48 h-64 bg-white rounded-lg shadow-lg transform rotate-12 opacity-80">
          <div className="p-4 space-y-2">
            <div className="h-3 bg-gray-800 rounded w-3/4"></div>
            <div className="h-2 bg-gray-400 rounded w-1/2"></div>
            <div className="h-1 bg-gray-300 rounded w-full mt-3"></div>
            <div className="h-1 bg-gray-300 rounded w-4/5"></div>
            <div className="h-1 bg-gray-300 rounded w-3/4"></div>
            <div className="h-2 bg-indigo-500 rounded w-2/3 mt-4"></div>
            <div className="h-1 bg-gray-300 rounded w-full"></div>
            <div className="h-1 bg-gray-300 rounded w-5/6"></div>
            <div className="h-2 bg-indigo-500 rounded w-1/2 mt-4"></div>
            <div className="h-1 bg-gray-300 rounded w-full"></div>
            <div className="h-1 bg-gray-300 rounded w-3/4"></div>
          </div>
        </div>

        {/* Resume Template 2 - Modern */}
        <div className="resume-template resume-2 absolute top-32 left-16 w-48 h-64 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow-lg transform -rotate-6 opacity-70">
          <div className="p-4 space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-purple-500 rounded-full"></div>
              <div className="h-2 bg-gray-800 rounded w-1/2"></div>
            </div>
            <div className="h-1 bg-gray-400 rounded w-1/3"></div>
            <div className="border-t border-purple-200 mt-3 pt-2">
              <div className="h-1 bg-purple-400 rounded w-1/4 mb-2"></div>
              <div className="h-1 bg-gray-300 rounded w-full"></div>
              <div className="h-1 bg-gray-300 rounded w-4/5"></div>
            </div>
            <div className="border-t border-purple-200 mt-3 pt-2">
              <div className="h-1 bg-purple-400 rounded w-1/3 mb-2"></div>
              <div className="h-1 bg-gray-300 rounded w-full"></div>
              <div className="h-1 bg-gray-300 rounded w-5/6"></div>
            </div>
          </div>
        </div>

        {/* Resume Template 3 - Creative */}
        <div className="resume-template resume-3 absolute bottom-32 right-20 w-48 h-64 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg shadow-lg transform rotate-3 opacity-75">
          <div className="p-4">
            <div className="border-l-4 border-cyan-500 pl-3 mb-4">
              <div className="h-3 bg-gray-800 rounded w-3/4 mb-1"></div>
              <div className="h-2 bg-cyan-500 rounded w-1/2"></div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="h-1 bg-gray-300 rounded"></div>
              <div className="h-1 bg-gray-300 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                <div className="h-1 bg-gray-300 rounded w-3/4"></div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                <div className="h-1 bg-gray-300 rounded w-2/3"></div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                <div className="h-1 bg-gray-300 rounded w-4/5"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Resume Template 4 - Minimalist */}
        <div className="resume-template resume-4 absolute bottom-20 left-12 w-48 h-64 bg-white rounded-lg shadow-lg transform -rotate-12 opacity-60">
          <div className="p-4 space-y-3">
            <div className="text-center border-b border-gray-200 pb-3">
              <div className="h-2 bg-gray-800 rounded w-2/3 mx-auto mb-2"></div>
              <div className="h-1 bg-gray-400 rounded w-1/2 mx-auto"></div>
            </div>
            <div className="space-y-2">
              <div className="h-1 bg-gray-600 rounded w-1/4"></div>
              <div className="h-1 bg-gray-300 rounded w-full"></div>
              <div className="h-1 bg-gray-300 rounded w-5/6"></div>
              <div className="h-1 bg-gray-600 rounded w-1/4 mt-3"></div>
              <div className="h-1 bg-gray-300 rounded w-full"></div>
              <div className="h-1 bg-gray-300 rounded w-3/4"></div>
            </div>
          </div>
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0">
          <div className="particle particle-1 absolute w-2 h-2 bg-indigo-400 rounded-full opacity-60"></div>
          <div className="particle particle-2 absolute w-1 h-1 bg-purple-400 rounded-full opacity-80"></div>
          <div className="particle particle-3 absolute w-1.5 h-1.5 bg-cyan-400 rounded-full opacity-70"></div>
          <div className="particle particle-4 absolute w-1 h-1 bg-pink-400 rounded-full opacity-60"></div>
          <div className="particle particle-5 absolute w-2 h-2 bg-yellow-400 rounded-full opacity-50"></div>
        </div>
      </div>

      {/* Navigation Bar */}
      {showNav && (
        <div className="relative z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="pt-8 pb-6">
              <div className="flex justify-between items-center">
                <Link href="/" className="flex items-center group">
                  <FileText className="h-8 w-8 text-indigo-400 mr-2 group-hover:text-indigo-300 transition-colors" />
                  <span className="text-xl font-bold text-white group-hover:text-indigo-100 transition-colors">Resume Creator</span>
                </Link>
                {getNavButtons()}
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}