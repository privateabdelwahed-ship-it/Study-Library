# Study Library

A small, hand-kept study website for third-year university students: pick a
semester, open a module, read the lesson — in a proper in-page PDF reader or
as a comfortable written article. No accounts. Arabic and English, with a warm
dark reading mode.

**Seeded empty by request.** The site ships with the real S5 module structure
and S6 placeholders, but zero lessons, files or announcements — so nothing
gets in the way when real content is added.

## Quick start

This is plain HTML/CSS/JS with **no build step**, but it must be served over
HTTP (browsers block ES modules and PDF loading from `file://`):

```bash
cd study-library
python3 -m http.server 8000
# or: npx serve .
```

Then open http://localhost:8000 — try `#/s/s5/bases-de-donnees` style URLs.

Without backend keys (see below) the site runs on its local seed data and
everything reads fine; edit actions will tell you loudly that no backend is
connected instead of failing silently.

## Backend setup (Supabase)

Edits save to Supabase, not the browser — one database every visitor reads
from. The SQL lives in `supabase/`, runnable as-is in the dashboard's SQL
Editor.

1. **Create a free project** at [supabase.com](https://supabase.com) → New project.
2. **Run the schema:** SQL Editor → paste `supabase/schema.sql` → Run. This creates the tables, row-level security, and the `lesson-files` storage bucket.
3. **Run the seed (optional):** SQL Editor → paste `supabase/seed.sql` → Run. Inserts the S5/S6 semesters, the real S5 modules and the lesson types. No lessons — the site starts empty on purpose. Re-runnable (won't duplicate).
4. **Confirm the bucket:** Storage → you should see `lesson-files` (public read).
5. **Connect the site:** Supabase dashboard → Project Settings → API → copy the **Project URL** and the **anon public** key into `js/config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`). Use the anon key — never the `service_role` key, which must stay secret.
6. **Serve locally and edit:** `python3 -m http.server`, open the site, flip the **Edit mode** switch in the header. Add a semester, upload a file — it lands in Supabase.
7. **Create the admin (later, when the content is ready):** dashboard → Authentication → Users → **Add user** (email + password). This is the only admin account; there is no sign-up page.
8. **Lock down (later, on your go-ahead):** set `REQUIRE_ADMIN_LOGIN = true` in `js/config.js` **and** run `supabase/lockdown.sql` in the SQL Editor. The second step is the real lock — it revokes anonymous writes in the database itself, so only the signed-in admin can write. Hiding buttons is not protection.

## Editing content

Flip **Edit mode** in the header (visible only when editing is allowed and a
backend is connected). A thin black bar confirms it's on; every change shows
"Saved ✓" and the page refreshes itself.

- **Home:** add semesters; edit / hide / delete per semester card; add / edit / delete announcements; the hero tagline renames inline (click it).
- **Semester page:** add modules; per-card edit / hide / delete; the title renames inline.
- **Module page:** add lessons and chapters; per-row edit / hide / delete / move up-down; chapter titles rename inline; "Manage types" jumps to Settings.
- **Lesson page:** "Edit details" (title, type, chapter, format, visibility…); file uploads with a real progress bar (PDF works best, 50 MB max per file); delete files; add / delete links; "Edit text" for written lessons (markdown).
- **About page:** "Edit text" rewrites the about page (English + Arabic).
- **Settings** (`#/settings`): site info (name, tagline, about, contact, default language), semester and lesson-type managers, the **Trash** (restore or permanently delete), **Backup** (download / restore a JSON snapshot — file binaries are *not* included, back up the `lesson-files` bucket separately), and the **Danger zone** (delete all content, two confirms, no undo).
- Deleted things go to the **Trash** first; only "Delete forever" (or the danger zone) is permanent.

## Folder map

```
index.html            single shell: header/footer mounts + <div id="app">
css/
  tokens.css          every color as a variable (light + dark overrides)
  base.css            reset, type, links, buttons, focus rings
  layout.css          header, footer, container, grids
  components.css      panels, index cards, ruled rows, tags, file cards…
  reader.css          PDF reader + written-lesson article + dark reading mode
  editor.css          edit bar, modals, toasts, settings, upload progress
supabase/
  schema.sql          tables + RLS + storage bucket (run first)
  seed.sql            S5/S6 semesters, real S5 modules, lesson types (optional)
  migrate-announcement-files.sql   one-time migration if your DB predates 2026-10-10 (lets files attach to announcements)
  migrate-module-announcements.sql one-time migration if your DB predates 2026-10-10 21:00 UTC (module announcements + links on announcements)
  lockdown.sql        revokes anonymous writes (run when locking down)
js/
  config.js           SUPABASE_URL / SUPABASE_ANON_KEY / REQUIRE_ADMIN_LOGIN
  data/supabase.js    Supabase client (null + warning when unconfigured)
  data/seed-data.js   offline fallback content (mirrors the DB shape)
  data/store.js       data-access layer: sync reads from cache + async writes
  i18n/translations.js every UI string, { en, ar }
  i18n/i18n.js        t(), setLang(), lang/dir switching
  lib/router.js       hash router (#/s/s5/… — shareable, no server config)
  lib/permissions.js  canEdit() — the single permission check (async)
  lib/editmode.js     edit-mode switch (sessionStorage) + inline rename
  lib/edit-ui.js      shared edit helpers: commit(), tool buttons, confirms
  lib/pdf-reader.js   PDF.js wrapper: lazy pages, zoom, fit, fullscreen
  lib/markdown.js     tiny renderer for written lessons
  lib/prefs.js        localStorage: language, theme, bookmarks, done, last-read
  lib/icons.js        one inline-SVG line-icon set
  lib/format.js       relative dates ("3 days ago"), file sizes
  components/         header.js, footer.js, modal.js, toast.js
  pages/              home, semester, module, lesson, search, about, admin, settings
  app.js              bootstrap
```

## Data model (Supabase)

`js/data/store.js` is the only module that touches the database. Reads are
synchronous from an in-memory cache (seeded from `seed-data.js`, replaced by
live data in `initStore()` at boot); writes are async and go to Supabase
first, then update the cache. Page code never contains SQL.

| table            | notable columns |
|------------------|-----------------|
| `site_settings`  | single row (`id = 1`): `site_name`, `tagline_en/ar`, `about_en/ar`, `contact`, `default_lang` |
| `lesson_types`   | `slug`, `label_en`, `label_ar`, `sort_order` |
| `semesters`      | `slug`, `title`, `year_label`, `color`, `sort_order`, `is_visible` |
| `modules`        | `semester_id → semesters.id`, `slug`, `code`, `title`, `teacher`, `description`, `credits`, `color`, `sort_order`, `is_visible` |
| `chapters`       | `module_id → modules.id`, `title`, `sort_order` |
| `lessons`        | `module_id`, `chapter_id` (nullable), `slug`, `title`, `type → lesson_types.slug`, `description`, `body_kind` (`pdf`/`written`/`file`), `body_markdown`, `sort_order`, `is_visible`, `created_at`, `deleted_at` (soft delete) |
| `files`          | `lesson_id → lessons.id`, `name` (original filename), `storage_path`, `kind`, `size_bytes`, `sort_order` |
| `links`          | `lesson_id`, `title`, `url`, `sort_order` |
| `announcements`  | `title_en/ar`, `body_en/ar`, `published_at`, `is_visible`, `deleted_at` |

Conventions: `deleted_at` = soft delete (Trash can restore it); uploads go
to the `lesson-files` bucket at `<lessonId>/<timestamp>-<name>`; slugs are
unique per parent and auto-suffixed (`intro`, `intro-2`…).

## Adding content now

Flip **Edit mode** in the header and add content through the pages (see
"Editing content" above) — or manage everything from `#/settings`. The old
`seed-data.js` workflow is gone: with a backend connected, edits save to
Supabase; without one, the seed file is just the offline fallback.

## The admin plan

1. `js/config.js` holds `REQUIRE_ADMIN_LOGIN = false`.
2. `js/lib/permissions.js` holds `canEdit()` — **every** edit path must call
   it; there is deliberately no other check.
3. The footer "Admin" link points to `#/manage-bxpngexc`: a placeholder while the lock
   is off, a Supabase email+password sign-in while it's on. The URL is
   deliberately unguessable and shown only to the signed-in admin.
4. To lock the site: create the admin in the dashboard (Authentication →
   Add user), flip the flag, and run `supabase/lockdown.sql` — hiding
   buttons is not protection; the backend must refuse writes too.

## Deployment

The folder is fully static: drag it into Netlify Drop, or `vercel` /
`netlify deploy`, and it works. Hash routing (`#/s/s5/…`) needs no server
rewrites, so every lesson URL stays shareable.

## Notes

- **PDF is the best format for lessons.** The reader is built for it (lazy
  pages, zoom, fit-to-width, fullscreen). Word/PowerPoint/Excel files get a
  tidy download card instead of a broken preview — on purpose.
- **50 MB per file** on upload (`MAX_FILE_MB` in `js/config.js`); the error
  names the file and the limit.
- **Backup = JSON of the database rows** (Settings → Backup), including the
  trash. File *binaries* are not inside — back up the `lesson-files`
  storage bucket separately if the files matter.
- **Edits save to Supabase, not the browser.** The only things in
  localStorage are personal: bookmarks, done ticks, last-read page,
  language, theme, and the per-tab edit-mode switch.
- Personal data (bookmarks, done ticks, last-read page, language, theme)
  lives in the browser's localStorage only, and the site says so next to
  every control ("Saved on this device only.").

## Visual language

Bold yellow/black/white, adapted from an energetic course-promo reference:
saturated yellow (`#FFC800`) hero and semester cards, near-black (`#161616`)
text and buttons, 2px black outlines, hard offset shadows (`4px 4px 0`),
pill buttons and badges, heavy uppercase Archivo headlines
(Noto Sans Arabic for Arabic). Dark reading mode inverts boldly: black
surfaces, yellow buttons and accents pop. Every color lives in
`css/tokens.css` — light and dark values together — so the whole look
changes from that one file.

## Intentionally not built yet

**Comments, accounts for students, AI summaries.** The brief's "not now"
list still holds: no chatbot, no badges, no payments, no analytics.
