const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL

type ColorCode = 0x22c55e | 0xef4444 | 0x3b82f6 | 0xf59e0b

const ACTION_COLORS: Record<string, ColorCode> = {
  payment_toggle: 0x22c55e,
  student_add: 0x3b82f6,
  student_delete: 0xef4444,
  student_update: 0xf59e0b,
  student_bulk_add: 0x3b82f6,
  price_update: 0xf59e0b,
  payment_day_update: 0xf59e0b,
  teacher_settings_update: 0x3b82f6,
  onboarding_complete: 0x22c55e,
}

export async function sendDiscordWebhook(
  actionType: string,
  teacherName: string,
  description: string,
  fields?: { name: string; value: string; inline?: boolean }[],
): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) return

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Alhalaqa',
        avatar_url: 'https://mekubphfwjgojqulbmjg.supabase.co/storage/v1/object/public/assets/logo.png',
        embeds: [
          {
            title: actionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            description,
            color: ACTION_COLORS[actionType] || 0x3b82f6,
            fields: fields || [],
            footer: { text: `Alhalaqa • ${teacherName}` },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    })
  } catch {
    // Fire-and-forget — never block the main action
  }
}
