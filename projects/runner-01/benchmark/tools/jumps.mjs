// Jump arcs: takeoff -> landing on ground. Height, airtime, distance, spike distance at takeoff, outcome.
// Usage: node jumps.mjs <csv> [--json out.json]
import fs from 'node:fs';
import { load, intact, groundSpikes, BLOCK, stats, fmt } from './lib.mjs';
const fr = load(process.argv[2]);
// ground level = most common centroid y of an upright (unrotated) intact body
const hist = {}; for (const f of fr) if (intact(f) && f.pw <= 78 && f.ph <= 78 && f.pcy > 560) { const k = Math.round(f.pcy); hist[k] = (hist[k] || 0) + 1; }
const GROUND_CY = +Object.entries(hist).sort((a, b) => b[1] - a[1])[0][0];
console.log('ground centroid y =', GROUND_CY);
const SPEED = 10.414; // blocks/s, measured in scene 3
const GY_ = GROUND_CY;
function regap(j) { let k = j; while (k < fr.length && onGround(fr[k])) k++; return k < fr.length && airborne(fr[k]) ? k - j - 1 : null; }
const onGround = f => intact(f) && Math.abs(f.pcy - GROUND_CY) <= 2.5;
const airborne = f => intact(f) && f.pcy < GROUND_CY - 2.5;
const arcs = [];
for (let i = 1; i < fr.length; i++) {
  if (!(onGround(fr[i - 1]) && airborne(fr[i]))) continue;
  const t0 = (fr[i - 1].t + fr[i].t) / 2; // takeoff between frames
  let j = i, minY = fr[i].pcy, died = false, minT = fr[i].t; const air = [];
  while (j < fr.length && !onGround(fr[j])) {
    const f = fr[j];
    if (!intact(f)) { if (f.pg > 1000) { died = true; } break; }
    air.push([f.t, f.pcy]);
    if (f.pcy < minY) { minY = f.pcy; minT = f.t; }
    j++;
  }
  const landed = j < fr.length && onGround(fr[j]) && !died;
  const t1 = landed ? (fr[j - 1].t + fr[j].t) / 2 : null;
  // spike ahead at takeoff (centre to centre, blocks)
  const sp = groundSpikes(fr[i - 1]).filter(s => s.x > fr[i - 1].pcx - 20).sort((a, b) => a.x - b.x)[0];
  const spikeDist = sp ? (sp.x - fr[i - 1].pcx) / BLOCK : null;
  // did the attempt die before the player passed that spike?
  let diedSoon = died;
  if (!died && sp) {
    for (let k = j; k < fr.length && fr[k].t < t0 + 0.8; k++) if (!intact(fr[k]) && fr[k].pg > 1000) { diedSoon = true; break; }
  }
  const q = air.length >= 6 ? quad(air) : null; // y = A t^2 + B t + C (px, s)
  let fitAir = null, g = null, v0 = null, fitH = null;
  if (q && q.A > 0) {
    const disc = q.B * q.B - 4 * q.A * (q.C - GROUND_CY);
    if (disc > 0) { const r1 = (-q.B - Math.sqrt(disc)) / (2 * q.A), r2 = (-q.B + Math.sqrt(disc)) / (2 * q.A); fitAir = r2 - r1;
      g = 2 * q.A / BLOCK; v0 = g * fitAir / 2; fitH = (GROUND_CY - (q.C - q.B * q.B / (4 * q.A))) / BLOCK; }
  }
  arcs.push({ fitAir: fitAir && +fitAir.toFixed(4), fitFrames60: fitAir && +(fitAir*60).toFixed(2), g: g && +g.toFixed(1), v0: v0 && +v0.toFixed(2), fitH: fitH && +fitH.toFixed(3), nAir: air.length,
    t0: +t0.toFixed(4), landed, air: landed ? +(t1 - t0).toFixed(4) : null,
    airFrames60: landed ? +((t1 - t0) * 60).toFixed(1) : null,
    height: +((GROUND_CY - minY) / BLOCK).toFixed(3), apexT: +(minT - t0).toFixed(4),
    dist: landed ? +((t1 - t0) * SPEED).toFixed(3) : null,
    spikeDist: spikeDist === null ? null : +spikeDist.toFixed(3), died: diedSoon,
    dt: +(fr[i].t - fr[i - 1].t).toFixed(4),
    idxFrames: landed ? j - (i - 1) : null,             // frame-index count: last ground frame -> first landed frame (physics is frame-locked)
    rejumpGap: landed ? regap(j) : null,                // ground frames before the next takeoff (0 = took off on the landing frame)
    clean: landed && !died && air.length >= 20 && minY < GY_ - 150 && (fr[i].pcy < GROUND_CY - 15),
  });
  i = j;
}
for (const a of arcs) console.log(JSON.stringify(a));
const flat = arcs.filter(a => a.landed);
if (flat.length) {
  console.log('landed arcs', flat.length);
  console.log('height (blk)', fmt(stats(flat.map(a => a.height)), 3));
  console.log('airtime (s)', fmt(stats(flat.map(a => a.air)), 4));
  console.log('airtime (frames@60)', fmt(stats(flat.map(a => a.airFrames60)), 2));
  console.log('distance (blk)', fmt(stats(flat.map(a => a.dist)), 3));
}
const out = process.argv.indexOf('--json');
if (out > 0) fs.writeFileSync(process.argv[out + 1], JSON.stringify(arcs, null, 1));

function quad(pts) { // least squares y = A t^2 + B t + C, t shifted for stability
  const t0 = pts[0][0]; let S = [0,0,0,0,0], T = [0,0,0];
  for (const [t, y] of pts) { const x = t - t0; const p = [1, x, x*x, x*x*x, x*x*x*x]; for (let k = 0; k < 5; k++) S[k] += p[k]; T[0] += y; T[1] += x*y; T[2] += x*x*y; }
  const M = [[S[4],S[3],S[2],T[2]],[S[3],S[2],S[1],T[1]],[S[2],S[1],S[0],T[0]]];
  for (let c = 0; c < 3; c++) { for (let r = c+1; r < 3; r++) { const f = M[r][c]/M[c][c]; for (let k = c; k < 4; k++) M[r][k] -= f*M[c][k]; } }
  const C2 = M[2][3]/M[2][2]; const B2 = (M[1][3]-M[1][2]*C2)/M[1][1]; const A = (M[0][3]-M[0][2]*C2-M[0][1]*B2)/M[0][0];
  // un-shift: y = A (t-t0)^2 + B2 (t-t0) + C2
  return { A, B: B2 - 2*A*t0, C: A*t0*t0 - B2*t0 + C2 };
}
const good = arcs.filter(a => a.fitAir && a.fitH > 2 && a.nAir >= 15);
if (good.length) {
  console.log("parabola-fit arcs", good.length);
  console.log("fit height (blk)", fmt(stats(good.map(a => a.fitH)), 3));
  console.log("fit airtime (s)", fmt(stats(good.map(a => a.fitAir)), 4));
  console.log("fit airtime (frames@60)", fmt(stats(good.map(a => a.fitFrames60)), 2));
  console.log("fit distance (blk)", fmt(stats(good.map(a => a.fitAir * SPEED)), 3));
  console.log("gravity (blk/s^2)", fmt(stats(good.map(a => a.g)), 1));
  console.log("v0 (blk/s)", fmt(stats(good.map(a => a.v0)), 2));
}

const clean = arcs.filter(a => a.clean);
if (clean.length) {
  console.log('CLEAN arcs (takeoff+landing on flat ground, no death, >=20 airborne frames):', clean.length);
  console.log('  raw apex height (blk)', fmt(stats(clean.map(a => a.height)), 3));
  console.log('  airtime frame count', fmt(stats(clean.map(a => a.idxFrames)), 2), ' -> s @60fps', (stats(clean.map(a => a.idxFrames)).mean / 60).toFixed(4));
  console.log('  apex time from takeoff (s, pts)', fmt(stats(clean.map(a => a.apexT)), 4));
  const fa = clean.filter(a => a.fitAir);
  console.log('  fit airtime (s)', fmt(stats(fa.map(a => a.fitAir)), 4), ' fit g', fmt(stats(fa.map(a => a.g)), 1), ' fit v0', fmt(stats(fa.map(a => a.v0)), 2), ' fit H', fmt(stats(fa.map(a => a.fitH)), 3));
  console.log('  distance = frames/60 * 10.414 (blk)', fmt(stats(clean.map(a => a.idxFrames / 60 * SPEED)), 3));
}
