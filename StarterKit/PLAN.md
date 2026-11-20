# Signal Age · Implementation plan

## Build target

Implement the clarified specification for Signal Age within the workshop build block. First deliver one complete round (Level 1, Round 1) with correct grading, explanatory feedback, retry, and advance. Then add the remaining five rounds, the era-advance screens, and polish through the same implementation.

**Hardest behavior to get right:** the feasibility and cost evaluator: four constraints (class, reach, delivery time, build time) for Levels 1–2, the area-based cost model with its density cap for Level 3, boundary equality (equal counts as allowed), and the rule that cost ties are authoring errors.

**First evidence we'll check:** the spec's first case. Alert, 25 km, deadline 1 hour, lead time 12 months, Level 1 media: **smoke beacon is correct** (cost 3), and **horse relay is incorrect: late** (25 ÷ 200 km/day = 3 h > 1 h).

## Stack and serving

- Semantic HTML, CSS, and native JavaScript modules. No framework, bundler, backend, or runtime model.
- DOM controls plus **inline SVG** for the settlement map, link lines, and the growth tiers (hamlet → metropolis icons). No rendering dependency by default. The SVG has a text equivalent (settlement list with tier, distance, and request) alongside it.
- `data/levels.json` for authored content (settlements, growth tiers, requests, media table, hints, sources); load it over HTTP using a relative URL.
- In-memory session state. Reload starts a fresh session, as specified. No persistence in v1.
- Static hosting, including a repository subpath such as GitHub Pages. Use relative asset paths and case-correct filenames.

Preview from the repository root after implementation creates `index.html`:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open **http://127.0.0.1:8000**. On Windows use `py` in place of `python3`. Native modules and JSON fetching need a web server; opening the HTML with `file://` is not the supported run path. [MDN reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules).

## Proposed files and responsibilities

```text
index.html                   Semantic page shell and module entry point
style.css                    Layout, focus, feedback states, reduced motion
main.js                      Load → validate → start; render loading/errors
engine/
  rules.js                   Pure evaluation: feasibility, cost, best medium; no DOM or progress
  content.js                 Validate authored data: media table, requests, growth tiers, sources
  state.js                   Session transitions, attempts, completion, era advance, restart
  feedback.js                Explain structured evaluation results per rejected medium
  scores.js                  Pure display scores: latency/capacity values, units, 0–10 scores
ui/
  render.js                  Briefing, growth snapshot, request card, media table, feedback, summary
  map.js                     SVG map: settlements by tier, link animation, text equivalent
  controls.js                Input events and keyboard/focus behavior
data/
  levels.json                Briefings, growth snapshots, requests, media, hints, source records
tests/
  index.html                 Browser test runner with visible pass/fail summary
  rules.test.js              Independent expected results from the specification's cases
  state.test.js              Attempts, assistance, duplicate submit, era advance, restart
  content.test.js            Invalid/missing/ambiguous authored data, cost ties
README.md                    Actual run instructions, behavior, and evidence
```

Use `data/` and `tests/` at the root alongside `engine/` and `ui/`. Keep modules small enough to understand; combine view files if separate files add no value.

## Data contract

Define one document containing `schemaVersion`, `sources`, `plants`, `media`, and `levels`. Each level has a unique ID, title, era name, learning outcome, briefing, source IDs, unlocked medium IDs, and ordered rounds. Each round has a unique ID, a **growth snapshot**, a **request**, and ordered hints.

**Domain fields:**

- `media[]`: `id`, `name`, `era` (1–3), `class` (`alert` | `text` | `voice` | `data`), `reach` (`{kind: "km", value}` | `{kind: "unlimited"}` | `{kind: "coverage"}`), `speed` (`{kind: "instant"}` | `{kind: "km_per_unit", value, unit: "hour" | "day"}` | `{kind: "propagation", km_per_s, extra_path_km}`), `plant` (plant ID or null), `technology` (`{months, cost}` or `{months, formula}`; the formula covers Level 3 equipment cost), `densityCap` (people/km², optional), `wireless` (optional: `coverageKm2`, `capacityMbps`, `peakUserMbps`, `mobile`, `towerCost`), `maxUserMbps` (optional, satellites), `capacity` (`{kind: "bps", value}` | `{kind: "payload", bits}` | `{kind: "user_mbps", value}`), `source` (source ID or `"game-model"`).
- `plants[]`: `id` (`copper-plant`, `ducts`, `fiber-cable`, `tower-sites`, `semaphore-towers`), `requires` (plant ID or null; fiber cable requires ducts), `months`, and `cost` (`{kind: "fixed", value}` or `{kind: "per_route_km", value}` or `{kind: "per_tower", value}`). `media[].circuits` for every Level 1 and 2 medium (single-channel media carry 1).
- `existingInfrastructure[]` (per round): `assets` (any of `copper-plant`, `ducts`, `dark-fiber`, `lit-sonet-fiber`, `tower-sites`) and `existingTowerSites` (integer ≥ 0). Dark fiber implies ducts and fiber cable; lit SONET fiber implies dark fiber and halves fiber-technology cost. Authored from the historical script, never from the player's earlier choices.
- `growth.yearLabel` (per round): the authored year or era label used by the years-pass transition and caption.
- `growth` (per round): `settlements[]` with `id`, `name`, `tier` (`hamlet` | `village` | `town` | `city` | `metropolis`), position for the map, and a `reason` string explaining the rise in demand. Tiers never decrease across the timeline.
- `request` (levels 1–2): `from`, `to`, `distanceKm` (> 0), `class`, `deadline` (`{value, unit}` in seconds/hours/days), `leadMonths` (≥ 0), and `circuits` (≥ 1) for every request; alert and text requests need 1.
- `request` (level 3): `population` (> 0 integer), `areaKm2` (> 0), `routeKm` (> 0), `perUserMbps` (> 0), `mobile` (boolean), `flat` (boolean), `class` (data), `deadline`, `leadMonths`. Density is derived, never authored.

**Choice representation:** a single **medium ID** chosen from the level's unlocked media. The answer is exactly one medium; no free text.

**Validation rules:** reject missing or duplicate IDs; unknown medium IDs, classes, or units; non-positive distances, populations, or areas; negative build times or lead times; tiers that decrease over the timeline; rounds with **no feasible medium**; rounds where the **two cheapest feasible media have equal cost**; media with `source` missing and not labeled `"game-model"`; and requests whose class is not carried by any unlocked medium.

The loader must validate the whole content file before starting. Show a useful content error with the level/round ID; do not count it as a learner attempt. Briefings and hints reference source records with a title, URL, section, and supported claim. Fixed wording and per-level content live in data; arithmetic reasoning (delivery time, cost, density) is assembled from evaluator results, not typed into feedback strings.

Do not invent a universal quiz schema that discards the domain's real structure. Adapt the [worked example's plan](https://github.com/automateyournetwork/NAF_AC6/blob/main/WORKSHOP/LAB/Examples/PrefixQuest/PLAN.md) only if it fits your game.

## Domain evaluation contract

```text
evaluate(round, mediumId) → {
  status: "correct" | "incorrect" | "invalid-input" | "content-error",
  expected: mediumId of the cheapest feasible medium, or null,
  reasonCode: "OK" | "CLASS_TOO_WEAK" | "OUT_OF_REACH" | "TOO_SLOW" |
              "NOT_READY" | "OVER_DENSITY_CAP" | "NOT_FLAT" | "USER_SPEED_TOO_LOW" | "NOT_MOBILE" | "CAPACITY_TOO_LOW" | "FEASIBLE_BUT_COSTLIER" |
              "NO_SELECTION" | "NO_FEASIBLE_MEDIUM" | "COST_TIE",
  evidence: { perMedium: [{ id, feasible, failedChecks[], deliveryTime, totalBuildMonths,
              cost, plantCost, technologyCost, plantMonths, technologyMonths, density,
              latencyScore, capacityScore, capacityBps }] }
}
```

- This is a pure function: same inputs, same result; no DOM, timer, network, random choice, or score changes.
- Compute feasibility as: class rank ≥ request class rank, **and** distance ≤ reach (Levels 1–2) or coverage rules and density cap (Level 3), **and** delivery time ≤ deadline, **and** effective build months ≤ lead months, **and** (every Level 1 and 2 request) circuits ≥ requested circuits. Total cost = plant cost + technology cost, and total build months = plant months + technology months, where any plant listed in the round's existing infrastructure (or implied by it) counts as zero. Plant is summed once per medium: a fiber medium needs ducts and then fiber cable; a wireless tier needs new tower sites only beyond the existing count. A higher tier on the same plant has the same plant months, and its technology months are the same constant for its family. Compute in integers (cost in hundredths) so equality and ties are exact. Content validation rejects a round whose cheapest feasible effective cost is tied The expected answer is the feasible medium with the lowest cost: a fixed cost for Levels 1–2, or the formula cost for Level 3 (fiber = 5 × route km + 0.005 × population; wireless tier = 8 × new sites + radio cost × towers, where towers = max(ceil(area ÷ coverage), ceil(population × perUserMbps × 0.1 ÷ capacity)) and new sites = max(0, towers − existing tower sites); LEO = 100 + 0.2 × population; GEO = 150 + 0.5 × population). Wireless tiers are extra-feasibility-checked for peak per-user speed, mobility, and flat terrain; fiber and fixed wireless are excluded for mobile requests. The UI must not choose the correct answer by position, label, or animation destination.
- Delivery time = distance ÷ speed for courier-like media; zero for `instant`; distance ÷ propagation speed plus `extra_path_km` ÷ speed of light for propagation media. Compare in a single unit (seconds). Equality passes.
- **Scores are display-only.** `scores.js` computes latency (from the evaluator's delivery time, shown as ms, s, min, h, days, weeks from 14 days, or months from 60 days) and capacity (authored bps, courier payload ÷ transit time, or peak per-user speed), then latency score = clamp(7 − log₁₀(seconds), 0, 10) with 10 for near-instant, and capacity score = clamp(log₁₀(bps) + 1, 0, 10). They are never inputs to `status` or `expected`.
- Distinguish a learner's incorrect decision (a feasible but costlier medium, or an infeasible one), invalid input (no selection), and broken authored content (no feasible medium, cost tie).
- Selecting a **feasible but costlier** medium is incorrect with `FEASIBLE_BUT_COSTLIER`, and the feedback shows the cost comparison.
- Expected answers in tests come from the spec's hand-checked cases. Don't calculate them by calling the same evaluator being tested.

**Feedback example:** the learner picks **horse relay** for Level 1 Round 1. Result `incorrect`, `reasonCode: TOO_SLOW`, evidence: delivery 3 h vs. deadline 1 h. Explanation: *"Horse relay carries text, reaches 25 km, and is ready in 6 months (you have 12). But at 200 km/day the message needs 3 hours, and you have 1 hour. Try a medium that can carry an alert almost instantly."*

## Session transitions

```text
loading → briefing → awaiting-answer
                     ├─ invalid input → guidance → awaiting-answer
                     ├─ incorrect → feedback → retry same round
                     └─ correct → feedback → Next → years-pass (skippable) → next round / era-advance / briefing / summary
loading/content failure → error screen → retry loading
confirmed Restart → fresh first briefing
```

The state module owns attempts, assistance, completed round IDs, current round, current era, and current view. Selection and hints do not submit an answer. Count valid submissions only while a round is unsolved. Disable Submit after success; guard in state logic as well. Advance only through explicit Next. Finishing the second round of a level opens the **era-advance screen**, which names the newly unlocked media, before the next briefing. Restart requires confirmation; cancellation changes nothing.

## Interaction and visual direction

Translate the **living top-down map of growing settlements** into a compact challenge area: an SVG map with two highlighted settlements, a **growth snapshot** caption ("The village has become a market town"), a **request card**, a **media table** for every medium unlocked so far (class, reach, speed, build time, cost, latency and capacity with 0–10 score bars and the numbers beside them), a selection control, and a persistent explanation area. Use a clear type hierarchy and one consistent visual language across eras: a subtle palette shift per era (earth tones, brass and copper, cool blue) with the same layout.

Motion should reveal a consequence: the chosen medium animates a message along the link, a pulse or runner, at a pace proportional to its delivery time, and a late message visibly crosses the deadline marker. Between rounds a skippable **years-pass** transition sweeps the timeline from this round's year to the next, then swaps settlement icons to their new tiers with a text caption naming each change. It is driven by the authored `growth.yearLabel` values and tier differences, and under `prefers-reduced-motion` it appears instantly as text. It never delays feedback or controls.

Use native controls where possible (a radio group for media), move focus deliberately after screen changes, and announce feedback through a live region. Respect `prefers-reduced-motion`: animations are replaced by an instant result and a text line. Display textual values alongside diagrams. A learner must not need animation, color vision, pointer precision, or hover to reason about the answer.

## Implementation order

| Slice | Deliverable | Evidence before the next slice |
| --- | --- | --- |
| 1 · Prove the rule | Pure evaluator, media table, and the spec's correct/wrong/boundary cases for all three levels | Expected results pass independently of the UI, including the Level 3 topology cases and density boundary |
| 2 · Complete one round | Briefing, growth snapshot, request card, media table, feedback, retry, Next for Level 1 Round 1 | One correct and one wrong path work in the browser |
| 3 · Add the curriculum | All six rounds, validation, hints, era-advance screens, civilization summary | Each shipped round agrees with its reviewed cases; every round has exactly one cheapest feasible medium |
| 4 · Make it usable | SVG map and text equivalent, keyboard/focus, reduced motion, narrow layout, clear error states | Manual checks are recorded |
| 5 · Package the result | README, screenshot if available, optional hosting | Another attendee can run and explain the game |

Generate `tasks.md` from these slices and the actual acceptance criteria. Do not create a large task tree for hypothetical stretch features such as extra eras or multi-hop chains.

## Verification and reporting

Implement a dependency-free browser test runner at `tests/index.html` that imports the pure modules, runs all assertions, and shows totals plus failed case IDs. It must report zero discovered tests as failure. Open **http://127.0.0.1:8000/tests/** after starting the same server.

| Check | What must be established |
| --- | --- |
| Domain cases | Correct, plausible wrong, and boundary outcomes for reach, deadline, lead time, density cap, and latency floor; topology and capacity cases (sparse → LEO, rural flat → fixed wireless, mobile → 4G, dense → fiber, 3G too slow) |
| Plant and capacity | Plant-versus-technology totals, existing plant counting as zero, higher tiers costing more with the same build time, cost ties as content errors, circuits capacity failures, and Ethernet-over-fiber upgrade versus new wireless |
| Scores and units | Latency and capacity formulas, unit and rounding behavior (including days, weeks, months, bps to Gbps), courier capacity falling with distance, and scores never changing grading |
| Input/content failures | Invalid submissions do not consume attempts; rounds with no feasible medium, cost ties, and malformed data cannot be graded |
| State transitions | Retry, hints, duplicate submission, level completion, era advance, final summary, restart/cancel |
| Source review | Each briefing and explanation agrees with the cited technical rule; every unsourced value is labeled "game model" |
| Browser playthrough | Fresh start to summary, keyboard-only core actions, readable feedback |
| Layout/motion | Typical laptop, narrow viewport, reduced motion |
| Hosting, if used | Assets and data load under the published repository path |

For each required acceptance criterion, record **pass / fail / not run**, the date, environment, and evidence in the README or a linked verification note. The test runner checks code behavior; a human still reviews the teaching content and actual interaction.

## Scope controls

No persistence, multiplayer, runtime AI, procedural scenario generator, editor, or audio in v1. No city building: growth is authored data. No multi-hop chains, relays, or additional eras in v1. If time runs short, propose the smallest coherent reduction to the specification, such as one round per level, and update the tasks. Do not hide skipped checks or silently weaken correctness.
