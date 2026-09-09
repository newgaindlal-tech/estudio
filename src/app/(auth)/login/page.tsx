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
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred. Please check your connection.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-canvas-base flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 selection:bg-brand-500 selection:text-white select-none">
      
      {/* Brand & Context Header */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto text-center mb-6 sm:mb-8">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-sm shadow-brand-glow mb-4">
          <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
          Sign in to Estudio
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-content-secondary">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-semibold text-brand-400 hover:text-brand-300 focus-visible:outline-none focus-visible:underline transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>

      {/* Surface Card Container */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto">
        <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-5 sm:p-7 shadow-elevated transition-all">
          
          {/* Error Banner */}
          {errorMsg && (
            <div
              id="login-error"
              role="alert"
              className="mb-4 bg-status-danger-bg border border-status-danger/40 text-rose-300 px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-150 shadow-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-status-danger" />
              <div className="leading-snug font-medium">{errorMsg}</div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin} noValidate>
            
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-content-secondary mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-content-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={loading}
                  aria-invalid={Boolean(errorMsg)}
                  aria-describedby={errorMsg ? 'login-error' : undefined}
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-canvas-surface border border-canvas-border text-content-primary text-sm placeholder:text-content-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-content-secondary"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium focus-visible:outline-none focus-visible:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-content-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  disabled={loading}
                  aria-invalid={Boolean(errorMsg)}
                  aria-describedby={errorMsg ? 'login-error' : undefined}
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
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="btn-primary w-full h-11 mt-2 text-sm font-bold shadow-brand-glow"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Security / System Status Meta */}
        <div className="mt-4 text-center">
          <p className="text-2xs text-content-muted flex items-center justify-center gap-1.5 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            End-to-End Encrypted Session Authentication
          </p>
        </div>
      </div>

    </div>
  );
}