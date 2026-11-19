#!/usr/bin/env node
// flow-01 팔레트 원본 + 검사 (art-director). 30-art 2절.
//   node assets/check/palette.mjs           검사만 (실패 시 종료 코드 1)
//   node assets/check/palette.mjs --write   파생 색 계산 → assets/palette.json 쓰고 검사
// 빌드는 assets/palette.json만 읽습니다(문서 표 파싱 금지, insights 시각·사운드).
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLevels } from './tutorial.mjs';
import { MARKS, MARKS_EXT } from './shapes.mjs';
import { contrast, mix, de2000, simulate, luminance, lab, hue } from './color.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../palette.json');

// ---------------- 원본 값 ----------------
// 쌍 색 순서 = 레벨에서 쓰는 순서. 앞 4색(L1~L4)은 세 가지 색약 시뮬레이션 모두에서 서로 ΔE00 ≥ 10 필수.
const PAIRS = [
  { key: 'p1', name_ko: '빨강', name_en: 'red',    hex: '#E04D61', mark: 'heart' },
  { key: 'p2', name_ko: '파랑', name_en: 'blue',   hex: '#2142BA', mark: 'circle' },
  { key: 'p3', name_ko: '노랑', name_en: 'yellow', hex: '#A87B00', mark: 'star' },
  { key: 'p4', name_ko: '초록', name_en: 'green',  hex: '#1E7640', mark: 'triangle' },
  { key: 'p5', name_ko: '보라', name_en: 'purple', hex: '#B64DE0', mark: 'moon' },
  { key: 'p6', name_ko: '하늘', name_en: 'teal',   hex: '#00899E', mark: 'square' },
];
// r3 어려운 판(쌍 ≤ 16): 쌍 7~16. 색만으로 16개를 한눈에 가르는 것은 색약·흑백에서 불가능 → **모양 표지가 주 구분**(16개 모두 다른 모양), 색은 정상 시각 ΔE00 ≥ 10(16색 전체)·대비 규칙은 기본 6색과 같게.
// 넓은 판에서는 선 위 흰 표지를 5칸마다 하나씩(긴 선도 중간에서 누구 선인지 보임). 1~50판은 쓰지 않음.
const PAIRS_EXT = [
  { key: 'p7', name_ko: '주황', name_en: 'orange', hex: '#C25A14', mark: 'diamond' },
  { key: 'p8', name_ko: '밤색', name_en: 'brown', hex: '#6B4E2E', mark: 'plus' },
  { key: 'p9', name_ko: '분홍', name_en: 'pink', hex: '#C2357F', mark: 'hexagon' },
  { key: 'p10', name_ko: '남색', name_en: 'navy', hex: '#13306B', mark: 'drop', tint_t: 0.68 },
  { key: 'p11', name_ko: '올리브', name_en: 'olive', hex: '#5C6B00', mark: 'leaf' },
  { key: 'p12', name_ko: '제비꽃', name_en: 'violet', hex: '#7A3FB0', mark: 'cloud' },
  { key: 'p13', name_ko: '회색', name_en: 'gray', hex: '#4A5568', mark: 'flower', tint_t: 0.66 },
  { key: 'p14', name_ko: '청록', name_en: 'dark teal', hex: '#0B6E6E', mark: 'bolt' },
  { key: 'p15', name_ko: '벽돌', name_en: 'brick', hex: '#B5452B', mark: 'house' },
  { key: 'p16', name_ko: '하늘색', name_en: 'sky', hex: '#3D7DD6', mark: 'hourglass', tint_t: 0.66 },
];
const COMMON = {
  ink: '#262B40',        // 아이콘·글자·손가락 외곽선
  inkSoft: '#5B6178',    // 보조 글자(레벨 번호·%)
  board: '#FFFFFF',      // 판(둥근 카드) 면
  boardEdge: '#DCE1EE',  // 판 바깥 1.5 px 테두리(그림자 대신, 투명도 없음)
  tile: '#EDF0F7',       // 빈칸 타일
  tileDot: '#8B93AA',    // 빈칸 가운데 작은 점(빈칸 = 칠할 곳 표지). 구멍 칸에는 없음
  gapGlow: '#6F7891',    // 빈칸 남음 신호(숨 쉬는 테두리). r2 S28: 노랑 → 빈칸 점(tileDot) 계열 회청색(별·노랑 쌍 tint 와 안 헷갈림)
  white: '#FFFFFF',      // 점 안 모양 표지, 버튼 면, 손가락 면
  star: '#FFC233',       // 별 면
  starEdge: '#8A5A00',   // 별 테두리
  button: '#FFFFFF',     // 둥근 버튼 면
  buttonEdge: '#D3D9E8', // 버튼 테두리
  pathTodo: '#C9CFDF',   // 지도 길(앞)
  pathDone: '#6474CF',   // 지도 길(지나옴)
  nodeLocked: '#DDE1EC', // 잠긴 노드 면
  nodeLockedMark: '#737B93',
  nodeOpen: '#FFFFFF',   // 다음(열림) 노드 면
  nodeOpenEdge: '#5B6CD6',
  finger: '#FFFFFF',
  fingerEdge: '#262B40',
};
// 레벨 바탕(위 → 아래 두 색, 움직이지 않음). lore 10-lore 7절 "하루 여행(아침 → 노을)" 표의 색 방향을 아주 옅게.
// decor = 판 뒤 바탕에 깔리는 기본 도형 1종(판 모서리 뒤에서 살짝 보임, 바탕과 대비 ≤ 1.3, 쌍 색·원 점 모양 금지 → 점과 헷갈리지 않게).
const THEMES = {
  level01: { lore: '햇살 마당',     top: '#FFF3D2', bottom: '#FFF8EA', decor: { shape: 'arc', count: 1 } },
  level02: { lore: '튤립 화분',     top: '#FDE6EE', bottom: '#FFF7EC', decor: { shape: 'ring', count: 3 } },
  level03: { lore: '물놀이 해변',   top: '#DDF1FA', bottom: '#FBF3E2', decor: { shape: 'wave', count: 1 } },
  level04: { lore: '구불구불 숲',   top: '#EAF6DD', bottom: '#DDF1E2', decor: { shape: 'arc', count: 2 } },
  level05: { lore: '과일 가게',     top: '#FFE8D6', bottom: '#FFF6D8', decor: { shape: 'ring', count: 4 } },
  level06: { lore: '징검다리 연못', top: '#D6F0EC', bottom: '#E3F1FB', decor: { shape: 'wave', count: 2 } },
  level07: { lore: '큰 꽃정원',     top: '#EFE4FA', bottom: '#FCE6F0', decor: { shape: 'wave', count: 3 } },
  level08: { lore: '돌담 길',       top: '#EFE8DF', bottom: '#FBF5EA', decor: { shape: 'arc', count: 3 } },
  level09: { lore: '무지개 들판',   top: '#E0F0FB', bottom: '#FDF6D9', decor: { shape: 'arc', count: 3 } },
  level10: { lore: '노을 하늘',     top: '#FFE1CC', bottom: '#ECE3F8', decor: { shape: 'ring', count: 3, only_on_complete: true } },
  menu:    { lore: '지도·결과',     top: '#F3EEFB', bottom: '#E4EEFA' },
  // r3 어려운 판 5단계 바탕(어린이 친화, 밝은 바탕 유지 — 대비 규칙). 문 페이지 = hard1
  hard1: { lore: '구름 위 산책',   top: '#E6F1FF', bottom: '#F3EEFB', decor: { shape: 'arc', count: 3 }, hard: 1 },
  hard2: { lore: '숲속 오두막',    top: '#E3F3E6', bottom: '#F4F1E2', decor: { shape: 'wave', count: 2 }, hard: 2 },
  hard3: { lore: '바닷속 정원',    top: '#DCEFF4', bottom: '#E7EEFB', decor: { shape: 'wave', count: 3 }, hard: 3 },
  hard4: { lore: '별빛 놀이공원',  top: '#F1E6F7', bottom: '#E5EAF9', decor: { shape: 'ring', count: 4 }, hard: 4 },
  hard5: { lore: '달나라 여행',    top: '#E8E6F6', bottom: '#F4EEF6', decor: { shape: 'ring', count: 3 }, hard: 5 },
};
// r2 50스테이지(10개씩 5챕터): 챕터 c(2~5)의 i번째 레벨(전체 번호 (c−1)·10 + i) 바탕 = 1챕터 i번째(아침 → 노을 하루 흐름) 바탕에 챕터 색을 24 % 섞음.
// 챕터마다 한 색 가족(1 맑은 날 = 지금 그대로 · 2 비 = 하늘 파랑 · 3 가을 = 살구 · 4 눈 = 얼음 청록 · 5 밤 = 옅은 라벤더, 밤도 밝은 바탕 — 대비 규칙 때문) + 챕터 안에서는 하루 흐름 그대로. 장식 도형도 i번째와 같음. 챕터 수가 바뀌면 CHAPTER_TINT 만 늘림.
export const CHAPTER_TINT = [null, { key: 'rain', hex: '#D3E6F8' }, { key: 'autumn', hex: '#F8E2C8' }, { key: 'snow', hex: '#DDF0F4' }, { key: 'night', hex: '#E2DDF7' }]; // lore 챕터 이름(비 오는 날·가을 나들이·눈 오는 날·반짝반짝 밤)에 맞춘 색 가족
const CH_MIX = 0.24;
for (let c = 2; c <= CHAPTER_TINT.length; c++) for (let i = 1; i <= 10; i++) {
  const base = THEMES[`level${String(i).padStart(2, '0')}`], t = CHAPTER_TINT[c - 1];
  THEMES[`level${String((c - 1) * 10 + i).padStart(2, '0')}`] = { lore: `챕터 ${c}(${t.key}) ${i}`, chapter: c, top: mix(base.top, t.hex, CH_MIX), bottom: mix(base.bottom, t.hex, CH_MIX), decor: base.decor };
}
for (let i = 1; i <= 10; i++) THEMES[`level${String(i).padStart(2, '0')}`].chapter = 1;
const DERIVE = { tint_t: 0.78, shade_t: 0.32 }; // tint = 쌍 색과 흰색 78 % 섞음(칠한 칸), shade = ink와 32 % 섞음(판정 이름 글자)

// r2 50판(balance 확정): 뒤 챕터에 4쌍 이하 판이 많음 → 11번 이후 3·4쌍 판은 6색 중 쓸 색·모양 슬롯을 레벨마다 돌려 씀(레벨 JSON 은 그대로, 빌드가 매핑).
// 후보 = 고른 색끼리 protan·deutan·tritan 모두 ΔE00 ≥ 10 인 조합만. 레벨 번호 순으로 후보를 돌리고(보폭 5), 바로 앞 레벨과 같은 색 묶음이면 다음 후보. 묶음 안 순서도 레벨 번호로 돌림.
function slotRotation(pairs) {
  const ok = (set) => set.every((a, i) => set.slice(i + 1).every((b) => ['protan', 'deutan', 'tritan'].every((kd) => de2000(simulate(pairs[a].hex, kd), simulate(pairs[b].hex, kd)) >= 10)));
  const subsets = (k) => { const out = []; const rec = (st, cur) => { if (cur.length === k) { out.push(cur); return; } for (let i = st; i < 6; i++) rec(i + 1, [...cur, i]); }; rec(0, []); return out.filter(ok); };
  const cand = { 3: subsets(3), 4: subsets(4) }, by = {}, prev = { 3: null, 4: null };
  for (let n = 11; n <= 50; n++) { by[n] = {}; for (const k of [3, 4]) { const C = cand[k]; let j = ((n - 11) * 5) % C.length; for (let t = 0; t < C.length && prev[k] && C[j].join() === [...prev[k]].sort().join(); t++) j = (j + 1) % C.length;
    const set = C[j], r = n % k, ord = [...set.slice(r), ...set.slice(0, r)]; by[n][k] = ord; prev[k] = ord; } }
  return { applies: '레벨 order ≥ 11 이고 쌍 수 3 또는 4', map: 'color_slot i → pairs[by_level[order][쌍 수][i]] (색·모양 표지·tint·shade 모두 그 pairs 항목)', else: 'color_slot i → pairs[i] 그대로(1~10판 = 튜토리얼 색 고정, 5·6쌍 판)', candidates: { 3: cand[3].length, 4: cand[4].length }, by_level: by };
}
function build() {
  const pairs = PAIRS.map((p) => ({ ...p, tint: mix(p.hex, COMMON.board, DERIVE.tint_t), shade: mix(p.hex, COMMON.ink, DERIVE.shade_t) }));
  return {
    schema_version: 1,
    _source: 'assets/check/palette.mjs --write 가 생성(art-director 원본). 30-art 2절 표는 요약이고 다르면 이 파일이 기준. 빌드는 이 파일만 읽음.',
    _rules: [
      '쌍 색은 레벨 JSON pairs[].color_slot 을 읽음: color_slot n → pairs[n](키 p{n+1}, 0부터 셈). 빌드는 쌍 순서가 아니라 color_slot 을 읽음. 쌍 k개 레벨은 color_slot 0..k−1 = p1..pk. 같은 쌍 = 같은 색 + 같은 모양 표지(mark)가 10레벨 내내 같음.',
      '점 = 쌍 색 원(지름 0.74칸) + 흰 모양 표지(점 지름의 0.46). 선 = 쌍 색, 굵기 0.48칸(r2 요청자 지시로 0.60 → 0.48, 20 % 얇게) 둥근 끝·둥근 꺾임. 연결된 쌍의 칸은 tint로 칠함, 연결 전 선 밑 칸은 tile 그대로. 연결된 점은 바깥 고리(지름 0.86칸, 굵기 0.05칸, 쌍 색).',
      '판정 이름 글자 = 그 쌍의 shade + 흰 테두리 3 px(paint-order stroke). 판정 % = inkSoft.',
      '빈칸 = tile + tileDot(가운데 점). 구멍 칸 = 판 카드에서 그 칸(둥근 모서리 tile_r)을 even-odd 로 도려내 바탕 그라디언트가 보이게 하고, 도려낸 둘레에 boardEdge 1.5 px 선. 타일·가운데 점 없음(lore: 칸이 없는 자리, 바탕이 보임).',
      '바탕 = themes.<레벨>.top → bottom 세로 선형 그라디언트 한 장, 움직이지 않음. 판 그림자는 투명도 0.10 이하 흐림 1개만 허용(번쩍임과 무관), 그 밖의 투명도는 연출 중 흐려짐에만.',
      'decor: 판 뒤 바탕 층에만, 색 = mix(theme.top, ink, 0.06), 크기 0.5~0.9칸, 판 카드 모서리 뒤에서 최대 0.4칸 보임. HUD 띠·판정 자리·글 자리·버튼 위에는 없음. level10 별 3개는 판 완료 때만 0.4 s 에 나타남(번쩍임 없음).',
      '빨강·검정 바탕·네온 발광·✕ 표시는 실패 표시로 쓰지 않음(실패 개념 없음). 빈칸 신호는 gapGlow(빈칸 점 계열 회청색, r2 S28).',
    ],
    pairs,
    pairs_ext: PAIRS_EXT.map((p) => ({ ...p, tint: mix(p.hex, COMMON.board, p.tint_t ?? DERIVE.tint_t), shade: mix(p.hex, COMMON.ink, DERIVE.shade_t) })),
    wide_line_mark_every_cells: 5,
    slot_rotation: slotRotation(pairs),
    common: COMMON,
    themes: THEMES,
    derive: DERIVE,
  };
}

// ---------------- 검사 ----------------
function check(P) {
  let fail = 0, warn = 0; const lines = [];
  const ok = (cond, msg, soft = false) => { if (!cond) { if (soft) { warn++; lines.push('권장 미달 ' + msg); } else { fail++; lines.push('FAIL ' + msg); } } };
  const C = P.common, pairs = P.pairs;
  const bgs = Object.entries(P.themes).flatMap(([k, t]) => [[k + '.top', t.top], [k + '.bottom', t.bottom]]);
  const rows = [];
  // A. 점·선 vs 판 ≥ 3:1 (WCAG 1.4.11 그래픽), 점 안 흰 표지 vs 점 ≥ 3:1
  for (const p of pairs) {
    const cb = contrast(p.hex, C.board), cm = contrast(p.hex, C.white), ct = contrast(p.hex, p.tint), cTile = contrast(p.hex, C.tile);
    ok(cb >= 3, `${p.key} 점·선 / 판 ${cb.toFixed(2)} < 3`);
    ok(cTile >= 3, `${p.key} 선 / 빈칸 타일 ${cTile.toFixed(2)} < 3`);
    ok(ct >= 2.4, `${p.key} 선 / 칠한 칸(tint) ${ct.toFixed(2)} < 2.4`);
    ok(cm >= 3, `${p.key} 흰 표지 / 점 ${cm.toFixed(2)} < 3`);
    // HUD 쌍 점 줄은 바탕 위
    let minBg = 99, where = '';
    for (const [k, v] of bgs) { const c = contrast(p.hex, v); if (c < minBg) { minBg = c; where = k; } }
    ok(minBg >= 3, `${p.key} 쌍 점 줄 / 바탕 ${minBg.toFixed(2)} (${where}) < 3`);
    // 판정 이름 글자(shade) vs 바탕·판 ≥ 4.5
    let minTxt = 99, tw = '';
    for (const [k, v] of [...bgs, ['board', C.board]]) { const c = contrast(p.shade, v); if (c < minTxt) { minTxt = c; tw = k; } }
    ok(minTxt >= 4.5, `${p.key} 판정 이름 글자 / 바탕 ${minTxt.toFixed(2)} (${tw}) < 4.5`);
    rows.push({ key: p.key, name: p.name_ko, hex: p.hex, tint: p.tint, shade: p.shade, board: cb, tile: cTile, tintC: ct, mark: cm, hudBg: minBg, text: minTxt, L: lab(p.hex)[0], hue: hue(p.hex) });
  }
  // B. 칠한 칸(tint) vs 빈칸 타일 ΔE ≥ 8, tint vs 판 ΔE ≥ 6
  for (const p of pairs) {
    const d1 = de2000(p.tint, C.tile), d2 = de2000(p.tint, C.board);
    ok(d1 >= 8, `${p.key} 칠한 칸 / 빈칸 ΔE00 ${d1.toFixed(1)} < 8`);
    ok(d2 >= 6, `${p.key} 칠한 칸 / 판 ΔE00 ${d2.toFixed(1)} < 6`);
  }
  // C. 쌍 색끼리 ΔE00: 정상 ≥ 20, 색약 3종: 앞 4색 ≥ 10 필수, 6색 전체 ≥ 10 권장(모양 표지가 보완)
  const kinds = ['normal', 'protan', 'deutan', 'tritan', 'achroma'];
  const matrix = {};
  for (const kind of kinds) {
    let min = 999, minPair = '';
    for (let i = 0; i < pairs.length; i++) for (let j = i + 1; j < pairs.length; j++) {
      const d = de2000(simulate(pairs[i].hex, kind), simulate(pairs[j].hex, kind));
      matrix[`${kind}:${pairs[i].key}-${pairs[j].key}`] = d;
      if (kind === 'normal') ok(d >= 20, `정상 시각 ${pairs[i].key}-${pairs[j].key} ΔE00 ${d.toFixed(1)} < 20`);
      else if (kind !== 'achroma') {
        const front = i < 4 && j < 4;
        ok(d >= 10, `${kind} ${pairs[i].key}-${pairs[j].key} ΔE00 ${d.toFixed(1)} < 10${front ? ' (앞 4색, 필수)' : ' (모양 표지로 보완)'}`, !front);
      }
      if (d < min) { min = d; minPair = `${pairs[i].key}-${pairs[j].key}`; }
    }
    matrix[`${kind}:min`] = [min, minPair];
  }
  // D. 흑백 명도 단: L* 를 3단 이상으로(가장 밝은 것과 어두운 것 차 ≥ 20)
  const Ls = pairs.map((p) => lab(p.hex)[0]);
  ok(Math.max(...Ls) - Math.min(...Ls) >= 20, `쌍 색 L* 범위 ${(Math.max(...Ls) - Math.min(...Ls)).toFixed(1)} < 20 (흑백 3단)`, true);
  // E. 공통: 글자·아이콘
  for (const [k, v] of [...bgs, ['board', C.board], ['button', C.button]]) {
    ok(contrast(C.ink, v) >= 7, `ink / ${k} < 7`);
    ok(contrast(C.inkSoft, v) >= 4.5, `inkSoft / ${k} ${contrast(C.inkSoft, v).toFixed(2)} < 4.5`);
  }
  ok(contrast(C.tileDot, C.tile) >= 2.5, `빈칸 점 / 타일 ${contrast(C.tileDot, C.tile).toFixed(2)} < 2.5`);
  ok(de2000(C.tile, C.board) >= 3, `빈칸 타일 / 판 ΔE00 ${de2000(C.tile, C.board).toFixed(1)} < 3 (구멍 칸과 구분)`);
  ok(contrast(C.starEdge, C.star) >= 3, `별 테두리 / 별 면 < 3`);
  ok(contrast(C.nodeOpenEdge, P.themes.menu.top) >= 3, `열린 노드 테두리 / 지도 바탕 < 3`);
  ok(contrast(C.pathDone, P.themes.menu.bottom) >= 3, `지나온 길 / 지도 바탕 ${contrast(C.pathDone, P.themes.menu.bottom).toFixed(2)} < 3`);
  ok(contrast(C.nodeLockedMark, C.nodeLocked) >= 2.5, `잠긴 노드 표지 / 면 < 2.5`);
  ok(contrast(C.gapGlow, C.tile) < 1.6 ? de2000(C.gapGlow, C.tile) >= 15 : true, `빈칸 신호색 / 타일 ΔE00 < 15`);
  // r2 S28: 빈칸 신호색은 타일 위 ≥ 3:1, 별 면·쌍 tint 와 정상·tritan 모두 ΔE00 ≥ 20
  ok(contrast(C.gapGlow, C.tile) >= 3, `빈칸 신호색 / 타일 ${contrast(C.gapGlow, C.tile).toFixed(2)} < 3`);
  for (const kind of ['normal', 'tritan']) for (const [n, v] of [['star', C.star], ...pairs.map((p) => [p.key + ' tint', p.tint])]) { const d = de2000(simulate(C.gapGlow, kind), simulate(v, kind)); ok(d >= 20, `${kind} 빈칸 신호색 / ${n} ΔE00 ${d.toFixed(1)} < 20`); }
  // r2 S33: 판 장식 도형은 쌍 표지 모양(하트·동그라미·별·세모·달·네모)과 겹치지 않음
  for (const [k, t] of Object.entries(P.themes)) if (t.decor && !['arc', 'wave', 'ring'].includes(t.decor.shape)) ok(false, `${k} decor ${t.decor.shape} 가 쌍 표지 모양과 겹침 (arc·wave·ring 만)`);
  // r2 얇은 선(요청자 2026-11-18): 선(쌍 색) / 칠한 칸(tint)·빈칸 타일 대비를 색약 3종 시뮬레이션에서도 ≥ 2.0, 선끼리 ΔE00 은 위 쌍 색 행렬과 같음(선 = 쌍 색)
  for (const kind of ['normal', 'protan', 'deutan', 'tritan']) for (const p of pairs) for (const [n, v] of [['tint', p.tint], ['tile', C.tile]]) { const c = contrast(simulate(p.hex, kind), simulate(v, kind)); ok(c >= 2.0, `${kind} ${p.key} 선 / ${n} 대비 ${c.toFixed(2)} < 2.0 (얇은 선)`); }
  if (Object.keys(P.themes).filter((k) => /^level\d\d$/.test(k)).length < 50) ok(false, `레벨 바탕 ${Object.keys(P.themes).length - 1}개 < 50 (5챕터)`);
  // r2 슬롯 돌려쓰기: 실제 레벨(levels/*.json)마다 쓰는 색 묶음이 서로 다르고, 색약 3종 ΔE00 ≥ 10, 이웃 레벨(둘 다 돌려쓰기)과 같은 묶음 아님
  { const SR = P.slot_rotation; if (!SR) ok(false, 'slot_rotation 없음'); else { const lv = loadLevels(); const used = (l) => { const k = l.pairs.length, m = l.order >= 11 && (k === 3 || k === 4) ? SR.by_level[l.order]?.[k] : null; return m ? l.pairs.map((p) => m[p.color_slot]) : null; };
    let rot = 0, prevSet = null, prevOrder = -1; for (const l of lv) { const u = used(l); if (!u) { prevSet = null; continue; } rot++;
      if (new Set(u).size !== u.length || u.some((x) => !(x >= 0 && x < 6))) ok(false, `L${l.order} 슬롯 매핑 잘못 ${u}`);
      for (let i = 0; i < u.length; i++) for (let j = i + 1; j < u.length; j++) for (const kd of ['protan', 'deutan', 'tritan']) { const d = de2000(simulate(pairs[u[i]].hex, kd), simulate(pairs[u[j]].hex, kd)); if (d < 10) ok(false, `L${l.order} ${kd} ${pairs[u[i]].key}-${pairs[u[j]].key} ΔE00 ${d.toFixed(1)} < 10`); }
      const key = [...u].sort().join(); if (prevSet === key && prevOrder === l.order - 1) ok(false, `L${l.order} 색 묶음이 L${l.order - 1} 와 같음`); prevSet = key; prevOrder = l.order; }
    lines.push(`슬롯 돌려쓰기: 레벨 ${rot}개(3쌍 후보 ${SR.candidates[3]}·4쌍 후보 ${SR.candidates[4]}), 색약 3종 ΔE00 ≥ 10, 이웃 같은 묶음 0`); } }
  // r3 쌍 7~16(어려운 판): 대비는 기본 6색과 같은 기준, 16색 정상 ΔE00 ≥ 10, 모양 16개 모두 다름, 얇은 선 색약 대비 ≥ 2.0
  { const ext = P.pairs_ext || [], all = [...pairs, ...ext]; if (ext.length < 10) ok(false, `쌍 색 ${all.length}개 < 16`);
    for (const p of ext) { ok(contrast(p.hex, C.board) >= 3, `${p.key} 점·선 / 판 < 3`); ok(contrast(p.hex, C.tile) >= 3, `${p.key} 선 / 빈칸 타일 ${contrast(p.hex, C.tile).toFixed(2)} < 3`); ok(contrast(p.hex, p.tint) >= 2.4, `${p.key} 선 / tint < 2.4`); ok(contrast(p.hex, C.white) >= 3, `${p.key} 흰 표지 / 점 < 3`);
      ok(de2000(p.tint, C.tile) >= 8, `${p.key} 칠한 칸 / 빈칸 ΔE00 < 8`); for (const [k, v] of [...bgs.filter(([k]) => k.startsWith('hard') || k.startsWith('menu')), ['board', C.board]]) { ok(contrast(p.shade, v) >= 4.5, `${p.key} 판정 이름 글자 / ${k} < 4.5`); }
      for (const kd of ['protan', 'deutan', 'tritan']) for (const [n, v] of [['tint', p.tint], ['tile', C.tile]]) { const c = contrast(simulate(p.hex, kd), simulate(v, kd)); ok(c >= 2.0, `${kd} ${p.key} 선 / ${n} ${c.toFixed(2)} < 2.0`); } }
    let mn = 99, mp = ''; for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const d = de2000(all[i].hex, all[j].hex); if (d < mn) { mn = d; mp = all[i].key + '-' + all[j].key; } }
    ok(mn >= 10, `16색 정상 시각 ΔE00 최소 ${mn.toFixed(1)} (${mp}) < 10`);
    const marks = all.map((p) => p.mark); if (new Set(marks).size !== marks.length) ok(false, '쌍 표지 모양이 겹침');
    for (const m of marks) if (!MARKS[m] && !MARKS_EXT[m]) ok(false, `표지 ${m} 경로 없음`);
    for (const t of ['hard1', 'hard2', 'hard3', 'hard4', 'hard5']) if (!P.themes[t]) ok(false, `바탕 ${t} 없음`);
    lines.push(`쌍 16개: 정상 ΔE00 최소 ${mn.toFixed(1)} (${mp}), 모양 16개 모두 다름(주 구분), 어려운 판 선 표지 ${P.wide_line_mark_every_cells}칸마다`); }
  ok(contrast(C.fingerEdge, C.finger) >= 7, `손가락 외곽선 / 면 < 7`);
  // E2. 구멍 칸(바탕이 보임) vs 빈칸 타일: 가운데 점 + 타일 모양이 주 구분. 색 차는 참고로 적고, 너무 같으면(ΔE00 < 2) 실패
  for (const [k, t] of Object.entries(P.themes)) for (const v of [t.top, t.bottom]) { const d = de2000(v, C.tile); ok(d >= 2, `${k} 구멍(바탕 ${v}) / 빈칸 타일 ΔE00 ${d.toFixed(1)} < 2`); }
  for (const [k, t] of Object.entries(P.themes)) if (t.decor) { const dc = mix(t.top, C.ink, 0.06); ok(contrast(dc, t.top) <= 1.3, `${k} decor 대비 > 1.3 (점과 헷갈림)`); }
  // F. 바탕 그라디언트는 '소프트': 위·아래 명도 차 작게(L* 차 ≤ 6), 판(흰색)보다 어둡게
  for (const [k, t] of Object.entries(P.themes)) {
    const dL = Math.abs(lab(t.top)[0] - lab(t.bottom)[0]);
    ok(dL <= 6, `${k} 바탕 위·아래 L* 차 ${dL.toFixed(1)} > 6`);
    ok(luminance(t.top) < luminance(C.board) && luminance(t.bottom) < luminance(C.board), `${k} 바탕이 판보다 밝음`);
    ok(de2000(t.top, C.board) >= 2 || de2000(t.bottom, C.board) >= 2, `${k} 바탕과 판 구분 ΔE00 < 2`);
  }
  return { fail, warn, lines, rows, matrix };
}

const args = process.argv.slice(2);
let P;
if (args.includes('--write') || !existsSync(OUT)) { P = build(); writeFileSync(OUT, JSON.stringify(P, null, 1) + '\n'); console.log('wrote', OUT); }
else P = JSON.parse(readFileSync(OUT, 'utf8'));
const r = check(P);
console.log('쌍  이름  색       tint     shade    판    타일  tint  흰표지 HUD바탕 글자  L*    hue');
for (const x of r.rows) console.log(`${x.key}  ${x.name}  ${x.hex}  ${x.tint}  ${x.shade}  ${x.board.toFixed(2)}  ${x.tile.toFixed(2)}  ${x.tintC.toFixed(2)}  ${x.mark.toFixed(2)}   ${x.hudBg.toFixed(2)}    ${x.text.toFixed(2)}  ${x.L.toFixed(1)}  ${x.hue.toFixed(0)}`);
for (const k of ['normal', 'protan', 'deutan', 'tritan', 'achroma']) { const [m, p] = r.matrix[`${k}:min`]; console.log(`ΔE00 최소 ${k.padEnd(8)} ${m.toFixed(1)} (${p})`); }
if (args.includes('--matrix')) for (const [k, v] of Object.entries(r.matrix)) if (!k.endsWith(':min')) console.log(k, v.toFixed(1));
for (const l of r.lines) console.log(l);
console.log(r.fail ? `팔레트 검사 실패 ${r.fail}건, 권장 미달 ${r.warn}건` : `팔레트 검사 통과 (권장 미달 ${r.warn}건)`);
process.exit(r.fail ? 1 : 0);
