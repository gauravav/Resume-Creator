'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  Zap,
  Calendar,
  Clock,
  FileText,
  Sparkles,
  Edit,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Activity,
  BarChart3
} from 'lucide-react';
import { tokenApi, accountApi, TokenStats, TokenHistory } from '@/lib/api';
import { isAuthenticatedWithValidation } from '@/lib/auth';
import { formatDateTime } from '@/lib/timezone';
import Layout from '@/components/Layout';

export default function TokenHistoryPage() {
  const [history, setHistory] = useState<TokenHistory | null>(null);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [userTimezone, setUserTimezone] = useState<string>('UTC');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  useEffect(() => {
    const validateAndLoad = async () => {
      try {
        const isValid = await isAuthenticatedWithValidation();
        if (!isValid) {
          router.push('/login');
          return;
        }

        // Fetch user profile to get timezone
        const profileResponse = await accountApi.getProfile();
        if (profileResponse.data && profileResponse.data.timezone) {
          setUserTimezone(profileResponse.data.timezone);
        }

        await Promise.all([
          fetchTokenHistory(1),
          fetchTokenStats()
        ]);
      } catch (error) {
        console.error('Token validation error:', error);
        setError('Authentication failed. Please login again.');
        setTimeout(() => router.push('/login'), 2000);
      } finally {
        setIsLoading(false);
      }
    };

    validateAndLoad();
  }, [router]);

  const fetchTokenHistory = async (page: number) => {
    try {
      const response = await tokenApi.getTokenHistory(page, 20);
      setHistory(response.data);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to fetch token history:', error);
      setError('Failed to load token usage history');
    }
  };

  const fetchTokenStats = async () => {
    try {
      const response = await tokenApi.getUsageStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch token stats:', error);
    }
  };

  const handlePageChange = (page: number) => {
    fetchTokenHistory(page);
  };

  const formatDate = (dateString: string): string => {
    return formatDateTime(dateString, userTimezone);
  };

  const getOperationIcon = (operationType: string) => {
    switch (operationType) {
      case 'resume_parsing':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'resume_customization':
        return <Sparkles className="h-4 w-4 text-green-500" />;
      case 'responsibility_rewrite':
        return <Edit className="h-4 w-4 text-purple-500" />;
      case 'reset':
        return <RotateCcw className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getOperationLabel = (operationType: string) => {
    switch (operationType) {
      case 'resume_parsing':
        return 'Resume Parsing';
      case 'resume_customization':
        return 'Resume Customization';
      case 'responsibility_rewrite':
        return 'Responsibility Rewrite';
      case 'reset':
        return 'Token Reset';
      default:
        return operationType;
    }
  };

  const getOperationDescription = (operationType: string, metadata: Record<string, unknown>) => {
    switch (operationType) {
      case 'resume_parsing':
        return `Parsed resume document (${metadata?.input_length || 0} chars)`;
      case 'resume_customization':
        return `Customized resume for job (${metadata?.job_description_length || 0} char job desc)`;
      case 'responsibility_rewrite':
        return `Rewrote responsibility bullet point`;
      case 'reset':
        return 'Reset token count to zero';
      default:
        return `${operationType} operation`;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white text-sm">Loading token usage history...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                Back to Dashboard
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
              <Zap className="h-8 w-8 text-yellow-500 mr-3" />
              Token Usage History
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Track your API usage and token consumption across all operations.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md p-4 mb-6">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.totalTokens.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Tokens Used</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.operationStats.length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Operation Types</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.dailyStats.length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Active Days</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Operation Breakdown */}
          {stats && stats.operationStats.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <BarChart3 className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                  Usage by Operation Type
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {stats.operationStats.map((stat, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                      <div className="flex items-center">
                        {getOperationIcon(stat.operation_type)}
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {getOperationLabel(stat.operation_type)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {stat.operation_count} operations
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {parseInt(stat.total_tokens).toLocaleString()} tokens
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.round(parseInt(stat.avg_tokens))} avg per operation
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Usage History */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                Recent Usage History
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {!history || history.history.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Zap className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No usage history yet</h3>
                  <p className="text-gray-500 dark:text-gray-400">Start using the resume tools to see your token usage here.</p>
                </div>
              ) : (
                <>
                  {history.history.map((usage) => (
                    <div key={usage.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {getOperationIcon(usage.operation_type)}
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                              {getOperationLabel(usage.operation_type)}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {getOperationDescription(usage.operation_type, usage.metadata)}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {formatDate(usage.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            usage.tokens_used > 0
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                          }`}>
                            {usage.tokens_used > 0
                              ? `${usage.tokens_used.toLocaleString()} tokens`
                              : 'Reset'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {history && history.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <span>
                            Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, history.total)} of {history.total} entries
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="inline-flex items-center p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Page {currentPage} of {history.totalPages}
                          </span>
                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= history.totalPages}
                            className="inline-flex items-center p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}