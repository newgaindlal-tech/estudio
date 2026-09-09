'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Subject,
  AttendanceRecord,
  AttendanceStatus,
  TimetableSlot,
  DayOfWeek,
} from '@/types/database.types';
import {
  CalendarCheck,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Slash,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  History,
  SlidersHorizontal,
  Clock,
  Filter,
  X,
  ShieldAlert,
  Search,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

function getDayOfWeekFromDateString(dateStr: string): DayOfWeek {
  if (!dateStr) return 'MONDAY';
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayIdx = dateObj.getDay();
  const mapping: Record<number, DayOfWeek> = {
    0: 'SUNDAY',
    1: 'MONDAY',
    2: 'TUESDAY',
    3: 'WEDNESDAY',
    4: 'THURSDAY',
    5: 'FRIDAY',
    6: 'SATURDAY',
  };
  return mapping[dayIdx] || 'MONDAY';
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

type StatusFilter = 'ALL' | 'SAFE' | 'SHORTAGE';

export default function AttendanceManagerPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [actionLoadingSubjectId, setActionLoadingSubjectId] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [activeTab, setActiveTab] = useState<'TRACKER' | 'SUBJECTS' | 'HISTORY'>('TRACKER');
  const [showAllSubjectsForDate, setShowAllSubjectsForDate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Modal State
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subLecturer, setSubLecturer] = useState('');
  const [subRoom, setSubRoom] = useState('');
  const [subTarget, setSubTarget] = useState('75');
  const [subInitialAttended, setSubInitialAttended] = useState('0');
  const [subInitialMissed, setSubInitialMissed] = useState('0');

  // Deletion Confirmation Dialog State
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);

  const [historySubjectFilter, setHistorySubjectFilter] = useState<string>('ALL');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [subRes, recRes, slotRes] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase.from('attendance_records').select('*').order('session_date', { ascending: false }),
        supabase.from('timetable_slots').select('*').order('start_time'),
      ]);

      if (subRes.data) setSubjects(subRes.data);
      if (recRes.data) setRecords(recRes.data as AttendanceRecord[]);
      if (slotRes.data) setTimetableSlots(slotRes.data);
    } catch (err) {
      console.error('Error loading attendance data:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modal ESC Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddSubject) setShowAddSubject(false);
        if (deletingSubjectId) setDeletingSubjectId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddSubject, deletingSubjectId]);

  const selectedDayOfWeek = useMemo(
    () => getDayOfWeekFromDateString(selectedDate),
    [selectedDate]
  );

  const scheduledSlotsForSelectedDate = useMemo(() => {
    return (timetableSlots || [])
      .filter((s) => s && s.day_of_week === selectedDayOfWeek)
      .sort((a, b) => (a?.start_time || '').localeCompare(b?.start_time || ''));
  }, [timetableSlots, selectedDayOfWeek]);

  const getSubjectStats = useCallback(
    (subject: Subject) => {
      if (!subject) {
        return {
          attended: 0,
          missed: 0,
          off: 0,
          effective: 0,
          percentage: null,
          canMiss: 0,
          neededToAttend: 0,
          status: 'NO_DATA' as const,
        };
      }

      const subRecords = (records || []).filter((r) => r && r.subject_id === subject.id);
      const sessionAttended = subRecords.filter((r) => r.status === 'ATTENDED').length;
      const sessionMissed = subRecords.filter((r) => r.status === 'MISSED').length;
      const off = subRecords.filter((r) => r.status === 'OFF').length;

      const attended = (subject.initial_attended || 0) + sessionAttended;
      const missed = (subject.initial_missed || 0) + sessionMissed;
      const effective = attended + missed;
      const targetPct = subject.required_percentage || 75;
      const T = targetPct / 100;

      if (effective === 0) {
        return {
          attended,
          missed,
          off,
          effective,
          percentage: null,
          canMiss: 0,
          neededToAttend: 0,
          status: 'NO_DATA' as const,
        };
      }

      const pct = (attended / effective) * 100;
      const roundedPct = Math.round(pct * 10) / 10;

      if (roundedPct >= targetPct) {
        const canMiss = Math.floor(attended / T - effective);
        return {
          attended,
          missed,
          off,
          effective,
          percentage: roundedPct,
          canMiss: Math.max(0, canMiss),
          neededToAttend: 0,
          status: 'SAFE' as const,
        };
      } else {
        const needed = Math.ceil((T * effective - attended) / (1 - T));
        return {
          attended,
          missed,
          off,
          effective,
          percentage: roundedPct,
          canMiss: 0,
          neededToAttend: Math.max(1, needed),
          status: 'SHORTAGE' as const,
        };
      }
    },
    [records]
  );

  const displaySubjectsForDate = useMemo(() => {
    let list = subjects || [];
    if (!showAllSubjectsForDate) {
      const scheduledSubjectIds = new Set(
        scheduledSlotsForSelectedDate.map((s) => s?.subject_id).filter(Boolean)
      );
      list = list.filter((s) => scheduledSubjectIds.has(s?.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.code && s.code.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'ALL') {
      list = list.filter((s) => {
        const stats = getSubjectStats(s);
        return stats.status === statusFilter;
      });
    }

    return list;
  }, [
    subjects,
    scheduledSlotsForSelectedDate,
    showAllSubjectsForDate,
    searchQuery,
    statusFilter,
    getSubjectStats,
  ]);

  const overallStats = useMemo(() => {
    let totalAttended = 0;
    let totalMissed = 0;

    (subjects || []).forEach((s) => {
      if (s) {
        totalAttended += s.initial_attended || 0;
        totalMissed += s.initial_missed || 0;
      }
    });

    totalAttended += (records || []).filter((r) => r && r.status === 'ATTENDED').length;
    totalMissed += (records || []).filter((r) => r && r.status === 'MISSED').length;
    const totalOff = (records || []).filter((r) => r && r.status === 'OFF').length;

    const totalEffective = totalAttended + totalMissed;

    if (totalEffective === 0) {
      return { percentage: null, attended: 0, missed: 0, off: totalOff, totalEffective: 0 };
    }

    const pct = Math.round((totalAttended / totalEffective) * 1000) / 10;
    return { percentage: pct, attended: totalAttended, missed: totalMissed, off: totalOff, totalEffective };
  }, [subjects, records]);

  // Optimistic Attendance Marking Handler
  const handleMarkAttendance = async (
    subjectId: string,
    status: AttendanceStatus,
    targetDate = selectedDate
  ) => {
    setActionLoadingSubjectId(subjectId);
    const previousRecords = [...records];

    const existingIndex = records.findIndex(
      (r) => r && r.subject_id === subjectId && r.session_date === targetDate
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
        session_date: targetDate,
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
        (r) => r && r.subject_id === subjectId && r.session_date === targetDate
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
            session_date: targetDate,
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
      console.error('Failed to mark attendance, rolling back:', err);
      setRecords(previousRecords);
    } finally {
      setActionLoadingSubjectId(null);
    }
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;
    setModalLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        name: subName.trim(),
        code: subCode.trim() || null,
        lecturer_name: subLecturer.trim() || null,
        room_number: subRoom.trim() || null,
        required_percentage: parseFloat(subTarget) || 75,
        initial_attended: Math.max(0, parseInt(subInitialAttended, 10) || 0),
        initial_missed: Math.max(0, parseInt(subInitialMissed, 10) || 0),
      };

      if (editingSubject) {
        await supabase.from('subjects').update(payload).eq('id', editingSubject.id);
      } else {
        await supabase.from('subjects').insert({
          ...payload,
          user_id: user.id,
          color_code: '#3B82F6',
        });
      }

      setSubName('');
      setSubCode('');
      setSubLecturer('');
      setSubRoom('');
      setSubTarget('75');
      setSubInitialAttended('0');
      setSubInitialMissed('0');
      setEditingSubject(null);
      setShowAddSubject(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to save subject:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const confirmDeleteSubject = async () => {
    if (!deletingSubjectId) return;
    try {
      await supabase.from('subjects').delete().eq('id', deletingSubjectId);
      setSubjects((prev) => prev.filter((s) => s.id !== deletingSubjectId));
      setRecords((prev) => prev.filter((r) => r.subject_id !== deletingSubjectId));
    } catch (err) {
      console.error('Failed to delete subject:', err);
    } finally {
      setDeletingSubjectId(null);
    }
  };

  const handleOpenEditModal = (s: Subject) => {
    setEditingSubject(s);
    setSubName(s?.name || '');
    setSubCode(s?.code || '');
    setSubLecturer(s?.lecturer_name || '');
    setSubRoom(s?.room_number || '');
    setSubTarget(s?.required_percentage?.toString() || '75');
    setSubInitialAttended((s?.initial_attended || 0).toString());
    setSubInitialMissed((s?.initial_missed || 0).toString());
    setShowAddSubject(true);
  };

  const handleDeleteRecord = async (recordId: string) => {
    const previous = [...records];
    setRecords((prev) => prev.filter((r) => r.id !== recordId));
    try {
      const { error } = await supabase.from('attendance_records').delete().eq('id', recordId);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to delete record, rolling back:', err);
      setRecords(previous);
    }
  };

  const shiftDate = (days: number) => {
    try {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      d.setDate(d.getDate() + days);
      const newYear = d.getFullYear();
      const newMonth = String(d.getMonth() + 1).padStart(2, '0');
      const newDay = String(d.getDate()).padStart(2, '0');
      setSelectedDate(`${newYear}-${newMonth}-${newDay}`);
    } catch {
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  };

  const formatSlotTime = (timeStr?: string | null) => {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
      return '';
    }
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    if (isNaN(hour)) return timeStr;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${m} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-xs text-content-muted font-medium">Syncing institutional attendance profile...</p>
      </div>
    );
  }

  const isSafeAttendance = (overallStats.percentage ?? 0) >= 75;

  return (
    <div className="space-y-6 select-none pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-canvas-border pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2.5">
            <CalendarCheck className="w-6 h-6 text-brand-400" />
            Attendance System
          </h2>
          <p className="text-content-secondary text-xs mt-0.5">
            Deterministic statutory threshold monitoring with timetable-linked daily records.
          </p>
        </div>

        {/* Tab Controls */}
        <div
          role="tablist"
          className="inline-flex bg-canvas-subtle border border-canvas-border p-1 rounded-2xl text-xs font-semibold self-start sm:self-auto gap-1"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'TRACKER'}
            onClick={() => setActiveTab('TRACKER')}
            className={activeTab === 'TRACKER' ? 'tab-pill-active' : 'tab-pill-inactive'}
          >
            Tracker
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'SUBJECTS'}
            onClick={() => setActiveTab('SUBJECTS')}
            className={activeTab === 'SUBJECTS' ? 'tab-pill-active' : 'tab-pill-inactive'}
          >
            Subjects ({subjects?.length || 0})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'HISTORY'}
            onClick={() => setActiveTab('HISTORY')}
            className={activeTab === 'HISTORY' ? 'tab-pill-active' : 'tab-pill-inactive'}
          >
            Logs ({records?.length || 0})
          </button>
        </div>
      </div>

      {/* Aggregate Metric Telemetry Grid with Color-Coded Styling matching dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Overall Attendance */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-cyan-500/40 bg-[#0c182c]/80 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Overall Average
            </span>
            <span className="text-2xs px-3 py-1 rounded-xl font-bold border bg-emerald-500/20 border-emerald-500/40 text-emerald-300 flex items-center gap-1 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {isSafeAttendance ? 'Safe' : 'Action Req.'}
            </span>
          </div>
          <div className="mt-4 space-y-1.5">
            <p className="text-3xl font-extrabold font-mono tracking-tight text-cyan-300">
              {overallStats.percentage !== null ? `${overallStats.percentage}%` : '—'}
            </p>
            <p className="text-2xs text-content-secondary font-mono">
              <span className="text-content-primary font-bold">{overallStats.attended}</span> of {overallStats.totalEffective} recorded sessions
            </p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div 
                className="bg-cyan-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${overallStats.percentage || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Attended */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-emerald-500/40 bg-[#0d261e]/80 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Attended
            </span>
          </div>
          <div className="mt-4 space-y-1.5">
            <p className="text-3xl font-extrabold text-emerald-400 font-mono">
              {overallStats.attended}
            </p>
            <p className="text-2xs text-emerald-300/90">Classes present</p>
          </div>
        </div>

        {/* Card 3: Missed */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-rose-500/40 bg-[#241018]/80 shadow-[0_0_20px_rgba(244,63,94,0.15)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-400" />
              Missed
            </span>
          </div>
          <div className="mt-4 space-y-1.5">
            <p className="text-3xl font-extrabold text-rose-400 font-mono">
              {overallStats.missed}
            </p>
            <p className="text-2xs text-rose-300/90">Classes absent</p>
          </div>
        </div>

        {/* Card 4: Cancelled / Off */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-amber-500/40 bg-[#261e0d]/80 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Slash className="w-4 h-4 text-amber-400" />
              Cancelled / Off
            </span>
          </div>
          <div className="mt-4 space-y-1.5">
            <p className="text-3xl font-extrabold text-amber-400 font-mono">
              {overallStats.off}
            </p>
            <p className="text-2xs text-amber-300/90">Zero impact on %</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAILY TRACKER                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'TRACKER' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-content-secondary uppercase">Session:</span>

              <div className="flex items-center gap-1 bg-canvas-surface border border-canvas-border rounded-xl px-2 py-1.5 shadow-inner">
                <button
                  onClick={() => shiftDate(-1)}
                  className="p-1 text-content-muted hover:text-content-primary transition-colors focus-visible:outline-none rounded"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-content-primary focus:outline-none cursor-pointer"
                />
                <button
                  onClick={() => shiftDate(1)}
                  className="p-1 text-content-muted hover:text-content-primary transition-colors focus-visible:outline-none rounded"
                  aria-label="Next day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                {DAY_LABELS[selectedDayOfWeek] || 'Today'}
              </span>

              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="btn-secondary px-3 py-1.5 text-xs font-semibold"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAllSubjectsForDate(!showAllSubjectsForDate)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 outline-none ${
                  showAllSubjectsForDate
                    ? 'bg-brand-500 text-white border-brand-400 shadow-sm'
                    : 'bg-canvas-surface text-content-secondary border-canvas-border hover:text-content-primary'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                {showAllSubjectsForDate ? 'Showing All Subjects' : 'Filter: Timetable Only'}
              </button>
            </div>
          </div>

          {/* Search & Threshold Filter Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-content-muted">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject or code..."
                className="w-full h-10 pl-9 pr-8 rounded-xl bg-canvas-subtle border border-canvas-border text-content-primary text-xs outline-none focus:border-brand-500 transition-colors shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-content-muted hover:text-content-primary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs font-semibold">
              {(['ALL', 'SAFE', 'SHORTAGE'] as StatusFilter[]).map((f) => {
                const isSelected = statusFilter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-canvas-elevated text-content-primary border-2 border-brand-500 shadow-sm font-bold'
                        : 'bg-canvas-subtle text-content-muted border-canvas-border hover:text-content-primary'
                    }`}
                  >
                    {f === 'ALL' ? 'All Courses' : f === 'SAFE' ? 'Safe (>75%)' : 'Shortage (<75%)'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject Cards Grid */}
          {displaySubjectsForDate.length === 0 ? (
            <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-10 text-center space-y-3 shadow-sm">
              <Clock className="w-10 h-10 text-content-muted mx-auto" />
              <h3 className="font-bold text-content-primary text-base">
                No classes match for {DAY_LABELS[selectedDayOfWeek] || 'this day'}
              </h3>
              <p className="text-content-secondary text-xs max-w-sm mx-auto">
                No subject records matched your active timetable or search parameters.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowAllSubjectsForDate(true);
                    setSearchQuery('');
                    setStatusFilter('ALL');
                  }}
                  className="btn-secondary px-3.5 py-2 text-xs font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Show All Course Subjects
                </button>
                <Link
                  href="/timetable"
                  className="btn-primary px-3.5 py-2 text-xs font-semibold"
                >
                  <Clock className="w-4 h-4" />
                  Edit Timetable
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displaySubjectsForDate.map((sub) => {
                if (!sub) return null;
                const stats = getSubjectStats(sub);
                const dayRecord = (records || []).find(
                  (r) => r && r.subject_id === sub.id && r.session_date === selectedDate
                );
                const slot = scheduledSlotsForSelectedDate.find((s) => s && s.subject_id === sub.id);
                const isOperating = actionLoadingSubjectId === sub.id;

                return (
                  <div
                    key={sub.id}
                    className="bg-canvas-subtle border border-canvas-border hover:border-canvas-border/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-content-primary text-base">{sub.name}</h3>
                            {sub.code && (
                              <span className="text-2xs font-mono bg-canvas-surface text-content-secondary px-2.5 py-0.5 rounded-lg border border-canvas-border">
                                {sub.code}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-content-secondary mt-1.5 flex-wrap">
                            {slot && slot.start_time ? (
                              <span className="font-mono text-brand-400 font-semibold bg-brand-500/15 border border-brand-500/30 px-2.5 py-0.5 rounded-lg">
                                {formatSlotTime(slot.start_time)} – {formatSlotTime(slot.end_time)}
                              </span>
                            ) : (
                              <span className="text-amber-400 font-medium italic text-2xs">
                                Unscheduled Session
                              </span>
                            )}
                            {(slot?.room_number || sub.room_number) && (
                              <span className="flex items-center gap-1 font-medium">
                                <MapPin className="w-3.5 h-3.5 text-content-muted" />
                                {slot?.room_number || sub.room_number}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-xl font-extrabold font-mono ${
                              stats.status === 'SAFE'
                                ? 'text-status-success'
                                : stats.status === 'SHORTAGE'
                                ? 'text-status-danger'
                                : 'text-content-muted'
                            }`}
                          >
                            {stats.percentage !== null ? `${stats.percentage}%` : '—'}
                          </span>
                          <span className="text-2xs text-content-muted block">
                            Target: {sub.required_percentage || 75}%
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-canvas-surface h-2 rounded-full overflow-hidden mt-3 border border-canvas-border/50">
                        <div
                          className={`h-full transition-all duration-300 ${
                            stats.status === 'SAFE' ? 'bg-status-success' : 'bg-status-danger'
                          }`}
                          style={{ width: `${Math.min(100, stats.percentage || 0)}%` }}
                        />
                      </div>
                    </div>

                    {/* Threshold Advisory Pill */}
                    <div
                      className={`p-3 rounded-xl text-xs leading-relaxed border ${
                        stats.status === 'SAFE'
                          ? 'bg-status-success-bg border-status-success/30 text-emerald-300'
                          : stats.status === 'SHORTAGE'
                          ? 'bg-status-danger-bg border-status-danger/30 text-rose-300'
                          : 'bg-canvas-surface border-canvas-border text-content-secondary'
                      }`}
                    >
                      {stats.status === 'SAFE' && (
                        <span>
                          Safe zone: You can skip <b>{stats.canMiss}</b> {stats.canMiss === 1 ? 'class' : 'classes'} while maintaining above {sub.required_percentage || 75}%.
                        </span>
                      )}
                      {stats.status === 'SHORTAGE' && (
                        <span>
                          Attendance alert: Attend <b>{stats.neededToAttend}</b> consecutive {stats.neededToAttend === 1 ? 'class' : 'classes'} to restore {sub.required_percentage || 75}%.
                        </span>
                      )}
                      {stats.status === 'NO_DATA' && <span>No sessions conducted yet. Record class status below.</span>}
                    </div>

                    {/* Breakdown Numbers */}
                    <div className="flex items-center justify-between text-xs text-content-secondary border-t border-canvas-border pt-3">
                      <span>Attended: <b className="text-content-primary font-mono">{stats.attended}</b></span>
                      <span>Missed: <b className="text-content-primary font-mono">{stats.missed}</b></span>
                      <span>Total: <b className="text-content-primary font-mono">{stats.effective}</b></span>
                      <button
                        onClick={() => handleOpenEditModal(sub)}
                        className="text-2xs text-brand-400 hover:text-brand-300 font-semibold"
                      >
                        Adjust Baseline
                      </button>
                    </div>

                    {/* Marking Buttons with Solid Active States */}
                    <div>
                      <span className="text-2xs font-semibold text-content-muted block mb-1.5">
                        Status for {selectedDate}:
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          disabled={isOperating}
                          onClick={() => handleMarkAttendance(sub.id, 'ATTENDED')}
                          className={`h-10 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border outline-none ${
                            dayRecord?.status === 'ATTENDED'
                              ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm shadow-emerald-950'
                              : 'bg-canvas-surface text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                          }`}
                        >
                          {isOperating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Present
                        </button>
                        <button
                          disabled={isOperating}
                          onClick={() => handleMarkAttendance(sub.id, 'MISSED')}
                          className={`h-10 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border outline-none ${
                            dayRecord?.status === 'MISSED'
                              ? 'bg-rose-500 text-white border-rose-400 shadow-sm shadow-rose-950'
                              : 'bg-canvas-surface text-rose-400 border-rose-500/30 hover:bg-rose-500/10'
                          }`}
                        >
                          {isOperating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          Absent
                        </button>
                        <button
                          disabled={isOperating}
                          onClick={() => handleMarkAttendance(sub.id, 'OFF')}
                          className={`h-10 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border outline-none ${
                            dayRecord?.status === 'OFF'
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm shadow-amber-950'
                              : 'bg-canvas-surface text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
                          }`}
                        >
                          {isOperating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Slash className="w-3.5 h-3.5" />}
                          Off
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SUBJECTS REGISTRY                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'SUBJECTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-content-primary text-sm">Course Subjects ({subjects?.length || 0})</h3>
            <button
              onClick={() => {
                setEditingSubject(null);
                setSubName('');
                setSubCode('');
                setSubLecturer('');
                setSubRoom('');
                setSubTarget('75');
                setSubInitialAttended('0');
                setSubInitialMissed('0');
                setShowAddSubject(true);
              }}
              className="btn-primary px-3.5 py-2 text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Subject
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(subjects || []).map((sub) => {
              if (!sub) return null;
              const stats = getSubjectStats(sub);
              return (
                <div key={sub.id} className="bg-canvas-subtle border border-canvas-border rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-content-primary text-base">{sub.name}</h4>
                      <span className="text-xs text-content-secondary mt-0.5 block font-mono">
                        {sub.code ? `${sub.code} • ` : ''}Target: {sub.required_percentage || 75}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(sub)}
                        className="p-2 text-content-secondary hover:text-content-primary bg-canvas-surface hover:bg-canvas-elevated rounded-xl border border-canvas-border transition-colors"
                        title="Edit Details"
                        aria-label={`Edit ${sub.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingSubjectId(sub.id)}
                        className="p-2 text-content-muted hover:text-status-danger bg-canvas-surface hover:bg-canvas-elevated rounded-xl border border-canvas-border transition-colors"
                        title="Delete Subject"
                        aria-label={`Delete ${sub.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-canvas-surface border border-canvas-border rounded-xl p-3 text-center font-mono">
                    <div>
                      <span className="text-2xs text-content-muted uppercase block font-sans">Attended</span>
                      <span className="text-status-success font-bold text-base">{stats.attended}</span>
                    </div>
                    <div>
                      <span className="text-2xs text-content-muted uppercase block font-sans">Missed</span>
                      <span className="text-status-danger font-bold text-base">{stats.missed}</span>
                    </div>
                    <div>
                      <span className="text-2xs text-content-muted uppercase block font-sans">Total</span>
                      <span className="text-content-primary font-bold text-base">{stats.effective}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEditModal(sub)}
                    className="btn-secondary w-full py-2.5 text-xs font-semibold text-brand-400"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Adjust Baseline Telemetry
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HISTORY LOG ARCHIVE                                                */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORY' && (
        <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-canvas-border pb-3">
            <div>
              <h3 className="font-bold text-content-primary text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-brand-400" />
                Attendance Log Archive ({records?.length || 0})
              </h3>
              <p className="text-xs text-content-secondary mt-0.5">Edit or remove individual historical session records.</p>
            </div>

            <select
              value={historySubjectFilter}
              onChange={(e) => setHistorySubjectFilter(e.target.value)}
              className="bg-canvas-surface border border-canvas-border text-xs text-content-primary px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 cursor-pointer shadow-inner"
            >
              <option value="ALL">All Subjects</option>
              {(subjects || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-canvas-border">
            {(records || []).filter((r) => historySubjectFilter === 'ALL' || r?.subject_id === historySubjectFilter).length === 0 ? (
              <p className="text-xs text-content-muted py-8 text-center">No session logs match the current query.</p>
            ) : (
              (records || [])
                .filter((r) => r && (historySubjectFilter === 'ALL' || r?.subject_id === historySubjectFilter))
                .map((rec) => {
                  const sub = (subjects || []).find((s) => s?.id === rec.subject_id);
                  return (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between bg-canvas-surface border border-canvas-border rounded-xl p-3.5 text-xs shadow-sm"
                    >
                      <div>
                        <span className="font-bold text-content-primary block">{sub?.name || 'Subject'}</span>
                        <span className="font-mono text-content-muted text-2xs">{rec.session_date}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMarkAttendance(rec.subject_id, 'ATTENDED', rec.session_date)}
                          className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-all ${
                            rec.status === 'ATTENDED'
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'bg-canvas-elevated text-content-secondary hover:text-content-primary'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(rec.subject_id, 'MISSED', rec.session_date)}
                          className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-all ${
                            rec.status === 'MISSED'
                              ? 'bg-rose-500 text-white shadow-sm'
                              : 'bg-canvas-elevated text-content-secondary hover:text-content-primary'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="p-1.5 text-content-muted hover:text-status-danger transition-colors ml-1 rounded-lg hover:bg-canvas-elevated"
                          title="Delete Record"
                          aria-label="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SUBJECT */}
      {showAddSubject && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-6 max-w-md w-full shadow-elevated space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
              <h3 className="text-sm font-bold text-content-primary">
                {editingSubject ? 'Edit Subject Telemetry' : 'Add New Subject'}
              </h3>
              <button
                onClick={() => setShowAddSubject(false)}
                className="p-1 text-content-muted hover:text-content-primary rounded-lg transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-content-secondary font-semibold mb-1.5">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrical Power Systems"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full bg-canvas-surface border border-canvas-border rounded-xl px-3.5 py-2.5 text-content-primary text-sm outline-none focus:border-brand-500 shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-content-secondary font-semibold mb-1.5">Subject Code</label>
                  <input
                    type="text"
                    placeholder="e.g. EE301"
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value)}
                    className="w-full bg-canvas-surface border border-canvas-border rounded-xl px-3.5 py-2.5 text-content-primary text-sm outline-none focus:border-brand-500 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-content-secondary font-semibold mb-1.5">Target Minimum %</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={subTarget}
                    onChange={(e) => setSubTarget(e.target.value)}
                    className="w-full bg-canvas-surface border border-canvas-border rounded-xl px-3.5 py-2.5 text-content-primary text-sm outline-none focus:border-brand-500 shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-content-secondary font-semibold mb-1.5">Instructor</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Rao"
                    value={subLecturer}
                    onChange={(e) => setSubLecturer(e.target.value)}
                    className="w-full bg-canvas-surface border border-canvas-border rounded-xl px-3.5 py-2.5 text-content-primary text-sm outline-none focus:border-brand-500 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-content-secondary font-semibold mb-1.5">Room / Hall</label>
                  <input
                    type="text"
                    placeholder="e.g. L-204"
                    value={subRoom}
                    onChange={(e) => setSubRoom(e.target.value)}
                    className="w-full bg-canvas-surface border border-canvas-border rounded-xl px-3.5 py-2.5 text-content-primary text-sm outline-none focus:border-brand-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Baseline Numbers */}
              <div className="bg-canvas-surface border border-canvas-border rounded-xl p-3.5 space-y-2 shadow-inner">
                <span className="font-bold text-content-secondary text-2xs block uppercase tracking-wider">
                  Baseline Import (Past Classes)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-status-success font-semibold mb-1">Past Attended</label>
                    <input
                      type="number"
                      min="0"
                      value={subInitialAttended}
                      onChange={(e) => setSubInitialAttended(e.target.value)}
                      className="w-full bg-canvas-subtle border border-canvas-border rounded-lg px-3 py-2 text-content-primary font-mono outline-none focus:border-brand-500 shadow-inner text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-status-danger font-semibold mb-1">Past Missed</label>
                    <input
                      type="number"
                      min="0"
                      value={subInitialMissed}
                      onChange={(e) => setSubInitialMissed(e.target.value)}
                      className="w-full bg-canvas-subtle border border-canvas-border rounded-lg px-3 py-2 text-content-primary font-mono outline-none focus:border-brand-500 shadow-inner text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-canvas-border">
                <button
                  type="button"
                  onClick={() => setShowAddSubject(false)}
                  className="btn-secondary px-4 py-2.5 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="btn-primary px-5 py-2.5 text-xs font-bold shadow-brand-glow"
                >
                  {modalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingSubject ? 'Save Changes' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION DIALOG */}
      {deletingSubjectId && (
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
                <h3 className="text-sm font-bold text-content-primary">Delete Subject?</h3>
                <p className="text-2xs text-content-secondary mt-0.5">
                  This permanently purges this course and all associated attendance records.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-canvas-border">
              <button
                type="button"
                onClick={() => setDeletingSubjectId(null)}
                className="btn-secondary px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSubject}
                className="px-4 py-2 rounded-xl bg-status-danger hover:bg-status-danger/90 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}