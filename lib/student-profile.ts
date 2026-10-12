'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { assertOwnsStudent } from './ownership'
import { outstandingCycleKey } from '@/lib/billing-next'

export interface StudentPaymentRecord {
  student_id: string
  month: string
  paid: boolean
  amount_paid: number | null
  paid_at: string | null
}

/**
 * Payment-history reader with stable interface.
 * Future ledger can implement same shape without UI churn.
 */
export async function getStudentPaymentHistory(studentId: string): Promise<StudentPaymentRecord[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const service = createServiceClient()
  if (!(await assertOwnsStudent(service, user.id, studentId))) return []
  const { data } = await service
    .from('student_payments')
    .select('student_id, month, paid, amount_paid, paid_at')
    .eq('student_id', studentId)
    .order('month', { ascending: false })
    .limit(24)
  return (data || []) as StudentPaymentRecord[]
}

export async function getStudentProfile(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  if (!(await assertOwnsStudent(service, user.id, studentId))) return null

  const { data: student } = await service
    .from('students')
    .select('id, name, phone, monthly_price, payment_day, frequency, next_due_date, claimed_by, teacher_id, teachers(currency, default_monthly_price)')
    .eq('id', studentId)
    .maybeSingle()
  if (!student) return null

  const s = student as any
  const teacher = Array.isArray(s.teachers) ? s.teachers[0] : s.teachers

  const payments = await getStudentPaymentHistory(studentId)

  const { data: pendingProof } = await service
    .from('payment_proofs')
    .select('id, period_key')
    .eq('student_id', studentId)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()

  // Pending only counts for the student's OUTSTANDING cycle (same rule as the
  // payments list + pay screen); a stale proof for an advanced cycle is ignored.
  const outstandingKey = outstandingCycleKey(student)
  const hasPendingProof =
    !!pendingProof && (pendingProof as { period_key?: string }).period_key === outstandingKey

  return {
    student: {
      id: (student as any).id,
      full_name: (student as any).name || 'طالب',
      name: (student as any).name || 'طالب',
      phone: (student as any).phone,
      monthly_price: (student as any).monthly_price || teacher?.default_monthly_price || 0,
      payment_day: (student as any).payment_day || 1,
      frequency: (student as any).frequency === 'weekly' || (student as any).frequency === 'biweekly' ? (student as any).frequency : 'monthly',
      next_due_date: ((student as any).next_due_date ?? null) as string | null,
      claimed_by: (student as any).claimed_by ?? null,
      hasPendingProof,
    },
    payments,
    currency: teacher?.currency || 'SAR',
  }
}
