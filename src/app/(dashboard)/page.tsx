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
  Plus,
  Loader2,
  Sparkles,
  Sun,
  FileText,
  Eye,
  ExternalLink,
  ChevronRight,
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
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
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
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
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
    if (recRes.data) setRecords(recRes.data);
    if (slotRes.data) setTimetableSlots(slotRes.data);
    if (docRes.data) setDocuments(docRes.data as DocumentMetadata[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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

  // Today's Scheduled Classes (Safe Sort for null times)
  const todaySlots = useMemo(() => {
    return timetableSlots
      .filter((s) => s.day_of_week === todayDay)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  }, [timetableSlots, todayDay]);

  // Tomorrow's Scheduled Classes (Safe Sort for null times)
  const tomorrowSlots = useMemo(() => {
    return timetableSlots
      .filter((s) => s.day_of_week === tomorrowDay)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  }, [timetableSlots, tomorrowDay]);

  // Quick Attendance Handler
  const handleMarkTodayAttendance = async (subjectId: string, status: AttendanceStatus) => {
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = records.find(
      (r) => r.subject_id === subjectId && r.session_date === todayStr
    );

    if (existing) {
      if (existing.status === status) {
        await supabase.from('attendance_records').delete().eq('id', existing.id);
      } else {
        await supabase
          .from('attendance_records')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      }
    } else {
      await supabase.from('attendance_records').insert({
        user_id: user.id,
        subject_id: subjectId,
        session_date: todayStr,
        slot_order: 1,
        status,
      });
    }

    await fetchDashboardData();
    setActionLoading(false);
  };

  // Preview Vault Document
  const handleViewDocument = async (doc: DocumentMetadata) => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.storage.from('vault').createSignedUrl(doc.file_path, 60);
      if (error || !data?.signedUrl) throw error || new Error('Failed to generate link');
      setPreviewDoc({ title: doc.title, url: data.signedUrl, mimeType: doc.mime_type });
    } catch {
      // Handled gracefully
    } finally {
      setActionLoading(false);
    }
  };

  // Optional Safe Time Formatter
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-xs text-slate-400">Loading your college workspace...</p>
      </div>
    );
  }

  const isNewUser = subjects.length === 0 && timetableSlots.length === 0 && documents.length === 0;

  if (isNewUser) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-4">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-900 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Welcome to Estudio
          </div>
          <h2 className="text-3xl font-extrabold text-white">Hello, {userName}! Let&apos;s get you set up.</h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Your all-in-one college life command center. Follow these 3 simple steps to activate your personal workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800 text-blue-400 font-bold flex items-center justify-center text-sm">
                1
              </div>
              <h3 className="font-bold text-white text-base">Add Your Subjects</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Add your college subjects, target attendance (default 75%), and past attended classes if any.
              </p>
            </div>
            <Link
              href="/attendance"
              className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
            >
              Add Subjects <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400 font-bold flex items-center justify-center text-sm">
                2
              </div>
              <h3 className="font-bold text-white text-base">Setup Timetable</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Assign your subjects to days (Monday to Sunday) so today&apos;s classes appear automatically.
              </p>
            </div>
            <Link
              href="/timetable"
              className="bg-amber-600 hover:bg-amber-500 text-white py-2 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
            >
              Configure Schedule <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 font-bold flex items-center justify-center text-sm">
                3
              </div>
              <h3 className="font-bold text-white text-base">Vault & Utilities</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Upload your College ID and Admit Card privately, or use the natural scientific calculator.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/vault"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1 transition"
              >
                Vault
              </Link>
              <Link
                href="/calculator"
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1 transition"
              >
                Calculator
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner & Quick Utility Shortcuts */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <LayoutDashboard className="w-7 h-7 text-blue-500" />
            Student Workspace
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Good day, <b className="text-slate-200">{userName}</b>. Here is your college status for{' '}
            <span className="text-amber-400 font-semibold">{DAY_NAMES[todayDay]}, {todayStr}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <Link
            href="/calculator"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <Calculator className="w-4 h-4 text-blue-400" />
            Calculator
          </Link>
          <Link
            href="/attendance"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
            Attendance
          </Link>
          <Link
            href="/vault"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <FolderArchive className="w-4 h-4 text-purple-400" />
            Vault
          </Link>
        </div>
      </div>

      {/* METRIC OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Overall Attendance</span>
          <div className="mt-2">
            <p className="text-3xl font-extrabold text-white">
              {overallStats.percentage !== null ? `${overallStats.percentage}%` : '—'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {overallStats.attended} of {overallStats.total} classes attended
            </p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-rose-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Below Target
          </span>
          <div className="mt-2">
            <p className="text-2xl font-bold text-white">{subjectAnalysis.below.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Critical recovery needed</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Close to Threshold
          </span>
          <div className="mt-2">
            <p className="text-2xl font-bold text-white">{subjectAnalysis.close.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Margin: ≤ 1 bunk left</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Today&apos;s Lectures
          </span>
          <div className="mt-2">
            <p className="text-2xl font-bold text-white">{todaySlots.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Scheduled for {DAY_NAMES[todayDay]}</p>
          </div>
        </div>
      </div>

      {/* WARNING NOTIFICATIONS */}
      {(subjectAnalysis.below.length > 0 || subjectAnalysis.close.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjectAnalysis.below.length > 0 && (
            <div className="bg-rose-950/30 border border-rose-900/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Attendance Shortage Alert ({subjectAnalysis.below.length})</span>
              </div>
              <div className="space-y-2">
                {subjectAnalysis.below.map(({ subject, pct, needed, target }) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between bg-slate-950/70 border border-rose-900/40 p-2.5 rounded-lg text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">{subject.name}</p>
                      <p className="text-[11px] text-rose-300">
                        Current: <b className="font-bold">{pct}%</b> (Target: {target}%)
                      </p>
                    </div>
                    <span className="bg-rose-900/60 text-rose-200 border border-rose-800 px-2 py-1 rounded text-[11px] font-semibold">
                      Attend +{needed} classes
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {subjectAnalysis.close.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-900/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Threshold Watchlist ({subjectAnalysis.close.length})</span>
              </div>
              <div className="space-y-2">
                {subjectAnalysis.close.map(({ subject, pct, canMiss, target }) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between bg-slate-950/70 border border-amber-900/40 p-2.5 rounded-lg text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">{subject.name}</p>
                      <p className="text-[11px] text-amber-300">
                        Current: <b className="font-bold">{pct}%</b> (Target: {target}%)
                      </p>
                    </div>
                    <span className="bg-amber-900/60 text-amber-200 border border-amber-800 px-2 py-1 rounded text-[11px] font-semibold">
                      {canMiss === 0 ? '0 bunks left!' : 'Only 1 bunk left'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TODAY'S ATTENDANCE & UPCOMING / DOCUMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  Today&apos;s Class Attendance ({DAY_NAMES[todayDay]})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Mark your presence or absence directly from here.
                </p>
              </div>

              <Link
                href="/timetable"
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
              >
                View Routine <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {todaySlots.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs">No classes scheduled for today.</p>
                <Link
                  href="/attendance"
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold inline-block"
                >
                  Mark an unscheduled/extra session →
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

                  return (
                    <div
                      key={slot.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 p-3 rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{sub?.name || 'Class'}</span>
                          {sub?.code && (
                            <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                              {sub.code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          {/* Timing rendered ONLY if available */}
                          {startFormatted && (
                            <span className="text-amber-400 font-mono font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              {startFormatted} {endFormatted ? `– ${endFormatted}` : ''}
                            </span>
                          )}
                          {slot.room_number && <span>Room {slot.room_number}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          disabled={actionLoading}
                          onClick={() => handleMarkTodayAttendance(slot.subject_id, 'ATTENDED')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition border ${
                            todayRec?.status === 'ATTENDED'
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Present
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleMarkTodayAttendance(slot.subject_id, 'MISSED')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition border ${
                            todayRec?.status === 'MISSED'
                              ? 'bg-rose-600 text-white border-rose-500'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Absent
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleMarkTodayAttendance(slot.subject_id, 'OFF')}
                          className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition border ${
                            todayRec?.status === 'OFF'
                              ? 'bg-amber-600 text-white border-amber-500'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                          title="Cancelled / Off"
                        >
                          <Slash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tomorrow's Schedule */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="font-bold text-white text-xs flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Upcoming Routine: Tomorrow ({DAY_NAMES[tomorrowDay]})
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {tomorrowSlots.length} {tomorrowSlots.length === 1 ? 'class' : 'classes'}
              </span>
            </div>

            {tomorrowSlots.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No classes scheduled for tomorrow.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tomorrowSlots.map((slot) => {
                  const sub = subjects.find((s) => s.id === slot.subject_id);
                  const startFormatted = formatSlotTime(slot.start_time);

                  return (
                    <div
                      key={slot.id}
                      className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white truncate">{sub?.name || 'Class'}</span>
                        {startFormatted && (
                          <span className="text-[10px] text-amber-400 font-mono">
                            {startFormatted}
                          </span>
                        )}
                      </div>
                      {slot.room_number && (
                        <p className="text-[10px] text-slate-500">Room: {slot.room_number}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Recent Documents from Vault */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <FolderArchive className="w-4 h-4 text-purple-400" />
                  Recent Documents
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Encrypted private files</p>
              </div>

              <Link
                href="/vault"
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
              >
                Open Vault <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {documents.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                <FolderArchive className="w-8 h-8 text-slate-600 mx-auto" />
                <p>No documents uploaded yet.</p>
                <Link
                  href="/vault"
                  className="text-purple-400 hover:text-purple-300 font-semibold inline-block"
                >
                  Store your College ID →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg text-xs hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                      <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p className="font-semibold text-white truncate" title={doc.title}>
                          {doc.title}
                        </p>
                        <span className="text-[10px] text-purple-300 font-mono">{doc.category}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewDocument(doc)}
                      disabled={actionLoading}
                      className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="Quick Preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">{previewDoc.title}</h3>
                <span className="text-[11px] text-purple-400">Time-Limited Session (60s validity)</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
                  title="Open in new window"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-950 p-2 overflow-auto flex items-center justify-center">
              {previewDoc.mimeType.includes('pdf') ? (
                <iframe src={previewDoc.url} title={previewDoc.title} className="w-full h-full rounded-lg border border-slate-800" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={previewDoc.url} alt={previewDoc.title} className="max-h-full max-w-full object-contain rounded-lg shadow-lg" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}