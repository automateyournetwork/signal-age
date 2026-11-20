// Signal Age · session state. Pure reducer: reduce(state, action, content) returns a new state and
// never mutates its input. Owns the game clock (months), builds, the era treasury, attempts,
// assistance, completion, the current view, era advance and restart. Memory only; reload starts fresh.
//
// Progress rules (spec "Progress Rules", revised for the simulation):
// - Choosing a build tool or opening help never counts as an attempt.
// - BUILD without a tool, without enough money, or twice with the same tool gives guidance only.
// - The clock never lets a demand arrive with nothing built: it stops at the arrival month with guidance.
// - A demand arriving with at least one build counts one attempt. engine/sim.js decides the outcome:
//   served (the cheapest network that carries it: the round completes), over-built (carried, but a cheaper
//   network would also work: the round stays open) or not served.
// - A served round completes once; after that, builds and the clock are ignored until Next.
// - Retry (or starting over before the demand arrives) refunds the round's spending; attempts and
//   assistance are kept.
// - Each demand is funded with its era's budget; what one demand spends never reduces another's.

import { validateContent } from './content.js';
import { buildFacts, levelBudget, resolveBuilds } from './sim.js';

const freshRound = () => ({
  attempts: 0, assistance: 0, hintStage: 0, workedSolution: false, solved: false, lastResult: null,
  month: 0, builds: [], spent: 0,
});

function unavailableRounds(content) {
  const v = validateContent(content);
  const out = {};
  for (const [id, r] of Object.entries(v.rounds)) if (!r.ok) out[id] = r.errors.map((e) => e.code);
  return out;
}

export function createSession(content) {
  return {
    view: 'briefing',
    levelIndex: 0,
    roundIndex: 0,
    selectedMediumId: null,
    rounds: {},
    confirmRestart: false,
    transition: null,
    notice: null,
    unavailable: unavailableRounds(content),
  };
}

export function roundList(content) {
  return content.levels.flatMap((level, levelIndex) =>
    (level.rounds || []).map((round, roundIndex) => ({ id: round.id, levelIndex, roundIndex })),
  );
}

export function currentRoundId(state, content) {
  const level = content.levels[state.levelIndex];
  const round = level && level.rounds[state.roundIndex];
  return round ? round.id : null;
}

export function roundProgress(state, roundId) {
  return state.rounds[roundId] || freshRound();
}

export function totals(state, roundIds = null) {
  const entries = Object.entries(state.rounds).filter(([id]) => !roundIds || roundIds.includes(id));
  return {
    completed: entries.filter(([, r]) => r.solved).length,
    attempts: entries.reduce((n, [, r]) => n + r.attempts, 0),
    assistance: entries.reduce((n, [, r]) => n + r.assistance, 0),
  };
}

export function levelTotals(state, content, levelIndex) {
  return totals(state, content.levels[levelIndex].rounds.map((r) => r.id));
}

export function spentInLevel(state, content, levelIndex) {
  return content.levels[levelIndex].rounds.reduce((n, r) => n + roundProgress(state, r.id).spent, 0);
}

// Money left for one demand (the current one by default), or null when its era has no budget.
export function treasury(state, content, roundId = currentRoundId(state, content)) {
  const found = roundList(content).find((r) => r.id === roundId);
  if (!found) return null;
  const budget = levelBudget(content, found.levelIndex);
  return budget === null ? null : budget - roundProgress(state, roundId).spent;
}

function withRound(state, roundId, patch, extra = {}) {
  return { ...state, ...extra, rounds: { ...state.rounds, [roundId]: { ...roundProgress(state, roundId), ...patch } } };
}

// Where Next leads after the current round is solved.
function nextStep(state, content) {
  const list = roundList(content);
  const i = list.findIndex((r) => r.levelIndex === state.levelIndex && r.roundIndex === state.roundIndex);
  const current = list[i];
  const next = list[i + 1];
  if (!next) {
    return { toRef: content.epilogue ? 'epilogue' : null, then: { view: 'summary', levelIndex: state.levelIndex, roundIndex: state.roundIndex } };
  }
  if (next.levelIndex === current.levelIndex) {
    return { toRef: next.id, then: { view: 'round', levelIndex: next.levelIndex, roundIndex: next.roundIndex } };
  }
  return { toRef: next.id, then: { view: 'levelSummary', levelIndex: current.levelIndex, roundIndex: current.roundIndex, nextLevelIndex: next.levelIndex } };
}

const TIER_RANK = { hamlet: 0, village: 1, town: 2, city: 3, metropolis: 4 };
const ARTICLE = { hamlet: 'a hamlet', village: 'a village', town: 'a town', city: 'a city', metropolis: 'a metropolis' };

export function growthOf(content, ref) {
  if (ref === 'epilogue') return content.epilogue;
  for (const level of content.levels) for (const r of level.rounds || []) if (r.id === ref) return r.growth;
  return null;
}

// Caption for the years-pass transition: the new year and each settlement whose tier changed or that
// appears for the first time. Pure; never changes a request or a result.
export function growthCaption(content, fromRef, toRef) {
  const from = growthOf(content, fromRef);
  const to = growthOf(content, toRef);
  if (!from || !to) return { fromYear: from ? from.yearLabel : '', toYear: to ? to.yearLabel : '', changes: [] };
  const before = new Map(from.settlements.map((s) => [s.id, s]));
  const changes = [];
  for (const s of to.settlements) {
    const old = before.get(s.id);
    if (!old) changes.push(`${s.name} appears on the map as ${ARTICLE[s.tier]}.`);
    else if (TIER_RANK[s.tier] > TIER_RANK[old.tier]) changes.push(`${s.name} is now ${ARTICLE[s.tier]} (it was ${ARTICLE[old.tier]}).`);
  }
  if (changes.length === 0) changes.push('The settlements keep their size; demand still grows.');
  return { fromYear: from.yearLabel, toYear: to.yearLabel, changes };
}

function leadOf(content, state) {
  const level = content.levels[state.levelIndex];
  return level.rounds[state.roundIndex].request.leadMonths;
}

export function reduce(state, action, content) {
  const roundId = currentRoundId(state, content);
  const progress = roundId ? roundProgress(state, roundId) : null;
  const playable = state.view === 'round' && roundId && !state.unavailable[roundId];

  switch (action.type) {
    case 'START':
      if (state.view !== 'briefing') return state;
      return { ...state, view: 'round', roundIndex: 0, selectedMediumId: null, notice: null };

    case 'SELECT': {
      if (!playable) return state;
      if (!buildFacts(content, roundId, action.mediumId)) return state;
      return { ...state, selectedMediumId: action.mediumId, notice: null };
    }

    case 'BUILD': {
      if (!playable || progress.solved || progress.lastResult) return state;
      if (!state.selectedMediumId) return { ...state, notice: { code: 'NO_TOOL', roundId } };
      const facts = buildFacts(content, roundId, state.selectedMediumId);
      if (!facts) return { ...state, notice: { code: 'NOT_OFFERED', roundId } };
      if (progress.builds.some((b) => b.mediumId === facts.id)) return { ...state, notice: { code: 'ALREADY_BUILT', roundId, mediumId: facts.id } };
      const money = treasury(state, content);
      if (money !== null && facts.cost > money) {
        return { ...state, notice: { code: 'NO_FUNDS', roundId, cost: facts.cost, treasury: money } };
      }
      return withRound(state, roundId, {
        builds: [...progress.builds, { mediumId: facts.id, startMonth: progress.month }],
        spent: progress.spent + facts.cost,
      }, { notice: null });
    }

    case 'TICK':
    case 'SKIP': {
      if (!playable || progress.solved || progress.lastResult) return state;
      const lead = leadOf(content, state);
      const step = action.type === 'SKIP' ? Infinity : Math.max(0, Math.floor(action.months ?? 1));
      const month = Math.min(lead, progress.month + step);
      if (month < lead) return withRound(state, roundId, { month }, { notice: null });
      if (progress.builds.length === 0) {
        if (progress.month === lead && state.notice && state.notice.code === 'NOTHING_BUILT') return state;
        return withRound(state, roundId, { month: lead }, { notice: { code: 'NOTHING_BUILT', roundId } });
      }
      const outcome = resolveBuilds(content, roundId, progress.builds);
      return withRound(state, roundId, {
        month: lead,
        attempts: progress.attempts + 1,
        solved: outcome.status === 'served',
        lastResult: outcome,
      }, { notice: null });
    }

    case 'RETRY':
      if (!playable || progress.solved) return state;
      return withRound(state, roundId, { month: 0, builds: [], spent: 0, lastResult: null }, { notice: null });

    case 'HINT':
      if (!playable || progress.hintStage >= 2) return state;
      return withRound(state, roundId, { hintStage: progress.hintStage + 1, assistance: progress.assistance + 1 });

    case 'WORKED_SOLUTION':
      if (!playable || progress.hintStage < 1 || progress.workedSolution) return state;
      return withRound(state, roundId, { workedSolution: true, assistance: progress.assistance + 1 });

    case 'NEXT': {
      if (state.view !== 'round' || !roundId || !progress.solved) return state;
      const step = nextStep(state, content);
      if (!step.toRef) return { ...state, ...step.then, selectedMediumId: null, transition: null, notice: null };
      return { ...state, view: 'transition', transition: { fromRef: roundId, toRef: step.toRef, then: step.then }, notice: null };
    }

    case 'TRANSITION_DONE': {
      if (state.view !== 'transition' || !state.transition) return state;
      const { then } = state.transition;
      return { ...state, view: then.view, levelIndex: then.levelIndex, roundIndex: then.roundIndex, nextLevelIndex: then.nextLevelIndex, selectedMediumId: null, transition: null };
    }

    case 'CONTINUE':
      if (state.view !== 'levelSummary' || state.nextLevelIndex === undefined) return state;
      return { ...state, view: 'briefing', levelIndex: state.nextLevelIndex, roundIndex: 0, nextLevelIndex: undefined, selectedMediumId: null };

    case 'RESTART_REQUEST':
      return { ...state, confirmRestart: true };

    case 'RESTART_CANCEL':
      return { ...state, confirmRestart: false };

    case 'RESTART_CONFIRM':
      return createSession(content);

    default:
      return state;
  }
}
