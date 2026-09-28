// lib/__tests__/payer-hub.test.ts
// A3 slice — pure grouping of a payer's claimed students into stacked
// teacher sections (X above Y, never tabs). Deterministic order: teacher
// name, then student name (Arabic-locale compare).

import { describe, it, expect } from 'vitest'
import { groupHubByTeacher, type HubStudent } from '@/lib/payer-hub'

const S = (studentId: string, studentName: string, teacherId: string, teacherName: string): HubStudent => ({
  studentId,
  studentName,
  teacherId,
  teacherName,
})

describe('groupHubByTeacher', () => {
  it('returns one section per teacher with its students', () => {
    const sections = groupHubByTeacher([
      S('s1', 'أحمد', 't1', 'الشيخ علي'),
      S('s2', 'سارة', 't1', 'الشيخ علي'),
      S('s3', 'خالد', 't2', 'الشيخ عمر'),
    ])
    expect(sections).toHaveLength(2)
    expect(sections[0]?.students.map((s) => s.studentId)).toEqual(['s1', 's2'])
    expect(sections[1]?.students.map((s) => s.studentId)).toEqual(['s3'])
  })

  it('sorts sections by teacher name and students by name', () => {
    const sections = groupHubByTeacher([
      S('s2', 'سارة', 't1', 'الشيخ علي'),
      S('s1', 'أحمد', 't1', 'الشيخ علي'),
      S('s3', 'خالد', 't2', 'الأستاذ بكر'),
    ])
    expect(sections[0]?.teacherName).toBe('الأستاذ بكر')
    expect(sections[1]?.students.map((s) => s.studentName)).toEqual(['أحمد', 'سارة'])
  })

  it('returns empty for no students', () => {
    expect(groupHubByTeacher([])).toEqual([])
  })

  it('falls back to a neutral teacher label when the name is missing', () => {
    const sections = groupHubByTeacher([S('s1', 'أحمد', 't1', '')])
    expect(sections[0]?.teacherName).toBeTruthy()
  })
})
