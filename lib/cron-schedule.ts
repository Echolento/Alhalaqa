// lib/cron-schedule.ts
// PURE timing policy for /api/cron (no DB, no network).
// Approved plan: hourly CI tick, Cairo hour-gates decide what fires.
//   - 10:00 → payer daily nags (due day onward, no cap, skip while pending)
//   - 10:00 → teacher escalation (overdue day 3+, daily while overdue)
//   - 08:00 + 20:00 → teacher digest (pending + overdue + unclaimed)
// Toggle is dead: automation always on. Manual Remind untouched.

export const CAIRO_TZ = 'Africa/Cairo'

export const NAG_HOUR = 10
export const DIGEST_MORNING_HOUR = 8
export const DIGEST_EVENING_HOUR = 20
export const ESCALATION_MIN_DAYS = 3

export type CronTrigger = 'payer_nag' | 'escalation' | 'digest_morning' | 'digest_evening'

/** Cairo wall-clock hour (0-23) for a given instant. DST-safe via Intl. */
export function cairoHour(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CAIRO_TZ,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  return hour % 24
}

/** Cairo calendar date key (YYYY-MM-DD) — idempotency scope. */
export function cairoDateKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Which triggers fire at this instant. Hourly tick → hour-gates. */
export function dueTriggers(now: Date = new Date()): CronTrigger[] {
  const hour = cairoHour(now)
  const triggers: CronTrigger[] = []
  if (hour === NAG_HOUR) {
    triggers.push('payer_nag', 'escalation')
  }
  if (hour === DIGEST_MORNING_HOUR) triggers.push('digest_morning')
  if (hour === DIGEST_EVENING_HOUR) triggers.push('digest_evening')
  return triggers
}
