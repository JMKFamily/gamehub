// 캔버스 그리기 — round-3 북길 (30-art 16절, 규격 data/art.json road = assets/layout.json rule, 색 palette.json)
// 그리는 순서(palette silhouette_frame_r3.draw_order): bg → 실루엣 → 엄지 받침 → 길 띠 → 눈금·마디 표 → 판정 북 → 판정 선 → 별 → 판정 이펙트 → 공 → 손가락 → HUD
import { stageAt, cueVisible } from './engine.js';
import { roadLayout, speedOf } from './road.js';

const TAU = Math.PI * 2;
const NO_FLAGS = [];
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const easeOut = (k) => 1 - (1 - k) * (1 - k);
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const mixCache = new Map();
// 색 섞기 (k 는 1/64 단위로 묶어 문자열을 캐시, 프레임마다 새 문자열을 만들지 않음)
export function mix(a, b, k) {
  k = Math.round(clamp01(k) * 64) / 64;
  const key = a + b + k;
  let v = mixCache.get(key);
  if (v === undefined) { v = mixRaw(a, b, k); if (mixCache.size > 2000) mixCache.clear(); mixCache.set(key, v); }
  return v;
}
function mixRaw(a, b, k) {
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp01(k))).toString(16).padStart(2, '0')).join('');
}

// 화면 배치: 북길 규격(road.js) + 보정 화면용 가운데 북 자리(10절 그대로) + 손가락·타이틀 힌트 자리
export function layout(W, H, art, lead, safe = { t: 0, b: 0, l: 0, r: 0 }) {
  const lay = roadLayout(W, H, safe, art.road, lead);
  const f = lay.finger;
  lay.hand = { x: (f.x0 + f.x1) / 2, y: (f.y0 + f.y1) / 2, size: f.s };
  // 보정 화면(30-art 10절, 북길로 바뀌지 않음): 가운데 북 + 점 8개, 크기 기준 R = 옛 궤도 반지름 공식
  const o = lay.portrait ? art.calib.orbit.portrait : art.calib.orbit.landscape;
  const R = lay.portrait ? Math.min(o.rW * W, o.rH * H) : Math.min(o.rH * H, o.rW * W);
  lay.calib = { cx: W / 2, cy: o.cy * H, R };
  if (lay.thumb) {
    const t = lay.thumb;
    lay.calib.hand = { x: (t.x0 + t.x1) / 2, y: (t.y0 + t.y1) / 2, size: Math.min(Math.max(art.hand.min, f.s), t.y1 - t.y0 - art.hand.portraitPad) };
  }
  return lay;
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
// 방위각(12시 = 0°, 시계 방향) → 화면 방향
const dirX = (deg) => Math.sin((deg * Math.PI) / 180), dirY = (deg) => -Math.cos((deg * Math.PI) / 180);

export class Renderer {
  constructor(cv, data) {
    this.cv = cv; this.g = this.mainG = cv.getContext('2d');
    this.art = data.art; this.pal = data.palette; this.C = data.palette.common; this.A = data.palette.alpha;
    this.imgs = data.imgs;
    // 미리 보기 박 (레벨마다, 별 지름 공식이 반박 레벨 중 가장 긴 값을 씀)
    this.lead = { landscape: data.L.map((L) => L.lead.landscape), portrait: data.L.map((L) => L.lead.portrait) };
    this.ripples = [];
    this.sprites = new Map();
    // 정적 바탕(바탕색·실루엣·엄지 받침)은 메인 캔버스 뒤 별도 캔버스(#bgcv)에 테마가 바뀔 때만 그림.
    // 메인 캔버스는 매 프레임 clearRect 뒤 움직이는 것만 그림 (옛 코어의 화면 크기 drawImage 를 없앰, round-3 성능)
    this.bgcv = document.createElement('canvas'); this.bgcv.id = 'bgcv'; this.bgcv.setAttribute('aria-hidden', 'true');
    cv.parentNode.insertBefore(this.bgcv, cv);
    this.bgKey = null;
  }

  resize(W, H, dpr, safe) {
    this.W = W; this.H = H; this.dpr = dpr;
    this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr);
    this.cv.style.width = W + 'px'; this.cv.style.height = H + 'px';
    this.lay = layout(W, H, this.art, this.lead, safe);
    this.sprites.clear();
    if (this.labels) this.labels.clear();
    // 바탕 캔버스도 지금 크기로, 그리기 버퍼까지 잡아 둠 (R12: 레벨 시작 때 첫 getContext 버퍼 할당이 주요 GC 를 부름)
    const b = this.bgcv; b.width = this.cv.width; b.height = this.cv.height; b.style.width = W + 'px'; b.style.height = H + 'px';
    this.bgG = b.getContext('2d'); this.bgG.fillStyle = '#000'; this.bgG.fillRect(0, 0, 1, 1);
    this.bgKey = null;
  }

  ripple(V, scale, ms) { this.ripples.push({ V, scale, ms }); if (this.ripples.length > 12) this.ripples.shift(); }

  bg(th) {
    const g = this.g;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.fillStyle = th.bg; g.fillRect(0, 0, this.W, this.H);
  }

  // 장소 실루엣: 판(silhouette_frame_r3) = HUD 띠 아래 + 8 ~ 받침 위 − 8(세로) / 화면 아래(가로). 도형 좌표 비율은 그대로
  silhouettes(th, clearK = 0) {
    const g = this.g, fr = this.lay.silhouette_frame;
    const fw = fr.x1 - fr.x0, fh = fr.y1 - fr.y0, S = Math.min(fw, fh);
    g.save(); g.beginPath(); g.rect(fr.x0, fr.y0, fw, fh); g.clip();
    th.silhouette.shapes.forEach((s, i) => {
      g.fillStyle = i === th.silhouette.clear && clearK > 0 ? mix(th.bgFar, th.cardTint, clearK * this.pal.blend.clear_silhouette_mix) : th.bgFar;
      const x = fr.x0 + s.x * fw, y = fr.y0 + s.y * fh;
      g.beginPath();
      if (s.t === 'circle') g.arc(x, y, s.r * S, 0, TAU);
      else if (s.t === 'rect') { const w = s.w === 'full' ? fw : s.w * S; if (g.roundRect) g.roundRect(x, y, w, s.h * S, (s.rx || 0) * S); else g.rect(x, y, w, s.h * S); }
      else if (s.t === 'tri') { const w = s.w * S, h = s.h * S; g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y); g.lineTo(x, y - h); g.closePath(); }
      g.fill();
    });
    g.restore();
  }

  thumbRest(th) {
    const t = this.lay.thumb; if (!t) return;
    const g = this.g, w = t.x1 - t.x0, h = t.y1 - t.y0;
    g.fillStyle = th.bgFar;
    g.beginPath(); g.roundRect ? g.roundRect(t.x0, t.y0, w, h, 20) : g.rect(t.x0, t.y0, w, h); g.fill();
    g.save(); g.globalAlpha = this.A.thumb_rest_border_trackEdge; g.strokeStyle = this.C.trackEdge; g.lineWidth = 2; g.setLineDash([8, 6]); g.stroke(); g.restore();
  }

  // 정적 바탕(바탕색 + 실루엣 + 엄지 받침): 뒤 캔버스에 테마(bg, bgFar)마다 한 번. 새 테마는 beginRun 이 시작 한 프레임 전에 그림(R12)
  hasLayer(th) { return this.bgKey === th.bg + th.bgFar; }
  staticLayer(th) {
    const key = th.bg + th.bgFar;
    if (this.bgKey === key) return;
    const g0 = this.g; this.g = this.bgG;
    try { this.bg(th); this.silhouettes(th, 0); this.thumbRest(th); } finally { this.g = g0; }
    this.bgKey = key;
  }
  // 메인 캔버스면 뒤 캔버스를 맞추고 투명하게 지움, 다른 대상(미리 돌리기 캔버스)이면 바탕색만
  drawLayer(th) {
    const g = this.g;
    if (g !== this.mainG) { this.bg(th); return; }
    this.staticLayer(th);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.cv.width, this.cv.height); g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // 길 띠: 화면 가로 전체, 위·아래 가장자리 trackEdge 1.5 px (원근·기울기 없음)
  road(track) {
    const g = this.g, r = this.lay.road, ew = this.art.ticks.edge;
    g.fillStyle = track; g.fillRect(0, r.y0, this.W, r.y1 - r.y0);
    g.fillStyle = this.C.trackEdge; g.fillRect(0, r.y0 - ew / 2, this.W, ew); g.fillRect(0, r.y1 - ew / 2, this.W, ew);
  }

  // 박 눈금(정박만, 아랫변 안쪽 작은 네모) / 마디 표(아랫변에서 띠 높이 30 % 짧은 세로 막대). 별과 같이 흐름
  ticks(L, speed, now, scale = 1) {
    if (scale <= 0) return;
    const g = this.g, lay = this.lay, t = this.art.ticks, d = lay.star_d, r = lay.road;
    const sz = Math.max(t.beat[0], t.beat[1] * d) * scale, mw = Math.max(t.bar.w[0], d * t.bar.w[1]) * scale, mh = (r.y1 - r.y0) * t.bar.h * scale;
    const beat = L.beatMs, x0 = lay.judge_x;
    const k0 = Math.ceil((now - (x0 + sz) / speed) / beat), k1 = Math.floor((now + (this.W - x0 + sz) / speed) / beat);
    g.save(); g.globalAlpha = this.A.tick_halfbeat_dot; g.fillStyle = this.C.trackEdge;
    for (let k = Math.max(0, k0); k <= k1; k++) {
      const x = x0 + speed * (k * beat - now);
      if (k % L.beatsPerBar === 0) g.fillRect(x - mw / 2, r.y1 - mh, mw, mh);
      else g.fillRect(x - sz / 2, r.y1 - t.inset - sz, sz, sz);
    }
    g.restore();
  }

  // 판정 북: 길 아랫변 6 px 아래, drum 면 + trackEdge 2 px 테두리 + 안쪽 hud 35 % 가는 원, 탭 물결, 카운트인 점 4개
  drum(th, V, countDots = -1) {
    const g = this.g, D = this.lay.drum, C = this.C, a = this.art.drum, r = D.r;
    g.beginPath(); g.arc(D.x, D.y, r, 0, TAU); g.fillStyle = th.drum; g.fill();
    g.strokeStyle = C.trackEdge; g.lineWidth = a.edge; g.stroke();
    g.save(); g.globalAlpha = this.A.drum_inner_ring_hud; g.strokeStyle = C.hud; g.lineWidth = a.innerW;
    g.beginPath(); g.arc(D.x, D.y, r * a.innerK, 0, TAU); g.stroke(); g.restore();
    for (const rp of this.ripples) {
      const k = (V - rp.V) / rp.ms;
      if (k < 0 || k > 1) continue;
      g.strokeStyle = C.trackEdge; g.lineWidth = 3 * (1 - k) + 0.5;
      g.beginPath(); g.arc(D.x, D.y, r * lerp(1, rp.scale, easeOut(k)), 0, TAU); g.stroke();
    }
    if (countDots >= 0) {
      const s = r * a.countOff, dr = Math.max(a.countDot[0], r * a.countDot[1]);
      for (let k = 0; k < 4; k++) {
        const x = D.x + (k % 2 ? s : -s), y = D.y + (k < 2 ? -s : s);
        g.beginPath(); g.arc(x, y, dr, 0, TAU);
        if (k < countDots) { g.fillStyle = C.hud; g.fill(); }
        g.strokeStyle = C.trackEdge; g.lineWidth = 1.2; g.stroke();
      }
    }
  }

  // 판정 선: hud 가는 세로선(굵기 layout line.w), 양옆 outline 1 px, 길 윗변 → 판정 북 위끝
  judgeLine() {
    const g = this.g, l = this.lay.line, o = this.art.line.outline;
    g.fillStyle = this.C.outline; g.fillRect(l.x - l.w / 2 - o, l.y0, l.w + 2 * o, l.y1 - l.y0);
    g.fillStyle = this.C.hud; g.fillRect(l.x - l.w / 2, l.y0, l.w, l.y1 - l.y0);
  }

  star(x, y, r, scale = 1, color = null) {
    const g = this.g, C = this.C, s = this.art.star;
    starPath(g, x, y, r * scale, s.inner);
    g.lineJoin = 'round';
    g.fillStyle = color || C.star; g.fill(); g.strokeStyle = C.outline; g.lineWidth = Math.max(s.outline[0], s.outline[1] * r * scale); g.stroke();
  }

  // 공(나): 판정 선 위, 길 윗변 2 px 위에 앉음. y = 앉는 자리 − 뜀 높이 (박 시각 = 가장 낮은 자리)
  ball(y, mode = 'solid', scale = 1) {
    const g = this.g, B = this.lay.ball, C = this.C, b = this.art.ball;
    const r = (B.d / 2) * scale, x = B.x;
    if (r <= 0) return;
    g.beginPath(); g.arc(x, y, r, 0, TAU);
    if (mode === 'hollow') { g.strokeStyle = C.ball; g.lineWidth = b.hollowW * B.d / 2 * scale; g.stroke(); return; }
    g.fillStyle = C.ball; g.fill(); g.strokeStyle = C.outline; g.lineWidth = Math.max(b.outline[0], b.outline[1] * r); g.stroke();
    g.fillStyle = C.hud; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * b.hi, 0, TAU); g.fill();
  }
  bounceY(phase) { const B = this.lay.ball; return B.yRest - B.bounce * 4 * phase * (1 - phase); }

  // SVG 그림을 기기 px 로 한 번만 래스터화해 둔 캔버스 (매 프레임 SVG drawImage 비용 제거)
  sprite(name, cssPx) {
    const im = this.imgs[name]; if (!im) return null;
    const px = Math.max(8, Math.ceil(cssPx * this.dpr));
    const key = name + '@' + px;
    let c = this.sprites.get(key);
    if (!c) {
      c = document.createElement('canvas'); c.width = c.height = px;
      c.getContext('2d').drawImage(im, 0, 0, px, px);
      this.sprites.set(key, c);
    }
    return c;
  }
  hand(x, y, size, upPx, ref = this.lay.hand.size) {
    const c = this.sprite('hand-tap', ref); if (!c) return;
    this.g.drawImage(c, x - size / 2, y - size / 2 - upPx, size, size);
  }
  flagAt(x, y, size) { const c = this.sprite('flag', Math.max(size, 40)); if (c) this.g.drawImage(c, x - size / 2, y - size / 2, size, size); }
  withTarget(g, fn) { const g0 = this.g; this.g = g; try { fn(); } finally { this.g = g0; } }
  prewarm() { this.sprite('hand-tap', this.lay.hand.size); this.sprite('flag', 40); if (this.lay.calib.hand) this.sprite('hand-tap', this.lay.calib.hand.size); }

  gradeDrum(x, y, r, got, scale = 1) {
    const g = this.g, C = this.C;
    g.beginPath(); g.arc(x, y, r * scale, 0, TAU);
    if (!got) { g.save(); g.strokeStyle = C.trackEdge; g.lineWidth = 2; g.setLineDash([5, 4]); g.stroke(); g.restore(); return; }
    g.fillStyle = C.hud; g.fill(); g.strokeStyle = C.outline; g.lineWidth = 2.2; g.stroke();
    g.beginPath(); g.arc(x, y, r * scale * 0.66, 0, TAU); g.lineWidth = 1.5; g.stroke();
  }

  hud(th, prog, best, attempts, flags) {
    const g = this.g, H = this.lay.hud, C = this.C, h = this.art.hud, b = H.bar, bw = b.x1 - b.x0;
    const rr = (x, y, w, hh) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, hh, hh / 2) : g.rect(x, y, w, hh); };
    rr(b.x0, b.y0, bw, b.h); g.fillStyle = th.track1; g.fill(); g.strokeStyle = C.trackEdge; g.lineWidth = 1.5; g.stroke();
    if (prog > 0) { rr(b.x0, b.y0, Math.max(b.h, bw * prog), b.h); g.fillStyle = C.hud; g.fill(); }
    for (const f of flags) this.flagAt(b.x0 + bw * f, b.y0 - h.flag / 2 - 1, h.flag);
    if (best != null && best > 0) {
      g.beginPath(); g.arc(b.x0 + bw * best, b.y0 + b.h / 2, h.bestR, 0, TAU); g.fillStyle = C.ball; g.fill(); g.strokeStyle = C.outline; g.lineWidth = 2; g.stroke();
    }
    // 시도 점
    const n = Math.min(attempts, h.dotsMax), first = attempts - n, dr = this.art.road.hud.attempt_r;
    g.save(); g.globalAlpha = this.A.attempt_dots_trackEdge; g.fillStyle = C.trackEdge;
    for (let k = 0; k < n; k++) {
      const x = b.x0 + dr + k * h.dotStep, y = H.attempt_y;
      if ((first + k + 1) % h.squareEvery === 0) g.fillRect(x - dr, y - dr, dr * 2, dr * 2);
      else { g.beginPath(); g.arc(x, y, dr, 0, TAU); g.fill(); }
    }
    g.restore();
  }

  // 콤보 줄 (30-art 16-4): HUD 띠 안, 왼쪽 큰 표지 자리 3 + 점 10칸. 숫자·글 없음, 노랑·공 색 없음
  //   c = 콤보, cs = {popV, popN, stepV, stepN, breakK(실패 0.3 s 작아짐 배율 또는 null)}
  combo(th, c, V, cs) {
    const ca = this.art.combo, R = this.art.road.combo, cb = this.lay.hud.combo, g = this.g, C = this.C;
    if (c < this.art.combo.showFrom) return;
    const k = cs.breakK == null ? 1 : cs.breakK;
    if (k <= 0) return;
    const y = cb.y, markX = (i) => cb.x0 + R.mark_r + i * R.mark_pitch, dotX = (i) => cb.x0 + R.marks_max * R.mark_pitch + R.dot_r + i * R.dot_pitch;
    const marks = Math.min(R.marks_max, Math.floor(c / R.cells)), dots = c % R.cells;
    const sinceStep = cs.stepV == null ? Infinity : V - cs.stepV, gather = cs.breakK == null && c >= R.cells && cs.stepN === c - dots && sinceStep >= 0 && sinceStep < ca.gather.ms;
    // 큰 표지
    for (let i = 0; i < marks; i++) {
      let s = k;
      if (gather && i === marks - 1) s *= lerp(ca.gather.markFrom, 1, easeOut(sinceStep / ca.gather.ms));
      g.beginPath(); g.arc(markX(i), y, R.mark_r * s, 0, TAU); g.fillStyle = th.cardTint; g.fill(); g.strokeStyle = C.outline; g.lineWidth = ca.markOutline; g.stroke();
    }
    // 빈 칸 고리
    g.save(); g.globalAlpha = ca.off.alpha; g.strokeStyle = C.trackEdge; g.lineWidth = ca.off.w;
    g.beginPath(); for (let i = dots; i < R.cells; i++) { const cx = dotX(i); g.moveTo(cx + ca.off.r * k, y); g.arc(cx, y, ca.off.r * k, 0, TAU); } g.stroke(); // 한 경로로 (그리기 호출 줄임)
    g.restore();
    // 찬 칸 (갱신 튐 120 ms: 1.0 → 1.15 → 1.0, 5단계 1.3)
    const sincePop = cs.popV == null ? Infinity : V - cs.popV;
    if (dots > 0) {
      g.beginPath();
      for (let i = 0; i < dots; i++) {
        let s = k;
        if (cs.breakK == null && i === dots - 1 && cs.popN === c && sincePop >= 0 && sincePop < ca.pop.ms) s *= 1 + ((cs.popBig ? ca.pop.step5 : ca.pop.scale) - 1) * Math.sin((sincePop / ca.pop.ms) * Math.PI);
        const cx = dotX(i), rr = R.dot_r * s; g.moveTo(cx + rr, y); g.arc(cx, y, rr, 0, TAU);
      }
      g.fillStyle = C.hud; g.fill(); g.strokeStyle = C.outline; g.lineWidth = ca.onOutline; g.stroke();
    }
    // 10·20·30: 점 10개가 표지 자리로 모이며 작아짐 (0.4 s)
    if (gather) {
      const q = sinceStep / ca.gather.ms, tx = markX(marks - 1);
      for (let i = 0; i < R.cells; i++) {
        const s = 1 - q;
        g.beginPath(); g.arc(lerp(dotX(i), tx, easeOut(q)), y, R.dot_r * s, 0, TAU); g.fillStyle = C.hud; g.fill(); g.strokeStyle = C.outline; g.lineWidth = ca.onOutline; g.stroke();
      }
    }
    // 20·30: 색 조각 6개가 줄 위 HUD 띠 안에서 0.6 s 동안 12 px 내려오며 작아져 사라짐
    if (cs.breakK == null && cs.stepN >= 2 * R.cells && cs.stepN === c - dots && sinceStep >= 0 && sinceStep < ca.confetti.ms) {
      const q = sinceStep / ca.confetti.ms, sz = ca.confetti.size * (1 - q);
      for (let i = 0; i < ca.confetti.n; i++) {
        const cx = cb.x0 + (i + 0.5) * ((cb.x1 - cb.x0) / ca.confetti.n), cy = cb.y0 - ca.confetti.fall - ca.confetti.size + q * ca.confetti.fall + (i % 2) * 3;
        g.fillStyle = i % 2 ? C.hud : th.cardTint; g.fillRect(cx - sz / 2, cy - sz / 2, sz, sz);
      }
    }
  }

  // ---- 플레이 화면 전체 ----
  play(S) {
    const { th, run, V, L, art } = S;
    const P = S.bal.restart.phases_s;
    const RG = P.ball_regrow_at_top[0] * 1000, BRK = P.star_break_and_ball_hollow[1] * 1000;
    const lay = this.lay, C = this.C;
    const ph = run.phase;
    const failD = ph === 'fail' ? V - run.fail.V : -1;
    const x = failD >= 0 ? run.fail.x : run.lt(V); // 실패하면 길 흐름이 멈춤
    const speed = speedOf(L, lay);
    let clearK = 0;
    if (run.clearV != null) clearK = clamp01((V - run.clearV) / Math.max(L.barMs, 2000));
    // 길 색 (진행 단계 1마디 섞기 → 실패 track1 0.3 s → 클리어 cardTint)
    const tracks = th._tracks || (th._tracks = [th.track1, th.track2, th.track3]);
    const b = Math.floor(x / L.barMs) - L.countInBars;
    const st = stageAt(L, b), sp = stageAt(L, b - 1);
    let track = tracks[st - 1];
    if (st !== sp && b >= 0 && x >= run.t0 + L.barMs) track = mix(tracks[sp - 1], tracks[st - 1], (x % L.barMs) / L.barMs);
    if (failD >= 0) track = mix(track, th.track1, failD / art.fx.miss.ms);
    if (clearK > 0) track = mix(track, th.cardTint, clearK);
    const mode = failD >= 0 ? 'fail' : run.barMode(x);
    if (clearK === 0) this.drawLayer(th);
    else { this.bg(th); this.silhouettes(th, clearK); this.thumbRest(th); }
    this.road(track);
    // 0.88 ~ 0.98 s: 조각·남은 별·눈금이 작아지며 사라짐
    const shrinkK = failD >= RG ? clamp01((failD - RG) / (art.fail.pieceShrinkS * 1000)) : 0;
    this.ticks(L, speed, x, 1 - shrinkK);
    const cin = mode === 'countin' ? Math.min(4, Math.floor((x - run.t0) / L.beatMs) + 1) : -1;
    this.drum(th, V, cin);
    this.judgeLine();
    // 별 (오른쪽 끝 W + r 에서 들어와 판정 선으로, 판정된 별·이펙트는 길과 함께 계속 왼쪽으로)
    const r = lay.star_r, yc = lay.road.yc, xMax = this.W + r + 1, xMin = -2 * r;
    for (let si = run.i0; si < L.stars.length; si++) {
      const s = L.stars[si];
      const sx = lay.judge_x + speed * (s.t - x);
      if (sx > xMax) break;
      if (sx < xMin) continue;
      if (si < run.i) { const j = run.judged[si - run.i0]; if (j) this._fx(sx, yc, j, V); continue; }
      if (failD >= 0 && si === run.fail.index) { this._broken(sx, yc, failD, RG); continue; }
      if (shrinkK >= 1) continue;
      this.star(sx, yc, r, 1 - shrinkK);
    }
    // 공: 박마다 착지 (박 시각 = 가장 낮은 자리). 실패 = 그 자리 속 빈 원 → 0.88 s 부터 앉는 자리에서 0.6 → 1.0배
    const phase = (q) => ((q % L.beatMs) + L.beatMs) % L.beatMs / L.beatMs;
    if (failD >= 0) {
      const yb = this.bounceY(phase(run.fail.x));
      if (failD < RG) this.ball(yb, 'hollow');
      else {
        const hk = clamp01((failD - RG) / (art.fail.hollowShrinkS * 1000));
        if (hk < 1) this.ball(yb, 'hollow', 1 - hk);
        const rg = S.bal.restart.ball_regrow_scale;
        this.ball(lay.ball.yRest, 'solid', lerp(rg[0], rg[1], clamp01((failD - RG) / (S.bal.restart.regrow_s * 1000))));
      }
    } else if (x < run.t0) this.ball(lay.ball.yRest);
    else if (run.clearV != null && x >= S.ballStopX) this.ball(lay.ball.yRest);
    else this.ball(this.bounceY(phase(x)));
    // 등급 북 / 깃발: outro 둘째 마디, 1박 간격, 판정 북과 같은 y, 화면 가운데
    if (run.clearV != null) {
      const cl = art.clear, base = S.gradeStartX, gr = cl.gradeR * lay.drum.r, gy = lay.drum.y, gx = this.W / 2;
      if (run.practice) { if (x >= base) this.flagAt(gx, gy, gr * 2.6); }
      else for (let k = 0; k < 3; k++) {
        const t = base + k * L.beatMs;
        if (x < t) continue;
        const sc = lerp(cl.drumGrow[0], 1, clamp01((x - t) / (L.beatMs * 0.25)));
        this.gradeDrum(gx + (k - 1) * cl.gradeGap * lay.drum.r, gy, gr, k < run.grade, sc);
      }
    }
    // 손가락 (레벨 1 첫 별): 판정 북 바로 아래 칸, 1박 전 나타남, 0.25박 전부터 위(북)로 누름
    S.handOn = false;
    const cue = L.cue;
    if (failD < 0 && cueVisible(L, run, x)) {
      const ha = art.hand, hb = lay.hand;
      const pf = cue.pressFrom;
      const press = x >= pf ? ha.pressPx * (hb.size / ha.pressRef) * clamp01((x - pf) / (cue.t - pf)) : 0;
      const gk = clamp01((x - cue.from) / (ha.growBeats * L.beatMs));
      this.hand(hb.x, hb.y, hb.size * lerp(0.6, 1, gk), press);
      S.handOn = true;
    }
    // 판정 이름·정확도 % (30-art 16-13): 길 띠 아래·판정 북 오른쪽 상자. 튐 80 → 유지 400 → 흐려짐 150 ms, 새 판정은 S.ro 가 바뀌어 그 프레임에 바꿔 그림.
    // 손가락·tut 글이 보이는 프레임에는 그리지 않음(가로 화면 시간 배타). 실패 = 0.3 s 안에 콤보 줄과 함께 작아짐, 클리어 = 0.2 s 흐려짐
    S.labelOn = false;
    if (S.ro && !S.handOn) {
      const JL = art.road.judge_label, life = JL.hold_ms + JL.fade_ms;
      const at = failD >= 0 ? run.fail.V : V, t = at - S.ro.V;
      if (t >= 0 && t < life) {
        let sc = t < JL.pop_ms ? 1 + (JL.pop - 1) * Math.sin((t / JL.pop_ms) * Math.PI) : 1;
        let al = t > JL.hold_ms ? 1 - (t - JL.hold_ms) / JL.fade_ms : 1;
        if (failD >= 0) { const q = failD / (S.bal.combo.break_fx.fade_s * 1000); sc *= q < 1 ? 1 - q * q : 0; }
        if (run.clearV != null && V > run.clearV) al *= 1 - clamp01((V - run.clearV) / JL.clear_fade_ms);
        if (sc > 0 && al > 0) { this._readout(S.ro, sc, al); S.labelOn = true; }
      }
    }
    // HUD
    let best = S.best;
    if (failD >= 0 && S.slideFrom != null) best = lerp(S.slideFrom, S.best, clamp01((failD - BRK) / (S.bal.restart.best_record_slide_s * 1000)));
    const flags = run.practice ? (L._flags || (L._flags = L.checkpoints.map((c) => c.firstStar / L.stars.length))) : NO_FLAGS;
    const prog = failD >= 0 ? run.fail.index / L.stars.length : run.progress;
    this.hud(th, prog, run.practice ? null : best, run.attempts, flags);
    // 콤보 (실패 = 0 ~ 0.3 s 소리 없이 작아지며 사라짐, ease-in)
    if (S.comboOn) {
      const cs = S.cs;
      if (failD >= 0) {
        const q = failD / (S.bal.combo.break_fx.fade_s * 1000);
        cs.breakK = q < 1 ? 1 - q * q : 0;
        this.combo(th, run.fail.combo, V, cs);
      } else { cs.breakK = null; this.combo(th, run.grades.length, V, cs); }
    }
    void C;
  }

  // 판정 글 한 덩어리: [등급 표지][이름 위 / % 아래], 기준점 = 덩어리 왼쪽 가운데(layout judge_label.anchor), 등급 색 + outline 테(바깥쪽만)
  // 판정 글은 (등급, %, 이름)마다 기기 px 스프라이트로 한 번만 그려 둠 — 큰 글자 strokeText 를 매 프레임 하면 DPR 3 에서 프레임이 25~50 ms 로 길어졌음(성능)
  _readout(ro, scale, alpha) {
    const sp = this._labelSprite(ro.grade, ro.pct, ro.name), J = this.lay.judge_label, g = this.g;
    g.save(); g.globalAlpha = alpha; g.translate(J.anchor.x, J.anchor.y); g.scale(scale / this.dpr, scale / this.dpr);
    g.drawImage(sp.c, -sp.ox, -sp.oy); g.restore();
  }
  _labelSprite(grade, pct, name) {
    const key = grade + "|" + pct + "|" + name;
    const m = this.labels || (this.labels = new Map());
    let sp = m.get(key);
    if (sp) return sp;
    const J = this.lay.judge_label, G = J.grades[grade], pad = 2 * J.outline_px + 4, d = this.dpr;
    const w = J.content_w + 2 * pad, h = G.h + 2 * pad;
    const c = document.createElement("canvas"); c.width = Math.ceil(w * d); c.height = Math.ceil(h * d);
    const g0 = this.g; this.g = c.getContext("2d");
    try { this.g.setTransform(d, 0, 0, d, pad * d, (h / 2) * d); this._labelDraw({ grade, pct, name }); } finally { this.g = g0; }
    sp = { c, ox: pad * d, oy: (h / 2) * d };
    m.set(key, sp);
    return sp;
  }
  // 모든 등급·% 조합을 미리 그려 둠 (첫 판정 프레임 비용 없음). names = {perfect, good, pass}
  prewarmLabels(names) {
    if (!names || !this.lay) return;
    const a = this.art.labelPcts;
    for (const g of ["perfect", "good", "pass"]) for (const p of a[g]) this._labelSprite(g, p, names[g]);
  }
  _labelDraw(ro) {
    const g = this.g, J = this.lay.judge_label, G = J.grades[ro.grade], JR = this.art.road.judge_label, C = this.C;
    const col = this.pal.judge_label_r3.colors[ro.grade], F = G.name_px, P = G.pct_px, h = F + JR.line_gap_mul * F + P;
    const ny = -h / 2 + F / 2, py = h / 2 - P / 2, tx = G.mark_w + G.mark_gap, ow = 2 * J.outline_px;
    g.save();
    // 표지 (딱 = 빛살 5 위로 −60°~+60°, 좋아 = 빛살 3 −40°·0°·+40°, 됐어 = 작은 고리)
    const mx = G.mark_w / 2;
    g.lineCap = 'round';
    if (ro.grade === 'pass') {
      g.beginPath(); g.arc(mx, ny, JR.mark.ring * F, 0, TAU);
      g.strokeStyle = C.outline; g.lineWidth = JR.mark.ringW * F + ow; g.stroke(); g.strokeStyle = col; g.lineWidth = JR.mark.ringW * F; g.stroke();
    } else {
      const angs = ro.grade === 'perfect' ? JR.mark.five : JR.mark.three, by = ny + JR.mark.base * F, L0 = JR.mark.r0 * F, L1 = L0 + JR.mark.len * F, w = Math.max(JR.mark.w[0], JR.mark.w[1] * F);
      g.beginPath();
      for (const a of angs) { const dx = dirX(a), dy = dirY(a); g.moveTo(mx + dx * L0, by + dy * L0); g.lineTo(mx + dx * L1, by + dy * L1); }
      g.strokeStyle = C.outline; g.lineWidth = w + ow; g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.stroke();
    }
    // 글 (이름 위, % 아래 — 한 줄로 붙이지 않음, 10-lore R3-12-2)
    g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = ow; g.strokeStyle = C.outline; g.fillStyle = col;
    g.font = this._font(F); g.strokeText(ro.name, tx, ny); g.fillText(ro.name, tx, ny);
    if (ro.pct != null) { const t = ro.pctText || (ro.pctText = ro.pct + '%'); g.font = this._font(P); g.strokeText(t, tx, py); g.fillText(t, tx, py); }
    g.restore();
  }
  _font(px) { const m = this._fonts || (this._fonts = new Map()); let f = m.get(px); if (!f) { f = '700 ' + px + 'px ' + this.art.fontFamily; m.set(px, f); } return f; }

  _ring(x, y, r, color) { const g = this.g; g.strokeStyle = color; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }

  // 판정 이펙트 (16-3): 딱 1.2배 + 왼쪽 부채꼴 빛살 5(노랑) / 좋아 1.1배 + 빛살 3(크림) / 통과 0.35배 작은 점 + 고리 0.9 r(회백)
  _fx(x, y, j, V) {
    const f = this.art.fx[j.grade], r = this.lay.star_r, g = this.g, C = this.C;
    const k = (V - j.V) / f.ms;
    if (k < 0 || k >= 1) return;
    if (j.grade === 'pass') {
      const s = lerp(1, f.scale, easeOut(Math.min(1, k * 2)));
      this.star(x, y, r, s, C.trackEdge);
      this._ring(x, y, r * f.ring, C.trackEdge);
      return;
    }
    const sc = k < 0.6 ? lerp(1, f.scale, easeOut(k / 0.6)) : f.scale * (1 - (k - 0.6) / 0.4);
    this.star(x, y, r, sc);
    const rw = Math.max(f.rayW[0], f.rayW[1] * r) * (1 - k * 0.5);
    g.strokeStyle = j.grade === 'perfect' ? C.star : C.hud; g.lineWidth = rw; g.lineCap = 'round';
    for (const deg of f.angles) {
      const r0 = r * sc + f.rayGap, r1 = r0 + f.rayLen * r, dx = dirX(deg), dy = dirY(deg);
      g.beginPath(); g.moveTo(x + dx * r0, y + dy * r0); g.lineTo(x + dx * r1, y + dy * r1); g.stroke();
    }
  }

  // 놓친 별: 회색 두 조각이 ±20° 돌며 0.15 d 아래로 (0.3 s), 0.88 s 부터 0.1 s 동안 작아짐
  _broken(x, y, d, RG) {
    const m = this.art.fx.miss, g = this.g, r = this.lay.star_r;
    const k = clamp01(d / m.ms);
    const shrink = d >= RG ? 1 - clamp01((d - RG) / (this.art.fail.pieceShrinkS * 1000)) : 1;
    if (shrink <= 0) return;
    for (const s of [-1, 1]) {
      g.save();
      g.translate(x + s * r * 0.25 * k, y + m.drop * this.lay.star_d * easeOut(k));
      g.rotate((s * m.rotDeg * k * Math.PI) / 180);
      g.scale(shrink, shrink);
      g.beginPath(); g.rect(s < 0 ? -r * 1.2 : 0, -r * 1.2, r * 1.2, r * 2.4); g.clip();
      starPath(g, 0, 0, r, this.art.star.inner);
      g.fillStyle = this.C.broken; g.fill(); g.strokeStyle = this.C.outline; g.lineWidth = 2.5; g.stroke();
      g.restore();
    }
  }

  // 보정 화면 (30-art 10절 그대로, 박에 맞춰 움직이지 않음): 가운데 북 + 점 8개
  calib(th, V, cs) {
    const cl = this.lay.calib, c = this.art.calib, g = this.g, C = this.C;
    this.bg(th);
    this.thumbRest(th);
    const s = cl.R / c.refR, r = c.drumR * s;
    g.beginPath(); g.arc(cl.cx, cl.cy, r, 0, TAU); g.fillStyle = th.drum; g.fill(); g.strokeStyle = C.outline; g.lineWidth = c.drumOutline; g.stroke();
    g.save(); g.globalAlpha = this.A.drum_inner_ring_hud; g.strokeStyle = C.hud; g.lineWidth = 2; g.beginPath(); g.arc(cl.cx, cl.cy, r * c.innerK, 0, TAU); g.stroke(); g.restore();
    for (const rp of this.ripples) {
      const k = (V - rp.V) / rp.ms;
      if (k < 0 || k > 1) continue;
      g.strokeStyle = C.trackEdge; g.lineWidth = 3 * (1 - k) + 0.5;
      g.beginPath(); g.arc(cl.cx, cl.cy, r * lerp(1, rp.scale, easeOut(k)), 0, TAU); g.stroke();
    }
    const dr = Math.max(8, c.dotR * s);
    for (let k = 0; k < c.dots; k++) {
      const a = (k / c.dots) * TAU - Math.PI / 2;
      const x = cl.cx + Math.cos(a) * c.dotsR * s, y = cl.cy + Math.sin(a) * c.dotsR * s;
      const sc = cs.emptyK != null ? 1 - cs.emptyK : 1;
      g.beginPath(); g.arc(x, y, dr * sc, 0, TAU);
      if (k < cs.filled) { g.fillStyle = C.hud; g.fill(); g.strokeStyle = C.outline; g.lineWidth = 2; g.stroke(); }
      else { g.strokeStyle = C.trackEdge; g.lineWidth = 2; g.stroke(); }
    }
    if (cs.checkK > 0) {
      const k = clamp01(cs.checkK), rr = r * 0.5 * k;
      g.strokeStyle = C.hud; g.lineWidth = Math.max(6, rr * 0.28); g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(cl.cx - rr, cl.cy); g.lineTo(cl.cx - rr * 0.25, cl.cy + rr * 0.7); g.lineTo(cl.cx + rr, cl.cy - rr * 0.6); g.stroke();
    }
    if (cs.hand && cl.hand) this.hand(cl.hand.x, cl.hand.y, cl.hand.size, 0, cl.hand.size);
  }

  menuBg(th) { this.bg(th); }

  // 타이틀 (16-9 4-6 대체): 플레이 화면 구성 그대로(길·판정 북·판정 선·공, 별 없음), 공은 title_bpm 으로 착지. V = 게임 시계
  title(th, V) {
    this.drawLayer(th);
    this.road(th.track1);
    this.drum(th, V);
    this.judgeLine();
    const beat = 60000 / this.art.title.bpm;
    this.ball(this.bounceY((((V % beat) + beat) % beat) / beat));
  }
}
