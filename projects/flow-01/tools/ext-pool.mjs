#!/usr/bin/env node
// 레벨 11~50 후보 풀 만들기(round-2). 판 가족(levels-config FAMILIES)마다 시드를 돌려 자체 생성기로 판을 만들고
// 유일해(sound) → 아이 봇 짧은 실행 m̃ → 범위 안 판만 숙련 봇 몰림 대강. 원작 판은 보지 않음.
// 사용법: node tools/ext-pool.mjs --family=A [--count=600] [--from=0]   → tools/out/pool-ext-<가족>.json (누적)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILIES, FAMILY_SEED_BASE } from './levels-config.mjs';
import { runJobs } from './sim/jobs.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const fid = arg('family', 'A'), COUNT = +arg('count', 600), FROM = +arg('from', 0);
const cfg = FAMILIES.find((f) => f.id === fid);
const file = join(HERE, 'out', `pool-ext-${fid}.json`);
mkdirSync(join(HERE, 'out'), { recursive: true });
const prev = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
const have = new Set(prev.map((x) => x.seed));
const t0 = Date.now();
const jobs = [];
for (let i = FROM; i < FROM + COUNT; i++) { const seed = FAMILY_SEED_BASE(fid) + i; if (!have.has(seed)) jobs.push({ name: 'screen', arg: { cfg, seed, runs: 800, lo: 11, hi: 30, minWaste: 600, maxRuns: 12000 } }); }
const res = await runJobs(jobs);
const all = [...prev, ...res].sort((a, b) => a.seed - b.seed);
writeFileSync(file, JSON.stringify(all));
const ok = res.filter((x) => x.ok), scr = res.filter((x) => x.sk_waste != null);
console.log(`가족 ${fid}: ${res.length}판, 유일 ${ok.length}, 범위·꼬리 통과 ${scr.length}, 몰림 ≤ 28 % ${scr.filter((x) => x.sk_conc <= 0.28).length}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
