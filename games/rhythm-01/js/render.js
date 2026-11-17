// 캔버스 그리기 (30-art 2~8·10절, 값은 data/art.json·palette.json)
import { barAt, stageAt } from './engine.js';

const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const easeOut = (k) => 1 - (1 - k) * (1 - k);
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mix(a, b, k) {
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp01(k))).toString(16).padStart(2, '0')).join('');
}

export function layout(W, H, art, safe = { t: 0, b: 0 }) {
  const portrait = W < H;
  const o = portrait ? art.orbit.portrait : art.orbit.landscape;
  const R = portrait ? Math.min(o.rW * W, o.rH * H) : Math.min(o.rH * H, o.rW * W);
  const cx = W / 2, cy = o.cy * H;
  const mx = (m) => Math.max(m[0], m[1] * R);
  const starR = Math.max(art.star.min, art.star.k * R);
  const ballR = Math.max(art.ball.min, art.ball.k * R);
  const band = Math.max(art.band.min, art.band.k * R);
  const h = art.hud;
  const pause = { x: W - h.margin - h.pause, y: h.margin + safe.t, w: h.pause, h: h.pause };
  const bar = { x: h.barLeft, y: (portrait ? h.barTopP : h.barTopL) + safe.t, w: pause.x - h.gapToPause - h.barLeft, h: h.barH };
  let thumb = null;
  if (portrait) {
    const t = art.thumb;
    const top = Math.max(cy + R + t.fxK * starR + t.pad, t.minTop * H);
    thumb = { x: t.side, y: top, w: W - 2 * t.side, h: H - t.bottom - safe.b - top };
  }
  return { W, H, portrait, R, cx, cy, starR, ballR, band, drumR: art.drum.k * R, mx, pause, bar, thumb, dotsY: bar.y + bar.h + h.dotsGap };
}

function starPath(g, x, y, r, inner) {
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = (k * Math.PI) / 5 - Math.PI / 2;
    const rr = k % 2 ? r * inner : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    k ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath();
}

const slotXY = (lay, slot, rad = lay.R) => {
  const a = (slot / 8) * TAU - Math.PI / 2;
  return [lay.cx + Math.cos(a) * rad, lay.cy + Math.sin(a) * rad];
};

export class Renderer {
  constructor(cv, data) {
    this.cv = cv; this.g = cv.getContext('2d');
    this.art = data.art; this.pal = data.palette; this.C = data.palette.common; this.A = data.palette.alpha;
    this.imgs = data.imgs;
    this.ripples = [];
  }

  resize(W, H, dpr, safe) {
    this.W = W; this.H = H; this.dpr = dpr;
    this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr);
    this.cv.style.width = W + 'px'; this.cv.style.height = H + 'px';
    this.lay = layout(W, H, this.art, safe);
  }

  ripple(V, scale, ms) { this.ripples.push({ V, scale, ms }); if (this.ripples.length > 12) this.ripples.shift(); }

  bg(th) {
    const g = this.g;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.fillStyle = th.bg; g.fillRect(0, 0, this.W, this.H);
  }

  silhouettes(th, clearK = 0) {
    const g = this.g, lay = this.lay, sf = this.pal.silhouette_frame;
    const fw = this.W, fh = lay.portrait && lay.thumb ? lay.thumb.y - 8 : this.H;
    const S = Math.min(fw, fh);
    g.save(); g.beginPath(); g.rect(0, 0, fw, fh); g.clip();
    th.silhouette.shapes.forEach((s, i) => {
      g.fillStyle = i === th.silhouette.clear && clearK > 0 ? mix(th.bgFar, th.cardTint, clearK * this.pal.blend.clear_silhouette_mix) : th.bgFar;
      const x = s.x * fw, y = s.y * fh;
      g.beginPath();
      if (s.t === 'circle') g.arc(x, y, s.r * S, 0, TAU);
      else if (s.t === 'rect') { const w = s.w === 'full' ? fw : s.w * S; if (g.roundRect) g.roundRect(x, y, w, s.h * S, (s.rx || 0) * S); else g.rect(x, y, w, s.h * S); }
      else if (s.t === 'tri') { const w = s.w * S, h = s.h * S; g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y); g.lineTo(x, y - h); g.closePath(); }
      g.fill();
    });
    void sf;
    g.restore();
  }

  thumbRest(th) {
    const t = this.lay.thumb; if (!t) return;
    const g = this.g;
    g.fillStyle = th.bgFar;
    g.beginPath(); g.roundRect ? g.roundRect(t.x, t.y, t.w, t.h, 20) : g.rect(t.x, t.y, t.w, t.h); g.fill();
    g.save(); g.globalAlpha = this.A.thumb_rest_border_trackEdge; g.strokeStyle = this.C.trackEdge; g.lineWidth = 2; g.setLineDash([8, 6]); g.stroke(); g.restore();
  }

  orbit(trackColor, dashed) {
    const g = this.g, L = this.lay, C = this.C, a = this.art;
    g.lineWidth = L.band; g.strokeStyle = trackColor;
    g.beginPath(); g.arc(L.cx, L.cy, L.R, 0, TAU); g.stroke();
    g.lineWidth = a.band.edge; g.strokeStyle = C.trackEdge;
    for (const s of [-1, 1]) { g.beginPath(); g.arc(L.cx, L.cy, L.R + (s * L.band) / 2, 0, TAU); g.stroke(); }
    if (dashed) {
      const d = a.showDash, seg = (TAU * L.R) / d.segs;
      g.save(); g.lineWidth = L.band * d.width; g.setLineDash([seg * d.on, seg * (1 - d.on)]);
      g.beginPath(); g.arc(L.cx, L.cy, L.R, -Math.PI / 2, TAU - Math.PI / 2); g.stroke(); g.restore();
    }
    // 눈금
    const t = a.ticks, bs = L.mx(t.beat), hr = L.mx(t.half);
    g.fillStyle = C.trackEdge;
    for (let s = 1; s < 8; s++) {
      const [x, y] = slotXY(L, s, t.at * L.R);
      if (s % 2 === 0) g.fillRect(x - bs / 2, y - bs / 2, bs, bs);
      else { g.save(); g.globalAlpha = this.A.tick_halfbeat_dot; g.beginPath(); g.arc(x, y, hr, 0, TAU); g.fill(); g.restore(); }
    }
    const tm = a.topMark, w = L.mx(tm.w), h = L.mx(tm.h);
    g.fillStyle = C.hud; g.strokeStyle = C.outline; g.lineWidth = 2;
    g.beginPath(); const ty = L.cy - tm.at * L.R - h / 2;
    g.roundRect ? g.roundRect(L.cx - w / 2, ty, w, h, w / 2) : g.rect(L.cx - w / 2, ty, w, h); g.fill(); g.stroke();
  }

  drum(th, V, dashed, countDots = -1, scale = 1, r0 = null) {
    const g = this.g, L = this.lay, C = this.C;
    const r = (r0 ?? L.drumR) * scale;
    g.fillStyle = th.drum; g.strokeStyle = C.outline; g.lineWidth = this.art.drum.outline;
    g.beginPath(); g.arc(L.cx, L.cy, r, 0, TAU); g.fill();
    if (dashed) { g.save(); g.strokeStyle = C.trackEdge; g.setLineDash([8, 6]); g.stroke(); g.restore(); } else g.stroke();
    g.save(); g.globalAlpha = this.A.drum_inner_ring_hud; g.strokeStyle = C.hud; g.lineWidth = 2;
    g.beginPath(); g.arc(L.cx, L.cy, (r * this.art.drum.innerK) / this.art.drum.k, 0, TAU); g.stroke(); g.restore();
    for (const rp of this.ripples) {
      const k = (V - rp.V) / rp.ms;
      if (k < 0 || k > 1) continue;
      g.strokeStyle = C.trackEdge; g.lineWidth = 3 * (1 - k) + 0.5;
      g.beginPath(); g.arc(L.cx, L.cy, r * lerp(1, rp.scale, easeOut(k)), 0, TAU); g.stroke();
    }
    if (countDots >= 0) {
      const s = r * 0.32, dr = Math.max(4, r * this.art.drum.countDots);
      for (let k = 0; k < 4; k++) {
        const x = L.cx + (k % 2 ? s : -s) * 0.75, y = L.cy + (k < 2 ? -s : s) * 0.75;
        g.beginPath(); g.arc(x, y, dr, 0, TAU);
        if (k < countDots) { g.fillStyle = C.hud; g.fill(); }
        g.strokeStyle = C.trackEdge; g.lineWidth = 1.5; g.stroke();
      }
    }
  }

  star(x, y, r, show, scale = 1) {
    const g = this.g, C = this.C, s = this.art.star;
    starPath(g, x, y, r * scale, s.inner);
    g.lineJoin = 'round';
    if (show) { g.strokeStyle = C.star; g.lineWidth = r * s.showW * scale; g.stroke(); }
    else { g.fillStyle = C.star; g.fill(); g.strokeStyle = C.outline; g.lineWidth = Math.max(s.outline[0], s.outline[1] * r * scale); g.stroke(); }
  }

  ball(angle, mode = 'solid', scale = 1, tail = true) {
    const g = this.g, L = this.lay, C = this.C, b = this.art.ball;
    const r = L.ballR * scale;
    const at = (a) => [L.cx + Math.sin(a) * L.R, L.cy - Math.cos(a) * L.R];
    if (mode === 'solid' && tail) {
      b.tailDeg.forEach((d, k) => {
        const [x, y] = at(angle - (d * Math.PI) / 180);
        g.save(); g.globalAlpha = this.A.ball_tail[k]; g.fillStyle = C.ball;
        g.beginPath(); g.arc(x, y, r * b.tailR[k], 0, TAU); g.fill(); g.restore();
      });
    }
    const [x, y] = at(angle);
    g.beginPath(); g.arc(x, y, r, 0, TAU);
    if (mode === 'hollow') { g.strokeStyle = C.ball; g.lineWidth = b.hollowW * L.ballR; g.stroke(); return; }
    g.fillStyle = C.ball; g.fill(); g.strokeStyle = C.outline; g.lineWidth = Math.max(b.outline[0], b.outline[1] * r); g.stroke();
    g.fillStyle = C.hud; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * b.hi, 0, TAU); g.fill();
  }

  mallet(scale, hitK) {
    const g = this.g, L = this.lay, C = this.C, m = this.art.mallet, R = L.R;
    if (scale <= 0) return;
    g.save();
    g.translate(L.cx + m.off[0] * R, L.cy + m.off[1] * R);
    g.rotate(((-m.tiltDeg + hitK * m.hitDeg) * Math.PI) / 180);
    g.scale(scale, scale);
    g.lineWidth = 2.5; g.strokeStyle = C.outline; g.lineJoin = 'round';
    const sw = m.stick[0] * R, sh = m.stick[1] * R, hw = m.head[0] * R, hh = m.head[1] * R;
    g.fillStyle = C.trackEdge; g.beginPath(); g.roundRect ? g.roundRect(-sw / 2, -hh * 0.3, sw, sh, sw / 2) : g.rect(-sw / 2, -hh * 0.3, sw, sh); g.fill(); g.stroke();
    g.fillStyle = C.hud; g.beginPath(); g.roundRect ? g.roundRect(-hw / 2, -hh * 1.2, hw, hh, hh * 0.35) : g.rect(-hw / 2, -hh * 1.2, hw, hh); g.fill(); g.stroke();
    g.restore();
  }

  hand(x, y, size, pressPx) {
    const im = this.imgs['hand-tap']; if (!im) return;
    this.g.drawImage(im, x - size / 2, y - size / 2 + pressPx, size, size);
  }
  flagAt(x, y, size) { const im = this.imgs.flag; if (im) this.g.drawImage(im, x - size / 2, y - size / 2, size, size); }

  gradeDrum(x, y, r, got, scale = 1) {
    const g = this.g, C = this.C;
    g.beginPath(); g.arc(x, y, r * scale, 0, TAU);
    if (!got) { g.save(); g.strokeStyle = C.trackEdge; g.lineWidth = 2; g.setLineDash([5, 4]); g.stroke(); g.restore(); return; }
    g.fillStyle = C.hud; g.fill(); g.strokeStyle = C.outline; g.lineWidth = 2.2; g.stroke();
    g.beginPath(); g.arc(x, y, r * scale * 0.66, 0, TAU); g.lineWidth = 1.5; g.stroke();
  }

  hud(th, prog, best, attempts, flags, slide) {
    const g = this.g, L = this.lay, C = this.C, h = this.art.hud, b = L.bar;
    const rr = (x, y, w, hh) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, hh, hh / 2) : g.rect(x, y, w, hh); };
    rr(b.x, b.y, b.w, b.h); g.fillStyle = th.track1; g.fill(); g.strokeStyle = C.trackEdge; g.lineWidth = 1.5; g.stroke();
    if (prog > 0) { rr(b.x, b.y, Math.max(b.h, b.w * prog), b.h); g.fillStyle = C.hud; g.fill(); }
    for (const f of flags) this.flagAt(b.x + b.w * f, b.y - h.flag / 2 - 1, h.flag);
    if (best != null && best > 0) {
      const bx = b.x + b.w * best;
      g.beginPath(); g.arc(bx, b.y + b.h / 2, h.bestR, 0, TAU); g.fillStyle = C.ball; g.fill(); g.strokeStyle = C.outline; g.lineWidth = 2; g.stroke();
    }
    void slide;
    // 시도 점
    const n = Math.min(attempts, h.dotsMax), first = attempts - n;
    g.save(); g.globalAlpha = this.A.attempt_dots_trackEdge; g.fillStyle = C.trackEdge;
    for (let k = 0; k < n; k++) {
      const x = b.x + h.dotR + k * h.dotStep, y = L.dotsY;
      if ((first + k + 1) % h.squareEvery === 0) g.fillRect(x - h.dotR, y - h.dotR, h.dotR * 2, h.dotR * 2);
      else { g.beginPath(); g.arc(x, y, h.dotR, 0, TAU); g.fill(); }
    }
    g.restore();
  }

  // ---- 플레이 화면 전체 ----
  play(S) {
    const { th, run, V, L, art } = S;
    const P = S.bal.restart.phases_s;
    this.RG = P.ball_regrow_at_top[0] * 1000; this.BRK = P.star_break_and_ball_hollow[1] * 1000;
    const g = this.g, lay = this.lay, C = this.C;
    const ph = run.phase;
    const failD = ph === 'fail' ? V - run.fail.V : -1;
    const x = ph === 'fail' ? run.fail.x : run.lt(V);
    const R = this.pal; void R;
    this.bg(th);
    // 클리어 물듦
    let clearK = 0;
    if (run.clearV != null) clearK = clamp01((V - run.clearV) / Math.max(L.barMs, 2000));
    this.silhouettes(th, clearK);
    this.thumbRest(th);
    // 궤도 색
    const tracks = [th.track1, th.track2, th.track3];
    const { b } = barAt(L, x);
    const st = stageAt(L, b), sp = stageAt(L, b - 1);
    let track = tracks[st - 1];
    if (st !== sp && b >= 0 && x >= run.t0 + L.barMs) track = mix(tracks[sp - 1], tracks[st - 1], (x % L.barMs) / L.barMs);
    if (failD >= 0) track = mix(track, th.track1, failD / (this.art.fx.miss.ms));
    if (clearK > 0) track = mix(track, th.cardTint, clearK);
    const mode = failD >= 0 ? 'fail' : run.barMode(x);
    this.orbit(track, mode === 'show');
    // 북채
    let mScale = 0, hitK = 0;
    if (failD < 0 && x >= run.t0) {
      for (const w of L.malletWins) {
        if (x < w.from || x >= w.to) continue;
        const gb = art.mallet.growBeats * L.beatMs;
        mScale = x < w.from + gb ? lerp(art.mallet.grow[0], 1, (x - w.from) / gb) : x > w.to - gb ? (w.to - x) / gb : 1;
      }
      for (const s of L.shows) { const d = x - s.t; if (d >= 0 && d < art.mallet.hitMs) hitK = Math.sin((d / art.mallet.hitMs) * Math.PI); }
    }
    const cin = mode === 'countin' ? Math.min(4, Math.floor((x - Math.max(run.t0, Math.floor(x / L.barMs) * L.barMs)) / L.beatMs) + 1) : -1;
    this.drum(th, V, mode === 'show', cin);
    this.mallet(mScale, hitK);
    // 별
    const fxA = art.fx;
    const shrinkK = failD >= this.RG ? clamp01((failD - this.RG) / (this.art.fail.pieceShrinkS * 1000)) : 0;
    for (const p of L.preview) {
      if (p.t < run.t0 || x < p.growStart) continue;
      const [sx, sy] = slotXY(lay, p.slot);
      const grow = lerp(art.star.grow[0], 1, clamp01((x - p.growStart) / (p.growEnd - p.growStart)));
      if (p.kind === 'show') {
        if (x < p.t) this.star(sx, sy, lay.starR, true, grow * (1 - shrinkK));
        else if (x - p.t < fxA.showRing.ms) this._ring(sx, sy, lay.starR * fxA.showRing.ring);
        continue;
      }
      const si = p.si;
      if (si < run.i0) continue;
      const j = si < run.i ? run.judged[si - run.i0] : null;
      if (j) { this._fx(sx, sy, j, V); continue; }
      if (failD >= 0 && si === run.fail.index) { this._broken(sx, sy, failD); continue; }
      if (shrinkK >= 1) continue;
      this.star(sx, sy, lay.starR, false, grow * (1 - shrinkK));
    }
    // 공
    if (failD >= 0) {
      const ang = ((x % L.barMs) / L.barMs) * TAU;
      if (failD < this.RG) this.ball(ang, 'hollow');
      else {
        const hk = clamp01((failD - this.RG) / (this.art.fail.hollowShrinkS * 1000));
        if (hk < 1) this.ball(ang, 'hollow', 1 - hk);
        const rg = this.art.clear.drumGrow; void rg;
        const regrow = S.bal.restart.ball_regrow_scale;
        this.ball(0, 'solid', lerp(regrow[0], regrow[1], clamp01((failD - this.RG) / (S.bal.restart.regrow_s * 1000))), false);
      }
    } else if (x < run.t0) this.ball(0, 'solid', 1, false);
    else if (ph === 'done' || x >= L.durationMs) this.ball(0, 'solid', 1, false);
    else this.ball(((x % L.barMs) / L.barMs) * TAU);
    // 등급 북 / 깃발
    if (run.clearV != null) {
      const cl = this.art.clear, base = S.gradeStartX;
      const r = cl.drumR * lay.R, y = lay.cy + cl.drumY * lay.R;
      if (run.practice) { if (x >= base) this.flagAt(lay.cx, y, r * 2.6); }
      else for (let k = 0; k < 3; k++) {
        const t = base + k * L.beatMs;
        if (x < t) continue;
        const sc = lerp(cl.drumGrow[0], 1, clamp01((x - t) / (L.beatMs * 0.25)));
        this.gradeDrum(lay.cx + (k - 1) * cl.drumGap * lay.R, y, r, k < run.grade, sc);
      }
    }
    // 손가락 (레벨 1 첫 꽉 찬 별)
    S.handOn = false;
    const cue = L.cue;
    if (cue && !run.cueDone && failD < 0 && cue.star >= run.i0 && x >= cue.t - cue.show_from_beats_before * L.beatMs && x <= cue.t + L.judge.pass_late_ms) {
      const ha = art.hand;
      const pos = lay.thumb ? [lay.thumb.x + lay.thumb.w / 2, lay.thumb.y + lay.thumb.h / 2] : [lay.W - ha.landscapeFromRight, lay.H - ha.landscapeFromBottom];
      const pf = cue.t - cue.press_from_beats_before * L.beatMs;
      const press = x >= pf ? ha.pressPx * clamp01((x - pf) / (cue.t - pf)) : 0;
      const gk = clamp01((x - (cue.t - cue.show_from_beats_before * L.beatMs)) / (ha.growBeats * L.beatMs));
      this.hand(pos[0], pos[1], ha.size * lerp(0.6, 1, gk), press);
      S.handOn = true; S.handPos = pos;
    }
    // HUD
    let best = S.best;
    if (failD >= 0 && S.slideFrom != null) {
      const k = clamp01((failD - this.BRK) / (S.bal.restart.best_record_slide_s * 1000));
      best = lerp(S.slideFrom, S.best, k);
    }
    const flags = run.practice ? L.checkpoints.map((c) => c.firstStar / L.stars.length) : [];
    const prog = failD >= 0 ? run.fail.index / L.stars.length : run.progress;
    this.hud(th, prog, run.practice ? null : best, run.attempts, flags);
    void g; void C;
  }

  _ring(x, y, r) { const g = this.g; g.strokeStyle = this.C.trackEdge; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }

  _fx(x, y, j, V) {
    const f = this.art.fx[j.grade], r = this.lay.starR, g = this.g;
    const k = (V - j.V) / f.ms;
    if (k < 0 || k >= 1) return;
    if (j.grade === 'pass') {
      this.star(x, y, r, false, lerp(1, f.scale, easeOut(k)));
      this._ring(x, y, r * f.ring);
      return;
    }
    const sc = k < 0.6 ? lerp(1, f.scale, easeOut(k / 0.6)) : f.scale * (1 - (k - 0.6) / 0.4);
    this.star(x, y, r, false, sc);
    const rw = Math.max(f.rayW[0], f.rayW[1] * r) * (1 - k * 0.5);
    g.strokeStyle = this.C.star; g.lineWidth = rw; g.lineCap = 'round';
    for (let q = 0; q < f.rays; q++) {
      const a = ((q * 360) / f.rays + (f.rayRot || 0)) * (Math.PI / 180) - Math.PI / 2;
      const r0 = r * sc + f.rayGap, r1 = r0 + f.rayLen * r;
      g.beginPath(); g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.stroke();
    }
  }

  _broken(x, y, d) {
    const m = this.art.fx.miss, g = this.g, r = this.lay.starR;
    const k = clamp01(d / m.ms);
    const shrink = d >= this.RG ? 1 - clamp01((d - this.RG) / (this.art.fail.pieceShrinkS * 1000)) : 1;
    if (shrink <= 0) return;
    for (const s of [-1, 1]) {
      g.save();
      g.translate(x + s * r * 0.25 * k, y + m.dropR * this.lay.R * easeOut(k));
      g.rotate((s * m.rotDeg * k * Math.PI) / 180);
      g.scale(shrink, shrink);
      g.beginPath(); g.rect(s < 0 ? -r * 1.2 : 0, -r * 1.2, r * 1.2, r * 2.4); g.clip();
      starPath(g, 0, 0, r, this.art.star.inner);
      g.fillStyle = this.C.broken; g.fill(); g.strokeStyle = this.C.outline; g.lineWidth = 2.5; g.stroke();
      g.restore();
    }
  }

  // 보정 화면 (박에 맞춰 움직이지 않음)
  calib(th, V, cs) {
    const lay = this.lay, c = this.art.calib, g = this.g, C = this.C;
    this.bg(th);
    this.thumbRest(th);
    const s = lay.R / c.refR;
    this.drum(th, V, false, -1, 1, c.drumR * s);
    const dr = Math.max(8, c.dotR * s);
    for (let k = 0; k < c.dots; k++) {
      const a = (k / c.dots) * TAU - Math.PI / 2;
      const x = lay.cx + Math.cos(a) * c.dotsR * s, y = lay.cy + Math.sin(a) * c.dotsR * s;
      const sc = cs.emptyK != null ? 1 - cs.emptyK : 1;
      g.beginPath(); g.arc(x, y, dr * sc, 0, TAU);
      if (k < cs.filled) { g.fillStyle = C.hud; g.fill(); g.strokeStyle = C.outline; g.lineWidth = 2; g.stroke(); }
      else { g.strokeStyle = C.trackEdge; g.lineWidth = 2; g.stroke(); }
    }
    if (cs.checkK > 0) {
      const k = clamp01(cs.checkK), r = c.drumR * s * 0.5 * k;
      g.strokeStyle = C.hud; g.lineWidth = Math.max(6, r * 0.28); g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(lay.cx - r, lay.cy); g.lineTo(lay.cx - r * 0.25, lay.cy + r * 0.7); g.lineTo(lay.cx + r, lay.cy - r * 0.6); g.stroke();
    }
    if (cs.hand && lay.thumb) this.hand(lay.thumb.x + lay.thumb.w / 2, lay.thumb.y + lay.thumb.h / 2, this.art.hand.size, 0);
  }

  // 메뉴 뒤 바탕
  menuBg(th) { this.bg(th); }

  // 타이틀: 정지 궤도 + 별 + 공
  title(th) {
    this.bg(th); this.silhouettes(th);
    this.orbit(th.track1, false);
    this.drum(th, 0, false);
    const [sx, sy] = slotXY(this.lay, 0);
    this.star(sx, sy, this.lay.starR, false);
    this.ball(Math.PI * 0.3);
  }
}
