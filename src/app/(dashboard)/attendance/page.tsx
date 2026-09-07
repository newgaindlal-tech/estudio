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
  BookOpen,
  MapPin,
  Calendar,
  History,
  SlidersHorizontal,
  Clock,
  Filter,
} from 'lucide-react';
import Link from 'next/link';

function getDayOfWeekFromDateString(dateStr: string): DayOfWeek {
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
  return mapping[dayIdx];
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

export default function AttendanceManagerPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [activeTab, setActiveTab] = useState<'TRACKER' | 'SUBJECTS' | 'HISTORY'>('TRACKER');
  const [showAllSubjectsForDate, setShowAllSubjectsForDate] = useState(false);

  // Modal / Form States
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subLecturer, setSubLecturer] = useState('');
  const [subRoom, setSubRoom] = useState('');
  const [subTarget, setSubTarget] = useState('75');
  const [subInitialAttended, setSubInitialAttended] = useState('0');
  const [subInitialMissed, setSubInitialMissed] = useState('0');

  const [historySubjectFilter, setHistorySubjectFilter] = useState<string>('ALL');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [subRes, recRes, slotRes] = await Promise.all([
      supabase.from('subjects').select('*').order('name'),
      supabase.from('attendance_records').select('*').order('session_date', { ascending: false }),
      supabase.from('timetable_slots').select('*').order('start_time'),
    ]);

    if (subRes.data) setSubjects(subRes.data);
    if (recRes.data) setRecords(recRes.data);
    if (slotRes.data) setTimetableSlots(slotRes.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedDayOfWeek = useMemo(
    () => getDayOfWeekFromDateString(selectedDate),
    [selectedDate]
  );

  const scheduledSlotsForSelectedDate = useMemo(() => {
    return timetableSlots
      .filter((s) => s.day_of_week === selectedDayOfWeek)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [timetableSlots, selectedDayOfWeek]);

  const displaySubjectsForDate = useMemo(() => {
    if (showAllSubjectsForDate) return subjects;
    const scheduledSubjectIds = new Set(scheduledSlotsForSelectedDate.map((s) => s.subject_id));
    return subjects.filter((s) => scheduledSubjectIds.has(s.id));
  }, [subjects, scheduledSlotsForSelectedDate, showAllSubjectsForDate]);

  const getSubjectStats = useCallback(
    (subject: Subject) => {
      const subRecords = records.filter((r) => r.subject_id === subject.id);
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

  const overallStats = useMemo(() => {
    let totalAttended = 0;
    let totalMissed = 0;

    subjects.forEach((s) => {
      totalAttended += s.initial_attended || 0;
      totalMissed += s.initial_missed || 0;
    });

    totalAttended += records.filter((r) => r.status === 'ATTENDED').length;
    totalMissed += records.filter((r) => r.status === 'MISSED').length;
    const totalOff = records.filter((r) => r.status === 'OFF').length;

    const totalEffective = totalAttended + totalMissed;

    if (totalEffective === 0) {
      return { percentage: null, attended: 0, missed: 0, off: totalOff, totalEffective: 0 };
    }

    const pct = Math.round((totalAttended / totalEffective) * 1000) / 10;
    return { percentage: pct, attended: totalAttended, missed: totalMissed, off: totalOff, totalEffective };
  }, [subjects, records]);

  const handleMarkAttendance = async (
    subjectId: string,
    status: AttendanceStatus,
    targetDate = selectedDate
  ) => {
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = records.find(
      (r) => r.subject_id === subjectId && r.session_date === targetDate
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
        session_date: targetDate,
        slot_order: 1,
        status,
      });
    }

    await fetchData();
    setActionLoading(false);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
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
        color_code: '#2563EB',
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
    setActionLoading(false);
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Delete this subject and all its attendance history?')) return;
    setActionLoading(true);
    await supabase.from('subjects').delete().eq('id', id);
    await fetchData();
    setActionLoading(false);
  };

  const handleOpenEditModal = (s: Subject) => {
    setEditingSubject(s);
    setSubName(s.name);
    setSubCode(s.code || '');
    setSubLecturer(s.lecturer_name || '');
    setSubRoom(s.room_number || '');
    setSubTarget(s.required_percentage?.toString() || '75');
    setSubInitialAttended((s.initial_attended || 0).toString());
    setSubInitialMissed((s.initial_missed || 0).toString());
    setShowAddSubject(true);
  };

  const handleDeleteRecord = async (recordId: string) => {
    setActionLoading(true);
    await supabase.from('attendance_records').delete().eq('id', recordId);
    await fetchData();
    setActionLoading(false);
  };

  const shiftDate = (days: number) => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + days);
    const newYear = d.getFullYear();
    const newMonth = String(d.getMonth() + 1).padStart(2, '0');
    const newDay = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${newYear}-${newMonth}-${newDay}`);
  };

  const formatSlotTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${m} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-xs text-slate-400 font-medium">Syncing attendance data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <CalendarCheck className="w-6 h-6 text-blue-500" />
            Attendance System
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Verified target calculations with timetable-driven daily sessions.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="inline-flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('TRACKER')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'TRACKER' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tracker
          </button>
          <button
            onClick={() => setActiveTab('SUBJECTS')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'SUBJECTS' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Subjects ({subjects.length})
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'HISTORY' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Logs ({records.length})
          </button>
        </div>
      </div>

      {/* Aggregate Metric Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Average</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            {overallStats.percentage !== null ? `${overallStats.percentage}%` : '—'}
          </p>
          <span className="text-[11px] text-slate-500 block mt-0.5">{overallStats.totalEffective} recorded sessions</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">Attended</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">{overallStats.attended}</p>
          <span className="text-[11px] text-slate-500 block mt-0.5">Classes present</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block">Missed</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">{overallStats.missed}</p>
          <span className="text-[11px] text-slate-500 block mt-0.5">Classes absent</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">Cancelled</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">{overallStats.off}</p>
          <span className="text-[11px] text-slate-500 block mt-0.5">Zero impact on %</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAILY TRACKER                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'TRACKER' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Session:</span>
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
                <button
                  onClick={() => shiftDate(-1)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                />
                <button
                  onClick={() => shiftDate(1)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                  aria-label="Next day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <span className="text-xs font-bold px-2 py-1 rounded bg-amber-950/60 border border-amber-900 text-amber-300">
                {DAY_LABELS[selectedDayOfWeek]}
              </span>

              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
              >
                Today
              </button>
            </div>

            <button
              onClick={() => setShowAllSubjectsForDate(!showAllSubjectsForDate)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                showAllSubjectsForDate
                  ? 'bg-purple-950/70 border-purple-800 text-purple-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {showAllSubjectsForDate ? 'Showing All Subjects' : 'Filter: Scheduled Only'}
            </button>
          </div>

          {/* Cards Display */}
          {displaySubjectsForDate.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <Clock className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="font-bold text-white text-base">
                No classes scheduled for {DAY_LABELS[selectedDayOfWeek]}
              </h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                Your timetable has no classes assigned for this day of the week.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setShowAllSubjectsForDate(true)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Mark Extra Class
                </button>
                <Link
                  href="/timetable"
                  className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4" />
                  Edit Timetable
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displaySubjectsForDate.map((sub) => {
                const stats = getSubjectStats(sub);
                const dayRecord = records.find(
                  (r) => r.subject_id === sub.id && r.session_date === selectedDate
                );
                const slot = scheduledSlotsForSelectedDate.find((s) => s.subject_id === sub.id);

                return (
                  <div
                    key={sub.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm"
                  >
                    <div>
                      {/* Top Row: Name + Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-white text-base">{sub.name}</h3>
                            {sub.code && (
                              <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                                {sub.code}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5">
                            {slot ? (
                              <span className="font-mono text-amber-400 font-semibold bg-amber-950/40 border border-amber-900/60 px-2 py-0.5 rounded">
                                {formatSlotTime(slot.start_time)} – {formatSlotTime(slot.end_time)}
                              </span>
                            ) : (
                              <span className="text-purple-400 font-medium italic text-[11px]">
                                Unscheduled / Extra Session
                              </span>
                            )}
                            {(slot?.room_number || sub.room_number) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                {slot?.room_number || sub.room_number}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Percentage Pill */}
                        <div className="text-right shrink-0">
                          <span
                            className={`text-xl font-extrabold ${
                              stats.status === 'SAFE'
                                ? 'text-emerald-400'
                                : stats.status === 'SHORTAGE'
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {stats.percentage !== null ? `${stats.percentage}%` : '—'}
                          </span>
                          <span className="text-[10px] text-slate-500 block">Req: {sub.required_percentage}%</span>
                        </div>
                      </div>

                      {/* Visual Bar */}
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
                        <div
                          className={`h-full transition-all duration-300 ${
                            stats.status === 'SAFE' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, stats.percentage || 0)}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Feedback Banner */}
                    <div
                      className={`p-3 rounded-xl text-xs leading-relaxed border ${
                        stats.status === 'SAFE'
                          ? 'bg-emerald-950/40 border-emerald-900 text-emerald-300'
                          : stats.status === 'SHORTAGE'
                          ? 'bg-rose-950/40 border-rose-900 text-rose-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {stats.status === 'SAFE' && (
                        <span>
                          Safe: You can miss <b>{stats.canMiss}</b> more {stats.canMiss === 1 ? 'class' : 'classes'} without dipping below {sub.required_percentage}%.
                        </span>
                      )}
                      {stats.status === 'SHORTAGE' && (
                        <span>
                          Shortage: Attend <b>{stats.neededToAttend}</b> consecutive {stats.neededToAttend === 1 ? 'class' : 'classes'} to restore {sub.required_percentage}%.
                        </span>
                      )}
                      {stats.status === 'NO_DATA' && <span>No sessions conducted yet. Mark status below.</span>}
                    </div>

                    {/* Counter Summary */}
                    <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-3">
                      <span>Attended: <b className="text-white">{stats.attended}</b></span>
                      <span>Missed: <b className="text-white">{stats.missed}</b></span>
                      <span>Total: <b className="text-white">{stats.effective}</b></span>
                      <button
                        onClick={() => handleOpenEditModal(sub)}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
                      >
                        Edit Baseline
                      </button>
                    </div>

                    {/* Quick Action Button Group */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                        Mark Status for {selectedDate}:
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          disabled={actionLoading}
                          onClick={() => handleMarkAttendance(sub.id, 'ATTENDED')}
                          className={`py-2 px-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border ${
                            dayRecord?.status === 'ATTENDED'
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-900/30'
                              : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Present
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleMarkAttendance(sub.id, 'MISSED')}
                          className={`py-2 px-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border ${
                            dayRecord?.status === 'MISSED'
                              ? 'bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-900/30'
                              : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                          Absent
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleMarkAttendance(sub.id, 'OFF')}
                          className={`py-2 px-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border ${
                            dayRecord?.status === 'OFF'
                              ? 'bg-amber-600 text-white border-amber-500 shadow-sm shadow-amber-900/30'
                              : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                          }`}
                        >
                          <Slash className="w-3.5 h-3.5" />
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
      {/* TAB 2: SUBJECTS & DIRECT ATTENDANCE BASELINE                              */}
      {/* ========================================================================= */}
      {activeTab === 'SUBJECTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Course Subjects ({subjects.length})</h3>
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
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Add Subject
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map((sub) => {
              const stats = getSubjectStats(sub);
              return (
                <div key={sub.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-base">{sub.name}</h4>
                      <span className="text-xs text-slate-400 mt-0.5 block">
                        {sub.code ? `${sub.code} • ` : ''}Target: {sub.required_percentage}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(sub)}
                        className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                        title="Edit Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(sub.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3 text-center font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-sans">Attended</span>
                      <span className="text-emerald-400 font-bold text-base">{stats.attended}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-sans">Missed</span>
                      <span className="text-rose-400 font-bold text-base">{stats.missed}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-sans">Total</span>
                      <span className="text-white font-bold text-base">{stats.effective}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEditModal(sub)}
                    className="w-full py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-blue-300 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Adjust Baseline Numbers
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DAILY LOG ARCHIVE & EDITING                                        */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORY' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                Attendance Log Archive ({records.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Edit or remove past logged sessions.</p>
            </div>

            <select
              value={historySubjectFilter}
              onChange={(e) => setHistorySubjectFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-white px-3 py-1.5 rounded-lg focus:outline-none"
            >
              <option value="ALL">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {records.filter((r) => historySubjectFilter === 'ALL' || r.subject_id === historySubjectFilter).length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No session logs found.</p>
            ) : (
              records
                .filter((r) => historySubjectFilter === 'ALL' || r.subject_id === historySubjectFilter)
                .map((rec) => {
                  const sub = subjects.find((s) => s.id === rec.subject_id);
                  return (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block">{sub?.name || 'Subject'}</span>
                        <span className="font-mono text-slate-400 text-[11px]">{rec.session_date}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMarkAttendance(rec.subject_id, 'ATTENDED', rec.session_date)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                            rec.status === 'ATTENDED' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(rec.subject_id, 'MISSED', rec.session_date)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                            rec.status === 'MISSED' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors ml-1"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* ADD / EDIT SUBJECT MODAL */}
      {showAddSubject && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {editingSubject ? 'Edit Subject & Baseline' : 'Add New Subject'}
            </h3>

            <form onSubmit={handleSaveSubject} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrical Power Systems"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Subject Code</label>
                  <input
                    type="text"
                    placeholder="e.g. EE302"
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Target Attendance %</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={subTarget}
                    onChange={(e) => setSubTarget(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              {/* Baseline Numbers */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <span className="font-bold text-slate-300 text-[11px] block">Direct Baseline Numbers:</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-emerald-400 font-semibold mb-1">Past Attended</label>
                    <input
                      type="number"
                      min="0"
                      value={subInitialAttended}
                      onChange={(e) => setSubInitialAttended(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-rose-400 font-semibold mb-1">Past Missed</label>
                    <input
                      type="number"
                      min="0"
                      value={subInitialMissed}
                      onChange={(e) => setSubInitialMissed(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSubject(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  {editingSubject ? 'Save Changes' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}