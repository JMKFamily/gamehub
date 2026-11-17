// 캔버스 그리기. 모양 규칙 = 30-art 3·5·6·7절(기준 그림 tools/art/cards.mjs 모양 함수와 같은 경로), 수치 = data/layout.json, 색 = data/palette.json.
// 세계 층의 x 는 main.js 가 judge.js worldX 로 계산해 넘김(여기서는 박·시각을 다루지 않음).
import { geom, comboWidth, textSlot, resultSlots } from './layout.js';

const TAU = Math.PI * 2;
const FAM = "system-ui, -apple-system, 'Segoe UI', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif"; // body 와 같은 글꼴(외부 글꼴 없음)
export const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export function mix(a, b, u) {
  if (u <= 0) return a; if (u >= 1) return b;
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * u).toString(16).padStart(2, '0')).join('');
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
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
    this.g = geom(this.LY, W, H, safeTop, safeBottom, this.D.bal.scroll.drum_x_ratio, this.D.bal);
    this.g.slot = textSlot(this.g);
    this.g.result = resultSlots(this.g, this.LY);
    return this.g;
  }

  // ---- 늘 보이는 것 ----
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
    // 다리(북 가운데 → 길 줄): 표시가 이 다리 밑에 오면 톡
    const lw = this.LY.drum.leg_w_of_d * d, top = y + g.dh - 2;
    if (g.laneY > top) { c.beginPath(); c.rect(g.cx - lw / 2, top, lw, g.laneY - top); c.fillStyle = C.drumBody; c.fill(); c.lineWidth = o * 0.8; c.strokeStyle = C.ink; c.stroke(); }
    rr(c, x, y, g.dw, g.dh, this.LY.drum.rx_of_d * d); c.fillStyle = C.drumBody; c.fill(); c.lineWidth = o; c.strokeStyle = C.ink; c.stroke();
    rr(c, x, y, g.dw, g.skinH, g.skinH / 2); c.fillStyle = glow ? C.glow : C.skin; c.fill(); c.stroke();
  }
  shadow(x, h, lift) {
    const g = this.g, S = this.LY.shadow;
    const w = g.d * (S.w_of_d_contact + (S.w_of_d_far - S.w_of_d_contact) * clamp(h / g.Hp, 0, 1));
    this.c.beginPath(); this.c.ellipse(x, g.skinY - lift + g.skinH / 2, w / 2, Math.max(1.5, w * S.h_of_w / 2), 0, 0, TAU);
    this.c.fillStyle = this.C.shadow; this.c.fill();
  }
  // ---- 세계 층 ----
  // 배경 실루엣 v2: 띠(너비 W)가 parallax 비율로 흘러 끝없이 이어짐. scrollPx = 그린 길 박 × 1박 px
  silhouettes(T, scrollPx) {
    const c = this.c, g = this.g, W = g.W, S = g.S, def = this.LY.world.deco.parallax_default;
    c.fillStyle = T.sil;
    for (const e of T.silhouette || []) {
      const par = e.parallax ?? def, off = ((scrollPx * par) % W + W) % W;
      const base = e.anchor === 'floor' ? g.floorTop - e.dy * S : null, skyTop = e.anchor === 'sky' ? g.bandBottom + e.dy * S : null;
      const reps = e.w === 'full' ? [0] : par ? [-W, 0, W] : [0];
      for (const k of reps) {
        const X = e.x * W - (e.w === 'full' ? 0 : off) + k;
        c.beginPath();
        if (e.t === 'rect') { const w = e.w === 'full' ? W : e.w * S, h = e.h * S, top = base != null ? base - h : skyTop; c.rect(X, top, w, h); }
        else if (e.t === 'tri') { const w = e.w * S, h = e.h * S, b = base != null ? base : skyTop + h; c.moveTo(X - w / 2, b); c.lineTo(X + w / 2, b); c.lineTo(X, b - h); c.closePath(); }
        else if (e.t === 'ellipse') { const cy = base != null ? base : skyTop + e.ry * S; c.ellipse(X, cy, e.rx * S, e.ry * S, 0, 0, TAU); }
        else if (e.t === 'diamond') { const w = e.w * S, h = e.h * S, cy = base != null ? base - h / 2 : skyTop + h / 2; c.moveTo(X, cy - h / 2); c.lineTo(X + w / 2, cy); c.lineTo(X, cy + h / 2); c.lineTo(X - w / 2, cy); c.closePath(); }
        else if (e.t === 'pinwheel') { const r = e.r * S, cy = base != null ? base : skyTop + r; for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2; c.moveTo(X, cy); c.lineTo(X + r * Math.cos(a), cy + r * Math.sin(a)); c.lineTo(X + r * Math.cos(a + 0.9), cy + r * Math.sin(a + 0.9)); c.closePath(); } }
        else if (e.t === 'sun') { const r = e.r * S, cy = base != null ? base - r : skyTop + r; c.arc(X, cy, r, 0, TAU); }
        c.fill();
      }
    }
  }
  floor(T, scrollPx) {
    const c = this.c, g = this.g, d = g.d, P = this.LY.world.deco.pebbles;
    c.fillStyle = T.floor; c.fillRect(0, g.floorTop, g.W, g.H - g.floorTop);
    c.fillStyle = T.floorEdge; c.fillRect(0, g.floorTop, g.W, 2);
    // 길 줄(표시가 앉는 선)
    const by = g.laneY + this.LY.world.mark.h_of_d * d / 2;
    c.fillRect(0, by, g.W, 2);
    // 조약돌: 엇간격 띠(너비 = gaps 합 × W)가 세계와 같은 속도(parallax 1)로 흐름
    const span = P.gaps_of_W.reduce((a, b) => a + b, 0) * g.W, off = ((scrollPx * P.parallax) % span + span) % span;
    const y = g.laneY + P.dy_of_d * d, w = P.w_of_d * d;
    for (let k = -1; k <= Math.ceil(g.W / span); k++) {
      let x = 0.05 * g.W + k * span - off;
      for (const gp of P.gaps_of_W) { if (x > -w && x < g.W) { rr(c, x, y, w, P.h_px, P.h_px / 2); c.fill(); } x += gp * g.W; }
    }
  }
  mark(x, scale) {
    if (scale <= 0) return;
    const c = this.c, g = this.g, M = this.LY.world.mark, d = g.d;
    const rx = M.w_of_d * d / 2 * scale, ry = M.h_of_d * d * scale, by = g.laneY + M.h_of_d * d / 2;
    c.beginPath(); c.ellipse(x, by, rx, ry, 0, Math.PI, TAU); c.closePath();
    c.fillStyle = this.C.drumBody; c.fill(); c.lineWidth = M.outline_px; c.lineJoin = 'round'; c.strokeStyle = this.C.ink; c.stroke();
  }
  hill(x0, x1, topY, fill) {
    const c = this.c, g = this.g;
    c.beginPath(); c.ellipse((x0 + x1) / 2, g.floorTop, (x1 - x0) / 2, g.floorTop - topY, 0, Math.PI, TAU); c.closePath();
    c.fillStyle = fill; c.fill(); c.lineWidth = this.LY.world.hill.outline_px; c.strokeStyle = this.C.ink; c.stroke();
  }
  // 긴 구름(W2·끝 구름): cards.mjs cloudGeom/cloudSvg 와 같은 모양(바깥 둘레만 외곽선)
  cloud(x0, x1, fill) {
    const c = this.c, g = this.g, CL = this.LY.cloud, h = g.cloudH, bottomY = g.cloudBottom;
    const r = CL.bump_r_of_h * h, cy = bottomY - CL.base_of_h * h, gap = CL.bump_gap_of_r * r, bh = CL.base_of_h * h;
    const w = x1 - x0, n = Math.max(2, Math.floor((w - 2 * r) / gap) + 1), span = (n - 1) * gap, start = x0 + (w - span) / 2;
    const body = () => { rr(c, x0, bottomY - bh, w, bh, bh / 2); c.fill(); c.stroke(); for (let i = 0; i < n; i++) { c.beginPath(); c.arc(start + i * gap, cy, r, 0, TAU); c.fill(); c.stroke(); } };
    c.fillStyle = fill; c.strokeStyle = this.C.ink; c.lineWidth = CL.outline_px * 2; body();
    rr(c, x0, bottomY - bh, w, bh, bh / 2); c.fill();
    for (let i = 0; i < n; i++) { c.beginPath(); c.arc(start + i * gap, cy, r, 0, TAU); c.fill(); }
  }
  // 지붕(차양): cards.mjs roofGeom/roofSvg 와 같은 경로. underY = 물결 끝(아랫면)
  roof(x0, x1, underY) {
    const c = this.c, g = this.g, S = this.LY.world.roof, d = g.d, C = this.C;
    const sd = S.scallop_d_of_d * d, bodyBottom = underY - sd / 2, bodyTop = bodyBottom - S.body_h_of_d * d, domeTop = bodyTop - S.dome_of_d * d;
    const n = Math.max(1, Math.round((x1 - x0) / sd)), sw = (x1 - x0) / n;
    const path = () => {
      c.beginPath(); c.moveTo(x0, bodyBottom); c.lineTo(x0, bodyTop); c.quadraticCurveTo((x0 + x1) / 2, domeTop - (bodyTop - domeTop), x1, bodyTop); c.lineTo(x1, bodyBottom);
      for (let i = 0; i < n; i++) { const xa = x1 - i * sw; c.ellipse(xa - sw / 2, bodyBottom, sw / 2, sd / 2, 0, 0, Math.PI, false); }
      c.closePath();
    };
    path(); c.fillStyle = C.roof; c.fill();
    c.save(); path(); c.clip(); c.fillStyle = C.roofStripe;
    for (let i = 1; i < n; i += 2) c.fillRect(x0 + i * sw, domeTop - d, sw, underY - domeTop + 2 * d);
    c.restore();
    path(); c.lineWidth = S.outline_px; c.lineJoin = 'round'; c.strokeStyle = C.ink; c.stroke();
  }
  // 가지(W5·W7): 가로 줄기 + 위로 렌즈 잎. underY = 줄기 아랫선
  branch(x0, x1, underY) {
    const c = this.c, d = this.g.d, S = this.LY.world.branch, C = this.C;
    const th = S.twig_h_of_d * d, gap = S.leaf_gap_of_d * d, n = Math.max(2, Math.floor((x1 - x0 - gap * 0.5) / gap)), L = S.leaf_len_of_d * d, Wl = S.leaf_w_of_d * d;
    const y = underY - th;
    c.lineWidth = 2; c.strokeStyle = C.ink; c.lineJoin = 'round'; c.fillStyle = C.leaf;
    for (let i = 0; i < n; i++) {
      const x = x0 + gap * 0.75 + i * ((x1 - x0 - gap * 1.5) / Math.max(1, n - 1)), a = (i % 2 ? 28 : -28) * Math.PI / 180;
      c.save(); c.translate(x, y); c.rotate(a);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(Wl, -L / 2, 0, -L); c.quadraticCurveTo(-Wl, -L / 2, 0, 0); c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
    rr(c, x0, y, x1 - x0, th, th / 2); c.fillStyle = C.branch; c.fill(); c.stroke();
  }

  // ---- 반응 ----
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
  // 손가락(cards.mjs fingerSvg mirror 와 같은 모양): 손끝 (x, yTip), 높이 h, 좌우 뒤집음(손바닥이 북을 덮지 않게)
  finger(x, yTip, h, press, scale = 1) {
    const c = this.c; h *= scale;
    const w = h * 0.26, fh = h * 0.5, pw = h * 0.66, ph = h * 0.44, py = yTip - fh - ph * 0.7, dy = press ? 0 : -h * 0.18;
    c.save(); c.translate(0, dy); c.translate(2 * x, 0); c.scale(-1, 1);
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
  // 판정 이름·% (30-art 6-3, layout.json judgement, balance judgement_display): 북 왼쪽 자리, 오른쪽 맞춤 두 줄(튐 선 → 이름 → %)
  //   J = {grade, name, pct, age(ms), alpha}. 이름 폭이 자리보다 넓으면 그 이름만 줄이고, 28 px 아래로 줄면 콘솔 경고(judgement.overflow, 한 번)
  judgeMeasure(name) {
    const c = this.c, J = this.LY.judgement, G = this.g.judge, Z = G.zone, sw = J.style.name_stroke_px;
    let px = G.nameP;
    c.font = `${J.font.weight} ${px}px ${FAM}`;
    let w = c.measureText(name).width + sw;
    if (w > Z.x1 - Z.x0) { px = Math.floor(px * (Z.x1 - Z.x0) / w); c.font = `${J.font.weight} ${px}px ${FAM}`; w = c.measureText(name).width + sw; }
    return { px, w, zoneW: Z.x1 - Z.x0 };
  }
  judgeLabel(L) {
    if (!L || L.alpha <= 0 || !this.g.judge) return;
    const c = this.c, C = this.C, J = this.LY.judgement, S = J.style, G = this.g.judge, Z = G.zone, T = this.D.bal.judgement_display.timing;
    const m = this.judgeMeasure(L.name);
    if (m.px < J.font.name_px_min && !this._warned?.[L.name]) { (this._warned ||= {})[L.name] = 1; console.warn(`judgement.overflow: "${L.name}" ${m.px}px < ${J.font.name_px_min}px (자리 ${m.zoneW.toFixed(0)} px)`); }
    const u = clamp(L.age / T.pop_ms, 0, 1), k = Math.sin(Math.PI * u), top = T.pop_scale[1];
    const sy = 1 + (top - 1) * k, sx = 1 + (Math.min(top, m.zoneW / m.w) - 1) * k;
    const x1 = G.box.x1, cy = G.box.cy, y0 = G.box.y0, tickH = G.tickH;
    c.save(); c.globalAlpha = L.alpha;
    c.translate(x1, cy); c.scale(Math.max(0.5, sx), sy); c.translate(-x1, -cy);
    const mid = x1 - m.w / 2;
    c.strokeStyle = C[S.ticks.color] || C.ink; c.lineWidth = S.ticks.w_px; c.lineCap = 'round';
    for (let i = 0; i < S.ticks.pairs_by_grade[L.grade]; i++) for (const sd of [-1, 1]) {
      const bx = mid + sd * S.ticks.x_of_name[i] * m.px;
      c.beginPath(); c.moveTo(bx, y0 + tickH); c.lineTo(bx + sd * S.ticks.splay_px, y0 + 1.5); c.stroke();
    }
    c.textAlign = 'right'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
    c.font = `${J.font.weight} ${m.px}px ${FAM}`;
    const ny = G.nameY + G.nameP * 0.86;
    c.lineWidth = S.name_stroke_px; c.strokeStyle = C[S.name_stroke] || C.ink; c.strokeText(L.name, x1 - S.name_stroke_px / 2, ny);
    c.fillStyle = C[S.name_fill[L.grade]]; c.fillText(L.name, x1 - S.name_stroke_px / 2, ny);
    if (L.pct != null) { c.font = `${J.font.weight} ${G.pctP}px ${FAM}`; c.fillStyle = C[S.pct_fill] || C.ink; c.fillText(`${L.pct}%`, x1 - S.name_stroke_px / 2, G.pctY + G.pctP * 0.86); }
    c.restore();
  }

  // ---- HUD 띠 ----
  hud(H) {
    const c = this.c, g = this.g, C = this.C, LH = this.LY.hud, st = g.safeTop, B = LH.bar;
    const x0 = B.x0 + (H.practice ? LH.practice.bar_shift_px : 0), x1 = g.W - B.x1_from_right, y = st + B.y, w = x1 - x0;
    rr(c, x0, y, w, B.h, B.h / 2); c.fillStyle = C.hudTrack; c.fill(); c.lineWidth = 2; c.strokeStyle = C.ink; c.stroke();
    if (H.progress > 0) { rr(c, x0 + 2, y + 2, (w - 4) * Math.min(1, H.progress), B.h - 4, (B.h - 4) / 2); c.fillStyle = C.drumBody; c.fill(); }
    if (H.practice) this.flag(LH.practice.flag_x, y + B.h + 2, LH.practice.flag_h);
    if (H.best > 0) { c.beginPath(); c.arc(x0 + w * Math.min(1, H.best), y + B.h / 2, B.best_r, 0, TAU); c.fillStyle = C.ball; c.fill(); c.lineWidth = 2; c.strokeStyle = C.ink; c.stroke(); }
    // 시도 점: 10개마다 큰 점(최대 4개), 나머지 작은 점
    const A = LH.attempts, big = Math.min(A.max_big_shown, Math.floor(H.attempts / A.per_big)), small = H.attempts % A.per_big;
    const ay = st + A.cy;
    c.fillStyle = C.drumBody;
    let x = A.x0;
    for (let i = 0; i < big; i++) { c.beginPath(); c.arc(x, ay, A.big_r, 0, TAU); c.fill(); x += A.big_pitch; }
    for (let i = 0; i < small; i++) { c.beginPath(); c.arc(x, ay, A.dot_r, 0, TAU); c.fill(); x += A.pitch; }
    if (H.combo) this.combo(H.combo, H.theme);
  }
  // 콤보(30-art 6-2, layout.json combo): 큰 표지(10마다) + 점 10칸, 숫자 없음. K = {n, pop, stage, stageAge, brk}
  combo(K, T) {
    const c = this.c, g = this.g, C = this.C, S = this.LY.combo.shape, P = g.comboP, cy = g.safeTop + P.cy;
    const n = K.n, tens = Math.floor(n / 10), ones = n % 10;
    const layoutX = (tn) => (P.align === 'left' ? P.x : g.W - P.x_from_right - comboWidth(S, tn));
    const kb = K.brk ?? 1; // 끊김: 제자리에서 1 → 0
    if (kb <= 0) return;
    const sq = (x, y, s, fill, lw, k = 1, rx = S.rx_px) => { const z = s * k * kb; if (z <= 0) return; rr(c, x + (s - z) / 2, y - z / 2, z, z, rx * k * kb); c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.strokeStyle = C.ink; c.stroke(); };
    // 10·20 단계: 0.25 s 동안 점 10개가 새 큰 표지 자리로 미끄러지며 작아짐 → 큰 표지 0.6 → 1.0 (합 0.4 s)
    const slide = K.stage && K.stage.s >= 10 && K.stageAge < 0.4 ? K.stageAge : null;
    let x = layoutX(tens);
    for (let i = 0; i < tens; i++) {
      let k = 1;
      if (slide != null && i === tens - 1) k = slide < 0.25 ? 0 : 0.6 + 0.4 * clamp((slide - 0.25) / 0.15, 0, 1);
      if (k > 0) sq(x, cy, S.ten_px, C.glow, 2, k, 3);
      x += S.ten_px + S.ten_gap_px;
    }
    const bigX = x - (S.ten_px + S.ten_gap_px);
    if (tens) x += S.group_gap_px - S.ten_gap_px;
    if (slide != null && slide < 0.25) {
      // 이전 자리(큰 표지 하나 적은 배치)의 찬 점 10개가 새 큰 표지로 모임
      let ox = layoutX(tens - 1); if (tens - 1) ox += (tens - 1) * (S.ten_px + S.ten_gap_px) - S.ten_gap_px + S.group_gap_px;
      const u = slide / 0.25;
      for (let i = 0; i < S.slots; i++) { const sx = ox + i * (S.slot_px + S.slot_gap_px); sq(sx + (bigX - sx) * u, cy, S.slot_px, C.ink, 1.4, 1 - 0.7 * u); }
    }
    for (let i = 0; i < S.slots; i++) {
      const on = i < ones;
      let k = 1;
      if (on && K.pop && K.pop.i === i && K.pop.age < this.LY.combo.update.ms / 1000) {
        const u = K.pop.age / (this.LY.combo.update.ms / 1000), top = K.pop.stage5 ? 1.3 : this.LY.combo.update.scale[1];
        k = 1 + (top - 1) * Math.sin(Math.PI * u);
      }
      if (!(slide != null && slide < 0.25 && !on)) sq(x, cy, S.slot_px, on ? C.ink : C.hudTrack, 1.4, k);
      x += S.slot_px + S.slot_gap_px;
    }
    // 20 단계: accent 4 px 네모 조각 5개가 HUD 띠 안에서 띠 아래 6 px 위까지 내려옴(0.6 s)
    if (K.stage && K.stage.s >= 20 && K.stageAge < 0.6) {
      const u = K.stageAge / 0.6, b = g.comboBox, yEnd = g.bandBottom - 6, y0 = g.safeTop + 2;
      c.fillStyle = T.accent;
      for (let i = 0; i < 5; i++) c.fillRect(b.x0 + (i + 0.5) * (b.x1 - b.x0) / 5 - 2, y0 + (yEnd - y0 - 4) * u, 4, 4);
    }
  }

  // ---- 한 장면 ----
  frame(s) {
    const c = this.c, g = this.g, T = s.theme;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = s.bg; c.fillRect(0, 0, g.W, g.H);
    this.silhouettes(T, s.scrollPx || 0);
    for (const o of s.back || []) this.hill(o.x0, o.x1, o.topY, T.hill);
    this.floor(T, s.scrollPx || 0);
    this.drum(s.lift, s.glow);
    for (const sh of s.shadows) this.shadow(sh.x, sh.h, s.lift);
    for (const m of s.marks || []) this.mark(m.x, m.scale);
    for (const b of s.balls) if (!b.hidden) this.ball(b.x, b.bottom, g.d, b.sq, b.scale);
    for (const o of s.front || []) {
      if (o.type === 'cloud') this.cloud(o.x0, o.x1, o.fill);
      else if (o.type === 'roof') this.roof(o.x0, o.x1, o.underY);
      else if (o.type === 'branch') this.branch(o.x0, o.x1, o.underY);
    }
    for (const l of s.lines) this.bounceLines(l.x, l.n, l.age, s.lift);
    if (s.swing) this.swingLines(s.lift);
    if (s.finger) this.finger(g.fingerX, g.fingerTip, g.fingerH, s.finger.press, s.finger.scale);
    if (s.retry) this.retry(g.cx, g.skinY - g.dh - 1.6 * g.d, 1.2 * g.d);
    const R = g.result;
    if (s.grades) for (let i = 0; i < 3; i++) {
      const x = g.W / 2 + (i - 1) * R.gradePitch, f = s.grades.fill[i];
      if (f > 0) this.miniCloud(x, R.gradeCy, R.gradeW, T.accent, false, f); else this.miniCloud(x, R.gradeCy, R.gradeW, null, true);
    }
    if (s.practiceFlag) this.flag(g.W / 2 - 6, R.gradeCy + R.gradeW * 0.31, R.gradeW * 0.6);
    if (s.judge && s.judge.alpha > 0) this.judgeLabel(s.judge);
    if (s.hud && s.hud.alpha > 0) { c.globalAlpha = s.hud.alpha; this.hud(s.hud); c.globalAlpha = 1; }
  }
}
