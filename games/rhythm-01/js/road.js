// 북길 화면 규격 (30-art 16-1). 공식은 assets/road-layout.mjs layout() 과 같고, 값은 data/art.json road (= assets/layout.json rule).
// selfcheck-sim 이 layout.json layouts[] 8화면과 같은 값인지 대조한다.
//   W, H: CSS px, safe = {t, b, l, r}, R = art.road, lead = {landscape: [10], portrait: [10]} (레벨 path.preview_lead_beats*)
export function roadLayout(W, H, safe, R, lead) {
  safe = { t: 0, b: 0, l: 0, r: 0, ...safe };
  const o = W < H ? 'portrait' : 'landscape';
  const S = Math.min(W, H);
  const xj = safe.l + R.judge_x_frac[o] * (W - safe.l - safe.r);
  const D = W - safe.r - xj; // 미리 보기 거리: 오른쪽 끝(별 중심) → 판정 선
  const nHalfMax = Math.max(...lead[o].slice(1)); // 반박이 있는 레벨 중 가장 긴 미리 보기 박 (L1 = 정박만)
  const sHalfWorst = D / (2 * nHalfMax);
  const d = Math.floor(Math.min(R.star_d_frac_of_short_side * S, sHalfWorst - R.half_gap_px));
  const roadH = Math.round(R.road_h_mul * d);
  const yc = safe.t + R.road_y_frac[o] * (H - safe.t - safe.b);
  const road = { x0: 0, x1: W, y0: yc - roadH / 2, y1: yc + roadH / 2, yc };
  const ballD = Math.max(R.ball_d_min, Math.round(R.ball_d_mul * d));
  const ball = { d: ballD, x: xj, yRest: road.y0 - R.ball_gap_px - ballD / 2, bounce: R.ball_bounce_mul * ballD };
  ball.top = ball.yRest - ballD / 2 - ball.bounce;
  const drumR = R.drum_r_mul * d;
  const drum = { r: drumR, x: xj, y: road.y1 + R.drum_gap_px + drumR };
  const lineW = Math.max(R.line_w.min, Math.round(d / R.line_w.div));
  const line = { x: xj, w: lineW, y0: road.y0, y1: drum.y - drumR };
  const bar = { x0: 16 + safe.l, y0: R.hud.bar_y[o] + safe.t, h: R.hud.bar_h };
  const pause = { x0: W - safe.r - R.hud.pause_margin - R.hud.pause, y0: R.hud.pause_margin + safe.t, w: R.hud.pause, h: R.hud.pause };
  bar.x1 = pause.x0 - 12;
  const attemptY = bar.y0 + bar.h + R.hud.attempt_dy;
  const C = R.combo;
  const comboY = attemptY + C.dy_from_attempt;
  const comboW = C.marks_max * C.mark_pitch + (C.cells - 1) * C.dot_pitch + 2 * C.dot_r + 4;
  const combo = { x0: C.x0 + safe.l, x1: C.x0 + safe.l + comboW, y: comboY, y0: comboY - C.mark_r - 1, y1: comboY + C.mark_r + 1 };
  const hudBottom = Math.max(pause.y0 + pause.h, combo.y1, attemptY + R.hud.attempt_r) + R.hud_band_pad;
  const cell = Math.max(R.finger_cell.min, Math.round(R.finger_cell.mul * d));
  const fx = Math.max(xj, safe.l + R.margin + cell / 2);
  const finger = { s: cell, x0: fx - cell / 2, x1: fx + cell / 2, y0: drum.y + drumR + R.finger_gap_px };
  finger.y1 = finger.y0 + cell;
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
  if (o === 'portrait') thumb = { x0: 16, x1: W - 16, y0: Math.max(text.y1 + R.thumb.gap, R.thumb.top_frac * H), y1: H - R.thumb.bottom_margin - safe.b };
  const silFrame = { x0: 0, y0: hudBottom + 8, x1: W, y1: thumb ? thumb.y0 - 8 : H };
  // 판정 이름·% 자리 (30-art 16-13): 길 아랫변 + 6, 판정 북 물결(1.18배)·손가락 칸 오른쪽 + 8. 상자 = 가장 큰 등급(딱) × 튐 1.15배
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
    grades[g] = { name_px: F, pct_px: P, cap_px: J.em.cap * F, mark_w: mw, mark_gap: mg, w, h };
  }
  const wMax = Math.max(...Object.values(grades).map((g) => g.w)), hMax = Math.max(...Object.values(grades).map((g) => g.h));
  const jx0 = Math.max(drum.x + J.drum_ripple * drumR, finger.x1) + J.gap, jy0 = road.y1 + J.road_gap;
  const judgeLabel = {
    arrange: arr, x0: jx0, y0: jy0, x1: jx0 + J.pop * wMax, y1: jy0 + J.pop * hMax,
    anchor: { x: jx0, y: jy0 + (J.pop * hMax) / 2, origin: J.origin }, content_w: wMax, content_h: hMax,
    outline_px: Math.max(J.outline_min, Math.round(J.outline_mul * grades.pass.name_px)), grades,
  };
  // 결과 화면 정확도·최고 콤보 (16-13-4)
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
  if (o === 'portrait') {
    resArr = 'below_grades';
    const total = accW + RR.row_gap_mul * Fa + rComboW, x0 = W / 2 - total / 2, y0 = gradesBox.y1 + RR.gap;
    acc = { x0, x1: x0 + accW, y0, y1: y0 + Fa };
    const cy = y0 + Fa / 2;
    rCombo = { x0: acc.x1 + RR.row_gap_mul * Fa, x1: acc.x1 + RR.row_gap_mul * Fa + rComboW, y0: cy - Fc / 2, y1: cy + Fc / 2 };
  } else {
    resArr = 'beside_grades';
    acc = { x0: gradesBox.x0 - RR.gap - accW, x1: gradesBox.x0 - RR.gap, y0: drum.y - Fa / 2, y1: drum.y + Fa / 2 };
    rCombo = { x0: gradesBox.x1 + RR.gap, x1: gradesBox.x1 + RR.gap + rComboW, y0: drum.y - Fc / 2, y1: drum.y + Fc / 2 };
  }
  const titleY = Math.max(hudBottom + 8, ball.top - 36);
  const result = {
    arrange: resArr, grades: gradesBox, buttons: btns, accuracy: { ...acc, font_px: Fa, digit_h: J.em.cap * Fa },
    best_combo: { ...rCombo, font_px: Fc, digit_h: J.em.cap * Fc }, title_ref: { x0: 16, x1: W - 16, y0: titleY, y1: titleY + RR.title_h },
  };
  return {
    judge_label: judgeLabel, result,
    W, H, safe, orientation: o, portrait: o === 'portrait', short_side: S,
    judge_x: xj, preview_px: D, star_d: d, star_r: d / 2, half_spacing_worst_px: sHalfWorst, lead_half_max: nHalfMax,
    road, road_h: roadH, ball, drum, line,
    hud: { bar, pause, attempt_y: attemptY, combo, band_bottom: hudBottom },
    finger, text_slot: text, thumb, silhouette_frame: silFrame,
  };
}

// 레벨 흐름 속도 (px/ms): 미리 보기 거리 ÷ (lead 박 × 1박 ms). 1박 px = 미리 보기 거리 ÷ lead 박 (20-balance 17-8)
export function leadOf(L, lay) { return lay.portrait ? L.lead.portrait : L.lead.landscape; }
export function speedOf(L, lay) { return lay.preview_px / (leadOf(L, lay) * L.beatMs); }
// 별(또는 박) 시각 t 의 x: 판정 선 x + 속도 × (t − 지금). 지금 = 판정과 같은 보정 시계의 레벨 시간
export function xAt(lay, speed, t, now) { return lay.judge_x + speed * (t - now); }
