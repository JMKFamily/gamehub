#!/usr/bin/env node
// round-4 어려운 판 다시 고르기(T4 L10 → H1 이음, T10 찍기 판, T11 단계 시작 0.75배). 결과는 tools/levels-r3.json 의 hard 를 바꿈.
//   단계 1 = 이음 단계(지표 D1, 상한 5000): H1-01 은 6x6·선 10(기본 판 그대로, 선만 늘어남 + 큰 그림 카드), 그 뒤 7x7 → 8x8 → 9x9.
//     목표 D1: H1-01 = 0.5·D1(L10) (새 방식 첫 판 숨 고르기) → H1-10 = r4.h1_end_D1, 이웃 비 ≤ 2(T-2x 와 같은 2배 한도)
//   단계 2~5 = D2 지표: 단계 2 시작 2.0, 단계 s(≥ 3) 시작 = 0.75·(앞 단계 끝 실제 값), 끝 목표 [6, 11, 17, 22]. 찍기 판 제외(D2 p90 ≤ 10·중앙값), 못 풂 ≤ 5 %
//   값은 모두 verify 와 같은 시드(판 고유)로 2000회 잰 값(out/r3-exact.json·out/r4-exact.json)
// 사용법: node tools/r4-pick.mjs [--measure]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HARD_STAGES } from './levels-config.mjs';
import { generateBig } from './gen/generate-big.mjs';
import { runJobs } from './sim/jobs.mjs';
import { mixSeed } from './core/rng.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = join(HERE, '..');
const bal = JSON.parse(readFileSync(join(PROJECT, 'balance.json'), 'utf8'));
const CV = bal.curve_r3, HZ = CV.hard_zone, R4 = HZ.r4, VS = bal.verify.seed, RUNS = CV.deduce_runs;
const ex3 = JSON.parse(readFileSync(join(HERE, 'out', 'r3-exact.json'), 'utf8'));
const ex4File = join(HERE, 'out', 'r4-exact.json');
const ex4 = existsSync(ex4File) ? JSON.parse(readFileSync(ex4File, 'utf8')) : {};
const L10 = JSON.parse(readFileSync(join(PROJECT, 'levels', '10-level10.json'), 'utf8'));
const r3 = JSON.parse(readFileSync(join(HERE, 'levels-r3.json'), 'utf8'));
const L10D1 = r3.normal.find((x) => x.id === '10').D1;
const sigOf = (L) => JSON.stringify([L.width, L.height, L.holes, L.pairs.map((p) => [p.a, p.b])]);

// 이음 후보: out/r4-bridge-pool.json(6x6·7x7·8x8 선 10~12, gen-2) + 9x9 H1 풀 중 D1 < 3500
const bridge = JSON.parse(readFileSync(join(HERE, 'out', 'r4-bridge-pool.json'), 'utf8')).map((x) => ({ seed: x.seed, cfg: x.cfg, tag: x.tag, q: x.D1.w }));
for (const x of JSON.parse(readFileSync(join(HERE, 'out', 'r4-h1-d1.json'), 'utf8'))) if (x.D1.w < 3500) bridge.push({ seed: x.seed, cfg: HARD_STAGES[0], tag: 'B9', q: x.D1.w });
if (process.argv.includes('--measure')) {
  const todo = bridge.filter((x) => !ex4[x.seed]);
  const t0 = Date.now();
  const res = await runJobs(todo.map((x) => ({ name: 'deduce', arg: { cfg: x.cfg, big: true, seed: x.seed, runs: RUNS, bots: ['D1', 'D2'], seedBase: mixSeed(VS, 4243, x.seed) } })));
  todo.forEach((x, i) => { ex4[x.seed] = { D1: res[i].D1, D2: res[i].D2, pairs: res[i].pairs }; });
  writeFileSync(ex4File, JSON.stringify(ex4));
  console.log(`이음 후보 정확 측정 ${todo.length}판, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

function dp(T, cand, val, ratioMin, ratioMax, win, posOk) {
  const N = cand.length, P = T.length, INF = 1e9;
  const cost = (p, j) => { if (posOk && !posOk(p, cand[j])) return INF; const d = Math.abs(Math.log(val(cand[j]) / T[p])); return d <= win ? d : INF; };
  const dv = T.map(() => new Float64Array(N).fill(INF)), fr = T.map(() => new Int32Array(N).fill(-1));
  for (let j = 0; j < N; j++) dv[0][j] = cost(0, j);
  for (let p = 1; p < P; p++) for (let j = 0; j < N; j++) {
    const cj = cost(p, j); if (cj >= INF) continue;
    for (let i = 0; i < N; i++) { if (i === j || dv[p - 1][i] >= INF) continue; const r = val(cand[j]) / val(cand[i]); if (r < ratioMin || r > ratioMax) continue; const v = dv[p - 1][i] + cj; if (v < dv[p][j]) { dv[p][j] = v; fr[p][j] = i; } }
  }
  let b = -1; for (let j = 0; j < N; j++) if (dv[P - 1][j] < INF && (b < 0 || dv[P - 1][j] < dv[P - 1][b])) b = j;
  if (b < 0) return null;
  const seq = []; for (let p = P - 1, j = b; p >= 0; j = fr[p][j], p--) seq.unshift(cand[j]);
  return seq;
}

const used = new Set();
const out = [];
// 단계 1(이음)
{
  const start = R4.h1_start_frac_of_L10 * L10D1, end = R4.h1_end_D1;
  const T = Array.from({ length: 10 }, (_, p) => start * (end / start) ** (p / 9));
  const cand = bridge.filter((x) => ex4[x.seed] && ex4[x.seed].D1.fail / RUNS <= 0.05).map((x) => ({ ...x, ex: ex4[x.seed] }));
  for (const x of cand) x.sig = sigOf(generateBig(x.cfg, x.seed).level);
  const order = { B6: 6, B7: 7, B8: 8, B9: 9 };
  const seq = dp(T, cand.sort((a, b) => a.ex.D1.w - b.ex.D1.w), (x) => x.ex.D1.w, 1.05, 2, 0.35, (p, x) => (p === 0 ? x.tag === 'B6' : x.tag !== 'B6'));
  if (!seq) { console.log('단계 1 배정 실패'); process.exit(1); }
  // 판 크기는 단계 안에서 줄지 않게(뒤 판이 앞 판보다 작으면 정렬로 맞추지 않고 실패로 알림)
  for (let i = 1; i < seq.length; i++) if (order[seq[i].tag] < order[seq[i - 1].tag]) console.log(`주의: 단계 1 ${i + 1}번째 판이 앞 판보다 작음(${seq[i - 1].tag} → ${seq[i].tag})`);
  seq.forEach((x, i) => { used.add(x.seed); out.push({ id: `H1-${String(i + 1).padStart(2, '0')}`, stage: 1, stage_pos: i + 1, seed: x.seed, cfg: x.cfg, metric: 'D1', target: +T[i].toFixed(2), D1: x.ex.D1.w, D2: x.ex.D2.w, D2_p90: x.ex.D2.p90, pairs: x.ex.pairs }); });
  console.log(`단계 1(D1): ${seq.map((x, i) => `${x.tag}:${x.ex.D1.w.toFixed(0)}(${T[i].toFixed(0)})`).join(' ')}  [L10 D1 ${L10D1}]`);
}
// 단계 2~5(D2)
{
  const poolOf = (s) => { const f = join(HERE, 'out', `r3-hard-pool-H${s}.json`); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).filter((x) => x.ok).map((x) => ({ ...x, cfg: HARD_STAGES[s - 1] })) : []; };
  const pools = { 2: poolOf(2), 3: poolOf(3), 4: poolOf(4), 5: [...poolOf(5), ...poolOf(4).filter((x) => x.pairs >= 13)] };
  let prevEnd = null;
  for (let s = 2; s <= 5; s++) {
    const S = s === 2 ? R4.h2_start_D2 : R4.stage_start_frac * prevEnd, E = R4.stage_end_D2[s - 2];
    const T = Array.from({ length: 10 }, (_, p) => S * (E / S) ** (p / 9));
    const cand = pools[s].filter((x) => ex3[x.seed] && !used.has(x.seed)).map((x) => ({ ...x, ex: ex3[x.seed] }))
      .filter((x) => x.ex.D2.fail / RUNS <= 0.05 && x.ex.D2.w > 0.3 && x.ex.D2.p90 <= R4.max_p90_over_median * x.ex.D2.w && x.ex.D2.w <= HZ.max_wrong_median);
    const seq = dp(T, cand.sort((a, b) => a.ex.D2.w - b.ex.D2.w), (x) => x.ex.D2.w, 1.02, 2, 0.25, null);
    if (!seq) { console.log(`단계 ${s} 배정 실패(후보 ${cand.length}, 시작 목표 ${S.toFixed(2)})`); process.exitCode = 1; break; }
    seq.forEach((x, i) => { used.add(x.seed); out.push({ id: `H${s}-${String(i + 1).padStart(2, '0')}`, stage: s, stage_pos: i + 1, seed: x.seed, cfg: x.cfg, metric: 'D2', target: +T[i].toFixed(2), D2: x.ex.D2.w, D2_p90: x.ex.D2.p90, D2_fail: x.ex.D2.fail, D1: x.ex.D1.w, pairs: x.ex.pairs }); });
    prevEnd = seq[seq.length - 1].ex.D2.w;
    console.log(`단계 ${s}(D2): 시작 ${seq[0].ex.D2.w.toFixed(2)}(목표 ${S.toFixed(2)}) → 끝 ${prevEnd.toFixed(2)}: ${seq.map((x) => `${x.ex.D2.w.toFixed(2)}/p90 ${x.ex.D2.p90}`).join(' ')}`);
  }
}
if (!process.exitCode) { r3.hard = out; writeFileSync(join(HERE, 'levels-r3.json'), JSON.stringify(r3, null, 1) + '\n'); console.log(`어려운 판 ${out.length}개 기록`); }
