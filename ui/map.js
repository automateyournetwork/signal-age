// Signal Age · the map stage: Blender-rendered real terrain, settlement sprites, the demand, the
// player's builds and the message travelling. Illustration only: grading never reads anything here,
// and every fact shown is also written as text in the side panel.

import { drawStyleFor } from './icons.js';

const NS = 'http://www.w3.org/2000/svg';
const TIER_WIDTH = { hamlet: 15, village: 18, town: 21, city: 24, metropolis: 27 };   // % of map width
const TIER_WORD = { hamlet: 'hamlet', village: 'village', town: 'town', city: 'city', metropolis: 'metropolis' };
const SPRITE_ORIGIN_Y = 54.3;   // % down the sprite image where its ground centre is (60-degree camera)

export function tierWord(tier) {
  return TIER_WORD[tier] || tier;
}

export function spriteFor(s) {
  if (s.id === 'hill-fort') return 'fort';
  if (s.id === 'merrow-harbour') return 'harbour';
  if (s.id === 'great-steppe' && s.tier === 'hamlet') return 'camp';
  return s.tier;
}

function svg(tag, attrs = {}, text) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null && v !== false) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  return el;
}

function div(cls, style = '', text) {
  const el = document.createElement('div');
  el.className = cls;
  if (style) el.setAttribute('style', style);
  if (text !== undefined) el.textContent = text;
  return el;
}

const pct = (p) => `left:${p.x}%;top:${(p.y / 70) * 100}%`;
const inFrame = (p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 70;

export function placeOf(growth, name) {
  return growth.settlements.find((s) => s.name === name) || null;
}

function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function offsetLine(a, b, offset) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len * offset;
  const ny = dx / len * offset;
  return [{ x: a.x + nx, y: a.y + ny }, { x: b.x + nx, y: b.y + ny }];
}

// ---------- link builds ----------

function flame(g, p, size = 1.4) {
  g.append(svg('path', {
    class: 'flame',
    d: `M${p.x} ${p.y - size * 1.6} c${size * 0.5} ${size * 0.8} ${size * 1.1} ${size * 1.1} ${size * 1.1} ${size * 1.9} a${size * 1.1} ${size * 1.1} 0 0 1 -${size * 2.2} 0 c0 -${size * 0.6} ${size * 0.4} -${size * 1} ${size * 0.6} -${size * 1.3} c${size * 0.15} ${size * 0.4} ${size * 0.35} ${size * 0.6} ${size * 0.6} ${size * 0.6} c-${size * 0.15} -${size * 0.6} -${size * 0.1} -${size * 1} ${size * 0.4} -${size * 1.8}z`,
  }));
}

function drawLink(g, top, style, a, b, progress, legacy = false) {
  const end = lerp(a, b, progress);
  const done = progress >= 1;
  const cls = `build ${style}${done ? '' : ' construction'}${legacy ? ' legacy' : ''}`;
  if (style === 'fiber' || style === 'copper') {
    g.append(svg('line', { x1: a.x, y1: a.y, x2: end.x, y2: end.y, class: `${cls} glow` }));
  }
  g.append(svg('line', { x1: a.x, y1: a.y, x2: end.x, y2: end.y, class: cls }));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  if (style === 'wire' || style === 'copper') {
    const steps = Math.max(3, Math.floor(len / 2.2));
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      if (t > progress) break;
      const p = lerp(a, b, t);
      g.append(svg('line', { x1: p.x - nx * 0.7, y1: p.y - ny * 0.7, x2: p.x + nx * 0.7, y2: p.y + ny * 0.7, class: `pole${legacy ? ' legacy' : ''}` }));
    }
  }
  if (style === 'semaphore') {
    for (const t of [0.2, 0.4, 0.6, 0.8]) {
      if (t > progress) break;
      const p = lerp(a, b, t);
      g.append(svg('path', { d: `M${p.x} ${p.y}v-2.2m-1 0.4l1-.4 1.1.8`, class: `tower-glyph${legacy ? ' legacy' : ''}` }));
    }
  }
  if (style === 'beacon' && !legacy) {
    flame(top, a);
    if (done) flame(top, b);
  }
  if (style === 'drum' && !legacy) {
    top.append(svg('circle', { cx: a.x, cy: a.y - 1.4, r: 0.9, class: 'drum-glyph' }));
  }
  if (!done) {
    top.append(svg('text', { x: end.x, y: end.y - 1.4, class: 'progress-label', 'text-anchor': 'middle' }, `${Math.round(progress * 100)}%`));
  }
}

// ---------- area builds (Level 3) ----------

function spiral(n, area) {
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const r = Math.sqrt((i + 0.5) / n) * 0.88;
    const a = i * 2.39996;
    pts.push({ x: area.x + Math.cos(a) * r * area.rx, y: area.y + Math.sin(a) * r * area.ry });
  }
  return pts;
}

function drawArea(g, top, style, area, backbone, progress, facts, mediumId) {
  if (style === 'area-wireless') {
    const n = Math.max(4, Math.min(30, facts && facts.towers ? facts.towers : 12));
    const shown = Math.ceil(n * progress);
    spiral(n, area).slice(0, shown).forEach((p) => {
      // A lattice mast with an antenna head: legs, mast, cross-brace and a lit tip.
      top.append(svg('path', { d: `M${p.x - 0.55} ${p.y + 0.9}L${p.x} ${p.y - 1.1}L${p.x + 0.55} ${p.y + 0.9}M${p.x - 0.3} ${p.y + 0.1}h0.6M${p.x} ${p.y - 1.1}v-0.5`, class: 'tower-glyph wireless' }));
      top.append(svg('circle', { cx: p.x, cy: p.y - 1.75, r: 0.32, class: 'tower-tip' }));
      if (progress >= 1) {
        top.append(svg('path', { d: `M${p.x - 0.9} ${p.y - 2.4}a1.2 1.2 0 0 0 0 1.3M${p.x + 0.9} ${p.y - 2.4}a1.2 1.2 0 0 1 0 1.3`, class: 'tower-waves' }));
        top.append(svg('circle', { cx: p.x, cy: p.y - 1.75, r: 1.3, class: 'signal-ring' }));
      }
    });
  } else if (style === 'area-fiber') {
    if (backbone) {
      const trunkEnd = lerp(backbone, area, Math.min(1, progress * 1.6));
      g.append(svg('line', { x1: backbone.x, y1: backbone.y, x2: trunkEnd.x, y2: trunkEnd.y, class: 'build fiber glow' }));
      g.append(svg('line', { x1: backbone.x, y1: backbone.y, x2: trunkEnd.x, y2: trunkEnd.y, class: 'build fiber' }));
    }
    const spokes = 10;
    const local = Math.max(0, progress * 1.6 - 0.6);
    for (let i = 0; i < spokes; i += 1) {
      const ang = (i / spokes) * Math.PI * 2 + 0.3;
      const tip = { x: area.x + Math.cos(ang) * area.rx * 0.85 * local, y: area.y + Math.sin(ang) * area.ry * 0.85 * local };
      g.append(svg('line', { x1: area.x, y1: area.y, x2: tip.x, y2: tip.y, class: 'build fiber thin' }));
    }
  } else if (style === 'area-satellite') {
    const high = mediumId === 'geo-satellite';
    const apex = { x: Math.min(96, area.x + (high ? 10 : 6)), y: Math.max(3, area.y - (high ? 30 : 16)) };
    const ctrl = { x: area.x + (high ? 2 : 1), y: apex.y - 3 };
    top.append(svg('path', { d: `M${area.x} ${area.y}Q${ctrl.x} ${ctrl.y} ${apex.x} ${apex.y}`, class: `build satellite-beam${progress < 1 ? ' construction' : ''}` }));
    if (progress >= 1) {
      top.append(svg('path', { d: `M${apex.x - 2.4} ${apex.y}h1.6M${apex.x + 0.8} ${apex.y}h1.6`, class: 'sat-panel' }));
      top.append(svg('rect', { x: apex.x - 0.8, y: apex.y - 0.8, width: 1.6, height: 1.6, class: 'sat-body' }));
      g.append(svg('ellipse', { cx: area.x, cy: area.y, rx: area.rx * 0.95, ry: area.ry * 0.95, class: 'sat-footprint' }));
    } else {
      top.append(svg('text', { x: apex.x, y: apex.y - 1.2, class: 'progress-label', 'text-anchor': 'middle' }, `launch ${Math.round(progress * 100)}%`));
    }
  }
}

// ---------- the stage ----------

/**
 * growth: the snapshot to show (settlements with x, y in the 100 x 70 frame; map image and area).
 * request: the demand being played (or null). builds: [{ mediumId, startMonth, totalMonths, towers }].
 * legacy: earlier served builds to draw muted: [{ mediumId, from, to }] (settlement ids).
 * travel: { kind: 'link' | 'area', outcome, fraction, deadlineFraction } after the demand arrives.
 */
export function renderStage({ growth, request = null, builds = [], month = 0, legacy = [], travel = null, lit = false, interactive = false, fadeFrom = null, startTiers = null, idPrefix = 'map' }) {
  const wrap = div('map-wrap');
  wrap.dataset.testid = idPrefix;
  if (fadeFrom) {
    const old = document.createElement('img');
    old.className = 'map-img fade-out';
    old.src = fadeFrom;
    old.alt = '';
    wrap.append(old);
  }
  const img = document.createElement('img');
  img.className = `map-img${fadeFrom ? ' fade-in' : ''}`;
  img.src = growth.map.image;
  img.alt = '';
  img.draggable = false;
  wrap.append(img);

  const overlay = svg('svg', { class: 'overlay', viewBox: '0 0 100 70', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  const defs = svg('defs');
  const glow = svg('filter', { id: `${idPrefix}-glow`, x: '-20%', y: '-20%', width: '140%', height: '140%' });
  glow.append(svg('feGaussianBlur', { stdDeviation: '0.6' }));
  defs.append(glow);
  overlay.append(defs);
  // Markers (flames, towers, labels, the travelling message) sit above the settlement sprites.
  const overlayTop = svg('svg', { class: 'overlay overlay-top', viewBox: '0 0 100 70', preserveAspectRatio: 'none', 'aria-hidden': 'true' });

  const place = (name) => (request ? placeOf(growth, name) : null);
  const from = request ? place(request.from) : null;
  const to = request ? place(request.to) : null;
  const area = growth.map.area || null;
  const places = growth.map.places || {};

  // The player's network from earlier demands, drawn muted when both ends are on this map.
  const legacyGroup = svg('g', { class: 'legacy-network' });
  const shown = new Set(growth.settlements.map((s) => s.id));
  const marked = new Set();
  for (const l of legacy) {
    const a = places[l.from];
    const b = places[l.to];
    if (!a || !b || (!inFrame(a) && !inFrame(b))) continue;
    const style = drawStyleFor(l.mediumId);
    if (style.startsWith('area-')) continue;
    drawLink(legacyGroup, legacyGroup, style, a, b, 1, true);
    // A network end that is not a settlement on this map still gets a small labelled site.
    for (const [id, name, p] of [[l.from, l.fromName, a], [l.to, l.toName, b]]) {
      if (shown.has(id) || marked.has(id) || !inFrame(p)) continue;
      marked.add(id);
      overlayTop.append(svg('circle', { cx: p.x, cy: p.y, r: 0.55, class: 'site-dot' }));
      overlayTop.append(svg('text', { x: p.x, y: p.y + 2.6, class: 'site-label', 'text-anchor': 'middle' }, name));
    }
  }
  overlay.append(legacyGroup);

  // The demand: a route between two settlements, or a service area.
  if (request) {
    const target = svg('g', { class: `demand${lit ? ' lit' : ''}` });
    if (area && request.population !== undefined) {
      target.append(svg('ellipse', { cx: area.x, cy: area.y, rx: area.rx, ry: area.ry, class: 'demand-area' }));
      if (from && inFrame(from)) target.append(svg('line', { x1: from.x, y1: from.y, x2: area.x, y2: area.y, class: 'demand-route' }));
      if (interactive) target.append(svg('ellipse', { cx: area.x, cy: area.y, rx: area.rx, ry: area.ry, class: 'build-target', 'data-action': 'BUILD' }));
    } else if (from && to) {
      target.append(svg('line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y, class: 'demand-route' }));
      if (interactive) target.append(svg('line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y, class: 'build-target', 'data-action': 'BUILD' }));
    }
    overlay.append(target);

    const buildGroup = svg('g', { class: 'builds' });
    const markGroup = svg('g', { class: 'build-marks' });
    builds.forEach((b, i) => {
      const style = drawStyleFor(b.mediumId);
      const progress = b.totalMonths > 0 ? Math.max(0, Math.min(1, (month - b.startMonth) / b.totalMonths)) : 1;
      if (style.startsWith('area-')) {
        if (area) drawArea(buildGroup, markGroup, style, area, from && inFrame(from) ? from : null, progress, b, b.mediumId);
      } else if (from && to) {
        const [a, c] = offsetLine(from, to, (i - (builds.length - 1) / 2) * 1.2);
        drawLink(buildGroup, markGroup, style, a, c, progress);
      }
    });
    overlay.append(buildGroup);
    overlayTop.append(markGroup);

    if (travel) {
      if (travel.kind === 'area' && area) {
        overlayTop.append(svg('ellipse', { cx: area.x, cy: area.y, rx: area.rx, ry: area.ry, class: `arrival-ring ${travel.outcome}`, id: `${idPrefix}-ring` }));
      } else if (from && to) {
        if (travel.outcome === 'late') {
          const d = lerp(from, to, travel.deadlineFraction);
          const flag = svg('g', { class: 'deadline-flag', id: `${idPrefix}-deadline` });
          flag.append(svg('line', { x1: d.x, y1: d.y, x2: d.x, y2: d.y - 3.2 }));
          flag.append(svg('path', { d: `M${d.x} ${d.y - 3.2}h2.2l-0.7 0.7 0.7 0.7h-2.2z` }));
          overlayTop.append(flag);
        }
        const p = lerp(from, to, travel.fraction);
        overlayTop.append(svg('circle', {
          id: `${idPrefix}-message`, class: `message-dot ${travel.outcome}`, cx: p.x, cy: p.y, r: 1.1,
          'data-x1': from.x, 'data-y1': from.y, 'data-x2': to.x, 'data-y2': to.y, 'data-fraction': travel.fraction,
          'data-seconds': travel.seconds, 'data-outcome': travel.outcome,
        }));
      }
    }
  }
  wrap.append(overlay);

  // Settlements: Blender sprites anchored at their real positions, with readable labels.
  const sprites = div('sprites');
  // Settlements closer than a sprite's width share one sprite (the largest) and one label.
  const RANK = { hamlet: 0, village: 1, town: 2, city: 3, metropolis: 4 };
  const groups = [];
  for (const s of [...growth.settlements].sort((p, q) => RANK[q.tier] - RANK[p.tier])) {
    const near = inFrame(s) && groups.find((g) => Math.hypot(g.lead.x - s.x, (g.lead.y - s.y) * 1.2) < 5.5);
    if (near) near.names.push(s.name);
    else groups.push({ lead: s, names: [s.name] });
  }
  for (const { lead: s, names } of groups) {
    if (!inFrame(s)) {
      // An arrow chip at the map edge, pointing toward a settlement beyond it.
      const ang = Math.atan2(s.y - 35, s.x - 50);
      const arrows = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
      const dir = arrows[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
      const chip = div('offmap', '', `${dir} ${s.name}`);
      chip.style.left = `${Math.max(1, Math.min(99, s.x))}%`;
      chip.style.top = `${(Math.max(1.5, Math.min(68.5, s.y)) / 70) * 100}%`;
      chip.style.transform = `translate(${s.x < 0 ? '0' : s.x > 100 ? '-100%' : '-50%'}, ${s.y < 0 ? '0' : s.y > 70 ? '-100%' : '-50%'})`;
      sprites.append(chip);
      continue;
    }
    const fig = document.createElement('figure');
    fig.className = `settlement tier-${s.tier}${s.y > 60 ? ' label-above' : ''}`;
    fig.dataset.id = s.id;
    const startTier = startTiers && startTiers[s.id];
    fig.setAttribute('style', `${pct(s)};width:${TIER_WIDTH[s.tier]}%;--sprite-origin:${SPRITE_ORIGIN_Y}%`);
    if (startTiers) fig.classList.add(startTier && startTier !== s.tier ? 'grew' : startTier ? 'same' : 'new');
    const im = document.createElement('img');
    im.src = `assets/sprites/${spriteFor(s)}.webp`;
    im.alt = '';
    im.draggable = false;
    const cap = document.createElement('figcaption');
    cap.textContent = names.join(' · ');
    fig.append(im, cap);
    sprites.append(fig);
  }
  wrap.append(sprites, overlayTop);

  // A scale bar from the real width of the rendered view, and a north arrow.
  const km = growth.map.widthKm;
  const nice = [1, 2, 5, 10, 20, 25, 50, 100, 150, 200];
  const len = nice.filter((n) => n <= km * 0.22).pop() || 1;
  // The scale bar takes the corner farthest from any settlement or edge chip on this map.
  const marks = growth.settlements.map((s) => ({ x: Math.max(0, Math.min(100, s.x)), y: Math.max(0, Math.min(70, s.y)) }));
  const corners = [['bl', { x: 8, y: 66 }], ['br', { x: 92, y: 66 }], ['tl', { x: 8, y: 4 }]];
  const clearance = ([, c]) => Math.min(...marks.map((m) => Math.hypot(m.x - c.x, (m.y - c.y) * 1.3)), 999);
  const corner = corners.reduce((best, c) => (clearance(c) > clearance(best) ? c : best))[0];
  const bar = div(`scale-bar ${corner}`);
  // The line is sized in units of the map's own width (cqw), so it stays true as the map scales.
  bar.append(div('scale-line', `width:${((len / km) * 100).toFixed(3)}cqw`), div('scale-text', '', `${len} km`));
  wrap.append(bar, div('north', '', 'N'));
  return wrap;
}

export function badgeAt(wrap, growth, request, text) {
  if (!request) return;
  const area = growth.map.area;
  const to = area && request.population !== undefined ? area : placeOf(growth, request.to);
  if (!to) return;
  const b = div('demand-badge', pct(to), text);
  b.setAttribute('aria-hidden', 'true');
  wrap.append(b);
}
