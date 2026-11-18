// 엔진 규칙 단위 테스트: node projects/tcg-01/tools/sim/engine-test.mjs
// 기대값은 손으로 계산해 적었다(엔진 출력을 정답으로 쓰지 않음). 작은 가짜 카드 DB로 규칙 하나씩 확인한다.
import { createGame, applyMulligan, startGame, applyAction, legalActions, attackOf, costOf } from './engine.mjs';

const RULES = {
  hero_health: 30, mana_cap: 10, start_hand_first: 3, start_hand_second: 4, hand_limit: 10, board_limit: 5,
  secret_limit: 3, curse_decay_per_tick: 1, turn_limit_each: 20, second_start_armor: 2,
  second_bonus_card: { id: 'X_SPARE_WICK', kind: 'spell', cost: 0, effects: [{ on: 'cast', do: 'mana', n: 1 }] },
};
const M = (id, cost, a, h, kw = [], effects = [], o = {}) => ({ id, kind: 'minion', cost, attack: a, health: h, keywords: kw, effects, owner: 'neutral', ...o });
const S = (id, cost, effects, o = {}) => ({ id, kind: 'spell', cost, effects, owner: 'neutral', ...o });
const DB = {
  V11: M('V11', 1, 1, 1), V22: M('V22', 2, 2, 2), V33: M('V33', 3, 3, 3), V55: M('V55', 5, 5, 5),
  G13: M('G13', 1, 1, 3, ['guard']), SH: M('SH', 2, 2, 2, ['shield']), DD: M('DD', 2, 1, 1, ['deadly']), LS: M('LS', 2, 2, 3, ['lifesteal']),
  CH: M('CH', 2, 2, 1, ['charge']), RU: M('RU', 2, 2, 1, ['rush']), SP: M('SP', 2, 1, 2, [], [{ on: 'aura', do: 'aura_spell', n: 1 }]),
  AU: M('AU', 3, 1, 3, [], [{ on: 'aura', do: 'aura', scope: 'others', atk: 1, hp: 1 }]),
  BOLT: S('BOLT', 1, [{ on: 'cast', do: 'damage', target: 'chosen', n: 3 }], { target: 'choose_enemy' }),
  CURSE3: S('CURSE3', 1, [{ on: 'cast', do: 'curse', target: 'chosen', n: 3 }], { target: 'choose_enemy' }),
  OVER: S('OVER', 0, [{ on: 'cast', do: 'overload', n: 2 }]),
  FRZ: S('FRZ', 1, [{ on: 'cast', do: 'freeze', target: 'chosen' }], { target: 'choose_enemy_minion' }),
  SIL: S('SIL', 1, [{ on: 'cast', do: 'silence', target: 'chosen' }], { target: 'choose_enemy_minion' }),
  BUFF: S('BUFF', 1, [{ on: 'cast', do: 'buff', target: 'chosen', atk: 2, hp: 2, kw: ['guard'] }], { target: 'choose_friendly_minion' }),
  SEC: { id: 'SEC', kind: 'spell', cost: 1, effects: [{ on: 'cast', do: 'secret' }], secret: [{ on: 'enemy_attack', do: 'freeze', target: 'trigger_source' }], owner: 'neutral' },
  WPN: { id: 'WPN', kind: 'weapon', cost: 2, attack: 3, health: 2, keywords: [], effects: [], owner: 'neutral' },
  DR: M('DR', 2, 1, 1, [], [{ on: 'death', do: 'draw', n: 2 }]),
};
let pass = 0, fail = 0;
const eq = (name, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) pass++; else { fail++; console.log(`실패 ${name}: 받음 ${JSON.stringify(got)} 기대 ${JSON.stringify(want)}`); } };

// 덱 맨 위(배열 끝)부터 뽑힌다. 셔플을 없애려고 같은 카드로 채운 덱을 쓴다.
function game(deckA, deckB, seed = 1, rules = RULES) {
  const st = createGame({ cards: DB, tokens: {}, rules, heroes: {}, seed, players: [{ hero: 'h_x', deck: deckA }, { hero: 'h_y', deck: deckB }] });
  applyMulligan(st, 0, []); applyMulligan(st, 1, []);
  startGame(st);
  return st;
}
const fill = (id, n) => Array(n).fill(id);
const handIdx = (st, p, id) => st.players[p].hand.findIndex((i) => i.cid === id);
const give = (st, p, id) => { st.players[p].hand.push({ cid: id, costMod: 0, atkMod: 0, hpMod: 0, dmgMod: 0 }); return st.players[p].hand.length - 1; };
const end = (st) => applyAction(st, { type: 'end' });
const play = (st, id, target = null) => applyAction(st, { type: 'play', hand: handIdx(st, st.active, id), target });

// 1. 시작: 선공 손패 3+1(첫 드로우)=4, 후공 4 + 여분 심지, 후공 껍질 2, 심지 1
{
  const st = game(fill('V11', 30), fill('V11', 30));
  eq('선공 손패', st.players[0].hand.length, 4);
  eq('후공 손패(여분 심지 포함)', st.players[1].hand.length, 5);
  eq('후공 껍질', st.players[1].hero.armor, 2);
  eq('1턴 심지', st.players[0].mana, 1);
  end(st); eq('후공 1턴 심지', st.players[1].mana, 1);
  applyAction(st, { type: 'play', hand: st.players[1].hand.findIndex((i) => i.system), target: null });
  eq('여분 심지 뒤 심지', st.players[1].mana, 2);
  for (let i = 0; i < 20; i++) end(st);
  eq('심지 상한 10', st.players[st.active].maxMana, 10);
}
// 2. 피로: 덱 4장 → 선공은 시작 3 + 1턴 드로우로 덱 0. 이후 턴마다 1, 2, 3 피해
{
  const st = game(fill('V11', 4), fill('V11', 30));
  eq('덱 0', st.players[0].deck.length, 0);
  end(st); end(st); eq('피로 1', st.players[0].hero.hp, 29);
  end(st); end(st); eq('피로 1+2', st.players[0].hero.hp, 27);
  end(st); end(st); eq('피로 1+2+3', st.players[0].hero.hp, 24);
}
// 3. 필드 상한 5: 6번째 응답자는 낼 수 없음
{
  const st = game(fill('V11', 30), fill('V11', 30));
  st.players[0].mana = 10;
  for (let i = 0; i < 6; i++) give(st, 0, 'V11');
  for (let i = 0; i < 5; i++) play(st, 'V11');
  eq('필드 5', st.players[0].board.length, 5);
  eq('6번째 불가', legalActions(st).some((a) => a.type === 'play'), false);
}
// 4. 손패 상한 10: 11번째는 버려짐
{
  const st = game(fill('V11', 30), fill('V11', 30));
  while (st.players[0].hand.length < 10) give(st, 0, 'V22');
  end(st); end(st);
  eq('손패 10 유지', st.players[0].hand.length, 10);
  eq('버림 1', st.players[0].burned, 1);
}
// 5. 방파제: 공격 대상은 방파제만. 소금막: 첫 피해 무효
{
  const st = game(fill('V11', 30), fill('V11', 30));
  st.players[0].mana = 10; give(st, 0, 'V33'); play(st, 'V33'); end(st);
  st.players[1].mana = 10; give(st, 1, 'G13'); play(st, 'G13'); give(st, 1, 'SH'); play(st, 'SH'); end(st);
  const att = st.players[0].board[0];
  const ts = legalActions(st).filter((a) => a.type === 'attack').map((a) => a.target);
  eq('방파제만 대상', ts, [st.players[1].board[0].uid]);
  // 방파제 1/3을 3/3이 침 → 방파제 죽음, 공격자 3-1=2
  applyAction(st, { type: 'attack', attacker: att.uid, target: st.players[1].board[0].uid });
  eq('방파제 사망', st.players[1].board.length, 1);
  eq('공격자 체력', st.players[0].board[0].hp, 2);
  end(st); end(st);
  // 소금막 2/2를 공격: 소금막만 깨지고 체력 2 유지, 공격자는 2 받음 → 0으로 사망
  applyAction(st, { type: 'attack', attacker: st.players[0].board[0].uid, target: st.players[1].board[0].uid });
  eq('소금막 깨짐·체력 유지', [st.players[1].board[0].kw.shield, st.players[1].board[0].hp], [false, 2]);
  eq('반격으로 공격자 사망', st.players[0].board.length, 0);
}
// 6. 익사(deadly)·들이켬(lifesteal)
{
  const st = game(fill('V11', 30), fill('V11', 30));
  st.players[0].mana = 10; give(st, 0, 'DD'); play(st, 'DD'); give(st, 0, 'LS'); play(st, 'LS'); end(st);
  st.players[1].mana = 10; give(st, 1, 'V55'); play(st, 'V55'); end(st);
  st.players[0].hero.hp = 20;
  const [dd, ls] = st.players[0].board;
  applyAction(st, { type: 'attack', attacker: dd.uid, target: st.players[1].board[0].uid });
  eq('익사로 5/5 사망', st.players[1].board.length, 0);
  applyAction(st, { type: 'attack', attacker: ls.uid, target: st.players[1].hero.uid });
  eq('들이켬 회복 20+2', st.players[0].hero.hp, 22);
  eq('상대 껍질 2 먼저 깎임', [st.players[1].hero.armor, st.players[1].hero.hp], [0, 30]);
}
// 7. 소금독 3: 걸린 쪽 턴 시작에 3 피해 → 2 → 다음 턴 2 피해 → 1 → 1 피해 → 0. 합 6
{
  const st = game(fill('V11', 30), fill('V11', 30));
  give(st, 0, 'CURSE3'); play(st, 'CURSE3', st.players[1].hero.uid);
  end(st); eq('소금독 1틱(껍질 2 먼저)', [st.players[1].hero.armor, st.players[1].hero.hp, st.players[1].hero.curse], [0, 29, 2]);
  end(st); end(st); eq('2틱', [st.players[1].hero.hp, st.players[1].hero.curse], [27, 1]);
  end(st); end(st); eq('3틱', [st.players[1].hero.hp, st.players[1].hero.curse], [26, 0]);
}
// 8. 그을음 2: 다음 턴 심지 −2
{
  const st = game(fill('V11', 30), fill('V11', 30));
  for (let i = 0; i < 6; i++) { end(st); }
  // 선공 4턴째: 심지 4
  eq('4턴 심지', st.players[0].mana, 4);
  give(st, 0, 'OVER'); play(st, 'OVER'); end(st); end(st);
  eq('5턴 그을음 2 → 3', st.players[0].mana, 3);
}
// 9. 닻: 닻 걸린 응답자는 주인 다음 턴에 공격 못 함, 그다음 턴엔 가능
{
  const st = game(fill('V11', 30), fill('V11', 30));
  end(st);
  st.players[1].mana = 10; give(st, 1, 'V33'); play(st, 'V33'); end(st);
  give(st, 0, 'FRZ'); play(st, 'FRZ', st.players[1].board[0].uid); end(st);
  eq('닻: 공격 불가', legalActions(st).some((a) => a.type === 'attack'), false);
  end(st); end(st);
  eq('다음 턴 공격 가능', legalActions(st).some((a) => a.type === 'attack'), true);
}
// 10. 급류(charge)는 낸 턴 영웅 공격 가능, 박차(rush)는 응답자만
{
  const st = game(fill('V11', 30), fill('V11', 30));
  st.players[0].mana = 10; give(st, 0, 'CH'); play(st, 'CH'); give(st, 0, 'RU'); play(st, 'RU');
  const acts = legalActions(st).filter((a) => a.type === 'attack');
  eq('급류 영웅 공격 가능', acts.some((a) => a.attacker === st.players[0].board[0].uid && a.target === st.players[1].hero.uid), true);
  eq('박차는 적 응답자 없으면 공격 없음', acts.some((a) => a.attacker === st.players[0].board[1].uid), false);
}
// 11. 잉걸 +1: 의식 피해 3 → 4. 오라 +1/+1
{
  const st = game(fill('V11', 30), fill('V11', 30));
  st.players[0].mana = 10; give(st, 0, 'SP'); play(st, 'SP'); give(st, 0, 'BOLT'); play(st, 'BOLT', st.players[1].hero.uid);
  eq('잉걸 피해 4(껍질 2 + 명줄 2)', [st.players[1].hero.armor, st.players[1].hero.hp], [0, 28]);
  give(st, 0, 'AU'); play(st, 'AU');
  eq('오라: 잉걸 응답자 2/3', [attackOf(st, st.players[0].board[0]), st.players[0].board[0].hp], [2, 3]);
}
// 12. 이름 지우기: 강화·키워드 제거, 기본 수치로
{
  const st = game(fill('V11', 30), fill('V11', 30));
  st.players[0].mana = 10; give(st, 0, 'V22'); play(st, 'V22'); give(st, 0, 'BUFF'); play(st, 'BUFF', st.players[0].board[0].uid);
  eq('강화 4/4 방파제', [attackOf(st, st.players[0].board[0]), st.players[0].board[0].hp, !!st.players[0].board[0].kw.guard], [4, 4, true]);
  end(st); st.players[1].mana = 10; give(st, 1, 'SIL'); play(st, 'SIL', st.players[0].board[0].uid);
  eq('이름 지우기 뒤 2/2', [attackOf(st, st.players[0].board[0]), st.players[0].board[0].hp, !!st.players[0].board[0].kw.guard], [2, 2, false]);
}
// 13. 봉인문: 상대 응답자가 공격하면 닻(공격 자체는 진행)
{
  const st = game(fill('V11', 30), fill('V11', 30));
  give(st, 0, 'SEC'); play(st, 'SEC'); eq('봉인문 설치', st.players[0].secrets.length, 1); end(st);
  st.players[1].mana = 10; give(st, 1, 'CH'); play(st, 'CH');
  applyAction(st, { type: 'attack', attacker: st.players[1].board[0].uid, target: st.players[0].hero.uid });
  eq('봉인문 소모', st.players[0].secrets.length, 0);
  eq('공격은 진행(30-2)', st.players[0].hero.hp, 28);
  eq('공격자 닻', st.players[1].board[0].freezeUntil >= st.half + 1, true);
}
// 14. 인장: 영웅 공격 3, 내구 2 → 두 번 치면 깨짐
{
  const st = game(fill('V11', 30), fill('V11', 30));
  st.players[0].mana = 10; give(st, 0, 'WPN'); play(st, 'WPN');
  applyAction(st, { type: 'attack', attacker: st.players[0].hero.uid, target: st.players[1].hero.uid });
  eq('인장 공격(껍질 2 + 1)', [st.players[1].hero.armor, st.players[1].hero.hp, st.players[0].hero.weapon.dur], [0, 29, 1]);
  eq('턴당 1회', legalActions(st).some((a) => a.type === 'attack'), false);
  end(st); end(st);
  applyAction(st, { type: 'attack', attacker: st.players[0].hero.uid, target: st.players[1].hero.uid });
  eq('인장 깨짐', st.players[0].hero.weapon, null);
}
// 15. 썰물: 죽을 때 2장 뽑기
{
  const st = game(fill('V11', 30), fill('V11', 30));
  st.players[0].mana = 10; give(st, 0, 'DR'); play(st, 'DR'); end(st);
  const before = st.players[0].hand.length;
  give(st, 1, 'BOLT'); play(st, 'BOLT', st.players[0].board[0].uid);
  eq('썰물 2장', st.players[0].hand.length, before + 2);
}
// 16. 턴 제한: 각자 20턴 → 반턴 40 뒤 명줄 비교
{
  const st = game(fill('V11', 30), fill('V11', 30));
  st.players[1].hero.hp = 10;
  let guard = 0; while (!st.over && guard++ < 100) end(st);
  eq('턴 제한 종료', [st.endReason, st.half, st.winner], ['turn_limit', 40, 0]);
}
// 17. 결정론: 같은 시드 → 같은 덱 순서
{
  const deck = ['V11', 'V22', 'V33', 'V55', 'G13', 'SH', 'DD', 'LS', 'CH', 'RU'];
  const a = createGame({ cards: DB, rules: RULES, heroes: {}, seed: 77, players: [{ hero: 'x', deck }, { hero: 'y', deck }] });
  const b = createGame({ cards: DB, rules: RULES, heroes: {}, seed: 77, players: [{ hero: 'x', deck }, { hero: 'y', deck }] });
  eq('결정론', a.players[0].hand.map((i) => i.cid).concat(a.players[0].deck.map((i) => i.cid)), b.players[0].hand.map((i) => i.cid).concat(b.players[0].deck.map((i) => i.cid)));
}
console.log(`엔진 규칙 테스트: 통과 ${pass}, 실패 ${fail}`);
if (fail) process.exit(1);
