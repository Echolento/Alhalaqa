// scripts/restore-backup.mjs <backup-file>
// Restores a nightly-backup snapshot with service-key upserts (id-keyed, so
// re-running is safe). Point it at a SCRATCH project first via env overrides:
//
//   SUPABASE_URL=https://<scratch-ref>.supabase.co SUPABASE_SERVICE_KEY=sb_secret_... node scripts/restore-backup.mjs backups/alhalaqa-20261016-0300.json
//
// Limits (read before a real restore):
// - auth.users + storage objects are NOT in the snapshot (metadata only).
//   Recreate logins by re-invite; re-upload receipts from the 1h-signed-URL
//   era is impossible — keep receipt images elsewhere if they matter.
// - activity_log rows insert as-is (append-only trigger allows INSERT).
// - Run against production only with a backup newer than the damage.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const env = { ...process.env }
  for (const f of ['.env.local', '.env']) {
    const p = join(ROOT, f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i > 0 && !(t.slice(0, i).trim() in env)) env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
    }
  }
  return env
}

const file = resolve(ROOT, process.argv[2] ?? '')
if (!file || !existsSync(file)) {
  console.error('usage: node scripts/restore-backup.mjs backups/<file>.json')
  process.exit(1)
}

const env = loadEnv()
const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Missing Supabase URL / service key')
const svc = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const snap = JSON.parse(readFileSync(file, 'utf8'))
for (const [table, rows] of Object.entries(snap.tables)) {
  if (!rows.length) {
    console.log(`${table}: empty, skipped`)
    continue
  }
  // Strip columns that only the server may own on insert.
  const clean = rows.map((r) => ({ ...r }))
  for (let i = 0; i < clean.length; i += 500) {
    const chunk = clean.slice(i, i + 500)
    const { error } = await svc.from(table).upsert(chunk, { onConflict: 'id' })
    if (error) throw new Error(`${table}: ${error.message}`)
  }
  console.log(`${table}: upserted ${rows.length} rows`)
}
console.log('restore complete — verify counts in the dashboard before announcing recovery')
