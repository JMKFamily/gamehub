// rhythm-02 웹 빌드 본체 (round-2 "흘러오는 길" + 콤보). 판정·궤적·세상 위치·콤보·이어 하기 = judge.js(tools/sim/judge.mjs 복사),
// 시도 진행 = core.js, 수치·문구·색·소리 = data/*.json. 세계 층은 판정과 같은 레벨 시계(worldX)로만 그림(프레임 수와 무관).
import { compileLevel, tapToLevelMs, ballsAt, fingerSchedule, worldX, scrollBeatAt, pxPerBeat, objectsAt, comboEvents, resumePoint, firstVisibleMs, pctOf, pctEvents, levelAccuracy } from './judge.js';
import { musicOnsets, noteOf } from './music.js';
import { Attempt, checkpointFor, checkpoints, stageAt, comboNow } from './core.js';
import { syncRound, syncResult, driftNew, driftFeed } from './calc.js';
import { AudioOut } from './audio.js';
import { Renderer, mix } from './render.js';
import { Store } from './store.js';
import { ads } from './ads.js';

window.__gameBooted = true;
const Q = new URLSearchParams(location.search);
const TEST = Q.get('test') === '1';
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * clamp(u, 0, 1);
const easeOut = (u) => 1 - (1 - u) * (1 - u), easeIn = (u) => u * u;

let D = null, store = null, lang = 'ko', A = null, R = null, G = null;
let state = 'loading';
let vt = 0; // 테스트 가상 시계(ms)
const now = () => (TEST ? vt : performance.now());
const STEP = 4; // 고정 스텝(ms)
let tickT = 0;
let P = null; // 플레이 세션
let menuTheme = null;
let judgeOn = true; // 판정 이름·% 표시(설정 훅으로 끔). 판정과 무관
let comboOn = true; // 콤보 표시·화음(설정 훅으로 끔). 판정과 무관 — 끄면 그리기·소리만 빠짐
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
// 늦음 실패 선언 유예 = 한 프레임(측정한 프레임 간격, 12~34 ms). 프레임에 맞춰 늦게 배달되는 탭 이벤트를 기다림. 실패 시각 자체는 판정 값(통과 창 끝) 그대로(round-1 N2: 34 → 약 17 ms)
let frameDt = 16.7;
const lateGrace = () => clamp(frameDt, 12, 34);

// ---------- 레벨 선택 ----------
const unlocked = (i) => i === 0 || (() => { const p = store.levels[D.levels[i - 1].id]; return !!(p && (p.cleared || p.practiceCleared)); })();
// 카드 위에 겹쳐 그림(진행도 채움·점·최고 콤보 금빛 네모). cards.mjs levelCard 와 같은 좌표(data/levelcards/geom.json)
function overlaySvg(i) {
  const lv = D.levels[i], g = D.lcGeom, p = store.levels[lv.id] || {}, C = D.palette.common;
  if (!unlocked(i)) return '';
  const b = g.bar, best = p.cleared ? 1 : (p.best || 0), K = g.combo;
  let o = '';
  if (best > 0) o += `<rect x="${b.x + 2}" y="${b.y + 2}" width="${((b.w - 4) * best).toFixed(1)}" height="${b.h - 4}" rx="3" fill="${C.drumBody}"/>`;
  if (best > 0 && best < 1) o += `<circle cx="${(b.x + b.w * best).toFixed(1)}" cy="${b.y + b.h / 2}" r="${g.dotR}" fill="${C.ball}" stroke="${C.ink}" stroke-width="2"/>`;
  for (let k = 0; k < Math.min(K.max, Math.floor((p.bestCombo || 0) / K.per)); k++) o += `<rect x="${K.x + k * K.dx}" y="${K.y}" width="${K.size}" height="${K.size}" rx="${K.rx}" fill="${C.glow}" stroke="${C.ink}" stroke-width="${K.stroke}"/>`;
  return `<svg viewBox="0 0 ${g.w} ${g.h}" aria-hidden="true">${o}</svg>`;
}
function cardImg(i) { return unlocked(i) ? `data/levelcards/level${D.levels[i].id}.svg` : 'data/levelcards/locked.svg'; }
function gradesHtml(i) {
  const lv = D.levels[i], p = store.levels[lv.id] || {};
  let s = '';
  for (let k = 0; k < 3; k++) s += `<img src="data/levelcards/${k < (p.grade || 0) ? 'grade-fill-' + lv.id : 'grade-empty'}.svg" alt="">`;
  return s;
}
// 상태 키(10-lore 7-2·N19): 잠김 / 아직 안 해 봄 / 등급 / 연습으로 깸. 해 봤지만 못 깬 레벨은 이름만 + progressbar(버튼 밖)
function statusKey(i) {
  const p = store.levels[D.levels[i].id] || {};
  if (!unlocked(i)) return 'levelcard_locked';
  if (p.cleared) return 'grade_' + Math.max(1, p.grade || 1);
  if (p.practiceCleared) return 'practice_clear';
  if (p.best > 0) return null;
  return 'levelcard_new';
}
function cardLabel(i) { const k = statusKey(i); return T(D.levels[i].name_key) + (k ? ', ' + T(k) : ''); }
// 격자는 불러올 때(그리고 언어를 바꿀 때) 한 번 만들고, 레벨 선택에 들어올 때는 바뀐 칸만 고침(round-1 N1: 첫 탭 긴 프레임의 절반)
function buildGrid() {
  const grid = $('grid');
  grid.innerHTML = '';
  D.levels.forEach((lv, i) => {
    const cell = document.createElement('div'); cell.className = 'lcell'; cell.setAttribute('role', 'listitem');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'lcardBtn'; b.id = 'lv' + i;
    b.innerHTML = `<div class="lcard"><img alt=""></div>`;
    b.addEventListener('click', () => { if (!unlocked(i)) return; uiSnd(); showStart(i); });
    cell.appendChild(b);
    const ov = document.createElement('div'); ov.className = 'lover'; ov.setAttribute('aria-hidden', 'true'); cell.appendChild(ov);
    // 최고 기록 막대·최고 콤보 대체 글: 버튼 안이 아니라 같은 칸의 형제(R2-D7, 버튼 aria-label 안의 자식은 낭독되지 않음)
    const pb = document.createElement('div'); pb.className = 'sr'; pb.setAttribute('role', 'progressbar'); pb.setAttribute('aria-valuemin', '0'); pb.setAttribute('aria-valuemax', '100'); pb.dataset.k = 'best'; cell.appendChild(pb);
    const mc = document.createElement('div'); mc.className = 'sr'; mc.setAttribute('role', 'meter'); mc.setAttribute('aria-valuemin', '0'); mc.setAttribute('aria-valuemax', String(D.L[i].contacts.length)); mc.dataset.k = 'combo'; cell.appendChild(mc);
    const gr = document.createElement('div'); gr.className = 'grades'; gr.setAttribute('aria-hidden', 'true'); cell.appendChild(gr);
    cell._k = null;
    grid.appendChild(cell);
  });
  refreshGrid(true);
}
function refreshGrid(force = false) {
  const cells = $('grid').children;
  D.levels.forEach((lv, i) => {
    const cell = cells[i], p = store.levels[lv.id] || {};
    const key = [unlocked(i), p.best, p.grade, p.cleared, p.practiceCleared, p.bestCombo, lang].join('|');
    if (!force && cell._k === key) return;
    cell._k = key;
    const b = cell.querySelector('button'), img = b.querySelector('img');
    const src = cardImg(i); if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    b.setAttribute('aria-label', cardLabel(i));
    if (unlocked(i)) b.removeAttribute('aria-disabled'); else b.setAttribute('aria-disabled', 'true');
    cell.querySelector('.lover').innerHTML = overlaySvg(i);
    const pb = cell.querySelector('[data-k="best"]'), mc = cell.querySelector('[data-k="combo"]');
    const showBest = unlocked(i) && (p.best > 0 || p.cleared);
    pb.hidden = !showBest; if (showBest) { setAria(pb, 'aria_best'); pb.setAttribute('aria-valuenow', String(Math.round(100 * (p.cleared ? 1 : p.best)))); }
    const showCombo = unlocked(i) && (p.bestCombo || 0) > 0;
    mc.hidden = !showCombo; if (showCombo) { setAria(mc, 'aria_best_combo'); mc.setAttribute('aria-valuenow', String(p.bestCombo)); mc.setAttribute('aria-valuetext', String(p.bestCombo)); }
    const gr = cell.querySelector('.grades'); gr.innerHTML = gradesHtml(i); gr.style.visibility = unlocked(i) ? '' : 'hidden';
  });
  fitGrid();
}
function fitGrid() {
  if (!G || !D) return;
  const W = innerWidth, H = innerHeight, portrait = H > W;
  const cols = portrait ? 2 : 5, rows = Math.ceil(D.levels.length / cols);
  const top = G.safeTop + 72, bottom = G.safeBottom + 8, gx = portrait ? 20 : 12, gy = 8, extra = 24;
  const ch = Math.min(150, (H - top - bottom - (rows - 1) * gy) / rows - extra, ((W - 32 - (cols - 1) * gx) / cols) * D.lcGeom.h / D.lcGeom.w);
  const cw = ch * D.lcGeom.w / D.lcGeom.h;
  const grid = $('grid');
  grid.style.top = top + 'px'; grid.style.bottom = bottom + 'px';
  grid.style.gridTemplateColumns = `repeat(${cols}, ${cw.toFixed(1)}px)`; grid.style.columnGap = gx + 'px'; grid.style.rowGap = gy + 'px';
  for (const el of grid.querySelectorAll('.lcard, .lover')) { el.style.width = cw.toFixed(1) + 'px'; el.style.height = ch.toFixed(1) + 'px'; }
}
function showLevels() {
  stopPlay();
  state = 'levels';
  setTheme(themeOf(0));
  refreshGrid();
  $('lDrift').hidden = !store.drift.on;
  gateReset();
  show('levels');
}

// ---------- 보호자 문(길게 누르기) ----------
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
  const h = !(t < gate.hintUntil);
  if ($('lHint').hidden !== h) $('lHint').hidden = h;
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
  const p = store.levels[D.levels[i].id] || {};
  $('stCard').innerHTML = `<img src="${cardImg(i)}" alt="">${overlaySvg(i)}`;
  $('stCard').setAttribute('aria-label', T(D.levels[i].name_key));
  $('stGrades').innerHTML = gradesHtml(i);
  const gk = p.cleared ? 'grade_' + Math.max(1, p.grade || 1) : p.practiceCleared ? 'practice_clear' : null;
  if (gk) { $('stGrades').setAttribute('role', 'img'); setAria($('stGrades'), gk); $('stGrades').removeAttribute('aria-hidden'); }
  else { $('stGrades').removeAttribute('role'); $('stGrades').removeAttribute('aria-label'); $('stGrades').setAttribute('aria-hidden', 'true'); }
  $('stReplay').hidden = !D.levels[i].card;
  $('stUnlockRow').hidden = TEST || !A || A.running;
  show('start');
}
function startLevel(i, practice) {
  const lv = D.levels[i], p = Store.lv(store, lv.id);
  if (lv.card && !p.seenCard) {
    showCard(i, () => { p.seenCard = true; Store.save(store); beginPlay(i, practice, lv.card.close_to_level_start_ms); });
  } else beginPlay(i, practice, lv.level_select_to_level_start_ms);
}

// ---------- 그림 카드 ----------
let cardDone = null;
function showCard(i, done) {
  const lv = D.levels[i], portrait = innerHeight > innerWidth;
  state = 'card'; cardDone = done;
  setTheme(themeOf(i));
  const img = $('cdImg');
  img.src = `data/cards/${lv.card.id}${portrait ? '_portrait' : ''}.svg`;
  const size = () => {
    const nw = img.naturalWidth || (portrait ? 234 : 720), nh = img.naturalHeight || (portrait ? 896 : 336);
    const line = D.layout.text_slots.text_line_px, m = 16; // m = cards.mjs CARD.screenMargin (DEV_NOTES N7)
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
  P = { i, L, practice, attempts: 0, best: 0, storedBest: practice ? 0 : (store.levels[L.level.id]?.best || 0), log: [], restarts: [], resumes: [], drift: driftNew(), failCount: 0,
    phase: 'run', pop: { at: -1e9, holdUntil: null }, att: null, start: 0, ev: null, evRes: null, comboSeen: 0, resultShown: false, buttonsShown: false };
  checkLatency();
  newAttempt(now() + leadMs, { fromMs: 0, startIndex: 0 });
  state = 'play';
  show();
  $('card').classList.toggle('show', false);
  layoutHud();
}
function stopPlay() { if (A) A.stop(0.05); P = null; hudVis(); $('result').classList.remove('show'); showTut(false); showPrac(false); }

function newAttempt(startAt, seg) {
  const L = P.L;
  P.attempts++;
  P.att = new Attempt(L, { fromMs: seg.fromMs, startIndex: seg.startIndex, carried: null, practice: P.practice });
  P.start = startAt - seg.fromMs;
  P.phase = 'run';
  P.attemptStartAt = startAt;
  P.pop = { at: -1e9, holdUntil: null };
  P.comboSeen = 0;
  scheduleSong(seg.fromMs);
  updateHudAria();
}
function songList(fromMs, start) {
  const L = P.L, S = D.sound;
  return musicOnsets(L.level, S).filter((o) => o.beat * L.beatMs >= fromMs - 0.5)
    .map((o) => ({ perf: start + o.beat * L.beatMs, name: o.sound, note: noteOf(S, L.level.id, o) }));
}
function scheduleSong(fromMs) { if (A && !TEST) A.setQueue(songList(fromMs, P.start)); }
// 콤보 사건(grades 에서 파생): 결과가 바뀔 때만 다시 계산
function evNow() { if (P.evRes !== P.att.res) { P.evRes = P.att.res; P.ev = comboEvents(P.L, P.att.res); } return P.ev; }
const comboVisible = (lt) => comboNow(evNow(), lt - comp(), lt);

function onPlayTap(ts) {
  const t = now();
  P.pop = { at: t, holdUntil: null };
  if (P.phase !== 'run') { if (A) A.play('tap_empty'); return { kind: 'ignored' }; }
  const tau = tapToLevelMs(ts, P.start, D.bal);
  const r = P.att.tap(tau);
  if (r.kind === 'grade') {
    if (A) A.play('tap_' + r.grade);
    const c = P.L.contacts[r.i];
    if (tau < c.t) P.pop.holdUntil = P.start + c.t; // 이른 통과: 북이 올라간 자세로 접촉 시각까지(N4, layout tap_motion.early_hold)
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
  const hits = P.att.hits();
  P.snap = { lt: ltF, balls: ballsAt(L, ltF, hits), hits, startIndex: P.att.opt.startIndex, combo: comboOn ? comboNow(evNow(), f.timeMs, ltF) : 0 };
  const prog = P.att.progress;
  const prevBest = Math.max(P.best, P.storedBest);
  P.newBest = prog > prevBest && prog > 0;
  P.bestFrom = prevBest; P.bestTo = Math.max(prevBest, prog);
  P.best = Math.max(P.best, prog);
  if (!P.practice) { const s = Store.lv(store, L.level.id); let ch = false; if (prog > s.best) { s.best = prog; ch = true; } if (P.att.res.grades.length > s.bestCombo) { s.bestCombo = P.att.res.grades.length; ch = true; } if (ch) Store.save(store); }
  P.log.push({ attempt: P.attempts, ...P.att.log(), failPerf: P.failPerf });
  // 다음 시도: 일반 = 레벨 처음, 연습 = 그 접촉 앞 받침 쉼(콤보 0부터)
  if (P.practice) { const cp = checkpointFor(L, f.index); P.next = { fromMs: cp.t, startIndex: cp.firstContact }; }
  else P.next = { fromMs: 0, startIndex: 0 };
  P.nextBalls = ballsAt(L, P.next.fromMs, []);
  if (A && !TEST) {
    A.stop(f.phases.music_stop[1]);
    A.play(f.reason === 'bump_roof' ? 'roof_bump' : 'fail');
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
  P.accuracy = levelAccuracy(L, P.att.res, { practice: P.practice });
  P.comboFinal = P.att.res.grades.length;
  P.accNew = false;
  if (P.practice) s.practiceCleared = true;
  else {
    s.cleared = true; s.best = 1; s.grade = Math.max(s.grade || 0, P.rating); s.bestCombo = Math.max(s.bestCombo || 0, P.comboFinal);
    if (P.accuracy != null && P.accuracy > (s.bestAccuracy ?? -1)) { P.accNew = true; s.bestAccuracy = P.accuracy; } // balance judgement_display.records
  }
  Store.save(store);
  P.log.push({ attempt: P.attempts, ...P.att.log(), rating: P.rating });
  if (A && !TEST && L.clear) {
    const add = [{ perf: P.start + L.clear.launch, name: 'clear', music: false }];
    if (!P.practice) for (let k = 0; k < P.rating; k++) add.push({ perf: P.start + L.clear.gradeCloudMs[k], name: 'grade_cloud', music: false });
    A.add(add);
  }
}
// 콤보 단계 화음(balance combo.chord_timing, judge comboEvents stages[].chordMs, null 이면 없음): 그 단계가 화면에 보이는 순간 예약
function comboTick(lt) {
  if (!comboOn) return;
  const n = comboVisible(lt);
  if (n === P.comboSeen) return;
  if (n > P.comboSeen && A && !TEST) {
    const ev = evNow(), add = [];
    for (const st of ev.stages) if (st.stage > P.comboSeen && st.stage <= n && st.chordMs != null && st.chordMs > lt) {
      const name = D.bal.combo.stage_fx[String(st.stage)]?.sound;
      if (name && name !== 'none') add.push({ perf: P.start + st.chordMs, name, note: noteOf(D.sound, P.L.level.id, { sound: name }), music: false });
    }
    if (add.length) A.add(add);
  }
  P.comboSeen = n;
  updateHudAria();
}

function logic(t) {
  if (!P || (state !== 'play' && state !== 'result')) return;
  const lt = t - P.start;
  if (P.phase === 'run') {
    const r = P.att.tick(lt - comp() - lateGrace());
    if (r && r.kind === 'fail') { onFail(); updateHudAria(); }
    else if (r && r.kind === 'clear') onClear();
    else comboTick(lt);
  } else if (P.phase === 'fail') {
    if (t >= P.nextStart) {
      const fp = P.failPerf, kind = P.att.fail.reason;
      newAttempt(P.nextStart, P.next);
      P.awaitFirst = { failPerf: fp, attempt: P.attempts, kind };
      if (TEST) { P.restarts.push({ attempt: P.attempts, kind, ms: t - fp }); P.awaitFirst = null; }
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
  setAria($('rGrade'), P.practice ? 'practice_clear' : 'grade_' + Math.max(1, P.rating || 1));
  $('rNext').hidden = last;
  $('rBtns').hidden = true;
  // 정확도 %·최고 콤보(일반 모드 클리어만, layout result_screen, lore result_accuracy·result_combo·result_new_best)
  const showAcc = !P.practice && P.accuracy != null;
  $('rAcc').hidden = !showAcc; $('rCombo').hidden = !!P.practice;
  if (showAcc) { const e = $('rAccNum'); e.textContent = P.accuracy + '%'; e.setAttribute('aria-valuenow', String(P.accuracy)); setAria(e, 'result_accuracy'); $('rNew').hidden = !P.accNew; setAria($('rNew'), 'result_new_best'); }
  if (!P.practice) { const e = $('rComboNum'); e.textContent = String(P.comboFinal); e.setAttribute('aria-valuenow', String(P.comboFinal)); e.setAttribute('aria-valuetext', String(P.comboFinal)); e.setAttribute('aria-valuemax', String(P.L.contacts.length)); setAria(e, 'result_combo'); }
  $('result').classList.add('show');
  layoutResult();
}

// ---------- 그리기 ----------
function drumLift(t) {
  const [up, dn] = D.layout.drum.tap_ms, Lf = D.layout.drum.tap_lift_of_d * G.d, pop = P ? P.pop : { at: -1e9 };
  const a = t - pop.at;
  if (a < 0) return 0;
  if (a < up) return Lf * easeOut(a / up);
  const downAt = Math.max(pop.at + up, pop.holdUntil ?? 0);
  if (t < downAt) return Lf;
  const b = t - downAt;
  return b >= dn ? 0 : Lf * (1 - easeIn(b / dn));
}
function stageColor(lt, theme, fromMs) {
  const s = stageAt(P.L, lt, fromMs), k = (n) => theme['bg' + n];
  return mix(k(s.a), k(s.b), s.u);
}
// 클리어 길 멈춤 감속(그림만, R2-D5 layout world.scroll_stop): 판정 함수 scrollBeatAt 은 그대로 두고 그리는 박만 바꿈
function drawnBeat(L, wl, clear) {
  const b = scrollBeatAt(L, wl), stop = L.clear?.scrollStopBeat;
  if (!clear || stop == null) return b;
  const ease = D.layout.world.scroll_stop.ease_beats, u = Math.max(0, wl) / L.beatMs - (stop - ease);
  return u <= 0 ? b : u >= 2 * ease ? stop : stop - ease + u - (u * u) / (4 * ease);
}
// 세계 층(바닥 길·표시·물체·실루엣): 화면 x = judge worldX(L, beat, wl, W) (+ 클리어 감속 그림 보정)
function worldScene(scene, L, wl, hits, startIndex, clear) {
  const g = G, W = g.W, d = g.d, ppb = pxPerBeat(L, W), bd = drawnBeat(L, wl, clear), dx = (scrollBeatAt(L, wl) - bd) * ppb;
  const X = (b) => worldX(L, b, wl, W) + dx;
  scene.scrollPx = bd * ppb;
  const absorb = D.layout.world.mark.absorb_ms;
  scene.marks = [];
  for (const c of L.contacts) {
    if (c.kind === 'nogo' || c.i < startIndex) continue;
    const x = X(c.beat);
    if (x < -d || x > W + d) continue;
    const h = hits[c.i];
    let k = 1;
    if (h != null) { const launch = Math.max(h, c.t); if (wl >= launch) k = 1 - (wl - launch) / absorb; }
    if (k > 0) scene.marks.push({ x, scale: k });
  }
  const OB = D.bal.objects, CL = D.layout.cloud, theme = scene.theme, C = D.palette.common;
  scene.back = []; scene.front = [];
  for (const o of objectsAt(L, wl, W, 2 * d)) {
    const x0 = o.x0 + dx, x1 = o.x1 + dx;
    if (o.type === 'hill') scene.back.push({ x0, x1, topY: g.skinY - (o.top_of_Hp ?? OB.hill.top_of_Hp) * g.Hp });
    else if (o.type === 'cloud') {
      let fill = C.cloud;
      if (o.role === 'clear' && L.clear && clear && wl >= L.clear.launch) fill = mix(C.cloud, theme.clearCloud, (wl - L.clear.launch) / 1000 / D.layout.clear_timeline.cloud_blend_s);
      scene.front.push({ type: 'cloud', x0: x0 - CL.side_margin_of_d * d, x1: x1 + CL.side_margin_of_d * d, fill });
    } else if (o.type === 'roof') scene.front.push({ type: 'roof', x0, x1, underY: g.skinY - (o.under_of_Hp ?? OB.roof.under_of_Hp) * g.Hp });
    else if (o.type === 'branch') scene.front.push({ type: 'branch', x0, x1, underY: g.skinY - (o.under_of_Hp ?? OB.branch.under_of_Hp) * g.Hp });
  }
}
// ballsAt 결과 → 화면 px
function ballPx(b, lt, lift, res) {
  const g = G, d = g.d, LY = D.layout;
  const x = g.cx + (b.x ?? 0) * d;
  let bottom, sq = 1;
  const onSkin = b.state === 'seated' || b.state === 'seated_roof' || b.state === 'waiting' || b.state === 'fallen';
  bottom = onSkin ? g.skinY - lift : g.skinY - b.y * g.Hp;
  if (b.state === 'waiting' || b.state === 'fallen') sq = LY.tap_motion.wait_on_skin_sq;
  else if ((b.state === 'seated' || b.state === 'seated_roof') && b.bob) sq = 0.92;
  else if (b.flight && b.flight.kind !== 'toss' && b.flight.kind !== undefined && lt - b.flight.launch < LY.tap_motion.depart_sq_ms && res) {
    const gr = res.grades.find((q) => q.i === b.flight.fromContact);
    sq = LY.tap_motion.depart_sq_by_grade[gr && gr.grade !== 'hold' ? gr.grade : 'pass'];
  }
  const hidden = !onSkin && b.y > LY.play_height.cloud_edge_of_Hp; // 구름선 위 = 숨음(그리지 않음)
  return { x, bottom, sq, scale: 1, hidden, shadow: b.state !== 'gone' ? { x, h: Math.max(0, b.y || 0) * g.Hp } : null };
}
// 실패 연출(30-art 7-1·7-2, balance restartPhases 세 판): 공 하나
function failBalls(t) {
  const g = G, d = g.d, f = P.att.fail, ph = f.phases, u = (t - P.failPerf) / 1000, L = P.L, FX = D.layout.fail_fx;
  const out = [];
  const shrink = u >= ph.ball_reappear_on_drum[0] ? clamp(1 - (u - ph.ball_reappear_on_drum[0]) / 0.1, 0, 1) : 1;
  for (const b of P.snap.balls) {
    if (b.state === 'gone') continue;
    const base = ballPx(b, P.snap.lt, 0, null);
    let x, bottom, sq = 1;
    if (f.reason === 'early' && b.flight) {
      const side = -1, m = ph.ball_fall_fx[1], edge = g.cx + side * (g.dw / 2 + 0.5 * d);
      const fl = b.flight, dur = fl.to - fl.launch, H = fl.apex, yF = -(g.floorTop - g.skinY) / g.Hp;
      const sF = (1 + Math.sqrt(Math.max(0, 1 - yF / Math.max(H, 1e-6)))) / 2, tauF = fl.launch + sF * dur;
      const fallDur = Math.max(0.05, m - FX.early.roll_s);
      const q = clamp((fl.to - P.snap.lt) / Math.max(1, tauF - P.snap.lt), 0.05, 1);
      if (u < fallDur) {
        const fr = u / fallDur, tau = P.snap.lt + (tauF - P.snap.lt) * fr, s = (tau - fl.launch) / dur;
        bottom = g.skinY - 4 * H * s * (1 - s) * g.Hp;
        x = lerp(base.x, edge, fr / (q * 0.95));
      } else { x = edge + side * 0.5 * d * easeOut(clamp((u - fallDur) / FX.early.roll_s, 0, 1)); bottom = g.floorTop; }
    } else if (f.reason === 'bump_roof') {
      // 지붕 밑에 앉은 공을 친 탭: 0.15 s 동안 지붕 아랫면까지 떠 살짝 납작(0.85) → 가죽으로 → 북 오른쪽으로 굴러 떨어짐. 지붕은 그대로
      const B = FX.bump_roof, roof = L.objects.find((o) => o.type === 'roof' && o.contacts.includes(f.index));
      const underY = g.skinY - (roof?.under_of_Hp ?? D.bal.objects.roof.under_of_Hp) * g.Hp, topB = underY + d * B.touch_sq;
      const e1 = g.cx + (g.dw / 2 + 0.3 * d), down = 0.1;
      if (u < B.rise_s) { const v = u / B.rise_s; x = base.x; bottom = lerp(g.skinY, topB, easeOut(v)); sq = v > 0.7 ? B.touch_sq : 1; }
      else if (u < B.rise_s + down) { x = base.x; bottom = lerp(topB, g.skinY, easeIn((u - B.rise_s) / down)); }
      else {
        const a = clamp((u - B.rise_s - down) / (B.motion_s - B.rise_s - down), 0, 1);
        if (a < 0.4) { x = lerp(base.x, e1, easeIn(a / 0.4)); bottom = g.skinY; }
        else if (a < 0.7) { const v = (a - 0.4) / 0.3; x = lerp(e1, e1 + 0.5 * d, v); bottom = lerp(g.skinY, g.floorTop, easeIn(v)); }
        else { x = e1 + (0.5 + 0.6 * easeOut((a - 0.7) / 0.3)) * d; bottom = g.floorTop; }
      }
    } else {
      const lm = FX.late.motion_s, e1 = g.cx + (g.dw / 2 + 0.3 * d);
      const a = clamp(u / lm, 0, 1);
      if (a < 0.45) { x = lerp(base.x, e1, easeIn(a / 0.45)); bottom = g.skinY; sq = D.layout.tap_motion.wait_on_skin_sq; }
      else if (a < 0.75) { const v = (a - 0.45) / 0.3; x = lerp(e1, e1 + 0.5 * d, v); bottom = lerp(g.skinY, g.floorTop, easeIn(v)); }
      else { x = e1 + (0.5 + 0.6 * easeOut((a - 0.75) / 0.25)) * d; bottom = g.floorTop; }
    }
    out.push({ x, bottom, sq, scale: shrink, hidden: false });
  }
  if (u >= ph.ball_reappear_on_drum[0]) {
    const RT = D.layout.restart_timeline_s, k = lerp(RT.reappear_grow[0], RT.reappear_grow[1], (u - ph.ball_reappear_on_drum[0]) / (ph.ball_reappear_on_drum[1] - ph.ball_reappear_on_drum[0]));
    for (const b of P.nextBalls) if (b.state === 'seated' || b.state === 'seated_roof') out.push({ ...ballPx(b, P.next.fromMs, 0, null), scale: k });
  }
  return { balls: out, u, ph };
}
// 판정 이름·%(balance judgement_display, judge pctOf): 가장 최근 hit 판정 하나(새 판정이 오면 그 프레임에 바꿈), 튐 80 → 유지 → 흐려짐(레벨 시각).
// 지붕 참기(hold)·실패·헛탭은 표시 없음. 실패하면 콤보와 함께 0.25 s 안 사라짐, 클리어는 HUD 페이드와 함께. 캔버스(aria-hidden), 낭독 없음.
let lastJudge = null;
function judgeScene(lt, t, hudAlpha) {
  if (!judgeOn || !P) return null;
  const T = D.bal.judgement_display.timing, names = D.bal.judgement_display.names;
  let fade = 1, now0 = lt;
  if (P.phase === 'fail') { const u = (t - P.failPerf) / 1000, br = D.layout.restart_timeline_s.combo_break; fade = 1 - clamp((u - br[0]) / (br[1] - br[0]), 0, 1); if (fade <= 0) return null; now0 = P.snap.lt; }
  const J = now0 - comp(), cs = P.L.contacts;
  let g = null, gt = -Infinity;
  for (const x of P.att.res.grades) { if (x.e == null) continue; const tt = cs[x.i].t + x.e; if (tt <= J + 1e-9 && tt >= gt) { g = x; gt = tt; } }
  if (!g) return null;
  const pct = pctOf(P.L, g.i, g.e);
  if (pct == null) return null;
  const age = now0 - (gt + comp());
  if (age < 0 || age > T.total_ms) return null;
  const a = age <= T.hold_until_ms ? 1 : 1 - (age - T.hold_until_ms) / T.fade_ms;
  const key = names[g.grade];
  return { grade: g.grade, i: g.i, e: g.e, pct, name: key ? T && (D.strings[key][lang] ?? D.strings[key].ko) : '', age, alpha: Math.max(0, a) * fade * hudAlpha };
}
// 콤보 그림 상태(grades 에서 파생, 화면 시계 = 레벨 시각)
function comboScene(lt) {
  if (!comboOn) return null;
  const S = D.bal.combo;
  if (P.phase === 'fail') {
    const u = (now() - P.failPerf) / 1000, br = D.layout.restart_timeline_s.combo_break;
    const n = P.snap.combo;
    if (n < S.show_from || u >= br[1]) return null;
    return { n, brk: 1 - clamp((u - br[0]) / (br[1] - br[0]), 0, 1) };
  }
  const ev = evNow(), J = lt - comp();
  let last = null;
  for (const e of ev.events) if (e.kind === 'hit' ? e.t <= J + 1e-9 : e.t <= lt + 1e-9) last = e;
  const n = last ? last.combo : 0;
  if (n < S.show_from) return null;
  const showT = (e) => (e.kind === 'hit' ? e.t + comp() : e.t);
  const age = (lt - showT(last)) / 1000;
  const K = { n, pop: { i: (n - 1) % 10, age, stage5: n === 5 } };
  const st = ev.stages.filter((s) => s.stage <= n && s.stage >= 10).pop();
  if (st) { const e = ev.events.find((x) => x.combo === st.stage); const a = (lt - showT(e)) / 1000; if (a < 0.6) { K.stage = { s: st.stage }; K.stageAge = a; } }
  return K;
}
function draw(t) {
  if (!R || !G) return;
  if (!P) { drawIdle(); return; }
  if (state === 'pause' && P.pausedAt != null) t = P.pausedAt;
  const L = P.L, theme = themeOf(P.i), lt = t - P.start, lift = drumLift(t);
  const scene = { theme, bg: theme.bg1, lift, glow: false, balls: [], shadows: [], lines: [], labels: [], swing: false, finger: null, retry: false, grades: null, practiceFlag: false, hud: null };
  const nC = L.contacts.length;
  let progress = 0, best = P.practice ? P.best : Math.max(P.best, P.storedBest), hudAlpha = 1;
  if (P.phase === 'fail') {
    const fb = failBalls(t), rewound = fb.u >= fb.ph.ball_reappear_on_drum[0];
    // 실패 순간 세계 멈춤 → 0.85 s 프레임에 다음 시도 자리(0박 / 연습 = 그 구절)로 한 번에 되감음(layout world.restart_rewind)
    if (rewound) worldScene(scene, L, P.next.fromMs, [], P.next.startIndex, false);
    else worldScene(scene, L, P.snap.lt, P.snap.hits, P.snap.startIndex, false);
    scene.bg = rewound ? stageColor(P.next.fromMs, theme, P.next.fromMs) : stageColor(P.snap.lt, theme, P.att.fromMs);
    scene.balls = fb.balls;
    scene.swing = P.att.fail.reason === 'early' && fb.u < (fb.ph.swing_fx?.[1] ?? 0);
    const mEnd = (fb.ph.ball_fall_fx || fb.ph.bump_fx)[1];
    scene.retry = P.firstFail && fb.u >= mEnd && !rewound;
    progress = P.att.progress;
    if (P.newBest) { const s0 = fb.ph.still_best_dot[0]; best = fb.u < s0 ? P.bestFrom : lerp(P.bestFrom, P.bestTo, (fb.u - s0) / D.layout.restart_timeline_s.best_slide_s); }
  } else {
    if (P.awaitFirst && !TEST) { P.restarts.push({ attempt: P.awaitFirst.attempt, kind: P.awaitFirst.kind, ms: t - P.awaitFirst.failPerf }); P.awaitFirst = null; }
    const hits = P.att.hits(), res = P.att.res, clear = P.phase === 'clear';
    worldScene(scene, L, lt, hits, P.att.opt.startIndex, clear);
    const balls = ballsAt(L, lt, hits);
    for (const b of balls) {
      if (b.state === 'gone') continue;
      const p = ballPx(b, lt, lift, res);
      scene.balls.push(p);
      if (p.shadow) scene.shadows.push(p.shadow);
    }
    scene.bg = stageColor(lt, theme, P.att.fromMs);
    // 판정 반응: 튐 선(딱 2쌍·좋아 1쌍·통과 0) + 딱 가죽 빛. 판정 이름·% 는 judgeScene
    for (const gr of res.grades) {
      if (gr.e == null) continue;
      const c = L.contacts[gr.i], age = (lt - Math.max(c.t + gr.e, c.t)) / 1000;
      if (age < 0 || age > D.layout.bounce_lines.dur_s) continue;
      scene.lines.push({ x: G.cx, n: D.layout.bounce_lines.pairs_by_grade[gr.grade], age });
      if (gr.grade === 'perfect' && age < 0.15) scene.glow = true;
    }
    // L1 손가락(fingerSchedule 하나가 원본)
    const fs = fingerSchedule(L, D.bal, hits);
    if (fs && P.att.fromMs <= fs.from && lt >= fs.from && lt < fs.gone && P.phase === 'run') {
      scene.finger = { press: lt >= fs.pressStart, scale: clamp((lt - fs.from) / (1000 * D.layout.finger.appear_grow_s), 0, 1) };
    }
    showTut(!!scene.finger);
    progress = clamp((P.att.opt.startIndex - (P.att.opt.carried?.length || 0) + comboVisible(lt)) / nC, 0, 1);
    if (clear && L.clear) {
      progress = 1;
      const C2 = L.clear;
      if (lt >= C2.launch) {
        const u = (lt - C2.launch) / 1000;
        scene.bg = mix(stageColor(C2.launch, theme, P.att.fromMs), theme.bg1, u / D.layout.clear_timeline.bg_blend_s);
        if (P.practice) scene.practiceFlag = true;
        else scene.grades = { fill: [0, 1, 2].map((k) => (k < P.rating && lt >= C2.gradeCloudMs[k] ? lerp(D.layout.clear_timeline.grade_grow[0], D.layout.clear_timeline.grade_grow[1], (lt - C2.gradeCloudMs[k]) / (1000 * D.layout.clear_timeline.grade_grow_s)) : 0)) };
      }
      hudAlpha = clamp(1 - (lt - L.clearTimeMs) / 200, 0, 1);
    }
  }
  if (P.phase !== 'run') showTut(false);
  showPrac(P.practice && P.attempts === 1 && P.phase === 'run' && lt - P.att.fromMs < 2000);
  scene.hud = { alpha: hudAlpha, progress, best, attempts: P.attempts, practice: P.practice, combo: comboScene(lt), theme };
  scene.judge = judgeScene(lt, t, hudAlpha);
  lastJudge = scene.judge;
  R.frame(scene);
}
let tutOn = false, pracOn = false;
function showTut(on) { if (on !== tutOn) { tutOn = on; $('hTut').hidden = !on; } }
function showPrac(on) { if (on !== pracOn) { pracOn = on; $('hPrac').hidden = !on; } }
// 메뉴 뒤 바탕(레벨 1 앉은 공, 길 0박)
function drawIdle() {
  const theme = menuTheme || themeOf(0), g = G, L = D.L[0];
  const scene = { theme, bg: theme.bg1, lift: 0, glow: false, balls: [{ x: g.cx, bottom: g.skinY, sq: 1, scale: 1 }], shadows: [{ x: g.cx, h: 0 }], lines: [], swing: false, finger: null, retry: false, grades: null, practiceFlag: false, hud: null };
  const save = P; P = { L, att: { opt: { startIndex: 0 } } };
  worldScene(scene, L, 0, [], 0, false);
  P = save;
  scene.marks = [];
  R.frame(scene);
}

// HUD 대체 글: 값이 바뀔 때만 DOM 쓰기(진행도·최고 = 비율 progressbar, 시도·콤보 = 개수 meter, valuetext 숫자만, aria-live 없음)
const hudVals = {};
function setVal(id, v, text = false) { if (hudVals[id] !== v) { hudVals[id] = v; const e = $(id); e.setAttribute('aria-valuenow', String(v)); if (text) e.setAttribute('aria-valuetext', String(v)); } }
function updateHudAria() {
  if (!P) return;
  const lt = now() - P.start;
  const prog = P.phase === 'run' ? (P.att.opt.startIndex - (P.att.opt.carried?.length || 0) + comboVisible(lt)) / P.L.contacts.length : P.att.progress;
  setVal('aProg', Math.round(100 * clamp(prog, 0, 1)));
  setVal('aBest', Math.round(100 * (P.practice ? P.best : Math.max(P.best, P.storedBest))));
  setVal('aTries', P.attempts, true);
  const max = String(P.L.contacts.length);
  if ($('aCombo').getAttribute('aria-valuemax') !== max) $('aCombo').setAttribute('aria-valuemax', max);
  setVal('aCombo', P.phase === 'fail' ? 0 : comboVisible(lt), true);
}
function layoutHud() {
  if (!G) return;
  const h = D.layout.hud.pause.touch, st = G.safeTop, s = G.slot;
  Object.assign($('hPause').style, { left: h.x + 'px', top: (st + h.y) + 'px', width: h.size + 'px', height: h.size + 'px' });
  for (const id of ['hTut', 'hPrac']) Object.assign($(id).style, { left: s.x0 + 'px', width: (s.x1 - s.x0) + 'px', right: 'auto', top: s.y0 + 'px', textAlign: s.align });
  $('aFlag').hidden = !(P && P.practice);
}
// 결과: 끝 구름 아래 = 레벨 이름 → 클리어 제목 → 등급 3칸(캔버스) → 버튼
function layoutResult() {
  if (!G) return;
  const r = G.result;
  $('rText').style.top = r.top + 'px';
  $('rAcc').style.top = r.accTop + 'px'; $('rCombo').style.top = r.comboTop + 'px';
  $('rBtns').style.top = r.btnTop + 'px'; $('rBtns').style.left = r.btnLeft + 'px';
}

// ---------- 멈춤·이어 하기 ----------
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
// 이어 하기(balance menus.resume, judge resumePoint): 지금 구절의 받침 쉼 처음으로 되감음. 세상도 같은 레벨 시각으로, 앞 판정은 그대로, 시도 수 그대로
function resumeGame() {
  if (state !== 'pause' || !P) return;
  const t = now(), sh = t - P.pausedAt, ltP = P.pausedAt - P.start;
  state = 'play';
  show();
  if (A) A.resume();
  if (P.phase === 'run' && ltP >= 0) {
    const rp = resumePoint(P.L, ltP - comp(), P.att.res);
    if (rp.rewound) {
      P.log.push({ attempt: P.attempts, ...P.att.log(), paused: true });
      P.resumes.push({ attempt: P.attempts, pausedMs: ltP - comp(), fromMs: rp.fromMs, startIndex: rp.startIndex, carried: rp.carried.length });
      P.att = new Attempt(P.L, { fromMs: rp.fromMs, startIndex: rp.startIndex, carried: rp.carried, practice: P.practice, resumed: true });
      P.start = t - rp.fromMs;
      P.pop = { at: -1e9, holdUntil: null };
      P.comboSeen = rp.carried.length;
      P.pausedAt = null;
      scheduleSong(rp.fromMs);
      updateHudAria();
      return;
    }
  }
  P.start += sh; P.pop.at += sh; if (P.pop.holdUntil != null) P.pop.holdUntil += sh; P.attemptStartAt += sh;
  if (P.phase === 'fail') { P.failPerf += sh; P.nextStart += sh; }
  if (P.awaitFirst) P.awaitFirst.failPerf += sh;
  P.pausedAt = null;
  if (A && !TEST) {
    const lt = now() - P.start;
    if (P.phase === 'fail') A.setQueue(songList(P.next.fromMs, P.nextStart - P.next.fromMs));
    else A.setQueue(songList(Math.max(P.att.fromMs, lt), P.start));
  }
}
function soundIcon() { const on = store.sound; icon($('pSound'), on ? 'sound_on' : 'sound_off', on ? 'btn_sound_off' : 'btn_sound_on'); }
function toggleSound() { store.sound = !store.sound; Store.save(store); if (A) A.setEnabled(store.sound); soundIcon(); uiSnd(); }

// ---------- 보호자 화면 ----------
function showGuardian() {
  state = 'guardian';
  $('gLate').hidden = !store.drift.on;
  $('gKo').classList.toggle('on', lang === 'ko'); $('gEn').classList.toggle('on', lang === 'en');
  show('guardian');
  requestAnimationFrame(moreHint);
}
function moreHint() { const s = $('gScroll'); $('gMore').classList.toggle('on', s.scrollHeight - s.clientHeight - s.scrollTop > 4); }
function setLang(l) { lang = l; store.lang = l; Store.save(store); document.documentElement.lang = l; applyTexts(); buildGrid(); showGuardian(); }

// ---------- 소리 맞추기 ----------
let SY = null;
function startSync() {
  const C = D.bal.sound_sync;
  state = 'sync';
  SY = { C, round: 0, diffs: [[], []], retries: 0, done: false, beatMs: 60000 / C.bpm, t0: now() + 1000, list: [] };
  if (A && !TEST) {
    const root = D.sound.music.levels[D.levels[0].id].root_hz;
    for (let k = 0; k < 120; k++) SY.list.push({ perf: SY.t0 + k * SY.beatMs, name: 'rest_a', note: root, offset: false });
    A.setQueue(SY.list);
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
  box.setAttribute('aria-valuenow', String(filled)); box.setAttribute('aria-valuetext', String(filled));
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
  // 들린 박 = 예약 perf − 예약 때 자동 지연 + 지금 자동 지연(첫 실행 자동 지연이 바뀌어도 이중 보정 없음, insights rhythm-01)
  const e = SY.list[k], heard = SY.t0 + k * SY.beatMs + (e && e.autoUsed != null && A ? A.autoLatencyMs() - e.autoUsed : 0);
  syncTapDiff(ts - heard);
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
  setTxt('stUnlock', 'audio_unlock'); icon($('stUnlockIcon'), 'unlock_sound');
  icon($('cdClose'), 'close', 'btn_close');
  icon($('hPause'), 'pause', 'btn_pause'); setTxt('hPrac', 'practice_on'); setTxt('hTut', 'tut_tap');
  setAria($('aProg'), 'aria_progress'); setAria($('aBest'), 'aria_best'); setAria($('aTries'), 'aria_attempts'); setAria($('aFlag'), 'aria_checkpoint'); setAria($('aCombo'), 'aria_combo');
  icon($('pResume'), 'resume', 'btn_resume'); icon($('pRetry'), 'retry', 'btn_retry'); icon($('pLevels'), 'levels', 'btn_levels'); soundIcon();
  icon($('rAccIcon'), 'accuracy'); icon($('rComboIcon'), 'best_combo'); icon($('rNew'), 'new_best');
  icon($('rLevels'), 'levels', 'btn_levels'); icon($('rRetry'), 'retry', 'btn_retry'); icon($('rNext'), 'next', 'btn_next');
  icon($('gBack'), 'back', 'btn_back'); setTxt('gTitle', 'guardian_title'); setTxt('gIntro', 'guardian_intro');
  icon($('gSyncIcon'), 'sync'); setTxt('gSync', 'settings_sync'); icon($('gLateIcon'), 'look_ball'); setTxt('gLateTxt', 'sound_late'); setTxt('gSyncIntro', 'sync_intro');
  icon($('gLangIcon'), 'language'); setTxt('gLangTxt', 'settings_language'); setTxt('gKo', 'lang_ko'); setTxt('gEn', 'lang_en');
  $('gKo').textContent = D.strings.lang_ko.ko; $('gEn').textContent = D.strings.lang_en.en; // 언어 이름은 어느 화면에서도 자기 이름(10-lore 6절 10)
  icon($('sBack'), 'back', 'btn_back'); icon($('sSkip'), 'skip', 'btn_skip'); setTxt('sTitle', 'sync_screen'); setTxt('sSub', 'sync_with_grownup'); setTxt('sRedo', 'sync_redo');
  setAria($('sDots'), 'sync_progress');
  setAria($('pause').querySelector('.panel'), 'pause_screen');
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
let lastFrame = 0;
function frame(ts) {
  const t = now();
  if (lastFrame) frameDt = frameDt * 0.9 + clamp(ts - lastFrame, 4, 100) * 0.1;
  lastFrame = ts;
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

// ---------- 미리 그리기(30-art 12절·insights: 레벨 시작·재시작 첫 프레임 튐 방지) ----------
async function warmup() {
  const off = document.createElement('canvas');
  const r2 = new Renderer(off, D); const g2 = r2.resize(innerWidth, innerHeight, Math.min(3, devicePixelRatio || 1), G.safeTop, G.safeBottom);
  const keepR = R, keepG = G, keepP = P, keepS = state;
  R = r2; G = g2; state = 'play';
  const mk = (i) => ({ i, L: D.L[i], practice: false, attempts: 1, best: 0.3, storedBest: 0.5, pop: { at: 0, holdUntil: null }, phase: 'run', att: new Attempt(D.L[i]), start: 0, failCount: 1, firstFail: true, ev: null, evRes: null, comboSeen: 0, log: [], restarts: [], resumes: [] });
  for (let i = 0; i < D.levels.length; i++) {
    const L = D.L[i];
    P = mk(i);
    const hits = L.contacts.filter((c) => c.kind !== 'nogo');
    let k = 0;
    // 레벨 전체를 1박 간격으로(모든 물체·표시·콤보 단계가 한 번씩 그려짐), 완벽 입력
    for (let tt = -400; tt < L.durationMs; tt += L.beatMs) {
      while (k < hits.length && hits[k].t <= tt) { P.att.tap(hits[k].t); k++; }
      draw(tt); draw(tt + 30);
      if (P.att.status === 'clear' && P.phase !== 'clear') { P.phase = 'clear'; P.rating = 3; }
    }
    if (L.clear) for (const tt of [L.clear.launch + 100, L.clear.resultMs]) draw(tt);
    // 실패 세 판
    const fails = [[], [L.contacts[0].zoneStart + 1]];
    const ng = L.contacts.find((c) => c.kind === 'nogo');
    if (ng) fails.push(L.contacts.filter((c) => c.kind !== 'nogo' && c.i < ng.i).map((c) => c.t).concat(ng.t));
    for (const taps of fails) {
      P = mk(i);
      for (const x of taps) P.att.tap(x);
      if (!P.att.fail) P.att.tick(P.att.res.failTimeMs);
      if (P.att.fail) { onFailWarm(); for (const u of [50, 300, 700, 900]) draw(P.failPerf + u); }
    }
    P = mk(i); P.practice = true; draw(L.contacts[0].t);
  }
  R = keepR; G = keepG; P = keepP; state = keepS;
  tutOn = true; showTut(false); pracOn = true; showPrac(false);
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
  P.snap = { lt: P.failPerf, balls: ballsAt(L, P.failPerf, P.att.hits()), hits: P.att.hits(), startIndex: 0, combo: P.att.res.grades.length };
  P.next = { fromMs: 0, startIndex: 0 }; P.nextBalls = ballsAt(L, 0, []);
}

// ---------- 테스트 훅 ----------
function stepTest(dt) {
  if (!TEST) return false;
  const end = vt + dt * 1000;
  while (vt < end - 1e-9) { vt = Math.min(end, vt + STEP); logic(vt); gateFrame(vt); }
  draw(vt);
  return true;
}
// 다음에 칠 hit 접촉(아직 친 기록이 없는 것)
function nextHit() {
  if (!P) return null;
  const done = new Set(P.att.res.grades.filter((g) => g.e != null).map((g) => g.i));
  return P.L.contacts.find((c) => c.kind !== 'nogo' && c.i >= P.att.opt.startIndex && !done.has(c.i)) || null;
}
let autoRT = null;
// 일반 모드 실시간 완벽 입력: 실제 PointerEvent 를 판정 시각에 맞춰 보냄(rAF 루프 + 이벤트 경로 그대로). hit 접촉만 치고 지붕 밑은 참음
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
      if (P.phase !== 'run' || state !== 'play') return;
      const c = nextHit();
      if (!c || done.has(c.i)) return;
      const target = P.start + c.t + comp() + offsetMs + (sigma ? gauss() * sigma : 0);
      if (target - performance.now() > 40) return;
      done.add(c.i);
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
  get combo() { return P && P.phase !== 'fail' ? comboVisible(now() - P.start) : 0; },
  get comboEnabled() { return comboOn; },
  get judgeEnabled() { return judgeOn; },
  setJudgeDisplay(on) { judgeOn = !!on; return judgeOn; },
  judgeShown() { return lastJudge ? { ...lastJudge } : null; },
  pctEvents() { return P ? pctEvents(P.L, P.att.res) : []; },
  get accuracy() { return P ? P.accuracy ?? null : null; },
  resultValues() { return P ? { accuracy: P.accuracy ?? null, combo: P.comboFinal ?? null, accNew: !!P.accNew, practice: P.practice, grades: P.att.res.grades.map((g) => ({ i: g.i, e: g.e, grade: g.grade })) } : null; },
  // 판정 이름 실제 렌더 폭(줄인 뒤)과 자리 폭
  judgeMetrics() { const out = {}; for (const g of ['perfect', 'good', 'pass']) { const name = D.strings[D.bal.judgement_display.names[g]][lang]; const m = R.judgeMeasure(name); out[g] = { name, px: m.px, w: +m.w.toFixed(1), zoneW: +m.zoneW.toFixed(1), nameP: G.judge.nameP }; } return out; },
  setCombo(on) { comboOn = !!on; if (!comboOn && P) P.comboSeen = 0; return comboOn; },
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
  pause() { pauseGame(false); return state; },
  resume() { resumeGame(); return state; },
  levelMs() { return P ? now() - P.start : null; },
  judgeMs() { return P ? now() - P.start - comp() : null; },
  contacts() { return P ? P.L.contacts.map((c) => ({ i: c.i, t: c.t, beat: c.beat, kind: c.kind, ball: c.ball, passStart: c.passStart, passEnd: c.passEnd, zoneStart: c.zoneStart })) : []; },
  nogo() { return P ? P.L.contacts.filter((c) => c.kind === 'nogo').map((c) => ({ i: c.i, t: c.t, passStart: c.passStart, passEnd: c.passEnd })) : []; },
  roofSits() { return P ? P.L.roofSits.map((r) => ({ ...r })) : []; },
  perfectTaps(off = 0) { return P ? P.L.contacts.filter((c) => c.kind !== 'nogo').map((c) => c.t + off) : []; },
  hits() { return P ? P.att.hits() : []; },
  judgeLog() { return P ? P.att.grades.map(({ i, e, grade }) => ({ i, e, grade })) : []; },
  comboEvents() { return P ? comboEvents(P.L, P.att.res) : null; },
  attemptLog() { return P ? P.log.map((x) => ({ ...x })) : []; },
  restartLog() { return P ? P.restarts.slice() : []; },
  resumeLog() { return P ? P.resumes.slice() : []; },
  balls() { return P ? ballsAt(P.L, now() - P.start, P.att.hits()) : []; },
  worldX(beat) { return P ? worldX(P.L, beat, now() - P.start, G.W) : null; },
  scrollBeat() { return P ? scrollBeatAt(P.L, now() - P.start) : null; },
  objects(margin = 0) { return P ? objectsAt(P.L, now() - P.start, G.W, margin).map((o) => ({ type: o.type, role: o.role ?? null, x0: o.x0, x1: o.x1, beat_in: o.beat_in, beat_out: o.beat_out })) : []; },
  levelObjects() { return P ? P.L.objects.map((o) => ({ type: o.type, role: o.role ?? null, beat_in: o.beat_in, beat_out: o.beat_out, contacts: o.contacts })) : []; },
  firstVisibleMs(beat) { return P ? firstVisibleMs(P.L, beat) : null; },
  finger() { return P ? fingerSchedule(P.L, D.bal, P.att.hits()) : null; },
  frameInfo() { return { tut: tutOn, prac: pracOn, levelMs: P ? now() - P.start : null, phase: P ? P.phase : null, combo: api.combo, frameDt }; },
  autoplay(off = 0, sigma = 0, seed = 1) {
    if (!P) return null;
    if (!TEST) return autoplayRealtime(off, sigma, seed);
    let s = seed >>> 0;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
    const att = P.attempts;
    for (let c = nextHit(); c && P && P.attempts === att && P.phase === 'run'; c = nextHit()) this.pressAt(c.t + off + (sigma ? gauss() * sigma : 0));
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
  audioClock() { return A ? { step: A.step ?? null, hi: A.hi ?? null, lo: A.lo ?? null } : null; },
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
  const ql = Q.get('lang');
  if (Q.get('notext') === '1') document.body.classList.add('notext');
  try {
    D = await loadAll();
  } catch (e) {
    if (window.__bootFail) window.__bootFail();
    return;
  }
  clearTimeout(window.__bootTimer);
  store = Store.load();
  if (store.drift.on) { store.drift.sessions = (store.drift.sessions || 0) + 1; if (store.drift.sessions > D.bal.drift_check.max_sessions_shown) store.drift = { on: false, sessions: 0 }; Store.save(store); }
  lang = ql || store.lang || window.__bootLang || ((navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en');
  if (!D.strings.title[lang]) lang = 'en';
  document.documentElement.lang = lang;
  if (!TEST) { A = new AudioOut(D.sound); A.enabled = store.sound; A.offsetMs = store.syncOffsetMs || 0; }
  setTheme(themeOf(0));
  R = new Renderer($('cv'), D);
  resize();
  bindInput();
  applyTexts();
  syncArt();
  ads.init();
  buildGrid();
  await warmup();
  state = 'title';
  show('title');
  api.ready = true;
  requestAnimationFrame(frame);
}
boot();
