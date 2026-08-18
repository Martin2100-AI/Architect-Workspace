(function (global) {
  "use strict";
  var UI = global.CCUI;

  function render(main, data, subId) {
    var systems = data.plan && data.plan.derived && data.plan.derived.systems;
    if (subId) {
      main.appendChild(UI.breadcrumb("systems", "Systems", subId));
      main.appendChild(UI.el("h1", { class: "cc-detail-title", text: subId }));
      main.appendChild(UI.el("div", { class: "cc-card" }, [
        UI.el("p", {}, [UI.statusDot("unknown"), document.createTextNode("Not checked from here")]),
        UI.el("p", { class: "cc-card__label", text: "Nothing in this repo can confirm whether this system is actually connected. That is a fact about the running system, not this static page." })
      ]));
      return;
    }
    main.appendChild(UI.sectionTitle("What this connects to"));
    if (!systems || !systems.length) {
      main.appendChild(UI.emptyState("No systems listed yet. This reads plan.derived.systems from .colaberry/plan.json."));
      return;
    }
    var tbl = UI.el("table", { class: "cc-table" }, [
      UI.el("thead", {}, [UI.el("tr", {}, [UI.el("th", { text: "System" }), UI.el("th", { text: "Status" }), UI.el("th", { text: "Last checked" })])]),
      UI.el("tbody", {}, systems.map(function (name) {
        var tr = UI.el("tr", { class: "is-clickable" }, [
          UI.el("td", { text: name }),
          UI.el("td", {}, [UI.statusDot("unknown"), document.createTextNode("not checked from here")]),
          UI.el("td", { text: "—" })
        ]);
        tr.addEventListener("click", function () { UI.goTo("systems", name); });
        return tr;
      }))
    ]);
    main.appendChild(tbl);
  }

  global.CCTabs = global.CCTabs || {};
  global.CCTabs.systems = render;
})(window);
