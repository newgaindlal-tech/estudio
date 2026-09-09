'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MAIN_NAV_ITEMS } from '@/types/navigation';
import { NavIcon } from './NavIcon';

export function MobileBottomNav() {
  const pathname = usePathname();

  // Hierarchical route matching so parent tabs remain active on sub-routes
  const isRouteActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-canvas-subtle/95 backdrop-blur-xl border-t border-canvas-border px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-elevated select-none"
      aria-label="Mobile Navigation Dock"
    >
      {MAIN_NAV_ITEMS.map((item) => {
        const isActive = isRouteActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] py-1 px-2 rounded-lg transition-all duration-150 outline-none active:scale-95 focus-visible:ring-1 focus-visible:ring-brand-500 ${
              isActive
                ? 'text-brand-400 font-bold'
                : 'text-content-muted hover:text-content-primary'
            }`}
          >
            <NavIcon
              name={item.iconName}
              className={`w-5 h-5 mb-0.5 transition-colors ${
                isActive ? 'text-brand-400' : 'text-content-muted'
              }`}
            />
            <span className="text-[10px] font-medium leading-none tracking-tight">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}