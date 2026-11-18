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
// 판정 이름·% 글자 색 (30-art 16-13, 요청자 지시 "판정 이름과 퍼센트"). 노랑(star)·공 색(ball)·회색(broken)·빨강 금지. 색은 보조, 주 신호는 글자 크기·옆 표지 모양
const JUDGE_LABEL = { perfect: '#FFC0E0', good: '#9EF0C4', pass: '#F5F1E8' };
// 콤보 파격 연출 (30-art 16-14, 요청자 지시 2026-11-17 "콤보 파격 연출"). 파티클 색 = 공통 색(테마 cardTint 안 씀: level01·level10 cardTint 가 노랑 쪽)
//   단계마다 색 하나씩 더함. 노랑(star)·공 색(ball)·회색(broken)·빨강 금지(판정 글자 색 규칙과 같은 검사)
const COMBO_FX = {
  particle_colors: { hud: '#F5F1E8', mint: '#9EF0C4', pink: '#FFC0E0', lilac: '#C9B8FF' },
  tier_colors: { 1: ['hud'], 2: ['hud', 'mint'], 3: ['hud', 'mint', 'pink'], 4: ['hud', 'mint', 'pink', 'lilac'] },
  tier_alpha_max: { 1: 0.18, 2: 0.24, 3: 0.30, 4: 0.34 },     // 바탕 파티클 불투명도 상한(단계별)
  number: { color: 'hud', alpha: 0.22, alpha_pop: 0.30, alpha_max: 0.30, label_alpha: 0.5 }, // 위쪽 가운데 큰 콤보 수
  spark: { perfect: ['pink', 'hud'], good: ['mint', 'hud'], pass: [], alpha_max: 0.9 },          // 타격 지점 빛 파티클
  contrast: { number_min: 1.6, number_max: 3.0, particle_min: 1.3, particle_max: 3.2, spark_min_on_track: 3, number_vs_star_ratio_max: 0.5 },
};

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
      combo_superseded_r3: 'combo_dot_on·combo_dot_off·combo_mark·combo_confetti(16-4 HUD 띠 점 줄)는 16-14 콤보 파격 연출로 대체(combo_fx_r3). 기록으로 남김',
    },
    judge_label_r3: {
      _note: '30-art 16-13 판정 이름·% (요청자 지시 2026-11-17). 자리·크기·시간 = assets/layout.json judge_label · layouts[].judge_label · layouts[].result',
      colors: JUDGE_LABEL,
      name_and_pct: '이름과 %는 같은 등급 색. 글자 둘레 outline 테(layout judge_label.outline_px), 그림자·빛남·그라데이션 없음',
      mark: '이름 왼쪽 표지(등급 색): 딱 = 짧은 빛살 5개, 좋아 = 3개, 통과 = 작은 고리',
      result_accuracy: 'hud 숫자 + outline 테. 과녁 표지 = hud 고리 2겹 + cardTint 가운데 점',
      result_combo: 'hud 숫자 + outline 테. 표지 = hud 점 3개(콤보 점과 같은 모양), 신기록 = cardTint 작은 고리',
      forbidden: 'star(노랑)·ball(하늘색)·broken(회색)·빨강을 판정 글자에 쓰지 않음. 실패 칸에는 글·색 없음',
    },
    combo_fx_r3: {
      _note: '30-art 16-14 콤보 파격 연출 (요청자 지시 2026-11-17). 자리·크기·개수·시간 = assets/layout.json combo_fx · layouts[].combo_fx. 16-4 점 10칸·큰 표지(road_r3 combo_*) 대체',
      ...COMBO_FX,
      layer: '메인 캔버스에서 clearRect 바로 뒤, 길 띠보다 먼저: [바탕 파티클 → 큰 콤보 수] → 길 띠 → … 별 → 판정 이펙트 → 타격 빛 파티클 → 공 → 손가락 → 판정 글 → HUD. 바탕 파티클·콤보 수는 금지 구역(길 띠·공 뜀 자리·판정 글 상자·손가락·tut 글·HUD 띠) 밖에만 그림(evenodd 클립 한 번)',
      blend: '보통 합성(source-over)만. lighter·screen·그림자(shadowBlur)·그라데이션·빛남 금지',
      forbidden: 'star(노랑)·ball(하늘색)·broken(회색)·빨강·테마 cardTint 를 파티클·콤보 수에 쓰지 않음. 별 모양·빛줄기·원형 폭발 모양 금지',
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
    // 판정 이름·% (30-art 16-13): 길 띠 아래 바탕·실루엣(물든 실루엣 포함) 위에 그림. 글자 테(outline)와도 4.5 이상
    ...['jPerfect', 'jGood', 'jPass'].flatMap(c => ['bg', 'bgFar', 'clearSil', 'outline'].map(b => [c, b, 4.5, null, 'I 판정 이름·%'])),
    ['hud', 'outline', 4.5, null, 'I 결과 정확도·콤보 숫자'], ['cardTint', 'outline', 3, null, 'I 결과 과녁 점·신기록 고리'],
  ];
  const rows = {}; let n = 0, fail = 0; const mins = {};
  for (const [k, t] of Object.entries(pal.themes)) {
    const J = pal.judge_label_r3?.colors || {};
    const p = { ...pal.common, jPerfect: J.perfect, jGood: J.good, jPass: J.pass, ...t, track12: mix(t.track1, t.track2, 0.5), track23: mix(t.track2, t.track3, 0.5), clearSil: mix(t.bgFar, t.cardTint, pal.blend.clear_silhouette_mix) };
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
  fail += checkJudgeColors(pal);
  fail += checkComboFx(pal);
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

// 판정 글자 색 규칙 (30-art 16-13): 노랑(star)·공 색(ball)·회색(broken)·빨강 금지, 세 등급 색이 서로 다름
function hsv(h) { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let H = 0; if (d) H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return { h: (H * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx }; }
function checkJudgeColors(pal) {
  const J = pal.judge_label_r3?.colors; let f = 0;
  const bad = m => { f++; console.log('FAIL 판정 글자 색', m); };
  if (!J || !J.perfect || !J.good || !J.pass) { bad('judge_label_r3.colors 없음'); return f; }
  const hd = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  const C = pal.common, star = hsv(C.star), ball = hsv(C.ball);
  for (const [k, c] of Object.entries(J)) {
    for (const r of ['star', 'ball', 'broken']) if (c.toUpperCase() === C[r].toUpperCase()) bad(`${k} = ${r}`);
    const x = hsv(c);
    if (x.s >= 0.2) { // 채도 있는 색만 색상각으로 봄 (크림 hud 는 무채에 가까움)
      if (hd(x.h, star.h) < 30) bad(`${k} ${c} 노랑(star)과 색상각 차 ${hd(x.h, star.h).toFixed(0)}° < 30`);
      if (hd(x.h, ball.h) < 30) bad(`${k} ${c} 공 색(ball)과 색상각 차 ${hd(x.h, ball.h).toFixed(0)}° < 30`);
      if (hd(x.h, 0) < 15) bad(`${k} ${c} 빨강 쪽(색상각 0±15°)`);
    } else if (x.v < 0.85) bad(`${k} ${c} 회색으로 보임(채도 ${x.s.toFixed(2)}, 명도 ${x.v.toFixed(2)})`);
  }
  if (new Set(Object.values(J).map(c => c.toUpperCase())).size !== 3) bad('세 등급 색이 서로 같음');
  console.log('판정 글자 색 규칙', f ? 'FAIL ' + f : 'OK', Object.entries(J).map(([k, c]) => `${k} ${c} 색상각 ${hsv(c).h.toFixed(0)}° 채도 ${hsv(c).s.toFixed(2)}`).join(', '));
  return f;
}

// 콤보 파격 연출 색·투명도 (30-art 16-14, 묶음 J). 바탕 파티클·큰 콤보 수는 길 띠·공·판정 글 뒤가 아니라 그 바깥(금지 구역 클립)에만 그려지므로
//   별·공·판정 글의 대비는 바뀌지 않음(그 위에 파티클이 깔리지 않음). 여기서는 "바탕 위에서 보이되 별보다 훨씬 약함"을 잼:
//   합성색 = mix(뒤 색, 파티클 색, 불투명도 상한), 뒤 색 = bg·bgFar·물든 실루엣. 타격 빛 파티클은 길 띠 위(track1~3·섞임)에서 보여야 함
function checkComboFx(pal) {
  const X = pal.combo_fx_r3; let f = 0, n = 0;
  const bad = m => { f++; console.log('FAIL 콤보 연출', m); };
  if (!X) { bad('combo_fx_r3 없음'); return 1; }
  const PC = X.particle_colors, K = X.contrast, C = pal.common;
  // 색 규칙: 노랑·공 색·회색·빨강 아님, 채도 있으면 노랑·공 색과 색상각 30° 이상
  const star = hsv(C.star), ball = hsv(C.ball), hd = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  for (const [k, c] of Object.entries(PC)) {
    for (const r of ['star', 'ball', 'broken']) if (c.toUpperCase() === C[r].toUpperCase()) bad(`${k} = ${r}`);
    const x = hsv(c);
    if (x.s >= 0.2) {
      if (hd(x.h, star.h) < 30) bad(`${k} ${c} 노랑과 색상각 ${hd(x.h, star.h).toFixed(0)}° < 30`);
      if (hd(x.h, ball.h) < 30) bad(`${k} ${c} 공 색과 색상각 ${hd(x.h, ball.h).toFixed(0)}° < 30`);
      if (hd(x.h, 0) < 15) bad(`${k} ${c} 빨강 쪽`);
    } else if (x.v < 0.85) bad(`${k} ${c} 회색으로 보임`);
  }
  for (const [t, cs] of Object.entries(X.tier_colors)) for (const c of cs) if (!PC[c]) bad(`단계 ${t} 색 ${c} 없음`);
  const tiers = Object.keys(X.tier_alpha_max).map(Number).sort((a, b) => a - b);
  for (let i = 1; i < tiers.length; i++) if (!(X.tier_alpha_max[tiers[i]] >= X.tier_alpha_max[tiers[i - 1]])) bad('단계 불투명도 상한이 단계를 따라 커지지 않음');
  if (X.number.alpha_pop > X.number.alpha_max || X.number.alpha > X.number.alpha_max) bad('콤보 수 불투명도 > 상한');
  const lim = { num: [99, 0], par: [99, 0], spk: 99, lab: 99, ratio: 0 };
  for (const [k, t] of Object.entries(pal.themes)) {
    const clearSil = mix(t.bgFar, t.cardTint, pal.blend.clear_silhouette_mix);
    const tracks = [t.track1, t.track2, t.track3, mix(t.track1, t.track2, 0.5), mix(t.track2, t.track3, 0.5)];
    const starMin = Math.min(...tracks.map(b => cr(C.star, b)));
    for (const B of [t.bg, t.bgFar, clearSil]) {
      const v = cr(mix(B, PC[X.number.color], X.number.alpha_max), B); n++;
      lim.num = [Math.min(lim.num[0], v), Math.max(lim.num[1], v)];
      if (v < K.number_min || v > K.number_max) bad(`${k} 콤보 수 대비 ${v.toFixed(2)} (기준 ${K.number_min}~${K.number_max})`);
      if (v / starMin > K.number_vs_star_ratio_max) bad(`${k} 콤보 수 대비 ${v.toFixed(2)} > 별 대비 ${starMin.toFixed(2)} × ${K.number_vs_star_ratio_max}`);
      lim.ratio = Math.max(lim.ratio, v / starMin);
      const lv = cr(mix(B, PC[X.number.color], X.number.label_alpha), B); n++; lim.lab = Math.min(lim.lab, lv);
      if (lv < K.number_min) bad(`${k} 콤보 라벨 대비 ${lv.toFixed(2)} < ${K.number_min}`);
      for (const tr of tiers) for (const c of X.tier_colors[tr]) {
        const p = cr(mix(B, PC[c], X.tier_alpha_max[tr]), B); n++;
        lim.par = [Math.min(lim.par[0], p), Math.max(lim.par[1], p)];
        if (p < K.particle_min || p > K.particle_max) bad(`${k} 단계 ${tr} ${c} 파티클 대비 ${p.toFixed(2)} (기준 ${K.particle_min}~${K.particle_max})`);
      }
    }
    for (const g of ['perfect', 'good']) for (const c of X.spark[g]) for (const b of tracks) {
      const s = cr(mix(b, PC[c], X.spark.alpha_max), b); n++; lim.spk = Math.min(lim.spk, s);
      if (s < K.spark_min_on_track) bad(`${k} 타격 빛 ${g} ${c} / 길 대비 ${s.toFixed(2)} < ${K.spark_min_on_track}`);
    }
  }
  console.log(`콤보 연출 색(묶음 J) ${f ? 'FAIL ' + f : 'OK'} — ${n}쌍: 콤보 수 ${lim.num[0].toFixed(2)}~${lim.num[1].toFixed(2)}(별 대비의 최대 ${(lim.ratio * 100).toFixed(0)} %), 라벨 ≥ ${lim.lab.toFixed(2)}, 바탕 파티클 ${lim.par[0].toFixed(2)}~${lim.par[1].toFixed(2)}, 타격 빛/길 ≥ ${lim.spk.toFixed(2)}`);
  return f;
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
