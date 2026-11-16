// Usage: node track.mjs <video.mp4> <out.csv>
// Streams every decoded frame (no dup/drop) as raw RGB, records per-frame:
// t (pts seconds), player green-body centre/size, white spike apexes near the ground.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const FF = path.join(process.env.LOCALAPPDATA,
  'Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe');
const [, , input, out, ws] = process.argv;
const W = +(ws||1600), H = Math.round(W*9/16), FRAME = W * H * 3, K = W / 1600; // K: scale vs 1600x900
const Y = v => Math.round(v * K);

const ff = spawn(FF, ['-v', 'info', '-i', input, '-fps_mode', 'passthrough',
  '-vf', 'showinfo', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
const times = [];
let errBuf = '';
ff.stderr.on('data', d => {
  errBuf += d.toString();
  let i;
  while ((i = errBuf.indexOf('\n')) >= 0) {
    const line = errBuf.slice(0, i); errBuf = errBuf.slice(i + 1);
    const m = line.match(/pts_time:\s*([\d.]+)/);
    if (m && line.includes('Parsed_showinfo')) times.push(parseFloat(m[1]));
  }
});

const rows = ['i,t,pgreen,pcx,pcy,pw,ph,spikes'];
let buf = Buffer.alloc(0), idx = 0;

function analyse(f) {
  // player body: lime green pixels
  const rowCnt = new Int32Array(H), colCnt = new Int32Array(W);
  let n = 0;
  for (let y = 0; y < Y(660); y++) {
    for (let x = 0; x < W; x += 1) {
      const o = (y * W + x) * 3, r = f[o], g = f[o + 1], b = f[o + 2];
      if (g > 190 && r > 90 && r < 210 && b < 90) { rowCnt[y]++; colCnt[x]++; n++; }
    }
  }
  // body = rows/cols with >=12 green px (particles are sparse)
  let sx = 0, sy = 0, cnt = 0, x0 = W, x1 = -1, y0 = H, y1 = -1;
  for (let y = 0; y < Y(660); y++) if (rowCnt[y] >= Y(12)) { if (y < y0) y0 = y; y1 = y; }
  for (let x = 0; x < W; x++) if (colCnt[x] >= Y(12)) { if (x < x0) x0 = x; x1 = x; }
  let pcx = '', pcy = '', pw = '', ph = '';
  if (y1 >= 0 && x1 >= 0) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const o = (y * W + x) * 3, r = f[o], g = f[o + 1], b = f[o + 2];
      if (g > 190 && r > 90 && r < 210 && b < 90) { sx += x; sy += y; cnt++; }
    }
    if (cnt > 300 * K * K) {
      pcx = (sx / cnt / K).toFixed(1); pcy = (sy / cnt / K).toFixed(1);
      pw = Math.round((x1 - x0 + 1) / K); ph = Math.round((y1 - y0 + 1) / K);
    }
  }
  // spikes: white outline pixels in band just above ground line; cluster by x
  const whiteCols = [];
  for (let x = 0; x < W; x++) {
    let top = -1;
    for (let y = Y(520); y < Y(638); y++) {
      const o = (y * W + x) * 3;
      if (f[o] > 215 && f[o + 1] > 215 && f[o + 2] > 215) { top = y; break; }
    }
    if (top >= 0) whiteCols.push([x, top]);
  }
  const clusters = [];
  for (const [x, top] of whiteCols) {
    const c = clusters[clusters.length - 1];
    if (c && x - c.x1 <= Y(6)) { c.x1 = x; if (top < c.top) { c.top = top; c.ax = x; } }
    else clusters.push({ x0: x, x1: x, top, ax: x });
  }
  const spikes = clusters.filter(c => c.x1 - c.x0 >= Y(25) && c.x1 - c.x0 <= Y(140))
    .map(c => `${((c.x0 + c.x1) / 2 / K).toFixed(1)}:${Math.round(c.top / K)}`).join(' ');
  return [Math.round(n / K / K), pcx, pcy, pw, ph, spikes];
}

ff.stdout.on('data', d => {
  buf = Buffer.concat([buf, d]);
  while (buf.length >= FRAME) {
    const f = buf.subarray(0, FRAME);
    const r = analyse(f);
    rows.push([idx, '', ...r].join(','));
    idx++;
    buf = buf.subarray(FRAME);
  }
});
ff.on('close', () => {
  for (let i = 1; i < rows.length; i++) {
    const parts = rows[i].split(',');
    parts[1] = times[i - 1] !== undefined ? times[i - 1].toFixed(4) : '';
    rows[i] = parts.join(',');
  }
  fs.writeFileSync(out, rows.join('\n') + '\n');
  console.log(`frames=${idx} times=${times.length} -> ${out}`);
});
