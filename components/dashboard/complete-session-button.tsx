'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle, BookOpen } from 'lucide-react'
import { updateSessionStatus, createSessionNote, updateStudentProgress } from '@/lib/data-actions'
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
import { FormattedDate } from '@/components/ui/formatted-date'

interface Session {
  id: string
  scheduled_at: string
  student: {
    id: string
    profile: { full_name: string | null }
  }
}

export function CompleteSessionButton({ session }: { session: Session }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleComplete = async () => {
    setLoading(true)
    await updateSessionStatus(session.id, 'completed')
    setLoading(false)
    setIsOpen(true) // Open notes dialog after marking as complete
  }

  const handleSaveNotes = async (formData: FormData) => {
    setLoading(true)
    try {
      await createSessionNote(session.id, {
        new_content: formData.get('new_content') as string,
        far_past_review: formData.get('far_past_review') as string,
        recent_past_review: formData.get('recent_past_review') as string,
        general_notes: formData.get('general_notes') as string,
        next_task: formData.get('next_task') as string,
        rating_new: 0,
        rating_far_past: 0,
        rating_recent_past: 0,
      })

      // Update student progress if provided
      const surah = formData.get('current_surah') as string
      const ayah = parseInt(formData.get('current_ayah') as string)

      if (surah) {
        await updateStudentProgress(session.student.id, surah, ayah || 1)
      }

      setIsOpen(false)
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
        onClick={handleComplete}
        disabled={loading}
      >
        <CheckCircle className="w-4 h-4" />
        إتمام
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              ملاحظات الحصة
            </DialogTitle>
            <DialogDescription>
              {session.student?.profile?.full_name} -{' '}
              <FormattedDate date={session.scheduled_at} />
            </DialogDescription>
          </DialogHeader>

          <form action={handleSaveNotes} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_content">الجديد <span className="text-destructive">*</span></Label>
              <Textarea
                id="new_content"
                name="new_content"
                placeholder="ما تم حفظه من جديد..."
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
                rows={2}
                required
              />
            </div>


            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                لاحقاً
              </Button>
              <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground">
                {loading ? 'جاري الحفظ...' : 'حفظ الملاحظات'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
