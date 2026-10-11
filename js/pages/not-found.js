// Friendly 404 for unknown semesters, modules, lessons and routes.
import { t } from "../i18n/i18n.js";

export function notFound() {
  return `
    <div class="container page">
      <div class="empty">
        <span class="empty-mark" aria-hidden="true">?</span>
        <h1 style="font-size: 1.8rem; margin-block-end: 0.5rem;">${t("not_found")}</h1>
        <p>${t("not_found_body")}</p>
        <p style="margin-block-start: 1.25rem;"><a class="btn" href="#/">${t("back_home")}</a></p>
      </div>
    </div>`;
}
