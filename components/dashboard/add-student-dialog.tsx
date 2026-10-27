'use client'

import { useEffect, useState } from 'react'
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
  // The API exists but the host refuses to open the native picker. That host
  // can never succeed: the picker IS Chrome's Android UI. Samsung Internet
  // (default on Samsung phones) is the common case — it exposes
  // `navigator.contacts` and then throws, and removes the API entirely in 22+.
  blocked:
    'هذا المتصفح لا يستطيع فتح جهات الاتصال. ثبّت «الحلقة» من Chrome مرة واحدة، وبعدها يعمل الزر من أيقونة التطبيق.',
  noPicker:
    'استيراد جهات الاتصال يعمل داخل تطبيق «الحلقة» المثبّت من Chrome.',
  failed: 'تعذر الوصول إلى جهات الاتصال',
  install: 'ثبّت الحلقة من Chrome',
} as const

function isAndroidHost(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

/**
 * Hands the /install page to the Chrome app. A link to the same origin would
 * stay inside the current container (that is the whole problem), so the intent
 * URL is the only thing that actually crosses over. Returns null where there is
 * no Chrome app to hand off to.
 */
function installInChromeUrl(): string | null {
  if (typeof window === 'undefined') return null
  if (!isAndroidHost()) return null
  const { host } = window.location
  return `intent://${host}/install#Intent;scheme=https;package=com.android.chrome;end`
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
  // Computed after mount: the server render has no navigator, and branching on
  // it during render would make the markup disagree with the client.
  const [noPickerHost, setNoPickerHost] = useState(false)
  const contactPickerAvailable = typeof navigator !== 'undefined' && isContactPickerAvailable()
  const chromeInstallUrl = pickerBlocked || noPickerHost ? installInChromeUrl() : null
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    // Android without the API (Samsung Internet 22+, in-app browsers) would
    // otherwise render no import affordance at all, with no explanation.
    setNoPickerHost(isAndroidHost() && !isContactPickerAvailable())
  }, [])

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
                    {chromeInstallUrl && (
                      <a
                        href={chromeInstallUrl}
                        className="inline-block font-medium text-primary underline underline-offset-2"
                      >
                        {CONTACTS_COPY.install}
                      </a>
                    )}
                  </div>
                )}
              </>
            )}

            {noPickerHost && !contactPickerAvailable && (
              <div className="rounded-lg border border-dashed p-3 text-xs leading-relaxed text-muted-foreground space-y-2">
                <p>{CONTACTS_COPY.noPicker}</p>
                {chromeInstallUrl && (
                  <a
                    href={chromeInstallUrl}
                    className="inline-block font-medium text-primary underline underline-offset-2"
                  >
                    {CONTACTS_COPY.install}
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
