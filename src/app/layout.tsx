import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import 'katex/dist/katex.min.css';

// Primary UI Typeface
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// High-Precision Monospace for Math, Code & Registers
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const viewport: Viewport = {
  themeColor: '#0B0F17', // Strict match to canvas-base token
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://estudioworkspace.vercel.app'),
  title: {
    default: 'Estudio — Engineering Student Workspace',
    template: '%s | Estudio',
  },
  description:
    'Institutional student workspace: attendance tracking, deterministic scientific computing, timetable analytics, and secure document vault.',
  keywords: [
    'engineering calculator',
    'student workspace',
    'attendance tracker',
    'scientific calculator',
    'offline math engine',
    'college timetable',
  ],
  authors: [{ name: 'Estudio Team' }],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-canvas-base text-content-primary font-sans min-h-[100dvh] antialiased selection:bg-brand-500 selection:text-white">
        {/* Google AdSense Script Integration */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3047851350378159"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}