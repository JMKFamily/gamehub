// Reverbound 웹 빌드 진입점: 데이터 로드, 화면(UI), 입력, 저장, 오디오 시계 동기화, 테스트 훅.
import { compileLevel } from './physics.js';
import { createGame } from './game.js';
import { createRenderer } from './render.js';
import { createAudio, deriveTheme } from './audio.js';
import { ads } from './ads.js';

const Q = new URLSearchParams(location.search);
const TEST = Q.get('test') === '1';
// 10-lore 확정값: ?lang= 가 있으면 그것, 없으면 navigator.language 가 ko로 시작하면 한국어, 아니면 영어
const LANG = (() => {
  const q = Q.get('lang');
  if (q === 'en' || q === 'ko') return q;
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'ko';
  return /^ko/i.test(nav) ? 'ko' : 'en';
})();
const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'reverbound.save.v1';

// ---------------------------------------------------------------- 아이콘 (단순 도형 SVG, 글을 못 읽어도 의미 전달)
const svg = (body, cls = 'ico', vb = '0 0 24 24') => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
const ICON = {
  play: svg('<path d="M7 4l13 8-13 8z" fill="currentColor"/>'),
  levels: svg('<rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor"/><rect x="14" y="3" width="7" height="7" rx="2" fill="currentColor"/><rect x="3" y="14" width="7" height="7" rx="2" fill="currentColor"/><rect x="14" y="14" width="7" height="7" rx="2" fill="currentColor"/>'),
  // 30-art 5-6: 둥근 톱니 (assets/icon-settings.svg). 고리 r 5.25 선 3.5 + 둥근 이 6개
  settings: svg('<g fill="currentColor">' + [0, 60, 120, 180, 240, 300].map((a) => `<rect x="10.25" y="1.75" width="3.5" height="4.5" rx="1.2" transform="rotate(${a} 12 12)"/>`).join('') + '</g><circle cx="12" cy="12" r="5.25" fill="none" stroke="currentColor" stroke-width="3.5"/>'),
  // 30-art 5-6: 점프 발판 효과음 = 반원 돔 + 위쪽 호
  padSfx: svg('<path d="M3 20A9 6 0 0 1 21 20Z" fill="currentColor"/><path d="M7 10Q12 6 17 10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>'),
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

// 튜토리얼 카드 그림 (30-art 5-3): viewBox 72, 1타일 = 18 단위, 게임 오브젝트와 같은 색·모양.
// 레벨 4~8 카드(tut_string·tut_tempo·tut_ring·tut_hanging·tut_tempo_slow)는 10-lore 5-6 그림 힌트 + 30-art 부록 B 도형에서 파생한 임시 구성 (DEV_NOTES 9절)
function cueIcon(key, C) {
  const T = 18;
  const OCT = [0.21, 0.03, 0.79, 0.03, 0.97, 0.21, 0.97, 0.79, 0.79, 0.97, 0.21, 0.97, 0.03, 0.79, 0.03, 0.21];
  const oct = (x, y) => `<polygon points="${OCT.map((v, i) => +((i % 2 ? y : x) + v * T).toFixed(2)).join(' ')}" fill="${C.player}" stroke="${C.outline}" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<circle cx="${x + 0.66 * T}" cy="${y + 0.34 * T}" r="${0.13 * T}" fill="${C.playerAccent}"/>`;
  const ground = `<rect x="0" y="60" width="72" height="12" fill="${C.ground}"/><rect x="0" y="60" width="72" height="2" fill="${C.groundEdge}"/><path d="M0 60H72" stroke="${C.outline}" stroke-width="1.5"/>`;
  const arc = (d) => `<path d="${d}" fill="none" stroke="${C.hud}" stroke-width="2" stroke-dasharray="3 3"/>`;
  const spikeUp = (x0, x1, top, base = 60) => `<polygon points="${x0},${base} ${(x0 + x1) / 2},${top} ${x1},${base}" fill="${C.hazard}" stroke="${C.outline}" stroke-width="1.5" stroke-linejoin="miter"/>` +
    `<polygon points="${(x0 + x1) / 2},${top + (base - top) * 0.39} ${x0 + (x1 - x0) * 0.35},${base - 0.5} ${x0 + (x1 - x0) * 0.65},${base - 0.5}" fill="${C.outline}" opacity=".35"/>`;
  const spikeDown = (x0, x1, top, tip) => `<polygon points="${x0},${top} ${x1},${top} ${(x0 + x1) / 2},${tip}" fill="${C.hazard}" stroke="${C.outline}" stroke-width="1.5" stroke-linejoin="miter"/>`;
  const hand = (cx, cy) => `<g fill="${C.hud}" stroke="${C.outline}" stroke-width="1.5"><rect x="${cx - 3.5}" y="${cy - 9}" width="7" height="11" rx="3.5"/><rect x="${cx - 5}" y="${cy - 1}" width="10" height="10" rx="4"/></g>`;
  const tapRing = (x, y) => `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${C.hud}" stroke-width="2"><animate attributeName="r" values="5;10" dur="1s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1s" repeatCount="indefinite"/></circle>`;
  const gate = (x, col, n) => {
    let ch = '';
    for (let j = 0; j < n; j++) { const cx = x + (0.4 + 0.18 * (j - (n - 1) / 2)) * T; ch += `M${cx.toFixed(1)} ${1.26 * T + 6}l${0.2 * T} ${0.24 * T}l${-0.2 * T} ${0.24 * T}`; }
    return `<rect x="${x + 0.18 * T}" y="${6 + 0.06 * T}" width="${0.64 * T}" height="${2.88 * T}" rx="${0.32 * T}" fill="${col}" fill-opacity=".15" stroke="${col}" stroke-width="1.8"/>` +
      `<path d="${ch}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  let b = '';
  switch (key) {
    case 'tut_tap': b = ground + arc('M15 60 Q36 4 57 60') + oct(6, 42) + hand(61, 18) + tapRing(61, 9); break;
    case 'tut_shard': b = ground + spikeUp(33, 47, 43) + arc('M13 60 Q40 0 67 60') + oct(4, 42); break;
    case 'tut_low': b = ground + spikeUp(36, 45, 51) + arc('M13 60 Q40 24 67 60') + oct(4, 42); break;
    case 'tut_crate': b = ground + `<path d="M34 60V42.7Q34 42 34.7 42H52V24.7Q52 24 52.7 24H69.3Q70 24 70 24.7V60Z" fill="${C.ground}" stroke="${C.outline}" stroke-width="1.5"/>` +
      `<rect x="35" y="43" width="16" height="1.6" fill="${C.groundEdge}"/><rect x="53" y="25" width="16" height="1.6" fill="${C.groundEdge}"/><path d="M52 44V59" stroke="${C.outline}" stroke-width=".6" opacity=".25"/>` + arc('M13 60 Q26 0 43 42') + oct(4, 42); break;
    case 'tut_drum': b = ground + `<path d="M16 60A8 5 0 0 1 32 60Z" fill="${C.trigger}" stroke="${C.outline}" stroke-width="1.5"/>` + arc('M24 55 Q46 -30 68 60') + oct(15, 37); break;
    case 'tut_string': b = ground + `<rect x="30" y="36" width="36" height="4.5" rx="0.7" fill="${C.ground}" stroke="${C.outline}" stroke-width="1.5"/><rect x="31" y="37" width="34" height="1" fill="${C.groundEdge}"/>` +
      arc('M9 60 Q18 6 44 36') + oct(36, 18); break;
    case 'tut_tempo': b = ground + gate(4, C.gateFast, 3) + `<path d="M20 47h6M18 52h8M20 57h6" stroke="${C.hud}" stroke-width="2" stroke-linecap="round"/>` + arc('M35 60 Q53 22 71 60') + oct(26, 42); break;
    case 'tut_tempo_slow': b = ground + gate(4, C.gateSlow, 1) + arc('M35 60 Q43 42 51 60') + oct(26, 42); break;
    case 'tut_ring': b = ground + `<circle cx="34" cy="20" r="10.4" fill="none" stroke="${C.trigger}" stroke-width=".6" stroke-dasharray="1.3 1.3" opacity=".7"/><circle cx="34" cy="20" r="6" fill="none" stroke="${C.outline}" stroke-width="3"/><circle cx="34" cy="20" r="6" fill="none" stroke="${C.trigger}" stroke-width="1.8"/>` +
      arc('M6 60 Q16 12 34 20') + arc('M34 20 Q50 -6 68 46') + oct(25, 11) + hand(60, 46) + tapRing(60, 37); break;
    case 'tut_hanging': b = ground + `<rect x="6" y="2" width="40" height="3" fill="${C.ground}" stroke="${C.outline}" stroke-width="1"/>` + spikeDown(18, 32, 5, 22) +
      `<path d="M38 51h12m-4-4 4 4-4 4" fill="none" stroke="${C.hud}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` + oct(16, 42) + hand(61, 24) +
      `<circle cx="61" cy="22" r="9" fill="none" stroke="${C.hud}" stroke-width="2.2"/><path d="M54.6 15.6l12.8 12.8" stroke="${C.hud}" stroke-width="2.2" stroke-linecap="round"/>`; break;
    case 'tut_restart': b = `<g transform="translate(12 12) scale(2)" color="${C.hud}">${ICON.restart.replace(/<\/?svg[^>]*>/g, '')}</g>`; break;
    default: b = ground + oct(27, 42);
  }
  return `<svg viewBox="0 0 72 72" aria-hidden="true">${b}</svg>`;
}

// 레벨 선택 카드 대표 오브젝트 (30-art 5-5). level4~10은 임시 (art.json card_object)
function cardObject(kind, C, tint) {
  const o = C.outline;
  const spike = (x0, x1, top, base) => `<polygon points="${x0},${base} ${(x0 + x1) / 2},${top} ${x1},${base}" fill="${C.hazard}" stroke="${o}" stroke-width="2"/>`;
  const capsule = (col, n) => {
    let ch = '';
    for (let j = 0; j < n; j++) { const cx = 14 + 4 * (j - (n - 1) / 2); ch += `M${cx} 13l4 5-4 5`; }
    return `<svg viewBox="0 0 36 36"><rect x="10" y="1.5" width="16" height="33" rx="8" fill="${col}" fill-opacity=".2" stroke="${col}" stroke-width="2.5"/><path d="${ch}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  };
  switch (kind) {
    case 'spike': return `<svg viewBox="0 0 36 36">${spike(4, 32, 2, 35)}<polygon points="18,16 14,34.5 22,34.5" fill="${o}" opacity=".35"/></svg>`;
    case 'stairs': return `<svg viewBox="0 0 54 36"><path d="M1 35V19Q1 18 2 18H27V2Q27 1 28 1H52Q53 1 53 2V35Z" fill="${C.ground}" stroke="${o}" stroke-width="2"/><rect x="3" y="20" width="23" height="3" fill="${C.groundEdge}"/><rect x="29" y="3" width="22" height="3" fill="${C.groundEdge}"/></svg>`;
    case 'pad': return `<svg viewBox="0 0 36 36"><path d="M18 3v12M12 9l6-6 6 6" fill="none" stroke="${C.trigger}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 35A15 10 0 0 1 33 35Z" fill="${C.trigger}" stroke="${o}" stroke-width="2"/></svg>`;
    case 'platform': return `<svg viewBox="0 0 54 36"><rect x="2" y="8" width="50" height="7" rx="1.5" fill="${C.ground}" stroke="${o}" stroke-width="2"/><rect x="4" y="10" width="46" height="2" fill="${C.groundEdge}"/>${spike(10, 22, 22, 35)}${spike(32, 44, 22, 35)}</svg>`;
    case 'gate_fast': return capsule(C.gateFast, 3);
    case 'gate_slow': return capsule(C.gateSlow, 1);
    case 'orb': return `<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="none" stroke="${C.trigger}" stroke-width="1.2" stroke-dasharray="2.5 2.5" opacity=".7"/><circle cx="18" cy="18" r="9" fill="none" stroke="${o}" stroke-width="5"/><circle cx="18" cy="18" r="9" fill="none" stroke="${C.trigger}" stroke-width="3"/><circle cx="18" cy="18" r="2.2" fill="${C.trigger}"/></svg>`;
    case 'spike_ceiling': return `<svg viewBox="0 0 36 36"><rect x="2" y="1" width="32" height="4" fill="${C.ground}" stroke="${o}" stroke-width="1.5"/><polygon points="6,5 30,5 18,33" fill="${C.hazard}" stroke="${o}" stroke-width="2"/></svg>`;
    case 'platform_stairs': return `<svg viewBox="0 0 54 36"><rect x="2" y="22" width="24" height="6" rx="1.5" fill="${C.ground}" stroke="${o}" stroke-width="2"/><rect x="28" y="6" width="24" height="6" rx="1.5" fill="${C.ground}" stroke="${o}" stroke-width="2"/><rect x="4" y="24" width="20" height="1.6" fill="${C.groundEdge}"/><rect x="30" y="8" width="20" height="1.6" fill="${C.groundEdge}"/></svg>`;
    case 'sun': return `<svg viewBox="0 0 54 36"><path d="M7 35A20 20 0 0 1 47 35Z" fill="${C.player}" stroke="${o}" stroke-width="2"/><path d="M27 4v6M10 12l4 4M44 12l-4 4" stroke="${tint}" stroke-width="3" stroke-linecap="round"/></svg>`;
    default: return '';
  }
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
let autoPaused = false;
let inputHeld = false;
// 화면 문구 시계 uiT(s): 게임이 진행될 때만 흐름 (rAF 경로·step() 경로 같음). 토스트·카드·시도 표시가 이 시계를 씀 (round-1 S16)
let uiT = 0;
let cueIdx = -1, cuePending = -1, cueUntil = 0, toastUntil = 0, attBigUntil = 0;
let demoPlace = null, hudCache = {};
let menuCam = 0;
let practiceAttempts = 0;
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
    const [bal, art, strings, music, prov] = await Promise.all(['data/balance.json', 'data/art.json', 'data/strings.json', 'data/music.json', 'data/provisional-art.json'].map(fetchJSON));
    // 레벨 4~10 곡: music.json에 없으면 provisional-art.json music에서 파생 (임시값, art 확정 시 music.json에 옮김)
    for (const [th, spec] of Object.entries(prov.music)) if (!th.startsWith('_') && !music.levels[th]) music.levels[th] = deriveTheme(music, spec, prov.slow_default);
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

const colors = (theme = curTheme()) => ({ ...DATA.art.common, ...(DATA.art.palette[theme] ?? DATA.art.palette.level1) });
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
  // 첫 레벨 시작 때 그리기 경로 첫 컴파일로 프레임이 튀지 않게, 로드 화면 뒤에서 기믹이 모두 있는 장면을 한 번씩 그려 둠 (round-1 S15)
  for (const i of LEVELS.map((_, j) => j).filter((j) => j === LEVELS.length - 1 || new Set(LEVELS[j].objects.map((o) => o.type)).size >= 6).slice(0, 3)) {
    R.prepare(COMPILED[i]);
    for (const fx of [0.2, 0.5]) R.draw({ x: 0, y: 0, rot: 0, camX: LEVELS[i].length_tiles * fx, beat: 0, beatS: 0.5, intensity: 3, showPlayer: true });
  }
  R.prepare(COMPILED[0]);
  applyTheme(LEVELS[0].theme_id);
  fillStaticText();
  ads.init();
  window.addEventListener('resize', () => { R.resize(); applyTheme(curTheme()); checkRotate(); if (screen === 'levels') layoutCards(); if (screen === 'settings') settingsScrollHint(); demoPlace = null; });
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
  // 30-art 5-4: 손가락 40 px 이상, hud 불투명, 누름 + 손끝 링
  $('tapStartText').innerHTML = `<svg class="tapFinger" viewBox="0 0 48 58" aria-hidden="true"><circle class="rg" cx="24" cy="9" r="16" fill="none" stroke="currentColor" stroke-width="3"/><g class="f" fill="currentColor" stroke="${DATA.art.common.outline}" stroke-width="2.5"><rect x="17" y="4" width="14" height="30" rx="7"/><rect x="9" y="26" width="30" height="28" rx="11"/></g></svg><span>${t('tap_to_start')}</span>`;
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
  $('lTrig').innerHTML = ICON.padSfx + ' ' + t('settings_trigger_sfx');
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
  if (!inGame) { $('cue').classList.add('hidden'); $('toast').classList.add('hidden'); toastUntil = 0; }
  // 회전 안내는 플레이를 시작하면 닫음 (round-1 S17)
  if (inGame && !$('rotate').classList.contains('hidden')) closeRotate();
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

const levelName = (l, i) => {
  const key = l.name_key ?? `level${i + 1}_name`;
  const s = t(key);
  return s !== key ? s : l.name ?? String(i + 1); // 이름이 비어 있으면 레벨 번호
};
// 레벨 선택 카드 배치: 10장이 스크롤 없이 들어가게 (가로 5×2, 세로 2×5). 너무 작아지면 세로 스크롤 + 아래 화살표
function layoutCards() {
  const scr = $('levels'), wrap = $('cards');
  const cs = getComputedStyle(scr);
  const gapS = parseFloat(cs.rowGap) || 14;
  const W = scr.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const H = scr.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - scr.querySelector('.topRow').offsetHeight - gapS;
  const n = LEVELS.length, land = W > H * 1.1;
  const cols = land ? Math.ceil(n / 2) : 2, rows = Math.ceil(n / cols);
  const gap = W < 700 ? 8 : 14, pad = 8;
  const cw = Math.floor(Math.min(240, (W - (cols - 1) * gap - pad) / cols));
  let ch = Math.floor(Math.min(cw * 1.15, (H - (rows - 1) * gap - pad) / rows));
  const scroll = ch < 96;
  if (scroll) ch = 110;
  wrap.style.setProperty('--cols', cols);
  wrap.style.setProperty('--cw', cw + 'px');
  wrap.style.setProperty('--ch', ch + 'px');
  wrap.style.setProperty('--gap', gap + 'px');
  wrap.classList.toggle('roomy', ch >= 170);
  wrap.classList.toggle('scroll', scroll);
  $('cardsMore').classList.toggle('hidden', !scroll || wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 4);
  // 대표 오브젝트가 이름·태그 글자와 겹치지 않게: 글자 아래 ~ 지면 띠 위 사이에 맞춤 (최소 16 px, DEV_NOTES D13)
  for (const c of wrap.children) {
    const obj = c.querySelector('.obj'), band = c.querySelector('.band');
    obj.style.height = ''; obj.classList.remove('objIn');
    let textB = 0;
    for (const e of c.querySelectorAll('.top, .nm, .tag')) if (e.offsetHeight) textB = Math.max(textB, e.offsetTop + e.offsetHeight);
    const avail = band.offsetTop - 3 - textB - 2;
    // 이름이 길어 16 px도 안 남으면 지면 띠 안 오른쪽에 세움
    if (avail < 16) obj.classList.add('objIn');
    else if (avail < obj.offsetHeight) obj.style.height = Math.floor(avail) + 'px';
  }
}
function renderCards() {
  const wrap = $('cards');
  wrap.innerHTML = '';
  $('modeNormal').classList.toggle('on', !practiceSel);
  $('modePractice').classList.toggle('on', practiceSel);
  const allCleared = LEVELS.every((l) => lv(l.id).cleared);
  LEVELS.forEach((l, i) => {
    const rec = lv(l.id);
    const unlocked = i === 0 || lv(LEVELS[i - 1].id).cleared || TEST;
    const env = DATA.art.palette[l.theme_id] ?? DATA.art.palette.level1;
    const C = { ...DATA.art.common, ...env };
    const tint = DATA.art.cardTint?.[l.theme_id] ?? C.hud;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card' + (unlocked ? '' : ' locked');
    // 30-art 5-5: 바탕 bg, 테두리 cardTint, 아래 지면 띠(ground + groundEdge + outline), 대표 오브젝트 1개
    b.style.background = env.bg;
    b.style.borderColor = tint;
    b.style.setProperty('--ground', env.ground);
    const name = levelName(l, i);
    const stars = '<span class="starRow">' + Array.from({ length: l.difficulty?.stars ?? 1 }, () => `<svg class="ico" viewBox="0 0 24 24"><polygon points="12,3 15,10 22,10 16.5,14.5 18.5,21 12,17 5.5,21 7.5,14.5 2,10 9,10" fill="${C.player}" stroke="${C.outline}" stroke-width="1.5"/></svg>`).join('') + '</span>';
    const best = practiceSel ? t('best_practice', { pct: Math.floor(rec.bestPractice) }) : t('best_normal', { pct: Math.floor(rec.best) });
    b.innerHTML = `<span class="top"><span class="num">${i + 1}</span>${stars}</span><span class="nm">${name}</span><span class="tag">${t(`level${i + 1}_tag`)}</span>` +
      `<span class="band"><span class="obj">${cardObject(DATA.art.card_object?.[l.theme_id], C, tint)}</span><span class="best">${unlocked ? best : ''}</span></span>` +
      (unlocked ? '' : `<span class="lockWrap">${ICON.lock}</span>`) +
      (rec.cleared ? `<span class="badge">${ICON.check}<span class="bt">${t('cleared_badge')}</span></span>` : '');
    b.setAttribute('aria-label', `${i + 1}. ${name}` + (unlocked ? '' : ` (${t('level_locked')})`));
    b.addEventListener('click', () => {
      menuTap();
      if (!unlocked) { b.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 200); toast(ICON.lock.replace('ico lg lockIco', 'ico lg') + `<small>${t('level_locked')}</small>`, 1.2); return; }
      startLevel(i, practiceSel);
    });
    b.addEventListener('pointerenter', () => { if (selLevel === i) return; selLevel = i; R.prepare(COMPILED[i]); applyTheme(l.theme_id); });
    wrap.appendChild(b);
  });
  $('levels').dataset.all = allCleared ? '1' : '0';
  layoutCards();
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
  requestAnimationFrame(settingsScrollHint);
}
// 설정 패널이 넘치면 아래 그림자 + 화살표 (criteria: 스크롤이 필요하면 눈에 보이는 표시)
function settingsScrollHint() {
  const p = $('setPanel');
  const more = p.scrollHeight > p.clientHeight + 2 && p.scrollTop + p.clientHeight < p.scrollHeight - 4;
  p.classList.toggle('more', more);
  $('setMore').classList.toggle('hidden', !more);
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
  const L = COMPILED[i];
  R.prepare(L);
  R.clearFx();
  applyTheme(L.level.theme_id);
  practiceAttempts = 0;
  seed = 1;
  $('hud').classList.remove('fade');
  hudCache = {};
  show('playing');
  G.start(L, i, { practice, attempts: practice ? 0 : lv(L.level.id).attempts, preroll: prerollS() });
  $('cpPlace').parentElement.querySelectorAll('.practiceOnly').forEach((e) => e.classList.toggle('hidden', !practice));
  updateHud(true);
}
function onAttempt(n, fromS) {
  const L = G.L;
  if (!G.practice) { lv(L.level.id).attempts = n; persist(); } else practiceAttempts = n;
  R.clearFx();
  attBigUntil = uiT + 1.5;
  // 튜토리얼: 시작 지점 이전 문구는 건너뜀
  const x0 = L.X[G.k];
  cueIdx = -1; cuePending = -1;
  (L.level.cues || []).forEach((c, j) => { if (c.x < x0 - 0.01) cueIdx = j; });
  $('cue').classList.add('hidden');
  demoPlace = null;
  // 음악: 게임 시간 fromS부터, 오디오 시계 기준
  clock.ctxStart = null;
  if (audio.running()) {
    clock.ctxStart = audio.startRun(L.level, L, L.level.theme_id, fromS, G.preroll);
  }
  // 누른 채 재시작하면 바로 홀드 점프
  if (inputHeld) G.press(G.k);
  updateHud(true);
  updateCue();
}
function onDeath(d) {
  audio.stopRun(true);
  audio.sfx('death');
  R.onDeath(d.x, d.y, DATA.bal.death_fx_s, DATA.bal.restart_delay_s);
  $('cue').classList.add('hidden');
  const pct = Math.min(100, (d.x / G.L.level.length_tiles) * 100);
  const rec = lv(G.L.level.id);
  const key = G.practice ? 'bestPractice' : 'best';
  let newBest = false;
  if (pct > rec[key] + 1e-9) {
    const had = rec[key] > 0;
    rec[key] = pct; persist();
    if (had) { newBest = true; audio.sfx('new_best'); }
  }
  // round-2: 사망 토스트(글) 없음. 첫 사망 1회만 ↻ 그림(+ 짧은 글) 0.6 s, 최고 기록 갱신은 짧게 표시 (오케스트레이터 결정 6, 30-art 6절)
  if (!save.flags.restartTipShown) { save.flags.restartTipShown = true; persist(); toast(cueIconInline('tut_restart') + `<small>${t('tut_restart')}</small>`, 0.6); return; }
  if (newBest) toast(t('new_best'), 0.7);
}
const cueIconInline = (k) => `<span class="toastIco">${cueIcon(k, colors())}</span>`;
function onPhysEvent(ev, g) {
  const L = g.L;
  if (ev & 1) R.onJump(g.prev.x, g.prev.y);
  if (ev & 4) R.onLand(L.X[g.k], g.s.y);
  const ids = g.s.used;
  if (ev & 8) { const o = L.byId.get(ids[ids.length - 1]); if (o) R.onPad(o.src); audio.sfx('trigger'); }
  // 울림 고리: 소리 없음 (30-art 7-3 sfx.trigger 는 점프 발판 전용)
  if (ev & 2) { const o = L.byId.get(ids[ids.length - 1 - (ev & 8 ? 1 : 0)]); if (o) R.onOrb(o.src, L.X[g.k], g.s.y); }
}
function onClear() {
  const L = G.L, rec = lv(L.level.id);
  audio.stopRun(false);
  audio.sfx('clear', { theme: L.level.theme_id });
  if (!G.practice) { rec.cleared = true; rec.best = 100; rec.clearAttempts ??= G.attempts; }
  else rec.bestPractice = 100;
  persist();
  R.onClear(camFor(G.x()));
  // 30-art 5-7: 진행도 100 % 후 HUD 전체 0.2 s 페이드아웃, 일시정지 입력 받지 않음
  updateHud(true);
  $('hud').classList.add('fade');
  $('cue').classList.add('hidden');
  $('toast').classList.add('hidden'); toastUntil = 0;
}
// 클리어 연출(1.2 s, 게임 시간) 뒤 클리어 화면. rAF 경로와 step() 경로가 같은 조건을 씀
function maybeShowClear() {
  if (screen === 'playing' && G.state === 'clear' && G.clearT >= 1.2) showClearScreen();
}
function showClearScreen() {
  if (screen !== 'playing' || G.state !== 'clear') return;
  const i = G.levelIndex;
  $('clearTitle').textContent = t(`clear_title_l${i + 1}`);
  const subs = STR.clear_subtitles || [];
  $('clearSub').textContent = subs.length ? subs[TEST ? 0 : Math.floor(Math.random() * subs.length)][LANG] : '';
  $('clearAtt').textContent = t('clear_attempts', { n: G.attempts });
  const last = i >= LEVELS.length - 1;
  const all = LEVELS.every((l) => lv(l.id).cleared);
  $('cNext').classList.toggle('hidden', last);
  // clear_all: 마지막 레벨 클리어 화면에서 모든 레벨을 깼을 때만 (10-lore 5-5)
  $('clearAll').classList.toggle('hidden', !(last && all));
  $('clearAll').textContent = t('clear_all');
  show('clear');
}
function quitToLevels() { audio.stopRun(true); G.stop(); R.clearFx(); show('levels'); }

function pauseGame(auto = false) {
  if (screen !== 'playing') return;
  if (G.state === 'clear') return;
  G.paused = true;
  autoPaused = auto;
  audio.suspend();
  $('pauseBg').classList.toggle('hidden', !auto);
  // 10-lore 5-3: "연습 모드" + 토글 모양(켜짐/꺼짐 상태 말)
  $('pPractice').innerHTML = ICON.flag + `<span>${t('pause_practice_toggle')}</span><span class="pill${G.practice ? ' on' : ''}"><i></i>${G.practice ? t('settings_on') : t('settings_off')}</span>`;
  $('pPractice').setAttribute('aria-pressed', G.practice ? 'true' : 'false');
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
  click('pauseBtn', () => { if (!$('hud').classList.contains('fade')) pauseGame(); });
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
  $('rotateClose').addEventListener('click', (e) => { e.stopPropagation(); closeRotate(); });
  $('cards').addEventListener('scroll', () => { const w = $('cards'); $('cardsMore').classList.toggle('hidden', !w.classList.contains('scroll') || w.scrollTop + w.clientHeight >= w.scrollHeight - 4); }, { passive: true });
  $('setPanel').addEventListener('scroll', settingsScrollHint, { passive: true });
}
function placeCp() {
  if (G.placeCheckpoint()) { audio.sfx('checkpoint'); toast(cueIconInlineFlag() + t('practice_checkpoint_placed'), 0.7); }
}
function removeCp() {
  if (G.removeCheckpoint()) { audio.sfx('menu'); toast(t('practice_checkpoint_removed'), 0.7); }
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

let rotateTimer = null;
function checkRotate() {
  const portrait = window.innerHeight > window.innerWidth;
  const inGame = ['playing', 'pause', 'countdown', 'clear'].includes(screen);
  const on = portrait && !save.flags.rotateShown && !TEST && !inGame;
  $('rotate').classList.toggle('hidden', !on);
  // 막지 않는 1회 안내: 8 s 뒤 자동으로 닫음, 플레이를 시작해도 닫음 (round-1 S17)
  clearTimeout(rotateTimer);
  if (on) rotateTimer = setTimeout(closeRotate, 8000);
}
function closeRotate() {
  clearTimeout(rotateTimer);
  $('rotate').classList.add('hidden');
  if (!save.flags.rotateShown) { save.flags.rotateShown = true; persist(); }
}

// ---------------------------------------------------------------- HUD·문구 (시간은 uiT 기준)
function toast(html, sec) {
  const el = $('toast');
  el.innerHTML = html;
  el.classList.toggle('hidden', !html);
  toastUntil = html ? uiT + sec : 0;
}
// 화면 문구 시계 진행. 손가락 시연이 카드를 가리는 동안에는 카드 남은 시간을 줄이지 않음
function uiTick(dt) {
  uiT += dt;
  if (cueSuppressed) cueUntil += dt;
  if (toastUntil && uiT > toastUntil) { $('toast').classList.add('hidden'); toastUntil = 0; }
}
function updateHud(force) {
  if (!G.L) return;
  const pct = G.state === 'clear' ? 100 : G.progress();
  const rec = lv(G.L.level.id);
  const c = hudCache;
  const w = pct.toFixed(1);
  if (force || c.w !== w) { $('barFill').style.width = w + '%'; c.w = w; }
  const bst = (G.practice ? rec.bestPractice : rec.best).toFixed(1);
  if (force || c.b !== bst) { $('barBest').style.left = `calc(${bst}% - 1.5px)`; c.b = bst; }
  const p = t('progress', { pct: Math.floor(pct) });
  if (force || c.p !== p) { $('pct').textContent = p; c.p = p; }
  const txt = t('attempt', { n: G.practice ? practiceAttempts : G.attempts });
  if (force || c.a !== txt) { $('att').textContent = txt; c.a = txt; }
  const big = uiT < attBigUntil;
  if (force || c.big !== big) { $('att').classList.toggle('big', big); c.big = big; }
  // 30-art 5-7: 클리어 후 0.2 s 페이드아웃 (게임 시간 기준이라 ?test=1 화면도 같음)
  const op = G.state === 'clear' ? Math.max(0, 1 - G.clearT / 0.2).toFixed(2) : '';
  if (force || c.op !== op) { $('hud').style.opacity = op; c.op = op; }
}
let cueSuppressed = false, cueRect = null;
const hit = (a, b, m = 8) => a && b && a.l < b.r + m && b.l < a.r + m && a.t < b.b + m && b.t < a.b + m;
function updateCue() {
  const L = G.L;
  if (!L || G.state !== 'playing') return;
  const cues = L.level.cues || [];
  const x = G.x();
  let j = cueIdx;
  while (j + 1 < cues.length && cues[j + 1].x <= x) j++;
  const el = $('cue');
  if (j !== cueIdx) {
    cueIdx = j;
    if (!lv(L.level.id).cleared || G.practice) {
      const c = cues[j];
      el.innerHTML = cueIcon(c.key, colors()) + `<span>${t(c.key)}</span>`;
      el.dataset.key = c.key;
      el.classList.remove('hidden');
      const r = el.getBoundingClientRect();
      cueRect = { l: r.left, r: r.right, t: r.top, b: r.bottom };
      cueUntil = uiT + 3;
    }
  }
  if (uiT > cueUntil) { el.classList.add('hidden'); cueSuppressed = false; return; }
  // 30-art 5-1·5-2: 손가락 시연(alpha > 0)이 보이는 동안 tut_tap 외 카드와 시연과 겹치는 카드는 숨김 → 시연이 사라진 뒤 띄움
  cueSuppressed = demoAlpha > 0 && (el.dataset.key !== 'tut_tap' || hit(demoRect, cueRect));
  el.classList.toggle('hidden', cueSuppressed);
}

// 손가락 시연 (30-art 5-2): 레벨 1을 아직 못 깼으면 첫 구간 탭 시점에 플레이어 오른쪽 위에서 손가락이 누름
let demoAlpha = 0, demoRect = null;
function demoTaps() {
  const src = (DATA.testInputs || DATA_demo)?.levels?.[G.L.level.id];
  if (!src || G.levelIndex !== 0 || lv(G.L.level.id).cleared) return null;
  return src.on_beat_taps;
}
function hudBottom() {
  let b = 0;
  for (const id of ['att', 'barWrap', 'pauseBtn']) { const r = $(id).getBoundingClientRect(); if (r.height) b = Math.max(b, r.bottom); }
  return b;
}
function drawDemo(view) {
  demoAlpha = 0; demoRect = null;
  const taps = G.L && G.state === 'playing' ? demoTaps() : null;
  if (!taps) { demoPlace = null; return; }
  const hz = DATA.bal.physics_hz, now = G.time;
  const limitS = (LEVELS[0].sections.find((s) => s.name === 'learn_low')?.start_beat ?? 24) * 60 / LEVELS[0].bpm;
  let next = null;
  for (const k of taps) { const ts = k / hz; if (ts > limitS) break; if (ts > now - 0.25) { next = ts; break; } }
  if (next == null) { demoPlace = null; return; }
  const dtTo = next - now;
  if (dtTo > 0.9) { demoPlace = null; return; }
  const T = R.T, h = Math.max(28, 1.2 * T), s = h / 42, w = 26 * s, ringR = 0.4 * T;
  const boxAt = (cx, cy) => ({ l: cx - w / 2, r: cx + w / 2, t: cy - h / 2 - ringR, b: cy + h / 2 });
  // 위치는 보이기 시작할 때 한 번 정함 (플레이어 점프를 따라 움직이지 않음)
  if (!demoPlace || demoPlace.tap !== next) {
    const pcx = (view.x - view.camX + 0.5) * T;
    const ptop = R.groundPx - (view.y + 1) * T;
    let cx = pcx + 1.5 * T, cy = ptop - 1.5 * T;
    const player = { l: pcx - T / 2, r: pcx + T / 2, t: ptop, b: ptop + T };
    const hz2 = G.L.hazards.filter((o) => o.x1 > view.camX && o.x0 < view.camX + R.W / T).map((o) => ({ l: (o.x0 - view.camX) * T, r: (o.x1 - view.camX) * T, t: R.groundPx - o.y1 * T, b: R.groundPx - o.y0 * T }));
    for (let i = 0; i < 4 && (hit(boxAt(cx, cy), player, 0) || hz2.some((z) => hit(boxAt(cx, cy), z, 0))); i++) cy -= 0.5 * T;
    const hb = hudBottom();
    for (let i = 0; i < 6 && boxAt(cx, cy).t < hb + 8; i++) { cx += 0.5 * T; if (boxAt(cx, cy).t < hb + 8 && i >= 1) cy = Math.max(cy, hb + 8 + h / 2 + ringR); }
    demoPlace = { tap: next, cx, cy };
  }
  const alpha = dtTo > 0.6 ? (0.9 - dtTo) / 0.3 : dtTo < -0.1 ? Math.max(0, 1 + (dtTo + 0.1) / 0.15) : 1;
  if (alpha <= 0) return;
  const press = Math.abs(dtTo) < 0.12;
  const { cx, cy } = demoPlace;
  demoAlpha = alpha; demoRect = boxAt(cx, cy);
  const ctx = R.ctx, C = DATA.art.common;
  ctx.save();
  ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
  ctx.globalAlpha = alpha;
  const dy = press ? 0.17 * T : 0;
  ctx.translate(cx, cy - 7 * s + dy);
  ctx.scale(s, s);
  ctx.fillStyle = C.hud; ctx.strokeStyle = C.outline; ctx.lineWidth = 2.5 / s;
  const rr = (x, y, w2, h2, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w2, h2, r); else ctx.rect(x, y, w2, h2); ctx.fill(); ctx.stroke(); };
  rr(-6, -14, 12, 26, 6); rr(-13, 6, 26, 22, 9);
  ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
  if (press) { ctx.strokeStyle = C.hud; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy - 21 * s + dy, ringR, 0, Math.PI * 2); ctx.stroke(); }
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
let hookRT = false; // 테스트 훅 play(): ?test=1에서도 rAF 실시간으로 진행 (성능 측정용)
function frame(now) {
  requestAnimationFrame(frame);
  const dt = lastFrame ? Math.min(0.25, (now - lastFrame) / 1000) : 1 / 60;
  lastFrame = now;
  if (!TEST || hookRT) {
    if (screen === 'playing') {
      G.advance(dt, now);
      syncClock();
    }
    if (screen !== 'pause' && screen !== 'countdown') uiTick(dt);
    R.update(dt);
    maybeShowClear();
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
  get levelCount() { return LEVELS.length; },
  levelData: (i) => LEVELS[i],
  get lang() { return LANG; },
  get progress() { return G ? G.progress() : 0; },
  get attempts() { return G ? (G.practice ? practiceAttempts : G.attempts) : 0; },
  get tick() { return G ? G.k : 0; },
  get player() { return G && G.s ? { x: G.x(), y: G.s.y, vy: G.s.vy, grounded: G.s.g } : null; },
  get practice() { return G ? G.practice : false; },
  get ready() { return !!G; },
  get audio() { return audio?.ctx ? audio.ctx.state : 'off'; },
  loadLevel(i, opts = {}) { hookRT = false; startLevel(i, !!opts.practice); return hook.state; },
  // 입력열을 넣고 x 지점까지 step()으로 진행 (스크린샷용)
  seek(i, x, { taps } = {}) {
    hookRT = false;
    taps ??= DATA.testInputs?.levels?.[LEVELS[i].id]?.taps ?? [];
    startLevel(i, false);
    for (const k of taps) { G.press(k); G.release(k + 1); }
    let guard = 0;
    while (G.state === 'playing' && G.x() < x && guard++ < 400000) hook.step(1 / DATA.bal.physics_hz);
    return hook.state;
  },
  // 입력열을 넣고 rAF 실시간(프레임 dt)으로 진행. 성능 측정용. 끝나면 state가 clear
  play(i, { taps, holdTicks = 1 } = {}) {
    taps ??= DATA.testInputs?.levels?.[LEVELS[i].id]?.taps ?? [];
    startLevel(i, false);
    for (const k of taps) { G.press(k); G.release(k + holdTicks); }
    G.lastPerf = performance.now();
    hookRT = true;
    return hook.state;
  },
  step(dt = 1 / 60) {
    const n = Math.max(1, Math.round(dt * DATA.bal.physics_hz));
    for (let j = 0; j < n; j++) {
      G.advance(1 / DATA.bal.physics_hz, performance.now()); R.update(1 / DATA.bal.physics_hz);
      if (screen === 'playing') uiTick(1 / DATA.bal.physics_hz);
    }
    // 일반 모드와 같은 화면: HUD·튜토리얼 카드·토스트를 같은 시계로 갱신 (round-1 S16)
    if (screen === 'playing') { updateHud(false); updateCue(); }
    maybeShowClear();
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
    hookRT = false;
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
