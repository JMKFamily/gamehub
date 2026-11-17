// 화면 배치 식 (data/layout.json, 식은 tools/art/layout.mjs compute 와 같음). DOM 없음.
export function geom(LY, W, H, safeTop = 0, safeBottom = 0) {
  const S = Math.min(W, H), portrait = H > W;
  const k = portrait ? LY.ball.d_of_S : (LY.ball.d_of_S_landscape ?? LY.ball.d_of_S);
  const d = Math.round(Math.max(LY.ball.d_min, Math.min(LY.ball.d_max, k * S)));
  const dw = LY.drum.w_of_d * d, dh = LY.drum.h_of_d * d;
  let skinY, floorTop;
  if (portrait) { skinY = Math.round(LY.portrait.skin_y_of_H * H); floorTop = skinY + dh; }
  else { const fh = Math.max(LY.landscape.floor_h_min, LY.landscape.floor_h_of_H * H) + safeBottom; floorTop = H - fh; skinY = floorTop - dh; }
  const hudH = (portrait ? LY.portrait.hud_h : LY.landscape.hud_h) + safeTop;
  const topLimit = safeTop + LY.play_height.top_margin;
  const Hp = (skinY - topLimit - d - LY.play_height.apex_margin) / LY.play_height.apex_budget;
  const cloudEdgeY = skinY - LY.play_height.cloud_edge_of_Hp * Hp;
  const cloudH = cloudEdgeY - topLimit;
  const cloudW = Math.min(LY.cloud.w_of_h * cloudH, LY.cloud.w_max_of_W * W);
  const cx = W / 2;
  const fingerX = cx + dw / 2 + LY.finger.dx_of_d * d, fingerH = LY.finger.h_of_d * d;
  const h = LY.hud;
  const hud = {
    pause: { x: h.pause.x, y: safeTop + h.pause.y, size: h.pause.size },
    bar: { x0: h.bar_x0, x1: W - h.bar_x1_from_right, y: safeTop + h.bar_y, h: h.bar_h },
  };
  return { W, H, safeTop, safeBottom, portrait, S, d, dw, dh, skinY, floorTop, hudH, topLimit, Hp, cloudEdgeY, cloudH, cloudW, cx, fingerX, fingerH, hud, skinH: LY.drum.skin_h_of_d * d };
}
