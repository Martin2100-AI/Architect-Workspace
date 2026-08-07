/* Shared rendering, navigation, search, illustrations, and the Ask agent.
   Classic script — references the global `BLUEPRINT` binding from blueprint.js
   directly (not window.BLUEPRINT, since a top-level const isn't a window prop). */

/* ---------- small utilities ---------- */

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

function layerLabel(layer) {
  return { frontend: "Frontend", backend: "Backend / API", database: "Database", ai: "AI Layer", gate: "Decision Gate" }[layer] || layer;
}

function sectionTitle(id) {
  const s = BLUEPRINT.sections.find(function (x) { return x.id === id; });
  return s ? s.title : "";
}

function wrapLines(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  words.forEach(function (w) {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  });
  if (cur) lines.push(cur);
  return lines;
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

/* ---------- theme ---------- */

function isDarkMode() {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr) return attr === "dark";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function initTheme() {
  const saved = localStorage.getItem("bp_theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
}

function wireThemeToggle() {
  document.getElementById("theme-toggle").addEventListener("click", function () {
    const next = isDarkMode() ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("bp_theme", next);
    rerenderActiveFigures();
  });
}

/* ---------- chrome: header, nav, breadcrumbs, footer, panels ---------- */

function footerHTML(page) {
  const idx = BLUEPRINT.sections.findIndex(function (s) { return s.id === page; });
  const prev = idx > 0 ? BLUEPRINT.sections[idx - 1] : null;
  const next = idx >= 0 && idx < BLUEPRINT.sections.length - 1 ? BLUEPRINT.sections[idx + 1] : null;
  const prevCard = prev
    ? `<a class="nav-link-card" href="${prev.file}"><div class="nlc-label">&larr; Previous</div><div class="nlc-title">${escapeHtml(prev.title)}</div></a>`
    : `<a class="nav-link-card command-center" href="index.html"><div class="nlc-label">Back to</div><div class="nlc-title">Command Center</div></a>`;
  const midCard = `<a class="nav-link-card command-center" href="index.html"><div class="nlc-label">&uarr; Hub</div><div class="nlc-title">Command Center</div></a>`;
  const nextCard = next
    ? `<a class="nav-link-card next" href="${next.file}"><div class="nlc-label">Next &rarr;</div><div class="nlc-title">${escapeHtml(next.title)}</div></a>`
    : "";
  return `<div class="section-footer">${prevCard}${midCard}${nextCard}</div>`;
}

function buildChrome() {
  const page = document.body.dataset.page;
  const isIndex = page === "index";
  const root = document.getElementById("app-root");
  const navLinks = BLUEPRINT.sections.map(function (s) {
    return `<a href="${s.file}" class="${page === s.id ? "active" : ""}">${escapeHtml(s.title)}</a>`;
  }).join("");
  root.innerHTML = `
    <div id="scroll-progress"></div>
    <header class="site-header">
      <div class="header-row">
        <div class="brand"><a class="home-link" href="index.html" style="color:inherit;text-decoration:none;">${escapeHtml(BLUEPRINT.meta.projectName)}<span class="brand-sub">Command Center</span></a></div>
        <nav class="top-nav" aria-label="Sections">${!isIndex ? '<a href="index.html">&larr; Command Center</a>' : ""}${navLinks}</nav>
        <div class="header-controls">
          <div class="search-box">
            <input id="search-input" type="search" placeholder="Search everything..." aria-label="Search the whole blueprint">
            <div id="search-dropdown"></div>
          </div>
          <button class="icon-btn" id="theme-toggle" aria-label="Toggle dark mode">Theme</button>
          <button class="icon-btn" id="print-btn" aria-label="Print this page">Print</button>
        </div>
      </div>
    </header>
    ${!isIndex ? `<div class="breadcrumbs"><a href="index.html">Command Center</a> / ${escapeHtml(sectionTitle(page))}</div>` : ""}
    <main id="main-content"></main>
    ${!isIndex ? footerHTML(page) : ""}
    <button id="back-to-top" aria-label="Back to top">&uarr;</button>
    <button class="ask-toggle" id="ask-toggle">Ask</button>
    <div class="ask-panel" id="ask-panel">
      <div class="ask-header"><strong>Ask the Blueprint</strong><button class="icon-btn" id="ask-close" aria-label="Close ask panel">&times;</button></div>
      <div class="ask-mode-switch">
        <button id="ask-mode-search" class="active">Search (no key)</button>
        <button id="ask-mode-claude">Claude (needs key)</button>
      </div>
      <div class="ask-key-row" id="ask-key-row">
        <input type="password" id="ask-api-key" placeholder="sk-ant-... (stored only in this browser)">
        <select id="ask-model">
          <option value="claude-opus-5">claude-opus-5</option>
          <option value="claude-sonnet-5">claude-sonnet-5</option>
          <option value="claude-haiku-4-5">claude-haiku-4-5</option>
        </select>
        <select id="ask-scope">
          <option value="section">This section</option>
          <option value="all">Whole blueprint</option>
        </select>
        <div class="ask-key-hint">Your key stays in this browser's local storage and is sent only to api.anthropic.com.</div>
      </div>
      <div class="ask-results" id="ask-results"><div class="search-empty">Ask anything about this design. Search mode works offline, with no key.</div></div>
      <div class="ask-input-row">
        <input type="text" id="ask-input" placeholder="e.g. what happens if the photo is unclear?">
        <button id="ask-submit">Ask</button>
      </div>
    </div>
    <div id="fullscreen-modal">
      <div class="fs-toolbar">
        <button id="fs-zoom-out" aria-label="Zoom out">&minus;</button>
        <button id="fs-zoom-reset" aria-label="Reset zoom">Reset</button>
        <button id="fs-zoom-in" aria-label="Zoom in">+</button>
        <button id="fs-close" aria-label="Close">Close (Esc)</button>
      </div>
      <div class="fs-viewport"><div class="fs-viewport-inner"></div></div>
    </div>
  `;
}

/* ---------- scroll progress / back to top / print ---------- */

function initScrollProgress() {
  const bar = document.getElementById("scroll-progress");
  function update() {
    const h = document.documentElement;
    const scrollTop = h.scrollTop || document.body.scrollTop;
    const scrollHeight = (h.scrollHeight || document.body.scrollHeight) - h.clientHeight;
    bar.style.width = (scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0) + "%";
  }
  document.addEventListener("scroll", update);
  update();
}

function initBackToTop() {
  const btn = document.getElementById("back-to-top");
  document.addEventListener("scroll", function () {
    btn.classList.toggle("show", window.scrollY > 400);
  });
  btn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function wirePrintButton() {
  document.getElementById("print-btn").addEventListener("click", function () {
    window.print();
  });
}

/* ---------- figure registry: powers both inline rendering and fullscreen expand ---------- */

const figureRenderers = {};
let activeFigures = [];
let fsZoom = 1;

function registerFigure(id, title, caption, renderFn) {
  figureRenderers[id] = { title: title, caption: caption, renderFn: renderFn };
}

function mountFigure(containerEl, id) {
  const spec = figureRenderers[id];
  if (!spec || !containerEl) return;
  containerEl.classList.add("figure");
  containerEl.innerHTML = `
    <div class="figure-header">
      <h3>${escapeHtml(spec.title)}</h3>
      <button class="icon-btn figure-expand-btn" data-figure-id="${id}" aria-label="Expand ${escapeHtml(spec.title)} full screen">&#10530; Expand</button>
    </div>
    <div class="figure-body"></div>
    <div class="figure-caption">${escapeHtml(spec.caption)}</div>
  `;
  const body = containerEl.querySelector(".figure-body");
  spec.renderFn(body);
  activeFigures.push({ id: id, el: body });
}

function rerenderActiveFigures() {
  activeFigures.forEach(function (f) {
    const spec = figureRenderers[f.id];
    if (spec) spec.renderFn(f.el);
  });
}

function wireFullscreenModal() {
  document.addEventListener("click", function (e) {
    const btn = e.target.closest(".figure-expand-btn");
    if (btn) { openFullscreen(btn.dataset.figureId); return; }
    if (e.target.id === "fs-close" || e.target.id === "fullscreen-modal") { closeFullscreen(); return; }
    if (e.target.id === "fs-zoom-in") { setZoom(fsZoom + 0.2); return; }
    if (e.target.id === "fs-zoom-out") { setZoom(fsZoom - 0.2); return; }
    if (e.target.id === "fs-zoom-reset") { setZoom(1); return; }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeFullscreen();
  });
}

function openFullscreen(id) {
  const spec = figureRenderers[id];
  if (!spec) return;
  const modal = document.getElementById("fullscreen-modal");
  const inner = modal.querySelector(".fs-viewport-inner");
  inner.innerHTML = "";
  spec.renderFn(inner);
  fsZoom = 1;
  inner.style.transform = "scale(1)";
  modal.classList.add("open");
}

function closeFullscreen() {
  document.getElementById("fullscreen-modal").classList.remove("open");
}

function setZoom(z) {
  fsZoom = Math.max(0.4, Math.min(3, z));
  const inner = document.querySelector(".fs-viewport-inner");
  if (inner) inner.style.transform = "scale(" + fsZoom + ")";
}

/* ---------- mermaid ---------- */

function runMermaid(el) {
  if (typeof mermaid === "undefined") {
    el.innerHTML = '<p class="figure-caption">Mermaid did not load (no internet on first load?). The raw diagram source is in architecture.md.</p>';
    return;
  }
  try {
    mermaid.initialize({ startOnLoad: false, theme: isDarkMode() ? "dark" : "default", securityLevel: "loose", fontFamily: "Segoe UI, system-ui, sans-serif" });
    el.removeAttribute("data-processed");
    mermaid.run({ nodes: [el] });
  } catch (e) {
    el.innerHTML = '<p class="figure-caption">Diagram failed to render: ' + escapeHtml(e.message) + "</p>";
  }
}

function mermaidFigureRenderer(src) {
  return function (container) {
    container.innerHTML = "";
    const div = document.createElement("div");
    div.className = "mermaid";
    div.textContent = src;
    container.appendChild(div);
    runMermaid(div);
  };
}

/* ---------- inline SVG illustrations, generated from BLUEPRINT ---------- */

function arrowMarkerDefs() {
  return '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" style="fill:var(--muted)" /></marker></defs>';
}

function pipelineRenderer() {
  return function (container) {
    container.innerHTML = `
    <svg viewBox="0 0 760 220" class="svg-illustration" role="img" aria-label="Customer input flows through matching and decision to an approve or escalate outcome">
      ${arrowMarkerDefs()}
      <rect x="20" y="70" width="180" height="80" rx="10" class="svg-frontend" />
      <text x="110" y="100" text-anchor="middle" class="svg-on-accent" font-size="13" font-weight="700">Customer Input</text>
      <text x="110" y="120" text-anchor="middle" class="svg-on-accent" font-size="10">photo, description,</text>
      <text x="110" y="134" text-anchor="middle" class="svg-on-accent" font-size="10">receipt number</text>

      <line x1="200" y1="110" x2="270" y2="110" stroke="var(--muted)" stroke-width="2" marker-end="url(#arrow)" />

      <rect x="280" y="50" width="220" height="120" rx="10" class="svg-ai" />
      <text x="390" y="80" text-anchor="middle" class="svg-on-accent" font-size="13" font-weight="700">Matching Engine +</text>
      <text x="390" y="98" text-anchor="middle" class="svg-on-accent" font-size="13" font-weight="700">Decision Engine</text>
      <text x="390" y="122" text-anchor="middle" class="svg-on-accent" font-size="10">in-window? matched?</text>
      <text x="390" y="136" text-anchor="middle" class="svg-on-accent" font-size="10">defect covered?</text>

      <line x1="500" y1="90" x2="560" y2="50" stroke="var(--muted)" stroke-width="2" marker-end="url(#arrow)" />
      <line x1="500" y1="130" x2="560" y2="170" stroke="var(--muted)" stroke-width="2" marker-end="url(#arrow)" />

      <rect x="570" y="15" width="170" height="60" rx="10" class="svg-gate" />
      <text x="655" y="40" text-anchor="middle" class="svg-on-accent" font-size="12" font-weight="700">Auto-approve</text>
      <text x="655" y="56" text-anchor="middle" class="svg-on-accent" font-size="10">all 3 checks pass</text>

      <rect x="570" y="140" width="170" height="60" rx="10" class="svg-warn-fill" />
      <text x="655" y="165" text-anchor="middle" class="svg-on-accent" font-size="12" font-weight="700">Escalate</text>
      <text x="655" y="181" text-anchor="middle" class="svg-on-accent" font-size="10">to CS agent</text>
    </svg>`;
  };
}

function layersRenderer() {
  return function (container) {
    const order = ["frontend", "backend", "database", "ai", "gate"];
    const byLayer = {};
    BLUEPRINT.components.forEach(function (c) { (byLayer[c.layer] = byLayer[c.layer] || []).push(c); });
    const rowH = 60, gap = 10, boxW = 210, boxH = 40;
    let y = 10;
    const rows = [];
    order.forEach(function (layer) {
      const items = byLayer[layer];
      if (!items) return;
      rows.push({ layer: layer, items: items, y: y });
      y += rowH;
    });
    const width = 780, height = y + 10;
    let svg = `<svg viewBox="0 0 ${width} ${height}" class="svg-illustration" role="img" aria-label="Components grouped by layer">`;
    rows.forEach(function (row) {
      svg += `<text x="10" y="${row.y + 28}" class="svg-muted-text" font-size="12" font-weight="700">${escapeHtml(layerLabel(row.layer))}</text>`;
      let x = 160;
      row.items.forEach(function (c) {
        svg += `<rect x="${x}" y="${row.y + 5}" width="${boxW}" height="${boxH}" rx="8" class="svg-${row.layer}" />`;
        svg += `<text x="${x + boxW / 2}" y="${row.y + 5 + boxH / 2 + 4}" text-anchor="middle" class="svg-on-accent" font-size="11" font-weight="600">${escapeHtml(c.name)}</text>`;
        x += boxW + gap;
      });
    });
    svg += "</svg>";
    container.innerHTML = svg;
  };
}

function ribbonRenderer() {
  return function (container) {
    const steps = BLUEPRINT.dataFlow;
    const n = steps.length;
    const boxW = 110, gap = 14;
    const width = n * boxW + (n - 1) * gap + 20;
    const height = 90;
    let svg = `<svg viewBox="0 0 ${width} ${height}" class="svg-illustration" role="img" aria-label="Numbered steps from submission to decision, colored by AI involvement">`;
    svg += `<line x1="${10 + boxW / 2}" y1="30" x2="${10 + (n - 1) * (boxW + gap) + boxW / 2}" y2="30" stroke="var(--border)" stroke-width="2" />`;
    steps.forEach(function (s, i) {
      const cx = 10 + i * (boxW + gap) + boxW / 2;
      svg += `<circle cx="${cx}" cy="30" r="16" class="${s.aiTouched ? "svg-ai" : "svg-neutral-bg"}" />`;
      svg += `<text x="${cx}" y="35" text-anchor="middle" class="${s.aiTouched ? "svg-on-accent" : "svg-text"}" font-size="13" font-weight="700">${s.step}</text>`;
      svg += `<text x="${cx}" y="64" text-anchor="middle" class="svg-text" font-size="10" font-weight="600">${escapeHtml(truncate(s.title, 16))}</text>`;
    });
    svg += `<text x="10" y="${height - 6}" class="svg-muted-text" font-size="10">Teal = AI-touched step</text>`;
    svg += "</svg>";
    container.innerHTML = svg;
  };
}

function timelineRenderer() {
  return function (container) {
    const phases = BLUEPRINT.buildPhases;
    const totalWeeks = Math.max.apply(null, phases.map(function (p) { return p.startWeek + p.weeks; }));
    const width = 780, barH = 34, gap = 12, leftLabelW = 220;
    const chartW = width - leftLabelW - 20;
    const height = phases.length * (barH + gap) + 10;
    let svg = `<svg viewBox="0 0 ${width} ${height}" class="svg-illustration" role="img" aria-label="Build phases sized proportionally by duration, make-or-break phase highlighted">`;
    phases.forEach(function (p, i) {
      const y = 6 + i * (barH + gap);
      const x = leftLabelW + (p.startWeek / totalWeeks) * chartW;
      const w = (p.weeks / totalWeeks) * chartW;
      svg += `<text x="0" y="${y + barH / 2 + 4}" class="svg-text" font-size="11" font-weight="${p.makeOrBreak ? "700" : "600"}">${escapeHtml(truncate("Phase " + p.phase + ": " + p.name, 34))}</text>`;
      svg += `<rect x="${x}" y="${y}" width="${w}" height="${barH}" rx="6" class="${p.makeOrBreak ? "svg-good-fill" : "svg-neutral-bg"}" />`;
      svg += `<text x="${x + 8}" y="${y + barH / 2 + 4}" class="${p.makeOrBreak ? "svg-on-accent" : "svg-text"}" font-size="10">${p.weeks} wk${p.weeks > 1 ? "s" : ""}${p.makeOrBreak ? " — make-or-break" : ""}</text>`;
    });
    svg += "</svg>";
    container.innerHTML = svg;
  };
}

function forkRenderer() {
  return function (container) {
    const oq = BLUEPRINT.openQuestion;
    const width = 720;
    const qLines = wrapLines(oq.question, 62);
    const headerH = 20 + qLines.length * 16;
    const forkTopY = 14 + headerH;
    const branchTopY = forkTopY + 18;
    const maxImp = Math.max(oq.branchA.implications.length, oq.branchB.implications.length);
    const branchH = 34 + maxImp * 15;
    const height = branchTopY + branchH + 10;
    const boxW = width * 0.42;
    let svg = `<svg viewBox="0 0 ${width} ${height}" class="svg-illustration" role="img" aria-label="Open question forking into two branches">`;
    svg += `<rect x="60" y="10" width="${width - 120}" height="${headerH}" rx="10" class="svg-warn-fill" />`;
    qLines.forEach(function (line, i) {
      svg += `<text x="${width / 2}" y="${10 + 22 + i * 16}" text-anchor="middle" class="svg-text" font-size="12" font-weight="700">${escapeHtml(line)}</text>`;
    });
    svg += `<line x1="${width * 0.28}" y1="${forkTopY}" x2="${width * 0.28}" y2="${branchTopY}" stroke="var(--muted)" stroke-width="2" />`;
    svg += `<line x1="${width * 0.72}" y1="${forkTopY}" x2="${width * 0.72}" y2="${branchTopY}" stroke="var(--muted)" stroke-width="2" />`;

    svg += `<rect x="${width * 0.06}" y="${branchTopY}" width="${boxW}" height="${branchH}" rx="10" class="svg-neutral-bg" />`;
    svg += `<text x="${width * 0.06 + 12}" y="${branchTopY + 20}" class="svg-text" font-size="12" font-weight="700">${escapeHtml(oq.branchA.label)}</text>`;
    oq.branchA.implications.forEach(function (imp, i) {
      svg += `<text x="${width * 0.06 + 12}" y="${branchTopY + 40 + i * 15}" class="svg-muted-text" font-size="10">- ${escapeHtml(truncate(imp, 56))}</text>`;
    });

    svg += `<rect x="${width * 0.52}" y="${branchTopY}" width="${boxW}" height="${branchH}" rx="10" class="svg-neutral-bg" />`;
    svg += `<text x="${width * 0.52 + 12}" y="${branchTopY + 20}" class="svg-text" font-size="12" font-weight="700">${escapeHtml(oq.branchB.label)}</text>`;
    oq.branchB.implications.forEach(function (imp, i) {
      svg += `<text x="${width * 0.52 + 12}" y="${branchTopY + 40 + i * 15}" class="svg-muted-text" font-size="10">- ${escapeHtml(truncate(imp, 56))}</text>`;
    });
    svg += "</svg>";
    container.innerHTML = svg;
  };
}

function gridRenderer() {
  return function (container) {
    const items = BLUEPRINT.coverage.map(function (c) {
      const comp = BLUEPRINT.components.find(function (x) { return x.id === c.componentId; });
      return Object.assign({}, c, { name: comp.name });
    });
    const cols = 3, cellW = 240, cellH = 90, gap = 14;
    const rows = Math.ceil(items.length / cols);
    const width = cols * cellW + (cols - 1) * gap + 10;
    const height = rows * cellH + (rows - 1) * gap + 10;
    let svg = `<svg viewBox="0 0 ${width} ${height}" class="svg-illustration" role="img" aria-label="Coverage grid by component, color-coded by guarantee status">`;
    items.forEach(function (it, i) {
      const col = i % cols, row = Math.floor(i / cols);
      const x = 5 + col * (cellW + gap), y = 5 + row * (cellH + gap);
      const cls = it.guaranteesDay1 ? "svg-good-fill" : (it.openQuestion ? "svg-warn-fill" : "svg-neutral-bg");
      const textCls = (it.guaranteesDay1 || it.openQuestion) ? "svg-on-accent" : "svg-text";
      const line3 = it.guaranteesDay1 ? "Guarantees day-1 requirement" : (it.openQuestion ? "Depends on the open question" : "Supporting role");
      svg += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="8" class="${cls}" />`;
      svg += `<text x="${x + 12}" y="${y + 24}" class="${textCls}" font-size="12" font-weight="700">${escapeHtml(it.name)}</text>`;
      svg += `<text x="${x + 12}" y="${y + 46}" class="${textCls}" font-size="10">Built in Phase ${it.builtInPhase}</text>`;
      svg += `<text x="${x + 12}" y="${y + 64}" class="${textCls}" font-size="10">${escapeHtml(line3)}</text>`;
    });
    svg += "</svg>";
    container.innerHTML = svg;
  };
}

function coverageChartRenderer() {
  return function (container) {
    container.innerHTML = "";
    if (typeof Chart === "undefined") {
      container.innerHTML = '<p class="figure-caption">Chart.js did not load (no internet on first load?).</p>';
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.height = 200;
    container.appendChild(canvas);
    const guarantees = BLUEPRINT.coverage.filter(function (c) { return c.guaranteesDay1; }).length;
    const openQ = BLUEPRINT.coverage.filter(function (c) { return c.openQuestion; }).length;
    const supporting = BLUEPRINT.coverage.length - guarantees - openQ;
    const styles = getComputedStyle(document.documentElement);
    const good = styles.getPropertyValue("--good").trim();
    const warn = styles.getPropertyValue("--warn").trim();
    const neutral = styles.getPropertyValue("--neutral").trim();
    const text = styles.getPropertyValue("--text").trim();
    const border = styles.getPropertyValue("--border").trim();
    new Chart(canvas, {
      type: "bar",
      data: {
        labels: ["Guarantees day-1 requirement", "Depends on open question", "Supporting role"],
        datasets: [{ data: [guarantees, openQ, supporting], backgroundColor: [good, warn, neutral] }]
      },
      options: {
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: text, precision: 0 }, grid: { color: border } },
          y: { ticks: { color: text }, grid: { display: false } }
        }
      }
    });
  };
}

function miniPreviewSVG(type) {
  const c = 'class="svg-illustration"';
  switch (type) {
    case "pipeline":
      return `<svg viewBox="0 0 200 80" ${c}><rect x="5" y="25" width="50" height="30" rx="6" class="svg-frontend"/><rect x="75" y="20" width="50" height="40" rx="6" class="svg-ai"/><rect x="145" y="25" width="50" height="30" rx="6" class="svg-good-fill"/><line x1="55" y1="40" x2="75" y2="40" stroke="var(--muted)" stroke-width="2"/><line x1="125" y1="40" x2="145" y2="40" stroke="var(--muted)" stroke-width="2"/></svg>`;
    case "layers":
      return `<svg viewBox="0 0 200 80" ${c}><rect x="5" y="8" width="190" height="14" rx="4" class="svg-frontend"/><rect x="5" y="28" width="190" height="14" rx="4" class="svg-backend"/><rect x="5" y="48" width="120" height="14" rx="4" class="svg-ai"/><rect x="5" y="66" width="80" height="10" rx="4" class="svg-gate"/></svg>`;
    case "graph":
      return `<svg viewBox="0 0 200 80" ${c}><circle cx="20" cy="40" r="10" class="svg-frontend"/><circle cx="90" cy="15" r="10" class="svg-ai"/><circle cx="90" cy="65" r="10" class="svg-gate"/><circle cx="170" cy="40" r="10" class="svg-backend"/><line x1="28" y1="35" x2="82" y2="20" stroke="var(--muted)" stroke-width="2"/><line x1="28" y1="45" x2="82" y2="60" stroke="var(--muted)" stroke-width="2"/><line x1="98" y1="20" x2="162" y2="38" stroke="var(--muted)" stroke-width="2"/><line x1="98" y1="60" x2="162" y2="42" stroke="var(--muted)" stroke-width="2"/></svg>`;
    case "ribbon":
      return `<svg viewBox="0 0 200 80" ${c}><line x1="20" y1="40" x2="180" y2="40" stroke="var(--border)" stroke-width="2"/>${[20, 60, 100, 140, 180].map(function (cx, i) { return `<circle cx="${cx}" cy="40" r="10" class="${i === 1 ? "svg-ai" : "svg-neutral-bg"}"/>`; }).join("")}</svg>`;
    case "timeline":
      return `<svg viewBox="0 0 200 80" ${c}>${[10, 25, 40, 55, 70].map(function (y, i) { return `<rect x="${10 + i * 15}" y="${y - 5}" width="${140 - i * 15}" height="10" rx="3" class="${i === 1 ? "svg-good-fill" : "svg-neutral-bg"}"/>`; }).join("")}</svg>`;
    case "fork":
      return `<svg viewBox="0 0 200 80" ${c}><rect x="60" y="5" width="80" height="20" rx="6" class="svg-warn-fill"/><line x1="80" y1="25" x2="40" y2="45" stroke="var(--muted)" stroke-width="2"/><line x1="120" y1="25" x2="160" y2="45" stroke="var(--muted)" stroke-width="2"/><rect x="10" y="45" width="60" height="28" rx="6" class="svg-neutral-bg"/><rect x="130" y="45" width="60" height="28" rx="6" class="svg-neutral-bg"/></svg>`;
    case "grid":
      return `<svg viewBox="0 0 200 80" ${c}>${[0, 1, 2, 3, 4, 5].map(function (i) { const col = i % 3, row = Math.floor(i / 3); const cls = i === 0 ? "svg-good-fill" : (i === 3 ? "svg-warn-fill" : "svg-neutral-bg"); return `<rect x="${5 + col * 65}" y="${5 + row * 38}" width="60" height="33" rx="5" class="${cls}"/>`; }).join("")}</svg>`;
    default:
      return "";
  }
}

/* ---------- page renderers ---------- */

function countLabel(id) {
  switch (id) {
    case "summary": return BLUEPRINT.components.length + " components";
    case "components": return BLUEPRINT.components.length + " components, " + BLUEPRINT.omittedComponents.length + " omitted";
    case "diagram": return (BLUEPRINT.diagrams.architecture.match(/-->/g) || []).length + " connections";
    case "dataflow": return BLUEPRINT.dataFlow.length + " steps";
    case "buildorder": return BLUEPRINT.buildPhases.length + " phases";
    case "assumptions": return BLUEPRINT.assumptions.length + " assumptions";
    case "coverage": return BLUEPRINT.notCovered.length + " not covered";
    default: return "";
  }
}

function renderIndex() {
  const main = document.getElementById("main-content");
  main.innerHTML = `
    <div class="hero">
      <h1>${escapeHtml(BLUEPRINT.meta.projectName)} — Command Center</h1>
      <p>${escapeHtml(BLUEPRINT.meta.tagline)}</p>
      <div class="must-do-well"><span class="label">Must do well on day one</span><div>${escapeHtml(BLUEPRINT.meta.mustDoWell)}</div></div>
    </div>
    <div class="tile-grid" id="tile-grid"></div>
  `;
  const grid = document.getElementById("tile-grid");
  BLUEPRINT.sections.forEach(function (s) {
    const a = document.createElement("a");
    a.className = "tile";
    a.href = s.file;
    a.innerHTML = `
      <div class="tile-svg">${miniPreviewSVG(s.preview)}</div>
      <div class="tile-title">${escapeHtml(s.title)}</div>
      <div class="tile-desc">${escapeHtml(s.description)}</div>
      <span class="tile-count">${escapeHtml(countLabel(s.id))}</span>
    `;
    grid.appendChild(a);
  });
}

function renderSummary() {
  const main = document.getElementById("main-content");
  main.innerHTML = `
    <div class="hero">
      <h1>Summary</h1>
      <p class="idea-quote">${escapeHtml(BLUEPRINT.idea)}</p>
      <div class="must-do-well"><span class="label">Must do well on day one</span><div>${escapeHtml(BLUEPRINT.meta.mustDoWell)}</div></div>
    </div>
    <div id="fig-pipeline"></div>
    <div class="card">
      <h3>Where to go next</h3>
      <p>Start with <a href="02-components.html">Components</a> to see exactly which pieces this idea required, then <a href="03-diagram.html">Architecture Diagram</a> to see how they connect.</p>
    </div>
  `;
  registerFigure("pipeline", "The Idea As A Pipeline", "Everything the customer submits flows through one decision point before anything is approved or escalated.", pipelineRenderer());
  mountFigure(document.getElementById("fig-pipeline"), "pipeline");
}

function renderComponents() {
  const main = document.getElementById("main-content");
  const rows = BLUEPRINT.components.map(function (c) {
    const searchText = (c.name + " " + c.sentence + " " + c.words).toLowerCase();
    return `<tr data-search-text="${escapeHtml(searchText)}" id="${c.id}">
      <td><strong>${escapeHtml(c.name)}</strong><br><span class="badge badge-${c.layer}">${escapeHtml(layerLabel(c.layer))}</span></td>
      <td>${escapeHtml(c.sentence)}</td>
      <td class="word-trace">${escapeHtml(c.words)}</td>
    </tr>`;
  }).join("");
  const omitted = BLUEPRINT.omittedComponents.map(function (o) { return "<strong>" + escapeHtml(o.name) + ":</strong> " + escapeHtml(o.reason); }).join("<br>");
  main.innerHTML = `
    <div class="hero"><h1>Components</h1><p>Every component traces back to specific words in the one-paragraph idea. Nothing here is a generic template box.</p></div>
    <div class="card">
      <table class="bp-table">
        <thead><tr><th>Component</th><th>What it does for this project</th><th>Words that required it</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="omitted-note"><strong>Deliberately not included:</strong><br>${omitted}</div>
    </div>
    <div id="fig-layers"></div>
  `;
  registerFigure("layers", "Components By Layer", "Every real component this idea needs, grouped by the role it plays — no padding, no boxes the idea did not ask for.", layersRenderer());
  mountFigure(document.getElementById("fig-layers"), "layers");
}

function renderDiagram() {
  const main = document.getElementById("main-content");
  main.innerHTML = `
    <div class="hero"><h1>Architecture Diagram</h1><p>How the components connect, and what data or decision crosses each arrow.</p></div>
    <div id="fig-architecture"></div>
    <div class="card">
      <h3>Legend</h3>
      <p><span class="badge badge-frontend">Rectangle</span> a service we build &nbsp; <span class="badge badge-database">Cylinder</span> a persistent data store &nbsp; Stadium (rounded) shapes are entry points where a person acts. This design has no third-party hexagons — there is no external service in the loop, only things we build or store ourselves.</p>
    </div>
  `;
  registerFigure("architecture-diagram", "How It Fits Together", "A claim only reaches a platform (approve) or a human (escalate) after passing through one deterministic decision point — there is no third path.", mermaidFigureRenderer(BLUEPRINT.diagrams.architecture));
  mountFigure(document.getElementById("fig-architecture"), "architecture-diagram");
}

function renderDataflow() {
  const main = document.getElementById("main-content");
  const items = BLUEPRINT.dataFlow.map(function (s) {
    const searchText = (s.title + " " + s.description).toLowerCase();
    return `<li data-search-text="${escapeHtml(searchText)}" id="step-${s.step}" style="margin-bottom:4px;">
      <strong>${s.step}. ${escapeHtml(s.title)}</strong>${s.aiTouched ? ' <span class="badge badge-ai">AI-touched</span>' : ""}
      <div>${escapeHtml(s.description)}</div>
    </li>`;
  }).join("");
  main.innerHTML = `
    <div class="hero"><h1>Data Flow</h1><p>A numbered walkthrough of one claim, from submission to a closed decision.</p></div>
    <div id="fig-sequence"></div>
    <div id="fig-ribbon"></div>
    <div class="card"><ol style="display:flex;flex-direction:column;gap:12px;padding-left:20px;">${items}</ol></div>
  `;
  registerFigure("sequence-diagram", "Sequence Diagram", "Every message either moves a claim toward auto-approval or toward a human — never toward guessing.", mermaidFigureRenderer(BLUEPRINT.diagrams.sequence));
  mountFigure(document.getElementById("fig-sequence"), "sequence-diagram");
  registerFigure("ribbon", "Steps Colored By AI Involvement", "Only one step in the whole flow — extracting the defect type — is done by AI; every approve or escalate decision after it is deterministic.", ribbonRenderer());
  mountFigure(document.getElementById("fig-ribbon"), "ribbon");
}

function renderBuildorder() {
  const main = document.getElementById("main-content");
  const items = BLUEPRINT.buildPhases.map(function (p) {
    const searchText = (p.name + " " + p.proves).toLowerCase();
    return `<li data-search-text="${escapeHtml(searchText)}" id="phase-${p.phase}" style="margin-bottom:4px;">
      <strong>Phase ${p.phase}: ${escapeHtml(p.name)}</strong>${p.makeOrBreak ? ' <span class="badge badge-gate">make-or-break</span>' : ""}
      <div><em>Proves:</em> ${escapeHtml(p.proves)}</div>
    </li>`;
  }).join("");
  main.innerHTML = `
    <div class="hero"><h1>Build Order</h1><p>The phases to build this in, and exactly what each phase is meant to prove before moving on.</p></div>
    <div id="fig-gantt"></div>
    <div id="fig-timeline"></div>
    <div class="card"><ol style="display:flex;flex-direction:column;gap:12px;padding-left:20px;">${items}</ol></div>
  `;
  registerFigure("gantt", "Build Order (Gantt)", "Phase 2, the Decision Engine, is deliberately the longest early phase — it is the one thing this project cannot ship without.", mermaidFigureRenderer(BLUEPRINT.diagrams.gantt));
  mountFigure(document.getElementById("fig-gantt"), "gantt");
  registerFigure("timeline", "Phase Timeline, Proportional", "The highlighted bar is the make-or-break phase — everything before it is scaffolding, everything after it is polish.", timelineRenderer());
  mountFigure(document.getElementById("fig-timeline"), "timeline");
}

function renderAssumptions() {
  const main = document.getElementById("main-content");
  const items = BLUEPRINT.assumptions.map(function (a, i) {
    const searchText = (a.assumption + " " + a.impact).toLowerCase();
    return `<div class="assumption-item" data-search-text="${escapeHtml(searchText)}" id="assumption-${i}">
      <div>${escapeHtml(a.assumption)}</div>
      <div class="a-impact"><strong>If wrong:</strong> ${escapeHtml(a.impact)}</div>
    </div>`;
  }).join("");
  const oqSearch = (BLUEPRINT.openQuestion.question + " " + BLUEPRINT.openQuestion.branchA.label + " " + BLUEPRINT.openQuestion.branchB.label).toLowerCase();
  main.innerHTML = `
    <div class="hero"><h1>Assumptions</h1><p>What we assumed to keep the design small, and what breaks if the assumption is wrong.</p></div>
    <div class="card"><div class="assumption-list">${items}</div></div>
    <div id="open-question" data-search-text="${escapeHtml(oqSearch)}"></div>
  `;
  registerFigure("fork", "The Open Question", "Which branch we end up on changes whether the Matching Engine is a cheap text classifier or a full vision model.", forkRenderer());
  mountFigure(document.getElementById("open-question"), "fork");
}

function renderCoverage() {
  const main = document.getElementById("main-content");
  const notCoveredItems = BLUEPRINT.notCovered.map(function (n, i) {
    return `<div class="not-covered-item" data-search-text="${escapeHtml(n.toLowerCase())}" id="not-covered-${i}">${escapeHtml(n)}</div>`;
  }).join("");
  main.innerHTML = `
    <div class="hero"><h1>Coverage &amp; Gaps</h1><p>What this design covers today, honestly measured against what it does not.</p></div>
    <div id="fig-coverage-grid"></div>
    <div class="card">
      <h3>What This Design Does Not Cover</h3>
      <div class="not-covered-list">${notCoveredItems}</div>
    </div>
    <div id="fig-coverage-chart"></div>
  `;
  registerFigure("coverage-grid", "Coverage Grid", "Green means this component is the reason the day-one guarantee holds; amber means its behavior still depends on the open question.", gridRenderer());
  mountFigure(document.getElementById("fig-coverage-grid"), "coverage-grid");
  registerFigure("coverage-chart", "Components By Guarantee Status", "Only one of six components carries the day-one guarantee directly — the rest support it.", coverageChartRenderer());
  mountFigure(document.getElementById("fig-coverage-chart"), "coverage-chart");
}

function renderPage() {
  switch (document.body.dataset.page) {
    case "index": renderIndex(); break;
    case "summary": renderSummary(); break;
    case "components": renderComponents(); break;
    case "diagram": renderDiagram(); break;
    case "dataflow": renderDataflow(); break;
    case "buildorder": renderBuildorder(); break;
    case "assumptions": renderAssumptions(); break;
    case "coverage": renderCoverage(); break;
  }
}

/* ---------- search: one index over the whole BLUEPRINT ---------- */

let SEARCH_INDEX = [];
const STOPWORDS = new Set(["the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "is", "are", "this", "that", "it", "its", "be", "as", "by", "from", "at", "into", "than", "then", "so", "but", "not", "no", "do", "does", "did", "was", "were", "will", "would", "should", "can", "could", "has", "have", "had", "if", "when", "what", "how", "why", "who", "which", "their", "them", "they", "you", "your", "our", "we", "i", "one"]);

function stem(w) {
  w = w.toLowerCase();
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter(function (t) { return !STOPWORDS.has(t); });
}

function initSearchIndex() {
  const entries = [];
  function push(section, title, text, url) {
    entries.push({ section: section, title: title, text: text, url: url, terms: tokenize(title + " " + text) });
  }
  push("summary", "Summary", BLUEPRINT.idea + " " + BLUEPRINT.meta.mustDoWell, "01-summary.html");
  BLUEPRINT.components.forEach(function (c) { push("components", c.name, c.sentence + " " + c.words, "02-components.html#" + c.id); });
  push("diagram", "Architecture Diagram", "How the components connect and what data flows between them.", "03-diagram.html");
  BLUEPRINT.dataFlow.forEach(function (s) { push("dataflow", "Step " + s.step + ": " + s.title, s.description, "04-data-flow.html#step-" + s.step); });
  BLUEPRINT.buildPhases.forEach(function (p) { push("buildorder", "Phase " + p.phase + ": " + p.name, p.proves, "05-build-order.html#phase-" + p.phase); });
  BLUEPRINT.assumptions.forEach(function (a, i) { push("assumptions", "Assumption", a.assumption + " " + a.impact, "06-assumptions.html#assumption-" + i); });
  push("assumptions", "Open Question", BLUEPRINT.openQuestion.question + " " + BLUEPRINT.openQuestion.branchA.label + " " + BLUEPRINT.openQuestion.branchB.label, "06-assumptions.html#open-question");
  BLUEPRINT.notCovered.forEach(function (n, i) { push("coverage", "Not Covered", n, "07-coverage.html#not-covered-" + i); });
  push("coverage", "Coverage Grid", "What each component guarantees, what phase builds it, and whether it touches the open question.", "07-coverage.html");
  entries.forEach(function (e) { e.stems = e.terms.map(stem); });
  SEARCH_INDEX = entries;
}

function searchBlueprint(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const queryTerms = tokenize(q);
  const queryStems = queryTerms.map(stem);
  const results = SEARCH_INDEX.map(function (entry) {
    let score = 0;
    queryTerms.forEach(function (qt, i) {
      const qs = queryStems[i];
      const termHits = entry.terms.filter(function (t) { return t === qt; }).length;
      const stemHits = entry.stems.filter(function (t) { return t === qs; }).length;
      score += termHits * 2;
      if (termHits === 0 && stemHits > 0) score += stemHits;
      if (entry.title.toLowerCase().indexOf(qt) !== -1) score += 3;
    });
    const haystack = (entry.title + " " + entry.text).toLowerCase();
    if (q.length > 2 && haystack.indexOf(q) !== -1) score += 5;
    return { entry: entry, score: score };
  }).filter(function (r) { return r.score > 0; });
  results.sort(function (a, b) { return b.score - a.score; });
  return results.slice(0, 8);
}

function highlightSnippet(entry, query) {
  const text = entry.text;
  const q = query.trim();
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  let snippet;
  if (idx !== -1) {
    const start = Math.max(0, idx - 40);
    snippet = (start > 0 ? "…" : "") + text.slice(start, idx + q.length + 60) + "…";
  } else {
    snippet = text.slice(0, 110) + "…";
  }
  let escaped = escapeHtml(snippet);
  tokenize(query).forEach(function (t) {
    if (t.length < 2) return;
    const re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
    escaped = escaped.replace(re, "<mark>$1</mark>");
  });
  return escaped;
}

function filterCurrentPage(q) {
  const query = q.trim().toLowerCase();
  document.querySelectorAll("[data-search-text]").forEach(function (el) {
    el.style.display = (!query || el.dataset.searchText.indexOf(query) !== -1) ? "" : "none";
  });
}

function wireSearchUI() {
  const input = document.getElementById("search-input");
  const dropdown = document.getElementById("search-dropdown");
  input.addEventListener("input", function () {
    const q = input.value;
    filterCurrentPage(q);
    if (!q.trim()) { dropdown.classList.remove("open"); dropdown.innerHTML = ""; return; }
    const results = searchBlueprint(q);
    dropdown.innerHTML = results.length
      ? results.map(function (r) {
          return `<a class="search-result" href="${r.entry.url}"><div class="sr-section">${escapeHtml(r.entry.section)} &middot; ${escapeHtml(r.entry.title)}</div><div class="sr-snippet">${highlightSnippet(r.entry, q)}</div></a>`;
        }).join("")
      : '<div class="search-empty">No matches. Try different words.</div>';
    dropdown.classList.add("open");
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".search-box")) dropdown.classList.remove("open");
  });
}

/* ---------- Ask panel: Search mode (default, offline) + Claude mode (needs key) ---------- */

function currentSectionData() {
  switch (document.body.dataset.page) {
    case "summary": return { idea: BLUEPRINT.idea, meta: BLUEPRINT.meta };
    case "components": return { components: BLUEPRINT.components, omittedComponents: BLUEPRINT.omittedComponents };
    case "diagram": return { diagram: BLUEPRINT.diagrams.architecture };
    case "dataflow": return { dataFlow: BLUEPRINT.dataFlow, sequence: BLUEPRINT.diagrams.sequence };
    case "buildorder": return { buildPhases: BLUEPRINT.buildPhases, gantt: BLUEPRINT.diagrams.gantt };
    case "assumptions": return { assumptions: BLUEPRINT.assumptions, openQuestion: BLUEPRINT.openQuestion };
    case "coverage": return { coverage: BLUEPRINT.coverage, notCovered: BLUEPRINT.notCovered };
    default: return BLUEPRINT;
  }
}

function wireAskPanel() {
  const toggle = document.getElementById("ask-toggle");
  const panel = document.getElementById("ask-panel");
  const closeBtn = document.getElementById("ask-close");
  const modeSearchBtn = document.getElementById("ask-mode-search");
  const modeClaudeBtn = document.getElementById("ask-mode-claude");
  const keyRow = document.getElementById("ask-key-row");
  const keyInput = document.getElementById("ask-api-key");
  const modelSelect = document.getElementById("ask-model");
  const scopeSelect = document.getElementById("ask-scope");
  const results = document.getElementById("ask-results");
  const input = document.getElementById("ask-input");
  const submit = document.getElementById("ask-submit");
  let mode = "search";

  keyInput.value = localStorage.getItem("bp_anthropic_key") || "";
  modelSelect.value = localStorage.getItem("bp_model") || "claude-opus-5";

  toggle.addEventListener("click", function () { panel.classList.add("open"); input.focus(); });
  closeBtn.addEventListener("click", function () { panel.classList.remove("open"); });

  modeSearchBtn.addEventListener("click", function () {
    mode = "search"; modeSearchBtn.classList.add("active"); modeClaudeBtn.classList.remove("active"); keyRow.classList.remove("show");
  });
  modeClaudeBtn.addEventListener("click", function () {
    mode = "claude"; modeClaudeBtn.classList.add("active"); modeSearchBtn.classList.remove("active"); keyRow.classList.add("show");
  });
  keyInput.addEventListener("change", function () { localStorage.setItem("bp_anthropic_key", keyInput.value); });
  modelSelect.addEventListener("change", function () { localStorage.setItem("bp_model", modelSelect.value); });

  function runSearchAsk(q) {
    const hits = searchBlueprint(q);
    results.innerHTML = hits.length
      ? hits.map(function (r) {
          return `<div class="ar-card"><div class="ar-section">${escapeHtml(r.entry.section)}</div><div>${highlightSnippet(r.entry, q)}</div><a href="${r.entry.url}">Open ${escapeHtml(r.entry.title)} &rarr;</a></div>`;
        }).join("")
      : '<div class="ar-card">No matches in the blueprint for that. Check <a href="07-coverage.html">Coverage &amp; Gaps</a> — the miss might be the answer.</div>';
  }

  function runClaudeAsk(q) {
    const key = keyInput.value.trim();
    if (!key) {
      results.innerHTML = '<div class="ar-card ar-error">Paste your Anthropic API key above first, or switch to Search mode — it works with no key.</div>';
      return;
    }
    const scope = scopeSelect.value;
    const model = modelSelect.value;
    const data = scope === "section" ? currentSectionData() : BLUEPRINT;
    const system = "You are answering questions about a system architecture blueprint called \"" + BLUEPRINT.meta.projectName + "\". Answer ONLY using the following JSON data. If the answer is not in it, say plainly that the blueprint does not cover it.\n\nBLUEPRINT DATA:\n" + JSON.stringify(data);
    results.innerHTML = '<div class="ar-card">Thinking…</div>';
    const body = { model: model, max_tokens: 16000, system: system, messages: [{ role: "user", content: q }] };
    if (model !== "claude-haiku-4-5") body.output_config = { effort: "low" };
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify(body)
    }).then(function (resp) {
      if (!resp.ok) {
        return resp.json().catch(function () { return {}; }).then(function (errBody) {
          throw new Error("HTTP " + resp.status + (errBody && errBody.error ? ": " + errBody.error.message : ""));
        });
      }
      return resp.json();
    }).then(function (data) {
      if (data.stop_reason === "refusal") {
        results.innerHTML = '<div class="ar-card ar-error">Claude declined to answer that. Try rephrasing, or switch to Search mode.</div>';
        return;
      }
      const textBlocks = (data.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; });
      const answer = textBlocks.join("\n\n") || "No text in the response.";
      results.innerHTML = '<div class="ar-card">' + escapeHtml(answer).replace(/\n/g, "<br>") + "</div>";
    }).catch(function (err) {
      const msg = err && err.message ? err.message : "Unknown error.";
      let hint = "Check your API key and try again, or switch to Search mode — it works with no key and no internet.";
      if (/401|403/.test(msg)) hint = "That key looks invalid or unauthorized. Double check it, or switch to Search mode.";
      if (/429/.test(msg)) hint = "Rate limited — wait a moment and retry, or switch to Search mode.";
      results.innerHTML = '<div class="ar-card ar-error">Request failed: ' + escapeHtml(msg) + ". " + hint + "</div>";
    });
  }

  function runAsk() {
    const q = input.value.trim();
    if (!q) return;
    if (mode === "search") runSearchAsk(q); else runClaudeAsk(q);
  }
  submit.addEventListener("click", runAsk);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") runAsk(); });
}

/* ---------- boot ---------- */

document.addEventListener("DOMContentLoaded", function () {
  initTheme();
  buildChrome();
  renderPage();
  initScrollProgress();
  initBackToTop();
  wireThemeToggle();
  wirePrintButton();
  initSearchIndex();
  wireSearchUI();
  wireFullscreenModal();
  wireAskPanel();
});
