(function (global) {
  "use strict";
  var UI = global.CCUI;

  // Proposed data model — authored by working through the requirements,
  // not fetched from a plan file. This is a starting point for review,
  // not a schema that has been implemented; no tables exist yet.
  var ENTITIES = [
    {
      name: "User", from: "REQ-001, REQ-009, REQ-014",
      fields: ["id", "email", "auth_provider (email/google/apple)", "password_hash (nullable for SSO)", "created_at"],
      relationships: ["has one BuyerProfile", "has one NotificationPreference", "has many SavedProperty", "has many TourRequest", "has many ComparisonSet", "has many ShareEvent"]
    },
    {
      name: "Property", from: "REQ-002, REQ-007, REQ-008, REQ-016",
      fields: ["id", "listing_price", "address", "lat", "lng", "bedrooms", "bathrooms", "square_footage", "property_type", "lot_size", "year_built", "hoa_fee", "primary_image_url", "mls_source_id"],
      relationships: ["referenced by SavedProperty, TourRequest, ShareEvent, AffordabilityEstimate, MatchScore"]
    },
    {
      name: "BuyerProfile", from: "REQ-015",
      fields: ["user_id (FK)", "preferred_cities", "min_price", "max_price", "bedrooms", "bathrooms", "property_type", "desired_features", "estimated_down_payment"],
      relationships: ["belongs to one User"]
    },
    {
      name: "SavedProperty", from: "REQ-004",
      fields: ["user_id (FK)", "property_id (FK)", "category (favorite/maybe/want_to_tour/offer_candidate)", "saved_at"],
      relationships: ["belongs to one User", "belongs to one Property"]
    },
    {
      name: "MatchScore", from: "REQ-010",
      fields: ["user_id (FK)", "property_id (FK)", "score", "factors (json)"],
      relationships: ["belongs to one User", "belongs to one Property"]
    },
    {
      name: "AffordabilityEstimate", from: "REQ-003, REQ-017",
      fields: ["user_id (FK)", "property_id (FK, nullable)", "purchase_price", "down_payment", "mortgage_amount", "interest_rate", "loan_term", "property_taxes", "homeowners_insurance", "hoa_fees", "mortgage_insurance", "estimated_monthly_cost"],
      relationships: ["belongs to one User", "optionally belongs to one Property", "always rendered with the REQ-017 disclaimer"]
    },
    {
      name: "TourRequest", from: "REQ-005",
      fields: ["id", "property_id (FK)", "buyer_name", "phone_number", "email", "preferred_date", "preferred_time", "message (optional)", "status"],
      relationships: ["belongs to one User (requester)", "belongs to one Property"]
    },
    {
      name: "ComparisonSet", from: "REQ-011",
      fields: ["id", "user_id (FK)", "property_ids (2 to 4)", "created_at"],
      relationships: ["belongs to one User", "references 2-4 Property rows"]
    },
    {
      name: "NotificationPreference", from: "REQ-012",
      fields: ["user_id (FK)", "new_matches", "price_reductions", "open_houses", "listing_status_changes", "back_on_market", "saved_under_contract", "tour_confirmations"],
      relationships: ["belongs to one User"]
    },
    {
      name: "ShareEvent", from: "REQ-018",
      fields: ["id", "user_id (FK)", "property_id (FK)", "method (sms/email/link)", "shared_at"],
      relationships: ["belongs to one User", "belongs to one Property"]
    },
    {
      name: "ExternalSystemConnection", from: "REQ-013",
      fields: ["system_name", "status", "last_checked_at"],
      relationships: ["mirrors the Systems tab — not populated until a system is actually connected"]
    }
  ];

  function render(main, data, subId) {
    main.appendChild(UI.el("div", { class: "cc-pause-banner" }, [
      UI.el("strong", { text: "Starting point, not the answer." }),
      UI.el("span", { text: "This model is derived from the requirements for review. No tables have been created from it yet." })
    ]));
    if (subId) {
      var e = ENTITIES.filter(function (x) { return x.name === subId; })[0];
      main.appendChild(UI.breadcrumb("data-model", "Data Model", subId));
      if (!e) { main.appendChild(UI.emptyState("This entity is not in the current proposal.")); return; }
      main.appendChild(UI.el("h1", { class: "cc-detail-title", text: e.name }));
      main.appendChild(UI.el("p", { class: "cc-card__label", text: "Derived from: " + e.from }));
      var ul = UI.el("ul", {});
      e.fields.forEach(function (f) { ul.appendChild(UI.el("li", { text: f })); });
      main.appendChild(ul);
      main.appendChild(UI.el("p", { class: "cc-entity__rel", text: e.relationships.join(" · ") }));
      return;
    }
    main.appendChild(UI.sectionTitle("Proposed entities"));
    ENTITIES.forEach(function (e) {
      var box = UI.el("div", { class: "cc-entity" }, [
        UI.el("p", { class: "cc-entity__name" }, []),
        UI.el("ul", { class: "cc-entity__fields" }, e.fields.slice(0, 4).map(function (f) { return UI.el("li", { text: f }); })),
        UI.el("p", { class: "cc-entity__rel", text: e.relationships.join(" · ") })
      ]);
      var link = UI.el("a", { href: "#/data-model/" + encodeURIComponent(e.name), text: e.name });
      box.querySelector(".cc-entity__name").appendChild(link);
      main.appendChild(box);
    });
  }

  global.CCTabs = global.CCTabs || {};
  global.CCTabs["data-model"] = render;
})(window);
