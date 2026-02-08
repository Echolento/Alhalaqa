"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserMinus, UserPlus, Users } from "lucide-react";
import {
  getAllStudents,
  getAllTeachers,
  assignStudentToTeacher,
  removeStudentFromTeacher,
} from "@/lib/admin-actions";

interface Student {
  id: string;
  user_id: string;
  teacher_id: string | null;
  profile: {
    full_name: string;
    email: string;
  };
  teacher?: {
    id: string;
    profile: {
      full_name: string;
    };
  };
}

interface Teacher {
  id: string;
  user_id: string;
  profile: {
    full_name: string;
    email: string;
  };
  students: { count: number }[];
}

export function ManageStudentsView() {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [teacherNames, setTeacherNames] = useState<Record<string, string>>({});
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [studentsResult, teachersResult] = await Promise.all([
      getAllStudents(),
      getAllTeachers(),
    ]);

    if (studentsResult.data) {
      const list = studentsResult.data as Student[]
      setStudents(list);
      // Prefetch missing student names
      const missingStudents = list.filter(s => !s.profile?.full_name)
      if (missingStudents.length) {
        Promise.allSettled(missingStudents.map(async (s) => {
          try {
            const res = await fetch(`/api/students/${s.id}/display`)
            if (!res.ok) return
            const data = await res.json()
            if (data?.full_name) setStudentNames(prev => ({ ...prev, [s.id]: data.full_name }))
          } catch {}
        }))
      }
    }
    if (teachersResult.data) {
      const list = teachersResult.data as Teacher[]
      setTeachers(list);
      // Prefetch missing teacher names
      const missingTeachers = list.filter(t => !t.profile?.full_name)
      if (missingTeachers.length) {
        Promise.allSettled(missingTeachers.map(async (t) => {
          try {
            const res = await fetch(`/api/teachers/${t.id}/display`)
            if (!res.ok) return
            const data = await res.json()
            if (data?.full_name) setTeacherNames(prev => ({ ...prev, [t.id]: data.full_name }))
          } catch {}
        }))
      }
    }
    setLoading(false);
  }

  async function handleAssign(studentId: string, teacherId: string) {
    await assignStudentToTeacher(studentId, teacherId);
    loadData();
  }

  async function handleRemove(studentId: string) {
    await removeStudentFromTeacher(studentId);
    loadData();
  }

  const filteredStudents = selectedTeacher
    ? selectedTeacher === "unassigned"
      ? students.filter((s) => !s.teacher_id)
      : students.filter((s) => s.teacher_id === selectedTeacher)
    : students;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              المعلمون
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant={selectedTeacher === "" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTeacher("")}
            >
              جميع الطلاب
              <Badge variant="secondary" className="mr-auto">
                {students.length}
              </Badge>
            </Button>
            <Button
              variant={selectedTeacher === "unassigned" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTeacher("unassigned")}
            >
              غير معينين
              <Badge variant="secondary" className="mr-auto">
                {students.filter((s) => !s.teacher_id).length}
              </Badge>
            </Button>
            <div className="border-t my-2" />
            {teachers.map((teacher) => (
            <Button
            key={teacher.id}
            variant={selectedTeacher === teacher.id ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setSelectedTeacher(teacher.id)}
            >
            {teacher.profile?.full_name || teacherNames[teacher.id] || "معلم"}
            <Badge variant="secondary" className="mr-auto">
            {students.filter((s) => s.teacher_id === teacher.id).length}
            </Badge>
            </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>
            {selectedTeacher === ""
              ? "جميع الطلاب"
              : selectedTeacher === "unassigned"
                ? "طلاب غير معينين"
                : `طلاب ${teachers.find((t) => t.id === selectedTeacher)?.profile?.full_name || ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا يوجد طلاب
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>المعلم الحالي</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.profile?.full_name || studentNames[student.id] || "طالب"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.profile?.email}
                    </TableCell>
                    <TableCell>
                      {student.teacher ? (
                        <Badge variant="secondary">
                          {student.teacher.profile?.full_name || (student.teacher.id ? teacherNames[student.teacher.id] : '') || 'معلم'}
                        </Badge>
                      ) : (
                        <Badge variant="outline">غير معين</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          onValueChange={(value) =>
                            handleAssign(student.id, value)
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="تعيين لمعلم" />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers.map((teacher) => (
                              <SelectItem key={teacher.id} value={teacher.id}>
                                {teacher.profile?.full_name || teacherNames[teacher.id] || "معلم"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {student.teacher_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemove(student.id)}
                            title="إزالة من المعلم"
                          >
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
