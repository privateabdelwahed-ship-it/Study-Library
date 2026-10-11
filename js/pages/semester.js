// Semester page: the module index — cards like library index cards,
// each with a colored edge, a serif number, and a quiet status line.
// In edit mode: add-module button, per-card edit/delete/hide tools,
// and the semester title renames inline.
import { t, getLang } from "../i18n/i18n.js";
import {
  getSemester, getModules, getLessons, getModuleUpdatedAt,
  createModule, updateModule, deleteModule,
} from "../data/store.js";
import { esc, timeAgo } from "../lib/format.js";
import { isEditMode, bindInlineRename } from "../lib/editmode.js";
import { commit, editTools, toolEdit, toolDelete, toolToggle, addBtn, confirmDelete } from "../lib/edit-ui.js";
import { openModal } from "../components/modal.js";
import { notFound } from "./not-found.js";

function moduleFields(mod = {}) {
  return [
    { key: "title", label: t("f_title"), type: "text", value: mod.title || "", required: true },
    { key: "code", label: t("f_code"), type: "text", value: mod.code || "" },
    { key: "teacher", label: t("f_teacher"), type: "text", value: mod.teacher || "" },
    { key: "description", label: t("f_description"), type: "textarea", value: mod.description || "" },
    { key: "credits", label: t("f_credits"), type: "text", value: mod.credits || "" },
    { key: "color", label: t("f_color"), type: "colors", value: mod.color || "#FFC800" },
    { key: "visible", label: t("f_visible"), type: "checkbox", value: mod.visible !== false },
  ];
}

export function render({ slug }) {
  const sem = getSemester(slug);
  if (!sem) return notFound();
  const editing = isEditMode();
  const modules = getModules(sem.id);

  const cards = modules
    .map((m, i) => {
      const n = getLessons(m.id).length;
      const updated = getModuleUpdatedAt(m.id);
      const status = n === 0
        ? t("nothing_here")
        : `${t("lessons_count", { n })} · ${t("updated_ago", { ago: timeAgo(updated) })}`;
      const inner = `
        <a class="index-card" style="--edge: ${esc(m.color)}" href="#/s/${sem.slug}/${m.slug}">
          <span class="card-num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
          <h3>${esc(m.title)}</h3>
          <p class="card-teacher">${esc(m.teacher) || t("teacher_not_set")}</p>
          <p class="card-meta">${status}</p>
        </a>`;
      return editing
        ? `<div class="card-wrap">${editTools(m.id, "module", [toolEdit(), toolToggle(m.visible), toolDelete()])}${inner}</div>`
        : inner;
    })
    .join("");

  return `
    <div class="container page">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="#/">${t("nav_home")}</a>
        <span class="sep" aria-hidden="true">/</span>
        <span aria-current="page">${esc(sem.title)}</span>
      </nav>
      <header class="page-head">
        <p class="overline">${t("semester_word")}</p>
        <h1${editing ? ' data-rename="semester" data-id="' + esc(sem.id) + '"' : ""}>${esc(sem.title)}</h1>
        <p class="lede">${t("semester_count", { n: modules.length })}</p>
        <div class="rule-double" aria-hidden="true"></div>
      </header>
      ${editing ? `<p style="margin-block-end: 1.5rem;">${addBtn(t("add_module"), "add-module")}</p>` : ""}
      <div class="grid-cards">${cards}</div>
    </div>`;
}

export function mount(el, { slug }) {
  if (!isEditMode()) return;
  const sem = getSemester(slug);
  if (!sem) return;

  bindInlineRename(el, async (table, id, v) => {
    if (table !== "semester") return;
    await commit(() => updateModule(id, { title: v }));
  });

  el.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-edit]");
    if (!btn) return;
    const kind = btn.closest("[data-kind]")?.dataset.kind;
    const { edit: act, id } = btn.dataset;

    if (act === "add-module") {
      const v = await openModal({ title: t("add_module"), fields: moduleFields(), submitLabel: t("add") });
      if (v && v.title.trim()) {
        await commit(() => createModule(sem.id, {
          title: v.title.trim(), code: v.code.trim(), teacher: v.teacher.trim(),
          description: v.description.trim(), credits: v.credits.trim(), color: v.color,
          visible: v.visible,
        }));
      }
      return;
    }
    if (kind !== "module") return;
    const mod = getModules(sem.id).find((m) => m.id === id);
    if (!mod) return;
    if (act === "edit") {
      const v = await openModal({ title: t("edit_module"), fields: moduleFields(mod) });
      if (v) {
        await commit(() => updateModule(id, {
          title: v.title.trim(), code: v.code.trim(), teacher: v.teacher.trim(),
          description: v.description.trim(), credits: v.credits.trim(),
          color: v.color, visible: v.visible,
        }));
      }
    } else if (act === "toggle") {
      await commit(() => updateModule(id, { visible: !mod.visible }));
    } else if (act === "delete") {
      if (await confirmDelete()) await commit(() => deleteModule(id));
    }
  });
}
