import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://estudioworkspace.vercel.app'),
  title: {
    default: 'Estudio - Student Workspace & Campus Hub',
    template: '%s | Estudio',
  },
  description: 'All-in-one student workspace to manage college routine, timetable, attendance tracking, and campus utilities.',
  keywords: ['college workspace', 'student routine', 'timetable manager', 'attendance calculator', 'estudio'],
  authors: [{ name: 'Estudio Team' }],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://estudioworkspace.vercel.app',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}