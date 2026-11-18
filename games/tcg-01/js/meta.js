// 메타: 저장(localStorage), 수집·공명·새김 돌파, 인양 상자, 지정 새김, 부두 시장, 의뢰, 조수 달력, 결투 보상.
// 수치는 모두 balance.json economy·breakthrough. 실결제 없음(게임 내 재화만).
import { D, cardById } from './data.js';

const KEY = 'tcg01.save.v1';
export const M = { s: null, rng: Math.random, noStore: false };

const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export function seedRng(seed) { let x = seed >>> 0 || 1; M.rng = () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function cap(cid) { const c = cardById(cid); return D.balance.breakthrough.copies_owned_before_resonance[c.rarity || 'sand']; }
export function deckCap(cid) { const c = cardById(cid); return c.rarity === 'abyss' ? D.balance.rules.copies_max_abyss : D.balance.rules.copies_max_per_card; }

export function freshSave() {
  const E = D.balance.economy.new_player;
  const s = {
    v: 1, lang: 'ko', settings: { sound: true, music: true, fast: false, reduceMotion: false, timer: true },
    cur: { salt: E.tutorial_reward_salt_marks, ink: E.welcome_carving_ink, pearl: 0 },
    coll: {}, decks: [], crates: { bare: E.welcome_crates, faction: {} },
    pity: { sinceAbyss: 0, sinceCoral: 0, opened: 0, gotAbyss: false },
    daily: null, tide: { marks: 0, claimed: 0 }, stats: { wins: 0, losses: 0, games: 0 }, lastHero: null, ai: 'eval', mode: 'mode_practice',
  };
  // 첫 실행: 표준 영장첩 6개의 카드를 가진 상태로 시작(입문 영장첩 대신, DEV_NOTES D5)
  for (const d of D.decks) for (const cid of d.cards) { const e = s.coll[cid] || (s.coll[cid] = { n: 0, res: 0, stage: 0 }); e.n = Math.min(cap(cid), e.n + 1); }
  return s;
}
export function load() {
  let s = null;
  try { const raw = M.noStore ? null : localStorage.getItem(KEY); if (raw) s = JSON.parse(raw); } catch { s = null; }
  M.s = s && s.v === 1 ? s : freshSave();
  rollDaily();
  return M.s;
}
export function save() {
  if (M.noStore) return true;
  try { localStorage.setItem(KEY, JSON.stringify(M.s)); return true; } catch { return false; }
}
export function resetSave() { M.s = freshSave(); rollDaily(); save(); }

export const owned = (cid) => (M.s.coll[cid] ? M.s.coll[cid].n : 0);
export const stageOf = (cid) => (M.s.coll[cid] ? M.s.coll[cid].stage : 0);
const ent = (cid) => M.s.coll[cid] || (M.s.coll[cid] = { n: 0, res: 0, stage: 0 });
export function thresholds(cid) { return D.balance.breakthrough.resonance_cumulative_for_stage[cardById(cid).rarity || 'sand']; }
export function canRecut(cid) { const e = M.s.coll[cid]; if (!e || e.stage >= D.balance.breakthrough.stages) return false; return e.res >= thresholds(cid)[e.stage + 1]; }

// 한 장 얻기: 2장(심해 1장)까지 수집, 그 뒤 공명, 3단계 뒤에는 각인 먹
export function addCopy(cid) {
  const B = D.balance.breakthrough, r = cardById(cid).rarity || 'sand', e = ent(cid);
  if (e.n < cap(cid)) { e.n++; return { cid, isNew: e.n === 1, res: 0, ink: 0 }; }
  if (e.stage < B.stages) { const n = B.resonance_per_extra_copy[r]; e.res += n; return { cid, isNew: false, res: n, ink: 0 }; }
  const ink = B.overflow_ink_per_copy_after_max[r]; M.s.cur.ink += ink; return { cid, isNew: false, res: 0, ink };
}
export function recut(cid) { if (!canRecut(cid)) return false; ent(cid).stage++; save(); return true; }
// 새김 단계의 스탯 변화(엔진 cardView와 같은 데이터)
export function btDelta(cid, stage) { const c = cardById(cid); return (stage && c.breakthrough && c.breakthrough[String(stage)]) || {}; }

// 지정 새김(제작): 각인 먹. 이미 다 가진 카드는 공명 1장분(비용 2배)
export function craftCost(cid) {
  const E = D.balance.economy, r = cardById(cid).rarity || 'sand';
  const base = E.craft_ink_cost[r];
  return owned(cid) >= cap(cid) ? base * E.craft_as_resonance_ink_cost_multiplier : base;
}
export function craft(cid) {
  const c = craftCost(cid);
  if (M.s.cur.ink < c) return null;
  if (owned(cid) >= cap(cid) && stageOf(cid) >= D.balance.breakthrough.stages) return null;
  M.s.cur.ink -= c; const r = addCopy(cid); save(); return r;
}

// ---------- 인양 상자 ----------
function roll(probs) { let x = M.rng(), acc = 0; for (const [k, p] of Object.entries(probs)) { acc += p; if (x < acc) return k; } return Object.keys(probs)[0]; }
export function cratePool(kind, hero) { return D.list.filter((c) => kind === 'bare' || c.owner === hero || c.owner === 'neutral'); }
export function openCrate(kind, hero) {
  const E = D.balance.economy, P = M.s.pity, pity = E.pity;
  const pool = cratePool(kind, hero);
  const rar = [];
  for (let i = 0; i < E.crates.bare_sea_crate.cards - 1; i++) rar.push(roll(E.rarity_slot_prob));
  rar.push(roll(E.rarity_guarantee_slot_prob));
  const has = (r) => rar.includes(r);
  // 등대 보장(천장): 심해 30상자, 산호 10상자, 첫 심해 10상자 안
  if (!has('abyss') && (P.sinceAbyss + 1 >= pity.abyss_within_crates || (!P.gotAbyss && P.opened + 1 >= pity.first_abyss_within_crates))) rar[rar.length - 1] = 'abyss';
  if (!has('abyss') && !has('coral') && P.sinceCoral + 1 >= pity.coral_within_crates) rar[rar.length - 1] = 'coral';
  P.opened++;
  P.sinceAbyss = has('abyss') ? 0 : P.sinceAbyss + 1;
  P.sinceCoral = has('abyss') || has('coral') ? 0 : P.sinceCoral + 1;
  if (has('abyss')) P.gotAbyss = true;
  const out = rar.map((r) => {
    let cands = pool.filter((c) => c.rarity === r);
    if (r === 'abyss') { const un = cands.filter((c) => owned(c.id) === 0); if (un.length) cands = un; } // 심해 중복 보호
    if (!cands.length) cands = pool;
    const c = cands[Math.floor(M.rng() * cands.length)];
    return { rarity: c.rarity, ...addCopy(c.id) };
  });
  save();
  return out;
}
export function cratesToPity() { const P = M.s.pity, p = D.balance.economy.pity; return Math.max(1, (P.gotAbyss ? p.abyss_within_crates - P.sinceAbyss : Math.min(p.first_abyss_within_crates - P.opened, p.abyss_within_crates - P.sinceAbyss))); }

// ---------- 부두 시장 ----------
export function buy(item) {
  const M2 = D.balance.economy.dock_market, cur = M.s.cur;
  if (item.type === 'bare') { if (cur.salt < M2.bare_sea_crate_salt_marks) return false; cur.salt -= M2.bare_sea_crate_salt_marks; M.s.crates.bare++; }
  else if (item.type === 'faction') {
    if (item.pearl) { if (cur.pearl < D.balance.economy.crates.faction_crate.price_abyss_pearl_alt) return false; cur.pearl -= D.balance.economy.crates.faction_crate.price_abyss_pearl_alt; }
    else { if (cur.salt < M2.faction_crate_salt_marks) return false; cur.salt -= M2.faction_crate_salt_marks; }
    M.s.crates.faction[item.hero] = (M.s.crates.faction[item.hero] || 0) + 1;
  } else if (item.type === 'card') {
    const price = M2.daily_featured_card_salt_marks[cardById(item.cid).rarity];
    if (cur.salt < price || M.s.daily.featuredBought) return false;
    cur.salt -= price; M.s.daily.featuredBought = true; addCopy(item.cid);
  }
  save(); return true;
}

// ---------- 의뢰·하루 ----------
function hashStr(s) { let h = 2166136261; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rollDaily() {
  const d = today();
  if (M.s.daily && M.s.daily.date === d) return;
  const inc = D.balance.economy.income;
  const hs = D.heroIds, h0 = hashStr(d);
  M.s.daily = { date: d, winSalt: 0, practiceSalt: 0, firstWin: false, rerolls: inc.daily_commission_rerolls, featuredBought: false,
    featured: D.list[h0 % D.list.length].id,
    comm: [0, 1, 2].map((i) => makeComm(i, h0 + i * 7919, hs)) };
}
function makeComm(slot, h, hs) {
  const types = ['win_hero', 'breakwater', 'brine'];
  const ty = types[(h >>> 3) % 3];
  const reward = D.balance.economy.income.daily_commission_salt_marks[slot];
  if (ty === 'win_hero') return { type: ty, hero: hs[h % hs.length], n: 1 + (slot >= 2 ? 1 : 0), prog: 0, reward, claimed: false };
  if (ty === 'breakwater') return { type: ty, n: 3 + slot, prog: 0, reward, claimed: false };
  return { type: ty, n: 4 + 2 * slot, prog: 0, reward, claimed: false };
}
export function rerollComm(i) {
  const d = M.s.daily; if (d.rerolls <= 0 || d.comm[i].claimed) return false;
  d.rerolls--; d.comm[i] = makeComm(i, hashStr(d.date + 'r' + d.rerolls + i), D.heroIds); save(); return true;
}
export function claimComm(i) {
  const c = M.s.daily.comm[i]; if (c.claimed || c.prog < c.n) return false;
  c.claimed = true; M.s.cur.salt += c.reward; addTide(D.balance.economy.tide_calendar.tide_marks_daily_commission); save(); return true;
}

// ---------- 조수 달력 ----------
export function addTide(n) {
  const T = D.balance.economy.tide_calendar, S = M.s;
  S.tide.marks += n;
  const got = [];
  while (S.tide.claimed < Math.min(T.steps, Math.floor(S.tide.marks / T.tide_marks_per_step))) {
    const st = ++S.tide.claimed;
    got.push(...tideReward(st, true));
  }
  return got;
}
// 단계 보상(balance economy.tide_calendar 글의 수치를 따름: 매 단계 소금화 50, 5단계마다 상자, 10단계마다 각인 먹 200 + 진주 1, 50단계 세력 상자 3)
export function tideReward(st, give) {
  const out = [{ k: 'salt', n: 50 }];
  if (st % 5 === 0) out.push({ k: 'crate', n: 1 });
  if (st % 10 === 0) { out.push({ k: 'ink', n: 200 }); out.push({ k: 'pearl', n: 1 }); }
  if (st === D.balance.economy.tide_calendar.steps) out.push({ k: 'faction', n: 3 });
  if (give) for (const r of out) {
    if (r.k === 'salt') M.s.cur.salt += r.n; if (r.k === 'ink') M.s.cur.ink += r.n; if (r.k === 'pearl') M.s.cur.pearl += r.n;
    if (r.k === 'crate') M.s.crates.bare += r.n;
    if (r.k === 'faction') { const h = M.s.lastHero || D.heroIds[0]; M.s.crates.faction[h] = (M.s.crates.faction[h] || 0) + r.n; }
  }
  return out;
}

// ---------- 결투 보상 ----------
export function battleRewards(res) {
  rollDaily();
  const inc = D.balance.economy.income, T = D.balance.economy.tide_calendar, d = M.s.daily, out = [];
  M.s.stats.games++;
  if (res.win) {
    M.s.stats.wins++;
    if (res.mode === 'mode_practice') { const n = Math.max(0, Math.min(inc.sand_practice_win_salt_marks, inc.sand_practice_daily_cap - d.practiceSalt)); d.practiceSalt += n; if (n) out.push({ k: 'salt', n }); }
    else { const n = Math.max(0, Math.min(inc.win_salt_marks, inc.win_salt_marks_daily_cap - d.winSalt)); d.winSalt += n; if (n) out.push({ k: 'salt', n }); }
    if (!d.firstWin) { d.firstWin = true; out.push({ k: 'salt', n: inc.first_win_bonus_salt_marks, first: true }); }
  } else M.s.stats.losses++;
  for (const r of out) M.s.cur.salt += r.n;
  const tm = res.win ? T.tide_marks_win : T.tide_marks_loss;
  out.push({ k: 'tide', n: tm });
  const steps = addTide(tm);
  for (const c of d.comm) {
    if (c.claimed) continue;
    if (c.type === 'win_hero' && res.win && res.hero === c.hero) c.prog = Math.min(c.n, c.prog + 1);
    if (c.type === 'breakwater') c.prog = Math.min(c.n, c.prog + (res.blocks || 0));
    if (c.type === 'brine') c.prog = Math.min(c.n, c.prog + (res.brine || 0));
  }
  save();
  return { list: out, steps };
}

// ---------- 영장첩 ----------
export function deckProblems(deck) {
  const R = D.balance.rules, cnt = {}, out = [];
  for (const cid of deck.cards) cnt[cid] = (cnt[cid] || 0) + 1;
  if (deck.cards.length !== R.deck_size_cards) out.push('deck_incomplete');
  for (const [cid, n] of Object.entries(cnt)) {
    const c = cardById(cid);
    if (c.owner !== 'neutral' && c.owner !== deck.hero) out.push('deck_owner_mismatch');
    if (n > deckCap(cid)) out.push(c.rarity === 'abyss' ? 'deck_limit_one' : 'deck_limit_two');
  }
  return [...new Set(out)];
}
export function allDecks() {
  const std = D.decks.map((d) => ({ id: 'std:' + d.name, name: null, std: true, hero: d.hero, cards: d.cards.slice(), archetype: d.archetype }));
  return [...std, ...M.s.decks];
}
// 친선 새김 슬롯 1(20-balance D1): 덱에서 돌파 이득이 가장 큰 한 종만 적용
export function slotPick(deck) {
  let best = null, bv = 0;
  for (const cid of new Set(deck.cards)) {
    const st = stageOf(cid); const d = btDelta(cid, st);
    const v = (d.attack || 0) + (d.health || 0) + Object.values(d.effect_n || {}).reduce((a, b) => a + b, 0);
    if (v > bv) { bv = v; best = cid; }
  }
  return best;
}
export function btFor(deck, mode) {
  const bt = {};
  if (mode === 'mode_accord') return bt; // 맹약 결투: 0단계 정규화
  if (mode === 'mode_sparring') { const c = slotPick(deck); if (c) bt[c] = stageOf(c); return bt; }
  for (const cid of new Set(deck.cards)) if (stageOf(cid)) bt[cid] = stageOf(cid); // 연습: 전부 적용
  return bt;
}
