# Implementation Plan: Signal Age

**Branch**: `001-signal-age` | **Date**: 2026-11-17 | **Spec**: [spec.md](spec.md)

**Input**: Clarified specification `specs/001-signal-age/spec.md` (five clarifications, session 2026-11-17), `StarterKit/PLAN.md`, and the model tables and hand-checked cases in `StarterKit/SPEC.md` (source of truth for values).

**Note**: No plan existed before this run; the "What changed" section compares this plan with `StarterKit/PLAN.md`.

## Summary

Build Signal Age as a static browser game: the learner picks the feasible, cheapest communication medium for each of six requests across three eras. A pure evaluator grades every choice from authored data; the UI only renders the evaluator's result. **Level 1 Round 1 is built first** as a complete vertical slice (briefing, request card, media table, grade, explanation, retry, Next) before any other round.

Technical approach: semantic HTML, CSS, native JavaScript modules and inline SVG (since the redesign, drawn over pre-rendered WebP terrain and sprite images; see "Redesign 2026-11-17"). Content lives in `data/levels.json`. Session state is in memory. No framework, bundler, backend, runtime model, account or API key.

**Plan status: all three levels are plannable.** The 2026-11-17 decisions closed every gap that blocked Level 3 and are recorded in `StarterKit/SPEC.md` (task T076). A build that stops before Level 3 is an interim demo, not the first playable release (spec Assumptions).

## Redesign 2026-11-17: a communications builder (user direction)

The user rejected choose-and-submit ("I wanted it to be similar to sim city but scoped down to just communications services/infrastructure") and asked for real terrain. The scenarios, the evaluator, the content and the grading rule stay; the interaction becomes building on a map in game time. Constitution 2.0.0 records the amendment and its conflicts (spec "Session 2026-11-17 (redesign)", FR-034–FR-039).

| Layer | Change |
| --- | --- |
| `engine/sim.js` (new, pure) | `resolveBuilds(content, roundId, builds)`: for each `{mediumId, startMonth}` the evaluator row gives the functional failures; readiness is `startMonth + totalBuildMonths <= leadMonths`. Outcome `served` (spent equals the evaluator's cheapest feasible cost, so that medium alone), `overbuilt` (some build works, but spent is higher) or `unserved`. Also `buildFacts`, `demandOf`, `levelBudget`. Imports only `rules.js`. |
| `engine/state.js` | Actions SELECT, BUILD, TICK, SKIP, RETRY (also "Start over" and "Rewind"), HINT, WORKED_SOLUTION, NEXT, TRANSITION_DONE, CONTINUE, RESTART_*. Per round: `month`, `builds`, `spent`, `lastResult`. Notices NO_TOOL, NOT_OFFERED, ALREADY_BUILT, NO_FUNDS, NOTHING_BUILT count nothing. `treasury()` is the current demand's remaining funding. SUBMIT is gone. |
| `engine/feedback.js` | `buildPreview` (facts, no verdict), `outcomeReport` (served: every check and why it is cheapest; over-built and not served: what failed and a next step, never the answer), `noticeText`. |
| `engine/content.js` | `levels[].budget` validated (positive integer ten-thousandths) and must cover the cheapest feasible cost (BUDGET_TOO_SMALL, round-level). |
| `ui/` | `map.js` draws the stage (terrain image, demand route or area, builds by style with construction progress, earlier networks, sprites, scale bar); `render.js` draws HUD, build menu, side panel, overlays and ledger; `controls.js` runs the clock (play 650 ms/month, fast 180 ms/month), focus, announcements and animations; `icons.js` holds the line icons. |
| Assets (static) | `assets/maps/*.webp` (seven real-terrain views) and `assets/sprites/*.webp` (eight settlement sprites), made offline by `tools/terrain/*.py` (AWS Terrain Tiles + Natural Earth rivers → heightmaps) and `tools/blender/*.py` (Blender 4.5.9 LTS, headless). The game never runs these tools (C5). |

Runtime stays static HTML, CSS and ES modules with no framework. The asset tools need Python 3 with Pillow and NumPy, network access to the public tile bucket, and Blender; they are documented in the README and are not needed to play or test.

## Technical Context

**Language/Version**: HTML5, CSS, ECMAScript modules in current evergreen browsers (Chrome, Firefox, Safari, Edge). No transpilation.

**Primary Dependencies**: None at runtime or in tests. Python 3 `http.server` is used only for local preview.

**Storage**: None. In-memory session state; reload starts fresh (FR-016).

**Testing**: Dependency-free browser test runner at `tests/index.html` using a tiny local harness (`tests/harness.js`). Zero discovered tests is a failure. Expected results come from `StarterKit/SPEC.md` hand-checked cases, written independently of the evaluator.

**Target Platform**: Static hosting, including a GitHub Pages subpath. Relative paths and case-correct filenames only.

**Project Type**: Single static web project (no backend, no build step).

**Performance Goals**: Instant grading (a pure function over at most about 25 media). No timers gate feedback or controls (C4).

**Constraints**: Offline-capable once served; no network call after load except same-origin `data/levels.json`. Integer cost arithmetic (ten-thousandths) and exact rational time comparison so equality is exact (FR-006). Media table may scroll within its own labeled container (FR-025).

**Scale/Scope**: 3 levels, 6 rounds, about 22 media (14 in Levels 1–2 plus the Level 3 set), 1 data file.

Preview command (run from the repository root once `index.html` exists):

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Game: http://127.0.0.1:8000 · Test runner: http://127.0.0.1:8000/tests/ (same server). On Windows use `py` in place of `python3`.

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1 design and after the 2026-11-17 gap decisions (below).*

| Principle | How this plan satisfies it | Evidence planned |
| --- | --- | --- |
| **C1 Technical truth** | One documented feasibility rule (spec FR-001) in `engine/rules.js`; boundary equality counts; cost ties and missing fields are content errors that block grading. Physical limits, standard rates and the listed historical anchors are source-required before release; other values carry a source or a game-model label (spec FR-019, SC-010). | `tests/rules.test.js` cases transcribed from `StarterKit/SPEC.md` "Cases the implementation must satisfy" with expected results hand-derived; `tests/content.test.js` includes a **release-readiness** test that fails while any physical limit or standard rate lacks a source. |
| **C2 Teaching decision** | Choosing a medium is the only graded action. Hints follow class → reach → delivery time → capacity → build time and cost, then a worked step; worked solution records assistance. | Table mapping each action to LO1–LO3 in `StarterKit/README.md`; a deliberately-wrong-choice walkthrough per level in the verification log. |
| **C3 Honest progress** | `engine/state.js` owns attempts, assistance and completion separately; duplicate Submit is guarded in state logic, not just by disabling the button. Spec "Progress Rules" table is the test oracle. | `tests/state.test.js`: wrong, repeated submit, empty submit, hint, completion, era advance, restart/cancel. | *Redesign:* the submission is the demand's arrival with at least one build; guidance notices count nothing; Retry and Start over refund (tests S1–S24, M1–M12).
| **C4 Access** | Native radio group; visible focus; live region for feedback; `<dialog>` for Restart confirm; SVG map has a text equivalent; reduced motion via `prefers-reduced-motion`; skip controls (button and key) on the years-pass transition and on message travel. | Recorded keyboard-only, narrow-window and reduced-motion checks (what was actually checked, no certification claim). | *Redesign:* the build menu is one tab stop with arrow keys; the map overlay is decorative (`aria-hidden`) and its text equivalent lists builds; focus survives clock re-renders.
| **C5 Deterministic and self-contained** | Growth is authored data keyed by round; no `Math.random`, no network, no model. | Test that two playthroughs with different choices load identical growth and requests; clean-session check with only static files. |
| **C6 Reviewable content** | `data/levels.json` holds media, plants, growth, requests, hints, sources. `engine/` is DOM-free. Feedback is assembled from evaluator evidence; no answer key. Adding a request or medium is a data change. | One level's data inspected, one answer traced through the evaluator (T059), and a trial-request test that adds a request to data only and grades it with no engine change (SC-005). |
| **C7 Done is demonstrated** | README carries a verification table (pass / fail / not run, date, environment, evidence). Failed and untested checks stay visible. | `StarterKit/README.md` verification table covering AC1–AC13. |

**Gate result:** PASS for all three levels. Level 3 grades only Level 3 media with documented rules, so no unsupported grading remains (C1).

**Post-design re-check (after Phase 1):** same result. `data-model.md` and `contracts/` add no new principle conflicts: the evaluator contract is pure, the data contract separates content from rules, and the UI contract keeps every decision value visible without hover.

## Source-of-truth gaps and assumptions

`StarterKit/SPEC.md` is the source of truth for values. The gaps below were found while planning and decided on 2026-11-17; the decisions are now written into `StarterKit/SPEC.md`. Only G6 is still open.

| ID | Gap | Decision (2026-11-17) | Status |
| --- | --- | --- | --- |
| **G1** | Capacity is graded for every request class, but `SPEC.md` gave circuits only for voice and data. | **Assumption A1, now a documented game-model rule:** alert and text requests need 1 circuit; single-channel media carry 1. T044 confirms no hand-checked case changes. | Closed |
| **G2** | Level 3 was to grade every unlocked medium, with no service-area rules for Level 1–2 media. | Level 3 offers only Level 3 media; earlier media are comparison rows, not offered or graded. | Closed |
| **G3** | The optional Level 3 deadline had no distance. | Ground media use the request's route distance; satellites use the path-only floor. | Closed |
| **G4** | Band labels had no defined bands. | **Assumption A2, now documented:** the band label is the value's readable unit (ms, s, min, h, days, weeks, months; bps, kbps, Mbps, Gbps). | Closed |
| **G5** | Every Level 3 value needed a source before release. | Physical limits, standard rates and the listed historical anchors need sources; other values may ship labeled "game model value". | Closed (those sources are still to be found; see `research.md`) |
| **G6** | `StarterKit/PLAN.md` uses `towerCost × towers` and checks circuits only for voice and data. | Follow `SPEC.md`. | **Open:** task T086 aligns `StarterKit/PLAN.md` |
| **G7** | `SPEC.md` contradicted itself on satellite delivery time (about 290 ms by its table, 239 ms by its cases). | Path only, at the speed of light: geostationary about 239 ms, LEO about 4 ms; the ground distance is not added. Matches the cases; the table wording is corrected. | Closed |
| **G8** | `SPEC.md` listed LEO satellites as a stretch idea and as a v1 Level 3 medium. | LEO stays in v1; removed from the stretch list. | Closed |

**Other assumptions (all labeled game-model values or interface choices):**

- **A3** Every medium value in `StarterKit/SPEC.md` (reach, speed, build time, cost, courier payload, signal-style capacity, wireless tiers, the 10% active-user share, the 50 people/km² density cap) is a **game-model value** unless a source is attached. Physical limits (about 200,000 km/s in fiber, 35,786 km geostationary altitude) and standard rates (64 kbps channel, T1 1.544 Mbps, T3 44.736 Mbps, OC-3/12/48) must carry sources.
- **A4** Latency and capacity scores use floating point because they are display-only. Grading never touches floats.
- **A5** Delivery time is compared as an exact rational (integer numerator and denominator), not a float.
- **A6** One request per round, one answer per request, no free text.
- **A7** The Level 1 briefing introduces speech and writing; there is no Level 0.
- **A8** Browsers support ES modules, `<dialog>`, `matchMedia` and `fetch`; no polyfills.
- **A9** The 5–10 minute session target is unverified once Level 3 grades all media (spec flags this).

## Project Structure

### Documentation (this feature)

```text
specs/001-signal-age/
├── plan.md              # This file
├── research.md          # Phase 0: decisions and source worklist
├── data-model.md        # Phase 1: entities, fields, validation, state
├── quickstart.md        # Phase 1: run and validation guide
├── contracts/
│   ├── evaluator.md     # Pure evaluation contract
│   ├── levels-data.md   # data/levels.json contract
│   └── ui.md            # Controls, ARIA, focus and live-region contract
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
index.html                 Semantic shell, module entry point
style.css                  Layout, focus, feedback states, reduced motion, narrow layout
main.js                    Load, validate, start; loading and content-error screens
engine/                    Pure, DOM-free domain logic
  rules.js                 Feasibility, cost, expected answer, evidence
  content.js               Validate authored data; release-readiness checks
  state.js                 Attempts, assistance, completion, era advance, restart
  feedback.js              Turn evaluator evidence into explanations
  scores.js                Display-only latency/capacity values, units, bands, 0–10 scores
ui/
  render.js                Briefing, snapshot, request card, media table, feedback, summary
  map.js                   Map stage: terrain image, SVG overlay (demand, builds, messages), sprites (redesign)
  controls.js              Events, keyboard, focus management, Restart dialog
data/
  levels.json              All authored content
tests/
  index.html               Browser runner (imports an explicit suite list); FAILS when zero tests are discovered
  harness.js               Minimal describe/it/assert and result summary
  harness.test.js  rules.test.js  state.test.js  sim.test.js  content.test.js  scores.test.js
engine/sim.js  ui/icons.js        Added by the 2026-11-17 redesign (see "Redesign" above)
assets/maps/  assets/sprites/     Pre-rendered real-terrain views and settlement sprites (static)
tools/terrain/  tools/blender/    Offline asset pipeline; never part of the game runtime
StarterKit/README.md   The game's README: run steps, behavior, verification table (AC1–AC13). The root README.md is the workshop's and is not touched.
```

**Structure Decision:** one static project at the repository root, as `AGENTS.md` records. `engine/` never touches the DOM, which lets the same modules run in the test runner and the game. `scores.test.js`, `tests/harness.js` and `tests/harness.test.js` are additions to the layout in `StarterKit/PLAN.md`.

## Design decisions that matter

1. **Rational delivery time.** `deliveryTime` is `{num, den}` in seconds. Comparing `dist ≤ speed × deadline` with integers makes "equal counts as on time" exact (for example 200 km at 200 km/day against 24 h). Propagation media use their speed over the request distance; satellites use only the up-and-down path at the speed of light (no ground-distance term), a physical floor (FR-033).
2. **Integer money and months.** Costs are stored in ten-thousandths of a cost unit. Level 3 formulas use integer ceilings (`ceil(a/b)` as integer division). 0.005 per person is stored as 50, and halving it on lit SONET gives 25, so no rounding rule is needed.
3. **Plant before technology.** Total cost and build months are plant plus technology; existing infrastructure zeroes the plant part for that medium. Dark fiber implies ducts and fiber; lit SONET implies dark fiber and halves technology cost for fiber media only.
4. **Two-stage grading.** (a) Content validation decides if a round can be graded at all (no tie among the two cheapest feasible media, no missing field, at least one feasible medium). (b) `evaluate` grades one choice. A file-level error stops the game; a round-level error disables only that round; release-readiness checks (three levels of two rounds, sources for physical limits and standard rates) are tests, not load errors, so partial content can be played while it is built. A content error never reaches state counters.
5. **Feedback from evidence only.** `feedback.js` renders strings from `evidence.perMedium` and template text from data; there is no per-round answer key.
6. **Scores are quarantined.** `scores.js` imports nothing from `rules.js` grading output other than delivery time and capacity, and `rules.js` never imports `scores.js`. A test asserts that changing score formulas does not change `status` or `expected`.
7. **Years-pass.** Driven by `growth.yearLabel` plus tier differences between consecutive rounds; skippable by button and key; instant text under reduced motion; never blocks feedback or controls. Message travel has its own skip control (button and key) and ends at once under reduced motion.
8. **No city building.** No control exists to add, move or upgrade a settlement (FR-028); a test asserts the UI exposes none.
9. **Offered versus shown media.** Levels 1–2 offer every medium unlocked so far. Level 3 offers only Level 3 media; earlier media are comparison rows (latency, capacity, scores) that are not in the radio group and not graded (FR-003, FR-030).

## Implementation order

| Slice | Deliverable | Evidence before the next slice |
| --- | --- | --- |
| **0 · Harness** | `tests/index.html`, `tests/harness.js`, empty-suite failure, `index.html` shell | Runner shows FAIL with 0 tests, then PASS with the first test; recorded |
| **1 · Level 1 Round 1, end to end** | Evaluator for the five Level 1 media, data file with Round 1 only, briefing, growth snapshot, request card, media table with latency and capacity, Submit, feedback, retry, hint, worked solution, Next | Smoke beacon correct (cost 3), horse relay `TOO_SLOW` (3 h vs 1 h), no-selection guidance, duplicate submit safe, all verified in browser and by tests |
| **2 · Prove the rest of the rule for Levels 1–2** | All Level 1–2 cases (reach, deadline, lead time, plant, circuits, ties, scores) | `rules.test.js` and `scores.test.js` pass against hand-derived expected values |
| **3 · Level 1 Round 2 and Level 2** | Remaining Level 1–2 rounds, validation, hints, era-advance screens, summary for Levels 1–2 | Each round has exactly one cheapest feasible medium; round cases reviewed against `SPEC.md` |
| **4 · Make it usable** | SVG map and text equivalent, years-pass, keyboard and focus order, reduced motion, narrow layout, error states | Keyboard-only, narrow-window and reduced-motion checks recorded |
| **5 · Level 3** | Level 3 media and tower-site plant, service-area rules, optional deadline with route distance, path-only satellites, earlier media as comparison rows, Level 3 rounds | Level 3 cases in `StarterKit/SPEC.md` pass; release-readiness test passes |
| **6 · Package** | Game README (`StarterKit/README.md`) with run steps, behavior, limits and the AC1–AC13 verification table | A teammate follows the README from a clean checkout |

Each slice records its result in the README verification table before the next begins (C7). `tasks.md` is generated from these slices.

## Verification: AC1–AC13

Each criterion is recorded as **pass / fail / not run** with date, environment and evidence. All are **not run** today because no code exists.

| AC | What must be shown | How | Slice |
| --- | --- | --- | --- |
| AC1 | First briefing precedes any answer | Automated state test; browser check on fresh load | 1 |
| AC2 | Smoke beacon is correct; link lights; explanation says feasible and cheapest | Automated rule test; browser check of lit link and text | 1 |
| AC3 | Horse relay is late (3 h vs 1 h); completion unchanged; retry works | Automated rule and state tests; browser check | 1 |
| AC4 | No selection gives guidance only; attempts and completion unchanged | Automated state test; browser check | 1 |
| AC5 | Hint explains the method, then a worked step; worked solution only after the method hint; each recorded as assistance, round not completed | Automated state test; content review of hint text | 1 |
| AC6 | One attempt per valid submission; correct completes once; resubmit after success is a no-op | Automated state test (including direct state calls, not only the disabled button) | 1 |
| AC7 | Level completes at two solved rounds; era-advance screen; final summary | Automated state test; browser playthrough of Levels 1–2 now, Level 3 after slice 5 | 3 and 5 |
| AC8 | Restart asks to confirm; confirm clears; cancel preserves | Automated state test; keyboard check of the dialog | 1 |
| AC9 | Visible focus, accessible names, full keyboard reach | Manual keyboard-only playthrough, recorded | 4 |
| AC10 | Text feedback, announced, map text equivalent, message travel skippable, reduced motion keeps information | Manual screen-reader-style check of the live region and text list; reduced-motion check; no certification claim | 4 |
| AC11 | Latency and capacity with 0–10 scores and band labels for every unlocked medium; units readable; scores never affect grading | Automated `scores.test.js` against the spec's score cases (courier about 0.7, telephone about 5.8, horse relay about 3.0, T3 over 15,000 km about 8.1); invariance test; the geostationary score (about 7.6) arrives with the Level 3 media | 2 (geostationary in 5) |
| AC12 | Existing infrastructure listed; plant and technology split with built plant at zero; higher tier same plant, same time | Automated plant cases (T1/T3, OC-3/12/48, lit SONET halving) | 2 |
| AC13 | Years-pass names the new year and changed settlements; skippable; instant text under reduced motion; never delays controls | Automated caption-builder test; manual skip and reduced-motion check | 4 |

Other checks: spec Progress Rules table (state test), edge cases (boundary reach, deadline, lead time), content errors (tie, missing field, no feasible medium), determinism (identical growth across plays), trial-request-by-data (SC-005), clean static-file session (SC-006), source review of every briefing and explanation (SC-008), and the Level 3 release-readiness test (SC-010).

## What changed from `StarterKit/PLAN.md`

1. **Build order:** Level 1 Round 1 is a full vertical slice first, replacing "evaluator for all three levels first".
2. **Capacity:** circuits are graded for every request class (clarification Q3), with assumption A1 filling the missing Level 1–2 values.
3. **Level 3:** offers only Level 3 media, with earlier media as comparison rows, and allows an optional deadline (route distance for ground media, path-only floor for satellites).
4. **Sources:** physical limits, standard rates and the listed historical anchors must be sourced before release, enforced by a release-readiness test; other values may carry a `"game-model"` label, as `StarterKit/PLAN.md` allowed.
5. **Scores:** band labels added beside the 0–10 scores (Q4, assumption A2).
6. **Cost formula:** follows `SPEC.md` (`8 × new sites + radio × towers`), not `towerCost × towers` (G6).
7. **Verification:** explicit AC1–AC13 table with slice and method; `scores.test.js` and `tests/harness.js` added.
8. **Unchanged:** stack, file layout, data contract shape, session transitions, interaction direction, and scope controls.

## Complexity Tracking

No constitution violations. The only added structure beyond a minimal build is `tests/harness.js`, `tests/harness.test.js` and `scores.test.js`; both exist to satisfy C1 and C7 (independent, runnable evidence) and a single runner file would not stay readable.
