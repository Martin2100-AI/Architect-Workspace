(function (global) {
  "use strict";
  var UI = global.CCUI;

  function render(main, data, subId) {
    var measures = data.plan && data.plan.derived && data.plan.derived.measures;
    if (subId) {
      var m = (measures || []).filter(function (x) { return x.id === subId; })[0];
      main.appendChild(UI.breadcrumb("outcomes", "Outcomes", subId));
      if (!m) { main.appendChild(UI.emptyState("This measure was not found in the current plan data.")); return; }
      main.appendChild(UI.el("h1", { class: "cc-detail-title", text: m.id }));
      main.appendChild(UI.el("div", { class: "cc-card" }, [
        UI.el("p", { text: m.statement }),
        UI.el("p", { class: "cc-card__label", text: "No numeric target has been set for this measure yet." })
      ]));
      return;
    }
    main.appendChild(UI.sectionTitle("The numbers this has to move"));
    if (!measures || !measures.length) {
      main.appendChild(UI.emptyState("No outcome measures defined yet. This reads plan.derived.measures from .colaberry/plan.json — your plan carries no numeric targets yet."));
      return;
    }
    var grid = UI.el("div", { class: "cc-card-grid" });
    measures.forEach(function (m) {
      grid.appendChild(UI.cardLink("outcomes", m.id, m.id, UI.truncate(m.statement, 90), null, { text: true }));
    });
    main.appendChild(grid);
  }

  global.CCTabs = global.CCTabs || {};
  global.CCTabs.outcomes = render;
})(window);
