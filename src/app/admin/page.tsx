'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, Lock, Save, Loader2, Mail, Phone, Bell, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface SettingItem {
  key: string;
  value: string;
}

export default function AdminPortalPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings states
  const [contactEmail, setContactEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    async function verifyAndLoad() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Check admin status from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // Fetch site settings
      const { data: settings, error } = await supabase
        .from('site_settings')
        .select('*');

      if (!error && settings) {
        settings.forEach((s: SettingItem) => {
          if (s.key === 'contact_email') setContactEmail(s.value);
          if (s.key === 'support_phone') setSupportPhone(s.value);
          if (s.key === 'announcement') setAnnouncement(s.value);
        });
      }

      setLoading(false);
    }

    verifyAndLoad();
  }, [supabase, router]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      const updates = [
        { key: 'contact_email', value: contactEmail.trim() },
        { key: 'support_phone', value: supportPhone.trim() },
        { key: 'announcement', value: announcement.trim() },
      ];

      for (const item of updates) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value: item.value, updated_at: new Date().toISOString() })
          .eq('key', item.key);

        if (error) throw error;
      }

      setStatusMsg({ type: 'success', text: 'Global platform settings updated successfully.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update administrative settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-xs text-content-muted font-medium">Verifying security clearances...</p>
      </div>
    );
  }

  // Access Denied View for Non-Admins
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-canvas-subtle border border-status-danger/30 rounded-2xl text-center space-y-4 shadow-elevated">
        <div className="w-12 h-12 rounded-2xl bg-status-danger-bg border border-status-danger/40 flex items-center justify-center text-status-danger mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-base font-bold text-content-primary">Restricted Access</h1>
          <p className="text-xs text-content-secondary">
            You do not possess administrative privileges required to access the central control portal.
          </p>
        </div>
        <Link
          href="/"
          className="btn-primary w-full py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Student Workspace</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-canvas-border pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-success-bg border border-status-success/30 text-emerald-300 text-2xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-status-success" />
            Verified Administrator Session
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-content-primary">
            Platform Control Portal
          </h1>
          <p className="text-content-secondary text-xs mt-0.5">
            Manage global communication configurations, contact details, and institutional banners.
          </p>
        </div>
        <Link
          href="/"
          className="btn-secondary px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to Workspace</span>
        </Link>
      </div>

      {/* Status Alert */}
      {statusMsg && (
        <div
          role="alert"
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border shadow-sm ${
            statusMsg.type === 'success'
              ? 'bg-status-success-bg border-status-success/40 text-emerald-300'
              : 'bg-status-danger-bg border-status-danger/40 text-rose-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-status-success" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-status-danger" />
          )}
          <span className="font-medium">{statusMsg.text}</span>
        </div>
      )}

      {/* Admin Editor Form */}
      <form onSubmit={handleSaveSettings} className="bg-canvas-subtle border border-canvas-border rounded-2xl p-5 sm:p-7 space-y-6 shadow-elevated">
        <div className="flex items-center justify-between border-b border-canvas-border pb-3">
          <h2 className="text-sm font-bold text-content-primary">
            Global Editable Parameters
          </h2>
          <span className="text-2xs font-mono text-content-muted">Secured via Supabase RLS</span>
        </div>

        <div className="space-y-4">
          {/* Contact Email */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-content-secondary mb-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              Support Contact Email
            </label>
            <input
              type="email"
              required
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full h-11 rounded-xl bg-canvas-surface border border-canvas-border px-3.5 text-content-primary text-sm font-mono outline-none focus:border-brand-500 shadow-inner"
            />
          </div>

          {/* Support Phone */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-content-secondary mb-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              Support Helpline Number
            </label>
            <input
              type="text"
              required
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              className="w-full h-11 rounded-xl bg-canvas-surface border border-canvas-border px-3.5 text-content-primary text-sm font-mono outline-none focus:border-brand-500 shadow-inner"
            />
          </div>

          {/* Global Announcement */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-content-secondary mb-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              Global System Banner / Announcement
            </label>
            <textarea
              rows={3}
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="Enter system-wide announcement message..."
              className="w-full p-3.5 rounded-xl bg-canvas-surface border border-canvas-border text-content-primary text-xs outline-none focus:border-brand-500 shadow-inner resize-none"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-canvas-border flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-5 py-2.5 text-xs font-bold shadow-brand-glow inline-flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4" />}
            <span>Save Configuration Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
}