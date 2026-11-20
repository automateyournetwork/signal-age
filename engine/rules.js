// Signal Age · pure grading rules.
// No DOM, timers, network, randomness or display scores. Same inputs, same result.
//
// A medium is feasible for a request only if every check passes, in this fixed order
// (the same order the hints teach): class, reach, delivery time, capacity, build time.
// The correct answer is the feasible offered medium with the lowest total cost.
// Equality passes on every boundary. Costs are integer ten-thousandths of a cost unit;
// delivery times are exact rationals of seconds, so ties and boundaries are exact.

export const CLASS_RANK = { alert: 0, text: 1, 'live-voice': 2, data: 3 };
export const CLASS_LABEL = { alert: 'alert', text: 'text', 'live-voice': 'live voice', data: 'data' };
export const CHECK_ORDER = ['class', 'reach', 'delivery', 'capacity', 'build'];

const UNIT_SECONDS = {
  ms: [1, 1000],
  second: [1, 1],
  minute: [60, 1],
  hour: [3600, 1],
  day: [86400, 1],
};
export const DEADLINE_UNITS = Object.keys(UNIT_SECONDS);
export const SPEED_UNITS = { hour: 3600, day: 86400 };
export const SPEED_OF_LIGHT_M_PER_S = 299792458;

// ---------- exact rational arithmetic ----------

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function safe(n) {
  if (!Number.isSafeInteger(n)) throw new Error(`exact arithmetic overflow (${n})`);
  return n;
}

export function rat(num, den = 1) {
  if (den === 0) throw new Error('division by zero');
  if (den < 0) [num, den] = [-num, -den];
  const g = gcd(num, den);
  return { num: safe(num / g), den: safe(den / g) };
}

// Exact rational from a decimal literal such as 0.1, 25 or 1.5.
export function ratFromNumber(x) {
  if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error(`not a number: ${x}`);
  const text = String(x);
  if (/e/i.test(text)) throw new Error(`unsupported number format: ${text}`);
  const decimals = (text.split('.')[1] || '').length;
  const den = 10 ** decimals;
  return rat(Math.round(x * den), den);
}

export const ratMul = (a, b) => rat(safe(a.num * b.num), safe(a.den * b.den));
export const ratDiv = (a, b) => rat(safe(a.num * b.den), safe(a.den * b.num));
export const ratCmp = (a, b) => Math.sign(safe(a.num * b.den) - safe(b.num * a.den));
export const ratToNumber = (a) => a.num / a.den;

// ---------- lookups ----------

export function findRound(content, roundId) {
  for (let levelIndex = 0; levelIndex < content.levels.length; levelIndex += 1) {
    const level = content.levels[levelIndex];
    const roundIndex = (level.rounds || []).findIndex((r) => r.id === roundId);
    if (roundIndex >= 0) return { level, levelIndex, round: level.rounds[roundIndex], roundIndex };
  }
  return null;
}

export function mediumById(content, id) {
  return content.media.find((m) => m.id === id) || null;
}

// Every medium unlocked by this level or an earlier one, in data order.
export function unlockedMedia(content, levelIndex) {
  const ids = new Set();
  for (let i = 0; i <= levelIndex; i += 1) {
    for (const id of content.levels[i].unlockedMediumIds || []) ids.add(id);
  }
  return content.media.filter((m) => ids.has(m.id));
}

export function requestModel(request) {
  return request && Object.prototype.hasOwnProperty.call(request, 'population') ? 'service-area' : 'single-link';
}

// Levels 1–2 offer every medium unlocked so far. Level 3 (service-area requests)
// offers only media that have service-area rules; earlier media are shown for comparison.
export function isOffered(medium, request) {
  return requestModel(request) === 'service-area' ? Boolean(medium.serviceArea) : true;
}

// ---------- delivery time ----------

export function deadlineSeconds(deadline) {
  const unit = UNIT_SECONDS[deadline.unit];
  if (!unit) throw new Error(`unknown deadline unit: ${deadline.unit}`);
  return ratMul(ratFromNumber(deadline.value), rat(unit[0], unit[1]));
}

// Exact delivery time in seconds for one link of `distanceKm`.
export function deliveryTime(medium, distanceKm) {
  const speed = medium.speed;
  const d = ratFromNumber(distanceKm);
  switch (speed.kind) {
    case 'instant':
      return rat(0);
    case 'km_per_unit': {
      const unitSeconds = SPEED_UNITS[speed.unit];
      if (!unitSeconds) throw new Error(`unknown speed unit: ${speed.unit}`);
      return ratDiv(ratMul(d, rat(unitSeconds)), ratFromNumber(speed.value));
    }
    case 'propagation':
      return ratDiv(d, ratFromNumber(speed.kmPerS));
    case 'satellite_path':
      // Up-and-down path at the speed of light only: the ground distance is not added,
      // because the signal goes up to the satellite and back down (FR-033).
      return ratDiv(ratMul(ratFromNumber(speed.pathKm), rat(1000)), rat(SPEED_OF_LIGHT_M_PER_S));
    default:
      throw new Error(`unknown speed kind: ${speed.kind}`);
  }
}

// ---------- cost and build time ----------

// Plant already in the ground, from the round's authored infrastructure.
// Dark fiber implies ducts and fiber cable; lit SONET fiber implies dark fiber.
export function existingPlant(infra) {
  const have = new Set();
  for (const asset of infra.assets) {
    if (asset === 'copper-plant') have.add('copper-plant');
    if (asset === 'ducts') have.add('ducts');
    if (asset === 'dark-fiber' || asset === 'lit-sonet-fiber') {
      have.add('ducts');
      have.add('fiber-cable');
    }
  }
  return have;
}

// The plant a medium needs, prerequisites first (fiber cable needs ducts).
export function plantChain(content, plantId) {
  const chain = [];
  let id = plantId;
  const guard = new Set();
  while (id) {
    if (guard.has(id)) throw new Error(`plant "${id}" requires itself`);
    guard.add(id);
    const plant = (content.plants || []).find((p) => p.id === id);
    if (!plant) throw new Error(`unknown plant "${id}"`);
    chain.unshift(plant);
    id = plant.requires;
  }
  return chain;
}

// Cost and build time = plant not yet built + technology on it. Plant already in
// the ground is zero. Lit SONET halves the technology cost of fiber media.
function costAndTime(content, medium, infra) {
  const have = existingPlant(infra);
  const chain = plantChain(content, medium.plant);
  let plantCost = 0;
  let plantMonths = 0;
  for (const plant of chain) {
    if (have.has(plant.id)) continue;
    if (!Number.isInteger(plant.cost.fixed)) throw new Error(`plant "${plant.id}" has no single-link cost`);
    plantCost += plant.cost.fixed;
    plantMonths += plant.months;
  }
  let technologyCost = medium.technology.cost;
  if (!Number.isInteger(technologyCost)) throw new Error(`medium "${medium.id}" has no technology cost`);
  if (chain.some((p) => p.id === 'fiber-cable') && infra.assets.includes('lit-sonet-fiber')) {
    if (technologyCost % 2 !== 0) throw new Error(`halving ${technologyCost} is not exact`);
    technologyCost /= 2;
  }
  return { plantCost, plantMonths, technologyCost, technologyMonths: medium.technology.months };
}

// ---------- assessment ----------

function reachOk(medium, distanceKm) {
  if (medium.reach.kind === 'unlimited') return true;
  if (medium.reach.kind === 'km') return ratCmp(ratFromNumber(distanceKm), ratFromNumber(medium.reach.value)) <= 0;
  throw new Error(`reach kind ${medium.reach.kind} is not valid for a single-link request`);
}

function assessSingleLink(content, medium, request, infra) {
  const time = deliveryTime(medium, request.distanceKm);
  const deadline = deadlineSeconds(request.deadline);
  const ct = costAndTime(content, medium, infra);
  const months = ct.plantMonths + ct.technologyMonths;
  const checks = {
    class: { ok: CLASS_RANK[medium.class] >= CLASS_RANK[request.class], have: medium.class, need: request.class },
    reach: { ok: reachOk(medium, request.distanceKm), reach: medium.reach, distanceKm: request.distanceKm },
    delivery: { ok: ratCmp(time, deadline) <= 0, time, deadline },
    capacity: { ok: medium.circuits >= request.circuits, have: medium.circuits, need: request.circuits },
    build: { ok: months <= request.leadMonths, months, lead: request.leadMonths },
  };
  const codes = { class: 'CLASS_TOO_WEAK', reach: 'OUT_OF_REACH', delivery: 'TOO_SLOW', capacity: 'CAPACITY_TOO_LOW', build: 'NOT_READY' };
  const failedChecks = CHECK_ORDER.filter((c) => !checks[c].ok).map((c) => codes[c]);
  return {
    id: medium.id,
    name: medium.name,
    era: medium.era,
    offered: true,
    feasible: failedChecks.length === 0,
    failedChecks,
    checks,
    deliveryTime: time,
    deadline,
    plantCost: ct.plantCost,
    technologyCost: ct.technologyCost,
    cost: ct.plantCost + ct.technologyCost,
    plantMonths: ct.plantMonths,
    technologyMonths: ct.technologyMonths,
    totalBuildMonths: months,
    circuits: medium.circuits,
    circuitsNeeded: request.circuits,
  };
}

// ---------- Level 3 service areas ----------

const ceilRat = (r) => (r.num % r.den === 0 ? r.num / r.den : Math.floor(r.num / r.den) + 1);
function whole(r, what) {
  if (r.den !== 1) throw new Error(`${what} is not a whole number of ten-thousandths`);
  return r.num;
}

// A service-area request: population, area, route distance, per-user speed, mobile, flat,
// optional deadline. Only media with service-area rules are offered; earlier media are
// returned as comparison rows (offered: false) with a delivery time but no cost.
function assessServiceArea(content, medium, request, infra) {
  const time = deliveryTime(medium, request.routeKm);
  const deadline = request.deadline ? deadlineSeconds(request.deadline) : null;
  const base = { id: medium.id, name: medium.name, era: medium.era, deliveryTime: time, deadline };
  if (!medium.serviceArea) {
    return { ...base, offered: false, feasible: false, failedChecks: [], checks: {}, plantCost: null, technologyCost: null, cost: null, plantMonths: null, technologyMonths: null, totalBuildMonths: null };
  }
  const sa = medium.serviceArea;
  const pop = request.population;
  const areaKm2 = ratFromNumber(request.areaKm2);
  const density = ratDiv(rat(pop), areaKm2);
  const perUser = ratFromNumber(request.perUserMbps);
  const peakDemand = ratDiv(ratMul(rat(pop), perUser), rat(10)); // population × per-user Mbps × 10%

  // Coverage: flat terrain for towers, mobility, and the satellite density cap.
  const coverageCodes = [];
  if (sa.kind === 'wireless' && sa.requiresFlat && !request.flat) coverageCodes.push('NOT_FLAT');
  if (request.mobile && !sa.mobile) coverageCodes.push('NOT_MOBILE');
  if (sa.kind === 'satellite' && ratCmp(density, ratFromNumber(sa.densityCap)) > 0) coverageCodes.push('OVER_DENSITY_CAP');
  const maxUser = sa.kind === 'wireless' ? sa.peakUserMbps : sa.maxUserMbps;

  let plantCost = 0;
  let plantMonths = 0;
  let technologyCost = 0;
  let towers = null;
  let newSites = null;
  if (sa.kind === 'fiber') {
    const have = existingPlant(infra);
    for (const plant of plantChain(content, medium.plant)) {
      if (have.has(plant.id)) continue;
      plantCost += whole(ratMul(ratFromNumber(plant.cost.perRouteKm), ratFromNumber(request.routeKm)), `${plant.id} cost`);
      plantMonths += plant.months;
    }
    technologyCost = medium.technology.perPerson * pop;
    if (infra.assets.includes('lit-sonet-fiber')) {
      if (technologyCost % 2 !== 0) throw new Error(`halving ${technologyCost} is not exact`);
      technologyCost /= 2;
    }
  } else if (sa.kind === 'wireless') {
    towers = Math.max(ceilRat(ratDiv(areaKm2, ratFromNumber(sa.coverageKm2))), ceilRat(ratDiv(peakDemand, ratFromNumber(sa.capacityMbps))));
    newSites = Math.max(0, towers - infra.existingTowerSites);
    const site = plantChain(content, medium.plant)[0];
    plantCost = site.cost.perTower * newSites;
    plantMonths = newSites > 0 ? site.months : 0;
    technologyCost = medium.technology.perTower * towers;
  } else if (sa.kind === 'satellite') {
    technologyCost = medium.technology.fixed + medium.technology.perPerson * pop;
  } else {
    throw new Error(`unknown service-area kind ${sa.kind}`);
  }
  const months = plantMonths + medium.technology.months;
  const checks = {
    class: { ok: CLASS_RANK[medium.class] >= CLASS_RANK[request.class], have: medium.class, need: request.class },
    reach: { ok: coverageCodes.length === 0, codes: coverageCodes, density, densityCap: sa.densityCap ?? null, kind: sa.kind },
    delivery: { ok: !deadline || ratCmp(time, deadline) <= 0, time, deadline },
    capacity: { ok: ratCmp(perUser, ratFromNumber(maxUser)) <= 0, have: maxUser, need: request.perUserMbps },
    build: { ok: months <= request.leadMonths, months, lead: request.leadMonths },
  };
  const failedChecks = [];
  if (!checks.class.ok) failedChecks.push('CLASS_TOO_WEAK');
  failedChecks.push(...coverageCodes);
  if (!checks.delivery.ok) failedChecks.push('TOO_SLOW');
  if (!checks.capacity.ok) failedChecks.push('USER_SPEED_TOO_LOW');
  if (!checks.build.ok) failedChecks.push('NOT_READY');
  return {
    ...base,
    offered: true,
    feasible: failedChecks.length === 0,
    failedChecks,
    checks,
    plantCost,
    technologyCost,
    cost: plantCost + technologyCost,
    plantMonths,
    technologyMonths: medium.technology.months,
    totalBuildMonths: months,
    towers,
    newSites,
    density,
    peakDemand,
  };
}

// Full analysis of one round: every displayed medium's evidence, the expected
// answer, and any authoring problem that makes the round ungradable.
export function analyzeRound(content, roundId) {
  const found = findRound(content, roundId);
  if (!found) return { ok: false, problems: [{ code: 'UNKNOWN_REF', message: `no round "${roundId}"` }], perMedium: [] };
  const { level, levelIndex, round } = found;
  try {
    const request = round.request;
    const model = requestModel(request);
    const infra = round.existingInfrastructure;
    const assess = model === 'service-area' ? assessServiceArea : assessSingleLink;
    const perMedium = unlockedMedia(content, levelIndex).map((m) => assess(content, m, request, infra));
    const feasible = perMedium.filter((r) => r.offered && r.feasible).sort((a, b) => a.cost - b.cost);
    const problems = [];
    if (feasible.length === 0) {
      problems.push({ code: 'NO_FEASIBLE_MEDIUM', message: 'no offered medium meets every constraint' });
    } else if (feasible.length > 1 && feasible[0].cost === feasible[1].cost) {
      problems.push({ code: 'COST_TIE', message: `${feasible[0].name} and ${feasible[1].name} both cost the least` });
    }
    return {
      ok: problems.length === 0,
      problems,
      level,
      levelIndex,
      round,
      model,
      perMedium,
      feasibleIds: feasible.map((r) => r.id),
      expected: problems.length === 0 ? feasible[0].id : null,
    };
  } catch (error) {
    return { ok: false, problems: [{ code: 'MISSING_FIELD', message: error.message }], perMedium: [] };
  }
}

// Grade one choice. Returns status, expected, reasonCode and the evidence.
export function evaluate(content, roundId, mediumId) {
  const analysis = analyzeRound(content, roundId);
  const evidence = { perMedium: analysis.perMedium };
  if (!analysis.ok) {
    return { status: 'content-error', expected: null, reasonCode: analysis.problems[0].code, problems: analysis.problems, evidence };
  }
  if (mediumId === null || mediumId === undefined || mediumId === '') {
    return { status: 'invalid-input', expected: analysis.expected, reasonCode: 'NO_SELECTION', mediumId: null, evidence };
  }
  const chosen = analysis.perMedium.find((r) => r.id === mediumId && r.offered);
  if (!chosen) {
    return { status: 'invalid-input', expected: analysis.expected, reasonCode: 'NOT_OFFERED', mediumId, evidence };
  }
  if (chosen.id === analysis.expected) {
    return { status: 'correct', expected: analysis.expected, reasonCode: 'OK', mediumId, evidence };
  }
  return {
    status: 'incorrect',
    expected: analysis.expected,
    reasonCode: chosen.feasible ? 'FEASIBLE_BUT_COSTLIER' : chosen.failedChecks[0],
    mediumId,
    evidence,
  };
}
