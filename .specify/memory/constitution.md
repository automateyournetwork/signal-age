<!--
Sync Impact Report — 2026-11-17 (amendment 2)
Version: 1.0.1 → 2.0.0 (MAJOR: the main action is redefined from "choose and submit" to "build on a map in
  game time"; C3's progress rules and evidence are reworded for it). Earlier: 1.0.0 → 1.0.1 (PATCH, re-sync).
Reason (user direction, 2026-11-17, quoted): "this doesn't look like age of empires / simcity, this is
  supposed to be a game"; "the format of having a scenario is fine, but I didn't mean for this to be
  mutliple choice questions. I wanted it to be similar to sim city but scoped down to just communications
  services/infrastructure"; "use real topology map data".
Modified principles:
  - First release: one core mechanic is now "build the feasible, cheapest medium for each demand on the map
    before the demand arrives" (same decision, now expressed by building in game time).
  - C1: adds the timing rule (start month + build time must not pass the arrival month; equality counts),
    funding per demand (never decides correctness; the answer must always be affordable), and states that a
    network carrying the demand at a higher cost than the answer is over-built and does not complete it.
    The correct answer is unchanged: the feasible medium with the lowest cost.
  - C2: the main action is choosing and building; the build preview and ledger show every decision value.
  - C3: "submission" is now the demand's arrival with at least one build; guidance cases and retry refunds
    are listed; the game clock never runs on its own and never fails a demand for being slow to act.
  - C4: the map's text equivalent also lists the player's builds.
  - C5: pre-built terrain and sprite images are static assets; the offline tools that make them never run in
    the game.
Unchanged: C6, C7, Governance rules. No principle was removed.
Conflict register (this file versus its source and the StarterKit spec):
  1. OPEN, recorded: StarterKit/CONSTITUTION.md still describes choose-and-submit. It is the
     workshop's input and was not edited; this file governs Signal Age from 2.0.0.
  2. RESOLVED by user direction: StarterKit non-goal "No city building, placement or management". The player
     places communications infrastructure on a demand's route or service area; settlements are still never
     built, placed or managed (spec FR-028 unchanged).
  3. RESOLVED by user direction, CONFIRMATION REQUESTED: non-goal "No resource economy". Each demand has
     funding from its era's budget (a spending cap; Retry and Start over refund it). It never decides
     correctness. It can be removed without touching grading if the user prefers the original non-goal.
  4. RESOLVED by user direction: non-goal "No points, lives, timers or streaks". The in-game calendar counts
     months only while the player runs it; there is no real-time timer, no lives and no points.
Templates: no template change needed (gates still name C1–C7).
Follow-up TODOs: user to confirm item 3; human walkthroughs (C2 evidence) still not run.
-->
# Signal Age Constitution

**Purpose:** help network engineers, students, and curious newcomers practice matching a communication
technology to the demand of a growing civilization, by weighing message class, reach, delivery time,
and build time while building a link or service for each request.

**First release:** one core mechanic (build the feasible, cheapest medium for each demand on a map of real
terrain, before the demand arrives), three short levels (one era each), a browser, and a 60-minute
workshop build. The game is a communications-only builder in the spirit of SimCity: the player builds
infrastructure; settlements grow on their own. Change this budget only by updating the agreed scope.

## Core Principles

### C1 · Technical truth is a release requirement

The game must never reward a technically incorrect answer. Grading must be reproducible from a
documented rule and the challenge inputs. Unsupported or ambiguous content is an authoring error: show
an explanation that the challenge is unavailable and prevent grading it.

Document the model being taught: a simplified game model of communications history in which a medium
is feasible only if its message class is sufficient, the distance is within its single-link reach, its
delivery time meets the deadline, and its build time fits the request's lead time. The correct answer
is the feasible medium with the lowest build cost; cost ties are authoring errors. In the builder, the
game clock counts months from 0 to the request's lead time, when the demand arrives; a build started in
month s is ready in month s plus its build time and serves only if that is not later than the arrival
(equality counts). The demand completes only when the player's network for it is exactly the correct
answer, ready in time; a network that carries the demand at a higher cost is over-built and does not
complete it. Each demand has funding from its era's budget; funding limits what can be built at once,
never decides correctness, and must always cover the correct answer (otherwise an authoring error). In the final era,
requests describe a service area (population, area, density, route distance) and cost is computed from
documented formulas, so sparse flat areas favor wireless or low-orbit satellite and dense areas favor
fiber/cable. Cost and build time separate the physical plant (cable, ducts, fiber, tower sites) from
the technology installed on it. Plant already in the ground counts as built, and a higher-rate
technology on the same plant costs more without taking longer. In the final era an installed SONET
fiber route can be upgraded to Ethernet, paying only for new equipment. Existing plant never depends on
the player's earlier choices. Wireless is modeled as a ladder of generations (digital cellular through
beamformed fixed wireless), each with documented coverage, capacity, per-user speed, and mobility.
Technologies are named by what they are and what they support, never by company or product. Excluded:
multi-hop chains and relay stations (the horse relay and optical telegraph are modeled as single links between two endpoints), congestion, error rates, weather, operating cost, security, and the
political and economic history of each technology.

Simplifications must appear in the briefing and README wherever they affect what the player can
conclude. Medium values (reach, speed, build time, cost) are game-model values and are labeled as such
unless a source supports them. Physical limits, such as signal speed in fiber and geostationary
altitude, use their real values. Each round displays every unlocked medium's latency and capacity, with
a 0–10 logarithmic score for quick comparison. Scores are derived deterministically from documented
values, use readable units (including days, weeks, and months for couriers), and are display-only: they
never decide grading. Fictional worlds, animations, and city growth may illustrate a rule; they must
not change it.

**Evidence:** hand-checked correct, incorrect, and boundary cases (including reach, deadline, and
lead-time boundaries); a source link and section for each factual claim, or a "game model value" label
where none exists; review of all shipped briefings and explanations. Expected results are recorded
independently of the implementation under test.

### C2 · Every round teaches through a decision

The player's main action, choosing a medium and building it on the map for a demand before the demand
arrives, must exercise the target skill. Introduce a concept before testing it, and show the values
needed to reason about the answer: the request's distance, class, deadline, lead time and funding, and
every unlocked medium's class, reach, speed, build time, cost, latency, and capacity. A wrong answer explains which constraint failed and gives the player a
useful next step. A correct answer explains why it is feasible and cheapest.

Use this learning sequence: **message class and reach** (voices and couriers) → **delivery time and
class** (wires) → **reach, mobility, latency floors, and build time under high demand** (networks).
Hints reveal a method first (check class, then reach, then delivery time, then capacity, then build time and cost), then a
worked step. Worked solutions are available when a learner is stuck; viewing one is recorded as
assistance, never as independent mastery.

**Evidence:** a teammate can connect each player action to a learning outcome and describe what they
learned from a deliberately wrong choice.

### C3 · Progress is honest and retry is safe

A round completes only when its demand arrives and the player's network is the correct answer. A
demand arriving with at least one build is the submission and counts one attempt; incorrect or
over-built networks keep the challenge available. Building with no medium chosen, building the same
medium twice, a build the remaining funding cannot cover, and a demand arriving with nothing built give
guidance without counting as a wrong attempt. Once a round is solved, building, the clock and Retry
cannot award progress twice.

No lives, countdown, or speed bonus in this first version. The game clock counts game months only while
the player runs it; it never runs out on its own, and a demand that arrives with nothing built is held
with guidance, not failed. Hints and retries have no penalty, and Retry refunds the round's spending. Show
completed rounds, attempts, and assistance separately; completion is not proof of independent mastery.
The specification must say exactly what advances a round, finishes a level, triggers an era advance,
and resets a session.

**Evidence:** wrong-network, over-built, nothing-built, solved-round, hint, completion, era-advance, and
reset checks match the specification.

### C4 · Access is part of the core game

All core actions must be usable by keyboard with visible focus, readable labels, and an understandable
order. Explain success and failure with text as well as color. Provide a text equivalent for the map
and every essential diagram, including each settlement's name, size tier, the request between them, and
the player's builds.
Respect reduced-motion preferences; animation, including the years-pass growth transition and message
travel (which must be skippable), must never delay the availability of feedback or controls.

Keep the challenge usable on a typical laptop and a narrow browser window. Dense technical data, such
as the medium table, may scroll within its own labeled container, without hiding the action buttons.

**Evidence:** a keyboard-only playthrough, a narrow-window check, and a reduced-motion check. Record
what was actually checked; do not claim full accessibility certification.

### C5 · The first version is deterministic and self-contained

Ship authored content and deterministic domain logic. City growth is an authored historical script,
never random and never influenced by the player's choices; the same level always presents the same
growth. The game requires no account, backend, live device connection, model, or API key. AI may help
write code and assets during development; its output receives the same review as any other
contribution. Terrain maps and settlement sprites are pre-built static images; the offline tools that
make them (elevation download, Blender rendering) never run as part of the game.

Runtime AI tutoring, generated questions, procedural scenarios, and free-text AI grading are stretch
work. Adding them requires an explicit change to the constitution, specification, and verification
approach before implementation.

**Evidence:** a clean browser session can play using only the project's static files; no external
content service decides an answer.

### C6 · Content and logic can be reviewed separately

Store level content, settlement growth tiers, requests, the medium table, hints, sources, and
difficulty in editable data. Keep domain rules separate from rendering and progress tracking. Validate
data before presenting a challenge. Feedback must agree with the evaluator's reasoning; a hand-authored
answer key cannot silently override the rule engine.

Adding another request that uses the existing mechanic, or another medium to the table, should require
a data change and its checks, not a new scoring path or a new screen implementation.

**Evidence:** inspect one level's data, trace one answer through the evaluator, and add a trial request
without modifying the rule engine.

### C7 · Done is demonstrated

Ship only the agreed scope. Requirements, plan, tasks, and README must describe the same game. A
feature is complete when its acceptance criteria pass and its actual status is recorded. A screenshot,
a checked task box, or the agent saying "done" is insufficient by itself.

When time is short, reduce scope explicitly. Fix incorrect teaching and broken core interactions before
adding visual effects such as growing skylines. Keep failed and untested checks visible.

**Evidence:** reproducible run/test commands, recorded verification results, a fresh-start playthrough,
and a README another attendee can follow.

## Governance

For any material change, record the reason, update the affected spec and plan, and rerun analysis. A
conflict with this constitution is resolved openly; the build agent must not weaken a principle merely
to make its implementation pass.

- **Authority:** this file (`.specify/memory/constitution.md`) governs the Signal Age feature. The
  source of the supplied text is `StarterKit/CONSTITUTION.md`; if the two differ, the
  difference is a conflict to be resolved openly, not silently overwritten in either direction. Other
  workshop examples (Per-Hop Works, Backbone, RIBRush) keep their own constitutions.
- **Versioning:** MAJOR for removing or redefining a principle or its evidence rule; MINOR for adding a
  principle or materially expanding one; PATCH for wording clarifications. Every amendment records a
  dated reason and a sync impact report.
- **Compliance review:** every analysis (`/speckit.analyze`) and plan Constitution Check MUST verify C1–C7
  and cite the evidence required by each principle. Failed or untested evidence stays visible (C7).
- **Scope changes:** the first-release budget (one mechanic, three levels, browser, 60-minute workshop
  build) changes only by updating the agreed scope in the spec, plan and tasks together.

**Version**: 2.0.0 | **Ratified**: 2026-11-17 | **Last Amended**: 2026-11-17
