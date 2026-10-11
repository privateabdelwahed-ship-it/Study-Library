-- ============================================================
-- Study Library — migration: announcements inside modules + links
-- on announcements.
--
-- Run ONCE in the Supabase SQL Editor if your database was created
-- from schema.sql BEFORE 2026-10-10 21:00 UTC. New databases don't
-- need this — schema.sql already includes the change.
--
-- What it does:
--   1. announcements.module_id — lets an announcement live inside a
--      module (NULL = global, shown on the home notice board).
--   2. links.announcement_id — lets a link attach to an announcement
--      instead of a lesson (exactly one of the two).
-- Existing rows are untouched.
-- ============================================================

alter table public.announcements
  add column module_id uuid
  references public.modules(id) on delete cascade;

alter table public.links
  alter column lesson_id drop not null;

alter table public.links
  add column announcement_id uuid
  references public.announcements(id) on delete cascade;

alter table public.links
  add constraint links_owner_check check (
    (lesson_id is not null and announcement_id is null) or
    (lesson_id is null and announcement_id is not null)
  );
