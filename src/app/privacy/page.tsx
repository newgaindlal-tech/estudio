import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Estudio - Student Workspace and Academic Management Platform.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-canvas-base text-content-primary px-4 py-12 selection:bg-brand-500 selection:text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Back Link */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-brand-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspace</span>
        </Link>

        {/* Header */}
        <div className="space-y-3 border-b border-canvas-border pb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-content-secondary font-mono">Last updated: September 10, 2026</p>
        </div>

        {/* Content Body */}
        <div className="space-y-6 text-sm text-content-secondary leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-content-primary">1. Introduction</h2>
            <p>
              Welcome to <strong>Estudio</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our student workspace platform, attendance tracker, and scientific calculation tools.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-content-primary">2. Information We Collect</h2>
            <p>We may collect and process the following data about you:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Information:</strong> Email address, full name, college/institution name, department, and semester provided during authentication via Supabase.</li>
              <li><strong>Academic Telemetry:</strong> Attendance logs, subject registries, timetable structures, and calculation preferences.</li>
              <li><strong>Technical Data:</strong> IP address, browser type, device information, and usage analytics through cookies and standard web logs.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-content-primary">3. Google AdSense and Cookies</h2>
            <p>
              We use third-party vendors, including Google, to serve ads when you visit our website. Google uses cookies (such as the DoubleClick cookie) to enable it and its partners to serve ads to our users based on their visit to our sites and/or other sites on the Internet.
            </p>
            <p>
              Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">Google Ads Settings</a>. Alternatively, you can opt out of some third-party vendors&apos; use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">aboutads.info</a>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-content-primary">4. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide, maintain, and secure our workspace application and RLS-protected database.</li>
              <li>Personalize your academic profile and compute attendance metrics.</li>
              <li>Improve user experience and display relevant advertisements or operational notices.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-content-primary">5. Data Security</h2>
            <p>
              We implement industry-standard security measures, including Supabase Row Level Security (RLS) policies and encrypted database connections, to protect your personal information from unauthorized access, alteration, or disclosure.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-content-primary">6. Contact Us</h2>
            <p>
              If you have any questions regarding this Privacy Policy, you can reach out to our official support team at <a href="mailto:support@estudio.workspace" className="text-brand-400 font-mono underline">support@estudio.workspace</a>.
            </p>
          </section>
        </div>

        {/* Footer Link */}
        <div className="pt-6 border-t border-canvas-border flex items-center justify-between text-xs text-content-muted">
          <span>&copy; {new Date().getFullYear()} Estudio Workspace. All rights reserved.</span>
          <Link href="/terms" className="hover:text-brand-400 underline">Terms &amp; Conditions</Link>
        </div>

      </div>
    </div>
  );
}