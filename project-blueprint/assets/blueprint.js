/* BLUEPRINT is the single source of truth for the whole knowledge base.
   Every page renders from this object. Loaded as a classic script (not a
   module), so it is a top-level `const` — a global lexical binding other
   classic scripts can reference directly, but NOT a property of `window`. */
const BLUEPRINT = {

  meta: {
    projectName: "Warranty Claim Triage",
    tagline: "A regional appliance retailer's two-person CS team stops eyeballing every warranty claim by hand.",
    mustDoWell: "Never auto-approve a claim that falls outside the warranty window or has no matching purchase record — a false approve costs real money, so the system is biased toward “ask a human” over “guess yes.”",
    guaranteeComponent: "decision-engine"
  },

  idea: "For the two-person customer service team at a regional appliance retailer who currently eyeball every warranty claim by hand. A customer submits a claim through a simple form — what broke, when, a photo, and their receipt/order number. The system pulls up that customer's purchase record and the manufacturer's warranty terms, and auto-approves the claim only when it's unambiguous (in-window, matching purchase, matching defect type); anything else — no purchase match, borderline dates, unclear damage from the photo — gets routed to a human queue instead of guessing.",

  components: [
    {
      id: "claim-form",
      name: "Claim Submission Form",
      layer: "frontend",
      guarantee: false,
      sentence: "The page a customer uses to submit what broke, when, a photo, and their receipt number — and later check their claim status.",
      words: "“A customer submits a claim through a simple form”"
    },
    {
      id: "claims-api",
      name: "Claims API",
      layer: "backend",
      guarantee: false,
      sentence: "Receives a new claim, looks up the matching purchase record, and coordinates the rest of the pipeline.",
      words: "“The system pulls up that customer's purchase record”"
    },
    {
      id: "warranty-db",
      name: "Purchase and Warranty Database",
      layer: "database",
      guarantee: false,
      sentence: "Stores every customer purchase, every manufacturer's warranty terms, and every claim decision, so nothing is re-entered or forgotten between visits.",
      words: "“purchase record and the manufacturer's warranty terms”"
    },
    {
      id: "match-engine",
      name: "Claim Extraction and Matching Engine",
      layer: "ai",
      guarantee: false,
      sentence: "Reads the photo and free-text description of the damage and figures out what kind of defect is being claimed, so the decision engine has something concrete to check.",
      words: "“what broke… a photo”, “matching defect type”"
    },
    {
      id: "decision-engine",
      name: "Auto-Approval Decision Engine",
      layer: "gate",
      guarantee: true,
      sentence: "The single place that decides approve-automatically versus ask-a-human — and only approves automatically when the claim is unambiguous on every count.",
      words: "“auto-approves the claim only when it's unambiguous”"
    },
    {
      id: "agent-dashboard",
      name: "Agent Review Dashboard",
      layer: "frontend",
      guarantee: false,
      sentence: "Where the two-person customer service team reviews every claim the Decision Engine wasn't sure about, with the same evidence the engine saw.",
      words: "“gets routed to a human queue instead of guessing”"
    }
  ],

  omittedComponents: [
    {
      name: "Job queue / message broker",
      reason: "Claims trickle in one at a time for a two-person team — there's no burst to smooth out, so a queue would be padding, not architecture."
    }
  ],

  diagrams: {
    architecture:
`flowchart TD
    CustomerSubmits(["Customer submits a claim"]) -->|"photo, description, and receipt number"| ClaimForm["Claim Submission Form"]
    ClaimForm -->|new claim record| ClaimsAPI["Claims API"]
    ClaimsAPI -->|receipt number lookup| WarrantyDB[("Purchase and Warranty Database")]
    WarrantyDB -->|purchase record and warranty terms| ClaimsAPI
    ClaimsAPI -->|"photo, description, and purchase record"| MatchEngine["Claim Extraction and Matching Engine"]
    MatchEngine -->|defect type and confidence| DecisionEngine["Auto-Approval Decision Engine"]
    DecisionEngine -->|"in-window and matched: auto-approve"| WarrantyDB
    DecisionEngine -->|"ambiguous: escalate"| Dashboard["Agent Review Dashboard"]
    ReviewerDecision(["CS agent decision"]) -->|approve or deny| Dashboard
    Dashboard -->|final decision| WarrantyDB
    WarrantyDB -->|claim status| ClaimForm`,

    sequence:
`sequenceDiagram
    actor Customer
    participant Form as Claim Submission Form
    participant API as Claims API
    participant DB as Purchase and Warranty DB
    participant Match as Matching Engine
    participant Gate as Auto-Approval Decision Engine
    actor Agent as CS Agent

    Customer->>Form: Submit photo, description, receipt number
    Form->>API: New claim
    API->>DB: Look up purchase record and warranty terms
    DB-->>API: Purchase record (or no match)
    API->>Match: Photo + description + purchase record
    Match-->>API: Extracted defect type + confidence
    API->>Gate: Run the three checks
    alt In window, purchase matched, defect matched
        Gate->>DB: Auto-approve + reasoning
    else Any check fails or is inconclusive
        Gate->>DB: Escalate + reasoning
        DB-->>Agent: Claim appears in review queue
        Agent->>DB: Final approve or deny decision
    end
    Customer->>Form: Check claim status
    Form->>DB: Fetch current status
    DB-->>Form: Status + reasoning`,

    gantt:
`gantt
    title Build Order (weeks)
    dateFormat  X
    axisFormat %s
    section Phase 1
    Data spine (DB + Claims API) :p1, 0, 2
    section Phase 2 (make-or-break)
    Auto-Approval Decision Engine :crit, p2, 2, 3
    section Phase 3
    Agent Review Dashboard :p3, 5, 2
    section Phase 4
    Claim Extraction and Matching Engine :p4, 7, 2
    section Phase 5
    Customer-facing Submission Form :p5, 9, 2`
  },

  dataFlow: [
    { step: 1, title: "Customer submits", description: "A customer fills out the Claim Submission Form with what broke, when, a photo, and their receipt/order number.", aiTouched: false },
    { step: 2, title: "Purchase lookup", description: "The Claims API receives the new claim and looks up the customer's purchase record and applicable warranty terms in the Purchase and Warranty Database.", aiTouched: false },
    { step: 3, title: "Hand off for extraction", description: "The Claims API sends the claim's photo, free-text description, and the matched (or unmatched) purchase record to the Matching Engine.", aiTouched: false },
    { step: 4, title: "Extract and match", description: "The Matching Engine extracts a defect type and a confidence score from the photo and description, and checks it against the warranty terms' covered-defect list.", aiTouched: true },
    { step: 5, title: "Three checks", description: "The Auto-Approval Decision Engine checks: in-window, matching purchase, matching defect type. All three must pass.", aiTouched: false },
    { step: 6, title: "Auto-approve", description: "If all three checks pass, the claim is auto-approved and the decision, with its reasoning, is written to the database.", aiTouched: false },
    { step: 7, title: "Escalate instead of guess", description: "If any check fails or is inconclusive, the claim is routed to the Agent Review Dashboard instead of being auto-approved or auto-denied.", aiTouched: false },
    { step: 8, title: "Human decides", description: "A CS agent reviews the claim with the same evidence the engine saw, plus the reason it was flagged, and makes the final call.", aiTouched: false },
    { step: 9, title: "Status closes the loop", description: "The final decision is written back to the database, and the customer can see the claim status when they return to the form.", aiTouched: false }
  ],

  buildPhases: [
    { phase: 1, name: "Data spine", proves: "A claim can be submitted (via a bare-bones internal form), stored, and correctly matched to a purchase record, before any automation exists.", startWeek: 0, weeks: 2, makeOrBreak: false },
    { phase: 2, name: "Auto-Approval Decision Engine", proves: "The system never auto-approves a claim that is out-of-window or has no matching purchase — tested against hand-picked claims, not yet AI-extracted ones.", startWeek: 2, weeks: 3, makeOrBreak: true },
    { phase: 3, name: "Agent Review Dashboard", proves: "A human can see an escalated claim with its evidence and reasoning, and record a final decision.", startWeek: 5, weeks: 2, makeOrBreak: false },
    { phase: 4, name: "Claim Extraction and Matching Engine", proves: "Real photos and free-text descriptions can be turned into the structured defect type the Decision Engine needs.", startWeek: 7, weeks: 2, makeOrBreak: false },
    { phase: 5, name: "Customer-facing Submission Form", proves: "The whole loop works end-to-end for a real customer, including checking claim status, not just internally.", startWeek: 9, weeks: 2, makeOrBreak: false }
  ],

  assumptions: [
    { assumption: "Manufacturer warranty terms are imported into our own database periodically (e.g., a weekly import), not queried live from each manufacturer's system.", impact: "Keeps the Decision Engine fast and offline-capable, but terms can go stale between imports — a manufacturer's policy change won't be reflected until the next import." },
    { assumption: "Claim volume is low enough (a handful per day, matching a two-person team) that no background queue or async processing is needed — claims are handled synchronously.", impact: "Much simpler system; if volume grows into the hundreds per day, photo analysis may need to move to an async job so the submission form doesn't hang." },
    { assumption: "“Unclear damage from a photo” can be detected as a low-confidence score from the Matching Engine, rather than requiring a separate human-in-the-loop photo-quality gate.", impact: "Simpler pipeline, but a genuinely bad photo (blurry, wrong item) might get a false medium-confidence score instead of being bounced back to the customer for a better one." },
    { assumption: "One shared queue serves both CS team members with no claim-assignment logic (first-to-open-it takes it).", impact: "Fine at two people; would need real assignment/locking logic before adding a third reviewer, to avoid two agents working the same claim at once." }
  ],

  openQuestion: {
    question: "Does the Matching Engine need to actually analyze the photo (computer vision), or is the claim's text description enough to extract the defect type?",
    branchA: {
      label: "Text description is enough",
      implications: [
        "The Matching Engine is a text-extraction/classification step only — cheaper, faster, no image model needed.",
        "Photos are stored as supporting evidence for the human reviewer, not analyzed automatically.",
        "“Unclear damage from the photo” becomes a human-review trigger, not something the engine detects on its own."
      ]
    },
    branchB: {
      label: "The photo must be analyzed",
      implications: [
        "The Matching Engine needs a vision-capable model, raising both cost and latency per claim.",
        "Confidence scoring needs to combine text and image signals, complicating the Decision Engine's three checks.",
        "Photo quality (blur, wrong angle) becomes its own failure mode the engine must detect and route to a human."
      ]
    }
  },

  notCovered: [
    "Notifying the customer proactively (email/SMS) when a decision is made — today the customer must return to the status page to check.",
    "Disputes — what happens when a customer disagrees with a denial. That's a follow-on workflow, not this design.",
    "Fraud patterns across claims (e.g., the same photo submitted by different accounts) — each claim is evaluated independently.",
    "Onboarding a new manufacturer's warranty-terms format — today's import assumes a consistent terms structure; an unusual policy format needs manual mapping first."
  ],

  coverage: [
    { componentId: "claim-form", guaranteesDay1: false, builtInPhase: 5, openQuestion: false },
    { componentId: "claims-api", guaranteesDay1: false, builtInPhase: 1, openQuestion: false },
    { componentId: "warranty-db", guaranteesDay1: false, builtInPhase: 1, openQuestion: false },
    { componentId: "match-engine", guaranteesDay1: false, builtInPhase: 4, openQuestion: true },
    { componentId: "decision-engine", guaranteesDay1: true, builtInPhase: 2, openQuestion: false },
    { componentId: "agent-dashboard", guaranteesDay1: false, builtInPhase: 3, openQuestion: false }
  ],

  sections: [
    { id: "summary", title: "Summary", file: "01-summary.html", description: "The idea, the one thing it must do well, and the whole system in one paragraph.", preview: "pipeline" },
    { id: "components", title: "Components", file: "02-components.html", description: "Every component this idea required, traced back to the words that required it.", preview: "layers" },
    { id: "diagram", title: "Architecture Diagram", file: "03-diagram.html", description: "How the components connect and what data crosses each arrow.", preview: "graph" },
    { id: "dataflow", title: "Data Flow", file: "04-data-flow.html", description: "A numbered, step-by-step walkthrough of one claim from submission to decision.", preview: "ribbon" },
    { id: "buildorder", title: "Build Order", file: "05-build-order.html", description: "The phases to build this in, and what each phase proves.", preview: "timeline" },
    { id: "assumptions", title: "Assumptions", file: "06-assumptions.html", description: "What we assumed, the impact if wrong, and the one open question.", preview: "fork" },
    { id: "coverage", title: "Coverage & Gaps", file: "07-coverage.html", description: "What this design covers today, and what it honestly does not.", preview: "grid" }
  ]
};
