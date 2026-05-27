'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Building, Plus, Search, MoreHorizontal } from 'lucide-react'
import { FormattedDate } from '@/components/ui/formatted-date'
import { createOrganization } from '@/lib/data-actions'

interface Organization {
  id: string
  name: string
  slug: string
  created_at: string
}

interface OrganizationsTableProps {
  organizations: Organization[]
}

export function OrganizationsTable({ organizations }: OrganizationsTableProps) {
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(search.toLowerCase()) || !search
  )

  const handleCreate = async (formData: FormData) => {
    setLoading(true)

    const name = formData.get('name') as string
    const slug = formData.get('slug') as string

    await createOrganization({ name, slug })

    setLoading(false)
    setIsCreateOpen(false)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5" />
          قائمة المؤسسات ({filteredOrganizations.length})
        </CardTitle>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة مؤسسة
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="البحث عن مؤسسة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Table */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اسم المؤسسة</TableHead>
                <TableHead className="text-right">الرمز</TableHead>
                <TableHead className="text-right">تاريخ الإنشاء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    لا توجد مؤسسات
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrganizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium">{org.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{org.slug}</code>
                    </TableCell>
                    <TableCell className="text-right">
                      <FormattedDate date={org.created_at} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>إضافة مؤسسة جديدة</DialogTitle>
            <DialogDescription>
              أدخل بيانات المؤسسة الجديدة
            </DialogDescription>
          </DialogHeader>

          <form action={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم المؤسسة</Label>
              <Input
                id="name"
                name="name"
                placeholder="مثال: حلقة مسجد الرحمة"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">الرمز (باللغة الإنجليزية)</Label>
              <Input
                id="slug"
                name="slug"
                placeholder="مثال: masjid-rahma"
                required
                dir="ltr"
                pattern="[a-z0-9-]+"
              />
              <p className="text-xs text-muted-foreground">
                يُستخدم في الروابط - أحرف صغيرة وأرقام وشرطات فقط
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'جاري الإضافة...' : 'إضافة المؤسسة'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
