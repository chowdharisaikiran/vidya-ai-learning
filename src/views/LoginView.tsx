import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import campusBg from '../assets/images/vidya_academic_campus_bg.svg';
import { VidyaLogo } from '../components/common/VidyaLogo';
import {
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { apiUrl } from '../lib/apiConfig';

interface LoginViewProps {
  onBackToLanding?: () => void;
  onGoToSignup?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onBackToLanding, onGoToSignup }) => {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMessage('Please enter your registered email address or institutional username.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await login(cleanUsername, password);
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);

    try {
      await fetch(apiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
    } catch {
      // ignore
    }

    setForgotLoading(false);
    setForgotSubmitted(true);
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8 overflow-hidden selection:bg-blue-600 selection:text-white bg-slate-50 font-sans">
      {/* Light Academic Campus Background Image */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <img
          src={campusBg}
          alt="VIDYA Academic Campus & AI Learning Analytics Environment"
          className="w-full h-full object-cover object-center"
        />
        {/* Daylight scrim ensuring pristine readability and vibrant light atmosphere */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-100/80 via-transparent to-white/70" />
      </div>

      {/* Main container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {onBackToLanding && (
          <div className="mb-4">
            <button
              onClick={onBackToLanding}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white/90 hover:bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 transition-all cursor-pointer shadow-xs backdrop-blur-md"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-blue-600" />
              <span>Back to Overview</span>
            </button>
          </div>
        )}

        {/* Branding */}
        <div className="text-center flex flex-col items-center">
          <VidyaLogo
            size="lg"
            variant="default"
            showText={true}
            showTagline={true}
            tagline="Learn Smarter. Grow Better."
            className="flex-col !gap-2"
          />
          <p className="mt-2 text-xs text-slate-600 max-w-sm mx-auto font-normal leading-relaxed">
            Personalized learning profiles, predictive academic intelligence, and student analytics.
          </p>
        </div>

        {/* Card */}
        <div className="mt-6 bg-white/95 backdrop-blur-xl py-7 px-6 shadow-xl shadow-slate-900/10 rounded-3xl border border-slate-200/80 sm:px-9">
          {/* Mode Toggle Header if onGoToSignup provided */}
          {onGoToSignup && (
            <div className="flex items-center rounded-xl bg-slate-100 p-1 mb-5">
              <button
                type="button"
                className="flex-1 py-1.5 text-xs font-bold text-blue-700 bg-white shadow-xs rounded-lg cursor-default"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={onGoToSignup}
                className="flex-1 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              >
                Create Account
              </button>
            </div>
          )}

          <div className="mb-5 text-center">
            <h2 className="text-base font-bold text-slate-900">Sign In to VIDYA</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your email or institutional credentials to access your portal.
            </p>
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Sign In Form */}
          <form className="space-y-4" onSubmit={handleSignInSubmit}>
            <div>
              <label htmlFor="username" className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Address or Username
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. scholar@vidya.edu or username"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotSubmitted(false);
                    setForgotEmail('');
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md shadow-blue-500/20 transition-all disabled:opacity-70 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing In...
                  </span>
                ) : (
                  <>
                    <span>Sign In to VIDYA</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Create Account Link */}
          {onGoToSignup && (
            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-600">
                New to VIDYA?{' '}
                <button
                  type="button"
                  onClick={onGoToSignup}
                  className="font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  Create an Account
                </button>
              </p>
            </div>
          )}


          {/* Public AI assessment callout for visitors */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Public Study Assessment</span>
            </span>
            <span className="text-[11px] text-blue-600 font-semibold">
              Available to everyone (bottom-right ↘)
            </span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Reset Account Password</h3>
              <button
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {forgotSubmitted ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Reset Instructions Dispatched</h4>
                <p className="text-xs text-slate-600">
                  A verification token has been routed to <b>{forgotEmail}</b>. Follow the secure link to update your credentials.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="mt-2 w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="mt-4 space-y-4">
                <p className="text-xs text-slate-600">
                  Enter your registered institutional email address. VIDYA will dispatch a secure reset token.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Institutional Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. aarav.sharma@vidya.edu"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
                  >
                    {forgotLoading ? 'Dispatching...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
