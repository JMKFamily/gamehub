// 카드·응답자·호명자 DOM (30-art 3절 형태 언어: 한 모서리 깨진 소금유리 판, 아래 매달린 스탯 판). 색은 art.json.
import { D, cardById, portraitURL, fac } from './data.js';
import { t, cardName, cardText, kindKey } from './i18n.js';

export function h(tag, attrs, kids) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
  }
  if (kids) for (const c of [].concat(kids)) if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return e;
}
const img = (src, cls, alt = '') => h('img', { src, class: cls, alt, draggable: 'false' });
export const kwIcon = (k) => `assets/kw-${k}.svg`;
const KW_NAMES = () => D.art.palette.keywords.map((k) => (document.documentElement.lang === 'en' ? k.en : k.ko)).sort((a, b) => b.length - a.length);

function boldText(el, text) {
  // 키워드 낱말을 굵게(10-lore 8-8 "굵은 말을 길게 누르면 뜻")
  const names = KW_NAMES();
  let parts = [text];
  for (const n of names) parts = parts.flatMap((p) => (typeof p === 'string' ? p.split(n).flatMap((s, i, arr) => (i < arr.length - 1 ? [s, { b: n }] : [s])) : [p]));
  for (const p of parts) el.appendChild(typeof p === 'string' ? document.createTextNode(p) : h('b', { text: p.b }));
}

// stats: {cost, atk, hp, base:{cost,atk,hp}} — 바뀐 값은 색으로
export function cardFace(cid, opt = {}) {
  const c = cardById(cid);
  const f = fac(c.owner), rar = D.art.palette.rarity[c.rarity || 'sand'];
  const kind = c.kind === 'spell' ? 'rite' : c.kind === 'weapon' ? 'brand' : 'answerer';
  const mode = opt.mode || 'full';
  const st = opt.stage || 0;
  const el = h('div', { class: `card ${kind} ${mode} st${st}` });
  el.appendChild(h('div', { class: 'plate' }));
  const sp = h('div', { class: 'spine', style: `background:${f.primary}` }); el.appendChild(sp);
  const rc = D.art.recut[st] || D.art.recut[0];
  for (let i = 0; i < rc.frame_groove_lines; i++) el.appendChild(h('div', { class: 'groove' + (i ? ' g2' : ''), style: `border-color:${f.primary}` }));
  el.appendChild(h('div', { class: 'facet', style: `background:${rar.facet}` }));
  const art = h('div', { class: 'art' }, img(c.spare ? 'assets/icon-spare-wick.svg' : portraitURL(cid)));
  el.appendChild(art);
  if (mode === 'full') {
    el.appendChild(h('div', { class: 'name', style: `background:${f.primary};color:${f.ink}`, text: cardName(c) }));
    el.appendChild(img(`assets/rarity-${c.rarity || 'sand'}.svg`, 'rar'));
    const lin = c.lineage ? t('lineage_' + c.lineage) : c.owner === 'neutral' ? t('card_owner_common') : t(`hero_${c.owner.slice(2)}_name`);
    el.appendChild(h('div', { class: 'type', text: `${t(kindKey(c.kind))} · ${lin}` }));
    const tx = h('div', { class: 'text' });
    boldText(tx, cardText(c));
    tx.style.whiteSpace = 'pre-line';
    el.appendChild(tx);
    if (st) el.appendChild(h('div', { class: 'stage', text: t('recut_level_' + st) }));
  }
  const kws = h('div', { class: 'kws' });
  for (const k of (c.kw_ui || []).slice(0, D.art.card.keyword_icons.max)) kws.appendChild(img(kwIcon(k), '', t('kwname_' + k)));
  el.appendChild(kws);
  const s = opt.stats || { cost: c.cost, atk: c.attack, hp: c.health };
  const base = opt.base || { cost: c.cost, atk: c.attack, hp: c.health };
  const cost = h('div', { class: 'cost' + (s.cost < base.cost ? ' down' : s.cost > base.cost ? ' up' : ''), text: String(s.cost) });
  el.appendChild(cost);
  if (kind !== 'rite') {
    const a = h('span', { text: String(s.atk), class: s.atk > base.atk ? 'buffv' : s.atk < base.atk ? 'debuffv' : '' });
    const hp = h('span', { text: String(s.hp), class: opt.damaged ? 'dmgv' : s.hp > base.hp ? 'buffv' : '' });
    el.appendChild(h('div', { class: 'stat', style: `border-color:${f.primary}` }, [a, hp]));
  }
  return el;
}
// 크기 w 픽셀 상자에 맞춘 카드
export function cardBox(cid, w, opt) {
  const k = w / D.art.card.base_w_px;
  const box = h('div', { class: 'cardBox', style: `width:${w}px;height:${Math.round(D.art.card.base_h_px * k)}px` });
  const f = cardFace(cid, opt); f.style.transform = `scale(${k})`;
  box.appendChild(f);
  return box;
}
export function cardBack(w) {
  const k = w / D.art.card.base_w_px;
  const box = h('div', { class: 'cardBox', style: `width:${w}px;height:${Math.round(D.art.card.base_h_px * k)}px` });
  const f = h('div', { class: 'card', style: `transform:scale(${k})` }, h('div', { class: 'back' }, img('assets/card-back.svg')));
  box.appendChild(f);
  return box;
}

// 보드 위 응답자(100x130 기준): 그림 + 스탯 줄 + 키워드 상태(30-art 3-3)
export function tokenEl(m) {
  const c = cardById(m.cid) || {};
  const f = fac(c.owner || 'neutral');
  const el = h('div', { class: 'tok' });
  el._parts = {};
  el.appendChild(el._parts.bw = h('div', { class: 'bw hidden', style: `background:${D.art.palette.keywords.find((k) => k.id === 'breakwater').color}` }));
  el.appendChild(h('div', { class: 'pl', style: `background:${f.deep};border:2px solid ${D.art.palette.ui.stat_tab}` }));
  el.appendChild(img(portraitURL(m.cid), 'pi'));
  el.appendChild(h('div', { style: `position:absolute;left:0;top:0;width:5px;height:120px;background:${f.primary}` }));
  el.appendChild(el._parts.mist = h('div', { class: 'mist hidden', style: `background:${D.art.palette.keywords.find((k) => k.id === 'seamist').color}` }));
  el.appendChild(el._parts.skin = h('div', { class: 'skin hidden' }));
  el.appendChild(el._parts.frz = img(kwIcon('anchor'), 'frz hidden'));
  el.appendChild(el._parts.rdy = img('assets/icon-asleep.svg', 'rdy'));
  el._parts.ki = [0, 1, 2].map((i) => { const e = img(kwIcon('drown'), 'ki hidden'); e.style.top = 20 + i * 24 + 'px'; el.appendChild(e); return e; });
  el.appendChild(el._parts.brn = h('div', { class: 'brn hidden' }));
  el._parts.atk = h('span'); el._parts.hp = h('span');
  el.appendChild(h('div', { class: 'bt', style: `border-color:${f.primary}` }, [el._parts.atk, el._parts.hp]));
  updateToken(el, m);
  return el;
}
const STATE_KW = ['breakwater', 'seamist', 'saltskin', 'first_breath', 'salvage'];
export function updateToken(el, m) {
  const P = el._parts, c = cardById(m.cid) || {};
  const key = JSON.stringify([m.atk, m.hp, m.maxHp, m.kw, m.ready, m.frozen, m.curse, m.baseAtk, m.baseHp]);
  if (el._key === key) return;
  el._key = key;
  P.atk.textContent = m.atk; P.hp.textContent = m.hp;
  P.atk.className = m.atk > m.baseAtk ? 'buffv' : m.atk < m.baseAtk ? 'debuffv' : '';
  P.hp.className = m.hp < m.maxHp ? 'dmgv' : m.maxHp > m.baseHp ? 'buffv' : '';
  P.bw.classList.toggle('hidden', !m.kw.breakwater);
  P.mist.classList.toggle('hidden', !m.kw.seamist);
  P.skin.classList.toggle('hidden', !m.kw.saltskin);
  P.frz.classList.toggle('hidden', !m.frozen);
  P.rdy.src = m.ready ? 'assets/icon-ready.svg' : 'assets/icon-asleep.svg';
  const others = Object.keys(m.kw).filter((k) => m.kw[k] && !STATE_KW.includes(k));
  for (const k of (c.kw_ui || [])) if (['ebb', 'swell', 'kindle', 'wake'].includes(k) && !m.silenced && !others.includes(k)) others.push(k);
  P.ki.forEach((e, i) => { const k = others[i]; e.classList.toggle('hidden', !k); if (k) e.src = kwIcon(k); });
  P.brn.classList.toggle('hidden', !(m.curse > 0)); P.brn.textContent = m.curse > 0 ? '◆' + m.curse : '';
}
