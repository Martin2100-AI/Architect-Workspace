/*
 * Command Center shell: header, nav, hash router, and shared UI helpers.
 * Each tab lives in its own assets/cc-tab-*.js file and registers itself
 * into window.CCTabs; this file only knows how to dispatch to whichever
 * tab is active.
 */
(function (global) {
  "use strict";

  var TABS = [
    { key: "overview", label: "Overview" },
    { key: "outcomes", label: "Outcomes" },
    { key: "users", label: "Users & Use Case" },
    { key: "guardrails", label: "Guardrails" },
    { key: "systems", label: "Systems" },
    { key: "project-management", label: "Project Management" },
    { key: "agents", label: "AI Agents" },
    { key: "knowledge-base", label: "Knowledge Base" },
    { key: "data-model", label: "Data Model" }
  ];

  var state = {
    plan: null, planStatus: null,
    progress: null, progressStatus: null,
    manifest: null, manifestStatus: null,
    mode: global.CCData.getMode()
  };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === "class") node.className = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else if (k === "text") node.textContent = attrs[k];
      else if (k === "on") Object.keys(attrs.on).forEach(function (ev) { node.addEventListener(ev, attrs.on[ev]); });
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function parseHash() {
    var raw = global.location.hash.replace(/^#\/?/, "");
    var parts = raw.split("/");
    var tabKey = parts[0] || "overview";
    if (!TABS.some(function (t) { return t.key === tabKey; })) tabKey = "overview";
    var subId = parts[1] !== undefined ? decodeURIComponent(parts[1]) : null;
    return { tabKey: tabKey, subId: subId };
  }

  function goTo(tabKey, subId) {
    global.location.hash = "#/" + tabKey + (subId !== undefined && subId !== null ? "/" + encodeURIComponent(subId) : "");
  }

  function effectiveData() {
    if (state.mode === "sample") {
      return {
        plan: global.CCData.sample.plan(),
        progress: global.CCData.sample.progress(),
        manifest: global.CCData.sample.manifest(),
        manifestStatus: { missing: false, error: null }
      };
    }
    return { plan: state.plan, progress: state.progress, manifest: state.manifest, manifestStatus: state.manifestStatus };
  }

  function emptyState(text) { return el("div", { class: "cc-empty-state", text: text }); }
  function sectionTitle(text) { return el("h2", { class: "cc-section-title", text: text }); }

  function breadcrumb(tabKey, tabLabel, current) {
    var back = el("a", { href: "#/" + tabKey, text: "← " + tabLabel });
    return el("div", { class: "cc-breadcrumb" }, [back, current ? document.createTextNode(" / " + current) : null]);
  }

  function cardLink(tabKey, id, label, valueText, extra, opts) {
    var isText = opts && opts.text;
    var kids = [
      el("p", { class: "cc-card__label", text: label }),
      el("p", { class: "cc-card__value" + (isText ? " cc-card__value--text" : ""), text: valueText })
    ];
    if (extra) kids.push(extra);
    return el("a", { class: "cc-card", href: "#/" + tabKey + "/" + encodeURIComponent(id) }, kids);
  }

  function statusDot(level) {
    var cls = "cc-status-dot";
    if (level === "ok") cls += " cc-status-dot--ok";
    else if (level === "warn") cls += " cc-status-dot--warn";
    else if (level === "bad") cls += " cc-status-dot--bad";
    return el("span", { class: cls });
  }

  function pill(text) { return el("span", { class: "cc-pill", text: text }); }

  function verificationLabel(v) { return (!v || !v.state) ? "no data yet" : v.state.replace("_", " "); }
  function verificationLevel(v) {
    if (!v || !v.state) return "unknown";
    if (v.state === "verified") return "ok";
    if (v.state === "not_started") return "bad";
    return "warn";
  }

  function truncate(s, n) {
    if (!s || s.length <= n) return s || "";
    var cut = s.slice(0, n - 1);
    var lastSpace = cut.lastIndexOf(" ");
    if (lastSpace > n * 0.6) cut = cut.slice(0, lastSpace);
    return cut + "…";
  }
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function renderHeader(root, tabKey) {
    var data = effectiveData();
    var stamp = global.CCData.describeDataStamp(data.manifest, data.manifestStatus);
    var stampEl = el("div", { class: "cc-data-stamp" + (stamp.level === "warn" ? " cc-data-stamp--warn" : ""), text: stamp.text });

    var sampleBtn = el("button", { text: "Sample" });
    var realBtn = el("button", { text: "Real" });
    sampleBtn.className = state.mode === "sample" ? "is-active" : "";
    realBtn.className = state.mode === "real" ? "is-active" : "";
    sampleBtn.addEventListener("click", function () { setMode("sample"); });
    realBtn.addEventListener("click", function () { setMode("real"); });
    var toggle = el("div", { class: "cc-mode-toggle" }, [sampleBtn, realBtn]);

    var top = el("div", { class: "cc-header__top" }, [
      el("div", {}, [
        el("p", { class: "cc-header__title", text: "Keysy — Command Center" }),
        el("p", { class: "cc-header__subtitle", text: "Home Buying App — build & delivery tracking" })
      ]),
      el("div", {}, [stampEl, el("div", { style: "height:8px" }), toggle])
    ]);

    var nav = el("div", { class: "cc-nav" });
    TABS.forEach(function (t) {
      var a = el("a", { href: "#/" + t.key, text: t.label });
      if (t.key === tabKey) a.className = "is-active";
      nav.appendChild(a);
    });

    root.appendChild(el("div", { class: "cc-header" }, [top, nav]));
  }

  function sampleBanner() {
    if (state.mode !== "sample") return null;
    return el("div", { class: "cc-sample-banner", text: "⚠ SAMPLE DATA — not from your real project" });
  }

  function setMode(mode) {
    state.mode = mode;
    global.CCData.setMode(mode);
    render();
  }

  function render() {
    var root = document.getElementById("app-root");
    root.innerHTML = "";
    var route = parseHash();
    renderHeader(root, route.tabKey);

    var main = el("main", { class: "cc-main" });
    var banner = sampleBanner();
    if (banner) main.appendChild(banner);

    var data = effectiveData();
    var tabFn = (global.CCTabs && global.CCTabs[route.tabKey]) || (global.CCTabs && global.CCTabs.overview);
    if (tabFn) tabFn(main, data, route.subId);
    else main.appendChild(emptyState("This tab failed to load."));

    root.appendChild(main);
  }

  global.addEventListener("hashchange", render);

  global.CCUI = {
    el: el, goTo: goTo, effectiveData: effectiveData,
    emptyState: emptyState, sectionTitle: sectionTitle, breadcrumb: breadcrumb, cardLink: cardLink,
    statusDot: statusDot, pill: pill, verificationLabel: verificationLabel, verificationLevel: verificationLevel,
    truncate: truncate, escapeRe: escapeRe
  };

  global.CCTabs = global.CCTabs || {};

  global.CCData.loadAll().then(function (result) {
    state.plan = result.plan; state.planStatus = result.planStatus;
    state.progress = result.progress; state.progressStatus = result.progressStatus;
    state.manifest = result.manifest; state.manifestStatus = result.manifestStatus;
    render();
  }).catch(function () { render(); });
})(window);
