// flow-01 Pairpaint / 짝꿍색칠 — 웹 빌드 본체
// 판정: js/board.js(= projects/flow-01/tools/core/board.mjs 그대로 복사). 수치·레벨·문구·색·배치·소리는 data/*.json.
// 모든 연출·UI 타이머는 게임 시계(clock, ms) 기준. ?test=1 이면 시계는 __game.step(dt)로만 가고 오디오는 켜지 않음.
import * as B from './board.js';
import { makeRng, mixSeed } from './rng.js';
import * as LY from './layout.js';
import { Audio } from './audio.js';
import { Haptics } from './haptics.js';
import * as ST from './store.js';
import { buildBoardCache, drawMark, subPolyline, strokePoly, miniBoardSVG, mix, ease, clamp01, rrect } from './render.js';

const Q = new URLSearchParams(location.search);
const TEST = Q.get('test') === '1';
const NOTEXT = Q.get('notext') === '1';
const $ = (id) => document.getElementById(id);
const FONT = getComputedStyle(document.body).fontFamily;
let clock = 0;
const D = {};
let S = ST.load();
let lang = 'ko';
let state = 'boot';
let A = null, H = null;
let dpr = 1, VW = 0, VH = 0;
const cv = $('cv'), ctx = cv.getContext('2d');
const mqlRM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const RM = () => !!(S.motion || mqlRM.matches);
const T = (k) => (D.str[k] ? D.str[k][lang] ?? D.str[k].en : k);
const icon = (n) => D.icon[`icon-${n}`] || D.icon[n] || '';

// ---------------------------------------------------------------- DOM 도우미 (값이 바뀔 때만 씀)
const cache = new WeakMap();
function setStyle(el, k, v) { let c = cache.get(el); if (!c) cache.set(el, (c = {})); if (c[k] !== v) { c[k] = v; el.style[k] = v; } }
function setText(el, v) { let c = cache.get(el); if (!c) cache.set(el, (c = {})); if (c._t !== v) { c._t = v; el.textContent = v; } }
function setAttr(el, k, v) { let c = cache.get(el); if (!c) cache.set(el, (c = {})); if (c['@' + k] !== v) { c['@' + k] = v; if (v == null) el.removeAttribute(k); else el.setAttribute(k, v); } }
function place(el, r) { setStyle(el, 'left', r.x + 'px'); setStyle(el, 'top', r.y + 'px'); setStyle(el, 'width', r.w + 'px'); setStyle(el, 'height', r.h + 'px'); }
function slot(el, r, extra = {}) {
  place(el, r); setStyle(el, 'fontSize', r.font_px + 'px');
  if (r.align === 'left') { setStyle(el, 'justifyContent', 'flex-start'); setStyle(el, 'textAlign', 'left'); }
  else if (r.align === 'right') { setStyle(el, 'justifyContent', 'flex-end'); setStyle(el, 'textAlign', 'right'); }
  if (r.weight) setStyle(el, 'fontWeight', String(r.weight));
  if (r.color) setStyle(el, 'color', D.pal.common[r.color]);
  if (extra.maxLines) setStyle(el, 'maxHeight', r.h + 'px');
}

// ---------------------------------------------------------------- 데이터
async function loadData() {
  const get = async (p, kind) => { const r = await fetch('data/' + p, { cache: 'no-cache' }); if (!r.ok) throw new Error(`${p} ${r.status}`); return kind === 'text' ? r.text() : r.json(); };
  D.manifest = await get('manifest.json');
  [D.bal, D.str, D.pal, D.lay, D.snd] = await Promise.all(['balance.json', 'strings.json', 'palette.json', 'layout.json', 'sound.json'].map((p) => get(p)));
  D.levels = (await Promise.all(D.manifest.levels.map((f) => get('levels/' + f)))).sort((a, b) => a.order - b.order);
  D.icon = {};
  await Promise.all(D.manifest.icons.map(async (n) => { D.icon[n] = await get(`icons/${n}.svg`, 'text'); }));
  D.card = {};
  for (const lv of D.levels) for (const c of [lv.fill_card, lv.hole_card]) if (c && c.svg && !D.card[c.svg]) D.card[c.svg] = await get(c.svg, 'text');
  D.logo = await get('logo-mark.svg', 'text');
  D.marks = {}; for (const [k, p] of Object.entries(D.lay.marks.paths)) D.marks[k] = new Path2D(p);
  D.finger = new Path2D(D.lay.finger.path);
  D.imgFilled = await svgImage(D.icon['icon-filled']);
  if (B.CORE_VERSION !== D.bal.core.core_version) console.warn(`board.js ${B.CORE_VERSION} ≠ balance.json core_version ${D.bal.core.core_version}`);
}
function svgImage(txt) {
  return new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt); });
}

// ---------------------------------------------------------------- 화면 전환 (겹쳐 흐려짐 + 6 px 위로, 게임 시계)
const SCREENS = ['title', 'map', 'play', 'result', 'guardian'];
let trans = null;
function show(name) {
  const prev = state;
  state = name;
  for (const s of SCREENS) $(s).classList.toggle('show', s === name);
  $('boot').classList.remove('show');
  cv.style.visibility = name === 'play' || name === 'result' ? 'visible' : 'hidden';
  trans = { el: $(name), t0: clock, ms: D.lay.motion.screen.ms, from: prev };
  if (name === 'map' && mapAnim && mapAnim.t0 == null) mapAnim.t0 = clock;
  if (name === 'result') trans = null; // 결과 카드는 자기 연출(아래에서 올라옴)
  relayout();
  if (A) A.ambient(name === 'map' || name === 'play' || name === 'result');
  applyTrans();
}
function applyTrans() {
  if (!trans) return;
  const u = clamp01((clock - trans.t0) / trans.ms);
  setStyle(trans.el, 'opacity', String(ease.out(u)));
  setStyle(trans.el, 'transform', RM() ? 'none' : `translateY(${(6 * (1 - ease.out(u))).toFixed(2)}px)`);
  if (u >= 1) { setStyle(trans.el, 'opacity', ''); setStyle(trans.el, 'transform', ''); trans = null; }
}

// ---------------------------------------------------------------- 공통 버튼
function iconBtn(el, iconName, key) { el.innerHTML = icon(iconName); if (key) el.setAttribute('aria-label', T(key)); el.dataset.key = key || ''; }
function soundBtns() {
  for (const id of ['tSound', 'mSound']) { const el = $(id); el.innerHTML = icon(S.sound ? 'sound_on' : 'sound_off'); el.setAttribute('aria-label', T('settings_sound')); el.setAttribute('aria-pressed', String(!!S.sound)); }
}
function toggleSound() { S.sound = !S.sound; ST.save(S); if (A) { A.unlock(); A.setEnabled(S.sound); } soundBtns(); if (S.sound) sfx('ui_tap'); }
function sfx(name, opt) { if (A) A.play(name, opt); }

function applyLang() {
  document.documentElement.lang = lang;
  document.title = T('title');
  setText($('tName'), T('title')); setText($('tTag'), T('tagline')); setText($('tTap'), T('tap_to_start'));
  setText($('mTitle'), T('map_screen')); setText($('mHold'), T('guardian_hold')); setText($('mHoldSr'), T('guardian_hold'));
  iconBtn($('mGear'), 'settings', 'btn_settings'); $('mGear').insertAdjacentHTML('afterbegin', '<span class="hold" aria-hidden="true"></span>');
  iconBtn($('pMap'), 'map', 'btn_map'); iconBtn($('pUndo'), 'undo', 'btn_undo'); iconBtn($('pHelp'), 'help', 'btn_help'); iconBtn($('pRestart'), 'restart', 'btn_restart');
  iconBtn($('rMap'), 'map', 'btn_map'); iconBtn($('rNext'), 'next', 'btn_next'); iconBtn($('rAgain'), 'restart', 'btn_again');
  $('pPairs').setAttribute('aria-label', T('aria_pairs'));
  $('mStars').setAttribute('aria-label', T('aria_map_stars'));
  $('cv').setAttribute('aria-label', T('aria_board'));
  soundBtns();
  if (state === 'map') buildMap();
}

// ---------------------------------------------------------------- 레이아웃
function relayout() {
  VW = window.innerWidth; VH = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 3);
  const cw = Math.round(VW * dpr), ch = Math.round(VH * dpr);
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  if (state === 'title') layoutTitle();
  if (state === 'map') buildMap();
  if (state === 'play' || state === 'result') layoutPlay();
  if (state === 'result') layoutResult();
  if (state === 'guardian') buildGuardian();
}
function layoutTitle() {
  const L = LY.titleScreen(VW, VH);
  place($('tSound'), L.buttons.sound);
  place($('tLogo'), L.logo); $('tLogo').innerHTML = D.logo;
  slot($('tName'), L.text_slots.title); slot($('tTag'), L.text_slots.tagline); slot($('tTap'), L.text_slots.tap_to_start);
}

// ---------------------------------------------------------------- 진행 지도
function nodeState(i) {
  const lv = D.levels[i], r = S.levels[lv.id];
  const open = i === 0 || !!(S.levels[D.levels[i - 1].id] || {}).done;
  if (!open) return 'locked';
  if (r && r.done) return r.star ? 'star' : 'done';
  if (r && r.bestFill > 0) return 'partial';
  return 'next';
}
let mapAnim = null; // {i, t0} 방금 끝낸 판 → 다음 노드 열림 연출
function catmull(pts) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    const s = `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
    d += ' ' + s; segs.push(`M${p1[0]} ${p1[1]} ` + s);
  }
  return { d, segs };
}
function nodeSVG(i, st, size) {
  const C = D.pal.common, lv = D.levels[i];
  if (st === 'locked') return D.icon['node-locked'];
  if (st === 'next') return D.icon['node-open'];
  if (st === 'partial') {
    const f = clamp01((S.levels[lv.id].bestFill || 0) / 100), a = f * Math.PI * 2 - 1e-4, r = 33.5;
    const x = 36 + r * Math.sin(a), y = 36 - r * Math.cos(a);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="28" fill="${C.nodeOpen}" stroke="${C.nodeOpenEdge}" stroke-width="4"/><path d="M30 25 L47 36 L30 47 Z" fill="${C.nodeOpenEdge}" stroke="${C.nodeOpenEdge}" stroke-width="4" stroke-linejoin="round"/><path d="M36 2.5 A${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}" fill="none" stroke="${C.pathDone}" stroke-width="5" stroke-linecap="round"/></svg>`;
  }
  // done / star: 정답 미니 그림 + 둘레 띠(그 레벨 바탕 top 색, 결과 화면 이름 띠와 같은 색)
  const k = size / D.lay.param.map_node, band = Math.round(4 * k);
  const th = D.pal.themes[`level${lv.id}`];
  const sol = solutionPaths(lv);
  const mini = miniBoardSVG(lv, sol, size - 2 * band, D.pal, { holeFill: th.top });
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" aria-hidden="true"><rect x="0.75" y="0.75" width="${size - 1.5}" height="${size - 1.5}" rx="${(size * 0.2).toFixed(1)}" fill="${th.top}" stroke="${C.boardEdge}" stroke-width="1.5"/><g transform="translate(${band} ${band})">${mini.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`;
  if (st === 'star') { const sr = size * 0.16; s += `<path d="${D.lay.star_path}" transform="translate(${(size - sr * 0.9).toFixed(1)} ${(sr * 0.9).toFixed(1)}) scale(${sr.toFixed(2)})" fill="${C.star}" stroke="${C.starEdge}" stroke-width="0.12" stroke-linejoin="round"/>`; }
  return s + '</svg>';
}
const solCache = new Map();
function solutionPaths(lv) {
  if (!solCache.has(lv.id)) { const ord = lv.pairs.map((p) => lv.solution.find((s) => s.id === p.id)); solCache.set(lv.id, ord.map((s) => s.path.map(([x, y]) => y * lv.width + x))); }
  return solCache.get(lv.id);
}
let mapL = null;
function buildMap() {
  const L = (mapL = LY.map(VW, VH)), C = D.pal.common;
  place($('mSound'), L.buttons.sound); place($('mGear'), L.buttons.settings);
  slot($('mTitle'), L.title); setStyle($('mTitle'), 'fontWeight', '800');
  slot($('mHold'), L.text_slots.guardian_hold); setStyle($('mHold'), 'fontWeight', '600');
  // 별 10칸 줄(글·숫자 없음)
  const st = L.stars, starN = D.levels.filter((lv) => (S.levels[lv.id] || {}).star).length;
  place($('mStars'), st); setStyle($('mStars'), 'gap', (st.pitch - st.star_px) + 'px');
  $('mStars').innerHTML = D.levels.map((lv) => `<span style="width:${st.star_px}px;height:${st.star_px}px">${icon((S.levels[lv.id] || {}).star ? 'star' : 'star_empty')}</span>`).join('');
  $('mStars').setAttribute('aria-valuemax', String(D.levels.length)); $('mStars').setAttribute('aria-valuenow', String(starN)); $('mStars').setAttribute('aria-valuetext', String(starN));
  // 길
  const { segs } = catmull(L.nodes);
  const sts = D.levels.map((_, i) => nodeState(i));
  let svg = '';
  segs.forEach((d, i) => {
    const done = sts[i] === 'done' || sts[i] === 'star';
    const anim = mapAnim && mapAnim.i === i;
    svg += `<path d="${d}" fill="none" stroke="${C.pathTodo}" stroke-width="${L.path.w}" stroke-linecap="round"/>`;
    if (done) svg += `<path class="pd${anim ? ' anim' : ''}" d="${d}" fill="none" stroke="${C.pathDone}" stroke-width="${L.path.w}" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${anim ? 1 : 0}"/>`;
  });
  $('mPath').setAttribute('viewBox', `0 0 ${VW} ${VH}`); $('mPath').innerHTML = svg;
  // 노드
  const ol = $('mNodes'); ol.innerHTML = '';
  D.levels.forEach((lv, i) => {
    const s = sts[i], [cx, cy] = L.nodes[i], d = L.node_d;
    const li = document.createElement('li');
    li.style.cssText = `left:${cx - d / 2}px;top:${cy - d / 2}px;width:${d}px;height:${d}px`;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'node'; b.dataset.i = i; b.dataset.state = s;
    const stKey = { locked: 'node_locked', next: 'node_next', partial: 'node_partial', done: 'node_done', star: 'node_star' }[s];
    b.setAttribute('aria-label', `${T(lv.name_key)}, ${T(stKey)}`);
    if (s === 'locked') b.setAttribute('aria-disabled', 'true');
    b.innerHTML = nodeSVG(i, s, d);
    li.appendChild(b);
    if (s === 'partial') {
      const pb = document.createElement('span'); pb.className = 'pbar'; pb.setAttribute('role', 'progressbar'); pb.setAttribute('aria-label', T('aria_best_fill'));
      pb.setAttribute('aria-valuemin', '0'); pb.setAttribute('aria-valuemax', '100'); pb.setAttribute('aria-valuenow', String(S.levels[lv.id].bestFill)); li.appendChild(pb);
    }
    ol.appendChild(li);
  });
}
function mapFrame() {
  // 다음 노드 숨 쉼(1.6 s 주기 1.0 ↔ 1.06), 방금 연 길 채움(500 ms) → node_open 소리
  const M = D.lay.motion.map;
  for (const b of $('mNodes').querySelectorAll('.node')) {
    const st = b.dataset.state;
    if ((st === 'next' || st === 'partial') && !RM()) {
      const u = ((clock % M.next_breathe_period_ms) / M.next_breathe_period_ms);
      const s = 1 + (M.next_breathe_scale[1] - 1) * (0.5 - 0.5 * Math.cos(u * 2 * Math.PI));
      setStyle(b, 'transform', `scale(${s.toFixed(3)})`);
    } else setStyle(b, 'transform', '');
  }
  if (mapAnim) {
    const p = $('mPath').querySelector('.pd.anim');
    const u = clamp01((clock - mapAnim.t0 - M.node_morph_ms) / M.path_fill_ms);
    if (p) setAttr(p, 'stroke-dashoffset', RM() ? '0' : (1 - ease.out(u)).toFixed(3));
    if (u >= 1) { if (!mapAnim.sounded) { mapAnim.sounded = true; if (mapAnim.i + 1 < D.levels.length) sfx('node_open'); } mapAnim = null; }
  }
  // 보호자 길게 누르기 진행
  if (gearHold) { const u = clamp01((clock - gearHold) / mapL.buttons.settings.hold_ms); $('mGear').style.setProperty('--p', u.toFixed(3)); if (u >= 1) { gearHold = 0; $('mGear').style.setProperty('--p', '0'); openGuardian(); } }
}
let gearHold = 0;

// ---------------------------------------------------------------- 플레이
let PS = null; // 지금 판 상태
function colorOf(c) { return D.pal.pairs[PS.lv.pairs[c].color_slot]; }
function startLevel(i) {
  const lv = D.levels[i];
  const pz = B.makePuzzle(lv);
  const g = B.newGame(pz, { cut: D.bal.input.cut_enabled });
  PS = { i, lv, pz, g, theme: D.pal.themes[`level${lv.id}`], drag: null, t0: clock, lastChange: clock, lastPress: -1e9, lastRelease: -1e9, lastConnect: -1e9,
    pop: new Map(), particles: [], bands: [], ghosts: [], tintOn: [], tintOff: [], judge: null, gap: null, gapText: false, doneAt: null, result: null,
    dots: pz.pairs.map(() => false), rng: makeRng(mixSeed(lv.order, 20261118)), tut: null, help: null, card: null, tutTextOn: false,
    cellsThisDrag: 0, dragLog: [], helpBreath: false, emptyPulse: -1e9 };
  PS.tintOn = pz.pairs.map(() => null);
  const rec = S.levels[lv.id];
  // 튜토리얼(L1 손가락 시연), 그림 카드(L2 빈칸·L6 구멍: 아직 다 칠하지 않은 판에서)
  if (lv.tutorial && lv.tutorial.kind === 'finger_demo') { PS.tut = { start: clock + D.bal.tutorial.finger_start_delay_ms, cells: cellsOf(lv.tutorial.demo_drag), stopAt: null }; PS.tutTextOn = true; }
  const card = lv.fill_card || lv.hole_card;
  if (card && !(rec && rec.done)) PS.card = { t: clock, svg: card.svg, text: card.text_key, closing: null };
  show('play');
  syncPairs(true);
  drawPlay(); // 첫 프레임 미리 그리기
}
const cellsOf = (arr) => arr.map(([x, y]) => y * PS.lv.width + x);
let PL = null, boardCache = null, grid = null;
function layoutPlay() {
  if (!PS) return;
  const L = (PL = LY.play(VW, VH, PS.lv.width, PS.lv.height));
  grid = { originX: L.grid.x, originY: L.grid.y, cellPx: L.cell };
  for (const [id, k] of [['pMap', 'map'], ['pUndo', 'undo'], ['pHelp', 'help'], ['pRestart', 'restart']]) place($(id), L.buttons[k]);
  const bt = L.text_slots.board_text; slot($('pText'), bt); setStyle($('pText'), 'color', D.pal.common.ink);
  place($('pCard'), L.card);
  // 쌍 점 줄
  const pr = L.pair_row, n = PS.pz.k, wrap = $('pPairs');
  if (wrap.childElementCount !== n || wrap.dataset.lv !== PS.lv.id) {
    wrap.dataset.lv = PS.lv.id; wrap.innerHTML = '';
    for (let c = 0; c < n; c++) {
      const col = colorOf(c), sp = document.createElement('span');
      sp.innerHTML = `<svg viewBox="-1 -1 2 2" aria-hidden="true"><circle class="o" cx="0" cy="0" r="0.9" stroke-width="0.12" stroke="${col.hex}" fill="#FFFFFF"/><path class="m" d="${D.lay.marks.paths[col.mark]}" transform="scale(0.42)" stroke-width="${D.lay.marks.stroke_unit}" stroke-linejoin="round" fill="${col.hex}" stroke="${col.hex}"/></svg>`;
      wrap.appendChild(sp);
    }
  }
  [...wrap.children].forEach((sp, c) => {
    let cx, cy;
    if (pr.kind === 'row') { cx = (pr.x0 + pr.x1) / 2 + (c - (n - 1) / 2) * pr.pitch; cy = pr.cy; }
    else { const row = Math.floor(c / pr.cols), inRow = Math.min(pr.cols, n - row * pr.cols), col = c % pr.cols; cx = (pr.x0 + pr.x1) / 2 + (col - (inRow - 1) / 2) * pr.pitch; cy = pr.y0 + row * pr.pitch; }
    place(sp, { x: cx - pr.d / 2, y: cy - pr.d / 2, w: pr.d, h: pr.d });
  });
  $('pPairs').setAttribute('aria-valuemax', String(n));
  boardCache = buildBoardCache({ L, lv: PS.lv, P: D.lay.param, C: D.pal.common, pz: PS.pz }, dpr);
  if (PS.card) $('pCardArt').innerHTML = D.card[PS.card.svg];
}

// 쌍 점 줄 + tint 시작/끝 기록(연결 상태가 바뀔 때)
function curPaths() { const d = PS.drag && PS.drag.d; return d && d.started && !d.done ? d.work : PS.g.paths; }
function syncPairs(init = false) {
  const dl = B.displayLayer(PS.g, PS.drag && PS.drag.d);
  const paths = curPaths();
  dl.pairDots.forEach((on, c) => {
    if (on !== PS.dots[c]) {
      if (on) PS.tintOn[c] = { t: clock, end: paths[c][paths[c].length - 1] };
      else { if (PS.tintOn[c]) PS.tintOff.push({ t: clock, c, cells: PS.prevPaths ? PS.prevPaths[c].slice() : [] }); PS.tintOn[c] = null; }
      if (on && !init) PS.pop.set('row' + c, { t: clock, ms: D.bal.combo.dot_fill_ms, peak: D.bal.combo.dot_fill_scale });
      PS.dots[c] = on;
    }
  });
  PS.prevPaths = paths.map((p) => p.slice());
  const n = dl.pairDots.filter(Boolean).length;
  [...$('pPairs').children].forEach((sp, c) => {
    const col = colorOf(c), on = dl.pairDots[c];
    setAttr(sp.querySelector('.o'), 'fill', on ? col.hex : '#FFFFFF');
    const m = sp.querySelector('.m'); setAttr(m, 'fill', on ? D.pal.common.white : col.hex); setAttr(m, 'stroke', on ? D.pal.common.white : col.hex);
  });
  const pp = $('pPairs'); setAttr(pp, 'aria-valuenow', String(n)); setAttr(pp, 'aria-valuetext', String(n));
  // 되돌리기·처음부터 불가 상태(그림으로: 흐리게)
  const lock = !!PS.doneAt;
  setAttr($('pUndo'), 'aria-disabled', lock || !PS.g.undoStack.length ? 'true' : 'false');
  setAttr($('pRestart'), 'aria-disabled', lock || PS.g.paths.every((p) => !p.length) ? 'true' : 'false');
  setAttr($('pHelp'), 'aria-disabled', lock ? 'true' : 'false');
  return dl;
}

// ---- 입력 (첫 손가락만, 이벤트 처리 안에서 판 상태를 바꾸고 다음 프레임에 그림)
function boardLocked() { return !PS || state !== 'play' || !!PS.doneAt || !!(PS.card && !PS.card.closing); }
function onDown(px, py, id = 1) {
  if (A) A.unlock();
  if (!PS || state !== 'play') return false;
  if (PS.card && !PS.card.closing) { closeCard(); return false; }
  if (PS.drag || boardLocked()) return false;
  PS.lastPress = clock;
  stopFingers();
  const cell = B.pressHit(PS.pz, grid, px, py, D.bal.input.drag_start_extend_cells);
  if (cell < 0) return false;
  const d = B.press(PS.g, cell);
  if (!d) { emptyPress(); return false; }
  PS.drag = { d, id, cell, ev: 0, px, py };
  PS.cellsThisDrag = 0;
  PS.dragLog.push([cell]);
  // 잡기: 점 / 선 끝 / 선 중간 1.0 → 1.10 → 1.0, grab 소리
  const ep = PS.pz.epColor[cell];
  PS.pop.set('dot' + (ep >= 0 ? cell : -1), { t: clock, ms: D.lay.motion.grab.ms, peak: D.lay.motion.grab.dot_scale[1] });
  sfx('grab');
  return true;
}
function onMove(px, py, id = 1) {
  const dr = PS && PS.drag; if (!dr || dr.id !== id) return;
  dr.px = px; dr.py = py;
  if (dr.d.done) return;
  const nc = B.trackCell(PS.pz, grid, px, py, dr.cell, D.bal.input.cell_track_hysteresis_frac);
  if (nc === dr.cell) return;
  dr.cell = nc;
  PS.dragLog[PS.dragLog.length - 1].push(nc);
  B.moveTo(PS.g, dr.d, nc);
  handleEvents();
}
function onUp(id = 1) {
  const dr = PS && PS.drag; if (!dr || dr.id !== id) return null;
  const r = B.release(PS.g, dr.d);
  handleEvents();
  PS.drag = null;
  PS.lastRelease = clock;
  if (r.changed) boardChanged();
  syncPairs();
  return r;
}
function handleEvents() {
  const dr = PS.drag, d = dr.d, M = D.lay.motion;
  for (; dr.ev < d.events.length; dr.ev++) {
    const e = d.events[dr.ev];
    if (e.type === 'extend') { PS.cellsThisDrag++; if (A) A.tick(PS.cellsThisDrag, clock); else sfx('tick'); }
    else if (e.type === 'cut') {
      const Q0 = PS.g.paths[e.color], i = Q0.indexOf(e.cell);
      PS.ghosts.push({ kind: 'cut', t: clock, ms: D.bal.fx_ms.cut_fade_ms, c: e.color, cells: Q0.slice(Math.max(0, i - 1)) });
      sfx('cut');
    } else if (e.type === 'blocked') {
      const k = 'dot' + e.cell, prev = PS.pop.get(k);
      if (!prev || clock - prev.t > D.bal.fx_ms.blocked_breath_ms) PS.pop.set(k, { t: clock, ms: D.bal.fx_ms.blocked_breath_ms, peak: D.bal.fx_ms.blocked_breath_scale, ring: true, kind: 'inout' });
    } else if (e.type === 'connect') onConnect(e);
  }
  const dl = syncPairs();
  if (PS.g.completed && !PS.doneAt) onComplete(dl);
}
function onConnect(e) {
  const c = e.color, grade = e.previewGrade, pz = PS.pz, P = PS.drag.d.P;
  const dl = B.displayLayer(PS.g, PS.drag.d);
  const n = dl.pairDots.filter(Boolean).length;
  const last = B.isComplete(pz, PS.drag.d.work);
  if (A) A.connect(grade, n); else sfx(['connect_g1', 'connect_g2', 'connect_g3'][grade - 1], { pitch: D.snd.ladder_hz[n - 1] });
  if (!last && S.vibrate) H.connect(clock);
  const ends = [pz.pairs[c].a, pz.pairs[c].b];
  const pop = D.bal.fx_ms.connect_pop_scale_by_grade[grade - 1];
  for (const cell of ends) PS.pop.set('dot' + cell, { t: clock, ms: D.bal.fx_ms.connect_pop_ms, peak: pop, ring: false });
  PS.ringAt = PS.ringAt || {}; PS.ringAt[c] = clock;
  if (!RM()) {
    const nP = D.bal.fx_ms.connect_particles_by_grade[grade - 1];
    for (const cell of ends) for (let k = 0; k < nP; k++) PS.particles.push({ t: clock, ms: D.bal.fx_ms.connect_particles_ms, cell, a: (k / nP) * Math.PI * 2 + PS.rng() * 0.5, c, s: 0.08 + PS.rng() * 0.06, r: D.bal.fx_ms.connect_particles_radius_cells });
    PS.bands.push({ t: clock, ms: D.bal.fx_ms.connect_band_ms, c, cells: P.slice().reverse() });
  }
  PS.judge = { t: clock, grade, c, cell: e.cell, pct: dl.fillPct };
  PS.lastConnect = clock;
  if (PS.gapText) { PS.gapText = false; }
  if (PS.tutTextOn) PS.tutTextOn = false;
}
function onComplete(dl) {
  PS.doneAt = clock;
  const g = PS.g, lv = PS.lv, rec = ST.levelRec(S, lv.id);
  const pct = B.accuracyPct(g), star = B.isStar(g);
  const prevBest = rec.bestPct, firstDone = !rec.done;
  PS.result = { accuracyPct: pct, star, oneShotPairs: B.oneShotPairs(g), moves: g.moves, pairs: g.pz.k, newBest: prevBest != null && pct > prevBest, firstDone };
  rec.done = true; rec.star = rec.star || star; rec.bestPct = Math.max(prevBest ?? 0, pct); rec.bestFill = 100;
  ST.save(S);
  if (firstDone) mapAnim = { i: PS.i, t0: null };
  PS.helpBreath = false;
  syncPairs();
}
function boardChanged() {
  PS.lastChange = clock;
  PS.gap = null; PS.gapText = false;
  const rec = ST.levelRec(S, PS.lv.id), f = B.fillPct(PS.pz, PS.g.paths);
  if (!rec.done && f > rec.bestFill) { rec.bestFill = f; ST.save(S); }
}
function emptyPress() {
  // 빈칸·판 밖을 눌렀을 때: 아직 안 이은 점들이 한 번 작게 숨 쉼("여기서 시작해요", 소리 없음)
  PS.emptyPulse = clock;
  PS.pz.pairs.forEach((p, c) => { if (!PS.dots[c]) for (const cell of [p.a, p.b]) PS.pop.set('dot' + cell, { t: clock, ms: D.bal.fx_ms.blocked_breath_ms, peak: D.bal.fx_ms.blocked_breath_scale, kind: 'inout' }); });
}
function doUndo() {
  if (boardLocked() || PS.drag) return false;
  const before = PS.g.paths.map((p) => p.slice());
  if (!B.undo(PS.g)) return false;
  PS.ghosts.push({ kind: 'fade', t: clock, ms: D.bal.fx_ms.undo_slide_ms, all: before });
  sfx('undo'); boardChanged(); syncPairs(); return true;
}
function doRestart() {
  if (boardLocked() || PS.drag) return false;
  const before = PS.g.paths.map((p) => p.slice());
  if (!B.resetBoard(PS.g)) return false;
  PS.ghosts.push({ kind: 'retract', t: clock, ms: D.bal.fx_ms.reset_clear_ms, all: before });
  sfx('restart'); boardChanged(); syncPairs(); return true;
}
function doHelp() {
  if (boardLocked() || PS.drag) return false;
  // 아직 답과 다른 쌍 하나(안 이은 쌍 + 답과 다른 길로 이은 쌍)의 답 길을 손가락으로 보여 줌(그려 주지 않음)
  const sol = solutionPaths(PS.lv);
  const same = (p, q) => p.length === q.length && (p.every((v, i) => v === q[i]) || p.every((v, i) => v === q[q.length - 1 - i]));
  const c = sol.findIndex((s, c2) => !(B.isConnected(PS.pz, c2, PS.g.paths[c2]) && same(PS.g.paths[c2], s)));
  if (c < 0) return false;
  sfx('ui_tap');
  PS.help = { start: clock + 100, cells: sol[c], loops: 1 };
  PS.helpBreath = false;
  return true;
}
function stopFingers() {
  const fade = D.bal.tutorial.finger_exit_ms;
  for (const k of ['tut', 'help']) { const f = PS[k]; if (f && f.stopAt == null && clock >= f.start) f.stopAt = clock; if (f && clock < f.start && f.stopAt == null) f.stopAt = clock - fade; }
}
function closeCard() { if (PS && PS.card && !PS.card.closing) { PS.card.closing = clock; if (PS.tut) PS.tut.start = Math.max(PS.tut.start, clock + D.bal.tutorial.finger_start_delay_ms); } }

// ---- 손가락 시연 일정(balance.json tutorial): 들어옴 → 누름 → 칸마다 → 끝에서 멈춤 → 사라짐 → 쉼(2회 뒤 길게)
function fingerAt(f, now) {
  if (!f) return null;
  const tb = D.bal.tutorial, n = f.cells.length;
  const loopLen = tb.finger_enter_ms + tb.finger_press_ms + tb.finger_ms_per_cell * (n - 1) + tb.finger_hold_at_end_ms + tb.finger_exit_ms;
  if (now < f.start) return null;
  let t = now - f.start, k = 0;
  for (;;) { if (t < loopLen) break; const gap = (k + 1) % tb.loops_before_pause === 0 ? tb.pause_after_loops_ms : tb.finger_loop_gap_ms; if (f.loops && k + 1 >= f.loops) return null; if (t < loopLen + gap) return null; t -= loopLen + gap; k++; }
  let alpha = 1, pos = 0, press = 0, end = false;
  const e1 = tb.finger_enter_ms, e2 = e1 + tb.finger_press_ms, e3 = e2 + tb.finger_ms_per_cell * (n - 1), e4 = e3 + tb.finger_hold_at_end_ms;
  if (t < e1) alpha = t / e1;
  else if (t < e2) press = ease.bump((t - e1) / tb.finger_press_ms);
  else if (t < e3) pos = (t - e2) / tb.finger_ms_per_cell;
  else if (t < e4) { pos = n - 1; end = (t - e3) / tb.finger_hold_at_end_ms; }
  else { pos = n - 1; alpha = 1 - (t - e4) / tb.finger_exit_ms; }
  if (f.stopAt != null) { const u = (now - f.stopAt) / tb.finger_exit_ms; if (u >= 1) return null; alpha *= 1 - u; }
  return { pos, alpha: clamp01(alpha), press, end, cells: f.cells };
}

// ---- 매 프레임 갱신(게임 시계)
function updatePlay() {
  if (!PS) return;
  const fx = D.bal.fx_ms, M = D.lay.motion;
  // 그림 카드: 누르거나 3 s 뒤 사라짐
  if (PS.card) {
    if (!PS.card.closing && clock - PS.card.t >= 3000) closeCard();
    const vis = PS.card.closing ? 1 - clamp01((clock - PS.card.closing) / 200) : clamp01((clock - PS.card.t) / 200);
    setStyle($('pCard'), 'opacity', vis.toFixed(3)); $('pCard').hidden = vis <= 0 && !!PS.card.closing;
    if (PS.card.closing && vis <= 0) PS.card = null;
  } else $('pCard').hidden = true;
  // 튜토리얼 다시 보이기: 판을 완료하기 전, 8 s 동안 판이 안 바뀌면
  if (PS.tut && PS.tut.stopAt != null && !PS.doneAt && !PS.drag && clock - Math.max(PS.lastChange, PS.lastPress) >= D.bal.tutorial.reshow_if_idle_s * 1000) PS.tut = { start: clock, cells: PS.tut.cells, stopAt: null };
  if (PS.help && !fingerAt(PS.help, clock) && clock > PS.help.start + 50) PS.help = null;
  // 도움 버튼 숨 쉼(30 s 동안 판이 안 바뀌면)
  PS.helpBreath = !PS.doneAt && clock - PS.lastChange >= D.bal.help.idle_s * 1000;
  const hb = PS.helpBreath && !RM() ? 1 + 0.06 * (0.5 - 0.5 * Math.cos(((clock % M.help.breathe_period_ms) / M.help.breathe_period_ms) * 2 * Math.PI)) : 1;
  setStyle($('pHelp'), 'transform', hb === 1 ? '' : `scale(${hb.toFixed(3)})`);
  setStyle($('pHelp'), 'borderColor', PS.helpBreath ? D.pal.common.nodeOpenEdge : '');
  // 빈칸 신호: 모든 쌍이 이어졌는데 빈칸이 있을 때만
  const allOn = PS.dots.every(Boolean) && !PS.drag && !PS.doneAt;
  if (allOn && !PS.g.completed) {
    if (!PS.gap) PS.gap = { start: Math.max(PS.lastRelease + fx.empty_breath_start_after_release_ms, PS.lastConnect + fx.empty_breath_start_after_last_connect_ms), n: 0 };
    const per = fx.empty_breath_ms + fx.empty_breath_repeat_s * 1000;
    while (PS.gap.n < fx.empty_breath_max_times && clock >= PS.gap.start + PS.gap.n * per) {
      PS.gap.n++;
      sfx('gap_hint');
      if (PS.gap.n === 1) { setText($('pLive'), ''); setText($('pLive'), T('gap_left')); }
      if (PS.gap.n === M.gap_hint.text_on_breath) PS.gapText = true;
    }
  } else if (PS.gap) { PS.gap = null; PS.gapText = false; }
  // 판정 이름이 떠 있으면 빈칸 글 숨김
  const judgeOn = PS.judge && clock - PS.judge.t < D.bal.judge.name_total_ms;
  let txt = '';
  if (PS.card && D.card[PS.card.svg]) txt = T(PS.card.text);
  else if (PS.tutTextOn && PS.lv.tutorial) txt = T(PS.lv.tutorial.text_key);
  else if (PS.gapText && !judgeOn) txt = T(M.gap_hint.text_key);
  if (PL.text_slots.board_text.shared_with === 'judge' && judgeOn) txt = '';
  setText($('pText'), txt);
  // 판 완료 시간표(layout motion.complete)
  if (PS.doneAt != null) {
    const t = clock - PS.doneAt;
    if (t >= D.bal.haptics_ms.complete_delay_ms && !PS.cSound) { PS.cSound = true; sfx('complete', { k: PS.pz.k }); if (S.vibrate) H.complete(clock); if (!RM()) PS.g.connectLog.forEach((cl, j) => PS.bands.push({ t: PS.doneAt + 150 + j * 80, ms: fx.connect_band_ms, c: cl.color, cells: PS.g.paths[cl.color].slice().reverse() })); }
    if (t >= 420 && !PS.cParts && !RM()) { PS.cParts = true; for (let k = 0; k < 12; k++) { const free = PS.g.paths.flat(); const cell = free[Math.floor(PS.rng() * free.length)]; PS.particles.push({ t: clock, ms: 500, cell, rise: true, c: PS.pz.epColor[cell] >= 0 ? PS.pz.epColor[cell] : B.ownerGrid(PS.pz, PS.g.paths)[cell], s: 0.1 + PS.rng() * 0.05, dx: (PS.rng() - 0.5) * 0.4 }); } }
    if (t >= D.bal.complete.next_screen_after_s * 1000 && state === 'play') openResult();
  }
}

// ---- 그리기
function cc(i) { return [grid.originX + ((i % PS.lv.width) + 0.5) * grid.cellPx, grid.originY + (((i / PS.lv.width) | 0) + 0.5) * grid.cellPx]; }
function popScale(key) {
  const p = PS.pop.get(key); if (!p) return 1;
  const u = (clock - p.t) / p.ms; if (u >= 1) { PS.pop.delete(key); return 1; }
  if (RM()) return 1;
  return 1 + (p.peak - 1) * ease.bump(u);
}
function drawPlay() {
  if (!PS || !PL) return;
  const L = PL, cell = L.cell, C = D.pal.common, M = D.lay.motion, fx = D.bal.fx_ms;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // 바탕(레벨 그라디언트 한 장)
  const gr = ctx.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, PS.theme.top); gr.addColorStop(1, PS.theme.bottom);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
  drawDecor();
  // 판 완료 튐(t 380, 1.0 → 1.03 → 1.0, 300 ms)
  ctx.save();
  if (PS.doneAt != null && !RM()) {
    const u = (clock - PS.doneAt - 380) / 300;
    if (u > 0 && u < 1) { const s = 1 + (D.bal.fx_ms.complete_board_scale - 1) * ease.bump(u), cx = L.board.x + L.board.w / 2, cy = L.board.y + L.board.h / 2; ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); }
  }
  ctx.drawImage(boardCache.canvas, boardCache.x, boardCache.y, boardCache.w, boardCache.h);
  const paths = curPaths(), pz = PS.pz, ins = D.lay.param.tile_inset_of_cell * cell, tr = D.lay.param.tile_r_of_cell * cell;
  // tint: 연결된 쌍의 칸(띠가 지나간 칸부터 120 ms 페이드, 동작 줄이기면 150 ms 한 번에)
  const tile = (i, color, a, scale = 1) => { const [x, y] = cc(i); const w = (cell - 2 * ins) * scale; ctx.globalAlpha = a; ctx.fillStyle = color; ctx.beginPath(); rrect(ctx, x - w / 2, y - w / 2, w, w, tr * scale); ctx.fill(); ctx.globalAlpha = 1; };
  for (const off of PS.tintOff) { const u = (clock - off.t) / M.disconnect.ms; if (u >= 1) continue; for (const i of off.cells) if (!PS.dots[off.c] || !paths[off.c].includes(i)) tile(i, colorOf(off.c).tint, 1 - u); }
  PS.tintOff = PS.tintOff.filter((o) => clock - o.t < M.disconnect.ms);
  paths.forEach((p, c) => {
    const on = PS.tintOn[c]; if (!on || !PS.dots[c]) return;
    const seq = p[p.length - 1] === on.end ? p.slice().reverse() : p;
    seq.forEach((i, r) => {
      let a;
      if (RM()) a = clamp01((clock - on.t) / 150);
      else a = clamp01((clock - on.t - (r / Math.max(1, seq.length - 1)) * M.connect.tint_ms * 0.6) / 120);
      tile(i, colorOf(c).tint, a);
    });
  });
  // 빈칸 숨 쉬기(gapGlow 테두리 + 1.08배, 동작 줄이기면 1.2 s 고정 테두리)
  if (PS.gap) {
    const per = fx.empty_breath_ms + fx.empty_breath_repeat_s * 1000;
    const k = PS.gap.n - 1, t = clock - (PS.gap.start + k * per);
    if (k >= 0) {
      const own = B.ownerGrid(pz, PS.g.paths);
      const dur = RM() ? 1200 : fx.empty_breath_ms;
      if (t < dur) {
        const u = t / dur, b = RM() ? 1 : ease.bump(u), s = RM() ? 1 : 1 + (fx.empty_breath_scale - 1) * b;
        for (let i = 0; i < pz.n; i++) {
          if (pz.hole[i] || own[i] >= 0) continue;
          const [x, y] = cc(i), w = (cell - 2 * ins) * s;
          ctx.fillStyle = mix(C.tile, C.gapGlow, 0.35 * b); ctx.beginPath(); rrect(ctx, x - w / 2, y - w / 2, w, w, tr * s); ctx.fill();
          ctx.strokeStyle = C.gapGlow; ctx.lineWidth = M.gap_hint.glow_w_of_cell * cell; ctx.globalAlpha = RM() ? 1 : 0.5 + 0.5 * b; ctx.stroke(); ctx.globalAlpha = 1;
          ctx.fillStyle = C.tileDot; ctx.beginPath(); ctx.arc(x, y, (D.lay.param.tile_dot_of_cell * cell) / 2, 0, 7); ctx.fill();
        }
      }
    }
  }
  // 잘린 선·되돌리기·처음부터 잔상
  for (const gh of PS.ghosts) {
    const u = clamp01((clock - gh.t) / gh.ms);
    if (gh.kind === 'cut') strokePoly(ctx, gh.cells.map(cc), L.px.line_w * (1 - 0.5 * u), colorOf(gh.c).hex, 1 - u);
    else if (gh.kind === 'fade') gh.all.forEach((p, c) => { if (p.length > 1) strokePoly(ctx, p.map(cc), L.px.line_w, colorOf(c).hex, (1 - ease.out(u)) * 0.6); });
    else if (gh.kind === 'retract') gh.all.forEach((p, c) => { if (p.length > 1) strokePoly(ctx, subPolyline(p.map(cc), 0, 1 - ease.inout(u)), L.px.line_w, colorOf(c).hex, 1); });
  }
  PS.ghosts = PS.ghosts.filter((gh) => clock - gh.t < gh.ms);
  // 선
  const dr = PS.drag;
  paths.forEach((p, c) => {
    let pts = p.map(cc);
    if (dr && dr.d.started && !dr.d.done && dr.d.c === c && !B.isConnected(pz, c, p) && pts.length) {
      // 머리가 손가락 쪽으로 축 방향 최대 0.5칸
      const [hx, hy] = pts[pts.length - 1], dx = dr.px - hx, dy = dr.py - hy, lim = D.lay.param.head_lead_of_cell * cell;
      const lead = Math.abs(dx) >= Math.abs(dy) ? [hx + Math.max(-lim, Math.min(lim, dx)), hy] : [hx, hy + Math.max(-lim, Math.min(lim, dy))];
      pts = pts.concat([lead]);
    }
    if (pts.length > 1) strokePoly(ctx, pts, L.px.line_w, colorOf(c).hex);
  });
  // 밝은 띠(짝 점 쪽에서 시작 점 쪽으로 한 번, 선 길이 35 %)
  for (const bd of PS.bands) {
    const u = (clock - bd.t) / bd.ms; if (u < 0 || u >= 1) continue;
    const pts = bd.cells.map(cc), bl = M.connect.band_len_of_line, a = u * (1 + bl) - bl;
    strokePoly(ctx, subPolyline(pts, Math.max(0, a), Math.min(1, a + bl)), L.px.line_w * 0.5, mix(colorOf(bd.c).hex, '#FFFFFF', 0.45), 0.9);
  }
  PS.bands = PS.bands.filter((bd) => clock - bd.t < bd.ms);
  // 손가락 시연의 유령 선은 점 아래에
  for (const f of [PS.tut, PS.help]) drawFinger(fingerAt(f, clock), 'ghost');
  // 점(쌍 색 원 + 흰 모양 표지), 연결된 점은 바깥 고리
  pz.pairs.forEach((p, c) => {
    const col = colorOf(c), mark = D.marks[col.mark];
    for (const cell0 of [p.a, p.b]) {
      const [x, y] = cc(cell0);
      const s = popScale('dot' + cell0) * (dr && dr.d.c === c && dr.cell === cell0 ? 1 : 1);
      const pp = PS.pop.get('dot' + cell0);
      if (pp && pp.ring) { const u = clamp01((clock - pp.t) / pp.ms); ctx.strokeStyle = col.hex; ctx.globalAlpha = 0.55 * (1 - u); ctx.lineWidth = L.px.ring_w * 1.5; ctx.beginPath(); ctx.arc(x, y, (L.px.ring_d / 2) * (1 + 0.15 * u), 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
      if (PS.dots[c]) {
        const ru = RM() ? 1 : clamp01((clock - ((PS.ringAt || {})[c] ?? -1e9)) / M.connect.ring_ms);
        ctx.strokeStyle = col.hex; ctx.lineWidth = L.px.ring_w; ctx.beginPath(); ctx.arc(x, y, (L.px.ring_d / 2) * (0.85 + 0.15 * ru) * s, 0, 7); ctx.stroke();
      }
      ctx.fillStyle = col.hex; ctx.beginPath(); ctx.arc(x, y, (L.px.dot_d / 2) * s, 0, 7); ctx.fill();
      drawMark(ctx, mark, x, y, (L.px.mark / 2) * s, C.white, D.lay.marks.stroke_unit);
    }
  });
  // 조각(연결: 두 점에서 칸 1개 반경 안 / 완료: 판 안쪽에서 위로)
  for (const pt of PS.particles) {
    const u = (clock - pt.t) / pt.ms; if (u < 0 || u >= 1) continue;
    const [x, y] = cc(pt.cell); let X, Y;
    if (pt.rise) { X = x + pt.dx * cell * u; Y = y - 0.8 * cell * ease.out(u); }
    else { const r = pt.r * cell * 0.5 * (0.6 + 0.4 * ease.out(u)) + (L.px.dot_d / 2) * (1 - u) * 0.6; X = x + Math.cos(pt.a) * r * (0.3 + ease.out(u)); Y = y + Math.sin(pt.a) * r * (0.3 + ease.out(u)); }
    ctx.globalAlpha = 1 - u; ctx.fillStyle = colorOf(pt.c).hex; ctx.beginPath(); ctx.arc(X, Y, Math.max(0.5, pt.s * cell * 0.5 * (1 - 0.6 * u)), 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
  PS.particles = PS.particles.filter((pt) => clock - pt.t < pt.ms);
  ctx.restore();
  // 손가락 시연(L1 튜토리얼·도움): 유령 선(굵기 0.6배, tint) + 손가락(그 점 기준 위치)
  for (const f of [PS.tut, PS.help]) drawFinger(fingerAt(f, clock), 'hand');
  drawJudge();
}
function drawDecor() {
  const d = PS.theme.decor; if (!d) return;
  if (d.only_on_complete && !(PS.doneAt != null && clock - PS.doneAt >= 0)) return;
  const L = PL, c = L.cell, b = L.board, col = mix(PS.theme.top, D.pal.common.ink, 0.06);
  const a = d.only_on_complete ? clamp01((clock - PS.doneAt) / 400) : 1;
  const spots = [[b.x, b.y], [b.x + b.w, b.y + b.h], [b.x + b.w, b.y], [b.x, b.y + b.h]];
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = c * 0.12;
  for (let k = 0; k < d.count; k++) {
    const [sx, sy] = spots[k % 4], sz = c * (0.9 - 0.15 * (k % 3)), off = sz / 2 - 0.4 * c;
    const x = sx + (sx > b.x ? 1 : -1) * off, y = sy + (sy > b.y ? 1 : -1) * off;
    ctx.beginPath();
    if (d.shape === 'ring') { ctx.arc(x, y, sz / 2, 0, 7); ctx.stroke(); continue; }
    if (d.shape === 'arc') { ctx.arc(x, y, sz / 2, Math.PI, 2 * Math.PI); ctx.stroke(); continue; }
    if (d.shape === 'wave') { ctx.moveTo(x - sz / 2, y); ctx.quadraticCurveTo(x - sz / 4, y - sz / 3, x, y); ctx.quadraticCurveTo(x + sz / 4, y + sz / 3, x + sz / 2, y); ctx.stroke(); continue; }
    if (d.shape === 'triangle') { ctx.moveTo(x, y - sz / 2); ctx.lineTo(x + sz / 2, y + sz / 2); ctx.lineTo(x - sz / 2, y + sz / 2); ctx.closePath(); ctx.fill(); continue; }
    if (d.shape === 'square') { rrect(ctx, x - sz / 2, y - sz / 2, sz, sz, sz * 0.2); ctx.fill(); continue; }
    if (d.shape === 'star') { ctx.save(); ctx.translate(x, y); ctx.scale(sz / 2, sz / 2); ctx.fill(new Path2D(D.lay.star_path)); ctx.restore(); continue; }
  }
  ctx.restore();
}
function drawFinger(F, part) {
  if (!F || F.alpha <= 0) return;
  const cell = PL.cell, lineW = PL.px.line_w, n = F.cells.length;
  const i0 = Math.floor(F.pos), u = F.pos - i0;
  const a = cc(F.cells[Math.min(i0, n - 1)]), b = cc(F.cells[Math.min(i0 + 1, n - 1)]);
  const tip = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const c = PS.pz.epColor[F.cells[0]] >= 0 ? PS.pz.epColor[F.cells[0]] : 0, col = colorOf(c);
  ctx.save(); ctx.globalAlpha = F.alpha;
  if (part === 'ghost') { if (F.pos > 0) { const pts = F.cells.slice(0, i0 + 1).map(cc); pts.push(tip); strokePoly(ctx, pts, lineW * 0.6, col.tint, 1); } ctx.restore(); return; }
  if (F.press > 0) { const [x, y] = cc(F.cells[0]); ctx.strokeStyle = col.hex; ctx.globalAlpha = F.alpha * 0.5 * F.press; ctx.lineWidth = PL.px.ring_w * 1.5; ctx.beginPath(); ctx.arc(x, y, (PL.px.ring_d / 2) * (1 + 0.1 * F.press), 0, 7); ctx.stroke(); ctx.globalAlpha = F.alpha; }
  if (F.end !== false && F.end > 0 && !RM()) { const [x, y] = cc(F.cells[n - 1]); for (let k = 0; k < 6; k++) { const ang = (k / 6) * Math.PI * 2, r = cell * 0.45 * ease.out(F.end); ctx.globalAlpha = F.alpha * (1 - F.end); ctx.fillStyle = col.hex; ctx.beginPath(); ctx.arc(x + Math.cos(ang) * r, y + Math.sin(ang) * r, cell * 0.05, 0, 7); ctx.fill(); } ctx.globalAlpha = F.alpha; }
  // 손: 오른쪽 아래로 뻗음, 점이 판 맨 오른쪽 열이면 좌우 뒤집음
  const flip = (F.cells[0] % PS.lv.width) === PS.lv.width - 1 ? -1 : 1;
  const sz = cell * D.lay.finger.size_of_cell * (1 - 0.08 * F.press);
  ctx.translate(tip[0], tip[1]); ctx.scale(sz * flip, sz);
  ctx.fillStyle = D.pal.common.finger; ctx.strokeStyle = D.pal.common.fingerEdge; ctx.lineWidth = D.lay.finger.stroke_unit; ctx.lineJoin = 'round';
  ctx.fill(D.finger); ctx.stroke(D.finger);
  ctx.restore();
}
function drawJudge() {
  const J = PS.judge; if (!J || NOTEXT) return;
  const jb = D.bal.judge, t = clock - J.t;
  let fadeStart = jb.name_pop_ms + jb.name_hold_ms;
  if (PS.doneAt != null) fadeStart = Math.min(fadeStart, PS.doneAt - J.t + jb.name_fade_on_complete_start_ms);
  const fa = 1 - clamp01((t - fadeStart) / jb.name_fade_ms);
  if (fa <= 0) return;
  const L = PL, jd = L.judge, col = colorOf(J.c), [dx, dy] = cc(J.cell);
  let cx, top;
  if (jd.rule === 'portrait_band') { cx = Math.max(jd.x_min + jd.w / 2, Math.min(jd.x_max - jd.w / 2, dx)); top = jd.y; }
  else { const x = J.cell % PS.lv.width, side = 2 * x + 1 < PS.lv.width ? jd.left : jd.right; cx = side.cx; top = Math.max(side.y_min, Math.min(side.y_max, dy - jd.h / 2)); }
  const namePx = jd.name_px[J.grade - 1], pctPx = jd.pct_px;
  const sc = RM() ? 1 : 1 + (jb.name_pop_scale - 1) * ease.bump(clamp01(t / jb.name_pop_ms));
  const rise = RM() ? 0 : D.lay.motion.connect.judge.rise_px * (1 - clamp01(t / jb.name_pop_ms));
  ctx.save(); ctx.globalAlpha = fa;
  const ny = top + namePx * 0.62 + rise;
  ctx.translate(cx, ny); ctx.scale(sc, sc);
  ctx.font = `800 ${namePx}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 6; ctx.strokeStyle = D.pal.common.white; ctx.strokeText(T(jb.name_keys[J.grade - 1]), 0, 0);
  ctx.fillStyle = col.shade; ctx.fillText(T(jb.name_keys[J.grade - 1]), 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // 판 채움 %(이름 아래 작게, 앞에 칠한 칸 그림)
  const py = top + namePx * 1.15 + pctPx * 0.6 + rise, label = `${J.pct}%`;
  ctx.font = `700 ${pctPx}px ${FONT}`; const tw = ctx.measureText(label).width, iw = pctPx * 1.05;
  const x0 = cx - (tw + iw + 4) / 2;
  if (D.imgFilled) ctx.drawImage(D.imgFilled, x0, py - iw / 2, iw, iw);
  ctx.textAlign = 'left'; ctx.lineWidth = 4; ctx.strokeStyle = D.pal.common.white; ctx.strokeText(label, x0 + iw + 4, py);
  ctx.fillStyle = D.pal.common.inkSoft; ctx.fillText(label, x0 + iw + 4, py);
  ctx.restore();
}
function rowFrame() {
  [...$('pPairs').children].forEach((sp, c) => { const s = popScale('row' + c); setStyle(sp, 'transform', s === 1 ? '' : `scale(${s.toFixed(3)})`); });
}

// ---------------------------------------------------------------- 결과
let RL = null;
function openResult() {
  const R = PS.result, lv = PS.lv;
  show('result');
  PS.resultAt = clock;
  $('rName').innerHTML = `<b></b>`; setText($('rName').firstChild, T(lv.name_key));
  const last = PS.i === D.levels.length - 1;
  const titleKey = last ? 'clear_last' : R.star ? 'clear_star' : `clear_title_${((lv.order - 1) % 3) + 1}`;
  setText($('rTitle'), T(titleKey));
  $('rStar').innerHTML = icon('star'); $('rStar').setAttribute('aria-label', T('result_star')); $('rStar').hidden = !R.star;
  $('rPct').firstChild.innerHTML = icon('one_go'); $('rPct').setAttribute('aria-label', T('result_accuracy'));
  setAttr($('rPct'), 'aria-valuenow', String(R.accuracyPct)); setAttr($('rPct'), 'aria-valuetext', `${R.accuracyPct}%`);
  $('rBest').innerHTML = icon('new_best'); $('rBest').setAttribute('aria-label', T('result_new_best')); $('rBest').hidden = true;
  $('rNext').hidden = last;
  layoutResult();
}
function layoutResult() {
  if (!PS || !PS.result) return;
  const L = (RL = LY.result(VW, VH)), lv = PS.lv;
  const ln = L.level_name; place($('rName'), ln); setStyle($('rName'), 'fontSize', ln.font_px + 'px');
  const band = $('rName').firstChild; if (band) { setStyle(band, 'background', PS.theme.top); setStyle(band, 'padding', `0 ${Math.round(12 * L.k)}px`); setStyle(band, 'lineHeight', (ln.h - 3) + 'px'); }
  slot($('rTitle'), L.title); setStyle($('rTitle'), 'fontWeight', '800');
  const mb = L.mini_board; place($('rBoard'), mb);
  $('rBoard').innerHTML = miniBoardSVG(lv, PS.g.paths, mb.w, D.pal, { holeFill: PS.theme.top }) + `<span class="chk" role="img" aria-label="${T('result_check')}">${icon('filled')}</span>`;
  place($('rStar'), L.star);
  const pc = L.pct; place($('rPct'), pc); setStyle($('rPct'), 'fontSize', pc.font_px + 'px');
  const ic = $('rPct').firstChild; setStyle(ic, 'width', Math.round(pc.font_px * 1.3) + 'px'); setStyle(ic, 'height', Math.round(pc.font_px * 1.3) + 'px');
  place($('rBest'), L.new_best);
  place($('rMap'), L.buttons.map); place($('rNext'), L.buttons.next); place($('rAgain'), L.buttons.again);
}
function resultFrame() {
  const t = clock - PS.resultAt, R = PS.result, Mo = D.lay.motion;
  const slide = RM() ? 1 : ease.out(clamp01(t / 280));
  setStyle($('result'), 'transform', slide >= 1 ? '' : `translateY(${((1 - slide) * VH).toFixed(1)}px)`);
  const st = Mo.result;
  if (R.star) {
    const u = clamp01((t - 280 - st.star_delay_ms) / st.star_ms);
    const s = RM() ? (u > 0 ? 1 : 0) : u < 0.6 ? (u / 0.6) * st.star_scale[1] : st.star_scale[1] + (1 - st.star_scale[1]) * ((u - 0.6) / 0.4);
    setStyle($('rStar'), 'transform', `scale(${s.toFixed(3)})`);
    if (u > 0 && !PS.starSound) { PS.starSound = true; sfx(st.sound_star); }
  }
  const pu = RM() ? 1 : clamp01((t - 280) / st.pct_count_ms);
  setText($('rPct').lastChild, `${Math.floor(R.accuracyPct * pu)}%`);
  if (R.newBest) { const u = RM() ? (pu >= 1 ? 1 : 0) : clamp01((t - 280 - st.pct_count_ms) / 200); $('rBest').hidden = u <= 0; setStyle($('rBest'), 'opacity', u.toFixed(2)); }
}
function resultAccepts() { return PS && PS.doneAt != null && clock - PS.doneAt >= D.bal.complete.result_buttons_after_ms; }

// ---------------------------------------------------------------- 보호자
function openGuardian() { sfx('ui_tap'); show('guardian'); }
function buildGuardian() {
  const L = LY.guardianScreen(VW, VH), col = $('gCol');
  col.style.cssText = `height:${Math.max(L.content_h, VH)}px`;
  place($('gClose'), L.buttons.close); iconBtn($('gClose'), 'close', 'btn_close');
  const ts = L.text_slots;
  let h = '';
  const txt = (k, cls = '') => { const r = ts[k]; return `<p class="slot ${cls}" id="gs_${k}" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;font-size:${r.font_px}px;${r.weight ? 'font-weight:' + r.weight + ';' : ''}${r.color ? 'color:' + D.pal.common[r.color] + ';' : ''}">${esc(T(k))}</p>`; };
  h += txt('guardian_title', 'mid') + txt('guardian_intro', 'top');
  for (const k of ['settings_sound', 'settings_vibrate', 'settings_motion']) {
    const c = L.controls[k], on = k === 'settings_sound' ? S.sound : k === 'settings_vibrate' ? S.vibrate : S.motion;
    h += txt(k, 'mid') + `<button class="tog" type="button" role="switch" data-k="${k}" aria-checked="${on}" aria-labelledby="gs_${k}" style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"><i></i></button>`;
  }
  h += txt('vibrate_note', 'top') + txt('settings_lang', 'mid');
  for (const k of ['lang_ko', 'lang_en']) { const c = L.controls[k]; h += `<button class="tb" type="button" data-lang="${k.slice(5)}" aria-pressed="${lang === k.slice(5)}" lang="${k.slice(5)}" style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;font-size:${c.font_px}px">${esc(T(k))}</button>`; }
  const rc = L.controls.settings_reset;
  h += `<button class="tb" type="button" id="gReset" style="left:${rc.x}px;top:${rc.y}px;width:${rc.w}px;height:${rc.h}px;font-size:${rc.font_px}px">${esc(T('settings_reset'))}</button>`;
  col.innerHTML = h;
  const cf = L.confirm, card = $('gConfirm').firstElementChild;
  place(card, cf.card);
  const rel = (r) => ({ x: r.x - cf.card.x, y: r.y - cf.card.y, w: r.w, h: r.h, font_px: r.font_px });
  slot($('gConfirmText'), rel(cf.text)); setText($('gConfirmText'), T('confirm_reset'));
  place($('gNo'), rel(cf.no)); setStyle($('gNo'), 'fontSize', cf.no.font_px + 'px'); setText($('gNo'), T('confirm_no'));
  place($('gYes'), rel(cf.yes)); setStyle($('gYes'), 'fontSize', cf.yes.font_px + 'px'); setText($('gYes'), T('confirm_yes'));
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- 이벤트 연결
function wire() {
  $('title').addEventListener('pointerdown', (e) => { if (e.target.closest('#tSound')) return; if (A) A.unlock(); if (state === 'title') { sfx('ui_tap'); show('map'); } });
  $('tSound').addEventListener('click', toggleSound); $('mSound').addEventListener('click', toggleSound);
  $('mNodes').addEventListener('click', (e) => {
    const b = e.target.closest('.node'); if (!b || state !== 'map') return;
    if (A) A.unlock();
    const i = +b.dataset.i; if (b.dataset.state === 'locked') return; // 잠긴 노드: 아무 일 없음(소리도 없음)
    sfx('ui_tap'); startLevel(i);
  });
  const gear = $('mGear');
  const hs = (e) => { if (e) e.preventDefault(); gearHold = clock || 1e-6; };
  const he = () => { gearHold = 0; gear.style.setProperty('--p', '0'); };
  gear.addEventListener('pointerdown', hs); gear.addEventListener('pointerup', he); gear.addEventListener('pointerleave', he); gear.addEventListener('pointercancel', he);
  gear.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) hs(e); });
  gear.addEventListener('keyup', he);
  gear.addEventListener('contextmenu', (e) => e.preventDefault());
  // 판 입력: 첫 손가락만
  cv.addEventListener('pointerdown', (e) => {
    if (PS && PS.drag) return; // 두 번째 손가락 무시
    if (onDown(e.clientX, e.clientY, e.pointerId)) { try { cv.setPointerCapture(e.pointerId); } catch {} }
  });
  cv.addEventListener('pointermove', (e) => { if (PS && PS.drag && PS.drag.id === e.pointerId) { const list = e.getCoalescedEvents ? e.getCoalescedEvents() : null; if (list && list.length) for (const ce of list) onMove(ce.clientX, ce.clientY, e.pointerId); else onMove(e.clientX, e.clientY, e.pointerId); } });
  const up = (e) => onUp(e.pointerId);
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('lostpointercapture', up);
  $('pCard').addEventListener('pointerdown', () => closeCard());
  $('pMap').addEventListener('click', () => { if (state !== 'play' || (PS && PS.doneAt)) return; sfx('ui_tap'); show('map'); });
  $('pUndo').addEventListener('click', doUndo); $('pRestart').addEventListener('click', doRestart); $('pHelp').addEventListener('click', doHelp);
  const rb = (fn) => () => { if (state !== 'result' || !resultAccepts()) return; sfx('ui_tap'); fn(); };
  $('rMap').addEventListener('click', rb(() => goMapAfter()));
  $('rNext').addEventListener('click', rb(() => (PS.i + 1 < D.levels.length ? startLevel(PS.i + 1) : goMapAfter())));
  $('rAgain').addEventListener('click', rb(() => startLevel(PS.i)));
  $('gClose').addEventListener('click', () => { sfx('ui_tap'); $('gConfirm').hidden = true; show('map'); });
  $('gCol').addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.classList.contains('tog')) {
      const k = t.dataset.k;
      if (k === 'settings_sound') { S.sound = !S.sound; if (A) { A.unlock(); A.setEnabled(S.sound); } soundBtns(); }
      if (k === 'settings_vibrate') { S.vibrate = !S.vibrate; H.enabled = S.vibrate; }
      if (k === 'settings_motion') S.motion = !S.motion;
      ST.save(S); t.setAttribute('aria-checked', String(k === 'settings_sound' ? S.sound : k === 'settings_vibrate' ? S.vibrate : S.motion));
    } else if (t.dataset.lang) { lang = t.dataset.lang; S.lang = lang; ST.save(S); applyLang(); buildGuardian(); }
    else if (t.id === 'gReset') { $('gConfirm').hidden = false; $('gNo').focus(); }
  });
  $('gNo').addEventListener('click', () => { $('gConfirm').hidden = true; });
  $('gYes').addEventListener('click', () => { ST.clearProgress(S); mapAnim = null; $('gConfirm').hidden = true; });
  window.addEventListener('resize', () => relayout());
  document.addEventListener('visibilitychange', () => { if (!A) return; if (document.hidden) A.pause(); else A.resume(); });
  if (mqlRM.addEventListener) mqlRM.addEventListener('change', () => {});
}
function goMapAfter() { if (mapAnim && mapAnim.t0 == null) mapAnim.t0 = clock; show('map'); }

// ---------------------------------------------------------------- 루프
let last = 0;
function frame(now) {
  const dt = Math.min(100, last ? now - last : 16.7); last = now;
  if (!TEST && !document.hidden) advance(dt);
  render();
  requestAnimationFrame(frame);
}
function advance(dt) {
  clock += dt;
  if (state === 'play' || state === 'result') updatePlay();
}
function render() {
  applyTrans();
  if (state === 'title') { const p = RM() ? 1 : 0.55 + 0.45 * (0.5 + 0.5 * Math.cos(((clock % 1600) / 1600) * 2 * Math.PI)); setStyle($('tTap'), 'opacity', p.toFixed(2)); }
  if (state === 'map') mapFrame();
  if (state === 'play' || state === 'result') { drawPlay(); rowFrame(); }
  if (state === 'result') resultFrame();
}

// ---------------------------------------------------------------- 테스트 훅
const cellPt = ([x, y]) => [grid.originX + (x + 0.5) * grid.cellPx, grid.originY + (y + 0.5) * grid.cellPx];
const toXY = (i) => [i % PS.lv.width, (i / PS.lv.width) | 0];
const api = {
  ready: false, test: TEST,
  get state() { return state; },
  get levelIndex() { return PS ? PS.i : -1; },
  get levelCount() { return D.levels ? D.levels.length : 0; },
  get clock() { return clock; },
  loadLevel(i) { startLevel(i); return true; },
  step(dt) { let left = dt; while (left > 0) { const s = Math.min(16.667, left); advance(s); left -= s; } render(); return state; },
  get board() {
    if (!PS) return null;
    const dl = B.displayLayer(PS.g);
    return { id: PS.lv.id, W: PS.lv.width, H: PS.lv.height, holes: PS.lv.holes, paths: PS.g.paths.map((p) => p.map(toXY)), pairDots: dl.pairDots, fillPct: dl.fillPct, completed: PS.g.completed, locked: boardLocked(), card: !!PS.card, tutorial: !!(PS.tut && fingerAt(PS.tut, clock)), gap: PS.gap ? PS.gap.n : 0, text: $('pText').textContent };
  },
  // 칸 좌표 열 [[x,y],…]: 칸 가운데 화면 좌표로 바꿔 실제 포인터 처리 함수(onDown·onMove·onUp)에 넣음
  drag(cells) { const [x0, y0] = cellPt(cells[0]); if (!onDown(x0, y0, 7)) return { pressed: false }; for (const c of cells.slice(1)) { const [x, y] = cellPt(c); onMove(x, y, 7); } const r = onUp(7); return { pressed: true, ...r }; },
  press(cell) { const [x, y] = cellPt(cell); return onDown(x, y, 8); },
  move(cell) { const [x, y] = cellPt(cell); onMove(x, y, 8); },
  release() { return onUp(8); },
  get moves() { return PS ? PS.g.moves : 0; },
  get colorMoves() { return PS ? PS.g.colorMoves.slice() : []; },
  get attempts() { return PS ? PS.g.moves : 0; },
  get progress() { return PS ? B.fillPct(PS.pz, PS.g.paths) : 0; },
  get result() { return PS && PS.result ? { ...PS.result } : null; },
  get dragLog() { return PS ? PS.dragLog.map((d) => d.map(toXY)) : []; },
  get sfxLog() { return A ? A.log.map((x) => x.name) : []; },
  get hapticLog() { return H ? H.log.slice() : []; },
  get judge() { return PS && PS.judge ? { grade: PS.judge.grade, color: PS.judge.c, pct: PS.judge.pct, age: clock - PS.judge.t } : null; },
  get layout() { return { play: PL, result: RL, map: mapL, grid }; },
  get coreVersion() { return B.CORE_VERSION; },
  get audioState() { return A && A.ctx ? A.ctx.state : 'none'; },
  get store() { return JSON.parse(JSON.stringify(S)); },
  toTitle() { show('title'); }, toMap() { show('map'); }, toGuardian() { show('guardian'); },
  closeCard() { closeCard(); return true; }, undo: () => doUndo(), restart: () => doRestart(), help: () => doHelp(),
  resultNext() { if (state === 'result' && resultAccepts()) { $('rNext').click(); return true; } return false; },
  setLang(l) { lang = l; applyLang(); relayout(); },
  calcLayout(W, H, cols, rows) { return { play: LY.play(W, H, cols, rows), map: LY.map(W, H), result: LY.result(W, H), title: LY.titleScreen(W, H), guardian: LY.guardianScreen(W, H), error: LY.errorScreen(W, H) }; },
};
window.__game = api;

// ---------------------------------------------------------------- 시작
(async () => {
  try { await loadData(); } catch (e) { if (window.__bootFail) window.__bootFail(); return; }
  window.__gameBooted = true; clearTimeout(window.__bootTimer);
  lang = Q.get('lang') || S.lang || window.__bootLang || ((navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en');
  if (!D.str.title[lang]) lang = 'en';
  if (NOTEXT) document.body.classList.add('notext');
  LY.initLayout(D.lay.param, D.str);
  A = new Audio(D.snd); A.enabled = !!S.sound;
  if (TEST) A.unlock = () => {}; // 테스트: 오디오 켜지 않음(재생 기록만)
  H = new Haptics(D.snd.haptics, TEST); H.enabled = !!S.vibrate;
  applyLang();
  wire();
  show('title');
  api.ready = true;
  requestAnimationFrame(frame);
})();
