'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Video,
  CheckCircle,
  XCircle,
  Search,
  Star,
  BookOpen,
  Clock,
  FileText,
} from 'lucide-react'
import { updateSessionStatus, createSessionNote, updateStudentProgress } from '@/lib/data-actions'
import type { UserRole } from '@/lib/types'
import { FormattedDate } from '@/components/ui/formatted-date'

interface SessionNote {
  new_content: string | null
  far_past_review: string | null
  recent_past_review: string | null
  general_notes: string | null
  next_task: string | null
  rating_new: number | null
  rating_far_past: number | null
  rating_recent_past: number | null
}

interface Session {
  id: string
  scheduled_at: string
  duration_minutes: number
  status: string
  google_meet_link: string | null
  student?: {
    id: string
    profile: { full_name: string | null }
  }
  teacher?: {
    profile: { full_name: string | null }
    google_meet_link: string | null
  }
  session_notes?: SessionNote[]
}

interface SessionsListProps {
  sessions: Session[]
  role: UserRole
}

export function SessionsList({ sessions, role }: SessionsListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Use state for 'now' to avoid server/client mismatch (hydration error)
  const [now] = useState<string>(() => new Date().toISOString())

  const filteredSessions = sessions.filter((session) => {
    const name = role === 'teacher'
      ? session.student?.profile?.full_name
      : session.teacher?.profile?.full_name
    return name?.toLowerCase().includes(search.toLowerCase()) || !search
  })

  // Show ALL scheduled sessions regardless of date — past-due sessions should still be completable
  const upcomingSessions = filteredSessions.filter(s => s.status === 'scheduled')
  const completedSessions = filteredSessions.filter(s => s.status === 'completed')
  const cancelledSessions = filteredSessions.filter(s => s.status === 'cancelled')

  const handleStatusChange = async (session: Session, status: 'completed' | 'cancelled') => {
    setLoading(true)
    await updateSessionStatus(session.id, status)
    setLoading(false)
    router.refresh()
    // Auto-open notes dialog when a session is marked complete
    if (status === 'completed') {
      setSelectedSession(session)
      setIsNotesOpen(true)
    }
  }

  const handleSaveNotes = async (formData: FormData) => {
    if (!selectedSession) return
    setLoading(true)

    try {
      // Save notes
      const result = await createSessionNote(selectedSession.id, {
        new_content: formData.get('new_content') as string,
        far_past_review: formData.get('far_past_review') as string,
        recent_past_review: formData.get('recent_past_review') as string,
        general_notes: formData.get('general_notes') as string,
        next_task: formData.get('next_task') as string,
        rating_new: parseInt(formData.get('rating_new') as string) || 0,
        rating_far_past: parseInt(formData.get('rating_far_past') as string) || 0,
        rating_recent_past: parseInt(formData.get('rating_recent_past') as string) || 0,
      })

      if (result.error) {
        console.error('Error saving notes:', result.error)
        alert('حدث خطأ أثناء حفظ الملاحظات: ' + result.error)
      } else {
        // Update student progress if provided
        const surah = formData.get('current_surah') as string
        const ayah = parseInt(formData.get('current_ayah') as string)

        if (surah && selectedSession.student?.id) {
          await updateStudentProgress(selectedSession.student.id, surah, ayah || 1)
        }

        setIsNotesOpen(false)
        router.refresh()
      }
    } catch (e) {
      console.error('Unhandled error saving notes:', e)
      alert('حدث خطأ غير متوقع أثناء الحفظ')
    } finally {
      setLoading(false)
    }
  }

  const renderSessionCard = (session: Session) => {
    const name = role === 'teacher'
      ? session.student?.profile?.full_name
      : session.teacher?.profile?.full_name
    const meetLink = session.google_meet_link || session.teacher?.google_meet_link
    const note = session.session_notes?.[0]

    return (
      <Card key={session.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {name?.charAt(0) || '؟'}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    <span className="sm:hidden">{name?.split(' ')[0] || (role === 'teacher' ? 'طالب' : 'معلم')}</span>
                    <span className="hidden sm:inline">{name || (role === 'teacher' ? 'طالب' : 'معلم')}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <FormattedDate
                      date={session.scheduled_at}
                      options={{
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }}
                    />
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={
                    session.status === 'completed'
                      ? 'default'
                      : session.status === 'cancelled'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {session.status === 'completed' && 'مكتمل'}
                  {session.status === 'scheduled' && 'مجدول'}
                  {session.status === 'cancelled' && 'ملغي'}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {session.duration_minutes} دقيقة
                </Badge>
                {(note?.rating_new || note?.rating_far_past || note?.rating_recent_past) && (
                  <div className="flex items-center gap-1">
                    {note?.rating_new && (
                      <Badge variant="outline" className="flex items-center gap-0.5 text-xs px-1">
                        <span>ج</span>
                        <Star className="w-2 h-2" />
                        {note.rating_new}
                      </Badge>
                    )}
                    {note?.rating_far_past && (
                      <Badge variant="outline" className="flex items-center gap-0.5 text-xs px-1">
                        <span>ب</span>
                        <Star className="w-2 h-2" />
                        {note.rating_far_past}
                      </Badge>
                    )}
                    {note?.rating_recent_past && (
                      <Badge variant="outline" className="flex items-center gap-0.5 text-xs px-1">
                        <span>ق</span>
                        <Star className="w-2 h-2" />
                        {note.rating_recent_past}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Session notes preview */}
              {note && (
                <div className="text-sm space-y-1 p-2 bg-muted rounded-lg">
                  {note.new_content && (
                    <p><span className="text-muted-foreground">الجديد:</span> {note.new_content}</p>
                  )}
                  {note.general_notes && (
                    <p><span className="text-muted-foreground">ملاحظات:</span> {note.general_notes}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-row sm:flex-col gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 mt-2 sm:mt-0">
              {meetLink && (
                <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-none min-h-[44px]">
                  <a href={meetLink} target="_blank" rel="noopener noreferrer">
                    <Video className="w-4 h-4 ml-1" />
                    انضم
                  </a>
                </Button>
              )}

              {role === 'teacher' && session.status === 'scheduled' && (
                <>
                  <Button
                    size="sm"
                    className="flex-1 sm:flex-none min-h-[44px]"
                    onClick={() => handleStatusChange(session, 'completed')}
                    disabled={loading || session.scheduled_at > now}
                    title={session.scheduled_at > now ? 'لا يمكن إتمام الحصة قبل موعدها' : 'إتمام الحصة'}
                  >
                    <CheckCircle className="w-4 h-4 ml-1" />
                    إتمام
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 sm:flex-none min-h-[44px]"
                    onClick={() => handleStatusChange(session, 'cancelled')}
                    disabled={loading || session.scheduled_at > now}
                    title={session.scheduled_at > now ? 'لا يمكن إلغاء الحصة قبل موعدها' : 'إلغاء الحصة'}
                  >
                    <XCircle className="w-4 h-4 ml-1" />
                    إلغاء
                  </Button>
                </>
              )}

              {role === 'teacher' && session.status === 'completed' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 sm:flex-none min-h-[44px]"
                  onClick={() => {
                    setSelectedSession(session)
                    setIsNotesOpen(true)
                  }}
                >
                  <FileText className="w-4 h-4 ml-1" />
                  ملاحظات
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={`البحث عن ${role === 'teacher' ? 'طالب' : 'معلم'}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50">
          <TabsTrigger value="upcoming" className="flex items-center gap-1 md:gap-2 text-sm md:text-base min-h-[44px]">
            <Clock className="w-4 h-4" />
            القادمة ({upcomingSessions.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-1 md:gap-2 text-sm md:text-base min-h-[44px]">
            <CheckCircle className="w-4 h-4" />
            المكتملة ({completedSessions.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-1 md:gap-2 text-sm md:text-base min-h-[44px]">
            <XCircle className="w-4 h-4" />
            الملغية ({cancelledSessions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3 md:space-y-4 mt-4">
          {upcomingSessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                لا توجد حصص قادمة
              </CardContent>
            </Card>
          ) : (
            upcomingSessions.map(renderSessionCard)
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 md:space-y-4 mt-4">
          {completedSessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                لا توجد حصص مكتملة
              </CardContent>
            </Card>
          ) : (
            completedSessions.map(renderSessionCard)
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-3 md:space-y-4 mt-4">
          {cancelledSessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                لا توجد حصص ملغية
              </CardContent>
            </Card>
          ) : (
            cancelledSessions.map(renderSessionCard)
          )}
        </TabsContent>
      </Tabs>

      {/* Notes Dialog */}
      <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              ملاحظات الحصة
            </DialogTitle>
            <DialogDescription>
              {selectedSession?.student?.profile?.full_name} -{' '}
              {selectedSession && <FormattedDate date={selectedSession.scheduled_at} />}
            </DialogDescription>
          </DialogHeader>

          <form action={handleSaveNotes} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_content">الجديد <span className="text-destructive">*</span></Label>
              <Textarea
                id="new_content"
                name="new_content"
                placeholder="ما تم حفظه من جديد..."
                defaultValue={selectedSession?.session_notes?.[0]?.new_content || ''}
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="far_past_review">الماضي البعيد <span className="text-destructive">*</span></Label>
              <Textarea
                id="far_past_review"
                name="far_past_review"
                placeholder="مراجعة الماضي البعيد..."
                defaultValue={selectedSession?.session_notes?.[0]?.far_past_review || ''}
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recent_past_review">الماضي القريب <span className="text-destructive">*</span></Label>
              <Textarea
                id="recent_past_review"
                name="recent_past_review"
                placeholder="مراجعة الماضي القريب..."
                defaultValue={selectedSession?.session_notes?.[0]?.recent_past_review || ''}
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="general_notes">ملاحظات عامة</Label>
              <Textarea
                id="general_notes"
                name="general_notes"
                placeholder="ملاحظات إضافية..."
                defaultValue={selectedSession?.session_notes?.[0]?.general_notes || ''}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNotesOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'جاري الحفظ...' : 'حفظ الملاحظات'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
