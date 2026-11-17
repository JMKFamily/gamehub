// palette.mjs — 30-art 2절 팔레트 + 3절 장소 실루엣을 assets/palette.json으로 만들고 대비를 검사합니다.
// 실행: node assets/palette.mjs            (palette.json 쓰기 + 검사)
//       node assets/palette.mjs --check    (palette.json을 읽어 검사만)
// 색을 바꾸면 P만 고치고 다시 돌린 뒤 30-art 2-2·2-3 표를 바꿉니다. 외부 패키지 없음.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, 'palette.json');

const hsl = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase(); };

const COMMON = { star: '#FFD43B', ball: '#7FE3FF', outline: '#0B0D12', trackEdge: '#E6E1D3', hud: '#F5F1E8', broken: '#B9BEC7' };

// [키, 이름 키, 이름, 색상각, 채도, 명도 오프셋, cardTint(hsl) 따로 지정]
const P = [
  ['level01', 'level1_name', '아침 마당', 45, 46, 0, [28, 78, 72]],
  ['level02', 'level2_name', '꽃밭', 95, 44, 0, null],
  ['level03', 'level3_name', '비 오는 창가', 213, 20, 0, null],
  ['level04', 'level4_name', '바닷가', 180, 46, 0, null],
  ['level05', 'level5_name', '숲속 길', 148, 44, 0, null],
  ['level06', 'level6_name', '노을 언덕', 18, 46, 0, null],
  ['level07', 'level7_name', '등불 골목', 340, 44, -1, null],
  ['level08', 'level8_name', '지붕 위', 305, 38, -2, null],
  ['level09', 'level9_name', '구름 위', 270, 36, -3, null],
  ['level10', 'level10_name', '달', 232, 40, -4, [42, 60, 85]],
];

// 장소 실루엣 (30-art 3절·2-5절). 좌표계 = "실루엣 판"(field): 세로 화면은 x 0~W, y 0~(엄지 받침 위끝 - 8),
// 가로 화면은 화면 전체. x·y = 판 너비·높이의 비율, 크기(r·w·h) = 판 짧은 변 S의 비율(w:"full" = 판 너비 전체).
// circle {x,y,r} 중심 / rect {x,y,w,h} 왼쪽 위 / tri {x,y,w,h} 밑변 가운데(x,y), 꼭짓점은 위로.
// 판 밖은 잘라 냅니다(clip). 색은 모두 그 레벨 bgFar, 외곽선 없음, 움직임 없음. clear = 클리어 때 물드는 도형 번호.
const SIL = {
  level01: { clear: 0, shapes: [
    { t: 'circle', x: 0.80, y: 1.00, r: 0.30, what: '해(반원, 판 아래에 걸침)' },
    { t: 'rect', x: 0.00, y: 0.9125, w: 0.55, h: 0.121, what: '담장' }] },
  level02: { clear: 0, shapes: [
    { t: 'circle', x: 0.50, y: 0.974, r: 0.10, what: '가운데 꽃 머리' },
    { t: 'circle', x: 0.12, y: 0.913, r: 0.08, what: '왼쪽 꽃 머리' },
    { t: 'circle', x: 0.88, y: 0.93, r: 0.08, what: '오른쪽 꽃 머리' }] },
  level03: { clear: 0, shapes: [
    { t: 'rect', x: 0.03, y: 0.2125, w: 0.22, h: 0.467, rx: 0.025, what: '창틀' },
    { t: 'circle', x: 0.86, y: 0.6675, r: 0.035, what: '멈춘 빗방울 1' },
    { t: 'circle', x: 0.92, y: 0.825, r: 0.035, what: '멈춘 빗방울 2' }] },
  level04: { clear: 0, shapes: [
    { t: 'rect', x: 0.00, y: 0.8775, w: 'full', h: 0.1675, what: '바다' },
    { t: 'circle', x: 0.88, y: 0.2825, r: 0.07, what: '해' }] },
  level05: { clear: 0, shapes: [
    { t: 'tri', x: 0.88, y: 0.741, w: 0.28, h: 0.44, what: '큰 나무' },
    { t: 'tri', x: 0.10, y: 0.789, w: 0.252, h: 0.396, what: '나무' },
    { t: 'tri', x: 0.26, y: 0.843, w: 0.182, h: 0.286, what: '작은 나무' }] },
  level06: { clear: 0, shapes: [
    { t: 'circle', x: 0.50, y: 1.4125, r: 0.80, what: '언덕(큰 원의 윗부분)' },
    { t: 'circle', x: 0.85, y: 0.835, r: 0.12, what: '언덕에 반쯤 가린 해' }] },
  level07: { clear: 0, shapes: [
    { t: 'circle', x: 0.10, y: 0.825, r: 0.06, what: '등불 1' },
    { t: 'circle', x: 0.08, y: 0.30, r: 0.06, what: '등불 2' },
    { t: 'circle', x: 0.92, y: 0.431, r: 0.06, what: '등불 3' }] },
  level08: { clear: 0, shapes: [
    { t: 'tri', x: 0.14, y: 0.86, w: 0.28, h: 0.187, what: '지붕 1' },
    { t: 'tri', x: 0.86, y: 0.9125, w: 0.28, h: 0.163, what: '지붕 2' },
    { t: 'rect', x: 0.18, y: 0.7025, w: 0.04, h: 0.117, what: '굴뚝' }] },
  level09: { clear: 0, shapes: [
    { t: 'circle', x: 0.92, y: 0.825, r: 0.15, what: '큰 구름' },
    { t: 'circle', x: 0.82, y: 0.869, r: 0.12, what: '구름' },
    { t: 'circle', x: 1.00, y: 0.878, r: 0.11, what: '구름' }] },
  level10: { clear: 0, shapes: [
    { t: 'circle', x: 0.86, y: 0.30, r: 0.16, what: '달' }] },
};

function build() {
  const themes = {};
  for (const [k, nameKey, n, h, s, o, ct] of P) {
    themes[k] = {
      name_key: nameKey, name: n, hue: h,
      bg: hsl(h, s, 11 + o * 0.5), bgFar: hsl(h, s * 0.9, 17 + o * 0.5),
      track1: hsl(h, s * 0.8, 21 + o * 0.5), track2: hsl(h, s * 0.85, 24 + o * 0.5), track3: hsl(h, s * 0.9, 26 + o * 0.5),
      drum: hsl(h, s * 0.6, 31 + o * 0.5), cardTint: ct ? hsl(...ct) : hsl(h, Math.min(78, s + 30), 72),
      silhouette: SIL[k],
    };
  }
  return {
    schema_version: 1,
    _source: '30-art.md 2절(색)·3절(형태)·2-5절(실루엣 좌표). 생성 assets/palette.mjs. 이 파일과 30-art 표가 다르면 이 파일이 기준(art 소유).',
    _rules: [
      'star(노랑)는 꽉 찬 별 면·속 빈 별 테두리·판정 빛살에만. 등급 북·기록·카드·버튼·실루엣에 쓰지 않음(결정 2).',
      '공통 색(common)은 10레벨 같음. 레벨마다 바뀌는 것은 themes의 환경 색뿐.',
      '투명도는 alpha 표에 있는 곳에만. 별·공에는 투명도 없음(공 꼬리 제외).',
      '플레이 중 bg는 바뀌지 않음. track1→2→3, 클리어 물듦은 mix_ms 동안 선형 섞기(번쩍임 없음).',
      '놓침 구역·판정 창은 화면에 그리지 않음(시간 고리 금지, 30-art 1절). 위험 요소 대비는 꽉 찬 별 기준.',
    ],
    common: COMMON,
    alpha: {
      ball_tail: [0.45, 0.28, 0.14],
      tick_halfbeat_dot: 0.8,
      drum_inner_ring_hud: 0.35,
      thumb_rest_border_trackEdge: 0.5,
      locked_card_trackEdge: 0.5,
      attempt_dots_trackEdge: 0.85,
      guardian_hold_ring_track_hud: 0.25,
    },
    blend: {
      stage_mix: '1마디 동안 track(n) → track(n+1) 선형',
      clear_track: 'track → cardTint, outro 첫 마디(2 s 이상)',
      clear_silhouette: 'shapes[clear] bgFar → mix(bgFar 80 %, cardTint 20 %) (1-2의 30 %는 공·별 대비 4.5 미만이라 20 %로 낮춤)',
      clear_silhouette_mix: 0.2,
      fail_track: '현재 track → track1, 0.30 s',
    },
    silhouette_frame: {
      portrait: { x0: 0, y0: 0, w: 'W', h: 'thumbRestTop - 8' },
      landscape: { x0: 0, y0: 0, w: 'W', h: 'H' },
      units: 'x·y = 판 너비·높이 비율, r·w·h = 판 짧은 변 S 비율, w:"full" = 판 너비',
      shape_types: { circle: '중심 (x,y), 반지름 r', rect: '왼쪽 위 (x,y), w×h, rx 모서리(선택)', tri: '밑변 가운데 (x,y), 밑변 w, 높이 h, 꼭짓점 위' },
      draw_order: 'bg → 실루엣(clip = 판) → 엄지 받침 → 궤도 → 눈금 → 북 → 별 → 공 → 이펙트 → HUD',
    },
    silhouette_frame_r3: {
      _note: 'round-3 북길(30-art 16-6)에서 silhouette_frame 대체. 판 위끝을 HUD 띠 아래로 내려 실루엣이 HUD 띠(진행도·시도 점·콤보 줄·일시정지)와 겹치지 않게 함. px 값은 assets/layout.json layouts[].silhouette_frame',
      portrait: { x0: 0, y0: 'hudBandBottom + 8', w: 'W', h: 'thumbRestTop - 8 - y0' },
      landscape: { x0: 0, y0: 'hudBandBottom + 8', w: 'W', h: 'H - y0' },
      draw_order: 'bg → 실루엣(clip = 판) → 엄지 받침(세로) → 길 띠 → 박 눈금·마디 표 → 판정 북 → 판정 선 → 별 → 판정 이펙트 → 공 → 손가락 → HUD(진행도·시도 점·콤보 줄·일시정지)',
    },
    road_r3: {
      _note: '30-art 16절 북길 색 쓰임. 크기·자리 = assets/layout.json',
      road_band: 'track1~3 (진행 단계, blend 규칙 그대로), 위·아래 가장자리 trackEdge 1.5 px',
      judge_line: 'hud, 가는 선(layout line.w), 양옆 outline 1 px',
      judge_drum: 'drum 면 + trackEdge 2 px 테두리 + 안쪽 hud 35 % 가는 원(alpha.drum_inner_ring_hud)',
      beat_tick: 'trackEdge, alpha.tick_halfbeat_dot(0.8), 길 아랫변 안쪽 작은 네모(정박만, 반박 표시 없음)',
      bar_mark: 'trackEdge, 길 아랫변에서 띠 높이 30 % 짧은 세로 막대(띠를 가로지르는 세로선 금지)',
      fx_perfect_rays: 'star', fx_good_rays: 'hud', fx_pass_ring: 'trackEdge',
      combo_dot_on: 'hud 면 + outline 1 px', combo_dot_off: 'trackEdge 50 % 1.2 px 고리', combo_mark: 'cardTint 면 + outline 1.2 px', combo_confetti: 'cardTint·hud 작은 네모(HUD 띠 안)',
      forbidden: 'star(노랑)를 콤보·판정 선·북·눈금에 쓰지 않음. ball(하늘색)은 공·최고 기록 점만',
    },
    themes,
  };
}

// ---- 대비 검사 (WCAG 2.x 상대 명도) ----
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('').toUpperCase();

function check(pal) {
  const S = ['bg', 'bgFar', 'track1', 'track2', 'track3', 'track12', 'track23'];
  // [앞, 뒤, 최소, 최대, 묶음]
  const checks = [
    ...S.map(b => ['star', b, 4.5, null, 'A 위험(꽉 찬 별)']),
    ...S.map(b => ['ball', b, 4.5, null, 'A 나(공)']),
    ['star', 'clearSil', 4.5, null, 'A 위험(꽉 찬 별)'],
    ['ball', 'clearSil', 4.5, null, 'A 나(공)'],
    ['outline', 'star', 3, null, 'B 외곽선'], ['outline', 'ball', 3, null, 'B 외곽선'], ['outline', 'cardTint', 3, null, 'B 외곽선'],
    ['trackEdge', 'bg', 3, null, 'C 궤도·UI'], ['trackEdge', 'bgFar', 3, null, 'C 궤도·UI'], ['trackEdge', 'drum', 3, null, 'C 궤도·UI'],
    ['hud', 'bg', 4.5, null, 'C 궤도·UI'], ['hud', 'bgFar', 4.5, null, 'C 궤도·UI'], ['hud', 'drum', 3, null, 'C 궤도·UI'],
    ['hud', 'clearSil', 3, null, 'C 궤도·UI'],
    ['broken', 'bg', 3, null, 'D 놓친 별 조각'], ['broken', 'bgFar', 3, null, 'D 놓친 별 조각'], ['broken', 'track3', 3, null, 'D 놓친 별 조각'],
    ['cardTint', 'bg', 3, null, 'E 카드'], ['cardTint', 'bgFar', 3, null, 'E 카드'],
    ['bgFar', 'bg', 1.05, 1.5, 'F 실루엣은 장식(상한)'],
    // round-3 "북길" (30-art 16절): 판정 선·좋아 빛살(hud), 박 눈금·통과 고리(trackEdge), 콤보 점(hud)·큰 표지(cardTint)
    ...['track1', 'track2', 'track3', 'track12', 'track23'].map(b => ['hud', b, 4.5, null, 'G 길(판정 선·좋아 빛살)']),
    ...['track1', 'track2', 'track3', 'track12', 'track23'].map(b => ['trackEdge', b, 3, null, 'G 길(눈금·통과 고리)']),
    ['trackEdge', 'drum', 3, null, 'G 길(판정 북 테두리)'],
    ['hud', 'bg', 4.5, null, 'H 콤보(점)'], ['cardTint', 'bg', 3, null, 'H 콤보(큰 표지)'], ['outline', 'hud', 3, null, 'H 콤보(점 외곽선)'],
  ];
  const rows = {}; let n = 0, fail = 0; const mins = {};
  for (const [k, t] of Object.entries(pal.themes)) {
    const p = { ...pal.common, ...t, track12: mix(t.track1, t.track2, 0.5), track23: mix(t.track2, t.track3, 0.5), clearSil: mix(t.bgFar, t.cardTint, pal.blend.clear_silhouette_mix) };
    rows[k] = {};
    for (const [a, b, lo, hi, g] of checks) {
      const r = cr(p[a], p[b]); n++;
      const bad = r < lo || (hi && r > hi);
      if (bad) { fail++; console.log('FAIL', k, a, b, r.toFixed(2)); }
      const key = a + '/' + b; rows[k][key] = r;
      if (!mins[key] || r < mins[key].r) mins[key] = { r, k, lo, hi, g };
    }
    // 참고(기준 없음): 50 % 투명 trackEdge가 bgFar 위에 있을 때 (엄지 받침 테두리·잠긴 카드)
    rows[k]['dimEdge/bgFar'] = cr(mix(t.bgFar, pal.common.trackEdge, 0.5), t.bgFar);
  }
  console.log('PAIRS', n, 'FAIL', fail);
  console.log('\n쌍별 10레벨 최솟값');
  for (const [key, m] of Object.entries(mins)) console.log(`${m.g.padEnd(14)} ${key.padEnd(20)} ${m.r.toFixed(2).padStart(6)}  (${m.k}, 기준 ${m.lo}${m.hi ? '~' + m.hi : ''})`);
  const a = Object.entries(mins).filter(([, m]) => m.g.startsWith('A'));
  const w = a.reduce((x, y) => (y[1].r < x[1].r ? y : x));
  console.log(`\nA(위험·나) 최저: ${w[0]} ${w[1].r.toFixed(2)} (${w[1].k})`);
  const dim = Object.entries(rows).map(([k, r]) => r['dimEdge/bgFar']);
  console.log(`참고 50 % trackEdge/bgFar: ${Math.min(...dim).toFixed(2)} ~ ${Math.max(...dim).toFixed(2)}`);
  console.log('\n레벨별 star·ball 최솟값(bg·bgFar·track1~3·섞임·물든 실루엣 중)');
  for (const [k, r] of Object.entries(rows)) {
    const s = Math.min(...Object.entries(r).filter(([x]) => x.startsWith('star/')).map(([, v]) => v));
    const b = Math.min(...Object.entries(r).filter(([x]) => x.startsWith('ball/')).map(([, v]) => v));
    console.log(k, 'star', s.toFixed(2), 'ball', b.toFixed(2), 'outline/cardTint', r['outline/cardTint'].toFixed(2), 'hud/clearSil', r['hud/clearSil'].toFixed(2));
  }
  return fail;
}

const only = process.argv.includes('--check');
const pal = only ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : build();
if (!only) fs.writeFileSync(OUT, JSON.stringify(pal, null, 1) + '\n');
// 형태 검사: 실루엣 3개 이하, 별 모양 없음
let shapeFail = 0;
for (const [k, t] of Object.entries(pal.themes)) {
  const s = t.silhouette.shapes;
  if (s.length > 3 || s.some(x => !['circle', 'rect', 'tri'].includes(x.t)) || !(t.silhouette.clear < s.length)) { shapeFail++; console.log('SHAPE FAIL', k); }
}
console.log('THEMES', Object.keys(pal.themes).length, 'SHAPE FAIL', shapeFail);
process.exit(check(pal) + shapeFail ? 1 : 0);
