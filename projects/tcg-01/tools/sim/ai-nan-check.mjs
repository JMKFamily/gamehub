// AI 평가 NaN 검사: node projects/tcg-01/tools/sim/ai-nan-check.mjs
// (1) 카드 200장 + 토큰을 하나씩 양쪽 필드·손패에 놓고 evaluate가 유한한지 (2) 모든 preset으로 판을 끝까지 돌리며
// 매 결정마다 양쪽 evaluate가 유한한지 확인한다. NaN은 비교가 모두 false라 후보 정렬이 JS 엔진마다 갈리고(빌드≠시뮬),
// 그 카드를 AI가 영영 내지 않게 만든다(2026-11-19 B054 등 오라 응답자 사례).
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGame, applyMulligan, startGame, applyAction, legalActions, cloneState } from './engine.mjs';
import { evaluate, chooseAction, AI_PRESETS } from './ai.mjs';
import { loadData } from './sim.mjs';
import { cardValue } from './value.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cj = JSON.parse(readFileSync(join(root, 'cards.json'), 'utf8'));
const bj = JSON.parse(readFileSync(join(root, 'balance.json'), 'utf8'));
const data = loadData(cj, bj);
const decks = readdirSync(join(root, 'decks')).filter((f) => f.endsWith('.json') && !f.startsWith('starter-')).map((f) => JSON.parse(readFileSync(join(root, 'decks', f), 'utf8')));
const bad = [];
const fin = (x) => Number.isFinite(x) || Math.abs(x) === 1e6 || x === -500;

// (0) 가치 점수
for (const c of [...cj.cards, ...cj.tokens]) if (!Number.isFinite(cardValue(c, data.tokens))) bad.push(`value ${c.id}`);

// (1) 카드마다: 내 손패에 넣고 낼 수 있는 모든 행동을 적용한 뒤 양쪽 평가
let checked = 0;
for (const c of [...cj.cards, ...cj.tokens]) {
  const deck = decks[0];
  const st = createGame({ cards: data.cards, tokens: data.tokens, rules: data.rules, heroes: data.heroes, seed: 7, players: [{ hero: c.owner && c.owner !== 'neutral' ? c.owner : deck.hero, deck: deck.cards }, { hero: decks[1].hero, deck: decks[1].cards }] });
  applyMulligan(st, 0, []); applyMulligan(st, 1, []); startGame(st);
  // 양쪽에 응답자 몇 장 깔기
  for (const p of [0, 1]) { st.active = p; st.players[p].mana = 10; for (const id of ['B092', 'A049', 'B097']) { st.players[p].hand.push({ cid: id, costMod: 0, atkMod: 0, hpMod: 0, dmgMod: 0 }); applyAction(st, { type: 'play', hand: st.players[p].hand.length - 1, target: null }); } }
  st.active = 0; st.players[0].mana = 10;
  if (!st.players[0].view[c.id]) st.players[0].view[c.id] = c;
  st.players[0].hand.push({ cid: c.id, costMod: 0, atkMod: 0, hpMod: 0, dmgMod: 0 });
  for (const a of legalActions(st).filter((x) => x.type === 'play' && st.players[0].hand[x.hand].cid === c.id)) {
    const s2 = cloneState(st, 3); applyAction(s2, a);
    let g = 0; while (s2.pending && g++ < 3) applyAction(s2, { type: 'choose', index: 0 });
    for (const p of [0, 1]) { const v = evaluate(s2, p); checked++; if (!fin(v)) bad.push(`card ${c.id} play→eval p${p}=${v}`); }
  }
}
// (2) preset별 실제 판
let decisions = 0;
const levels = ['greedy', ...Object.keys(AI_PRESETS)];
for (const lv of levels) {
  for (let g = 0; g < 12; g++) {
    const A = decks[g % decks.length], B = decks[(g * 5 + 1) % decks.length];
    const st = createGame({ cards: data.cards, tokens: data.tokens, rules: data.rules, heroes: data.heroes, seed: 1000 + g, players: [{ hero: A.hero, deck: A.cards }, { hero: B.hero, deck: B.cards }] });
    applyMulligan(st, 0, []); applyMulligan(st, 1, []); startGame(st);
    let n = 0;
    while (!st.over && n++ < 3000) {
      for (const p of [0, 1]) { const v = evaluate(st, p); decisions++; if (!fin(v)) { bad.push(`${lv} 판 ${g} 반턴 ${st.half} p${p}=${v}`); break; } }
      applyAction(st, chooseAction(st, lv));
    }
  }
}
console.log(`AI NaN 검사: 카드 평가 ${checked}회, 판 결정 ${decisions}회, preset ${levels.length}개, 비유한 ${bad.length}`);
if (bad.length) { console.log(bad.slice(0, 30).join('\n')); process.exit(1); }
console.log('통과');
