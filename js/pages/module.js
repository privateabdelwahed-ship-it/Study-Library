// Module page: lessons as ruled-paper rows, grouped under chapter
// headings when the module has chapters, with a plain-text type filter.
// Bookmark / done toggles save to the device only.
// In edit mode: add lesson/chapter, per-row edit/delete/hide/move,
// chapter rename/delete, and a Manage-types link.
import { t, getLang } from "../i18n/i18n.js";
import {
  getSemester, getModule, getChapters, getLessons, getLessonTypes, isNew,
  createLesson, updateLesson, deleteLesson, reorder,
  createChapter, updateChapter, deleteChapter, uploadLessonFile,
  getModuleAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  deleteFile, deleteLink,
} from "../data/store.js";
import { toggleInList, inList } from "../lib/prefs.js";
import { esc, timeAgo, formatDate } from "../lib/format.js";
import { icons } from "../lib/icons.js";
import { isEditMode, bindInlineRename, notifyChange } from "../lib/editmode.js";
import { commit, toolToggle, confirmDelete, addBtn, editTools, toolEdit, toolDelete } from "../lib/edit-ui.js";
import { openModal } from "../components/modal.js";
import { toast } from "../components/toast.js";
import {
  announcementFields, announcementFilesHtml, announcementLinksHtml,
  uploadFilesToAnnouncement, addLinkToAnnouncement,
} from "../lib/announce-ui.js";
import { notFound } from "./not-found.js";

// Same file types as the lesson page's Files panel.
const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.zip";

function lessonRow(lesson, typeLabel, editing) {
  const bookmarked = inList("bookmarks", lesson.id);
  const done = inList("done", lesson.id);
  const newTag = isNew(lesson.createdAt) ? `<span class="tag-new">${t("new_tag")}</span>` : "";
  const editBtns = editing ? `
      <div class="row-edit" data-kind="lesson">
        <button class="icon-btn sm" data-edit="up" data-id="${lesson.id}" aria-label="${t("move_up")}" title="${t("move_up")}">${icons.arrowUp()}</button>
        <button class="icon-btn sm" data-edit="down" data-id="${lesson.id}" aria-label="${t("move_down")}" title="${t("move_down")}">${icons.arrowDown()}</button>
        <button class="icon-btn sm" data-edit="edit" data-id="${lesson.id}" aria-label="${t("edit")}" title="${t("edit")}">${icons.pencil()}</button>
        <button class="icon-btn sm" data-edit="toggle" data-id="${lesson.id}" aria-label="${t(lesson.visible ? "hide" : "show")}" title="${t(lesson.visible ? "hide" : "show")}">${lesson.visible ? icons.eyeOff() : icons.eye()}</button>
        <button class="icon-btn sm danger" data-edit="delete" data-id="${lesson.id}" aria-label="${t("delete")}" title="${t("delete")}">${icons.trash()}</button>
      </div>` : "";
  return `
    <li class="ruled-row" data-type="${esc(lesson.type)}">
      <div class="row-main">
        <a class="row-title" href="#/s/${lesson._sem}/${lesson._mod}/${lesson.slug}">${esc(lesson.title)}</a>
        <div class="row-sub">
          <span class="type-label">${esc(typeLabel)}</span>
          <span>${timeAgo(lesson.createdAt)}</span>
          ${newTag}
        </div>
      </div>
      ${editBtns}
      <div class="row-actions">
        <button class="icon-btn is-bookmark" data-act="bookmark" data-id="${lesson.id}"
                aria-pressed="${bookmarked}" aria-label="${t(bookmarked ? "bookmarked" : "bookmark")}">${icons.bookmark()}</button>
        <button class="icon-btn is-done" data-act="done" data-id="${lesson.id}"
                aria-pressed="${done}" aria-label="${t(done ? "done_state" : "mark_done")}">${icons.check()}</button>
      </div>
    </li>`;
}

function lessonFields(mod, chapters, lesson = {}) {
  const lang = getLang();
  return [
    { key: "title", label: t("f_title"), type: "text", value: lesson.title || "", required: true },
    { key: "type", label: t("f_type"), type: "select", value: lesson.type || "lecture-notes",
      options: getLessonTypes().map((ty) => ({ value: ty.slug, label: ty.label[lang] || ty.label.en })) },
    { key: "chapterId", label: t("f_chapter"), type: "select", value: lesson.chapterId || "",
      options: [{ value: "", label: t("no_chapter") }, ...chapters.map((c) => ({ value: c.id, label: c.title }))] },
    { key: "bodyKind", label: t("f_body_kind"), type: "select", value: lesson.bodyKind || "pdf",
      options: [{ value: "pdf", label: t("f_kind_pdf") }, { value: "written", label: t("f_kind_written") }] },
    { key: "files", label: t("f_files"), type: "file", accept: ACCEPT,
      hint: t("upload_hint", { n: 50 }) },
    { key: "description", label: t("f_description"), type: "textarea", value: lesson.description || "" },
    { key: "visible", label: t("f_visible"), type: "checkbox", value: lesson.visible !== false },
  ];
}

// Upload files chosen in the lesson modal, with a progress toast per file.
// Loud failures, never silent.
async function uploadFilesToLesson(lessonId, files) {
  const list = (files || []).filter((f) => f && f.size > 0);
  for (let i = 0; i < list.length; i++) {
    try {
      toast(t("uploading_file", { n: i + 1, total: list.length }));
      await uploadLessonFile(lessonId, list[i]);
    } catch (err) {
      toast(err && err.message ? err.message : String(err), "error");
    }
  }
  if (list.length) notifyChange();
}

// Announcements scoped to this module: files + links supported,
// same building blocks as the home notice board.
function moduleAnnouncementsHtml(mod, editing, lang) {
  const items = getModuleAnnouncements(mod.id);
  if (!items.length && !editing) return "";
  return `
      <section aria-label="${t("mod_ann_hl")} ${t("mod_ann_rest")}" style="margin-block-end: 2.5rem;">
        <h2 class="sec-title"><span class="hl">${t("mod_ann_hl")}</span> ${t("mod_ann_rest")}</h2>
        ${editing ? `<p style="margin-block-end: 1rem;">${addBtn(t("add_announcement"), "add-mod-announcement")}</p>` : ""}
        <div class="announce">
          ${items.map((a) => `
            <article class="announce-item card-wrap">
              ${editing ? editTools(a.id, "mod-announcement", [toolEdit(), toolDelete()]) : ""}
              <span class="announce-date">${formatDate(a.date)}</span>
              <h3>${esc(a.title[lang] || a.title.en)}</h3>
              <p>${esc(a.body[lang] || a.body.en)}</p>
              ${announcementFilesHtml(a, editing)}
              ${announcementLinksHtml(a, editing)}
            </article>`).join("")}
        </div>
      </section>`;
}

export function render({ semSlug, modSlug }) {
  const sem = getSemester(semSlug);
  const mod = getModule(semSlug, modSlug);
  if (!sem || !mod) return notFound();
  const lang = getLang();
  const editing = isEditMode();

  const types = getLessonTypes();
  const typeName = Object.fromEntries(types.map((ty) => [ty.slug, ty.label[lang] || ty.label.en]));
  const chapters = getChapters(mod.id);
  const lessons = getLessons(mod.id).map((l) => ({ ...l, _sem: sem.slug, _mod: mod.slug }));

  // Meta line: code · teacher · credits, only the parts that exist.
  const metaBits = [mod.code, mod.teacher || t("teacher_not_set"), mod.credits]
    .filter(Boolean)
    .map(esc)
    .join(" · ");

  const filterButtons = [
    `<button data-filter="all" aria-pressed="true">${t("filter_all")}</button>`,
    ...types.map((ty) => `<button data-filter="${ty.slug}" aria-pressed="false">${esc(ty.label[lang] || ty.label.en)}</button>`),
  ].join("");

  let listHtml;
  if (!lessons.length) {
    listHtml = `
      <div class="empty">
        <span class="empty-mark" aria-hidden="true">§</span>
        <p>${t("nothing_here")}</p>
      </div>`;
  } else if (chapters.length) {
    const byChapter = new Map(chapters.map((c) => [c.id, []]));
    const loose = [];
    for (const l of lessons) {
      if (l.chapterId && byChapter.has(l.chapterId)) byChapter.get(l.chapterId).push(l);
      else loose.push(l);
    }
    listHtml = [...chapters.map((c) => ({ id: c.id, title: c.title, lessons: byChapter.get(c.id) })), ...(loose.length ? [{ id: null, title: null, lessons: loose }] : [])]
      .filter((g) => g.lessons.length)
      .map(
        (g) => `
        ${g.title ? `<h2 class="chapter-head">${
          editing ? `<span data-rename="chapter" data-id="${g.id}">${esc(g.title)}</span>
          <button class="icon-btn sm danger ch-del" data-kind="chapter" data-edit="delete" data-id="${g.id}"
                  aria-label="${t("delete")}" title="${t("delete")}">${icons.trash()}</button>` : esc(g.title)
        }</h2>` : ""}
        <ul class="ruled-list">${g.lessons.map((l) => lessonRow(l, typeName[l.type] || l.type, editing)).join("")}</ul>`
      )
      .join("");
  } else {
    listHtml = `<ul class="ruled-list">${lessons.map((l) => lessonRow(l, typeName[l.type] || l.type, editing)).join("")}</ul>`;
  }

  return `
    <div class="container page">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="#/">${t("nav_home")}</a>
        <span class="sep" aria-hidden="true">/</span>
        <a href="#/s/${sem.slug}">${esc(sem.title)}</a>
        <span class="sep" aria-hidden="true">/</span>
        <span aria-current="page">${esc(mod.title)}</span>
      </nav>
      <header class="page-head">
        <p class="overline">${esc(sem.title)} · ${t("semester_word")}</p>
        <h1${editing ? ' data-rename="module" data-id="' + esc(mod.id) + '"' : ""}>${esc(mod.title)}</h1>
        <p class="lede">${metaBits}</p>
        ${mod.description ? `<p class="lede" style="white-space:pre-line;">${esc(mod.description)}</p>` : ""}
        <div class="rule-double" aria-hidden="true"></div>
      </header>
      ${moduleAnnouncementsHtml(mod, editing, lang)}
      ${editing ? `<p class="edit-cluster">${addBtn(t("add_lesson"), "add-lesson")} ${addBtn(t("add_chapter"), "add-chapter")}</p>` : ""}
      ${lessons.length ? `<div class="filter-row" role="group" aria-label="${t("type_label")}">${filterButtons}</div>` : ""}
      ${editing ? `<p class="manage-link"><a href="#/settings">${t("manage_types")}</a></p>` : ""}
      <div id="lesson-list">${listHtml}</div>
      <p class="device-note" style="margin-block-start: 1.5rem;">${t("saved_device")}</p>
    </div>`;
}

// Filter buttons + bookmark/done toggles, all client-side.
export function mount(el, { semSlug, modSlug }) {
  const list = el.querySelector("#lesson-list");
  const mod = getModule(semSlug, modSlug);

  el.querySelectorAll(".filter-row button").forEach((btn) => {
    btn.addEventListener("click", () => {
      el.querySelectorAll(".filter-row button").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      const f = btn.dataset.filter;
      list.querySelectorAll(".ruled-row").forEach((row) => {
        row.style.display = f === "all" || row.dataset.type === f ? "" : "none";
      });
      // Hide chapter headings left with no visible rows.
      list.querySelectorAll(".chapter-head").forEach((h) => {
        let next = h.nextElementSibling;
        let anyVisible = false;
        while (next && !next.classList.contains("chapter-head")) {
          if (next.classList.contains("ruled-list")) {
            anyVisible = [...next.children].some((r) => r.style.display !== "none");
          }
          next = next.nextElementSibling;
        }
        h.style.display = anyVisible ? "" : "none";
      });
    });
  });

  list.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const { act, id } = btn.dataset;
    const on = toggleInList(act === "bookmark" ? "bookmarks" : "done", id);
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", t(act === "bookmark" ? (on ? "bookmarked" : "bookmark") : on ? "done_state" : "mark_done"));
  });

  if (!isEditMode() || !mod) return;

  bindInlineRename(el, async (table, id, v) => {
    if (table === "module") await commit(() => updateModule(id, { title: v }));
    else if (table === "chapter") await commit(() => updateChapter(id, { title: v }));
  });

  el.addEventListener("click", async (e) => {
    // Announcement file/link buttons live outside [data-edit].
    const annFileDel = e.target.closest("[data-annfile-del]");
    if (annFileDel) {
      if (await confirmDelete()) await commit(() => deleteFile(annFileDel.dataset.annfileDel));
      return;
    }
    const annLinkAdd = e.target.closest("[data-annlink-add]");
    if (annLinkAdd) {
      await addLinkToAnnouncement(annLinkAdd.dataset.annlinkAdd);
      return;
    }
    const annLinkDel = e.target.closest("[data-annlink-del]");
    if (annLinkDel) {
      if (await confirmDelete()) await commit(() => deleteLink(annLinkDel.dataset.annlinkDel));
      return;
    }

    const btn = e.target.closest("[data-edit]");
    if (!btn) return;
    const kind = btn.closest("[data-kind]")?.dataset.kind || btn.dataset.kind;
    const { edit: act, id } = btn.dataset;

    if (act === "add-mod-announcement") {
      const v = await openModal({ title: t("add_announcement"), fields: announcementFields(), submitLabel: t("add") });
      if (v && v.titleEn.trim()) {
        const a = await commit(() => createAnnouncement({
          titleEn: v.titleEn.trim(), titleAr: v.titleAr.trim(),
          bodyEn: v.bodyEn.trim(), bodyAr: v.bodyAr.trim(), moduleId: mod.id,
        }));
        if (a) await uploadFilesToAnnouncement(a.id, v.files);
      }
      return;
    }
    if (kind === "mod-announcement") {
      const a = getModuleAnnouncements(mod.id).find((x) => x.id === id);
      if (!a) return;
      if (act === "edit") {
        const v = await openModal({ title: t("edit_announcement"), fields: announcementFields(a) });
        if (v) {
          await commit(() => updateAnnouncement(id, {
            title: { en: v.titleEn.trim(), ar: v.titleAr.trim() },
            body: { en: v.bodyEn.trim(), ar: v.bodyAr.trim() },
          }));
          await uploadFilesToAnnouncement(id, v.files);
        }
      } else if (act === "delete") {
        if (await confirmDelete()) await commit(() => deleteAnnouncement(id));
      }
      return;
    }

    if (act === "add-lesson") {
      const chapters = getChapters(mod.id);
      const v = await openModal({ title: t("add_lesson"), fields: lessonFields(mod, chapters), submitLabel: t("add") });
      if (v && v.title.trim()) {
        const files = (v.files || []).filter((f) => f && f.size > 0);
        // When files are attached, the first one decides how the lesson opens
        // (a PDF gets the reader; anything else gets a download card/images view).
        let bodyKind = v.bodyKind;
        if (files.length && bodyKind !== "written") {
          const first = files[0];
          bodyKind = (first.type === "application/pdf" || /\.pdf$/i.test(first.name)) ? "pdf" : "file";
        }
        const lesson = await commit(() => createLesson(mod.id, {
          title: v.title.trim(), type: v.type, chapterId: v.chapterId || null,
          description: v.description.trim(), bodyKind, visible: v.visible,
        }));
        if (lesson) await uploadFilesToLesson(lesson.id, files);
      }
      return;
    }
    if (act === "add-chapter") {
      const v = await openModal({
        title: t("add_chapter"),
        fields: [{ key: "title", label: t("f_title"), type: "text", value: "", required: true }],
        submitLabel: t("add"),
      });
      if (v && v.title.trim()) await commit(() => createChapter(mod.id, { title: v.title.trim() }));
      return;
    }
    if (kind === "chapter" && act === "delete") {
      if (await confirmDelete()) await commit(() => deleteChapter(id));
      return;
    }
    if (kind !== "lesson") return;
    const lesson = getLessons(mod.id).find((l) => l.id === id);
    if (!lesson) return;
    if (act === "edit") {
      const chapters = getChapters(mod.id);
      const v = await openModal({ title: t("edit_lesson"), fields: lessonFields(mod, chapters, lesson) });
      if (v) {
        await commit(() => updateLesson(id, {
          title: v.title.trim(), type: v.type, chapterId: v.chapterId || null,
          description: v.description.trim(), bodyKind: v.bodyKind, visible: v.visible,
        }));
        await uploadFilesToLesson(id, v.files);
      }
    } else if (act === "toggle") {
      await commit(() => updateLesson(id, { visible: !lesson.visible }));
    } else if (act === "delete") {
      if (await confirmDelete()) await commit(() => deleteLesson(id));
    } else if (act === "up" || act === "down") {
      const ids = getLessons(mod.id).map((l) => l.id);
      const i = ids.indexOf(id);
      const j = act === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      await commit(() => reorder("lessons", ids));
    }
  });
}
