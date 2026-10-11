// ============================================================
// Study Library — data access layer (Supabase edition).
//
// CONTRACT (unchanged): every page talks to the data through THESE
// functions and no other way. The read functions below kept their
// exact names, parameters and return shapes — pages were not touched.
//
// How it works:
//   - At boot, app.js calls await initStore(). If Supabase keys are
//     configured in js/config.js, every table is loaded into an
//     in-memory cache; otherwise the cache is the local seed data
//     (js/data/seed-data.js) and the site works fully offline.
//   - Reads are synchronous and always come from the cache.
//   - Writes are async, go to Supabase first, then update the cache.
//     With no backend configured they throw a LOUD, readable error —
//     never a silent failure.
// Row mapping: Supabase uses snake_case, the app uses camelCase.
// The TABLES registry below is the single place that translates.
// ============================================================
import { DB } from "./seed-data.js";
import { supabase, isBackendConfigured } from "./supabase.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, MAX_FILE_MB } from "../config.js";
import { getSession } from "../lib/permissions.js";

// ---------- tiny helpers ----------

function pickDefined(o) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}

// t() without a static import cycle (i18n.js imports this store module).
async function tt(key, vars) {
  const { t } = await import("../i18n/i18n.js");
  return t(key, vars);
}

async function requireBackend() {
  if (!isBackendConfigured()) throw new Error(await tt("err_no_backend"));
}

function slugify(s) {
  const base = String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "item";
}

// ---------- table registry ----------
// db: real table name · cache: cache key · scope: parent key for
// slug/order scoping (null = global) · toApp/toDb: row translators.

const TABLES = {
  semesters: {
    db: "semesters", cache: "semesters", scope: null,
    toApp: (r) => ({ id: r.id, slug: r.slug, title: r.title, yearLabel: r.year_label, color: r.color, order: r.sort_order, visible: r.is_visible, createdAt: r.created_at, deletedAt: r.deleted_at }),
    toDb: (o) => pickDefined({ slug: o.slug, title: o.title, year_label: o.yearLabel, color: o.color, sort_order: o.order, is_visible: o.visible, deleted_at: o.deletedAt }),
  },
  modules: {
    db: "modules", cache: "modules", scope: "semesterId",
    toApp: (r) => ({ id: r.id, semesterId: r.semester_id, slug: r.slug, code: r.code, title: r.title, teacher: r.teacher, description: r.description, credits: r.credits, color: r.color, order: r.sort_order, visible: r.is_visible, createdAt: r.created_at, deletedAt: r.deleted_at }),
    toDb: (o) => pickDefined({ semester_id: o.semesterId, slug: o.slug, code: o.code, title: o.title, teacher: o.teacher, description: o.description, credits: o.credits, color: o.color, sort_order: o.order, is_visible: o.visible, deleted_at: o.deletedAt }),
  },
  chapters: {
    db: "chapters", cache: "chapters", scope: "moduleId",
    toApp: (r) => ({ id: r.id, moduleId: r.module_id, title: r.title, order: r.sort_order, visible: r.is_visible, createdAt: r.created_at, deletedAt: r.deleted_at }),
    toDb: (o) => pickDefined({ module_id: o.moduleId, title: o.title, sort_order: o.order, is_visible: o.visible, deleted_at: o.deletedAt }),
  },
  lessons: {
    db: "lessons", cache: "lessons", scope: "moduleId",
    toApp: (r) => ({ id: r.id, moduleId: r.module_id, chapterId: r.chapter_id, slug: r.slug, title: r.title, type: r.type, description: r.description, bodyKind: r.body_kind, bodyMarkdown: r.body_markdown, order: r.sort_order, visible: r.is_visible, createdAt: r.created_at, deletedAt: r.deleted_at }),
    toDb: (o) => pickDefined({ module_id: o.moduleId, chapter_id: o.chapterId, slug: o.slug, title: o.title, type: o.type, description: o.description, body_kind: o.bodyKind, body_markdown: o.bodyMarkdown, sort_order: o.order, is_visible: o.visible, deleted_at: o.deletedAt }),
  },
  files: {
    db: "files", cache: "files", scope: "lessonId",
    toApp: (r) => ({ id: r.id, lessonId: r.lesson_id, announcementId: r.announcement_id, name: r.name, originalName: r.name, storagePath: r.storage_path, kind: r.kind, sizeBytes: r.size_bytes, order: r.sort_order, url: fileUrl(r.storage_path) }),
    toDb: (o) => pickDefined({ lesson_id: o.lessonId, announcement_id: o.announcementId, name: o.name, storage_path: o.storagePath, kind: o.kind, size_bytes: o.sizeBytes, sort_order: o.order }),
  },
  links: {
    db: "links", cache: "links", scope: "lessonId",
    toApp: (r) => ({ id: r.id, lessonId: r.lesson_id, announcementId: r.announcement_id, title: r.title, url: r.url, order: r.sort_order }),
    toDb: (o) => pickDefined({ lesson_id: o.lessonId, announcement_id: o.announcementId, title: o.title, url: o.url, sort_order: o.order }),
  },
  lessonTypes: {
    db: "lesson_types", cache: "lessonTypes", scope: null,
    toApp: (r) => ({ id: r.id, slug: r.slug, label: { en: r.label_en, ar: r.label_ar }, order: r.sort_order, visible: r.is_visible, deletedAt: r.deleted_at }),
    toDb: (o) => pickDefined({ slug: o.slug, label_en: o.label?.en, label_ar: o.label?.ar, sort_order: o.order, is_visible: o.visible, deleted_at: o.deletedAt }),
  },
  announcements: {
    db: "announcements", cache: "announcements", scope: null,
    toApp: (r) => ({ id: r.id, moduleId: r.module_id, title: { en: r.title_en, ar: r.title_ar }, body: { en: r.body_en, ar: r.body_ar }, date: r.published_at, visible: r.is_visible, deletedAt: r.deleted_at }),
    toDb: (o) => pickDefined({ module_id: o.moduleId, title_en: o.title?.en, title_ar: o.title?.ar, body_en: o.body?.en, body_ar: o.body?.ar, published_at: o.date, is_visible: o.visible, deleted_at: o.deletedAt }),
  },
};

function fileUrl(storagePath) {
  if (!storagePath || !isBackendConfigured()) return "";
  return `${SUPABASE_URL}/storage/v1/object/public/lesson-files/${String(storagePath).split("/").map(encodeURIComponent).join("/")}`;
}

// ---------- cache ----------

function seedCache() {
  const cp = (rows) => rows.map((r) => ({ ...r }));
  return {
    semesters: cp(DB.semesters),
    modules: cp(DB.modules),
    chapters: cp(DB.chapters),
    lessons: cp(DB.lessons),
    files: cp(DB.files),
    links: cp(DB.links),
    lessonTypes: cp(DB.lessonTypes),
    announcements: cp(DB.announcements),
    site: JSON.parse(JSON.stringify(DB.site)),
    settings: { ...DB.settings },
  };
}

// Pre-seeded synchronously so getSite()/getSettings() (used by i18n at
// import time) never throw, even before initStore() runs.
let cache = seedCache();

async function loadFromBackend() {
  const get = async (table, orderBy = "sort_order") => {
    let q = supabase.from(table).select("*");
    if (orderBy) q = q.order(orderBy, { ascending: true });
    const { data, error } = await q;
    if (error) throw new Error(`[store] loading ${table}: ${error.message}`);
    return data;
  };
  const [semesters, modules, chapters, lessons, files, links, lessonTypes, announcements, settingsRows] = await Promise.all([
    get("semesters"), get("modules"), get("chapters"), get("lessons"),
    get("files"), get("links"), get("lesson_types"),
    get("announcements", null), // no sort_order column — getAnnouncements() sorts by date in JS
    get("site_settings", null),
  ]);
  const s = settingsRows[0] || {};
  return {
    semesters: semesters.map(TABLES.semesters.toApp),
    modules: modules.map(TABLES.modules.toApp),
    chapters: chapters.map(TABLES.chapters.toApp),
    lessons: lessons.map(TABLES.lessons.toApp),
    files: files.map(TABLES.files.toApp),
    links: links.map(TABLES.links.toApp),
    lessonTypes: lessonTypes.map(TABLES.lessonTypes.toApp),
    announcements: announcements.map(TABLES.announcements.toApp),
    site: {
      name: s.site_name ?? "Study Library",
      tagline: { en: s.tagline_en ?? "", ar: s.tagline_ar ?? "" },
      about: { en: s.about_en ?? "", ar: s.about_ar ?? "" },
      contact: s.contact ?? "",
    },
    settings: { defaultLang: s.default_lang ?? "en" },
  };
}

// Called once by app.js at boot. Replaces the seed cache with live data.
export async function initStore() {
  if (!isBackendConfigured()) return;
  cache = await loadFromBackend();
}

// Re-read everything (after import / purge / clear-all).
export async function reloadStore() {
  await initStore();
}

// ---------- generic write plumbing ----------

async function dbInsert(table, values) {
  await requireBackend();
  const T = TABLES[table];
  const { data, error } = await supabase.from(T.db).insert(T.toDb(values)).select().single();
  if (error) throw new Error(error.message);
  const row = T.toApp(data);
  cache[T.cache].push(row);
  return row;
}

async function dbUpdate(table, id, patch) {
  await requireBackend();
  const T = TABLES[table];
  const { data, error } = await supabase.from(T.db).update(T.toDb(patch)).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  const row = T.toApp(data);
  const i = cache[T.cache].findIndex((r) => r.id === id);
  if (i >= 0) cache[T.cache][i] = { ...cache[T.cache][i], ...row };
  return row;
}

async function dbSoftDelete(table, id) {
  return dbUpdate(table, id, { deletedAt: new Date().toISOString() });
}

async function dbHardDelete(table, id) {
  await requireBackend();
  const T = TABLES[table];
  const { error } = await supabase.from(T.db).delete().eq("id", id);
  if (error) throw new Error(error.message);
  cache[T.cache] = cache[T.cache].filter((r) => r.id !== id);
}

// Slug uniqueness, checked against the cache (which mirrors the DB).
// If "intro" is taken in this scope → "intro-2", "intro-3", …
function uniqueSlug(table, base, scope) {
  const T = TABLES[table];
  const inScope = (r) => !scope || Object.entries(scope).every(([k, v]) => r[k] === v);
  const taken = new Set(cache[T.cache].filter(inScope).map((r) => r.slug));
  let slug = base, i = 2;
  while (taken.has(slug)) slug = `${base}-${i++}`;
  return slug;
}

function nextOrder(table, scope) {
  const T = TABLES[table];
  const rows = cache[T.cache].filter((r) =>
    !scope || Object.entries(scope).every(([k, v]) => r[k] === v));
  return rows.reduce((m, r) => Math.max(m, r.order ?? 0), 0) + 1;
}

// ============================================================
// READS — same names, same parameters, same return shapes as
// before. Synchronous, served from the cache.
// ============================================================

const byId = (rows) => Object.fromEntries(rows.map((r) => [r.id, r]));
const visible = (rows) => rows.filter((r) => r.visible !== false && !r.deletedAt);
const byOrder = (rows) => [...rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

export function getSite() {
  return cache.site;
}

export function getSettings() {
  return cache.settings;
}

export function getLessonTypes() {
  return byOrder(visible(cache.lessonTypes));
}

// Every type including hidden ones — for the Settings manager.
export function getAllLessonTypes() {
  return byOrder(cache.lessonTypes.filter((r) => !r.deletedAt));
}

export function getSemesters() {
  return byOrder(visible(cache.semesters));
}

// Every semester including hidden ones — for the Settings manager.
export function getAllSemesters() {
  return byOrder(cache.semesters.filter((r) => !r.deletedAt));
}

export function getSemester(slug) {
  return getSemesters().find((s) => s.slug === slug) || null;
}

export function getModules(semesterId) {
  return byOrder(visible(cache.modules).filter((m) => m.semesterId === semesterId));
}

// Find a module by semester slug + module slug (for shareable URLs).
export function getModule(semesterSlug, moduleSlug) {
  const sem = getSemester(semesterSlug);
  if (!sem) return null;
  return getModules(sem.id).find((m) => m.slug === moduleSlug) || null;
}

export function getChapters(moduleId) {
  return byOrder(visible(cache.chapters).filter((c) => c.moduleId === moduleId));
}

export function getLessons(moduleId) {
  return byOrder(visible(cache.lessons).filter((l) => l.moduleId === moduleId));
}

// Full lesson lookup from a shareable URL: #/s/:sem/:mod/:lesson
export function getLesson(semesterSlug, moduleSlug, lessonSlug) {
  const mod = getModule(semesterSlug, moduleSlug);
  if (!mod) return null;
  const lesson = getLessons(mod.id).find((l) => l.slug === lessonSlug) || null;
  if (!lesson) return null;
  return { lesson, module: mod, semester: getSemester(semesterSlug) };
}

export function getFile(fileId) {
  return cache.files.find((f) => f.id === fileId) || null;
}

export function getLessonFiles(lessonId) {
  return cache.files.filter((f) => f.lessonId === lessonId);
}

export function getAnnouncementFiles(announcementId) {
  return cache.files.filter((f) => f.announcementId === announcementId);
}

export function getLessonLinks(lessonId) {
  return cache.links.filter((l) => l.lessonId === lessonId);
}

export function getAnnouncementLinks(announcementId) {
  return cache.links.filter((l) => l.announcementId === announcementId);
}

export function getAnnouncements() {
  // Global announcements only (module_id null) — module ones live on their module page.
  return visible(cache.announcements).filter((a) => !a.moduleId).sort((a, b) => b.date.localeCompare(a.date));
}

export function getModuleAnnouncements(moduleId) {
  return visible(cache.announcements).filter((a) => a.moduleId === moduleId).sort((a, b) => b.date.localeCompare(a.date));
}

// The N most recently added lessons, with their module + semester attached
// (so cards can say where each lesson lives).
export function getRecentLessons(n = 5) {
  const mods = byId(cache.modules);
  const sems = byId(cache.semesters);
  return visible(cache.lessons)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, n)
    .map((l) => ({ ...l, module: mods[l.moduleId], semester: sems[mods[l.moduleId]?.semesterId] }));
}

// "New" tag: added in the last 7 days.
export function isNew(isoDate) {
  return Date.now() - new Date(isoDate).getTime() < 7 * 864e5;
}

// Previous / next lesson inside the same module, in display order.
export function getAdjacentLessons(lesson) {
  const list = getLessons(lesson.moduleId);
  const i = list.findIndex((l) => l.id === lesson.id);
  return {
    prev: i > 0 ? list[i - 1] : null,
    next: i >= 0 && i < list.length - 1 ? list[i + 1] : null,
  };
}

// Search lesson + module titles and descriptions. Returns grouped results.
export function searchLessons(q) {
  const needle = q.trim().toLowerCase();
  if (!needle) return { lessons: [], modules: [] };
  const mods = byId(cache.modules);
  const sems = byId(cache.semesters);
  const hit = (s) => (s || "").toLowerCase().includes(needle);

  const lessons = visible(cache.lessons)
    .filter((l) => hit(l.title) || hit(l.description))
    .map((l) => ({ ...l, module: mods[l.moduleId], semester: sems[mods[l.moduleId]?.semesterId] }));

  const modules = getSemesters().flatMap((s) =>
    getModules(s.id)
      .filter((m) => hit(m.title) || hit(m.description) || hit(m.teacher))
      .map((m) => ({ ...m, semester: s }))
  );

  return { lessons, modules };
}

// Latest activity in a module, for the "updated Xd ago" line on cards.
export function getModuleUpdatedAt(moduleId) {
  const lessons = getLessons(moduleId);
  if (!lessons.length) return null;
  return lessons.map((l) => l.createdAt).sort().reverse()[0];
}

// ============================================================
// WRITES — async. Every one needs the Supabase backend; without
// it they throw a loud, readable error (never silent).
// Soft delete = hidden + restorable from Trash. hard = gone forever.
// ============================================================

// ----- semesters -----
export async function createSemester({ title, slug, yearLabel, color }) {
  const finalSlug = uniqueSlug("semesters", slugify(slug || title), null);
  return dbInsert("semesters", {
    title: title || "Semester", slug: finalSlug,
    yearLabel: yearLabel || "", color: color || "#FFC800",
    order: nextOrder("semesters"), visible: true,
  });
}
export async function updateSemester(id, patch) {
  return dbUpdate("semesters", id, patch);
}
export async function deleteSemester(id, hard = false) {
  return hard ? dbHardDelete("semesters", id) : dbSoftDelete("semesters", id);
}

// ----- modules -----
export async function createModule(semesterId, { title, slug, code, teacher, description, credits, color }) {
  const finalSlug = uniqueSlug("modules", slugify(slug || title), { semesterId });
  return dbInsert("modules", {
    semesterId, title: title || "Module", slug: finalSlug,
    code: code || "", teacher: teacher || "", description: description || "",
    credits: credits || "", color: color || "#FFC800",
    order: nextOrder("modules", { semesterId }), visible: true,
  });
}
export async function updateModule(id, patch) {
  return dbUpdate("modules", id, patch);
}
export async function deleteModule(id, hard = false) {
  return hard ? dbHardDelete("modules", id) : dbSoftDelete("modules", id);
}

// ----- chapters -----
export async function createChapter(moduleId, { title }) {
  return dbInsert("chapters", {
    moduleId, title: title || "Chapter",
    order: nextOrder("chapters", { moduleId }), visible: true,
  });
}
export async function updateChapter(id, patch) {
  return dbUpdate("chapters", id, patch);
}
export async function deleteChapter(id, hard = false) {
  if (hard) {
    // Ungroup the chapter's lessons first so nothing is orphaned.
    await requireBackend();
    const affected = cache.lessons.filter((l) => l.chapterId === id);
    if (affected.length) {
      const { error } = await supabase.from("lessons").update({ chapter_id: null }).eq("chapter_id", id);
      if (error) throw new Error(error.message);
      affected.forEach((l) => { l.chapterId = null; });
    }
    return dbHardDelete("chapters", id);
  }
  return dbSoftDelete("chapters", id);
}

// ----- lessons -----
export async function createLesson(moduleId, { title, slug, type, chapterId, description, bodyKind, bodyMarkdown, visible }) {
  const finalSlug = uniqueSlug("lessons", slugify(slug || title), { moduleId });
  return dbInsert("lessons", {
    moduleId, title: title || "Lesson", slug: finalSlug,
    type: type || "lecture-notes", chapterId: chapterId || null,
    description: description || "", bodyKind: bodyKind || "pdf",
    bodyMarkdown: bodyMarkdown || "",
    order: nextOrder("lessons", { moduleId }), visible: visible !== false,
  });
}
export async function updateLesson(id, patch) {
  return dbUpdate("lessons", id, patch);
}
export async function deleteLesson(id, hard = false) {
  return hard ? dbHardDelete("lessons", id) : dbSoftDelete("lessons", id);
}

// ----- links -----
function createLinkTo(owner, { title, url }) {
  return dbInsert("links", {
    ...owner, title: title || url || "Link", url: url || "",
    order: nextOrder("links", owner),
  });
}
export async function createLink(lessonId, { title, url }) {
  return createLinkTo({ lessonId }, { title, url });
}
export async function createAnnouncementLink(announcementId, { title, url }) {
  return createLinkTo({ announcementId }, { title, url });
}
export async function updateLink(id, patch) {
  return dbUpdate("links", id, patch);
}
export async function deleteLink(id) {
  return dbHardDelete("links", id); // links are tiny; no trash needed
}

// ----- lesson types -----
export async function createLessonType({ slug, labelEn, labelAr }) {
  const finalSlug = uniqueSlug("lessonTypes", slugify(slug || labelEn), null);
  return dbInsert("lessonTypes", {
    slug: finalSlug,
    label: { en: labelEn || finalSlug, ar: labelAr || "" },
    order: nextOrder("lessonTypes"), visible: true,
  });
}
export async function updateLessonType(id, patch) {
  return dbUpdate("lessonTypes", id, patch);
}
export async function deleteLessonType(id, hard = false) {
  return hard ? dbHardDelete("lessonTypes", id) : dbSoftDelete("lessonTypes", id);
}

// ----- announcements -----
export async function createAnnouncement({ titleEn, titleAr, bodyEn, bodyAr, moduleId }) {
  return dbInsert("announcements", {
    moduleId: moduleId || null,
    title: { en: titleEn || "", ar: titleAr || "" },
    body: { en: bodyEn || "", ar: bodyAr || "" },
    date: new Date().toISOString(), visible: true,
  });
}
export async function updateAnnouncement(id, patch) {
  return dbUpdate("announcements", id, patch);
}
export async function deleteAnnouncement(id, hard = false) {
  return hard ? dbHardDelete("announcements", id) : dbSoftDelete("announcements", id);
}

// ----- ordering: give the table rows the order of orderedIds -----
const REORDERABLE = new Set(["semesters", "modules", "chapters", "lessons", "links", "lessonTypes", "announcements", "files"]);
export async function reorder(table, orderedIds) {
  if (!REORDERABLE.has(table)) throw new Error(`Cannot reorder unknown table: ${table}`);
  await requireBackend();
  const T = TABLES[table];
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase.from(T.db).update({ sort_order: i + 1 }).eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
  const pos = new Map(orderedIds.map((id, i) => [id, i + 1]));
  cache[T.cache].forEach((r) => { if (pos.has(r.id)) r.order = pos.get(r.id); });
}

// ----- files: upload with progress, then register the row -----

const ACCEPT_KINDS = {
  pdf: "pdf",
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image",
  doc: "docx", docx: "docx",
  ppt: "pptx", pptx: "pptx",
  xls: "xlsx", xlsx: "xlsx",
  zip: "zip",
};
function detectKind(name) {
  const ext = String(name).split(".").pop().toLowerCase();
  return ACCEPT_KINDS[ext] || "other";
}
function sanitizeName(name) {
  return String(name).replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
}

// Uploads straight to the `lesson-files` bucket with a real progress
// callback, then inserts the files row. Rejects LOUDLY on: no backend,
// file over MAX_FILE_MB, network failure, or a rejected insert.
// Shared uploader: owner is { lessonId } or { announcementId }.
// Announcement files live under announcements/<id>/… in the bucket so the
// two never collide; lesson files keep their existing <lessonId>/… paths.
function uploadFileTo(owner, file, onProgress) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        await requireBackend();
      } catch (e) { reject(e); return; }
      const maxBytes = MAX_FILE_MB * 1024 * 1024;
      if (file.size > maxBytes) {
        reject(new Error(await tt("err_file_too_big", { name: file.name, n: MAX_FILE_MB })));
        return;
      }
      const ownerId = owner.lessonId || owner.announcementId;
      const prefix = owner.lessonId ? ownerId : `announcements/${ownerId}`;
      const storagePath = `${prefix}/${Date.now()}-${sanitizeName(file.name)}`;
      const url = `${SUPABASE_URL}/storage/v1/object/lesson-files/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
      // After the admin lockdown, storage writes require an authenticated
      // session. The raw XHR must carry the user's access token — the anon
      // key alone is rejected by the storage RLS policies (HTTP 400).
      let authToken = SUPABASE_ANON_KEY;
      try {
        const session = await getSession();
        if (session && session.access_token) authToken = session.access_token;
      } catch { /* fall back to the anon key */ }
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
      xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      }
      xhr.onload = async () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(`${await tt("err_upload_failed", { name: file.name })} (${xhr.status})`));
          return;
        }
        try {
          const row = await dbInsert("files", {
            ...owner, name: file.name, storagePath,
            kind: detectKind(file.name), sizeBytes: file.size,
            order: nextOrder("files", owner),
          });
          if (onProgress) onProgress(1);
          resolve(row);
        } catch (err) { reject(err); }
      };
      xhr.onerror = async () => reject(new Error(await tt("err_upload_failed", { name: file.name })));
      xhr.send(file);
    })();
  });
}

export function uploadLessonFile(lessonId, file, onProgress) {
  return uploadFileTo({ lessonId }, file, onProgress);
}

export function uploadAnnouncementFile(announcementId, file, onProgress) {
  return uploadFileTo({ announcementId }, file, onProgress);
}

export async function deleteFile(id) {
  await requireBackend();
  const row = cache.files.find((f) => f.id === id);
  if (row && row.storagePath) {
    const { error } = await supabase.storage.from("lesson-files").remove([row.storagePath]);
    if (error) console.warn("[store] storage remove failed (row still deleted):", error.message);
  }
  await dbHardDelete("files", id);
}

// ----- trash -----

export function getTrash() {
  const trashed = (rows) => rows.filter((r) => r.deletedAt);
  return {
    semesters: trashed(cache.semesters),
    modules: trashed(cache.modules),
    chapters: trashed(cache.chapters),
    lessons: trashed(cache.lessons),
    lessonTypes: trashed(cache.lessonTypes),
    announcements: trashed(cache.announcements),
  };
}

export async function restoreFromTrash(table, id) {
  return dbUpdate(table, id, { deletedAt: null });
}

// Hard delete + full cache reload (mirrors the DB cascades exactly).
export async function purgeTrashItem(table, id) {
  await dbHardDelete(table, id);
  await reloadStore();
}

// ----- site settings -----

export async function updateSiteSettings(patch) {
  await requireBackend();
  const dbPatch = pickDefined({
    site_name: patch.name,
    tagline_en: patch.tagline?.en,
    tagline_ar: patch.tagline?.ar,
    about_en: patch.about?.en,
    about_ar: patch.about?.ar,
    contact: patch.contact,
    default_lang: patch.defaultLang,
  });
  const { data, error } = await supabase.from("site_settings").update(dbPatch).eq("id", 1).select().single();
  if (error) throw new Error(error.message);
  cache.site = {
    name: data.site_name,
    tagline: { en: data.tagline_en, ar: data.tagline_ar },
    about: { en: data.about_en, ar: data.about_ar },
    contact: data.contact,
  };
  cache.settings = { defaultLang: data.default_lang };
  return cache.site;
}

// ----- backup -----

// JSON snapshot of every table (soft-deleted rows included, so the
// trash survives a backup). NOTE: file *binaries* are not included —
// only their metadata. Back up the `lesson-files` storage bucket
// separately if the files matter.
export function exportBackup() {
  return {
    app: "study-library",
    version: 1,
    exported_at: new Date().toISOString(),
    tables: {
      semesters: cache.semesters,
      modules: cache.modules,
      chapters: cache.chapters,
      lessons: cache.lessons,
      files: cache.files,
      links: cache.links,
      lessonTypes: cache.lessonTypes,
      announcements: cache.announcements,
      site: cache.site,
      settings: cache.settings,
    },
  };
}

export async function importBackup(data) {
  await requireBackend();
  if (!data || data.app !== "study-library" || !data.tables) {
    throw new Error(await tt("err_bad_backup"));
  }
  const tb = data.tables;
  const upsertAll = async (table, rows) => {
    const T = TABLES[table];
    for (const row of rows || []) {
      // created_at is preserved so "New" tags and recent ordering
      // survive a restore (toDb intentionally skips it on writes).
      const dbRow = { id: row.id, ...T.toDb(row) };
      if (row.createdAt) dbRow.created_at = row.createdAt;
      const { error } = await supabase.from(T.db).upsert(dbRow, { onConflict: "id" });
      if (error) throw new Error(error.message);
    }
  };
  // dependency order: parents before children
  await upsertAll("semesters", tb.semesters);
  await upsertAll("lessonTypes", tb.lessonTypes);
  await upsertAll("modules", tb.modules);
  await upsertAll("chapters", tb.chapters);
  await upsertAll("lessons", tb.lessons);
  await upsertAll("files", tb.files);
  await upsertAll("links", tb.links);
  await upsertAll("announcements", tb.announcements);
  if (tb.site || tb.settings) {
    await updateSiteSettings({ ...(tb.site || {}), defaultLang: tb.settings?.defaultLang });
  }
  await reloadStore();
}

// ----- danger zone -----

// Deletes every module, lesson, chapter and announcement (and their
// files/links via cascade), plus the files' binaries in storage.
// Keeps semesters, lesson types and settings.
export async function clearAllContent() {
  await requireBackend();
  const paths = cache.files.map((f) => f.storagePath).filter(Boolean);
  if (paths.length) {
    const { error } = await supabase.storage.from("lesson-files").remove(paths);
    if (error) console.warn("[store] storage cleanup:", error.message);
  }
  const NIL = "00000000-0000-0000-0000-000000000000";
  for (const t of ["links", "files", "lessons", "chapters", "modules", "announcements"]) {
    const { error } = await supabase.from(t).delete().neq("id", NIL);
    if (error) throw new Error(error.message);
  }
  await reloadStore();
}
