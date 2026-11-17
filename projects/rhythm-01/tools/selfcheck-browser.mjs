#!/usr/bin/env node
// 웹 빌드 브라우저 자체 확인 (playwright-core + 설치된 Edge/Chrome, 다운로드 없음)
//
//   PLAYWRIGHT_CORE=<playwright-core 폴더> node projects/rhythm-01/tools/selfcheck-browser.mjs [--channel msedge] [--out <폴더>] [--quick]
//
// 1) ?test=1: 레벨 1~10 완벽 입력열 클리어(등급 3), ±40 ms 오프셋 입력 클리어, 무입력 실패 → 1.08 s 뒤 자동 재시작
// 2) 일반 모드(오디오 켜짐, rAF + PointerEvent): 타이틀 실제 클릭 → 첫 실행 보정(건너뛰기 클릭) → 카드 → 완벽 입력 실시간 클리어
// 3) 4해상도 화면별 스크린샷 + 버튼 48 px·겹침·화면 밖 검사, 콘솔 에러·외부 요청 수집
// 4~5) 저장 유지·보호자 문·백그라운드 일시정지
// 6) round-3 북길: 화면 규격 = assets/layout.json, 손가락(T1)·글 자리(ko/en), 그림 카드 cards-r3, 콤보 켬/끔 봇 재판정 불일치 0(K1), 콤보 aria·화음·끊김
// 7) R11 첫 실행 보정(자동 지연 바뀜 흉내)·재시작 다시 읽기, R13 준비 직후 튜토리얼 글, R16 영어 긴 이름, R9
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
  // 레벨 1: 손가락 튜토리얼 시점(첫 별이 오른쪽에서 흘러오는 중)
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
  // 레벨 6 반박 3연속(새 기믹) 흐름
  await g(() => { const G = window.__game; G.loadLevel(5); const s = G.stars(); for (const st of s.slice(0, 3)) G.pressAt(st.t); G.step(2.9); });
  await shot(p, `${tag}-play-l6.png`);
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

// ---- 6) round-3 북길 검사 (화면 규격·손가락·글 자리·카드·콤보) + round-2 검사 중 남은 것(R4·R6·R8·R9) ----
rep.r2 = {}; rep.r3 = {};
const LJ = JSON.parse(readFileSync(join(PROJ, 'assets', 'layout.json'), 'utf8'));
{
  // T1 손가락: 그린 프레임 기준 손가락은 첫 별 1박 전 ~ 첫 별 판정까지만, 그 사이 다른 별 위험 구간 없음 (북채 검사 대체)
  const { ctx, p } = await open(412, 915, '?test=1', { dsf: 1 });
  const t1 = await p.evaluate(() => {
    const G = window.__game; G.loadLevel(0);
    const st = G.stars(), beat = G.road().beatMs;
    let first = null, last = null, n = 0, bad = 0;
    for (let k = 0; k < 900; k++) {
      G.step(0.008); const f = G.drawNow(); n++;
      if (f.handOn) { if (first === null) first = f.levelTime; last = f.levelTime; if (st.slice(1).some((s) => f.levelTime >= s.zoneStart && f.levelTime <= s.passEnd)) bad++; }
      if (f.malletOn || f.dashK) bad++;
    }
    return { frames: n, first, last, star0: st[0].t, beat, bad };
  });
  rep.r3.T1 = t1;
  if (t1.bad || t1.first === null || t1.first < t1.star0 - t1.beat - 1e-6 || t1.first > t1.star0 - t1.beat + 9) fail(`T1 손가락 ${JSON.stringify(t1)}`);
  console.log(`T1: 손가락 ${Math.round(t1.first)}~${Math.round(t1.last)} ms (첫 별 ${Math.round(t1.star0)}, 1박 ${Math.round(t1.beat)}), 다른 별 위험 구간·북채 겹침 ${t1.bad}`);
  await ctx.close();
}
for (const [w, h] of [[360, 640], [412, 915], [640, 360], [1280, 720]]) {
  const tag = `${w}x${h}`;
  const { ctx, p } = await open(w, h);
  const g = (f, a) => p.evaluate(f, a);
  const out = {};
  // 화면 규격 = layout.json (safe 0 인 같은 해상도)
  {
    const ref = Object.values(LJ.layouts).find((l) => l.W === w && l.H === h && !l.safe.t && !l.safe.b && !l.safe.l && !l.safe.r);
    const lay = await g(() => window.__game.layout());
    const keys = ['judge_x', 'preview_px', 'star_d', 'road.y0', 'road.y1', 'ball.d', 'ball.yRest', 'drum.r', 'drum.y', 'line.w', 'hud.combo.x0', 'hud.combo.y', 'hud.band_bottom', 'finger.s', 'finger.y0', 'text_slot.x0', 'text_slot.y0', 'text_slot.x1', 'silhouette_frame.y0'];
    const at = (o, k) => k.split('.').reduce((a, b) => a?.[b], o);
    out.layoutDiff = keys.filter((k) => Math.abs(at(lay, k) - at(ref, k)) > 0.051);
    if (out.layoutDiff.length) fail(`${tag} 화면 규격 ≠ layout.json: ${out.layoutDiff.join(',')}`);
  }
  // R4·R15: 그림 카드 (세로 = cards-r3 _portrait.svg), 화면 안
  await g(() => window.__game.loadLevel(0, { card: true }));
  await p.waitForFunction(() => document.getElementById('cardImg').complete);
  out.card = await g(() => { const im = document.getElementById('cardImg'); const r = im.getBoundingClientRect(); return { src: im.getAttribute('src'), w: r.width, h: r.height, label: im.getAttribute('aria-label'), inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; });
  if ((w < h) !== out.card.src.endsWith('card_drum_tap_portrait.svg') || !out.card.src.includes('card_drum_tap') || !out.card.inside || !out.card.label) fail(`R4 ${tag} 카드 ${JSON.stringify(out.card)}`);
  await shot(p, `${tag}-r3-card.png`);
  // 손가락 칸·글 자리 (16-1): 손가락 = 판정 북 바로 아래, 글(tut_drum_tap) = text_slot, 글이 자리 안에 들어감
  await g(() => { const G = window.__game; G.press(); const st = G.stars()[0]; G.step((st.t - 100) / 1000); G.drawNow(); });
  out.tut = await g(() => {
    const L = window.__game.layout(), t = document.getElementById('tut'), r = t.getBoundingClientRect(), f = window.__game.frameInfo();
    const ts = L.text_slot;
    return { handOn: f.handOn, visible: getComputedStyle(t).visibility, text: t.textContent, fits: t.scrollWidth <= t.clientWidth + 0.5 && t.scrollHeight <= t.clientHeight + 0.5,
      atSlot: Math.abs(r.left - ts.x0) < 0.6 && Math.abs(r.top - ts.y0) < 0.6 && Math.abs(r.right - ts.x1) < 0.6, handBelowDrum: L.finger.y0 >= L.drum.y + L.drum.r, handSize: L.hand.size, cell: L.finger.s };
  });
  if (!out.tut.handOn || out.tut.visible !== 'visible' || !out.tut.fits || !out.tut.atSlot || !out.tut.handBelowDrum || out.tut.handSize !== out.tut.cell) fail(`${tag} 손가락·글 자리 ${JSON.stringify(out.tut)}`);
  await shot(p, `${tag}-r3-hand.png`);
  // 타이틀 힌트: 손가락 칸·글 자리, 화면 안
  await g(() => window.__game.show('title'));
  out.title = await g(() => { const L = window.__game.layout(); const rs = [...document.getElementById('tapStart').children].map((e) => e.getBoundingClientRect()); return { inside: rs.every((r) => r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight), hand: Math.round(rs[0].top) === Math.round(L.finger.y0) }; });
  if (!out.title.inside || !out.title.hand) fail(`${tag} 타이틀 힌트 ${JSON.stringify(out.title)}`);
  // N1·N6: 레벨 카드 줄 흐름 겹침 0, 진행도 줄, 작은 길 조각
  await g(() => { const G = window.__game; G.loadLevel(0); G.autoplay(0, 0); G.loadLevel(1); const s = G.stars(); for (const st of s.slice(0, 12)) G.pressAt(st.t); G.step(2); G.loadLevel(1, { practice: true }); G.autoplay(0, 0); G.show('levels'); });
  out.levels = await g(() => {
    const bad = [];
    document.querySelectorAll('.lcard').forEach((c, i) => {
      const pr = c.querySelector('.lplay').getBoundingClientRect();
      const rows = [...c.querySelector('.lplay').children].map((e) => e.getBoundingClientRect());
      rows.forEach((r, k) => {
        if (r.top < pr.top - 0.5 || r.bottom > pr.bottom + 0.5 || r.left < pr.left - 0.5 || r.right > pr.right + 0.5) bad.push(`L${i + 1} 줄 ${k} 밖`);
        if (k && r.top - rows[k - 1].bottom < 3.5) bad.push(`L${i + 1} 줄 ${k - 1}-${k} 간격 ${(r.top - rows[k - 1].bottom).toFixed(1)}`);
      });
      const nm = c.querySelector('.lname'); if (nm && nm.scrollWidth > nm.clientWidth + 0.5) bad.push(`L${i + 1} 이름 잘림`);
    });
    const l2 = document.querySelectorAll('.lcard')[1].querySelector('.lplay svg:nth-of-type(3)');
    const piece = document.querySelector('.lcard .lplay svg rect');
    return { bad, l2Progress: !!(l2 && l2.querySelector('circle')), roadPiece: !!piece, cardIcon: [...document.querySelectorAll('.lrow img')].some((im) => im.getAttribute('src').endsWith('icon-card.svg')) };
  });
  if (out.levels.bad.length || !out.levels.l2Progress || !out.levels.cardIcon || !out.levels.roadPiece) fail(`N1·N6 ${tag} ${JSON.stringify(out.levels)}`);
  await shot(p, `${tag}-r3-levels.png`);
  // N5·R8-7: 확인 창 첫 초점 = 취소
  await g(() => window.__game.show('confirm'));
  out.confirm = await g(() => ({ focus: document.activeElement && document.activeElement.id, imgs: ['cfNo', 'cfYes'].map((id) => !!document.getElementById(id).querySelector('img')) }));
  if (out.confirm.focus !== 'cfNo' || !out.confirm.imgs.every(Boolean)) fail(`N5 ${tag} 확인 창 ${JSON.stringify(out.confirm)}`);
  // N16·R8-2: 레벨 10 결과 = 버튼 2개, 등급 줄 대체 글
  await g(() => { const G = window.__game; G.loadLevel(9); G.autoplay(0, 0); for (let k = 0; k < 200 && G.state !== 'result'; k++) G.step(0.1); });
  out.result = await g(() => { const vis = [...document.querySelectorAll('#resultBtns button')].filter((b) => b.offsetParent !== null).map((b) => b.id); return { vis, grade: document.getElementById('gradeAria').getAttribute('aria-label'), role: document.getElementById('gradeAria').getAttribute('role') }; });
  if (out.result.vis.join() !== 'bRetry,bLevels' || !out.result.grade || out.result.role !== 'img') fail(`N16 ${tag} 결과 ${JSON.stringify(out.result)}`);
  await checkButtons(p, `${tag} r3 result`);
  await shot(p, `${tag}-r3-result-l10.png`);
  rep.r3[tag] = out;
  console.log(`r3 ${tag}: 규격 = layout.json, 카드 ${out.card.src.split('/').pop()}, 손가락 ${out.tut.handSize} px·글 자리 OK, 레벨 카드 문제 ${out.levels.bad.length}, L10 결과 ${out.result.vis.join('+')}`);
  await ctx.close();
}
{
  // 영어 글 자리: tut_drum_tap 가장 긴 언어가 4해상도 text_slot 안 (잘림 0)
  for (const [w, h] of [[360, 640], [412, 915], [640, 360], [1280, 720]]) {
    const { ctx, p } = await open(w, h, '?test=1&lang=en');
    const r = await p.evaluate(() => { const G = window.__game; G.loadLevel(0); const st = G.stars()[0]; G.step((st.t - 100) / 1000); G.drawNow(); const t = document.getElementById('tut'); return { text: t.textContent, fits: t.scrollWidth <= t.clientWidth + 0.5 && t.scrollHeight <= t.clientHeight + 0.5, w: t.clientWidth, sw: t.scrollWidth, sh: t.scrollHeight, h: t.clientHeight }; });
    rep.r3[`en-tut-${w}x${h}`] = r;
    if (!r.fits) fail(`en ${w}x${h} tut_drum_tap 잘림 ${JSON.stringify(r)}`);
    await shot(p, `${w}x${h}-r3-en-hand.png`);
    await ctx.close();
  }
}
{
  // K1 콤보 켬/끔 봇 재판정: 같은 시드 σ70 봇(autoplay)을 ?test=1 과 ?test=1&combo=0 에서 돌려 시도 결과·판정 목록이 같은지 (불일치 0)
  const seeds = QUICK ? 4 : 12, res = {};
  for (const q of ['?test=1', '?test=1&combo=0']) {
    const { ctx, p } = await open(640, 360, q);
    res[q] = await p.evaluate((seeds) => {
      const G = window.__game, out = [];
      for (let i = 0; i < 10; i++) for (let s = 1; s <= seeds; s++) {
        G.loadLevel(i);
        const r = G.autoplay(0, 70, 1000 * i + s);
        out.push(JSON.stringify({ i, s, clear: r.clear, last: r.lastResult, log: G.judgeLog().map((j) => [j.i, j.grade, Math.round(j.e * 1000)]), hist: G.history() }));
      }
      return { out, combo: G.combo() };
    }, seeds);
    await ctx.close();
  }
  const a = res['?test=1'], b = res['?test=1&combo=0'];
  const diff = a.out.filter((x, k) => x !== b.out[k]).length;
  rep.r3.K1 = { runs: a.out.length, diff, onCombo: a.combo.on, offCombo: b.combo.on };
  if (diff || !a.combo.on || b.combo.on) fail(`K1 콤보 켬/끔 재판정 불일치 ${diff}/${a.out.length}`);
  console.log(`K1: 콤보 켬/끔 σ70 봇 ${a.out.length}시도씩 재판정 불일치 ${diff}`);
}
{
  // 판정 이름·% (30-art 16-13, 10-lore R3-12): 4해상도 × ko/en — 판정 프레임에 이름·%(= 기준 식), 가로 L1 첫 별 판정 프레임에 tut 글과 동시 0,
  // 550 ms 뒤 사라짐, 새 판정 = 바꿔 그림, 판정 글 낭독 없음(aria-live 0·트리에 judge_* 문구 없음), 결과 정확도·최고 콤보 meter(valuetext 숫자만)
  const { accuracyPct } = await import(pathToFileURL(join(PROJ, 'tools', 'sim', 'bots.mjs')).href);
  const BAL = JSON.parse(readFileSync(join(PROJ, '..', '..', 'games', 'rhythm-01', 'data', 'balance.json'), 'utf8'));
  rep.r3.label = {};
  for (const [w, h] of [[360, 640], [412, 915], [640, 360], [1280, 720]]) for (const lang of ['ko', 'en']) {
    const { ctx, p } = await open(w, h, `?test=1&lang=${lang}`);
    const r = await p.evaluate(() => {
      const G = window.__game; G.loadLevel(0); const st = G.stars();
      const out = { both: 0, frames: [] };
      // 첫 별 직전 ~ 판정까지 8 ms 간격: 손가락(tut)과 판정 글이 같은 프레임에 그려지지 않음
      G.step((st[0].t - 200) / 1000);
      for (let k = 0; k < 40; k++) { G.step(0.008); const f = G.drawNow(); if (f.handOn && f.label) out.both++; }
      G.pressAt(st[0].t + 30); const f0 = G.drawNow(); out.first = { label: f0.label, hand: f0.handOn, tutHidden: document.getElementById('tut').classList.contains('hidden'), e: G.judgeLog()[0].e };
      G.step(0.3); out.at300 = !!G.drawNow().label;
      G.pressAt(st[1].t - 120); const f1 = G.drawNow(); out.second = { label: f1.label, e: G.judgeLog()[1].e };
      G.step(0.6); out.at600 = !!G.drawNow().label;
      out.live = document.querySelectorAll('[aria-live]').length; // #live(신기록)·#calibLive 만 (판정 글 낭독 없음)
      return out;
    });
    const want0 = accuracyPct(r.first.e, { perfect_ms: 50, good_ms: 100, pass_early_ms: 150, pass_late_ms: 170 }, BAL.accuracy);
    const want1 = accuracyPct(r.second.e, { perfect_ms: 50, good_ms: 100, pass_early_ms: 150, pass_late_ms: 170 }, BAL.accuracy);
    rep.r3.label[`${w}x${h}-${lang}`] = r;
    if (r.both || !r.first.label || r.first.hand || r.first.label.pct !== want0 || !r.at300 || r.at600 || !r.second.label || r.second.label.pct !== want1 || r.second.label.grade !== 'pass' || r.live !== 2) fail(`판정 글 ${w}x${h} ${lang} ${JSON.stringify(r)}`);
    await p.evaluate(() => { const G = window.__game; G.loadLevel(1); const st = G.stars(); G.pressAt(st[0].t + 10); G.drawNow(); });
    await shot(p, `${w}x${h}-r3-label-${lang}.png`);
    if (w === 640 && lang === 'ko') {
      // 결과 화면: 정확도·최고 콤보 meter, 연습 클리어에는 없음
      const res = await p.evaluate(() => {
        const G = window.__game; G.loadLevel(0); G.autoplay(40, 0); for (let k = 0; k < 200 && G.state !== 'result'; k++) G.step(0.1);
        const m = (id) => { const e = document.getElementById(id); return { role: e.getAttribute('role'), label: e.getAttribute('aria-label'), now: e.getAttribute('aria-valuenow'), text: e.getAttribute('aria-valuetext'), max: e.getAttribute('aria-valuemax'), shown: e.offsetParent !== null }; };
        const normal = { acc: m('resAcc'), combo: m('resCombo'), newBest: !document.getElementById('resNew').classList.contains('hidden') };
        G.loadLevel(0); G.autoplay(0, 0); for (let k = 0; k < 200 && G.state !== 'result'; k++) G.step(0.1);
        const again = { acc: m('resAcc'), newBest: !document.getElementById('resNew').classList.contains('hidden') };
        G.loadLevel(0, { practice: true }); G.autoplay(0, 0); for (let k = 0; k < 200 && G.state !== 'result'; k++) G.step(0.1);
        return { normal, again, practiceHidden: document.getElementById('resultInfo').classList.contains('hidden') };
      });
      rep.r3.result = res;
      const T = (await p.evaluate(() => fetch('data/strings.json').then((r) => r.json()))).ko;
      const n = res.normal;
      if (n.acc.role !== 'meter' || n.acc.label !== T.result_accuracy || n.acc.text !== n.acc.now + '%' || n.combo.role !== 'meter' || n.combo.label !== T.aria_streak_best || n.combo.text !== n.combo.now || n.combo.now !== '18' || n.newBest || !res.again.newBest || +res.again.acc.now <= +n.acc.now || !res.practiceHidden) fail(`결과 정확도·최고 콤보 ${JSON.stringify(res)}`);
      console.log(`결과: 정확도 ${n.acc.text}(meter "${n.acc.label}") → 다시 ${res.again.acc.text} 신기록 표지 ${res.again.newBest}, 최고 콤보 ${n.combo.text}, 연습 클리어 숨김 ${res.practiceHidden}`);
      await shot(p, '640x360-r3-result-acc.png');
    }
    await ctx.close();
  }
  console.log(`판정 글: 4해상도 × ko/en, tut 글과 같은 프레임 0, % = 기준 식, 550 ms 뒤 사라짐, 새 판정 바꿔 그림, aria-live 2개(판정 글 낭독 없음)`);
}
{
  // 콤보 표시·대체 글·단계 화음 예약·끊김 (16-4, 10-lore R3-a, insights 콤보 대체 글)
  const { ctx, p } = await open(360, 640);
  const c = await p.evaluate(() => {
    const G = window.__game; G.loadLevel(1); const st = G.stars();
    const seen = [];
    for (let k = 0; k < 21; k++) { G.pressAt(st[k].t); G.drawNow(); seen.push({ v: G.combo().value, shown: G.combo().shown }); }
    const at21 = G.combo();
    const chords = at21.chords.map((x) => ({ combo: x.combo, at: x.at, sound: x.sound }));
    // 놓쳐서 실패 → 0.3 s 안 사라짐, 실패 뒤 aria 값 0, 예약 취소 표시
    G.step((st[21].passEnd - G.levelTime()) / 1000 + 0.05);
    const failC = G.combo();
    return { seen, aria: at21.aria, chords, afterFail: { value: failC.value, aria: failC.aria.now, cancelled: failC.chords.filter((x) => x.cancelled).length, phase: G.phase }, live: document.querySelectorAll('#sPlay [aria-live]').length };
  });
  rep.r3.combo = c;
  const T = (await p.evaluate(() => fetch('data/strings.json').then((r) => r.json()))).ko;
  const okSeen = c.seen.every((s, k) => s.v === k + 1 && s.shown === (k + 1 >= 2));
  if (!okSeen) fail(`콤보 값·표시 ${JSON.stringify(c.seen)}`);
  if (c.aria.role !== 'meter' || c.aria.label !== T.aria_streak || c.aria.now !== '21' || c.aria.text !== '21' || c.aria.live !== null || /\d/.test(c.aria.label)) fail(`콤보 aria ${JSON.stringify(c.aria)}`);
  if (c.chords.map((x) => x.combo).join() !== '10,20' || c.afterFail.value !== 0 || c.afterFail.aria !== '0') fail(`콤보 화음·끊김 ${JSON.stringify(c)}`);
  await shot(p, '360x640-r3-combo-break.png');
  console.log(`콤보: 1~21 값·표시(2부터) OK, aria meter "${c.aria.label}" now/text ${c.aria.now}/${c.aria.text}, 화음 ${c.chords.map((x) => `${x.combo}→${x.at == null ? '넘김' : Math.round(x.at)}`).join(' ')}, 실패 뒤 값 ${c.afterFail.value}·aria ${c.afterFail.aria}`);
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
  rep.r3.R11 = r11;
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
