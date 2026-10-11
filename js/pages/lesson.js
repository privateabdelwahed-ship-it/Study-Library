// Lesson page: the reader is the dominant element; details, files and
// sibling lessons live in a side panel (below the reader on phones).
// In edit mode: edit details, upload files (progress per file),
// delete files, add/delete links, edit written text.
import { t, getLang } from "../i18n/i18n.js";
import {
  getLesson, getLessonTypes, getLessonFiles, getLessonLinks,
  getLessons, getAdjacentLessons, isNew, getFile, getChapters,
  updateLesson, uploadLessonFile, deleteFile, createLink, deleteLink,
} from "../data/store.js";
import { getPrefs, setPref, toggleInList, inList } from "../lib/prefs.js";
import { esc, timeAgo, formatDate, formatSize } from "../lib/format.js";
import { icons } from "../lib/icons.js";
import { renderMarkdown } from "../lib/markdown.js";
import { createPdfReader } from "../lib/pdf-reader.js";
import { isEditMode, bindInlineRename, notifyChange } from "../lib/editmode.js";
import { commit, confirmDelete } from "../lib/edit-ui.js";
import { openModal } from "../components/modal.js";
import { toast } from "../components/toast.js";
import { MAX_FILE_MB } from "../config.js";
import { notFound } from "./not-found.js";

let reader = null; // the active PDF reader, destroyed on route change

const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.zip";

function typeNameOf(lesson) {
  const lang = getLang();
  const found = getLessonTypes().find((ty) => ty.slug === lesson.type);
  return found ? found.label[lang] || found.label.en : lesson.type;
}

// ---- reader bodies -------------------------------------------------

function pdfBody(file) {
  return `
    <div class="reader-shell" id="reader-shell">
      <div class="pdf-toolbar" role="toolbar" aria-label="PDF reader">
        <div class="tb-group">
          <button class="icon-btn" data-tb="zoom-out" aria-label="${t("zoom_out")}">${icons.zoomOut()}</button>
          <span class="tb-label tb-percent" id="zoom-label">100%</span>
          <button class="icon-btn" data-tb="zoom-in" aria-label="${t("zoom_in")}">${icons.zoomIn()}</button>
          <button class="icon-btn" data-tb="fit" id="fit-btn" aria-pressed="true" aria-label="${t("fit_width")}" title="${t("fit_width")}">${icons.fit()}</button>
        </div>
        <span class="tb-sep" aria-hidden="true"></span>
        <div class="tb-group">
          <span class="tb-label">${t("page")}</span>
          <input class="tb-page" id="page-input" type="number" min="1" value="1" aria-label="${t("page")}">
          <span class="tb-label">${t("of")} <strong id="page-count">–</strong></span>
          <button class="btn" data-tb="go" style="min-height:2.5rem;">${t("go")}</button>
        </div>
        <span class="tb-spacer"></span>
        <div class="tb-group">
          <button class="icon-btn" data-tb="fullscreen" aria-label="${t("fullscreen")}" title="${t("fullscreen")}">${icons.expand()}</button>
          <a class="icon-btn" href="${esc(file.url)}" download="${esc(file.originalName)}"
             aria-label="${t("download")}" title="${t("download")}">${icons.download()}</a>
        </div>
      </div>
      <div id="pdf-mount"></div>
      <div class="reader-status" id="pdf-loading">${t("pdf_loading")}</div>
    </div>`;
}

function writtenBody(lesson) {
  const scale = getPrefs().fontScale || 1;
  return `
    <div class="reading-toolbar">
      <div class="font-controls" role="group" aria-label="Text size">
        <button class="icon-btn" data-font="down" aria-label="${t("font_smaller")}" title="${t("font_smaller")}">
          <span aria-hidden="true" style="font-size:0.8rem;font-weight:700;">A−</span>
        </button>
        <span class="font-sample" aria-hidden="true">A</span>
        <button class="icon-btn" data-font="up" aria-label="${t("font_larger")}" title="${t("font_larger")}">
          <span aria-hidden="true" style="font-size:1.05rem;font-weight:700;">A+</span>
        </button>
      </div>
    </div>
    <article class="article">
      <div class="article-inner" id="article-inner" style="--font-scale: ${scale};">
        ${renderMarkdown(lesson.bodyMarkdown)}
      </div>
    </article>`;
}

function fileCard(file, editing) {
  return `
    <div class="file-card">
      <span class="file-icon" aria-hidden="true">${icons.file()}</span>
      <div class="file-meta">
        <div class="file-name">${esc(file.originalName || file.name)}</div>
        <div class="file-sub">${formatSize(file.sizeBytes)}</div>
      </div>
      <div class="file-actions">
        <a class="btn btn-primary" href="${esc(file.url)}" download="${esc(file.originalName || file.name)}">
          ${icons.download()} ${t("download")}
        </a>
        ${editing ? `<button class="icon-btn danger" data-edit="delete-file" data-id="${file.id}"
          aria-label="${t("delete_file")}" title="${t("delete_file")}">${icons.trash()}</button>` : ""}
      </div>
    </div>`;
}

function imageBody(file) {
  return `
    <figure class="lesson-image">
      <img src="${esc(file.url)}" alt="${esc(file.originalName || file.name)}" loading="lazy">
      <figcaption>${esc(file.originalName || file.name)}</figcaption>
    </figure>`;
}

function readerError(file) {
  const url = file ? file.url : "#";
  const name = file ? file.originalName || file.name : "";
  return `
    <div class="notice is-error reader-error" role="alert">
      <h3>${t("load_fail_title")}</h3>
      <p>${t("load_fail_body")}</p>
      ${file ? `<p><a class="btn" href="${esc(url)}" download="${esc(name)}">${icons.download()} ${t("download")}</a></p>` : ""}
    </div>`;
}

// Last-resort reader: the browser's own built-in PDF viewer, embedded in
// the page. Used when the custom PDF.js engine can't load the file
// (blocked CDN, stalled network, …) — the file stays readable on-site.
function nativePdfFallback(file) {
  const url = file ? file.url : "#";
  const name = file ? file.originalName || file.name : "";
  return `
    <div class="reader-shell">
      <iframe class="native-pdf" src="${esc(url)}" title="${esc(name)}"></iframe>
      <p class="reader-fallback-note"><span>${t("native_pdf_note")}</span>
        <span class="reader-fallback-actions">
          <button class="btn" data-retry-pdfjs>${t("retry_reader")}</button>
          ${file ? `<a class="btn" href="${esc(url)}" download="${esc(name)}">${icons.download()} ${t("download")}</a>` : ""}
        </span>
      </p>
    </div>`;
}

function detailFields(lesson, chapters) {
  const lang = getLang();
  return [
    { key: "title", label: t("f_title"), type: "text", value: lesson.title || "", required: true },
    { key: "type", label: t("f_type"), type: "select", value: lesson.type || "lecture-notes",
      options: getLessonTypes().map((ty) => ({ value: ty.slug, label: ty.label[lang] || ty.label.en })) },
    { key: "chapterId", label: t("f_chapter"), type: "select", value: lesson.chapterId || "",
      options: [{ value: "", label: t("no_chapter") }, ...chapters.map((c) => ({ value: c.id, label: c.title }))] },
    { key: "bodyKind", label: t("f_body_kind"), type: "select", value: lesson.bodyKind || "pdf",
      options: [{ value: "pdf", label: t("f_kind_pdf") }, { value: "written", label: t("f_kind_written") }] },
    { key: "description", label: t("f_description"), type: "textarea", value: lesson.description || "" },
    { key: "visible", label: t("f_visible"), type: "checkbox", value: lesson.visible !== false },
  ];
}

// ---- page ----------------------------------------------------------

export function render({ semSlug, modSlug, lessonSlug }) {
  const found = getLesson(semSlug, modSlug, lessonSlug);
  if (!found) return notFound();
  const { lesson, module, semester } = found;
  const lang = getLang();
  const editing = isEditMode();
  const tn = typeNameOf(lesson);
  const newTag = isNew(lesson.createdAt) ? `<span class="tag-new">${t("new_tag")}</span>` : "";
  const bookmarked = inList("bookmarks", lesson.id);
  const done = inList("done", lesson.id);

  const files = getLessonFiles(lesson.id);
  const links = getLessonLinks(lesson.id);
  const siblings = getLessons(module.id).filter((l) => l.id !== lesson.id);
  const { prev, next } = getAdjacentLessons(lesson);

  // The main reading body depends on the lesson kind.
  let body = "";
  const mainFile = lesson.bodyFileId ? getFile(lesson.bodyFileId) : files[0] || null;
  if (lesson.bodyKind === "pdf" && mainFile) body = pdfBody(mainFile);
  else if (lesson.bodyKind === "written") body = writtenBody(lesson);
  else if (mainFile && (mainFile.kind === "image" || String(mainFile.kind).startsWith("image/"))) body = imageBody(mainFile);
  else if (mainFile) body = fileCard(mainFile, editing);
  else body = `<div class="empty"><p>${t("nothing_here")}</p></div>`;

  // Offer to resume where the student left off.
  const last = getPrefs().lastRead;
  const resume = last && last.lessonSlug === lesson.slug && last.page > 1 && lesson.bodyKind === "pdf"
    ? `<button class="btn" id="resume-btn" style="margin-block-end: 1rem;">${t("resume_page", { n: last.page })}</button>`
    : "";

  const editDetailsBtn = editing
    ? `<button class="btn" data-edit="edit-details">${icons.pencil()} ${t("edit_details")}</button>`
    : "";

  const editTextBtn = editing && lesson.bodyKind === "written"
    ? `<p style="margin-block: 1rem;"><button class="btn" data-edit="edit-text">${icons.pencil()} ${t("edit_text")}</button></p>`
    : "";

  const details = `
    <dl>
      <div class="detail-row"><dt>${t("type_label")}</dt><dd>${esc(tn)}</dd></div>
      <div class="detail-row"><dt>${t("date_label")}</dt><dd>${formatDate(lesson.createdAt)}</dd></div>
      ${module.code ? `<div class="detail-row"><dt>${t("module_code")}</dt><dd>${esc(module.code)}</dd></div>` : ""}
    </dl>
    ${lesson.description ? `<p style="margin-block-start:0.75rem;color:var(--muted);white-space:pre-line;">${esc(lesson.description)}</p>` : ""}`;

  const filesBlock = files.length || editing
    ? `<div class="panel-block"><h2>${t("files_label")}</h2>
       ${editing ? `<p class="upload-hint">${t("upload_hint", { n: MAX_FILE_MB })}</p>
       <p style="margin-block-end: 0.75rem;"><button class="btn" data-edit="upload">${icons.upload()} ${t("upload_files")}</button>
       <input type="file" id="file-input" hidden multiple accept="${ACCEPT}"></p>
       <div class="upload-list" id="upload-list" aria-live="polite"></div>` : ""}
       <div style="display:grid;gap:0.75rem;">${files.map((f) => fileCard(f, editing)).join("")}</div></div>`
    : "";

  const linksBlock = links.length || editing
    ? `<div class="panel-block"><h2>${t("links_label")}</h2>
       ${editing ? `<p style="margin-block-end: 0.75rem;"><button class="btn" data-edit="add-link">${icons.plus()} ${t("add_link")}</button></p>` : ""}
       <ul class="mini-list">${links.map((l) => `
         <li><a href="${esc(l.url)}" target="_blank" rel="noopener">
           <span style="display:inline-flex;align-items:center;gap:0.5rem;">${esc(l.title)} ${icons.external()}</span>
         </a>${editing ? ` <button class="icon-btn sm danger" data-edit="delete-link" data-id="${l.id}"
           aria-label="${t("delete_link")}" title="${t("delete_link")}">${icons.trash()}</button>` : ""}</li>`).join("")}</ul></div>`
    : "";

  const siblingsBlock = siblings.length
    ? `<div class="panel-block"><h2>${t("other_lessons")}</h2>
       <ul class="mini-list">${siblings.map((l) => `
         <li><a href="#/s/${semester.slug}/${module.slug}/${l.slug}">${esc(l.title)}</a></li>`).join("")}</ul></div>`
    : "";

  const prevNext = `
    <nav class="prev-next" aria-label="Lesson">
      ${prev ? `<a href="#/s/${semester.slug}/${module.slug}/${prev.slug}">
          <span class="flip-rtl" aria-hidden="true">${icons.arrowLeft()}</span>
          <span><span class="pn-label">${t("prev")}</span>${esc(prev.title)}</span></a>` : "<span></span>"}
      ${next ? `<a class="pn-next" href="#/s/${semester.slug}/${module.slug}/${next.slug}">
          <span><span class="pn-label">${t("next")}</span>${esc(next.title)}</span>
          <span class="flip-rtl" aria-hidden="true">${icons.arrowRight()}</span></a>` : ""}
    </nav>`;

  return `
    <div class="container page">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="#/">${t("nav_home")}</a><span class="sep" aria-hidden="true">/</span>
        <a href="#/s/${semester.slug}">${esc(semester.title)}</a><span class="sep" aria-hidden="true">/</span>
        <a href="#/s/${semester.slug}/${module.slug}">${esc(module.title)}</a><span class="sep" aria-hidden="true">/</span>
        <span aria-current="page">${esc(lesson.title)}</span>
      </nav>

      <header class="lesson-head">
        <h1${editing ? ' data-rename="lesson" data-id="' + esc(lesson.id) + '"' : ""}>${esc(lesson.title)}</h1>
        <div class="lesson-meta">
          <span class="type-label">${esc(tn)}</span>
          <span>·</span><span>${timeAgo(lesson.createdAt)}</span>
          ${newTag}
        </div>
        <div class="lesson-actions">
          <button class="btn toggle-btn" data-lact="bookmark" aria-pressed="${bookmarked}">
            ${icons.bookmark()} ${bookmarked ? t("bookmarked") : t("bookmark")}
          </button>
          <button class="btn toggle-btn" data-lact="done" aria-pressed="${done}">
            ${icons.check()} ${done ? t("done_state") : t("mark_done")}
          </button>
          ${editDetailsBtn}
        </div>
        <p class="device-note">${t("saved_device")}</p>
      </header>

      <div class="split" style="margin-block-start: 1.5rem;">
        <div>
          ${resume}
          <div id="reader-body">${body}</div>
          ${editTextBtn}
          ${prevNext}
        </div>
        <aside>
          <div class="panel-block">
            <h2>${t("about_lesson")}</h2>
            ${details}
          </div>
          ${filesBlock}
          ${linksBlock}
          ${siblingsBlock}
        </aside>
      </div>
    </div>`;
}

function rememberPlace(semSlug, modSlug, lessonSlug, page) {
  setPref("lastRead", { semesterSlug: semSlug, moduleSlug: modSlug, lessonSlug, page: page || null, at: new Date().toISOString() });
}

export function mount(el, { semSlug, modSlug, lessonSlug }) {
  // Bookmark / done toggles.
  el.querySelectorAll("[data-lact]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const found = getLesson(semSlug, modSlug, lessonSlug);
      if (!found) return;
      const key = btn.dataset.lact === "bookmark" ? "bookmarks" : "done";
      const on = toggleInList(key, found.lesson.id);
      btn.setAttribute("aria-pressed", String(on));
      btn.innerHTML = `${btn.dataset.lact === "bookmark" ? icons.bookmark() : icons.check()} ${
        on ? t(btn.dataset.lact === "bookmark" ? "bookmarked" : "done_state")
           : t(btn.dataset.lact === "bookmark" ? "bookmark" : "mark_done")}`;
    });
  });

  const found0 = getLesson(semSlug, modSlug, lessonSlug);

  if (isEditMode() && found0) {
    const { lesson, module } = found0;
    bindInlineRename(el, async (table, id, v) => {
      if (table !== "lesson") return;
      await commit(() => updateLesson(id, { title: v }));
    });

    const chaptersOf = () => getChapters(module.id);

    el.addEventListener("click", async (e) => {
      // "Try custom reader" in the native-PDF fallback: clear the
      // remembered engine failure and reload to attempt PDF.js again.
      const retry = e.target.closest("[data-retry-pdfjs]");
      if (retry) {
        setPref("pdfjsBroken", false);
        location.reload();
        return;
      }

      const btn = e.target.closest("[data-edit]");
      if (!btn) return;
      const { edit: act, id } = btn.dataset;

      if (act === "edit-details") {
        const chapters = await chaptersOf();
        const v = await openModal({ title: t("edit_details"), fields: detailFields(lesson, chapters) });
        if (v) {
          await commit(() => updateLesson(lesson.id, {
            title: v.title.trim(), type: v.type, chapterId: v.chapterId || null,
            description: v.description.trim(), bodyKind: v.bodyKind, visible: v.visible,
          }));
        }
      } else if (act === "edit-text") {
        const v = await openModal({
          title: t("edit_text"),
          fields: [{ key: "bodyMarkdown", label: t("f_body_en"), type: "textarea", value: lesson.bodyMarkdown || "", rows: 14 }],
        });
        if (v) await commit(() => updateLesson(lesson.id, { bodyMarkdown: v.bodyMarkdown }));
      } else if (act === "upload") {
        el.querySelector("#file-input")?.click();
      } else if (act === "delete-file") {
        if (await confirmDelete()) await commit(() => deleteFile(id));
      } else if (act === "add-link") {
        const v = await openModal({
          title: t("add_link"),
          fields: [
            { key: "title", label: t("f_title"), type: "text", value: "", placeholder: t("link_title_ph") },
            { key: "url", label: t("f_url"), type: "text", value: "", required: true },
          ],
          submitLabel: t("add"),
        });
        if (v && v.url.trim()) {
          await commit(() => createLink(lesson.id, { title: v.title.trim() || v.url.trim(), url: v.url.trim() }));
        }
      } else if (act === "delete-link") {
        if (await confirmDelete()) await commit(() => deleteLink(id));
      }
    });

    el.querySelector("#file-input")?.addEventListener("change", async (e) => {
      const listEl = el.querySelector("#upload-list");
      let ok = 0;
      for (const file of e.target.files) {
        const row = document.createElement("div");
        row.className = "upload-row";
        row.innerHTML = `<span>${esc(file.name)}</span><div class="upload-bar"><span></span></div>`;
        listEl.appendChild(row);
        const bar = row.querySelector(".upload-bar > span");
        try {
          await uploadLessonFile(lesson.id, file, (p) => {
            bar.style.inlineSize = `${Math.round(p * 100)}%`;
          });
          ok++;
          row.querySelector("span").textContent = `✓ ${file.name}`;
        } catch (err) {
          row.innerHTML = `<span class="upload-err">${esc(err.message)}</span>`;
          toast(err.message, "error");
        }
      }
      e.target.value = "";
      if (ok) {
        toast(t("toast_saved"));
        notifyChange();
      }
    });
  }

  const mountNode = el.querySelector("#pdf-mount");
  if (!mountNode) {
    // Written lessons: remember the visit (no page number to track).
    const article = el.querySelector("#article-inner");
    if (article) {
      rememberPlace(semSlug, modSlug, lessonSlug, null);
      el.querySelectorAll("[data-font]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const cur = getPrefs().fontScale || 1;
          const next = Math.min(1.4, Math.max(0.9, +(cur + (btn.dataset.font === "up" ? 0.1 : -0.1)).toFixed(2)));
          setPref("fontScale", next);
          article.style.setProperty("--font-scale", next);
        });
      });
    }
    return;
  }

  // PDF lesson: build the reader.
  const found = getLesson(semSlug, modSlug, lessonSlug);
  // Same fallback as render(): bodyFileId may be unset (older lessons, or
  // files attached at creation) — then the first file is the main one.
  const lfiles = getLessonFiles(found.lesson.id);
  const file = found.lesson.bodyFileId ? getFile(found.lesson.bodyFileId) : lfiles[0] || null;
  if (!file) return;

  // The custom engine already failed on this device once (blocked CDN,
  // stalled load, …) → skip straight to the built-in viewer instead of
  // waiting out another timeout. The retry button below clears this.
  if (getPrefs().pdfjsBroken) {
    el.querySelector("#reader-body").innerHTML = nativePdfFallback(file);
    return;
  }

  const narrow = window.matchMedia("(max-width: 56rem)").matches;
  const loading = el.querySelector("#pdf-loading");
  const pageInput = el.querySelector("#page-input");
  const pageCountEl = el.querySelector("#page-count");
  const zoomLabel = el.querySelector("#zoom-label");
  const fitBtn = el.querySelector("#fit-btn");
  const last = getPrefs().lastRead;
  const startPage = last && last.lessonSlug === lessonSlug && last.page > 1 ? last.page : 1;

  fitBtn.setAttribute("aria-pressed", String(narrow));

  createPdfReader(mountNode, file.url, {
    initialPage: startPage,
    fitWidth: narrow,
    onPage: ({ page, pageCount }) => {
      pageInput.value = page;
      pageInput.max = pageCount;
      pageCountEl.textContent = pageCount;
      rememberPlace(semSlug, modSlug, lessonSlug, page);
    },
    onError: (err) => {
      // The custom engine couldn't load it — fall back to the browser's
      // built-in viewer instead of leaving a blank page. If the engine
      // itself is broken on this device (not just this file), remember
      // that so next time we skip straight to the working viewer.
      const engineBroken = !err || /timed out|failed to load/i.test(err.message || "");
      if (engineBroken) setPref("pdfjsBroken", true);
      el.querySelector("#reader-body").innerHTML = nativePdfFallback(file);
    },
  }).then((r) => {
    reader = r;
    if (!r) return;
    if (loading) loading.remove();
    zoomLabel.textContent = r.percent() + "%";
    pageInput.value = r.page;

    const refreshZoom = () => {
      zoomLabel.textContent = r.percent() + "%";
      fitBtn.setAttribute("aria-pressed", String(r.fit));
    };

    el.querySelector('[data-tb="zoom-in"]').addEventListener("click", () => { r.zoomIn(); refreshZoom(); });
    el.querySelector('[data-tb="zoom-out"]').addEventListener("click", () => { r.zoomOut(); refreshZoom(); });
    el.querySelector('[data-tb="fit"]').addEventListener("click", () => { r.setFit(!r.fit); refreshZoom(); });
    el.querySelector('[data-tb="go"]').addEventListener("click", () => r.goToPage(+pageInput.value));
    pageInput.addEventListener("keydown", (e) => { if (e.key === "Enter") r.goToPage(+pageInput.value); });
    el.querySelector('[data-tb="fullscreen"]').addEventListener("click", () => {
      const shell = el.querySelector("#reader-shell");
      if (document.fullscreenElement) document.exitFullscreen();
      else shell.requestFullscreen?.();
    });

    const resumeBtn = el.querySelector("#resume-btn");
    if (resumeBtn) resumeBtn.addEventListener("click", () => r.goToPage(startPage));
  });
}

// Called by app.js before each route change: a PDF reader left
// rendering in the background would waste the student's mobile data.
export function unmount() {
  if (reader) {
    reader.destroy();
    reader = null;
  }
}
