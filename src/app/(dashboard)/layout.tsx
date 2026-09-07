'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  Clock,
  FolderArchive,
  Calculator,
  Settings,
  GraduationCap,
} from 'lucide-react';

const NAV_ITEMS = [
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR (Fixed 64 units wide)                                     */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-5 shrink-0 fixed inset-y-0 left-0 z-30">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 pb-6 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-md shadow-blue-600/30">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white">Estudio</h1>
            <p className="text-[11px] font-medium text-slate-400">Student Workspace</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="mt-6 flex-1 space-y-1.5" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Utility Profile Link */}
        <div className="pt-4 border-t border-slate-800/80">
          <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Status</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Secure Sync
            </span>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE TOP BAR (Brand Header on small viewports)                           */}
      {/* ========================================================================= */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-lg border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-white">Estudio</span>
        </div>
        <Link
          href="/settings"
          className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700"
        >
          Profile
        </Link>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTENT REGION (md:pl-64 aur w-full add kiya hai desktop fix ke liye) */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-8 pt-4 md:pt-6 px-4 sm:px-6 lg:px-8 md:pl-72 w-full min-w-0">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM DOCK (Sticky on phones, hidden on desktop)                  */}
      {/* ========================================================================= */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl"
        aria-label="Mobile Bottom Navigation"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors duration-150 ${
                isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}