// scripts/restore-backup.mjs <backup-file> [--dry-run] [--allow-prod]
// Restores a nightly-backup snapshot with service-key upserts (id-keyed, so
// re-running is safe). SAFE BY DEFAULT:
//   - Target comes ONLY from process env (SUPABASE_URL + SUPABASE_SERVICE_KEY).
//     .env.local is read solely to learn the PROD reference for refusal.
//   - Prod targets abort unless --allow-prod AND an interactive yes.
//   - Only the nine known domain tables restore; anything else throws.
//   - activity_log restores insert-only (insert-missing), never update — the
//     immutability guard would abort a blind upsert midway.
//   - --dry-run prints what would change and writes nothing.
//
//   SUPABASE_URL=https://<scratch-ref>.supabase.co SUPABASE_SERVICE_KEY=sb_secret_... node scripts/restore-backup.mjs backups/alhalaqa-20261016-0300.json
//
// Limits: auth.users + storage objects are NOT in snapshots. Run against
// production only with a backup newer than the damage, with a second person
// reading the command back.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname, resolve, basename } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BACKUP_DIR = join(ROOT, 'backups')

// Same allowlist as nightly-backup.mjs TABLES, FK-safe order.
const ALLOWED_TABLES = [
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

function prodRef() {
  for (const f of ['.env.local', '.env']) {
    const p = join(ROOT, f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i > 0 && t.slice(0, i).trim() === 'NEXT_PUBLIC_SUPABASE_URL') {
        const m = t.slice(i + 1).trim().match(/https:\/\/([^.]+)\.supabase\.co/)
        if (m) return m[1]
      }
    }
  }
  return null
}

function refOf(url) {
  const m = String(url).match(/https:\/\/([^.]+)\.supabase\.co/)
  return m ? m[1] : String(url)
}

async function confirm(question) {
  if (!process.stdin.isTTY) return false
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise((resolve) => rl.question(question, resolve))
  rl.close()
  return /^(y|yes)$/i.test(answer.trim())
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')))
const fileArg = args[0] ?? ''
const file = resolve(ROOT, fileArg)
if (!fileArg || !file.startsWith(BACKUP_DIR) || basename(fileArg).length === 0) {
  console.error('usage: node scripts/restore-backup.mjs backups/<alhalaqa-*.json> [--dry-run] [--allow-prod]')
  process.exit(1)
}
if (!/^alhalaqa-\d{8}-\d{4}\.json$/.test(basename(file)) || !existsSync(file)) {
  console.error(`refusing: ${fileArg} is not a nightly-backup snapshot inside backups/`)
  process.exit(1)
}

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
if (!url || !key) {
  console.error('refusing: set SUPABASE_URL + SUPABASE_SERVICE_KEY in the environment (never from files)')
  process.exit(1)
}

const snap = JSON.parse(readFileSync(file, 'utf8'))
if (!snap || typeof snap !== 'object' || !snap.tables || typeof snap.tables !== 'object') {
  console.error('refusing: snapshot has no tables object')
  process.exit(1)
}
for (const [table, rows] of Object.entries(snap.tables)) {
  if (!ALLOWED_TABLES.includes(table)) throw new Error(`refusing: unknown table in snapshot: ${table}`)
  if (!Array.isArray(rows) || rows.some((r) => !r || typeof r.id === 'undefined')) {
    throw new Error(`refusing: table ${table} has rows without id`)
  }
}

const dryRun = flags.has('--dry-run')
const targetRef = refOf(url)
const prod = prodRef()
console.log(`target: ${targetRef} | snapshot: ${snap.exported_at} | tables: ${Object.keys(snap.tables).length}`)
for (const [table, rows] of Object.entries(snap.tables)) {
  console.log(`  ${table}: ${rows.length} rows`)
}
if (prod && targetRef === prod && !dryRun) {
  if (!flags.has('--allow-prod')) {
    console.error('refusing: target IS production — re-run with --allow-prod after a second-person read-back')
    process.exit(1)
  }
  if (!(await confirm('type yes to overwrite PRODUCTION with this snapshot: '))) {
    console.error('aborted')
    process.exit(1)
  }
}
if (dryRun) {
  console.log('dry run — nothing written')
  process.exit(0)
}

const svc = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
for (const table of ALLOWED_TABLES) {
  const rows = snap.tables[table] ?? []
  if (!rows.length) {
    console.log(`${table}: empty, skipped`)
    continue
  }
  if (table === 'activity_log') {
    // Insert-missing-only: the immutability guard forbids UPDATE, so a blind
    // upsert would abort the restore midway on the second run.
    const ids = rows.map((r) => r.id)
    const existing = new Set()
    for (let i = 0; i < ids.length; i += 500) {
      const { data, error } = await svc.from(table).select('id').in('id', ids.slice(i, i + 500))
      if (error) throw new Error(`${table}: ${error.message}`)
      for (const r of data ?? []) existing.add(r.id)
    }
    const missing = rows.filter((r) => !existing.has(r.id))
    for (let i = 0; i < missing.length; i += 500) {
      const { error } = await svc.from(table).insert(missing.slice(i, i + 500))
      if (error) throw new Error(`${table}: ${error.message}`)
    }
    console.log(`${table}: inserted ${missing.length} missing rows (${rows.length - missing.length} already present)`)
    continue
  }
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await svc.from(table).upsert(rows.slice(i, i + 500), { onConflict: 'id' })
    if (error) throw new Error(`${table}: ${error.message}`)
  }
  console.log(`${table}: upserted ${rows.length} rows`)
}
console.log('restore complete — verify counts in the dashboard before announcing recovery')
