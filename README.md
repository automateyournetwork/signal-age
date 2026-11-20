# Signal Age

**Build the communications of a growing civilization on real terrain, from smoke signals to near-gigabit wireless.**

Signal Age is a browser game for network engineers, students, and curious newcomers. You play the Messenger-General of a growing civilization. Its settlements grow on their own; you build the communications they demand. Each demand arrives after a number of months. You pick a technology from the build menu, build it on the map before the demand arrives, and run the clock. When the demand arrives, the game explains what happened, so you can use what you learned on the next one. It plays like a small SimCity, scoped to communications infrastructure only.

A project from **NAF AC6 — Loop Engineering, Spec-Driven Development & the Future of VibeOps**.

| Project | Details |
| --- | --- |
| Status | Playable as a communications builder: all three levels and six demands are implemented and tested (98 of 99 tests pass). Not release-ready: 11 required source citations are still missing (see Verification) |
| Networking topic | Matching a communication medium to a demand by message class, reach, delivery time, capacity, build time, and cost, across three eras from signals and couriers to telecom (T1, T3, SONET) to Ethernet, wireless, and satellite |
| Typical session | Target 5–10 minutes for the first playthrough (six demands); not yet timed with a real first-time player |
| Live demo | Not published yet |
| Built by | Chad Staggs (add teammates and GitHub handles) |

<!-- Optional: add ![Describe the game screen](docs/gameplay.png) only after committing a real
     screenshot at that path. Replace the demo text above with a working link after deploying. -->

## The challenge

You watch a hill fort **25 km** from your village. Raiders are coming, and the threat arrives in **month 12**. You need an **alert** to arrive within **1 hour**. The build menu offers what your era knows. A horse relay looks fast, but the game shows it needs **3 hours** at 200 km/day. A smoke beacon reaches 30 km, carries an alert, arrives almost at once, takes 1 month to build, and costs less. Build it between the fort and the village, run the clock, and watch the fires light when the demand arrives.

The map is real terrain: elevation and rivers of southern Spain, rendered in Blender, with fictional settlements. Settlements grow on their own along a scripted historical timeline. You never build or place them; you build only the communications their growth demands. Later demands ask how many simultaneous calls two cities need, and what already sits in the ground: copper cable, ducts, dark fiber, lit SONET fiber, or tower sites.

## What you'll learn

| By the end, you can… | You'll practice by… |
| --- | --- |
| Say what early media can carry and how far, and rule out options by message class and reach | Building a Level 1 link (voice, drum, beacon, courier, horse relay) for a demand |
| Compute delivery time, size a link in circuits, tell physical plant from the technology on it, and start a long build in time | Building the telegraph, telephone, analog carrier, T1, T3, or SONET between growing cities |
| Compare deployment cost by population, topology, and capacity, and place each wireless generation on the coverage-versus-capacity ladder | Building Ethernet over fiber, a wireless tier (2G to beamformed fixed wireless) or a satellite for a service area |

**Before playing:** no prior knowledge; the first briefing teaches the basics.

## Play locally

Download this repository or clone it using the URL from GitHub's **Code** button, then open a terminal in the **repository root**: the folder that contains `index.html`, `main.js` and `data/` (this README lives two folders below it, in `StarterKit/`).

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

On Windows with the Python launcher:

```powershell
py -m http.server 8000 --bind 127.0.0.1
```

- Game: open **http://127.0.0.1:8000** in your browser.
- Tests: open **http://127.0.0.1:8000/tests/** with the same server. The page shows PASS or FAIL with totals and the failed case ids; a run with zero tests is a failure.

Keep the terminal running; **Ctrl+C** stops the server. If port 8000 is busy, use 8001 in both the command and the URL. The game loads JavaScript modules, JSON and images over HTTP, so opening `index.html` directly from the file system does not work. [Why modules need serving](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules).

## How to play

1. **Read the era briefing.** It teaches the concept and works one example that is not one of your demands. Press **Begin**.
2. **Read the demand** (right panel): from, to, distance, message class, deadline, circuits (or, in Level 3, the service area), what is already in the ground, the month it arrives and your funding for it. The map shows the route (or area) with a badge.
3. **Choose a technology** in the build menu (left). Its preview shows its numbers for this demand (reach, speed, delivery time, build time, ready month, cost) without telling you whether it will work. The **Ledger** compares every technology your era has unlocked.
4. **Build it**: press **Build**, or click the route on the map. It is paid from the demand's funding and shown under construction until it is ready.
5. **Run the clock**: Play, Fast forward or Skip to arrival. Construction takes its real build time, so a long build must start early enough.
6. **When the demand arrives**, the game reports one of three outcomes:
   - **Served**, if what you built is the cheapest network that carries the demand in time. The link lights, the message travels, and the report explains why it is feasible and cheapest. **Next** shows the years passing and the next demand.
   - **Over-built**, if it carried the demand but a cheaper network would also have worked, or you built more than it needed.
   - **Not served**, if it fails a check or is not ready in time. The report names the failed check and a next step.

   For over-built and not served, **Retry** refunds the spending and rewinds to month 0.
7. **Need help?** **Hint** first explains the method, and a second **Hint** shows a worked step. **Worked solution** becomes available after the first hint. All of these count as help, never as completion.
8. Finishing a level shows its summary and the era advance that unlocks new technology. After the sixth demand you reach the civilization summary.

| Control | Action |
| --- | --- |
| Mouse or touch | Pick a technology in the build menu, press Build (or click the route on the map), then Play or Skip to arrival |
| Keyboard | The build menu is one Tab stop: arrow keys move between technologies and Enter chooses one. Tab then reaches **Build**, then **Run the clock**. When the demand arrives, focus moves to the report; Tab reaches Next or Retry |
| Escape | Skips the message animation, or the years-pass transition |
| Start over | Before the demand arrives: removes your builds, refunds them and rewinds to month 0, counting nothing |
| Ledger | Opens the technology table for this demand (and pauses the clock) |
| Restart | In the header. Asks for confirmation (focus starts on Cancel); Confirm clears the session and returns to the first briefing, Cancel or Escape keeps it |

**Progress:** completed demands, attempts and help are counted separately. An attempt is counted only when a demand arrives with something built. A demand completes only when your network is the cheapest one that carries it.

These count nothing and only give guidance:
- choosing a technology
- building with nothing chosen, or building the same technology twice
- a build the remaining funding cannot cover
- a demand arriving with nothing built (the clock waits for you, with **Rewind to month 0**)

Once a demand is served, nothing you do can count it twice. There are no points, lives or streaks. The calendar counts months only while you run it, so there is no real-time timer. Reload starts a fresh session; nothing is saved. Animations are decoration only and respect your system's reduced-motion setting.

### What each action teaches

| Player action | Learning outcome |
| --- | --- |
| Building a Level 1 link for an alert or a written order and reading why it failed, or why it is the cheapest that works | LO1: what early media can carry (alert vs. text) and how far one link reaches |
| Building the optical or electric telegraph or the telephone against a deadline and an arrival month; sizing a call link in circuits with copper already in the ground | LO2: delivery time = distance ÷ speed, against the deadline; circuits; plant versus technology; starting a long build in time |
| Building fiber, a wireless generation or a satellite for a sparse steppe and a dense city | LO3: cost from population, topology and capacity; the coverage-versus-capacity ladder; satellite latency floors; reusing lit fiber |
| Reading the arrival report after a failed or over-built network | The method: class, reach (or coverage), delivery time, capacity, build time, then cost |

## What this game models

A simplified game model of communications history. A medium is feasible for a demand only if all of these hold:
- its **message class** is sufficient (alert < text < live voice < data)
- its **reach** covers the distance with one link
- its **delivery time** meets the deadline
- its **capacity** meets the demand
- its **build time** fits before the demand arrives

Exactly equal counts as meeting a limit. The correct answer is the feasible medium with the lowest total cost. Cost and build time are the **physical plant** it needs (unless that plant is already in the ground) plus the **technology** installed on it. A higher-rate technology on the same plant costs more but takes no longer to build. Lit SONET fiber halves the cost of the equipment on it (the SONET-to-Ethernet upgrade).

- **Game time:** the clock runs from month 0 to the demand's arrival month (its lead time). A build started in month s is ready in month s plus its build time and serves only if that is not after the arrival.
- **Completion:** a demand completes only when the network you built is exactly the correct answer, ready in time. A network that carries the demand but costs more is over-built: it counts as an attempt and the demand stays open.
- **Funding:** each demand is funded from its era's budget (Level 1: 20, Level 2: 70, Level 3: 1,600 per demand). Funding limits what you can build at once. It never decides correctness, and it always covers the correct answer.
- **Levels 1–2:** every demand carries a circuit count; alert and text demands need 1, and single-channel media (spoken word, drum, beacon, couriers, both telegraphs, telephone line) carry 1.
- **Level 3:** demands describe a service area: population, area, route distance to the backbone, per-user speed, mobile or fixed users, flat terrain, and sometimes a deadline.
  - Peak demand = population × per-user speed × 10%.
  - Wireless towers = the larger of area ÷ coverage and peak demand ÷ capacity; only new tower sites cost plant.
  - Satellites serve at most 50 people per km². Satellite delivery time is the up-and-down path at the speed of light only (geostationary about 239 ms, LEO about 4 ms), a physical floor. Ground media use the route distance.
  - Only network media can be built in Level 3; older media stay in the Ledger for comparison.
- **Scores:** every unlocked medium shows a latency and a capacity, each with a 0–10 score and its unit as the band label. Scores are for comparison only: the grading code cannot read them.
- **The map:** real elevation and rivers of southern Spain, with fictional settlement names. Settlement positions are approximate (map distances differ from the demand distances by up to about 12%); only the demand card's distance is graded.

**Outside the model:** multi-hop chains and relay stations (the horse relay and optical telegraph are single links), congestion, error rates, weather, operating cost, security, SONET ring protection, and the political and economic history of each technology. Cities grow on an authored script, not from your choices; your earlier networks stay on later maps as decoration only.

Most figures are **game-model values** chosen to be defensible orders of magnitude, not historical claims: courier speeds, build times, costs, funding, tier coverage and capacity, the 10% busy share, and the 50 people/km² cap. The Ledger's Values column says so for every medium. Some values are real:
- standard rates: the 64 kbps voice channel, T1 at 1.544 Mbps, T3 at 44.736 Mbps, and SONET OC-3, OC-12 and OC-48 at 155.52, 622.08 and 2,488.32 Mbps
- physical limits: light in fiber at about 200,000 km/s, the 35,786 km geostationary altitude, and the speed of light

| Reference | What it supports | Status |
| --- | --- | --- |
| 11 source records in `data/levels.json` (`sources`, `required: true`) | Relay courier speeds; optical telegraph, electric telegraph and telephone history; 64 kbps; T1; T3; SONET rates; signal speed in fiber; geostationary altitude; speed of light | **Not yet located.** Each has a title and claim but no link or section; the game shows "(to be located)" and the release check fails until they are filled in |

### Assumptions (from `specs/001-signal-age/plan.md` and the 2026-11-17 redesign)

| ID | Assumption | Kind |
| --- | --- | --- |
| A1 | Alert and text demands need 1 circuit; single-channel media carry 1 | Game-model value, confirmed 2026-11-17 |
| A2 | The band label beside each score is the value's readable unit | Display choice, confirmed 2026-11-17 |
| A3 | Every medium value is a game-model value unless a source is attached; physical limits and standard rates must be sourced | Labeling rule |
| A4 | Display scores use floating point; grading never does | Technical |
| A5 | Delivery time is compared as an exact fraction of seconds; costs are whole ten-thousandths | Technical |
| A6 | One demand per round; the network built for it is graded when it arrives; no free text | Design |
| A7 | Speech and writing are introduced in the Level 1 briefing; there is no Level 0 | Scope |
| A8 | Browsers support ES modules, `<dialog>`, `matchMedia`, `fetch`, WebP and container query units; no polyfills | Technical |
| A9 | The 5–10 minute session target is unverified | Open |
| A10 | Funding per demand (20, 70, 1,600) is a game-model value; it must cover each demand's correct answer | Game-model value, **user confirmation requested** (constitution 2.0.0, conflict item 3) |
| A11 | The clock runs at 650 ms per month (fast: 180 ms) and only when the player runs it | Display choice |
| A12 | Settlement positions on the real terrain are approximate; the demand card's distance is the graded one | Display choice |
| — | Geostationary satellites may serve mobile users (`StarterKit/SPEC.md` gives no mobility rule for them); no shipped answer depends on this | Game-model reading |

## How it was built

The project follows the workshop's Spec Kit workflow: **constitution → specify → clarify → plan → tasks → analyze → implement**. The first implementation was choose-and-submit. On 2026-11-17 the user redirected it ("I wanted it to be similar to sim city but scoped down to just communications services/infrastructure"; "use real topology map data"). The game was rebuilt as a builder on the same evaluator, content and grading rule. The constitution was amended to 2.0.0, with the conflicts recorded openly (see Constitution check).

- **Stack:** semantic HTML, CSS, native JavaScript modules and inline SVG over pre-rendered WebP images. No framework, bundler, backend or runtime model.
- **Build tools:** Claude Code with GitHub Spec Kit 1.4.3.dev0 (Claude integration); Blender 4.5.9 LTS (headless) for the terrain and sprite renders.
- **Runtime:** a modern browser and static files. No account, API key or model.
- **Code:**
  - `index.html`, `style.css`, `main.js`
  - `engine/`: pure grading (`rules.js`), the simulation (`sim.js`), validation, state, feedback and display scores; no DOM
  - `ui/`: rendering, map stage, controls, icons
  - `data/levels.json`: all authored content
  - `assets/`: maps and sprites
  - `tests/`: browser test runner and six suites
- **Asset pipeline (offline, not needed to play):** `tools/terrain/world.json` lists the settlements and the seven map views. Rebuild the assets with:

  ```sh
  python3 -I tools/terrain/fetch_dem.py tools/terrain/world.json WORK/downloads      # elevation tiles + rivers
  python3 -I tools/terrain/build_heightmaps.py tools/terrain/world.json WORK/downloads WORK/work
  Blender -b --factory-startup -P tools/blender/render_maps.py -- WORK/work WORK/maps 2000
  Blender -b --factory-startup -P tools/blender/render_sprites.py -- WORK/sprites
  python3 -I tools/terrain/apply_renders.py WORK/maps WORK/sprites .
  ```

  The steps need Python 3 with Pillow and NumPy, network access to the public tile bucket, and Blender 4.5. Check each script's usage line before running: the arguments shown are the intended shape, not a verified fresh run.
- **Planning inputs:** `StarterKit/CONSTITUTION.md`, `StarterKit/SPEC.md`, `StarterKit/PLAN.md`.
- **Working artifacts:** `.specify/memory/constitution.md`; `specs/001-signal-age/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `tasks.md`).
- **One useful design decision:** infrastructure takes time to build, and physical plant and technology are different things. With a game clock, this became something you can feel: a 36-month telegraph must start in time, while T1 on copper already in the ground is ready in 3 months.

## Verification

**Last checked:** 2026-11-17, Chrome 157 on macOS, by Claude (the implementing agent), after the builder redesign. Nothing below has been checked by a second person.

From the repository root, start the server and open the test runner in the same browser:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

- Game: **http://127.0.0.1:8000**
- Test runner: **http://127.0.0.1:8000/tests/** (add `?suites=` to see the zero-test failure; an empty suite is never a pass)

Since the redesign, "submit" in a criterion means a demand arriving with at least one build (spec FR-011). The criteria themselves are unchanged.

### Acceptance criteria

| AC | What must be shown | Result | Date | Environment | Evidence |
| --- | --- | --- | --- | --- | --- |
| AC1 | First briefing before any challenge | Pass | 2026-11-17 | Chrome 157, macOS, local server | Fresh load shows the briefing "Voices and Couriers" beside the map with **Begin**, and no build menu; building and the clock do nothing from the briefing (test S1) |
| AC2 | Smoke beacon correct, link lights, explanation says feasible and cheapest | Pass | 2026-11-17 | Chrome 157, macOS, local server | Built Smoke beacon, ran the clock to month 12: "Served"; route drawn lit with fires at both ends. Report: "it carries alert messages (needs alert), reaches 30 km per link (needs 25 km), delivers in under 1 second (deadline 1 hour), carries 1 circuit (needs 1), and it was ready in month 1…", then "Why it is the cheapest that works, at 3: every cheaper technology fails a check (Spoken word / shout, cost 1: reach; Signal drum, cost 2: reach), and the others cost more (Foot courier 4; Horse relay 8)" (tests M12, S3) |
| AC3 | Horse relay late (3 h vs 1 h), completion unchanged, retry works | Pass | 2026-11-17 | Chrome 157, macOS, local server | "Not served: At 200 km/day, Horse relay needs 3 hours; the deadline is 1 hour"; Completed 0/6, Attempts 1, Funds 12 of 20; Retry restored Funds 20 of 20 and month 0 with Attempts still 1; then the beacon served it (tests S3, M4) |
| AC4 | No selection: guidance only, no counter changes | Pass | 2026-11-17 | Chrome 157, macOS, local server | Build with nothing chosen: "Choose a technology in the build menu first, then build it on the route."; running the clock with nothing built holds at month 12 with "…nothing is built to serve it, so nothing is counted" and **Rewind to month 0**, focus on the message, clock buttons disabled; Attempts 0 (tests S4, M11) |
| AC5 | Hint gives the method, then a worked step; worked solution recorded as assistance | Pass | 2026-11-17 | Chrome 157, macOS, local server | Worked solution disabled before the first hint; Hint → "Work through the method in order. 1) Class… 2) Reach…"; Worked solution → 7 steps ending "Timing: Smoke beacon takes 1 month to build, so start it by month 11…"; second Hint → worked step; Help 3, Attempts unchanged, round not completed (test S6) |
| AC6 | One attempt per valid submission; correct completes once; resubmit does nothing | Pass | 2026-11-17 | Chrome 157, macOS, local server | After serving, Build and the clock buttons are disabled and Build, clock and Retry actions leave the round unchanged (test S5). A working but costlier network (T1 in Level 2 Round 1) reports "Over-built: … a cheaper network would also have worked", counts one attempt and keeps the round open without naming the answer (tests M6, S24) |
| AC7 | Level completes at two solved rounds; era-advance screen; civilization summary | Pass | 2026-11-17 | Chrome 157, macOS, local server | Played all six demands (by buttons and, to save time, by the same state actions the buttons send): years-pass and era-advance after Level 1 ("Era of wires", 9 new technologies, spent 11) and Level 2, Level 3 on the steppe and the city, years-pass to Year 2040, then the civilization summary with served, attempts, help and spending per era (tests S10–S12) |
| AC8 | Restart asks to confirm; Confirm clears, Cancel preserves | Pass | 2026-11-17 | Chrome 157, macOS, local server | Restart pauses the clock and opens a dialog with focus on Cancel; Escape and Cancel keep the session and return focus to Restart; Confirm returns to the first briefing with Completed 0/6, Attempts 0, Help 0 and no builds (test S7) |
| AC9 | Visible focus, accessible names, every core action by keyboard | Pass, with one gap | 2026-11-17 | Chrome 157, macOS, local server | Real key presses: Enter on Begin; arrow keys in the build menu (one tab stop); Enter chooses; Tab → Build; Enter; Tab → Run the clock; Enter; at the arrival focus moves to the report; Tab → Next; Enter; Escape skips the years-pass. Focus ring seen on the chosen tool. All 17 visible controls have accessible names. **Gap:** reverse tabbing (Shift+Tab) untested; the automation tool's Shift+Tab does not move focus |
| AC10 | Text feedback, announced, map text equivalent, skippable message travel, reduced motion keeps information | Partial pass | 2026-11-17 | Chrome 157, macOS, local server | Reports use words plus a symbol (✓, ≈, ✗); the headline is written to the `aria-live` region (checked in the DOM; **no screen reader used**). "Map details (text)" lists settlements, tiers, the demand, your builds, and the note that positions are approximate. Message travel stops on Escape and by its button. Reduced motion: with `matchMedia` reporting reduce, nothing animates, the message is drawn at its destination and the year shows at once; **the real OS setting and the CSS media rule were not tested** |
| AC11 | Latency and capacity with 0–10 scores and unit labels for every unlocked medium; scores never grade | Pass | 2026-11-17 | Chrome 157, macOS, local server | The Ledger shows every unlocked medium with latency and capacity, each with a score and unit label (5 rows in Level 1); the build preview shows both for the chosen medium. Score cases X1–X13 pass; X9–X10 show grading cannot read scores |
| AC12 | Existing infrastructure listed; plant and technology split; built plant is zero; higher tier same time | Pass | 2026-11-17 | Chrome 157, macOS, local server | Level 2 Round 2 lists "copper plant" in the ground and T1 is ready in month 3 (plant 0 + technology 20); Level 3 Round 2 lists "lit SONET fiber" and Ethernet costs 500 (plant 0 + technology 500); tests R15–R21, R35–R37 and M7 pass |
| AC13 | Years-pass transition names year and tier changes; skippable; text under reduced motion | Partial pass | 2026-11-17 | Chrome 157, macOS, local server | Next shows "Years pass: Year 1150" beside the new map with "Ashford is now a town (it was a village)" and "Brennan's Ford appears on the map as a village"; the year counts up while the map cross-fades; Escape and Continue skip. With reduced motion reported through `matchMedia`, the final year shows at once (**real OS setting not tested**) |

### Other checks

| Check | Result | Evidence / notes |
| --- | --- | --- |
| Test runner fails on zero tests | Pass | 2026-11-17, Chrome 157 on macOS: `tests/?suites=` shows "FAIL: zero tests discovered" |
| Full automated suite | Pass, except the release check | 2026-11-17, Chrome 157, macOS, local server: `tests/` shows 98 of 99 passing across six suites (harness, rules, state, sim, content, scores); the same in Node. The one failure is C33, which fails by design until the 11 required sources have a link and section. The simulation agrees with the evaluator for every offered medium of every round (M1). Expected values are copied by hand from `StarterKit/SPEC.md`; **not independently checked by a second person** |
| Full playthrough on the builder | Pass | 2026-11-17, Chrome 157, macOS: all six demands played and checked by screenshot. Construction progress was shown, earlier networks stayed on later maps, the Level 3 towers and satellite were drawn, and the epilogue and summary appeared |
| Narrow layout and laptop size | Pass | 2026-11-17, Chrome 157, macOS: at 1366 × 647 the map fits the window height with the build menu left and the panel right; in a 760 px frame the layout stacks (map, build menu, panel) with no sideways page scroll |
| Clean session: static files only | Pass | 2026-11-17, Chrome 157, macOS: a fresh load and one round made requests only to the local server (1 CSS, 11 JavaScript modules, `data/levels.json`, 3 WebP images); no account, backend, model or API key |
| Served from a subpath | Pass | 2026-11-17, Chrome 157, macOS: served from a parent folder, the game at `/NAF_AC6/` loaded its map and sprite images, served a demand, and its test runner showed the same 98 of 99 |
| Briefings and explanations checked against sources | Done by the implementing agent before the redesign, not re-run | The briefings and hints are unchanged except the how-to-play text; generated reports are built from evaluator evidence (tests M9–M12). **Open:** 11 claims still have no located source; an independent human review is still needed |
| Deliberately wrong choice walkthroughs, Levels 1–3 (C2, SC-004) | Not run | Needs a human reviewer to play the builder, explain the failed check and say what they learned |
| Timed first playthrough, 5–10 minutes (SC-001) | Not run | Needs a first-time human player |
| Fresh copy following only the README | Not re-run since the redesign | The earlier run (choose-and-submit build) passed with a caveat; repeat on the builder |
| Reload starts a fresh session | Pass (unchanged code path) | Reload recreates the session from the data file; no storage is used |
| Asset pipeline from a fresh checkout | Not run | The maps and sprites were made in this session's work folder; a clean rerun of the commands above has not been done |

### Trace: Level 2 Round 2 (C6 evidence)

Demand: live voice, Ashford → Port Merrow, 300 km, deadline 1 second, 20 circuits, arrives in month 60; copper plant already installed. The evaluator checks class, reach, delivery time, capacity and build time in that order, then picks the cheapest feasible medium. Output from `analyzeRound` on 2026-11-17:

| Medium | First failed check | Cost | Build time |
| --- | --- | --- | --- |
| Spoken word, signal drum, smoke beacon, couriers, both telegraphs | Class or reach | 1–17 | — |
| Telephone line | Capacity (1 < 20) | 10 (copper already built) | 12 months |
| Analog carrier trunk | Capacity (12 < 20) | 15 | 6 months |
| **T1 (DS1)** | — (feasible) | **20** (plant 0 + technology 20) | 3 months |
| T3 (DS3) | — (feasible) | 45 | 51 months |
| SONET OC-3 / OC-12 / OC-48 | — (feasible) | 55 / 70 / 90 | 51 months |

In the builder (`resolveBuilds`), each medium is built alone in month 0:
- T1 is **served**.
- T3 carries the demand but is **over-built**; OC-12 and OC-48 cannot even be afforded with funding 70.
- The telephone line is **not served** (capacity).

The report text is built from this same evidence.

### Constitution check (2.0.0)

| Principle | Result | Evidence and gaps |
| --- | --- | --- |
| C1 Technical truth | Pass for grading; **release blocked** | One documented rule in `engine/rules.js`. The simulation adds only readiness by the arrival month, and agrees with the evaluator for every medium (M1). Only the cheapest feasible network completes a demand. Broken content shows "challenge unavailable" and counts nothing, and grading cannot read scores. Gaps: 11 required sources not located (C33 fails); expected values not checked by a second person |
| C2 Teaching decision | Pass in the build; **evidence not run** | Briefings teach before testing; the build preview and Ledger show every decision value; reports name the failed check and a next step, or explain why the network is feasible and cheapest; help goes method → worked step → worked solution, counted as help. Gap: the three human walkthroughs are not run |
| C3 Honest progress | Pass | Tests S1–S24, M1–M12 and browser checks for AC1, AC3–AC8: separate counts; guidance without counting; one attempt per arrival; no double completion; refunds on Retry and Start over; a clock that never runs out on its own |
| C4 Access | Partial | Keyboard flow (forward Tab), visible focus, accessible names, text equivalents, skippable animations and narrow layouts pass. Gaps: Shift+Tab untested, no screen reader, reduced motion only simulated |
| C5 Deterministic and self-contained | Pass | Growth is authored data; no randomness; play never changes content (S14, S20, S21); only same-origin static files load; the asset tools never run in the game |
| C6 Reviewable content | Pass | All content, including funding and map data, in `data/levels.json`, validated per round (including BUDGET_TOO_SMALL); one answer traced above |
| C7 Done is demonstrated | Pass | Run and test commands above; this table records pass, partial and not run with dates; spec, plan, tasks and this README describe the builder |

**Conflicts recorded in constitution 2.0.0** (the user's direction changed the StarterKit design):
1. The StarterKit constitution still describes choose-and-submit; this game follows the amended one.
2. The non-goal "No city building, placement or management" now applies to settlements only; you place communications infrastructure.
3. The non-goal "No resource economy" conflicts with per-demand funding. **The user has been asked to confirm it**; it can be removed without touching grading.
4. "No timers": the calendar runs only while you run it.

## Known limitations and next steps

- **Not release-ready:** 11 required source citations (history anchors, standard rates, physical limits) have no link or section yet, so the release check (test C33) fails on purpose.
- **Open decision:** per-demand funding conflicts with the StarterKit non-goal "No resource economy" and is waiting for the user's confirmation.
- **Checked by the implementing agent only:** the hand-checked expected values, the source review and every browser check were done by Claude. No second person has checked them, and the three deliberately-wrong-choice walkthroughs (one per level) still need a human reviewer.
- **Accessibility gaps:** reverse tabbing (Shift+Tab) was not tested; no screen reader was used; reduced motion was checked only by simulating the media query in JavaScript, not with the real system setting.
- **The map is illustrative:** settlement positions are approximate (up to about 12% off the demand distances), and settlement sprites are simple procedural models.
- **Session length:** the 5–10 minute target has not been timed with a first-time player.
- **Next improvement:** confirm funding, cite the 11 sources, then have a teammate run the walkthroughs and a timed first playthrough on the builder.

Found an incorrect answer or unclear explanation? Open an issue with the level/round, input values, what you built, expected result, actual result, and a reference if available.

## Credits

Created by Chad Staggs. Workshop by John Capobianco, Joksan Flores, and Elliot Conner. Adapted from the [NAF AC6 workshop materials](https://github.com/automateyournetwork/NAF_AC6) and [Networking Video Game Starter Kit](https://github.com/automateyournetwork/NetworkingVideoGameStarterKit), using [GitHub Spec Kit](https://github.com/github/spec-kit).

**Assets and data:** no third-party code, libraries or fonts. The map images and settlement sprites were rendered for this project in Blender from the data below; icons are original inline SVG.

- **Elevation:** [Terrain Tiles on AWS](https://registry.opendata.aws/terrain-tiles/) (Mapzen / Tilezen Joerd). Required attribution, from the [Joerd attribution document](https://github.com/tilezen/joerd/blob/master/docs/attribution.md):
  - Mapzen
  - "Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers"
  - "United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey"
  - "Global ETOPO1 terrain data U.S. National Oceanic and Atmospheric Administration"

  **Modifications** (described as GMTED2010's terms ask): the elevation was resampled to a local kilometre grid, given a synthetic sea depth where the tiles had none, vertically exaggerated (2.8× to 7×), and rendered as shaded, stylised images. The images are not survey data and must not be used for navigation.
- **Rivers:** [Natural Earth](https://www.naturalearthdata.com/) 1:10m rivers and lake centerlines (public domain). Made with Natural Earth.
- **Rendering:** Blender 4.5.9 LTS, used as a tool. The rendered images are this project's own output.

**License:** Apache License 2.0; see the [LICENSE](LICENSE) file in this repository. The planning templates in `StarterKit/` are adapted from the NAF AC6 workshop materials.
