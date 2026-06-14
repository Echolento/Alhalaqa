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
