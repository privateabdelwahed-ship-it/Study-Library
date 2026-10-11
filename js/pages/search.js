// Search results: lessons and modules whose titles or descriptions
// match, grouped under their own headings.
import { t } from "../i18n/i18n.js";
import { searchLessons, isNew } from "../data/store.js";
import { esc, timeAgo } from "../lib/format.js";

export function render({ q = "" }) {
  const query = q.trim();
  const { lessons, modules } = searchLessons(query);

  const lessonItems = lessons
    .map((l) => `
      <li class="ruled-row">
        <div class="row-main">
          <a class="row-title" href="#/s/${l.semester.slug}/${l.module.slug}/${l.slug}">${esc(l.title)}</a>
          <div class="row-sub">
            <span>${esc(l.semester.title)} · ${esc(l.module.title)}</span>
            <span>${timeAgo(l.createdAt)}</span>
            ${isNew(l.createdAt) ? `<span class="tag-new">${t("new_tag")}</span>` : ""}
          </div>
        </div>
      </li>`)
    .join("");

  const moduleItems = modules
    .map((m) => `
      <li class="ruled-row">
        <div class="row-main">
          <a class="row-title" href="#/s/${m.semester.slug}/${m.slug}">${esc(m.title)}</a>
          <div class="row-sub"><span>${esc(m.semester.title)} · ${t("semester_word")}</span></div>
        </div>
      </li>`)
    .join("");

  const body = lessons.length || modules.length
    ? `
      ${lessons.length ? `<h2 class="section-label">${t("results_lessons")}</h2><ul class="ruled-list" style="margin-block-end:2rem;">${lessonItems}</ul>` : ""}
      ${modules.length ? `<h2 class="section-label">${t("results_modules")}</h2><ul class="ruled-list">${moduleItems}</ul>` : ""}`
    : `
      <div class="empty">
        <span class="empty-mark" aria-hidden="true">§</span>
        <p>${t("no_results", { q: query })}</p>
        <p>${t("no_results_hint")}</p>
      </div>`;

  return `
    <div class="container page">
      <header class="page-head">
        <p class="overline">${t("search_label")}</p>
        <h1>${query ? t("results_for", { q: esc(query) }) : t("search_label")}</h1>
        <div class="rule-double" aria-hidden="true"></div>
      </header>
      ${body}
    </div>`;
}
