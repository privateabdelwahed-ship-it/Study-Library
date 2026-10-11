// About / Help: editable text that lives in the database
// (site_settings.about), plus a contact link.
// In edit mode an "Edit text" button opens en/ar textareas.
import { t, getLang } from "../i18n/i18n.js";
import { getSite, updateSiteSettings } from "../data/store.js";
import { esc } from "../lib/format.js";
import { icons } from "../lib/icons.js";
import { isEditMode } from "../lib/editmode.js";
import { commit } from "../lib/edit-ui.js";
import { openModal } from "../components/modal.js";

export function render() {
  const site = getSite();
  const lang = getLang();
  const editing = isEditMode();
  const paragraphs = String(site.about[lang] || site.about.en || "")
    .split(/\n+/)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("");

  return `
    <div class="container page" style="max-inline-size: 46rem;">
      <header class="page-head">
        <h1>${t("about_heading")}</h1>
        <div class="rule-double" aria-hidden="true"></div>
      </header>
      ${editing ? `<p style="margin-block-end: 1.5rem;"><button class="btn" data-edit="edit-about">${icons.pencil()} ${t("edit_text")}</button></p>` : ""}
      <div class="article" style="margin-block-end: 2rem;">
        <div class="article-inner">${paragraphs}</div>
      </div>
      <a class="btn" href="${esc(site.contact)}">
        <span class="flip-rtl" style="display:inline-flex;" aria-hidden="true">${icons.external()}</span>
        ${t("contact")}
      </a>
    </div>`;
}

export function mount(el) {
  if (!isEditMode()) return;
  el.addEventListener("click", async (e) => {
    const btn = e.target.closest('[data-edit="edit-about"]');
    if (!btn) return;
    const site = getSite();
    const v = await openModal({
      title: t("edit_text"),
      fields: [
        { key: "aboutEn", label: t("f_about_en"), type: "textarea", value: site.about.en || "", rows: 8 },
        { key: "aboutAr", label: t("f_about_ar"), type: "textarea", value: site.about.ar || "", rows: 8 },
      ],
    });
    if (v) {
      await commit(() => updateSiteSettings({ about: { en: v.aboutEn, ar: v.aboutAr } }));
    }
  });
}
