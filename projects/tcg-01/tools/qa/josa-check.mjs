// 한국어 조사 받침 불일치 검사(용어 일괄 치환 뒤 "필드으로"·"마나을" 같은 오류)
//   node projects/tcg-01/tools/qa/josa-check.mjs [--out <json>] [--terms 필드,마나,...]
// 대상: 빌드 data/strings.json(ko)·cards.json(text/story/flavor ko)·glossary.json, 10-lore.md, lore/cards-lore.json, 30-art.md
// 규칙: 용어 바로 뒤 조사(뒤가 한글이 아니면 조사로 봄). 받침 있음 → 은·이·을·과·으로, 없음(또는 ㄹ + 으로/로) → 는·가·를·와·로.
// 용어 목록 밖 일반 낱말은 "으로/로"만 참고로 셈(동사 어미 "-는" 같은 오탐을 피함).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = join(HERE, '..', '..'), GAME = join(PROJ, '..', '..', 'games', 'tcg-01');
const ai = process.argv.indexOf('--terms');
const TERMS = (ai > 0 ? process.argv[ai + 1] : '필드,마나,체력,덱,소환수,주문,무기,카드 팩,고유 능력,방어,방벽,위장,덫,성장,중독,흡혈,즉사,기습,튕겨내기,마나 빚,효과 지우기,카드,영웅,돌파,경험치,제작,랭크전,덱 고갈,턴 종료,전설,희귀,고급,일반').split(',');
const jong = (ch) => { const c = ch.charCodeAt(0) - 0xac00; return c >= 0 && c < 11172 ? c % 28 : -1; };
const ok = (last, p) => {
  const j = jong(last); if (j < 0) return true;
  const has = j > 0, rieul = j === 8;
  if (p === '으로') return has && !rieul; if (p === '로') return !has || rieul;
  if (['은', '이', '을', '과'].includes(p)) return has; return !has; // 는·가·를·와
};
const P = ['으로', '은', '는', '이', '가', '을', '를', '와', '과', '로'];
const texts = [];
const add = (src, id, t) => { if (t) texts.push({ src, id, t: String(t) }); };
const rj = (p) => JSON.parse(readFileSync(p, 'utf8'));
const S = rj(join(GAME, 'data', 'strings.json'));
for (const [k, v] of Object.entries(S.ko)) add('build:strings', k, v);
for (const c of rj(join(GAME, 'data', 'cards.json')).cards) { add('build:cards', c.id + '.text', c.text_ko); add('build:cards', c.id + '.story', c.story_ko); add('build:cards', c.id + '.flavor', c.flavor_ko); add('build:cards', c.id + '.name', c.name_ko); }
if (existsSync(join(GAME, 'data', 'glossary.json'))) add('build:glossary', 'all', JSON.stringify(rj(join(GAME, 'data', 'glossary.json'))));
readFileSync(join(PROJ, '10-lore.md'), 'utf8').split('\n').forEach((l, i) => add('10-lore.md', 'L' + (i + 1), l));
const CL = rj(join(PROJ, 'lore', 'cards-lore.json'));
for (const c of CL.cards || Object.values(CL)) for (const [k, v] of Object.entries(c)) if (typeof v === 'string' && /[가-힣]/.test(v)) add('cards-lore.json', `${c.id}.${k}`, v);
readFileSync(join(PROJ, '30-art.md'), 'utf8').split('\n').forEach((l, i) => add('30-art.md', 'L' + (i + 1), l));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const termRe = new RegExp(`(${TERMS.sort((a, b) => b.length - a.length).map(esc).join('|')})(${P.join('|')})(?![가-힣])`, 'g');
const genRe = /([가-힣])(으로|로)(?![가-힣])/g;
const bad = [], general = [];
const seen = new Set();
for (const { src, id, t } of texts) {
  for (const m of t.matchAll(termRe)) { const term = m[1], p = m[2]; if (!ok(term[term.length - 1], p)) { const key = `${src}|${id}|${m.index}`; if (!seen.has(key)) { seen.add(key); bad.push({ src, id, hit: term + p, ctx: t.slice(Math.max(0, m.index - 12), m.index + term.length + p.length + 12) }); } } }
  for (const m of t.matchAll(genRe)) { if (!ok(m[1], m[2])) general.push({ src, id, hit: m[1] + m[2], ctx: t.slice(Math.max(0, m.index - 10), m.index + 14) }); }
}
const by = {}; for (const b of bad) by[b.src] = (by[b.src] || 0) + 1;
const out = { terms: TERMS, texts: texts.length, term_mismatch: bad.length, by_source: by, items: bad, general_ro_mismatch: general.length, general_items: general.slice(0, 80) };
const o = process.argv.indexOf('--out'); if (o > 0) writeFileSync(process.argv[o + 1], JSON.stringify(out, null, 1));
console.log(JSON.stringify({ texts: texts.length, term_mismatch: bad.length, by_source: by, general_ro_mismatch: general.length }));
for (const b of bad.slice(0, 30)) console.log(`  ${b.src} ${b.id}: "${b.hit}" … ${b.ctx}`);
for (const g of general.slice(0, 15)) console.log(`  (일반) ${g.src} ${g.id}: "${g.hit}" … ${g.ctx}`);
