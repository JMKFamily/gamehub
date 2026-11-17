#!/usr/bin/env node
// rhythm-02 웹 빌드 브라우저 자체 확인 (Playwright, 설치된 Edge/Chrome — 브라우저 다운로드·playwright install 하지 않음)
//
//   node projects/rhythm-02/tools/selfcheck-browser.mjs [--channel msedge] [--out <폴더>] [--quick]
//   (require('playwright') 를 먼저 찾고, 없으면 playwright-core, 그다음 PLAYWRIGHT_CORE=<폴더> 환경 변수)
//
// 1) ?test=1: 10레벨 완벽 입력열 클리어(등급 3)·±40 ms·σ25, 무입력 늦음 실패 → 1.1 s 재시작, 놓침 구역 탭 일찍 실패, 연습 체크포인트 이어 하기
// 2) 일반 모드(오디오 켜짐) rAF + 실제 PointerEvent: 10레벨 완벽 입력열 실시간 클리어, 무입력·일찍 실패 → 재시작 시간(0.94~1.20 s), L1 은 Playwright 마우스(CDP)로
// 3) 모든 시도 기록을 node 의 tools/sim/judge.mjs 로 다시 판정 → 불일치 0
// 4) 4해상도 화면별 스크린샷 + 버튼 48 px·겹침·화면 밖 검사, 저장 유지, 백그라운드 멈춤, 보호자 길게 누르기, 콘솔 에러·외부 요청 0
// 5) 6배 CPU 스로틀링에서 레벨 시작·재시작 직후 2 s 프레임 간격(평균 fps·1% low)
// 정적 서버는 projects/rhythm-02/tools/serve.mjs 를 포트 8730~8739 에서 하나 띄우고, 그 PID 만 끝에 종료한다.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';

const PROJ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const channel = opt('--channel', 'msedge');
const OUT = resolve(opt('--out', join(tmpdir(), 'rhythm02-selfcheck')));
const QUICK = args.includes('--quick');
mkdirSync(OUT, { recursive: true });

// ---- playwright 찾기 ----
let pw = null;
const req = createRequire(import.meta.url);
for (const name of ['playwright', 'playwright-core']) { try { pw = req(name); break; } catch {} }
if (!pw && process.env.PLAYWRIGHT_CORE) { try { pw = createRequire(join(process.env.PLAYWRIGHT_CORE, 'index.js'))(process.env.PLAYWRIGHT_CORE); } catch {} }
if (!pw) { console.error("playwright 를 찾지 못함: require('playwright') 실패, PLAYWRIGHT_CORE=<playwright-core 폴더> 로 지정"); process.exit(2); }

const J = await import(pathToFileURL(join(PROJ, 'tools/sim/judge.mjs')).href);
const bal = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8'));
const Ls = bal.levels.map((p) => J.compileLevel(JSON.parse(readFileSync(join(PROJ, p), 'utf8')), bal));

// ---- 서버(자기 것만) ----
let server = null, PORT = 0;
for (let p = 8730; p <= 8739 && !server; p++) {
  try { await fetch(`http://127.0.0.1:${p}/`); continue; } catch {} // 이미 누가 씀 → 다음 포트
  const ch = spawn(process.execPath, [join(PROJ, 'tools/serve.mjs'), String(p)], { stdio: ['ignore', 'pipe', 'pipe'] });
  const ok = await new Promise((res) => { ch.stdout.once('data', () => res(true)); ch.once('exit', () => res(false)); setTimeout(() => res(false), 4000); });
  if (ok) { server = ch; PORT = p; }
}
if (!server) { console.error('8730~8739 에서 서버를 못 띄움'); process.exit(3); }
const BASE = `http://127.0.0.1:${PORT}/games/rhythm-02/`;
console.log(`서버 pid ${server.pid} 포트 ${PORT}`);
const cleanup = () => { try { server.kill(); } catch {} };
process.on('exit', cleanup);

const browser = await pw.chromium.launch({ channel, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const rep = { base: BASE, channel, console: [], external: [], failed: [], test: [], realtime: [], rejudge: null, ui: [], shots: [], perf: [], misc: {} };
let bad = 0;
const fail = (m) => { bad++; console.log('FAIL', m); };
const ok = (m) => console.log('  ok', m);

async function open(w, h, q = '?test=1', { fresh = true, dsf = 1, touch = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, hasTouch: touch });
  const p = await ctx.newPage();
  const tag = `${w}x${h}${q}`;
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) rep.console.push(`[${tag}] ${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => rep.console.push(`[${tag}] pageerror: ${e.message}`));
  p.on('request', (r) => { const u = new URL(r.url()); if (/^(https?|wss?):$/.test(u.protocol) && !['localhost', '127.0.0.1'].includes(u.hostname)) rep.external.push(r.url()); });
  p.on('response', (r) => { if (r.status() >= 400) rep.failed.push(`[${tag}] ${r.url()} ${r.status()}`); });
  await p.goto(BASE + q);
  await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 20000 });
  if (fresh) { await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 20000 }); }
  return { ctx, p };
}
const shot = async (p, name) => { await p.waitForTimeout(80); await p.screenshot({ path: join(OUT, name) }); rep.shots.push(name); };
async function checkButtons(p, tag) {
  const r = await p.evaluate(() => {
    const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false; let e = el; while (e) { if (e.hidden || getComputedStyle(e).display === 'none') return false; e = e.parentElement; } return true; };
    const els = [...document.querySelectorAll('button')].filter(vis);
    // 스크롤 상자(보호자 화면) 안 버튼은 스크롤로 닿으면 됨: 상자가 넘치면 ▼ 표시가 켜져 있어야 함
    const sc = document.getElementById('gScroll'), more = document.getElementById('gMore');
    const scrolls = sc && vis(sc) && sc.scrollHeight > sc.clientHeight + 1;
    const rects = els.map((b) => { const r = b.getBoundingClientRect(); return { id: b.id || b.getAttribute('aria-label'), x: r.left, y: r.top, w: r.width, h: r.height, inScroll: !!(scrolls && sc.contains(b)) }; }).filter((r) => r.w > 0 && r.h > 0);
    const out = [], W = innerWidth, H = innerHeight;
    if (scrolls && !more.classList.contains('on') && sc.scrollTop === 0) out.push('scroll without ▼');
    for (const r of rects) {
      if (r.w < 47.5 || r.h < 47.5) out.push(`small ${r.id} ${r.w.toFixed(0)}x${r.h.toFixed(0)}`);
      if (!r.inScroll && (r.x < -0.5 || r.y < -0.5 || r.x + r.w > W + 0.5 || r.y + r.h > H + 0.5)) out.push(`offscreen ${r.id} ${r.x.toFixed(0)},${r.y.toFixed(0)} ${r.w.toFixed(0)}x${r.h.toFixed(0)}`);
    }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 1 && oy > 1) out.push(`overlap ${a.id} / ${b.id}`);
    }
    // 글 넘침(가로 스크롤)
    if (document.documentElement.scrollWidth > W + 1) out.push('page overflow-x');
    return { n: rects.length, issues: out };
  });
  rep.ui.push({ tag, ...r });
  for (const m of r.issues) fail(`${tag}: ${m}`);
  return r;
}
// 시도 기록 → node 기준 판정 다시
const rejudge = { n: 0, mismatch: 0, examples: [] };
function rejudgeLog(li, log) {
  const L = Ls[li];
  for (const a of log) {
    const taps = L.contacts.slice(0, a.carried).map((c) => c.t).concat(a.taps);
    const r = J.judgeAttempt(L, taps);
    rejudge.n++;
    const same = r.clear === a.clear && (r.clear || (r.failIndex === a.failIndex && r.reason === a.reason && Math.abs(r.failTimeMs - a.failTimeMs) < 1e-6)) && r.grades.map((g) => g.grade).join() === a.grades.join();
    if (!same) { rejudge.mismatch++; if (rejudge.examples.length < 5) rejudge.examples.push({ level: li + 1, build: a, sim: { clear: r.clear, failIndex: r.failIndex, reason: r.reason } }); }
  }
}

// ---- 1) 테스트 모드 ----
console.log('== 1) ?test=1 ==');
{
  const { ctx, p } = await open(1280, 720);
  const res = await p.evaluate(() => {
    const g = window.__game, out = [];
    for (let i = 0; i < g.levelCount; i++) {
      for (const [off, sd] of [[0, 0], [-40, 0], [40, 0], [0, 25]]) {
        g.loadLevel(i);
        const r = g.autoplay(off, sd, 7 + i);
        out.push({ level: i, off, sd, clear: r.clear, grade: r.grade, state: r.state, log: g.attemptLog() });
      }
      // 무입력: 늦음 실패 → 재시작
      g.loadLevel(i);
      for (let k = 0; k < 4000 && g.attempts < 2; k++) g.step(0.01);
      out.push({ level: i, none: true, attempts: g.attempts, restart: g.restartLog(), log: g.attemptLog() });
      // 일찍: 첫 접촉 놓침 구역 탭
      g.loadLevel(i);
      const c0 = g.contacts()[0];
      g.pressAt(c0.zoneStart + 1);
      for (let k = 0; k < 400 && g.attempts < 2; k++) g.step(0.01);
      out.push({ level: i, early: true, attempts: g.attempts, restart: g.restartLog(), log: g.attemptLog() });
      // 연습: 마지막 접촉에서 실패 → 그 앞 받침 쉼에서 이어서 클리어
      g.loadLevel(i, { practice: true });
      const cs = g.contacts();
      for (const c of cs.slice(0, -1)) g.pressAt(c.t);
      for (let k = 0; k < 600 && g.attempts < 2; k++) g.step(0.01);
      const r2 = g.autoplay(0, 0, 1);
      out.push({ level: i, practice: true, attempts: g.attempts, clear: r2.clear, state: r2.state, log: g.attemptLog() });
    }
    return out;
  });
  for (const r of res) {
    rep.test.push({ ...r, log: undefined });
    rejudgeLog(r.level, r.log);
    const L = r.level + 1;
    if (r.none) { if (r.attempts !== 2 || r.log[0].reason !== 'late' || r.log[0].failIndex !== 0 || Math.abs(r.restart[0].ms - 1100) > 4) fail(`test L${L} 무입력 ${JSON.stringify(r.restart)} ${JSON.stringify(r.log[0])}`); }
    else if (r.early) { if (r.attempts !== 2 || r.log[0].reason !== 'early' || Math.abs(r.restart[0].ms - 1100) > 4) fail(`test L${L} 일찍 ${JSON.stringify(r.log[0])}`); }
    else if (r.practice) { if (!r.clear || r.attempts !== 2 || r.log[1].carried === 0) fail(`test L${L} 연습 ${JSON.stringify(r.log.map((x) => [x.fromMs, x.carried, x.clear]))}`); }
    else if (!r.clear || (r.off === 0 && r.sd === 0 && r.grade !== 3)) fail(`test L${L} off ${r.off} sd ${r.sd}: clear ${r.clear} grade ${r.grade}`);
  }
  const n = res.filter((r) => !r.none && !r.early && !r.practice);
  ok(`완벽·±40·σ25 입력 ${n.filter((r) => r.clear).length}/${n.length} 클리어, 무입력·일찍 실패 재시작 ${res.filter((r) => (r.none || r.early) && r.attempts === 2).length}/${res.filter((r) => r.none || r.early).length}, 연습 이어 하기 ${res.filter((r) => r.practice && r.clear).length}/10`);
  await ctx.close();
}

// ---- 2) 일반 모드 실시간 ----
console.log('== 2) 일반 모드 실시간(오디오 켜짐, rAF + PointerEvent) ==');
{
  const { ctx, p } = await open(1280, 720, '');
  // 타이틀 실제 탭(오디오 잠금 해제) → 레벨 선택
  await p.mouse.click(640, 400);
  await p.waitForFunction(() => window.__game.state === 'levels');
  rep.misc.audio = await p.evaluate(() => window.__game.audioState());
  const levels = QUICK ? [0, 5, 9] : [...Array(10).keys()];
  for (const i of levels) {
    const r = await p.evaluate(async (i) => { const g = window.__game; g.loadLevel(i); const s = await g.autoplay(0, 0, 1); return { s, judge: g.judgeLog(), log: g.attemptLog() }; }, i);
    const es = r.judge.map((x) => x.e), maxE = Math.max(...es.map(Math.abs));
    rep.realtime.push({ level: i + 1, clear: r.s.clear, grade: r.s.grade, attempts: r.s.attempts, maxAbsErrMs: +maxE.toFixed(2), meanErrMs: +(es.reduce((a, b) => a + b, 0) / es.length).toFixed(2) });
    rejudgeLog(i, r.log);
    if (!r.s.clear) fail(`실시간 L${i + 1} 클리어 못 함 ${JSON.stringify(r.s.last)}`);
  }
  const rt = rep.realtime;
  ok(`실시간 ${rt.filter((x) => x.clear).length}/${rt.length} 클리어, 등급 ${rt.map((x) => x.grade).join(',')}, 최대 |오차| ${Math.max(...rt.map((x) => x.maxAbsErrMs))} ms`);
  // 저장 유지
  await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
  const saved = await p.evaluate(() => window.__game.save());
  const nCleared = Object.values(saved.levels).filter((x) => x.cleared).length;
  rep.misc.persist = nCleared;
  if (nCleared !== levels.length) fail(`새로고침 뒤 클리어 기록 ${nCleared}/${levels.length}`); else ok(`새로고침 뒤 클리어 기록 ${nCleared}개 유지`);
  await p.mouse.click(640, 400);
  // 재시작 시간: 무입력(늦음) 3회 + 일찍 2회
  const rs = await p.evaluate(async () => {
    const g = window.__game, out = [];
    g.loadLevel(0);
    await new Promise((res) => { const iv = setInterval(() => { if (g.attempts >= 4) { clearInterval(iv); res(); } }, 50); });
    out.push(...g.restartLog().map((x) => ({ ...x, kind: 'late' })));
    g.loadLevel(1);
    for (let k = 0; k < 2; k++) {
      const att = g.attempts;
      await new Promise((res) => { const iv = setInterval(() => { if (g.phase === 'run' && g.levelMs() > 200) { clearInterval(iv); res(); } }, 10); });
      const c0 = g.contacts()[0];
      await new Promise((res) => { const iv = setInterval(() => { if (g.judgeMs() >= c0.zoneStart + 20) { clearInterval(iv); res(); } }, 2); });
      document.getElementById('cv').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerType: 'touch', isPrimary: true }));
      await new Promise((res) => { const iv = setInterval(() => { if (g.attempts > att) { clearInterval(iv); res(); } }, 20); });
      await new Promise((r) => setTimeout(r, 100));
    }
    out.push(...g.restartLog().map((x) => ({ ...x, kind: 'early' })));
    return { out, log: g.attemptLog() };
  });
  rep.misc.restarts = rs.out;
  rejudgeLog(1, rs.log);
  const rng = bal.restart.allowed_range_s.map((x) => x * 1000);
  const outR = rs.out.filter((x) => x.ms < rng[0] || x.ms > rng[1]);
  if (outR.length || rs.out.length < 5) fail(`재시작 시간 범위 밖 ${JSON.stringify(rs.out)}`); else ok(`재시작 ${rs.out.map((x) => `${x.kind} ${x.ms.toFixed(0)}`).join(' · ')} ms (기준 ${rng.join('~')})`);
  // L1: Playwright 마우스(CDP) — 다음 접촉 시각에 맞춰 실제 클릭
  {
    await p.evaluate(() => window.__game.loadLevel(0));
    const tStart = Date.now();
    for (;;) {
      const s = await p.evaluate(() => { const g = window.__game; if (g.state === 'result' || g.phase === 'clear') return { done: true }; const i = g.judgeLog().length, c = g.contacts()[i]; return { done: false, wait: c ? c.t - g.judgeMs() : 1e9, att: g.attempts }; });
      if (s.done || s.att > 1 || Date.now() - tStart > 60000) break;
      if (s.wait > 60) { await new Promise((r) => setTimeout(r, s.wait - 45)); continue; }
      const w = await p.evaluate(() => { const g = window.__game, i = g.judgeLog().length, c = g.contacts()[i]; return c.t - g.judgeMs(); });
      if (w > 3) await new Promise((r) => setTimeout(r, w - 3));
      await p.mouse.down(); await p.mouse.up();
      await p.waitForTimeout(30);
    }
    const r = await p.evaluate(() => ({ s: window.__game.summary(), j: window.__game.judgeLog(), log: window.__game.attemptLog() }));
    rejudgeLog(0, r.log);
    const es = r.j.map((x) => x.e);
    rep.misc.mouseL1 = { clear: r.s.clear || r.s.phase === 'clear', attempts: r.s.attempts, errs: es.map((x) => +x.toFixed(1)) };
    if (!(r.s.clear || r.s.phase === 'clear')) fail(`마우스 L1 클리어 못 함 ${JSON.stringify(r.s)}`); else ok(`마우스(CDP) L1 클리어, 탭 오차 ${Math.min(...es).toFixed(0)}~${Math.max(...es).toFixed(0)} ms`);
  }
  // 백그라운드 멈춤(헤드리스에선 탭 전환 이벤트가 없어 강제 이벤트)
  const bg = await p.evaluate(async () => {
    const g = window.__game; g.loadLevel(2);
    await new Promise((r) => setTimeout(r, 1200));
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    const st = g.state, txt = document.getElementById('pTitle').textContent, lt0 = g.levelMs();
    await new Promise((r) => setTimeout(r, 400));
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    document.getElementById('pResume').click();
    return { st, txt, lt0, after: g.levelMs(), state: g.state };
  });
  rep.misc.background = bg;
  if (bg.st !== 'pause' || bg.state !== 'play' || Math.abs(bg.after - bg.lt0) > 60) fail(`백그라운드 멈춤 ${JSON.stringify(bg)}`); else ok(`백그라운드 → 멈춤(${bg.txt}), 이어 하기 뒤 레벨 시간 이어짐(${bg.lt0.toFixed(0)} → ${bg.after.toFixed(0)} ms)`);
  // 보호자 문: 짧게 → 보조 글, 1.6 s → 보호자 화면
  await p.evaluate(() => window.__game.show('levels'));
  const gb = await p.locator('#lGate').boundingBox();
  await p.mouse.move(gb.x + 24, gb.y + 24); await p.mouse.down(); await p.waitForTimeout(300); await p.mouse.up();
  await p.waitForTimeout(100);
  const hint = await p.evaluate(() => !document.getElementById('lHint').hidden);
  await p.mouse.down(); await p.waitForTimeout(1650); await p.mouse.up();
  const st = await p.evaluate(() => window.__game.state);
  rep.misc.gate = { hint, st };
  if (!hint || st !== 'guardian') fail(`보호자 문 ${JSON.stringify(rep.misc.gate)}`); else ok('보호자 문: 짧게 = 보조 글, 1.5 s 길게 = 보호자 화면');
  await ctx.close();
}

// ---- 3) 판정 대조 ----
rep.rejudge = rejudge;
if (rejudge.mismatch) fail(`빌드 판정 ≠ 시뮬레이터 판정 ${rejudge.mismatch}/${rejudge.n} ${JSON.stringify(rejudge.examples)}`);
else ok(`빌드 시도 ${rejudge.n}회 = tools/sim/judge.mjs 다시 판정, 불일치 0`);

// ---- 4) 4해상도 화면 ----
console.log('== 4) 4해상도 화면 ==');
const RES = [[360, 640], [412, 915], [640, 360], [1280, 720]];
for (const [w, h] of RES) {
  for (const lang of QUICK ? ['ko'] : ['ko', 'en']) {
    const tag = `${w}x${h}-${lang}`;
    const { ctx, p } = await open(w, h, `?lang=${lang}`);
    await p.evaluate(() => { try { localStorage.setItem('rhythm02.v1', JSON.stringify({ v: 1, levels: { '01': { best: 1, grade: 3, cleared: true, seenCard: true }, '02': { best: 1, grade: 2, cleared: true }, '03': { best: 1, grade: 1, cleared: true }, '04': { best: 0.64 }, '05': {} }, drift: { on: true, sessions: 1 } })); } catch {} });
    await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
    await shot(p, `${tag}-01-title.png`); await checkButtons(p, `${tag} title`);
    await p.mouse.click(w / 2, h / 2); await p.waitForFunction(() => window.__game.state === 'levels');
    await shot(p, `${tag}-02-levels.png`); await checkButtons(p, `${tag} levels`);
    await p.click('#lv3'); await p.waitForFunction(() => window.__game.state === 'start');
    await shot(p, `${tag}-03-start.png`); await checkButtons(p, `${tag} start`);
    await p.click('#stReplay'); await p.waitForFunction(() => window.__game.state === 'card');
    await shot(p, `${tag}-04-card.png`); await checkButtons(p, `${tag} card`);
    // 레벨 6(두 공) 플레이 장면·멈춤
    await p.evaluate(() => window.__game.loadLevel(5));
    await p.waitForFunction(() => window.__game.levelMs() > 2400 * 60 / 114 * 1.0);
    await shot(p, `${tag}-05-play.png`); await checkButtons(p, `${tag} play`);
    await p.click('#hPause'); await p.waitForFunction(() => window.__game.state === 'pause');
    await shot(p, `${tag}-06-pause.png`); await checkButtons(p, `${tag} pause`);
    await p.evaluate(() => window.__game.show('guardian'));
    await shot(p, `${tag}-07-guardian.png`); await checkButtons(p, `${tag} guardian`);
    rep.ui.push({ tag: `${tag} guardian scroll`, scroll: await p.evaluate(() => { const s = document.getElementById('gScroll'); return { over: s.scrollHeight > s.clientHeight + 1, more: document.getElementById('gMore').classList.contains('on') }; }) });
    await p.evaluate(() => window.__game.show('sync'));
    await shot(p, `${tag}-08-sync.png`); await checkButtons(p, `${tag} sync`);
    await ctx.close();
    // 테스트 모드 화면(가상 시계): L1 손가락, 두 공, 실패, 클리어 결과
    const t = await open(w, h, `?test=1&lang=${lang}`);
    const q = t.p;
    await q.evaluate(() => { const g = window.__game; g.loadLevel(0); g.step(0.8 + 2.95); });
    await shot(q, `${tag}-11-l1-finger.png`);
    const fi = await q.evaluate(() => window.__game.frameInfo());
    if (!fi.tut) fail(`${tag}: L1 손가락 시간에 tut_tap 안 보임`);
    await q.evaluate(() => { const g = window.__game; g.loadLevel(5); const T = 22.5 * 60000 / 114; for (const c of g.contacts()) if (c.t < T) g.pressAt(c.t); g.step((T - g.levelMs()) / 1000); });
    await shot(q, `${tag}-12-twoballs.png`);
    await q.evaluate(() => { const g = window.__game; g.loadLevel(1); const c = g.contacts()[0]; g.pressAt(c.zoneStart + 5); g.step(0.3); });
    await shot(q, `${tag}-13-fail-early.png`);
    await q.evaluate(() => { const g = window.__game; g.step(0.4); });
    await shot(q, `${tag}-14-fail-retry.png`);
    await q.evaluate(() => { const g = window.__game; g.loadLevel(2); g.autoplay(0, 0, 1); g.step(0.8); });
    await shot(q, `${tag}-15-result.png`); await checkButtons(q, `${tag} result`);
    await t.ctx.close();
  }
}
ok(`화면 ${rep.shots.length}장 → ${OUT}`);

// ---- 5) 성능: 6배 CPU 스로틀링, 시작·재시작 직후 ----
console.log('== 5) 6배 스로틀링 ==');
for (const dsf of QUICK ? [1] : [1, 3]) {
  const { ctx, p } = await open(412, 915, '', { dsf });
  await p.mouse.click(200, 400);
  await p.waitForTimeout(1500); // 레벨 선택 그림이 다 그려진 뒤(실제 사용 흐름)
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  const r = await p.evaluate(async () => {
    const g = window.__game;
    let longs = [];
    const meas = (ms) => new Promise((res) => { const d = []; longs = []; let last = 0; const t0 = performance.now(); const f = (t) => { if (last) { d.push(t - last); if (t - last > 22) longs.push([Math.round(t - t0), +(t - last).toFixed(1), +g.levelMs().toFixed(0)]); } last = t; if (t - t0 < ms) requestAnimationFrame(f); else res(d); }; requestAnimationFrame(f); });
    const stat = (d) => { const s = [...d].sort((a, b) => b - a), n = Math.max(1, Math.floor(s.length * 0.01)); const avg = d.reduce((a, b) => a + b, 0) / d.length; return { frames: d.length, avgFps: +(1000 / avg).toFixed(1), low1Fps: +(1000 / (s.slice(0, n).reduce((a, b) => a + b, 0) / n)).toFixed(1), maxMs: +s[0].toFixed(1), long: longs.slice(0, 5) }; };
    g.loadLevel(9);
    const start = stat(await meas(2500));
    await new Promise((res) => { const iv = setInterval(() => { if (g.phase === 'fail') { clearInterval(iv); res(); } }, 20); });
    const restart = stat(await meas(2500));
    return { start, restart };
  });
  rep.perf.push({ dsf, ...r });
  ok(`DPR ${dsf}: 시작 ${JSON.stringify(r.start)} · 재시작 ${JSON.stringify(r.restart)}`);
  await ctx.close();
}

// ---- 마무리 ----
if (rep.console.length) fail(`콘솔 에러·경고 ${rep.console.length}: ${rep.console.slice(0, 5).join(' | ')}`); else ok('콘솔 에러·경고 0');
if (rep.external.length) fail(`외부 요청 ${rep.external.length}: ${rep.external.slice(0, 3).join(' ')}`); else ok('외부 요청 0');
if (rep.failed.length) fail(`실패한 요청 ${rep.failed.join(' ')}`);
await browser.close();
writeFileSync(join(OUT, 'selfcheck.json'), JSON.stringify(rep, null, 1));
cleanup();
console.log(`\n결과: ${bad ? `FAIL ${bad}` : 'ALL PASS'} (보고 ${join(OUT, 'selfcheck.json')}, 서버 pid ${server.pid} 종료)`);
process.exit(bad ? 1 : 0);
