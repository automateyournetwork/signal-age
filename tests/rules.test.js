// Rule cases. Every expected value below is copied by hand from the
// "Cases the implementation must satisfy" table and the hand-checked examples
// in StarterKit/SPEC.md. None is computed by the code under test.
import { describe, it, assert, assertEqual } from './harness.js';
import { evaluate } from '../engine/rules.js';
import { loadJson, singleRound, LEVEL1_MEDIA, seconds } from './support.js';

const base = await loadJson('../data/levels.json');

const row = (result, id) => result.evidence.perMedium.find((m) => m.id === id);

// Level 1 Round 1: alert, 25 km, deadline 1 hour, lead time 12 months, Level 1 media.
const l1r1 = singleRound(base, {
  media: LEVEL1_MEDIA,
  request: { distanceKm: 25, class: 'alert', deadline: { value: 1, unit: 'hour' }, leadMonths: 12, circuits: 1 },
});

describe('rules · Level 1 Round 1 (SPEC "Correct" and "Plausible mistake")', () => {
  it('[R1] smoke beacon is correct, is the expected answer, and costs 3', () => {
    const r = evaluate(l1r1, 'test-round', 'smoke-beacon');
    assertEqual(r.status, 'correct', 'status');
    assertEqual(r.reasonCode, 'OK', 'reasonCode');
    assertEqual(r.expected, 'smoke-beacon', 'expected');
    assertEqual(row(r, 'smoke-beacon').cost, 30000, 'cost 3 in ten-thousandths');
    assertEqual(row(r, 'smoke-beacon').feasible, true, 'feasible');
  });

  it('[R2] horse relay is incorrect: too slow, 3 h needed against a 1 h deadline', () => {
    const r = evaluate(l1r1, 'test-round', 'horse-relay');
    assertEqual(r.status, 'incorrect', 'status');
    assertEqual(r.reasonCode, 'TOO_SLOW', 'reasonCode');
    assertEqual(r.expected, 'smoke-beacon', 'expected');
    const horse = row(r, 'horse-relay');
    assertEqual(seconds(horse.deliveryTime), 10800, '25 km ÷ 200 km/day = 3 h = 10,800 s');
    assertEqual(seconds(horse.deadline), 3600, 'deadline 1 h');
    assertEqual(horse.failedChecks, ['TOO_SLOW'], 'only the deadline fails');
    assertEqual(horse.cost, 80000, 'cost 8');
  });

  it('[R3] every other Level 1 medium fails for the documented reason', () => {
    const r = evaluate(l1r1, 'test-round', 'smoke-beacon');
    assertEqual(row(r, 'spoken-word').failedChecks, ['OUT_OF_REACH'], 'spoken word reaches 0.1 km');
    assertEqual(row(r, 'signal-drum').failedChecks, ['OUT_OF_REACH'], 'drum reaches 5 km');
    assertEqual(row(r, 'foot-courier').failedChecks, ['TOO_SLOW'], 'courier needs 15 h');
    assertEqual(seconds(row(r, 'foot-courier').deliveryTime), 54000, '25 ÷ 40 km/day = 0.625 day = 54,000 s');
  });

  it('[R4] no selection is invalid input with NO_SELECTION', () => {
    const r = evaluate(l1r1, 'test-round', null);
    assertEqual(r.status, 'invalid-input', 'status');
    assertEqual(r.reasonCode, 'NO_SELECTION', 'reasonCode');
  });

  it('[R5] an id that is not offered is invalid input, not a wrong answer', () => {
    const r = evaluate(l1r1, 'test-round', 'not-a-medium');
    assertEqual(r.status, 'invalid-input', 'status');
    assertEqual(r.reasonCode, 'NOT_OFFERED', 'reasonCode');
  });

  it('[R6] the shipped Level 1 Round 1 grades smoke beacon correct and horse relay too slow', () => {
    assertEqual(evaluate(base, 'l1-r1', 'smoke-beacon').status, 'correct');
    assertEqual(evaluate(base, 'l1-r1', 'horse-relay').reasonCode, 'TOO_SLOW');
  });

  it('[R7] grading is deterministic: the same inputs give the same result', () => {
    const a = JSON.stringify(evaluate(l1r1, 'test-round', 'horse-relay'));
    const b = JSON.stringify(evaluate(l1r1, 'test-round', 'horse-relay'));
    assert(a === b, 'two evaluations differ');
  });
});

// ---------------- Slice 2: the rest of the Levels 1–2 rule ----------------
import { LEVEL2_MEDIA } from './support.js';

const L12 = [...LEVEL1_MEDIA, ...LEVEL2_MEDIA];
const grade = (media, request, choice, infra) => evaluate(singleRound(base, { media, request, infra }), 'test-round', choice);

describe('rules · reach boundaries (SPEC "Boundary (reach)")', () => {
  it('[R10] alert at exactly 30 km: smoke beacon is correct (equality is allowed)', () => {
    const r = grade(LEVEL1_MEDIA, { distanceKm: 30, class: 'alert', deadline: { value: 1, unit: 'hour' }, leadMonths: 12, circuits: 1 }, 'smoke-beacon');
    assertEqual(r.status, 'correct');
  });
  it('[R11] alert at 31 km: smoke beacon is out of reach; with Level 2 media and 24 months the optical telegraph (12) is correct', () => {
    // With Level 1 media alone nothing is feasible at 31 km, so the case uses Level 1–2 media and a 24-month lead time.
    const r = grade(L12, { distanceKm: 31, class: 'alert', deadline: { value: 1, unit: 'hour' }, leadMonths: 24, circuits: 1 }, 'smoke-beacon');
    assertEqual(r.status, 'incorrect');
    assertEqual(r.reasonCode, 'OUT_OF_REACH');
    assertEqual(r.expected, 'optical-telegraph');
    assertEqual(row(r, 'optical-telegraph').cost, 120000, 'semaphore towers 10 + technology 2');
    assertEqual(row(r, 'optical-telegraph').totalBuildMonths, 24, '24 months');
  });
});

describe('rules · deadline and lead-time boundaries', () => {
  it('[R12] text, 200 km, deadline exactly 24 h, Level 1 media: horse relay is correct (200 ÷ 200 km/day = 24 h)', () => {
    const r = grade(LEVEL1_MEDIA, { distanceKm: 200, class: 'text', deadline: { value: 24, unit: 'hour' }, leadMonths: 12, circuits: 1 }, 'horse-relay');
    assertEqual(r.status, 'correct');
    assertEqual(seconds(row(r, 'horse-relay').deliveryTime), 86400, 'exactly 24 h');
    assertEqual(row(r, 'foot-courier').failedChecks, ['TOO_SLOW'], 'foot courier needs 120 h');
    assertEqual(seconds(row(r, 'foot-courier').deliveryTime), 432000, '120 h');
  });
  it('[R13] text, 100 km, deadline 24 h, lead exactly 6 months: horse relay is correct (build time equals lead time)', () => {
    const r = grade(L12, { distanceKm: 100, class: 'text', deadline: { value: 24, unit: 'hour' }, leadMonths: 6, circuits: 1 }, 'horse-relay');
    assertEqual(r.status, 'correct');
    assertEqual(row(r, 'horse-relay').totalBuildMonths, 6);
  });
  it('[R14] text, 100 km, deadline 5 days, lead 3 months: electric telegraph is not ready; foot courier (4) is correct', () => {
    const r = grade(L12, { distanceKm: 100, class: 'text', deadline: { value: 5, unit: 'day' }, leadMonths: 3, circuits: 1 }, 'electric-telegraph');
    assertEqual(r.status, 'incorrect');
    assertEqual(r.reasonCode, 'NOT_READY');
    assertEqual(row(r, 'electric-telegraph').failedChecks, ['NOT_READY'], 'only build time fails');
    assertEqual(row(r, 'electric-telegraph').totalBuildMonths, 36);
    assertEqual(r.expected, 'foot-courier');
    assertEqual(seconds(row(r, 'foot-courier').deliveryTime), 216000, '100 ÷ 40 km/day = 2.5 days');
  });
});

describe('rules · plant versus technology (SPEC hand-checked Level 2 examples)', () => {
  const voice = (circuits, leadMonths = 60) => ({ distanceKm: 300, class: 'live-voice', deadline: { value: 1, unit: 'second' }, leadMonths, circuits });
  it('[R15] nothing installed, 20 circuits: T1 correct at 35 (39 months); T3 45 (51 months); analog carrier fails capacity', () => {
    const r = grade(L12, voice(20), 't1');
    assertEqual(r.status, 'correct');
    assertEqual([row(r, 't1').cost, row(r, 't1').totalBuildMonths], [350000, 39]);
    assertEqual([row(r, 't3').cost, row(r, 't3').totalBuildMonths], [450000, 51]);
    assertEqual(row(r, 'analog-carrier').failedChecks, ['CAPACITY_TOO_LOW'], '12 < 20 circuits');
  });
  it('[R16] copper plant installed: T1 pays technology only, 20 and 3 months; correct', () => {
    const r = grade(L12, voice(20), 't1', { assets: ['copper-plant'] });
    assertEqual(r.status, 'correct');
    const t1 = row(r, 't1');
    assertEqual([t1.plantCost, t1.technologyCost, t1.cost, t1.totalBuildMonths], [0, 200000, 200000, 3]);
    assertEqual(row(r, 't3').cost, 450000, 'T3 still 45');
  });
  it('[R17] dark fiber installed: T3 pays technology only, 20 and 3 months; correct; T1 still 35', () => {
    const r = grade(L12, voice(20), 't3', { assets: ['dark-fiber'] });
    assertEqual(r.status, 'correct');
    assertEqual([row(r, 't3').cost, row(r, 't3').totalBuildMonths], [200000, 3]);
    assertEqual([row(r, 't1').cost, row(r, 't1').totalBuildMonths], [350000, 39]);
  });
  it('[R18] copper and dark fiber both installed: T1 and T3 both cost 20, a cost tie and a content error', () => {
    const r = grade(L12, voice(20), 't1', { assets: ['copper-plant', 'dark-fiber'] });
    assertEqual(r.status, 'content-error');
    assertEqual(r.reasonCode, 'COST_TIE');
  });
  it('[R19] 1,000 circuits, dark fiber, lead exactly 3 months: OC-3 correct at 30; OC-12 feasible but costlier at 45, same 3 months', () => {
    const ok = grade(L12, voice(1000, 3), 'oc-3', { assets: ['dark-fiber'] });
    assertEqual(ok.status, 'correct', 'lead-time boundary: 3 months ≤ 3 months');
    const r = grade(L12, voice(1000, 3), 'oc-12', { assets: ['dark-fiber'] });
    assertEqual(r.status, 'incorrect');
    assertEqual(r.reasonCode, 'FEASIBLE_BUT_COSTLIER');
    assertEqual([row(r, 'oc-3').cost, row(r, 'oc-12').cost, row(r, 'oc-48').cost], [300000, 450000, 650000]);
    assertEqual([row(r, 'oc-3').totalBuildMonths, row(r, 'oc-12').totalBuildMonths, row(r, 'oc-48').totalBuildMonths], [3, 3, 3], 'higher rate, same build time');
    assertEqual(row(r, 't3').failedChecks, ['CAPACITY_TOO_LOW'], '672 < 1,000');
  });
  it('[R20] lit SONET installed, 1,000 circuits: OC-3 costs 30 × 50% = 15, still 3 months', () => {
    const r = grade(L12, voice(1000), 'oc-3', { assets: ['lit-sonet-fiber'] });
    assertEqual(r.status, 'correct');
    assertEqual([row(r, 'oc-3').technologyCost, row(r, 'oc-3').cost, row(r, 'oc-3').totalBuildMonths], [150000, 150000, 3]);
  });
  it('[R21] 40 circuits, nothing installed: T1 fails capacity (24 < 40); T3 (672) is correct at 45', () => {
    const r = grade(L12, voice(40), 't1');
    assertEqual(r.reasonCode, 'CAPACITY_TOO_LOW');
    assertEqual(r.expected, 't3');
  });
});

describe('rules · propagation delivery time', () => {
  it('[R22] data over 15,000 km: T3 takes 75 ms (15,000 ÷ 200,000 km/s) and meets a 100 ms deadline', () => {
    const r = grade(L12, { distanceKm: 15000, class: 'data', deadline: { value: 100, unit: 'ms' }, leadMonths: 60, circuits: 1 }, 't3');
    assertEqual(row(r, 't3').deliveryTime, { num: 3, den: 40 }, '0.075 s exactly');
    assertEqual(row(r, 't3').checks.delivery.ok, true);
    assertEqual(r.expected, 't1', 'T1 (35) is the cheapest data medium here');
  });
});

// ---------------- Slice 5: Level 3 service areas (SPEC Level 3 hand-checked examples) ----------------
import { LEVEL3_MEDIA } from './support.js';

const L123 = [...LEVEL1_MEDIA, ...LEVEL2_MEDIA, ...LEVEL3_MEDIA];
const area = (request, infra) => singleRound(base, { media: L123, request: { class: 'data', leadMonths: 60, ...request }, infra });
const grade3 = (request, choice, infra) => evaluate(area(request, infra), 'test-round', choice);
const SPARSE = { routeKm: 400, areaKm2: 40000, population: 1500, perUserMbps: 5, mobile: false, flat: true };
const RURAL = { routeKm: 150, areaKm2: 5000, population: 4000, perUserMbps: 25, mobile: false, flat: true };
const DENSE = { routeKm: 10, areaKm2: 50, population: 200000, perUserMbps: 100, mobile: false, flat: true };
const UPGRADE = { routeKm: 60, areaKm2: 2000, population: 10000, perUserMbps: 40, mobile: false, flat: true };

describe('rules · Level 3 topology cases', () => {
  it('[R30] remote and sparse: LEO is correct at 400 (100 + 0.2 × 1,500)', () => {
    const r = grade3(SPARSE, 'leo-satellite');
    assertEqual(r.status, 'correct');
    assertEqual(row(r, 'leo-satellite').cost, 4000000, 'LEO 400');
    assertEqual(row(r, 'ethernet-fiber').cost, 20075000, 'fiber 2,007.5');
    assertEqual(row(r, 'broadband-3g').cost, 6000000, '3G 12 × 50 = 600');
    assertEqual(row(r, 'lte-4g').cost, 10050000, '4G 15 × 67 = 1,005');
    assertEqual(row(r, 'fixed-wireless').cost, 11600000, 'fixed wireless 20 × 58 = 1,160');
    assertEqual(row(r, 'midband-5g').cost, 66750000, '5G 25 × 267 = 6,675');
    assertEqual(row(r, 'cellular-2g').failedChecks, ['USER_SPEED_TOO_LOW'], '2G 0.2 < 5 Mbps');
  });
  it('[R31] rural flat: fixed wireless is correct at 160 (8 towers); 3G fails per-user speed (10 < 25)', () => {
    const r = grade3(RURAL, 'fixed-wireless');
    assertEqual(r.status, 'correct');
    assertEqual([row(r, 'fixed-wireless').cost, row(r, 'fixed-wireless').towers], [1600000, 8]);
    assertEqual([row(r, 'lte-4g').cost, row(r, 'midband-5g').cost, row(r, 'leo-satellite').cost, row(r, 'ethernet-fiber').cost], [5100000, 8500000, 9000000, 7700000]);
    assertEqual(grade3(RURAL, 'broadband-3g').reasonCode, 'USER_SPEED_TOO_LOW');
  });
  it('[R32] same area with mobile users: fixed wireless and fiber are excluded; 4G is correct at 510', () => {
    const mobile = { ...RURAL, mobile: true };
    assertEqual(grade3(mobile, 'fixed-wireless').reasonCode, 'NOT_MOBILE');
    assertEqual(grade3(mobile, 'ethernet-fiber').reasonCode, 'NOT_MOBILE');
    assertEqual(grade3(mobile, 'lte-4g').status, 'correct');
  });
  it('[R33] dense city: fiber is correct at 1,050; LEO is excluded by the density cap', () => {
    const r = grade3(DENSE, 'ethernet-fiber');
    assertEqual(r.status, 'correct');
    assertEqual(row(r, 'ethernet-fiber').cost, 10500000, 'fiber 50 + 1,000');
    assertEqual([row(r, 'fixed-wireless').cost, row(r, 'midband-5g').cost], [100000000, 166750000], 'fixed wireless 10,000; 5G 16,675');
    assertEqual(row(r, 'leo-satellite').failedChecks[0], 'OVER_DENSITY_CAP');
  });
  it('[R34] density exactly 50 people/km² is allowed: LEO is feasible', () => {
    const r = grade3({ routeKm: 100, areaKm2: 100, population: 5000, perUserMbps: 5, mobile: false, flat: true }, 'leo-satellite');
    assertEqual(row(r, 'leo-satellite').feasible, true);
  });
  it('[R35] the 60 km example: fixed wireless 200 (10 towers); ducts only keeps it correct (fiber 260)', () => {
    assertEqual(grade3(UPGRADE, 'fixed-wireless').status, 'correct');
    assertEqual(row(grade3(UPGRADE, 'fixed-wireless'), 'fixed-wireless').cost, 2000000);
    assertEqual(row(grade3(UPGRADE, 'ethernet-fiber'), 'ethernet-fiber').cost, 3500000, 'fiber 350, 51 months');
    const ducts = grade3(UPGRADE, 'fixed-wireless', { assets: ['ducts'] });
    assertEqual(ducts.status, 'correct');
    assertEqual(row(ducts, 'ethernet-fiber').cost, 2600000, 'fiber 3.5 × 60 + 50 = 260');
  });
  it('[R36] dark fiber: Ethernet pays technology only (50, 3 months); lit SONET halves it to 25: the upgrade in place', () => {
    const dark = grade3(UPGRADE, 'ethernet-fiber', { assets: ['dark-fiber'] });
    assertEqual(dark.status, 'correct');
    assertEqual([row(dark, 'ethernet-fiber').cost, row(dark, 'ethernet-fiber').totalBuildMonths], [500000, 3]);
    const lit = grade3(UPGRADE, 'ethernet-fiber', { assets: ['lit-sonet-fiber'] });
    assertEqual(lit.status, 'correct');
    assertEqual(row(lit, 'ethernet-fiber').cost, 250000, '25');
  });
  it('[R37] 10 tower sites standing: fixed wireless pays radios only, 120 and 6 months; correct ahead of fiber at 350', () => {
    const r = grade3(UPGRADE, 'fixed-wireless', { assets: ['tower-sites'], existingTowerSites: 10 });
    assertEqual(r.status, 'correct');
    assertEqual([row(r, 'fixed-wireless').cost, row(r, 'fixed-wireless').totalBuildMonths, row(r, 'fixed-wireless').newSites], [1200000, 6, 0]);
  });
  it('[R38] latency floor: over a 15,000 km route with a 100 ms deadline, geostationary (about 239 ms, path only) is late; fiber (75 ms) is feasible', () => {
    const r = grade3({ ...SPARSE, routeKm: 15000, deadline: { value: 100, unit: 'ms' } }, 'geo-satellite');
    assertEqual(r.status, 'incorrect');
    assertEqual(r.reasonCode, 'TOO_SLOW');
    assertEqual(row(r, 'geo-satellite').deliveryTime, { num: 35786000, den: 149896229 }, '71,572 km ÷ 299,792.458 km/s');
    assertEqual(row(r, 'ethernet-fiber').deliveryTime, { num: 3, den: 40 }, '75 ms');
    assertEqual(row(r, 'ethernet-fiber').checks.delivery.ok, true);
  });
  it('[R39] without a deadline, no delivery-time constraint applies (geostationary is not late, only costlier or not ready)', () => {
    const r = grade3({ ...SPARSE, routeKm: 15000 }, 'geo-satellite');
    assert(!row(r, 'geo-satellite').failedChecks.includes('TOO_SLOW'), JSON.stringify(row(r, 'geo-satellite').failedChecks));
  });
  it('[R40] an earlier-era medium in a Level 3 round is shown but not offered: choosing it is invalid input', () => {
    const r = grade3(SPARSE, 't3');
    assertEqual([r.status, r.reasonCode], ['invalid-input', 'NOT_OFFERED']);
    assertEqual(row(r, 't3').offered, false);
    assert(row(r, 't3').deliveryTime, 'still has a delivery time for the comparison table');
  });
});
