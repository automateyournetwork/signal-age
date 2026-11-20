// Signal Age · the communications simulation. Pure: no DOM, timers or randomness.
//
// The player builds infrastructure on a demand's route (or over its service area) while the game
// clock runs in months. Each build costs money from the era's treasury and takes its real build
// time. When the demand arrives (its lead time, in months), the engine decides whether any build
// serves it: the medium must pass class, reach or coverage, delivery time and capacity, and it
// must be finished by the arrival month. Every number comes from engine/rules.js analyzeRound.

import { analyzeRound, findRound, requestModel } from './rules.js';

export function demandOf(content, roundId) {
  const found = findRound(content, roundId);
  if (!found) return null;
  const request = found.round.request;
  return { request, leadMonths: request.leadMonths, model: requestModel(request), from: request.from, to: request.to };
}

export function levelBudget(content, levelIndex) {
  const level = content.levels[levelIndex];
  return level && Number.isInteger(level.budget) ? level.budget : null;
}

// The evaluator's evidence for one offered medium in this round, or null.
export function buildFacts(content, roundId, mediumId) {
  const analysis = analyzeRound(content, roundId);
  if (!analysis.ok) return null;
  return analysis.perMedium.find((r) => r.id === mediumId && r.offered) || null;
}

export const FUNCTIONAL_CHECKS = ['CLASS_TOO_WEAK', 'OUT_OF_REACH', 'TOO_SLOW', 'CAPACITY_TOO_LOW', 'NOT_FLAT', 'NOT_MOBILE', 'OVER_DENSITY_CAP', 'USER_SPEED_TOO_LOW'];

// Decide what happens when the demand arrives. `builds` are { mediumId, startMonth }.
export function resolveBuilds(content, roundId, builds) {
  const analysis = analyzeRound(content, roundId);
  if (!analysis.ok) return null;
  const lead = analysis.round.request.leadMonths;
  const results = builds.map((b) => {
    const row = analysis.perMedium.find((r) => r.id === b.mediumId && r.offered);
    const functionalFailures = row.failedChecks.filter((c) => FUNCTIONAL_CHECKS.includes(c));
    const readyMonth = b.startMonth + row.totalBuildMonths;
    const ready = readyMonth <= lead;
    return {
      mediumId: b.mediumId,
      name: row.name,
      startMonth: b.startMonth,
      readyMonth,
      cost: row.cost,
      ready,
      functionalFailures,
      works: ready && functionalFailures.length === 0,
    };
  });
  const working = results.filter((r) => r.works).sort((a, b) => a.cost - b.cost);
  const spent = results.reduce((n, r) => n + r.cost, 0);
  const cheapestRow = analysis.perMedium.find((r) => r.id === analysis.expected);
  // Constitution C1/C3: the demand completes only when the network is the cheapest one that carries it.
  // Working builds are never cheaper than the evaluator's answer, so spending exactly its cost means the
  // player built that answer alone; anything more is over-built (carried, but not the correct answer).
  let status = 'unserved';
  if (working.length) status = spent === cheapestRow.cost ? 'served' : 'overbuilt';
  return {
    status,
    arrivalMonth: lead,
    results,
    servedBy: working.length ? working[0].mediumId : null,
    spent,
    cheapest: { mediumId: cheapestRow.id, name: cheapestRow.name, cost: cheapestRow.cost },
    overspend: Math.max(0, spent - cheapestRow.cost),
  };
}
