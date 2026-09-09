import React from 'react';
import {
  LayoutDashboard,
  Calculator,
  CalendarCheck,
  Clock,
  FolderArchive,
  Settings,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';
import { NavItem } from '@/types/navigation';

const ICON_MAP: Record<NavItem['iconName'], LucideIcon> = {
  LayoutDashboard,
  Calculator,
  CalendarCheck,
  Clock,
  FolderArchive,
  Settings,
};

interface NavIconProps extends LucideProps {
  name: NavItem['iconName'];
}

export function NavIcon({ name, ...props }: NavIconProps) {
  const Component = ICON_MAP[name] ?? LayoutDashboard;
  return <Component aria-hidden="true" {...props} />;
}