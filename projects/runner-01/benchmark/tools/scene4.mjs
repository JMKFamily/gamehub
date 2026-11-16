// Scene 4: first-spike clearance vs takeoff distance, plus death->restart times.
// Usage: node scene4.mjs <csv>... [--json out.json]
// The first ground spike of each attempt is tracked on screen (camera follows the player at x≈589),
// its centre x(t) is fitted with a straight line over frames where it is fully visible and clear of the player,
// and every distance is taken from that line at the needed instant (sub-frame).
import fs from 'node:fs';
import { load, attempts, intact, groundSpikes, BLOCK, stats, fmt, fit, refineDeath } from './lib.mjs';
const G = 90, V0 = 20;                                  // blk/s^2, blk/s (scene 1 fit) for sub-frame takeoff time
const args = process.argv.slice(2); const jo = args.indexOf('--json');
const files = args.filter((a, i) => !a.startsWith('--') && i !== jo + 1 || jo < 0 && !a.startsWith('--'));
const rows = [];
for (const file of files) {
  const fr = load(file);
  const hist = {}; for (const f of fr) if (intact(f) && f.pw <= 78 && f.ph <= 78 && f.pcy > 560) { const k = Math.round(f.pcy); hist[k] = (hist[k] || 0) + 1; }
  const GY = +Object.entries(hist).sort((a, b) => b[1] - a[1])[0][0];
  const onGround = f => intact(f) && Math.abs(f.pcy - GY) <= 2.5;
  const atts = attempts(fr);
  atts.forEach((a, k) => {
    const F = a.frames;
    // first spike: fully on screen (x<1500), ahead of player body (x > pcx+70), first cluster only
    const pts = []; let lastX = null;
    for (const f of F) {
      if (!intact(f)) continue;
      const s = groundSpikes(f).filter(s => s.x > f.pcx + 70 && s.x < 1500).sort((p, q) => p.x - q.x)[0];
      if (!s) continue;
      if (lastX !== null && s.x > lastX + 20) break;      // jumped to a later spike -> stop
      pts.push([f.t, s.x]); lastX = s.x;
    }
    if (pts.length < 6) return;
    const L = fit(pts); const sx = t => L.a + L.b * t;   // spike centre on screen at time t
    const speed = -L.b / BLOCK;
    const tk = [];
    for (let i = 1; i < F.length; i++) {
      if (onGround(F[i - 1]) && intact(F[i]) && F[i].pcy < GY - 2.5 && GY - F[i].pcy > 0.15 * BLOCK) { // real jump: first airborne frame already ~0.3 blk up (death shatter frames move <0.07 blk)
        const h = (GY - F[i].pcy) / BLOCK;
        const tau = (V0 - Math.sqrt(Math.max(0, V0 * V0 - 2 * G * h))) / G;
        const t0 = F[i].t - tau;
        tk.push({ t0, d: (sx(t0) - F[i].pcx) / BLOCK });
      }
    }
    const before = tk.filter(j => j.d > -0.2);
    const last = before.at(-1) || null;
    const rd = refineDeath(a, GY); const li = rd ? rd.last : a.lastIntact;
    const deathRel = li ? (li.pcx - sx(li.t)) / BLOCK : null;  // player centre minus spike centre at last intact frame
    const passed = F.some(f => intact(f) && f.pcx - sx(f.t) > 1.2 * BLOCK);
    const deathAtSpike = !passed && !!a.dead && deathRel !== null && deathRel > -1.5 && deathRel < 1.2;
    rows.push({ file: file.split(/[\/]/).pop(), att: k + 1, start: +a.start.toFixed(3), spikeSpeed: +speed.toFixed(3), nPts: pts.length,
      d: last ? +last.d.toFixed(3) : null, tFromStart: last ? +(last.t0 - a.start).toFixed(3) : null,
      passed, deathAtSpike, deathRel: deathRel === null ? null : +deathRel.toFixed(3),
      deathHeight: li ? +((GY - li.pcy) / BLOCK).toFixed(3) : null,
      restart: rd && atts[k + 1] ? +(atts[k + 1].start - (rd.last.t + rd.first.t) / 2).toFixed(4) : null });
  });
}
for (const r of rows) console.log(JSON.stringify(r));
if (jo >= 0) fs.writeFileSync(args[jo + 1], JSON.stringify(rows, null, 1));
const rs = rows.filter(r => r.restart).map(r => r.restart);
if (rs.length) console.log('death->restart (s)', fmt(stats(rs), 3));
const ok = rows.filter(r => r.d !== null && r.passed).map(r => r.d).sort((a, b) => a - b);
const late = rows.filter(r => r.d !== null && r.deathAtSpike && r.d < 2.2).map(r => r.d).sort((a, b) => a - b);
const early = rows.filter(r => r.d !== null && r.deathAtSpike && r.d >= 2.2).map(r => r.d).sort((a, b) => a - b);
console.log('passed d:', ok.join(' '));
console.log('late-fail d:', late.join(' '));
console.log('early-fail d:', early.join(' '));
console.log('no-jump deaths deathRel:', rows.filter(r => r.d === null && r.deathAtSpike).map(r => r.deathRel).join(' '));
