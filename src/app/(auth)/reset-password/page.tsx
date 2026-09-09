'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const meetsLength = newPassword.length >= 8;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!meetsLength) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMsg('Passwords do not match. Please verify both fields.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      } else {
        setSuccessMsg('Your password has been successfully updated. Redirecting...');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-canvas-base flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 selection:bg-brand-500 selection:text-white select-none">
      
      {/* Brand & Context Header */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto text-center mb-6 sm:mb-8">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-sm shadow-brand-glow mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
          Set New Password
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-content-secondary">
          Choose a strong password to secure your Estudio workspace.
        </p>
      </div>

      {/* Surface Card Container */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto">
        <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-5 sm:p-7 shadow-elevated transition-all">
          
          {/* Error Alert */}
          {errorMsg && (
            <div
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

          <form onSubmit={handleUpdatePassword} className="space-y-4" noValidate>
            {/* New Password */}
            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-semibold text-content-secondary mb-1.5"
              >
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-content-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
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
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-semibold text-content-secondary mb-1.5"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-content-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  disabled={loading || Boolean(successMsg)}
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-canvas-surface border border-canvas-border text-content-primary text-sm placeholder:text-content-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Validation Feedback Indicators */}
            <div className="space-y-1.5 pt-1 text-2xs">
              <div
                className={`flex items-center gap-1.5 transition-colors ${
                  meetsLength ? 'text-emerald-400 font-semibold' : 'text-content-muted'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-lg flex items-center justify-center border transition-all ${
                    meetsLength
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                      : 'border-canvas-border bg-canvas-surface text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3" />
                </div>
                <span>At least 8 characters</span>
              </div>

              <div
                className={`flex items-center gap-1.5 transition-colors ${
                  passwordsMatch ? 'text-emerald-400 font-semibold' : 'text-content-muted'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-lg flex items-center justify-center border transition-all ${
                    passwordsMatch
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                      : 'border-canvas-border bg-canvas-surface text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3" />
                </div>
                <span>Passwords match</span>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading || !meetsLength || !passwordsMatch || Boolean(successMsg)}
              className="btn-primary w-full h-11 mt-2 text-sm font-bold shadow-brand-glow"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Updating Password...</span>
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>

        </div>

        {/* Security Meta */}
        <p className="text-center text-2xs text-content-muted mt-4">
          Make sure your password is unique and not used on other platforms.
        </p>
      </div>

    </div>
  );
}