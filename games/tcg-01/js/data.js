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
// 굽기 크기는 원래 비율대로(촛불 20×48 → 50×120: 정사각으로 구우면 contain에서 작게 보임 — art r2 major 원인)
const pxOf = (n, d) => (n.startsWith('hero-') ? ASSET_PX.hero : n === 'card-back.svg' ? ASSET_PX['card-back'] : n.startsWith('candle-') ? [50, 120] : n === 'worldmap-bg.svg' ? [900, 1100] : n.startsWith('crate-') ? [128, 128] : d);
export async function bakeAssets() {
  const names = [...D.art.palette.keywords.map((k) => 'kw-' + k.id + '.svg'), 'icon-ready.svg', 'icon-asleep.svg', 'icon-deck.svg', 'card-back.svg', 'icon-log.svg', 'icon-story.svg', ...D.heroIds.map((h) => 'hero-' + h.slice(2) + '.svg'), ...Object.keys(D.art.ux.families).map((f) => 'type-' + f + '.svg'), 'kind-minion.svg', 'kind-spell.svg', 'kind-weapon.svg'];
  for (const n of names) {
    const key = 'a:' + n; if (D.png[key]) continue;
    const sz = pxOf(n, [96, 96]);
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
      if (k.startsWith('a:')) { const n = k.slice(2), sz = pxOf(n, [64, 64]); await bake(k, 'assets/' + n, sz[0], sz[1]); }
      else if (k.startsWith('b:')) { const [f, br] = k.slice(2).split('|'); await bake(k, badgeURL(f, br), BAKE.badge[0], BAKE.badge[1]); }
      else { const u = portraitURL(k); if (u.startsWith('blob:')) await bake(k, u, BAKE.portrait[0], BAKE.portrait[1]); }
    }
    idleBake();
  }, { timeout: 1000 });
}
const BATTLE_ASSETS = () => [...D.art.palette.keywords.map((k) => 'kw-' + k.id + '.svg'), 'icon-ready.svg', 'icon-asleep.svg', 'icon-deck.svg', 'card-back.svg', 'icon-log.svg', 'candle-lit.svg', 'candle-spent.svg', 'candle-spare.svg', 'candle-soot.svg', 'candle-empty.svg', ...D.heroIds.map((h) => 'hero-' + h.slice(2) + '.svg')];
// 버튼·판 재질 무늬를 PNG 한 장으로(요소 크기마다 SVG를 다시 래스터하지 않게)
export function bakeMaterial() {
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='48' preserveAspectRatio='none'><path d='M4 34Q48 30 116 36M4 41Q72 37 116 42' fill='none' stroke='#000' stroke-opacity='.12' stroke-width='1.5'/><path d='M2 3q10 -3 20 0t20 0t20 0t20 0t20 0t20 0' fill='none' stroke='#F2EEE4' stroke-opacity='.3' stroke-width='2'/></svg>";
  return bake('mat', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace("width='120' height='48'", "width='240' height='96' viewBox='0 0 120 48'")), 240, 96).then(() => { if (D.png.mat) document.documentElement.style.setProperty('--mat', `url(${D.png.mat})`); });
}
// 로비 첫 화면 그림을 로딩 중에 PNG로(r3 성능: SVG 그림은 처음 그릴 때 메인 스레드에서 래스터되어 첫 탭 직후 프레임들이 길어짐)
export function bakeSVG(key, svg, w, h) { return D.png[key] ? Promise.resolve() : bake(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), w, h); }
export async function bakeLobbyAssets(heroes, extra = []) {
  const names = [...new Set([...heroes.map((h) => 'hero-' + h.slice(2) + '.svg'), 'currency-salt.svg', 'currency-ink.svg', 'currency-pearl.svg', 'crate-bare-sea.svg', 'icon-story.svg', 'icon-deck.svg', 'card-back.svg', 'icon-log.svg', 'candle-lit.svg', 'salt-chunk-pearl.svg', 'icon-board.svg', 'icon-ability.svg', 'icon-attack.svg', 'icon-breakthrough.svg', 'icon-rank.svg', 'kw-breakwater.svg', 'kw-brine.svg', ...extra])];
  for (const n of names) { const k = 'a:' + n; if (D.png[k]) continue; const sz = pxOf(n, [64, 64]); await bake(k, 'assets/' + n, sz[0], sz[1]); }
  await bakeMaterial();
}
export function bakeMenuAssets() {
  // 로비 그림이 먼저(r3 성능: 첫 탭에 큰 SVG를 그리지 않게, 타이틀에서 쉬는 시간에 PNG로)
  const lobby = [...D.heroIds.map((h) => 'hero-' + h.slice(2) + '.svg'), 'icon-story.svg', 'icon-deck.svg', 'card-back.svg', 'icon-log.svg', 'candle-lit.svg', 'salt-chunk-pearl.svg', 'icon-board.svg', 'icon-ability.svg', 'icon-attack.svg', 'icon-breakthrough.svg', 'icon-rank.svg', 'kw-breakwater.svg', 'kw-brine.svg'];
  const names = [...lobby, 'currency-salt.svg', 'currency-ink.svg', 'currency-pearl.svg', 'crate-bare-sea.svg', ...D.heroIds.map((h) => 'crate-' + h.slice(2) + '.svg'), ...Object.keys(D.art.ux.families).map((f) => 'type-' + f + '.svg'), 'kind-minion.svg', 'kind-spell.svg', 'kind-weapon.svg', 'icon-story.svg'];
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
