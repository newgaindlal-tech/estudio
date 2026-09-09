'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MAIN_NAV_ITEMS } from '@/types/navigation';
import { NavIcon } from './NavIcon';
import { createClient } from '@/lib/supabase/client';
import { LogOut, UserCircle, GraduationCap, ShieldCheck } from 'lucide-react';

export function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserEmail(data.user.email ?? null);
      }
    });
  }, [supabase]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      setLoggingOut(false);
    }
  };

  const isRouteActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-canvas-subtle border-r border-canvas-border text-content-primary min-h-screen p-5 shrink-0 sticky top-0 h-screen z-30 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 pb-6 mb-3 border-b border-canvas-border">
        <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400 shadow-sm shrink-0">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="font-extrabold text-base tracking-tight text-content-primary block truncate">
            Estudio
          </span>
          <p className="text-[11px] font-medium text-content-muted tracking-wide truncate">
            Student Workspace
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5" aria-label="Main Desktop Navigation">
        {MAIN_NAV_ITEMS.map((item) => {
          const isActive = isRouteActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 outline-none active:scale-[0.98] ${
                isActive
                  ? 'bg-brand-500 text-white font-bold border-2 border-brand-400 shadow-sm shadow-brand-glow'
                  : 'bg-canvas-subtle/40 text-content-secondary border border-canvas-border hover:bg-canvas-surface hover:text-content-primary hover:border-canvas-border/80'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <NavIcon
                  name={item.iconName}
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive ? 'text-white scale-110' : 'text-content-muted group-hover:text-brand-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#fff]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Authenticated User Session Bar */}
      {userEmail && (
        <div className="pt-4 border-t border-canvas-border space-y-2.5">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-canvas-surface border border-canvas-border">
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0 pr-1">
              <UserCircle className="w-4 h-4 text-brand-400 shrink-0" />
              <span className="text-2xs font-mono text-content-secondary truncate" title={userEmail}>
                {userEmail}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 text-content-muted hover:text-status-danger rounded-lg hover:bg-canvas-elevated active:scale-95 transition-all shrink-0 outline-none"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="px-1.5 flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>RLS Session Secure</span>
          </div>
        </div>
      )}
    </aside>
  );
}