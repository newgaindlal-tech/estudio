import React from 'react';
import {
  LayoutDashboard,
  Calculator,
  CalendarCheck,
  Clock,
  FolderArchive,
  Settings,
  LucideProps,
} from 'lucide-react';
import { NavItem } from '@/types/navigation';

interface NavIconProps extends LucideProps {
  name: NavItem['iconName'];
}

export function NavIcon({ name, ...props }: NavIconProps) {
  switch (name) {
    case 'LayoutDashboard':
      return <LayoutDashboard {...props} />;
    case 'Calculator':
      return <Calculator {...props} />;
    case 'CalendarCheck':
      return <CalendarCheck {...props} />;
    case 'Clock':
      return <Clock {...props} />;
    case 'FolderArchive':
      return <FolderArchive {...props} />;
    case 'Settings':
      return <Settings {...props} />;
    default:
      return <LayoutDashboard {...props} />;
  }
}