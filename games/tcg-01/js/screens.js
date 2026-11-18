// 메뉴 화면들: 타이틀·부두·호명자 선택·수집(공명·새김)·영장첩·인양 상자·부두 시장·의뢰·조수 달력·설정·결과
import { D, cardById, fac } from './data.js';
import { t, L, setLang, cardName } from './i18n.js';
import { h, cardBox } from './cards.js';
import { M, save, owned, stageOf, cap, deckCap, thresholds, canRecut, recut, btDelta, craftCost, craft, openCrate, cratesToPity, buy, rerollComm, claimComm, tideReward, deckProblems, allDecks } from './meta.js';
import { G, tween, setTf, tf } from './anim.js';
import { sfx, setSound, setMusic, unlock } from './audio.js';
import { toast, show } from './ui.js';

const HS = (hid) => hid.slice(2);
let NAV = null;
export function setNav(fn) { NAV = fn; }
const go = (n, a) => NAV(n, a);
const btn = (text, onclick, cls = '', attrs = {}) => h('button', { class: 'btn ' + cls, type: 'button', onclick: (e) => { unlock(); sfx('ui_tap'); onclick(e); }, ...attrs }, text);
function screen(id, title, back = 'dock') {
  const s = h('section', { id, class: 'screen' });
  if (title != null) s.appendChild(h('div', { class: 'top' }, [btn(t('menu_back'), () => go(back), '', { 'data-nav': 'back' }), h('h2', { text: title }), curBar()]));
  return s;
}
function curBar() {
  const c = M.s.cur;
  const it = (icon, n, key) => h('span', { class: 'cur', title: t(key), 'aria-label': `${t(key)} ${n}` }, [h('img', { src: `assets/${icon}.svg`, alt: '' }), String(n)]);
  return h('span', { class: 'row' }, [it('currency-salt', c.salt, 'currency_salt'), it('currency-ink', c.ink, 'currency_ink'), it('currency-pearl', c.pearl, 'currency_pearl')]);
}
const heroName = (hid) => t(`hero_${HS(hid)}_name`);

// ---------- 타이틀 ----------
export function titleScreen() {
  const s = h('section', { id: 'title', class: 'screen', 'data-nav': 'start' }, [
    h('img', { class: 'icon', src: 'assets/app-icon.svg', alt: '' }), h('h1', { text: t('game_title') }), h('div', { class: 'sub', text: t('game_subtitle') }), h('div', { class: 'tap', text: t('title_tap_to_start') })]);
  s.addEventListener('pointerdown', () => { unlock(); sfx('ui_tap'); go('dock'); });
  return s;
}

// ---------- 부두(메인 메뉴) ----------
export function dockScreen() {
  const s = h('section', { id: 'dock', class: 'screen' });
  s.appendChild(h('div', { class: 'top' }, [h('h2', { text: t('game_title') }), curBar()]));
  const sc = h('div', { class: 'scroll col' });
  sc.appendChild(btn(t('menu_play'), () => go('heroes'), 'primary big', { 'data-nav': 'play' }));
  const crates = M.s.crates.bare + Object.values(M.s.crates.faction).reduce((a, b) => a + b, 0);
  sc.appendChild(h('div', { class: 'grid dockGrid' }, [
    btn(t('menu_writbook'), () => go('decks'), '', { 'data-nav': 'decks' }), btn(t('menu_collection'), () => go('collection'), '', { 'data-nav': 'collection' }),
    btn(`${t('menu_crates')} (${crates})`, () => go('crates'), '', { 'data-nav': 'crates' }), btn(t('menu_market'), () => go('market'), '', { 'data-nav': 'market' }),
    btn(t('menu_commissions'), () => go('commissions'), '', { 'data-nav': 'commissions' }), btn(t('menu_calendar'), () => go('calendar'), '', { 'data-nav': 'calendar' }),
    btn(t('menu_chronicle'), () => toast(t('chronicle_locked')), 'off'), btn(t('menu_settings'), () => go('settings'), '', { 'data-nav': 'settings' })]));
  const T = D.balance.economy.tide_calendar, m = M.s.tide.marks;
  sc.appendChild(h('div', { class: 'panel col' }, [h('div', { class: 'small', text: `${t('calendar_title')} · ${t('calendar_season', { n: 1 })} · ${Math.min(T.steps, Math.floor(m / T.tide_marks_per_step))}/${T.steps}` }), tideBar(m % T.tide_marks_per_step / T.tide_marks_per_step)]));
  sc.appendChild(h('div', { class: 'dim small', text: t('market_no_real_money') }));
  s.appendChild(sc);
  return s;
}
function tideBar(k) { const i = h('i'); i.style.transform = `scaleX(${Math.max(0, Math.min(1, k)).toFixed(3)})`; return h('div', { class: 'trackBar' }, i); }

// ---------- 호명자 선택 → 결투 ----------
export function heroScreen() {
  const s = screen('heroes', t('choose_caller'));
  const sc = h('div', { class: 'scroll col' });
  let hero = M.s.lastHero || D.heroIds[0], deckId = null, mode = M.s.mode || 'mode_practice', ai = M.s.ai || 'eval';
  const grid = h('div', { class: 'grid heroGrid' }), det = h('div', { class: 'col' });
  const draw = () => {
    grid.innerHTML = '';
    for (const hid of D.heroIds) {
      const f = fac(hid);
      grid.appendChild(h('button', { class: 'heroCard' + (hid === hero ? ' sel' : ''), type: 'button', 'data-hero': hid, style: `--fac:${f.primary}`, onclick: () => { sfx('ui_tap'); hero = hid; deckId = null; draw(); } },
        [h('img', { src: `assets/hero-${HS(hid)}.svg`, alt: '' }), h('b', { text: heroName(hid) })]));
    }
    det.innerHTML = '';
    const hs = HS(hero);
    det.appendChild(h('div', { class: 'panel col' }, [h('b', { text: `${heroName(hero)} — ${t(`hero_${hs}_title`)}` }), h('div', { class: 'small', text: `${t('hud_calling')}: ${t(`hero_${hs}_power`)} · ${t(`hero_${hs}_power_desc`)}` })]));
    det.appendChild(h('b', { text: t('choose_writbook') }));
    const decks = allDecks().filter((d) => d.hero === hero);
    if (!deckId || !decks.some((d) => d.id === deckId)) deckId = decks[0].id;
    const dr = h('div', { class: 'row' });
    for (const d of decks) {
      const bad = deckProblems(d).length > 0;
      dr.appendChild(btn(d.std ? `${t('deck_standard')} · ${d.archetype}` : d.name || t('deck_name_default', { name: heroName(hero) }), () => { if (bad) { toast(t(deckProblems(d)[0])); return; } deckId = d.id; draw(); }, (d.id === deckId ? 'sel' : '') + (bad ? ' off' : ''), { 'data-deck': d.id }));
    }
    det.appendChild(dr);
    const mr = h('div', { class: 'col' });
    for (const m of ['mode_practice', 'mode_sparring', 'mode_accord']) mr.appendChild(btn(h('span', {}, [h('b', { text: t(m) }), h('span', { class: 'small', text: ' · ' + t(m + '_desc') })]), () => { mode = m; draw(); }, m === mode ? 'sel' : '', { 'data-mode': m }));
    det.appendChild(mr);
    det.appendChild(h('div', { class: 'row' }, [h('span', { text: t('ai_level') }), btn(t('ai_easy'), () => { ai = 'greedy'; draw(); }, ai === 'greedy' ? 'sel' : '', { 'data-ai': 'greedy' }), btn(t('ai_hard'), () => { ai = 'eval'; draw(); }, ai === 'eval' ? 'sel' : '', { 'data-ai': 'eval' })]));
    det.appendChild(btn(t('menu_play'), () => {
      M.s.lastHero = hero; M.s.mode = mode; M.s.ai = ai; save();
      const deck = allDecks().find((d) => d.id === deckId);
      go('battle', { hero, deck, mode, ai });
    }, 'primary big', { 'data-nav': 'fight' }));
  };
  draw();
  sc.appendChild(grid); sc.appendChild(det);
  s.appendChild(sc);
  return s;
}

// ---------- 수집(공명·새김 돌파) ----------
export function collectionScreen() {
  const s = screen('collection', t('menu_collection'));
  let flt = 'all', onlyOwned = false;
  const fl = h('div', { class: 'filters' }), grid = h('div', { class: 'grid collGrid' }), sc = h('div', { class: 'scroll' }, grid);
  const owners = ['all', ...D.heroIds, 'neutral'];
  const draw = () => {
    fl.innerHTML = '';
    for (const o of owners) fl.appendChild(btn(o === 'all' ? t('filter_all') : o === 'neutral' ? t('card_owner_common') : heroName(o), () => { flt = o; draw(); }, flt === o ? 'sel' : ''));
    fl.appendChild(btn(t('collection_owned'), () => { onlyOwned = !onlyOwned; draw(); }, onlyOwned ? 'sel' : ''));
    grid.innerHTML = '';
    const n = D.list.filter((c) => owned(c.id) > 0).length;
    s.querySelector('h2').textContent = `${t('menu_collection')} ${n}/${D.list.length}`;
    for (const c of D.list) {
      if (flt !== 'all' && c.owner !== flt) continue;
      if (onlyOwned && !owned(c.id)) continue;
      grid.appendChild(cell(c.id, () => cardDetail(c.id, draw)));
    }
  };
  draw();
  s.appendChild(fl); s.appendChild(sc);
  return s;
}
function cell(cid, onclick) {
  const n = owned(cid), st = stageOf(cid), e = M.s.coll[cid];
  const el = h('div', { class: 'cell' + (n ? '' : ' miss'), 'data-cid': cid, onclick: () => { sfx('ui_tap'); onclick(); } });
  el.appendChild(cardBox(cid, 96, { mode: 'full', stage: st }));
  if (n) el.appendChild(h('span', { class: 'cnt', text: `${n}/${cap(cid)}` }));
  const th = thresholds(cid), next = th[Math.min(3, st + 1)];
  const k = st >= 3 ? 1 : e ? Math.min(1, (e.res - th[st]) / Math.max(1, next - th[st])) : 0;
  const bar = h('div', { class: 'resbar' + (canRecut(cid) ? ' ready' : '') }, h('i', { style: `transform:scaleX(${Math.max(0, k).toFixed(3)})` }));
  el.appendChild(bar);
  return el;
}
function statDeltaText(cid, st) {
  const d = btDelta(cid, st), out = [];
  if (d.attack) out.push(`+${d.attack} ${t('stat_attack')}`);
  if (d.health) out.push(`+${d.health} ${cardById(cid).kind === 'weapon' ? t('stat_durability') : t('stat_health')}`);
  if (d.effect_n) for (const v of Object.values(d.effect_n)) out.push(`${t('stat_effect')} +${v}`);
  return out.length ? out.join(', ') : t('stat_cosmetic');
}
export function cardDetail(cid, after) {
  const box = h('div', { class: 'ovl', style: 'position:fixed;overflow:auto' });
  const close = () => { box.remove(); after && after(); };
  const draw = () => {
    box.innerHTML = '';
    const c = cardById(cid), e = M.s.coll[cid] || { n: 0, res: 0, stage: 0 }, th = thresholds(cid);
    const w = Math.min(230, innerWidth - 40);
    const wrap = h('div', { class: 'cardBox', 'data-detail': cid });
    wrap.appendChild(cardBox(cid, w, { mode: 'full', stage: e.stage }));
    box.appendChild(wrap);
    box.appendChild(h('div', { class: 'panel col', style: `width:${w + 40}px;max-width:94vw` }, [
      h('b', { text: `${cardName(c)} · ${t('rarity_' + c.rarity)} · ${owned(cid)}/${cap(cid)}` }),
      h('div', { class: 'small', text: `${t('resonance')} ${e.res}${e.stage < 3 ? ' / ' + th[e.stage + 1] : ''} · ${t('recut_level_' + e.stage)}` }),
      ...[1, 2, 3].map((st) => h('div', { class: 'small' + (st <= e.stage ? '' : ' dim'), text: `${t('recut_level_' + st)} (${t('resonance')} ${th[st]}): ${statDeltaText(cid, st)}` })),
      h('div', { class: 'small dim', text: t('recut_rule_note') }),
    ]));
    const row = h('div', { class: 'row', style: 'justify-content:center' });
    if (e.stage >= 3) row.appendChild(h('div', { class: 'small', text: t('recut_max') }));
    else row.appendChild(btn(canRecut(cid) ? t('recut_ready') : t('recut_button'), () => {
      if (!recut(cid)) { sfx('ui_deny'); return; }
      sfx('chunk_break_pearl'); toast(t('recut_done'));
      draw();
      const f = box.querySelector('[data-detail] .card'); if (f) { setTf(f.parentNode, { s: 1.08 }); tween(f.parentNode, { s: 1 }, 800 * G.scale); }
    }, canRecut(cid) ? 'primary' : 'off', { 'data-act': 'recut' }));
    const cost = craftCost(cid);
    row.appendChild(btn(`${t('inscribe_button')} (${t('currency_ink')} ${cost})`, () => {
      confirmBox(t('inscribe_confirm', { n: cost }), () => { const r = craft(cid); if (!r) { toast(t('ink_not_enough')); sfx('ui_deny'); } else { toast(r.isNew ? t('crate_new') : r.res ? t('crate_duplicate', { n: r.res }) : t('currency_ink') + ' +' + r.ink); } draw(); });
    }, M.s.cur.ink >= cost ? '' : 'off', { 'data-act': 'craft' }));
    row.appendChild(btn(t('menu_back'), close, '', { 'data-act': 'close' }));
    box.appendChild(row);
  };
  draw();
  document.body.appendChild(box);
}
export function confirmBox(text, yes) {
  const box = h('div', { class: 'ovl', style: 'position:fixed' }, h('div', { class: 'panel', text }));
  box.appendChild(h('div', { class: 'row' }, [btn(t('confirm_yes'), () => { box.remove(); yes(); }, 'primary', { 'data-act': 'yes' }), btn(t('confirm_no'), () => box.remove(), '', { 'data-act': 'no' })]));
  document.body.appendChild(box);
}

// ---------- 영장첩(덱 빌더) ----------
export function decksScreen() {
  const s = screen('decks', t('menu_writbook'));
  const sc = h('div', { class: 'scroll col' });
  for (const d of allDecks()) {
    const pr = deckProblems(d);
    sc.appendChild(btn(h('span', {}, [h('b', { text: d.std ? `${heroName(d.hero)} · ${t('deck_standard')}` : d.name || t('deck_name_default', { name: heroName(d.hero) }) }), h('span', { class: 'small', text: ` ${t('deck_count', { n: d.cards.length })}${pr.length ? ' · ' + t(pr[0]) : ''}` })]),
      () => (d.std ? toast(t('deck_standard_locked')) : go('builder', { deck: d })), d.std ? '' : 'primary'));
  }
  const nr = h('div', { class: 'row' });
  for (const hid of D.heroIds) nr.appendChild(btn(`${t('deck_new')} · ${heroName(hid)}`, () => {
    const d = { id: 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), name: t('deck_name_default', { name: heroName(hid) }), hero: hid, cards: [] };
    M.s.decks.push(d); save(); go('builder', { deck: d });
  }, '', { 'data-new': hid }));
  sc.appendChild(nr);
  s.appendChild(sc);
  return s;
}
export function builderScreen({ deck }) {
  const s = screen('builder', null);
  const R = D.balance.rules;
  let cost = -1;
  const name = h('input', { value: deck.name || '', 'aria-label': t('deck_rename'), style: 'flex:1;min-height:40px;font-size:15px;background:var(--bg_abyss);color:var(--salt_white);border:1px solid var(--line_soft);padding:0 8px' });
  const cnt = h('b');
  s.appendChild(h('div', { class: 'top' }, [btn(t('menu_back'), () => go('decks')), name, cnt]));
  const fl = h('div', { class: 'filters' }), grid = h('div', { class: 'grid collGrid' }), strip = h('div', { class: 'deckStrip' }), curve = h('div', { class: 'curve' });
  const count = (cid) => deck.cards.filter((x) => x === cid).length;
  const add = (cid) => {
    if (deck.cards.length >= R.deck_size_cards) { toast(t('deck_count', { n: deck.cards.length })); return; }
    const c = cardById(cid);
    if (c.owner !== 'neutral' && c.owner !== deck.hero) { toast(t('deck_owner_mismatch')); return; }
    if (count(cid) >= deckCap(cid)) { toast(t(c.rarity === 'abyss' ? 'deck_limit_one' : 'deck_limit_two')); return; }
    if (count(cid) >= owned(cid)) { toast(t('collection_missing')); return; }
    deck.cards.push(cid); draw();
  };
  const draw = () => {
    cnt.textContent = t('deck_count', { n: deck.cards.length });
    fl.innerHTML = '';
    for (let c = -1; c <= 7; c++) fl.appendChild(btn(c < 0 ? t('filter_all') : c === 7 ? '7+' : String(c), () => { cost = c; draw(); }, cost === c ? 'sel' : ''));
    grid.innerHTML = '';
    for (const c of D.list) {
      if (c.owner !== 'neutral' && c.owner !== deck.hero) continue;
      if (!owned(c.id)) continue;
      if (cost >= 0 && (cost === 7 ? c.cost < 7 : c.cost !== cost)) continue;
      const el = cell(c.id, () => add(c.id));
      const n = count(c.id); if (n) el.appendChild(h('span', { class: 'cnt', style: 'left:2px;right:auto;top:auto;bottom:12px;color:var(--wick_flame)', text: '●'.repeat(n) }));
      grid.appendChild(el);
    }
    strip.innerHTML = '';
    const uniq = [...new Set(deck.cards)].sort((a, b) => cardById(a).cost - cardById(b).cost);
    for (const cid of uniq) {
      const c = cardById(cid);
      strip.appendChild(h('div', { class: 'dline', style: `--fac:${fac(c.owner).primary}`, onclick: () => { deck.cards.splice(deck.cards.indexOf(cid), 1); draw(); } }, [h('span', { class: 'c', text: String(c.cost) }), h('span', { class: 'grow', text: cardName(c) }), h('span', { text: '●'.repeat(count(cid)) })]));
    }
    curve.innerHTML = '';
    const buckets = Array(8).fill(0); for (const cid of deck.cards) buckets[Math.min(7, cardById(cid).cost)]++;
    const mx = Math.max(1, ...buckets);
    for (const b of buckets) curve.appendChild(h('i', { style: `height:100%;transform:scaleY(${(b / mx).toFixed(3)})` }));
  };
  draw();
  s.appendChild(fl);
  s.appendChild(h('div', { class: 'scroll' }, grid));
  s.appendChild(h('div', { class: 'panel col' }, [h('div', { class: 'row' }, [h('span', { class: 'small', text: t('deck_curve') }), h('div', { class: 'grow' }, curve)]), strip,
    h('div', { class: 'row' }, [
      btn(t('deck_auto_fill'), () => {
        const std = D.decks.find((d) => d.hero === deck.hero);
        const pool = [...std.cards, ...D.list.filter((c) => c.owner === deck.hero || c.owner === 'neutral').map((c) => c.id)];
        for (const cid of pool) { if (deck.cards.length >= R.deck_size_cards) break; if (count(cid) < Math.min(deckCap(cid), owned(cid))) deck.cards.push(cid); }
        draw();
      }),
      btn(t('deck_save'), () => { deck.name = name.value || deck.name; const pr = deckProblems(deck); save(); toast(pr.length ? t(pr[0]) : t('deck_saved')); }, 'primary'),
      btn(t('deck_delete'), () => confirmBox(t('deck_delete_confirm'), () => { M.s.decks = M.s.decks.filter((d) => d !== deck); save(); go('decks'); })),
    ])]));
  return s;
}

// ---------- 인양 상자 ----------
export function cratesScreen() {
  const s = screen('crates', t('menu_crates'));
  const sc = h('div', { class: 'scroll col' });
  sc.appendChild(h('div', { class: 'small', text: t('crate_guarantee', { n: cratesToPity() }) }));
  const row = (img, label, n, onOpen, key) => h('div', { class: 'panel row' }, [h('img', { src: img, alt: '', style: 'width:64px;height:64px' }), h('b', { class: 'grow', text: `${label} × ${n}` }), btn(t('crate_open'), onOpen, n ? 'primary' : 'off', { 'data-open': key })]);
  sc.appendChild(row('assets/crate-bare-sea.svg', t('crate_bare_sea'), M.s.crates.bare, () => { if (M.s.crates.bare <= 0) return toast(t('crate_none')); M.s.crates.bare--; go('open', { kind: 'bare' }); }, 'bare'));
  for (const hid of D.heroIds) {
    const n = M.s.crates.faction[hid] || 0;
    if (n) sc.appendChild(row(`assets/crate-${HS(hid)}.svg`, t('crate_' + HS(hid)), n, () => { M.s.crates.faction[hid]--; go('open', { kind: 'faction', hero: hid }); }, hid));
  }
  sc.appendChild(btn(t('crate_odds'), () => {
    const E = D.balance.economy;
    const pct = (o) => Object.entries(o).map(([k, v]) => `${t('rarity_' + k)} ${(v * 100).toFixed(0)}%`).join(' · ');
    const box = h('div', { class: 'ovl', style: 'position:fixed' }, h('div', { class: 'panel col' }, [h('b', { text: t('crate_odds_title') }), h('div', { class: 'small', text: `${t('odds_slot')}: ${pct(E.rarity_slot_prob)}` }), h('div', { class: 'small', text: `${t('odds_guarantee_slot')}: ${pct(E.rarity_guarantee_slot_prob)}` }), h('div', { class: 'small', text: t('odds_pity', { a: E.pity.abyss_within_crates, c: E.pity.coral_within_crates, f: E.pity.first_abyss_within_crates }) })]));
    box.appendChild(btn(t('menu_back'), () => box.remove()));
    document.body.appendChild(box);
  }));
  s.appendChild(sc);
  return s;
}
// 개봉 연출(30-art 5-7): 뚜껑 → 덩이 5개 → 희귀도 예고 빛 → 탭해서 부숨 → 뒤집기 → 새 이름/공명 +n
export function openScreen({ kind, hero }) {
  const s = screen('open', t(kind === 'bare' ? 'crate_bare_sea' : 'crate_' + HS(hero)), 'crates');
  const CO = D.art.tempo.crate_open, P = D.art.palette.rarity;
  const ms = (o) => (G.fast ? o.fast_ms : o.normal_ms) * G.scale;
  const res = openCrate(kind, hero);
  const stage = h('div', { id: 'crateStage' });
  s.appendChild(stage);
  const W = Math.min(innerWidth, 520), cx = W / 2;
  stage.style.maxWidth = '520px'; stage.style.margin = '0 auto'; stage.style.width = '100%';
  const crate = h('img', { src: kind === 'bare' ? 'assets/crate-bare-sea.svg' : `assets/crate-${HS(hero)}.svg`, alt: '', style: 'position:absolute;left:0;top:0;width:140px;height:140px' });
  stage.appendChild(crate);
  setTf(crate, { x: cx - 70, y: 40, s: 1, o: 1 });
  const hint = h('div', { class: 'small', style: 'position:absolute;left:0;right:0;bottom:70px;text-align:center', text: t('crate_tap_salt') });
  stage.appendChild(hint);
  sfx('crate_lid');
  const shakeEl = (el, amp, dur) => { const o = { ...tf(el) }; let k = 0; const n = Math.max(2, Math.round(dur / 40)); const step = () => { if (k++ >= n) { setTf(el, { x: o.x, y: o.y }); return; } setTf(el, { x: o.x + (k % 2 ? amp : -amp), y: o.y }); setTimeout(step, 40); }; if (amp > 0 && !G.reduceMotion && dur > 0) step(); };
  shakeEl(crate, 3, ms(CO.lid));
  const chunks = [];
  const lidMs = ms(CO.lid);
  const cw = Math.min(64, (W - 40) / 5.6), gap = cw * 1.12;
  res.forEach((r, i) => {
    const el = h('div', { class: 'chunk', 'data-chunk': i, style: `width:${cw}px;height:${cw}px` }, [h('div', { class: 'gl', style: `background:radial-gradient(circle, ${P[r.rarity].glow || P[r.rarity].fill} 0%, transparent 70%);opacity:0` }), h('img', { src: `assets/salt-chunk-${r.rarity}.svg`, alt: t('rarity_' + r.rarity) })]);
    stage.appendChild(el);
    const tx = cx - (gap * 5) / 2 + i * gap + (gap - cw) / 2, ty = 220 + (i % 2) * 18;
    setTf(el, { x: cx - cw / 2, y: 90, s: 0.3, o: 0 });
    setTimeout(() => tween(el, { x: tx, y: ty, s: 1, o: 1 }, 200 * G.scale), (lidMs + i * ms({ normal_ms: CO.chunks_in.stagger_normal_ms, fast_ms: CO.chunks_in.stagger_fast_ms })) / Math.max(G.scale, 1e-3) * G.scale);
    chunks.push({ el, r, tx, ty, done: false });
  });
  const teaseAt = lidMs + 5 * CO.chunks_in.stagger_normal_ms * G.scale;
  setTimeout(() => { for (const c of chunks) { const g = c.el.querySelector('.gl'); setTf(g, { o: 0 }); tween(g, { o: CO.pre_glow_ratio[c.r.rarity] }, ms(CO.tease)); if (c.r.rarity === 'coral' || c.r.rarity === 'abyss') shakeEl(c.el, c.r.rarity === 'abyss' ? 3 : 1.5, 600); } }, teaseAt);
  const reveal = (c) => new Promise((ok) => {
    if (c.done) return ok(); c.done = true;
    const r = c.r.rarity, bd = (G.fast ? CO.break_ms[r].fast : CO.break_ms[r].normal) * G.scale;
    sfx('chunk_break_' + r);
    const lv = CO.shake_level[r]; if (lv !== 'none') shakeEl(stage, lv === 'heavy' ? 7 : 4, bd);
    tween(c.el, { s: 1.25, o: 0 }, bd, { done: () => {
      c.el.innerHTML = '';
      const cb = cardBox(c.r.cid, gap * 0.94, { mode: 'full' });
      c.el.appendChild(cb);
      c.el.appendChild(h('div', { class: 'revealTag', style: `top:${Math.round(gap * 0.94 * 1.4) + 2}px;bottom:auto`, text: c.r.isNew ? t('crate_new') : c.r.res ? t('crate_duplicate', { n: c.r.res }) : `${t('currency_ink')} +${c.r.ink}` }));
      setTf(c.el, { x: c.tx - (gap * 0.94 - cw) / 2, y: c.ty, s: 1, o: 1 }); setTf(cb, { s: 1 }); cb.style.transformOrigin = '50% 50%';
      cb._tf = { x: 0, y: 0, s: 1, r: 0, o: 1 }; setTf(cb, { s: 0.01 }); tween(cb, { s: 1 }, ms(CO.reveal_flip), { done: ok });
      c.el.onclick = () => import('./screens.js').then((m) => m.cardDetail(c.r.cid));
    } });
  });
  for (const c of chunks) c.el.addEventListener('pointerdown', () => { unlock(); reveal(c); }, { once: true });
  const all = btn(t('crate_reveal_all'), async () => {
    const order = chunks.filter((c) => !c.done).sort((a, b) => ['sand', 'pearl', 'coral', 'abyss'].indexOf(a.r.rarity) - ['sand', 'pearl', 'coral', 'abyss'].indexOf(b.r.rarity));
    const stg = ms({ normal_ms: CO.break_all_stagger.normal_ms, fast_ms: CO.break_all_stagger.fast_ms });
    for (const c of order) { if (c.r.rarity === 'abyss') await new Promise((r) => setTimeout(r, 400 * G.scale)); reveal(c); await new Promise((r) => setTimeout(r, stg)); }
  }, 'primary', { 'data-act': 'revealAll' });
  s.appendChild(h('div', { class: 'row', style: 'justify-content:center;padding:8px' }, [all, btn(t('menu_back'), () => go('crates'))]));
  return s;
}

// ---------- 부두 시장 ----------
export function marketScreen() {
  const s = screen('market', t('menu_market'));
  const sc = h('div', { class: 'scroll col' });
  const MK = D.balance.economy.dock_market, F = D.balance.economy.crates.faction_crate;
  const item = (img, label, price, onBuy, key) => h('div', { class: 'panel row' }, [h('img', { src: img, alt: '', style: 'width:56px;height:56px' }), h('b', { class: 'grow', text: label }), btn(`${t('market_buy')} · ${price}`, onBuy, '', { 'data-buy': key })]);
  const done = (ok) => { if (!ok) { toast(t('market_not_enough')); sfx('ui_deny'); } else { toast(t('market_bought')); go('market'); } };
  sc.appendChild(item('assets/crate-bare-sea.svg', t('crate_bare_sea'), t('market_price', { n: MK.bare_sea_crate_salt_marks }), () => done(buy({ type: 'bare' })), 'bare'));
  for (const hid of D.heroIds) {
    sc.appendChild(item(`assets/crate-${HS(hid)}.svg`, `${t('crate_' + HS(hid))} (${heroName(hid)})`, t('market_price', { n: MK.faction_crate_salt_marks }), () => done(buy({ type: 'faction', hero: hid })), 'f_' + hid));
    if (M.s.cur.pearl >= F.price_abyss_pearl_alt) sc.appendChild(btn(`${t('crate_' + HS(hid))} · ${t('currency_pearl')} ${F.price_abyss_pearl_alt}`, () => done(buy({ type: 'faction', hero: hid, pearl: true }))));
  }
  const fc = cardById(M.s.daily.featured);
  const fcell = h('div', { class: 'panel row' }, [cardBox(fc.id, 80, { mode: 'full' }), h('div', { class: 'grow col' }, [h('b', { text: t('market_featured') }), h('span', { text: cardName(fc) })]),
    btn(M.s.daily.featuredBought ? t('market_sold_out') : `${t('market_buy')} · ${t('market_price', { n: MK.daily_featured_card_salt_marks[fc.rarity] })}`, () => (M.s.daily.featuredBought ? null : done(buy({ type: 'card', cid: fc.id }))), M.s.daily.featuredBought ? 'off' : '', { 'data-buy': 'featured' })]);
  sc.appendChild(fcell);
  sc.appendChild(h('div', { class: 'dim small', text: t('market_no_real_money') }));
  s.appendChild(sc);
  return s;
}

// ---------- 의뢰 ----------
export function commissionsScreen() {
  const s = screen('commissions', t('commission_daily'));
  const sc = h('div', { class: 'scroll col' });
  M.s.daily.comm.forEach((c, i) => {
    const text = c.type === 'win_hero' ? t('commission_example_win', { name: heroName(c.hero), n: c.n }) : c.type === 'breakwater' ? t('commission_example_breakwater', { n: c.n }) : t('commission_example_brine', { n: c.n });
    const k = Math.min(1, c.prog / c.n);
    sc.appendChild(h('div', { class: 'panel col', 'data-comm': i }, [h('b', { text }), h('div', { class: 'small', text: `${c.prog}/${c.n} · ${t('currency_salt')} ${c.reward}` }), tideBar(k),
      h('div', { class: 'row' }, [
        btn(c.claimed ? t('commission_claimed') : t('commission_claim'), () => { if (claimComm(i)) { sfx('chunk_break_pearl'); go('commissions'); } else sfx('ui_deny'); }, c.prog >= c.n && !c.claimed ? 'primary' : 'off'),
        btn(`${t('commission_reroll')} (${M.s.daily.rerolls})`, () => { if (rerollComm(i)) go('commissions'); else sfx('ui_deny'); }, M.s.daily.rerolls > 0 && !c.claimed ? '' : 'off')])]));
  });
  s.appendChild(sc);
  return s;
}

// ---------- 조수 달력 ----------
export function calendarScreen() {
  const s = screen('calendar', t('calendar_title'));
  const T = D.balance.economy.tide_calendar, m = M.s.tide.marks;
  const sc = h('div', { class: 'scroll col' });
  const step = Math.min(T.steps, Math.floor(m / T.tide_marks_per_step));
  sc.appendChild(h('div', { class: 'panel col' }, [h('b', { text: `${t('calendar_season', { n: 1 })} · ${step}/${T.steps}` }), h('div', { class: 'small', text: `${t('result_tide_marks', { n: m % T.tide_marks_per_step })} / ${T.tide_marks_per_step}` }), tideBar((m % T.tide_marks_per_step) / T.tide_marks_per_step), h('div', { class: 'small dim', text: t('calendar_ends_in', { n: T.season_days }) })]));
  for (let st = Math.max(1, step - 1); st <= Math.min(T.steps, step + 8); st++) {
    const r = tideReward(st, false).map((x) => rewardText(x)).join(' · ');
    sc.appendChild(h('div', { class: 'dline', style: `--fac:${st <= step ? 'var(--heal)' : 'var(--line_soft)'}` }, [h('span', { class: 'c', text: String(st) }), h('span', { class: 'grow', text: r })]));
  }
  s.appendChild(sc);
  return s;
}
export function rewardText(x) {
  if (x.k === 'salt') return `${t('currency_salt')} +${x.n}${x.first ? ' (' + t('result_first_tide_bonus') + ')' : ''}`;
  if (x.k === 'ink') return `${t('currency_ink')} +${x.n}`;
  if (x.k === 'pearl') return `${t('currency_pearl')} +${x.n}`;
  if (x.k === 'crate') return `${t('crate_bare_sea')} +${x.n}`;
  if (x.k === 'faction') return `${t('crate_faction')} +${x.n}`;
  if (x.k === 'tide') return t('result_tide_marks', { n: x.n });
  return '';
}

// ---------- 설정 ----------
export function settingsScreen({ apply }) {
  const s = screen('settings', t('menu_settings'));
  const sc = h('div', { class: 'scroll col' });
  const S = M.s.settings;
  const tog = (key, label) => btn(`${label}: ${S[key] ? t('on') : t('off')}`, () => { S[key] = !S[key]; save(); apply(); go('settings'); }, S[key] ? 'sel' : '', { 'data-set': key });
  sc.appendChild(btn(`${t('settings_language')}: ${L.lang === 'ko' ? '한국어' : 'English'}`, () => { M.s.lang = L.lang === 'ko' ? 'en' : 'ko'; setLang(M.s.lang); save(); go('settings'); }, '', { 'data-set': 'lang' }));
  sc.appendChild(tog('sound', t('settings_sound')));
  sc.appendChild(tog('music', t('settings_music')));
  sc.appendChild(tog('fast', t('settings_fast_view')));
  sc.appendChild(tog('reduceMotion', t('settings_reduce_motion')));
  sc.appendChild(tog('timer', t('settings_turn_timer')));
  s.appendChild(sc);
  void setSound; void setMusic;
  return s;
}

// ---------- 결과 ----------
export function resultOverlay(root, res, rew, opts) {
  const win = res.win, draw = res.winner == null;
  const n = 1 + (G.test ? 0 : Math.floor(Math.random() * 3));
  const box = h('div', { class: 'ovl', id: 'result', style: 'pointer-events:auto;position:fixed' });
  box.appendChild(h('h1', { text: t(draw ? 'result_draw' : win ? 'result_victory' : 'result_defeat'), style: `margin:0;color:${win ? 'var(--wick_flame)' : 'var(--salt_dim)'}` }));
  if (!draw) box.appendChild(h('div', { text: t(`result_${win ? 'victory' : 'defeat'}_sub_${n}`) }));
  box.appendChild(h('div', { class: 'small dim', text: `${t('result_turns', { n: res.len })} · ${t(res.mode || 'mode_practice')}` }));
  if (rew) {
    box.appendChild(h('b', { text: t('result_rewards') }));
    for (const x of rew.list) box.appendChild(h('div', { class: 'small', text: rewardText(x) }));
    for (const x of rew.steps) box.appendChild(h('div', { class: 'small', text: `${t('menu_calendar')}: ${rewardText(x)}` }));
  }
  box.appendChild(h('div', { class: 'row' }, [btn(t('result_rematch'), opts.rematch, 'primary', { 'data-nav': 'rematch' }), btn(t('result_to_menu'), opts.menu, '', { 'data-nav': 'menu' })]));
  root.appendChild(box);
  void show;
  return box;
}
