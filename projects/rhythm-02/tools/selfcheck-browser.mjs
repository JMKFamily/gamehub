#!/usr/bin/env node
// rhythm-02 웹 빌드 브라우저 자체 확인 (Playwright, 설치된 Edge — 브라우저 다운로드·playwright install 하지 않음) — round-2
//
//   PLAYWRIGHT_CORE=<playwright-core 폴더> node projects/rhythm-02/tools/selfcheck-browser.mjs [--channel msedge] [--out <폴더>] [--quick]
//   (require('playwright') → playwright-core → PLAYWRIGHT_CORE 순서로 찾음)
//
// 1) ?test=1: 10레벨 완벽 입력열(hit 접촉만, 지붕은 안 침)·±40 ms·σ25 클리어, 무입력 늦음·일찍·지붕 콩(bump_roof) 실패 → 재시작 1.1 s,
//    연습 체크포인트, 이어 하기(구절 받침 쉼으로 되감기·세상 위치 포함), 콤보 켬/끔 같은 탭 → 시도 기록 같음
// 2) 일반 모드(오디오 켜짐) rAF + 실제 PointerEvent: 10레벨 완벽 입력열 실시간 클리어, 재시작 세 판(늦음·일찍·지붕 콩) 0.94~1.20 s, L1 마우스(CDP)
// 3) 모든 시도 기록을 node tools/sim/judge.mjs 로 다시 판정(startIndex·carried 포함) → 불일치 0
// 4) 4해상도 × ko·en 화면 스크린샷 + 버튼 48 px·겹침·화면 밖, HUD·글 자리가 다가오는 길 영역 밖, 저장 유지, 백그라운드 멈춤, 보호자 길게 누르기
// 5) 접근성 트리(ariaSnapshot): 레벨 선택 이름·상태·최고 기록·최고 콤보 meter, 시작 판 이름·등급, 플레이 콤보 meter, 결과 등급, 불러오기 오류 ↻·lang
// 6) 6배 CPU 스로틀링: 타이틀 첫 탭 가장 긴 프레임, 레벨 시작·재시작 직후 2.5 s 1% low (DPR 1·3)
// 콘솔 에러·외부 요청 0. 정적 서버는 tools/serve.mjs 를 포트 8730~8731 에서 하나 띄우고 그 PID 만 끝에 종료.
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

let pw = null;
const req = createRequire(import.meta.url);
for (const name of ['playwright', 'playwright-core']) { try { pw = req(name); break; } catch {} }
if (!pw && process.env.PLAYWRIGHT_CORE) { try { pw = createRequire(join(process.env.PLAYWRIGHT_CORE, 'index.js'))(process.env.PLAYWRIGHT_CORE); } catch {} }
if (!pw) { console.error("playwright 를 찾지 못함: PLAYWRIGHT_CORE=<playwright-core 폴더> 로 지정"); process.exit(2); }

const J = await import(pathToFileURL(join(PROJ, 'tools/sim/judge.mjs')).href);
const bal = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8'));
const STR = JSON.parse(readFileSync(join(PROJ, 'strings.json'), 'utf8'));
const Ls = bal.levels.map((p) => J.compileLevel(JSON.parse(readFileSync(join(PROJ, p), 'utf8')), bal));

// ---- 서버(자기 것만, 8730~8731) ----
let server = null, PORT = 0;
for (const p of [8730, 8731]) {
  if (server) break;
  try { await fetch(`http://127.0.0.1:${p}/`); continue; } catch {}
  const ch = spawn(process.execPath, [join(PROJ, 'tools/serve.mjs'), String(p)], { stdio: ['ignore', 'pipe', 'pipe'] });
  const ok = await new Promise((res) => { ch.stdout.once('data', () => res(true)); ch.once('exit', () => res(false)); setTimeout(() => res(false), 4000); });
  if (ok) { server = ch; PORT = p; }
}
if (!server) { console.error('8730~8731 에서 서버를 못 띄움'); process.exit(3); }
const BASE = `http://127.0.0.1:${PORT}/games/rhythm-02/`;
console.log(`서버 pid ${server.pid} 포트 ${PORT}`);
const cleanup = () => { try { server.kill(); } catch {} };
process.on('exit', cleanup);

const browser = await pw.chromium.launch({ channel, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const rep = { base: BASE, channel, console: [], external: [], failed: [], test: [], realtime: [], rejudge: null, ui: [], shots: [], perf: [], aria: {}, misc: {} };
let bad = 0;
const fail = (m) => { bad++; console.log('FAIL', m); };
const ok = (m) => console.log('  ok', m);

async function open(w, h, q = '?test=1', { fresh = true, dsf = 1, before = null, expectError = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf });
  const p = await ctx.newPage();
  const tag = `${w}x${h}${q}`;
  if (before) await before(p);
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !expectError) rep.console.push(`[${tag}] ${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => rep.console.push(`[${tag}] pageerror: ${e.message}`));
  p.on('request', (r) => { const u = new URL(r.url()); if (/^(https?|wss?):$/.test(u.protocol) && !['localhost', '127.0.0.1'].includes(u.hostname)) rep.external.push(r.url()); });
  p.on('response', (r) => { if (r.status() >= 400 && !expectError) rep.failed.push(`[${tag}] ${r.url()} ${r.status()}`); });
  await p.goto(BASE + q);
  if (expectError) return { ctx, p };
  await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 30000 });
  if (fresh) { await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 30000 }); }
  return { ctx, p };
}
const shot = async (p, name) => { await p.waitForTimeout(80); await p.screenshot({ path: join(OUT, name) }); rep.shots.push(name); };
async function checkButtons(p, tag) {
  const r = await p.evaluate(() => {
    const vis = (el) => { let e = el; while (e) { if (e.hidden || getComputedStyle(e).display === 'none' || getComputedStyle(e).visibility === 'hidden') return false; e = e.parentElement; } return true; };
    const els = [...document.querySelectorAll('button')].filter(vis);
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
    if (document.documentElement.scrollWidth > W + 1) out.push('page overflow-x');
    // 플레이 중 글(tut_tap·practice_on)·HUD 상자가 다가오는 길 영역(x ≥ 북 왼쪽, y = HUD 띠 아래 ~ 길 아랫선) 밖(S10)
    const g = window.__game.layout();
    for (const id of ['hTut', 'hPrac']) {
      const e = document.getElementById(id); if (!vis(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.right > g.drumLeft + 0.5 && r.bottom > g.bandBottom + 0.5 && r.top < g.laneBottom - 0.5) out.push(`${id} 다가오는 길 영역 안`);
    }
    return { n: rects.length, issues: out };
  });
  rep.ui.push({ tag, ...r });
  for (const m of r.issues) fail(`${tag}: ${m}`);
  return r;
}
// 시도 기록 → node 기준 판정 다시(startIndex·carried 포함)
const rejudge = { n: 0, mismatch: 0, examples: [] };
function rejudgeLog(li, log) {
  const L = Ls[li];
  for (const a of log) {
    const r = J.judgeAttempt(L, a.taps, { startIndex: a.startIndex || 0, carried: a.carried || null });
    rejudge.n++;
    const same = r.clear === a.clear && (r.clear || (r.failIndex === a.failIndex && r.reason === a.reason && Math.abs(r.failTimeMs - a.failTimeMs) < 1e-6)) && r.grades.map((g) => g.grade).join() === a.grades.join();
    if (!same) { rejudge.mismatch++; if (rejudge.examples.length < 5) rejudge.examples.push({ level: li + 1, build: a, sim: { clear: r.clear, failIndex: r.failIndex, reason: r.reason, grades: r.grades.map((g) => g.grade) } }); }
  }
}
const strip = (log) => log.map(({ failPerf, ...x }) => x);

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
        out.push({ level: i, off, sd, clear: r.clear, grade: r.grade, state: r.state, log: g.attemptLog(), combo: g.comboEvents()?.final, rv: g.resultValues() });
      }
      // 무입력: 늦음 실패 → 재시작
      g.loadLevel(i);
      for (let k = 0; k < 4000 && g.attempts < 2; k++) g.step(0.01);
      out.push({ level: i, kind: 'late', attempts: g.attempts, restart: g.restartLog(), log: g.attemptLog() });
      // 일찍: 첫 접촉 놓침 구역 탭
      g.loadLevel(i);
      g.pressAt(g.contacts()[0].zoneStart + 1);
      for (let k = 0; k < 400 && g.attempts < 2; k++) g.step(0.01);
      out.push({ level: i, kind: 'early', attempts: g.attempts, restart: g.restartLog(), log: g.attemptLog() });
      // 지붕 콩: 첫 지붕 앞 hit 은 치고 지붕 밑 착지에 탭
      const ng = (g.loadLevel(i), g.nogo()[0]);
      if (ng) {
        for (const c of g.contacts()) if (c.kind !== 'nogo' && c.t < ng.t) g.pressAt(c.t);
        g.pressAt(ng.t + 10);
        const ph = g.phase;
        for (let k = 0; k < 400 && g.attempts < 2; k++) g.step(0.01);
        out.push({ level: i, kind: 'bump_roof', phaseAfterTap: ph, attempts: g.attempts, restart: g.restartLog(), log: g.attemptLog() });
      }
      // 연습: 마지막 접촉에서 실패 → 그 앞 받침 쉼에서 이어서 클리어
      g.loadLevel(i, { practice: true });
      const cs = g.contacts().filter((c) => c.kind !== 'nogo');
      for (const c of cs.slice(0, -1)) g.pressAt(c.t);
      for (let k = 0; k < 600 && g.attempts < 2; k++) g.step(0.01);
      const r2 = g.autoplay(0, 0, 1);
      out.push({ level: i, kind: 'practice', attempts: g.attempts, clear: r2.clear, state: r2.state, log: g.attemptLog() });
      // 이어 하기: 둘째 구절 첫 접촉 뒤에서 멈춤 → 이어 하기 → 그 구절 받침 쉼 처음(세상 위치 포함)으로 되감김 → 끝까지 완벽 입력
      g.loadLevel(i);
      const L2 = g.contacts(), ph1 = L2.find((c) => c.i > 0 && c.kind !== 'nogo' && c.t > L2[0].t + 4000) || L2[2];
      for (const c of L2) if (c.kind !== 'nogo' && c.t <= ph1.t) g.pressAt(c.t);
      g.step(0.05);
      const before = { attempts: g.attempts, combo: g.combo };
      g.pause(); g.step(0.5); g.resume();
      const rl = g.resumeLog()[0], after = { levelMs: g.levelMs(), scrollBeat: g.scrollBeat(), combo: g.combo, x0: g.worldX(0) };
      const r3 = g.autoplay(0, 0, 1);
      out.push({ level: i, kind: 'resume', rl, before, after, clear: r3.clear, attempts: g.attempts, log: g.attemptLog() });
      // 콤보 켬/끔: 같은 σ25 탭 → 시도 기록 같음
      const runs = [];
      for (const on of [true, false]) { g.setCombo(on); g.setJudgeDisplay(on); g.loadLevel(i); g.autoplay(0, 25, 99 + i); for (let k = 0; k < 300 && g.attempts < 2 && g.phase === 'fail'; k++) g.step(0.01); runs.push(g.attemptLog()); }
      g.setCombo(true); g.setJudgeDisplay(true);
      // 가상 시계 절대값이 달라 탭 값에 1e-12 ms 반올림 차가 생김 → 탭은 1e-6 ms 로 맞춰 비교
      const key = (log) => JSON.stringify(log.map((x) => ({ a: x.attempt, c: x.clear, f: x.failIndex, r: x.reason, t: x.failTimeMs == null ? null : +x.failTimeMs.toFixed(6), g: x.grades, k: x.combo, taps: x.taps.map((v) => +v.toFixed(6)) })));
      out.push({ level: i, kind: 'combo', same: key(runs[0]) === key(runs[1]), log: runs[0].concat(runs[1]) });
    }
    return out;
  });
  const rs = { late: [], early: [], bump_roof: [] };
  for (const r of res) {
    rep.test.push({ ...r, log: undefined });
    rejudgeLog(r.level, r.log);
    const L = r.level + 1, Lc = Ls[r.level];
    if (r.kind === 'late' || r.kind === 'early' || r.kind === 'bump_roof') {
      rs[r.kind].push(r.restart[0]?.ms);
      if (r.attempts !== 2 || r.log[0].reason !== r.kind || Math.abs(r.restart[0].ms - 1100) > 4) fail(`test L${L} ${r.kind} ${JSON.stringify(r.restart)} ${JSON.stringify(r.log[0]).slice(0, 300)}`);
    } else if (r.kind === 'practice') { if (!r.clear || r.attempts !== 2 || r.log[1].startIndex === 0) fail(`test L${L} 연습 ${JSON.stringify(r.log.map((x) => [x.fromMs, x.startIndex, x.clear]))}`); }
    else if (r.kind === 'resume') {
      const ph = Lc.level.phrases.find((q) => Math.abs(q.start_beat * Lc.beatMs - r.rl?.fromMs) < 1e-6);
      const okR = r.rl && ph && r.clear && r.attempts === 1 && Math.abs(r.after.levelMs - r.rl.fromMs) < 1 && Math.abs(r.after.scrollBeat - ph.start_beat) < 1e-6 && r.after.combo === r.rl.carried;
      if (!okR) fail(`test L${L} 이어 하기 ${JSON.stringify({ rl: r.rl, before: r.before, after: r.after, clear: r.clear, att: r.attempts })}`);
    } else if (r.kind === 'combo') { if (!r.same) fail(`test L${L} 콤보·판정 표시 켬/끔 시도 기록 다름`); }
    else if (r.clear && r.rv) {
      // 결과 화면 값 = node 재판정(levelAccuracy, grades 길이)
      const last = r.log[r.log.length - 1], rr = J.judgeAttempt(Lc, last.taps, { startIndex: last.startIndex || 0, carried: last.carried || null });
      const acc = J.levelAccuracy(Lc, rr, { practice: false });
      rep.misc.resultVals = (rep.misc.resultVals || 0) + 1;
      if (r.rv.accuracy !== acc || r.rv.combo !== rr.grades.length || (r.off === 0 && r.sd === 0 && r.rv.accuracy !== 100)) fail(`test L${L} 결과 값 ${JSON.stringify({ build: { a: r.rv.accuracy, c: r.rv.combo }, sim: { a: acc, c: rr.grades.length } })}`);
    }
    if (!r.kind && (!r.clear || (r.off === 0 && r.sd === 0 && (r.grade !== 3 || r.combo !== Lc.contacts.length)))) fail(`test L${L} off ${r.off} sd ${r.sd}: clear ${r.clear} grade ${r.grade} combo ${r.combo}`);
  }
  rep.misc.testRestarts = rs;
  const n = res.filter((r) => !r.kind);
  ok(`완벽(hit만)·±40·σ25 ${n.filter((r) => r.clear).length}/${n.length} 클리어(완벽 = 등급 3·콤보 = 접촉 수), 재시작 늦음 ${rs.late.length}·일찍 ${rs.early.length}·지붕 콩 ${rs.bump_roof.length}회 = ${[...rs.late, ...rs.early, ...rs.bump_roof].map((x) => x.toFixed(0)).join('/')} ms, 연습 ${res.filter((r) => r.kind === 'practice' && r.clear).length}/10, 이어 하기 ${res.filter((r) => r.kind === 'resume' && r.clear).length}/10, 콤보·판정 표시 켬/끔 같음 ${res.filter((r) => r.kind === 'combo' && r.same).length}/10`);
  await ctx.close();
}

// ---- 2) 일반 모드 실시간 ----
console.log('== 2) 일반 모드 실시간(오디오 켜짐, rAF + PointerEvent) ==');
{
  const { ctx, p } = await open(1280, 720, '');
  await p.mouse.click(640, 400);
  await p.waitForFunction(() => window.__game.state === 'levels');
  rep.misc.audio = await p.evaluate(() => window.__game.audioState());
  const levels = QUICK ? [0, 4, 9] : [...Array(10).keys()];
  for (const i of levels) {
    const r = await p.evaluate(async (i) => { const g = window.__game; g.loadLevel(i); const s = await g.autoplay(0, 0, 1); return { s, judge: g.judgeLog(), log: g.attemptLog() }; }, i);
    const es = r.judge.filter((x) => x.e != null).map((x) => x.e), maxE = Math.max(...es.map(Math.abs));
    rep.realtime.push({ level: i + 1, clear: r.s.clear, grade: r.s.grade, attempts: r.s.attempts, holds: r.judge.filter((x) => x.grade === 'hold').length, maxAbsErrMs: +maxE.toFixed(2), meanErrMs: +(es.reduce((a, b) => a + b, 0) / es.length).toFixed(2) });
    rejudgeLog(i, r.log);
    if (!r.s.clear) fail(`실시간 L${i + 1} 클리어 못 함 ${JSON.stringify(r.s.last).slice(0, 300)}`);
  }
  const rt = rep.realtime;
  ok(`실시간 ${rt.filter((x) => x.clear).length}/${rt.length} 클리어, 등급 ${rt.map((x) => x.grade).join(',')}, 지붕 참기 ${rt.map((x) => x.holds).join(',')}, 최대 |오차| ${Math.max(...rt.map((x) => x.maxAbsErrMs))} ms`);
  await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
  const saved = await p.evaluate(() => window.__game.save());
  const nCleared = Object.values(saved.levels).filter((x) => x.cleared).length, nCombo = Object.values(saved.levels).filter((x) => x.bestCombo > 0).length;
  rep.misc.persist = { nCleared, nCombo };
  if (nCleared !== levels.length || nCombo !== levels.length) fail(`새로고침 뒤 클리어 ${nCleared}·최고 콤보 ${nCombo}/${levels.length}`); else ok(`새로고침 뒤 클리어·최고 콤보 기록 ${nCleared}개 유지`);
  await p.mouse.click(640, 400);
  // 재시작 시간(실시간): 늦음 2회 · 일찍 2회 · 지붕 콩 2회. 탭은 실제 PointerEvent
  const rs = await p.evaluate(async () => {
    const g = window.__game, out = [], logs = [];
    const until = (f, ms = 2) => new Promise((res) => { const iv = setInterval(() => { if (f()) { clearInterval(iv); res(); } }, ms); });
    const tapAt = async (judgeMs) => { await until(() => g.judgeMs() >= judgeMs - 3, 1); while (g.judgeMs() < judgeMs) {} document.getElementById('cv').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerType: 'touch', isPrimary: true })); };
    g.loadLevel(0);
    await until(() => g.attempts >= 3, 50);
    out.push(...g.restartLog()); logs.push([0, g.attemptLog()]);
    g.loadLevel(1);
    for (let k = 0; k < 2; k++) {
      const att = g.attempts;
      await until(() => g.phase === 'run' && g.levelMs() > 200, 10);
      await tapAt(g.contacts()[0].zoneStart + 20);
      await until(() => g.attempts > att, 20);
      await new Promise((r) => setTimeout(r, 100));
    }
    out.push(...g.restartLog()); logs.push([1, g.attemptLog()]);
    g.loadLevel(4);
    for (let k = 0; k < 2; k++) {
      const att = g.attempts;
      await until(() => g.phase === 'run' && g.levelMs() > 100, 10);
      const ng = g.nogo()[0];
      for (const c of g.contacts()) if (c.kind !== 'nogo' && c.t < ng.t) await tapAt(c.t);
      await tapAt(ng.t + 10);
      await until(() => g.attempts > att, 20);
      await new Promise((r) => setTimeout(r, 100));
    }
    out.push(...g.restartLog()); logs.push([4, g.attemptLog()]);
    return { out, logs };
  });
  rep.misc.restarts = rs.out;
  for (const [li, log] of rs.logs) rejudgeLog(li, log);
  const rng = bal.restart.allowed_range_s.map((x) => x * 1000);
  const kinds = ['late', 'early', 'bump_roof'].map((k) => rs.out.filter((x) => x.kind === k).length);
  const outR = rs.out.filter((x) => x.ms < rng[0] || x.ms > rng[1]);
  if (outR.length || kinds.some((n) => n < 2)) fail(`재시작 시간 ${JSON.stringify(rs.out)}`); else ok(`재시작(실시간) ${rs.out.map((x) => `${x.kind} ${x.ms.toFixed(0)}`).join(' · ')} ms (기준 ${rng.join('~')})`);
  // L1: Playwright 마우스(CDP)
  {
    await p.evaluate(() => window.__game.loadLevel(0));
    const tStart = Date.now();
    for (;;) {
      const s = await p.evaluate(() => { const g = window.__game; if (g.state === 'result' || g.phase === 'clear') return { done: true }; const d = new Set(g.judgeLog().map((x) => x.i)); const c = g.contacts().find((x) => x.kind !== 'nogo' && !d.has(x.i)); return { done: false, wait: c ? c.t - g.judgeMs() : 1e9, att: g.attempts }; });
      if (s.done || s.att > 1 || Date.now() - tStart > 60000) break;
      if (s.wait > 60) { await new Promise((r) => setTimeout(r, s.wait - 45)); continue; }
      const w = await p.evaluate(() => { const g = window.__game; const d = new Set(g.judgeLog().map((x) => x.i)); const c = g.contacts().find((x) => x.kind !== 'nogo' && !d.has(x.i)); return c.t - g.judgeMs(); });
      if (w > 3) await new Promise((r) => setTimeout(r, w - 3));
      await p.mouse.down(); await p.mouse.up();
      await p.waitForTimeout(30);
    }
    const r = await p.evaluate(() => ({ s: window.__game.summary(), j: window.__game.judgeLog(), log: window.__game.attemptLog() }));
    rejudgeLog(0, r.log);
    const es = r.j.map((x) => x.e);
    rep.misc.mouseL1 = { clear: r.s.clear || r.s.phase === 'clear', attempts: r.s.attempts, errs: es.map((x) => +x.toFixed(1)) };
    if (!(r.s.clear || r.s.phase === 'clear')) fail(`마우스 L1 클리어 못 함 ${JSON.stringify(r.s).slice(0, 200)}`); else ok(`마우스(CDP) L1 클리어, 탭 오차 ${Math.min(...es).toFixed(0)}~${Math.max(...es).toFixed(0)} ms`);
  }
  // 백그라운드 멈춤 → 이어 하기 = 그 구절 받침 쉼 처음으로 되감기
  const bg = await p.evaluate(async () => {
    const g = window.__game; g.loadLevel(2);
    await new Promise((r) => setTimeout(r, 2600));
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    const st = g.state, txt = document.getElementById('pTitle').textContent, lt0 = g.levelMs();
    await new Promise((r) => setTimeout(r, 400));
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    document.getElementById('pResume').click();
    return { st, txt, lt0, after: g.levelMs(), state: g.state, rl: g.resumeLog() };
  });
  rep.misc.background = bg;
  if (bg.st !== 'pause' || bg.state !== 'play' || !(bg.after <= bg.lt0 + 30)) fail(`백그라운드 멈춤 ${JSON.stringify(bg)}`); else ok(`백그라운드 → 멈춤(${bg.txt}), 이어 하기 → 레벨 시간 ${bg.lt0.toFixed(0)} → ${bg.after.toFixed(0)} ms(구절 받침 쉼으로 되감기 ${bg.rl.length}회)`);
  // 오디오 시계 톱니(소리 맞추기 쏠림 원인 확인용): currentTime 계단 높이
  rep.misc.audioClock = await p.evaluate(() => window.__game.audioClock());
  ok(`오디오 currentTime 계단 높이(hi − lo) ${(1000 * (rep.misc.audioClock?.step ?? NaN)).toFixed(2)} ms → 가운데 사용(반 칸 보정)`);
  // 보호자 문
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
if (rejudge.mismatch) fail(`빌드 판정 ≠ 시뮬레이터 판정 ${rejudge.mismatch}/${rejudge.n} ${JSON.stringify(rejudge.examples).slice(0, 1500)}`);
else ok(`빌드 시도(구간) ${rejudge.n}회 = tools/sim/judge.mjs 다시 판정(startIndex·carried 포함), 불일치 0`);

// ---- 4) 4해상도 화면 ----
console.log('== 4) 4해상도 화면 ==');
const RES = [[360, 640], [412, 915], [640, 360], [1280, 720]];
const SAVE = { v: 1, levels: { '01': { best: 1, grade: 3, cleared: true, seenCard: true, bestCombo: 18 }, '02': { best: 1, grade: 2, cleared: true, bestCombo: 21 }, '03': { best: 1, grade: 1, cleared: true, bestCombo: 9 }, '04': { best: 0.64, bestCombo: 12 }, '05': {} }, drift: { on: true, sessions: 1 } };
for (const [w, h] of RES) {
  for (const lang of QUICK ? ['ko'] : ['ko', 'en']) {
    const tag = `${w}x${h}-${lang}`;
    const { ctx, p } = await open(w, h, `?lang=${lang}`);
    await p.evaluate((s) => { try { localStorage.setItem('rhythm02.v1', JSON.stringify(s)); } catch {} }, SAVE);
    await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
    await shot(p, `${tag}-01-title.png`); await checkButtons(p, `${tag} title`);
    await p.mouse.click(w / 2, h / 2); await p.waitForFunction(() => window.__game.state === 'levels');
    await shot(p, `${tag}-02-levels.png`); await checkButtons(p, `${tag} levels`);
    if (lang === 'ko' || QUICK) rep.aria[`${tag} levels`] = await p.locator('#levels').ariaSnapshot();
    await p.click('#lv1'); await p.waitForFunction(() => window.__game.state === 'start');
    await shot(p, `${tag}-03-start.png`); await checkButtons(p, `${tag} start`);
    if (lang === 'ko' || QUICK) rep.aria[`${tag} start`] = await p.locator('#start').ariaSnapshot();
    await p.evaluate(() => { window.__game.show('levels'); }); await p.click('#lv3'); await p.waitForFunction(() => window.__game.state === 'start');
    await p.click('#stReplay'); await p.waitForFunction(() => window.__game.state === 'card');
    await shot(p, `${tag}-04-card.png`); await checkButtons(p, `${tag} card`);
    await p.evaluate(() => window.__game.loadLevel(4));
    await p.waitForFunction(() => window.__game.levelMs() > 2.9 * 60000 / 112);
    await shot(p, `${tag}-05-play.png`); await checkButtons(p, `${tag} play`);
    if (lang === 'ko' || QUICK) rep.aria[`${tag} play`] = await p.locator('#hud').ariaSnapshot();
    await p.click('#hPause'); await p.waitForFunction(() => window.__game.state === 'pause');
    await shot(p, `${tag}-06-pause.png`); await checkButtons(p, `${tag} pause`);
    await p.evaluate(() => window.__game.show('guardian'));
    await shot(p, `${tag}-07-guardian.png`); await checkButtons(p, `${tag} guardian`);
    await p.evaluate(() => window.__game.show('sync'));
    await shot(p, `${tag}-08-sync.png`); await checkButtons(p, `${tag} sync`);
    await ctx.close();
    // 테스트 모드(가상 시계) 장면: L1 손가락, L3 구름, L5 지붕 밑·콤보, L6 가지, L7 언덕, 실패 세 판, 클리어 결과
    const t = await open(w, h, `?test=1&lang=${lang}`);
    const q = t.p;
    await q.evaluate(() => { const g = window.__game; g.loadLevel(0); g.step(0.8 + 2.95); });
    await shot(q, `${tag}-11-l1-finger.png`); await checkButtons(q, `${tag} l1-finger`);
    const fi = await q.evaluate(() => window.__game.frameInfo());
    if (!fi.tut) fail(`${tag}: L1 손가락 시간에 tut_tap 안 보임`);
    // 판정 이름·%: 첫 접촉을 정확히 친 뒤 튐이 끝난 순간 화면, 이름 실제 렌더 폭 ≤ 자리 폭·글자 ≥ 28 px
    await q.evaluate(() => { const g = window.__game; g.loadLevel(0); const c = g.contacts()[0]; g.pressAt(c.t + 30); g.step(0.12); });
    const js = await q.evaluate(() => ({ shown: window.__game.judgeShown(), m: window.__game.judgeMetrics() }));
    await shot(q, `${tag}-21-judge-name.png`);
    rep.misc['judge ' + tag] = js;
    if (!js.shown || js.shown.pct == null) fail(`${tag}: 판정 이름·% 안 보임`);
    for (const [k, v] of Object.entries(js.m)) if (v.w > v.zoneW + 0.5 || v.px < 28) fail(`${tag}: 판정 이름 ${k} "${v.name}" 폭 ${v.w} > 자리 ${v.zoneW} 또는 ${v.px}px < 28`);
    // 그 레벨 첫 물체(type)의 beat_in + db 박 시각 장면(물체 자리는 레벨 데이터에서)
    const scene = async (li, type, db, name) => {
      await q.evaluate(({ li, type, db }) => { const g = window.__game; g.loadLevel(li); const o = g.levelObjects().find((x) => x.type === type && !x.role); const bpm = 60000 / (g.contacts()[1].t - g.contacts()[0].t) * (g.contacts()[1].beat - g.contacts()[0].beat); const T = (o.beat_in + db) * 60000 / bpm; for (const c of g.contacts()) if (c.kind !== 'nogo' && c.t < T) g.pressAt(c.t); g.step(Math.max(0, (T - g.levelMs()) / 1000)); }, { li, type, db });
      await shot(q, `${tag}-${name}.png`);
    };
    await scene(2, 'cloud', 0.9, '12-l3-cloud');
    await scene(4, 'roof', 1.0, '13-l5-roof-sit');
    await scene(5, 'roof', -2.0, '14-l6-roof-approach-combo');
    await scene(5, 'branch', -1.2, '15-l6-branch');
    await scene(6, 'hill', 0.2, '16-l7-hill');
    await q.evaluate(() => { const g = window.__game; g.loadLevel(1); g.pressAt(g.contacts()[0].zoneStart + 5); g.step(0.3); });
    await shot(q, `${tag}-17-fail-early.png`);
    await q.evaluate(() => { const g = window.__game; g.step(0.4); });
    await shot(q, `${tag}-18-fail-retry.png`);
    await q.evaluate(() => { const g = window.__game; g.loadLevel(4); const ng = g.nogo()[0]; for (const c of g.contacts()) if (c.kind !== 'nogo' && c.t < ng.t) g.pressAt(c.t); g.pressAt(ng.t + 10); g.step(0.12); });
    await shot(q, `${tag}-19-fail-bump-roof.png`);
    await q.evaluate(() => { const g = window.__game; g.loadLevel(2); g.autoplay(0, 0, 1); g.step(0.8); });
    await shot(q, `${tag}-20-result.png`); await checkButtons(q, `${tag} result`);
    if (lang === 'ko' || QUICK) rep.aria[`${tag} result`] = await q.locator('#result').ariaSnapshot();
    await t.ctx.close();
  }
}
ok(`화면 ${rep.shots.length}장 → ${OUT}`);

// ---- 5) 접근성 트리 ----
console.log('== 5) 접근성 트리(ariaSnapshot) ==');
{
  const k = (key) => STR[key].ko;
  const A = rep.aria['360x640-ko levels'] || '', S = rep.aria['360x640-ko start'] || '', Pl = rep.aria['360x640-ko play'] || '', Rs = rep.aria['360x640-ko result'] || '';
  const need = [
    ['레벨 선택: 격자 이름', A.includes(k('levels_screen'))],
    ['레벨 선택: L1 이름 + 등급', A.includes(`${k('level1_name')}, ${k('grade_3')}`)],
    ['레벨 선택: L4 이름만(못 깸) + progressbar', A.includes(`button "${k('level4_name')}"`) && /progressbar "가 본 만큼"/.test(A)],
    ['레벨 선택: 잠김', A.includes(k('levelcard_locked'))],
    ['레벨 선택: 최고 콤보 meter(버튼 밖, valuetext 숫자)', new RegExp(`meter "${k('aria_best_combo')}"[^\\n]*: "?18"?`).test(A) || A.includes(`meter "${k('aria_best_combo')}"`)],
    ['레벨 선택: 설정 버튼', A.includes(k('btn_settings'))],
    ['시작 판: 레벨 이름 img + 등급 img', S.includes(`img "${k('level2_name')}"`) && S.includes(`img "${k('grade_2')}"`)],
    ['플레이: 콤보 meter', Pl.includes(`meter "${k('aria_combo')}"`)],
    ['플레이: 진행도·시도', Pl.includes(k('aria_progress')) && Pl.includes(k('aria_attempts'))],
    ['결과: 등급 img', Rs.includes(`img "${k('grade_3')}"`) || Rs.includes('img "구름')],
    ['결과: 정확도 meter', Rs.includes(`meter "${k('result_accuracy')}"`)],
    ['결과: 최고 콤보 meter', Rs.includes(`meter "${k('result_combo')}"`)],
  ];
  for (const [n, v] of need) if (!v) fail(`접근성 트리: ${n}`);
  ok(`접근성 트리 ${need.filter((x) => x[1]).length}/${need.length}`);
  // 불러오기 오류(데이터 실패): ↻ 버튼 이름, html lang, 제목
  for (const lang of ['en', 'ko']) {
    const { ctx, p } = await open(412, 915, `?lang=${lang}`, { expectError: true, before: (pg) => pg.route('**/data/balance.json', (r) => r.abort()) });
    await p.waitForFunction(() => !document.getElementById('bootErr').hidden, null, { timeout: 20000 });
    const er = await p.evaluate(() => ({ lang: document.documentElement.lang, title: document.title, btn: document.getElementById('bootRetry').getAttribute('aria-label'), svg: !!document.querySelector('#bootRetry svg') }));
    const snap = await p.locator('#boot').ariaSnapshot();
    rep.aria[`boot-error-${lang}`] = { ...er, snap };
    await shot(p, `412x915-${lang}-30-load-error.png`);
    if (er.lang !== lang || er.title !== STR.title[lang] || er.btn !== STR.btn_retry[lang] || !er.svg || !snap.includes(STR.btn_retry[lang])) fail(`불러오기 오류 ${lang} ${JSON.stringify(er)}`);
    await ctx.close();
  }
  ok('불러오기 오류 화면: ↻ 그림 인라인·버튼 이름·html lang·제목 = 선택 언어(en·ko)');
}

// ---- 6) 성능: 6배 CPU 스로틀링 ----
console.log('== 6) 6배 스로틀링 ==');
for (const dsf of QUICK ? [1] : [1, 3]) {
  const { ctx, p } = await open(412, 915, '', { dsf });
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  // 타이틀 첫 탭(오디오 잠금 해제 + 레벨 선택) 가장 긴 프레임
  await p.evaluate(() => { window.__fr = []; let last = 0; const f = (t) => { if (last) window.__fr.push([t, t - last]); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await p.waitForTimeout(500);
  const t0 = await p.evaluate(() => performance.now());
  await p.mouse.click(200, 400);
  await p.waitForTimeout(800);
  const first = await p.evaluate((t0) => Math.max(...window.__fr.filter(([t]) => t > t0).map(([, d]) => d)), t0);
  await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    const g = window.__game;
    let longs = [];
    const meas = (ms) => new Promise((res) => { const d = []; longs = []; let last = 0; const t0 = performance.now(); const f = (t) => { if (last) { d.push(t - last); if (t - last > 22) longs.push([Math.round(t - t0), +(t - last).toFixed(1)]); } last = t; if (t - t0 < ms) requestAnimationFrame(f); else res(d); }; requestAnimationFrame(f); });
    const stat = (d) => { const s = [...d].sort((a, b) => b - a), n = Math.max(1, Math.floor(s.length * 0.01)); const avg = d.reduce((a, b) => a + b, 0) / d.length; return { frames: d.length, avgFps: +(1000 / avg).toFixed(1), low1Fps: +(1000 / (s.slice(0, n).reduce((a, b) => a + b, 0) / n)).toFixed(1), maxMs: +s[0].toFixed(1), long: longs.slice(0, 5) }; };
    const out = {};
    for (const li of [4, 9]) {
      g.loadLevel(li);
      out['start' + (li + 1)] = stat(await meas(2500));
      await new Promise((res) => { const iv = setInterval(() => { if (g.phase === 'fail') { clearInterval(iv); res(); } }, 20); });
      out['restart' + (li + 1)] = stat(await meas(2500));
    }
    return out;
  });
  rep.perf.push({ dsf, firstTapMaxFrameMs: +first.toFixed(1), ...r });
  const lows = Object.values(r).map((x) => x.low1Fps);
  if (Math.min(...lows) < 45) fail(`6배 스로틀 DPR ${dsf} 1% low ${lows.join('/')}`);
  ok(`DPR ${dsf}: 첫 탭 가장 긴 프레임 ${first.toFixed(0)} ms · ${Object.entries(r).map(([k, v]) => `${k} 평균 ${v.avgFps}·1% low ${v.low1Fps}`).join(' · ')}`);
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
