import type { PaymentState } from '@/lib/billing-state'

export type PaymentStatusIcon = 'check' | 'clock'

export interface PaymentStatus {
  label: string
  icon: PaymentStatusIcon
  cardClass: string
  iconClass: string
  badgeVariant: 'secondary' | 'destructive'
  badgeClass: string
}

/**
 * Single source of truth for status-vs-action hierarchy. `PaymentState` is
 * derived once in billing-state; this function only maps it to presentation.
 * Paid (green) / pending-confirmation (amber) / not-yet-due (blue) / unpaid (red).
 * Actions live outside this helper: solid green primary for mark-paid,
 * low-emphasis ghost for undo. Both list + profile consume this — no drift.
 */
export function getPaymentStatus(state: PaymentState): PaymentStatus {
  switch (state) {
    case 'paid':
      return {
        label: 'مدفوع',
        icon: 'check',
        cardClass: 'bg-emerald-50/30 border-r-4 border-r-emerald-500',
        iconClass: 'text-emerald-600',
        badgeVariant: 'secondary',
        badgeClass: 'text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 border-transparent',
      }
    case 'pending':
      return {
        label: 'قيد المراجعة',
        icon: 'clock',
        cardClass: 'bg-amber-50/40 border-r-4 border-r-amber-500',
        iconClass: 'text-amber-600',
        badgeVariant: 'secondary',
        badgeClass: 'text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 border-transparent',
      }
    case 'awaiting_start':
      return {
        label: 'لم يبدأ بعد',
        icon: 'clock',
        cardClass: 'bg-sky-50/40 border-r-4 border-r-sky-500',
        iconClass: 'text-sky-600',
        badgeVariant: 'secondary',
        badgeClass: 'text-[10px] px-2 py-0.5 bg-sky-100 text-sky-700 border-transparent',
      }
    case 'unpaid':
      return {
        label: 'لم يدفع',
        icon: 'clock',
        cardClass: 'bg-red-50/30 border-r-4 border-r-red-500',
        iconClass: 'text-red-600',
        badgeVariant: 'destructive',
        badgeClass: 'text-[10px] px-2 py-0.5 bg-red-100 text-red-700 border-transparent',
      }
  }
}

/**
 * The roster keeps an optimistic local paid row so a tap feels instant. The
 * server state is still the base: marking paid overrides anything, and an undo
 * returns to the server state (paid → unpaid; awaiting-start stays awaiting).
 */
export function applyPaidOverride(state: PaymentState, paid: boolean): PaymentState {
  if (paid) return 'paid'
  return state === 'paid' ? 'unpaid' : state
}
