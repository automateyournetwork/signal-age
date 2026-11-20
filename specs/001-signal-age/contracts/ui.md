# Contract: user interface

What the learner and the test runner can rely on. No hover-only information; everything that decides an outcome is visible text. Revised 2026-11-17 for the communications builder (constitution 2.0.0, spec FR-034–FR-039).

## Screens

Loading → Briefing → Round (inspect, choose, build, run the clock, arrival report) → Years-pass → Level summary with era advance → … → Civilization summary; plus a load-error screen (file-level errors), a per-round "challenge unavailable" message, a Restart confirmation dialog and a Ledger dialog. Briefing, years-pass and summaries show their card beside the map, never over it. In the interim demo (Levels 1–2 only), finishing Level 2 opens the civilization summary marked "Level 3 not yet built".

## HUD (top, on every screen)

Era name; date as "Year … · month m/L"; clock buttons Pause, Play, Fast forward and Skip to arrival (disabled outside a running round and while the clock is held at an arrival with nothing built); funding left for this demand ("Funds f of b"); Completed, Attempts and Help as separate counts; Ledger; Restart; the era timeline.

## Round screen regions (reading and tab order)

1. **Build menu** (left): one button per offered technology with icon, name, class, reach and speed (Level 3: per-user speed and kind) and cost. It is one tab stop; arrow keys, Home and End move between technologies, Enter chooses one. In Level 3, earlier media are not in the menu; they appear only in the Ledger marked "comparison only".
2. **Map** (centre, illustration only, `aria-hidden` overlay): real terrain image, settlements as sprites with name labels, the demand route or service area with a badge, builds drawn in their own style with construction progress, earlier networks, the travelling message after the arrival, a scale bar and a north mark. Clicking the route or area builds the chosen technology.
3. **Side panel** (right): the demand card (story, countdown to the arrival month, from, to, distance, class, deadline, circuits or service-area values, what is already in the ground, funding); guidance notice; arrival report; build preview for the chosen technology (facts only, no verdict) with **Build**; Your builds with **Run the clock** and **Start over (refund)**; Advisor (Hint, Worked solution); Map details (text equivalent).

## Behavior

| Control | Contract |
| --- | --- |
| Choose (build menu) | Shows the preview; never builds, spends or counts. |
| Build | Builds the chosen technology in the current month and pays its cost from the demand's funding. With nothing chosen, the same technology twice or too little funding left: guidance only, nothing counted. Disabled after the arrival. |
| Play / Fast forward / Run the clock | Advance one month every 650 ms / 180 ms until the arrival, then stop. Pause stops at once. The clock never runs on its own. |
| Skip to arrival | Jumps to the arrival month. |
| Arrival | With nothing built: the clock holds with guidance and **Rewind to month 0**; nothing counted. Otherwise one attempt: served (Next appears), over-built or not served (Retry appears). |
| Start over / Rewind / Retry | Remove the round's builds, refund its spending and return to month 0. Attempts and help are kept. No effect after the round is served. |
| Hint | First press shows the method (class, reach, delivery time, capacity, build time and cost); a second press shows a worked step. Each reveal is assistance. |
| Worked solution | Enabled only after the method hint. Steps built from the evaluator's evidence, including when to start building. Assistance; never completes the round. |
| Next | Only after a served arrival; plays the skippable years-pass transition, then the next round, era-advance screen or summary. |
| Skip | Button and Escape end the years-pass transition or the message-travel animation immediately. |
| Ledger | Opens a dialog with every unlocked medium's numbers, scores and value sources for this demand; pauses the clock. |
| Restart | Opens a `<dialog>` with Confirm and Cancel (focus on Cancel); pauses the clock; Cancel or Escape leaves the session untouched. |

## Accessibility

- Every core control is a native button with a visible focus ring and an accessible name; every action is reachable by keyboard. After choosing a technology, Tab reaches its Build button; after building, Tab reaches Run the clock.
- Results use text as well as color and a symbol (✓, ≈, ✗) and are announced through an `aria-live="polite"` region; focus moves to the arrival report's heading. Result text stays until the learner moves on.
- Focus moves deliberately after each screen change (to the new screen's heading) and into and out of dialogs. Focus survives the clock's re-rendering.
- `prefers-reduced-motion`: construction, message travel and growth show their final state at once; no information is lost and nothing delays feedback or controls.
- Layout works on a typical laptop (map sized to the window height) and a narrow window (stacked: map, build menu, panel; no sideways scroll).

## Test hooks

Stable `data-testid` attributes on: `start`, `tool-<mediumId>`, `build`, `builds`, `run-clock`, `start-over`, `rewind`, `notice`, `clock-pause`, `clock-play`, `clock-fast`, `skip-arrival`, `date`, `treasury`, `countdown`, `hint`, `worked-solution`, `next`, `retry`, `continue`, `restart`, `restart-confirm`, `restart-cancel`, `ledger`, `ledger-close`, `media-table`, `play-again`, `skip` (years-pass), `skip-travel` (message travel), `result` (with `data-kind` served, overbuilt, unserved or unavailable), `attempts`, `assistance`, `completed`, `progress`, `request-card`, `tool-card`, `map`, `text-equivalent`, `caption`, `help`, `load-error`. Tests must not depend on element position or animation timing.

## Not provided

No control to build, place, move or upgrade a settlement (FR-028). No real-time timer, lives, points, streak or leaderboard.
