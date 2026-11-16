// Reverbound 웹 빌드 진입점: 데이터 로드, 화면(UI), 입력, 저장, 오디오 시계 동기화, 테스트 훅.
import { compileLevel } from './physics.js';
import { createGame } from './game.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { ads } from './ads.js';

const Q = new URLSearchParams(location.search);
const TEST = Q.get('test') === '1';
const LANG = Q.get('lang') === 'en' ? 'en' : 'ko'; // 10-lore: 한국어가 기본 언어
const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'reverbound.save.v1';

// ---------------------------------------------------------------- 아이콘 (단순 도형 SVG, 글을 못 읽어도 의미 전달)
const svg = (body, cls = 'ico', vb = '0 0 24 24') => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
const ICON = {
  play: svg('<path d="M7 4l13 8-13 8z" fill="currentColor"/>'),
  levels: svg('<rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor"/><rect x="14" y="3" width="7" height="7" rx="2" fill="currentColor"/><rect x="3" y="14" width="7" height="7" rx="2" fill="currentColor"/><rect x="14" y="14" width="7" height="7" rx="2" fill="currentColor"/>'),
  settings: svg('<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/><g stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/></g>'),
  restart: svg('<path d="M19 12a7 7 0 1 1-2.1-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M18 2v6h-6z" fill="currentColor"/>'),
  home: svg('<rect x="3" y="4" width="18" height="3" rx="1.5" fill="currentColor"/><rect x="3" y="10.5" width="18" height="3" rx="1.5" fill="currentColor"/><rect x="3" y="17" width="18" height="3" rx="1.5" fill="currentColor"/>'),
  flag: svg('<path d="M6 3v18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M7 4h11l-3 4 3 4H7z" fill="currentColor"/>'),
  flagX: svg('<path d="M6 3v18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M7 4h11l-3 4 3 4H7z" fill="currentColor" opacity=".45"/><path d="M14 14l6 6M20 14l-6 6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'),
  lock: svg('<rect x="5" y="10" width="14" height="11" rx="3" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="3"/>', 'ico lg lockIco'),
  check: svg('<path d="M5 12l5 5 9-10" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'),
  music: svg('<path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="6.5" cy="18" r="3" fill="currentColor"/><circle cx="17.5" cy="16" r="3" fill="currentColor"/>'),
  sfx: svg('<path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>'),
  mute: svg('<path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor"/><path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>'),
  shake: svg('<rect x="7" y="5" width="10" height="14" rx="2" fill="currentColor"/><path d="M3 8v8M21 8v8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>'),
  offset: svg('<path d="M12 3l7 18H5z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 15l5-8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>'),
  ring: svg('<circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"/>'),
  trash: svg('<rect x="6" y="7" width="12" height="14" rx="2" fill="currentColor"/><rect x="4" y="3.5" width="16" height="3" rx="1.5" fill="currentColor"/>'),
  normal: svg('<path d="M4 18l5-6 4 4 7-9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
  finger: svg('<circle cx="12" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="2" opacity=".6"/><rect x="9.5" y="6" width="5" height="11" rx="2.5" fill="currentColor"/><rect x="7" y="13" width="10" height="9" rx="4" fill="currentColor"/>'),
};

// 튜토리얼 그림 (게임 오브젝트와 같은 색·형태, 48x48)
function cueIcon(key, C) {
  const hand = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${C.hud}" stroke="${C.outline}" stroke-width="1.5"><rect x="-3" y="-2" width="6" height="12" rx="3"/><rect x="-6" y="7" width="12" height="10" rx="4.5"/></g>`;
  const tapRing = (x, y) => `<circle cx="${x}" cy="${y}" r="6" fill="none" stroke="${C.hud}" stroke-width="2"><animate attributeName="r" values="3;9;3" dur="1s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/></circle>`;
  const oct = (x, y, s) => `<polygon transform="translate(${x} ${y}) scale(${s})" points="2.1,0.3 7.9,0.3 9.7,2.1 9.7,7.9 7.9,9.7 2.1,9.7 0.3,7.9 0.3,2.1" fill="${C.player}" stroke="${C.outline}" stroke-width="0.8"/>`;
  const tri = (x, y, w, h, flip) => flip ? `<polygon points="${x},${y} ${x + w},${y} ${x + w / 2},${y + h}" fill="${C.hazard}" stroke="${C.outline}" stroke-width="1.5"/>` : `<polygon points="${x},${y + h} ${x + w / 2},${y} ${x + w},${y + h}" fill="${C.hazard}" stroke="${C.outline}" stroke-width="1.5"/>`;
  const arc = (d) => `<path d="${d}" fill="none" stroke="${C.hud}" stroke-width="2" stroke-dasharray="3 3"/>`;
  const no = (x, y) => `<g stroke="${C.hazard}" stroke-width="3" stroke-linecap="round"><path d="M${x - 6} ${y - 6}l12 12M${x + 6} ${y - 6}l-12 12"/></g>`;
  let b = '';
  switch (key) {
    case 'tut_tap': b = oct(4, 32, 1.2) + arc('M10 32 Q20 6 34 30') + hand(36, 18, 1) + tapRing(36, 16); break;
    case 'tut_shard': b = oct(2, 34, 1.1) + tri(20, 32, 12, 14) + arc('M8 33 Q26 4 44 34'); break;
    case 'tut_beat': b = `<g fill="${C.hud}"><circle cx="10" cy="38" r="5"/><rect x="13" y="10" width="3" height="28"/><circle cx="32" cy="34" r="5"/><rect x="35" y="6" width="3" height="28"/><rect x="13" y="6" width="25" height="5"/></g>`; break;
    case 'tut_low': b = oct(2, 34, 1.1) + tri(22, 39, 10, 7) + arc('M8 33 Q28 14 44 34'); break;
    case 'tut_crate': b = oct(4, 14, 1.1) + `<rect x="18" y="26" width="26" height="20" rx="2" fill="${C.ground}" stroke="${C.outline}" stroke-width="1.5"/><rect x="20" y="28" width="22" height="3" fill="${C.groundEdge}"/>` + arc('M8 14 Q14 2 26 22'); break;
    case 'tut_hold': b = hand(24, 16, 1.3) + `<rect x="6" y="40" width="36" height="5" rx="2.5" fill="${C.hud}"/>`; break;
    case 'tut_drum': b = `<path d="M8 46 A16 10 0 0 1 40 46 Z" fill="${C.trigger}" stroke="${C.outline}" stroke-width="1.5"/><path d="M24 30V6M16 14l8-8 8 8" fill="none" stroke="${C.trigger}" stroke-width="3" stroke-linecap="round"/>`; break;
    case 'tut_hanging': b = `<rect x="6" y="2" width="36" height="3" fill="${C.ground}"/>` + tri(14, 5, 20, 18, true) + oct(18, 34, 1.2) + no(40, 34); break;
    case 'tut_string': b = `<rect x="6" y="24" width="36" height="6" rx="2" fill="${C.ground}" stroke="${C.outline}" stroke-width="1.5"/><rect x="8" y="25.5" width="32" height="1.5" fill="${C.groundEdge}"/>` + oct(18, 8, 1.2) + `<path d="M24 34v10" stroke="${C.hud}" stroke-width="2" stroke-dasharray="2 2"/>`; break;
    case 'tut_ring': b = `<circle cx="20" cy="18" r="9" fill="none" stroke="${C.outline}" stroke-width="5"/><circle cx="20" cy="18" r="9" fill="none" stroke="${C.trigger}" stroke-width="3"/>` + hand(38, 28, 1) + tapRing(38, 26); break;
    case 'tut_tempo': b = `<rect x="14" y="2" width="20" height="44" rx="10" fill="${C.gateFast}" fill-opacity=".15" stroke="${C.gateFast}" stroke-width="3"/><g fill="none" stroke="${C.gateFast}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18l5 6-5 6M23 18l5 6-5 6M29 18l3 6-3 6"/></g>`; break;
    case 'tut_restart': b = `<g transform="scale(2)" color="${C.hud}">${ICON.restart.replace(/<\/?svg[^>]*>/g, '')}</g>`; break;
    default: b = oct(14, 14, 2);
  }
  return `<svg viewBox="0 0 48 48" aria-hidden="true">${b}</svg>`;
}

// ---------------------------------------------------------------- 저장 (localStorage, 실패해도 게임은 동작)
const defaults = () => ({ v: 1, levels: {}, settings: { music: 80, sfx: 80, offset: 0, shake: true, triggerSfx: false, muted: false }, flags: {} });
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaults();
    const d = JSON.parse(raw);
    const base = defaults();
    return { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) }, levels: d.levels || {}, flags: d.flags || {} };
  } catch { return defaults(); }
}
let save = loadSave();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {} }
const lv = (id) => (save.levels[id] ??= { best: 0, bestPractice: 0, cleared: false, attempts: 0 });

// ---------------------------------------------------------------- 상태
let DATA = null, STR = {}, LEVELS = [], COMPILED = [];
let screen = 'loading';
let practiceSel = false;
let selLevel = 0;
let audio = null, R = null, G = null;
let clearTimer = null;
let autoPaused = false;
let inputHeld = false;
let cueIdx = -1, cueUntil = 0, toastUntil = 0, attBigUntil = 0;
let menuCam = 0;
let practiceAttempts = 0;
let deathMsgIdx = 0;
let clock = { lastPerf: 0, ctxStart: null };
let seed = 1;
const rand = TEST ? () => ((seed = (seed * 16807) % 2147483647) / 2147483647) : Math.random;

const t = (key, vars = {}) => {
  const e = STR.strings?.[key];
  let s = e ? e[LANG] ?? e.ko : key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
};

// ---------------------------------------------------------------- 로드
async function fetchJSON(p) {
  const r = await fetch(p, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${p} ${r.status}`);
  return r.json();
}
async function boot() {
  try {
    const [bal, art, strings, music] = await Promise.all(['data/balance.json', 'data/art.json', 'data/strings.json', 'data/music.json'].map(fetchJSON));
    STR = strings;
    $('loadingText').textContent = t('loading');
    LEVELS = await Promise.all(bal.levels.map((f) => fetchJSON('data/' + f)));
    let testInputs = null;
    if (TEST) { try { testInputs = await fetchJSON('data/test-inputs.json'); } catch {} }
    else { try { DATA_demo = await fetchJSON('data/test-inputs.json'); } catch {} }
    DATA = { bal, art, strings, music, testInputs };
    COMPILED = LEVELS.map((l) => compileLevel(l, bal));
    setup();
  } catch (err) {
    console.warn('load failed', err);
    $('loadingText').textContent = STR.strings ? t('load_error') : 'Load error';
    $('retryLoad').classList.remove('hidden');
  }
}
let DATA_demo = null;
$('retryLoad').addEventListener('click', () => location.reload());

function applyTheme(theme) {
  const env = DATA.art.palette[theme] ?? DATA.art.palette.level1;
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries({ ...DATA.art.common, ...env })) root.setProperty('--' + k, v);
  root.setProperty('--tile', (R ? R.T : 36) + 'px');
}

// ---------------------------------------------------------------- 셋업
function setup() {
  const { bal, art, music } = DATA;
  R = createRenderer($('cv'), art, bal, { rand });
  R.resize();
  audio = createAudio(music);
  audio.enabled = !TEST;
  applySettings();
  G = createGame(bal, {
    onAttempt(n, fromS) { onAttempt(n, fromS); },
    onBeforeRestart() { G.preroll = prerollS(); },
    onDeath(d) { onDeath(d); },
    onEvent(ev, g) { onPhysEvent(ev, g); },
    onGate(i) { R.onGate(i); },
    onClear() { onClear(); },
  });
  R.prepare(COMPILED[0]);
  applyTheme(LEVELS[0].theme_id);
  fillStaticText();
  ads.init();
  window.addEventListener('resize', () => { R.resize(); applyTheme(curTheme()); checkRotate(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) onHidden(); });
  window.addEventListener('blur', () => { if (!TEST && screen === 'playing' && G.state === 'playing') pauseGame(true); });
  bindInput();
  show('title');
  checkRotate();
  requestAnimationFrame(frame);
}
const curTheme = () => (G && G.L ? G.L.level.theme_id : LEVELS[selLevel]?.theme_id ?? 'level1');

function fillStaticText() {
  document.documentElement.lang = LANG;
  $('titleMain').textContent = t('title');
  $('titleAlt').textContent = LANG === 'ko' ? STR.strings.title.en : STR.strings.title.ko;
  $('subtitle').textContent = t('subtitle');
  $('tapStartText').innerHTML = ICON.finger + `<span>${t('tap_to_start')}</span>`;
  $('audioUnlock').textContent = t('audio_unlock');
  $('btnPlay').innerHTML = ICON.play + `<span>${t('menu_play')}</span>`;
  $('btnLevels').innerHTML = ICON.levels + `<span>${t('menu_levels')}</span>`;
  $('btnSettings').innerHTML = ICON.settings + `<span>${t('menu_settings')}</span>`;
  $('modeNormal').innerHTML = ICON.normal + `<span>${t('mode_normal')}</span>`;
  $('modePractice').innerHTML = ICON.flag + `<span>${t('mode_practice')}</span>`;
  $('setTitle').innerHTML = t('menu_settings');
  $('lMusic').innerHTML = ICON.music + ' ' + t('settings_music');
  $('lSfx').innerHTML = ICON.sfx + ' ' + t('settings_sfx');
  $('lOffset').innerHTML = ICON.offset + ' ' + t('settings_offset');
  $('offsetHelp').textContent = t('settings_offset_help');
  $('bOffsetTest').innerHTML = ICON.finger + t('settings_offset_test');
  $('lShake').innerHTML = ICON.shake + ' ' + t('settings_shake');
  $('lTrig').innerHTML = ICON.ring + ' ' + t('settings_trigger_sfx');
  $('bReset').innerHTML = ICON.trash + t('settings_reset');
  $('pauseTitle').textContent = t('pause_title');
  $('pauseBg').textContent = t('paused_background');
  $('pResume').innerHTML = ICON.play + t('pause_resume');
  $('pRestart').innerHTML = ICON.restart + t('pause_restart');
  $('pQuit').innerHTML = ICON.levels + t('pause_quit');
  $('cRetry').innerHTML = ICON.restart + t('clear_retry');
  $('cLevels').innerHTML = ICON.levels + t('clear_levels');
  $('cNext').innerHTML = ICON.play + t('clear_next');
  $('confirmText').textContent = t('settings_reset_confirm');
  $('cfYes').textContent = t('confirm_yes');
  $('cfNo').textContent = t('confirm_no');
  $('cpPlace').innerHTML = ICON.flag + `<span class="lbl">${t('practice_place_btn')}</span>`;
  $('cpRemove').innerHTML = ICON.flagX + `<span class="lbl">${t('practice_remove_btn')}</span>`;
  $('cpPlace').setAttribute('aria-label', t('practice_place_btn'));
  $('cpRemove').setAttribute('aria-label', t('practice_remove_btn'));
  $('rotateText').textContent = t('rotate_hint');
}

// ---------------------------------------------------------------- 화면 전환
const SCREENS = ['loading', 'title', 'levels', 'settings', 'pause', 'countdown', 'clearS', 'confirm'];
function show(name) {
  screen = name;
  const domId = { clear: 'clearS' }[name] ?? name;
  for (const s of SCREENS) $(s).classList.toggle('show', s === domId);
  const inGame = ['playing', 'pause', 'countdown', 'clear'].includes(name);
  $('hud').classList.toggle('hidden', !inGame || name === 'clear');
  if (!inGame) { $('cue').classList.add('hidden'); $('toast').classList.add('hidden'); }
  // 배너는 메뉴에서만 (플레이 중 금지), 웹은 더미
  if (inGame) ads.hideBanner(); else if (name !== 'loading') ads.showBanner('menu');
  if (name === 'levels') renderCards();
  if (name === 'settings') renderSettings();
  if (name === 'title') {
    const unlocked = audio.running() || TEST;
    $('tapStart').classList.toggle('hidden', unlocked);
    $('menu').classList.toggle('hidden', !unlocked);
    $('hubLink').classList.toggle('hidden', !unlocked);
  }
}
function menuTap() { audio.sfx('menu'); }

function renderCards() {
  const wrap = $('cards');
  wrap.innerHTML = '';
  $('modeNormal').classList.toggle('on', !practiceSel);
  $('modePractice').classList.toggle('on', practiceSel);
  LEVELS.forEach((l, i) => {
    const rec = lv(l.id);
    const unlocked = i === 0 || lv(LEVELS[i - 1].id).cleared || TEST;
    const env = DATA.art.palette[l.theme_id];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card' + (unlocked ? '' : ' locked');
    b.style.background = env.bgFar;
    b.style.borderColor = DATA.art.common.outline;
    const stars = '<span class="starRow">' + Array.from({ length: l.difficulty?.stars ?? 1 }, () => `<svg class="ico" viewBox="0 0 24 24"><polygon points="12,3 15,10 22,10 16.5,14.5 18.5,21 12,17 5.5,21 7.5,14.5 2,10 9,10" fill="${DATA.art.common.player}" stroke="${DATA.art.common.outline}" stroke-width="1.5"/></svg>`).join('') + '</span>';
    b.innerHTML = `<span class="num">${i + 1}</span>${stars}<span class="nm">${t(l.name_key)}</span><span class="tag">${t(`level${i + 1}_tag`)}</span>` +
      (unlocked ? `<span class="best">${t('best_normal', { pct: Math.floor(rec.best) })}</span><span class="best">${t('best_practice', { pct: Math.floor(rec.bestPractice) })}</span>`
        : `${ICON.lock}<span class="tag">${t('level_locked')}</span>`) +
      (rec.cleared ? `<span class="badge">${ICON.check}${t('cleared_badge')}</span>` : '');
    b.style.setProperty('--ground', env.ground);
    b.addEventListener('click', () => { if (!unlocked) { menuTap(); b.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 200); return; } menuTap(); startLevel(i, practiceSel); });
    b.addEventListener('pointerenter', () => { selLevel = i; R.prepare(COMPILED[i]); applyTheme(l.theme_id); });
    wrap.appendChild(b);
  });
}

function renderSettings() {
  const s = save.settings;
  $('sMusic').value = s.music; $('sSfx').value = s.sfx; $('sOffset').value = s.offset;
  $('vOffset').textContent = t('settings_offset_unit', { ms: (s.offset > 0 ? '+' : '') + s.offset });
  const tog = (el, on) => { el.classList.toggle('on', on); el.textContent = on ? t('settings_on') : t('settings_off'); };
  tog($('bShake'), s.shake); tog($('bTrig'), s.triggerSfx);
  $('bMute').classList.toggle('on', !s.muted);
  $('bMute').innerHTML = s.muted ? ICON.mute : ICON.sfx;
  $('bMute').setAttribute('aria-label', s.muted ? t('settings_off') : t('settings_on'));
}
function applySettings() {
  const s = save.settings;
  const m = s.muted ? 0 : s.music / 100, f = s.muted ? 0 : s.sfx / 100;
  audio.setVolumes(m, f);
  audio.offsetMs = s.offset;
  audio.triggerSfx = s.triggerSfx;
  R.shakeOn = s.shake && !TEST;
}

// ---------------------------------------------------------------- 플레이
function prerollS() {
  if (!audio.running()) return 0;
  return 0.05 + Math.max(0, audio.comp());
}
function startLevel(i, practice) {
  selLevel = i;
  practiceSel = practice;
  clearTimeout(clearTimer);
  const L = COMPILED[i];
  R.prepare(L);
  R.clearFx();
  applyTheme(L.level.theme_id);
  practiceAttempts = 0;
  seed = 1;
  deathMsgIdx = 0;
  show('playing');
  G.start(L, i, { practice, attempts: practice ? 0 : lv(L.level.id).attempts, preroll: prerollS() });
  $('cpPlace').parentElement.querySelectorAll('.practiceOnly').forEach((e) => e.classList.toggle('hidden', !practice));
  updateHud(true);
}
function onAttempt(n, fromS) {
  const L = G.L;
  if (!G.practice) { lv(L.level.id).attempts = n; persist(); } else practiceAttempts = n;
  R.clearFx();
  attBigUntil = performance.now() + 1500;
  // 튜토리얼: 시작 지점 이전 문구는 건너뜀
  const x0 = L.X[G.k];
  cueIdx = -1;
  (L.level.cues || []).forEach((c, j) => { if (c.x < x0 - 0.01) cueIdx = j; });
  $('cue').classList.add('hidden');
  // 음악: 게임 시간 fromS부터, 오디오 시계 기준
  clock.ctxStart = null;
  if (audio.running()) {
    clock.ctxStart = audio.startRun(L.level, L, L.level.theme_id, fromS, G.preroll);
  }
  // 누른 채 재시작하면 바로 홀드 점프
  if (inputHeld) G.press(G.k);
  updateHud(true);
}
function onDeath(d) {
  audio.stopRun(true);
  audio.sfx('death');
  R.onDeath(d.x, d.y, DATA.bal.death_fx_s);
  const pct = Math.min(100, (d.x / G.L.level.length_tiles) * 100);
  const rec = lv(G.L.level.id);
  const key = G.practice ? 'bestPractice' : 'best';
  let msg;
  if (pct > rec[key] + 1e-9) {
    const had = rec[key] > 0;
    rec[key] = pct; persist();
    if (had) { msg = t('new_best'); audio.sfx('new_best'); }
  }
  if (!save.flags.restartTipShown) { save.flags.restartTipShown = true; persist(); toast(cueIconInline('tut_restart') + t('tut_restart'), 1200); return; }
  const list = STR.death_messages || [];
  const dm = list.length ? list[(TEST ? deathMsgIdx++ : Math.floor(Math.random() * list.length)) % list.length][LANG] : '';
  toast(msg ? `${msg}<small>${dm}</small>` : dm, 700);
}
const cueIconInline = (k) => `<span style="display:block;margin:0 auto 4px;width:48px;height:48px">${cueIcon(k, DATA.art.common)}</span>`;
function onPhysEvent(ev, g) {
  const L = g.L;
  if (ev & 1) R.onJump(g.prev.x, g.prev.y);
  if (ev & 4) R.onLand(L.X[g.k], g.s.y);
  const ids = g.s.used;
  if (ev & 8) { const o = L.byId.get(ids[ids.length - 1]); if (o) R.onPad(o.src); audio.sfx('trigger'); }
  if (ev & 2) { const o = L.byId.get(ids[ids.length - 1 - (ev & 8 ? 1 : 0)]); if (o) R.onOrb(o.src, L.X[g.k], g.s.y); audio.sfx('trigger'); }
}
function onClear() {
  const L = G.L, rec = lv(L.level.id);
  audio.stopRun(false);
  audio.sfx('clear', { theme: L.level.theme_id });
  if (!G.practice) { rec.cleared = true; rec.best = 100; rec.clearAttempts ??= G.attempts; }
  else rec.bestPractice = 100;
  persist();
  R.onClear(camFor(G.x()));
  $('cue').classList.add('hidden');
  if (!TEST) clearTimer = setTimeout(showClearScreen, 1200);
}
function showClearScreen() {
  if (screen !== 'playing' || G.state !== 'clear') return;
  const i = G.levelIndex;
  $('clearTitle').textContent = t(`clear_title_l${i + 1}`);
  const subs = STR.clear_subtitles || [];
  $('clearSub').textContent = subs.length ? subs[TEST ? 0 : Math.floor(Math.random() * subs.length)][LANG] : '';
  $('clearAtt').textContent = t('clear_attempts', { n: G.attempts });
  const last = i >= LEVELS.length - 1;
  $('cNext').classList.toggle('hidden', last);
  $('clearAll').classList.toggle('hidden', !last);
  $('clearAll').textContent = t('clear_all');
  show('clear');
}
function quitToLevels() { audio.stopRun(true); G.stop(); clearTimeout(clearTimer); R.clearFx(); show('levels'); }

function pauseGame(auto = false) {
  if (screen !== 'playing') return;
  if (G.state === 'clear') return;
  G.paused = true;
  autoPaused = auto;
  audio.suspend();
  $('pauseBg').classList.toggle('hidden', !auto);
  $('pPractice').innerHTML = ICON.flag + t('pause_practice_toggle') + ` · ${G.practice ? t('settings_on') : t('settings_off')}`;
  show('pause');
}
function resumeGame() {
  if (screen !== 'pause') return;
  const parts = t('resume_countdown').split('·').map((s) => s.trim());
  show('countdown');
  if (TEST) { finishResume(); return; }
  let n = 0;
  const tick = () => {
    if (screen !== 'countdown') return;
    if (n >= parts.length) { finishResume(); return; }
    $('cdNum').textContent = parts[n++];
    setTimeout(tick, 400);
  };
  tick();
}
function finishResume() {
  show('playing');
  audio.resume();
  G.paused = false;
  inputHeld = false; G.held = false;
  clock.lastPerf = performance.now();
}
function onHidden() {
  if (screen === 'playing' && (G.state === 'playing' || G.state === 'dead')) pauseGame(true);
  else if (screen === 'countdown') { G.paused = true; show('pause'); $('pauseBg').classList.remove('hidden'); }
  audio.suspend();
}

// ---------------------------------------------------------------- 입력
function bindInput() {
  const isUI = (e) => e.target.closest && e.target.closest('button, a, input, label, .panel, .card');
  window.addEventListener('pointerdown', (e) => {
    audio.unlock();
    if (screen === 'title' && !$('tapStart').classList.contains('hidden')) {
      e.preventDefault();
      setTimeout(() => show('title'), 30);
      return;
    }
    if (screen !== 'playing' || isUI(e)) return;
    e.preventDefault();
    inputHeld = true;
    if (G.state === 'playing' && !G.paused) G.press(G.tickAtPerf(e.timeStamp));
  }, { passive: false });
  const up = (e) => {
    inputHeld = false;
    if (screen === 'playing' && G.state === 'playing') G.release(G.tickAtPerf(e.timeStamp));
  };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  const JUMP = new Set(['Space', 'ArrowUp', 'KeyW', 'Enter']);
  window.addEventListener('keydown', (e) => {
    audio.unlock();
    if (screen === 'title' && !$('tapStart').classList.contains('hidden')) { show('title'); return; }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (screen === 'playing') pauseGame(); else if (screen === 'pause') resumeGame();
      else if (['levels', 'settings'].includes(screen)) show('title');
      return;
    }
    if (screen !== 'playing') return;
    if (JUMP.has(e.code)) {
      e.preventDefault();
      if (e.repeat) return;
      inputHeld = true;
      if (G.state === 'playing' && !G.paused) G.press(G.tickAtPerf(e.timeStamp));
    } else if (e.code === 'KeyZ') placeCp(); else if (e.code === 'KeyX') removeCp();
  });
  window.addEventListener('keyup', (e) => {
    if (JUMP.has(e.code)) { inputHeld = false; if (screen === 'playing' && G.state === 'playing') G.release(G.tickAtPerf(e.timeStamp)); }
  });

  const click = (id, fn) => $(id).addEventListener('click', (e) => { e.stopPropagation(); menuTap(); fn(e); });
  click('btnPlay', () => {
    let i = 0;
    while (i < LEVELS.length - 1 && lv(LEVELS[i].id).cleared) i++;
    startLevel(i, false);
  });
  click('btnLevels', () => show('levels'));
  click('btnSettings', () => show('settings'));
  document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { menuTap(); show('title'); }));
  click('modeNormal', () => { practiceSel = false; renderCards(); });
  click('modePractice', () => { practiceSel = true; renderCards(); });
  $('pauseBtn').addEventListener('pointerdown', (e) => { e.stopPropagation(); });
  click('pauseBtn', () => pauseGame());
  for (const id of ['cpPlace', 'cpRemove']) $(id).addEventListener('pointerdown', (e) => e.stopPropagation());
  $('cpPlace').addEventListener('click', (e) => { e.stopPropagation(); placeCp(); });
  $('cpRemove').addEventListener('click', (e) => { e.stopPropagation(); removeCp(); });
  click('pResume', resumeGame);
  click('pRestart', () => { G.paused = false; audio.resume(); G.checkpoints = []; startLevel(G.levelIndex, G.practice); });
  click('pPractice', () => { G.paused = false; audio.resume(); startLevel(G.levelIndex, !G.practice); });
  click('pQuit', () => { G.paused = false; audio.resume(); quitToLevels(); });
  click('cRetry', () => startLevel(G.levelIndex, G.practice));
  click('cLevels', () => quitToLevels());
  click('cNext', () => startLevel(Math.min(G.levelIndex + 1, LEVELS.length - 1), false));
  // 설정
  const setS = (k, v) => { save.settings[k] = v; persist(); applySettings(); renderSettings(); };
  $('sMusic').addEventListener('input', (e) => setS('music', +e.target.value));
  $('sSfx').addEventListener('input', (e) => setS('sfx', +e.target.value));
  $('sOffset').addEventListener('input', (e) => setS('offset', +e.target.value));
  click('bMute', () => setS('muted', !save.settings.muted));
  click('bShake', () => setS('shake', !save.settings.shake));
  click('bTrig', () => setS('triggerSfx', !save.settings.triggerSfx));
  click('bReset', () => show('confirm'));
  click('cfNo', () => show('settings'));
  click('cfYes', () => { const s = save.settings; save = defaults(); save.settings = s; persist(); show('settings'); });
  click('bOffsetTest', offsetTest);
  $('rotateClose').addEventListener('click', (e) => { e.stopPropagation(); $('rotate').classList.add('hidden'); save.flags.rotateShown = true; persist(); });
}
function placeCp() {
  if (G.placeCheckpoint()) { audio.sfx('checkpoint'); toast(cueIconInlineFlag() + t('practice_checkpoint_placed'), 700); }
}
function removeCp() {
  if (G.removeCheckpoint()) { audio.sfx('menu'); toast(t('practice_checkpoint_removed'), 700); }
}
const cueIconInlineFlag = () => `<span style="display:block;margin:0 auto 2px;color:${DATA.art.common.trigger}">${ICON.flag.replace('class="ico"', 'class="ico lg"')}</span>`;

// 박자 보정 테스트: 메트로놈 8박, 탭 시각 평균 차이 → 보정값 제안·적용
let offTest = null;
function offsetTest() {
  if (!audio.running()) { audio.unlock(); }
  if (!audio.ctx) return;
  const beat = 0.5, n = 8, ctx = audio.ctx;
  const t0 = ctx.currentTime + 0.3 - audio.comp();
  for (let i = 0; i < n; i++) audio.sfx('tick', { at: t0 + i * beat, hz: i % 4 ? 880 : 1320 });
  offTest = { t0: t0 + audio.comp(), beat, n, taps: [] };
  const out = $('offsetTestOut');
  out.textContent = '…';
  const onTap = (e) => {
    if (!offTest) return;
    if (e.target.id === 'bOffsetTest') return;
    const now = ctx.currentTime - (performance.now() - e.timeStamp) / 1000;
    const rel = (now - offTest.t0) / offTest.beat;
    const nearest = Math.round(rel);
    if (nearest >= 0 && nearest < offTest.n) offTest.taps.push((rel - nearest) * offTest.beat * 1000);
  };
  window.addEventListener('pointerdown', onTap);
  setTimeout(() => {
    window.removeEventListener('pointerdown', onTap);
    const taps = offTest.taps; offTest = null;
    if (taps.length < 3) { out.textContent = '-'; return; }
    taps.sort((a, b) => a - b);
    const med = taps[Math.floor(taps.length / 2)];
    // 탭이 소리보다 늦으면 = 소리가 늦게 들림 → +
    const v = Math.max(-200, Math.min(200, Math.round((save.settings.offset + med) / 5) * 5));
    save.settings.offset = v; persist(); applySettings(); renderSettings();
    out.textContent = t('settings_offset_unit', { ms: (v > 0 ? '+' : '') + v });
  }, (0.3 + n * beat + 0.4) * 1000);
}

function checkRotate() {
  const portrait = window.innerHeight > window.innerWidth;
  $('rotate').classList.toggle('hidden', !(portrait && !save.flags.rotateShown && !TEST));
}

// ---------------------------------------------------------------- HUD·문구
function toast(html, ms) {
  const el = $('toast');
  el.innerHTML = html;
  el.classList.toggle('hidden', !html);
  toastUntil = performance.now() + ms;
}
function updateHud(force) {
  if (!G.L) return;
  const pct = G.progress();
  $('barFill').style.width = pct.toFixed(2) + '%';
  const rec = lv(G.L.level.id);
  $('barBest').style.left = `calc(${(G.practice ? rec.bestPractice : rec.best).toFixed(2)}% - 1.5px)`;
  $('pct').textContent = t('progress', { pct: Math.floor(pct) });
  const att = $('att');
  const txt = t('attempt', { n: G.practice ? practiceAttempts : G.attempts });
  if (force || att.textContent !== txt) att.textContent = txt;
  att.classList.toggle('big', performance.now() < attBigUntil);
}
function updateCue() {
  const L = G.L;
  if (!L || G.state !== 'playing') return;
  const cues = L.level.cues || [];
  const x = G.x();
  let j = cueIdx;
  while (j + 1 < cues.length && cues[j + 1].x <= x) j++;
  if (j !== cueIdx) {
    cueIdx = j;
    if (!lv(L.level.id).cleared || G.practice) {
      const c = cues[j];
      $('cue').innerHTML = cueIcon(c.key, DATA.art.common) + `<span>${t(c.key)}</span>`;
      $('cue').classList.remove('hidden');
      cueUntil = G.time + 3;
    }
  }
  if (G.time > cueUntil) $('cue').classList.add('hidden');
}

// 손가락 시연: 레벨 1을 아직 못 깼으면 첫 구간 탭 시점에 손가락이 화면을 누르는 그림
function demoTaps() {
  const src = (DATA.testInputs || DATA_demo)?.levels?.[G.L.level.id];
  if (!src || G.levelIndex !== 0 || lv(G.L.level.id).cleared) return null;
  return src.on_beat_taps;
}
function drawDemo(view) {
  const taps = demoTaps();
  if (!taps || G.state !== 'playing') return;
  const hz = DATA.bal.physics_hz, now = G.time;
  const limitS = (LEVELS[0].sections.find((s) => s.name === 'learn_low')?.start_beat ?? 24) * 60 / LEVELS[0].bpm;
  let next = null;
  for (const k of taps) { const ts = k / hz; if (ts > limitS) break; if (ts > now - 0.25) { next = ts; break; } }
  if (next == null) return;
  const dtTo = next - now;
  if (dtTo > 0.9) return;
  const ctx = R.ctx, T = R.T;
  const px = (view.x - view.camX + 0.5) * T + 2.4 * T, py = R.gameTop + 3.2 * T;
  const press = Math.abs(dtTo) < 0.12;
  const C = DATA.art.common;
  ctx.save();
  ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
  ctx.globalAlpha = dtTo > 0.6 ? (0.9 - dtTo) / 0.3 : dtTo < -0.1 ? Math.max(0, 1 + (dtTo + 0.1) / 0.15) : 1;
  const s = T / 36;
  ctx.translate(px, py + (press ? 6 * s : 0));
  ctx.scale(s, s);
  ctx.fillStyle = C.hud; ctx.strokeStyle = C.outline; ctx.lineWidth = 2.5;
  const rr = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke(); };
  rr(-6, -14, 12, 26, 6); rr(-13, 6, 26, 22, 9);
  if (press) { ctx.strokeStyle = C.hud; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -16, 14, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}

// ---------------------------------------------------------------- 시계·프레임
const camFor = (x) => x - (R.W * R.playerRatio) / R.T;
function syncClock() {
  // 오디오 시계 기준: 화면의 게임 시간 = ctx.currentTime - ctxStart
  if (TEST || clock.ctxStart == null || !audio.running() || G.state !== 'playing' || G.paused) return;
  if (audio.runCtxStart() !== clock.ctxStart) return;
  const want = audio.ctx.currentTime - clock.ctxStart;
  const err = want - G.time;
  if (Math.abs(err) > 0.05) G.time += err;
  else G.time += err * 0.1;
}
function sectionAt(level, beat) {
  let s = level.sections[0];
  for (const x of level.sections) if (x.start_beat <= beat + 1e-6) s = x;
  return s;
}

let lastFrame = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = lastFrame ? Math.min(0.25, (now - lastFrame) / 1000) : 1 / 60;
  lastFrame = now;
  if (!TEST) {
    if (screen === 'playing') {
      G.advance(dt, now);
      syncClock();
    }
    R.update(dt);
  }
  draw(now, dt);
}
function draw(now, dt) {
  let view;
  if (G.L && ['playing', 'pause', 'countdown', 'clear'].includes(screen)) {
    const L = G.L, a = G.alpha();
    const cx = L.X[Math.min(G.k, L.nTicks)];
    let x = G.prev.x + (cx - G.prev.x) * a;
    let y = G.prev.y + (G.s.y - G.prev.y) * a;
    const rot = G.prevRot + (G.rot - G.prevRot) * a;
    let camX = camFor(x);
    if (G.state === 'dead') { x = G.death.x; camX = camFor(G.death.x); }
    if (G.state === 'clear') { camX = camFor(cx); x = cx + L.V[L.V.length - 1] * G.clearT; }
    const beatS = 60 / L.level.bpm;
    const beat = G.time / beatS;
    const sec = sectionAt(L.level, Math.max(0, beat));
    view = { x, y, rot, camX, beat, beatS, intensity: sec.intensity, showPlayer: G.state !== 'dead', G };
    R.draw(view);
    drawDemo(view);
    if (screen === 'playing') { updateHud(false); updateCue(); }
  } else {
    // 메뉴 배경: 선택 레벨을 천천히 흘려 보여 줌
    menuCam += dt * 3;
    const L = COMPILED[selLevel];
    const beatS = 60 / L.level.bpm;
    view = { x: 0, y: 0, rot: 0, camX: menuCam % (L.level.length_tiles - 30), beat: now / 1000 / beatS, beatS, intensity: 1, showPlayer: false };
    R.draw(view);
  }
  if (toastUntil && performance.now() > toastUntil) { $('toast').classList.add('hidden'); toastUntil = 0; }
}

// ---------------------------------------------------------------- 테스트 훅 (?test=1: 오디오·랜덤 연출 끔, step()으로만 진행)
const hook = {
  get state() {
    if (screen === 'pause' || screen === 'countdown') return 'paused';
    if (screen === 'playing') return G.state === 'idle' ? 'playing' : G.state;
    return screen;
  },
  get screen() { return screen; },
  get levelIndex() { return G ? G.levelIndex : -1; },
  get progress() { return G ? G.progress() : 0; },
  get attempts() { return G ? (G.practice ? practiceAttempts : G.attempts) : 0; },
  get tick() { return G ? G.k : 0; },
  get player() { return G && G.s ? { x: G.x(), y: G.s.y, vy: G.s.vy, grounded: G.s.g } : null; },
  get practice() { return G ? G.practice : false; },
  get ready() { return !!G; },
  get audio() { return audio?.ctx ? audio.ctx.state : 'off'; },
  loadLevel(i, opts = {}) { startLevel(i, !!opts.practice); return hook.state; },
  step(dt = 1 / 60) {
    const n = Math.max(1, Math.round(dt * DATA.bal.physics_hz));
    for (let j = 0; j < n; j++) { G.advance(1 / DATA.bal.physics_hz, performance.now()); R.update(1 / DATA.bal.physics_hz); }
    if (G.state === 'clear' && screen === 'playing' && G.clearT >= 1.2) showClearScreen();
    return hook.state;
  },
  press() { inputHeld = true; G.press(); },
  release() { inputHeld = false; G.release(); },
  placeCheckpoint: () => G.placeCheckpoint(),
  removeCheckpoint: () => G.removeCheckpoint(),
  pause: () => pauseGame(false),
  resume: () => resumeGame(),
  show: (name) => show(name),
  // 검증기 입력열 재생: 레벨 i를 시작하고 탭(틱 목록)대로 진행. 반환 {state, progress, attempts, death}
  replay(i, taps, { holdTicks = 1, frameDt = 1 / 60 } = {}) {
    taps ??= DATA.testInputs?.levels?.[LEVELS[i].id]?.taps ?? [];
    startLevel(i, false);
    for (const k of taps) { G.press(k); G.release(k + holdTicks); }
    let guard = 0;
    while (G.state === 'playing' && guard++ < 100000) { G.advance(frameDt, performance.now()); R.update(frameDt); }
    return { state: G.state, progress: G.progress(), attempts: G.attempts, death: G.death };
  },
  get testInputs() { return DATA?.testInputs; },
  get save() { return JSON.parse(JSON.stringify(save)); },
};
window.__game = hook;

boot();
