'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { assertOwnsStudent } from './ownership'
import { billingState } from '@/lib/billing-state'

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

  const { data: proofs } = await service
    .from('payment_proofs')
    .select('period_key, status')
    .eq('student_id', studentId)

  // Every status field comes from ONE billing-state call (the same rule the
  // list and pay screen use): pending (for the outstanding cycle), settled, and
  // the "previous period paid" reassurance.
  const state = billingState({
    student,
    payments: payments.map((p) => ({ month: p.month, paid: !!p.paid })),
    proofs: ((proofs ?? []) as { period_key: string; status: string }[]).map((p) => ({
      period_key: String(p.period_key),
      status: String(p.status),
    })),
    today: new Date(),
  })

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
      hasPendingProof: state.isPending,
      settled: state.isSettled,
      paidLastPeriod: state.paidLastPeriod,
    },
    payments,
    currency: teacher?.currency || 'SAR',
  }
}
