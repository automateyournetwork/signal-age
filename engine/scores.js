// Signal Age · display values: readable units, band labels and 0–10 scores.
// Display-only. engine/rules.js never imports this file, so no score can change grading.
//
// Latency score  = clamp(7 − log10(seconds), 0, 10), and 10 for instant media.
// Capacity score = clamp(log10(bps) + 1, 0, 10).
// The band label beside each score is the readable unit the value is shown in.

const DAY = 86400;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const round1 = (x) => Math.round(x * 10) / 10;

function trim(value, digits) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

function sig(value) {
  return trim(value, value >= 100 ? 0 : 1);
}

export function latencyScore(seconds) {
  if (seconds <= 0) return 10;
  return round1(clamp(7 - Math.log10(seconds), 0, 10));
}

export function capacityScore(bps) {
  if (!(bps > 0)) return 0;
  return round1(clamp(Math.log10(bps) + 1, 0, 10));
}

// Readable duration: ms, seconds, minutes, hours, days, weeks (from 14 days),
// months (from 60 days, counted as 30 days).
export function describeDuration(seconds) {
  if (seconds <= 0) return { text: 'under 1 second', band: 'instant' };
  const steps = [
    [1, 0.001, 'ms', 'ms'],
    [60, 1, 'second', 'seconds'],
    [3600, 60, 'minute', 'minutes'],
    [DAY, 3600, 'hour', 'hours'],
    [14 * DAY, DAY, 'day', 'days'],
    [60 * DAY, 7 * DAY, 'week', 'weeks'],
  ];
  for (const [below, size, one, many] of steps) {
    if (seconds < below) {
      const value = seconds / size;
      const text = sig(value);
      return { text: `${text} ${text === '1' ? one : many}`, band: many };
    }
  }
  const months = seconds / (30 * DAY);
  const text = sig(months);
  return { text: `${text} ${text === '1' ? 'month' : 'months'}`, band: 'months' };
}

export function describeLatency(seconds) {
  return { ...describeDuration(seconds), score: latencyScore(seconds), seconds };
}

export function describeRate(bps) {
  if (!(bps > 0)) return { text: 'none', band: 'bps' };
  const steps = [
    [1e3, 1, 'bps'],
    [1e6, 1e3, 'kbps'],
    [1e9, 1e6, 'Mbps'],
  ];
  for (const [below, size, unit] of steps) {
    if (bps < below) {
      const value = bps / size;
      return { text: `${trim(value, value < 1 ? 2 : value < 10 ? 2 : 1)} ${unit}`, band: unit };
    }
  }
  return { text: `${trim(bps / 1e9, 3)} Gbps`, band: 'Gbps' };
}

// Sustained rate for display. Couriers carry a payload per trip, so their rate
// is payload ÷ transit time for this request and falls as trips get longer.
export function capacityBps(medium, deliverySeconds) {
  const c = medium.capacity;
  if (c.kind === 'bps') return c.value;
  if (c.kind === 'user_mbps') return c.value * 1e6;
  if (c.kind === 'payload') return deliverySeconds > 0 ? c.bits / deliverySeconds : null;
  return null;
}

export function describeCapacity(medium, deliverySeconds) {
  const bps = capacityBps(medium, deliverySeconds);
  return { ...describeRate(bps), score: capacityScore(bps), bps };
}

// ---------- plain formatting shared by the UI and feedback ----------

export function formatCost(tenThousandths) {
  return trim(tenThousandths / 10000, 4);
}

export function formatMonths(months) {
  return `${trim(months, 1)} ${months === 1 ? 'month' : 'months'}`;
}

export function formatKm(km) {
  return `${trim(km, 2)} km`;
}

const UNIT_WORDS = { ms: ['millisecond', 'milliseconds'], second: ['second', 'seconds'], minute: ['minute', 'minutes'], hour: ['hour', 'hours'], day: ['day', 'days'] };

export function formatDeadline(deadline) {
  const [one, many] = UNIT_WORDS[deadline.unit] || [deadline.unit, deadline.unit];
  return `${trim(deadline.value, 3)} ${deadline.value === 1 ? one : many}`;
}

export function formatReach(reach) {
  if (reach.kind === 'unlimited') return 'unlimited';
  if (reach.kind === 'km') return formatKm(reach.value);
  if (reach.kind === 'coverage') return 'area coverage';
  if (reach.kind === 'route') return 'route to the area';
  return reach.kind;
}

export function formatSpeed(speed) {
  if (speed.kind === 'instant') return 'instant';
  if (speed.kind === 'km_per_unit') return `${trim(speed.value, 1)} km/${speed.unit}`;
  if (speed.kind === 'propagation') return `about ${trim(speed.kmPerS, 0)} km/s`;
  if (speed.kind === 'satellite_path') return `light speed over ${trim(speed.pathKm, 0)} km up and down`;
  return speed.kind;
}
