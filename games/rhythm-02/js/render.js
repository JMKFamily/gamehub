// 캔버스 그리기. 모양 규칙은 30-art 3·5·6·7절, 수치는 data/layout.json, 색은 data/palette.json(투명도 없는 단색).
import { geom } from './layout.js';

const TAU = Math.PI * 2;
export const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export function mix(a, b, u) {
  if (u <= 0) return a; if (u >= 1) return b;
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * u).toString(16).padStart(2, '0')).join('');
}
// 미니 구름(등급 칸): cards.mjs miniCloud 와 같은 경로
const miniCloudPath = (cx, cy, w) => {
  const h = w * 0.62;
  return new Path2D(`M${cx - w / 2} ${cy + h / 2} h${w} a${h * 0.32} ${h * 0.32} 0 0 0 ${-h * 0.2} ${-h * 0.55} a${h * 0.42} ${h * 0.42} 0 0 0 ${-w * 0.5} ${-h * 0.15} a${h * 0.3} ${h * 0.3} 0 0 0 ${-w * 0.3 + h * 0.2} ${h * 0.7} z`);
};
const RETRY_ARC = new Path2D('M33 17 A11 11 0 1 0 35 28'), RETRY_HEAD = new Path2D('M27 12 L37 13 L34 22 Z');

function rr(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

export class Renderer {
  constructor(cv, D) {
    this.cv = cv; this.c = cv.getContext('2d', { alpha: false }); this.D = D;
    this.C = D.palette.common; this.LY = D.layout;
  }
  resize(W, H, dpr, safeTop = 0, safeBottom = 0) {
    this.W = W; this.H = H; this.dpr = dpr;
    this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr);
    this.cv.style.width = W + 'px'; this.cv.style.height = H + 'px';
    this.g = geom(this.LY, W, H, safeTop, safeBottom);
    return this.g;
  }

  // ---- 조각 ----
  ball(x, bottom, d, sq = 1, scale = 1) {
    const c = this.c, C = this.C;
    if (scale <= 0) return;
    d *= scale;
    const rx = d / 2 / sq, ry = d / 2 * sq, cy = bottom - ry;
    c.beginPath(); c.ellipse(x, cy, rx, ry, 0, 0, TAU);
    c.fillStyle = C.ball; c.fill();
    c.lineWidth = Math.max(2, this.LY.ball.outline_of_d * d); c.strokeStyle = C.ink; c.stroke();
    const sh = this.LY.ball.shine, r = sh.r_of_radius;
    c.beginPath(); c.ellipse(x, cy, r * rx, r * ry, 0, sh.from_deg * Math.PI / 180, sh.to_deg * Math.PI / 180);
    c.lineWidth = Math.max(2, sh.w_of_d * d); c.lineCap = 'round'; c.strokeStyle = C.ballShine; c.stroke();
  }
  drum(lift, glow) {
    const c = this.c, g = this.g, C = this.C, d = g.d, o = Math.max(2, this.LY.drum.outline_of_d * d);
    const x = g.cx - g.dw / 2, y = g.skinY - lift;
    rr(c, x, y, g.dw, g.dh, this.LY.drum.rx_of_d * d); c.fillStyle = C.drumBody; c.fill(); c.lineWidth = o; c.strokeStyle = C.ink; c.stroke();
    rr(c, x, y, g.dw, g.skinH, g.skinH / 2); c.fillStyle = glow ? C.glow : C.skin; c.fill(); c.stroke();
  }
  shadow(x, h, lift) {
    const g = this.g, S = this.LY.shadow;
    const w = g.d * (S.w_of_d_contact + (S.w_of_d_far - S.w_of_d_contact) * Math.min(1, Math.max(0, h / g.Hp)));
    this.c.beginPath(); this.c.ellipse(x, g.skinY - lift + g.skinH / 2, w / 2, Math.max(1.5, w * S.h_of_w / 2), 0, 0, TAU);
    this.c.fillStyle = this.C.shadow; this.c.fill();
  }
  cloud(fill) {
    const c = this.c, g = this.g, CL = this.LY.cloud, w = g.cloudW, h = g.cloudH, cx = g.cx, by = g.cloudEdgeY;
    const r = (k) => Math.min(k * h, 0.5 * h, CL.bump_r_max_of_w * w);
    const shapes = (p) => {
      rr(p, cx - w / 2, by - h * CL.base_h_of_h, w, h * CL.base_h_of_h, Math.min(h * 0.25, w * 0.12));
      p.fill();
      for (const [bx, br] of CL.bumps) { p.beginPath(); p.arc(cx + bx * w, by - h * 0.5, r(br), 0, TAU); p.fill(); }
    };
    const strokes = () => {
      rr(c, cx - w / 2, by - h * CL.base_h_of_h, w, h * CL.base_h_of_h, Math.min(h * 0.25, w * 0.12)); c.stroke();
      for (const [bx, br] of CL.bumps) { c.beginPath(); c.arc(cx + bx * w, by - h * 0.5, r(br), 0, TAU); c.stroke(); }
    };
    c.lineWidth = Math.max(2, CL.outline_of_d * g.d) * 2; c.strokeStyle = this.C.ink; strokes();
    c.fillStyle = fill; shapes(c);
  }
  floor(T) {
    const c = this.c, g = this.g;
    c.fillStyle = T.floor; c.fillRect(0, g.floorTop, g.W, g.H - g.floorTop);
    c.fillStyle = T.floorEdge; c.fillRect(0, g.floorTop, g.W, 2);
  }
  silhouettes(T) {
    const c = this.c, g = this.g, W = g.W, Hh = g.floorTop, S = g.S;
    c.fillStyle = T.sil;
    for (const e of T.silhouette || []) {
      const X = e.x * W, Y = e.y * Hh;
      c.beginPath();
      if (e.t === 'rect') c.rect(X, Y, e.w === 'full' ? W : e.w * S, e.h * S);
      else if (e.t === 'tri') { c.moveTo(X - e.w * S / 2, Y); c.lineTo(X + e.w * S / 2, Y); c.lineTo(X, Y - e.h * S); c.closePath(); }
      else if (e.t === 'ellipse') c.ellipse(X, Y, e.rx * S, e.ry * S, 0, 0, TAU);
      else if (e.t === 'diamond') { c.moveTo(X, Y - e.h * S / 2); c.lineTo(X + e.w * S / 2, Y); c.lineTo(X, Y + e.h * S / 2); c.lineTo(X - e.w * S / 2, Y); c.closePath(); }
      else if (e.t === 'pinwheel') { const r = e.r * S; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; c.moveTo(X, Y); c.lineTo(X + r * Math.cos(a), Y + r * Math.sin(a)); c.lineTo(X + r * Math.cos(a + 0.9), Y + r * Math.sin(a + 0.9)); c.closePath(); } }
      else if (e.t === 'sun') c.arc(X, Y, e.r * S, 0, TAU);
      c.fill();
    }
  }
  bounceLines(x, n, age, lift) {
    const BL = this.LY.bounce_lines, g = this.g, d = g.d, c = this.c;
    const u = age / BL.dur_s; if (u < 0 || u >= 1 || !n) return;
    c.strokeStyle = this.C.ink; c.lineWidth = BL.w_px; c.lineCap = 'round';
    for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
      const lx = x + s * BL.x_of_d[i] * d, len = BL.len_of_d[i] * d * (1 - u), y1 = g.skinY - lift - 0.08 * d - BL.rise_of_d * d * u;
      c.beginPath(); c.moveTo(lx, y1 - len); c.lineTo(lx, y1); c.stroke();
    }
  }
  swingLines(lift) {
    const c = this.c, g = this.g, x = g.cx, w = g.dw, y = g.skinY - lift, k = g.d / 30;
    c.strokeStyle = this.C.ink; c.lineWidth = 3; c.lineCap = 'round';
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * (w / 2 + 4 * k), y - 6 * k); c.lineTo(x + s * (w / 2 + 16 * k), y - 16 * k); c.stroke(); }
  }
  // 손가락(cards.mjs fingerSvg 와 같은 모양): 손끝 (x, yTip), 높이 h
  finger(x, yTip, h, press, scale = 1) {
    const c = this.c; h *= scale;
    const w = h * 0.26, fh = h * 0.5, pw = h * 0.66, ph = h * 0.44, py = yTip - fh - ph * 0.7, dy = press ? 0 : -h * 0.18;
    c.save(); c.translate(0, dy);
    c.fillStyle = this.C.finger; c.strokeStyle = this.C.ink; c.lineWidth = Math.max(2, h * 0.05); c.lineJoin = 'round';
    const R = (X, Y, W, H, r) => { rr(c, X, Y, W, H, r); c.fill(); c.stroke(); };
    R(x - w / 2 - 1, py, pw, ph, ph * 0.38);
    R(x + w / 2, py + ph * 0.6, w * 0.95, ph * 0.6, w * 0.45);
    R(x + w * 1.45, py + ph * 0.55, w * 0.9, ph * 0.55, w * 0.45);
    R(x - w / 2, py + ph * 0.45, w, yTip - py - ph * 0.45, w / 2);
    c.restore();
    if (press) {
      c.strokeStyle = this.C.ink; c.lineWidth = Math.max(2, h * 0.05); c.lineCap = 'round';
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * w, yTip + h * 0.06); c.lineTo(x + s * w * 1.5, yTip + h * 0.14); c.stroke(); }
    }
  }
  retry(x, y, dia) {
    const c = this.c, k = dia / 22;
    c.save(); c.translate(x - 24 * k, y - 24 * k); c.scale(k, k);
    c.strokeStyle = this.C.ink; c.lineWidth = 4.5; c.lineCap = 'round'; c.stroke(RETRY_ARC);
    c.fillStyle = this.C.ink; c.lineWidth = 2; c.fill(RETRY_HEAD); c.stroke(RETRY_HEAD);
    c.restore();
  }
  miniCloud(cx, cy, w, fill, dashed, scale = 1) {
    const c = this.c, p = miniCloudPath(cx, cy, w * scale);
    if (fill) { c.fillStyle = fill; c.fill(p); }
    c.strokeStyle = this.C.ink; c.lineWidth = 1.8; c.setLineDash(dashed ? [3, 3] : []); c.stroke(p); c.setLineDash([]);
  }
  flag(x, y, h) {
    const c = this.c;
    c.fillStyle = this.C.ink; c.fillRect(x, y - h, 2.5, h);
    c.beginPath(); c.moveTo(x + 2.5, y - h); c.lineTo(x + 2.5 + h * 0.7, y - h * 0.78); c.lineTo(x + 2.5, y - h * 0.56); c.closePath();
    c.fillStyle = this.C.drumBody; c.fill(); c.strokeStyle = this.C.ink; c.lineWidth = 1.2; c.stroke();
  }
  hud(H) {
    const c = this.c, g = this.g, b = g.hud.bar, C = this.C, LH = this.LY.hud;
    const w = b.x1 - b.x0;
    rr(c, b.x0, b.y, w, b.h, b.h / 2); c.fillStyle = C.hudTrack; c.fill(); c.lineWidth = 2; c.strokeStyle = C.ink; c.stroke();
    if (H.progress > 0) { rr(c, b.x0 + 2, b.y + 2, (w - 4) * Math.min(1, H.progress), b.h - 4, (b.h - 4) / 2); c.fillStyle = C.drumBody; c.fill(); }
    for (const f of H.flags || []) this.flag(b.x0 + w * f - 1, b.y - 1, 14);
    if (H.best > 0) { c.beginPath(); c.arc(b.x0 + w * Math.min(1, H.best), b.y + b.h / 2, LH.best_r, 0, TAU); c.fillStyle = C.ball; c.fill(); c.lineWidth = 2; c.strokeStyle = C.ink; c.stroke(); }
    // 시도 점: 10개마다 큰 점 1개로 묶음
    const big = Math.floor(H.attempts / LH.dots_max), small = H.attempts % LH.dots_max;
    let x = b.x0 + LH.dot_r;
    const y = b.y + b.h / 2 + LH.dots_dy;
    c.fillStyle = C.drumBody;
    for (let i = 0; i < big; i++) { c.beginPath(); c.arc(x + LH.best_r - LH.dot_r, y, LH.best_r, 0, TAU); c.fill(); x += LH.best_r * 2 + 4; }
    for (let i = 0; i < small; i++) { c.beginPath(); c.arc(x, y, LH.dot_r, 0, TAU); c.fill(); x += LH.dot_gap; }
  }

  // ---- 한 장면 ----
  frame(s) {
    const c = this.c, g = this.g, T = s.theme;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = s.bg; c.fillRect(0, 0, g.W, g.H);
    this.silhouettes(T);
    this.floor(T);
    this.drum(s.lift, s.glow);
    for (const sh of s.shadows) this.shadow(sh.x, sh.h, s.lift);
    for (const b of s.balls) this.ball(b.x, b.bottom, g.d, b.sq, b.scale);
    this.cloud(s.cloudFill);
    for (const l of s.lines) this.bounceLines(l.x, l.n, l.age, s.lift);
    if (s.swing) this.swingLines(s.lift);
    if (s.finger) this.finger(g.fingerX, g.floorTop, g.fingerH, s.finger.press, s.finger.scale);
    if (s.retry) this.retry(g.cx, g.skinY - g.dh - 1.6 * g.d, 1.2 * g.d);
    if (s.grades) {
      const w = 0.9 * g.d * 1.4, y = g.cloudEdgeY + 0.8 * g.d;
      for (let i = 0; i < 3; i++) {
        const x = g.cx + (i - 1) * w * 1.35, f = s.grades.fill[i];
        if (f > 0) this.miniCloud(x, y, w, T.accent, false, f); else this.miniCloud(x, y, w, null, true);
      }
    }
    if (s.practiceFlag) this.flag(g.cx - 6, g.cloudEdgeY + 1.6 * g.d, 1.2 * g.d);
    if (s.hud && s.hud.alpha > 0) { c.globalAlpha = s.hud.alpha; this.hud(s.hud); c.globalAlpha = 1; }
  }
}
