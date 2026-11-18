// 한 판을 AI 대 AI로 끝까지 진행하고 지표 재료를 돌려준다(순수 모듈, node·브라우저 공용).
import { createGame, applyMulligan, startGame, applyAction, positionScore, turnNumber } from './engine.mjs';
import { chooseAction, mulligan } from './ai.mjs';

export function loadData(cardsJson, balanceJson) {
  const cards = {}; for (const c of cardsJson.cards) cards[c.id] = c;
  const tokens = {}; for (const t of cardsJson.tokens) tokens[t.id] = t;
  return { cards, tokens, rules: balanceJson.rules, heroes: balanceJson.heroes, targets: balanceJson.metrics_targets };
}

export function btAll(deck, stage) { const o = {}; if (stage) for (const id of deck.cards) o[id] = stage; return o; }

// a, b: { deck: {hero, cards}, ai: 'greedy'|'eval', bt: {id: stage} }  — a가 선공
export function playGame(data, a, b, seed, opts = {}) {
  const st = createGame({
    cards: data.cards, tokens: data.tokens, rules: data.rules, heroes: data.heroes, seed,
    players: [{ hero: a.deck.hero, deck: a.deck.cards, bt: a.bt || {} }, { hero: b.deck.hero, deck: b.deck.cards, bt: b.bt || {} }],
    log: !!opts.log,
  });
  const ais = [a.ai, b.ai];
  st.players[0].aiFace = (a.deck.ai_style && a.deck.ai_style.face) || 1;
  st.players[1].aiFace = (b.deck.ai_style && b.deck.ai_style.face) || 1;
  applyMulligan(st, 0, mulligan(st, 0, ais[0]));
  applyMulligan(st, 1, mulligan(st, 1, ais[1]));
  startGame(st);
  const trace = [];
  const actsPerTurn = [];
  const played = [new Set(), new Set()];
  const big = { burst10: 0, wipe3: 0, bigcard: 0, lethal_from_15: 0 };
  let lastHalf = st.half, actsThisTurn = 0, total = 0;
  const ehp = (p) => st.players[p].hero.hp + st.players[p].hero.armor;
  let turnStartOppHp = ehp(1 - st.active);
  while (!st.over) {
    const act = actsThisTurn > 40 ? { type: 'end' } : chooseAction(st, ais[st.active]);
    const me = st.active;
    const boards = st.players[0].board.length + st.players[1].board.length;
    let bigCard = false;
    if (act.type === 'play') { const inst = st.players[me].hand[act.hand]; const c = inst && !inst.system ? data.cards[inst.cid] : null; bigCard = !!(c && (c.cost >= 7 || c.rarity === 'abyss')); if (c) played[me].add(c.id); }
    applyAction(st, act);
    total++;
    if (act.type !== 'end' && act.type !== 'choose') actsThisTurn++;
    if (bigCard) big.bigcard++;
    const after = st.players[0].board.length + st.players[1].board.length;
    if (act.type !== 'end' && boards - after >= 3) big.wipe3++;
    if (st.half !== lastHalf || st.over) {
      const dealt = turnStartOppHp - ehp(1 - me);
      if (dealt >= 10) big.burst10++;
      if (st.over && st.winner === me && turnStartOppHp >= 15) big.lethal_from_15++;
      actsPerTurn.push(actsThisTurn);
      trace.push(positionScore(st, 0));
      lastHalf = st.half; actsThisTurn = 0;
      turnStartOppHp = st.over ? 0 : ehp(1 - st.active);
    }
    if (total > 4000) { st.over = true; st.endReason = 'action_cap'; st.winner = null; }
  }
  const w = st.winner;
  const P = st.players;
  // 지표 재료
  let minForWinner = 0, changes = 0, sign = 0;
  for (const s of trace) {
    const ws = w === 1 ? -s : s;
    if (w != null && ws < minForWinner) minForWinner = ws;
    const band = data.targets.lead_band;
    const ns = s >= band ? 1 : s <= -band ? -1 : sign;
    if (sign !== 0 && ns !== sign) changes++;
    sign = ns;
  }
  // 막판 접전: 끝나기 전 마지막 6반턴(각자 3턴) 안에 승자 관점 형세가 0 이하였던 적이 있음
  const tail = trace.slice(Math.max(0, trace.length - 7), trace.length - 1);
  const lateMin = w == null ? null : Math.min(99, ...tail.map((s) => (w === 1 ? -s : s)));
  const manaUse = (Q) => { const t = Q.manaTrace.slice(0, 6); const sp = t.reduce((s, x) => s + x[0], 0), av = t.reduce((s, x) => s + x[1], 0); return av ? sp / av : 0; };
  return {
    winner: w, len: turnNumber(st), half: st.half, reason: st.endReason,
    winnerHp: w == null ? null : P[w].hero.hp + P[w].hero.armor,
    loserHp: w == null ? null : P[1 - w].hero.hp + P[1 - w].hero.armor,
    minForWinner, lateMin, changes, manaUse: [manaUse(P[0]), manaUse(P[1])],
    fatigue: [P[0].fatigue, P[1].fatigue],
    played: [[...played[0]], [...played[1]]],
    actsPerTurn, big, actions: actsPerTurn.reduce((x, y) => x + y, 0),
    log: opts.log ? st.log : undefined,
  };
}
