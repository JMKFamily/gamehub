#!/usr/bin/env node
// 웹 빌드 브라우저 자체 확인 (playwright-core + 설치된 Edge/Chrome, 다운로드 없음)
//
//   PLAYWRIGHT_CORE=<playwright-core 폴더> node projects/rhythm-01/tools/selfcheck-browser.mjs [--channel msedge] [--out <폴더>] [--quick]
//
// 1) ?test=1: 레벨 1~10 완벽 입력열 클리어(등급 3), ±40 ms 오프셋 입력 클리어, 무입력 실패 → 1.08 s 뒤 자동 재시작
// 2) 일반 모드(오디오 켜짐, rAF + PointerEvent): 타이틀 실제 클릭 → 첫 실행 보정(건너뛰기 클릭) → 카드 → 완벽 입력 실시간 클리어
// 3) 4해상도 화면별 스크린샷 + 버튼 48 px·겹침·화면 밖 검사, 콘솔 에러·외부 요청 수집
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

const PROJ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const channel = opt('--channel', 'msedge');
const OUT = resolve(opt('--out', join(tmpdir(), 'rhythm01-selfcheck')));
const QUICK = args.includes('--quick');
const PORT = +opt('--port', 8340 + Math.floor(Math.random() * 40)); // rhythm-01 game-developer 대역 8340~8379 (round-3)
if (PORT < 8340 || PORT > 8379) { console.error('포트는 8340~8379 만'); process.exit(2); }
const D_MIN_SINCE_UNLOCK = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8')).audio_latency.auto_latency_read.stable_wait.min_since_unlock_ms; // R11 안정 대기 최소 시간
const BASE = `http://localhost:${PORT}/games/rhythm-01/`;
mkdirSync(OUT, { recursive: true });

let pw;
for (const t of [process.env.PLAYWRIGHT_CORE && pathToFileURL(process.env.PLAYWRIGHT_CORE.replace(/[\\/]$/, '') + '/index.mjs').href, 'playwright', 'playwright-core'].filter(Boolean)) {
  try { const m = await import(t); pw = m.chromium ? m : m.default; break; } catch {}
}
if (!pw) { console.error('playwright-core 를 찾지 못함 (PLAYWRIGHT_CORE)'); process.exit(2); }

const server = spawn(process.execPath, [join(PROJ, 'tools/serve.mjs'), String(PORT)], { stdio: 'ignore' });
console.log(`serve.mjs pid ${server.pid} port ${PORT}`);
for (let k = 0; k < 60; k++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const browser = await pw.chromium.launch({ channel, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const rep = { base: BASE, channel, console: [], external: [], failed: [], test: [], realtime: [], ui: [], shots: [] };
let bad = 0;
const fail = (m) => { bad++; console.log('FAIL', m); };

async function open(w, h, q = '?test=1', { fresh = true, dsf = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, hasTouch: false });
  const p = await ctx.newPage();
  const tag = `${w}x${h}${q}`;
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) rep.console.push(`[${tag}] ${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => rep.console.push(`[${tag}] pageerror: ${e.message}`));
  p.on('request', (r) => { const u = new URL(r.url()); if (/^(https?|wss?):$/.test(u.protocol) && !['localhost', '127.0.0.1'].includes(u.hostname)) rep.external.push(r.url()); });
  p.on('response', (r) => { if (r.status() >= 400) rep.failed.push(`[${tag}] ${r.url()} ${r.status()}`); });
  await p.goto(BASE + q);
  await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 15000 });
  if (fresh) await p.evaluate(() => localStorage.clear());
  return { ctx, p };
}
const shot = async (p, name) => { await p.waitForTimeout(60); await p.screenshot({ path: join(OUT, name) }); rep.shots.push(name); };

// 화면 안 보이는 버튼 검사: 48 px 이상, 화면 안, 서로 겹침 1 px 초과 없음
async function checkButtons(p, tag) {
  const r = await p.evaluate(() => {
    const els = [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null || getComputedStyle(b).position === 'fixed');
    const rects = els.map((b) => { const r = b.getBoundingClientRect(); return { id: b.id || b.className || b.getAttribute('aria-label'), x: r.left, y: r.top, w: r.width, h: r.height }; }).filter((r) => r.w > 0 && r.h > 0);
    const out = [];
    const W = innerWidth, H = innerHeight;
    const grid = document.getElementById('grid');
    for (const r of rects) {
      if (r.w < 47.5 || r.h < 47.5) out.push(`small ${r.id} ${r.w.toFixed(0)}x${r.h.toFixed(0)}`);
      const inGrid = grid && grid.offsetParent !== null && r.y + r.h > grid.getBoundingClientRect().top && grid.classList.contains('scrolls');
      if (!inGrid && (r.x < -0.5 || r.y < -0.5 || r.x + r.w > W + 0.5 || r.y + r.h > H + 0.5)) out.push(`offscreen ${r.id}`);
    }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 1 && oy > 1) out.push(`overlap ${a.id} / ${b.id}`);
    }
    return { n: rects.length, issues: out, scroll: grid && grid.classList.contains('scrolls') };
  });
  rep.ui.push({ tag, ...r });
  for (const m of r.issues) fail(`${tag}: ${m}`);
  return r;
}

// ---- 1) 테스트 모드 ----
{
  const { ctx, p } = await open(1280, 720);
  const res = await p.evaluate(() => {
    const g = window.__game, out = [];
    for (let i = 0; i < 10; i++) {
      for (const [off, sd] of [[0, 0], [-40, 0], [40, 0], [0, 25]]) {
        g.loadLevel(i);
        const r = g.autoplay(off, sd, 7 + i);
        out.push({ level: i + 1, off, sd, ...r });
      }
      // 무입력
      g.loadLevel(i);
      let failAt = null, restart = null;
      const t0 = g.gameClock();
      for (let k = 0; k < 4000 && g.attempts < 2; k++) { g.step(0.002); if (g.phase === 'fail' && failAt === null) failAt = g.gameClock(); }
      restart = g.gameClock();
      out.push({ level: i + 1, none: true, attempts: g.attempts, failToRestartMs: restart - failAt, history: g.history()[0] });
      void t0;
    }
    return out;
  });
  for (const r of res) {
    rep.test.push(r);
    if (r.none) { if (r.attempts !== 2 || r.history?.clear || Math.abs(r.failToRestartMs - 1080) > 3) fail(`test L${r.level} 무입력 ${JSON.stringify(r)}`); }
    else if (!r.clear || (r.off === 0 && r.sd === 0 && r.grade !== 3)) fail(`test L${r.level} off ${r.off} sd ${r.sd}: ${JSON.stringify(r)}`);
  }
  console.log(`test 모드: ${res.filter((r) => r.clear).length}/40 클리어, 무입력 ${res.filter((r) => r.none && r.attempts === 2).length}/10 재시작`);
  await ctx.close();
}

// ---- 2) 일반 모드 실시간 ----
{
  const levels = QUICK ? [0, 9] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  // 첫 실행 흐름은 레벨 1 페이지에서 실제 클릭으로
  const runLevel = async (i) => {
    const { ctx, p } = await open(1280, 720, '');
    if (i === 0) {
      await p.mouse.click(640, 400); // 타이틀 탭 → 보정
      await p.waitForFunction(() => window.__game.state === 'calib');
      const flow = { calib: true, ctx: await p.evaluate(() => window.__game.audioTime()) };
      await p.click('#bSkip');
      await p.waitForFunction(() => window.__game.state === 'card');
      await p.mouse.click(640, 400); // 카드 닫기
      await p.waitForFunction(() => window.__game.state === 'play');
      rep.realtime.push({ level: 1, flow });
    } else {
      await p.mouse.click(640, 400);
      await p.evaluate(() => window.__game.skipCalibration());
      await p.evaluate((i) => window.__game.loadLevel(i), i);
    }
    const r = await p.evaluate(() => window.__game.autoplay(0, 0));
    const lat = await p.evaluate(() => ({ ...window.__game.latency(), log: window.__game.judgeLog().map((j) => Math.round(j.e)) }));
    const errs = lat.log.map(Math.abs);
    rep.realtime.push({ level: i + 1, ...r, latency: { auto: lat.auto, comp: lat.comp }, maxAbsErrMs: Math.max(...errs), meanErrMs: errs.reduce((a, b) => a + b, 0) / errs.length });
    if (!r.clear) fail(`realtime L${i + 1}: ${JSON.stringify(r)}`);
    console.log(`realtime L${i + 1}: ${r.clear ? 'clear' : 'FAIL'} grade ${r.grade} max|e| ${Math.max(...errs)} ms, auto latency ${lat.auto.toFixed(1)} ms`);
    await ctx.close();
  };
  for (let k = 0; k < levels.length; k += 5) await Promise.all(levels.slice(k, k + 5).map(runLevel));
  // Playwright 실제 마우스(CDP 입력) 로 레벨 1·2: 다음 별 시각 8 ms 전에 mouse.down
  for (const i of [0, 1]) {
    const { ctx, p } = await open(1280, 720, '');
    await p.mouse.click(640, 400);
    await p.evaluate((i) => { window.__game.skipCalibration(); window.__game.loadLevel(i); }, i);
    await p.waitForFunction(() => window.__game.state === 'play', null, { timeout: 5000 }); // R11: 잠금 해제 뒤 첫 시도는 자동 지연 안정 뒤 시작
    for (let k = 0; k < 400; k++) {
      const st = await p.evaluate(() => window.__game.state);
      if (st !== 'play') break;
      const wait = await p.evaluate(() => { const t = window.__game.nextStarPerfTime(); return t === null ? null : t - performance.now(); });
      if (wait === null) { await p.waitForTimeout(100); continue; }
      if (wait > 60) await p.waitForTimeout(wait - 50);
      await p.evaluate(() => new Promise((res) => { const t = window.__game.nextStarPerfTime(); const f = () => (t === null || performance.now() >= t - 8 ? res() : setTimeout(f, 1)); f(); }));
      await p.mouse.down({ button: 'left' }); await p.mouse.up({ button: 'left' });
      await p.waitForTimeout(30);
    }
    const r = await p.evaluate(() => ({ ...window.__game.summary(), errs: window.__game.judgeLog().map((j) => Math.round(j.e)) }));
    rep.realtime.push({ level: i + 1, input: 'playwright-mouse', ...r });
    console.log(`realtime mouse L${i + 1}: ${r.clear ? 'clear' : 'FAIL'} grade ${r.grade} attempts ${r.attempts} e(ms) ${r.errs.join(',')}`);
    if (!r.clear || r.attempts !== 1) fail(`realtime mouse L${i + 1}: ${JSON.stringify(r)}`);
    await ctx.close();
  }
}

// ---- 3) 화면별 스크린샷·버튼 검사 ----
for (const [w, h] of [[360, 640], [412, 915], [640, 360], [1280, 720]]) {
  const tag = `${w}x${h}`;
  const { ctx, p } = await open(w, h);
  const g = (f, a) => p.evaluate(f, a);
  await g(() => window.__game.show('title')); await shot(p, `${tag}-title.png`); await checkButtons(p, `${tag} title`);
  await g(() => window.__game.show('calib')); await g(() => { for (let k = 0; k < 3; k++) window.__game.calibTap(10); }); await shot(p, `${tag}-calib.png`); await checkButtons(p, `${tag} calib`);
  await g(() => { const G = window.__game; for (let k = 0; k < 13; k++) G.calibTap(k % 2 ? 12 : 8); G.step(0.3); }); await shot(p, `${tag}-calib-done.png`);
  await g(() => window.__game.step(1.2));
  await g(() => { const G = window.__game; const s = G.save(); void s; });
  await g(() => window.__game.show('levels')); await shot(p, `${tag}-levels-new.png`); await checkButtons(p, `${tag} levels`);
  // 진행 상태 만들기: L1~L3 클리어
  await g(() => { const G = window.__game; for (const i of [0, 1, 2]) { G.loadLevel(i); G.autoplay(i ? 30 : 0, 0); } G.loadLevel(3, { practice: true }); G.autoplay(0, 0); G.show('levels'); });
  await shot(p, `${tag}-levels.png`); await checkButtons(p, `${tag} levels2`);
  await g(() => window.__game.show('settings')); await shot(p, `${tag}-settings.png`); await checkButtons(p, `${tag} settings`);
  await g(() => window.__game.show('confirm')); await shot(p, `${tag}-confirm.png`); await checkButtons(p, `${tag} confirm`);
  // 카드
  await g(() => { localStorage.clear(); });
  await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
  await g(() => window.__game.loadLevel(0, { card: true })); await shot(p, `${tag}-card-l1.png`);
  await g(() => window.__game.press());
  // 레벨 1: 손가락 튜토리얼 시점, 보여 주기 마디
  await g(() => { const G = window.__game; const st = G.stars()[0]; G.step((st.t - 300 + 400) / 1000); });
  await shot(p, `${tag}-play-l1-show-hand.png`); await checkButtons(p, `${tag} play`);
  await g(() => { const G = window.__game; const st = G.stars()[0]; G.pressAt(st.t); G.step(0.05); });
  await shot(p, `${tag}-play-l1-perfect.png`);
  // 실패 연출
  await g(() => { const G = window.__game; const st = G.stars()[1]; G.step((st.passEnd - G.levelTime()) / 1000 + 0.12); });
  await shot(p, `${tag}-fail-0.12s.png`);
  await g(() => window.__game.step(0.85)); await shot(p, `${tag}-fail-0.97s.png`);
  // 레벨 7 (반박 4연속) 플레이 중
  await g(() => { const G = window.__game; G.loadLevel(6); const s = G.stars(); for (const st of s.slice(0, 10)) G.pressAt(st.t); G.step(0.03); });
  await shot(p, `${tag}-play-l7.png`);
  // 레벨 6 보여 주기(북채)
  await g(() => { const G = window.__game; G.loadLevel(5); const s = G.stars(); for (const st of s.slice(0, 3)) G.pressAt(st.t); G.step(2.9); });
  await shot(p, `${tag}-play-l6-show.png`);
  // 일시정지
  await g(() => window.__game.show('pause')); await shot(p, `${tag}-pause.png`); await checkButtons(p, `${tag} pause`);
  // 클리어 + 결과 (레벨 10)
  await g(() => { const G = window.__game; G.loadLevel(9); const s = G.stars(); for (const st of s) G.pressAt(st.t); G.step(2.2); });
  await shot(p, `${tag}-clear-l10.png`);
  await g(() => { const G = window.__game; for (let k = 0; k < 200 && G.state !== 'result'; k++) G.step(0.1); });
  await shot(p, `${tag}-result-l10.png`); await checkButtons(p, `${tag} result`);
  // 연습 모드
  await g(() => { const G = window.__game; G.loadLevel(2, { practice: true }); const s = G.stars(); for (const st of s.slice(0, 8)) G.pressAt(st.t); G.step(0.4); });
  await shot(p, `${tag}-practice-l3.png`);
  // 영어
  await p.goto(BASE + '?test=1&lang=en'); await p.waitForFunction(() => window.__game?.ready === true);
  await g(() => window.__game.show('levels')); await shot(p, `${tag}-en-levels.png`);
  await g(() => window.__game.show('settings')); await shot(p, `${tag}-en-settings.png`);
  await ctx.close();
}

// ---- 4) 저장 유지 ----
{
  const { ctx, p } = await open(640, 360);
  await p.evaluate(() => { const G = window.__game; G.loadLevel(0); G.autoplay(0, 0); G.setOffset(120); });
  await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
  const s = await p.evaluate(() => window.__game.save());
  if (s.unlocked < 2 || s.levels['01']?.grade !== 3 || s.offsetMs !== 120) fail(`save ${JSON.stringify(s)}`);
  const lh = await p.evaluate(() => { window.__game.show('levels'); return window.__game.lateHint(); });
  if (!lh.visible) fail('late hint (오프셋 120 > 100) 표지 안 보임');
  rep.save = { unlocked: s.unlocked, grade01: s.levels['01']?.grade, offsetMs: s.offsetMs, lateHint: lh };
  // 보호자 문: 짧게 누르면 그대로, 2 s 넘게 누르면 설정
  const b = await p.locator('#bGate').boundingBox();
  await p.mouse.move(b.x + 24, b.y + 24); await p.mouse.down(); await p.waitForTimeout(300); await p.mouse.up(); await p.waitForTimeout(100);
  const s1 = await p.evaluate(() => window.__game.state);
  await p.mouse.down(); await p.waitForTimeout(1500); await shot(p, '640x360-gate-holding.png');
  const s2 = await p.evaluate(() => window.__game.state);
  await p.waitForTimeout(700); await p.mouse.up();
  const s3 = await p.evaluate(() => window.__game.state);
  rep.gate = { short: s1, at1500: s2, after2200: s3 };
  if (s1 !== 'levels' || s2 !== 'levels' || s3 !== 'settings') fail(`보호자 문 ${JSON.stringify(rep.gate)}`);
  await ctx.close();
}
// ---- 5) 백그라운드 → 일시정지 (일반 모드) ----
{
  const { ctx, p } = await open(640, 360, '');
  await p.mouse.click(320, 200);
  await p.evaluate(() => { window.__game.skipCalibration(); window.__game.loadLevel(0); });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  const st = await p.evaluate(() => window.__game.state);
  await shot(p, '640x360-pause-background.png');
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.mouse.click(100, 300); await p.waitForTimeout(300);
  const st2 = await p.evaluate(() => ({ state: window.__game.state, attempts: window.__game.attempts, phase: window.__game.phase }));
  rep.background = { onHide: st, afterTap: st2 };
  if (st !== 'pause' || st2.state !== 'play' || st2.attempts !== 1) fail(`백그라운드 일시정지 ${JSON.stringify(rep.background)}`);
  await ctx.close();
}

// ---- 6) round-2 검사 (R1·R4·R6·R8·R9) ----
rep.r2 = {};
{
  // R1: 그린 프레임 기준 손가락·북채 동시 표시 0 (레벨 1, 8 ms 간격), L6 두 마디 묶음은 둘째 마디에도 북채
  const { ctx, p } = await open(412, 915, '?test=1', { dsf: 1 });
  const r1 = await p.evaluate(() => {
    const G = window.__game; G.loadLevel(0);
    let both = 0, firstHand = null, lastMallet = null, n = 0;
    for (let k = 0; k < 900; k++) {
      G.step(0.008); const f = G.drawNow(); n++;
      if (f.handOn && f.malletOn) both++;
      if (f.handOn && firstHand === null) firstHand = f.levelTime;
      if (f.malletOn && firstHand === null) lastMallet = f.levelTime;
    }
    G.loadLevel(5); const L6 = []; for (let k = 0; k < 1500; k++) { G.step(0.008); L6.push(G.drawNow().malletOn ? 1 : 0); }
    return { frames: n, both, firstHand, lastMallet, l6MalletFrames: L6.reduce((a, b) => a + b, 0) };
  });
  rep.r2.R1 = r1;
  if (r1.both || r1.firstHand === null || r1.lastMallet === null || r1.firstHand <= r1.lastMallet) fail(`R1 손가락·북채 ${JSON.stringify(r1)}`);
  console.log(`R1: 프레임 ${r1.frames}, 동시 표시 ${r1.both}, 북채 마지막 ${Math.round(r1.lastMallet)} ms → 손가락 ${Math.round(r1.firstHand)} ms`);
  await ctx.close();
}
for (const [w, h] of [[360, 640], [412, 915], [640, 360], [1280, 720]]) {
  const tag = `${w}x${h}`;
  const { ctx, p } = await open(w, h);
  const g = (f, a) => p.evaluate(f, a);
  const out = {};
  // R4: 그림 카드 (세로 = _portrait.svg), 카드 속 공 지름 28(카드 단위) → 화면 px ≥ 16
  await g(() => window.__game.loadLevel(0, { card: true }));
  await p.waitForFunction(() => document.getElementById('cardImg').complete);
  const PW = JSON.parse(readFileSync(join(PROJ, '..', '..', 'games', 'rhythm-01', 'data', 'art.json'), 'utf8')).card.portrait.w; // 세로판 폭 (round-3 226, 공은 세로판에서 1.2배)
  out.card = await g((PW) => { const im = document.getElementById('cardImg'); const r = im.getBoundingClientRect(); const portrait = innerWidth < innerHeight; return { src: im.getAttribute('src'), w: r.width, h: r.height, ballPx: 28 * (portrait ? 1.2 : 1) * r.width / (portrait ? PW : 720), inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; }, PW);
  if ((w < h) !== out.card.src.endsWith('_portrait.svg') || out.card.ballPx < 16 || !out.card.inside) fail(`R4 ${tag} 카드 ${JSON.stringify(out.card)}`);
  await shot(p, `${tag}-r2-card.png`);
  // N12: 손가락 칸 = max(64, 0.45R)
  out.hand = await g(() => { const l = window.__game.layout(); return { size: l.hand.size, x: l.hand.x, y: l.hand.y, R: l.R, thumbH: l.thumb ? l.thumb.h : null }; });
  {
    const want = out.hand.thumbH ? Math.min(Math.max(64, 0.45 * out.hand.R), out.hand.thumbH - 16) : Math.max(64, 0.45 * out.hand.R);
    if (Math.abs(out.hand.size - want) > 0.5) fail(`N12 ${tag} 손가락 ${JSON.stringify(out.hand)}`);
  }
  // N2: 타이틀 힌트가 궤도(띠 + 별)와 겹치지 않음
  await g(() => window.__game.show('title'));
  out.title = await g(() => { const l = window.__game.layout(); const rs = [...document.getElementById('tapStart').children].map((e) => e.getBoundingClientRect()); const r = { left: Math.min(...rs.map((q) => q.left)), top: Math.min(...rs.map((q) => q.top)), right: Math.max(...rs.map((q) => q.right)), bottom: Math.max(...rs.map((q) => q.bottom)) }; r.width = r.right - r.left; r.height = r.bottom - r.top; const cx = Math.max(r.left, Math.min(l.cx, r.right)), cy = Math.max(r.top, Math.min(l.cy, r.bottom)); const far = [[r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom]].map(([x, y]) => Math.hypot(x - l.cx, y - l.cy)); const near = Math.hypot(cx - l.cx, cy - l.cy); const ring = l.R + l.band / 2 + l.starR; return { rect: [r.left, r.top, r.width, r.height].map(Math.round), clearOfOrbit: near > ring || Math.max(...far) < l.R - l.band / 2 - 2, inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; });
  if (!out.title.clearOfOrbit || !out.title.inside) fail(`N2 ${tag} 타이틀 힌트 ${JSON.stringify(out.title)}`);
  // N1·N6: 레벨 카드 줄 흐름 겹침 0, 진행도 줄
  await g(() => { const G = window.__game; G.loadLevel(0); G.autoplay(0, 0); G.loadLevel(1); const s = G.stars(); for (const st of s.slice(0, 12)) G.pressAt(st.t); G.step(2); G.loadLevel(1, { practice: true }); G.autoplay(0, 0); G.show('levels'); });
  out.levels = await g(() => {
    const bad = [];
    document.querySelectorAll('.lcard').forEach((c, i) => {
      const pr = c.querySelector('.lplay').getBoundingClientRect();
      const rows = [...c.querySelector('.lplay').children].map((e) => e.getBoundingClientRect());
      rows.forEach((r, k) => {
        if (r.top < pr.top - 0.5 || r.bottom > pr.bottom + 0.5) bad.push(`L${i + 1} 줄 ${k} 밖`);
        if (k && r.top - rows[k - 1].bottom < 3.5) bad.push(`L${i + 1} 줄 ${k - 1}-${k} 간격 ${(r.top - rows[k - 1].bottom).toFixed(1)}`);
      });
      const nm = c.querySelector('.lname'); if (nm && nm.scrollWidth > nm.clientWidth + 0.5) bad.push(`L${i + 1} 이름 잘림`);
    });
    const l2 = document.querySelectorAll('.lcard')[1].querySelector('.lplay svg:nth-of-type(3)');
    return { bad, l2Progress: !!(l2 && l2.querySelector('circle')), cardIcon: [...document.querySelectorAll('.lrow img')].some((im) => im.getAttribute('src').endsWith('icon-card.svg')) };
  });
  if (out.levels.bad.length || !out.levels.l2Progress || !out.levels.cardIcon) fail(`N1·N6·N11 ${tag} ${JSON.stringify(out.levels)}`);
  await shot(p, `${tag}-r2-levels.png`);
  // N5·R8-7: 확인 창 첫 초점 = 취소, 두 버튼 모두 그림
  await g(() => window.__game.show('confirm'));
  out.confirm = await g(() => ({ focus: document.activeElement && document.activeElement.id, imgs: ['cfNo', 'cfYes'].map((id) => !!document.getElementById(id).querySelector('img')), dialog: document.querySelector('#sConfirm [role=dialog]')?.getAttribute('aria-labelledby') }));
  if (out.confirm.focus !== 'cfNo' || !out.confirm.imgs.every(Boolean) || !out.confirm.dialog) fail(`N5 ${tag} 확인 창 ${JSON.stringify(out.confirm)}`);
  await shot(p, `${tag}-r2-confirm.png`);
  // N16·R8-2: 레벨 10 결과 = 버튼 2개, 등급 줄 대체 글
  await g(() => { const G = window.__game; G.loadLevel(9); G.autoplay(0, 0); for (let k = 0; k < 200 && G.state !== 'result'; k++) G.step(0.1); });
  out.result = await g(() => { const vis = [...document.querySelectorAll('#resultBtns button')].filter((b) => b.offsetParent !== null).map((b) => b.id); return { vis, grade: document.getElementById('gradeAria').getAttribute('aria-label'), role: document.getElementById('gradeAria').getAttribute('role') }; });
  if (out.result.vis.join() !== 'bRetry,bLevels' || !out.result.grade || out.result.role !== 'img') fail(`N16 ${tag} 결과 ${JSON.stringify(out.result)}`);
  await checkButtons(p, `${tag} r2 result`);
  await shot(p, `${tag}-r2-result-l10.png`);
  rep.r2[tag] = out;
  console.log(`r2 ${tag}: 카드 ${out.card.src.split('/').pop()} 공 ${out.card.ballPx.toFixed(1)} px, 손가락 ${out.hand.size.toFixed(0)} px, 타이틀 힌트 겹침 없음 ${out.title.clearOfOrbit}, 레벨 카드 문제 ${out.levels.bad.length}, 확인 창 초점 ${out.confirm.focus}, L10 결과 ${out.result.vis.join('+')}`);
  await ctx.close();
}
{
  // R8: aria (시도 meter, 설정 버튼 이름·설명, 체크포인트 깃발, 불러오기 실패 ↻)
  const { ctx, p } = await open(640, 360);
  const r8 = await p.evaluate(() => {
    const G = window.__game, T = (k) => k; void T;
    G.loadLevel(2, { practice: true }); G.step(1);
    const at = document.getElementById('attAria');
    const flags = [...document.querySelectorAll('#cpFlags [role=img]')].map((e) => e.getAttribute('aria-label'));
    const a1 = { role: at.getAttribute('role'), now: at.getAttribute('aria-valuenow'), label: at.getAttribute('aria-label') };
    let guard = 0; const att = G.attempts; while (G.attempts === att && guard++ < 400) G.step(0.05);
    const a2 = at.getAttribute('aria-valuenow'), attempts = G.attempts;
    G.show('levels');
    const gb = document.getElementById('bGate');
    return { a1, a2, attempts, flags, gate: { label: gb.getAttribute('aria-label'), desc: document.getElementById(gb.getAttribute('aria-describedby'))?.textContent } };
  });
  const strings = await p.evaluate(() => fetch('data/strings.json').then((r) => r.json()));
  const T = strings.ko;
  if (r8.a1.role !== 'meter' || r8.a1.label !== T.aria_attempts || r8.a1.now !== '1' || r8.a2 !== String(r8.attempts) || /\d/.test(r8.a1.label)) fail(`R8-1 ${JSON.stringify(r8)}`);
  if (!r8.flags.length || r8.flags.some((f) => f !== T.aria_checkpoint)) fail(`R8-4 ${JSON.stringify(r8.flags)}`);
  if (r8.gate.label !== T.btn_settings || r8.gate.desc !== T.guardian_hold) fail(`R8-3 ${JSON.stringify(r8.gate)}`);
  rep.r2.R8 = r8;
  await ctx.close();
  // R8-5: 불러오기 실패 화면 (data/balance.json 막음)
  const ctx2 = await browser.newContext({ viewport: { width: 360, height: 640 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => rep.console.push(`[load-fail] pageerror: ${e.message}`));
  await p2.route('**/data/balance.json', (r) => r.abort());
  await p2.goto(BASE);
  await p2.waitForSelector('#bReload:not(.hidden)', { timeout: 10000 });
  const lf = await p2.evaluate(() => { const b = document.getElementById('bReload'); return { label: b.getAttribute('aria-label'), desc: document.getElementById(b.getAttribute('aria-describedby'))?.textContent, pic: document.getElementById('loadPic').getAttribute('aria-label') }; });
  await p2.screenshot({ path: join(OUT, '360x640-r2-load-fail.png') }); rep.shots.push('360x640-r2-load-fail.png');
  if (lf.label !== T.btn_retry || lf.desc !== T.load_error || lf.pic !== T.loading) fail(`R8-5 ${JSON.stringify(lf)}`);
  rep.r2.R8_5 = lf;
  await ctx2.close();
  console.log(`R8: 시도 meter ${r8.a1.now}→${r8.a2}, 깃발 ${r8.flags.length}개, 설정 "${r8.gate.label}"+설명, 불러오기 실패 ↻ "${lf.label}"`);
}
{
  // R11 (round-3): 자동 지연이 잠금 해제 200 ms 뒤 10 → 66 ms 로 바뀌는 흉내. 빈 저장소 → 타이틀 클릭 → 첫 보정(안정 대기)
  // → 들리는 박(예약 + 탭 순간 autoNow) + 45 ms 에 16탭 → 오프셋 ≈ 45 (이중 보정이면 ≈ 101) → L1 comp − autoNow = 오프셋
  // → 실패 중 자동 지연 +64 ms 바뀜 → 다음 시도 comp 다시 읽음 + 재시작 간격 그대로(restart_keeps_delay)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(() => {
    window.__latMock = { jumpAt: 200, before: 0.010, after: 0.066, extra: 0 };
    Object.defineProperty(AudioContext.prototype, 'outputLatency', { configurable: true, get() { const m = window.__latMock; if (!this.__t0) this.__t0 = performance.now(); return (performance.now() - this.__t0 < m.jumpAt ? m.before : m.after) + m.extra; } });
    Object.defineProperty(AudioContext.prototype, 'baseLatency', { configurable: true, get() { return 0; } });
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => rep.console.push(`[R11] pageerror: ${e.message}`));
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) rep.console.push(`[R11] ${m.type()}: ${m.text()}`); });
  await p.goto(BASE);
  await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 15000 });
  await p.mouse.click(640, 400);
  await p.waitForFunction(() => window.__game.state === 'calib');
  const w0 = await p.evaluate(() => window.__game.calibInfo().phase);
  await p.waitForFunction(() => window.__game.calibInfo()?.phase === 'tap', null, { timeout: 5000 });
  const st = await p.evaluate(() => window.__game.latency().stable);
  const HUMAN = 45;
  const taps = await p.evaluate(async (human) => {
    const g = window.__game, ci = g.calibInfo();
    const offNow = () => { let o = -1e9; for (let k = 0; k < 40; k++) o = Math.max(o, g.audioTime() - performance.now() / 1000); return o; };
    const cv = document.getElementById('cv'), out = [];
    for (let k = 0; k < 16; k++) {
      const an = g.latency().autoNow;
      const tA = ci.base + k * ci.beatMs + an + human; // 들리는 박 + 사람 오차 (오디오 ms)
      while ((tA / 1000 - offNow()) * 1000 - performance.now() > 25) await new Promise((r) => setTimeout(r, 10));
      const target = (tA / 1000 - offNow()) * 1000; // 탭 직전에 시계 대응을 다시 잼(부하 때 오디오 시계 흔들림)
      while (performance.now() < target) {}
      cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true, button: 0, clientX: 640, clientY: 400 }));
      out.push(an);
    }
    return out;
  }, HUMAN);
  const cal = await p.evaluate(() => ({ save: window.__game.save(), info: window.__game.calibInfo() }));
  await p.waitForFunction(() => window.__game.state === 'card', null, { timeout: 5000 });
  await p.mouse.click(640, 400);
  await p.waitForFunction(() => window.__game.state === 'play' && window.__game.phase === 'run');
  const l1 = await p.evaluate(() => window.__game.latency());
  // 실패 → 재시작 간격 (dc 0 한 번, dc +64 한 번)
  const gap = async (extra) => {
    return p.evaluate(async (extra) => {
      const g = window.__game, att = g.attempts;
      await new Promise((r) => { const f = () => (g.phase === 'fail' ? r() : requestAnimationFrame(f)); f(); });
      const tf = performance.now(); window.__latMock.extra = extra;
      await new Promise((r) => { const f = () => (g.attempts > att && g.phase === 'run' ? r() : requestAnimationFrame(f)); f(); });
      return { ms: performance.now() - tf, lat: g.latency() };
    }, extra);
  };
  const g0 = await gap(0), g1 = await gap(0.064);
  const r11 = { waitPhase: w0, stable: st, tapAutoNows: [...new Set(taps.map((x) => Math.round(x)))], offset: cal.save.offsetMs, calibAutoLat: cal.save.calibAutoLat, l1, restart0: g0, restart64: g1 };
  rep.r3 = { R11: r11 };
  if (w0 !== 'wait' || !st || st.t < D_MIN_SINCE_UNLOCK) fail(`R11 안정 대기 ${JSON.stringify({ w0, st })}`);
  if (Math.abs(r11.offset - HUMAN) > 10) fail(`R11 보정 오프셋 ${r11.offset} (기대 ${HUMAN} ±10)`);
  if (Math.abs(l1.comp - l1.autoNow - r11.offset) > 1e-6 || Math.abs(l1.auto - l1.autoNow) > 1e-6) fail(`R11 L1 comp ${JSON.stringify(l1)}`);
  if (Math.abs(g1.lat.comp - g0.lat.comp - 64) > 0.5) fail(`R11 재시작 다시 읽기 ${g0.lat.comp} → ${g1.lat.comp}`);
  if (Math.abs(g1.ms - g0.ms) > 25) fail(`R11 재시작 간격 dc 0 ${g0.ms.toFixed(1)} / dc 64 ${g1.ms.toFixed(1)} ms`);
  console.log(`R11: 안정 대기 ${st.t.toFixed(0)} ms(값 ${st.v.toFixed(0)}), 보정 탭 autoNow ${r11.tapAutoNows.join('/')} → 오프셋 ${r11.offset} (사람 +${HUMAN}), L1 comp ${l1.comp.toFixed(1)} = autoNow ${l1.autoNow.toFixed(1)} + ${l1.manual}, 재시작 간격 dc0 ${g0.ms.toFixed(0)} / dc64 ${g1.ms.toFixed(0)} ms (comp ${g0.lat.comp.toFixed(0)} → ${g1.lat.comp.toFixed(0)})`);
  await ctx.close();
}
{
  // R13: 테스트 훅 준비 직후(3프레임 안) 레벨 시작 → 튜토리얼 글이 북채와 함께 보이지 않음 (같은 프레임에 숨김)
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '?test=1');
  const vis = await p.evaluate(() => new Promise((res) => {
    const go = () => {
      if (!window.__game?.ready) return requestAnimationFrame(go);
      window.__game.loadLevel(0); window.__game.step(0.15);
      const t = document.getElementById('tut');
      res({ cls: t.classList.contains('hidden'), vis: getComputedStyle(t).visibility, warm: document.getElementById('sPlay').classList.contains('warm') });
    };
    go();
  }));
  rep.r3 = { ...(rep.r3 || {}), R13: vis };
  if (vis.vis !== 'hidden' || !vis.cls || vis.warm) fail(`R13 튜토리얼 글 ${JSON.stringify(vis)}`);
  console.log(`R13: 준비 직후 레벨 시작 튜토리얼 글 visibility ${vis.vis}, warm ${vis.warm}`);
  await ctx.close();
}
{
  // R16: 영어 360x640 레벨 선택 L9 "Above the Clouds" 가 숨겨지지 않고(글자 축소 또는 두 줄) 잘린 글 0
  const { ctx, p } = await open(360, 640, '?test=1&lang=en');
  await p.evaluate(() => window.__game.show('levels'));
  const nm = await p.evaluate(() => [...document.querySelectorAll('.lplay')].map((b) => { const n = b.querySelector('.lname'); return n ? { t: n.textContent, fs: n.style.fontSize || '12px', two: n.classList.contains('two'), clip: n.scrollWidth > n.clientWidth + 0.5 || (n.classList.contains('two') && n.scrollHeight > n.clientHeight + 0.5) } : null; }));
  rep.r3 = { ...(rep.r3 || {}), R16: nm };
  if (!nm[8] || nm.some((x) => x && x.clip)) fail(`R16 이름 ${JSON.stringify(nm)}`);
  console.log(`R16: en 360x640 L9 ${nm[8] ? `"${nm[8].t}" ${nm[8].fs}${nm[8].two ? ' 두 줄' : ''}` : '숨김'}, 이름 보임 ${nm.filter(Boolean).length}/10, 잘림 ${nm.filter((x) => x && x.clip).length}`);
  await shot(p, '360x640-r3-levels-en.png');
  await ctx.close();
}
{
  // R9: 일반 모드 자동 지연 표시값 = 판정에 쓰는 값
  const { ctx, p } = await open(1280, 720, '');
  await p.mouse.click(640, 400);
  await p.evaluate(() => window.__game.skipCalibration());
  await p.evaluate(() => window.__game.loadLevel(0));
  await p.waitForTimeout(1500);
  const lat = await p.evaluate(() => window.__game.latency());
  rep.r2.R9 = lat;
  if (Math.abs(lat.auto + lat.manual - lat.comp) > 1e-6) fail(`R9 ${JSON.stringify(lat)}`);
  console.log(`R9: auto ${lat.auto.toFixed(1)} + manual ${lat.manual} = comp ${lat.comp.toFixed(1)} (지금 값 ${lat.autoNow.toFixed(1)})`);
  await ctx.close();
}

await browser.close();
server.kill();
if (rep.console.length) fail(`콘솔 ${rep.console.length}건: ${rep.console.slice(0, 5).join(' | ')}`);
if (rep.external.length) fail(`외부 요청 ${rep.external.length}건`);
if (rep.failed.length) fail(`실패 요청 ${rep.failed.join(' | ')}`);
writeFileSync(join(OUT, 'selfcheck.json'), JSON.stringify(rep, null, 1));
console.log(`스크린샷 ${rep.shots.length}장 → ${OUT}`);
console.log(bad ? `FAIL ${bad}` : 'ALL OK');
process.exit(bad ? 1 : 0);
