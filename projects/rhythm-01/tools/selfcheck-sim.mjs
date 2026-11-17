#!/usr/bin/env node
// 웹 빌드 엔진(games/rhythm-01/js/engine.js) ↔ 판정 기준 구현(tools/sim/judge.mjs) 대조 (node 만)
//   node projects/rhythm-01/tools/selfcheck-sim.mjs
// 레벨 10개 × (완벽 입력열, 무입력, 박마다 치기, 오차 봇 σ25/50/70/90 + 헛탭 각 200회)를 한 탭씩 엔진에 넣어
// 첫 시도의 클리어/실패 위치/이유/판정 목록이 judgeAttempt 와 같은지 본다. 재시작 1.08 s, 연습 체크포인트 재시작도 확인.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PROJ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = resolve(PROJ, '../../games/rhythm-01');
const { compileLevel, judgeAttempt } = await import(pathToFileURL(join(PROJ, 'tools/sim/judge.mjs')).href);
const { prepareLevel, Run } = await import(pathToFileURL(join(GAME, 'js/engine.js')).href);
const bal = JSON.parse(readFileSync(join(GAME, 'data/balance.json'), 'utf8'));
const levels = bal.levels.map((p) => JSON.parse(readFileSync(join(GAME, 'data', p), 'utf8')));

let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());

function runEngine(L, taps, startV = 1000) {
  const r = new Run(L, bal, { startV });
  for (const tau of [...taps].sort((a, b) => a - b)) {
    if (r.phase !== 'run' && r.phase !== 'clearing') break;
    const V = r.songStartV + tau;
    r.update(V);
    if (r.phase !== 'run' && r.phase !== 'clearing') break;
    r.tap(V);
  }
  let V = r.songStartV;
  while (r.log.length === 0 && V < r.songStartV + L.durationMs + 5000) { V += 7; r.update(V); }
  return { r, first: r.log[0] };
}

let fails = 0, checks = 0;
const bad = (m) => { fails++; if (fails < 20) console.log('FAIL', m); };
for (const lv of levels) {
  const L0 = compileLevel(lv, bal);
  const L = prepareLevel(lv, bal);
  const perfect = L0.stars.map((s) => s.t);
  const sets = [['perfect', perfect], ['none', []], ['beats', Array.from({ length: Math.ceil(L0.durationMs / L0.beatMs) }, (_, k) => k * L0.beatMs)]];
  for (const sd of [25, 50, 70, 90]) for (let k = 0; k < 200; k++) {
    const taps = [];
    for (const s of L0.stars) {
      if (rnd() < 0.03) continue;
      const t = s.t + gauss() * sd;
      taps.push(t);
      if (rnd() < 0.05) taps.push(t + 150 + rnd() * 300);
    }
    for (const s of L0.shows) if (rnd() < 0.3) taps.push(s.t + gauss() * sd);
    sets.push([`sd${sd}`, taps]);
  }
  for (const [name, taps] of sets) {
    checks++;
    const ref = judgeAttempt(L0, taps);
    const { first } = runEngine(L, taps);
    const same = first && ref.clear === first.clear && (ref.clear || (ref.failIndex === first.failIndex && ref.reason === first.reason)) &&
      ref.grades.length === first.grades.length && ref.grades.every((g, i) => g.grade === first.grades[i].grade && Math.abs(g.e - first.grades[i].e) < 1e-6);
    if (!same) bad(`L${lv.id} ${name}: ref ${JSON.stringify({ c: ref.clear, i: ref.failIndex, r: ref.reason, n: ref.grades.length })} engine ${JSON.stringify(first && { c: first.clear, i: first.failIndex, r: first.reason, n: first.grades.length })}`);
  }
  // 완벽 입력열 클리어 + 끝까지 진행
  {
    const { r } = runEngine(L, perfect);
    let V = r.songStartV; while (r.phase !== 'done' && V < r.songStartV + L.durationMs + 100) { V += 16; r.update(V); }
    checks++; if (r.phase !== 'done' || r.grade !== 3) bad(`L${lv.id} perfect: phase ${r.phase} grade ${r.grade}`);
  }
  // 무입력: 실패 → 1.08 s 뒤 재시작, 시도 2
  {
    const r = new Run(L, bal, { startV: 0 });
    let V = 0, failV = null, restartAt = null;
    while (V < 20000 && restartAt === null) {
      V += 1; r.update(V);
      for (const e of r.events.splice(0)) { if (e.type === 'fail') failV = e.V; if (e.type === 'attempt' && failV !== null) restartAt = e.startV; }
    }
    const d = restartAt - failV;
    checks++; if (Math.abs(d - bal.restart.restart_delay_s * 1000) > 0.5 || r.attempts !== 2 || r.lt(restartAt) !== 0) bad(`L${lv.id} restart ${d} ms attempts ${r.attempts}`);
  }
  // 연습: 두 번째 체크포인트 뒤에서 실패 → 그 체크포인트에서 재시작
  {
    const r = new Run(L, bal, { practice: true, startV: 0 });
    const cp2 = L.checkpoints[1];
    const stop = L.stars.findIndex((s) => s.t > cp2.t);
    for (const s of L.stars.slice(0, stop)) { r.update(r.songStartV + s.t); r.tap(r.songStartV + s.t); }
    let V = r.songStartV + L.stars[stop].passEnd + 1;
    r.update(V); V = r.restartV + 1; r.update(V);
    checks++; if (r.t0 !== cp2.t || r.i !== cp2.firstStar || r.lt(V) < cp2.t) bad(`L${lv.id} practice cp t0 ${r.t0} vs ${cp2.t}`);
    // 그 뒤 완벽 입력으로 클리어
    for (const s of L.stars.slice(r.i)) { r.update(r.songStartV + s.t); r.tap(r.songStartV + s.t); }
    r.update(r.songStartV + L.durationMs + 1);
    checks++; if (r.phase !== 'done') bad(`L${lv.id} practice clear ${r.phase}`);
  }
}
// 밀림 감지(drift_check): 탭이 +100 ms 밀린 채 3번 시도 → 3번째 시도에서 켜짐, 정상 입력은 안 켜짐
for (const [off, want] of [[100, true], [0, false]]) {
  const L = prepareLevel(levels[0], bal);
  const r = new Run(L, bal, { startV: 0 });
  let on = null;
  for (let a = 0; a < 3; a++) {
    for (const st of L.stars.slice(0, 10)) { const V = r.songStartV + st.t + off; r.update(V); r.tap(V); }
    let V = r.songStartV + L.stars[10].passEnd + 1; r.update(V); r.update(r.restartV + 1);
    for (const e of r.events.splice(0)) if (e.type === 'drift' && on === null) on = e.attempt;
  }
  checks++; if ((on !== null) !== want || (want && on !== 3)) bad(`drift off ${off}: 켜진 시도 ${on}`);
}
// 보호자 보정 계산
{
  const { simulate } = await import(pathToFileURL(join(GAME, 'js/calib.js')).href);
  const gc = bal.audio_latency.guardian_calibration;
  const mk = (m, j) => Array.from({ length: 8 }, (_, k) => m + ((k * 7) % 5 - 2) * j);
  const cases = [
    ['블루투스 +160', [mk(160, 8), mk(165, 8)], (r) => r.ok && Math.abs(r.offset - 162) < 15],
    ['보통 기기 +12 → 0', [mk(12, 6), mk(8, 6)], (r) => r.ok && r.offset === 0],
    ['-45 적용', [mk(-45, 5), mk(-40, 5)], (r) => r.ok && r.offset < -30],
    ['IQR 큼 2회 → 유지', [mk(0, 120), mk(0, 120)], (r) => !r.ok],
    ['두 회 차이 > 60, 다시 해서 맞음', [mk(0, 5), mk(100, 5), mk(150, 5), mk(150, 5)], (r) => r.ok && Math.abs(r.offset - 150) < 12],
    ['자름 300', [mk(400, 5), mk(400, 5)], (r) => r.ok && r.offset === 300],
  ];
  for (const [name, rounds, okf] of cases) { checks++; const r = simulate(rounds, gc); if (!okf(r)) bad(`calib ${name}: ${JSON.stringify(r)}`); }
}
// ---- round-2 R1·R2: 북채(+점선)·손가락 시각 (엔진 malletAt·cueVisible = 렌더가 쓰는 함수) ----
{
  const { malletAt, cueVisible } = await import(pathToFileURL(join(GAME, 'js/engine.js')).href);
  const { malletSchedule } = await import(pathToFileURL(join(PROJ, 'tools/sim/judge.mjs')).href);
  const art = JSON.parse(readFileSync(join(GAME, 'data/art.json'), 'utf8'));
  const tc = bal.teacher;
  let wins = 0, capped = 0;
  for (const lv of levels) {
    const L = prepareLevel(lv, bal);
    const ref = malletSchedule(compileLevel(lv, bal), bal);
    checks++;
    if (ref.length !== L.malletWins.length || ref.some((w, i) => Math.abs(w.gone - L.malletWins[i].gone) > 1e-6 || Math.abs(w.shrinkStart - L.malletWins[i].shrinkStart) > 1e-6 || Math.abs(w.from - L.malletWins[i].from) > 1e-6)) bad(`R1 L${lv.id}: 엔진 북채 창 ≠ malletSchedule`);
    for (const w of L.malletWins) {
      wins++; if (w.capped) capped++;
      checks++;
      const after = w.lastShow + (tc.mallet_hide_after_beats + tc.mallet_shrink_beats) * L.beatMs;
      if (w.gone > after + 1e-6 || w.shrinkStart < w.lastShow - 1e-6 || Math.abs(w.gone - w.shrinkStart - tc.mallet_shrink_beats * L.beatMs) > 1e-6) bad(`R1 L${lv.id} 묶음 ${w.firstBar}: 시각 ${JSON.stringify(w)}`);
    }
    // 1 ms 간격: 북채 보이는 동안 판정 별 [놓침 구역 시작, 통과 창 끝] 없음, 손가락과 동시에 안 보임
    const run = new Run(L, bal, { startV: 0 });
    let handFirst = null, handMallet = 0, malletStar = 0;
    for (let x = 0; x < L.durationMs; x += 1) {
      const m = malletAt(L, x, art.mallet.growBeats * L.beatMs, art.mallet.grow[0]);
      const h = cueVisible(L, run, x);
      if (h && handFirst === null) handFirst = x;
      if (m && h) handMallet++;
      if (m && L.stars.some((s) => x >= s.zoneStart && x <= s.passEnd)) malletStar++;
    }
    checks++; if (handMallet || malletStar) bad(`R1 L${lv.id}: 손가락∩북채 ${handMallet} ms, 북채∩판정 별 위험 구간 ${malletStar} ms`);
    if (L.cue) {
      const st = L.stars[L.cue.star];
      checks++;
      if (L.cue.pressFrom < st.passStart - 1e-6 || Math.abs(L.cue.t - L.cue.pressFrom - lv.cues[0].press_from_beats_before * L.beatMs) > 1e-6) bad(`R2 L${lv.id}: 누름 시작 ${L.cue.pressFrom - st.t} ms (통과 창 시작 ${-L.judge.pass_early_ms})`);
      console.log(`R1·R2 L${lv.id}: 손가락 ${handFirst} ms~, 누름 ${Math.round(L.cue.pressFrom - st.t)} ms(별 기준), 가장 가까운 북채 사라짐 ${Math.round(Math.max(...L.malletWins.filter((w) => w.gone <= handFirst).map((w) => w.gone)))} ms`);
    }
  }
  console.log(`R1: 북채 묶음 ${wins}개(상한 ${capped}) 엔진 = malletSchedule, 손가락∩북채 0, 북채∩판정 별 위험 구간 0`);
}
// ---- round-2 R7: 멜로디 동기 배치 (audio.js buildSong) — 별 시각 시작 0, 음 수 = assets/sound-check.mjs ----
{
  const { buildSong } = await import(pathToFileURL(join(GAME, 'js/audio.js')).href);
  const music = JSON.parse(readFileSync(join(GAME, 'data/music.json'), 'utf8'));
  const sound = JSON.parse(readFileSync(join(GAME, 'data/sound.json'), 'utf8'));
  let notes = 0, clash = 0, duckShow = 0, duckPlay = 0;
  for (const lv of levels) {
    const L = prepareLevel(lv, bal);
    const r = new Run(L, bal, { startV: 0 });
    const ev = buildSong(L, 0, music, sound, (x) => r.barMode(x), (b) => { let s = 1; for (const x of lv.sections) if (x.start_bar <= b && x.stage) s = x.stage; return s; });
    const outroX = (L.countInBars + L.lastPlayBar + 1) * L.barMs;
    const mel = ev.filter((e) => e.name && e.name.startsWith('mel_') && e.gainDb == null && e.x < outroX - 1);
    notes += mel.length;
    for (const e of mel) if (L.stars.some((s) => Math.abs(s.t - e.x) < 0.5)) clash++;
    const ducks = ev.filter((e) => e.duck).map((e) => e.x);
    duckPlay += L.stars.filter((s) => ducks.some((d) => Math.abs(d - s.t) < 0.5)).length;
    duckShow += L.shows.filter((s) => ducks.some((d) => Math.abs(d - s.t) < 0.5)).length;
    checks++; if (ducks.length !== L.stars.length + L.shows.length) bad(`R7 L${lv.id}: 베이스 숙임 ${ducks.length} ≠ 별 ${L.stars.length} + 보여 주기 ${L.shows.length}`);
  }
  const { spawnSync } = await import('node:child_process');
  const sc = spawnSync(process.execPath, [join(PROJ, 'assets/sound-check.mjs')], { encoding: 'utf8' });
  const want = +((sc.stdout.match(/멜로디 음 (\d+)개/) || [])[1]);
  checks++; if (clash || notes !== want) bad(`R7 멜로디: 빌드 ${notes}음(기준 ${want}) 별 시각 시작 ${clash}`);
  checks++; if (music.calib_check_hz !== 1046.5) bad(`R7 calib_check_hz ${music.calib_check_hz}`);
  console.log(`R7: 멜로디 ${notes}음 = sound-check ${want}음, 별 시각 시작 ${clash}, 베이스 숙임 판정 별 ${duckPlay}·보여 주기 별 ${duckShow}, calib_check_hz ${music.calib_check_hz}`);
}
console.log(`${checks - fails}/${checks} OK`);
process.exit(fails ? 1 : 0);
