function padMonth(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatMonthKey(year: number, month: number): string {
  return `${year}-${padMonth(month)}-01`
}

export function getCurrentMonthKey(): string {
  const now = new Date()
  return formatMonthKey(now.getFullYear(), now.getMonth() + 1)
}

export function getMonthKey(date: Date): string {
  return formatMonthKey(date.getFullYear(), date.getMonth() + 1)
}

export function prevMonthKey(monthKey: string): string {
  const d = new Date(monthKey)
  d.setMonth(d.getMonth() - 1)
  return getMonthKey(d)
}

export function nextMonthKey(monthKey: string): string {
  const d = new Date(monthKey)
  d.setMonth(d.getMonth() + 1)
  return getMonthKey(d)
}

export function getBillingMonthKey(date: Date, paymentDay?: number): string {
  const day = paymentDay || 1
  let year = date.getFullYear()
  let month = date.getMonth() + 1
  if (date.getDate() < day) {
    month -= 1
    if (month === 0) {
      month = 12
      year -= 1
    }
  }
  return formatMonthKey(year, month)
}

export function getCurrentBillingMonthKey(paymentDay?: number): string {
  return getBillingMonthKey(new Date(), paymentDay)
}

export type BillingFrequency = 'weekly' | 'biweekly' | 'monthly'

export function normalizeFrequency(f: unknown): BillingFrequency {
  return f === 'weekly' || f === 'biweekly' || f === 'monthly' ? f : 'monthly'
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatPeriodKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Anchor reuses payment_day: weekly phases = (anchor-1)%7 days after
// 2024-01-01 (Monday); biweekly phases = (anchor-1)%14. Stable across
// month/year boundaries; period key = cycle-start date string.
function intervalPeriodKey(date: Date, anchor: number, intervalDays: number): string {
  const a = Math.min(Math.max(anchor || 1, 1), 31)
  const ref = new Date(2024, 0, 1 + ((a - 1) % intervalDays))
  const diffDays = Math.floor((startOfDay(date).getTime() - startOfDay(ref).getTime()) / DAY_MS)
  const k = Math.floor(diffDays / intervalDays)
  const start = new Date(ref.getTime() + k * intervalDays * DAY_MS)
  return formatPeriodKey(start)
}

export function getPeriodKey(
  date: Date,
  frequency?: BillingFrequency | null,
  anchorDay?: number,
): string {
  const freq = normalizeFrequency(frequency)
  const anchor = anchorDay || 1
  if (freq === 'monthly') return getBillingMonthKey(date, anchor)
  if (freq === 'weekly') return intervalPeriodKey(date, anchor, 7)
  return intervalPeriodKey(date, anchor, 14)
}

// Due-date contract for pushes/pay screen (UI lands later).
// Monthly: clamped anchor day inside the billing month.
// Weekly/biweekly: due at cycle start (period key itself).
export function getPeriodDueDate(
  periodKey: string,
  frequency?: BillingFrequency | null,
  anchorDay?: number,
): Date {
  const freq = normalizeFrequency(frequency)
  const anchor = anchorDay || 1
  if (freq === 'monthly') {
    const [y, m] = periodKey.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    return new Date(y, m - 1, Math.min(anchor, lastDay))
  }
  const [y, m, d] = periodKey.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export interface DuePeriodInfo {
  periodKey: string
  dueDate: Date
  amount: number
}

// Amount contract: no auto-proration. Teacher's monthly_price is the
// per-cycle price; frequency change never rewrites current-period rows.
export function getDuePeriodInfo(
  date: Date,
  frequency: BillingFrequency | null | undefined,
  anchorDay: number | undefined,
  monthlyPrice: number,
): DuePeriodInfo {
  const freq = normalizeFrequency(frequency)
  const anchor = anchorDay || 1
  const periodKey = getPeriodKey(date, freq, anchor)
  return { periodKey, dueDate: getPeriodDueDate(periodKey, freq, anchor), amount: monthlyPrice || 0 }
}
