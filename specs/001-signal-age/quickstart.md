# Quickstart: validating Signal Age

The game is implemented as a communications builder (redesign of 2026-11-17, constitution 2.0.0). Results of each check are recorded in the README verification table, not here.

## Prerequisites

- Python 3 (for the preview server) and a current evergreen browser.
- A clone of this repository on branch `001-signal-age`.

## Run

From the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

On Windows use `py -m http.server 8000 --bind 127.0.0.1`. If port 8000 is busy, use 8001 in the command and the URLs.

- Game: http://127.0.0.1:8000
- Test runner: http://127.0.0.1:8000/tests/

Opening `index.html` with `file://` is unsupported: modules and `fetch` need HTTP.

## Validation scenarios

| # | Scenario | Expected result | Covers |
| --- | --- | --- | --- |
| 1 | Open the test runner with the suites loaded | Totals and failed case ids are shown; PASS only with all tests passing | C7 |
| 2 | Open the runner with the suites removed (or point it at an empty list) | Shows **FAIL: zero tests discovered** | C7, plan "fails on zero tests" |
| 3 | Fresh load of the game | First briefing is shown before any challenge | AC1 |
| 4 | Level 1 Round 1: build **Smoke beacon**, run the clock to month 12 | Served; link lights; explanation gives every check and why it is cheapest (3; Horse relay costs 8) | AC2 |
| 5 | Same round: build **Horse relay**, run the clock | Not served: 3 h needed vs 1 h deadline; completion unchanged; Retry refunds and rewinds | AC3 |
| 6 | Press Build with nothing chosen; then run the clock with nothing built | Guidance only; the clock holds at the arrival with Rewind; attempts, completion and funding unchanged | AC4 |
| 6a | Level 2 Round 1: build **T1**, run the clock | Over-built: carried, but a cheaper network would also have worked; one attempt; round stays open; the answer is not named | AC6, C1 |
| 6b | Level 1 Round 2: start Horse relay in month 7 | Not served: ready in month 13, the demand arrived in month 12; in month 6 it is served | C1 timing |
| 7 | Press Hint twice, then Worked solution | Method, then a worked step, then the full solution (Worked solution is unavailable before the first hint); assistance rises with each; round not complete | AC5 |
| 8 | Serve a demand, then try Build, the clock and Retry again | One completion, one counted attempt, no change afterwards | AC6 |
| 9 | Solve both rounds of Level 1 | Years-pass, then era-advance screen naming new media | AC7, AC13 |
| 10 | Restart: Cancel, then Restart: Confirm | Cancel preserves the session; Confirm returns to the first briefing | AC8 |
| 11 | Tab through every screen with the keyboard only | Visible focus, accessible names, every action reachable | AC9 |
| 12 | Check feedback with reduced motion on, and in a narrow window | Text feedback, announced; map text equivalent present; no information lost | AC10, AC13 |
| 13 | Compare the media table with `StarterKit/SPEC.md` score cases | Courier about 0.7, telephone about 5.8, horse relay about 3.0; scores never change the answer | AC11 |
| 14 | Open a round with existing copper plant or dark fiber | Built plant shows zero; OC-3, OC-12 and OC-48 take the same build time | AC12 |
| 15 | Load a content file with a cost tie or a missing field | Visible "challenge unavailable"; no grading, no attempt counted | C1 |
| 16 | Play a level twice with different builds | Identical settlements and requests both times | C5 |
| 17 | Add a trial request through data only | Graded correctly with no engine change | C6, SC-005 |
| 18 | Reload mid-session | Returns to the first briefing with all counts cleared | FR-016 |
| 19 | Skip the message-travel animation by button and by key | Ends at once; feedback and controls were never delayed | C4, FR-032 |
| 20 | Open a Level 3 round and its Ledger | Earlier media are listed in the Ledger as "comparison only" with latency, capacity and scores, and are not in the build menu | FR-003, FR-030 |
| 21 | Build more than the demand's funding allows (Level 2: T1 then analog carrier, then the telegraph) | Refused with "costs 17 and only 5 is left"; Start over refunds | FR-037 |

## Recording results

Record each result in the verification table in `StarterKit/README.md` as **pass / fail / not run** with the date, browser and evidence. Do not mark a result pass from a screenshot, a ticked task or an agent's say-so alone.

## Known blockers

None for gameplay since the 2026-11-17 gap decisions. The release-readiness test fails until every physical limit, standard rate and listed historical anchor has a source (`research.md` worklist).

## Contracts and model

See `data-model.md` for entities, `contracts/evaluator.md` for grading, `contracts/levels-data.md` for the data file and `contracts/ui.md` for controls and accessibility.
