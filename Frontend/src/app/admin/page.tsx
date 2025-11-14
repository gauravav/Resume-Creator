'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  User,
  LogOut,
  ChevronDown,
  CheckCircle,
  XCircle,
  RotateCcw,
  Users,
  Zap,
  Clock,
  UserCheck,
  UserX,
  AlertCircle,
  FileCode
} from 'lucide-react';
import { authApi, getApiBaseUrl } from '@/lib/api';
import { removeToken, isAuthenticatedWithValidation } from '@/lib/auth';
import Layout from '@/components/Layout';
import ThemeToggle from '@/components/ThemeToggle';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  pendingApproval: number;
  rejectedUsers: number;
  totalTokensUsed: number;
}

interface PendingUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  approval_requested_at: string;
  created_at: string;
}

interface UserWithStats {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  email_verified: boolean;
  admin_approved: boolean;
  account_status: string;
  created_at: string;
  approved_at?: string;
  total_tokens_used: string;
  total_operations: string;
}

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(true);
  const [user, setUser] = useState<{id: number; email: string; firstName: string; lastName: string; isAdmin: boolean} | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [allUsers, setAllUsers] = useState<UserWithStats[]>([]);
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    userId: number | null;
    userName: string;
  }>({
    isOpen: false,
    userId: null,
    userName: ''
  });
  const [rejectReason, setRejectReason] = useState('');
  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({});

  const router = useRouter();

  const loadDashboardData = useCallback(async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      
      const API_BASE_URL = getApiBaseUrl();
      
      const response = await fetch(`${API_BASE_URL}/api/admin/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setPendingUsers(data.pendingUsers);
      } else {
        setError('Failed to load dashboard data');
      }

      // Load all users
      const usersResponse = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setAllUsers(usersData.users);
      }
    } catch {
      setError('Network error loading dashboard');
    }
  }, []);

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
        
        // Check if user is admin (from backend)
        if (!userData.user.isAdmin) {
          router.push('/dashboard');
          return;
        }

        await loadDashboardData();
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
  }, [router, loadDashboardData]);

  const handleApproveUser = async (userId: number) => {
    setLoadingStates(prev => ({ ...prev, [`approve-${userId}`]: true }));
    
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      
      const API_BASE_URL = getApiBaseUrl();
      
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess('User approved successfully!');
        await loadDashboardData();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to approve user');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoadingStates(prev => ({ ...prev, [`approve-${userId}`]: false }));
    }
  };

  const handleRejectUser = async () => {
    if (!rejectModal.userId || !rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setLoadingStates(prev => ({ ...prev, [`reject-${rejectModal.userId}`]: true }));
    
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      
      const API_BASE_URL = getApiBaseUrl();
      
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${rejectModal.userId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason })
      });

      if (response.ok) {
        setSuccess('User rejected successfully!');
        setRejectModal({ isOpen: false, userId: null, userName: '' });
        setRejectReason('');
        await loadDashboardData();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to reject user');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoadingStates(prev => ({ ...prev, [`reject-${rejectModal.userId}`]: false }));
    }
  };

  const handleResetTokens = async (userId: number) => {
    if (!confirm('Are you sure you want to reset this user\'s token count to zero?')) {
      return;
    }

    setLoadingStates(prev => ({ ...prev, [`reset-${userId}`]: true }));
    
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      
      const API_BASE_URL = getApiBaseUrl();
      
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/reset-tokens`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`User tokens reset successfully! Previous count: ${data.previousTokenCount}`);
        await loadDashboardData();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const responseData = await response.json();
        setError(responseData.error || 'Failed to reset tokens');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoadingStates(prev => ({ ...prev, [`reset-${userId}`]: false }));
    }
  };

  const handleLogout = () => {
    removeToken();
    router.push('/');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      pending_approval: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
      pending_verification: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
      rejected: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes[status as keyof typeof classes] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (isValidating || isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white text-sm">
              {isValidating ? 'Validating admin access...' : 'Loading admin dashboard...'}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNav={false}>
      <div className="min-h-screen">
        {/* Custom Header */}
        <div className="relative z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="pt-8 pb-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <Link href="/" className="flex items-center group">
                    <FileText className="h-8 w-8 text-indigo-400 dark:text-indigo-300 mr-2 group-hover:text-indigo-300 dark:group-hover:text-indigo-200 transition-colors" />
                    <span className="text-xl font-bold text-white group-hover:text-indigo-100 transition-colors">Resume Creator</span>
                  </Link>
                  <div className="hidden sm:block">
                    <span className="bg-purple-500 dark:bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Admin Dashboard
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <ThemeToggle />
                  {user && (
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center space-x-3 text-white hover:text-indigo-200 transition-colors bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20"
                    >
                      <div className="flex items-center space-x-2">
                        <User className="h-5 w-5" />
                        <span className="font-medium">{user.firstName} {user.lastName}</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1">
                          <Link
                            href="/dashboard"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <User className="h-4 w-4 mr-2" />
                            User Dashboard
                          </Link>
                          <hr className="border-gray-100" />
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              handleLogout();
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </div>
            </nav>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Messages */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md p-4 mb-6">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-md p-4 mb-6">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                <p className="text-green-700 dark:text-green-400 text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-500 dark:text-blue-400 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <UserCheck className="h-8 w-8 text-green-500 dark:text-green-400 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeUsers}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Active Users</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-500 dark:text-yellow-400 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingApproval}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <UserX className="h-8 w-8 text-red-500 dark:text-red-400 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.rejectedUsers}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Rejected</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Zap className="h-8 w-8 text-purple-500 dark:text-purple-400 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTokensUsed.toLocaleString()}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Tokens</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Admin Tools */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg mb-8 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileCode className="h-8 w-8 text-white mr-3" />
                  <div>
                    <h3 className="text-lg font-medium text-white">LaTeX to PDF Test Tool</h3>
                    <p className="text-indigo-100 text-sm">Test LaTeX conversion functionality</p>
                  </div>
                </div>
                <Link
                  href="/admin/latex-test"
                  className="inline-flex items-center px-4 py-2 border border-white text-sm font-medium rounded-md text-white hover:bg-white hover:text-indigo-600 transition-colors"
                >
                  Open Tool
                </Link>
              </div>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Pending User Approvals</h2>
            </div>
            <div className="overflow-x-auto">
              {pendingUsers.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Clock className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No pending approvals</h3>
                  <p className="text-gray-500 dark:text-gray-400">All users have been processed.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Requested</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {pendingUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.first_name} {user.last_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">{formatDate(user.approval_requested_at)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleApproveUser(user.id)}
                            disabled={loadingStates[`approve-${user.id}`]}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                          >
                            {loadingStates[`approve-${user.id}`] ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectModal({
                              isOpen: true,
                              userId: user.id,
                              userName: `${user.first_name} ${user.last_name}`
                            })}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* All Users */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">All Users</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tokens Used</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {allUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.first_name} {user.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user.account_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {parseInt(user.total_tokens_used || '0').toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{formatDate(user.created_at)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {parseInt(user.total_tokens_used || '0') > 0 && (
                          <button
                            onClick={() => handleResetTokens(user.id)}
                            disabled={loadingStates[`reset-${user.id}`]}
                            className="inline-flex items-center px-2 py-1 border border-red-300 rounded text-red-700 hover:bg-red-50 disabled:opacity-50"
                            title="Reset user's token count to zero"
                          >
                            {loadingStates[`reset-${user.id}`] ? (
                              <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Reject Modal */}
        {rejectModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Reject User: {rejectModal.userName}
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for rejection:
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                  placeholder="Please provide a reason for rejection..."
                />
              </div>
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => {
                    setRejectModal({ isOpen: false, userId: null, userName: '' });
                    setRejectReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectUser}
                  disabled={loadingStates[`reject-${rejectModal.userId}`] || !rejectReason.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {loadingStates[`reject-${rejectModal.userId}`] ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Reject User
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}