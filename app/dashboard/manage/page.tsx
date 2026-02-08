import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UnderConstruction } from "@/components/ui/under-construction";

export default async function ManagePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <UnderConstruction
      title="إدارة التعيينات"
      description="صفحة إدارة الطلاب والمعلمين قيد التطوير"
    />
  );
}
