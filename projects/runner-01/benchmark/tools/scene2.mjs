// Scene 2: hold -> automatic re-jump on landing.
// Works on the per-frame y sequence (frame index, physics is frame-locked): finds arcs between ground contacts,
// apex height (3-point parabola through the highest samples), contact-to-contact period, and whether the
// next jump started on the landing frame (0 resting frames) or from rest.
// Usage: node scene2.mjs <csv> [more csv...]
import { load, intact, stats, fmt, BLOCK } from './lib.mjs';
const res = { rest: [], rejump: [], period: [], restFrames: {} };
for (const file of process.argv.slice(2)) {
  const fr = load(file);
  const hist = {}; for (const f of fr) if (intact(f) && f.pw <= 78 && f.ph <= 78 && f.pcy > 560) { const k = Math.round(f.pcy); hist[k] = (hist[k] || 0) + 1; }
  const GY = +Object.entries(hist).sort((a, b) => b[1] - a[1])[0][0];
  // split into runs of consecutive intact frames with the body in the camera column
  const ok = f => intact(f) && Math.abs(f.pcx - 589) <= 4;
  let run = [];
  const flush = () => {
    if (run.length < 30) { run = []; return; }
    const y = run.map(f => f.pcy);
    // contacts: frames within 25 px of ground that are local maxima of y (lowest screen position)
    const contacts = [];
    for (let i = 1; i < y.length - 1; i++) if (y[i] > GY - 25 && y[i] >= y[i - 1] && y[i] >= y[i + 1]) {
      let rest = 0, k = i; while (k < y.length && Math.abs(y[k] - GY) <= 1.5) { rest++; k++; }
      contacts.push({ i, rest, end: k - 1 });
      i = Math.max(i, k - 1);
    }
    for (let c = 0; c + 1 < contacts.length; c++) {
      const a = contacts[c], b = contacts[c + 1];
      const seg = y.slice(a.end + 1, b.i);
      if (seg.length < 18) continue;
      let m = a.end + 1; for (let i = a.end + 1; i < b.i; i++) if (y[i] < y[m]) m = i;
      const y0 = y[m - 1], y1 = y[m], y2 = y[m + 1];
      if (y0 === undefined || y2 === undefined) continue;
      const den = y0 - 2 * y1 + y2; const apexY = den ? y1 - (y0 - y2) ** 2 / (8 * den) : y1;
      const H = (GY - apexY) / BLOCK;
      if (H < 1.5 || H > 2.6) continue;
      (a.rest >= 2 ? res.rest : res.rejump).push(H);
      res.restFrames[a.rest] = (res.restFrames[a.rest] || 0) + 1;
      if (a.rest <= 1) res.period.push(b.i - a.i);
    }
    run = [];
  };
  for (const f of fr) { if (ok(f)) run.push(f); else flush(); }
  flush();
}
console.log('resting frames at the contact before each jump (histogram):', JSON.stringify(res.restFrames));
if (res.rest.length) console.log('apex height, jump from rest (blk)', fmt(stats(res.rest), 3));
if (res.rejump.length) console.log('apex height, re-jump on landing frame (blk)', fmt(stats(res.rejump), 3));
if (res.period.length) console.log('contact-to-contact period of held re-jumps (frames)', fmt(stats(res.period), 2));
