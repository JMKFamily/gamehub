// 화면 배치 식 (data/layout.json schema 3). 식은 tools/art/layout.mjs compute() 와 같음(selfcheck G1 로 4해상도 대조). DOM 없음.
// 계수는 모두 layout.json 에서 읽음: 표시 높이 world.mark.h_of_d, 콤보 칸 combo.shape (cards.mjs SHAPE 와 같은 값).

// 콤보 줄 너비(cards.mjs comboWidth 와 같은 식)
export function comboWidth(K, tens) {
  return (tens ? tens * (K.ten_px + K.ten_gap_px) - K.ten_gap_px + K.group_gap_px : 0) + K.slots * (K.slot_px + K.slot_gap_px) - K.slot_gap_px;
}
// 손가락 상자(cards.mjs fingerBox 와 같은 식)
export function fingerBox(x, yTip, h, { mirror = false, lifted = false, taps = 1 } = {}) {
  const w = h * 0.26, pw = h * 0.66, dy = lifted ? -h * 0.5 : 0, top = yTip - h * 0.5 - h * 0.44 * 0.7 - (taps > 1 ? h * 0.26 : 0) + dy;
  const a = x - w / 2 - 1, b = x - w / 2 - 1 + Math.max(pw, w * 2.35 + w * 0.9);
  return mirror ? { x0: 2 * x - b, x1: 2 * x - a, y0: top, y1: yTip + h * 0.14 + dy } : { x0: a, x1: b, y0: top, y1: yTip + h * 0.14 + dy };
}

export function geom(L, W, H, safeTop = 0, safeBottom = 0, drumXRatio = 0.3, bal = null) {
  const S = Math.min(W, H), portrait = H > W;
  const k = portrait ? L.ball.d_of_S : (L.ball.d_of_S_landscape ?? L.ball.d_of_S);
  const d = Math.round(Math.max(L.ball.d_min, Math.min(L.ball.d_max, k * S)));
  const dw = L.drum.w_of_d * d, dh = L.drum.h_of_d * d;
  let skinY, floorTop;
  if (portrait) { skinY = Math.round(L.portrait.skin_y_of_H * H); floorTop = skinY + dh; }
  else { const fh = Math.max(L.landscape.floor_h_min, L.landscape.floor_h_of_H * H) + safeBottom; floorTop = H - fh; skinY = floorTop - dh; }
  const bandBottom = safeTop + (portrait ? L.hud.band_h.portrait : L.hud.band_h.landscape);
  const objTop = bandBottom + L.hud.gap_below_band;
  const topLimit = safeTop + L.play_height.top_margin;
  const Hp = (skinY - topLimit - d - L.play_height.apex_margin) / L.play_height.apex_budget;
  const cloudEdgeY = skinY - L.play_height.cloud_edge_of_Hp * Hp;
  const cloudBottom = cloudEdgeY + L.cloud.below_edge_of_d * d, cloudH = cloudBottom - objTop;
  const cx = Math.round(drumXRatio * W), drumLeft = cx - dw / 2;
  const laneY = floorTop + L.world.lane.dy_of_d * d, laneBottom = laneY + L.world.mark.h_of_d * d / 2 + 2;
  const c = 0.5 * Hp;
  const fingerH = L.finger.h_of_d * d, fingerX = drumLeft - 0.25 * fingerH - 2, fingerTip = laneY + L.finger.tip_dy_of_d * d;
  const fb = fingerBox(fingerX, fingerTip, fingerH, { mirror: true });
  const K = L.combo.shape;
  const comboP = portrait ? L.combo.place.portrait : L.combo.place.landscape;
  const comboW = comboWidth(K, K.tens_max_layout);
  const comboX0 = comboP.align === 'left' ? comboP.x : W - comboP.x_from_right - comboW;
  const comboBox = { x0: comboX0, x1: comboX0 + comboW, y0: safeTop + comboP.cy - K.ten_px / 2, y1: safeTop + comboP.cy + Math.max(K.ten_px, K.slot_px * 1.3) / 2 };
  const A = L.hud.attempts, attW = A.max_big_shown * A.big_pitch + 9 * A.pitch;
  const attBox = { x0: A.x0 - A.big_r, x1: A.x0 - A.big_r + attW, y0: safeTop + A.cy - A.big_r, y1: safeTop + A.cy + A.big_r };
  const judge = L.judgement ? judgeGeom(L, { portrait, d, cx, drumLeft, skinY, floorTop, Hp, fingerBox: fb }, bal) : null;
  return { W, H, safeTop, safeBottom, portrait, S, d, dw, dh, skinY, floorTop, bandBottom, objTop, topLimit, Hp, cloudEdgeY, cloudBottom, cloudH, cx, drumLeft, laneY, laneBottom, c, fingerX, fingerTip, fingerH, fingerBox: fb, comboBox, attBox, comboP, judge,
    skinH: L.drum.skin_h_of_d * d };
}

// 판정 이름·% 자리(layout.json judgement, tools/art/layout.mjs judgeGeom 과 같은 식). 지붕·가지 아랫면 중 낮은 것 = balance objects
export function judgeGeom(L, g, bal) {
  const J = L.judgement, F = J.font, d = g.d;
  const nameP = Math.max(F.name_px_min, Math.round(F.name_px_of_d * d)), pctP = Math.max(F.pct_px_min, Math.round(F.pct_of_name * nameP));
  const tickH = Math.round(J.style.ticks.h_of_name * nameP), gap = J.box.gap_px;
  const boxH = tickH + gap + nameP + gap + pctP;
  const pop = bal?.judgement_display?.timing?.pop_scale?.[1] ?? 1.15;
  const minUnder = Math.min(bal?.objects?.roof?.under_of_Hp ?? 0.45, bal?.objects?.branch?.under_of_Hp ?? 0.34);
  const y0 = g.skinY - minUnder * g.Hp + 4;
  let zone;
  if (g.portrait) { const Z = J.zone.portrait; zone = { x0: Z.x0, x1: g.cx - (d / 2 + L.ball.outline_of_d * d) - Z.gap_ball_px, y0, y1: g.skinY - d / 2 - L.grade_fx.max_r_of_d * d - 2 }; }
  else { const Z = J.zone.landscape; zone = { x0: Z.x0, x1: g.drumLeft - Z.gap_drum_px, y0, y1: Math.min(g.fingerBox.y0, g.floorTop) - 4 }; }
  const popH = boxH * pop, cy = zone.y1 - popH / 2;
  const box = { x1: zone.x1, y0: cy - boxH / 2, y1: cy + boxH / 2, cy };
  return { nameP, pctP, tickH, gap, boxH, pop, popH, zone, box, nameY: box.y0 + tickH + gap, pctY: box.y0 + tickH + gap + nameP + gap };
}

// 글 자리 tut_tap / practice_on (layout.json text_slots.tut_tap, layout.mjs staticChecks 와 같은 식)
export function textSlot(g) {
  if (g.portrait) return { x0: 16, x1: g.W - 16, y0: Math.max(g.laneBottom, g.fingerBox.y1) + 8, y1: g.H - g.safeBottom - 8, align: 'center' };
  return { x0: 12, x1: g.drumLeft - 8, y0: g.bandBottom + 8, y1: Math.min(g.fingerBox.y0, g.judge ? g.judge.zone.y1 - g.judge.popH : Infinity) - 8, align: 'left' };
}

// 결과 화면 자리(빌드 결정, DEV_NOTES R2-N5): 끝 구름 아래 = 레벨 이름 → 클리어 제목 → 등급 3칸(캔버스) → 정확도 줄 → 최고 콤보 줄 → 버튼
//   (layout.json result_screen 크기 순서 구름 등급 > 정확도 > 최고 콤보). 가로 화면은 버튼 줄을 북 오른쪽에서 가운데 맞춤(북과 겹치지 않게)
export function resultSlots(g, LY) {
  const RS = LY.result_screen || {};
  const top = g.cloudBottom + 6;
  const nameH = 20, titleH = 36, gw = 2 * g.d, gh = gw * 0.62, gap = 8;
  const gradeCy = top + nameH + 4 + titleH + gap + gh / 2;
  const accH = Math.max(RS.accuracy?.sign_px ?? 28, RS.accuracy?.font_px ?? 26) + 2, comboH = Math.max(RS.best_combo?.sign_px ?? 20, RS.best_combo?.font_px ?? 18) + 2;
  const accTop = gradeCy + gh / 2 + 6, comboTop = accTop + accH + 2;
  const btnTop = comboTop + comboH + 10;
  return { top, gradeCy, gradeW: gw, gradePitch: gw * 1.25, accTop, comboTop, btnTop, btnLeft: g.portrait ? 0 : g.cx + g.dw / 2 + 12, gradeMaxR: LY.grade_fx.max_r_of_d * g.d };
}
