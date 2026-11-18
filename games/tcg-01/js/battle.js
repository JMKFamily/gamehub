// 대전 화면: 규칙 엔진(js/engine = tools/sim 복사본)을 그대로 돌리고, 연출은 확정된 결과를 보여 주기만 한다(30-art 5-1).
// 입력 → 엔진 즉시 적용 → 이벤트 로그로 타임라인 생성. 잠금 중 입력은 예약(최대 3), 예약이 있으면 남은 연출 2배속.
import * as E from './engine/engine.mjs';
import { D, engineData, cardById, portraitURL, fac, warmPortraits, assetURL } from './data.js';
import { t, cardName } from './i18n.js';
import { G, A, T, lockOf, tierOf, Timeline, tween, setTf, tf, phase, after } from './anim.js';
import { FX, fxInit, fxStep, burst, number, arrow, setAim, ring, darken, trail, rnd } from './fx.js';
import { sfx, motif, tension, thump, duck, battleHero } from './audio.js';
import { h, cardBox, cardBack, tokenEl, updateToken, kwIcon } from './cards.js';
import { toast } from './ui.js';

let instIds = new WeakMap(), instNext = 1;
const E_hasGuard = (m) => E.hasKw(m, 'guard');
const iid = (inst) => { let v = instIds.get(inst); if (!v) instIds.set(inst, (v = instNext++)); return v; };
const KWMAP = () => D.engineKw;

export function pickScreen(vw, vh) {
  const S = D.art.layout.screens;
  if (vw < vh) return Math.abs(vw / vh - 360 / 640) <= Math.abs(vw / vh - 412 / 915) ? '360x640' : '412x915';
  return vw >= 960 && vh >= 540 ? '1280x720' : '640x360';
}

export class Battle {
  constructor(root, o) {
    this.root = root; this.o = o;
    this.human = o.human ?? null; // 사람 자리(0|1) 또는 null(AI 대 AI)
    this.auto = this.human == null || !!o.autoplay;
    this.bottom = this.human ?? 0;
    this.ai = Array.isArray(o.ai) ? o.ai : [o.ai || 'eval', o.ai || 'eval'];
    this.AI = o.aiMod;
    this.state = E.createGame({ ...engineData(), seed: o.seed >>> 0, players: [0, 1].map((p) => ({ hero: o.heroes[p], deck: o.decks[p], bt: o.bt ? o.bt[p] || {} : {} })), log: true });
    this.state.players.forEach((P, p) => { P.aiFace = (o.aiFace && o.aiFace[p]) || 1; });
    this.actions = []; this.mull = [null, null]; this.text = []; this.inputs = [];
    this.tokEls = new Map(); this.handEls = new Map();
    this.sel = null; this.press = null; this.zoom = null; this.aiWait = null; this.aiTurnT = 0; this.aiFirst = true; this.actsThisTurn = 0; this.total = 0;
    this.timer = 0; this.idlePenalty = false; this.turnActed = false; this.lastTick = 0;
    this.lines = {}; this.flags = { bigSeen: [false, false], low: [false, false], minScore: [0, 0], comebacks: 0, bubbleLast: {} };
    this.shake = null; this.zoomFx = null; this.stats = { blocks: 0, brine: 0 }; this.over = false; this.started = false; this.result = null;
    this.ctxPhase = 'mulligan';
    this.tut = o.tutorial && this.human != null ? { seen: new Set(o.tutorial.seen || []), cur: null } : null;
    warmPortraits([...o.decks[0], ...o.decks[1], ...Object.keys(D.tokens)]); // 첫 그림 미리(insights 구현 절)
    this.build();
    battleHero(this.state.players[this.bottom].heroId);
    this.vm = this.snap();
    this.deferHand = this.human != null;
    this.render(true);
    if (this.human == null) this.doMulligans(null);
    else this.showMulligan();
  }

  // ---------- 엔진 스냅샷(화면용) ----------
  snap() {
    const st = this.state, KW = KWMAP();
    const mv = (P, m) => {
      const base = P.view[m.cid] || st.db[m.cid] || st.tokens[m.cid] || {};
      const kw = {};
      for (const k of E.KEYWORDS) if (E.hasKw(m, k) && KW[k]) kw[KW[k]] = true;
      const frozen = st.half <= m.freezeUntil;
      const ready = m.owner === st.active && E.attackOf(st, m) > 0 && m.attacks < 1 && !frozen && (!m.sick || E.hasKw(m, 'charge') || E.hasKw(m, 'rush'));
      return { uid: m.uid, cid: m.cid, owner: m.owner, atk: E.attackOf(st, m), hp: m.hp, maxHp: m.maxHp, baseAtk: base.attack, baseHp: base.health, kw, ready, frozen, curse: m.curse, silenced: !!m.silenced };
    };
    return {
      half: st.half, active: st.active, over: st.over, winner: st.winner, pending: st.pending ? { owner: st.pending.owner, options: st.pending.options.slice() } : null,
      players: st.players.map((P) => ({
        heroId: P.heroId, uid: P.hero.uid, hp: P.hero.hp, maxHp: P.hero.maxHp, armor: P.hero.armor, curse: P.hero.curse,
        weapon: P.hero.weapon ? { cid: P.hero.weapon.cid, atk: E.attackOf(st, P.hero), dur: P.hero.weapon.dur } : null,
        mana: P.mana, maxMana: P.maxMana, overloadNow: P.overloadNow, overloadNext: P.overloadNext, deck: P.deck.length,
        hand: P.hand.map((inst) => ({ id: iid(inst), inst, cid: inst.cid, system: !!inst.system, cost: E.costOf(st, P, inst), atk: (E.cardOf(st, P, inst).attack ?? 0) + inst.atkMod, hp: (E.cardOf(st, P, inst).health ?? 0) + inst.hpMod })),
        board: P.board.map((m) => mv(P, m)), secrets: P.secrets.map((s) => s.cid), powerUsed: P.powerUsed,
      })),
    };
  }

  // ---------- 화면 만들기 ----------
  build() {
    const vw = this.root.clientWidth || innerWidth, vh = this.root.clientHeight || innerHeight;
    this.scrKey = pickScreen(vw, vh);
    const S = D.art.layout.screens[this.scrKey];
    this.S = S; this.R = S.rects_px;
    const [W, H] = this.scrKey.split('x').map(Number);
    this.W = W; this.H = H;
    this.k = Math.min(vw / W, vh / H);
    this.root.innerHTML = '';
    const stage = this.stage = h('div', { id: 'stage', style: `width:${W}px;height:${H}px` });
    stage.style.transform = `translate(${((vw - W * this.k) / 2).toFixed(1)}px,${((vh - H * this.k) / 2).toFixed(1)}px) scale(${this.k})`;
    this.root.appendChild(stage);
    const wrap = this.wrap = h('div', { id: 'boardWrap' });
    stage.appendChild(wrap);
    const R = this.R, rect = (r, cls, extra) => h('div', { class: cls, style: `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;${extra || ''}` });
    const bb = (a, b) => ({ x: a.x - 4, y: a.y - 4, w: a.w + 8, h: a.h + 8 });
    wrap.appendChild(rect(bb(R.enemy_board), 'circle'));
    wrap.appendChild(rect(bb(R.my_board), 'circle'));
    this.wet = rect({ x: R.enemy_board.x - 4, y: R.enemy_board.y - 4, w: R.enemy_board.w + 8, h: R.my_board.y + R.my_board.h - R.enemy_board.y + 8 }, '', 'border-radius:14px');
    this.wet.id = 'wet'; wrap.appendChild(this.wet);
    this.slotBgs = { enemy: R.enemy_slots.map((s) => wrap.appendChild(rect(s, 'slotBg'))), my: R.my_slots.map((s) => wrap.appendChild(rect(s, 'slotBg'))) };
    this.sideEls = {};
    for (const side of ['enemy', 'my']) {
      const p = side === 'my' ? this.bottom : 1 - this.bottom;
      const P = this.state.players[p], f = fac(P.heroId), hs = P.heroId.slice(2);
      const hr = R[side + '_hero'];
      const tab = h('div', { class: 'tab' }), sh = h('span', { class: 'sh' }), hp = h('span');
      tab.appendChild(sh); tab.appendChild(hp);
      const wpn = h('div', { class: 'wpn hidden' }), brn = h('div', { class: 'brn hidden' }), sec = h('img', { class: 'sec hidden', src: kwIcon('sealwrit'), alt: t('hud_sealwrit_hidden') });
      const hero = h('div', { class: 'hero', 'data-uid': P.hero.uid, role: 'img', 'aria-label': t(`hero_${hs}_name`) + ' ' + t('hud_aria_lifeline'), style: `--fac:${f.primary};--fac_deep:${f.deep};left:0;top:0;width:${hr.w}px;height:${hr.h}px` },
        [h('div', { class: 'hp' }, h('img', { src: assetURL(`hero-${hs}.svg`), alt: '' })), tab, wpn, brn, sec]);
      setTf(hero, { x: hr.x, y: hr.y });
      hero._pos = { x: hr.x, y: hr.y, w: hr.w, h: hr.h };
      wrap.appendChild(hero);
      const wr = R[side + '_wicks'];
      const wicks = h('div', { class: 'wicks', role: 'meter', 'aria-label': t('hud_aria_wicks'), 'aria-valuemin': 0, 'aria-valuemax': 10, style: `left:${wr.x}px;top:${wr.y}px;width:${wr.w}px;height:${wr.h}px` });
      const bars = []; for (let i = 0; i < 10; i++) { const b = h('i'); bars.push(b); wicks.appendChild(b); }
      const wn = h('b'); wicks.appendChild(wn);
      wrap.appendChild(wicks);
      const cr = R[side + '_calling'];
      const call = h('button', { class: 'callBtn', type: 'button', 'data-k': side === 'my' ? 'power' : 'epower', 'aria-label': t(`hero_${hs}_power`), style: `--fac:${f.primary};left:${cr.x}px;top:${cr.y}px;width:${cr.w}px;height:${cr.h}px` },
        [h('span', { class: 'c', text: String(D.balance.heroes[P.heroId].power_cost_mana) }), h('span', { text: t(`hero_${hs}_power`) })]);
      wrap.appendChild(call);
      const dr = R[side + '_deck'];
      const deckN = h('span');
      wrap.appendChild(h('div', { class: 'deckBox', 'aria-label': t('hud_deck_left'), style: `left:${dr.x}px;top:${dr.y}px;width:${dr.w}px;height:${dr.h}px` }, [h('img', { src: assetURL('icon-deck.svg'), alt: '' }), deckN]));
      let handN = null;
      if (side === 'enemy') { const er = R.enemy_hand; handN = h('span'); this.ehandEl = h('div', { class: 'ehand', 'aria-label': t('hud_hand'), style: `left:0;top:0;width:${er.w}px;height:${er.h}px` }, [h('img', { src: assetURL('card-back.svg'), alt: '' }), handN]); setTf(this.ehandEl, { x: er.x, y: er.y }); wrap.appendChild(this.ehandEl); }
      const bub = h('div', { class: 'bubble' });
      stage.appendChild(bub);
      this.sideEls[side] = { hero, sh, hp, wpn, brn, sec, bars, wn, call, deckN, handN, bub, p };
    }
    const lr = R.log_button;
    wrap.appendChild(h('button', { class: 'logBtn', type: 'button', 'data-k': 'log', 'aria-label': t('menu_settings'), style: `left:${lr.x}px;top:${lr.y}px;width:${lr.w}px;height:${lr.h}px` }, h('img', { src: assetURL('icon-log.svg'), alt: '' })));
    const tr = R.turn_timer;
    this.timerEl = h('div', { class: 'timer', style: `left:${tr.x}px;top:${tr.y}px;width:${tr.w}px` }, [h('div', { class: 'dimline' }), this.burnEl = h('div', { class: 'burn' })]);
    wrap.appendChild(this.timerEl);
    const er = R.end_breath;
    this.endBtn = h('button', { class: 'endBtn', type: 'button', 'data-k': 'end', style: `left:${er.x}px;top:${er.y}px;width:${er.w}px;height:${er.h}px` }, [h('span', { class: 'glow' }), h('span', { text: t('hud_end_breath'), style: 'position:relative' })]);
    stage.appendChild(this.endBtn);
    this.tokLayer = h('div', { class: 'abs' }); wrap.appendChild(this.tokLayer);
    const hr = R.hand;
    this.handLayer = h('div', { class: 'abs' }); stage.appendChild(this.handLayer);
    this.sortMode = this.sortMode || 'hand';
    { // 정렬 버튼(비용순 ↔ 유형순, 48 px): 세로 = 가운데 띠 내 덱 왼쪽, 가로 = 오른쪽 기둥 내 덱 위
      const md = R.my_deck, por = this.S.orientation === 'portrait';
      const sr = por ? { x: md.x - 52, y: md.y, w: 48, h: 48 } : { x: md.x, y: md.y - 56, w: md.w, h: 48 };
      this.sortBtn = h('button', { class: 'btn sortBtn', type: 'button', 'data-k': 'sort', style: `left:${sr.x}px;top:${sr.y}px;width:${sr.w}px;height:${sr.h}px` }); stage.appendChild(this.sortBtn);
      this.sortBtn.textContent = (this.sortMode === 'family' ? t('deck_filter_type') : this.sortMode === 'cost' ? t('deck_filter_cost') : t('hud_hand'));
      if (por) { const tr = R.turn_timer; this.timerEl.style.width = Math.max(40, sr.x - 4 - tr.x) + 'px'; }
    }
    this.vig = h('div', { id: 'vignette', style: `background:radial-gradient(ellipse at center, transparent 55%, ${D.art.palette.state.damage} 140%)` }); stage.appendChild(this.vig);
    const cv = h('canvas', { id: 'fx' }); stage.appendChild(cv);
    fxInit(cv, W, H, this.k * (window.devicePixelRatio || 1));
    const mb = R.mid_band;
    this.banner = h('div', { class: 'banner', style: `top:${mb.y}px;height:${mb.h}px` }, this.bannerText = h('span'));
    stage.appendChild(this.banner);
    this.ovl = h('div', { class: 'abs', style: `width:${W}px;height:${H}px;pointer-events:none` }); stage.appendChild(this.ovl);
    this.live = h('div', { class: 'sr', 'aria-live': 'polite' }); stage.appendChild(this.live);
    stage.addEventListener('pointerdown', (e) => this.onDown(e));
    stage.addEventListener('pointermove', (e) => this.onMove(e));
    stage.addEventListener('pointerup', (e) => this.onUp(e));
    stage.addEventListener('pointercancel', () => this.cancelPress());
  }
  resize() {
    const keep = this.vm; this.tokEls.clear(); this.handEls.clear();
    const z = this.ovl ? [...this.ovl.childNodes] : [];
    this.build(); this.vm = keep; this.render(true);
    for (const c of z) this.ovl.appendChild(c);
  }
  toDesign(e) { const r = this.stage.getBoundingClientRect(); return { x: (e.clientX - r.left) / this.k, y: (e.clientY - r.top) / this.k }; }
  sideOf(p) { return p === this.bottom ? 'my' : 'enemy'; }
  isAI(p) { return this.auto || p !== this.human; }
  myTurn() { return !this.auto && this.started && !this.over && this.state.active === this.human; }

  // ---------- 그리기 ----------
  slotPos(side, i, n) {
    const sl = this.R[side + '_slots'], w = sl[0].w, gap = sl[1].x - sl[0].x - w;
    const total = n * w + (n - 1) * gap, x0 = this.R[side + '_board'].x + (this.R[side + '_board'].w - total) / 2;
    return { x: x0 + i * (w + gap), y: sl[0].y, w, h: sl[0].h };
  }
  handPos(i, n) {
    const r = this.R.hand, cw = r.card_w, ch = r.card_h;
    // 조작 원복(요청자 검수 2026-11-18): 게이트 빌드 간격 식. 10장에서도 왼쪽 띠(유형 기둥·표지) ≥ 29 % 보임
    const step = n > 1 ? Math.min(cw * 0.92, (r.w - cw * 1.35) / (n - 1)) : 0;
    const total = step * (n - 1) + cw, x0 = r.x + Math.max(4, (r.w - total) / 2);
    const c = (n - 1) / 2, off = n > 1 ? (i - c) / c : 0;
    const rot = off * (r.fan_max_rot_deg || 10) * Math.min(1, n / 6) * (n > 7 ? 0.5 : 1);
    const y = this.S.orientation === 'portrait' ? r.y + 10 + Math.abs(off) * Math.abs(off) * 12 : r.y + Math.abs(off) * 6;
    return { x: x0 + i * step, y, w: cw, h: ch, r: rot };
  }
  handOrder(hand) {
    if (this.sortMode === 'hand') return hand.map((hc, i) => i);
    const fam = ['draw', 'buff', 'debuff', 'strike', 'atkdraw'];
    const fo = (hc) => fam.indexOf(cardById(hc.cid).family || 'draw');
    return hand.map((hc, i) => i).sort((a, b) => (this.sortMode === 'family' ? fo(hand[a]) - fo(hand[b]) || hand[a].cost - hand[b].cost : hand[a].cost - hand[b].cost || fo(hand[a]) - fo(hand[b])) || a - b);
  }
  render(instant) {
    const vm = this.vm, st = this.state;
    const D8 = instant ? 0 : 150 * G.scale;
    for (const side of ['enemy', 'my']) {
      const se = this.sideEls[side], P = vm.players[se.p];
      se.hp.textContent = P.hp; se.sh.textContent = P.armor > 0 ? P.armor : '';
      se.hp.className = P.hp < P.maxHp ? 'dmgv' : '';
      se.wpn.classList.toggle('hidden', !P.weapon); if (P.weapon) se.wpn.textContent = `${P.weapon.atk}/${P.weapon.dur}`;
      se.brn.classList.toggle('hidden', !(P.curse > 0)); se.brn.textContent = P.curse > 0 ? '◆' + P.curse : '';
      se.sec.classList.toggle('hidden', !P.secrets.length);
      se.bars.forEach((b, i) => { b.className = i < P.mana ? 'on' : i < P.maxMana - P.overloadNow ? '' : i < P.maxMana ? 'soot' : 'none'; });
      se.wn.textContent = `${P.mana}/${P.maxMana}`;
      const wk = se.bars[0].parentNode; wk.setAttribute('aria-valuenow', P.mana);
      se.deckN.textContent = P.deck;
      if (se.handN) se.handN.textContent = P.hand.length;
      se.call.classList.toggle('used', P.powerUsed);
      // 보드
      const live = new Set();
      P.board.forEach((m, i) => {
        live.add(m.uid);
        let el = this.tokEls.get(m.uid);
        const pos = this.slotPos(side, i, P.board.length), k = pos.w / 100;
        if (!el) {
          el = tokenEl(m); el.dataset.uid = m.uid; this.tokEls.set(m.uid, el); this.tokLayer.appendChild(el);
          setTf(el, { x: pos.x, y: pos.y, s: k * (instant ? 1 : 0.92), o: instant ? 1 : 0 });
          tween(el, { x: pos.x, y: pos.y, s: k, o: 1 }, instant ? 0 : T('play_answerer') * 140 / 440, { ease: 'back' });
        } else {
          updateToken(el, m);
          if (!el._dash && (Math.abs(tf(el).x - pos.x) > 0.5 || Math.abs(tf(el).y - pos.y) > 0.5)) tween(el, { x: pos.x, y: pos.y, s: k, o: 1 }, D8);
        }
        el._pos = pos; el._m = m;
      });
      for (const [uid, el] of this.tokEls) if (el._side === side && !live.has(uid) && !el._dying) { el.remove(); this.tokEls.delete(uid); }
      for (const uid of live) this.tokEls.get(uid)._side = side;
    }
    // 내 손패
    const me = vm.players[this.bottom];
    const seen = new Set();
    const showHand = (!this.auto || this.o.showHand !== false) && !this.deferHand;
    const order = this.handOrder(me.hand);
    if (showHand) me.hand.forEach((hc, i0) => {
      const i = order.indexOf(i0);
      seen.add(hc.id);
      let el = this.handEls.get(hc.id);
      const pos = this.handPos(i, me.hand.length);
      const ps = pos.s || 1;
      const key = `${hc.cost}|${hc.atk}|${hc.hp}`;
      if (!el) {
        el = h('div', { class: 'hcard', 'data-hand': hc.id, style: `width:${this.R.hand.card_w}px;height:${this.R.hand.card_h}px` });
        this.handLayer.appendChild(el); this.handEls.set(hc.id, el);
        const dr = this.R.my_deck;
        setTf(el, instant ? { x: pos.x, y: pos.y, r: pos.r, s: 1, o: 1 } : { x: dr.x, y: dr.y, s: 0.5, r: 0, o: 0 });
        if (!instant) tween(el, { x: pos.x, y: pos.y, r: pos.r, s: 1, o: 1 }, T('card_draw'));
      } else if (!el._lift && !el._drag) tween(el, { x: pos.x, y: pos.y, r: pos.r, s: ps, o: 1 }, D8);
      if (el._key !== key) {
        el._key = key; el.innerHTML = '';
        const c = cardById(hc.cid), P = st.players[this.bottom], base = (P.view[hc.cid] || c);
        el.appendChild(cardBox(hc.cid, this.R.hand.card_w, { mode: 'hand', stats: { cost: hc.cost, atk: hc.atk, hp: hc.hp }, base: { cost: base.cost, atk: base.attack, hp: base.health } }));
        el.appendChild(h('div', { class: 'hname', text: cardName(c) }));
      }
      el._pos = pos; el._hc = hc; el.style.zIndex = el._lift ? 40 : i + 1;
    });
    for (const [id, el] of this.handEls) if (!seen.has(id) && !el._flying) { el.remove(); this.handEls.delete(id); }
    this.renderHints();
  }
  // 낼 수 있는 카드·공격 가능·숨 고르기 강조·치명 가능 표시
  renderHints() {
    const my = this.myTurn() && !A.busy && !this.state.pending;
    const acts = my ? E.legalActions(this.state) : [];
    this.legal = acts;
    const P = this.state.players[this.bottom];
    const playable = new Set(acts.filter((a) => a.type === 'play').map((a) => P.hand[a.hand]).map((inst) => inst && this.keyOf(inst)));
    for (const [, el] of this.handEls) { const ok = !!el._hc && playable.has(this.keyOf(el._hc.inst)); el.classList.toggle('can', my && ok); el.classList.toggle('dimc', my && !ok); }
    this.handLayer.classList.toggle('eturn', this.started && !this.over && !this.myTurn() && !this.auto);
    const P0 = this.vm.players[this.bottom]; if (this.sideEls.my.deckN) this.sideEls.my.deckN.parentNode.classList.toggle('warnN', P0.hand.length >= 9);
    const atk = new Set(acts.filter((a) => a.type === 'attack').map((a) => a.attacker));
    for (const [uid, el] of this.tokEls) el.classList.toggle('can', atk.has(uid));
    this.sideEls.my.hero.classList.toggle('can', atk.has(P.hero.uid));
    this.sideEls.my.call.classList.toggle('can', acts.some((a) => a.type === 'power'));
    this.endBtn.classList.toggle('ready', my && acts.length === 1);
    this.endBtn.classList.toggle('off', !this.myTurn());
    // 치명 가능(내 화면만): 영웅을 칠 수 있는 공격 합 ≥ 상대 명줄+껍질
    const E1 = this.state.players[1 - this.bottom].hero;
    const face = new Map();
    for (const a of acts) if (a.type === 'attack' && a.target === E1.uid) { const m = E.findChar(this.state, a.attacker); face.set(a.attacker, E.attackOf(this.state, m)); }
    const sum = [...face.values()].reduce((x, y) => x + y, 0);
    this.sideEls.enemy.hero.classList.toggle('lethal', my && sum > 0 && sum >= E1.hp + E1.armor);
  }
  keyOf(inst) { return inst.cid + '|' + inst.costMod + '|' + inst.atkMod + '|' + inst.hpMod + '|' + inst.dmgMod + '|' + (inst.system ? 1 : 0); }
  posOfUid(uid) {
    const se = Object.values(this.sideEls).find((s) => +s.hero.dataset.uid === uid);
    if (se) { const p = se.hero._pos; return { x: p.x + p.w / 2, y: p.y + p.h / 2, el: se.hero }; }
    const el = this.tokEls.get(uid);
    if (el && el._pos) { const p = el._pos; return { x: p.x + p.w / 2, y: p.y + p.h / 2, el }; }
    return null;
  }

  // ---------- 첫 물때(멀리건) ----------
  showMulligan() {
    const P = this.state.players[this.human];
    const pick = new Set();
    const box = h('div', { class: 'ovl', style: 'pointer-events:auto' });
    box.appendChild(h('h3', { text: t('mulligan_title'), style: 'margin:0' }));
    box.appendChild(h('div', { class: 'dim small', text: t(this.human === 0 ? 'coin_first' : 'coin_second') + ' · ' + t('mulligan_desc') }));
    const row = h('div', { class: 'row', style: 'justify-content:center' });
    const w = Math.min(110, (this.W - 24) / P.hand.length - 14), cells = [];
    P.hand.forEach((inst, i) => {
      const cell = h('button', { class: 'btn', type: 'button', style: 'padding:4px;height:auto;flex-direction:column', 'data-mull': i });
      cell.appendChild(cardBox(inst.cid, w, { mode: 'full' }));
      const mark = h('span', { class: 'small', text: '' });
      cell.appendChild(mark);
      cell.addEventListener('click', () => { if (pick.has(i)) pick.delete(i); else pick.add(i); cell.classList.toggle('sel', pick.has(i)); mark.textContent = pick.has(i) ? '↻' : ''; sfx('ui_tap'); });
      cells.push(cell);
    });
    requestAnimationFrame(() => { for (const c of cells) row.appendChild(c); }); // 카드 줄은 다음 프레임(첫 화면을 먼저)
    box.appendChild(row);
    this.mullT = D.balance.rules.mulligan_time_s * 1000;
    const ok = h('button', { class: 'btn primary', type: 'button', 'data-k': 'mullok', text: t('mulligan_confirm') });
    ok.addEventListener('click', () => { box.remove(); this.mullBox = null; this.doMulligans([...pick]); });
    box.appendChild(ok);
    this.ovl.appendChild(box); this.mullBox = box; this.mullPick = pick;
    if (this.tut && !this.tut.seen.has('tut_mulligan') && this.o.tutorial.coach) { this.tut.seen.add('tut_mulligan'); this.o.tutorial.onSeen('tut_mulligan'); this.o.tutorial.coach([{ key: 'tut_mulligan', el: row }], () => this.tutEnd(true)); }
    this.handLayer.style.visibility = 'hidden'; // 첫 물때 동안 손패 부채꼴 숨김(이중 표시 방지, round-2 D17)
  }
  doMulligans(humanPick) {
    const st = this.state;
    for (const p of [0, 1]) {
      const idx = p === this.human && humanPick ? humanPick : this.AI.mulligan(st, p, this.ai[p]);
      this.mull[p] = idx.slice();
      E.applyMulligan(st, p, idx);
    }
    const li = st.log.length;
    E.startGame(st);
    this.started = true; this.ctxPhase = 'play'; this.t0 = G.now; this.deferHand = false;
    this.handLayer.style.visibility = '';
    this.vm = this.snap(); this.render(true);
    const ev = st.log.slice(li);
    const tl = new Timeline('game_start', { lock: 0, tier: 1 });
    this.turnStartFx(tl, 0, ev);
    const vs = (a, b) => (`line_${this.state.players[a].heroId.slice(2)}_vs_${this.state.players[b].heroId.slice(2)}` in D.strings.ko ? 'vs_' + this.state.players[b].heroId.slice(2) : 'entry'); // 맞대결 첫 대사(10-lore 4-8)
    this.say(1 - this.bottom, vs(1 - this.bottom, this.bottom), tl, 0);
    this.say(this.bottom, vs(this.bottom, 1 - this.bottom), tl, D.art.tempo.immersion.hero_lines.triggers[0].gap_ms * G.scale);
    A.play(tl);
    this.onTurnStart();
  }

  // ---------- 입력 ----------
  onDown(e) {
    if (this.o.onAnyInput) this.o.onAnyInput();
    const t0 = e.timeStamp || performance.now();
    const p = this.toDesign(e);
    const tgt = this.hit(e);
    this.markInput(t0, tgt ? tgt.k : 'none');
    if (this.zoom && !(tgt && tgt.k === 'zoom')) { this.closeZoom(); if (!this.sel) return; }
    if (!this.myTurn() && this.started && !this.over) { A.boost = D.art.tempo.ai_turn.player_tap_speeds_up_ratio; }
    if (A.cur && A.cur.meta.skippable && A.cur.t >= A.cur.meta.skippable) A.finishAll();
    if (!tgt) { this.clearSel(); return; }
    if (this.tut && this.tut.cur && !this.tut.cur.act) this.tutClose(); // 패널 밖 탭으로 넘김(행동 단계는 그 행동으로)
    if (tgt.k === 'tut') return;
    if (this.sel && this.isSelTarget(tgt)) { this.commitSel(tgt); return; }
    if (tgt.k === 'hand') {
      const el = this.handEls.get(tgt.id);
      if (!el) return;
      if (!(this.sel && this.sel.k === 'hand' && this.sel.id === tgt.id)) this.clearSel(true);
      el._lift = true; el.style.zIndex = 40;
      const lift = this.S.orientation === 'portrait' ? 24 : el._pos.h - (this.R.hand.peek_px || el._pos.h) + 8;
      tween(el, { x: el._pos.x, y: el._pos.y - lift, r: 0, s: 1.15, o: 1 }, T('card_hover'));
      sfx('card_hover');
      this.press = { k: 'hand', id: tgt.id, el, x0: p.x, y0: p.y, t0: G.now, moved: false };
      this.pressTimer = setTimeout(() => { if (this.press && !this.press.moved) { this.press.long = true; this.openZoom(el._hc.cid, el._hc); } }, 350);
    } else if (tgt.k === 'tok' || tgt.k === 'hero') {
      const mine = this.myTurn() && this.legal && this.legal.some((a) => a.type === 'attack' && a.attacker === tgt.uid);
      const el = tgt.el;
      setTf(el, { s: tf(el).s * 1.04 });
      this.press = { k: mine ? 'atk' : 'info', uid: tgt.uid, el, x0: p.x, y0: p.y, moved: false };
      sfx('ui_tap');
      this.pressTimer = setTimeout(() => { if (this.press && !this.press.moved) { this.press.long = true; this.openInfo(tgt.uid); } }, 350);
    } else if (tgt.k === 'power' || tgt.k === 'end' || tgt.k === 'log' || tgt.k === 'epower') {
      setTf(tgt.el, { s: 0.94 }); sfx('ui_tap');
      this.press = { k: tgt.k, el: tgt.el, x0: p.x, y0: p.y };
    } else if (tgt.k === 'sort') {
      setTf(tgt.el, { s: 0.94 }); this.press = { k: tgt.k, el: tgt.el, x0: p.x, y0: p.y };
    } else if (tgt.k === 'zoom') {
      this.press = { k: 'zoom' };
    } else if (tgt.k === 'board') {
      this.press = { k: 'board', x0: p.x, y0: p.y };
    }
  }
  onMove(e) {
    const pr = this.press; if (!pr) return;
    const p = this.toDesign(e);
    if (!pr.moved && Math.hypot(p.x - pr.x0, p.y - pr.y0) > 8) { pr.moved = true; clearTimeout(this.pressTimer); if (this.zoom && pr.k === 'hand') this.closeZoom(); }
    if (!pr.moved) return;
    if (pr.k === 'hand' && this.myTurn()) {
      const hc = pr.el._hc, needT = this.targetsFor({ k: 'hand', inst: hc.inst });
      if (needT && needT.length) { const o = pr.el._pos; setAim({ x0: o.x + o.w / 2, y0: o.y, x1: p.x, y1: p.y }); this.glowTargets(needT); }
      else { pr.el._drag = true; setTf(pr.el, { x: p.x - pr.el._pos.w / 2, y: p.y - pr.el._pos.h / 2, r: 0, s: 1 }); }
    } else if (pr.k === 'atk' || (pr.k === 'power' && this.powerTargets().length)) {
      const o = pr.k === 'atk' ? this.posOfUid(pr.uid) : { x: pr.el.offsetLeft + pr.el.offsetWidth / 2, y: pr.el.offsetTop };
      setAim({ x0: o.x, y0: o.y, x1: p.x, y1: p.y });
      this.glowTargets(pr.k === 'atk' ? this.targetsFor({ k: 'atk', uid: pr.uid }) : this.powerTargets());
    }
  }
  onUp(e) {
    const pr = this.press; this.press = null; clearTimeout(this.pressTimer);
    if (!pr) return;
    setAim(null);
    const tgt = this.hit(e), p = this.toDesign(e);
    if (pr.k === 'power' || pr.k === 'end' || pr.k === 'log' || pr.k === 'epower') setTf(pr.el, { s: 1 });
    if (pr.k === 'tok' || pr.k === 'atk' || pr.k === 'info') { const el = pr.el; if (el && el._pos) setTf(el, { s: el._pos.w / 100 }); else if (el) setTf(el, { s: 1 }); }
    if (pr.long) { if (pr.k === 'hand') this.dropHand(pr.el); return; }
    if (pr.k === 'hand') {
      const el = pr.el, hc = el._hc;
      if (pr.moved) {
        const targets = this.targetsFor({ k: 'hand', inst: hc.inst });
        if (targets && targets.length) { const tt = tgt && targets.find((x) => x.uid === tgt.uid); this.dropHand(el); this.clearGlow(); if (tt) this.input({ k: 'play', inst: hc.inst, target: tt.uid }); return; }
        const inBoard = p.y < this.R.hand.y - 4 && p.y > this.R.enemy_board.y;
        el._drag = false;
        if (inBoard) { const pos = this.dropPos(p.x); this.input({ k: 'play', inst: hc.inst, pos, from: { ...tf(el) } }); return; }
        this.dropHand(el); return;
      }
      // 탭: 선택(확대 보기) → 다시 탭/칸 탭/대상 탭으로 내기
      if (this.sel && this.sel.k === 'hand' && this.sel.id === pr.id && !(this.targetsFor(this.sel) || []).length) { this.commitSel(null); return; }
      this.select({ k: 'hand', id: pr.id, inst: hc.inst, el });
      return;
    }
    if (pr.k === 'atk') {
      if (pr.moved) { const ts = this.targetsFor({ k: 'atk', uid: pr.uid }); const tt = tgt && ts.find((x) => x.uid === tgt.uid); this.clearGlow(); if (tt) this.input({ k: 'attack', attacker: pr.uid, target: tt.uid }); else if (tgt && (tgt.k === 'tok' || tgt.k === 'hero')) this.denyAttack(pr.uid, tgt.uid); return; }
      this.select({ k: 'atk', uid: pr.uid }); return;
    }
    if (pr.k === 'info') { if (!this.myTurn() || !pr.moved) { if (this.sel) this.clearSel(); this.openInfo(pr.uid); } return; }
    if (pr.k === 'power') {
      if (!this.myTurn()) return;
      const ts = this.powerTargets();
      const need = D.balance.heroes[this.state.players[this.human].heroId].power_target;
      if (need) { if (pr.moved) { const tt = tgt && ts.find((x) => x.uid === tgt.uid); this.clearGlow(); if (tt) this.input({ k: 'power', target: tt.uid }); return; } this.select({ k: 'power' }); return; }
      this.input({ k: 'power' }); return;
    }
    if (pr.k === 'epower') { this.openPowerInfo(1 - this.bottom); return; }
    if (pr.k === 'end') { this.clearSel(); this.input({ k: 'end' }); return; }
    if (pr.k === 'log') { this.openLog(); return; }
    if (pr.k === 'sort') { setTf(pr.el || this.sortBtn, { s: 1 }); this.sortMode = { hand: 'cost', cost: 'family', family: 'hand' }[this.sortMode]; sfx('ui_tap'); this.sortBtn.textContent = (this.sortMode === 'family' ? t('deck_filter_type') : this.sortMode === 'cost' ? t('deck_filter_cost') : t('hud_hand')); this.render(); return; }
    if (pr.k === 'zoom') { if (this.sel && this.sel.k === 'hand' && !(this.targetsFor(this.sel) || []).length) this.commitSel(null); else this.closeZoom(); return; }
    if (pr.k === 'board') { if (this.sel && this.sel.k === 'hand' && !(this.targetsFor(this.sel) || []).length) this.commitSel(null, this.dropPos(p.x)); else this.clearSel(); }
  }
  cancelPress() { const pr = this.press; this.press = null; setAim(null); if (pr && pr.k === 'hand') this.dropHand(pr.el); }
  dropHand(el) { if (!el) return; el._lift = false; el._drag = false; if (el._pos) tween(el, { x: el._pos.x, y: el._pos.y, r: el._pos.r, s: 1, o: 1 }, T('card_hover')); }
  dropPos(x) { const n = this.vm.players[this.bottom].board.length; let i = 0; for (; i < n; i++) { const s = this.slotPos('my', i, n); if (x < s.x + s.w / 2) break; } return i; }
  hit(e) {
    let el = document.elementFromPoint(e.clientX, e.clientY);
    for (; el && el !== this.stage; el = el.parentElement) {
      if (el.dataset.hand) return { k: 'hand', id: +el.dataset.hand, el };
      if (el.classList.contains('zoomWrap')) return { k: 'zoom', el };
      if (el.classList.contains('tut')) return { k: 'tut', el };
      if (el.dataset.uid) return { k: el.classList.contains('hero') ? 'hero' : 'tok', uid: +el.dataset.uid, el };
      if (el.dataset.k) return { k: el.dataset.k, el };
    }
    return { k: 'board' };
  }
  markInput(t0, kind) {
    const rec = { kind, input_ms: Math.round(t0), first_frame_ms: null, response_ms: null };
    this.inputs.push(rec);
    if (this.inputs.length > 400) this.inputs.shift();
    requestAnimationFrame((ts) => { rec.first_frame_ms = Math.round(ts); rec.response_ms = Math.max(0, Math.round(performance.now() - t0)); });
  }
  targetsFor(sel) {
    if (!this.legal) return [];
    const st = this.state, P = st.players[this.bottom];
    if (sel.k === 'hand') {
      const key = this.keyOf(sel.inst);
      const acts = this.legal.filter((a) => a.type === 'play' && P.hand[a.hand] && this.keyOf(P.hand[a.hand]) === key && a.target != null);
      return [...new Set(acts.map((a) => a.target))].map((uid) => ({ uid }));
    }
    if (sel.k === 'atk') return this.legal.filter((a) => a.type === 'attack' && a.attacker === sel.uid).map((a) => ({ uid: a.target }));
    if (sel.k === 'power') return this.powerTargets();
    return [];
  }
  powerTargets() { return (this.legal || []).filter((a) => a.type === 'power' && a.target != null).map((a) => ({ uid: a.target })); }
  glowTargets(ts) { this.clearGlow(); const u = new Set(ts.map((x) => x.uid)); for (const [uid, el] of this.tokEls) el.classList.toggle('tgt', u.has(uid)); for (const s of Object.values(this.sideEls)) s.hero.classList.toggle('tgt', u.has(+s.hero.dataset.uid)); }
  clearGlow() { for (const [, el] of this.tokEls) el.classList.remove('tgt'); for (const s of Object.values(this.sideEls)) s.hero.classList.remove('tgt'); }
  select(sel) {
    this.clearSel(true);
    this.sel = sel;
    if (sel.k === 'hand') { this.openZoom(sel.inst.cid, sel.el._hc, true); sel.el.classList.add('selA'); }
    if (sel.k === 'atk') { const el = this.posOfUid(sel.uid).el; el.classList.add('selA'); }
    const ts = this.targetsFor(sel); this.glowTargets(ts);
    if (sel.k === 'atk' || sel.k === 'power' || ts.length) {
      const o = sel.k === 'atk' ? this.posOfUid(sel.uid) : sel.k === 'power' ? { x: this.R.my_calling.x + this.R.my_calling.w / 2, y: this.R.my_calling.y } : { x: sel.el._pos.x + sel.el._pos.w / 2, y: sel.el._pos.y };
      this.selOrigin = o;
    }
  }
  clearSel(keepZoom) {
    if (this.sel) { if (this.sel.el) { this.sel.el.classList.remove('selA'); this.dropHand(this.sel.el); } if (this.sel.k === 'atk') { const p = this.posOfUid(this.sel.uid); if (p) p.el.classList.remove('selA'); } }
    this.sel = null; this.clearGlow(); setAim(null);
    if (!keepZoom) this.closeZoom();
  }
  isSelTarget(tgt) { return (tgt.k === 'tok' || tgt.k === 'hero') && this.targetsFor(this.sel).some((x) => x.uid === tgt.uid); }
  commitSel(tgt, pos) {
    const s = this.sel; this.clearSel();
    if (!s) return;
    if (s.k === 'hand') this.input({ k: 'play', inst: s.inst, target: tgt ? tgt.uid : null, pos });
    else if (s.k === 'atk') this.input({ k: 'attack', attacker: s.uid, target: tgt.uid });
    else if (s.k === 'power') this.input({ k: 'power', target: tgt.uid });
  }
  denyAttack(att, target) {
    const st = this.state, m = E.findChar(st, att), tt = E.findChar(st, target);
    if (!m || !tt) return;
    if (tt.owner === m.owner) return;
    const el = (u) => this.posOfUid(u)?.el;
    if (!tt.isHero && E.hasKw(tt, 'stealth')) return this.deny('toast_seamist_untargetable', { flash: [el(tt.uid)] });
    const guards = st.players[tt.owner].board.filter((x) => E.hasKw(x, 'guard') && !E.hasKw(x, 'stealth'));
    if (guards.length && !E.hasKw(tt, 'guard')) return this.deny('toast_must_hit_breakwater', { flash: guards.map((g) => el(g.uid)) });
    if (st.half <= m.freezeUntil) return this.deny('toast_anchored', { flash: [el(m.uid)], shake: el(m.uid) });
    if (m.sick) return this.deny('toast_cant_attack_yet', { flash: [el(m.uid)], shake: el(m.uid) });
  }
  markWicks(n) { const P = this.vm.players[this.bottom]; const bars = this.sideEls.my.bars; for (let i = P.mana; i < Math.min(10, P.mana + n); i++) { const b = bars[i]; b.classList.add('denyFlash'); after(D.art.ux.deny_feedback.common.chip_ms * G.scale || 1, () => b.classList.remove('denyFlash')); } }
  // 안 되는 이유(30-art 11-4, art.json ux.deny_feedback): 흔들림 5 px·120 ms, ui_deny, 원인 요소 빛남 + 이유 칩 1.2 s
  deny(key, o = {}) {
    const F = D.art.ux.deny_feedback.common;
    sfx(F.sfx); this.denies = (this.denies || 0) + 1;
    const flash = (o.flash || []).filter(Boolean);
    for (const e of flash) { e.classList.add('denyFlash'); after(F.chip_ms * G.scale || 1, () => e.classList.remove('denyFlash')); }
    if (o.shake) { const e = o.shake, b = { ...tf(e) }; tween(e, { x: b.x + F.shake_px }, F.shake_ms / 4, { keep: true, done: () => tween(e, { x: b.x - F.shake_px }, F.shake_ms / 2, { keep: true, done: () => tween(e, { x: b.x }, F.shake_ms / 4, { keep: true }) }) }); }
    if (o.card) { const e = o.card; after(F.return_card_ms * G.scale, () => this.dropHand(e)); }
    const near = o.near || flash[0];
    const chip = h('div', { class: 'denyChip', role: 'status', style: `background:${F.chip_bg};border:2px solid ${F.chip_border};color:${F.chip_ink};font-size:${F.chip_font_px}px`, text: (o.mark ? o.mark + ' ' : '') + t(key) });
    this.stage.appendChild(chip);
    let x = this.W / 2, y = this.R.mid_band.y + this.R.mid_band.h / 2;
    if (near && near._pos) { x = near._pos.x + near._pos.w / 2; y = near._pos.y - 4; }
    else if (near && near.offsetParent) { const r = near.getBoundingClientRect(), sr = this.stage.getBoundingClientRect(); x = (r.left + r.width / 2 - sr.left) / this.k; y = (r.top - sr.top) / this.k - 4; }
    const cw = chip.offsetWidth || 120, chh = chip.offsetHeight || 24;
    chip.style.left = Math.max(4, Math.min(this.W - cw - 4, x - cw / 2)) + 'px'; chip.style.top = Math.max(4, Math.min(this.H - chh - 4, y - chh)) + 'px';
    after(F.chip_ms * G.scale || 1, () => chip.remove());
    this.lastDeny = key;
    return { ok: false, reason: key };
  }

  // 사람 행동 진입점(포인터·테스트 훅 공통). 잠금 중이면 예약.
  input(it) {
    if (!this.myTurn()) return this.deny('turn_enemy', { near: this.timerEl, flash: [this.timerEl], card: it.inst && this.handEls.get(iid(it.inst)) });
    if (A.locked || A.queue.length) {
      if (A.queue.length >= D.art.tempo.input.queue_max_actions) return { ok: false, reason: 'queue_full' };
      A.queue.push(it); return { ok: true, queued: true };
    }
    if (A.busy) A.finishAll();
    return this.exec(it);
  }
  exec(it) {
    if (!this.myTurn()) return { ok: false, reason: 'not_your_turn' };
    const st = this.state, P = st.players[this.human];
    if (st.pending) return { ok: false, reason: 'pending' };
    const legal = E.legalActions(st);
    let a = null;
    if (it.k === 'end') a = { type: 'end' };
    else if (it.k === 'power') {
      a = legal.find((x) => x.type === 'power' && (x.target ?? null) === (it.target ?? null));
      if (!a) { const cb = this.sideEls.my.call; if (P.powerUsed) return this.deny('hud_calling_used', { flash: [cb], mark: '✓' }); if (P.mana < D.balance.heroes[P.heroId].power_cost_mana) { this.say(this.human, 'no_wicks'); return this.deny('toast_no_wicks', { flash: [this.sideEls.my.bars[0].parentNode] }); } return this.deny('toast_no_target', { flash: [cb], mark: '⊘' }); }
    } else if (it.k === 'attack') {
      a = legal.find((x) => x.type === 'attack' && x.attacker === it.attacker && x.target === it.target);
      if (!a) return this.denyAttack(it.attacker, it.target) || { ok: false, reason: 'illegal' };
    } else if (it.k === 'play') {
      const hi = P.hand.indexOf(it.inst);
      if (hi < 0) return { ok: false, reason: 'gone' };
      const key = this.keyOf(it.inst);
      const m = legal.find((x) => x.type === 'play' && P.hand[x.hand] && this.keyOf(P.hand[x.hand]) === key && (x.target ?? null) === (it.target ?? null) && (it.target2 == null || x.target2 === it.target2));
      if (!m) {
        const c = E.cardOf(st, P, it.inst);
        const ce = this.handEls.get(iid(it.inst));
        if (E.costOf(st, P, it.inst) > P.mana) { this.say(this.human, 'no_wicks'); this.markWicks(E.costOf(st, P, it.inst) - P.mana); return this.deny('toast_no_wicks', { flash: [this.sideEls.my.bars[0].parentNode], shake: ce, card: ce }); }
        if (c.kind === 'minion' && P.board.length >= st.rules.board_limit) return this.deny('toast_circle_full', { flash: [...this.slotBgs.my], near: this.slotBgs.my[2], shake: ce, card: ce });
        if (c.target && it.target == null) return this.deny('toast_no_target', { flash: [ce], shake: ce, card: ce, mark: '⊘' });
        return { ok: false, reason: 'illegal' };
      }
      a = { ...m, hand: hi };
      if (it.pos != null && E.cardOf(st, P, it.inst).kind === 'minion') a.pos = it.pos;
    }
    if (!a) return { ok: false, reason: 'illegal' };
    this.turnActed = true;
    this.perform(a, it);
    return { ok: true, action: a };
  }

  // ---------- 행동 실행 + 연출 ----------
  perform(a, it) {
    const st = this.state, p = st.active, P = st.players[p];
    const before = this.snap();
    const info = {};
    if (a.type === 'play') {
      const inst = P.hand[a.hand];
      info.cid = inst.cid; info.card = E.cardOf(st, P, inst); info.system = !!inst.system;
      const el = this.handEls.get(iid(inst));
      info.from = el ? { ...tf(el), w: el._pos.w, h: el._pos.h } : null;
      if (el) { el._flying = true; el.remove(); this.handEls.delete(iid(inst)); }
    }
    if (a.type === 'attack') { const m = E.findChar(st, a.attacker); info.atk = E.attackOf(st, m); info.attackerIsHero = !!m.isHero; }
    const li = st.log.length;
    const heroHp0 = st.players.map((Q) => Q.hero.hp + Q.hero.armor);
    E.applyAction(st, a);
    const ev = st.log.slice(li);
    this.actions.push({ half: st.half, p, a: { ...a } });
    if (a.type !== 'end' && a.type !== 'choose') this.actsThisTurn++;
    this.total++;
    this.logText(p, a, info, ev);
    const after = this.snap();
    // 의뢰용 집계
    if (a.type === 'attack' && this.human != null && p !== this.human) { const tg = before.players[this.human].board.find((m) => m.uid === a.target); if (tg && tg.kw.breakwater) this.stats.blocks++; }
    if (a.type === 'end' && this.human != null && st.active !== this.human) {
      const E1 = before.players[1 - this.human], cursed = new Map([[E1.uid, E1.curse], ...E1.board.map((m) => [m.uid, m.curse])]);
      const seenU = new Set(); let tick = false;
      for (const x of ev) { if (x.t === 'turn') tick = true; if (tick && x.t === 'dmg' && cursed.get(x.uid) > 0 && !seenU.has(x.uid)) { seenU.add(x.uid); this.stats.brine += x.n; } }
    }
    const tl = this.buildTL(a, p, before, after, ev, info, heroHp0);
    { const ar = ev.find((x) => x.t === 'armor'); if (ar && this.flags.armorGain == null) this.flags.armorGain = ar.p; }
    if (this.tut && this.tut.cur && p === this.human && this.tut.cur.act && this.tut.cur.act(a)) this.tutClose();
    this.vmNext = after;
    A.play(tl);
    if (a.type === 'end' || st.half !== before.half) this.onTurnStart();
    this.checkMoments(after, tl);
    return tl;
  }

  // 사망 중인 응답자를 남긴 중간 화면
  mergeDying(after, before, dying, ev) {
    const out = { ...after, players: after.players.map((P, p) => {
      const bb = before.players[p].board;
      const list = P.board.slice();
      bb.forEach((m, i) => { if (dying.has(m.uid)) { let hp = m.hp; for (const x of ev) if (x.uid === m.uid && x.t === 'dmg') hp -= x.n; list.splice(Math.min(i, list.length), 0, { ...m, hp: Math.min(hp, 0) }); } });
      return { ...P, board: list };
    }) };
    return out;
  }

  buildTL(a, p, before, after, ev, info, heroHp0) {
    const st = this.state, side = this.sideOf(p), q = 1 - p;
    const dying = new Set(ev.filter((x) => x.t === 'die').map((x) => x.uid));
    let kind = a.type === 'play' ? (info.card.kind === 'minion' ? 'play_answerer' : info.card.kind === 'weapon' ? 'play_brand' : 'play_rite') : a.type === 'attack' ? 'attack' : a.type === 'power' ? 'calling' : a.type === 'end' ? 'end_breath_press' : 'mulligan_swap';
    const big = a.type === 'play' && !info.system && (info.card.cost >= 7 || info.card.rarity === 'abyss');
    if (big) kind = 'big_entry';
    const lethal = after.over && after.winner != null;
    // 강약: 이번 행동이 상대 호명자에게 준 피해·한 번 최대 피해·사망 수
    const dmgMax = ev.filter((x) => x.t === 'dmg').reduce((m, x) => Math.max(m, x.n), 0);
    const heroDealt = heroHp0[q] - (st.players[q].hero.hp + st.players[q].hero.armor);
    const crit = dmgMax >= 8 || (heroDealt > 0 && heroDealt >= heroHp0[q] / 2);
    let tier = tierOf(kind);
    if (a.type === 'attack' && info.atk >= 5) tier = Math.max(tier, 2);
    if (dying.size >= 3) tier = Math.max(tier, 2);
    if (crit || big || lethal) tier = 3;
    const TI = D.art.tempo.tiers[tier];
    const tl = new Timeline(lethal ? 'lethal_sequence' : a.type === 'end' ? 'turn_change' : kind, { lock: lethal ? lockOf('lethal_blow') : lockOf(kind), tier, meta: { action: a.type, p, cid: info.cid || null, dmg_max: dmgMax, deaths: dying.size } });
    if (big) tl.meta.skippable = 400 * G.scale;
    let impact = 0;
    const merged = this.mergeDying(after, before, dying, ev);
    const showImpact = () => { this.vm = merged; this.render(); };
    if (a.type === 'play') {
      const c = info.card;
      const dst = c.kind === 'minion' ? this.landPos(side, after, before) : c.kind === 'weapon' ? this.sideEls[side].hero._pos : { x: this.W / 2 - 50, y: this.R.mid_band.y - 60, w: 100, h: 140 };
      const from = info.from || (side === 'enemy' ? { x: this.R.enemy_hand.x, y: this.R.enemy_hand.y, s: 0.5, r: 0, o: 1, w: this.R.hand.card_w, h: this.R.hand.card_h } : { x: this.W / 2, y: this.H, s: 1, r: 0, o: 1, w: this.R.hand.card_w, h: this.R.hand.card_h });
      const cw = this.R.hand.card_w;
      const fly = h('div', { class: 'fly' }, cardBox(info.cid, cw, { mode: big ? 'full' : 'hand' }));
      if (big) {
        const Z = this.R.zoom_card, zk = Z.w / cw;
        const dur = T('big_entry'), r = dur / 1800;
        tl.at(0, () => { this.stage.appendChild(fly); setTf(fly, { x: Z.x + Z.w / 2 - cw / 2, y: this.H, s: zk * 0.9, o: 0 }); darken(0.6, 220 * r); sfx('big_entry', TI.sfx_gain_db + 6); duck(TI.music_duck_db, TI.music_duck_ms); tween(fly, { x: Z.x + Z.w / 2 - cw / 2, y: Z.y + (Z.h - Z.h / Z.w * cw) / 2, s: zk * 1.08, o: 1 }, 480 * r, { ease: 'out', tag: tl }); });
        const land = 1400 * r;
        tl.at(land, () => { darken(0, 300 * r); tween(fly, { x: dst.x, y: dst.y, s: dst.w / cw, o: c.kind === 'minion' ? 1 : 0 }, 400 * r, { ease: 'inout', tag: tl }); });
        impact = dur;
        tl.at(impact, () => { fly.remove(); this.shakeNow('heavy'); burst(dst.x + dst.w / 2, dst.y + dst.h, 24, D.art.palette.ui.salt_white); });
        if (!this.flags.bigSeen[p]) { this.flags.bigSeen[p] = true; this.say(p, 'threat', tl, 900 * r); }
      } else if (c.kind === 'minion') {
        const d = T('play_answerer'), r = d / 440;
        tl.at(0, () => { this.stage.appendChild(fly); setTf(fly, { ...from, s: (from.s || 1) * (from.w ? from.w / cw : 1) }); tween(fly, { y: from.y - 20, s: 1.1 }, 80 * r, { tag: tl }); });
        tl.at(80 * r, () => tween(fly, { x: dst.x, y: dst.y, s: dst.w / cw, r: 0, o: 1 }, 220 * r, { ease: 'inout', tag: tl }));
        impact = 300 * r;
        tl.at(impact, () => { fly.remove(); sfx('card_play'); burst(dst.x + dst.w / 2, dst.y + dst.h, 10, D.art.palette.ui.salt_dim); });
        tl.end(d);
      } else {
        const d = T(kind), r = d / (kind === 'play_rite' ? 520 : 480);
        tl.at(0, () => { this.stage.appendChild(fly); setTf(fly, { ...from, s: from.w ? from.w / cw : 1 }); tween(fly, { x: dst.x, y: dst.y, s: dst.w / cw, r: 0, o: 1 }, 200 * r, { tag: tl }); if (c.kind === 'spell') sfx('rite_cast'); });
        impact = (kind === 'play_rite' ? 450 : 300) * r;
        tl.at(impact - 30 * r, () => { tween(fly, { o: 0, s: dst.w / cw * 1.2 }, 120 * r, { tag: tl, done: () => fly.remove() }); if (a.target != null) { const tp = this.posOfUid(a.target); if (tp) trail(dst.x + dst.w / 2, dst.y + dst.h / 2, tp.x, tp.y, 250 * r, fac(c.owner).primary); } if (c.kind === 'weapon') sfx('card_play'); });
        tl.end(d);
      }
      tl.at(impact, showImpact);
    } else if (a.type === 'attack') {
      const ap = this.posOfUid(a.attacker), tp = this.posOfUid(a.target);
      const d = T('attack');
      const slow = lethal ? 1 / 0.35 : 1;
      const el = ap.el, o = { ...tf(el) };
      const dx = tp.x - ap.x, dy = tp.y - ap.y, L = Math.hypot(dx, dy) || 1;
      const reach = Math.max(0, L - 30) + D.art.tempo.actions.attack.overshoot_px;
      const hit = { x: o.x + dx / L * reach, y: o.y + dy / L * reach };
      const wind = T('attack', 'windup'), dash = T('attack', 'dash') * slow, stop = Math.max(T('attack', 'hitstop'), (TI.hitstop_ms || 0) * G.scale * (G.fast ? 0.5 : 1)), back = T('attack', 'return');
      void d;
      tl.at(0, () => { el._dash = true; el.style.zIndex = 20; tween(el, { x: o.x - dx / L * 6, y: o.y - dy / L * 6, s: o.s * 1.06 }, wind, { tag: tl }); if (this.isAI(p)) arrow(ap.x, ap.y, tp.x, tp.y, 0); });
      tl.at(wind, () => { tween(el, { x: hit.x, y: hit.y, s: o.s * 1.06 }, dash, { ease: 'inout', tag: tl }); if (lethal) { darken(0.35, dash); } });
      impact = wind + dash;
      tl.at(impact, () => {
        sfx(info.atk >= 5 ? 'attack_heavy' : 'attack_light', TI.sfx_gain_db + 14);
        this.shakeNow(info.atk >= 8 || crit ? 'heavy' : info.atk >= 5 ? 'medium' : info.atk >= 3 ? 'light' : 'none', { x: dx / L, y: dy / L });
        burst(tp.x, tp.y, 8 + Math.min(12, info.atk * 2), D.art.palette.state.damage);
        if (tier === 3) { this.zoomNow(TI.zoom_ratio); duck(TI.music_duck_db, TI.music_duck_ms); }
      });
      tl.at(impact, showImpact);
      tl.at(impact + stop, () => tween(el, { x: o.x, y: o.y, s: o.s }, back, { tag: tl, done: () => { el._dash = false; el.style.zIndex = ''; } }));
      phase(tl, 'attack_motion', 0, impact + stop + back); // art 표의 공격(530/300)과 같은 구간
      tl.at(impact + stop + back, () => { el._dash = false; el.style.zIndex = ''; setTf(el, { s: o.s }); });
    } else if (a.type === 'power') {
      const d = T('calling'), cb = this.sideEls[side].call;
      tl.at(0, () => { setTf(cb, { s: 0.9 }); tween(cb, { s: 1 }, d * 0.5, { tag: tl, ease: 'back' }); sfx('buff'); if (a.target != null) { const tp = this.posOfUid(a.target); const cr = this.R[side + '_calling']; if (tp) trail(cr.x + cr.w / 2, cr.y + cr.h / 2, tp.x, tp.y, d * 0.6, fac(st.players[p].heroId).primary); } });
      impact = d * 0.55; tl.at(impact, showImpact); tl.end(d);
    } else if (a.type === 'end') {
      const d = this.isAI(p) ? 0 : T('end_breath_press');
      if (!this.isAI(p)) { tl.at(0, () => { setTf(this.endBtn, { s: 0.94 }); tween(this.endBtn, { s: 1 }, d, { tag: tl }); }); phase(tl, 'end_breath_press', 0, d); }
      impact = d * 0.5; tl.at(impact, showImpact); tl.end(d);
      this.turnStartFx(tl, impact, ev.slice(ev.findIndex((x) => x.t === 'turn')));
    } else {
      impact = T('mulligan_swap') * 0.3; tl.at(impact, showImpact); tl.end(T('mulligan_swap'));
    }
    // 피해·회복·껍질 숫자(대상마다 60 ms 간격), 소금막, 봉인문, 손패 넘침, 공허 호명
    let k = 0;
    // 결정 O6: tier 3 큰 카드 한 행동은 효과 연출 포함 ≤ 2,200 ms — 착지 뒤 효과는 빠르게 값, 퍼짐 상한 100 ms
    const post = big && !lethal;
    const Tp = (id) => { const a = D.art.tempo.actions[id]; return post && a ? a.fast_ms * G.scale : T(id); };
    const spread = (post ? 100 : 400) * G.scale;
    const gap = 60 * G.scale * (G.fast || post ? 0.5 : 1);
    const nd = Tp('damage_number'), nh = Tp('heal_number');
    let afterTurn = a.type !== 'end';
    for (const x of ev) {
      if (x.t === 'turn') afterTurn = true;
      if (!afterTurn && a.type === 'end' && (x.t === 'dmg' || x.t === 'heal')) { /* 턴 끝 효과도 같은 자리에서 */ }
      const at = impact + Math.min(spread, k * gap);
      if (x.t === 'dmg') { k++; tl.at(at, () => { const ps = this.posOfUid(x.uid); if (ps) number(ps.x, ps.y - 10, '-' + x.n, D.art.palette.state.damage, x.n, nd); }); tl.end(at + 100); }
      else if (x.t === 'heal') { k++; tl.at(at, () => { const ps = this.posOfUid(x.uid); if (ps) { number(ps.x, ps.y - 10, '+' + x.n, D.art.palette.state.heal, x.n, nh); sfx('heal'); } }); }
      else if (x.t === 'armor') { k++; tl.at(at, () => { const ps = this.posOfUid(st.players[x.p].hero.uid); if (ps) number(ps.x, ps.y - 10, '+' + x.n, D.art.palette.state.shell, x.n, nh); }); }
      else if (x.t === 'shield') { tl.at(at, () => { const ps = this.posOfUid(x.uid); if (ps) { burst(ps.x, ps.y, 12, D.art.palette.state.shell, 1.4); sfx('saltskin_break'); } }); }
      else if (x.t === 'secret_open') { const so = Tp('sealwrit_open'); tl.lock = Math.max(tl.lock, lockOf('sealwrit_open')); tl.at(at, () => { toast(t('toast_sealwrit_opened')); sfx('sealwrit_open'); this.flashCard(x.cid, so); }); tl.end(at + so); }
      else if (x.t === 'burn') { tl.at(at, () => { if (x.p === this.bottom) this.deny('toast_hand_full', { flash: [this.sideEls.my.deckN.parentNode] }); else toast(t('toast_hand_full')); const dr = this.R[this.sideOf(x.p) + '_deck']; burst(dr.x + dr.w / 2, dr.y, 14, D.art.palette.ui.salt_white); }); tl.end(at + Tp('hand_burn')); }
      else if (x.t === 'fatigue') { tl.at(at, () => { toast(t('toast_hollow_call', { n: x.n })); sfx('hollow_call'); this.shakeNow('medium'); }); tl.end(at + Tp('hollow_call')); }
      else if (x.t === 'draw' && x.p === this.bottom && x.cid) tl.at(at, () => sfx('card_draw'));
    }
    // 사망: 금 150 → 소금으로 부서짐 350(입자 18)
    if (dying.size) {
      const dAt = impact + Math.min(spread, k * gap) + (post ? 0 : 120 * G.scale), dd = Tp('death');
      tl.at(dAt, () => {
        for (const uid of dying) {
          const el = this.tokEls.get(uid); if (!el) continue;
          el._dying = true; const ps = el._pos;
          tween(el, { s: tf(el).s * 0.85, o: 0, y: ps.y + 6 }, dd, { tag: tl, done: () => { el.remove(); this.tokEls.delete(uid); } });
          burst(ps.x + ps.w / 2, ps.y + ps.h / 2, 18, D.art.palette.ui.salt_white);
        }
        sfx('death_crumble'); if (dying.size >= 3) this.shakeNow('medium');
      });
      tl.at(dAt + dd, () => { this.vm = after; this.render(); });
      tl.end(dAt + dd);
    }
    // 강화·약화: 숫자 칸이 한 번 튐(살아남은 응답자)
    tl.at(impact + 10, () => {
      for (const P of after.players) for (const m of P.board) {
        const b = before.players[m.owner].board.find((x) => x.uid === m.uid);
        if (b && (b.atk !== m.atk || b.maxHp !== m.maxHp)) { const el = this.tokEls.get(m.uid); if (el) { const s = tf(el).s; setTf(el, { s: s * 1.08 }); tween(el, { s }, T('buff_debuff'), { tag: tl }); } sfx(m.atk > b.atk || m.maxHp > b.maxHp ? 'buff' : 'debuff'); }
      }
    });
    tl.at(tl.dur, () => { this.vm = after; this.render(); });
    if (lethal) this.addLethal(tl, after, impact);
    tl.end(Math.max(tl.dur, impact));
    return tl;
  }
  landPos(side, after, before) {
    const P = after.players[side === 'my' ? this.bottom : 1 - this.bottom], B = before.players[side === 'my' ? this.bottom : 1 - this.bottom];
    const old = new Set(B.board.map((m) => m.uid));
    const i = P.board.findIndex((m) => !old.has(m.uid));
    return this.slotPos(side, Math.max(0, i), Math.max(1, P.board.length));
  }
  // 마지막 일격 → 호명자 부서짐 → 승리/패배 (tier 3)
  addLethal(tl, after, impact) {
    const lose = this.sideEls[this.sideOf(1 - after.winner)];
    const stop = 160 * G.scale, crack = T('hero_crack');
    const meWin = this.human == null ? after.winner === this.bottom : after.winner === this.human;
    const vd = T(meWin ? 'victory' : 'defeat');
    // 마지막 일격 구간 = 느린 달려들기(약 400) + 정지 + 실 끊김 = art lethal_blow(1500/800)
    const LB = T('lethal_blow'), ls = Math.max(0, impact - LB * 400 / 1500);
    const t1 = Math.max(impact + stop, ls + LB);
    tl.lock = Math.max(tl.lock, t1 + crack + vd);
    phase(tl, 'lethal_blow', ls, t1 - ls); phase(tl, 'hero_crack', t1, crack); phase(tl, meWin ? 'victory' : 'defeat', t1 + crack, vd);
    tl.at(t1, () => { const p = lose.hero._pos; burst(p.x + p.w / 2, p.y + p.h / 2, 30, D.art.palette.ui.salt_white, 1.6); this.shakeNow('heavy'); sfx('hollow_call'); ring(p.x + p.w / 2, p.y + p.h / 2, 60, D.art.palette.state.damage, crack); tween(lose.hero, { o: 0.35, s: 0.96 }, crack, { tag: tl }); });
    tl.at(t1 + crack, () => { darken(0, 200); this.bannerText.textContent = t(after.winner == null ? 'result_draw' : meWin ? 'result_victory' : 'result_defeat'); setTf(this.banner, { o: 0, s: 1.2 }); tween(this.banner, { o: 1, s: 1 }, vd * 0.25, { tag: tl }); sfx(meWin ? 'victory' : 'defeat'); this.say(this.bottom, meWin ? 'win' : 'lose', null, 0, true); this.say(1 - this.bottom, meWin ? 'lose' : 'win', null, 0, true); });
    tl.at(t1 + crack + vd, () => this.finish());
    tl.end(t1 + crack + vd);
  }
  turnStartFx(tl, at, ev) {
    const tev = ev.find((x) => x.t === 'turn');
    if (!tev) return;
    const mine = !this.auto && tev.p === this.human;
    const d = T('turn_start_banner'), r = d / 900;
    tl.at(at, () => {
      this.bannerText.textContent = t(this.auto ? (tev.p === this.bottom ? 'turn_yours' : 'turn_enemy') : mine ? 'turn_yours' : 'turn_enemy');
      setTf(this.banner, { o: 0, y: -10 }); tween(this.banner, { o: 1, y: 0 }, 180 * r, { tag: tl });
      if (mine) sfx('turn_yours');
      const P = this.state.players[tev.p];
      motif(this.state.players[this.auto ? this.bottom : tev.p].heroId);
      sfx('wick_light');
      this.live.textContent = this.bannerText.textContent;
      void P;
    });
    tl.at(at + 700 * r, () => tween(this.banner, { o: 0, y: -10 }, 200 * r, { tag: tl }));
    phase(tl, 'turn_start_banner', at, d);
  }
  flashCard(cid, dur) {
    const Z = this.R.zoom_card, el = h('div', { class: 'fly' }, cardBox(cid, Z.w * 0.7, { mode: 'full' }));
    this.stage.appendChild(el); setTf(el, { x: Z.x + Z.w * 0.15, y: Z.y, s: 0.9, o: 0 });
    tween(el, { s: 1, o: 1 }, dur * 0.2);
    after(Math.max(16, dur), () => el.remove());
  }
  shakeNow(level, dir) {
    if (G.reduceMotion || level === 'none') return;
    const S = D.art.tempo.shake.find((s) => s.level === level); if (!S) return;
    const amp = Math.min(D.art.tempo.shake_max_amp_px, Math.min(this.W, this.H) * S.amp_ratio);
    this.shake = { t: 0, dur: S.dur_ms * G.scale, amp, dir: dir || { x: 0, y: 1 } };
  }
  zoomNow(z) { if (G.reduceMotion) return; this.zoomFx = { t: 0, dur: 400 * G.scale, z }; }

  // ---------- 순간: 명줄 위기·역전·대사 ----------
  checkMoments(after) {
    const me = this.bottom, P = after.players;
    const lvl = (hp) => { const L = D.art.tempo.immersion.low_lifeline; return hp <= L[1].at_or_below ? 2 : hp <= L[0].at_or_below ? 1 : 0; };
    const my = lvl(P[me].hp + 0);
    this.vig.className = my === 2 ? 'l2' : my === 1 ? 'l1' : '';
    this.vig.style.opacity = my ? D.art.tempo.immersion.low_lifeline[my - 1].vignette_ratio / 0.3 : 0;
    tension(my); this.lowLevel = my;
    if (!after.over) {
      if (P[1 - me].hp <= 10 && !this.flags.low[1 - me]) { this.flags.low[1 - me] = true; this.say(me, 'threat'); }
      if (P[me].hp <= 10 && !this.flags.low[me]) { this.flags.low[me] = true; this.say(me, 'crisis'); } // 위기 대사(10-lore 4절 round-1)
    }
    // 역전: 형세 −10 이하였던 쪽이 부호를 뒤집음(한 판 최대 2회, 30-art 5-3)
    const C = D.art.tempo.comeback;
    for (const p of [0, 1]) {
      const s = E.positionScore(this.state, p);
      this.flags.minScore[p] = Math.min(this.flags.minScore[p], s);
      if (this.flags.minScore[p] <= C.swing_from_score && s > 0 && this.flags.comebacks < C.max_per_game && !after.over) {
        this.flags.comebacks++; this.flags.minScore[p] = 0;
        ring(this.W / 2, (this.R.enemy_board.y + this.R.my_board.y + this.R.my_board.h) / 2, Math.min(this.W, this.H) * 0.35, D.art.palette.rarity.abyss.glow, C.ring_flash_ms * G.scale);
        this.say(1 - p, 'respect'); A.log.push({ kind: 'comeback', tier: 3, p, start_game_ms: Math.round(G.now), planned_ms: C.ring_flash_ms });
      }
    }
    const turn = Math.ceil(after.half / 2), W = D.art.tempo.immersion.tide_wetness;
    this.wet.style.opacity = turn >= 8 ? Math.min(W.max_darken_ratio, (turn - 7) * W.per_turn_darken_ratio) : 0;
  }
  // 호명자 대사(10-lore 4절): 입력을 막지 않음, 같은 호명자 20 s 안 반복 금지
  say(p, role, tl, at = 0, force) {
    const fn = () => {
      const H = D.art.tempo.immersion.hero_lines, hid = this.state.players[p].heroId, key = `line_${hid.slice(2)}_${role}`;
      if (this.tut && this.tut.cur) return; // 튜토리얼 패널이 떠 있는 동안 대사는 쉼
      const last = this.flags.bubbleLast[p];
      if (!force && last != null && G.now - last < H.min_gap_s * 1000 * G.scale) return;
      this.flags.bubbleLast[p] = G.now;
      const se = this.sideEls[this.sideOf(p)], b = se.bub, hp = se.hero._pos;
      b.textContent = t(key);
      b.style.maxWidth = Math.min(220, this.W - 16) + 'px'; b.style.left = '0px'; b.style.top = '0px';
      const bw = b.offsetWidth || 200, bh = b.offsetHeight || 30;
      const left = Math.min(this.W - bw - 6, Math.max(6, hp.x + hp.w + 4)), top = this.sideOf(p) === 'my' ? Math.max(4, hp.y - bh - 6) : Math.min(this.H - bh - 4, hp.y + hp.h + 4);
      b.style.left = left + 'px'; b.style.top = top + 'px';
      const d = (G.fast ? H.bubble_fast_ms : H.bubble_normal_ms) * G.scale;
      setTf(b, { o: 0, y: 6 }); tween(b, { o: 1, y: 0 }, Math.min(160, d * 0.1), { keep: true, done: () => setTf(b, { o: 1, y: 0 }) }); // 등장 뒤 불투명 100 %(G10)
      clearTimeout(b._t); b._until = G.now + d;
      this.bubbles = this.bubbles || new Set(); this.bubbles.add(b);
      A.log.push({ kind: 'hero_line', p, role, start_game_ms: Math.round(G.now), planned_ms: d });
    };
    if (tl) tl.at(at, fn); else fn();
  }

  // ---------- 매 프레임 ----------
  update(dt, gdt) {
    if (this.shake) { const s = this.shake; s.t += gdt; const k = s.t / s.dur; if (k >= 1) { this.shake = null; setTf(this.wrap, { x: 0, y: 0 }); } else { const a = s.amp * (1 - k), w = Math.sin(s.t * 0.09) * a; setTf(this.wrap, { x: w * (0.3 + 0.7 * Math.abs(s.dir.x)), y: Math.cos(s.t * 0.11) * a * (0.3 + 0.7 * Math.abs(s.dir.y)) }); } }
    if (this.zoomFx) { const z = this.zoomFx; z.t += gdt; const k = z.t / z.dur; if (k >= 1) { this.zoomFx = null; setTf(this.wrap, { s: 1 }); } else setTf(this.wrap, { s: 1 + (z.z - 1) * Math.sin(Math.PI * k) }); }
    if (this.bubbles) for (const b of this.bubbles) if (G.now >= b._until) { this.bubbles.delete(b); tween(b, { o: 0 }, 160); }
    if (this.sel && this.selOrigin && !this.press) { /* 선택 중 화살표는 대상 탭으로 완료 */ }
    fxStep(gdt);
    if (this.mullBox) { this.mullT -= dt; if (this.mullT <= 0) { const b = this.mullBox; b.remove(); this.mullBox = null; this.doMulligans([...this.mullPick]); } }
    if (!this.started || this.over) return;
    // 예약된 입력 실행
    if (A.queue.length && !A.locked) { const it = A.queue.shift(); if (A.busy) A.finishAll(); this.exec(it); }
    const st = this.state;
    if (st.pending && st.pending.owner === this.human && !this.auto) { if (!this.discBox && !A.busy) this.showDiscover(); }
    else if (this.isAI(st.active) && !A.busy) this.aiStep(dt);
    this.timerStep(dt);
    if (this.tut) this.tutStep();
    if (this.lowLevel === 2 && !G.test) { this.thumbT = (this.thumbT || 0) + dt; if (this.thumbT >= D.art.tempo.immersion.low_lifeline[1].thump_every_ms) { this.thumbT = 0; thump(); } }
    if (!A.busy && this._hintDirty !== st.half + ':' + this.actions.length) { this._hintDirty = st.half + ':' + this.actions.length; this.renderHints(); }
  }
  // 상대(AI) 턴 박자(30-art 5-5): 첫 수 앞 생각, 행동 사이, 들림 예고·조준 화살표, 턴 상한 12 s
  aiStep(dt) {
    const st = this.state, AT = D.art.tempo.ai_turn;
    this.aiTurnT += dt;
    const fast = G.fast || this.aiTurnT > AT.turn_total_cap_normal_ms * G.scale;
    const rr = (r) => (G.test ? (r[0] + r[1]) / 2 : r[0] + rnd() * (r[1] - r[0])) * G.scale;
    if (!this.aiPlan) {
      const p = st.active;
      let act = this.actsThisTurn > 40 ? { type: 'end' } : this.AI.chooseAction(st, this.ai[p]);
      if (this.total > 4000) { st.over = true; st.endReason = 'action_cap'; st.winner = null; this.finish(); return; }
      let wait = this.aiFirst ? rr(fast ? AT.think_first_fast_ms : AT.think_first_normal_ms) : rr(fast ? AT.between_actions_fast_ms : AT.between_actions_normal_ms);
      let pre = 0;
      if (act.type === 'play') { pre = (fast ? AT.hover_card_before_play_fast_ms : AT.hover_card_before_play_normal_ms) * G.scale; const c = E.cardOf(st, st.players[p], st.players[p].hand[act.hand]); if (c && c.cost >= 7) wait += (fast ? AT.hard_decision_fast_ms : AT.hard_decision_extra_normal_ms) * G.scale; }
      if (act.type === 'attack') pre = (fast ? AT.aim_arrow_before_attack_fast_ms : AT.aim_arrow_before_attack_normal_ms) * G.scale;
      if (act.type === 'end') wait = (fast ? AT.end_turn_after_last_fast_ms : AT.end_turn_after_last_normal_ms) * G.scale;
      this.aiPlan = { act, wait, pre, shown: false };
      this.aiFirst = false;
    }
    const pl = this.aiPlan;
    pl.wait -= dt * A.boost;
    if (!pl.shown && pl.wait <= pl.pre) {
      pl.shown = true;
      const a = pl.act;
      if (a.type === 'play' && this.sideOf(st.active) === 'enemy' && this.ehandEl) { const o = tf(this.ehandEl); setTf(this.ehandEl, { y: o.y + 8, s: 1.15 }); tween(this.ehandEl, { y: this.R.enemy_hand.y, s: 1 }, pl.pre); }
      if (a.type === 'attack') { const ap = this.posOfUid(a.attacker), tp = this.posOfUid(a.target); if (ap && tp) arrow(ap.x, ap.y, tp.x, tp.y, pl.pre + 80 * G.scale); }
    }
    if (pl.wait <= 0) { this.aiPlan = null; this.perform(pl.act); }
  }
  onTurnStart() {
    const st = this.state;
    this.actsThisTurn = 0; this.aiTurnT = 0; this.aiFirst = true; this.aiPlan = null; A.boost = 1;
    if (st.over) return;
    if (!this.auto && st.active === this.human) {
      const R = D.balance.rules;
      this.timer = (this.idlePenalty ? R.turn_time_idle_penalty_s : R.turn_time_s) * 1000;
      this.turnActed = false; this.lastTick = 0;
    }
  }
  // 턴 타이머(50 s): 앞 35 s는 흐린 선만, 남은 15 s부터 타는 선, 5 s부터 붉게. 연출 잠금 동안은 멈춤
  timerStep(dt) {
    const st = this.state, TT = D.art.tempo.immersion.turn_timer;
    if (this.auto || st.active !== this.human || st.pending || A.locked || (this.tut && this.tut.cur)) { /* 튜토리얼 안내가 떠 있는 동안 턴 타이머 멈춤 */ if (st.active !== this.human) this.burnEl.style.opacity = 0; return; }
    if (this.o.noTimer) return;
    this.timer -= dt;
    const left = this.timer / 1000;
    if (left <= TT.warn_from_s) {
      const crit = left <= TT.critical_from_s;
      this.burnEl.style.opacity = 1; this.burnEl.classList.toggle('crit', crit);
      this.burnEl.style.transform = `scaleX(${Math.max(0, left / TT.warn_from_s).toFixed(3)})`;
      const every = crit ? TT.critical_tick_every_ms : TT.tick_sfx_every_ms;
      if (G.now - this.lastTick >= every) { this.lastTick = G.now; sfx('turn_timer'); if (!this.warned) { this.warned = true; toast(t('turn_timer_low')); } }
    } else { this.burnEl.style.opacity = 0; this.warned = false; }
    if (this.timer <= 0) {
      this.idlePenalty = !this.turnActed; this.clearSel(); toast(t('turn_auto_end'));
      if (A.busy) A.finishAll();
      this.perform({ type: 'end' });
    }
  }
  showDiscover() {
    const pd = this.state.pending;
    const box = this.discBox = h('div', { class: 'ovl', style: 'pointer-events:auto' });
    box.appendChild(h('h3', { text: t('toast_salvage'), style: 'margin:0' }));
    const row = h('div', { class: 'row', style: 'justify-content:center' });
    const w = Math.min(100, (this.W - 40) / 3.3);
    pd.options.forEach((cid, i) => {
      const b = h('button', { class: 'btn', type: 'button', style: 'padding:4px;height:auto', 'data-disc': i }, cardBox(cid, w, { mode: 'full' }));
      b.addEventListener('click', () => { box.remove(); this.discBox = null; this.chooseDiscover(i); });
      row.appendChild(b);
    });
    box.appendChild(row);
    this.ovl.appendChild(box);
  }
  chooseDiscover(i) { if (!this.state.pending) return { ok: false }; if (this.discBox) { this.discBox.remove(); this.discBox = null; } if (A.busy) A.finishAll(); this.perform({ type: 'choose', index: i }); return { ok: true }; }

  // ---------- 확대 보기·정보 ----------
  openZoom(cid, hc, selecting) {
    this.closeZoom();
    const Z = this.R.zoom_card;
    const c = cardById(cid);
    const wrap = h('div', { class: 'zoomWrap', style: `left:${Z.x}px;top:${Z.y}px;width:${Z.w}px` });
    const P = this.state.players[this.bottom], base = P.view[cid] || c;
    wrap.appendChild(cardBox(cid, Z.w, { mode: 'full', stats: hc ? { cost: hc.cost, atk: hc.atk, hp: hc.hp } : undefined, base: { cost: base.cost, atk: base.attack, hp: base.health }, stage: (this.o.bt && this.o.bt[this.bottom] && this.o.bt[this.bottom][cid]) || 0 }));
    const kws = (c.kw_ui || []).filter((k) => `kw_${k}` in D.strings.ko);
    // 대전 중 이야기는 열지 않고 한 줄 안내만(30-art 11-8, 10-lore card_story_battle_hint)
    const help = [...kws.map((k) => t('kw_' + k)), c.story_ko ? t('card_story_battle_hint') : null].filter(Boolean);
    if (help.length) wrap.appendChild(h('div', { class: 'zoomHelp', text: help.join('\n'), style: 'white-space:pre-line' }));
    this.stage.appendChild(wrap);
    setTf(wrap, { o: 0, s: 0.96 }); tween(wrap, { o: 1, s: 1 }, 90 * G.scale);
    this.zoom = wrap; void selecting;
  }
  openInfo(uid) {
    const ch = E.findChar(this.state, uid);
    if (!ch) return;
    if (ch.isHero) return this.openPowerInfo(ch.owner);
    const P = this.state.players[ch.owner];
    this.openZoom(ch.cid, { cost: (P.view[ch.cid] || cardById(ch.cid)).cost, atk: E.attackOf(this.state, ch), hp: ch.hp });
  }
  openPowerInfo(p) {
    this.closeZoom();
    const hs = this.state.players[p].heroId.slice(2), Z = this.R.zoom_card;
    const wrap = h('div', { class: 'zoomWrap panel', style: `left:${Z.x}px;top:${Z.y + 40}px;width:${Z.w}px` },
      [h('b', { text: `${t(`hero_${hs}_name`)} — ${t(`hero_${hs}_title`)}` }), h('div', { text: `${t('hud_calling')}: ${t(`hero_${hs}_power`)}` }), h('div', { class: 'small', text: t(`hero_${hs}_power_desc`) })]);
    this.stage.appendChild(wrap); this.zoom = wrap;
  }
  closeZoom() { if (this.zoom) { this.zoom.remove(); this.zoom = null; } }
  openLog() {
    const box = h('div', { class: 'ovl', style: 'pointer-events:auto' });
    const close = () => box.remove();
    box.appendChild(h('div', { class: 'logList' }, this.text.slice(-40).map((s) => h('div', { text: s }))));
    const fast = h('button', { class: 'btn' + (G.fast ? ' sel' : ''), type: 'button', text: t('settings_fast_view') });
    fast.addEventListener('click', () => { G.fast = !G.fast; fast.classList.toggle('sel', G.fast); this.o.onSetting && this.o.onSetting('fast', G.fast); });
    const conc = h('button', { class: 'btn', type: 'button', text: t('battle_concede') });
    conc.addEventListener('click', () => {
      box.innerHTML = '';
      box.appendChild(h('div', { text: t('confirm_leave_duel') }));
      const y = h('button', { class: 'btn primary', type: 'button', text: t('confirm_yes') }), n = h('button', { class: 'btn', type: 'button', text: t('confirm_no') });
      y.addEventListener('click', () => { close(); this.concede(); }); n.addEventListener('click', close);
      box.appendChild(h('div', { class: 'row' }, [y, n]));
    });
    const back = h('button', { class: 'btn primary', type: 'button', text: t('menu_back') }); back.addEventListener('click', close);
    box.appendChild(h('div', { class: 'row', style: 'justify-content:center' }, [fast, conc, back]));
    this.ovl.appendChild(box);
  }
  concede() {
    if (this.over) return;
    A.finishAll(); A.queue.length = 0;
    const st = this.state; st.over = true; st.winner = 1 - this.human; st.endReason = 'concede';
    this.finish();
  }
  logText(p, a, info, ev) {
    const st = this.state, nm = t(`hero_${st.players[p].heroId.slice(2)}_name`);
    const tn = (uid) => { if (uid == null) return ''; const c = E.findChar(st, uid); if (c && c.isHero) return t(`hero_${st.players[c.owner].heroId.slice(2)}_name`); const d = ev.find((x) => x.t === 'die' && x.uid === uid); const cid = c ? c.cid : d ? d.cid : null; return cid ? cardName(cardById(cid)) : '?'; };
    let s = '';
    if (a.type === 'play') s = `${cardName(cardById(info.cid))}${a.target != null ? ' → ' + tn(a.target) : ''}`;
    else if (a.type === 'attack') s = `${tn(a.attacker)} ⚔ ${tn(a.target)}`;
    else if (a.type === 'power') s = `${t('hud_calling')}${a.target != null ? ' → ' + tn(a.target) : ''}`;
    else if (a.type === 'end') s = t('hud_end_breath');
    else s = t('toast_salvage');
    const dmg = ev.filter((x) => x.t === 'dmg').map((x) => `${tn(x.uid)} -${x.n}`).join(', ');
    this.text.push(`[${Math.ceil(st.half / 2)}] ${nm}: ${s}${dmg ? ' (' + dmg + ')' : ''}`);
  }
  // ---------- 튜토리얼(10-lore 8-7, 첫 AI 연습 판): 표 순서 대기열, 조건이 맞는 첫 순간 하나만, 판을 막지 않음(잠금 0) ----------
  // 배치·가리킴은 art.json ux.tutorial_layout / tutorial_ui(30-art 11절). 본 단계는 저장(o.tutorial.onSeen), 건너뛰기는 전부 끝.
  tutSteps() {
    const st = this.state, me = this.human, P = st.players[me], Q = st.players[1 - me], L = this.legal || [];
    const my = this.myTurn() && !A.busy && !st.pending;
    const se = this.sideEls, seen = (k) => this.tut.seen.has(k);
    const handEl = (pred) => { for (const [, el] of this.handEls) if (el._hc && pred(cardById(el._hc.cid), el._hc)) return el; return null; };
    const playEl = (kind) => { const a = L.find((x) => x.type === 'play' && E.cardOf(st, P, P.hand[x.hand]).kind === kind); return a ? this.handEls.get(iid(P.hand[a.hand])) : null; };
    const myBoardC = () => ({ _pos: this.R.my_board });
    const noPlay = () => my && P.maxMana <= 1 && !L.some((a) => a.type === 'play');
    return [
      { k: 'tut_mana', when: () => my, tg: () => se.my.bars[0].parentNode },
      { k: 'tut_no_play', when: () => noPlay() && !seen('tut_play_creature') && !seen('tut_play_spell'), tg: () => se.my.bars[0].parentNode },
      { k: 'tut_play_creature', when: () => my && !!playEl('minion'), tg: () => playEl('minion'), act: (a) => a.type === 'play', demo: () => [playEl('minion'), myBoardC()] },
      { k: 'tut_play_spell', when: () => my && !!playEl('spell'), tg: () => playEl('spell'), act: (a) => a.type === 'play' },
      { k: 'tut_play_weapon', when: () => !!handEl((c) => c.kind === 'weapon'), tg: () => handEl((c) => c.kind === 'weapon'), act: (a) => a.type === 'play' },
      { k: 'tut_board', when: () => P.board.length > 0, tg: () => ({ _pos: this.R.my_board, el: null }) },
      { k: 'tut_attack', when: () => my && L.some((a) => a.type === 'attack' && a.attacker !== P.hero.uid), tg: () => { const a = L.find((x) => x.type === 'attack' && x.attacker !== P.hero.uid); return a && this.posOfUid(a.attacker)?.el; }, act: (a) => a.type === 'attack', demo: () => { const a = L.find((x) => x.type === 'attack' && x.attacker !== P.hero.uid); return a ? [this.posOfUid(a.attacker)?.el, this.posOfUid(a.target)?.el] : null; } },
      { k: 'tut_ability', when: () => my && L.some((a) => a.type === 'power'), tg: () => se.my.call, act: (a) => a.type === 'power' },
      { k: 'tut_defense', when: () => this.flags.armorGain != null, tg: () => (this.flags.armorGain === this.bottom ? se.my.hero : se.enemy.hero) }, // 처음 방어를 "얻었을" 때(후공 시작 방어 제외)
      { k: 'tut_end', when: () => my && (seen('tut_play_creature') || seen('tut_play_spell') || seen('tut_play_weapon') || seen('tut_no_play')) && L.length === 1, tg: () => this.endBtn, act: (a) => a.type === 'end' },
      { k: 'tut_wall', when: () => Q.board.some((m) => E.hasKw(m, 'guard')), tg: () => { const m = Q.board.find((x) => E.hasKw(x, 'guard')); return m && this.tokEls.get(m.uid); } },
      { k: 'tut_keyword', when: () => !!handEl((c) => (c.kw_ui || []).length > 0), tg: () => handEl((c) => (c.kw_ui || []).length > 0) },
      { k: 'tut_health', when: () => Q.hero.hp <= 20, tg: () => se.enemy.hero },
      { k: 'tut_deckout', when: () => P.deck.length <= 5, tg: () => se.my.deckN.parentNode },
    ];
  }
  tutStep() {
    const T0 = this.tut;
    if (!this.started || this.over || this.mullBox || this.discBox) return;
    if (T0.cur) { this.tutPlace(); return; }
    for (const sp of this.tutSteps()) {
      if (T0.seen.has(sp.k)) continue;
      if (sp.k !== 'tut_mana' && !T0.seen.has('tut_mana')) continue; // 첫 내 턴의 마나 안내가 먼저
      if (!sp.when()) continue;
      const tg = sp.tg && sp.tg();
      if (sp.tg && !tg) continue;
      this.tutShow(sp, tg); break;
    }
  }
  rectOf(el) {
    if (!el) return null;
    if (el._pos) return el._pos;
    const r = el.getBoundingClientRect(), s = this.stage.getBoundingClientRect();
    return { x: (r.left - s.left) / this.k, y: (r.top - s.top) / this.k, w: r.width / this.k, h: r.height / this.k };
  }
  tutShow(sp, tg) {
    const T0 = this.tut, LY = D.art.ux.tutorial_layout[this.scrKey], UI = D.art.ux.tutorial_ui;
    const S = LY.slots_px;
    // 자리: plan(기본/보조). 고른 자리가 대상(여백 8)이나 소환수·영웅(4 px 넘게)과 겹치면 다른 자리로(QA terms 3)
    const ov = (a, b, m) => a && b && a.x < b.x + b.w - m && b.x < a.x + a.w - m && a.y < b.y + b.h - m && b.y < a.y + a.h - m;
    const landX = this.S.orientation !== 'portrait', rp = landX ? 0 : 8;
    const r0 = this.rectOf(tg), rr = r0 && { x: r0.x - rp, y: r0.y - rp, w: r0.w + rp * 2, h: r0.h + rp * 2 };
    const others = [...this.tokEls.values()].map((e) => e._pos).concat(Object.values(this.sideEls).map((x) => x.hero._pos)).filter(Boolean);
    const bad = (Q) => ov(Q, rr, 0) || others.some((o) => ov(Q, o, 4));
    let alt = !landX && (LY.plan[sp.k] || 'main') === 'alt';
    if (!landX && bad(alt ? S.alt : S.main) && !bad(alt ? S.main : S.alt)) alt = !alt;
    const P = alt ? S.alt : S.main, N = alt ? S.alt_next : S.next, K = S.skip;
    const pn = UI.panel, portrait = this.S.orientation === 'portrait';
    // 세로: 다음·건너뛰기를 패널 안 오른쪽에 둠(덱 수·덱 아이콘을 덮지 않게, 글 한 줄 버튼), 글 12 px·3줄
    const fs = portrait ? 12 : pn.font_px, lh = portrait ? 15 : pn.line_h_px;
    const panel = h('div', { class: 'tut' + (portrait ? ' inbtn' : ''), 'data-tut': sp.k, role: 'note', style: `left:${P.x}px;top:${P.y}px;width:${P.w}px;height:${P.h}px;background:${pn.bg};border:${pn.border_px}px solid ${pn.border};color:${pn.ink};font-size:${fs}px;line-height:${lh}px;padding:${portrait ? 2 : Math.min(pn.pad_px, Math.max(2, (P.h - lh * 2) / 2 - 2))}px ${portrait ? 4 : pn.pad_px}px` }, h('span', { class: 'tt', text: t(sp.k) }));
    const bs = portrait ? 'position:static;flex:none;width:auto;height:48px;min-height:48px' : '';
    const nx = h('button', { class: 'btn primary tutBtn', type: 'button', 'data-tut-next': '1', style: portrait ? bs : `left:${N.x}px;top:${N.y}px;width:${N.w}px;height:${N.h}px` }, t('tut_next'));
    const sk = h('button', { class: 'btn tutBtn', type: 'button', 'data-tut-skip': '1', style: portrait ? bs : `left:${K.x}px;top:${K.y}px;width:${K.w}px;height:${K.h}px` }, t('tut_skip'));
    if (portrait) { panel.appendChild(sk); panel.appendChild(nx); }
    nx.addEventListener('pointerdown', (e) => e.stopPropagation()); sk.addEventListener('pointerdown', (e) => e.stopPropagation());
    nx.addEventListener('click', () => this.tutClose()); sk.addEventListener('click', () => this.tutEnd(true));
    const spot = h('div', { class: 'spot' }), ring = h('div', { class: 'spotRing', style: `border:${UI.spotlight.ring_px}px solid ${UI.spotlight.ring_color};animation-duration:${UI.spotlight.ring_pulse_ms}ms` });
    for (const e of portrait ? [spot, ring, panel] : [spot, ring, panel, nx, sk]) this.stage.appendChild(e);
    for (const se of Object.values(this.sideEls)) { setTf(se.bub, { o: 0 }); se.bub._until = 0; } // 안내가 가리키는 자리를 말풍선이 덮지 않게
    T0.cur = sp; T0.els = portrait ? [spot, ring, panel] : [spot, ring, panel, nx, sk]; T0.nx = nx; T0.sk = sk; T0.panelEl = panel; T0.tg = tg; T0.spot = spot; T0.ring = ring; T0.panel = P;
    T0.seen.add(sp.k); this.o.tutorial.onSeen && this.o.tutorial.onSeen(sp.k);
    for (const e of portrait ? [panel] : [panel, nx, sk]) { setTf(e, { o: 0 }); tween(e, { o: 1 }, 120 * G.scale); }
    A.log.push({ kind: 'tutorial', step: sp.k, start_game_ms: Math.round(G.now) });
    this.tutPlace();
  }
  // 스포트라이트(나머지 50 % 어둡게, 여백 8)·고리·점선 화살표·끌기 손가락(1.2 s 반복)이 대상을 따라감
  tutPlace() {
    const T0 = this.tut, UI = D.art.ux.tutorial_ui, sp = T0.cur;
    let tg = T0.tg;
    if (sp.tg) { const n = sp.tg(); if (n) tg = T0.tg = n; }
    const r = this.rectOf(tg);
    const pad = this.S.orientation === 'portrait' ? UI.spotlight.cutout_pad_px : 0; // 가로는 고리가 가운데 띠 패널에 닿지 않게
    if (!r) { T0.spot.style.display = T0.ring.style.display = 'none'; if (T0.dims) for (const d of T0.dims) d.style.display = 'none'; FX.guide = null; return; }
    for (const e of [T0.spot, T0.ring]) { e.style.display = ''; e.style.left = r.x - pad + 'px'; e.style.top = r.y - pad + 'px'; e.style.width = r.w + pad * 2 + 'px'; e.style.height = r.h + pad * 2 + 'px'; }
    if (!T0.dims) { T0.dims = [0, 1, 2, 3].map(() => { const d = h('div', { class: 'dim4', style: `background:rgba(0,0,0,${UI.spotlight.dim_ratio})` }); this.stage.insertBefore(d, T0.spot); T0.els.push(d); return d; }); }
    { const x0 = r.x - pad, y0 = r.y - pad, x1 = r.x + r.w + pad, y1 = r.y + r.h + pad, W = this.W, H = this.H, set = (d, x, y, w, hh) => { d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.width = Math.max(0, w) + 'px'; d.style.height = Math.max(0, hh) + 'px'; };
      set(T0.dims[0], 0, 0, W, y0); set(T0.dims[1], 0, y1, W, H - y1); set(T0.dims[2], 0, y0, x0, y1 - y0); set(T0.dims[3], x1, y0, W - x1, y1 - y0); }
    const P = T0.panel, px = Math.max(P.x, Math.min(P.x + P.w, r.x + r.w / 2)), py = r.y + r.h / 2 < P.y ? P.y : P.y + P.h;
    FX.guide = { x0: px, y0: py, x1: r.x + r.w / 2, y1: r.y + r.h / 2 < P.y ? r.y + r.h + pad : r.y - pad };
    const dm = sp.demo && sp.demo();
    if (dm && dm[0] && dm[1]) { const a = this.rectOf(dm[0]), b = this.rectOf(dm[1]); FX.demo = a && b ? { x0: a.x + a.w / 2, y0: a.y + a.h / 2, x1: b.x + b.w / 2, y1: b.y + b.h / 2, d: 28, ms: 1200 } : null; } else FX.demo = null;
  }
  tutLayoutCheck() {
    const save = this.tut, so = this.o.tutorial; this.tut = { seen: new Set(), cur: null }; this.o.tutorial = { onSeen: () => {} };
    const out = [];
    const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(), s = this.stage.getBoundingClientRect(); return { x: (r.left - s.left) / this.k, y: (r.top - s.top) / this.k, w: r.width / this.k, h: r.height / this.k }; };
    const ov = (a, c) => a && c && a.x < c.x + c.w - 0.5 && c.x < a.x + a.w - 0.5 && a.y < c.y + c.h - 0.5 && c.y < a.y + a.h - 0.5;
    const slotRects = [...this.R.my_slots, ...this.R.enemy_slots];
    for (const sp of this.tutSteps()) {
      const tg = sp.tg ? sp.tg() : null;
      this.tutShow(sp, tg || { _pos: this.R.mid_band });
      const T0 = this.tut, pr = R(T0.panelEl), nr = R(T0.nx), kr = R(T0.sk), rr = R(T0.ring);
      const hitOk = (el) => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!top && (top === el || el.contains(top)); };
      out.push({ step: sp.k, target: !!tg, panel_next: ov(pr, nr) && this.S.orientation !== 'portrait', panel_skip: ov(pr, kr) && this.S.orientation !== 'portrait', next_skip: ov(nr, kr), panel_ring: tg ? ov(pr, rr) : false, panel_slots: slotRects.some((sl) => ov(pr, sl)), next_h: Math.round(nr.h), next_w: Math.round(nr.w), skip_h: Math.round(kr.h), skip_w: Math.round(kr.w), next_hit: hitOk(T0.nx), skip_hit: hitOk(T0.sk) });
      this.tutClose();
    }
    this.tut = save; this.o.tutorial = so;
    return out;
  }
  tutClose() {
    const T0 = this.tut; if (!T0 || !T0.cur) return;
    for (const e of T0.els) e.remove();
    T0.cur = null; T0.els = null; T0.tg = null; T0.dims = null; FX.guide = null; FX.demo = null;
  }
  tutEnd(skipped) {
    const T0 = this.tut; if (!T0) return;
    if (T0.cur) this.tutClose();
    this.tut = null;
    if (skipped) this.o.tutorial.onSkip && this.o.tutorial.onSkip();
  }
  finish() {
    if (this.tut) this.tutEnd(false);
    if (this.over) return;
    this.over = true;
    setTf(this.banner, { o: 0 }); this.handLayer.style.visibility = 'hidden'; this.closeZoom(); // 결과 화면과 겹침 방지(round-2 D14)
    const st = this.state;
    const P = st.players;
    this.result = {
      seed: this.o.seed >>> 0, heroes: this.o.heroes.slice(), ai: this.ai.slice(), human: this.human, mode: this.o.mode || null,
      mulligan: this.mull, actions: this.actions.map((x) => x.a), winner: st.winner, reason: st.endReason, half: st.half, len: E.turnNumber(st),
      hp: P.map((Q) => Q.hero.hp), armor: P.map((Q) => Q.hero.armor), final: P.map((Q) => Q.hero.hp + Q.hero.armor),
      win: this.human != null && st.winner === this.human, blocks: this.stats.blocks, brine: this.stats.brine, game_ms: Math.round(G.now - (this.t0 ?? 0)),
    };
    tension(0);
    setTimeout(() => this.o.onEnd && this.o.onEnd(this.result), 0);
  }
}
