export type PaymentStatusIcon = 'check' | 'clock'

export interface PaymentStatus {
  paid: boolean
  label: string
  icon: PaymentStatusIcon
  cardClass: string
  avatarClass: string
  badgeVariant: 'secondary' | 'destructive'
  badgeClass: string
}

/**
 * Single source of truth for status-vs-action hierarchy.
 * Three states: paid (green) / pending-confirmation (amber, a receipt proof
 * is waiting for teacher verification) / unpaid (red).
 * Actions live outside this helper: solid green primary for mark-paid,
 * low-emphasis ghost for undo. Both list + profile consume this — no drift.
 */
export function getPaymentStatus(paid: boolean, opts?: { pending?: boolean }): PaymentStatus {
  if (paid) {
    return {
      paid: true,
      label: 'مدفوع',
      icon: 'check',
      cardClass: 'bg-emerald-50/30 border-r-4 border-r-emerald-500',
      avatarClass: 'text-emerald-600',
      badgeVariant: 'secondary',
      badgeClass: 'text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 border-transparent',
    }
  }
  if (opts?.pending) {
    return {
      paid: false,
      label: 'قيد المراجعة',
      icon: 'clock',
      cardClass: 'bg-amber-50/40 border-r-4 border-r-amber-500',
      avatarClass: 'text-amber-600',
      badgeVariant: 'secondary',
      badgeClass: 'text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 border-transparent',
    }
  }
  return {
    paid: false,
    label: 'لم يدفع',
    icon: 'clock',
    cardClass: 'bg-red-50/30 border-r-4 border-r-red-500',
    avatarClass: 'text-red-600',
    badgeVariant: 'destructive',
    badgeClass: 'text-[10px] px-2 py-0.5 bg-red-100 text-red-700 border-transparent',
  }
}
