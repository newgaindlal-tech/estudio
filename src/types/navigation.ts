export interface NavItem {
  label: string;
  href: string;
  iconName: 'LayoutDashboard' | 'Calculator' | 'CalendarCheck' | 'Clock' | 'FolderArchive' | 'Settings';
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', iconName: 'LayoutDashboard' },
  { label: 'Calculator', href: '/calculator', iconName: 'Calculator' },
  { label: 'Attendance', href: '/attendance', iconName: 'CalendarCheck' },
  { label: 'Timetable', href: '/timetable', iconName: 'Clock' },
  { label: 'Vault', href: '/vault', iconName: 'FolderArchive' },
  { label: 'Settings', href: '/settings', iconName: 'Settings' },
];