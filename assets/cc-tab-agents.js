(function (global) {
  "use strict";
  var UI = global.CCUI;

  function renderRealAgents(main, agents, subId) {
    if (subId) {
      var a = agents.filter(function (x) { return x.name === subId; })[0];
      main.appendChild(UI.breadcrumb("agents", "AI Agents", subId));
      if (!a) { main.appendChild(UI.emptyState("This agent was not found in the current plan data.")); return; }
      main.appendChild(UI.el("h1", { class: "cc-detail-title", text: a.name }));
      main.appendChild(UI.el("div", { class: "cc-card" }, [
        UI.el("p", { text: a.purpose || "" }),
        UI.el("p", { class: "cc-card__label", text: "Trigger: " + (a.trigger_type || "not set") + (a.trigger ? " — " + a.trigger : "") }),
        UI.el("p", { class: "cc-card__label", text: "Autonomy: " + (a.autonomy_level || "not set") }),
        UI.el("p", { class: "cc-card__label", text: "Skills: " + (a.skills && a.skills.length ? a.skills.join(", ") : "no skills registered yet") }),
        UI.el("p", { class: "cc-card__label", text: "Run history: no runs recorded" })
      ]));
      return;
    }
    main.appendChild(UI.sectionTitle("AI agents"));
    var grid = UI.el("div", { class: "cc-card-grid" });
    agents.forEach(function (a) { grid.appendChild(UI.cardLink("agents", a.name, a.autonomy_level || "agent", a.name)); });
    main.appendChild(grid);
  }

  function render(main, data, subId) {
    var plan = data.plan;
    var agents = (plan && plan.agents) || [];
    var progress = data.progress;

    if (agents.length) { renderRealAgents(main, agents, subId); return; }

    // No scoped agent roster yet — fall back to story ownership, if the
    // plan carries it. These are owners, not scoped agents.
    var stories = (plan && plan.stories) || [];
    var hasOwners = stories.some(function (s) { return s.owner; });
    if (!hasOwners) {
      main.appendChild(UI.sectionTitle("AI agents"));
      main.appendChild(UI.emptyState("No agent roster or story ownership defined yet. This reads plan.agents (or, as a fallback, an owner field on plan.stories) from .colaberry/plan.json."));
      return;
    }

    var byOwner = {};
    stories.forEach(function (s) {
      if (!s.owner) return;
      (byOwner[s.owner] = byOwner[s.owner] || []).push(s);
    });

    if (subId) {
      main.appendChild(UI.breadcrumb("agents", "AI Agents", subId));
      var owned = byOwner[subId] || [];
      main.appendChild(UI.el("h1", { class: "cc-detail-title", text: subId }));
      main.appendChild(UI.el("p", { class: "cc-card__label", text: "Owner, not a scoped agent. No skills registered yet. No runs recorded." }));
      owned.forEach(function (s) {
        var v = progress && progress.stories ? progress.stories.filter(function (p) { return p.id === s.id; })[0] : null;
        var verification = global.CCData.deriveVerification(v);
        main.appendChild(UI.el("div", { class: "cc-card", style: "margin-bottom:10px" }, [
          UI.el("p", { class: "cc-card__label", text: s.id + (s.title ? " — " + s.title : "") }),
          UI.el("p", {}, [UI.statusDot(UI.verificationLevel(verification)), document.createTextNode(UI.verificationLabel(verification))])
        ]));
      });
      return;
    }

    main.appendChild(UI.sectionTitle("AI agents"));
    main.appendChild(UI.el("p", { class: "cc-card__label", style: "margin-bottom:12px", text: "Your plan does not carry a scoped agent roster yet — these are story owners, not scoped agents." }));
    var grid = UI.el("div", { class: "cc-card-grid" });
    Object.keys(byOwner).forEach(function (owner) {
      grid.appendChild(UI.cardLink("agents", owner, "Owner", owner, UI.pill(byOwner[owner].length + " stories owned")));
    });
    main.appendChild(grid);
  }

  global.CCTabs = global.CCTabs || {};
  global.CCTabs.agents = render;
})(window);
