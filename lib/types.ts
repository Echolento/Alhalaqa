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
