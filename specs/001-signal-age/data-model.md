# Data Model: Signal Age

Authored content lives in `data/levels.json`. Session state lives in memory. Values come from `StarterKit/SPEC.md`; this file defines shapes and rules, not the numbers. Fields marked **(A1)** follow the circuit rule confirmed on 2026-11-17 (plan gap G1).

## Document

`{ schemaVersion, sources[], plants[], media[], levels[] }`

## Entities

### Source
`id`, `title`, `url`, `section`, `claim`. A value may instead carry `"game-model"` as its source.

### Plant
`id` (`copper-plant`, `ducts`, `fiber-cable`, `tower-sites`, `semaphore-towers`), `requires` (plant id or null; fiber cable requires ducts), `months`, `cost` (an object with any of `fixed`, `perRouteKm`, `perTower`, in ten-thousandths: `fixed` for Levels 1–2, `perRouteKm` or `perTower` for Level 3), `source`.

### Medium
- Identity: `id`, `name` (by what it is, never a company or product), `era` (1–3).
- Capability: `class` (`alert` < `text` < `live-voice` < `data`), `reach` (`km` | `unlimited` | `coverage`), `speed` (`instant` | `km_per_unit` | `propagation` | `satellite_path` with `pathKm`, the up-and-down path only; no ground-distance term), `fixedLatency` (optional).
- Capacity: `capacity` (`bps` | `payload` | `user_mbps`) for display and scores, plus `circuits` for grading **(A1: present on every Level 1–2 medium)**.
- Build: `plant` (id or null), `technology` (`{months, cost}` for Levels 1–2; for Level 3 `{months, perPerson}` (fiber), `{months, perTower}` (wireless) or `{months, fixed, perPerson}` (satellites)).
- Level 3 only: `serviceArea` with `kind` `fiber` (`maxUserMbps`, `mobile`), `wireless` (`coverageKm2`, `capacityMbps`, `peakUserMbps`, `mobile`, `requiresFlat`) or `satellite` (`maxUserMbps`, `densityCap`, `mobile`).
- Provenance: `source` (id or `"game-model"`).
- Level 1–2 media have no service-area rules: in Level 3 they are comparison rows only, never offered or graded.

### Growth snapshot (per round)
`yearLabel`, `settlements[]` (`id`, `name`, `tier`, map position `x` 0–100 and `y` 0–70 in the rendered view, `reason`), and `map` (added 2026-11-17): `image` (relative path to the pre-rendered real-terrain view), `widthKm` (real width of the view, for the scale bar), optional `area {x, y, rx, ry}` (the Level 3 service area as an ellipse in the same frame) and `places` (every settlement's position in this view, used to draw the player's earlier networks). Positions outside 0–100 × 0–70 are off the map and shown as edge chips. Map data illustrates only; grading never reads it. Tiers never decrease across rounds. The epilogue snapshot has the same shape.

### Request
- Levels 1–2: `from`, `to`, `distanceKm`, `class`, `deadline {value, unit}`, `leadMonths`, `circuits` **(A1: required for every class)**.
- Level 3: `population`, `areaKm2`, `routeKm`, `perUserMbps`, `mobile`, `flat`, `class`, `leadMonths`, optional `deadline` (ground media use `routeKm` for delivery time; satellites use their path only). Density is derived, never stored.

### Existing infrastructure (per round)
`assets[]` (`copper-plant`, `ducts`, `dark-fiber`, `lit-sonet-fiber`, `tower-sites`), `existingTowerSites` (integer, 0 or more). Dark fiber implies ducts and fiber cable; lit SONET implies dark fiber and halves fiber-technology cost. Authored, never derived from the learner's choices.

### Round
`id`, `growth`, `request`, `existingInfrastructure`, `hints[]` (ordered: method, then worked step), `sourceIds[]`. The worked solution is not authored: `engine/feedback.js` builds it from the evaluator's evidence.

### Level
`id`, `title`, `eraName`, `learningOutcome` (LO1–LO3), `briefing`, `sourceIds[]`, `unlockedMediumIds[]`, optional `budget` (added 2026-11-17: funding for each demand in this level, a positive integer of ten-thousandths, a game-model value; it must cover the cheapest feasible medium of every round in the level, or that round is a BUDGET_TOO_SMALL content error; absent means no limit), `rounds[]` (two per level; checked by release readiness, not at load, so partial content can be played during development). Offered media: Level 1–2 rounds offer every medium unlocked so far; Level 3 rounds offer only era-3 media and show earlier media as comparison rows.

### Evaluation result (derived, never stored in data)
`status`, `expected`, `reasonCode`, `evidence.perMedium[]`. Shape in `contracts/evaluator.md`.

### Arrival outcome (derived by `engine/sim.js`, never stored in data)
`status` (`served`: the evaluator's answer built alone and ready in time; `overbuilt`: some build works but more was spent than the answer costs; `unserved`), `arrivalMonth`, `results[]` (`mediumId`, `name`, `startMonth`, `readyMonth`, `cost`, `ready`, `functionalFailures[]`, `works`), `servedBy`, `spent`, `cheapest {mediumId, name, cost}`, `overspend`.

### Session state (in memory only)
`view`, `levelIndex`, `roundIndex`, `nextLevelIndex`, `selectedMediumId`, `notice` (NO_TOOL, NOT_OFFERED, ALREADY_BUILT, NO_FUNDS, NOTHING_BUILT, with the round id and numbers), `transition`, `confirmRestart`, `unavailable` (round ids with content errors), and per round: `month`, `builds[] {mediumId, startMonth}`, `spent`, `attempts`, `assistance`, `hintStage` (0, 1 method, 2 worked step), `workedSolution`, `solved`, `lastResult` (an arrival outcome). Funding left for a demand is its level's `budget` minus that round's `spent`. Reload resets everything.

## Validation rules

Validation is **per round**. There are three kinds of check.

**File-level (stops the game with a load error):** invalid JSON, wrong `schemaVersion`, duplicate ids anywhere in the file.

**Round-level (disables that round only, shows "challenge unavailable" naming the level and round id, counts nothing):**

1. Missing ids; unknown medium id, class or unit.
2. Non-positive distance, population, area or route length; negative build time or lead time; circuits below 1 **(A1)**.
3. A medium with no `source` and not labeled `"game-model"`, or missing a required field (every round that unlocks it is disabled).
4. A settlement tier lower than in an earlier round (the later round is disabled).
5. A round with **no feasible medium**.
6. A round whose **two cheapest feasible media have equal cost** (authoring error, never a learner failure).
7. A request whose class is not carried by any offered medium.

**Release readiness (a test, not a load error, so partial content can be played while it is built):**

8. The game has three levels and each level has exactly two rounds (`Level.rounds`).
9. Every physical limit, standard rate and listed historical anchor has a real source, not `"game-model"` (spec FR-019, SC-010).

## State transitions

Authoritative table: spec section "Progress Rules". Summary:

```text
loading → briefing → building (month 0)
building ─ choose ───────────────→ preview only (nothing built, spent or counted)
building ─ build ────────────────→ build starts this month, funding spent (no attempt)
building ─ build: none chosen / twice / too little funding ─→ guidance (no attempt)
building ─ clock ────────────────→ months advance, stopping at the arrival month
arrival, nothing built ──────────→ held with guidance and Rewind (no attempt)
arrival, not served or over-built → report, attempt+1, same round; Retry refunds and rewinds
arrival, served ─────────────────→ report, attempt+1, solved, Next enabled
building ─ start over ───────────→ month 0, builds removed, refund (no attempt)
solved ─ build / clock / Retry ──→ no-op
any ─ hint / worked solution ───→ assistance+1 (no completion, no attempt)
solved ─ Next ──────────────────→ years-pass (skippable) → next round
                                  | era-advance (after Level 1 or 2) | summary (after last round)
any ─ Restart(confirm) ─────────→ first briefing, all counters cleared
any ─ Restart(cancel) ──────────→ unchanged
content error ─────────────────→ "challenge unavailable"; nothing graded or counted
```

Relationships: Level 1—* Round; Round 1—1 Request, 1—1 Growth snapshot, 1—1 Existing infrastructure; Level *—* Medium by `unlockedMediumIds`; Medium *—1 Plant; every factual field *—1 Source.
