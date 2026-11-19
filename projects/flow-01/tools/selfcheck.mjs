#!/usr/bin/env node
// flow-01 웹 빌드 자체 확인 (game-developer, 1-3). Playwright 는 설치하지 않고 있는 것을 씀:
//   require('playwright') → require('playwright-core') → 환경 변수 PLAYWRIGHT_CORE=<playwright-core 폴더>
//   node projects/flow-01/tools/selfcheck.mjs [--channel msedge] [--out projects/flow-01/reviews/round-1/dev-shots] [--no-shots]
//
// 1) sync-build --check: 빌드 복사본(js/board.js·rng.js, data/*) = 기획 원본 바이트
// 2) 빌드 배치 식 = layout.json (4해상도 × 판 5종 + 지도·결과·타이틀·보호자·오류)
// 3) ?test=1: 50레벨(훅 levelCount) 모두 생성 답(solution) 드래그 열로 완료 → 별·결과 100 %·모두 1단, 결과 화면, 드래그 기록을 board.mjs playDrag 로 다시 넣어 같은 결과
//    + 규칙 확인(L2 빈칸 숨 쉬기 3회·3번째에 gap_left 글, 막힘, 자르기·되살림, 되돌리기 이동 수 유지, 완료 1.0 s 잠금·결과 버튼 1280 ms)
// 4) 일반 모드(오디오 켬, rAF): 실제 마우스 포인터로 10레벨 생성 답 드래그 → 완료·별, 백그라운드 → 오디오 suspended, 새로고침 뒤 진행 유지
// 5) 4해상도 버튼 48 px 이상·겹침 0, ko/en 글 넘침 0, 스크린샷
// 콘솔 에러·경고 0, 외부 요청 0. 정적 서버는 tools/serve.mjs 를 8740~8749 중 빈 포트에 하나 띄우고 그 PID 만 끝에 종료.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const PROJ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(PROJ, '../..');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const channel = opt('--channel', 'msedge');
const OUT = resolve(opt('--out', join(PROJ, 'reviews/round-1/dev-shots')));
const SHOTS = !args.includes('--no-shots');
mkdirSync(OUT, { recursive: true });

let pw = null;
const req = createRequire(import.meta.url);
for (const name of ['playwright', 'playwright-core']) { try { pw = req(name); break; } catch {} }
if (!pw && process.env.PLAYWRIGHT_CORE) { try { pw = createRequire(join(process.env.PLAYWRIGHT_CORE, 'index.js'))(process.env.PLAYWRIGHT_CORE); } catch {} }
if (!pw) { console.error('playwright 를 찾지 못함: PLAYWRIGHT_CORE=<playwright-core 폴더> 로 지정(설치하지 않음)'); process.exit(2); }

const Bm = await import(pathToFileURL(join(PROJ, 'tools/core/board.mjs')).href);
const LAYOUT = JSON.parse(readFileSync(join(PROJ, 'assets/layout.json'), 'utf8'));
const BAL = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8'));
const LEVELS = readdirSync(join(PROJ, 'levels')).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(join(PROJ, 'levels', f), 'utf8')));
// r3: 어려운 판 5단계 × 10(훅 색인 50~99)
const HARD = readdirSync(join(PROJ, 'levels-hard')).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(join(PROJ, 'levels-hard', f), 'utf8'))).sort((a, b) => a.stage - b.stage || a.stage_pos - b.stage_pos);
const ALL = LEVELS.concat(HARD);
const solOf = (lv) => lv.pairs.map((p) => lv.solution.find((s) => s.id === p.id).path);

let bad = 0;
const fail = (m) => { bad++; console.log('FAIL', m); };
const ok = (m) => console.log('  ok', m);
const rep = { console: [], external: [], failed: [], shots: [] };

// 1) 복사본 확인
{
  const r = spawnSync(process.execPath, [join(PROJ, 'tools/sync-build.mjs'), '--check'], { encoding: 'utf8' });
  if (r.status !== 0) fail('sync-build --check: ' + r.stdout.trim()); else ok('sync-build --check ' + r.stdout.trim());
}

// ---- 서버(자기 것만)
let server = null, PORT = 0;
for (let p = 8740; p <= 8749 && !server; p++) {
  try { await fetch(`http://127.0.0.1:${p}/`); continue; } catch {}
  const ch = spawn(process.execPath, [join(PROJ, 'tools/serve.mjs'), String(p)], { stdio: ['ignore', 'pipe', 'pipe'] });
  const up = await new Promise((res) => { ch.stdout.once('data', () => res(true)); ch.once('exit', () => res(false)); setTimeout(() => res(false), 4000); });
  if (up) { server = ch; PORT = p; }
}
if (!server) { console.error('8740~8749 에서 서버를 못 띄움'); process.exit(3); }
console.log(`서버 pid ${server.pid} 포트 ${PORT}`);
const cleanup = () => { try { server.kill(); } catch {} };
process.on('exit', cleanup);
const BASE = `http://127.0.0.1:${PORT}/games/flow-01/`;

const browser = await pw.chromium.launch({ channel, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
async function open(w, h, q = '?test=1', { fresh = true, store = null, locale = 'ko-KR' } = {}) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale });
  const p = await c.newPage();
  const tag = `${w}x${h}${q}`;
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) rep.console.push(`[${tag}] ${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => rep.console.push(`[${tag}] pageerror: ${e.message}`));
  p.on('request', (r) => { const u = new URL(r.url()); if (/^(https?|wss?):$/.test(u.protocol) && !['localhost', '127.0.0.1'].includes(u.hostname)) rep.external.push(r.url()); });
  p.on('response', (r) => { if (r.status() >= 400) rep.failed.push(`[${tag}] ${r.url()} ${r.status()}`); });
  await p.goto(BASE + q);
  await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 30000 });
  if (fresh || store) {
    await p.evaluate((s) => { localStorage.clear(); if (s) localStorage.setItem('flow01.v1', JSON.stringify(s)); }, store);
    await p.reload(); await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 30000 });
  }
  return { c, p };
}
const shot = async (p, name) => { if (!SHOTS) return; await p.screenshot({ path: join(OUT, name) }); rep.shots.push(name); };
const G = (p, f, a) => p.evaluate(f, a);

// 2) 배치 식 = layout.json
{
  const { c, p } = await open(412, 915);
  let n = 0, diff = 0;
  const cmp = (a, b, path) => { if (a && typeof a === 'object') { for (const k of Object.keys(a)) if (!k.startsWith('_') && b && k in b) cmp(a[k], b[k], path + '.' + k); return; } if (typeof a === 'number' || typeof a === 'boolean') { n++; if (a !== b) { diff++; if (diff < 10) console.log('   diff', path, a, b); } } };
  for (const rk of Object.keys(LAYOUT.play)) {
    const [W, H] = rk.split('x').map(Number);
    for (const bk of Object.keys(LAYOUT.play[rk])) { const [cc, rr] = bk.split('x').map(Number); const got = await G(p, ([W, H, cc, rr]) => window.__game.calcLayout(W, H, cc, rr), [W, H, cc, rr]); cmp(LAYOUT.play[rk][bk], got.play, `play.${rk}.${bk}`);
      if (bk === '4x4') for (const s of ['map', 'result', 'title', 'guardian', 'error']) cmp(LAYOUT[s][rk], got[s], `${s}.${rk}`); }
    for (const bk of Object.keys(LAYOUT.play_wide[rk])) { const [cc, rr] = bk.split('x').map(Number); const got = await G(p, ([W, H, cc, rr]) => window.__game.calcLayout(W, H, cc, rr), [W, H, cc, rr]); cmp(LAYOUT.play_wide[rk][bk], got.playWide, `play_wide.${rk}.${bk}`); }
  }
  if (diff) fail(`배치 식 ≠ layout.json ${diff}/${n}`); else ok(`배치 식 = layout.json (${n}개 값)`);
  await c.close();
}

// 3) 테스트 훅 경로
{
  const { c, p } = await open(412, 915);
  // 결과 % = 한 번에 이은 쌍 / 쌍 수, 신기록 표지
  const l1 = LEVELS[0], s1 = solOf(l1);
  const nb = await G(p, (s1) => {
    const g = window.__game;
    g.loadLevel(0); g.step(300);
    g.drag(s1[0]); g.drag(s1[1]); g.undo(); g.drag(s1[1]); g.drag(s1[2]);
    const r1 = g.result; g.step(2400); const vis1 = !document.getElementById('rBest').hidden;
    g.loadLevel(0); g.step(300); for (const c of s1) g.drag(c);
    const r2 = g.result; g.step(2400); const vis2 = !document.getElementById('rBest').hidden;
    return { r1, r2, vis1, vis2 };
  }, s1);
  const exp1 = Math.floor((100 * (l1.pairs.length - 1)) / l1.pairs.length);
  if (nb.r1.accuracyPct !== exp1 || nb.r1.star || nb.vis1 || nb.r2.accuracyPct !== 100 || !nb.r2.newBest || !nb.vis2) fail('결과 %·신기록 ' + JSON.stringify(nb)); else ok(`결과 %: 한 쌍을 되돌려 다시 이음 → ${exp1} %·별 없음, 다음 판 100 % → 신기록 표지`);
  const hookCount = await G(p, () => window.__game.levelCount);
  if (hookCount !== ALL.length) fail(`훅 levelCount ${hookCount} ≠ 레벨 파일 ${ALL.length}(일반 ${LEVELS.length} + 어려운 ${HARD.length})`); else ok(`훅 levelCount = ${hookCount} (일반 ${LEVELS.length} + 어려운 ${HARD.length})`);
  const replay = [];
  for (let i = 0; i < ALL.length; i++) {
    const lv = ALL[i];
    await G(p, (i) => { window.__game.loadLevel(i); window.__game.closeCard(); window.__game.step(300); }, i);
    const sol = solOf(lv);
    for (let k = 0; k < sol.length; k++) {
      const r = await G(p, (cells) => window.__game.drag(cells), sol[k]);
      if (!r.pressed || !r.changed) fail(`L${lv.order} 쌍 ${k} 드래그가 판을 바꾸지 않음`);
      const j = await G(p, () => window.__game.judge);
      if (!j || j.grade !== 1) fail(`L${lv.order} 쌍 ${k} 판정 ${j && j.grade} (1단 기대)`);
    }
    const s = await G(p, () => ({ b: window.__game.board, r: window.__game.result, moves: window.__game.moves, log: window.__game.dragLog, st: window.__game.state }));
    if (!s.b.completed || !s.r || s.r.accuracyPct !== 100 || !s.r.star || s.moves !== lv.pairs.length) fail(`L${lv.order || lv.id} 완료 ${s.b.completed} % ${s.r && s.r.accuracyPct} 별 ${s.r && s.r.star} 이동 ${s.moves}`);
    // 완료 1.0 s 잠금 → 결과
    const lockOk = await G(p, () => { const g = window.__game; const a = g.drag([[0, 0], [0, 1]]).pressed === false; g.step(990); const b = g.state === 'play'; g.step(30); return a && b && g.state === 'result'; });
    if (!lockOk) fail(`L${lv.order} 완료 잠금 1.0 s → 결과 화면 전환 아님`);
    const early = await G(p, () => window.__game.resultNext());
    if (early) fail(`L${lv.order} 결과 버튼이 1280 ms 전에 눌림`);
    const pctTxt = await G(p, () => { window.__game.step(1600); return document.querySelector('#rPct b').textContent; }).then(async (t) => (t === '100%' ? t : G(p, () => { window.__game.step(1000); return document.querySelector('#rPct b').textContent; })));
    if (pctTxt !== '100%') fail(`L${lv.order} 결과 % 글 ${pctTxt}`);
    // 빌드 드래그 기록 → board.mjs 재판정
    const pz = Bm.makePuzzle(lv), g = Bm.newGame(pz, { cut: BAL.input.cut_enabled });
    for (const d of s.log) Bm.playDrag(g, d.map(([x, y]) => y * lv.width + x));
    replay.push(g.completed && g.moves === s.moves && Bm.isStar(g));
    if (!replay[i]) fail(`L${lv.order} 드래그 기록 재판정 불일치`);
  }
  ok(`일반 ${LEVELS.length} + 어려운 ${HARD.length}판 생성 답 드래그 → 완료·별·결과 100 %·1단, 재판정 일치 ${replay.filter(Boolean).length}/${ALL.length}`);

  // 규칙 확인
  const l2 = LEVELS[1];
  const straight = l2.pairs.map((pr, k) => (k === 2 ? [pr.a, pr.b] : solOf(l2)[k]));
  const gap = await G(p, (paths) => {
    const g = window.__game; g.loadLevel(1); g.closeCard(); g.step(300); for (const c of paths) g.drag(c);
    const r = { all: g.board.pairDots.every(Boolean), done: g.board.completed, n: [], text: [] };
    for (let t = 0; t < 8000; t += 100) { g.step(100); r.n.push(g.board.gap); r.text.push(g.board.text); }
    r.gapSounds = g.sfxLog.filter((x) => x === 'gap_hint').length;
    return r;
  }, straight);
  const STR = JSON.parse(readFileSync(join(PROJ, 'strings.json'), 'utf8'));
  const firstText = gap.text.findIndex((x) => x === STR.gap_left.ko);
  if (!gap.all || gap.done || Math.max(...gap.n) !== BAL.fx_ms.empty_breath_max_times || gap.gapSounds !== 3 || firstText < 0 || gap.n[firstText] !== 3) fail(`L2 빈칸 신호: 모두 이음 ${gap.all} 완료 ${gap.done} 숨 ${Math.max(...gap.n)} 소리 ${gap.gapSounds} 글 첫 등장 숨 ${gap.n[firstText]}`);
  else ok('L2 곧게 이으면 빈칸 숨 쉬기 3회·gap_hint 3회, gap_left 글은 3번째 숨 쉬기부터');
  // 자르기·되살림·막힘·되돌리기: board.mjs 로 레벨마다 "다른 쌍 점 → 이웃한 답 선 칸 → 되돌아옴" 드래그를 찾음
  let cutCase = null, blockCase = null;
  for (let li = 0; li < LEVELS.length && (!cutCase || !blockCase); li++) {
    const lv = LEVELS[li], sol = solOf(lv), W = lv.width;
    const pz = Bm.makePuzzle(lv);
    for (let k = 1; k < lv.pairs.length && !cutCase; k++) for (const ep of [lv.pairs[k].a, lv.pairs[k].b]) {
      const body = sol[0].slice(1, -1);
      const n = body.find(([x, y]) => Math.abs(x - ep[0]) + Math.abs(y - ep[1]) === 1);
      if (n && !cutCase) cutCase = { li, first: sol[0], drag: [ep, n, ep] };
    }
    for (let k = 0; k < lv.pairs.length && !blockCase; k++) for (let m = 0; m < lv.pairs.length && !blockCase; m++) if (m !== k) for (const ep of [lv.pairs[m].a, lv.pairs[m].b]) {
      const a = lv.pairs[k].a; if (Math.abs(a[0] - ep[0]) + Math.abs(a[1] - ep[1]) === 1) blockCase = { li, drag: [a, ep] };
    }
  }
  const r3 = await G(p, ({ cutCase, blockCase }) => {
    const g = window.__game, o = {};
    g.loadLevel(cutCase.li); g.closeCard(); g.step(300);
    g.drag(cutCase.first); const m1 = g.moves, before = JSON.stringify(g.board.paths);
    const n0 = g.sfxLog.filter((x) => x === 'cut').length;
    const r = g.drag(cutCase.drag);
    o.cut = g.sfxLog.filter((x) => x === 'cut').length > n0;
    o.restore = JSON.stringify(g.board.paths) === before && g.moves === m1 && !r.changed;
    g.drag([cutCase.drag[0], cutCase.drag[1]]); o.cutKept = !g.board.pairDots[0] && g.moves === m1 + 1;
    const m2 = g.moves; g.undo(); o.undoKeeps = g.moves === m2 && g.board.pairDots[0];
    g.loadLevel(blockCase.li); g.closeCard(); g.step(300);
    const rb = g.drag(blockCase.drag); o.blocked = !rb.changed && g.moves === 0;
    return o;
  }, { cutCase, blockCase });
  if (!cutCase || !r3.cut || !r3.restore || !r3.cutKept) fail(`자르기 L${cutCase && cutCase.li + 1}: 소리 ${r3.cut} 되살림 ${r3.restore} 손 떼면 확정 ${r3.cutKept}`); else ok(`L${cutCase.li + 1} 자르기 → 같은 드래그에서 되돌아오면 되살아남(이동 0), 손 떼면 잘림 확정`);
  if (!r3.undoKeeps) fail('되돌리기가 이동 수를 바꾸거나 되살리지 못함'); else ok('되돌리기: 이동 수 그대로, 잘린 선 되살아남');
  if (!blockCase || !r3.blocked) fail('다른 색 점 막힘 확인 실패'); else ok(`L${blockCase.li + 1} 다른 색 점으로는 못 들어감(판 변화 0)`);
  // round-2 규칙: H2 처음부터 = 새 시도·바로 다음 되돌리기 = 취소 / H4 막힘 bump / S16 이동 수 도움 / 카드 6 s·400 ms / 색 슬롯 돌려쓰기
  const r2 = await G(p, ({ s1, l8, blockCase, PAL, L }) => {
    const g = window.__game, o = {};
    g.loadLevel(0); g.step(300); g.drag(s1[0]); g.drag(s1[1]);
    const before = JSON.stringify(g.board.paths), m = g.moves;
    g.restart(); o.resetZero = g.moves === 0 && g.board.paths.every((q) => !q.length);
    g.undo(); o.undoCancels = g.moves === m && JSON.stringify(g.board.paths) === before;
    g.restart(); g.drag(s1[0]); g.undo(); o.noCancelAfterChange = g.moves === 1;
    g.loadLevel(blockCase.li); g.closeCard(); g.step(300);
    const n0 = g.sfxLog.filter((x) => x === 'bump').length; g.drag(blockCase.drag); o.bump = g.sfxLog.filter((x) => x === 'bump').length === n0 + 1;
    g.loadLevel(l8.i); g.step(300);
    const trig = l8.trig; let k = 0; o.breathBefore = g.board.helpBreath;
    while (g.moves < trig && k++ < 200) { g.drag(l8.s0); g.undo(); }
    g.step(20); o.breathAt = g.board.helpBreath; o.trigMoves = g.moves;
    g.help(); g.step(20); o.breathAfterHelp = g.board.helpBreath;
    g.clearProgress();
    g.loadLevel(1); o.card0 = g.board.card; o.pressDuring = g.drag(L.l2s0).pressed;
    g.step(300); document.getElementById('pCard').dispatchEvent(new PointerEvent('pointerdown')); o.earlyTapIgnored = g.board.card && !g.board.locked === false;
    g.step(5800); o.openAt6 = g.board.card; g.step(300); o.closedAfter = !g.board.card && !g.board.locked;
    o.colors = [];
    for (const i of L.rotIdx) { g.loadLevel(i); o.colors.push(g.board.colors); }
    return o;
  }, { s1, l8: { i: 7, trig: BAL.help.moves_trigger_by_level['08'], s0: solOf(LEVELS[7])[0] }, blockCase, PAL: null, L: { l2s0: solOf(LEVELS[1])[0], rotIdx: LEVELS.map((lv, i) => i).filter((i) => LEVELS[i].order >= 11).slice(0, 12) } });
  const PALj = JSON.parse(readFileSync(join(PROJ, 'assets/palette.json'), 'utf8'));
  const expCols = LEVELS.filter((lv) => lv.order >= 11).slice(0, 12).map((lv) => { const k = lv.pairs.length, rot = (k === 3 || k === 4) ? PALj.slot_rotation.by_level[String(lv.order)][String(k)] : null; return lv.pairs.map((pr) => PALj.pairs[rot ? rot[pr.color_slot] : pr.color_slot].key); });
  if (!r2.resetZero || !r2.undoCancels || !r2.noCancelAfterChange) fail('H2 처음부터/되돌리기 ' + JSON.stringify(r2)); else ok('H2: 처음부터 = 이동 수 0·판 비움, 바로 다음 되돌리기 = 처음부터 취소(판·이동 수 복구), 판이 바뀐 뒤엔 취소 없음');
  if (!r2.bump) fail('H4 막힘 bump 소리 없음'); else ok('H4: 막힘 → bump 소리 1회(튕김)');
  if (r2.breathBefore || !r2.breathAt || r2.breathAfterHelp) fail('S16 이동 수 도움 ' + JSON.stringify({ b: r2.breathBefore, a: r2.breathAt, m: r2.trigMoves, h: r2.breathAfterHelp })); else ok(`S16: L8 이동 수 ${r2.trigMoves} ≥ ${BAL.help.moves_trigger_by_level['08']} → 도움 숨 쉼, 누르면 그 시도 동안 끔`);
  if (!r2.card0 || r2.pressDuring || !r2.openAt6 || !r2.closedAfter) fail('카드 ' + JSON.stringify(r2)); else ok(`카드: 떠 있는 동안 판 입력 없음, 400 ms 안 누름 무시, ${BAL.rule_card.auto_close_ms} ms 뒤 닫힘 → 바로 판 조작`);
  if (JSON.stringify(r2.colors) !== JSON.stringify(expCols)) fail('색 슬롯 돌려쓰기 불일치 ' + JSON.stringify(r2.colors.slice(0, 3))); else ok(`색 슬롯 돌려쓰기(palette slot_rotation) L11~ ${expCols.length}판 일치`);
  await c.close();
}

// 4) 일반 모드: 실제 마우스 포인터, 오디오 켬
{
  const { c, p } = await open(412, 915, '');
  await p.mouse.click(206, 500); // 타이틀 아무 곳
  await p.waitForFunction(() => window.__game.state === 'map');
  await p.waitForTimeout(400);
  const nb = await p.locator('.node').first().boundingBox();
  await p.mouse.click(nb.x + nb.width / 2, nb.y + nb.height / 2);
  await p.waitForFunction(() => window.__game.state === 'play');
  let stars = 0, again = false;
  const solveMouse = async (lv) => {
    await p.waitForFunction(() => window.__game.state === 'play', null, { timeout: 5000 });
    await p.waitForTimeout(150);
    if (await G(p, () => window.__game.board.card)) { await p.waitForTimeout(900); await p.mouse.click(5, 5 + 300); await p.waitForTimeout(250); }
    const gr = await G(p, () => window.__game.layout.grid);
    const at = ([x, y]) => [gr.originX + (x + 0.5) * gr.cellPx, gr.originY + (y + 0.5) * gr.cellPx];
    for (const path of solOf(lv)) {
      const [x0, y0] = at(path[0]); await p.mouse.move(x0, y0); await p.mouse.down();
      for (const cell of path.slice(1)) { const [x, y] = at(cell); await p.mouse.move(x, y, { steps: 3 }); }
      await p.mouse.up();
    }
    await p.waitForFunction(() => window.__game.state === 'result', null, { timeout: 5000 });
    await p.waitForTimeout(450); // 결과 버튼은 완료 + 1280 ms 부터
    return G(p, () => window.__game.result);
  };
  const clickSel = async (sel) => { const b = await p.locator(sel).boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
  for (let i = 0; i < LEVELS.length; i++) {
    const lv = LEVELS[i];
    let r = await solveMouse(lv);
    if (i === 0) { await clickSel('#rAgain'); r = await solveMouse(lv); again = (await G(p, () => window.__game.levelIndex)) === 0 && r && r.star; } // 결과 ↻ → 같은 판 다시
    if (r && r.star && r.accuracyPct === 100) stars++; else fail(`일반 모드 L${lv.order} 마우스 완료 실패 ${JSON.stringify(r)}`);
    if (i + 1 < LEVELS.length) { await clickSel('#rNext'); await p.waitForFunction((n) => window.__game.levelIndex === n && window.__game.state === 'play', i + 1, { timeout: 5000 }).catch(() => fail(`결과 ▶ 뒤 L${i + 2} 로 못 감(멈춤?)`)); }
  }
  if (!again) fail('결과 ↻ → 같은 판 다시 칠하기 실패'); else ok('일반 모드 결과 ↻ → 같은 판 다시 → 별');
  if (stars === LEVELS.length) ok(`일반 모드(rAF·실제 마우스·오디오) 결과 ▶ 로 ${LEVELS.length}레벨 이어서 → 완료·별 ${stars}/${LEVELS.length}`);
  const au = await G(p, () => window.__game.audioState);
  const hid = await G(p, async () => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); await new Promise((r) => setTimeout(r, 300)); const s = window.__game.audioState; Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); await new Promise((r) => setTimeout(r, 1500)); return [s, window.__game.audioState]; });
  if (au !== 'running' || hid[0] !== 'suspended' || hid[1] !== 'running') fail(`오디오 ${au}, 백그라운드 ${hid}`); else ok('오디오 running → 백그라운드 suspended → 복귀 running');
  await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
  const st = await G(p, () => window.__game.store);
  const done = Object.values(st.levels).filter((r) => r.done && r.star && r.bestPct === 100).length;
  if (done !== LEVELS.length) fail(`새로고침 뒤 진행 ${done}/${LEVELS.length}`); else ok(`새로고침 뒤 진행·별·최고 % 유지 ${done}/${LEVELS.length}`);
  await c.close();
}

// r3 넓은 판: 1280x720 실제 마우스로 12x12(H4-01) 풀기, 412x915 카메라(전체 보기 → 누름 확대, 미니맵 누름 → 전체 보기), 문 페이지 해금
{
  const { c, p } = await open(1280, 720, '');
  const hi = LEVELS.length + HARD.findIndex((h) => h.id === 'H4-01'), lv = HARD.find((h) => h.id === 'H4-01');
  // 오디오 켠 일반 모드로 큰 그림 판 완료(테스트 모드가 건너뛰는 완료 화음·진동 경로, r3 핫픽스)
  await p.mouse.click(640, 600); await p.waitForFunction(() => window.__game.audioState === 'running', null, { timeout: 8000 }).catch(() => fail('큰 그림 판 전 오디오가 켜지지 않음'));
  await G(p, (i) => window.__game.loadLevel(i), hi); await p.waitForTimeout(400);
  const gr = await G(p, () => window.__game.layout.grid);
  const at = ([x, y]) => [gr.originX + (x + 0.5) * gr.cellPx, gr.originY + (y + 0.5) * gr.cellPx];
  for (const path of solOf(lv)) { const [x0, y0] = at(path[0]); await p.mouse.move(x0, y0); await p.mouse.down(); for (const q of path.slice(1)) { const [x, y] = at(q); await p.mouse.move(x, y, { steps: 2 }); } await p.mouse.up(); }
  const r = await G(p, () => window.__game.result);
  await p.waitForTimeout(2500);
  const after = await G(p, () => ({ st: window.__game.state, au: window.__game.audioState, snd: window.__game.sfxLog.includes('complete') }));
  if (!r || !r.star || r.accuracyPct !== 100 || after.st !== 'result' || after.au !== 'running' || !after.snd) fail('넓은 판 12x12 실제 마우스·오디오(1280x720) ' + JSON.stringify([r, after])); else ok('넓은 판 H4-01(12x12·16쌍) 실제 마우스·오디오 켬 → 별·100 %·완료 화음·결과 화면(콘솔 에러는 아래 합계)');
  // 결과 '지도' → 톱니(설정): 숨기는 화면에 초점이 남아 aria-hidden 경고가 나지 않는지(콘솔 합계에 포함)
  await G(p, () => {}); await p.waitForTimeout(400);
  { const b = await p.locator('#rMap').boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(600); const g2 = await p.locator('#mGear').boundingBox(); await p.mouse.click(g2.x + g2.width / 2, g2.y + g2.height / 2); await p.waitForTimeout(600); const st2 = await G(p, () => window.__game.state); if (st2 !== 'guardian') fail('결과 지도 → 톱니 → 설정 아님 ' + st2); else ok('결과 지도 → 톱니 한 번 → 설정 화면'); }
  await c.close();
}
{
  const stars = {}; for (const lv of LEVELS.slice(0, 10)) stars[lv.id] = { done: true, star: true, bestPct: 100, bestFill: 100 };
  const { c, p } = await open(412, 915, '', { store: { v: 1, sound: true, vibrate: true, motion: false, lang: null, levels: stars } });
  const hi = LEVELS.length; // H1-01
  await G(p, (i) => window.__game.loadLevel(i), hi); await p.waitForTimeout(400);
  const cam0 = await G(p, () => window.__game.camera);
  const box = await G(p, () => window.__game.layout.play.viewport);
  await p.mouse.click(box.x + box.w / 2, box.y + box.h / 2); await p.waitForTimeout(500);
  const cam1 = await G(p, () => window.__game.camera);
  const mm = await p.locator('#pMiniWrap').boundingBox(); await p.mouse.click(mm.x + mm.width / 2, mm.y + mm.height / 2); await p.waitForTimeout(500);
  const cam2 = await G(p, () => window.__game.camera);
  if (!cam0 || cam0.mode !== 'overview' || cam1.mode !== 'play' || cam1.s !== 1 || cam2.mode !== 'overview') fail('카메라 ' + JSON.stringify([cam0, cam1, cam2])); else ok('넓은 판 카메라: 전체 보기 → 누름 확대(칸 56) → 미니맵 누름 → 전체 보기');
  await G(p, () => { window.__game.toMap(5); }); await p.waitForTimeout(400);
  const gates = await p.evaluate(() => [...document.querySelectorAll('.node.gate')].map((b) => b.dataset.state));
  if (gates.length !== 5 || gates[0] !== 'next' || gates[1] !== 'locked') fail('문 페이지(별 10개) ' + gates); else ok('지도 6번째 페이지 문 5개, 별 10개 → 1단계 열림·2단계 잠김');
  await c.close();
}

// 불러오기 오류 화면: 데이터 하나가 실패해도 글·↻ 그림(인라인)이 보이고 html lang·제목이 그 언어
{
  const c = await browser.newContext({ viewport: { width: 360, height: 640 }, locale: 'en-US' });
  const p = await c.newPage();
  await p.route('**/data/balance.json', (r) => r.fulfill({ status: 503, body: 'x' }));
  await p.goto(BASE);
  await p.waitForFunction(() => !document.getElementById('bootRetry').hidden, null, { timeout: 10000 });
  const e = await p.evaluate(() => ({ lang: document.documentElement.lang, title: document.title, msg: document.getElementById('bootMsg').textContent, svg: !!document.querySelector('#bootRetry svg'), label: document.getElementById('bootRetry').getAttribute('aria-label') }));
  const STRS = JSON.parse(readFileSync(join(PROJ, 'strings.json'), 'utf8'));
  if (e.lang !== 'en' || e.title !== STRS.title.en || e.msg !== STRS.load_error.en || !e.svg || e.label !== STRS.btn_reload.en) fail('오류 화면 ' + JSON.stringify(e)); else ok('불러오기 실패 → load_error 글·↻ 인라인 그림·lang en·제목');
  if (SHOTS) { await p.screenshot({ path: join(OUT, '360x640-en-error.png') }); rep.shots.push('360x640-en-error.png'); }
  await c.close();
}

// 6) 성능: 6배 CPU 스로틀(CDP), 같은 조건 대조 페이지(rAF 만). 1% low = 1000 / 99번째 백분위 프레임 간격
async function frames(p, ms) {
  await p.evaluate(() => { window.__fr = []; window.__frOn = true; const f = (t) => { if (!window.__frOn) return; window.__fr.push(t); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await p.waitForTimeout(ms);
  const fr = await p.evaluate(() => { window.__frOn = false; return window.__fr; });
  const d = []; for (let i = 1; i < fr.length; i++) if (fr[i] - fr[i - 1] > 0.5) d.push(fr[i] - fr[i - 1]);
  d.sort((a, b) => a - b);
  const avg = d.length ? (1000 * d.length) / d.reduce((a, b) => a + b, 0) : 0, p99 = d[Math.min(d.length - 1, Math.floor(d.length * 0.99))] || 0;
  return { avg: +avg.toFixed(1), low1: +(p99 ? 1000 / p99 : 0).toFixed(1), max: +(d[d.length - 1] || 0).toFixed(1), n: d.length, d };
}
const PERF = {};
for (const dsf of [1, 2]) {
  const c = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: dsf });
  const p = await c.newPage();
  p.on('pageerror', (e) => rep.console.push('[perf] ' + e.message));
  const cdp = await c.newCDPSession(p);
  // 대조 페이지
  await p.goto('data:text/html,<body style="margin:0;background:%23eee">x</body>');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); await p.waitForTimeout(1500); // 스로틀 직후 첫 프레임 빼기(QA round-2 인사이트)
  const ctl = await frames(p, 2500);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await p.goto(BASE); await p.waitForFunction(() => window.__game?.ready === true);
  // L1~L5 완료 기록 → 지도 첫 장의 '다음' 노드 = L6(그림 카드 판)
  await p.evaluate(() => { const lv = {}; for (const id of ['01', '02', '03', '04', '05']) lv[id] = { done: true, star: true, bestPct: 100, bestFill: 100 }; localStorage.setItem('flow01.v1', JSON.stringify({ v: 1, sound: true, vibrate: true, motion: false, lang: null, levels: lv })); });
  await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
  await p.waitForTimeout(800);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  // 타이틀 → 지도(첫 탭, 오디오 잠금 해제 포함)
  const fA = frames(p, 1500); await p.waitForTimeout(100); await p.mouse.click(206, 600); const menu1 = await fA;
  await p.waitForTimeout(800); // 유휴 시간(미리 비트맵화)
  // 장 넘김 ▶ 와 ◀
  const fP = frames(p, 1500); await p.waitForTimeout(100); await p.locator('#mNext').click(); await p.waitForTimeout(500); await p.locator('#mPrev').click(); const pageTurn = await fP;
  await p.waitForTimeout(500);
  // 지도 → 그림 카드 판(L6, '다음' 노드 누름)
  const nb = await p.locator('.node[data-state="next"]').first().boundingBox();
  const fB = frames(p, 1500); await p.waitForTimeout(100); await p.mouse.click(nb.x + nb.width / 2, nb.y + nb.height / 2); const menu2 = await fB;
  // 레벨 시작 직후 + 끄는 중: L10(6x6) 을 열고 바로 답 선 하나씩 끎
  const lv = LEVELS[9];
  const fC = frames(p, 3500);
  await G(p, () => window.__game.loadLevel(9));
  const gr = await G(p, () => window.__game.layout.grid);
  const at = ([x, y]) => [gr.originX + (x + 0.5) * gr.cellPx, gr.originY + (y + 0.5) * gr.cellPx];
  for (const path of solOf(lv).slice(0, 4)) { const [x0, y0] = at(path[0]); await p.mouse.move(x0, y0); await p.mouse.down(); for (const cell of path.slice(1)) { const [x, y] = at(cell); await p.mouse.move(x, y, { steps: 4 }); } await p.mouse.up(); }
  const play = await fC;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  PERF['dpr' + dsf] = { control: ctl, title_to_map: menu1, map_to_card_level: menu2, page_turn: pageTurn, L10_start_drag: play };
  console.log(`  perf DPR${dsf}: 대조 평균 ${ctl.avg}/1%low ${ctl.low1} | 타이틀→지도 최장 ${menu1.max} ms | 지도→L6 카드 판 최장 ${menu2.max} ms | 장 넘김 최장 ${pageTurn.max} ms | L10 시작·끄는 중 평균 ${play.avg} 1%low ${play.low1} 최장 ${play.max} ms`);
  const pfail = (msg) => console.log('  INFO(성능, 판정은 qa-round.mjs --blank-pair) ' + msg);
  if (play.avg < 55 || play.low1 < 45) pfail(`성능 DPR${dsf} 판: 평균 ${play.avg} 1% low ${play.low1} (기준 55·45, 대조 ${ctl.avg}/${ctl.low1})`);
  if (menu1.max > 100 || menu2.max > 100 || pageTurn.max > 100) pfail(`성능 DPR${dsf} 메뉴 전환 최장 ${menu1.max}·${menu2.max}·${pageTurn.max} ms (기준 ≤ 100)`);
  const all = [menu1, menu2, pageTurn, play].flatMap((x) => x.d).sort((a, b) => a - b), p99 = all[Math.floor(all.length * 0.99)];
  PERF['dpr' + dsf].overall = { avg: +((1000 * all.length) / all.reduce((a, b) => a + b, 0)).toFixed(1), low1: +(1000 / p99).toFixed(1), n: all.length };
  for (const x of [ctl, menu1, menu2, pageTurn, play]) delete x.d;
  console.log(`  perf DPR${dsf} 전체(측정 구간 합): 평균 ${PERF['dpr' + dsf].overall.avg} 1% low ${PERF['dpr' + dsf].overall.low1}`);
  if (PERF['dpr' + dsf].overall.low1 < 45 || PERF['dpr' + dsf].overall.avg < 55) pfail(`성능 DPR${dsf} 전체 평균 ${PERF['dpr' + dsf].overall.avg}·1% low ${PERF['dpr' + dsf].overall.low1} (기준 55·45)`);
  await c.close();
}
writeFileSync(join(OUT, 'perf.json'), JSON.stringify(PERF, null, 1));

// 5) 4해상도: 버튼 크기·겹침, 글 넘침, 스크린샷
const RES = [[360, 640], [412, 915], [640, 360], [1280, 720]];
const partial = { v: 1, sound: true, vibrate: true, motion: false, lang: null, levels: { '01': { done: true, star: true, bestPct: 100, bestFill: 100 }, '02': { done: true, star: false, bestPct: 66, bestFill: 100 }, '03': { done: true, star: true, bestPct: 100, bestFill: 100 }, '04': { done: false, star: false, bestPct: null, bestFill: 40 } } };
async function checkUi(p, tag) {
  const r = await p.evaluate(() => {
    const vis = (el) => { const cs = getComputedStyle(el); if (el.hidden || cs.display === 'none' || cs.visibility === 'hidden') return false; let e = el.parentElement; while (e) { const s = getComputedStyle(e); if (e.hidden || s.display === 'none') return false; e = e.parentElement; } return true; };
    const els = [...document.querySelectorAll('.screen.show button')].filter((b) => !b.closest('#mTabs')).filter(vis).filter((b) => !b.closest('.modal[hidden]'));
    const rs = els.map((b) => ({ id: b.id || b.className + (b.dataset.i ?? ''), r: b.getBoundingClientRect() }));
    const small = rs.filter((x) => x.r.width < 47.5 || x.r.height < 47.5).map((x) => x.id);
    const over = [];
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i].r, b = rs[j].r; const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (ox > 1 && oy > 1) over.push(rs[i].id + '×' + rs[j].id); }
    const outside = document.querySelector('#guardian.show') ? [] : rs.filter((x) => x.r.left < -0.5 || x.r.top < -0.5 || x.r.right > innerWidth + 0.5 || x.r.bottom > innerHeight + 0.5).map((x) => x.id);
    const overflow = [...document.querySelectorAll('.screen.show .slot, .screen.show .band b')].filter(vis).filter((e) => e.textContent && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2)).map((e) => e.id + ':' + e.textContent.slice(0, 12));
    return { small, over, outside, overflow };
  });
  if (r.small.length || r.over.length || r.outside.length) fail(`${tag} 버튼 작음 ${r.small} 겹침 ${r.over} 화면 밖 ${r.outside}`);
  if (r.overflow.length) fail(`${tag} 글 넘침 ${r.overflow}`);
}
for (const [W, H] of RES) {
  for (const lang of ['ko', 'en']) {
    const tag = `${W}x${H}-${lang}`;
    const { c, p } = await open(W, H, `?test=1&lang=${lang}`, { store: partial });
    const shots = lang === 'ko' || W === 360;
    await G(p, () => window.__game.step(400)); await checkUi(p, tag + ' title'); if (shots) await shot(p, `${tag}-title.png`);
    await G(p, () => { window.__game.toMap(); window.__game.step(400); }); await checkUi(p, tag + ' map'); if (shots) await shot(p, `${tag}-map.png`);
    if (W === 360 && lang === 'ko') { await G(p, () => { window.__game.turnPage(1); window.__game.step(400); }); await shot(p, `${tag}-map-page2.png`); }
    await G(p, () => { const g = window.__game; g.loadLevel(0); g.step(500 + 250 + 150 + 260 + 100); }); await checkUi(p, tag + ' play-L1'); if (shots) await shot(p, `${tag}-play-L1-tutorial.png`);
    const l6 = LEVELS[5], s6 = solOf(l6);
    await G(p, (s6) => { const g = window.__game; g.loadLevel(5); g.step(450); }, s6); await checkUi(p, tag + ' play-L6-card'); if (shots && (lang === 'ko' || W === 640)) await shot(p, `${tag}-play-L6-card.png`);
    await G(p, (s6) => { const g = window.__game; g.closeCard(); g.step(300); g.drag(s6[0]); g.drag(s6[2]); g.drag(s6[4]); g.step(60); }, s6); await checkUi(p, tag + ' play-L6'); if (shots) await shot(p, `${tag}-play-L6-judge.png`);
    if (W === 360 && lang === 'ko') {
      const l2 = LEVELS[1], s2 = solOf(l2), straight = l2.pairs.map((pr, k) => (k === 2 ? [pr.a, pr.b] : s2[k]));
      await G(p, (paths) => { const g = window.__game; g.loadLevel(1); g.closeCard(); g.step(300); for (const c of paths) g.drag(c); g.step(630 + 2 * 2600 + 250); }, straight); await shot(p, `${tag}-play-L2-gap.png`);
    }
    await G(p, (s6) => { const g = window.__game; g.loadLevel(5); g.closeCard(); g.step(300); for (const c of s6) g.drag(c); g.step(1000 + 2200); }, s6); await checkUi(p, tag + ' result'); if (shots) await shot(p, `${tag}-result.png`);
    if (lang === 'ko') { await G(p, (i) => { const g = window.__game; g.loadLevel(i); g.step(400); }, LEVELS.length + 30); await shot(p, `${tag}-play-hard-overview.png`); await G(p, (cells) => { const g = window.__game; g.drag(cells); g.step(400); }, solOf(HARD[30])[0]); await checkUi(p, tag + ' play-hard'); await shot(p, `${tag}-play-hard-play.png`); await G(p, () => { window.__game.toMap(5); window.__game.step(400); }); await shot(p, `${tag}-map-gates.png`); }
    await G(p, () => { window.__game.toGuardian(); window.__game.step(400); }); await checkUi(p, tag + ' guardian'); if (shots && (W === 360 || W === 640)) await shot(p, `${tag}-guardian.png`);
    await c.close();
  }
}
ok('4해상도 × ko·en 화면 검사(버튼 ≥ 48·겹침·화면 밖·글 넘침) 끝');

await browser.close();
if (rep.console.length) fail('콘솔 에러·경고 ' + rep.console.length + ': ' + rep.console.slice(0, 5).join(' | ')); else ok('콘솔 에러·경고 0');
if (rep.external.length) fail('외부 요청 ' + rep.external.length + ': ' + rep.external.slice(0, 3).join(' ')); else ok('외부 요청 0');
if (rep.failed.length) fail('실패 응답 ' + rep.failed.slice(0, 5).join(' | ')); else ok('실패 응답(4xx·5xx) 0');
console.log(`스크린샷 ${rep.shots.length}장 → ${OUT}`);
console.log(bad ? `FAIL ${bad}` : 'ALL PASS');
cleanup();
process.exit(bad ? 1 : 0);
