// 판 그리기(캔버스). 판 카드·타일·구멍은 레벨을 열 때 한 번 미리 그려 둠(첫 프레임 비용 줄이기, insights 구현·성능).
// 색·크기는 모두 palette.json·layout.json 값(호출하는 쪽이 넘김).

export function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; }
export const ease = {
  out: (u) => 1 - Math.pow(1 - u, 3),
  inout: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  bump: (u) => Math.sin(Math.PI * Math.min(1, Math.max(0, u))), // 1 → 정점 → 1 (튐·숨 쉬기 모양)
};
export const clamp01 = (u) => Math.max(0, Math.min(1, u));

export function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}

// 판 카드 + 타일 + 구멍(layout.json hole_rule). 경계선(boardEdge 1.5 px)이 구멍 둘레를 따라가도록
// 바깥(판⊕e − 구멍⊖e)에 선 색, 안(판⊖e − 구멍⊕e)에 판 색을 겹침.
export function buildBoardCache(S, dpr) {
  const { L, lv, P, C } = S;
  const b = L.board, cell = L.cell, e = 0.75;
  const pad = 8; // 그림자 여유
  const W = Math.ceil((b.w + 2 * pad) * dpr), H = Math.ceil((b.h + 2 * pad) * dpr);
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, (pad - b.x) * dpr, (pad - b.y) * dpr); return [c, x]; };
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
  // 타일 + 가운데 점(칠할 곳)
  const ins = P.tile_inset_of_cell * cell, tr = P.tile_r_of_cell * cell;
  for (let y = 0; y < lv.height; y++) for (let x = 0; x < lv.width; x++) {
    if (S.pz.hole[y * lv.width + x]) continue;
    const X = L.grid.x + x * cell, Y = L.grid.y + y * cell;
    fx.fillStyle = C.tile; fx.beginPath(); rrect(fx, X + ins, Y + ins, cell - 2 * ins, cell - 2 * ins, tr); fx.fill();
    fx.fillStyle = C.tileDot; fx.beginPath(); fx.arc(X + cell / 2, Y + cell / 2, (P.tile_dot_of_cell * cell) / 2, 0, 7); fx.fill();
  }
  // 합치기 + 그림자(투명도 ≤ 0.10 흐림 1개)
  const [out, ox] = mk();
  ox.setTransform(1, 0, 0, 1, 0, 0);
  ox.save(); ox.shadowColor = 'rgba(38,43,64,0.08)'; ox.shadowBlur = 10 * dpr; ox.shadowOffsetY = 2 * dpr; ox.drawImage(edgeC, 0, 0); ox.restore();
  ox.drawImage(faceC, 0, 0);
  return { canvas: out, x: b.x - pad, y: b.y - pad, w: W / dpr, h: H / dpr };
}

export function drawMark(ctx, path2d, cx, cy, r, color, strokeUnit) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(r, r);
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = strokeUnit; ctx.lineJoin = 'round';
  ctx.fill(path2d); ctx.stroke(path2d); ctx.restore();
}

// 폴리라인의 [a, b] 구간(0~1, 길이 비율)만 그림 — 밝은 띠·되감기용
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
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 1) ctx.lineTo(pts[0][0] + 0.01, pts[0][1]); else for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke(); ctx.restore();
}

// 미니 판 SVG(지도 완료 노드·결과 화면). 정답(또는 끝난 판) 선 + 칠한 칸, 점 생략.
export function miniBoardSVG(lv, paths, size, pal, opts = {}) {
  const C = pal.common, n = Math.max(lv.width, lv.height), pad = size * 0.06;
  const cell = (size - 2 * pad) / n, ox = pad + ((n - lv.width) * cell) / 2, oy = pad + ((n - lv.height) * cell) / 2;
  const hole = new Set((lv.holes || []).map(([x, y]) => y * lv.width + x));
  const own = new Map();
  paths.forEach((p, c) => p.forEach((i) => own.set(i, c)));
  const col = (c) => pal.pairs[lv.pairs[c].color_slot];
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">`;
  const bw = lv.width * cell + 2 * pad * 0.5, bh = lv.height * cell + 2 * pad * 0.5;
  s += `<rect x="${(ox - pad * 0.5).toFixed(2)}" y="${(oy - pad * 0.5).toFixed(2)}" width="${bw.toFixed(2)}" height="${bh.toFixed(2)}" rx="${(cell * 0.3).toFixed(2)}" fill="${C.board}" stroke="${C.boardEdge}" stroke-width="1.5"/>`;
  for (let y = 0; y < lv.height; y++) for (let x = 0; x < lv.width; x++) {
    const i = y * lv.width + x; if (hole.has(i)) { s += `<rect x="${(ox + x * cell).toFixed(2)}" y="${(oy + y * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="${opts.holeFill || C.board}"/>`; continue; }
    const c = own.get(i);
    s += `<rect x="${(ox + x * cell + cell * 0.05).toFixed(2)}" y="${(oy + y * cell + cell * 0.05).toFixed(2)}" width="${(cell * 0.9).toFixed(2)}" height="${(cell * 0.9).toFixed(2)}" rx="${(cell * 0.22).toFixed(2)}" fill="${c == null ? C.tile : col(c).tint}"/>`;
  }
  paths.forEach((p, c) => {
    if (p.length < 2) return;
    const pts = p.map((i) => `${(ox + ((i % lv.width) + 0.5) * cell).toFixed(2)},${(oy + (((i / lv.width) | 0) + 0.5) * cell).toFixed(2)}`).join(' ');
    s += `<polyline points="${pts}" fill="none" stroke="${col(c).hex}" stroke-width="${(cell * 0.6).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  return s + '</svg>';
}
