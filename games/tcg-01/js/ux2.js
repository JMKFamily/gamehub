// UX2 (요청자 지시 2026-11-19 "이제 UX를 흥미롭게"): 모바일 게임형 로비, 상대 실력 4단계, 덱 첫 화면 + 그림 튜토리얼,
// 카드 팩 연속/모두 열기, 이야기 = 월드맵. 배치는 art.json ux2.lobby_rects_px, 수치는 balance.json 1.5.0, 글은 10-lore 8-14.
import { D, cardById, fac, assetURL } from './data.js';
import { t, L, cardName } from './i18n.js';
import { h, cardBox } from './cards.js';
import { M, save, owned, allDecks, deckProblems, openCrate, cratesToPity, addTide } from './meta.js';
import { G, tween, setTf, after } from './anim.js';
import { sfx, unlock } from './audio.js';
import { toast, coach } from './ui.js';
import { pickScreen } from './battle.js';

let NAV = null;
export function setNav2(fn) { NAV = fn; }
const go = (n, a) => NAV(n, a);
const HS = (hid) => hid.slice(2);
const heroName = (hid) => t(`hero_${HS(hid)}_name`);
const btn = (text, onclick, cls = '', attrs = {}) => h('button', { class: 'btn ' + cls, type: 'button', onpointerdown: (e) => e.currentTarget.classList.add('down'), onpointerleave: (e) => e.currentTarget.classList.remove('down'), onclick: (e) => { e.currentTarget.classList.remove('down'); unlock(); sfx('ui_tap'); onclick(e); }, ...attrs }, text);

// 설계 해상도 무대(로비): art 4해상도 중 가까운 것을 골라 균일 배율
function stageFor(sec) {
  const vw = innerWidth, vh = innerHeight, key = pickScreen(vw, vh), [W, H] = key.split('x').map(Number), k = Math.min(vw / W, vh / H);
  const st = h('div', { class: 'ux2stage', style: `width:${W}px;height:${H}px;transform:translate(${((vw - W * k) / 2).toFixed(1)}px,${((vh - H * k) / 2).toFixed(1)}px) scale(${k})` });
  sec.appendChild(st);
  return { st, key, W, H, R: D.art.ux2.lobby_rects_px[key] };
}
const place = (r, extra = '') => `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;${extra}`;

// ---------- 진행 값 ----------
export const tierDef = (n) => D.balance.ai.difficulty.tiers.find((x) => x.tier === n);
function tierUnlocked(n) {
  const T = tierDef(n); if (!T || T.unlock === '처음부터' || typeof T.unlock !== 'object') return { ok: true };
  const w = (M.s.stats.tierWins || {})[T.unlock.tier] || 0;
  return { ok: w >= T.unlock.n, need: T.unlock.n - w, tier: T.unlock.tier };
}
function seasonInfo() {
  const C = D.balance.economy.tide_calendar, m = M.s.tide.marks, per = C.tide_marks_per_step;
  const step = Math.min(C.steps, Math.floor(m / per));
  return { step, steps: C.steps, inStep: m % per, per, next: per - (m % per) };
}

// ---------- 로비 ----------
export function lobbyScreen() {
  const sec = h('section', { id: 'dock', class: 'screen ux2' });
  const { st, R } = stageFor(sec);
  const hero = M.s.lastHero || D.heroIds[0], F = fac(hero);
  // 배경: 영웅 실루엣 + 등불 빛 + 흑조 물결
  st.appendChild(h('div', { class: 'lobbyBg', style: `background:radial-gradient(ellipse at 50% 38%, ${D.art.palette.ui.wick_flame}33 0%, transparent 55%), linear-gradient(${D.art.palette.ui.bg_abyss}, ${D.art.palette.ui.tide_black})` }));
  st.appendChild(h('img', { class: 'lobbyHero', src: assetURL(`hero-${HS(hero)}.svg`), alt: '', style: place(R.hero) }));
  st.appendChild(h('div', { class: 'tideWave', style: `top:${R.battle.y - 30}px` }));
  // 위 HUD: 레벨 고리 · 재화 · 상점
  const si = seasonInfo();
  st.appendChild(h('button', { class: 'lvl', type: 'button', 'data-nav': 'calendar', style: place(R.level, `--k:${(si.inStep / si.per).toFixed(3)}`), 'aria-label': t('season_widget_level', { n: si.step }), onclick: () => go('calendar') }, [h('b', { text: String(si.step) })]));
  const c = M.s.cur, cur = (icon, n, key) => h('span', { class: 'cur', 'aria-label': `${t(key)} ${n}` }, [h('img', { src: assetURL(`${icon}.svg`), alt: '' }), String(n)]);
  st.appendChild(h('div', { class: 'hudCur', style: place(R.currency) }, [cur('currency-salt', c.salt, 'currency_salt'), cur('currency-ink', c.ink, 'currency_ink'), cur('currency-pearl', c.pearl, 'currency_pearl')]));
  st.appendChild(btn(t('menu_market'), () => go('market'), 'tile', { style: place(R.shop), 'data-nav': 'market' }));
  // 시즌 보상 트랙 위젯
  const nextStep = si.step + 1, nextCrate = nextStep % 5 === 0;
  const ticks = h('div', { class: 'stTicks' }); for (let i = 0; i < 10; i++) ticks.appendChild(h('i', { class: i < si.step % 10 ? 'on' : i === si.step % 10 ? 'cur' : '' }));
  st.appendChild(h('button', { class: 'seasonW', type: 'button', 'data-nav': 'calendar', style: place(R.season), onclick: () => go('calendar') }, [
    h('div', { class: 'row', style: 'gap:6px;flex-wrap:nowrap;justify-content:space-between' }, [h('b', { class: 'small', text: `${t('season_name_1')} · ${t('season_widget_level', { n: si.step })}` }), h('span', { class: 'small dim', text: t('season_widget_next', { n: si.next }) })]),
    h('div', { class: 'row', style: 'flex-wrap:nowrap;gap:6px' }, [ticks, h('img', { src: assetURL(nextCrate ? 'crate-bare-sea.svg' : 'currency-salt.svg'), alt: '', style: 'width:26px;height:26px;flex:none' })])]));
  // 퀘스트 위젯(늘 보임): 의뢰 3 + 주간 맹약
  const qw = h('button', { class: 'questW', type: 'button', 'data-nav': 'commissions', style: place(R.quests), onclick: () => go('commissions') }, h('b', { class: 'small', text: t('quest_widget_title') }));
  const rows = [...M.s.daily.comm.map((q) => ({ cur: q.prog, max: q.n, done: q.prog >= q.n, claimed: q.claimed })), M.s.weekly ? { cur: M.s.weekly.prog, max: M.s.weekly.n, done: M.s.weekly.prog >= M.s.weekly.n, claimed: M.s.weekly.claimed, weekly: true } : null].filter(Boolean);
  for (const q of rows) {
    const k = Math.min(1, q.cur / q.max);
    qw.appendChild(h('div', { class: 'qrow' + (q.done && !q.claimed ? ' done' : '') + (q.claimed ? ' claimed' : '') }, [h('div', { class: 'qbar' }, h('i', { style: `transform:scaleX(${k.toFixed(3)})` })), h('span', { class: 'small', text: t('quest_widget_progress', { cur: q.cur, max: q.max }) })]));
  }
  st.appendChild(qw);
  // 이야기 지도(왼쪽 가장자리) · 카드 팩·수집·덱(오른쪽 가장자리)
  const nCr = M.s.crates.bare + Object.values(M.s.crates.faction).reduce((a, b) => a + b, 0);
  st.appendChild(btn(h('span', { class: 'col', style: 'gap:2px;align-items:center' }, [h('img', { src: assetURL('icon-story.svg'), alt: '', style: 'width:28px;height:28px' }), h('span', { class: 'small', text: t('menu_chronicle') })]), () => go('worldmap'), 'tile', { style: place(R.story), 'data-nav': 'worldmap' }));
  const tile = (r, icon, label, nav, badge) => btn(h('span', { class: 'col', style: 'gap:2px;align-items:center' }, [h('img', { src: assetURL(icon), alt: '', style: 'width:30px;height:30px' }), h('span', { class: 'small', text: label }), badge ? h('i', { class: 'badge2', text: String(badge) }) : null]), () => go(nav), 'tile', { style: place(r), 'data-nav': nav });
  st.appendChild(tile(R.packs, 'crate-bare-sea.svg', t('menu_crates'), 'crates', nCr));
  st.appendChild(tile(R.collection, 'icon-deck.svg', t('menu_collection'), 'collection'));
  st.appendChild(tile(R.decks, 'card-back.svg', t('menu_writbook'), 'decks'));
  // 가운데 아래: 결투(큰 주황, 숨쉬기) + 돌파·제작
  st.appendChild(btn(h('span', { text: t('menu_play') }), () => go('difficulty'), 'primary battleBtn', { style: place(R.battle), 'data-nav': 'play' }));
  st.appendChild(btn(t('recut_button'), () => go('collection'), 'tile', { style: place(R.breakthrough), 'data-nav': 'breakthrough' }));
  st.appendChild(btn(t('inscribe_button'), () => go('collection'), 'tile', { style: place(R.craft), 'data-nav': 'craft' }));
  st.appendChild(btn(h('img', { src: assetURL('icon-log.svg'), alt: t('menu_settings'), style: 'width:26px;height:26px' }), () => go('settings'), 'tile', { style: place(R.settings), 'data-nav': 'settings', 'aria-label': t('menu_settings') }));
  return sec;
}

// ---------- 상대 실력 고르기(쉬움부터) ----------
export function difficultyScreen() {
  const s = frame('difficulty', t('ai_level'));
  const tiers = D.balance.ai.difficulty.tiers, rings = ['#6EE7A8', '#FFD166', '#FF6F5E', '#C9A3FF'];
  let sel = M.s.aiTier || D.balance.ai.difficulty.default_tier || 1;
  if (!tierUnlocked(sel).ok) sel = 1;
  const list = h('div', { class: 'tierList' });
  const draw = () => {
    list.innerHTML = '';
    tiers.forEach((T, i) => {
      const u = tierUnlocked(T.tier);
      const card = h('button', { class: 'tierCard' + (T.tier === sel ? ' sel' : '') + (u.ok ? '' : ' locked'), type: 'button', 'data-tier': T.tier, style: `--ring:${rings[i]}`, onclick: () => { if (!u.ok) { toast(t('ai_tier_locked')); sfx('ui_deny'); return; } sfx('ui_tap'); sel = T.tier; draw(); } }, [
        h('div', { class: 'tierArt' }, [0, 1, 2, 3].slice(0, i + 1).map(() => h('i'))),
        h('div', { class: 'col', style: 'gap:2px;min-width:0' }, [h('b', { text: t(`ai_tier_${T.tier}_name`) }), h('span', { class: 'small dim', text: u.ok ? t(`ai_tier_${T.tier}_sub`) : t('ai_tier_locked_n', { tier: t(`ai_tier_${u.tier}_name`), n: u.need }) })])]);
      list.appendChild(card);
    });
  };
  draw();
  s.querySelector('.body').appendChild(list);
  s.querySelector('.core').appendChild(btn(t('menu_play'), () => { M.s.aiTier = sel; save(); go('heroes', { tier: sel, ai: tierDef(sel).preset }); }, 'primary battleBtn', { 'data-nav': 'fight-tier' }));
  return s;
}

// 하위 화면 공통 틀: 위 HUD(제목 + 재화) · 왼쪽 아래 뒤로 · 가운데 아래 핵심 행동
export function frame(id, title, back = 'dock') {
  const s = h('section', { id, class: 'screen ux2frame' });
  const c = M.s.cur, cur = (icon, n) => h('span', { class: 'cur' }, [h('img', { src: assetURL(`${icon}.svg`), alt: '' }), String(n)]);
  s.appendChild(h('div', { class: 'top' }, [h('h2', { text: title }), h('span', { class: 'row', style: 'flex-wrap:nowrap' }, [cur('currency-salt', c.salt), cur('currency-ink', c.ink), cur('currency-pearl', c.pearl)])]));
  s.appendChild(h('div', { class: 'scroll col body' }));
  s.appendChild(h('div', { class: 'bottomBar' }, [btn(t('menu_back'), () => go(back), 'backBtn', { 'data-nav': 'back' }), h('div', { class: 'core' })]));
  return s;
}

// ---------- 덱 첫 화면: 1차 버튼 3개 + 그림 튜토리얼 ----------
export function decksFirstScreen() {
  const s = frame('decks', t('menu_writbook'));
  const body = s.querySelector('.body');
  const decks = allDecks();
  let selId = M.s.deckSel && decks.some((d) => d.id === M.s.deckSel) ? M.s.deckSel : (M.s.decks[0] || decks[0]).id;
  const grid = h('div', { class: 'deckPics' });
  const draw = () => {
    grid.innerHTML = '';
    for (const d of decks) {
      const pr = deckProblems(d), f = fac(d.hero);
      grid.appendChild(h('button', { class: 'deckPic' + (d.id === selId ? ' sel' : ''), type: 'button', 'data-deck': d.id, style: `--fac:${f.primary}`, onclick: () => { selId = d.id; M.s.deckSel = d.id; sfx('ui_tap'); draw(); } }, [
        h('img', { src: assetURL(`hero-${HS(d.hero)}.svg`), alt: '' }), h('b', { class: 'small', text: d.std ? (d.starter ? t('deck_starter') : t('deck_standard')) : d.name || t('deck_name_default', { name: heroName(d.hero) }) }),
        h('span', { class: 'small dim', text: `${heroName(d.hero)} · ${t('deck_count', { n: d.cards.length })}${pr.length ? ' ⚠' : ''}` })]));
    }
  };
  draw();
  body.appendChild(grid);
  const more = h('div', { class: 'row hidden', style: 'justify-content:center' });
  for (const hid of D.heroIds) more.appendChild(btn(`${t('deck_new')} · ${heroName(hid)}`, () => newDeck(hid), '', { 'data-new': hid }));
  body.appendChild(more);
  const core = s.querySelector('.core');
  core.appendChild(btn(`+ ${t('deck_new')}`, () => newDeck(decks.find((d) => d.id === selId).hero), '', { 'data-act': 'newDeck' }));
  core.appendChild(btn(t('deck_rename'), () => { const d = decks.find((x) => x.id === selId); if (d.std) { toast(t('deck_standard_locked')); return; } go('builder', { deck: d }); }, 'primary', { 'data-act': 'editDeck' }));
  core.appendChild(btn('⋯', () => more.classList.toggle('hidden'), '', { 'data-act': 'more', 'aria-label': t('deck_new') }));
  // 그림 튜토리얼(첫 진입 한 번, guide_deck_1~5)
  setTimeout(() => {
    const steps = [1, 2, 3, 4, 5].map((i) => ({ key: `guide_deck_${i}`, el: i === 1 || i === 3 ? (grid.firstElementChild || grid) : core, pic: deckPic(i) }));
    const todo = steps.filter((x) => !M.s.guides[x.key]);
    if (todo.length && !M.s.tut.skipped) coach(todo, t, { onEach: (k) => { M.s.guides[k] = true; save(); }, onSkip: () => { for (const x of todo) M.s.guides[x.key] = true; save(); } });
  }, 0);
  return s;
}
// 그림 튜토리얼 장마다 그림(정적 DOM): 30칸 띠 · 카드 2장 겹침 · 유형 표지 5개 · 심지 곡선 · 필터/채우기
function deckPic(i) {
  const box = h('div', { class: 'tutPic' });
  if (i === 1) { const bar = h('div', { class: 'pic30' }); for (let k = 0; k < 30; k++) bar.appendChild(h('i', { class: k < 22 ? 'on' : '' })); box.appendChild(bar); }
  if (i === 2) box.appendChild(h('div', { class: 'pic2' }, [h('img', { src: assetURL('card-back.svg'), alt: '' }), h('img', { src: assetURL('card-back.svg'), alt: '' }), h('b', { text: '×2' })]));
  if (i === 3) box.appendChild(h('div', { class: 'row', style: 'justify-content:center' }, Object.keys(D.art.ux.families).map((f) => h('img', { src: assetURL(`type-${f}.svg`), alt: '', style: 'width:30px;height:30px' }))));
  if (i === 4) { const cv = h('div', { class: 'curve', style: 'height:40px;width:160px' }); for (const v of [2, 5, 6, 5, 4, 3, 2, 1]) cv.appendChild(h('i', { style: `height:100%;transform:scaleY(${v / 6})` })); box.appendChild(cv); }
  if (i === 5) box.appendChild(h('div', { class: 'row', style: 'justify-content:center' }, [h('img', { src: assetURL('kind-minion.svg'), alt: '', style: 'width:26px;height:30px' }), h('img', { src: assetURL('kind-spell.svg'), alt: '', style: 'width:26px;height:30px' }), h('span', { class: 'btn', text: t('deck_auto_fill') })]));
  return box;
}
function newDeck(hid) { const d = { id: 'u' + Date.now().toString(36), name: t('deck_name_default', { name: heroName(hid) }), hero: hid, cards: [] }; M.s.decks.push(d); M.s.deckSel = d.id; save(); go('builder', { deck: d }); }

// ---------- 카드 팩 모두 열기(최대 10, 희귀도 높은 순 격자) ----------
const RANK = { abyss: 0, coral: 1, pearl: 2, sand: 3 };
export function openAllScreen({ list }) {
  const s = frame('openAll', t('crate_summary_title'), 'crates');
  const body = s.querySelector('.body');
  const res = [];
  for (const it of list) res.push(...openCrate(it.kind, it.hero));
  res.sort((a, b) => RANK[a.rarity] - RANK[b.rarity]);
  const nNew = res.filter((r) => r.isNew).length, nDup = res.length - nNew;
  body.appendChild(h('div', { class: 'small', text: `${t('crate_summary_new', { n: nNew })} · ${t('crate_summary_dup', { n: nDup })}` }));
  const grid = h('div', { class: 'grid collGrid' });
  body.appendChild(grid);
  const P = D.art.ux2.packs.open_all;
  const cells = res.map((r) => { const el = h('div', { class: 'cell openCell', 'data-cid': r.cid, style: 'opacity:0' }, [cardBox(r.cid, 96, { mode: 'hand' }), h('div', { class: 'mn', text: r.isNew ? t('crate_new') : r.res ? t('crate_resonance_gain', { n: r.res }) : t('crate_second_copy') })]); el.onclick = () => import('./screens.js').then((m) => m.cardDetail(r.cid)); grid.appendChild(el); return el; });
  // 공개: 60 ms 간격, 전설은 600 ms 멈춤(최대 3번), 전체 4 s 상한, 탭하면 남은 공개 즉시
  let at = 0, pauses = 0, skip = false;
  const plan = res.map((r) => { const a = at; at += P.reveal_stagger_ms; if (r.rarity === 'abyss' && pauses < P.legend_pause_max) { at += P.legend_pause_ms; pauses++; } return a; });
  const scale = at > P.total_cap_ms ? P.total_cap_ms / at : 1;
  cells.forEach((el, i) => after(plan[i] * scale * G.scale, () => { if (skip) return; el.style.opacity = 1; const r = res[i]; sfx(r.rarity === 'abyss' ? 'chunk_break_abyss' : r.rarity === 'coral' ? 'chunk_break_coral' : 'card_draw'); if (RANK[r.rarity] <= 1) { setTf(el, { s: 1.12 }); tween(el, { s: 1 }, 300 * G.scale); } }));
  s.querySelector('.core').appendChild(btn(t('crate_skip_anim'), () => { skip = true; for (const el of cells) el.style.opacity = 1; }, '', { 'data-act': 'skipAll' }));
  s.addEventListener('pointerdown', (e) => { if (e.target.closest('.cell')) return; skip = true; for (const el of cells) el.style.opacity = 1; }, { once: true });
  void cratesToPity;
  return s;
}
export function crateQueue(max) { // 가진 팩을 최대 max개(기본 팩 먼저, 그다음 세력 팩)
  const out = []; let b = M.s.crates.bare;
  while (out.length < max && b > 0) { out.push({ kind: 'bare' }); b--; }
  for (const hid of D.heroIds) { let n = M.s.crates.faction[hid] || 0; while (out.length < max && n > 0) { out.push({ kind: 'faction', hero: hid }); n--; } }
  return out;
}
export function takeCrates(list) { for (const it of list) { if (it.kind === 'bare') M.s.crates.bare--; else M.s.crates.faction[it.hero]--; } save(); }

// ---------- 이야기 = 월드맵 ----------
function nodeUnlock(n) {
  const O = D.balance.worldmap.unlock_overrides;
  let u = O[n.id] || (n.region !== 'bare' && n.region !== 'rift' ? O[`region_${n.order}`] : null) || n.unlock;
  return u;
}
function regionOwner(rid) { const r = D.worldmap.regions.find((x) => x.id === rid); return r ? r.owner : 'neutral'; }
function unlockState(n) {
  const u = nodeUnlock(n), S = M.s, st = S.stats || {}, read = new Set(S.story.read);
  const owner = u.owner || regionOwner(n.region);
  switch (u.type) {
    case 'start': return { ok: true };
    case 'node': { const prev = u.prev || D.worldmap.start_node; return { ok: read.has(prev), text: t('worldmap_cond_prev', { title: nodeTitle(D.worldmap.nodes.find((x) => x.id === prev)) }) }; }
    case 'win_any': return { ok: (st.wins || 0) >= u.n, text: t('worldmap_cond_win_any', { n: u.n }) };
    case 'win_hero': { const hh = u.hero || owner; return { ok: ((st.heroWins || {})[hh] || 0) >= u.n, text: t('worldmap_cond_win_hero', { hero: heroName(hh), n: u.n }) }; }
    case 'collect_owner': { const have = D.list.filter((c) => c.owner === owner && owned(c.id) > 0).length; const fn = owner === 'neutral' ? t('card_owner_common') : heroName(owner); return { ok: have >= u.n, text: t('worldmap_cond_collect', { faction: fn, n: u.n }) }; }
    case 'win_tier': { let w = 0; for (const [k, v] of Object.entries(st.tierWins || {})) if (+k >= u.tier) w += v; return { ok: w >= u.n, text: t('worldmap_cond_win_tier', { tier: t(`ai_tier_${u.tier}_name`), n: u.n }) }; }
    case 'regions_done': { const ok = u.regions.every((rid) => { const last = D.worldmap.nodes.filter((x) => x.region === rid).sort((a, b) => b.order - a.order)[0]; return last && read.has(last.id); }); return { ok, text: t('worldmap_cond_regions') }; }
    default: return { ok: false, text: '' };
  }
}
const nodeTitle = (n) => (n ? (L.lang === 'en' ? n.title_en : n.title_ko) : '');
export function worldmapScreen() {
  M.s.story = M.s.story || { read: [] };
  const s = frame('worldmap', t('worldmap_title'));
  const body = s.querySelector('.body'); body.classList.add('mapBody');
  // art 지도 그림(900×1100, assets/worldmap-bg.svg) 위에 노드·길을 저장값 상태로 그림
  const W = 900, MH = 1100; // art 원본 배율(노드 간격·그림 노드와 정확히 겹침), 화면보다 크면 스크롤
  const map = h('div', { class: 'wmap', style: `width:${W}px;height:${MH}px` }, h('img', { class: 'wbg', src: 'assets/worldmap-bg.svg', alt: '', style: `width:${W}px;height:${MH}px` }));
  const X = (x) => (x / 100) * W, Y = (y) => (y / 100) * MH;
  const read = new Set(M.s.story.read);
  const nodes = D.worldmap.nodes, total = nodes.length, byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const rift = nodes.filter((n) => n.region === 'rift'), riftShown = rift.some((n) => unlockState(n).ok || read.has(n.id));
  const state = (n) => (read.has(n.id) ? 'read' : unlockState(n).ok ? 'open' : 'locked');
  // 길: 지역 안 앞 노드 → 다음, 지역 첫 노드는 시작 노드에서(지도 그림과 같은 직선, 상태는 저장값)
  const svgNS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', W); svg.setAttribute('height', MH); svg.setAttribute('class', 'wpaths');
  for (const n of nodes) {
    if (n.region === 'rift' && !riftShown) continue;
    const prev = n.order > 1 ? nodes.find((q) => q.region === n.region && q.order === n.order - 1) : n.unlock && n.unlock.prev ? byId[n.unlock.prev] : n.region === 'rift' ? byId[D.worldmap.start_node] : null;
    if (!prev) continue;
    const p = document.createElementNS(svgNS, 'path'); p.setAttribute('d', `M${X(prev.x)} ${Y(prev.y)}L${X(n.x)} ${Y(n.y)}`); p.setAttribute('class', state(prev) !== 'locked' && state(n) !== 'locked' ? 'on' : ''); svg.appendChild(p);
  }
  map.appendChild(svg);
  if (!riftShown) { const r = D.worldmap.regions.find((x) => x.id === 'rift'); if (r) map.appendChild(h('div', { class: 'wfog', style: `left:${X(r.x) - 90}px;top:${Y(r.y) - 60}px` })); }
  let cur = null;
  for (const n of nodes) {
    if (n.region === 'rift' && !riftShown) continue;
    const st = state(n);
    if (st === 'open' && !cur) cur = n;
    map.appendChild(h('button', { class: `wnode ${st}`, type: 'button', 'data-node': n.id, style: `left:${X(n.x) - 24}px;top:${Y(n.y) - 24}px`, 'aria-label': nodeTitle(n), onclick: () => nodePanel(n, st) }, h('span', { text: st === 'read' ? '✓' : st === 'open' ? String(n.order) : '·' })));
  }
  if (cur) map.querySelector(`[data-node="${cur.id}"]`).classList.add('cur');
  body.appendChild(h('div', { class: 'small wprog', text: t('worldmap_progress', { n: read.size, total }) + (riftShown && !read.has(rift[0].id) ? ' · ' + t('worldmap_rift_reveal') : '') }));
  const scroller = h('div', { class: 'wscroll' }, map);
  body.appendChild(scroller);
  if (cur) s.querySelector('.core').appendChild(btn(t('worldmap_continue'), () => nodePanel(cur, 'open'), 'primary', { 'data-act': 'continue' }));
  requestAnimationFrame(() => { const c = cur || byId[D.worldmap.start_node]; scroller.scrollTop = Math.max(0, Y(c.y) - scroller.clientHeight / 2); scroller.scrollLeft = Math.max(0, X(c.x) - scroller.clientWidth / 2); });
  return s;
}
function nodePanel(n, st) {
  const box = h('div', { class: 'ovl', style: 'position:fixed;overflow:auto;justify-content:safe center' });
  const close = () => box.remove();
  const pnl = h('div', { class: 'panel col', style: 'width:min(420px,92vw)' }, [h('span', { class: 'small dim', text: (D.worldmap.regions.find((r) => r.id === n.region) || {})[L.lang === 'en' ? 'name_en' : 'name_ko'] }), h('b', { style: 'font-size:17px', text: nodeTitle(n) })]);
  if (st === 'locked') {
    pnl.appendChild(h('div', { class: 'small', text: unlockState(n).text || t('worldmap_region_locked') }));
  } else {
    pnl.appendChild(h('div', { class: 'storyText', style: 'font-size:15px;line-height:1.6;word-break:keep-all', text: L.lang === 'en' ? n.body_en : n.body_ko }));
    pnl.appendChild(h('b', { class: 'small', text: t('worldmap_related_cards') }));
    const row = h('div', { class: 'row', style: 'justify-content:center' });
    for (const cid of n.cards) { const c = cardById(cid); if (!c) continue; const cell = h('button', { class: 'btn', type: 'button', style: 'height:auto;padding:4px;flex-direction:column', 'data-card': cid, onclick: () => import('./screens.js').then((m) => m.cardDetail(cid, null, { story: true })) }, [cardBox(cid, 72, { mode: 'hand' }), h('span', { class: 'small', text: cardName(c) })]); row.appendChild(cell); }
    pnl.appendChild(row);
    if (st === 'open') pnl.appendChild(btn(t('worldmap_reward'), () => { readNode(n); close(); go('worldmap'); }, 'primary', { 'data-act': 'claim' }));
  }
  pnl.appendChild(btn(t('menu_back'), close, '', { 'data-act': 'close' }));
  pnl.addEventListener('click', (e) => e.stopPropagation());
  box.addEventListener('click', close);
  box.appendChild(pnl);
  document.body.appendChild(box);
}
function readNode(n) {
  const S = M.s; if (S.story.read.includes(n.id)) return;
  S.story.read.push(n.id);
  const R = D.balance.worldmap.node_reward, rw = { ...(R.every_node || {}) };
  const extra = R[n.id] || (n.region !== 'bare' && n.region !== 'rift' ? R[`region_${n.order}`] : null);
  if (extra) for (const [k, v] of Object.entries(extra)) rw[k] = (rw[k] || 0) + v;
  if (rw.salt_marks) S.cur.salt += rw.salt_marks; if (rw.carving_ink) S.cur.ink += rw.carving_ink; if (rw.abyss_pearl) S.cur.pearl += rw.abyss_pearl;
  if (rw.bare_sea_crate) S.crates.bare += rw.bare_sea_crate;
  if (rw.faction_crate) { const hh = regionOwner(n.region) !== 'neutral' ? regionOwner(n.region) : S.lastHero || D.heroIds[0]; S.crates.faction[hh] = (S.crates.faction[hh] || 0) + rw.faction_crate; }
  save(); sfx('chunk_break_pearl');
  toast(`${t('currency_salt')} +${rw.salt_marks || 0}`);
  void addTide;
}
