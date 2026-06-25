export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone?: string | null;
  role: string;
  avatar_url: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  teacher_id: string;
  name: string | null;
  phone: string | null;
  monthly_price: number;
  payment_day: number;
  created_at: string;
  updated_at: string;
}

export interface StudentPayment {
  id: string;
  student_id: string;
  month: string;
  paid: boolean;
  paid_at: string | null;
  amount_paid: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface PushSubscription {
  id: string;
  profile_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
  updated_at: string;
}

export type ActionType =
  | 'payment_toggle'
  | 'student_add'
  | 'student_delete'
  | 'student_update'
  | 'student_bulk_add'
  | 'price_update'
  | 'payment_day_update'
  | 'teacher_settings_update'
  | 'onboarding_complete'
