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
    const [success, setSuccess] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError(null)
        setSuccess(false)

        const phone = formData.get('phone') as string
        const result = await inviteStudent(phone)

        if (result.error) {
            setError(result.error)
        } else {
            setSuccess(true)
            setTimeout(() => {
                setOpen(false)
                setSuccess(false)
            }, 2000)
        }

        setLoading(false)
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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>دعوة طالب جديد</DialogTitle>
                    <DialogDescription>
                        أدخل رقم هاتف الطالب الذي ترغب بإضافته
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-4 text-success">
                        <CheckCircle className="w-12 h-12" />
                        <p className="font-medium">تم إرسال الدعوة بنجاح!</p>
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
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
