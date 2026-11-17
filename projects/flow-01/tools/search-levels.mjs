#!/usr/bin/env node
// 후보 판 찾기: 자리(slot)마다 시드를 돌려 판을 만들고, 유일해(sound) 확인 → 구조 지표 → 아이 봇 짧은 실행으로 m̃ 추정.
// 사용법: node tools/search-levels.mjs --slot=03 [--count=150] [--runs=400] [--from=0]
// 결과: tools/out/candidates-<slot>.json (판정에 쓰지 않는 탐색 기록. 최종 판정은 verify-levels.mjs)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SLOTS, SEED_BASE } from './levels-config.mjs';
import { generate, structureMetrics } from './gen/generate.mjs';
import { countSolutions } from './gen/solve.mjs';
import { makePuzzle } from './core/board.mjs';
import { solveRun, moveStats, CHILD } from './sim/bots.mjs';
import { mixSeed } from './core/rng.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const slotId = arg('slot', '01');
const COUNT = +arg('count', 150), RUNS = +arg('runs', 400), FROM = +arg('from', 0);
const slot = SLOTS.find((s) => s.id === slotId);
const out = [];
const t0 = Date.now();
for (let i = FROM; i < FROM + COUNT; i++) {
  const seed = SEED_BASE(slotId) + i;
  const g = generate(slot, seed);
  if (!g) continue;
  const pz = makePuzzle(g.level);
  const sol = countSolutions(pz, { limit: 2 });
  if (sol.count !== 1) { out.push({ i, seed, unique: false }); continue; }
  const sm = structureMetrics(g.level);
  const mv = []; let fail = 0, trap = 0;
  for (let r = 0; r < RUNS; r++) {
    const x = solveRun(g.level, CHILD, mixSeed(seed, r, 77));
    if (!x.completed) fail++;
    if (x.sawEmptyTrap) trap++;
    mv.push(x.moves);
  }
  const st = moveStats(mv);
  out.push({ i, seed, unique: true, attempts: g.attempts, nodes: sol.nodes, ...sm, cmed: +st.cmedian.toFixed(2), mean: +st.mean.toFixed(2), p90: st.p90, fail, trap_pct: +((100 * trap) / RUNS).toFixed(1) });
}
mkdirSync(join(HERE, 'out'), { recursive: true });
writeFileSync(join(HERE, 'out', `candidates-${slotId}.json`), JSON.stringify(out, null, 1));
const ok = out.filter((c) => c.unique);
console.log(`slot ${slotId}: ${out.length} 생성, 유일 ${ok.length}, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const hist = {};
for (const c of ok) { const b = Math.floor(c.cmed); hist[b] = (hist[b] || 0) + 1; }
console.log('m̃ 분포(정수 구간):', JSON.stringify(hist));
