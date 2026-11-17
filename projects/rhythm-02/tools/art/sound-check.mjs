#!/usr/bin/env node
// rhythm-02 소리 원본(assets/sound.json) 검사. 30-art 9절.
//   node tools/art/sound-check.mjs           형식 + 동기 검사 + node 합성식 오프라인 렌더로 크기 규칙 검사
//   node tools/art/sound-check.mjs --write   위 + 측정값(peak_db, rms_db, verify.measured)을 sound.json 에 적음
//
// 렌더는 브라우저 없이 node 에서 sound.json 의 합성식(_synth)을 그대로 계산합니다:
//   sine/triangle 오실레이터(위상 0 시작, 지수 글라이드 = exponentialRamp), 시드 고정 흰 잡음,
//   BiquadFilter = WebAudio 명세식(lowpass/highpass 의 Q 는 dB, bandpass 의 Q 는 배수), 엔벨로프 linearRamp → exponentialRamp(×0.001),
//   bus·master 게인, 컴프레서 없음. 1-3 이후 qa-engineer 가 빌드의 OfflineAudioContext 렌더로 한 번 더 대조합니다(30-art 9-4).
// 실패가 하나라도 있으면 종료 코드 1. 외부 패키지 없음.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = resolve(HERE, '../..');
const SPATH = join(PROJ, 'assets/sound.json');
const S = JSON.parse(readFileSync(SPATH, 'utf8'));
const args = process.argv.slice(2);
let fail = 0;
const bad = (m) => { fail++; console.log('FAIL', m); };
const db2lin = (db) => Math.pow(10, db / 20);
const lin2db = (x) => 20 * Math.log10(Math.max(x, 1e-12));
const SR = S.sample_rate;

// ---------- 합성 ----------
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const NOISE = (() => { const r = mulberry32(S.noise_seed), n = Math.round(S.noise_buffer_s * SR), b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = r() * 2 - 1; return b; })();

function biquad(x, { type, f, Q }) {
  const w0 = 2 * Math.PI * f / SR, cs = Math.cos(w0), sn = Math.sin(w0);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lowpass' || type === 'highpass') {
    const alpha = sn / (2 * Math.pow(10, Q / 20));
    if (type === 'lowpass') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2; } else { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2; }
    a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha;
  } else if (type === 'bandpass') {
    const alpha = sn / (2 * Q);
    b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha;
  } else throw new Error('filter ' + type);
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

// 소리 하나를 t0(s) 에 길이 len(s) 버퍼에 더함. playF = note 층 음 높이
export function renderSound(name, { t0 = 0.05, len = 1.6, playF = null, out = null } = {}) {
  const def = S.sounds[name];
  const N = Math.round(len * SR);
  const mix = out || new Float32Array(N);
  const sum = new Float32Array(N);
  for (const L of def.layers) {
    const start = t0 + (L.delayMs || 0) / 1000;
    const a = (L.env.a || 0) / 1000, dcy = L.env.decay / 1000;
    const peak = db2lin(def.db) * (L.mul ?? 1);
    const f0 = L.note ? playF * (L.fMul ?? 1) : L.f;
    const fTo = L.note ? null : L.fTo;
    const g = (L.glideMs || 0) / 1000;
    const buf = new Float32Array(N);
    let ph = 0;
    const i0 = Math.round(start * SR), i1 = Math.min(N, Math.round((start + a + dcy) * SR));
    for (let i = i0; i < i1; i++) {
      const t = i / SR - start;
      let v;
      if (L.wave === 'noise') v = NOISE[(i - i0) % NOISE.length];
      else {
        const f = fTo && g > 0 ? (t < g ? f0 * Math.pow(fTo / f0, t / g) : fTo) : f0;
        if (L.wave === 'sine') v = Math.sin(2 * Math.PI * ph);
        else if (L.wave === 'triangle') v = 1 - 4 * Math.abs(((ph + 0.25) % 1) - 0.5);
        else throw new Error('wave ' + L.wave + ' (square·sawtooth 금지)');
        ph += f / SR;
      }
      buf[i] = v;
    }
    const fb = L.filter ? biquad(buf, L.filter) : buf;
    for (let i = i0; i < i1; i++) {
      const t = i / SR - start;
      const e = t < a ? (a > 0 ? t / a : 1) : Math.pow(0.001, (t - a) / dcy);
      sum[i] += fb[i] * e * peak;
    }
  }
  const post = def.post ? biquad(sum, def.post) : sum;
  const busG = db2lin(S.buses[def.bus].db) * db2lin(S.master.db);
  for (let i = 0; i < N; i++) mix[i] += post[i] * busG;
  return mix;
}

export function measure(buf, t0) {
  let pk = 0; for (const v of buf) pk = Math.max(pk, Math.abs(v));
  const s0 = Math.round(t0 * SR), n = Math.round(0.1 * SR);
  let ss = 0; for (let i = 0; i < n; i++) ss += (buf[s0 + i] || 0) ** 2;
  return { peak: lin2db(pk), rms: 10 * Math.log10(Math.max(ss / n, 1e-24)) };
}

const M = S.music;
const noteF = (lm, d) => lm.root_hz * M.melody_octave_mul * Math.pow(2, (lm.scale[d % lm.scale.length] + 12 * Math.floor(d / lm.scale.length)) / 12);

// ---------- 1) 형식 ----------
const ids = Object.keys(M.levels).sort();
if (ids.join() !== '01,02,03,04,05,06,07,08,09,10') bad(`music.levels 키 ${ids.join()}`);
for (const [k, v] of Object.entries(S.sounds)) {
  if (typeof v.db !== 'number' || !S.buses[v.bus] || !Array.isArray(v.layers) || !v.layers.length) bad(`sounds.${k} 형식`);
  for (const L of v.layers) {
    if (!['sine', 'triangle', 'noise'].includes(L.wave)) bad(`sounds.${k} 파형 ${L.wave}`);
    if (!L.note && L.wave !== 'noise' && !(L.f > 0)) bad(`sounds.${k} f`);
    if (!(L.env && L.env.decay > 0)) bad(`sounds.${k} env`);
  }
}
for (const k of ['play_bar', 'rest_bar']) for (const b of [...M[k].tick_a_beats, ...M[k].tick_b_beats, ...M[k].bass_beats]) if (!Number.isInteger(b) || b < 0 || b >= M.meter) bad(`${k} 박 ${b}`);
// 플레이 마디 곡 음 시작 = 2분 격자(0, 2) 만
for (const b of [...M.play_bar.tick_a_beats, ...M.play_bar.tick_b_beats, ...M.play_bar.bass_beats]) if (b % M.slot_beats) bad(`플레이 마디 박 ${b} 이 2분 격자 밖`);

// ---------- 2) 동기 ----------
const sig = {};
for (const id of ids) {
  const lm = M.levels[id];
  if (!S.sounds[lm.melody]) bad(`${id} 멜로디 악기 ${lm.melody} 없음`);
  if (!(lm.root_hz > 0) || !Array.isArray(lm.scale)) bad(`${id} root/scale`);
  const seen = new Set();
  let end = 0;
  for (const n of lm.motif) {
    if (!(Number.isInteger(n.s) && n.s >= 0 && n.s < M.frame_slots)) bad(`${id} 자리 ${n.s}`);
    if (!(Number.isInteger(n.d) && n.d >= 0 && n.d <= M.max_degree)) bad(`${id} 도수 ${n.d}`);
    if (!(Number.isInteger(n.len) && n.len >= 1 && n.len <= M.max_len)) bad(`${id} 길이 ${n.len}`);
    if (seen.has(n.s)) bad(`${id} 같은 자리 두 음`);
    if (n.s < end) bad(`${id} 음이 겹침(자리 ${n.s})`);
    seen.add(n.s); end = n.s + n.len;
  }
  if (end > M.frame_slots) bad(`${id} 동기가 틀을 넘음`);
  // 서로 다른 동기: 리듬(자리·길이) + 음정 간격(도수 차) 이 같은 레벨이 없어야 함(조옮김만 다른 것도 같음으로 봄)
  const s = lm.motif.map((n) => `${n.s}:${n.len}`).join(',') + '|' + lm.motif.slice(1).map((n, i) => n.d - lm.motif[i].d).join(',');
  if (sig[s]) bad(`${id} 동기가 ${sig[s]} 과 같음`);
  sig[s] = id;
}
if (M.levels['10'].outro_recall !== '01') bad('L10 끝 되부름(01) 없음');
// 리듬만 같은 쌍(정보)
const rhythmOnly = {};
for (const id of ids) { const r = M.levels[id].motif.map((n) => `${n.s}:${n.len}`).join(','); (rhythmOnly[r] ||= []).push(id); }
console.log(`동기 10개 서로 다름(리듬+음정 간격 기준). 리듬 모양 ${Object.keys(rhythmOnly).length}종: ${Object.values(rhythmOnly).map((v) => v.join('·')).join(' / ')}`);

// ---------- 3) 곡 음 시작이 접촉의 놓침 구역에 들지 않는지 (규칙 자체 검사, 레벨 파일이 생기면 1-2 에서 연결) ----------
// 접촉 c(박), 통과 창 이른 쪽 pe(ms), 놓침 구역 miss(ms): 위험 [c − pe − miss, c − pe). 곡 음 m 이 위험 안이면서 다른 접촉과 같은 시각(±5 ms)이 아니면 위반.
export function onsetClash(contactsBeats, musicBeats, bpm, pe = 150, miss = 140) {
  const ms = 60000 / bpm, out = [];
  for (const m of musicBeats) {
    const tm = m * ms;
    if (contactsBeats.some((c) => Math.abs(c * ms - tm) < 5)) continue;
    for (const c of contactsBeats) { const tc = c * ms; if (tm >= tc - pe - miss && tm < tc - pe) out.push({ m, c }); }
  }
  return out;
}
{
  const musicPlay = (bars) => { const o = []; for (let b = 0; b < bars; b++) for (const x of M.play_bar.tick_a_beats) o.push(b * 4 + x); return o; };
  const cases = [
    ['L1 1박만(100 BPM)', [0, 1, 2, 3, 4, 5, 6, 7, 8], 100, true],
    ['L2 큰 통(2박) 섞음', [0, 1, 3, 4, 6, 8], 104, true],
    ['L4 점 통 3+3+2 마디 첫 박 시작', [0, 1.5, 3, 4, 5.5, 7, 8], 112, true],
    ['(반례) 점 통 3+3+2 를 둘째 박에서 시작', [1, 2.5, 4, 5], 112, false],
    ['L5 큰 통 뒤 통통(반박 2)', [0, 2, 2.5, 3, 4], 116, true],
    ['L8 드르륵(반박 4) 큰 통 뒤', [0, 2, 2.5, 3, 3.5, 4], 124, true],
    ['(반례) 짝수 박에 접촉이 없는 반박(점 통 뒤 반박)', [0, 1.5, 2.5, 3], 124, false],
    ['L6 두 공(번갈아, 1박 간격)', [0, 1, 2, 3, 4, 5, 6, 7], 118, true],
  ];
  for (const [n, cs, bpm, want] of cases) {
    const clash = onsetClash(cs, musicPlay(3), bpm);
    const ok = (clash.length === 0) === want;
    console.log(`곡 음 시작 규칙 [${n}] 위반 ${clash.length}${clash.length ? ' (' + clash.map((x) => `곡 ${x.m}박→접촉 ${x.c}박`).join(', ') + ')' : ''} ${ok ? '기대대로' : 'FAIL'}`);
    if (!ok) bad(`곡 음 시작 규칙 ${n}`);
  }
  const lv = join(PROJ, 'levels');
  const files = existsSync(lv) ? readdirSync(lv).filter((f) => f.endsWith('.json')).sort() : [];
  if (!files.length) console.log('levels/ 아직 없음: 규칙 사례만 검사');
  // balance 1-1 레벨 파일(contacts[].beat, phrases[].start_beat·rest_beats, judge) 에 곡 음 시작 규칙을 적용.
  // 곡 음 시작 = 받침 쉼 구간의 모든 정수 박 + 그 밖의 짝수 박(2분 격자). 판정 창 값은 레벨 파일 judge 를 그대로 씀.
  // 스키마가 바뀌면(1-2) 여기만 고침. 위반은 art 규칙 위반이 아니라 "곡을 그 자리에서 빼야 함" 표시로 보고, 1-2 안건.
  const lvRows = [];
  let lvClash = 0;
  for (const f of files) {
    let L;
    try { L = JSON.parse(readFileSync(join(lv, f), 'utf8')); } catch { console.log(`레벨 ${f} 읽기 실패`); continue; }
    if (!Array.isArray(L.contacts) || !L.judge) { console.log(`레벨 ${f} 스키마 다름(건너뜀)`); continue; }
    const cs = L.contacts.map((c) => c.beat);
    const rest = (L.phrases || []).map((p) => [p.start_beat, p.start_beat + p.rest_beats]);
    const inRest = (b) => rest.some(([a, z]) => b >= a && b < z);
    const on = [];
    for (let b = 0; b < (L.length_beats || Math.ceil(Math.max(...cs)) + 4); b++) if (inRest(b) || b % M.slot_beats === 0) on.push(b);
    const cl = onsetClash(cs, on, L.bpm, L.judge.pass_early_ms, L.judge.miss_zone_ms);
    lvClash += cl.length;
    lvRows.push(`L${L.id} ${cl.length ? '위반 ' + cl.map((x) => `${x.m}→${x.c}`).join(',') : '0'}`);
  }
  if (lvRows.length) console.log(`레벨 파일(balance 1-1)에 곡 음 시작 규칙 적용(위반 = 곡 음 시작 박→그 음이 놓침 구역에 든 접촉 박): ${lvRows.join(' / ')} — 위반 합 ${lvClash}${lvClash ? ' (1-2 안건: 그 박의 곡 음을 빼거나 레벨 배치 조정. 빌드는 levels 접촉 기준으로 해당 곡 음을 자동 생략)' : ''}`);
}

// ---------- 4) 크기 (node 합성 렌더) ----------
const res = {};
const t0 = 0.05;
for (const name of Object.keys(S.sounds)) {
  const def = S.sounds[name];
  const pitched = def.layers.some((L) => L.note);
  let worst = null;
  const fs = [];
  if (!pitched) fs.push([null, '-']);
  else for (const id of ids) {
    const lm = M.levels[id];
    if (name === 'bass') fs.push([lm.root_hz / 2, id]);
    else if (name.startsWith('mel_')) { if (lm.melody !== name) continue; const ds = lm.motif.map((n) => n.d); fs.push([noteF(lm, Math.min(...ds)), id], [noteF(lm, Math.max(...ds)), id]); }
  }
  for (const [f, id] of fs) {
    const firstDelay = Math.min(...def.layers.map((L) => L.delayMs || 0)) / 1000;
    const r = measure(renderSound(name, { t0, playF: f }), t0 + firstDelay);
    if (!worst || r.peak > worst.peak) worst = { ...r, lv: id, rmsMin: Math.min(r.rms, worst?.rmsMin ?? 0) };
    else worst.rmsMin = Math.min(worst.rmsMin, r.rms);
  }
  res[name] = worst;
}
// 플레이 마디 첫 박 곡 소리 합(tick_a + bass + 멜로디 한 음), 레벨별 최댓값
let beat = { peak: -999, rms: -999, lv: '' };
for (const id of ids) {
  const lm = M.levels[id];
  const ds = lm.motif.map((n) => n.d);
  for (const d of [Math.min(...ds), Math.max(...ds)]) {
    const buf = renderSound('tick_a', { t0 });
    renderSound('bass', { t0, playF: lm.root_hz / 2, out: buf });
    renderSound(lm.melody, { t0, playF: noteF(lm, d), out: buf });
    const r = measure(buf, t0);
    if (r.peak > beat.peak) beat = { ...r, lv: id, peakLv: id };
    if (r.rms > beat.rms || beat.rmsLv === undefined) { beat.rms = Math.max(beat.rms, r.rms); beat.rmsLv = r.rms >= beat.rms ? id : beat.rmsLv; }
  }
}
// 탭 + 가장 큰 곡 박이 같은 순간일 때 합 최고값(클리핑 여유)
let mixPeak = -999;
for (const tap of S.verify.loudness_rule.child_tap) for (const id of ids) {
  const lm = M.levels[id];
  const buf = renderSound(tap, { t0 });
  renderSound('tick_a', { t0, out: buf });
  renderSound('bass', { t0, playF: lm.root_hz / 2, out: buf });
  renderSound(lm.melody, { t0, playF: noteF(lm, Math.max(...lm.motif.map((n) => n.d))), out: buf });
  mixPeak = Math.max(mixPeak, measure(buf, t0).peak);
}

const V = S.verify.loudness_rule;
const taps = V.child_tap;
const tapPeakMin = Math.min(...taps.map((k) => res[k].peak));
const tapRmsMin = Math.min(...taps.map((k) => res[k].rmsMin));
let sfxMax = -999, sfxMaxName = '';
console.log('\n| 소리 | bus | db | 렌더 최고값 dBFS | 첫 100 ms RMS dBFS | 가장 큰 레벨 |');
console.log('|---|---|---|---|---|---|');
for (const [k, v] of Object.entries(res)) {
  console.log(`| ${k} | ${S.sounds[k].bus} | ${S.sounds[k].db} | ${v.peak.toFixed(2)} | ${v.rms.toFixed(2)} | ${v.lv} |`);
  if (S.sounds[k].bus === 'sfx' && !taps.includes(k) && v.peak > sfxMax) { sfxMax = v.peak; sfxMaxName = k; }
}
console.log(`| (곡 첫 박 합: tick_a + bass + 멜로디) | music | - | ${beat.peak.toFixed(2)} (L${beat.peakLv}) | ${beat.rms.toFixed(2)} (L${beat.rmsLv}) | |`);
const m1 = tapPeakMin - sfxMax, m2 = tapRmsMin - beat.rms, m3 = tapPeakMin - beat.peak;
const tickOnlyRms = Math.max(res.tick_a.rms, res.tick_b.rms);
console.log(`\n아이 탭 최고값 최소 ${tapPeakMin.toFixed(2)} − 다른 효과음 최고 ${sfxMax.toFixed(2)}(${sfxMaxName}) = ${m1.toFixed(2)} dB (기준 ≥ ${V.tap_over_sfx_peak_db})`);
console.log(`아이 탭 RMS 최소 ${tapRmsMin.toFixed(2)} − 곡 첫 박 합 RMS ${beat.rms.toFixed(2)} = ${m2.toFixed(2)} dB (기준 ≥ ${V.tap_over_beat_rms_db}); 똑딱만이면 ${(tapRmsMin - tickOnlyRms).toFixed(2)} dB`);
console.log(`아이 탭 최고값 최소 − 곡 첫 박 합 최고값 = ${m3.toFixed(2)} dB (기준 ≥ ${V.tap_over_beat_peak_db})`);
console.log(`탭 + 곡 첫 박 동시 합 최고값 ${mixPeak.toFixed(2)} dBFS (기준 ≤ ${V.mix_peak_max_dbfs}, 컴프레서 없음)`);
if (m1 < V.tap_over_sfx_peak_db) bad('아이 탭이 다른 효과음보다 충분히 크지 않음');
if (m2 < V.tap_over_beat_rms_db) bad('아이 탭과 곡 박 RMS 차 부족');
if (m3 < V.tap_over_beat_peak_db) bad('아이 탭 최고값이 곡 박보다 충분히 크지 않음');
if (mixPeak > V.mix_peak_max_dbfs) bad('탭 + 곡 박 합이 클리핑 여유를 넘음');
if (res.tap_empty.peak > tapPeakMin - 12) bad('헛탭 소리가 너무 큼(탭보다 12 dB 이상 작아야 함)');

if (args.includes('--write')) {
  for (const [k, v] of Object.entries(res)) { S.sounds[k].peak_db = +v.peak.toFixed(1); S.sounds[k].rms_db = +v.rms.toFixed(1); }
  S.verify.measured = { tap_peak_min: +tapPeakMin.toFixed(2), sfx_peak_max: +sfxMax.toFixed(2), sfx_peak_max_sound: sfxMaxName, tap_over_sfx_peak_db: +m1.toFixed(2), tap_rms_min: +tapRmsMin.toFixed(2), beat_mix_rms: +beat.rms.toFixed(2), tap_over_beat_rms_db: +m2.toFixed(2), tap_over_beat_peak_db: +m3.toFixed(2), mix_peak_dbfs: +mixPeak.toFixed(2), how: 'node tools/art/sound-check.mjs (node 합성식, 48 kHz, master 뒤, 소리 하나씩·곡 첫 박 합). 빌드 OfflineAudioContext 대조는 1-4 QA' };
  const txt = JSON.stringify(S, null, 1).replace(/\{\n\s+"s": (\d+),\n\s+"d": (\d+),\n\s+"len": (\d+)\n\s+\}/g, '{ "s": $1, "d": $2, "len": $3 }');
  writeFileSync(SPATH, txt + '\n');
  console.log('sound.json 에 측정값을 적음');
}
console.log(fail ? `sound-check FAIL ${fail}` : 'sound-check OK');
process.exit(fail ? 1 : 0);
