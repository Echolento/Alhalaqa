import type { PaymentState } from '@/lib/billing-state'

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

export type ActionType =
  | 'payment_toggle'
  | 'student_add'
  | 'student_delete'
  | 'student_restore'
  | 'student_update'
  | 'student_bulk_add'
  | 'price_update'
  | 'payment_day_update'
  | 'frequency_update'
  | 'next_due_update'
  | 'teacher_settings_update'
  | 'onboarding_complete'
  | 'claim_link_issued'
  | 'claim_redeemed'
  | 'claim_unlinked'
  | 'join_code_rotated'
  | 'proof_verified'
  | 'proof_rejected'
  | 'manual_remind'

// Shared viewer DTOs for the dashboard components. These describe the props
// already flowing through the UI; naming them removes `any`/casts without
// changing any runtime shape.
export interface StudentView {
  id: string
  name?: string | null
  full_name?: string | null
  phone?: string | null
  monthly_price?: number | null
  payment_day?: number | null
  frequency?: string | null
  next_due_date?: string | null
  claimed_by?: string | null
  /** Canonical state derived once by billing-state. */
  paymentState?: PaymentState
  /** Outstanding cycle unpaid but the previous one settled → reassure the teacher. */
  paidLastPeriod?: boolean
  /** The student's outstanding cycle key (from next_due_date). */
  currentMonthKey?: string
  payer_profile_id?: string | null
  payerProfileId?: string | null
}

export interface PaymentView {
  student_id?: string
  month?: string
  paid?: boolean
  paid_at?: string | null
  amount_paid?: number | null
}

/** A roster row that is guaranteed to carry the canonical payment state. */
export interface DashboardStudent extends StudentView {
  paymentState: PaymentState
}
