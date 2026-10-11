// One small line-icon set, used sparingly. All icons share the same
// voice: 24×24, 1.5px stroke, round caps and joins, currentColor.
function svg(inner) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

export const icons = {
  search: () => svg(`<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/>`),
  bookmark: () => svg(`<path d="M6 3h12v18l-6-4.2L6 21z"/>`),
  check: () => svg(`<path d="M4 12.5 9.5 18 20 6.5"/>`),
  download: () => svg(`<path d="M12 4v11m0 0-4-4m4 4 4-4"/><path d="M4 20h16"/>`),
  chevronLeft: () => svg(`<path d="M14.5 6 8.5 12l6 6"/>`),
  chevronRight: () => svg(`<path d="M9.5 6l6 6-6 6"/>`),
  zoomIn: () => svg(`<circle cx="11" cy="11" r="7"/><path d="M11 8v6M8 11h6"/><path d="M16.5 16.5 21 21"/>`),
  zoomOut: () => svg(`<circle cx="11" cy="11" r="7"/><path d="M8 11h6"/><path d="M16.5 16.5 21 21"/>`),
  // "fit to width": corners pulling inward
  fit: () => svg(`<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>`),
  // fullscreen: corners pushing outward
  expand: () => svg(`<path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/>`),
  x: () => svg(`<path d="M6 6l12 12M18 6 6 18"/>`),
  menu: () => svg(`<path d="M4 7h16M4 12h16M4 17h16"/>`),
  globe: () => svg(`<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"/>`),
  moon: () => svg(`<path d="M20 13.5A8 8 0 1 1 10.5 4 6.5 6.5 0 0 0 20 13.5z"/>`),
  sun: () => svg(`<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>`),
  file: () => svg(`<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v4h4"/>`),
  external: () => svg(`<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M20 14v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6"/>`),
  arrowLeft: () => svg(`<path d="M19 12H5m0 0 6-6m-6 6 6 6"/>`),
  arrowRight: () => svg(`<path d="M5 12h14m0 0-6-6m6 6-6 6"/>`),
  clock: () => svg(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>`),
  alert: () => svg(`<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.2" r="0.4" fill="currentColor"/>`),
  // ---- edit-mode set: same 24×24 / 1.5px voice ----
  pencil: () => svg(`<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/><path d="M14.5 6.5l3 3"/>`),
  trash: () => svg(`<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v6M14 11v6"/>`),
  eye: () => svg(`<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>`),
  eyeOff: () => svg(`<path d="M3 3l18 18"/><path d="M10.6 5.9A10.5 10.5 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a18 18 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1.1 0 2.2-.2 3.2-.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>`),
  plus: () => svg(`<path d="M12 5v14M5 12h14"/>`),
  arrowUp: () => svg(`<path d="M12 19V5m0 0-6 6m6-6 6 6"/>`),
  arrowDown: () => svg(`<path d="M12 5v14m0 0 6-6m-6 6-6-6"/>`),
  sliders: () => svg(`<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2.2"/><circle cx="9" cy="16" r="2.2"/>`),
  upload: () => svg(`<path d="M12 15V4m0 0L8 8m4-4 4 4"/><path d="M4 20h16"/>`),
  restore: () => svg(`<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>`),
};
