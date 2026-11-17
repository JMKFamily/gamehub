// 똑딱북(rhythm-01) 웹 빌드: 화면 흐름, 입력, 시계, 저장, 테스트 훅
import { prepareLevel, Run, slotTimeMs } from './engine.js';
import { AudioOut, buildSong, comboChordTime } from './audio.js';
import { Renderer, layout } from './render.js';
import { speedOf, leadOf } from './road.js';
import { accuracyPct, levelAccuracy, checkAccuracyData } from './readout.js';
import { evalRound, finalOffset, simulate, calibTapDiffR11, attemptComp } from './calib.js';
import * as Store from './store.js';
import { ads } from './ads.js';

const Q = new URLSearchParams(location.search);
const TEST = Q.get('test') === '1';
// 콤보 표시·단계 화음 켬/끔 (?combo=0 = 끔). 콤보는 판정에서 파생하는 보상 층이라 판정·클리어·재시작에 영향 없음(봇 재판정 대조용)
const COMBO = Q.get('combo') !== '0';
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
let pauseV = 0, cardReturn = null, cardShown = null;
let lateVisible = false, sessionCounted = false;
let safeIns = { t: 0, b: 0 };
let RO = null; // 판정 이름 (10-lore R3-12 judge_* 키, 언어마다)
let pendingBegin = false; // R11 ③ 안정 대기 뒤 시작할 시도

// ---------- 시계 ----------
// V(ms) = 오디오 시계 - 지연 보정. 실시간: performance 시계 + (오디오 - performance) 차이 추정. 테스트: 가상 시계
const clock = {
  vt: 0, off: null, comp: 0, auto: 0,
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
// autoNow = 지금 읽은 자동 지연 (outputLatency + baseLatency, ms)
function autoLat() { return TEST || !A ? 0 : A.autoLatencyMs(); }
// R11 ②: 판정 comp = 시도 시작 때 autoNow + 수동 오프셋 (calib.js attemptComp). clock.auto 는 그 시도의 값이고
// 판정·공 그리기·표시(latency().auto)가 모두 이 값을 씀(R9). 시도 중에는 바꾸지 않음.
// 다시 읽는 때: 시도 시작(beginRun·실패 뒤 재시작·일시정지 복귀), 오디오 잠금 해제, 보정 끝, 오프셋 설정(시도 밖).
function updateComp() { clock.auto = autoLat(); clock.comp = attemptComp(clock.auto, store.offsetMs); }
// R11 ③ 잠금 해제 뒤 안정 대기가 끝났는지 (테스트 모드·오디오 없음 = 끝남)
function latSettled() { return TEST || !A || !A.ctx || A.lat?.settled !== false; }
// R11 재시작: 실패 → 다음 시도 경계에서 comp 를 다시 읽고, 바뀐 양 dc 만큼 재시작 시각(V)을 옮겨 1.08 s(벽시계)를 유지
// (auto_latency_read.restart_keeps_delay). V = 오디오 시계 − comp 라 같은 순간의 V 도 dc 만큼 줄어듦. 반환 = 새 comp 기준 V
function rereadAtRestart(V) {
  if (!run || run.phase !== 'fail' || V < run.restartV) return V;
  const old = clock.comp;
  updateComp();
  const dc = clock.comp - old;
  if (dc && D.bal.audio_latency.auto_latency_read.restart_keeps_delay) run.restartV -= dc;
  return V - dc;
}

// ---------- 데이터 ----------
async function loadAll() {
  const j = (p) => fetch('data/' + p).then((r) => { if (!r.ok) throw new Error(p); return r.json(); });
  const [balance, palette, art, sound, music, strings] = await Promise.all(['balance.json', 'palette.json', 'art.json', 'sound.json', 'music.json', 'strings.json'].map(j));
  const levels = await Promise.all(balance.levels.map((p) => j(p)));
  const imgNames = ['hand-tap', 'flag'];
  const imgs = {};
  await Promise.all(imgNames.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { imgs[n] = im; res(); }; im.onerror = res; im.src = `data/svg/${n}.svg`; })));
  const Ls = levels.map((lv) => prepareLevel(lv, balance));
  checkAccuracyData(balance, Ls); // 판정 % 데이터가 숫자가 아니면 불러오기 실패로 멈춤 (insights)
  return { bal: balance, palette, art, sound, music, strings, levels, imgs, L: Ls };
}

// ---------- 텍스트 ----------
function applyText() {
  T = D.strings[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach((e) => { e.textContent = T[e.dataset.t] ?? ''; });
  document.querySelectorAll('[data-a]').forEach((e) => { e.setAttribute('aria-label', T[e.dataset.a] ?? ''); });
  document.title = T.title;
  RO = { names: { perfect: T.judge_perfect, good: T.judge_good, pass: T.judge_pass } };
}

// ---------- 테마 ----------
function themeOf(i) { return D.palette.themes[D.levels[i].theme_id]; }
function setTheme(t) {
  if (th === t) return; // 같은 테마면 CSS 변수를 다시 쓰지 않음(문서 전체 스타일 재계산 방지, R12)
  th = t;
  const s = document.documentElement.style, C = D.palette.common;
  s.setProperty('--bg', t.bg); s.setProperty('--bgFar', t.bgFar); s.setProperty('--tint', t.cardTint);
  s.setProperty('--edge', C.trackEdge); s.setProperty('--hud', C.hud); s.setProperty('--ink', C.outline); s.setProperty('--ball', C.ball);
  s.setProperty('--track1', t.track1);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t.bg);
}

// ---------- 화면 ----------
const SCREENS = ['sLoading', 'sTitle', 'sLevels', 'sSettings', 'sConfirm', 'sCalib', 'sCard', 'sPlay', 'sPause', 'sResult'];
function show(...ids) {
  if (warmIds) endWarm(); // R13: 화면이 바뀌는 프레임에 미리 그리기 상태를 바로 끝냄
  for (const id of SCREENS) $(id).classList.toggle('show', ids.includes(id));
}
// 처음 보이는 화면의 그림·글 배치 비용을 타이틀 뒤에서 미리 냄 (거의 투명하게 2프레임, 탭 안 받음). 레벨 첫 시작 프레임이 길어지는 것 방지 (round-2 성능)
// R13: 튜토리얼 글은 hidden 클래스를 건드리지 않고 CSS(.screen.warm:not(.show) #tut)로만 보이게 함 → 표시 상태가 어긋나 남지 않음
let warmIds = null;
function endWarm() { for (const id of warmIds) $(id).classList.remove('warm'); warmIds = null; $('sCard').classList.remove('warm'); }
function warmScreens() {
  warmIds = ['sPlay', 'sResult', 'sPause'];
  for (const id of warmIds) $(id).classList.add('warm');
  let n = 0;
  const f = () => { if (!warmIds) return; if (++n < 3) { requestAnimationFrame(f); return; } for (const id of warmIds) $(id).classList.remove('warm'); };
  requestAnimationFrame(f);
  // 첫 실행에 바로 나오는 레벨 1 그림 카드도 같은 크기로 미리 그려 둠: 카드 SVG 첫 해독·래스터화가 레벨 시작 창에
  // 98~248 ms 프레임(스크립트 0)을 만들었음 (R12). 해독이 끝난 뒤 2프레임 더 그리고 끝냄. 화면이 바뀌면 바로 끝냄(show → endWarm)
  // 반환 Promise = 카드 미리 그리기 끝 (boot 가 이것을 기다린 뒤 테스트 훅 ready)
  const c0 = cardIdOf(0), ci = $('cardImg');
  if (!c0) return Promise.resolve();
  placeCard(c0);
  $('sCard').classList.add('warm');
  return new Promise((res) => {
    const done = () => { let k = 0; const g = () => { if (!warmIds) return res(); if (++k < 3) { requestAnimationFrame(g); return; } $('sCard').classList.remove('warm'); res(); }; requestAnimationFrame(g); };
    (ci.decode ? ci.decode() : Promise.resolve()).then(done, done);
  });
}
// 화면 밖 미리 돌리기: 레벨 1 완벽 입력 + 실패 + 클리어 장면을 작은 캔버스에 그림 (게임 상태·저장은 건드리지 않음)
function warmCode() {
  try {
    // 반박·콤보 20 이 있는 레벨 2 도 같이 (별 18개인 레벨 1 은 콤보 20 단계가 없음)
    for (const li of [0, 1]) {
    const Lw = D.L[li], th0 = themeOf(li);
    const r = new Run(Lw, D.bal, { startV: 0 });
    const S0 = sceneOf(Lw, th0, 0.3); S0.run = r;
    const off = document.createElement('canvas'); off.width = off.height = 64;
    R.withTarget(off.getContext('2d'), () => {
      // 완벽 입력 한 판 (시각은 처음에 정한 값으로만, 반복 수 상한). 콤보 갱신·단계 연출도 같이 그림
      const base = r.songStartV, draw0 = (rr, V) => { S0.run = rr; S0.V = V; rr.update(V); R.play(S0); rr.events.length = 0; };
      for (let V = 0; V < base + Lw.stars[0].t - 30; V += 80) draw0(r, V);
      for (const st of Lw.stars) { const V = base + st.t; draw0(r, V - 20); const t = r.tap(V); comboFx(S0, t.combo, V); if (t.combo) S0.ro = { V, grade: t.kind, name: RO.names[t.kind], pct: accuracyPct(0, Lw.judge, D.bal.accuracy) }; draw0(r, V + 30); draw0(r, V + 200); }
      for (let V = base + Lw.clearTimeMs, n = 0; V < base + Lw.durationMs && n < 40; V += 200, n++) draw0(r, V);
      // 별 3개 친 뒤 무입력 → 실패(콤보 끊김 연출) → 재시작 장면
      const r2 = new Run(Lw, D.bal, { startV: 0 });
      for (const st of Lw.stars.slice(0, 3)) { const V = r2.songStartV + st.t; draw0(r2, V - 20); r2.tap(V); }
      const v0 = r2.songStartV + Lw.stars[2].t; // 재시작하면 songStartV 가 바뀌므로 끝을 먼저 정함
      for (let V = v0; V < v0 + 9000; V += 60) draw0(r2, V);
    });
    }
  } catch { /* 미리 돌리기 실패는 게임에 영향 없음 */ }
  // 소리 만들기 코드도 렌더하지 않는 OfflineAudioContext 에서 한 번씩 돌려 둠 (소리는 나지 않음)
  try {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return;
    const a = new AudioOut(D.sound, D.music);
    a.ctx = new OAC(1, 4800, 48000); a._graph(); a.levelMusic = D.music.levels[D.levels[0].id];
    const names = Object.keys(D.sound.sounds).filter((k) => typeof D.sound.sounds[k] === 'object' && !D.sound.sounds[k].delayMs && !D.sound.sounds[k].arpeggio);
    for (let k = 0; k < 3; k++) for (const n of names) a.play(n, 0, { f: 440, dur: 0.1 }); // 시각 0 (렌더 안 함)
  } catch { /* 없음 */ }
}
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
function showTitle() { pendingBegin = false; setTheme(themeOf(0)); setState('title'); show('sTitle'); }
function afterTitle() {
  unlockAudio();
  menuSnd();
  if (!store.calibDone) startCalib(true);
  else showLevels();
}

// ---------- 레벨 선택 ----------
function lvSave(i) { return Store.lv(store, D.levels[i].id); }
function cardIdOf(i) { const c = D.levels[i].card; return c && c.id ? c.id : null; }
// 레벨 카드 시작 버튼 영역 (30-art 5-6 round 2): 위 → 아래 "작은 궤도 → 점 → 등급 줄 → 이름", 줄 사이 gap, 겹침 0.
// 높이가 모자라면 ① 궤도를 orbitMin 까지 줄임 → ② 이름 숨김(aria-label 은 유지) → ③ 궤도 숨김
// opts.nameH = 이름 줄 높이(두 줄일 때 card.name.twoH), opts.noName = 이름 숨김(②)
function cardRowsPlan(n, ch, opts = {}) {
  const r = D.art.card.rows, A = ch - D.art.card.practiceBtn - r.reserve, nh = opts.nameH ?? r.name;
  const dots = n > D.art.card.dotsPerRow ? r.dots2 : r.dots1;
  const base = dots + r.gap + r.grade;
  if (!opts.noName && r.orbitMin + r.gap + base + r.gap + nh <= A) return { orbit: Math.min(r.orbit, A - (r.gap + base + r.gap + nh)), name: true, dots };
  if (r.orbitMin + r.gap + base <= A) return { orbit: Math.min(r.orbit, A - (r.gap + base)), name: false, dots };
  return { orbit: 0, name: false, dots };
}
function lockSvg(C, x, y, s) {
  return `<g transform="translate(${x},${y}) scale(${s / 30})"><path d="M 9 13 V 9 A 6 6 0 0 1 21 9 V 13" fill="none" stroke="${C.trackEdge}" stroke-width="3"/><rect x="5" y="12" width="20" height="15" rx="3" fill="${C.trackEdge}"/></g>`;
}
function cardRowsHtml(i, locked, plan, cw) {
  const C = D.palette.common, ca = D.art.card, t = themeOf(i), sv = lvSave(i), n = i + 1;
  const op = locked ? D.palette.alpha.locked_card_trackEdge : 1;
  let h = '';
  // ① 작은 길 조각 (30-art 16-9 5-6 대체: 가로 둥근 막대 + 왼쪽 30 % 세로 선 + 위 공 점, 잠김 = 자물쇠)
  if (plan.orbit > 0) {
    const o = plan.orbit, rp = ca.roadPiece;
    if (locked) h += `<svg class="lr" width="${o}" height="${o}" viewBox="0 0 ${o} ${o}" aria-hidden="true">${lockSvg(C, 0, 0, o)}</svg>`;
    else {
      const w = Math.max(o, Math.min(cw - 4, o * rp.wMul)), bh = o * rp.barH, sw = rp.stroke, by = o - bh - sw / 2, jx = w * rp.judgeAt, br = o * rp.ballR;
      h += `<svg class="lr" width="${w}" height="${o}" viewBox="0 0 ${w} ${o}" aria-hidden="true">` +
        `<rect x="${sw / 2}" y="${by}" width="${w - sw}" height="${bh}" rx="${bh / 2}" fill="${t.track1}" stroke="${C.trackEdge}" stroke-width="${sw}"/>` +
        `<line x1="${jx}" y1="${by - 1}" x2="${jx}" y2="${by + bh + 1}" stroke="${C.hud}" stroke-width="${rp.lineW}"/>` +
        `<circle cx="${jx}" cy="${by - 2 - br}" r="${br}" fill="${C.ball}" stroke="${C.outline}" stroke-width="1"/></svg>`;
    }
  }
  // ② 점 = 레벨 번호
  {
    const per = ca.dotsPerRow, cols = Math.min(n, per), w = (cols - 1) * ca.dotStep + 2 * ca.dotR, dh = plan.dots;
    let d = '';
    for (let k = 0; k < n; k++) {
      const row = k < per ? 0 : 1, col = row ? k - per : k, cnt = row ? n - per : cols;
      d += `<circle cx="${w / 2 + (col - (cnt - 1) / 2) * ca.dotStep}" cy="${ca.dotR + row * ca.dotStep}" r="${ca.dotR}" fill="${C.hud}"/>`;
    }
    h += `<svg class="lr" width="${w}" height="${dh}" viewBox="0 0 ${w} ${dh}" opacity="${op}" aria-hidden="true">${d}</svg>`;
  }
  // ③ 등급 줄: 일반 클리어 = 등급 북 3자리 / 그 전 = 최고 진행도 막대 + 공 색 점 (+ 연습 깃발) / 처음 = 빈 줄
  {
    const gh = ca.rows.grade, gw = Math.max(40, cw);
    let g = '';
    if (locked) { if (plan.orbit <= 0) g = lockSvg(C, gw / 2 - gh / 2, 0, gh); }
    else if (sv.grade > 0) {
      for (let k = 0; k < 3; k++) {
        const cx = gw / 2 + (k - 1) * ca.gradeStep, cy = gh / 2, r = ca.gradeR;
        g += k < sv.grade
          ? `<circle cx="${cx}" cy="${cy}" r="${r - 0.8}" fill="${C.hud}" stroke="${C.outline}" stroke-width="1.6"/><circle cx="${cx}" cy="${cy}" r="${r * 0.6}" fill="none" stroke="${C.outline}" stroke-width="1"/>`
          : `<circle cx="${cx}" cy="${cy}" r="${r - 0.7}" fill="none" stroke="${C.trackEdge}" stroke-width="1.4" stroke-dasharray="3 2.4"/>`;
      }
    } else if ((sv.best || 0) > 0 || sv.flag) {
      const p = ca.progress, best = Math.min(1, sv.best || 0), fw = sv.flag ? p.flag + p.flagGap : 0;
      const bw = Math.min(p.w, gw - fw - 2 * p.dotR - 2);
      const fx = gw / 2 - (bw + fw) / 2, bx = fx + fw, by = gh / 2 - p.h / 2;
      if (sv.flag) g += `<g transform="translate(${fx + p.flag / 2},${gh / 2}) scale(${p.flag / 110})" stroke="${C.outline}" stroke-width="6" stroke-linejoin="round"><rect x="-40" y="-50" width="13" height="100" rx="6" fill="${C.trackEdge}"/><polygon points="-27,-50 45,-32 -27,-6" fill="${C.hud}"/></g>`;
      g += `<rect x="${bx}" y="${by}" width="${bw}" height="${p.h}" rx="${p.h / 2}" fill="${t.bg}" stroke="${C.trackEdge}" stroke-opacity="0.5" stroke-width="1"/>`;
      if (best > 0) {
        g += `<rect x="${bx}" y="${by}" width="${Math.max(p.h, bw * best)}" height="${p.h}" rx="${p.h / 2}" fill="${C.hud}"/>`;
        g += `<circle cx="${bx + bw * best}" cy="${gh / 2}" r="${p.dotR}" fill="${C.ball}" stroke="${C.outline}" stroke-width="${p.dotOutline}"/>`;
      }
    }
    h += `<svg class="lr" width="${gw}" height="${gh}" viewBox="0 0 ${gw} ${gh}" aria-hidden="true">${g}</svg>`;
  }
  // ④ 이름 (보조 글, 버튼 aria-label 에 이미 있음)
  if (plan.name) h += `<span class="lname" aria-hidden="true">${T[D.levels[i].name_key]}</span>`;
  return h;
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
    play.addEventListener('click', () => { if (locked) { play.classList.remove('shake'); void play.offsetWidth; play.classList.add('shake'); return; } menuSnd(); startLevel(i, false); });
    card.appendChild(play);
    const row = document.createElement('div'); row.className = 'lrow';
    const cid = cardIdOf(i);
    if (cid && !locked) {
      const rb = document.createElement('button'); rb.type = 'button'; rb.className = 'ibtn sm'; rb.setAttribute('aria-label', T.btn_card_replay);
      rb.innerHTML = '<img src="data/svg/icon-card.svg" alt="">';
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
  const grid = $('grid'); if (!grid || !grid.children.length) return;
  const W = innerWidth, H = innerHeight, c = D.art.card, top = 72;
  const availW = W - 32, availH = H - top - 12;
  let best = null;
  for (let cols = 1; cols <= 10; cols++) {
    const rows = Math.ceil(10 / cols);
    const w = Math.min(c.w, (availW - (cols - 1) * c.gap) / cols);
    const h = Math.min(c.h, (availH - (rows - 1) * c.gap) / rows);
    const k = Math.min(w / c.w, h / c.h);
    const fits = w >= c.minW && h >= c.minH;
    const score = (fits ? 10 : 0) + k;
    if (!best || score > best.score) best = { cols, w, h, score, fits };
  }
  if (!best.fits) { const cols = Math.max(1, Math.floor((availW + c.gap) / (c.minW + c.gap))); best = { cols, w: Math.min(c.w, (availW - (cols - 1) * c.gap) / cols), h: c.h }; }
  const cw = Math.floor(best.w), ch = Math.floor(best.h);
  grid.style.gridTemplateColumns = `repeat(${best.cols}, ${cw}px)`;
  grid.style.setProperty('--cw', cw + 'px'); grid.style.setProperty('--ch', ch + 'px');
  // 카드 크기가 정해진 뒤 줄 흐름을 그림 (안쪽 폭 = 카드 − 테두리 − 여백 8)
  [...grid.children].forEach((card, i) => fitCardRows(card.querySelector('.lplay'), i, ch, cw - 2 * c.border - 8));
  grid.classList.toggle('scrolls', grid.scrollHeight > grid.clientHeight + 1);
}
// 카드 줄 흐름 + 긴 이름 처리 순서 (30-art 5-6 R16): 12 → 11 → 10 px 한 줄 → 10 px 두 줄(궤도를 줄여 높이 마련) → 숨김.
// 판단은 실제 글자 폭(scrollWidth)으로, 잘린 글 0
function fitCardRows(play, i, ch, iw) {
  const locked = i + 1 > store.unlocked, nr = D.art.card.name;
  const plan = cardRowsPlan(i + 1, ch);
  play.innerHTML = cardRowsHtml(i, locked, plan, iw);
  let nm = play.querySelector('.lname');
  if (!nm) return;
  const fitsW = () => nm.scrollWidth <= nm.clientWidth + 0.5;
  for (const fs of nr.sizes) { nm.style.fontSize = fs + 'px'; if (fitsW()) return; }
  // 두 줄: 이름 줄 높이 twoH, 늘어난 높이는 작은 궤도 줄이기(최소 orbitMin)로 마련
  const hide = () => { play.innerHTML = cardRowsHtml(i, locked, cardRowsPlan(i + 1, ch, { noName: true }), iw); };
  const p2 = cardRowsPlan(i + 1, ch, { nameH: nr.twoH });
  if (!p2.name) return hide(); // 궤도를 orbitMin 까지 줄여도 높이 부족
  play.innerHTML = cardRowsHtml(i, locked, p2, iw);
  nm = play.querySelector('.lname');
  nm.classList.add('two');
  Object.assign(nm.style, { fontSize: nr.twoSize + 'px', lineHeight: nr.twoLineH + 'px', height: nr.twoH + 'px' });
  if (!fitsW() || nm.scrollHeight > nr.twoH + 0.5) hide();
}
function showLevels() {
  pendingBegin = false;
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
function showSettings() { pendingBegin = false; setState('settings'); show('sSettings'); applySound(); refreshLate(); }

// 기록 지우기 확인 창: 첫 초점 = 취소 (10-1, 10-lore 7-10 R8-7)
function showConfirm() { setState('confirm'); show('sConfirm'); $('cfNo').focus({ preventScroll: true }); }

// ---------- 보정 ----------
let cal = null;
function startCalib(first) {
  const gc = D.bal.audio_latency.guardian_calibration;
  if (first) setTheme(themeOf(0));
  updateComp();
  setState('calib'); show('sCalib');
  $('together').classList.toggle('hidden', !(first && gc.first_run_picture_only_on_first_run));
  $('bRedo').classList.add('hidden');
  const beatMs = 60000 / gc.bpm;
  pendingBegin = false;
  cal = { first, gc, beatMs, taps: [], rounds: [], retries: 0, filled: 0, phase: 'wait', endV: 0, emptyV: -1, hand: true, autoNows: [] };
  // R11 ③: 잠금 해제 뒤 자동 지연이 안정될 때까지 똑딱을 늦춤 (화면은 보정 화면 그대로, 탭은 세지 않음)
  if (latSettled()) calibTicks();
  setCalibAria();
}
function calibTicks() {
  const beatMs = cal.beatMs;
  cal.phase = 'tap';
  if (TEST) cal.base = clock.V() + beatMs;
  else if (!audio.ok) cal.base = clock.ctOf(performance.now()) * 1000 + beatMs;
  else {
    cal.base = A.now() * 1000 + beatMs;
    A.setSong(cal.base, Array.from({ length: 240 }, (_, k) => ({ x: k * beatMs, name: 'tick' })));
  }
}
function setCalibAria() { const p = $('calibProg'); p.setAttribute('aria-valuenow', String(cal.filled)); p.setAttribute('aria-valuemax', String(cal.gc.taps_per_round)); }
function calibTap(ts) {
  if (!cal || cal.phase !== 'tap') return;
  // R11 ①: 들리는 박 = 예약 시각 + 그 탭 순간 autoNow → 차이는 자동 지연을 뺀 남는 차이 (calib.js calibTapDiffR11)
  const an = TEST || !audio.ok ? 0 : autoLat();
  const diff = calibTapDiffR11(TEST ? clock.vt : clock.ctOf(ts) * 1000, an, cal.base, cal.beatMs);
  if (diff === null) return; // 첫 박 전
  cal.autoNows.push(an);
  calibDiff(diff);
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
  if (cal.phase === 'wait') { if (latSettled()) calibTicks(); return; }
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
  cardShown = cid;
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
// 플레이 화면 그리기 상태 (render.play 가 읽음)
function sceneOf(Lv, t, best) {
  return {
    th: t, L: Lv, art: D.art, bal: D.bal, best, slideFrom: null,
    gradeStartX: slotTimeMs(Lv, Lv.outroBar + 1, 0), // 등급 북: outro 둘째 마디 (16-6)
    ballStopX: Math.ceil(Lv.clearTimeMs / Lv.barMs) * Lv.barMs, // 클리어 뒤 공은 그 마디 끝까지 착지
    comboOn: COMBO, cs: { popV: null, popN: 0, popBig: false, stepV: null, stepN: 0, breakK: null },
  };
}
// 콤보 갱신 연출 상태 (판정 프레임). 단계 = balance combo.steps (5 = 큰 튐, 10·20·30 = 표지)
function comboFx(S0, c, V) {
  if (!c || !S0.comboOn) return;
  const st = D.bal.combo.steps.find((s) => s.at === c), cs = S0.cs;
  cs.popV = V; cs.popN = c; cs.popBig = !!(st && st.at < D.art.road.combo.cells);
  if (st && st.at >= D.art.road.combo.cells) { cs.stepV = V; cs.stepN = c; }
}
// 콤보 단계 화음 예약 (sound.json music.combo_r3): 판정 별 + 0.5박 뒤 첫 빈 정박, 실패·멈춤이면 stopSong 이 예약 소리를 멈춤
const comboLog = [];
function comboChord(e) {
  const C = D.music.combo_r3, name = C.steps[String(e.combo)];
  if (!name || !COMBO) return;
  const t = comboChordTime(L, e.i, C);
  const rec = { attempt: run.attempts, combo: e.combo, star: e.i, sound: name, at: t, cancelled: false };
  comboLog.push(rec); if (comboLog.length > 64) comboLog.shift();
  if (t == null) return; // 빈 자리 없음 → 소리 없이 넘김 (그림 연출은 그대로)
  if (A && audio.ok) A.play(name, (run.songStartV + t) / 1000);
}
// R11 ③: 잠금 해제 뒤 첫 시도도 자동 지연 안정 뒤에 시작 (그 사이 지금 화면 그대로, 최대 stable_wait.max_wait_ms)
function beginRun() {
  if (!latSettled()) { pendingBegin = true; run = null; return; }
  // R12: 새 테마의 바탕 층을 한 프레임 먼저 그려 두고 다음 프레임에 시작 (레벨 시작 프레임 비용을 두 프레임에 나눔)
  if (!TEST && R && !R.hasLayer(th)) { R.staticLayer(th); pendingBegin = true; run = null; return; }
  pendingBegin = false;
  if (A) A.stopSong(0.02);
  updateComp();
  R.prewarm();
  run = new Run(L, D.bal, { practice, startV: clock.V(), leadMs: START_LEAD_MS });
  const sv = lvSave(levelIndex);
  S = sceneOf(L, th, sv.best || 0);
  $('pracTag').classList.toggle('hidden', !practice);
  const ca = $('comboAria');
  ca.classList.toggle('hidden', !COMBO);
  ca.setAttribute('aria-valuemax', String(L.stars.length));
  ariaCache.combo = -1;
  $('sPlay').setAttribute('aria-label', T.aria_play_area);
  setState('play'); show('sPlay');
  placeUi();
  handleEvents();
}
// 곡 이벤트는 (레벨, 시작점 t0)마다 한 번만 만듦 (재시작·레벨 시작 프레임 비용 줄임, round-2 성능)
function songOf(Lv, t0) {
  const m = Lv._songs || (Lv._songs = new Map());
  let ev = m.get(t0);
  if (!ev) {
    const modeOf = (x) => Run.prototype.barMode.call({ t0, L: Lv }, x);
    const stageOf = (b) => { let st = 1; for (const s of Lv.level.sections) if (s.start_bar <= b && s.stage) st = s.stage; return st; };
    ev = buildSong(Lv, t0, D.music, D.sound, modeOf, stageOf);
    m.set(t0, ev);
  }
  return ev;
}
function songFor(e) { return songOf(L, e.t0); }
// 플레이 중 저장은 판정 프레임 밖에서 (localStorage 쓰기를 실패·클리어 프레임에서 빼냄). 페이지를 떠날 때 바로 씀
let saveTimer = 0;
function saveSoon() { if (!saveTimer) saveTimer = setTimeout(saveNow, 250); }
function saveNow() { clearTimeout(saveTimer); saveTimer = 0; Store.save(store); }
function handleEvents() {
  if (!run) return;
  if (run.events.length) for (const e of run.events.splice(0)) {
    if (e.type === 'attempt') { if (A && audio.ok) A.setSong(e.songStartV, songFor(e)); }
    else if (e.type === 'abort') { if (A) A.stopSong(0.02); cancelChords(e.V); }
    else if (e.type === 'judge') { comboFx(S, e.combo, e.V); comboChord(e); S.ro = { V: e.V, grade: e.grade, name: RO.names[e.grade], pct: accuracyPct(e.e, L.judge, D.bal.accuracy) }; }
    else if (e.type === 'fail') {
      // 콤보 끊김 = 실패 연출 안 0.3 s 무음 사라짐(그림만). 아직 울리지 않은 단계 화음은 stopSong 이 멈춤(취소)
      cancelChords(e.V);
      if (A) { A.stopSong(D.bal.restart.music_fade_out_s); A.play('fail'); if (e.newBest) A.play('best'); }
      if (!run.practice) {
        const sv = lvSave(levelIndex);
        S.slideFrom = S.best;
        if (e.progress > (sv.best || 0)) { sv.best = e.progress; S.best = e.progress; setTimeout(() => { $('live').textContent = T.aria_new_best; }, 300); } else S.slideFrom = null;
      }
      lvSave(levelIndex).attempts++;
      saveSoon();
    } else if (e.type === 'clear') {
      const sv = lvSave(levelIndex);
      if (A) {
        A.play('clear');
        const n = run.practice ? 1 : run.grade;
        for (let k = 0; k < n; k++) A.play('bell_high', (run.songStartV + S.gradeStartX + k * L.beatMs) / 1000);
      }
      if (run.practice) sv.flag = true; else { sv.grade = Math.max(sv.grade || 0, run.grade); sv.best = 1; S.best = 1; }
      store.unlocked = Math.max(store.unlocked, Math.min(D.levels.length, levelIndex + 2));
      saveSoon();
    } else if (e.type === 'end') showResult();
    else if (e.type === 'drift') { store.late.drift = true; saveSoon(); }
  }
  // 값은 aria-valuenow 로만 (10-lore 7-10 R8-1), 바뀔 때만 DOM 을 건드림
  const pv = Math.round(run.progress * 100);
  if (pv !== ariaCache.prog) { ariaCache.prog = pv; $('progAria').setAttribute('aria-valuenow', String(pv)); }
  if (run.attempts !== ariaCache.att) {
    ariaCache.att = run.attempts;
    const a = $('attAria');
    a.setAttribute('aria-valuemax', String(Math.max(1, run.attempts)));
    a.setAttribute('aria-valuenow', String(run.attempts));
  }
  // 콤보 대체 글 (10-lore R3-a): role=meter, 값은 aria-valuenow, aria-valuetext 는 숫자만(퍼센트로 읽히지 않게, insights), 알림 없음
  if (COMBO && run.combo !== ariaCache.combo) {
    ariaCache.combo = run.combo;
    const c = $('comboAria'), v = String(run.combo);
    c.setAttribute('aria-valuenow', v); c.setAttribute('aria-valuetext', v);
  }
}
function cancelChords(V) {
  if (!run) return;
  const x = V - run.songStartV;
  for (const c of comboLog) if (c.attempt === run.attempts && c.at != null && c.at > x && !c.cancelled) c.cancelled = true;
}
const ariaCache = { prog: -1, att: -1, combo: -1 };
let tutOn = false; // 튜토리얼 글: display 대신 visibility 로 숨겨 첫 표시 때 글자 배치 비용이 안 생기게
function gameTap(ts) {
  if (!run) return;
  const V = rereadAtRestart(clock.tapV(ts));
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
  // 다음 레벨이 없으면 버튼 2개(다시 / 레벨 고르기), → 그림을 다른 동작에 쓰지 않음 (30-art 8-2, 10-lore R8-6)
  $('bNext').classList.toggle('hidden', !hasNext());
  // 등급 줄 전체를 그림 하나로 (R8-2)
  $('gradeAria').setAttribute('aria-label', run.practice ? T.practice_clear : T['grade_' + (run.grade || 1)]);
  // 결과 정확도 %·최고 콤보·신기록 표지 (10-lore R3-12-3·R3-12-4, 30-art 16-13-4, balance accuracy.record): 일반 모드 클리어만.
  // 화면 글 = 숫자만("87%", "23"), 이름은 meter 대체 글(result_accuracy·aria_streak_best, valuetext 숫자만), 신기록 = role img(result_new_best)
  const last = run.log[run.log.length - 1];
  const acc = !run.practice && last && last.clear ? levelAccuracy(L, last, D.bal.accuracy) : null;
  $('resultInfo').classList.toggle('hidden', acc == null);
  if (acc != null) {
    const sv = lvSave(levelIndex), prev = sv.bestAcc, best = last.combo;
    const ra = $('resAcc'), rc = $('resCombo');
    ra.querySelector('.resNum').textContent = acc + '%'; ra.setAttribute('aria-valuenow', String(acc)); ra.setAttribute('aria-valuetext', acc + '%');
    rc.querySelector('.resNum').textContent = String(best); rc.setAttribute('aria-valuenow', String(best)); rc.setAttribute('aria-valuemax', String(L.stars.length)); rc.setAttribute('aria-valuetext', String(best));
    // 신기록 표지: 이전 최고 정확도가 있고 이번이 더 클 때만 (accuracy.record.new_record_mark: 첫 클리어·같음·연습 아님)
    $('resNew').classList.toggle('hidden', !(prev != null && acc > prev));
    if (prev == null || acc > prev) sv.bestAcc = acc;
    sv.bestCombo = Math.max(sv.bestCombo || 0, run.bestCombo);
    saveSoon();
  }
  placeUi();
}
function hasNext() { return levelIndex + 1 < D.levels.length; }
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
  updateComp(); // 새 시도 시작 (R11)
  run.restartNow(clock.V(), START_LEAD_MS, run.phase === 'fail');
  handleEvents();
}

// ---------- 배치 ----------
function placeUi() {
  if (!R) return;
  const lay = R.lay, H = lay.hud, px = (v) => v + 'px';
  const box = (el, x, y, w, h) => Object.assign(el.style, { left: px(x), top: px(y), width: px(w), height: px(h) });
  const sP = $('bPause'); sP.style.left = px(H.pause.x0); sP.style.top = px(H.pause.y0);
  box($('progAria'), H.bar.x0, H.bar.y0, H.bar.x1 - H.bar.x0, H.bar.h);
  const ar = D.art.road.hud.attempt_r;
  box($('attAria'), H.bar.x0, H.attempt_y - ar - 2, D.art.hud.dotsMax * D.art.hud.dotStep, 2 * ar + 4);
  // 콤보 줄 대체 글 자리 = layout hud.combo (점 하나·표지 하나마다 이름을 붙이지 않음)
  box($('comboAria'), H.combo.x0, H.combo.y0, H.combo.x1 - H.combo.x0, H.combo.y1 - H.combo.y0);
  // 연습 표지: 시도 점 줄 오른쪽 끝(콤보 줄·일시정지와 겹치지 않음)
  const pt = $('pracTag'); Object.assign(pt.style, { left: px(H.bar.x1 - 24), top: px(H.attempt_y - 12) });
  // 연습 체크포인트 깃발 표시 (R8-4, 그림은 캔버스, 여기는 대체 글 자리)
  const cf = $('cpFlags'), bw = H.bar.x1 - H.bar.x0;
  const want = state === 'play' || state === 'pause' || state === 'result' ? (run && run.practice ? L.checkpoints.map((c) => c.firstStar / L.stars.length) : []) : [];
  if (cf.dataset.k !== want.join() + '|' + bw) {
    cf.dataset.k = want.join() + '|' + bw;
    cf.innerHTML = '';
    const fs = D.art.hud.flag;
    for (const f of want) {
      const e = document.createElement('span');
      e.setAttribute('role', 'img'); e.setAttribute('aria-label', T.aria_checkpoint);
      Object.assign(e.style, { left: px(H.bar.x0 + bw * f - fs / 2), top: px(H.bar.y0 - fs - 1), width: px(fs), height: px(fs) });
      cf.appendChild(e);
    }
  }
  // 결과 버튼 (다음 레벨이 없으면 2개): 세로 = 엄지 받침 가운데, 가로 = 길 아래(등급 북 아래) 가운데, 모자라면 오른쪽 세로 줄 (8-2·16-6)
  const c = D.art.clear, nb = run && !hasNext() ? 2 : 3, btnW = nb * c.btn + (nb - 1) * c.btnGap, rb = $('resultBtns');
  let x, y, col = false;
  if (lay.thumb) { x = lay.W / 2 - btnW / 2; y = (lay.thumb.y0 + lay.thumb.y1) / 2 - c.btn / 2; }
  else {
    const below = lay.drum.y + lay.drum.r + 12;
    if (lay.H - below >= c.btn + 12) { x = lay.W / 2 - btnW / 2; y = below; }
    else { col = true; x = lay.W - c.btn - 24; y = lay.H / 2 - btnW / 2; }
  }
  rb.classList.toggle('col', col);
  Object.assign(rb.style, { left: px(x), top: px(y) });
  // 클리어 글: 공이 뛰는 자리 위, HUD 띠 아래 (가운데)
  const ct = $('clearTitle');
  Object.assign(ct.style, { left: '16px', right: '16px', width: 'auto', textAlign: 'center', top: px(Math.max(H.band_bottom + 8, lay.ball.top - 6 - 30)) });
  // 결과 정확도·최고 콤보 (30-art 16-13-4, layout result): 세로 = 등급 북 아래 한 줄, 가로 = 등급 북 줄 양옆
  {
    const RS = lay.result, ol = R.lay.judge_label.outline_px;
    for (const [id, q, iconW] of [['resAcc', RS.accuracy, D.art.road.result.icon_mul], ['resCombo', RS.best_combo, D.art.road.result.combo_icon_mul]]) {
      const el = $(id), F = q.font_px, ic = el.querySelector('.resIcon');
      Object.assign(el.style, { left: px(q.x0), top: px(q.y0), width: px(q.x1 - q.x0), height: px(q.y1 - q.y0), fontSize: px(F), gap: px(F * D.art.road.result.icon_gap_mul) });
      el.style.setProperty('--ol', 2 * ol + 'px');
      Object.assign(ic.style, { width: px(F * iconW), height: px(id === 'resAcc' ? F * iconW : F * iconW * 8 / 22) });
    }
    const nm = $('resNew'), F = RS.accuracy.font_px, d = F * D.art.road.result.new_mark_mul;
    const num = $('resAcc').querySelector('.resNum').getBoundingClientRect();
    const nx = num.width ? num.right + 2 : RS.accuracy.x1 - d;
    Object.assign(nm.style, { left: px(Math.min(nx, RS.accuracy.x1 + d)), top: px(RS.accuracy.y0 - d * 0.25), width: px(d), height: px(d) });
  }
  // 등급 줄 대체 글 자리 (R8-2): 판정 북 높이, 화면 가운데 등급 북 3자리
  {
    const r = c.gradeR * lay.drum.r, w = 2 * c.gradeGap * lay.drum.r + 2 * r;
    box($('gradeAria'), lay.W / 2 - w / 2, lay.drum.y - r, w, 2 * r);
  }
  // 튜토리얼 글: layout text_slot (세로 = 손가락 칸 아래, 가로 = 손가락 칸 오른쪽), 14 px 굵게 2줄 자리
  const ts = lay.text_slot, tu = $('tut');
  box(tu, ts.x0, ts.y0, ts.x1 - ts.x0, ts.y1 - ts.y0);
  tu.classList.toggle('side', ts.side === 'right_of_finger');
  // 타이틀 시작 힌트 (16-9 4-6 대체): 손가락 = 판정 북 아래 손가락 칸, 글 = 글 자리
  {
    const f = lay.finger, st = $('tapStart'), hand = st.querySelector('img'), tx = st.querySelector('span');
    box(hand, f.x0, f.y0, f.s, f.s);
    box(tx, ts.x0, ts.y0, ts.x1 - ts.x0, ts.y1 - ts.y0);
    tx.classList.toggle('side', ts.side === 'right_of_finger');
  }
  placeCard();
}
// 그림 카드: 세로 화면 = 세로판(9-1 배율), 가로 화면 = 가로판(폭 80 % 이하)
// warmId = 미리 그리기용(타이틀 뒤에서 첫 카드 그림을 같은 크기로 한 번 래스터화, round-3 R12)
function placeCard(warmId = null) {
  const id = warmId ?? cardShown;
  if (!R || (!warmId && state !== 'card') || id == null) return;
  const lay = R.lay, ca = D.art.card, ci = $('cardImg');
  const st = safeIns.t, sb = safeIns.b; // resize 때 읽은 안전 영역 (getComputedStyle 강제 스타일 계산 피함, R12)
  let w, src;
  if (lay.portrait) {
    const p = ca.portrait, s = Math.min((lay.W - p.margin) / p.w, (lay.H - p.margin - st - sb) / p.h, p.maxScale);
    w = p.w * s; src = `data/svg/cards/${id}_portrait.svg`;
  } else {
    w = Math.min(lay.W * ca.landscapeMaxW, (lay.H - 40) * (ca.img.w / ca.img.h));
    src = `data/svg/cards/${id}.svg`;
  }
  if (!ci.src.endsWith(src)) ci.src = src;
  ci.style.width = w + 'px'; ci.style.maxHeight = 'none';
}

// ---------- 루프 ----------
let lastPerf = performance.now();
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  lastPerf = now;
  clock.sample();
  if (!D) return;
  if (A) A.pollStable(D.bal.audio_latency.auto_latency_read.stable_wait);
  if (pendingBegin && latSettled()) beginRun();
  let V = clock.V();
  if (!TEST && state === 'play' && run) { V = rereadAtRestart(V); run.update(V, REALTIME_GRACE_MS); handleEvents(); }
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
    if (tutOn !== !!S.handOn) { tutOn = !!S.handOn; $('tut').classList.toggle('hidden', !tutOn); }
  } else if (state === 'calib' && cal) {
    const ek = cal.emptyV >= 0 ? Math.min(1, (V - cal.emptyV) / 200) : null;
    R.calib(th, V, { filled: cal.filled, emptyK: ek, checkK: cal.phase === 'done' ? (V - cal.endV) / (D.art.calib.checkGrowS * 1000) : 0, hand: cal.hand });
  } else if (state === 'title' || state === 'card') R.title(th, V);
  else R.menuBg(th);
}

function resize() {
  const W = innerWidth, H = innerHeight, dpr = Math.min(3, devicePixelRatio || 1);
  const cs = getComputedStyle(document.documentElement);
  const num = (k) => parseFloat(cs.getPropertyValue(k)) || 0;
  const safe = safeIns = { t: num('--sat'), b: num('--sab'), l: num('--sal'), r: num('--sar') };
  R.resize(W, H, dpr, safe);
  R.prewarm(); // 손가락·깃발 스프라이트를 지금 크기로 미리 래스터화 (레벨 시작 프레임에서 빼냄, R12)
  R.prewarmLabels(RO && RO.names); // 판정 글 스프라이트 10장 (등급 × %)
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
    if (document.hidden) { saveNow(); if (state === 'play') pauseGame(true); if (A) A.suspend(); }
    else if (A && state !== 'pause') A.resume();
  });
  addEventListener('resize', resize);
  addEventListener('pagehide', saveNow);
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
  click('bReset', () => { menuSnd(); showConfirm(); });
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
    if (state === 'play' && run) { run.update(rereadAtRestart(clock.vt)); handleEvents(); }
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
    // R11 안정 대기로 시도 시작이 미뤄진 동안 부르면, 시작된 뒤 실시간 재생 (일반 모드만)
    if (!run && pendingBegin && !TEST) return new Promise((res) => { const f = () => { if (run) res(startAutoRealtime(offsetMs, sigma, seed)); else if (!pendingBegin) res(null); else requestAnimationFrame(f); }; f(); });
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
  latency() { return { auto: clock.auto, manual: store.offsetMs, comp: clock.comp, autoNow: autoLat(), settled: latSettled(), stable: A && A.lat ? A.lat.result : null, pendingBegin, calibAutoNows: cal ? cal.autoNows.slice() : null }; },
  show(name) {
    const m = { title: showTitle, levels: showLevels, settings: showSettings, calib: () => startCalib(true), calibRedo: () => startCalib(false), pause: () => pauseGame(false), confirm: showConfirm };
    m[name]?.(); return state;
  },
  calibTap(diffMs) { if (cal && cal.phase === 'tap') calibDiff(diffMs); return cal ? { phase: cal.phase, filled: cal.filled, rounds: cal.rounds.length, retries: cal.retries } : { state, offset: store.offsetMs }; },
  calibInfo() { return cal ? { phase: cal.phase, base: cal.base ?? null, beatMs: cal.beatMs, filled: cal.filled, rounds: cal.rounds.length, retries: cal.retries, autoNows: cal.autoNows.slice() } : null; },
  calibSimulate(rounds) { return simulate(rounds, D.bal.audio_latency.guardian_calibration); },
  skipCalibration() { store.calibDone = true; Store.save(store); if (state === 'calib') finishCalib(true); return state; },
  lateHint() { return { visible: lateVisible, ...lateConds(), sessions: store.late.sessions, drift: run ? run.drift : null }; },
  save() { return JSON.parse(JSON.stringify(store)); },
  layout() { return R ? R.lay : null; },
  // 마지막으로 그린 프레임의 신호 상태 (R1 검사용) / 지금 시각으로 바로 그리기
  // 마지막으로 그린 프레임 상태. malletOn·dashK 는 북채가 없어져 늘 false·0 (round-3, 옛 QA 검사 호환)
  frameInfo() { return { handOn: !!S.handOn, malletOn: false, dashK: 0, levelTime: run ? run.lt(clock.V()) : null, combo: run ? run.combo : 0, comboShown: !!(COMBO && run && run.combo >= D.bal.combo.show_from), label: S.labelOn ? { grade: S.ro.grade, name: S.ro.name, pct: S.ro.pct } : null }; },
  drawNow() { draw(clock.V()); return this.frameInfo(); },
  layoutFor(W, H, safe) { return layout(W, H, D.art, R.lead, safe); },
  // round-3 북길: 지금 레벨의 흐름 값 (QA 화면 검사용). speedPxS = 미리 보기 거리 ÷ (lead 박 × 1박 s), starX(i) = 지금 그 별의 x(같은 보정 시계)
  road() { if (!R || !L) return null; const lay = R.lay, v = speedOf(L, lay); return { judgeX: lay.judge_x, previewPx: lay.preview_px, starD: lay.star_d, lineW: lay.line.w, leadBeats: leadOf(L, lay), beatMs: L.beatMs, speedPxS: v * 1000, beatPx: v * L.beatMs, previewS: leadOf(L, lay) * L.beatMs / 1000, judgeS: (leadOf(L, lay) * L.beatMs - L.judge.pass_early_ms) / 1000, overlapMs: (lay.star_d + lay.line.w) / v }; },
  starX(i) { if (!R || !L || !run || !L.stars[i]) return null; const x = run.phase === 'fail' ? run.fail.x : run.lt(clock.V()); return R.lay.judge_x + speedOf(L, R.lay) * (L.stars[i].t - x); },
  // 콤보: value = 이번 시도 성공 판정 수(grades.length, 실패 중 0), chords = 단계 화음 예약 기록(at = 레벨 시간 ms, null = 빈 자리 없어 넘김, cancelled = 실패·멈춤으로 취소)
  combo() { return { on: COMBO, value: run ? run.combo : 0, shown: !!(COMBO && run && run.combo >= D.bal.combo.show_from), best: run ? run.bestCombo : 0, chords: comboLog.map((c) => ({ ...c })), aria: (() => { const e = $('comboAria'); return { role: e.getAttribute('role'), label: e.getAttribute('aria-label'), now: e.getAttribute('aria-valuenow'), text: e.getAttribute('aria-valuetext'), max: e.getAttribute('aria-valuemax'), live: e.getAttribute('aria-live') }; })() }; },
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
    $('loadErr').classList.remove('hidden'); $('bReload').classList.remove('hidden'); $('loadTxt').classList.add('hidden'); $('loadPic').classList.add('stop');
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
  const warmed = warmScreens();
  // 레벨 처음부터의 곡 이벤트를 미리 만들어 두고, 플레이 코드(판정·그리기)를 화면 밖에서 한 번 돌려 둠 (첫 플레이 프레임 비용 줄임)
  // 로딩 화면 동안(준비 전) 한 번에 함: 플레이 중에 끼어들지 않게
  D.L.forEach((Lv) => songOf(Lv, 0));
  warmCode();
  // 그림 카드 미리 그리기가 끝날 때까지(최대 1.5 s) 기다린 뒤 준비 완료 (R12)
  await Promise.race([warmed, new Promise((r) => setTimeout(r, 1500))]);
  api.ready = true;
}
boot();
