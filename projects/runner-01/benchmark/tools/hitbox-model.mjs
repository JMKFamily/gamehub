// Spike clearance model: player = 1x1 box (centre x, bottom y), measured jump arc, constant speed.
// For a spike hitbox model, returns the window of takeoff distances d (spike centre - player centre at takeoff, blocks)
// that clear the spike. Compares a "visible triangle" hitbox with rectangle hitboxes (half-width w, height h).
// Usage: node hitbox-model.mjs
const V = 10.414, V0 = 19.82, G = 91.5;           // blk/s, blk/s, blk/s^2 (scene 1: H=2.145, T=0.433 s)
const T = 2 * V0 / G;
function collides(d, hit) {                       // hit(xRelLeft, xRelRight, y) -> true if bottom edge at y over span touches spike
  for (let t = 0; t <= T + 0.3; t += 1 / 2400) {
    const x = V * t;                              // player centre travel since takeoff
    const y = t < T ? V0 * t - G * t * t / 2 : 0; // bottom height (lands on flat ground)
    const rel = x - d;                            // player centre relative to spike centre
    if (hit(rel - 0.5, rel + 0.5, y)) return true;
    if (rel > 1.6) return false;
  }
  return false;
}
const tri = (B, Hh) => (l, r, y) => { // visible triangle: base B, height Hh
  const a = Math.max(l, -B / 2), b = Math.min(r, B / 2); if (a > b) return false;
  const s = (a <= 0 && b >= 0) ? 0 : Math.min(Math.abs(a), Math.abs(b));
  return y < Hh * (1 - s / (B / 2));
};
const rect = (w, h) => (l, r, y) => l < w && r > -w && y < h;
function windowOf(hit) {
  let lo = null, hi = null;
  for (let d = 0.3; d <= 5; d += 0.002) { const ok = !collides(d, hit); if (ok && lo === null) lo = d; if (ok) hi = d; }
  return { lo: +lo.toFixed(3), hi: +hi.toFixed(3), width: +(hi - lo).toFixed(3), seconds: +((hi - lo) / V).toFixed(3) };
}
console.log('visible triangle (base 0.95, height 0.92):', windowOf(tri(0.95, 0.92)));
for (const [w, h] of [[0.07, 0.55], [0.10, 0.50], [0.15, 0.41], [0.20, 0.33], [0.25, 0.24]]) console.log(`rect half-width ${w}, height ${h}:`, windowOf(rect(w, h)));
