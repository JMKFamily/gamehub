#!/usr/bin/env node
// round-3 "북길" 그림 카드 5장 생성 (30-art 16-5). 외부 패키지·외부 href 없음.
//   node assets/cards-r3.mjs            assets/cards-r3/card_<id>.svg (가로 720×336, 3칸) 생성
//   그다음 node assets/cards-portrait.mjs --dir cards-r3   → card_<id>_portrait.svg (세로판, 공·별 1.2배)
//
// 칸 규격은 round-2 카드와 같음(칸 i 왼쪽 x = 20 + 235·i, y = 30, 210×276, 칸 사이 삼각형, 카드 속 공 지름 28·별 지름 34).
// 칸 안 그림 = 실제 길 화면과 같은 구성(16-1): 길 띠, 판정 선, 아래 판정 북, 위 공(박마다 착지), 오른쪽에서 오는 별.
// 손가락 = 판정 북 바로 아래(실제 화면 16-1 손가락 자리와 같음, insights "손가락은 플레이어 기준 위치").
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTDIR = join(HERE, 'cards-r3');
const PAL = JSON.parse(readFileSync(join(HERE, 'palette.json'), 'utf8'));
const C = PAL.common;
const f1 = (v) => +v.toFixed(1);

// 칸 안 좌표 (절대 = 카드 좌표)
const PY = 30, PW = 210, PH = 276;
const ROAD_Y0 = 123, ROAD_Y1 = 177, ROAD_YC = 150; // 길 띠 높이 54 = 별 34 × 1.6
const XJ = 44;                                     // 판정 선 = 칸 왼쪽 + 44 (칸 폭의 약 21 %, 세로 화면 20 %와 같은 비)
const STAR_R = 17, BALL_R = 14, DRUM_R = 24;
const DRUM_Y = ROAD_Y1 + 6 + DRUM_R;               // 207
const BALL_Y = ROAD_Y0 - 2 - BALL_R;               // 107 (착지), 뜸 = −7
const HALF = 42;                                   // 반박 간격 = 별 지름 34 + 8 (16-1 규칙과 같은 비)
const BEAT = 2 * HALF;

const starPts = (cx, cy, r) => {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = (-90 + 36 * i) * Math.PI / 180, rr = i % 2 ? r * 0.5 : r;
    p.push(`${f1(cx + rr * Math.cos(a))},${f1(cy + rr * Math.sin(a))}`);
  }
  return p.join(' ');
};
const star = (cx, cy = ROAD_YC, g = 1) => `<polygon points="${starPts(cx, cy, STAR_R * g)}" fill="${C.star}" stroke="${C.outline}" stroke-width="2.5" stroke-linejoin="round"/>`;
// 딱 빛살: 왼쪽 부채꼴 5개(225~315°), 별 끝에서 3 띄워 길이 0.6r (16-3). 오른쪽(읽기 쪽)으로는 없음
const raysPerfect = (cx, cy = ROAD_YC) => [225, 247.5, 270, 292.5, 315].map((a) => {
  const r0 = 1.2 * STAR_R + 3, len = 0.6 * STAR_R;
  return `<rect x="${f1(cx - 1.7)}" y="${f1(cy - r0 - len)}" width="3.4" height="${f1(len)}" rx="1.7" fill="${C.star}" transform="rotate(${a} ${f1(cx)} ${f1(cy)})"/>`;
}).join('');
const passRing = (cx, cy = ROAD_YC) => `<circle cx="${f1(cx)}" cy="${cy}" r="15.3" fill="none" stroke="${C.trackEdge}" stroke-width="2"/><circle cx="${f1(cx)}" cy="${cy}" r="${f1(0.35 * STAR_R)}" fill="${C.trackEdge}"/>`;
const ball = (x, up) => { const y = BALL_Y - (up ? 7 : 0); return `<circle cx="${x}" cy="${y}" r="14" fill="${C.ball}" stroke="${C.outline}" stroke-width="2.5"/><circle cx="${f1(x - 4.2)}" cy="${f1(y - 4.2)}" r="3.9" fill="${C.hud}"/>`; };
const tapFinger = (x) => { const s = 0.42, cy = DRUM_Y + DRUM_R + 8 + 58.8 * s; return `<g transform="translate(${f1(x)} ${f1(cy)}) scale(${s})"><g stroke="${C.outline}" stroke-width="5.4" stroke-linejoin="round" fill="${C.hud}"><rect x="-30.6" y="13.2" width="21.6" height="30.6" rx="10.8" transform="rotate(-25 -19.8 28.5)"/><rect x="-14.4" y="6" width="50.4" height="45" rx="14.4"/><rect x="-9.9" y="-30" width="19.8" height="45" rx="9.9"/></g><g fill="${C.hud}"><rect x="-2.7" y="-58.8" width="5.4" height="14.4" rx="2.7" transform="rotate(-50 0 -30)"/><rect x="-2.7" y="-58.8" width="5.4" height="14.4" rx="2.7"/><rect x="-2.7" y="-58.8" width="5.4" height="14.4" rx="2.7" transform="rotate(50 0 -30)"/></g></g>`; };
const waitHand = (x) => { const s = 0.42, cy = DRUM_Y + DRUM_R + 8 + 32.2 * s; return `<g transform="translate(${f1(x)} ${f1(cy)}) scale(${s})"><g stroke="${C.outline}" stroke-width="4.8" stroke-linejoin="round" fill="${C.hud}"><rect x="-24.8" y="-25.8" width="11.2" height="36.8" rx="5.6"/><rect x="-12" y="-32.2" width="11.2" height="43.2" rx="5.6"/><rect x="0.8" y="-30.6" width="11.2" height="41.6" rx="5.6"/><rect x="13.6" y="-24.2" width="11.2" height="35.2" rx="5.6"/><rect x="-36.8" y="7.8" width="12" height="25.6" rx="6" transform="rotate(-35 -30.4 20.6)"/><rect x="-26.4" y="1.4" width="52.8" height="43.2" rx="14.4"/></g></g>`; };
// 다가옴 표시: 별 오른쪽 작은 점 3개(trackEdge, 투명도 없음, 별 모양 아님)
const comeDots = (cx) => [1, 2, 3].map((k) => { const x = cx + STAR_R + 3 + 6 * k; return x < 228 + 0 ? `<circle cx="${f1(x)}" cy="${ROAD_YC}" r="${f1(3.2 - 0.6 * k)}" fill="${C.trackEdge}"/>` : ''; }).join('');

function panel(i, T, stage, { stars = [], judgedPerfect = [], pass = [], ballUp = false, finger = null, ripple = false, barAt = [], dots = [] }) {
  const px = 20 + 235 * i, xj = px + XJ;
  const track = T['track' + stage];
  const s = [];
  s.push(`<rect x="${px}" y="${PY}" width="${PW}" height="${PH}" rx="20" fill="${T.bg}"/>`);
  // 길 띠 + 가장자리
  s.push(`<rect x="${px}" y="${ROAD_Y0}" width="${PW}" height="${ROAD_Y1 - ROAD_Y0}" fill="${track}"/>`);
  s.push(`<rect x="${px}" y="${ROAD_Y0 - 0.75}" width="${PW}" height="1.5" fill="${C.trackEdge}"/><rect x="${px}" y="${ROAD_Y1 - 0.75}" width="${PW}" height="1.5" fill="${C.trackEdge}"/>`);
  // 박 눈금(정박만, 아랫변 안쪽 작은 네모) — 판정 선 자리에서 한 박 간격
  for (let x = xj - BEAT * Math.floor(XJ / BEAT); x <= px + PW - 4; x += BEAT) if (x >= px + 4) s.push(`<rect x="${f1(x - 3)}" y="${ROAD_Y1 - 9}" width="6" height="6" rx="1" fill="${C.trackEdge}" fill-opacity="0.8"/>`);
  // 마디 표: 아랫변에서 띠 높이 30 % 짧은 세로 막대
  for (const dx of barAt) s.push(`<rect x="${f1(xj + dx - 2)}" y="${f1(ROAD_Y1 - 0.3 * (ROAD_Y1 - ROAD_Y0))}" width="4" height="${f1(0.3 * (ROAD_Y1 - ROAD_Y0))}" rx="1.5" fill="${C.trackEdge}"/>`);
  // 판정 북 + 판정 선(가는 선, 북 위끝 → 길 윗변)
  s.push(`<circle cx="${xj}" cy="${DRUM_Y}" r="${DRUM_R}" fill="${T.drum}" stroke="${C.trackEdge}" stroke-width="2"/><circle cx="${xj}" cy="${DRUM_Y}" r="17" fill="none" stroke="${C.hud}" stroke-opacity="0.35" stroke-width="2"/>`);
  if (ripple) s.push(`<circle cx="${xj}" cy="${DRUM_Y}" r="${f1(DRUM_R * 1.18)}" fill="none" stroke="${C.hud}" stroke-width="2"/>`);
  s.push(`<rect x="${xj - 3}" y="${ROAD_Y0}" width="6" height="${DRUM_Y - DRUM_R - ROAD_Y0}" fill="${C.hud}" stroke="${C.outline}" stroke-width="1"/>`);
  for (const dx of pass) s.push(passRing(xj + dx));
  for (const dx of stars) s.push(star(xj + dx));
  for (const dx of dots) s.push(comeDots(xj + dx));
  for (const dx of judgedPerfect) s.push(raysPerfect(xj + dx) + star(xj + dx, ROAD_YC, 1.2));
  s.push(ball(xj, ballUp));
  if (finger === 'tap') s.push(tapFinger(xj));
  if (finger === 'wait') s.push(waitHand(xj));
  if (i < 2) { const ax = px + PW + 5.3; s.push(`<polygon points="${f1(ax)},138 ${f1(ax + 16.8)},150 ${f1(ax)},162" fill="${C.trackEdge}"/>`); }
  return s.join('');
}

const CARDS = [
  { id: 'card_star_tap', theme: 'level01', level: 1, note: '① 별이 오른쪽에서 다가옴(공은 떠 있음) ② 별이 판정 선에 닿고 공이 착지하는 순간 판정 북 아래 손가락 톡 ③ 딱(왼쪽 빛살 5개 + 북 물결)',
    panels: [
      { stage: 1, stars: [118], dots: [118], ballUp: true },
      { stage: 2, stars: [0, BEAT], finger: 'tap' },
      { stage: 2, judgedPerfect: [-6], stars: [BEAT - 6], ripple: true }] },
  { id: 'card_half_star', theme: 'level02', level: 2, note: '① 붙은 별 2개(반박)가 다가옴 ② 첫 별 톡 ③ 바로 다음 별 톡(첫 별은 판정 뒤 왼쪽으로 흘러 나감)',
    panels: [
      { stage: 1, stars: [BEAT, BEAT + HALF], dots: [BEAT + HALF], ballUp: true },
      { stage: 2, stars: [0, HALF], finger: 'tap' },
      { stage: 2, stars: [0], finger: 'tap' }] },
  { id: 'card_rest_beat', theme: 'level03', level: 3, note: '① 별 톡 ② 판정 선에 별이 없는 박: 손바닥 펴고 기다림(다음 별은 아직 오는 중) ③ 다음 별 톡',
    panels: [
      { stage: 1, stars: [0, 2 * BEAT - 20], finger: 'tap' },
      { stage: 2, stars: [BEAT - 20], dots: [BEAT - 20], finger: 'wait' },
      { stage: 2, stars: [0], finger: 'tap' }] },
  { id: 'card_two_bar', theme: 'level06', level: 6, note: '(가정: L6 새 기믹 = 마디 표를 넘어 이어지는 긴 덩어리, balance 확정 전) ① 마디 표를 넘어 이어진 별 줄이 다가옴 ② 첫 별 톡 ③ 마디 표를 지나도 이어서 톡',
    panels: [
      { stage: 1, stars: [20, 20 + HALF, 20 + BEAT + HALF], barAt: [20 + BEAT], ballUp: true },
      { stage: 2, stars: [0, HALF, BEAT + HALF], barAt: [BEAT], finger: 'tap' },
      { stage: 2, stars: [0], barAt: [-HALF + 8], finger: 'tap' }] },
  { id: 'card_run4', theme: 'level07', level: 7, note: '① 반박 간격으로 붙은 별 4개가 다가옴 ② 첫 별을 치고 둘째 별이 닿을 때 톡 ③ 넷째 별 딱',
    panels: [
      { stage: 1, stars: [12, 12 + HALF, 12 + 2 * HALF, 12 + 3 * HALF], ballUp: true },
      { stage: 2, stars: [0, HALF, 2 * HALF], finger: 'tap' },
      { stage: 2, judgedPerfect: [-4], stars: [], ripple: true }] },
];

mkdirSync(OUTDIR, { recursive: true });
for (const c of CARDS) {
  const T = PAL.themes[c.theme];
  const body = c.panels.map((p, i) => panel(i, T, p.stage, p)).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 336" width="720" height="336">
<!-- 카드 ${c.id} (레벨 ${c.level}, 처음 1회, round-3 북길, assets/cards-r3.mjs 가 생성): ${c.note}. 보조 문구 없음, aria-label 키 ${c.id}(lore). 30-art 16-5 --><rect x="4" y="4" width="712" height="328" rx="28" fill="${T.bgFar}" stroke="${T.cardTint}" stroke-width="4"/>${body}
</svg>
`;
  if (/href="(?!#)/.test(svg) || /url\((?!#)/.test(svg)) throw new Error('외부 참조');
  writeFileSync(join(OUTDIR, c.id + '.svg'), svg);
  console.log(`${c.id}.svg`);
}
