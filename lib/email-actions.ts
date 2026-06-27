import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND)

const primary = '#10b981'
const primaryLight = '#d1fae5'
const destructive = '#ef4444'
const destructiveLight = '#fef2f2'

export async function sendOverdueEmail(params: {
  to: string
  teacherName: string
  overdueNames: string[]
}): Promise<{ sent: boolean; reason?: string }> {
  const { to, teacherName, overdueNames } = params

  const names = overdueNames.slice(0, 3)
  const remaining = overdueNames.length - 3
  let summary = names.join('، ')
  if (remaining > 0) summary += ` +${remaining} ${remaining === 1 ? 'آخر' : 'آخرين'}`
  summary += ' لم يدفعوا بعد'

  const listItems = overdueNames.map((n, i) => `
    <tr>
      <td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f0; color: #334155; font-size: 15px;">
        <span style="font-weight: 700; color: ${destructive}; margin-left: 8px;">${i + 1}.</span>
        ${n}
      </td>
    </tr>
  `).join('')

  const { error } = await resend.emails.send({
    from: 'الحلقة <noreply@alhalaqa.com>',
    to,
    subject: `تذكير بالدفع — ${overdueNames.length} طالب`,
    html: `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, ${primary}, #059669); padding: 32px 24px; text-align: center;">
          <h1 style="color: #fff; font-size: 22px; font-weight: 700; margin: 0;">الحلقة</h1>
          <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 8px 0 0;">تذكير بالدفعات المتأخرة</p>
        </div>

        <div style="padding: 24px; background: #fff; margin: 0 12px; border-radius: 12px; margin-top: -12px; position: relative;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
            <div style="width: 40px; height: 40px; background: ${destructiveLight}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <span style="color: ${destructive}; font-size: 20px;">!</span>
            </div>
            <div>
              <h2 style="color: ${destructive}; font-size: 18px; font-weight: 700; margin: 0;">دفعات متأخرة</h2>
              <p style="color: #64748b; font-size: 14px; margin: 4px 0 0;">السلام عليكم ${teacherName}</p>
            </div>
          </div>

          <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 0 0 16px;">
            الطلاب التاليون لم يسددوا رسومهم الشهرية بعد. يرجى متابعتهم:
          </p>

          <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 10px; overflow: hidden;">
            <tbody>
              ${listItems}
            </tbody>
          </table>

          <div style="background: ${primaryLight}; border-radius: 10px; padding: 14px 18px; margin-top: 16px; text-align: center;">
            <p style="margin: 0; font-size: 16px; font-weight: 700; color: ${primary};">${summary}</p>
          </div>

          <div style="margin-top: 24px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/payments" style="display: inline-block; background: ${primary}; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
              عرض صفحة المدفوعات
            </a>
          </div>
        </div>

        <div style="text-align: center; padding: 24px 12px;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            الحلقة — منصة إدارة الحلقات القرآنية
          </p>
        </div>
      </div>
    `,
  })

  if (error) return { sent: false, reason: error.message }
  return { sent: true }
}
