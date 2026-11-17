#!/usr/bin/env node
// rhythm-02 소리 원본(assets/sound.json) 검사. 30-art 9절. (round-2: N3 — 빌드와 같은 잡음 생성기·곡 전체 음 높이·표본 최고값, 빌드 렌더값 대조, 지붕 밑 쉼 곡 규칙, 콤보 화음)
//   node tools/art/sound-check.mjs           형식 + 동기 + 곡 음 시작 규칙 + node 합성식 렌더로 크기 규칙 + 빌드 렌더값 대조
//   node tools/art/sound-check.mjs --write   위 + 도구 측정값(peak_db, rms_db, peak_win_db, verify.measured)을 sound.json 에 적음(원본은 verify.build_render)
//
// 렌더는 브라우저 없이 node 에서 sound.json 의 합성식(_synth)을 그대로 계산합니다:
//   sine/triangle 오실레이터(시작 위상 1/4 주기 = Chromium 실측, 지수 글라이드), 잡음 = noise_gen lcg32(빌드와 같은 식, music.mjs lcg32Noise), BiquadFilter = WebAudio 명세식,
//   엔벨로프 linearRamp → exponentialRamp(×0.001), bus·master 게인, 컴프레서 없음. 음 높이 = music.mjs noteOf()(빌드와 같은 함수), 곡 전체 음.
// 실패가 하나라도 있으면 종료 코드 1. 외부 패키지 없음.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { musicOnsets, onsetClash, onsetClashBeats, noteOf, allNotes, lcg32Noise, peakDb, winPeakDb } from './music.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = resolve(HERE, '../..');
const SPATH = join(PROJ, 'assets/sound.json');
const S = JSON.parse(readFileSync(SPATH, 'utf8'));
const args = process.argv.slice(2);
let fail = 0, wait = 0;
const bad = (m) => { fail++; console.log('FAIL', m); };
const pend = (m) => { wait++; console.log('대기', m); };
const db2lin = (db) => Math.pow(10, db / 20);
const SR = S.sample_rate;

// ---------- 합성 ----------
if (S.noise_gen?.type !== 'lcg32') bad('noise_gen.type 이 lcg32 가 아님(빌드와 같은 식이어야 함, N3)');
const NOISE = lcg32Noise(S[S.noise_gen?.seed_key || 'noise_seed'] ?? S.noise_seed, Math.round(S.noise_buffer_s * SR));

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
  for (let i = 0; i < x.length; i++) { const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
// Chromium OscillatorNode(sine·triangle)은 시작 표본이 파형 꼭대기 쪽(1/4 주기)에서 시작함을 실측(2026-11-17, 빌드 audio.js 를 Chromium 에서 OfflineAudioContext 로
// 렌더해 sine 830.6 Hz 첫 표본들이 cos 와 맞고, 0 위상 가정은 배음 있는 소리에서 최대 2.6 dB 어긋남). 이 값으로 도구 ↔ 빌드 차가 모든 소리 ≤ 0.6 dB.
const OSC_PHASE0 = 0.25;
const soundLen = (def) => Math.max(...def.layers.map((L) => ((L.delayMs || 0) + (L.env.a || 0) + L.env.decay) / 1000)) + 0.02;

// 소리 하나를 out 버퍼의 시각 t0(s) 에 더함(소리 길이만큼만 계산). playF = note 층 연주 음 높이
export function renderInto(name, out, t0, playF = null) {
  const def = S.sounds[name];
  const i0 = Math.round(t0 * SR), N = Math.min(out.length - i0, Math.round(soundLen(def) * SR) + 4);
  if (N <= 0) return out;
  const sum = new Float32Array(N);
  for (const L of def.layers) {
    const st = (L.delayMs || 0) / 1000, a = (L.env.a || 0) / 1000, dcy = L.env.decay / 1000;
    const peak = db2lin(def.db) * (L.mul ?? 1);
    const f0 = L.note ? playF * (L.fMul ?? 1) : L.f;
    const fTo = L.note ? (L.fToMul ? f0 * L.fToMul : null) : L.fTo;
    const g = (L.glideMs || 0) / 1000;
    const buf = new Float32Array(N);
    let ph = OSC_PHASE0; // 오실레이터 시작 위상 = 1/4 주기(코사인 쪽) — Chromium OfflineAudioContext 렌더 실측과 맞춤(아래 OSC_PHASE0 설명)
    const j0 = Math.round(st * SR), j1 = Math.min(N, Math.round((st + a + dcy) * SR));
    for (let j = j0; j < j1; j++) {
      const t = j / SR - st;
      let v;
      if (L.wave === 'noise') v = NOISE[(j - j0) % NOISE.length];
      else {
        const f = fTo && g > 0 ? (t < g ? f0 * Math.pow(fTo / f0, t / g) : fTo) : f0;
        if (L.wave === 'sine') v = Math.sin(2 * Math.PI * ph);
        else if (L.wave === 'triangle') v = 1 - 4 * Math.abs(((ph + 0.25) % 1) - 0.5);
        else throw new Error('wave ' + L.wave + ' (square·sawtooth 금지)');
        ph += f / SR;
      }
      buf[j] = v;
    }
    const fb = L.filter ? biquad(buf, L.filter) : buf;
    for (let j = j0; j < j1; j++) { const t = j / SR - st; const e = t < a ? (a > 0 ? t / a : 1) : Math.pow(0.001, (t - a) / dcy); sum[j] += fb[j] * e * peak; }
  }
  const post = def.post ? biquad(sum, def.post) : sum;
  const busG = db2lin(S.buses[def.bus].db) * db2lin(S.master.db);
  for (let j = 0; j < N; j++) out[i0 + j] += post[j] * busG;
  return out;
}
const rms100 = (buf, t0) => { const s0 = Math.round(t0 * SR), n = Math.round(0.1 * SR); let ss = 0; for (let i = 0; i < n; i++) ss += (buf[s0 + i] || 0) ** 2; return 10 * Math.log10(Math.max(ss / n, 1e-24)); };

const M = S.music;
// ---------- 레벨 ----------
const lvDir = join(PROJ, 'levels');
const LV = (existsSync(lvDir) ? readdirSync(lvDir).filter((f) => f.endsWith('.json')).sort() : []).map((f) => { try { return JSON.parse(readFileSync(join(lvDir, f), 'utf8')); } catch { return null; } }).filter((l) => l && Array.isArray(l.contacts) && Array.isArray(l.phrases));
const v2 = LV.some((l) => (l.schema_version ?? 1) >= 2);

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
const OR = M.onset_rule;
if (!OR || !OR.rest || !OR.play || !OR.roof) bad('music.onset_rule(rest·play·roof) 없음');
else {
  for (const k of [OR.rest.even_k, OR.rest.odd_k]) if (!S.sounds[k]) bad(`onset_rule 받침 쉼 소리 ${k} 없음`);
  for (const b of [...OR.rest.bass_bar_beats, ...OR.play.bass_bar_beats]) if (!Number.isInteger(b) || b < 0 || b >= M.meter) bad(`onset_rule 박 ${b}`);
  if (OR.play.grid_beats !== M.slot_beats) bad('onset_rule.play.grid_beats ≠ slot_beats');
}
for (const k of Object.keys(S.sounds)) if (/tick/i.test(k)) bad(`소리 이름 ${k}: tick 계열 금지(1-2 D7)`);
if (/똑딱/.test(JSON.stringify(S))) bad('sound.json 에 "똑딱" 낱말(1-2 D7)');
{
  const rootMax = Math.max(...Object.values(M.levels).map((l) => l.root_hz));
  for (const k of [OR?.rest?.even_k, OR?.rest?.odd_k].filter(Boolean)) {
    const d = S.sounds[k]; if (!d) continue;
    if (d.layers.some((L) => L.wave === 'noise')) bad(`${k} 에 잡음 층(rhythm-01 카운트인과 같은 계열)`);
    const fMax = Math.max(...d.layers.map((L) => (L.note ? rootMax * (L.fMul ?? 1) : L.f)));
    if (fMax > 800) bad(`${k} 높이 ${fMax.toFixed(0)} Hz > 800`);
    else console.log(`${k}: 잡음 없음, 최고 ${fMax.toFixed(0)} Hz (rhythm-01 카운트인 sine 1200/1600 Hz + 잡음과 다름)`);
  }
  for (const k of ['roof_bump', 'chord_1', 'chord_2']) if (!S.sounds[k]) bad(`round-2 소리 ${k} 없음`); else if (S.sounds[k].layers.some((L) => L.wave === 'noise')) bad(`${k} 잡음 층(거칠지 않게)`);
  // balance combo 가 부르는 화음 이름이 있는지
  try { const bal = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8')); const want = [...new Set(Object.values(bal.combo?.stage_fx || {}).map((x) => x.sound).filter((x) => x && x !== 'none'))]; const miss = want.filter((k) => !S.sounds[k]); if (miss.length) bad(`balance combo 화음 ${miss.join(',')} 가 sound.json 에 없음`); else console.log(`콤보 화음 이름 = balance combo.stage_fx (${want.join(', ')})`); } catch (e) { pend(`balance.json combo 읽기 실패 ${e.message}`); }
}

// ---------- 2) 동기 ----------
const sig = {};
for (const id of ids) {
  const lm = M.levels[id];
  if (!S.sounds[lm.melody]) bad(`${id} 멜로디 악기 ${lm.melody} 없음`);
  let end = 0; const seen = new Set();
  for (const n of lm.motif) {
    if (!(Number.isInteger(n.s) && n.s >= 0 && n.s < M.frame_slots)) bad(`${id} 자리 ${n.s}`);
    if (!(Number.isInteger(n.d) && n.d >= 0 && n.d <= M.max_degree)) bad(`${id} 도수 ${n.d}`);
    if (!(Number.isInteger(n.len) && n.len >= 1 && n.len <= M.max_len)) bad(`${id} 길이 ${n.len}`);
    if (seen.has(n.s) || n.s < end) bad(`${id} 음 겹침(자리 ${n.s})`);
    seen.add(n.s); end = n.s + n.len;
  }
  if (end > M.frame_slots) bad(`${id} 동기가 틀을 넘음`);
  const s = lm.motif.map((n) => `${n.s}:${n.len}`).join(',') + '|' + lm.motif.slice(1).map((n, i) => n.d - lm.motif[i].d).join(',');
  if (sig[s]) bad(`${id} 동기가 ${sig[s]} 과 같음`);
  sig[s] = id;
}
if (M.levels['10'].recall?.motif_from !== '01') bad('L10 끝 되부름(01) 없음');
console.log(`동기 10개 서로 다름(리듬+음정 간격 기준)`);

// ---------- 3) 곡 음 시작 규칙 ----------
{
  const even = (n) => Array.from({ length: n }, (_, i) => i * 2);
  const cases = [
    ['L1 1박만(100 BPM)', [0, 1, 2, 3, 4, 5, 6, 7, 8], 100, true],
    ['L2 큰 통(2박) 섞음', [0, 1, 3, 4, 6, 8], 104, true],
    ['L4 점 통 3+3+2 마디 첫 박 시작', [0, 1.5, 3, 4, 5.5, 7, 8], 112, true],
    ['(반례) 점 통 3+3+2 를 둘째 박에서 시작', [1, 2.5, 4, 5], 112, false],
    ['L6 큰 통 뒤 가지(반박 2)', [0, 2, 2.5, 3, 4], 116, true],
    ['L8 긴 가지(반박 4) 큰 통 뒤', [0, 2, 2.5, 3, 3.5, 4], 124, true],
    ['(반례) 점 통 뒤 반박', [0, 1.5, 2.5, 3], 124, false],
  ];
  for (const [n, cs, bpm, want] of cases) {
    const clash = onsetClashBeats(cs, even(6), bpm, 150, 200);
    const ok = (clash.length === 0) === want;
    console.log(`곡 음 시작 규칙 [${n}] 위반 ${clash.length} ${ok ? '기대대로' : 'FAIL'}`);
    if (!ok) bad(`곡 음 시작 규칙 ${n}`);
  }
  // 지붕 밑 쉼 사례(합성, balance 6-2 와 같은 박): 착지 12박, 쉼 4박(roof_out 15), 토스 16박, bob 14·15(착지 +2박부터 — 착지 ±1박 밖) → 12·13박 곡 음 0, 14·15 콩, 멜로디 없음
  const fake = { id: '05', bpm: 112, length_beats: 20, phrases: [{ start_beat: 0, rest_beats: 4, roof_sits: [{ contact: 8, beat: 12, toss_beat: 16, bob_beats: [14, 15] }] }], contacts: [] };
  const fo = musicOnsets(fake, S), at = (b) => fo.filter((o) => o.beat === b).map((o) => o.sound);
  const okRoof = !at(12).length && !at(13).length && at(14).includes(OR.rest.even_k) && at(15).includes(OR.rest.odd_k) && !fo.some((o) => o.beat > 12 && o.beat < 16 && /^mel_/.test(o.sound)) && at(16).length > 0;
  console.log(`곡 음 시작 규칙 [지붕 밑 쉼: 착지 박·다음 박 소리 0, bob_beats(착지 +2박부터)에 콩, 멜로디 없음, 토스 박부터 플레이 규칙] ${okRoof ? '기대대로' : 'FAIL'} (12:${at(12).join('+') || '없음'} 13:${at(13).join('+') || '없음'} 14:${at(14).join('+')} 15:${at(15).join('+')} 16:${at(16).join('+')})`);
  if (!okRoof) bad('지붕 밑 쉼 곡 규칙');
  if (!LV.length) pend('levels/ 없음: 규칙 사례만 검사');
  const rows = []; let clashN = 0;
  for (const L of LV) {
    const on = musicOnsets(L, S);
    const restN = on.filter((o) => (o.part === 'rest' || o.part === 'roof') && o.sound !== 'bass').length;
    const bobN = L.phrases.flatMap((p) => p.roof_sits || []).reduce((a, r) => a + (r.bob_beats || []).length, 0);
    if (restN !== L.phrases.reduce((a, p) => a + p.rest_beats, 0) + bobN) bad(`L${L.id} 콩 수 ${restN} ≠ 받침 쉼 박 + 지붕 밑 bob`);
    if (on.some((o) => !Number.isInteger(o.beat))) bad(`L${L.id} 정수 박이 아닌 곡 음`);
    // S9: 지붕 밑 착지 박 ±1박(열린 구간) 안 곡 음 없음
    const lands = L.phrases.flatMap((p) => p.roof_sits || []).map((r) => r.beat);
    const s9 = on.filter((o) => lands.some((lb) => Math.abs(o.beat - lb) < 1));
    if (s9.length) bad(`L${L.id} 지붕 밑 착지 ±1박 안 곡 음 ${s9.map((o) => o.beat + o.sound).join(',')}`);
    const cl = onsetClash(L, S); clashN += cl.length;
    rows.push(`L${L.id}${lands.length ? `(지붕 ${lands.length})` : ''} ${cl.length ? '위반 ' + cl.map((x) => `${x.m}→${x.c}`).join(',') : '0'}`);
  }
  if (rows.length) console.log(`레벨 파일 곡 음 시작 ∩ 놓침 구역(v${v2 ? 2 : 1}): ${rows.join(' / ')} — 위반 합 ${clashN}`);
  if (clashN) bad(`곡 음 시작이 놓침 구역에 듦 ${clashN}건`);
}

// ---------- 4) 크기 (node 합성 렌더, 빌드와 같은 정의) ----------
const NOTES = allNotes(LV.length ? LV : [], S);
const res = {};
const t0 = 0.05;
for (const name of Object.keys(S.sounds)) {
  const def = S.sounds[name];
  const pitched = def.layers.some((L) => L.note);
  let fs = [null];
  if (pitched) fs = NOTES[name] && NOTES[name].length ? NOTES[name] : (/^chord_/.test(name) ? ids.map((id) => noteOf(S, id, { sound: name })) : []);
  if (pitched && !fs.length) { res[name] = null; continue; } // 곡에 안 나오는 악기(그 레벨들에서)
  let worst = null;
  const firstDelay = Math.min(...def.layers.map((L) => L.delayMs || 0)) / 1000;
  for (const f of fs) {
    const buf = renderInto(name, new Float32Array(Math.round(1.6 * SR)), t0, f);
    const r = { peak: peakDb(buf), rms: rms100(buf, t0 + firstDelay), win: winPeakDb(buf, SR, 5), f };
    if (!worst || r.peak > worst.peak) worst = { ...r, rmsMin: Math.min(r.rms, worst?.rmsMin ?? 0), n: fs.length }; else worst.rmsMin = Math.min(worst.rmsMin, r.rms);
  }
  res[name] = worst;
}
// 곡 박: 레벨 곡 전체 렌더 → 곡 음 시작 박마다 100 ms RMS·0.5 s 최고값 (빌드 QA 렌더와 같은 방법)
const song = {}; let beat = { rms: -999, peak: -999 }, mixPeak = -999;
const taps = S.verify.loudness_rule.child_tap;
for (const L of LV) {
  const id = String(L.id).padStart(2, '0'), beatS = 60 / L.bpm, ons = musicOnsets(L, S);
  const buf = new Float32Array(Math.round((L.length_beats * beatS + 1.5) * SR));
  for (const o of ons) renderInto(o.sound, buf, t0 + o.beat * beatS, noteOf(S, id, o));
  let best = { rms: -999, peak: -999, beat: null, i: 0 };
  for (const b of [...new Set(ons.map((o) => o.beat))]) {
    const i = Math.round((t0 + b * beatS) * SR), win = buf.subarray(i, i + Math.round(0.5 * SR));
    const r = rms100(win, 0), p = peakDb(win);
    if (r > best.rms) best = { ...best, rms: r, beat: b }; if (p > best.peak) { best.peak = p; best.i = i; }
  }
  song[id] = { rms: +best.rms.toFixed(2), peak: +best.peak.toFixed(2), beat: best.beat };
  if (best.rms > beat.rms) beat.rms = best.rms, beat.rmsLv = id;
  if (best.peak > beat.peak) beat.peak = best.peak, beat.peakLv = id;
  for (const tp of taps) { const w = buf.slice(best.i, best.i + Math.round(0.6 * SR)); renderInto(tp, w, 0); mixPeak = Math.max(mixPeak, peakDb(w)); }
}
const V = S.verify.loudness_rule;
const tapPeakMin = Math.min(...taps.map((k) => res[k].peak));
const tapRmsMin = Math.min(...taps.map((k) => res[k].rmsMin));
let sfxMax = -999, sfxMaxName = '';
const BR = S.verify.build_render || {};
console.log('\n| 소리 | bus | db | 도구 최고값 dBFS | 빌드 렌더(원본) | 차 | 5 ms 창 최고(참고) | 첫 100 ms RMS | 음 높이 수 |');
console.log('|---|---|---|---|---|---|---|---|---|');
const deltas = [];
for (const [k, v] of Object.entries(res)) {
  if (!v) { console.log(`| ${k} | ${S.sounds[k].bus} | ${S.sounds[k].db} | (곡에 안 나옴) | | | | | 0 |`); continue; }
  const b = BR.peak_db?.[k];
  const stale = (BR.stale || []).includes(k), fresh = (BR.new_no_render || []).includes(k);
  const dd = b != null && !stale ? v.peak - b : null;
  if (dd != null) deltas.push([k, dd]);
  console.log(`| ${k} | ${S.sounds[k].bus} | ${S.sounds[k].db} | ${v.peak.toFixed(2)} | ${b != null ? b.toFixed(2) : '-'}${stale ? ' (옛 정의)' : fresh ? ' (렌더 대기)' : ''} | ${dd != null ? (dd >= 0 ? '+' : '') + dd.toFixed(2) : '-'} | ${v.win.toFixed(2)} | ${v.rms.toFixed(2)} | ${v.n ?? 1} |`);
  if (S.sounds[k].bus === 'sfx' && !taps.includes(k) && v.peak > sfxMax) { sfxMax = v.peak; sfxMaxName = k; }
}
console.log(`| (곡 박: 레벨 곡 전체, 음 시작 박마다) | music | - | ${beat.peak.toFixed(2)} (L${beat.peakLv}) | ${BR.song_beat_peak_max ?? '-'} | | | ${beat.rms.toFixed(2)} (L${beat.rmsLv}) / 빌드 ${BR.song_beat_rms_max ?? '-'} | |`);
const m1 = tapPeakMin - sfxMax, m2 = tapRmsMin - beat.rms, m3 = tapPeakMin - beat.peak;
const chordMax = Math.max(...(V.chord || []).map((k) => res[k]?.peak ?? -999));
const restOnlyRms = Math.max(res.rest_a?.rms ?? -999, res.rest_b?.rms ?? -999);
console.log(`\n아이 탭 최고값 최소 ${tapPeakMin.toFixed(2)} − 다른 효과음 최고 ${sfxMax.toFixed(2)}(${sfxMaxName}) = ${m1.toFixed(2)} dB (기준 ≥ ${V.tap_over_sfx_peak_db})`);
console.log(`아이 탭 − 콤보 화음 최고(${(V.chord || []).join('·')}) = ${(tapPeakMin - chordMax).toFixed(2)} dB (기준 ≥ ${V.chord_below_tap_db}) · 탭 − 지붕 콩 roof_bump = ${(tapPeakMin - res.roof_bump.peak).toFixed(2)} dB · 탭 − fail = ${(tapPeakMin - res.fail.peak).toFixed(2)} dB`);
console.log(`아이 탭 RMS 최소 ${tapRmsMin.toFixed(2)} − 곡 박 RMS ${beat.rms.toFixed(2)} = ${m2.toFixed(2)} dB (기준 ≥ ${V.tap_over_beat_rms_db}); 쉼 콩만이면 ${(tapRmsMin - restOnlyRms).toFixed(2)} dB`);
console.log(`아이 탭 최고값 − 곡 박 최고값 = ${m3.toFixed(2)} dB (기준 ≥ ${V.tap_over_beat_peak_db}) · 탭 + 가장 큰 곡 박 합 최고값 ${mixPeak.toFixed(2)} dBFS (기준 ≤ ${V.mix_peak_max_dbfs})`);
if (m1 < V.tap_over_sfx_peak_db) bad('아이 탭이 다른 효과음보다 충분히 크지 않음');
if (tapPeakMin - chordMax < V.chord_below_tap_db) bad('콤보 화음이 아이 탭보다 1 dB 이상 작지 않음');
if (m2 < V.tap_over_beat_rms_db) bad('아이 탭과 곡 박 RMS 차 부족');
if (m3 < V.tap_over_beat_peak_db) bad('아이 탭 최고값이 곡 박보다 충분히 크지 않음');
if (mixPeak > V.mix_peak_max_dbfs) bad('탭 + 곡 박 합이 클리핑 여유를 넘음');
if (res.tap_empty.peak > tapPeakMin - 12) bad('헛탭 소리가 너무 큼(탭보다 12 dB 이상 작아야 함)');
// 도구 ↔ 빌드 렌더(round-1, 정의가 같은 소리만) 차
const big = deltas.filter(([, d]) => Math.abs(d) > 1);
console.log(`\n도구 ↔ 빌드 렌더(원본, 같은 정의 ${deltas.length}개) 최고값 차: 최대 |${Math.max(...deltas.map(([, d]) => Math.abs(d))).toFixed(2)}| dB${big.length ? ` — 1 dB 넘음: ${big.map(([k, d]) => `${k} ${d.toFixed(2)}`).join(', ')}` : ' (모두 ≤ 1 dB)'}`);
if (big.length) pend(`도구 ↔ 빌드 차 > 1 dB ${big.length}개: round-2 빌드 OfflineAudioContext 다시 렌더(1-4 QA, 빌드가 music.mjs noteOf·lcg32Noise 를 쓴 뒤)로 확인 — 옛 렌더는 옛 잡음식·일부 음만`);
{ const nr = (BR.stale || []).concat(BR.new_no_render || []); if (nr.length) pend(`빌드 렌더 없음: ${nr.join(', ')} — 1-4 QA 렌더값이 원본`); }

// ---------- 5) 콤보 화음 시각(balance comboEvents, 모두 딱 시도) ----------
if (v2) {
  try {
    const bal = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8'));
    const J = await import(pathToFileURL(join(PROJ, 'tools/sim/judge.mjs')).href);
    const rows = [], chordBad = []; let nChord = 0;
    for (const L of LV) {
      const C = J.compileLevel(L, bal);
      const taps2 = C.contacts.filter((c) => c.kind !== 'nogo').map((c) => c.t);
      const r = J.judgeAttempt(C, taps2);
      const ev = J.comboEvents(C, r, bal);
      const lands = C.roofSits.map((r) => r.landMs / C.beatMs);
      for (const st of ev.stages.filter((x) => x.chordMs != null)) {
        // R2-D2: 판정 접촉 박 다음 정박 중, 어떤 접촉의 [놓침 구역 시작, 통과 창 끝]에도 들지 않고 지붕 착지 ±1박도 아닌 첫 정박
        const inWin = (b) => C.contacts.some((c) => b * C.beatMs >= c.zoneStart - 1e-6 && b * C.beatMs <= c.passEnd + 1e-6);
        const nearRoof = (b) => lands.some((lb) => Math.abs(b - lb) <= 1 + 1e-9);
        const firstOk = (from) => { let w = Math.floor(from + 1e-9) + 1; while (w < 999 && (inWin(w) || nearRoof(w))) w++; return w; };
        const wants = [...new Set([firstOk(C.contacts[st.at_i].beat), firstOk(st.t / C.beatMs)])]; // hold 단계는 착지 박 또는 roof_out 박 기준 둘 다 허용
        const want = wants.includes(st.chordBeat) ? st.chordBeat : wants[0];
        const b = st.chordBeat, isInt = Math.abs(b - Math.round(b)) < 1e-9;
        const probs = [];
        if (!isInt) probs.push('정박 아님');
        if (inWin(b)) probs.push('접촉 [놓침 구역 시작, 통과 창 끝] 안');
        if (nearRoof(b)) probs.push('지붕 착지 ±1박');
        if (Math.abs(b - want) > 1e-9) probs.push(`규칙상 첫 정박 ${want}박이 아님`);
        if (Math.abs(st.chordMs - b * C.beatMs) > 0.5) probs.push('chordMs ≠ chordBeat × 1박');
        if (probs.length) chordBad.push(`L${L.id} ${st.stage}@${b}박: ${probs.join('·')}`);
        rows.push(`L${L.id} ${st.stage}: ${st.chordBeat}박`);
        nChord++;
      }
    }
    console.log(`콤보 화음 시각(R2-D2: 다음 정박 중 접촉 [놓침 구역 시작, 통과 창 끝]·지붕 착지 ±1박 밖 첫 정박, 모두 딱 시도) ${nChord}번 — 위반 ${chordBad.length}${chordBad.length ? ': ' + chordBad.join(' / ') : ''} | ${rows.join(' / ') || '없음'}`);
    if (chordBad.length) bad(`콤보 화음 시각 R2-D2 위반 ${chordBad.length}건(balance judge.mjs comboEvents·balance.json combo.chord_timing)`);
  } catch (e) { pend(`comboEvents 실행 실패 ${e.message}`); }
} else pend('콤보 화음 시각: levels v2 대기');

if (args.includes('--write')) {
  for (const [k, v] of Object.entries(res)) if (v) { S.sounds[k].peak_db = +v.peak.toFixed(1); S.sounds[k].rms_db = +v.rms.toFixed(1); S.sounds[k].peak_win_db = +v.win.toFixed(1); }
  S.verify.measured = { source: 'tool', tap_peak_min: +tapPeakMin.toFixed(2), sfx_peak_max: +sfxMax.toFixed(2), sfx_peak_max_sound: sfxMaxName, tap_over_sfx_peak_db: +m1.toFixed(2), chord_peak_max: +chordMax.toFixed(2), tap_over_chord_db: +(tapPeakMin - chordMax).toFixed(2), tap_rms_min: +tapRmsMin.toFixed(2), song_beat_rms_max: +beat.rms.toFixed(2), song_beat_peak_max: +beat.peak.toFixed(2), rest_only_rms: +restOnlyRms.toFixed(2), tap_over_beat_rms_db: +m2.toFixed(2), tap_over_beat_peak_db: +m3.toFixed(2), mix_peak_dbfs: +mixPeak.toFixed(2), how: 'node tools/art/sound-check.mjs (도구값: 빌드와 같은 lcg32 잡음·music.mjs noteOf 곡 전체 음·표본 최고값, 48 kHz, master 뒤). 원본은 verify.build_render(빌드 OfflineAudioContext)' };
  const txt = JSON.stringify(S, null, 1).replace(/\{\n\s+"s": (\d+),\n\s+"d": (\d+),\n\s+"len": (\d+)\n\s+\}/g, '{ "s": $1, "d": $2, "len": $3 }');
  writeFileSync(SPATH, txt + '\n');
  console.log('sound.json 에 도구 측정값을 적음');
}
console.log(fail ? `sound-check FAIL ${fail}` : `sound-check OK (크기 순서·콤보 화음 ≥ 1 dB 작게·곡 음 규칙·지붕 밑 쉼${wait ? ` — 대기 ${wait}: 빌드 렌더·v2 레벨` : ''})`);
process.exit(fail ? 1 : 0);
