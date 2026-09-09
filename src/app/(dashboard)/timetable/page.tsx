'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Subject,
  TimetableSlot,
  DayOfWeek,
  AttendanceRecord,
  AttendanceStatus,
} from '@/types/database.types';
import {
  Clock,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Slash,
  Loader2,
  Sun,
  User,
  X,
  AlertCircle,
} from 'lucide-react';

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'MONDAY', label: 'Monday', short: 'Mon' },
  { key: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { key: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { key: 'FRIDAY', label: 'Friday', short: 'Fri' },
  { key: 'SATURDAY', label: 'Saturday', short: 'Sat' },
  { key: 'SUNDAY', label: 'Sunday', short: 'Sun' },
];

function getTodayDayOfWeek(): DayOfWeek {
  const dayIdx = new Date().getDay();
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

export default function TimetablePage() {
  const supabase = useMemo(() => createClient(), []);

  const todayDay = useMemo(() => getTodayDayOfWeek(), []);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDay);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Database States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [slotRoom, setSlotRoom] = useState('');

  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

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

      const [subRes, slotRes, recRes] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase.from('timetable_slots').select('*').order('start_time'),
        supabase.from('attendance_records').select('*').eq('session_date', todayDateStr),
      ]);

      if (subRes.data) {
        setSubjects(subRes.data);
        if (subRes.data.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(subRes.data[0].id);
        }
      }
      if (slotRes.data) setSlots(slotRes.data);
      if (recRes.data) setTodayRecords(recRes.data as AttendanceRecord[]);
    } catch (err: any) {
      console.error('Failed to load routine telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, todayDateStr, selectedSubjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modal ESC Key Dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAddModal) {
        setShowAddModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal]);

  const daySlots = useMemo(() => {
    return slots
      .filter((s) => s.day_of_week === selectedDay)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  }, [slots, selectedDay]);

  // Optimistic Attendance Marking
  const handleMarkAttendance = async (subjectId: string, status: AttendanceStatus) => {
    setActionLoadingId(subjectId);
    const previousRecords = [...todayRecords];

    const existingIndex = todayRecords.findIndex((r) => r.subject_id === subjectId);
    let nextRecords = [...todayRecords];

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
        session_date: todayDateStr,
        slot_order: 1,
        status,
        remarks: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    setTodayRecords(nextRecords);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const existing = previousRecords.find((r) => r.subject_id === subjectId);

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
            session_date: todayDateStr,
            slot_order: 1,
            status,
            remarks: null,
          })
          .select()
          .single();
        if (error) throw error;

        if (data) {
          setTodayRecords((current) =>
            current.map((r) => (r.id.startsWith('temp-') && r.subject_id === subjectId ? (data as AttendanceRecord) : r))
          );
        }
      }
    } catch (err: any) {
      console.error('Failed to mark attendance, rolling back:', err);
      setTodayRecords(previousRecords);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;

    setModalLoading(true);
    setErrorMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const chosenSub = subjects.find((s) => s.id === selectedSubjectId);

      const { data, error } = await supabase
        .from('timetable_slots')
        .insert({
          user_id: user.id,
          subject_id: selectedSubjectId,
          day_of_week: selectedDay,
          start_time: startTime.trim() || null,
          end_time: endTime.trim() || null,
          room_number: slotRoom.trim() || chosenSub?.room_number || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSlots((prev) => [...prev, data]);
      }

      setStartTime('');
      setEndTime('');
      setSlotRoom('');
      setShowAddModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add class slot.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    const previousSlots = [...slots];
    setSlots((prev) => prev.filter((s) => s.id !== slotId));

    try {
      const { error } = await supabase.from('timetable_slots').delete().eq('id', slotId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Failed to delete slot, rolling back:', err);
      setSlots(previousSlots);
    }
  };

  const formatTimeDisplay = (timeStr?: string | null) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
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
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-xs text-content-muted font-medium">Synchronizing college routine...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20 px-2 sm:px-0 select-none">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-canvas-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-amber-400 shrink-0" />
            Weekly Routine & Timetable
          </h1>
          <p className="text-content-secondary text-xs mt-0.5">
            Seven-day schedule isolation with integrated same-day attendance synchronization.
          </p>
        </div>

        <button
          onClick={() => {
            if (subjects.length === 0) {
              setErrorMessage('Register at least one course subject in the Attendance module first.');
              return;
            }
            setShowAddModal(true);
          }}
          className="btn-primary px-4 py-2.5 text-xs font-bold shadow-sm w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Period to {DAYS.find((d) => d.key === selectedDay)?.short}</span>
        </button>
      </div>

      {/* Error Alert View */}
      {errorMessage && (
        <div
          role="alert"
          className="bg-status-danger-bg border border-status-danger/40 text-rose-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2.5 animate-in fade-in duration-150 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-status-danger" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-300/70 hover:text-rose-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 7-Day Horizontal Selector */}
      <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-1.5 sm:p-2 shadow-elevated">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {DAYS.map((day) => {
            const isToday = day.key === todayDay;
            const isSelected = day.key === selectedDay;
            const count = slots.filter((s) => s.day_of_week === day.key).length;

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDay(day.key)}
                className={`shrink-0 min-w-[5rem] sm:min-w-0 sm:flex-1 py-2.5 px-2 rounded-xl flex flex-col items-center justify-center transition-all relative border outline-none ${
                  isSelected
                    ? 'bg-brand-500 text-white border-brand-400 shadow-sm shadow-brand-glow font-bold'
                    : 'bg-canvas-surface text-content-secondary border-canvas-border hover:bg-canvas-elevated hover:text-content-primary'
                }`}
              >
                {isToday && (
                  <span
                    className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full shadow-sm ${
                      isSelected ? 'bg-white' : 'bg-emerald-400'
                    }`}
                    title="Active device weekday"
                  />
                )}
                <span className="text-xs uppercase tracking-wider font-bold">{day.short}</span>
                <span
                  className={`text-2xs mt-1 px-2 py-0.5 rounded-lg whitespace-nowrap font-mono ${
                    isSelected
                      ? 'bg-white/20 text-white font-semibold'
                      : count > 0
                      ? 'bg-canvas-subtle text-content-secondary'
                      : 'text-content-muted'
                  }`}
                >
                  {count} {count === 1 ? 'period' : 'periods'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule State Banner */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-400" />
          <h2 className="text-sm sm:text-base font-bold text-content-primary">
            {DAYS.find((d) => d.key === selectedDay)?.label}&apos;s Routine
          </h2>
          {selectedDay === todayDay && (
            <span className="bg-status-success-bg text-emerald-300 border border-status-success/40 text-2xs px-2.5 py-0.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm">
              <Sun className="w-3 h-3 text-status-success" /> Active Session
            </span>
          )}
        </div>

        <span className="text-2xs font-mono text-content-muted">
          {daySlots.length} {daySlots.length === 1 ? 'Class Slot' : 'Class Slots'}
        </span>
      </div>

      {/* Routine Slots List */}
      {daySlots.length === 0 ? (
        <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-8 sm:p-12 text-center space-y-3 shadow-sm">
          <Clock className="w-10 h-10 text-content-muted mx-auto" />
          <h3 className="text-content-primary font-bold text-sm sm:text-base">
            No routine slots for {DAYS.find((d) => d.key === selectedDay)?.label}
          </h3>
          <p className="text-content-secondary text-xs max-w-sm mx-auto">
            No academic sessions are assigned for this day. Enjoy your study break or register upcoming lectures.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary px-4 py-2.5 text-xs font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Class</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {daySlots.map((slot, index) => {
            const sub = subjects.find((s) => s.id === slot.subject_id);
            const todayRec = todayRecords.find((r) => r.subject_id === slot.subject_id);
            const formattedStart = formatTimeDisplay(slot.start_time);
            const formattedEnd = formatTimeDisplay(slot.end_time);
            const isOperating = actionLoadingId === slot.subject_id;

            return (
              <div
                key={slot.id}
                className="bg-canvas-subtle border border-canvas-border hover:border-canvas-border/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 transition shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-canvas-surface border border-canvas-border text-brand-400 font-bold flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 shadow-inner">
                      #{index + 1}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-content-primary font-bold text-sm sm:text-base truncate">
                          {sub?.name || 'Unmapped Course'}
                        </h4>
                        {sub?.code && (
                          <span className="text-2xs font-mono bg-canvas-surface text-content-secondary px-2 py-0.5 rounded-lg border border-canvas-border shrink-0">
                            {sub.code}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-content-secondary">
                        {formattedStart ? (
                          <span className="flex items-center gap-1.5 font-mono text-brand-400 font-semibold bg-brand-500/15 border border-brand-500/30 px-2.5 py-0.5 rounded-lg text-2xs sm:text-xs">
                            <Clock className="w-3 h-3 shrink-0" />
                            {formattedStart} {formattedEnd ? `– ${formattedEnd}` : ''}
                          </span>
                        ) : (
                          <span className="text-content-muted text-2xs italic">Flexible / Unscheduled</span>
                        )}

                        {(slot.room_number || sub?.room_number) && (
                          <span className="flex items-center gap-1 text-2xs sm:text-xs font-medium">
                            <MapPin className="w-3 h-3 text-content-muted shrink-0" />
                            {slot.room_number || sub?.room_number}
                          </span>
                        )}

                        {sub?.lecturer_name && (
                          <span className="flex items-center gap-1 text-2xs sm:text-xs font-medium">
                            <User className="w-3 h-3 text-content-muted shrink-0" />
                            {sub.lecturer_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="p-2 text-content-muted hover:text-status-danger bg-canvas-surface hover:bg-canvas-elevated border border-canvas-border rounded-xl transition-colors shrink-0"
                    title="Remove from Timetable"
                    aria-label={`Remove slot for ${sub?.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Instant Attendance Fast-Action Bar (Today Only) */}
                {selectedDay === todayDay && (
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-canvas-border">
                    <span className="text-2xs text-content-muted font-bold uppercase tracking-wider">Log Today:</span>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={isOperating}
                        onClick={() => handleMarkAttendance(slot.subject_id, 'ATTENDED')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border outline-none ${
                          todayRec?.status === 'ATTENDED'
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm shadow-emerald-950'
                            : 'bg-canvas-surface text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                        }`}
                      >
                        {isOperating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Present
                      </button>

                      <button
                        disabled={isOperating}
                        onClick={() => handleMarkAttendance(slot.subject_id, 'MISSED')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border outline-none ${
                          todayRec?.status === 'MISSED'
                            ? 'bg-rose-500 text-white border-rose-400 shadow-sm shadow-rose-950'
                            : 'bg-canvas-surface text-rose-400 border-rose-500/30 hover:bg-rose-500/10'
                        }`}
                      >
                        {isOperating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Absent
                      </button>

                      <button
                        disabled={isOperating}
                        onClick={() => handleMarkAttendance(slot.subject_id, 'OFF')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center transition-all border outline-none ${
                          todayRec?.status === 'OFF'
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm shadow-amber-950'
                            : 'bg-canvas-surface text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
                        }`}
                        title="Class Cancelled / Free"
                        aria-label="Mark Class Cancelled"
                      >
                        <Slash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Timetable Slot */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3.5 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
        >
          <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-elevated space-y-4 my-auto max-h-[90dvh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
              <h3 className="text-sm sm:text-base font-bold text-content-primary flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-400" />
                Schedule Class ({DAYS.find((d) => d.key === selectedDay)?.label})
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-content-muted hover:text-content-primary rounded-lg transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-content-secondary font-semibold mb-1.5">Target Subject *</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full h-11 bg-canvas-surface border border-canvas-border rounded-xl px-3.5 text-content-primary text-sm outline-none focus:border-brand-500 cursor-pointer shadow-inner"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id} className="bg-canvas-surface text-content-primary">
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timing Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-content-secondary font-semibold mb-1.5">Start Time (Optional)</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full h-11 bg-canvas-surface border border-canvas-border rounded-xl px-3.5 text-content-primary text-sm font-mono outline-none focus:border-brand-500 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-content-secondary font-semibold mb-1.5">End Time (Optional)</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full h-11 bg-canvas-surface border border-canvas-border rounded-xl px-3.5 text-content-primary text-sm font-mono outline-none focus:border-brand-500 shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-content-secondary font-semibold mb-1.5">Room / Lecture Hall (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Hall 4B or Lab 2"
                  value={slotRoom}
                  onChange={(e) => setSlotRoom(e.target.value)}
                  className="w-full h-11 bg-canvas-surface border border-canvas-border rounded-xl px-3.5 text-content-primary text-sm placeholder:text-content-muted outline-none focus:border-brand-500 shadow-inner"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-canvas-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  <span>Save Period</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}