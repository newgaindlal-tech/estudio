'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MAIN_NAV_ITEMS } from '@/types/navigation';
import { NavIcon } from './NavIcon';
import { createClient } from '@/lib/supabase/client';
import { LogOut, UserCircle } from 'lucide-react';

export function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserEmail(data.user.email ?? null);
      }
    });
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-100 min-h-screen p-4">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-lg text-white">
          E
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">Estudio</h1>
          <p className="text-xs text-slate-400">College Life Hub</p>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1">
        {MAIN_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              <NavIcon name={item.iconName} className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Authenticated User Session Bar */}
      {userEmail && (
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between px-2 py-1 mb-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <UserCircle className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-300 truncate" title={userEmail}>
                {userEmail}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="text-slate-400 hover:text-red-400 p-1 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="px-2 text-[10px] text-emerald-400">● Session Secure (RLS Active)</div>
        </div>
      )}
    </aside>
  );
}