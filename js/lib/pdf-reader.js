// PDF reader built on PDF.js — with OUR toolbar, never the default
// viewer UI (its look doesn't belong here).
//
//   const reader = await createPdfReader(el, "assets/file.pdf", {
//     initialPage: 3,
//     fitWidth: true,                 // default ON for narrow screens
//     onPage: ({ page, pageCount }) => { … },
//     onError: (err) => { … },        // show the download fallback
//   });
//   reader.goToPage(5); reader.zoomIn(); reader.setFit(true); reader.destroy();
//
// Performance: pages render lazily. An IntersectionObserver draws a page
// only when it scrolls near the viewport, so a 200-page file never
// freezes a phone. Zooming re-renders only the pages you can see.
// A load that never settles (blocked CDN, stalled network, …) must not
// leave a blank reader forever — race it against a timeout.
function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function createPdfReader(mountEl, fileUrl, opts = {}) {
  const {
    initialPage = 1,
    fitWidth = true,
    onPage = () => {},
    onError = () => {},
    loadTimeoutMs = 20000,
  } = opts;

  if (!window.pdfjsLib) {
    onError(new Error("PDF engine failed to load."));
    return null;
  }

  let pdf;
  try {
    pdf = await withTimeout(
      window.pdfjsLib.getDocument(fileUrl).promise,
      loadTimeoutMs,
      "PDF load timed out."
    );
  } catch (err) {
    onError(err);
    return null;
  }

  const pageCount = pdf.numPages;
  const pagesEl = document.createElement("div");
  pagesEl.className = "pdf-pages";
  mountEl.appendChild(pagesEl);

  const state = {
    page: Math.min(Math.max(Math.round(initialPage) || 1, 1), pageCount),
    fit: fitWidth,
    manual: 1,      // scale used when fit-width is off
    scale: 1,       // scale actually used for rendering right now
    rendered: new Map(), // pageNum -> { token, task }
    destroyed: false,
  };

  // Page 1 lends its aspect ratio to every placeholder; each page
  // corrects its own ratio once rendered (pages can differ).
  const firstViewport = (await pdf.getPage(1)).getViewport({ scale: 1 });
  const fallbackAspect = firstViewport.height / firstViewport.width;

  const wrappers = [];
  for (let n = 1; n <= pageCount; n++) {
    const w = document.createElement("div");
    w.className = "pdf-page";
    w.dataset.page = n;
    w.style.aspectRatio = `1 / ${fallbackAspect}`;
    w.innerHTML = `<div class="page-loading" aria-hidden="true">${n}</div>`;
    pagesEl.appendChild(w);
    wrappers.push(w);
  }

  function computeScale() {
    if (!state.fit) return state.manual;
    const avail = pagesEl.clientWidth - 32; // minus the container padding
    return Math.max(avail / firstViewport.width, 0.2);
  }

  async function renderPage(n) {
    if (state.destroyed || state.rendered.has(n)) return;
    const token = Math.random();
    state.rendered.set(n, { token, task: null });
    const w = wrappers[n - 1];
    try {
      const page = await pdf.getPage(n);
      // Zoom changed while we were fetching? Drop this render.
      if (state.destroyed || state.rendered.get(n)?.token !== token) return;
      const viewport = page.getViewport({ scale: state.scale });
      w.style.aspectRatio = `${viewport.width} / ${viewport.height}`;

      const dpr = Math.min(window.devicePixelRatio || 1, 2.5); // crisp, not wasteful
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const task = page.render({ canvasContext: ctx, viewport });
      state.rendered.get(n).task = task;
      await task.promise;
      if (state.destroyed || state.rendered.get(n)?.token !== token) return;
      w.innerHTML = "";
      w.appendChild(canvas);
    } catch {
      // A single broken page never breaks the whole reader.
      if (!state.destroyed && !w.querySelector("canvas")) {
        w.innerHTML = `<div class="page-loading" aria-hidden="true">–</div>`;
      }
    }
  }

  function resetPages() {
    for (const [, info] of state.rendered) {
      try { info.task?.cancel(); } catch { /* already finished */ }
    }
    state.rendered.clear();
    wrappers.forEach((w, i) => {
      w.innerHTML = `<div class="page-loading" aria-hidden="true">${i + 1}</div>`;
      w.style.aspectRatio = `1 / ${fallbackAspect}`;
    });
  }

  function applyScale() {
    state.scale = computeScale();
    resetPages(); // the observer below redraws whatever is visible
  }

  // Draw pages only when they scroll near the viewport…
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) renderPage(+e.target.dataset.page);
    },
    { root: pagesEl, rootMargin: "400px 0px" }
  );

  // …and report which page the reader is looking at.
  const ioPage = new IntersectionObserver(
    (entries) => {
      let best = 0, bestRatio = 0;
      for (const e of entries) {
        if (e.intersectionRatio > bestRatio) {
          bestRatio = e.intersectionRatio;
          best = +e.target.dataset.page;
        }
      }
      if (best && best !== state.page) {
        state.page = best;
        onPage({ page: best, pageCount });
      }
    },
    { root: pagesEl, threshold: [0.3, 0.6] }
  );

  wrappers.forEach((w) => { io.observe(w); ioPage.observe(w); });

  let resizeTimer;
  function onResize() {
    if (!state.fit || state.destroyed) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyScale, 200);
  }
  window.addEventListener("resize", onResize);

  // First paint.
  state.scale = computeScale();
  onPage({ page: state.page, pageCount });
  requestAnimationFrame(() => {
    if (!state.destroyed && state.page > 1) goToPage(state.page);
  });

  function goToPage(n) {
    const target = Math.min(Math.max(Math.round(n) || 1, 1), pageCount);
    wrappers[target - 1].scrollIntoView({ block: "start", behavior: "auto" });
  }

  return {
    get pageCount() { return pageCount; },
    get page() { return state.page; },
    get fit() { return state.fit; },
    percent() { return Math.round(state.scale * 100); },
    goToPage,
    zoomIn() {
      // Leaving fit mode? Start zooming from the current fit scale,
      // so the first click doesn't jump the page size.
      if (state.fit) { state.fit = false; state.manual = state.scale; }
      state.manual = Math.min(state.manual * 1.25, 4);
      applyScale();
    },
    zoomOut() {
      if (state.fit) { state.fit = false; state.manual = state.scale; }
      state.manual = Math.max(state.manual / 1.25, 0.35);
      applyScale();
    },
    setFit(on) {
      state.fit = !!on;
      applyScale();
    },
    destroy() {
      state.destroyed = true;
      io.disconnect();
      ioPage.disconnect();
      window.removeEventListener("resize", onResize);
      mountEl.innerHTML = "";
    },
  };
}
