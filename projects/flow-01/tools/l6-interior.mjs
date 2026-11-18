#!/usr/bin/env node
// G1(1-2 2차): L6 후보 중 구멍이 판 안쪽(둘레 줄·열에 닿지 않음)인 판 찾기 → 몰림·아이 봇 m̃ 측정.
// 사용법: node tools/l6-interior.mjs [--target=10.64] [--win=0.12] [--sk=3000] [--runs=3000] [--all=1]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SLOTS, SEED_BASE } from './levels-config.mjs';
import { generate } from './gen/generate.mjs';
import { solveRun, moveStats, CHILD, SKILLED, MID } from './sim/bots.mjs';
import { mixSeed } from './core/rng.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const slot = SLOTS.find((s) => s.id === '06');
const T = +arg('target', 10.64), WIN = +arg('win', 0.12), SK = +arg('sk', 3000), RUNS = +arg('runs', 3000), ALL = arg('all', '0') === '1';
const inner = ([x, y], L) => x > 0 && y > 0 && x < L.width - 1 && y < L.height - 1;
let c = JSON.parse(readFileSync(join(HERE, 'out', 'candidates-06.json'), 'utf8')).filter((x) => x.unique && x.fail === 0 && x.p90 <= 3 * x.cmed && Math.abs(x.cmed / T - 1) <= WIN);
const out = [];
for (const x of c) {
  const lv = generate(slot, SEED_BASE('06') + x.i).level;
  const ins = lv.holes.map((h) => inner(h, lv));
  if (!ins[0] && !ins[1]) continue;
  if (ALL && !ins.every(Boolean)) continue;
  const run = (P, tag) => { const w = new Array(slot.pairs).fill(0); for (let k = 0; k < SK; k++) { const r = solveRun(lv, P, mixSeed(SEED_BASE('06') + x.i, k, tag)); r.colorMoves.forEach((m, i) => { w[i] += Math.max(0, m - 1); }); } const tw = w.reduce((a, b) => a + b, 0); return { tw, conc: tw ? Math.max(...w) / tw : 0 }; };
  let w = run(SKILLED, 41), bot = 'skilled';
  if (w.tw < 20) { w = run(MID, 42); bot = 'mid'; }
  const mv = []; for (let k = 0; k < RUNS; k++) mv.push(solveRun(lv, CHILD, mixSeed(SEED_BASE('06') + x.i, k, 43)).moves);
  out.push({ i: x.i, holes: lv.holes, inner: ins, quick: x.cmed, bot, waste: w.tw, conc: +w.conc.toFixed(3), cmed: +moveStats(mv).cmedian.toFixed(3) });
}
writeFileSync(join(HERE, 'out', 'l6-interior.json'), JSON.stringify(out, null, 1));
out.sort((a, b) => Math.abs(a.cmed - T) - Math.abs(b.cmed - T));
console.log(`후보(목표 ±${WIN * 100}%, 구멍 하나 이상 안쪽) ${out.length}`);
for (const r of out) console.log(`${r.i} holes ${JSON.stringify(r.holes)} inner ${r.inner} m̃ ${r.cmed} ${r.bot} conc ${(r.conc * 100).toFixed(1)}% w${r.waste}`);
