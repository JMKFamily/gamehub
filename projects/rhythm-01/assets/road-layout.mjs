#!/usr/bin/env node
// rhythm-01 round-3 "북길" 화면 규격 (30-art 16절). 외부 패키지 없음.
//   node assets/road-layout.mjs           assets/layout.json 쓰기 + 검사 + 표 출력
//   node assets/road-layout.mjs --check   layout.json 을 다시 계산해 검사만 (파일 안 씀, 실패 시 종료 코드 1)
//   node assets/road-layout.mjs --md      30-art 16절에 붙일 마크다운 표만 출력
//
// 읽는 값(읽기만): levels/0N-*.json judge·bpm (L1~L3), balance.json curve_planned (L4~L10),
//   balance.json preview.lead_beats(있으면, round-3 balance 키) — 없으면 아래 ASSUMED_LEAD(00-benchmark 8-4·R19) 가정.
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
  text_slot: { w_max: 220, h: 40, gap: 8 },                   // tut_tap 글 자리(2줄 × 20 px)
  hud: { bar_y: { portrait: 24, landscape: 20 }, bar_h: 10, attempt_dy: 14, attempt_r: 4.5, pause: 48, pause_margin: 12 },
  combo: { dy_from_attempt: 16, dot_r: 4, dot_pitch: 12, cells: 10, mark_r: 6, mark_pitch: 16, marks_max: 3, x0: 16 },
  hud_band_pad: 6,                                            // HUD 띠 아래끝 = HUD 요소 중 가장 아래 + 6
  thumb: { top_frac: 0.70, gap: 12, bottom_margin: 16 },      // 세로만
  margin: 16,
};

// 미리 보기 박 수 가정 (balance 값이 오면 그 값). 세로 = min(가로, 3.5) — 반박이 있는 레벨(L2~)에만 영향
const ASSUMED_LEAD = { landscape: [4, 4, 4, 3.5, 3.5, 3.5, 3, 3, 3, 3] };
ASSUMED_LEAD.portrait = ASSUMED_LEAD.landscape.map((n, i) => (i === 0 ? n : Math.min(n, 3.5)));

const RES = [[360, 640], [412, 915], [640, 360], [1280, 720]];
const SAFE_CASES = [[360, 640, { t: 24, b: 24, l: 0, r: 0 }], [412, 915, { t: 24, b: 34, l: 0, r: 0 }], [640, 360, { t: 0, b: 0, l: 44, r: 44 }], [1280, 720, { t: 0, b: 0, l: 44, r: 44 }]];

// ---------- 레벨 값 읽기 ----------
function levelsInfo() {
  const B = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8'));
  const files = readdirSync(join(PROJ, 'levels')).filter((f) => f.endsWith('.json')).sort();
  const out = [];
  for (let i = 1; i <= 10; i++) {
    const id = String(i).padStart(2, '0');
    const f = files.find((x) => x.startsWith(id + '-'));
    let bpm, pe, pl, halfBeats;
    const L = f ? JSON.parse(readFileSync(join(PROJ, 'levels', f), 'utf8')) : null;
    const C = B.curve_planned?.[id];
    if (L && (i <= 3 || !C)) { bpm = L.bpm; pe = L.judge.pass_early_ms; pl = L.judge.pass_late_ms; }
    else { bpm = C.bpm; pe = C.pass_early_ms; pl = C.pass_late_ms; }
    halfBeats = i >= 2; // L1 정박만(00-benchmark 8-3), L2 반박 도입부터 반박 있음
    out.push({ id, bpm, pe, pl, halfBeats });
  }
  // balance round-3 키가 있으면 그 값
  let lead = ASSUMED_LEAD, leadSrc = '가정(00-benchmark 8-4·R19, 세로 = min(가로, 3.5))';
  const PL = B.preview?.lead_beats;
  if (PL && typeof PL === 'object') {
    const pick = (o) => (Array.isArray(o) ? o : Object.keys(o).sort().map((k) => o[k]));
    if (PL.landscape && PL.portrait) { lead = { landscape: pick(PL.landscape), portrait: pick(PL.portrait) }; leadSrc = 'balance.json preview.lead_beats'; }
    else if (!PL.landscape) { const a = pick(PL); lead = { landscape: a, portrait: a.map((n, i) => (out[i].halfBeats ? Math.min(n, 3.5) : n)) }; leadSrc = 'balance.json preview.lead_beats (세로는 art 규칙 min(·, 3.5))'; }
  }
  return { levels: out, lead, leadSrc };
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
  const C = R.combo;
  const comboY = attemptY + C.dy_from_attempt;
  const comboW = C.marks_max * C.mark_pitch + (C.cells - 1) * C.dot_pitch + 2 * C.dot_r + 4;
  const combo = { x0: C.x0 + safe.l, x1: C.x0 + safe.l + comboW, y: comboY, y0: comboY - C.mark_r - 1, y1: comboY + C.mark_r + 1 };
  const hudBottom = Math.max(pause.y0 + pause.h, combo.y1, attemptY + R.hud.attempt_r) + R.hud_band_pad;
  // 손가락: 판정 북 바로 아래 (콤보는 HUD 띠라 겹칠 일 없음). 칸 가운데 x = 판정 선, 화면 여백 안으로 밀기
  const cell = R.finger_cell(d);
  let fx = Math.max(xj, safe.l + R.margin + cell / 2);
  const finger = { s: cell, x0: fx - cell / 2, x1: fx + cell / 2, y0: drum.y + drumR + R.finger_gap_px };
  finger.y1 = finger.y0 + cell;
  // tut_tap 글 자리
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
  return {
    W, H, safe, orientation: o, short_side: S,
    judge_x: r2(xj), preview_px: r2(D), star_d: d, star_r: r2(r), half_spacing_worst_px: r2(sHalfWorst), lead_half_max: nHalfMax,
    road: round(road), road_h: roadH, ball: round(ball), drum: round(drum), line: round(line),
    hud: { bar: round(bar), pause: round(pause), attempt_y: r2(attemptY), combo: round(combo), band_bottom: r2(hudBottom) },
    finger: round(finger), text_slot: round(text), thumb: thumb && round(thumb), silhouette_frame: round(silFrame),
  };
}

// ---------- 검사 ----------
const ovl = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
function checkAll() {
  const { levels, lead, leadSrc } = levelsInfo();
  const rows = []; let fail = 0;
  const bad = (m) => { fail++; rows.push('FAIL ' + m); };
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
      const minBeats = lv.halfBeats ? 0.5 : 1;
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
      return { id: lv.id, bpm: lv.bpm, lead_beats: N, speed_px_s: +v.toFixed(1), min_interval_beats: minBeats, min_spacing_px: +sMin.toFixed(1), overlap_ms: +ovlMs.toFixed(0), pass_window_ms: lv.pe + lv.pl, fx_gap_px: +fxGap.toFixed(1), preview_s: +previewS.toFixed(2), judge_s: +judgeS.toFixed(2) };
    });
    // 5) 자리 겹침 (게임 그림 ↔ 화면 고정)
    const box = {
      hud: { x0: 0, x1: W, y0: 0, y1: L.hud.band_bottom },
      ballZone: { x0: L.ball.x - L.ball.d / 2, x1: L.ball.x + L.ball.d / 2, y0: L.ball.top, y1: L.ball.yRest + L.ball.d / 2 },
      road: { x0: 0, x1: W, y0: L.road.y0, y1: L.road.y1 },
      drum: { x0: L.drum.x - L.drum.r, x1: L.drum.x + L.drum.r, y0: L.drum.y - L.drum.r, y1: L.drum.y + L.drum.r },
      finger: L.finger, text: L.text_slot, thumb: L.thumb, combo: L.hud.combo, pause: { x0: L.hud.pause.x0, x1: L.hud.pause.x0 + 48, y0: L.hud.pause.y0, y1: L.hud.pause.y0 + 48 },
    };
    const pairs = [['hud', 'ballZone'], ['ballZone', 'road'], ['road', 'drum'], ['drum', 'finger'], ['finger', 'text'], ['text', 'drum'], ['text', 'road'], ['combo', 'pause'], ['combo', 'ballZone'], ['finger', 'road']];
    if (L.thumb) pairs.push(['text', 'thumb'], ['finger', 'thumb']);
    for (const [a, b] of pairs) if (box[a] && box[b] && ovl(box[a], box[b])) bad(`${tag} 겹침 ${a} ∩ ${b}`);
    for (const k of ['finger', 'text']) { const q = box[k]; if (q.x0 < (safe?.l || 0) + 15.9 || q.x1 > W - (safe?.r || 0) - 15.9 || q.y1 > H - (safe?.b || 0) - 8) bad(`${tag} ${k} 화면 여백 밖`); }
    if (L.text_slot.x1 - L.text_slot.x0 < 120) bad(`${tag} 글 자리 폭 ${L.text_slot.x1 - L.text_slot.x0} < 120`);
    if (L.orientation === 'landscape' && L.hud.combo.x1 > W - (safe?.r || 0) - 16) bad(`${tag} 콤보 줄이 화면 밖`);
    if (L.hud.combo.x1 > L.hud.bar.x1 + 1) bad(`${tag} 콤보 줄이 일시정지 칸까지 닿음`);
    if (L.star_d < 28 || L.ball.d < 24) bad(`${tag} 별 ${L.star_d} / 공 ${L.ball.d} 너무 작음`);
    rows.push(`${tag}: 판정 x ${L.judge_x}, 미리 보기 ${L.preview_px} px, 별 ${L.star_d} · 공 ${L.ball.d} · 북 r ${L.drum.r} · 선 ${L.line.w} px, 길 y ${L.road.y0}~${L.road.y1}, HUD 띠 아래 ${L.hud.band_bottom}`);
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
  return { lays, rows, fail, levels, lead, leadSrc };
}

function md(res) {
  const { lays, levels, lead, leadSrc } = res;
  const four = lays.slice(0, 4);
  const L = [];
  L.push(`미리 보기 박 수 출처: ${leadSrc}. 가로 ${lead.landscape.join(' / ')}, 세로 ${lead.portrait.join(' / ')} (L1~L10)`);
  L.push('');
  L.push('| 해상도 | 판정 선 x | 미리 보기 거리 | 별 지름 | 공 지름 | 길 띠 y (높이) | 판정 선 굵기 | 북 반지름 · 중심 y | 공 앉는 y · 뜀 높이 | 손가락 칸 | tut_tap 글 자리 | HUD 띠 아래끝 |');
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
    text_slots: { tut_tap: 'layouts[].text_slot (가로 = 손가락 칸 오른쪽, 세로 = 손가락 칸 아래). 가장 긴 언어로 2줄 안에 들어가야 하고 넘치면 글자 14 → 12 px, 그래도 넘치면 lore 문구 요청' },
    layouts: res.lays.map(({ per_level, ...a }) => ({ ...a, per_level })),
  };
  writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log('layout.json 씀');
}
console.log(res.fail ? `FAIL ${res.fail}` : 'road-layout OK');
process.exit(res.fail ? 1 : 0);
