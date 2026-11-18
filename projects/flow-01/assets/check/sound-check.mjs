#!/usr/bin/env node
// flow-01 소리 원본(assets/sound.json) 검사 (art-director). 30-art 7절.
//   node assets/check/sound-check.mjs           형식 + node 합성식 오프라인 렌더로 크기 규칙 S1~S6
//   node assets/check/sound-check.mjs --write   위 + 측정값을 sound.json measured 에 적음
//   node assets/check/sound-check.mjs --wav DIR 소리마다 48 kHz 16비트 WAV 를 DIR 에 씀(귀로 듣기용, 레포 밖 경로 권장)
// 렌더: sine/triangle(대역 제한 배음 합, 시작 위상 1/4 주기 — rhythm-02 Chromium 실측), 지수 글라이드, lowpass biquad(WebAudio 명세식),
// linearRamp → exponentialRamp(×0.001) 엔벨로프, bus·master 게인. 외부 패키지 없음. 실패 시 종료 코드 1.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SPATH = resolve(HERE, '../sound.json');
const S = JSON.parse(readFileSync(SPATH, 'utf8'));
const SR = S.sample_rate;
const db2lin = (db) => Math.pow(10, db / 20);
const lin2db = (v) => (v > 0 ? 20 * Math.log10(v) : -Infinity);
const args = process.argv.slice(2);
let fail = 0; const out = [];
const bad = (m) => { fail++; out.push('FAIL ' + m); };

function osc(wave, fAt, n) { // fAt(i) = 순간 주파수
  const y = new Float32Array(n); let ph = 0.25;
  for (let i = 0; i < n; i++) {
    const f = fAt(i);
    if (wave === 'sine') y[i] = Math.sin(2 * Math.PI * ph);
    else { // 대역 제한 삼각파: (8/π²) Σ (−1)^m sin(2π(2m+1)φ)/(2m+1)², 나이퀴스트 아래 배음만
      let v = 0; for (let m = 0; m < 40; m++) { const h = 2 * m + 1; if (h * f >= SR / 2) break; v += (m % 2 ? -1 : 1) * Math.sin(2 * Math.PI * h * ph) / (h * h); }
      y[i] = (8 / (Math.PI * Math.PI)) * v;
    }
    ph += f / SR; if (ph > 1e6) ph -= Math.floor(ph);
  }
  return y;
}
function lowpass(x, { f, Q }) {
  const w0 = 2 * Math.PI * f / SR, cs = Math.cos(w0), sn = Math.sin(w0), alpha = sn / (2 * Math.pow(10, Q / 20));
  const b0 = (1 - cs) / 2, b1 = 1 - cs, b2 = (1 - cs) / 2, a0 = 1 + alpha, a1 = -2 * cs, a2 = 1 - alpha;
  const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
// 층 하나를 buf 의 시각 t0 에 더함
function addLayer(buf, t0, L, baseDb, busDb, playF) {
  const st = t0 + (L.delayMs || 0) / 1000, a = (L.env.a || 0) / 1000, dc = L.env.decay / 1000;
  const i0 = Math.round(st * SR), n = Math.min(buf.length - i0, Math.ceil((a + dc) * SR) + 2); if (n <= 0) return;
  const f0 = L.note ? playF * (L.fMul ?? 1) : L.f;
  const f1 = L.fTo ?? (L.fToMul ? f0 * L.fToMul : null), gT = (L.glideMs || 0) / 1000;
  const fAt = (i) => { const t = i / SR; return f1 && t < gT ? f0 * Math.pow(f1 / f0, t / gT) : f1 ? f1 : f0; };
  let y = osc(L.wave, fAt, n);
  if (L.filter) y = lowpass(y, L.filter);
  const peak = db2lin(baseDb + busDb + S.master.db) * (L.mul ?? 1);
  for (let i = 0; i < n; i++) {
    const t = i / SR; const g = t < a ? peak * (t / a) : peak * Math.pow(0.001, Math.min(1, (t - a) / dc));
    buf[i0 + i] += y[i] * (t - a > dc ? 0 : g);
  }
}
function render(name, playF, len = 1.6) {
  const def = S.sounds[name]; const buf = new Float32Array(Math.round(len * SR)); const busDb = S.buses[def.bus].db;
  if (def.pitch === 'chord') { const k = playF; for (let j = 0; j < k; j++) for (const L of def.layers) addLayer(buf, (j * def.arp_ms) / 1000, L, def.db, busDb, S.ladder_hz[j]); }
  else for (const L of def.layers) addLayer(buf, 0, L, def.db, busDb, playF);
  return buf;
}
function renderAmbient(len = 9) {
  const A = S.ambient, buf = new Float32Array(Math.round(len * SR)), busDb = S.buses[A.bus].db;
  for (let c = 0; c * A.chord_s < len; c++) for (const f of A.chords_hz[c % A.chords_hz.length]) addLayer(buf, c * A.chord_s, { ...A.layer, f }, A.db, busDb, f);
  return buf;
}
const peakDb = (b) => { let m = 0; for (const v of b) m = Math.max(m, Math.abs(v)); return lin2db(m); };
const rmsDb = (b, ms = 100) => { const n = Math.round((ms / 1000) * SR); let s = 0; for (let i = 0; i < n; i++) s += b[i] * b[i]; return lin2db(Math.sqrt(s / n)); };

// S6 파형
for (const [n, d] of Object.entries(S.sounds)) for (const L of d.layers) if (!['sine', 'triangle'].includes(L.wave)) bad(`S6 ${n} 파형 ${L.wave}`);
if (!['sine', 'triangle'].includes(S.ambient.layer.wave)) bad('S6 ambient 파형');

const M = {}; const rows = [];
const meas = (key, buf) => { const r = { peak_db: +peakDb(buf).toFixed(2), rms_db: +rmsDb(buf).toFixed(2) }; M[key] = r; rows.push([key, r]); return r; };
const bufs = {};
for (const [name, def] of Object.entries(S.sounds)) {
  if (def.pitch === 'ladder') S.ladder_hz.forEach((f, i) => { bufs[`${name}@${i + 1}`] = render(name, f); meas(`${name}@${i + 1}`, bufs[`${name}@${i + 1}`]); });
  else if (def.pitch === 'tick') S.tick_hz.forEach((f, i) => meas(`${name}@${i + 1}`, render(name, f, 0.3)));
  else if (def.pitch === 'chord') for (let k = 3; k <= 6; k++) { bufs[`${name}@k${k}`] = render(name, k, 2.0); meas(`${name}@k${k}`, bufs[`${name}@k${k}`]); }
  else meas(name, render(name, null));
}
const amb = renderAmbient(); meas('ambient', amb);

const conn = Object.entries(M).filter(([k]) => k.startsWith('connect_'));
const minConn = Math.min(...conn.map(([, v]) => v.peak_db));
const others = Object.entries(M).filter(([k]) => !k.startsWith('connect_'));
const maxOther = Math.max(...others.map(([, v]) => v.peak_db));
const maxOtherKey = others.find(([, v]) => v.peak_db === maxOther)[0];
if (!(minConn >= maxOther + 1)) bad(`S1 가장 작은 연결음 ${minConn.toFixed(2)} dB < 다른 소리 최고 ${maxOther.toFixed(2)} (${maxOtherKey}) + 1`);
const maxTick = Math.max(...Object.entries(M).filter(([k]) => k.startsWith('tick')).map(([, v]) => v.peak_db));
if (!(maxTick <= minConn - 12)) bad(`S2 칸 틱 ${maxTick.toFixed(2)} > 연결음 ${minConn.toFixed(2)} − 12`);
for (let i = 1; i <= 6; i++) {
  const g = [1, 2, 3].map((n) => M[`connect_g${n}@${i}`]);
  if (!(g[0].peak_db >= g[1].peak_db - 0.05 && g[1].peak_db >= g[2].peak_db - 0.05)) bad(`S3 음 ${i} 최고값 순서 1단 ${g[0].peak_db} / 2단 ${g[1].peak_db} / 3단 ${g[2].peak_db}`);
  if (!(g[0].rms_db >= g[1].rms_db && g[1].rms_db >= g[2].rms_db)) bad(`S3 음 ${i} RMS 순서 ${g.map((x) => x.rms_db).join(' / ')}`);
}
{ // S4 최악 겹침
  const len = Math.round(2.2 * SR); const mix = new Float32Array(len);
  const c = bufs['connect_g1@6'], cp = bufs['complete@k6']; const off = Math.round(0.15 * SR);
  let ambPeak = 0; for (const v of amb) ambPeak = Math.max(ambPeak, Math.abs(v));
  for (let i = 0; i < len; i++) mix[i] = (c[i] || 0) + (i >= off ? cp[i - off] || 0 : 0);
  let mp = 0; for (const v of mix) mp = Math.max(mp, Math.abs(v)); mp += ambPeak;
  M.worst_mix = { peak_db: +lin2db(mp).toFixed(2) }; rows.push(['worst_mix(1단 C6 + 완료 k6 + 배경 최고)', M.worst_mix]);
  if (!(lin2db(mp) <= -1)) bad(`S4 최악 겹침 ${lin2db(mp).toFixed(2)} dBFS > −1`);
}
// S7 등급 구분(G4): 첫 소리(음 시작) 개수 1단 3 / 2단 2 / 3단 1, 같은 음끼리 RMS 계단 ≥ 1.5 dB
{ const onsets = (n) => new Set(S.sounds[n].layers.map((L) => L.delayMs || 0)).size;
  [3, 2, 1].forEach((want, i) => { const n = `connect_g${i + 1}`; if (onsets(n) !== want) bad(`S7 ${n} 음 개수 ${onsets(n)} ≠ ${want}`); if (S.sounds[n].notes !== want) bad(`S7 ${n}.notes ${S.sounds[n].notes} ≠ ${want}`); });
  let minStep = Infinity;
  for (let i = 1; i <= 6; i++) { const g = [1, 2, 3].map((n) => M[`connect_g${n}@${i}`].rms_db); for (const d of [g[0] - g[1], g[1] - g[2]]) { minStep = Math.min(minStep, d); if (!(d >= 1.5)) bad(`S7 음 ${i} 등급 RMS 계단 ${d.toFixed(2)} dB < 1.5`); } }
  M.grade_rms_step_min_db = +minStep.toFixed(2); }
// S8 (r2 H4): 막힘 "툭"(bump) 은 가장 작은 연결음보다 최고값·RMS 모두 ≥ 6 dB 작게, 220 Hz 아래에서 시작(낮은 소리), 120 ms 안에 끝남
if (!S.sounds.bump) bad('S8 bump(막힘 소리) 없음');
else { const b = M.bump, minConnRms = Math.min(...conn.map(([, v]) => v.rms_db)); M.bump_margin_db = +(minConn - b.peak_db).toFixed(2);
  if (!(b.peak_db <= minConn - 6)) bad(`S8 bump 최고 ${b.peak_db} > 연결음 ${minConn.toFixed(2)} − 6`);
  if (!(b.rms_db <= minConnRms - 6)) bad(`S8 bump RMS ${b.rms_db} > 연결음 RMS ${minConnRms.toFixed(2)} − 6`);
  for (const L of S.sounds.bump.layers) { if (!((L.f ?? 999) <= 220)) bad('S8 bump 시작 음 > 220 Hz'); if ((L.env.a || 0) + L.env.decay > 120) bad('S8 bump 길이 > 120 ms'); } }
if (!(M.ambient.peak_db <= minConn - 12)) bad(`S5 배경음 ${M.ambient.peak_db} > 연결음 ${minConn.toFixed(2)} − 12`);

for (const [k, v] of rows) console.log(`${k.padEnd(44)} peak ${String(v.peak_db).padStart(7)} dBFS${v.rms_db !== undefined ? `   rms100 ${String(v.rms_db).padStart(7)}` : ''}`);
console.log(`연결음 최소 ${minConn.toFixed(2)} / 다른 소리 최고 ${maxOther.toFixed(2)} (${maxOtherKey}) / 틱 최고 ${maxTick.toFixed(2)} / 배경 ${M.ambient.peak_db}`);
for (const l of out) console.log(l);
if (args.includes('--write')) {
  S.measured = { _by: 'assets/check/sound-check.mjs (node 합성식, 2026-11-18 G4 반영). 빌드 렌더값 대조는 1-3 뒤 qa.', margins: { s7_grade_rms_step_db: M.grade_rms_step_min_db, s1_db: +(minConn - maxOther).toFixed(2), s2_db: +(minConn - maxTick).toFixed(2), s5_db: +(minConn - M.ambient.peak_db).toFixed(2), s8_bump_db: M.bump_margin_db }, values: M };
  writeFileSync(SPATH, JSON.stringify(S, null, 1) + '\n'); console.log('wrote measured →', SPATH);
}
const wi = args.indexOf('--wav');
if (wi >= 0) {
  const dir = args[wi + 1]; mkdirSync(dir, { recursive: true });
  const wav = (b, p) => { const n = b.length, buf = Buffer.alloc(44 + n * 2); buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(b[i] * 32767))), 44 + i * 2); writeFileSync(p, buf); };
  for (const [k, b] of Object.entries(bufs)) wav(b, join(dir, k.replace(/[@]/g, '_') + '.wav'));
  wav(amb, join(dir, 'ambient.wav')); console.log('wav →', dir);
}
console.log(fail ? `소리 검사 실패 ${fail}건` : `소리 검사 통과 (S1~S8, 등급 RMS 계단 최소 ${M.grade_rms_step_min_db} dB, 막힘 툭 −${M.bump_margin_db} dB)`);
process.exit(fail ? 1 : 0);
