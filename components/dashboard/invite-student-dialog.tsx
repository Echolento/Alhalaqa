'use client'

import { useState } from 'react'
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
import { UserPlus, AlertCircle, CheckCircle, Phone } from 'lucide-react'
import { inviteStudent } from '@/lib/invitation-actions'
import { formatPhoneNumber } from '@/lib/phone-utils'
import { PhoneInput } from '@/components/auth/phone-input'

interface InviteStudentDialogProps {
    trigger?: React.ReactNode
}

export function InviteStudentDialog({ trigger }: InviteStudentDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [waUrl, setWaUrl] = useState<string | null>(null)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError(null)
        setWaUrl(null)

        const phone = formData.get('phone') as string
        const result = await inviteStudent(phone)

        if (result.error) {
            setError(result.error)
        } else if (result.success && result.studentPhone) {
            const loginUrl = `${window.location.origin}/auth/signup`
            const teacherName = result.teacherName || ''
            const text = [
                `مرحباً بك! 👋`,
                `لقد تمت دعوتك من قبل الأستاذ ${teacherName} للانضمام كطالب في المنصة.`,
                `يرجى الدخول أو التسجيل عبر الرابط التالي:`,
                loginUrl,
                `بمجرد تسجيل الدخول سيتم إضافتك للطلاب تلقائياً. ✅`,
            ].join('\n\n')

            const cleanPhone = result.studentPhone.replace(/\+/g, '')
            setWaUrl(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`)
        }

        setLoading(false)
    }

    function handleClose() {
        setOpen(false)
        setWaUrl(null)
        setError(null)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <UserPlus className="w-4 h-4 ml-2" />
                        دعوة طالب
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>دعوة طالب جديد</DialogTitle>
                    <DialogDescription>
                        أدخل رقم هاتف الطالب. سيتم إنشاء رابط دعوة ورسالة واتساب جاهزة للإرسال.
                    </DialogDescription>
                </DialogHeader>

                {waUrl ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-5">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="font-semibold text-base">تم إنشاء الدعوة بنجاح!</p>
                            <p className="text-sm text-muted-foreground">اضغط الزر أدناه لفتح واتساب وإرسال رسالة الدعوة</p>
                        </div>
                        <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors text-sm shadow-md"
                        >
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            إرسال عبر واتساب
                        </a>
                        <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground">
                            إغلاق
                        </Button>
                    </div>
                ) : (
                    <form action={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <PhoneInput
                            id="phone"
                            name="phone"
                            label="رقم هاتف الطالب"
                            required
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleClose}>
                                إلغاء
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'جاري الإرسال...' : 'إرسال الدعوة'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
