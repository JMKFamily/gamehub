// 데이터 읽기: data/*.json(sync-engine.mjs가 기획 원본에서 만든 묶음). 수치·글·색을 코드에 박지 않는다.
export const D = { cards: {}, list: [], tokens: {}, balance: null, art: null, decks: [], strings: null, portraits: {}, urls: {} };

async function j(p) { const r = await fetch(p); if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); }

export async function loadData() {
  const [cards, balance, art, decks, strings, starters, portraits, uxIcons, glossary, storyOrder, worldmap] = await Promise.all([
    j('data/cards.json'), j('data/balance.json'), j('data/art.json'), j('data/decks.json'), j('data/strings.json'), j('data/starters.json'), j('data/portraits.json'), j('data/ux-icons.json'), j('data/glossary.json'), j('data/story-order.json'), j('data/worldmap.json'),
  ]);
  for (const c of cards.cards) D.cards[c.id] = c;
  D.engineKw = cards.engine_kw;
  D.list = cards.cards;
  for (const t of cards.tokens) D.tokens[t.id] = t;
  D.balance = balance; D.art = art; D.decks = decks; D.starters = starters; D.portraits = portraits;
  D.strings = strings; D.uxIcons = uxIcons; D.glossary = glossary; D.story = storyOrder; D.worldmap = worldmap;
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
// SVG 그림을 한 번 비트맵(PNG)으로 구워 둠(QA terms 1): 크기가 바뀌는 연출(들기·내기·확대)마다 SVG를 다시 그리던 비용 제거
D.png = {};
function bake(key, svgUrl, w, h) {
  return new Promise((ok) => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => { try { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h); c.toBlob((b) => { if (b) D.png[key] = URL.createObjectURL(b); ok(); }, 'image/png'); } catch { ok(); } };
    im.onerror = () => ok();
    im.src = svgUrl;
  });
}
const BAKE = { portrait: [360, 270], badge: [128, 128] };
export async function bakeImages(ids, budgetMs = 6) {
  for (const id of ids) {
    const isB = id.startsWith('b:');
    if (D.png[id]) continue;
    const src = isB ? badgeURL(...id.slice(2).split('|')) : portraitURL(id);
    if (!src.startsWith('blob:')) continue;
    const [w, h] = isB ? BAKE.badge : BAKE.portrait;
    await bake(id, src, w, h);
    await new Promise((r) => setTimeout(r, 0));
  }
  void budgetMs;
}
// 대전에서 크기가 바뀌며 움직이는 정적 SVG(키워드·준비 표시·영웅 초상·덱·카드 뒷면)도 PNG로 구움
const ASSET_PX = { hero: [200, 240], 'card-back': [250, 350] };
export async function bakeAssets() {
  const names = [...D.art.palette.keywords.map((k) => 'kw-' + k.id + '.svg'), 'icon-ready.svg', 'icon-asleep.svg', 'icon-deck.svg', 'card-back.svg', 'icon-log.svg', 'icon-story.svg', ...D.heroIds.map((h) => 'hero-' + h.slice(2) + '.svg'), ...Object.keys(D.art.ux.families).map((f) => 'type-' + f + '.svg'), 'kind-minion.svg', 'kind-spell.svg', 'kind-weapon.svg'];
  for (const n of names) {
    const key = 'a:' + n; if (D.png[key]) continue;
    const sz = n.startsWith('hero-') ? ASSET_PX.hero : n === 'card-back.svg' ? ASSET_PX['card-back'] : [96, 96];
    await bake(key, 'assets/' + n, sz[0], sz[1]);
    await new Promise((r) => setTimeout(r, 0));
  }
}
// 대전에 나올 카드(양쪽 덱·토큰)·표지·아이콘만 쉬는 시간에 한 장씩 굽기(requestIdleCallback, 남은 시간 > 8 ms일 때만)
let bakeQ = [], baking = false;
export function bakeForBattle(cids, front) {
  const want = [...BATTLE_ASSETS().map((n) => 'a:' + n), ...cids, ...cids.map((id) => { const c = D.cards[id] || D.tokens[id]; return c && c.family ? 'b:' + c.family + '|' + c.branch : null; }).filter(Boolean)];
  const add = want.filter((k) => !D.png[k]);
  bakeQ = front ? [...add, ...bakeQ.filter((k) => !add.includes(k))] : [...bakeQ, ...add.filter((k) => !bakeQ.includes(k))];
  if (!baking) idleBake();
}
function idleBake() {
  baking = bakeQ.length > 0;
  if (!baking) return;
  const ric = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 10 }), 30));
  ric(async (dl) => {
    if (dl.timeRemaining() > 8) {
      const k = bakeQ.shift();
      if (k.startsWith('a:')) { const n = k.slice(2), sz = n.startsWith('hero-') ? ASSET_PX.hero : n === 'card-back.svg' ? ASSET_PX['card-back'] : n.startsWith('crate-') ? [128, 128] : [64, 64]; await bake(k, 'assets/' + n, sz[0], sz[1]); }
      else if (k.startsWith('b:')) { const [f, br] = k.slice(2).split('|'); await bake(k, badgeURL(f, br), BAKE.badge[0], BAKE.badge[1]); }
      else { const u = portraitURL(k); if (u.startsWith('blob:')) await bake(k, u, BAKE.portrait[0], BAKE.portrait[1]); }
    }
    idleBake();
  }, { timeout: 1000 });
}
const BATTLE_ASSETS = () => [...D.art.palette.keywords.map((k) => 'kw-' + k.id + '.svg'), 'icon-ready.svg', 'icon-asleep.svg', 'icon-deck.svg', 'card-back.svg', 'icon-log.svg', 'candle-lit.svg', 'candle-spent.svg', 'candle-spare.svg', 'candle-soot.svg', 'candle-empty.svg', ...D.heroIds.map((h) => 'hero-' + h.slice(2) + '.svg')];
export function bakeMenuAssets() {
  const names = ['currency-salt.svg', 'currency-ink.svg', 'currency-pearl.svg', 'crate-bare-sea.svg', ...D.heroIds.map((h) => 'crate-' + h.slice(2) + '.svg'), ...Object.keys(D.art.ux.families).map((f) => 'type-' + f + '.svg'), 'kind-minion.svg', 'kind-spell.svg', 'kind-weapon.svg', 'icon-story.svg'];
  const add = names.map((n) => 'a:' + n).filter((k) => !D.png[k] && !bakeQ.includes(k));
  bakeQ = [...add, ...bakeQ];
  if (!baking) idleBake();
}
export const assetURL = (n) => D.png['a:' + n] || 'assets/' + n;
export const imgURL = (id) => D.png[id] || portraitURL(id);
export const badgeImgURL = (fid, branch) => D.png['b:' + fid + '|' + (branch || '')] || badgeURL(fid, branch);
export function portraitURL(id) {
  if (D.urls[id]) return D.urls[id];
  const s = D.portraits[id];
  if (!s) return (D.urls[id] = 'assets/icon-spare-wick.svg');
  D.urls[id] = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' }));
  return D.urls[id];
}
export function warmPortraits(ids) { for (const id of ids) portraitURL(id); }
// 부팅 뒤 쉬는 시간에 초상 blob을 조금씩 미리 만든다(첫 메뉴 진입 멈춤 방지, round-2 D1)
export function warmAllIdle() {
  const ids = Object.keys(D.portraits).filter((id) => !D.urls[id]);
  let i = 0;
  const step = (dl) => {
    const until = performance.now() + 4;
    while (i < ids.length && (dl ? dl.timeRemaining() > 1 : performance.now() < until)) portraitURL(ids[i++]);
    if (i < ids.length) (window.requestIdleCallback ? requestIdleCallback(step, { timeout: 200 }) : setTimeout(step, 16));
    // (굽기는 bakeForBattle이 대전 직전에 쉬는 시간 한 장씩)
  };
  setTimeout(step, 50);
}

// 유형 표지·이름 띠 무늬(art assets.mjs가 만든 SVG) → blob URL / data URL
export function badgeURL(fid, branch) {
  const k = fid + '|' + (branch || ''), key = 'b:' + k;
  if (D.urls[key]) return D.urls[key];
  const s = D.uxIcons.badge[k] || D.uxIcons.badge[fid + '|'];
  return (D.urls[key] = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' })));
}
export function patternCSS(fid) { const s = D.uxIcons.pattern[fid]; return s ? `url("data:image/svg+xml;utf8,${encodeURIComponent(s)}")` : 'none'; }
export const familyOf = (c) => c.family || (c.spare ? 'draw' : 'buff');
export const heroShort = (h) => h.replace(/^h_/, '');
export const fac = (owner) => D.art.palette.factions[owner] || D.art.palette.factions.neutral;

function applyPalette(P) {
  const r = document.documentElement.style;
  for (const [k, v] of Object.entries(P.ui)) r.setProperty('--' + k, v);
  for (const [k, v] of Object.entries(P.state)) r.setProperty('--' + k, v);
  r.setProperty('--abyss_glow', P.rarity.abyss.glow);
}
