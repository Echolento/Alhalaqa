import { describe, it, expect } from 'vitest'
import { buildAutoDuePayload, buildManualRemindPayload, buildReceiptUploadedPayload, buildVerdictPayload, buildTeacherDigestPayload } from '@/lib/push-payloads'

describe('buildAutoDuePayload (tracer)', () => {
  it('targets the payer profile with Arabic body and frozen pay-screen URL', () => {
    const out = buildAutoDuePayload({
      payerProfileId: 'payer-1',
      studentName: 'أحمد',
      amount: 200,
      currency: 'EGP',
      studentId: 'stu-1',
      periodKey: '2026-09-01',
      autoRemindersEnabled: true,
    })

    expect(out).not.toBeNull()
    expect(out!.profileId).toBe('payer-1')
    expect(out!.payload.title).toContain('تذكير')
    expect(out!.payload.body).toContain('أحمد')
    expect(out!.payload.url).toBe('/pay?student=stu-1&period=2026-09-01')
  })

  it('returns null when auto-reminders are disabled', () => {
    const out = buildAutoDuePayload({
      payerProfileId: 'payer-1',
      studentName: 'أحمد',
      studentId: 'stu-1',
      autoRemindersEnabled: false,
    })

    expect(out).toBeNull()
  })
})

describe('buildManualRemindPayload', () => {
  it('targets the payer even when auto-reminders are disabled', () => {
    const out = buildManualRemindPayload({
      payerProfileId: 'payer-9',
      studentName: 'عمر',
      studentId: 'stu-9',
      periodKey: '2026-09-01',
      autoRemindersEnabled: false,
    })

    expect(out.profileId).toBe('payer-9')
    expect(out.payload.body).toContain('عمر')
    expect(out.payload.url).toBe('/pay?student=stu-9&period=2026-09-01')
  })
})

describe('buildReceiptUploadedPayload', () => {
  it('targets the teacher with frozen Unpaid queue URL', () => {
    const out = buildReceiptUploadedPayload({
      teacherProfileId: 'teacher-1',
      studentName: 'ليلى',
      receiptId: 'rc-42',
    })

    expect(out.profileId).toBe('teacher-1')
    expect(out.payload.body).toContain('ليلى')
    expect(out.payload.url).toBe('/dashboard/unpaid?receipt=rc-42')
  })
})

describe('buildVerdictPayload', () => {
  it('verified verdict links the payer to the pay screen', () => {
    const out = buildVerdictPayload({
      payerProfileId: 'payer-2',
      studentName: 'سارة',
      verified: true,
      studentId: 'stu-2',
      periodKey: '2026-09-01',
    })

    expect(out.profileId).toBe('payer-2')
    expect(out.payload.body).toContain('سارة')
    expect(out.payload.url).toBe('/pay?student=stu-2&period=2026-09-01')
  })

  it('rejected verdict carries the teacher note in Arabic', () => {
    const out = buildVerdictPayload({
      payerProfileId: 'payer-2',
      studentName: 'سارة',
      verified: false,
      note: 'الصورة غير واضحة',
      studentId: 'stu-2',
    })

    expect(out.payload.title).toContain('مراجعة')
    expect(out.payload.body).toContain('الصورة غير واضحة')
    expect(out.payload.url).toBe('/pay?student=stu-2')
  })
})

describe('buildTeacherDigestPayload', () => {
  it('targets the teacher dashboard with overdue names', () => {
    const out = buildTeacherDigestPayload({
      teacherProfileId: 'teacher-7',
      overdueNames: ['أحمد', 'عمر'],
      autoRemindersEnabled: true,
    })

    expect(out).not.toBeNull()
    expect(out!.profileId).toBe('teacher-7')
    expect(out!.payload.body).toContain('أحمد')
    expect(out!.payload.url).toBe('/dashboard')
  })

  it('digest returns null when auto-reminders are disabled', () => {
    const out = buildTeacherDigestPayload({
      teacherProfileId: 'teacher-7',
      overdueNames: ['أحمد'],
      autoRemindersEnabled: false,
    })

    expect(out).toBeNull()
  })
})
