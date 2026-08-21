(function (global) {
  "use strict";
  var UI = global.CCUI;

  // Every Overview card drills down to a detail view, even ones with no
  // data behind them yet — same rule as every other tab.
  var OVERVIEW_ITEMS = {
    "project": { label: "Project", source: "plan.project", get: function (p) { return p && p.project; } },
    "build-start": { label: "Build starts", source: "plan.schedule.build_start", get: function (p) { return p && p.schedule && { value: p.schedule.build_start }; } },
    "build-end": { label: "Build ends", source: "plan.schedule.build_end", get: function (p) { return p && p.schedule && { value: p.schedule.build_end }; } },
    "demo-day": { label: "Demo day", source: "plan.schedule.demo_day", get: function (p) { return p && p.schedule && { value: p.schedule.demo_day }; } },
    "demo-release": { label: "Demo release", source: "plan.schedule.demo_release_key", get: function (p) { return p && p.schedule && { value: p.schedule.demo_release_key }; } },
    "stories-verified": { label: "Stories verified", source: "progress.totals, or derived from plan.stories + progress.stories criteria", get: function (p, pr, t) { return t && { value: t.stories_verified + " of " + t.stories_total }; } },
    "criteria-passed": { label: "Criteria passed", source: "progress.totals, or derived from plan.stories + progress.stories criteria", get: function (p, pr, t) { return t && { value: t.criteria_passed + " of " + t.criteria_total }; } },
    "points-awarded": { label: "Points awarded", source: "progress.totals.points_awarded", get: function (p, pr, t) { return t && typeof t.points_awarded === "number" && { value: String(t.points_awarded) }; } }
  };

  function render(main, data, subId) {
    var plan = data.plan, progress = data.progress;

    if (subId) {
      var def = OVERVIEW_ITEMS[subId];
      main.appendChild(UI.breadcrumb("overview", "Overview", def ? def.label : subId));
      if (!def) { main.appendChild(UI.emptyState("Unknown overview item.")); return; }
      main.appendChild(UI.el("h1", { class: "cc-detail-title", text: def.label }));
      var result = def.get(plan, progress, global.CCData.computeTotals(plan, progress));
      if (subId === "project" && result) {
        main.appendChild(UI.el("div", { class: "cc-card" }, [
          UI.el("p", { class: "cc-card__label", text: result.name || "Project" }),
          UI.el("p", { text: result.descriptor || "" })
        ]));
      } else if (result && result.value) {
        main.appendChild(UI.el("div", { class: "cc-card" }, [UI.el("p", { class: "cc-card__value", text: result.value })]));
      } else {
        main.appendChild(UI.emptyState("No data yet for this item. It reads " + def.source + " from .colaberry/plan.json / progress.json."));
      }
      return;
    }

    main.appendChild(UI.sectionTitle("What this is"));
    if (plan && plan.project && (plan.project.name || plan.project.descriptor)) {
      main.appendChild(UI.cardLink("overview", "project", plan.project.name || "Project", UI.truncate(plan.project.descriptor || "", 90), null, { text: true }));
    } else {
      main.appendChild(UI.emptyState("No project data yet. This section reads plan.project from .colaberry/plan.json, which has not been synced from the portal."));
      main.appendChild(UI.el("a", { class: "cc-breadcrumb", href: "#/overview/project", text: "See detail →" }));
    }

    main.appendChild(UI.sectionTitle("Where you are"));
    var s = plan && plan.schedule;
    main.appendChild(UI.el("div", { class: "cc-card-grid" }, [
      UI.cardLink("overview", "build-start", "Build starts", (s && s.build_start) || "not set"),
      UI.cardLink("overview", "build-end", "Build ends", (s && s.build_end) || "not set"),
      UI.cardLink("overview", "demo-day", "Demo day", (s && s.demo_day) || "not set"),
      UI.cardLink("overview", "demo-release", "Demo release", (s && s.demo_release_key) || "not set")
    ]));
    if (!s) main.appendChild(UI.emptyState("No schedule data yet. This section reads plan.schedule from .colaberry/plan.json."));

    main.appendChild(UI.sectionTitle("Headline counts"));
    var t = global.CCData.computeTotals(plan, progress);
    main.appendChild(UI.el("div", { class: "cc-card-grid" }, [
      UI.cardLink("overview", "stories-verified", "Stories verified", t ? (t.stories_verified + " of " + t.stories_total) : "no data yet"),
      UI.cardLink("overview", "criteria-passed", "Criteria passed", t ? (t.criteria_passed + " of " + t.criteria_total) : "no data yet"),
      UI.cardLink("overview", "points-awarded", "Points awarded", (t && typeof t.points_awarded === "number") ? String(t.points_awarded) : "no data yet")
    ]));
    if (!t) main.appendChild(UI.emptyState("No progress data yet. This section reads progress.totals from .colaberry/progress.json, which is written by the portal as work is verified — nothing has been verified yet."));
  }

  global.CCTabs = global.CCTabs || {};
  global.CCTabs.overview = render;
})(window);
