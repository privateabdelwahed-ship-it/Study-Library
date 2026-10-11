-- ============================================================
-- Study Library — LOCKDOWN.
--
-- WHEN TO RUN THIS: only after the content is ready and you want to
-- make the site read-only for visitors. It is the backend half of the
-- admin lock. Run it in the SQL Editor, then do the frontend half:
--
--   1. Run this file (supabase/lockdown.sql) in the SQL Editor.
--   2. Set REQUIRE_ADMIN_LOGIN = true in js/config.js.
--   3. Create the admin user: Supabase dashboard → Authentication →
--      Users → "Add user" → enter email + password.
--   4. Sign in on the site at #/manage-bxpngexc with that email + password.
--
-- WHAT IT DOES: drops every anonymous ("open_*") INSERT/UPDATE/DELETE
-- policy created by schema.sql, on the tables AND on the storage
-- bucket, then recreates write policies for authenticated users only.
-- From this point on:
--   - visitors (anon key, no session): SELECT only — a read-only site.
--   - the signed-in admin: full read + write.
-- Hiding the edit buttons was never protection; THIS is the real lock.
-- To re-open writes (not recommended on a public site), re-run the
-- policy section of schema.sql.
-- ============================================================

-- ---------- drop the open-phase anonymous write policies ----------

drop policy if exists "open_insert" on public.semesters;
drop policy if exists "open_update" on public.semesters;
drop policy if exists "open_delete" on public.semesters;

drop policy if exists "open_insert" on public.modules;
drop policy if exists "open_update" on public.modules;
drop policy if exists "open_delete" on public.modules;

drop policy if exists "open_insert" on public.chapters;
drop policy if exists "open_update" on public.chapters;
drop policy if exists "open_delete" on public.chapters;

drop policy if exists "open_insert" on public.lessons;
drop policy if exists "open_update" on public.lessons;
drop policy if exists "open_delete" on public.lessons;

drop policy if exists "open_insert" on public.files;
drop policy if exists "open_update" on public.files;
drop policy if exists "open_delete" on public.files;

drop policy if exists "open_insert" on public.links;
drop policy if exists "open_update" on public.links;
drop policy if exists "open_delete" on public.links;

drop policy if exists "open_insert" on public.lesson_types;
drop policy if exists "open_update" on public.lesson_types;
drop policy if exists "open_delete" on public.lesson_types;

drop policy if exists "open_insert" on public.announcements;
drop policy if exists "open_update" on public.announcements;
drop policy if exists "open_delete" on public.announcements;

drop policy if exists "open_insert" on public.site_settings;
drop policy if exists "open_update" on public.site_settings;
drop policy if exists "open_delete" on public.site_settings;

drop policy if exists "open_insert" on storage.objects;
drop policy if exists "open_update" on storage.objects;
drop policy if exists "open_delete" on storage.objects;

-- ---------- authenticated-only write policies (the admin) ----------
-- (Dropped first so re-running this file is harmless.)

drop policy if exists "admin_insert" on public.semesters;
drop policy if exists "admin_update" on public.semesters;
drop policy if exists "admin_delete" on public.semesters;
drop policy if exists "admin_insert" on public.modules;
drop policy if exists "admin_update" on public.modules;
drop policy if exists "admin_delete" on public.modules;
drop policy if exists "admin_insert" on public.chapters;
drop policy if exists "admin_update" on public.chapters;
drop policy if exists "admin_delete" on public.chapters;
drop policy if exists "admin_insert" on public.lessons;
drop policy if exists "admin_update" on public.lessons;
drop policy if exists "admin_delete" on public.lessons;
drop policy if exists "admin_insert" on public.files;
drop policy if exists "admin_update" on public.files;
drop policy if exists "admin_delete" on public.files;
drop policy if exists "admin_insert" on public.links;
drop policy if exists "admin_update" on public.links;
drop policy if exists "admin_delete" on public.links;
drop policy if exists "admin_insert" on public.lesson_types;
drop policy if exists "admin_update" on public.lesson_types;
drop policy if exists "admin_delete" on public.lesson_types;
drop policy if exists "admin_insert" on public.announcements;
drop policy if exists "admin_update" on public.announcements;
drop policy if exists "admin_delete" on public.announcements;
drop policy if exists "admin_insert" on public.site_settings;
drop policy if exists "admin_update" on public.site_settings;
drop policy if exists "admin_delete" on public.site_settings;
drop policy if exists "admin_insert" on storage.objects;
drop policy if exists "admin_update" on storage.objects;
drop policy if exists "admin_delete" on storage.objects;

create policy "admin_insert" on public.semesters
  for insert to authenticated with check (true);
create policy "admin_update" on public.semesters
  for update to authenticated using (true) with check (true);
create policy "admin_delete" on public.semesters
  for delete to authenticated using (true);

create policy "admin_insert" on public.modules
  for insert to authenticated with check (true);
create policy "admin_update" on public.modules
  for update to authenticated using (true) with check (true);
create policy "admin_delete" on public.modules
  for delete to authenticated using (true);

create policy "admin_insert" on public.chapters
  for insert to authenticated with check (true);
create policy "admin_update" on public.chapters
  for update to authenticated using (true) with check (true);
create policy "admin_delete" on public.chapters
  for delete to authenticated using (true);

create policy "admin_insert" on public.lessons
  for insert to authenticated with check (true);
create policy "admin_update" on public.lessons
  for update to authenticated using (true) with check (true);
create policy "admin_delete" on public.lessons
  for delete to authenticated using (true);

create policy "admin_insert" on public.files
  for insert to authenticated with check (true);
create policy "admin_update" on public.files
  for update to authenticated using (true) with check (true);
create policy "admin_delete" on public.files
  for delete to authenticated using (true);

create policy "admin_insert" on public.links
  for insert to authenticated with check (true);
create policy "admin_update" on public.links
  for update to authenticated using (true) with check (true);
create policy "admin_delete" on public.links
  for delete to authenticated using (true);

create policy "admin_insert" on public.lesson_types
  for insert to authenticated with check (true);
create policy "admin_update" on public.lesson_types
  for update to authenticated using (true) with check (true);
create policy "admin_delete" on public.lesson_types
  for delete to authenticated using (true);

create policy "admin_insert" on public.announcements
  for insert to authenticated with check (true);
create policy "admin_update" on public.announcements
  for update to authenticated using (true) with check (true);
create policy "admin_delete" on public.announcements
  for delete to authenticated using (true);

create policy "admin_insert" on public.site_settings
  for insert to authenticated with check (true);
create policy "admin_update" on public.site_settings
  for update to authenticated using (true) with check (true);
create policy "admin_delete" on public.site_settings
  for delete to authenticated using (true);

create policy "admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'lesson-files');
create policy "admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'lesson-files') with check (bucket_id = 'lesson-files');
create policy "admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'lesson-files');

-- Reads stay public: the "open_select" policies from schema.sql are
-- untouched, so visitors keep reading everything.
