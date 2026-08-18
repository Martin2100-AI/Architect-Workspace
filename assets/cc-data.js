/*
 * Data layer for the Command Center.
 * Fetches .colaberry/plan.json, .colaberry/progress.json and
 * .colaberry/manifest.json at runtime — nothing from these files is ever
 * baked into the JS. Any of the three may legitimately not exist yet
 * (no sync has happened) or be missing fields (older schema_version);
 * both cases render as an honest empty state, never invented data.
 */
(function (global) {
  "use strict";

  var DATA_PATHS = {
    plan: ".colaberry/plan.json",
    progress: ".colaberry/progress.json",
    manifest: ".colaberry/manifest.json"
  };

  var MODE_KEY = "cc-data-mode";

  function fetchJson(path) {
    return fetch(path, { cache: "no-store" }).then(function (res) {
      if (!res.ok) {
        return { data: null, missing: res.status === 404, error: res.status !== 404 ? ("HTTP " + res.status) : null };
      }
      return res.json().then(
        function (data) { return { data: data, missing: false, error: null }; },
        function (err) { return { data: null, missing: false, error: "Invalid JSON: " + err.message }; }
      );
    }, function (err) {
      // fetch() itself rejects on network-level failure, and also when
      // served from file:// — treat as "could not be read", not "missing".
      return { data: null, missing: false, error: "Could not fetch: " + err.message };
    });
  }

  function loadAll() {
    return Promise.all([
      fetchJson(DATA_PATHS.plan),
      fetchJson(DATA_PATHS.progress),
      fetchJson(DATA_PATHS.manifest)
    ]).then(function (results) {
      return {
        plan: results[0].data,
        planStatus: results[0],
        progress: results[1].data,
        progressStatus: results[1],
        manifest: results[2].data,
        manifestStatus: results[2]
      };
    });
  }

  function getMode() {
    try {
      var stored = global.localStorage.getItem(MODE_KEY);
      return stored === "sample" ? "sample" : "real";
    } catch (e) {
      return "real";
    }
  }

  function setMode(mode) {
    try {
      global.localStorage.setItem(MODE_KEY, mode === "sample" ? "sample" : "real");
    } catch (e) {
      /* localStorage unavailable — mode just won't persist across reloads */
    }
  }

  function joinStories(plan, progress) {
    var progressById = {};
    ((progress && progress.stories) || []).forEach(function (s) {
      progressById[s.id] = s;
    });
    return ((plan && plan.stories) || []).map(function (s) {
      var p = progressById[s.id] || null;
      return {
        id: s.id,
        title: s.title,
        narrative: s.narrative,
        release: s.release,
        acceptance_criteria: s.acceptance_criteria,
        due_on: s.due_on,
        due_baseline_on: s.due_baseline_on,
        verification: p ? p.verification : null
      };
    });
  }

  function daysBetween(fromIso, toDate) {
    var from = new Date(fromIso);
    if (isNaN(from.getTime())) return null;
    var ms = toDate.getTime() - from.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  function formatAbsoluteDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  }

  // Returns { text, level } where level is "ok" | "warn" | "unknown".
  function describeDataStamp(manifest, manifestStatus) {
    if (!manifest || !manifest.generated_at) {
      var reason = manifestStatus && manifestStatus.missing
        ? "No data has ever been synced from the portal yet."
        : "The data timestamp could not be read.";
      return { text: reason + " Sync from the portal to generate data.", level: "warn" };
    }
    var abs = formatAbsoluteDate(manifest.generated_at);
    var days = daysBetween(manifest.generated_at, new Date());
    if (abs === null || days === null) {
      return { text: "Data timestamp is unreadable. Sync from the portal to refresh.", level: "warn" };
    }
    var rel = days <= 0 ? "today" : days === 1 ? "1 day ago" : days + " days ago";
    var text = "Data as of " + abs + " (" + rel + ")";
    if (days > 7) {
      return { text: text + " — sync from the portal to refresh.", level: "warn" };
    }
    return { text: text, level: "ok" };
  }

  // ---- Sample data -------------------------------------------------
  // Used ONLY when the Sample/Real switch is set to Sample. Always
  // rendered behind the visible "SAMPLE DATA" badge — never a
  // substitute for a missing real file.
  function sampleManifest() {
    var d = new Date();
    d.setHours(d.getHours() - 6);
    return { schema_version: 1, generated_at: d.toISOString() };
  }

  function samplePlan() {
    return {
      schema_version: 1,
      project: {
        name: "Keysy (sample)",
        descriptor: "A mobile-first app to simplify home buying with personalized recommendations and affordability insights."
      },
      schedule: {
        build_start: "2026-08-15",
        build_end: "2026-10-01",
        demo_day: "2026-10-08",
        demo_release_key: "r1"
      },
      derived: {
        measures: [
          { id: "M-1", statement: "Sample measure — reduce time-to-first-tour from browse to booked (illustrative only)." },
          { id: "M-2", statement: "Sample measure — increase saved-property-to-tour-request conversion (illustrative only)." }
        ],
        roles: ["new user", "user", "buyer", "system administrator"],
        guardrails: [
          { id: "REQ-006", statement: "The system must encrypt sensitive data in transit and protect user passwords." },
          { id: "REQ-017", statement: "The system must provide a disclaimer stating that affordability calculations are estimates and are not lending offers or financial advice." }
        ],
        systems: ["MLS", "Google Maps", "Email Services", "Messaging Platforms"],
        counts: { agents_by_autonomy: { supervised: 2 } }
      },
      stories: [
        {
          id: "STORY-SAMPLE-1",
          title: "Sample story — Property Discovery Feed",
          narrative: "As a user, I want to browse a personalized property feed so that I can find homes that fit me.",
          release: "r0",
          owner: "Development Team",
          acceptance_criteria: ["Sample criterion one.", "Sample criterion two."],
          due_on: "2026-08-20",
          due_baseline_on: "2026-08-17"
        },
        {
          id: "STORY-SAMPLE-2",
          title: "Sample story — Basic Property Search",
          narrative: "As a user, I want to search homes by city and price range so that I can narrow down my options.",
          release: "r0",
          owner: "Development Team",
          acceptance_criteria: ["Sample criterion one.", "Sample criterion two."],
          due_on: "2026-08-22",
          due_baseline_on: "2026-08-17"
        },
        {
          id: "STORY-SAMPLE-3",
          title: "Sample story — Buyer Profile Creation",
          narrative: "As a buyer, I want to set my price range and preferences so that matches are relevant to me.",
          release: "r1",
          owner: "Buyer",
          acceptance_criteria: ["Sample criterion one."],
          due_on: "2026-08-30",
          due_baseline_on: "2026-08-25"
        },
        {
          id: "STORY-SAMPLE-4",
          title: "Sample story — Trust Spine Implementation",
          narrative: "As a system administrator, I want sensitive data encrypted in transit so that user accounts stay safe.",
          release: "r0",
          owner: "System Administrator",
          acceptance_criteria: ["Sample criterion one.", "Sample criterion two."],
          due_on: "2026-08-23",
          due_baseline_on: "2026-08-19"
        }
      ],
      releases: [
        {
          key: "r0",
          name: "Initial Setup and Core Features",
          starts_on: "2026-08-15",
          ends_on: "2026-08-23",
          story_ids: ["STORY-SAMPLE-1", "STORY-SAMPLE-2", "STORY-SAMPLE-4"],
          is_demo_target: false
        },
        {
          key: "r1",
          name: "Enhanced Property Interaction",
          starts_on: "2026-08-25",
          ends_on: "2026-09-02",
          story_ids: ["STORY-SAMPLE-3"],
          is_demo_target: true
        }
      ],
      requirements: [
        {
          id: "REQ-001", statement: "The system must allow users to sign up using email, Google, or Apple.",
          kind: "FUNC", priority: "must", cluster: "auth", fulfilled_by: ["STORY-SAMPLE-1"]
        },
        {
          id: "REQ-006", statement: "The system must encrypt sensitive data in transit and protect user passwords.",
          kind: "SAFE", priority: "must", cluster: "security", fulfilled_by: ["STORY-SAMPLE-4"]
        },
        {
          id: "REQ-017", statement: "The system must provide a disclaimer stating that affordability calculations are estimates and are not lending offers or financial advice.",
          kind: "SAFE", priority: "must", cluster: "compliance", fulfilled_by: []
        }
      ],
      agents: []
    };
  }

  function sampleProgress() {
    return {
      schema_version: 1,
      totals: {
        stories_total: 15,
        stories_verified: 3,
        criteria_total: 62,
        criteria_passed: 14,
        points_awarded: 21
      },
      stories: [
        { id: "STORY-SAMPLE-1", verification: { state: "verified", commit: "a1b2c3d", points: 3 } },
        { id: "STORY-SAMPLE-2", verification: { state: "submitted", commit: "e4f5a6b", points: 2 } },
        { id: "STORY-SAMPLE-3", verification: { state: "not_started", commit: null, points: 0 } },
        { id: "STORY-SAMPLE-4", verification: { state: "in_progress", commit: null, points: 0 } }
      ]
    };
  }

  global.CCData = {
    loadAll: loadAll,
    getMode: getMode,
    setMode: setMode,
    joinStories: joinStories,
    describeDataStamp: describeDataStamp,
    formatAbsoluteDate: formatAbsoluteDate,
    sample: {
      manifest: sampleManifest,
      plan: samplePlan,
      progress: sampleProgress
    }
  };
})(window);
