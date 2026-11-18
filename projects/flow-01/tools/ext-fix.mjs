#!/usr/bin/env node
// 레벨 자리 하나 바꾸기(round-2): 그 자리 번호(li)로 verify-levels 와 똑같은 봇 작업(sim/jobs verifyLevel)을 미리 돌려
// 전체 실행에서 나올 값을 정확히 보고 고름(시드가 (SEED, 시드 번호, li, 회차)로만 정해져 다른 레벨 값은 그대로).
// 사용법: node tools/ext-fix.mjs --id=44 --lo=18.3 --hi=19.3 [--max=10]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILIES } from './levels-config.mjs';
import { generate } from './gen/generate.mjs';
import { runJobs } from './sim/jobs.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = join(HERE, '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const bal = JSON.parse(readFileSync(join(PROJECT, 'balance.json'), 'utf8'));
const DF = bal.difficulty, V = bal.verify;
const id = arg('id'), lo = +arg('lo'), hi = +arg('hi'), MAX = +arg('max', 10);
const li = Number(id) - 1;
const lim = (pairs) => Math.max(DF.skilled_waste_concentration_max_frac, DF.skilled_concentration_even_share_mult / pairs);
const extFile = join(HERE, 'levels-ext.json');
const ext = JSON.parse(readFileSync(extFile, 'utf8'));
const cache = JSON.parse(readFileSync(join(HERE, 'out', 'pick-cache.json'), 'utf8'));
const lvSig = (L) => JSON.stringify([L.width, L.height, L.holes, L.pairs.map((p) => [p.a, p.b])]);
const sigs = new Set(readdirSync(join(PROJECT, 'levels')).filter((f) => /^\d\d-/.test(f) && !f.startsWith(`${id}-`)).map((f) => lvSig(JSON.parse(readFileSync(join(PROJECT, 'levels', f), 'utf8')))));
const used = new Set(ext.slots.map((s) => s.seed));
const cand = [];
for (const f of readdirSync(join(HERE, 'out')).filter((x) => /^pool-ext-[A-Z]\.json$/.test(x))) {
  const cfg = FAMILIES.find((x) => x.id === f[9]);
  for (const x of JSON.parse(readFileSync(join(HERE, 'out', f), 'utf8'))) {
    const r = cache[x.seed];
    if (!r || used.has(x.seed) || r.fail || r.conc > lim(cfg.pairs) - 0.02 || r.cmedian < lo - 0.3 || r.cmedian > hi + 0.3) continue;
    const L = generate(cfg, x.seed).level;
    if (sigs.has(lvSig(L))) continue;
    cand.push({ x, cfg, L, r });
  }
}
cand.sort((a, b) => Math.abs(a.r.cmedian - (lo + hi) / 2) - Math.abs(b.r.cmedian - (lo + hi) / 2));
const top = cand.slice(0, MAX);
const res = await runJobs(top.map((k) => ({ name: 'verifyLevel', arg: { L: k.L, li, SEED: V.seed, NSEEDS: V.seeds, NCH: V.child_runs_per_seed, NSK: V.skilled_runs, QUICK: false, c1N: 0, minRate: DF.skilled_min_waste_rate, minWaste: DF.concentration_min_waste_events } })));
let best = null;
top.forEach((k, i) => {
  const o = res[i], m = o.stats.cmedian, ok = m >= lo && m <= hi && o.k1.conc <= lim(k.cfg.pairs) && o.fail / o.runs <= DF.max_fail_frac_L11_L50;
  console.log(`${k.cfg.id} ${k.x.seed}: 전체 실행 값 m̃ ${m.toFixed(3)} p90 ${o.stats.p90} 몰림 ${(o.k1.conc * 100).toFixed(1)} % 못 풂 ${o.fail} ${ok ? 'OK' : ''}`);
  if (ok && (!best || Math.abs(m - (lo + hi) / 2) < Math.abs(best.m - (lo + hi) / 2))) best = { k, m, o };
});
if (!best) { console.log('맞는 판 없음'); process.exit(1); }
const s = ext.slots.find((z) => z.id === id);
Object.assign(s, { family: best.k.cfg.id, width: best.k.cfg.width, height: best.k.cfg.height, pairs: best.k.cfg.pairs, holes: best.k.cfg.holes, seed: best.k.x.seed, pick_cmedian: +best.m.toFixed(3), pick_p90: best.o.stats.p90, pick_conc: +best.o.k1.conc.toFixed(3), pick_conc_bot: best.o.k1.bot, pick_note: 'ext-fix: 이 자리 번호로 전체 실행과 같은 봇 작업을 미리 돌려 고름' });
writeFileSync(extFile, JSON.stringify(ext, null, 1) + '\n');
console.log(`L${id} ← ${best.k.cfg.id} ${best.k.x.seed} (m̃ ${best.m.toFixed(3)})`);
