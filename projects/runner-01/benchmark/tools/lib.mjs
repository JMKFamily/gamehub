import fs from 'node:fs';
export const BLOCK = 84; // px, player cube outer outline (1600x900 fullscreen)
export const GROUND_CY = 605.7; // player green-body centroid y when resting on ground

export function load(csv) {
  const lines = fs.readFileSync(csv, 'utf8').trim().split('\n').slice(1);
  return lines.map(l => {
    const [i, t, pg, pcx, pcy, pw, ph, spikes] = l.split(',');
    return {
      i: +i, t: +t, pg: +pg,
      pcx: pcx === '' ? null : +pcx, pcy: pcy === '' ? null : +pcy,
      pw: pw === '' ? null : +pw, ph: ph === '' ? null : +ph,
      spikes: (spikes || '').trim() ? spikes.trim().split(' ').map(s => { const [x, top] = s.split(':'); return { x: +x, top: +top }; }) : [],
    };
  });
}
// body intact: compact green square (rotated square bbox <= ~110px)
export const intact = f => f.pcx !== null && f.pw <= 112 && f.ph <= 112 && f.pg > 2500;
export const groundSpikes = f => f.spikes.filter(s => s.top >= 560 && s.top <= 570);

export function stats(a) {
  const n = a.length, m = a.reduce((s, v) => s + v, 0) / n;
  const sd = n > 1 ? Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1)) : 0;
  return { n, mean: m, sd, min: Math.min(...a), max: Math.max(...a) };
}
export const fmt = (s, d = 2) => `${s.mean.toFixed(d)} ± ${s.sd.toFixed(d)} (n=${s.n}, ${s.min.toFixed(d)}~${s.max.toFixed(d)})`;

// Split into attempts: a new attempt starts when an intact player appears at small x after a death gap.
export function attempts(fr) {
  const out = []; let cur = null; let gap = 0;
  for (const f of fr) {
    const ok = intact(f);
    if (ok && (cur === null || (cur.dead && gap >= 3))) {
      cur = { frames: [], start: f.t }; out.push(cur);
    }
    if (cur) cur.frames.push(f);
    if (cur && !ok && f.pg > 1000 && cur.frames.some(intact) && !cur.dead) {
      // death = first frame body breaks apart after being intact (and not at level edge)
      const prev = cur.frames.filter(intact).at(-1);
      if (prev && prev.pcx > 300) { cur.dead = f.t; cur.lastIntact = prev; }
    }
    gap = ok ? 0 : gap + 1;
  }
  return out;
}

// Linear fit x = a + b t
export function fit(pts) {
  const n = pts.length; let st = 0, sx = 0, stt = 0, stx = 0;
  for (const [t, x] of pts) { st += t; sx += x; stt += t * t; stx += t * x; }
  const b = (n * stx - st * sx) / (n * stt - st * st); return { a: (sx - b * st) / n, b };
}

// Refined death instant: the first frame where the body leaves a physically possible path.
// Shatter frames can still pass intact(), so this is earlier and sharper than the first non-intact frame.
// Game physics is frame-locked, so vertical motion is checked per frame index (pts jitter is ignored):
//  - screen x must stay in the camera-locked column (589 ± 4), body bbox <= 106 px (rotated 74 px square)
//  - ground -> ground: |dy| <= 3; ground -> air: first rise 15..35 px (a real takeoff)
//  - air -> air: change of per-frame velocity = gravity (2.1 px/frame^2 at 1600 scale) ± 5
// Returns { last: last good frame, first: first broken frame } or null.
export function refineDeath(att, groundY, acc = 2.1) {
  const F = att.frames; const endIdx = att.dead ? F.findIndex(f => f.t >= att.dead) : -1;
  if (endIdx < 0) return null;
  const near = f => Math.abs(f.pcy - groundY) <= 3;
  const fr = (a, b) => Math.max(1, b.i - a.i);   // frame index step (pts jitter of ±0.5 frame makes time-based counts unreliable)
  const good = [];
  for (let i = Math.max(0, endIdx - 45); i <= endIdx; i++) {
    const f = F[i];
    if (f.pg < 1000 && !good.length) continue;
    let bad = !intact(f) || Math.abs(f.pcx - 589) > 4 || f.pw > 106 || f.ph > 106;
    const p1 = good.at(-1), p0 = good.at(-2);
    if (!bad && p1) {
      const dy = (f.pcy - p1.pcy) / fr(p1, f);
      if (near(p1) && near(f)) bad = Math.abs(dy) > 3;
      else if (near(p1)) bad = !(dy <= -15 && dy >= -35);
      else if (p0 && !near(f)) { const dy0 = (p1.pcy - p0.pcy) / fr(p0, p1); bad = Math.abs(dy - dy0 - acc) > 7; }
    }
    if (bad) return good.length ? { last: good.at(-1), first: f } : null;
    good.push(f);
  }
  return { last: good.at(-1), first: F[endIdx] };
}
