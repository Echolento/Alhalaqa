export type UserRole = 'admin' | 'teacher' | 'student';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  profile_id: string;
  organization_id: string;
  google_meet_link: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Student {
  id: string;
  profile_id: string;
  teacher_id: string;
  organization_id: string;
  current_surah: string | null;
  current_ayah: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  teacher?: Teacher;
}

export interface Session {
  id: string;
  teacher_id: string;
  student_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  google_meet_link: string | null;
  created_at: string;
  updated_at: string;
  teacher?: Teacher;
  student?: Student;
}

export interface SessionNote {
  id: string;
  session_id: string;
  new_content: string | null; // الجديد
  far_past_review: string | null; // الماضي البعيد
  recent_past_review: string | null; // الماضي القريب
  general_notes: string | null; // ملاحظات
  next_task: string | null; // الواجب القادم
  rating_new: number | null;
  rating_far_past: number | null;
  rating_recent_past: number | null;
  created_at: string;
  updated_at: string;
  session?: Session;
}

// Dashboard stats
export interface TeacherStats {
  totalStudents: number;
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  averageRating: number;
}

export interface StudentStats {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  averageRating: number;
  currentProgress: string;
}

export interface AdminStats {
  totalOrganizations: number;
  totalTeachers: number;
  totalStudents: number;
  totalSessions: number;
  activeSessions: number;
}

// Form types
export interface SessionNoteForm {
  new_content: string;
  far_past_review: string;
  recent_past_review: string;
  general_notes: string;
  next_task: string;
  rating_new: number;
  rating_far_past: number;
  rating_recent_past: number;
}

export interface SessionForm {
  student_id: string;
  scheduled_at: string;
  duration_minutes: number;
  google_meet_link?: string;
  is_recurring?: boolean
}
