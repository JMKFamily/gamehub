// Scene 1 aggregate over jumps.mjs JSON outputs: clean single jumps on flat ground.
// Usage: node scene1.mjs <arcs.json>...
import fs from 'node:fs';
import { stats, fmt } from './lib.mjs';
let a = [];
for (const f of process.argv.slice(2)) a = a.concat(JSON.parse(fs.readFileSync(f, 'utf8')).filter(x => x.clean && x.idxFrames <= 32 && x.fitAir && x.fitAir < 0.5)); // drop merged double arcs
const h = {}; for (const x of a) h[x.idxFrames] = (h[x.idxFrames] || 0) + 1;
console.log('clean arcs', a.length, 'airtime frame-count histogram', JSON.stringify(h));
console.log('apex height (blk)', fmt(stats(a.map(x => x.height)), 3));
const m = a.filter(x => x.idxFrames === 26);
console.log('pts duration, 26-frame arcs (s)', fmt(stats(m.map(x => x.air + x.dt)), 4));
console.log('pts duration, all arcs (s)', fmt(stats(a.map(x => x.air + x.dt)), 4));
const fa = a.filter(x => x.fitAir);
console.log('parabola fit: airtime (s)', fmt(stats(fa.map(x => x.fitAir)), 4), '| g (blk/s^2)', fmt(stats(fa.map(x => x.g)), 1), '| v0 (blk/s)', fmt(stats(fa.map(x => x.v0)), 2));
console.log('apex time from takeoff (frames)', fmt(stats(a.map(x => x.apexT * 60)), 2));
