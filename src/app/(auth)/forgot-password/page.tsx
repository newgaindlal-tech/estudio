'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  KeyRound,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
  RotateCcw,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password`
          : '/reset-password';

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setIsSubmitted(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize request. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setIsSubmitted(false);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-[100dvh] bg-canvas-base flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 selection:bg-brand-500 selection:text-white">
      
      {/* Brand & Context Header */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto text-center mb-6 sm:mb-8">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-sm shadow-brand-glow mb-4">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
          Password Recovery
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-content-secondary max-w-xs mx-auto">
          Enter your institutional or registered email to receive recovery instructions.
        </p>
      </div>

      {/* Surface Card Container */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto">
        <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-5 sm:p-7 shadow-elevated transition-all">
          
          {/* Error Banner */}
          {errorMsg && (
            <div
              role="alert"
              className="mb-4 bg-status-danger-bg border border-status-danger/40 text-rose-300 px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-150 shadow-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-status-danger" />
              <div className="leading-snug font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Conditional Flow: Form vs. Success Confirmation */}
          {!isSubmitted ? (
            <form onSubmit={handleResetRequest} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="recovery-email"
                  className="block text-xs font-semibold text-content-secondary mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-content-muted">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="recovery-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    disabled={loading}
                    aria-invalid={Boolean(errorMsg)}
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-canvas-surface border border-canvas-border text-content-primary text-sm placeholder:text-content-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 transition-all shadow-inner"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-primary w-full h-11 text-sm font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Dispatching Link...</span>
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4 py-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-status-success-bg border border-status-success/30 text-status-success mx-auto flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-content-primary">Check your inbox</h3>
                <p className="text-xs text-content-secondary mt-1 leading-relaxed">
                  We have dispatched a password recovery token to{' '}
                  <span className="font-mono text-brand-400 font-bold px-1.5 py-0.5 rounded bg-canvas-surface border border-canvas-border">
                    {email}
                  </span>.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="btn-secondary w-full h-10 font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Use a different email</span>
                </button>
              </div>
            </div>
          )}

          {/* Navigation Action */}
          <div className="mt-6 pt-4 border-t border-canvas-border text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-content-secondary hover:text-content-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg px-2 py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>

        </div>

        {/* Support Helper Footer */}
        <p className="text-center text-2xs text-content-muted mt-4">
          Having trouble? Check your spam folder or contact department admin.
        </p>
      </div>

    </div>
  );
}