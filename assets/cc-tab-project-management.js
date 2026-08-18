(function (global) {
  "use strict";
  var UI = global.CCUI;

  function render(main, data, subId) {
    var plan = data.plan, progress = data.progress;
    var releases = (plan && plan.releases) || [];
    var stories = plan ? global.CCData.joinStories(plan, progress) : [];

    if (subId) {
      var story = stories.filter(function (s) { return s.id === subId; })[0];
      main.appendChild(UI.breadcrumb("project-management", "Project Management", subId));
      if (!story) { main.appendChild(UI.emptyState("This task was not found in the current plan data.")); return; }
      main.appendChild(UI.el("h1", { class: "cc-detail-title", text: story.id + (story.title ? " — " + story.title : "") }));
      var slip = (story.due_on && story.due_baseline_on && story.due_on !== story.due_baseline_on)
        ? UI.el("p", { style: "color:var(--cc-status-warn)", text: "Slipped: originally due " + story.due_baseline_on + ", now due " + story.due_on + "." })
        : null;
      main.appendChild(UI.el("div", { class: "cc-card", style: "margin-bottom:14px" }, [
        UI.el("p", { text: story.narrative || "" }),
        UI.el("p", { class: "cc-card__label", text: "Release: " + (story.release || "unassigned") }),
        UI.el("p", { class: "cc-card__label", text: "Due: " + (story.due_on || "not set") + " (originally " + (story.due_baseline_on || "not set") + ")" }),
        slip,
        UI.el("p", {}, [UI.statusDot(UI.verificationLevel(story.verification)), document.createTextNode(UI.verificationLabel(story.verification))])
      ]));
      if (story.acceptance_criteria && story.acceptance_criteria.length) {
        main.appendChild(UI.sectionTitle("Acceptance criteria"));
        var ul = UI.el("ul", {});
        story.acceptance_criteria.forEach(function (c) { ul.appendChild(UI.el("li", { text: c })); });
        main.appendChild(ul);
      }
      return;
    }

    main.appendChild(UI.sectionTitle("Releases"));
    if (!releases.length) {
      main.appendChild(UI.emptyState("No releases defined yet. This reads plan.releases from .colaberry/plan.json."));
    } else {
      var allDates = [];
      releases.forEach(function (r) { allDates.push(r.starts_on, r.ends_on); });
      var min = new Date(Math.min.apply(null, allDates.map(function (d) { return new Date(d).getTime(); })));
      var max = new Date(Math.max.apply(null, allDates.map(function (d) { return new Date(d).getTime(); })));
      var totalMs = Math.max(1, max.getTime() - min.getTime());
      var gantt = UI.el("div", { class: "cc-gantt" });
      releases.forEach(function (r) {
        var startPct = ((new Date(r.starts_on).getTime() - min.getTime()) / totalMs) * 100;
        var widthPct = Math.max(2, ((new Date(r.ends_on).getTime() - new Date(r.starts_on).getTime()) / totalMs) * 100);
        var bar = UI.el("div", {
          class: "cc-gantt-row__bar" + (r.is_demo_target ? " cc-gantt-row__bar--target" : ""),
          style: "left:" + startPct + "%; width:" + widthPct + "%;",
          text: r.starts_on + " → " + r.ends_on
        });
        gantt.appendChild(UI.el("div", { class: "cc-gantt-row" }, [
          UI.el("div", { class: "cc-gantt-row__label" }, [document.createTextNode((r.name || r.key) + " "), r.is_demo_target ? UI.pill("demo target") : null]),
          UI.el("div", { class: "cc-gantt-row__track" }, [bar])
        ]));
      });
      main.appendChild(gantt);
    }

    main.appendChild(UI.sectionTitle("Tasks"));
    if (!stories.length) {
      main.appendChild(UI.emptyState("No stories defined yet. This reads plan.stories from .colaberry/plan.json."));
      return;
    }
    var tbl = UI.el("table", { class: "cc-table" }, [
      UI.el("thead", {}, [UI.el("tr", {}, [
        UI.el("th", { text: "Story" }), UI.el("th", { text: "Release" }),
        UI.el("th", { text: "Due (original)" }), UI.el("th", { text: "Status" })
      ])]),
      UI.el("tbody", {}, stories.map(function (s) {
        var slipped = s.due_on && s.due_baseline_on && s.due_on !== s.due_baseline_on;
        var tr = UI.el("tr", { class: "is-clickable" }, [
          UI.el("td", { text: s.id + (s.title ? " — " + s.title : "") }),
          UI.el("td", { text: s.release || "—" }),
          UI.el("td", { text: (s.due_on || "not set") + (slipped ? " (was " + s.due_baseline_on + ")" : "") }),
          UI.el("td", {}, [UI.statusDot(UI.verificationLevel(s.verification)), document.createTextNode(UI.verificationLabel(s.verification))])
        ]);
        tr.addEventListener("click", function () { UI.goTo("project-management", s.id); });
        return tr;
      }))
    ]);
    main.appendChild(tbl);
  }

  global.CCTabs = global.CCTabs || {};
  global.CCTabs["project-management"] = render;
})(window);
