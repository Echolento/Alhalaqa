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
 * Status = subtle light pill + status icon (check / clock).
 * Actions live outside this helper: solid green primary for mark-paid,
 * low-emphasis ghost for undo. Both list + profile consume this — no drift.
 */
export function getPaymentStatus(paid: boolean): PaymentStatus {
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
