#!/usr/bin/env node
// flow-01 튜토리얼 그림 생성 + 검사 (art-director, 1-2 2차). 그림은 levels/*.json 을 읽어 만듭니다(손으로 그린 판 없음).
//   node assets/check/tutorial.mjs           검사만: ① 카드 = 레벨 첫 등장(데이터) ② 디스크 그림 = 지금 레벨 데이터로 다시 만든 그림(바이트 같음)
//   node assets/check/tutorial.mjs --write   tutorial/*.svg + mockups/board-lNN.svg(구멍 있는 레벨) 다시 쓰고 검사
// balance 가 레벨을 다시 고르면 --write 한 번이면 그림이 맞춰집니다. 칸 좌표 = 레벨 JSON [x, y](x 열, y 행, 위가 0).
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARKS, MARK_STROKE_UNIT, FINGER } from './shapes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const A = resolve(HERE, '..'), ROOT = resolve(A, '..');
const PAL = JSON.parse(readFileSync(join(A, 'palette.json'), 'utf8'));
const C = PAL.common, PAIRS = PAL.pairs;
const LINE = 0.60, DOT = 0.74, MARK = 0.46, RING = 0.86, RING_W = 0.05, TILE_IN = 0.05, TILE_R = 0.22, PAD = 0.06, BOARD_R = 0.30, TILE_DOT = 0.07;
const CUT_FADE = 0.12; // 잘라 보기: 잘린 쪽으로 판이 이만큼(칸) 더 이어지다 바탕으로 흐려짐(둘레 선 없음)
const f = (n) => +(+n).toFixed(2);
const key = ([x, y]) => x + ',' + y;

export function loadLevels(dir = join(ROOT, 'levels')) {
  return readdirSync(dir).filter((n) => n.endsWith('.json')).map((n) => ({ file: n, ...JSON.parse(readFileSync(join(dir, n), 'utf8')) })).sort((a, b) => a.order - b.order);
}
const themeOf = (lv) => PAL.themes[`level${String(lv.order).padStart(2, '0')}`];
const pathOf = (lv, id) => lv.solution.find((s) => s.id === id).path;
const slotOf = (lv, id) => lv.pairs.find((p) => p.id === id).color_slot;

// ---------- 판 그리기 ----------
// win = {x0,y0,w,h} 보이는 칸 범위. state: lines {pairId: [[x,y]..]}, tint {pairId: cells}, connected Set, glow [cells], ghost {pairId, cells}
function drawBoard(lv, ox, oy, cell, win, state = {}, uid = 'b') {
  const th = themeOf(lv), bgc = th.top, W = lv.width, H = lv.height;
  const real = { l: win.x0 === 0, t: win.y0 === 0, r: win.x0 + win.w === W, b: win.y0 + win.h === H };
  const ext = (side) => (real[side] ? PAD : CUT_FADE) * cell;
  const gx = ox + ext('l'), gy = oy + ext('t');
  const bw = win.w * cell + ext('l') + ext('r'), bh = win.h * cell + ext('t') + ext('b');
  const px = (x) => gx + (x - win.x0) * cell, py = (y) => gy + (y - win.y0) * cell;
  const cx = (x) => px(x) + cell / 2, cy = (y) => py(y) + cell / 2;
  const holes = new Set(lv.holes.map(key));
  // 보이는 칸: 창 안 + 잘린 쪽으로 한 줄(흐려지는 부분)
  const vx0 = Math.max(0, win.x0 - (real.l ? 0 : 1)), vx1 = Math.min(W - 1, win.x0 + win.w - (real.r ? 1 : 0));
  const vy0 = Math.max(0, win.y0 - (real.t ? 0 : 1)), vy1 = Math.min(H - 1, win.y0 + win.h - (real.b ? 1 : 0));
  const clip = `${uid}c`;
  let s = `<clipPath id="${clip}"><rect x="${f(ox - 1)}" y="${f(oy - 1)}" width="${f(bw + 2)}" height="${f(bh + 2)}" rx="${f(cell * BOARD_R + 1)}"/></clipPath>`;
  s += `<rect x="${f(ox)}" y="${f(oy)}" width="${f(bw)}" height="${f(bh)}" rx="${f(cell * BOARD_R)}" fill="${C.board}" stroke="${C.boardEdge}" stroke-width="1.5"/>`;
  s += `<g clip-path="url(#${clip})">`;
  const T = new Map(); for (const [id, cells] of Object.entries(state.tint || {})) for (const c of cells) T.set(key(c), slotOf(lv, id));
  const G = new Set((state.glow || []).map(key));
  for (let y = vy0; y <= vy1; y++) for (let x = vx0; x <= vx1; x++) {
    if (holes.has(key([x, y]))) {
      // 구멍 규칙(layout.json hole_rule): 판 안 = 도려냄 + 둘레 선 / 판 둘레에 닿으면 그쪽 판 여백까지 외곽선을 오목하게 파냄
      const e = { l: x === 0, t: y === 0, r: x === W - 1, b: y === H - 1 }, out = cell * (PAD + TILE_R) + 3, hi = cell * 0.02;
      const x0 = px(x) + (e.l ? -out : hi), y0 = py(y) + (e.t ? -out : hi), x1 = px(x) + cell + (e.r ? out : -hi), y1 = py(y) + cell + (e.b ? out : -hi);
      s += `<rect x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}" rx="${f(cell * TILE_R)}" fill="${bgc}" stroke="${C.boardEdge}" stroke-width="1.5"/>`;
      continue;
    }
    const p = T.get(key([x, y])), ti = cell * TILE_IN;
    if (G.has(key([x, y]))) s += `<rect x="${f(px(x) + ti / 2)}" y="${f(py(y) + ti / 2)}" width="${f(cell - ti)}" height="${f(cell - ti)}" rx="${f(cell * TILE_R)}" fill="none" stroke="${C.gapGlow}" stroke-width="${f(cell * 0.08)}"/>`;
    s += `<rect x="${f(px(x) + ti)}" y="${f(py(y) + ti)}" width="${f(cell - 2 * ti)}" height="${f(cell - 2 * ti)}" rx="${f(cell * TILE_R)}" fill="${p === undefined ? C.tile : PAIRS[p].tint}"/>`;
    if (p === undefined) s += `<circle cx="${f(cx(x))}" cy="${f(cy(y))}" r="${f(cell * TILE_DOT / 2)}" fill="${C.tileDot}"/>`;
  }
  const poly = (cells, color, w) => `<polyline points="${cells.map(([x, y]) => `${f(cx(x))},${f(cy(y))}`).join(' ')}" fill="none" stroke="${color}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  for (const [id, cells] of Object.entries(state.lines || {})) s += poly(cells, PAIRS[slotOf(lv, id)].hex, cell * LINE);
  if (state.ghost && state.ghost.cells.length > 1) s += poly(state.ghost.cells, PAIRS[slotOf(lv, state.ghost.id)].tint, cell * LINE * 0.6);
  const vis = ([x, y]) => x >= vx0 && x <= vx1 && y >= vy0 && y <= vy1;
  for (const p of lv.pairs) for (const e of [p.a, p.b]) if (vis(e)) s += dot(cx(e[0]), cy(e[1]), cell, p.color_slot, state.connected?.has(p.id));
  s += '</g>';
  // 잘린 쪽 흐려짐(바탕색으로)
  for (const side of ['l', 't', 'r', 'b']) {
    if (real[side]) continue;
    const gid = `${uid}f${side}`, d = CUT_FADE * cell + 2;
    const [x1, y1, x2, y2] = { l: [1, 0, 0, 0], r: [0, 0, 1, 0], t: [0, 1, 0, 0], b: [0, 0, 0, 1] }[side];
    const r = { l: [ox - 2, oy - 2, d, bh + 4], r: [ox + bw - d + 2, oy - 2, d, bh + 4], t: [ox - 2, oy - 2, bw + 4, d], b: [ox - 2, oy + bh - d + 2, bw + 4, d] }[side];
    s += `<linearGradient id="${gid}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${bgc}" stop-opacity="0"/><stop offset="1" stop-color="${bgc}"/></linearGradient><rect x="${f(r[0])}" y="${f(r[1])}" width="${f(r[2])}" height="${f(r[3])}" fill="url(#${gid})"/>`;
  }
  return { s, cx, cy, w: bw, h: bh };
}
const mark = (x, y, size, m) => `<path d="${MARKS[m]}" transform="translate(${f(x)} ${f(y)}) scale(${+(size / 2).toFixed(3)})" fill="${C.white}" stroke="${C.white}" stroke-width="${MARK_STROKE_UNIT}" stroke-linejoin="round"/>`;
function dot(x, y, cell, slot, ring) {
  const pr = PAIRS[slot]; let s = '';
  if (ring) s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f((cell * RING) / 2)}" fill="none" stroke="${pr.hex}" stroke-width="${f(cell * RING_W)}"/>`;
  return s + `<circle cx="${f(x)}" cy="${f(y)}" r="${f((cell * DOT) / 2)}" fill="${pr.hex}"/>` + mark(x, y, cell * DOT * MARK, pr.mark);
}
const finger = (x, y, scale, flip) => `<path d="${FINGER.path}" transform="translate(${f(x)} ${f(y)}) scale(${flip ? -scale : scale} ${scale})" fill="${C.finger}" stroke="${C.fingerEdge}" stroke-width="${FINGER.stroke_unit}" stroke-linejoin="round"/>`;
const sparkle = (x, y, r) => `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z" fill="${C.star}" stroke="${C.starEdge}" stroke-width="1"/>`;
const chevron = (x, y, h) => `<path d="M${f(x)} ${f(y - h / 2)} L${f(x + h * 0.5)} ${f(y)} L${f(x)} ${f(y + h / 2)}" fill="none" stroke="${C.inkSoft}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>\n`;
const allSolved = (lv) => ({ lines: Object.fromEntries(lv.solution.map((s) => [s.id, s.path])), tint: Object.fromEntries(lv.solution.map((s) => [s.id, s.path])), connected: new Set(lv.pairs.map((p) => p.id)) });

// 3x3(판이 작으면 판 크기) 창: 초점 칸을 모두 담고, 초점 가운데가 창 가운데에 가장 가까운 창
function pickWindow(lv, focus, size = 3) {
  const w = Math.min(size, lv.width), h = Math.min(size, lv.height);
  const mx = focus.reduce((a, c) => a + c[0], 0) / focus.length, my = focus.reduce((a, c) => a + c[1], 0) / focus.length;
  let best = null;
  for (let y0 = 0; y0 + h <= lv.height; y0++) for (let x0 = 0; x0 + w <= lv.width; x0++) {
    if (!focus.every(([x, y]) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h)) continue;
    const d = Math.hypot(x0 + (w - 1) / 2 - mx, y0 + (h - 1) / 2 - my);
    if (!best || d < best.d - 1e-9) best = { x0, y0, w, h, d };
  }
  return best;
}
// 빈칸 함정: 빈칸을 지나는 쌍만 가장 짧은 길(BFS), 나머지 쌍은 답 길 → 남는 칸
export function fillTrap(lv) {
  const empty = new Set(lv.fill_card.empty_cells.map(key));
  const P = lv.solution.find((s) => s.path.some((c) => empty.has(key(c))));
  if (!P) return { error: '빈칸을 지나는 답 길이 없음' };
  const blocked = new Set(lv.holes.map(key)); for (const s of lv.solution) if (s.id !== P.id) for (const c of s.path) blocked.add(key(c));
  const pr = lv.pairs.find((p) => p.id === P.id), start = pr.a, goal = key(pr.b);
  const prev = new Map([[key(start), null]]), q = [start];
  while (q.length) { const c = q.shift(); if (key(c) === goal) break; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [c[0] + dx, c[1] + dy]; if (n[0] < 0 || n[1] < 0 || n[0] >= lv.width || n[1] >= lv.height || blocked.has(key(n)) || prev.has(key(n))) continue; prev.set(key(n), c); q.push(n); } }
  if (!prev.has(goal)) return { error: '짧은 길 없음' };
  const short = []; for (let c = pr.b; c; c = prev.get(key(c))) short.unshift(c);
  const used = new Set(lv.holes.map(key)); for (const s of lv.solution) for (const c of (s.id === P.id ? short : s.path)) used.add(key(c));
  const left = []; for (let y = 0; y < lv.height; y++) for (let x = 0; x < lv.width; x++) if (!used.has(key([x, y]))) left.push([x, y]);
  return { pair: P.id, short, left };
}

// ---------- 그림 ----------
export function buildAll(levels) {
  const files = {}, info = {};
  const demoLv = levels.find((l) => l.tutorial?.kind === 'finger_demo');
  if (demoLv) { // L1 손가락 시연 그림 순서: 들어옴·누름 → 반쯤 끎(유령 선) → 짝 점에서 연결
    const t = demoLv.tutorial, path = t.demo_drag, cell = 52, th = themeOf(demoLv);
    const flip = path[0][0] === demoLv.width - 1; // 점이 맨 오른쪽 열이면 손을 뒤집음(30-art 8-1)
    const win = { x0: 0, y0: 0, w: demoLv.width, h: demoLv.height };
    const bwid = demoLv.width * cell + 2 * PAD * cell, fw = 3 * bwid + 2 * 40 + 36, fh = demoLv.height * cell + 2 * PAD * cell + 96;
    let body = `<rect width="${f(fw)}" height="${f(fh)}" fill="${th.top}"/>`;
    const steps = [1, Math.max(2, Math.ceil(path.length / 2)), path.length];
    steps.forEach((upto, fi) => {
      const ox = 18 + fi * (bwid + 40), oy = 34, done = fi === 2;
      const st = done ? { lines: { [t.demo_pair]: path }, tint: { [t.demo_pair]: path }, connected: new Set([t.demo_pair]) } : { ghost: { id: t.demo_pair, cells: path.slice(0, upto) } };
      const b = drawBoard(demoLv, ox, oy, cell, win, st, `s${fi}`);
      let s = b.s; const at = path[upto - 1];
      if (done) { const col = PAIRS[slotOf(demoLv, t.demo_pair)].hex; for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; s += `<circle cx="${f(b.cx(at[0]) + Math.cos(a) * cell * 0.75)}" cy="${f(b.cy(at[1]) + Math.sin(a) * cell * 0.75)}" r="${f(cell * 0.06)}" fill="${col}"/>`; } }
      else s += (fi === 0 ? `<circle cx="${f(b.cx(at[0]))}" cy="${f(b.cy(at[1]))}" r="${f(cell * 0.5)}" fill="none" stroke="${C.ink}" stroke-width="2.5" opacity="0.4"/>` : '') + finger(b.cx(at[0]), b.cy(at[1]), cell, flip);
      body += s; if (fi < 2) body += chevron(ox + b.w + 14, oy + b.h / 2, 18);
    });
    files['tutorial/tut-l1-demo-storyboard.svg'] = svg(f(fw), f(fh), body);
    info.demo = { level: demoLv.order, pair: t.demo_pair, path, flip };
  }
  const fillLv = levels.find((l) => l.fill_card);
  if (fillLv) { // L2 빈칸 카드: 왼쪽 = 빈칸 지나는 쌍을 곧게 → 남은 칸 숨 쉼 / 오른쪽 = 그 쌍이 빈칸을 돌아 다 칠함
    const tr = fillTrap(fillLv); info.fill = { level: fillLv.order, ...tr };
    if (!tr.error) {
      const pr = fillLv.pairs.find((p) => p.id === tr.pair);
      const win = pickWindow(fillLv, [...fillLv.fill_card.empty_cells, pr.a, pr.b]); info.fill.window = win;
      const others = fillLv.solution.filter((s) => s.id !== tr.pair);
      const trapLines = Object.fromEntries([...others.map((s) => [s.id, s.path]), [tr.pair, tr.short]]);
      const L = drawBoard(fillLv, 2, 46, 72, win, { lines: trapLines, tint: trapLines, connected: new Set(fillLv.pairs.map((p) => p.id)), glow: tr.left }, 'fl');
      const rx = 478 - L.w, R2 = drawBoard(fillLv, rx, 46, 72, win, allSolved(fillLv), 'fr');
      let body = `<rect width="480" height="320" rx="28" fill="${themeOf(fillLv).top}"/>` + L.s + R2.s + chevron((2 + L.w + rx) / 2 - 4, 46 + L.h / 2, 16);
      for (const [x, y, r] of [[rx + R2.w - 4, 34, 11], [rx + 12, 46 + R2.h + 16, 8]]) body += sparkle(f(x), f(y), r);
      files['tutorial/card-fill.svg'] = svg(480, 320, body);
    }
  }
  const holeLv = levels.find((l) => l.hole_card);
  if (holeLv) { // L6 구멍 카드: 왼쪽 = 구멍이 있는 문제 / 오른쪽 = 구멍만 비운 채 다 칠함
    const h0 = holeLv.hole_card.first_hole, win = pickWindow(holeLv, [h0]);
    const interior = h0[0] > 0 && h0[1] > 0 && h0[0] < holeLv.width - 1 && h0[1] < holeLv.height - 1;
    info.hole = { level: holeLv.order, first_hole: h0, interior, window: win };
    const L = drawBoard(holeLv, 2, 46, 72, win, {}, 'hl');
    const tmp = drawBoard(holeLv, 0, 46, 72, win, allSolved(holeLv), 'hr'), rx = 478 - tmp.w;
    const R2 = drawBoard(holeLv, rx, 46, 72, win, allSolved(holeLv), 'hr');
    let body = `<rect width="480" height="320" rx="28" fill="${themeOf(holeLv).top}"/>` + L.s + R2.s + chevron((2 + L.w + rx) / 2 - 4, 46 + L.h / 2, 16);
    for (const [x, y, r] of [[rx + R2.w - 4, 34, 11], [rx + 12, 46 + R2.h + 16, 8]]) body += sparkle(f(x), f(y), r);
    files['tutorial/card-hole.svg'] = svg(480, 320, body);
  }
  // 구멍 있는 레벨 판 그림(외곽선 파내기 규칙 확인용 목업, 정답 상태)
  for (const lv of levels.filter((l) => l.holes.length)) {
    const cell = 56, b = drawBoard(lv, 16, 16, cell, { x0: 0, y0: 0, w: lv.width, h: lv.height }, allSolved(lv), `m${lv.order}`);
    files[`mockups/board-l${String(lv.order).padStart(2, '0')}.svg`] = svg(f(b.w + 32), f(b.h + 32), `<rect width="${f(b.w + 32)}" height="${f(b.h + 32)}" fill="${themeOf(lv).top}"/>` + b.s);
  }
  return { files, info };
}

// ---------- 검사: 카드 = 레벨 첫 등장 ----------
export function checkData(levels, info) {
  const out = []; const bad = (m) => out.push('FAIL ' + m);
  const firstBy = (pred) => levels.find(pred);
  const demo = levels.filter((l) => l.tutorial?.kind === 'finger_demo');
  if (demo.length !== 1) bad(`손가락 시연 레벨 ${demo.length}개 (1개여야 함)`);
  else {
    const lv = demo[0], t = lv.tutorial, first = firstBy((l) => l.new_element === 'drag_connect') || levels[0];
    if (lv !== first || lv !== levels[0]) bad(`손가락 시연이 첫 레벨이 아님 (L${lv.order})`);
    const sol = pathOf(lv, t.demo_pair), same = (a, b) => a.length === b.length && a.every((c, i) => key(c) === key(b[i]));
    if (!same(t.demo_drag, sol) && !same(t.demo_drag, [...sol].reverse())) bad(`L${lv.order} demo_drag ≠ ${t.demo_pair} 답 길`);
  }
  const fills = levels.filter((l) => l.fill_card);
  if (fills.length !== 1) bad(`fill_card 레벨 ${fills.length}개 (1개여야 함)`);
  else {
    const lv = fills[0], first = firstBy((l) => l.new_element === 'fill_all_cells');
    if (lv !== first) bad(`card_fill 이 빈칸 채우기 첫 등장 레벨이 아님 (카드 L${lv.order}, 첫 등장 L${first?.order})`);
    const tr = info.fill; if (tr.error) bad(`L${lv.order} card_fill: ${tr.error}`);
    else { const a = new Set(tr.left.map(key)), b = new Set(lv.fill_card.empty_cells.map(key)); if (a.size !== b.size || [...a].some((k) => !b.has(k))) bad(`L${lv.order} 곧게 이으면 남는 칸 [${[...a]}] ≠ fill_card.empty_cells [${[...b]}]`); if (!tr.window) bad(`L${lv.order} card_fill 3x3 창에 빈칸·쌍 점이 다 안 들어감`); }
  }
  const holesFirst = firstBy((l) => l.holes.length > 0), hc = levels.filter((l) => l.hole_card);
  if (hc.length !== 1) bad(`hole_card 레벨 ${hc.length}개 (1개여야 함)`);
  else {
    const lv = hc[0];
    if (lv !== holesFirst) bad(`card_hole 이 구멍 첫 등장 레벨이 아님 (카드 L${lv.order}, 첫 구멍 L${holesFirst?.order})`);
    if (!lv.holes.some((h) => key(h) === key(lv.hole_card.first_hole))) bad(`L${lv.order} first_hole 이 holes 에 없음`);
    if (!info.hole?.window) bad(`L${lv.order} card_hole 창 없음`);
  }
  return out;
}

const args = process.argv.slice(2);
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/').replace(/^\//, '')}` || process.argv[1]?.endsWith('tutorial.mjs')) {
  const levels = loadLevels(); const { files, info } = buildAll(levels);
  if (args.includes('--write')) for (const [p, s] of Object.entries(files)) { mkdirSync(dirname(join(A, p)), { recursive: true }); writeFileSync(join(A, p), s); }
  const out = checkData(levels, info);
  for (const [p, s] of Object.entries(files)) if (!existsSync(join(A, p)) || readFileSync(join(A, p), 'utf8') !== s) out.push(`FAIL ${p} 가 지금 레벨 데이터로 만든 그림과 다름 (node assets/check/tutorial.mjs --write)`);
  for (const n of ['tutorial/tut-l1-demo-storyboard.svg', 'tutorial/card-fill.svg', 'tutorial/card-hole.svg']) if (!files[n]) out.push(`FAIL ${n} 를 만들 레벨 데이터 없음`);
  console.log(`시연 L${info.demo?.level} ${info.demo?.pair} ${JSON.stringify(info.demo?.path)}${info.demo?.flip ? ' (손 뒤집음)' : ''}`);
  if (info.fill) console.log(`빈칸 카드 L${info.fill.level} 쌍 ${info.fill.pair} 짧은 길 ${JSON.stringify(info.fill.short)} → 남는 칸 ${JSON.stringify(info.fill.left)} 창 x${info.fill.window?.x0}~${info.fill.window?.x0 + info.fill.window?.w - 1} y${info.fill.window?.y0}~${info.fill.window?.y0 + info.fill.window?.h - 1}`);
  if (info.hole) console.log(`구멍 카드 L${info.hole.level} 첫 구멍 ${JSON.stringify(info.hole.first_hole)} ${info.hole.interior ? '판 안쪽' : '판 둘레(외곽선 파내기)'} 창 x${info.hole.window?.x0}~${info.hole.window?.x0 + info.hole.window?.w - 1} y${info.hole.window?.y0}~${info.hole.window?.y0 + info.hole.window?.h - 1}`);
  for (const l of out) console.log(l);
  console.log(out.length ? `튜토리얼 검사 실패 ${out.length}건` : `튜토리얼 검사 통과 (카드 = 레벨 첫 등장, 그림 ${Object.keys(files).length}개 = 지금 레벨 데이터)`);
  process.exit(out.length ? 1 : 0);
}
