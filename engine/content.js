// Signal Age · content validation. Pure: no DOM or network.
//
// File-level errors (wrong schemaVersion, duplicate ids, missing top-level arrays)
// stop the game. Round-level errors disable only that round: it shows
// "challenge unavailable" and nothing is graded or counted.

import { CLASS_RANK, DEADLINE_UNITS, SPEED_UNITS, analyzeRound, requestModel, unlockedMedia } from './rules.js';

export const SCHEMA_VERSION = 1;
export const TIER_RANK = { hamlet: 0, village: 1, town: 2, city: 3, metropolis: 4 };
const ASSETS = ['copper-plant', 'ducts', 'dark-fiber', 'lit-sonet-fiber', 'tower-sites'];

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const isStr = (x) => typeof x === 'string' && x.trim().length > 0;

export function validateContent(content) {
  const fileErrors = [];
  if (!content || typeof content !== 'object') {
    return { ok: false, fileErrors: [{ code: 'NOT_AN_OBJECT', message: 'the data file is not a JSON object' }], rounds: {} };
  }
  if (content.schemaVersion !== SCHEMA_VERSION) {
    fileErrors.push({ code: 'SCHEMA_VERSION', message: `schemaVersion must be ${SCHEMA_VERSION}, found ${content.schemaVersion}` });
  }
  for (const key of ['sources', 'media', 'levels']) {
    if (!Array.isArray(content[key])) fileErrors.push({ code: 'MISSING_FIELD', message: `top-level "${key}" must be an array` });
  }
  if (content.plants !== undefined && !Array.isArray(content.plants)) {
    fileErrors.push({ code: 'MISSING_FIELD', message: 'top-level "plants" must be an array' });
  }
  if (fileErrors.length) return { ok: false, fileErrors, rounds: {} };

  const seen = new Map();
  const ids = [
    ...content.sources.map((s) => ['source', s.id]),
    ...(content.plants || []).map((p) => ['plant', p.id]),
    ...content.media.map((m) => ['medium', m.id]),
    ...content.levels.map((l) => ['level', l.id]),
    ...content.levels.flatMap((l) => (l.rounds || []).map((r) => ['round', r.id])),
  ];
  for (const [kind, id] of ids) {
    if (!isStr(id)) {
      fileErrors.push({ code: 'MISSING_FIELD', message: `a ${kind} has no id` });
    } else if (seen.has(id)) {
      fileErrors.push({ code: 'DUPLICATE_ID', message: `id "${id}" is used by a ${seen.get(id)} and a ${kind}` });
    } else {
      seen.set(id, kind);
    }
  }
  if (fileErrors.length) return { ok: false, fileErrors, rounds: {} };

  const rounds = {};
  for (const level of content.levels) {
    for (const round of level.rounds || []) rounds[round.id] = validateRound(content, round.id);
  }
  return { ok: Object.values(rounds).every((r) => r.ok), fileErrors, rounds };
}

function mediumProblems(content, medium) {
  const problems = [];
  const missing = (field) => problems.push({ code: 'MISSING_FIELD', message: `medium "${medium.id}" is missing or has an invalid "${field}"` });
  if (!isStr(medium.name)) missing('name');
  if (![1, 2, 3].includes(medium.era)) missing('era');
  if (!(medium.class in CLASS_RANK)) missing('class');
  if (!medium.reach || !['km', 'unlimited', 'coverage', 'route'].includes(medium.reach.kind)) missing('reach');
  if (medium.reach && medium.reach.kind === 'km' && !(isNum(medium.reach.value) && medium.reach.value > 0)) missing('reach.value');
  const speed = medium.speed;
  if (!speed || !['instant', 'km_per_unit', 'propagation', 'satellite_path'].includes(speed.kind)) missing('speed');
  else if (speed.kind === 'km_per_unit' && !(isNum(speed.value) && speed.value > 0 && speed.unit in SPEED_UNITS)) missing('speed.value/unit');
  if (!medium.technology || !(isNum(medium.technology.months) && medium.technology.months >= 0)) missing('technology.months');
  if (!medium.capacity || !['bps', 'payload', 'user_mbps'].includes(medium.capacity.kind)) missing('capacity');
  if (!medium.serviceArea && !(Number.isInteger(medium.circuits) && medium.circuits >= 1)) missing('circuits');
  const sa = medium.serviceArea;
  if (sa) {
    const t = medium.technology || {};
    if (sa.kind === 'fiber') {
      if (!Number.isInteger(t.perPerson) || !isNum(sa.maxUserMbps) || typeof sa.mobile !== 'boolean') missing('serviceArea (fiber)');
    } else if (sa.kind === 'wireless') {
      if (!Number.isInteger(t.perTower) || !(isNum(sa.coverageKm2) && sa.coverageKm2 > 0) || !(isNum(sa.capacityMbps) && sa.capacityMbps > 0)
        || !isNum(sa.peakUserMbps) || typeof sa.mobile !== 'boolean') missing('serviceArea (wireless)');
    } else if (sa.kind === 'satellite') {
      if (!Number.isInteger(t.fixed) || !Number.isInteger(t.perPerson) || !isNum(sa.maxUserMbps) || !isNum(sa.densityCap) || medium.speed.kind !== 'satellite_path') missing('serviceArea (satellite)');
    } else {
      missing('serviceArea.kind');
    }
  } else if (!Number.isInteger((medium.technology || {}).cost)) {
    missing('technology.cost');
  }
  if (medium.plant !== null && medium.plant !== undefined) {
    const plants = content.plants || [];
    let id = medium.plant;
    const guard = new Set();
    while (id) {
      const plant = plants.find((p) => p.id === id);
      if (!plant) {
        problems.push({ code: 'UNKNOWN_REF', message: `medium "${medium.id}" needs unknown plant "${id}"` });
        break;
      }
      if (guard.has(id)) {
        problems.push({ code: 'UNKNOWN_REF', message: `plant "${id}" requires itself` });
        break;
      }
      guard.add(id);
      if (!(Number.isInteger(plant.months) && plant.months >= 0) || !plant.cost || typeof plant.cost !== 'object') {
        problems.push({ code: 'MISSING_FIELD', message: `plant "${plant.id}" is missing months or cost` });
      }
      id = plant.requires;
    }
  }
  if (medium.source !== 'game-model' && !content.sources.some((s) => s.id === medium.source)) {
    problems.push({ code: 'MISSING_SOURCE', message: `medium "${medium.id}" has no source and is not labeled "game-model"` });
  }
  for (const [field, sourceId] of Object.entries(medium.fieldSources || {})) {
    if (!content.sources.some((s) => s.id === sourceId)) {
      problems.push({ code: 'UNKNOWN_REF', message: `medium "${medium.id}" cites unknown source "${sourceId}" for ${field}` });
    }
  }
  return problems;
}

function requestProblems(request) {
  const problems = [];
  const missing = (field) => problems.push({ code: 'MISSING_FIELD', message: `request is missing or has an invalid "${field}"` });
  if (!request || typeof request !== 'object') return [{ code: 'MISSING_FIELD', message: 'round has no request' }];
  if (!isStr(request.from)) missing('from');
  if (!isStr(request.to)) missing('to');
  if (!(request.class in CLASS_RANK)) missing('class');
  if (!(isNum(request.leadMonths) && request.leadMonths >= 0)) missing('leadMonths');
  const d = request.deadline;
  const deadlineValid = d && isNum(d.value) && d.value > 0 && DEADLINE_UNITS.includes(d.unit);
  if (requestModel(request) === 'single-link') {
    if (!(isNum(request.distanceKm) && request.distanceKm > 0)) missing('distanceKm');
    if (!deadlineValid) missing('deadline');
    if (!(Number.isInteger(request.circuits) && request.circuits >= 1)) missing('circuits');
  } else {
    for (const f of ['population', 'areaKm2', 'routeKm', 'perUserMbps']) {
      if (!(isNum(request[f]) && request[f] > 0)) missing(f);
    }
    if (!Number.isInteger(request.population)) missing('population');
    if (typeof request.mobile !== 'boolean') missing('mobile');
    if (typeof request.flat !== 'boolean') missing('flat');
    if (d !== undefined && d !== null && !deadlineValid) missing('deadline');
  }
  return problems;
}

function growthProblems(content, levelIndex, round) {
  const problems = [];
  const g = round.growth;
  if (!g || !isStr(g.yearLabel) || !Array.isArray(g.settlements) || g.settlements.length === 0) {
    return [{ code: 'MISSING_FIELD', message: 'round has no growth snapshot' }];
  }
  for (const s of g.settlements) {
    if (!isStr(s.id) || !isStr(s.name) || !(s.tier in TIER_RANK) || !isNum(s.x) || !isNum(s.y)) {
      problems.push({ code: 'MISSING_FIELD', message: `settlement "${s.id || '?'}" is missing a name, tier or position` });
    }
  }
  // Tiers only rise across the timeline: compare with every earlier round.
  const earlier = new Map();
  outer: for (let li = 0; li <= levelIndex; li += 1) {
    for (const r of content.levels[li].rounds || []) {
      if (r.id === round.id) break outer;
      for (const s of (r.growth && r.growth.settlements) || []) {
        earlier.set(s.id, Math.max(earlier.get(s.id) ?? -1, TIER_RANK[s.tier] ?? -1));
      }
    }
  }
  for (const s of g.settlements) {
    if (earlier.has(s.id) && (TIER_RANK[s.tier] ?? -1) < earlier.get(s.id)) {
      problems.push({ code: 'TIER_DECREASE', message: `settlement "${s.name}" is smaller than in an earlier round` });
    }
  }
  return problems;
}

function infraProblems(content, infra) {
  if (!infra || !Array.isArray(infra.assets)) return [{ code: 'MISSING_FIELD', message: 'round has no existing infrastructure list' }];
  const problems = [];
  for (const a of infra.assets) {
    if (!ASSETS.includes(a)) problems.push({ code: 'UNKNOWN_REF', message: `unknown infrastructure asset "${a}"` });
  }
  if (!(Number.isInteger(infra.existingTowerSites) && infra.existingTowerSites >= 0)) {
    problems.push({ code: 'MISSING_FIELD', message: 'existingTowerSites must be a whole number, 0 or more' });
  } else if (infra.assets.includes('tower-sites') !== infra.existingTowerSites > 0) {
    problems.push({ code: 'INCONSISTENT_INFRASTRUCTURE', message: '"tower-sites" must be listed exactly when existingTowerSites is above 0' });
  }
  return problems;
}

export function validateRound(content, roundId) {
  let levelIndex = -1;
  let round = null;
  content.levels.forEach((l, i) => {
    const r = (l.rounds || []).find((x) => x.id === roundId);
    if (r) {
      levelIndex = i;
      round = r;
    }
  });
  if (!round) return { ok: false, errors: [{ roundId, code: 'UNKNOWN_REF', message: `no round "${roundId}"` }] };

  const problems = [];
  // Every medium id a level unlocks must exist; a bad id affects this level and later ones.
  for (let li = 0; li <= levelIndex; li += 1) {
    for (const id of content.levels[li].unlockedMediumIds || []) {
      if (!content.media.some((m) => m.id === id)) problems.push({ code: 'UNKNOWN_REF', message: `level "${content.levels[li].id}" unlocks unknown medium "${id}"` });
    }
  }
  const displayed = unlockedMedia(content, levelIndex);
  for (const medium of displayed) problems.push(...mediumProblems(content, medium));
  problems.push(...requestProblems(round.request));
  problems.push(...growthProblems(content, levelIndex, round));
  problems.push(...infraProblems(content, round.existingInfrastructure));
  const budget = content.levels[levelIndex].budget;
  if (budget !== undefined && !(Number.isInteger(budget) && budget > 0)) {
    problems.push({ code: 'MISSING_FIELD', message: `level "${content.levels[levelIndex].id}" has an invalid "budget" (funding per demand, in ten-thousandths)` });
  }
  if (!Array.isArray(round.hints) || round.hints.length !== 2 || !round.hints.every(isStr)) {
    problems.push({ code: 'MISSING_FIELD', message: 'round needs two hints: the method, then a worked step' });
  }
  if (problems.length === 0) {
    const offered = displayed.filter((m) => requestModel(round.request) !== 'service-area' || m.serviceArea);
    if (!offered.some((m) => CLASS_RANK[m.class] >= CLASS_RANK[round.request.class])) {
      problems.push({ code: 'CLASS_NOT_CARRIED', message: `no offered medium carries ${round.request.class} messages` });
    }
    const analysis = analyzeRound(content, roundId);
    if (!analysis.ok) {
      problems.push(...analysis.problems);
    } else if (budget !== undefined) {
      // The funding must always cover the cheapest working option, or the demand could never be served.
      const cheapest = analysis.perMedium.find((r) => r.id === analysis.expected);
      if (cheapest.cost > budget) {
        problems.push({ code: 'BUDGET_TOO_SMALL', message: `the cheapest working option (${cheapest.name}) costs more than the funding for this demand` });
      }
    }
  }
  return { ok: problems.length === 0, errors: problems.map((p) => ({ roundId, ...p })) };
}

// Release readiness: checked by the tests, never at load, so partial content can be
// played while it is being built.
export function checkReleaseReadiness(content) {
  const problems = [];
  if (content.levels.length !== 3) {
    problems.push({ code: 'LEVEL_COUNT', message: `the game has ${content.levels.length} levels; it needs three` });
  }
  for (const source of content.sources) {
    if (source.required && !(isStr(source.url) && isStr(source.section))) {
      problems.push({ code: 'SOURCE_NOT_LOCATED', message: `no link and section yet for "${source.title}"` });
    }
  }
  for (const level of content.levels) {
    if ((level.rounds || []).length !== 2) {
      problems.push({ code: 'ROUND_COUNT', message: `level "${level.id}" has ${(level.rounds || []).length} rounds; every level needs exactly two` });
    }
  }
  return { ready: problems.length === 0, problems };
}
