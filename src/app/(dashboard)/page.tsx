'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Subject,
  AttendanceRecord,
  TimetableSlot,
  DocumentMetadata,
  DayOfWeek,
  AttendanceStatus,
} from '@/types/database.types';
import {
  LayoutDashboard,
  CalendarCheck,
  Clock,
  FolderArchive,
  Calculator,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Slash,
  ArrowRight,
  Loader2,
  Sparkles,
  Sun,
  FileText,
  Eye,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  TrendingUp,
  Award,
} from 'lucide-react';

const DAY_MAP: Record<number, DayOfWeek> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

const DAY_NAMES: Record<DayOfWeek, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

export default function DashboardOverview() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [actionLoadingSubjectId, setActionLoadingSubjectId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Student');

  // Core Data States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; mimeType: string } | null>(null);

  // Compute Today and Tomorrow Strings & Days
  const { todayStr, todayDay, tomorrowDay } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const todayIdx = now.getDay();
    const tomorrowIdx = (todayIdx + 1) % 7;

    return {
      todayStr,
      todayDay: DAY_MAP[todayIdx],
      tomorrowDay: DAY_MAP[tomorrowIdx],
    };
  }, []);

  // Fetch All Unified Data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profile?.full_name) {
        setUserName(profile.full_name);
      } else if (user.email) {
        setUserName(user.email.split('@')[0]);
      }

      const [subRes, recRes, slotRes, docRes] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase.from('attendance_records').select('*').order('session_date', { ascending: false }),
        supabase.from('timetable_slots').select('*').order('start_time'),
        supabase.from('documents').select('*').order('created_at', { ascending: false }).limit(4),
      ]);

      if (subRes.data) setSubjects(subRes.data);
      if (recRes.data) setRecords(recRes.data as AttendanceRecord[]);
      if (slotRes.data) setTimetableSlots(slotRes.data);
      if (docRes.data) setDocuments(docRes.data as DocumentMetadata[]);
    } catch (err: any) {
      console.error('Failed to load dashboard telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Modal ESC Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewDoc) {
        setPreviewDoc(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDoc]);

  // Overall Attendance Calculation
  const overallStats = useMemo(() => {
    let totalAttended = 0;
    let totalMissed = 0;

    subjects.forEach((s) => {
      totalAttended += s.initial_attended || 0;
      totalMissed += s.initial_missed || 0;
    });

    totalAttended += records.filter((r) => r.status === 'ATTENDED').length;
    totalMissed += records.filter((r) => r.status === 'MISSED').length;
    const effective = totalAttended + totalMissed;

    if (effective === 0) return { percentage: null, attended: 0, missed: 0, total: 0 };
    const pct = Math.round((totalAttended / effective) * 1000) / 10;
    return { percentage: pct, attended: totalAttended, missed: totalMissed, total: effective };
  }, [subjects, records]);

  // Per-Subject Analysis
  const subjectAnalysis = useMemo(() => {
    const below: Array<{ subject: Subject; pct: number; needed: number; target: number }> = [];
    const close: Array<{ subject: Subject; pct: number; canMiss: number; target: number }> = [];

    subjects.forEach((sub) => {
      const subRecs = records.filter((r) => r.subject_id === sub.id);
      const attended = (sub.initial_attended || 0) + subRecs.filter((r) => r.status === 'ATTENDED').length;
      const missed = (sub.initial_missed || 0) + subRecs.filter((r) => r.status === 'MISSED').length;
      const effective = attended + missed;
      const target = sub.required_percentage || 75;
      const T = target / 100;

      if (effective === 0) return;

      const currentPct = Math.round((attended / effective) * 1000) / 10;

      if (currentPct < target) {
        const needed = Math.ceil((T * effective - attended) / (1 - T));
        below.push({ subject: sub, pct: currentPct, needed: Math.max(1, needed), target });
      } else {
        const canMiss = Math.floor(attended / T - effective);
        if (canMiss <= 1) {
          close.push({ subject: sub, pct: currentPct, canMiss: Math.max(0, canMiss), target });
        }
      }
    });

    return { below, close };
  }, [subjects, records]);

  // Today's Scheduled Classes
  const todaySlots = useMemo(() => {
    return timetableSlots
      .filter((s) => s.day_of_week === todayDay)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  }, [timetableSlots, todayDay]);

  // Tomorrow's Scheduled Classes
  const tomorrowSlots = useMemo(() => {
    return timetableSlots
      .filter((s) => s.day_of_week === tomorrowDay)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  }, [timetableSlots, tomorrowDay]);

  // Quick Attendance Handler with Optimistic UI
  const handleMarkTodayAttendance = async (subjectId: string, status: AttendanceStatus) => {
    setActionLoadingSubjectId(subjectId);
    const previousRecords = [...records];

    const existingIndex = records.findIndex(
      (r) => r.subject_id === subjectId && r.session_date === todayStr
    );

    let nextRecords = [...records];
    if (existingIndex > -1) {
      if (nextRecords[existingIndex].status === status) {
        nextRecords.splice(existingIndex, 1);
      } else {
        nextRecords[existingIndex] = {
          ...nextRecords[existingIndex],
          status,
          updated_at: new Date().toISOString(),
        };
      }
    } else {
      nextRecords.unshift({
        id: `temp-${Date.now()}`,
        user_id: 'optimistic',
        subject_id: subjectId,
        session_date: todayStr,
        slot_order: 1,
        status,
        remarks: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    setRecords(nextRecords);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const existing = previousRecords.find(
        (r) => r.subject_id === subjectId && r.session_date === todayStr
      );

      if (existing) {
        if (existing.status === status) {
          const { error } = await supabase.from('attendance_records').delete().eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('attendance_records')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          if (error) throw error;
        }
      } else {
        const { data, error } = await supabase
          .from('attendance_records')
          .insert({
            user_id: user.id,
            subject_id: subjectId,
            session_date: todayStr,
            slot_order: 1,
            status,
            remarks: null,
          })
          .select()
          .single();
        if (error) throw error;

        if (data) {
          setRecords((current) =>
            current.map((r) =>
              r.id.startsWith('temp-') && r.subject_id === subjectId ? (data as AttendanceRecord) : r
            )
          );
        }
      }
    } catch (err) {
      console.error('Failed to mark today attendance, rolling back:', err);
      setRecords(previousRecords);
    } finally {
      setActionLoadingSubjectId(null);
    }
  };

  // Preview Vault Document
  const handleViewDocument = async (doc: DocumentMetadata) => {
    try {
      const { data, error } = await supabase.storage.from('vault').createSignedUrl(doc.file_path, 60);
      if (error || !data?.signedUrl) throw error || new Error('Failed to generate secure link');
      setPreviewDoc({ title: doc.title, url: data.signedUrl, mimeType: doc.mime_type });
    } catch (err: any) {
      console.error('View error:', err);
    }
  };

  // Safe Time Formatter
  const formatSlotTime = (t?: string | null) => {
    if (!t) return null;
    const parts = t.split(':');
    if (parts.length < 2) return null;
    const hour = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${m} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] gap-3.5">
        <Loader2 className="w-9 h-9 animate-spin text-brand-500" />
        <p className="text-xs text-content-muted font-medium tracking-wide">
          Syncing student telemetry...
        </p>
      </div>
    );
  }

  const isNewUser = subjects.length === 0 && timetableSlots.length === 0 && documents.length === 0;

  if (isNewUser) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-8 select-none">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 text-xs font-semibold shadow-sm shadow-brand-glow">
            <Sparkles className="w-4 h-4 text-brand-400" /> Welcome to Estudio
          </div>
          <h2 className="text-3xl font-extrabold text-content-primary tracking-tight">
            Hello, {userName}! Let&apos;s configure your workspace.
          </h2>
          <p className="text-content-secondary text-sm max-w-lg mx-auto">
            Your unified college life command center. Follow these steps to activate your academic dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Attendance */}
          <div className="bg-canvas-subtle border border-brand-500/40 hover:border-brand-500/80 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-brand-500/20 transition-all" />
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/40 text-brand-400 font-bold flex items-center justify-center text-sm shadow-sm">
                1
              </div>
              <h3 className="font-bold text-content-primary text-base">Course Registry</h3>
              <p className="text-content-secondary text-xs leading-relaxed">
                Add your subjects, define statutory minimums (e.g., 75%), and record baseline attended sessions.
              </p>
            </div>
            <Link
              href="/attendance"
              className="btn-primary py-2.5 px-3.5 text-xs font-bold shadow-brand-glow"
            >
              <span>Setup Attendance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Timetable */}
          <div className="bg-canvas-subtle border border-amber-500/40 hover:border-amber-500/80 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold flex items-center justify-center text-sm shadow-sm">
                2
              </div>
              <h3 className="font-bold text-content-primary text-base">Weekly Routine</h3>
              <p className="text-content-secondary text-xs leading-relaxed">
                Map lecture slots from Monday to Sunday. Today&apos;s classes will load automatically for 1-tap logging.
              </p>
            </div>
            <Link
              href="/timetable"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-sm shadow-amber-950"
            >
              <span>Build Routine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: Vault */}
          <div className="bg-canvas-subtle border border-violet-500/40 hover:border-violet-500/80 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-500/20 transition-all" />
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-400 font-bold flex items-center justify-center text-sm shadow-sm">
                3
              </div>
              <h3 className="font-bold text-content-primary text-base">Vault &amp; Tools</h3>
              <p className="text-content-secondary text-xs leading-relaxed">
                Upload your College ID and fee receipts with secure signed URLs, and test the scientific calculator.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/vault"
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2.5 px-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1 transition-colors shadow-sm"
              >
                Vault
              </Link>
              <Link
                href="/calculator"
                className="btn-secondary flex-1 py-2.5 px-2 text-xs font-semibold"
              >
                Calculator
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isSafeAttendance = (overallStats.percentage ?? 0) >= 75;

  return (
    <div className="max-w-6xl mx-auto space-y-6 select-none pb-16">
      {/* Top Banner & Chromatic Navigation Shortcuts */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-canvas-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-content-primary flex items-center gap-3 tracking-tight">
            <div className="w-9 h-9 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-sm shadow-brand-glow">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            Student Workspace
          </h1>
          <p className="text-content-secondary text-xs sm:text-sm mt-1">
            Welcome back, <span className="text-content-primary font-bold">{userName}</span>. Schedule for{' '}
            <span className="text-brand-400 font-semibold">{DAY_NAMES[todayDay]}, {todayStr}</span>.
          </p>
        </div>

        {/* Eye-catching Chromatic Quick Access Chips */}
        <div className="flex items-center gap-2 text-xs font-semibold flex-wrap">
          <Link
            href="/calculator"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-all shadow-sm font-bold"
          >
            <Calculator className="w-4 h-4" />
            <span>Calculator</span>
          </Link>
          <Link
            href="/attendance"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-all shadow-sm font-bold"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Attendance</span>
          </Link>
          <Link
            href="/vault"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25 transition-all shadow-sm font-bold"
          >
            <FolderArchive className="w-4 h-4" />
            <span>Vault</span>
          </Link>
        </div>
      </div>

      {/* Metric Telemetry Overview Cards (Color-coded Telemetry matching user requested style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Attendance Aggregate */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-cyan-500/40 bg-[#0c182c]/80 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Overall Attendance
            </span>
            <span className="text-2xs px-3 py-1 rounded-xl font-bold border bg-emerald-500/20 border-emerald-500/40 text-emerald-300 flex items-center gap-1 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {isSafeAttendance ? 'Safe' : 'Action Req.'}
            </span>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-extrabold font-mono tracking-tight text-cyan-300">
                {overallStats.percentage !== null ? `${overallStats.percentage}%` : '—'}
              </p>
              <ChevronRight className="w-4 h-4 text-content-muted group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-2xs text-content-secondary font-mono">
              <span className="text-content-primary font-bold">{overallStats.attended}</span> of {overallStats.total} sessions attended
            </p>
            {/* Progress Bar matching reference image */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div 
                className="bg-cyan-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${overallStats.percentage || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Below Target */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-rose-500/40 bg-[#241018]/80 shadow-[0_0_20px_rgba(244,63,94,0.15)] flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              Shortage Alert
            </span>
            <Link 
              href="/attendance"
              className="text-2xs px-3 py-1 rounded-xl font-bold border bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30 transition-all flex items-center gap-1 shadow-sm"
            >
              View <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-extrabold text-rose-400 font-mono">
                {subjectAnalysis.below.length}
              </p>
              <ChevronRight className="w-4 h-4 text-content-muted group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-2xs text-rose-300/90">Courses below statutory threshold</p>
          </div>
        </div>

        {/* Card 3: Watchlist */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-amber-500/40 bg-[#261e0d]/80 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Watchlist
            </span>
            <span className="text-2xs font-mono text-amber-400 font-semibold px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30">
              Margin &le; 1
            </span>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-extrabold text-amber-400 font-mono">
                {subjectAnalysis.close.length}
              </p>
              <ChevronRight className="w-4 h-4 text-content-muted group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-2xs text-amber-300/90">High risk of dropping below 75%</p>
          </div>
        </div>

        {/* Card 4: Today's Lectures */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-cyan-500/40 bg-[#0d202c]/80 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              Today&apos;s Lectures
            </span>
            <span className="text-2xs px-3 py-1 rounded-xl font-bold bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono">
              {DAY_NAMES[todayDay].slice(0, 3)}
            </span>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-extrabold text-cyan-400 font-mono">{todaySlots.length}</p>
              <ChevronRight className="w-4 h-4 text-content-muted group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-2xs text-cyan-300/90">Scheduled for current weekday</p>
          </div>
        </div>
      </div>

      {/* Threshold Warning Banners */}
      {(subjectAnalysis.below.length > 0 || subjectAnalysis.close.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjectAnalysis.below.length > 0 && (
            <div className="bg-[#241018]/90 border border-rose-500/40 rounded-2xl p-4.5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between text-rose-400 font-bold text-xs uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Deficit Warning ({subjectAnalysis.below.length})</span>
                </div>
                <Link href="/attendance" className="text-2xs text-rose-300 underline lowercase hover:text-rose-200 font-semibold">
                  fix in attendance &rarr;
                </Link>
              </div>
              <div className="space-y-2">
                {subjectAnalysis.below.map(({ subject, pct, needed, target }) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between bg-canvas-surface border border-rose-500/30 p-3 rounded-xl text-xs shadow-inner"
                  >
                    <div>
                      <p className="font-bold text-content-primary">{subject.name}</p>
                      <p className="text-2xs text-rose-300 font-mono mt-0.5">
                        Current: <b className="font-bold">{pct}%</b> (Req: {target}%)
                      </p>
                    </div>
                    <span className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-xl text-2xs font-bold shadow-sm inline-flex items-center gap-1 transition-colors">
                      Attend +{needed} class{needed > 1 ? 'es' : ''} &gt;
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {subjectAnalysis.close.length > 0 && (
            <div className="bg-[#261e0d]/90 border border-amber-500/40 rounded-2xl p-4.5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between text-amber-400 font-bold text-xs uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Target Threshold Watchlist ({subjectAnalysis.close.length})</span>
                </div>
                <span className="text-2xs lowercase text-amber-300 font-semibold">Caution advised</span>
              </div>
              <div className="space-y-2">
                {subjectAnalysis.close.map(({ subject, pct, canMiss, target }) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between bg-canvas-surface border border-amber-500/30 p-3 rounded-xl text-xs shadow-inner"
                  >
                    <div>
                      <p className="font-bold text-content-primary">{subject.name}</p>
                      <p className="text-2xs text-amber-300 font-mono mt-0.5">
                        Current: <b className="font-bold">{pct}%</b> (Req: {target}%)
                      </p>
                    </div>
                    <span className="bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl text-2xs font-bold shadow-sm inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {canMiss === 0 ? '0 skips remaining' : '1 skip remaining'} &gt;
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content: Today's Attendance & Vault Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Fast Attendance Logging & Tomorrow */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-5 space-y-4 shadow-elevated">
            <div className="flex items-center justify-between border-b border-canvas-border pb-3.5">
              <div>
                <h2 className="font-bold text-content-primary text-base flex items-center gap-2">
                  <Sun className="w-4.5 h-4.5 text-amber-400" />
                  Today&apos;s Class Attendance ({DAY_NAMES[todayDay]})
                </h2>
                <p className="text-2xs text-content-secondary mt-0.5">
                  Click once to mark your presence. Real-time percentages update instantly.
                </p>
              </div>

              <Link
                href="/timetable"
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
              >
                <span>Edit Routine</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {todaySlots.length === 0 ? (
              <div className="py-10 text-center text-content-muted space-y-2">
                <Clock className="w-9 h-9 mx-auto text-content-muted" />
                <p className="text-xs">No regular classes scheduled for {DAY_NAMES[todayDay]}.</p>
                <Link
                  href="/attendance"
                  className="text-xs text-brand-400 hover:text-brand-300 font-semibold inline-block"
                >
                  Record extra or substitute lecture in Attendance &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySlots.map((slot) => {
                  const sub = subjects.find((s) => s.id === slot.subject_id);
                  const todayRec = records.find(
                    (r) => r.subject_id === slot.subject_id && r.session_date === todayStr
                  );
                  const startFormatted = formatSlotTime(slot.start_time);
                  const endFormatted = formatSlotTime(slot.end_time);
                  const isOperating = actionLoadingSubjectId === slot.subject_id;

                  return (
                    <div
                      key={slot.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-canvas-surface border border-canvas-border p-3.5 rounded-xl transition-all shadow-inner"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-content-primary text-sm">
                            {sub?.name || 'Class Period'}
                          </span>
                          {sub?.code && (
                            <span className="text-2xs font-mono bg-canvas-subtle text-content-secondary px-2 py-0.5 rounded-lg border border-canvas-border">
                              {sub.code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-2xs text-content-secondary">
                          {startFormatted ? (
                            <span className="text-brand-400 font-mono font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3 shrink-0" />
                              {startFormatted} {endFormatted ? `– ${endFormatted}` : ''}
                            </span>
                          ) : (
                            <span className="text-content-muted italic">Time unassigned</span>
                          )}
                          {slot.room_number && <span>Hall: {slot.room_number}</span>}
                        </div>
                      </div>

                      {/* Micro-interactive Present / Absent / Off controls */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          disabled={isOperating}
                          onClick={() => handleMarkTodayAttendance(slot.subject_id, 'ATTENDED')}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border outline-none ${
                            todayRec?.status === 'ATTENDED'
                              ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm shadow-emerald-950'
                              : 'bg-canvas-surface text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                          }`}
                        >
                          {isOperating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Present
                        </button>
                        <button
                          type="button"
                          disabled={isOperating}
                          onClick={() => handleMarkTodayAttendance(slot.subject_id, 'MISSED')}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border outline-none ${
                            todayRec?.status === 'MISSED'
                              ? 'bg-rose-500 text-white border-rose-400 shadow-sm shadow-rose-950'
                              : 'bg-canvas-surface text-rose-400 border-rose-500/30 hover:bg-rose-500/10'
                          }`}
                        >
                          {isOperating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          Absent
                        </button>
                        <button
                          type="button"
                          disabled={isOperating}
                          onClick={() => handleMarkTodayAttendance(slot.subject_id, 'OFF')}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center transition-all border outline-none ${
                            todayRec?.status === 'OFF'
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm shadow-amber-950'
                              : 'bg-canvas-surface text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
                          }`}
                          title="Cancelled / Suspended Lecture"
                          aria-label="Mark Class Cancelled"
                        >
                          <Slash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tomorrow's Schedule Preview */}
          <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-canvas-border pb-3">
              <h2 className="font-bold text-content-primary text-xs flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Tomorrow&apos;s Class Schedule ({DAY_NAMES[tomorrowDay]})
              </h2>
              <span className="text-2xs font-mono text-content-muted">
                {tomorrowSlots.length} {tomorrowSlots.length === 1 ? 'class' : 'classes'}
              </span>
            </div>

            {tomorrowSlots.length === 0 ? (
              <p className="text-xs text-content-muted italic py-3">No classes scheduled for tomorrow.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {tomorrowSlots.map((slot) => {
                  const sub = subjects.find((s) => s.id === slot.subject_id);
                  const startFormatted = formatSlotTime(slot.start_time);

                  return (
                    <div
                      key={slot.id}
                      className="bg-canvas-surface border border-canvas-border p-3.5 rounded-xl text-xs space-y-1 shadow-inner"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-content-primary truncate">{sub?.name || 'Class'}</span>
                        {startFormatted && (
                          <span className="text-2xs text-cyan-400 font-mono font-bold">
                            {startFormatted}
                          </span>
                        )}
                      </div>
                      {slot.room_number && (
                        <p className="text-2xs text-content-muted font-mono">Room: {slot.room_number}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Encrypted Vault Preview */}
        <div className="space-y-4">
          <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-5 space-y-4 shadow-elevated">
            <div className="flex items-center justify-between border-b border-canvas-border pb-3">
              <div>
                <h2 className="font-bold text-content-primary text-sm flex items-center gap-2">
                  <FolderArchive className="w-4 h-4 text-violet-400" />
                  Encrypted Vault
                </h2>
                <p className="text-2xs text-content-secondary mt-0.5">Offline-available academic files</p>
              </div>

              <Link
                href="/vault"
                className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
              >
                <span>Full Vault</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {documents.length === 0 ? (
              <div className="p-8 text-center text-content-muted text-xs space-y-2">
                <FolderArchive className="w-8 h-8 text-violet-400/50 mx-auto" />
                <p>No documents uploaded yet.</p>
                <Link
                  href="/vault"
                  className="text-violet-400 hover:text-violet-300 font-semibold inline-block"
                >
                  Store College ID or Hall Ticket &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents.map((doc) => {
                  const isId = doc.category?.toUpperCase().includes('ID');
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between bg-canvas-surface border border-canvas-border p-3 rounded-xl text-xs hover:border-violet-500/40 transition-colors shadow-inner"
                    >
                      <div className="flex items-center gap-3 overflow-hidden pr-2">
                        <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0 shadow-sm">
                          {isId ? <Award className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-content-primary truncate" title={doc.title}>
                            {doc.title}
                          </p>
                          <span className="text-2xs text-violet-400 font-mono font-semibold">{doc.category}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleViewDocument(doc)}
                        className="p-2 rounded-xl bg-canvas-subtle hover:bg-violet-500/20 text-content-secondary hover:text-violet-300 transition-colors border border-canvas-border shadow-sm"
                        title="Instant Preview"
                        aria-label={`Preview ${doc.title}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div className="bg-canvas-subtle border border-canvas-border rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-elevated overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-canvas-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-content-primary text-sm truncate max-w-xs sm:max-w-md">
                  {previewDoc.title}
                </h3>
                <span className="text-2xs text-status-success font-mono font-semibold flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
                  Encrypted Session (60s validity)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-canvas-surface border border-canvas-border text-content-secondary hover:text-content-primary transition-colors shadow-inner"
                  title="Open in new window"
                  aria-label="Open document in a new window"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 rounded-xl bg-canvas-surface border border-canvas-border text-content-muted hover:text-content-primary transition-colors shadow-inner"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 bg-canvas-base p-2 overflow-auto flex items-center justify-center">
              {previewDoc.mimeType.includes('pdf') ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.title}
                  className="w-full h-full rounded-xl border border-canvas-border shadow-inner"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}