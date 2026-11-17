#!/usr/bin/env node
// 웹 빌드 브라우저 자체 확인 (playwright-core + 설치된 Edge/Chrome, 다운로드 없음)
//
//   PLAYWRIGHT_CORE=<playwright-core 폴더> node projects/rhythm-01/tools/selfcheck-browser.mjs [--channel msedge] [--out <폴더>] [--quick]
//
// 1) ?test=1: 레벨 1~10 완벽 입력열 클리어(등급 3), ±40 ms 오프셋 입력 클리어, 무입력 실패 → 1.08 s 뒤 자동 재시작
// 2) 일반 모드(오디오 켜짐, rAF + PointerEvent): 타이틀 실제 클릭 → 첫 실행 보정(건너뛰기 클릭) → 카드 → 완벽 입력 실시간 클리어
// 3) 4해상도 화면별 스크린샷 + 버튼 48 px·겹침·화면 밖 검사, 콘솔 에러·외부 요청 수집
import { mkdirSync, writeFileSync } from 'node:fs';
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
const PORT = 8133 + Math.floor(Math.random() * 50);
const BASE = `http://localhost:${PORT}/games/rhythm-01/`;
mkdirSync(OUT, { recursive: true });

let pw;
for (const t of [process.env.PLAYWRIGHT_CORE && pathToFileURL(process.env.PLAYWRIGHT_CORE.replace(/[\\/]$/, '') + '/index.mjs').href, 'playwright', 'playwright-core'].filter(Boolean)) {
  try { const m = await import(t); pw = m.chromium ? m : m.default; break; } catch {}
}
if (!pw) { console.error('playwright-core 를 찾지 못함 (PLAYWRIGHT_CORE)'); process.exit(2); }

const server = spawn(process.execPath, [join(PROJ, 'tools/serve.mjs'), String(PORT)], { stdio: 'ignore' });
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

await browser.close();
server.kill();
if (rep.console.length) fail(`콘솔 ${rep.console.length}건: ${rep.console.slice(0, 5).join(' | ')}`);
if (rep.external.length) fail(`외부 요청 ${rep.external.length}건`);
if (rep.failed.length) fail(`실패 요청 ${rep.failed.join(' | ')}`);
writeFileSync(join(OUT, 'selfcheck.json'), JSON.stringify(rep, null, 1));
console.log(`스크린샷 ${rep.shots.length}장 → ${OUT}`);
console.log(bad ? `FAIL ${bad}` : 'ALL OK');
process.exit(bad ? 1 : 0);
