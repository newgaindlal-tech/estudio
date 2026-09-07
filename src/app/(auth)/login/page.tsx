'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GraduationCap, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      // Lazy-initialize client inside handler to avoid build-time prerender issues
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
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
      setErrorMsg(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <>
      <head>
        <title>Sign In | Estudio - Student Workspace</title>
        <meta
          name="description"
          content="Sign in to access your college timetable, attendance manager, and student workspace."
        />
        <link rel="canonical" href="https://estudioworkspace.vercel.app/login" />
        <meta name="robots" content="index, follow" />
      </head>

      <div className="min-h-[100dvh] bg-slate-950 flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
        {/* Brand Header */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto text-center mb-5 sm:mb-6">
          <div className="mx-auto w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 mb-3 sm:mb-4">
            <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Sign in to Estudio
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-blue-500 hover:text-blue-400">
              Sign up
            </Link>
          </p>
        </div>

        {/* Login Card Form */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-8 shadow-2xl backdrop-blur-sm">
            {errorMsg && (
              <div className="mb-4 bg-red-950/50 border border-red-800 text-red-300 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}