// 시뮬레이터 쪽 한 판 (QA 대조용, 판마다 새 node 프로세스로 부름: ai.mjs SALT가 프로세스 안에서 누적되므로)
//   node sim-one.mjs trace  <heroA> <heroB> <seed> [ai]   → playGame과 같은 순서로 진행하며 행동열 기록
//   node sim-one.mjs play   <heroA> <heroB> <seed> [ai]   → tools/sim/sim.mjs playGame 그대로(행동열 없음, 승자·반턴·명줄)
//   node sim-one.mjs replay <export.json>                  → 빌드 export()의 첫 물때·행동열을 엔진에 다시 넣음
// 엔진·AI·데이터는 시뮬레이터 원본(projects/tcg-01/tools/sim, cards.json, balance.json, decks/)만 쓴다(빌드 복사본 아님).
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData, playGame } from '../sim/sim.mjs';
import { createGame, applyMulligan, startGame, applyAction } from '../sim/engine.mjs';
import { chooseAction, mulligan } from '../sim/ai.mjs';

const PROJ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rj = (p) => JSON.parse(readFileSync(p, 'utf8'));
const data = loadData(rj(join(PROJ, 'cards.json')), rj(join(PROJ, 'balance.json')));
const decks = {};
for (const f of readdirSync(join(PROJ, 'decks'))) if (f.endsWith('.json')) { const d = rj(join(PROJ, 'decks', f)); decks[d.hero] = d; }
const [mode, a1, a2, a3, a4] = process.argv.slice(2);
const fin = (st) => ({ winner: st.winner, half: st.half, reason: st.endReason, final: st.players.map((P) => P.hero.hp + P.hero.armor), hp: st.players.map((P) => P.hero.hp), armor: st.players.map((P) => P.hero.armor) });
const mk = (hA, hB, seed, decksAB, bt) => createGame({ cards: data.cards, tokens: data.tokens, rules: data.rules, heroes: data.heroes, seed,
  players: [{ hero: hA, deck: decksAB ? decksAB[0] : decks[hA].cards, bt: (bt && bt[0]) || {} }, { hero: hB, deck: decksAB ? decksAB[1] : decks[hB].cards, bt: (bt && bt[1]) || {} }], log: false });

if (mode === 'trace') {
  const ai = a4 || 'eval', seed = Number(a3);
  const st = mk(a1, a2, seed);
  st.players[0].aiFace = (decks[a1].ai_style && decks[a1].ai_style.face) || 1;
  st.players[1].aiFace = (decks[a2].ai_style && decks[a2].ai_style.face) || 1;
  const m0 = mulligan(st, 0, ai); applyMulligan(st, 0, m0);
  const m1 = mulligan(st, 1, ai); applyMulligan(st, 1, m1);
  startGame(st);
  const actions = [];
  let acts = 0, lastHalf = st.half, total = 0;
  while (!st.over) {
    const act = acts > 40 ? { type: 'end' } : chooseAction(st, ai);
    applyAction(st, act); actions.push(act); total++;
    if (act.type !== 'end' && act.type !== 'choose') acts++;
    if (st.half !== lastHalf) { lastHalf = st.half; acts = 0; }
    if (total > 4000) { st.over = true; st.endReason = 'action_cap'; st.winner = null; }
  }
  console.log(JSON.stringify({ mulligan: [m0, m1], actions, ...fin(st) }));
} else if (mode === 'play') {
  const ai = a4 || 'eval';
  const r = playGame(data, { deck: decks[a1], ai }, { deck: decks[a2], ai }, Number(a3));
  console.log(JSON.stringify({ winner: r.winner, half: r.half, reason: r.reason, winnerHp: r.winnerHp, loserHp: r.loserHp }));
} else if (mode === 'replay') {
  const ex = rj(a1);
  const st = mk(ex.heroes[0], ex.heroes[1], ex.seed, ex.decks, ex.bt);
  applyMulligan(st, 0, ex.mulligan[0]); applyMulligan(st, 1, ex.mulligan[1]);
  startGame(st);
  let bad = null;
  ex.actions.forEach((a, i) => { if (st.over) { bad = bad || { i, why: 'over_before_end' }; return; } try { applyAction(st, a); } catch (e) { bad = bad || { i, why: String(e.message || e) }; } });
  console.log(JSON.stringify({ ...fin(st), error: bad }));
} else { console.error('mode: trace|play|replay'); process.exit(2); }
