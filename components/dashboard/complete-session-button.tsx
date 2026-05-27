'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle, BookOpen, Star } from 'lucide-react'
import { completeSession, createSessionNote, updateStudentProgress } from '@/lib/data-actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FormattedDate } from '@/components/ui/formatted-date'
import { toast } from 'sonner'

interface Session {
  id: string
  scheduled_at: string
  duration_minutes: number
  student: {
    id: string
    profile: { full_name: string | null }
  }
}

export function CompleteSessionButton({ session }: { session: Session }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ratingNew, setRatingNew] = useState('5')
  const [ratingFarPast, setRatingFarPast] = useState('5')
  const [ratingRecentPast, setRatingRecentPast] = useState('5')

  const now = new Date()
  const sessionStart = new Date(session.scheduled_at)
  const sessionEnd = new Date(sessionStart.getTime() + (session.duration_minutes || 60) * 60000)
  const graceEnd = new Date(sessionEnd.getTime() + 60 * 60 * 1000)
  const canFinish = now >= sessionStart && now <= graceEnd

  const handleComplete = () => {
    setIsOpen(true)
  }

  const handleSaveNotes = async (formData: FormData) => {
    setLoading(true)
    try {
      const clamp = (v: number) => Math.min(5, Math.max(1, v))

      const noteResult = await createSessionNote(session.id, {
        new_content: formData.get('new_content') as string,
        far_past_review: formData.get('far_past_review') as string,
        recent_past_review: formData.get('recent_past_review') as string,
        general_notes: formData.get('general_notes') as string,
        next_task: formData.get('next_task') as string,
        rating_new: clamp(parseInt(ratingNew)),
        rating_far_past: clamp(parseInt(ratingFarPast)),
        rating_recent_past: clamp(parseInt(ratingRecentPast)),
      })

      if (noteResult.error) {
        toast.error('حدث خطأ أثناء حفظ الملاحظات: ' + noteResult.error)
        return
      }

      const completeResult = await completeSession(session.id)
      if (completeResult.error) {
        toast.error('حدث خطأ أثناء إنهاء الحصة: ' + completeResult.error)
        return
      }

      const surah = formData.get('current_surah') as string
      const ayah = parseInt(formData.get('current_ayah') as string)

      if (surah) {
        await updateStudentProgress(session.student.id, surah, ayah || 1)
      }

      setIsOpen(false)
      toast.success('تم الحفظ', { duration: 2000 })
      router.refresh()
    } catch (e) {
      console.error(e)
      toast.error('حدث خطأ أثناء الحفظ')
    } finally {
      setLoading(false)
    }
  }

  if (!canFinish) return null

  return (
    <>
      <Button
        size="sm"
        className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
        onClick={handleComplete}
        disabled={loading}
      >
        <CheckCircle className="w-4 h-4" />
        إتمام
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
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

            <div className="grid grid-cols-3 gap-3 pt-2 border-t">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500" />
                  تقييم الجديد
                </Label>
                <Select value={ratingNew} onValueChange={setRatingNew}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map(r => (
                      <SelectItem key={r} value={r.toString()} className="text-xs">
                        {r === 5 ? 'ممتاز' : r === 4 ? 'جيد جداً' : r === 3 ? 'جيد' : r === 2 ? 'مقبول' : 'ضعيف'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500" />
                  تقييم البعيد
                </Label>
                <Select value={ratingFarPast} onValueChange={setRatingFarPast}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map(r => (
                      <SelectItem key={r} value={r.toString()} className="text-xs">
                        {r === 5 ? 'ممتاز' : r === 4 ? 'جيد جداً' : r === 3 ? 'جيد' : r === 2 ? 'مقبول' : 'ضعيف'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500" />
                  تقييم القريب
                </Label>
                <Select value={ratingRecentPast} onValueChange={setRatingRecentPast}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map(r => (
                      <SelectItem key={r} value={r.toString()} className="text-xs">
                        {r === 5 ? 'ممتاز' : r === 4 ? 'جيد جداً' : r === 3 ? 'جيد' : r === 2 ? 'مقبول' : 'ضعيف'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground w-full">
                {loading ? 'جاري الحفظ...' : 'حفظ الملاحظات'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
