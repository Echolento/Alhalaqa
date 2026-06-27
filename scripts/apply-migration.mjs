import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'

const __dirname = dirname(fileURLToPath(import.meta.url))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const sql = readFileSync(resolve(__dirname, '..', 'supabase', 'migrations', '028_add_push_subscriptions.sql'), 'utf-8')

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { error } = await supabase.rpc('exec_sql', { sql })

if (error) {
  // rpc might not exist — try direct fetch to Supabase management API
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
  })
  console.log('Direct API response:', response.status)
}

if (error) {
  console.error('Migration error:', error)
  process.exit(1)
}

console.log('Migration applied successfully')
