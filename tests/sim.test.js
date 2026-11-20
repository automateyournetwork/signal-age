// The simulation (engine/sim.js) must never disagree with the evaluator: building a technology at
// month 0 serves the demand exactly when the evaluator calls that technology feasible.
import { describe, it, assert, assertEqual } from './harness.js';
import { analyzeRound } from '../engine/rules.js';
import { FUNCTIONAL_CHECKS, buildFacts, demandOf, levelBudget, resolveBuilds } from '../engine/sim.js';
import { buildPreview, noticeText, outcomeReport } from '../engine/feedback.js';
import { clone, loadJson } from './support.js';

const content = await loadJson('../data/levels.json');
const roundIds = content.levels.flatMap((l) => l.rounds.map((r) => r.id));
const at = (mediumId, startMonth = 0) => ({ mediumId, startMonth });

describe('sim · agreement with the evaluator', () => {
  it('[M1] built alone in month 0, a technology carries the demand exactly when the evaluator calls it feasible, and completes it only if it is the evaluator\'s answer', () => {
    for (const id of roundIds) {
      const analysis = analyzeRound(content, id);
      for (const row of analysis.perMedium.filter((r) => r.offered)) {
        const out = resolveBuilds(content, id, [at(row.id)]);
        const label = `${id} · ${row.id} (${row.failedChecks.join(',') || 'feasible'})`;
        assertEqual(out.status !== 'unserved', row.feasible, `carried: ${label}`);
        assertEqual(out.status === 'served', row.id === analysis.expected, `completes: ${label}`);
      }
    }
  });

  it('[M2] the cheapest working option the simulation reports is the evaluator\'s answer', () => {
    for (const id of roundIds) {
      const out = resolveBuilds(content, id, [at(analyzeRound(content, id).expected)]);
      assertEqual([out.status, out.servedBy, out.cheapest.mediumId, out.overspend], ['served', analyzeRound(content, id).expected, analyzeRound(content, id).expected, 0], id);
    }
  });

  it('[M3] every failed check except build time is a functional failure; build time is decided by the clock', () => {
    const seen = new Set();
    for (const id of roundIds) for (const r of analyzeRound(content, id).perMedium) r.failedChecks.forEach((c) => seen.add(c));
    for (const code of seen) assertEqual(FUNCTIONAL_CHECKS.includes(code), code !== 'NOT_READY', code);
  });
});

describe('sim · timing, money and several builds', () => {
  it('[M4] equality counts on lead time: ready in the arrival month serves, a month later does not', () => {
    // Level 1 Round 2: horse relay takes 6 months, the demand arrives in month 12.
    assertEqual(resolveBuilds(content, 'l1-r2', [at('horse-relay', 6)]).status, 'served', 'ready in month 12');
    const late = resolveBuilds(content, 'l1-r2', [at('horse-relay', 7)]);
    assertEqual([late.status, late.results[0].readyMonth, late.results[0].ready], ['unserved', 13, false], 'ready in month 13');
  });

  it('[M5] with several builds, the cheapest one that works carries the demand, every build is paid for, and the extra spending is over-building', () => {
    const out = resolveBuilds(content, 'l2-r1', [at('t1'), at('horse-relay'), at('electric-telegraph')]);
    assertEqual([out.status, out.servedBy], ['overbuilt', 'electric-telegraph'], 'carried by the cheapest working build, but over-built');
    assertEqual(out.spent, 350000 + 80000 + 170000, 'spent on all three');
    assertEqual(out.overspend, 350000 + 80000, 'beyond the cheapest working option');
  });

  it('[M6] C1/C3: a costlier working option carries the demand but does not complete it, and the feedback does not name the answer', () => {
    const out = resolveBuilds(content, 'l2-r1', [at('t1')]);
    assertEqual([out.status, out.spent, out.cheapest.mediumId, out.overspend], ['overbuilt', 350000, 'electric-telegraph', 180000]);
    const rep = outcomeReport(content, 'l2-r1', out);
    assertEqual(rep.kind, 'overbuilt');
    assert(/a cheaper network would also have worked/.test(rep.headline), rep.headline);
    assert(/Another technology also meets every constraint for less/.test(rep.nextStep), rep.nextStep);
    assert(!/Electric telegraph/.test([rep.headline, ...rep.details, rep.efficiency, rep.nextStep].join(' ')), 'the cheaper answer is not given away');
  });

  it('[M12] a served demand explains why its network is feasible and cheapest (C2)', () => {
    const rep = outcomeReport(content, 'l2-r1', resolveBuilds(content, 'l2-r1', [at('electric-telegraph')]));
    const text = rep.details.join(' ');
    assert(/reaches unlimited per link \(needs 150 km\)/.test(text), text);
    assert(/deadline 30 minutes/.test(text) && /ready in month 36, before the demand arrived in month 40/.test(text), text);
    assert(/every cheaper technology fails a check \(Spoken word \/ shout, cost 1: reach;/.test(text), text);
    assert(/T1 \(DS1\) 35, also works/.test(text), text);
    const l1 = outcomeReport(content, 'l1-r1', resolveBuilds(content, 'l1-r1', [at('smoke-beacon')])).details.join(' ');
    assert(/at 3: .*Horse relay 8/.test(l1), `AC2 compares 3 with Horse relay's 8: ${l1}`);
    assert(/exactly the cost of the cheapest network that works/.test(rep.efficiency), rep.efficiency);
  });

  it('[M7] build facts come from the evaluator row; plant already in the ground shortens the build', () => {
    // Level 2 Round 2: copper plant is in the ground, so T1 needs only its technology time.
    const t1 = buildFacts(content, 'l2-r2', 't1');
    assertEqual([t1.plantMonths, t1.technologyMonths, t1.totalBuildMonths], [0, 3, 3], 'T1 on existing copper');
    assertEqual(buildFacts(content, 'l1-r1', 'telephone-line'), null, 'not offered in Level 1');
    assertEqual(buildFacts(content, 'l3-r1', 'smoke-beacon'), null, 'earlier media are comparison rows in Level 3');
  });

  it('[M8] the demand and the funding come from the authored data', () => {
    assertEqual([demandOf(content, 'l1-r1').leadMonths, demandOf(content, 'l1-r1').model], [12, 'single-link']);
    assertEqual(demandOf(content, 'l3-r2').model, 'service-area');
    assertEqual([levelBudget(content, 0), levelBudget(content, 1), levelBudget(content, 2)], [200000, 700000, 16000000]);
    const c = clone(content);
    delete c.levels[0].budget;
    assertEqual(levelBudget(c, 0), null, 'no budget means no limit');
  });
});

describe('sim · player-facing text', () => {
  it('[M9] the build preview shows numbers without a verdict', () => {
    const pv = buildPreview(content, 'l1-r1', 'horse-relay', 4);
    const text = pv.rows.map((r) => r.join(' ')).join(' | ');
    assert(/Ready if started now month 10/.test(text), text);
    assert(!/fails|too slow|correct|wrong|works/i.test(text), `a preview must not judge: ${text}`);
    assertEqual(pv.cost, 80000, 'cost');
  });

  it('[M10] the arrival report explains a late build with its months', () => {
    const out = resolveBuilds(content, 'l1-r2', [at('horse-relay', 7)]);
    const rep = outcomeReport(content, 'l1-r2', out);
    assertEqual(rep.kind, 'unserved');
    assert(/started in month 7 and would be ready in month 13; the demand arrived in month 12/.test(rep.headline), rep.headline);
    assert(/Start building earlier/.test(rep.nextStep), rep.nextStep);
  });

  it('[M11] guidance notices name the numbers they depend on', () => {
    assert(/costs 17 and only 5 is left/.test(noticeText(content, { code: 'NO_FUNDS', cost: 170000, treasury: 50000 })), 'funds');
    assert(/month 12/.test(noticeText(content, { code: 'NOTHING_BUILT', roundId: 'l1-r1' })), 'arrival month');
  });
});
