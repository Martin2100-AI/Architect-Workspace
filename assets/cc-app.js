/*
 * Command Center shell: header, nav, hash router, and tab renderers.
 * Overview is fully built. The other eight tabs are reachable but render
 * a "not built yet" placeholder until the paused build is resumed.
 */
(function () {
  "use strict";

  var TABS = [
    { key: "overview", label: "Overview", built: true },
    { key: "outcomes", label: "Outcomes", built: false },
    { key: "users", label: "Users & Use Case", built: false },
    { key: "guardrails", label: "Guardrails", built: false },
    { key: "systems", label: "Systems", built: false },
    { key: "project-management", label: "Project Management", built: false },
    { key: "agents", label: "AI Agents", built: false },
    { key: "knowledge-base", label: "Knowledge Base", built: false },
    { key: "data-model", label: "Data Model", built: false }
  ];

  var BUILD_PAUSED = true;

  var state = {
    plan: null,
    planStatus: null,
    progress: null,
    progressStatus: null,
    manifest: null,
    manifestStatus: null,
    mode: window.CCData.getMode()
  };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === "class") node.className = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else if (k === "text") node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c) node.appendChild(c);
    });
    return node;
  }

  function activeTabKey() {
    var hash = window.location.hash.replace(/^#\/?/, "");
    var key = hash.split("/")[0] || "overview";
    return TABS.some(function (t) { return t.key === key; }) ? key : "overview";
  }

  function effectiveData() {
    if (state.mode === "sample") {
      return {
        plan: window.CCData.sample.plan(),
        progress: window.CCData.sample.progress(),
        manifest: window.CCData.sample.manifest(),
        manifestStatus: { missing: false, error: null }
      };
    }
    return {
      plan: state.plan,
      progress: state.progress,
      manifest: state.manifest,
      manifestStatus: state.manifestStatus
    };
  }

  function renderHeader(root) {
    var data = effectiveData();
    var stamp = window.CCData.describeDataStamp(data.manifest, data.manifestStatus);

    var stampEl = el("div", {
      class: "cc-data-stamp" + (stamp.level === "warn" ? " cc-data-stamp--warn" : "")
    });
    stampEl.textContent = stamp.text;

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
    var current = activeTabKey();
    TABS.forEach(function (t) {
      var a = el("a", { href: "#/" + t.key, text: t.label });
      if (t.key === current) a.className = "is-active";
      nav.appendChild(a);
    });

    root.appendChild(el("div", { class: "cc-header" }, [top, nav]));
  }

  function sampleBanner() {
    if (state.mode !== "sample") return null;
    return el("div", { class: "cc-sample-banner", text: "⚠ SAMPLE DATA — not from your real project" });
  }

  function emptyState(text) {
    return el("div", { class: "cc-empty-state", text: text });
  }

  // ---- Overview tab --------------------------------------------------
  function renderOverview(main) {
    var data = effectiveData();
    var plan = data.plan;
    var progress = data.progress;

    if (BUILD_PAUSED) {
      main.appendChild(el("div", { class: "cc-pause-banner" }, [
        el("strong", { text: "Build paused for review." }),
        el("span", { text: "Overview is built. The other eight tabs are reachable but not built yet. Say “build the rest” to continue." })
      ]));
    }

    var banner = sampleBanner();
    if (banner) main.appendChild(banner);

    main.appendChild(el("h2", { class: "cc-section-title", text: "What this is" }));
    if (plan && plan.project && (plan.project.name || plan.project.descriptor)) {
      main.appendChild(el("div", { class: "cc-card" }, [
        el("p", { class: "cc-card__label", text: plan.project.name || "Project" }),
        el("p", { text: plan.project.descriptor || "" })
      ]));
    } else {
      main.appendChild(emptyState(
        "No project data yet. This section reads plan.project from .colaberry/plan.json, " +
        "which has not been synced from the portal."
      ));
    }

    main.appendChild(el("h2", { class: "cc-section-title", text: "Where you are" }));
    if (plan && plan.schedule) {
      var s = plan.schedule;
      main.appendChild(el("div", { class: "cc-card-grid" }, [
        scheduleCard("Build starts", s.build_start),
        scheduleCard("Build ends", s.build_end),
        scheduleCard("Demo day", s.demo_day),
        scheduleCard("Demo release", s.demo_release_key)
      ]));
    } else {
      main.appendChild(emptyState(
        "No schedule data yet. This section reads plan.schedule from .colaberry/plan.json."
      ));
    }

    main.appendChild(el("h2", { class: "cc-section-title", text: "Headline counts" }));
    if (progress && progress.totals) {
      var t = progress.totals;
      main.appendChild(el("div", { class: "cc-card-grid" }, [
        countCard("Stories verified", t.stories_verified, t.stories_total),
        countCard("Criteria passed", t.criteria_passed, t.criteria_total),
        pointsCard("Points awarded", t.points_awarded)
      ]));
    } else {
      main.appendChild(emptyState(
        "No progress data yet. This section reads progress.totals from .colaberry/progress.json, " +
        "which is written by the portal as work is verified — nothing has been verified yet."
      ));
    }
  }

  function scheduleCard(label, value) {
    return el("div", { class: "cc-card" }, [
      el("p", { class: "cc-card__label", text: label }),
      value
        ? el("p", { class: "cc-card__value", text: value, style: "font-size:16px" })
        : el("p", { class: "cc-card__value cc-card__value--empty", text: "not set" })
    ]);
  }

  function countCard(label, num, denom) {
    var known = typeof num === "number" && typeof denom === "number";
    return el("div", { class: "cc-card" }, [
      el("p", { class: "cc-card__label", text: label }),
      known
        ? el("p", { class: "cc-card__value", text: num + " of " + denom })
        : el("p", { class: "cc-card__value cc-card__value--empty", text: "no data yet" })
    ]);
  }

  function pointsCard(label, points) {
    return el("div", { class: "cc-card" }, [
      el("p", { class: "cc-card__label", text: label }),
      typeof points === "number"
        ? el("p", { class: "cc-card__value", text: String(points) })
        : el("p", { class: "cc-card__value cc-card__value--empty", text: "no data yet" })
    ]);
  }

  // ---- Not-built placeholder ------------------------------------------
  function renderNotBuilt(main, tab) {
    main.appendChild(el("div", { class: "cc-not-built" }, [
      el("p", { text: "\"" + tab.label + "\" is not built yet." }),
      el("p", { html: "Say <code>build the rest</code> when Overview looks right, and this tab gets built next." })
    ]));
  }

  // ---- Routing ---------------------------------------------------------
  function setMode(mode) {
    state.mode = mode;
    window.CCData.setMode(mode);
    render();
  }

  function render() {
    var root = document.getElementById("app-root");
    root.innerHTML = "";
    renderHeader(root);

    var main = el("main", { class: "cc-main" });
    var tabKey = activeTabKey();
    var tab = TABS.filter(function (t) { return t.key === tabKey; })[0];

    if (tab.key === "overview") {
      renderOverview(main);
    } else {
      renderNotBuilt(main, tab);
    }

    root.appendChild(main);
  }

  window.addEventListener("hashchange", render);

  window.CCData.loadAll().then(function (result) {
    state.plan = result.plan;
    state.planStatus = result.planStatus;
    state.progress = result.progress;
    state.progressStatus = result.progressStatus;
    state.manifest = result.manifest;
    state.manifestStatus = result.manifestStatus;
    render();
  }).catch(function () {
    // Even a total data-layer failure still renders the shell and an
    // honest empty state, rather than a blank page.
    render();
  });
})();
