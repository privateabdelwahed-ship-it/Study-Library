// ============================================================
// Study Library — seed data.
//
// This file is shaped EXACTLY like the future database tables
// (see README "Data model → Supabase"). Every page renders from
// here; nothing is hard-coded in the HTML.
//
// Ids below are the SAME fixed UUIDs as supabase/seed.sql, so the local
// fallback cache and the database always agree (no id mismatches, ever).
//
// To add content today, edit this file:
//   - new semester → push to DB.semesters (and its modules)
//   - new module   → push to DB.modules with the semester's id
//   - new lesson   → push to DB.lessons (+ DB.files / DB.links)
// Later, this whole file is replaced by Supabase calls in
// js/data/store.js — the page code does not change.
// ============================================================

// Helper: an ISO date N days before today. Sample lessons use it so the
// "New" tag (lessons added in the last 7 days) keeps working over time.
function daysAgo(n) {
  return new Date(Date.now() - n * 864e5).toISOString();
}

export const DB = {
  site: {
    name: "Study Library",
    tagline: {
      en: "Your semesters, sorted.",
      ar: "سداسياتك، مرتبة.",
    },
    // Shown on the About page. Replace with your own text.
    about: {
      en: "Study Library is a small, hand-kept collection of course material for third-year students: lecture notes, exercises, lab guides, past exams and summaries. Pick a semester, open a module, and read — no account needed.\n\nEverything here is organized as Semester → Module → Lesson. If something is missing or wrong, tell your class rep so it can be fixed at the source.",
      ar: "مكتبة الدراسة مجموعة صغيرة ومرتبة بعناية لمواد السنة الثالثة الجامعية: محاضرات وتمارين وأعمال تطبيقية وامتحانات سابقة وملخصات. اختر السداسي، افتح الوحدة، واقرأ — دون الحاجة إلى حساب.\n\nكل شيء منظم على شكل سداسي ← وحدة ← درس. إذا كان هناك شيء ناقص أو خاطئ، أخبر ممثل قسمك ليتم إصلاحه من المصدر.",
    },
    // Placeholder — replace with a real contact when the site goes live.
    contact: "mailto:hello@example.com",
  },

  settings: {
    defaultLang: "en", // "en" or "ar" — the language first-time visitors see
  },

  // Lesson types. The list itself is data: it can be renamed, reordered
  // or extended without touching any code.
  lessonTypes: [
    { id: "33333333-3333-4333-8333-333333333301", slug: "lecture-notes", label: { en: "Lecture notes", ar: "محاضرات" }, order: 1 },
    { id: "33333333-3333-4333-8333-333333333302", slug: "exercises", label: { en: "Exercises", ar: "تمارين" }, order: 2 },
    { id: "33333333-3333-4333-8333-333333333303", slug: "lab-work", label: { en: "Lab work", ar: "أعمال تطبيقية" }, order: 3 },
    { id: "33333333-3333-4333-8333-333333333304", slug: "past-exams", label: { en: "Past exams", ar: "امتحانات سابقة" }, order: 4 },
    { id: "33333333-3333-4333-8333-333333333305", slug: "summaries", label: { en: "Summaries", ar: "ملخصات" }, order: 5 },
  ],

  // Semesters are data, not code: add S1–S4 here later and they appear
  // on the home page automatically, grouped under their yearLabel.
  semesters: [
    { id: "11111111-1111-4111-8111-111111111111", slug: "s5", title: "S5", yearLabel: "Third year", color: "#2F5D46", order: 1, visible: true },
    { id: "22222222-2222-4222-8222-222222222222", slug: "s6", title: "S6", yearLabel: "Third year", color: "#BF5B33", order: 2, visible: true },
  ],

  // S5 carries the real modules (from the actual S5 timetable); S6 is still
  // placeholders to rename later. Colors come from the fixed swatch set
  // (see css/tokens.css).
  modules: [
    // --- S5 (real modules) ---
    { id: "11111111-1111-4111-8111-111111111101", semesterId: "11111111-1111-4111-8111-111111111111", slug: "intelligence-artificielle", code: "IA", title: "Introduction à l'intelligence artificielle", teacher: "", description: "", credits: "", color: "#2F5D46", order: 1, visible: true },
    { id: "11111111-1111-4111-8111-111111111102", semesterId: "11111111-1111-4111-8111-111111111111", slug: "recherche-operationnelle", code: "RO", title: "Recherche opérationnelle et optimisation", teacher: "", description: "", credits: "", color: "#BF5B33", order: 2, visible: true },
    { id: "11111111-1111-4111-8111-111111111103", semesterId: "11111111-1111-4111-8111-111111111111", slug: "reseaux-informatiques", code: "RI", title: "Réseaux informatiques", teacher: "", description: "", credits: "", color: "#D6A23A", order: 3, visible: true },
    { id: "11111111-1111-4111-8111-111111111104", semesterId: "11111111-1111-4111-8111-111111111111", slug: "bases-de-donnees", code: "BDD", title: "Bases de données avancées", teacher: "", description: "", credits: "", color: "#9C2F2A", order: 4, visible: true },
    { id: "11111111-1111-4111-8111-111111111105", semesterId: "11111111-1111-4111-8111-111111111111", slug: "gestion-de-projet", code: "GP", title: "Gestion de projet", teacher: "", description: "", credits: "", color: "#7B7A2F", order: 5, visible: true },
    { id: "11111111-1111-4111-8111-111111111106", semesterId: "11111111-1111-4111-8111-111111111111", slug: "conception-orientee-objet", code: "COO", title: "Conception orientée objet avec UML", teacher: "", description: "", credits: "", color: "#8C5A3C", order: 6, visible: true },
    { id: "11111111-1111-4111-8111-111111111107", semesterId: "11111111-1111-4111-8111-111111111111", slug: "langues-etrangeres", code: "LE2", title: "Langues étrangères 2", teacher: "", description: "", credits: "", color: "#8AA17A", order: 7, visible: true },
    // --- S6 ---
    { id: "22222222-2222-4222-8222-222222222201", semesterId: "22222222-2222-4222-8222-222222222222", slug: "module-1", code: "", title: "Module 1", teacher: "", description: "", credits: "", color: "#BF5B33", order: 1, visible: true },
    { id: "22222222-2222-4222-8222-222222222202", semesterId: "22222222-2222-4222-8222-222222222222", slug: "module-2", code: "", title: "Module 2", teacher: "", description: "", credits: "", color: "#8C5A3C", order: 2, visible: true },
    { id: "22222222-2222-4222-8222-222222222203", semesterId: "22222222-2222-4222-8222-222222222222", slug: "module-3", code: "", title: "Module 3", teacher: "", description: "", credits: "", color: "#7B7A2F", order: 3, visible: true },
    { id: "22222222-2222-4222-8222-222222222204", semesterId: "22222222-2222-4222-8222-222222222222", slug: "module-4", code: "", title: "Module 4", teacher: "", description: "", credits: "", color: "#9C2F2A", order: 4, visible: true },
    { id: "22222222-2222-4222-8222-222222222205", semesterId: "22222222-2222-4222-8222-222222222222", slug: "module-5", code: "", title: "Module 5", teacher: "", description: "", credits: "", color: "#8AA17A", order: 5, visible: true },
    { id: "22222222-2222-4222-8222-222222222206", semesterId: "22222222-2222-4222-8222-222222222222", slug: "module-6", code: "", title: "Module 6", teacher: "", description: "", credits: "", color: "#D6A23A", order: 6, visible: true },
    { id: "22222222-2222-4222-8222-222222222207", semesterId: "22222222-2222-4222-8222-222222222222", slug: "module-7", code: "", title: "Module 7", teacher: "", description: "", credits: "", color: "#3B3631", order: 7, visible: true },
  ],

  // Chapters are optional and per-module. The site starts with none;
  // add them here (or later via Edit mode) to group a module's lessons
  // under serif headings.
  chapters: [],

  // bodyKind: "pdf" | "written" | "file"
  //   pdf     → read in the built-in reader (bodyFileId points at DB.files)
  //   written → bodyMarkdown rendered as a comfortable article
  //   file    → no preview; a tidy download card (Word, Excel, ZIP, …)
  //
  // Seeded empty by request: no sample lessons, so nothing gets in the way
  // when real lessons are added.
  lessons: [],

  // kind decides how a file is presented: pdf → reader, image → inline,
  // anything else → download card. Office files are never previewed.
  files: [],

  // External links attached to lessons (a video, a Drive folder, …).
  links: [],

  announcements: [],
};
