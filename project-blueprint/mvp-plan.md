# MVP Plan: Warranty Claim Triage

**Based on:** [architecture.md](./architecture.md), [tech-stack.md](./tech-stack.md)

## The one thing Week 1 must prove

Can the Auto-Approval Decision Engine, fed a real claim's free-text description and purchase record, correctly tell "auto-approve" apart from "send to a human" — with zero false approvals — on actual claims this business has seen? If the engine can't be trusted not to guess, nothing else about this product matters.

## Week 1 build checklist

- [ ] **Mon — A submitted claim is stored and linked to a real purchase record.** Build the **Purchase and Warranty Database** (PostgreSQL via Supabase) seeded with 20-30 real purchase and warranty-term rows, plus a **bare-bones internal Claim Submission Form** (a single unstyled Next.js page, not the customer-facing one) that writes a new claim row via a Next.js API route and looks up the matching purchase by receipt number.
- [ ] **Tue — A claim's text description returns a defect type and confidence score.** Wire the **Claim Extraction and Matching Engine** to the Anthropic Claude API: send the claim's free-text description (no photo analysis yet), get back a defect type and a confidence score, and store both on the claim record.
- [ ] **Wed — Every claim gets an auto-approve or escalate decision, with reasoning logged.** Build the **Auto-Approval Decision Engine** as a plain TypeScript rules module running the three checks (in-window, matched purchase, matched defect type) against the Tuesday output, and write the decision plus which check(s) failed back to the database.
- [ ] **Thu — A reviewer can see every escalated claim and why it was flagged.** Build a minimal **Agent Review Dashboard** (a second unstyled Next.js page, shared URL, no login) listing escalated claims with the purchase record, extracted defect type, confidence score, and which check failed.
- [ ] **Fri — The two-person CS team compares the system's calls to their own on real claims.** Feed at least 15 real historical claims through the pipeline and sit with both CS agents while they say, claim by claim, whether they agree with each auto-approve or escalate decision.

## Explicitly out of scope for Week 1

- Photo/vision analysis in the Matching Engine — proves image-quality detection works, not whether text-based triage decisions can be trusted; this is architecture.md's own open question, deferred to Week 2.
- Polished customer-facing Claim Submission Form (styling, status lookup) — proves customer UX, not decision accuracy; the internal bare-bones form is enough to generate real claims this week.
- Automated weekly warranty-terms import pipeline — proves data-freshness automation, not decision quality; 20-30 hand-seeded real terms cover this week's test claims.
- Claim status lookup for customers — proves customer-facing UX, not whether the engine's decisions are correct.
- Login/authentication on the Agent Review Dashboard — proves access control, not decision quality; two known people can use a shared unlisted URL for a week.
- Multi-reviewer assignment/locking logic — proves scaling to a third reviewer, irrelevant at two people.
- Email/SMS notifications on decision — proves customer engagement, not triage correctness.
- Photo upload UI (drag/drop, compression, storage) — proves upload UX, not decision accuracy; skip photos entirely while extraction is text-only.
- Production deploy/hosting pipeline — proves ops readiness, not whether the Decision Engine works; runs locally or on a single dev deploy all week.
- Disputes workflow — already explicitly out of scope in architecture.md; not revisited here.
- Fraud pattern detection across claims — already explicitly out of scope in architecture.md; not revisited here.

## What "done" looks like

By Friday, at least 15 real historical claims have been run end-to-end (internal form → database → Claude extraction → Decision Engine → dashboard for escalations), and both CS agents have reviewed every decision against their own judgment.

**Pass bar:** zero false auto-approvals (no claim the CS team would have denied or flagged is auto-approved), and at least 70% of the claims the CS team would have approved outright are also auto-approved by the system — meaning the engine is actually triaging, not just escalating everything.

**Fail looks like:** at least one false auto-approval occurs, or the system escalates nearly every claim (over 80%) regardless of how clear-cut it is.

**Friday decision:**
| Outcome | Next move |
|---|---|
| Pass | Move to Week 2: add photo/vision analysis and start building the real customer-facing form. |
| Partial (zero false approvals, but escalation rate stays above 80%) | Don't touch the UI yet — spend Week 2 tightening extraction/matching confidence thresholds and adding more real warranty-term edge cases. |
| Fail (any false auto-approval) | Stop and reconsider whether LLM-based extraction can ever feed an auto-approval decision without a human in the loop on every claim, before building anything further. |

This week deliberately proves nothing about overall claim volume at scale, the actual customer-facing experience, whether photo-based defect detection works, whether warranty-term data can stay fresh automatically, or whether the system genuinely saves the CS team time — only whether the core decision is trustworthy.
