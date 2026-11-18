// cards.json·decks/*.json·카드 가치 표를 만든다: node projects/tcg-01/tools/sim/build-cards.mjs
// 원천: lore/cards-lore.json(id·owner·type·branch·rarity·concept) + card-defs.mjs(수치) + balance.json(돌파 규칙)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFS, TOKENS } from './card-defs.mjs';
import { cardValue, budget } from './value.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const lore = JSON.parse(readFileSync(join(root, 'lore', 'cards-lore.json'), 'utf8'));
const balance = JSON.parse(readFileSync(join(root, 'balance.json'), 'utf8'));
const LINEAGE = { h_warden: 'warden', h_choir: 'drowned', h_wreck: 'contraption', h_rider: 'rider', h_archive: 'scribe', h_nameless: 'nameless' };
const BAND = { low: [1, 3], mid: [4, 6], high: [7, 10] };
const errors = [];

function breakthroughOf(c) {
  const bt = { 1: {}, 2: {}, 3: {} };
  if (c.kind === 'minion' && c.cost <= 3 && (c.keywords || []).includes('charge')) {
    // round-2: 저비용 급류는 +1 체력만으로도 친선 슬롯 같은 덱 대결 56 %(급류 어그로) → 외형만
  } else if (c.kind === 'minion') {
    bt[1] = { health: 1 };
    bt[2] = c.cost >= 4 ? { health: 1, attack: 1 } : { health: 1 };
  } else if (c.kind === 'weapon') {
    bt[2] = c.cost >= 4 ? { health: 1 } : {};
  } else {
    const i = (c.effects || []).findIndex((e) => ['damage', 'heal', 'armor', 'curse'].includes(e.do) && e.n && !e.n_ref && !e.cond);
    if (c.cost >= 4 && i >= 0) bt[2] = { effect_n: { [i]: 1 } };
  }
  bt[3] = { ...bt[2] };
  return bt;
}
function deriveTarget(d) {
  if (d.target) return d;
  return d;
}

const cards = [];
for (const L of lore) {
  const d = DEFS[L.id];
  if (!d) { errors.push(`${L.id}: 수치 정의 없음`); continue; }
  const c = {
    id: L.id, owner: L.owner, type: L.type, attack_sub: L.attack_sub, branch: L.branch,
    rarity: L.rarity_hint, kind: d.kind, cost: d.cost,
    attack: d.kind === 'spell' ? null : d.attack, health: d.kind === 'spell' ? null : d.health,
    keywords: d.keywords || [], target: d.target || null, target2: d.target2 || null, tf: d.tf || null, tf2: d.tf2 || null,
    effects: d.effects || [], ...(d.secret ? { secret: d.secret } : {}),
    lineage: d.kind === 'minion' ? (LINEAGE[L.owner] || null) : null,
    cost_band: L.cost_band,
    lore_ref: `lore/cards-lore.json#${L.id}`,
  };
  if (d.approx) c.approx = d.approx;
  if (d.kind_note) c.kind_note = d.kind_note;
  const [lo, hi] = BAND[L.cost_band];
  c.cost_band_ok = c.cost >= lo - 1 && c.cost <= hi + 1;
  c.breakthrough = breakthroughOf(c);
  const v = cardValue(c, TOKENS);
  c.value = { score: +v.toFixed(2), budget: budget(c.cost), delta: +(v - budget(c.cost)).toFixed(2) };
  cards.push(c);
}
for (const id of Object.keys(DEFS)) if (!lore.find((l) => l.id === id)) errors.push(`${id}: lore에 없음`);

const out = {
  version: '1.1.0',
  schema: '20-balance.md 8절. 이름·글은 lore_ref(id)로 lore/cards-lore.json을 참조. kind: minion|spell|weapon. 돌파 breakthrough는 단계별 누적 변화.',
  tokens: Object.values(TOKENS),
  cards,
};
writeFileSync(join(root, 'cards.json'), JSON.stringify(out, null, 1));

// ---------- 표준 덱 ----------
const DECKS = {
  'warden-bulwark': { hero: 'h_warden', archetype: '방파제 미드레인지', list: { B001: 2, B015: 2, B007: 2, B009: 1, B004: 1, B002: 2, B006: 2, B005: 2, A001: 1, D002: 1, B012: 2, A022: 2, B017: 1, B008: 1, B018: 1, B003: 1, B092: 2, B093: 1, B096: 1, A017: 1, B095: 1 } },
  'choir-brine': { hero: 'h_choir', archetype: '소금독 컨트롤', list: { B021: 2, B019: 2, B028: 2, A003: 2, A024: 1, D004: 1, B022: 2, B025: 1, B034: 1, B029: 1, B024: 2, B032: 2, A025: 2, A002: 1, B031: 1, B036: 1, B092: 2, A060: 1, A054: 1, B099: 1, B027: 1 } },
  'wreck-fit': { hero: 'h_wreck', archetype: '부품 성장 콤보', list: { B037: 2, B038: 2, D005: 1, A004: 2, A029: 1, B043: 2, B039: 2, B040: 2, B046: 2, B044: 2, D008: 1, B041: 2, B050: 1, B049: 1, A005: 1, B042: 1, B051: 1, B092: 2, B104: 1, B096: 1 } },
  'rider-rush': { hero: 'h_rider', archetype: '급류 어그로', face: 1.5, list: { A006: 2, A030: 2, B055: 2, A008: 2, D009: 1, B053: 1, B057: 2, B063: 2, B058: 1, A011: 2, A034: 2, B060: 1, A009: 2, A007: 1, B054: 1, A031: 1, A010: 1, A016: 2, B097: 2 } },
  'archive-kindle': { hero: 'h_archive', archetype: '잉걸 의식 컨트롤', list: { A012: 2, B068: 1, B069: 2, B077: 2, D011: 1, B065: 1, B067: 1, B071: 2, A035: 2, D010: 1, B073: 2, B072: 1, B070: 2, A036: 2, A039: 1, A037: 1, B074: 1, A038: 1, B099: 1, B092: 2, D012: 1 } },
  'nameless-wake': { hero: 'h_nameless', archetype: '물안개 뒷물결 템포', face: 1.2, list: { B079: 2, D014: 2, A042: 2, B088: 2, B083: 1, A041: 2, A040: 1, A014: 2, B082: 1, B086: 1, D015: 1, B084: 2, A015: 2, A044: 1, B085: 1, A043: 1, A045: 1, A046: 1, B097: 2, A049: 2 } },
};
mkdirSync(join(root, 'decks'), { recursive: true });
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
const deckSummary = [];
for (const [name, d] of Object.entries(DECKS)) {
  const ids = [];
  for (const [id, n] of Object.entries(d.list)) {
    const c = byId[id];
    if (!c) { errors.push(`${name}: ${id} 없음`); continue; }
    if (c.owner !== 'neutral' && c.owner !== d.hero) errors.push(`${name}: ${id}는 ${c.owner} 전용`);
    const lim = c.rarity === 'abyss' ? 1 : 2;
    if (n > lim) errors.push(`${name}: ${id} ${n}장 > ${lim}`);
    for (let i = 0; i < n; i++) ids.push(id);
  }
  if (ids.length !== 30) errors.push(`${name}: ${ids.length}장`);
  const avg = ids.reduce((s, id) => s + byId[id].cost, 0) / ids.length;
  const types = {}; for (const id of ids) { const c = byId[id]; const k = c.type === 'attack' ? 'attack_' + c.attack_sub : c.type; types[k] = (types[k] || 0) + 1; }
  const branches = [...new Set(ids.map((id) => byId[id].branch))];
  writeFileSync(join(root, 'decks', `${name}.json`), JSON.stringify({ name, hero: d.hero, archetype: d.archetype, ai_style: { face: d.face || 1 }, cards: ids, avg_cost: +avg.toFixed(2), type_counts: types, branches }, null, 1));
  deckSummary.push({ name, hero: d.hero, avg: +avg.toFixed(2), types, nBranches: branches.length, unique: Object.keys(d.list).length });
}

// ---------- 가치 표 ----------
mkdirSync(join(here, 'out'), { recursive: true });
const rows = cards.map((c) => `| ${c.id} | ${c.owner.replace('h_', '')} | ${c.branch} | ${c.kind} | ${c.cost} | ${c.kind === 'spell' ? '-' : c.attack + '/' + c.health} | ${c.rarity} | ${c.value.score} | ${c.value.budget} | ${c.value.delta >= 0 ? '+' : ''}${c.value.delta} | ${c.cost_band}${c.cost_band_ok ? '' : ' (벗어남)'} |`);
writeFileSync(join(here, 'out', 'card-values.md'), [
  '# 카드 가치 점수표 (자동 생성: build-cards.mjs)', '',
  '기준선 = 2 × 비용 + 1. 편차 = 가치 점수 − 기준선(환산표는 20-balance.md 5절, 코드 value.mjs).', '',
  '| id | 소유 | 갈래 | 종류 | 비용 | 공/체 | 희귀도 | 가치 | 기준선 | 편차 | 비용대 |', '|---|---|---|---|---|---|---|---|---|---|---|', ...rows].join('\n'));
const deltas = cards.map((c) => c.value.delta);
const stat = {
  n: cards.length, mean_delta: +(deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(2),
  within_pm2: cards.filter((c) => Math.abs(c.value.delta) <= 2).length,
  outliers: cards.filter((c) => Math.abs(c.value.delta) > 3).map((c) => `${c.id}:${c.value.delta}`),
  band_out: cards.filter((c) => !c.cost_band_ok).map((c) => `${c.id}(${c.cost_band}→${c.cost})`),
  kinds: cards.reduce((m, c) => ((m[c.kind] = (m[c.kind] || 0) + 1), m), {}),
  rarity: cards.reduce((m, c) => ((m[c.rarity] = (m[c.rarity] || 0) + 1), m), {}),
  decks: deckSummary,
};
writeFileSync(join(here, 'out', 'card-values-summary.json'), JSON.stringify(stat, null, 1));
console.log(JSON.stringify(stat, null, 1));
if (errors.length) { console.error('오류:\n' + errors.join('\n')); process.exit(1); }

// ---------- 입문 영장첩 (round-2): 표준 덱에서 진주 이상을 같은 호명자·공용 모래 카드로 바꾼 30장 ----------
const starterSummary = [];
for (const [name, d] of Object.entries(DECKS)) {
  const ids = []; const cnt = {};
  const push = (id) => { ids.push(id); cnt[id] = (cnt[id] || 0) + 1; };
  const sandPool = cards.filter((c) => c.rarity === 'sand' && (c.owner === d.hero || c.owner === 'neutral'));
  const wants = [];
  for (const [id, n] of Object.entries(d.list)) for (let i = 0; i < n; i++) { if (byId[id].rarity === 'sand' && (cnt[id] || 0) < 2) push(id); else wants.push(byId[id]); }
  for (const w of wants) {
    // 같은 종류·가까운 비용·같은 호명자 우선
    const cand = sandPool.filter((c) => (cnt[c.id] || 0) < 2).sort((a, b) => (Math.abs(a.cost - w.cost) + (a.kind === w.kind ? 0 : 2) + (a.owner === d.hero ? 0 : 0.5)) - (Math.abs(b.cost - w.cost) + (b.kind === w.kind ? 0 : 2) + (b.owner === d.hero ? 0 : 0.5)) || (a.id < b.id ? -1 : 1));
    if (cand.length) push(cand[0].id); else errors.push(`starter ${name}: 대체 카드 없음`);
  }
  const sname = 'starter-' + d.hero.replace('h_', '');
  writeFileSync(join(root, 'decks', `${sname}.json`), JSON.stringify({ name: sname, hero: d.hero, archetype: d.archetype + ' (입문, 모래만)', starter: true, ai_style: { face: d.face || 1 }, cards: ids, avg_cost: +(ids.reduce((s, id) => s + byId[id].cost, 0) / ids.length).toFixed(2) }, null, 1));
  starterSummary.push({ sname, n: ids.length, replaced: wants.length });
}
console.log('starter', JSON.stringify(starterSummary));
if (errors.length) { console.error('오류:\n' + errors.join('\n')); process.exit(1); }
