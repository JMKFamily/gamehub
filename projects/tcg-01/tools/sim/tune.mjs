// 자동 조정기(좌표 하강): 덱별 대표 카드 수치(응답자 체력·공격력, 의식 비용)를 ±1씩 바꿔 매트릭스 목적 함수를 줄인다.
// node projects/tcg-01/tools/sim/tune.mjs --games 120 --rounds 3 --seed 21   → out/tune-log.json (바꿀 목록), card-defs는 직접 고친다.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { loadData, playGame } from './sim.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const decks = {}; for (const f of readdirSync(join(root, 'decks'))) if (f.endsWith('.json')) { const d = JSON.parse(readFileSync(join(root, 'decks', f), 'utf8')); decks[d.name] = d; }
const names = Object.keys(decks).sort();
function applyKnobs(cj, knobs) {
  const c = JSON.parse(JSON.stringify(cj));
  for (const [k, v] of Object.entries(knobs)) { if (!v) continue; const [id, f] = k.split('.'); const card = c.cards.find((x) => x.id === id); card[f] = Math.max(f === 'cost' ? 0 : f === 'health' ? 1 : 0, card[f] + v); }
  return c;
}
if (!isMainThread) {
  const { cj, bj, jobs } = workerData;
  const data = loadData(cj, bj);
  const out = [];
  for (const j of jobs) { let w = 0, n = 0; for (let g = 0; g < j.n; g++) { const aF = g % 2 === 0; const sa = { deck: decks[j.a], ai: 'eval' }, sb = { deck: decks[j.b], ai: 'eval' }; const r = aF ? playGame(data, sa, sb, j.seed + g * 7919) : playGame(data, sb, sa, j.seed + g * 7919); if (r.winner == null) continue; n++; if ((r.winner === 0) === aF) w++; } out.push({ a: j.a, b: j.b, w, n }); }
  parentPort.postMessage(out);
} else {
  const args = Object.fromEntries(process.argv.slice(2).map((x, i, a) => (x.startsWith('--') ? [x.slice(2), a[i + 1]] : null)).filter(Boolean));
  const G = Number(args.games || 120), ROUNDS = Number(args.rounds || 2), SEED = Number(args.seed || 21), W = 10;
  const cj0 = JSON.parse(readFileSync(join(root, 'cards.json'), 'utf8'));
  const bj = JSON.parse(readFileSync(join(root, 'balance.json'), 'utf8'));
  const KN = (args.knobs || 'A012.cost,A035.cost,B070.health,B071.health,B073.health,B021.health,B024.health,B032.health,A025.health,B040.health,B041.health,B044.health,B042.health,B046.health,A006.health,A030.health,B057.health,A007.health,B063.health,B001.health,B006.health,B015.health,B017.health,B084.health,A041.health,A043.health,A015.health,B085.health').split(',');
  async function evalKnobs(knobs) {
    const cj = applyKnobs(cj0, knobs);
    const jobs = []; let s = 0;
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) for (let k = 0; k < W; k++) jobs.push({ a: names[i], b: names[j], n: Math.ceil(G / W) * 1, seed: SEED * 1000003 + (s++) * 104729 });
    const chunks = Array.from({ length: W }, () => []); jobs.forEach((j, i) => chunks[i % W].push(j));
    const res = (await Promise.all(chunks.map((jobs) => new Promise((ok, no) => { const w = new Worker(fileURLToPath(import.meta.url), { workerData: { cj, bj, jobs } }); w.on('message', ok); w.on('error', no); })))).flat();
    const cell = {}; for (const r of res) { const k = r.a + '|' + r.b; cell[k] = cell[k] || { w: 0, n: 0 }; cell[k].w += r.w; cell[k].n += r.n; }
    const arch = {}; for (const n of names) arch[n] = { w: 0, n: 0 };
    let obj = 0, worst = 0;
    for (const [k, c] of Object.entries(cell)) { const p = c.w / c.n; const [a, b] = k.split('|'); arch[a].w += c.w; arch[a].n += c.n; arch[b].w += c.n - c.w; arch[b].n += c.n; const e = Math.max(0, Math.abs(p - 0.5) - 0.13); obj += 10 * e * e; worst = Math.max(worst, Math.abs(p - 0.5)); }
    for (const a of Object.values(arch)) { const p = a.w / a.n; obj += 20 * (p - 0.5) ** 2; }
    return { obj, worst, arch: Object.fromEntries(Object.entries(arch).map(([k, a]) => [k, +(a.w / a.n).toFixed(3)])) };
  }
  let knobs = Object.fromEntries(KN.map((k) => [k, 0]));
  let best = await evalKnobs(knobs);
  const log = [{ step: 'start', ...best }];
  console.log('start', best.obj.toFixed(4), 'worst', best.worst.toFixed(3), JSON.stringify(best.arch));
  for (let r = 0; r < ROUNDS; r++) {
    let improved = false;
    for (const k of KN) for (const d of [1, -1]) {
      if (Math.abs(knobs[k] + d) > 2) continue;
      const trial = { ...knobs, [k]: knobs[k] + d };
      const t = await evalKnobs(trial);
      if (t.obj < best.obj * 0.97) { knobs = trial; best = t; improved = true; log.push({ step: `${k} ${d > 0 ? '+' : ''}${d}`, ...t }); console.log('accept', k, d, t.obj.toFixed(4), 'worst', t.worst.toFixed(3), JSON.stringify(t.arch)); break; }
    }
    if (!improved) break;
  }
  writeFileSync(join(here, 'out', 'tune-log.json'), JSON.stringify({ games_per_pair: G, seed: SEED, knobs: Object.fromEntries(Object.entries(knobs).filter(([, v]) => v)), log }, null, 1));
  console.log('final knobs', JSON.stringify(Object.fromEntries(Object.entries(knobs).filter(([, v]) => v))));
}
