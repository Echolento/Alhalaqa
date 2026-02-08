-- Auto-create profile on signup trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, organization_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'مستخدم جديد'),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    (new.raw_user_meta_data ->> 'organization_id')::uuid
  )
  on conflict (id) do nothing;

  -- If user is a teacher, create teacher record
  if coalesce(new.raw_user_meta_data ->> 'role', 'student') = 'teacher' then
    insert into public.teachers (profile_id, organization_id)
    values (
      new.id,
      (new.raw_user_meta_data ->> 'organization_id')::uuid
    )
    on conflict (profile_id) do nothing;
  end if;

  -- If user is a student, create student record
  if coalesce(new.raw_user_meta_data ->> 'role', 'student') = 'student' then
    insert into public.students (profile_id, organization_id)
    values (
      new.id,
      (new.raw_user_meta_data ->> 'organization_id')::uuid
    )
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
