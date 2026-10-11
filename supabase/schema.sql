-- ============================================================
-- Study Library — Supabase schema (OPEN phase)
--
-- Run this in the Supabase dashboard: SQL Editor → New query →
-- paste → Run. It creates every table, enables row-level security,
-- and creates the public `lesson-files` storage bucket.
--
-- OPEN PHASE: while the site is private and Abdo is filling it in,
-- anyone with the anon key can read AND write. That is intentional
-- for now — there is no login yet (REQUIRE_ADMIN_LOGIN = false).
-- See the big comment on the write policies below, and read
-- supabase/lockdown.sql when the content is ready: it revokes the
-- anonymous write policies so only the signed-in admin can write.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- tables ----------

create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null default '',
  year_label text not null default '',
  color text not null default '#FFC800',
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  semester_id uuid not null references public.semesters(id) on delete cascade,
  slug text not null,
  code text not null default '',
  title text not null default '',
  teacher text not null default '',
  description text not null default '',
  credits text not null default '',
  color text not null default '#FFC800',
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (semester_id, slug)
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null default '',
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  slug text not null,
  title text not null default '',
  type text not null default 'lecture-notes',
  description text not null default '',
  body_kind text not null default 'pdf' check (body_kind in ('pdf', 'written', 'file')),
  body_markdown text not null default '',
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (module_id, slug)
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons(id) on delete cascade,
  announcement_id uuid references public.announcements(id) on delete cascade,
  name text not null,                 -- original filename, shown to students
  storage_path text not null,         -- path inside the lesson-files bucket
  kind text not null default 'other', -- pdf | image | docx | pptx | xlsx | zip | other
  size_bytes bigint not null default 0,
  sort_order integer not null default 0,
  -- a file belongs to exactly one parent: a lesson or an announcement
  check (
    (lesson_id is not null and announcement_id is null) or
    (lesson_id is null and announcement_id is not null)
  )
);

create table public.links (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons(id) on delete cascade,
  announcement_id uuid references public.announcements(id) on delete cascade,
  title text not null default '',
  url text not null default '',
  sort_order integer not null default 0,
  -- a link belongs to exactly one parent: a lesson or an announcement
  check (
    (lesson_id is not null and announcement_id is null) or
    (lesson_id is null and announcement_id is not null)
  )
);

create table public.lesson_types (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label_en text not null default '',
  label_ar text not null default '',
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  deleted_at timestamptz
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id) on delete cascade, -- null = global (home notice board)
  title_en text not null default '',
  title_ar text not null default '',
  body_en text not null default '',
  body_ar text not null default '',
  published_at timestamptz not null default now(),
  is_visible boolean not null default true,
  deleted_at timestamptz
);

-- Single-row settings table (id is always 1).
create table public.site_settings (
  id integer primary key check (id = 1),
  site_name text not null default 'Study Library',
  tagline_en text not null default '',
  tagline_ar text not null default '',
  about_en text not null default '',
  about_ar text not null default '',
  contact text not null default '',
  default_lang text not null default 'en'
);

-- ---------- row-level security ----------

alter table public.semesters      enable row level security;
alter table public.modules        enable row level security;
alter table public.chapters       enable row level security;
alter table public.lessons        enable row level security;
alter table public.files          enable row level security;
alter table public.links          enable row level security;
alter table public.lesson_types   enable row level security;
alter table public.announcements  enable row level security;
alter table public.site_settings  enable row level security;

-- OPEN PHASE policies.
-- Reads are fully public (the Trash UI needs to see soft-deleted rows
-- too, so the app — not RLS — filters deleted_at IS NULL for visitors).
-- Writes are open to anon + authenticated while there is no login.
-- >>> When the content is ready, run supabase/lockdown.sql: it drops the
--     anonymous write policies below so only the signed-in admin can
--     write, matching REQUIRE_ADMIN_LOGIN = true in js/config.js.

-- semesters
create policy "open_select" on public.semesters for select to anon, authenticated using (true);
create policy "open_insert" on public.semesters for insert to anon, authenticated with check (true);
create policy "open_update" on public.semesters for update to anon, authenticated using (true) with check (true);
create policy "open_delete" on public.semesters for delete to anon, authenticated using (true);

-- modules
create policy "open_select" on public.modules for select to anon, authenticated using (true);
create policy "open_insert" on public.modules for insert to anon, authenticated with check (true);
create policy "open_update" on public.modules for update to anon, authenticated using (true) with check (true);
create policy "open_delete" on public.modules for delete to anon, authenticated using (true);

-- chapters
create policy "open_select" on public.chapters for select to anon, authenticated using (true);
create policy "open_insert" on public.chapters for insert to anon, authenticated with check (true);
create policy "open_update" on public.chapters for update to anon, authenticated using (true) with check (true);
create policy "open_delete" on public.chapters for delete to anon, authenticated using (true);

-- lessons
create policy "open_select" on public.lessons for select to anon, authenticated using (true);
create policy "open_insert" on public.lessons for insert to anon, authenticated with check (true);
create policy "open_update" on public.lessons for update to anon, authenticated using (true) with check (true);
create policy "open_delete" on public.lessons for delete to anon, authenticated using (true);

-- files
create policy "open_select" on public.files for select to anon, authenticated using (true);
create policy "open_insert" on public.files for insert to anon, authenticated with check (true);
create policy "open_update" on public.files for update to anon, authenticated using (true) with check (true);
create policy "open_delete" on public.files for delete to anon, authenticated using (true);

-- links
create policy "open_select" on public.links for select to anon, authenticated using (true);
create policy "open_insert" on public.links for insert to anon, authenticated with check (true);
create policy "open_update" on public.links for update to anon, authenticated using (true) with check (true);
create policy "open_delete" on public.links for delete to anon, authenticated using (true);

-- lesson_types
create policy "open_select" on public.lesson_types for select to anon, authenticated using (true);
create policy "open_insert" on public.lesson_types for insert to anon, authenticated with check (true);
create policy "open_update" on public.lesson_types for update to anon, authenticated using (true) with check (true);
create policy "open_delete" on public.lesson_types for delete to anon, authenticated using (true);

-- announcements
create policy "open_select" on public.announcements for select to anon, authenticated using (true);
create policy "open_insert" on public.announcements for insert to anon, authenticated with check (true);
create policy "open_update" on public.announcements for update to anon, authenticated using (true) with check (true);
create policy "open_delete" on public.announcements for delete to anon, authenticated using (true);

-- site_settings
create policy "open_select" on public.site_settings for select to anon, authenticated using (true);
create policy "open_insert" on public.site_settings for insert to anon, authenticated with check (true);
create policy "open_update" on public.site_settings for update to anon, authenticated using (true) with check (true);
create policy "open_delete" on public.site_settings for delete to anon, authenticated using (true);

-- ---------- storage: the lesson-files bucket ----------

insert into storage.buckets (id, name, public)
values ('lesson-files', 'lesson-files', true)
on conflict (id) do nothing;

create policy "open_select" on storage.objects
  for select to anon, authenticated using (bucket_id = 'lesson-files');
create policy "open_insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'lesson-files');
create policy "open_update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'lesson-files') with check (bucket_id = 'lesson-files');
create policy "open_delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'lesson-files');
