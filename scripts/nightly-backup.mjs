// scripts/nightly-backup.mjs
// Free-tier backup that actually exists: snapshots every domain table to
// backups/alhalaqa-YYYYMMDD-HHmm.json via the service key (local only —
// backups/ is gitignored, the key never leaves this machine).
//
//   node scripts/nightly-backup.mjs            snapshot + prune (>14d)
//   node scripts/nightly-backup.mjs --install  register daily 03:00 task
//
// Monthly drill: pick a file, confirm non-empty, restore to a scratch
// project (see scripts/restore-drill.md). Untested backups are decoration.

import { createClient } from '@supabase/supabase-js'
import { readdirSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BACKUP_DIR = join(ROOT, 'backups')
const RETENTION_DAYS = 14
const PAGE = 1000

// FK-safe order for restore (parents first).
const TABLES = [
  'profiles',
  'teachers',
  'students',
  'student_payments',
  'payment_proofs',
  'claim_tokens',
  'activity_log',
  'push_subscriptions',
  'cron_fires',
]

function loadEnv() {
  const env = {}
  for (const f of ['.env.local', '.env']) {
    const p = join(ROOT, f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
    }
  }
  return env
}

async function snapshot() {
  const env = loadEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local')
  const svc = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  mkdirSync(BACKUP_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13).replace('T', '-')
  const data = { exported_at: new Date().toISOString(), tables: {} }
  for (const table of TABLES) {
    const rows = []
    let from = 0
    for (;;) {
      const { data: page, error } = await svc.from(table).select('*').range(from, from + PAGE - 1)
      if (error) throw new Error(`${table}: ${error.message}`)
      rows.push(...(page ?? []))
      if ((page ?? []).length < PAGE) break
      from += PAGE
    }
    data.tables[table] = rows
    console.log(`${table}: ${rows.length} rows`)
  }
  const file = join(BACKUP_DIR, `alhalaqa-${stamp}.json`)
  writeFileSync(file, JSON.stringify(data))
  console.log(`wrote ${file}`)

  // Prune older than retention (timestamp is in the filename).
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000)
  const cutoffStamp = cutoff.toISOString().replace(/[-:]/g, '').slice(0, 13).replace('T', '-')
  for (const f of readdirSync(BACKUP_DIR)) {
    const m = f.match(/^alhalaqa-(\d{8}-\d{4})\.json$/)
    if (!m || m[1] >= cutoffStamp) continue
    unlinkSync(join(BACKUP_DIR, f))
    console.log(`pruned ${f}`)
  }
}

function install() {
  const task = 'AlhalaqaNightlyBackup'
  const cmd = `node "${join(ROOT, 'scripts', 'nightly-backup.mjs')}"`
  execSync(
    `schtasks /create /tn ${task} /tr "${cmd}" /sc daily /st 03:00 /f`,
    { stdio: 'inherit' },
  )
  console.log(`scheduled task ${task} registered (daily 03:00)`)
}

if (process.argv.includes('--install')) install()
else await snapshot().catch((e) => { console.error(`backup FAILED: ${e.message}`); process.exit(1) })
