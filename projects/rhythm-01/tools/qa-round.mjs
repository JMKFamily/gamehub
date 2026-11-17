#!/usr/bin/env node
// rhythm-01 QA 라운드 검사 (qa-engineer 전용, 빌드는 읽기만 함)
//
//   PLAYWRIGHT_CORE=<playwright-core 폴더> node projects/rhythm-01/tools/qa-round.mjs --round 1 --part <이름|all> [--channel msedge]
//   node projects/rhythm-01/tools/qa-round.mjs --round 1 --merge      # parts/*.json → metrics.json
//
// 파트
//   shots     4해상도 × 화면 스크린샷(글 있는 화면 + notext + 영어), 버튼 48 px·겹침·화면 밖·글 잘림·스크롤
//   replay    ?test=1 레벨 1~10 완벽 입력열(+판정 오차 0 확인)·±40 ms·σ25, 무입력 실패·재시작 1.08 s
//   realtime  일반 모드(오디오 켜짐) autoplay(rAF + PointerEvent) L1~L10, Playwright 실제 마우스(CDP) L1·L5·L10
//   bots      ?test=1 빌드에서 σ25/50/70/90(+σ70 따라 치기) 세션 → 시도마다 tools/sim/judge.mjs 와 대조 + 통계 비교
//   perf      6배 CPU 스로틀링 fps(레벨 시작·재시작 직후, DPR 1·3), 입력 → 다음 프레임
//   features  재시작 시간(실시간 프레임), 연습 모드, 저장 유지, 백그라운드, 음소거, 결과 버튼, 해금, 카드 1회, 손가락
//   calib     결정 9: 첫 실행 보정·건너뛰기, 보정 계산 규칙, 실제 마우스 보정(오프셋 0/120/200), 보호자 문, 모래시계, 정지 화면
//   static    빌드 파일 외부 URL·레퍼런스 이름 검색, data 사본 = 기획 원본
// 콘솔·네트워크 로그는 모든 파트에서 모아 parts/<파트>.json 의 log 에 넣는다.
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, join, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { compileLevel, judgeAttempt } from './sim/judge.mjs';
import { runProfile } from './sim/bots.mjs';

const PROJ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(PROJ, '../..');
const GAME = join(ROOT, 'games/rhythm-01');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const ROUND = opt('--round', '1');
const PART = opt('--part', 'all');
const CHANNEL = opt('--channel', process.env.QA_CHANNEL || 'msedge');
const OUT = join(PROJ, 'reviews', `round-${ROUND}`);
const SHOTS = join(OUT, 'shots');
const PARTS = join(OUT, 'parts');
mkdirSync(SHOTS, { recursive: true }); mkdirSync(PARTS, { recursive: true });
const RES = [[360, 640], [412, 915], [640, 360], [1280, 720]];

const bal = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8'));
const LV = bal.levels.map((f) => JSON.parse(readFileSync(join(PROJ, f), 'utf8')));
const CL = LV.map((l) => compileLevel(l, bal));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const med = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (s[(n - 1) >> 1] + s[n >> 1]) / 2 : null; };
const medLow = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const r1 = (x) => (x == null ? x : Math.round(x * 10) / 10);

// ---------------- merge ----------------
if (args.includes('--merge')) {
  const m = { round: +ROUND, game: 'rhythm-01', build: 'games/rhythm-01', generated: new Date().toISOString(), parts: {} };
  for (const f of readdirSync(PARTS).filter((x) => x.endsWith('.json')).sort()) m.parts[f.replace('.json', '')] = JSON.parse(readFileSync(join(PARTS, f), 'utf8'));
  const logs = Object.values(m.parts).map((p) => p.log).filter(Boolean);
  m.basic = {
    console_errors_warnings: logs.flatMap((l) => [...l.console, ...l.pageerrors]),
    failed_requests: logs.flatMap((l) => l.failed),
    external_requests: logs.flatMap((l) => l.external),
    requests_total: logs.reduce((a, l) => a + l.requests, 0),
  };
  const P = m.parts;
  m.summary = {
    sd70_first_clear_median: P.bots && P.bots.compare_sd70 && Object.fromEntries([...P.bots.compare_sd70].sort((x, y) => x.level.localeCompare(y.level)).map((c) => [c.level, { build: c.build_median, sim: c.sim_median, build_mean_progress: c.build_mean_progress, sim_mean_progress: c.sim_mean_progress, build_median_fail_progress: c.build_median_fail_progress, sim_median_fail_progress: c.sim_median_fail_progress }])),
    bot_attempts_compared: P.bots && P.bots.compared, bot_attempt_mismatch: P.bots && P.bots.mismatch,
    replay: P.replay && P.replay.summary,
    realtime_autoplay_clear: P.realtime && P.realtime.autoplay.filter((r) => r.clear).length + '/' + P.realtime.autoplay.length,
    realtime_mouse: P.realtime && P.realtime.mouse.map((r) => ({ level: r.level, clear: r.clear, attempts: r.attempts, err_ms: [r.errMin, r.errMax] })),
    fps_6x: P.perf && P.perf.runs.map((r) => ({ res: r.res, dpr: r.dpr, window: r.window, avg: r.avg_fps, low1: r.low1_fps })),
    input_to_frame_ms: P.perf && P.perf.reaction.map((r) => ({ res: r.res, dpr: r.dpr, median: r.median_ms, max: r.max_ms })),
    restart_ms: P.features && P.features.restart.map((r) => ({ level: r.level, cpu: r.cpu, failJudgeToFirstMovingFrame: r.failJudgeToFirstMovingFrameMs })),
    buttons_min_px: P.shots && P.shots.summary.min_button_px, button_issues: P.shots && P.shots.summary.button_issues.length, shots: P.shots && P.shots.summary.shots,
  };
  writeFileSync(join(OUT, 'metrics.json'), JSON.stringify(m, null, 1));
  console.log('metrics.json 작성', Object.keys(m.parts).join(', '), 'console', m.basic.console_errors_warnings.length, 'failed', m.basic.failed_requests.length, 'external', m.basic.external_requests.length);
  process.exit(0);
}

// ---------------- static (브라우저 없음) ----------------
function partStatic() {
  const files = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); } };
  walk(GAME);
  const urls = [], names = [];
  const NAME_RE = /geometry\s*dash|geometrydash|robtop|reverbound|rhythm\s*heaven|osu!|taiko|patapon|beat\s*saber|cytus|deemo|piano\s*tiles/i;
  for (const f of files) {
    if (!/\.(html|css|js|json|svg|mjs)$/.test(f)) continue;
    const s = readFileSync(f, 'utf8');
    for (const m of s.matchAll(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'<>)]*/gi)) if (!/^(?:https?:)?\/\/www\.w3\.org\//.test(m[0])) urls.push(`${f.slice(ROOT.length + 1)}: ${m[0]}`);
    for (const m of s.matchAll(new RegExp(NAME_RE, 'gi'))) names.push(`${f.slice(ROOT.length + 1)}: ${m[0]}`);
    if (/@import|@font-face|fonts\.googleapis/.test(s)) urls.push(`${f.slice(ROOT.length + 1)}: font/import`);
  }
  // data 사본 = 기획 원본
  const same = [];
  const cmp = (a, b) => { const x = readFileSync(a), y = readFileSync(b); return createHash('sha1').update(x).digest('hex') === createHash('sha1').update(y).digest('hex'); };
  same.push({ file: 'balance.json', equal: cmp(join(PROJ, 'balance.json'), join(GAME, 'data/balance.json')) });
  for (const f of bal.levels) same.push({ file: f, equal: cmp(join(PROJ, f), join(GAME, 'data', f)) });
  same.push({ file: 'tools/sim/judge.mjs vs js/judge.js', equal: readFileSync(join(PROJ, 'tools/sim/judge.mjs'), 'utf8').replace(/\r/g, '') === readFileSync(join(GAME, 'js/judge.js'), 'utf8').replace(/\r/g, '') });
  // DOM 의 링크·광고·구매 요소
  const html = readFileSync(join(GAME, 'index.html'), 'utf8');
  const links = [...html.matchAll(/<a\s|<iframe|<form|target="_blank"/g)].map((m) => m[0]);
  const ads = readFileSync(join(GAME, 'js/ads.js'), 'utf8');
  const sizes = files.reduce((a, f) => a + statSync(f).size, 0);
  return { files: files.length, bytes: sizes, external_urls: urls, reference_names: names, data_copies: same, html_links_forms: links, ads_js: ads.replace(/\r/g, '').trim().slice(0, 400) };
}

// ---------------- 브라우저 공통 ----------------
let pw;
async function loadPW() {
  for (const t of [process.env.PLAYWRIGHT_CORE && pathToFileURL(process.env.PLAYWRIGHT_CORE.replace(/[\\/]$/, '') + '/index.mjs').href, 'playwright', 'playwright-core'].filter(Boolean)) {
    try { const m = await import(t); return m.chromium ? m : m.default; } catch {}
  }
  throw new Error('playwright-core 를 찾지 못함 (PLAYWRIGHT_CORE)');
}
const PORT = 8190 + Math.floor(Math.random() * 40);
const BASE = `http://localhost:${PORT}/games/rhythm-01/`;
let server, browser;
const LOG = { console: [], pageerrors: [], failed: [], external: [], requests: 0 };
async function startAll() {
  pw = await loadPW();
  server = spawn(process.execPath, [join(PROJ, 'tools/serve.mjs'), String(PORT)], { stdio: 'ignore' });
  process.on('exit', () => { try { server.kill(); } catch {} });
  for (let k = 0; k < 80; k++) { try { if ((await fetch(BASE)).ok) break; } catch {} await sleep(100); }
  browser = await pw.chromium.launch({ channel: CHANNEL, headless: true });
}
async function stopAll() { try { await browser.close(); } catch {} try { server.kill(); } catch {} }

// 오디오 관찰(일반 모드): 시작 시각 기록, 출력 앞 분석기(음소거 확인), localStorage qaLat 으로 outputLatency 흉내
function PROBE() {
  window.__qa = { starts: [], taps: [], an: null, ctx: null };
  try {
    const l = localStorage.getItem('qaLat');
    if (l != null) {
      const v = +l;
      Object.defineProperty(AudioContext.prototype, 'outputLatency', { configurable: true, get() { return v; } });
      Object.defineProperty(AudioContext.prototype, 'baseLatency', { configurable: true, get() { return 0; } });
    }
  } catch {}
  const st = AudioScheduledSourceNode.prototype.start;
  AudioScheduledSourceNode.prototype.start = function (when = 0, ...r) {
    const q = window.__qa; q.ctx = this.context; q.starts.push({ when, at: performance.now() });
    if (q.starts.length > 6000) q.starts.splice(0, 3000);
    return st.call(this, when, ...r);
  };
  const conn = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...r) {
    if (typeof AudioDestinationNode !== 'undefined' && dest instanceof AudioDestinationNode) {
      const an = this.context.createAnalyser(); an.fftSize = 2048; window.__qa.an = an; window.__qa.ctx = this.context;
      conn.call(this, an); conn.call(an, dest); return dest;
    }
    return conn.call(this, dest, ...r);
  };
  document.addEventListener('pointerdown', (e) => { window.__qa.taps.push(e.timeStamp); }, true);
  window.__qaRms = () => { const an = window.__qa.an; if (!an) return null; const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d); let s = 0; for (const x of d) s += x * x; return Math.sqrt(s / d.length); };
}

async function open(w, h, q = '?test=1', { dsf = 1, init = null, lang = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, hasTouch: false });
  if (init) await ctx.addInitScript(init.fn, init.arg);
  await ctx.addInitScript(PROBE);
  const p = await ctx.newPage();
  const tag = `${w}x${h}${q}`;
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) LOG.console.push(`[${tag}] ${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => LOG.pageerrors.push(`[${tag}] ${e.message}`));
  p.on('request', (r) => { LOG.requests++; const u = new URL(r.url()); if (/^(https?|wss?):$/.test(u.protocol) && !['localhost', '127.0.0.1'].includes(u.hostname)) LOG.external.push(r.url()); });
  p.on('requestfailed', (r) => LOG.failed.push(`[${tag}] ${r.url()} ${r.failure()?.errorText}`));
  p.on('response', (r) => { if (r.status() >= 400) LOG.failed.push(`[${tag}] ${r.url()} HTTP ${r.status()}`); });
  await p.goto(BASE + q + (lang ? `${q ? '&' : '?'}lang=${lang}` : ''));
  await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 20000 });
  return { ctx, p };
}
const G = (p, f, a) => p.evaluate(f, a);

// 화면 검사: 보이는 버튼 48 px·화면 안·서로 겹침, 글 요소 잘림, 문서 스크롤
async function inspect(p) {
  return p.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (r.width <= 0 || r.height <= 0 || cs.visibility === 'hidden' || cs.display === 'none') return false; let n = e; while (n && n !== document.body) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; n = n.parentElement; } return true; };
    const W = innerWidth, H = innerHeight;
    const btns = [...document.querySelectorAll('button')].filter(vis).map((b) => { const r = b.getBoundingClientRect(); return { id: b.id || b.className + ':' + (b.getAttribute('aria-label') || '').slice(0, 12), x: r.left, y: r.top, w: r.width, h: r.height }; });
    const issues = [];
    for (const r of btns) {
      if (r.w < 47.5 || r.h < 47.5) issues.push(`small ${r.id} ${r.w.toFixed(0)}x${r.h.toFixed(0)}`);
      if (r.x < -0.5 || r.y < -0.5 || r.x + r.w > W + 0.5 || r.y + r.h > H + 0.5) issues.push(`offscreen ${r.id} (${r.x.toFixed(0)},${r.y.toFixed(0)},${r.w.toFixed(0)}x${r.h.toFixed(0)})`);
    }
    for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) {
      const a = btns[i], b = btns[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 1 && oy > 1) issues.push(`overlap ${a.id} / ${b.id}`);
    }
    const texts = [...document.querySelectorAll('[data-t], .lname, h1, h2, p, small, span')].filter((e) => vis(e) && e.textContent.trim() && e.children.length === 0 && !e.classList.contains("sr"));
    const clip = [];
    for (const e of texts) {
      const r = e.getBoundingClientRect();
      if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') clip.push(`overflow ${e.dataset.t || e.className} "${e.textContent.trim().slice(0, 16)}"`);
      if (r.left < -0.5 || r.right > W + 0.5 || r.top < -0.5 || r.bottom > H + 0.5) clip.push(`offscreen-text ${e.dataset.t || e.className} "${e.textContent.trim().slice(0, 16)}"`);
    }
    const textRects = texts.map((e) => { const r = e.getBoundingClientRect(); return { k: e.dataset.t || e.className, x: r.left, y: r.top, w: r.width, h: r.height }; });
    for (const t of textRects) for (const b of btns) { const ox = Math.min(t.x + t.w, b.x + b.w) - Math.max(t.x, b.x), oy = Math.min(t.y + t.h, b.y + b.h) - Math.max(t.y, b.y); if (ox > 1 && oy > 1 && !(t.x >= b.x - 1 && t.x + t.w <= b.x + b.w + 1 && t.y >= b.y - 1 && t.y + t.h <= b.y + b.h + 1)) clip.push(`text-over-button ${t.k} / ${b.id}`); }
    const grid = document.getElementById('grid');
    return { state: window.__game.state, buttons: btns.length, issues, textIssues: clip, docScroll: document.documentElement.scrollHeight > H + 1 || document.documentElement.scrollWidth > W + 1, gridScroll: !!(grid && vis(grid) && grid.scrollHeight > grid.clientHeight + 1), minBtn: btns.length ? Math.min(...btns.map((b) => Math.min(b.w, b.h))) : null };
  });
}

// 캔버스로 그리는 요소(손가락·튜토리얼 글·HUD·일시정지 버튼) 겹침
async function playOverlap(p) {
  return p.evaluate(() => {
    const L = window.__game.layout();
    const rect = (e) => { if (!e || e.classList.contains('hidden')) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left, y: r.top, w: r.width, h: r.height } : null; };
    const ov = (a, b) => a && b && Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;
    const tut = rect(document.getElementById('tut'));
    const pause = { x: L.pause.x, y: L.pause.y, w: L.pause.w, h: L.pause.h };
    const bar = { x: L.bar.x, y: L.bar.y - 8, w: L.bar.w, h: L.bar.h + 30 };
    const orbit = { x: L.cx - L.R - L.starR, y: L.cy - L.R - L.starR, w: 2 * (L.R + L.starR), h: 2 * (L.R + L.starR) };
    const out = { tut, pause, bar, orbit, issues: [] };
    if (ov(tut, pause)) out.issues.push('tut/pause');
    if (ov(tut, bar)) out.issues.push('tut/hud');
    if (ov(tut, orbit)) out.issues.push('tut/orbit');
    if (ov(pause, orbit)) out.issues.push('pause/orbit');
    return out;
  });
}

async function shot(p, name, { notext = false } = {}) { await sleep(70); await p.screenshot({ path: join(SHOTS, name) }); return name; }

// 글 지우기 (harness/qa/lib.mjs blankText 와 같은 방식)
async function blankText(p) {
  await p.evaluate(() => {
    const wipe = (root) => { const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const l = []; while (tw.nextNode()) l.push(tw.currentNode); for (const n of l) if (n.nodeValue.trim()) n.nodeValue = ''; };
    wipe(document.body);
    new MutationObserver((ms) => { for (const m of ms) { for (const a of m.addedNodes) a.nodeType === 3 ? (a.nodeValue = '') : wipe(a); if (m.type === 'characterData' && m.target.nodeValue.trim()) m.target.nodeValue = ''; } }).observe(document.body, { subtree: true, childList: true, characterData: true });
  });
}

// ---------------- shots ----------------
async function partShots() {
  const out = { screens: [], overlap: [], scroll640: [] };
  const L1 = CL[0];
  const firstShowL1 = L1.shows[0].t;
  for (const [w, h] of RES) {
    const tag = `${w}x${h}`;
    for (const mode of ['text', 'notext', 'en']) {
      const { ctx, p } = await open(w, h, '?test=1', { lang: mode === 'en' ? 'en' : null });
      if (mode === 'notext') await blankText(p);
      const sfx = mode === 'text' ? '' : `-${mode}`;
      const rec = async (name, extra = {}) => { const f = await shot(p, `${tag}-${name}${sfx}.png`); if (mode !== 'notext') { const ins = await inspect(p); out.screens.push({ res: tag, mode, name, file: f, ...ins, ...extra }); } else out.screens.push({ res: tag, mode, name, file: f }); };
      await G(p, () => window.__game.show('title')); await rec('title');
      await G(p, () => window.__game.show('calib')); await G(p, () => { for (let k = 0; k < 3; k++) window.__game.calibTap(10); }); await rec('calib');
      await G(p, () => { const g = window.__game; for (let k = 0; k < 13; k++) g.calibTap(k % 2 ? 12 : 8); g.step(0.3); }); await rec('calib-done');
      await G(p, () => window.__game.step(1.3));
      await G(p, () => window.__game.show('levels')); await rec('levels-new');
      if (mode === 'en') { await G(p, () => window.__game.show('settings')); await rec('settings'); await G(p, () => window.__game.loadLevel(0)); await G(p, (t) => { const g = window.__game; g.step((g.stars()[0].t - 300 - g.levelTime()) / 1000); }, 0); await rec('play-l1-hand'); await G(p, () => { const g = window.__game; g.loadLevel(9); for (const s of g.stars()) g.pressAt(s.t); for (let k = 0; k < 200 && g.state !== 'result'; k++) g.step(0.1); }); await rec('result-l10'); await ctx.close(); continue; }
      await G(p, () => window.__game.loadLevel(0, { card: true })); await rec('card-l1');
      await G(p, () => window.__game.press());
      // 카운트인 2박째
      await G(p, () => { const g = window.__game; g.step((g.stars().length ? 545 * 1.5 : 0) / 1000 + 0.4); }); await rec('play-l1-countin');
      // 첫 보여 주기 별 직후 (북채)
      await G(p, (t) => { const g = window.__game; g.step((t + 60 - g.levelTime()) / 1000); }, firstShowL1); await rec('play-l1-show');
      // 손가락 튜토리얼
      await G(p, () => { const g = window.__game; g.step((g.stars()[0].t - 300 - g.levelTime()) / 1000); }); await rec('play-l1-hand'); out.overlap.push({ res: tag, mode, screen: 'play-l1-hand', ...(await playOverlap(p)) });
      await G(p, () => { const g = window.__game; g.pressAt(g.stars()[0].t); g.step(0.05); }); await rec('play-l1-perfect');
      await G(p, () => { const g = window.__game; const s = g.stars(); for (const st of s.slice(1, 5)) g.pressAt(st.t + 30); g.step(0.03); }); await rec('play-l1-follow');
      await G(p, () => { const g = window.__game; const st = g.stars()[5]; g.step((st.passEnd - g.levelTime()) / 1000 + 0.12); }); await rec('fail-0.12s');
      await G(p, () => window.__game.step(0.4)); await rec('fail-0.52s');
      await G(p, () => window.__game.step(0.45)); await rec('fail-0.97s');
      await G(p, () => window.__game.step(0.5)); await rec('restart-countin');
      await G(p, () => window.__game.show('pause')); await rec('pause');
      await G(p, () => { const g = window.__game; g.loadLevel(6); const s = g.stars(); for (const st of s.slice(0, 10)) g.pressAt(st.t); g.step(0.03); }); await rec('play-l7');
      await G(p, () => { const g = window.__game; g.loadLevel(2, { practice: true }); const s = g.stars(); for (const st of s.slice(0, 8)) g.pressAt(st.t); g.step(0.4); }); await rec('practice-l3');
      await G(p, () => { const g = window.__game; g.loadLevel(9); const s = g.stars(); for (const st of s) g.pressAt(st.t); g.step(2.2); }); await rec('clear-l10');
      await G(p, () => { const g = window.__game; for (let k = 0; k < 200 && g.state !== 'result'; k++) g.step(0.1); }); await rec('result-l10');
      await G(p, () => { const g = window.__game; g.loadLevel(0); const s = g.stars(); for (const st of s) g.pressAt(st.t + (st.i % 3 ? 70 : 0)); for (let k = 0; k < 200 && g.state !== 'result'; k++) g.step(0.1); }); await rec('result-l1');
      await G(p, () => { const g = window.__game; for (const i of [1, 2]) { g.loadLevel(i); g.autoplay(0, 0); } g.loadLevel(3, { practice: true }); g.autoplay(0, 0); g.setOffset(120); g.show('levels'); });
      await rec('levels-progress-badge');
      await G(p, () => window.__game.show('settings')); await rec('settings-badge');
      await G(p, () => window.__game.show('confirm')); await rec('confirm');
      await G(p, () => window.__game.loadLevel(1, { card: true })); await rec('card-l2');
      await G(p, () => window.__game.show('levels'));
      if (mode === 'text') {
        const b = await p.locator('#bGate').boundingBox();
        await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await sleep(1000);
        await rec('gate-holding'); await p.mouse.up(); await sleep(300);
      }
      if (w === 640) { for (const s of ['levels', 'settings', 'title']) { await G(p, (s) => window.__game.show(s), s); const ins = await inspect(p); out.scroll640.push({ mode, screen: s, docScroll: ins.docScroll, gridScroll: ins.gridScroll, offscreen: ins.issues.filter((x) => x.startsWith('offscreen')) }); } }
      await ctx.close();
    }
  }
  out.summary = {
    screens_checked: out.screens.filter((s) => s.issues).length,
    button_issues: out.screens.flatMap((s) => (s.issues || []).map((x) => `${s.res} ${s.mode} ${s.name}: ${x}`)),
    text_issues: out.screens.flatMap((s) => (s.textIssues || []).map((x) => `${s.res} ${s.mode} ${s.name}: ${x}`)),
    min_button_px: Math.min(...out.screens.filter((s) => s.minBtn != null).map((s) => s.minBtn)),
    overlap_issues: out.overlap.flatMap((o) => o.issues.map((x) => `${o.res} ${o.mode} ${o.screen}: ${x}`)),
    shots: readdirSync(SHOTS).length,
  };
  return out;
}

// ---------------- replay (test 모드) ----------------
async function partReplay() {
  const { ctx, p } = await open(1280, 720);
  const offs = CL.map((c) => [[0, 0], [-40, 0], [40, 0], [0, 25], [-(c.judge.pass_early_ms - 1), 0], [c.judge.pass_late_ms - 1, 0], [-(c.judge.pass_early_ms + 5), 0], [c.judge.pass_late_ms + 5, 0]]);
  const res = await p.evaluate((offs) => {
    const g = window.__game, out = [];
    for (let i = 0; i < 10; i++) {
      for (const [off, sd] of offs[i]) {
        g.loadLevel(i);
        const r = g.autoplay(off, sd, 11 + i);
        const errs = g.judgeLog().map((j) => j.e);
        out.push({ level: i + 1, off, sd, clear: r.clear, simExpect: null, grade: r.grade, attempts: r.attempts, lastResult: r.lastResult, maxAbsErr: errs.length ? Math.max(...errs.map(Math.abs)) : null, judged: errs.length });
      }
      g.loadLevel(i);
      let failAt = null, failPhaseAt = null;
      for (let k = 0; k < 20000 && g.attempts < 2; k++) { g.step(0.004); if (g.phase === 'fail' && failPhaseAt === null) failPhaseAt = g.gameClock() - (g.levelTime() - g.stars()[0].passEnd); }
      const restartAt = g.gameClock() - g.levelTime(); // 새 시도 곡 시작 = restartV
      const h = g.history()[0];
      const st = g.stars()[0];
      out.push({ level: i + 1, none: true, attempts: g.attempts, failIndex: h.failIndex, reason: h.reason, clear: h.clear, failPhaseToRestartMs: restartAt - failPhaseAt, levelTimeAfterRestart: g.levelTime(), firstStarPassEnd: st.passEnd });
    }
    return out;
  }, offs);
  await ctx.close();
  const fails = [];
  for (const r of res) {
    if (r.none) { if (r.attempts !== 2 || r.clear || r.failIndex !== 0 || Math.abs(r.failPhaseToRestartMs - 1080) > 4.01) fails.push(r); }
    else {
      const expectClear = r.sd ? true : judgeAttempt(CL[r.level - 1], CL[r.level - 1].stars.map((st) => st.t + r.off)).clear; // 같은 탭을 시뮬레이터에 넣은 결과
      if (r.clear !== expectClear) fails.push(r);
      if (r.off === 0 && r.sd === 0 && (r.grade !== 3 || r.maxAbsErr > 0.01)) fails.push(r);
    }
  }
  return { results: res, fails, summary: { perfect_clear: res.filter((r) => !r.none && r.off === 0 && r.sd === 0 && r.clear && r.grade === 3).length, perfect_maxAbsErr: Math.max(...res.filter((r) => !r.none && r.off === 0 && r.sd === 0).map((r) => r.maxAbsErr)), no_input_restart_ms: [...new Set(res.filter((r) => r.none).map((r) => r1(r.failPhaseToRestartMs)))], fail_count: fails.length } };
}

// ---------------- realtime (일반 모드, 오디오 켜짐) ----------------
async function enterNormal(p, { viaUi = false } = {}) {
  const vw = p.viewportSize();
  await p.mouse.click(vw.width / 2, vw.height * 0.6);
  await p.waitForFunction(() => window.__game.state === 'calib');
  if (viaUi) { await p.click('#bSkip'); await p.waitForFunction(() => ['card', 'play'].includes(window.__game.state)); }
  else await G(p, () => window.__game.skipCalibration());
  await p.waitForFunction(() => window.__qa.ctx && window.__qa.ctx.state === 'running', null, { timeout: 5000 }).catch(() => {});
}
// 페이지 performance 시계와 node 시계 차이
async function clockMap(p) {
  let best = null;
  for (let k = 0; k < 15; k++) {
    const a = performance.now(); const pt = await p.evaluate(() => performance.now()); const b = performance.now();
    if (!best || b - a < best.rtt) best = { rtt: b - a, d: pt - (a + b) / 2 };
  }
  return best; // pagePerf = nodePerf + d
}
// Playwright 실제 마우스(CDP Input)로 별 시각에 맞춰 누름. node 타이머 + 짧은 바쁜 대기, 페이지 evaluate 없음
async function mousePlay(p, { leadMs = 3, x, y, maxAttempts = 3 } = {}) {
  const vw = p.viewportSize(); x ??= vw.width / 2; y ??= vw.height * 0.45;
  await p.mouse.move(x, y);
  const out = { attempts: [], taps: 0 };
  for (let a = 0; a < maxAttempts; a++) {
    await p.waitForFunction(() => window.__game.nextStarPerfTime() !== null && window.__game.phase === 'run', null, { timeout: 15000 }).catch(() => {});
    const info = await p.evaluate(() => { const g = window.__game; const s = g.stars(); const t0 = g.nextStarPerfTime(); const i0 = Math.round(g.progress * s.length); return { att: g.attempts, i0, times: s.slice(i0).map((st) => t0 + (st.t - s[i0].t)) }; });
    const cm = await clockMap(p);
    for (const t of info.times) {
      const target = t - cm.d - leadMs; // node 시계
      const wait = target - performance.now();
      if (wait > 25) await sleep(wait - 20);
      while (performance.now() < target) { /* spin */ }
      await p.mouse.down(); await p.mouse.up();
      out.taps++;
      if ((out.taps & 7) === 0) { const ph = await p.evaluate(() => [window.__game.phase, window.__game.attempts]); if (ph[0] !== 'run' && ph[0] !== 'clearing' || ph[1] !== info.att) break; }
    }
    await p.waitForFunction((att) => window.__game.state === 'result' || window.__game.attempts !== att, info.att, { timeout: 90000 }).catch(() => {});
    const s = await p.evaluate(() => ({ ...window.__game.summary(), errs: window.__game.judgeLog().map((j) => Math.round(j.e * 10) / 10), lat: window.__game.latency() }));
    out.attempts.push(s);
    if (s.state === 'result') break;
  }
  return out;
}
async function partRealtime() {
  const out = { autoplay: [], mouse: [] };
  const runAuto = async (i) => {
    const { ctx, p } = await open(1280, 720, '');
    let flow = null;
    if (i === 0) {
      await enterNormal(p, { viaUi: true });
      const st = await G(p, () => window.__game.state);
      if (st === 'card') { await p.mouse.click(640, 400); await p.waitForFunction(() => window.__game.state === 'play'); }
      flow = { afterSkip: st };
    } else { await enterNormal(p); await G(p, (i) => window.__game.loadLevel(i), i); }
    const r = await G(p, () => window.__game.autoplay(0, 0));
    const x = await G(p, () => ({ lat: window.__game.latency(), errs: window.__game.judgeLog().map((j) => j.e), ctx: window.__qa.ctx && window.__qa.ctx.state, rms: window.__qaRms() }));
    const ae = x.errs.map(Math.abs);
    out.autoplay.push({ level: i + 1, flow, clear: r.clear, grade: r.grade, attempts: r.attempts, audio: x.ctx, autoLatencyMs: r1(x.lat.auto), maxAbsErrMs: r1(Math.max(...ae)), meanErrMs: r1(x.errs.reduce((a, b) => a + b, 0) / x.errs.length) });
    console.log(`  autoplay L${i + 1}: ${r.clear ? 'clear' : 'FAIL'} g${r.grade} a${r.attempts} max|e| ${r1(Math.max(...ae))}`);
    await ctx.close();
  };
  for (let k = 0; k < 10; k += 5) await Promise.all([0, 1, 2, 3, 4].map((d) => runAuto(k + d)));
  out.autoplay.sort((a, b) => a.level - b.level);
  for (const i of [0, 4, 9]) {
    const { ctx, p } = await open(1280, 720, '');
    await enterNormal(p);
    await G(p, (i) => window.__game.loadLevel(i), i);
    const r = await mousePlay(p, { leadMs: 3 });
    const last = r.attempts[r.attempts.length - 1];
    const errs = r.attempts.flatMap((a) => a.errs);
    out.mouse.push({ level: i + 1, clear: last.clear, attempts: last.attempts, grade: last.grade, errMin: Math.min(...errs), errMax: Math.max(...errs), errMedian: med(errs), autoLatencyMs: r1(last.lat.auto), lastResult: last.lastResult });
    console.log(`  mouse L${i + 1}: ${last.clear ? 'clear' : 'FAIL'} attempts ${last.attempts} e ${Math.min(...errs)}..${Math.max(...errs)}`);
    await ctx.close();
  }
  return out;
}

// ---------------- bots (test 모드 빌드 vs 시뮬레이터) ----------------
async function partBots() {
  const PROF = bal.bots.profiles;
  const plan = [
    ['skilled_sd25', 60], ['novice_sd50', 100], ['child_sd70', 600], ['child_sd90', 60], ['child_sd70_along', 100],
  ];
  const out = { levels: {}, mismatch: 0, compared: 0, notes: [] };
  const { ctx, p } = await open(1280, 720);
  const LVSEL = opt('--levels', '1,2,3,4,5,6,7,8,9,10').split(',').map((x) => +x - 1);
  for (const i of LVSEL) {
    const id = LV[i].id;
    out.levels[id] = {};
    for (const [name, sessions] of plan) {
      const along = name.endsWith('_along');
      const prof = PROF[along ? 'child_sd70' : name];
      const cap = name === 'child_sd90' ? 60 : 200;
      const shows = along ? CL[i].shows.map((s) => s.t) : null;
      const t0 = Date.now();
      const r = await p.evaluate(({ i, prof, sessions, seed, cap, extraAfter, shows }) => {
        const g = window.__game;
        let s = seed;
        const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
        const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
        g.loadLevel(i);
        const starsT = g.stars().map((x) => x.t);
        const targets = shows ? [...starsT, ...shows] : starsT;
        const botTaps = () => { const taps = []; for (const t of targets) { if (rnd() < prof.miss) continue; const tau = t + rnd.bias + gauss() * prof.sd_ms; taps.push(tau); if (rnd() < prof.extra) taps.push(tau + 1000 * (extraAfter[0] + rnd() * (extraAfter[1] - extraAfter[0]))); } return taps; };
        rnd.bias = 0;
        const attempts = [], firstClear = [];
        for (let ss = 0; ss < sessions; ss++) {
          g.loadLevel(i);
          let k = 0, cleared = false;
          while (k < cap) {
            k++;
            const taps = botTaps();
            const sorted = [...taps].sort((a, b) => a - b);
            const att = g.attempts; const dbg = { lt0: g.levelTime(), ph0: g.phase, kinds: [] };
            for (const tau of sorted) {
              if (g.attempts !== att || g.phase !== 'run') break;
              // 50 ms 씩 나눠 진행 (한 번에 실패 + 재시작을 건너뛰지 않게)
              let lt = g.levelTime();
              while (tau - lt > 0.01 && g.attempts === att && g.phase === 'run') { g.step(Math.min(50, tau - lt) / 1000); lt = g.levelTime(); }
              if (g.attempts !== att || g.phase !== 'run') { dbg.brk = [g.phase, g.levelTime(), tau]; break; }
              const kk = g.press(); if (dbg.kinds.length < 4) dbg.kinds.push(kk && kk.kind);
            }
            let guard = 0;
            while (g.attempts === att && g.phase !== 'fail' && g.phase !== 'cleared' && g.phase !== 'done' && g.state === 'play' && guard++ < 5000) g.step(0.02);
            if (g.attempts !== att) dbg.skipped = true;
            const h = g.history();
            const last = h[h.length - 1];
            attempts.push({ dbg, taps, clear: last.clear, failIndex: last.clear ? null : last.failIndex, reason: last.clear ? null : last.reason, progress: last.progress });
            if (last.clear) { cleared = true; break; }
            guard = 0;
            while (g.attempts === att && guard++ < 1000) g.step(0.02);
          }
          firstClear.push(cleared ? k : cap);
        }
        return { attempts, firstClear };
      }, { i, prof, sessions, seed: 1000 + i * 31 + sessions, cap, extraAfter: bal.bots.extra_tap_after_s, shows });
      // 시뮬레이터 대조 (같은 탭 → judge.mjs)
      let mm = 0;
      for (const a of r.attempts) {
        const j = judgeAttempt(CL[i], a.taps);
        const ok = j.clear === a.clear && (j.clear || (j.failIndex === a.failIndex && j.reason === a.reason));
        if (!ok) { mm++; if (out.notes.length < 10) out.notes.push({ level: id, name, dbg: a.dbg, taps0: [...a.taps].sort((x, y) => x - y).slice(0, 3), build: { clear: a.clear, failIndex: a.failIndex, reason: a.reason }, sim: { clear: j.clear, failIndex: j.failIndex, reason: j.reason } }); }
      }
      out.mismatch += mm; out.compared += r.attempts.length;
      const n = r.attempts.length, clears = r.attempts.filter((a) => a.clear).length;
      const fails = r.attempts.filter((a) => !a.clear);
      const failIdx = new Array(CL[i].stars.length).fill(0); for (const f of fails) failIdx[f.failIndex]++;
      const hist10 = new Array(10).fill(0); for (const f of fails) hist10[Math.min(9, Math.floor(f.progress * 10))]++;
      const capped = r.firstClear.filter((x) => x >= cap).length;
      out.levels[id][name] = {
        sessions, attempts: n, sim_mismatch: mm,
        clear_rate: +(clears / n).toFixed(4),
        median_first_clear: medLow(r.firstClear), p90_first_clear: [...r.firstClear].sort((a, b) => a - b)[Math.floor(r.firstClear.length * 0.9)], capped_sessions: capped, cap,
        mean_progress: +(100 * r.attempts.reduce((a, x) => a + (x.clear ? 1 : x.progress), 0) / n).toFixed(1),
        median_fail_progress: fails.length ? +(100 * medLow(fails.map((f) => f.progress))).toFixed(1) : null,
        early_fail_share: fails.length ? +(fails.filter((f) => f.reason === 'early').length / fails.length).toFixed(3) : 0,
        top_fail_star: fails.length ? failIdx.indexOf(Math.max(...failIdx)) : null,
        top_fail_star_share: fails.length ? +(Math.max(...failIdx) / fails.length).toFixed(3) : 0,
        fail_progress_hist10: hist10,
        seconds: Math.round((Date.now() - t0) / 1000),
      };
      console.log(`  bots L${id} ${name}: med ${out.levels[id][name].median_first_clear} cr ${out.levels[id][name].clear_rate} prog ${out.levels[id][name].mean_progress} mm ${mm}/${n} (${out.levels[id][name].seconds}s)`);
    }
  }
  await ctx.close();
  // 시뮬레이터 값: verify-levels 와 같은 runProfile (N 20000, 세션 2000) + 따라 치기 변형
  out.simulator = {};
  for (let i = 0; i < 10; i++) {
    const id = LV[i].id; out.simulator[id] = {};
    for (const [pn, pp] of Object.entries(PROF)) {
      const s = runProfile(CL[i], pp, bal, { N: 20000, sessions: 2000 });
      out.simulator[id][pn] = { clear_rate: s.clear_rate, median_first_clear: s.median_first_clear_sessions, p90_first_clear: s.p90_first_clear_sessions, mean_progress: s.mean_progress, median_fail_progress: s.median_fail_progress, early_fail_share: s.early_fail_share, top_fail_star: s.top_fail_star, top_fail_star_share: s.top_fail_star_share };
    }
    const sa = runProfile(CL[i], PROF.child_sd70, bal, { N: 20000, sessions: 2000, along: true });
    out.simulator[id].child_sd70_along = { clear_rate: sa.clear_rate, median_first_clear: sa.median_first_clear_sessions, mean_progress: sa.mean_progress };
  }
  out.compare_sd70 = Object.keys(out.levels).map((id) => ({ level: id, build_median: out.levels[id].child_sd70.median_first_clear, sim_median: out.simulator[id].child_sd70.median_first_clear, build_mean_progress: out.levels[id].child_sd70.mean_progress, sim_mean_progress: out.simulator[id].child_sd70.mean_progress, build_clear_rate: out.levels[id].child_sd70.clear_rate, sim_clear_rate: out.simulator[id].child_sd70.clear_rate, build_median_fail_progress: out.levels[id].child_sd70.median_fail_progress, sim_median_fail_progress: out.simulator[id].child_sd70.median_fail_progress }));
  return out;
}

// ---------------- perf ----------------
async function fpsWindow(p, ms) {
  await p.evaluate(() => { window.__qaFps = { t: [], on: true }; const f = (ts) => { if (!window.__qaFps.on) return; window.__qaFps.t.push(performance.now()); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await sleep(ms);
  const t = await p.evaluate(() => { window.__qaFps.on = false; return window.__qaFps.t; });
  const d = []; for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]);
  const total = t[t.length - 1] - t[0];
  const sorted = [...d].sort((a, b) => b - a), n1 = Math.max(1, Math.floor(d.length * 0.01));
  return { frames: d.length, avg_fps: r1((d.length / total) * 1000), low1_fps: r1(1000 / (sorted.slice(0, n1).reduce((a, b) => a + b, 0) / n1)), max_ms: r1(sorted[0]), over_33ms: d.filter((x) => x > 33.4).length };
}
async function partPerf() {
  const out = { runs: [], reaction: [] };
  const cases = [[1280, 720, 1], [412, 915, 3], [360, 640, 3], [640, 360, 3]];
  for (const [w, h, dsf] of cases) {
    const { ctx, p } = await open(w, h, '', { dsf });
    await enterNormal(p);
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    // 1) 레벨 시작 직후 10 s (실제 마우스로 레벨 1 진행)
    await G(p, () => window.__game.loadLevel(0));
    const mp = mousePlay(p, { maxAttempts: 1 });
    const fs = await fpsWindow(p, 10000);
    out.runs.push({ res: `${w}x${h}`, dpr: dsf, window: 'L1 start 0-10s (mouse play)', ...fs });
    await mp;
    // 2) 레벨 10 시작 + 실제 마우스
    await G(p, () => window.__game.loadLevel(9));
    const mp2 = mousePlay(p, { maxAttempts: 1 });
    const fs2 = await fpsWindow(p, 12000);
    out.runs.push({ res: `${w}x${h}`, dpr: dsf, window: 'L10 start 0-12s (mouse play)', ...fs2 });
    await G(p, () => window.__game.show('levels')); await mp2.catch(() => {});
    // 3) 무입력 실패 → 재시작 직후 (L7 첫 별 실패 ~ 재시작 뒤 3 s)
    await G(p, () => window.__game.loadLevel(6));
    await p.waitForFunction(() => window.__game.phase === 'fail', null, { timeout: 30000 });
    const fs3 = await fpsWindow(p, 4500);
    out.runs.push({ res: `${w}x${h}`, dpr: dsf, window: 'L7 fail → restart +3.4s', ...fs3 });
    // 4) 입력 → 다음 프레임 (스로틀 중, 따라 치기 중 실제 마우스 20회)
    await G(p, () => window.__game.loadLevel(1));
    await p.evaluate(() => { window.__qaReact = []; let pend = []; document.addEventListener('pointerdown', (e) => pend.push(e.timeStamp), true); const f = () => { const now = performance.now(); for (const t of pend) window.__qaReact.push(now - t); pend = []; requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await mousePlay(p, { maxAttempts: 1 }).catch(() => {});
    const re = await p.evaluate(() => window.__qaReact);
    out.reaction.push({ res: `${w}x${h}`, dpr: dsf, n: re.length, median_ms: r1(med(re)), max_ms: r1(Math.max(...re)), within_1_frame_share: +(re.filter((x) => x <= 16.7 * 1.05).length / re.length).toFixed(3), within_2_frames_share: +(re.filter((x) => x <= 33.4).length / re.length).toFixed(3) });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await ctx.close();
    console.log(`  perf ${w}x${h}@${dsf}: ${out.runs.slice(-3).map((r) => `${r.avg_fps}/${r.low1_fps}`).join(' ')} react ${out.reaction.slice(-1)[0].median_ms}`);
  }
  return out;
}

// ---------------- features ----------------
async function rafLogStart(p) {
  await p.evaluate(() => { window.__qaLog = []; const f = () => { const g = window.__game; window.__qaLog.push({ now: performance.now(), V: g.gameClock(), ph: g.phase, att: g.attempts, lt: g.levelTime(), st: g.state }); if (window.__qaLog.length < 20000) requestAnimationFrame(f); }; requestAnimationFrame(f); });
}
function restartFromLog(log, stars) {
  const run1 = log.find((x) => x.att === 1 && x.ph === 'run' && x.lt != null);
  const songStart = run1.V - run1.lt;
  const firstFail = log.find((x) => x.att === 1 && x.ph === 'fail');
  const failJudgeV = songStart + stars[0].passEnd;
  const moving = log.find((x) => x.att === 2 && x.ph === 'run' && x.lt > 0);
  return { failJudgeToFirstMovingFrameMs: r1(moving.V - failJudgeV), failJudgeToFirstFailFrameMs: r1(firstFail.V - failJudgeV), firstFailFrameToMovingFrameMs: r1(moving.now - firstFail.now), lastStillFrameLt: (() => { const i = log.indexOf(moving); return r1(log[i - 1].lt); })(), movingFrameLt: r1(moving.lt) };
}
async function partFeatures() {
  const out = {};
  // 1) 재시작 시간: 일반 모드 실시간 프레임 (L1·L5, 스로틀 없음 / 6배)
  out.restart = [];
  for (const [lvl, thr] of [[0, 1], [4, 1], [0, 6], [9, 1]]) {
    const { ctx, p } = await open(412, 915, '', { dsf: 1 });
    await enterNormal(p);
    let cdp = null; if (thr > 1) { cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: thr }); }
    await G(p, (i) => window.__game.loadLevel(i), lvl);
    await rafLogStart(p);
    await p.waitForFunction(() => window.__game.attempts >= 2 && window.__game.levelTime() > 300, null, { timeout: 40000 });
    const log = await G(p, () => window.__qaLog);
    const stars = await G(p, () => window.__game.stars());
    out.restart.push({ level: lvl + 1, cpu: thr, ...restartFromLog(log, stars) });
    await ctx.close();
  }
  // 2) 연습 모드 (test)
  {
    const { ctx, p } = await open(1280, 720);
    const lv = LV[2], c = CL[2];
    const cps = lv.sections.filter((s) => s.checkpoint).map((s) => ({ bar: s.start_bar, t: ((c.countInBars + s.start_bar) * c.beatsPerBar) * c.beatMs }));
    const cp2 = cps[1];
    const firstAfter = c.stars.findIndex((s) => s.t >= cp2.t);
    const r = await p.evaluate(({ cpT, firstAfter }) => {
      const g = window.__game; const res = {};
      g.loadLevel(2, { practice: true });
      const s = g.stars();
      for (const st of s.slice(0, firstAfter)) g.pressAt(st.t);
      // 체크포인트 쉬는 마디를 지나서 다음 별 놓침 → 실패
      let guard = 0; while (g.phase === 'run' && guard++ < 5000) g.step(0.01);
      res.failPhase = g.phase; res.failHist = g.history().slice(-1)[0];
      guard = 0; while (g.attempts < 2 && guard++ < 5000) g.step(0.004);
      res.afterRestart = { attempts: g.attempts, levelTime: g.levelTime(), progress: g.progress, expectProgress: firstAfter / s.length, cpT };
      for (const st of s.slice(firstAfter)) g.pressAt(st.t);
      guard = 0; while (g.state !== 'result' && guard++ < 2000) g.step(0.05);
      res.end = { state: g.state, summary: g.summary(), save: g.save() };
      return res;
    }, { cpT: cp2.t, firstAfter });
    const sv = r.end.save;
    out.practice = { checkpoint: cp2, firstStarAfter: firstAfter, ...r, ok: r.afterRestart.attempts === 2 && Math.abs(r.afterRestart.progress - r.afterRestart.expectProgress) < 1e-6 && Math.abs(r.afterRestart.levelTime - cp2.t) < 5 && r.end.state === 'result' && sv.levels['03']?.flag === true && !(sv.levels['03']?.grade > 0) && sv.unlocked >= 4 };
    delete out.practice.end.save; out.practice.saveL3 = sv.levels['03']; out.practice.unlocked = sv.unlocked;
    await ctx.close();
  }
  // 3) 해금·카드 1회·결과 버튼·손가락·저장 유지 (일반 모드, 실제 클릭)
  {
    const { ctx, p } = await open(412, 915, '');
    const u = {};
    await enterNormal(p, { viaUi: true });
    u.firstFlowState = await G(p, () => window.__game.state); // card (L1 첫 플레이)
    await p.mouse.click(206, 400); await p.waitForFunction(() => window.__game.state === 'play');
    // 손가락: 첫 별 직전 보임, 첫 별 판정 뒤 사라짐
    await p.waitForFunction(() => { const g = window.__game; return g.levelTime() > g.stars()[0].t - 250; }, null, { timeout: 20000 });
    u.handBeforeFirstStar = await G(p, () => !document.getElementById('tut').classList.contains('hidden'));
    await p.evaluate(() => window.__game.autoplay(0, 0)); // 일반 모드 autoplay → 결과
    u.handAfterClear = await G(p, () => !document.getElementById('tut').classList.contains('hidden'));
    u.result = await G(p, () => ({ state: window.__game.state, btns: [...document.querySelectorAll('#resultBtns button')].filter((b) => b.offsetParent !== null).map((b) => b.id) }));
    // 결과 버튼: 다시 → 같은 레벨, 카드 없음
    await p.click('#bRetry'); u.retry = await G(p, () => ({ state: window.__game.state, level: window.__game.levelIndex, attempts: window.__game.attempts }));
    await G(p, () => window.__game.autoplay(0, 0));
    await p.click('#bLevels'); u.levels = await G(p, () => window.__game.state);
    u.save1 = await G(p, () => { const s = window.__game.save(); return { unlocked: s.unlocked, l1: s.levels['01'] }; });
    // 잠긴 레벨 3 누름 → 그대로
    const cards = await p.$$('#grid .lplay');
    await cards[2].click(); u.lockedTap = await G(p, () => window.__game.state);
    // L1 다시 시작 → 카드 안 나옴
    await cards[0].click(); u.l1Again = await G(p, () => window.__game.state);
    await G(p, () => window.__game.show('levels'));
    // L2 처음 → 카드, 닫으면 플레이, 실패 재시작에도 카드 없음
    await (await p.$$('#grid .lplay'))[1].click(); u.l2First = await G(p, () => window.__game.state);
    await p.mouse.click(206, 400); await p.waitForFunction(() => window.__game.state === 'play');
    await p.waitForFunction(() => window.__game.attempts >= 2, null, { timeout: 40000 }); u.l2AfterFail = await G(p, () => ({ state: window.__game.state, attempts: window.__game.attempts }));
    // 카드 다시 보기 버튼 → 카드 → 레벨 선택
    await G(p, () => window.__game.show('levels'));
    const rb = await p.$$('#grid .lrow .ibtn'); // [L1 카드, L1 연습, L2 카드, L2 연습]
    await rb[0].click(); u.replayCard = await G(p, () => window.__game.state);
    await p.mouse.click(206, 400); u.replayClose = await G(p, () => window.__game.state);
    // L4(카드 없음) 연습 → 바로 플레이; 연습 클리어로 해금
    await G(p, () => { window.__game.loadLevel(1, { practice: true }); });
    await G(p, () => window.__game.autoplay(0, 0));
    u.practiceClear = await G(p, () => { const s = window.__game.save(); return { unlocked: s.unlocked, l2: s.levels['02'] }; });
    // 결과 다음 → L3 (카드 있음)
    await p.click('#bNext'); u.nextFromL2 = await G(p, () => ({ state: window.__game.state, level: window.__game.levelIndex }));
    // 새로고침 후 유지
    await G(p, () => window.__game.setOffset(-40));
    await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
    u.afterReload = await G(p, () => { const s = window.__game.save(); return { unlocked: s.unlocked, l1: s.levels['01'], l2: s.levels['02'], offsetMs: s.offsetMs, calibDone: s.calibDone, sound: s.sound }; });
    const vw = p.viewportSize();
    await p.mouse.click(vw.width / 2, vw.height * 0.6); u.titleTapAfterReload = await G(p, () => window.__game.state); // 보정 다시 안 뜸 → levels
    out.flow = u;
    out.flowChecks = {
      card_first_play: u.firstFlowState === 'card', hand_shown: u.handBeforeFirstStar === true, hand_hidden_after: u.handAfterClear === false,
      result_3_buttons: u.result.state === 'result' && u.result.btns.length === 3, retry_same_level: u.retry.state === 'play' && u.retry.level === 0,
      levels_btn: u.levels === 'levels', unlock_after_clear: u.save1.unlocked === 2, locked_ignored: u.lockedTap === 'levels', card_once_l1: u.l1Again === 'play',
      card_l2_first: u.l2First === 'card', no_card_on_restart: u.l2AfterFail.state === 'play', replay_card: u.replayCard === 'card' && u.replayClose === 'levels',
      practice_unlocks: u.practiceClear.unlocked === 3 && u.practiceClear.l2.flag === true && !(u.practiceClear.l2.grade > 0), next_goes_l3: u.nextFromL2.level === 2,
      persist: u.afterReload.unlocked === 3 && u.afterReload.l1.grade === 3 && u.afterReload.l1.cardSeen === true && u.afterReload.offsetMs === -40 && u.afterReload.l2.flag === true, no_recalib: u.titleTapAfterReload === 'levels',
    };
    await ctx.close();
  }
  // 4) 백그라운드 → 일시정지, 복귀는 탭 전까지 멈춤, 시도 수 유지, 오디오 멈춤
  {
    const { ctx, p } = await open(640, 360, '');
    await enterNormal(p);
    await G(p, () => window.__game.loadLevel(0));
    await sleep(2500);
    const before = await G(p, () => ({ lt: window.__game.levelTime(), att: window.__game.attempts }));
    // 같은 컨텍스트에 다른 탭을 앞으로 → 실제 visibilitychange 가 오는지
    const p2 = await ctx.newPage(); await p2.goto('about:blank'); await p2.bringToFront(); await sleep(400);
    const realHidden = await G(p, () => ({ hidden: document.hidden, state: window.__game.state }));
    // 강제 hidden (헤드리스에서 실제 탭 전환이 안 될 때 대비)
    await G(p, () => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(500);
    const onHide = await G(p, () => ({ state: window.__game.state, ctx: window.__qa.ctx && window.__qa.ctx.state, pausedBg: !document.getElementById('pausedBg').classList.contains('hidden') }));
    await shot(p, '640x360-pause-background.png');
    await G(p, () => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
    await p.bringToFront(); await sleep(1500);
    const onShow = await G(p, () => ({ state: window.__game.state, ctx: window.__qa.ctx && window.__qa.ctx.state }));
    await p.mouse.click(100, 300); await sleep(600);
    const afterTap = await G(p, () => ({ state: window.__game.state, att: window.__game.attempts, lt: window.__game.levelTime(), ctx: window.__qa.ctx && window.__qa.ctx.state }));
    out.background = { before, realTabSwitch: realHidden, onHide, onShow, afterTap, ok: onHide.state === 'pause' && onHide.pausedBg && onShow.state === 'pause' && afterTap.state === 'play' && afterTap.att === before.att };
    await ctx.close();
  }
  // 5) 음소거: 타이틀 소리 버튼 → 플레이 중 출력 RMS 0, 멈춤 화면 버튼으로 다시 켬
  {
    const { ctx, p } = await open(1280, 720, '');
    await enterNormal(p);
    await G(p, () => window.__game.loadLevel(0));
    await sleep(2500);
    const rmsOn = []; for (let k = 0; k < 20; k++) { rmsOn.push(await G(p, () => window.__qaRms())); await sleep(50); }
    await G(p, () => window.__game.show('title'));
    await p.click('#bSoundT');
    const saved = await G(p, () => window.__game.save().sound);
    await G(p, () => window.__game.loadLevel(0)); await sleep(2500);
    const rmsOff = []; for (let k = 0; k < 20; k++) { rmsOff.push(await G(p, () => window.__qaRms())); await sleep(50); }
    await p.click('#bPause'); await p.click('#bSoundP');
    const saved2 = await G(p, () => window.__game.save().sound);
    out.mute = { rmsOnMax: Math.max(...rmsOn), rmsOffMax: Math.max(...rmsOff), savedAfterMute: saved, savedAfterUnmute: saved2, ok: Math.max(...rmsOn) > 0.001 && Math.max(...rmsOff) < 1e-4 && saved === false && saved2 === true };
    await ctx.close();
  }
  // 6) 조작 종류: 화면 아무 곳 탭(pointerdown)·스페이스/엔터만. 길게 누름·드래그는 반응 없음 (test)
  {
    const { ctx, p } = await open(412, 915);
    const r = await p.evaluate(() => {
      const g = window.__game; g.loadLevel(0); const st = g.stars()[0];
      g.step((st.t - g.levelTime()) / 1000);
      const cv = document.getElementById('cv');
      const before = g.judgeLog().length;
      cv.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 10, clientY: 10 }));
      cv.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      const afterMove = g.judgeLog().length;
      cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, isPrimary: true }));
      const afterDown = g.judgeLog().length;
      return { before, afterMove, afterDown };
    });
    out.controls = { ...r, ok: r.before === 0 && r.afterMove === 0 && r.afterDown === 1 };
    await ctx.close();
  }
  return out;
}

// ---------------- calib (결정 9) ----------------
function refCalib(rounds, gc) {
  // balance.json guardian_calibration 문장 그대로의 독립 구현 (선형 보간 사분위)
  const q = (s, f) => { const p = (s.length - 1) * f, i = Math.floor(p); return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (p - i); };
  const iqr = (a) => { const s = [...a].sort((x, y) => x - y); return q(s, 0.75) - q(s, 0.25); };
  let retries = 0, k = 0, done = [];
  while (k < rounds.length) {
    const used = rounds[k++].slice(gc.use_from_tap - 1, gc.taps_per_round);
    if (iqr(used) > gc.reject_iqr_ms) { if (retries < gc.max_retries) { retries++; continue; } return { ok: false, why: 'iqr', consumed: k }; }
    done.push(used);
    if (done.length < gc.rounds) continue;
    if (Math.abs(med(done[0]) - med(done[1])) > gc.round_disagree_max_ms) { if (retries < gc.max_retries) { retries++; done = []; continue; } return { ok: false, why: 'disagree', consumed: k }; }
    const m = med(done.flat());
    return { ok: true, m, offset: Math.abs(m) <= gc.apply_only_if_abs_over_ms ? 0 : Math.max(gc.offset_clamp_ms[0], Math.min(gc.offset_clamp_ms[1], m)), consumed: k };
  }
  return { ok: false, why: 'incomplete', consumed: k };
}
function gaussRng(seed) { let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647); return () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }; }
async function partCalib() {
  const gc = bal.audio_latency.guardian_calibration;
  const out = { rule_cases: [], mouse: [] };
  // 1) 첫 실행: 타이틀 탭 → 자동 보정, 어른과 같이 그림, 건너뛰기 → 오프셋 0, 다음 실행엔 안 뜸
  {
    const { ctx, p } = await open(412, 915, '');
    const vw = p.viewportSize();
    await G(p, () => window.__game.setOffset(55)); // 건너뛰기가 0 으로 만드는지 보려고 미리 값
    await p.mouse.click(vw.width / 2, vw.height * 0.6);
    await p.waitForFunction(() => window.__game.state === 'calib');
    const first = await G(p, () => ({ together: !document.getElementById('together').classList.contains('hidden'), skip: !!document.getElementById('bSkip').offsetParent, ctx: window.__qa.ctx && window.__qa.ctx.state }));
    // 정지 화면: 탭 없이 2.4 s 동안 캔버스 해시가 바뀌지 않음 (소리는 박마다 남)
    await sleep(400);
    const hashes = [];
    for (let k = 0; k < 20; k++) { hashes.push(await G(p, () => { const u = document.getElementById('cv').toDataURL(); let h = 0; for (let i = 0; i < u.length; i += 3) h = (h * 31 + u.charCodeAt(i)) | 0; return h; })); await sleep(130); }
    const ticks = await G(p, () => window.__qa.starts.filter((s) => s.when > 0).length);
    await shot(p, '412x915-calib-first-run.png');
    await p.click('#bSkip');
    const afterSkip = await G(p, () => ({ state: window.__game.state, offset: window.__game.offset, calibDone: window.__game.save().calibDone }));
    await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
    await p.mouse.click(vw.width / 2, vw.height * 0.6);
    const second = await G(p, () => window.__game.state);
    // 설정에서 다시: 건너뛰기 = 이전 값 유지, 어른 그림 없음
    await G(p, () => window.__game.setOffset(150));
    await G(p, () => window.__game.show('calibRedo'));
    const redo = await G(p, () => ({ together: !document.getElementById('together').classList.contains('hidden') }));
    await p.click('#bSkip');
    const redoSkip = await G(p, () => ({ state: window.__game.state, offset: window.__game.offset }));
    out.firstRun = { first, staticCanvas: { distinctHashes: new Set(hashes).size, samples: hashes.length, seq: hashes.map((h) => hashes.indexOf(h)).join(''), ticksScheduled: ticks }, afterSkip, secondLaunchTitleTap: second, settingsRedo: { ...redo, ...redoSkip } };
    out.firstRunChecks = { auto_calib_on_first_run: true, together_picture: first.together, skip_visible: first.skip, skip_sets_0: afterSkip.offset === 0 && afterSkip.calibDone, skip_goes_to_l1: ['card', 'play'].includes(afterSkip.state), not_again: second === 'levels', static_screen: new Set(hashes).size === 1, redo_no_together: redo.together === false, redo_skip_keeps: redoSkip.offset === 150 && redoSkip.state === 'settings' };
    await ctx.close();
  }
  // 2) 계산 규칙: 테스트 훅 calibTap 으로 화면 흐름에 (탭-박) 값을 넣고 저장된 오프셋을 독립 구현과 비교
  {
    const { ctx, p } = await open(412, 915);
    const cases = [];
    const g40 = gaussRng(777);
    for (const X of [0, 120, 200]) for (let rep = 0; rep < 20; rep++) { const rounds = [0, 1].map(() => Array.from({ length: 8 }, () => X + g40() * 40)); cases.push({ name: `σ40 X=${X} #${rep}`, X, rounds }); }
    for (const X of [0, 120, 200]) for (let rep = 0; rep < 10; rep++) { const rounds = [0, 1, 2, 3].map(() => Array.from({ length: 8 }, () => X + g40() * 70)); cases.push({ name: `σ70(아이) X=${X} #${rep}`, X, rounds }); }
    cases.push({ name: '첫 2탭 무시', X: 120, rounds: [[900, -900, 120, 121, 119, 120, 122, 118], [-500, 500, 120, 120, 121, 119, 118, 122]] });
    cases.push({ name: '|m|=30 → 0', X: 30, rounds: [[0, 0, 30, 30, 30, 30, 30, 30], [0, 0, 30, 30, 30, 30, 30, 30]] });
    cases.push({ name: '|m|=31 → 31', X: 31, rounds: [[0, 0, 31, 31, 31, 31, 31, 31], [0, 0, 31, 31, 31, 31, 31, 31]] });
    cases.push({ name: '자름 350 → 300', X: 350, rounds: [[0, 0, 350, 350, 350, 350, 350, 350], [0, 0, 350, 350, 350, 350, 350, 350]] });
    cases.push({ name: '자름 -260 → -200', X: -260, rounds: [[0, 0, -260, -260, -260, -260, -260, -260], [0, 0, -260, -260, -260, -260, -260, -260]] });
    cases.push({ name: 'IQR 큼 1회 → 다시', X: 120, rounds: [[0, 0, -200, 300, -100, 400, 0, 200], [0, 0, 120, 120, 120, 120, 120, 120], [0, 0, 120, 120, 120, 120, 120, 120]] });
    cases.push({ name: 'IQR 큼 2회 → 이전 값 유지', X: null, rounds: [[0, 0, -200, 300, -100, 400, 0, 200], [0, 0, -200, 300, -100, 400, 0, 200]] });
    cases.push({ name: '두 회 차이 61 → 전체 다시 → 성공', X: 100, rounds: [[0, 0, 40, 40, 40, 40, 40, 40], [0, 0, 101, 101, 101, 101, 101, 101], [0, 0, 100, 100, 100, 100, 100, 100], [0, 0, 100, 100, 100, 100, 100, 100]] });
    cases.push({ name: '두 회 차이 2번 → 유지', X: null, rounds: [[0, 0, 40, 40, 40, 40, 40, 40], [0, 0, 101, 101, 101, 101, 101, 101], [0, 0, 40, 40, 40, 40, 40, 40], [0, 0, 101, 101, 101, 101, 101, 101]] });
    for (const c of cases) {
      const ref = refCalib(c.rounds, gc);
      const b = await p.evaluate((rounds) => {
        const g = window.__game; g.setOffset(-7); g.show('calibRedo');
        let n = 0; for (const r of rounds) for (const d of r) { const s = g.calibTap(d); n++; if (s.phase && s.phase !== 'tap') return { offset: g.offset, phase: s.phase, taps: n, sim: g.calibSimulate(rounds) }; }
        const s = g.calibTap(0); return { offset: g.offset, phase: s.phase || 'tap', taps: n, sim: g.calibSimulate(rounds) };
      }, c.rounds);
      const expectOffset = ref.ok ? ref.offset : -7;
      out.rule_cases.push({ name: c.name, X: c.X, ref, build: b, match: ref.why === 'incomplete' ? b.phase === 'tap' && b.offset === -7 : Math.abs(b.offset - expectOffset) < 1e-9 && (ref.ok ? b.phase === 'done' : b.phase === 'kept'), simMatch: b.sim.ok === ref.ok && (!ref.ok || Math.abs(b.sim.offset - ref.offset) < 1e-9) });
    }
    // bots.mjs 의 보정 모델(반올림 사분위)과 빌드(선형 보간) IQR 정의 차이가 결과를 바꾸는 비율
    const iqrRound = (a) => { const s = [...a].sort((x, y) => x - y); const qq = (f) => s[Math.min(s.length - 1, Math.max(0, Math.round(f * (s.length - 1))))]; return qq(0.75) - qq(0.25); };
    const iqrLin = (a) => { const s = [...a].sort((x, y) => x - y); const qq = (f) => { const pp = (s.length - 1) * f, i = Math.floor(pp); return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (pp - i); }; return qq(0.75) - qq(0.25); };
    let diff = 0; const gg = gaussRng(4242); const N = 20000;
    for (let k = 0; k < N; k++) { const used = Array.from({ length: 6 }, () => gg() * 70); if ((iqrRound(used) > 150) !== (iqrLin(used) > 150)) diff++; }
    out.iqrDefinitionDiffShare_sd70 = +(diff / N).toFixed(4);
    await ctx.close();
  }
  // 3) 실제 마우스 보정 (일반 모드, 오디오 켜짐): 들리는 박(예약 시각 + 자동 지연) + X ms 에 누름 → 결과 오프셋
  for (const X of [0, 120, 200]) {
    const { ctx, p } = await open(412, 915, '');
    const vw = p.viewportSize();
    await p.mouse.click(vw.width / 2, vw.height * 0.6);
    await p.waitForFunction(() => window.__game.state === 'calib');
    const enterCt = await G(p, () => window.__qa.ctx ? window.__qa.ctx.currentTime : null);
    await sleep(900);
    const sched = await G(p, (enterCt) => {
      const ctx = window.__qa.ctx; const lat = window.__game.latency().auto;
      const ws = [...new Set(window.__qa.starts.map((s) => Math.round(s.when * 1e6) / 1e6))].filter((w) => w > enterCt + 0.3).sort((a, b) => a - b);
      let off = -1e9; for (let k = 0; k < 40; k++) off = Math.max(off, ctx.currentTime - performance.now() / 1000);
      return { first: ws[0], ws: ws.slice(0, 4), lat, off, ots: ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null, ct: ctx.currentTime, pn: performance.now() };
    }, enterCt);
    // 박 k 의 들리는 시각(page perf ms) = (first + k·0.6 + lat/1000 - off)·1000
    const beat = 60 / gc.bpm;
    const cm = await clockMap(p);
    const tapPerf = [];
    const nowCt = await G(p, () => window.__qa.ctx.currentTime);
    let k0 = Math.ceil((nowCt - sched.first) / beat) + 1;
    for (let n = 0; n < 16; n++) {
      const k = k0 + n;
      const heardPerf = (sched.first + k * beat + sched.lat / 1000 - sched.off) * 1000;
      const target = heardPerf + X - cm.d;
      const wait = target - performance.now();
      if (wait > 25) await sleep(wait - 20);
      while (performance.now() < target) {}
      await p.mouse.down(); await p.mouse.up();
      tapPerf.push(heardPerf);
      const ph = await G(p, () => window.__game.state);
      if (ph !== 'calib') break;
    }
    await sleep(300);
    const res = await G(p, () => ({ state: window.__game.state, offset: window.__game.offset, taps: window.__qa.taps.slice(-16), live: document.getElementById('calibLive').textContent }));
    // 실제 이벤트 timeStamp 기준 (탭 - 들리는 박)
    const diffs = res.taps.slice(-tapPerf.length).map((t, i) => t - tapPerf[i]);
    const used = [...diffs.slice(2, 8), ...diffs.slice(10, 16)];
    const expect = Math.abs(med(used)) <= gc.apply_only_if_abs_over_ms ? 0 : med(used);
    out.mouse.push({ X, offset: r1(res.offset), expectFromEventTimestamps: r1(expect), tapDiffMedian: r1(med(diffs)), tapDiffRange: [r1(Math.min(...diffs)), r1(Math.max(...diffs))], autoLatencyMs: r1(sched.lat), state: res.state, ok: Math.abs(res.offset - expect) <= 10 });
    console.log(`  calib mouse X=${X}: offset ${r1(res.offset)} expect ${r1(expect)}`);
    await ctx.close();
  }
  // 4) 보호자 문: 짧게·1.9 s·2.1 s, 고리 비움 0.2 s, 플레이 화면에 설정 없음
  {
    const { ctx, p } = await open(640, 360);
    await G(p, () => window.__game.show('levels'));
    const b = await p.locator('#bGate').boundingBox();
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    await p.mouse.move(cx, cy);
    const ringVis = () => G(p, () => !document.getElementById('gateRing').classList.contains('hidden'));
    await p.mouse.down(); await sleep(80); await p.mouse.up(); await sleep(100);
    const tap = { state: await G(p, () => window.__game.state), ring: await ringVis() };
    await sleep(700); tap.ringAfter800 = await ringVis();
    await p.mouse.down(); await sleep(1900); const s19 = await G(p, () => window.__game.state); await p.mouse.up();
    await sleep(100); const drain100 = await G(p, () => document.getElementById('gateArc').getAttribute('stroke-dasharray'));
    await sleep(250); const drain350 = await G(p, () => document.getElementById('gateArc').getAttribute('stroke-dasharray'));
    await sleep(700);
    // 정확한 문턱: 누른 뒤 상태가 settings 로 바뀌는 시각
    await p.mouse.down(); const t0 = await G(p, () => performance.now());
    await p.waitForFunction(() => window.__game.state === 'settings', null, { timeout: 5000, polling: 'raf' });
    const t1 = await G(p, () => performance.now()); await p.mouse.up();
    // 플레이 화면
    await G(p, () => window.__game.loadLevel(0));
    const playBtns = await G(p, () => [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null).map((b) => b.id));
    out.gate = { tap, hold1900: s19, drainAfter100ms: drain100, drainAfter350ms: drain350, openedAfterMs: r1(t1 - t0), playScreenButtons: playBtns, ok: tap.state === 'levels' && tap.ring && !tap.ringAfter800 && s19 === 'levels' && t1 - t0 >= 1990 && t1 - t0 < 2150 && !playBtns.includes('bGate') };
    await ctx.close();
  }
  // 5) 모래시계 표지: A 오프셋 > 100 / B 자동 지연 ≥ 100 / B' 보정 때보다 40 넘게 바뀜 / C 밀림, 위치, 플레이 화면 없음, 3세션, 보정하면 해제, 오프셋 자동 변경 없음
  {
    const badge = (p) => G(p, () => ({ state: window.__game.state, gate: !document.getElementById('gateBadge').classList.contains('hidden') && !!document.getElementById('gateBadge').offsetParent, row: !document.getElementById('calibBadge').classList.contains('hidden') && !!document.getElementById('calibBadge').offsetParent, anyVisibleBadgeImg: [...document.querySelectorAll('img')].filter((i) => /hourglass/.test(i.src) && i.offsetParent !== null && !i.classList.contains('hidden')).length }));
    const H = {};
    // A: 오프셋 120 → 세션 1~4
    {
      const { ctx, p } = await open(640, 360);
      await G(p, () => { window.__game.setOffset(120); window.__game.show('levels'); });
      H.A = [await badge(p)];
      await G(p, () => window.__game.show('settings')); H.A_settings = await badge(p);
      await G(p, () => window.__game.loadLevel(0)); H.A_play = await badge(p);
      await G(p, () => window.__game.show('pause')); H.A_pause = await badge(p);
      for (let s = 2; s <= 4; s++) { await p.reload(); await p.waitForFunction(() => window.__game?.ready === true); await G(p, () => window.__game.show('levels')); H.A.push(await badge(p)); }
      // 표지를 눌러도 설정이 열리지 않음
      const bb = await p.locator('#gateBadge').boundingBox().catch(() => null);
      await ctx.close();
    }
    // A 경계: 오프셋 100 은 표지 없음
    { const { ctx, p } = await open(640, 360); await G(p, () => { window.__game.setOffset(100); window.__game.show('levels'); }); H.A_100 = await badge(p); await ctx.close(); }
    // B: outputLatency 0.15 s (일반 모드, 오디오 켜짐)
    {
      const { ctx, p } = await open(640, 360, '', { init: { fn: () => { try { localStorage.setItem('qaLat', '0.15'); } catch {} }, arg: null } });
      await enterNormal(p); await G(p, () => window.__game.show('levels'));
      H.B = { ...(await badge(p)), lat: await G(p, () => window.__game.latency()) };
      await G(p, () => window.__game.loadLevel(0)); H.B_play = await badge(p);
      await ctx.close();
    }
    // B': 보정 때 0.02 s → 다음 실행 0.08 s (변화 60 > 40)
    {
      const { ctx, p } = await open(640, 360, '', { init: { fn: () => { try { if (!sessionStorage.getItem('qaRun')) { sessionStorage.setItem('qaRun', '1'); localStorage.setItem('qaLat', '0.02'); } else localStorage.setItem('qaLat', '0.08'); } catch {} }, arg: null } });
      const vw = p.viewportSize();
      await p.mouse.click(vw.width / 2, vw.height * 0.6); await p.waitForFunction(() => window.__game.state === 'calib');
      await G(p, () => { const g = window.__game; for (let r = 0; r < 2; r++) for (let k = 0; k < 8; k++) g.calibTap(5); });
      const calSave = await G(p, () => window.__game.save());
      await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
      await p.mouse.click(vw.width / 2, vw.height * 0.6); await sleep(300);
      H.B2 = { ...(await badge(p)), calibAutoLat: calSave.calibAutoLat, nowLat: await G(p, () => window.__game.latency().auto) };
      await ctx.close();
    }
    // C: 밀림 감지 (+100 ms 탭, 시도 3번째) → 표지, 오프셋 그대로, 보정하면 해제
    {
      const { ctx, p } = await open(640, 360);
      const r = await p.evaluate(() => {
        const g = window.__game; g.setOffset(0); g.loadLevel(0);
        const s = g.stars(); const res = [];
        for (let a = 0; a < 4; a++) {
          const att = g.attempts;
          for (const st of s.slice(0, 9)) { if (g.attempts !== att) break; g.pressAt(st.t + 100); }
          let guard = 0; while (g.attempts === att && guard++ < 3000) g.step(0.02);
          res.push({ attempt: att, drift: JSON.parse(JSON.stringify(g.lateHint().drift)) });
        }
        return { res, offset: g.offset };
      });
      await G(p, () => window.__game.show('levels'));
      H.C = { ...(await badge(p)), steps: r.res.map((x) => ({ attempt: x.attempt, windows: x.drift.windows, triggered: x.drift.triggered })), offsetAfter: r.offset };
      await G(p, () => { const g = window.__game; g.show('calibRedo'); for (let k = 0; k < 16; k++) g.calibTap(4); g.step(1.5); g.show('levels'); });
      H.C_afterCalib = { ...(await badge(p)), save: await G(p, () => window.__game.save().late) };
      await ctx.close();
    }
    out.lateHint = H;
    out.lateChecks = {
      A_shows_levels_and_settings: H.A[0].gate && H.A_settings.row,
      not_on_play_or_pause: H.A_play.anyVisibleBadgeImg === 0 && H.A_pause.anyVisibleBadgeImg === 0 && H.B_play.anyVisibleBadgeImg === 0,
      three_sessions_then_hidden: H.A[0].gate && H.A[1].gate && H.A[2].gate && !H.A[3].gate,
      A_threshold_100_no_badge: !H.A_100.gate,
      B_latency_150: H.B.gate,
      B_change_over_40: H.B2.gate,
      C_drift_badge: H.C.gate, C_offset_unchanged: H.C.offsetAfter === 0, cleared_by_calibration: !H.C_afterCalib.gate,
    };
  }
  return out;
}

// ---------------- 실행 ----------------
const parts = { static: async () => partStatic(), shots: partShots, replay: partReplay, realtime: partRealtime, bots: partBots, perf: partPerf, features: partFeatures, calib: partCalib };
const list = PART === 'all' ? Object.keys(parts) : PART.split(',');
for (const name of list) {
  const t0 = Date.now();
  LOG.console = []; LOG.pageerrors = []; LOG.failed = []; LOG.external = []; LOG.requests = 0;
  console.log(`[${name}] 시작`);
  let res;
  try {
    if (name !== 'static' && !browser) await startAll();
    res = await parts[name]();
  } catch (e) { res = { error: String(e && e.stack || e) }; console.log(`[${name}] 오류`, e); }
  res.log = name === 'static' ? undefined : JSON.parse(JSON.stringify(LOG));
  res.seconds = Math.round((Date.now() - t0) / 1000);
  res.env = { channel: CHANNEL, playwright: process.env.PLAYWRIGHT_CORE ? 'PLAYWRIGHT_CORE' : 'module', node: process.version };
  writeFileSync(join(PARTS, `${name}.json`), JSON.stringify(res, null, 1));
  console.log(`[${name}] 끝 ${res.seconds}s, console ${LOG.console.length + LOG.pageerrors.length}, failed ${LOG.failed.length}, external ${LOG.external.length}`);
}
await stopAll();
process.exit(0);
