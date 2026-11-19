#!/usr/bin/env node
// round-3 판 고르기: 일반 L5~L50(추론 봇 D1 곡선) + 어려운 5단계 × 10판(추론 봇 D2 곡선). balance.json curve_r3 목표.
//   1) 후보(out/r3-normal-d1.json, out/r3-hard-pool-H*.json, 짧은 실행 값)에서 목표 창 안 판만 verify 와 같은 시드로 2000회 다시 잼
//      (D 봇 시드 = 판 생성 시드로만 정해져 자리와 무관 → 여기서 잰 값 = 전체 실행 값). 결과는 out/r3-exact.json 에 모아 둠
//   2) 챕터·단계마다 동적 계획법: 엄격 증가(이웃 비 ≥ gap), 자리 목표 ±win, 목적 = Σ|w/목표 − 1| + 같은 가족 연속 0.03
//   자리 조건: L5 = 구멍 없는 판(판 커짐 소개), L6 = 구멍 소개(판 안쪽 구멍이 있는 판). 판 모양 중복 없음.
// 사용법: node tools/r3-pick.mjs [--measure] [--part=normal|hard]   → tools/levels-r3.json
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_SLOTS, FAMILIES, HARD_STAGES } from './levels-config.mjs';
import { generate } from './gen/generate.mjs';
import { generateBig } from './gen/generate-big.mjs';
import { runJobs } from './sim/jobs.mjs';
import { mixSeed } from './core/rng.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = join(HERE, '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const bal = JSON.parse(readFileSync(join(PROJECT, 'balance.json'), 'utf8'));
const CV = bal.curve_r3, VS = bal.verify.seed, RUNS = CV.deduce_runs;
const PART = arg('part', 'all');
const exactFile = join(HERE, 'out', 'r3-exact.json');
const exact = existsSync(exactFile) ? JSON.parse(readFileSync(exactFile, 'utf8')) : {};
const cfgOf = (fam) => FAMILIES.find((x) => x.id === fam) || BASE_SLOTS.find((x) => x.id === fam);
const levelOf = (c) => (c.stage ? generateBig(HARD_STAGES[c.stage - 1], c.seed) : generate(cfgOf(c.fam), c.seed)).level;
const sigOf = (L) => JSON.stringify([L.width, L.height, L.holes, L.pairs.map((p) => [p.a, p.b])]);
const inner = (L) => L.holes.some(([x, y]) => x > 0 && y > 0 && x < L.width - 1 && y < L.height - 1);

// 목표
const NZ = CV.normal_zone, HZ = CV.hard_zone;
const chEnd = (c) => (c === 1 ? NZ.chapter1_end_target : NZ.chapter1_end_target * (NZ.last_end_target / NZ.chapter1_end_target) ** ((c - 1) / 4));
const normalTargets = [];
for (let L = 5; L <= 50; L++) {
  const c = Math.ceil(L / 10), p = ((L - 1) % 10) + 1;
  const S = c === 1 ? NZ.L5_target : NZ.chapter_start_frac * chEnd(c - 1), E = chEnd(c), p0 = c === 1 ? 5 : 1;
  normalTargets.push({ id: String(L).padStart(2, '0'), chapter: c, pos: p, t: S * (E / S) ** ((p - p0) / (10 - p0)) });
}
const hardTargets = [];
HZ.stage_ranges.forEach(([lo, hi], s) => { for (let p = 1; p <= HZ.boards_per_stage; p++) hardTargets.push({ id: `H${s + 1}-${String(p).padStart(2, '0')}`, stage: s + 1, pos: p, t: lo * (hi / lo) ** ((p - 1) / (HZ.boards_per_stage - 1)) }); });

// 후보
const normalCand = JSON.parse(readFileSync(join(HERE, 'out', 'r3-normal-d1.json'), 'utf8')).filter((x) => x.child_quick >= 34);
const hardCand = [];
for (const s of [1, 2, 3, 4, 5]) { const f = join(HERE, 'out', `r3-hard-pool-H${s}.json`); if (existsSync(f)) for (const x of JSON.parse(readFileSync(f, 'utf8'))) if (x.ok) hardCand.push({ ...x, stage: s, fam: `H${s}` }); }

if (process.argv.includes('--measure')) {
  const jobs = [], keys = [];
  if (PART !== 'hard') for (const x of normalCand) { if (exact[x.seed] || x.D1.w < 12 || x.D1.w > 200) continue; jobs.push({ name: 'deduce', arg: { cfg: cfgOf(x.fam), seed: x.seed, runs: RUNS, bots: ['D1', 'D2'], seedBase: mixSeed(VS, 4243, x.seed) } }); keys.push(x.seed); }
  if (PART !== 'normal') for (const x of hardCand) { const [lo, hi] = HZ.stage_ranges[x.stage - 1]; if (exact[x.seed] || x.D2.w < lo * 0.6 || x.D2.w > hi * 1.4) continue; jobs.push({ name: 'deduce', arg: { cfg: HARD_STAGES[x.stage - 1], big: true, seed: x.seed, runs: RUNS, bots: ['D1', 'D2'], seedBase: mixSeed(VS, 4243, x.seed) } }); keys.push(x.seed); }
  const t0 = Date.now();
  const res = await runJobs(jobs);
  res.forEach((r, i) => { exact[keys[i]] = { D1: r.D1, D2: r.D2, pairs: r.pairs }; });
  writeFileSync(exactFile, JSON.stringify(exact));
  console.log(`정확 측정 ${jobs.length}판, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

function dp(targets, cand, val, gapRatio, win, posOk) {
  const N = cand.length, P = targets.length, INF = 1e9;
  const cost = (p, j) => { if (posOk && !posOk(targets[p], cand[j])) return INF; const d = Math.abs(val(cand[j]) / targets[p].t - 1); return d <= win ? d : INF; };
  const dpv = targets.map(() => new Float64Array(N).fill(INF)), from = targets.map(() => new Int32Array(N).fill(-1));
  for (let j = 0; j < N; j++) dpv[0][j] = cost(0, j);
  for (let p = 1; p < P; p++) for (let j = 0; j < N; j++) {
    const cj = cost(p, j); if (cj >= INF) continue;
    for (let i = 0; i < N; i++) { if (dpv[p - 1][i] >= INF || i === j || val(cand[j]) < val(cand[i]) * gapRatio) continue; const v = dpv[p - 1][i] + cj + (cand[i].fam === cand[j].fam ? 0.03 : 0); if (v < dpv[p][j]) { dpv[p][j] = v; from[p][j] = i; } }
  }
  let best = -1; for (let j = 0; j < N; j++) if (dpv[P - 1][j] < INF && (best < 0 || dpv[P - 1][j] < dpv[P - 1][best])) best = j;
  if (best < 0) return null;
  const seq = []; for (let p = P - 1, j = best; p >= 0; j = from[p][j], p--) seq.unshift(cand[j]);
  return seq;
}

const outFile = join(HERE, 'levels-r3.json');
const out = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {};
out._note = 'round-3 판 배정: normal = L5~L50(가족·시드, gen-1), hard = 어려운 5단계 × 10판(단계·시드, gen-2). r3-pick.mjs 가 씀, levels-config.mjs·build-levels.mjs 가 읽음. 값 = verify 와 같은 시드로 잰 D1·D2 헛 이동 중앙값(2000회)';
const usedSig = new Set();
for (const f of readdirSync(join(PROJECT, 'levels')).filter((x) => /^0[1-4]-/.test(x))) usedSig.add(sigOf(JSON.parse(readFileSync(join(PROJECT, 'levels', f), 'utf8'))));

if (PART !== 'hard') {
  const pool = normalCand.filter((x) => exact[x.seed]).map((x) => ({ ...x, ex: exact[x.seed], L: null }));
  for (const x of pool) { x.L = levelOf(x); x.sig = sigOf(x.L); x.inner = inner(x.L); x.holes = x.L.holes.length; }
  const slots = [];
  for (let c = 1; c <= 5; c++) {
    const T = normalTargets.filter((t) => t.chapter === c);
    const cand = pool.filter((x) => !usedSig.has(x.sig)).sort((a, b) => a.ex.D1.w - b.ex.D1.w);
    const seq = dp(T, cand, (x) => x.ex.D1.w, 1.05, 0.15, (t, x) => (t.id === '05' ? x.holes === 0 : t.id === '06' ? x.holes > 0 && x.inner : true));
    if (!seq) { console.log(`챕터 ${c}: 배정 실패`); process.exitCode = 1; continue; }
    seq.forEach((x, i) => { usedSig.add(x.sig); slots.push({ id: T[i].id, chapter: c, chapter_pos: T[i].pos, family: x.fam, seed: x.seed, target_D1: +T[i].t.toFixed(2), D1: x.ex.D1.w, D2: x.ex.D2.w, child_quick: x.child_quick, pairs: x.L.pairs.length, holes: x.holes }); });
    console.log(`챕터 ${c}: ${seq.map((x, i) => `${x.fam}${x.ex.D1.w.toFixed(1)}(${T[i].t.toFixed(0)})`).join(' ')}`);
  }
  out.normal = slots;
}
if (PART !== 'normal') {
  const slots = [];
  for (let s = 1; s <= 5; s++) {
    const T = hardTargets.filter((t) => t.stage === s);
    const cand = hardCand.filter((x) => x.stage === s && exact[x.seed]).map((x) => ({ ...x, ex: exact[x.seed] })).filter((x) => x.ex.D2.fail / RUNS <= 0.05 && x.ex.D2.w <= HZ.max_wrong_median);
    for (const x of cand) x.sig = sigOf(levelOf(x));
    const seq = dp(T, cand.filter((x) => !usedSig.has(x.sig)).sort((a, b) => a.ex.D2.w - b.ex.D2.w), (x) => x.ex.D2.w, 1.02, 0.25, null);
    if (!seq) { console.log(`단계 ${s}: 배정 실패(후보 ${cand.length})`); process.exitCode = 1; continue; }
    seq.forEach((x, i) => { usedSig.add(x.sig); slots.push({ id: T[i].id, stage: s, stage_pos: T[i].pos, seed: x.seed, target_D2: +T[i].t.toFixed(2), D2: x.ex.D2.w, D2_fail: x.ex.D2.fail, D1: x.ex.D1.w, pairs: x.ex.pairs }); });
    console.log(`단계 ${s}: ${seq.map((x, i) => `${x.ex.D2.w.toFixed(2)}(${T[i].t.toFixed(1)})k${x.ex.pairs}`).join(' ')}`);
  }
  out.hard = slots;
}
writeFileSync(outFile, JSON.stringify(out, null, 1) + '\n');
