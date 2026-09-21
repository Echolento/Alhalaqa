export type PaymentStatusIcon = 'check' | 'user'

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
 * Single source of truth for paid=green / unpaid=red language.
 * Both merged list + profile header use this — no drift.
 */
export function getPaymentStatus(paid: boolean): PaymentStatus {
  if (paid) {
    return {
      paid: true,
      label: 'مدفوع',
      icon: 'check',
      cardClass: 'bg-emerald-50/30',
      avatarClass: 'bg-emerald-500/10 text-emerald-600',
      badgeVariant: 'secondary',
      badgeClass: 'text-[10px] px-2 py-0 bg-emerald-600 text-white hover:bg-emerald-600 border-transparent',
    }
  }
  return {
    paid: false,
    label: 'لم يدفع',
    icon: 'user',
    cardClass: 'bg-red-50/30 border-r-4 border-r-red-500',
    avatarClass: 'bg-red-500/10 text-red-600',
    badgeVariant: 'destructive',
    badgeClass: 'text-[10px] px-2 py-0 bg-red-600 animate-pulse',
  }
}
