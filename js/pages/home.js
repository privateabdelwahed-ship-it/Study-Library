// Home: loud yellow hero, black feature strip, yellow semester cards.
// Section titles use the sec-title pattern: <span class="hl">WORD</span> REST.
// In edit mode: add-semester button, per-card edit/delete/hide tools,
// announcement tools, and the hero tagline renames inline.
import { t, getLang } from "../i18n/i18n.js";
import {
  getSite, getSemesters, getModules, getRecentLessons,
  getAnnouncements, isNew, getLesson,
  createSemester, updateSemester, deleteSemester, updateSiteSettings,
  createAnnouncement, updateAnnouncement, deleteAnnouncement,
  deleteFile,
} from "../data/store.js";
import { getPrefs } from "../lib/prefs.js";
import { esc, timeAgo, formatDate } from "../lib/format.js";
import { isEditMode, bindInlineRename } from "../lib/editmode.js";
import { commit, editTools, toolEdit, toolDelete, toolToggle, addBtn, confirmDelete } from "../lib/edit-ui.js";
import { openModal } from "../components/modal.js";
import {
  announcementFields, announcementFilesHtml, announcementLinksHtml,
  uploadFilesToAnnouncement, addLinkToAnnouncement,
} from "../lib/announce-ui.js";
import { deleteLink } from "../data/store.js";

// Semesters are grouped under their year label — but while every
// semester shares the same label ("Third year"), the label is hidden
// and the cards stand on their own. Add an S1 with yearLabel
// "First year" later and the grouping appears by itself.
function groupByYear(semesters) {
  const years = [...new Set(semesters.map((s) => s.yearLabel).filter(Boolean))];
  if (years.length < 2) return [{ year: null, semesters }];
  return years.map((year) => ({
    year,
    semesters: semesters.filter((s) => s.yearLabel === year),
  }));
}

function semesterCard(sem, editing) {
  const modules = getModules(sem.id);
  const toc = modules
    .map(
      (m, i) => `
      <li>
        <a href="#/s/${sem.slug}/${m.slug}">
          <span class="toc-num">${String(i + 1).padStart(2, "0")}</span>
          <span>${esc(m.title)}</span>
        </a>
      </li>`
    )
    .join("");
  const inner = `
    <section class="sem-card" data-glyph="${esc(sem.title)}" aria-label="${esc(sem.title)}">
      <p class="sem-overline">${t("semester_word")}</p>
      <a class="sem-glyph" href="#/s/${sem.slug}">${esc(sem.title)}</a>
      <p class="sem-sub">${t("semester_count", { n: modules.length })}</p>
      <ul class="toc">${toc}</ul>
    </section>`;
  return editing
    ? `<div class="card-wrap">${editTools(sem.id, "semester", [toolEdit(), toolToggle(sem.visible), toolDelete()])}${inner}</div>`
    : inner;
}

function continueCard() {
  const last = getPrefs().lastRead;
  if (!last) return "";
  const found = getLesson(last.semesterSlug, last.moduleSlug, last.lessonSlug);
  if (!found) return "";
  const pageBit = last.page > 1 ? ` · ${t("page")} ${last.page}` : "";
  return `
    <a class="continue-card" href="#/s/${last.semesterSlug}/${last.moduleSlug}/${last.lessonSlug}">
      <span class="pill-badge pill-badge--yellow">${t("continue_reading")}</span>
      <span>
        <span class="continue-title">${esc(found.lesson.title)}</span><br>
        <span class="continue-sub">${esc(found.semester.title)} · ${esc(found.module.title)}${pageBit}</span>
      </span>
    </a>`;
}

function lessonRow(l) {
  const isNewTag = isNew(l.createdAt) ? `<span class="tag-new">${t("new_tag")}</span>` : "";
  return `
    <li class="ruled-row">
      <div class="row-main">
        <a class="row-title" href="#/s/${l.semester.slug}/${l.module.slug}/${l.slug}">${esc(l.title)}</a>
        <div class="row-sub">
          <span>${esc(l.semester.title)} · ${esc(l.module.title)}</span>
          <span>${timeAgo(l.createdAt)}</span>
          ${isNewTag}
        </div>
      </div>
    </li>`;
}

// <span class="hl">WORD</span> REST — the reference's section-header pattern.
function secTitle(hlKey, restKey) {
  const rest = t(restKey);
  return `<h2 class="sec-title"><span class="hl">${t(hlKey)}</span>${rest ? " " + rest : ""}</h2>`;
}

function featureStrip() {
  const feats = [
    { t: "feat1_t", d: "feat1_d" },
    { t: "feat2_t", d: "feat2_d" },
    { t: "feat3_t", d: "feat3_d" },
  ];
  return `
    <div class="strip">
      <div class="container strip-inner">
        ${feats
          .map(
            (f, i) => `
          <div class="strip-item">
            <span class="pill-badge">0${i + 1}</span>
            <h3>${t(f.t)}</h3>
            <p>${t(f.d)}</p>
          </div>`
          )
          .join("")}
      </div>
    </div>`;
}

function semesterFields(sem = {}) {
  return [
    { key: "title", label: t("f_title"), type: "text", value: sem.title || "", required: true },
    { key: "slug", label: t("f_slug"), type: "text", value: sem.slug || "" },
    { key: "yearLabel", label: t("f_year"), type: "text", value: sem.yearLabel || "" },
    { key: "color", label: t("f_color"), type: "colors", value: sem.color || "#FFC800" },
  ];
}


export function render() {
  const site = getSite();
  const lang = getLang();
  const editing = isEditMode();
  const groups = groupByYear(getSemesters());
  const recent = getRecentLessons(5);
  const announcements = getAnnouncements();
  const first = getSemesters()[0];
  const second = getSemesters()[1];

  const panels = groups
    .map(
      (g) => `
      ${g.year ? `<h2 class="sec-title"><span class="hl">${esc(g.year)}</span></h2>` : ""}
      <div class="grid-2" style="margin-block-end: 2.5rem;">
        ${g.semesters.map((s) => semesterCard(s, editing)).join("")}
      </div>`
    )
    .join("");

  // Empty shelves stay quiet: sections with nothing to show simply
  // don't render, instead of apologizing for being empty.
  const recentSection = recent.length
    ? `
      <section aria-label="${t("recently_added")}" style="margin-block-end: 2.5rem;">
        ${secTitle("recent_hl", "recent_rest")}
        <ul class="ruled-list">${recent.map(lessonRow).join("")}</ul>
      </section>`
    : "";

  const announceSection = announcements.length || editing
    ? `
      <section aria-label="${t("announcements")}">
        ${secTitle("ann_hl", "ann_rest")}
        ${editing ? `<p style="margin-block-end: 1rem;">${addBtn(t("add_announcement"), "add-announcement")}</p>` : ""}
        <div class="announce">
          ${announcements
            .map(
              (a) => `
            <article class="announce-item card-wrap">
              ${editing ? editTools(a.id, "announcement", [toolEdit(), toolDelete()]) : ""}
              <span class="announce-date">${formatDate(a.date)}</span>
              <h3>${esc(a.title[lang] || a.title.en)}</h3>
              <p>${esc(a.body[lang] || a.body.en)}</p>
              ${announcementFilesHtml(a, editing)}
              ${announcementLinksHtml(a, editing)}
            </article>`
            )
            .join("")}
        </div>
      </section>`
    : "";

  return `
    <section class="hero" aria-label="${esc(site.name)}">
      <div class="hero-deco" aria-hidden="true">
        <span class="deco-ring"></span>
        <span class="deco-dots"></span>
        <span class="deco-slash"></span>
      </div>
      <div class="container hero-inner">
        <span class="pill-badge">${t("hero_badge")}</span>
        <h1 class="hero-title"><span class="w1">${t("hero_l1")}</span> <span class="w2">${t("hero_l2")}</span></h1>
        <p class="hero-tag"${editing ? ' data-rename="tagline" data-id="site"' : ""}>${esc(site.tagline[lang] || site.tagline.en || t("hero_tag"))}</p>
        <p class="hero-sub">${t("pick_semester")}</p>
        <div class="hero-ctas">
          ${first ? `<a class="btn btn-primary" href="#/s/${first.slug}">${t("hero_cta_browse", { sem: esc(first.title) })}</a>` : ""}
          ${second ? `<a class="btn" href="#/s/${second.slug}">${t("hero_cta_browse", { sem: esc(second.title) })}</a>` : ""}
        </div>
      </div>
    </section>
    ${featureStrip()}
    <div class="container page">
      ${continueCard()}
      ${secTitle("sem_hl", "sem_rest")}
      ${editing ? `<p style="margin-block-end: 1.5rem;">${addBtn(t("add_semester"), "add-semester")}</p>` : ""}
      ${panels}
      ${recentSection}
      ${announceSection}
    </div>`;
}

export function mount(el) {
  if (!isEditMode()) return;

  bindInlineRename(el, async (table, id, v) => {
    if (table !== "tagline") return;
    await commit(() => updateSiteSettings({ tagline: { ...getSite().tagline, [getLang()]: v } }));
  });

  el.addEventListener("click", async (e) => {
    // Delete a file attached to an announcement (its own button, outside data-edit).
    const fileDel = e.target.closest("[data-annfile-del]");
    if (fileDel) {
      if (await confirmDelete()) await commit(() => deleteFile(fileDel.dataset.annfileDel));
      return;
    }
    // Add / delete a link on an announcement.
    const linkAdd = e.target.closest("[data-annlink-add]");
    if (linkAdd) {
      await addLinkToAnnouncement(linkAdd.dataset.annlinkAdd);
      return;
    }
    const linkDel = e.target.closest("[data-annlink-del]");
    if (linkDel) {
      if (await confirmDelete()) await commit(() => deleteLink(linkDel.dataset.annlinkDel));
      return;
    }

    const btn = e.target.closest("[data-edit]");
    if (!btn) return;
    const kind = btn.closest("[data-kind]")?.dataset.kind;
    const { edit: act, id } = btn.dataset;

    if (act === "add-semester") {
      const v = await openModal({ title: t("add_semester"), fields: semesterFields(), submitLabel: t("add") });
      if (v && v.title.trim()) {
        await commit(() => createSemester({ title: v.title.trim(), slug: v.slug.trim(), yearLabel: v.yearLabel.trim(), color: v.color }));
      }
      return;
    }
    if (act === "add-announcement") {
      const v = await openModal({ title: t("add_announcement"), fields: announcementFields(), submitLabel: t("add") });
      if (v && v.titleEn.trim()) {
        const a = await commit(() => createAnnouncement({ titleEn: v.titleEn.trim(), titleAr: v.titleAr.trim(), bodyEn: v.bodyEn.trim(), bodyAr: v.bodyAr.trim() }));
        if (a) await uploadFilesToAnnouncement(a.id, v.files);
      }
      return;
    }
    if (kind === "semester") {
      const sem = getSemesters().find((s) => s.id === id);
      if (!sem) return;
      if (act === "edit") {
        const v = await openModal({ title: t("edit_semester"), fields: semesterFields(sem) });
        if (v) await commit(() => updateSemester(id, { title: v.title.trim(), slug: v.slug.trim() || sem.slug, yearLabel: v.yearLabel.trim(), color: v.color }));
      } else if (act === "toggle") {
        await commit(() => updateSemester(id, { visible: !sem.visible }));
      } else if (act === "delete") {
        if (await confirmDelete()) await commit(() => deleteSemester(id));
      }
    } else if (kind === "announcement") {
      const a = getAnnouncements().find((x) => x.id === id);
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
    }
  });
}
