// rhythm-02 웹 빌드 본체. 판정·궤적 = judge.js(tools/sim/judge.mjs 복사), 시도 진행 = core.js, 수치·문구·색·소리 = data/*.json
import { compileLevel, tapToLevelMs, ballsAt, fingerSchedule } from './judge.js';
import { musicOnsets } from './music.js';
import { Attempt, checkpointFor, checkpoints, stageAt } from './core.js';
import { syncRound, syncResult, driftNew, driftFeed } from './calc.js';
import { AudioOut, noteOf } from './audio.js';
import { Renderer, mix } from './render.js';
import { Store } from './store.js';
import { ads } from './ads.js';

const Q = new URLSearchParams(location.search);
const TEST = Q.get('test') === '1';
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * clamp(u, 0, 1);

let D = null, store = null, lang = 'ko', A = null, R = null, G = null;
let state = 'loading';
let vt = 0; // 테스트 가상 시계(ms)
const now = () => (TEST ? vt : performance.now());
const STEP = 4; // 고정 스텝(ms)
let tickT = 0;
let P = null; // 플레이 세션
let menuTheme = null;
const ICON = {};

// ---------- 문구 ----------
const T = (k) => (D.strings[k] ? D.strings[k][lang] ?? D.strings[k].ko : k);
function setTxt(id, k) { const e = $(id); if (e) e.textContent = T(k); }
function setAria(el, k) { el.setAttribute('aria-label', T(k)); }
function icon(el, name, aria) { el.innerHTML = ICON[name] || ''; if (aria) setAria(el, aria); }

// ---------- 데이터 ----------
async function loadAll() {
  const j = (p) => fetch('data/' + p).then((r) => { if (!r.ok) throw new Error(p); return r.json(); });
  const t = (p) => fetch('data/' + p).then((r) => { if (!r.ok) throw new Error(p); return r.text(); });
  const [balance, palette, layout, sound, strings, manifest, lcGeom] = await Promise.all(['balance.json', 'palette.json', 'layout.json', 'sound.json', 'strings.json', 'manifest.json', 'levelcards/geom.json'].map(j));
  const levels = await Promise.all(manifest.levels.map((p) => j(p)));
  await Promise.all(manifest.icons.map(async (n) => { ICON[n] = await t(`icons/icon-${n}.svg`); }));
  const L = levels.map((lv) => compileLevel(lv, balance));
  return { bal: balance, palette, layout, sound, strings, levels, L, lcGeom };
}

// ---------- 화면 전환 ----------
const SCREENS = ['boot', 'title', 'levels', 'start', 'card', 'pause', 'result', 'guardian', 'sync'];
function show(...ids) { for (const s of SCREENS) $(s).classList.toggle('show', ids.includes(s)); hudVis(); }
function setTheme(theme) {
  menuTheme = theme;
  const r = document.documentElement.style, C = D.palette.common;
  r.setProperty('--bg', theme.bg1); r.setProperty('--menuBg', theme.bg1); r.setProperty('--floor', theme.floor);
  r.setProperty('--card', theme.cardBg); r.setProperty('--accent', theme.accent);
  r.setProperty('--ink', C.ink); r.setProperty('--ball', C.ball); r.setProperty('--drum', C.drumBody); r.setProperty('--skin', C.skin); r.setProperty('--track', C.hudTrack);
}
const themeOf = (i) => D.palette.themes[D.levels[i].theme_id];
function uiSnd() { if (A) A.play('ui_tap'); }

// ---------- 시계·판정 보정 ----------
const comp = () => D.bal.judge_clock.visual_comp_ms;
const LATE_GRACE = 34; // 늦음 실패 선언을 2프레임 늦춰 아직 도착하지 않은 탭 이벤트를 기다림(실패 시각 자체는 판정 값 그대로)

// ---------- 레벨 선택 ----------
const unlocked = (i) => i === 0 || (() => { const p = store.levels[D.levels[i - 1].id]; return !!(p && (p.cleared || p.practiceCleared)); })();
function lcardInner(i, big = false) {
  const lv = D.levels[i], g = D.lcGeom, p = store.levels[lv.id] || {};
  if (!unlocked(i)) return `<img src="data/levelcards/locked.svg" alt="">`;
  const b = g.bar, best = p.cleared ? 1 : (p.best || 0), C = D.palette.common;
  let o = '';
  if (best > 0) o += `<rect x="${b.x + 2}" y="${b.y + 2}" width="${((b.w - 4) * best).toFixed(1)}" height="${b.h - 4}" rx="3" fill="${C.drumBody}"/>`;
  if (best > 0 && best < 1) o += `<circle cx="${(b.x + b.w * best).toFixed(1)}" cy="${b.y + b.h / 2}" r="${g.dotR}" fill="${C.ball}" stroke="${C.ink}" stroke-width="2"/>`;
  void big;
  return `<img src="data/levelcards/level${lv.id}.svg" alt=""><svg viewBox="0 0 ${g.w} ${g.h}" aria-hidden="true">${o}</svg>`;
}
function gradesHtml(i) {
  const lv = D.levels[i], p = store.levels[lv.id] || {};
  let s = '';
  for (let k = 0; k < 3; k++) s += `<img src="data/levelcards/${k < (p.grade || 0) ? 'grade-fill-' + lv.id : 'grade-empty'}.svg" alt="">`;
  return s;
}
function statusKey(i) {
  const p = store.levels[D.levels[i].id] || {};
  if (!unlocked(i)) return 'levelcard_locked';
  if (p.cleared) return 'grade_' + Math.max(1, p.grade || 1);
  if (p.practiceCleared) return 'practice_clear';
  if (p.best > 0) return 'aria_best';
  return 'levelcard_new';
}
function buildGrid() {
  const grid = $('grid');
  grid.innerHTML = '';
  D.levels.forEach((lv, i) => {
    const cell = document.createElement('div'); cell.className = 'lcell'; cell.setAttribute('role', 'listitem');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'lcardBtn'; b.id = 'lv' + i;
    b.innerHTML = `<div class="lcard">${lcardInner(i)}</div>`;
    b.setAttribute('aria-label', `${T(lv.name_key)}, ${T(statusKey(i))}`);
    const p = store.levels[lv.id] || {};
    if (unlocked(i) && !p.cleared && p.best > 0) {
      const pb = document.createElement('div'); pb.className = 'sr'; pb.setAttribute('role', 'progressbar'); setAria(pb, 'aria_best');
      pb.setAttribute('aria-valuemin', '0'); pb.setAttribute('aria-valuemax', '100'); pb.setAttribute('aria-valuenow', String(Math.round(100 * p.best)));
      b.appendChild(pb);
    }
    if (!unlocked(i)) b.setAttribute('aria-disabled', 'true');
    b.addEventListener('click', () => { if (!unlocked(i)) return; uiSnd(); showStart(i); });
    cell.appendChild(b);
    const gr = document.createElement('div'); gr.className = 'grades'; gr.setAttribute('aria-hidden', 'true');
    gr.innerHTML = gradesHtml(i);
    if (!unlocked(i)) gr.style.visibility = 'hidden';
    cell.appendChild(gr);
    grid.appendChild(cell);
  });
  fitGrid();
}
function fitGrid() {
  if (!G) return;
  const W = innerWidth, H = innerHeight, portrait = H > W;
  const cols = portrait ? 2 : 5, rows = Math.ceil(D.levels.length / cols);
  const top = G.safeTop + 72, bottom = G.safeBottom + 8, gx = portrait ? 20 : 12, gy = 8, extra = 24;
  const ch = Math.min(150, (H - top - bottom - (rows - 1) * gy) / rows - extra, ((W - 32 - (cols - 1) * gx) / cols) * D.lcGeom.h / D.lcGeom.w);
  const cw = ch * D.lcGeom.w / D.lcGeom.h;
  const grid = $('grid');
  grid.style.top = top + 'px'; grid.style.bottom = bottom + 'px';
  grid.style.gridTemplateColumns = `repeat(${cols}, ${cw.toFixed(1)}px)`; grid.style.columnGap = gx + 'px'; grid.style.rowGap = gy + 'px';
  for (const el of grid.querySelectorAll('.lcard')) { el.style.width = cw.toFixed(1) + 'px'; el.style.height = ch.toFixed(1) + 'px'; }
}
function showLevels() {
  stopPlay();
  state = 'levels';
  setTheme(themeOf(0));
  buildGrid();
  $('lDrift').hidden = !store.drift.on;
  gateReset();
  show('levels');
}

// ---------- 보호자 문(길게 누르기 1.5 s) ----------
const gate = { down: false, t0: 0, hintUntil: 0 };
function gateReset() { gate.down = false; $('lGateBar').firstElementChild.style.width = '0%'; $('lGateBar').setAttribute('aria-valuenow', '0'); }
function gateFrame(t) {
  if (state !== 'levels') return;
  if (gate.down) {
    const u = clamp((t - gate.t0) / D.bal.menus.guardian_gate.hold_ms, 0, 1);
    $('lGateBar').firstElementChild.style.width = (100 * u).toFixed(1) + '%';
    $('lGateBar').setAttribute('aria-valuenow', String(Math.round(100 * u)));
    if (u >= 1) { gateReset(); uiSnd(); showGuardian(); }
  }
  $('lHint').hidden = !(t < gate.hintUntil);
}
function gateDown(e) { if (e) e.preventDefault(); if (state !== 'levels') return; gate.down = true; gate.t0 = now(); }
function gateUp() {
  if (!gate.down) return;
  const held = now() - gate.t0;
  gateReset();
  if (held < D.bal.menus.guardian_gate.hold_ms) gate.hintUntil = now() + 2000;
}

// ---------- 레벨 시작 판 ----------
let startIdx = 0;
function showStart(i) {
  startIdx = i; state = 'start';
  setTheme(themeOf(i));
  $('stCard').innerHTML = lcardInner(i, true);
  $('stGrades').innerHTML = gradesHtml(i);
  $('stCard').setAttribute('aria-label', T(D.levels[i].name_key));
  $('stReplay').hidden = !D.levels[i].card;
  $('stUnlock').hidden = TEST || !A || A.running;
  show('start');
}
function startLevel(i, practice) {
  const lv = D.levels[i], p = Store.lv(store, lv.id);
  if (lv.card && !p.seenCard) {
    showCard(i, () => { p.seenCard = true; Store.save(store); beginPlay(i, practice, lv.card.close_to_level_start_ms); });
  } else beginPlay(i, practice, lv.level_select_to_level_start_ms);
}

// ---------- 그림 카드 ----------
let cardDone = null, cardOpenAt = 0;
function showCard(i, done) {
  const lv = D.levels[i], portrait = innerHeight > innerWidth;
  state = 'card'; cardDone = done; cardOpenAt = now();
  setTheme(themeOf(i));
  const img = $('cdImg');
  img.src = `data/cards/${lv.card.id}${portrait ? '_portrait' : ''}.svg`;
  const size = () => {
    const nw = img.naturalWidth || (portrait ? 234 : 720), nh = img.naturalHeight || (portrait ? 896 : 336);
    const line = D.layout.text_slots.text_line_px, m = 16;
    const k = Math.min((innerWidth - 2 * m) / nw, (innerHeight - 2 * m - line - G.safeTop - G.safeBottom) / nh, 1.4);
    img.style.width = (nw * k).toFixed(1) + 'px'; img.style.height = (nh * k).toFixed(1) + 'px';
  };
  if (img.complete) size(); else img.onload = size;
  setTxt('cdText', lv.card.id);
  $('cdPanel').style.transition = 'none'; $('cdPanel').style.transform = 'scale(1)';
  show('card');
}
function closeCard() {
  if (state !== 'card') return;
  uiSnd();
  const done = cardDone; cardDone = null;
  if (done === 'back') { showStart(startIdx); return; }
  // 0.3 s 작아지며 사라짐(그동안 공은 북 위에 앉아 있음)
  const pnl = $('cdPanel');
  pnl.style.transition = 'transform 0.3s ease-in'; pnl.style.transform = 'scale(0)';
  done && done();
  $('card').classList.add('show', 'closing');
  setTimeout(() => { $('card').classList.remove('closing'); if (state !== 'card') $('card').classList.remove('show'); }, TEST ? 0 : 300);
}

// ---------- 플레이 ----------
function beginPlay(i, practice, leadMs) {
  stopPlay();
  const L = D.L[i];
  P = { i, L, practice, attempts: 0, best: 0, storedBest: practice ? 0 : (store.levels[L.level.id]?.best || 0), log: [], restarts: [], drift: driftNew(), failCount: 0,
    phase: 'run', popAt: -1e9, att: null, start: 0, fail: null, cp: null, hudBest: null, resultShown: false, buttonsShown: false };
  checkLatency();
  newAttempt(now() + leadMs, 0, 0);
  state = 'play';
  show();
  $('card').classList.toggle('show', false);
  $('hPrac').hidden = !practice;
  layoutHud();
}
function stopPlay() { if (A) A.stop(0.05); P = null; hudVis(); $('result').classList.remove('show'); }

function newAttempt(startAt, fromMs, carried) {
  const L = P.L;
  P.attempts++;
  P.att = new Attempt(L, { fromMs, carried, practice: P.practice });
  P.start = startAt - fromMs;
  P.phase = 'run';
  P.attemptStartAt = startAt;
  P.fx = [];
  P.hudBest = null;
  scheduleSong(fromMs);
  updateHudAria();
}
function songList(fromMs, start) {
  const L = P.L, S = D.sound;
  return musicOnsets(L.level, S).filter((o) => o.beat * L.beatMs >= fromMs - 0.5)
    .map((o) => ({ perf: start + o.beat * L.beatMs, name: o.sound, note: noteOf(S, L.level.id, o) }));
}
function scheduleSong(fromMs) { if (A && !TEST) A.setQueue(songList(fromMs, P.start)); }

function onPlayTap(ts) {
  P.popAt = now();
  if (P.phase !== 'run') { if (A) A.play('tap_empty'); return { kind: 'ignored' }; }
  const tau = tapToLevelMs(ts, P.start, D.bal);
  const r = P.att.tap(tau);
  if (r.kind === 'grade') {
    if (A) A.play('tap_' + r.grade);
    const c = P.L.contacts[r.i];
    P.fx.push({ i: r.i, ball: c.ball, grade: r.grade, launch: Math.max(tau, c.t) });
    if (driftFeed(P.drift, r.e, P.attempts, D.bal.drift_check)) driftOn();
    if (r.clear) onClear();
  } else if (r.kind === 'fail') {
    if (r.reason === 'early') { const c = P.L.contacts[P.att.fail.index]; if (driftFeed(P.drift, tau - c.t, P.attempts, D.bal.drift_check)) driftOn(); }
    onFail();
  } else if (A) A.play('tap_empty');
  updateHudAria();
  return r;
}

function onFail() {
  const L = P.L, f = P.att.fail, R0 = D.bal.restart;
  P.phase = 'fail';
  P.failPerf = P.start + f.timeMs + comp();
  P.nextStart = P.failPerf + R0.restart_delay_s * 1000;
  P.failCount++;
  P.firstFail = P.failCount === 1;
  const ltF = f.timeMs + comp();
  P.snap = { lt: ltF, balls: ballsAt(L, ltF, P.att.hits()), hits: P.att.hits() };
  const prog = P.att.progress;
  const prevBest = Math.max(P.best, P.storedBest);
  P.newBest = prog > prevBest && prevBest >= 0 && prog > 0;
  P.bestFrom = prevBest; P.bestTo = Math.max(prevBest, prog);
  P.best = Math.max(P.best, prog);
  if (!P.practice) { const s = Store.lv(store, L.level.id); if (prog > s.best) { s.best = prog; Store.save(store); } }
  P.log.push({ attempt: P.attempts, ...P.att.log(), failPerf: P.failPerf });
  // 다음 시도: 일반 = 레벨 처음, 연습 = 그 접촉 앞 받침 쉼
  if (P.practice) { const cp = checkpointFor(L, f.index); P.next = { fromMs: cp.t, carried: cp.firstContact }; }
  else P.next = { fromMs: 0, carried: 0 };
  P.nextBalls = ballsAt(L, P.next.fromMs, L.contacts.map((c, k) => (k < P.next.carried ? c.t : null)));
  if (A && !TEST) {
    A.stop(R0.phases_s[f.reason].music_stop[1]);
    A.play('fail');
    const list = songList(P.next.fromMs, P.nextStart - P.next.fromMs);
    if (P.newBest) list.push({ perf: P.failPerf + f.phases.still_best_dot[0] * 1000, name: 'best', music: false });
    A.setQueue(list);
  }
  if (P.newBest) $('live').textContent = T('new_best');
}
function onClear() {
  const L = P.L, lv = L.level, s = Store.lv(store, lv.id);
  P.phase = 'clear';
  P.rating = P.practice ? 0 : P.att.rating(D.bal.grade_rule);
  if (P.practice) s.practiceCleared = true;
  else { s.cleared = true; s.best = 1; s.grade = Math.max(s.grade || 0, P.rating); }
  Store.save(store);
  P.log.push({ attempt: P.attempts, ...P.att.log(), rating: P.rating });
  if (A && !TEST && L.clear) {
    const add = [{ perf: P.start + L.clear.launch, name: 'clear', music: false }];
    if (!P.practice) for (let k = 0; k < P.rating; k++) add.push({ perf: P.start + L.clear.gradeCloudMs[k], name: 'grade_cloud', music: false });
    A.add(add);
  }
}

function logic(t) {
  if (!P || (state !== 'play' && state !== 'result')) return;
  const lt = t - P.start;
  if (P.phase === 'run') {
    const r = P.att.tick(lt - comp() - LATE_GRACE);
    if (r && r.kind === 'fail') { onFail(); updateHudAria(); }
  } else if (P.phase === 'fail') {
    if (t >= P.nextStart) {
      const fp = P.failPerf;
      newAttempt(P.nextStart, P.next.fromMs, P.next.carried);
      P.awaitFirst = { failPerf: fp, attempt: P.attempts };
      if (TEST) { P.restarts.push({ attempt: P.attempts, ms: t - fp }); P.awaitFirst = null; }
    }
  } else if (P.phase === 'clear') {
    const C = P.L.clear;
    if (C && lt >= C.resultMs && !P.resultShown) showResult();
    if (C && lt >= C.resultButtonsMs && !P.buttonsShown) { P.buttonsShown = true; $('rBtns').hidden = false; }
  }
}
function showResult() {
  P.resultShown = true; state = 'result';
  setTheme(themeOf(P.i));
  const lv = P.L.level;
  setTxt('rName', lv.name_key);
  const last = P.i === D.levels.length - 1;
  setTxt('rTitle', last ? 'clear_last' : 'clear_title_' + Math.max(1, P.rating || 1));
  $('rNext').hidden = last;
  $('rBtns').hidden = true;
  $('result').classList.add('show');
  layoutResult();
}

// ---------- 그리기 ----------
const easeOut = (u) => 1 - (1 - u) * (1 - u), easeIn = (u) => u * u;
function drumLift(t) {
  const a = t - P.popAt, [up, dn] = D.layout.drum.tap_ms, L = D.layout.drum.tap_lift_of_d * G.d;
  if (a < 0 || a >= up + dn) return 0;
  return a < up ? L * easeOut(a / up) : L * (1 - easeIn((a - up) / dn));
}
function stageColor(lt, theme, fromMs) {
  const s = stageAt(P.L, lt, fromMs), k = (n) => theme['bg' + n];
  return mix(k(s.a), k(s.b), s.u);
}
// ballsAt 결과 → 화면 px
function ballPx(b, lt, lift) {
  const g = G, d = g.d, LY = D.layout;
  let x, bottom, sq = 1;
  if (b.state === 'entering') {
    const sb = P.L.secondBall.find((s) => lt >= s.enter[0] && lt < s.enter[1]);
    const hu = sb ? (sb.hopFrom - sb.enter[0]) / (sb.enter[1] - sb.enter[0]) : 0.75;
    const side = g.cx + g.dw / 2 + 0.6 * d, seat = g.cx + b.seatX * d;
    if (b.u < hu) { x = lerp(g.W + d, side, b.u / hu); bottom = g.floorTop; }
    else { const v = (b.u - hu) / (1 - hu); x = lerp(side, seat, v); bottom = lerp(g.floorTop, g.skinY - lift, v) - (b.hop || 0) * d; sq = v > 0.95 ? 0.92 : 1; }
  } else if (b.state === 'leaving') {
    const seat = g.cx + b.seatX * d, edge = g.cx + g.dw / 2 + 0.55 * d;
    if (b.u < 0.3) { x = lerp(seat, edge, b.u / 0.3); bottom = g.skinY - lift; }
    else if (b.u < 0.5) { const v = (b.u - 0.3) / 0.2; x = lerp(edge, edge + 0.4 * d, v); bottom = lerp(g.skinY, g.floorTop, easeIn(v)); }
    else { x = lerp(edge + 0.4 * d, g.W + d, (b.u - 0.5) / 0.5); bottom = g.floorTop; }
  } else {
    x = g.cx + (b.x ?? 0) * d;
    const onSkin = b.state === 'seated' || b.state === 'waiting' || b.state === 'fallen';
    bottom = onSkin ? g.skinY - lift : g.skinY - b.y * g.Hp;
    if (b.state === 'waiting' || b.state === 'fallen') sq = LY.tap_motion.wait_on_skin_sq;
    else if (b.state === 'seated' && b.bob) sq = 0.92;
    else if (b.flight && b.flight.kind !== 'toss' && lt - b.flight.launch < LY.tap_motion.depart_sq_ms) {
      const fx = P.fx.find((f) => f.i === b.flight.fromContact);
      sq = LY.tap_motion.depart_sq_by_grade[fx ? fx.grade : 'pass'];
    }
  }
  return { x, bottom, sq, scale: 1, shadow: (b.state !== 'entering' && b.state !== 'leaving' && b.state !== 'gone') ? { x, h: Math.max(0, b.y || 0) * g.Hp } : null };
}
// 실패 연출(30-art 7-1·7-2, balance restartPhases)
function failBalls(t) {
  const g = G, d = g.d, f = P.att.fail, ph = f.phases, u = (t - P.failPerf) / 1000, L = P.L;
  const fc = L.contacts[f.index], two = P.snap.balls.filter((b) => b.state !== 'gone').length > 1;
  const side = two ? (fc.ball === 1 ? -1 : 1) : (f.reason === 'early' ? -1 : 1);
  const m = ph.ball_fall_fx[1], edge = g.cx + side * (g.dw / 2 + 0.5 * d);
  const out = [];
  const shrink = u >= ph.ball_reappear_on_drum[0] ? clamp(1 - (u - ph.ball_reappear_on_drum[0]) / 0.1, 0, 1) : 1;
  for (const b of P.snap.balls) {
    if (b.state === 'gone') continue;
    const base = ballPx(b, P.snap.lt, 0);
    if (b.ball !== fc.ball) { out.push({ ...base, scale: shrink }); continue; }
    let x, bottom;
    if (f.reason === 'early' && b.flight) {
      const fl = b.flight, dur = fl.to - fl.launch, H = fl.apex, yF = -(g.floorTop - g.skinY) / g.Hp;
      const sF = (1 + Math.sqrt(Math.max(0, 1 - yF / Math.max(H, 1e-6)))) / 2, tauF = fl.launch + sF * dur;
      const fallDur = Math.max(0.05, m - D.layout.fail_fx.early.roll_s);
      const q = clamp((fl.to - P.snap.lt) / Math.max(1, tauF - P.snap.lt), 0.05, 1);
      if (u < fallDur) {
        const fr = u / fallDur, tau = P.snap.lt + (tauF - P.snap.lt) * fr, s = (tau - fl.launch) / dur;
        bottom = g.skinY - 4 * H * s * (1 - s) * g.Hp;
        x = lerp(base.x, edge, fr / (q * 0.95));
      } else { x = edge + side * 0.5 * d * easeOut(clamp((u - fallDur) / D.layout.fail_fx.early.roll_s, 0, 1)); bottom = g.floorTop; }
    } else {
      const lm = D.layout.fail_fx.late.motion_s, e1 = g.cx + side * (g.dw / 2 + 0.3 * d);
      const a = clamp(u / lm, 0, 1);
      if (a < 0.45) { x = lerp(base.x, e1, easeIn(a / 0.45)); bottom = g.skinY; }
      else if (a < 0.75) { const v = (a - 0.45) / 0.3; x = lerp(e1, e1 + side * 0.5 * d, v); bottom = lerp(g.skinY, g.floorTop, easeIn(v)); }
      else { x = e1 + side * (0.5 + 0.6 * easeOut((a - 0.75) / 0.25)) * d; bottom = g.floorTop; }
    }
    out.push({ x, bottom, sq: 1, scale: shrink, shadow: null });
  }
  if (u >= ph.ball_reappear_on_drum[0]) {
    const k = lerp(D.layout.restart_timeline_s.reappear_grow[0], D.layout.restart_timeline_s.reappear_grow[1], (u - ph.ball_reappear_on_drum[0]) / (ph.ball_reappear_on_drum[1] - ph.ball_reappear_on_drum[0]));
    for (const b of P.nextBalls) if (b.state === 'seated') out.push({ ...ballPx(b, P.next.fromMs, 0), scale: k });
  }
  return { balls: out, u, ph };
}
function draw(t) {
  if (!R || !G) return;
  if (!P) { drawIdle(); return; }
  if (state === 'pause' && P.pausedAt != null) t = P.pausedAt;
  const L = P.L, theme = themeOf(P.i), C = D.palette.common, lt = t - P.start, lift = drumLift(t);
  const scene = { theme, bg: theme.bg1, cloudFill: C.cloud, lift, glow: false, balls: [], shadows: [], lines: [], swing: false, finger: null, retry: false, grades: null, practiceFlag: false, hud: null };
  const flags = P.practice ? checkpoints(L).filter((c) => c.firstContact > 0).map((c) => c.firstContact / L.contacts.length) : [];
  let progress = P.att.progress, best = P.practice ? P.best : Math.max(P.best, P.storedBest), hudAlpha = 1;
  if (P.phase === 'fail') {
    const fb = failBalls(t);
    scene.bg = fb.u >= fb.ph.ball_reappear_on_drum[0] ? stageColor(P.next.fromMs, theme, P.next.fromMs) : stageColor(P.snap.lt, theme, P.att.fromMs);
    for (const b of fb.balls) { scene.balls.push(b); }
    for (const b of P.snap.balls) if (b.state !== 'gone' && b.ball !== L.contacts[P.att.fail.index].ball && fb.u < fb.ph.ball_reappear_on_drum[0]) { const p = ballPx(b, P.snap.lt, 0); if (p.shadow) scene.shadows.push(p.shadow); }
    scene.swing = P.att.fail.reason === 'early' && fb.u < fb.ph.swing_fx?.[1];
    scene.retry = P.firstFail && fb.u >= fb.ph.ball_fall_fx[1] && fb.u < fb.ph.ball_reappear_on_drum[0];
    if (P.newBest) { const s0 = fb.ph.still_best_dot[0]; best = fb.u < s0 ? P.bestFrom : lerp(P.bestFrom, P.bestTo, (fb.u - s0) / D.layout.restart_timeline_s.best_slide_s); }
  } else {
    if (P.awaitFirst && !TEST) { P.restarts.push({ attempt: P.awaitFirst.attempt, ms: t - P.awaitFirst.failPerf }); P.awaitFirst = null; }
    const balls = ballsAt(L, lt, P.att.hits());
    for (const b of balls) {
      if (b.state === 'gone') continue;
      const p = ballPx(b, lt, lift);
      scene.balls.push(p);
      if (p.shadow) scene.shadows.push(p.shadow);
    }
    scene.bg = stageColor(lt, theme, P.att.fromMs);
    for (const f of P.fx) {
      const age = (lt - f.launch) / 1000;
      if (age < 0 || age > D.layout.bounce_lines.dur_s) continue;
      const bx = balls.find((b) => b.ball === f.ball);
      scene.lines.push({ x: G.cx + ((bx && bx.x) ?? 0) * G.d, n: D.layout.bounce_lines.pairs_by_grade[f.grade], age });
      if (f.grade === 'perfect' && age < 0.15) scene.glow = true;
    }
    // L1 손가락(fingerSchedule 하나가 원본)
    const fs = fingerSchedule(L, D.bal, P.att.hits());
    if (fs && P.att.fromMs <= fs.from && lt >= fs.from && lt < fs.gone && P.phase === 'run') {
      scene.finger = { press: lt >= fs.pressStart, scale: clamp((lt - fs.from) / (1000 * D.layout.finger.appear_grow_s), 0, 1) };
    }
    showTut(!!scene.finger);
    if (P.phase === 'clear' && L.clear) {
      const C2 = L.clear;
      if (lt >= C2.launch) {
        const u = (lt - C2.launch) / 1000;
        scene.cloudFill = mix(C.cloud, theme.accent, u / D.layout.clear_timeline.cloud_blend_s);
        scene.bg = mix(stageColor(C2.launch, theme, P.att.fromMs), theme.bg1, u / D.layout.clear_timeline.bg_blend_s);
        if (P.practice) scene.practiceFlag = true;
        else scene.grades = { fill: [0, 1, 2].map((k) => (k < P.rating && lt >= C2.gradeCloudMs[k] ? lerp(D.layout.clear_timeline.grade_grow[0], D.layout.clear_timeline.grade_grow[1], (lt - C2.gradeCloudMs[k]) / (1000 * D.layout.clear_timeline.grade_grow_s)) : 0)) };
      }
      hudAlpha = clamp(1 - (lt - L.clearTimeMs) / 200, 0, 1);
    }
  }
  if (P.phase !== 'run') showTut(false);
  scene.hud = { alpha: hudAlpha, progress, best, attempts: P.attempts, flags };
  R.frame(scene);
}
let tutOn = false;
function showTut(on) { if (on !== tutOn) { tutOn = on; $('hTut').hidden = !on; } }
// 메뉴 뒤 바탕(레벨 1 앉은 공)
function drawIdle() {
  const theme = menuTheme || themeOf(0), g = G;
  R.frame({ theme, bg: theme.bg1, cloudFill: D.palette.common.cloud, lift: 0, glow: false, balls: [{ x: g.cx, bottom: g.skinY, sq: 1, scale: 1 }], shadows: [{ x: g.cx, h: 0 }], lines: [], swing: false, finger: null, retry: false, grades: null, practiceFlag: false, hud: null });
}

// HUD 대체 글: 값이 바뀔 때만 DOM 쓰기
const hudVals = {};
function setVal(id, v) { if (hudVals[id] !== v) { hudVals[id] = v; $(id).setAttribute('aria-valuenow', String(v)); } }
function updateHudAria() {
  if (!P) return;
  setVal('aProg', Math.round(100 * P.att.progress));
  setVal('aBest', Math.round(100 * (P.practice ? P.best : Math.max(P.best, P.storedBest))));
  setVal('aTries', P.attempts);
}
function layoutHud() {
  if (!G) return;
  const h = G.hud, b = h.bar;
  Object.assign($('hPause').style, { left: h.pause.x + 'px', top: h.pause.y + 'px' });
  Object.assign($('hPrac').style, { right: (G.W - b.x1) + 'px', top: (b.y + b.h + 4) + 'px' });
  Object.assign($('hTut').style, { top: (G.hudH + 4) + 'px' });
  $('aFlag').hidden = !(P && P.practice);
}
// 결과: 등급 칸 줄 아래 = 레벨 이름 작은 줄 → 클리어 제목 → 버튼(공은 구름 속, 북 위 빈자리)
function layoutResult() {
  if (!G) return;
  const gradeBottom = G.cloudEdgeY + 0.8 * G.d + 0.9 * G.d * 1.4 * 0.62 / 2;
  $('rText').style.marginTop = (gradeBottom + 6) + 'px';
  const tb = $('rText').getBoundingClientRect();
  $('rBtns').style.position = 'absolute';
  $('rBtns').style.top = Math.min(Math.max(tb.bottom, gradeBottom + 60) + 10, G.skinY - 8 - 64) + 'px';
  $('rBtns').style.left = '0'; $('rBtns').style.right = '0';
}

// ---------- 멈춤 ----------
function pauseGame(fromBg) {
  if (state !== 'play' || !P) return;
  P.pausedAt = now();
  if (A) A.stop(0.05);
  state = 'pause';
  setTheme(themeOf(P.i));
  setTxt('pTitle', fromBg ? 'paused_background' : 'pause_screen');
  soundIcon();
  show('pause');
}
function resumeGame() {
  if (state !== 'pause' || !P) return;
  const sh = now() - P.pausedAt;
  P.start += sh; P.popAt += sh; P.attemptStartAt += sh;
  if (P.phase === 'fail') { P.failPerf += sh; P.nextStart += sh; }
  if (A) { A.resume(); }
  state = 'play';
  show();
  if (A && !TEST) {
    const t = now(), lt = t - P.start;
    if (P.phase === 'fail') A.setQueue(songList(P.next.fromMs, P.nextStart - P.next.fromMs));
    else A.setQueue(songList(Math.max(P.att.fromMs, lt), P.start));
  }
}
function soundIcon() { const on = store.sound; icon($('pSound'), on ? 'sound_on' : 'sound_off', on ? 'btn_sound_off' : 'btn_sound_on'); }
function toggleSound() { store.sound = !store.sound; Store.save(store); if (A) A.setEnabled(store.sound); soundIcon(); uiSnd(); }

// ---------- 보호자 화면 ----------
function showGuardian() {
  state = 'guardian';
  const late = store.drift.on;
  $('gLate').hidden = !late;
  $('gKo').classList.toggle('on', lang === 'ko'); $('gEn').classList.toggle('on', lang === 'en');
  show('guardian');
  requestAnimationFrame(moreHint);
}
function moreHint() { const s = $('gScroll'); $('gMore').classList.toggle('on', s.scrollHeight - s.clientHeight - s.scrollTop > 4); }
function setLang(l) { lang = l; store.lang = l; Store.save(store); document.documentElement.lang = l; applyTexts(); showGuardian(); }

// ---------- 소리 맞추기 ----------
let SY = null;
function startSync() {
  const C = D.bal.sound_sync;
  state = 'sync';
  SY = { C, round: 0, diffs: [[], []], retries: 0, done: false, beatMs: 60000 / C.bpm, t0: now() + 1000 };
  if (A && !TEST) {
    const root = D.sound.music.levels[D.levels[0].id].root_hz;
    const list = [];
    for (let k = 0; k < 120; k++) list.push({ perf: SY.t0 + k * SY.beatMs, name: 'rest_a', note: root, offset: false });
    A.setQueue(list);
  }
  $('sRedo').hidden = true;
  $('sMsg').textContent = '';
  syncDots();
  show('sync');
}
function syncDots() {
  const box = $('sDots'), C = D.bal.sound_sync;
  if (!box.children.length) for (let k = 0; k < C.rounds * C.taps_per_round; k++) box.appendChild(document.createElement('i'));
  const filled = SY ? SY.diffs[0].length + SY.diffs[1].length : 0;
  [...box.children].forEach((el, k) => { const r = Math.floor(k / C.taps_per_round), i = k % C.taps_per_round; el.classList.toggle('on', !!SY && SY.diffs[r] && i < SY.diffs[r].length); });
  box.setAttribute('aria-valuenow', String(filled));
}
function syncTapDiff(diff) {
  if (!SY || SY.done) return;
  const C = SY.C, cur = SY.diffs[SY.round];
  cur.push(diff);
  if (cur.length >= C.taps_per_round) {
    const r = syncRound(cur, C);
    if (!r.ok) return syncRetry([SY.round]);
    if (SY.round + 1 < C.rounds) SY.round++;
    else {
      const res = syncResult(SY.diffs, C, D.bal.judge_clock.visual_comp_ms);
      if (!res.ok) return syncRetry([0, 1]);
      SY.done = true; SY.result = res;
      store.syncOffsetMs = res.offset; store.syncDone = true; store.drift = { on: false, sessions: 0 };
      if (A) { store.latRef = A.autoLatencyMs(); A.offsetMs = res.offset; }
      Store.save(store);
      $('sMsg').textContent = T('sync_done'); $('sRedo').hidden = false;
      if (A) A.stop(0.05);
    }
  }
  syncDots();
}
function syncRetry(rounds) {
  const C = SY.C;
  if (SY.retries >= C.max_retries) {
    SY.done = true; SY.result = { ok: false, kept: true };
    $('sMsg').textContent = T('sync_kept'); $('live').textContent = T('sync_kept'); $('sRedo').hidden = false;
    if (A) A.stop(0.05);
  } else {
    SY.retries++;
    for (const r of rounds) SY.diffs[r] = [];
    SY.round = Math.min(...rounds);
    $('sMsg').textContent = T('sync_again');
  }
  syncDots();
}
function syncTap(ts) {
  const art = $('sArt'); art.classList.add('pop'); setTimeout(() => art.classList.remove('pop'), 120);
  if (A) A.play('tap_empty');
  if (!SY || SY.done) return;
  const k = Math.round((ts - SY.t0) / SY.beatMs);
  if (k < 0) return;
  const diff = ts - (SY.t0 + k * SY.beatMs);
  syncTapDiff(diff);
}
function syncArt() {
  const C = D.palette.common, d = 40;
  $('sArt').innerHTML = `<rect x="${100 - 1.6 * d}" y="66" width="${3.2 * d}" height="${0.95 * d}" rx="${0.3 * d}" fill="${C.drumBody}" stroke="${C.ink}" stroke-width="3"/><rect x="${100 - 1.6 * d}" y="66" width="${3.2 * d}" height="${0.28 * d}" rx="${0.14 * d}" fill="${C.skin}" stroke="${C.ink}" stroke-width="3"/><ellipse cx="100" cy="${66 - d * 0.46}" rx="${d / 2 / 0.92}" ry="${d / 2 * 0.92}" fill="${C.ball}" stroke="${C.ink}" stroke-width="3"/>`;
}

// ---------- 밀림 감지 ----------
function driftOn() { if (!store.drift.on) { store.drift = { on: true, sessions: 1 }; Store.save(store); } }
function checkLatency() {
  if (!A || TEST || !A.ctx) return;
  const lat = A.autoLatencyMs();
  if (store.latRef == null) { store.latRef = lat; Store.save(store); return; }
  if (Math.abs(lat - store.latRef) > D.bal.drift_check.also_trigger_on.output_latency_change_ms) { store.latRef = lat; driftOn(); }
}

// ---------- 입력 ----------
function onTap(ts) {
  if (state === 'title') { if (A) A.unlock(); uiSnd(); showLevels(); return; }
  if (state === 'card') { closeCard(); return; }
  if (state === 'play' || state === 'result') return onPlayTap(ts);
  if (state === 'sync') return syncTap(ts);
  if (state === 'pause') return;
}
function bindInput() {
  document.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    if (A && !TEST && state !== 'title') { if (!A.running) A.resume(); }
    if (e.target.closest && e.target.closest('button, #gScroll')) return;
    if (state === 'play' || state === 'card' || state === 'sync' || state === 'result') e.preventDefault();
    onTap(TEST ? now() : e.timeStamp);
  }, { passive: false });
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key === 'Escape' && state === 'play') { pauseGame(false); return; }
    if (e.key !== ' ' && e.key !== 'Enter') return;
    if (e.target.closest && e.target.closest('button')) return;
    e.preventDefault();
    onTap(TEST ? now() : e.timeStamp);
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (state === 'play') pauseGame(true); if (A) A.suspend(); }
    else if (A && state !== 'pause') A.resume();
  });
  addEventListener('resize', resize);
  navigator.mediaDevices?.addEventListener?.('devicechange', () => { if (D && store.latRef != null) driftOn(); });
  const click = (id, fn) => $(id).addEventListener('click', fn);
  click('lBack', () => { uiSnd(); state = 'title'; setTheme(themeOf(0)); show('title'); });
  const gb = $('lGate');
  gb.addEventListener('pointerdown', gateDown);
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) gb.addEventListener(ev, gateUp);
  gb.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); gateDown(); } });
  gb.addEventListener('keyup', gateUp);
  click('stClose', () => { uiSnd(); showLevels(); });
  click('stPlay', () => { uiSnd(); if (A) A.unlock(); startLevel(startIdx, false); });
  click('stPractice', () => { uiSnd(); if (A) A.unlock(); startLevel(startIdx, true); });
  click('stReplay', () => { uiSnd(); showCard(startIdx, 'back'); });
  click('cdClose', () => closeCard());
  click('hPause', () => { uiSnd(); pauseGame(false); });
  click('pResume', () => { uiSnd(); resumeGame(); });
  click('pRetry', () => { uiSnd(); if (A) A.resume(); beginPlay(P.i, P.practice, D.levels[P.i].level_select_to_level_start_ms); });
  click('pLevels', () => { uiSnd(); if (A) A.resume(); showLevels(); });
  click('pSound', toggleSound);
  click('rLevels', () => { uiSnd(); showLevels(); });
  click('rRetry', () => { uiSnd(); beginPlay(P.i, P.practice, D.levels[P.i].level_select_to_level_start_ms); });
  click('rNext', () => { uiSnd(); const n = P.i + 1; if (n < D.levels.length) { startIdx = n; startLevel(n, false); } else showLevels(); });
  click('gBack', () => { uiSnd(); showLevels(); });
  click('gSync', () => { uiSnd(); startSync(); });
  click('gKo', () => { uiSnd(); setLang('ko'); });
  click('gEn', () => { uiSnd(); setLang('en'); });
  $('gScroll').addEventListener('scroll', moreHint);
  click('sBack', () => { uiSnd(); if (A) A.stop(0.05); SY = null; showGuardian(); });
  click('sSkip', () => { uiSnd(); if (A) A.stop(0.05); SY = null; showGuardian(); });
  click('sRedo', () => { uiSnd(); startSync(); });
  click('bootRetry', () => location.reload());
}

// ---------- 글·아이콘 넣기 ----------
function applyTexts() {
  document.title = T('title');
  $('cv').setAttribute('role', 'img'); setAria($('cv'), 'aria_play_area'); $('cv').removeAttribute('aria-hidden');
  setTxt('tTitle', 'title'); setTxt('tTapTxt', 'tap_to_start');
  icon($('tTap'), 'tap');
  icon($('lBack'), 'back', 'btn_back'); icon($('lGate'), 'settings', 'btn_settings'); icon($('lDrift'), 'look_ball', 'look_ball');
  setAria($('lGateBar'), 'hold_progress'); setTxt('lHint', 'guardian_hold'); setAria($('grid'), 'levels_screen');
  icon($('stClose'), 'close', 'btn_close'); icon($('stPractice'), 'practice', 'btn_practice'); icon($('stPlay'), 'play', 'tap_to_start'); icon($('stReplay'), 'card_replay', 'btn_card_replay');
  setTxt('stUnlock', 'audio_unlock');
  icon($('cdClose'), 'close', 'btn_close');
  icon($('hPause'), 'pause', 'btn_pause'); setTxt('hPrac', 'practice_on'); setTxt('hTut', 'tut_tap');
  setAria($('aProg'), 'aria_progress'); setAria($('aBest'), 'aria_best'); setAria($('aTries'), 'aria_attempts'); setAria($('aFlag'), 'aria_checkpoint');
  icon($('pResume'), 'resume', 'btn_resume'); icon($('pRetry'), 'retry', 'btn_retry'); icon($('pLevels'), 'levels', 'btn_levels'); soundIcon();
  icon($('rLevels'), 'levels', 'btn_levels'); icon($('rRetry'), 'retry', 'btn_retry'); icon($('rNext'), 'next', 'btn_next');
  icon($('gBack'), 'back', 'btn_back'); setTxt('gTitle', 'guardian_title'); setTxt('gIntro', 'guardian_intro');
  icon($('gSyncIcon'), 'sync'); setTxt('gSync', 'settings_sync'); icon($('gLateIcon'), 'look_ball'); setTxt('gLateTxt', 'sound_late'); setTxt('gSyncIntro', 'sync_intro');
  icon($('gLangIcon'), 'language'); setTxt('gLangTxt', 'settings_language'); setTxt('gKo', 'lang_ko'); setTxt('gEn', 'lang_en');
  // 언어 이름은 어느 언어 화면에서도 그 언어 자기 이름(10-lore 6절 10)
  $('gKo').textContent = D.strings.lang_ko.ko; $('gEn').textContent = D.strings.lang_en.en;
  icon($('sBack'), 'back', 'btn_back'); icon($('sSkip'), 'skip', 'btn_skip'); setTxt('sTitle', 'sync_screen'); setTxt('sSub', 'sync_with_grownup'); setTxt('sRedo', 'sync_redo');
  setAria($('sDots'), 'sync_progress');
  if (state === 'levels') buildGrid();
}

// ---------- 크기 ----------
function safeArea() {
  const p = document.createElement('div');
  p.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
  document.body.appendChild(p);
  const cs = getComputedStyle(p), r = { t: parseFloat(cs.paddingTop) || 0, b: parseFloat(cs.paddingBottom) || 0 };
  p.remove();
  return r;
}
function resize() {
  if (!R) return;
  const s = safeArea();
  G = R.resize(innerWidth, innerHeight, Math.min(3, devicePixelRatio || 1), s.t, s.b);
  layoutHud(); layoutResult(); if (state === 'levels') fitGrid();
}

// ---------- 루프 ----------
function frame() {
  const t = now();
  if (!TEST) {
    if (tickT < t - 250) tickT = t - 250;
    while (tickT + STEP <= t) { tickT += STEP; logic(tickT); }
    if (A) A.pump();
  }
  gateFrame(t);
  draw(t);
  hudVis();
  if (autoRT) autoRT();
  requestAnimationFrame(frame);
}
// HUD DOM 은 값이 바뀔 때만: 플레이 중에만 보이고, 클리어 뒤에는 멈춤 버튼도 숨김
let hudShown = null, pauseShown = null;
function hudVis() {
  const h = !!P && (state === 'play' || state === 'result'), pb = h && state === 'play' && P.phase !== 'clear';
  if (h !== hudShown) { hudShown = h; $('hud').hidden = !h; }
  if (pb !== pauseShown) { pauseShown = pb; $('hPause').hidden = !pb; }
}

// ---------- 미리 그리기(30-art 12절: 첫 프레임 튐 방지) ----------
async function warmup() {
  const off = document.createElement('canvas');
  const r2 = new Renderer(off, D); const g2 = r2.resize(innerWidth, innerHeight, Math.min(3, devicePixelRatio || 1), G.safeTop, G.safeBottom);
  const keepR = R, keepG = G, keepP = P;
  R = r2; G = g2;
  for (let i = 0; i < D.levels.length; i++) {
    const L = D.L[i];
    P = { i, L, practice: false, attempts: 1, best: 0.3, storedBest: 0.5, fx: [], popAt: 0, phase: 'run', att: new Attempt(L), start: 0, failCount: 1, firstFail: true };
    const cs = L.contacts;
    for (const t of [0, cs[0].t - 100, cs[0].t + 50, L.tosses[0].t + 100]) draw(t);
    for (const c of cs.slice(0, 3)) { P.att.tap(c.t); P.fx.push({ i: c.i, ball: c.ball, grade: 'perfect', launch: c.t }); draw(c.t + 30); }
    P.att = new Attempt(L); P.att.tap(cs[0].t - 300); if (P.att.fail) { onFailWarm(); for (const u of [100, 500, 700, 950]) draw(P.failPerf + u); }
    P.att = new Attempt(L); P.phase = 'run'; P.practice = true; draw(cs[0].t);
    if (L.clear) { P.att = new Attempt(L); for (const c of cs) P.att.tap(c.t); P.phase = 'clear'; P.rating = 3; P.practice = false; for (const t of [L.clear.launch + 100, L.clear.resultMs]) draw(t); P.practice = true; draw(L.clear.resultMs); }
  }
  R = keepR; G = keepG; P = keepP;
  tutOn = false; $('hTut').hidden = true;
  for (const L of D.L) musicOnsets(L.level, D.sound).forEach((o) => noteOf(D.sound, L.level.id, o)); // 곡 목록 계산 경로도 한 번
  const imgs = [];
  for (const lv of D.levels) {
    imgs.push(`data/levelcards/level${lv.id}.svg`, `data/levelcards/grade-fill-${lv.id}.svg`);
    if (lv.card) imgs.push(`data/cards/${lv.card.id}.svg`, `data/cards/${lv.card.id}_portrait.svg`);
  }
  imgs.push('data/levelcards/locked.svg', 'data/levelcards/grade-empty.svg');
  await Promise.all(imgs.map((src) => { const im = new Image(); im.src = src; return im.decode().catch(() => {}); }));
}
function onFailWarm() {
  const L = P.L, f = P.att.fail;
  P.phase = 'fail'; P.failPerf = f.timeMs + comp(); P.nextStart = P.failPerf + 1100; P.newBest = true; P.bestFrom = 0.1; P.bestTo = 0.3;
  P.snap = { lt: P.failPerf, balls: ballsAt(L, P.failPerf, P.att.hits()) };
  P.next = { fromMs: 0, carried: 0 }; P.nextBalls = ballsAt(L, 0, []);
}

// ---------- 테스트 훅 ----------
function stepTest(dt) {
  if (!TEST) return false;
  const end = vt + dt * 1000;
  while (vt < end - 1e-9) { vt = Math.min(end, vt + STEP); logic(vt); gateFrame(vt); }
  draw(vt);
  return true;
}
let autoRT = null;
// 일반 모드 실시간 완벽 입력: 실제 PointerEvent 를 판정 시각에 맞춰 보냄(rAF 루프 + 이벤트 경로 그대로)
function autoplayRealtime(offsetMs = 0, sigma = 0, seed = 1) {
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
  const done = new Set();
  return new Promise((resolve) => {
    const att0 = P ? P.attempts : 0;
    autoRT = () => {
      if (!P) { autoRT = null; resolve(api.summary()); return; }
      if (P.attempts !== att0 || P.phase === 'clear' || state === 'result') { autoRT = null; resolve(api.summary()); return; }
      if (P.phase !== 'run') return;
      const a = P.att, i = a.grades.length;
      const c = P.L.contacts[i];
      if (!c || done.has(i)) return;
      const target = P.start + c.t + comp() + offsetMs + (sigma ? gauss() * sigma : 0);
      if (target - performance.now() > 40) return;
      done.add(i);
      const fire = () => {
        while (performance.now() < target) { /* 짧은 대기 */ }
        const cv = $('cv');
        cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true, button: 0, clientX: innerWidth / 2, clientY: innerHeight * 0.85 }));
        cv.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true, button: 0 }));
      };
      const wait = target - performance.now() - 6;
      if (wait > 0) setTimeout(fire, wait); else fire();
    };
  });
}
const api = {
  ready: false,
  test: TEST,
  get state() { return state; },
  get phase() { return P ? P.phase : null; },
  get levelIndex() { return P ? P.i : startIdx; },
  get levelCount() { return D ? D.levels.length : 0; },
  get practice() { return P ? P.practice : false; },
  get progress() { return P ? P.att.progress : 0; },
  get attempts() { return P ? P.attempts : 0; },
  get best() { return P ? (P.practice ? P.best : Math.max(P.best, P.storedBest)) : 0; },
  get grade() { return P ? P.rating ?? 0 : 0; },
  loadLevel(i, opts = {}) { if (!D) return false; startIdx = i; if (opts.card) startLevel(i, !!opts.practice); else beginPlay(i, !!opts.practice, opts.leadMs ?? D.levels[i].level_select_to_level_start_ms); return true; },
  step(dt) { return stepTest(dt) ? state : false; },
  press() { return onTap(now()); },
  release() { return true; },
  // 판정 시계 레벨 ms 에 치기(테스트 모드): 그 판정 시각이 되는 화면 시각까지 진행 후 탭
  pressAt(judgeMs) {
    if (!TEST || !P) return null;
    const target = P.start + judgeMs + comp();
    if (target > vt) stepTest((target - vt) / 1000);
    return onTap(vt);
  },
  levelMs() { return P ? now() - P.start : null; },
  judgeMs() { return P ? now() - P.start - comp() : null; },
  contacts() { return P ? P.L.contacts.map((c) => ({ i: c.i, t: c.t, ball: c.ball, passStart: c.passStart, passEnd: c.passEnd, zoneStart: c.zoneStart })) : []; },
  perfectTaps(off = 0) { return P ? P.L.contacts.map((c) => c.t + off) : []; },
  hits() { return P ? P.att.hits() : []; },
  judgeLog() { return P ? P.att.grades.map(({ i, e, grade }) => ({ i, e, grade })) : []; },
  attemptLog() { return P ? P.log.map((x) => ({ ...x })) : []; },
  restartLog() { return P ? P.restarts.slice() : []; },
  balls() { return P ? ballsAt(P.L, now() - P.start, P.att.hits()) : []; },
  finger() { return P ? fingerSchedule(P.L, D.bal, P.att.hits()) : null; },
  frameInfo() { return { tut: tutOn, levelMs: P ? now() - P.start : null, phase: P ? P.phase : null }; },
  autoplay(off = 0, sigma = 0, seed = 1) {
    if (!P) return null;
    if (!TEST) return autoplayRealtime(off, sigma, seed);
    let s = seed >>> 0;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
    const att = P.attempts;
    for (const c of P.L.contacts.slice(P.att.grades.length)) {
      if (!P || P.attempts !== att || P.phase !== 'run') break;
      this.pressAt(c.t + off + (sigma ? gauss() * sigma : 0));
    }
    let guard = 0;
    while (P && P.attempts === att && P.phase !== 'fail' && state !== 'result' && guard++ < 4000) stepTest(0.05);
    return this.summary();
  },
  summary() { const h = P && P.log.length ? P.log[P.log.length - 1] : null; return { state, phase: P && P.phase, clear: !!(h && h.clear), grade: P ? P.rating ?? 0 : 0, attempts: P ? P.attempts : 0, progress: P ? P.att.progress : 0, last: h }; },
  show(name) { const m = { title: () => { state = 'title'; show('title'); }, levels: showLevels, guardian: showGuardian, sync: startSync, pause: () => pauseGame(false), start: () => showStart(startIdx), card: () => showCard(startIdx, 'back') }; m[name]?.(); return state; },
  showResultNow() { if (P) { P.rating = P.rating ?? 3; showResult(); $('rBtns').hidden = false; P.buttonsShown = true; } return state; },
  syncTap(diffMs) { syncTapDiff(diffMs); return SY ? { round: SY.round, retries: SY.retries, done: SY.done, result: SY.result || null, filled: SY.diffs.map((d) => d.length) } : null; },
  get offset() { return store.syncOffsetMs; },
  drift() { return { on: store.drift.on, sessions: store.drift.sessions, windows: P ? P.drift.windows.slice() : [], latRef: store.latRef, autoLat: A ? A.autoLatencyMs() : null }; },
  save() { return JSON.parse(JSON.stringify(store)); },
  layout() { return G; },
  audioTime() { return A && A.ctx ? A.ctx.currentTime : null; },
  audioState() { return A && A.ctx ? A.ctx.state : null; },
  lang() { return lang; },
  ads,
};
window.__game = api;

// ---------- 시작 ----------
async function boot() {
  const bootTxt = JSON.parse($('bootText')?.textContent || '{"ko":{},"en":{}}');
  const ql = Q.get('lang');
  let bl = ql || ((navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en');
  $('bootMsg').textContent = (bootTxt[bl] || bootTxt.ko).loading || '';
  if (Q.get('notext') === '1') document.body.classList.add('notext');
  try {
    D = await loadAll();
  } catch (e) {
    const t = bootTxt[bl] || bootTxt.ko;
    $('bootMsg').textContent = t.load_error || '';
    $('bootErrDetail').textContent = t.load_error_detail || '';
    $('bootRetry').setAttribute('aria-label', t.btn_retry || '');
    $('bootRetry').innerHTML = ICON.retry || '';
    $('bootErr').hidden = false;
    return;
  }
  store = Store.load();
  if (store.drift.on) { store.drift.sessions = (store.drift.sessions || 0) + 1; if (store.drift.sessions > D.bal.drift_check.max_sessions_shown) store.drift = { on: false, sessions: 0 }; Store.save(store); }
  lang = ql || store.lang || ((navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en');
  document.documentElement.lang = lang;
  if (!TEST) { A = new AudioOut(D.sound); A.enabled = store.sound; A.offsetMs = store.syncOffsetMs || 0; }
  setTheme(themeOf(0));
  R = new Renderer($('cv'), D);
  resize();
  bindInput();
  applyTexts();
  syncArt();
  ads.init();
  await warmup();
  state = 'title';
  show('title');
  api.ready = true;
  requestAnimationFrame(frame);
}
boot();
