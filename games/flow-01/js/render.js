// 판 그리기(캔버스) 도우미. layout.json render 규칙(r2): 바탕은 CSS 한 번, 판·장식은 레벨 시작 때 오프스크린 1장,
// 점·표지·빛 번짐·판정 이름은 미리 그린 비트맵 → 매 프레임 drawImage·transform 만(strokeText·shadowBlur·그라디언트 fillRect 없음).

export function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
export const ease = {
  out: (u) => 1 - Math.pow(1 - u, 3),
  inout: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  bump: (u) => Math.sin(Math.PI * Math.min(1, Math.max(0, u))),
  spring: (u) => { u = Math.min(1, Math.max(0, u)); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
};
export const clamp01 = (u) => Math.max(0, Math.min(1, u));

export function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}
export function offscreen(w, h, dpr) {
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * dpr)); c.height = Math.max(1, Math.ceil(h * dpr));
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); return [c, x];
}

// 판 카드 + 타일 + 구멍(layout.json hole_rule) + 바탕 장식(판 뒤). 경계선이 구멍 둘레를 따라가도록
// 바깥(판⊕e − 구멍⊖e)에 선 색, 안(판⊖e − 구멍⊕e)에 판 색을 겹침. 결과 = 판 둘레 margin 만큼 큰 비트맵 1장.
export function buildBoardCache(S, dpr, decor) {
  const { L, lv, P, C, pz } = S;
  const b = L.board, cell = L.cell, e = 0.75, pad = Math.ceil(cell * 0.6);
  const ox = b.x - pad, oy = b.y - pad, W = b.w + 2 * pad, H = b.h + 2 * pad;
  const mk = () => { const [c, x] = offscreen(W, H, dpr); x.translate(-ox, -oy); return [c, x]; };
  const holeRects = (grow) => (lv.holes || []).map(([hx, hy]) => {
    const ins = 0.02 * cell, ext = (P.board_pad_of_cell + P.tile_r_of_cell) * cell;
    let x0 = L.grid.x + hx * cell + ins, y0 = L.grid.y + hy * cell + ins, x1 = L.grid.x + (hx + 1) * cell - ins, y1 = L.grid.y + (hy + 1) * cell - ins;
    if (hx === 0) x0 -= ext; if (hy === 0) y0 -= ext; if (hx === lv.width - 1) x1 += ext; if (hy === lv.height - 1) y1 += ext;
    return [x0 - grow, y0 - grow, x1 - x0 + 2 * grow, y1 - y0 + 2 * grow, Math.max(0, P.tile_r_of_cell * cell + grow)];
  });
  const br = P.board_r_of_cell * cell;
  const [edgeC, ex] = mk();
  ex.fillStyle = C.boardEdge; ex.beginPath(); rrect(ex, b.x - e, b.y - e, b.w + 2 * e, b.h + 2 * e, br + e); ex.fill();
  ex.globalCompositeOperation = 'destination-out';
  for (const r of holeRects(-e)) { ex.beginPath(); rrect(ex, ...r); ex.fill(); }
  const [faceC, fx] = mk();
  fx.fillStyle = C.board; fx.beginPath(); rrect(fx, b.x + e, b.y + e, b.w - 2 * e, b.h - 2 * e, br - e); fx.fill();
  fx.globalCompositeOperation = 'destination-out';
  for (const r of holeRects(e)) { fx.beginPath(); rrect(fx, ...r); fx.fill(); }
  fx.globalCompositeOperation = 'source-over';
  const ins = P.tile_inset_of_cell * cell, tr = P.tile_r_of_cell * cell;
  for (let y = 0; y < lv.height; y++) for (let x = 0; x < lv.width; x++) {
    if (pz.hole[y * lv.width + x]) continue;
    const X = L.grid.x + x * cell, Y = L.grid.y + y * cell;
    fx.fillStyle = C.tile; fx.beginPath(); rrect(fx, X + ins, Y + ins, cell - 2 * ins, cell - 2 * ins, tr); fx.fill();
    fx.fillStyle = C.tileDot; fx.beginPath(); fx.arc(X + cell / 2, Y + cell / 2, (P.tile_dot_of_cell * cell) / 2, 0, 7); fx.fill();
  }
  const [out, o] = mk();
  if (decor) decor(o);
  o.save(); o.setTransform(1, 0, 0, 1, 0, 0);
  // 그림자: 흐림 대신 아래로 2 px 옮긴 외곽 한 겹(투명도 0.08) — shadowBlur 비용 없음(render 규칙)
  o.save(); o.globalAlpha = 0.08; o.filter = 'none'; o.drawImage(edgeC, 0, 2 * dpr); o.drawImage(edgeC, 0, 3 * dpr); o.restore(); o.drawImage(edgeC, 0, 0);
  o.drawImage(faceC, 0, 0); o.restore();
  return { canvas: out, x: ox, y: oy, w: W, h: H };
}

// 점(쌍 색 원 + 흰 표지) 비트맵. 지름 d(px) 기준, 여유 1.4배(튐용)
export function dotSprite(col, path2d, d, markR, strokeUnit, white, dpr) {
  const S = Math.ceil(d * 1.4), [c, x] = offscreen(S, S, dpr);
  x.translate(S / 2, S / 2);
  x.fillStyle = col.hex; x.beginPath(); x.arc(0, 0, d / 2, 0, 7); x.fill();
  x.save(); x.scale(markR, markR); x.fillStyle = white; x.strokeStyle = white; x.lineWidth = strokeUnit; x.lineJoin = 'round'; x.fill(path2d); x.stroke(path2d); x.restore();
  return { c, s: S };
}
export function markSprite(path2d, size, strokeUnit, color, alpha, dpr) {
  const S = Math.ceil(size * 1.2), [c, x] = offscreen(S, S, dpr);
  x.translate(S / 2, S / 2); x.globalAlpha = alpha; x.scale(size / 2, size / 2);
  x.fillStyle = color; x.strokeStyle = color; x.lineWidth = strokeUnit; x.lineJoin = 'round'; x.fill(path2d); x.stroke(path2d);
  return { c, s: S };
}
export function glowSprite(hex, r, dpr) {
  const S = Math.ceil(r * 2), [c, x] = offscreen(S, S, dpr);
  const [R, G, B] = hexToRgb(hex), g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, r);
  g.addColorStop(0, `rgba(${R},${G},${B},1)`); g.addColorStop(1, `rgba(${R},${G},${B},0)`);
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  return { c, s: S };
}
export function circleSprite(hex, r, dpr) {
  const S = Math.ceil(r * 2 + 2), [c, x] = offscreen(S, S, dpr);
  x.fillStyle = hex; x.beginPath(); x.arc(S / 2, S / 2, r, 0, 7); x.fill();
  return { c, s: S };
}
// 판정 이름 비트맵(흰 테두리 포함, 1단은 위에 작은 별). 레벨 시작 때 등급 × 쌍 색으로 한 번만.
export function textSprite(text, px, font, fill, white, dpr, star) {
  const [m] = offscreen(1, 1, 1); const mc = m.getContext('2d'); mc.font = `800 ${px}px ${font}`;
  const tw = Math.ceil(mc.measureText(text).width) + 12, starH = star ? Math.ceil(star.px * 0.9) : 0, th = Math.ceil(px * 1.3) + starH;
  const [c, x] = offscreen(tw, th, dpr);
  x.font = `800 ${px}px ${font}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  const ty = starH + px * 0.65;
  x.lineWidth = 6; x.strokeStyle = white; x.strokeText(text, tw / 2, ty); x.fillStyle = fill; x.fillText(text, tw / 2, ty);
  if (star) { x.save(); x.translate(tw / 2, star.px / 2); x.scale(star.px / 2, star.px / 2); x.fillStyle = star.fill; x.strokeStyle = star.edge; x.lineWidth = 0.12; x.lineJoin = 'round'; x.fill(star.path); x.stroke(star.path); x.restore(); }
  return { c, w: tw, h: th, starH };
}

// 폴리라인의 [a, b] 구간(0~1, 길이 비율)
export function subPolyline(pts, a, b) {
  const seg = []; let tot = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
  if (!tot) return pts.slice(0, 1);
  const A = a * tot, B = b * tot, out = []; let acc = 0;
  const at = (i, d) => { const u = seg[i] ? d / seg[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]; };
  for (let i = 0; i < seg.length; i++) {
    const s0 = acc, s1 = acc + seg[i];
    if (s1 >= A && s0 <= B) {
      if (!out.length) out.push(at(i, Math.max(0, A - s0)));
      if (s1 <= B) out.push(pts[i + 1]); else { out.push(at(i, B - s0)); break; }
    }
    acc = s1;
  }
  return out;
}
export function strokePoly(ctx, pts, w, color, alpha = 1) {
  if (pts.length < 1) return;
  ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 1) ctx.lineTo(pts[0][0] + 0.01, pts[0][1]); else for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke(); ctx.globalAlpha = 1;
}

// 미니 판 SVG(지도 완료 노드·결과 화면). 선 + 칠한 칸, 점 생략. 둘레 구멍은 판 외곽선을 파냄(r2 S23).
// colOf(c) → 그 쌍 색(slot 돌려쓰기 반영), opts.bg = 구멍으로 보이는 바탕색
export function miniBoardSVG(lv, paths, size, pal, colOf, opts = {}) {
  const C = pal.common, n = Math.max(lv.width, lv.height), pad = size * 0.06;
  const cell = (size - 2 * pad) / n, ox = pad + ((n - lv.width) * cell) / 2, oy = pad + ((n - lv.height) * cell) / 2;
  const hole = new Set((lv.holes || []).map(([x, y]) => y * lv.width + x));
  const own = new Map();
  paths.forEach((p, c) => p.forEach((i) => own.set(i, c)));
  const f = (v) => v.toFixed(2), bp = pad * 0.5;
  const bx = ox - bp, by = oy - bp, bw = lv.width * cell + 2 * bp, bh = lv.height * cell + 2 * bp;
  const id = 'mb' + Math.random().toString(36).slice(2, 8);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><clipPath id="${id}"><rect x="${f(bx - 1)}" y="${f(by - 1)}" width="${f(bw + 2)}" height="${f(bh + 2)}" rx="${f(cell * 0.3)}"/></clipPath></defs>`;
  s += `<rect x="${f(bx)}" y="${f(by)}" width="${f(bw)}" height="${f(bh)}" rx="${f(cell * 0.3)}" fill="${C.board}" stroke="${C.boardEdge}" stroke-width="1.5"/>`;
  let holes = '';
  for (let y = 0; y < lv.height; y++) for (let x = 0; x < lv.width; x++) {
    const i = y * lv.width + x;
    if (hole.has(i)) {
      let x0 = ox + x * cell + cell * 0.02, y0 = oy + y * cell + cell * 0.02, x1 = ox + (x + 1) * cell - cell * 0.02, y1 = oy + (y + 1) * cell - cell * 0.02;
      if (x === 0) x0 -= bp + 3; if (y === 0) y0 -= bp + 3; if (x === lv.width - 1) x1 += bp + 3; if (y === lv.height - 1) y1 += bp + 3;
      holes += `<rect x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}" rx="${f(cell * 0.22)}" fill="${opts.bg || C.tile}" stroke="${C.boardEdge}" stroke-width="1.5"/>`;
      continue;
    }
    const c = own.get(i);
    s += `<rect x="${f(ox + x * cell + cell * 0.05)}" y="${f(oy + y * cell + cell * 0.05)}" width="${f(cell * 0.9)}" height="${f(cell * 0.9)}" rx="${f(cell * 0.22)}" fill="${c == null ? C.tile : colOf(c).tint}"/>`;
  }
  if (holes) s += `<g clip-path="url(#${id})">${holes}</g>`;
  paths.forEach((p, c) => {
    if (p.length < 2) return;
    const pts = p.map((i) => `${f(ox + ((i % lv.width) + 0.5) * cell)},${f(oy + (((i / lv.width) | 0) + 0.5) * cell)}`).join(' ');
    s += `<polyline points="${pts}" fill="none" stroke="${colOf(c).hex}" stroke-width="${f(cell * (opts.lineW || 0.48))}" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  return s + '</svg>';
}

// SVG 글 → 미리 디코드한 <img>(Blob URL). 같은 글이면 같은 img 를 다시 씀(render.svg_raster)
const imgCache = new Map();
export function svgImg(svg) {
  let e = imgCache.get(svg);
  if (!e) {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image(); img.decoding = 'async'; img.src = url; img.alt = ''; img.draggable = false;
    e = { img, ready: img.decode().catch(() => {}) };
    imgCache.set(svg, e);
  }
  return e;
}
// 같은 그림을 여러 곳에 쓸 때는 디코드된 img 를 복제(복제본은 이미 디코드된 캐시를 씀)
export function svgImgEl(svg, cls = '') { const e = svgImg(svg); const im = e.img.cloneNode(); if (cls) im.className = cls; im.setAttribute('aria-hidden', 'true'); return im; }

// SVG → 미리 그린 비트맵(오프스크린 캔버스, 크기 × dpr). 화면에는 <canvas> 에 drawImage 만 → 전환 프레임에서 SVG 첫 래스터 없음(r2 핫픽스).
// 래스터는 유휴 줄(idle)에서 한 프레임에 하나씩만(한 번에 몰아 긴 프레임을 만들지 않음). 아직 안 됐으면 <img> 로 대신 보임.
const idleQ = []; let idleBusy = () => false, idleOn = false;
export function setIdleGate(fn) { idleBusy = fn; }
// 진짜 유휴일 때만: requestIdleCallback 의 남은 시간이 넉넉할 때(≥ 12 ms) 한 번에 일 하나, 드래그·전환·연출 중이면 쉼(r2 성능 수정)
const ric = window.requestIdleCallback ? (f) => window.requestIdleCallback(f, { timeout: 4000 }) : (f) => setTimeout(() => f({ timeRemaining: () => 0, didTimeout: true }), 200);
export function idleLate(fn, ms) { setTimeout(() => idle(fn), ms); }
export function idle(fn) { idleQ.push(fn); if (!idleOn) { idleOn = true; ric(pump); } }
function pump(dl) {
  if (!idleQ.length) { idleOn = false; return; }
  if (!idleBusy() && dl.timeRemaining() >= 12) { try { idleQ.shift()(); } catch (e) { console.error(e); } }
  ric(pump);
}
const bmpCache = new Map();
export function svgBitmap(svg, w, h, dpr) {
  const key = `${w}x${h}@${dpr}|${svg}`;
  let e = bmpCache.get(key);
  if (!e) {
    e = { c: null, wait: [] };
    bmpCache.set(key, e);
    svgImg(svg).ready.then(() => idle(() => { const [c, x] = offscreen(w, h, dpr); x.drawImage(svgImg(svg).img, 0, 0, w, h); e.c = c; for (const f of e.wait) f(); e.wait = []; }));
  }
  return e;
}
// 디코드가 끝난 SVG 를 지금 바로 비트맵으로(불러오기 화면에서만 씀)
export function prebakeBitmap(svg, w, h, dpr) {
  const e = svgBitmap(svg, w, h, dpr); if (e.c) return e;
  const [c, x] = offscreen(w, h, dpr); x.drawImage(svgImg(svg).img, 0, 0, w, h); e.c = c; return e;
}
// 비트맵이 있으면 <canvas>, 아직이면 디코드된 <img> 복제(합성기 래스터)
export function bitmapEl(svg, w, h, dpr) {
  const e = svgBitmap(svg, w, h, dpr);
  if (!e.c) { const im = svgImgEl(svg); im.style.width = w + 'px'; im.style.height = h + 'px'; return im; }
  const cv = document.createElement('canvas'); cv.width = e.c.width; cv.height = e.c.height; cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.setAttribute('aria-hidden', 'true');
  cv.getContext('2d').drawImage(e.c, 0, 0);
  return cv;
}
