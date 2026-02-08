"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createOrganization(name: string, description?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "غير مصرح" };
  }

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name,
      description,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/organizations", "max");
  return { success: true, data };
}

export async function updateOrganization(
  id: string,
  updates: { name?: string; description?: string }
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/organizations", "max");
  return { success: true, data };
}

export async function deleteOrganization(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("organizations").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/organizations", "max");
  return { success: true };
}

export async function assignStudentToTeacher(
  studentId: string,
  teacherId: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("students")
    .update({ teacher_id: teacherId })
    .eq("id", studentId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/students", "max");
  revalidatePath("/dashboard/teachers", "max");
  return { success: true, data };
}

export async function removeStudentFromTeacher(studentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("students")
    .update({ teacher_id: null })
    .eq("id", studentId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/students", "max");
  revalidatePath("/dashboard/teachers", "max");
  return { success: true, data };
}

export async function updateTeacherOrganization(
  teacherId: string,
  organizationId: string | null
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teachers")
    .update({ organization_id: organizationId })
    .eq("id", teacherId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/teachers", "max");
  return { success: true, data };
}

export async function getAllTeachers() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("teachers").select(`
      *,
      profile:profiles(full_name, email),
      organization:organizations(name),
      students:students(count)
    `);

  if (error) {
    return { error: error.message };
  }

  return { success: true, data };
}

export async function getAllStudents() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("students").select(`
      *,
      profile:profiles(full_name, email),
      teacher:teachers(
        id,
        profile:profiles(full_name)
      )
    `);

  if (error) {
    return { error: error.message };
  }

  return { success: true, data };
}

export async function getAllOrganizations() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("organizations").select(`
      *,
      teachers:teachers(count)
    `);

  if (error) {
    return { error: error.message };
  }

  return { success: true, data };
}

export async function getAdminStats() {
  const supabase = await createClient();

  const [orgsResult, teachersResult, studentsResult, sessionsResult] =
    await Promise.all([
      supabase.from("organizations").select("id", { count: "exact" }),
      supabase.from("teachers").select("id", { count: "exact" }),
      supabase.from("students").select("id", { count: "exact" }),
      supabase.from("sessions").select("id", { count: "exact" }),
    ]);

  return {
    organizations: orgsResult.count || 0,
    teachers: teachersResult.count || 0,
    students: studentsResult.count || 0,
    sessions: sessionsResult.count || 0,
  };
}
