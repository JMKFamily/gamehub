// 부팅·화면 전환·게임 시계·테스트 훅(window.__game)
import { D, loadData, warmAllIdle, bakeForBattle, bakeMenuAssets } from './data.js';
import { t, setLang, L } from './i18n.js';
import { G, A, stepAll } from './anim.js';
import { initAudio, unlock, setSound, setMusic, sfx, suspendAudio, resumeAudio } from './audio.js';
import { M, load, save, resetSave, seedRng, btFor, battleRewards, allDecks } from './meta.js';
import { Battle } from './battle.js';
import * as S from './screens.js';
import { show, UI, coach } from './ui.js';
import { ads } from './ads.js';
import * as Engine from './engine/engine.mjs';

const Q = new URLSearchParams(location.search);
const TEST = Q.get('test') === '1';
G.test = TEST;
if (TEST && Q.has('anim')) G.scale = Math.max(0, +Q.get('anim'));
const MANUAL = TEST && Q.get('manual') === '1';
let battle = null, lastBattleArgs = null, aiMod = null, aiFresh = 0;
const logList = [];

async function freshAI() { aiFresh++; return import(`./engine/ai.mjs?fresh=${aiFresh}`); } // AI 모듈 안 SALT 카운터를 새 판마다 0부터(시뮬레이터 새 프로세스와 같게)

function applySettings() {
  const s = M.s.settings;
  G.fast = !!s.fast; G.reduceMotion = !!s.reduceMotion;
  setSound(s.sound); setMusic(s.music);
}

const ROUTES = {
  title: () => S.titleScreen(), dock: () => S.dockScreen(), heroes: () => S.heroScreen(), collection: () => S.collectionScreen(), decks: () => S.decksScreen(),
  builder: (a) => S.builderScreen(a), crates: () => S.cratesScreen(), open: (a) => S.openScreen(a), market: () => S.marketScreen(), commissions: () => S.commissionsScreen(),
  calendar: () => S.calendarScreen(), glossary: () => S.glossaryScreen(), settings: () => S.settingsScreen({ apply: applySettings }),
};
// 무거운 화면(수집·영장첩·대전)은 눌림 표시가 먼저 그려지도록 한 프레임 뒤에 만든다(round-2 D1, 첫 반응 ≤ 100 ms)
const HEAVY = new Set(['collection', 'builder', 'battle', 'glossary', 'market', 'decks', 'heroes', 'crates', 'open', 'commissions', 'calendar']);
function go(name, args) {
  if (HEAVY.has(name) && !go._now) { requestAnimationFrame(() => setTimeout(() => { go._now = true; try { go(name, args); } finally { go._now = false; } }, 0)); return; }
  if (name !== 'battle' && battle) { battle = null; A.finishAll(); A.queue.length = 0; }
  if (name === 'battle') return startBattleFromMenu(args);
  const el = ROUTES[name](args || {});
  show(name, el);
  window.scrollTo(0, 0);
}
S.setNav(go);

async function startBattleFromMenu({ hero, deck, mode, ai }) {
  const others = D.heroIds.filter((x) => x !== hero);
  const seed = (TEST ? 12345 : (Math.random() * 2 ** 31) | 0) >>> 0;
  const enemy = others[seed % others.length];
  const first = TEST ? 0 : seed & 1;
  const eDeck = D.decks.find((d) => d.hero === enemy);
  const myDeck = { cards: deck.cards, hero };
  const pl = first === 0 ? [0, 1] : [1, 0];
  const heroes = [], decks = [], bt = [], face = [], ais = [];
  heroes[pl[0]] = hero; decks[pl[0]] = myDeck.cards; bt[pl[0]] = btFor(myDeck, mode); face[pl[0]] = 1; ais[pl[0]] = ai;
  heroes[pl[1]] = enemy; decks[pl[1]] = eDeck.cards; bt[pl[1]] = {}; face[pl[1]] = (eDeck.ai_style && eDeck.ai_style.face) || 1; ais[pl[1]] = ai;
  lastBattleArgs = { hero, deck, mode, ai };
  // 튜토리얼(10-lore 8-7): AI 연습에서, 건너뛰지 않았고 아직 안 본 대전 단계가 있으면(본 단계는 다시 안 뜸)
  const useTut = mode === 'mode_practice' && !M.s.tut.skipped && Q.get('tut') !== '0' && !(TEST && Q.get('tut') !== '1');
  const tutorial = useTut ? { seen: M.s.tut.seen.slice(), onSeen: (k) => { if (!M.s.tut.seen.includes(k)) { M.s.tut.seen.push(k); save(); } }, onSkip: () => { M.s.tut.skipped = true; M.s.tutorialDone = true; save(); }, coach: (steps, onSkip) => coach(steps, t, { onSkip }) } : null;
  await newBattle({ heroes, decks, bt, aiFace: face, ai: ais, seed, human: pl[0], mode, tutorial });
}

async function newBattle(o) {
  bakeForBattle([...new Set([...o.decks[0], ...o.decks[1], ...Object.keys(D.tokens)])], true); // 이번 판 카드를 맨 앞으로
  aiMod = await freshAI();
  const sec = document.createElement('section');
  sec.id = 'battle'; sec.className = 'screen';
  show('battle', sec);
  const opts = {
    ...o, aiMod, noTimer: o.noTimer ?? (!M.s.settings.timer),
    onEnd: (res) => onBattleEnd(res),
    onSetting: (k, v) => { M.s.settings[k] = v; save(); },
    onTutorialDone: () => { M.s.tutorialDone = true; save(); },
  };
  battle = new Battle(sec, opts);
  logList.push({ t: 'battle_start', seed: o.seed, heroes: o.heroes, human: o.human ?? null });
  return battle;
}
// tut_done: 첫 연습 판 결과가 닫힌 뒤 한 번(10-lore 8-7 규칙 5, round-2 G3)
function tutDone(res) {
  if (res.mode !== 'mode_practice' || M.s.tut.skipped || M.s.tut.doneShown || !battle || !battle.o.tutorial) return;
  M.s.tut.doneShown = true; M.s.tutorialDone = true; save();
  setTimeout(() => coach([{ key: 'tut_done', el: null }], t, {}), 120); // 화면 전환(한 프레임 뒤) 다음
}
function onBattleEnd(res) {
  logList.push({ t: 'battle_end', winner: res.winner, len: res.len, reason: res.reason });
  let rew = null;
  if (res.human != null) { M.s.lastHero = res.heroes[res.human]; rew = battleRewards({ win: res.win, mode: res.mode, hero: res.heroes[res.human], blocks: res.blocks, brine: res.brine }); }
  if (battle && battle.root && (res.human != null || battle.o.showResult)) {
    S.resultOverlay(battle.root, res, rew, {
      rematch: () => { document.getElementById('result')?.remove(); tutDone(res); if (lastBattleArgs) startBattleFromMenu(lastBattleArgs); else go('dock'); },
      menu: () => { document.getElementById('result')?.remove(); tutDone(res); go('dock'); },
    });
  }
}

// ---------- 게임 시계 ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(100, now - last); last = now;
  requestAnimationFrame(frame); // 먼저 다음 프레임을 걸어 둠: tick 예외 하나로 판이 멈추지 않게(QA terms 6)
  if (!MANUAL) { try { tick(dt); } catch (e) { logList.push({ t: 'tick_error', msg: String(e && e.message), stack: String(e && e.stack).slice(0, 400), at: Math.round(G.now) }); if (!frame._warned) { frame._warned = true; console.warn('tick error', e); } } }
}
function tick(dt) {
  if (G.paused) return;
  const gdt = stepAll(dt);
  if (battle) battle.update(dt, gdt);
}
addEventListener('resize', () => { clearTimeout(window._rz); window._rz = setTimeout(() => { if (battle && UI.screen === 'battle') battle.resize(); }, 120); });
addEventListener('pointerdown', () => unlock(), { capture: true });
// 백그라운드(round-2 D3): 숨으면 게임 시계·턴 타이머·소리 정지, 돌아오면 대전 중이면 "이어하기" 화면(▶ 탭)
function pauseOn() { if (G.paused) return; G.paused = true; suspendAudio(); logList.push({ t: 'pause', at: Math.round(G.now) }); }
function resumeOff() { G.paused = false; resumeAudio(); last = performance.now(); document.getElementById('pauseOvl')?.remove(); logList.push({ t: 'resume', at: Math.round(G.now) }); }
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return pauseOn();
  if (!G.paused) return;
  if (battle && UI.screen === 'battle' && !battle.over) {
    if (document.getElementById('pauseOvl')) return;
    const o = document.createElement('div'); o.id = 'pauseOvl';
    const box = document.createElement('div'); box.className = 'panel col'; box.style.cssText = 'align-items:center;max-width:320px;text-align:center';
    const h3 = document.createElement('b'); h3.textContent = t('pause_title'); const p = document.createElement('div'); p.className = 'small'; p.textContent = t('pause_hint');
    const b = document.createElement('button'); b.className = 'btn primary'; b.type = 'button'; b.textContent = '▶ ' + t('pause_resume'); b.setAttribute('aria-label', t('pause_resume'));
    b.addEventListener('click', () => resumeOff()); box.append(h3, p, b); o.appendChild(box); document.body.appendChild(o);
  } else resumeOff();
});

// ---------- 테스트 훅 ----------
function engineSnap() {
  if (!battle) return null;
  const st = battle.state;
  return JSON.parse(JSON.stringify({ half: st.half, active: st.active, over: st.over, winner: st.winner, endReason: st.endReason, phase: st.phase, pending: st.pending, rngState: st.rngState,
    players: st.players.map((P) => ({ heroId: P.heroId, hero: P.hero, mana: P.mana, maxMana: P.maxMana, overloadNow: P.overloadNow, deck: P.deck.map((i) => i.cid), hand: P.hand.map((i) => ({ ...i })), board: P.board, secrets: P.secrets.map((x) => x.cid), powerUsed: P.powerUsed, fatigue: P.fatigue })) }));
}
function toIntent(a) {
  const st = battle.state, P = st.players[st.active];
  if (a.type === 'play') return { k: 'play', inst: P.hand[a.hand], target: a.target ?? null, target2: a.target2 ?? null, pos: a.pos };
  if (a.type === 'attack') return { k: 'attack', attacker: a.attacker, target: a.target };
  if (a.type === 'power') return { k: 'power', target: a.target ?? null };
  return { k: 'end' };
}
window.__game = {
  get state() { return M.s; }, get screen() { return UI.screen; }, get battle() { return engineSnap(); }, get log() { return { events: logList, battle: battle ? battle.text.slice() : [] }; },
  get tempoLog() { return { actions: A.log.slice(), inputs: battle ? battle.inputs.slice() : [] }; },
  get engine() { return Engine; }, get paused() { return !!G.paused; }, resume() { resumeOff(); }, get busy() { return A.busy || A.queue.length > 0; }, get queued() { return A.queue.length; }, get missingKeys() { return [...L.missing]; },
  go, async newBattle(o = {}) {
    const hs = D.heroIds;
    const heroA = o.heroA || hs[0], heroB = o.heroB || hs[1];
    const dA = D.decks.find((d) => d.hero === heroA), dB = D.decks.find((d) => d.hero === heroB);
    const human = o.human === undefined ? 0 : o.human;
    battle = null;
    await newBattle({ heroes: [heroA, heroB], decks: [o.deckA || dA.cards, o.deckB || dB.cards], bt: o.bt || [{}, {}], aiFace: [(dA.ai_style || {}).face || 1, (dB.ai_style || {}).face || 1],
      ai: o.ai || 'eval', seed: o.seed ?? 1, human, autoplay: !!o.autoplay, mode: o.mode || 'mode_practice', noTimer: o.noTimer ?? true, showResult: o.showResult });
    return engineSnap();
  },
  mulligan(idx = []) { if (!battle || !battle.mullBox) return false; battle.mullBox.remove(); battle.mullBox = null; battle.doMulligans(idx); return true; },
  act(a) { if (!battle) return { ok: false }; if (a.type === 'choose') return battle.chooseDiscover(a.index); return battle.input(toIntent(a)); },
  endTurn() { return battle ? battle.input({ k: 'end' }) : { ok: false }; },
  legal() { return battle ? Engine.legalActions(battle.state) : []; },
  runAI() { if (!battle || battle.state.over) return null; if (battle.isAI(battle.state.active) && !battle.auto) return { ok: false, reason: 'ai_turn' }; const a = battle.AI.chooseAction(battle.state, battle.ai[battle.state.active]); if (a.type === 'choose') { battle.chooseDiscover(a.index); return a; } const r = battle.isAI(battle.state.active) ? (A.busy && A.finishAll(), battle.perform(a), { ok: true }) : battle.input(toIntent(a)); return { action: a, ...r }; },
  autoplay(on = true) { if (battle) battle.auto = on; },
  step(ms = 16) { let left = ms; while (left > 0) { const d = Math.min(16, left); tick(d); left -= d; } return battle ? battle.state.half : null; },
  finishAnim() { A.finishAll(); },
  setAnimScale(x) { G.scale = Math.max(0, +x); }, setFast(on) { G.fast = !!on; },
  export() { if (!battle) return null; const r = battle.result || { seed: battle.o.seed, heroes: battle.o.heroes, ai: battle.ai, mulligan: battle.mull, actions: battle.actions.map((x) => x.a), winner: battle.state.winner, half: battle.state.half, final: battle.state.players.map((P) => P.hero.hp + P.hero.armor), hp: battle.state.players.map((P) => P.hero.hp), armor: battle.state.players.map((P) => P.hero.armor), over: battle.state.over }; return JSON.parse(JSON.stringify(r)); },
  save() { return save(); }, load() { load(); applySettings(); return M.s; }, reset() { resetSave(); applySettings(); },
  lang(l) { M.s.lang = l; setLang(l); save(); },
};

// ---------- 부팅 ----------
(async () => {
  const lt = document.getElementById('loadingText');
  try {
    await loadData();
    if (TEST) { M.noStore = Q.get('store') !== '1'; seedRng(1); }
    load();
    setLang(Q.get('lang') || M.s.lang || 'ko');
    lt.textContent = t('loading');
    initAudio({ off: TEST, sound: M.s.settings.sound, music: M.s.settings.music });
    applySettings();
    ads.init();
    document.title = t('game_title');
    go(Q.get('screen') || 'title');
    warmAllIdle();
    setTimeout(bakeMenuAssets, 400);
    // 첫 탭 3 s 뒤부터 쉬는 시간에 입문·표준 덱 카드 그림을 한 장씩 구워 둠(대전 직전 굽기 부담을 줄임)
    addEventListener('pointerdown', () => setTimeout(() => bakeForBattle([...new Set([...D.starters, ...D.decks].flatMap((d) => d.cards))]), 3000), { once: true });
    requestAnimationFrame(frame);
    window.__game.ready = true;
  } catch (e) {
    console.warn(e);
    lt.textContent = D.strings ? t('error_load_failed') : '…';
    const b = document.getElementById('retryLoad'); b.classList.remove('hidden'); b.onclick = () => location.reload();
  }
})();
void sfx; void allDecks;
