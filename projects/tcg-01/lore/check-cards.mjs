// tcg-01 카드 설정 검사: node projects/tcg-01/lore/check-cards.mjs
// 개수·유형 비율·id 범위·이름 중복·필수 필드·영웅별 배분·키워드 등장 수를 검사한다.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cards = JSON.parse(readFileSync(join(here, 'cards-lore.json'), 'utf8'));
const errors = [];
const fail = (m) => errors.push(m);

const REQ = ['id', 'type', 'attack_sub', 'branch', 'owner', 'name_ko', 'name_en', 'flavor_ko', 'flavor_en', 'concept_ko', 'cost_band', 'rarity_hint', 'visual_hint'];
const OWNERS = ['h_warden', 'h_choir', 'h_wreck', 'h_rider', 'h_archive', 'h_nameless', 'neutral'];
const BRANCH = {
  drawbuff: ['d_draw', 'd_seek', 'd_discount', 'd_etch', 'd_salvage'],
  buff: ['b_single', 'b_aura', 'b_swell', 'b_guard', 'b_mend', 'b_weaken', 'b_unname', 'b_anchor', 'b_brine', 'b_offering', 'b_fit', 'b_sealwrit', 'b_ebb'],
  instant: ['ai_bolt', 'ai_rapids', 'ai_sweep'],
  draw: ['ad_onkill', 'ad_onhit', 'ad_wake', 'ad_brand', 'ad_ebb', 'ad_raid'],
};
// 10-lore.md 4절 배분표와 같아야 함: [드로우버프, 버프, 즉시타격, 드로우형]
const PLAN = {
  h_warden: [2, 18, 1, 4], h_choir: [2, 18, 2, 3], h_wreck: [4, 15, 2, 4], h_rider: [1, 13, 6, 5],
  h_archive: [4, 14, 2, 5], h_nameless: [2, 12, 2, 9], neutral: [5, 30, 3, 12],
};
const KEYWORDS = ['첫 숨', '썰물', '방파제', '소금막', '물안개', '박차', '급류', '익사', '들이켬', '이름 지우기', '닻', '잉걸', '봉인문', '그을음', '뒷물결', '인양', '차오름', '소금독'];

// 1. 개수·필드
if (cards.length !== 200) fail(`총 ${cards.length}장 (200장이어야 함)`);
for (const c of cards) {
  for (const k of REQ) if (!(k in c)) fail(`${c.id}: 필드 ${k} 없음`);
  for (const k of REQ) if (k !== 'attack_sub' && (c[k] === '' || c[k] == null)) fail(`${c.id}: ${k} 비어 있음`);
  if (!OWNERS.includes(c.owner)) fail(`${c.id}: owner ${c.owner}`);
  if (!['low', 'mid', 'high'].includes(c.cost_band)) fail(`${c.id}: cost_band ${c.cost_band}`);
  if (!['sand', 'pearl', 'coral', 'abyss'].includes(c.rarity_hint)) fail(`${c.id}: rarity ${c.rarity_hint}`);
}
// 2. id 범위·유형
const idOk = (c) => {
  const m = /^([DBA])(\d{3})$/.exec(c.id); if (!m) return false;
  const n = +m[2];
  if (m[1] === 'D') return c.type === 'drawbuff' && n >= 1 && n <= 20 && c.attack_sub === null;
  if (m[1] === 'B') return c.type === 'buff' && n >= 1 && n <= 120 && c.attack_sub === null;
  return c.type === 'attack' && n >= 1 && n <= 60 && c.attack_sub === (n <= 18 ? 'instant' : 'draw');
};
for (const c of cards) if (!idOk(c)) fail(`${c.id}: id·type·attack_sub 불일치`);
const ids = new Set(cards.map((c) => c.id));
if (ids.size !== cards.length) fail('id 중복');
// 3. 비율
const cnt = (f) => cards.filter(f).length;
const ratio = { drawbuff: cnt((c) => c.type === 'drawbuff'), buff: cnt((c) => c.type === 'buff'), instant: cnt((c) => c.attack_sub === 'instant'), draw: cnt((c) => c.attack_sub === 'draw') };
if (ratio.drawbuff !== 20 || ratio.buff !== 120 || ratio.instant !== 18 || ratio.draw !== 42) fail(`비율 ${JSON.stringify(ratio)}`);
// 4. 갈래
for (const c of cards) {
  const key = c.type === 'attack' ? c.attack_sub : c.type;
  if (!BRANCH[key].includes(c.branch)) fail(`${c.id}: 갈래 ${c.branch}가 ${key}에 없음`);
}
// 5. 이름 중복
for (const k of ['name_ko', 'name_en']) {
  const seen = new Map();
  for (const c of cards) { const v = c[k].trim().toLowerCase(); if (seen.has(v)) fail(`${k} 중복: ${c[k]} (${seen.get(v)}, ${c.id})`); seen.set(v, c.id); }
}
// 6. 영웅별 배분
const ownerTable = {};
for (const o of OWNERS) {
  const mine = cards.filter((c) => c.owner === o);
  const row = [cnt((c) => c.owner === o && c.type === 'drawbuff'), cnt((c) => c.owner === o && c.type === 'buff'), cnt((c) => c.owner === o && c.attack_sub === 'instant'), cnt((c) => c.owner === o && c.attack_sub === 'draw')];
  ownerTable[o] = { total: mine.length, D: row[0], B: row[1], Ai: row[2], Ad: row[3] };
  if (row.join() !== PLAN[o].join()) fail(`${o}: 배분 ${row} (계획 ${PLAN[o]})`);
}
// 7. 키워드 등장 (concept_ko 기준)
const kw = {};
for (const k of KEYWORDS) kw[k] = cnt((c) => c.concept_ko.includes(k));
const kwAvg = Object.values(kw).reduce((a, b) => a + b, 0) / KEYWORDS.length;
if (kwAvg < 8) fail(`키워드 평균 ${kwAvg.toFixed(1)}장 (8 이상이어야 함)`);
// 8. 길이: 30-art 글 상자 15자 × 4줄 = 60자(줄바꿈 keep-all 여유로 56자 권장),
//    이름 띠 17 px·약 200 px = 한국어 10자·영문 21자 이내
const len = (s) => [...s].length;
for (const c of cards) {
  if (len(c.concept_ko) > 60) fail(`${c.id}: concept ${len(c.concept_ko)}자 (60자 초과, 글 상자 4줄 넘침)`);
  if (len(c.name_ko) > 10) fail(`${c.id}: name_ko ${len(c.name_ko)}자 (10자 초과)`);
  if (len(c.name_en) > 21) fail(`${c.id}: name_en ${len(c.name_en)}자 (21자 초과)`);
}
const longText = cards.filter((c) => len(c.concept_ko) > 56).map((c) => `${c.id}(${len(c.concept_ko)})`);
// 9. 원본 보호: 레퍼런스 키워드·기본 용어(영문·공식 한국어 번역어)가 카드 글·이름·플레이버에 없음
const BANNED_KO = ['돌격', '돌진', '속공', '도발', '은신', '질풍', '침묵', '빙결', '발견', '과부하', '연계', '비밀', '독성', '생명력 흡수', '주문 공격력', '천상의 보호막', '전투의 함성', '죽음의 메아리', '환생', '하수인', '방어도', '마나', '영웅 능력'];
const BANNED_EN = ['charge', 'rush', 'taunt', 'stealth', 'windfury', 'silence', 'freeze', 'discover', 'overload', 'combo', 'secret', 'poisonous', 'lifesteal', 'spell damage', 'divine shield', 'battlecry', 'deathrattle', 'reborn', 'minion', 'armor', 'mana', 'hero power', 'forge', 'echo', 'invoke', 'tidecaller'];
for (const c of cards) {
  const ko = `${c.name_ko} ${c.flavor_ko} ${c.concept_ko}`;
  const en = `${c.name_en} ${c.flavor_en}`.toLowerCase();
  for (const w of BANNED_KO) if (ko.includes(w)) fail(`${c.id}: 금지어 "${w}"`);
  for (const w of BANNED_EN) if (new RegExp(`\\b${w}\\b`).test(en)) fail(`${c.id}: 금지어 "${w}"`);
}

const branchCount = {};
for (const c of cards) branchCount[c.branch] = (branchCount[c.branch] || 0) + 1;
const rar = {};
for (const c of cards) rar[c.rarity_hint] = (rar[c.rarity_hint] || 0) + 1;

console.log('총', cards.length, '장 / 비율', JSON.stringify(ratio));
console.log('영웅별', JSON.stringify(ownerTable));
console.log('갈래별', JSON.stringify(branchCount));
console.log('희귀도', JSON.stringify(rar));
console.log('키워드 등장', JSON.stringify(kw), '평균', kwAvg.toFixed(1));
console.log('concept 56자 초과(경고)', longText.length ? longText.join(', ') : '없음');
if (errors.length) { console.log('실패', errors.length); for (const e of errors) console.log(' -', e); process.exit(1); }
console.log('결과: 통과');
