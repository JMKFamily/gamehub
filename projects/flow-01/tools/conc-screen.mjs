#!/usr/bin/env node
// 몰림 거르기(탐색 도구): 목표 ±win 안 후보마다 숙련 봇(헛 이동 < 20 이면 중간 봇) 한 쌍 몰림을 재고, 몰림이 낮은 후보를 아이 봇으로 다시 잼.
// 사용법: node tools/conc-screen.mjs --slot=07 --target=11.96 [--win=0.12] [--sk=3000] [--runs=3000]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SLOTS, SEED_BASE } from './levels-config.mjs';
import { generate } from './gen/generate.mjs';
import { solveRun, moveStats, CHILD, SKILLED, MID } from './sim/bots.mjs';
import { mixSeed } from './core/rng.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const slot = SLOTS.find((s) => s.id === arg('slot', '07'));
const T = +arg('target', 10), WIN = +arg('win', 0.12), SK = +arg('sk', 3000), RUNS = +arg('runs', 3000), MAXC = +arg('max', 60);
let c = JSON.parse(readFileSync(join(HERE, 'out', `candidates-${slot.id}.json`), 'utf8')).filter((x) => x.unique && x.fail === 0 && Math.abs(x.cmed / T - 1) <= WIN);
if (slot.id === '04') c = c.filter((x) => x.bends >= 7);
if (slot.id === '08') c = c.filter((x) => x.illusion >= 1);
c.sort((x, y) => Math.abs(x.cmed - T) - Math.abs(y.cmed - T));
const SKIP = +arg('skip', 0);
c = c.slice(SKIP, SKIP + MAXC);
const out = [];
for (const x of c) {
  const lv = generate(slot, SEED_BASE(slot.id) + x.i).level;
  const run = (P, tag) => { const w = new Array(slot.pairs).fill(0); for (let k = 0; k < SK; k++) { const r = solveRun(lv, P, mixSeed(SEED_BASE(slot.id) + x.i, k, tag)); r.colorMoves.forEach((m, i) => { w[i] += Math.max(0, m - 1); }); } const tw = w.reduce((a, b) => a + b, 0); return { tw, conc: tw ? Math.max(...w) / tw : 0 }; };
  let w = run(SKILLED, 41), bot = 'skilled';
  if (w.tw < 20) { w = run(MID, 42); bot = 'mid'; }
  const rec = { i: x.i, quick: x.cmed, bot, waste: w.tw, conc: +w.conc.toFixed(3) };
  if (w.conc <= +arg('cmax', 0.27) || w.tw < 20) {
    const mv = []; for (let k = 0; k < RUNS; k++) mv.push(solveRun(lv, CHILD, mixSeed(SEED_BASE(slot.id) + x.i, k, 43)).moves);
    rec.cmed = +moveStats(mv).cmedian.toFixed(3);
  }
  out.push(rec);
}
writeFileSync(join(HERE, 'out', `conc-${slot.id}${SKIP ? '-' + SKIP : ''}.json`), JSON.stringify(out, null, 1));
const good = out.filter((r) => r.cmed != null).sort((a, b) => Math.abs(a.cmed - T) - Math.abs(b.cmed - T));
console.log(`slot ${slot.id} 목표 ${T}: 후보 ${out.length}, 몰림 ≤ 27 %: ${good.length} → ${good.slice(0, 8).map((r) => `${r.i}:${r.cmed}(${r.bot} c${(r.conc * 100).toFixed(0)}% w${r.waste})`).join(' ')}`);
