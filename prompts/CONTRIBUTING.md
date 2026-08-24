# Contributing to the prompt library

Plain-English guide for anyone working in `prompts/` who wasn't here when it
was set up.

## Structure

Each prompt lives in its own folder under `prompts/`, e.g.
`prompts/ai-home-finder-filters/`. A folder holds:

- One or more versioned prompt files: `v1.0.0.md`, `v1.1.0.md`, and so on.
  **Never overwrite a version file once it has a recorded score.** If you
  improve a prompt after it's been scored, save the improved version under a
  new version number instead, and leave the old one exactly as it was. Every
  version that was ever scored stays in the folder — we keep the history, we
  don't delete it.
- One `eval.jsonl` file: one test case per line, each with an `"input"`
  object (the values that get filled into the prompt template) and an
  `"expected"` object (the fields the response has to match).

To score a prompt: `python scripts/score_prompt.py prompts/<name>/vX.Y.Z.md prompts/<name>/eval.jsonl`

## What "library-ready" means

A prompt can only have `status: ready` in its header once **all five** of
these are true:

1. **A version number in the filename, with older versions kept.** The file
   is named `vX.Y.Z.md`. If a change was made after an earlier version was
   already scored, that earlier version's file is still sitting in the same
   folder, unedited, with its own score intact.
2. **A complete header, nothing left blank.** Every field in the frontmatter
   block at the top of the file — name, version, purpose, model, inputs,
   output, last_eval, status — has a real value. No placeholders, no empty
   fields.
3. **At least three test cases whose answers a human confirmed.**
   `eval.jsonl` has three or more lines, and a person — not just Claude —
   actually looked at the `"expected"` values and agreed they're correct
   before the prompt was scored against them. Nothing in the file itself
   proves a human looked at it; the quality-gate script can only check that
   at least three cases *exist*. The confirmation itself is on whoever adds
   the prompt.
4. **A recorded score of at least 0.85.** Run `scripts/score_prompt.py` and
   put the result in the header's `last_eval` field: date, score, and how
   many cases passed.
5. **A record of which model produced that score.** The `model` field names
   exactly which Claude model produced the score in point 4. If the eval is
   re-run on a different model, update the score and the model name
   together — a score only means something next to the model that earned it.

**Anything that doesn't meet all five stays a draft, and that's fine.** Most
prompts in this library will be drafts most of the time — that's the normal
state while a prompt is still being iterated on. Only set `status: ready`
once every one of the five is genuinely true, not before.

## Adding a new prompt

1. Create `prompts/<your-prompt-name>/`.
2. Write `eval.jsonl` first, before the prompt itself. Decide your test
   cases and their expected answers, and get a human to confirm the expected
   answers are actually correct.
3. Write `prompts/<your-prompt-name>/v1.0.0.md`, matching the structure of
   an existing prompt: a frontmatter header, then `## Instructions`,
   `## Input`, and `## Output format` sections.
4. Run `scripts/score_prompt.py` against it and record the result in
   `last_eval`.
5. If the score is low, or you spot a problem, fix **one thing at a time**
   and save the fix under the next version number (`v1.1.0.md`, etc.) —
   never edit a file that's already been scored, so you can always tell
   whether a specific change actually helped.
6. Run `scripts/check_library.py` any time to see the state of the whole
   library at a glance.

## Checking the whole library

`python scripts/check_library.py` walks every folder under `prompts/`, finds
each one's newest version, and checks anything marked `ready` against the
five rules above. Drafts are listed but not judged — they're allowed to be
incomplete. If anything claiming to be `ready` actually fails one of the
rules, the script exits with an error, the same way a failing test would in
CI.
