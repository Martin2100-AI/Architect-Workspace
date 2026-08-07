---
name: tech-stack-recommender
description: Use when the user has a system architecture and wants a recommended tech stack, explained simply.
---

# Tech Stack Recommender

## When this applies

Invoke this skill when the user has an existing system architecture (from the `system-architect` skill or otherwise) and wants concrete technology recommendations for it — "what should I actually build this with," "recommend a stack," "what tech should each piece use." Do NOT invoke it to design the architecture itself (that's `system-architect`) or to review/upgrade an existing codebase's stack (that's a normal engineering task).

## Step 1 — Read the architecture

Read `project-blueprint/architecture.md`. If it doesn't exist, stop and tell the user to run the `system-architect` skill first (or point you to their architecture doc) — do not invent components from scratch.

Pull out the component list and the project idea's stated scale and needs: who the users are, how many of them, what data volumes are implied, what's genuinely real-time vs. not, budget/team-size signals if mentioned. This is what "actual scale and needs" gets judged against in Step 3 — not a generic default stack.

## Step 2 — Recommend one real, current technology per component

For every component in the architecture, pick exactly one specific, real, currently-maintained technology (a named product/library/service, e.g. "PostgreSQL," "Next.js," "Supabase Auth" — never a category like "a database"). Avoid recommending anything deprecated, sunset, or clearly on its way out.

## Step 3 — Rate the fit against THIS idea, not a generic default

Every recommendation gets exactly one fit rating, judged against the scale and needs pulled out in Step 1:

- 🟢 **great fit** — matches this idea's actual scale, budget, and complexity well
- 🟡 **good fit** — works, but there's a real tradeoff worth knowing (cost at scale, added complexity, lock-in)
- 🔴 **consider carefully** — commonly reached for, but likely overkill, underpowered, or mismatched for what this specific idea needs

Do not default to 🟢 for the "popular" choice — a login system for a 50-user internal tool recommending a heavyweight enterprise auth platform is a 🔴 or 🟡, not a 🟢, even if that platform is a fine general choice elsewhere. The rating must be justified by this idea's specifics, not the technology's general reputation.

## Step 4 — Write the why in plain English

One sentence per component explaining *why* this technology fits (or doesn't, cleanly). No unexplained jargon — if a technical term is necessary (e.g. "ORM," "serverless," "managed service"), gloss it in the same sentence in five words or fewer.

## Step 5 — Give a copy-ready follow-up prompt per row

End every row with a prompt the user could paste into a new conversation to learn more about that specific technology, in the context of their project. Pattern: `"Explain <Technology> to me like I'm new to <category>, using my project as the example."` Adjust the category phrase per component (databases, hosting, auth, frontend frameworks, etc.) but keep the sentence short and pasteable as-is.

## Step 6 — Save the result

Write the full result to `project-blueprint/tech-stack.md`, structured as one table (short labels, icons, no walls of text):

```markdown
# Tech Stack: <short project name>

Based on [architecture.md](./architecture.md).

| Component | Recommended Tech | Fit | Why | Learn more |
|---|---|---|---|---|
| <Component> | <Technology> | 🟢/🟡/🔴 <label> | <one plain-English sentence> | `<copy-ready prompt>` |
```

One row per architecture component. Keep the "Why" cell to one sentence; keep the "Learn more" cell as a single-line prompt in a code span so it's copy-ready as-is.

## Step 7 — Report back

When finished, report to the user:
1. The exact file path: `project-blueprint/tech-stack.md`.
2. The fit-rating breakdown, e.g. "4 🟢 great fit, 2 🟡 good fit, 1 🔴 consider carefully."
