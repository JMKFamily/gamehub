// 봇 측정 작업(레벨 하나 단위) + worker_threads 풀. verify-levels.mjs·ext-pick.mjs 공용.
// 작업은 시드만으로 결정적이라 몇 개의 스레드로 나눠 돌려도 결과가 같음(순서·스레드 수 무관).
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { solveRun, moveStats, CHILD, SKILLED, MID } from './bots.mjs';
import { mixSeed } from '../core/rng.mjs';
import { generate } from '../gen/generate.mjs';
import { countSolutions } from '../gen/solve.mjs';
import { makePuzzle } from '../core/board.mjs';
import { deduceRun, D1, D2 } from './deduce.mjs';
import { generateBig } from '../gen/generate-big.mjs';
import { countSolutionsEdge } from '../gen/solve-edge.mjs';

// 숙련 봇 헛 이동 몰림(verify K1 과 같은 규칙): 첫 nsk 회 숙련 봇 헛 이동 비율 < minRate 면 중간 봇, 표본은 헛 이동 ≥ minWaste 또는 20·nsk 회까지
function wasteOf(L, P, seedOf, nsk, adapt, minWaste) {
  const waste = new Array(L.pairs.length).fill(0); const mv = [];
  let n = 0, tw = 0;
  do {
    for (let k = 0; k < nsk; k++, n++) { const x = solveRun(L, P, seedOf(n)); mv.push(x.moves); x.colorMoves.forEach((c, i) => { waste[i] += Math.max(0, c - 1); }); }
    tw = waste.reduce((a, b) => a + b, 0);
  } while (adapt && tw < minWaste && n < 20 * nsk);
  return { tw, n, conc: tw ? Math.max(...waste) / tw : 0, st: moveStats(mv), waste };
}
export function concentration(L, seedOf7, seedOf8, nsk, quick, minRate, minWaste) {
  let w = wasteOf(L, SKILLED, seedOf7, nsk, false, minWaste), bot = 'skilled';
  const skilledM = w.st.cmedian, skilledRate = w.tw / w.n;
  if (skilledRate < minRate) { w = wasteOf(L, MID, seedOf8, nsk, !quick, minWaste); bot = 'mid'; }
  else w = wasteOf(L, SKILLED, seedOf7, nsk, !quick, minWaste);
  return { bot, skilledM, skilledRate, tw: w.tw, n: w.n, conc: w.conc, waste: w.waste };
}

const JOBS = {
  // verify-levels 한 레벨: 아이 봇 시드별, C2, C1, K1
  verifyLevel({ L, li, SEED, NSEEDS, NCH, NSK, QUICK, c1N, minRate, minWaste }) {
    const perSeed = [], all = []; let trap = 0, fail = 0, c2bad = 0, c2runs = 0;
    for (let s = 0; s < NSEEDS; s++) {
      const mv = [];
      for (let k = 0; k < NCH; k++) {
        const x = solveRun(L, CHILD, mixSeed(SEED, s, li, k));
        mv.push(x.moves); all.push(x.moves);
        if (x.sawEmptyTrap) trap++;
        if (!x.completed) fail++;
        if (x.completed) { c2runs++; const star = x.moves === L.pairs.length; const allOne = x.colorMoves.every((m) => m === 1); const pct = Math.floor((100 * x.colorMoves.filter((m) => m === 1).length) / L.pairs.length); if (star !== allOne || star !== (pct === 100)) c2bad++; }
      }
      perSeed.push(moveStats(mv).cmedian);
    }
    let c1bad = 0;
    for (let k = 0; k < c1N; k++) {
      const a = solveRun(L, CHILD, mixSeed(SEED, 99, li, k), { display: false, log: true });
      const b = solveRun(L, CHILD, mixSeed(SEED, 99, li, k), { display: true, log: true });
      if (a.moves !== b.moves || a.completed !== b.completed || a.drags !== b.drags || JSON.stringify(a.colorMoves) !== JSON.stringify(b.colorMoves) || JSON.stringify(a.log) !== JSON.stringify(b.log)) c1bad++;
    }
    const k1 = concentration(L, (n) => mixSeed(SEED, 7, li, n), (n) => mixSeed(SEED, 8, li, n), NSK, QUICK, minRate, minWaste);
    return { perSeed, stats: moveStats(all), trap, fail, runs: all.length, c2bad, c2runs, c1bad, c1n: c1N, k1 };
  },
  // ext-pick 풀 만들기: 생성 → 유일해(sound) → 아이 봇 runs 회 → 범위 안이면 숙련 봇 몰림 대강(헛 이동 ≥ minWaste 또는 maxRuns)
  screen({ cfg, seed, runs, lo, hi, minWaste, maxRuns }) {
    const g = generate(cfg, seed);
    if (!g) return { seed, ok: false, why: 'gen' };
    const L = g.level;
    if (countSolutions(makePuzzle(L), { limit: 2 }).count !== 1) return { seed, ok: false, why: 'unique' };
    const mv = []; let fail = 0;
    for (let k = 0; k < runs; k++) { const x = solveRun(L, CHILD, mixSeed(seed, k, 991)); mv.push(x.moves); if (!x.completed) fail++; }
    const st = moveStats(mv);
    const out = { seed, ok: true, attempts: g.attempts, cmed: +st.cmedian.toFixed(3), p90: st.p90, fail };
    if (fail || st.cmedian < lo || st.cmedian > hi || st.p90 > 3 * st.cmedian) return out;
    const waste = new Array(L.pairs.length).fill(0); let n = 0, tw = 0;
    while (tw < minWaste && n < maxRuns) { for (let k = 0; k < 500; k++, n++) { const x = solveRun(L, SKILLED, mixSeed(seed, 313, n)); x.colorMoves.forEach((c, i) => { waste[i] += Math.max(0, c - 1); }); } tw = waste.reduce((a, b) => a + b, 0); }
    return { ...out, sk_n: n, sk_waste: tw, sk_conc: tw ? +(Math.max(...waste) / tw).toFixed(3) : 0 };
  },
  // round-3: 추론 봇 D1/D2 헛 이동(seedBase 를 주면 verify 와 같은 시드 = mixSeed(verify.seed, 4243, 판 생성 시드) → 판 고유 값, 자리와 무관)
  // round-3: 추론 봇 D1/D2 헛 이동(틀린 찍기) 분포. L 이 없으면 cfg·seed 로 만듦(big = gen-2)
  deduce({ L, cfg, seed, big, runs, bots = ['D1'], uniqueCheck = false, seedBase = null }) {
    if (!L) { const g = big ? generateBig(cfg, seed) : generate(cfg, seed); if (!g) return { seed, ok: false }; L = g.level; }
    if (uniqueCheck && countSolutionsEdge(L, { limit: 2, maxNodes: 2e7 }).count !== 1) return { seed, ok: false, why: 'unique' };
    const out = { seed, ok: true, pairs: L.pairs.length };
    for (const b of bots) {
      const P = b === 'D2' ? D2 : D1, w = []; let f = 0;
      for (let k = 0; k < runs; k++) { const r = deduceRun(L, P, seedBase != null ? mixSeed(seedBase, b === 'D2' ? 2 : 1, k) : mixSeed(seed, 4242, k)); w.push(r.wrong); if (!r.solved) f++; }
      const st = moveStats(w);
      out[b] = { w: +st.cmedian.toFixed(3), p90: st.p90, fail: f };
    }
    return out;
  },
  // round-3 verify HV4: 길 찾기 검증기(sound) 를 스레드에서(넓은 판은 판당 수 초~수십 초)
  soundCheck({ L, maxNodes }) {
    const t = Date.now();
    const r = countSolutions(makePuzzle(L), { limit: 2, mode: 'sound', maxNodes });
    return { count: r.count, aborted: r.aborted, nodes: r.nodes, ms: Date.now() - t, sol: r.solutions[0] || null };
  },
  // ext-pick 후보 하나: 아이 봇 runs 회 + 몰림
  pickMeasure({ L, seed, runs, nsk, minRate, minWaste }) {
    const mv = []; let fail = 0;
    for (let k = 0; k < runs; k++) { const x = solveRun(L, CHILD, mixSeed(seed, k, 991)); mv.push(x.moves); if (!x.completed) fail++; }
    const k1 = concentration(L, (n) => mixSeed(seed, 313, n), (n) => mixSeed(seed, 314, n), nsk, false, minRate, minWaste);
    return { ...moveStats(mv), fail, k1 };
  },
};

if (!isMainThread) parentPort.on('message', ({ id, name, arg }) => parentPort.postMessage({ id, out: JOBS[name](arg) }));

// 작업 목록을 스레드 풀로 실행. 반환 순서 = 입력 순서.
export async function runJobs(list, threads = Math.max(1, Math.min(cpus().length - 2, 10))) {
  const file = fileURLToPath(import.meta.url);
  const out = new Array(list.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(threads, list.length) }, () => new Worker(file));
  await Promise.all(workers.map((w) => new Promise((res, rej) => {
    const feed = () => { if (next >= list.length) { w.terminate(); res(); return; } const id = next++; w.postMessage({ id, ...list[id] }); };
    w.on('message', ({ id, out: o }) => { out[id] = o; feed(); });
    w.on('error', rej);
    feed();
  })));
  return out;
}
