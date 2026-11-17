#!/usr/bin/env node
// rhythm-02 팔레트 원본 생성 + 대비 검사. 30-art 2절.
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
const hueOf = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round(((h * 60) + 360) % 360);
};

// 10레벨 공통 색 (레벨마다 바뀌지 않음, 30-art 2-1)
const COMMON = {
  ball: '#A42412',      // 공(나·판정 대상). 붉은 고무공. 모든 바탕·북 가죽·구름과 4.5:1 이상
  ballShine: '#FFD9CC', // 공 왼쪽 위 짧은 빛 호(점 아님 — rhythm-01 공의 흰 점과 구분, 줄무늬 아님 — 금지 표지처럼 보임)
  ink: '#23273A',       // 외곽선(공·북·구름·손가락·아이콘), 등급 물결선
  drumBody: '#234C88',  // 북 몸통(가로로 넓은 둥근 사각형), 진행도 채움, 시도 점
  skin: '#FFF3D6',      // 북 가죽(윗면 띠)
  shadow: '#8F7748',    // 북 가죽 위 공 그림자(타원). 투명도 없음
  glow: '#FFC861',      // '딱'일 때 북 가죽이 잠깐 물드는 색 (모양 신호와 함께, 색만으로 구분하지 않음)
  cloud: '#FFFFFF',     // 구름 면
  hudTrack: '#FFFFFF',  // 진행도 막대 바탕
  finger: '#FFFFFF',    // 튜토리얼 손가락 면(외곽선 ink)
};

// [키, lore 이름 키, 색 방향, 색상각, 바탕 채도, accent 채도·명도]
// lore strings.json level*_name(1-1 가안) 순서를 따름. 이름이 바뀌어도 색상각 간격 규칙(이웃 30° 이상)은 유지.
const THEMES = [
  ['level01', 'level1_name', '잔디 연두', 95, 52],
  ['level02', 'level2_name', '모래 베이지', 42, 60],
  ['level03', 'level3_name', '맑은 하늘', 205, 62],
  ['level04', 'level4_name', '라일락', 280, 45],
  ['level05', 'level5_name', '물웅덩이 청록', 182, 50],
  ['level06', 'level6_name', '분홍', 335, 55],
  ['level07', 'level7_name', '언덕 초록', 140, 42],
  ['level08', 'level8_name', '나무 살구', 28, 62],
  ['level09', 'level9_name', '연 하늘 남보라', 232, 55],
  ['level10', 'level10_name', '햇살 금빛', 50, 80],
];

// 레벨 배경 실루엣(lore 4절 시각 힌트). 기본 도형 3개 이하, 정지, 외곽선 없음, sil 색 한 가지.
// 좌표: 바탕 판(화면 전체) 기준 x·y = W·floorTop 비율(y = 1.0 이 바닥 윗선), 크기 = S(짧은 변) 비율.
// 공이 움직이는 가운데 기둥(x 0.30~0.70)과 구름 자리에는 두지 않음. 공 크기 원·위에서 떨어지는 줄지은 도형 금지(lore A6).
// rect {x,y,w,h}: 왼쪽 위 / tri {x,y,w,h}: 밑변 가운데, 꼭짓점 위 / ellipse {x,y,rx,ry} / diamond {x,y,w,h}: 가운데 / bar(rect, rx 있음)
const SIL = {
  level01: [{ t: 'rect', x: 0, y: 0.955, w: 'full', h: 0.05, what: '낮은 풀밭 띠' }, { t: 'tri', x: 0.10, y: 1.0, w: 0.10, h: 0.08, what: '풀 한 포기' }, { t: 'tri', x: 0.88, y: 1.0, w: 0.12, h: 0.10, what: '풀 한 포기' }],
  level02: [{ t: 'ellipse', x: 0.12, y: 1.0, rx: 0.20, ry: 0.10, what: '모래 더미(반원)' }, { t: 'tri', x: 0.86, y: 1.0, w: 0.16, h: 0.14, what: '모래성 세모' }],
  level03: [],
  level04: [{ t: 'rect', x: 0.04, y: 0.62, w: 0.22, h: 0.025, what: '그네 가로 막대' }, { t: 'rect', x: 0.07, y: 0.62, w: 0.012, h: 0.26, what: '그네 줄' }, { t: 'rect', x: 0.21, y: 0.62, w: 0.012, h: 0.26, what: '그네 줄' }],
  level05: [{ t: 'ellipse', x: 0.15, y: 1.0, rx: 0.17, ry: 0.035, what: '납작한 웅덩이' }, { t: 'ellipse', x: 0.86, y: 1.0, rx: 0.12, ry: 0.028, what: '작은 웅덩이' }],
  level06: [{ t: 'rect', x: 0.74, y: 0.90, w: 0.24, h: 0.02, what: '시소 판(기울지 않음)' }, { t: 'tri', x: 0.86, y: 1.0, w: 0.07, h: 0.08, what: '시소 받침' }],
  level07: [{ t: 'ellipse', x: 0.10, y: 1.0, rx: 0.26, ry: 0.16, what: '언덕' }, { t: 'rect', x: 0.875, y: 0.70, w: 0.01, h: 0.30, what: '바람개비 막대' }, { t: 'pinwheel', x: 0.88, y: 0.70, r: 0.06, what: '바람개비(세모 4개, 정지)' }],
  level08: [{ t: 'rect', x: 0.06, y: 0.45, w: 0.08, h: 0.55, what: '나무 기둥' }, { t: 'tri', x: 0.10, y: 0.50, w: 0.26, h: 0.30, what: '잎(세모)' }],
  level09: [{ t: 'diamond', x: 0.85, y: 0.30, w: 0.09, h: 0.13, what: '마름모 연' }, { t: 'rect', x: 0.848, y: 0.365, w: 0.004, h: 0.40, what: '연 줄' }],
  level10: [{ t: 'sun', x: 0.97, y: 0.08, r: 0.2, what: '큰 해(공 지름의 5배 이상, 오른쪽 위 구석에 반쯤 걸침 — 공과 크기·자리가 다름)' }, { t: 'rect', x: 0, y: 0.97, w: 'full', h: 0.03, what: '가장 위 하늘 띠' }],
};

// 상대 명도 target 에 가장 가까운 명도 L(%)을 찾아 같은 색상각·채도의 색을 만듦 (accent: 외곽선 대비 ≥ 3, 카드 바탕 대비 ≥ 3 사이)
const solveL = (h, s, target) => { let best = null; for (let L = 20; L <= 80; L += 0.25) { const c = hsl(h, s, L); const d = Math.abs(lum(c) - target); if (!best || d < best.d) best = { c, d }; } return best.c; };

export function build() {
  const themes = {};
  for (const [k, nameKey, dir, h, s] of THEMES) {
    themes[k] = {
      name_key: nameKey, direction: dir, hue: h,
      // 레벨 안 3단계(받침 쉼을 지날 때마다 한 단계, 1마디 동안 섞음). 단계가 오를수록 조금 더 진해짐
      bg1: hsl(h, s, 93), bg2: hsl(h, Math.min(90, s + 6), 90.5), bg3: hsl(h, Math.min(92, s + 12), 88),
      floor: hsl(h, Math.max(20, s - 18), 80),       // 북이 놓인 바닥 띠(엄지가 닿는 아래쪽)
      floorEdge: hsl(h, Math.max(18, s - 22), 50),   // 바닥 윗선 2 px
      accent: solveL(h, Math.min(85, s + 10), 0.17),      // 레벨 카드 테두리, 클리어 때 구름이 물드는 색, 등급 구름 채움
      cardBg: hsl(h, Math.min(92, s + 12), 88),       // 그림 카드·레벨 카드 바깥 바탕(= bg3). 카드 칸 안은 bg1
      sil: hsl(h, Math.max(20, s - 10), 85.5),        // 배경 실루엣 한 가지 색(바탕보다 조금 진함)
      silhouette: SIL[k],
    };
  }
  return {
    schema_version: 1,
    _source: 'tools/art/palette.mjs 가 생성(art-director 원본). 30-art 2절 표는 요약이고, 표와 이 파일이 다르면 이 파일이 기준. 빌드는 이 파일만 읽음(문서 표 파싱 금지).',
    _rules: [
      '공통 색(common)은 10레벨 같음. 레벨마다 바뀌는 것은 themes 의 바탕·바닥·accent 뿐.',
      '투명도(alpha) 없음. 그림자·물결·빛도 불투명 단색.',
      '플레이 중 바탕은 bg1 → bg2 → bg3 로만, 받침 쉼 1마디 동안 선형 섞기(번쩍임·깜빡임 없음).',
      '클리어: 구름 면 cloud → accent 로 1 s 섞기, 바탕은 bg3 → bg1 로 1 s 섞기(밝아짐).',
      '공 색(ball)은 공과 최고 기록 점에만. 북 몸통 색(drumBody)은 북·진행도 채움·시도 점에만.',
      '노랑 별·하늘색 공·어두운 바탕(rhythm-01) 을 쓰지 않음(30-art 10절).',
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
      out.push([`${k} 진행도 채움 / ${bg}`, C.drumBody, t[bg], 3]);
    }
    out.push([`${k} 공 / floor`, C.ball, t.floor, 3]);
    out.push([`${k} 외곽선 / floor`, C.ink, t.floor, 4.5]);
    out.push([`${k} 북 몸통 / floor`, C.drumBody, t.floor, 3]);
    out.push([`${k} accent(카드 테두리·등급 구름) / cardBg(=bg3)`, t.accent, t.cardBg, 3]); out.push([`${k} accent / bg1(레벨 카드)`, t.accent, t.bg1, 3]);
    out.push([`${k} 공 / accent(클리어 구름)`, C.ball, t.accent, 1.0]); // 클리어 때 공은 구름 뒤라 보이지 않음 — 기록만
    out.push([`${k} 외곽선 / accent`, C.ink, t.accent, 3]);
    out.push([`${k} 바닥 윗선 / floor`, t.floorEdge, t.floor, 1.5]);
    out.push([`${k} 공 / 실루엣`, C.ball, t.sil, 4.5]);
    out.push([`${k} 실루엣 / bg1 (너무 튀지 않게 ≤ 1.6)`, t.sil, t.bg1, 1.0]);
    if (contrast(t.sil, t.bg1) > 1.6) out.push([`${k} 실루엣이 너무 진함`, '#000000', '#000000', 99]);
  }
  out.push(['공 / 북 가죽', C.ball, C.skin, 4.5]);
  out.push(['공 / 딱 빛(glow)', C.ball, C.glow, 3]);
  out.push(['공 / 구름', C.ball, C.cloud, 4.5]);
  out.push(['공 빛 호 / 공', C.ballShine, C.ball, 3]);
  out.push(['그림자 / 북 가죽', C.shadow, C.skin, 3]);
  out.push(['외곽선 / 북 가죽', C.ink, C.skin, 7]);
  out.push(['북 가죽 / 북 몸통', C.skin, C.drumBody, 4.5]);
  out.push(['진행도 채움 / 막대 바탕', C.drumBody, C.hudTrack, 4.5]);
  out.push(['최고 기록 점(공 색) / 막대 바탕', C.ball, C.hudTrack, 4.5]);
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
  // 이웃 레벨 색상각 차 ≥ 30°
  const hs = Object.values(P.themes).map((t) => t.hue);
  const diffs = hs.slice(1).map((h, i) => { const d = Math.abs(h - hs[i]) % 360; return Math.min(d, 360 - d); });
  if (diffs.some((d) => d < 30)) fail++;
  return { rows, fail, diffs };
}

const args = process.argv.slice(2);
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('palette.mjs')) {
  const P = args.includes('--check') ? JSON.parse(readFileSync(OUT, 'utf8')) : build();
  if (!args.includes('--check')) writeFileSync(OUT, JSON.stringify(P, null, 1) + '\n');
  const { rows, fail, diffs } = check(P);
  // 같은 종류(앞색 이름)별 최솟값 요약
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
  console.log('\n| 키 | bg1 | bg2 | bg3 | floor | accent |');
  console.log('|---|---|---|---|---|---|');
  for (const [k, t] of Object.entries(P.themes)) console.log(`| ${k} ${t.direction} | \`${t.bg1}\` | \`${t.bg2}\` | \`${t.bg3}\` | \`${t.floor}\` | \`${t.accent}\` |`);
  console.log(`\n공 색상각 ${hueOf(P.common.ball)}°, 북 몸통 색상각 ${hueOf(P.common.drumBody)}°, 공 상대 명도 ${lum(P.common.ball).toFixed(3)}, bg1 상대 명도 범위 ${Math.min(...Object.values(P.themes).map((t) => lum(t.bg1))).toFixed(3)}~${Math.max(...Object.values(P.themes).map((t) => lum(t.bg1))).toFixed(3)}`);
  console.log(fail ? `palette FAIL ${fail}` : 'palette OK');
  process.exit(fail ? 1 : 0);
}
