// 데이터 읽기: data/*.json(sync-engine.mjs가 기획 원본에서 만든 묶음). 수치·글·색을 코드에 박지 않는다.
export const D = { cards: {}, list: [], tokens: {}, balance: null, art: null, decks: [], strings: null, portraits: {}, urls: {} };

async function j(p) { const r = await fetch(p); if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); }

export async function loadData() {
  const [cards, balance, art, decks, strings, extra, portraits] = await Promise.all([
    j('data/cards.json'), j('data/balance.json'), j('data/art.json'), j('data/decks.json'), j('data/strings.json'), j('data/strings-extra.json'), j('data/portraits.json'),
  ]);
  for (const c of cards.cards) D.cards[c.id] = c;
  D.engineKw = cards.engine_kw;
  D.list = cards.cards;
  for (const t of cards.tokens) D.tokens[t.id] = t;
  D.balance = balance; D.art = art; D.decks = decks; D.portraits = portraits;
  D.strings = { ko: { ...extra.ko, ...strings.ko }, en: { ...extra.en, ...strings.en } };
  D.heroIds = decks.map((d) => d.hero);
  applyPalette(art.palette);
}

// 엔진용 카드 사전(엔진 id 그대로)
export function engineData() {
  return { cards: D.cards, tokens: D.tokens, rules: D.balance.rules, heroes: D.balance.heroes };
}

export function cardById(id) {
  if (id === D.balance.rules.second_bonus_card.id) return { ...D.balance.rules.second_bonus_card, owner: 'neutral', rarity: 'sand', spare: true, kw_ui: [] };
  return D.cards[id] || D.tokens[id] || null;
}

// 초상: 생성 SVG → blob URL 캐시(30-art 5-8)
export function portraitURL(id) {
  if (D.urls[id]) return D.urls[id];
  const s = D.portraits[id];
  if (!s) return (D.urls[id] = 'assets/icon-spare-wick.svg');
  D.urls[id] = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' }));
  return D.urls[id];
}
export function warmPortraits(ids) { for (const id of ids) portraitURL(id); }

export const heroShort = (h) => h.replace(/^h_/, '');
export const fac = (owner) => D.art.palette.factions[owner] || D.art.palette.factions.neutral;

function applyPalette(P) {
  const r = document.documentElement.style;
  for (const [k, v] of Object.entries(P.ui)) r.setProperty('--' + k, v);
  for (const [k, v] of Object.entries(P.state)) r.setProperty('--' + k, v);
  r.setProperty('--abyss_glow', P.rarity.abyss.glow);
}
