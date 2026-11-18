// 카드 가치 점수 (20-balance.md 5절 "효과 가치 환산표"의 코드판). 순수 모듈.
// 기준선 budget(cost) = 2 × cost + 1. 가치 = 스탯 + 키워드 값 + 효과 값. 편차 = 가치 − 기준선.
// 1점 = 응답자 스탯 1. 카드 1장 = 3.2점, 심지 1 = 2점.

export const VALUE_TABLE = {
  budget: { per_mana: 2, base: 1 },
  keyword: {
    guard: { flat: 1.0, per_atk: 0 },
    shield: { flat: 0.5, per_atk: 0.8 },
    stealth: { flat: 1.0, per_atk: 0 },
    rush: { flat: 0, per_atk: 0.5 },
    charge: { flat: 0, per_atk: 1.0 },
    deadly: { flat: 2.0, per_atk: 0 },
    lifesteal: { flat: 0, per_atk: 0.5 },
    double_part: { flat: 1.0, per_atk: 0 },
  },
  per_point: {
    damage: 1.5, heal: 0.4, armor: 0.6, draw: 3.2, tutor: 3.6, discover: 3.6, give_card: 3.0, copy: 3.0,
    buff_stat: 0.9, debuff_atk: 1.2, debuff_hp: 1.5, silence: 2.5, freeze: 1.5, destroy: 7.0,
    curse_tri: 1.0, mana: 1.6, overload: -1.6, aura_spell: 1.8, aura_stat: 2.0, sacrifice: -3.0,
    cost_reduce_card: 1.2, next_discount: 1.0, turn_discount: 2.0, persist_buff: 6.0, secret_rearm: 2.0,
    install_secret: 3.0, mark: 2.5, fight: 4.0,
  },
  target_mult: {
    all_enemy_minions: 2.5, all_enemies: 3.0, all_minions: 1.2, all_other_minions: 1.2, all_friendly_minions: 2.2,
    other_friendly_minions: 2.0, random_enemy: 0.75, random_enemy_minion: 0.9, random_friendly_minion: 0.8,
    enemy_hero: 0.67, friendly_guard_minions: 1.5, friendly_rush_minions: 1.5, cursed_enemy_minions: 1.2,
    cursed_enemies: 1.2, adjacent: 1.3, random_damaged_friendly_minion: 0.6, random_friendly_guard: 0.8, random_friendly_stealth: 0.6,
  },
  trigger_mult: {
    play: 1.0, cast: 1.0, death: 0.9, turn_end: 2.0, turn_start: 2.0, attack: 1.3, kill: 1.0, hit_hero: 1.3,
    friendly_spell: 1.5, aura: 1.0, enemy_curse_tick: 2.0, part_attached: 1.0, friendly_death: 1.2, enemy_minion_died: 2.0,
    hero_attack: 2.0, hero_kill: 1.2, hero_after_attack: 2.0, after_attack_survive: 1.3, my_spell_hit_hero: 1.5,
    enemy_attack: 1.0, enemy_spell: 1.0, enemy_summon: 1.0, enemy_target_my_minion: 0.6,
  },
  cond_mult: { combo: 0.75, target_died: 0.6, default: 0.7 },
  n_ref_estimate: { sac_atk: 2, sac_hp: 3, sac_cost3: 2, target_curse_min1: 2, target_curse: 2, plus_guard2: 0.7, kills_turn3: 1.2, kills_by_effect: 1, lost_stats: 0.5, cursed_enemies: 2, chosen_atk: 3 },
  dur_mult: { turn: 0.5, opp_turn: 0.6, my_next_turn: 0.6 },
};

export function budget(cost) { return VALUE_TABLE.budget.per_mana * cost + VALUE_TABLE.budget.base; }
export function keywordValue(kws, atk) {
  let v = 0;
  for (const k of kws || []) { const t = VALUE_TABLE.keyword[k]; if (t) v += t.flat + t.per_atk * (atk || 0); }
  return v;
}
const tm = (t) => VALUE_TABLE.target_mult[t] ?? 1.0;

export function effectValue(e, tokens) {
  const V = VALUE_TABLE.per_point;
  const n = e.n_ref ? (VALUE_TABLE.n_ref_estimate[e.n_ref] ?? 1) + (e.n_ref === 'plus_guard2' ? (e.n || 0) : 0) : (e.n || 0);
  let v = 0;
  switch (e.do) {
    case 'damage': v = V.damage * n * tm(e.target); break;
    case 'heal': v = V.heal * Math.min(n, 10) * tm(e.target); break;
    case 'armor': v = V.armor * n; break;
    case 'draw': v = V.draw * n; break;
    case 'tutor': v = V.tutor + 0.8 * Math.abs(e.cost_mod || 0); break;
    case 'discover': v = V.discover; break;
    case 'give_card': v = V.give_card; break;
    case 'copy': v = V.copy; break;
    case 'cost_reduce': v = V.cost_reduce_card * n * (e.target === 'hand_all' ? 3 : e.count || 1); break;
    case 'hand_buff': v = ((e.atk || 0) + (e.hp || 0) + 1.5 * (e.dmg || 0)) * 0.9 * (e.count || (e.target === 'hand_minions' ? 2.5 : 1)); break;
    case 'buff': case 'attach': {
      const a = e.atk || 0, h = e.hp || 0;
      if (a < 0 || h < 0) v = (V.debuff_atk * Math.abs(Math.min(0, a)) + V.debuff_hp * Math.abs(Math.min(0, h))) * tm(e.target);
      else v = (V.buff_stat * (a + h) + keywordValue(e.kw, 3)) * tm(e.target);
      if (e.fx) v += effectValue(e.fx, tokens);
      if (e.dur) v *= VALUE_TABLE.dur_mult[e.dur] ?? 1;
      break;
    }
    case 'debuff_by_curse': v = 2 * (V.debuff_atk + V.debuff_hp); break;
    case 'set_attack': v = 2.0; break;
    case 'give_kw': v = keywordValue(e.kw, 3) * tm(e.target) * (e.dur ? VALUE_TABLE.dur_mult[e.dur] ?? 1 : 1); break;
    case 'give_fx': v = effectValue(e.fx, tokens) * tm(e.target); break;
    case 'silence': v = V.silence * tm(e.target); break;
    case 'freeze': v = V.freeze * tm(e.target); break;
    case 'destroy': v = V.destroy * (e.target === 'all_minions' ? 1.4 : tm(e.target)); break;
    case 'sacrifice': v = V.sacrifice; break;
    case 'fight': v = V.fight; break;
    case 'mark': v = V.mark * (n || 1) * (e.this_turn ? 0.4 : 0.6); break;
    case 'summon': {
      const t = tokens && tokens[e.token];
      const s = t ? t.attack + t.health + keywordValue(t.keywords, t.attack) : 2;
      v = 0.9 * s * (e.count || 1) * (e.side === 'enemy' ? -1 : 1);
      break;
    }
    case 'curse': v = (n * (n + 1)) / 2 * V.curse_tri * tm(e.target); break;
    case 'curse_double': v = 4; break;
    case 'mana': v = V.mana * n; break;
    case 'overload': v = V.overload * n; break;
    case 'enemy_overload': v = -V.overload * n; break;
    case 'next_discount': v = V.next_discount * n; break;
    case 'turn_discount': v = V.turn_discount * n * (e.kind === 'spell' ? 0.8 : 1); break;
    case 'next_minion_kw': v = keywordValue(e.kw, 3) * 0.6; break;
    case 'persist_buff': v = V.persist_buff * ((e.atk || 0) + (e.hp || 0)); break;
    case 'secret_rearm': v = V.secret_rearm; break;
    case 'install_secret': v = V.install_secret; break;
    case 'aura': v = V.aura_stat * ((e.atk || 0) + (e.hp || 0)) * (e.scope === 'adjacent' ? 0.8 : 1) * (e.tf || e.tf_not ? 0.6 : 1) + keywordValue(e.kw, 3) * 1.5; break;
    case 'aura_spell': v = V.aura_spell * n; break;
    case 'aura_curse_bonus': v = 3 * n; break;
    case 'aura_part_bonus': v = 2 * n; break;
    case 'self_atk_per_missing': v = 2; break;
    case 'secret': v = 0; break;
    default: v = 0;
  }
  const times = e.times_ref ? VALUE_TABLE.n_ref_estimate[e.times_ref] ?? 1 : e.times || 1;
  v *= times;
  v *= VALUE_TABLE.trigger_mult[e.on] ?? 1;
  if (e.cond && !e.else) v *= VALUE_TABLE.cond_mult[e.cond] ?? VALUE_TABLE.cond_mult.default;
  if (e.cond && e.else) v = 0.5 * v + 0.5 * effectValue({ on: e.on, ...e.else }, tokens);
  return v;
}

export function cardValue(card, tokens) {
  let v = 0;
  if (card.kind === 'minion') v += card.attack + card.health + keywordValue(card.keywords, card.attack);
  if (card.kind === 'weapon') v += 1.1 * card.attack * card.health + keywordValue(card.keywords, card.attack) * card.health * 0.5;
  for (const e of card.effects || []) v += effectValue(e, tokens);
  for (const e of card.secret || []) v += effectValue(e, tokens) * 1.1 + 0.5;
  return v;
}
export function cardDelta(card, tokens) { return cardValue(card, tokens) - budget(card.cost); }
