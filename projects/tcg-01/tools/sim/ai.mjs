// tcg-01 대전 AI 2단계 (순수 모듈, 빌드에서도 상대 AI로 그대로 쓸 수 있음)
//  greedy : 탐욕형. 비싼 카드부터 마나를 다 쓰고, 방어 하수인이 없으면 모두 영웅을 친다.
//  eval   : 교환 평가형. 가능한 행동마다 상태를 복제해 한 수 앞을 보고 형세 평가값이 가장 오르는 행동을 고른다.
//           손패 카드에 "아껴 둔 값"을 매겨, 값어치 낮은 대상에 제거기를 쓰지 않고(아껴두기),
//           교환(하수인끼리 싸움)과 영웅 공격을 같은 저울로 비교한다.
import { legalActions, applyAction, cloneState, cardOf, costOf, attackOf, findChar, makeRng } from './engine.mjs';
import { budget, cardValue } from './value.mjs';

export const AI_LEVELS = ['greedy', 'eval', 'easy', 'normal', 'hard', 'expert'];
// 상대 난이도(요청자 지시 2026-11-19 "쉬움부터"): 교환 평가형에 판단 잡음·공격 건너뛰기·경주 판단을 얹은 매개변수.
// noise: 후보 행동 평가값에 더하는 균등 잡음 폭(±noise). skip_attack: 공격이 최선일 때 그 공격을 안 하고 다른 수를 볼 확률.
// race: "누가 때리는 쪽인가" 시계 비교. 값의 근거·측정은 20-balance 15절, balance.json ai.difficulty.
export const AI_PRESETS = {
  easy: { noise: 7, skip_attack: 0.2, race: false },
  normal: { noise: 3.5, skip_attack: 0.08, race: false },
  hard: { noise: 4.2, skip_attack: 0, race: true, race_fast: 1.5, race_slow: 0.85, lookahead_top: 6 },
  expert: { noise: 0, skip_attack: 0, race: true, race_fast: 1.5, race_slow: 0.85, lookahead_top: 6 },
  eval: { noise: 0, skip_attack: 0, race: false },
};

// ---------- 공용 ----------
function harmful(e) {
  if (!e) return false;
  if (['damage', 'destroy', 'freeze', 'silence', 'curse'].includes(e.do)) return true;
  if (e.do === 'buff' && ((e.atk || 0) < 0 || (e.hp || 0) < 0)) return true;
  return false;
}
function firstChoiceEffect(card) {
  return (card.effects || []).find((e) => e.target && e.target.startsWith('choose')) || null;
}

export function mulligan(state, p, level) {
  const P = state.players[p];
  const out = [];
  const keep2 = P.hand.some((i) => cardOf(state, P, i).cost <= 2);
  P.hand.forEach((inst, i) => {
    const c = cost0(state, P, inst);
    if (level === 'greedy') { if (c > 3) out.push(i); }
    else if (c > 4 || (c === 4 && !keep2)) out.push(i);
  });
  return out;
}
function cost0(state, P, inst) { return cardOf(state, P, inst).cost; }

function pickDiscover(state, p) {
  const pd = state.pending;
  const P = state.players[p];
  let best = 0, bv = -1e9;
  pd.options.forEach((cid, i) => {
    const c = state.db[cid];
    let v = cardValue(c, state.tokens) - budget(c.cost) * 0.3;
    if (c.cost > P.maxMana + 2) v -= 3;
    if (v > bv) { bv = v; best = i; }
  });
  return { type: 'choose', index: best };
}

// ---------- 탐욕형 ----------
function greedyTarget(state, p, card, acts) {
  const e = firstChoiceEffect(card);
  const E = state.players[1 - p];
  const ts = acts.map((a) => findChar(state, a.target)).filter(Boolean);
  if (!e) return acts[0];
  if (harmful(e)) {
    const n = (e.n || 0);
    const enemyMin = ts.filter((c) => !c.isHero && c.owner !== p);
    if (e.do === 'damage') {
      const kill = enemyMin.filter((c) => c.hp <= n && !c.kw.shield).sort((a, b) => attackOf(state, b) - attackOf(state, a));
      if (kill.length) return acts.find((a) => a.target === kill[0].uid);
      const face = ts.find((c) => c.isHero && c.owner !== p);
      if (face) return acts.find((a) => a.target === face.uid);
    }
    const best = enemyMin.sort((a, b) => attackOf(state, b) + b.hp - attackOf(state, a) - a.hp)[0];
    if (best) return acts.find((a) => a.target === best.uid);
    return acts.find((a) => { const c = findChar(state, a.target); return c && c.owner !== p; }) || null;
  }
  // 이로운 효과: 내 하수인 중 공격력 높은 것, 회복은 내 영웅
  if (e.do === 'heal') { const h = ts.find((c) => c.isHero && c.owner === p); if (h) return acts.find((a) => a.target === h.uid); }
  const mine = ts.filter((c) => !c.isHero && c.owner === p).sort((a, b) => attackOf(state, b) - attackOf(state, a));
  if (mine.length) return acts.find((a) => a.target === mine[0].uid);
  return null;
}

export function greedyAction(state) {
  const p = state.active;
  if (state.pending) return pickDiscover(state, p);
  const P = state.players[p];
  const acts = legalActions(state);
  // 1) 카드: 비싼 것부터
  const plays = acts.filter((a) => a.type === 'play');
  if (plays.length) {
    const byHand = new Map();
    for (const a of plays) { if (!byHand.has(a.hand)) byHand.set(a.hand, []); byHand.get(a.hand).push(a); }
    const order = [...byHand.keys()].sort((x, y) => {
      const cx = costOf(state, P, P.hand[x]), cy = costOf(state, P, P.hand[y]);
      if (cy !== cx) return cy - cx;
      return (cardOf(state, P, P.hand[x]).kind === 'minion' ? 0 : 1) - (cardOf(state, P, P.hand[y]).kind === 'minion' ? 0 : 1);
    });
    for (const h of order) {
      const list = byHand.get(h);
      const card = cardOf(state, P, P.hand[h]);
      if (P.hand[h].system) { if (list.length && hasPlayableAfterSpark(state, P)) return list[0]; continue; }
      if (list.length === 1 && list[0].target == null) return list[0];
      const a = greedyTarget(state, p, card, list);
      if (a) return a;
    }
  }
  // 2) 영웅 능력
  const pw = acts.filter((a) => a.type === 'power');
  if (pw.length) {
    const hp = state.heroes[P.heroId];
    if (pw.length === 1) return pw[0];
    const a = greedyTarget(state, p, { effects: hp.power_effects }, pw);
    if (a) return a;
  }
  // 3) 공격: 영웅 우선, 돌진(낸 턴)은 죽일 수 있는 하수인
  const atks = acts.filter((a) => a.type === 'attack');
  if (atks.length) {
    const face = atks.find((a) => findChar(state, a.target).isHero);
    if (face) return face;
    // 방어 하수인 강제 또는 돌진: 죽일 수 있는 것 중 가장 센 것, 없으면 첫 대상
    let best = null, bv = -1e9;
    for (const a of atks) {
      const m = findChar(state, a.attacker), t = findChar(state, a.target);
      const kill = t.hp <= attackOf(state, m) && !t.kw.shield;
      const v = (kill ? 10 : 0) + attackOf(state, t) - (attackOf(state, t) >= m.hp ? 3 : 0);
      if (v > bv) { bv = v; best = a; }
    }
    return best;
  }
  return { type: 'end' };
}
function hasPlayableAfterSpark(state, P) {
  return P.hand.some((i) => !i.system && costOf(state, P, i) === P.mana + 1);
}

// ---------- 교환 평가형 ----------
export const EVAL_W = {
  hand_flat: 1.0, hand_per_budget: 0.3, enemy_hand: 2.6,
  atk: 1.0, hp: 0.9,
  lethal_bonus: 12, danger_penalty: 20,
};

function hpVal(x) {
  if (EVAL_W.flat_hp) return x <= 0 ? -60 : x * EVAL_W.flat_hp;
  // 체력이 낮을수록 1점의 값이 커진다
  if (x <= 0) return -60;
  let v = 0;
  v += Math.min(x, 10) * 1.6;
  if (x > 10) v += (Math.min(x, 20) - 10) * 1.0;
  if (x > 20) v += (x - 20) * 0.6;
  return v;
}

function minionVal(state, m, forEnemyFrozen) {
  const a = attackOf(state, m);
  let v = a * EVAL_W.atk + Math.max(0, m.hp) * EVAL_W.hp;
  const k = m.kw;
  if (k.guard) v += 1.2 + 0.2 * m.hp;
  if (k.shield) v += 0.6 * a + 0.8;
  if (k.deadly) v += 2.5;
  if (k.lifesteal) v += 0.5 * a;
  if (k.twice) v += 0.7 * a;
  if (k.stealth) v += 0.8;
  if (m.fx) for (const e of m.fx) {
    if (e.on === 'aura') v += e.do === 'aura_attack' ? e.n * 1.5 + 0.5 : e.n * 1.5;
    else if (e.on === 'turn_end' || e.on === 'turn_start') v += 2.5;
    else if (e.on === 'death') v += 1.5;
    else if (e.on === 'kill' || e.on === 'hit_hero' || e.on === 'attack' || e.on === 'friendly_spell') v += 1.5;
  }
  if (m.curse > 0) v -= Math.min(m.hp, m.curse) * 0.9;
  if (forEnemyFrozen && state.half + 1 <= m.freezeUntil) v -= a * 0.6;
  return Math.max(0.3, v);
}

export function evaluate(state, p) {
  if (state.over) return state.winner === p ? 1e6 : state.winner == null ? -500 : -1e6;
  const me = state.players[p];
  const E = state.players[1 - p];
  const myH = me.hero.hp + me.hero.armor;
  const eH = E.hero.hp + E.hero.armor;
  // "누가 때리는 쪽인가": 내 필드로 상대를 죽이는 턴 수(시계)와 상대 시계를 비교해, 빠른 쪽이면 영웅 피해를 더 높게 본다
  // 시계 비교는 결정 시점(뿌리 상태)에서 한 번만 계산해 넘긴다(자식 상태마다 바꾸면 "느린 척"이 이득이 되는 왜곡이 생김)
  const face = ROOT_FACE != null ? ROOT_FACE : (me.aiFace || 1);
  let s = hpVal(myH) - face * hpVal(eH);
  // 저주 남은 피해
  const curseDmg = (c) => (c * (c + 1)) / 2;
  s += curseDmg(E.hero.curse) * 0.9 - curseDmg(me.hero.curse) * 0.9;
  let myAtk = 0, eAtk = 0, eGuard = false;
  for (const m of me.board) { s += minionVal(state, m, false); myAtk += attackOf(state, m) * (m.kw.twice ? 2 : 1); }
  for (const m of E.board) { s -= minionVal(state, m, true); if (state.half + 1 > m.freezeUntil) eAtk += attackOf(state, m) * (m.kw.twice ? 2 : 1); if (m.kw.guard && !m.kw.stealth) eGuard = true; }
  for (const inst of me.hand) {
    if (inst.system) { s += 0.8; continue; }
    const c = cardOf(state, me, inst);
    s += EVAL_W.hand_flat + EVAL_W.hand_per_budget * budget(c.cost) - inst.costMod * 1.1 + (inst.atkMod + inst.hpMod) * 0.8;
  }
  s += Math.min(E.hand.length, 10) * -EVAL_W.enemy_hand;
  // 다음 상대 턴 위험 / 다음 내 턴 치명
  if (eAtk >= myH) s -= EVAL_W.danger_penalty;
  if (!eGuard && myAtk >= eH) s += EVAL_W.lethal_bonus;
  // 덱 바닥(피로) 경고
  if (me.deck.length === 0) s -= 3 + me.fatigue;
  return s;
}

let SALT = 1;
let ROOT_FACE = null;
function raceFace(state, p, pr) {
  const me = state.players[p], E = state.players[1 - p];
  let face = me.aiFace || 1;
  const race = pr && pr.race != null ? pr.race : EVAL_W.race;
  const rf = (pr && pr.race_fast) || EVAL_W.race_fast, rs = (pr && pr.race_slow) || EVAL_W.race_slow;
  if (!race) return face;
  const sumAtk = (B) => B.reduce((a, m) => a + attackOf(state, m), 0);
  const myH = me.hero.hp + me.hero.armor, eH = E.hero.hp + E.hero.armor;
  const myA = sumAtk(me.board), eA = sumAtk(E.board);
  const myClock = myA > 0 ? Math.ceil(eH / myA) : 99, eClock = eA > 0 ? Math.ceil(myH / eA) : 99;
  if (myClock < 99 && myClock <= eClock) face *= rf; else if (eClock < myClock) face *= rs;
  return face;
}
export function evalAction(state, pr) {
  const p = state.active;
  if (state.pending) return pickDiscover(state, p);
  const acts = legalActions(state);
  ROOT_FACE = raceFace(state, p, pr);
  const noise = (pr && pr.noise) || 0, skip = (pr && pr.skip_attack) || 0;
  // 난이도 잡음은 게임 난수와 분리된 결정론 난수(같은 상태 → 같은 선택)
  const nr = makeRng((state.rngState ^ Math.imul(state.half + 1, 0x9e3779b1) ^ acts.length * 7919) >>> 0);
  let skipAtk = skip > 0 && nr.next() < skip;
  let cands = null;
  const base = evaluate(state, p);
  let best = { type: 'end' }, bv = base + 0.05;
  const P = state.players[p];
  for (const a of acts) {
    if (a.type === 'end') continue;
    if (a.type === 'play' && isManaCard(state, P, P.hand[a.hand])) { if (hasPlayableAfterSpark(state, P)) return a; continue; }
    const s2 = cloneState(state, SALT++ & 0xffff);
    applyAction(s2, a);
    let guard = 0;
    while (s2.pending && s2.pending.owner === p && guard++ < 3) applyAction(s2, pickDiscover(s2, p));
    let v = evaluate(s2, p);
    if (s2.over && s2.winner === p) v = 1e7;
    else if (noise) v += (nr.next() * 2 - 1) * noise;
    if (skipAtk && a.type === 'attack' && v < 1e7) continue;
    if (pr && pr.lookahead_top) { (cands || (cands = [])).push({ a, v, s2 }); continue; }
    if (v > bv) { bv = v; best = a; }
  }
  if (cands) {
    // 어려움: 상위 후보마다 "그다음 내 최선 한 수"까지 본 값으로 다시 고른다(한 턴 안 순서 계획)
    cands.sort((x, y) => y.v - x.v);
    for (const c of cands.slice(0, pr.lookahead_top)) {
      let v2 = c.v;
      if (!c.s2.over && c.s2.active === p && !c.s2.pending) {
        for (const b of legalActions(c.s2)) {
          if (b.type === 'end') continue;
          const s3 = cloneState(c.s2, SALT++ & 0xffff);
          applyAction(s3, b);
          let g = 0; while (s3.pending && s3.pending.owner === p && g++ < 3) applyAction(s3, pickDiscover(s3, p));
          const v3 = s3.over && s3.winner === p ? 1e7 : evaluate(s3, p);
          if (v3 > v2) v2 = v3;
        }
      }
      if (v2 > bv) { bv = v2; best = c.a; }
    }
  }
  ROOT_FACE = null;
  return best;
}

function isManaCard(state, P, inst) {
  const c = cardOf(state, P, inst);
  return c.kind === 'spell' && (c.effects || []).length > 0 && c.effects.every((e) => e.do === 'mana');
}

export function chooseAction(state, level) {
  if (level === 'greedy') return greedyAction(state);
  return evalAction(state, AI_PRESETS[level] || null);
}
