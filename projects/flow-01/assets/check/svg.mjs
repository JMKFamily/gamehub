#!/usr/bin/env node
// flow-01 SVG 에셋 생성 (art-director). 외부 이미지·글꼴 없음, 기본 도형만.
//   node assets/check/svg.mjs    marks/ icons/ finger.svg logo-mark.svg app-icon.svg 를 다시 씀 (tutorial/ 은 tutorial.mjs)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARKS as MARKS6, MARKS_EXT, MARK_STROKE_UNIT, STAR, FINGER } from './shapes.mjs';
const MARKS = { ...MARKS6, ...MARKS_EXT };

const HERE = dirname(fileURLToPath(import.meta.url));
const A = resolve(HERE, '..');
const PAL = JSON.parse(readFileSync(join(A, 'palette.json'), 'utf8'));
const C = PAL.common, PAIRS = [...PAL.pairs, ...(PAL.pairs_ext || [])]; // r3: 쌍 16개(앞 6 + 어려운 판 10)
const LINE = 0.48, DOT = 0.74, MARK = 0.46, RING = 0.86, RING_W = 0.05, TILE_IN = 0.05, TILE_R = 0.22;
const svg = (w, h, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"${extra}>${body}</svg>\n`;
const mark = (x, y, size, m, fill = C.white) => `<path d="${MARKS[m]}" transform="translate(${+x.toFixed(2)} ${+y.toFixed(2)}) scale(${+(size / 2).toFixed(3)})" fill="${fill}" stroke="${fill}" stroke-width="${MARK_STROKE_UNIT}" stroke-linejoin="round"/>`;
const dot = (x, y, cell, p, ring = false) => {
  const pr = PAIRS[p]; let s = '';
  if (ring) s += `<circle cx="${x}" cy="${y}" r="${(cell * RING) / 2}" fill="none" stroke="${pr.hex}" stroke-width="${cell * RING_W}"/>`;
  return s + `<circle cx="${x}" cy="${y}" r="${(cell * DOT) / 2}" fill="${pr.hex}"/>` + mark(x, y, cell * DOT * MARK, pr.mark);
};
const finger = (x, y, scale, flip = false) => `<path d="${FINGER.path}" transform="translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})" fill="${C.finger}" stroke="${C.fingerEdge}" stroke-width="${FINGER.stroke_unit}" stroke-linejoin="round"/>`;

// 작은 판 그리기: grid = 문자열 배열(문자 = 쌍 번호 0..5, '#' = 구멍, '.' = 빈칸), lines = {p: [[r,c],...]}, ends = {p: [[r,c],[r,c]]}
function miniBoard(ox, oy, cell, rows, cols, { holes = [], holeColor = PAL.themes.level06.top, tint = {}, lines = {}, ends = {}, glow = [], connected = [] } = {}) {
  const pad = cell * 0.06; let s = `<rect x="${ox}" y="${oy}" width="${cols * cell + 2 * pad}" height="${rows * cell + 2 * pad}" rx="${cell * 0.30}" fill="${C.board}" stroke="${C.boardEdge}" stroke-width="1.5"/>`;
  const gx = ox + pad, gy = oy + pad, cx = (c) => gx + (c + 0.5) * cell, cy = (r) => gy + (r + 0.5) * cell;
  const key = (r, c) => r + ',' + c;
  const T = new Map(Object.entries(tint).flatMap(([p, cells]) => cells.map(([r, c]) => [key(r, c), +p])));
  const H = new Set(holes.map(([r, c]) => key(r, c))), G = new Set(glow.map(([r, c]) => key(r, c)));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (H.has(key(r, c))) { const hi = cell * 0.02; s += `<rect x="${gx + c * cell + hi}" y="${gy + r * cell + hi}" width="${cell - 2 * hi}" height="${cell - 2 * hi}" rx="${cell * TILE_R}" fill="${holeColor}" stroke="${C.boardEdge}" stroke-width="1.5"/>`; continue; }
    const p = T.get(key(r, c)); const ti = cell * TILE_IN;
    if (G.has(key(r, c))) s += `<rect x="${gx + c * cell + ti / 2}" y="${gy + r * cell + ti / 2}" width="${cell - ti}" height="${cell - ti}" rx="${cell * TILE_R}" fill="none" stroke="${C.gapGlow}" stroke-width="${cell * 0.08}"/>`;
    s += `<rect x="${gx + c * cell + ti}" y="${gy + r * cell + ti}" width="${cell - 2 * ti}" height="${cell - 2 * ti}" rx="${cell * TILE_R}" fill="${p === undefined ? C.tile : PAIRS[p].tint}"/>`;
    if (p === undefined) s += `<circle cx="${cx(c)}" cy="${cy(r)}" r="${cell * 0.035}" fill="${C.tileDot}"/>`;
  }
  for (const [p, seq] of Object.entries(lines)) s += `<polyline points="${seq.map(([r, c]) => `${cx(c)},${cy(r)}`).join(' ')}" fill="none" stroke="${PAIRS[p].hex}" stroke-width="${cell * LINE}" stroke-linecap="round" stroke-linejoin="round"/>`;
  for (const [p, e] of Object.entries(ends)) for (const [r, c] of e) s += dot(cx(c), cy(r), cell, +p, connected.includes(+p));
  return { s, cx, cy, w: cols * cell + 2 * pad, h: rows * cell + 2 * pad };
}
const sparkle = (x, y, r, color) => `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z" fill="${color}"/>`;
const chevron = (x, y, h) => `<path d="M${x} ${y - h / 2} L${x + h * 0.5} ${y} L${x} ${y + h / 2}" fill="none" stroke="${C.inkSoft}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;

const files = {};
// 1) 점 모양 표지 6개 (100x100, 칸 1개 = 100)
PAIRS.forEach((p, i) => {
  files[`marks/mark-${p.key}-${p.mark}.svg`] = svg(100, 100, dot(50, 50, 100, i));
  files[`marks/mark-${p.key}-${p.mark}-connected.svg`] = svg(100, 100, dot(50, 50, 100, i, true));
  // r2 H3: 결과 쌍 점 줄의 "속 빈" 점(한 번에 잇지 못한 쌍) = 흰 면 + 쌍 색 테두리(지름의 0.12) + 쌍 색 표지. 꽉 찬 점 = connected 점 + 반짝임
  files[`marks/mark-${p.key}-${p.mark}-hollow.svg`] = svg(100, 100, `<circle cx="50" cy="50" r="${(100 * DOT) / 2 - 4.4}" fill="${C.white}" stroke="${p.hex}" stroke-width="8.8"/>` + mark(50, 50, 100 * DOT * MARK, p.mark, p.hex));
});
files['marks/marks-sheet.svg'] = svg(640, 120, `<rect width="640" height="120" fill="${C.board}"/>` + PAIRS.slice(0, 6).map((p, i) => dot(55 + i * 106, 60, 100, i)).join(''));
// r3: 16쌍 표 — 위 줄 점, 아래 줄 얇은 선(0.48칸) + 선 위 흰 표지(넓은 판 규칙). 흑백·색약 눈 확인용
files['marks/marks-sheet-16.svg'] = svg(16 * 70 + 20, 170, `<rect width="${16 * 70 + 20}" height="170" fill="${C.board}"/>` + PAIRS.map((p, i) => { const x = 45 + i * 70; return dot(x, 45, 64, i) + `<rect x="${x - 32}" y="95" width="64" height="64" rx="14" fill="${p.tint}"/><path d="M${x} 100 V154" stroke="${p.hex}" stroke-width="${64 * LINE}" stroke-linecap="round"/>` + mark(x, 127, 64 * 0.26, p.mark); }).join(''));

// 2) 아이콘 (48x48, ink 선 굵기 4, 둥근 끝)
const st = `fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`;
const gear = (() => { let d = ''; const n = 8; for (let i = 0; i < n * 2; i++) { const a = (i * Math.PI) / n - Math.PI / 2, r = i % 2 ? 12.5 : 16.5; const a2 = a + Math.PI / n; d += `${i ? 'L' : 'M'}${(24 + r * Math.cos(a)).toFixed(2)} ${(24 + r * Math.sin(a)).toFixed(2)} L${(24 + r * Math.cos(a2 - 0.12)).toFixed(2)} ${(24 + r * Math.sin(a2 - 0.12)).toFixed(2)} `; } return d + 'Z'; })();
const ICONS = {
  undo: `<path d="M15 19 H29 A9.5 9.5 0 0 1 29 38 H19" ${st}/><path d="M21 12 L14 19 L21 26" ${st}/>`,
  restart: `<path d="M35.5 27 A12 12 0 1 1 32 15.5" ${st}/><path d="M33.5 7.5 L32.5 16 L24 15" ${st}/>`,
  sound_on: `<path d="M9 19.5 H16 L25 12.5 V35.5 L16 28.5 H9 Z" fill="${C.ink}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/><path d="M30.5 18.5 Q34 24 30.5 29.5" ${st}/><path d="M35.5 14 Q42 24 35.5 34" ${st}/>`,
  sound_off: `<path d="M9 19.5 H16 L25 12.5 V35.5 L16 28.5 H9 Z" fill="${C.ink}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/><path d="M9 9 L39 39" fill="none" stroke="${C.white}" stroke-width="9" stroke-linecap="round"/><path d="M9 9 L39 39" ${st}/>`,
  help: `<circle cx="20" cy="15" r="8" fill="none" stroke="${C.ink}" stroke-width="2.5" opacity="0.55"/>` + `<path d="${FINGER.path}" transform="translate(20 15) scale(24)" fill="${C.white}" stroke="${C.ink}" stroke-width="0.12" stroke-linejoin="round"/>`,
  map: `<path d="M10 35 C18 35 15 14 24 14 C32 14 30 30 38 30" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" stroke-dasharray="0.1 7"/><circle cx="10" cy="35" r="5" fill="${C.ink}"/><circle cx="24" cy="14" r="5" fill="${C.ink}"/><circle cx="38" cy="30" r="5" fill="none" stroke="${C.ink}" stroke-width="3.5"/>`,
  next: `<path d="M17 12 L36 24 L17 36 Z" fill="${C.ink}" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/>`,
  star: `<path d="${STAR}" transform="translate(24 24) scale(18)" fill="${C.star}" stroke="${C.starEdge}" stroke-width="0.11" stroke-linejoin="round"/>`,
  star_empty: `<path d="${STAR}" transform="translate(24 24) scale(18)" fill="${C.nodeLocked}" stroke="${C.pathTodo}" stroke-width="0.09" stroke-linejoin="round"/>`, // r2 E6·S10: 점선 → 옅은 실선 면(뭉침·래스터 비용↓)
  settings: `<path d="${gear}" fill="none" stroke="${C.ink}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="24" cy="24" r="5" fill="none" stroke="${C.ink}" stroke-width="3.5"/>`,
  one_go: `<path d="M11 34 C19 34 17 14 25 14 H37" fill="none" stroke="${PAIRS[1].hex}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11" cy="34" r="7" fill="${PAIRS[1].hex}"/><circle cx="37" cy="14" r="7" fill="${PAIRS[1].hex}"/>`,
  filled: [[8, 8, 0], [25, 8, 1], [8, 25, 2], [25, 25, 3]].map(([x, y, p]) => `<rect x="${x}" y="${y}" width="15" height="15" rx="4.5" fill="${PAIRS[p].tint}" stroke="${PAIRS[p].hex}" stroke-width="2"/>`).join(''), // r2 S22: 막대 두 줄(메뉴처럼 읽힘) → 판 타일 언어 2x2 칠한 칸
  close: `<path d="M15 15 L33 33 M33 15 L15 33" ${st}/>`, // 보호자 화면 닫기(btn_close). 빨간색 아님, 버튼 원 안 ink 선
  new_best: `<path d="M13 27 L24 16 L35 27" fill="none" stroke="${C.pathDone}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="17" y="30" width="14" height="11" rx="3.5" fill="${PAIRS[0].tint}" stroke="${C.pathDone}" stroke-width="2"/>`, // 결과 % 옆: 지난번보다 늘었음(위로 둥근 꺾쇠 + 칠한 칸), 글·숫자 없음
};
for (const [n, b] of Object.entries(ICONS)) files[`icons/icon-${n}.svg`] = svg(48, 48, b);
// 지도 노드 3상태 (64x64)
// r2 S10: 잠긴 노드 = 옅은 원 + 그 판 크기(w x h) 옅은 타일 격자 실루엣(예: 4x4). 빌드는 레벨 width/height 로 같은 식(layout.json map.node_states.locked)
{ const n = 4, g = 34 / n; let t = ''; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) t += `<rect x="${(15 + c * g + 0.9).toFixed(2)}" y="${(15 + r * g + 0.9).toFixed(2)}" width="${(g - 1.8).toFixed(2)}" height="${(g - 1.8).toFixed(2)}" rx="${(g * 0.22).toFixed(2)}" fill="${C.nodeLockedMark}" opacity="0.35"/>`;
  files['icons/node-locked.svg'] = svg(64, 64, `<circle cx="32" cy="32" r="30" fill="${C.nodeLocked}"/>` + t); }
// r2 50스테이지: 챕터 넘김 화살표(지도 아래 줄), 48 칸 안 ink 꺾쇠
files['icons/icon-page_prev.svg'] = svg(48, 48, `<path d="M28 13 L17 24 L28 35" ${st}/>`);
files['icons/icon-page_next.svg'] = svg(48, 48, `<path d="M20 13 L31 24 L20 35" ${st}/>`);
files['icons/node-partial.svg'] = svg(72, 72, `<circle cx="36" cy="36" r="28" fill="${C.nodeOpen}" stroke="${C.nodeOpenEdge}" stroke-width="4"/><path d="M30 25 L47 36 L30 47 Z" fill="${C.nodeOpenEdge}" stroke="${C.nodeOpenEdge}" stroke-width="4" stroke-linejoin="round"/><path d="M36 2.5 A33.5 33.5 0 0 1 ${(36 + 33.5 * Math.cos(-Math.PI / 2 + 0.4 * 2 * Math.PI)).toFixed(1)} ${(36 + 33.5 * Math.sin(-Math.PI / 2 + 0.4 * 2 * Math.PI)).toFixed(1)}" fill="none" stroke="${C.pathDone}" stroke-width="5" stroke-linecap="round"/>`);
files['icons/node-open.svg'] = svg(64, 64, `<circle cx="32" cy="32" r="28" fill="${C.nodeOpen}" stroke="${C.nodeOpenEdge}" stroke-width="4"/><path d="M26 21 L43 32 L26 43 Z" fill="${C.nodeOpenEdge}" stroke="${C.nodeOpenEdge}" stroke-width="4" stroke-linejoin="round"/>`);
{
  const b = miniBoard(4, 4, 14, 4, 4, { tint: { 0: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1]], 2: [[1, 1], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2]], 1: [[0, 3], [1, 3], [2, 3], [3, 3]] },
    lines: { 0: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1]], 2: [[1, 1], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2]], 1: [[0, 3], [1, 3], [2, 3], [3, 3]] } });
  files['icons/node-done-example.svg'] = svg(64, 64, b.s + `<path d="${STAR}" transform="translate(54 10) scale(9)" fill="${C.star}" stroke="${C.starEdge}" stroke-width="0.14" stroke-linejoin="round"/>`);
}
files['finger.svg'] = svg(64, 80, finger(16, 6, 56));

// 3) 튜토리얼 그림 3장은 levels/*.json 을 읽는 tutorial.mjs 가 만듦(1-2 2차, 레벨이 바뀌면 그쪽만 다시 실행)
// 3-4) 로고 표지(타이틀 글자 옆에 붙는 두 점과 선. 글자는 빌드가 시스템 글꼴로)
files['logo-mark.svg'] = svg(160, 64, `<path d="M32 32 C64 32 64 12 96 12 H128" fill="none" stroke="${PAIRS[1].hex}" stroke-width="16" stroke-linecap="round"/>` + dot(32, 32, 44, 1) + dot(128, 12, 22, 1).replace(/r="8.14"/, 'r="10"'));
// 4) 앱 아이콘 초안 (1024, 밝은 소프트 그라디언트 + 흰 판 3x3 + 굵은 둥근 선 2개)
{
  const cell = 230; const ox = (1024 - (3 * cell + 2 * cell * 0.06)) / 2;
  const blue = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], red = [[0, 1], [0, 2], [1, 2], [1, 1]];
  const b = miniBoard(ox, ox, cell, 3, 3, { lines: { 1: blue, 0: red }, tint: { 1: blue, 0: red }, ends: { 1: [blue[0], blue.at(-1)], 0: [red[0], red.at(-1)] }, connected: [0, 1] });
  const bg = `<defs><linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${PAL.themes.level01.top}"/><stop offset="1" stop-color="${PAL.themes.level10.bottom}"/></linearGradient></defs><rect width="1024" height="1024" rx="220" fill="url(#g)"/>`;
  files['app-icon.svg'] = svg(1024, 1024, bg + b.s.replace('stroke-width="1.5"', 'stroke-width="6"'));
}

for (const [p, s] of Object.entries(files)) { mkdirSync(dirname(join(A, p)), { recursive: true }); writeFileSync(join(A, p), s); }
console.log(`SVG ${Object.keys(files).length}개 씀`);
