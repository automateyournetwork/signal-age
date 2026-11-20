---

description: "Task list for Signal Age first playable version"
---

# Tasks: Signal Age

**Input**: Design documents from `/specs/001-signal-age/` (`plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`). "The README" below means the game's README, `StarterKit/README.md`; the workshop's root `README.md` is not touched.

**Prerequisites**: `plan.md` and `spec.md` (required); numeric values come from `StarterKit/SPEC.md` (source of truth). Constitution: `.specify/memory/constitution.md`.

**Tests**: Included. The plan and constitution (C1, C7) require an independent browser test runner, hand-derived expected results and recorded verification. Expected values in tests are copied from `StarterKit/SPEC.md` cases, never computed by the code under test.

**Organization**: Phases follow the plan's implementation slices in order (the plan lists slices 0–6; the request said "five slices", and this file follows the plan as written). Each user-story task carries a `[US#]` label: US1 decision (P1), US2 help and finish (P1), US3 accessible controls (P1), US4 scores and costs (P2), US5 growth (P3). Each slice ends with a **recorded verification result** before the next slice starts (C7).

## Format: `- [ ] T### [P?] [US#?] Description with file path`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- Constrained fields are cited as `data-model.md` `Entity.field`; the canonical constraint lives there, not here.
- Paths are relative to the repository root. Preview: `python3 -m http.server 8000 --bind 127.0.0.1`; test runner: http://127.0.0.1:8000/tests/

**Scope note:** no tasks exist for stretch features (extra eras, multi-hop chains or relays, persistence, runtime AI, level editor, city building, leaderboard). Level 3 is part of v1; the 2026-11-17 gap decisions (T076) unblocked it.

---

## Slice 0 · Harness (setup, blocks everything)

**Purpose**: static shell and a test runner that fails on zero tests.

- [X] T001 Create the static page shell with a module entry point and a loading placeholder in `index.html` (semantic landmarks, relative paths, case-correct filenames)
- [X] T002 [P] Create base layout, typography, visible focus ring and a `prefers-reduced-motion` stub in `style.css`
- [X] T003 [P] Create the minimal test harness (`describe`, `it`, `assert`, `assertEqual`, result collection, failed case ids) in `tests/harness.js`
- [X] T004 Create the browser test runner in `tests/index.html` that imports an explicit list of suites (`tests/harness.test.js`, `tests/rules.test.js`, `tests/state.test.js`, `tests/content.test.js`, `tests/scores.test.js`; a static page cannot list a directory), shows totals and failed case ids, and **reports FAIL when zero tests are discovered**
- [X] T005 [P] Add `tests/harness.test.js` with a meta-test that proves the harness reports a failing assertion and that an empty suite is a failure
- [X] T006 [P] Add to `StarterKit/README.md` (the game's README): preview command, test-runner URL, and a **verification table with AC1–AC13, all marked "not run"** (columns: result, date, environment, evidence)
- [X] T007 Run the preview command, open http://127.0.0.1:8000/tests/, confirm the runner shows FAIL with zero tests, then PASS once T005 loads; record the result in the README table (C7)

**Checkpoint**: runner works and cannot pass with zero tests.

---

## Slice 1 · Level 1 Round 1, end to end (US1 core, plus US2 help and restart)

**Goal**: one complete round: briefing, growth snapshot, request card, media table, submit, feedback, retry, hint, worked solution, Next, Restart. Covers AC1–AC6 and AC8.

**Independent test**: Level 1 Round 1 (alert, 25 km, 1 h deadline, 12 months lead). Submit horse relay → late (3 h vs 1 h); submit smoke beacon → correct.

### Tests for Slice 1 (write first; they must fail before implementation)

- [X] T008 [P] [US1] Write `tests/rules.test.js` cases for Level 1 Round 1 from `StarterKit/SPEC.md`: smoke beacon correct (cost 3, expected answer), horse relay `TOO_SLOW` (25 ÷ 200 km/day = 3 h > 1 h), `NO_SELECTION` is `invalid-input`; expected values typed in by hand
- [X] T009 [P] [US1] Write `tests/state.test.js` cases for Slice 1: briefing before any answer (AC1), wrong answer keeps round open and completion unchanged (AC3), no selection gives guidance with no attempt (AC4), correct completes once and resubmit is a no-op (AC6), Hint shows the method then a worked step, Worked solution is unavailable until the method hint is seen, and each reveal counts assistance without completing (AC5), Restart confirm clears and cancel preserves (AC8)
- [X] T010 [P] [US1] Write `tests/content.test.js` cases for Slice 1: a Level 1 data file with the required fields validates; a missing field and an unknown medium id each disable only that round with a content error naming it, a duplicate id is a file-level error that stops the game, and none counts as an attempt

### Data for Slice 1

- [X] T011 [US1] Author `data/levels.json` skeleton (`schemaVersion`, `sources`, `plants`, `media`, `levels`) per `contracts/levels-data.md`, with the five Level 1 media from `StarterKit/SPEC.md` (spoken word, signal drum, smoke beacon, foot courier, horse relay), each citing `data-model.md` `Medium.era`, `Medium.class`, `Medium.reach`, `Medium.speed`, `Medium.technology`, `Medium.capacity`, `Medium.circuits` (assumption A1: 1 circuit each, labeled game-model value) and `Medium.source` (`"game-model"` unless a source record exists)
- [X] T012 [US1] Author Level 1 Round 1 in `data/levels.json`, citing `data-model.md` for each field: `Level.learningOutcome` (LO1), request (`Request.distanceKm`, `Request.class`, `Request.deadline`, `Request.leadMonths`, `Request.circuits`), existing infrastructure (`Existing infrastructure.assets`, none), growth snapshot (`Growth snapshot.settlements[].tier`, `Growth snapshot.yearLabel`, `reason`), the Level 1 briefing with the "figures are simplified model values" statement (FR-019), a worked example different from the challenge (FR-009), and ordered `Round.hints` (method first: class, reach, delivery time, capacity, build time and cost; then a worked step)

### Engine for Slice 1

- [X] T013 [US1] Implement `engine/rules.js` `evaluate` and helpers for Level 1 media: class rank, reach (equality passes), exact rational delivery time, capacity against circuits, build months against lead months, total cost in integer ten-thousandths, expected answer, `FEASIBLE_BUT_COSTLIER`; no DOM, timers or score imports (`contracts/evaluator.md`)
- [X] T014 [P] [US1] Implement `engine/content.js` `validateRound` and `validateContent`: the validation rules in `data-model.md` that apply to Level 1: `Medium.source`, `Medium.era`, `Request.distanceKm`, `Request.leadMonths`, `Request.circuits`, `Growth snapshot.settlements[].tier` never decreasing across rounds, duplicate ids, no feasible medium and cost tie. Validate per round: one bad round is disabled with "challenge unavailable", and only a file-level error (invalid JSON, wrong `schemaVersion`, duplicate ids) stops the game
- [X] T015 [P] [US1] Implement `engine/scores.js` display values: latency with readable unit and band label, capacity (including courier payload ÷ transit time) with unit and band label, and the 0–10 scores (`7 − log10(seconds)`, `log10(bps) + 1`, clamped); it must not be imported by `engine/rules.js`
- [X] T016 [US2] Implement `engine/state.js`: view transitions, valid-attempt counting, assistance counting (`data-model.md` `Session state.hintStageByRound`; hint stage: method, then worked step; worked solution only after the method hint), solve-once guard in state logic (not only a disabled button), Next gating, confirmed Restart and cancelled Restart (spec "Progress Rules")
- [X] T017 [P] [US1] Implement `engine/feedback.js`: build explanations from `evaluate` evidence only (failed constraint with the computed values, useful next step, why the correct answer is feasible and cheapest) and the worked solution, assembled from the same evidence; no hand-authored answer key (FR-008)

### UI for Slice 1

- [X] T018 [US1] Implement `main.js`: fetch `data/levels.json` by relative URL, validate per round, start the session, show loading, a file-level error screen for invalid JSON or a wrong `schemaVersion`, and a per-round "challenge unavailable" message that names the round and counts nothing
- [X] T019 [US1] Implement `ui/render.js`: briefing screen, growth snapshot with text caption, request card (from, to, distance, class, deadline, lead time, circuits, existing infrastructure), media table in its own labeled scroll container (class, reach, speed, build time and cost split into plant and technology, latency and capacity with unit, band label and score, circuits), feedback region with a per-medium failed-constraint table, and counts for completed rounds, attempts and assistance shown separately
- [X] T020 [US1] Implement `ui/controls.js`: native radio group for media, Submit, Hint (method, then worked step), Worked solution (enabled after the method hint), Next, Restart `<dialog>`; focus moves to the new screen heading; feedback goes to an `aria-live="polite"` region; add the `data-testid` hooks listed in `contracts/ui.md`
- [X] T021 [P] [US1] Extend `style.css` for the round layout: request card, media table container, feedback states (text plus color), Restart dialog, narrow-window stacking; action buttons never inside the scrolling container

### Verification for Slice 1 (record each in the README table)

- [X] T022 [US1] Run `tests/index.html`; fix until T008–T010 pass; record counts in the README (C7)
- [X] T023 [US1] Browser check **AC1**: fresh load shows the first briefing before any challenge; record pass/fail with date and browser in the README
- [X] T024 [US1] Browser check **AC2**: submit smoke beacon, round marked correct, explanation says feasible and cheapest (3 vs 8); record in the README
- [X] T025 [US1] Browser check **AC3**: submit horse relay, feedback names 3 hours vs 1 hour, completion unchanged, retry works; record in the README
- [X] T026 [US1] Browser check **AC4**: Submit with nothing selected shows guidance and changes no counter; record in the README
- [X] T027 [US2] Browser check **AC5**: Hint shows the method, a second Hint shows a worked step, Worked solution opens only after the method hint, assistance rises with each, round not complete; record in the README
- [X] T028 [US2] Browser check **AC6**: correct submit completes once, second Submit is a no-op, attempts count one per valid submission; also confirm via a direct state call in the test, not only the disabled button; record in the README
- [X] T029 [US2] Browser check **AC8**: Restart Cancel preserves the session, Restart Confirm returns to the first briefing; record in the README
- [ ] T030 [US1] Record a deliberately-wrong-choice walkthrough for Level 1 (C2, SC-004): a reviewer picks a wrong medium, states which constraint failed, what they would pick next and what LO1 outcome they practiced; record the reviewer, date and their words in the README
- [X] T031 [US1] Slice 1 gate: all of T022–T029 and T030 recorded in the README; any failure or untested item stays visible; no later slice starts until Level 1 Round 1 is fully playable

**Checkpoint (MVP)**: Level 1 Round 1 is complete, graded by the pure evaluator and recorded.

---

## Slice 2 · Prove the rest of the rule for Levels 1–2 (US1 rule, US4 scores and costs)

**Goal**: every Levels 1–2 case in `StarterKit/SPEC.md` passes in the runner. Covers AC11 and AC12 evidence.

### Tests for Slice 2 (hand-derived expected values from `StarterKit/SPEC.md` "Cases the implementation must satisfy")

- [X] T032 [US1] Add to `tests/rules.test.js` the reach cases: alert exactly 30 km correct, 31 km `OUT_OF_REACH`
- [X] T033 [US1] Add to `tests/rules.test.js` the deadline and lead-time cases: 200 km at 24 h deadline correct (equality), build time exactly equal to lead time correct (horse relay, 6 months), electric telegraph `NOT_READY` with foot courier the correct answer (100 km, 3-month lead)
- [X] T034 [US4] Add to `tests/rules.test.js` the plant cases: nothing installed (T1 correct at 35, 39 months), copper installed (T1 at 20, 3 months), dark fiber installed (T3 at 20, 3 months), copper plus dark fiber is a `COST_TIE` content error, OC-3 correct at 30 with OC-12 `FEASIBLE_BUT_COSTLIER` at the same 3 months, lit SONET halves OC-3 to 15, capacity too low (40 circuits, T1 has 24)
- [X] T035 [US4] Add to `tests/rules.test.js` a delivery-time case with a propagation medium: T3 over 15,000 km is about 75 ms and meets a 100 ms deadline (the fiber side of the `StarterKit/SPEC.md` latency-floor case); the geostationary side needs a Level 3 medium and waits for Slice 5 (T077)
- [X] T036 [P] [US4] Write `tests/scores.test.js` from the spec's score cases that use Levels 1–2 media: foot courier 1,000 km latency about 25 days (about 3.6 weeks) score about 0.7; telephone 64 kbps score about 5.8; horse relay 25 km 3 hours score about 3.0 and capacity about 93 bps score about 3.0; T3 over 15,000 km about 75 ms score about 8.1. The geostationary score (about 239 ms, about 7.6) waits for Slice 5 (T077)
- [X] T037 [US4] Add to `tests/scores.test.js` an invariance test: replacing the score functions with different ones does not change any `status`, `expected` or `reasonCode`; and a source check that `engine/rules.js` does not import `engine/scores.js`
- [X] T038 [P] [US1] Add to `tests/content.test.js` the content-error cases: cost tie among the two cheapest feasible media, a medium with a missing field, a round with no feasible medium, a request whose class no unlocked medium carries, and a decreasing settlement tier (`data-model.md` `Growth snapshot.settlements[].tier`)

### Data and engine for Slice 2

- [X] T039 [US4] Add the plant records to `data/levels.json`: copper plant, ducts, fiber cable (requires ducts), semaphore towers, each with `data-model.md` `Plant.id`, `Plant.requires`, `Plant.months`, `Plant.cost` and `Plant.source` from the `StarterKit/SPEC.md` plant table (tower sites are Level 3 and wait for Slice 5)
- [X] T040 [US4] Add the nine Level 2 media to `data/levels.json` from the `StarterKit/SPEC.md` table (optical telegraph, electric telegraph, telephone line, analog carrier trunk, T1, T3, SONET OC-3, OC-12, OC-48) with `data-model.md` `Medium.class`, `Medium.reach`, `Medium.speed` (propagation for T1 and above), `Medium.plant`, `Medium.technology`, `Medium.circuits` and `Medium.capacity` as the table gives them; keep unsourced numbers labeled `"game-model"`
- [X] T041 [US4] Extend `engine/rules.js` for plant versus technology: sum plant and technology cost and months once per medium, zero any plant present in `data-model.md` `Existing infrastructure.assets` (dark fiber implies ducts and fiber cable; lit SONET implies dark fiber and halves fiber-technology cost exactly in ten-thousandths (no rounding rule)), and propagation delivery time as an exact rational
- [X] T042 [P] [US1] Extend `engine/content.js` for the Level 2 rules: `data-model.md` `Request.circuits` (every request class), `Existing infrastructure.existingTowerSites` and asset implication checks
- [X] T043 [P] [US4] Extend `engine/scores.js` unit selection: ms, seconds, minutes, hours, days, weeks from 14 days, months from 60 days counted as 30 days; bps to Gbps scaling

### Verification for Slice 2

- [X] T044 [US1] Run the runner; every Levels 1–2 case passes with expected results hand-checked by a second person (record in the README who checked and when, or "not independently checked" if no one did)
- [X] T045 [US4] Verification **AC11** (automated part): scores and units match the formulas, never change grading; record in the README
- [X] T046 [US4] Verification **AC12** (automated part): existing infrastructure zeroes plant, and a higher SONET tier costs more with the same build time; record in the README
- [X] T047 [US4] Slice 2 gate: record all results; failed or untested cases stay visible in the README

---

## Slice 3 · Remaining Levels 1–2 rounds and progression (US2, US5, US4)

**Goal**: all four Level 1–2 rounds playable with hints, era-advance screen and a summary.

- [X] T048 [P] [US2] Add to `tests/state.test.js`: level completes after two solved rounds, Next opens the following round or era-advance screen, era advance occurs only on level completion, the summary shows completed rounds, attempts and assistance as separate counts (AC7)
- [X] T049 [US5] Add to `tests/state.test.js` and `tests/content.test.js`: growth and requests are identical when the same level is played twice with different choices, and no settlement tier ever decreases (spec US5, SC-007)
- [X] T050 [P] [US1] Add to `tests/content.test.js` a trial-request test: add a request to a copy of the data and grade it correctly with no engine change (SC-005, C6); also implement `checkReleaseReadiness` in `engine/content.js` with a test that every authored level has exactly two rounds (`data-model.md` `Level.rounds`); T080 extends it
- [X] T051 [US1] Author Level 1 Round 2 in `data/levels.json` from the `StarterKit/SPEC.md` "Boundary (deadline)" case, which uses only Level 1 media: text, 200 km, deadline exactly 24 h, so the horse relay is correct (equality counts as on time) and the foot courier needs 120 h. Author a lead time of at least 6 months, the growth snapshot, existing infrastructure (none) and hints; hand-derive and record the expected answer and cost comparison before authoring the feedback
- [X] T052 [US1] Author Level 2 briefing and Rounds 1 and 2 in `data/levels.json` from the `StarterKit/SPEC.md` voice and data cases (including circuits needed and existing infrastructure), growth snapshots with `reason` text, hints, `data-model.md` `Level.learningOutcome` (LO2), `Level.unlockedMediumIds` and `Level.rounds`, and a worked example different from the challenge (FR-009); include the electric-telegraph-not-ready text case (100 km, 3-month lead, foot courier correct) in the Level 2 round where it applies; every round must have exactly one cheapest feasible medium. **Deviation recorded 2026-11-17:** Level 2 Round 1 uses a 150 km text request instead (optical telegraph too slow, telephone not ready in 40 months, electric telegraph correct), because the 100 km / 3-month case exercises neither Level 2 misconception the spec lists; that case stays covered by test R14
- [X] T053 [P] [US2] Add the level summary with era advance, and the civilization summary, to `ui/render.js`: the level summary shows completed rounds, valid attempts and assistance and names the newly unlocked media (FR-009); the civilization summary shows the same counts separately; no points, lives, timer or streak
- [X] T054 [US2] Extend `engine/state.js` for level completion, era advance and Next routing across Levels 1 and 2 (until Slice 5, finishing Level 2 opens the civilization summary marked "interim demo: Level 3 not yet built")
- [X] T055 [US5] Add the growth caption builder to `engine/state.js` as a pure function: from the previous and next `data-model.md` `Growth snapshot.yearLabel` and `Growth snapshot.settlements[].tier` it names the new year and each settlement whose tier changed
- [X] T056 [US1] Source review (SC-008): for every briefing and explanation in Levels 1–2, check the claim against its source record or the "game model value" label, and confirm every medium is named by what it is and supports, never by company or product (FR-022); record the reviewer, date and any unsourced claim in the README
- [X] T057 [US2] Verification **AC7** (Levels 1–2): play Level 1 to Level 2 to the summary, check the era-advance screen and the three separate counts; record in the README
- [ ] T058 [US1] Record the same deliberately-wrong-choice walkthrough for Level 2 (C2, SC-004, LO2) in the README
- [X] T059 [US1] Trace one answer through the evaluator for a Level 2 round (C6 evidence): record the request, the per-medium evidence and the result in the README
- [X] T060 [US2] Slice 3 gate: record results in the README; confirm every authored round passes content validation

---

## Slice 4 · Make it usable (US3 access, US5 growth presentation)

**Goal**: SVG map with text equivalent, years-pass transition, keyboard and focus, reduced motion, narrow layout, clear error states. Covers AC9, AC10, AC13.

- [X] T061 [P] [US3] Add tests in `tests/state.test.js` that the state module offers no action to build, place, move or upgrade a settlement (FR-028) and that the caption builder (T055) never changes a request or grading result; the matching UI check is part of T069
- [X] T062 [US5] Implement `ui/map.js`: inline SVG with settlements by tier, the link between the two request settlements, a lit link on a correct choice, and a message-travel marker at a pace proportional to delivery time with a late-arrival marker; illustration only, never changes an outcome (FR-018); message travel has a skip control reachable by button and key (FR-032) and ends at once under reduced motion
- [X] T063 [US3] Implement the map text equivalent in `ui/map.js`: settlement name, size tier, distance between them and the request, linked to the SVG through `role="img"` and an accessible name (FR-024)
- [X] T064 [US3] Implement the years-pass transition in `ui/map.js` and `ui/controls.js`: sweeps from this round's `yearLabel` to the next, swaps settlement tiers, shows the caption, can be skipped by button and key, and never delays feedback or controls (FR-027)
- [X] T065 [US3] Implement reduced motion in `style.css` and `ui/controls.js` using `prefers-reduced-motion`: link and travel animation off, years-pass shown instantly as the same caption text
- [X] T066 [P] [US3] Review and fix focus order, visible focus, accessible names and `data-testid` hooks across all screens in `ui/render.js` and `ui/controls.js` (AC9)
- [X] T067 [US3] Finish the content-error and loading screens ("challenge unavailable" explanation, not shown as a learner failure) in `ui/render.js`
- [X] T068 [P] [US3] Finish the narrow-window layout in `style.css`: only the media table scrolls inside its labeled container; action buttons stay visible
- [X] T069 [US3] Manual check **AC9**: keyboard-only playthrough of Level 1 Round 1 through Next; confirm no control exists to build, place, move or upgrade a settlement (FR-028); record in the README the exact steps actually performed and the browser; do not claim accessibility certification
- [X] T070 [US3] Manual check **AC10**: feedback includes text as well as color, remains readable, is announced through the live region, the map text equivalent matches the SVG, message travel can be skipped by button and key, and reduced motion loses no information; record in the README
- [X] T071 [US3] Manual check **AC13**: Next shows the years-pass transition naming the new year and changed settlements, it skips by key and button, appears as text with reduced motion, and never delays controls; record in the README
- [X] T072 [US3] Manual check narrow window and typical laptop layouts; record the sizes tested in the README
- [X] T073 [US4] Complete **AC11** and **AC12** in the browser: every round shows latency and capacity with scores and band labels for every unlocked medium, plant and technology split, built plant at zero, earlier-era media included; record in the README
- [X] T074 [US2] Check **FR-016**: reloading mid-session returns to the first briefing with all counts cleared; record in the README
- [X] T075 [US3] Slice 4 gate: record results in the README; any unchecked item stays "not run"

---

## Slice 5 · Level 3 (US4 rules, US1 content, US2 finish)

**Gate**: cleared 2026-11-17. T076 recorded the gap decisions in `StarterKit/SPEC.md`, so Slice 5 can follow Slice 4.

- [x] T076 Update `StarterKit/SPEC.md` with the 2026-11-17 gap decisions (G1–G5, G7, G8): circuits for every request, unit band labels, Level 3 offers only Level 3 media, route distance and a path-only satellite floor, labels allowed for the Level 3 economics, LEO kept in v1, costs in ten-thousandths; record them in `specs/001-signal-age/spec.md` Clarifications
- [X] T077 [P] [US4] Write Level 3 hand-checked cases in `tests/rules.test.js` from `StarterKit/SPEC.md`: sparse (LEO correct), rural flat (fixed wireless correct), mobile (4G correct, fixed wireless `NOT_MOBILE`), dense (fiber correct, LEO excluded by density), 3G `USER_SPEED_TOO_LOW`, density equals 50 feasible, upgrade in place on lit SONET, existing tower sites, plus the geostationary latency-floor case (route 15,000 km, 100 ms deadline: the about 239 ms path-only floor is late, fiber about 75 ms is feasible) with its latency and score (about 239 ms, about 7.6) in `tests/scores.test.js`, and a case where submitting an earlier-era medium in a Level 3 round is invalid input that counts no attempt
- [X] T078 [US4] Add the Level 3 media and tower-site plant to `data/levels.json` (`data-model.md` `Medium.wireless`, `Medium.densityCap`, `Medium.maxUserMbps`, and `Plant.id` `tower-sites`) with a `Medium.source` per value: a real source for the physical limits (signal speed, satellite altitudes), otherwise `"game-model"`
- [X] T079 [US4] Extend `engine/rules.js` for service-area requests: density derived from population and area, peak demand `population × per-user Mbps × 10%`, tower counts by integer ceiling, site cost on new sites only, mobility, flat terrain, per-user speed, the optional deadline using route distance for ground media and the path-only floor for satellites (FR-005, FR-031, FR-033); earlier media are not offered or graded in Level 3, and `ui/render.js` and `ui/controls.js` show them as table rows marked "comparison only", outside the radio group (FR-003, FR-030)
- [X] T080 [US4] Extend `engine/content.js` for Level 3 request fields (`data-model.md` `Request.population`, `Request.areaKm2`, `Request.routeKm`, `Request.perUserMbps`, `Request.mobile`, `Request.flat`) and extend `checkReleaseReadiness` (from T050) and its test in `tests/content.test.js`: the game has three levels, and the check fails while any physical limit or standard rate is labeled `"game-model"`
- [X] T081 [US1] Author Level 3 briefing and Rounds 1 and 2 in `data/levels.json` (`data-model.md` `Level.learningOutcome` LO3), with growth snapshots, existing infrastructure, hints and exactly one cheapest feasible medium each; across the two rounds, cover the constitution C2 Level 3 sequence (reach, mobility, latency floors and build time under high demand), with at least one round whose deadline geostationary cannot meet, so it teaches a latency floor
- [X] T082 [US2] Complete **AC7** end to end: all six rounds, era advance after Levels 1 and 2, civilization summary after Level 3; record in the README
- [ ] T083 [US4] Record the deliberately-wrong-choice walkthrough for Level 3 (C2, SC-004, LO3) in the README
- [ ] T084 [US5] Re-run determinism, source review (SC-008, including the FR-022 naming check) and all AC checks for Level 3; confirm the 5–10 minute session target with a timed playthrough and record the result in the README (spec flags it as unverified)

---

## Slice 6 · Package (Polish and cross-cutting)

- [X] T085 [P] Complete `StarterKit/README.md` (the game's README): actual run steps, exact test command and URL, implemented behavior, a table mapping each player action to LO1–LO3 (C2), what is not built (including Level 3 status), assumptions A1–A9 from `plan.md` with every game-model value labeled, and the finished AC1–AC13 verification table with pass, fail or not run, date, environment and evidence
- [X] T086 [P] Update `AGENTS.md` (Signal Age only) so it states what actually exists and the current verification status; also align `StarterKit/PLAN.md` with `StarterKit/SPEC.md` for plan gap G6 (wireless cost formula, circuits for every class)
- [X] T087 Fresh-start playthrough from a clean checkout following only the README; record who did it, what browser, and any step that was unclear (SC-001, SC-006)
- [X] T088 Clean-session check that the game runs from static files with no network except `data/levels.json`, no account, backend, model or API key (C5, FR-026)
- [X] T089 Verify the game from a repository subpath (relative asset paths, case-correct filenames) if hosting is used; otherwise record "not run" in the README
- [X] T090 Final constitution check against C1–C7 using the evidence tables in `plan.md`; list every failed or untested item in the README rather than hiding it

## Slice 7 · Redesign as a communications builder (user direction 2026-11-17; constitution 2.0.0, FR-034–FR-039)

**Goal**: the same six demands, played by building on a map of real terrain in game time (SimCity-like, communications only). **Evidence** comes from `tests/` (99 cases) and the 2026-11-17 Chrome playthrough recorded in the README.

- [X] T091 Amend `.specify/memory/constitution.md` to 2.0.0 with the user's direction quoted and a conflict register (StarterKit constitution; non-goals on placement, economy and timers); add the redesign clarification session, FR-034–FR-039 and the revised Progress Rules to `spec.md`
- [X] T092 Fetch real elevation (AWS Terrain Tiles, Terrarium encoding) and Natural Earth rivers for southern Spain with `tools/terrain/fetch_dem.py`; build per-view heightmaps and settlement projections with `tools/terrain/build_heightmaps.py` from `tools/terrain/world.json`
- [X] T093 Render the seven terrain views and eight settlement sprites headless in Blender 4.5.9 LTS with `tools/blender/render_maps.py` and `tools/blender/render_sprites.py`; write `assets/maps/`, `assets/sprites/` and the map data in `data/levels.json` with `tools/terrain/apply_renders.py`
- [X] T094 [US1] Add `engine/sim.js` (`resolveBuilds`, served / over-built / not served) and `tests/sim.test.js` (M1–M12), including the agreement check M1: built alone in month 0, a medium carries the demand exactly when the evaluator calls it feasible and completes it only if it is the evaluator's answer
- [X] T095 [US1] Rewrite `engine/state.js` for SELECT, BUILD, TICK, SKIP and RETRY with funding per demand and guidance notices; rewrite `tests/state.test.js` (S1–S24) and content cases C6, C34, C35 (`levels[].budget` in data-model.md)
- [X] T096 [US1] Update `engine/feedback.js`: build preview without a verdict, arrival report (served explains every check and why it is cheapest; over-built and not served never name the answer), notices
- [X] T097 [US3] Rewrite `ui/map.js`, `ui/render.js`, `ui/controls.js`, `ui/icons.js`, `index.html` and `style.css`: HUD with clock and funding, build menu (one tab stop, arrow keys), map stage with construction and earlier networks, side panel, overlays beside the map, ledger dialog
- [X] T098 Run the browser test runner and a full Chrome playthrough of all six demands, the transitions and the summary; check keyboard flow, dialogs, narrow layout (760 px frame) and simulated reduced motion; record results in the README
- [ ] T099 [US1] Ask the user to confirm per-demand funding (constitution conflict item 3); remove it without touching grading if declined
- [ ] T100 Re-run the three deliberately-wrong-choice walkthroughs (T030, T058, T083) and the timed first playthrough with a human player on the builder

---

## Dependencies & Execution Order

- **Slice 0** has no dependencies and blocks everything.
- **Slice 1** needs Slice 0. Inside Slice 1: tests (T008–T010) first; data (T011–T012) before engine (T013–T017); engine before UI (T018–T021); verification (T022–T031) last.
- **Slice 2** needs Slice 1 complete and recorded. It extends the same engine and data files.
- **Slice 3** needs Slice 2. **Slice 4** needs Slice 3 (the map and transition use the Level 1–2 rounds).
- **Slice 5** needs Slice 4 (its gate, T076, is done).
- **Slice 6** needs every slice that ships; it runs last. If the build stops before Slice 5, it is an interim demo, not the first playable release; say so in the README.

Story dependencies: US1 is the core and blocks US2 (help needs a graded round). US3 is built into the UI from Slice 1 and finished in Slice 4. US4 depends on the Slice 1 engine. US5 depends on rounds existing (Slice 3).

### Parallel opportunities

- Slice 0: T002, T003, T005, T006.
- Slice 1 tests: T008, T009, T010 together; engine: T014, T015, T017 once T013's interfaces are fixed; UI: T021 with T019.
- Slice 2 tests: T032–T035 share `tests/rules.test.js` and run in sequence; T036 (`tests/scores.test.js`) and T038 (`tests/content.test.js`) can run alongside them. T042 and T043 can run together after T041.
- Slice 3: T048 and T050 together (different test files); T053 alongside T054.
- Slice 4: T061 alongside the UI work; T066 and T068 together once T062–T065 are done, then T067 (it shares `ui/render.js` with T066).

### Parallel example (Slice 1)

```text
Run together:  T008 rules tests · T009 state tests · T010 content tests
Then together: T014 content.js · T015 scores.js · T017 feedback.js
```

## Independent test criteria per story

| Story | Independent test |
| --- | --- |
| US1 Decision | Submit horse relay then smoke beacon on Level 1 Round 1: late with 3 h vs 1 h, then correct and cheapest |
| US2 Help and finish | Use a hint and a worked solution, finish the available levels, confirm separate counts, test Restart confirm and cancel |
| US3 Access | Complete Level 1 using only the keyboard with reduced motion on, in a narrow window |
| US4 Scores and costs | Check the courier (about 0.7), telephone (about 5.8), plant-zero and same-plant cases against the formulas |
| US5 Growth | Play a level twice with different choices; settlements and requests are identical, tiers never fall |

## Acceptance-criteria coverage

| AC | Verification task |
| --- | --- |
| AC1 | T023 (automated T009) |
| AC2 | T024 (automated T008) |
| AC3 | T025 (automated T008, T009) |
| AC4 | T026 (automated T009) |
| AC5 | T027 (automated T009) |
| AC6 | T028 (automated T009) |
| AC7 | T048, T057; completed by T082 |
| AC8 | T029 (automated T009) |
| AC9 | T069 |
| AC10 | T070 |
| AC11 | T036, T037, T045, T073; geostationary case T077 |
| AC12 | T034, T046, T073 |
| AC13 | T055, T061, T071 |

## Implementation Strategy

1. **MVP:** Slices 0 and 1. Level 1 Round 1 is complete, graded by the pure evaluator and recorded. Stop and demo here.
2. **Increment:** Slice 2 proves the Levels 1–2 rule; Slice 3 makes four rounds playable; Slice 4 makes it usable.
3. **Level 3:** T076 is done, so Slice 5 follows Slice 4. A build that stops before Slice 5 is an **interim demo, not the first playable release**; say so in the README and mark Level 3, LO3 and the final AC7 criterion "not run".
4. After each slice, record pass, fail or not run in the README before starting the next (C7). If time runs short, reduce scope explicitly (for example one round per level) and update this file; never weaken correctness to finish.
