'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { GraduationCap, Search, Video, Building } from 'lucide-react'

interface Teacher {
  id: string
  google_meet_link: string | null
  bio: string | null
  profile: { full_name: string | null }
  organization?: { name: string } | null
}

interface TeachersTableProps {
  teachers: Teacher[]
}

export function TeachersTable({ teachers }: TeachersTableProps) {
  const [search, setSearch] = useState('')

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) || !search
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          قائمة المعلمين ({filteredTeachers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="البحث عن معلم..."
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
                <TableHead className="text-right">المعلم</TableHead>
                <TableHead className="text-right">المؤسسة</TableHead>
                <TableHead className="text-right">رابط Meet</TableHead>
                <TableHead className="text-right">النبذة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    لا يوجد معلمون
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-chart-2/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-chart-2">
                            {teacher.profile?.full_name?.charAt(0) || '؟'}
                          </span>
                        </div>
                        <span className="font-medium">
                          {teacher.profile?.full_name || 'معلم'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {teacher.organization ? (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Building className="w-3 h-3" />
                          {teacher.organization.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {teacher.google_meet_link ? (
                        <Button asChild size="sm" variant="ghost">
                          <a href={teacher.google_meet_link} target="_blank" rel="noopener noreferrer">
                            <Video className="w-4 h-4 ml-1" />
                            فتح
                          </a>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground line-clamp-1">
                        {teacher.bio || '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
