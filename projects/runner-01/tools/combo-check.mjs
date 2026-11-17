#!/usr/bin/env node
// 콤보 판정 탭 검사 (runner-01, balance-designer round-2 콤보)
//
//   node projects/runner-01/tools/combo-check.mjs [시도 수=2000] [레벨 id 쉼표|all] [프로필 쉼표=child_sd70,skilled_sd25]
//
// 정적 검사 (레벨마다)
//   C1 judge_taps 수 = 검증기 필수 탭 수, 종류(ground/orb)와 박이 같음
//   C2 판정 창 ⊇ 살아남는 창, 같은 종류 이웃 탭의 판정 창이 겹치지 않음
//   C3 검증기 입력열(박에 맞춘 완벽 입력)로 클리어 → 판정 수 = 탭 수, 모두 1단
//   C4 연습 모드 안전 지점(balance.practice)이 어떤 판정 창 안에도 없음 → 부활 때 0부터 세도 걸친 탭이 없음
// 봇 검사 (tools/sim/bots.mjs와 같은 봇 모델·같은 시드: σ, 놓침, 0.15~0.45 s 뒤 헛탭, 100 ms 누름)
//   B1 클리어한 시도에서 성공 판정 수 = 탭 수 (불일치 0이어야 함)
//   B2 콤보를 붙인 실행과 안 붙인 실행의 결과(클리어 여부·사망 x)가 모든 시도에서 같음
//   B3 등급 분포(모든 시도의 모든 판정), 클리어율(같은 시드의 bots.mjs 클리어율과 같아야 함)
import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileLevel, step, startState, simulate } from '../../../games/reverbound/js/physics.js';
import { safePoints } from '../../../games/reverbound/js/practice.js';
import { verifyLevel, loadBalance } from './verify-levels.mjs';
import { createComboJudge } from './sim/combo-ref.mjs';

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const N = +(args[0] || 2000);
const onlyIds = args[1] && args[1] !== 'all' ? args[1].split(',') : null;
const profNames = (args[2] || 'child_sd70,skilled_sd25').split(',');
const profiles = { skilled_sd25: { sd: 25, miss: 0, extra: 0 }, novice_sd50: { sd: 50, miss: 0.01, extra: 0.01 }, child_sd70: { sd: 70, miss: 0.03, extra: 0.02 }, child_sd90: { sd: 90, miss: 0.05, extra: 0.03 } };
const bal = loadBalance();
const hz = bal.physics_hz;
let fail = 0;
const summary = [];

for (const f of bal.levels) {
  const level = JSON.parse(readFileSync(join(PROJECT, f), 'utf8'));
  if (onlyIds && !onlyIds.includes(level.id)) continue;
  const L = compileLevel(level, bal);
  const v = verifyLevel(join(PROJECT, f), bal);
  const taps = level.judge_taps ?? [];
  const probs = [];
  // C1
  if (taps.length !== v.inputs.length) probs.push(`C1 판정 탭 ${taps.length} ≠ 필수 탭 ${v.inputs.length}`);
  else v.inputs.forEach((r, i) => { if (r.kind !== taps[i].kind || Math.abs(Math.round(r.beat * 2) / 2 - taps[i].beat) > 1e-9) probs.push(`C1 탭 ${i} 종류·박 불일치`); });
  // C2
  for (const t of taps) if (t.early_ms < t.safe_early_ms - 1e-6 || t.late_ms < t.safe_late_ms - 1e-6) probs.push(`C2 탭 ${t.i} 판정 창이 살아남는 창보다 좁음`);
  for (const kind of ['ground', 'orb']) {
    const g = taps.filter((t) => t.kind === kind);
    for (let j = 1; j < g.length; j++) if (g[j - 1].t_s + g[j - 1].late_ms / 1000 >= g[j].t_s - g[j].early_ms / 1000) probs.push(`C2 탭 ${g[j - 1].i}·${g[j].i} 판정 창 겹침`);
  }
  // 실행기: bots.mjs run()과 같은 입력 모델 + 누름 번호. judge가 있으면 콤보도 셈
  const run = (tapTicks, judge) => {
    tapTicks.sort((a, b) => a - b);
    const starts = new Set(tapTicks);
    let s = startState(L), j = 0, until = -1, press = null, nextId = 0;
    if (judge) judge.reset(0);
    for (let k = 0; k < L.nTicks; k++) {
      while (j < tapTicks.length && tapTicks[j] <= k) { until = Math.max(until, tapTicks[j] + 24); j++; }
      const down = k < until, edge = starts.has(k);
      if (edge) press = nextId++; else if (!down) press = null;
      const r = step(L, s, k, down, edge);
      if (r.dead) { if (judge) judge.onDeath(); return { clear: false, x: r.x }; }
      if (judge) judge.onStep(k, r.ev, down ? press : null);
      if (r.clear) return { clear: true };
      s = r.s;
    }
    return { clear: false, x: L.level.length_tiles };
  };
  // C3
  {
    const J = createComboJudge(taps, bal.combo, hz);
    const r = run(v.inputs.map((x) => x.tick), J);
    if (!r.clear) probs.push('C3 완벽 입력이 클리어 안 됨');
    if (J.grades.length !== taps.length) probs.push(`C3 완벽 입력 판정 ${J.grades.length} ≠ ${taps.length}`);
    if (J.grades.some((g) => g.grade !== 1)) probs.push(`C3 완벽 입력에 1단이 아닌 판정 ${J.grades.filter((g) => g.grade !== 1).length}`);
  }
  // C4
  let nSafe = 0;
  {
    const pr = bal.practice;
    const onBeat = v.inputs.map((r) => Math.round((Math.round(r.beat * 2) / 2) * (60 / level.bpm) * hz));
    const sp = safePoints(L, [v.inputs.map((x) => x.tick), onBeat], pr);
    nSafe = sp.size;
    for (const k of sp.keys()) for (const t of taps) {
      const lo = (t.t_s - t.early_ms / 1000) * hz, hi = (t.t_s + t.late_ms / 1000) * hz;
      if (k >= lo && k <= hi) probs.push(`C4 안전 지점 틱 ${k}가 탭 ${t.i} 판정 창 안`);
    }
  }
  // 봇 (bots.mjs와 같은 시드·같은 난수 순서)
  const base = v.inputs.map((r) => r.tick);
  const res = { id: level.id, taps: taps.length, safe_points: nSafe, static_problems: probs.length };
  for (const pn of profNames) {
    const p = profiles[pn];
    let seed = 12345;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const gauss = () => { let u = 0, w = 0; while (!u) u = rnd(); while (!w) w = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w); };
    let clears = 0, mismatch = 0, onoff = 0;
    const g = [0, 0, 0, 0], gClear = [0, 0, 0, 0];
    const eAbs = [];
    let firstMismatch = null;
    for (let n = 0; n < N; n++) {
      const tt = [];
      for (const k of base) {
        if (rnd() < p.miss) continue;
        tt.push(Math.max(0, Math.round(k + (gauss() * p.sd / 1000) * hz)));
        if (rnd() < p.extra) tt.push(Math.round(k + (0.15 + rnd() * 0.3) * hz));
      }
      const J = createComboJudge(taps, bal.combo, hz);
      const a = run(tt.slice(), J), b = run(tt.slice(), null);
      if (a.clear !== b.clear || a.x !== b.x) onoff++;
      for (const x of J.grades) { g[x.grade]++; eAbs.push(Math.abs(x.e_ms)); }
      if (a.clear) {
        clears++;
        for (const x of J.grades) gClear[x.grade]++;
        if (J.grades.length !== taps.length) {
          mismatch++;
          if (!firstMismatch) firstMismatch = { attempt: n, judged: J.grades.length, missing: taps.filter((t, i) => !J.grades.some((x) => x.i === i)).map((t) => `탭${t.i}(박${t.beat})`) };
        }
      }
    }
    const tot = g[1] + g[2] + g[3], totC = gClear[1] + gClear[2] + gClear[3];
    const pct = (x, t) => +(100 * x / (t || 1)).toFixed(1);
    res[pn] = { attempts: N, clear_rate: +(clears / N).toFixed(3), clears, count_mismatch: mismatch, onoff_mismatch: onoff,
      grade_pct_all: [pct(g[1], tot), pct(g[2], tot), pct(g[3], tot)], grade_pct_clear_runs: [pct(gClear[1], totC), pct(gClear[2], totC), pct(gClear[3], totC)], judgements: tot,
      first_mismatch: firstMismatch };
    if (mismatch || onoff) probs.push(`${pn}: 판정 수 불일치 ${mismatch}, 켠/끈 결과 불일치 ${onoff}`);
  }
  if (probs.length) fail++;
  summary.push(res);
  console.log(`${probs.length ? 'FAIL' : 'OK  '} ${level.id} 탭 ${taps.length}, 안전 지점 ${nSafe}` +
    profNames.map((pn) => ` | ${pn}: 클리어 ${res[pn].clears}/${N} (${res[pn].clear_rate}), 판정 수 불일치 ${res[pn].count_mismatch}, 켠/끈 불일치 ${res[pn].onoff_mismatch}, 등급 1/2/3 ${res[pn].grade_pct_all.join('/')} % (클리어 시도 ${res[pn].grade_pct_clear_runs.join('/')} %)`).join(''));
  for (const p of probs.slice(0, 8)) console.log('   ' + p);
  for (const pn of profNames) if (res[pn].first_mismatch) console.log(`   ${pn} 첫 불일치: ${JSON.stringify(res[pn].first_mismatch)}`);
}
if (args.includes('--json')) console.log(JSON.stringify(summary, null, 1));
console.log(fail ? `\n결과: FAIL ${fail}` : '\n결과: ALL OK');
process.exitCode = fail ? 1 : 0;
void simulate;
