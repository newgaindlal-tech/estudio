'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Subject, TimetableSlot, DayOfWeek, AttendanceRecord, AttendanceStatus } from '@/types/database.types';
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
  const supabase = createClient();

  const todayDay = useMemo(() => getTodayDayOfWeek(), []);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDay);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Database States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);

  // Modal / Add Slot Form State (Timings optional: default empty)
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [slotRoom, setSlotRoom] = useState('');

  const todayDateStr = new Date().toISOString().split('T')[0];

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

  const daySlots = useMemo(() => {
    return slots
      .filter((s) => s.day_of_week === selectedDay)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  }, [slots, selectedDay]);

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
      start_time: startTime.trim() || null,
      end_time: endTime.trim() || null,
      room_number: slotRoom.trim() || chosenSub?.room_number || null,
    });

    setStartTime('');
    setEndTime('');
    setSlotRoom('');
    setShowAddModal(false);
    await fetchData();
    setActionLoading(false);
  };

  const handleDeleteSlot = async (slotId: string) => {
    setActionLoading(true);
    await supabase.from('timetable_slots').delete().eq('id', slotId);
    await fetchData();
    setActionLoading(false);
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-xs text-slate-400">Loading your college routine...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-28 md:pb-10 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500 flex-shrink-0" />
            Weekly Timetable & Routine
          </h2>
          <p className="text-slate-400 text-xs mt-1">
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
          className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition w-full sm:w-auto shadow-lg shadow-amber-900/20"
        >
          <Plus className="w-4 h-4" />
          Add Class to {DAYS.find((d) => d.key === selectedDay)?.short}
        </button>
      </div>

      {/* 7-DAY HORIZONTAL SCROLL NAVIGATOR */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-1.5 sm:p-2 shadow-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {DAYS.map((day) => {
            const isToday = day.key === todayDay;
            const isSelected = day.key === selectedDay;
            const count = slots.filter((s) => s.day_of_week === day.key).length;

            return (
              <button
                key={day.key}
                onClick={() => setSelectedDay(day.key)}
                className={`flex-shrink-0 min-w-[4.8rem] sm:min-w-0 sm:flex-1 py-2.5 px-2 rounded-xl flex flex-col items-center justify-center transition relative ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
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
                  className={`text-[10px] mt-0.5 px-1.5 py-0.2 rounded-full whitespace-nowrap ${
                    isSelected
                      ? 'bg-slate-900/80 text-amber-300 font-mono font-medium'
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
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm sm:text-base font-bold text-white">
            {DAYS.find((d) => d.key === selectedDay)?.label}&apos;s Schedule
          </h3>
          {selectedDay === todayDay && (
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
              <Sun className="w-3 h-3 text-emerald-400" /> Active
            </span>
          )}
        </div>

        <span className="text-[11px] sm:text-xs text-slate-400">
          {daySlots.length} {daySlots.length === 1 ? 'Period' : 'Periods'}
        </span>
      </div>

      {/* TIMELINE LIST */}
      {daySlots.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center space-y-3">
          <Clock className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-white font-bold text-sm sm:text-base">
            No classes scheduled for {DAYS.find((d) => d.key === selectedDay)?.label}
          </h3>
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
            const formattedStart = formatTimeDisplay(slot.start_time);
            const formattedEnd = formatTimeDisplay(slot.end_time);

            return (
              <div
                key={slot.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-3.5 sm:p-5 flex flex-col gap-3.5 transition shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-300 font-bold flex items-center justify-center text-xs sm:text-sm font-mono flex-shrink-0 mt-0.5">
                      #{index + 1}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-white font-bold text-sm sm:text-base truncate">
                          {sub?.name || 'Unknown Subject'}
                        </h4>
                        {sub?.code && (
                          <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded flex-shrink-0">
                            {sub.code}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400">
                        {/* Render time ONLY if present */}
                        {formattedStart && (
                          <span className="flex items-center gap-1 font-mono text-amber-400 font-medium text-[11px] sm:text-xs">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            {formattedStart} {formattedEnd ? `– ${formattedEnd}` : ''}
                          </span>
                        )}

                        {(slot.room_number || sub?.room_number) && (
                          <span className="flex items-center gap-1 text-[11px] sm:text-xs">
                            <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                            {slot.room_number || sub?.room_number}
                          </span>
                        )}

                        {sub?.lecturer_name && (
                          <span className="flex items-center gap-1 text-[11px] sm:text-xs">
                            <User className="w-3 h-3 flex-shrink-0" />
                            {sub.lecturer_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 rounded-lg transition flex-shrink-0"
                    title="Remove from Timetable"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Attendance Row */}
                {selectedDay === todayDay && (
                  <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-800/60">
                    <span className="text-[11px] text-slate-400 font-medium">Quick Attendance:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={actionLoading}
                        onClick={() => handleMarkAttendance(slot.subject_id, 'ATTENDED')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition border ${
                          todayRec?.status === 'ATTENDED'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
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
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Absent
                      </button>

                      <button
                        disabled={actionLoading}
                        onClick={() => handleMarkAttendance(slot.subject_id, 'OFF')}
                        className={`p-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition border ${
                          todayRec?.status === 'OFF'
                            ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-900/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                        title="Class Cancelled"
                      >
                        <Slash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD TIMETABLE SLOT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3.5 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 my-auto max-h-[90dvh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Add Class to {DAYS.find((d) => d.key === selectedDay)?.label}
            </h3>

            <form onSubmit={handleAddSlot} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Subject *</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start & End Time (Now Fully Optional) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Start Time (Optional)</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">End Time (Optional)</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Room / Hall (Optional)</label>
                <input
                  type="text"
                  placeholder="Enter room/hall"
                  value={slotRoom}
                  onChange={(e) => setSlotRoom(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-500"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-xl font-semibold text-xs transition disabled:opacity-50"
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