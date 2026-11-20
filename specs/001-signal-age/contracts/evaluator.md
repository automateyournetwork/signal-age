# Contract: evaluator and validator (`engine/rules.js`, `engine/content.js`)

`evaluate` lives in `engine/rules.js`; `validateRound` and `checkReleaseReadiness` live in `engine/content.js`. All three are pure: same inputs, same result; no DOM, timers, network, randomness or score inputs.

```text
validateRound(content, roundId) → { ok: true } | { ok: false, errors: [{ roundId, code, message }] }
  codes: MISSING_FIELD, UNKNOWN_REF, MISSING_SOURCE, NO_FEASIBLE_MEDIUM, COST_TIE, TIER_DECREASE, CLASS_NOT_CARRIED, INCONSISTENT_INFRASTRUCTURE
  (file-level, from validateContent: SCHEMA_VERSION, DUPLICATE_ID, MISSING_FIELD)

checkReleaseReadiness(content) → { ready: boolean, problems: [{ code, message }] }
  tests only, never at load: three levels (LEVEL_COUNT), two rounds each (ROUND_COUNT), every required source with a link and section (SOURCE_NOT_LOCATED)

evaluate(content, roundId, mediumId | null) → {
  status:     "correct" | "incorrect" | "invalid-input" | "content-error",
  expected:   mediumId | null,
  reasonCode: "OK" | "NO_SELECTION" | "NOT_OFFERED" | "CLASS_TOO_WEAK" | "OUT_OF_REACH" | "TOO_SLOW" |
              "NOT_READY" | "CAPACITY_TOO_LOW" | "FEASIBLE_BUT_COSTLIER" |
              "OVER_DENSITY_CAP" | "NOT_FLAT" | "USER_SPEED_TOO_LOW" | "NOT_MOBILE" |
              "NO_FEASIBLE_MEDIUM" | "COST_TIE",
  evidence: { perMedium: [{
      id, offered, feasible, failedChecks[],           // ordered: class, reach, delivery, capacity, build
      deliveryTime: {num, den},               // seconds, exact
      deadline:     {num, den} | null,
      totalBuildMonths, plantMonths, technologyMonths,
      cost, plantCost, technologyCost,        // integer ten-thousandths
      circuits, circuitsNeeded,
      towers, newSites, density, peakDemand    // Level 3 only
  }] }
}
```

## Rules (spec FR-001, FR-002, FR-004, FR-006)

1. **Feasible** only if every check passes, in this fixed order: class rank at least the request's; distance at most reach (Levels 1–2); delivery time at most the deadline; capacity meets demand (circuits for every Level 1–2 request); build months at most lead months. Level 3 replaces reach with coverage and adds per-user speed, mobility, flatness and density rules.
2. **Equality passes** on reach, deadline, lead time and density cap.
3. **Expected answer:** the feasible medium with the lowest total cost. Costs compare as integers.
4. **Plant and technology:** `cost = plantCost + technologyCost`, `months = plantMonths + technologyMonths`. Plant listed as existing is zero for that medium. Lit SONET halves fiber-technology cost (in ten-thousandths; every halving is exact, so no rounding rule exists).
5. **Choosing a feasible but costlier medium** returns `incorrect` with `FEASIBLE_BUT_COSTLIER`.
6. **`reasonCode` for an infeasible choice** is the first failed check in the fixed order, with every failed check listed in `failedChecks`.
7. `invalid-input` (no selection, unknown id, or a medium not offered in this round, such as an earlier-era medium in Level 3) never counts as an attempt. `content-error` is returned only when `validateRound` fails and never counts either.
8. The function never reads latency or capacity scores. Scores come from `engine/scores.js`, which `rules.js` does not import.

## Exact arithmetic

Delivery time is a rational number of seconds. For a courier at `v` km per day over `d` km: `d × 86400 / v`. Compare `d × 86400 ≤ v × deadlineSeconds`-style cross products in integers. Propagation media (fiber, wireless) use the request distance (the route distance in Level 3) at their propagation speed. Satellites use only their up-and-down path at 299,792.458 km/s, expressed as an exact integer ratio (document the constant once); the ground distance is not added (spec FR-033). Tower counts use integer ceiling division.

## Arrival in game time (`engine/sim.js`, added 2026-11-17)

`resolveBuilds(content, roundId, builds)` takes `builds[] {mediumId, startMonth}` and returns the arrival outcome in `data-model.md`. For each build it reads the evaluator row (`analyzeRound`): its **functional failures** are its failed checks other than `NOT_READY`; it is **ready** when `startMonth + totalBuildMonths <= leadMonths` (equality counts); it **works** when ready with no functional failure. The outcome is `served` when some build works and the spending equals the evaluator's expected answer's cost (so that answer was built alone), `overbuilt` when some build works but more was spent, and `unserved` otherwise. Built alone in month 0, a medium is carried exactly when `analyzeRound` calls it feasible and served exactly when it is the expected answer (test M1). The function imports only `rules.js`, never reads scores, and never mutates its input.

## Level 3 offered media

Level 3 rounds offer only era-3 media. Earlier media appear in `evidence.perMedium` with `offered: false`; they are never feasible candidates, never the expected answer, and choosing one returns `invalid-input`.
