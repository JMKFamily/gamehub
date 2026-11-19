#!/usr/bin/env node
// round-3: 일반 레벨 L5~L50 후보(6x6, 아이 봇 m̃ ≥ 34 = 5~6세 구간 밖) 에 추론 봇 D1 헛 이동을 잼 → out/r3-normal-d1.json
// 후보 = 1-1·round-2 에서 만든 자체 생성 풀(candidates-07~10, pool-ext-A~G). 원작 판 미참조.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_SLOTS, FAMILIES } from './levels-config.mjs';
import { runJobs } from './sim/jobs.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
const list = [];
for (const f of readdirSync(join(HERE, 'out')).filter((x) => /^pool-ext-[A-Z]\.json$|^candidates-(07|08|09|10)\.json$/.test(x))) {
  const fam = f.startsWith('pool') ? f[9] : f.slice(11, 13);
  const cfg = f.startsWith('pool') ? FAMILIES.find((x) => x.id === fam) : BASE_SLOTS.find((x) => x.id === fam);
  for (const x of JSON.parse(readFileSync(join(HERE, 'out', f), 'utf8'))) if ((x.ok || x.unique) && x.cmed >= 34) list.push({ fam, cfg, seed: x.seed, child_quick: x.cmed, child_fail_quick: x.fail });
}
const t0 = Date.now();
const res = await runJobs(list.map((x) => ({ name: 'deduce', arg: { cfg: x.cfg, seed: x.seed, runs: 600, bots: ['D1', 'D2'] } })));
const out = list.map((x, i) => ({ fam: x.fam, seed: x.seed, child_quick: x.child_quick, child_fail_quick: x.child_fail_quick, pairs: res[i].pairs, D1: res[i].D1, D2: res[i].D2 })).filter((x, i) => res[i].ok);
writeFileSync(join(HERE, 'out', 'r3-normal-d1.json'), JSON.stringify(out));
const h = {}; for (const x of out) { const b = Math.floor(x.D1.w / 20) * 20; h[b] = (h[b] || 0) + 1; }
console.log(`${out.length}판, D1 분포 ${JSON.stringify(h)}, D2>0 ${out.filter((x) => x.D2.w > 0.5).length}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
