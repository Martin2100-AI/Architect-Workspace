# Keysy prompt library — status report

*Written for anyone who wants to know what's in `prompts/` without opening any code. Date: 2026-08-24.*

## The short version

There are **6 prompts** in the library. **0 are marked "library-ready"; all 6 are drafts.** That's not a problem — it's the normal, expected state. A prompt only gets promoted to "ready" as a deliberate decision once it clearly earns it (see "What ready means," below), and nobody has made that call yet. Five of the six already score well enough to qualify; one hasn't been scored at all yet.

## Each prompt, and what it's for

| Prompt | What it does for the project | Score | Status |
|---|---|---|---|
| **ai-home-finder-filters** | Turns a buyer's plain-English search ("3-bedroom houses under $500K near Dallas with a pool, no HOA") into the structured filters the search engine actually runs on. This is the thing that lets a buyer type instead of clicking through filter checkboxes. | 1.00 (current version) | draft |
| **match-explanation** | Once a property is found, explains *why* it matches — which of the buyer's stated wants it satisfies and which it misses. This is what turns a bare "92% match" number into something a buyer can trust and understand. | 1.00 | draft |
| **notification-router** | Looks at a raw event (a price drop, a new listing, a tour confirmation) and decides what kind of notification it is and whether this particular buyer has asked to be told about that kind of thing. Keeps buyers from being spammed with alerts they turned off. | 1.00 | draft |
| **favorite-category-suggester** | When a buyer saves a property with a note ("love this one" vs. "let's tour it" vs. "not sure"), automatically files it into the right bucket — Favorites, Maybe, Want to Tour, or Offer Candidates — instead of leaving every save in one undifferentiated pile. | 1.00 | draft |
| **tour-request-validator** | Checks a tour request is actually complete and makes sense (no missing phone number, no date in the past, no spammy message) before it gets auto-confirmed or sent to an agent. | 1.00 | draft |
| **flag-listing-quality** | Checks an incoming property listing for bad or inconsistent data (a $0 price, a missing property type, numbers that don't add up) before it's allowed into the buyer-facing feed. This one existed before this round of work and **has not been scored yet** — see "What to build next." | not yet scored | draft |

*A score is the fraction of hand-checked test cases the prompt got exactly right, out of a scale of 0 to 1. 1.00 means every test case passed.*

## What "ready" means, and why nothing is marked that way yet

A prompt only becomes "library-ready" once all of these are true at once: it has a version number and every earlier version is kept, not overwritten; its header has nothing left blank; at least three of its test cases have had their correct answers checked by an actual person, not just Claude; it scores 0.85 or higher; and it's clear which AI model produced that score. Five of the six prompts above already clear that bar on paper — the only reason none is marked `ready` is that promoting a prompt to "ready" is meant to be a deliberate decision, not something that happens automatically the moment a number crosses a threshold. There's now a script (`check_library.py`) that checks any prompt claiming to be ready against all five rules and will loudly fail if one doesn't actually qualify — so once you're ready to promote any of these, it's a one-line status change plus a clean run of that check.

## What I would build next

1. **Score `flag-listing-quality`.** It's the one prompt in the library with no recorded score — everything else has been run through the checker at least once.
2. **Promote the five 1.00-scoring prompts to `ready`**, once you've had a chance to look them over. They already meet every rule; the only missing step is you deciding to flip the switch.
3. **Wire `ai-home-finder-filters` into `match-explanation`.** They're already designed to plug together — the first one's output is exactly the shape the second one expects as input — but that connection only exists on paper right now, not in the running app.
4. **Grow the test cases over time.** Each prompt currently has 5–7 hand-checked test cases, which is enough to catch obvious problems but not enough to catch everything. As real buyers use these features, save the tricky real-world examples as new test cases instead of letting them go untested.
