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
    layouts: res.lays.map(({ per_level, ...a }) => ({ ...a, per_level })),
  };
  writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log('layout.json 씀');
}
console.log(res.fail ? `FAIL ${res.fail}` : 'road-layout OK');
process.exit(res.fail ? 1 : 0);
