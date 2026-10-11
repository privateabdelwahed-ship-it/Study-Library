// Shared announcement UI: field definitions, file pills, link pills,
// and the upload/add helpers. Used by the home notice board AND by
// module pages (module-scoped announcements).
import { t } from "../i18n/i18n.js";
import { esc, formatSize } from "./format.js";
import { icons } from "./icons.js";
import {
  getAnnouncementFiles, getAnnouncementLinks,
  uploadAnnouncementFile, createAnnouncementLink,
} from "../data/store.js";
import { toast } from "../components/toast.js";
import { notifyChange } from "./editmode.js";
import { openModal } from "../components/modal.js";
import { commit } from "./edit-ui.js";

// Same file types as the lesson upload.
export const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.zip";

export function announcementFields(a = {}) {
  return [
    { key: "titleEn", label: t("f_title_en"), type: "text", value: a.title?.en || "", required: true },
    { key: "titleAr", label: t("f_title_ar"), type: "text", value: a.title?.ar || "" },
    { key: "bodyEn", label: t("f_body_en"), type: "textarea", value: a.body?.en || "" },
    { key: "bodyAr", label: t("f_body_ar"), type: "textarea", value: a.body?.ar || "" },
    { key: "files", label: t("f_files"), type: "file", accept: ACCEPT,
      hint: t("upload_hint", { n: 50 }) },
  ];
}

// Upload files chosen in the announcement modal, with a progress toast per file.
export async function uploadFilesToAnnouncement(announcementId, files) {
  const list = (files || []).filter((f) => f && f.size > 0);
  for (let i = 0; i < list.length; i++) {
    try {
      toast(t("uploading_file", { n: i + 1, total: list.length }));
      await uploadAnnouncementFile(announcementId, list[i]);
    } catch (err) {
      toast(err && err.message ? err.message : String(err), "error");
    }
  }
  if (list.length) notifyChange();
}

// Files attached to an announcement (the class timetable, a circular, …).
// Students get download pills; in edit mode each file gets a delete button.
export function announcementFilesHtml(a, editing) {
  const files = getAnnouncementFiles(a.id);
  if (!files.length) return "";
  return `<ul class="ann-files">${files.map((f) => `
    <li>
      <a class="ann-file" href="${esc(f.url)}" download="${esc(f.name)}">
        ${icons.download()}<span>${esc(f.name)}</span><span class="ann-file-size">${formatSize(f.sizeBytes)}</span>
      </a>
      ${editing ? `<button class="icon-btn" data-annfile-del="${f.id}" aria-label="${esc(t("delete"))}" title="${esc(t("delete"))}">${icons.trash()}</button>` : ""}
    </li>`).join("")}</ul>`;
}

// Links attached to an announcement. In edit mode: delete per link + add button.
export function announcementLinksHtml(a, editing) {
  const links = getAnnouncementLinks(a.id);
  if (!links.length && !editing) return "";
  return `
    ${editing ? `<p class="ann-addlink"><button class="btn" data-annlink-add="${a.id}">${icons.plus()} ${t("add_link")}</button></p>` : ""}
    ${links.length ? `<ul class="ann-links">${links.map((l) => `
      <li>
        <a class="ann-link" href="${esc(l.url)}" target="_blank" rel="noopener">
          ${icons.external()}<span>${esc(l.title)}</span>
        </a>
        ${editing ? `<button class="icon-btn" data-annlink-del="${l.id}" aria-label="${esc(t("delete"))}" title="${esc(t("delete"))}">${icons.trash()}</button>` : ""}
      </li>`).join("")}</ul>` : ""}`;
}

// Modal + create for a new link on an announcement.
export async function addLinkToAnnouncement(announcementId) {
  const v = await openModal({
    title: t("add_link"),
    fields: [
      { key: "title", label: t("f_title"), type: "text", value: "", placeholder: t("link_title_ph") },
      { key: "url", label: t("f_url"), type: "text", value: "", required: true },
    ],
    submitLabel: t("add"),
  });
  if (v && v.url.trim()) {
    await commit(() => createAnnouncementLink(announcementId, { title: v.title.trim(), url: v.url.trim() }));
  }
}
