'use server'

import { createClient } from '@/lib/supabase/server'
import { sendDiscordWebhook } from './discord-webhook'
import type { ActionType } from './types'

interface LogActivityOptions {
  actionType: ActionType
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
}

export async function logActivity(opts: LogActivityOptions) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  try {
    await supabase.from('activity_log').insert({
      user_id: user.id,
      action_type: opts.actionType,
      entity_type: opts.entityType || null,
      entity_id: opts.entityId || null,
      details: opts.details || null,
    })
  } catch {
    // DB insert is best-effort — never block the action or the Discord webhook
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const teacherName = profile?.full_name || 'مستخدم'

  const descriptionMap: Record<string, (d: Record<string, unknown>) => string> = {
    payment_toggle: d =>
      `${d.student_name || 'طالب'}: ${d.new_status === 'paid' ? '✅ مدفوع' : '❌ غير مدفوع'} — ${d.month || ''}`,
    student_add: d => `➕ طالب جديد: ${d.student_name || ''}`,
    student_delete: d => `🗑️ حذف طالب: ${d.student_name || ''}`,
    student_update: d => `✏️ تحديث طالب: ${d.student_name || ''}`,
    student_bulk_add: d => `📥 إضافة ${d.count || 0} طالب/طلاب دفعة واحدة`,
    price_update: d => `💰 تحديث سعر الطالب ${d.student_name || ''}: ${d.old_price} ← ${d.new_price}`,
    payment_day_update: d => `📅 تحديث يوم الدفع للطالب ${d.student_name || ''}: ${d.old_day} ← ${d.new_day}`,
    teacher_settings_update: () => `⚙️ تحديث الإعدادات`,
    onboarding_complete: () => `🚀 تم إكمال الإعداد الأولي`,
  }

  const desc = opts.details
    ? (descriptionMap[opts.actionType]?.(opts.details) || opts.actionType)
    : opts.actionType

  const fields: { name: string; value: string; inline?: boolean }[] = []
  if (opts.details) {
    for (const [key, value] of Object.entries(opts.details)) {
      if (key === 'student_name' || key === 'new_status' || key === 'month') continue
      fields.push({ name: key, value: String(value), inline: true })
    }
  }

  await sendDiscordWebhook(opts.actionType, teacherName, desc, fields)
}
