import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

const BASE = 'http://localhost:3000'
const EMAIL = 'mariah.sobhy@gmail.com'
const PASS = '124578'
const OUT = resolve('C:\\Users\\hmzam\\AppData\\Local\\Temp\\opencode\\audit')
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const results = []
let entry = 0

const snap = async (page, label) => {
  const path = `${OUT}\\${String(entry++).padStart(3, '0')}_${label.replace(/[^a-z0-9]/gi, '_')}.png`
  await page.screenshot({ path, fullPage: false })
  results.push(`  ${label}`)
}

const log = (msg) => { results.push(msg); console.log(msg) }
const nav = (url) => page.goto(url, { waitUntil: 'load', timeout: 20000 })

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()

const allConsole = []
page.on('console', msg => allConsole.push(`[${msg.type()}] ${msg.text().slice(0,120)}`))
const networkFailures = []
page.on('response', resp => { const s = resp.status(); if (s >= 400) networkFailures.push(`${resp.url().slice(0,80)} → ${s}`) })

try {

// ── Login ──
log('=== LOGIN ===')
await nav(`${BASE}/auth/login`)
await page.waitForTimeout(1500)
await snap(page, 'login')
await page.fill('input[type="email"]', EMAIL)
await page.fill('input[type="password"]', PASS)
await page.click('button[type="submit"]')
await page.waitForURL('**/dashboard', { timeout: 20000 })
await page.waitForTimeout(2000)
await snap(page, 'dashboard')
log('OK')

// ── Students (mobile 390) ──
log('\n=== STUDENTS (390px) ===')
await nav(`${BASE}/dashboard/students`)
await page.waitForTimeout(2000)
await snap(page, 'students_list')

// Open day picker
const dayBtns = page.locator('button').filter({ hasText: /يوم \d+/ }).first()
if (await dayBtns.isVisible({ timeout: 2000 }).catch(() => false)) {
  await dayBtns.click()
  await page.waitForTimeout(1000)
  await snap(page, 'students_day_picker')
  await page.press('body', 'Escape')
  await page.waitForTimeout(800)
}

// Open add dialog -> close it
const addBtn = page.locator('button:has-text("إضافة طالب")')
if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  await addBtn.click()
  await page.waitForTimeout(1000)
  await snap(page, 'students_add_dialog')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1000)
}

// ── Payments (mobile 390) ──
log('\n=== PAYMENTS (390px) ===')
await nav(`${BASE}/dashboard/payments`)
await page.waitForTimeout(2000)
await snap(page, 'payments_list')

// Open day picker in payments
const payBtns = page.locator('button').filter({ hasText: /يوم الدفع/ }).first()
if (await payBtns.isVisible({ timeout: 2000 }).catch(() => false)) {
  await payBtns.click()
  await page.waitForTimeout(1000)
  await snap(page, 'payments_day_picker')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(800)
}

// ── Settings (mobile 390) ──
log('\n=== SETTINGS (390px) ===')
await nav(`${BASE}/dashboard/settings`)
await page.waitForTimeout(2000)
await snap(page, 'settings')

// ── Dashboard (mobile 390) ──
await nav(`${BASE}/dashboard`)
await page.waitForTimeout(2000)
await snap(page, 'dashboard_stats')

// ── Tablet 768 ──
log('\n=== TABLET (768px) ===')
await page.setViewportSize({ width: 768, height: 900 })
await page.waitForTimeout(500)
await nav(`${BASE}/dashboard/students`)
await page.waitForTimeout(1500)
await snap(page, 'students_768')
await nav(`${BASE}/dashboard/payments`)
await page.waitForTimeout(1500)
await snap(page, 'payments_768')

// ── Desktop 1440 ──
log('\n=== DESKTOP (1440px) ===')
await page.setViewportSize({ width: 1440, height: 900 })
await page.waitForTimeout(500)
await nav(`${BASE}/dashboard/students`)
await page.waitForTimeout(1500)
await snap(page, 'students_1440')
await nav(`${BASE}/dashboard/payments`)
await page.waitForTimeout(1500)
await snap(page, 'payments_1440')
await nav(`${BASE}/dashboard`)
await page.waitForTimeout(1500)
await snap(page, 'dashboard_1440')

log('\nAll pages visited successfully')

} catch (e) {
  log(`\n✗ ERROR: ${e.message}`)
}

// ── Summary ──
log('\n══════════════════════════════════════')
log('CONSOLE')
const errs = allConsole.filter(l => l.startsWith('[error]'))
const warns = allConsole.filter(l => l.startsWith('[warning]'))
log(`Errors: ${errs.length}`)
log(`Warnings: ${warns.length}`)
errs.forEach(e => log(`  ERR: ${e}`))
warns.slice(0, 3).forEach(w => log(`  WARN: ${w}`))

log('NETWORK 4xx/5xx')
log(networkFailures.length === 0 ? '  None' : networkFailures.slice(0,5).map(f => `  ${f}`).join('\n'))

await browser.close()

writeFileSync(`${OUT}\\report.md`,
`# UX Audit — Alhalaqa\n\n` +
`**Persona:** Quran teacher, mobile-first, between sessions\n` +
`**Viewports:** 390×844 / 768×900 / 1440×900\n` +
`**Console errors:** ${errs.length}\n` +
`**Console warnings:** ${warns.length}\n` +
`**Network 4xx/5xx:** ${networkFailures.length}\n\n` +
`## Screenshots\n` +
results.filter(r => !r.startsWith('=') && !r.startsWith('CONSOLE') && !r.startsWith('ERROR') && !r.startsWith('NETWORK') && !r.startsWith('All pages')).map(r => `- ${r}`).join('\n')
)
log(`\nDone — ${entry} screenshots → ${OUT}`)
