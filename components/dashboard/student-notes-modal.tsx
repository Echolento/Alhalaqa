'use client'

import { useState } from 'react'
import { FileText, Loader2, Calendar } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FormattedDate } from '@/components/ui/formatted-date'
import { getStudentLastSessionNotes } from '@/lib/data-actions'

interface StudentNotesModalProps {
    studentId: string
    studentName: string
    trigger?: React.ReactNode
    children?: React.ReactNode
}

export function StudentNotesModal({ studentId, studentName, trigger, children }: StudentNotesModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [lastNotes, setLastNotes] = useState<any>(null)

    const handleOpen = async () => {
        setIsOpen(true)
        setLoading(true)
        setLastNotes(null)

        try {
            const result = await getStudentLastSessionNotes(studentId)
            if (result.data) {
                setLastNotes(result.data)
            }
        } catch (error) {
            console.error('Error fetching student notes:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {trigger ? (
                <div onClick={handleOpen} className="cursor-pointer">
                    {trigger}
                </div>
            ) : children ? (
                <div onClick={handleOpen} className="cursor-pointer">
                    {children}
                </div>
            ) : (
                <Button variant="outline" size="sm" onClick={handleOpen} className="gap-2">
                    <FileText className="w-4 h-4" />
                    الملاحظات
                </Button>
            )}

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            ملاحظات آخر حصة
                        </DialogTitle>
                        <DialogDescription>
                            سجل الطالب: {studentName}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50 mb-4" />
                                <p className="text-sm text-muted-foreground">جاري تحميل الملاحظات...</p>
                            </div>
                        ) : !lastNotes ? (
                            <div className="text-center py-8 bg-muted/30 rounded-lg">
                                <p className="text-muted-foreground">لا توجد ملاحظات سابقة لهذا الطالب.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-sm text-muted-foreground mb-4 bg-primary/5 p-3 rounded-lg flex items-center gap-2 border border-primary/10">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <span className="font-medium">تاريخ الحصة:</span>
                                    <FormattedDate date={lastNotes.session.scheduled_at} options={{ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }} />
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-primary mb-1">الجديد</h4>
                                        <p className="text-sm bg-muted/30 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                                            {lastNotes.notes.new_content}
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-primary mb-1">الماضي البعيد</h4>
                                        <p className="text-sm bg-muted/30 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                                            {lastNotes.notes.far_past_review}
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-primary mb-1">الماضي القريب</h4>
                                        <p className="text-sm bg-muted/30 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                                            {lastNotes.notes.recent_past_review}
                                        </p>
                                    </div>
                                    {lastNotes.notes.general_notes && (
                                        <div>
                                            <h4 className="text-sm font-bold text-primary mb-1">ملاحظات عامة</h4>
                                            <p className="text-sm bg-muted/30 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                                                {lastNotes.notes.general_notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
                            إغلاق
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
