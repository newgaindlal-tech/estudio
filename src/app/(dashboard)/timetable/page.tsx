'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Subject, TimetableSlot, DayOfWeek, AttendanceRecord, AttendanceStatus } from '@/types/database.types';
import {
  Clock,
  Plus,
  Trash2,
  Calendar,
  BookOpen,
  MapPin,
  CheckCircle2,
  XCircle,
  Slash,
  Loader2,
  Sparkles,
  ArrowRight,
  Sun,
  User,
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
  const dayIdx = new Date().getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
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
  const supabase = createClient();

  const todayDay = useMemo(() => getTodayDayOfWeek(), []);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDay);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Database States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);

  // Modal / Add Slot Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [slotRoom, setSlotRoom] = useState('');

  const todayDateStr = new Date().toISOString().split('T')[0];

  // Fetch all timetable slots & subjects
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
    if (recRes.data) setTodayRecords(recRes.data);

    setLoading(false);
  }, [supabase, todayDateStr, selectedSubjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter slots for the currently selected day tab
  const daySlots = useMemo(() => {
    return slots
      .filter((s) => s.day_of_week === selectedDay)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [slots, selectedDay]);

  // Quick Attendance Marking directly from Timetable (if selectedDay is today)
  const handleMarkAttendance = async (subjectId: string, status: AttendanceStatus) => {
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = todayRecords.find((r) => r.subject_id === subjectId);

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
        session_date: todayDateStr,
        slot_order: 1,
        status,
      });
    }

    await fetchData();
    setActionLoading(false);
  };

  // Add new timetable slot
  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const chosenSub = subjects.find((s) => s.id === selectedSubjectId);

    await supabase.from('timetable_slots').insert({
      user_id: user.id,
      subject_id: selectedSubjectId,
      day_of_week: selectedDay,
      start_time: startTime,
      end_time: endTime,
      room_number: slotRoom.trim() || chosenSub?.room_number || null,
    });

    setSlotRoom('');
    setShowAddModal(false);
    await fetchData();
    setActionLoading(false);
  };

  // Delete slot
  const handleDeleteSlot = async (slotId: string) => {
    setActionLoading(true);
    await supabase.from('timetable_slots').delete().eq('id', slotId);
    await fetchData();
    setActionLoading(false);
  };

  const formatTimeDisplay = (timeStr: string) => {
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
        <p className="text-xs text-slate-400">Loading your college routine...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Clock className="w-7 h-7 text-amber-500" />
            Weekly Timetable & Routine
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Auto-detects today&apos;s schedule with 7-day routine isolation and instant attendance tagging.
          </p>
        </div>

        <button
          onClick={() => {
            if (subjects.length === 0) {
              alert('Please create at least one subject in Attendance first!');
              return;
            }
            setShowAddModal(true);
          }}
          className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto shadow-lg shadow-amber-900/20"
        >
          <Plus className="w-4 h-4" />
          Add Class to {DAYS.find((d) => d.key === selectedDay)?.label}
        </button>
      </div>

      {/* 7-DAY NAVIGATION SELECTOR (MONDAY TO SUNDAY) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-xl">
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((day) => {
            const isToday = day.key === todayDay;
            const isSelected = day.key === selectedDay;
            const count = slots.filter((s) => s.day_of_week === day.key).length;

            return (
              <button
                key={day.key}
                onClick={() => setSelectedDay(day.key)}
                className={`py-3 px-1 rounded-xl flex flex-col items-center justify-center transition relative ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {/* Active Day Indicator dot */}
                {isToday && (
                  <span
                    className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-slate-950' : 'bg-emerald-400'
                    }`}
                    title="Today"
                  />
                )}
                <span className="text-xs uppercase tracking-wider">{day.short}</span>
                <span
                  className={`text-[10px] mt-0.5 px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-slate-900 text-amber-300 font-mono'
                      : count > 0
                      ? 'bg-slate-800 text-slate-300'
                      : 'text-slate-600'
                  }`}
                >
                  {count} {count === 1 ? 'class' : 'classes'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DAY BANNER & STATUS */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          <h3 className="text-base font-bold text-white">
            {DAYS.find((d) => d.key === selectedDay)?.label}&apos;s Schedule
          </h3>
          {selectedDay === todayDay && (
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
              <Sun className="w-3 h-3 text-emerald-400" /> Today Active
            </span>
          )}
        </div>

        <span className="text-xs text-slate-400">
          {daySlots.length} {daySlots.length === 1 ? 'Period' : 'Periods'} scheduled
        </span>
      </div>

      {/* TIMELINE LIST FOR SELECTED DAY */}
      {daySlots.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Clock className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-white font-bold text-base">No classes scheduled for {DAYS.find((d) => d.key === selectedDay)?.label}</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            Enjoy your free day or add college lecture slots using the button above.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Add First Class
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {daySlots.map((slot, index) => {
            const sub = subjects.find((s) => s.id === slot.subject_id);
            const todayRec = todayRecords.find((r) => r.subject_id === slot.subject_id);

            return (
              <div
                key={slot.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition shadow-sm"
              >
                {/* Time & Subject Information */}
                <div className="flex items-start sm:items-center gap-4">
                  {/* Period Badge */}
                  <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-300 font-bold flex items-center justify-center text-sm font-mono flex-shrink-0">
                    #{index + 1}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-bold text-base">{sub?.name || 'Unknown Subject'}</h4>
                      {sub?.code && (
                        <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                          {sub.code}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-mono text-amber-400 font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTimeDisplay(slot.start_time)} – {formatTimeDisplay(slot.end_time)}
                      </span>

                      {(slot.room_number || sub?.room_number) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {slot.room_number || sub?.room_number}
                        </span>
                      )}

                      {sub?.lecturer_name && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <User className="w-3.5 h-3.5" />
                          {sub.lecturer_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Attendance actions (if today) & Delete */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  {/* Today Quick Attendance Marker */}
                  {selectedDay === todayDay ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={actionLoading}
                        onClick={() => handleMarkAttendance(slot.subject_id, 'ATTENDED')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition border ${
                          todayRec?.status === 'ATTENDED'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                        title="Mark Present Today"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Present
                      </button>

                      <button
                        disabled={actionLoading}
                        onClick={() => handleMarkAttendance(slot.subject_id, 'MISSED')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition border ${
                          todayRec?.status === 'MISSED'
                            ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-900/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                        title="Mark Absent Today"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Absent
                      </button>

                      <button
                        disabled={actionLoading}
                        onClick={() => handleMarkAttendance(slot.subject_id, 'OFF')}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition border ${
                          todayRec?.status === 'OFF'
                            ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-900/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                        title="Class Cancelled"
                      >
                        <Slash className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">
                      Scheduled for {DAYS.find((d) => d.key === selectedDay)?.short}
                    </span>
                  )}

                  {/* Remove Slot */}
                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg transition"
                    title="Remove from Timetable"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD TIMETABLE SLOT                                                 */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Add Class to {DAYS.find((d) => d.key === selectedDay)?.label}
            </h3>

            <form onSubmit={handleAddSlot} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Subject *</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Room / Hall (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. LT-3 or Machines Lab"
                  value={slotRoom}
                  onChange={(e) => setSlotRoom(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}