-- Quran Teaching Management System Database Schema

-- Organizations table (for multi-tenant support)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null check (role in ('admin', 'teacher', 'student')),
  organization_id uuid references public.organizations(id) on delete set null,
  phone text,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Teachers table (additional teacher info)
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  specialization text,
  google_meet_link text,
  bio text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(profile_id)
);

-- Students table (additional student info)
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  current_surah text,
  current_ayah integer,
  enrollment_date date default current_date,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(profile_id)
);

-- Sessions table (teaching sessions)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  scheduled_at timestamp with time zone not null,
  duration_minutes integer default 60,
  status text default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'missed')),
  google_meet_link text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Session notes table (الجديد, الماضي البعيد, الماضي القريب, ملاحظات, تقييم)
create table if not exists public.session_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  new_content text, -- الجديد
  far_past_review text, -- الماضي البعيد
  recent_past_review text, -- الماضي القريب
  general_notes text, -- ملاحظات
  rating integer check (rating >= 1 and rating <= 5), -- تقييم
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(session_id)
);

-- Enable Row Level Security
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.sessions enable row level security;
alter table public.session_notes enable row level security;

-- RLS Policies for organizations
create policy "Organizations are viewable by organization members" on public.organizations
  for select using (
    id in (select organization_id from public.profiles where id = auth.uid())
  );

create policy "Admins can manage organizations" on public.organizations
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- RLS Policies for profiles
create policy "Profiles are viewable by same organization members" on public.profiles
  for select using (
    organization_id in (select organization_id from public.profiles where id = auth.uid())
    or id = auth.uid()
  );

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Admins can manage profiles" on public.profiles
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- RLS Policies for teachers
create policy "Teachers viewable by organization members" on public.teachers
  for select using (
    organization_id in (select organization_id from public.profiles where id = auth.uid())
  );

create policy "Teachers can update own record" on public.teachers
  for update using (profile_id = auth.uid());

create policy "Admins can manage teachers" on public.teachers
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- RLS Policies for students
create policy "Students viewable by their teacher or admin" on public.students
  for select using (
    profile_id = auth.uid()
    or teacher_id in (select id from public.teachers where profile_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Students can update own record" on public.students
  for update using (profile_id = auth.uid());

create policy "Admins can manage students" on public.students
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- RLS Policies for sessions
create policy "Sessions viewable by participants or admin" on public.sessions
  for select using (
    teacher_id in (select id from public.teachers where profile_id = auth.uid())
    or student_id in (select id from public.students where profile_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Teachers can manage their sessions" on public.sessions
  for all using (
    teacher_id in (select id from public.teachers where profile_id = auth.uid())
  );

create policy "Admins can manage all sessions" on public.sessions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- RLS Policies for session_notes
create policy "Session notes viewable by session participants or admin" on public.session_notes
  for select using (
    session_id in (
      select s.id from public.sessions s
      where s.teacher_id in (select id from public.teachers where profile_id = auth.uid())
      or s.student_id in (select id from public.students where profile_id = auth.uid())
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Teachers can manage session notes" on public.session_notes
  for all using (
    session_id in (
      select s.id from public.sessions s
      where s.teacher_id in (select id from public.teachers where profile_id = auth.uid())
    )
  );

-- Create indexes for better performance
create index if not exists idx_profiles_organization on public.profiles(organization_id);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_teachers_organization on public.teachers(organization_id);
create index if not exists idx_students_teacher on public.students(teacher_id);
create index if not exists idx_students_organization on public.students(organization_id);
create index if not exists idx_sessions_teacher on public.sessions(teacher_id);
create index if not exists idx_sessions_student on public.sessions(student_id);
create index if not exists idx_sessions_scheduled on public.sessions(scheduled_at);
create index if not exists idx_session_notes_session on public.session_notes(session_id);
