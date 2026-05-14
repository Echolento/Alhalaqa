"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Calendar,
  Clock,
  User,
  Video,
  Save,
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Session, SessionNote } from "@/lib/types";
import { updateSessionNotes, completeSession } from "@/lib/data-actions";

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [notes, setNotes] = useState<SessionNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newContent, setNewContent] = useState("");
  const [recentReview, setRecentReview] = useState("");
  const [distantReview, setDistantReview] = useState("");
  const [observations, setObservations] = useState("");
  const [nextTask, setNextTask] = useState("");
  const [ratingNew, setRatingNew] = useState<string>("5");
  const [ratingFarPast, setRatingFarPast] = useState<string>("5");
  const [ratingRecentPast, setRatingRecentPast] = useState<string>("5");

  useEffect(() => {
    async function fetchSession() {
      const supabase = createClient();
      const { data: sessionData } = await supabase
        .from("sessions")
        .select(
          `
          *,
          student:students(
            id,
            profile:profiles(full_name)
          ),
          teacher:teachers(
            id,
            profile:profiles(full_name)
          )
        `
        )
        .eq("id", params.id)
        .single();

      if (sessionData) {
        setSession(sessionData as Session);

        const { data: notesData } = await supabase
          .from("session_notes")
          .select("*")
          .eq("session_id", params.id)
          .single();

        if (notesData) {
          setNotes(notesData);
          setNewContent(notesData.new_content || "");
          setRecentReview(notesData.recent_past_review || "");
          setDistantReview(notesData.far_past_review || "");
          setObservations(notesData.general_notes || "");
          setNextTask(notesData.next_task || "");
          setRatingNew(notesData.rating_new?.toString() || "5");
          setRatingFarPast(notesData.rating_far_past?.toString() || "5");
          setRatingRecentPast(notesData.rating_recent_past?.toString() || "5");
        }
      }
      setLoading(false);
    }

    fetchSession();
  }, [params.id]);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateSessionNotes(params.id as string, {
      new_content: newContent,
      recent_past_review: recentReview,
      far_past_review: distantReview,
      general_notes: observations,
      next_task: nextTask,
      rating_new: parseInt(ratingNew),
      rating_far_past: parseInt(ratingFarPast),
      rating_recent_past: parseInt(ratingRecentPast),
    });

    if (result.success) {
      // Refresh local state if needed
    }
    setSaving(false);
  };

  const handleComplete = async () => {
    await handleSave();
    await completeSession(params.id as string);
    router.push("/dashboard/sessions");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">الجلسة غير موجودة</p>
      </div>
    );
  }

  const statusColors = {
    scheduled: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const statusLabels = {
    scheduled: "مجدولة",
    completed: "مكتملة",
    cancelled: "ملغاة",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">تفاصيل الجلسة</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              معلومات الجلسة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">الطالب</p>
                <p className="font-medium">
                  {(session.student as any)?.profile?.full_name || "غير محدد"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">التاريخ</p>
                <p className="font-medium">
                  {new Date(session.scheduled_at).toLocaleDateString("ar-SA", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">الوقت</p>
                <p className="font-medium">
                  {new Date(session.scheduled_at).toLocaleTimeString("ar-SA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" - "}
                  {session.duration_minutes} دقيقة
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">الحالة</p>
              <Badge className={statusColors[session.status]}>
                {statusLabels[session.status]}
              </Badge>
            </div>

            {session.google_meet_link && (
              <Button
                className="w-full bg-transparent"
                variant="outline"
                onClick={() => window.open(session.google_meet_link!, "_blank")}
              >
                <Video className="h-4 w-4 ml-2" />
                انضمام للمكالمة
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ملاحظات الجلسة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new_content">الجديد</Label>
                <Textarea
                  id="new_content"
                  placeholder="ما تم حفظه اليوم..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recent_review">الماضي القريب</Label>
                <Textarea
                  id="recent_review"
                  placeholder="مراجعة الحفظ القريب..."
                  value={recentReview}
                  onChange={(e) => setRecentReview(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="distant_review">الماضي البعيد</Label>
                <Textarea
                  id="distant_review"
                  placeholder="مراجعة الحفظ البعيد..."
                  value={distantReview}
                  onChange={(e) => setDistantReview(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">ملاحظات</Label>
                <Textarea
                  id="observations"
                  placeholder="ملاحظات عامة على الطالب..."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={3}
                />
              </div>

            </div>

            <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="rating_new">تقييم الجديد</Label>
                <Select
                  value={ratingNew}
                  onValueChange={setRatingNew}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التقييم" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((r) => (
                      <SelectItem key={r} value={r.toString()}>
                        {r === 5 ? "ممتاز" : r === 4 ? "جيد جداً" : r === 3 ? "جيد" : r === 2 ? "مقبول" : "ضعيف"} ({r})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rating_recent">تقييم المراجعة القريبة</Label>
                <Select
                  value={ratingRecentPast}
                  onValueChange={setRatingRecentPast}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التقييم" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((r) => (
                      <SelectItem key={r} value={r.toString()}>
                        {r === 5 ? "ممتاز" : r === 4 ? "جيد جداً" : r === 3 ? "جيد" : r === 2 ? "مقبول" : "ضعيف"} ({r})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rating_far">تقييم المراجعة البعيدة</Label>
                <Select
                  value={ratingFarPast}
                  onValueChange={setRatingFarPast}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التقييم" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((r) => (
                      <SelectItem key={r} value={r.toString()}>
                        {r === 5 ? "ممتاز" : r === 4 ? "جيد جداً" : r === 3 ? "جيد" : r === 2 ? "مقبول" : "ضعيف"} ({r})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleSave} disabled={saving} variant="outline">
                  <Save className="h-4 w-4 ml-2" />
                  {saving ? "جاري الحفظ..." : "حفظ الملاحظات"}
                </Button>
                {session.status !== "completed" && (
                  <Button onClick={handleComplete} disabled={saving}>
                    إنهاء الجلسة
                  </Button>
                )}
              </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
