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
//   --- round-2 추가 ---
//   signals   M1: 화면 프레임(캔버스 픽셀)으로 북채·손가락 보임 판정 — 북채만/손가락만 빼고 다시 그린 프레임과의 픽셀 차.
//             사라짐·등장 시각 = judge.mjs malletSchedule·20-balance 6-4 표, 동시 표시 0 (4해상도 L1 + 412x915 10레벨, 일반 모드 실시간 L1)
//   cards     M4: notext 카드 5장 × 4해상도 스크린샷 픽셀에서 공·별 지름(px), 플레이 화면 공·별 px
//   r2        round-1 이슈 회귀(N1·N2·N5·N6·N7·N9·N11·N12·N13~N16·N17) + aria R8(숫자 붙임·키 사용)
//   perfctl   M2 원인 판별용 대조 페이지(게임 코드 없음, rAF + 캔버스 + AudioContext)를 같은 6배 스로틀·새 브라우저에서 잼
//   firstrun  (round-2 1-6) 빈 저장소 → 실제 UI 첫 실행 보정 → L1, 들리는 박 = 예약 + 탭 순간 autoNow 기준 보정 오차·이중 보정, σ70 봇 영향 (--part all 에 안 들어감)
//   옵션: --port N (기본 8380~8399 무작위, rhythm-01 팀 대역), --perf-runs N (perf·perfctl 을 새 브라우저로 N번), --perf-tag 이름 (parts/perf-<이름>.json),
//         --perf-order 1280x720,412x915,... (창 순서 바꾸기), --perf-delay ms (오디오 시작 뒤 레벨 1 전에 기다림)
// 콘솔·네트워크 로그는 모든 파트에서 모아 parts/<파트>.json 의 log 에 넣는다. 서버 PID 는 parts/pids.log 에 적고 자기 것만 종료한다.
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, join, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { compileLevel, judgeAttempt, malletSchedule } from './sim/judge.mjs';
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
  // QA 계측이 낸 경고(signals 파트의 getImageData 반복 읽기)는 빌드 경고가 아니므로 따로 적음
  const qaCaused = (s) => /willReadFrequently/.test(s);
  m.basic = {
    console_errors_warnings: logs.flatMap((l) => [...l.console, ...l.pageerrors]).filter((s) => !qaCaused(s)),
    console_qa_instrumentation_warnings: logs.flatMap((l) => l.console).filter(qaCaused).length,
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
    // round-2
    perf_6x: P.perf && P.perf.summary, perf_control_page: P.perfctl && P.perfctl.summary,
    perf_variants: Object.fromEntries(Object.keys(P).filter((k) => /^perf-/.test(k)).map((k) => [k, P[k].summary])),
    signals_m1: P.signals && { ...P.signals.summary, windows_ok_frame_tolerance: (() => { const ws = [...P.signals.l1_res, ...P.signals.levels].flatMap((r) => r.windows); const ok = ws.filter((w) => w.pixelFirst != null && Math.abs(w.pixelFirst - w.from) <= 1.5 && w.pixelLast < w.gone && w.gone - w.pixelLast <= 1000 / 60 && (w.nextZone == null || w.pixelLast < w.nextZone)); return `${ok.length}/${ws.length} (첫 보임 = 등장 ±1.5 ms, 마지막 보임 < 사라짐·1프레임 안, 다음 별 놓침 구역 전)`; })(), max_gone_minus_last_visible_ms: Math.max(...[...P.signals.l1_res, ...P.signals.levels].flatMap((r) => r.windows).map((w) => +(w.gone - w.pixelLast).toFixed(1))) }, cards_m4: P.cards && P.cards.summary, r2_checks: P.r2 && P.r2.checks,
    calib_definition_crosscheck: P.calib && P.calib.calibDefinitionCrossCheck && { cases: P.calib.calibDefinitionCrossCheck.cases, sim_vs_build_diff: P.calib.calibDefinitionCrossCheck.sim_vs_build_diff, build_vs_qa_ref_diff: P.calib.calibDefinitionCrossCheck.build_vs_qa_ref_diff },
  };
  // 시뮬레이터 전체 실행(B6 판정 원천)·소리 크기 렌더 결과 (같은 폴더의 원자료)
  try { const v = JSON.parse(readFileSync(join(PARTS, 'verify-levels.json'), 'utf8')); m.summary.verify_levels_full = { fails: v.fails.length, checks: Object.values(v.levels).reduce((a, l) => a + l.checks.length, 0), l10_target: v.l10_target, curve: v.curve_summary }; delete m.parts['verify-levels']; } catch {}
  try { const t = readFileSync(join(PARTS, 'sound-check.txt'), 'utf8'); m.summary.sound_check_render = t.split('\n').filter((l) => /dB \(기준|sound-check|멜로디 음/.test(l)); } catch {}
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
  if (existsSync(join(PROJ, 'assets/sound.json'))) {
    // build-web-data.mjs 가 원본을 sound.json(master·noise_buffer_s·sounds·parts) / music.json(levels·calib_check_hz·melody)으로 나눠 복사
    const A = JSON.parse(readFileSync(join(PROJ, 'assets/sound.json'), 'utf8')), Bs = JSON.parse(readFileSync(join(GAME, 'data/sound.json'), 'utf8')), Bm = JSON.parse(readFileSync(join(GAME, 'data/music.json'), 'utf8'));
    const j = JSON.stringify;
    same.push({ file: 'assets/sound.json → data/sound.json (master·noise·sounds·parts)', equal: ['master', 'noise_buffer_s', 'sounds', 'parts'].every((k) => j(A[k]) === j(Bs[k])) });
    same.push({ file: 'assets/sound.json music → data/music.json (levels·calib_check_hz·melody)', equal: ['levels', 'calib_check_hz', 'melody'].every((k) => j(A.music[k]) === j(Bm[k])), calib_check_hz: Bm.calib_check_hz });
  }
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
// 포트: rhythm-01 팀 대역 8300~8399 중 QA 몫 8380~8399 (game-developer 8300~8379)
const PORT = +opt('--port', 8380 + Math.floor(Math.random() * 20));
if (PORT < 8300 || PORT > 8399) { console.error('포트는 rhythm-01 대역 8300~8399 만'); process.exit(2); }
const BASE = `http://localhost:${PORT}/games/rhythm-01/`;
let server, browser;
const LOG = { console: [], pageerrors: [], failed: [], external: [], requests: 0 };
const pidLog = (s) => { try { writeFileSync(join(PARTS, 'pids.log'), `${new Date().toISOString()} ${s}\n`, { flag: 'a' }); } catch {} };
async function launchBrowser() {
  browser = await pw.chromium.launch({ channel: CHANNEL, headless: true });
  return browser;
}
async function startAll() {
  pw = await loadPW();
  server = spawn(process.execPath, [join(PROJ, 'tools/serve.mjs'), String(PORT)], { stdio: 'ignore' });
  pidLog(`serve.mjs pid ${server.pid} port ${PORT} (qa-round pid ${process.pid})`);
  process.on('exit', () => { try { server.kill(); } catch {} });
  for (let k = 0; k < 80; k++) { try { if ((await fetch(BASE)).ok) break; } catch {} await sleep(100); }
  await launchBrowser();
}
async function stopAll() { try { await browser.close(); } catch {} try { server.kill(); pidLog(`serve.mjs pid ${server.pid} 종료`); } catch {} }

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
  // round-2: AudioContext 만든 시각, long-animation-frame 기록, 1000~1100 Hz 음 높이 기록(보정 체크 방울 1046.5 Hz)
  window.__qa.ctxAt = null; window.__qa.loaf = []; window.__qa.freqs = [];
  try {
    const AC0 = window.AudioContext;
    window.AudioContext = new Proxy(AC0, { construct(t, a, nt) { const c = Reflect.construct(t, a, nt); if (window.__qa.ctxAt == null) window.__qa.ctxAt = performance.now(); return c; } });
  } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { const q = window.__qa.loaf; if (q.length < 3000) q.push({ start: e.startTime, dur: e.duration, block: e.blockingDuration, render: e.renderStart, style: e.styleAndLayoutStart, scripts: (e.scripts || []).reduce((a, s) => a + s.duration, 0), top: (e.scripts || []).slice(0, 2).map((s) => `${s.invoker || ''}:${(s.sourceURL || '').split('/').pop()}:${Math.round(s.duration)}`) }); } }).observe({ type: 'long-animation-frame', buffered: true }); } catch {}
  if ((() => { try { return localStorage.getItem('qaFreq'); } catch { return null; } })()) try {
    const rec = (v) => { if (v >= 1000 && v <= 1100 && window.__qa.freqs.length < 500) window.__qa.freqs.push({ v, at: performance.now() }); };
    const svt = AudioParam.prototype.setValueAtTime; AudioParam.prototype.setValueAtTime = function (v, t) { rec(v); return svt.call(this, v, t); };
    const d = Object.getOwnPropertyDescriptor(AudioParam.prototype, 'value');
    Object.defineProperty(AudioParam.prototype, 'value', { configurable: true, get() { return d.get.call(this); }, set(v) { rec(v); d.set.call(this, v); } });
  } catch {}
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
  // round-2: 25 ms 넘는 프레임마다 창 시작 기준 시각·AudioContext 생성 뒤 시각·겹치는 long-animation-frame(스크립트·blocking)
  const extra = await p.evaluate((t0) => ({ ctxAt: window.__qa.ctxAt, loaf: window.__qa.loaf.filter((e) => e.start + e.dur >= t0 - 1) }), t[0]);
  const long = [];
  for (let i = 1; i < t.length; i++) {
    const dd = t[i] - t[i - 1];
    if (dd <= 25) continue;
    const lo = extra.loaf.filter((e) => e.start < t[i] && e.start + e.dur > t[i - 1]);
    long.push({ ms: r1(dd), atWindowMs: r1(t[i - 1] - t[0]), sinceAudioCtxMs: extra.ctxAt == null ? null : r1(t[i - 1] - extra.ctxAt), loaf: lo.map((e) => ({ dur: r1(e.dur), block: r1(e.block), scripts: r1(e.scripts), top: e.top })) });
  }
  const low1Without = (k) => { const s = sorted.slice(k), m = Math.max(1, Math.floor((d.length - k) * 0.01)); return r1(1000 / (s.slice(0, m).reduce((a, b) => a + b, 0) / m)); };
  return { frames: d.length, avg_fps: r1((d.length / total) * 1000), low1_fps: r1(1000 / (sorted.slice(0, n1).reduce((a, b) => a + b, 0) / n1)), max_ms: r1(sorted[0]), second_max_ms: r1(sorted[1]), over_33ms: d.filter((x) => x > 33.4).length, over_25ms: d.filter((x) => x > 25).length, low1_without_longest_fps: low1Without(1), long_frames: long.slice(0, 20), windowStartSinceAudioCtxMs: extra.ctxAt == null ? null : r1(t[0] - extra.ctxAt) };
}
async function partPerf() {
  const out = { runs: [], reaction: [], meta: {} };
  const ALL = { '1280x720': [1280, 720, 1], '412x915': [412, 915, 3], '360x640': [360, 640, 3], '640x360': [640, 360, 3] };
  const order = opt('--perf-order', '1280x720,412x915,360x640,640x360').split(',');
  const cases = order.map((k) => ALL[k]);
  const RUNS = +opt('--perf-runs', '1'), DELAY = +opt('--perf-delay', '0');
  out.meta = { runs: RUNS, order, delayMs: DELAY, freshBrowserPerRun: true, throttle: 6 };
  for (let run = 1; run <= RUNS; run++) {
  if (run > 1) { try { await browser.close(); } catch {} await launchBrowser(); }
  for (const [w, h, dsf] of cases) {
    const { ctx, p } = await open(w, h, '', { dsf });
    await enterNormal(p);
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    if (DELAY > 0) await sleep(DELAY);
    // 1) 레벨 시작 직후 10 s (실제 마우스로 레벨 1 진행)
    await G(p, () => window.__game.loadLevel(0));
    const mp = mousePlay(p, { maxAttempts: 1 });
    const fs = await fpsWindow(p, 10000);
    out.runs.push({ run, res: `${w}x${h}`, dpr: dsf, window: 'L1 start 0-10s (mouse play)', ...fs });
    await mp;
    // 2) 레벨 10 시작 + 실제 마우스
    await G(p, () => window.__game.loadLevel(9));
    const mp2 = mousePlay(p, { maxAttempts: 1 });
    const fs2 = await fpsWindow(p, 12000);
    out.runs.push({ run, res: `${w}x${h}`, dpr: dsf, window: 'L10 start 0-12s (mouse play)', ...fs2 });
    await G(p, () => window.__game.show('levels')); await mp2.catch(() => {});
    // 3) 무입력 실패 → 재시작 직후 (L7 첫 별 실패 ~ 재시작 뒤 3 s)
    await G(p, () => window.__game.loadLevel(6));
    await p.waitForFunction(() => window.__game.phase === 'fail', null, { timeout: 30000 });
    const fs3 = await fpsWindow(p, 4500);
    out.runs.push({ run, res: `${w}x${h}`, dpr: dsf, window: 'L7 fail → restart +3.4s', ...fs3 });
    // 4) 입력 → 다음 프레임 (스로틀 중, 따라 치기 중 실제 마우스 20회)
    await G(p, () => window.__game.loadLevel(1));
    await p.evaluate(() => { window.__qaReact = []; let pend = []; document.addEventListener('pointerdown', (e) => pend.push(e.timeStamp), true); const f = () => { const now = performance.now(); for (const t of pend) window.__qaReact.push(now - t); pend = []; requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await mousePlay(p, { maxAttempts: 1 }).catch(() => {});
    const re = await p.evaluate(() => window.__qaReact);
    out.reaction.push({ run, res: `${w}x${h}`, dpr: dsf, n: re.length, median_ms: r1(med(re)), max_ms: r1(Math.max(...re)), within_1_frame_share: +(re.filter((x) => x <= 16.7 * 1.05).length / re.length).toFixed(3), within_2_frames_share: +(re.filter((x) => x <= 33.4).length / re.length).toFixed(3) });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await ctx.close();
    console.log(`  perf run${run} ${w}x${h}@${dsf}: ${out.runs.slice(-3).map((r) => `${r.avg_fps}/${r.low1_fps}(max ${r.max_ms})`).join(' ')} react ${out.reaction.slice(-1)[0].median_ms}`);
  }
  }
  out.summary = { windows: out.runs.length, low1_ge45: out.runs.filter((r) => r.low1_fps >= 45).length, avg_ge55: out.runs.filter((r) => r.avg_fps >= 55).length, per_run: [...new Set(out.runs.map((r) => r.run))].map((k) => ({ run: k, low1_ge45: out.runs.filter((r) => r.run === k && r.low1_fps >= 45).length + '/' + out.runs.filter((r) => r.run === k).length, fails: out.runs.filter((r) => r.run === k && r.low1_fps < 45).map((r) => `${r.res} ${r.window.split(' ').slice(0, 2).join(' ')} ${r.low1_fps} (max ${r.max_ms} ms)`) })) };
  return out;
}

// ---------------- perfctl (게임 코드 없는 대조 페이지) ----------------
// 같은 서버 출처의 가상 경로를 page.route 로 채움(파일을 만들지 않음). 6배 스로틀, 새 브라우저 첫 컨텍스트, 클릭으로 AudioContext 생성(게임과 같은 순서),
// rAF 마다 캔버스에 원 몇 개를 그림. audio=false 변형은 클릭만 하고 AudioContext 를 만들지 않음.
async function partPerfCtl() {
  const out = { runs: [] };
  const RUNS = +opt('--perf-runs', '3');
  const HTML = `<!doctype html><meta charset="utf-8"><title>qa-control</title><body style="margin:0;background:#29230F"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');function rs(){const d=Math.min(3,devicePixelRatio||1);c.width=innerWidth*d;c.height=innerHeight*d;c.style.width=innerWidth+'px';c.style.height=innerHeight+'px';g.setTransform(d,0,0,d,0,0);}rs();
function f(t){requestAnimationFrame(f);g.fillStyle='#29230F';g.fillRect(0,0,innerWidth,innerHeight);const R=Math.min(innerWidth,innerHeight)*0.3,a=t/1000*2;g.strokeStyle='#493F22';g.lineWidth=10;g.beginPath();g.arc(innerWidth/2,innerHeight/2,R,0,7);g.stroke();g.fillStyle='#7FE3FF';g.beginPath();g.arc(innerWidth/2+R*Math.cos(a),innerHeight/2+R*Math.sin(a),12,0,7);g.fill();}
requestAnimationFrame(f);
document.addEventListener('pointerdown',()=>{if(window.__ctl)return;window.__ctl=1;if(location.hash==='#noaudio')return;const ac=new AudioContext();const o=ac.createOscillator(),gn=ac.createGain();gn.gain.value=0.0001;o.connect(gn);gn.connect(ac.destination);o.start();window.__ac=ac;});
</script>`;
  for (let run = 1; run <= RUNS; run++) {
    for (const audio of [true, false]) {
      try { await browser.close(); } catch {} await launchBrowser();
      for (const [w, h, dsf] of [[1280, 720, 1], [412, 915, 3]]) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf });
        await ctx.addInitScript(PROBE);
        const p = await ctx.newPage();
        await p.route(`http://localhost:${PORT}/qa-control.html`, (r) => r.fulfill({ contentType: 'text/html', body: HTML }));
        await p.goto(`http://localhost:${PORT}/qa-control.html${audio ? '' : '#noaudio'}`);
        await sleep(300);
        await p.mouse.click(w / 2, h * 0.6);
        await p.waitForFunction(() => !window.__ac || window.__ac.state === 'running', null, { timeout: 5000 }).catch(() => {});
        const cdp = await ctx.newCDPSession(p);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
        const fs = await fpsWindow(p, 10000);
        out.runs.push({ run, audio, res: `${w}x${h}`, dpr: dsf, contextInBrowser: w === 1280 ? 1 : 2, ...fs });
        console.log(`  perfctl run${run} audio=${audio} ${w}x${h}: ${fs.avg_fps}/${fs.low1_fps} max ${fs.max_ms}`);
        await ctx.close();
      }
    }
  }
  out.summary = { first_context_audio_low1: out.runs.filter((r) => r.audio && r.contextInBrowser === 1).map((r) => r.low1_fps), first_context_noaudio_low1: out.runs.filter((r) => !r.audio && r.contextInBrowser === 1).map((r) => r.low1_fps), second_context_audio_low1: out.runs.filter((r) => r.audio && r.contextInBrowser === 2).map((r) => r.low1_fps), second_context_noaudio_low1: out.runs.filter((r) => !r.audio && r.contextInBrowser === 2).map((r) => r.low1_fps) };
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
    // round-2 (N3·R4): 시뮬레이터 tools/sim/calib.mjs simulate = 빌드 js/calib.js simulate = QA 독립 구현, 무작위 4회분 3000묶음
    {
      const simC = await import(pathToFileURL(join(PROJ, 'tools/sim/calib.mjs')).href);
      const bSrc = readFileSync(join(GAME, 'js/calib.js'), 'utf8');
      const bldC = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(bSrc));
      const gr = gaussRng(9090); let dSim = 0, dRef = 0; const n = 3000; const samples = [];
      for (let k = 0; k < n; k++) {
        const sd = [20, 40, 70, 120][k % 4], X = (k % 7) * 40 - 60;
        const rounds = [0, 1, 2, 3].map(() => Array.from({ length: 8 }, () => X + gr() * sd));
        const a = simC.simulate(rounds, gc), b = bldC.simulate(rounds, gc), r = refCalib(rounds, gc);
        const key = (o) => (o && o.ok ? `ok:${(+o.offset).toFixed(6)}` : 'no');
        if (key(a) !== key(b)) { dSim++; if (samples.length < 3) samples.push({ rounds, sim: a, build: b }); }
        if (key(b) !== key(r)) dRef++;
      }
      out.calibDefinitionCrossCheck = { cases: n, sim_vs_build_diff: dSim, build_vs_qa_ref_diff: dRef, samples };
    }
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

// ---------------- signals (M1, round-2) ----------------
// 화면 프레임(캔버스 픽셀) 기준. 각 프레임을 (1) 그대로 (2) 북채만 빼고 (3) 손가락만 빼고 세 번 그려 픽셀 차를 셈 → 북채·손가락 픽셀 수.
// 북채 그리기 식별: translate(cx + off.x·R, cy + off.y·R) 뒤 restore 까지(render.js mallet), 손가락: 손가락 스프라이트 크기의 정사각 캔버스 drawImage.
function parse64Table() {
  const md = readFileSync(join(PROJ, '20-balance.md'), 'utf8');
  const sec = md.slice(md.indexOf('### 6-4.'), md.indexOf('### 6-5.'));
  const rows = [];
  for (const line of sec.split('\n')) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*\**([\d.]+)\**\s*\|\s*([\d.]+)\s*\|/);
    if (m) rows.push({ level: +m[1], bars: m[2], from: +m[3] * 1000, lastShow: +m[4] * 1000, shrinkStart: +m[5] * 1000, gone: +m[6] * 1000, zone: +m[7] * 1000 });
  }
  return rows;
}
async function installSignalHooks(p, mOff) {
  await p.evaluate((mOff) => {
    const P = CanvasRenderingContext2D.prototype;
    const sup = (window.__qaSup = { m: false, h: false, handPx: -1 });
    const tr = P.translate, rs = P.restore, fi = P.fill, st = P.stroke, di = P.drawImage;
    P.translate = function (x, y) { if (sup.m && this.canvas.id === 'cv') { const L = window.__game.layout(); if (Math.abs(x - (L.cx + mOff[0] * L.R)) < 0.01 && Math.abs(y - (L.cy + mOff[1] * L.R)) < 0.01) this.__skip = true; } return tr.call(this, x, y); };
    P.restore = function () { const r = rs.call(this); this.__skip = false; return r; };
    P.fill = function (...a) { if (this.__skip) return; return fi.apply(this, a); };
    P.stroke = function (...a) { if (this.__skip) return; return st.apply(this, a); };
    P.drawImage = function (src, ...a) { if (sup.h && this.canvas.id === 'cv' && src instanceof HTMLCanvasElement && src.width === src.height && src.width === sup.handPx) return; return di.call(this, src, ...a); };
    window.__qaFrame = () => {
      const g = window.__game, cv = document.getElementById('cv'), c2 = cv.getContext('2d');
      const L = g.layout(); sup.handPx = Math.max(8, Math.ceil(L.hand.size * (cv.width / innerWidth)));
      const W = cv.width, H = cv.height;
      const info = g.drawNow(); const A = c2.getImageData(0, 0, W, H).data;
      sup.m = true; g.drawNow(); sup.m = false; const B = c2.getImageData(0, 0, W, H).data;
      sup.h = true; g.drawNow(); sup.h = false; const C = c2.getImageData(0, 0, W, H).data;
      g.drawNow();
      let mp = 0, hp = 0;
      for (let i = 0; i < A.length; i += 4) {
        if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 12) mp++;
        if (Math.abs(A[i] - C[i]) + Math.abs(A[i + 1] - C[i + 1]) + Math.abs(A[i + 2] - C[i + 2]) > 12) hp++;
      }
      return { lt: info.levelTime, mp, hp, malletOn: info.malletOn, handOn: info.handOn, dash: info.dashK > 0 };
    };
    // 레벨 하나를 완벽 입력으로 끝까지 진행하며 frameMs 간격(창 fine 안에서는 1 ms)으로 프레임을 잼
    window.__qaScan = (level, frameMs, fine, maxMs) => {
      const g = window.__game; g.loadLevel(level);
      const stars = g.stars(); let si = 0;
      let x = g.levelTime();
      const fr = [];
      while (g.state === 'play' && x < maxMs) {
        while (si < stars.length && stars[si].t <= x) { g.pressAt(stars[si].t); si++; }
        const lt = g.levelTime(); if (x > lt) g.step((x - lt) / 1000);
        const f = window.__qaFrame();
        fr.push([Math.round(f.lt * 10) / 10, f.mp, f.hp, f.malletOn ? 1 : 0, f.handOn ? 1 : 0, f.dash ? 1 : 0]);
        const inFine = fine.some(([a, b]) => x >= a && x < b);
        x += inFine ? 1 : frameMs;
      }
      return fr;
    };
  }, mOff);
}
// 픽셀 잡음: 같은 시각을 두 번 그려도 안티앨리어싱으로 1~2 px 이 다를 수 있어 2 px 이하 차이는 "안 보임"으로 봄 (원값은 frames 에 남김)
const NOISE_PX = 2;
const windowOk = (w, s) => !!s && Math.abs(s.a - w.from) <= 1.5 && s.b < w.gone && w.gone - s.b <= 1000 / 60 && (w.nextZone == null || s.b < w.nextZone);
function segments(fr, col) {
  const seg = []; let cur = null;
  for (const f of fr) { const on = f[col] > NOISE_PX; if (on && !cur) cur = { a: f[0], b: f[0] }; else if (on) cur.b = f[0]; else if (cur) { cur.next = f[0]; seg.push(cur); cur = null; } }
  if (cur) seg.push(cur);
  return seg;
}
async function partSignals() {
  const art = JSON.parse(readFileSync(join(GAME, 'data/art.json'), 'utf8'));
  const mOff = art.mallet.off;
  const table = parse64Table();
  const ref = CL.map((c, i) => malletSchedule(c, bal).map((w) => ({ level: i + 1, ...w, nextZone: w.nextStar >= 0 ? c.stars[w.nextStar].zoneStart : null })));
  const out = { table_vs_sim: [], levels: [], l1_res: [], realtime_l1: null, shots: [] };
  // 1) 20-balance 6-4 표 = judge.mjs malletSchedule
  const flat = ref.flat();
  for (const w of flat) {
    const t = table.find((r) => r.level === w.level && Math.abs(r.from - w.from) < 2);
    out.table_vs_sim.push({ level: w.level, bars: t ? t.bars : null, sim: { from: r1(w.from), lastShow: r1(w.lastShow), shrinkStart: r1(w.shrinkStart), gone: r1(w.gone), zone: r1(w.nextZone) }, table: t || null, match: !!t && Math.abs(t.gone - w.gone) <= 1 && Math.abs(t.shrinkStart - w.shrinkStart) <= 1 && Math.abs(t.lastShow - w.lastShow) <= 1 && Math.abs(t.zone - w.nextZone) <= 1 });
  }
  out.table_rows = table.length; out.sim_windows = flat.length;
  const scan = async (p, i, frameMs) => {
    const ws = ref[i];
    const cue = i === 0 ? CL[0] : null;
    const fine = [];
    for (const w of ws) { fine.push([w.from - 25, w.from + 25], [w.shrinkStart - 5, w.gone + 15]); }
    // 손가락 등장: 레벨 1 cue (첫 꽉 찬 별 − 1박 또는 북채 gone 뒤) 근처
    const lv = LV[i];
    let cueT = null;
    if (lv.cues && lv.cues.length) { const c = lv.cues[0]; const t = ((CL[i].countInBars + c.bar) * CL[i].beatsPerBar + c.slot / 2) * CL[i].beatMs; cueT = { t, from: t - c.show_from_beats_before * CL[i].beatMs, pressFrom: t - c.press_from_beats_before * CL[i].beatMs }; fine.push([cueT.from - 25, cueT.from + 25], [t + CL[i].judge.pass_late_ms - 10, t + CL[i].judge.pass_late_ms + 10]); }
    void cue;
    const fr = await p.evaluate(({ i, frameMs, fine, maxMs }) => window.__qaScan(i, frameMs, fine, maxMs), { i, frameMs, fine, maxMs: CL[i].stars[CL[i].stars.length - 1].t + 4000 });
    const mSeg = segments(fr, 1), hSeg = segments(fr, 2);
    const both = fr.filter((f) => f[1] > NOISE_PX && f[2] > NOISE_PX);
    const stateMismatch = fr.filter((f) => (f[1] > NOISE_PX) !== (f[3] === 1) || (f[2] > NOISE_PX) !== (f[4] === 1));
    const dashOutside = fr.filter((f) => f[5] === 1 && !ws.some((w) => f[0] >= w.from - 0.5 && f[0] < w.gone));
    const wins = ws.map((w) => {
      const s = mSeg.find((g) => g.b >= w.from - 1 && g.a <= w.gone + 1);
      return { from: r1(w.from), gone: r1(w.gone), shrinkStart: r1(w.shrinkStart), nextZone: r1(w.nextZone), capped: w.capped,
        pixelFirst: s ? s.a : null, pixelLast: s ? s.b : null, pixelFirstGoneFrame: s ? s.next : null,
        // 판정: 첫 보임 = 등장 ±1 ms, 마지막 보임 < 사라짐 이고 사라짐 − 1프레임(16.7 ms) 안 (작아짐 끝 1~3 ms 는 1 px 미만이라 안 보임), 다음 별 놓침 구역 전
        ok: windowOk(w, s) };
    });
    const stars = CL[i].stars;
    // 북채 픽셀이 보이는 프레임이 판정 별 위험 구간 [zoneStart, passEnd] 안에 있는지
    const inDanger = fr.filter((f) => f[1] > NOISE_PX && stars.some((s) => f[0] >= s.zoneStart && f[0] <= s.passEnd)).length;
    return { level: i + 1, frames: fr.length, frameMs, mallet_segments: mSeg, hand_segments: hSeg, windows: wins, both_frames: both.length, both_sample: both.slice(0, 5), pixel_vs_state_mismatch: stateMismatch.length, mismatch_sample: stateMismatch.slice(0, 5), dash_outside_window: dashOutside.length, mallet_pixels_in_judge_danger: inDanger, cue: cueT && { from: r1(cueT.from), pressFrom: r1(cueT.pressFrom), t: r1(cueT.t) }, maxMalletPx: Math.max(0, ...fr.map((f) => f[1])), maxHandPx: Math.max(0, ...fr.map((f) => f[2])) };
  };
  // 2) 4해상도 L1 (16.67 ms 프레임 + 경계 1 ms)
  for (const [w, h] of RES) {
    const { ctx, p } = await open(w, h);
    await installSignalHooks(p, mOff);
    const r = await scan(p, 0, 1000 / 60);
    r.res = `${w}x${h}`;
    out.l1_res.push(r);
    // 화면 증거: 북채 마지막 프레임 / 둘 다 없는 사이 / 손가락 첫 프레임
    // 레벨 시작 첫 프레임(직전 레벨 결과 화면에서 loadLevel) — 손가락 픽셀 차가 생기는지 화면으로 확인
    r.firstFrame = await G(p, () => { const g = window.__game; g.loadLevel(0); return window.__qaFrame(); });
    await shot(p, `${w}x${h}-m1-level-first-frame.png`); out.shots.push(`${w}x${h}-m1-level-first-frame.png`);
    r.firstFrame2 = await G(p, () => { window.__game.step(0.15); return window.__qaFrame(); });
    const firstWin = r.windows[0], hand0 = r.hand_segments.find((s) => s.a > 1000);
    for (const [nm, t] of [['m1-mallet-last', firstWin.pixelLast], ['m1-gap', (firstWin.gone + (hand0 ? hand0.a : firstWin.gone)) / 2], ['m1-hand-first', hand0 ? hand0.a : null]]) {
      if (t == null) continue;
      await G(p, (t) => { const g = window.__game; g.loadLevel(0); const s = g.stars(); for (const st of s) if (st.t <= t) g.pressAt(st.t); g.step((t - g.levelTime()) / 1000); g.drawNow(); }, t);
      const f = `${w}x${h}-${nm}.png`; await shot(p, f); out.shots.push(f);
    }
    console.log(`  signals L1 ${w}x${h}: frames ${r.frames} both ${r.both_frames} mallet ${r.mallet_segments.map((s) => `${s.a}-${s.b}`).join(',')} hand ${r.hand_segments.map((s) => `${s.a}-${s.b}`).join(',')} winsOk ${r.windows.filter((x) => x.ok).length}/${r.windows.length}`);
    await ctx.close();
  }
  // 3) 412x915 레벨 2~10 (북채 있는 레벨 전부, 레벨 4·8·9·10 은 북채 0 확인)
  {
    const { ctx, p } = await open(412, 915);
    await installSignalHooks(p, mOff);
    for (let i = 1; i < 10; i++) {
      const r = await scan(p, i, 1000 / 60);
      out.levels.push(r);
      console.log(`  signals L${i + 1}: frames ${r.frames} both ${r.both_frames} mallet segs ${r.mallet_segments.length} winsOk ${r.windows.filter((x) => x.ok).length}/${r.windows.length} danger ${r.mallet_pixels_in_judge_danger}`);
    }
    await ctx.close();
  }
  // 4) 일반 모드 실시간 L1 (오디오 켜짐, rAF 마다 마지막으로 그린 프레임의 신호 상태, autoplay 로 끝까지)
  {
    const { ctx, p } = await open(412, 915, '');
    await enterNormal(p);
    await G(p, () => window.__game.loadLevel(0));
    await p.evaluate(() => { window.__qaSig = []; const f = () => { const g = window.__game; if (g.state !== 'play') { window.__qaSigDone = true; return; } const i = g.frameInfo(); window.__qaSig.push([Math.round(i.levelTime), i.malletOn ? 1 : 0, i.handOn ? 1 : 0]); requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await G(p, () => window.__game.autoplay(0, 0));
    const sig = await G(p, () => window.__qaSig);
    out.realtime_l1 = { frames: sig.length, both: sig.filter((s) => s[1] && s[2]).length, mallet_frames: sig.filter((s) => s[1]).length, hand_frames: sig.filter((s) => s[2]).length, last_mallet_before_hand: (() => { const h = sig.find((s) => s[2]); if (!h) return null; const m = sig.filter((s) => s[1] && s[0] < h[0]).pop(); return { lastMallet: m ? m[0] : null, firstHand: h[0] }; })() };
    await ctx.close();
  }
  const allWins = [...out.l1_res.flatMap((r) => r.windows), ...out.levels.flatMap((r) => r.windows)];
  out.summary = {
    table_matches_sim: out.table_vs_sim.filter((x) => x.match).length + '/' + out.table_vs_sim.length + ` (표 ${out.table_rows}줄)`,
    windows_ok: allWins.filter((w) => w.ok).length + '/' + allWins.length,
    both_frames_total: [...out.l1_res, ...out.levels].reduce((a, r) => a + r.both_frames, 0) + (out.realtime_l1 ? out.realtime_l1.both : 0),
    frames_total: [...out.l1_res, ...out.levels].reduce((a, r) => a + r.frames, 0),
    pixel_vs_state_mismatch: [...out.l1_res, ...out.levels].reduce((a, r) => a + r.pixel_vs_state_mismatch, 0),
    mallet_pixels_in_judge_danger: [...out.l1_res, ...out.levels].reduce((a, r) => a + r.mallet_pixels_in_judge_danger, 0),
    dash_outside_window: [...out.l1_res, ...out.levels].reduce((a, r) => a + r.dash_outside_window, 0),
    realtime_both: out.realtime_l1 && out.realtime_l1.both,
  };
  return out;
}

// ---------------- cards (M4, round-2) ----------------
// notext 화면에서 #cardImg 를 요소 스크린샷(DPR 1 → CSS px) → 페이지 캔버스로 읽어 공(#7FE3FF 면)·별(#FFD43B) 연결 성분 크기
async function measureImage(p, buf, colors) {
  return p.evaluate(async ({ b64, colors }) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
    const res = {};
    for (const [name, [r, gg, b], tol] of colors) {
      const mask = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) if (Math.abs(d[i * 4] - r) <= tol && Math.abs(d[i * 4 + 1] - gg) <= tol && Math.abs(d[i * 4 + 2] - b) <= tol) mask[i] = 1;
      const comps = []; const q = new Int32Array(W * H);
      for (let s = 0; s < W * H; s++) {
        if (mask[s] !== 1) continue;
        let qh = 0, qt = 0; q[qt++] = s; mask[s] = 2; let x0 = W, x1 = 0, y0 = H, y1 = 0, n = 0;
        while (qh < qt) { const k = q[qh++]; const x = k % W, y = (k / W) | 0; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          for (const nb of [k - 1, k + 1, k - W, k + W]) { if (nb < 0 || nb >= W * H) continue; if ((nb === k - 1 && x === 0) || (nb === k + 1 && x === W - 1)) continue; if (mask[nb] === 1) { mask[nb] = 2; q[qt++] = nb; } } }
        if (n >= 6) comps.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n });
      }
      comps.sort((a, b) => b.n - a.n);
      res[name] = comps.slice(0, 40);
    }
    return { W, H, res };
  }, { b64: buf.toString('base64'), colors });
}
async function partCards() {
  const out = { cards: [], play: [] };
  const cardLv = LV.map((l, i) => (l.card && l.card.id ? i : -1)).filter((i) => i >= 0);
  for (const [w, h] of RES) {
    const { ctx, p } = await open(w, h);
    await blankText(p);
    for (const i of cardLv) {
      await G(p, (i) => window.__game.loadLevel(i, { card: true }), i);
      await p.waitForFunction(() => { const im = document.getElementById('cardImg'); return im.complete && im.naturalWidth > 0; });
      await sleep(120);
      const meta = await G(p, () => { const im = document.getElementById('cardImg'); const r = im.getBoundingClientRect(); return { src: im.getAttribute('src'), x: r.left, y: r.top, w: r.width, h: r.height, inside: r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5 }; });
      const file = `${w}x${h}-card-${LV[i].card.id}-notext.png`;
      const buf = await p.locator('#cardImg').screenshot({ path: join(SHOTS, file) });
      const m = await measureImage(p, buf, [['ball', [127, 227, 255], 36], ['star', [255, 212, 59], 40]]);
      // 별 성분: 반짝 선(작은 노란 조각)은 빼고 가장 큰 성분의 절반 이상 크기만 별로 봄 (꽉 찬 별 = 면 비율 > 0.25, 빈 별 = 테두리만)
      const balls = m.res.ball, bigS = Math.max(0, ...m.res.star.map((c) => Math.max(c.w, c.h))), stars = m.res.star.filter((c) => Math.max(c.w, c.h) >= 0.5 * bigS);
      const ball = balls[0];
      // 별: 성분 중 크기 상위 (조각 제외) — 판정 대상(꽉 찬 별) 크기 = 면적 큰 성분들의 bbox
      const starSizes = stars.map((c) => Math.max(c.w, c.h)).sort((a, b) => a - b);
      const filledStars = stars.filter((c) => c.n > 0.25 * c.w * c.h).map((c) => Math.max(c.w, c.h)).sort((a, b) => a - b);
      const portrait = w < h, unit = portrait ? 234 : 720;
      out.cards.push({ res: `${w}x${h}`, card: LV[i].card.id, level: i + 1, ...meta, portraitFile: meta.src.endsWith('_portrait.svg'), scale: +(meta.w / unit).toFixed(4),
        ball_fill_px: ball ? Math.max(ball.w, ball.h) : null, ball_count: balls.filter((c) => c.n > 30).length, ball_geom_px: +(28 * meta.w / unit).toFixed(1),
        star_px_min: starSizes[0] ?? null, star_hollow_px: stars.filter((c) => c.n <= 0.25 * c.w * c.h).map((c) => Math.max(c.w, c.h)), star_geom_play_px: +(32.4 * meta.w / unit).toFixed(1), star_geom_hollow_px: +(29.8 * meta.w / unit).toFixed(1), star_px_filled_min: filledStars[0] ?? null, star_px_filled_max: filledStars[filledStars.length - 1] ?? null, star_components: stars.length, file });
      console.log(`  card ${w}x${h} ${LV[i].card.id}: ball ${ball && Math.max(ball.w, ball.h)} px, star filled min ${filledStars[0]} (all min ${starSizes[0]})`);
    }
    // 플레이 화면 공·별 (레이아웃 값, CSS px)
    await G(p, () => window.__game.loadLevel(0));
    const lay = await G(p, () => { const L = window.__game.layout(); return { ballD: 2 * L.ballR, starD: 2 * L.starR, R: L.R, hand: L.hand.size }; });
    out.play.push({ res: `${w}x${h}`, ...lay });
    await ctx.close();
  }
  out.summary = { cards_checked: out.cards.length, ball_fill_min: Math.min(...out.cards.map((c) => c.ball_fill_px)), star_filled_min: Math.min(...out.cards.map((c) => c.star_px_filled_min ?? 999)), ball_fail: out.cards.filter((c) => !(c.ball_fill_px >= 16)).map((c) => `${c.res} ${c.card} ${c.ball_fill_px}`), star_fail: out.cards.filter((c) => !(c.star_px_filled_min >= 20)).map((c) => `${c.res} ${c.card} ${c.star_px_filled_min}`), orientation_ok: out.cards.every((c) => (c.res.split('x')[0] < +c.res.split('x')[1]) === c.portraitFile), inside_ok: out.cards.every((c) => c.inside), play_ball_min: Math.min(...out.play.map((x) => x.ballD)), play_star_min: Math.min(...out.play.map((x) => x.starD)) };
  return out;
}

// ---------------- r2 (round-1 이슈 회귀 + aria R8) ----------------
async function partR2() {
  const S = JSON.parse(readFileSync(join(GAME, 'data/strings.json'), 'utf8'));
  const art = JSON.parse(readFileSync(join(GAME, 'data/art.json'), 'utf8'));
  const out = { res: {}, checks: {} };
  const ariaAudit = (p) => G(p, () => {
    const vis = (e) => { let n = e; while (n && n !== document.body) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden' || n.classList.contains('hidden')) return false; n = n.parentElement; } return true; };
    const l = [];
    for (const e of document.querySelectorAll('[aria-label], [role]')) { if (!vis(e)) continue; const lab = e.getAttribute('aria-label') || ''; l.push({ id: e.id || e.className.baseVal || e.className, role: e.getAttribute('role'), label: lab, digits: /\d/.test(lab) }); }
    return l;
  });
  const ko = S.ko;
  for (const [w, h] of RES) {
    const tag = `${w}x${h}`; const R = (out.res[tag] = {});
    const { ctx, p } = await open(w, h);
    // N1·N6·N11: 레벨 카드 (진행 상태: L1 클리어, L2 반쯤 실패(최고 진행도), L3 연습 깃발)
    await G(p, () => { const g = window.__game; g.loadLevel(0); g.autoplay(0, 0); g.loadLevel(1); const s = g.stars(); for (const st of s.slice(0, Math.floor(s.length / 2))) g.pressAt(st.t); let k = 0; while (g.attempts < 2 && k++ < 3000) g.step(0.02); g.loadLevel(2, { practice: true }); g.autoplay(0, 0); g.show('levels'); });
    await sleep(100);
    R.levels = await G(p, () => {
      const bad = [], cards = [...document.querySelectorAll('.lcard')];
      const rr = (e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom, r: r.right }; };
      cards.forEach((c, i) => {
        const play = c.querySelector('.lplay'), pr = rr(play);
        const kids = [...play.children].filter((e) => e.getBoundingClientRect().height > 0).map((e) => ({ k: e.tagName + (e.className.baseVal ?? e.className), ...rr(e) }));
        for (let a = 0; a < kids.length; a++) { const A = kids[a]; if (A.x < pr.x - 0.5 || A.r > pr.r + 0.5 || A.y < pr.y - 0.5 || A.b > pr.b + 0.5) bad.push(`L${i + 1} ${A.k} 버튼 밖`); for (let b = a + 1; b < kids.length; b++) { const B = kids[b]; const ov = Math.min(A.b, B.b) - Math.max(A.y, B.y); const ox = Math.min(A.r, B.r) - Math.max(A.x, B.x); if (ox > 0.5 && ov > 0.5) bad.push(`L${i + 1} ${A.k}/${B.k} 겹침 ${ov.toFixed(1)}`); else if (ox > 0.5 && ov > -3.5) bad.push(`L${i + 1} ${A.k}/${B.k} 간격 ${(-ov).toFixed(1)} < 4`); } }
        const nm = play.querySelector('.lname'); if (nm && nm.scrollWidth > nm.clientWidth + 0.5) bad.push(`L${i + 1} 이름 잘림`);
      });
      const gradeRow = (i) => { const svgs = cards[i].querySelectorAll('.lplay svg.lr'); return svgs[svgs.length - 1] ? svgs[svgs.length - 1].innerHTML : ''; };
      return { bad, l2_progress_bar: /<rect/.test(gradeRow(1)) && /<circle/.test(gradeRow(1)), l2_has_digits: /\d+\s*%/.test(cards[1].textContent), l3_flag: /<polygon/.test(gradeRow(2)), l4_empty: gradeRow(3) === '', names_shown: cards.filter((c) => c.querySelector('.lname')).length, card_icon: [...document.querySelectorAll('.lrow img')].filter((im) => im.getAttribute('src').endsWith('icon-card.svg')).length, labels: cards.map((c) => c.querySelector('.lplay').getAttribute('aria-label')) };
    });
    await shot(p, `${tag}-r2-levels.png`);
    // N2: 타이틀 힌트(손가락+글)와 궤도
    await G(p, () => window.__game.show('title')); await sleep(80);
    R.title = await G(p, () => { const L = window.__game.layout(); const e = document.getElementById('tapStart'); const r = e.getBoundingClientRect(); const ring = L.R + L.band / 2 + 2; const nx = Math.max(r.left, Math.min(L.cx, r.right)), ny = Math.max(r.top, Math.min(L.cy, r.bottom)); const dist = Math.hypot(nx - L.cx, ny - L.cy); const inside = r.left > L.cx - ring && r.right < L.cx + ring && r.top > L.cy - ring && r.bottom < L.cy + ring; return { rect: [r.left, r.top, r.width, r.height].map((v) => Math.round(v)), ringOuter: Math.round(ring), distToCenter: Math.round(dist), clearOfRing: dist > ring || inside && false, onScreen: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; });
    await shot(p, `${tag}-r2-title.png`);
    // N5: 확인 창
    await G(p, () => window.__game.show('confirm')); await sleep(80);
    R.confirm = await G(p, () => { const no = document.getElementById('cfNo'), yes = document.getElementById('cfYes'); const cs = (e) => getComputedStyle(e); return { focus: document.activeElement && document.activeElement.id, noImg: no.querySelector('img').getAttribute('src'), yesImg: yes.querySelector('img').getAttribute('src'), noBg: cs(no).backgroundColor, yesBg: cs(yes).backgroundColor, noBorder: cs(no).borderColor, yesBorder: cs(yes).borderColor, dialogLabelled: document.querySelector('#sConfirm .dialog').getAttribute('aria-labelledby'), sizes: [no, yes].map((b) => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }) }; });
    // N12: 손가락 크기·위치 (플레이 레이아웃)
    await G(p, () => window.__game.loadLevel(0));
    R.hand = await G(p, () => { const L = window.__game.layout(); return { size: L.hand.size, x: L.hand.x, y: L.hand.y, R: L.R, cx: L.cx, cy: L.cy, thumb: L.thumb, W: L.W, H: L.H }; });
    R.hand.expected = Math.max(art.hand.min, art.hand.k * R.hand.R);
    // N13: 시도 점 줄 meter
    await G(p, () => { const g = window.__game; g.loadLevel(0); let k = 0; while (g.attempts < 3 && k++ < 6000) g.step(0.02); });
    R.attempts = await G(p, () => { const e = document.getElementById('attAria'); return { role: e.getAttribute('role'), label: e.getAttribute('aria-label'), now: e.getAttribute('aria-valuenow'), max: e.getAttribute('aria-valuemax'), attempts: window.__game.attempts }; });
    // N14: 연습 깃발 aria, 결과 등급 aria (일반 L1 / 연습 L2), 설정 버튼
    await G(p, () => { const g = window.__game; g.loadLevel(2, { practice: true }); g.step(0.5); });
    R.flags = await G(p, () => [...document.querySelectorAll('#cpFlags > *')].map((e) => ({ role: e.getAttribute('role'), label: e.getAttribute('aria-label') })));
    await G(p, () => { const g = window.__game; g.loadLevel(0); for (const s of g.stars()) g.pressAt(s.t + (s.i % 4 === 1 ? 70 : 0)); let k = 0; while (g.state !== 'result' && k++ < 300) g.step(0.1); });
    R.resultL1 = await G(p, () => ({ grade: window.__game.grade, role: document.getElementById('gradeAria').getAttribute('role'), label: document.getElementById('gradeAria').getAttribute('aria-label'), btns: [...document.querySelectorAll('#resultBtns button')].filter((b) => b.offsetParent !== null).map((b) => b.id) }));
    R.resultL1.aria = await ariaAudit(p);
    await G(p, () => { const g = window.__game; g.loadLevel(1, { practice: true }); g.autoplay(0, 0); let k = 0; while (g.state !== 'result' && k++ < 300) g.step(0.1); });
    R.resultPractice = await G(p, () => ({ role: document.getElementById('gradeAria').getAttribute('role'), label: document.getElementById('gradeAria').getAttribute('aria-label') }));
    // N16: L10 결과 버튼
    await G(p, () => { const g = window.__game; g.loadLevel(9); g.autoplay(0, 0); let k = 0; while (g.state !== 'result' && k++ < 300) g.step(0.1); });
    R.resultL10 = await G(p, () => ({ btns: [...document.querySelectorAll('#resultBtns button')].filter((b) => b.offsetParent !== null).map((b) => ({ id: b.id, label: b.getAttribute('aria-label'), img: b.querySelector('img').getAttribute('src') })) }));
    await shot(p, `${tag}-r2-result-l10.png`);
    await G(p, () => window.__game.show('levels'));
    R.gate = await G(p, () => { const b = document.getElementById('bGate'); const d = document.getElementById(b.getAttribute('aria-describedby')); return { label: b.getAttribute('aria-label'), describedBy: d && d.getAttribute('data-t'), describedText: d && d.textContent }; });
    // aria 전 화면 감사 (숫자 이어 붙임)
    R.ariaScreens = {};
    for (const s of ['title', 'levels', 'settings', 'pause', 'confirm']) { await G(p, (s) => window.__game.show(s), s); R.ariaScreens[s] = (await ariaAudit(p)).filter((x) => x.digits); }
    await G(p, () => { const g = window.__game; g.loadLevel(0); g.step(3); }); R.ariaScreens.play = (await ariaAudit(p)).filter((x) => x.digits);
    await ctx.close();
  }
  // N15: 불러오기 화면·실패 화면 (data 요청을 늦추거나 끊음 — 의도한 실패는 로그에서 뺌)
  {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
    const p = await ctx.newPage();
    let release; const gateP = new Promise((r) => (release = r));
    await p.route('**/data/balance.json', async (r) => { await gateP; r.continue(); });
    await p.goto(BASE + '?test=1');
    await sleep(400);
    out.loading = await G(p, () => { const pic = document.getElementById('loadPic'); return { state: window.__game && window.__game.state, picRole: pic.getAttribute('role'), picLabel: pic.getAttribute('aria-label'), text: document.getElementById('loadTxt').textContent, bg: getComputedStyle(document.body).backgroundColor }; });
    await shot(p, '412x915-r2-loading.png');
    release(); await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 20000 });
    await ctx.close();
    const ctx2 = await browser.newContext({ viewport: { width: 412, height: 915 } });
    const p2 = await ctx2.newPage();
    await p2.route('**/data/balance.json', (r) => r.abort());
    await p2.goto(BASE + '?test=1');
    await p2.waitForFunction(() => !document.getElementById('bReload').classList.contains('hidden'), null, { timeout: 10000 }).catch(() => {});
    out.loadError = await G(p2, () => { const b = document.getElementById('bReload'); const d = document.getElementById(b.getAttribute('aria-describedby')); return { visible: !b.classList.contains('hidden'), label: b.getAttribute('aria-label'), described: d && d.textContent, w: b.getBoundingClientRect().width }; });
    await shot(p2, '412x915-r2-load-error.png');
    await ctx2.close();
  }
  // N7: 자동 지연 표시값 = 판정 값 (일반 모드, 레벨 시작·플레이 중 여러 번)
  {
    const { ctx, p } = await open(1280, 720, '', { init: { fn: () => { try { localStorage.setItem('qaFreq', '1'); } catch {} }, arg: null } });
    await enterNormal(p);
    const lat = [];
    lat.push(await G(p, () => window.__game.latency()));
    await G(p, () => window.__game.loadLevel(0)); await sleep(1500);
    for (let k = 0; k < 5; k++) { lat.push(await G(p, () => window.__game.latency())); await sleep(300); }
    await G(p, () => window.__game.setOffset(30)); lat.push(await G(p, () => window.__game.latency()));
    await G(p, () => window.__game.setOffset(0));
    out.latency = { samples: lat, comp_eq_auto_plus_manual: lat.every((l) => Math.abs(l.comp - (l.auto + l.manual)) < 1e-6), auto_values: [...new Set(lat.map((l) => r1(l.auto)))], autoNow_values: [...new Set(lat.map((l) => r1(l.autoNow)))] };
    // N9: 보정 체크 방울 음 높이 (보정 끝날 때 1000~1100 Hz 기록)
    await G(p, () => { window.__qa.freqs = []; window.__game.show('calibRedo'); });
    await G(p, () => { const g = window.__game; for (let k = 0; k < 16; k++) g.calibTap(5); });
    await sleep(800);
    out.calibCheck = { freqs: await G(p, () => [...new Set(window.__qa.freqs.map((f) => Math.round(f.v * 10) / 10))]), soundJson: JSON.parse(readFileSync(join(GAME, 'data/music.json'), 'utf8')).calib_check_hz ?? null };
    await ctx.close();
  }
  // N17: card_star_tap 카드 속 손가락 위치 (그림 칸 기준) — SVG 원본에서 손가락 그림 위치를 읽음
  {
    const svg = readFileSync(join(GAME, 'data/svg/cards/card_star_tap.svg'), 'utf8');
    out.cardHand = { hasHandRef: /hand/.test(svg), handSnippets: [...svg.matchAll(/<[^>]*(?:hand|thumb)[^>]*>/gi)].slice(0, 4).map((m) => m[0].slice(0, 200)) };
  }
  // 문자열 키 사용 (10-lore 키 표 = data/strings.json)
  {
    const src = ['js/main.js', 'js/render.js', 'js/audio.js', 'js/engine.js', 'js/calib.js', 'index.html'].map((f) => readFileSync(join(GAME, f), 'utf8')).join('\n') + readFileSync(join(PROJ, 'tools/build-web-data.mjs'), 'utf8');
    const keys = Object.keys(S.ko);
    const dyn = [...src.matchAll(/T\[\s*'([a-z_]+)'\s*\+/g)].map((m) => m[1]);
    // 데이터가 키 이름을 주는 동적 사용: 레벨 name_key, 카드 id(T[cid]), balance.json 안의 문자열 값(T[gc.done_signal] 등)
    const balStrings = JSON.stringify(bal).match(/"[a-z_]+"/g).map((s) => s.slice(1, -1));
    const lvNameKeys = [...LV.map((l) => l.name_key), ...(/T\[cid\]/.test(src) ? LV.map((l) => l.card && l.card.id) : []), ...(/T\[gc\./.test(src) ? balStrings : [])].filter(Boolean);
    const unused = keys.filter((k) => !new RegExp(`['"\`]${k}['"\`]|data-[ta]="${k}"|T\\.${k}\\b`).test(src) && !dyn.some((d) => k.startsWith(d)) && !lvNameKeys.includes(k));
    const notes = readFileSync(join(PROJ, 'DEV_NOTES.md'), 'utf8');
    out.strings = { keys: keys.length, dynamic_prefixes: [...new Set(dyn)], unused, unused_without_reason: unused.filter((k) => !notes.includes(k)) };
  }
  // 판정
  const Rs = Object.values(out.res);
  const tx = (k) => ko[k];
  out.checks = {
    N1_level_card_rows: Rs.every((r) => r.levels.bad.length === 0),
    N2_title_hint_clear: out.res['640x360'].title.clearOfRing,
    N5_confirm_icons: Rs.every((r) => r.confirm.focus === 'cfNo' && /next-ink/.test(r.confirm.noImg) && /icon-reset/.test(r.confirm.yesImg) && r.confirm.noBg !== r.confirm.yesBg && r.confirm.sizes.every(([a, b]) => a >= 48 && b >= 48)),
    N6_progress_on_card: Rs.every((r) => r.levels.l2_progress_bar && !r.levels.l2_has_digits && r.levels.l3_flag),
    N7_latency_one_value: out.latency.comp_eq_auto_plus_manual && out.latency.auto_values.length === 1,
    N9_calib_1046: out.calibCheck.soundJson === 1046.5 && out.calibCheck.freqs.some((f) => Math.abs(f - 1046.5) < 0.2),
    N11_icon_card: Rs.every((r) => r.levels.card_icon >= 1),
    N12_hand_scaled: Rs.every((r) => Math.abs(r.hand.size - Math.min(r.hand.expected, r.hand.thumb ? r.hand.thumb.h - 16 : Infinity)) < 1 || r.hand.size >= 64),
    N13_attempts_meter: Rs.every((r) => r.attempts.role === 'meter' && r.attempts.label === tx('aria_attempts') && +r.attempts.now === r.attempts.attempts && !/\d/.test(r.attempts.label)),
    N14_grade_aria: Rs.every((r) => r.resultL1.role === 'img' && r.resultL1.label === tx('grade_' + r.resultL1.grade) && r.resultPractice.label === tx('practice_clear') && r.flags.length > 0 && r.flags.every((f) => f.role === 'img' && f.label === tx('aria_checkpoint')) && r.gate.label === tx('btn_settings') && r.gate.describedBy === 'guardian_hold'),
    N15_loading_error: out.loading.picRole === 'img' && out.loading.picLabel === tx('loading') && out.loadError.visible && out.loadError.label === tx('btn_retry') && out.loadError.described === tx('load_error'),
    N16_l10_two_buttons: Rs.every((r) => r.resultL10.btns.map((b) => b.id).join(',') === 'bRetry,bLevels'),
    R8_no_digits_in_aria: Rs.every((r) => Object.values(r.ariaScreens).every((l) => l.length === 0) && r.resultL1.aria.filter((x) => x.digits).length === 0),
    R8_strings_used_or_reason: out.strings.unused_without_reason.length === 0,
  };
  return out;
}

// ---------------- firstrun (round-2 1-6 재측정) ----------------
// 빈 저장소 → 실제 타이틀 클릭 → 첫 실행 자동 보정(실제 마우스 16탭) → 카드 → L1 실제 마우스.
// "들리는 박" = 예약 시각 + **그 순간의 자동 지연(autoNow)** (round-2 calib 파트는 게임 고정값 latency().auto 를 써서 이중 보정을 못 봄).
// 판정: 보정 결과 오프셋이 (탭 − 들리는 박) 규칙 기대값 ±10 ms, L1 시작 때 comp − autoNow = 그 오프셋 ±10 ms, L1 판정 오차 중앙값.
// 측정한 판정 치우침으로 σ70 봇(tools/sim/bots.mjs runProfile)을 다시 돌려 L1~L10 첫 클리어 중앙값을 냄. --part all 에는 들어가지 않음.
async function heardPlay(p, { X = 0, leadMs = 3, maxAttempts = 3 } = {}) {
  const vw = p.viewportSize();
  await p.mouse.move(vw.width / 2, vw.height * 0.45);
  const out = { attempts: [], taps: 0 };
  for (let a = 0; a < maxAttempts; a++) {
    await p.waitForFunction(() => window.__game.nextStarPerfTime() !== null && window.__game.phase === 'run', null, { timeout: 15000 }).catch(() => {});
    const info = await p.evaluate(() => { const g = window.__game; const s = g.stars(); const t0 = g.nextStarPerfTime(); const i0 = Math.round(g.progress * s.length); const lat = g.latency(); return { att: g.attempts, i0, lat, times: s.slice(i0).map((st) => t0 + (st.t - s[i0].t)) }; });
    const shift = info.lat.autoNow - info.lat.comp; // 게임 시계 기준 별 시각 → 들리는 시각
    const cm = await clockMap(p);
    for (const t of info.times) {
      const target = t + shift + X - cm.d - leadMs;
      const wait = target - performance.now();
      if (wait > 25) await sleep(wait - 20);
      while (performance.now() < target) { /* spin */ }
      await p.mouse.down(); await p.mouse.up();
      out.taps++;
      if ((out.taps & 7) === 0) { const ph = await p.evaluate(() => [window.__game.phase, window.__game.attempts]); if (ph[0] !== 'run' && ph[0] !== 'clearing' || ph[1] !== info.att) break; }
    }
    await p.waitForFunction((att) => window.__game.state === 'result' || window.__game.attempts !== att, info.att, { timeout: 90000 }).catch(() => {});
    const s = await p.evaluate(() => ({ ...window.__game.summary(), errs: window.__game.judgeLog().map((j) => Math.round(j.e * 10) / 10), lat: window.__game.latency() }));
    out.attempts.push({ ...s, shiftUsed: r1(shift), latAtStart: info.lat });
    if (s.state === 'result') break;
  }
  return out;
}
async function partFirstRun() {
  const gc = bal.audio_latency.guardian_calibration;
  const beat = 60 / gc.bpm;
  const out = { definition: '들리는 박 = 예약 시각 + 탭 순간 autoNow(outputLatency+baseLatency). 사람 = 들리는 박 + X ms 에 실제 마우스(CDP) 누름', runs: [] };
  const cases = [{ w: 412, h: 915, X: 0 }, { w: 1280, h: 720, X: 0 }, { w: 360, h: 640, X: 0 }, { w: 412, h: 915, X: 120 }, { w: 412, h: 915, X: 0, skip: true }];
  for (const c of cases) {
    const { ctx, p } = await open(c.w, c.h, '');
    const vw = p.viewportSize();
    const storeBefore = await G(p, () => { try { return localStorage.length; } catch { return -1; } });
    const tl = [];
    const sampleLat = async (tag) => { const s = await G(p, () => ({ ...window.__game.latency(), state: window.__game.state, sinceCtx: window.__qa.ctxAt == null ? null : performance.now() - window.__qa.ctxAt })); tl.push({ tag, ...s, sinceCtx: r1(s.sinceCtx) }); return s; };
    await p.mouse.click(vw.width / 2, vw.height * 0.6);
    await p.waitForFunction(() => window.__game.state === 'calib');
    await sampleLat('calib 진입 직후');
    const enterCt = await G(p, () => window.__qa.ctx ? window.__qa.ctx.currentTime : null);
    const run = { res: `${c.w}x${c.h}`, X: c.X, skip: !!c.skip, emptyStorageAtStart: storeBefore === 0, timeline: tl };
    if (c.skip) {
      await sleep(900); await sampleLat('보정 화면 0.9 s');
      await p.click('#bSkip');
    } else {
      await sleep(900);
      await sampleLat('보정 화면 0.9 s (탭 전)');
      const first = await G(p, (enterCt) => { const ws = [...new Set(window.__qa.starts.map((s) => Math.round(s.when * 1e6) / 1e6))].filter((w) => w > enterCt + 0.3).sort((a, b) => a - b); return ws[0]; }, enterCt);
      const cm = await clockMap(p);
      const heard = [], autoAtTap = [], autoGameAtTap = [];
      for (let n = 0; n < 16; n++) {
        const q = await G(p, () => { const ctx = window.__qa.ctx; let off = -1e9; for (let k = 0; k < 40; k++) off = Math.max(off, ctx.currentTime - performance.now() / 1000); const l = window.__game.latency(); return { ct: ctx.currentTime, off, autoNow: l.autoNow, auto: l.auto, state: window.__game.state }; });
        if (q.state !== 'calib') break;
        const k = Math.ceil((q.ct + 0.25 - first) / beat);
        const heardPerf = (first + k * beat + q.autoNow / 1000 - q.off) * 1000;
        const target = heardPerf + c.X - cm.d;
        const wait = target - performance.now();
        if (wait > 25) await sleep(wait - 20);
        while (performance.now() < target) {}
        await p.mouse.down(); await p.mouse.up();
        heard.push(heardPerf); autoAtTap.push(q.autoNow); autoGameAtTap.push(q.auto);
      }
      await sleep(150);
      const res = await G(p, () => ({ state: window.__game.state, offset: window.__game.offset, taps: window.__qa.taps.slice(-16), save: window.__game.save() }));
      const diffs = res.taps.slice(-heard.length).map((t, i) => t - heard[i]);
      const used = [...diffs.slice(2, 8), ...diffs.slice(10, 16)];
      const m = med(used);
      const expect = Math.abs(m) <= gc.apply_only_if_abs_over_ms ? 0 : m;
      await sampleLat('보정 끝 직후');
      run.calib = { taps: heard.length, tapMinusHeardMedian: r1(m), tapMinusHeardRange: [r1(Math.min(...diffs)), r1(Math.max(...diffs))], autoNowAtTaps: [...new Set(autoAtTap.map(r1))], gameAutoAtTaps: [...new Set(autoGameAtTap.map(r1))], offset: r1(res.offset), expectOffset: r1(expect), offsetErr: r1(res.offset - expect), calibAutoLatSaved: res.save.calibAutoLat, ok_pm10: Math.abs(res.offset - expect) <= 10 };
      console.log(`  firstrun ${run.res} X=${c.X}: offset ${r1(res.offset)} expect ${r1(expect)} (game auto ${run.calib.gameAutoAtTaps} / autoNow ${run.calib.autoNowAtTaps})`);
    }
    await p.waitForFunction(() => ['card', 'play'].includes(window.__game.state), null, { timeout: 8000 });
    await sampleLat('L1 카드');
    if ((await G(p, () => window.__game.state)) === 'card') { await p.mouse.click(vw.width / 2, vw.height * 0.6); await p.waitForFunction(() => window.__game.state === 'play'); }
    const atL1 = await sampleLat('L1 시작');
    const manualExpected = run.calib ? run.calib.expectOffset : 0;
    run.l1Start = { auto: r1(atL1.auto), autoNow: r1(atL1.autoNow), manual: r1(atL1.manual), comp: r1(atL1.comp), compMinusAutoNow: r1(atL1.comp - atL1.autoNow), shouldBe: r1(manualExpected), doubleCorrectionMs: r1(atL1.comp - atL1.autoNow - manualExpected), ok_pm10: Math.abs(atL1.comp - atL1.autoNow - manualExpected) <= 10 };
    const pl = await heardPlay(p, { X: c.X, leadMs: 3 }); // 같은 사람: 보정 때와 같은 습관(들리는 박 + X)으로 침
    const errs = pl.attempts.flatMap((a) => a.errs);
    const last = pl.attempts[pl.attempts.length - 1];
    run.l1Play = { humanTapsAt: `들리는 별 + ${c.X} ms (보정 때와 같은 사람), 바른 보정이면 판정 오차 ≈ X − 적용 오프셋 ≈ 0`, attempts: last.attempts, clear: last.clear, errMedian: r1(med(errs)), errRange: [r1(Math.min(...errs)), r1(Math.max(...errs))], n: errs.length, lastResult: last.lastResult };
    console.log(`  firstrun ${run.res}${c.skip ? ' skip' : ''}: L1 comp-autoNow ${run.l1Start.compMinusAutoNow} (should ${run.l1Start.shouldBe}), err median ${run.l1Play.errMedian}`);
    out.runs.push(run);
    await ctx.close();
  }
  // 측정 치우침으로 σ70 봇 (판정 오차 = 탭 시각 기준 bias, 음수 = 이르게 판정)
  const calibRuns = out.runs.filter((r) => !r.skip && r.X === 0);
  const bias = Math.round(med(calibRuns.map((r) => r.l1Play.errMedian)));
  const p70 = bal.bots.profiles.child_sd70;
  out.bots = { bias_ms: bias, note: 'runProfile(child_sd70, N 20000, sessions 2000, seed 12345). device = 기기 남은 오차 U(−20, +40)(20-balance 8-1 가정)를 세션마다 더함', levels: [] };
  for (const L of CL) {
    const base = runProfile(L, p70, bal, { N: 20000, sessions: 2000, seed: 12345, bias: 0 });
    const sh = runProfile(L, p70, bal, { N: 20000, sessions: 2000, seed: 12345, bias });
    const shDev = runProfile(L, p70, bal, { N: 20000, sessions: 2000, seed: 12345, sessionBias: (rng) => bias - 20 + 60 * rng.rnd() });
    out.bots.levels.push({ level: L.level.id, base_median: base.median_first_clear_sessions, base_cont: base.median_first_clear_continuous, shifted_median: sh.median_first_clear_sessions, shifted_cont: sh.median_first_clear_continuous, shifted_dev_median: shDev.median_first_clear_sessions, shifted_clear_rate: sh.clear_rate, base_clear_rate: base.clear_rate });
    console.log(`  bots ${L.level.id}: base ${base.median_first_clear_sessions} → bias ${bias}: ${sh.median_first_clear_sessions} (dev ${shDev.median_first_clear_sessions})`);
  }
  return out;
}

// ---------------- 실행 ----------------
const parts = { static: async () => partStatic(), shots: partShots, replay: partReplay, realtime: partRealtime, bots: partBots, perf: partPerf, features: partFeatures, calib: partCalib, signals: partSignals, cards: partCards, r2: partR2, perfctl: partPerfCtl, firstrun: partFirstRun };
const list = PART === 'all' ? Object.keys(parts).filter((k) => k !== 'perfctl' && k !== 'firstrun') : PART.split(',');
const PERF_TAG = opt('--perf-tag', '');
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
  const fname = (name === 'perf' || name === 'perfctl') && PERF_TAG ? `${name}-${PERF_TAG}` : name;
  writeFileSync(join(PARTS, `${fname}.json`), JSON.stringify(res, null, 1));
  console.log(`[${name}] 끝 ${res.seconds}s, console ${LOG.console.length + LOG.pageerrors.length}, failed ${LOG.failed.length}, external ${LOG.external.length}`);
}
await stopAll();
process.exit(0);
