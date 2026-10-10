import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

type Supabase = Awaited<ReturnType<typeof createClient>>
type Service = ReturnType<typeof createServiceClient>

export type ActionContext =
  | { user: { id: string }; supabase: Supabase; service: Service }
  | { error: 'Unauthorized' }

export async function requireUser(): Promise<ActionContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  return { user, supabase, service: createServiceClient() }
}
