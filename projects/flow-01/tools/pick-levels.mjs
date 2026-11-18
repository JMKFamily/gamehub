#!/usr/bin/env node
// 후보 중 레벨 고르기(탐색 도구). candidates-*.json 의 짧은 실행 m̃ 로 목표에 가까운 후보 몇 개를 고르고,
// 그 후보만 아이 봇 --runs 회로 다시 재서 가장 가까운 것을 levels-picks.json 에 씀.
// 목표 곡선(20-balance 8-1): m̃L = a·r^(L−1) (L ≤ 3), m̃L = m̃3·r^(3(L−3)/7) (L ≥ 3), r = (m̃3/m̃1)^½, a = m̃1
// 사용법: node tools/pick-levels.mjs [--a=3.5] [--m3=6.8] [--runs=4000] [--top=5]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_SLOTS as SLOTS, SEED_BASE } from './levels-config.mjs';
import { generate } from './gen/generate.mjs';
import { solveRun, moveStats, CHILD, SKILLED } from './sim/bots.mjs';
import { mixSeed } from './core/rng.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const A = +arg('a', 3.5), M3 = +arg('m3', 6.8), RUNS = +arg('runs', 4000), TOP = +arg('top', 5), SK = +arg('skilled', 3000), WIN = +arg('win', 0.08);
const ONLY = arg('slots', '') ? arg('slots', '').split(',') : null;
const r = Math.sqrt(M3 / A);
const target = (L) => (L <= 3 ? A * r ** (L - 1) : M3 * r ** ((3 * (L - 3)) / 7));

function measure(slot, i) {
  const g = generate(slot, SEED_BASE(slot.id) + i);
  const mv = []; let trap = 0, fail = 0;
  for (let k = 0; k < RUNS; k++) { const x = solveRun(g.level, CHILD, mixSeed(SEED_BASE(slot.id) + i, k, 991)); mv.push(x.moves); if (x.sawEmptyTrap) trap++; if (!x.completed) fail++; }
  // 숙련 봇 헛 이동 몰림
  const waste = new Array(slot.pairs).fill(0);
  for (let k = 0; k < SK; k++) { const x = solveRun(g.level, SKILLED, mixSeed(SEED_BASE(slot.id) + i, k, 313)); x.colorMoves.forEach((m, c) => { waste[c] += Math.max(0, m - 1); }); }
  const tw = waste.reduce((s, x) => s + x, 0);
  return { ...moveStats(mv), trap: trap / RUNS, fail, skilledWaste: tw, skilledConc: tw ? Math.max(...waste) / tw : 0 };
}

const prev = (() => { try { return JSON.parse(readFileSync(join(HERE, 'levels-picks.json'), 'utf8')); } catch { return null; } })();
const picks = { _note: '레벨 자리마다 고른 후보 번호(생성 시드 = 자리 기본 + index). pick-levels.mjs 가 씀. 근거 표는 20-balance 8절', a: A, m3: M3, r, slots: {} };
if (prev && ONLY) picks.slots = prev.slots;
for (const slot of SLOTS) {
  if (ONLY && !ONLY.includes(slot.id)) continue;
  const L = Number(slot.id), t = target(L);
  let c = JSON.parse(readFileSync(join(HERE, 'out', `candidates-${slot.id}.json`), 'utf8')).filter((x) => x.unique && x.fail === 0 && x.p90 <= 3 * x.cmed);
  if (slot.id === '01') c = c.filter((x) => x.trap_pct === 0 && x.max_len >= 7 && x.min_len <= 4);
  if (slot.id === '02') c = c.filter((x) => x.trap_pct >= 30);
  if (slot.id === '04') c = c.filter((x) => x.bends >= 7);
  if (slot.id === '08') c = c.filter((x) => x.illusion >= 1);
  c.sort((x, y) => Math.abs(x.cmed - t) - Math.abs(y.cmed - t));
  if (L > 3) c = c.filter((x, k) => k < 3 || Math.abs(x.cmed / t - 1) <= WIN);
  const res = c.slice(0, TOP).map((x) => ({ i: x.i, quick: x.cmed, ...measure(slot, x.i) }));
  // 숙련 봇 몰림 기준(쌍 4개 이상: 30 %)을 먼저 만족하는 후보 중 목표에 가까운 것
  const okConc = (x) => slot.pairs < 4 || x.skilledWaste < 15 || x.skilledConc <= 0.27;
  res.sort((x, y) => (okConc(y) - okConc(x)) || Math.abs(x.cmedian - t) - Math.abs(y.cmedian - t));
  const b = res[0];
  picks.slots[slot.id] = { index: b.i, measured_cmedian: +b.cmedian.toFixed(3), target: +t.toFixed(3), skilled_waste: b.skilledWaste, skilled_conc: +b.skilledConc.toFixed(3) };
  console.log(`L${slot.id} 목표 ${t.toFixed(2)} → 후보 ${res.map((x) => `${x.i}:${x.cmedian.toFixed(2)}(t${(x.trap * 100).toFixed(0)}% c${(x.skilledConc * 100).toFixed(0)}% w${x.skilledWaste})`).join(' ')} → ${b.i}`);
}
writeFileSync(arg('out', '') ? join(HERE, arg('out', '')) : join(HERE, 'levels-picks.json'), JSON.stringify(picks, null, 1) + '\n');
