#!/usr/bin/env node
// rhythm-02 팔레트 원본 생성 + 대비 검사. 30-art 2절. (round-2: 흘러오는 길 물체 색·콤보 색·결과 구름 끝색·배경 실루엣 v2)
//   node tools/art/palette.mjs           assets/palette.json 쓰기 + 대비 검사
//   node tools/art/palette.mjs --check   assets/palette.json 을 읽어 검사만 (실패 시 종료 코드 1)
// 색을 바꾸려면 아래 COMMON·THEMES 만 고치고 다시 돌린 뒤 30-art 2절 표를 이 출력으로 바꿉니다.
// 대비 = WCAG 2.x 상대 명도 대비. 외부 패키지 없음.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = resolve(HERE, '../..');
const OUT = join(PROJ, 'assets/palette.json');

export const hsl = (h, s, l) => {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
};
export const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
export const mix = (a, b, t) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
const hueOf = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round(((h * 60) + 360) % 360);
};

// 10레벨 공통 색 (레벨마다 바뀌지 않음, 30-art 2-1). 흘러오는 물체 색도 공통(같은 모양 = 같은 뜻, 10레벨 같음)
const COMMON = {
  ball: '#A42412',      // 공(나·판정 대상). 붉은 고무공. 공·최고 기록 점 전용(콤보에 쓰지 않음)
  ballShine: '#FFD9CC', // 공 왼쪽 위 짧은 빛 호
  ink: '#23273A',       // 외곽선, 튐 선, 콤보 점(찬 칸)
  drumBody: '#234C88',  // 북 몸통·북 다리, 박 표시(= "북으로 오는 것"), 진행도 채움, 시도 점
  skin: '#FFF3D6',      // 북 가죽(윗면 띠)
  shadow: '#8F7748',    // 북 가죽 위 공 그림자
  glow: '#FFC861',      // '딱' 가죽 빛 + 콤보 10마다 큰 표지(별 모양 아님, 둥근 네모)
  cloud: '#FFFFFF',     // 구름 면(흘러오는 구름 W2·끝 구름)
  hudTrack: '#FFFFFF',  // 진행도 막대·버튼 바탕·콤보 빈 칸
  finger: '#FFFFFF',    // 튜토리얼 손가락 면
  // --- round-2 흘러오는 물체 (형태 언어 30-art 3-2) ---
  roof: '#6B3E8E',      // 지붕(W4, 치지 마) 차양 면: 보랏빛 자두색 — 공(빨강)·북(파랑)·바탕(밝은 파스텔)과 다름, 바탕 대비 ≥ 4.5(위험 요소 기준)
  roofStripe: '#F1E4FA',// 지붕 차양 줄무늬(넓은 세로 띠 2색, 평면)
  branch: '#6E4520',    // 가지(W5·W7) 줄기
  leaf: '#1E6330',      // 가지 잎(렌즈 모양, 원 아님 — 공과 헷갈리지 않게)
};

// [키, lore 이름 키, 색 방향, 색상각, 바탕 채도]. round-2: L5 작은 마을(새), L6 물웅덩이(L5에서 옮김) — lore 10-lore 4절
const THEMES = [
  ['level01', 'level1_name', '잔디 연두', 95, 52],
  ['level02', 'level2_name', '모래 베이지', 42, 60],
  ['level03', 'level3_name', '맑은 하늘', 205, 62],
  ['level04', 'level4_name', '라일락', 280, 45],
  ['level05', 'level5_name', '마을 벽돌 장미', 12, 50],
  ['level06', 'level6_name', '물웅덩이 청록', 182, 50],
  ['level07', 'level7_name', '언덕 초록', 140, 42],
  ['level08', 'level8_name', '나무 살구', 28, 62],
  ['level09', 'level9_name', '연 하늘 남보라', 232, 55],
  ['level10', 'level10_name', '햇살 금빛', 50, 80],
];

// 배경 실루엣 v2 (round-2: 흘러감). 기본 도형 3개 이하, 외곽선 없음, sil 색 한 가지.
//   x: 배경 띠(tile, 너비 = 화면 W) 안 가로 비율. 띠가 parallax 비율 속도로 왼쪽으로 흘러 끝없이 이어짐(parallax 0 = 멈춤).
//   anchor 'floor': dy = 바닥 윗선에서 도형 아랫변까지 높이(S 단위, 0 = 바닥에 붙음 — N13 떠 보임 금지).
//   anchor 'sky'  : dy = HUD 띠 아래선에서 도형 윗변까지(S 단위). 모든 도형 윗선 ≥ HUD 띠 아래(M2 일반화, layout 검사).
//   크기 w·h·rx·ry·r = S 단위. 그 레벨의 위험·이유 물체(지붕·가지·언덕·구름)를 닮은 모양 금지(lore 4절), 공 크기 원 금지, 줄지어 떨어지는 도형 금지.
const SIL = {
  level01: [{ t: 'rect', x: 0, anchor: 'floor', dy: 0, w: 'full', h: 0.045, what: '낮은 풀밭 띠' }, { t: 'tri', x: 0.18, anchor: 'floor', dy: 0, w: 0.10, h: 0.08, what: '풀 한 포기' }, { t: 'tri', x: 0.72, anchor: 'floor', dy: 0, w: 0.12, h: 0.10, what: '풀 한 포기' }],
  level02: [{ t: 'ellipse', x: 0.15, anchor: 'floor', dy: 0, rx: 0.20, ry: 0.10, what: '모래 더미(반만 보임)' }, { t: 'tri', x: 0.70, anchor: 'floor', dy: 0, w: 0.16, h: 0.14, what: '모래성 세모' }],
  level03: [],
  level04: [{ t: 'rect', x: 0.55, anchor: 'floor', dy: 0.40, w: 0.26, h: 0.025, what: '그네 가로 막대' }, { t: 'rect', x: 0.58, anchor: 'floor', dy: 0, w: 0.014, h: 0.40, what: '그네 기둥' }, { t: 'rect', x: 0.79, anchor: 'floor', dy: 0, w: 0.014, h: 0.40, what: '그네 기둥' }],
  level05: [{ t: 'rect', x: 0.12, anchor: 'floor', dy: 0, w: 0.16, h: 0.12, what: '멀리 작은 집(네모, 지붕 모양 없음)' }, { t: 'rect', x: 0.24, anchor: 'floor', dy: 0.12, w: 0.03, h: 0.05, what: '굴뚝' }, { t: 'rect', x: 0.62, anchor: 'floor', dy: 0, w: 0.22, h: 0.035, what: '낮은 울타리 띠' }],
  level06: [{ t: 'ellipse', x: 0.20, anchor: 'floor', dy: 0, rx: 0.17, ry: 0.035, what: '납작한 웅덩이' }, { t: 'ellipse', x: 0.70, anchor: 'floor', dy: 0, rx: 0.12, ry: 0.028, what: '작은 웅덩이' }],
  level07: [{ t: 'rect', x: 0.70, anchor: 'floor', dy: 0, w: 0.012, h: 0.32, what: '바람개비 막대' }, { t: 'pinwheel', x: 0.706, anchor: 'floor', dy: 0.32, r: 0.06, what: '바람개비(세모 4개, 정지, 회전 없음)' }, { t: 'rect', x: 0, anchor: 'floor', dy: 0, w: 'full', h: 0.03, what: '낮은 들 띠(배경 언덕 대신 — 큰 언덕 물체와 헷갈리지 않게)' }],
  level08: [{ t: 'rect', x: 0.66, anchor: 'floor', dy: 0, w: 0.07, h: 0.42, what: '나무 기둥' }, { t: 'tri', x: 0.695, anchor: 'floor', dy: 0.36, w: 0.26, h: 0.30, what: '잎(세모, 가지 물체와 다른 모양)' }],
  level09: [{ t: 'diamond', x: 0.72, anchor: 'sky', dy: 0.04, w: 0.09, h: 0.13, what: '마름모 연' }, { t: 'rect', x: 0.718, anchor: 'sky', dy: 0.17, w: 0.004, h: 0.34, what: '연 줄' }],
  level10: [{ t: 'sun', x: 0.97, anchor: 'sky', dy: 0.02, r: 0.2, parallax: 0, what: '큰 해(공 지름 5배 이상, 오른쪽 구석에 반쯤 걸침, 멈춰 있음 — 공과 크기·자리 다름)' }, { t: 'rect', x: 0, anchor: 'floor', dy: 0, w: 'full', h: 0.03, what: '낮은 금빛 띠' }],
};

const solveL = (h, s, target) => { let best = null; for (let L = 20; L <= 80; L += 0.25) { const c = hsl(h, s, L); const d = Math.abs(lum(c) - target); if (!best || d < best.d) best = { c, d }; } return best.c; };

export function build() {
  const themes = {};
  for (const [k, nameKey, dir, h, s] of THEMES) {
    const accent = solveL(h, Math.min(85, s + 10), 0.17);
    themes[k] = {
      name_key: nameKey, direction: dir, hue: h,
      bg1: hsl(h, s, 93), bg2: hsl(h, Math.min(90, s + 6), 90.5), bg3: hsl(h, Math.min(92, s + 12), 88),
      floor: hsl(h, Math.max(20, s - 18), 80),       // 흘러오는 바닥 길 띠
      floorEdge: hsl(h, Math.max(18, s - 22), 50),   // 바닥 윗선 2 px + 길 조약돌(흐름이 보이게, 박 격자 아님)
      accent,                                         // 레벨 카드 테두리, 등급 구름 채움, 콤보 20 색 조각
      clearCloud: mix(COMMON.cloud, accent, 0.35),    // 클리어 끝 구름 섞기 끝값(N11: 등급 칸 accent 와 다른 연한 색)
      hill: hsl(h, Math.min(70, s + 6), 79),          // 언덕(W1 둔덕·W3 작은 둔덕·W6 큰 언덕) 면, ink 외곽선과 함께
      cardBg: hsl(h, Math.min(92, s + 12), 88),
      sil: hsl(h, Math.max(20, s - 10), 85.5),        // 배경 실루엣 한 가지 색(흐리게)
      silhouette: SIL[k],
    };
  }
  return {
    schema_version: 2,
    _source: 'tools/art/palette.mjs 가 생성(art-director 원본). 30-art 2절 표는 요약이고, 표와 이 파일이 다르면 이 파일이 기준. 빌드는 이 파일만 읽음(문서 표 파싱 금지).',
    _rules: [
      '공통 색(common)은 10레벨 같음. 흘러오는 물체(표시·지붕·가지·구름)도 공통 색 = 같은 모양은 어느 레벨에서나 같은 뜻. 레벨마다 바뀌는 것은 themes 의 바탕·바닥·accent·언덕·실루엣.',
      '투명도(alpha) 없음. 그림자·튐 선·빛·콤보 연출 모두 불투명 단색.',
      '플레이 중 바탕 단계 = n번째 받침 쉼에서 min(n,3) 단계(bg1·bg2·bg3), 그 받침 쉼 첫 마디 동안 선형 섞기(번쩍임·깜빡임 없음).',
      '클리어: 끝 구름 면 cloud → clearCloud(= cloud 와 accent 의 35 % 섞음) 1 s, 등급 칸만 진한 accent(N11). 바탕은 그때 단계 → bg1 로 1 s.',
      '공 색(ball)은 공과 최고 기록 점에만(콤보·물체에 쓰지 않음). 북 몸통 색(drumBody)은 북·북 다리·박 표시·진행도 채움·시도 점에만.',
      '콤보: 찬 칸 = ink, 빈 칸 = hudTrack + ink 외곽선, 10마다 큰 표지 = glow 둥근 네모 + ink 외곽선, 20 단계 색 조각 = 그 레벨 accent(HUD 띠 안). 바탕 단계(바탕 전체 색)와 모양이 겹치지 않음.',
      '노랑 별·하늘색 공·어두운 바탕(rhythm-01), 가시·네모 블록·발판·고리·포털 모양(runner-01·원작)을 쓰지 않음(30-art 10절).',
      'silhouette v2: anchor floor(dy = 바닥 위 높이) / sky(dy = HUD 띠 아래에서), 크기 S 단위, parallax(기본 0.5) 로 흘러감.',
    ],
    common: { ...COMMON },
    themes,
  };
}

// 대비 검사 쌍: [이름, 앞색, 뒤색, 기준]
export function pairs(P) {
  const C = P.common, out = [];
  for (const [k, t] of Object.entries(P.themes)) {
    for (const bg of ['bg1', 'bg2', 'bg3']) {
      out.push([`${k} 공 / ${bg}`, C.ball, t[bg], 4.5]);
      out.push([`${k} 북 몸통 / ${bg}`, C.drumBody, t[bg], 4.5]);
      out.push([`${k} 외곽선 / ${bg}`, C.ink, t[bg], 7]);
      out.push([`${k} 지붕(위험, 치지 마) / ${bg}`, C.roof, t[bg], 4.5]);
      out.push([`${k} 가지 줄기 / ${bg}`, C.branch, t[bg], 4.5]);
      out.push([`${k} 가지 잎 / ${bg}`, C.leaf, t[bg], 4.5]);
      out.push([`${k} 언덕 외곽선(ink) / ${bg}`, C.ink, t[bg], 7]);
    }
    out.push([`${k} 공 / floor`, C.ball, t.floor, 3]);
    out.push([`${k} 외곽선 / floor`, C.ink, t.floor, 4.5]);
    out.push([`${k} 박 표시(북 몸통 색) / floor`, C.drumBody, t.floor, 4.5]);
    out.push([`${k} 조약돌(floorEdge) / floor (흐름만, 표시보다 약하게 ≥ 1.5)`, t.floorEdge, t.floor, 1.5]);
    out.push([`${k} accent(카드 테두리·등급 구름) / cardBg(=bg3)`, t.accent, t.cardBg, 3]); out.push([`${k} accent / bg1(레벨 카드)`, t.accent, t.bg1, 3]);
    out.push([`${k} 외곽선 / accent`, C.ink, t.accent, 3]);
    out.push([`${k} 바닥 윗선 / floor`, t.floorEdge, t.floor, 1.5]);
    out.push([`${k} 공 / 실루엣`, C.ball, t.sil, 4.5]);
    out.push([`${k} 공 / 언덕(언덕 앞을 지나감)`, C.ball, t.hill, 3]);
    out.push([`${k} 외곽선 / 언덕`, C.ink, t.hill, 4.5]);
    out.push([`${k} 공 / 끝 구름(clearCloud)`, C.ball, t.clearCloud, 4.5]);
    out.push([`${k} 등급 칸 accent / 끝 구름(clearCloud) (N11 ≥ 2)`, t.accent, t.clearCloud, 2]);
    out.push([`${k} 콤보 20 색 조각(accent) / HUD 바탕 bg1~3`, t.accent, t.bg3, 3]);
    out.push([`${k} 실루엣 / bg1 (너무 튀지 않게 ≤ 1.6)`, t.sil, t.bg1, 1.0]);
    if (contrast(t.sil, t.bg1) > 1.6) out.push([`${k} 실루엣이 너무 진함`, '#000000', '#000000', 99]);
  }
  out.push(['공 / 북 가죽', C.ball, C.skin, 4.5]);
  out.push(['공 / 딱 빛(glow)', C.ball, C.glow, 3]);
  out.push(['공 / 구름', C.ball, C.cloud, 4.5]);
  out.push(['공 / 지붕 차양 면(지붕 밑에 앉음)', C.ball, C.roofStripe, 4.5]);
  out.push(['지붕 줄무늬 / 지붕 면', C.roofStripe, C.roof, 4.5]);
  out.push(['외곽선 / 지붕 줄무늬', C.ink, C.roofStripe, 7]);
  out.push(['공 빛 호 / 공', C.ballShine, C.ball, 3]);
  out.push(['그림자 / 북 가죽', C.shadow, C.skin, 3]);
  out.push(['외곽선 / 북 가죽', C.ink, C.skin, 7]);
  out.push(['북 가죽 / 북 몸통', C.skin, C.drumBody, 4.5]);
  out.push(['진행도 채움 / 막대 바탕', C.drumBody, C.hudTrack, 4.5]);
  out.push(['최고 기록 점(공 색) / 막대 바탕', C.ball, C.hudTrack, 4.5]);
  out.push(['콤보 찬 칸(ink) / 빈 칸(hudTrack)', C.ink, C.hudTrack, 7]);
  out.push(['외곽선 / 콤보 큰 표지(glow)', C.ink, C.glow, 7]);
  out.push(['외곽선 / 손가락 면', C.ink, C.finger, 7]);
  return out;
}

export function check(P) {
  let fail = 0;
  const rows = [];
  for (const [n, a, b, min] of pairs(P)) {
    const r = contrast(a, b);
    const ok = r >= min;
    if (!ok) fail++;
    rows.push({ n, a, b, r, min, ok });
  }
  const hs = Object.values(P.themes).map((t) => t.hue);
  const diffs = hs.slice(1).map((h, i) => { const d = Math.abs(h - hs[i]) % 360; return Math.min(d, 360 - d); });
  if (diffs.some((d) => d < 30)) fail++;
  // 물체 색끼리 구분(색상각): 지붕 ↔ 공 ↔ 북 ↔ 잎 ≥ 40°
  const objHues = { ball: hueOf(P.common.ball), drumBody: hueOf(P.common.drumBody), roof: hueOf(P.common.roof), leaf: hueOf(P.common.leaf), branch: hueOf(P.common.branch) };
  const objPairs = [['roof', 'ball'], ['roof', 'drumBody'], ['leaf', 'ball'], ['roof', 'leaf']];
  const objDiffs = objPairs.map(([a, b]) => { const d = Math.abs(objHues[a] - objHues[b]) % 360; return [`${a}↔${b}`, Math.min(d, 360 - d)]; });
  if (objDiffs.some(([, d]) => d < 40)) fail++;
  // 배경 실루엣 v2 형식: anchor·dy 있음, 그 레벨 위험 물체 닮은 이름 없음(지붕·가지·언덕·구름)
  const silBad = [];
  for (const [k, t] of Object.entries(P.themes)) for (const e of t.silhouette || []) {
    if (!['floor', 'sky'].includes(e.anchor) || typeof e.dy !== 'number') silBad.push(`${k} ${e.what}: anchor/dy`);
    if (/^(지붕|가지|구름|언덕)/.test(e.what)) silBad.push(`${k} ${e.what}: 위험·이유 물체와 같은 이름`);
  }
  if (silBad.length) fail++;
  return { rows, fail, diffs, objDiffs, silBad };
}

const args = process.argv.slice(2);
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/art/palette.mjs');
if (isMain) {
  const P = args.includes('--check') ? JSON.parse(readFileSync(OUT, 'utf8')) : build();
  if (!args.includes('--check')) writeFileSync(OUT, JSON.stringify(P, null, 1) + '\n');
  const { rows, fail, diffs, objDiffs, silBad } = check(P);
  const groups = {};
  for (const r of rows) {
    const g = r.n.replace(/^level\d\d /, '').replace(/ \/ bg\d/, ' / bg1~3');
    if (!groups[g] || r.r < groups[g].r) groups[g] = r;
  }
  console.log('| 쌍 | 최소 대비 | 어디서 | 기준 | 결과 |');
  console.log('|---|---|---|---|---|');
  for (const [g, r] of Object.entries(groups)) console.log(`| ${g} | ${r.r.toFixed(2)} | ${r.n.split(' ')[0].startsWith('level') ? r.n.split(' ')[0] : '공통'} | ${r.min} | ${r.ok ? '통과' : '실패'} |`);
  console.log(`\n전체 ${rows.length}쌍, 실패 ${rows.filter((r) => !r.ok).length}`);
  console.log(`이웃 레벨 색상각 차: ${diffs.join(' / ')} (기준 ≥ 30°)`);
  console.log(`물체 색상각 차: ${objDiffs.map(([n, d]) => `${n} ${d}°`).join(', ')} (기준 ≥ 40°)`);
  if (silBad.length) console.log('실루엣 형식 실패: ' + silBad.join(' / '));
  console.log('\n| 키 | bg1 | bg2 | bg3 | floor | accent | clearCloud | hill |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const [k, t] of Object.entries(P.themes)) console.log(`| ${k} ${t.direction} | \`${t.bg1}\` | \`${t.bg2}\` | \`${t.bg3}\` | \`${t.floor}\` | \`${t.accent}\` | \`${t.clearCloud}\` | \`${t.hill}\` |`);
  console.log(`\n공 색상각 ${hueOf(P.common.ball)}°, 북 몸통 ${hueOf(P.common.drumBody)}°, 지붕 ${hueOf(P.common.roof)}°, 공 상대 명도 ${lum(P.common.ball).toFixed(3)}, bg1 상대 명도 범위 ${Math.min(...Object.values(P.themes).map((t) => lum(t.bg1))).toFixed(3)}~${Math.max(...Object.values(P.themes).map((t) => lum(t.bg1))).toFixed(3)}`);
  console.log(fail ? `palette FAIL ${fail}` : 'palette OK');
  process.exit(fail ? 1 : 0);
}
