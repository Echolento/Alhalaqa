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
import { join, dirname, resolve, basename, relative, isAbsolute } from 'path'
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
  // Never echo raw input: non-standard URLs print a fixed placeholder.
  return m ? m[1] : '[non-supabase-url]'
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
const KNOWN_FLAGS = new Set(['--dry-run', '--allow-prod', '--allow-stale'])
for (const f of flags) {
  // A mistyped --dryrun must never become a real write.
  if (!KNOWN_FLAGS.has(f)) {
    console.error(`refusing: unknown flag ${f} (known: ${[...KNOWN_FLAGS].join(', ')})`)
    process.exit(1)
  }
}
const fileArg = args[0] ?? ''
const file = resolve(ROOT, fileArg)
// Directory confinement via relative path, not string prefix
// (backups-evil/ passes a prefix test).
const rel = relative(BACKUP_DIR, file)
if (!fileArg || isAbsolute(rel) || rel.startsWith('..') || basename(fileArg).length === 0) {
  console.error('usage: node scripts/restore-backup.mjs backups/<alhalaqa-*.json> [--dry-run] [--allow-prod] [--allow-stale]')
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
// Freshness gate: a stale snapshot silently resurrects deletes and reverts
// newer rows. Deliberate stale restores pass --allow-stale explicitly.
const STALE_MS = 48 * 3600 * 1000
const snapshotAge = Date.now() - Date.parse(snap.exported_at)
const ageKnown = Number.isFinite(snapshotAge) && snapshotAge >= 0
// Fail closed: missing, corrupt, or future-dated timestamps gate exactly
// like a stale snapshot — only --allow-stale proceeds.
if (!dryRun && (!ageKnown || snapshotAge > STALE_MS) && !flags.has('--allow-stale')) {
  console.error(
    ageKnown
      ? `refusing: snapshot is ${Math.round(snapshotAge / 3600000)}h old (limit 48h) — re-run with --allow-stale after review`
      : 'refusing: snapshot exported_at is missing or invalid — re-run with --allow-stale after review',
  )
  process.exit(1)
}
const prodTarget = !!prod && targetRef === prod
if (!dryRun && (!prod || prodTarget)) {
  // Fail closed: unknown prod ref is treated like a prod target.
  if (!flags.has('--allow-prod')) {
    console.error(
      prod
        ? 'refusing: target IS production — re-run with --allow-prod after a second-person read-back'
        : 'refusing: production reference unknown (no .env file) — re-run with --allow-prod after verifying the target',
    )
    process.exit(1)
  }
  if (!(await confirm('type yes to overwrite PRODUCTION with this snapshot: '))) {
    console.error('aborted')
    process.exit(1)
  }
}
if (dryRun) {
  if (!ageKnown) {
    console.log('note: snapshot exported_at is missing or invalid — a real restore would need --allow-stale')
  } else if (snapshotAge > STALE_MS) {
    console.log(`note: snapshot is ${Math.round(snapshotAge / 3600000)}h old — a real restore would need --allow-stale`)
  }
  console.log('dry run — nothing written')
  process.exit(0)
}

const svc = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

// Merge-preserve columns: a stale snapshot must neither silently resurrect
// soft-deletes / un-revoke links NOR silently re-delete resurrected rows.
// Live-wins both directions; every conflict is logged for review.
const MERGE_PRESERVE = {
  students: ['deleted_at', 'claimed_by'],
  claim_tokens: ['revoked_at', 'used_at', 'used_by_profile_id'],
}
const preserved = new Map()
for (const [table, cols] of Object.entries(MERGE_PRESERVE)) {
  const rows = snap.tables[table] ?? []
  if (!rows.length) continue
  const ids = rows.map((r) => r.id)
  for (let i = 0; i < ids.length; i += 500) {
    const { data, error } = await svc
      .from(table)
      .select(['id', ...cols].join(','))
      .in('id', ids.slice(i, i + 500))
    if (error) throw new Error(`${table}: ${error.message}`)
    for (const r of data ?? []) preserved.set(`${table}:${r.id}`, r)
  }
}
let conflicts = 0
function mergePreserved(table, rows) {
  const cols = MERGE_PRESERVE[table]
  if (!cols) return rows
  let kept = 0
  const out = rows.map((r) => {
    const e = preserved.get(`${table}:${r.id}`)
    if (!e) return r
    const c = { ...r }
    for (const col of cols) {
      if (e[col] != null && c[col] == null) {
        // Live tombstone/revoke beats stale null: never resurrect.
        c[col] = e[col]
        kept++
      } else if (e[col] == null && c[col] != null) {
        // Live null beats stale tombstone: never re-delete.
        c[col] = e[col]
        kept++
        conflicts++
        console.log(`  conflict ${table}:${r.id} ${col}: snapshot set, live null — kept live`)
      } else if (e[col] != null && c[col] != null && e[col] !== c[col]) {
        // Both set but divergent: live wins, always logged.
        c[col] = e[col]
        kept++
        conflicts++
        console.log(`  conflict ${table}:${r.id} ${col}: snapshot differs, live kept`)
      }
    }
    return c
  })
  if (kept > 0) console.log(`  ${table}: preserved ${kept} live values`)
  return out
}

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
    const { error } = await svc.from(table).upsert(mergePreserved(table, rows.slice(i, i + 500), preserved), { onConflict: 'id' })
    if (error) throw new Error(`${table}: ${error.message}`)
  }
  console.log(`${table}: upserted ${rows.length} rows`)
}
console.log('restore complete — verify counts in the dashboard before announcing recovery')
