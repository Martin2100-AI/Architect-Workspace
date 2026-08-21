(function (global) {
  "use strict";
  var UI = global.CCUI;

  function render(main, data, subId) {
    var guardrails = data.plan && data.plan.derived && data.plan.derived.guardrails;
    var requirements = (data.plan && data.plan.requirements) || [];
    var progressStories = (data.progress && data.progress.stories) || [];

    function coverage(g) {
      var req = requirements.filter(function (r) { return r.id === g.id; })[0];
      var storyIds = (req && req.fulfilled_by) || [];
      var states = storyIds.map(function (id) {
        var p = progressStories.filter(function (s) { return s.id === id; })[0];
        var v = global.CCData.deriveVerification(p);
        return { id: id, state: v && v.state };
      });
      var allVerified = states.length > 0 && states.every(function (s) { return s.state === "verified"; });
      var level = states.length === 0 ? "bad" : allVerified ? "ok" : "warn";
      return { req: req, storyIds: storyIds, states: states, level: level };
    }

    if (subId) {
      var g = (guardrails || []).filter(function (x) { return x.id === subId; })[0];
      main.appendChild(UI.breadcrumb("guardrails", "Guardrails", subId));
      if (!g) { main.appendChild(UI.emptyState("This guardrail was not found in the current plan data.")); return; }
      var cov = coverage(g);
      main.appendChild(UI.el("h1", { class: "cc-detail-title", text: g.id }));
      main.appendChild(UI.el("div", { class: "cc-card", style: "margin-bottom:16px" }, [UI.el("p", { text: g.statement })]));
      if (!cov.storyIds.length) {
        main.appendChild(UI.emptyState("No story fulfills this requirement yet. This is a promise the project has made and not yet kept."));
      } else {
        var tbl = UI.el("table", { class: "cc-table" }, [
          UI.el("thead", {}, [UI.el("tr", {}, [UI.el("th", { text: "Story" }), UI.el("th", { text: "Verification state" })])]),
          UI.el("tbody", {}, cov.states.map(function (s) {
            return UI.el("tr", {}, [UI.el("td", { text: s.id }), UI.el("td", {}, [UI.statusDot(UI.verificationLevel({ state: s.state })), document.createTextNode(s.state || "no data yet")])]);
          }))
        ]);
        main.appendChild(tbl);
        if (cov.level !== "ok") {
          main.appendChild(UI.el("p", { style: "margin-top:12px; color:var(--cc-status-warn)", text: "This guardrail is a promise the project has made and not yet fully kept." }));
        }
      }
      return;
    }

    main.appendChild(UI.sectionTitle("What must never happen"));
    if (!guardrails || !guardrails.length) {
      main.appendChild(UI.emptyState("No guardrails defined yet. This reads plan.derived.guardrails from .colaberry/plan.json. If your plan has no SAFE-kind requirement, that's worth fixing before the build goes further."));
      return;
    }
    var grid = UI.el("div", { class: "cc-card-grid" });
    guardrails.forEach(function (g) {
      var cov = coverage(g);
      grid.appendChild(UI.cardLink("guardrails", g.id, g.id, UI.truncate(g.statement, 70), UI.pill(cov.level === "ok" ? "enforced" : cov.level === "warn" ? "in progress" : "not yet enforced"), { text: true }));
    });
    main.appendChild(grid);
  }

  global.CCTabs = global.CCTabs || {};
  global.CCTabs.guardrails = render;
})(window);
