// Signal Age · screens. Builds DOM from state and the engine's results; it never decides an outcome.

import { CLASS_LABEL, analyzeRound, mediumById, ratToNumber, requestModel } from '../engine/rules.js';
import {
  growthCaption, growthOf, levelTotals, roundList, roundProgress, totals, treasury,
} from '../engine/state.js';
import { buildFacts } from '../engine/sim.js';
import { buildPreview, noticeText, outcomeReport, workedSolution } from '../engine/feedback.js';
import {
  describeCapacity, describeLatency, formatCost, formatDeadline, formatKm, formatMonths, formatReach, formatSpeed,
} from '../engine/scores.js';
import { badgeAt, renderStage, tierWord } from './map.js';
import { iconFor } from './icons.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const cls = (c) => CLASS_LABEL[c] || c;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const n0 = (x) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(x);

function currentRound(state, content) {
  const level = content.levels[state.levelIndex];
  return level ? level.rounds[state.roundIndex] : null;
}

// ---------- HUD ----------

export function renderHud(state, content, clock) {
  const t = totals(state);
  const level = content.levels[state.levelIndex];
  const round = currentRound(state, content);
  const p = round ? roundProgress(state, round.id) : null;
  const inRound = state.view === 'round' && round && !state.unavailable[round.id];
  const running = inRound && !p.lastResult && !p.solved && !(state.notice && state.notice.code === 'NOTHING_BUILT');
  const money = inRound ? treasury(state, content) : null;
  const budget = level && Number.isInteger(level.budget) ? level.budget : null;
  const clockBtn = (mode, label, glyph) => h('button', {
    type: 'button', class: 'clock-btn', id: `clock-${mode}`, 'data-clock': mode, 'aria-pressed': String(clock.mode === mode), disabled: !running,
    title: label, 'data-testid': `clock-${mode}`,
  }, h('span', { 'aria-hidden': 'true' }, glyph), h('span', { class: 'visually-hidden' }, label));
  const shownGrowth = state.view === 'transition' && state.transition ? growthOf(content, state.transition.toRef)
    : state.view === 'levelSummary' && content.levels[state.nextLevelIndex] ? content.levels[state.nextLevelIndex].rounds[0].growth
      : state.view === 'summary' && content.epilogue ? content.epilogue : round && round.growth;
  const date = shownGrowth ? `${shownGrowth.yearLabel}${inRound ? ` · month ${p.month}/${round.request.leadMonths}` : ''}` : '';
  return [
    h('p', { class: 'brand' }, 'Signal Age'),
    h('p', { class: 'hud-era' }, level ? level.eraName : ''),
    h('div', { class: 'hud-clock', role: 'group', 'aria-label': 'Game clock' },
      h('span', { class: 'date', 'data-testid': 'date' }, date),
      clockBtn('pause', 'Pause', '❚❚'), clockBtn('play', 'Play', '▶'), clockBtn('fast', 'Fast forward', '▶▶'),
      h('button', { type: 'button', class: 'clock-btn skip', id: 'skip-arrival', 'data-action': 'SKIP', disabled: !running, 'data-testid': 'skip-arrival' }, 'Skip to arrival')),
    h('p', { class: 'hud-money', 'data-testid': 'treasury', title: 'Money left for this demand' },
      h('span', { class: 'coin', 'aria-hidden': 'true' }, '◉'),
      budget === null ? ' Funds: no limit'
        : money === null ? [' Funds ', h('strong', {}, formatCost(budget)), h('span', { class: 'muted' }, ' per demand')]
          : [' Funds ', h('strong', {}, formatCost(money)), h('span', { class: 'muted' }, ` of ${formatCost(budget)}`)]),
    h('p', { class: 'hud-progress', 'data-testid': 'progress' },
      'Completed ', h('strong', { 'data-testid': 'completed' }, `${t.completed}/${roundList(content).length}`),
      ' · Attempts ', h('strong', { 'data-testid': 'attempts' }, String(t.attempts)),
      ' · Help ', h('strong', { 'data-testid': 'assistance' }, String(t.assistance))),
    h('div', { class: 'hud-actions' },
      h('button', { type: 'button', class: 'secondary', id: 'ledger', 'data-ledger': 'open', 'data-testid': 'ledger', disabled: !round }, 'Ledger'),
      h('button', { type: 'button', class: 'secondary', id: 'restart', 'data-action': 'RESTART_REQUEST', 'data-testid': 'restart' }, 'Restart')),
    h('ol', { class: 'timeline', 'aria-label': 'Eras' }, ...content.levels.map((l, i) => h('li', {
      class: i < state.levelIndex ? 'done' : i === state.levelIndex ? 'current' : '',
      'aria-current': i === state.levelIndex ? 'step' : null,
    }, `${i + 1} · ${l.title}`))),
  ];
}

// ---------- the round ----------

function demandCard(state, content, round) {
  const r = round.request;
  const p = roundProgress(state, round.id);
  const infra = round.existingInfrastructure;
  const ASSET_LABEL = { 'copper-plant': 'copper plant', ducts: 'ducts', 'dark-fiber': 'dark fiber', 'lit-sonet-fiber': 'lit SONET fiber' };
  const assets = infra.assets.filter((a) => a !== 'tower-sites').map((a) => ASSET_LABEL[a] || a.replace(/-/g, ' '));
  if (infra.existingTowerSites) assets.push(plural(infra.existingTowerSites, 'tower site', 'tower sites'));
  const inGround = assets.length ? assets.join(', ') : 'nothing yet';
  const area = requestModel(r) === 'service-area';
  const rows = area
    ? [['Service area', r.to], ['Backbone at', r.from], ['People', n0(r.population)], ['Area', `${n0(r.areaKm2)} km² (${n0(r.population / r.areaKm2)} per km²)`],
      ['Route to the backbone', formatKm(r.routeKm)], ['Speed per user', `${n0(r.perUserMbps)} Mbps (peak ${n0((r.population * r.perUserMbps) / 10)} Mbps)`],
      ['Users', r.mobile ? 'on the move' : 'fixed homes'], ['Terrain', r.flat ? 'flat' : 'not flat'],
      ['Deadline', r.deadline ? formatDeadline(r.deadline) : 'none'], ['Already in the ground', inGround]]
    : [['From', r.from], ['To', r.to], ['Distance', formatKm(r.distanceKm)], ['Message', cls(r.class)],
      ['Deadline', formatDeadline(r.deadline)], ['Circuits', String(r.circuits)], ['Already in the ground', inGround]];
  const budget = content.levels[state.levelIndex].budget;
  if (Number.isInteger(budget)) rows.push(['Funding', `${formatCost(budget)} for this demand`]);
  const left = r.leadMonths - p.month;
  const RESULT = { served: '✓ Served', overbuilt: '≈ Over-built: carried, but not the cheapest network', unserved: '✗ Not served' };
  const status = p.lastResult ? RESULT[p.lastResult.status] : left > 0 ? `Arrives in ${plural(left, 'month', 'months')}` : 'Arriving now';
  const title = area ? `Service for ${r.to}` : `${cls(r.class)[0].toUpperCase()}${cls(r.class).slice(1)}: ${r.from} → ${r.to}`;
  return h('section', { class: 'card demand-card', 'aria-labelledby': 'demand-heading', 'data-testid': 'request-card' },
    h('p', { class: 'eyebrow' }, `Demand ${state.roundIndex + 1} of ${content.levels[state.levelIndex].rounds.length} · ${round.growth.yearLabel}`),
    h('h2', { id: 'demand-heading' }, title),
    r.story ? h('p', { class: 'story' }, r.story) : null,
    h('div', { class: 'countdown', 'data-testid': 'countdown' },
      h('div', { class: 'countdown-bar', 'aria-hidden': 'true' }, h('span', { style: `width:${Math.min(100, (p.month / r.leadMonths) * 100)}%` })),
      h('p', {}, h('strong', {}, status), ` · the demand arrives in month ${r.leadMonths}`)),
    h('dl', { class: 'facts' }, ...rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])));
}

function scoreChip(label, d) {
  return h('p', { class: 'score-chip' },
    h('span', { class: 'label' }, label), h('span', { class: 'value' }, d.text),
    h('span', { class: 'bar', 'aria-hidden': 'true' }, h('span', { style: `width:${d.score * 10}%` })),
    h('span', { class: 'num' }, `${d.score.toFixed(1)} · ${d.band}`));
}

function toolCard(state, content, round) {
  const p = roundProgress(state, round.id);
  if (!state.selectedMediumId) {
    return h('section', { class: 'card tool-card empty', 'aria-labelledby': 'tool-heading' },
      h('h2', { id: 'tool-heading' }, 'Build'),
      h('p', {}, 'Choose a technology in the build menu, check its numbers against the demand, then build it on the route.'),
      h('button', { type: 'button', class: 'build-btn', id: 'build', 'data-action': 'BUILD', 'data-testid': 'build', disabled: Boolean(p.lastResult) }, 'Build'));
  }
  const pv = buildPreview(content, round.id, state.selectedMediumId, p.month);
  const built = p.builds.some((b) => b.mediumId === pv.id);
  const closed = Boolean(p.lastResult);
  return h('section', { class: 'card tool-card', 'aria-labelledby': 'tool-heading', 'data-testid': 'tool-card' },
    h('div', { class: 'tool-title' }, iconFor(pv.id), h('h2', { id: 'tool-heading' }, pv.name)),
    pv.summary ? h('p', { class: 'summary' }, pv.summary) : null,
    h('dl', { class: 'facts' }, ...pv.rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
    h('div', { class: 'scores' }, scoreChip('Latency', pv.latency), scoreChip('Capacity', pv.capacity)),
    h('button', { type: 'button', class: 'build-btn', id: 'build', 'data-action': 'BUILD', 'data-testid': 'build', disabled: closed || built },
      built ? 'Built' : `Build for ${formatCost(pv.cost)}`),
    h('p', { class: 'muted small' }, 'Scores compare media on a 0–10 scale; they never decide whether a demand is served.'));
}

function buildsCard(state, content, round, clock) {
  const p = roundProgress(state, round.id);
  if (!p.builds.length) return null;
  return h('section', { class: 'card builds-card', 'aria-labelledby': 'builds-heading', 'data-testid': 'builds' },
    h('h2', { id: 'builds-heading', tabindex: '-1' }, 'Your builds'),
    h('ul', {}, ...p.builds.map((b) => {
      const f = buildFacts(content, round.id, b.mediumId);
      const ready = b.startMonth + f.totalBuildMonths;
      const when = p.month >= ready ? `ready since month ${ready}` : `under construction, ready in month ${ready}`;
      return h('li', {}, iconFor(b.mediumId), h('span', {}, h('strong', {}, f.name), ` · started in month ${b.startMonth}, ${when} · cost ${formatCost(f.cost)}`));
    })),
    p.lastResult ? null : h('div', { class: 'actions' },
      clock.mode === 'pause'
        ? h('button', { type: 'button', id: 'run-clock', class: 'small-button', 'data-clock': 'play', 'data-testid': 'run-clock' }, '▶ Run the clock')
        : h('button', { type: 'button', id: 'run-clock', class: 'small-button', 'data-clock': 'pause', 'data-testid': 'run-clock' }, '❚❚ Pause the clock'),
      h('button', { type: 'button', id: 'start-over', class: 'secondary small-button', 'data-action': 'RETRY', 'data-testid': 'start-over' },
        `Start over (refund ${formatCost(p.spent)})`),
      h('span', { class: 'muted small' }, 'No attempt is counted until the demand arrives.')));
}

function reportCard(state, content, round) {
  const p = roundProgress(state, round.id);
  if (!p.lastResult) return null;
  const rep = outcomeReport(content, round.id, p.lastResult);
  return h('section', { class: `card report ${rep.kind}`, id: 'report', 'aria-labelledby': 'report-heading', 'data-testid': 'result', 'data-kind': rep.kind },
    h('h2', { id: 'report-heading', tabindex: '-1' }, h('span', { class: 'mark', 'aria-hidden': 'true' }, { served: '✓', overbuilt: '≈', unserved: '✗' }[rep.kind]), ' ', rep.headline),
    ...rep.details.map((d) => h('p', {}, d)),
    h('p', { class: 'efficiency' }, rep.efficiency),
    h('p', { class: 'next-step' }, h('strong', {}, 'Next step: '), rep.nextStep),
    h('div', { class: 'actions' }, p.solved
      ? h('button', { type: 'button', id: 'next', 'data-action': 'NEXT', 'data-testid': 'next' }, 'Next')
      : h('button', { type: 'button', id: 'retry', 'data-action': 'RETRY', 'data-testid': 'retry' }, 'Retry this demand (refund)')));
}

function advisorCard(state, content, round) {
  const p = roundProgress(state, round.id);
  const items = [];
  if (p.hintStage >= 1) items.push(h('h3', { id: 'hint-1', tabindex: '-1' }, 'The method'), h('p', {}, round.hints[0]));
  if (p.hintStage >= 2) items.push(h('h3', { id: 'hint-2', tabindex: '-1' }, 'A worked step'), h('p', {}, round.hints[1]));
  if (p.workedSolution) {
    const ws = workedSolution(content, round.id);
    items.push(h('h3', { id: 'worked-heading', tabindex: '-1' }, 'Worked solution'),
      h('ol', { class: 'steps' }, ...ws.steps.map((s) => h('li', {}, s.replace(/^\d+\.\s*/, '')))),
      h('p', {}, 'Using this counts as help, never as finishing the demand: you still have to build it.'));
  }
  return h('section', { class: 'card advisor', 'aria-labelledby': 'advisor-heading', 'data-testid': 'help' },
    h('h2', { id: 'advisor-heading' }, 'Advisor'),
    ...items,
    h('div', { class: 'actions' },
      h('button', { type: 'button', id: 'hint', class: 'secondary', 'data-action': 'HINT', 'data-testid': 'hint', disabled: p.hintStage >= 2 }, p.hintStage === 0 ? 'Hint' : 'Another hint'),
      h('button', { type: 'button', id: 'worked-solution', class: 'secondary', 'data-action': 'WORKED_SOLUTION', 'data-testid': 'worked-solution', disabled: p.hintStage < 1 || p.workedSolution }, 'Worked solution')));
}

function mapDetails(state, content, round) {
  const r = round.request;
  const p = roundProgress(state, round.id);
  const area = requestModel(r) === 'service-area';
  const line = area
    ? `${n0(r.population)} people over ${n0(r.areaKm2)} km² in ${r.to}, ${formatKm(r.routeKm)} of route from the backbone at ${r.from}.`
    : `${cls(r.class)} from ${r.from} to ${r.to}, ${formatKm(r.distanceKm)}.`;
  return h('details', { class: 'card map-details' },
    h('summary', {}, 'Map details (text)'),
    h('ul', { id: 'map-text', class: 'text-equivalent', 'data-testid': 'text-equivalent' },
      ...round.growth.settlements.map((s) => h('li', {}, h('strong', {}, s.name), ` — ${tierWord(s.tier)}. `, s.reason || '')),
      h('li', {}, h('strong', {}, 'Demand: '), line),
      ...p.builds.map((b) => h('li', {}, h('strong', {}, 'Built: '), `${mediumById(content, b.mediumId).name}, started in month ${b.startMonth}.`)),
      h('li', {}, h('strong', {}, 'Map: '), `real terrain of southern Spain, about ${round.growth.map.widthKm} km across. Settlement names are fictional and positions approximate; the distance on the demand card is the one that counts.`)));
}

function toolbar(state, content, round) {
  const analysis = analyzeRound(content, round.id);
  const offered = analysis.perMedium.filter((r) => r.offered);
  const p = roundProgress(state, round.id);
  const current = offered.some((r) => r.id === state.selectedMediumId) ? state.selectedMediumId : offered[0] && offered[0].id;
  return h('nav', { class: 'toolbar', 'aria-label': 'Build menu', 'aria-describedby': 'toolbar-help' },
    h('p', { id: 'toolbar-help', class: 'visually-hidden' }, 'Use the arrow keys to move between technologies, Enter to choose one, and Tab to reach its Build button.'),
    h('ul', {}, ...offered.map((r) => {
      const m = mediumById(content, r.id);
      const built = p.builds.some((b) => b.mediumId === r.id);
      const line = m.serviceArea
        ? (m.serviceArea.kind === 'wireless' ? `${n0(m.serviceArea.peakUserMbps)} Mbps · towers` : m.serviceArea.kind === 'satellite' ? `${n0(m.serviceArea.maxUserMbps)} Mbps · orbit` : `${n0(m.serviceArea.maxUserMbps)} Mbps · fiber`)
        : `${cls(m.class)} · ${formatReach(m.reach)} · ${formatSpeed(m.speed)}`;
      return h('li', {}, h('button', {
        type: 'button', class: `tool${built ? ' built' : ''}`, 'data-action': 'SELECT', 'data-medium': r.id, id: `tool-${r.id}`,
        'aria-pressed': String(state.selectedMediumId === r.id), 'data-testid': `tool-${r.id}`, tabindex: r.id === current ? '0' : '-1',
      }, iconFor(r.id), h('span', { class: 'tool-name' }, m.name), h('span', { class: 'tool-line' }, line),
      h('span', { class: 'tool-cost' }, built ? 'built' : `cost ${formatCost(r.cost)}`)));
    })));
}

function legacyBuilds(state, content) {
  const out = [];
  for (const { id } of roundList(content)) {
    const p = roundProgress(state, id);
    if (!p.solved || !p.lastResult) continue;
    const level = content.levels.find((l) => l.rounds.some((r) => r.id === id));
    const round = level.rounds.find((r) => r.id === id);
    const byName = (name) => round.growth.settlements.find((s) => s.name === name);
    const a = byName(round.request.from);
    const b = byName(round.request.to);
    if (a && b) out.push({ mediumId: p.lastResult.servedBy, from: a.id, to: b.id, fromName: a.name, toName: b.name, roundId: id });
  }
  return out;
}

export function travelFor(content, roundId, outcome) {
  if (!outcome) return null;
  const analysis = analyzeRound(content, roundId);
  const area = requestModel(analysis.round.request) === 'service-area';
  const result = outcome.results.find((r) => r.mediumId === outcome.servedBy) || outcome.results[0];
  const row = analysis.perMedium.find((r) => r.id === result.mediumId);
  const seconds = ratToNumber(row.deliveryTime);
  if (area) return { kind: 'area', outcome: outcome.servedBy ? 'on-time' : 'stopped', fraction: 1, seconds };
  const first = result.functionalFailures[0];
  if (result.works) return { kind: 'link', outcome: 'on-time', fraction: 1, deadlineFraction: 1, seconds };
  if (first === 'TOO_SLOW' && result.functionalFailures.length === 1 && result.ready) {
    return { kind: 'link', outcome: 'late', fraction: 1, deadlineFraction: Math.max(0.05, Math.min(0.95, ratToNumber(row.deadline) / seconds)), seconds };
  }
  let fraction = 0;
  if (first === 'OUT_OF_REACH' && row.checks.reach.reach.kind === 'km') fraction = Math.min(0.85, row.checks.reach.reach.value / row.checks.reach.distanceKm);
  if (first === 'CAPACITY_TOO_LOW') fraction = 0.5;
  return { kind: 'link', outcome: 'stopped', fraction, deadlineFraction: 1, seconds };
}

function renderRound(state, content, clock) {
  const level = content.levels[state.levelIndex];
  const round = currentRound(state, content);
  const p = roundProgress(state, round.id);
  if (state.unavailable[round.id]) {
    return h('section', { class: 'game unavailable', 'aria-labelledby': 'view-heading' },
      h('h1', { id: 'view-heading', tabindex: '-1', class: 'visually-hidden' }, `Level ${state.levelIndex + 1}, demand ${state.roundIndex + 1}`),
      h('section', { class: 'card report unserved', 'data-testid': 'result', 'data-kind': 'unavailable' },
        h('h2', {}, '⚠ This challenge is unavailable'),
        h('p', {}, `An authoring error stops this demand from being played (${state.unavailable[round.id].join(', ')}). It is not your mistake, and nothing is counted.`)));
  }
  const builds = p.builds.map((b) => {
    const f = buildFacts(content, round.id, b.mediumId);
    return { ...b, totalMonths: f.totalBuildMonths, towers: f.towers };
  });
  const stage = renderStage({
    growth: round.growth, request: round.request, builds, month: p.month,
    legacy: legacyBuilds(state, content).filter((l) => l.roundId !== round.id),
    travel: travelFor(content, round.id, p.lastResult), lit: p.solved, interactive: !p.lastResult,
  });
  const r = round.request;
  badgeAt(stage, round.growth, r, requestModel(r) === 'service-area'
    ? `${n0(r.population)} users · ${n0(r.perUserMbps)} Mbps`
    : `${cls(r.class)} · ${formatDeadline(r.deadline)}`);
  const notice = state.notice && state.notice.roundId === round.id
    ? h('div', { class: 'notice', 'data-testid': 'notice' }, h('p', { id: 'notice-text', tabindex: '-1' }, noticeText(content, state.notice)),
      state.notice.code === 'NOTHING_BUILT'
        ? h('button', { type: 'button', id: 'rewind', class: 'secondary small-button', 'data-action': 'RETRY', 'data-testid': 'rewind' }, 'Rewind to month 0')
        : null)
    : null;
  return h('section', { class: 'game', 'aria-labelledby': 'view-heading' },
    h('h1', { id: 'view-heading', tabindex: '-1', class: 'visually-hidden' },
      `Level ${state.levelIndex + 1}, ${level.title}: demand ${state.roundIndex + 1} of ${level.rounds.length}`),
    toolbar(state, content, round),
    h('div', { class: 'stage-col' }, h('div', { class: 'stage' }, stage)),
    h('aside', { class: 'side', 'aria-label': 'Demand, build and advisor' },
      demandCard(state, content, round), notice, reportCard(state, content, round), toolCard(state, content, round),
      buildsCard(state, content, round, clock), advisorCard(state, content, round), mapDetails(state, content, round)));
}

// ---------- overlays: briefing, years passing, era summary, final summary ----------

function overlayScreen(growth, card, { fadeFrom = null, startTiers = null, legacy = [] } = {}) {
  return h('section', { class: 'game overlay-screen', 'aria-labelledby': 'view-heading' },
    h('div', { class: 'stage-col' }, h('div', { class: 'stage dim' }, renderStage({ growth, fadeFrom, startTiers, legacy }))),
    h('div', { class: 'overlay-card-wrap' }, card));
}

function renderBriefing(state, content) {
  const level = content.levels[state.levelIndex];
  const b = level.briefing;
  const card = h('div', { class: 'overlay-card briefing' },
    h('p', { class: 'eyebrow' }, `Era ${state.levelIndex + 1} of ${content.levels.length} · ${level.eraName}`),
    h('h1', { id: 'view-heading', tabindex: '-1' }, level.title),
    ...b.intro.map((p) => h('p', {}, p)),
    h('h2', {}, 'What this era teaches'),
    ...b.concept.map((p) => h('p', {}, p)),
    h('figure', { class: 'example' }, h('figcaption', {}, 'Worked example (not one of your demands)'),
      h('p', {}, b.example.replace(/^Worked example \([^)]*\):\s*/, ''))),
    h('p', { class: 'how' }, h('strong', {}, 'How to play: '), 'each demand arrives after a number of months. Choose a technology in the build menu, build it on the demand\'s route or area, and run the clock. Construction takes its real build time. When the demand arrives, it is served only if something you built is ready and carries it in time. Each demand comes with funding from this era\'s budget; starting over refunds it.'),
    h('p', { class: 'note' }, b.note),
    h('div', { class: 'actions' }, h('button', { type: 'button', 'data-action': 'START', 'data-testid': 'start', id: 'start' }, state.levelIndex === 0 ? 'Begin' : 'Begin this era')));
  return overlayScreen(level.rounds[0].growth, card);
}

function renderTransition(state, content) {
  const t = state.transition;
  const cap = growthCaption(content, t.fromRef, t.toRef);
  const from = growthOf(content, t.fromRef);
  const to = growthOf(content, t.toRef);
  const card = h('div', { class: 'overlay-card transition' },
    h('h1', { id: 'view-heading', tabindex: '-1' }, `Years pass: ${cap.toYear}`),
    h('p', { class: 'years', 'aria-hidden': 'true' }, h('span', { id: 'year-counter', 'data-from': cap.fromYear, 'data-to': cap.toYear }, cap.toYear)),
    h('div', { id: 'caption', 'data-testid': 'caption' },
      h('p', {}, `From ${cap.fromYear} to ${cap.toYear}:`),
      h('ul', {}, ...cap.changes.map((c) => h('li', {}, c)))),
    h('div', { class: 'actions' },
      h('button', { type: 'button', id: 'skip', 'data-action': 'TRANSITION_DONE', 'data-testid': 'skip', 'aria-keyshortcuts': 'Escape' }, 'Continue'),
      h('span', { class: 'muted small' }, 'Press Escape to skip.')));
  const startTiers = from ? Object.fromEntries(from.settlements.map((s) => [s.id, s.tier])) : {};
  return overlayScreen(to, card, { fadeFrom: from && from.map.image !== to.map.image ? from.map.image : null, startTiers, legacy: legacyBuilds(state, content) });
}

function renderLevelSummary(state, content) {
  const level = content.levels[state.levelIndex];
  const next = content.levels[state.nextLevelIndex];
  const t = levelTotals(state, content, state.levelIndex);
  const spent = level.rounds.reduce((n, r) => n + roundProgress(state, r.id).spent, 0);
  const cheapest = level.rounds.reduce((n, r) => n + (roundProgress(state, r.id).lastResult?.cheapest.cost || 0), 0);
  const newMedia = next.unlockedMediumIds.map((id) => mediumById(content, id)).filter(Boolean);
  const card = h('div', { class: 'overlay-card summary' },
    h('p', { class: 'eyebrow' }, 'Era complete'),
    h('h1', { id: 'view-heading', tabindex: '-1' }, `Level ${state.levelIndex + 1} complete: ${level.title}`),
    h('dl', { class: 'facts counts' },
      h('dt', {}, 'Demands served'), h('dd', {}, `${t.completed} of ${level.rounds.length}`),
      h('dt', {}, 'Attempts'), h('dd', {}, String(t.attempts)),
      h('dt', {}, 'Help used'), h('dd', {}, String(t.assistance)),
      h('dt', {}, 'Spent'), h('dd', {}, `${formatCost(spent)} (the cheapest working networks cost ${formatCost(cheapest)})`)),
    h('h2', {}, `Era advance: ${next.eraName}`),
    h('p', {}, `New technology unlocked (${newMedia.length}):`),
    h('ul', { class: 'unlocks' }, ...newMedia.map((m) => h('li', {}, iconFor(m.id), m.name))),
    h('div', { class: 'actions' }, h('button', { type: 'button', id: 'continue', 'data-action': 'CONTINUE', 'data-testid': 'continue' }, `Continue to Level ${state.nextLevelIndex + 1}`)));
  return overlayScreen(next.rounds[0].growth, card, { legacy: legacyBuilds(state, content) });
}

function renderSummary(state, content) {
  const t = totals(state);
  const card = h('div', { class: 'overlay-card summary' },
    h('p', { class: 'eyebrow' }, content.epilogue ? content.epilogue.yearLabel : ''),
    h('h1', { id: 'view-heading', tabindex: '-1' }, 'Civilization summary'),
    content.levels.length < 3 ? h('p', { class: 'interim' }, 'Interim demo: Level 3 is not built yet.') : null,
    h('table', { class: 'compare' },
      h('thead', {}, h('tr', {}, ...['Era', 'Served', 'Attempts', 'Help', 'Spent'].map((x) => h('th', { scope: 'col' }, x)))),
      h('tbody', {}, ...content.levels.map((level, i) => {
        const lt = levelTotals(state, content, i);
        const spent = level.rounds.reduce((n, r) => n + roundProgress(state, r.id).spent, 0);
        return h('tr', {}, h('th', { scope: 'row' }, `${i + 1} · ${level.title}`), h('td', {}, `${lt.completed} of ${level.rounds.length}`),
          h('td', {}, String(lt.attempts)), h('td', {}, String(lt.assistance)), h('td', {}, formatCost(spent)));
      }))),
    h('p', {}, `You served ${t.completed} demands with ${plural(t.attempts, 'attempt', 'attempts')} and ${plural(t.assistance, 'use', 'uses')} of help.`),
    h('p', { class: 'muted' }, 'Completion is not proof of independent mastery: help is counted separately on purpose.'),
    h('p', { class: 'muted small' }, 'Terrain: real elevation data (AWS Terrain Tiles: SRTM, EU-DEM, ETOPO1 and others) and Natural Earth rivers, rendered in Blender. Settlement names are fictional.'),
    h('div', { class: 'actions' }, h('button', { type: 'button', id: 'play-again', 'data-action': 'RESTART_REQUEST', 'data-testid': 'play-again' }, 'Play again')));
  const last = content.levels[content.levels.length - 1];
  return overlayScreen(content.epilogue || last.rounds[last.rounds.length - 1].growth, card, { legacy: legacyBuilds(state, content) });
}

export function renderView(state, content, clock = { mode: 'pause' }) {
  switch (state.view) {
    case 'briefing': return renderBriefing(state, content);
    case 'round': return renderRound(state, content, clock);
    case 'transition': return renderTransition(state, content);
    case 'levelSummary': return renderLevelSummary(state, content);
    case 'summary': return renderSummary(state, content);
    default: return h('p', {}, `Unknown view ${state.view}`);
  }
}

// ---------- the ledger: every unlocked medium with its numbers, scores and sources ----------

function provenance(content, medium) {
  const parts = [];
  for (const [field, id] of Object.entries(medium.fieldSources || {})) {
    const s = content.sources.find((x) => x.id === id);
    if (!s) continue;
    parts.push(s.url ? h('span', {}, `${field}: `, h('a', { href: s.url }, s.title)) : h('span', {}, `${field}: ${s.title}`));
  }
  return h('td', { class: 'provenance' }, h('span', {}, 'Game-model values'), ...parts.map((x) => [h('br'), x]));
}

function scoreCell(d) {
  return h('td', { class: 'metric' }, h('span', { class: 'value' }, d.text),
    h('span', { class: 'score' }, h('span', { class: 'bar', 'aria-hidden': 'true' }, h('span', { style: `width:${d.score * 10}%` })),
      h('span', { class: 'score-num' }, d.score.toFixed(1)), h('span', { class: 'band' }, d.band)));
}

export function renderLedger(state, content) {
  const round = currentRound(state, content);
  if (!round) return h('p', {}, 'No demand yet.');
  const analysis = analyzeRound(content, round.id);
  const single = requestModel(round.request) === 'single-link';
  const ordered = [...analysis.perMedium.filter((r) => r.offered), ...analysis.perMedium.filter((r) => !r.offered)];
  const rows = ordered.map((r) => {
    const m = mediumById(content, r.id);
    const seconds = ratToNumber(r.deliveryTime);
    return h('tr', { class: r.offered ? '' : 'comparison' },
      h('th', { scope: 'row' }, r.name, r.offered ? null : h('span', { class: 'tag' }, 'comparison only')),
      h('td', {}, cls(m.class)), h('td', {}, formatReach(m.reach)), h('td', {}, formatSpeed(m.speed)),
      h('td', {}, single ? String(m.circuits) : (m.serviceArea ? `${m.serviceArea.kind === 'wireless' ? m.serviceArea.peakUserMbps : m.serviceArea.maxUserMbps} Mbps` : '—')),
      r.offered ? h('td', {}, formatMonths(r.totalBuildMonths), h('br'), h('span', { class: 'split' }, `plant ${formatMonths(r.plantMonths)} + technology ${formatMonths(r.technologyMonths)}`)) : h('td', {}, '—'),
      r.offered ? h('td', {}, formatCost(r.cost), h('br'), h('span', { class: 'split' }, `plant ${formatCost(r.plantCost)} + technology ${formatCost(r.technologyCost)}`)) : h('td', {}, '—'),
      scoreCell(describeLatency(seconds)), scoreCell(describeCapacity(m, seconds)), provenance(content, m));
  });
  return h('div', { class: 'table-wrap', role: 'region', 'aria-label': 'Every unlocked technology for this demand', tabindex: '0', 'data-testid': 'media-table' },
    h('table', { class: 'media' },
      h('caption', {}, `${round.growth.yearLabel}: every technology unlocked so far, for this demand. Latency is the delivery time for this demand. Scores run 0–10 for comparison and never decide whether a demand is served.`),
      h('thead', {}, h('tr', {}, ...['Technology', 'Class', single ? 'Reach per link' : 'Reach', 'Speed', single ? 'Circuits' : 'Per-user speed', 'Build time', single ? 'Cost' : 'Cost for this area', 'Latency · score', 'Capacity · score', 'Values'].map((x) => h('th', { scope: 'col' }, x)))),
      h('tbody', {}, ...rows)));
}

export function renderLoadError(errors) {
  return h('section', { class: 'card report unserved load-error', 'aria-labelledby': 'view-heading', 'data-testid': 'load-error' },
    h('h1', { id: 'view-heading', tabindex: '-1' }, 'The game data could not be loaded'),
    h('p', {}, 'This is an authoring or setup problem, not a player mistake. Nothing can be played until it is fixed.'),
    h('ul', {}, ...errors.map((e) => h('li', {}, `${e.code}: ${e.message}`))),
    h('p', {}, 'Serve the folder with python3 -m http.server 8000 --bind 127.0.0.1 and open http://127.0.0.1:8000.'));
}
