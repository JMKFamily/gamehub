#!/usr/bin/env node
// round-3: 어려운 단계 후보 풀. gen-2 로 판을 만들고 독립 검증기 2(solve-edge) 로 유일해만 남긴 뒤 추론 봇 D1·D2 헛 이동을 잼.
// 사용법: node tools/r3-hard-pool.mjs --stage=1 [--count=300] [--from=0] → out/r3-hard-pool-H<단계>.json (누적)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HARD_STAGES, HARD_SEED_BASE } from './levels-config.mjs';
import { runJobs } from './sim/jobs.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const stage = +arg('stage', 1), COUNT = +arg('count', 300), FROM = +arg('from', 0);
const cfg = HARD_STAGES.find((s) => s.stage === stage);
const file = join(HERE, 'out', `r3-hard-pool-H${stage}.json`);
const prev = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
const have = new Set(prev.map((x) => x.seed));
const jobs = [];
for (let i = FROM; i < FROM + COUNT; i++) { const seed = HARD_SEED_BASE(stage) + i; if (!have.has(seed)) jobs.push({ name: 'deduce', arg: { cfg, seed, big: true, runs: 300, bots: ['D1', 'D2'], uniqueCheck: true } }); }
const t0 = Date.now();
const res = await runJobs(jobs);
const all = [...prev, ...res].sort((a, b) => a.seed - b.seed);
writeFileSync(file, JSON.stringify(all));
const ok = res.filter((x) => x.ok); const h = {};
for (const x of ok) { const w = x.D2.w; const b = w < 0.5 ? '0' : w < 2 ? '0.5-2' : w < 5 ? '2-5' : w < 10 ? '5-10' : w < 20 ? '10-20' : w < 40 ? '20-40' : '40+'; h[b] = (h[b] || 0) + 1; }
console.log(`H${stage}: ${res.length}판, 유일 ${ok.length}, D2 분포 ${JSON.stringify(h)}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
