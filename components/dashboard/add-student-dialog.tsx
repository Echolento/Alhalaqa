'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Plus, Contact, ListPlus } from 'lucide-react'
import { addStudent, addMultipleStudents } from '@/lib/student-actions'
import { useToast } from '@/components/ui/use-toast'
import { PhoneInput } from '@/components/auth/phone-input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { isContactPickerAvailable, pickContacts, findDuplicates } from '@/lib/contacts'
import { useRouter } from 'next/navigation'

interface AddStudentDialogProps {
  students: { name?: string | null; full_name?: string | null; phone?: string | null }[]
}

export function parseBulkStudents(text: string): { name: string; phone?: string }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(',')
      const phone = rest.join(',').trim()
      return phone ? { name: name.trim(), phone } : { name: name.trim() }
    })
    .filter((s) => s.name.length > 0)
}

export function AddStudentDialog({ students }: AddStudentDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [phoneValue, setPhoneValue] = useState('')
  const [importMode, setImportMode] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [importItems, setImportItems] = useState<{
    id: string
    name: string
    phone: string
    checked: boolean
    isDuplicate: boolean
    nameMissing: boolean
  }[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const contactPickerAvailable = typeof navigator !== 'undefined' && isContactPickerAvailable()
  const { toast } = useToast()
  const router = useRouter()

  const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const form = e.currentTarget
    const formData = new FormData(form)
    const name = formData.get('name') as string
    const phone = phoneValue ? `+20${phoneValue}` : undefined
    const result = await addStudent(name, phone)
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
      const duplicates = findDuplicates(contacts, students as any)
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
    } catch {
      toast({ variant: 'destructive', title: 'خطأ', description: 'تعذر الوصول إلى جهات الاتصال' })
    }
  }

  const handleImportSubmit = async () => {    const selected = importItems.filter((i) => i.checked && !i.nameMissing)
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

  const bulkStudents = parseBulkStudents(bulkText)

  const handleBulkSubmit = async () => {
    if (!bulkStudents.length) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'اكتب اسم طالب واحد على الأقل' })
      return
    }
    setImportLoading(true)
    const result = await addMultipleStudents(bulkStudents)
    if (result.success) {
      toast({ title: 'تمت الإضافة', description: `تم إضافة ${bulkStudents.length} طالب` })
      setOpen(false)
      setBulkMode(false)
      setBulkText('')
      router.refresh()
    } else {
      toast({ variant: 'destructive', title: 'خطأ', description: result.error })
    }
    setImportLoading(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) { setPhoneValue(''); setImportMode(false); setImportItems([]); setBulkMode(false); setBulkText('') }
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2 min-h-[44px]">
          <Plus className="w-4 h-4" />
          إضافة طالب
        </Button>
      </DialogTrigger>
      <DialogContent className={importMode || bulkMode ? 'max-w-lg' : ''} onOpenAutoFocus={(e) => e.preventDefault()}>
        {bulkMode ? (
          <>
            <DialogHeader>
              <DialogTitle>إضافة مجموعة</DialogTitle>
              <DialogDescription>اسم كل طالب في سطر. للهاتف: الاسم، الرقم</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={'اسم كل طالب في سطر\nمثال:\nأحمد علي\nمحمد حسن, +201234567890'}
                className="min-h-[160px] text-sm"
                dir="auto"
              />
              {bulkStudents.length > 0 && (
                <p className="text-xs text-muted-foreground">سيتم إضافة {bulkStudents.length} طالب</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkMode(false)}>
                رجوع
              </Button>
              <Button onClick={handleBulkSubmit} disabled={importLoading || bulkStudents.length === 0} className="min-h-[44px]">
                {importLoading ? 'جاري...' : `إضافة المحدد (${bulkStudents.length})`}
              </Button>
            </DialogFooter>
          </>
        ) : importMode ? (
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
              <DialogDescription>أدخل اسم الطالب ورقم الهاتف (اختياري)</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم <span className="text-destructive">*</span></Label>
                <Input id="name" name="name" required placeholder="أدخل اسم الطالب" />
              </div>
              <PhoneInput
                id="phone"
                name="phone"
                value={phoneValue}
                onChange={setPhoneValue}
                required={false}
              />
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
            <Button type="button" variant="secondary" className="w-full gap-2 min-h-[44px]" onClick={() => setBulkMode(true)}>
              <ListPlus className="w-4 h-4" />
              إضافة مجموعة
            </Button>
            {contactPickerAvailable && (
              <>
                <Button type="button" variant="secondary" className="w-full gap-2" onClick={handlePickContacts}>
                  <Contact className="w-4 h-4" />
                  استيراد من جهات الاتصال
                </Button>
                <p className="text-center text-xs text-muted-foreground -mt-1">يمكن اختيار أكثر من طالب</p>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
