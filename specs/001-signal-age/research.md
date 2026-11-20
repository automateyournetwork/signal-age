# Research: Signal Age

No `NEEDS CLARIFICATION` remains in the plan's Technical Context. This file records design decisions and the source worklist. **No external source was fetched or verified for this plan**; every entry in the worklist is a to-do, not a citation.

## Decisions

### D1 · Static ES modules with `fetch` for data

- **Decision:** `index.html` loads `main.js` as a module; `main.js` fetches `data/levels.json` with a relative URL.
- **Rationale:** Matches the constitution (static files, no backend) and works from a GitHub Pages subpath. JSON import assertions are not uniformly supported, so `fetch` is safer.
- **Alternatives:** Inline JSON in HTML (harder to review separately, violates C6 spirit); a bundler (excluded by scope); `file://` (modules and `fetch` fail, so the preview command is required).

### D2 · Exact arithmetic for grading

- **Decision:** Delivery time is a rational `{num, den}` of seconds; cost is integer ten-thousandths of a cost unit (exact for 0.005 per person and its half); build time is integer months; tower counts use integer ceiling division.
- **Rationale:** Boundary equality must be exact (spec FR-002, FR-006): 200 km at 200 km/day against a 24 h deadline, and 3 months against a 3-month lead time.
- **Alternatives:** Floats with an epsilon (hides ties and boundary bugs); `BigInt` (unneeded at these magnitudes).

### D3 · Display scores in floating point, quarantined

- **Decision:** `scores.js` uses floats and `Math.log10`; `rules.js` never imports it. A test shows grading is unchanged when the score functions are replaced.
- **Rationale:** Scores are display-only (spec FR-017). Rounding to one decimal is a presentation concern.
- **Alternatives:** Integer scores (loses the specified one-decimal values such as 0.7 and 5.8).

### D4 · Two-stage grading

- **Decision:** `content.js` validates a round (tie, missing field, no feasible medium); `rules.js` grades a choice only for validated rounds. A file-level error stops the game; a round-level error disables only that round. Release-readiness checks (two rounds per level, Level 3 sources) are tests, not load errors.
- **Rationale:** An authoring error must never appear as a learner failure (constitution C1, spec FR-007).
- **Alternatives:** Validate lazily inside `evaluate` (risks counting an attempt on broken content).

### D5 · Native controls and live region

- **Superseded 2026-11-17 by the builder redesign** (build menu of buttons with a roving tab stop, Build, clock controls; see `contracts/ui.md`). Original decision: `<fieldset>` with radio inputs for media, a `<button>` for Submit, `<dialog>` for Restart confirmation, an `aria-live="polite"` region for feedback, focus moved to a heading after each screen change.
- **Rationale:** Native semantics give keyboard reach and accessible names with the least code (constitution C4).
- **Alternatives:** Custom listbox (more code, more failure modes); `window.confirm` (blocks, poor for assistive tech and tests).

### D6 · Years-pass transition

- **Decision:** A short, skippable transition built from `growth.yearLabel` and tier differences between consecutive rounds. Under `prefers-reduced-motion` it is replaced by the same caption as text.
- **Rationale:** Spec FR-027 and AC13.
- **Alternatives:** No transition (rejected by the spec); a timed animation that blocks Next (violates C4).

### D7 · Missing circuit values (assumption A1)

- **Decision:** Default every Level 1–2 request to 1 circuit and every single-channel medium to 1 circuit of capacity, stored in data and labeled as a game-model value; confirmed on 2026-11-17 and written into `StarterKit/SPEC.md`.
- **Rationale:** The clarified spec grades capacity for every class, but `SPEC.md` defines circuits only for voice and data. This default is expected to leave every existing hand-checked case unchanged; task T044 checks that and records the result.
- **Alternatives:** Skip the check for alert and text (contradicts the clarification); invent per-medium bps thresholds (no basis).

### D8 · Level 3 gap decisions (2026-11-17)

- **Decision:** Level 3 offers only Level 3 media and shows earlier media as comparison rows; Level 3 deadlines use the route distance for ground media; satellites use only the up-and-down path; the Level 3 economics may ship labeled as game-model values.
- **Rationale:** Earlier media have no service-area rules in `StarterKit/SPEC.md`, so grading them would mean inventing numbers (C1). A satellite relay goes up and down rather than along the ground, so the path alone is the physical minimum, and it matches the source's hand-checked cases. Constitution C1 allows a label where no source exists.
- **Alternatives:** Grade earlier media with drafted formulas (new unsourced numbers in grading); add the ground distance to satellite time (double-counts the path); require a source for every Level 3 value (likely blocks Level 3 indefinitely).

## Source worklist (required before release for the physical limits, standard rates and historical anchors; the Level 3 economics may ship labeled)

Status of every row: **not yet located**. Each needs a title, URL, section and the claim it supports before the value can drop its "game model value" label.

| Value | Used by | Source type to find | Status |
| --- | --- | --- | --- |
| Signal speed in fiber, about 200,000 km/s (refractive index about 1.46) | Fiber and SONET delivery time | Fiber standard or physics reference | Not located |
| Geostationary altitude 35,786 km; minimum round trip | Satellite latency floor (path only: about 239 ms geostationary, about 4 ms LEO) | Space agency or orbital-mechanics reference | Not located |
| 64 kbps voice channel | Telephone capacity | Telephony standard (digital voice channel) | Not located |
| T1 1.544 Mbps with 24 channels; T3 44.736 Mbps with 28 T1s | Capacity and circuits | Carrier hierarchy standard | Not located |
| OC-3, OC-12, OC-48 line rates | SONET capacity | SONET standard | Not located |
| Optical and electric telegraph, telephone, relay courier speeds | Level 1–2 history anchors | Reputable history of communications | Not located |
| Level 3 fiber and duct cost per route km, per-person equipment cost | Ethernet over fiber | Published deployment-cost study | Optional (may ship labeled) |
| Wireless tier coverage, capacity, per-user speed, tower cost | Wireless ladder | Published network-planning figures | Optional (may ship labeled) |
| 10% simultaneous-user share | Peak demand | Traffic-engineering reference | Optional (may ship labeled) |
| 50 people/km² satellite density cap | Satellite feasibility | Published coverage guidance | Optional (may ship labeled) |
| LEO and GEO deployment cost formulas | Satellite cost | Published cost figures | Optional (may ship labeled) |

If a source contradicts a game-model value, change the value or record the difference; never keep both silently.
