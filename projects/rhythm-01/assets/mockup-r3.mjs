#!/usr/bin/env node
// round-3 "북길" 목업 생성: assets/mockup-r3-road.svg (30-art 16절). layout.json·palette.json 값으로 그림. 외부 참조 없음.
//   node assets/mockup-r3.mjs
// 위 줄: 4해상도 플레이 화면(레벨 2, 콤보 13 = 큰 표지 1 + 점 3, 손가락·글 자리는 점선 칸으로 표시 — 실제 화면에서는 레벨 1 첫 별에만)
// 아래 줄: 640x360 길 조각으로 ① 딱 ② 좋아 ③ 통과 ④ 실패 0.15 s ⑤ 재시작 1.0 s ⑥ 콤보 줄 단계(2·5·10·20·끊김)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LAY = JSON.parse(readFileSync(join(HERE, 'layout.json'), 'utf8'));
const PAL = JSON.parse(readFileSync(join(HERE, 'palette.json'), 'utf8'));
const C = PAL.common, T = PAL.themes.level02;
const f1 = (v) => +(+v).toFixed(1);
const starPts = (cx, cy, r) => Array.from({ length: 10 }, (_, i) => { const a = (-90 + 36 * i) * Math.PI / 180, rr = i % 2 ? r * 0.5 : r; return `${f1(cx + rr * Math.cos(a))},${f1(cy + rr * Math.sin(a))}`; }).join(' ');
const star = (x, y, r, g = 1) => `<polygon points="${starPts(x, y, r * g)}" fill="${C.star}" stroke="${C.outline}" stroke-width="${f1(Math.max(2.5, 0.14 * r))}" stroke-linejoin="round"/>`;
const rays = (x, y, r, angs, color) => angs.map((a) => `<rect x="${f1(x - Math.max(1.5, 0.1 * r))}" y="${f1(y - (1.2 * r + 3) - 0.6 * r)}" width="${f1(Math.max(3, 0.2 * r))}" height="${f1(0.6 * r)}" rx="1.5" fill="${color}" transform="rotate(${a} ${f1(x)} ${f1(y)})"/>`).join('');
const PERFECT = [225, 247.5, 270, 292.5, 315], GOOD = [240, 270, 300];

function comboRow(L, n, ox = 0, oy = 0, scale = 1, shrink = 1) {
  const c = LAY.rule.combo, y = L.hud.combo.y + oy, x0 = L.hud.combo.x0 + ox, s = [];
  if (n < 2 && shrink === 1) return '';
  const marks = Math.min(Math.floor(n / 10), c.marks_max), dots = n % 10;
  let x = x0;
  for (let i = 0; i < marks; i++) { s.push(`<circle cx="${f1(x + c.mark_r)}" cy="${y}" r="${f1(c.mark_r * shrink)}" fill="${T.cardTint}" stroke="${C.outline}" stroke-width="1.2"/>`); x += c.mark_pitch; }
  for (let i = 0; i < c.cells; i++) {
    const cx = x + c.dot_r + i * c.dot_pitch;
    if (i < dots) s.push(`<circle cx="${f1(cx)}" cy="${y}" r="${f1(c.dot_r * shrink * (i === 4 && dots === 5 ? 1.15 : 1))}" fill="${C.hud}" stroke="${C.outline}" stroke-width="1"/>`);
    else if (shrink === 1) s.push(`<circle cx="${f1(cx)}" cy="${y}" r="${c.dot_r - 0.6}" fill="none" stroke="${C.trackEdge}" stroke-opacity="0.5" stroke-width="1.2"/>`);
  }
  return s.join('');
}

function screen(L, ox, oy, sc) {
  const W = L.W, H = L.H, s = [];
  s.push(`<g transform="translate(${ox} ${oy}) scale(${sc})"><rect width="${W}" height="${H}" fill="${T.bg}"/>`);
  const F = L.silhouette_frame;
  s.push(`<rect x="0" y="${F.y0}" width="${W}" height="${F.y1 - F.y0}" fill="none" stroke="${T.bgFar}" stroke-width="2" stroke-dasharray="6 6"/>`);
  if (L.thumb) s.push(`<rect x="${L.thumb.x0}" y="${L.thumb.y0}" width="${L.thumb.x1 - L.thumb.x0}" height="${L.thumb.y1 - L.thumb.y0}" rx="16" fill="${T.bgFar}" stroke="${C.trackEdge}" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="10 8"/>`);
  // 길
  const R = L.road, d = L.star_d, r = d / 2;
  s.push(`<rect x="0" y="${R.y0}" width="${W}" height="${L.road_h}" fill="${T.track2}"/><rect x="0" y="${R.y0 - 0.75}" width="${W}" height="1.5" fill="${C.trackEdge}"/><rect x="0" y="${R.y1 - 0.75}" width="${W}" height="1.5" fill="${C.trackEdge}"/>`);
  const lv = L.per_level[1]; // 레벨 2
  const beatPx = lv.min_spacing_px * 2, xj = L.judge_x;
  const tk = Math.max(5, 0.16 * d);
  for (let k = -1; xj + k * beatPx < W; k++) { const x = xj + k * beatPx + beatPx * 0.5 * 0; if (x > 2) s.push(`<rect x="${f1(x - tk / 2)}" y="${f1(R.y1 - tk - 3)}" width="${f1(tk)}" height="${f1(tk)}" rx="1" fill="${C.trackEdge}" fill-opacity="0.8"/>`); }
  const barX = xj + 2.5 * beatPx; s.push(`<rect x="${f1(barX - 2)}" y="${f1(R.y1 - 0.3 * L.road_h)}" width="4" height="${f1(0.3 * L.road_h)}" rx="1.5" fill="${C.trackEdge}"/>`);
  // 북·선
  const D = L.drum;
  s.push(`<circle cx="${D.x}" cy="${D.y}" r="${D.r}" fill="${T.drum}" stroke="${C.trackEdge}" stroke-width="2"/><circle cx="${D.x}" cy="${D.y}" r="${f1(D.r * 0.7)}" fill="none" stroke="${C.hud}" stroke-opacity="0.35" stroke-width="2"/>`);
  s.push(`<rect x="${f1(xj - L.line.w / 2)}" y="${R.y0}" width="${L.line.w}" height="${f1(D.y - D.r - R.y0)}" fill="${C.hud}" stroke="${C.outline}" stroke-width="1"/>`);
  // 별: 판정 선 0.25박 앞 둥두 쌍 + 2박 뒤 둥 하나 + 미리 보기 끝에서 들어오는 별
  for (const b of [0.25, 0.75, 2.25, lv.lead_beats - 0.15]) { const x = xj + b * beatPx; if (x - r < W) s.push(star(x, R.yc, r)); }
  // 공 (착지 직전)
  const B = L.ball, by = B.yRest - B.bounce * 0.3;
  s.push(`<circle cx="${xj}" cy="${f1(by)}" r="${B.d / 2}" fill="${C.ball}" stroke="${C.outline}" stroke-width="${f1(Math.max(2.5, 0.16 * B.d / 2))}"/><circle cx="${f1(xj - 0.3 * B.d / 2)}" cy="${f1(by - 0.3 * B.d / 2)}" r="${f1(0.28 * B.d / 2)}" fill="${C.hud}"/>`);
  // 손가락 칸·글 자리(점선, 사양 표시)
  const Fg = L.finger, Tx = L.text_slot;
  s.push(`<rect x="${Fg.x0}" y="${Fg.y0}" width="${Fg.s}" height="${Fg.s}" fill="none" stroke="${C.hud}" stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="4 4"/>`);
  const hs = Fg.s / 120 * 0.9; s.push(`<g transform="translate(${f1((Fg.x0 + Fg.x1) / 2)} ${f1((Fg.y0 + Fg.y1) / 2 + 4 * hs)}) scale(${f1(hs * 0.95)})"><g stroke="${C.outline}" stroke-width="5.4" stroke-linejoin="round" fill="${C.hud}"><rect x="-30.6" y="13.2" width="21.6" height="30.6" rx="10.8" transform="rotate(-25 -19.8 28.5)"/><rect x="-14.4" y="6" width="50.4" height="45" rx="14.4"/><rect x="-9.9" y="-30" width="19.8" height="45" rx="9.9"/></g></g>`);
  s.push(`<rect x="${Tx.x0}" y="${Tx.y0}" width="${f1(Tx.x1 - Tx.x0)}" height="${f1(Tx.y1 - Tx.y0)}" fill="none" stroke="${T.cardTint}" stroke-opacity="0.8" stroke-width="1.5" stroke-dasharray="4 4"/>`);
  // HUD
  const bar = L.hud.bar, P = L.hud.pause;
  s.push(`<rect x="${bar.x0}" y="${bar.y0}" width="${f1(bar.x1 - bar.x0)}" height="${bar.h}" rx="5" fill="${T.track1}" stroke="${C.trackEdge}" stroke-width="1"/><rect x="${bar.x0}" y="${bar.y0}" width="${f1((bar.x1 - bar.x0) * 0.42)}" height="${bar.h}" rx="5" fill="${C.hud}"/><circle cx="${f1(bar.x0 + (bar.x1 - bar.x0) * 0.6)}" cy="${bar.y0 + bar.h / 2}" r="6.5" fill="${C.ball}" stroke="${C.outline}" stroke-width="1.5"/>`);
  for (let i = 0; i < 4; i++) s.push(`<circle cx="${bar.x0 + 4.5 + 14 * i}" cy="${L.hud.attempt_y}" r="4.5" fill="${C.trackEdge}" fill-opacity="0.85"/>`);
  s.push(comboRow(L, 13));
  s.push(`<rect x="${P.x0}" y="${P.y0}" width="48" height="48" rx="12" fill="${T.bgFar}" stroke="${C.trackEdge}" stroke-width="1.5"/><rect x="${P.x0 + 17}" y="${P.y0 + 14}" width="5" height="20" rx="2" fill="${C.hud}"/><rect x="${P.x0 + 26}" y="${P.y0 + 14}" width="5" height="20" rx="2" fill="${C.hud}"/>`);
  s.push(`<rect x="0" y="${L.hud.band_bottom}" width="${W}" height="1" fill="${T.cardTint}" fill-opacity="0.4"/>`);
  s.push('</g>');
  return s.join('');
}

// 아래 줄: 640x360 길 조각 (판정 선 주변 200 × 150 영역)
const L6 = LAY.layouts.find((l) => l.W === 640 && l.H === 360 && !l.safe?.l);
function strip(kind, ox, oy) {
  const L = L6, s = [], xj = L.judge_x, R = L.road, d = L.star_d, r = d / 2, D = L.drum, B = L.ball;
  const x0 = xj - 90, y0 = B.top - 6, w = 230, h = D.y + D.r + 12 - y0;
  s.push(`<g transform="translate(${f1(ox - x0)} ${f1(oy - y0)})"><rect x="${x0}" y="${y0}" width="${w}" height="${f1(h)}" rx="10" fill="${T.bg}"/>`);
  const track = kind === 'fail' || kind === 'restart' ? T.track1 : T.track2;
  s.push(`<rect x="${x0}" y="${R.y0}" width="${w}" height="${L.road_h}" fill="${track}"/><rect x="${x0}" y="${R.y0 - 0.75}" width="${w}" height="1.5" fill="${C.trackEdge}"/><rect x="${x0}" y="${R.y1 - 0.75}" width="${w}" height="1.5" fill="${C.trackEdge}"/>`);
  const rip = { perfect: 1.18, good: 1.12, pass: 1.06 }[kind];
  s.push(`<circle cx="${D.x}" cy="${D.y}" r="${D.r}" fill="${T.drum}" stroke="${C.trackEdge}" stroke-width="2"/>`);
  if (rip) s.push(`<circle cx="${D.x}" cy="${D.y}" r="${f1(D.r * rip)}" fill="none" stroke="${C.hud}" stroke-width="2"/>`);
  s.push(`<rect x="${f1(xj - L.line.w / 2)}" y="${R.y0}" width="${L.line.w}" height="${f1(D.y - D.r - R.y0)}" fill="${C.hud}" stroke="${C.outline}" stroke-width="1"/>`);
  const nx = xj + L.per_level[1].min_spacing_px; // 다음 별(반박 뒤)
  const jx = xj - 10; // 판정된 별은 길과 함께 왼쪽으로 흐름
  if (kind === 'perfect') s.push(rays(jx, R.yc, r, PERFECT, C.star) + star(jx, R.yc, r, 1.2));
  if (kind === 'good') s.push(rays(jx, R.yc, r, GOOD, C.hud) + star(jx, R.yc, r, 1.1));
  if (kind === 'pass') s.push(`<circle cx="${jx}" cy="${R.yc}" r="${f1(0.9 * r)}" fill="none" stroke="${C.trackEdge}" stroke-width="2"/><circle cx="${jx}" cy="${R.yc}" r="${f1(0.35 * r)}" fill="${C.trackEdge}"/>`);
  if (kind === 'fail') { // 두 조각
    const half = (sgn) => `<g transform="rotate(${sgn * 20} ${xj + 4} ${R.yc + 6})"><polygon points="${starPts(xj + 4 + sgn * 4, R.yc + 6, r)}" fill="${C.broken}" stroke="${C.outline}" stroke-width="2.5" stroke-linejoin="round" clip-path="url(#half${sgn > 0 ? 'R' : 'L'})"/></g>`;
    s.push(half(-1) + half(1));
  }
  if (kind !== 'restart') s.push(star(nx, R.yc, r));
  // 공
  const by = B.yRest;
  if (kind === 'fail') s.push(`<circle cx="${xj}" cy="${by}" r="${f1(B.d / 2 - 1.6)}" fill="none" stroke="${C.ball}" stroke-width="${f1(0.22 * B.d / 2)}"/>`);
  else { const g = kind === 'restart' ? 0.8 : 1; s.push(`<circle cx="${xj}" cy="${by}" r="${f1(g * B.d / 2)}" fill="${C.ball}" stroke="${C.outline}" stroke-width="2.5"/><circle cx="${f1(xj - 0.3 * g * B.d / 2)}" cy="${f1(by - 0.3 * g * B.d / 2)}" r="${f1(0.28 * g * B.d / 2)}" fill="${C.hud}"/>`); }
  s.push('</g>');
  return s.join('');
}
function comboStrip(n, ox, oy, shrink = 1) {
  const L = L6, x0 = L.hud.combo.x0 - 8, y0 = L.hud.combo.y0 - 8, w = L.hud.combo.x1 - L.hud.combo.x0 + 16, h = L.hud.combo.y1 - L.hud.combo.y0 + 16;
  return `<g transform="translate(${f1(ox - x0)} ${f1(oy - y0)})"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="8" fill="${T.bg}"/>${comboRow(L, n, 0, 0, 1, shrink)}</g>`;
}

const four = LAY.layouts.slice(0, 4);
const sc = [1, 1, 1, 0.5];
let x = 20; const parts = [];
four.forEach((L, i) => { parts.push(screen(L, x, 40, sc[i])); x += L.W * sc[i] + 30; });
const topH = 40 + Math.max(...four.map((L, i) => L.H * sc[i])) + 30;
const kinds = ['perfect', 'good', 'pass', 'fail', 'restart'];
kinds.forEach((k, i) => parts.push(strip(k, 20 + i * 250, topH + 10)));
const cy = topH + 200;
[[2, 1], [5, 1], [10, 1], [20, 1], [13, 0.45]].forEach(([n, sh], i) => parts.push(comboStrip(n, 20 + i * 220, cy, sh)));
const Wt = Math.max(x, 20 + 5 * 250) + 10, Ht = cy + 60;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Wt} ${Ht}" width="${Wt}" height="${Ht}">
<!-- round-3 북길 목업 (assets/mockup-r3.mjs 가 layout.json·palette.json 으로 생성, 손으로 고치지 않음). 위: 360x640 · 412x915 · 640x360 · 1280x720(0.5배) 레벨 2 화면. 점선 = 실루엣 판(회색)·손가락 칸(흰)·tut_tap 글 자리(카드 색). 아래 1줄: 딱 / 좋아 / 통과 / 실패 0~0.3 s / 재시작 0.88~1.08 s. 아래 2줄: 콤보 2 / 5(5칸째 튐) / 10(큰 표지 1) / 20(표지 2) / 끊김(실패 0.3 s 안 조용히 작아짐). 30-art 16절 -->
<defs><clipPath id="halfL"><rect x="-2000" y="-2000" width="${2000 + L6.judge_x + 4}" height="4000"/></clipPath><clipPath id="halfR"><rect x="${L6.judge_x + 4}" y="-2000" width="4000" height="4000"/></clipPath></defs>
<rect width="${Wt}" height="${Ht}" fill="#808080"/>
${parts.join('\n')}
</svg>
`;
if (/href="(?!#)/.test(svg) || /url\((?!#)/.test(svg)) throw new Error('외부 참조');
writeFileSync(join(HERE, 'mockup-r3-road.svg'), svg);
console.log(`mockup-r3-road.svg ${Wt}×${Ht}`);
