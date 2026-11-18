// tcg-01 카드 설정 검사: node projects/tcg-01/lore/check-cards.mjs
// 개수·유형 비율·id 범위·이름 중복·필수 필드·영웅별 배분·키워드 등장 수를 검사한다.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cards = JSON.parse(readFileSync(join(here, 'cards-lore.json'), 'utf8'));
const errors = [];
const fail = (m) => errors.push(m);

const REQ = ['id', 'type', 'attack_sub', 'branch', 'owner', 'name_ko', 'name_en', 'flavor_ko', 'flavor_en', 'concept_ko', 'concept_en', 'story_ko', 'story_en', 'cost_band', 'rarity_hint', 'visual_hint'];
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
// 2026-11-18 "용어 쉽게" 개정 키워드(10-lore 6절)
const KEYWORDS = ['등장', '사망 시', '방벽', '튕겨내기', '위장', '기습', '즉시 공격', '즉사', '흡혈', '효과 지우기', '속박', '주문 위력', '덫', '마나 빚', '후속', '골라잡기', '성장', '중독'];

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
  if (len(c.concept_en || "") > 120) fail(`${c.id}: concept_en ${len(c.concept_en)}자 (120자 초과, 영어 글 상자 4줄 넘침)`);
}
const longText = cards.filter((c) => len(c.concept_ko) > 56).map((c) => `${c.id}(${len(c.concept_ko)})`);
// 9. 원본 보호: 레퍼런스 키워드·기본 용어(영문·공식 한국어 번역어)가 카드 글·이름·플레이버에 없음
// 레퍼런스 공식 한국어 용어·키워드 + 다른 상용 TCG 공식 키워드 번역(10-lore 2-8). '마나'·'영웅'·'주문'은 장르 공통어라 허용
const BANNED_KO = ['돌격', '돌진', '속공', '도발', '은신', '질풍', '침묵', '빙결', '발견', '과부하', '연계', '비밀', '독성', '생명력 흡수', '주문 공격력', '천상의 보호막', '전투의 함성', '죽음의 메아리', '환생', '하수인', '방어도', '마나 수정', '영웅 능력', '탈진', '종족', '전장', '유닛', '팔로워', '보호막', '수호', '잠복', '유언', '선제공격', '신속', '죽음의 손길', '생명연결'];
const BANNED_EN = ['charge', 'rush', 'taunt', 'stealth', 'windfury', 'silence', 'freeze', 'discover', 'overload', 'combo', 'secret', 'poisonous', 'lifesteal', 'spell damage', 'divine shield', 'battlecry', 'deathrattle', 'reborn', 'minion', 'armor', 'mana crystal', 'hero power', 'forge', 'echo', 'invoke', 'tidecaller', 'fatigue', 'tribe', 'unit', 'follower', 'barrier', 'elusive', 'ward', 'ambush', 'last words', 'haste', 'deathtouch', 'lifelink', 'trap', 'first strike'];
// 옛 세계관 기능 용어(2026-11-18 요청자 "용어 쉽게"): 카드 글·UI 키 표에 남으면 실패. 이야기 문장·카드 이름·풍미글·대사는 검사 안 함
const OLD_KO = ['호명자', '호명술', '응답자', '영장', '조수원', '심지', '명줄', '껍질', '숨 고르기', '공허 호명', '가라앉은 자리', '첫 숨', '썰물', '방파제', '소금막', '물안개', '박차', '급류', '익사', '들이켬', '이름 지우기', '닻', '잉걸', '봉인문', '그을음', '뒷물결', '인양', '차오름', '소금독', '덧새김', '혈통', '공명', '새김', '소금화', '각인 먹', '의뢰', '물때', '의식', '인장', '부두'];
const OLD_EN = ['caller', 'calling', 'answerer', 'writ', 'writbook', 'circle', 'wick', 'wicks', 'lifeline', 'shell', 'end breath', 'hollow call', 'the sunk', 'first breath', 'ebb', 'breakwater', 'saltskin', 'seamist', 'spur', 'rapids', 'drown', 'draught', 'unname', 'unnamed', 'anchor', 'kindle', 'sealwrit', 'soot', 'wake', 'salvage', 'swell', 'brine', 'etch', 'fit', 'resonance', 'recut', 'salt marks', 'carving ink', 'commission', 'commissions', 'crate', 'crates', 'rite', 'rites', 'brand', 'dock'];
const hasOld = (ko, en) => [...OLD_KO.filter((w) => ko.includes(w)), ...OLD_EN.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(en))];
for (const c of cards) { const o = hasOld(c.concept_ko, c.concept_en); if (o.length) fail(`${c.id}: 카드 글에 옛 용어 ${o.join('·')}`); }
for (const c of cards) {
  const ko = `${c.name_ko} ${c.flavor_ko} ${c.concept_ko}`;
  const en = `${c.name_en} ${c.flavor_en} ${c.concept_en}`.toLowerCase();
  for (const w of BANNED_KO) if (ko.includes(w)) fail(`${c.id}: 금지어 "${w}"`);
  for (const w of BANNED_EN) if (new RegExp(`\\b${w}\\b`).test(en)) fail(`${c.id}: 금지어 "${w}"`);
}

// 10. 10-lore.md 키 표: 금지어·옛 용어(화면 글), 튜토리얼·안내·용어 사전 글 한도
const lore = readFileSync(join(here, '..', '10-lore.md'), 'utf8');
const PROTECT = ['썰물 영장', '썰물 연대기', 'Ebbwrit', 'Ebb Chronicle', '노해의 호명자들', 'Callers of the Bare Sea'];
const strip = (t) => PROTECT.reduce((a, w) => a.split(w).join(''), t);
// 이야기용 키(세계관 고유어 허용): 제목·부제·영웅 이름·칭호·대사·승패 부제
const STORY_KEY = /^(game_title|game_subtitle|chronicle_title|faction_|story_arc_|hero_[a-z]+_(name|title|power)|line_|result_(victory|defeat)_sub_)/;
let loreRows = 0;
const glossStart = lore.indexOf('### 8-13.');
for (const m of lore.matchAll(/^\| `([a-z0-9_]+)` \| ([^|]*) \| ([^|]*) \|/gm)) {
  const [, key, ko, en] = m; loreRows++;
  if (m.index >= glossStart && m.index < lore.indexOf('## 9.', glossStart)) continue; // 용어 사전 표는 아래에서 따로
  const k2 = strip(ko), e2 = strip(en), el = e2.toLowerCase();
  for (const w of BANNED_KO) if (k2.includes(w)) fail(`10-lore ${key}: 금지어 "${w}"`);
  for (const w of BANNED_EN) if (new RegExp(`\\b${w}\\b`).test(el)) fail(`10-lore ${key}: 금지어 "${w}"`);
  if (!STORY_KEY.test(key)) { const o = hasOld(k2, e2); if (o.length) fail(`10-lore ${key}: 화면 글에 옛 용어 ${o.join('·')}`); }
}
// 튜토리얼(8-7)·첫 진입 안내(8-12): 한 단계 ko 60자·한 문장 35자, en 110자
const TUTMAX = { ko: 60, sentence: 35, en: 110 };
let tutRows = 0;
for (const line of lore.split('\n')) {
  const cols = line.split('|').map((x) => x.trim());
  const ki = cols.findIndex((x) => /^`(tut|guide)_[a-z0-9_]+`$/.test(x));
  if (ki < 0) continue;
  const ko = cols[cols.length - 3], en = cols[cols.length - 2], key = cols[ki];
  tutRows++;
  if (len(ko) > TUTMAX.ko) fail(`10-lore ${key}: ko ${len(ko)}자 (60자 초과)`);
  for (const sen of ko.split(/(?<=[.!?])\s+/)) if (len(sen) > TUTMAX.sentence) fail(`10-lore ${key}: 한 문장 ${len(sen)}자 (35자 초과)`);
  if (len(en) > TUTMAX.en) fail(`10-lore ${key}: en ${len(en)}자 (110자 초과)`);
  const o = hasOld(ko, en); if (o.length) fail(`10-lore ${key}: 옛 용어 ${o.join('·')}`);
  for (const w of BANNED_KO) if (ko.includes(w)) fail(`10-lore ${key}: 금지어 "${w}"`);
}
// 용어 사전(8-13): 설명 ko 40자·en 80자, 용어·설명에 금지어·옛 용어 없음("흔히 부르는 말" 칸은 설명용이라 레퍼런스 금지어만 검사)
let glossRows = 0;
{
  const g = lore.slice(glossStart, lore.indexOf('## 9.', glossStart));
  for (const line of g.split('\n')) {
    const c = line.split('|').map((x) => x.trim());
    if (c.length < 9 || !/^`[a-z_]+`$/.test(c[1])) continue;
    glossRows++;
    const [, id, tko, ten, dko, den, , common] = c;
    if (len(dko) > 40) fail(`용어 사전 ${id}: 설명 ${len(dko)}자 (40자 초과)`);
    if (len(den) > 80) fail(`용어 사전 ${id}: en 설명 ${len(den)}자 (80자 초과)`);
    const o = hasOld(`${tko} ${dko}`, `${ten} ${den}`); if (o.length) fail(`용어 사전 ${id}: 옛 용어 ${o.join('·')}`);
    const REF_ONLY = BANNED_KO.slice(0, 26); // 레퍼런스 공식어(다른 TCG 통칭은 설명 칸 허용)
    for (const w of REF_ONLY) if (`${tko} ${dko} ${common}`.includes(w)) fail(`용어 사전 ${id}: 금지어 "${w}"`);
  }
  if (glossRows < 44) fail(`용어 사전 ${glossRows}행 (용어 26 + 키워드 18 = 44 이상)`);
}

// 11. 카드 스토리(2026-11-18 요청자 지시): story_ko 80~160자·2~4문장, story_en 320자 이하, flavor와 같은 문장 없음, 금지어·옛 기능 용어 없음
// 스토리는 이야기 문장이라 세계관 고유어(참이름·흑조·맹약·대썰물 등)는 허용, 옛 화면 기능어(호명자·응답자·영장 등)만 막음
const STORY_OLD_KO = ['호명자', '호명술', '응답자', '영장', '조수원', '명줄', '공허 호명', '첫 숨', '소금막', '봉인문', '소금독', '잉걸', '덧새김'];
const STORY_OLD_EN = ['caller', 'answerer', 'writ', 'writbook', 'lifeline', 'sealwrit', 'saltskin', 'kindle', 'seamist'];
const sentences = (t) => t.split(/(?<=[.!?])\s+/).map((x) => x.replace(/[\s"'“”.!?]/g, '')).filter(Boolean);
let storyN = 0;
for (const c of cards) {
  if (!c.story_ko || !c.story_en) { fail(`${c.id}: story 없음`); continue; }
  storyN++;
  const n = len(c.story_ko), sc = sentences(c.story_ko).length;
  if (n < 80 || n > 160) fail(`${c.id}: story_ko ${n}자 (80~160)`);
  if (sc < 2 || sc > 4) fail(`${c.id}: story_ko ${sc}문장 (2~4)`);
  if (len(c.story_en) > 320) fail(`${c.id}: story_en ${len(c.story_en)}자 (320 초과)`);
  const fk = new Set(sentences(c.flavor_ko)), fe = new Set(sentences(c.flavor_en.toLowerCase()));
  if (sentences(c.story_ko).some((x) => fk.has(x))) fail(`${c.id}: story_ko에 flavor 문장 반복`);
  if (sentences(c.story_en.toLowerCase()).some((x) => fe.has(x))) fail(`${c.id}: story_en에 flavor 문장 반복`);
  for (const w of BANNED_KO) if (c.story_ko.includes(w)) fail(`${c.id}: story 금지어 "${w}"`);
  for (const w of BANNED_EN) if (new RegExp(`\\b${w}\\b`, 'i').test(c.story_en)) fail(`${c.id}: story 금지어 "${w}"`);
  for (const w of STORY_OLD_KO) if (c.story_ko.includes(w)) fail(`${c.id}: story 옛 용어 "${w}"`);
  for (const w of STORY_OLD_EN) if (new RegExp(`\\b${w}\\b`, 'i').test(c.story_en)) fail(`${c.id}: story 옛 용어 "${w}"`);
}

// 12. 5-5 카드 스토리 순서: 세력마다 순서 목록 = 그 세력 카드 전체(빠짐·중복 없음)
{
  let arcs = 0;
  for (const m of lore.matchAll(/^- `(h_[a-z]+|neutral)`: ([A-Z0-9 →]+)$/gm)) {
    arcs++;
    const ids = m[2].split('→').map((x) => x.trim());
    const want = cards.filter((c) => c.owner === m[1]).map((c) => c.id).sort();
    if (new Set(ids).size !== ids.length || [...ids].sort().join() !== want.join()) fail(`5-5 ${m[1]} 스토리 순서가 세력 카드 목록과 다름`);
  }
  if (arcs !== 7) fail(`5-5 스토리 순서 ${arcs}개 (7개여야 함)`);
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
console.log('10-lore 키 표', loreRows, '행 / 튜토리얼·안내', tutRows, '단계 / 용어 사전', glossRows, '행');
console.log('카드 스토리', storyN, '장');
console.log('concept 56자 초과(경고)', longText.length ? longText.join(', ') : '없음');
if (errors.length) { console.log('실패', errors.length); for (const e of errors) console.log(' -', e); process.exit(1); }
console.log('결과: 통과');
