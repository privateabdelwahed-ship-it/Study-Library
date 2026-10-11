// Shared edit-mode UI: mutation wrapper, floating card tools,
// add-buttons and delete confirms. Pages stay thin.
import { t } from "../i18n/i18n.js";
import { icons } from "./icons.js";
import { esc } from "./format.js";
import { toast } from "../components/toast.js";
import { notifyChange } from "./editmode.js";
import { confirmModal } from "../components/modal.js";

// Run an async write: "Saved" toast + re-render on success,
// loud persistent error toast on failure. Returns result or null.
export async function commit(work) {
  try {
    const r = await work();
    toast(t("toast_saved"));
    notifyChange();
    return r;
  } catch (err) {
    toast(err && err.message ? err.message : String(err), "error");
    return null;
  }
}

// Floating tool buttons on a card corner (edit mode only).
// actions: [{ act, label, icon, danger }]
export function editTools(id, kind, actions) {
  return `<div class="edit-tools" data-kind="${esc(kind)}">${actions
    .map((a) => `<button class="icon-btn${a.danger ? " danger" : ""}" data-edit="${a.act}" data-id="${esc(id)}"
      aria-label="${esc(a.label)}" title="${esc(a.label)}">${a.icon}</button>`)
    .join("")}</div>`;
}

export const toolEdit = () => ({ act: "edit", label: t("edit"), icon: icons.pencil() });
export const toolDelete = () => ({ act: "delete", label: t("delete"), icon: icons.trash(), danger: true });
export const toolToggle = (visible) => ({
  act: "toggle",
  label: visible ? t("hide") : t("show"),
  icon: visible ? icons.eyeOff() : icons.eye(),
});

export function addBtn(label, action) {
  return `<button class="btn" data-edit="${action}">${icons.plus()} ${esc(label)}</button>`;
}

// "Delete?" → Trash (soft delete). Resolves true when confirmed.
export function confirmDelete() {
  return confirmModal({
    title: t("confirm_delete_title"),
    body: `<p>${esc(t("confirm_delete_body"))}</p>`,
    confirmLabel: t("delete"),
  });
}
