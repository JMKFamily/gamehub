// Reverbound 웹 빌드 진입점: 데이터 로드, 화면(UI), 입력, 저장, 오디오 시계 동기화, 테스트 훅.
import { compileLevel } from './physics.js';
import { createGame } from './game.js';
import { createRenderer } from './render.js';
import { createAudio, expandThemes } from './audio.js';
import { createComboJudge, updateBest } from './combo.js';
import { ads } from './ads.js';
import { safePoints } from './practice.js';
import { createComboFx } from './combofx.js';

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
// 움직임 줄이기 설정 (30-art 5-8-1·5-8-2): 튐·모임·뜨기 없이 바로 바뀜
const REDUCED = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();

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
// 레벨 4~8 카드(tut_string·tut_tempo·tut_ring·tut_hanging·tut_tempo_slow)도 30-art 5-3 표 좌표 그대로 (round-2 art 확정)
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
  // 문 캡슐 x 31~43, y 6~58, rx 6, 테 2, 면 alpha 0.12, 꺾쇠 N개 (가운데 y 32, 폭 0.2·높이 0.48타일, 간격 0.18타일)
  const gate = (col, n) => {
    let ch = '';
    for (let j = 0; j < n; j++) { const cx = 37 + 0.18 * T * (j - (n - 1) / 2) - 0.1 * T; ch += `M${cx.toFixed(2)} ${(32 - 0.24 * T).toFixed(2)}l${0.2 * T} ${0.24 * T}l${-0.2 * T} ${0.24 * T}`; }
    return `<rect x="31" y="6" width="12" height="52" rx="6" fill="${col}" fill-opacity=".12" stroke="${col}" stroke-width="2"/>` +
      `<path d="${ch}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  let b = '';
  switch (key) {
    case 'tut_tap': b = ground + arc('M15 60 Q36 4 57 60') + oct(6, 42) + hand(61, 18) + tapRing(61, 9); break;
    case 'tut_shard': b = ground + spikeUp(33, 47, 43) + arc('M13 60 Q40 0 67 60') + oct(4, 42); break;
    case 'tut_low': b = ground + spikeUp(36, 45, 51) + arc('M13 60 Q40 24 67 60') + oct(4, 42); break;
    case 'tut_crate': b = ground + `<path d="M34 60V42.7Q34 42 34.7 42H52V24.7Q52 24 52.7 24H69.3Q70 24 70 24.7V60Z" fill="${C.ground}" stroke="${C.outline}" stroke-width="1.5"/>` +
      `<rect x="35" y="43" width="16" height="1.6" fill="${C.groundEdge}"/><rect x="53" y="25" width="16" height="1.6" fill="${C.groundEdge}"/><path d="M52 44V59" stroke="${C.outline}" stroke-width=".6" opacity=".25"/>` + arc('M13 60 Q26 0 43 42') + oct(4, 42); break;
    case 'tut_drum': b = ground + `<path d="M16 60A8 5 0 0 1 32 60Z" fill="${C.trigger}" stroke="${C.outline}" stroke-width="1.5"/>` + arc('M24 55 Q46 -30 68 60') + oct(15, 37); break;
    case 'tut_string': b = ground + spikeUp(36, 48, 43) + spikeUp(52, 64, 43) +
      `<rect x="32" y="24" width="36" height="4" rx="0.7" fill="${C.ground}" stroke="${C.outline}" stroke-width="1.5"/><rect x="33" y="25" width="34" height="1" fill="${C.groundEdge}"/>` +
      arc('M13 60 Q24 0 44 24') + oct(4, 42); break;
    case 'tut_tempo': b = ground + gate(C.gateFast, 3) + `<path d="M50 32H68M50 40H68M50 48H68" stroke="${C.gateFast}" stroke-width="2" stroke-linecap="round"/>` + arc('M46 60 Q58 26 71 60') + oct(4, 42); break;
    case 'tut_tempo_slow': b = ground + gate(C.gateSlow, 1) + arc('M46 60 Q54 40 62 60') + oct(4, 42); break;
    case 'tut_ring': b = ground + spikeUp(33, 47, 43) + `<circle cx="40" cy="22" r="10" fill="none" stroke="${C.trigger}" stroke-width=".8" stroke-dasharray="1.4 1.4" opacity=".8"/><circle cx="40" cy="22" r="6" fill="none" stroke="${C.outline}" stroke-width="5"/><circle cx="40" cy="22" r="6" fill="none" stroke="${C.trigger}" stroke-width="3"/>` +
      arc('M13 60 Q22 10 36 26') + arc('M40 22 Q54 0 67 60') + oct(4, 42) + hand(62, 12) + tapRing(62, 4); break;
    case 'tut_hanging': b = ground + `<rect x="26" y="3" width="36" height="3" fill="${C.ground}" stroke="${C.outline}" stroke-width="1.5"/>` + spikeDown(28, 42, 6, 23) + spikeDown(46, 60, 6, 23) +
      `<path d="M14 54H68" fill="none" stroke="${C.hud}" stroke-width="2" stroke-dasharray="3 3"/><path d="M64 50l4 4-4 4" fill="none" stroke="${C.hud}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` + oct(30, 42) + hand(62, 12) +
      `<circle cx="62" cy="12" r="8" fill="none" stroke="${C.hud}" stroke-width="2"/><path d="M56.3 6.3l11.4 11.4" stroke="${C.hud}" stroke-width="2" stroke-linecap="round"/>`; break;
    case 'tut_restart': b = `<g transform="translate(12 12) scale(2)" color="${C.hud}">${ICON.restart.replace(/<\/?svg[^>]*>/g, '')}</g>`; break;
    default: b = ground + oct(27, 42);
  }
  return `<svg viewBox="0 0 72 72" aria-hidden="true">${b}</svg>`;
}

// 레벨 선택 카드 대표 오브젝트 (30-art 5-5 표 → art.json card_object)
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
    case 'sun': { // 30-art 5-5 round-3 (assets/card-sun.svg): 떠 있는 꽉 찬 원 + 둥근 끝 빛살 5개, 면 = level10 cardTint, player 노랑 없음
      const L5 = [[50, 12, 50, 4], [26, 22, 20, 16], [74, 22, 80, 16], [16, 46, 7, 46], [84, 46, 93, 46]];
      const ln = (set, w, c) => `<g stroke="${c}" stroke-width="${w}">${set.map(([a, b, x, y]) => `<line x1="${a}" y1="${b}" x2="${x}" y2="${y}"/>`).join('')}</g>`;
      const L3 = [L5[0], L5[3], L5[4]]; // 오브젝트 높이 < 28 px: 위·왼·오른 3개, 굵기 9 (layoutCards가 .sm)
      return `<svg viewBox="0 0 100 100"><g class="r5" stroke-linecap="round">${ln(L5, 13, o)}${ln(L5, 7, tint)}</g><g class="r3" stroke-linecap="round">${ln(L3, 15, o)}${ln(L3, 9, tint)}</g><circle cx="50" cy="46" r="26" fill="${tint}" stroke="${o}" stroke-width="4"/></svg>`;
    }
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
// 콤보 기록 (20-balance 15-5·15-10): bestCombo = 일반 모드 시도 중 가장 긴 콤보, bestAccuracy = 일반 모드 클리어 중 최고 정확도(정수, 없으면 null)

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
    const [bal, art, strings, music] = await Promise.all(['data/balance.json', 'data/art.json', 'data/strings.json', 'data/music.json'].map(fetchJSON));
    // 레벨 4~10 곡: music.json levels의 {base, transpose} (30-art 7-2 확정)를 펼침. 연습 모드 안전 지점 설정은 balance.json practice (20-balance 15-6)
    expandThemes(music);
    const practiceCfg = bal.practice;
    STR = strings;
    $('loadingText').textContent = t('loading');
    LEVELS = await Promise.all(bal.levels.map((f) => fetchJSON('data/' + f)));
    let testInputs = null;
    if (TEST) { try { testInputs = await fetchJSON('data/test-inputs.json'); } catch {} }
    else { try { DATA_demo = await fetchJSON('data/test-inputs.json'); } catch {} }
    DATA = { bal, art, strings, music, testInputs, practiceCfg };
    COMPILED = LEVELS.map((l) => compileLevel(l, bal));
    setup();
  } catch (err) {
    console.warn('load failed', err);
    // 부트 문구는 index.html 인라인(10-lore 값, sync-data가 넣음)이 언어를 정해 둠. 영어 고정 문구 없음
    $('loadingText').textContent = STR.strings ? t('load_error') : (window.__boot?.s?.load_error ?? '…');
    $('retryLoad').classList.remove('hidden');
  }
}
let DATA_demo = null;
$('retryLoad').addEventListener('click', () => location.reload());

const colors = (theme = curTheme()) => ({ ...DATA.art.common, ...(DATA.art.palette[theme] ?? DATA.art.palette.level1) });
let themeApplied = '';
function applyTheme(theme, force = false) {
  // (D35) 같은 테마·같은 타일 크기면 CSS 변수 40여 개를 다시 쓰지 않음 (레벨 시작·재시작 프레임의 문서 전체 스타일 재계산 제거)
  const key = theme + '|' + (R ? R.T : 36);
  if (!force && key === themeApplied) return;
  themeApplied = key;
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
  // (round-3 첫 탭 ≤ 100 ms) AudioContext는 로드 화면 뒤에서 만들어 둠(멈춘 상태, 소리 없음). 첫 탭은 resume()만 함.
  // 6배 스로틀 실측: 첫 탭 안에서 만들면 생성자만 약 160~200 ms, 미리 만들면 첫 탭 안 작업 약 30 ms (DEV_NOTES D27)
  if (!TEST) audio.init();
  applySettings();
  G = createGame(bal, {
    onAttempt(n, fromS) { onAttempt(n, fromS); },
    onBeforeRestart() { G.preroll = prerollS(); },
    onDeath(d) { onDeath(d); },
    onEvent(ev, g) { onPhysEvent(ev, g); },
    onTick(k, ev, pressId) { onJudgeTick(k, ev, pressId); },
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
  // (D35) 음악 예약 경로를 소리 없이 한 번 돌려 둠 (시도 첫 예약 비용을 로드 때)
  audio.warm?.(LEVELS[0], COMPILED[0], LEVELS[0].theme_id);
  // (round-3) 콤보 연출 아틀라스: 로드 화면 뒤에서 레벨 1 테마로 미리 만들고 한 번 그려 둠 (30-art 5-8-4)
  FX = createComboFx(R, art, bal, { t, reduced: REDUCED, rand });
  measureHud();
  FX.build(LEVELS[0].theme_id);
  // (D35) 판정 글 경로(자리 계산·아틀라스 그리기)를 로드 때 한 번 돌려 둠: 첫 판정 프레임의 처음 도는 코드 비용. 바로 아래 R.draw의 bg가 덮고, 통계·상태는 되돌림 (난수 안 씀)
  { const info = { playerL: R.W * 0.4, playerTop: R.H * 0.5, orb: null, hudBottom: 0, blocked: () => false };
    for (const gr of [1, 2, 3]) { FX.onJudge(gr, 87, 0, info); FX.drawJudge(R.ctx, 0.1); }
    for (const k of Object.keys(FX.stats)) Object.assign(FX.stats[k], { n: 0, skip: 0, hidePct: 0 });
    FX.reset(); }
  R.draw({ x: 0, y: 0, rot: 0, camX: 0, beat: 0, beatS: 0.5, intensity: 1, showPlayer: false, warm: FX.warm });
  fillStaticText();
  // 레벨 선택 화면을 로드 때 한 번 만들어 둠 (메뉴 전환 ≤ 100 ms, 결정 22)
  prebuildCards();
  prebuildCueRects();
  ads.init();
  window.addEventListener('resize', () => { R.resize(); applyTheme(curTheme()); checkRotate(); cardsLayoutKey = ''; if (screen === 'levels') layoutCards(); if (screen === 'settings') settingsScrollHint(); demoPlace = null; measureHud(); if (G.L) FX.build(G.L.level.theme_id); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) onHidden(); });
  window.addEventListener('blur', () => { if (!TEST && screen === 'playing' && G.state === 'playing') pauseGame(true); });
  bindInput();
  requestAnimationFrame(frame);
  // (D35) 메뉴·HUD·튜토리얼 카드를 불러오기 화면 뒤에서 몇 프레임 실제로 그려 둠 → 첫 전환의 글자 모양 잡기·셰이더 준비 비용을 로드 때 냄
  warmScreens(() => { show('title'); checkRotate(); warmDone = true; });
}
let warmDone = false;
// 불투명도 1 %로 4프레임 이상(최소 0.25 s) 그림. 불러오기 화면이 보이는 동안이고 입력은 받지 않음(screen = loading, pointer-events 없음)
function warmScreens(done) {
  const ids = ['title', 'levels', 'settings', 'hud', 'cue'];
  const menu = $('menu'), menuHid = menu.classList.contains('hidden');
  menu.classList.remove('hidden');
  renderSettings();
  const k0 = LEVELS[0].cues?.[0]?.key;
  if (k0) $('cue').innerHTML = cueIcon(k0, colors(LEVELS[0].theme_id)) + `<span>${t(k0)}</span>`;
  $('att').textContent = t('attempt', { n: 1 }); $('pct').textContent = t('progress', { pct: 0 });
  for (const id of ids) $(id).classList.add('warmup');
  const t0 = performance.now();
  let n = 0;
  const step = () => {
    if (++n < 4 || performance.now() - t0 < 250) { requestAnimationFrame(step); return; }
    for (const id of ids) $(id).classList.remove('warmup');
    if (menuHid) menu.classList.add('hidden');
    $('cue').innerHTML = '';
    done();
  };
  requestAnimationFrame(step);
}
const curTheme = () => (G && G.L ? G.L.level.theme_id : LEVELS[selLevel]?.theme_id ?? 'level1');

function fillStaticText() {
  document.documentElement.lang = LANG;
  $('titleMain').textContent = t('title');
  $('titleAlt').textContent = LANG === 'ko' ? STR.strings.title.en : STR.strings.title.ko;
  $('titleAlt').setAttribute('lang', LANG === 'ko' ? 'en' : 'ko'); // 10-lore 5-7: 다른 언어 이름에 lang
  // 대체 글 (10-lore 5-7 aria_* 키, 하드코딩 0곳)
  $('cv').setAttribute('aria-label', t('aria_game'));
  $('pauseBtn').setAttribute('aria-label', t('aria_pause'));
  for (const b of document.querySelectorAll('[data-back]')) b.setAttribute('aria-label', t('aria_back'));
  $('hubLink').setAttribute('aria-label', t('aria_hub'));
  $('rotateClose').setAttribute('aria-label', t('aria_close'));
  $('retryLoad').setAttribute('aria-label', t('aria_retry_load'));
  $('bMute').setAttribute('aria-label', t('aria_music'));
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
  $('rotateText').textContent = t('rotate_hint');
  $('combo').setAttribute('aria-label', t('combo_aria'));
  $('stAcc').setAttribute('aria-label', t('result_accuracy_aria'));
  $('stCombo').setAttribute('aria-label', t('result_best_combo_aria'));
  for (const e of document.querySelectorAll('#clearStats .nbt')) e.textContent = t('result_new_best_aria');
  $('stCombo').querySelector('.lb').textContent = t('combo_label');
}

// ---------------------------------------------------------------- 화면 전환
const SCREENS = ['loading', 'title', 'levels', 'settings', 'pause', 'countdown', 'clearS', 'confirm'];
function show(name) {
  screen = name;
  const domId = { clear: 'clearS' }[name] ?? name;
  for (const s of SCREENS) $(s).classList.toggle('show', s === domId);
  const inGame = ['playing', 'pause', 'countdown', 'clear'].includes(name);
  $('hud').classList.toggle('hidden', !inGame || name === 'clear');
  if (!inGame) { $('comboLive').textContent = ''; $('cue').classList.add('hidden'); $('toast').classList.add('hidden'); toastUntil = 0; }
  // 회전 안내는 플레이를 시작하면 닫음 (round-1 S17)
  if (inGame && !$('rotate').classList.contains('hidden')) closeRotate();
  // 배너는 메뉴에서만 (플레이 중 금지), 웹은 더미
  if (inGame) ads.hideBanner(); else if (name !== 'loading') ads.showBanner('menu');
  if (name === 'levels') renderCards();
  if (name === 'settings') renderSettings();
  if (name === 'title') {
    // 첫 탭(사용자 몸짓)을 받은 뒤에만 메뉴를 보임. 로드 때 만든 AudioContext가 브라우저 설정으로 이미 켜져 있어도 "눌러서 시작"은 그대로 (round-2와 같은 흐름).
    // resume이 아직 안 끝났어도 메뉴는 보임 (소리는 resume이 끝나면 남)
    const unlocked = TEST || tappedOnce;
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
// (round-3 성능) 같은 화면 크기·같은 카드 내용이면 다시 재지 않음. 읽기를 모은 뒤 쓰기를 모아 강제 레이아웃 1번
let cardsLayoutKey = '';
function layoutCards() {
  const scr = $('levels'), wrap = $('cards');
  const key = `${innerWidth}x${innerHeight}|${cardsStateKey}`;
  if (key === cardsLayoutKey) return;
  cardsLayoutKey = key;
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
  const cs2 = [...wrap.children];
  for (const c of cs2) { const obj = c.querySelector('.obj'); obj.style.height = ''; obj.classList.remove('objIn', 'sm'); }
  const plan = cs2.map((c) => {
    const obj = c.querySelector('.obj'), band = c.querySelector('.band');
    let textB = 0;
    for (const e of c.querySelectorAll('.top, .nm, .tag')) if (e.offsetHeight) textB = Math.max(textB, e.offsetTop + e.offsetHeight);
    return { obj, avail: band.offsetTop - 3 - textB - 2, h: obj.offsetHeight };
  });
  for (const { obj, avail, h } of plan) {
    // 이름이 길어 16 px도 안 남으면 지면 띠 안 오른쪽에 세움
    let hh = h;
    if (avail < 16) { obj.classList.add('objIn'); hh = 0; }
    else if (avail < h) { obj.style.height = Math.floor(avail) + 'px'; hh = avail; }
    if (hh && hh < 28) obj.classList.add('sm'); // 30-art 5-5: 해 빛살 3개
  }
}
// 단계 막대 표지 SVG (30-art 5-8-1·5-8-7·5-8-8): 세로 막대 4개, 닿은 단계만 불투명. 원·고리가 아님
const STAGES = () => DATA.bal.combo.mark_at;
const stageOf = (n) => STAGES().filter((m) => n >= m).length;
function barsSvg(stage, h, cls = 'bars') {
  const Hn = h / 0.6, bw = 0.14 * Hn, bg = 0.08 * Hn, W = 4 * bw + 3 * bg;
  let r = '';
  for (let i = 0; i < 4; i++) { const hh = h * (i + 1) / 4; r += `<rect x="${(i * (bw + bg)).toFixed(2)}" y="${(h - hh).toFixed(2)}" width="${bw.toFixed(2)}" height="${hh.toFixed(2)}" rx="${(0.03 * Hn).toFixed(2)}"${i < stage ? '' : ' fill-opacity=".35"'}/>`; }
  return `<svg class="${cls}" viewBox="0 0 ${W.toFixed(2)} ${h}" width="${W.toFixed(1)}" height="${h}" aria-hidden="true" fill="currentColor">${r}</svg>`;
}
let cardsStateKey = '', cardsBuiltKey = '';
function prebuildCards() {
  // 로드 화면 뒤에서 한 번: 숨긴 채로 만들고 재 두기 (첫 레벨 선택 진입 비용을 로드 때 냄)
  const s = $('levels');
  s.style.visibility = 'hidden'; s.classList.add('show');
  renderCards();
  s.classList.remove('show'); s.style.visibility = '';
}
function renderCards() {
  const wrap = $('cards');
  $('modeNormal').classList.toggle('on', !practiceSel);
  $('modePractice').classList.toggle('on', practiceSel);
  // 내용이 같으면 DOM을 다시 만들지 않음 (메뉴 전환 성능)
  cardsStateKey = (practiceSel ? 'p' : 'n') + LEVELS.map((l, i) => { const r = lv(l.id); return [r.cleared ? 1 : 0, Math.floor(r.best), Math.floor(r.bestPractice), r.bestCombo ?? 0, i === 0 || lv(LEVELS[i - 1].id).cleared || TEST ? 1 : 0].join(','); }).join(';');
  if (cardsStateKey === cardsBuiltKey && wrap.childElementCount) { layoutCards(); return; }
  cardsBuiltKey = cardsStateKey;
  wrap.innerHTML = '';
  const allCleared = LEVELS.every((l) => lv(l.id).cleared);
  LEVELS.forEach((l, i) => {
    const rec = lv(l.id);
    const unlocked = i === 0 || lv(LEVELS[i - 1].id).cleared || TEST;
    const env = DATA.art.palette[l.theme_id] ?? DATA.art.palette.level1;
    const C = { ...DATA.art.common, ...env };
    const tint = DATA.art.cardTint?.[l.theme_id] ?? C.hud;
    const cell = document.createElement('div');
    cell.className = 'cell';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card' + (unlocked ? '' : ' locked');
    // 30-art 5-5: 바탕 bg, 테두리 cardTint, 아래 지면 띠(ground + groundEdge + outline), 대표 오브젝트 1개
    b.style.background = env.bg;
    b.style.borderColor = tint;
    b.style.setProperty('--ground', env.ground);
    const name = levelName(l, i);
    // 별: SVG 하나에 N개 (round-3 메뉴 래스터 비용, 카드당 SVG 1장)
    const nS = l.difficulty?.stars ?? 1;
    const stars = `<span class="starRow" style="--n:${nS}"><svg class="ico" viewBox="0 0 ${25 * nS - 1} 24" aria-hidden="true">${Array.from({ length: nS }, (_, k) => `<polygon transform="translate(${25 * k} 0)" points="12,3 15,10 22,10 16.5,14.5 18.5,21 12,17 5.5,21 7.5,14.5 2,10 9,10"/>`).join('')}</svg></span>`.replace('<svg class="ico"', `<svg class="ico" fill="${C.player}" stroke="${C.outline}" stroke-width="1.5"`);
    const best = practiceSel ? t('best_practice', { pct: Math.floor(rec.bestPractice) }) : t('best_normal', { pct: Math.floor(rec.best) });
    b.innerHTML = `<span class="top"><span class="num">${i + 1}</span>${stars}</span><span class="nm">${name}</span><span class="tag">${t(`level${i + 1}_tag`)}</span>` +
      `<span class="band">${unlocked ? `<span class="prog" style="width:${Math.floor(practiceSel ? rec.bestPractice : rec.best)}%" aria-hidden="true"></span>` : ''}<span class="obj">${cardObject(DATA.art.card_object?.[l.theme_id], C, tint)}</span><span class="best">${unlocked ? best : ''}</span></span>` +
      (unlocked ? '' : `<span class="lockWrap">${ICON.lock}</span>`) +
      (rec.cleared ? `<span class="badge">${ICON.check}<span class="bt">${t('cleared_badge')}</span></span>` : '');
    b.setAttribute('aria-label', `${i + 1}. ${name}` + (unlocked ? '' : ` (${t('level_locked')})`));
    b.addEventListener('click', () => {
      menuTap();
      if (!unlocked) { b.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 200); toast(ICON.lock.replace('ico lg lockIco', 'ico lg') + `<small>${t('level_locked')}</small>`, 1.2); return; }
      startLevel(i, practiceSel);
    });
    b.addEventListener('pointerenter', () => { if (selLevel === i) return; selLevel = i; R.prepare(COMPILED[i]); applyTheme(l.theme_id); });
    cell.appendChild(b);
    // 최고 콤보 칩 (30-art 5-8-8, 10-lore combo_best_aria): 둥근 사각 18 px + 단계 막대 10 px + 숫자 14 px. 원이 아님.
    // 버튼 aria-label에 묻히지 않게 버튼 밖 형제 요소. 일반 모드 기록 2 이상일 때만
    const bc = rec.bestCombo ?? 0;
    if (DATA.bal.combo.enabled && unlocked && !practiceSel && bc >= DATA.bal.combo.show_from) {
      const m = document.createElement('span');
      m.className = 'bcMark';
      m.style.setProperty('--chipBg', env.bg + 'CC');
      m.id = 'bc' + i;
      m.setAttribute('role', 'meter');
      m.setAttribute('aria-label', `${i + 1}. ${t('combo_best_aria')}`);
      m.setAttribute('aria-valuemin', '0');
      m.setAttribute('aria-valuemax', String(l.judge_taps?.length ?? bc));
      m.setAttribute('aria-valuenow', String(bc));
      m.setAttribute('aria-valuetext', String(bc));
      m.innerHTML = barsSvg(stageOf(bc), 10) + `<b aria-hidden="true">${bc}</b>`;
      cell.appendChild(m);
    }
    wrap.appendChild(cell);
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
  // 10-lore 5-7: 이름 = aria_music(대상만), 상태 = aria-pressed (켜짐 = 소리 남)
  $('bMute').setAttribute('aria-label', t('aria_music'));
  $('bMute').setAttribute('aria-pressed', s.muted ? 'false' : 'true');
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
// 연습 모드 안전 지점 (practice.js): 레벨마다 처음 연습할 때 한 번 계산
const SAFE = [];
function safeFor(i) {
  if (SAFE[i]) return SAFE[i];
  const src = (DATA.testInputs || DATA_demo)?.levels?.[LEVELS[i].id];
  const cfg = DATA.practiceCfg;
  SAFE[i] = safePoints(COMPILED[i], (cfg.traces || ['taps']).map((k) => src?.[k]).filter(Boolean), cfg);
  return SAFE[i];
}
let pendingStart = null;
let tappedOnce = false;
function startLevel(i, practice) {
  // 오디오 잠금 해제 직후면 자동 지연(outputLatency)이 안정될 때까지 첫 시도를 미룸 (최대 1 s, frame()에서 이어서 시작)
  if (!TEST && audio.running() && !audio.latencyStable(performance.now() / 1000)) { pendingStart = [i, practice]; return; }
  pendingStart = null;
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
  J = createComboJudge(L.level.judge_taps ?? [], DATA.bal.combo, DATA.bal.physics_hz);
  $('combo').setAttribute('aria-valuemax', String(L.level.judge_taps?.length ?? 0));
  // 콤보 연출 아틀라스: 첫 프레임 전에 (같은 크기·테마면 다시 만들지 않음). 첫 프레임에서 bg 아래에 한 번 그림
  FX.build(L.level.theme_id); // HUD 아래 끝(R.hudBottom)은 로드·화면 크기 바뀜 때만 잼 (레벨 시작 프레임에 강제 레이아웃 없음)
  G.start(L, i, { practice, attempts: practice ? 0 : lv(L.level.id).attempts, preroll: prerollS(), safe: practice ? safeFor(i) : null });
  updateHud(true);
}
function onAttempt(n, fromS) {
  const L = G.L;
  // 콤보: 새 시도 0, 연습 부활 = 체크포인트 틱부터 (20-balance 15-3 reset)
  if (J) J.reset(G.k, G.practice);
  const rec0 = lv(L.level.id);
  attemptBest = { combo: rec0.bestCombo ?? 0, acc: rec0.bestAccuracy ?? null };
  FX.reset();
  lastResult = null;
  $('comboLive').textContent = '';
  renderCombo(true);
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
  // 누른 채 재시작하면 바로 홀드 점프. 단, 연습 체크포인트 부활은 새로 눌러야 뜀 (부활 직후 원치 않는 점프로 죽는 고리 방지)
  if (inputHeld && G.k === 0) G.press(G.k);
  updateHud(true);
  cueHold = TEST && !hookRT ? 0 : 1;
  if (!cueHold) updateCue();
}
function onDeath(d) {
  // 콤보 끊김 = 사망 (20-balance 15-3). 표시는 0.3 s 소리 없이 작아지며 사라짐 (30-art 5-8)
  if (J) J.onDeath();
  persist(); // bestCombo (일반 모드)
  FX.onBreak(uiT); // 숫자·파티클·판정 글 0.3 s 안에 조용히 (소리·✕·"0" 없음)
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
  // 정확도 (20-balance 15-10): 일반 모드 클리어만, 기록 = 최고값(max)
  const acc = J ? J.onClear() : null;
  if (!G.practice && acc != null) rec.bestAccuracy = updateBest(rec.bestAccuracy ?? null, acc);
  lastResult = { acc, combo: J ? J.combo : 0, practice: G.practice,
    newAcc: !G.practice && acc != null && attemptBest.acc != null && acc > attemptBest.acc,
    newCombo: !G.practice && J && J.combo > attemptBest.combo && attemptBest.combo > 0 };
  persist();
  FX.onClear(uiT); // 30-art 5-7: 숫자·파티클·판정 글도 0.2 s에 사라짐
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
  // 10-lore 5-5: 1번이면 단수 문구 (clear_attempts에 1을 넣지 않음)
  $('clearAtt').textContent = G.attempts === 1 ? t('clear_attempts_one') : t('clear_attempts', { n: G.attempts });
  const last = i >= LEVELS.length - 1;
  const all = LEVELS.every((l) => lv(l.id).cleared);
  $('cNext').classList.toggle('hidden', last);
  // clear_all: 마지막 레벨 클리어 화면에서 모든 레벨을 깼을 때만 (10-lore 5-5)
  $('clearAll').classList.toggle('hidden', !(last && all));
  $('clearAll').textContent = t('clear_all');
  renderResult();
  show('clear');
}
function quitToLevels() { audio.stopRun(true); G.stop(); R.clearFx(); pendingStart = null; show('levels'); }

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
  // 첫 탭: 오디오 켜기(resume)가 끝난 뒤 다음 작업으로 메뉴를 보임 (같은 프레임에 몰지 않음)
  const afterUnlock = (pr) => { tappedOnce = true; const go = () => { if (screen === 'title') show('title'); }; pr.then(() => setTimeout(go, 0)); setTimeout(go, 400); };
  window.addEventListener('pointerdown', (e) => {
    const pr = audio.unlock();
    if (screen === 'title' && !$('tapStart').classList.contains('hidden')) {
      e.preventDefault();
      afterUnlock(pr);
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
    const pr = audio.unlock();
    if (screen === 'title' && !$('tapStart').classList.contains('hidden')) { afterUnlock(pr); return; }
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
    }
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
  click('pResume', resumeGame);
  click('pRestart', () => { G.paused = false; audio.resume(); G.checkpoints = []; persistCombo(); startLevel(G.levelIndex, G.practice); });
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

// 박자 보정 테스트: 메트로놈 8박, 탭 시각 평균 차이 → 보정값 제안·적용
let offTest = null;
function offsetTest() {
  if (!audio.running()) { audio.unlock(); }
  if (!audio.ctx || offTest) return;
  const out = $('offsetTestOut');
  out.textContent = '…';
  // (round-3, criteria runner-01 round-2 줄) 시작 전에 자동 지연(outputLatency) 안정 대기 (첫 시도 startLevel과 같은 규칙, 최대 1 s)
  offTest = { waiting: true };
  const wait = () => {
    if (screen !== 'settings') { offTest = null; out.textContent = ''; return; }
    if (!audio.running() || !audio.latencyStable(performance.now() / 1000)) { requestAnimationFrame(wait); return; }
    runOffsetTest(out);
  };
  wait();
}
function runOffsetTest(out) {
  const beat = 0.5, n = 8, ctx = audio.ctx;
  const off0 = save.settings.offset / 1000;
  // 예약 시각 sched_i (그 순간 자동 지연 + 저장 보정만큼 일찍)
  const sched0 = ctx.currentTime + 0.3 - audio.comp();
  for (let i = 0; i < n; i++) audio.sfx('tick', { at: sched0 + i * beat, hz: i % 4 ? 880 : 1320 });
  offTest = { sched0, off0, beat, n, taps: [] };
  const onTap = (e) => {
    if (!offTest || offTest.waiting) return;
    if (e.target.id === 'bOffsetTest') return;
    const now = ctx.currentTime - (performance.now() - e.timeStamp) / 1000;
    // 탭마다 그 순간의 자동 지연으로 비교: 들리는 박 = 예약 시각 + autoNow + 저장 보정 (테스트 도중 지연이 바뀌어도 이중 보정 없음)
    const heard0 = offTest.sched0 + audio.autoLatency() + offTest.off0;
    const rel = (now - heard0) / offTest.beat;
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
  // (D35) 폭 대신 translateX: 레이아웃·페인트 없이 합성만
  if (force || c.w !== w) { $('barFill').style.transform = `translateX(${(+w - 100).toFixed(1)}%)`; c.w = w; }
  const bst = (G.practice ? rec.bestPractice : rec.best).toFixed(1);
  if (force || c.b !== bst) { $('barBest').style.left = `calc(${bst}% - 1.5px)`; c.b = bst; }
  // (D35) 문구 만들기(t)도 숫자가 바뀔 때만
  const pf = Math.floor(pct);
  if (force || c.pf !== pf) { const p = t('progress', { pct: pf }); if (c.p !== p) { $('pct').textContent = p; c.p = p; } c.pf = pf; }
  const an = G.practice ? practiceAttempts : G.attempts;
  if (force || c.an !== an) { const txt = t('attempt', { n: an }); if (force || c.a !== txt) { $('att').textContent = txt; c.a = txt; } c.an = an; }
  const big = uiT < attBigUntil;
  if (force || c.big !== big) { $('att').classList.toggle('big', big); c.big = big; }
  // 30-art 5-7: 클리어 후 0.2 s 페이드아웃 (게임 시간 기준이라 ?test=1 화면도 같음)
  const op = G.state === 'clear' ? Math.max(0, 1 - G.clearT / 0.2).toFixed(2) : '';
  if (force || c.op !== op) { $('hud').style.opacity = op; c.op = op; }
}
let cueSuppressed = false, cueRect = null;
// (D35) 시도 첫 프레임에는 튜토리얼 카드 DOM을 만들지 않음(다음 프레임으로): 시작 프레임의 화면 전환 스타일·레이아웃과 카드 만들기가 한 프레임에 겹치지 않게. 일반 모드 rAF 경로만(?test=1 step()은 그대로)
let cueHold = 0;
const cueRects = new Map();
// 로드 화면 뒤에서 튜토리얼 카드 상자를 미리 잼 (첫 등장 프레임에 강제 레이아웃 없음)
function prebuildCueRects() {
  const el = $('cue'), keys = new Set(LEVELS.flatMap((l) => (l.cues || []).map((c) => c.key)));
  for (const k of keys) {
    el.innerHTML = cueIcon(k, colors(LEVELS[0].theme_id)) + `<span>${t(k)}</span>`;
    el.classList.remove('hidden');
    const r = el.getBoundingClientRect();
    cueRects.set(k + '|' + innerWidth + 'x' + innerHeight, { l: r.left, r: r.right, t: r.top, b: r.bottom });
  }
  el.classList.add('hidden'); el.innerHTML = '';
}
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
      // 카드 상자는 (문구, 화면 크기)마다 한 번만 잼 (레벨 시작 프레임 강제 레이아웃 줄임, round-3 성능)
      const ck = c.key + '|' + innerWidth + 'x' + innerHeight;
      if (!cueRects.has(ck)) { const r = el.getBoundingClientRect(); cueRects.set(ck, { l: r.left, r: r.right, t: r.top, b: r.bottom }); }
      cueRect = cueRects.get(ck);
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
    const hb = R.hudBottom ?? hudBottom(); // (D35) 로드·크기 바뀜 때 잰 값 (프레임 안 강제 레이아웃 없음)
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
  if (audio) { audio.pollLatency(now / 1000); if (pendingStart && audio.latencyStable(now / 1000)) startLevel(...pendingStart); }
  const dt = lastFrame ? Math.min(0.25, (now - lastFrame) / 1000) : 1 / 60;
  lastFrame = now;
  if (!TEST || hookRT) {
    if (screen === 'playing') {
      G.advance(dt, now);
      syncClock();
    }
    if (screen !== 'pause' && screen !== 'countdown') uiTick(dt);
    if (screen === 'playing' && !G.paused) fxUpdate(dt);
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
    view = { x, y, rot, camX, beat, beatS, intensity: sec.intensity, showPlayer: G.state !== 'dead', G, cp: G.practice ? G.checkpoints[G.checkpoints.length - 1] : null };
    comboViewHooks(view);
    R.draw(view);
    drawDemo(view);
    if (screen === 'playing') { updateHud(false); if (cueHold > 0) cueHold--; else updateCue(); renderCombo(false); }
  } else {
    // 메뉴 배경: 선택 레벨을 천천히 흘려 보여 줌
    menuCam += dt * 3;
    const L = COMPILED[selLevel];
    const beatS = 60 / L.level.bpm;
    view = { x: 0, y: 0, rot: 0, camX: menuCam % (L.level.length_tiles - 30), beat: now / 1000 / beatS, beatS, intensity: 1, showPlayer: false };
    R.draw(view);
  }
}

// ---------------------------------------------------------------- 콤보·판정 표시 (30-art 5-8, 20-balance 15장)
let J = null;                 // combo.js createComboJudge (combo-ref와 같은 규칙)
function fxUpdate(dt) { if (G.L) FX.update(dt, uiT, G.L.V[Math.min(G.k, G.L.V.length - 1)] ?? 10); }
let attemptBest = { combo: 0, acc: null };
let lastResult = null;
const CB = () => DATA.bal.combo;
function persistCombo() { persist(); }
function onJudgeTick(k, ev, pressId) {
  if (!J) return;
  const r = J.onStep(k, ev, pressId);
  if (!r) return; // 헛점프·북 발판: 반응 없음
  const C = CB();
  if (!G.practice) { const rec = lv(G.L.level.id); if (J.combo > (rec.bestCombo ?? 0)) rec.bestCombo = J.combo; }
  if (!C.enabled) return;
  // 큰 숫자 튐·단계(5·10·15·20) 파티클 (30-art 5-8-1·5-8-3). 단계 화음 = 판정 박 + 0.5박 (5-8-6)
  FX.onCombo(J.combo, uiT);
  if (C.mark_at.includes(J.combo)) {
    audio.sfx('combo_mark', { mark: J.combo, beatTimeS: G.L.level.judge_taps[r.i].t_s });
    const live = $('comboLive'); live.textContent = ''; live.textContent = t('combo_mark_aria');
  }
  if (C.judge_pct?.enabled) {
    // 판정 글 자리 (5-8-2): 땅 탭 = 플레이어 뒤쪽 위, 고리 탭 = 고리 중심 왼쪽 아래. 판정 순간 한 번 계산
    const T = R.T, camX = camFor(G.prev.x);
    const playerL = R.W * R.playerRatio, playerTop = R.groundPx - (G.prev.y + 1) * T;
    let orb = null;
    if (ev & 2) {
      const ids = G.s.used, o = G.L.byId.get(ids[ids.length - 1 - (ev & 8 ? 1 : 0)])?.src;
      if (o) orb = { cx: (o.x + 0.5 - camX) * T, cy: R.groundPx - (o.y + 0.5) * T };
    }
    const pR = G.prev.x + 1; // 플레이어 박스 오른쪽 끝 (월드)
    // (b) 판정 순간 왼쪽 끝이 플레이어 오른쪽보다 오른쪽인 물체(앞쪽 물체)의 판정 상자만 (D24 오른쪽 확장 폐기)
    const blocked = (l, rr, tp, b) => {
      const wl = camX + l / T, wr = camX + rr / T, yb = (R.groundPx - b) / T, yt = (R.groundPx - tp) / T;
      const ov = (a0, a1, b0, b1) => a0 < b1 && b0 < a1;
      for (const z of G.L.hazards) if (z.x0 > pR && z.x0 < wr && ov(z.x0, z.x1, wl, wr) && ov(z.y0, z.y1, yb, yt)) return true;
      const P = R.prepData();
      if (P) for (const g of P.groups) if (g.x0 > pR && ov(g.x0, g.x1, wl, wr) && yt > g.y + 1) return true;
      return false;
    };
    FX.onJudge(r.grade, r.pct ?? null, uiT, { playerL, playerTop, orb, hudBottom: R.hudBottom ?? 0, blocked });
  }
}
// HUD 띠 아래 끝 (판정 글 겹침 검사 (a)·파티클 영역). 화면 크기가 바뀔 때·레벨 시작 때만 잼 (매 판정 getBoundingClientRect 안 함)
function measureHud() {
  if (!R) return;
  const hid = $('hud').classList.contains('hidden');
  if (hid) $('hud').classList.remove('hidden');
  R.hudBottom = hudBottom();
  if (hid) $('hud').classList.add('hidden');
}

// 콤보 대체 글 (10-lore 5-8): 큰 숫자 블록 하나의 meter. aria-valuetext 숫자만, 0~1이면 hidden 속성만 (aria-hidden + label 금지)
function renderCombo(force) {
  const el = $('combo');
  if (!J) return;
  const C = CB();
  const v = C.enabled && J.combo >= C.show_from && G.state !== 'dead' ? J.combo : -1;
  if (!force && el._v === v) return;
  el._v = v;
  el.hidden = v < 0;
  if (v >= 0) { el.setAttribute('aria-valuenow', String(v)); el.setAttribute('aria-valuetext', String(v)); }
}
// 프레임마다: 큰 숫자 블록 alpha(가까움·카드), 그리기 순서 훅 (30-art 5-8-0)
let FX = null;
function comboViewHooks(view) {
  const T = R.T, camX = view.camX;
  const near = (l, r, tp, b) => {
    const wl = camX + l / T, wr = camX + r / T, yb = (R.groundPx - b) / T, yt = (R.groundPx - tp) / T;
    // 플레이어 박스도 포함 (점프 꼭대기 머리)
    if (view.showPlayer && view.x < wr && view.x + 1 > wl && view.y < yt && view.y + 1 > yb) return true;
    return R.objectsIn(wl, wr, yb, yt);
  };
  const card = !$('cue').classList.contains('hidden') ? cueRect : null; // 튜토리얼 카드가 이김 (5-8-1)
  FX.frameBlock(uiT, near, card);
  view.back = (ctx) => { FX.drawBlock(ctx, uiT); FX.drawParticles(ctx, uiT); };
  view.front = (ctx) => { FX.drawJudge(ctx, uiT); };
  view.warm = FX.warm;
}

// 결과 화면 한 줄 (30-art 5-8-4): 일반 모드 클리어만. 진행도 %는 보이지 않음
function renderResult() {
  const box = $('clearStats'), r = lastResult, C = CB();
  const on = !!r && !r.practice && C.enabled;
  box.classList.toggle('hidden', !on);
  if (!on) return;
  const accOn = C.judge_pct?.enabled && r.acc != null;
  const sa = $('stAcc'), sc = $('stCombo');
  sa.classList.toggle('hidden', !accOn);
  if (accOn) {
    sa.querySelector('.v').textContent = t('result_accuracy_value', { pct: r.acc });
    sa.setAttribute('aria-valuenow', String(r.acc)); sa.setAttribute('aria-valuetext', t('result_accuracy_value', { pct: r.acc }));
  }
  // 30-art 5-8-7: 단계 막대 표지(16 px, 닿은 단계만 불투명) + 숫자 22 px + 라벨(combo_label) 14 px
  sc.querySelector('.cm').innerHTML = barsSvg(stageOf(r.combo), 16);
  sc.querySelector('.n').textContent = t('result_best_combo_value', { n: r.combo });
  sc.setAttribute('aria-valuemax', String(G.L.level.judge_taps?.length ?? r.combo));
  sc.setAttribute('aria-valuenow', String(r.combo)); sc.setAttribute('aria-valuetext', String(r.combo));
  const tint = DATA.art.cardTint?.[G.L.level.theme_id] ?? DATA.art.common.hud;
  box.style.setProperty('--tint', tint);
  sa.classList.toggle('nb', !!r.newAcc); sc.classList.toggle('nb', !!r.newCombo);
  sa.querySelector('.nbt').classList.toggle('hidden', !r.newAcc); sc.querySelector('.nbt').classList.toggle('hidden', !r.newCombo);
  if (r.newAcc || r.newCombo) audio.sfx('new_best');
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
  get ready() { return !!G && warmDone; },
  get audio() { return audio?.ctx ? audio.ctx.state : 'off'; },
  loadLevel(i, opts = {}) { hookRT = false; startLevel(i, !!opts.practice); return hook.state; },
  // 입력열을 넣고 x 지점까지 step()으로 진행 (스크린샷용)
  seek(i, x, { taps, practice = false } = {}) {
    hookRT = false;
    taps ??= DATA.testInputs?.levels?.[LEVELS[i].id]?.taps ?? [];
    startLevel(i, practice);
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
      if (screen === 'playing') { uiTick(1 / DATA.bal.physics_hz); fxUpdate(1 / DATA.bal.physics_hz); }
    }
    // 일반 모드와 같은 화면: HUD·튜토리얼 카드·토스트를 같은 시계로 갱신 (round-1 S16)
    if (screen === 'playing') { updateHud(false); updateCue(); renderCombo(false); }
    maybeShowClear();
    return hook.state;
  },
  press() { inputHeld = true; G.press(); },
  release() { inputHeld = false; G.release(); },
  placeCheckpoint: () => G.placeCheckpoint(), // QA 호환용 (화면에는 버튼 없음, 연습은 자동 체크포인트)
  get checkpoints() { return G ? G.checkpoints.map((c) => ({ k: c.k, x: c.x, y: c.s.y, auto: !!c.auto })) : []; },
  safePoints: (i) => [...safeFor(i).keys()],
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
  // 콤보·판정 % (20-balance 15-9 5번, 15-10-7 6번)
  get combo() { return J ? J.combo : 0; },
  get bestCombo() { return G?.L ? (lv(G.L.level.id).bestCombo ?? 0) : 0; },
  get grades() { return J ? J.grades.map((g) => ({ ...g })) : []; },
  get lastPct() { return J ? J.lastPct : null; },
  get accuracy() { return J ? J.accuracy : null; },
  get bestAccuracy() { return G?.L ? (lv(G.L.level.id).bestAccuracy ?? null) : null; },
  get judgeShown() { const j = FX?.judge; return j && j.on ? { grade: j.grade, pct: j.pct, drawn: !!j.drawn, hidePct: !!j.hidePct, skip: !!j.dotsOnly, kind: j.kind, box: j.box && { l: Math.round(j.box.l), r: Math.round(j.box.r), t: Math.round(j.box.t), b: Math.round(j.box.b) } } : null; },
  // (round-3) 판정 글 생략률 (5-8-2, 결정 19): 입력 종류별 판정 수·등급 점만(③)·% 숨김. resetJudgeStats()로 0
  get judgeStats() { return FX ? JSON.parse(JSON.stringify(FX.stats)) : null; },
  resetJudgeStats() { if (FX) for (const k of Object.keys(FX.stats)) Object.assign(FX.stats[k], { n: 0, skip: 0, hidePct: 0 }); },
  // (round-3) 큰 콤보 숫자 블록·파티클 상태 (30-art 5-8-1·5-8-3)
  get comboFx() { if (!FX) return null; const b = FX.block; return { visible: b.visible, value: b.v ?? b.value, alpha: +(b.alpha ?? 0).toFixed(3), stage: b.stage, rect: b.visible ? { l: Math.round(b.rect.l), r: Math.round(b.rect.r), t: Math.round(b.rect.t), b: Math.round(b.rect.b) } : null, particles: FX.particleCount(), Hn: FX.atlas()?.Hn ?? null, reduced: REDUCED }; },
  get latency() { return audio ? { auto: audio.autoLatency(), comp: audio.comp(), runComp: audio.runComp(), pending: !!pendingStart, ...audio.latencyState() } : null; },
  get save() { return JSON.parse(JSON.stringify(save)); },
};
window.__game = hook;

boot();
