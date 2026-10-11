// Settings: the admin's control room. Guarded: only reachable with
// edit mode ON and canEdit() true — otherwise the visitor is sent
// home with a loud toast. Sections: site info, semesters, lesson
// types, trash, backup, danger zone. Everything saves to Supabase.
import { t, getLang } from "../i18n/i18n.js";
import {
  getSite, getSettings, getAllSemesters, getAllLessonTypes,
  getTrash, restoreFromTrash, purgeTrashItem,
  createSemester, updateSemester, deleteSemester,
  createLessonType, updateLessonType, deleteLessonType, reorder,
  updateSiteSettings, exportBackup, importBackup, clearAllContent,
} from "../data/store.js";
import { esc } from "../lib/format.js";
import { icons } from "../lib/icons.js";
import { canEdit } from "../lib/permissions.js";
import { isEditMode } from "../lib/editmode.js";
import { commit, toolEdit, toolDelete, toolToggle, addBtn, confirmDelete } from "../lib/edit-ui.js";
import { openModal, confirmModal } from "../components/modal.js";
import { toast } from "../components/toast.js";

const TRASH_TABLES = ["semesters", "modules", "chapters", "lessons", "lessonTypes", "announcements"];
const TRASH_LABELS = {
  semesters: "w_semesters", modules: "w_modules", chapters: "w_chapters",
  lessons: "w_lessons", lessonTypes: "w_types", announcements: "w_announcements",
};

function trashTitle(table, row) {
  const lang = getLang();
  if (table === "lessonTypes") return row.label[lang] || row.label.en || row.slug;
  if (table === "announcements") return row.title[lang] || row.title.en;
  return row.title;
}

function semesterFields(sem = {}) {
  return [
    { key: "title", label: t("f_title"), type: "text", value: sem.title || "", required: true },
    { key: "slug", label: t("f_slug"), type: "text", value: sem.slug || "" },
    { key: "yearLabel", label: t("f_year"), type: "text", value: sem.yearLabel || "" },
    { key: "color", label: t("f_color"), type: "colors", value: sem.color || "#FFC800" },
  ];
}

function typeFields(ty = {}) {
  return [
    { key: "labelEn", label: t("f_label_en"), type: "text", value: ty.label?.en || "", required: true },
    { key: "labelAr", label: t("f_label_ar"), type: "text", value: ty.label?.ar || "" },
  ];
}

function setRow(main, sub, actions) {
  return `<div class="set-row">
    <div><div class="row-main">${esc(main)}</div>${sub ? `<div class="row-sub">${esc(sub)}</div>` : ""}</div>
    <div class="set-actions">${actions}</div>
  </div>`;
}

function miniBtn(label, icon, attrs) {
  return `<button class="icon-btn sm" ${attrs} aria-label="${esc(label)}" title="${esc(label)}">${icon}</button>`;
}

export function render() {
  const site = getSite();
  const lang = getLang();
  const defaultLang = getSettings().defaultLang || "en";
  const semesters = getAllSemesters();
  const types = getAllLessonTypes();
  const trash = getTrash();

  const trashTabs = TRASH_TABLES.map((tb, i) => {
    const n = trash[tb].length;
    return `<button class="trash-tab" data-trash="${tb}" aria-pressed="${i === 0}">${t(TRASH_LABELS[tb])} (${n})</button>`;
  }).join("");

  const trashPanes = TRASH_TABLES.map((tb, i) => {
    const rows = trash[tb].map((r) => setRow(
      trashTitle(tb, r),
      tb === "modules" || tb === "lessons" ? "" : "",
      `${miniBtn(t("restore"), icons.restore(), `data-trash-act="restore" data-table="${tb}" data-id="${r.id}"`)}
       ${miniBtn(t("permanent_delete"), icons.trash(), `data-trash-act="purge" data-table="${tb}" data-id="${r.id}"`)}`
    )).join("");
    return `<div data-trash-pane="${tb}" ${i === 0 ? "" : "hidden"}>${rows || `<p class="set-desc">${t("set_trash_empty")}</p>`}</div>`;
  }).join("");

  return `
    <div class="container page" style="max-inline-size: 52rem;">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="#/">${t("nav_home")}</a>
        <span class="sep" aria-hidden="true">/</span>
        <span aria-current="page">${t("settings")}</span>
      </nav>
      <header class="page-head">
        <h1>${t("settings_title")}</h1>
        <p class="lede">${t("settings_desc")}</p>
        <div class="rule-double" aria-hidden="true"></div>
      </header>
      <div id="settings-body">

        <section class="set-section" aria-label="${t("set_site")}">
          <h2>${t("set_site")}</h2>
          <p class="set-desc">${t("set_site_desc")}</p>
          <form id="set-site-form" class="set-grid">
            <label class="m-field"><span>${t("f_name")}</span>
              <input type="text" name="name" value="${esc(site.name)}"></label>
            <label class="m-field"><span>${t("f_tagline_en")}</span>
              <input type="text" name="tagline_en" value="${esc(site.tagline.en)}"></label>
            <label class="m-field"><span>${t("f_tagline_ar")}</span>
              <input type="text" name="tagline_ar" value="${esc(site.tagline.ar)}"></label>
            <label class="m-field"><span>${t("f_about_en")}</span>
              <textarea name="about_en" rows="5">${esc(site.about.en)}</textarea></label>
            <label class="m-field"><span>${t("f_about_ar")}</span>
              <textarea name="about_ar" rows="5">${esc(site.about.ar)}</textarea></label>
            <label class="m-field"><span>${t("f_contact")}</span>
              <input type="text" name="contact" value="${esc(site.contact)}"></label>
            <label class="m-field"><span>${t("f_default_lang")}</span>
              <select name="default_lang">
                <option value="en" ${defaultLang === "en" ? "selected" : ""}>English</option>
                <option value="ar" ${defaultLang === "ar" ? "selected" : ""}>العربية</option>
              </select></label>
            <p><button class="btn btn-primary" type="submit">${t("save")}</button></p>
          </form>
        </section>

        <section class="set-section" aria-label="${t("set_semesters")}">
          <h2>${t("set_semesters")}</h2>
          <p class="set-desc">${t("set_semesters_desc")}</p>
          <div>${semesters.map((s) => setRow(
            s.title, s.visible ? "" : t("hide"),
            `${miniBtn(t("edit"), icons.pencil(), `data-sem="edit" data-id="${s.id}"`)}
             ${miniBtn(s.visible ? t("hide") : t("show"), s.visible ? icons.eyeOff() : icons.eye(), `data-sem="toggle" data-id="${s.id}"`)}
             ${miniBtn(t("delete"), icons.trash(), `data-sem="delete" data-id="${s.id}"`)}`
          )).join("")}</div>
          <p style="margin-block-start: 1rem;">${addBtn(t("add_semester"), "add-semester")}</p>
        </section>

        <section class="set-section" aria-label="${t("set_types")}">
          <h2>${t("set_types")}</h2>
          <p class="set-desc">${t("set_types_desc")}</p>
          <div>${types.map((ty) => setRow(
            ty.label[lang] || ty.label.en, ty.slug,
            `${miniBtn(t("move_up"), icons.arrowUp(), `data-type="up" data-id="${ty.id}"`)}
             ${miniBtn(t("move_down"), icons.arrowDown(), `data-type="down" data-id="${ty.id}"`)}
             ${miniBtn(t("edit"), icons.pencil(), `data-type="edit" data-id="${ty.id}"`)}
             ${miniBtn(t("delete"), icons.trash(), `data-type="delete" data-id="${ty.id}"`)}`
          )).join("")}</div>
          <p style="margin-block-start: 1rem;">${addBtn(t("add_type"), "add-type")}</p>
        </section>

        <section class="set-section" aria-label="${t("set_trash")}">
          <h2>${t("set_trash")}</h2>
          <div class="trash-tabs" role="group">${trashTabs}</div>
          ${trashPanes}
        </section>

        <section class="set-section" aria-label="${t("set_backup")}">
          <h2>${t("set_backup")}</h2>
          <p class="set-desc">${t("set_backup_desc")}</p>
          <div class="set-actions">
            <button class="btn" id="backup-export">${icons.download()} ${t("backup_export")}</button>
            <button class="btn" id="backup-import">${icons.upload()} ${t("backup_import")}</button>
            <input type="file" id="backup-file" accept=".json,application/json" hidden>
          </div>
        </section>

        <section class="set-section danger-zone" aria-label="${t("set_danger")}">
          <h2>${t("set_danger")}</h2>
          <p class="set-desc">${t("set_danger_desc")}</p>
          <button class="btn btn-danger" id="clear-content">${t("clear_content")}</button>
        </section>

      </div>
    </div>`;
}

export async function mount(el) {
  // Guard: settings is edit-mode + canEdit only.
  if (!isEditMode() || !(await canEdit())) {
    toast(t("guard_body"), "error");
    location.hash = "#/";
    return;
  }

  // --- site info ---
  el.querySelector("#set-site-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await commit(() => updateSiteSettings({
      name: String(fd.get("name")).trim(),
      tagline: { en: String(fd.get("tagline_en")).trim(), ar: String(fd.get("tagline_ar")).trim() },
      about: { en: String(fd.get("about_en")), ar: String(fd.get("about_ar")) },
      contact: String(fd.get("contact")).trim(),
      defaultLang: String(fd.get("default_lang")),
    }));
  });

  // --- semesters ---
  el.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-sem], [data-type], [data-edit], [data-trash-act]");
    if (!btn) return;

    if (btn.dataset.sem) {
      const id = btn.dataset.id;
      const sem = getAllSemesters().find((s) => s.id === id);
      if (btn.dataset.sem === "edit" && sem) {
        const v = await openModal({ title: t("edit_semester"), fields: semesterFields(sem) });
        if (v) await commit(() => updateSemester(id, { title: v.title.trim(), slug: v.slug.trim() || sem.slug, yearLabel: v.yearLabel.trim(), color: v.color }));
      } else if (btn.dataset.sem === "toggle" && sem) {
        await commit(() => updateSemester(id, { visible: !sem.visible }));
      } else if (btn.dataset.sem === "delete") {
        if (await confirmDelete()) await commit(() => deleteSemester(id));
      }
      return;
    }

    if (btn.dataset.edit === "add-semester") {
      const v = await openModal({ title: t("add_semester"), fields: semesterFields(), submitLabel: t("add") });
      if (v && v.title.trim()) {
        await commit(() => createSemester({ title: v.title.trim(), slug: v.slug.trim(), yearLabel: v.yearLabel.trim(), color: v.color }));
      }
      return;
    }
    if (btn.dataset.edit === "add-type") {
      const v = await openModal({ title: t("add_type"), fields: typeFields(), submitLabel: t("add") });
      if (v && v.labelEn.trim()) {
        await commit(() => createLessonType({ labelEn: v.labelEn.trim(), labelAr: v.labelAr.trim() }));
      }
      return;
    }

    if (btn.dataset.type) {
      const id = btn.dataset.id;
      const ty = getAllLessonTypes().find((x) => x.id === id);
      const act = btn.dataset.type;
      if (act === "edit" && ty) {
        const v = await openModal({ title: t("edit_type"), fields: typeFields(ty) });
        if (v) await commit(() => updateLessonType(id, { label: { en: v.labelEn.trim(), ar: v.labelAr.trim() } }));
      } else if (act === "delete") {
        if (await confirmDelete()) await commit(() => deleteLessonType(id));
      } else if (act === "up" || act === "down") {
        const ids = getAllLessonTypes().map((x) => x.id);
        const i = ids.indexOf(id);
        const j = act === "up" ? i - 1 : i + 1;
        if (i < 0 || j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        await commit(() => reorder("lessonTypes", ids));
      }
      return;
    }

    if (btn.dataset.trashAct) {
      const { trashAct: act, table, id } = btn.dataset;
      if (act === "restore") {
        await commit(() => restoreFromTrash(table, id));
      } else if (act === "purge") {
        const ok = await confirmModal({ title: t("confirm_purge_title"), body: `<p>${esc(t("confirm_purge_body"))}</p>`, confirmLabel: t("permanent_delete"), danger: true });
        if (ok) await commit(() => purgeTrashItem(table, id));
      }
    }
  });

  // --- trash tabs (client-side switching) ---
  el.querySelectorAll("[data-trash]").forEach((tab) => {
    tab.addEventListener("click", () => {
      el.querySelectorAll("[data-trash]").forEach((x) => x.setAttribute("aria-pressed", "false"));
      tab.setAttribute("aria-pressed", "true");
      el.querySelectorAll("[data-trash-pane]").forEach((p) => { p.hidden = p.dataset.trashPane !== tab.dataset.trash; });
    });
  });

  // --- backup ---
  el.querySelector("#backup-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(exportBackup(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `study-library-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast(t("toast_saved"));
  });
  el.querySelector("#backup-import").addEventListener("click", () => el.querySelector("#backup-file").click());
  el.querySelector("#backup-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      toast(t("err_bad_backup"), "error");
      return;
    }
    const ok = await confirmModal({
      title: t("confirm_import_title"),
      body: `<p>${esc(t("confirm_import_body"))}</p>`,
      confirmLabel: t("backup_import"),
      danger: true,
    });
    if (ok) await commit(() => importBackup(data));
  });

  // --- danger zone: two confirms, no undo ---
  el.querySelector("#clear-content").addEventListener("click", async () => {
    const first = await confirmModal({
      title: t("confirm_clear_title"),
      body: `<p>${esc(t("confirm_clear_body"))}</p>`,
      confirmLabel: t("clear_content"),
      danger: true,
    });
    if (!first) return;
    const second = await confirmModal({
      title: t("confirm_clear_title"),
      body: `<p>${esc(t("confirm_purge_body"))}</p>`,
      confirmLabel: t("clear_content"),
      danger: true,
    });
    if (second) await commit(() => clearAllContent());
  });
}
