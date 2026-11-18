#!/usr/bin/env node
// G1(1-2 2차) 후보 정밀 측정(탐색 도구): 아이 봇 m̃ + 숙련 봇(헛 이동 비율 < 1 %/회면 중간 봇) 한 쌍 몰림(헛 이동 ≥ 2000회까지).
// 사용법: node tools/l6-measure.mjs 1033 1131 [--child=4000]
import { SLOTS, SEED_BASE } from './levels-config.mjs';
import { generate } from './gen/generate.mjs';
import { solveRun, moveStats, CHILD, SKILLED, MID } from './sim/bots.mjs';
import { mixSeed } from './core/rng.mjs';
const slot = SLOTS.find((s) => s.id === '06');
const NC = +(process.argv.find((a) => a.startsWith('--child='))?.split('=')[1] ?? 4000);
for (const i of process.argv.slice(2).filter((a) => !a.startsWith('--')).map(Number)) {
  const lv = generate(slot, SEED_BASE('06') + i).level;
  const mv = []; for (let k = 0; k < NC; k++) mv.push(solveRun(lv, CHILD, mixSeed(777, i, k)).moves);
  let P = SKILLED, bot = 'skilled', n = 0;
  const w = new Array(slot.pairs).fill(0);
  const chunk = () => { for (let k = 0; k < 10000; k++, n++) solveRun(lv, P, mixSeed(555, i, n)).colorMoves.forEach((m, c) => { w[c] += Math.max(0, m - 1); }); };
  chunk();
  if (w.reduce((a, b) => a + b, 0) / n < 0.01) { P = MID; bot = 'mid'; w.fill(0); n = 0; chunk(); }
  while (w.reduce((a, b) => a + b, 0) < 2000 && n < 100000) chunk();
  const tw = w.reduce((a, b) => a + b, 0);
  console.log(`${i} holes ${JSON.stringify(lv.holes)} m̃ ${moveStats(mv).cmedian.toFixed(2)} ${bot} conc ${(100 * Math.max(...w) / tw).toFixed(1)}% waste ${tw}(${w.join('/')}) runs ${n}`);
}
