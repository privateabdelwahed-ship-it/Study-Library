// Generic modal form builder, in the site's bold visual language.
//
//   const values = await openModal({
//     title: t("edit_module"),
//     fields: [
//       { key: "title", label: t("f_title"), type: "text", value: mod.title },
//       { key: "color", label: t("f_color"), type: "colors", value: mod.color },
//       { key: "visible", label: t("f_visible"), type: "checkbox", value: mod.visible },
//     ],
//     submitLabel: t("save"),
//   });
//   if (values) await updateModule(mod.id, values);   // null = cancelled
//
// Field types: text | textarea | select | checkbox | number | colors.
// The "colors" type renders the 8 fixed swatches (no free color picker —
// the site stays consistent and nobody can pick blue or purple).
import { t } from "../i18n/i18n.js";
import { esc } from "../lib/format.js";
import { icons } from "../lib/icons.js";

export const SWATCHES = [
  "#2F5D46", "#BF5B33", "#D6A23A", "#9C2F2A",
  "#7B7A2F", "#8C5A3C", "#8AA17A", "#3B3631",
];

function fieldHTML(f) {
  const val = f.value ?? "";
  switch (f.type) {
    case "textarea":
      return `<label class="m-field"><span>${esc(f.label)}</span>
        <textarea name="${esc(f.key)}" rows="${f.rows || 4}" placeholder="${esc(f.placeholder || "")}">${esc(val)}</textarea></label>`;
    case "select":
      return `<label class="m-field"><span>${esc(f.label)}</span>
        <select name="${esc(f.key)}">${(f.options || [])
          .map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(val) ? "selected" : ""}>${esc(o.label)}</option>`)
          .join("")}</select></label>`;
    case "checkbox":
      return `<label class="m-check"><input type="checkbox" name="${esc(f.key)}" ${val ? "checked" : ""}><span>${esc(f.label)}</span></label>`;
    case "number":
      return `<label class="m-field"><span>${esc(f.label)}</span>
        <input type="number" name="${esc(f.key)}" value="${esc(val)}"></label>`;
    case "colors":
      return `<div class="m-field"><span>${esc(f.label)}</span>
        <div class="swatches" role="radiogroup" aria-label="${esc(f.label)}">
          ${SWATCHES.map((c) => `<button type="button" class="swatch" data-color="${c}" style="background:${c}"
            aria-pressed="${c.toLowerCase() === String(val).toLowerCase()}" aria-label="${c}"></button>`).join("")}
        </div>
        <input type="hidden" name="${esc(f.key)}" value="${esc(val || SWATCHES[0])}"></div>`;
    case "file":
      return `<label class="m-field"><span>${esc(f.label)}</span>
        <input type="file" name="${esc(f.key)}" ${f.multiple === false ? "" : "multiple"} accept="${esc(f.accept || "")}">
        ${f.hint ? `<small class="m-hint">${esc(f.hint)}</small>` : ""}</label>`;
    default:
      return `<label class="m-field"><span>${esc(f.label)}</span>
        <input type="text" name="${esc(f.key)}" value="${esc(val)}" placeholder="${esc(f.placeholder || "")}"
        ${f.required ? "required" : ""}></label>`;
  }
}

export function openModal({ title, body, fields = [], submitLabel, danger = false }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-head">
          <h2>${esc(title)}</h2>
          <button type="button" class="icon-btn" data-m="cancel" aria-label="${esc(t("dismiss"))}">${icons.x()}</button>
        </div>
        <form novalidate>
          ${body ? `<div class="m-body">${body}</div>` : ""}
          ${fields.map(fieldHTML).join("")}
          <div class="modal-foot">
            <button type="button" class="btn" data-m="cancel">${esc(t("cancel"))}</button>
            <button type="submit" class="btn ${danger ? "btn-danger" : "btn-primary"}">${esc(submitLabel || t("save"))}</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(overlay);
    const form = overlay.querySelector("form");

    const close = (result) => {
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      resolve(result);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); close(null); }
    };
    document.addEventListener("keydown", onKey, true);
    overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) close(null); });
    overlay.querySelectorAll('[data-m="cancel"]').forEach((b) => b.addEventListener("click", () => close(null)));

    const hidden = form.querySelector('input[type="hidden"]');
    overlay.querySelectorAll(".swatch").forEach((s) =>
      s.addEventListener("click", () => {
        overlay.querySelectorAll(".swatch").forEach((x) => x.setAttribute("aria-pressed", "false"));
        s.setAttribute("aria-pressed", "true");
        if (hidden) hidden.value = s.dataset.color;
      })
    );

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const values = {};
      fd.forEach((v, k) => { values[k] = v; });
      // File inputs: collect every chosen file (FormData alone keeps only the last one).
      form.querySelectorAll('input[type="file"]').forEach((inp) => {
        values[inp.name] = Array.from(inp.files || []);
      });
      form.querySelectorAll('input[type="checkbox"]').forEach((c) => { values[c.name] = c.checked; });
      close(values);
    });

    const first = form.querySelector('input[type="text"], textarea, select');
    if (first) first.focus();
  });
}

// A destructive confirm built on the same modal. Resolves true/false.
export async function confirmModal({ title, body, confirmLabel }) {
  const r = await openModal({ title, body, fields: [], submitLabel: confirmLabel || t("delete"), danger: true });
  return r !== null;
}
