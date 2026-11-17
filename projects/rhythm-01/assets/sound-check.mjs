#!/usr/bin/env node
// rhythm-01 소리 원본(assets/sound.json) 검사. 30-art 12-4~12-6.
//
//   node assets/sound-check.mjs            형식 + 멜로디 동기 배치 검사 (node 만, 외부 의존 없음)
//   PLAYWRIGHT_CORE=<playwright-core 폴더> node assets/sound-check.mjs --render [--write]
//                                          + 설치된 Edge(channel msedge) 헤드리스 OfflineAudioContext 로
//                                            빌드 games/rhythm-01/js/audio.js 의 AudioOut.play 그대로 렌더해 크기 규칙 검사.
//                                            서버 불필요(page.route 로 디스크 파일을 응답). --write = 측정값을 sound.json 에 적음
//
// 실패가 하나라도 있으면 종료 코드 1.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = resolve(HERE, '..');
const ROOT = resolve(PROJ, '../..');
const SPATH = join(HERE, 'sound.json');
const S = JSON.parse(readFileSync(SPATH, 'utf8'));
const args = process.argv.slice(2);
let fail = 0;
const bad = (m) => { fail++; console.log('FAIL', m); };

// 1) 형식
const M = S.music;
if (typeof M.calib_check_hz !== 'number' || !(M.calib_check_hz > 0)) bad(`music.calib_check_hz 가 숫자가 아님: ${M.calib_check_hz}`);
const ids = Object.keys(M.levels).sort();
if (ids.join() !== '01,02,03,04,05,06,07,08,09,10') bad(`music.levels 키 ${ids.join()}`);
const R = M.melody;
for (const id of ids) {
  const lm = M.levels[id];
  for (const k of ['root3', 'fCl', 'fCh']) if (typeof lm[k] !== 'number') bad(`${id}.${k} 숫자 아님`);
  if (!Array.isArray(lm.scale) || !lm.scale.length) bad(`${id}.scale`);
  for (const ins of lm.melody) if (!S.sounds['mel_' + ins]) bad(`${id} 멜로디 악기 mel_${ins} 없음`);
  const mo = lm.motif;
  if (!Array.isArray(mo) || mo.length < 3) { bad(`${id}.motif 없음`); continue; }
  const seen = new Set();
  for (const n of mo) {
    if (!(Number.isInteger(n.s) && n.s >= 0 && n.s < R.frame_slots)) bad(`${id} 음 자리 ${n.s}`);
    if (!(Number.isInteger(n.d) && n.d >= 0 && n.d <= R.max_degree)) bad(`${id} 음 도수 ${n.d}`);
    if (!(n.len >= 1 && n.len <= R.max_len)) bad(`${id} 음 길이 ${n.len}`);
    if (seen.has(n.s)) bad(`${id} 같은 자리 두 음 ${n.s}`);
    seen.add(n.s);
  }
}
for (const [k, v] of Object.entries(S.sounds)) {
  if (typeof v !== 'object') continue;
  if (typeof v.db !== 'number' || !['sfx', 'music'].includes(v.bus) || !Array.isArray(v.layers)) bad(`sounds.${k} 형식`);
}

// 2) 멜로디 배치: build 가 쓰는 규칙(music.melody)을 그대로 적용해 별 시각에 시작하는 음 0 확인
export function placeMelody(level, lm, rule) {
  const stageOf = (b) => { let s = 1; for (const x of level.sections) if (x.start_bar <= b && x.stage) s = x.stage; return s; };
  const out = []; // {bar, slot, d, len, inst, harmony, shifted}
  let dropped = 0, shifted = 0;
  level.bars.forEach((bar, b) => {
    if (bar.mode !== 'play' || stageOf(b) < rule.from_stage) return;
    const stars = new Set(level.patterns[bar.pattern].slots);
    const half = b % rule.frame_bars;
    const used = new Set();
    lm.motif.forEach((n, idx) => {
      if (Math.floor(n.s / 8) !== half) return;
      const want = n.s % 8;
      const slot = rule.avoid_star.try.map((o) => want + o).find((s) => s >= 0 && s < 8 && !stars.has(s) && !used.has(s));
      if (slot == null) { dropped++; return; }
      if (slot !== want) shifted++;
      used.add(slot);
      const inst = lm.melody[idx % lm.melody.length];
      out.push({ bar: b, slot, d: n.d, len: n.len, inst });
      if (stageOf(b) >= rule.harmony.from_stage) out.push({ bar: b, slot, d: n.d + rule.harmony.deg_plus, len: n.len, inst, harmony: true });
    });
  });
  return { notes: out, dropped, shifted };
}
{
  const dir = join(PROJ, 'levels');
  let total = 0, clash = 0;
  const rows = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const level = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const lm = M.levels[level.id];
    if (!lm) { bad(`레벨 ${level.id} 소리 정보 없음`); continue; }
    const { notes, dropped, shifted } = placeMelody(level, lm, R);
    const main = notes.filter((n) => !n.harmony);
    for (const n of main) {
      const bar = level.bars[n.bar];
      if (level.patterns[bar.pattern].slots.includes(n.slot)) clash++;
    }
    total += main.length;
    rows.push(`${level.id}: 음 ${main.length}(화음 ${notes.length - main.length}) 옮김 ${shifted} 뺌 ${dropped}`);
  }
  console.log('멜로디', rows.join(' / '));
  console.log(`멜로디 음 ${total}개, 별 시각에 시작 ${clash}개`);
  if (clash) bad('별 시각에 시작하는 멜로디 음');
}

// 3) 크기 (오프라인 렌더)
if (args.includes('--render')) {
  if (!process.env.PLAYWRIGHT_CORE) { console.log('PLAYWRIGHT_CORE 가 없음'); process.exit(2); }
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE);
  const b = await chromium.launch({ channel: 'msedge', headless: true });
  const p = await b.newPage();
  const ORIGIN = 'http://sound-check.localhost';
  await p.route(ORIGIN + '/**', (route) => {
    const u = new URL(route.request().url()).pathname;
    if (u === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>sound-check</title>' });
    return route.fulfill({ contentType: 'text/javascript', body: readFileSync(join(ROOT, u)) });
  });
  await p.goto(ORIGIN + '/');
  const res = await p.evaluate(async (S) => {
    const { AudioOut } = await import('/games/rhythm-01/js/audio.js');
    const music = S.music, sr = 48000, out = {};
    const names = Object.keys(S.sounds).filter((k) => typeof S.sounds[k] === 'object');
    // 음 높이가 있는 소리: 10레벨 근음 전부 (멜로디는 동기 최저·최고 도수)
    const fOf = (name, lm) => {
      if (name === 'bass') return [lm.root3 / 2];
      if (name === 'pad') return [lm.root3];
      if (name.startsWith('mel_')) {
        const sc = (d) => lm.root3 * music.melody.octave_mul * Math.pow(2, (lm.scale[d % lm.scale.length] + 12 * Math.floor(d / lm.scale.length)) / 12);
        const ds = lm.motif.map((n) => n.d);
        return [sc(Math.min(...ds)), sc(Math.max(...ds) + music.melody.harmony.deg_plus)];
      }
      return [null];
    };
    for (const name of names) {
      const def = S.sounds[name];
      const pitched = def.note || def.arpeggio || ['bass', 'pad'].includes(name) || name.startsWith('mel_');
      let worst = null;
      for (const id of pitched ? Object.keys(music.levels) : ['01']) {
        const lm = music.levels[id];
        if (name.startsWith('mel_') && !lm.melody.includes(name.slice(4))) continue;
        for (const f of fOf(name, lm)) {
          const ctx = new OfflineAudioContext(1, sr * 2, sr);
          const a = new AudioOut(S, music);
          a.ctx = ctx; a._graph(); a.levelMusic = lm;
          a.play(name, 0.05, { f, dur: 0.3 });
          const d = (await ctx.startRendering()).getChannelData(0);
          let pk = 0; for (const v of d) pk = Math.max(pk, Math.abs(v));
          const s0 = Math.floor((0.05 + (def.delayMs || 0) / 1000) * sr), N = Math.floor(0.1 * sr);
          let ss = 0; for (let i = 0; i < N; i++) ss += d[s0 + i] ** 2;
          const r = { peak: 20 * Math.log10(pk), rms: 10 * Math.log10(ss / N), lv: id };
          if (!worst || r.peak > worst.peak) worst = { ...r, rmsMin: Math.min(r.rms, worst?.rmsMin ?? 0) };
          else worst.rmsMin = Math.min(worst.rmsMin, r.rms);
        }
      }
      if (worst) out[name] = worst;
    }
    return out;
  }, S);
  await b.close();
  const V = S.verify.loudness_rule;
  const taps = V.child_tap;
  const tapPeakMin = Math.min(...taps.map((k) => res[k].peak));
  const tapRmsMin = Math.min(...taps.map((k) => res[k].rmsMin));
  let sfxMax = -999, sfxMaxName = '';
  for (const [k, v] of Object.entries(res)) {
    console.log(`${k.padEnd(10)} db ${String(S.sounds[k].db).padStart(4)}  peak ${v.peak.toFixed(2)}  rms100 ${v.rms.toFixed(2)}  (가장 큰 레벨 ${v.lv})`);
    if (S.sounds[k].bus === 'sfx' && !taps.includes(k) && v.peak > sfxMax) { sfxMax = v.peak; sfxMaxName = k; }
  }
  const m1 = tapPeakMin - sfxMax, m2 = tapRmsMin - res[V.teacher].rms;
  console.log(`아이 탭 최고값 최소 ${tapPeakMin.toFixed(2)} − 다른 효과음 최고 ${sfxMax.toFixed(2)}(${sfxMaxName}) = ${m1.toFixed(2)} dB (기준 ≥ ${V.tap_over_sfx_peak_db})`);
  console.log(`아이 탭 RMS 최소 ${tapRmsMin.toFixed(2)} − 둥둥이 RMS ${res[V.teacher].rms.toFixed(2)} = ${m2.toFixed(2)} dB (기준 ≥ ${V.tap_over_teacher_rms_db})`);
  if (m1 < V.tap_over_sfx_peak_db) bad('아이 탭이 다른 효과음보다 충분히 크지 않음');
  if (m2 < V.tap_over_teacher_rms_db) bad('아이 탭과 둥둥이 RMS 차 부족');
  if (args.includes('--write')) {
    for (const [k, v] of Object.entries(res)) { S.sounds[k].peak_db = +v.peak.toFixed(1); S.sounds[k].rms_db = +v.rms.toFixed(1); }
    S.verify.measured = { tap_peak_min: +tapPeakMin.toFixed(2), sfx_peak_max: +sfxMax.toFixed(2), sfx_peak_max_sound: sfxMaxName, tap_over_sfx_peak_db: +m1.toFixed(2), tap_rms_min: +tapRmsMin.toFixed(2), teacher_rms: +res[V.teacher].rms.toFixed(2), tap_over_teacher_rms_db: +m2.toFixed(2), how: 'node assets/sound-check.mjs --render (Edge OfflineAudioContext 48 kHz, 빌드 AudioOut.play, 마스터 컴프레서 뒤, 소리 하나씩)' };
    writeFileSync(SPATH, JSON.stringify(S, null, 1).replace(/\{\n\s+"s": (\d+),\n\s+"d": (\d+),\n\s+"len": (\d+)\n\s+\}/g, '{ "s": $1, "d": $2, "len": $3 }') + '\n');
    console.log('sound.json 에 측정값을 적음');
  }
}

console.log(fail ? `FAIL ${fail}` : 'sound-check OK');
process.exit(fail ? 1 : 0);
