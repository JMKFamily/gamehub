// tcg-01 「썰물 영장」 규칙 엔진 (순수 ES 모듈: DOM·node 전용 API 없음, 결정론, 시드 난수)
// 빌드(브라우저)와 시뮬레이터(node)가 같은 파일을 그대로 쓴다. 규칙 수치는 balance.json의 rules,
// 카드는 cards.json, 호명술은 balance.json의 heroes를 넣어 준다(이 파일에 카드 수치를 박지 않는다).
// 효과 원시 동작 어휘·트리거·대상 이름은 20-balance.md 8절 "엔진 효과 스키마"에 정리.
// 용어: 응답자=minion, 의식=spell, 인장=weapon, 호명자=hero, 심지=mana, 영장첩=deck.

export const ENGINE_VERSION = '2.0.0';

// ---------- 시드 난수 (mulberry32) ----------
export function makeRng(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  return {
    get state() { return s; },
    set state(v) { s = v >>> 0; },
    next() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(n) { return Math.floor(this.next() * n); },
  };
}
function withRng(state, fn) {
  if (state._r) return fn(state._r);
  const r = makeRng(1); r.state = state.rngState;
  state._r = r;
  try { return fn(r); } finally { state.rngState = r.state; state._r = null; }
}

const HERO_UID = [1, 2];
export const KEYWORDS = ['guard', 'shield', 'stealth', 'rush', 'charge', 'deadly', 'lifesteal', 'double_part'];
// guard=방파제 shield=소금막 stealth=물안개 rush=박차 charge=급류 deadly=익사 lifesteal=들이켬

// ---------- 카드 보기(돌파 단계 반영) ----------
// card.breakthrough = { "1": {"health":1}, "2": {...}, "3": {...} } (각 단계까지의 누적 변화)
export function cardView(card, stage) {
  if (!card) return null;
  const bt = (stage && card.breakthrough && card.breakthrough[String(stage)]) || null;
  if (!bt) return card;
  const v = { ...card, stage };
  if (card.kind !== 'spell') {
    v.attack = card.attack + (bt.attack || 0);
    v.health = card.health + (bt.health || 0);
  }
  if (bt.effect_n) v.effects = card.effects.map((e, i) => (bt.effect_n[String(i)] ? { ...e, n: (e.n || 0) + bt.effect_n[String(i)] } : e));
  return v;
}

const inst0 = (cid, extra) => ({ cid, costMod: 0, atkMod: 0, hpMod: 0, dmgMod: 0, ...(extra || {}) });

// ---------- 게임 만들기 ----------
// opts: { cards:{id:card}, tokens:{id:token}, rules, heroes:{heroId:{...}}, seed,
//         players:[{hero, deck:[cardId...], bt:{cardId:stage}}, {...}], log:bool }
export function createGame(opts) {
  const rules = opts.rules;
  const db = opts.cards;
  const state = {
    v: ENGINE_VERSION, rules, db, tokens: opts.tokens || {}, heroes: opts.heroes || {},
    rngState: (opts.seed >>> 0) || 1, _r: null,
    half: 0, active: 0, over: false, winner: null, endReason: null,
    phase: 'mulligan', uidNext: 10, pending: null,
    curseBursts: 0,
    log: opts.log ? [] : null,
    players: [0, 1].map((p) => {
      const cfg = opts.players[p];
      const view = {};
      for (const id of cfg.deck) view[id] = cardView(db[id], (cfg.bt && cfg.bt[id]) || 0);
      return {
        idx: p, heroId: cfg.hero,
        hero: { uid: HERO_UID[p], owner: p, isHero: true, hp: rules.hero_health, maxHp: rules.hero_health, armor: 0, curse: 0, weapon: null, attacks: 0, kw: {}, timed: [] },
        mana: 0, maxMana: 0, overloadNext: 0, overloadNow: 0, powerUsed: false, fatigue: 0,
        deck: cfg.deck.map((cid) => inst0(cid)),
        hand: [], board: [], secrets: [], graveyard: 0, burned: 0,
        view, manaSpent: 0, manaAvail: 0, manaTrace: [],
        played: 0, kills: 0, spellHitDraw: 0,
        nextDisc: null, turnDiscMinion: 0, turnDiscSpell: 0, nextMinionKw: null,
        persistBuff: { atk: 0, hp: 0 }, secretRearm: false,
      };
    }),
  };
  withRng(state, (r) => {
    for (const P of state.players) shuffle(P.deck, r);
    for (let i = 0; i < rules.start_hand_first; i++) drawCard(state, state.players[0], r, true);
    for (let i = 0; i < rules.start_hand_second; i++) drawCard(state, state.players[1], r, true);
  });
  return state;
}
function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = r.int(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } }
function log(state, ev) { if (state.log) state.log.push({ half: state.half, ...ev }); }

// 멀리건: 바꿀 손패 인덱스. 먼저 새로 뽑고 나서 돌려보낸 카드를 섞어 같은 장을 다시 받지 않게 한다.
export function applyMulligan(state, p, replace) {
  const P = state.players[p];
  const idxs = [...new Set(replace)].filter((i) => i >= 0 && i < P.hand.length).sort((a, b) => b - a);
  withRng(state, (r) => {
    const out = [];
    for (const i of idxs) out.push(P.hand.splice(i, 1)[0]);
    for (let k = 0; k < out.length; k++) drawCard(state, P, r, true);
    for (const c of out) P.deck.splice(r.int(P.deck.length + 1), 0, inst0(c.cid));
  });
  log(state, { t: 'mulligan', p, n: idxs.length });
}

export function startGame(state) {
  const R = state.rules;
  if (R.second_bonus_card) state.players[1].hand.push(inst0(R.second_bonus_card.id, { system: true }));
  if (R.second_start_armor) state.players[1].hero.armor += R.second_start_armor;
  state.phase = 'play';
  state.active = 0;
  beginTurn(state);
}

// ---------- 조회 ----------
export function cardOf(state, P, inst) {
  if (inst.system) return state.rules.second_bonus_card;
  return P.view[inst.cid] || state.db[inst.cid] || state.tokens[inst.cid];
}
export function costOf(state, P, inst) {
  const c = cardOf(state, P, inst);
  let cost = c.cost + inst.costMod;
  if (c.kind === 'minion') cost -= P.turnDiscMinion;
  if (c.kind === 'spell' && P.turnDiscSpell) cost = Math.min(cost, Math.max(1, cost - P.turnDiscSpell));
  if (P.nextDisc) cost -= P.nextDisc.n;
  return Math.max(0, cost);
}
export function hasKw(m, k) {
  if (m.kw && m.kw[k]) return true;
  if (m.aKw && m.aKw[k]) return true;
  if (m.timed) for (const t of m.timed) if (t.kw && t.kw.includes(k)) return true;
  return false;
}
export function attackOf(state, m) {
  if (m.isHero) return m.weapon ? Math.max(0, m.weapon.atk) : 0;
  let a = m.atk + (m.aAtk || 0);
  for (const t of m.timed) a += t.atk || 0;
  if (m.fx) for (const e of m.fx) if (e.on === 'aura' && e.do === 'self_atk_per_missing') {
    const H = state.players[m.owner].hero;
    a += Math.floor((H.maxHp - H.hp) / e.n);
  }
  return Math.max(0, a);
}
export function spellPower(state, P) {
  let s = 0;
  for (const o of P.board) if (o.fx) for (const e of o.fx) if (e.on === 'aura' && e.do === 'aura_spell') s += e.n;
  return s;
}
function auraCount(P, d) { let s = 0; for (const o of P.board) if (o.fx) for (const e of o.fx) if (e.on === 'aura' && e.do === d) s += e.n || 1; return s; }
export function findChar(state, uid) {
  for (const P of state.players) {
    if (P.hero.uid === uid) return P.hero;
    for (const m of P.board) if (m.uid === uid) return m;
  }
  return null;
}
const isCurseCard = (c) => (c.effects || []).some((e) => e.do === 'curse') || (c.secret || []).some((e) => e.do === 'curse');
const isSecretCard = (c) => (c.effects || []).some((e) => e.do === 'secret');
const hasCombo = (c) => (c.effects || []).some((e) => e.cond === 'combo');

// ---------- 오라 다시 계산 ----------
function refreshAuras(state) {
  for (const P of state.players) {
    const B = P.board;
    for (let i = 0; i < B.length; i++) {
      const m = B[i];
      let aA = 0, aH = 0; const aK = {};
      for (let j = 0; j < B.length; j++) {
        const s = B[j];
        if (!s.fx) continue;
        for (const e of s.fx) {
          if (e.on !== 'aura' || e.do !== 'aura') continue;
          if (e.scope === 'others' && s === m) continue;
          if (e.scope === 'adjacent' && Math.abs(i - j) !== 1) continue;
          if (e.tf && !tfOk(state, m, e.tf)) continue;
          if (e.tf_not && tfOk(state, m, e.tf_not)) continue;
          aA += e.atk || 0; aH += e.hp || 0;
          if (e.kw) for (const k of e.kw) aK[k] = true;
        }
      }
      const d = aH - (m.aHp || 0);
      if (d > 0) { m.maxHp += d; m.hp += d; }
      else if (d < 0) { m.maxHp += d; m.hp = Math.min(m.hp, m.maxHp); }
      m.aHp = aH; m.aAtk = aA; m.aKw = aK;
    }
  }
}

// ---------- 턴 ----------
function beginTurn(state) {
  state.half += 1;
  const P = state.players[state.active];
  const R = state.rules;
  P.maxMana = Math.min(R.mana_cap, P.maxMana + 1);
  P.overloadNow = P.overloadNext; P.overloadNext = 0;
  P.mana = Math.max(0, P.maxMana - P.overloadNow);
  P.powerUsed = false; P.played = 0; P.kills = 0; P.spellHitDraw = 0;
  P.turnDiscMinion = 0; P.turnDiscSpell = 0;
  if (P.nextDisc && P.nextDisc.until != null) P.nextDisc = null;
  P.nextMinionKw = null;
  P.manaAvail = P.mana; P.manaSpent = 0;
  P.hero.attacks = 0;
  for (const Q of state.players) for (const m of Q.board) m.cap = {};
  for (const m of P.board) { m.sick = false; m.attacks = 0; }
  log(state, { t: 'turn', p: state.active, mana: P.mana });
  withRng(state, (r) => drawCard(state, P, r, false));
  if (state.over) return;
  // 소금독: 걸린 쪽의 턴 시작에 소금독(+상대 오라 보너스)만큼 피해, 그 뒤 감소
  const E = state.players[1 - state.active];
  const bonus = auraCount(E, 'aura_curse_bonus');
  for (const c of [P.hero, ...P.board]) {
    if (c.curse > 0) {
      dealDamage(state, null, c, c.curse + bonus, { curse: true });
      c.curse = Math.max(0, c.curse - R.curse_decay_per_tick);
      state.curseBursts += 1;
      fireBoard(state, 1 - state.active, 'enemy_curse_tick');
    }
  }
  resolveDeaths(state);
  if (checkEnd(state)) return;
  fireBoard(state, state.active, 'turn_start');
  resolveDeaths(state);
  refreshAuras(state);
  checkEnd(state);
}

function endTurn(state) {
  const P = state.players[state.active];
  fireBoard(state, state.active, 'turn_end');
  resolveDeaths(state);
  if (checkEnd(state)) return;
  // 기한 있는 효과 만료(이번 턴 / 상대 다음 턴 끝까지)
  for (const Q of state.players) for (const m of Q.board) {
    if (!m.timed.length) continue;
    const keep = [];
    for (const t of m.timed) {
      if (t.until <= state.half) { if (t.hp) { m.maxHp -= t.hp; m.hp = Math.min(m.hp, m.maxHp); } }
      else keep.push(t);
    }
    m.timed = keep;
  }
  if (P.nextDisc && P.nextDisc.until != null) P.nextDisc = null;
  refreshAuras(state);
  P.manaTrace.push([P.manaSpent, P.manaAvail]);
  log(state, { t: 'end', p: state.active });
  if (state.half >= state.rules.turn_limit_each * 2) { finishByHealth(state); return; }
  state.active = 1 - state.active;
  beginTurn(state);
}

function finishByHealth(state) {
  const [a, b] = state.players.map((P) => P.hero.hp + P.hero.armor);
  state.over = true; state.endReason = 'turn_limit';
  state.winner = a > b ? 0 : b > a ? 1 : null;
}
function checkEnd(state) {
  if (state.over) return true;
  const d0 = state.players[0].hero.hp <= 0, d1 = state.players[1].hero.hp <= 0;
  if (d0 || d1) {
    state.over = true; state.endReason = 'hero_dead';
    state.winner = d0 && d1 ? null : d0 ? 1 : 0;
    log(state, { t: 'over', winner: state.winner });
    return true;
  }
  return false;
}

function drawCard(state, P, r, setup) {
  if (P.deck.length === 0) {
    if (setup) return null;
    P.fatigue += 1;
    log(state, { t: 'fatigue', p: P.idx, n: P.fatigue });
    dealDamage(state, null, P.hero, P.fatigue, { fatigue: true });
    checkEnd(state);
    return null;
  }
  const c = P.deck.pop();
  if (P.hand.length >= state.rules.hand_limit) { P.burned += 1; log(state, { t: 'burn', p: P.idx, cid: c.cid }); return null; }
  P.hand.push(c);
  log(state, { t: 'draw', p: P.idx, cid: setup ? null : c.cid });
  return c;
}
function addToHand(state, P, inst) {
  if (P.hand.length >= state.rules.hand_limit) { P.burned += 1; return null; }
  P.hand.push(inst); return inst;
}

// ---------- 피해·회복·죽음 ----------
function dealDamage(state, src, target, amount, flags) {
  if (amount <= 0 || !target) return 0;
  if (!target.isHero && hasKw(target, 'shield')) {
    target.kw = { ...target.kw, shield: false };
    if (target.aKw && target.aKw.shield) target.aKw = { ...target.aKw, shield: false };
    target.timed = target.timed.map((t) => (t.kw && t.kw.includes('shield') ? { ...t, kw: t.kw.filter((k) => k !== 'shield') } : t));
    log(state, { t: 'shield', uid: target.uid });
    return 0;
  }
  if (target.isHero) {
    const absorb = Math.min(target.armor, amount);
    target.armor -= absorb; target.hp -= amount - absorb;
  } else {
    target.hp -= amount;
    if (src && !(flags && flags.spell) && srcKw(src, 'deadly')) target.dead = true;
  }
  log(state, { t: 'dmg', uid: target.uid, n: amount });
  if (src && !(flags && flags.spell) && srcKw(src, 'lifesteal')) heal(state, state.players[src.owner].hero, amount);
  if (flags && flags.spell && target.isHero && flags.owner != null && target.owner !== flags.owner) fireBoard(state, flags.owner, 'my_spell_hit_hero');
  return amount;
}
function srcKw(src, k) { return src.isHero ? !!(src.weapon && src.weapon.kw && src.weapon.kw[k]) : hasKw(src, k); }
function heal(state, target, n) {
  if (!target || n <= 0) return;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + n);
  if (target.hp !== before) log(state, { t: 'heal', uid: target.uid, n: target.hp - before });
}

function resolveDeaths(state) {
  for (let guard = 0; guard < 30; guard++) {
    const dead = [];
    for (const p of [state.active, 1 - state.active]) {
      const P = state.players[p];
      const keep = [];
      for (const m of P.board) (m.hp <= 0 || m.dead ? dead : keep).push(m);
      P.board = keep;
    }
    if (!dead.length) { refreshAuras(state); return; }
    refreshAuras(state);
    for (const m of dead) {
      const owner = state.players[m.owner];
      owner.graveyard += 1;
      if (m.owner !== state.active) state.players[state.active].kills += 1;
      log(state, { t: 'die', uid: m.uid, cid: m.cid });
      if (m.markedBy != null && m.markUntil >= state.half) runEffects(state, m.markedBy, [{ on: 'mark', do: 'draw', n: m.markDraw || 1 }], { source: null });
      const hadEbb = m.fx && m.fx.some((e) => e.on === 'death');
      if (m.fx) {
        const fx = m.fx.filter((e) => e.on === 'death');
        if (fx.length) runEffects(state, m.owner, fx, { source: m, isSpell: false, deadSelf: m });
      }
      fireBoard(state, m.owner, 'friendly_death', { deadOther: m, deadHadEbb: hadEbb });
      fireBoard(state, 1 - m.owner, 'enemy_minion_died', { deadOther: m });
    }
  }
}

// ---------- 소환 ----------
function makeMinion(state, owner, card, inst, extra) {
  const atk = card.attack + ((inst && inst.atkMod) || 0) + ((extra && extra.atk) || 0);
  const hp = card.health + ((inst && inst.hpMod) || 0) + ((extra && extra.hp) || 0);
  const kw = {};
  for (const k of card.keywords || []) kw[k] = true;
  return {
    uid: state.uidNext++, cid: card.id, owner,
    atk, hp, maxHp: hp, baseAtk: card.attack, baseHp: card.health,
    kw, fx: card.effects && card.effects.length ? card.effects : null,
    sick: true, attacks: 0, freezeUntil: -1, curse: 0, timed: [], aAtk: 0, aHp: 0, aKw: {}, parts: 0, cap: {},
    markedBy: null,
  };
}
function placeMinion(state, P, m, pos) {
  if (pos == null || pos < 0 || pos > P.board.length) P.board.push(m); else P.board.splice(pos, 0, m);
  refreshAuras(state);
}
function summonToken(state, owner, tokenId, extra) {
  const P = state.players[owner];
  if (P.board.length >= state.rules.board_limit) return null;
  const t = state.tokens[tokenId];
  if (!t) return null;
  const m = makeMinion(state, owner, t, null, extra);
  placeMinion(state, P, m, null);
  log(state, { t: 'summon', p: owner, uid: m.uid, cid: t.id });
  return m;
}

// ---------- 대상 ----------
export function tfOk(state, c, tf) {
  if (!tf) return true;
  if (tf.kw && !hasKw(c, tf.kw)) return false;
  if (tf.kw_any && !tf.kw_any.some((k) => hasKw(c, k))) return false;
  if (tf.has_part && !(c.parts > 0)) return false;
  if (tf.cursed && !(c.curse > 0)) return false;
  if (tf.damaged && !(c.hp < c.maxHp)) return false;
  if (tf.hp_lte != null && c.hp > tf.hp_lte) return false;
  if (tf.minion && c.isHero) return false;
  return true;
}
function visibleEnemies(state, owner) { return state.players[1 - owner].board.filter((m) => !hasKw(m, 'stealth')); }
export function choiceTargets(state, owner, spec, tf) {
  const me = state.players[owner];
  const E = state.players[1 - owner];
  let out;
  switch (spec) {
    case 'choose_enemy': out = [E.hero, ...visibleEnemies(state, owner)]; break;
    case 'choose_enemy_minion': out = visibleEnemies(state, owner); break;
    case 'choose_friendly_minion': out = [...me.board]; break;
    case 'choose_friendly': out = [me.hero, ...me.board]; break;
    case 'choose_minion': out = [...me.board, ...visibleEnemies(state, owner)]; break;
    case 'choose_any': out = [me.hero, ...me.board, E.hero, ...visibleEnemies(state, owner)]; break;
    default: return null;
  }
  return tf ? out.filter((c) => tfOk(state, c, tf)) : out;
}

function pick(arr, r) { return arr.length ? [arr[r.int(arr.length)]] : []; }
function resolveTargets(state, owner, spec, ctx, r) {
  const me = state.players[owner];
  const E = state.players[1 - owner];
  const alive = (c) => c && (c.isHero || state.players[c.owner].board.includes(c));
  switch (spec) {
    case 'chosen': return alive(ctx.chosenObj) ? [ctx.chosenObj] : [];
    case 'chosen2': return alive(ctx.chosen2Obj) ? [ctx.chosen2Obj] : [];
    case 'self': return ctx.source && !ctx.source.isHero && me.board.includes(ctx.source) ? [ctx.source] : [];
    case 'enemy_hero': return [E.hero];
    case 'my_hero': return [me.hero];
    case 'all_enemy_minions': return [...E.board];
    case 'all_friendly_minions': return [...me.board];
    case 'other_friendly_minions': return me.board.filter((m) => m !== ctx.source);
    case 'all_minions': return [...me.board, ...E.board];
    case 'all_other_minions': return [...me.board, ...E.board].filter((m) => m !== ctx.source);
    case 'all_enemies': return [E.hero, ...E.board];
    case 'random_enemy_minion': return pick(E.board, r);
    case 'random_enemy': return pick([E.hero, ...E.board], r);
    case 'random_friendly_minion': return pick(me.board.filter((m) => m !== ctx.source), r);
    case 'random_damaged_friendly_minion': return pick(me.board.filter((m) => m !== ctx.source && m.hp < m.maxHp), r);
    case 'random_friendly_guard': return pick(me.board.filter((m) => hasKw(m, 'guard')), r);
    case 'random_friendly_stealth': return pick(me.board.filter((m) => m !== ctx.source && hasKw(m, 'stealth')), r);
    case 'friendly_guard_minions': return me.board.filter((m) => hasKw(m, 'guard'));
    case 'friendly_rush_minions': return me.board.filter((m) => hasKw(m, 'rush'));
    case 'cursed_enemy_minions': return E.board.filter((m) => m.curse > 0);
    case 'cursed_enemies': return [E.hero, ...E.board].filter((c) => c.curse > 0);
    case 'adjacent': {
      const i = me.board.indexOf(ctx.source);
      return i < 0 ? [] : [me.board[i - 1], me.board[i + 1]].filter(Boolean);
    }
    case 'attack_target': return alive(ctx.attackTarget) ? [ctx.attackTarget] : [];
    case 'attack_target_adjacent': {
      const t = ctx.attackTarget; if (!t || t.isHero) return [];
      const B = state.players[t.owner].board; const i = B.indexOf(t);
      return i < 0 ? [] : [B[i - 1], B[i + 1]].filter(Boolean);
    }
    case 'trigger_source': return alive(ctx.triggerSource) ? [ctx.triggerSource] : [];
    case 'strongest_enemy_minion': {
      if (!E.board.length) return [];
      let b = E.board[0]; for (const m of E.board) if (attackOf(state, m) > attackOf(state, b)) b = m; return [b];
    }
    default: return [];
  }
}

function condOk(state, owner, e, ctx) {
  if (!e.cond) return true;
  const me = state.players[owner];
  const E = state.players[1 - owner];
  const t = ctx.chosenObj;
  switch (e.cond) {
    case 'combo': return ctx.combo === true;
    case 'target_died': return ctx.lastTargetDied === true;
    case 'my_board_gte': return me.board.length >= (e.cond_n || 0);
    case 'enemy_cursed': return E.hero.curse > 0 || E.board.some((m) => m.curse > 0);
    case 'target_cursed': return !!(t && ctx.preCursed);
    case 'target_damaged': return !!(t && !t.isHero && t.hp < t.maxHp);
    case 'target_silenced': return !!(t && t.silenced);
    case 'target_frozen': return !!(t && ctx.preFrozen);
    case 'target_guard': return !!(t && hasKw(t, 'guard'));
    case 'target_has_part': return !!(t && t.parts > 0);
    case 'target_cost_gte': return !!(t && ctx.preCost >= (e.cond_n || 0));
    case 'has_part_minion': return me.board.some((m) => m.parts > 0);
    case 'my_armor': return me.hero.armor > 0;
    case 'my_guard_exists': return me.board.some((m) => hasKw(m, 'guard'));
    case 'my_stealth_exists': return me.board.some((m) => m !== ctx.source && hasKw(m, 'stealth'));
    case 'my_secret_exists': return me.secrets.length > 0;
    case 'spell_power_exists': return spellPower(state, me) > 0;
    case 'curse_burst_game': return state.curseBursts > 0;
    case 'self_stealth': return !!(ctx.source && hasKw(ctx.source, 'stealth'));
    case 'self_atk_gte': return !!(ctx.source && attackOf(state, ctx.source) >= (e.cond_n || 0));
    case 'last_drawn_cost_lte': return ctx.lastDrawnCost != null && ctx.lastDrawnCost <= (e.cond_n || 0);
    case 'self_alive': return !!(ctx.source && me.board.includes(ctx.source));
    case 'dead_had_ebb': return !!ctx.deadHadEbb;
    case 'no_spell_in_hand': return !me.hand.some((i) => !i.system && cardOf(state, me, i).kind === 'spell');
    default: return true;
  }
}

function nRef(state, owner, e, ctx) {
  let n = e.n || 0;
  const t = ctx.chosenObj;
  switch (e.n_ref) {
    case 'sac_atk': n = ctx.sac ? ctx.sac.atk : 0; break;
    case 'sac_hp': n = ctx.sac ? ctx.sac.hp : 0; break;
    case 'sac_cost3': n = ctx.sac ? Math.min(3, ctx.sac.cost) : 0; break;
    case 'target_curse_min1': n = Math.max(1, ctx.preCurse || 0); break;
    case 'target_curse': n = ctx.preCurse || 0; break;
    case 'plus_guard2': n += Math.min(2, state.players[owner].board.filter((m) => hasKw(m, 'guard')).length); break;
    case 'kills_turn3': n = Math.min(3, state.players[owner].kills); break;
    case 'kills_by_effect': n = ctx.killsByEffect || 0; break;
    case 'lost_stats': n = ctx.lostStats || 0; break;
    case 'cursed_enemies': n = [state.players[1 - owner].hero, ...state.players[1 - owner].board].filter((c) => c.curse > 0).length; break;
    case 'chosen_atk': n = t ? attackOf(state, t) : 0; break;
    default: break;
  }
  return n;
}

// ---------- 효과 실행 ----------
function runEffects(state, owner, effects, ctx) {
  withRng(state, (r) => {
    for (const e0 of effects) {
      if (state.over) return;
      let e = e0;
      if (!condOk(state, owner, e, ctx)) { if (e.else) e = { on: e.on, ...e.else }; else continue; }
      if (e.cap_per_turn && ctx.source && !ctx.source.isHero) {
        const key = effects.indexOf(e0);
        const used = (ctx.source.cap && ctx.source.cap[key]) || 0;
        if (used >= e.cap_per_turn) continue;
        ctx.source.cap = { ...(ctx.source.cap || {}), [key]: used + 1 };
      }
      applyEffect(state, owner, e, ctx, r);
      if (['damage', 'destroy', 'sacrifice', 'fight', 'buff'].includes(e.do)) afterHarm(state, ctx);
      if (checkEnd(state)) return;
    }
  });
}
function afterHarm(state, ctx) {
  const last = ctx.lastTargets || [];
  const died = last.filter((c) => !c.isHero && (c.hp <= 0 || c.dead));
  ctx.lastTargetDied = died.length > 0;
  ctx.killsByEffect = (ctx.killsByEffect || 0) + died.length;
  resolveDeaths(state);
}

function addTimed(state, c, t) { c.timed = [...c.timed, t]; if (t.hp) { c.maxHp += t.hp; c.hp += t.hp; } }
function untilOf(state, dur) {
  if (dur === 'turn') return state.half;
  if (dur === 'opp_turn' || dur === 'my_next_turn') return state.half + 1;
  return null;
}

function applyEffect(state, owner, e, ctx, r) {
  const me = state.players[owner];
  const E = state.players[1 - owner];
  const times = e.times_ref ? nRef(state, owner, { n_ref: e.times_ref }, ctx) : (e.times || 1);
  for (let k = 0; k < times; k++) {
    if (state.over) return;
    const n = nRef(state, owner, e, ctx);
    const targets = e.target ? resolveTargets(state, owner, e.target, ctx, r).filter((c) => !e.tf || tfOk(state, c, e.tf)) : [];
    ctx.lastTargets = targets;
    switch (e.do) {
      case 'damage': {
        const bonus = ctx.isSpell ? spellPower(state, me) + (ctx.dmgMod || 0) : 0;
        const src = ctx.isSpell ? null : ctx.source;
        for (const c of targets) dealDamage(state, src, c, n + bonus, { spell: ctx.isSpell, owner });
        break;
      }
      case 'heal': for (const c of targets) heal(state, c, n >= 99 ? c.maxHp : n); break;
      case 'armor': me.hero.armor += n; log(state, { t: 'armor', p: owner, n }); break;
      case 'draw': for (let j = 0; j < n; j++) {
        const c = drawCard(state, me, r, false);
        if (c) { ctx.lastDrawnCost = cardOf(state, me, c).cost; if (e.discount_if_combo && hasCombo(cardOf(state, me, c))) c.costMod -= e.discount_if_combo; }
      } break;
      case 'tutor': {
        const f = e.filter || {};
        let cand = [];
        me.deck.forEach((inst, i) => { if (matchFilter(state, cardOf(state, me, inst), f)) cand.push(i); });
        if (f.highest_cost && cand.length) { const mx = Math.max(...cand.map((i) => cardOf(state, me, me.deck[i]).cost)); cand = cand.filter((i) => cardOf(state, me, me.deck[i]).cost === mx); }
        if (!cand.length) { drawCard(state, me, r, false); break; }
        const [inst] = me.deck.splice(cand[r.int(cand.length)], 1);
        if (e.cost_mod) inst.costMod += e.cost_mod;
        if (e.cost_mod_if && condOk(state, owner, { cond: e.cost_mod_if }, ctx)) inst.costMod += e.cost_mod_if_n || 0;
        addToHand(state, me, inst);
        log(state, { t: 'tutor', p: owner, cid: inst.cid });
        break;
      }
      case 'discover': {
        const opts = poolPick(state, owner, e.pool, 3, r);
        if (opts.length) state.pending = { type: 'discover', owner, options: opts, costMod: -(e.cost_reduce || 0) };
        break;
      }
      case 'give_card': {
        const opts = poolPick(state, owner, e.pool, 1, r);
        if (opts.length) addToHand(state, me, inst0(opts[0]));
        break;
      }
      case 'copy': {
        let cid = null;
        if (e.source === 'enemy_deck_top') cid = E.deck.length ? E.deck[E.deck.length - 1].cid : null;
        else if (e.source === 'enemy_hand_random') { const h = E.hand.filter((i) => !i.system); cid = h.length ? h[r.int(h.length)].cid : null; }
        else if (e.source === 'chosen') cid = ctx.chosenObj && !ctx.chosenObj.isHero && !state.tokens[ctx.chosenObj.cid] ? ctx.chosenObj.cid : null;
        if (cid) addToHand(state, me, inst0(cid));
        break;
      }
      case 'cost_reduce': for (const inst of selectHand(state, me, e.target, e.count, r)) inst.costMod -= n; break;
      case 'hand_buff': for (const inst of selectHand(state, me, e.target, e.count, r)) { inst.atkMod += e.atk || 0; inst.hpMod += e.hp || 0; inst.dmgMod += e.dmg || 0; } break;
      case 'buff': {
        for (const c of targets) {
          if (c.isHero) continue;
          const atk = e.atk || 0, hp = e.hp || 0;
          if (e.dur) addTimed(state, c, { atk, hp, kw: e.kw || null, until: untilOf(state, e.dur) });
          else {
            c.atk = Math.max(0, c.atk + atk);
            if (hp) { c.maxHp += hp; c.hp += hp; }
            if (e.kw) { c.kw = { ...c.kw }; for (const kk of e.kw) c.kw[kk] = true; }
          }
        }
        break;
      }
      case 'debuff_by_curse': for (const c of targets) { const x = ctx.preCurse || c.curse || 0; c.atk = Math.max(0, c.atk - x); c.maxHp -= x; c.hp -= x; } break;
      case 'set_attack': for (const c of targets) if (!c.isHero) { c.atk = n; c.timed = c.timed.filter((t) => !t.atk); c.aAtk = 0; } break;
      case 'silence': {
        let lost = 0;
        for (const c of targets) {
          if (c.isHero) { c.curse = 0; continue; }
          lost += Math.max(0, c.atk - c.baseAtk) + Math.max(0, c.maxHp - (c.aHp || 0) - c.baseHp);
          if (e.transfer_to && ctx.chosen2Obj && !ctx.chosen2Obj.isHero) {
            const d = ctx.chosen2Obj;
            d.kw = { ...d.kw, ...c.kw };
            if (c.fx) d.fx = [...(d.fx || []), ...c.fx];
          }
          c.atk = c.baseAtk; c.maxHp = c.baseHp + (c.aHp || 0); c.hp = Math.min(c.hp, c.maxHp);
          c.kw = {}; c.fx = null; c.curse = 0; c.freezeUntil = -1; c.timed = []; c.parts = 0; c.silenced = true;
        }
        ctx.lostStats = lost;
        refreshAuras(state);
        break;
      }
      case 'freeze': for (const c of targets) if (!c.isHero) c.freezeUntil = c.owner === state.active ? state.half + 2 : state.half + 1; break;
      case 'destroy': for (const c of targets) if (!c.isHero) { if (e.max_hp != null && c.hp > e.max_hp) continue; ctx.preCost = (state.db[c.cid] || state.tokens[c.cid] || {}).cost || 0; c.dead = true; } break;
      case 'sacrifice': {
        const c = targets[0];
        if (c && !c.isHero) { ctx.sac = { atk: attackOf(state, c), hp: Math.max(0, c.hp), cost: (state.db[c.cid] || state.tokens[c.cid] || {}).cost || 0 }; c.dead = true; ctx.lastTargets = []; }
        break;
      }
      case 'fight': {
        const a = ctx.chosenObj, b = ctx.chosen2Obj;
        if (a && b && !a.isHero && !b.isHero) {
          const x = attackOf(state, a), y = attackOf(state, b);
          dealDamage(state, a, b, x, null); dealDamage(state, b, a, y, null);
          ctx.lastTargets = [b];
        }
        break;
      }
      case 'mark': for (const c of targets) if (!c.isHero) { c.markedBy = owner; c.markDraw = n || 1; c.markUntil = e.this_turn ? state.half : 1e9; } break;
      case 'summon': {
        const side = e.side === 'enemy' ? 1 - owner : owner;
        for (let j = 0; j < (e.count || 1); j++) summonToken(state, side, e.token, { atk: e.atk_bonus || 0, hp: e.hp_bonus || 0 });
        break;
      }
      case 'curse': for (const c of targets) c.curse += n; break;
      case 'curse_double': for (const c of [E.hero, ...E.board]) c.curse *= 2; break;
      case 'mana': me.mana = Math.min(state.rules.mana_cap, me.mana + n); me.manaAvail += n; break;
      case 'overload': me.overloadNext += n; break;
      case 'enemy_overload': E.overloadNext += n; break;
      case 'next_discount': me.nextDisc = { n, until: e.this_turn ? state.half : null }; break;
      case 'turn_discount': if (e.kind === 'minion') me.turnDiscMinion += n; else me.turnDiscSpell += n; break;
      case 'next_minion_kw': me.nextMinionKw = { kw: e.kw, until: state.half }; break;
      case 'give_kw': for (const c of targets) if (!c.isHero) {
        if (e.dur) addTimed(state, c, { atk: 0, hp: 0, kw: e.kw, until: untilOf(state, e.dur) });
        else { c.kw = { ...c.kw }; for (const kk of e.kw || []) c.kw[kk] = true; }
      } refreshAuras(state); break;
      case 'give_fx': for (const c of targets) if (!c.isHero) c.fx = [...(c.fx || []), e.fx]; break;
      case 'attach': {
        for (const c of targets) {
          if (c.isHero) continue;
          const reps = hasKw(c, 'double_part') ? 2 : 1;
          const bonusA = auraCount(me, 'aura_part_bonus');
          for (let j = 0; j < reps; j++) {
            c.atk += (e.atk || 0) + bonusA;
            if (e.hp) { c.maxHp += e.hp; c.hp += e.hp; }
            if (e.kw) { c.kw = { ...c.kw }; for (const kk of e.kw) c.kw[kk] = true; }
            if (e.fx) c.fx = [...(c.fx || []), e.fx];
          }
          c.parts += 1;
          if (c.fx) { const fx = c.fx.filter((x) => x.on === 'part_attached'); if (fx.length) runEffects(state, owner, fx, { source: c, isSpell: false }); }
        }
        refreshAuras(state);
        break;
      }
      case 'persist_buff': me.persistBuff = { atk: me.persistBuff.atk + (e.atk || 0), hp: me.persistBuff.hp + (e.hp || 0) }; break;
      case 'secret_rearm': me.secretRearm = true; break;
      case 'install_secret': {
        const idx = me.deck.findIndex((inst) => { const c = cardOf(state, me, inst); return isSecretCard(c) && !me.secrets.some((s) => s.cid === c.id); });
        if (idx >= 0 && me.secrets.length < state.rules.secret_limit) { const [inst] = me.deck.splice(idx, 1); installSecret(state, me, cardOf(state, me, inst)); }
        break;
      }
      case 'secret': if (ctx.card) installSecret(state, me, ctx.card); break;
      case 'weapon': break;
      case 'aura': case 'aura_spell': case 'aura_curse_bonus': case 'aura_part_bonus': case 'self_atk_per_missing': break;
      default: break;
    }
  }
}

function installSecret(state, P, card) {
  if (P.secrets.length >= state.rules.secret_limit || P.secrets.some((s) => s.cid === card.id)) return;
  P.secrets.push({ cid: card.id, fx: card.secret, rearmed: false });
  log(state, { t: 'secret', p: P.idx });
}
// 상대 행동에 봉인문 확인 (defender = 봉인문 주인)
function checkSecrets(state, defender, trigger, ctxExtra) {
  const P = state.players[defender];
  if (!P.secrets.length || state.active === defender) return;
  for (const s of [...P.secrets]) {
    const fx = s.fx.filter((e) => e.on === trigger);
    if (!fx.length) continue;
    if (P.secretRearm && !s.rearmed) s.rearmed = true; else P.secrets = P.secrets.filter((x) => x !== s);
    log(state, { t: 'secret_open', p: defender, cid: s.cid });
    runEffects(state, defender, fx, { source: null, isSpell: false, ...ctxExtra });
    resolveDeaths(state);
  }
}

function matchFilter(state, c, f) {
  if (!c) return false;
  if (f.kind && c.kind !== f.kind) return false;
  if (f.keyword && !(c.keywords || []).includes(f.keyword)) return false;
  if (f.tag === 'curse' && !isCurseCard(c)) return false;
  if (f.tag === 'secret' && !isSecretCard(c)) return false;
  if (f.branch && c.branch !== f.branch) return false;
  return true;
}
function poolPick(state, owner, pool, count, r) {
  const me = state.players[owner];
  const E = state.players[1 - owner];
  const all = state.poolCache || (state.poolCache = Object.values(state.db));
  let cands;
  switch (pool) {
    case 'parts': cands = all.filter((c) => c.branch === 'b_fit'); break;
    case 'enemy_hero': cands = all.filter((c) => c.owner === E.heroId); break;
    case 'neutral_minion': cands = all.filter((c) => c.owner === 'neutral' && c.kind === 'minion'); break;
    default: cands = all.filter((c) => c.owner === me.heroId || c.owner === 'neutral');
  }
  const out = []; const used = new Set();
  while (out.length < count && used.size < cands.length) { const c = cands[r.int(cands.length)]; if (!used.has(c.id)) { used.add(c.id); out.push(c.id); } }
  return out;
}

function selectHand(state, P, spec, count, r) {
  const hand = P.hand.filter((i) => !i.system);
  const minions = hand.filter((i) => cardOf(state, P, i).kind === 'minion');
  const spells = hand.filter((i) => cardOf(state, P, i).kind === 'spell');
  const take = (arr, n) => { const a = [...arr]; const out = []; while (a.length && out.length < n) out.push(a.splice(r.int(a.length), 1)[0]); return out; };
  switch (spec) {
    case 'hand_all': return hand;
    case 'hand_minions': return minions;
    case 'hand_spells': return spells;
    case 'hand_random': return take(hand, 1);
    case 'hand_random_minions': return take(minions, count || 1);
    case 'hand_random_spell': return take(spells, count || 1);
    default: return [];
  }
}

function fireBoard(state, owner, trigger, ctxExtra) {
  const P = state.players[owner];
  for (const m of [...P.board]) {
    if (state.over) return;
    if (!m.fx || !P.board.includes(m)) continue;
    const fx = m.fx.filter((e) => e.on === trigger);
    if (fx.length) runEffects(state, owner, fx, { source: m, isSpell: false, ...(ctxExtra || {}) });
  }
  // 인장(무기)의 트리거
  const W = P.hero.weapon;
  if (W && W.fx && trigger !== 'friendly_death') {
    const fx = W.fx.filter((e) => e.on === trigger);
    if (fx.length) runEffects(state, owner, fx, { source: P.hero, isSpell: false, ...(ctxExtra || {}) });
  }
}

// ---------- 행동 ----------
function canAttack(state, m) {
  if (m.owner !== state.active) return false;
  if (m.isHero) return !!m.weapon && attackOf(state, m) > 0 && m.attacks < 1;
  if (attackOf(state, m) <= 0) return false;
  if (state.half <= m.freezeUntil) return false;
  if (m.attacks >= 1) return false;
  if (m.sick && !hasKw(m, 'charge') && !hasKw(m, 'rush')) return false;
  return true;
}
export function attackTargets(state, m) {
  const E = state.players[1 - m.owner];
  const vis = E.board.filter((x) => !hasKw(x, 'stealth'));
  const guards = vis.filter((x) => hasKw(x, 'guard'));
  let t = guards.length ? guards : [...vis, E.hero];
  if (!m.isHero && m.sick && !hasKw(m, 'charge')) t = t.filter((x) => !x.isHero);
  return t;
}

function cardTargets(state, p, c) {
  const t1 = c.target ? choiceTargets(state, p, c.target, c.tf) : null;
  const t2 = c.target2 ? choiceTargets(state, p, c.target2, c.tf2) : null;
  return { t1, t2 };
}

export function legalActions(state) {
  if (state.over) return [];
  const p = state.active;
  if (state.pending) return state.pending.owner === p ? state.pending.options.map((_, i) => ({ type: 'choose', index: i })) : [];
  const P = state.players[p];
  const acts = [];
  const seen = new Set();
  P.hand.forEach((inst, i) => {
    const c = cardOf(state, P, inst);
    const cost = costOf(state, P, inst);
    if (cost > P.mana) return;
    if (c.kind === 'minion' && P.board.length >= state.rules.board_limit) return;
    if (isSecretCard(c) && (P.secrets.length >= state.rules.secret_limit || P.secrets.some((s) => s.cid === c.id))) return;
    const key = inst.cid + '|' + cost + '|' + inst.atkMod + '|' + inst.hpMod + '|' + inst.dmgMod + '|' + (inst.system ? 1 : 0);
    if (seen.has(key)) return;
    seen.add(key);
    const { t1, t2 } = cardTargets(state, p, c);
    if (t1 && !t1.length) { if (c.kind !== 'spell') acts.push({ type: 'play', hand: i, target: null }); return; }
    if (t1 && t2) {
      let any = false;
      for (const a of t1) for (const b of t2) if (a !== b) { acts.push({ type: 'play', hand: i, target: a.uid, target2: b.uid }); any = true; }
      if (!any && c.kind !== 'spell') acts.push({ type: 'play', hand: i, target: null });
      return;
    }
    if (t1) { for (const a of t1) acts.push({ type: 'play', hand: i, target: a.uid }); return; }
    acts.push({ type: 'play', hand: i, target: null });
  });
  const hp = state.heroes[P.heroId];
  if (hp && !P.powerUsed && hp.power_cost_mana <= P.mana) {
    if (hp.power_target) for (const t of choiceTargets(state, p, hp.power_target, hp.power_tf)) acts.push({ type: 'power', target: t.uid });
    else acts.push({ type: 'power', target: null });
  }
  for (const m of [P.hero, ...P.board]) {
    if (!canAttack(state, m)) continue;
    for (const t of attackTargets(state, m)) acts.push({ type: 'attack', attacker: m.uid, target: t.uid });
  }
  acts.push({ type: 'end' });
  return acts;
}

function makeCtx(state, P, a, extra) {
  const chosenObj = a.target != null ? findChar(state, a.target) : null;
  const chosen2Obj = a.target2 != null ? findChar(state, a.target2) : null;
  return {
    chosenObj, chosen2Obj,
    preCurse: chosenObj ? chosenObj.curse : 0, preCursed: !!(chosenObj && chosenObj.curse > 0),
    preFrozen: !!(chosenObj && !chosenObj.isHero && chosenObj.freezeUntil >= state.half),
    preCost: chosenObj && !chosenObj.isHero ? ((state.db[chosenObj.cid] || state.tokens[chosenObj.cid] || {}).cost || 0) : 0,
    ...extra,
  };
}

export function applyAction(state, a) {
  if (state.over) return state;
  const p = state.active;
  const P = state.players[p];
  if (a.type === 'choose') {
    const pd = state.pending;
    if (!pd) return state;
    state.pending = null;
    const cid = pd.options[a.index] ?? pd.options[0];
    addToHand(state, P, inst0(cid, { costMod: pd.costMod || 0 }));
    log(state, { t: 'discover', p, cid });
    return state;
  }
  if (state.pending) return state;
  if (a.type === 'end') { endTurn(state); return state; }
  if (a.type === 'play') return playCard(state, p, P, a);
  if (a.type === 'power') {
    const hp = state.heroes[P.heroId];
    if (!hp || P.powerUsed || hp.power_cost_mana > P.mana) return state;
    P.mana -= hp.power_cost_mana; P.manaSpent += hp.power_cost_mana; P.powerUsed = true;
    log(state, { t: 'power', p, target: a.target });
    runEffects(state, p, hp.power_effects, makeCtx(state, P, a, { source: null, isSpell: false, combo: P.played > 0, isPower: true }));
    resolveDeaths(state); checkEnd(state);
    return state;
  }
  if (a.type === 'attack') return doAttack(state, p, P, a);
  return state;
}

function playCard(state, p, P, a) {
  const inst = P.hand[a.hand];
  if (!inst) return state;
  const c = cardOf(state, P, inst);
  const cost = costOf(state, P, inst);
  if (cost > P.mana) return state;
  if (c.kind === 'minion' && P.board.length >= state.rules.board_limit) return state;
  P.mana -= cost; P.manaSpent += cost;
  P.hand.splice(a.hand, 1);
  if (P.nextDisc) P.nextDisc = null;
  const combo = P.played > 0;
  P.played += 1;
  log(state, { t: 'play', p, cid: inst.cid, target: a.target ?? null, target2: a.target2 ?? null });
  const ctx = makeCtx(state, P, a, { card: c, combo, dmgMod: inst.dmgMod || 0 });
  if (c.kind === 'minion') {
    const m = makeMinion(state, p, c, inst, { atk: P.persistBuff.atk, hp: P.persistBuff.hp });
    if (P.nextMinionKw && P.nextMinionKw.until >= state.half) { for (const k of P.nextMinionKw.kw) m.kw[k] = true; P.nextMinionKw = null; }
    placeMinion(state, P, m, a.pos);
    const fx = (c.effects || []).filter((e) => e.on === 'play');
    if (fx.length) runEffects(state, p, fx, { ...ctx, source: m, isSpell: false });
    resolveDeaths(state);
    if (!state.over && P.board.includes(m)) checkSecrets(state, 1 - p, 'enemy_summon', { triggerSource: m });
  } else if (c.kind === 'weapon') {
    P.hero.weapon = { cid: c.id, atk: c.attack, dur: c.health, kw: Object.fromEntries((c.keywords || []).map((k) => [k, true])), fx: c.effects || [] };
    const fx = (c.effects || []).filter((e) => e.on === 'play');
    if (fx.length) runEffects(state, p, fx, { ...ctx, source: P.hero, isSpell: false });
  } else {
    if (ctx.chosenObj && !ctx.chosenObj.isHero && ctx.chosenObj.owner !== p) checkSecrets(state, 1 - p, 'enemy_target_my_minion', { triggerSource: ctx.chosenObj });
    const fx = (c.effects || []).filter((e) => e.on === 'cast');
    runEffects(state, p, fx, { ...ctx, source: null, isSpell: true });
    resolveDeaths(state);
    if (!state.over && !inst.system) { fireBoard(state, p, 'friendly_spell'); resolveDeaths(state); }
    if (!state.over && !inst.system) checkSecrets(state, 1 - p, 'enemy_spell', {});
  }
  refreshAuras(state);
  checkEnd(state);
  return state;
}

function doAttack(state, p, P, a) {
  const m = a.attacker === P.hero.uid ? P.hero : P.board.find((x) => x.uid === a.attacker);
  const t = findChar(state, a.target);
  if (!m || !t || !canAttack(state, m)) return state;
  if (!attackTargets(state, m).includes(t)) return state;
  m.attacks += 1;
  if (!m.isHero && hasKw(m, 'stealth')) { m.kw = { ...m.kw, stealth: false }; m.timed = m.timed.map((x) => (x.kw && x.kw.includes('stealth') ? { ...x, kw: x.kw.filter((k) => k !== 'stealth') } : x)); refreshAuras(state); }
  log(state, { t: 'attack', uid: m.uid, target: t.uid });
  const own = m.isHero ? (m.weapon ? m.weapon.fx : null) : m.fx;
  const trig = (name) => { if (!own) return; const fx = own.filter((e) => e.on === name); if (fx.length) runEffects(state, p, fx, { source: m, isSpell: false, attackTarget: t }); };
  trig(m.isHero ? 'hero_attack' : 'attack');
  checkSecrets(state, 1 - p, 'enemy_attack', { triggerSource: m.isHero ? null : m });
  const stillThere = (x) => x.isHero || state.players[x.owner].board.includes(x);
  if (state.over || !stillThere(m) || !stillThere(t)) { resolveDeaths(state); checkEnd(state); return state; }
  const atkA = attackOf(state, m);
  const atkT = t.isHero ? 0 : attackOf(state, t);
  const dealtA = dealDamage(state, m, t, atkA, null);
  if (!t.isHero) dealDamage(state, t, m, atkT, null);
  if (m.isHero && m.weapon) { m.weapon.dur -= 1; }
  const killed = !t.isHero && (t.hp <= 0 || t.dead);
  const hitHero = t.isHero && dealtA > 0;
  resolveDeaths(state);
  if (checkEnd(state)) return state;
  const survived = stillThere(m) && (m.isHero || m.hp > 0);
  if (killed) trig(m.isHero ? 'hero_kill' : 'kill');
  if (hitHero) trig('hit_hero');
  if (survived) trig(m.isHero ? 'hero_after_attack' : 'after_attack_survive');
  if (m.isHero && m.weapon && m.weapon.dur <= 0) { m.weapon = null; log(state, { t: 'weapon_break', p }); }
  resolveDeaths(state);
  checkEnd(state);
  return state;
}

// ---------- 복제 (AI 앞보기용; 난수 상태를 섞어 미래 드로우를 엿보지 못하게) ----------
export function cloneState(s, rngSalt) {
  const cm = (m) => ({ ...m, kw: { ...m.kw }, timed: m.timed.slice(), cap: { ...m.cap } });
  return {
    ...s,
    rngState: rngSalt != null ? ((s.rngState ^ Math.imul(rngSalt, 2654435761)) >>> 0) : s.rngState,
    log: null, _r: null,
    pending: s.pending ? { ...s.pending } : null,
    players: s.players.map((P) => ({
      ...P,
      hero: { ...P.hero, weapon: P.hero.weapon ? { ...P.hero.weapon } : null },
      deck: P.deck.slice(),
      hand: P.hand.map((i) => ({ ...i })),
      board: P.board.map(cm),
      secrets: P.secrets.map((x) => ({ ...x })),
    })),
  };
}

// ---------- 지표용 ----------
// 형세 점수 = (내 명줄+껍질 − 상대) + 0.5 × (내 필드 공+체 − 상대) + 2 × (손패 장수 차)
export function positionScore(state, p) {
  const me = state.players[p];
  const E = state.players[1 - p];
  const board = (P) => P.board.reduce((s, m) => s + attackOf(state, m) + Math.max(0, m.hp), 0);
  return (me.hero.hp + me.hero.armor - E.hero.hp - E.hero.armor) + 0.5 * (board(me) - board(E)) + 2 * (me.hand.length - E.hand.length);
}
// 게임 길이(턴 수) = 마지막 턴을 진행한 쪽의 자기 턴 번호 = ceil(반턴 수 / 2)
export function turnNumber(state) { return Math.ceil(state.half / 2); }
