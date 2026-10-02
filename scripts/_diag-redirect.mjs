// TEMP diagnostic — deleted after use. Shows what Supabase records as
// .RedirectTo (the value the email template forwards as `next`).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const targets = [
  'https://www.alhalaqa.com/claim?phone=01000000000',
  'https://www.alhalaqa.com/claim?token=abc123',
  'https://www.alhalaqa.com/welcome',
  'https://www.alhalaqa.com/pay',
  'https://pay.alhalaqa.com/pay',
  'https://www.alhalaqa.com/auth/update-password',
]

for (const redirectTo of targets) {
  const email = `diag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`
  const created = await admin.auth.admin.createUser({ email, email_confirm: true })
  const userId = created.data?.user?.id
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })
  console.log(
    JSON.stringify({
      asked: redirectTo,
      err: error?.message ?? null,
      got_redirect_to: data?.properties?.redirect_to ?? null,
    }),
  )
  if (userId) await admin.auth.admin.deleteUser(userId)
}
