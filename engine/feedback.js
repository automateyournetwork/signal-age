// Signal Age · explanations built only from the evaluator's evidence (no answer key).
// Every number in a sentence comes from analyzeRound / evaluate output.

import { CLASS_LABEL, analyzeRound, findRound, mediumById, ratToNumber, requestModel } from './rules.js';
import { buildFacts, demandOf } from './sim.js';
import { describeCapacity, describeDuration, describeLatency, formatCost, formatDeadline, formatKm, formatMonths, formatReach, formatSpeed } from './scores.js';

const cls = (c) => CLASS_LABEL[c] || c;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const duration = (r) => describeDuration(ratToNumber(r)).text;
const num = (x) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(x);
const deadlineText = (request) => (request.deadline ? formatDeadline(request.deadline) : 'none');

// One sentence per failed check, using the measured values.
export function failureSentence(row, code, content, request) {
  const m = mediumById(content, row.id);
  const c = row.checks;
  switch (code) {
    case 'CLASS_TOO_WEAK':
      return `${row.name} carries ${cls(c.class.have)} messages; this request needs ${cls(c.class.need)}.`;
    case 'OUT_OF_REACH':
      return `${row.name} reaches ${formatReach(c.reach.reach)} per link; the request spans ${formatKm(c.reach.distanceKm)}.`;
    case 'TOO_SLOW':
      return `At ${formatSpeed(m.speed)}, ${row.name} needs ${duration(c.delivery.time)}; the deadline is ${formatDeadline(request.deadline)}.`;
    case 'CAPACITY_TOO_LOW':
      return `${row.name} carries ${plural(c.capacity.have, 'circuit', 'circuits')}; the request needs ${c.capacity.need}.`;
    case 'NOT_READY':
      return `${row.name} takes ${formatMonths(c.build.months)} to build; the demand arrives in ${formatMonths(c.build.lead)}.`;
    case 'NOT_FLAT':
      return `${row.name} needs flat terrain for its towers; this area is not flat.`;
    case 'NOT_MOBILE':
      return `${row.name} serves only fixed locations; these users move around.`;
    case 'OVER_DENSITY_CAP':
      return `${row.name} can serve at most ${num(c.reach.densityCap)} people per km²; this area has ${num(ratToNumber(c.reach.density))}.`;
    case 'USER_SPEED_TOO_LOW':
      return `${row.name} gives each user at most ${num(c.capacity.have)} Mbps; the request needs ${num(c.capacity.need)} Mbps.`;
    default:
      return `${row.name} fails the ${code} check.`;
  }
}

const NEXT_STEP = {
  CLASS_TOO_WEAK: (req) => `Look for a medium that can carry ${cls(req.class)} messages or a higher class.`,
  OUT_OF_REACH: (req) => `Look for a medium whose single link reaches ${formatKm(req.distanceKm)}.`,
  TOO_SLOW: (req) => `Look for a medium that delivers within ${formatDeadline(req.deadline)}; something that arrives at once may be needed.`,
  CAPACITY_TOO_LOW: (req) => `Look for a medium with at least ${plural(req.circuits, 'circuit', 'circuits')}.`,
  NOT_READY: (req) => `Look for a medium that can be built within ${formatMonths(req.leadMonths)}, or one whose plant is already in the ground.`,
  NOT_FLAT: () => 'Wireless towers need flat ground here: look at fiber or a satellite.',
  NOT_MOBILE: () => 'These users move around: look for a medium that serves mobile users.',
  OVER_DENSITY_CAP: () => 'This area is too dense for satellites: look at fiber or wireless.',
  USER_SPEED_TOO_LOW: (req) => `Look for a medium that gives each user at least ${num(req.perUserMbps)} Mbps.`,
  FEASIBLE_BUT_COSTLIER: () => 'Another technology also meets every constraint for less. Compare the costs of the technologies that pass every check.',
};

export function labelForCode(code) {
  return {
    CLASS_TOO_WEAK: 'class',
    OUT_OF_REACH: 'reach',
    TOO_SLOW: 'delivery time',
    CAPACITY_TOO_LOW: 'capacity',
    NOT_READY: 'build time',
    NOT_FLAT: 'flat terrain',
    NOT_MOBILE: 'mobile users',
    OVER_DENSITY_CAP: 'density',
    USER_SPEED_TOO_LOW: 'per-user speed',
  }[code] || code;
}

// Per-medium table: which constraint each offered medium fails, its delivery time and its cost.
export function comparisonTable(analysis) {
  return analysis.perMedium
    .filter((r) => r.offered)
    .map((r) => ({
      id: r.id,
      name: r.name,
      result: r.feasible ? 'Meets every constraint' : `Fails: ${r.failedChecks.map(labelForCode).join(', ')}`,
      delivery: duration(r.deliveryTime),
      cost: formatCost(r.cost),
      feasible: r.feasible,
    }));
}

// Worked solution: apply the method in order, ruling media out at their first failed check.
export function workedSolution(content, roundId) {
  const analysis = analyzeRound(content, roundId);
  if (!analysis.ok) return { steps: ['This challenge is unavailable, so there is no worked solution.'], answer: null };
  const request = analysis.round.request;
  const area = requestModel(request) === 'service-area';
  const offered = analysis.perMedium.filter((r) => r.offered);
  const groups = area
    ? [
        [['CLASS_TOO_WEAK'], `Class: the request needs ${cls(request.class)}.`],
        [['NOT_FLAT', 'NOT_MOBILE', 'OVER_DENSITY_CAP'], `Coverage: the area is ${request.flat ? 'flat' : 'not flat'}, the users are ${request.mobile ? 'mobile' : 'fixed'}, and satellites can serve at most 50 people per km².`],
        [['TOO_SLOW'], request.deadline ? `Delivery time: within ${formatDeadline(request.deadline)} over the route (satellites: their up-and-down path).` : 'Delivery time: this request has no deadline.'],
        [['USER_SPEED_TOO_LOW'], `Per-user speed: each user needs ${num(request.perUserMbps)} Mbps.`],
        [['NOT_READY'], `Build time: the medium must be ready within ${formatMonths(request.leadMonths)}.`],
      ]
    : [
        [['CLASS_TOO_WEAK'], `Class: the request needs ${cls(request.class)} or higher.`],
        [['OUT_OF_REACH'], `Reach: one link must span ${formatKm(request.distanceKm)}.`],
        [['TOO_SLOW'], `Delivery time: distance ÷ speed must be within ${formatDeadline(request.deadline)}.`],
        [['CAPACITY_TOO_LOW'], `Capacity: the request needs ${plural(request.circuits, 'circuit', 'circuits')}.`],
        [['NOT_READY'], `Build time: the medium must be ready within ${formatMonths(request.leadMonths)}.`],
      ];
  const steps = groups.map(([codes, intro], i) => {
    const out = offered.filter((r) => codes.includes(r.failedChecks[0]));
    const list = out.length ? out.map((r) => failureSentence(r, r.failedChecks[0], content, request)).join(' ') : 'Nothing is ruled out here.';
    return `${i + 1}. ${intro} ${list}`;
  });
  const feasible = analysis.feasibleIds.map((id) => offered.find((r) => r.id === id));
  const answer = feasible[0];
  steps.push(`6. Cost: the media left are ${feasible.map((r) => `${r.name} (${formatCost(r.cost)})`).join(', ')}. The cheapest is ${answer.name}.`);
  const latest = request.leadMonths - answer.totalBuildMonths;
  steps.push(`7. Timing: ${answer.name} takes ${formatMonths(answer.totalBuildMonths)} to build, so start it by month ${latest} for the demand in month ${request.leadMonths}.`);
  return { steps, answer: answer.id, answerName: answer.name, deadline: deadlineText(request) };
}

// ---------- the simulation: guidance, build previews and arrival reports ----------

export function noticeText(content, notice) {
  switch (notice.code) {
    case 'NO_TOOL':
      return 'Choose a technology in the build menu first, then build it on the route.';
    case 'NOT_OFFERED':
      return 'That technology cannot be built for this demand.';
    case 'ALREADY_BUILT':
      return `${mediumById(content, notice.mediumId).name} is already built for this demand.`;
    case 'NO_FUNDS':
      return `Not enough money: this costs ${formatCost(notice.cost)} and only ${formatCost(notice.treasury)} is left for this demand. Start over to get your spending back, or choose something cheaper.`;
    case 'NOTHING_BUILT': {
      const found = findRound(content, notice.roundId);
      const lead = found ? found.round.request.leadMonths : null;
      return `The demand has arrived${lead === null ? '' : ` (month ${lead})`} and nothing is built to serve it, so nothing is counted. Rewind to month 0 and build early enough to be ready when it arrives.`;
    }
    default:
      return '';
  }
}

// Facts about one technology for this demand, if built now. Numbers only: no verdict.
export function buildPreview(content, roundId, mediumId, month) {
  const r = buildFacts(content, roundId, mediumId);
  if (!r) return null;
  const m = mediumById(content, mediumId);
  const { request } = demandOf(content, roundId);
  const seconds = ratToNumber(r.deliveryTime);
  const split = (a, b, f) => `${f(a + b)} (plant ${f(a)} + technology ${f(b)})`;
  const rows = [['Carries', `${cls(m.class)} messages`]];
  if (requestModel(request) === 'service-area') {
    const sa = m.serviceArea;
    const reachText = sa.kind === 'wireless' ? `${plural(r.towers, 'tower', 'towers')} (${plural(r.newSites, 'new site', 'new sites')})`
      : sa.kind === 'satellite' ? 'the whole area from orbit' : `fiber along ${formatKm(request.routeKm)} of route, then to every home`;
    rows.push(['Covers', reachText]);
    rows.push(['Speed per user', `up to ${num(sa.kind === 'wireless' ? sa.peakUserMbps : sa.maxUserMbps)} Mbps`]);
    rows.push(['Moving users', sa.mobile ? 'served' : 'not served (fixed homes only)']);
    rows.push(['Terrain', sa.kind === 'wireless' && sa.requiresFlat ? 'needs flat ground' : 'any']);
    rows.push(['Density limit', sa.kind === 'satellite' ? `${num(sa.densityCap)} people per km²` : 'none']);
    rows.push(['Delivery time', `${describeDuration(seconds).text}${sa.kind === 'satellite' ? ' (up to the satellite and back down)' : ' over the route'}`]);
  } else {
    rows.push(['Route length', formatKm(request.distanceKm)]);
    rows.push(['One link reaches', formatReach(m.reach)]);
    rows.push(['Speed', formatSpeed(m.speed)]);
    rows.push(['Delivery over this route', describeDuration(seconds).text]);
    rows.push(['Circuits', String(m.circuits)]);
  }
  rows.push(['Build time', split(r.plantMonths, r.technologyMonths, formatMonths)]);
  rows.push(['Ready if started now', `month ${month + r.totalBuildMonths}`]);
  rows.push(['Cost', split(r.plantCost, r.technologyCost, formatCost)]);
  return {
    id: mediumId,
    name: m.name,
    summary: m.summary || '',
    rows,
    cost: r.cost,
    readyMonth: month + r.totalBuildMonths,
    latency: describeLatency(seconds),
    capacity: describeCapacity(m, seconds),
  };
}

const READY_STEP = 'Start building earlier, or choose something that is quicker to build or whose plant is already in the ground.';

// Why a working build carries this demand: every check with its measured value and what was needed.
function whyItWorks(row, request, res, arrival) {
  const c = row.checks;
  const ready = `it was ready in month ${res.readyMonth}, before the demand arrived in month ${arrival}`;
  if (requestModel(request) === 'service-area') {
    return `${row.name} works: it carries ${cls(c.class.have)} messages, covers this area (terrain, moving users and density all fit), `
      + `delivers in ${duration(c.delivery.time)}${request.deadline ? ` (deadline ${formatDeadline(request.deadline)})` : ' (no deadline)'}, `
      + `gives each user up to ${num(c.capacity.have)} Mbps (needs ${num(c.capacity.need)}), and ${ready}.`;
  }
  return `${row.name} works: it carries ${cls(c.class.have)} messages (needs ${cls(c.class.need)}), reaches ${formatReach(c.reach.reach)} per link `
    + `(needs ${formatKm(c.reach.distanceKm)}), delivers in ${duration(c.delivery.time)} (deadline ${formatDeadline(request.deadline)}), `
    + `carries ${plural(c.capacity.have, 'circuit', 'circuits')} (needs ${c.capacity.need}), and ${ready}.`;
}

// What happened when the demand arrived, built only from the simulation outcome and the evaluator.
export function outcomeReport(content, roundId, outcome) {
  const analysis = analyzeRound(content, roundId);
  const request = analysis.round.request;
  const area = requestModel(request) === 'service-area';
  const what = area ? `service for ${request.to}` : `the ${cls(request.class)} from ${request.from} to ${request.to}`;
  const row = (id) => analysis.perMedium.find((x) => x.id === id);
  const lines = outcome.results.map((res) => {
    const r = row(res.mediumId);
    if (res.works) return whyItWorks(r, request, res, outcome.arrivalMonth);
    if (res.functionalFailures.length) {
      return res.functionalFailures.map((c) => failureSentence(r, c, content, request)).join(' ');
    }
    return `${res.name} was started in month ${res.startMonth} and would be ready in month ${res.readyMonth}; the demand arrived in month ${outcome.arrivalMonth}.`;
  });
  if (outcome.status === 'served') {
    const winner = outcome.results.find((x) => x.mediumId === outcome.servedBy);
    // Why it is the cheapest: every cheaper technology fails a check; everything else costs more.
    const offered = analysis.perMedium.filter((r) => r.offered).sort((a, b) => a.cost - b.cost);
    const cheaper = offered.filter((r) => r.cost < winner.cost);
    const dearer = offered.filter((r) => r.cost > winner.cost);
    const cheaperText = cheaper.length
      ? `every cheaper technology fails a check (${cheaper.map((r) => `${r.name}, cost ${formatCost(r.cost)}: ${labelForCode(r.failedChecks[0])}`).join('; ')})`
      : 'no technology here costs less';
    const dearerText = dearer.length
      ? `, and the others cost more (${dearer.map((r) => `${r.name} ${formatCost(r.cost)}${r.feasible ? ', also works' : ''}`).join('; ')})`
      : '';
    return {
      kind: 'served',
      headline: `Served: ${winner.name} delivered ${what} on time.`,
      details: [...lines, `Why it is the cheapest that works, at ${formatCost(winner.cost)}: ${cheaperText}${dearerText}.`],
      efficiency: `You spent ${formatCost(outcome.spent)}: exactly the cost of the cheapest network that works.`,
      nextStep: 'Press Next to see what the years bring.',
    };
  }
  if (outcome.status === 'overbuilt') {
    const winner = outcome.results.find((x) => x.mediumId === outcome.servedBy);
    const extras = outcome.results.filter((x) => x.mediumId !== outcome.servedBy).map((x) => x.name);
    const costlier = winner.cost > outcome.cheapest.cost;
    return {
      kind: 'overbuilt',
      headline: costlier
        ? `Over-built: ${winner.name} carried ${what} on time, but a cheaper network would also have worked.`
        : `Over-built: ${winner.name} carried ${what} on time, but it did not need ${extras.join(' or ')}.`,
      details: lines,
      efficiency: `You spent ${formatCost(outcome.spent)} on this attempt; Retry refunds it. The demand is complete when you build the cheapest network that carries it.`,
      nextStep: costlier ? NEXT_STEP.FEASIBLE_BUT_COSTLIER(request) : 'Retry and build only what carries the demand.',
    };
  }
  const first = outcome.results[0];
  const code = first.functionalFailures[0];
  return {
    kind: 'unserved',
    headline: `Not served: ${lines[0]}`,
    details: lines.slice(1),
    efficiency: `You spent ${formatCost(outcome.spent)} on this attempt; Retry refunds it.`,
    nextStep: code ? NEXT_STEP[code](request) : READY_STEP,
  };
}
