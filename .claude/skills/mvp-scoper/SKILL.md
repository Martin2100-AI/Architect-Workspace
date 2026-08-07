---
name: mvp-scoper
description: Use when the user wants to know what to build first, see what their idea could look like, and get a short pitch for it.
allowed-tools: Read, Write, Bash
---

# MVP Scoper

## When this applies

Invoke this skill when the user has a project idea (with or without an existing `architecture.md` / `tech-stack.md`) and wants: the smallest real thing to build first, a visual sense of what it would look like, and a short pitch they could show someone. Do NOT invoke it to design the architecture itself (`system-architect`) or to pick technologies (`tech-stack-recommender`) — this skill consumes those outputs, it doesn't produce them. Do NOT invoke it for a normal feature-scoping request inside an existing, already-shipping codebase — this is for a fresh idea's first slice.

`allowed-tools` for this skill is `Read, Write, Bash`. Read and Write cover every file this skill produces (the plan, the mockup, the one-pager source). Bash is scoped narrowly: use it only for the command(s) that actually convert the one-pager HTML into a PDF. Do not use Bash for anything else in this skill — no `mkdir`, no `ls`, no `git`, no dependency installs beyond what's already available on the machine.

## Step 1 — Require the prerequisites

Read `project-blueprint/architecture.md` and `project-blueprint/tech-stack.md`. If either is missing, stop and tell the user to run the `system-architect` skill and `tech-stack-recommender` skill first — do not invent components or technologies to fill the gap. The MVP plan must be grounded in what those two files actually say, not a generic startup-MVP checklist.

## Step 2 — Identify the smallest real slice

From `architecture.md`, pick the minimum subset of components that, wired together, prove the idea's core assumption — the one thing that, if it didn't work, would sink the whole idea. Concretely:

- Name the one core assumption Week 1 must validate (e.g., "users will actually paste in their data and trust the output" — not "the database works").
- For each component you include in Week 1, name the specific technology from `tech-stack.md` it uses — never a generic placeholder like "a backend."
- Explicitly list what's cut for Week 1 (auth, billing, admin tooling, edge-case handling, polish) and why it's safe to cut.
- The checklist items must be concrete and buildable in a week by one person, not epics. If an item would take more than a day or two, split it or push it out of Week 1.

## Step 3 — Write mvp-plan.md from template.md

Use `template.md` as the exact structure. Fill it from Steps 1-2; do not add, remove, reorder, or rename its sections. Save to `project-blueprint/mvp-plan.md`.

## Step 4 — Build a real mockup, not a wireframe

Build `project-blueprint/mockup.html`: a single, self-contained HTML file (inline `<style>`, no external stylesheets, fonts, CDN scripts, or network calls — it must render correctly opened directly from disk with no internet connection) showing the idea's main screen — a landing page or the core in-app view, whichever better sells the idea.

Requirements:

- **Real content for this idea.** Actual headline, actual sample data rows, actual button labels and microcopy written for this specific product — never "Lorem ipsum," never "Company Name," never `[placeholder]`.
- **Visually appealing, not a wireframe.** Real color palette (pick 2-3 colors that fit the idea's tone), spacing, typography hierarchy, hover states if interactive elements are shown. Boxes-and-labels is a rejection, not a mockup.
- **Icons.** Inline SVG or Unicode/emoji glyphs are fine; icon fonts or CDN icon libraries are not (breaks the self-contained requirement).
- **Scoped to what Week 1 actually builds**, so the mockup and the plan agree on what the product is — don't mock up features that were explicitly cut in Step 2.

## Step 5 — Write the one-pager's content

Draft the marketing copy before touching a PDF tool. This is a pitch, not a spec:

- **What it does** — one punchy line, plain language, no jargon from `architecture.md`/`tech-stack.md` leaking in.
- **Who needs it** — a specific person/role, not "everyone."
- **Why it matters** — exactly one sentence.
- Short lines and icons throughout; no paragraphs of technical description. If a sentence needs a second sentence to explain it, cut it.

## Step 6 — Render the one-pager to a real PDF

The deliverable is `project-blueprint/one-pager.pdf` — an actual single-page PDF file. Saving the content as `.md` or `.html` and naming it `.pdf` is not acceptable; verify the output file is real PDF binary (starts with `%PDF-`), not renamed text.

1. Using Write, lay out the Step 5 copy as a print-ready single page (inline `<style>`, `@page` sized to letter/A4, no external assets) and save it to a temp path outside `project-blueprint/` (e.g. the OS temp directory) — this is scratch input, not one of the three deliverables.
2. Using exactly one Bash command, convert that HTML to `project-blueprint/one-pager.pdf`, picking whichever tool is actually available on the machine, in this preference order:
   - **Headless Chrome/Edge print-to-PDF** — e.g. `chrome --headless --disable-gpu --print-to-pdf=project-blueprint/one-pager.pdf <temp.html>` (or the `msedge`/`chromium` binary, whichever exists).
   - **Node + Puppeteer** — only if Puppeteer is already installed in this project/environment; don't drive-by `npm install` it.
   - **Python + a PDF library** (`reportlab`, `weasyprint`, or similar) — only if already installed.
3. If none of the above are available, tell the user which tools you checked for and ask them to install one rather than faking the PDF another way.
4. Note which tool actually produced the PDF — you'll need it for the final report.

## Step 7 — Report back

When finished, report to the user:

1. Every file created, with its exact path:
   - `project-blueprint/mvp-plan.md`
   - `project-blueprint/mockup.html`
   - `project-blueprint/one-pager.pdf`
2. One line on what each file contains.
3. Which tool actually generated the PDF (headless Chrome/Edge, Puppeteer, or the specific Python library).
