-- ============================================================
-- Study Library — migration: files on announcements.
--
-- Run ONCE in the Supabase SQL Editor if your database was created
-- from schema.sql BEFORE 2026-10-10 20:30 UTC (when files could only
-- belong to lessons). New databases don't need this — schema.sql
-- already includes the change.
--
-- What it does: allows a row in public.files to belong to an
-- announcement instead of a lesson (exactly one of the two).
-- Existing rows are untouched (their lesson_id stays set).
-- ============================================================

alter table public.files
  alter column lesson_id drop not null;

alter table public.files
  add column announcement_id uuid
  references public.announcements(id) on delete cascade;

alter table public.files
  add constraint files_owner_check check (
    (lesson_id is not null and announcement_id is null) or
    (lesson_id is null and announcement_id is not null)
  );
