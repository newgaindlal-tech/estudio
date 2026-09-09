'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  User,
  School,
  BookOpen,
  Calendar,
  LogOut,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
  Shield,
  ShieldAlert,
  HelpCircle,
  MessageSquare,
  ChevronDown,
  Clock,
  ShieldCheck,
  Search,
  Trash2,
  Lock,
} from 'lucide-react';

interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  college_name: string;
  department: string;
  semester: number;
  is_admin?: boolean;
}

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_LIST: FaqItem[] = [
  {
    question: 'How is my attendance percentage calculated?',
    answer: 'Your attendance percentage is computed deterministically using the formula: (Total Attended Sessions / Effective Sessions) × 100. Sessions marked as "Off" or cancelled are excluded from the effective denominator.',
  },
  {
    question: 'What happens if I lose internet connection?',
    answer: 'Estudio supports an offline-first architecture. Your attendance logs and local state remain cached safely in your browser session and sync back automatically once connectivity is restored.',
  },
  {
    question: 'How do I change my minimum statutory threshold?',
    answer: 'You can customize your target attendance percentage per subject in the Attendance Manager or course registry settings (default is set to 75%).',
  },
  {
    question: 'Are my uploaded documents and vault files secure?',
    answer: 'Yes. All files stored in the vault are protected by Supabase Row Level Security (RLS) policies and require time-bound encrypted signed URLs for viewing.',
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [fullName, setFullName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState(1);

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Admin Management States
  const [allProfiles, setAllProfiles] = useState<ProfileData[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [adminActionLoading, setAdminActionLoading] = useState<string | null>(null);

  // Delete Account States (Double Confirmation + Password)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadAllUsers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    if (data) setAllProfiles(data as ProfileData[]);
  }, [supabase]);

  useEffect(() => {
    async function loadUserProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        setStatusMessage({ type: 'error', text: 'Failed to load profile telemetry.' });
      } else if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setCollegeName(data.college_name || '');
        setDepartment(data.department || '');
        setSemester(data.semester || 1);
      } else {
        setProfile({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || '',
          college_name: user.user_metadata?.college_name || '',
          department: user.user_metadata?.department || '',
          semester: user.user_metadata?.semester || 1,
          is_admin: false,
        });
        setFullName(user.user_metadata?.full_name || '');
      }

      if (data?.is_admin) {
        await loadAllUsers();
      }

      setLoading(false);
    }

    loadUserProfile();
  }, [supabase, router, loadAllUsers]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSaving(true);
    setStatusMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const updates = {
      id: user.id,
      email: user.email!,
      full_name: fullName.trim(),
      college_name: collegeName.trim(),
      department: department.trim(),
      semester,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);

    if (error) {
      setStatusMessage({ type: 'error', text: error.message });
    } else {
      setStatusMessage({ type: 'success', text: 'Institutional profile updated successfully.' });
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    }
    setSaving(false);
  };

  const handleToggleAdminStatus = async (targetUserId: string, currentAdminState: boolean) => {
    setAdminActionLoading(targetUserId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentAdminState })
        .eq('id', targetUserId);

      if (error) throw error;
      await loadAllUsers();
      setStatusMessage({ type: 'success', text: 'Admin permission successfully updated.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update admin role.' });
    } finally {
      setAdminActionLoading(null);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword) return;

    setDeletingAccount(true);
    setDeleteError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.email) {
        throw new Error('No active session found.');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });

      if (signInError) {
        throw new Error('Incorrect password. Account deletion aborted.');
      }

      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.auth.signOut();

      router.push('/login');
      router.refresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to verify password or delete account.');
      setDeletingAccount(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-xs text-content-muted font-medium">Loading workspace profile...</p>
      </div>
    );
  }

  const filteredUsers = allProfiles.filter(
    (p) =>
      p.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-canvas-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-content-primary">
            Settings & Profile
          </h1>
          <p className="text-content-secondary text-xs mt-0.5">
            Manage your academic identity, institutional branch, and session security.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-status-danger-bg border border-status-danger/40 text-rose-300 hover:bg-status-danger/20 text-xs font-bold transition-all active:scale-95 self-start sm:self-auto outline-none shadow-sm"
        >
          <LogOut className="w-4 h-4 text-status-danger" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Dynamic Feedback Banner */}
      {statusMessage && (
        <div
          role="alert"
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in duration-150 border shadow-sm ${
            statusMessage.type === 'success'
              ? 'bg-status-success-bg border-status-success/40 text-emerald-300'
              : 'bg-status-danger-bg border-status-danger/40 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-status-success" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-status-danger" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* ADMIN EXCLUSIVE SECTION */}
      {profile?.is_admin && (
        <div className="bg-canvas-subtle border border-brand-500/40 rounded-2xl p-5 sm:p-7 space-y-5 shadow-elevated relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-canvas-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400 shadow-sm">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-content-primary">
                  Administrator Privileges Active
                </h2>
                <p className="text-2xs text-content-secondary">
                  You have full system control and user authorization rights
                </p>
              </div>
            </div>

            <Link
              href="/admin"
              className="btn-primary px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 shadow-brand-glow self-start sm:self-auto"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Open Admin Portal &rarr;</span>
            </Link>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-content-primary uppercase tracking-wider">
                Manage User Access Roles
              </h3>
              <span className="text-2xs font-mono text-content-muted">{allProfiles.length} total users</span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-content-muted pointer-events-none" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search registered students by name or email..."
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-canvas-surface border border-canvas-border text-xs text-content-primary outline-none focus:border-brand-500 shadow-inner"
              />
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-canvas-border">
              {filteredUsers.map((u) => {
                const isSelf = u.id === profile.id;
                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between bg-canvas-surface border border-canvas-border p-3 rounded-xl text-xs shadow-inner"
                  >
                    <div className="overflow-hidden pr-2">
                      <p className="font-bold text-content-primary truncate">{u.full_name || 'Unnamed User'}</p>
                      <p className="text-2xs text-content-secondary font-mono truncate">{u.email}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-2xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                        u.is_admin 
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                          : 'bg-canvas-subtle border-canvas-border text-content-muted'
                      }`}>
                        {u.is_admin ? 'Admin' : 'Student'}
                      </span>

                      {!isSelf ? (
                        <button
                          type="button"
                          disabled={adminActionLoading === u.id}
                          onClick={() => handleToggleAdminStatus(u.id, !!u.is_admin)}
                          className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all border outline-none ${
                            u.is_admin
                              ? 'bg-status-danger-bg border-status-danger/40 text-rose-300 hover:bg-status-danger/20'
                              : 'bg-brand-500/20 border-brand-500/40 text-brand-300 hover:bg-brand-500/30'
                          }`}
                        >
                          {adminActionLoading === u.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : u.is_admin ? (
                            'Revoke Admin'
                          ) : (
                            'Make Admin'
                          )}
                        </button>
                      ) : (
                        <span className="text-2xs font-mono text-content-muted italic px-2">(You)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Profile & Academic Form */}
      <form onSubmit={handleUpdateProfile} className="bg-canvas-subtle border border-canvas-border rounded-2xl p-5 sm:p-7 space-y-6 shadow-elevated">
        <div className="flex items-center justify-between border-b border-canvas-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-sm">
              <User className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-content-primary">
                Academic Information
              </h2>
              <p className="text-2xs text-content-secondary">
                Used for attendance thresholds, timetable allocation, and document vaulting
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-content-secondary mb-1.5">
              <Mail className="w-3.5 h-3.5 text-content-muted" />
              Email Address (Immutable)
            </label>
            <input
              type="email"
              disabled
              value={profile?.email || ''}
              className="w-full h-11 rounded-xl bg-canvas-surface/50 border border-canvas-border px-3.5 text-content-muted text-sm cursor-not-allowed font-mono outline-none shadow-inner"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-content-secondary mb-1.5">
              <User className="w-3.5 h-3.5 text-content-muted" />
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              disabled={saving}
              className="w-full h-11 rounded-xl bg-canvas-surface border border-canvas-border px-3.5 text-content-primary text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition-all shadow-inner"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-content-secondary mb-1.5">
              <School className="w-3.5 h-3.5 text-content-muted" />
              College / Institution
            </label>
            <input
              type="text"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              placeholder="Enter your college or institution name"
              disabled={saving}
              className="w-full h-11 rounded-xl bg-canvas-surface border border-canvas-border px-3.5 text-content-primary text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition-all shadow-inner"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-content-secondary mb-1.5">
              <BookOpen className="w-3.5 h-3.5 text-content-muted" />
              Department / Branch
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Enter your department or branch"
              disabled={saving}
              className="w-full h-11 rounded-xl bg-canvas-surface border border-canvas-border px-3.5 text-content-primary text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition-all shadow-inner"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-content-secondary mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-content-muted" />
              Current Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(parseInt(e.target.value, 10))}
              disabled={saving}
              className="w-full h-11 rounded-xl bg-canvas-surface border border-canvas-border px-3.5 text-content-primary text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition-all cursor-pointer shadow-inner"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s} className="bg-canvas-surface text-content-primary">
                  Semester {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-canvas-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-2xs text-content-muted font-mono">
            <Shield className="w-3.5 h-3.5 text-status-success" />
            <span>Encrypted with Supabase Row Level Security (RLS)</span>
          </div>

          <button
            type="submit"
            disabled={saving || !fullName.trim()}
            className="btn-primary w-full sm:w-auto px-5 py-2.5 text-xs font-bold shadow-brand-glow"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* ========================================================================= */}
      {/* CONTACT & SUPPORT SECTION                                                 */}
      {/* ========================================================================= */}
      <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-5 sm:p-7 space-y-4 shadow-elevated">
        <div className="flex items-center gap-2.5 border-b border-canvas-border pb-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
            <MessageSquare className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-content-primary">
              Contact &amp; Support
            </h3>
            <p className="text-2xs text-content-secondary">
              Need help or want to report an issue? Get in touch with our team.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-canvas-surface border border-canvas-border rounded-xl p-4 flex items-center justify-between shadow-inner">
            <div className="space-y-1">
              <span className="text-2xs font-bold text-content-muted uppercase tracking-wider block">Official Email</span>
              <a 
                href="mailto:support@estudio.workspace?subject=Support%20Request%20-%20Estudio" 
                className="font-mono font-bold text-cyan-400 hover:underline flex items-center gap-1"
              >
                support@estudio.workspace
              </a>
            </div>
            <Mail className="w-5 h-5 text-content-muted" />
          </div>

          <div className="bg-canvas-surface border border-canvas-border rounded-xl p-4 flex items-center justify-between shadow-inner">
            <div className="space-y-1">
              <span className="text-2xs font-bold text-content-muted uppercase tracking-wider block">Response Time</span>
              <span className="font-semibold text-content-primary">Within 24 business hours</span>
            </div>
            <Clock className="w-5 h-5 text-content-muted" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FREQUENTLY ASKED QUESTIONS (FAQS) SECTION                                 */}
      {/* ========================================================================= */}
      <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-5 sm:p-7 space-y-4 shadow-elevated">
        <div className="flex items-center gap-2.5 border-b border-canvas-border pb-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
            <HelpCircle className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-content-primary">
              Frequently Asked Questions (FAQs)
            </h3>
            <p className="text-2xs text-content-secondary">
              Quick answers about attendance thresholds, syncing, and vault features
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {FAQ_LIST.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="bg-canvas-surface border border-canvas-border rounded-xl overflow-hidden transition-all shadow-inner"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full text-left p-4 flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-content-primary outline-none hover:bg-canvas-elevated/50 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={`w-4 h-4 text-content-muted shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-400' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-content-secondary leading-relaxed border-t border-canvas-border/40 mt-1 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DANGER ZONE: DELETE ACCOUNT SECTION                                       */}
      {/* ========================================================================= */}
      <div className="bg-canvas-subtle border border-status-danger/40 rounded-2xl p-5 sm:p-7 space-y-4 shadow-elevated">
        <div className="flex items-center justify-between border-b border-status-danger/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-status-danger-bg border border-status-danger/30 flex items-center justify-center text-status-danger shadow-sm">
              <Trash2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-status-danger">
                Danger Zone: Delete Account
              </h3>
              <p className="text-2xs text-content-secondary">
                Permanently erase your student profile, attendance logs, and vault records
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-content-secondary max-w-md">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            type="button"
            onClick={() => {
              setDeletePassword('');
              setDeleteError(null);
              setShowDeleteModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-status-danger hover:bg-status-danger/90 text-white text-xs font-bold transition-colors shadow-sm shrink-0"
          >
            Delete My Account
          </button>
        </div>
      </div>

      {/* Account Telemetry Card */}
      <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-5 space-y-3 shadow-sm">
        <h3 className="text-xs font-bold text-content-primary uppercase tracking-wider">
          System Account Identifier
        </h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-canvas-surface border border-canvas-border rounded-xl font-mono text-2xs shadow-inner">
          <span className="text-content-muted">USER UUID:</span>
          <span className="text-content-secondary truncate max-w-full sm:max-w-md">{profile?.id}</span>
        </div>
      </div>

      {/* Sign Out Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="bg-canvas-subtle border border-status-danger/40 rounded-2xl p-6 max-w-sm w-full shadow-elevated space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-status-danger-bg border border-status-danger/30 flex items-center justify-center text-status-danger shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-content-primary">Sign out of Estudio?</h4>
                <p className="text-2xs text-content-secondary mt-0.5">
                  Your current offline cache will persist, but an active session is needed for cloud sync.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-canvas-border">
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => setShowLogoutConfirm(false)}
                className="btn-secondary px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl bg-status-danger hover:bg-status-danger/90 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                {loggingOut && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRMATION MODAL (Double Confirmation + Password) */}
      {showDeleteModal && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div className="bg-canvas-subtle border border-status-danger/50 rounded-2xl p-6 max-w-md w-full shadow-elevated space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-status-danger-bg border border-status-danger/40 flex items-center justify-center text-status-danger shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-status-danger">Final Warning: Account Deletion</h4>
                <p className="text-2xs text-content-secondary mt-0.5">
                  This action is irreversible. Please enter your account password to confirm permanent deletion.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-status-danger-bg border border-status-danger/40 text-rose-300 text-xs font-medium">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-content-secondary mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-content-muted" />
                  <input
                    type="password"
                    required
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your current password"
                    disabled={deletingAccount}
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-canvas-surface border border-canvas-border text-xs text-content-primary outline-none focus:border-status-danger shadow-inner"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-canvas-border">
                <button
                  type="button"
                  disabled={deletingAccount}
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-secondary px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deletingAccount || !deletePassword}
                  className="px-4 py-2 rounded-xl bg-status-danger hover:bg-status-danger/90 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                >
                  {deletingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Permanently Delete Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}