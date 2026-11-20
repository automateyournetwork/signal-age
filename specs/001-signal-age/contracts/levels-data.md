# Contract: `data/levels.json`

One JSON document, loaded once over HTTP with a relative URL, validated before play: a file-level error stops the game, a round-level error disables only that round. Shapes are defined in `data-model.md`; the numbers come from `StarterKit/SPEC.md`.

```jsonc
{
  "schemaVersion": 1,
  "sources": [ { "id": "src-…", "title": "…", "url": "…", "section": "…", "claim": "…" } ],
  "plants":  [ { "id": "copper-plant", "requires": null, "months": 36, "cost": { "fixed": 150000 }, "source": "game-model" } ],
  "media":   [ { "id": "smoke-beacon", "name": "Smoke beacon", "era": 1, "class": "alert",
                 "reach": { "kind": "km", "value": 30 }, "speed": { "kind": "instant" },
                 "plant": null, "technology": { "months": 1, "cost": 30000 },
                 "capacity": { "kind": "bps", "value": 0.05 }, "circuits": 1,
                 "source": "game-model" } ],
  "levels":  [ { "id": "level-1", "title": "Voices and Couriers", "eraName": "…",
                 "learningOutcome": "LO1", "briefing": "…", "sourceIds": [],
                 "unlockedMediumIds": [ "…" ], "budget": 200000,
                 "rounds": [ { "id": "l1-r1",
                               "growth": { "yearLabel": "…", "settlements": [ { "id": "…", "name": "…", "tier": "village", "x": 0, "y": 0, "reason": "…" } ],
                                           "map": { "image": "assets/maps/l1-r1.webp", "widthKm": 64,
                                                    "places": { "ashford": { "x": 66.59, "y": 28.66 } } } },
                               "request": { "from": "…", "to": "…", "distanceKm": 25, "class": "alert",
                                            "deadline": { "value": 1, "unit": "hour" }, "leadMonths": 12, "circuits": 1 },
                               "existingInfrastructure": { "assets": [], "existingTowerSites": 0 },
                               "hints": [ "method…", "worked step…" ] } ] } ]
}
```

Money is integer ten-thousandths of a cost unit (cost 3 is `30000`; 0.005 per person is `50`). The example values above are illustrative of shape only; `StarterKit/SPEC.md` is the source for real values.

## Rules

- **Validation:** the rules in `data-model.md`. A file-level failure stops the game with a load error; a round-level failure disables only that round with a content error naming the level and round id; neither counts as an attempt. Release-readiness checks run in the tests, not at load.
- **Provenance:** every medium and plant has a `source` id or the literal `"game-model"`. Physical limits, standard rates and the listed historical anchors may not be `"game-model"` at release (checked by `tests/content.test.js`, not by the loader); every other value may be.
- **Authored growth:** no field is derived from learner choices; no randomness.
- **Extensibility (SC-005):** adding a request or medium that uses the existing mechanic edits this file and its tests only.
- **Wording:** media are named by what they are and what they support, never by company or product.
- **Feedback text:** fixed wording and hints live here; arithmetic (delivery time, cost, density) is assembled from evaluator evidence, not typed into strings.
- **Funding (2026-11-17):** `levels[].budget` is the funding for each demand in that level, in ten-thousandths; it must cover the round's cheapest feasible medium (round-level `BUDGET_TOO_SMALL` otherwise).
- **Map (2026-11-17):** `growth.map` points at a pre-rendered image under `assets/maps/` with the view's real width; `area` (Level 3) and `places` are positions in the 100 × 70 frame. They are written by `tools/terrain/apply_renders.py` from the Blender projections and never affect grading.
