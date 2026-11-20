# NAF_AC6 Development Guidelines

Signal Age only. Updated from the `001-signal-age` plan on 2026-11-17.

## Active Technologies

- Semantic HTML5, CSS, native browser JavaScript ES modules, inline SVG over pre-rendered WebP images; static files with in-memory session state; Python 3 `http.server` for local preview. No framework, bundler, backend, runtime model, account, or API key. (001-signal-age)
- Offline asset pipeline only (never part of the game): Python 3 with Pillow and NumPy (`tools/terrain/`), Blender 4.5 LTS headless (`tools/blender/`).

## Project Structure

The Signal Age game lives at the repository root. Planning inputs are in `StarterKit/` (`SPEC.md` holds the model tables and hand-checked cases and is the source of truth for values); Spec Kit artifacts are in `specs/001-signal-age/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `tasks.md`) and `.specify/`. The game is a communications builder in the spirit of SimCity (user direction 2026-11-17, constitution 2.0.0): each round's demand is played by building a medium on a map of real terrain and running a game clock to the demand's arrival. All three levels and six demands play, and `tests/` runs 99 cases (98 pass; the release check C33 fails until 11 sources are cited).

```text
index.html  style.css  main.js
engine/   rules.js sim.js content.js state.js feedback.js scores.js
ui/       render.js map.js controls.js icons.js
data/     levels.json
assets/   maps/*.webp (real-terrain views)  sprites/*.webp (settlements)
tests/    index.html harness.js support.js rules.test.js state.test.js sim.test.js content.test.js scores.test.js
tools/    terrain/ (elevation and rivers → heightmaps)  blender/ (headless renders)
```

`engine/` is pure domain logic with no DOM; `rules.js` imports nothing and never reads scores (display-only); `sim.js` imports only `rules.js`. `data/levels.json` holds all authored content (media, plants, settlement growth and map data, requests, funding per demand, hints, sources).

Grading rules to keep: equality counts on reach, deadline, lead time and density cap; cost in integer ten-thousandths; delivery time as an exact rational; the answer is the cheapest feasible medium; a cost tie or missing field is a content error, never a learner failure. Capacity (circuits) is graded for every request class. Unsourced numbers are labeled "game model value". Level 3 offers only Level 3 media (earlier media are comparison rows), and satellite delivery is the up-and-down path only. In the builder, a build started in month s is ready in month s plus its build time and must not be later than the arrival (equality counts); a demand completes only when the network is the cheapest feasible medium alone (otherwise over-built or not served, one attempt each); funding never decides correctness and must cover the answer. Map positions are approximate and never graded.

## Commands

Preview from the repository root: `python3 -m http.server 8000 --bind 127.0.0.1`, then open http://127.0.0.1:8000.
Run the browser test runner at http://127.0.0.1:8000/tests/ with the same server. Zero discovered tests is a failure.
Cover AC1–AC13 in the verification table in `README.md` at the repository root (pass / fail / not run, date, environment, evidence).
Check the verification table in `README.md` first; a plan or scaffolding is not a completed game.

## Code Style

Browser JavaScript ES modules, HTML5, CSS: follow standard conventions. Keep domain rules pure and separate from rendering and progress state. Use relative asset paths and case-correct filenames so the game works from a GitHub Pages subpath.

## Recent Changes

- 001-signal-age: Added a static browser game that teaches choosing communication media by class, reach, delivery time, capacity, build time, and cost across three eras. Constitution: `.specify/memory/constitution.md`; inputs: `StarterKit/`.
- 001-signal-age plan: five clarifications recorded in `specs/001-signal-age/spec.md`; plan, research, data model, contracts and quickstart added; Level 3 gaps decided on 2026-11-17 and recorded in `StarterKit/SPEC.md`.
- 001-signal-age redesign (2026-11-17): choose-and-submit replaced by a SimCity-style communications builder on real terrain; constitution 2.0.0 with a conflict register (per-demand funding awaits user confirmation); spec FR-034–FR-039; tasks Slice 7.

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
