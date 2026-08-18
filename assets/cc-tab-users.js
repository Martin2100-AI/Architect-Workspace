(function (global) {
  "use strict";
  var UI = global.CCUI;

  function render(main, data, subId) {
    var roles = data.plan && data.plan.derived && data.plan.derived.roles;
    var stories = (data.plan && data.plan.stories) || [];
    if (subId) {
      main.appendChild(UI.breadcrumb("users", "Users & Use Case", subId));
      main.appendChild(UI.el("h1", { class: "cc-detail-title", text: subId }));
      var re = new RegExp("as an?\\s+" + UI.escapeRe(subId), "i");
      var matches = stories.filter(function (s) { return s.narrative && re.test(s.narrative); });
      if (!matches.length) {
        main.appendChild(UI.emptyState("No stories in the current plan are written from this role's perspective yet."));
        return;
      }
      matches.forEach(function (s) {
        main.appendChild(UI.el("div", { class: "cc-card", style: "margin-bottom:10px" }, [
          UI.el("p", { class: "cc-card__label", text: s.id + (s.title ? " — " + s.title : "") }),
          UI.el("p", { text: s.narrative })
        ]));
      });
      return;
    }
    main.appendChild(UI.sectionTitle("Who this is for"));
    if (!roles || !roles.length) {
      main.appendChild(UI.emptyState("No roles defined yet. This reads plan.derived.roles, extracted from stories written \"As a <role>, I want …\" in .colaberry/plan.json."));
      return;
    }
    var grid = UI.el("div", { class: "cc-card-grid" });
    roles.forEach(function (r) { grid.appendChild(UI.cardLink("users", r, "Role", r)); });
    main.appendChild(grid);
  }

  global.CCTabs = global.CCTabs || {};
  global.CCTabs.users = render;
})(window);
