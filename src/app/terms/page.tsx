import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms & Conditions',
  description: 'Terms and Conditions for using Estudio student platform and tools.',
};

export default function TermsPage() {
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
            <FileText className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Terms &amp; Conditions</h1>
          <p className="text-xs text-content-secondary font-mono">Last updated: September 10, 2026</p>
        </div>

        {/* Content Body */}
        <div className="space-y-6 text-sm text-content-secondary leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-content-primary">1. Acceptance of Terms</h2>
            <p>
              By accessing or using <strong>Estudio</strong>, you agree to be bound by these Terms &amp; Conditions. If you disagree with any part of these terms, you may not access our services or workspace applications.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-content-primary">2. User Accounts &amp; Security</h2>
            <p>
              You are responsible for safeguarding your login credentials and password. You agree to notify us immediately of any unauthorized use of your account. Estudio is not liable for any loss or damage arising from your failure to protect your account information.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-content-primary">3. Acceptable Use</h2>
            <p>You agree not to misuse the Estudio platform. Prohibited activities include:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Attempting to bypass security controls, RLS policies, or gain unauthorized access to admin portals.</li>
              <li>Uploading malicious scripts, malware, or harmful content into the document vault.</li>
              <li>Using automated web scrapers or bots to overload our infrastructure or advertising networks.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-content-primary">4. Intellectual Property</h2>
            <p>
              All application code, user interface design, deterministic calculation engines, and brand assets associated with Estudio are protected by applicable intellectual property laws and belong exclusively to the Estudio team.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-content-primary">5. Advertisements &amp; Third-Party Links</h2>
            <p>
              Our platform displays advertisements provided by Google AdSense and third-party networks. We are not responsible for the content, privacy policies, or practices of any third-party websites or services linked from advertisements.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-content-primary">6. Limitation of Liability</h2>
            <p>
              Estudio is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We do not warrant that attendance computations, calculators, or cloud sync will be uninterrupted, secure, or entirely free of errors.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-content-primary">7. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes your formal acceptance of the updated terms.
            </p>
          </section>
        </div>

        {/* Footer Link */}
        <div className="pt-6 border-t border-canvas-border flex items-center justify-between text-xs text-content-muted">
          <span>&copy; {new Date().getFullYear()} Estudio Workspace. All rights reserved.</span>
          <Link href="/privacy" className="hover:text-brand-400 underline">Privacy Policy</Link>
        </div>

      </div>
    </div>
  );
}