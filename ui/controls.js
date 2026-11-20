// Signal Age · input, the game clock, focus, announcements, animations and dialogs.
// All state changes go through engine/state.js reduce(). Animations are decoration only: every result
// is already rendered as text before they start, and under prefers-reduced-motion none run.

import { createSession, currentRoundId, reduce, roundProgress } from '../engine/state.js';
import { buildFacts } from '../engine/sim.js';
import { noticeText, outcomeReport } from '../engine/feedback.js';
import { formatCost } from '../engine/scores.js';
import { renderHud, renderLedger, renderView } from './render.js';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TICK_MS = { play: 650, fast: 180 };

export function mount({ content, root }) {
  let state = createSession(content);
  const clock = { mode: 'pause', timer: null };
  let travel = null;
  let growth = null;
  const hud = document.getElementById('hud');
  const announcer = document.getElementById('announcer');
  const restartDialog = document.getElementById('restart-dialog');
  const ledgerDialog = document.getElementById('ledger-dialog');

  // Keep the layout's idea of the HUD height in step with the real HUD (it wraps on narrow windows).
  const syncHud = () => document.documentElement.style.setProperty('--hud-h', `${hud.offsetHeight}px`);
  if ('ResizeObserver' in window) new ResizeObserver(syncHud).observe(hud);

  function announce(text) {
    announcer.textContent = '';
    window.setTimeout(() => { announcer.textContent = text; }, 30);
  }

  // ---------- the game clock ----------

  function running() {
    const id = currentRoundId(state, content);
    if (state.view !== 'round' || !id || state.unavailable[id]) return false;
    const p = roundProgress(state, id);
    return !p.lastResult && !p.solved && !(state.notice && state.notice.code === 'NOTHING_BUILT');
  }

  function setClock(mode) {
    window.clearInterval(clock.timer);
    clock.timer = null;
    clock.mode = mode;
    if (mode !== 'pause' && running()) {
      clock.timer = window.setInterval(() => dispatch({ type: 'TICK', months: 1 }), TICK_MS[mode]);
    } else {
      clock.mode = 'pause';
    }
  }

  // ---------- message travel and growth animations ----------

  function placeDot(dot, f) {
    const x1 = +dot.dataset.x1; const y1 = +dot.dataset.y1; const x2 = +dot.dataset.x2; const y2 = +dot.dataset.y2;
    dot.setAttribute('cx', x1 + (x2 - x1) * f);
    dot.setAttribute('cy', y1 + (y2 - y1) * f);
  }

  function finishTravel() {
    if (!travel) return;
    window.cancelAnimationFrame(travel.raf);
    if (travel.dot && travel.dot.isConnected) placeDot(travel.dot, travel.target);
    if (travel.ring && travel.ring.isConnected) travel.ring.classList.remove('animating');
    if (travel.skip && travel.skip.isConnected) travel.skip.remove();
    travel = null;
  }

  function startTravel() {
    if (reducedMotion()) return;
    const wrap = root.querySelector('.map-wrap');
    const dot = document.getElementById('map-message');
    const ring = document.getElementById('map-ring');
    if (!wrap || (!dot && !ring)) return;
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.id = 'skip-travel';
    skip.className = 'secondary small-button skip-travel';
    skip.dataset.testid = 'skip-travel';
    skip.setAttribute('aria-keyshortcuts', 'Escape');
    skip.textContent = 'Skip animation';
    wrap.append(skip);
    if (ring) {
      ring.classList.add('animating');
      travel = { ring, skip, raf: 0, target: 1 };
      travel.raf = window.setTimeout(finishTravel, 1600);
      return;
    }
    const target = +dot.dataset.fraction;
    const seconds = +dot.dataset.seconds || 0;
    const duration = dot.dataset.outcome === 'stopped' ? 1300 : Math.min(3400, Math.max(900, 900 + 420 * Math.log10(1 + seconds)));
    placeDot(dot, 0);
    const t0 = performance.now();
    travel = { dot, skip, target, raf: 0 };
    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      placeDot(dot, target * p);
      if (p < 1) travel.raf = window.requestAnimationFrame(step);
      else finishTravel();
    };
    travel.raf = window.requestAnimationFrame(step);
  }

  function finishGrowth() {
    if (!growth) return;
    window.cancelAnimationFrame(growth.raf);
    if (growth.counter.isConnected) growth.counter.textContent = growth.final;
    growth = null;
  }

  function startGrowth() {
    const counter = document.getElementById('year-counter');
    if (!counter || reducedMotion()) return;
    root.querySelector('.game')?.classList.add('animate-growth');
    const year = (label) => Number((label.match(/-?\d+/) || [NaN])[0]);
    const a = year(counter.dataset.from);
    const b = year(counter.dataset.to);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return;
    const t0 = performance.now();
    growth = { counter, final: counter.dataset.to, raf: 0 };
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 1800);
      counter.textContent = counter.dataset.to.replace(/-?\d+/, String(Math.round(a + (b - a) * (1 - (1 - p) ** 3))));
      if (p < 1) growth.raf = window.requestAnimationFrame(step);
      else finishGrowth();
    };
    growth.raf = window.requestAnimationFrame(step);
  }

  // ---------- rendering ----------

  function draw(focusId) {
    finishTravel();
    finishGrowth();
    const activeId = document.activeElement && document.activeElement.id;
    const side = root.querySelector('.side');
    const scroll = side ? side.scrollTop : 0;
    const oldImg = root.querySelector('.map-img:not(.fade-out)');
    document.body.dataset.era = String(state.levelIndex + 1);
    document.body.dataset.view = state.view;
    hud.replaceChildren(...renderHud(state, content, clock));
    const view = renderView(state, content, clock);
    const newImg = view.querySelector('.map-img:not(.fade-out)');
    if (oldImg && newImg && oldImg.getAttribute('src') === newImg.getAttribute('src') && !newImg.classList.contains('fade-in')) {
      newImg.replaceWith(oldImg);       // keep the decoded map image: no flicker on every tick
    }
    root.replaceChildren(view);
    const newSide = root.querySelector('.side');
    if (newSide) newSide.scrollTop = scroll;
    const target = document.getElementById(focusId || activeId || '');
    if (target && !target.disabled) target.focus({ preventScroll: !focusId });
    else if (focusId) document.getElementById('view-heading')?.focus();
  }

  function focusAfter(action, previous) {
    const id = currentRoundId(state, content);
    const p = id ? roundProgress(state, id) : null;
    switch (action.type) {
      case 'SELECT': return `tool-${action.mediumId}`;
      case 'BUILD': return state.notice ? 'notice-text' : 'builds-heading';
      case 'TICK':
      case 'SKIP':
        if (p && p.lastResult && !roundProgress(previous, id).lastResult) return 'report-heading';
        return state.notice && state.notice !== previous.notice ? 'notice-text' : '';
      case 'RETRY': return state.selectedMediumId ? `tool-${state.selectedMediumId}` : 'view-heading';
      case 'HINT': return p.hintStage >= 2 ? 'hint-2' : 'hint';
      case 'WORKED_SOLUTION': return 'worked-heading';
      case 'RESTART_CANCEL': return 'restart';
      default: return 'view-heading';
    }
  }

  function dispatch(action) {
    const previous = state;
    state = reduce(state, action, content);
    if (action.type === 'RESTART_REQUEST') {
      setClock('pause');
      draw('');
      if (!restartDialog.open) restartDialog.showModal();
      document.getElementById('restart-cancel').focus();
      return;
    }
    if (state === previous) return;
    if (action.type === 'RESTART_CANCEL' || action.type === 'RESTART_CONFIRM') {
      if (restartDialog.open) restartDialog.close();
    }
    if (!running() && clock.mode !== 'pause') setClock('pause');
    draw(focusAfter(action, previous));

    const id = currentRoundId(state, content);
    const p = id ? roundProgress(state, id) : null;
    const before = id ? roundProgress(previous, id) : null;
    if (state.notice && state.notice !== previous.notice) announce(noticeText(content, state.notice));
    if (action.type === 'SELECT') root.querySelector('.tool-card')?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
    if (action.type === 'BUILD' && p && p.builds.length > before.builds.length) {
      const b = p.builds[p.builds.length - 1];
      const f = buildFacts(content, id, b.mediumId);
      announce(`Building ${f.name} for ${formatCost(f.cost)}. Ready in month ${b.startMonth + f.totalBuildMonths}. Run the clock when you are ready.`);
    }
    if (p && p.lastResult && !before.lastResult) {
      announce(outcomeReport(content, id, p.lastResult).headline);
      startTravel();
    }
    if (state.view === 'transition' && previous.view !== 'transition') startGrowth();
  }

  // ---------- events ----------

  document.addEventListener('click', (event) => {
    if (event.target.closest('#skip-travel')) {
      finishTravel();
      return;
    }
    const clockButton = event.target.closest('[data-clock]');
    if (clockButton && !clockButton.disabled) {
      setClock(clockButton.dataset.clock);
      draw('');
      return;
    }
    if (event.target.closest('[data-ledger]')) {
      setClock('pause');
      draw('');
      document.getElementById('ledger-body').replaceChildren(renderLedger(state, content));
      ledgerDialog.showModal();
      document.getElementById('ledger-close').focus();
      return;
    }
    const el = event.target.closest('[data-action]');
    if (!el || el.disabled || (!root.contains(el) && !hud.contains(el))) return;
    const type = el.dataset.action;
    dispatch(type === 'SELECT' ? { type, mediumId: el.dataset.medium } : { type });
  });
  document.getElementById('restart-confirm').addEventListener('click', () => { setClock('pause'); dispatch({ type: 'RESTART_CONFIRM' }); });
  document.getElementById('restart-cancel').addEventListener('click', () => dispatch({ type: 'RESTART_CANCEL' }));
  restartDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    dispatch({ type: 'RESTART_CANCEL' });
  });
  document.getElementById('ledger-close').addEventListener('click', () => {
    ledgerDialog.close();
    document.getElementById('ledger')?.focus();
  });
  // The build menu is one tab stop: arrow keys, Home and End move between technologies.
  root.addEventListener('keydown', (event) => {
    const tool = event.target.closest && event.target.closest('.toolbar .tool');
    if (!tool) return;
    const tools = [...root.querySelectorAll('.toolbar .tool')];
    const i = tools.indexOf(tool);
    const next = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: tools.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = tools[(next + tools.length) % tools.length];
    tools.forEach((t) => t.setAttribute('tabindex', t === target ? '0' : '-1'));
    target.focus();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || restartDialog.open || ledgerDialog.open) return;
    if (travel) {
      event.preventDefault();
      finishTravel();
    } else if (state.view === 'transition') {
      event.preventDefault();
      dispatch({ type: 'TRANSITION_DONE' });
    }
  });

  draw('view-heading');
  return {
    getState: () => state,
    dispatch,
    clock: () => clock.mode,
    setClock,
    isAnimating: () => ({ travel: Boolean(travel), growth: Boolean(growth) }),
  };
}
