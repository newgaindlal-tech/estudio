'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  GraduationCap,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Mail,
  Lock,
  Building2,
  BookOpen,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('1');

  // Interactive UI State
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isPasswordValid = password.length >= 6;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isPasswordValid) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : '/auth/callback';

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            college_name: collegeName.trim(),
            department: department.trim(),
            semester: parseInt(semester, 10),
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      } else {
        setSuccessMsg('Account registered successfully! Redirecting to workspace...');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred during account creation.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-canvas-base flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 selection:bg-brand-500 selection:text-white select-none">
      
      {/* Brand & Context Header */}
      <div className="w-full max-w-md mx-auto text-center mb-6 sm:mb-8">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-sm shadow-brand-glow mb-4">
          <GraduationCap className="w-7 h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
          Create your Estudio Account
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-content-secondary">
          Already have an institutional profile?{' '}
          <Link
            href="/login"
            className="font-semibold text-brand-400 hover:text-brand-300 focus-visible:outline-none focus-visible:underline transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Surface Card Container */}
      <div className="w-full max-w-md mx-auto">
        <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-5 sm:p-7 shadow-elevated transition-all">
          
          {/* Error Banner */}
          {errorMsg && (
            <div
              id="signup-error"
              role="alert"
              className="mb-4 bg-status-danger-bg border border-status-danger/40 text-rose-300 px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-150 shadow-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-status-danger" />
              <div className="leading-snug font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div
              role="status"
              className="mb-4 bg-status-success-bg border border-status-success/40 text-emerald-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in duration-150 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-status-success" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSignUp} noValidate>
            
            {/* Section 1: Personal & Credentials */}
            <div className="space-y-3.5">
              <span className="text-2xs font-bold text-content-muted tracking-wider uppercase block">
                Account Credentials
              </span>

              {/* Full Name */}
              <div>
                <label
                  htmlFor="full-name"
                  className="block text-xs font-semibold text-content-secondary mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-content-muted">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    disabled={loading || Boolean(successMsg)}
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-canvas-surface border border-canvas-border text-content-primary text-sm placeholder:text-content-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-content-secondary mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-content-muted">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    disabled={loading || Boolean(successMsg)}
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-canvas-surface border border-canvas-border text-content-primary text-sm placeholder:text-content-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-content-secondary mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-content-muted">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    disabled={loading || Boolean(successMsg)}
                    className="w-full h-11 pl-10 pr-10 rounded-xl bg-canvas-surface border border-canvas-border text-content-primary text-sm placeholder:text-content-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-content-muted hover:text-content-primary transition-colors focus-visible:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 text-2xs">
                  <div
                    className={`w-4 h-4 rounded-lg flex items-center justify-center border transition-all ${
                      isPasswordValid
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 font-semibold'
                        : 'border-canvas-border bg-canvas-surface text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                  </div>
                  <span className={isPasswordValid ? 'text-emerald-400 font-semibold' : 'text-content-muted'}>
                    At least 6 characters
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Academic Profile */}
            <div className="pt-3 border-t border-canvas-border space-y-3.5">
              <span className="text-2xs font-bold text-content-muted tracking-wider uppercase block">
                Academic Profile
              </span>

              {/* Department & Semester Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="department"
                    className="block text-xs font-semibold text-content-secondary mb-1.5"
                  >
                    Department
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-content-muted">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <input
                      id="department"
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Enter your department"
                      disabled={loading || Boolean(successMsg)}
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-canvas-surface border border-canvas-border text-content-primary text-sm placeholder:text-content-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="semester"
                    className="block text-xs font-semibold text-content-secondary mb-1.5"
                  >
                    Current Semester
                  </label>
                  <select
                    id="semester"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    disabled={loading || Boolean(successMsg)}
                    className="w-full h-11 px-3.5 rounded-xl bg-canvas-surface border border-canvas-border text-content-primary text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 transition-all cursor-pointer shadow-inner"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem} className="bg-canvas-surface text-content-primary">
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* College / Institution */}
              <div>
                <label
                  htmlFor="college-name"
                  className="block text-xs font-semibold text-content-secondary mb-1.5"
                >
                  Institution / College
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-content-muted">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    id="college-name"
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="Enter your institution name"
                    disabled={loading || Boolean(successMsg)}
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-canvas-surface border border-canvas-border text-content-primary text-sm placeholder:text-content-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password || Boolean(successMsg)}
              className="btn-primary w-full h-11 mt-3 text-sm font-bold shadow-brand-glow"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security / Terms Notice */}
        <p className="text-center text-2xs text-content-muted mt-4">
          By continuing, you agree to Estudio&apos;s workspace policies and offline local storage terms.
        </p>
      </div>

    </div>
  );
}