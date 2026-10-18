import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, isManager, isDispatcher, isTechnician, isCustomer } = useAuth();
  const [countdown, setCountdown] = useState(5);
  const [autoRedirectPaused, setAutoRedirectPaused] = useState(false);

  const getTargetDashboard = () => {
    if (!isAuthenticated || !user) return '/login';
    if (isManager() || isDispatcher()) return '/dashboard';
    if (isTechnician()) return '/technician';
    if (isCustomer()) return '/portal';
    return '/login';
  };

  const getRoleDisplayName = () => {
    if (!user || !user.roles || user.roles.length === 0) return 'Guest';
    return user.roles.map(r => r.replace('ROLE_', '')).join(', ');
  };

  const targetPath = getTargetDashboard();

  useEffect(() => {
    if (autoRedirectPaused) return;

    if (countdown <= 0) {
      navigate(targetPath, { replace: true });
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, autoRedirectPaused, navigate, targetPath]);

  const handleGoToDashboard = () => {
    navigate(targetPath, { replace: true });
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-2">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-6xl font-black text-red-500 dark:text-red-400 tracking-tight mb-2">403</h1>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You don't have permission to view this page or perform this action.
          </p>
        </div>

        {isAuthenticated && user && (
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
            Signed in as <strong className="text-gray-800 dark:text-gray-100">{user.email}</strong> ({getRoleDisplayName()})
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button
            onClick={handleGoToDashboard}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home Dashboard
          </button>

          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out / Switch User
            </button>
          )}
        </div>

        {!autoRedirectPaused && (
          <div className="text-xs text-gray-400 pt-2 flex items-center justify-center gap-2">
            <span>Redirecting to home in <strong>{countdown}s</strong>...</span>
            <button
              onClick={() => setAutoRedirectPaused(true)}
              className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              Pause
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
