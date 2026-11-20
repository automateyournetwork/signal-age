// Content validation: authored data is checked before any round is played.
import { describe, it, assert, assertEqual } from './harness.js';
import { validateContent, validateRound } from '../engine/content.js';
import { createSession, reduce, totals } from '../engine/state.js';
import { loadJson, clone, singleRound, LEVEL1_MEDIA } from './support.js';

const base = await loadJson('../data/levels.json');

const l1Request = { distanceKm: 25, class: 'alert', deadline: { value: 1, unit: 'hour' }, leadMonths: 12, circuits: 1 };

describe('content · Slice 1 validation', () => {
  it('[C1] the shipped data file has no file-level errors and Level 1 Round 1 validates', () => {
    const v = validateContent(base);
    assertEqual(v.fileErrors, [], 'file errors');
    assertEqual(v.rounds['l1-r1'].ok, true, `l1-r1 errors: ${JSON.stringify(v.rounds['l1-r1'].errors)}`);
  });

  it('[C2] a missing request field disables only that round with a content error naming it', () => {
    const broken = singleRound(base, { media: LEVEL1_MEDIA, request: l1Request });
    delete broken.levels[0].rounds[0].request.distanceKm;
    const v = validateRound(broken, 'test-round');
    assertEqual(v.ok, false, 'invalid');
    assert(v.errors.some((e) => e.code === 'MISSING_FIELD' && e.roundId === 'test-round'), JSON.stringify(v.errors));
    assertEqual(validateContent(broken).fileErrors, [], 'not a file-level error');
  });

  it('[C3] an unknown medium id disables the round with UNKNOWN_REF', () => {
    const broken = singleRound(base, { media: [...LEVEL1_MEDIA, 'no-such-medium'], request: l1Request });
    const v = validateRound(broken, 'test-round');
    assertEqual(v.ok, false, 'invalid');
    assert(v.errors.some((e) => e.code === 'UNKNOWN_REF'), JSON.stringify(v.errors));
  });

  it('[C4] a duplicate id is a file-level error that stops the game', () => {
    const broken = clone(base);
    broken.media.push(clone(broken.media[0]));
    const v = validateContent(broken);
    assert(v.fileErrors.some((e) => e.code === 'DUPLICATE_ID'), JSON.stringify(v.fileErrors));
  });

  it('[C5] a wrong schemaVersion is a file-level error', () => {
    const broken = clone(base);
    broken.schemaVersion = 99;
    assert(validateContent(broken).fileErrors.some((e) => e.code === 'SCHEMA_VERSION'));
  });

  it('[C6] building and running the clock in a round with a content error counts and spends nothing', () => {
    const broken = singleRound(base, { media: LEVEL1_MEDIA, request: l1Request });
    delete broken.levels[0].rounds[0].request.distanceKm;
    let s = createSession(broken);
    for (const action of [{ type: 'START' }, { type: 'SELECT', mediumId: 'smoke-beacon' }, { type: 'BUILD' }, { type: 'TICK', months: 3 }, { type: 'SKIP' }]) {
      s = reduce(s, action, broken);
    }
    assertEqual(totals(s), { completed: 0, attempts: 0, assistance: 0 }, 'counts');
    assertEqual(s.rounds, {}, 'nothing built, nothing spent, the clock never moved');
  });

  it('[C34] funding that cannot pay for the cheapest working option is a content error for that round', () => {
    const poor = singleRound(base, { media: LEVEL1_MEDIA, request: l1Request });
    poor.levels[0].budget = 20000;   // the smoke beacon costs 30000
    const v = validateContent(poor);
    assertEqual(v.fileErrors, [], 'not a file-level error');
    const errors = Object.values(v.rounds).flatMap((r) => r.errors).map((e) => e.code);
    assert(errors.includes('BUDGET_TOO_SMALL'), JSON.stringify(errors));
    const exact = singleRound(base, { media: LEVEL1_MEDIA, request: l1Request });
    exact.levels[0].budget = 30000;  // equality counts: exactly the cheapest working cost is enough
    assert(validateContent(exact).ok, JSON.stringify(validateContent(exact).rounds));
  });

  it('[C35] a budget that is not a positive whole number of ten-thousandths is a content error', () => {
    for (const bad of [0, -5, 1.5, '20']) {
      const broken = singleRound(base, { media: LEVEL1_MEDIA, request: l1Request });
      broken.levels[0].budget = bad;
      const codes = Object.values(validateContent(broken).rounds).flatMap((r) => r.errors).map((e) => e.code);
      assert(codes.includes('MISSING_FIELD'), `${JSON.stringify(bad)}: ${JSON.stringify(codes)}`);
    }
  });
});

// ---------------- Slice 2: content errors (T038) ----------------
import { LEVEL2_MEDIA } from './support.js';

const L12 = [...LEVEL1_MEDIA, ...LEVEL2_MEDIA];
const voice20 = { distanceKm: 300, class: 'live-voice', deadline: { value: 1, unit: 'second' }, leadMonths: 60, circuits: 20 };

describe('content · Slice 2 authoring errors', () => {
  it('[C10] a cost tie among the two cheapest feasible media disables the round (COST_TIE)', () => {
    const c = singleRound(base, { media: L12, request: voice20, infra: { assets: ['copper-plant', 'dark-fiber'] } });
    assert(validateRound(c, 'test-round').errors.some((e) => e.code === 'COST_TIE'));
  });
  it('[C11] a displayed medium missing a required field disables the round (MISSING_FIELD)', () => {
    const c = singleRound(base, { media: L12, request: voice20 });
    delete c.media.find((m) => m.id === 'telephone-line').technology;
    assert(validateRound(c, 'test-round').errors.some((e) => e.code === 'MISSING_FIELD'));
  });
  it('[C12] a round with no feasible medium is an authoring error (NO_FEASIBLE_MEDIUM)', () => {
    const c = singleRound(base, { media: LEVEL1_MEDIA, request: { distanceKm: 31, class: 'alert', deadline: { value: 1, unit: 'hour' }, leadMonths: 12, circuits: 1 } });
    assert(validateRound(c, 'test-round').errors.some((e) => e.code === 'NO_FEASIBLE_MEDIUM'));
  });
  it('[C13] a request class no offered medium carries is an authoring error (CLASS_NOT_CARRIED)', () => {
    const c = singleRound(base, { media: LEVEL1_MEDIA, request: { distanceKm: 10, class: 'data', deadline: { value: 1, unit: 'hour' }, leadMonths: 12, circuits: 1 } });
    assert(validateRound(c, 'test-round').errors.some((e) => e.code === 'CLASS_NOT_CARRIED'));
  });
  it('[C14] a settlement that shrinks in a later round disables that round (TIER_DECREASE)', () => {
    const c = singleRound(base, { media: LEVEL1_MEDIA, request: { distanceKm: 25, class: 'alert', deadline: { value: 1, unit: 'hour' }, leadMonths: 12, circuits: 1 } });
    const later = clone(c.levels[0].rounds[0]);
    later.id = 'test-round-2';
    later.growth.settlements[0].tier = 'hamlet'; // was village
    c.levels[0].rounds.push(later);
    assertEqual(validateRound(c, 'test-round').ok, true, 'first round is fine');
    assert(validateRound(c, 'test-round-2').errors.some((e) => e.code === 'TIER_DECREASE'));
  });
  it('[C15] a medium that names an unknown plant disables the round (UNKNOWN_REF)', () => {
    const c = singleRound(base, { media: L12, request: voice20 });
    c.media.find((m) => m.id === 't1').plant = 'no-such-plant';
    assert(validateRound(c, 'test-round').errors.some((e) => e.code === 'UNKNOWN_REF'));
  });
});

// ---------------- Slice 3: shipped rounds, trial request, release readiness ----------------
import { checkReleaseReadiness } from '../engine/content.js';
import { evaluate } from '../engine/rules.js';

describe('content · Slice 3', () => {
  it('[C20] every shipped round validates, and no settlement tier ever decreases', () => {
    const v = validateContent(base);
    assertEqual(v.fileErrors, []);
    for (const [id, r] of Object.entries(v.rounds)) assertEqual(r.errors, [], `round ${id}`);
  });

  it('[C21] SC-005: a trial request added through data alone is graded correctly with no engine change', () => {
    const trial = clone(base);
    const level2 = trial.levels[1];
    const round = clone(level2.rounds[1]);
    round.id = 'trial-round';
    // Voice, 300 km, 40 circuits, nothing installed: T1 fails capacity; T3 (45) is the cheapest feasible (SPEC "Capacity too low").
    round.request = { ...round.request, circuits: 40 };
    round.existingInfrastructure = { assets: [], existingTowerSites: 0 };
    level2.rounds.push(round);
    assertEqual(validateRound(trial, 'trial-round').ok, true, JSON.stringify(validateRound(trial, 'trial-round').errors));
    assertEqual(evaluate(trial, 'trial-round', 't3').status, 'correct');
    assertEqual(evaluate(trial, 'trial-round', 't1').reasonCode, 'CAPACITY_TOO_LOW');
  });

  it('[C22] release readiness: every authored level has exactly two rounds', () => {
    const ok = checkReleaseReadiness(base);
    assert(!ok.problems.some((p) => p.code === 'ROUND_COUNT'), JSON.stringify(ok.problems));
    const short = clone(base);
    short.levels[0].rounds.pop();
    assert(checkReleaseReadiness(short).problems.some((p) => p.code === 'ROUND_COUNT'), 'one-round level not flagged');
  });
});

// ---------------- Slice 5: Level 3 validation and release readiness ----------------
describe('content · Slice 5', () => {
  it('[C30] a Level 3 request missing a service-area field disables the round', () => {
    const c = clone(base);
    const l3 = c.levels[2];
    delete l3.rounds[0].request.population;
    assert(validateRound(c, l3.rounds[0].id).errors.some((e) => e.code === 'MISSING_FIELD'));
  });
  it('[C31] release readiness flags a required claim whose source has no link and section', () => {
    const c = clone(base);
    for (const s of c.sources) { s.url = 'https://example.org/source'; s.section = '§1'; }
    assertEqual(checkReleaseReadiness(c).ready, true, JSON.stringify(checkReleaseReadiness(c).problems));
    c.sources[0].url = null;
    assert(checkReleaseReadiness(c).problems.some((p) => p.code === 'SOURCE_NOT_LOCATED'));
  });
  it('[C32] release readiness: the game has three levels', () => {
    const c = clone(base);
    c.levels.pop();
    assert(checkReleaseReadiness(c).problems.some((p) => p.code === 'LEVEL_COUNT'));
  });
  it('[C33] RELEASE CHECK (expected to fail until sources are found): every physical limit, standard rate and history anchor in the shipped data cites a source', () => {
    const r = checkReleaseReadiness(base);
    assert(r.ready, `${r.problems.length} release problems: ${r.problems.map((p) => p.message).join('; ')}`);
  });
});
