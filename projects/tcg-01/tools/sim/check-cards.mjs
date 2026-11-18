// 독립 검증기: node projects/tcg-01/tools/sim/check-cards.mjs
// engine.mjs·value.mjs·card-defs.mjs를 import하지 않는다(insights 2026-11-17: 검증기가 생성기와 같은 가정을 공유하면 오류를 통과시킴).
// 어휘(트리거·동작·대상·조건) 목록을 여기서 따로 손으로 적어, 엔진이 조용히 무시하는 오타·미지원 효과를 잡는다.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cj = JSON.parse(readFileSync(join(root, 'cards.json'), 'utf8'));
const lore = JSON.parse(readFileSync(join(root, 'lore', 'cards-lore.json'), 'utf8'));
const bal = JSON.parse(readFileSync(join(root, 'balance.json'), 'utf8'));
const err = [];
const warn = [];

const ON = ['play', 'cast', 'death', 'turn_start', 'turn_end', 'attack', 'kill', 'hit_hero', 'after_attack_survive', 'friendly_spell', 'friendly_death', 'enemy_minion_died', 'enemy_curse_tick', 'part_attached', 'aura', 'hero_attack', 'hero_kill', 'hero_after_attack', 'my_spell_hit_hero', 'enemy_attack', 'enemy_spell', 'enemy_summon', 'enemy_target_my_minion', 'power', 'mark'];
const DO = ['damage', 'heal', 'armor', 'draw', 'tutor', 'discover', 'give_card', 'copy', 'cost_reduce', 'hand_buff', 'buff', 'debuff_by_curse', 'set_attack', 'silence', 'freeze', 'destroy', 'sacrifice', 'fight', 'mark', 'summon', 'curse', 'curse_double', 'mana', 'overload', 'enemy_overload', 'next_discount', 'turn_discount', 'next_minion_kw', 'give_kw', 'give_fx', 'attach', 'persist_buff', 'secret_rearm', 'install_secret', 'secret', 'aura', 'aura_spell', 'aura_curse_bonus', 'aura_part_bonus', 'self_atk_per_missing'];
const TARGET = ['chosen', 'chosen2', 'self', 'enemy_hero', 'my_hero', 'all_enemy_minions', 'all_friendly_minions', 'other_friendly_minions', 'all_minions', 'all_other_minions', 'all_enemies', 'random_enemy_minion', 'random_enemy', 'random_friendly_minion', 'random_damaged_friendly_minion', 'random_friendly_guard', 'random_friendly_stealth', 'friendly_guard_minions', 'friendly_rush_minions', 'cursed_enemy_minions', 'cursed_enemies', 'adjacent', 'attack_target', 'attack_target_adjacent', 'trigger_source', 'strongest_enemy_minion', 'hand_all', 'hand_minions', 'hand_spells', 'hand_random', 'hand_random_minions', 'hand_random_spell'];
const CHOOSE = ['choose_enemy', 'choose_enemy_minion', 'choose_friendly_minion', 'choose_friendly', 'choose_minion', 'choose_any'];
const COND = ['combo', 'target_died', 'my_board_gte', 'enemy_cursed', 'target_cursed', 'target_damaged', 'target_silenced', 'target_frozen', 'target_guard', 'target_has_part', 'target_cost_gte', 'has_part_minion', 'my_armor', 'my_guard_exists', 'my_stealth_exists', 'my_secret_exists', 'spell_power_exists', 'curse_burst_game', 'self_stealth', 'self_atk_gte', 'last_drawn_cost_lte', 'self_alive', 'dead_had_ebb', 'no_spell_in_hand'];
const NREF = ['sac_atk', 'sac_hp', 'sac_cost3', 'target_curse_min1', 'target_curse', 'plus_guard2', 'kills_turn3', 'kills_by_effect', 'lost_stats', 'cursed_enemies', 'chosen_atk'];
const KW = ['guard', 'shield', 'stealth', 'rush', 'charge', 'deadly', 'lifesteal', 'double_part'];
const POOL = ['parts', 'enemy_hero', 'neutral_minion', undefined];

function checkEffect(id, e, where) {
  if (!ON.includes(e.on)) err.push(`${id} ${where}: 트리거 ${e.on}`);
  if (!DO.includes(e.do)) err.push(`${id} ${where}: 동작 ${e.do}`);
  if (e.target && !TARGET.includes(e.target)) err.push(`${id} ${where}: 대상 ${e.target}`);
  if (e.cond && !COND.includes(e.cond)) err.push(`${id} ${where}: 조건 ${e.cond}`);
  if (e.n_ref && !NREF.includes(e.n_ref)) err.push(`${id} ${where}: n_ref ${e.n_ref}`);
  if (e.times_ref && !NREF.includes(e.times_ref)) err.push(`${id} ${where}: times_ref ${e.times_ref}`);
  for (const k of e.kw || []) if (!KW.includes(k)) err.push(`${id} ${where}: 키워드 ${k}`);
  if ((e.do === 'discover' || e.do === 'give_card') && !POOL.includes(e.pool)) err.push(`${id} ${where}: pool ${e.pool}`);
  if (e.do === 'summon' && !cj.tokens.find((t) => t.id === e.token)) err.push(`${id} ${where}: 토큰 ${e.token}`);
  if (['damage', 'heal', 'armor', 'curse', 'mana', 'overload'].includes(e.do) && e.n == null && !e.n_ref) err.push(`${id} ${where}: ${e.do} 수치 없음`);
  if (['chosen', 'chosen2'].includes(e.target)) return e.target;
  if (e.else) checkEffect(id, { on: e.on, ...e.else }, where + '.else');
  if (e.fx) checkEffect(id, e.fx, where + '.fx');
  return null;
}

// 1. 200장·id·lore 대조
const cards = cj.cards;
if (cards.length !== 200) err.push(`카드 ${cards.length}장`);
const L = Object.fromEntries(lore.map((l) => [l.id, l]));
const seen = new Set();
for (const c of cards) {
  if (seen.has(c.id)) err.push(`중복 ${c.id}`); seen.add(c.id);
  const l = L[c.id];
  if (!l) { err.push(`${c.id}: lore 없음`); continue; }
  for (const f of ['owner', 'type', 'attack_sub', 'branch']) if (c[f] !== l[f]) err.push(`${c.id}: ${f} ${c[f]} ≠ lore ${l[f]}`);
  if (c.rarity !== l.rarity_hint) err.push(`${c.id}: rarity ${c.rarity} ≠ lore ${l.rarity_hint}`);
  if ('name_ko' in c || 'concept_ko' in c) err.push(`${c.id}: 이름·글을 직접 가짐(lore 참조여야 함)`);
  // id 규약
  const m = /^([DBA])(\d{3})$/.exec(c.id); const n = m ? +m[2] : 0;
  const okId = m && ((m[1] === 'D' && c.type === 'drawbuff' && n <= 20) || (m[1] === 'B' && c.type === 'buff' && n <= 120) || (m[1] === 'A' && c.type === 'attack' && (n <= 18 ? c.attack_sub === 'instant' : c.attack_sub === 'draw') && n <= 60));
  if (!okId) err.push(`${c.id}: id 규약`);
  // 종류·수치
  if (!['minion', 'spell', 'weapon'].includes(c.kind)) err.push(`${c.id}: kind ${c.kind}`);
  if (!Number.isInteger(c.cost) || c.cost < 0 || c.cost > 10) err.push(`${c.id}: cost ${c.cost}`);
  if (c.kind !== 'spell' && (!Number.isInteger(c.attack) || !Number.isInteger(c.health) || c.health < 1 || c.attack < 0)) err.push(`${c.id}: 공/체 ${c.attack}/${c.health}`);
  if (c.kind === 'spell' && (c.attack != null || c.health != null)) err.push(`${c.id}: 의식에 공/체`);
  for (const k of c.keywords || []) if (!KW.includes(k)) err.push(`${c.id}: 키워드 ${k}`);
  if (c.target && !CHOOSE.includes(c.target)) err.push(`${c.id}: target ${c.target}`);
  if (c.target2 && !CHOOSE.includes(c.target2)) err.push(`${c.id}: target2 ${c.target2}`);
  const uses = new Set();
  (c.effects || []).forEach((e, i) => { const u = checkEffect(c.id, e, `fx${i}`); if (u) uses.add(u); });
  (c.secret || []).forEach((e, i) => checkEffect(c.id, e, `secret${i}`));
  if (uses.has('chosen') && !c.target) err.push(`${c.id}: chosen을 쓰는데 target 없음`);
  if (uses.has('chosen2') && !c.target2) err.push(`${c.id}: chosen2를 쓰는데 target2 없음`);
  if (c.target && !uses.has('chosen') && !(c.effects || []).some((e) => ['fight', 'copy', 'silence'].includes(e.do) || (e.n_ref === 'chosen_atk'))) warn.push(`${c.id}: target이 있는데 chosen 효과 없음`);
  if (c.kind === 'spell' && !(c.effects || []).length) err.push(`${c.id}: 효과 없는 의식`);
  if ((c.effects || []).some((e) => e.do === 'secret') && !(c.secret || []).length) err.push(`${c.id}: 봉인문 내용 없음`);
  // 돌파: 단계 누적이 줄지 않고 상한(비용 ≤3 은 +1, 그 외 +2) 안
  const bt = c.breakthrough || {};
  const gain = (s) => (bt[s] ? (bt[s].attack || 0) + (bt[s].health || 0) + Object.values(bt[s].effect_n || {}).reduce((a, b) => a + b, 0) : 0);
  const cap = c.cost <= 3 ? bal.breakthrough.stat_rule.max_total_stat_gain_cost_lte_3 : bal.breakthrough.stat_rule.max_total_stat_gain;
  for (const s of ['1', '2', '3']) if (gain(s) > cap) err.push(`${c.id}: 돌파 ${s}단계 +${gain(s)} > 상한 ${cap}`);
  if (gain('1') > gain('2') || gain('2') > gain('3')) err.push(`${c.id}: 돌파 누적 감소`);
  // 가치 점수 산술 일치(기준선 2c+1)
  if (c.value && Math.abs(c.value.budget - (2 * c.cost + 1)) > 1e-9) err.push(`${c.id}: 기준선 불일치`);
  if (c.value && Math.abs(c.value.score - c.value.budget - c.value.delta) > 0.011) err.push(`${c.id}: 편차 산술 불일치`);
}
// 2. 비율
const cnt = (f) => cards.filter(f).length;
const ratio = [cnt((c) => c.type === 'drawbuff'), cnt((c) => c.type === 'buff'), cnt((c) => c.attack_sub === 'instant'), cnt((c) => c.attack_sub === 'draw')];
if (ratio.join() !== '20,120,18,42') err.push(`비율 ${ratio.join('/')} (20/120/18/42여야 함)`);
// 3. 덱
const deckDir = join(root, 'decks');
const decks = readdirSync(deckDir).filter((f) => f.endsWith('.json'));
if (decks.length < 6) err.push(`덱 ${decks.length}개`);
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
for (const f of decks) {
  const d = JSON.parse(readFileSync(join(deckDir, f), 'utf8'));
  if (d.cards.length !== bal.rules.deck_size_cards) err.push(`${f}: ${d.cards.length}장`);
  const n = {}; for (const id of d.cards) n[id] = (n[id] || 0) + 1;
  for (const [id, k] of Object.entries(n)) {
    const c = byId[id]; if (!c) { err.push(`${f}: ${id} 없음`); continue; }
    if (c.owner !== 'neutral' && c.owner !== d.hero) err.push(`${f}: ${id} 소유 ${c.owner}`);
    const lim = c.rarity === 'abyss' ? bal.rules.copies_max_abyss : bal.rules.copies_max_per_card;
    if (k > lim) err.push(`${f}: ${id} ${k}장 > ${lim}`);
  }
  if (!bal.heroes[d.hero]) err.push(`${f}: 호명술 없음 ${d.hero}`);
}
// 4. 호명술 효과 어휘
for (const [h, hp] of Object.entries(bal.heroes)) { hp.power_effects.forEach((e, i) => checkEffect(h, e, `power${i}`)); if (hp.power_target && !CHOOSE.includes(hp.power_target)) err.push(`${h}: power_target`); }
// 5. 경제 확률 합
const sp = Object.values(bal.economy.rarity_slot_prob).reduce((a, b) => a + b, 0);
if (Math.abs(sp - 1) > 1e-9) err.push(`희귀도 확률 합 ${sp}`);
const gp = Object.values(bal.economy.rarity_guarantee_slot_prob).reduce((a, b) => a + b, 0);
if (Math.abs(gp - 1) > 1e-9) err.push(`보장 칸 확률 합 ${gp}`);
if (bal.economy.real_money !== false || bal.economy.dock_market.real_money_items.length) err.push('실결제 항목 있음');

console.log(`카드 ${cards.length}장, 비율 ${ratio.join('/')}, 덱 ${decks.length}개, 오류 ${err.length}, 경고 ${warn.length}`);
if (warn.length) console.log('경고:\n' + warn.join('\n'));
if (err.length) { console.error('오류:\n' + err.join('\n')); process.exit(1); }
console.log('통과');
