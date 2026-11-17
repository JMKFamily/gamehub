#!/usr/bin/env node
// rhythm-02 모양 함수(공·북·박 표시·지붕·가지·언덕·구름·콤보·손가락) + 그림 카드·레벨 카드·오브젝트 SVG 생성 + 검사. 30-art 3·7·8·11절. (round-2 흘러오는 길)
//   node tools/art/cards.mjs           assets/cards/<키>.svg(가로판)·<키>_portrait.svg(세로판), assets/obj-*.svg 쓰기 + 검사 (레벨 선택 목업은 icons.mjs)
//   node tools/art/cards.mjs --check   검사만 — 실패 시 종료 코드 1
// 카드 키: 기믹 id(W0~W7, 00-benchmark 14-3) → 키(lore strings.json 과 같은 이름). balance.json gimmicks 가 v2(W id)면 그 card 키와 대조, 아니면 "대기".
// 색은 assets/palette.json 만 읽음. 외부 이미지·폰트 없음. 글자 없음.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = resolve(HERE, '../..');
const P = JSON.parse(readFileSync(join(PROJ, 'assets/palette.json'), 'utf8'));
const C = P.common;
const CARDS = join(PROJ, 'assets/cards');
const f1 = (v) => (+(+v).toFixed(1)).toString();

// ---------------- 모양 함수 (빌드 canvas 구현의 기준 그림, 30-art 3절) ----------------
// 모든 길이는 d(공 지름) 비율. layout.json world.* 의 계수와 같은 값.
export const SHAPE = {
  mark: { w_of_d: 0.8, h_of_d: 0.4, outline_px: 2 },                 // 박 표시: 길 위 낮은 반원 돔(북 몸통 색)
  leg: { w_of_d: 0.22 },                                             // 북 다리(북 가운데 → 길)
  roof: { body_h_of_d: 0.85, dome_of_d: 0.3, scallop_d_of_d: 0.6, outline_px: 2.4 }, // 지붕 차양: 둥근 윗변 + 줄무늬 + 아래 물결(반원) 가장자리
  branch: { side_margin_of_d: 0, twig_h_of_d: 0.24, leaf_len_of_d: 0.55, leaf_w_of_d: 0.26, leaf_gap_of_d: 0.62, outline_px: 2 },
  hill: { h_of_apex: 0.45, outline_px: 2 },                          // 언덕 높이 = 그 비행 꼭짓점 × 0.45 (공은 언덕 위로 넘어감)
  cloud: { base_of_h: 0.55, bump_r_of_h: 0.45, bump_gap_of_r: 1.0, outline_px: 2.4 }, // 긴 구름: 아래 띠 0.55h + 촘촘한 혹(간격 = 반지름) → 어디서나 0.94h 덮음
  combo: { slot_px: 8, slot_gap_px: 3, ten_px: 14, ten_gap_px: 4, group_gap_px: 6, slots: 10, rx_px: 2 },
};

export function ballSvg(x, y, d, { sq = 1 } = {}) {
  // 공: 붉은 원 + 외곽선(0.08d) + 왼쪽 위 짧은 빛 호. sq < 1 이면 납작, 아랫점 고정. y = 공 윗점
  const rx = d / 2 / sq, ry = d / 2 * sq, cy = y + d - ry;
  const o = Math.max(2, 0.08 * d), rr = 0.62, p = (a) => [x + rr * rx * Math.cos(a * Math.PI / 180), cy + rr * ry * Math.sin(a * Math.PI / 180)];
  const [x0, y0] = p(200), [x1, y1] = p(255);
  return `<ellipse cx="${f1(x)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${C.ball}" stroke="${C.ink}" stroke-width="${f1(o)}"/>` +
    `<path d="M${f1(x0)} ${f1(y0)} A${f1(rr * rx)} ${f1(rr * ry)} 0 0 1 ${f1(x1)} ${f1(y1)}" fill="none" stroke="${C.ballShine}" stroke-width="${f1(Math.max(2, 0.12 * d))}" stroke-linecap="round"/>`;
}
// 북: 가로로 넓은 둥근 사각형 + 가죽 띠. legTo 가 있으면 북 가운데 아래로 다리(북 몸통 색)를 길(lane) 까지 — "표시가 이 다리 밑에 오면 톡"
export function drumSvg(cx, skinY, w, h, skinH, { glow = false, d = 30, legTo = null } = {}) {
  const o = Math.max(2, 0.08 * d);
  let s = '';
  if (legTo != null && legTo > skinY + h) { const lw = SHAPE.leg.w_of_d * d; s += `<rect x="${f1(cx - lw / 2)}" y="${f1(skinY + h - 2)}" width="${f1(lw)}" height="${f1(legTo - skinY - h + 2)}" fill="${C.drumBody}" stroke="${C.ink}" stroke-width="${f1(o * 0.8)}"/>`; }
  s += `<rect x="${f1(cx - w / 2)}" y="${f1(skinY)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(0.3 * d)}" fill="${C.drumBody}" stroke="${C.ink}" stroke-width="${f1(o)}"/>` +
    `<rect x="${f1(cx - w / 2)}" y="${f1(skinY)}" width="${f1(w)}" height="${f1(skinH)}" rx="${f1(skinH / 2)}" fill="${glow ? C.glow : C.skin}" stroke="${C.ink}" stroke-width="${f1(o)}"/>`;
  return s;
}
// 박 표시: 길(laneY) 위 낮은 반원 돔. 같은 크기·색 하나(신호 1종). 음표·노트 막대·가시·고리 아님
export function markSvg(x, laneY, d, { scale = 1 } = {}) {
  const rx = SHAPE.mark.w_of_d * d / 2 * scale, ry = SHAPE.mark.h_of_d * d * scale, by = laneY + SHAPE.mark.h_of_d * d / 2;
  return `<path d="M${f1(x - rx)} ${f1(by)} A${f1(rx)} ${f1(ry)} 0 0 1 ${f1(x + rx)} ${f1(by)} Z" fill="${C.drumBody}" stroke="${C.ink}" stroke-width="${SHAPE.mark.outline_px}" stroke-linejoin="round"/>`;
}
// R2-D9: 가지 그린 가로 = balance objects [beat_in, beat_out] 그대로(= [첫 반박 접촉 − 0.25박, 마지막 반박 접촉 + 0.2박], 좌우 여유 0).
// 검사: 그 구간에 완전히 든 표시 = 2(가지)·4(긴 가지), 반쯤 걸친 표시 0 → 들어가는 표시(앞 비행 착지)·나가는 표시는 가지 밖에 완전히
export function markHalfW(d) { return (SHAPE.mark.w_of_d * d) / 2 + SHAPE.mark.outline_px / 2; }
// 표시들이 가지 [x0, x1] 밑에 완전히 든 수 / 반쯤 걸친 수
export function marksUnder(xs, x0, x1, d) { const hw = markHalfW(d); let full = 0, part = 0; for (const x of xs) { const a = x - hw, b = x + hw; if (a >= x0 - 1e-6 && b <= x1 + 1e-6) full++; else if (b > x0 && a < x1) part++; } return { full, part }; }
export const markBox = (x, laneY, d) => ({ x0: x - SHAPE.mark.w_of_d * d / 2, x1: x + SHAPE.mark.w_of_d * d / 2, y0: laneY - SHAPE.mark.h_of_d * d / 2, y1: laneY + SHAPE.mark.h_of_d * d / 2 });
// 긴 구름(W2·끝 구름): x0~x1, 아랫선 bottomY, 높이 h. 아래 띠(0.55h) + 혹(반지름 0.45h, 간격 = 반지름) → 혹 사이 오목한 곳도 0.94h 덮음
export function cloudGeom(x0, x1, bottomY, h) {
  const S = SHAPE.cloud, r = S.bump_r_of_h * h, cy = bottomY - S.base_of_h * h, gap = S.bump_gap_of_r * r;
  const w = x1 - x0, n = Math.max(2, Math.floor((w - 2 * r) / gap) + 1), span = (n - 1) * gap, start = x0 + (w - span) / 2;
  return { r, cy, bumps: Array.from({ length: n }, (_, i) => start + i * gap), coverTop: bottomY - (S.base_of_h * h + Math.sqrt(r * r - (gap / 2) ** 2)), top: bottomY - h };
}
export function cloudSvg(x0, x1, bottomY, h, fill = C.cloud) {
  const g = cloudGeom(x0, x1, bottomY, h), bh = SHAPE.cloud.base_of_h * h;
  const body = `<rect x="${f1(x0)}" y="${f1(bottomY - bh)}" width="${f1(x1 - x0)}" height="${f1(bh)}" rx="${f1(bh / 2)}"/>` + g.bumps.map((bx) => `<circle cx="${f1(bx)}" cy="${f1(g.cy)}" r="${f1(g.r)}"/>`).join('');
  return `<g fill="${fill}" stroke="${C.ink}" stroke-width="${SHAPE.cloud.outline_px * 2}">${body}</g><g fill="${fill}">${body}</g>`;
}
// 지붕(W4, 치지 마): 차양. 윗변이 둥글게 솟음(평평한 발판으로 안 보이게) + 넓은 세로 줄무늬 2색 + 아래 가장자리 반원 물결. underY = 물결 끝(가장 낮은 곳)
export function roofGeom(x0, x1, underY, d) {
  const S = SHAPE.roof, sd = S.scallop_d_of_d * d, bodyBottom = underY - sd / 2, bodyTop = bodyBottom - S.body_h_of_d * d, domeTop = bodyTop - S.dome_of_d * d;
  const n = Math.max(1, Math.round((x1 - x0) / sd)), sw = (x1 - x0) / n;
  return { sd, sw, n, bodyBottom, bodyTop, domeTop };
}
let roofId = 0;
export function roofSvg(x0, x1, underY, d) {
  const g = roofGeom(x0, x1, underY, d), id = `rf${roofId++}`;
  const outline = `M${f1(x0)} ${f1(g.bodyBottom)} L${f1(x0)} ${f1(g.bodyTop)} Q${f1((x0 + x1) / 2)} ${f1(g.domeTop - (g.bodyTop - g.domeTop))} ${f1(x1)} ${f1(g.bodyTop)} L${f1(x1)} ${f1(g.bodyBottom)} ` +
    Array.from({ length: g.n }, (_, i) => { const xa = x1 - i * g.sw, xb = xa - g.sw; return `A${f1(g.sw / 2)} ${f1(g.sd / 2)} 0 0 1 ${f1(xb)} ${f1(g.bodyBottom)}`; }).join(' ') + ' Z';
  const stripes = Array.from({ length: g.n }, (_, i) => i % 2 ? `<rect x="${f1(x0 + i * g.sw)}" y="${f1(g.domeTop - d)}" width="${f1(g.sw)}" height="${f1(underY - g.domeTop + 2 * d)}" fill="${C.roofStripe}"/>` : '').join('');
  return `<clipPath id="${id}"><path d="${outline}"/></clipPath><path d="${outline}" fill="${C.roof}"/><g clip-path="url(#${id})">${stripes}</g><path d="${outline}" fill="none" stroke="${C.ink}" stroke-width="${SHAPE.roof.outline_px}" stroke-linejoin="round"/>`;
}
// 가지(W5 낮은 가지·W7 긴 가지): 가로 줄기(둥근 막대) + 위로 렌즈 모양 잎(원 아님). underY = 줄기 아랫선. 긴 가지 = 같은 모양으로 길고 잎이 많음
export function branchGeom(x0, x1, underY, d) {
  const S = SHAPE.branch, th = S.twig_h_of_d * d, gap = S.leaf_gap_of_d * d, n = Math.max(2, Math.floor((x1 - x0 - gap * 0.5) / gap));
  return { th, top: underY - th - S.leaf_len_of_d * d * 0.95, leaves: Array.from({ length: n }, (_, i) => x0 + gap * 0.75 + i * ((x1 - x0 - gap * 1.5) / Math.max(1, n - 1))) };
}
export function branchSvg(x0, x1, underY, d) {
  const S = SHAPE.branch, g = branchGeom(x0, x1, underY, d), L = S.leaf_len_of_d * d, Wl = S.leaf_w_of_d * d;
  const leaf = (x, i) => { const a = i % 2 ? 28 : -28, y = underY - g.th; return `<path transform="rotate(${a} ${f1(x)} ${f1(y)})" d="M${f1(x)} ${f1(y)} Q${f1(x + Wl)} ${f1(y - L / 2)} ${f1(x)} ${f1(y - L)} Q${f1(x - Wl)} ${f1(y - L / 2)} ${f1(x)} ${f1(y)} Z" fill="${C.leaf}" stroke="${C.ink}" stroke-width="${S.outline_px}" stroke-linejoin="round"/>`; };
  return g.leaves.map(leaf).join('') + `<rect x="${f1(x0)}" y="${f1(underY - g.th)}" width="${f1(x1 - x0)}" height="${f1(g.th)}" rx="${f1(g.th / 2)}" fill="${C.branch}" stroke="${C.ink}" stroke-width="${S.outline_px}"/>`;
}
// 언덕(W6 큰 언덕 3박): 바닥 윗선에서 솟은 반타원, 뒤 층(북·공 뒤). 높이 = balance top_of_Hp(카드는 꼭짓점 × 0.45 근사)
export function hillSvg(x0, x1, floorY, hH, fill) {
  return `<path d="M${f1(x0)} ${f1(floorY)} A${f1((x1 - x0) / 2)} ${f1(hH)} 0 0 1 ${f1(x1)} ${f1(floorY)} Z" fill="${fill}" stroke="${C.ink}" stroke-width="${SHAPE.hill.outline_px}"/>`;
}
// 콤보 표시(HUD 띠 안): 10마다 큰 표지(glow 둥근 네모) + 점 10칸(빈 칸 흰 + 외곽선, 찬 칸 ink). 숫자 없음. align 'left'(x = 왼쪽 끝) / 'right'(x = 오른쪽 끝)
export function comboWidth(tens) { const K = SHAPE.combo; return (tens ? tens * (K.ten_px + K.ten_gap_px) - K.ten_gap_px + K.group_gap_px : 0) + K.slots * (K.slot_px + K.slot_gap_px) - K.slot_gap_px; }
export function comboSvg(x, cy, n, { align = 'left', tensMax = null, pop = null } = {}) {
  const K = SHAPE.combo, tens = Math.floor(n / 10), ones = n % 10, w = comboWidth(tensMax ?? tens);
  let cx = align === 'left' ? x : x - w, s = '';
  for (let i = 0; i < (tensMax ?? tens); i++) {
    const on = i < tens;
    s += `<rect x="${f1(cx)}" y="${f1(cy - K.ten_px / 2)}" width="${K.ten_px}" height="${K.ten_px}" rx="3" fill="${on ? C.glow : 'none'}" stroke="${C.ink}" stroke-width="${on ? 2 : 1.4}"${on ? '' : ' stroke-dasharray="2 2"'}/>`;
    cx += K.ten_px + K.ten_gap_px;
  }
  if (tensMax ?? tens) cx += K.group_gap_px - K.ten_gap_px;
  for (let i = 0; i < K.slots; i++) {
    const on = i < ones, sz = pop === i ? K.slot_px * 1.3 : K.slot_px, o = (sz - K.slot_px) / 2;
    s += `<rect x="${f1(cx - o)}" y="${f1(cy - sz / 2)}" width="${f1(sz)}" height="${f1(sz)}" rx="${K.rx_px}" fill="${on ? C.ink : C.hudTrack}" stroke="${C.ink}" stroke-width="1.4"/>`;
    cx += K.slot_px + K.slot_gap_px;
  }
  return s;
}
export function fingerSvg(x, yTip, h, press = false, taps = 1, { mirror = false, lifted = false } = {}) {
  // 손: 손바닥 + 아래로 뻗은 검지 + 접힌 손가락 2개. 손끝 = (x, yTip). mirror = 좌우 뒤집음(북 왼쪽에 둘 때 손바닥이 북을 덮지 않게)
  // lifted = 손이 바닥에서 떨어져 있음(지붕 카드: 누르지 않음, S8) — 손끝이 바닥 위 0.5h, 누름 선 없음
  const w = h * 0.26, fh = h * 0.5, pw = h * 0.66, ph = h * 0.44, py = yTip - fh - ph * 0.7, sw = f1(Math.max(2, h * 0.05)), dy = lifted ? -h * 0.5 : press ? 0 : -h * 0.18;
  const tf = `translate(0 ${f1(dy)})${mirror ? ` translate(${f1(2 * x)} 0) scale(-1 1)` : ''}`;
  let s = `<g stroke="${C.ink}" stroke-width="${sw}" fill="${C.finger}" stroke-linejoin="round" transform="${tf}">` +
    `<rect x="${f1(x - w / 2 - 1)}" y="${f1(py)}" width="${f1(pw)}" height="${f1(ph)}" rx="${f1(ph * 0.38)}"/>` +
    `<rect x="${f1(x + w / 2)}" y="${f1(py + ph * 0.6)}" width="${f1(w * 0.95)}" height="${f1(ph * 0.6)}" rx="${f1(w * 0.45)}"/>` +
    `<rect x="${f1(x + w * 1.45)}" y="${f1(py + ph * 0.55)}" width="${f1(w * 0.9)}" height="${f1(ph * 0.55)}" rx="${f1(w * 0.45)}"/>` +
    `<rect x="${f1(x - w / 2)}" y="${f1(py + ph * 0.45)}" width="${f1(w)}" height="${f1(yTip - py - ph * 0.45)}" rx="${f1(w / 2)}"/></g>`;
  if (press && !lifted) s += `<g stroke="${C.ink}" stroke-width="${sw}" stroke-linecap="round"><line x1="${f1(x - w)}" y1="${f1(yTip + h * 0.06)}" x2="${f1(x - w * 1.5)}" y2="${f1(yTip + h * 0.14)}"/><line x1="${f1(x + w)}" y1="${f1(yTip + h * 0.06)}" x2="${f1(x + w * 1.5)}" y2="${f1(yTip + h * 0.14)}"/></g>`;
  if (press && !lifted && taps > 1) {
    const x0 = mirror ? x + w / 2 - 1 - (taps - 1) * h * 0.16 : x - w / 2 + 1, y0 = py - h * 0.26;
    s += `<g stroke="${C.ink}" stroke-width="${sw}" stroke-linecap="round">` + Array.from({ length: taps }, (_, i) => `<line x1="${f1(x0 + i * h * 0.16)}" y1="${f1(y0)}" x2="${f1(x0 + i * h * 0.16)}" y2="${f1(y0 + h * 0.16)}"/>`).join('') + '</g>';
  }
  return s;
}
export const fingerBox = (x, yTip, h, { mirror = false, lifted = false, taps = 1 } = {}) => {
  const w = h * 0.26, pw = h * 0.66, dy = lifted ? -h * 0.5 : 0, top = yTip - h * 0.5 - h * 0.44 * 0.7 - (taps > 1 ? h * 0.26 : 0) + dy;
  const a = x - w / 2 - 1, b = x - w / 2 - 1 + Math.max(pw, w * 2.35 + w * 0.9);
  return mirror ? { x0: 2 * x - b, x1: 2 * x - a, y0: top, y1: yTip + h * 0.14 + dy } : { x0: a, x1: b, y0: top, y1: yTip + h * 0.14 + dy };
};
export const bounceLines = (x, skinY, d, n) => {
  let s = '';
  const X = [0.74, 1.07], Lh = [0.45, 0.6];
  for (let i = 0; i < n; i++) for (const side of [-1, 1]) {
    const lx = x + side * X[i] * d, y1 = skinY - 0.08 * d, y0 = y1 - Lh[i] * d;
    s += `<line x1="${f1(lx)}" y1="${f1(y0)}" x2="${f1(lx)}" y2="${f1(y1)}" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`;
  }
  return s;
};
const swingLines = (x, skinY, w) => `<g stroke="${C.ink}" stroke-width="3" stroke-linecap="round"><line x1="${f1(x - w / 2 - 4)}" y1="${f1(skinY - 6)}" x2="${f1(x - w / 2 - 16)}" y2="${f1(skinY - 16)}"/><line x1="${f1(x + w / 2 + 4)}" y1="${f1(skinY - 6)}" x2="${f1(x + w / 2 + 16)}" y2="${f1(skinY - 16)}"/></g>`;
const chevron = (x, y, up) => `<polyline points="${f1(x - 7)},${f1(y + (up ? 5 : -5))} ${f1(x)},${f1(y)} ${f1(x + 7)},${f1(y + (up ? 5 : -5))}" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
export function miniCloud(cx, cy, w, fill, dashed = false) {
  const h = w * 0.62, st = dashed ? ` stroke-dasharray="3 3"` : '';
  return `<g fill="${fill}" stroke="${C.ink}" stroke-width="1.8"${st}><path d="M${f1(cx - w / 2)} ${f1(cy + h / 2)} h${f1(w)} a${f1(h * 0.32)} ${f1(h * 0.32)} 0 0 0 ${f1(-h * 0.2)} ${f1(-h * 0.55)} a${f1(h * 0.42)} ${f1(h * 0.42)} 0 0 0 ${f1(-w * 0.5)} ${f1(-h * 0.15)} a${f1(h * 0.3)} ${f1(h * 0.3)} 0 0 0 ${f1(-w * 0.3 + h * 0.2)} ${f1(h * 0.7)} z"/></g>`;
}
export function flag(x, y, h) { return `<rect x="${f1(x)}" y="${f1(y - h)}" width="2.5" height="${f1(h)}" fill="${C.ink}"/><polygon points="${f1(x + 2.5)},${f1(y - h)} ${f1(x + 2.5 + h * 0.7)},${f1(y - h * 0.78)} ${f1(x + 2.5)},${f1(y - h * 0.56)}" fill="${C.drumBody}" stroke="${C.ink}" stroke-width="1.2"/>`; }

// ---------------- 그림 카드 (가로판 720×336, 칸 3개 210×276) ----------------
export const CARD = {
  W: 720, H: 336, panelW: 210, panelH: 276, panelX: [20, 255, 490], panelY: 30,
  pad: 12, gap: 22, border: 4, rx: 28, screenMargin: 16, textLine: 28,
  d: 30, drumW: 96, drumH: 28, skinH: 8.4, skinY: 178, floorY: 206, laneY: 222, cx: 63,
  Hp: 140, aheadBeats: 1.9, minBallPx: 16,
};
CARD.ppb = (CARD.panelW - CARD.cx) / CARD.aheadBeats; // 77.4 px/박(카드는 칸이 좁아 앞쪽 1.9박만 — R2-D9: 가지 뒤 끝 post 0.17박 × 77.4 = 13.2 px ≥ 표시 반폭 12 + 외곽선 1, 들어가는 표시도 가지 밖)
CARD.beatH = 0.5 * CARD.Hp * 0.6; // 1박 꼭짓점(100 BPM, c = 0.5·Hp/s)
const PW = CARD.panelW + CARD.pad * 2;
const PH = CARD.pad * 2 + CARD.panelH * 3 + CARD.gap * 2;
export function landscapeScale(W, H, st = 0, sb = 0) { return Math.min((W - 2 * CARD.screenMargin) / CARD.W, (H - 2 * CARD.screenMargin - CARD.textLine - st - sb) / CARD.H, 1.4); }
export function portraitScale(W, H, st = 0, sb = 0) { return Math.min((W - 2 * CARD.screenMargin) / PW, (H - 2 * CARD.screenMargin - CARD.textLine - st - sb) / PH, 1.4); }

// 칸 하나 = 그 순간의 길 장면. sc: { marks: [박(북 = 0 기준, 오른쪽 +)], objs: [{type, b0, b1, apexBeats}], ball: {h, dir, trail, seat, hidden}, finger, press, taps, lifted, lines }
// 그림 요소 bbox 를 모아 칸 안에 있는지 검사(N12)
function panel(theme, sc, boxes) {
  const T = P.themes[theme], K = CARD, X = (b) => K.cx + b * K.ppb;
  const add = (b) => boxes.push(b);
  const lift = sc.press && !sc.lifted ? -6.6 : 0;
  let s = `<rect x="0" y="0" width="${K.panelW}" height="${K.panelH}" rx="20" fill="${T.bg1}"/>`;
  s += `<rect x="0" y="${K.floorY}" width="${K.panelW}" height="${K.panelH - K.floorY}" fill="${T.floor}"/><rect x="0" y="${K.floorY}" width="${K.panelW}" height="2" fill="${T.floorEdge}"/>`;
  // 조약돌(흐름 표시, 박 격자 아님)
  for (const px of [22, 97, 151, 188]) s += `<rect x="${px}" y="${K.laneY + 22}" width="9" height="3" rx="1.5" fill="${T.floorEdge}"/>`;
  const objs = sc.objs || [];
  for (const o of objs.filter((o) => o.type === 'hill')) { const hH = 0.45 * 0.5 * K.Hp * 0.6 * o.apexBeats; s += hillSvg(X(o.b0), X(o.b1), K.floorY, hH, T.hill); add({ x0: X(o.b0), x1: X(o.b1), y0: K.floorY - hH, y1: K.floorY, what: 'hill', clip: true }); }
  const sk = K.skinY + lift;
  s += drumSvg(K.cx, sk, K.drumW, K.drumH, K.skinH, { d: K.d, legTo: K.laneY });
  add({ x0: K.cx - K.drumW / 2 - 1, x1: K.cx + K.drumW / 2 + 1, y0: sk - 1, y1: K.laneY, what: 'drum' });
  for (const b of sc.marks || []) { if (X(b) > K.panelW + 10) continue; s += markSvg(X(b), K.laneY, K.d); const mb = markBox(X(b), K.laneY, K.d); add({ ...mb, what: 'mark', clip: mb.x1 > K.panelW - 4 }); }
  const ball = sc.ball;
  if (ball && !ball.hidden) {
    const w = K.d * (1 - 0.55 * Math.min(1, ball.h / K.Hp));
    s += `<ellipse cx="${f1(K.cx)}" cy="${f1(sk + K.skinH / 2)}" rx="${f1(w / 2)}" ry="${f1(Math.max(1.5, w * 0.13))}" fill="${C.shadow}"/>`;
    const top = sk - ball.h - K.d;
    if (ball.trail) s += `<line x1="${K.cx}" y1="${f1(sk - 2)}" x2="${K.cx}" y2="${f1(top + K.d + 4)}" stroke="${C.ink}" stroke-width="2.5" stroke-dasharray="5 6" stroke-linecap="round"/>`;
    s += ballSvg(K.cx, top, K.d, { sq: ball.seat ? 0.92 : ball.h === 0 ? 0.82 : 1 });
    add({ x0: K.cx - K.d / 2, x1: K.cx + K.d / 2, y0: top - (ball.dir === 'up' ? 16 : 0), y1: top + K.d + (ball.dir === 'down' ? 16 : 0), what: 'ball' });
    if (ball.dir === 'up') s += chevron(K.cx, top - 10, true);
    if (ball.dir === 'down') s += chevron(K.cx, top + K.d + 13, false);
  } else if (ball && ball.hidden) {
    s += `<ellipse cx="${f1(K.cx)}" cy="${f1(sk + K.skinH / 2)}" rx="${f1(K.d * 0.225)}" ry="1.8" fill="${C.shadow}"/>`; // 숨은 공: 그림자만(작게)
  }
  for (const o of objs) {
    const x0 = Math.max(-6, X(o.b0)), x1 = Math.min(K.panelW + 6, X(o.b1));
    if (o.type === 'cloud') { const bottom = K.skinY - 0.9 * K.Hp, h = 50; s += cloudSvg(x0, x1, bottom + 6, h); add({ x0, x1, y0: bottom + 6 - h - 2.4, y1: bottom + 6, what: 'cloud', clip: true }); if (o.down) s += chevron(K.cx, bottom + 18, false); }
    if (o.type === 'roof') { const under = K.skinY - (0.3 * K.Hp + 1.35 * K.d); s += roofSvg(x0, x1, under, K.d); const g = roofGeom(x0, x1, under, K.d); add({ x0, x1, y0: g.domeTop - (g.bodyTop - g.domeTop) * 0.5 - 2, y1: under + 1, what: 'roof', clip: true }); }
    if (o.type === 'branch') { const under = K.skinY - (0.14 * K.Hp + 1.3 * K.d); let [bx0, bx1] = [X(o.b0), X(o.b1)]; bx0 = Math.max(-6, bx0); bx1 = Math.min(K.panelW + 6, bx1); s += branchSvg(bx0, bx1, under, K.d); add({ x0: bx0, x1: bx1, y0: branchGeom(bx0, bx1, under, K.d).top - 2, y1: under + 1, what: 'branch', clip: true }); }
  }
  if (sc.lines) s += bounceLines(K.cx, sk, K.d, sc.lines);
  // 박 점(card_three '셋에 톡', lore 7절·X2): 공이 떠난 다음 박부터 하나·둘·셋, 길 아래 바닥 띠에 작은 ink 점, 셋째 점(= 표시가 북에 오는 박 = 탭)은 glow 로 조금 크게. 카드에만(플레이 길에는 박 눈금 없음)
  for (const [i, b] of (sc.dots || []).entries()) { const x = X(b); if (x < -8 || x > K.panelW + 8) continue; const third = i === 2, r = third ? 7 : 5.5, y = K.laneY + 14; s += third ? `<circle cx="${f1(x)}" cy="${y}" r="${r}" fill="${C.glow}" stroke="${C.ink}" stroke-width="2"/>` : `<circle cx="${f1(x)}" cy="${y}" r="${r}" fill="${C.ink}"/>`; add({ x0: x - r - 1, x1: x + r + 1, y0: y - r - 1, y1: y + r + 1, what: 'dot', clip: x - r < 4 || x + r > K.panelW - 4 }); }
  if (sc.finger) {
    const fh = 1.5 * K.d, fx = sc.lifted ? 160 : K.cx - 13, fy = sc.lifted ? 166 + 0.5 * fh : K.panelH - 14; // 떨어진 손(지붕 카드): 북 오른쪽, 길보다 한참 위 공중 — 바닥·북에 닿지 않음이 한눈에, 지붕 아래 // 카드는 북 왼쪽 자리가 좁아 북 아래 바닥 왼쪽(지나간 쪽)을 누름
    s += fingerSvg(fx, fy, fh, sc.press, sc.taps || 1, { mirror: true, lifted: !!sc.lifted });
    add({ ...fingerBox(fx, fy, fh, { mirror: true, lifted: !!sc.lifted, taps: sc.taps || 1 }), what: 'finger' });
  }
  return s;
}

const B = CARD.beatH;
// R2-D9: 가지 구간 = balance objects.branch [첫 반박 − cover_pre_beats, 마지막 반박 + cover_post_beats] (원본 balance, 읽기만)
const BRC = (() => { try { const o = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8')).objects?.branch || {}; return { pre: o.cover_pre_beats ?? 0.25, post: o.cover_post_beats ?? 0.2 }; } catch { return { pre: 0.25, post: 0.2 }; } })();
const br = (first, n) => ({ type: 'branch', b0: first - BRC.pre, b1: first + 0.5 * (n - 1) + BRC.post, n });
// 카드 정의: gid = 00-benchmark 14-3 기믹 id, key = 카드 키(lore strings.json 과 같은 이름). 그림 = 그 레벨 첫 등장의 실제 모양(insights runner-01)
export const DEFS = [
  { gid: 'W0', key: 'card_bounce', level: '01', what: '길·박 표시: 표시가 북 다리 밑에 오면 톡 → 공이 올라감', panels: [
    { marks: [0.6, 1.6, 2.6, 3.6], ball: { h: B * 0.5, dir: 'down' } },
    { marks: [0, 1, 2, 3], ball: { h: 0 }, finger: true, press: true, lines: 1 },
    { marks: [0.6, 1.6, 2.6], ball: { h: B * 0.75, dir: 'up', trail: true } }] },
  { gid: 'W1', key: 'card_big', level: '02', what: '넓은 간격(큰 통 2박): 표시가 멀면 높이 뜸(물체 없음 — 표시 간격이 실루엣)', panels: [
    { marks: [0.8, 2.8], ball: { h: B * 0.4, dir: 'down' } },
    { marks: [1, 2], ball: { h: 2 * B, trail: true } },
    { marks: [0, 1], ball: { h: 0 }, finger: true, press: true, lines: 1 }] }, // L2 첫 등장 "1 1 2 1 1": 낮은 공 + 먼 표시 → 높은 공 → 먼 표시 닿을 때 손가락, 그 뒤는 1박
  { gid: 'W2', key: 'card_cloud', level: '03', what: '구름(4박): 구름이 와서 공이 그 속에 숨었다 내려옴(그림자만)', panels: [
    { marks: [3.7], objs: [{ type: 'cloud', b0: 0.7, b1: 2.7 }], ball: { h: B * 1.1, dir: 'up', trail: true } },
    { marks: [2], objs: [{ type: 'cloud', b0: -1, b1: 1, down: true }], ball: { hidden: true } },
    { marks: [0, 1], objs: [{ type: 'cloud', b0: -3, b1: -1 }], ball: { h: 0 }, finger: true, press: true, lines: 1 }] }, // 구름 = balance objects [접촉 − 3, − 1](2박 폭), L3 첫 등장은 토스로 구름까지
  { gid: 'W3', key: 'card_dot', level: '04', what: '엇간격(점 통 1.5·1.5·1): 길게 · 길게 · 짧게(물체 없음 — 표시 간격이 실루엣)', panels: [
    { marks: [0, 1.5, 3, 4], ball: { h: 0 }, finger: true, press: true, lines: 1 },
    { marks: [0.75, 2.25, 3.25], ball: { h: 1.5 * B, trail: true } },
    { marks: [0.5, 1.5], ball: { h: 0.75 * B, dir: 'down' } }] },
  { gid: 'W4', key: 'card_roof', level: '05', what: '지붕(치지 마): 지붕 밑에 공이 앉아 쉬고 손은 떨어져 있음 → 지붕이 지나가면 공이 스스로 뜸', panels: [
    { marks: [0.3], objs: [{ type: 'roof', b0: 0.7, b1: 2.3 }], ball: { h: B * 0.84, dir: 'down' }, finger: true, lifted: true },
    { marks: [2.5], objs: [{ type: 'roof', b0: -1.1, b1: 0.5 }], ball: { h: 0, seat: true }, finger: true, lifted: true },
    { marks: [1], objs: [{ type: 'roof', b0: -2.5, b1: -0.9 }], ball: { h: B * 0.6, dir: 'up', trail: true }, finger: true, lifted: true }] }, // 지붕 = balance [착지 − 0.6, 착지 + s − 1], L5 첫 지붕 s 2 → 1.6박 폭. 칸 1 = 지붕 앞 마지막 hit 직전(그 표시는 지붕 밖)
  { gid: 'W5', key: 'card_double', level: '06', what: '낮은 가지(반박 짝): 가지 밑에서 표시 둘이 촘촘 → 톡톡', panels: [
    { marks: [0.8, 1.3, 1.8], objs: [br(1.3, 2)], ball: { h: B * 1.92, dir: 'down' } }, // L6 첫 등장 "1 2 .5b .5b": 큰 통(2박)으로 높이 내려오는 공 → 가지
    { marks: [0, 0.5, 1.5], objs: [br(0, 2)], ball: { h: 0 }, finger: true, press: true, taps: 2, lines: 1 },
    { marks: [0.75], objs: [br(-0.75, 2)], ball: { h: 0.75 * B, dir: 'up' } }] }, // R2-D9: 가지 = [첫 반박 − 0.25, 마지막 + 0.2], 밑 표시 2, 들어가는 표시는 가지 밖
  { gid: 'W6', key: 'card_three', level: '07', what: '큰 언덕(3박): 큰 언덕 위로 아주 높이, 셋에 톡(박 점 셋 = 떠난 다음 박부터, 셋째 점 = 표시가 북에 오는 박 = 손가락)', panels: [
    { marks: [], objs: [{ type: 'hill', b0: 0.9, b1: 2.4, apexBeats: 3 }], ball: { h: 0, seat: true } },
    { marks: [1.5], objs: [{ type: 'hill', b0: -0.75, b1: 0.75, apexBeats: 3 }], ball: { h: 3 * B, trail: true }, depart: -1.5, dots: [-0.5, 0.5, 1.5] },
    { marks: [0, 1], objs: [{ type: 'hill', b0: -2.25, b1: -0.75, apexBeats: 3 }], ball: { h: 0 }, finger: true, press: true, lines: 1, depart: -3, dots: [-2, -1, 0] }] }, // 언덕 = balance [접촉 − 2.25, − 0.75](1.5박 폭). L7 첫 등장 = 받침 쉼에 앉은 공 → 토스로 언덕 위 3박
  { gid: 'W7', key: 'card_roll', level: '08', what: '긴 가지(반박 넷): 긴 가지 밑 표시 넷 → 톡톡톡톡', panels: [
    { marks: [0.8, 1.3, 1.8, 2.3, 2.8], objs: [br(1.3, 4)], ball: { h: B * 1.92, dir: 'down' } }, // L8 첫 등장: 토스 → 2박 비행 → 긴 가지
    { marks: [0, 0.5, 1, 1.5], objs: [br(0, 4)], ball: { h: 0 }, finger: true, press: true, taps: 4, lines: 1 },
    { marks: [0.75], objs: [br(-1.75, 4)], ball: { h: 0.75 * B, dir: 'up' } }] }, // R2-D9: 긴 가지 밑 표시 4
];
export const RESERVE_CARD_FILES = []; // R2-D1: 두 공(G5) 예비 카드 card_twoballs 그림 2장 삭제 — 예비는 문서 표에만(30-art 8절)

export function cardKeys() {
  const bal = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8'));
  const g = bal.gimmicks || {};
  return Object.fromEntries(Object.entries(g).filter(([k, v]) => !k.startsWith('_') && v && v.card).map(([k, v]) => [k, { key: v.card, level: v.level }]));
}

function cardSvg(def, boxesOut) {
  const T = P.themes['level' + def.level];
  const parts = [`<rect x="4" y="4" width="712" height="328" rx="${CARD.rx}" fill="${T.cardBg}" stroke="${T.accent}" stroke-width="${CARD.border}"/>`];
  def.panels.forEach((sc, i) => {
    const boxes = [];
    parts.push(`<g transform="translate(${CARD.panelX[i]} ${CARD.panelY})"><clipPath id="${def.key}-p${i}"><rect x="0" y="0" width="${CARD.panelW}" height="${CARD.panelH}" rx="20"/></clipPath><g clip-path="url(#${def.key}-p${i})">${panel('level' + def.level, sc, boxes)}</g></g>`);
    boxesOut.push(boxes);
    if (i < 2) { const ax = CARD.panelX[i] + CARD.panelW + 5, ay = CARD.panelY + CARD.panelH / 2; parts.push(`<polygon points="${ax},${ay - 9} ${ax + 15},${ay} ${ax},${ay + 9}" fill="${C.ink}"/>`); }
  });
  return parts.join('\n');
}

function writeCard(def) {
  const boxes = [];
  const body = cardSvg(def, boxes);
  writeFileSync(join(CARDS, `${def.key}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD.W} ${CARD.H}" width="${CARD.W}" height="${CARD.H}">\n<!-- ${def.key} (기믹 ${def.gid}, 레벨 ${def.level}): ${def.what}. tools/art/cards.mjs 생성, 손으로 고치지 않음. 글 없음. 30-art 8절 -->\n${body}\n</svg>\n`);
  const T = P.themes['level' + def.level];
  const parts = [`<rect x="${CARD.border / 2}" y="${CARD.border / 2}" width="${PW - CARD.border}" height="${PH - CARD.border}" rx="24" fill="${T.cardBg}" stroke="${T.accent}" stroke-width="${CARD.border}"/>`];
  CARD.panelX.forEach((px, i) => {
    const y = CARD.pad + i * (CARD.panelH + CARD.gap);
    parts.push(`<svg x="${CARD.pad}" y="${y}" width="${CARD.panelW}" height="${CARD.panelH}" viewBox="${px} ${CARD.panelY} ${CARD.panelW} ${CARD.panelH}"><use href="#${def.key}-all"/></svg>`);
    if (i < 2) { const ay = y + CARD.panelH + (CARD.gap - 14) / 2, cx = PW / 2; parts.push(`<polygon points="${cx - 12},${ay} ${cx + 12},${ay} ${cx},${ay + 14}" fill="${C.ink}"/>`); }
  });
  writeFileSync(join(CARDS, `${def.key}_portrait.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW} ${PH}" width="${PW}" height="${PH}">\n<!-- ${def.key} 세로 화면판 (가로판 그림을 칸별로 다시 씀, 칸 = 같은 장면). tools/art/cards.mjs 생성. 30-art 8절 -->\n<defs><g id="${def.key}-all">${body.replace(/<polygon points="[^"]+" fill="#[0-9A-F]+"\/>\n?/g, '')}</g></defs>\n${parts.join('\n')}\n</svg>\n`);
  return boxes;
}

// 칸 안에 들어가야 하는 그림(공·북·표시·손가락은 완전히, 지붕·가지·구름은 들어오는 중이라 좌우로 잘려도 됨 — 위아래는 칸 안, 혹 위 여백 ≥ 4 px)
export function checkPanelBoxes(boxes) {
  const bad = [];
  boxes.forEach((pb, i) => pb.forEach((b) => {
    const m = 4, inY = b.y0 >= m - 1e-6 && b.y1 <= CARD.panelH - m + 1e-6, inX = b.clip || (b.x0 >= m - 1e-6 && b.x1 <= CARD.panelW - m + 1e-6);
    if (!inY || !inX) bad.push(`칸${i + 1} ${b.what} (${f1(b.x0)},${f1(b.y0)})~(${f1(b.x1)},${f1(b.y1)})`);
  }));
  return bad;
}

// ---------------- 레벨 선택 카드(글·숫자 없음) ----------------
// 그림: 바탕(bg1) + 바닥 길 + 박 표시 2~3 + 작은 북(다리)·공 + 그 레벨 대표 물체 1개(모양이 레벨마다 다름) + (L9 연·L10 해) 실루엣. accent 테두리.
// 최고 진행도 막대(일반 모드만) + 등급 3칸(카드 바깥 아래, 왼쪽으로 조금 밂) + 최고 콤보 큰 표지(10마다, 0~2개, 카드 안 오른쪽 위에 보임, 글 없음). DOM: 최고 기록 막대(progressbar aria_best)·최고 콤보(meter aria_best_combo)는 버튼 안이 아니라 같은 칸의 버튼 옆 형제 요소(R2-D7)
const LEVEL_OBJ = { '01': [], '02': ['sand'], '03': ['cloud'], '04': ['swing'], '05': ['roof'], '06': ['branch'], '07': ['hill3'], '08': ['branchLong'], '09': ['kite', 'roof'], '10': ['sun', 'branch'] };
export function levelCard(x, y, w, h, lv, st) {
  const T = P.themes['level' + lv];
  let s = '';
  if (st.locked) {
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#E6E7EC" stroke="#9A9DAA" stroke-width="3"/>`;
    const lx = x + w / 2, ly = y + h / 2;
    s += `<path d="M${lx - 9} ${ly - 2} v-8 a9 9 0 0 1 18 0 v8" fill="none" stroke="#6B6F80" stroke-width="4"/><rect x="${lx - 14}" y="${ly - 3}" width="28" height="22" rx="5" fill="#6B6F80"/>`;
    return s;
  }
  const cid = `lc${lv}`;
  s += `<clipPath id="${cid}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14"/></clipPath><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${T.bg1}"/><g clip-path="url(#${cid})">`;
  const fy = y + h * 0.62, laneY = fy + h * 0.08, d = w * 0.12, dW = d * 3.2, dH = d * 0.95, dx = x + w * 0.3, ppb = (x + w - dx) / 3.2;
  s += `<rect x="${x}" y="${f1(fy)}" width="${w}" height="${f1(h - (fy - y))}" fill="${T.floor}"/>`;
  const objs = LEVEL_OBJ[lv] || [];
  const hill = (b0, b1, k) => hillSvg(dx + b0 * ppb, dx + b1 * ppb, fy, h * 0.12 * k, T.hill);
  if (objs.includes('sand')) s += `<ellipse cx="${f1(x + w * 0.88)}" cy="${f1(fy)}" rx="${f1(w * 0.16)}" ry="${f1(h * 0.12)}" fill="${T.accent}"/>`;
  if (objs.includes('swing')) s += `<rect x="${f1(x + w * 0.62)}" y="${f1(y + h * 0.22)}" width="${f1(w * 0.32)}" height="3" fill="${T.accent}"/><rect x="${f1(x + w * 0.64)}" y="${f1(y + h * 0.22)}" width="2.5" height="${f1(fy - y - h * 0.22)}" fill="${T.accent}"/><rect x="${f1(x + w * 0.91)}" y="${f1(y + h * 0.22)}" width="2.5" height="${f1(fy - y - h * 0.22)}" fill="${T.accent}"/>`;
  if (objs.includes('hill3')) s += hill(0.2, 3.2, 1.6);
  if (objs.includes('sun')) s += `<circle cx="${f1(x + w * 0.94)}" cy="${f1(y + h * 0.16)}" r="${f1(w * 0.2)}" fill="${T.accent}"/>`;
  if (objs.includes('kite')) s += `<polygon points="${f1(x + w * 0.86)},${f1(y + h * 0.08)} ${f1(x + w * 0.94)},${f1(y + h * 0.17)} ${f1(x + w * 0.86)},${f1(y + h * 0.27)} ${f1(x + w * 0.78)},${f1(y + h * 0.17)}" fill="${T.accent}"/><rect x="${f1(x + w * 0.857)}" y="${f1(y + h * 0.27)}" width="1.5" height="${f1(h * 0.2)}" fill="${T.accent}"/>`;
  if (lv === '01') s += `<polygon points="${f1(x + w * 0.85)},${f1(fy)} ${f1(x + w * 0.92)},${f1(fy)} ${f1(x + w * 0.885)},${f1(fy - h * 0.1)}" fill="${T.accent}"/>`;
  const MB = { '02': [2], '04': [1.5, 3], '06': [0.4, 2.5], '08': [0.2], '10': [0.4, 2.5] }[lv] || [1, 2]; // 표시 간격 = 그 레벨 새 리듬(L2 넓게, L4 1.5박). 가지 레벨은 썸네일이 좁아 가지 밑 표시를 그리지 않고 가지 밖에만(R2-D9: 반쯤 걸친 표시 0)
  for (const b of MB) if (!(lv === '05' && b === 1)) s += markSvg(dx + b * ppb, laneY, d);
  s += drumSvg(dx, fy - dH, dW, dH, dH * 0.3, { d, legTo: laneY });
  const seat = lv === '05';
  const ballTop = lv === '03' ? y + h * 0.16 : seat ? fy - dH - d * 0.92 : lv === '07' || lv === '02' ? y + h * 0.1 : fy - dH - d - h * 0.16;
  s += ballSvg(dx, ballTop, d, { sq: seat ? 0.92 : 1 });
  if (objs.includes('cloud')) s += cloudSvg(dx - w * 0.22, dx + w * 0.42, y + h * 0.34, h * 0.24);
  if (objs.includes('roof')) s += roofSvg(dx - w * (lv === '09' ? 0.2 : 0.24), dx + w * (lv === '09' ? 0.2 : 0.28), fy - dH - d * 1.5, d);
  if (objs.includes('branch')) s += branchSvg(dx + ppb * 0.8, dx + ppb * 1.9, fy - dH - d * 1.3, d);
  if (objs.includes('branchLong')) s += branchSvg(dx + ppb * 0.5, x + w + 4, fy - dH - d * 1.3, d);
  s += `</g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="none" stroke="${T.accent}" stroke-width="4"/>`;
  const bx = x + 10, bw = w - 20, by = y + h - 16;
  s += `<rect x="${bx}" y="${by}" width="${bw}" height="10" rx="5" fill="${C.hudTrack}" stroke="${C.ink}" stroke-width="2"/>`;
  if (st.best > 0) s += `<rect x="${bx + 2}" y="${by + 2}" width="${f1((bw - 4) * st.best)}" height="6" rx="3" fill="${C.drumBody}"/>`;
  if (st.best > 0 && st.best < 1) s += `<circle cx="${f1(bx + bw * st.best)}" cy="${by + 5}" r="6" fill="${C.ball}" stroke="${C.ink}" stroke-width="2"/>`;
  for (let i = 0; i < Math.min(2, Math.floor((st.bestCombo || 0) / 10)); i++) s += `<rect x="${f1(x + w - 18 - i * 13)}" y="${y + 7}" width="10" height="10" rx="2.5" fill="${C.glow}" stroke="${C.ink}" stroke-width="1.6"/>`; // 화면 자리 = 카드 오른쪽 위, DOM = 버튼 옆 형제 요소(R2-D7·D9 지시)
  for (let i = 0; i < 3; i++) { const gx = x + w / 2 + (i - 1) * 24, gy = y + h + 12; s += i < (st.grade || 0) ? miniCloud(gx, gy, 18, T.accent) : miniCloud(gx, gy, 18, 'none', true); }
  return s;
}

// ---------------- 오브젝트 기준 그림 ----------------
function objects() {
  const w = (name, vb, body, note) => writeFileSync(join(PROJ, 'assets', name), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">\n<!-- ${note} tools/art/cards.mjs 생성 -->\n${body}\n</svg>\n`);
  const T1 = P.themes.level01, T5 = P.themes.level05, T7 = P.themes.level07;
  w('obj-ball.svg', '0 0 64 64', ballSvg(32, 2, 60), '공: 붉은 원 + 외곽선(0.08d) + 왼쪽 위 짧은 빛 호. 줄무늬·하이라이트 점·꼬리 없음.');
  w('obj-drum.svg', '0 0 200 100', drumSvg(100, 2, 192, 57, 16.8, { d: 60, legTo: 96 }), '북: 가로로 넓은 둥근 사각형(3.2d × 0.95d) + 가죽 띠(0.28d) + 가운데 다리(0.22d, 북 몸통 색, 길까지). 박 표시가 다리 밑에 오는 순간 = 공이 가죽에 닿는 순간.');
  w('obj-mark.svg', '0 0 120 40', `<rect x="0" y="20" width="120" height="20" fill="${T1.floor}"/>` + markSvg(30, 24, 30) + markSvg(90, 24, 30), '박 표시(W0): 길 위 낮은 반원 돔, 북 몸통 색 + ink 외곽선, 너비 0.8d·높이 0.4d. 접촉마다 하나, 간격 = 비행 길이. 음표·노트 막대·가시·고리 아님. 친 순간 다리 밑에서 120 ms 동안 작아져 사라짐.');
  w('obj-cloud.svg', '0 0 300 90', cloudSvg(6, 294, 84, 70), '긴 구름(W2·끝 구름): 아래 띠 0.55h + 촘촘한 혹(반지름 0.45h, 간격 = 반지름). 너비 = 길 위 구름 구간(박) + 여유. 공이 이 뒤로 숨음(그림자만 보임).');
  w('obj-roof.svg', '0 0 240 90', roofSvg(10, 230, 84, 40), '지붕(W4, 치지 마): 둥근 윗변 차양 + 넓은 세로 줄무늬(roof·roofStripe) + 아래 반원 물결. 공이 그 밑에 앉아 쉼. 가시·네모 블록·평평한 발판 아님.');
  w('obj-branch.svg', '0 0 200 60', branchSvg(10, 190, 54, 36), '낮은 가지(W5): 가로 줄기 + 렌즈 모양 잎. 그 밑에서 표시 둘이 촘촘(반박 짝).');
  w('obj-branch-long.svg', '0 0 380 60', branchSvg(10, 370, 54, 36), '긴 가지(W7): 같은 모양으로 길고 잎이 많음. 그 밑 표시 넷(반박 넷).');
  w('obj-hill.svg', '0 0 300 110', `<rect x="0" y="90" width="300" height="20" fill="${T7.floor}"/>` + hillSvg(20, 280, 90, 80, T7.hill), '큰 언덕(W6, 3박 비행): 바닥 윗선에서 솟은 반타원, 꼭대기 = balance objects.hill.top_of_Hp(0.30·Hp, 공 높이 기준), 북·공 뒤 층. 공이 언덕 위로 넘어가는 것처럼 보임. 큰 통(W1)·점 통(W3)은 물체 없이 표시 간격이 실루엣.');
  w('obj-finger.svg', '0 0 80 110', fingerSvg(40, 92, 86, true, 1, { mirror: true }), '튜토리얼 손가락(누름, 좌우 뒤집음): 북 왼쪽(지나간 쪽) 바닥. 다가오는 길을 가리지 않음.');
  w('obj-grade-cloud.svg', '0 0 120 40', miniCloud(20, 20, 32, T1.accent) + miniCloud(60, 20, 32, T1.accent) + miniCloud(100, 20, 32, 'none', true), '등급 3칸(채움 = 받음, 점선 = 빈 칸, 늘 3칸). 예: 구름 둘.');
  w('obj-flag.svg', '0 0 40 40', flag(12, 36, 30), '연습 깃발(자동 체크포인트 표시, 버튼 아님).');
  const g = [0, 1, 2].map((n, i) => `<g transform="translate(${i * 130} 0)">${drumSvg(65, 90, 96, 28, 8.4, { glow: n === 2 })}${ballSvg(65, 60, 30, { sq: [0.92, 0.85, 0.75][n] })}${bounceLines(65, 90, 30, n)}</g>`).join('');
  w('obj-grade-fx.svg', '0 0 400 130', g, '판정 반응 3단계(왼→오: 통과 / 좋아 / 딱). 세로 튐 선 0·1·2쌍 + 공 납작 0.92·0.85·0.75, 딱만 가죽 glow.');
  // 콤보(HUD 띠 안): 2 / 7 / 10(큰 표지 1) / 23(큰 표지 2 + 점 3), 5단계 = 5번째 칸 1.3배 튐
  const combo = [[2, null], [5, 4], [10, null], [23, null]].map(([n, pop], i) => comboSvg(8, 14 + i * 26, n, { pop, tensMax: 2 })).join('');
  w('obj-combo.svg', '0 0 200 110', `<rect width="200" height="110" fill="${T1.bg1}"/>` + combo, '콤보 표시(위→아래: 2 / 5 단계(5번째 칸 1.3배 튐) / 10 = 큰 표지 1(점 10개가 빨려 들어감) / 23 = 큰 표지 2 + 점 3). 점선 큰 칸 = 아직 못 채운 큰 표지 자리(가로판에서만, 선택). 숫자·글 없음, 공 색 안 씀, 별 모양 아님.');
  // 실패 3종: 일찍 / 늦음 / 지붕 콩
  const ghost = (x, y, dd) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(dd / 2)}" fill="none" stroke="${C.ink}" stroke-width="2" stroke-dasharray="3 3"/>`;
  const fl = 110, sk = fl - 28, dd = 30;
  const early = `<rect x="0" y="${fl}" width="200" height="30" fill="${T1.floor}"/>${drumSvg(110, sk - 6.6, 96, 28, 8.4)}${swingLines(110, sk - 6.6, 96)}` +
    ghost(110, 20, dd) + `<path d="M110 36 Q 104 70 ${f1(110 - 48 - 19)} ${f1(sk - 4)} L ${f1(110 - 48 - 19)} ${f1(fl - 16)} L 26 ${f1(fl - 16)}" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-dasharray="5 6"/>` + ballSvg(26, fl - dd, dd);
  const late = `<rect x="0" y="${fl}" width="200" height="30" fill="${T1.floor}"/>${drumSvg(90, sk, 96, 28, 8.4)}` + ghost(90, sk - dd / 2, dd) +
    `<path d="M106 ${f1(sk - 14)} L ${f1(90 + 48 + 8)} ${f1(sk - 10)} Q ${f1(90 + 48 + 20)} ${f1(sk)} ${f1(90 + 48 + 20)} ${f1(fl - 16)} L 176 ${f1(fl - 16)}" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-dasharray="5 6"/>` + ballSvg(176, fl - dd, dd);
  const bump = `<rect x="0" y="${fl}" width="200" height="30" fill="${T5.floor}"/>${roofSvg(20, 180, 40, 30)}${drumSvg(90, sk - 6.6, 96, 28, 8.4)}` + ghost(90, sk - dd / 2, dd) +
    `<path d="M90 ${f1(sk - dd)} L 90 ${f1(42 + dd / 2)}" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-dasharray="5 6"/>` + ballSvg(90, 41, dd, { sq: 0.85 }) +
    `<path d="M${f1(90 + 18)} ${f1(58)} Q ${f1(90 + 70)} ${f1(70)} ${f1(90 + 70)} ${f1(fl - 16)} L 186 ${f1(fl - 16)}" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-dasharray="5 6"/>`;
  w('obj-fail.svg', '0 0 640 140', `<g>${early}</g><g transform="translate(220 0)">${late}</g><g transform="translate(440 0)">${bump}</g>`, '실패 3종(글 없음, 먼지 없음, 흔들림 없음). 왼쪽 일찍 = 헛스윙 뒤 공이 그대로 내려와 북 왼쪽 옆으로 떨어짐. 가운데 늦음 = 가죽 위에서 기다렸다 북 오른쪽 끝으로 굴러 떨어짐. 오른쪽 지붕 콩(bump_roof) = 지붕 밑에 앉은 공을 치면 공이 지붕 아래에 살짝 콩 닿고(납작 0.85) 북 오른쪽으로 떨어짐. 점선 = 지나온 길(목업 표시, 빌드는 공 하나만). 세상(길·물체)은 실패 순간 멈춤.');
}

// ---------------- 검사 ----------------
export function checkCards(boxesByKey = null) {
  const out = []; let fail = 0, wait = 0;
  const ok = (n, p, m) => { out.push(`${p ? 'OK  ' : 'FAIL'} ${n}: ${m}`); if (!p) fail++; };
  const pend = (n, m) => { out.push(`대기 ${n}: ${m}`); wait++; };
  let keys = {};
  try { keys = cardKeys(); } catch (e) { pend('balance.json gimmicks', `읽기 실패(balance 수정 중?) ${e.message}`); }
  let strings = null;
  try { strings = JSON.parse(readFileSync(join(PROJ, 'strings.json'), 'utf8')); } catch (e) { pend('strings.json', `읽기 실패(lore 수정 중?) ${e.message}`); }
  const gIds = Object.keys(keys).sort(), v2 = gIds.some((g) => /^W\d$/.test(g));
  if (v2) {
    const mine = Object.fromEntries(DEFS.map((d) => [d.gid, d.key]));
    const diff = gIds.filter((g) => /^W\d$/.test(g)).filter((g) => mine[g] !== keys[g].key).map((g) => `${g}: balance ${keys[g].key} ≠ art ${mine[g] ?? '없음'}`);
    const missing = DEFS.filter((d) => !keys[d.gid]).map((d) => d.gid);
    ok('카드 키 = balance gimmicks(v2)', !diff.length && !missing.length, diff.length || missing.length ? `${diff.join(' / ')} ${missing.length ? '· balance 에 없음 ' + missing.join(',') : ''}` : `W0~W7 ${DEFS.length}장 일치`);
  } else pend('카드 키 = balance gimmicks', `balance.json gimmicks 가 아직 round-1 id(${gIds.join(',')}) — v2(W0~W7) 키가 오면 대조. art 키 = ${DEFS.map((d) => `${d.gid} ${d.key}`).join(', ')} (lore strings.json 이름과 같음)`);
  const want = new Set();
  for (const d of DEFS) {
    for (const f of [`${d.key}.svg`, `${d.key}_portrait.svg`]) { want.add(f); ok(`파일 ${f}`, existsSync(join(CARDS, f)), `기믹 ${d.gid} 레벨 ${d.level}`); }
    if (strings) { const s = strings[d.key]; s ? ok(`문구 ${d.key}`, true, `"${s.ko}" / "${s.en}"`) : pend(`문구 ${d.key}`, 'strings.json 키 없음(lore)'); }
  }
  const extra = existsSync(CARDS) ? readdirSync(CARDS).filter((f) => f.endsWith('.svg') && !want.has(f) && !RESERVE_CARD_FILES.includes(f)) : [];
  ok('남은 카드 파일 0', !extra.length, extra.length ? `쓰이지 않는 파일 ${extra.join(', ')}` : `카드 ${want.size / 2}장 × 2판, 남는 파일 0${RESERVE_CARD_FILES.length ? ' + 예비 ' + RESERVE_CARD_FILES.join(', ') : ' (R2-D1: card_twoballs 삭제)'}`);
  if (existsSync(join(PROJ, 'assets/obj-second-ball.svg'))) ok('두 공 예비 그림 없음', false, 'assets/obj-second-ball.svg 남음(R2-D1)');
  firstAppearance(ok, pend);
  { // R2-D9: 카드 칸마다 가지 밑 표시 = 2(가지)·4(긴 가지), 반쯤 걸친 표시 0 (가지가 칸 밖으로 잘리면 ≤)
    const bad = [], rows = [];
    for (const d of DEFS) d.panels.forEach((p, i) => { for (const o of (p.objs || []).filter((o) => o.type === 'branch')) {
      const n = o.n, X = (b) => CARD.cx + b * CARD.ppb, x0 = X(o.b0), x1 = X(o.b1);
      const halves = Array.from({ length: n }, (_, k) => o.b0 + BRC.pre + 0.5 * k).filter((b) => b >= -1e-6 && X(b) <= CARD.panelW + 10); // 아직 안 친 · 칸에 그려지는 반박 표시
      const xs = (p.marks || []).map(X).filter((x) => x <= CARD.panelW + 10); const u = marksUnder(xs, x0, x1, CARD.d);
      const okN = u.full === halves.length && halves.every((b) => (p.marks || []).some((m) => Math.abs(m - b) < 1e-6));
      rows.push(`${d.key} 칸${i + 1} ${u.full}/${n}`); if (!okN || u.part) bad.push(`${d.key} 칸${i + 1}: 가지 밑 ${u.full}(기대 ${n}) 반쯤 걸침 ${u.part}`);
    } });
    ok('카드 가지 밑 표시 = 톡 횟수(R2-D9)', !bad.length, bad.length ? bad.join(' / ') : rows.join(' · ') + ', 반쯤 걸친 표시 0');
  }
  { // card_three '셋에 톡'(lore X2): 공이 떠난 다음 박부터 박 점 셋(1박 간격), 셋째 점 = 표시가 북·손가락 자리에 오는 박
    const d3 = DEFS.find((d) => d.key === 'card_three'), bad = [], rows = [];
    if (!d3) bad.push('card_three 없음');
    else d3.panels.forEach((p, i) => { if (!p.dots) return; const dd = p.dots; rows.push(`칸${i + 1} 점 ${dd.join('/')}박(떠남 ${p.depart})`);
      if (dd.length !== 3 || dd.some((b, k) => Math.abs(b - (p.depart + 1 + k)) > 1e-9)) bad.push(`칸${i + 1} 점이 떠난 다음 박부터 1박 간격 셋이 아님`);
      if (!(p.marks || []).some((m) => Math.abs(m - dd[2]) < 1e-9)) bad.push(`칸${i + 1} 셋째 점에 표시 없음`);
      if (p.finger && Math.abs(dd[2]) > 1e-9) bad.push(`칸${i + 1} 손가락 칸인데 셋째 점이 북 자리 아님`); });
    const withFinger = d3?.panels.find((p) => p.finger && p.dots), inAir = d3?.panels.find((p) => !p.finger && p.dots && p.dots.every((b) => CARD.cx + b * CARD.ppb >= 0 && CARD.cx + b * CARD.ppb <= CARD.panelW));
    if (!withFinger) bad.push('손가락 칸에 셋째 점 없음'); if (!inAir) bad.push('점 셋이 모두 보이는 칸 없음');
    ok('card_three 박 점 셋(셋에 톡)', !bad.length, bad.length ? bad.join(' / ') : rows.join(' · ') + ' — 점 셋이 다 보이는 칸 1 + 셋째 점 = 손가락 칸');
  }
  if (boxesByKey) for (const [k, boxes] of Object.entries(boxesByKey)) { const bad = checkPanelBoxes(boxes); ok(`칸 안 ${k}`, !bad.length, bad.length ? bad.join(' / ') : '공·북·표시·손가락은 칸 안 4 px 여백, 지붕·가지·구름은 위아래 칸 안(N12)'); }
  return { out, fail, wait };
}
// 튜토리얼 그림 = 실제 첫 등장(insights runner-01): 카드 속 물체 폭(박) = 그 레벨 첫 물체 [beat_in, beat_out] 폭, 물체 없는 기믹(W0·W1·W3)은 카드에도 물체 없음
function firstAppearance(ok, pend) {
  const dir = join(PROJ, 'levels');
  if (!existsSync(dir)) { pend('첫 등장 대조', 'levels/ 없음'); return; }
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const rows = []; let bad = [];
  for (const d of DEFS) {
    const f = files.find((x) => x.startsWith(d.level + '-'));
    if (!f) { pend(`첫 등장 ${d.key}`, `레벨 ${d.level} 파일 없음`); continue; }
    const L = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    if (!L.objects) { pend(`첫 등장 ${d.key}`, 'levels v2 objects 대기'); continue; }
    const types = [...new Set(d.panels.flatMap((p) => (p.objs || []).map((o) => o.type)))];
    if (!types.length) { const lvObj = L.new_gimmick && L.objects.find((o) => o.type !== 'mark' && (o.contacts || []).includes(L.contacts.findIndex((c) => c.first_of_gimmick))); if (lvObj) bad.push(`${d.key}: 레벨 첫 등장에 ${lvObj.type} 있음, 카드엔 없음`); rows.push(`${d.key} 물체 없음`); continue; }
    for (const t of types) {
      const first = L.objects.find((o) => o.type === t && o.role !== 'clear');
      if (!first) { bad.push(`${d.key}: 레벨 ${d.level}에 ${t} 없음`); continue; }
      const want = +(first.beat_out - first.beat_in).toFixed(3);
      const got = [...new Set(d.panels.flatMap((p) => (p.objs || []).filter((o) => o.type === t).map((o) => +(o.b1 - o.b0).toFixed(3))))];
      if (got.some((g) => Math.abs(g - want) > 0.05)) bad.push(`${d.key} ${t} 폭 ${got.join('/')}박 ≠ 첫 ${t} ${want}박`);
      rows.push(`${d.key} ${t} ${want}박`);
    }
  }
  ok('카드 물체 폭 = 레벨 첫 등장 물체 폭', !bad.length, bad.length ? bad.join(' / ') : rows.join(' · '));
}
// 그림만 다시 계산해서 bbox 를 얻음(파일 쓰지 않음)
export function cardBoxes() { const r = {}; for (const d of DEFS) { const b = []; cardSvg(d, b); r[d.key] = b; } return r; }

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/art/cards.mjs');
if (isMain) await main();
async function main() {
  const args = process.argv.slice(2);
  let fail = 0;
  if (!args.includes('--check')) {
    mkdirSync(CARDS, { recursive: true });
    const keep = new Set(RESERVE_CARD_FILES);
    for (const d of DEFS) { writeCard(d); keep.add(`${d.key}.svg`); keep.add(`${d.key}_portrait.svg`); }
    for (const f of readdirSync(CARDS)) if (f.endsWith('.svg') && !keep.has(f)) { rmSync(join(CARDS, f)); console.log(`지움 assets/cards/${f}`); }
    if (existsSync(join(PROJ, 'assets/obj-second-ball.svg'))) { rmSync(join(PROJ, 'assets/obj-second-ball.svg')); console.log('지움 assets/obj-second-ball.svg (두 공 예비 그림 — R2-D1, 예비는 문서에만)'); }
    objects();
    console.log(`카드 ${DEFS.length}장 × 2판, 오브젝트 SVG 씀(레벨 선택 목업은 icons.mjs)`);
  }
  const cc = checkCards(cardBoxes());
  for (const x of cc.out) console.log(x);
  fail += cc.fail;
  console.log('| 화면 | 판 | 배율(보조 글 한 줄 28 px 비움) | 카드 px | 카드 속 공 px | 카드 속 반박 표시 간격 px | 결과 |');
  console.log('|---|---|---|---|---|---|---|');
  for (const [W, H, st, sb] of [[360, 640, 0, 0], [360, 640, 24, 24], [412, 915, 24, 34], [360, 560, 0, 0], [640, 360, 0, 0], [1280, 720, 0, 0]]) {
    const portrait = H > W;
    const s = portrait ? portraitScale(W, H, st, sb) : landscapeScale(W, H, st, sb);
    const ball = s * CARD.d, ok = ball >= CARD.minBallPx;
    if (!ok) fail++;
    console.log(`| ${W}x${H} safe ${st}/${sb} | ${portrait ? '세로' : '가로'} | ${s.toFixed(3)} | ${((portrait ? PW : CARD.W) * s).toFixed(0)}×${((portrait ? PH : CARD.H) * s).toFixed(0)} | ${ball.toFixed(1)} | ${(CARD.ppb * 0.5 * s).toFixed(1)} | ${ok ? '통과' : '실패'} |`);
  }
  console.log(`(참고) 360x640 에 가로판을 띄우면 배율 ${landscapeScale(360, 640).toFixed(3)}, 공 ${(landscapeScale(360, 640) * CARD.d).toFixed(1)} px → 세로판 필수`);
  console.log(fail ? `cards FAIL ${fail}` : `cards OK (카드 8장 × 2판·칸 안 그림·카드 속 공 ≥ 16 px${cc.wait ? `, 대기 ${cc.wait}: balance gimmicks v2` : ''})`);
  process.exit(fail ? 1 : 0);
}
