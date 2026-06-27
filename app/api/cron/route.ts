import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOverdueStudents } from '@/lib/overdue'
import { getBillingMonthKey } from '@/lib/billing-period'
import { sendOverdueEmail } from '@/lib/email-actions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, profile_id, default_monthly_price')

  if (!teachers || teachers.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no teachers' })
  }

  let sentCount = 0
  const results: any[] = []

  for (const teacher of teachers) {
    let email: string | undefined
    try {
      const result = await supabase.auth.admin.getUserById(teacher.profile_id)
      email = result.data?.user?.email
    } catch {}
    if (!email) continue

    const { data: students } = await supabase
      .from('students')
      .select('id, name, payment_day')
      .eq('teacher_id', teacher.id)
      .eq('is_active', true)

    if (!students || students.length === 0) continue

    const today = new Date()
    const months = [...new Set(students.map(s => getBillingMonthKey(today, s.payment_day || 1)))]

    const { data: payments } = await supabase
      .from('student_payments')
      .select('student_id, month, paid')
      .in('month', months)
      .in('student_id', students.map(s => s.id))

    const overdue = getOverdueStudents(students, payments || [], today)
    if (overdue.length === 0) continue

    const result = await sendOverdueEmail({
      to: email,
      teacherName: 'أستاذ',
      overdueNames: overdue.map(s => s.name),
    })

    results.push({ email, overdueCount: overdue.length, overdueNames: overdue.map(s => s.name), sent: result.sent, reason: result.reason })
    if (result.sent) sentCount++
  }

  return NextResponse.json({ sent: sentCount, results })
}
