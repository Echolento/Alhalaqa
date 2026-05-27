'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Plus, AlertCircle, CheckCircle, Calendar, Users, Video, Clock, Settings2 } from 'lucide-react'
import { createSession, getTeacherDefaultOnline } from '@/lib/data-actions'
import WeekTimePicker from '@/components/ui/week-time-picker'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Student {
    id: string
    profile: { full_name: string | null }
}

interface CreateSessionDialogProps {
    students: Student[]
    trigger?: React.ReactNode
    defaultStudentId?: string
}

export function CreateSessionDialog({ students, trigger, defaultStudentId }: CreateSessionDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [isRecurring, setIsRecurring] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [activeTab, setActiveTab] = useState("info")
    const [studentId, setStudentId] = useState(defaultStudentId || "")
    const [nextSessions, setNextSessions] = useState<Date[]>([])
    const [isOnline, setIsOnline] = useState(true)
    const [defaultMeetLink, setDefaultMeetLink] = useState('')
    const defaultOnlineRef = useRef(true)

    useEffect(() => {
        getTeacherDefaultOnline().then(({ isOnline, defaultMeetLink }) => {
            defaultOnlineRef.current = isOnline
            setIsOnline(isOnline)
            setDefaultMeetLink(defaultMeetLink || '')
        })
    }, [])

    // Generate next 4 sessions based on selected date
    const generateNext4Dates = (startDate: Date) => {
        const dates: Date[] = []
        for (let i = 0; i < 4; i++) {
            const d = new Date(startDate)
            d.setDate(d.getDate() + i * 7)
            dates.push(d)
        }
        return dates
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(false)

        const formData = new FormData(e.currentTarget)
        const duration = parseInt(formData.get('duration') as string)
        const meetLink = isOnline ? (formData.get('meet_link') as string) : ''
        const scheduledAt = selectedDate ? selectedDate.toISOString() : null

        if (!studentId) {
            setError('يرجى اختيار طالب أولاً')
            setActiveTab("info")
            setLoading(false)
            return
        }

        if (!scheduledAt) {
            setError('يرجى اختيار موعد من الجدول الأسبوعي')
            setActiveTab("schedule")
            setLoading(false)
            return
        }

        try {
            let createdDates: Date[] = []

            if (isRecurring) {
                // create first 4 sessions upfront
                const next4 = generateNext4Dates(selectedDate!)
                const errors: string[] = []

                for (let i = 0; i < next4.length; i++) {
                    const sessionDate = next4[i]
                    const result = await createSession({
                        student_id: studentId,
                        scheduled_at: sessionDate.toISOString(),
                        duration_minutes: duration,
                        google_meet_link: meetLink || undefined,
                        is_recurring: true, // backend continues generating future sessions
                    })

                    if (result.error) {
                        errors.push(`الأسبوع ${i + 1}: ${result.error}`)
                    } else {
                        createdDates.push(sessionDate)
                    }
                }

                if (errors.length > 0) {
                    setError(errors.join('\n'))
                } else {
                    setSuccess(true)
                    setNextSessions(createdDates)
                    router.refresh()
                    setTimeout(() => {
                        setOpen(false)
                        setSuccess(false)
                    }, 2000)
                }
            } else {
                const result = await createSession({
                    student_id: studentId,
                    scheduled_at: scheduledAt,
                    duration_minutes: duration,
                    google_meet_link: meetLink || undefined,
                })

                if (result.error) {
                    setError(result.error)
                } else {
                    setSuccess(true)
                    setNextSessions([new Date(scheduledAt)])
                    router.refresh()
                    setTimeout(() => {
                        setOpen(false)
                        setSuccess(false)
                    }, 2000)
                }
            }
        } catch (err) {
            setError('حدث خطأ غير متوقع')
        }

        setLoading(false)
    }

    function resetForm() {
        setStudentId(defaultStudentId || "")
        setSelectedDate(null)
        setActiveTab("info")
        setIsRecurring(false)
        setIsOnline(defaultOnlineRef.current)
        setError(null)
        setSuccess(false)
        setNextSessions([])
    }

    return (
        <Dialog open={open} onOpenChange={(open) => { if (open) resetForm(); setOpen(open) }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        إضافة حصة
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-gradient-to-b from-card to-background">
                <DialogHeader className="p-6 sm:p-8 bg-primary/5 border-b border-primary/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <div className="relative z-10 text-right">
                        <DialogTitle className="text-2xl font-bold tracking-tight">إضافة حصة جديدة</DialogTitle>
                        <DialogDescription className="text-muted-foreground mt-2 text-md">
                            قم بجدولة حصة قرآنية جديدة لطلابك بسهولة وسرعة
                        </DialogDescription>
                    </div>
                </DialogHeader>

                {success ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4 text-emerald-600 animate-in zoom-in duration-300">
                        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                            <CheckCircle className="w-10 h-10" />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-bold">
                                {isRecurring ? 'تم إنشاء 4 الحصص الأولى بنجاح!' : 'تم إنشاء الحصة بنجاح!'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">سيتم تحديث جدولك الآن</p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <div className="px-4 sm:px-6 pt-4">
                                <TabsList className="grid w-full grid-cols-3 h-11 sm:h-12">
                                    <TabsTrigger value="info" className="gap-2">
                                        <Users className="w-4 h-4" />
                                        البيانات
                                    </TabsTrigger>
                                    <TabsTrigger value="schedule" className="gap-2">
                                        <Calendar className="w-4 h-4" />
                                        الموعد
                                    </TabsTrigger>
                                    <TabsTrigger value="settings" className="gap-2">
                                        <Settings2 className="w-4 h-4" />
                                        الإعدادات
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="p-4 sm:p-6">
                                {error && (
                                    <div className="mb-4 flex items-start gap-2 p-3 text-sm text-destructive bg-destructive/5 border border-destructive/10 rounded-lg animate-in fade-in">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span className="whitespace-pre-line font-medium">{error}</span>
                                    </div>
                                )}

                                <TabsContent value="info" className="space-y-4 mt-0 border-none p-0 outline-none">
                                    <div className="space-y-2">
                                        <Label htmlFor="student_id" className="text-sm font-bold flex items-center gap-2">
                                            <Users className="w-4 h-4 text-primary" />
                                            الطالب المستهدف
                                        </Label>
                                        <Select
                                            name="student_id"
                                            value={studentId}
                                            onValueChange={setStudentId}
                                            required
                                        >
                                            <SelectTrigger className="h-12">
                                                <SelectValue placeholder="اختر الطالب من القائمة" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {students.map((student) => (
                                                    <SelectItem key={student.id} value={student.id}>
                                                        {student.profile?.full_name || 'طالب'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="duration" className="text-sm font-bold flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-primary" />
                                            مدة الحصة
                                        </Label>
                                        <Select name="duration" defaultValue="30">
                                            <SelectTrigger className="h-12">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="30">30 دقيقة (نصف ساعة)</SelectItem>
                                                <SelectItem value="45">45 دقيقة</SelectItem>
                                                <SelectItem value="60">60 دقيقة (ساعة كاملة)</SelectItem>
                                                <SelectItem value="90">90 دقيقة</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="pt-4">
                                        <Button
                                            type="button"
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                            onClick={() => setActiveTab("schedule")}
                                        >
                                            التالي
                                        </Button>
                                    </div>
                                </TabsContent>

                                <TabsContent value="schedule" className="space-y-4 mt-0 border-none p-0 outline-none">
                                    <WeekTimePicker
                                        value={selectedDate}
                                        onChange={(d) => setSelectedDate(d)}
                                        minuteStep={60}
                                        startHour={7}
                                        endHour={23}
                                    />
                                    <input type="hidden" name="scheduled_at" value={selectedDate ? selectedDate.toISOString() : ''} />

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setActiveTab("info")}
                                        >
                                            السابق
                                        </Button>
                                        <Button
                                            type="button"
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                            onClick={() => setActiveTab("settings")}
                                        >
                                            التالي
                                        </Button>
                                    </div>
                                </TabsContent>

                                <TabsContent value="settings" className="space-y-4 mt-0 border-none p-0 outline-none">
                                    {isOnline ? (
                                        <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
                                            <Input
                                                name="meet_link"
                                                type="url"
                                                dir="ltr"
                                                defaultValue={defaultMeetLink}
                                                key={`meet_link_${open}`}
                                                placeholder="https://meet.google.com/..."
                                                className="h-9 text-sm bg-background border-0 focus-visible:ring-1"
                                            />
                                            <Switch
                                                id="online_toggle"
                                                checked={isOnline}
                                                onCheckedChange={setIsOnline}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="online_toggle" className="font-bold flex items-center gap-2">
                                                    <Video className="w-4 h-4 text-primary" />
                                                    هذه الحصة عبر الإنترنت
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    سيتم إضافة رابط الاجتماع للحصة
                                                </p>
                                            </div>
                                            <Switch
                                                id="online_toggle"
                                                checked={isOnline}
                                                onCheckedChange={setIsOnline}
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="recurring" className="font-bold flex items-center gap-2">
                                                تكرار أسبوعي
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                سيتم عرض 4 الحصص القادمة في الجدول، وسيتم إنشاء الحصص الجديدة تلقائياً عند انتهاء أي حصة
                                            </p>
                                        </div>
                                        <Switch
                                            id="recurring"
                                            name="recurring"
                                            checked={isRecurring}
                                            onCheckedChange={setIsRecurring}
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => setActiveTab("schedule")}
                                        >
                                            الرجوع للموعد
                                        </Button>
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>

                        {activeTab === "settings" && (
                        <DialogFooter className="p-6 bg-muted/30 border-t items-center sm:justify-between flex-row gap-4">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="hidden sm:inline-flex">
                                إلغاء
                            </Button>
                            <Button type="submit" disabled={loading} className="px-8 h-12 text-md font-bold flex-1 sm:flex-none">
                                {loading ? 'جاري الحفظ...' : isRecurring ? 'إنشاء حصص دورية' : 'تأكيد المعاد'}
                            </Button>
                        </DialogFooter>
                        )}
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
