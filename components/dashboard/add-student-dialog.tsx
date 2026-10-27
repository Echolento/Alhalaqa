'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Contact } from 'lucide-react'
import { addStudent, addMultipleStudents } from '@/lib/student-actions'
import { useToast } from '@/hooks/use-toast'
import { PhoneInput } from '@/components/auth/phone-input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  isContactPickerAvailable,
  pickContacts,
  findDuplicates,
  ContactPickerError,
} from '@/lib/contacts'
import { useRouter } from 'next/navigation'
import { REMIND_COPY } from '@/lib/remind-copy'
import type { StudentView } from '@/lib/types'

const CONTACTS_COPY = {
  // The API exists but the host refuses to open the native picker — in-app
  // browsers (WhatsApp / Instagram links) and Android WebViews do this.
  blocked:
    'متصفح التطبيق لا يسمح بفتح جهات الاتصال. افتح الحلقة في Chrome وأعد المحاولة، أو أضف الطالب يدويًا من النموذج.',
  failed: 'تعذر الوصول إلى جهات الاتصال',
  chrome: 'افتح في Chrome',
} as const

/**
 * Android intent URL that hands the current page to Chrome. A link opened from
 * WhatsApp opens inside the app's own browser, where the contact picker is
 * unavailable — this is the only way out of that dead end.
 */
function androidChromeUrl(): string | null {
  if (typeof window === 'undefined') return null
  if (!/Android/i.test(navigator.userAgent)) return null
  const { host, pathname, search, hash } = window.location
  return `intent://${host}${pathname}${search}${hash}#Intent;scheme=https;package=com.android.chrome;end`
}

interface AddStudentDialogProps {
  students: StudentView[]
}

export function AddStudentDialog({ students }: AddStudentDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [phoneValue, setPhoneValue] = useState('')
  const [importMode, setImportMode] = useState(false)
  const [importItems, setImportItems] = useState<{
    id: string
    name: string
    phone: string
    checked: boolean
    isDuplicate: boolean
    nameMissing: boolean
  }[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [pickerBlocked, setPickerBlocked] = useState(false)
  const contactPickerAvailable = typeof navigator !== 'undefined' && isContactPickerAvailable()
  const chromeUrl = pickerBlocked ? androidChromeUrl() : null
  const { toast } = useToast()
  const router = useRouter()

  const handleDialogOpen = (o: boolean) => {
    setOpen(o)
    if (o) {
      setPhoneValue('')
      setImportMode(false)
      setImportItems([])
      setPickerBlocked(false)
    }
  }

  const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const form = e.currentTarget
    const formData = new FormData(form)
    const name = formData.get('name') as string
    const phone = phoneValue ? `+20${phoneValue}` : undefined
    // Billing (price/frequency/first-bill date) is NOT collected here — the
    // server applies the teacher defaults; edits live in the student profile.
    const result = await addStudent(name, { phone })
    if (result.success) {
      toast({ title: 'تمت الإضافة', description: `تم إضافة ${name}` })
      setOpen(false)
      setPhoneValue('')
      router.refresh()
    } else {
      toast({ variant: 'destructive', title: 'خطأ', description: result.error })
    }
    setLoading(false)
  }

  const handlePickContacts = async () => {
    try {
      const contacts = await pickContacts()
      if (!contacts.length) return
      setPickerBlocked(false)
      const duplicates = findDuplicates(
        contacts,
        students.map((s) => ({ name: s.name ?? null, phone: s.phone ?? null })),
      )
      const items = contacts.map((c, i) => ({
        id: `import-${Date.now()}-${i}`,
        name: c.name,
        phone: c.phone,
        checked: true,
        isDuplicate: duplicates[i],
        nameMissing: !c.name,
      }))
      setImportItems(items)
      setImportMode(true)
    } catch (err) {
      // Never swallow the reason: the toast can only be as specific as the
      // error we keep, and the console is the only trace a teacher's device
      // leaves. A blocked picker is a host limitation, not a bug in the data.
      console.warn('[contacts] picker failed', err)
      const blocked = err instanceof ContactPickerError && err.reason === 'blocked'
      setPickerBlocked(blocked)
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: blocked ? CONTACTS_COPY.blocked : CONTACTS_COPY.failed,
      })
    }
  }

  const handleImportSubmit = async () => {
    const selected = importItems.filter((i) => i.checked && !i.nameMissing)
    if (!selected.length) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم اختيار أي طالب صالح' })
      return
    }
    setImportLoading(true)
    const result = await addMultipleStudents(
      selected.map((i) => ({ name: i.name, phone: i.phone || undefined }))
    )
    if (result.success) {
      toast({ title: 'تمت الإضافة', description: `تم إضافة ${selected.length} طالب` })
      setOpen(false)
      setImportMode(false)
      setImportItems([])
      router.refresh()
    } else {
      toast({ variant: 'destructive', title: 'خطأ', description: result.error })
    }
    setImportLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 min-h-[44px]">
          <Plus className="w-4 h-4" />
          إضافة طالب
        </Button>
      </DialogTrigger>
      <DialogContent className={importMode ? 'max-w-lg' : ''} onOpenAutoFocus={(e) => e.preventDefault()}>
        {importMode ? (
          <>
            <DialogHeader>
              <DialogTitle>استيراد من جهات الاتصال</DialogTitle>
              <DialogDescription>
                تم اختيار {importItems.length} جهة اتصال. راجع وأزل ما لا ترغب فيه.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-72">
              <div className="space-y-2">
                {importItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() =>
                        setImportItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)))
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <Input
                        value={item.name}
                        onChange={(e) =>
                          setImportItems((prev) =>
                            prev.map((i) => (i.id === item.id ? { ...i, name: e.target.value, nameMissing: !e.target.value.trim() } : i))
                          )
                        }
                        placeholder="الاسم مطلوب"
                        className={`h-8 text-sm ${item.nameMissing ? 'border-destructive' : ''}`}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono truncate" dir="ltr">
                          {item.phone || '—'}
                        </span>
                        {item.isDuplicate && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            موجود
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportMode(false)}>
                رجوع
              </Button>
              <Button onClick={handleImportSubmit} disabled={importLoading}>
                {importLoading
                  ? 'جاري...'
                  : `إضافة المحدد (${importItems.filter((i) => i.checked && !i.nameMissing).length})`}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>إضافة طالب جديد</DialogTitle>
              <DialogDescription>{REMIND_COPY.addStudentDescription}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم <span className="text-destructive">*</span></Label>
                <Input id="name" name="name" required placeholder="أدخل اسم الطالب" />
              </div>
              <div className="space-y-1.5">
                <PhoneInput
                  id="phone"
                  name="phone"
                  value={phoneValue}
                  onChange={setPhoneValue}
                  required={false}
                  label={REMIND_COPY.payerPhoneLabel}
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {REMIND_COPY.payerPhoneHelper}
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={loading}>{loading ? 'جاري...' : 'إضافة'}</Button>
              </DialogFooter>
            </form>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">أو</span>
              </div>
            </div>
            {contactPickerAvailable && (
              <>
                <Button type="button" variant="secondary" className="w-full gap-2 min-h-[44px]" onClick={handlePickContacts}>
                  <Contact className="w-4 h-4" />
                  إضافة من جهات الاتصال
                </Button>
                <p className="text-center text-xs text-muted-foreground -mt-1">يمكن اختيار أكثر من طالب</p>
                {pickerBlocked && (
                  <div className="rounded-lg border border-dashed p-3 text-xs leading-relaxed text-muted-foreground space-y-2">
                    <p>{CONTACTS_COPY.blocked}</p>
                    {chromeUrl && (
                      <a
                        href={chromeUrl}
                        className="inline-block font-medium text-primary underline underline-offset-2"
                      >
                        {CONTACTS_COPY.chrome}
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
