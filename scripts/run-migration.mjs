import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mekubphfwjgojqulbmjg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1la3VicGhmd2pnb2pxdWxibWpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg3MDE4MiwiZXhwIjoyMDg1NDQ2MTgyfQ.bq8eFufT7itliI5h2WIQ28El8pkCKcbVVj_2nuR5Dds'

const sql = `
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_profile ON public.push_subscriptions (profile_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own push subscription" ON public.push_subscriptions
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
`

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // Try common Supabase SQL execution methods
  const methods = [
    { name: 'exec_sql', params: { query_text: sql } },
    { name: 'exec', params: { query: sql } },
    { name: 'pg_query', params: { query: sql } },
    { name: 'sql', params: { query: sql } },
  ]

  for (const method of methods) {
    const { data, error } = await supabase.rpc(method.name, method.params)
    if (!error) {
      console.log(`OK via ${method.name}`)
      return
    }
    console.log(`${method.name}: ${error.message}`)
  }

  // Try direct fetch to management API
  const ref = supabaseUrl.split('.')[0].replace('https://', '')
  const mgmtUrl = `https://api.supabase.com/v1/projects/${ref}/database/query`
  const mgmtKey = supabaseKey

  console.log(`Trying management API: ${mgmtUrl}`)
  const res = await fetch(mgmtUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mgmtKey}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  console.log(`Management API (${res.status}): ${text.substring(0, 200)}`)

  console.log('\nNone of the automatic methods worked.')
  console.log('Please apply the migration manually:')
  console.log('1. Go to https://supabase.com/dashboard/project/mekubphfwjgojqulbmjg/sql/new')
  console.log('2. Paste the SQL from: supabase/migrations/028_add_push_subscriptions.sql')
  console.log('3. Click "Run"')
}

main().catch(console.error)
