// Scroll speed (no input) + death->restart time per attempt
import { load, attempts, intact, groundSpikes, fit, BLOCK, stats, fmt } from './lib.mjs';
const fr = load(process.argv[2]);
const atts = attempts(fr);
const speeds = [], restarts = [], deathGaps = [];
atts.forEach((a, k) => {
  // frames where camera follows (player screen x stable) and a ground spike is tracked
  const pts = [];
  for (const f of a.frames) {
    if (!intact(f) || Math.abs(f.pcx - 589) > 3) continue;
    const s = groundSpikes(f).filter(s => s.x > f.pcx + 60);
    if (s.length) pts.push([f.t, s[0].x]);
  }
  const line = pts.length >= 5 ? fit(pts) : null;
  const speed = line ? -line.b / BLOCK : null;
  const next = atts[k + 1];
  const rs = a.dead && next ? next.start - a.dead : null;
  const li = a.lastIntact;
  const gs = li ? groundSpikes(li).filter(s => s.x > li.pcx - 40) : [];
  const gapPx = gs.length ? gs[0].x - li.pcx : null; // spike centre minus player centre at last intact frame
  console.log(`attempt ${k + 1}: start=${a.start.toFixed(3)} death=${a.dead?.toFixed(3)} pts=${pts.length} speed=${speed?.toFixed(3)} b/s restart=${rs?.toFixed(3)} s lastIntactGap=${gapPx === null ? '-' : (gapPx / BLOCK).toFixed(3)} blk`);
  if (speed) speeds.push(speed);
  if (rs) restarts.push(rs);
  if (gapPx !== null) deathGaps.push(gapPx / BLOCK);
});
if (speeds.length) console.log('speed b/s', fmt(stats(speeds), 3));
if (restarts.length) console.log('death->restart s', fmt(stats(restarts), 3));
if (deathGaps.length) console.log('centre gap at last intact frame (blk)', fmt(stats(deathGaps), 3));
