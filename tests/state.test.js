// Progress rules for the build-and-clock game (spec "Progress Rules", revised 2026-11-17) and AC1, AC3–AC8.
import { describe, it, assert, assertEqual } from './harness.js';
import { createSession, growthCaption, reduce, roundProgress, totals, treasury } from '../engine/state.js';
import { evaluate, findRound } from '../engine/rules.js';
import { loadJson } from './support.js';

const content = await loadJson('../data/levels.json');
const R1 = 'l1-r1';   // smoke beacon serves (1 month to build); the demand arrives in month 12
const R2 = 'l1-r2';   // horse relay serves (6 months to build); the demand arrives in month 12

const apply = (state, ...actions) => actions.reduce((s, a) => reduce(s, a, content), state);
const play = (...actions) => apply(createSession(content), ...actions);
const build = (mediumId) => [{ type: 'SELECT', mediumId }, { type: 'BUILD' }];
const SKIP = { type: 'SKIP' };
// Build one technology now, then run the clock to the demand's arrival.
const serve = (state, mediumId) => apply(state, ...build(mediumId), SKIP);
// Leave a solved round through the years-pass screen (and the era-advance screen and briefing).
function advance(state) {
  let s = apply(state, { type: 'NEXT' });
  if (s.view === 'transition') s = apply(s, { type: 'TRANSITION_DONE' });
  if (s.view === 'levelSummary') s = apply(s, { type: 'CONTINUE' }, { type: 'START' });
  return s;
}
const toRound2 = () => advance(serve(play({ type: 'START' }), 'smoke-beacon'));
const toLevel2 = () => advance(serve(toRound2(), 'horse-relay'));

describe('state · Slice 1 progress rules', () => {
  it('[S1] AC1: a fresh session opens on the first briefing; building and the clock do nothing there', () => {
    const s0 = createSession(content);
    assertEqual([s0.view, s0.levelIndex, s0.roundIndex], ['briefing', 0, 0], 'first briefing');
    for (const action of [{ type: 'SELECT', mediumId: 'smoke-beacon' }, { type: 'BUILD' }, { type: 'TICK', months: 3 }, SKIP]) {
      assertEqual(reduce(s0, action, content), s0, `${action.type} must be ignored on the briefing`);
    }
  });

  it('[S2] choosing a technology never builds it, spends money, moves the clock or counts an attempt', () => {
    const s = play({ type: 'START' }, { type: 'SELECT', mediumId: 'horse-relay' });
    assertEqual(s.selectedMediumId, 'horse-relay', 'selected');
    const p = roundProgress(s, R1);
    assertEqual([p.builds.length, p.spent, p.month, p.attempts], [0, 0, 0, 0], 'nothing happened');
    assertEqual(treasury(s, content), 200000, 'funds untouched');
    assertEqual(reduce(s, { type: 'SELECT', mediumId: 'telephone-line' }, content), s, 'a technology this era does not offer cannot be chosen');
  });

  it('[S3] AC3: a build that cannot serve counts one attempt when the demand arrives; Retry refunds it and keeps the count; a working build then serves', () => {
    let s = play({ type: 'START' }, ...build('horse-relay'));
    assertEqual(roundProgress(s, R1).attempts, 0, 'building is not an attempt');
    assertEqual(treasury(s, content), 200000 - 80000, 'the build is paid for');
    s = apply(s, SKIP);
    const p = roundProgress(s, R1);
    assertEqual([p.attempts, p.solved, p.month], [1, false, 12], 'one attempt, in the arrival month');
    assertEqual(p.lastResult.status, 'unserved', 'not served');
    assert(p.lastResult.results[0].functionalFailures.includes('TOO_SLOW'), JSON.stringify(p.lastResult.results[0]));
    assertEqual(apply(s, SKIP, { type: 'TICK', months: 5 }), s, 'the clock stops after the arrival');
    assertEqual(roundProgress(apply(s, ...build('smoke-beacon')), R1), p, 'nothing can be built after the arrival');
    s = apply(s, { type: 'RETRY' });
    const r = roundProgress(s, R1);
    assertEqual([r.attempts, r.month, r.builds.length, r.spent, r.lastResult], [1, 0, 0, 0, null], 'Retry keeps the attempt, rewinds and refunds');
    assertEqual(treasury(s, content), 200000, 'funds restored');
    s = serve(s, 'smoke-beacon');
    assertEqual([roundProgress(s, R1).attempts, roundProgress(s, R1).solved, totals(s).completed], [2, true, 1], 'served on the second attempt');
  });

  it('[S4] AC4: building with no technology chosen, building one twice, or letting the demand arrive with nothing built gives guidance and counts nothing', () => {
    const start = play({ type: 'START' });
    const noTool = apply(start, { type: 'BUILD' });
    assertEqual([noTool.notice.code, totals(noTool).attempts, roundProgress(noTool, R1).spent], ['NO_TOOL', 0, 0], 'no technology chosen');
    const twice = apply(start, ...build('smoke-beacon'), { type: 'BUILD' });
    assertEqual([twice.notice.code, roundProgress(twice, R1).spent], ['ALREADY_BUILT', 30000], 'paid once');
    const empty = apply(start, { type: 'TICK', months: 30 });
    assertEqual([roundProgress(empty, R1).month, empty.notice.code, totals(empty).attempts], [12, 'NOTHING_BUILT', 0], 'the clock holds at the arrival');
    assertEqual(apply(empty, SKIP), empty, 'nothing more happens until the player acts');
    const rewound = apply(empty, { type: 'RETRY' });
    assertEqual([roundProgress(rewound, R1).month, rewound.notice, totals(rewound).attempts], [0, null, 0], 'rewound to month 0, still no attempt');
  });

  it('[S5] AC6: a served demand completes once; building, the clock and Retry change nothing afterwards', () => {
    const solved = serve(play({ type: 'START' }), 'smoke-beacon');
    const after = apply(solved, ...build('horse-relay'), SKIP, { type: 'TICK', months: 2 }, { type: 'RETRY' });
    assertEqual(roundProgress(after, R1), roundProgress(solved, R1), 'round unchanged');
    assertEqual([totals(after).attempts, totals(after).completed], [1, 1], 'one attempt, one completion');
  });

  it('[S6] AC5: Hint gives the method, then a worked step; Worked solution needs the method hint first', () => {
    const start = play({ type: 'START' });
    const early = reduce(start, { type: 'WORKED_SOLUTION' }, content);
    assertEqual(roundProgress(early, R1).workedSolution, false, 'not available before the method hint');
    assertEqual(totals(early).assistance, 0, 'no assistance yet');
    const hint1 = reduce(start, { type: 'HINT' }, content);
    assertEqual(roundProgress(hint1, R1).hintStage, 1, 'method shown');
    assertEqual(totals(hint1).assistance, 1, 'assistance 1');
    const solution = reduce(hint1, { type: 'WORKED_SOLUTION' }, content);
    assertEqual(roundProgress(solution, R1).workedSolution, true, 'solution shown');
    assertEqual(totals(solution).assistance, 2, 'assistance 2');
    const hint2 = reduce(solution, { type: 'HINT' }, content);
    assertEqual(roundProgress(hint2, R1).hintStage, 2, 'worked step shown');
    assertEqual(totals(hint2).assistance, 3, 'assistance 3');
    const hint3 = reduce(hint2, { type: 'HINT' }, content);
    assertEqual(totals(hint3).assistance, 3, 'no further hint stage');
    assertEqual(roundProgress(hint3, R1).solved, false, 'help never completes the round');
    assertEqual(totals(hint3).attempts, 0, 'help never counts as an attempt');
    assertEqual(roundProgress(hint3, R1).builds.length, 0, 'help never builds anything');
  });

  it('[S7] AC8: Restart cancelled keeps the session; confirmed clears builds, spending and counts and returns to the first briefing', () => {
    const played = play({ type: 'START' }, ...build('horse-relay'), SKIP, { type: 'HINT' });
    const asked = reduce(played, { type: 'RESTART_REQUEST' }, content);
    assertEqual(asked.confirmRestart, true, 'asks for confirmation');
    const cancelled = reduce(asked, { type: 'RESTART_CANCEL' }, content);
    assertEqual(cancelled.confirmRestart, false, 'dialog closed');
    assertEqual(totals(cancelled), totals(played), 'counts preserved');
    assertEqual(roundProgress(cancelled, R1), roundProgress(played, R1), 'builds preserved');
    assertEqual(cancelled.view, 'round', 'still on the round');
    const confirmed = reduce(asked, { type: 'RESTART_CONFIRM' }, content);
    assertEqual([confirmed.view, confirmed.levelIndex], ['briefing', 0], 'first briefing');
    assertEqual(totals(confirmed), { completed: 0, attempts: 0, assistance: 0 }, 'all counts cleared');
    assertEqual(confirmed.rounds, {}, 'builds and spending cleared');
  });

  it('[S8] Next does nothing until the demand is served', () => {
    const s = play({ type: 'START' }, ...build('horse-relay'), SKIP, { type: 'NEXT' });
    assertEqual(s.view, 'round', 'still on the round');
  });

  it('[S9] state transitions are pure: reduce never mutates its input', () => {
    const s0 = play({ type: 'START' }, ...build('smoke-beacon'));
    const before = JSON.stringify(s0);
    for (const action of [{ type: 'SELECT', mediumId: 'horse-relay' }, { type: 'BUILD' }, { type: 'TICK', months: 2 }, SKIP, { type: 'HINT' }, { type: 'RETRY' }]) {
      reduce(s0, action, content);
    }
    assert(JSON.stringify(s0) === before, 'input state was mutated');
  });

  it('[S22] build time: a build must be ready by the arrival month, and ready exactly in the arrival month counts', () => {
    const s = toRound2();
    const onTime = apply(s, { type: 'TICK', months: 6 }, ...build('horse-relay'), SKIP);
    assertEqual(roundProgress(onTime, R2).solved, true, 'started in month 6, ready in month 12');
    const late = apply(s, { type: 'TICK', months: 7 }, ...build('horse-relay'), SKIP);
    const p = roundProgress(late, R2);
    assertEqual([p.solved, p.attempts], [false, 1], 'one attempt, not served');
    const res = p.lastResult.results[0];
    assertEqual([res.ready, res.readyMonth, res.functionalFailures.length], [false, 13, 0], 'it would work, but it is ready too late');
  });

  it('[S24] C1/C3: a network that carries the demand but is not the cheapest that works counts one attempt and keeps the round open', () => {
    let s = play({ type: 'START' });
    for (const id of ['spoken-word', 'signal-drum', 'smoke-beacon', 'foot-courier', 'horse-relay']) s = apply(s, ...build(id));
    assertEqual(treasury(s, content), 200000 - 180000, 'everything Level 1 offers costs 18 of the 20');
    s = apply(s, SKIP);
    const p = roundProgress(s, R1);
    assertEqual([p.lastResult.status, p.lastResult.servedBy, p.solved, p.attempts], ['overbuilt', 'smoke-beacon', false, 1], 'carried, but over-built');
    assertEqual(apply(s, { type: 'NEXT' }).view, 'round', 'Next stays closed');
    s = serve(apply(s, { type: 'RETRY' }), 'smoke-beacon');
    assertEqual([roundProgress(s, R1).solved, roundProgress(s, R1).attempts, roundProgress(s, R1).spent], [true, 2, 30000], 'the cheapest network completes it');
  });

  it('[S23] funds: each demand gets its era funding; a build that costs more than is left gives guidance; one demand never spends another\'s money', () => {
    let s = apply(play({ type: 'START' }), ...build('horse-relay'), ...build('foot-courier'));
    assertEqual(treasury(s, content), 200000 - 120000, 'two builds paid from this demand');
    s = advance(serve(apply(s, SKIP, { type: 'RETRY' }), 'smoke-beacon'));
    assertEqual(roundProgress(s, R1).spent, 30000, 'the first demand keeps only its final spending');
    assertEqual(treasury(s, content), 200000, 'the second demand is funded in full');
    let l2 = apply(toLevel2(), ...build('t1'), ...build('analog-carrier'));
    assertEqual(treasury(l2, content), 700000 - 650000, 'Level 2 funds each demand with 70');
    l2 = apply(l2, ...build('electric-telegraph'));
    assertEqual([l2.notice.code, l2.notice.cost, l2.notice.treasury], ['NO_FUNDS', 170000, 50000], 'guidance with the numbers');
    assertEqual(roundProgress(l2, 'l2-r1').builds.length, 2, 'nothing was built');
    assertEqual(totals(l2).attempts, 2, 'no attempt counted for the refusal (two from Level 1)');
  });
});

// ---------------- Slice 3: progression across levels (AC7) and determinism ----------------
describe('state · Slice 3 progression', () => {
  it('[S10] AC7: Level 1 completes after both demands; Next shows years passing, then the era-advance screen, then the Level 2 briefing', () => {
    let s = serve(play({ type: 'START' }), 'smoke-beacon');
    s = reduce(s, { type: 'NEXT' }, content);
    assertEqual(s.view, 'transition', 'years pass after demand 1');
    s = reduce(s, { type: 'TRANSITION_DONE' }, content);
    assertEqual([s.view, s.levelIndex, s.roundIndex], ['round', 0, 1], 'Level 1 Round 2');
    assertEqual(roundProgress(s, R2).month, 0, 'the clock starts at month 0 for the new demand');
    s = serve(s, 'horse-relay');
    assertEqual(roundProgress(s, R2).solved, true, 'demand 2 served');
    s = reduce(s, { type: 'NEXT' }, content);
    assertEqual(s.view, 'transition', 'years pass before the era advance');
    s = reduce(s, { type: 'TRANSITION_DONE' }, content);
    assertEqual([s.view, s.levelIndex, s.nextLevelIndex], ['levelSummary', 0, 1], 'era-advance screen for Level 1');
    s = reduce(s, { type: 'CONTINUE' }, content);
    assertEqual([s.view, s.levelIndex], ['briefing', 1], 'Level 2 briefing');
  });

  it('[S11] the era advances only when a level completes', () => {
    const s = toRound2();
    assertEqual(s.levelIndex, 0, 'still Level 1 after one demand');
    assertEqual(reduce(s, { type: 'CONTINUE' }, content).levelIndex, 0, 'CONTINUE does nothing mid-level');
  });

  it('[S12] AC7: all six demands, era advances after Levels 1 and 2, then the civilization summary with separate counts', () => {
    let s = play({ type: 'START' });
    for (const [choice, wrong] of [['smoke-beacon'], ['horse-relay'], ['electric-telegraph', 'telephone-line'], ['t1'], ['leo-satellite'], ['ethernet-fiber']]) {
      if (wrong) s = apply(serve(s, wrong), { type: 'RETRY' });   // one deliberate miss in Level 2 Round 1: not ready in time
      s = advance(serve(s, choice));
    }
    assertEqual(s.view, 'summary', 'summary after the last demand');
    assertEqual(totals(s), { completed: 6, attempts: 7, assistance: 0 }, 'separate counts include the one miss');
  });

  it('[S13] the growth caption names the new year and each settlement whose tier changed', () => {
    const c = growthCaption(content, 'l1-r1', 'l1-r2');
    assertEqual(c.fromYear, 'Year 900');
    assertEqual(c.toYear, 'Year 1150');
    assert(c.changes.includes('Ashford is now a town (it was a village).'), JSON.stringify(c.changes));
    assert(c.changes.includes("Brennan's Ford appears on the map as a village."), JSON.stringify(c.changes));
  });

  it('[S14] playing with different builds never changes the authored growth or requests', () => {
    const before = JSON.stringify(content);
    const a = serve(apply(play({ type: 'START' }), ...build('horse-relay'), SKIP, { type: 'RETRY' }), 'smoke-beacon');
    const b = apply(serve(play({ type: 'START' }), 'smoke-beacon'), { type: 'HINT' });
    assertEqual(roundProgress(a, R1).solved && roundProgress(b, R1).solved, true, 'both served');
    assertEqual(JSON.stringify(content), before, 'content was not changed by play');
    assertEqual(growthCaption(content, 'l1-r1', 'l1-r2'), growthCaption(content, 'l1-r1', 'l1-r2'), 'caption is deterministic');
    assertEqual(JSON.stringify(findRound(content, 'l1-r2').round), JSON.stringify(JSON.parse(before).levels[0].rounds[1]), 'next request unchanged');
  });
});

// ---------------- Slice 4: no city building; captions never change a request ----------------
describe('state · Slice 4 guards', () => {
  it('[S20] FR-028: the player builds communications only; no action places, moves or upgrades a settlement, and building never changes the map', () => {
    const s = play({ type: 'START' });
    for (const type of ['PLACE', 'MOVE_SETTLEMENT', 'UPGRADE_SETTLEMENT', 'ADD_SETTLEMENT', 'BUILD_SETTLEMENT', 'ZONE']) {
      assertEqual(reduce(s, { type, settlementId: 'ashford' }, content), s, `${type} must be ignored`);
    }
    const before = JSON.stringify(content);
    serve(s, 'smoke-beacon');
    assertEqual(JSON.stringify(content), before, 'building never changes settlements, growth or requests');
  });

  it('[S21] building a caption never changes a request or a grading result', () => {
    const before = JSON.stringify(content);
    const grade = JSON.stringify(evaluate(content, 'l1-r2', 'horse-relay'));
    growthCaption(content, 'l1-r1', 'l1-r2');
    growthCaption(content, 'l2-r1', 'l2-r2');
    assertEqual(JSON.stringify(content), before, 'content unchanged');
    assertEqual(JSON.stringify(evaluate(content, 'l1-r2', 'horse-relay')), grade, 'grade unchanged');
  });
});
