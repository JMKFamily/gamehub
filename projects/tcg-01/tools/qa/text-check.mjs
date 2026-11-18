// 빌드 글 검사(QA, 빌드 data/ 기준 — lore 원본이 아니라 실제로 화면에 가는 값): 옛 기능 용어·금지어·스토리 키 누락
//   node projects/tcg-01/tools/qa/text-check.mjs [--out <json>]
// 단어 목록은 lore 검사기(check-cards.mjs)의 BANNED_*·OLD_*·STORY_KEY를 소스에서 읽어 같은 목록을 쓴다(목록 정의만 공유, 검사 코드는 따로).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = join(HERE, '..', '..'), GAME = join(PROJ, '..', '..', 'games', 'tcg-01');
const src = readFileSync(join(PROJ, 'lore', 'check-cards.mjs'), 'utf8');
const arr = (name) => JSON.parse(src.match(new RegExp(`const ${name} = (\\[[^\\]]*\\]);`))[1].replace(/'/g, '"'));
const BANNED_KO = arr('BANNED_KO'), BANNED_EN = arr('BANNED_EN'), OLD_KO = arr('OLD_KO'), OLD_EN = arr('OLD_EN');
const STORY_KEY = /^(game_title|game_subtitle|chronicle_title|faction_|story_arc_|hero_[a-z]+_(name|title|power)|line_|result_(victory|defeat)_sub_)/;
const PROTECT = ['썰물 영장', '썰물 연대기', 'Ebbwrit', 'Ebb Chronicle', '노해의 호명자들', 'Callers of the Bare Sea'];
const strip = (t) => PROTECT.reduce((a, w) => a.split(w).join(''), String(t || ''));
const oldIn = (ko, en) => [...OLD_KO.filter((w) => strip(ko).includes(w)), ...OLD_EN.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(strip(en)))];
const banIn = (ko, en) => [...BANNED_KO.filter((w) => strip(ko).includes(w)), ...BANNED_EN.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(strip(en)))];
const rj = (p) => JSON.parse(readFileSync(p, 'utf8'));
const S = rj(join(GAME, 'data', 'strings.json')), C = rj(join(GAME, 'data', 'cards.json'));
let G = null; try { G = rj(join(GAME, 'data', 'glossary.json')); } catch {}
const out = { lists: { BANNED_KO: BANNED_KO.length, BANNED_EN: BANNED_EN.length, OLD_KO: OLD_KO.length, OLD_EN: OLD_EN.length }, ui_old: [], ui_banned: [], card_old: [], card_banned: [], story_banned: [], story_missing: [], story_len: [], glossary_banned: [] };
const keys = new Set([...Object.keys(S.ko), ...Object.keys(S.en)]);
out.ui_keys = keys.size;
for (const k of keys) {
  const ko = S.ko[k] || '', en = S.en[k] || '';
  const b = banIn(ko, en); if (b.length) out.ui_banned.push(`${k}: ${b.join('·')}`);
  if (!STORY_KEY.test(k)) { const o = oldIn(ko, en); if (o.length) out.ui_old.push(`${k}: ${o.join('·')}`); }
}
for (const c of C.cards) {
  const o = oldIn(c.text_ko, c.text_en); if (o.length) out.card_old.push(`${c.id}: ${o.join('·')}`);
  const b = banIn(`${c.name_ko} ${c.flavor_ko} ${c.text_ko}`, `${c.name_en} ${c.flavor_en} ${c.text_en}`); if (b.length) out.card_banned.push(`${c.id}: ${b.join('·')}`);
  if (!c.story_ko || !c.story_en) out.story_missing.push(c.id);
  else {
    const sb = banIn(c.story_ko, c.story_en); if (sb.length) out.story_banned.push(`${c.id}: ${sb.join('·')}`);
    const n = [...c.story_ko].length; if (n < 80 || n > 160 || c.story_en.length > 320) out.story_len.push(`${c.id}: ko ${n} en ${c.story_en.length}`);
  }
}
if (G) { const txt = JSON.stringify(G); for (const w of BANNED_KO.slice(0, 26)) if (txt.includes(w)) out.glossary_banned.push(w); }
out.cards = C.cards.length;
out.summary = { ui_old: out.ui_old.length, ui_banned: out.ui_banned.length, card_old: out.card_old.length, card_banned: out.card_banned.length, story_missing: out.story_missing.length, story_banned: out.story_banned.length, story_len_out: out.story_len.length, glossary_banned: out.glossary_banned.length };
const o = process.argv.indexOf('--out'); if (o > 0) writeFileSync(process.argv[o + 1], JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.summary), out.ui_old.slice(0, 10), out.card_old.slice(0, 5), out.ui_banned.slice(0, 5), out.card_banned.slice(0, 5));
