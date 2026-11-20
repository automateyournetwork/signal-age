# Feature Specification: Signal Age

**Feature Branch**: `001-signal-age`
**Created**: 2026-11-17
**Status**: Draft (re-specified 2026-11-17; redesigned the same day as a communications builder, see "Session 2026-11-17 (redesign)")
**Input**: User description: "Read StarterKit/SPEC.md. Specify Signal Age's first playable version, preserving the learning outcomes, non-goals, and acceptance criteria. Ignore Per-Hop Works." Signal Age is a browser game where the player, as Messenger-General of a growing civilization, chooses the right communication technology for each message request across three eras. The detailed model tables, hand-checked examples and case list in `StarterKit/SPEC.md` are the authoritative content for model values; this spec does not restate every figure.

## Clarifications

### Session 2026-11-17

- Q: In a Level 3 round, which media does the game grade and offer? → A: Every medium unlocked so far, with a service-area cost formula defined for each earlier medium (option C). *Superseded later the same day by the Level 3 media answer below.*
- Q: Does a Level 3 request have a delivery deadline? → A: Optional. A Level 3 request may carry a deadline, graded by the same delivery-time rule as Levels 1–2 when present (option B).
- Q: Are alert and text requests checked against circuits and capacity? → A: Yes. Every request carries an authored circuit count, and every medium a circuit capacity, so capacity is graded for all message classes (option B). Class order stays strict: a higher class can carry a lower one (data can transport text).
- Q: Keep the 0–10 logarithmic scores, or use fixed bands? → A: Show both. Each medium displays its numeric 0–10 score and a band label derived from the same value (option C). Both are display-only.
- Q: Can the Level 3 cost formulas, wireless tier values and density cap ship as labeled game-model values? → A: No. Every Level 3 value must be sourced before release (option B). *Superseded later the same day by the sources answer below.*
- Q: How is a build with only Levels 1–2 described? → A: As an interim demo, not the first playable release; the three-level, six-round scope is unchanged (analysis remediation).
- Q: Which unit stores money so per-person rates stay exact? → A: Integer ten-thousandths of a cost unit (FR-006; analysis remediation).
- Q: Do the circuit default and the band-label rule stand? → A: Yes. Alert and text requests need 1 circuit, single-channel media carry 1, and each score's band label is its value's unit (gap walkthrough).
- Q: How do Level 1–2 media appear in Level 3? → A: In the media table for comparison only; they are not offered or graded (replaces the first answer above).
- Q: How is Level 3 delivery time computed? → A: Ground media use the request's route distance; satellites use the up-and-down path only, a physical floor (geostationary about 239 ms, LEO about 4 ms).
- Q: Must every Level 3 value be sourced? → A: No. Physical limits, standard rates and the listed historical anchors need sources; every other value may ship labeled "game model value" (replaces the fifth answer above).

### Session 2026-11-17 (redesign)

- Q: What kind of game is Signal Age? → A (user, quoted): "this doesn't look like age of empires / simcity, this is supposed to be a game"; "the format of having a scenario is fine, but I didn't mean for this to be mutliple choice questions. I wanted it to be similar to sim city but scoped down to just communications services/infrastructure." The round's scenario (one demand) stays; choose-and-submit is replaced by building on a map in game time.
- Q: What map? → A (user, quoted): "use real topology map data". Real elevation and rivers of southern Spain, rendered in Blender; settlement names stay fictional and positions are approximate.
- Q: What completes a round now? → A: Unchanged in meaning (constitution C1/C3): the demand completes only when the player's network for it is the cheapest feasible medium, ready by the arrival month. A network that carries the demand at a higher cost is over-built and counts as a wrong attempt.
- Q: Is there money? → A: Each demand is funded from its era's budget (Level 1: 20, Level 2: 70, Level 3: 1,600). Funding caps what can be built at once, is refunded by Retry or Start over, and never decides correctness; the answer must always be affordable. This conflicts with the StarterKit non-goal "No resource economy" and is recorded in constitution 2.0.0 for the user to confirm.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Make and understand a decision (Priority: P1)

A learner reads a briefing, inspects a demand on a map of real terrain, chooses a technology from the build menu and builds it on the demand's route (or service area), then runs the game clock. Construction takes the technology's build time. When the demand arrives, a network that is the cheapest that works serves it, lights up the link and explains why it is both feasible and cheapest. A network that fails explains which constraint failed (or that it was not ready in time) and lets the learner retry with a refund.

**Why this priority**: This is the whole core mechanic. With only this story, the game already teaches matching a medium to a request.

**Independent Test**: Play Level 1 Round 1 (alert, 25 km, 1-hour deadline, demand arrives in month 12). Build Horse relay, run the clock to the arrival, read the late-delivery explanation, Retry, build Smoke beacon, run the clock and confirm completion.

**Acceptance Scenarios**:

1. **Given** a fresh session, **When** the game starts, **Then** the first briefing is shown before any challenge can be answered.
2. **Given** Level 1 Round 1, **When** the learner builds Smoke beacon and the demand arrives, **Then** the round is marked served, the link lights up, and the explanation states why it is feasible and cheapest (cost 3; the cheaper media fail on reach; Foot courier 4 and Horse relay 8 cost more).
3. **Given** the same round, **When** the learner builds Horse relay and the demand arrives, **Then** feedback names the missed deadline (3 hours versus 1 hour), completion is unchanged, and the learner can retry with the spending refunded.
4. **Given** no technology is chosen, **When** the learner presses Build, **Then** guidance appears and attempts, completion and funding are unchanged; **Given** nothing is built, **When** the demand arrives, **Then** the clock holds with guidance and a rewind, and nothing is counted.
5. **Given** a round is already solved, **When** the learner builds, runs the clock or retries, **Then** nothing changes (no second completion, no extra attempt).
6. **Given** a working network that is not the cheapest (for example T1 in Level 2 Round 1, or the beacon plus an unneeded courier), **When** the demand arrives, **Then** it is reported as over-built, one attempt is counted, the round stays open and the cheaper answer is not named.

---

### User Story 2 - Learn from help and finish the game (Priority: P1)

A stuck learner asks for a hint, then a worked solution, and still reaches the end. They can see completed rounds, attempts and assistance separately, advance through three eras, and restart safely.

**Why this priority**: Hints and honest progress make the game usable by newcomers and are required by the constitution (honest progress, safe retry).

**Independent Test**: Play all six rounds, using a hint in one and a worked solution in another, and confirm the summary reports them separately and Restart behaves as specified.

**Acceptance Scenarios**:

1. **Given** a round in progress, **When** the learner asks for a hint, **Then** it explains the method first (check class, then reach, then delivery time, then capacity, then build time and cost) without revealing the answer.
2. **Given** the method hint was shown, **When** the learner asks for more help, **Then** a second hint shows a worked step and the worked solution becomes available; each is recorded as assistance without completing the round.
3. **Given** both rounds of a level are solved, **When** the learner presses Next, **Then** an era-advance screen announces the newly unlocked media, followed by the next level's briefing.
4. **Given** the final round is solved, **When** the learner presses Next, **Then** a civilization summary shows completed rounds, attempts and assistance used separately.
5. **Given** a session in progress, **When** Restart is chosen and confirmed, **Then** the session clears and the first briefing returns; **When** Cancel is chosen, **Then** the session is preserved.

---

### User Story 3 - Play with accessible controls (Priority: P1)

A keyboard-only or reduced-motion learner can inspect the demand, choose a technology, build it, run the clock, get help and advance without a mouse, on a laptop or narrow window.

**Why this priority**: Access is part of the core game per the constitution, not a later polish pass.

**Independent Test**: Complete the Level 1 flow using only the keyboard with the reduced-motion setting on, in a narrow window.

**Acceptance Scenarios**:

1. **Given** any screen, **When** the learner tabs through it, **Then** every core control has a visible focus indicator and an accessible name, in an understandable order.
2. **Given** an arrival result, **When** it appears, **Then** it is stated in text (not color alone), stays on screen until dismissed or the learner moves on, and is announced to assistive technology.
3. **Given** the map, **When** a screen reader or text view is used, **Then** a text equivalent lists each settlement's name and size tier, the distance between them, the request and the player's builds.
4. **Given** reduced motion is requested, **When** a round plays, **Then** growth and message-travel animation are reduced or removed without losing any information or delaying feedback and controls.
5. **Given** a round was just solved, **When** the learner presses Next, **Then** a "years pass" transition names the new year and each settlement whose tier changed (for example, "Year 1790: the village is now a market town") before the next round, level or era screen.
6. **Given** the years-pass transition is playing, **When** the learner presses the skip control or its key, **Then** it ends immediately; **When** reduced motion is requested, **Then** the same caption appears instantly as text, and the transition never delays feedback or controls.
7. **Given** a message is travelling along the link after the demand arrives, **When** the learner presses the skip control or its key, **Then** the animation ends immediately; feedback and controls were available throughout, and under reduced motion the animation does not play.

---

### User Story 4 - Compare media with visible scores and costs (Priority: P2)

Every round shows all media unlocked so far, including earlier eras, with class, reach, speed, build time, cost split into physical plant and technology, plus latency and capacity each with a 0–10 score, so the learner can watch the whole ladder improve and reason about the answer.

**Why this priority**: It supplies the evidence needed to reason about the answer and teaches plant versus technology, but the core decision loop works without the scores.

**Independent Test**: Open any Level 2 round and check each medium's displayed values against the documented formulas, including the courier latency and telephone capacity examples.

**Acceptance Scenarios**:

1. **Given** a foot courier and a 1,000 km request, **When** the media table is shown, **Then** latency reads about 3.6 weeks (about 25 days) with a latency score of about 0.7.
2. **Given** the telephone line, **When** the media table is shown, **Then** capacity reads 64 kbps with a capacity score of about 5.8.
3. **Given** a request with copper plant already installed, **When** costs are shown, **Then** plant already built is displayed as zero for that medium and its technology cost remains.
4. **Given** SONET OC-3, OC-12 and OC-48 on the same existing plant, **When** their build times are compared, **Then** a higher rate costs more but takes the same time.
5. **Given** any scores shown, **When** the answer is evaluated, **Then** scores never influence which medium is correct.

---

### User Story 5 - See cities grow and demand rise (Priority: P3)

Settlements grow on an authored historical script (hamlet, village, town, city, metropolis). Each round's snapshot shows the sizes and why demand has risen, and the request follows from it. The player never builds or places cities.

**Why this priority**: It gives the game its identity and motivation, but the rule engine and requests work from authored data without any visual growth.

**Independent Test**: Play the same level twice and confirm identical settlement tiers and requests both times regardless of choices made.

**Acceptance Scenarios**:

1. **Given** any round, **When** the growth snapshot is shown, **Then** each settlement's name and size tier appear with a sentence explaining why demand rose.
2. **Given** the same level played twice with different choices, **When** each round loads, **Then** settlement tiers and requests are identical.
3. **Given** settlement tiers across the timeline, **When** a later round loads, **Then** no settlement has a lower tier than in an earlier round.
4. **Given** the player never builds, places or manages settlements, **When** any round is played, **Then** no control exists to add, move or upgrade a settlement; growth appears only through the authored timeline and the years-pass transition.

---

### Edge Cases

- **Distance equals reach** (30 km alert on a 30 km Smoke beacon): feasible. 31 km: not feasible (out of reach; relays are not modeled).
- **Delivery time equals deadline** (200 km text, 24-hour deadline, Horse relay): counts as on time.
- **Build time equals lead time** (6 months, Horse relay): counts as ready.
- **Feasible except for build time** (Electric telegraph with 36 months against a 3-month lead): rejected as not ready; the cheaper feasible Foot courier is correct.
- **Capacity too low** (40 circuits needed, T1 carries 24): rejected; T3 is correct.
- **Satellite latency floor** (15,000 km, 100 ms deadline): geostationary (about 239 ms path) is late; fiber (about 75 ms) is feasible. In Level 3 this applies only to a round whose request authors a deadline. Satellite time is the up-and-down path only, so geostationary misses any deadline under about 239 ms wherever the endpoints are.
- **Feasible but costlier** (OC-12 when OC-3 is feasible and cheaper): reported as over-built, counted as a wrong attempt, without naming the cheaper answer.
- **Several builds for one demand**: the cheapest working build carries it; the round completes only if nothing else was built (any extra build is over-building).
- **Started too late**: a build started in month s is ready in month s plus its build time; ready exactly in the arrival month counts, one month later does not.
- **Nothing built when the demand arrives**: the clock holds at the arrival with guidance and a "Rewind to month 0" control; nothing is counted.
- **Not enough funding left**: the build is refused with the cost and the remaining funding; nothing is counted or spent.
- **Density equals the satellite cap** (exactly 50 people/km²): feasible; correct only if cheapest.
- **Mobile users required**: fixed-only wireless and fiber are excluded.
- **Earlier-era media in Level 3** (for example T3 or a horse relay): listed in the media table for comparison only and cannot be chosen or built; an attempt to build one is refused as invalid input and never counts as an attempt.
- **Cost tie between the two cheapest feasible media, or a medium with a missing field**: treated as an authoring error. The round shows a visible "challenge unavailable" explanation and cannot be graded or advance progress; it is never presented as a learner failure.
- **Build with no technology chosen, or the same technology twice**: guidance only, not counted as a wrong attempt.
- **Existing infrastructure** (copper, ducts, dark fiber, lit SONET, tower sites) comes only from the authored script, never from the learner's earlier choices.
- **Page reload**: starts a fresh session; nothing is saved.
- **Skipped or reduced-motion transition**: the years-pass caption is still shown as text, so no growth information is lost.

## Requirements *(mandatory)*

### Functional Requirements

**Rule engine and grading**

- **FR-001**: The system MUST grade each round with one documented rule: a medium is feasible only if its message class is at least what the request needs (alert < text < live voice < data), the distance is within the medium's single-link reach, delivery time (distance ÷ effective speed + fixed latency) is at most the deadline, effective build time is at most the request's lead time, and capacity meets demand (circuits for every Level 1 and 2 request of any message class, with alert and text requests needing 1 circuit and single-channel media carrying 1; per-user speed and tower or density rules in Level 3).
- **FR-002**: The correct answer MUST be the feasible medium with the lowest total cost. Equality on any boundary (reach, deadline, lead time, density cap) MUST count as satisfying the constraint.
- **FR-003**: The system MUST display every medium unlocked so far. Level 1 and 2 rounds MUST offer every medium unlocked so far; Level 3 rounds MUST offer only Level 3 media. Media from eras not yet unlocked MUST NOT be shown or offered.
- **FR-004**: The system MUST separate each medium's cost and build time into physical plant and technology, treat plant listed as existing in the request as built (zero cost, zero time), and apply the documented halving of technology cost on lit SONET fiber.
- **FR-005**: The system MUST compute Level 3 costs from the documented service-area formulas (population, area, route distance, per-user speed, mobility, flat terrain, existing tower sites), including tower counts from coverage and peak demand (population × per-user Mbps × 10%).
- **FR-006**: The system MUST compute costs in whole numbers (cost in ten-thousandths of a cost unit, so per-person rates such as 0.005 and their halves are exact) so ties and equalities are exact.
- **FR-007**: The system MUST validate all content before presenting a round; a cost tie among the cheapest feasible media, or a medium with a missing field, MUST produce a visible "challenge unavailable" explanation and block grading and progress.
- **FR-008**: Feedback MUST be generated from the evaluator's own reasoning; a hand-authored answer key MUST NOT override the rule engine.
- **FR-029**: Level 1 and 2 requests MUST use the fixed single-link costs and reach; Level 3 requests MUST use the service-area model, where coverage formulas replace the single-link reach rule.
- **FR-030**: Level 3 rounds MUST show every earlier medium in the media table with its latency, capacity and scores, as comparison rows only. Earlier media MUST NOT be offered as answers or graded in Level 3, and the table MUST mark them "comparison only".
- **FR-033**: Satellite delivery time MUST be the up-and-down path at the speed of light only (geostationary 2 × 35,786 km, about 239 ms; LEO about 1,100 km, about 4 ms). The ground distance between the endpoints MUST NOT be added; the result is a physical floor.
- **FR-031**: A Level 3 request MAY include a delivery deadline. When present it MUST be graded by the same rule as FR-001 (delivery time at most the deadline, equality counts as on time), and the request card MUST show it; when absent, no delivery-time constraint applies and the card MUST say so. Ground media MUST use the request's route distance for delivery time; satellites MUST use the path-only floor in FR-033.

**Game loop and progress**

- **FR-009**: Each round MUST follow brief → inspect → choose → explain → retry or advance → reflect, introducing a concept before testing it, with a worked example different from the challenge. A level summary (reflect) MUST show completed rounds, valid attempts and assistance used, and announce the era advance.
- **FR-010**: Each round MUST show the growth snapshot, the request card (from, to, distance, message class, deadline, lead time, circuits needed, existing infrastructure), and the media panel with every decision-relevant value visible without hover.
- **FR-011**: The demand's arrival with at least one build MUST be the submission, reached only by the player running the clock (play, fast forward or skip to arrival). A network that fails, or carries the demand but is over-built, MUST keep the round playable; the cheapest working network MUST complete it exactly once and enable Next.
- **FR-012**: A wrong (or over-built) network MUST explain which constraint failed and give a useful next step; a served network MUST explain why it is feasible and cheapest. A per-medium table (the ledger) MUST show which constraint each rejected medium fails, computed delivery times and the cost comparison.
- **FR-013**: The game MUST contain three levels (Voices and Couriers, Wires, Networks) of two rounds each, played in order, with a level completing when both rounds are solved and an era-advance screen unlocking the next level's media.
- **FR-014**: The system MUST offer staged help: a hint that explains the method first, then a worked step, and, once the method hint has been seen, a worked solution built from the evaluator's reasoning; viewing any of them MUST be recorded as assistance and never as independent mastery (constitution C2).
- **FR-015**: The system MUST display completed rounds, valid attempts and assistance used as separate counts, with no points, lives, timers, leaderboards or streaks.
- **FR-016**: Restart MUST ask for confirmation, clear the session and return to the first briefing on confirm, and preserve the session on cancel. Reload MUST start a fresh session.
- **FR-027**: After a correct round, Next MUST show a skippable "years pass" transition that names the new year and each settlement whose tier changed, before the next round, level or era screen. With reduced motion it MUST appear instantly as text. It MUST NOT delay feedback or controls and MUST NOT alter any request or grading result.
- **FR-028**: The player MUST NOT be able to build, place or manage settlements; growth is only the authored script. (The player builds communications infrastructure only; see FR-034.)

**Communications builder (redesign 2026-11-17)**

- **FR-034**: Each round MUST show its demand on a map of real terrain: the route between two settlements, or a service area, with the demand's key values in a badge. The player MUST be able to choose an offered technology in a build menu, see a preview with its facts for this demand (no verdict), and build it on the route or area by a button or by clicking the map.
- **FR-035**: Each round MUST have a game clock in months from 0 to the request's lead time (the arrival). The clock MUST move only when the player runs it (play, fast forward, skip to arrival) and MUST pause on its own at the arrival. A build started in month s MUST be ready in month s plus its build time and shown as under construction until then.
- **FR-036**: When the demand arrives, the system MUST decide the outcome with the evaluator's rule for each build (every functional check, plus readiness by the arrival month) and report it as served (the cheapest feasible network, alone), over-built (it works but is not the cheapest network) or not served. Served MUST explain why the network is feasible and cheapest; the other outcomes MUST name what failed and a next step without naming the answer.
- **FR-037**: Each demand MUST be funded from its era's budget (data). A build costing more than the remaining funding MUST be refused with guidance; Retry (after an arrival) and Start over (before it) MUST refund the round's spending without counting an attempt. Content whose cheapest feasible medium costs more than the funding MUST be an authoring error.
- **FR-038**: The map MUST draw each built technology in its own style (beacon fires, footpaths, semaphore towers, telegraph poles, glowing copper and fiber, wireless masts, satellites), with construction progress, and keep the player's earlier networks visible on later maps. Settlement art MUST come from pre-rendered images; nothing on the map may change an outcome (FR-018).
- **FR-039**: Under reduced motion, construction, message travel and growth MUST show their final state at once; the clock's own month steps are discrete and MUST NOT animate.

**Scores and display**

- **FR-017**: Every round MUST show for every unlocked medium a latency (in a readable unit, including days, weeks and months for couriers) and a capacity (scaled bps unit), each with a 0–10 score derived deterministically from the same values the evaluator uses (latency score = clamp(7 − log₁₀(seconds), 0, 10), 10 for near-instant; capacity score = clamp(log₁₀(bps) + 1, 0, 10)). Courier capacity MUST be payload ÷ transit time for the request. Each score MUST be shown beside a band label that is the readable unit its value is displayed in (for example "hours" or "kbps"), so the unit boundaries are the band boundaries. Scores and band labels MUST NOT affect grading.
- **FR-018**: Map and animation MUST illustrate results only; the lit link, message travel and late-arrival marker MUST NOT change any outcome or delay feedback.
- **FR-019**: Briefings MUST state that figures are simplified model values, and each shipped factual claim MUST carry a source link and section or a "game model value" label. The physical limits, the standard rates (64 kbps, T1, T3, OC-3/12/48) and the historical anchors listed in `StarterKit/SPEC.md` MUST cite a source before release; every other value, including the Level 3 economics, MAY ship labeled "game model value".
- **FR-032**: The message-travel animation MUST be skippable by a control and a key, MUST end at once under reduced motion, and MUST NOT delay feedback or controls (constitution C4).

**Content and data**

- **FR-020**: Settlement growth, requests, existing infrastructure, the media table, hints, sources and difficulty MUST live in editable data separate from rule logic and progress tracking. Settlement growth MUST follow an authored script, be identical on every play, and never depend on the learner's choices.
- **FR-021**: Adding a request that uses the existing mechanic, or a medium to the table, MUST need only a data change and its checks, with no new scoring path or screen implementation.
- **FR-022**: Media MUST be named by what they are and what they support, never by company or product.

**Accessibility and delivery**

- **FR-023**: All core actions (inspect, choose, build, run the clock, start over, retry, hint, next, restart, ledger) MUST be reachable by keyboard with visible focus and accessible names; feedback MUST use text as well as color and be announced to assistive technology.
- **FR-024**: The map and every essential diagram MUST have a text equivalent listing settlement names, size tiers, distances, the request and the player's builds. It MUST say that map positions are approximate and that the demand card's distance is the one graded.
- **FR-025**: The game MUST honor reduced-motion preferences and remain usable on a typical laptop and a narrow browser window; the media table MAY scroll within its own labeled container without hiding action buttons.
- **FR-026**: The game MUST run from static files in a clean browser session with no account, backend, live device connection, runtime model or API key.

### Key Entities

- **Settlement**: A named place with an authored size tier (hamlet, village, town, city, metropolis) per timeline point; tiers only rise.
- **Request**: The demand a round presents: from, to, distance, message class, deadline, lead time, circuits needed (every Level 1 and 2 request), service-area fields for Level 3 (population, area, route distance, per-user speed, mobile, flat, and an optional deadline), and existing infrastructure.
- **Medium**: A communication technology with era, message class, reach, effective speed, fixed latency, capacity, plant and technology build time and cost, and display scores.
- **Plant**: Physical infrastructure (copper, ducts and rights-of-way, fiber cable, tower sites, semaphore towers) with its own cost and build time, reusable when already installed.
- **Existing Infrastructure**: The authored list of plant already built for a request.
- **Round / Level / Era**: Six rounds in three levels, one era per level; completing a level advances the era and unlocks media.
- **Session Progress**: Completed rounds, valid attempts and assistance used, held for the page session only.
- **Hint / Worked Solution**: Staged help (method hint, then worked step; a worked solution built from the evaluator's reasoning) whose use is recorded as assistance.
- **Growth Transition**: The skippable years-pass step between rounds: the new year plus a caption of each settlement tier change.
- **Source Reference**: A title, link, section and the claim it supports, or a "game model value" label.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time learner can finish all six rounds and reach the summary in 5–10 minutes with unlimited thinking time and no prior knowledge.
- **SC-002**: Every authored case in `StarterKit/SPEC.md` ("Cases the implementation must satisfy") plus at least one case per shipped round produces its recorded expected result, with expected results derived by hand independently of the implementation.
- **SC-003**: A reviewer can complete the core flow (inspect, choose, build, run the clock, hint, next including the years-pass transition and its skip, the message-travel skip, restart) using only the keyboard, with reduced motion on, and in a narrow window, and the checks actually performed are recorded. Accessibility certification is not claimed.
- **SC-004**: After a deliberately wrong choice, a reviewer can state which constraint failed and what they would pick next for each of Level 1, 2 and 3 learning outcomes (LO1–LO3).
- **SC-005**: A trial request using the existing mechanic can be added through data alone and be graded correctly with no rule-engine change.
- **SC-006**: Starting from a clean browser session with only the project's static files, all six rounds play with no external content service.
- **SC-007**: Replaying any level with different choices shows identical settlement growth and requests every time.
- **SC-008**: Every shipped briefing, explanation and factual claim has been reviewed and carries a source or a "game model value" label, and README, spec, plan and tasks describe the same game.
- **SC-009**: Every acceptance criterion AC1–AC13 in the traceability table has a recorded pass, fail or untested result; untested and failed results stay visible.
- **SC-010**: Every physical limit, standard rate and listed historical anchor links to a source and section before release; every other shipped value has a source or a "game model value" label.

## Assumptions

- Target learners are network engineers, students and curious newcomers with no assumed knowledge; the first briefing teaches range, latency and capacity.
- Version one is single-hop, point-to-point only: no relays or chains, congestion, error rates, weather, operating cost, security, SONET ring protection grading, or political and economic history.
- Cost is a single total-build-cost number with ties as authoring errors; message class is a strict ordering (alert < text < live voice < data); T1 and above carry class data.
- The wireless ladder lives inside Level 3 for v1; speech and writing appear only in the Level 1 briefing, not as a Level 0.
- Demand growth is shown as a changed snapshot at the start of each round, reached through the short, skippable "years pass" transition (resolved in `StarterKit/SPEC.md`).
- Medium values (reach, speed, build time, cost, capacities, tier coverage) are game-model values labeled as such unless sourced; real values are used for physical limits (speed in fiber about 200,000 km/s, geostationary altitude 35,786 km) and standard rates (64 kbps channel, T1 1.544 Mbps, T3 44.736 Mbps, OC-3/12/48).
- Progress is held in memory for the page session; saving across reloads is out of scope.
- Out of scope: accounts, multiplayer, backend, live infrastructure access, runtime AI, leaderboards, level editor, building or placing settlements, combat, fog of war. (Placing communications infrastructure and per-demand funding are in scope since the redesign; see Non-Goals.)
- This feature is governed by `.specify/memory/constitution.md` (v2.0.0, amended for the redesign). It no longer matches `StarterKit/CONSTITUTION.md`, which still describes choose-and-submit; the difference is recorded in the constitution's conflict register.
- The map is real terrain (southern Spain); settlement positions are approximate (within about 12% of the authored request distances), and grading uses only the request's authored distance. Funding values (20, 70, 1,600 per demand) are game-model values.
- Resolved in `StarterKit/SPEC.md`: the player does not build cities; years-pass is a skippable transition; the wireless ladder stays in Level 3 with no Level 4; the plant-versus-technology model is accepted; OC-12 and the analog carrier trunk are kept.
- Still open (not blockers for this spec): locating sources for the physical limits, standard rates and historical anchors (a release requirement under FR-019); confirming the 5–10 minute session target with a timed playthrough. A Level 0 for speech and writing is not planned (see above); adding one would be a scope change.
- Session target: 5–10 minutes for a first playthrough of six rounds.
- **Interim demo rule:** a build with only Levels 1–2 is an interim demo, not the first playable release. The three-level, six-round scope is unchanged; the README must mark Level 3, LO3 and the final AC7 criterion "not run" until Level 3 ships. In the interim demo, finishing Level 2 opens the civilization summary marked "Level 3 not yet built".
- **Source conflicts resolved 2026-11-17:** `StarterKit/SPEC.md` now records the circuit rule for every request, the band-label rule, that Level 3 offers only Level 3 media, the optional Level 3 deadline using route distance, the path-only satellite floor (replacing its contradictory table wording), labels for the Level 3 economics, costs in ten-thousandths, and LEO as a v1 medium (removed from its stretch list).

## Progress Rules *(exact state transitions, per constitution C3)*

| Event | Exactly what happens |
| --- | --- |
| Choose a technology in the build menu | Shows its preview; nothing is built, spent or counted |
| Build | Pays the cost from the demand's funding and starts construction in the current month; no attempt counted |
| Build with no technology chosen, the same technology twice, or more than the remaining funding | Guidance only; nothing built, spent or counted |
| Run the clock (play, fast forward, skip to arrival) | Months advance to the arrival at most; nothing is counted before the arrival |
| Demand arrives with nothing built | The clock holds at the arrival with guidance and "Rewind to month 0"; nothing counted |
| Demand arrives, network fails (a check, or not ready in time) | One attempt is counted; the round stays open; Retry refunds and rewinds |
| Demand arrives, network works but is not the cheapest network (over-built) | One attempt is counted; the round stays open; the cheaper answer is not named; Retry refunds and rewinds |
| Demand arrives, network is the cheapest feasible medium alone, ready in time | One attempt is counted; the round completes once; Next is enabled |
| Start over (before the arrival) | Builds removed, spending refunded, clock to month 0; nothing counted |
| Build, clock or Retry after the round is solved | No effect: no extra attempt, no second completion |
| Hint, worked step or worked solution viewed | Assistance count rises; the round is not completed and no attempt is counted |
| Both rounds of a level solved | The level completes; Next leads to the years-pass transition, then the era-advance screen (Levels 1 and 2) or the civilization summary (Level 3; in the interim demo, after Level 2, marked "Level 3 not yet built") |
| Era advance | Occurs only when a level completes; it unlocks that era's media and is a reward, not a currency |
| Restart confirmed, or page reload | The whole session clears and the first briefing returns |
| Restart cancelled | Session unchanged |
| Challenge flagged as an authoring error | The "challenge unavailable" explanation shows; nothing is graded, counted or advanced |

## Content Classification *(per the spec template's evidence requirements)*

- **Sourced facts (need a link and section):** signal speed in fiber (about two-thirds of c, about 200,000 km/s); geostationary altitude (35,786 km) and the resulting minimum round trip; the 64 kbps voice channel; T1 1.544 Mbps, T3 44.736 Mbps, and OC-3/12/48 rates; historical anchors for the optical and electric telegraph, the telephone and relay courier speeds.
- **Game-model values (labeled as such unless a source is found):** every reach, effective speed, build time, cost, courier payload, signal-style capacity, wireless tier coverage, capacity, per-user speed and tower cost, the 10% simultaneous-user assumption, and the 50 people/km² satellite density cap.
- **Interface choices (display only, never graded):** the 0–10 latency and capacity score formulas, the years-pass transition, the map and message-travel animation.

## Clarification Record

- **Resolved (from `StarterKit/SPEC.md`):** the player never builds cities; growth is scripted; years-pass is a short skippable transition; the wireless ladder lives inside Level 3; the plant-versus-technology model is accepted; OC-12 and the analog carrier trunk stay; the correct answer is the cheapest feasible medium and cost is one total number.
- **Provisionally resolved:** SONET ring protection appears in briefings only and is not graded; T1 and above carry class data.
- **Clarified 2026-11-17:** Level 3 offers only Level 3 media, with earlier media as comparison rows (FR-003, FR-030); Level 3 deadlines are optional and use route distance, with a path-only satellite floor (FR-031, FR-033); capacity is checked for every request class, alert and text needing 1 circuit, and the strict class order is final; scores show their unit as the band label; money is stored in integer ten-thousandths (FR-006); physical limits, standard rates and historical anchors need sources and other values may be labeled (FR-019); a Levels 1–2 build is an interim demo, not the first playable release.
- **Open:** see Assumptions.

## Learning Outcomes *(preserved from StarterKit/SPEC.md)*

| ID | After playing, the learner can… | Evidence of success |
| --- | --- | --- |
| LO1 | Name what each early technology can and cannot carry (alert vs. text) and its reach, by picking a Level 1 medium that fits a request | Selects the feasible option in both Level 1 rounds and can say which constraint rules out each other option |
| LO2 | Compute delivery time (distance ÷ speed) and compare it with a deadline, choosing among mid-era options where class or time differs | Selects the correct option in both Level 2 rounds; feedback shows the arithmetic |
| LO3 | Compare deployment cost against population, topology and capacity, and place each wireless generation on the coverage-versus-capacity ladder | Selects the correct option in both Level 3 rounds and can say why fiber wins in dense areas while wireless or LEO wins in sparse, flat ones |

| Level | Concept | Misconception exposed |
| --- | --- | --- |
| 1 · Voices and Couriers | Message class and reach (LO1) | "The fastest-sounding option is always best" |
| 2 · Wires | Delivery time, class, circuits, plant versus technology (LO2) | "Voice is better than text"; treating "instant" and "fast" as the same |
| 3 · Networks | Population, topology, capacity, deployment cost (LO3) | "The newest technology is always best" |

## Non-Goals *(preserved from StarterKit/SPEC.md)*

No user accounts, multiplayer, backend, live infrastructure access, runtime AI, leaderboard or level editor. No city building, placement or management. No resource economy, combat or fog of war in v1. No simulation of multi-hop routing, relay stations, congestion or real network protocols. No points, lives, timers or streaks. No saving across reloads. Visual polish must fit the existing mechanic. Stretch ideas (extra eras, multi-hop chains, persistent civilization map) are not v1.

**Amended 2026-11-17 by user direction (constitution 2.0.0, conflict register items 2–4):** the player now places communications infrastructure on each demand's route or area (settlements are still never built, placed or managed); each demand has funding from its era (a spending cap that never decides correctness; **user confirmation requested**); the in-game calendar counts months only while the player runs it, so there is still no real-time timer, and there are no points, lives or streaks. The mechanic itself changed on the user's direction, so "visual polish must fit the existing mechanic" now refers to the builder. The player's earlier networks stay visible on later maps as decoration only; a persistent civilization map that affects play remains a stretch idea.

## Acceptance Criteria Traceability *(StarterKit AC1–AC13)*

The criteria are unchanged. Since the redesign, "submit" in a criterion means the demand arriving with at least one build (FR-011): AC2 and AC3 build the named medium and run the clock to the arrival; AC4 covers Build with nothing chosen and an arrival with nothing built; AC6 covers building, the clock and Retry after a solved round.

| AC | Meaning | Covered by |
| --- | --- | --- |
| AC1 | First briefing before answering | US1 scenario 1 |
| AC2 | Smoke beacon correct, link lights, explanation | US1 scenario 2 |
| AC3 | Horse relay late, retry allowed | US1 scenario 3 |
| AC4 | No selection gives guidance only | US1 scenario 4; FR-011 |
| AC5 | Hint then worked solution, recorded as assistance | US2 scenarios 1–2; FR-014 |
| AC6 | One attempt per valid submission; correct completes once | US1 scenarios 5–6; FR-011, FR-015, FR-036 |
| AC7 | Level completes at two solved rounds; era screen; summary | US2 scenarios 3–4; FR-013 |
| AC8 | Restart confirms; cancel preserves | US2 scenario 5; FR-016 |
| AC9 | Visible focus, accessible names, full keyboard reach | US3 scenario 1; FR-023 |
| AC10 | Text feedback, announced, map text equivalent, reduced motion, skippable message travel | US3 scenarios 2–4 and 7; FR-023–FR-025, FR-032 |
| AC11 | Latency and capacity with scores for every unlocked medium | US4 scenarios 1–2, 5; FR-017 |
| AC12 | Existing infrastructure; plant versus technology split; same plant, same time | US4 scenarios 3–4; FR-004 |
| AC13 | Years-pass transition, skippable, text under reduced motion | US3 scenarios 5–6; FR-027 |
