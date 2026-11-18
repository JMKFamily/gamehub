#!/usr/bin/env node
// rhythm-01 round-3 "북길" 화면 규격 (30-art 16절). 외부 패키지 없음.
//   node assets/road-layout.mjs           assets/layout.json 쓰기 + 검사 + 표 출력
//   node assets/road-layout.mjs --check   layout.json 을 다시 계산해 검사만 (파일 안 씀, 실패 시 종료 코드 1)
//   node assets/road-layout.mjs --md      30-art 16절에 붙일 마크다운 표만 출력
//
// 읽는 값(읽기만): levels/0N-*.json (schema v3: bpm·judge·path.preview_lead_beats(_portrait)·파생 bars/patterns·path.chunks·practice),
//   balance.json preview.lead_beats(거울 값)·path_v3.chunk_library. v3 레벨이 없을 때만 curve_planned·ASSUMED_LEAD(가정)로 대신함.
// 교차 리뷰(R23~R25) 검사 추가: 별 목록 = bars/patterns 와 path.chunks 재계산이 같음, 레벨 최소 별 간격(L1 정박만·1박),
//   레벨 path 값 = balance 거울 값, 첫 별·연습 부활 다음 별 ≥ 시도 시작 + 미리 보기 박, 1박 px 표(balance 17-8 대조용).
// 이 파일이 정하는 것 = 모양·크기·자리(art). 시간·판정 값은 balance 소유이고 여기서는 검사에만 씀.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = resolve(HERE, '..');
const OUT = join(HERE, 'layout.json');
const args = process.argv.slice(2);

// ---------- 규칙 (30-art 16-1) ----------
export const RULE = {
  judge_x_frac: { landscape: 0.30, portrait: 0.20 },          // R18: 판정 선 x = 안전 영역 안 너비의 비율
  road_y_frac: { landscape: 0.48, portrait: 0.40 },           // 길 띠 가운데 y = 높이 비율
  star_d_frac_of_short_side: 0.10,                            // 별 지름 상한 = 짧은 변 × 0.10
  half_gap_px: 8,                                             // 반박 간격 ≥ 별 지름 + 8 (R19)
  road_h_mul: 1.6,                                            // 길 띠 높이 = 별 지름 × 1.6
  ball_d_mul: 0.8, ball_d_min: 24,                            // 공 지름 = 별 지름 × 0.8 (최소 24)
  ball_gap_px: 2, ball_bounce_mul: 0.5,                       // 공은 길 윗변 2 px 위에 앉고, 박마다 공 지름 × 0.5 높이로 뜀(박 시각 = 착지)
  drum_r_mul: 0.7, drum_gap_px: 6,                            // 판정 북 반지름 = 별 지름 × 0.7, 길 아랫변 6 px 아래
  line_w: (d) => Math.max(6, Math.round(d / 8)),              // 판정 선 굵기(가는 선, 6 px 기본, 큰 화면만 비례)
  fx_grow: { perfect: 1.2, good: 1.1 },                       // 판정 때 별 커짐 상한 (오른쪽 = 읽기 쪽으로는 이 만큼만)
  finger_cell: (d) => Math.max(64, Math.round(1.6 * d)),      // 손가락 칸 한 변
  finger_gap_px: 8,
  text_slot: { w_max: 220, h: 40, gap: 8 },                   // tut_drum_tap 글 자리(2줄 × 20 px, R24 키. 옛 tut_tap 대체)
  hud: { bar_y: { portrait: 24, landscape: 20 }, bar_h: 10, attempt_dy: 14, attempt_r: 4.5, pause: 48, pause_margin: 12 },
  // (16-4 점 10칸 콤보 줄 — 16-14 콤보 파격 연출로 대체. 값은 기록으로 남기고 HUD 띠 계산·검사에서 뺌)
  combo: { _status: 'deprecated (16-14 콤보 파격 연출로 대체, HUD 띠 계산에서 뺌)', dy_from_attempt: 16, dot_r: 4, dot_pitch: 12, cells: 10, mark_r: 6, mark_pitch: 16, marks_max: 3, x0: 16 },
  hud_band_pad: 6,                                            // HUD 띠 아래끝 = HUD 요소 중 가장 아래 + 6
  thumb: { top_frac: 0.70, gap: 12, bottom_margin: 16 },      // 세로만
  margin: 16,
  // 판정 이름·% (30-art 16-13, 요청자 지시 "판정 이름과 퍼센트"). 자리 = 길 띠 아래, 판정 북(물결 포함)·손가락 칸 오른쪽
  judge_label: {
    font: { perfect: 46, good: 42, pass: 40 },                // 이름 글자 크기(px, 굵게 700). 짧은 변 500 넘는 화면은 × 짧은 변/500
    scale_ref: 500,
    pct_mul: 0.55,                                            // % 글자 = 이름 × 0.55 (0.5~0.6)
    // 글자 폭·높이 = 빌드 글꼴 목록(system-ui, "Segoe UI", "Malgun Gothic" …) 굵게, Edge 캔버스 measureText 실측 em (2026-11-17)
    em: { name_budget: 3.0, pct_max: 2.615, cap: 0.725, hangul: 0.95 },
    names_em: { ko: { perfect: ['딱이야', 3.0], good: ['좋아', 2.0], pass: ['됐어', 2.0] }, en: { perfect: ['Wow!', 2.72], good: ['Nice', 2.11], pass: ['OK', 1.422] } },
    width_slack: 1.05,                                        // Android 글꼴(Roboto·Noto) 폭 차 여유
    mark_w_mul: 0.5, mark_gap_mul: 0.12,                      // 이름 왼쪽 표지(빛살 5/3개·고리) 칸 폭, 표지와 이름 사이
    pct_gap_mul: 0.25, line_gap_mul: 0.1,                     // (row 일 때) 이름 오른쪽 % 사이 / (stack) 이름 아래 % 줄 사이
    arrange: { portrait: 'stack', landscape: 'stack' },       // 두 줄: 이름 위·% 아래 (lore R3-12-2, 한 줄 "이름 + %" 금지)
    // L1 손가락 칸·tut_drum_tap 글은 첫 별 판정 프레임에 사라지고(balance tutorial_cue.hide_after, 빌드 cueVisible) 판정 글은 그 판정부터 나타나므로
    // 같은 프레임에 그려지지 않음 → 가로 화면에서 tut 글 자리와 자리가 겹치는 것만 "시간 배타"로 허용(검사가 hide_after 값을 확인)
    time_exclusive_with: ['text'],
    pop: 1.15, pop_ms: 80, hold_ms: 400, fade_ms: 150,        // 튐 1.0 → 1.15 → 1.0 (80 ms), 나타난 뒤 400 ms까지 유지, 150 ms 흐려짐
    origin: 'left_middle',                                    // 튐 기준점 = 글 덩어리 왼쪽 가운데(북 쪽으로 커지지 않음)
    gap: 8, road_gap: 6, drum_ripple: 1.18,                   // 북 물결 최대 1.18배 바깥 + 8, 길 아랫변 + 6
    outline_mul: 0.08, outline_min: 2,                        // 글자 테(outline 색) 두께
    min_cap_px: 28,                                           // 글자 높이(영어 대문자 높이 기준, 한글은 더 큼) 28 px 이상
    fx_ms: 220,                                               // 딱 이펙트 시간(판정 별과 함께 흐름) — 겹침 검사용
  },
  // 결과 화면 (30-art 16-13-4): 등급 북·버튼 = 16-6·빌드 art.json clear 값, 정확도 %·최고 콤보 자리
  result: {
    grade_r_mul: 0.6, grade_pitch_mul: 2.4, grade_pad: 2,     // 등급 북 반지름 = 판정 북 × 0.6, 간격 = 판정 북 반지름 × 2.4
    btn: 64, btn_gap: 16, btn_below_gap: 12, btn_count: 3,
    acc_font: 32, combo_font: 22, scale_ref: 500,             // 정확도 숫자 / 최고 콤보 숫자 (굵게)
    icon_mul: 0.8, icon_gap_mul: 0.2, combo_icon_mul: 1.1, new_mark_mul: 0.4, digits_em: 1.74, // 콤보 숫자 3자리 자리
    gap: 12, row_gap_mul: 0.75,
    title_h: 30,                                              // 빌드 clearTitle 자리(참고 검사): top = max(HUD 띠 + 8, 공 꼭대기 − 36)
  },
  // 콤보 파격 연출 (30-art 16-14, 요청자 지시 2026-11-17 "콤보 파격 연출"). 색·투명도 = palette.json combo_fx_r3
  combo_fx: {
    show_from: 2,                                             // 콤보 수가 보이기 시작하는 값 (balance combo.show_from 과 같아야 함, --check)
    number: {
      h_frac: 0.14, h_frac_min: 0.12, h_frac_max: 0.18,       // 숫자 높이(글자 윗끝~아랫끝) = 화면 높이 × 0.14, 자리가 모자라면 줄이되 0.12 이상
      // 빌드 글꼴 목록 굵게 700, Edge 캔버스 measureText 실측(2026-11-18): 숫자 높이 0.73 em, 숫자 폭 0.58 em(고정폭 숫자), "69" 1.159 em
      digit_cap_em: 0.73, digit_w_em: 0.58, digits: 2, width_slack: 1.05, // 상자 = 두 자리 기준. 100 이상은 글자를 2/3로 줄여 같은 폭(지금 레벨 최대 69)
      gap_hud: 4, gap_road: 4,                                // HUD 띠 아래 + 4 ~ 길 윗변 − 4 사이(위쪽 정렬)
      label_mul: 0.16, label_min_px: 12, label_gap: 3,        // 라벨 글자 = 숫자 높이 × 0.16 (최소 12 px), 숫자 상자 위 3 px
      label_em_budget: 4.0, label_icon_em: 1.1, label_icon_gap_em: 0.3, // 라벨 = [점 3개 그림][자체 제작 말(lore combo_label)], 말 폭 ≤ 4.0 em(굵게)
      pop: { perfect: 1.10, good: 1.08, pass: 1.06, ms: 100 },// 판정마다 튐(가운데 기준, 1.0 → p → 1.0), 가장 짧은 별 간격 214 ms보다 짧게
      pop_tier: 1.15, pop_tier_ms: 200,                       // 단계에 닿은 판정의 튐
      pop_max: 1.15,                                          // 겹침 검사 상자 배율(위 값 중 가장 큰 것)
      break_ms: 300, break_scale: 0.85,                       // 끊김: 0.3 s 동안 1.0 → 0.85배 + 불투명도 → 0 (ease-in, 소리 없음)
      clear_fade_ms: 200,                                     // 클리어: HUD 페이드와 함께
    },
    tiers: [                                                  // 화면 전체(바탕) 파티클 단계. at = 콤보 값. n = 기준 화면(360x640) 개수
      { tier: 1, at: 10, n: 10, d: [3, 5], vy: [12, 20] },
      { tier: 2, at: 20, n: 18, d: [3, 6], vy: [18, 30] },
      { tier: 3, at: 30, n: 28, d: [4, 7], vy: [24, 40] },
      { tier: 4, at: 50, n: 40, d: [4, 8], vy: [30, 50] },
    ],
    ambient: {
      ref_area: 360 * 640, area_mul_max: 2,                   // 개수 × clamp(W·H / 기준 넓이, 1, 2)
      size_mul_max: 2,                                        // 지름·속도·흔들림 × clamp(짧은 변/360, 1, 2)
      life_s: [2.4, 3.6], fade_in_s: 0.4, fade_out_s: 0.6,    // 위로 천천히 떠오름(vy, px/s), 좌우 흔들림 ±6 px · 주기 2.4~3.6 s, 회전 없음
      sway_px: 6, sway_period_s: [2.4, 3.6],
      tier_up_fade_in_s: 0.4,                                 // 단계가 오르면 늘어난 개수만큼 아래 절반에 바로 생겨 0.4 s 동안 나타남(번쩍임 없음)
      break_ms: 300, break_settle_px: 10,                     // 끊김: 0.3 s 동안 떠오르기 멈추고 10 px 가라앉으며 불투명도 × (1 − q²) → 0, 생성 멈춤. 콤보 크기와 무관하게 같음
      clear_fade_s: 0.6,                                      // 클리어: 생성 멈춤, 0.6 s 동안 사라짐
      shape: 'circle',                                        // 둥근 점만(별 모양·네모 조각·빛줄기 금지). 지름 < 3 px 는 fillRect 로
    },
    spark: {                                                  // 타격 지점 빛 파티클: 판정 선 왼쪽 반쪽, 길 띠 안
      n: { perfect: [4, 2], good: [2, 1], pass: [0, 0] },     // 개수 = a + b × 단계(0~4) → 딱 4~12, 좋아 2~6, 통과 0
      life_ms: 260, angle_deg: [150, 210],                    // 왼쪽 ±30°(수학 각, 180 = 왼쪽). 오른쪽(읽기 영역)으로 가지 않음
      range_mul: 1.2, d_mul: 0.12, d_min: 2,                  // 최대 이동 = 별 지름 × 1.2(감속 ease-out), 지름 = 별 지름 × 0.12
      inherit_road_flow: true,                                // 판정된 별처럼 길과 함께 왼쪽으로 흐름(16-3)
      origin: 'judge_x − star_r × 0.5, road.yc',
    },
    reduced_motion: {                                         // prefers-reduced-motion: reduce 또는 설정 "움직임 줄이기" 켬
      ambient_n_mul: 0.25, ambient_alpha_mul: 0.75, ambient_still: true, // 개수 1/4(올림), 움직임 0(제자리에서 0.4 s 나타나고 끊기면 0.3 s 사라짐)
      spark: false, number_pop_scale: false,                  // 타격 빛 0, 콤보 수는 크기 튐 없이 불투명도만 0.1 s 올랐다 내려옴
      keeps: '16-3 판정 이펙트(빛살·북 물결)·판정 글·소리는 그대로(핵심 피드백)',
    },
    pool: 112,                                                // 미리 잡아 두는 파티클 칸(바탕 최대 80 + 타격 빛 최대 24 + 여유 8). 프레임마다 새 객체 만들지 않음
    alpha_buckets: 4,                                         // 불투명도를 4단으로 묶어 색 × 단 마다 경로 하나 → 바탕 파티클 채우기 호출 ≤ 16
    keepout_pad: 4,                                           // 바탕 파티클·콤보 수를 그리지 않는 구역 둘레 여백
  },
};

// 미리 보기 박 수 가정 (balance 값이 오면 그 값). 세로 = min(가로, 3.5) — 반박이 있는 레벨(L2~)에만 영향
const ASSUMED_LEAD = { landscape: [4, 4, 4, 3.5, 3.5, 3.5, 3, 3, 3, 3] };
ASSUMED_LEAD.portrait = ASSUMED_LEAD.landscape.map((n, i) => (i === 0 ? n : Math.min(n, 3.5)));

const RES = [[360, 640], [412, 915], [640, 360], [1280, 720]];
const SAFE_CASES = [[360, 640, { t: 24, b: 24, l: 0, r: 0 }], [412, 915, { t: 24, b: 34, l: 0, r: 0 }], [640, 360, { t: 0, b: 0, l: 44, r: 44 }], [1280, 720, { t: 0, b: 0, l: 44, r: 44 }]];

// ---------- 레벨 값 읽기 ----------
// v3 별 목록: 카운트인 뒤 8분 격자 절대 자리(마디 b, 자리 0~7 → b·8 + 자리). 파생 bars/patterns 기준
export function starsFromBars(L) {
  const out = [];
  L.bars.forEach((bar, b) => {
    if (bar.mode !== 'play') return;
    const p = L.patterns?.[bar.pattern];
    if (!p) throw new Error(`레벨 ${L.id} 마디 ${b} 무늬 ${bar.pattern} 없음`);
    for (const x of p.slots) out.push(b * 8 + x);
  });
  return out.sort((x, y) => x - y);
}
// 같은 목록을 레벨 원본 path.chunks + balance path_v3.chunk_library 에서 따로 계산(balance 17-1 빈 박 정의: 다음 시작 = floor(앞 마지막 별 박) + 1 + 빈 박)
export function starsFromChunks(L, lib) {
  const out = []; let lastBeat = null;
  for (const c of L.path.chunks) {
    const sh = lib[c.shape];
    if (!sh) throw new Error(`레벨 ${L.id} 덩어리 모양 ${c.shape} 없음`);
    const start = lastBeat == null ? c.empty_before : Math.floor(lastBeat) + 1 + c.empty_before;
    for (const x of sh.slots) out.push(start * 2 + x);
    lastBeat = start + sh.slots.at(-1) / 2;
  }
  return out;
}
const numKeys = (o) => Object.keys(o).filter((k) => /^\d+$/.test(k)).sort().map((k) => o[k]);
function levelsInfo() {
  const B = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8'));
  const files = readdirSync(join(PROJ, 'levels')).filter((f) => f.endsWith('.json')).sort();
  const out = []; const notes = []; let v3 = 0;
  const lib = B.path_v3?.chunk_library || {};
  for (let i = 1; i <= 10; i++) {
    const id = String(i).padStart(2, '0');
    const f = files.find((x) => x.startsWith(id + '-'));
    const L = f ? JSON.parse(readFileSync(join(PROJ, 'levels', f), 'utf8')) : null;
    const C = B.curve_planned?.[id];
    let bpm, pe, pl, halfBeats, minBeats = null, stars = null, leadL = null, leadP = null, firstBeat = null, revive = [], chunkMismatch = false, offbeatStart = 0;
    if (L && (L.schema_version || 2) >= 3) {
      v3++;
      bpm = L.bpm; pe = L.judge.pass_early_ms; pl = L.judge.pass_late_ms;
      stars = starsFromBars(L);
      chunkMismatch = starsFromChunks(L, lib).join() !== stars.join();
      minBeats = Math.min(...stars.slice(1).map((x, k) => (x - stars[k]) / 2));
      halfBeats = minBeats < 1;
      offbeatStart = stars.filter((x) => x % 2 === 1 && !stars.includes(x - 1)).length; // 반박은 늘 정박 바로 뒤(당김음 없음)
      leadL = L.path.preview_lead_beats; leadP = L.path.preview_lead_beats_portrait ?? leadL;
      firstBeat = L.count_in_bars * L.beats_per_bar + stars[0] / 2; // 시도 시작(카운트인 첫 박)부터 첫 별까지 박
      revive = (L.practice?.checkpoints || []).map((c) => ({ beat: c.beat, ahead: L.count_in_bars * L.beats_per_bar + (c.next_star_beat - c.beat) }));
    } else if (L && (i <= 3 || !C)) { bpm = L.bpm; pe = L.judge.pass_early_ms; pl = L.judge.pass_late_ms; halfBeats = i >= 2; }
    else { bpm = C.bpm; pe = C.pass_early_ms; pl = C.pass_late_ms; halfBeats = i >= 2; }
    out.push({ id, bpm, pe, pl, halfBeats, minBeats, nStars: stars?.length ?? null, leadL, leadP, firstBeat, revive, chunkMismatch, offbeatStart });
  }
  let lead = ASSUMED_LEAD, leadSrc = '가정(00-benchmark 8-4·R19, 세로 = min(가로, 3.5))';
  const PL = B.preview?.lead_beats;
  if (v3 === 10) { lead = { landscape: out.map((x) => x.leadL), portrait: out.map((x) => x.leadP) }; leadSrc = 'levels/*.json path.preview_lead_beats · preview_lead_beats_portrait (v3 원본, balance 확정)'; }
  else if (PL && typeof PL === 'object') {
    const pick = (o) => (Array.isArray(o) ? o : numKeys(o));
    if (PL.landscape && PL.portrait) { lead = { landscape: pick(PL.landscape), portrait: pick(PL.portrait) }; leadSrc = 'balance.json preview.lead_beats'; }
    else if (!PL.landscape) { const a = pick(PL); lead = { landscape: a, portrait: a.map((n, i) => (out[i].halfBeats ? Math.min(n, 3.5) : n)) }; leadSrc = 'balance.json preview.lead_beats (세로는 art 규칙 min(·, 3.5))'; }
  }
  // 거울 값 대조 (balance.json preview.lead_beats = 레벨 path)
  if (v3 === 10) {
    if (!(PL?.landscape && PL?.portrait)) notes.push('balance.json preview.lead_beats{landscape, portrait} 거울 값 없음');
    else {
      const ml = numKeys(PL.landscape), mp = numKeys(PL.portrait);
      out.forEach((x, i) => { if (ml[i] !== x.leadL || mp[i] !== x.leadP) notes.push(`L${x.id} 미리 보기 박 레벨 ${x.leadL}/${x.leadP} ≠ balance.json 거울 ${ml[i]}/${mp[i]}`); });
    }
  }
  return { levels: out, lead, leadSrc, mirrorMismatch: notes };
}

// ---------- 한 화면 규격 ----------
export function layout(W, H, safe = { t: 0, b: 0, l: 0, r: 0 }, lead = ASSUMED_LEAD) {
  const R = RULE;
  const o = W < H ? 'portrait' : 'landscape';
  const S = Math.min(W, H);
  const xj = safe.l + R.judge_x_frac[o] * (W - safe.l - safe.r);
  const D = W - safe.r - xj; // 미리 보기 거리: 오른쪽 끝(별 중심) → 판정 선
  const nHalfMax = Math.max(...lead[o].slice(1)); // 반박이 있는 레벨 중 가장 긴 미리 보기 박
  const sHalfWorst = D / (2 * nHalfMax);
  const d = Math.floor(Math.min(R.star_d_frac_of_short_side * S, sHalfWorst - R.half_gap_px));
  const r = d / 2;
  const roadH = Math.round(R.road_h_mul * d);
  const yc = safe.t + R.road_y_frac[o] * (H - safe.t - safe.b);
  const road = { x0: 0, x1: W, y0: yc - roadH / 2, y1: yc + roadH / 2, yc };
  const ballD = Math.max(R.ball_d_min, Math.round(R.ball_d_mul * d));
  const ball = { d: ballD, x: xj, yRest: road.y0 - R.ball_gap_px - ballD / 2, bounce: R.ball_bounce_mul * ballD };
  ball.top = ball.yRest - ballD / 2 - ball.bounce;
  const drumR = R.drum_r_mul * d;
  const drum = { r: drumR, x: xj, y: road.y1 + R.drum_gap_px + drumR };
  const lineW = R.line_w(d);
  const line = { x: xj, w: lineW, y0: road.y0, y1: drum.y - drumR };
  // HUD
  const bar = { x0: 16 + safe.l, y0: R.hud.bar_y[o] + safe.t, h: R.hud.bar_h };
  const pause = { x0: W - safe.r - R.hud.pause_margin - R.hud.pause, y0: R.hud.pause_margin + safe.t, w: R.hud.pause, h: R.hud.pause };
  bar.x1 = pause.x0 - 12;
  const attemptY = bar.y0 + bar.h + R.hud.attempt_dy;
  // 16-14: HUD 띠 안 콤보 줄(16-4)은 없어짐 → HUD 띠 아래끝 = 일시정지·시도 점 중 아래 + 6
  const hudBottom = Math.max(pause.y0 + pause.h, attemptY + R.hud.attempt_r) + R.hud_band_pad;
  // 손가락: 판정 북 바로 아래 (콤보는 HUD 띠라 겹칠 일 없음). 칸 가운데 x = 판정 선, 화면 여백 안으로 밀기
  const cell = R.finger_cell(d);
  let fx = Math.max(xj, safe.l + R.margin + cell / 2);
  const finger = { s: cell, x0: fx - cell / 2, x1: fx + cell / 2, y0: drum.y + drumR + R.finger_gap_px };
  finger.y1 = finger.y0 + cell;
  // tut_drum_tap 글 자리
  const T = R.text_slot;
  let text;
  if (o === 'portrait') {
    const w = Math.min(W - safe.l - safe.r - 2 * R.margin, T.w_max);
    const cx = Math.min(Math.max(fx, safe.l + R.margin + w / 2), W - safe.r - R.margin - w / 2);
    text = { x0: cx - w / 2, x1: cx + w / 2, y0: finger.y1 + T.gap, y1: finger.y1 + T.gap + T.h, side: 'below_finger' };
  } else {
    const x0 = finger.x1 + T.gap, w = Math.min(T.w_max, W - safe.r - R.margin - x0);
    const cy = (finger.y0 + finger.y1) / 2;
    text = { x0, x1: x0 + w, y0: cy - T.h / 2, y1: cy + T.h / 2, side: 'right_of_finger' };
  }
  let thumb = null;
  if (o === 'portrait') {
    thumb = { x0: 16, x1: W - 16, y0: Math.max(text.y1 + R.thumb.gap, R.thumb.top_frac * H), y1: H - R.thumb.bottom_margin - safe.b };
  }
  const silFrame = { x0: 0, y0: hudBottom + 8, x1: W, y1: thumb ? thumb.y0 - 8 : H };
  const r2 = (v) => Math.round(v * 10) / 10;
  const round = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === 'number' ? r2(v) : v]));
  // 판정 이름·% 자리 (16-13): 길 아랫변 + 6, 판정 북 물결(1.18배)·손가락 칸 오른쪽 + 8. 상자 = 가장 큰 등급(딱) × 튐 1.15배
  const J = R.judge_label;
  const kJ = Math.max(1, S / J.scale_ref);
  const arr = J.arrange[o];
  const grades = {};
  for (const g of ['perfect', 'good', 'pass']) {
    const F = Math.round(J.font[g] * kJ), P = Math.round(J.pct_mul * F);
    const mw = J.mark_w_mul * F, mg = J.mark_gap_mul * F;
    const nw = J.em.name_budget * F * J.width_slack, pw = J.em.pct_max * P * J.width_slack;
    const w = arr === 'stack' ? mw + mg + Math.max(nw, pw) : mw + mg + nw + J.pct_gap_mul * F + pw;
    const h = arr === 'stack' ? F + J.line_gap_mul * F + P : F;
    grades[g] = { name_px: F, pct_px: P, cap_px: r2(J.em.cap * F), mark_w: r2(mw), w: r2(w), h: r2(h) };
  }
  const wMax = Math.max(...Object.values(grades).map((g) => g.w)), hMax = Math.max(...Object.values(grades).map((g) => g.h));
  const jx0 = Math.max(drum.x + J.drum_ripple * drumR, finger.x1) + J.gap, jy0 = road.y1 + J.road_gap;
  const judgeLabel = {
    arrange: arr, x0: r2(jx0), y0: r2(jy0), x1: r2(jx0 + J.pop * wMax), y1: r2(jy0 + J.pop * hMax),
    anchor: { x: r2(jx0), y: r2(jy0 + (J.pop * hMax) / 2), origin: J.origin }, content_w: r2(wMax), content_h: r2(hMax),
    outline_px: Math.max(J.outline_min, Math.round(J.outline_mul * grades.pass.name_px)), grades,
  };
  // 콤보 파격 연출 (16-14): 위쪽 가운데 큰 콤보 수 + 바탕 파티클 금지 구역 + 타격 빛 범위
  const CF = R.combo_fx, NU = CF.number;
  const zy0 = hudBottom + NU.gap_hud, zy1 = road.y0 - NU.gap_road, zH = zy1 - zy0;
  let dh = NU.h_frac * H, lpx = Math.max(NU.label_min_px, Math.round(NU.label_mul * dh));
  if (lpx + NU.label_gap + dh * NU.pop_max > zH) { dh = (zH - lpx - NU.label_gap) / NU.pop_max; lpx = Math.max(NU.label_min_px, Math.round(NU.label_mul * dh)); dh = Math.min(dh, (zH - lpx - NU.label_gap) / NU.pop_max); }
  const nF = dh / NU.digit_cap_em, cx = safe.l + (W - safe.l - safe.r) / 2;
  const dW = NU.digits * NU.digit_w_em * nF * NU.width_slack, dZw = dW * NU.pop_max, dZh = dh * NU.pop_max;
  const labelBox = { x0: cx - (lpx * (NU.label_icon_em + NU.label_icon_gap_em + NU.label_em_budget) * NU.width_slack) / 2, y0: zy0, h: lpx };
  labelBox.x1 = 2 * cx - labelBox.x0; labelBox.y1 = zy0 + lpx;
  const digitsBox = { x0: cx - dZw / 2, x1: cx + dZw / 2, y0: labelBox.y1 + NU.label_gap, y1: labelBox.y1 + NU.label_gap + dZh };
  const digitCy = (digitsBox.y0 + digitsBox.y1) / 2;
  const kA = Math.min(CF.ambient.size_mul_max, Math.max(1, S / 360)), aA = Math.min(CF.ambient.area_mul_max, Math.max(1, (W * H) / CF.ambient.ref_area));
  const ballKeep = { x0: ball.x - ballD / 2 - CF.keepout_pad, x1: ball.x + ballD / 2 + CF.keepout_pad, y0: ball.top - CF.keepout_pad, y1: road.y0 - 2 }; // 길 금지 구역과 맞닿게 잘라 겹치지 않게(evenodd)
  const roadKeep = { x0: 0, x1: W, y0: road.y0 - 2, y1: road.y1 + 2 };
  const labelKeep = { x0: jx0 - CF.keepout_pad, x1: jx0 + J.pop * wMax + CF.keepout_pad, y0: Math.max(road.y1 + 2, jy0 - CF.keepout_pad), y1: jy0 + J.pop * hMax + CF.keepout_pad };
  const sd = Math.max(CF.spark.d_min, CF.spark.d_mul * d), rg = CF.spark.range_mul * d, a0 = CF.spark.angle_deg;
  const sox = xj - r * 0.5, soy = yc;
  const sinMax = Math.max(Math.abs(Math.sin((a0[0] * Math.PI) / 180)), Math.abs(Math.sin((a0[1] * Math.PI) / 180)));
  const cosMax = Math.max(Math.cos((a0[0] * Math.PI) / 180), Math.cos((a0[1] * Math.PI) / 180)); // 가장 오른쪽으로 가는 성분(음수여야 함)
  const comboFx = {
    number: {
      digit_h: r2(dh), digit_h_frac: +(dh / H).toFixed(3), font_px: r2(nF), label_px: lpx, center_x: r2(cx), digit_center_y: r2(digitCy),
      label: round(labelBox), digits: round(digitsBox), box: round({ x0: Math.min(labelBox.x0, digitsBox.x0), x1: Math.max(labelBox.x1, digitsBox.x1), y0: labelBox.y0, y1: digitsBox.y1 }),
      zone: round({ y0: zy0, y1: zy1 }),
    },
    ambient: {
      region: round({ x0: 0, x1: W, y0: hudBottom, y1: H - safe.b }), size_mul: r2(kA), area_mul: r2(aA),
      count: Object.fromEntries(CF.tiers.map((t) => [t.tier, Math.round(t.n * aA)])),
      count_reduced: Object.fromEntries(CF.tiers.map((t) => [t.tier, Math.ceil(Math.round(t.n * aA) * CF.reduced_motion.ambient_n_mul)])),
    },
    keepout: { road: round(roadKeep), ball: round(ballKeep), judge_label: round(labelKeep), hud: round({ x0: 0, x1: W, y0: 0, y1: hudBottom }), _note: 'evenodd 클립 구멍(서로 겹치지 않음). 손가락·tut 글은 첫 별 판정에서 사라지고 파티클은 콤보 10부터라 시간 배타 → 구멍에 넣지 않음' },
    spark: { origin: { x: r2(sox), y: r2(soy) }, d: r2(sd), range: r2(rg), box: round({ x0: sox - rg - sd / 2, x1: sox + Math.max(0, cosMax) * rg + sd / 2, y0: soy - sinMax * rg - sd / 2, y1: soy + sinMax * rg + sd / 2 }) },
  };
  // 결과 화면 (16-13-4)
  const RR = R.result, kR = Math.max(1, S / RR.scale_ref);
  const gr = RR.grade_r_mul * drumR, gHalf = RR.grade_pitch_mul * drumR + gr + RR.grade_pad;
  const gradesBox = { x0: W / 2 - gHalf, x1: W / 2 + gHalf, y0: drum.y - gr - RR.grade_pad, y1: drum.y + gr + RR.grade_pad, r: gr, pitch: RR.grade_pitch_mul * drumR };
  const nb = RR.btn_count, btnW = nb * RR.btn + (nb - 1) * RR.btn_gap;
  let btns;
  if (thumb) { const y = (thumb.y0 + thumb.y1) / 2 - RR.btn / 2; btns = { x0: W / 2 - btnW / 2, x1: W / 2 + btnW / 2, y0: y, y1: y + RR.btn, dir: 'row' }; }
  else {
    const below = drum.y + drumR + RR.btn_below_gap;
    if (H - below >= RR.btn + 12) btns = { x0: W / 2 - btnW / 2, x1: W / 2 + btnW / 2, y0: below, y1: below + RR.btn, dir: 'row' };
    else { const x = W - RR.btn - 24, y = H / 2 - btnW / 2; btns = { x0: x, x1: x + RR.btn, y0: y, y1: y + btnW, dir: 'column' }; }
  }
  const Fa = Math.round(RR.acc_font * kR), Fc = Math.round(RR.combo_font * kR);
  const accW = Fa * (RR.icon_mul + RR.icon_gap_mul + J.em.pct_max * J.width_slack);
  const rComboW = Fc * (RR.combo_icon_mul + RR.icon_gap_mul + RR.digits_em * J.width_slack + RR.new_mark_mul);
  let acc, rCombo, resArr;
  if (o === 'portrait') { // 등급 북 아래 한 줄: [과녁 + 정확도 %] [점 3개 + 최고 콤보]
    resArr = 'below_grades';
    const total = accW + RR.row_gap_mul * Fa + rComboW, x0 = W / 2 - total / 2, y0 = gradesBox.y1 + RR.gap;
    acc = { x0, x1: x0 + accW, y0, y1: y0 + Fa };
    const cy = y0 + Fa / 2;
    rCombo = { x0: acc.x1 + RR.row_gap_mul * Fa, x1: acc.x1 + RR.row_gap_mul * Fa + rComboW, y0: cy - Fc / 2, y1: cy + Fc / 2 };
  } else { // 가로: 등급 북 줄 양옆 (아래는 결과 버튼 줄)
    resArr = 'beside_grades';
    acc = { x0: gradesBox.x0 - RR.gap - accW, x1: gradesBox.x0 - RR.gap, y0: drum.y - Fa / 2, y1: drum.y + Fa / 2 };
    rCombo = { x0: gradesBox.x1 + RR.gap, x1: gradesBox.x1 + RR.gap + rComboW, y0: drum.y - Fc / 2, y1: drum.y + Fc / 2 };
  }
  const titleY = Math.max(hudBottom + 8, ball.top - 36);
  const result = {
    arrange: resArr, grades: round(gradesBox), buttons: round(btns), accuracy: { ...round(acc), font_px: Fa, digit_h: r2(J.em.cap * Fa) },
    best_combo: { ...round(rCombo), font_px: Fc, digit_h: r2(J.em.cap * Fc) }, title_ref: round({ x0: 16, x1: W - 16, y0: titleY, y1: titleY + RR.title_h }),
  };
  return {
    W, H, safe, orientation: o, short_side: S,
    judge_x: r2(xj), preview_px: r2(D), star_d: d, star_r: r2(r), half_spacing_worst_px: r2(sHalfWorst), lead_half_max: nHalfMax,
    road: round(road), road_h: roadH, ball: round(ball), drum: round(drum), line: round(line),
    hud: { bar: round(bar), pause: round(pause), attempt_y: r2(attemptY), band_bottom: r2(hudBottom) },
    finger: round(finger), text_slot: round(text), thumb: thumb && round(thumb), silhouette_frame: round(silFrame),
    judge_label: judgeLabel, result, combo_fx: comboFx,
  };
}

// ---------- 검사 ----------
const r1 = (v) => Math.round(v * 10) / 10;
let RES_COMBO = null;
const ovl = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
function checkAll() {
  const { levels, lead, leadSrc, mirrorMismatch } = levelsInfo();
  const rows = []; let fail = 0;
  const bad = (m) => { fail++; rows.push('FAIL ' + m); };
  // 0) 레벨 데이터 가정 (30-art 16-2·16-10 balance 요구 2·3, balance 17-8 art 2): v3 일 때만
  for (const m of mirrorMismatch) bad(m);
  levels.forEach((lv, i) => {
    if (lv.nStars == null) { rows.push(`L${lv.id}: v3 아님 — 별 목록 검사 건너뜀(가정 값 사용)`); return; }
    if (lv.chunkMismatch) bad(`L${lv.id} 파생 bars/patterns 별 목록 ≠ path.chunks 재계산`);
    if (lv.minBeats < 0.5) bad(`L${lv.id} 반박보다 짧은 별 간격 ${lv.minBeats}박 (16-2 표 무효)`);
    if (i === 0 && lv.minBeats < 1) bad(`L1 정박만 아님 (최소 간격 ${lv.minBeats}박)`);
    if (lv.offbeatStart) bad(`L${lv.id} 정박 없이 시작하는 반박 별 ${lv.offbeatStart}개`);
    if (lv.leadP > lv.leadL || (lv.halfBeats && lv.leadP > 3.5)) bad(`L${lv.id} 세로 미리 보기 ${lv.leadP}박 ≠ min(가로 ${lv.leadL}, 3.5) 규칙`);
    for (const o of ['landscape', 'portrait']) {
      const N = lead[o][i];
      if (lv.firstBeat < N) bad(`L${lv.id} ${o} 첫 별이 시도 시작 + ${lv.firstBeat}박 < 미리 보기 ${N}박 (오른쪽 끝에서 들어오지 못함)`);
      for (const r of lv.revive) if (r.ahead < N) bad(`L${lv.id} ${o} 연습 부활(박 ${r.beat}) 다음 별까지 ${r.ahead}박 < 미리 보기 ${N}박`);
    }
    rows.push(`L${lv.id}: 별 ${lv.nStars}, 최소 간격 ${lv.minBeats}박, 첫 별 = 시도 시작 + ${lv.firstBeat}박, 연습 부활 → 다음 별 최소 ${lv.revive.length ? Math.min(...lv.revive.map((r) => r.ahead)) : '-'}박, 미리 보기 ${lv.leadL}/${lv.leadP}박, chunks = bars ${lv.chunkMismatch ? '다름' : '같음'}`);
  });
  const lays = [];
  for (const [W, H, safe] of [...RES.map(([w, h]) => [w, h, undefined]), ...SAFE_CASES]) {
    const L = layout(W, H, safe, lead);
    lays.push(L);
    const tag = `${W}x${H}${safe ? ` safe ${safe.t}/${safe.b}/${safe.l}/${safe.r}` : ''}`;
    // 1) 반박 간격, 2) 겹쳐 보이는 시간, 3) 판정 이펙트가 다음 별에 닿지 않음, 4) 미리 보기·판단 시간
    L.per_level = levels.map((lv, i) => {
      const N = lead[L.orientation][i];
      const beat = 60 / lv.bpm;
      const v = L.preview_px / (N * beat);
      const minBeats = lv.minBeats ?? (lv.halfBeats ? 0.5 : 1);
      const sMin = v * beat * minBeats;
      const ovlMs = ((L.star_d + L.line.w) / v) * 1000;
      const fxGap = sMin - L.star_r - RULE.fx_grow.perfect * L.star_r;
      const previewS = N * beat, judgeS = previewS - lv.pe / 1000;
      const ok1 = sMin >= L.star_d + RULE.half_gap_px;
      const ok2 = ovlMs <= lv.pe + lv.pl && ovlMs / 2 <= Math.min(lv.pe, lv.pl);
      const ok3 = fxGap >= 2;
      const ok4 = previewS >= 1.2 - 1e-9 && judgeS >= 1.0 - 1e-9;
      if (!ok1) bad(`${tag} L${lv.id} 최소 간격 ${sMin.toFixed(1)} < 별 ${L.star_d} + 8`);
      if (!ok2) bad(`${tag} L${lv.id} 겹쳐 보이는 시간 ${ovlMs.toFixed(0)} ms > 통과 창`);
      if (!ok3) bad(`${tag} L${lv.id} 딱 이펙트와 다음 별 틈 ${fxGap.toFixed(1)} px`);
      if (!ok4) bad(`${tag} L${lv.id} 미리 보기 ${previewS.toFixed(2)} s / 판단 ${judgeS.toFixed(2)} s`);
      return { id: lv.id, bpm: lv.bpm, lead_beats: N, beat_px: +(L.preview_px / N).toFixed(1), speed_px_s: +v.toFixed(1), min_interval_beats: minBeats, min_spacing_px: +sMin.toFixed(1), overlap_ms: +ovlMs.toFixed(0), pass_window_ms: lv.pe + lv.pl, fx_gap_px: +fxGap.toFixed(1), preview_s: +previewS.toFixed(2), judge_s: +judgeS.toFixed(2) };
    });
    // 5) 자리 겹침 (게임 그림 ↔ 화면 고정)
    const box = {
      hud: { x0: 0, x1: W, y0: 0, y1: L.hud.band_bottom },
      ballZone: { x0: L.ball.x - L.ball.d / 2, x1: L.ball.x + L.ball.d / 2, y0: L.ball.top, y1: L.ball.yRest + L.ball.d / 2 },
      road: { x0: 0, x1: W, y0: L.road.y0, y1: L.road.y1 },
      drum: { x0: L.drum.x - L.drum.r, x1: L.drum.x + L.drum.r, y0: L.drum.y - L.drum.r, y1: L.drum.y + L.drum.r },
      finger: L.finger, text: L.text_slot, thumb: L.thumb, pause: { x0: L.hud.pause.x0, x1: L.hud.pause.x0 + 48, y0: L.hud.pause.y0, y1: L.hud.pause.y0 + 48 },
    };
    const pairs = [['hud', 'ballZone'], ['ballZone', 'road'], ['road', 'drum'], ['drum', 'finger'], ['finger', 'text'], ['text', 'drum'], ['text', 'road'], ['finger', 'road']];
    if (L.thumb) pairs.push(['text', 'thumb'], ['finger', 'thumb']);
    for (const [a, b] of pairs) if (box[a] && box[b] && ovl(box[a], box[b])) bad(`${tag} 겹침 ${a} ∩ ${b}`);
    for (const k of ['finger', 'text']) { const q = box[k]; if (q.x0 < (safe?.l || 0) + 15.9 || q.x1 > W - (safe?.r || 0) - 15.9 || q.y1 > H - (safe?.b || 0) - 8) bad(`${tag} ${k} 화면 여백 밖`); }
    if (L.text_slot.x1 - L.text_slot.x0 < 120) bad(`${tag} 글 자리 폭 ${L.text_slot.x1 - L.text_slot.x0} < 120`);
    if (L.star_d < 28 || L.ball.d < 24) bad(`${tag} 별 ${L.star_d} / 공 ${L.ball.d} 너무 작음`);
    // 7) 판정 이름·% 자리 (16-13): 가장 큰 등급 × 튐 1.15 상자, 이름 예산 3.0 em(가장 긴 한국어 딱이야 3.0 em ≥ 가장 넓은 영어 Wow! 2.72 em) × 1.05
    {
      const J = RULE.judge_label, JL = L.judge_label, jb = { x0: JL.x0, x1: JL.x1, y0: JL.y0, y1: JL.y1 };
      const vMax = Math.max(...L.per_level.map((p) => p.speed_px_s));
      const fxR = 0.9 * L.star_d + 3, fxY = Math.max(0.6 * L.star_d, Math.SQRT1_2 * fxR + Math.max(3, 0.1 * L.star_d) / 2);
      const fx = { x0: L.judge_x - fxR - (vMax * J.fx_ms) / 1000, x1: L.judge_x + 0.6 * L.star_d, y0: L.road.yc - fxY, y1: L.road.yc + fxY };
      const rip = { x0: L.drum.x - J.drum_ripple * L.drum.r, x1: L.drum.x + J.drum_ripple * L.drum.r, y0: L.drum.y - J.drum_ripple * L.drum.r, y1: L.drum.y + J.drum_ripple * L.drum.r };
      const lineB = { x0: L.line.x - L.line.w / 2 - 1, x1: L.line.x + L.line.w / 2 + 1, y0: L.line.y0, y1: L.line.y1 };
      const against = { hud: box.hud, ballZone: box.ballZone, road: box.road, judgeFx: fx, drumRipple: rip, judgeLine: lineB, finger: box.finger, text: box.text, thumb: box.thumb, pause: box.pause };
      const tx = [];
      for (const [k, b] of Object.entries(against)) {
        if (!b || !ovl(jb, b)) continue;
        if (J.time_exclusive_with.includes(k)) tx.push(k); else bad(`${tag} 판정 글 ∩ ${k}`);
      }
      if (jb.x0 < (safe?.l || 0) + 15.9 || jb.x1 > W - (safe?.r || 0) - 15.9 || jb.y1 > H - (safe?.b || 0) - 8) bad(`${tag} 판정 글 화면 여백 밖 (${jb.x0}~${jb.x1}, ${jb.y0}~${jb.y1})`);
      if (jb.x0 <= L.judge_x) bad(`${tag} 판정 글이 판정 선 왼쪽까지`);
      const G = JL.grades;
      if (!(G.perfect.name_px > G.good.name_px && G.good.name_px > G.pass.name_px)) bad(`${tag} 등급 글자 크기 순서 아님`);
      for (const [g, v] of Object.entries(G)) {
        if (v.cap_px < J.min_cap_px) bad(`${tag} ${g} 글자 높이 ${v.cap_px} < ${J.min_cap_px}`);
        const q = v.pct_px / v.name_px; if (q < 0.5 || q > 0.6) bad(`${tag} ${g} % 배율 ${q.toFixed(2)}`);
      }
      for (const lang of Object.values(J.names_em)) for (const [, em] of Object.values(lang)) if (em > J.em.name_budget) bad(`이름 폭 ${em} em > 예산 ${J.em.name_budget}`);
      JL.time_exclusive = tx;
      // 결과 화면 (16-13-4)
      const RS = L.result, rb = (q) => ({ x0: q.x0, x1: q.x1, y0: q.y0, y1: q.y1 });
      const rItems = { grades: rb(RS.grades), buttons: rb(RS.buttons), accuracy: rb(RS.accuracy), best_combo: rb(RS.best_combo), title: rb(RS.title_ref), hud: box.hud, road: box.road };
      for (const [a, b] of [['accuracy', 'grades'], ['best_combo', 'grades'], ['accuracy', 'buttons'], ['best_combo', 'buttons'], ['accuracy', 'best_combo'], ['accuracy', 'title'], ['best_combo', 'title'], ['accuracy', 'road'], ['best_combo', 'road'], ['accuracy', 'hud'], ['best_combo', 'hud'], ['grades', 'buttons']])
        if (ovl(rItems[a], rItems[b])) bad(`${tag} 결과 화면 겹침 ${a} ∩ ${b}`);
      if (L.thumb && ovl(rItems.accuracy, L.thumb)) bad(`${tag} 결과 정확도 ∩ 엄지 받침`);
      for (const k of ['accuracy', 'best_combo', 'buttons']) { const q = rItems[k]; if (q.x0 < (safe?.l || 0) + 15.9 || q.x1 > W - (safe?.r || 0) - 15.9 || q.y1 > H - (safe?.b || 0) - 8 + 1e-9) bad(`${tag} 결과 ${k} 화면 여백 밖`); }
      const gd = 2 * RS.grades.r;
      if (!(gd > RS.accuracy.digit_h && RS.accuracy.digit_h > RS.best_combo.digit_h)) bad(`${tag} 결과 크기 순서(등급 북 ${gd.toFixed(1)} > 정확도 ${RS.accuracy.digit_h} > 콤보 ${RS.best_combo.digit_h}) 아님`);
      rows.push(`${tag}: 판정 글 x ${jb.x0}~${jb.x1}, y ${jb.y0}~${jb.y1} (${JL.arrange}, 이름 ${G.perfect.name_px}/${G.good.name_px}/${G.pass.name_px} px · % ${G.perfect.pct_px}/${G.good.pct_px}/${G.pass.pct_px} px${tx.length ? `, 시간 배타 ${tx.join('·')}` : ''}) / 결과 ${RS.arrange}: 정확도 x ${RS.accuracy.x0}~${RS.accuracy.x1} y ${RS.accuracy.y0}~${RS.accuracy.y1}, 콤보 x ${RS.best_combo.x0}~${RS.best_combo.x1}, 등급 북 x ${RS.grades.x0}~${RS.grades.x1}`);
    }
    // 9) 콤보 파격 연출 (16-14): 큰 콤보 수 자리·크기, 금지 구역, 타격 빛 범위
    {
      const CF = RULE.combo_fx, X = L.combo_fx, NB = X.number.box, sl = safe?.l || 0, sr = safe?.r || 0;
      const fr = X.number.digit_h_frac;
      if (fr < CF.number.h_frac_min - 1e-9 || fr > CF.number.h_frac_max + 1e-9) bad(`${tag} 콤보 수 높이 ${(fr * 100).toFixed(1)} % (기준 ${CF.number.h_frac_min * 100}~${CF.number.h_frac_max * 100} %)`);
      // 큰 콤보 수(튐 최대 포함) ∩ {HUD 띠, 일시정지, 길 띠(다가오는 별), 공 뜀 자리, 판정 선, 판정 글, 손가락, tut 글, 엄지 받침} = 0
      const lineB = { x0: L.line.x - L.line.w / 2 - 1, x1: L.line.x + L.line.w / 2 + 1, y0: L.line.y0, y1: L.line.y1 };
      const JLb = { x0: L.judge_label.x0, x1: L.judge_label.x1, y0: L.judge_label.y0, y1: L.judge_label.y1 };
      const pad = (b, p) => ({ x0: b.x0 - p, x1: b.x1 + p, y0: b.y0 - p, y1: b.y1 + p });
      const vs = { hud: box.hud, pause: box.pause, road: box.road, ballZone: pad(box.ballZone, CF.keepout_pad), judgeLine: lineB, judgeLabel: JLb, finger: box.finger, text: box.text, thumb: box.thumb };
      for (const [k, b] of Object.entries(vs)) if (b && ovl(NB, b)) bad(`${tag} 콤보 수 ∩ ${k}`);
      if (NB.x0 < sl + 15.9 || NB.x1 > W - sr - 15.9) bad(`${tag} 콤보 수 화면 여백 밖 (${NB.x0}~${NB.x1})`);
      // 바탕 파티클 금지 구역: evenodd 구멍이므로 서로 겹치면 안 됨(겹친 곳이 다시 칠해짐)
      const K = Object.entries(X.keepout).filter(([k]) => !k.startsWith('_'));
      for (let i = 0; i < K.length; i++) for (let j = i + 1; j < K.length; j++) if (ovl(K[i][1], K[j][1])) bad(`${tag} 금지 구역 ${K[i][0]} ∩ ${K[j][0]} (evenodd 클립 깨짐)`);
      if (!(X.keepout.ball.y1 <= X.keepout.road.y0 + 1e-9)) bad(`${tag} 공 금지 구역이 길 구역과 맞닿지 않음`);
      if (X.keepout.ball.y0 > L.ball.top || X.keepout.road.y0 > L.road.y0 || X.keepout.road.y1 < L.road.y1) bad(`${tag} 금지 구역이 공·길을 다 덮지 않음`);
      // 타격 빛: 판정 선 왼쪽(읽기 영역으로 안 감) + 길 띠 안(공 뜀 자리·판정 글·북 아래로 안 나감)
      const SB = X.spark.box;
      if (SB.x1 > L.judge_x - L.line.w / 2) bad(`${tag} 타격 빛이 판정 선 오른쪽까지 (x1 ${SB.x1})`);
      if (SB.y0 < L.road.y0 || SB.y1 > L.road.y1) bad(`${tag} 타격 빛이 길 띠 밖 (y ${SB.y0}~${SB.y1}, 길 ${L.road.y0}~${L.road.y1})`);
      if (ovl(SB, JLb)) bad(`${tag} 타격 빛 ∩ 판정 글`);
      // 거리(참고): 타격 지점(판정 선 × 길 가운데) → 판정 글 기준점
      X.judge_label_distance_px = r1(Math.hypot(L.judge_label.anchor.x - L.judge_x, L.judge_label.anchor.y - L.road.yc));
      rows.push(`${tag}: 콤보 수 높이 ${X.number.digit_h} px (${(fr * 100).toFixed(1)} %), 글자 ${X.number.font_px} px, 라벨 ${X.number.label_px} px, 상자 x ${NB.x0}~${NB.x1} y ${NB.y0}~${NB.y1} / 바탕 파티클 개수 ${Object.values(X.ambient.count).join('·')} (줄이기 ${Object.values(X.ambient.count_reduced).join('·')}) / 타격 빛 x ${SB.x0}~${SB.x1} y ${SB.y0}~${SB.y1} / 판정 글까지 ${X.judge_label_distance_px} px`);
    }
    rows.push(`${tag}: 판정 x ${L.judge_x}, 미리 보기 ${L.preview_px} px, 별 ${L.star_d} · 공 ${L.ball.d} · 북 r ${L.drum.r} · 선 ${L.line.w} px, 길 y ${L.road.y0}~${L.road.y1}, HUD 띠 아래 ${L.hud.band_bottom}`);
  }
  // 8) 판정 글 시간 (16-13-2): 튐 80 ms < 가장 짧은 별 간격, 시간 배타 전제(손가락·tut 글은 첫 별 판정에서 사라짐)
  {
    const J = RULE.judge_label;
    const minMs = Math.min(...levels.map((lv) => (lv.minBeats ?? (lv.halfBeats ? 0.5 : 1)) * 60000 / lv.bpm));
    if (J.pop_ms >= minMs) bad(`판정 글 튐 ${J.pop_ms} ms ≥ 가장 짧은 별 간격 ${minMs.toFixed(0)} ms`);
    const B = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8'));
    const hideOk = B.tutorial_cue?.hide_after === 'first_star_judged';
    if (lays.some((x) => x.judge_label.time_exclusive?.length) && !hideOk) bad(`판정 글이 tut 글 자리와 겹치는데 balance tutorial_cue.hide_after = ${B.tutorial_cue?.hide_after} (first_star_judged 아님)`);
    rows.push(`판정 글 시간: 튐 ${J.pop_ms} + 유지 ${J.hold_ms} + 흐려짐 ${J.fade_ms} ms, 가장 짧은 별 간격 ${minMs.toFixed(0)} ms, 새 판정 = 그 프레임에 바꿔 그림, tut 글 hide_after = ${B.tutorial_cue?.hide_after}`);
  }
  // 10) 콤보 파격 연출 단계·소리·예산 (16-14)
  {
    const CF = RULE.combo_fx, B = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8'));
    const S = JSON.parse(readFileSync(join(HERE, 'sound.json'), 'utf8')), pal = JSON.parse(readFileSync(join(HERE, 'palette.json'), 'utf8'));
    const ats = CF.tiers.map((t) => t.at);
    if (B.combo?.show_from !== CF.show_from) bad(`콤보 수 show_from ${CF.show_from} ≠ balance combo.show_from ${B.combo?.show_from}`);
    if (ats.some((a, i) => i && a <= ats[i - 1])) bad('파티클 단계 값이 커지는 순서 아님');
    for (const k of ['n', 'd', 'vy']) for (let i = 1; i < CF.tiers.length; i++) { const p = CF.tiers[i - 1][k], q = CF.tiers[i][k]; if ([].concat(q).some((v, j) => v < [].concat(p)[j])) bad(`파티클 단계 ${CF.tiers[i].tier} ${k} 가 앞 단계보다 작음`); }
    const steps = Object.keys(S.music?.combo_r3?.steps || {}).map(Number);
    for (const a of ats) if (!steps.includes(a)) bad(`파티클 단계 ${a} 에 단계 화음(sound.json music.combo_r3.steps) 없음`);
    const pt = pal.combo_fx_r3?.tier_alpha_max;
    for (const t of CF.tiers) if (!(pt && pt[t.tier] > 0)) bad(`palette combo_fx_r3.tier_alpha_max[${t.tier}] 없음`);
    if (B.tutorial_cue?.hide_after !== 'first_star_judged' || ats[0] <= 1) bad('금지 구역에서 손가락·tut 글을 뺀 전제(첫 별 판정에서 사라짐, 파티클은 콤보 10부터)가 깨짐');
    // 도달 가능한 단계 (끝까지 이어 쳤을 때 최대 콤보 = 레벨 판정 별 수)
    const reach = levels.map((lv) => ({ id: lv.id, n: lv.nStars, tier: CF.tiers.filter((t) => lv.nStars != null && lv.nStars >= t.at).length }));
    const v3 = reach.filter((x) => x.n != null);
    if (v3.length) {
      if (v3.some((x) => x.tier < 2)) bad(`단계 1·2(콤보 ${ats[0]}·${ats[1]})에 못 닿는 레벨: ${v3.filter((x) => x.tier < 2).map((x) => 'L' + x.id).join(' ')}`);
      if (!v3.some((x) => x.tier === CF.tiers.length)) bad(`마지막 단계(콤보 ${ats.at(-1)})에 닿는 레벨 없음`);
    }
    // 동시에 살아 있는 타격 빛: 수명 ÷ 가장 짧은 별 간격(올림) × 가장 큰 개수
    const minMs = Math.min(...levels.map((lv) => (lv.minBeats ?? (lv.halfBeats ? 0.5 : 1)) * 60000 / lv.bpm));
    const sparkMax = Math.ceil(CF.spark.life_ms / minMs) * Math.max(...Object.values(CF.spark.n).map(([a, b]) => a + b * CF.tiers.length));
    const ambMax = Math.max(...lays.map((x) => Math.max(...Object.values(x.combo_fx.ambient.count))));
    if (ambMax + sparkMax > CF.pool) bad(`파티클 최대 ${ambMax} + ${sparkMax} > 풀 ${CF.pool}`);
    if (CF.number.pop.ms >= minMs || CF.number.pop_tier_ms > 2 * minMs) bad(`콤보 수 튐 ${CF.number.pop.ms} ms ≥ 가장 짧은 별 간격 ${minMs.toFixed(0)} ms`);
    if (CF.number.pop_max < Math.max(CF.number.pop_tier, ...['perfect', 'good', 'pass'].map((g) => CF.number.pop[g]))) bad('pop_max 가 가장 큰 튐보다 작음');
    if (CF.number.break_ms > B.combo.break_fx.fade_s * 1000 || CF.ambient.break_ms > B.combo.break_fx.fade_s * 1000) bad('끊김 가라앉음이 0.3 s(balance break_fx.fade_s)보다 김');
    RES_COMBO = { reach, sparkMax, ambMax, minMs };
    rows.push(`콤보 연출 단계 ${ats.join('·')}: 레벨별 도달 단계(모두 이어 칠 때) ${reach.map((x) => `L${x.id} ${x.n ?? '-'}별→${x.tier}`).join(' ')} / 최대 파티클 바탕 ${ambMax} + 타격 빛 ${sparkMax} ≤ 풀 ${CF.pool} / 가장 짧은 별 간격 ${minMs.toFixed(0)} ms`);
  }
  // 6) 장소 실루엣이 HUD 띠와 겹치지 않음 (새 실루엣 판 = HUD 띠 아래 + 8 ~ 엄지 받침 위 − 8)
  const pal = JSON.parse(readFileSync(join(HERE, 'palette.json'), 'utf8'));
  for (const L of lays.slice(0, 4)) {
    const F = L.silhouette_frame, fw = F.x1 - F.x0, fh = F.y1 - F.y0, S = Math.min(fw, fh);
    for (const [k, t] of Object.entries(pal.themes)) for (const s of t.silhouette.shapes) {
      let top;
      if (s.t === 'circle') top = F.y0 + s.y * fh - s.r * S;
      else if (s.t === 'rect') top = F.y0 + s.y * fh;
      else top = F.y0 + s.y * fh - s.h * S;
      if (top < L.hud.band_bottom - 0.01) bad(`${L.W}x${L.H} ${k} 실루엣 '${s.what}' 윗끝 ${top.toFixed(0)} < HUD 띠 ${L.hud.band_bottom}`);
    }
  }
  return { lays, rows, fail, levels, lead, leadSrc, combo: RES_COMBO };
}

function md(res) {
  const { lays, levels, lead, leadSrc } = res;
  const four = lays.slice(0, 4);
  const L = [];
  L.push(`미리 보기 박 수 출처: ${leadSrc}. 가로 ${lead.landscape.join(' / ')}, 세로 ${lead.portrait.join(' / ')} (L1~L10)`);
  L.push('');
  L.push('| 해상도 | 판정 선 x | 미리 보기 거리 | 별 지름 | 공 지름 | 길 띠 y (높이) | 판정 선 굵기 | 북 반지름 · 중심 y | 공 앉는 y · 뜀 높이 | 손가락 칸 | tut_drum_tap 글 자리 | HUD 띠 아래끝 |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const a of four) L.push(`| ${a.W}x${a.H} | ${a.judge_x} | **${a.preview_px} px** | **${a.star_d}** | ${a.ball.d} | ${a.road.y0} ~ ${a.road.y1} (${a.road_h}) | ${a.line.w} | ${a.drum.r} · ${a.drum.y} | ${a.ball.yRest} · ${a.ball.bounce} | ${a.finger.s} @ (${(a.finger.x0 + a.finger.x1) / 2}, ${(a.finger.y0 + a.finger.y1) / 2}) | x ${a.text_slot.x0}~${a.text_slot.x1}, y ${a.text_slot.y0}~${a.text_slot.y1} | ${a.hud.band_bottom} |`);
  L.push('');
  L.push('반박 간격 표 (px, 반박 간격 = 미리 보기 거리 ÷ (2 × 미리 보기 박). BPM과 무관). 기준 = 별 지름 + 8');
  L.push('');
  L.push('| 해상도 | 별 지름 + 8 | 4박 | 3.5박 | 3박 | 쓰는 박(반박 있는 L2~L10) |');
  L.push('|---|---|---|---|---|---|');
  for (const a of four) {
    const s = (n) => (a.preview_px / (2 * n)).toFixed(1);
    const mark = (n) => (a.preview_px / (2 * n) >= a.star_d + 8 ? `${s(n)} ✓` : `${s(n)} ✗`);
    L.push(`| ${a.W}x${a.H} | ${a.star_d + 8} | ${mark(4)} | ${mark(3.5)} | ${mark(3)} | ${[...new Set(lead[a.orientation].slice(1))].join(' · ')} |`);
  }
  L.push('');
  L.push('레벨별 (4해상도 중 가장 빠듯한 값): 속도 px/s · 겹쳐 보이는 시간 ms (기준 ≤ 통과 창, 반쪽 ≤ 짧은 쪽 창) · 딱 이펙트와 다음 별 틈 px');
  L.push('');
  L.push('| 레벨 | BPM | 통과 창 | 미리 보기 가로 / 세로 (박 · s) | 판단 시간 가로 / 세로 s | 360x640 속도 · 겹침 ms · 틈 | 412x915 | 640x360 | 1280x720 |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  levels.forEach((lv, i) => {
    const c = four.map((a) => { const p = a.per_level[i]; return `${p.speed_px_s} · ${p.overlap_ms} · ${p.fx_gap_px}`; });
    const pl = four[2].per_level[i], pp = four[0].per_level[i];
    L.push(`| ${+lv.id} | ${lv.bpm} | −${lv.pe} ~ +${lv.pl} (${lv.pe + lv.pl}) | ${pl.lead_beats} · ${pl.preview_s} / ${pp.lead_beats} · ${pp.preview_s} | ${pl.judge_s} / ${pp.judge_s} | ${c.join(' | ')} |`);
  });
  L.push('');
  L.push('1박 px (= 미리 보기 거리 ÷ 미리 보기 박, balance 17-8 표와 대조) · 레벨 데이터 확인');
  L.push('');
  L.push('| 레벨 | 360x640 | 412x915 | 640x360 | 1280x720 | 별 수 | 최소 간격(박) | 첫 별(시도 시작 + 박) |');
  L.push('|---|---|---|---|---|---|---|---|');
  levels.forEach((lv, i) => L.push(`| ${+lv.id} | ${four.map((a) => a.per_level[i].beat_px).join(' | ')} | ${lv.nStars ?? '-'} | ${lv.minBeats ?? '-'} | ${lv.firstBeat ?? '-'} |`));
  L.push('');
  L.push('판정 이름·% 자리 (16-13, 상자 = 딱 등급 × 튐 1.15, 두 줄) · 결과 화면 (16-13-4)');
  L.push('');
  L.push('| 화면 | 판정 글 상자 x · y | 이름 px 딱/좋아/됐어 · % px | 글자 높이(됐어) | 시간 배타 | 결과 배치 | 정확도 상자 (글 px) | 최고 콤보 상자 (글 px) | 등급 북 줄 x · y | 결과 버튼 |');
  L.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const a of lays) {
    const j = a.judge_label, g = j.grades, R = a.result, s = a.safe && (a.safe.t || a.safe.b || a.safe.l || a.safe.r) ? ` safe ${a.safe.t}/${a.safe.b}/${a.safe.l}/${a.safe.r}` : '';
    L.push(`| ${a.W}x${a.H}${s} | ${j.x0}~${j.x1} · ${j.y0}~${j.y1} | ${g.perfect.name_px}/${g.good.name_px}/${g.pass.name_px} · ${g.perfect.pct_px}/${g.good.pct_px}/${g.pass.pct_px} | ${g.pass.cap_px} | ${j.time_exclusive?.length ? 'tut 글' : '-'} | ${R.arrange === 'below_grades' ? '등급 북 아래 한 줄' : '등급 북 양옆'} | ${R.accuracy.x0}~${R.accuracy.x1} · ${R.accuracy.y0}~${R.accuracy.y1} (${R.accuracy.font_px}) | ${R.best_combo.x0}~${R.best_combo.x1} · ${R.best_combo.y0}~${R.best_combo.y1} (${R.best_combo.font_px}) | ${R.grades.x0}~${R.grades.x1} · ${R.grades.y0}~${R.grades.y1} | ${R.buttons.dir} y ${R.buttons.y0}~${R.buttons.y1} |`);
  }
  L.push('');
  L.push('콤보 파격 연출 (16-14): 위쪽 가운데 큰 콤보 수(상자 = 라벨 + 숫자 × 튐 1.15) · 바탕 파티클 단계별 개수 · 타격 빛 범위');
  L.push('');
  L.push('| 화면 | 숫자 높이 px (화면 높이 %) | 글자 px · 라벨 px | 콤보 수 상자 x · y | 바탕 파티클 개수 단계 1·2·3·4 (움직임 줄이기) | 크기·속도 배율 | 타격 빛 범위 x · y | 타격 지점 → 판정 글 px |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const a of lays) {
    const X = a.combo_fx, N = X.number, s = a.safe && (a.safe.t || a.safe.b || a.safe.l || a.safe.r) ? ` safe ${a.safe.t}/${a.safe.b}/${a.safe.l}/${a.safe.r}` : '';
    L.push(`| ${a.W}x${a.H}${s} | ${N.digit_h} (${(N.digit_h_frac * 100).toFixed(1)} %) | ${N.font_px} · ${N.label_px} | ${N.box.x0}~${N.box.x1} · ${N.box.y0}~${N.box.y1} | ${Object.values(X.ambient.count).join('·')} (${Object.values(X.ambient.count_reduced).join('·')}) | ${X.ambient.size_mul} | ${X.spark.box.x0}~${X.spark.box.x1} · ${X.spark.box.y0}~${X.spark.box.y1} | ${X.judge_label_distance_px} |`);
  }
  if (res.combo) {
    L.push('');
    L.push('레벨별 도달 단계(끝까지 이어 칠 때 최대 콤보 = 판정 별 수): ' + res.combo.reach.map((x) => `L${+x.id} ${x.n ?? '-'}별 → ${x.tier}`).join(' · ') + `. 동시 최대 파티클 = 바탕 ${res.combo.ambMax} + 타격 빛 ${res.combo.sparkMax} ≤ 풀 ${RULE.combo_fx.pool}`);
  }
  return L.join('\n');
}

const res = checkAll();
if (args.includes('--md')) { console.log(md(res)); process.exit(res.fail ? 1 : 0); }
for (const r of res.rows) console.log(r);
if (!args.includes('--check')) {
  const out = {
    schema_version: 1,
    _source: '30-art.md 16절 (round-3 "북길"). 생성 assets/road-layout.mjs. 이 파일과 30-art 표가 다르면 이 파일이 기준(art 소유). 시간·판정 값(bpm·통과 창·미리 보기 박)은 balance 소유이고 여기 per_level 은 검사 결과 복사본.',
    lead_beats_source: res.leadSrc,
    lead_beats: res.lead,
    rule: Object.fromEntries(Object.entries(RULE).map(([k, v]) => [k, typeof v === 'function' ? v.toString() : v])),
    formulas: {
      judge_x: 'safeL + judge_x_frac[o] × (W − safeL − safeR)',
      preview_px: 'W − safeR − judge_x (별 중심이 오른쪽 끝에 올 때부터 판정 선까지). 별은 중심 x = W + r 에서 생겨 화면 밖에서 미끄러져 들어옴(갑자기 나타나지 않음)',
      speed: 'preview_px ÷ (lead_beats × 60/BPM) px/s, 레벨 안 고정. 별 x(t) = judge_x + speed × (별 시각 − 지금), 지금 = 판정과 같은 보정 시계',
      star_d: 'floor(min(0.10 × 짧은 변, preview_px ÷ (2 × 반박 레벨 중 가장 긴 lead_beats) − 8))',
      overlap_ms: '(star_d + line_w) ÷ speed',
    },
    text_slots: { tut_drum_tap: 'layouts[].text_slot (가로 = 손가락 칸 오른쪽, 세로 = 손가락 칸 아래). 가장 긴 언어로 2줄 안에 들어가야 하고 넘치면 글자 14 → 12 px, 그래도 넘치면 lore 문구 요청. 측정(교차 리뷰, Edge 캔버스 measureText, 빌드 글꼴 목록 system-ui·Segoe UI·Malgun Gothic, 14 px 굵게): ko "별이 북에 오면 톡!" 117.3 px · en "Tap when stars reach the drum" 208.6 px → 모든 해상도 폭 220 안 1줄' },
    judge_label: {
      _note: '30-art 16-13 판정 이름·% (요청자 지시 2026-11-17). 상자 = layouts[].judge_label, 색 = palette.json judge_label_r3, 문구 = 10-lore R3-12(딱이야/좋아/됐어 · Wow!/Nice/OK, 이름 위·% 아래 두 줄)',
      place: '길 아랫변 + 6, 판정 북 물결(1.18배)·L1 손가락 칸 중 오른쪽 끝 + 8에서 시작. 글 덩어리 왼쪽 끝 = 상자 x0, 세로 가운데 = anchor.y. 튐 기준점 = 글 덩어리 왼쪽 가운데',
      sizes: '이름 = font[등급] × max(1, 짧은 변/500), % = 이름 × 0.55. 이름 왼쪽 표지 칸 = 이름 × 0.5(딱 빛살 5 · 좋아 빛살 3 · 됐어 고리), 글자 테 = outline 색 outline_px',
      timing: '판정 프레임에 나타남 + 튐 1.0→1.15→1.0 (80 ms) → 나타난 뒤 400 ms까지 유지 → 150 ms 흐려짐. 새 판정 = 그 프레임에 이전 표시 지우고 새로 그림(튐 처음부터). 실패 = 0.3 s 안에 콤보 줄과 함께 작아지며 사라짐. 클리어 = HUD 페이드 0.2 s와 함께',
      time_exclusive: '가로 화면에서 상자가 tut_drum_tap 글 자리와 겹침. tut 글·손가락은 첫 별 판정에서 사라지고(balance tutorial_cue.hide_after = first_star_judged) 판정 글은 그 판정부터 나타나 같은 프레임에 함께 그려지지 않음. 빌드는 판정 글을 그리는 프레임에 tut 글이 없는지 지켜야 함',
    },
    combo_fx: {
      _note: '30-art 16-14 콤보 파격 연출 (요청자 지시 2026-11-17). 규칙 값 = rule.combo_fx, 화면별 px = layouts[].combo_fx, 색·투명도 = palette.json combo_fx_r3, 단계 화음 = sound.json music.combo_r3. 16-4 점 10칸 콤보 줄(rule.combo)·HUD 띠 안 콤보 줄 자리를 대체',
      number: '위쪽 가운데: [점 3개 그림 + 자체 제작 말(lore combo_label)] 작은 라벨, 그 아래 큰 숫자(콤보 값). 숫자 높이 = 화면 높이 × 0.14(자리 모자라면 줄이되 ≥ 0.12). HUD 띠 아래 + 4 ~ 길 윗변 − 4 안, 공 뜀 자리·판정 글과 겹침 0. hud 색 불투명도 0.22(튐 0.30). 콤보 show_from(2)부터, 판정마다 가운데 기준 튐, 단계 도달 판정은 1.15배 200 ms',
      layer: '메인 캔버스 clearRect 바로 뒤, 길 띠보다 먼저 [바탕 파티클 → 큰 콤보 수]. 금지 구역(layouts[].combo_fx.keepout, evenodd 클립 한 번) 밖에만. 타격 빛은 판정 이펙트 다음·공 앞',
      tiers: '콤보 10·20·30·50에서 바탕 파티클 단계 1~4(개수·크기·속도·불투명도·색 수 상승). 끊김 = 0.3 s 안에 떠오르기 멈추고 10 px 가라앉으며 사라짐, 소리 없음',
      performance: '파티클 풀 112칸 미리 할당(프레임마다 객체 생성 0), 색 × 불투명도 4단 묶음 경로로 채우기 호출 ≤ 16, shadowBlur·그라데이션·lighter 금지, 콤보 숫자 0~9·라벨은 크기가 바뀔 때만 스프라이트로 그려 두고 drawImage',
    },
    layouts: res.lays.map(({ per_level, ...a }) => ({ ...a, per_level })),
  };
  writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log('layout.json 씀');
}
console.log(res.fail ? `FAIL ${res.fail}` : 'road-layout OK');
process.exit(res.fail ? 1 : 0);
