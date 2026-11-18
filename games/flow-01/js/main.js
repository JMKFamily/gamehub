// flow-01 Pairpaint / 짝꿍색칠 — 웹 빌드 본체 (round-2)
// 판정: js/board.js(= tools/core/board.mjs 바이트 복사). 배치: js/layout.js(= assets/check/layout.mjs 배치 식, sync-build 생성).
// 수치·레벨·문구·색·소리는 data/*.json. 모든 연출·UI 타이머는 게임 시계(clock, ms). ?test=1 이면 시계는 __game.step(dt)로만 가고 오디오는 켜지 않음.
// 그리기는 layout.json render 규칙: 바탕 = CSS 한 번, 판 = 레벨 시작 때 오프스크린 1장, 점·이름·빛 = 비트맵, 바뀐 것 없으면 안 그림, DPR ≤ 2.
import * as B from './board.js';
import { makeRng, mixSeed } from './rng.js';
import { makeLayout } from './layout.js';
import { Audio } from './audio.js';
import { Haptics } from './haptics.js';
import * as ST from './store.js';
import { buildBoardCache, dotSprite, markSprite, glowSprite, circleSprite, textSprite, subPolyline, strokePoly, miniBoardSVG, svgImg, svgImgEl, svgBitmap, bitmapEl, idle, setIdleGate, mix, ease, clamp01, rrect } from './render.js';

const Q = new URLSearchParams(location.search);
const TEST = Q.get('test') === '1';
const NOTEXT = Q.get('notext') === '1';
const $ = (id) => document.getElementById(id);
const FONT = getComputedStyle(document.body).fontFamily;
let clock = 0;
const D = {};
let LY = null;
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
const pad2 = (n) => String(n).padStart(2, '0');
const themeOf = (lv) => D.pal.themes[`level${pad2(lv.order)}`] || D.pal.themes.menu;

// ---------------------------------------------------------------- DOM 도우미 (값이 바뀔 때만 씀)
const cache = new WeakMap();
const cOf = (el) => { let c = cache.get(el); if (!c) cache.set(el, (c = {})); return c; };
function setStyle(el, k, v) { const c = cOf(el); if (c[k] !== v) { c[k] = v; el.style[k] = v; } }
function setText(el, v) { const c = cOf(el); if (c._t !== v) { c._t = v; el.textContent = v; } }
function setAttr(el, k, v) { const c = cOf(el); if (c['@' + k] !== v) { c['@' + k] = v; if (v == null) el.removeAttribute(k); else el.setAttribute(k, v); } }
function setHidden(el, v) { const c = cOf(el); if (c._h !== v) { c._h = v; el.hidden = v; } }
function place(el, r) { setStyle(el, 'left', r.x + 'px'); setStyle(el, 'top', r.y + 'px'); setStyle(el, 'width', r.w + 'px'); setStyle(el, 'height', r.h + 'px'); }
function slot(el, r) {
  place(el, r); setStyle(el, 'fontSize', r.font_px + 'px');
  if (r.align === 'left') { setStyle(el, 'justifyContent', 'flex-start'); setStyle(el, 'textAlign', 'left'); }
  else if (r.align === 'right') { setStyle(el, 'justifyContent', 'flex-end'); setStyle(el, 'textAlign', 'right'); }
  if (r.weight) setStyle(el, 'fontWeight', String(r.weight));
  if (r.color) setStyle(el, 'color', D.pal.common[r.color]);
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
  D.starPath = new Path2D(D.lay.star_path);
  D.chapters = D.bal.chapters.list;
  D.chapterOf = {}; D.chapters.forEach((ch, ci) => ch.levels.forEach((id) => { D.chapterOf[id] = ci; }));
  if (B.CORE_VERSION !== D.bal.core.core_version) console.warn(`board.js ${B.CORE_VERSION} ≠ balance.json core_version ${D.bal.core.core_version}`);
}
// 색 슬롯 돌려쓰기(palette slot_rotation): L11 이상 3·4쌍 판만
function colorsOf(lv) {
  const k = lv.pairs.length, sr = D.pal.slot_rotation;
  const rot = lv.order >= 11 && (k === 3 || k === 4) && sr && sr.by_level[String(lv.order)] ? sr.by_level[String(lv.order)][String(k)] : null;
  return lv.pairs.map((p) => D.pal.pairs[rot ? rot[p.color_slot] : p.color_slot]);
}

// ---------------------------------------------------------------- 화면 전환 (겹쳐 흐려짐 + 6 px 위로, 게임 시계)
const SCREENS = ['title', 'map', 'play', 'result', 'guardian'];
let trans = null;
let lastScreenAt = 0;
function show(name) {
  state = name; lastScreenAt = performance.now();
  for (const s of SCREENS) $(s).classList.toggle('show', s === name);
  $('boot').classList.remove('show');
  cv.style.visibility = name === 'play' || name === 'result' ? 'visible' : 'hidden';
  trans = name === 'result' ? null : { el: $(name), t0: clock, ms: D.lay.motion.screen.ms };
  if (name === 'map' && mapAnim && mapAnim.t0 == null) mapAnim.t0 = clock;
  relayout();
  if (A) A.ambient(name === 'map' || name === 'play' || name === 'result');
  applyTrans();
  dirty = true;
}
function applyTrans() {
  if (!trans) return;
  const u = clamp01((clock - trans.t0) / trans.ms);
  setStyle(trans.el, 'opacity', u >= 1 ? '' : String(ease.out(u)));
  setStyle(trans.el, 'transform', u >= 1 || RM() ? '' : `translateY(${(6 * (1 - ease.out(u))).toFixed(2)}px)`);
  if (u >= 1) trans = null;
}

// ---------------------------------------------------------------- 공통 버튼
function iconBtn(el, iconName, key) { el.innerHTML = icon(iconName); if (key) el.setAttribute('aria-label', T(key)); }
function soundBtns() {
  for (const id of ['tSound', 'mSound']) { const el = $(id); el.innerHTML = icon(S.sound ? 'sound_on' : 'sound_off'); el.setAttribute('aria-label', T('settings_sound')); el.setAttribute('aria-pressed', String(!!S.sound)); }
}
function toggleSound() { S.sound = !S.sound; ST.save(S); if (A) { wake(); A.setEnabled(S.sound); } soundBtns(); if (S.sound) sfx('ui_tap'); }
// 오디오 깨우기: 이미 있으면 resume(가벼움), 없으면 유휴 줄에서 만들기(사용자 동작 뒤라 sticky activation 으로 running)
function wake() { if (!A) return; if (A.ctx) A.unlock(); else if (!A._q) { A._q = true; requestAnimationFrame(() => setTimeout(() => { A.unlock(); A._q = false; }, 0)); } }
function sfx(name, opt) { if (A) A.play(name, opt); }

function applyLang() {
  document.documentElement.lang = lang;
  document.title = T('title');
  setText($('tName'), T('title')); setText($('tTag'), T('tagline')); setText($('tTap'), T('tap_to_start'));
  setText($('mHold'), T('guardian_hold')); setText($('mHoldSr'), T('guardian_hold'));
  iconBtn($('mGear'), 'settings', 'btn_settings'); $('mGear').insertAdjacentHTML('afterbegin', '<span class="hold" aria-hidden="true"></span>');
  iconBtn($('mPrev'), 'page_prev', 'btn_page_prev'); iconBtn($('mNext'), 'page_next', 'btn_page_next');
  $('mTabs').setAttribute('aria-label', T('aria_chapters'));
  iconBtn($('pMap'), 'map', 'btn_map'); iconBtn($('pUndo'), 'undo', 'btn_undo'); iconBtn($('pHelp'), 'help', 'btn_help'); iconBtn($('pRestart'), 'restart', 'btn_restart');
  iconBtn($('rMap'), 'map', 'btn_map'); iconBtn($('rNext'), 'next', 'btn_next'); iconBtn($('rAgain'), 'restart', 'btn_again');
  $('pPairs').setAttribute('aria-label', T('aria_pairs'));
  $('mStars').setAttribute('aria-label', T('aria_page_stars')); $('mAll').setAttribute('aria-label', T('aria_map_stars'));
  $('rDots').setAttribute('aria-label', T('result_dots')); $('rPct').setAttribute('aria-label', T('result_accuracy'));
  $('cv').setAttribute('aria-label', T('aria_board'));
  soundBtns();
  mapKey = '';
  if (state === 'map') buildMap();
}

// ---------------------------------------------------------------- 레이아웃
function relayout() {
  VW = window.innerWidth; VH = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 2); // render.dpr_cap
  const cw = Math.round(VW * dpr), ch = Math.round(VH * dpr);
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  if (state === 'title') layoutTitle();
  if (state === 'map') buildMap();
  if (state === 'play' || state === 'result') layoutPlay();
  if (state === 'result') layoutResult();
  if (state === 'guardian') buildGuardian();
  dirty = true;
}

// ---------------------------------------------------------------- 타이틀 + 스스로 칠해지는 3x3 히어로(r2 S10)
let TL = null, hero = null;
function layoutTitle() {
  const L = (TL = LY.titleScreen(VW, VH));
  place($('tSound'), L.buttons.sound);
  place($('tLogo'), L.logo); if (!$('tLogo').firstChild) $('tLogo').appendChild(svgImgEl(D.logo));
  slot($('tName'), L.text_slots.title); slot($('tTag'), L.text_slots.tagline); slot($('tTap'), L.text_slots.tap_to_start);
  const h = L.hero, hc = $('tHero'); place(hc, h);
  hc.width = Math.round(h.w * dpr); hc.height = Math.round(h.h * dpr);
  // 3x3 판(앱 아이콘과 같은 2쌍 배치)
  const lv = { width: 3, height: 3, holes: [], pairs: [{ a: [1, 0], b: [1, 1], color_slot: 0 }, { a: [0, 0], b: [2, 2], color_slot: 1 }] };
  const P = D.lay.param, cell = h.w / (3 + 2 * P.board_pad_of_cell), g = cell * P.board_pad_of_cell;
  const Lh = { cell, board: { x: 0, y: 0, w: h.w, h: h.h }, grid: { x: g, y: g } };
  const pz = { hole: new Uint8Array(9) };
  const cols = [D.pal.pairs[0], D.pal.pairs[1]];
  hero = { lv, cell, g, cols, cache: buildBoardCache({ L: Lh, lv, P, C: D.pal.common, pz }, dpr), paths: [[[1, 0], [2, 0], [2, 1], [1, 1]], [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]]],
    dots: cols.map((c) => dotSprite(c, D.marks[c.mark], cell * P.dot_d_of_cell, (cell * P.dot_d_of_cell * P.mark_of_dot) / 2, D.lay.marks.stroke_unit, D.pal.common.white, dpr)), t0: clock };
}
function drawHero() {
  if (!hero) return;
  const hc = $('tHero'), x = hc.getContext('2d'), { cell, g, cols, paths } = hero, P = D.lay.param;
  x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, hc.width, hc.height);
  x.drawImage(hero.cache.canvas, hero.cache.x, hero.cache.y, hero.cache.w, hero.cache.h);
  const loop = TL.hero.loop_ms, t = RM() ? 2400 : (clock - hero.t0) % loop;
  const cc = ([cx, cy]) => [g + (cx + 0.5) * cell, g + (cy + 0.5) * cell];
  const prog = [clamp01(t / 1200), clamp01((t - 1200) / 1200)];
  const clearU = clamp01((t - 3000) / 400), fade = 1 - clearU;
  paths.forEach((p, c) => {
    const f = prog[c] * fade; if (f <= 0) return;
    if (prog[c] >= 1) for (const q of p) { const [X, Y] = cc(q), w = cell * 0.9; x.globalAlpha = fade; x.fillStyle = cols[c].tint; x.beginPath(); rrect(x, X - w / 2, Y - w / 2, w, w, cell * 0.22); x.fill(); }
    x.globalAlpha = 1;
    strokePoly(x, subPolyline(p.map(cc), 0, f), cell * P.line_w_of_cell, cols[c].hex, fade);
  });
  hero.lv.pairs.forEach((pr, c) => { for (const e of [pr.a, pr.b]) { const [X, Y] = cc(e), d = hero.dots[c]; if (prog[c] >= 1) { x.strokeStyle = cols[c].hex; x.lineWidth = cell * P.ring_w_of_cell; x.globalAlpha = fade; x.beginPath(); x.arc(X, Y, (cell * P.ring_of_cell) / 2, 0, 7); x.stroke(); x.globalAlpha = 1; } x.drawImage(d.c, X - d.s / 2, Y - d.s / 2, d.s, d.s); } });
  // 손가락: 지금 긋는 쌍의 선 머리(글 없이 "끌어서 잇는다")
  const cur = prog.findIndex((f) => f > 0 && f < 1);
  if (cur >= 0 && !RM()) { const pts = subPolyline(paths[cur].map(cc), 0, prog[cur]), [fx2, fy2] = pts[pts.length - 1], sz = cell * D.lay.finger.size_of_cell * 0.8;
    x.save(); x.translate(fx2, fy2); x.scale(sz, sz); x.fillStyle = D.pal.common.finger; x.strokeStyle = D.pal.common.fingerEdge; x.lineWidth = D.lay.finger.stroke_unit; x.lineJoin = 'round'; x.fill(D.finger); x.stroke(D.finger); x.restore(); }
}

// ---------------------------------------------------------------- 진행 지도 (챕터 페이지, r2 50스테이지)
function nodeState(i) {
  const lv = D.levels[i], r = S.levels[lv.id];
  const open = i === 0 || !!(S.levels[D.levels[i - 1].id] || {}).done;
  if (!open) return 'locked';
  if (r && r.done) return r.star ? 'star' : 'done';
  if (r && r.bestFill > 0) return 'partial';
  return 'next';
}
let mapAnim = null, mapL = null, mapPage = 0, mapKey = '', pageTurn = null;
function catmull(pts) {
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    segs.push(`M${p1[0]} ${p1[1]} C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0]} ${p2[1]}`);
  }
  return segs;
}
const solCache = new Map();
function solutionPaths(lv) {
  if (!solCache.has(lv.id)) { const ord = lv.pairs.map((p) => lv.solution.find((s) => s.id === p.id)); solCache.set(lv.id, ord.map((s) => s.path.map(([x, y]) => y * lv.width + x))); }
  return solCache.get(lv.id);
}
function nodeSVG(i, st, size) {
  const C = D.pal.common, lv = D.levels[i];
  if (st === 'locked') { // 그 레벨 판 크기 격자 실루엣(r2 S10)
    const gw = size * 0.53, n = Math.max(lv.width, lv.height), c = gw / n, x0 = size / 2 - (lv.width * c) / 2, y0 = size / 2 - (lv.height * c) / 2;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.47}" fill="${C.nodeLocked}"/>`;
    const hole = new Set((lv.holes || []).map(([x, y]) => y * lv.width + x));
    for (let y = 0; y < lv.height; y++) for (let x = 0; x < lv.width; x++) if (!hole.has(y * lv.width + x)) s += `<rect x="${(x0 + x * c + c * 0.1).toFixed(2)}" y="${(y0 + y * c + c * 0.1).toFixed(2)}" width="${(c * 0.8).toFixed(2)}" height="${(c * 0.8).toFixed(2)}" rx="${(c * 0.22).toFixed(2)}" fill="${C.nodeLockedMark}" opacity="0.35"/>`;
    return s + '</svg>';
  }
  if (st === 'next') return D.icon['node-open'];
  if (st === 'partial') {
    const f = clamp01((S.levels[lv.id].bestFill || 0) / 100), a = f * Math.PI * 2 - 1e-4, r = 33.5;
    const x = 36 + r * Math.sin(a), y = 36 - r * Math.cos(a);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="28" fill="${C.nodeOpen}" stroke="${C.nodeOpenEdge}" stroke-width="4"/><path d="M30 25 L47 36 L30 47 Z" fill="${C.nodeOpenEdge}" stroke="${C.nodeOpenEdge}" stroke-width="4" stroke-linejoin="round"/><path d="M36 2.5 A${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}" fill="none" stroke="${C.pathDone}" stroke-width="5" stroke-linecap="round"/></svg>`;
  }
  const k = size / D.lay.param.map_node, band = Math.round(4 * k), th = themeOf(lv), cols = colorsOf(lv);
  const mini = miniBoardSVG(lv, solutionPaths(lv), size - 2 * band, D.pal, (c) => cols[c], { bg: th.top, lineW: D.lay.param.line_w_of_cell });
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect x="0.75" y="0.75" width="${size - 1.5}" height="${size - 1.5}" rx="${(size * 0.2).toFixed(1)}" fill="${th.top}" stroke="${C.boardEdge}" stroke-width="1.5"/><g transform="translate(${band} ${band})">${mini.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`;
  if (st === 'star') { const sr = size * 0.16; s += `<path d="${D.lay.star_path}" transform="translate(${(size - sr * 0.9).toFixed(1)} ${(sr * 0.9).toFixed(1)}) scale(${sr.toFixed(2)})" fill="${C.star}" stroke="${C.starEdge}" stroke-width="0.12" stroke-linejoin="round"/>`; }
  return s + '</svg>';
}
// 부팅 유휴 시간에 지도 노드 그림을 미리 래스터(render.map_first)
function prewarmPage(p) { if (!mapL) mapL = LY.map(window.innerWidth, window.innerHeight); const ch = D.chapters[p]; if (!ch) return []; return ch.levels.map((id) => { const i = D.levels.findIndex((l) => l.id === id); idle(() => prewarmCard(i)); return svgBitmap(nodeSVG(i, nodeState(i), mapL.node_d), mapL.node_d, mapL.node_d, dpr); }); }
// 아직 다 칠하지 않은 카드 판의 카드 그림을 그 판 크기로 미리 비트맵화(전환 프레임에서 첫 래스터 없음)
function prewarmCard(i) {
  const lv = D.levels[i]; if (!lv) return; const card = lv.fill_card || lv.hole_card; if (!card || (S.levels[lv.id] || {}).done) return;
  const a = LY.play(window.innerWidth, window.innerHeight, lv.width, lv.height).card.art; svgBitmap(D.card[card.svg], a.w, a.h, dpr);
}
function chapterState(ci) {
  const ids = D.chapters[ci].levels, idx = ids.map((id) => D.levels.findIndex((l) => l.id === id));
  const sts = idx.map(nodeState);
  return { idx, sts, locked: sts.every((s) => s === 'locked'), allDone: sts.every((s) => s === 'done' || s === 'star'), stars: sts.filter((s) => s === 'star').length };
}
function defaultPage() {
  if (mapAnim) return D.chapterOf[D.levels[mapAnim.i].id];
  const i = D.levels.findIndex((_, j) => { const s = nodeState(j); return s === 'next' || s === 'partial'; });
  return i < 0 ? 0 : D.chapterOf[D.levels[i].id];
}
function buildMap() {
  const L = (mapL = LY.map(VW, VH)), C = D.pal.common;
  const key = [VW, VH, mapPage, lang, JSON.stringify(S.levels), !!mapAnim].join('|');
  place($('mSound'), L.buttons.sound); place($('mGear'), L.buttons.settings);
  slot($('mTitle'), L.title); setStyle($('mTitle'), 'fontWeight', '800');
  slot($('mHold'), L.text_slots.guardian_hold); setStyle($('mHold'), 'fontWeight', '600');
  place($('mPrev'), L.pager.prev); place($('mNext'), L.pager.next); place($('mTabs'), L.pager.dots.hit);
  if (key === mapKey) return;
  mapKey = key;
  const cs = chapterState(mapPage), ch = D.chapters[mapPage];
  setText($('mTitle'), T(ch.name_key));
  // 이 장 별 10칸 줄(CSS 크기 = star_px, r2 S19) + 전체 별(숨은 meter)
  const st = L.stars, ms = $('mStars');
  place(ms, st); setStyle(ms, 'gap', (st.pitch - st.star_px) + 'px');
  ms.textContent = '';
  cs.sts.forEach((s) => { const im = svgImgEl(icon(s === 'star' ? 'star' : 'star_empty')); im.style.width = im.style.height = st.star_px + 'px'; ms.appendChild(im); });
  ms.setAttribute('aria-valuemax', '10'); ms.setAttribute('aria-valuenow', String(cs.stars)); ms.setAttribute('aria-valuetext', String(cs.stars));
  const all = D.levels.filter((lv) => (S.levels[lv.id] || {}).star).length;
  const ma = $('mAll'); ma.setAttribute('aria-valuemax', String(D.levels.length)); ma.setAttribute('aria-valuenow', String(all)); ma.setAttribute('aria-valuetext', String(all));
  // 길
  const segs = catmull(L.nodes);
  let svg = '';
  segs.forEach((d, j) => {
    const done = cs.sts[j] === 'done' || cs.sts[j] === 'star';
    const anim = mapAnim && mapAnim.i === cs.idx[j];
    svg += `<path d="${d}" fill="none" stroke="${C.pathTodo}" stroke-width="${L.path.w}" stroke-linecap="round"/>`;
    if (done) svg += `<path class="pd${anim ? ' anim' : ''}" d="${d}" fill="none" stroke="${C.pathDone}" stroke-width="${L.path.w}" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${anim ? 1 : 0}"/>`;
  });
  $('mPath').setAttribute('viewBox', `0 0 ${VW} ${VH}`); $('mPath').innerHTML = svg;
  // 노드(미리 디코드한 img)
  const ol = $('mNodes'); ol.textContent = '';
  cs.idx.forEach((i, j) => {
    const lv = D.levels[i], s = cs.sts[j], [cx, cy] = L.nodes[j], d = L.node_d;
    const li = document.createElement('li');
    li.style.cssText = `left:${cx - d / 2}px;top:${cy - d / 2}px;width:${d}px;height:${d}px`;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'node'; b.dataset.i = i; b.dataset.state = s;
    const stKey = { locked: 'node_locked', next: 'node_next', partial: 'node_partial', done: 'node_done', star: 'node_star' }[s];
    b.setAttribute('aria-label', `${T(lv.name_key)}, ${T(stKey)}`);
    if (s === 'locked') b.setAttribute('aria-disabled', 'true');
    b.appendChild(bitmapEl(nodeSVG(i, s, d), d, d, dpr));
    li.appendChild(b);
    if (s === 'partial') {
      const pb = document.createElement('span'); pb.className = 'pbar'; pb.setAttribute('role', 'progressbar'); pb.setAttribute('aria-label', T('aria_best_fill'));
      pb.setAttribute('aria-valuemin', '0'); pb.setAttribute('aria-valuemax', '100'); pb.setAttribute('aria-valuenow', String(S.levels[lv.id].bestFill)); li.appendChild(pb);
    }
    ol.appendChild(li);
  });
  // 장 넘김: ◀ 점 5개 ▶ (탭 = 장)
  setStyle($('mPrev'), 'visibility', mapPage === 0 ? 'hidden' : ''); setStyle($('mNext'), 'visibility', mapPage === D.chapters.length - 1 ? 'hidden' : '');
  const tabs = $('mTabs'); tabs.textContent = '';
  const pd = L.pager.dots.d;
  D.chapters.forEach((c, ci) => {
    const cst = chapterState(ci), cur = ci === mapPage;
    const bt = document.createElement('button'); bt.type = 'button'; bt.setAttribute('role', 'tab'); bt.setAttribute('aria-selected', String(cur)); bt.dataset.page = ci;
    bt.setAttribute('aria-label', cst.locked ? `${T(c.name_key)}, ${T('node_locked')}` : T(c.name_key)); bt.tabIndex = cur ? 0 : -1;
    const dd = cst.locked && !cur ? pd * 0.75 : pd, col = cur ? C.pathDone : cst.locked ? C.nodeLocked : cst.allDone ? C.star : C.pathTodo;
    bt.innerHTML = `<i style="width:${dd}px;height:${dd}px;background:${col}"></i>`;
    tabs.appendChild(bt);
  });
  // 이웃 장 그림 미리 래스터
  idle(() => prewarmPage(mapPage + 1)); idle(() => prewarmPage(mapPage - 1));
}
function turnPage(p) {
  if (p < 0 || p >= D.chapters.length || p === mapPage) return;
  const dir = p > mapPage ? 1 : -1;
  mapPage = p; buildMap(); sfx('ui_tap');
  pageTurn = { t0: clock, dir };
}
function mapFrame() {
  const M = D.lay.motion.map;
  for (const b of $('mNodes').querySelectorAll('.node')) {
    const st = b.dataset.state;
    if ((st === 'next' || st === 'partial') && !RM()) {
      const u = ((clock % M.next_breathe_period_ms) / M.next_breathe_period_ms);
      if (b.firstChild) setStyle(b.firstChild, 'transform', `scale(${(1 + (M.next_breathe_scale[1] - 1) * (0.5 - 0.5 * Math.cos(u * 2 * Math.PI))).toFixed(3)})`);
    } else if (st === 'locked' && b._shake != null) {
      const u = (clock - b._shake) / M.locked_tap.ms;
      if (u >= 1 || RM()) { b._shake = null; setStyle(b, 'transform', ''); } else setStyle(b, 'transform', `translateX(${(Math.sin(u * Math.PI * 3) * M.locked_tap.shift_px * mapL.k).toFixed(2)}px)`);
    }
  }
  if (pageTurn) {
    const ms = RM() ? 150 : M.page_turn_ms, u = clamp01((clock - pageTurn.t0) / ms), pg = $('mPage');
    setStyle(pg, 'opacity', u >= 1 ? '' : ease.out(u).toFixed(3));
    setStyle(pg, 'transform', u >= 1 || RM() ? '' : `translateX(${(pageTurn.dir * 40 * (1 - ease.out(u))).toFixed(1)}px)`);
    if (u >= 1) pageTurn = null;
  }
  if (mapAnim && mapAnim.t0 != null) {
    const p = $('mPath').querySelector('.pd.anim');
    const u = clamp01((clock - mapAnim.t0 - M.node_morph_ms) / M.path_fill_ms);
    if (p) setAttr(p, 'stroke-dashoffset', RM() ? '0' : (1 - ease.out(u)).toFixed(3));
    if (u >= 1) { if (mapAnim.i + 1 < D.levels.length) sfx('node_open'); mapAnim = null; mapKey = ''; }
  }
  if (gearHold) { const u = clamp01((clock - gearHold) / mapL.buttons.settings.hold_ms); $('mGear').style.setProperty('--p', u.toFixed(3)); if (u >= 1) { gearHold = 0; $('mGear').style.setProperty('--p', '0'); openGuardian(); } }
}
let gearHold = 0;

// ---------------------------------------------------------------- 플레이
let PS = null;
const colorOf = (c) => PS.cols[c];
// split = true(화면 버튼): 준비(판 캐시·비트맵)와 화면 바꾸기를 다른 프레임으로 나눠 가장 긴 프레임을 줄임(r2 S2)
function startLevel(i, via = null, split = false) {
  const lv = D.levels[i];
  const pz = B.makePuzzle(lv);
  const g = B.newGame(pz, { cut: D.bal.input.cut_enabled });
  PS = { i, lv, pz, g, cols: colorsOf(lv), theme: themeOf(lv), drag: null, t0: clock, lastChange: clock, lastPress: -1e9, lastRelease: -1e9, lastConnect: -1e9,
    pop: new Map(), particles: [], bands: [], ghosts: [], glows: [], tintOn: pz.pairs.map(() => null), tintOff: [], judge: null, gap: null, gapText: false, doneAt: null, result: null,
    dots: pz.pairs.map(() => false), rng: makeRng(mixSeed(lv.order, 20261118)), tut: null, help: null, card: null, tutTextOn: false,
    cellsThisDrag: 0, dragLog: [], helpUsed: false, emptyPulse: -1e9, connAt: {}, head: null, stepPop: -1e9, bounce: null, wave: null, trans: via, fillShown: 0, fillFrom: 0, fillTo: 0, fillT: -1e9 };
  const rec = S.levels[lv.id];
  if (lv.tutorial && lv.tutorial.kind === 'finger_demo') { PS.tut = { start: clock + D.bal.tutorial.finger_start_delay_ms, cells: cellsOf(lv.tutorial.demo_drag), stopAt: null }; PS.tutTextOn = true; }
  const card = lv.fill_card || lv.hole_card;
  if (card && !(rec && rec.done)) PS.card = { t: 1e15, svg: card.svg, text: card.text_key, closing: null }; // t = 화면이 바뀌고 전환 연출이 끝난 때(finish)
  setText($('pName'), T(lv.name_key));
  const me = PS;
  const finish = () => {
    if (PS !== me) return;
    if (PS.trans) PS.trans.t0 = clock;
    // 카드 "뜬 뒤 400 ms 무시" 시계는 전환 연출이 끝난 때부터(r2 핫픽스, QA 이슈 5)
    if (PS.card) PS.card.t = clock + (PS.trans && !RM() ? (PS.trans.kind === 'grow' ? D.lay.motion.level_transition.ms : 200) : 0);
    show('play'); syncPairs(true); drawPlay(); // 첫 프레임 미리 그리기
  };
  if (split) { layoutPlay(); requestAnimationFrame(() => requestAnimationFrame(finish)); } else finish();
}
const cellsOf = (arr) => arr.map(([x, y]) => y * PS.lv.width + x);
let PL = null, boardCache = null, grid = null, SP = null;
function layoutPlay() {
  if (!PS) return;
  const lk = [VW, VH, dpr, PS.lv.id, PS.t0, lang].join('|');
  if (PS.laid === lk) return; PS.laid = lk;
  const L = (PL = LY.play(VW, VH, PS.lv.width, PS.lv.height)), C = D.pal.common, P = D.lay.param;
  grid = { originX: L.grid.x, originY: L.grid.y, cellPx: L.cell };
  for (const [id, k] of [['pMap', 'map'], ['pUndo', 'undo'], ['pHelp', 'help'], ['pRestart', 'restart']]) place($(id), L.buttons[k]);
  const bt = L.text_slots.board_text; slot($('pText'), bt); setStyle($('pText'), 'color', C.ink);
  // 바탕(레벨 그라디언트) = 캔버스 CSS 바탕 한 번(render.layers bg)
  setStyle(cv, 'background', `linear-gradient(${PS.theme.top}, ${PS.theme.bottom})`);
  // 채움 막대(r2 H3)
  const fb = L.fill_bar; place($('pFill'), { x: 0, y: 0, w: 0, h: 0 });
  const tr = $('pFillTrack'); place(tr, fb.bar); setStyle(tr, 'borderRadius', fb.bar.radius + 'px'); setStyle(tr, 'background', C.tile);
  setStyle($('pFillBar'), 'background', mix(PS.theme.top, C.ink, 0.55));
  slot($('pFillPct'), fb.pct);
  // 그림 카드(판 안, 글은 카드 안 띠, r2 S3)
  const cd = L.card, cel = $('pCard');
  place(cel, cd); setStyle(cel, 'borderRadius', cd.radius + 'px'); setStyle(cel, 'background', PS.theme.top);
  const rel = (r) => ({ ...r, x: r.x - cd.x, y: r.y - cd.y });
  place($('pCardArt'), rel(cd.art)); slot($('pCardText'), rel(cd.text)); setStyle($('pCardText'), 'color', C.ink);
  if (PS.card) { const a = $('pCardArt'); a.textContent = ''; a.appendChild(bitmapEl(D.card[PS.card.svg], cd.art.w, cd.art.h, dpr)); setText($('pCardText'), T(PS.card.text)); }
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
  // 판·장식 캐시 + 비트맵(점·표지·빛·조각·판정 이름)
  boardCache = buildBoardCache({ L, lv: PS.lv, P, C, pz: PS.pz }, dpr, (o) => drawDecor(o, L));
  const cell = L.cell;
  SP = {
    dots: PS.cols.map((col) => dotSprite(col, D.marks[col.mark], L.px.dot_d, L.px.mark / 2, D.lay.marks.stroke_unit, C.white, dpr)),
    lineMarks: PS.cols.map((col) => markSprite(D.marks[col.mark], cell * D.lay.motion.connect.line_mark.size_of_cell, D.lay.marks.stroke_unit, C.white, D.lay.motion.connect.line_mark.alpha, dpr)),
    glows: PS.cols.map((col) => glowSprite(col.hex, cell * D.lay.motion.connect.juice.glow.radius_of_cell, dpr)),
    bits: PS.cols.map((col) => circleSprite(col.hex, cell * 0.08, dpr)),
    judge: PS.cols.map(() => [null, null, null]),
  };
  PS.dotSvgs = PS.cols.map((col) => ({ full: resultDotSVG(col, true), hollow: resultDotSVG(col, false) }));
  const sp0 = SP;
  // 유휴 시간에 조금씩(한 번에 한 쌍) — 한 프레임을 길게 만들지 않음
  const jobs = PS.cols.map((_, c) => () => { [0, 1, 2].forEach((gi) => judgeSprite(c, gi)); svgImg(PS.dotSvgs[c].full); svgImg(PS.dotSvgs[c].hollow); });
  // 판정 이름 비트맵은 유휴 줄에서 미리(못 했으면 첫 연결 때 그 하나만 그림, 글꼴은 부팅 때 데움 → 약 7 ms)
  for (const j of jobs) idle(() => { if (SP === sp0) j(); });
  dirty = true;
}
function judgeSprite(c, gi) {
  const C = D.pal.common, L = PL;
  return (SP.judge[c][gi] ||= textSprite(T(D.bal.judge.name_keys[gi]), L.judge.name_px[gi], FONT, PS.cols[c].shade, C.white, dpr, gi === 0 ? { px: L.judge.g1_star_px, path: D.starPath, fill: C.star, edge: C.starEdge } : null));
}
function drawDecor(o, L) {
  const d = PS.theme.decor; if (!d || d.only_on_complete) return;
  const c = L.cell, b = L.board, col = mix(PS.theme.top, D.pal.common.ink, 0.06);
  const spots = [[b.x, b.y], [b.x + b.w, b.y + b.h], [b.x + b.w, b.y], [b.x, b.y + b.h]];
  o.fillStyle = col; o.strokeStyle = col; o.lineWidth = c * 0.12;
  for (let k = 0; k < d.count; k++) {
    const [sx, sy] = spots[k % 4], sz = c * (0.9 - 0.15 * (k % 3)), off = sz / 2 - 0.4 * c;
    const x = sx + (sx > b.x ? 1 : -1) * off, y = sy + (sy > b.y ? 1 : -1) * off;
    o.beginPath();
    if (d.shape === 'ring') { o.arc(x, y, sz / 2, 0, 7); o.stroke(); }
    else if (d.shape === 'arc') { o.arc(x, y, sz / 2, Math.PI, 2 * Math.PI); o.stroke(); }
    else if (d.shape === 'wave') { o.moveTo(x - sz / 2, y); o.quadraticCurveTo(x - sz / 4, y - sz / 3, x, y); o.quadraticCurveTo(x + sz / 4, y + sz / 3, x + sz / 2, y); o.stroke(); }
  }
}
function resultDotSVG(col, full) {
  const m = D.lay.marks.paths[col.mark], C = D.pal.common;
  if (full) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.15 -1.15 2.3 2.3"><circle r="0.98" fill="none" stroke="${col.hex}" stroke-width="0.1"/><circle r="0.84" fill="${col.hex}"/><path d="${m}" transform="scale(0.39)" fill="${C.white}" stroke="${C.white}" stroke-width="${D.lay.marks.stroke_unit}" stroke-linejoin="round"/><path d="${D.lay.star_path}" transform="translate(0.78 -0.78) scale(0.35)" fill="${C.star}" stroke="${C.starEdge}" stroke-width="0.12" stroke-linejoin="round"/></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.15 -1.15 2.3 2.3"><circle r="0.74" fill="${C.white}" stroke="${col.hex}" stroke-width="0.2"/><path d="${m}" transform="scale(0.34)" fill="${col.hex}" stroke="${col.hex}" stroke-width="${D.lay.marks.stroke_unit}" stroke-linejoin="round"/></svg>`;
}

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
  // 채움 막대(값이 바뀔 때만 200 ms 로 늘고 줆)
  if (dl.fillPct !== PS.fillTo) { PS.fillFrom = fillNow(); PS.fillTo = dl.fillPct; PS.fillT = clock; setText($('pFillPct'), `${dl.fillPct}%`); }
  if (init) { PS.fillFrom = PS.fillTo = dl.fillPct; PS.fillT = -1e9; setText($('pFillPct'), `${dl.fillPct}%`); }
  const lock = !!PS.doneAt;
  setAttr($('pUndo'), 'aria-disabled', lock || !(PS.g.undoStack.length || PS.g.resetUndo) ? 'true' : 'false');
  setAttr($('pRestart'), 'aria-disabled', lock || (PS.g.paths.every((p) => !p.length) && PS.g.moves === 0) ? 'true' : 'false');
  setAttr($('pHelp'), 'aria-disabled', lock ? 'true' : 'false');
  dirty = true;
  return dl;
}
function fillNow() { const u = RM() ? 1 : clamp01((clock - PS.fillT) / 200); return PS.fillFrom + (PS.fillTo - PS.fillFrom) * ease.out(u); }

// ---- 입력 (첫 손가락만, 이벤트 처리 안에서 판 상태를 바꾸고 다음 프레임에 그림)
function boardLocked() { return !PS || state !== 'play' || PS.doneAt != null || !!(PS.card && PS.card.closing == null) || !!(PS.trans && clock - PS.trans.t0 < 0); }
function onDown(px, py, id = 1) {
  wake();
  if (!PS || state !== 'play') return false;
  if (PS.card && PS.card.closing == null) { cardTap(); return false; }
  if (PS.drag || boardLocked()) return false;
  PS.lastPress = clock;
  stopFingers();
  const cell = B.pressHit(PS.pz, grid, px, py, D.bal.input.drag_start_extend_cells);
  if (cell < 0) return false;
  const d = B.press(PS.g, cell);
  if (!d) { emptyPress(); return false; }
  PS.drag = { d, id, cell, ev: 0, px, py, conn: {} };
  PS.cellsThisDrag = 0;
  PS.dragLog.push([cell]);
  const [hx, hy] = cc(cell); PS.head = { x: hx, y: hy, vx: 0, vy: 0 };
  const ep = PS.pz.epColor[cell];
  if (ep >= 0) PS.pop.set('dot' + cell, { t: clock, ms: D.lay.motion.grab.ms, peak: D.lay.motion.grab.dot_scale[1] });
  sfx('grab');
  dirty = true;
  return true;
}
function onMove(px, py, id = 1) {
  const dr = PS && PS.drag; if (!dr || dr.id !== id) return;
  dr.px = px; dr.py = py; dirty = true;
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
  PS.drag = null; PS.head = null;
  PS.lastRelease = clock;
  if (r.changed) boardChanged();
  syncPairs();
  return r;
}
function handleEvents() {
  const dr = PS.drag, d = dr.d, fx = D.bal.fx_ms, M = D.lay.motion;
  for (; dr.ev < d.events.length; dr.ev++) {
    const e = d.events[dr.ev];
    if (e.type === 'extend') { PS.cellsThisDrag++; PS.stepPop = clock; if (A) A.tick(PS.cellsThisDrag, clock); }
    else if (e.type === 'cut') {
      const Q0 = PS.g.paths[e.color], i = Q0.indexOf(e.cell);
      PS.ghosts.push({ kind: 'cut', t: clock, ms: fx.cut_fade_ms, c: e.color, cells: Q0.slice(Math.max(0, i - 1)) });
      sfx('cut');
    } else if (e.type === 'blocked') {
      // r2 H4: 튕겨 나옴 + bump(250 ms 안 반복은 건너뜀)
      if (!PS.bounce || clock - PS.bounce.t > M.blocked.repeat_guard_ms) {
        const [hx, hy] = cc(d.head), [bx, by] = cc(e.cell), L = Math.hypot(bx - hx, by - hy) || 1;
        PS.bounce = { t: clock, cell: e.cell, dir: [(bx - hx) / L, (by - hy) / L] };
        sfx(M.blocked.sound);
      }
    } else if (e.type === 'connect') onConnect(e);
  }
  const dl = syncPairs();
  if (PS.g.completed && PS.doneAt == null) onComplete(dl);
}
function onConnect(e) {
  const c = e.color, grade = e.previewGrade, pz = PS.pz, P = PS.drag.d.P, fx = D.bal.fx_ms, M = D.lay.motion;
  PS.ringAt = PS.ringAt || {}; PS.ringAt[c] = clock;
  const last = B.isComplete(pz, PS.drag.d.work);
  // r2 S13: 한 드래그 안에서 400 ms 안에 같은 쌍이 다시 닿으면 tint·고리만
  const prev = PS.drag.conn[c]; PS.drag.conn[c] = clock;
  if (prev != null && clock - prev < M.connect.repeat_guard.same_pair_same_drag_ms && !last) return;
  const dl = B.displayLayer(PS.g, PS.drag.d);
  const n = dl.pairDots.filter(Boolean).length;
  if (A) A.connect(grade, n);
  if (!last && S.vibrate) H.connect(clock);
  const ends = [pz.pairs[c].a, pz.pairs[c].b];
  const pop = fx.connect_pop_scale_by_grade[grade - 1];
  for (const cell of ends) PS.pop.set('dot' + cell, { t: clock, ms: fx.connect_pop_ms, peak: pop });
  if (!RM()) {
    const nP = fx.connect_particles_by_grade[grade - 1];
    for (const cell of ends) {
      for (let k = 0; k < nP; k++) PS.particles.push({ t: clock, ms: fx.connect_particles_ms, cell, a: (k / nP) * Math.PI * 2 + PS.rng() * 0.5, c, s: 0.08 + PS.rng() * 0.06, r: fx.connect_particles_radius_cells });
      PS.glows.push({ t: clock, cell, c });
    }
    PS.bands.push({ t: clock, ms: fx.connect_band_ms, c, cells: P.slice().reverse() });
  }
  PS.judge = { t: clock, grade, c, cell: e.cell };
  PS.lastConnect = clock;
  if (PS.tutTextOn) PS.tutTextOn = false;
}
function onComplete() {
  PS.doneAt = clock;
  const g = PS.g, lv = PS.lv, rec = ST.levelRec(S, lv.id);
  const pct = B.accuracyPct(g), star = B.isStar(g);
  const prevBest = rec.bestPct, firstDone = !rec.done;
  PS.result = { accuracyPct: pct, star, oneShotPairs: B.oneShotPairs(g), moves: g.moves, pairs: g.pz.k, newBest: prevBest != null && pct > prevBest, firstDone, oneShot: g.colorMoves.map((m) => m === 1) };
  rec.done = true; rec.star = rec.star || star; rec.bestPct = Math.max(prevBest ?? 0, pct); rec.bestFill = 100;
  ST.save(S);
  if (firstDone) mapAnim = { i: PS.i, t0: null };
  mapKey = '';
  // 색 물결 시작 칸 = 마지막 연결 칸
  PS.wave = { t: clock + 180, from: PS.judge ? PS.judge.cell : g.paths[0][0] };
  // 결과 미니 판 미리 래스터(1 s 뒤 씀)
  PS.resultSvg = miniBoardSVG(lv, g.paths, LY.result(VW, VH).mini_board.w, D.pal, (c) => PS.cols[c], { bg: PS.theme.top, lineW: D.lay.param.line_w_of_cell });
  svgImg(PS.resultSvg);
  syncPairs();
}
function boardChanged() {
  PS.lastChange = clock;
  PS.gap = null; PS.gapText = false;
  const rec = ST.levelRec(S, PS.lv.id), f = B.fillPct(PS.pz, PS.g.paths);
  if (!rec.done && f > rec.bestFill) { rec.bestFill = f; ST.save(S); mapKey = ''; }
}
function emptyPress() {
  // 빈칸을 눌렀을 때: 아직 안 이은 점들이 한 번 작게 숨 쉼("점에서 시작해요", 소리 없음, D4)
  PS.emptyPulse = clock;
  PS.pz.pairs.forEach((p, c) => { if (!PS.dots[c]) for (const cell of [p.a, p.b]) PS.pop.set('dot' + cell, { t: clock, ms: 250, peak: 1.08 }); });
  dirty = true;
}
function doUndo() {
  if (boardLocked() || PS.drag) return false;
  const before = PS.g.paths.map((p) => p.slice()), wasReset = !!PS.g.resetUndo;
  if (!B.undo(PS.g)) return false;
  if (wasReset) { PS.helpUsed = PS.helpUsedBeforeReset; } // 처음부터 취소 = 그 전 시도로(H2)
  PS.ghosts.push({ kind: 'fade', t: clock, ms: D.bal.fx_ms.undo_slide_ms, all: before });
  sfx('undo'); boardChanged(); syncPairs(); return true;
}
function doRestart() {
  if (boardLocked() || PS.drag) return false;
  const before = PS.g.paths.map((p) => p.slice());
  if (!B.resetBoard(PS.g)) return false;
  // H2: 새 시도 — 이동 수·판정 기록 0(board.mjs), 표시층도 처음으로
  PS.helpUsedBeforeReset = PS.helpUsed; PS.helpUsed = false; PS.judge = null;
  PS.ghosts.push({ kind: 'retract', t: clock, ms: D.bal.fx_ms.reset_clear_ms, all: before });
  sfx('restart'); boardChanged(); syncPairs(); return true;
}
function doHelp() {
  if (boardLocked() || PS.drag) return false;
  const sol = solutionPaths(PS.lv);
  const same = (p, q) => p.length === q.length && (p.every((v, i) => v === q[i]) || p.every((v, i) => v === q[q.length - 1 - i]));
  const c = sol.findIndex((s, c2) => !(B.isConnected(PS.pz, c2, PS.g.paths[c2]) && same(PS.g.paths[c2], s)));
  if (c < 0) return false;
  sfx('ui_tap');
  if (PS.tut) PS.tut.stopAt = clock - D.bal.tutorial.finger_exit_ms; // r2 S32: 시연 손가락은 바로 숨김
  PS.help = { start: clock + 100, cells: sol[c], loops: 1, stopAt: null };
  PS.helpUsed = true;
  dirty = true;
  return true;
}
function stopFingers() {
  const fade = D.bal.tutorial.finger_exit_ms;
  for (const k of ['tut', 'help']) { const f = PS[k]; if (!f || f.stopAt != null) continue; f.stopAt = clock >= f.start ? clock : clock - fade; }
}
function cardTap() {
  // 뜬 뒤 rule_card.ignore_tap_before_ms 안의 누름은 무시(판으로 가던 손)
  if (!PS || !PS.card || PS.card.closing != null) return;
  if (clock - PS.card.t < D.bal.rule_card.ignore_tap_before_ms) return;
  closeCard();
}
function closeCard() {
  if (PS && PS.card && PS.card.closing == null) {
    PS.card.closing = clock; $('pCard').classList.add('closing'); // 닫히기 시작한 프레임부터 판 누름은 판으로(S8)
    if (PS.tut) PS.tut.start = Math.max(PS.tut.start, clock + D.bal.tutorial.finger_start_delay_ms);
  }
}

// ---- 손가락 시연(balance.json tutorial)
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
function helpTrigger() { const v = (D.bal.help.moves_trigger_by_level || {})[PS.lv.id]; return v != null && !PS.helpUsed && PS.g.moves >= v; }
function updatePlay(dt) {
  if (!PS) return;
  const fx = D.bal.fx_ms, M = D.lay.motion, rc = D.bal.rule_card;
  // 그림 카드: 누르거나 auto_close_ms 뒤 닫힘(200 ms)
  if (PS.card) {
    if (PS.card.closing == null && clock - PS.card.t >= rc.auto_close_ms) closeCard();
    const vis = PS.card.closing != null ? 1 - clamp01((clock - PS.card.closing) / 200) : clamp01((clock - PS.card.t) / 200);
    setStyle($('pCard'), 'opacity', vis.toFixed(3)); setHidden($('pCard'), false);
    if (PS.card.closing == null && clock < PS.card.t) setStyle($('pCard'), 'opacity', '0');
    if (PS.card.closing != null && vis <= 0) { PS.card = null; setHidden($('pCard'), true); $('pCard').classList.remove('closing'); }
  } else setHidden($('pCard'), true);
  if (PS.tut && PS.tut.stopAt != null && PS.doneAt == null && !PS.drag && !PS.help && clock - Math.max(PS.lastChange, PS.lastPress) >= D.bal.tutorial.reshow_if_idle_s * 1000) PS.tut = { start: clock, cells: PS.tut.cells, stopAt: null };
  if (PS.help && !fingerAt(PS.help, clock) && clock > PS.help.start + 50) PS.help = null;
  // 도움 숨 쉼: 30 s 무변화 또는 이 시도 이동 수 ≥ 레벨 값(r2 S16)
  const hb = PS.doneAt == null && (clock - PS.lastChange >= D.bal.help.idle_s * 1000 || helpTrigger());
  const hs = hb && !RM() ? 1 + 0.06 * (0.5 - 0.5 * Math.cos(((clock % M.help.breathe_period_ms) / M.help.breathe_period_ms) * 2 * Math.PI)) : 1;
  setStyle($('pHelp'), 'transform', hs === 1 ? '' : `scale(${hs.toFixed(3)})`);
  setStyle($('pHelp'), 'borderColor', hb ? D.pal.common.nodeOpenEdge : '');
  // 빈칸 신호
  const allOn = PS.dots.every(Boolean) && !PS.drag && PS.doneAt == null;
  if (allOn && !PS.g.completed) {
    if (!PS.gap) PS.gap = { start: Math.max(PS.lastRelease + fx.empty_breath_start_after_release_ms, PS.lastConnect + fx.empty_breath_start_after_last_connect_ms), n: 0 };
    const per = fx.empty_breath_ms + fx.empty_breath_repeat_s * 1000;
    while (PS.gap.n < fx.empty_breath_max_times && clock >= PS.gap.start + PS.gap.n * per) {
      PS.gap.n++; sfx('gap_hint'); dirty = true;
      if (PS.gap.n === 1) { setText($('pLive'), ''); setText($('pLive'), T('gap_left')); }
      if (PS.gap.n === M.gap_hint.text_on_breath) PS.gapText = true;
    }
  } else if (PS.gap) { PS.gap = null; PS.gapText = false; }
  const judgeOn = PS.judge && clock - PS.judge.t < D.bal.judge.name_total_ms;
  let txt = '';
  if (PS.tutTextOn && PS.lv.tutorial && !PS.card) txt = T(PS.lv.tutorial.text_key);
  else if (PS.gapText && !judgeOn) txt = T(M.gap_hint.text_key);
  if (PL.text_slots.board_text.shared_with === 'judge' && judgeOn) txt = '';
  setText($('pText'), txt);
  // 선 머리 스프링(r2 motion.head)
  if (PS.head && PS.drag && PS.drag.d.started && !PS.drag.d.done) {
    const tgt = leadPoint(), sp = M.head.spring, cell = PL.cell;
    if (RM()) { PS.head.x = tgt[0]; PS.head.y = tgt[1]; }
    else for (let k = Math.max(1, Math.round(dt / 16.67)); k > 0; k--) {
      PS.head.vx = PS.head.vx * sp.damping + (tgt[0] - PS.head.x) * sp.stiffness; PS.head.vy = PS.head.vy * sp.damping + (tgt[1] - PS.head.y) * sp.stiffness;
      PS.head.x += PS.head.vx; PS.head.y += PS.head.vy;
      const dx = tgt[0] - PS.head.x, dy = tgt[1] - PS.head.y, dd = Math.hypot(dx, dy), lim = sp.max_lag_of_cell * cell;
      if (dd > lim) { PS.head.x = tgt[0] - (dx / dd) * lim; PS.head.y = tgt[1] - (dy / dd) * lim; }
    }
  }
  // 채움 막대
  const fv = fillNow(); setStyle($('pFillBar'), 'transform', `scaleX(${(fv / 100).toFixed(4)})`);
  // 판 완료 시간표
  if (PS.doneAt != null) {
    const t = clock - PS.doneAt;
    if (t >= D.bal.haptics_ms.complete_delay_ms && !PS.cSound) { PS.cSound = true; sfx('complete', { k: PS.pz.k }); if (S.vibrate) H.complete(clock); if (!RM()) PS.g.connectLog.forEach((cl, j) => PS.bands.push({ t: PS.doneAt + 150 + j * 80, ms: fx.connect_band_ms, c: cl.color, cells: PS.g.paths[cl.color].slice().reverse() })); }
    if (t >= 420 && !PS.cParts && !RM()) { PS.cParts = true; const own = B.ownerGrid(PS.pz, PS.g.paths), all = PS.g.paths.flat(); for (let k = 0; k < 12; k++) { const cell = all[Math.floor(PS.rng() * all.length)]; PS.particles.push({ t: clock, ms: 500, cell, rise: true, c: own[cell], s: 0.1 + PS.rng() * 0.05, dx: (PS.rng() - 0.5) * 0.4 }); } }
    if (t >= D.bal.complete.next_screen_after_s * 1000 && state === 'play') openResult();
  }
}
function leadPoint() {
  const dr = PS.drag, P = dr.d.P, cell = PL.cell;
  const [hx, hy] = cc(P[P.length - 1]);
  if (B.isConnected(PS.pz, dr.d.c, P)) return [hx, hy];
  const dx = dr.px - hx, dy = dr.py - hy, lim = D.lay.param.head_lead_of_cell * cell;
  return Math.abs(dx) >= Math.abs(dy) ? [hx + Math.max(-lim, Math.min(lim, dx)), hy] : [hx, hy + Math.max(-lim, Math.min(lim, dy))];
}

// ---- 그리기
function cc(i) { return [grid.originX + ((i % PS.lv.width) + 0.5) * grid.cellPx, grid.originY + (((i / PS.lv.width) | 0) + 0.5) * grid.cellPx]; }
function popScale(key) {
  const p = PS.pop.get(key); if (!p) return 1;
  const u = (clock - p.t) / p.ms; if (u >= 1) { PS.pop.delete(key); return 1; }
  if (RM()) return 1;
  return 1 + (p.peak - 1) * ease.bump(u);
}
let dirty = true, wasActive = false;
function playActive() {
  if (!PS) return false;
  const t = clock, M = D.lay.motion;
  return !!(PS.drag || PS.particles.length || PS.bands.length || PS.ghosts.length || PS.glows.length || PS.tintOff.length || PS.pop.size ||
    (PS.judge && t - PS.judge.t < D.bal.judge.name_total_ms + 20) || fingerAt(PS.tut, t) || fingerAt(PS.help, t) ||
    PS.tintOn.some((o) => o && t - o.t < 500) || (PS.gap && PS.gap.n > 0) || (PS.doneAt != null && t - PS.doneAt < 1300) ||
    (PS.trans && t - PS.trans.t0 < 320) || (PS.bounce && t - PS.bounce.t < M.blocked.ms + 20) || t - PS.stepPop < 120);
}
function drawPlay() {
  if (!PS || !PL) return;
  const L = PL, cell = L.cell, C = D.pal.common, M = D.lay.motion, fx = D.bal.fx_ms;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, VW, VH);
  ctx.save();
  // 레벨 전환(r2 level_transition): 미리 그린 판을 transform 으로만
  let ta = 1;
  if (PS.trans) {
    const tr = PS.trans, cx = L.board.x + L.board.w / 2, cy = L.board.y + L.board.h / 2;
    if (RM()) ta = clamp01((clock - tr.t0) / 150);
    else if (tr.kind === 'grow') { const u = ease.out(clamp01((clock - tr.t0) / M.level_transition.ms)), s = 0.2 + 0.8 * u; ctx.translate(tr.x + (cx - tr.x) * u, tr.y + (cy - tr.y) * u); ctx.scale(s, s); ctx.translate(-cx, -cy); ta = Math.min(1, 0.3 + u); }
    else if (tr.kind === 'next') { const u = ease.out(clamp01((clock - tr.t0) / 200)), s = 0.96 + 0.04 * u; ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); ta = Math.min(1, 0.2 + u); }
    if (clock - tr.t0 > M.level_transition.ms) PS.trans = null;
  }
  ctx.globalAlpha = ta;
  if (PS.doneAt != null && !RM()) {
    const u = (clock - PS.doneAt - 380) / 300;
    if (u > 0 && u < 1) { const s = 1 + (fx.complete_board_scale - 1) * ease.bump(u), cx = L.board.x + L.board.w / 2, cy = L.board.y + L.board.h / 2; ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); }
  }
  ctx.drawImage(boardCache.canvas, boardCache.x, boardCache.y, boardCache.w, boardCache.h);
  ctx.globalAlpha = 1;
  const paths = curPaths(), pz = PS.pz, ins = D.lay.param.tile_inset_of_cell * cell, tr = D.lay.param.tile_r_of_cell * cell;
  const tile = (i, color, a, scale = 1) => { const [x, y] = cc(i); const w = (cell - 2 * ins) * scale; ctx.globalAlpha = a * ta; ctx.fillStyle = color; ctx.beginPath(); rrect(ctx, x - w / 2, y - w / 2, w, w, tr * scale); ctx.fill(); ctx.globalAlpha = 1; };
  for (const off of PS.tintOff) { const u = (clock - off.t) / M.disconnect.ms; if (u >= 1) continue; for (const i of off.cells) if (!PS.dots[off.c] || !paths[off.c].includes(i)) tile(i, colorOf(off.c).tint, 1 - u); }
  PS.tintOff = PS.tintOff.filter((o) => clock - o.t < M.disconnect.ms);
  // tint(+ 판 완료 색 물결: 마지막 연결 칸에서 맨해튼 거리 × 45 ms, 1.06배·쌍 색 15 %)
  const W = PS.wave, wx = W ? W.from % PS.lv.width : 0, wy = W ? (W.from / PS.lv.width) | 0 : 0;
  paths.forEach((p, c) => {
    const on = PS.tintOn[c]; if (!on || !PS.dots[c]) return;
    const seq = p[p.length - 1] === on.end ? p.slice().reverse() : p, col = colorOf(c);
    seq.forEach((i, r) => {
      const a = RM() ? clamp01((clock - on.t) / 150) : clamp01((clock - on.t - (r / Math.max(1, seq.length - 1)) * M.connect.tint_ms * 0.6) / 120);
      let s = 1, colr = col.tint;
      if (W && !RM()) { const d = Math.abs((i % PS.lv.width) - wx) + Math.abs(((i / PS.lv.width) | 0) - wy), u = (clock - W.t - d * 45) / 120; if (u > 0 && u < 1) { const b = ease.bump(u); s = 1 + 0.06 * b; colr = mix(col.tint, col.hex, 0.15 * b); } }
      tile(i, colr, a, s);
    });
  });
  // 빈칸 숨 쉬기
  if (PS.gap) {
    const per = fx.empty_breath_ms + fx.empty_breath_repeat_s * 1000, k = PS.gap.n - 1, t = clock - (PS.gap.start + k * per);
    const dur = RM() ? 1200 : fx.empty_breath_ms;
    if (k >= 0 && t < dur) {
      const own = B.ownerGrid(pz, PS.g.paths), u = t / dur, b = RM() ? 1 : ease.bump(u), s = RM() ? 1 : 1 + (fx.empty_breath_scale - 1) * b;
      for (let i = 0; i < pz.n; i++) {
        if (pz.hole[i] || own[i] >= 0) continue;
        const [x, y] = cc(i), w = (cell - 2 * ins) * s;
        ctx.fillStyle = mix(C.tile, C.gapGlow, 0.25 * b); ctx.beginPath(); rrect(ctx, x - w / 2, y - w / 2, w, w, tr * s); ctx.fill();
        ctx.strokeStyle = C.gapGlow; ctx.lineWidth = M.gap_hint.glow_w_of_cell * cell; ctx.globalAlpha = RM() ? 1 : 0.5 + 0.5 * b; ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = C.tileDot; ctx.beginPath(); ctx.arc(x, y, (D.lay.param.tile_dot_of_cell * cell) / 2, 0, 7); ctx.fill();
      }
    }
  }
  // 잔상
  for (const gh of PS.ghosts) {
    const u = clamp01((clock - gh.t) / gh.ms);
    if (gh.kind === 'cut') strokePoly(ctx, gh.cells.map(cc), L.px.line_w * (1 - 0.5 * u), colorOf(gh.c).hex, 1 - u);
    else if (gh.kind === 'fade') gh.all.forEach((p, c) => { if (p.length > 1) strokePoly(ctx, p.map(cc), L.px.line_w, colorOf(c).hex, (1 - ease.out(u)) * 0.6); });
    else if (gh.kind === 'retract') gh.all.forEach((p, c) => { if (p.length > 1) strokePoly(ctx, subPolyline(p.map(cc), 0, 1 - ease.inout(u)), L.px.line_w, colorOf(c).hex, 1); });
  }
  PS.ghosts = PS.ghosts.filter((gh) => clock - gh.t < gh.ms);
  // 선(+ 머리 스프링·칸 진입 튐·막힘 튕김) + 연결된 선 가운데 흰 표지(r2 S27)
  const dr = PS.drag, bo = PS.bounce && clock - PS.bounce.t < M.blocked.ms ? PS.bounce : null;
  paths.forEach((p, c) => {
    let pts = p.map(cc);
    const dragging = dr && dr.d.started && !dr.d.done && dr.d.c === c;
    if (dragging && pts.length && !B.isConnected(pz, c, p)) {
      let hx = PS.head ? PS.head.x : pts[pts.length - 1][0], hy = PS.head ? PS.head.y : pts[pts.length - 1][1];
      if (bo && !RM()) { const u = (clock - bo.t) / M.blocked.head_back_ms, push = M.blocked.head_push_of_cell * cell * (u < 0.3 ? u / 0.3 : 1 - ease.spring((u - 0.3) / 0.7)); if (u < 1) { hx += bo.dir[0] * push; hy += bo.dir[1] * push; } }
      // 다른 색 점 칸 쪽으로는 머리(둥근 끝 포함)가 자기 칸 경계를 넘지 않게(r2 핫픽스, QA 이슈 4)
      { const hc = p[p.length - 1], [cx0, cy0] = pts[pts.length - 1], dx = hx - cx0, dy = hy - cy0, ax = Math.abs(dx) >= Math.abs(dy);
        const nx = (hc % PS.lv.width) + (ax ? Math.sign(dx) : 0), ny = ((hc / PS.lv.width) | 0) + (ax ? 0 : Math.sign(dy));
        const ni = nx >= 0 && ny >= 0 && nx < PS.lv.width && ny < PS.lv.height ? ny * PS.lv.width + nx : -1;
        if (ni >= 0 && pz.epColor[ni] >= 0 && pz.epColor[ni] !== c) { const lim = 0.5 * cell - L.px.line_w / 2; if (ax) hx = cx0 + Math.max(-lim, Math.min(lim, dx)); else hy = cy0 + Math.max(-lim, Math.min(lim, dy)); } }
      pts = pts.concat([[hx, hy]]);
    }
    if (pts.length > 1) strokePoly(ctx, pts, L.px.line_w, colorOf(c).hex, ta);
    if (dragging && !RM() && clock - PS.stepPop < M.head.step_pop.ms && pts.length) { const u = (clock - PS.stepPop) / M.head.step_pop.ms, [hx, hy] = pts[pts.length - 1]; ctx.fillStyle = colorOf(c).hex; ctx.beginPath(); ctx.arc(hx, hy, (L.px.line_w / 2) * (1 + (M.head.step_pop.scale_of_line[1] - 1) * ease.bump(u)), 0, 7); ctx.fill(); }
    if (PS.dots[c] && p.length >= 3) { const mid = p[Math.floor((p.length - 1) / 2)], [mx, my] = cc(mid), m = SP.lineMarks[c]; ctx.drawImage(m.c, mx - m.s / 2, my - m.s / 2, m.s, m.s); }
  });
  for (const bd of PS.bands) {
    const u = (clock - bd.t) / bd.ms; if (u < 0 || u >= 1) continue;
    const pts = bd.cells.map(cc), bl = M.connect.band_len_of_line, a = u * (1 + bl) - bl;
    strokePoly(ctx, subPolyline(pts, Math.max(0, a), Math.min(1, a + bl)), L.px.line_w * 0.5, mix(colorOf(bd.c).hex, '#FFFFFF', 0.45), 0.9);
  }
  PS.bands = PS.bands.filter((bd) => clock - bd.t < bd.ms);
  // 시연 유령 선(쌍 색 × 0.55, r2 S21)은 점 아래
  for (const f of [PS.tut, PS.help]) drawFinger(fingerAt(f, clock), 'ghost');
  // 빛 번짐(r2 juice.glow) — 미리 그린 방사형 비트맵
  const gl = M.connect.juice.glow;
  for (const g of PS.glows) { const u = (clock - g.t) / gl.ms; if (u >= 1) continue; const sp = SP.glows[g.c], s = 0.6 + 0.4 * ease.out(u), [x, y] = cc(g.cell), w = sp.s * s; ctx.globalAlpha = gl.max_alpha * (1 - u); ctx.drawImage(sp.c, x - w / 2, y - w / 2, w, w); ctx.globalAlpha = 1; }
  PS.glows = PS.glows.filter((g) => clock - g.t < gl.ms);
  // 점(비트맵) + 고리
  pz.pairs.forEach((p, c) => {
    const col = colorOf(c), sp = SP.dots[c];
    for (const cell0 of [p.a, p.b]) {
      let [x, y] = cc(cell0);
      if (bo && bo.cell === cell0) {
        const u = (clock - bo.t) / M.blocked.dot_nudge_ms;
        if (RM()) { const u2 = clamp01((clock - bo.t) / 120); ctx.strokeStyle = col.hex; ctx.globalAlpha = 0.5 * (1 - u2); ctx.lineWidth = L.px.ring_w * 1.5; ctx.beginPath(); ctx.arc(x, y, L.px.ring_d / 2, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
        else if (u < 1) { const n = M.blocked.dot_nudge_of_cell * cell * ease.bump(u); x += bo.dir[0] * n; y += bo.dir[1] * n; }
      }
      const s = popScale('dot' + cell0);
      if (PS.dots[c]) {
        const ru = RM() ? 1 : clamp01((clock - ((PS.ringAt || {})[c] ?? -1e9)) / M.connect.ring_ms);
        ctx.strokeStyle = col.hex; ctx.lineWidth = L.px.ring_w; ctx.globalAlpha = ta; ctx.beginPath(); ctx.arc(x, y, (L.px.ring_d / 2) * (0.85 + 0.15 * ru) * s, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
      }
      const w = sp.s * s; ctx.globalAlpha = ta; ctx.drawImage(sp.c, x - w / 2, y - w / 2, w, w); ctx.globalAlpha = 1;
    }
  });
  // 조각(미리 그린 원 비트맵)
  for (const pt of PS.particles) {
    const u = (clock - pt.t) / pt.ms; if (u < 0 || u >= 1) continue;
    const [x, y] = cc(pt.cell); let X, Y;
    if (pt.rise) { X = x + pt.dx * cell * u; Y = y - 0.8 * cell * ease.out(u); }
    else { const r = pt.r * cell * 0.5 * (0.6 + 0.4 * ease.out(u)) + (L.px.dot_d / 2) * (1 - u) * 0.6; X = x + Math.cos(pt.a) * r * (0.3 + ease.out(u)); Y = y + Math.sin(pt.a) * r * (0.3 + ease.out(u)); }
    const sp = SP.bits[pt.c], w = Math.max(1, (pt.s / 0.08) * sp.s * 0.5 * (1 - 0.6 * u)); ctx.globalAlpha = 1 - u; ctx.drawImage(sp.c, X - w / 2, Y - w / 2, w, w); ctx.globalAlpha = 1;
  }
  PS.particles = PS.particles.filter((pt) => clock - pt.t < pt.ms);
  ctx.restore();
  for (const f of [PS.tut, PS.help]) drawFinger(fingerAt(f, clock), 'hand');
  drawJudge();
}
function drawFinger(F, part) {
  if (!F || F.alpha <= 0) return;
  const cell = PL.cell, lineW = PL.px.line_w, n = F.cells.length;
  const at = (pos) => { const i0 = Math.max(0, Math.floor(pos)), u = Math.max(0, pos - i0), a = cc(F.cells[Math.min(i0, n - 1)]), b = cc(F.cells[Math.min(i0 + 1, n - 1)]); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; };
  const c = PS.pz.epColor[F.cells[0]] >= 0 ? PS.pz.epColor[F.cells[0]] : 0, col = colorOf(c), gr = D.lay.motion.tutorial.ghost_r2;
  ctx.save(); ctx.globalAlpha = F.alpha;
  if (part === 'ghost') {
    if (F.pos > 0) { const i0 = Math.floor(F.pos), pts = F.cells.slice(0, i0 + 1).map(cc); pts.push(at(F.pos)); strokePoly(ctx, pts, lineW * gr.width_of_line, col.hex, gr.alpha * F.alpha); }
    if (F.end !== false && F.end > 0 && !RM()) { const [x, y] = cc(F.cells[n - 1]), sp = SP.bits[c]; for (let k = 0; k < 6; k++) { const ang = (k / 6) * Math.PI * 2, r = cell * 0.45 * ease.out(F.end); ctx.globalAlpha = F.alpha * (1 - F.end); ctx.drawImage(sp.c, x + Math.cos(ang) * r - sp.s / 3, y + Math.sin(ang) * r - sp.s / 3, sp.s / 1.5, sp.s / 1.5); } }
    ctx.restore(); return;
  }
  if (F.press > 0) { const [x, y] = cc(F.cells[0]); ctx.strokeStyle = col.hex; ctx.globalAlpha = F.alpha * 0.5 * F.press; ctx.lineWidth = PL.px.ring_w * 1.5; ctx.beginPath(); ctx.arc(x, y, (PL.px.ring_d / 2) * (1 + 0.1 * F.press), 0, 7); ctx.stroke(); ctx.globalAlpha = F.alpha; }
  const tip = at(F.pos - (F.pos > 0 ? gr.finger_lag_of_cell : 0));
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
  const L = PL, jd = L.judge, [dx, dy] = cc(J.cell);
  let cx, top;
  if (jd.rule === 'portrait_band') { cx = Math.max(jd.x_min + jd.w / 2, Math.min(jd.x_max - jd.w / 2, dx)); top = jd.y; }
  else { const x = J.cell % PS.lv.width, side = 2 * x + 1 < PS.lv.width ? jd.left : jd.right; cx = side.cx; top = Math.max(side.y_min, Math.min(side.y_max, dy - jd.h / 2)); }
  const sp = judgeSprite(J.c, J.grade - 1);
  const sc = RM() ? 1 : 1 + (jb.name_pop_scale - 1) * ease.bump(clamp01(t / jb.name_pop_ms));
  const rise = RM() ? 0 : D.lay.motion.connect.judge.rise_px * (1 - clamp01(t / jb.name_pop_ms));
  const cy = top + jd.h - sp.h / 2 + rise;
  ctx.globalAlpha = fa; ctx.drawImage(sp.c, cx - (sp.w * sc) / 2, cy - (sp.h * sc) / 2, sp.w * sc, sp.h * sc); ctx.globalAlpha = 1;
}
function rowFrame() {
  [...$('pPairs').children].forEach((sp, c) => { const s = popScale('row' + c); setStyle(sp, 'transform', s === 1 ? '' : `scale(${s.toFixed(3)})`); });
}

// ---------------------------------------------------------------- 결과 (r2 H3: 쌍 점 줄 꽉 찬/속 빈 + %, 순서 연출)
let RL = null;
function openResult() {
  const R = PS.result, lv = PS.lv;
  show('result');
  PS.resultAt = clock; PS.rs = {};
  $('rName').innerHTML = '<b></b>'; setText($('rName').firstChild, T(lv.name_key));
  const last = PS.i === D.levels.length - 1, chEnd = !last && lv.order % D.bal.chapters.size === 0;
  const titleKey = last ? 'clear_last' : chEnd ? 'clear_chapter' : R.star ? 'clear_star' : `clear_title_${((lv.order - 1) % 3) + 1}`;
  setText($('rTitle'), T(titleKey));
  const rs = $('rStar'); rs.textContent = ''; rs.appendChild(svgImgEl(icon(R.star ? 'star' : 'star_empty')));
  rs.setAttribute('aria-label', T('result_star')); setHidden(rs, !R.star && false);
  if (!R.star) { rs.removeAttribute('role'); rs.removeAttribute('aria-label'); rs.setAttribute('aria-hidden', 'true'); } else { rs.setAttribute('role', 'img'); rs.removeAttribute('aria-hidden'); }
  const rd = $('rDots'); rd.textContent = '';
  R.oneShot.forEach((f, c) => { const sp = document.createElement('span'); sp.appendChild(svgImgEl(f ? PS.dotSvgs[c].full : PS.dotSvgs[c].hollow)); rd.appendChild(sp); });
  rd.setAttribute('aria-valuemax', String(R.pairs)); rd.setAttribute('aria-valuenow', String(R.oneShotPairs)); rd.setAttribute('aria-valuetext', String(R.oneShotPairs));
  setAttr($('rPct'), 'aria-valuenow', String(R.accuracyPct)); setAttr($('rPct'), 'aria-valuetext', `${R.accuracyPct}%`);
  $('rBest').textContent = ''; $('rBest').appendChild(svgImgEl(icon('new_best'))); $('rBest').setAttribute('aria-label', T('result_new_best')); setHidden($('rBest'), true);
  setHidden($('rNext'), last);
  idle(() => prewarmCard(PS.i + 1));
  layoutResult();
  resultFrame();
}
function layoutResult() {
  if (!PS || !PS.result) return;
  const L = (RL = LY.result(VW, VH)), lv = PS.lv;
  const ln = L.level_name; place($('rName'), ln); setStyle($('rName'), 'fontSize', ln.font_px + 'px');
  const band = $('rName').firstChild; if (band) { setStyle(band, 'background', PS.theme.top); setStyle(band, 'padding', `0 ${Math.round(12 * L.k)}px`); setStyle(band, 'lineHeight', (ln.h - 3) + 'px'); }
  slot($('rTitle'), L.title); setStyle($('rTitle'), 'fontWeight', '800');
  const mb = L.mini_board, rb = $('rBoard'); place(rb, mb);
  rb.textContent = ''; rb.appendChild(svgImgEl(PS.resultSvg || miniBoardSVG(lv, PS.g.paths, mb.w, D.pal, (c) => PS.cols[c], { bg: PS.theme.top })));
  const chk = document.createElement('span'); chk.className = 'chk'; chk.setAttribute('role', 'img'); chk.setAttribute('aria-label', T('result_check')); chk.appendChild(svgImgEl(icon('filled'))); rb.appendChild(chk);
  place($('rStar'), L.star);
  const pd = L.pair_dots, n = PS.result.pairs; place($('rDots'), pd);
  [...$('rDots').children].forEach((sp, c) => { const x = pd.w / 2 + (c - (n - 1) / 2) * pd.pitch - pd.d / 2; place(sp, { x: Math.round(x), y: 0, w: pd.d, h: pd.d }); });
  const pc = L.pct; place($('rPct'), pc); setStyle($('rPct'), 'fontSize', pc.font_px + 'px');
  place($('rBest'), L.new_best);
  place($('rMap'), L.buttons.map); place($('rNext'), L.buttons.next); place($('rAgain'), L.buttons.again);
}
function resultFrame() {
  const t = clock - PS.resultAt, R = PS.result, Mo = D.lay.motion, st = Mo.result, rs = PS.rs;
  const slide = RM() ? 1 : ease.out(clamp01(t / 280));
  setStyle($('result'), 'transform', slide >= 1 ? '' : `translateY(${((1 - slide) * VH).toFixed(1)}px)`);
  const n = R.pairs, dotsEnd = 300 + 80 * (n - 1) + 180;
  [...$('rDots').children].forEach((sp, c) => {
    const u = clamp01((t - 300 - 80 * c) / 180);
    const s = RM() ? (t >= 300 ? 1 : 0) : u <= 0 ? 0 : u < 0.6 ? (u / 0.6) * 1.15 : 1.15 - 0.15 * ((u - 0.6) / 0.4);
    setStyle(sp, 'transform', s >= 1 && u >= 1 ? '' : `scale(${s.toFixed(3)})`);
    if (u > 0 && !rs['d' + c]) { rs['d' + c] = 1; if (R.oneShot[c]) sfx('connect_g3', { pitch: D.snd.ladder_hz[Math.min(c, D.snd.ladder_hz.length - 1)], db: -6 }); }
  });
  const pu = RM() ? 1 : clamp01((t - dotsEnd - 120) / st.pct_count_ms);
  setText($('rPct').lastChild, `${Math.floor(R.accuracyPct * pu)}%`);
  const su = clamp01((t - dotsEnd - 200) / st.star_ms);
  if (R.star) {
    const s = RM() ? (su > 0 ? 1 : 0) : su < 0.6 ? (su / 0.6) * st.star_scale[1] : st.star_scale[1] + (1 - st.star_scale[1]) * ((su - 0.6) / 0.4);
    setStyle($('rStar'), 'transform', `scale(${s.toFixed(3)})`); setStyle($('rStar'), 'opacity', '');
    if (su > 0 && !rs.star) { rs.star = 1; sfx(st.sound_star); if (S.vibrate) H.star(clock); }
  } else { setStyle($('rStar'), 'transform', ''); setStyle($('rStar'), 'opacity', '0.6'); }
  if (R.newBest) { const u = RM() ? (pu >= 1 ? 1 : 0) : clamp01((t - dotsEnd - 120 - st.pct_count_ms) / 200); setHidden($('rBest'), u <= 0); setStyle($('rBest'), 'opacity', u.toFixed(2)); }
}
function resultAccepts() { return PS && PS.doneAt != null && clock - PS.doneAt >= D.bal.complete.result_buttons_after_ms; }

// ---------------------------------------------------------------- 보호자 (r2 S6 스크롤 표시)
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
  const sh = L.scroll_hint, gh = $('gHint');
  setStyle(gh, 'height', (sh.fade_px + sh.chevron_px) + 'px'); const ch = gh.firstChild; setStyle(ch, 'width', Math.round(sh.chevron_px * 0.6) + 'px'); setStyle(ch, 'height', Math.round(sh.chevron_px * 0.6) + 'px');
  guardianHint();
}
function guardianHint() { const s = $('gScroll'); setHidden($('gHint'), !(s.scrollHeight - s.clientHeight - s.scrollTop > 4)); }

// ---------------------------------------------------------------- 이벤트 연결
function wire() {
  $('title').addEventListener('pointerdown', (e) => {
    if (e.target.closest('#tSound') || state !== 'title') return;
    // r2 S2: 지도 그리기와 오디오 잠금 해제를 다른 프레임으로
    show('map');
    wake(); // 오디오 컨텍스트 만들기는 지도를 그린 프레임 다음 작업으로(누른 프레임과 나눔)
  });
  $('tSound').addEventListener('click', toggleSound); $('mSound').addEventListener('click', toggleSound);
  $('mNodes').addEventListener('click', (e) => {
    const b = e.target.closest('.node'); if (!b || state !== 'map') return;
    wake();
    const i = +b.dataset.i;
    if (b.dataset.state === 'locked') { b._shake = clock; return; } // r2 S30: 살짝 흔들림, 소리 없음
    sfx('ui_tap');
    const r = b.getBoundingClientRect();
    startLevel(i, { kind: 'grow', t0: clock, x: r.left + r.width / 2, y: r.top + r.height / 2 }, true);
  });
  $('mPrev').addEventListener('click', () => turnPage(mapPage - 1)); $('mNext').addEventListener('click', () => turnPage(mapPage + 1));
  // 장 점 줄 = 누름 자리 한 덩어리(112×48 이상): 누른 x 에 가장 가까운 점의 장으로(r2 핫픽스, QA 이슈 3). 점 탭 버튼은 키보드·낭독용
  $('mTabs').addEventListener('click', (e) => {
    if (e.detail === 0) { const b = e.target.closest('button'); if (b) turnPage(+b.dataset.page); return; } // 키보드
    const r = $('mTabs').getBoundingClientRect(), d = mapL.pager.dots, x = e.clientX - (d.x - d.hit.x) - r.left;
    turnPage(Math.max(0, Math.min(D.chapters.length - 1, Math.round((x - d.d / 2) / d.pitch))));
  });
  $('mTabs').addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') turnPage(mapPage + 1); if (e.key === 'ArrowLeft') turnPage(mapPage - 1); });
  let sw = null;
  $('map').addEventListener('pointerdown', (e) => { sw = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  $('map').addEventListener('pointerup', (e) => {
    if (!sw || !mapL) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y, dt = performance.now() - sw.t, s = mapL.pager.swipe; sw = null;
    if (Math.abs(dx) >= s.min_px && Math.abs(dx) > Math.abs(dy) * 1.5 && dt <= s.max_ms) turnPage(mapPage + (dx < 0 ? 1 : -1));
  });
  const gear = $('mGear');
  const hs = (e) => { if (e) e.preventDefault(); gearHold = clock || 1e-6; };
  const he = () => { gearHold = 0; gear.style.setProperty('--p', '0'); };
  gear.addEventListener('pointerdown', (e) => { e.stopPropagation(); hs(e); }); gear.addEventListener('pointerup', he); gear.addEventListener('pointerleave', he); gear.addEventListener('pointercancel', he);
  gear.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) hs(e); });
  gear.addEventListener('keyup', he);
  gear.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('pointerdown', (e) => {
    if (PS && PS.drag) return; // 두 번째 손가락 무시
    if (onDown(e.clientX, e.clientY, e.pointerId)) { try { cv.setPointerCapture(e.pointerId); } catch {} }
  });
  cv.addEventListener('pointermove', (e) => { if (PS && PS.drag && PS.drag.id === e.pointerId) { const list = e.getCoalescedEvents ? e.getCoalescedEvents() : null; if (list && list.length) for (const ce of list) onMove(ce.clientX, ce.clientY, e.pointerId); else onMove(e.clientX, e.clientY, e.pointerId); } });
  const up = (e) => onUp(e.pointerId);
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('lostpointercapture', up);
  $('pCard').addEventListener('pointerdown', () => cardTap());
  $('pMap').addEventListener('click', () => { if (state !== 'play' || (PS && PS.doneAt != null)) return; sfx('ui_tap'); show('map'); });
  $('pUndo').addEventListener('click', doUndo); $('pRestart').addEventListener('click', doRestart); $('pHelp').addEventListener('click', doHelp);
  const rb = (fn) => () => { if (state !== 'result' || !resultAccepts()) return; sfx('ui_tap'); fn(); };
  $('rMap').addEventListener('click', rb(() => goMapAfter()));
  $('rNext').addEventListener('click', rb(() => (PS.i + 1 < D.levels.length ? startLevel(PS.i + 1, { kind: 'next', t0: clock }, true) : goMapAfter())));
  $('rAgain').addEventListener('click', rb(() => startLevel(PS.i, { kind: 'next', t0: clock }, true)));
  $('gClose').addEventListener('click', () => { sfx('ui_tap'); $('gConfirm').hidden = true; show('map'); });
  $('gScroll').addEventListener('scroll', guardianHint, { passive: true });
  $('gCol').addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.classList.contains('tog')) {
      const k = t.dataset.k;
      if (k === 'settings_sound') { S.sound = !S.sound; if (A) { wake(); A.setEnabled(S.sound); } soundBtns(); }
      if (k === 'settings_vibrate') { S.vibrate = !S.vibrate; H.enabled = S.vibrate; }
      if (k === 'settings_motion') S.motion = !S.motion;
      ST.save(S); t.setAttribute('aria-checked', String(k === 'settings_sound' ? S.sound : k === 'settings_vibrate' ? S.vibrate : S.motion));
    } else if (t.dataset.lang) { lang = t.dataset.lang; S.lang = lang; ST.save(S); applyLang(); buildGuardian(); }
    else if (t.id === 'gReset') { $('gConfirm').hidden = false; $('gNo').focus(); }
  });
  $('gNo').addEventListener('click', () => { $('gConfirm').hidden = true; });
  $('gYes').addEventListener('click', () => { ST.clearProgress(S); mapAnim = null; mapKey = ''; mapPage = 0; $('gConfirm').hidden = true; });
  window.addEventListener('resize', () => relayout());
  document.addEventListener('visibilitychange', () => { if (!A) return; if (document.hidden) A.pause(); else A.resume(); });
}
function goMapAfter() { mapPage = defaultPage(); mapKey = ''; if (mapAnim && mapAnim.t0 == null) mapAnim.t0 = clock; show('map'); }

// ---------------------------------------------------------------- 루프 (바뀐 것이 없으면 그리지 않음)
let last = 0;
function frame(now) {
  requestAnimationFrame(frame); // 먼저 다음 프레임을 걸어 둠 — 한 프레임 예외로 루프가 끊기지 않게(r2 핫픽스)
  try { frameBody(now); } catch (e) { console.error(e); }
}
function frameBody(now) {
  const dt = Math.min(100, last ? now - last : 16.7); last = now;
  if (!TEST && !document.hidden) advance(dt);
  render();
}
function advance(dt) {
  clock += dt;
  if (state === 'play' || state === 'result') updatePlay(dt);
}
function render() {
  applyTrans();
  if (state === 'title') { const p = RM() ? 1 : 0.55 + 0.45 * (0.5 + 0.5 * Math.cos(((clock % 1600) / 1600) * 2 * Math.PI)); setStyle($('tTap'), 'opacity', p.toFixed(2)); drawHero(); }
  if (state === 'map') mapFrame();
  if (state === 'play' || state === 'result') {
    const act = playActive();
    if (dirty || act || wasActive) { drawPlay(); dirty = false; }
    wasActive = act;
    rowFrame();
  }
  if (state === 'result' && PS && PS.result) resultFrame();
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
  get mapPage() { return mapPage; },
  loadLevel(i) { startLevel(i); return true; },
  openLevel(i) { startLevel(i, { kind: 'grow', t0: clock, x: VW / 2, y: VH / 2 }, true); return true; }, // 화면 버튼과 같은 두 프레임 경로
  step(dt) { let left = dt; while (left > 0) { const s = Math.min(16.667, left); advance(s); render(); left -= s; } return state; },
  get board() {
    if (!PS) return null;
    const dl = B.displayLayer(PS.g);
    return { id: PS.lv.id, W: PS.lv.width, H: PS.lv.height, holes: PS.lv.holes, paths: PS.g.paths.map((p) => p.map(toXY)), pairDots: dl.pairDots, fillPct: dl.fillPct, completed: PS.g.completed, locked: boardLocked(), card: !!PS.card, tutorial: !!(PS.tut && fingerAt(PS.tut, clock)), gap: PS.gap ? PS.gap.n : 0, text: $('pText').textContent, helpBreath: $('pHelp').style.borderColor !== '', colors: PS.cols.map((c) => c.key) };
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
  get judge() { return PS && PS.judge ? { grade: PS.judge.grade, color: PS.judge.c, age: clock - PS.judge.t } : null; },
  get layout() { return { play: PL, result: RL, map: mapL, grid }; },
  get coreVersion() { return B.CORE_VERSION; },
  get audioState() { return A && A.ctx ? A.ctx.state : 'none'; },
  get store() { return JSON.parse(JSON.stringify(S)); },
  toTitle() { show('title'); }, toMap(p) { mapPage = p ?? defaultPage(); mapKey = ''; show('map'); }, toGuardian() { show('guardian'); },
  turnPage(p) { turnPage(p); return mapPage; },
  closeCard() { closeCard(); return true; }, undo: () => doUndo(), restart: () => doRestart(), help: () => doHelp(),
  resultNext() { if (state === 'result' && resultAccepts()) { $('rNext').click(); return true; } return false; },
  setLang(l) { lang = l; applyLang(); relayout(); },
  clearProgress() { ST.clearProgress(S); mapKey = ''; mapAnim = null; },
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
  LY = makeLayout(D.str, D.bal.rule_card.auto_close_ms);
  A = new Audio(D.snd); A.enabled = !!S.sound;
  if (TEST) A.unlock = () => {};
  H = new Haptics(D.snd.haptics, TEST); H.enabled = !!S.vibrate;
  applyLang();
  wire();
  mapPage = defaultPage();
  show('title');
  api.ready = true;
  requestAnimationFrame(frame);
  // 부팅 유휴 시간: 지도 첫 페이지·이웃·아이콘·카드 그림 미리 래스터(render.map_first·svg_raster)
  // 유휴 줄: 전환·드래그·연출 중이 아니고 화면이 바뀐 지 400 ms 넘었을 때만, 한 프레임에 한 일(render.idle)
  // 플레이 중에는 3 s 동안 누름이 없을 때만(드래그 사이에 긴 프레임을 만들지 않음)
  setIdleGate(() => !!trans || !!pageTurn || performance.now() - lastScreenAt < 400 || !!(PS && (PS.drag || PS.trans || (PS.doneAt != null && clock - PS.doneAt < 1600))) || (state === 'play' && PS && clock - Math.max(PS.lastPress, PS.t0) < 3000));
  idle(() => prewarmPage(mapPage)); idle(() => prewarmPage(mapPage + 1));
  for (const n of ['star', 'star_empty', 'new_best', 'filled']) idle(() => svgImg(icon(n)));
  // 캔버스 글꼴(판정 이름) 첫 사용 비용을 부팅 때 미리 치름
  for (const k of D.bal.judge.name_keys) textSprite(T(k), 38, FONT, '#000000', '#FFFFFF', 1, null);
})();
