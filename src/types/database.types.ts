export type AttendanceStatus = 'ATTENDED' | 'MISSED' | 'OFF';

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type VaultCategory =
  | 'Aadhaar'
  | 'College ID'
  | 'Admit Card'
  | 'Certificate'
  | 'Other';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  college_name: string | null;
  department: string | null;
  semester: number | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSetting {
  id: string;
  user_id: string;
  target_percentage: number;
  warning_threshold: number;
  notify_on_low_attendance: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  lecturer_name: string | null;
  room_number: string | null;
  required_percentage: number;
  initial_attended: number;
  initial_missed: number;
  credits: number;
  color_code: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  subject_id: string;
  session_date: string;
  slot_order: number;
  status: AttendanceStatus;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimetableSlot {
  id: string;
  user_id: string;
  subject_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  room_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentMetadata {
  id: string;
  user_id: string;
  title: string;
  category: VaultCategory;
  file_path: string;
  file_size_bytes: number;
  mime_type: string;
  issue_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}