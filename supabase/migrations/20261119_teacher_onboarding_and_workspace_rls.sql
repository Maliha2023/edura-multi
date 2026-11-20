-- Phase 1 Teacher Experience: Coupon Onboarding, Modules, Assessments, & Class Announcements
-- Strict Pathway Isolation for 'bangla_version' and 'english_version' teachers
-- Additive migration: preserves all existing Admin & Student tables and RLS policies.

create or replace function public.current_teacher_profile()
returns table (
  user_id uuid,
  pathway text,
  academic_class smallint,
  academic_group text,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as user_id,
    p.pathway,
    p.academic_class,
    p.academic_group,
    p.status
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'teacher'
    and p.pathway in ('bangla_version', 'english_version')
  limit 1;
$$;

-- 1. Teacher-published syllabus modules & study resources (pathway-isolated)
create table if not exists public.teacher_modules (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  pathway text not null check (pathway in ('bangla_version', 'english_version')),
  academic_class smallint not null check (academic_class between 1 and 12),
  academic_group text check (academic_group in ('Science', 'Arts', 'Commerce') or academic_group is null),
  subject text not null,
  title text not null,
  resource_type text not null check (resource_type in ('Lecture Notes', 'Worksheet', 'Formula Sheet', 'Practice Guide')),
  summary text not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_modules_pathway_class
  on public.teacher_modules (pathway, academic_class, teacher_id);

alter table public.teacher_modules enable row level security;

drop policy if exists "Teachers manage own pathway modules" on public.teacher_modules;
create policy "Teachers manage own pathway modules"
on public.teacher_modules
for all
to authenticated
using (
  exists (
    select 1
    from public.current_teacher_profile() t
    where t.user_id = teacher_modules.teacher_id
      and t.pathway = teacher_modules.pathway
      and t.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.current_teacher_profile() t
    where t.user_id = teacher_modules.teacher_id
      and t.pathway = teacher_modules.pathway
      and t.status = 'active'
  )
);

-- 2. Teacher-recorded student marks & attendance (pathway-isolated)
create table if not exists public.teacher_student_assessments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  pathway text not null check (pathway in ('bangla_version', 'english_version')),
  subject text not null,
  marks smallint check (marks between 0 and 100),
  attendance_rate smallint check (attendance_rate between 0 and 100),
  attendance_status text not null default 'Present' check (attendance_status in ('Present', 'Late', 'Absent')),
  remarks text,
  updated_at timestamptz not null default now(),
  unique (teacher_id, student_id, subject)
);

alter table public.teacher_student_assessments enable row level security;

drop policy if exists "Teachers manage pathway student assessments" on public.teacher_student_assessments;
create policy "Teachers manage pathway student assessments"
on public.teacher_student_assessments
for all
to authenticated
using (
  exists (
    select 1
    from public.current_teacher_profile() t
    where t.user_id = teacher_student_assessments.teacher_id
      and t.pathway = teacher_student_assessments.pathway
      and t.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.current_teacher_profile() t
    where t.user_id = teacher_student_assessments.teacher_id
      and t.pathway = teacher_student_assessments.pathway
      and t.status = 'active'
  )
);

-- 3. Teacher class announcements (pathway-isolated)
create table if not exists public.teacher_class_announcements (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  pathway text not null check (pathway in ('bangla_version', 'english_version')),
  academic_class smallint not null check (academic_class between 1 and 12),
  academic_group text check (academic_group in ('Science', 'Arts', 'Commerce') or academic_group is null),
  subject text not null,
  title text not null,
  message text not null,
  tag text not null default 'Study Update' check (tag in ('Study Update', 'Homework', 'Exam Prep')),
  created_at timestamptz not null default now()
);

alter table public.teacher_class_announcements enable row level security;

drop policy if exists "Teachers manage own pathway class announcements" on public.teacher_class_announcements;
create policy "Teachers manage own pathway class announcements"
on public.teacher_class_announcements
for all
to authenticated
using (
  exists (
    select 1
    from public.current_teacher_profile() t
    where t.user_id = teacher_class_announcements.teacher_id
      and t.pathway = teacher_class_announcements.pathway
      and t.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.current_teacher_profile() t
    where t.user_id = teacher_class_announcements.teacher_id
      and t.pathway = teacher_class_announcements.pathway
      and t.status = 'active'
  )
);

-- 4. Pathway-scoped Teacher read access to official Admin notices ('teacher' or 'both')
drop policy if exists "Teachers can view matching pathway notices" on public.notices;
create policy "Teachers can view matching pathway notices"
on public.notices
for select
to authenticated
using (
  exists (
    select 1
    from public.current_teacher_profile() t
    where t.status = 'active'
      and t.pathway = notices.pathway
      and notices.target_audience in ('teacher', 'both')
  )
);

-- 5. Pathway-scoped Teacher read access to Student directory profiles
drop policy if exists "Teachers can view students in own pathway" on public.profiles;
create policy "Teachers can view students in own pathway"
on public.profiles
for select
to authenticated
using (
  profiles.id = auth.uid()
  or exists (
    select 1
    from public.current_teacher_profile() t
    where t.status = 'active'
      and t.pathway = profiles.pathway
      and profiles.role = 'student'
  )
);

-- 6. Public/anon teacher coupon submission into pathway-scoped pending_registrations
drop policy if exists "Teachers can submit coupon pending registration" on public.pending_registrations;
create policy "Teachers can submit coupon pending registration"
on public.pending_registrations
for insert
to anon, authenticated
with check (
  role = 'teacher'
  and pathway in ('bangla_version', 'english_version')
  and coupon_code like 'T-%'
);
