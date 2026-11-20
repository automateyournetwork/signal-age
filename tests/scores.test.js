// Display scores and units, from the "Score:" cases in StarterKit/SPEC.md. Scores are display-only.
import { describe, it, assert, assertEqual } from './harness.js';
import { describeLatency, describeCapacity, describeDuration, describeRate } from '../engine/scores.js';
import { deliveryTime, evaluate, ratToNumber, mediumById } from '../engine/rules.js';
import { loadJson, loadText, singleRound, LEVEL1_MEDIA, LEVEL2_MEDIA } from './support.js';

const base = await loadJson('../data/levels.json');
const m = (id) => mediumById(base, id);
const latency = (id, km) => describeLatency(ratToNumber(deliveryTime(m(id), km)));

describe('scores · SPEC score cases (Levels 1–2 media)', () => {
  it('[X1] foot courier over 1,000 km: about 25 days, shown as 3.6 weeks, latency score 0.7', () => {
    const d = latency('foot-courier', 1000);
    assertEqual(d.seconds, 2160000, '25 days');
    assertEqual([d.text, d.band, d.score], ['3.6 weeks', 'weeks', 0.7]);
  });
  it('[X2] telephone line: 64 kbps, capacity score 5.8', () => {
    const c = describeCapacity(m('telephone-line'), 0);
    assertEqual([c.text, c.band, c.score], ['64 kbps', 'kbps', 5.8]);
  });
  it('[X3] horse relay over 25 km: 3 hours, score 3.0; capacity about 93 bps, score 3.0', () => {
    const d = latency('horse-relay', 25);
    assertEqual([d.text, d.band, d.score], ['3 hours', 'hours', 3]);
    const c = describeCapacity(m('horse-relay'), d.seconds);
    assertEqual([c.text, c.band, c.score], ['92.6 bps', 'bps', 3]);
  });
  it('[X4] T3 over 15,000 km: 75 ms, latency score 8.1', () => {
    const d = latency('t3', 15000);
    assertEqual([d.text, d.band, d.score], ['75 ms', 'ms', 8.1]);
  });
  it('[X5] instant media read "under 1 second" with score 10', () => {
    const d = latency('smoke-beacon', 25);
    assertEqual([d.text, d.band, d.score], ['under 1 second', 'instant', 10]);
  });
});

describe('scores · units and band labels', () => {
  it('[X6] duration units switch at the documented boundaries', () => {
    const day = 86400;
    assertEqual(describeDuration(13 * day).text, '13 days');
    assertEqual(describeDuration(14 * day).text, '2 weeks', 'weeks from 14 days');
    assertEqual(describeDuration(59 * day).band, 'weeks');
    assertEqual(describeDuration(60 * day).text, '2 months', 'months from 60 days, counted as 30 days');
    assertEqual(describeDuration(90).text, '1.5 minutes');
    assertEqual(describeDuration(0.2387).text, '239 ms');
  });
  it('[X7] rates scale from bps to Gbps', () => {
    assertEqual(describeRate(0.05).text, '0.05 bps');
    assertEqual(describeRate(1544000).text, '1.54 Mbps');
    assertEqual(describeRate(2488320000).text, '2.488 Gbps');
    assertEqual(describeRate(2488320000).band, 'Gbps');
  });
  it('[X8] a courier\'s capacity falls as the trip gets longer', () => {
    const short = describeCapacity(m('foot-courier'), ratToNumber(deliveryTime(m('foot-courier'), 10)));
    const long = describeCapacity(m('foot-courier'), ratToNumber(deliveryTime(m('foot-courier'), 1000)));
    assert(long.bps < short.bps, `${long.bps} should be below ${short.bps}`);
  });
});

describe('scores · cannot influence grading', () => {
  it('[X9] engine/rules.js imports nothing, so no score function can reach grading', async () => {
    const source = await loadText('../engine/rules.js');
    assert(!/^\s*import\s/m.test(source), 'rules.js has an import statement');
    assert(!/scores/.test(source.replace(/\/\/.*$/gm, '')), 'rules.js mentions scores outside comments');
  });
  it('[X10] grading results carry no score fields', () => {
    const content = singleRound(base, { media: [...LEVEL1_MEDIA, ...LEVEL2_MEDIA], request: { distanceKm: 300, class: 'live-voice', deadline: { value: 1, unit: 'second' }, leadMonths: 60, circuits: 20 } });
    const json = JSON.stringify(evaluate(content, 'test-round', 't1'));
    assert(!/score/i.test(json), 'evaluate output mentions a score');
  });
});

describe('scores · Level 3', () => {
  it('[X11] geostationary path (71,572 km at light speed): about 239 ms, latency score 7.6', () => {
    const d = describeLatency(ratToNumber(deliveryTime(m('geo-satellite'), 15000)));
    assertEqual([d.text, d.band, d.score], ['239 ms', 'ms', 7.6]);
  });
  it('[X12] LEO path (about 1,100 km): about 3.7 ms', () => {
    assertEqual(describeLatency(ratToNumber(deliveryTime(m('leo-satellite'), 400))).text, '3.7 ms');
  });
  it('[X13] Level 3 media show peak per-user speed as capacity: fiber 1 Gbps scores 10, 4G 100 Mbps scores 9', () => {
    assertEqual([describeCapacity(m('ethernet-fiber'), 0).text, describeCapacity(m('ethernet-fiber'), 0).score], ['1 Gbps', 10]);
    assertEqual([describeCapacity(m('lte-4g'), 0).text, describeCapacity(m('lte-4g'), 0).score], ['100 Mbps', 9]);
  });
});
