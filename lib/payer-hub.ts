// lib/payer-hub.ts
// A3 slice — pure payer-home helpers. groupHubByTeacher stacks the caller's
// claimed students into one section per teacher (above each other, never
// tabs). Sort: teacher name, then student name (Arabic-locale compare).

export interface HubStudent {
  studentId: string
  studentName: string
  teacherId: string
  teacherName: string
}

export interface HubTeacherSection {
  teacherId: string
  teacherName: string
  students: HubStudent[]
}

export const HUB_UNKNOWN_TEACHER_LABEL = 'المعلم'

export function groupHubByTeacher(students: HubStudent[]): HubTeacherSection[] {
  const byTeacher = new Map<string, HubTeacherSection>()
  for (const s of students) {
    const teacherName = s.teacherName?.trim() ? s.teacherName : HUB_UNKNOWN_TEACHER_LABEL
    let section = byTeacher.get(s.teacherId)
    if (!section) {
      section = { teacherId: s.teacherId, teacherName, students: [] }
      byTeacher.set(s.teacherId, section)
    }
    section.students.push(s)
  }
  const sections = [...byTeacher.values()]
  const cmp = (a: string, b: string) => a.localeCompare(b, 'ar')
  sections.sort((x, y) => cmp(x.teacherName, y.teacherName))
  for (const section of sections) {
    section.students.sort((a, b) => cmp(a.studentName, b.studentName))
  }
  return sections
}
