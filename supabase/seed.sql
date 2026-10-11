-- ============================================================
-- Study Library — seed data for Supabase.
--
-- Run AFTER supabase/schema.sql. Re-runnable: every INSERT uses a
-- fixed id with ON CONFLICT DO NOTHING, so running it twice is safe.
-- Migrates the current seed: 2 semesters, 14 modules (real S5 names),
-- 5 lesson types, 1 settings row. No lessons — the site starts empty
-- on purpose.
-- ============================================================

-- semesters
insert into public.semesters (id, slug, title, year_label, color, sort_order, is_visible)
values
  ('11111111-1111-4111-8111-111111111111', 's5', 'S5', 'Third year', '#FFC800', 1, true),
  ('22222222-2222-4222-8222-222222222222', 's6', 'S6', 'Third year', '#FFC800', 2, true)
on conflict (id) do nothing;

-- modules: S5 carries the real modules (from the S5 timetable)
insert into public.modules (id, semester_id, slug, code, title, teacher, description, credits, color, sort_order, is_visible)
values
  ('11111111-1111-4111-8111-111111111101', '11111111-1111-4111-8111-111111111111', 'intelligence-artificielle', 'IA',  'Introduction à l''intelligence artificielle', '', '', '', '#2F5D46', 1, true),
  ('11111111-1111-4111-8111-111111111102', '11111111-1111-4111-8111-111111111111', 'recherche-operationnelle',   'RO',  'Recherche opérationnelle et optimisation',             '', '', '', '#BF5B33', 2, true),
  ('11111111-1111-4111-8111-111111111103', '11111111-1111-4111-8111-111111111111', 'reseaux-informatiques',       'RI',  'Réseaux informatiques',                                   '', '', '', '#D6A23A', 3, true),
  ('11111111-1111-4111-8111-111111111104', '11111111-1111-4111-8111-111111111111', 'bases-de-donnees',            'BDD', 'Bases de données avancées',                                '', '', '', '#9C2F2A', 4, true),
  ('11111111-1111-4111-8111-111111111105', '11111111-1111-4111-8111-111111111111', 'gestion-de-projet',           'GP',  'Gestion de projet',                                       '', '', '', '#7B7A2F', 5, true),
  ('11111111-1111-4111-8111-111111111106', '11111111-1111-4111-8111-111111111111', 'conception-orientee-objet',   'COO', 'Conception orientée objet avec UML',                      '', '', '', '#8C5A3C', 6, true),
  ('11111111-1111-4111-8111-111111111107', '11111111-1111-4111-8111-111111111111', 'langues-etrangeres',          'LE2', 'Langues étrangères 2',                                     '', '', '', '#8AA17A', 7, true),
  -- S6: placeholders to rename later
  ('22222222-2222-4222-8222-222222222201', '22222222-2222-4222-8222-222222222222', 'module-1', '', 'Module 1', '', '', '', '#BF5B33', 1, true),
  ('22222222-2222-4222-8222-222222222202', '22222222-2222-4222-8222-222222222222', 'module-2', '', 'Module 2', '', '', '', '#8C5A3C', 2, true),
  ('22222222-2222-4222-8222-222222222203', '22222222-2222-4222-8222-222222222222', 'module-3', '', 'Module 3', '', '', '', '#7B7A2F', 3, true),
  ('22222222-2222-4222-8222-222222222204', '22222222-2222-4222-8222-222222222222', 'module-4', '', 'Module 4', '', '', '', '#9C2F2A', 4, true),
  ('22222222-2222-4222-8222-222222222205', '22222222-2222-4222-8222-222222222222', 'module-5', '', 'Module 5', '', '', '', '#8AA17A', 5, true),
  ('22222222-2222-4222-8222-222222222206', '22222222-2222-4222-8222-222222222222', 'module-6', '', 'Module 6', '', '', '', '#D6A23A', 6, true),
  ('22222222-2222-4222-8222-222222222207', '22222222-2222-4222-8222-222222222222', 'module-7', '', 'Module 7', '', '', '', '#3B3631', 7, true)
on conflict (id) do nothing;

-- lesson types
insert into public.lesson_types (id, slug, label_en, label_ar, sort_order, is_visible)
values
  ('33333333-3333-4333-8333-333333333301', 'lecture-notes', 'Lecture notes', 'محاضرات',         1, true),
  ('33333333-3333-4333-8333-333333333302', 'exercises',     'Exercises',     'تمارين',           2, true),
  ('33333333-3333-4333-8333-333333333303', 'lab-work',      'Lab work',      'أعمال تطبيقية',   3, true),
  ('33333333-3333-4333-8333-333333333304', 'past-exams',    'Past exams',    'امتحانات سابقة',  4, true),
  ('33333333-3333-4333-8333-333333333305', 'summaries',     'Summaries',     'ملخصات',           5, true)
on conflict (id) do nothing;

-- site settings (single row, id = 1)
insert into public.site_settings (id, site_name, tagline_en, tagline_ar, about_en, about_ar, contact, default_lang)
values (
  1,
  'Study Library',
  'Your semesters, sorted.',
  'سداسياتك، مرتبة.',
  'Study Library is a small, hand-kept collection of course material for third-year students: lecture notes, exercises, lab guides, past exams and summaries. Pick a semester, open a module, and read — no account needed.

Everything here is organized as Semester → Module → Lesson. If something is missing or wrong, tell your class rep so it can be fixed at the source.',
  'مكتبة الدراسة مجموعة صغيرة ومرتبة بعناية لمواد السنة الثالثة الجامعية: محاضرات وتمارين وأعمال تطبيقية وامتحانات سابقة وملخصات. اختر السداسي، افتح الوحدة، واقرأ — دون الحاجة إلى حساب.

كل شيء منظم على شكل سداسي ← وحدة ← درس. إذا كان هناك شيء ناقص أو خاطئ، أخبر ممثل قسمك ليتم إصلاحه من المصدر.',
  'mailto:hello@example.com',
  'en'
)
on conflict (id) do nothing;
