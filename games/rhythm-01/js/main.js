// 똑딱북(rhythm-01) 웹 빌드: 화면 흐름, 입력, 시계, 저장, 테스트 훅
import { prepareLevel, Run, slotTimeMs } from './engine.js';
import { AudioOut, buildSong } from './audio.js';
import { Renderer, layout } from './render.js';
import { evalRound, finalOffset, simulate } from './calib.js';
import * as Store from './store.js';
import { ads } from './ads.js';

const Q = new URLSearchParams(location.search);
const TEST = Q.get('test') === '1';
const START_LEAD_MS = 400; // 레벨 시작 전 예약 여유 (오디오 lookahead 보다 길게)
const REALTIME_GRACE_MS = 20; // 실시간 루프의 늦은 놓침 판정 여유 (실패 시각은 그대로 통과 창 끝)
const $ = (id) => document.getElementById(id);

let D; // 데이터
let R; // renderer
const audio = { ok: false };
let A = null; // AudioOut
let store = Store.load();
let state = 'loading';
let lang = 'ko';
let T = {};
let levelIndex = 0, L = null, run = null, practice = false, th = null;
let S = {}; // 렌더 상태
let pauseV = 0, cardReturn = null;
let lateVisible = false, sessionCounted = false;

// ---------- 시계 ----------
// V(ms) = 오디오 시계 - 지연 보정. 실시간: performance 시계 + (오디오 - performance) 차이 추정. 테스트: 가상 시계
const clock = {
  vt: 0, off: null, comp: 0,
  sample() {
    if (TEST || !A || !A.ctx || A.ctx.state !== 'running') return;
    const d = A.ctx.currentTime - performance.now() / 1000;
    if (this.off === null || Math.abs(d - this.off) > 0.05) this.off = d;
    else this.off = Math.max(d, this.off - 0.00002);
  },
  ctOf(perfMs) { return perfMs / 1000 + (this.off ?? 0); },
  V() { return TEST ? this.vt : this.ctOf(performance.now()) * 1000 - this.comp; },
  tapV(ts) { return TEST ? this.vt : this.ctOf(ts) * 1000 - this.comp; },
  perfOfV(V) { return (V + this.comp) - (this.off ?? 0) * 1000; },
};
function autoLat() { return TEST || !A ? 0 : A.autoLatencyMs(); }
function updateComp() { clock.comp = autoLat() + (store.offsetMs || 0); }

// ---------- 데이터 ----------
async function loadAll() {
  const j = (p) => fetch('data/' + p).then((r) => { if (!r.ok) throw new Error(p); return r.json(); });
  const [balance, palette, art, sound, music, strings] = await Promise.all(['balance.json', 'palette.json', 'art.json', 'sound.json', 'music.json', 'strings.json'].map(j));
  const levels = await Promise.all(balance.levels.map((p) => j(p)));
  const imgNames = ['hand-tap', 'flag'];
  const imgs = {};
  await Promise.all(imgNames.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { imgs[n] = im; res(); }; im.onerror = res; im.src = `data/svg/${n}.svg`; })));
  return { bal: balance, palette, art, sound, music, strings, levels, imgs, L: levels.map((lv) => prepareLevel(lv, balance)) };
}

// ---------- 텍스트 ----------
function applyText() {
  T = D.strings[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach((e) => { e.textContent = T[e.dataset.t] ?? ''; });
  document.querySelectorAll('[data-a]').forEach((e) => { e.setAttribute('aria-label', T[e.dataset.a] ?? ''); });
  document.title = T.title;
}

// ---------- 테마 ----------
function themeOf(i) { return D.palette.themes[D.levels[i].theme_id]; }
function setTheme(t) {
  th = t;
  const s = document.documentElement.style, C = D.palette.common;
  s.setProperty('--bg', t.bg); s.setProperty('--bgFar', t.bgFar); s.setProperty('--tint', t.cardTint);
  s.setProperty('--edge', C.trackEdge); s.setProperty('--hud', C.hud); s.setProperty('--ink', C.outline); s.setProperty('--ball', C.ball);
  s.setProperty('--track1', t.track1);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t.bg);
}

// ---------- 화면 ----------
const SCREENS = ['sLoading', 'sTitle', 'sLevels', 'sSettings', 'sConfirm', 'sCalib', 'sCard', 'sPlay', 'sPause', 'sResult'];
function show(...ids) { for (const id of SCREENS) $(id).classList.toggle('show', ids.includes(id)); }
function setState(s) { state = s; document.body.dataset.state = s; }

// ---------- 소리 설정 ----------
function applySound() {
  if (A) { A.prefs = { music: store.music, sfx: store.sfx, master: store.sound }; A.applyPrefs(); }
  for (const b of [$('bSoundT'), $('bSoundP')]) {
    b.setAttribute('aria-label', T[store.sound ? 'btn_sound_off' : 'btn_sound_on'] ?? '');
    b.querySelector('img').src = `data/svg/icon-${store.sound ? 'music' : 'music_off'}.svg`;
    b.setAttribute('aria-pressed', String(!store.sound));
  }
  for (const [id, on] of [['tMusic', store.music], ['tSfx', store.sfx]]) { $(id).classList.toggle('on', on); $(id).setAttribute('aria-checked', String(on)); }
}
function toggleSound() { store.sound = !store.sound; Store.save(store); applySound(); menuSnd(); }
function menuSnd() { if (A) A.play('menu'); }

function unlockAudio() {
  if (TEST) return;
  if (!A) A = new AudioOut(D.sound, D.music);
  if (A.unlock()) { audio.ok = true; applySound(); updateComp(); }
}

// ---------- 타이틀 ----------
function showTitle() { setTheme(themeOf(0)); setState('title'); show('sTitle'); }
function afterTitle() {
  unlockAudio();
  menuSnd();
  if (!store.calibDone) startCalib(true);
  else showLevels();
}

// ---------- 레벨 선택 ----------
function lvSave(i) { return Store.lv(store, D.levels[i].id); }
function cardIdOf(i) { const c = D.levels[i].card; return c && c.id ? c.id : null; }
function miniSvg(i, locked) {
  const C = D.palette.common, sv = lvSave(i), n = i + 1;
  const a = locked ? D.palette.alpha.locked_card_trackEdge : 1;
  let s = `<svg viewBox="0 0 100 74" aria-hidden="true"><g opacity="${a}"><circle cx="50" cy="18" r="14" fill="none" stroke="${C.trackEdge}" stroke-width="3"/>`;
  for (let k = 0; k < n; k++) { const row = k < 5 ? 0 : 1, col = row ? k - 5 : k, cnt = row ? n - 5 : Math.min(n, 5); s += `<circle cx="${50 + (col - (cnt - 1) / 2) * 9}" cy="${42 + row * 9}" r="3" fill="${C.hud}"/>`; }
  s += '</g>';
  if (locked) s += `<g transform="translate(35,4)"><path d="M 9 13 V 9 A 6 6 0 0 1 21 9 V 13" fill="none" stroke="${C.trackEdge}" stroke-width="3"/><rect x="5" y="12" width="20" height="15" rx="3" fill="${C.trackEdge}"/></g>`;
  else if (sv.grade > 0) for (let k = 0; k < 3; k++) s += k < sv.grade ? `<circle cx="${36 + k * 14}" cy="66" r="6" fill="${C.hud}" stroke="${C.outline}" stroke-width="1.6"/><circle cx="${36 + k * 14}" cy="66" r="3.8" fill="none" stroke="${C.outline}" stroke-width="1"/>` : `<circle cx="${36 + k * 14}" cy="66" r="6" fill="none" stroke="${C.trackEdge}" stroke-width="1.4" stroke-dasharray="3 2.4"/>`;
  else if (sv.flag) s += `<g transform="translate(50,64) scale(0.12)" stroke="${C.outline}" stroke-width="6" stroke-linejoin="round"><rect x="-40" y="-50" width="13" height="100" rx="6" fill="${C.trackEdge}"/><polygon points="-27,-50 45,-32 -27,-6" fill="${C.hud}"/></g>`;
  return s + '</svg>';
}
function buildLevels() {
  const grid = $('grid');
  grid.innerHTML = '';
  D.levels.forEach((lv, i) => {
    const t = themeOf(i), sv = lvSave(i), locked = i + 1 > store.unlocked;
    const card = document.createElement('div');
    card.className = 'lcard' + (locked ? ' locked' : '');
    card.style.background = t.bgFar; card.style.borderColor = locked ? D.palette.common.trackEdge : t.cardTint;
    const status = locked ? T.levelcard_locked : sv.grade ? T['grade_' + sv.grade] : sv.flag ? T.practice_clear : T.levelcard_new;
    const play = document.createElement('button');
    play.className = 'lplay'; play.type = 'button';
    play.setAttribute('aria-label', `${T[lv.name_key]}, ${status}`);
    play.innerHTML = miniSvg(i, locked) + `<span class="lname">${T[lv.name_key]}</span>`;
    play.addEventListener('click', () => { if (locked) { play.classList.remove('shake'); void play.offsetWidth; play.classList.add('shake'); return; } menuSnd(); startLevel(i, false); });
    card.appendChild(play);
    const row = document.createElement('div'); row.className = 'lrow';
    const cid = cardIdOf(i);
    if (cid && !locked) {
      const rb = document.createElement('button'); rb.type = 'button'; rb.className = 'ibtn sm'; rb.setAttribute('aria-label', T.btn_card_replay);
      rb.innerHTML = `<img src="data/svg/cards/${cid}.svg" alt="" class="thumb">`;
      rb.addEventListener('click', () => { menuSnd(); showCard(i, 'levels'); });
      row.appendChild(rb);
    } else row.appendChild(Object.assign(document.createElement('span'), { className: 'gap' }));
    if (!locked) {
      const pb = document.createElement('button'); pb.type = 'button'; pb.className = 'ibtn sm'; pb.setAttribute('aria-label', `${T[lv.name_key]}, ${T.btn_practice}`);
      pb.innerHTML = '<img src="data/svg/flag.svg" alt="">';
      pb.addEventListener('click', () => { menuSnd(); startLevel(i, true); });
      row.appendChild(pb);
    }
    card.appendChild(row);
    grid.appendChild(card);
  });
  fitGrid();
}
function fitGrid() {
  const grid = $('grid'); if (!grid) return;
  const W = innerWidth, H = innerHeight, c = D.art.card, top = 72;
  const availW = W - 32, availH = H - top - 12;
  let best = null;
  for (let cols = 1; cols <= 10; cols++) {
    const rows = Math.ceil(10 / cols);
    const w = Math.min(c.w, (availW - (cols - 1) * c.gap) / cols);
    const h = Math.min(c.h, (availH - (rows - 1) * c.gap) / rows);
    const k = Math.min(w / c.w, h / c.h);
    const fits = w >= 100 && h >= 104;
    const score = (fits ? 10 : 0) + k;
    if (!best || score > best.score) best = { cols, w, h, score, fits };
  }
  if (!best.fits) { const cols = Math.max(1, Math.floor((availW + c.gap) / (100 + c.gap))); best = { cols, w: Math.min(c.w, (availW - (cols - 1) * c.gap) / cols), h: c.h }; }
  grid.style.gridTemplateColumns = `repeat(${best.cols}, ${Math.floor(best.w)}px)`;
  grid.style.setProperty('--cw', Math.floor(best.w) + 'px'); grid.style.setProperty('--ch', Math.floor(best.h) + 'px');
  grid.classList.toggle('scrolls', grid.scrollHeight > grid.clientHeight + 1);
}
function showLevels() {
  if (run && A) A.stopSong(0.05);
  run = null;
  setTheme(themeOf(Math.min(store.unlocked, 10) - 1));
  setState('levels'); show('sLevels');
  buildLevels();
  refreshLate();
}

// ---------- 보호자 문 (설정 길게 누르기) ----------
const gate = { down: false, t0: 0, prog: 0, drainFrom: 0, drainT: -1, emptyUntil: 0, id: null };
function gateDown(e) {
  e.preventDefault();
  gate.down = true; gate.t0 = performance.now(); gate.id = e.pointerId; gate.drainT = -1;
  try { $('bGate').setPointerCapture(e.pointerId); } catch {}
}
function gateUp() {
  if (!gate.down) return;
  gate.down = false;
  const g = D.bal.guardian_gate;
  gate.drainFrom = gate.prog; gate.drainT = performance.now();
  gate.emptyUntil = performance.now() + g.single_tap_hint_ms;
}
function gateFrame(now) {
  const g = D.bal.guardian_gate;
  if (gate.down) {
    gate.prog = Math.min(1, (now - gate.t0) / g.hold_ms);
    if (gate.prog >= 1) { gate.down = false; gate.prog = 0; gate.emptyUntil = 0; menuSnd(); showSettings(); }
  } else if (gate.drainT >= 0) {
    gate.prog = Math.max(0, gate.drainFrom * (1 - (now - gate.drainT) / g.release_early_empty_ms));
    if (gate.prog <= 0) gate.drainT = -1;
  }
  const vis = gate.down || gate.prog > 0 || now < gate.emptyUntil;
  const ring = $('gateRing');
  ring.classList.toggle('hidden', !vis);
  $('gateHint').classList.toggle('hidden', !vis);
  const c = 2 * Math.PI * D.art.guardian.ringR;
  $('gateArc').setAttribute('stroke-dasharray', `${c * gate.prog} ${c}`);
}

// ---------- 소리가 늦어요 표지 ----------
function lateConds() {
  const al = D.bal.audio_latency, lh = al.late_hint_ms, dc = al.drift_check;
  const auto = audio.ok ? autoLat() : 0;
  const A1 = (store.offsetMs || 0) > lh;
  const B = auto >= lh || (store.calibAutoLat != null && audio.ok && Math.abs(auto - store.calibAutoLat) > dc.also_trigger_on.output_latency_change_ms) || store.late.device;
  const C = !!store.late.drift;
  return { any: A1 || B || C, sig: `${+A1}${+B}${+C}` };
}
function refreshLate() {
  const c = lateConds(), l = store.late, al = D.bal.audio_latency;
  if (c.sig !== l.sig) { l.sig = c.sig; l.sessions = 0; }
  if (c.any && !sessionCounted) { l.sessions++; sessionCounted = true; }
  Store.save(store);
  lateVisible = c.any && l.sessions <= Math.min(al.late_hint.max_sessions_shown_if_unchanged, al.drift_check.signal.max_sessions_shown);
  for (const id of ['gateBadge', 'calibBadge']) $(id).classList.toggle('hidden', !lateVisible);
  $('lateTip').classList.toggle('hidden', !lateVisible);
}

// ---------- 설정 ----------
function showSettings() { setState('settings'); show('sSettings'); applySound(); refreshLate(); }

// ---------- 보정 ----------
let cal = null;
function startCalib(first) {
  const gc = D.bal.audio_latency.guardian_calibration;
  if (first) setTheme(themeOf(0));
  setState('calib'); show('sCalib');
  $('together').classList.toggle('hidden', !(first && gc.first_run_picture_only_on_first_run));
  $('bRedo').classList.add('hidden');
  const beatMs = 60000 / gc.bpm;
  cal = { first, gc, beatMs, taps: [], rounds: [], retries: 0, filled: 0, phase: 'tap', endV: 0, emptyV: -1, hand: true };
  if (TEST || !audio.ok) cal.base = clock.V() + beatMs;
  else {
    cal.base = A.now() * 1000 + beatMs;
    A.setSong(cal.base, Array.from({ length: 240 }, (_, k) => ({ x: k * beatMs, name: 'tick' })));
  }
  setCalibAria();
}
function setCalibAria() { const p = $('calibProg'); p.setAttribute('aria-valuenow', String(cal.filled)); p.setAttribute('aria-valuemax', String(cal.gc.taps_per_round)); }
function calibTap(ts) {
  if (!cal || cal.phase !== 'tap') return;
  const gc = cal.gc;
  const t = TEST || !audio.ok ? clock.vt : clock.ctOf(ts) * 1000 - autoLat();
  const k = Math.round((t - cal.base) / cal.beatMs);
  if (t < cal.base - cal.beatMs / 2) return; // 첫 박 전
  calibDiff(t - (cal.base + k * cal.beatMs));
  if (A) A.play('stray');
}
function calibDiff(diff) {
  const gc = cal.gc;
  cal.hand = false;
  cal.taps.push(diff); cal.filled++;
  R.ripple(clock.V(), D.art.fx.stray.ripple, D.art.fx.stray.ms);
  setCalibAria();
  if (cal.taps.length < gc.taps_per_round) return;
  const r = evalRound(cal.taps, gc);
  cal.taps = [];
  if (!r.ok) {
    if (cal.retries < gc.max_retries) { cal.retries++; emptyDots(); return; }
    return calibEnd(false);
  }
  cal.rounds.push(r);
  if (cal.rounds.length < gc.rounds) { emptyDots(); return; }
  const f = finalOffset(cal.rounds[0], cal.rounds[1], gc);
  if (!f.ok) {
    if (cal.retries < gc.max_retries) { cal.retries++; cal.rounds = []; emptyDots(); return; }
    return calibEnd(false);
  }
  store.offsetMs = f.offset;
  calibEnd(true, f);
}
function emptyDots() { cal.emptyV = clock.V(); }
function calibEnd(ok, f) {
  const gc = cal.gc;
  cal.phase = ok ? 'done' : 'kept';
  cal.result = f || null;
  cal.endV = clock.V();
  if (ok) {
    store.calibAutoLat = autoLat(); store.late.drift = false; store.late.device = false; store.late.sessions = 0;
    if (A) A.play('bell_low', null, { f: D.music.calib_check_hz });
    $('calibLive').textContent = T[gc.done_signal];
    $('bRedo').classList.remove('hidden');
  } else {
    $('calibLive').textContent = T[gc.on_fail_aria_key];
    cal.emptyV = cal.endV;
  }
  store.calibDone = true;
  Store.save(store); updateComp();
}
function calibFrame(V) {
  if (!cal) return;
  const c = D.art.calib;
  if (cal.emptyV >= 0) {
    const k = (V - cal.emptyV) / 200;
    if (k >= 1) { if (cal.phase === 'tap') cal.filled = 0; cal.emptyV = -1; setCalibAria(); }
  }
  if (cal.phase !== 'tap' && V - cal.endV >= c.doneHoldS * 1000) finishCalib();
}
function finishCalib(skip = false) {
  if (!cal) return;
  const first = cal.first;
  if (skip && first) { store.offsetMs = 0; store.calibDone = true; Store.save(store); updateComp(); }
  cal = null;
  if (A) A.stopSong(0.02);
  $('calibLive').textContent = '';
  if (first) startLevel(0, false);
  else showSettings();
}

// ---------- 그림 카드 ----------
function showCard(i, ret) {
  const cid = cardIdOf(i);
  cardReturn = ret;
  setTheme(themeOf(i));
  $('cardImg').src = `data/svg/cards/${cid}.svg`;
  $('cardImg').setAttribute('aria-label', T[cid]);
  setState('card'); show('sCard');
  placeUi();
}
function closeCard() {
  menuSnd();
  const i = levelIndex;
  if (cardReturn === 'levels') { cardReturn = null; showLevels(); return; }
  lvSave(i).cardSeen = true; Store.save(store);
  beginRun();
}

// ---------- 플레이 ----------
function startLevel(i, prac, { card = true } = {}) {
  levelIndex = i; practice = prac; L = D.L[i];
  setTheme(themeOf(i));
  if (A) A.levelMusic = D.music.levels[D.levels[i].id];
  if (card && cardIdOf(i) && !lvSave(i).cardSeen) { showCard(i, 'play'); return; }
  beginRun();
}
function beginRun() {
  if (A) A.stopSong(0.02);
  updateComp();
  run = new Run(L, D.bal, { practice, startV: clock.V(), leadMs: START_LEAD_MS });
  const sv = lvSave(levelIndex);
  S = { th, L, art: D.art, bal: D.bal, best: sv.best || 0, slideFrom: null, gradeStartX: slotTimeMs(L, L.lastPlayBar + 2, 0) };
  $('pracTag').classList.toggle('hidden', !practice);
  $('sPlay').setAttribute('aria-label', T.aria_play_area);
  setState('play'); show('sPlay');
  placeUi();
  handleEvents();
}
function songFor(e) {
  const modeOf = (x) => run.barMode(x);
  const stageOf = (b) => { let st = 1; for (const s of L.level.sections) if (s.start_bar <= b && s.stage) st = s.stage; return st; };
  return buildSong(L, e.t0, D.music, D.sound, modeOf, stageOf);
}
function handleEvents() {
  if (!run) return;
  for (const e of run.events.splice(0)) {
    if (e.type === 'attempt') { if (A && audio.ok) A.setSong(e.songStartV, songFor(e)); }
    else if (e.type === 'abort') { if (A) A.stopSong(0.02); }
    else if (e.type === 'fail') {
      if (A) { A.stopSong(D.bal.restart.music_fade_out_s); A.play('fail'); if (e.newBest) A.play('best'); }
      if (!run.practice) {
        const sv = lvSave(levelIndex);
        S.slideFrom = S.best;
        if (e.progress > (sv.best || 0)) { sv.best = e.progress; S.best = e.progress; $('live').textContent = T.aria_new_best; } else S.slideFrom = null;
      }
      lvSave(levelIndex).attempts++;
      Store.save(store);
    } else if (e.type === 'clear') {
      const sv = lvSave(levelIndex);
      if (A) {
        A.play('clear');
        const n = run.practice ? 1 : run.grade;
        for (let k = 0; k < n; k++) A.play('bell_high', (run.songStartV + S.gradeStartX + k * L.beatMs) / 1000);
      }
      if (run.practice) sv.flag = true; else { sv.grade = Math.max(sv.grade || 0, run.grade); sv.best = 1; S.best = 1; }
      store.unlocked = Math.max(store.unlocked, Math.min(D.levels.length, levelIndex + 2));
      Store.save(store);
    } else if (e.type === 'end') showResult();
    else if (e.type === 'drift') { store.late.drift = true; Store.save(store); }
  }
  $('progAria').setAttribute('aria-valuenow', String(Math.round(run.progress * 100)));
  $('attAria').setAttribute('aria-label', `${T.aria_attempts} ${run.attempts}`);
}
function gameTap(ts) {
  if (!run) return;
  const V = clock.tapV(ts);
  run.update(V);
  const r = run.tap(V);
  const fx = D.art.fx;
  if (A) {
    if (r.kind === 'perfect') { A.play(r.slot === 0 ? 'tap_top' : 'tap'); A.play('bell_high'); }
    else if (r.kind === 'good') { A.play(r.slot === 0 ? 'tap_top' : 'tap'); A.play('bell_low'); }
    else if (r.kind === 'pass') A.play('tap_pass');
    else A.play('stray');
  }
  const f = fx[r.kind] || fx.stray;
  R.ripple(V, f.ripple, f.ms);
  handleEvents();
  return r;
}
function showResult() {
  setState('result'); show('sPlay', 'sResult');
  $('bNext').setAttribute('aria-label', levelIndex + 1 < D.levels.length ? T.btn_next : T.btn_levels);
  placeUi();
}
function pauseGame(bg) {
  if (state !== 'play') return;
  pauseV = clock.V();
  if (A) { A.stopSong(0.03); }
  setState('pause'); show('sPlay', 'sPause');
  $('pausedBg').classList.toggle('hidden', !bg);
  if (A && bg) A.suspend();
}
async function resumeGame() {
  if (state !== 'pause') return;
  menuSnd();
  if (A) { try { await A.resume(); } catch {} clock.off = null; clock.sample(); }
  setState('play'); show('sPlay');
  if (run.phase === 'clearing') { run.update(run.songStartV + L.durationMs + 1); handleEvents(); return; }
  if (run.phase === 'cleared' || run.phase === 'done') { run.update(run.songStartV + L.durationMs + 1); handleEvents(); if (state !== 'result') showResult(); return; }
  run.restartNow(clock.V(), START_LEAD_MS, run.phase === 'fail');
  handleEvents();
}

// ---------- 배치 ----------
function placeUi() {
  if (!R) return;
  const lay = R.lay;
  const sP = $('bPause'); sP.style.left = lay.pause.x + 'px'; sP.style.top = lay.pause.y + 'px';
  const pa = $('progAria'); Object.assign(pa.style, { left: lay.bar.x + 'px', top: lay.bar.y + 'px', width: lay.bar.w + 'px', height: lay.bar.h + 'px' });
  const at = $('attAria'); Object.assign(at.style, { left: lay.bar.x + 'px', top: lay.dotsY - 6 + 'px', width: '140px', height: '12px' });
  const pt = $('pracTag'); Object.assign(pt.style, { left: lay.bar.x + 'px', top: lay.dotsY + 12 + 'px' });
  // 결과 버튼
  const c = D.art.clear, btnW = 3 * c.btn + 2 * c.btnGap, rb = $('resultBtns');
  let x, y, col = false;
  if (lay.thumb) { x = lay.W / 2 - btnW / 2; y = lay.thumb.y + lay.thumb.h / 2 - c.btn / 2; }
  else {
    const below = lay.cy + lay.R + lay.starR + 8;
    if (lay.H - below >= c.btn + 12) { x = lay.W / 2 - btnW / 2; y = below; }
    else { col = true; x = lay.W - c.btn - 24; y = lay.H / 2 - btnW / 2; }
  }
  rb.classList.toggle('col', col);
  Object.assign(rb.style, { left: x + 'px', top: y + 'px' });
  const ct = $('clearTitle');
  if (lay.thumb) Object.assign(ct.style, { left: '16px', right: '16px', top: (lay.thumb.y - 0) + 6 + 'px', textAlign: 'center' });
  else Object.assign(ct.style, { left: '16px', right: 'auto', top: lay.H / 2 - 20 + 'px', width: Math.max(80, lay.cx - lay.R - lay.starR - 32) + 'px', textAlign: 'left' });
  // 튜토리얼 문구 (손가락 옆)
  const tu = $('tut'), ha = D.art.hand;
  if (lay.thumb) Object.assign(tu.style, { left: '16px', right: '16px', width: 'auto', top: lay.thumb.y + 8 + 'px', textAlign: 'center' });
  else Object.assign(tu.style, { left: 'auto', right: '12px', width: Math.max(90, lay.W - (lay.cx + lay.R + lay.starR) - 24) + 'px', top: lay.H - ha.landscapeFromBottom - ha.size / 2 - 52 + 'px', textAlign: 'center' });
  // 카드
  const ci = $('cardImg'), k = D.art.card.landscapeMaxW;
  const cw = lay.portrait ? lay.W - 32 : Math.min(lay.W * k, (lay.H - 40) * (720 / 300));
  ci.style.width = cw + 'px';
}

// ---------- 루프 ----------
let lastPerf = performance.now();
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  lastPerf = now;
  clock.sample();
  if (!D) return;
  const V = clock.V();
  if (!TEST && state === 'play' && run) { run.update(V, REALTIME_GRACE_MS); handleEvents(); }
  if (A) A.pump();
  if (state === 'calib') calibFrame(V);
  if (state === 'levels') gateFrame(now);
  if (autoRT) autoRT.frame();
  draw(V);
}
function draw(V) {
  if (!th) return;
  if ((state === 'play' || state === 'pause' || state === 'result') && run) {
    S.th = th; S.run = run; S.V = state === 'pause' ? pauseV : V;
    R.play(S);
    $('tut').classList.toggle('hidden', !S.handOn);
  } else if (state === 'calib' && cal) {
    const ek = cal.emptyV >= 0 ? Math.min(1, (V - cal.emptyV) / 200) : null;
    R.calib(th, V, { filled: cal.filled, emptyK: ek, checkK: cal.phase === 'done' ? (V - cal.endV) / (D.art.calib.checkGrowS * 1000) : 0, hand: cal.hand });
  } else if (state === 'title' || state === 'card') R.title(th);
  else R.menuBg(th);
}

function resize() {
  const W = innerWidth, H = innerHeight, dpr = Math.min(3, devicePixelRatio || 1);
  const cs = getComputedStyle(document.documentElement);
  const safe = { t: parseFloat(cs.getPropertyValue('--sat')) || 0, b: parseFloat(cs.getPropertyValue('--sab')) || 0 };
  R.resize(W, H, dpr, safe);
  placeUi();
  if (state === 'levels') fitGrid();
}

// ---------- 입력 ----------
function onTap(ts) {
  if (state === 'title') afterTitle();
  else if (state === 'calib') calibTap(ts);
  else if (state === 'card') closeCard();
  else if (state === 'play') return gameTap(ts);
  else if (state === 'pause') resumeGame();
}
function bindInput() {
  document.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    if (e.target.closest && e.target.closest('button, .noTap')) return;
    if (state === 'play' || state === 'calib' || state === 'card') e.preventDefault();
    onTap(e.timeStamp);
  }, { passive: false });
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key === 'Escape' && state === 'play') { pauseGame(false); return; }
    if (e.key !== ' ' && e.key !== 'Enter') return;
    if (e.target.closest && e.target.closest('button')) return;
    e.preventDefault();
    onTap(e.timeStamp);
  });
  document.addEventListener('pointerup', () => { if (A && A.ctx && A.ctx.state === 'suspended' && state !== 'pause' && !document.hidden) A.ctx.resume().catch(() => {}); });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (state === 'play') pauseGame(true); if (A) A.suspend(); }
    else if (A && state !== 'pause') A.resume();
  });
  addEventListener('resize', resize);
  navigator.mediaDevices?.addEventListener?.('devicechange', () => { if (store.calibAutoLat != null) { store.late.device = true; Store.save(store); } });
  const click = (id, fn) => $(id).addEventListener('click', fn);
  click('bSoundT', toggleSound); click('bSoundP', toggleSound);
  click('bBack', () => { menuSnd(); showTitle(); });
  const bg = $('bGate');
  bg.addEventListener('pointerdown', gateDown);
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bg.addEventListener(ev, gateUp);
  bg.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!gate.down) { gate.down = true; gate.t0 = performance.now(); } } });
  bg.addEventListener('keyup', gateUp);
  click('bClose', () => { menuSnd(); showLevels(); });
  click('tMusic', () => { store.music = !store.music; Store.save(store); applySound(); menuSnd(); });
  click('tSfx', () => { store.sfx = !store.sfx; Store.save(store); applySound(); menuSnd(); });
  click('bCalib', () => { menuSnd(); startCalib(false); });
  click('bReset', () => { menuSnd(); setState('confirm'); show('sConfirm'); });
  click('cfNo', () => { menuSnd(); showSettings(); });
  click('cfYes', () => { store = Store.reset(store); Store.save(store); menuSnd(); showSettings(); });
  click('bSkip', () => { menuSnd(); finishCalib(true); });
  click('bRedo', () => { menuSnd(); startCalib(false); });
  click('bPause', () => { menuSnd(); pauseGame(false); });
  click('pResume', () => resumeGame());
  click('pRetry', () => { menuSnd(); if (A) A.resume(); startLevel(levelIndex, practice, { card: false }); });
  click('pLevels', () => { menuSnd(); if (A) A.resume(); showLevels(); });
  click('bNext', () => { menuSnd(); if (levelIndex + 1 < D.levels.length) startLevel(levelIndex + 1, false); else showLevels(); });
  click('bRetry', () => { menuSnd(); startLevel(levelIndex, practice, { card: false }); });
  click('bLevels', () => { menuSnd(); showLevels(); });
}

// ---------- 실시간 자동 입력 (QA: 일반 모드 rAF + 실제 pointer 이벤트 경로) ----------
let autoRT = null;
function startAutoRealtime(offsetMs = 0, sigma = 0, seed = 1) {
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
  const done = new Set();
  return new Promise((resolve) => {
    autoRT = {
      frame() {
        if (state === 'result' || !run) { autoRT = null; resolve(api.summary()); return; }
        if (state !== 'play' || run.phase !== 'run') return;
        const st = L.stars[run.i];
        if (!st) return;
        const key = `${run.attempts}:${run.i}`;
        if (done.has(key)) return;
        const target = clock.perfOfV(run.songStartV + st.t + offsetMs + (sigma ? gauss() * sigma : 0));
        if (target - performance.now() > 30) return;
        done.add(key);
        while (performance.now() < target) { /* 짧은 대기 (30 ms 이하) */ }
        const cv = $('cv');
        cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true, button: 0, clientX: innerWidth / 2, clientY: innerHeight / 2 }));
        cv.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true, button: 0 }));
      },
    };
  });
}

// ---------- 테스트 훅 ----------
function stepTest(dt) {
  if (!TEST) return false;
  const end = clock.vt + dt * 1000;
  while (clock.vt < end - 1e-9) {
    clock.vt = Math.min(end, clock.vt + 4);
    if (state === 'play' && run) { run.update(clock.vt); handleEvents(); }
    if (state === 'calib') calibFrame(clock.vt);
  }
  return true;
}
const api = {
  ready: false,
  test: TEST,
  get state() { return state; },
  get phase() { return run ? run.phase : null; },
  get levelIndex() { return levelIndex; },
  get practice() { return practice; },
  get progress() { return run ? run.progress : 0; },
  get attempts() { return run ? run.attempts : 0; },
  get best() { return run ? Math.max(S.best || 0, run.best) : 0; },
  get grade() { return run ? run.grade ?? 0 : 0; },
  loadLevel(i, opts = {}) { if (state === 'loading') return false; startLevel(i, !!opts.practice, { card: !!opts.card }); return true; },
  step(dt) { const r = stepTest(dt); return r ? state : false; },
  press() { return onTap(TEST ? 0 : performance.now()); },
  release() {},
  pressAt(levelMs) {
    if (!TEST || !run) return null;
    const V = run.songStartV + levelMs;
    if (V > clock.vt) stepTest((V - clock.vt) / 1000);
    clock.vt = Math.max(clock.vt, V);
    return gameTap(0);
  },
  levelTime() { return run ? run.lt(clock.V()) : null; },
  audioTime() { return A && A.ctx ? A.ctx.currentTime : null; },
  gameClock() { return clock.V(); },
  stars() { return L ? L.stars.map((s) => ({ i: s.i, t: s.t, bar: s.bar, slot: s.slot, passStart: s.passStart, passEnd: s.passEnd, zoneStart: s.zoneStart })) : []; },
  perfectTaps(offsetMs = 0) { return L ? L.stars.map((s) => s.t + offsetMs) : []; },
  nextStarPerfTime() { if (!run || !L.stars[run.i]) return null; return clock.perfOfV(run.songStartV + L.stars[run.i].t); },
  judgeLog() { return run ? run.judged.map(({ i, e, grade }) => ({ i, e, grade })) : []; },
  history() { return run ? run.log.map(({ clear, progress, failIndex, reason, grade, practice: p, stray }) => ({ clear, progress, failIndex, reason, grade, practice: p, stray })) : []; },
  // 완벽 입력열(+오프셋·정규 오차) 재생. 테스트 모드: 동기 실행 후 결과. 일반 모드: 실제 pointer 이벤트를 rAF 시각에 맞춰 보내고 Promise
  autoplay(offsetMs = 0, sigma = 0, seed = 1) {
    if (!run) return null;
    if (!TEST) return startAutoRealtime(offsetMs, sigma, seed);
    let s = seed >>> 0;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
    const att = run.attempts;
    for (const st of L.stars.slice(run.i)) {
      if (run.attempts !== att || run.phase !== 'run') break;
      this.pressAt(st.t + offsetMs + (sigma ? gauss() * sigma : 0));
    }
    let guard = 0;
    while (state === 'play' && run.attempts === att && guard++ < 2000) stepTest(0.05);
    return this.summary();
  },
  summary() { const h = run ? run.log[run.log.length - 1] : null; return { state, phase: run && run.phase, clear: !!(h && h.clear), grade: run ? run.grade ?? 0 : 0, attempts: run ? run.attempts : 0, progress: run ? run.progress : 0, lastResult: h ? { clear: h.clear, progress: h.progress, failIndex: h.failIndex, reason: h.reason } : null }; },
  setOffset(ms) { store.offsetMs = ms; Store.save(store); updateComp(); return clock.comp; },
  get offset() { return store.offsetMs; },
  latency() { return { auto: autoLat(), manual: store.offsetMs, comp: clock.comp }; },
  show(name) {
    const m = { title: showTitle, levels: showLevels, settings: showSettings, calib: () => startCalib(true), calibRedo: () => startCalib(false), pause: () => pauseGame(false), confirm: () => { setState('confirm'); show('sConfirm'); } };
    m[name]?.(); return state;
  },
  calibTap(diffMs) { if (cal && cal.phase === 'tap') calibDiff(diffMs); return cal ? { phase: cal.phase, filled: cal.filled, rounds: cal.rounds.length, retries: cal.retries } : { state, offset: store.offsetMs }; },
  calibSimulate(rounds) { return simulate(rounds, D.bal.audio_latency.guardian_calibration); },
  skipCalibration() { store.calibDone = true; Store.save(store); if (state === 'calib') finishCalib(true); return state; },
  lateHint() { return { visible: lateVisible, ...lateConds(), sessions: store.late.sessions, drift: run ? run.drift : null }; },
  save() { return JSON.parse(JSON.stringify(store)); },
  layout() { return R ? R.lay : null; },
  layoutFor(W, H) { return layout(W, H, D.art); },
  ads,
};
window.__game = api;

// ---------- 시작 ----------
async function boot() {
  lang = (Q.get('lang') || navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en';
  bindInput();
  requestAnimationFrame(frame);
  try { D = await loadAll(); }
  catch (err) {
    $('loadErr').classList.remove('hidden'); $('bReload').classList.remove('hidden');
    $('bReload').addEventListener('click', () => location.reload());
    return;
  }
  applyText();
  R = new Renderer($('cv'), D);
  setTheme(themeOf(0));
  resize();
  applySound();
  ads.init();
  showTitle();
  api.ready = true;
}
boot();
