import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import campusBg from '../../assets/images/vidya_academic_campus_bg.svg';
import { VidyaLogo } from '../../components/common/VidyaLogo';
import {
  Lock,
  User,
  Mail,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  Check,
  Inbox,
} from 'lucide-react';

interface SignupViewProps {
  onBackToLanding?: () => void;
  onGoToLogin: () => void;
}

export const SignupView: React.FC<SignupViewProps> = ({ onBackToLanding, onGoToLogin }) => {
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const validateInputs = (): string | null => {
    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return 'Please enter your full legal or institutional name (at least 2 characters).';
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      return 'Please enter a valid email address.';
    }

    if (!password) {
      return 'Please create a secure password.';
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters long (Supabase security requirement).';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match. Please verify both password fields.';
    }

    return null;
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validationError = validateInputs();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(fullName.trim(), email.trim(), password);
      setLoading(false);

      if (result.success) {
        if (result.needsEmailConfirmation) {
          setSubmittedEmail(email.trim());
          setEmailConfirmationRequired(true);
        }
        // If session was returned immediately (auto-confirm enabled), AuthContext sets the user and routes automatically
      } else {
        setErrorMessage(result.error || 'Failed to create account. Please check your credentials.');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message || 'An unexpected registration error occurred. Please try again.');
    }
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
          {emailConfirmationRequired ? (
            /* Email Confirmation Required Screen */
            <div className="py-4 text-center space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-200">
                <Inbox className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">Verify Your Email Address</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  A verification email has been dispatched by Supabase to:
                </p>
                <p className="text-xs font-mono font-bold text-blue-700 mt-1 bg-blue-50 py-1.5 px-3 rounded-xl border border-blue-100 break-all">
                  {submittedEmail}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Next Steps:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                  <li>Check your inbox (and spam folder) for the confirmation message.</li>
                  <li>Click the confirmation link to activate your Supabase account.</li>
                  <li>Return here to sign in with your email and password.</li>
                </ol>
              </div>

              <button
                type="button"
                onClick={onGoToLogin}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Registration Form */
            <>
              {/* Mode Toggle Header */}
              <div className="flex items-center rounded-xl bg-slate-100 p-1 mb-5">
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="flex-1 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className="flex-1 py-1.5 text-xs font-bold text-blue-700 bg-white shadow-xs rounded-lg cursor-default"
                >
                  Create Account
                </button>
              </div>

              <div className="mb-5 text-center">
                <h2 className="text-base font-bold text-slate-900">Create Your VIDYA Account</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register with your email and password for Supabase authentication.
                </p>
              </div>

              {/* Alert Messages */}
              {errorMessage && (
                <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Sign Up Form */}
              <form className="space-y-3.5" onSubmit={handleSignUpSubmit}>
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      className="block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. scholar@institution.edu"
                      className="block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
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
                  {password && password.length < 6 && (
                    <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1 font-medium">
                      <span>Password must be $\ge 6$ characters.</span>
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="block w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                      <span>Passwords do not match.</span>
                    </p>
                  )}
                  {confirmPassword && confirmPassword === password && (
                    <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                      <Check className="w-3.5 h-3.5" />
                      <span>Passwords match.</span>
                    </p>
                  )}
                </div>

                {/* Security and RBAC Disclaimer */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Role Assignment Notice</span>
                  </div>
                  <p className="leading-tight">
                    New accounts receive Student status or pending authorization. Administrative privileges are never granted automatically and require explicit verification by an institutional director.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md shadow-blue-500/20 transition-all disabled:opacity-70 cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating Account...
                      </span>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Bottom Navigation */}
              <div className="mt-5 pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={onGoToLogin}
                    className="font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                  >
                    Sign In to your portal
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
