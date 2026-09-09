'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import 'katex/dist/katex.min.css';
import {
  LayoutDashboard,
  CalendarCheck,
  Clock,
  FolderArchive,
  Calculator,
  Settings,
  GraduationCap,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Attendance', href: '/attendance', icon: CalendarCheck },
  { label: 'Timetable', href: '/timetable', icon: Clock },
  { label: 'Vault', href: '/vault', icon: FolderArchive },
  { label: 'Calculator', href: '/calculator', icon: Calculator },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);

  // Monitor real client connectivity status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Hierarchical route matching (handles sub-routes like /calculator/matrix)
  const isRouteActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-[100dvh] bg-canvas-base text-content-primary flex flex-col md:flex-row selection:bg-brand-500 selection:text-white">
      
      {/* Accessible Skip Navigation Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-500 focus:text-white focus:rounded-xl focus:shadow-elevated focus:outline-none"
      >
        Skip to main content
      </a>

      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR (Static Sticky Drawer — Zero Overlap Guarantee)          */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen border-r border-canvas-border bg-canvas-subtle/80 backdrop-blur-xl p-5 shrink-0 sticky top-0 h-screen z-30 select-none">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 pb-6 border-b border-canvas-border">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-sm shadow-brand-glow shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-base tracking-tight text-content-primary block truncate">
              Estudio
            </span>
            <p className="text-2xs font-medium text-content-muted truncate">
              Student Workspace
            </p>
          </div>
        </div>

        {/* Primary Desktop Navigation Links with Solid Active States */}
        <nav className="mt-6 flex-1 space-y-1.5" aria-label="Main Desktop Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 outline-none active:scale-[0.98] ${
                  active
                    ? 'bg-brand-500 text-white font-bold border border-brand-400 shadow-sm shadow-brand-glow'
                    : 'text-content-secondary hover:text-content-primary hover:bg-canvas-surface border border-transparent'
                }`}
              >
                {active && (
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-full bg-white shadow-[0_0_8px_#fff]" />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    active ? 'text-white scale-110' : 'text-content-muted group-hover:text-brand-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Hardware / Sync Status Telemetry */}
        <div className="pt-4 border-t border-canvas-border">
          <div className="px-3.5 py-2.5 rounded-xl bg-canvas-surface border border-canvas-border flex items-center justify-between text-xs shadow-inner">
            <span className="text-content-muted text-2xs font-mono font-medium">Telemetry</span>
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 text-2xs text-emerald-400 font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
                <span>Cloud Sync</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-2xs text-amber-400 font-mono font-bold">
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Offline Mode</span>
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE TOP BAR (Fixed Sticky Masthead)                                    */}
      {/* ========================================================================= */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-canvas-subtle/95 backdrop-blur-xl border-b border-canvas-border select-none shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-sm">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-content-primary tracking-tight">Estudio</span>
        </div>

        <Link
          href="/settings"
          className="btn-secondary px-3.5 py-1.5 text-2xs font-semibold"
        >
          Profile
        </Link>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTENT REGION (Takes Remaining Viewport Fluidly)                    */}
      {/* ========================================================================= */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 min-w-0 overflow-y-auto pb-24 md:pb-8 pt-4 md:pt-6 px-4 sm:px-6 lg:px-8 outline-none"
      >
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION DOCK (Touch Ergonomic)                           */}
      {/* ========================================================================= */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-canvas-subtle/95 backdrop-blur-xl border-t border-canvas-border px-2 py-1.5 flex items-center justify-around shadow-elevated select-none pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
        aria-label="Mobile Navigation Dock"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center min-h-[48px] min-w-[54px] py-1 px-2 rounded-xl transition-all duration-150 active:scale-95 outline-none ${
                active
                  ? 'bg-canvas-elevated text-brand-400 font-bold border border-brand-500/40 shadow-sm'
                  : 'text-content-muted hover:text-content-primary hover:bg-canvas-surface/50'
              }`}
            >
              {active && (
                <span className="absolute -top-1 w-6 h-1 rounded-full bg-brand-400 shadow-[0_0_8px_#3b82f6]" />
              )}
              <Icon className={`w-5 h-5 mb-1 transition-transform ${active ? 'scale-110 text-brand-400' : 'text-content-muted'}`} />
              <span className="text-[10px] tracking-tight leading-none font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

    </div>
  );
}