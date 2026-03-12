'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UserPlus, Check, X, Bell } from 'lucide-react'
import { acceptInvitation, rejectInvitation } from '@/lib/invitation-actions'

interface Invitation {
    id: string
    teacher_id?: string
    teacher?: {
        id?: string
        profile?: { full_name?: string | null }
    } | null
    created_at: string
}

interface PendingInvitationsProps {
    invitations: Invitation[]
}

export function PendingInvitations({ invitations }: PendingInvitationsProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState<string | null>(null)
    const [teacherNames, setTeacherNames] = useState<Record<string, string>>({})

    // Show pop-up if there are invitations
    useEffect(() => {
        if (invitations.length > 0) {
            setOpen(true)
        }
    }, [invitations])

    // Fetch missing teacher names via API to avoid RLS join issues
    useEffect(() => {
        const controller = new AbortController()
        async function fetchNames() {
            const tasks = invitations
                .filter(inv => !inv.teacher?.profile?.full_name && inv.teacher_id)
                .map(async (inv) => {
                    const id = inv.teacher_id as string
                    try {
                        const res = await fetch(`/api/teachers/${id}/display`, { signal: controller.signal })
                        if (!res.ok) return
                        const data = await res.json()
                        if (data?.full_name) {
                            setTeacherNames(prev => ({ ...prev, [id]: data.full_name }))
                        }
                    } catch (_) {
                        // ignore
                    }
                })
            await Promise.allSettled(tasks)
        }
        if (invitations.length > 0) fetchNames()
        return () => controller.abort()
    }, [invitations])

    if (invitations.length === 0) return null

    async function handleAccept(id: string) {
        setLoading(id)
        const result = await acceptInvitation(id)
        if (result.success) {
            // If it was the last invitation, close the dialog
            if (invitations.length <= 1) {
                setOpen(false)
            }
        }
        setLoading(null)
    }

    async function handleReject(id: string) {
        setLoading(id)
        const result = await rejectInvitation(id)
        if (result.success) {
            if (invitations.length <= 1) {
                setOpen(false)
            }
        }
        setLoading(null)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shrink-0">
                <div className="bg-gradient-to-br from-primary/20 via-background to-background p-6 pt-10 relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Bell className="w-32 h-32" />
                    </div>

                    <DialogHeader className="text-right relative">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <UserPlus className="w-6 h-6 text-primary" />
                        </div>
                        <DialogTitle className="text-2xl font-bold">لديك دعوة!</DialogTitle>
                        <DialogDescription className="text-base text-muted-foreground mt-2">
                            لقد تلقيت {invitations.length} دعوة للانضمام إلى قائمة طلاب المعلم
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-8 space-y-4 relative">
                        {invitations.map((invitation) => (
                            <div
                                key={invitation.id}
                                className="flex flex-col p-4 bg-muted/40 backdrop-blur-sm rounded-2xl border border-primary/10 transition-all hover:bg-muted/60"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white text-lg font-bold">
                                        {(
                                            (invitation.teacher?.profile?.full_name
                                                || (invitation.teacher_id ? teacherNames[invitation.teacher_id] : '')
                                                || '') as string
                                        )?.charAt(0) || '؟'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">
                                            {invitation.teacher?.profile?.full_name
                                                || (invitation.teacher_id ? teacherNames[invitation.teacher_id] : '')
                                                || 'معلم'}
                                        </p>
                                        <p className="text-sm text-muted-foreground italic">يدعوك للانضمام كطالب في حلقته</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        className="flex-1 h-11 rounded-xl shadow-lg shadow-primary/20 gap-2"
                                        onClick={() => handleAccept(invitation.id)}
                                        disabled={loading === invitation.id}
                                    >
                                        <Check className="w-4 h-4" />
                                        قبول الدعوة
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="rounded-xl h-11 border-muted-foreground/20 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30 gap-2"
                                        onClick={() => handleReject(invitation.id)}
                                        disabled={loading === invitation.id}
                                    >
                                        <X className="w-4 h-4" />
                                        رفض
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 text-center italic text-xs text-muted-foreground">
                        يمكنك دائماً تغيير المعلم لاحقاً من قسم الإعدادات
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
