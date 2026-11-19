import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Activity, Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/FormControls';
import { AlertBanner } from '../../components/common/AlertBanner';
import { StatusIndicator } from '../../components/common/StatusIndicator';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already authenticated, redirect to dashboard
  if (isAuthenticated && !authLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Please provide both username and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      // On success, redirect to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { non_field_errors?: string[]; detail?: string } };
      };
      const detail =
        axiosError.response?.data?.non_field_errors?.[0] ||
        axiosError.response?.data?.detail ||
        'Authentication failed. Please verify your username and password.';
      setErrorMessage(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle background landscape image with dark overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none"
        style={{ backgroundImage: 'url(/images/hero-landscape.svg)' }}
      />

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-teal-400 mx-auto shadow-md">
            <Activity className="w-6 h-6 text-teal-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            PlateauCare <span className="text-teal-600">Intelligence</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Authorized Public Health Officer & Reporter Portal
          </p>
          <div className="pt-1 flex justify-center">
            <StatusIndicator status="operational" size="sm" label="Token Authentication Active" />
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl p-8 space-y-6">
          {errorMessage && (
            <AlertBanner
              type="danger"
              title="Sign In Error"
              message={errorMessage}
              onDismiss={() => setErrorMessage(null)}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              type="text"
              required
              autoComplete="username"
              placeholder="Enter your system username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              leftIcon={<User className="w-4 h-4 text-slate-400" />}
            />

            <div className="space-y-1">
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                Password <span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="block w-full rounded-lg text-sm border border-slate-300 hover:border-slate-400 focus:border-teal-600 focus:ring-teal-100 pl-9 pr-10 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-3 transition-colors disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isSubmitting}
            >
              Sign In to Portal
            </Button>
          </form>

          {/* Security Notice */}
          <div className="pt-4 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This system is restricted to authorized public health personnel in Plateau State. All authentication sessions are tokenized and access-controlled.
            </p>
          </div>
        </div>

        {/* System Administration Link */}
        <div className="text-center text-xs text-slate-500">
          <span>System Administrator? </span>
          <a
            href="/admin/"
            target="_blank"
            rel="noreferrer"
            className="text-teal-700 font-semibold hover:underline"
          >
            Access Django Administration
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
