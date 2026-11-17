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
console.log(`${checks - fails}/${checks} OK`);
process.exit(fails ? 1 : 0);
