// tcg-01 엔진·데이터 동기화 (game-developer 1-3)
//   node projects/tcg-01/tools/sync-engine.mjs           엔진 복사 + 해시 기록 + 빌드 데이터 묶음 생성
//   node projects/tcg-01/tools/sync-engine.mjs --check   복사본 해시가 시뮬레이터 원본과 같은지만 확인(쓰지 않음, 다르면 exit 1)
// 규칙 엔진(tools/sim/engine.mjs·ai.mjs·value.mjs·sim.mjs)은 한 글자도 고치지 않고 games/tcg-01/js/engine/에 복사한다
// (criteria "빌드 엔진 = 시뮬레이터 엔진"). 엔진 동작을 바꿔야 하면 DEV_NOTES에 적고 balance에 요청한다.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = join(HERE, '..');
const REPO = join(PROJ, '..', '..');
const GAME = join(REPO, 'games', 'tcg-01');
const SIM = join(PROJ, 'tools', 'sim');
const ENG_OUT = join(GAME, 'js', 'engine');
const DATA_OUT = join(GAME, 'data');
const ENGINE_FILES = ['engine.mjs', 'ai.mjs', 'value.mjs', 'sim.mjs'];
const CHECK = process.argv.includes('--check');

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const readJ = (p) => JSON.parse(readFileSync(p, 'utf8'));

// ---------- 1) 엔진 복사·해시 ----------
let bad = 0;
const lines = [];
if (!CHECK) mkdirSync(ENG_OUT, { recursive: true });
for (const f of ENGINE_FILES) {
  const src = join(SIM, f), dst = join(ENG_OUT, f);
  if (!CHECK) copyFileSync(src, dst);
  const a = sha(src), b = existsSync(dst) ? sha(dst) : '(없음)';
  if (a !== b) { bad++; console.log(`불일치 ${f}: sim ${a.slice(0, 12)} / build ${String(b).slice(0, 12)}`); }
  lines.push(`${b}  ${f}`);
}
const engVer = (readFileSync(join(SIM, 'engine.mjs'), 'utf8').match(/ENGINE_VERSION = '([^']+)'/) || [])[1];
if (CHECK) {
  const rec = existsSync(join(ENG_OUT, 'ENGINE_HASH.txt')) ? readFileSync(join(ENG_OUT, 'ENGINE_HASH.txt'), 'utf8') : '';
  for (const f of ENGINE_FILES) if (!rec.includes(`${sha(join(SIM, f))}  ${f}`)) { bad++; console.log(`ENGINE_HASH.txt에 ${f} 원본 해시 없음`); }
  console.log(bad ? `엔진 해시 불일치 ${bad}건` : `엔진 해시 일치: ${ENGINE_FILES.length}개 파일 (engine ${engVer})`);
  process.exit(bad ? 1 : 0);
}
writeFileSync(join(ENG_OUT, 'ENGINE_HASH.txt'),
  `# SHA-256 (tools/sim 원본 = 이 폴더 복사본). 생성: projects/tcg-01/tools/sync-engine.mjs, ENGINE_VERSION ${engVer}\n${lines.join('\n')}\n`);
console.log(bad ? `엔진 복사 후 불일치 ${bad}건` : `엔진 복사·해시 일치 (${ENGINE_FILES.join(', ')}, engine ${engVer})`);

// ---------- 2) 빌드 데이터 묶음 ----------
mkdirSync(DATA_OUT, { recursive: true });
const cardsJ = readJ(join(PROJ, 'cards.json'));
const loreCards = readJ(join(PROJ, 'lore', 'cards-lore.json'));
const balance = readJ(join(PROJ, 'balance.json'));
const art = readJ(join(PROJ, 'art.json'));
const loreMd = readFileSync(join(PROJ, '10-lore.md'), 'utf8');
const A = await import(pathToFileURL(join(PROJ, 'tools', 'art', 'assets.mjs')).href);
const S = await import(pathToFileURL(join(PROJ, 'tools', 'art', 'spec.mjs')).href);
const PG = await import(pathToFileURL(join(PROJ, 'tools', 'art', 'portrait-gen.mjs')).href);

// 2-1) 글: 10-lore 8절 키 표 + 4절 대사 + 5-3 혈통. 문서 표를 그대로 읽는다(빌드 글 하드코딩 금지).
const sec = (from, to) => { const i = loreMd.indexOf(from); const j = loreMd.indexOf(to, i + 1); return loreMd.slice(i, j < 0 ? undefined : j); };
const strings = { ko: {}, en: {} };
let nKeys = 0;
// 표 모양별로 칸을 고름: 키|ko|en (3칸), 키|조건|요소|ko|en (메뉴 안내 5칸), 순서|키|조건|요소|ko|en (튜토리얼 6칸),
// 용어 사전 id|용어 ko|용어 en|설명 ko|설명 en|아이콘|흔히 부르는 말 (7칸)
const glossary = [];
let inGloss = false;
for (const ln of sec('## 8. UI 텍스트', '## 9.').split('\n')) {
  if (ln.startsWith('### ')) inGloss = ln.startsWith('### 8-13');
  if (!ln.startsWith('|')) continue;
  const c = ln.split('|').slice(1, -1).map((x) => x.trim());
  const key = (s) => (s.match(/^`([a-z0-9_]+)`$/) || [])[1];
  let k, ko, en;
  if (inGloss && c.length === 7 && key(c[0])) {
    const id = key(c[0]);
    strings.ko[`gloss_${id}`] = c[1]; strings.en[`gloss_${id}`] = c[2];
    strings.ko[`gloss_${id}_desc`] = c[3]; strings.en[`gloss_${id}_desc`] = c[4];
    glossary.push({ id, icon: c[5], common_ko: c[6] }); nKeys += 2; continue;
  }
  if (c.length === 3 && key(c[0])) [k, ko, en] = [key(c[0]), c[1], c[2]];
  else if (c.length === 5 && key(c[0])) [k, ko, en] = [key(c[0]), c[3], c[4]];
  else if (c.length === 6 && /^\d+$/.test(c[0]) && key(c[1])) [k, ko, en] = [key(c[1]), c[4], c[5]];
  else if (c.length === 4 && key(c[0])) [k, ko, en] = [key(c[0]), c[1], c[2]];
  if (!k) continue;
  strings.ko[k] = ko; strings.en[k] = en; nKeys++;
}
const ROLE = { 등장: 'entry', 승리: 'win', 패배: 'lose', 위협: 'threat', 감사: 'thanks', 경의: 'respect', '심지 부족': 'no_wicks', '마나 부족': 'no_wicks', 위기: 'crisis' };
const heroSecs = loreMd.split(/\n### 4-\d\. /).slice(1, 7);
let nLines = 0;
for (const s of heroSecs) {
  const id = (s.match(/`(h_[a-z]+)`/) || [])[1];
  if (!id) continue;
  for (const ln of s.split('\n')) {
    const m = ln.match(/^\|\s*(등장|승리|패배|위협|감사|경의|심지 부족|마나 부족|위기)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|/);
    if (!m) continue;
    const k = `line_${id.slice(2)}_${ROLE[m[1]]}`;
    strings.ko[k] = m[2]; strings.en[k] = m[3]; nLines++;
  }
}
// 4-8 맞대결 첫 대사(line_<a>_vs_<b>, 상대가 정해진 짝일 때 등장 대사 대신)
for (const ln of loreMd.split('\n')) { const m = ln.match(/\|\s*`(line_[a-z]+_vs_[a-z]+)`\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|/); if (m) { strings.ko[m[1]] = m[2]; strings.en[m[1]] = m[3]; nLines++; } }
const LIN_ID = Object.fromEntries(Object.entries(A.LINEAGE_KO).map(([id, ko]) => [ko, id]));
for (const ln of sec('### 5-3.', '### 5-4.').split('\n')) {
  const m = ln.match(/^\|\s*([^|/]+?)\s*\/\s*([A-Za-z]+)\s*\|/);
  const lid = m && (LIN_ID[m[1]] || (Object.keys(A.LINEAGE_KO).includes(m[2].toLowerCase()) ? m[2].toLowerCase() : null)); // 영문 이름 = 부류 id로도 맞춤(art 표 값이 달라도)
  if (lid) { strings.ko[`lineage_${lid}`] = m[1]; strings.en[`lineage_${lid}`] = m[2]; }
}
for (const k of art.palette.keywords) { strings.ko[`kwname_${k.id}`] = k.ko; strings.en[`kwname_${k.id}`] = k.en; }
// 키워드 표시 이름의 원본은 10-lore 6절 표(번호 순서 = art palette.keywords 순서). art 값과 다르면 lore가 이김(예: 그을음 복귀)
for (const ln of sec('## 6. 키워드', '### 6-1').split('\n')) {
  const m = ln.match(/^\|\s*(\d+)\s*\|[^|]*\|\s*\*\*(.+?)\s*\/\s*(.+?)\*\*/);
  const k = m && art.palette.keywords[+m[1] - 1];
  const nn = (x) => x.trim().replace(/\s*\+?N$/, ''); // "그을음 N" → "그을음"
  if (k) { strings.ko[`kwname_${k.id}`] = nn(m[2]); strings.en[`kwname_${k.id}`] = nn(m[3]); }
}
// round-2: 개발 임시 키(strings-extra.json)는 10-lore 8-11로 확정되어 없앰. 남아 있으면 지움.
if (existsSync(join(DATA_OUT, 'strings-extra.json'))) rmSync(join(DATA_OUT, 'strings-extra.json'));
writeFileSync(join(DATA_OUT, 'strings.json'), JSON.stringify(strings));
writeFileSync(join(DATA_OUT, 'glossary.json'), JSON.stringify(glossary));
// 5-5 카드 스토리 줄기: 세력 이름(ko/en)과 카드 읽는 순서 → data/story-order.json
const story = { factions: {}, order: {} };
for (const ln of sec('### 5-5.', '\n## 6.').split('\n')) {
  const m = ln.match(/^\|\s*(.+?)\s*\/\s*(.+?)\s*\(`(h_[a-z]+|neutral)`\)\s*\|\s*(.+?)\s*\/\s*(.+?)\s*\|/);
  if (m) story.factions[m[3]] = { ko: m[1], en: m[2], title_ko: m[4], title_en: m[5] };
  const o = ln.match(/^-\s*`(h_[a-z]+|neutral)`:\s*(.+)$/);
  if (o) story.order[o[1]] = o[2].split('→').map((x) => x.trim()).filter(Boolean);
}
writeFileSync(join(DATA_OUT, 'story-order.json'), JSON.stringify(story)); // 10-lore 8-13 순서·아이콘 후보·흔히 부르는 말

// 2-2) 카드: 엔진 수치(cards.json) + 이름·글(cards-lore.json) + 화면 키워드(ENGINE_KW 대응표, 엔진 id는 화면에 쓰지 않음)
const loreById = Object.fromEntries(loreCards.map((l) => [l.id, l]));
const cards = cardsJ.cards.map((c) => {
  const l = loreById[c.id] || {};
  const merged = { ...c, name_ko: l.name_ko, name_en: l.name_en, flavor_ko: l.flavor_ko, flavor_en: l.flavor_en, concept_ko: l.concept_ko, visual_hint: l.visual_hint };
  const out = { ...c, name_ko: l.name_ko, name_en: l.name_en, flavor_ko: l.flavor_ko, flavor_en: l.flavor_en, text_ko: l.concept_ko, text_en: l.concept_en || null, story_ko: l.story_ko || null, story_en: l.story_en || null, kw_ui: A.cardKeywords(merged), family: S.familyOf(c) };
  delete out.value; delete out.lore_ref; delete out.cost_band_ok;
  return out;
});
const tokens = cardsJ.tokens.map((t) => ({ ...t, owner: t.owner || 'neutral', rarity: 'sand', name_ko: (t.note || t.id).split(/\s+\d/)[0], kw_ui: (t.keywords || []).map((k) => A.ENGINE_KW[k]).filter(Boolean) }));
writeFileSync(join(DATA_OUT, 'cards.json'), JSON.stringify({ version: cardsJ.version, engine_kw: A.ENGINE_KW, cards, tokens }));

// 2-2b) 유형 표지(유형 모양 + 갈래 도형)·이름 띠 무늬: art assets.mjs 함수로 만든 SVG(30-art 11절)
const ux = { badge: {}, pattern: {} };
for (const c of cards) { const k = c.family + '|' + c.branch; if (!ux.badge[k]) ux.badge[k] = A.familyBadgeSVG(c.family, c.branch, 48); }
for (const fid of Object.keys(art.ux.families)) { ux.badge[fid + '|'] = A.familyBadgeSVG(fid, null, 48); ux.pattern[fid] = A.familyPattern(fid, 'p').replace(/^<pattern[^>]*>/, '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12">').replace(/<\/pattern>$/, '</svg>'); }
writeFileSync(join(DATA_OUT, 'ux-icons.json'), JSON.stringify(ux));

// 2-3) 초상: portrait-gen으로 한 번 만들어 묶음(빌드에서 blob URL로 캐시)
const portraits = {};
let pBytes = 0;
for (const c of cards) { const l = loreById[c.id] || {}; const s = PG.portraitSVG({ ...c, ...l, rarity: c.rarity }, { title: false }); portraits[c.id] = s; pBytes += s.length; }
for (const t of cardsJ.tokens) portraits[t.id] = PG.portraitSVG({ id: t.id, owner: t.owner || 'neutral', rarity: 'sand', kind: 'minion', visual_hint: `회색; ${t.note || ''}` }, { title: false });
writeFileSync(join(DATA_OUT, 'portraits.json'), JSON.stringify(portraits));

// 2-4) 규칙·연출·덱
writeFileSync(join(DATA_OUT, 'balance.json'), JSON.stringify(balance));
writeFileSync(join(DATA_OUT, 'art.json'), JSON.stringify(art));
const deckFiles = readdirSync(join(PROJ, 'decks')).filter((f) => f.endsWith('.json'));
const decks = deckFiles.filter((f) => !f.startsWith('starter-')).map((f) => ({ ...readJ(join(PROJ, 'decks', f)), file: f.replace(/\.json$/, '') }));
const starters = deckFiles.filter((f) => f.startsWith('starter-')).map((f) => readJ(join(PROJ, 'decks', f)));
writeFileSync(join(DATA_OUT, 'decks.json'), JSON.stringify(decks));
writeFileSync(join(DATA_OUT, 'starters.json'), JSON.stringify(starters)); // 입문 영장첩(첫 수집, balance)

// 2-5) 그림 파일(목업 제외)
const AS_OUT = join(GAME, 'assets');
mkdirSync(AS_OUT, { recursive: true });
let nAs = 0;
for (const f of readdirSync(join(PROJ, 'assets'))) {
  if (!f.endsWith('.svg') || f.startsWith('mockup-')) continue;
  copyFileSync(join(PROJ, 'assets', f), join(AS_OUT, f)); nAs++;
}
copyFileSync(join(PROJ, 'assets', 'app-icon.svg'), join(GAME, 'icon.svg'));
// 월드맵(lore worldmap.json + art ux2.mjs 지도 그림 900×1100, 노드 상태는 빌드가 저장값으로 DOM에 그림)
{
  const wm = readJ(join(PROJ, 'lore', 'worldmap.json'));
  writeFileSync(join(DATA_OUT, 'worldmap.json'), JSON.stringify(wm));
  const U2 = await import(pathToFileURL(join(PROJ, 'tools', 'art', 'ux2.mjs')).href);
  if (U2.worldmapSVG) writeFileSync(join(GAME, 'assets', 'worldmap-bg.svg'), U2.worldmapSVG(wm, 360, 640, true));
}
// BGM 합성기(art, 의존성 없는 ES 모듈)를 그대로 복사(30-art 6-2)
if (existsSync(join(PROJ, 'tools', 'art', 'music-synth.mjs'))) copyFileSync(join(PROJ, 'tools', 'art', 'music-synth.mjs'), join(GAME, 'js', 'music-synth.mjs'));

// 2-6) 카드 글(concept_ko) 숫자와 엔진 수치 대조(참고 지표: 글은 lore 원문, 수치는 balance 최종)
let numMismatch = 0;
const mism = [];
for (const c of cards) {
  const t = c.text_ko || '';
  const nums = new Set((t.match(/\d+/g) || []).map(Number));
  const eff = new Set();
  for (const e of [...(c.effects || []), ...(c.secret || [])]) for (const k of ['n', 'atk', 'hp', 'count', 'times']) if (typeof e[k] === 'number') eff.add(Math.abs(e[k]));
  const all = /모두|전부/.test(t); // n ≥ 99 = "모두"(엔진의 큰 수 표기)
  const miss = [...eff].filter((v) => v > 1 && !nums.has(v) && !(v >= 99 && all));
  if (miss.length) { numMismatch++; mism.push(`${c.id}(${miss.join('/')})`); }
}
console.log(`데이터: 글 키 ${nKeys} + 대사 ${nLines} 카드 ${cards.length}, 토큰 ${tokens.length}, 초상 ${(pBytes / 1024).toFixed(0)} KB, 그림 ${nAs}, 덱 ${decks.length}, 입문 덱 ${starters.length}, 영어 글 ${cards.filter((c) => c.text_en).length}`);
console.log(`카드 글 숫자 ≠ 엔진 수치(2 이상 값) ${numMismatch}장: ${mism.slice(0, 30).join(' ')}${mism.length > 30 ? ' …' : ''}`);
writeFileSync(join(DATA_OUT, 'text-check.json'), JSON.stringify({ mismatch: mism }, null, 0));
if (bad) process.exit(1);
