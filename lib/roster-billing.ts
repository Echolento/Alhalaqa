// lib/roster-billing.ts
// The ONE roster read: live students + their FULL payment history + pending
// receipts + the canonical billing state per student.
//
// Why one module: the dashboard (RLS user client) and the cron (service role)
// used to read the same rule through two different query windows. The cron
// narrowed payments to the outstanding cycle key, hiding the settled row, so a
// student who had just paid looked like a first-time debtor. Same rule, same
// input — always. Any new surface that needs "who owes what" calls this.
//
// Rows stay loosely typed on purpose: the callers use different Supabase
// clients and billingState is the only derivation anyone may make from them.

import { billingState, type BillingState } from '@/lib/billing-state'

export interface RosterStudentRow {
  id: string
  name: string | null
  phone?: string | null
  monthly_price: number | null
  payment_day?: number | null
  frequency?: unknown
  next_due_date?: string | null
  /** First boundary for a never-paid student; null once they have paid. */
  starts_on?: string | null
  claimed_by?: string | null
}

export interface RosterPaymentRow {
  student_id: string
  month: string
  paid: boolean
  amount_paid?: number | null
  paid_at?: string | null
  [column: string]: unknown
}

export interface RosterProofRow {
  id: string
  student_id: string
  period_key: string
}

export interface RosterBillingEntry {
  student: RosterStudentRow
  /** The one canonical derivation for this student. */
  state: BillingState
  /** Full payment history for this student (never narrowed to one cycle). */
  rows: RosterPaymentRow[]
  /** Pending receipts for this student, any cycle. */
  proofs: RosterProofRow[]
  /** Pending receipt for the outstanding cycle — drives the review CTA. */
  pendingProofId: string | null
}

export interface RosterBilling {
  /** Live students, newest first. */
  entries: RosterBillingEntry[]
  /** Flat payment history for the whole roster (for the overdue engine). */
  payments: RosterPaymentRow[]
  /** Flat pending receipts for the whole roster. */
  proofs: RosterProofRow[]
}

/**
 * Structural client seam: satisfied by both the cookie-bound user client and
 * the service-role client. Keeping it minimal means this module can be tested
 * with a fake that only implements `from`.
 */
export interface RosterBillingClient {
  from(table: string): any
}

function firstMessage(error: unknown): string {
  const message = (error as { message?: unknown } | null)?.message
  return typeof message === 'string' ? message : 'unknown error'
}

/** PostgREST hides rows past its max-rows cap; page so history is never partial. */
const PAYMENT_PAGE = 1000

async function readAllPayments(
  client: RosterBillingClient,
  studentIds: string[],
): Promise<RosterPaymentRow[]> {
  const all: RosterPaymentRow[] = []
  for (let from = 0; ; from += PAYMENT_PAGE) {
    const { data, error } = await client
      .from('student_payments')
      .select('*')
      .in('student_id', studentIds)
      .order('id', { ascending: true })
      .range(from, from + PAYMENT_PAGE - 1)
    if (error) throw new Error(`roster payments: ${firstMessage(error)}`)
    const page = (data ?? []) as RosterPaymentRow[]
    all.push(...page)
    if (page.length < PAYMENT_PAGE) return all
  }
}

/**
 * Read a teacher's live roster and derive every student's billing state from
 * their complete history. Throws on a failed query: an empty history is not a
 * safe stand-in for an unreadable one (that is exactly how "paid" became
 * "overdue"), so callers decide whether to skip or surface the failure.
 */
export async function loadRosterBilling(
  client: RosterBillingClient,
  teacherId: string,
  today: Date = new Date(),
): Promise<RosterBilling> {
  const { data: students, error: studentsError } = await client
    .from('students')
    .select(
      'id, name, phone, monthly_price, payment_day, frequency, next_due_date, starts_on, claimed_by, created_at',
    )
    .is('deleted_at', null)
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })
  if (studentsError) throw new Error(`roster students: ${firstMessage(studentsError)}`)

  const roster = ((students ?? []) as RosterStudentRow[]).filter((s) => !!s?.id)
  if (roster.length === 0) return { entries: [], payments: [], proofs: [] }

  const ids = roster.map((s) => s.id)
  const [{ data: proofData, error: proofsError }, payments] = await Promise.all([
    client
      .from('payment_proofs')
      .select('id, student_id, period_key')
      .eq('status', 'pending')
      .in('student_id', ids),
    readAllPayments(client, ids),
  ])
  if (proofsError) throw new Error(`roster proofs: ${firstMessage(proofsError)}`)

  const proofs = (proofData ?? []) as RosterProofRow[]

  const rowsByStudent = new Map<string, RosterPaymentRow[]>()
  for (const row of payments) {
    const list = rowsByStudent.get(row.student_id) ?? []
    list.push(row)
    rowsByStudent.set(row.student_id, list)
  }
  const proofsByStudent = new Map<string, RosterProofRow[]>()
  for (const proof of proofs) {
    const list = proofsByStudent.get(proof.student_id) ?? []
    list.push(proof)
    proofsByStudent.set(proof.student_id, list)
  }

  const entries = roster.map((student): RosterBillingEntry => {
    const rows = rowsByStudent.get(student.id) ?? []
    const studentProofs = proofsByStudent.get(student.id) ?? []
    const state = billingState({
      student: {
        frequency: student.frequency,
        next_due_date: student.next_due_date,
        starts_on: student.starts_on,
      },
      payments: rows.map((r) => ({ month: String(r.month), paid: !!r.paid })),
      proofs: studentProofs.map((p) => ({ period_key: p.period_key, status: 'pending' })),
      today,
    })
    return {
      student,
      state,
      rows,
      proofs: studentProofs,
      // The receipt awaiting review for THIS cycle — the review CTA deep-links
      // to it so the teacher verifies the proof instead of blind-settling the
      // ledger (which left the proof stuck at pending forever).
      pendingProofId:
        studentProofs.find((p) => p.period_key === state.cycleKey)?.id ?? null,
    }
  })

  return { entries, payments, proofs }
}
