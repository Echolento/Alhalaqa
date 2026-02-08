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
import { UserPlus, AlertCircle, CheckCircle } from 'lucide-react'
import { inviteStudent } from '@/lib/invitation-actions'

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

        const email = formData.get('email') as string
        const result = await inviteStudent(email)

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
                        أدخل البريد الإلكتروني للطالب الذي ترغب بإضافته
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

                        <div className="space-y-2">
                            <Label htmlFor="email">البريد الإلكتروني للطالب</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="student@example.com"
                                required
                                dir="ltr"
                                className="text-right"
                            />
                        </div>

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
