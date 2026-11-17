// Usage: node burst-intervals.mjs <video.mp4> [x y w h] [thr]
// Practice-mode checkpoint loop: the player respawns at the checkpoint and dies in the same 1-2 frames,
// so death -> respawn delay ~= interval between successive death-burst onsets.
// Per frame (pts from showinfo, no dup/drop) counts bright pixels (R,G,B all > thr) inside the crop
// (800x450 recording coordinates) and reports burst onsets: first frame whose count rises above
// max(40, 4x running baseline) after at least 0.3 s below it.
import { spawn } from 'node:child_process';
import path from 'node:path';

const FF = path.join(process.env.LOCALAPPDATA,
  'Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe');
const [, , input, xs = '150', ys = '230', ws = '250', hs = '120', ts = '200'] = process.argv;
const [X, Y, W, H, THR] = [xs, ys, ws, hs, ts].map(Number);
const FRAME = W * H * 3;
const ff = spawn(FF, ['-v', 'info', '-i', input, '-fps_mode', 'passthrough',
  '-vf', `crop=${W}:${H}:${X}:${Y},showinfo`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
const times = []; let eb = '';
ff.stderr.on('data', d => { eb += d; let i; while ((i = eb.indexOf('\n')) >= 0) { const l = eb.slice(0, i); eb = eb.slice(i + 1);
  const m = l.match(/pts_time:\s*([\d.]+)/); if (m && l.includes('Parsed_showinfo')) times.push(+m[1]); } });
const counts = []; let buf = Buffer.alloc(0);
ff.stdout.on('data', d => { buf = Buffer.concat([buf, d]); while (buf.length >= FRAME) { const f = buf.subarray(0, FRAME);
  let c = 0; for (let p = 0; p < FRAME; p += 3) if (f[p] > THR && f[p + 1] > THR && f[p + 2] > THR) c++;
  counts.push(c); buf = buf.subarray(FRAME); } });
ff.on('close', () => {
  const n = Math.min(times.length, counts.length);
  const sorted = counts.slice(0, n).sort((a, b) => a - b); const base = sorted[Math.floor(n * 0.3)];
  const lim = Math.max(40, base * 4);
  const on = []; let lastBright = -1e9;
  for (let i = 0; i < n; i++) {
    if (counts[i] <= lim) continue;
    if (times[i] - lastBright >= 0.3) on.push({ i, t: times[i], prevT: times[i - 1] ?? times[i] });
    lastBright = times[i];
  }
  // onset time = midpoint between last quiet frame and first bright frame
  const ts2 = on.map(o => (o.t + o.prevT) / 2);
  const iv = ts2.slice(1).map((t, k) => +(t - ts2[k]).toFixed(4));
  const st = a => { const m = a.reduce((s, v) => s + v, 0) / a.length; const sd = Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, a.length - 1)); return { n: a.length, mean: +m.toFixed(3), sd: +sd.toFixed(3), min: Math.min(...a), max: Math.max(...a) }; };
  console.log(JSON.stringify({ frames: n, baseline: base, limit: lim, onsets: ts2.map(t => +t.toFixed(3)), intervals: iv, stats: iv.length ? st(iv) : null }, null, 1));
});
