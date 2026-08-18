(function (global) {
  "use strict";
  var UI = global.CCUI;

  function buildChatPanel(data) {
    var log = UI.el("div", { class: "cc-chat__log" });
    var input = UI.el("input", { type: "text", placeholder: "e.g. what does REQ-006 require?" });
    var form = UI.el("form", { class: "cc-chat__form" }, [input, UI.el("button", { type: "submit", text: "Ask" })]);
    var wrap = UI.el("div", { class: "cc-chat" }, [log, form]);

    function addMsg(text, who, cite) {
      var msg = UI.el("div", { class: "cc-chat__msg cc-chat__msg--" + who, text: text });
      if (cite) msg.appendChild(UI.el("span", { class: "cc-chat__cite", text: cite }));
      log.appendChild(msg);
      log.scrollTop = log.scrollHeight;
    }

    function answer(q) {
      var needle = q.toLowerCase().trim();
      if (!needle) return;
      var pools = [
        { tab: "Knowledge Base", items: (data.plan && data.plan.requirements) || [], text: function (x) { return x.id + " — " + x.statement; } },
        { tab: "Guardrails", items: (data.plan && data.plan.derived && data.plan.derived.guardrails) || [], text: function (x) { return x.id + " — " + x.statement; } },
        { tab: "Outcomes", items: (data.plan && data.plan.derived && data.plan.derived.measures) || [], text: function (x) { return x.id + " — " + x.statement; } },
        { tab: "Project Management", items: (data.plan && data.plan.stories) || [], text: function (x) { return x.id + " — " + (x.title || x.narrative || ""); } }
      ];
      for (var i = 0; i < pools.length; i++) {
        var hit = pools[i].items.filter(function (x) { return pools[i].text(x).toLowerCase().indexOf(needle) !== -1; })[0];
        if (hit) { addMsg(pools[i].text(hit), "bot", "Found in " + pools[i].tab); return; }
      }
      addMsg("I can't answer that from your data yet.", "bot");
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var q = input.value;
      if (!q.trim()) return;
      addMsg(q, "user");
      input.value = "";
      answer(q);
    });

    addMsg("Ask me about a requirement, guardrail, outcome, or story — I only answer from the data on this page and say which tab it came from.", "bot");
    return wrap;
  }

  function render(main, data, subId) {
    var requirements = (data.plan && data.plan.requirements) || [];

    if (subId) {
      var r = requirements.filter(function (x) { return x.id === subId; })[0];
      main.appendChild(UI.breadcrumb("knowledge-base", "Knowledge Base", subId));
      if (!r) { main.appendChild(UI.emptyState("This requirement was not found in the current plan data.")); return; }
      main.appendChild(UI.el("h1", { class: "cc-detail-title", text: r.id }));
      main.appendChild(UI.el("div", { class: "cc-card", style: "margin-bottom:14px" }, [
        UI.el("p", { text: r.statement }),
        UI.el("p", { class: "cc-card__label", text: (r.kind || "?") + " · " + (r.priority || "?") + (r.cluster ? " · " + r.cluster : "") })
      ]));
      var storyIds = r.fulfilled_by || [];
      if (!storyIds.length) {
        main.appendChild(UI.emptyState((r.priority === "must" ? "Gap: " : "") + "No story currently fulfills this requirement."));
      } else {
        var ul = UI.el("ul", {});
        storyIds.forEach(function (id) { ul.appendChild(UI.el("li", { text: id })); });
        main.appendChild(ul);
      }
      return;
    }

    main.appendChild(UI.sectionTitle("Traceability"));
    if (!requirements.length) {
      main.appendChild(UI.emptyState("No requirements defined yet. This reads plan.requirements from .colaberry/plan.json."));
    } else {
      var tbl = UI.el("table", { class: "cc-table" }, [
        UI.el("thead", {}, [UI.el("tr", {}, [
          UI.el("th", { text: "Requirement" }), UI.el("th", { text: "Kind / priority" }), UI.el("th", { text: "Stories" })
        ])]),
        UI.el("tbody", {}, requirements.map(function (r) {
          var isGap = r.priority === "must" && (!r.fulfilled_by || !r.fulfilled_by.length);
          var tr = UI.el("tr", { class: "is-clickable" + (isGap ? " cc-gap-row" : "") }, [
            UI.el("td", { text: r.id + " — " + UI.truncate(r.statement, 70) }),
            UI.el("td", { text: (r.kind || "?") + " / " + (r.priority || "?") }),
            UI.el("td", { text: isGap ? "GAP — none" : ((r.fulfilled_by || []).join(", ") || "—") })
          ]);
          tr.addEventListener("click", function () { UI.goTo("knowledge-base", r.id); });
          return tr;
        }))
      ]);
      main.appendChild(tbl);
    }

    main.appendChild(UI.sectionTitle("Ask about this project"));
    main.appendChild(buildChatPanel(data));
  }

  global.CCTabs = global.CCTabs || {};
  global.CCTabs["knowledge-base"] = render;
})(window);
