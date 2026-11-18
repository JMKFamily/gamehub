#!/usr/bin/env node
// flow-01 QA 라운드 검사 (qa-engineer, 1-4). Playwright 는 설치하지 않고 있는 것을 씀(PLAYWRIGHT_CORE=<playwright-core 폴더>).
//   node projects/flow-01/tools/qa-round.mjs --part <이름> [--round 1] [--channel msedge] [옵션]
// 부분(--part):
//   sim      node 시뮬레이터 전체 실행(아이 봇 시드 10 × 2000, 숙련 봇 10000, verify-levels 와 같은 시드식) → parts/sim.json
//   bots     빌드 훅 경로에 봇 드래그 열을 넣어 시뮬레이터와 한 드래그씩 대조 [--levels 1-10] [--child 2000] [--skilled 1000] [--tag 이름]
//   mouse    일반 모드(rAF·오디오·실제 마우스)로 생성 답 10레벨 + 아이 봇 드래그 열 일부 대조, 완료 → 다음 조작 시간, 처음부터·되돌리기
//   paint    채움 % = 화면에 칠해진 칸(캔버스 픽셀) 대조
//   shots    4해상도 × ko/en 화면 스크린샷 + notext + 흑백, 버튼·칸 크기·겹침, 오류 화면
//   perf     6배 CPU 스로틀 fps·1% low(시작·완료 직후 창 포함), 입력 → 칸 진행 프레임, 메뉴 전환 최장 프레임 [--runs 3]
//   func     저장·백그라운드·음소거·테스트 훅 화면 = 일반 모드·접근성 트리
//   audio    빌드 js/audio.js 를 OfflineAudioContext 로 렌더 → sound.json measured 대조
//   merge    parts/*.json → metrics.json
// 콘솔 에러·경고·실패 응답·외부 요청은 부분마다 parts/<part>.json log 에 모음. 서버는 serve.mjs 를 8750~8769 빈 포트에 띄우고 그 PID 만 종료.
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const PROJ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PART = opt('--part', 'merge');
const ROUND = opt('--round', '1');
const RDIR = join(PROJ, `reviews/round-${ROUND}`);
const PDIR = join(RDIR, 'parts'), SDIR = join(RDIR, 'shots');
mkdirSync(PDIR, { recursive: true }); mkdirSync(SDIR, { recursive: true });
const channel = opt('--channel', 'msedge');

const Bm = await import(pathToFileURL(join(PROJ, 'tools/core/board.mjs')).href);
const { solveRun, moveStats, CHILD, SKILLED } = await import(pathToFileURL(join(PROJ, 'tools/sim/bots.mjs')).href);
const { mixSeed } = await import(pathToFileURL(join(PROJ, 'tools/core/rng.mjs')).href);
const J = (p) => JSON.parse(readFileSync(join(PROJ, p), 'utf8'));
const BAL = J('balance.json'), STR = J('strings.json'), SND = J('assets/sound.json');
const LEVELS = readdirSync(join(PROJ, 'levels')).filter((f) => f.endsWith('.json')).sort().map((f) => J('levels/' + f));
const SEED = BAL.verify.seed;
const solOf = (lv) => lv.pairs.map((p) => lv.solution.find((s) => s.id === p.id).path);
const save = (name, obj) => { writeFileSync(join(PDIR, name + '.json'), JSON.stringify(obj, null, 1)); console.log('→', join(PDIR, name + '.json')); };
const levelRange = (s) => { const [a, b] = String(s).split('-').map(Number); const out = []; for (let i = a; i <= (b || a); i++) out.push(i - 1); return out; };

// ---------------------------------------------------------------- 시뮬레이터 한 드래그씩(빌드와 같은 판정 모듈, 연결 등급 기록)
function simRun(lv, drags) {
  const pz = Bm.makePuzzle(lv), g = Bm.newGame(pz, { cut: BAL.input.cut_enabled });
  const out = [];
  for (const cells of drags) {
    const d = Bm.press(g, cells[0]);
    const grades = [], raw = [];
    if (d) {
      for (let i = 1; i < cells.length && !d.done; i++) Bm.moveTo(g, d, cells[i]);
      Bm.release(g, d);
      // 빌드 표시 규칙(r2 S13): 한 드래그 안에서 같은 쌍이 다시 닿으면(훅 경로는 시계가 멈춰 400 ms 안) 마지막 완료 연결이 아니면 소리·이름 없음
      const conns = d.events.filter((e) => e.type === 'connect'), seen = new Set();
      conns.forEach((e, j) => { raw.push(e.previewGrade); const last = g.completed && j === conns.length - 1; if (seen.has(e.color) && !last) { seen.add(e.color); return; } seen.add(e.color); grades.push(e.previewGrade); });
    }
    out.push({ m: g.moves, gr: grades.join(''), raw: raw.join(''), f: Bm.fillPct(pz, g.paths), c: g.completed ? 1 : 0 });
    if (g.completed) break;
  }
  return { steps: out, moves: g.moves, completed: g.completed, pct: g.completed ? Bm.accuracyPct(g) : null, star: Bm.isStar(g), colorMoves: g.colorMoves.slice() };
}
const toXY = (lv) => (i) => [i % lv.width, (i / lv.width) | 0];

// ---------------------------------------------------------------- 브라우저·서버
let pw = null, server = null, PORT = 0, browser = null;
const LOG = { console: [], failed: [], external: [], requests: 0 };
async function boot({ needBrowser = true } = {}) {
  const req = createRequire(import.meta.url);
  for (const name of ['playwright', 'playwright-core']) { try { pw = req(name); break; } catch {} }
  if (!pw && process.env.PLAYWRIGHT_CORE) { try { pw = createRequire(join(process.env.PLAYWRIGHT_CORE, 'index.js'))(process.env.PLAYWRIGHT_CORE); } catch {} }
  if (!pw) { console.error('playwright 없음: PLAYWRIGHT_CORE 지정'); process.exit(2); }
  for (let p = +opt('--port-from', 8740); p <= +opt('--port-to', 8749) && !server; p++) {
    try { await fetch(`http://127.0.0.1:${p}/`); continue; } catch {}
    const ch = spawn(process.execPath, [join(PROJ, 'tools/serve.mjs'), String(p)], { stdio: ['ignore', 'pipe', 'pipe'] });
    const up = await new Promise((res) => { ch.stdout.once('data', () => res(true)); ch.once('exit', () => res(false)); setTimeout(() => res(false), 4000); });
    if (up) { server = ch; PORT = p; }
  }
  if (!server) { console.error('서버 못 띄움'); process.exit(3); }
  console.log(`서버 pid ${server.pid} 포트 ${PORT}`);
  process.on('exit', () => { try { server.kill(); } catch {} });
  if (needBrowser) browser = await newBrowser();
}
const newBrowser = () => pw.chromium.launch({ channel, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const BASE = () => `http://127.0.0.1:${PORT}/games/flow-01/`;
function watch(p, tag) {
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) LOG.console.push(`[${tag}] ${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => LOG.console.push(`[${tag}] pageerror: ${e.message}`));
  p.on('request', (r) => { LOG.requests++; const u = new URL(r.url()); if (/^(https?|wss?):$/.test(u.protocol) && !['localhost', '127.0.0.1'].includes(u.hostname)) LOG.external.push(r.url()); });
  p.on('requestfailed', (r) => LOG.failed.push(`[${tag}] ${r.url()} ${r.failure()?.errorText}`));
  p.on('response', (r) => { if (r.status() >= 400) LOG.failed.push(`[${tag}] ${r.url()} ${r.status()}`); });
}
async function open(w, h, q = '?test=1', { store = undefined, locale = 'ko-KR', dsf = 1, mobile = false, br = browser, reducedMotion } = {}) {
  const c = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, isMobile: mobile, hasTouch: mobile, locale, reducedMotion });
  const p = await c.newPage();
  watch(p, `${w}x${h}${q}`);
  await p.goto(BASE() + q);
  await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 30000 });
  if (store !== undefined) {
    await p.evaluate((s) => { localStorage.clear(); if (s) localStorage.setItem('flow01.v1', JSON.stringify(s)); }, store);
    await p.reload(); await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 30000 });
  }
  return { c, p };
}
const G = (p, f, a) => p.evaluate(f, a);
const finish = async (name, obj) => { if (browser) await browser.close(); obj.log = { console: LOG.console, failed: LOG.failed, external: LOG.external, requests: LOG.requests }; save(name, obj); if (server) server.kill(); };

// 빌드에서 봇 드래그 열을 한 판씩 돌림(훅 drag = 칸 가운데 좌표 → 실제 onDown/onMove/onUp)
const PAGE_RUN = ([li, runs]) => {
  const g = window.__game, out = [];
  for (const drags of runs) {
    g.loadLevel(li); if (g.board.card) g.closeCard(); // r2: 시계 0 에서도 닫혀야 함(S7 회귀 확인)
    const steps = [];
    let prev = g.sfxLog.length;
    for (const cells of drags) {
      g.drag(cells);
      const log = g.sfxLog, L1 = log.length;
      const added = L1 >= prev ? L1 - prev : L1 - prev + 200;
      const grs = log.slice(L1 - added).filter((n) => n.startsWith('connect_g')).map((n) => n.slice(9)).join('');
      prev = L1;
      const b = g.board;
      // 채움 %를 훅 판 상태(연결된 쌍의 칸)에서 따로 셈
      const holes = new Set(b.holes.map(([x, y]) => y * b.W + x));
      let cov = 0; b.paths.forEach((p, c) => { if (b.pairDots[c]) cov += p.length; });
      const indep = Math.floor((100 * cov) / (b.W * b.H - holes.size));
      steps.push({ m: g.moves, gr: grs, f: b.fillPct, fi: indep, c: b.completed ? 1 : 0 });
      if (b.completed) break;
    }
    const r = g.result;
    out.push({ steps, moves: g.moves, completed: g.board.completed, pct: r ? r.accuracyPct : null, star: r ? r.star : false, colorMoves: g.colorMoves });
  }
  return out;
};

// ================================================================= sim
if (PART === 'sim') {
  const t0 = Date.now();
  const child = LEVELS.map(() => []), seed0 = LEVELS.map(() => []), skilled = LEVELS.map(() => []);
  let c2 = 0, c2bad = 0;
  for (let s = 0; s < BAL.verify.seeds; s++) LEVELS.forEach((L, li) => {
    for (let k = 0; k < BAL.verify.child_runs_per_seed; k++) {
      const x = solveRun(L, CHILD, mixSeed(SEED, s, li, k)); child[li].push(x.moves); if (s === 0) seed0[li].push(x.moves);
      if (x.completed) { c2++; const star = x.moves === L.pairs.length, one = x.colorMoves.every((m) => m === 1), pct = Math.floor((100 * x.colorMoves.filter((m) => m === 1).length) / L.pairs.length); if (star !== one || star !== (pct === 100)) c2bad++; }
    }
  });
  LEVELS.forEach((L, li) => { for (let n = 0; n < BAL.verify.skilled_runs; n++) skilled[li].push(solveRun(L, SKILLED, mixSeed(SEED, 7, li, n)).moves); });
  const vr = J('tools/out/verify-report.json');
  const rows = LEVELS.map((L, li) => {
    const a = moveStats(child[li]), a0 = moveStats(seed0[li]), sk = moveStats(skilled[li]);
    return { id: L.id, child_full: { n: a.n, m: +a.cmedian.toFixed(3), median_int: a.median, mean: +a.mean.toFixed(2), p90: a.p90 }, child_seed0: { n: a0.n, m: +a0.cmedian.toFixed(3) },
      skilled_full: { n: sk.n, m: +sk.cmedian.toFixed(3), mean: +sk.mean.toFixed(2), p90: sk.p90 },
      verify_report_m: vr.m[li], verify_report_skilled_m: vr.levels[li].skilled_m, verify_report_seed0_m: vr.per_seed_m[0][li] };
  });
  const m = rows.map((r) => r.child_full.m), rr = Math.sqrt(m[2] / m[0]), T = m[0] * rr ** 5;
  save('sim', { seed: SEED, child_runs_per_level: child[0].length, skilled_runs_per_level: skilled[0].length, rows, r: +rr.toFixed(4), T: +T.toFixed(3), L10_dev_pct: +((m[9] / T - 1) * 100).toFixed(2), c2_runs: c2, c2_mismatch: c2bad, seconds: (Date.now() - t0) / 1000 });
  process.exit(0);
}

// ================================================================= bots
if (PART === 'bots') {
  await boot();
  const lvs = levelRange(opt('--levels', '1-10'));
  const NC = +opt('--child', 2000), NS = +opt('--skilled', 1000), BATCH = 50;
  const { c, p } = await open(412, 915, '?test=1', { store: null });
  const res = { child: {}, skilled: {}, mismatch: [], t0: Date.now() };
  for (const li of lvs) {
    const lv = LEVELS[li], xy = toXY(lv);
    for (const [bot, P, N, seedOf] of [['child', CHILD, NC, (k) => mixSeed(SEED, Math.floor(k / BAL.verify.child_runs_per_seed), li, k % BAL.verify.child_runs_per_seed)], ['skilled', SKILLED, NS, (k) => mixSeed(SEED, 7, li, k)]]) {
      const agg = { n: 0, drags: 0, moves: [], steps_mismatch: 0, run_mismatch: 0, fill_vs_indep_mismatch: 0, inv_mismatch: 0, completed: 0, stars: 0, grade_counts: [0, 0, 0] };
      for (let k0 = 0; k0 < N; k0 += BATCH) {
        const batch = [], ref = [];
        for (let k = k0; k < Math.min(N, k0 + BATCH); k++) {
          const run = solveRun(lv, P, seedOf(k), { log: true });
          ref.push({ k, run, sim: simRun(lv, run.log) });
          batch.push(run.log.map((d) => d.map(xy)));
        }
        const got = await G(p, PAGE_RUN, [li, batch]);
        got.forEach((b, j) => {
          const { k, run, sim } = ref[j];
          agg.n++; agg.drags += b.steps.length; agg.moves.push(b.moves); (agg.simMoves ||= []).push(sim.moves);
          if (b.completed) agg.completed++; if (b.star) agg.stars++;
          for (const s of b.steps) for (const ch of s.gr) agg.grade_counts[+ch - 1]++;
          let sm = 0;
          const L = Math.max(b.steps.length, sim.steps.length);
          for (let t = 0; t < L; t++) { const x = b.steps[t], y = sim.steps[t]; if (!x || !y || x.m !== y.m || x.gr !== y.gr || x.f !== y.f || x.c !== y.c) sm++; if (x && x.f !== x.fi) agg.fill_vs_indep_mismatch++; }
          agg.steps_mismatch += sm;
          const runBad = b.moves !== sim.moves || b.moves !== run.moves || b.completed !== sim.completed || b.pct !== sim.pct || b.star !== sim.star;
          if (runBad || sm) { agg.run_mismatch++; if (res.mismatch.length < 20) res.mismatch.push({ level: lv.id, bot, k, build: { moves: b.moves, pct: b.pct, star: b.star, steps: b.steps.slice(0, 40) }, sim: { moves: sim.moves, pct: sim.pct, star: sim.star, steps: sim.steps.slice(0, 40) } }); }
          // % 100 ⇔ 별 ⇔ 모두 1단(빌드 그 색 이동 수·마지막 연결 등급)
          if (b.completed) {
            const lastGrade = new Array(lv.pairs.length).fill(0);
            const allOne = b.colorMoves.every((m) => m === 1);
            const lastAll1 = (() => { // 연결 기록은 색을 모르므로 그 색 이동 수로 등급 계산
              return b.colorMoves.every((m) => Bm.gradeForColorMoves(m, BAL.judge.grade_max_color_moves) === 1); })();
            if (!((b.pct === 100) === b.star && b.star === allOne && allOne === lastAll1)) agg.inv_mismatch++;
            void lastGrade;
          }
        });
      }
      const st = moveStats(agg.moves);
      res[bot][lv.id] = { n: agg.n, drags: agg.drags, m: +st.cmedian.toFixed(3), sim_m_same_runs: +moveStats(agg.simMoves).cmedian.toFixed(3), median_int: st.median, mean: +st.mean.toFixed(2), p90: st.p90, completed: agg.completed, stars: agg.stars,
        run_mismatch: agg.run_mismatch, steps_mismatch: agg.steps_mismatch, fill_vs_indep_mismatch: agg.fill_vs_indep_mismatch, inv_mismatch: agg.inv_mismatch, grade_counts: agg.grade_counts };
      console.log(`L${lv.id} ${bot} n=${agg.n} m̃=${st.cmedian.toFixed(3)} 드래그 ${agg.drags} 불일치 판 ${agg.run_mismatch} 단계 ${agg.steps_mismatch} 채움 ${agg.fill_vs_indep_mismatch} 불변식 ${agg.inv_mismatch} (${((Date.now() - res.t0) / 1000).toFixed(0)} s)`);
    }
  }
  await c.close();
  res.seconds = (Date.now() - res.t0) / 1000;
  await finish('bots-' + opt('--tag', opt('--levels', 'all')), res);
  process.exit(0);
}

// ================================================================= mouse (일반 모드 실시간)
if (PART === 'mouse') {
  await boot();
  const out = { gen: [], bot: [], timing: [], restart: null };
  const { c, p } = await open(412, 915, '', { store: null });
  await p.mouse.click(206, 500);
  await p.waitForFunction(() => window.__game.state === 'map');
  await p.waitForTimeout(400);
  const nb = await p.locator('.node').first().boundingBox();
  await p.mouse.click(nb.x + nb.width / 2, nb.y + nb.height / 2);
  await p.waitForFunction(() => window.__game.state === 'play');
  // 완료 순간·결과 화면·버튼 수락 시각을 페이지 안에서 기록
  await G(p, () => {
    window.__qa = { ev: [] };
    const g = window.__game;
    let lastDone = false, lastState = g.state;
    const f = () => { const b = g.board; const now = performance.now();
      if (b && b.completed && !lastDone) window.__qa.ev.push({ k: 'done_frame', t: now, clock: g.clock });
      if (g.state !== lastState) window.__qa.ev.push({ k: 'state', s: g.state, t: now, clock: g.clock });
      lastDone = !!(b && b.completed); lastState = g.state; requestAnimationFrame(f); };
    requestAnimationFrame(f);
    window.addEventListener('pointerup', () => window.__qa.ev.push({ k: 'up', t: performance.now(), clock: g.clock, done: !!(g.board && g.board.completed) }), true);
  });
  const at = (gr, [x, y]) => [gr.originX + (x + 0.5) * gr.cellPx, gr.originY + (y + 0.5) * gr.cellPx];
  async function mouseDrag(cells) {
    const gr = await G(p, () => window.__game.layout.grid);
    const [x0, y0] = at(gr, cells[0]); await p.mouse.move(x0, y0); await p.mouse.down();
    for (const cell of cells.slice(1)) { const [x, y] = at(gr, cell); await p.mouse.move(x, y, { steps: 3 }); }
    await p.mouse.up();
  }
  for (let i = 0; i < LEVELS.length; i++) {
    const lv = LEVELS[i];
    console.log('mouse L' + lv.id, await G(p, () => window.__game.state));
    if (i > 0) {
      // round-2: 결과 ▶/↻ 는 일반 모드에서 rAF 루프가 죽는 blocker(qa.md 이슈 1)라 결과 '지도' 버튼으로 같은 수락 시각(1,100 무시·1,400 받음)을 재고 지도 노드로 다음 판을 엶
      const t = await G(p, () => window.__qa.ev.filter((e) => e.k === 'up' && e.done).slice(-1)[0].t);
      const wait = async (ms) => { const now = await G(p, () => performance.now()); if (t + ms > now) await p.waitForTimeout(t + ms - now); };
      await wait(1100); { const b = await p.locator('#rMap').boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
      const early = await G(p, () => window.__game.state);
      await wait(1400); { const b = await p.locator('#rMap').boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
      const tClick = await G(p, () => performance.now());
      await p.waitForFunction(() => window.__game.state === 'map'); await p.waitForTimeout(200);
      for (let k = 0; k < 5 && !(await p.locator(`.node[data-i="${i}"]`).count()); k++) { const nb2 = await p.locator('#mNext').boundingBox(); await p.mouse.click(nb2.x + nb2.width / 2, nb2.y + nb2.height / 2); await p.waitForTimeout(500); }
      { const b = await p.locator(`.node[data-i="${i}"]`).boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
      await p.waitForFunction(() => window.__game.state === 'play');
      // 다음 판 조작 가능: 카드가 있으면 한 번 눌러 닫음, 그다음 첫 쌍 점 누름이 받아지는지
      let card = await G(p, () => window.__game.board.card);
      let tCardClose = null, cardTaps = 0, cardShownMs = null; if (card) { const t0c = await G(p, () => window.__game.clock); await p.waitForTimeout(450); for (let k = 0; k < 6 && (await G(p, () => window.__game.board.card && !window.__game.board.locked === false)); k++) { const cb = await p.locator('#pCard').boundingBox(); await p.mouse.click(cb.x + cb.width / 2, cb.y + cb.height / 2); cardTaps++; tCardClose = await G(p, () => performance.now()); if (!(await G(p, () => window.__game.board.locked))) break; await p.waitForTimeout(150); } cardShownMs = +((await G(p, () => window.__game.clock)) - t0c).toFixed(0); console.log("card", lv.id, cardTaps, cardShownMs, JSON.stringify(await G(p, () => ({ card: window.__game.board.card, locked: window.__game.board.locked, st: window.__game.state, li: window.__game.levelIndex })))); } // r2 H1·S8: 카드는 뜬 뒤 400 ms 부터 누름으로 닫히고, 닫히는 즉시 판 누름을 받아야 함(기다리지 않음)
      const gr = await G(p, () => window.__game.layout.grid);
      const [x0, y0] = at(gr, solOf(lv)[0][0]);
      await p.mouse.move(x0, y0); await p.mouse.down();
      const acc = await G(p, () => ({ n: window.__game.dragLog.length, t: performance.now() }));
      await p.mouse.up();
      const ev = await G(p, () => window.__qa.ev);
      const up = ev.filter((e) => e.k === 'up' && e.done && e.t <= t).slice(-1)[0];
      const res = ev.filter((e) => e.k === 'state' && e.s === 'result' && e.t > up.t)[0];
      out.timing.push({ card_taps: cardTaps, card_game_ms_until_closed: cardShownMs, card_close_to_press_ms: tCardClose ? +(acc.t - tCardClose).toFixed(0) : null, level_completed: LEVELS[i - 1].id, early_click_state: early, done_to_result_ms: res ? +(res.t - up.t).toFixed(0) : null, done_to_result_clock_ms: res ? +(res.clock - up.clock).toFixed(0) : null, next_click_at_ms: +(tClick - up.t).toFixed(0), next_press_accepted: acc.n === 1, card, done_to_next_press_ms: +(acc.t - up.t).toFixed(0) });
      await G(p, (i) => { const g = window.__game; if (g.levelIndex !== i) g.loadLevel(i); }, i); // 같은 판이면 그대로
      if (await G(p, () => window.__game.moves)) { await G(p, (i) => window.__game.loadLevel(i), i); await p.waitForTimeout(450); if (await G(p, () => window.__game.board.card)) { const cb = await p.locator('#pCard').boundingBox(); await p.mouse.click(cb.x + cb.width / 2, cb.y + cb.height / 2); } }
    } else { await p.waitForTimeout(250); }
    await p.waitForTimeout(150);
    for (const path of solOf(lv)) await mouseDrag(path);
    const r = await G(p, () => window.__game.result);
    const log = await G(p, () => window.__game.dragLog);
    const sim = simRun(lv, log.map((d) => d.map(([x, y]) => y * lv.width + x)));
    out.gen.push({ id: lv.id, star: !!(r && r.star), pct: r && r.accuracyPct, moves: r && r.moves, replay_match: !!r && sim.moves === r.moves && sim.star === r.star && sim.pct === r.accuracyPct });
    await p.waitForFunction(() => window.__game.state === 'result', null, { timeout: 5000 }).catch(async (e) => { console.log('LOG', JSON.stringify(LOG.console.slice(0, 5))); console.log('FAIL', lv.id, JSON.stringify(await G(p, () => ({ st: window.__game.state, b: window.__game.board, log: window.__game.dragLog, m: window.__game.moves })))); throw e; });
  }
  // 아이 봇 드래그 열 일부를 실제 마우스로(L1~L3 각 8판): 빌드 결과 = 시뮬레이터
  for (const li of [0, 1, 2]) {
    const lv = LEVELS[li], xy = toXY(lv);
    for (let k = 0; k < 8; k++) {
      const run = solveRun(lv, CHILD, mixSeed(SEED, 0, li, k), { log: true });
      await G(p, (li) => window.__game.loadLevel(li), li); await p.waitForTimeout(250);
      if (await G(p, () => window.__game.board.card)) { await p.waitForTimeout(250); const cb = await p.locator('#pCard').boundingBox(); await p.mouse.click(cb.x + cb.width / 2, cb.y + cb.height / 2); }
      for (const d of run.log) { await mouseDrag(d.map(xy)); if (await G(p, () => window.__game.board.completed)) break; }
      const b = await G(p, () => ({ moves: window.__game.moves, done: window.__game.board.completed, r: window.__game.result, log: window.__game.dragLog }));
      const sim = simRun(lv, run.log);
      const rec = simRun(lv, b.log.map((d) => d.map(([x, y]) => y * lv.width + x)));
      out.bot.push({ id: lv.id, k, sim_moves: sim.moves, build_moves: b.moves, done: b.done, match: b.moves === sim.moves && b.done === sim.completed && (b.r ? b.r.accuracyPct : null) === sim.pct, rec_match: rec.moves === b.moves });
      await p.waitForTimeout(1300);
    }
  }
  // 처음부터·되돌리기(실제 마우스로 버튼)
  {
    await G(p, () => window.__game.loadLevel(2)); await p.waitForTimeout(300);
    const s3 = solOf(LEVELS[2]);
    await mouseDrag(s3[0]); await mouseDrag(s3[1]);
    const m0 = await G(p, () => window.__game.moves);
    const bb = async (id) => { const b = await p.locator(id).boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
    await bb('#pUndo'); const u = await G(p, () => ({ m: window.__game.moves, dots: window.__game.board.pairDots }));
    await bb('#pRestart'); const t0 = await G(p, () => performance.now());
    const r1 = await G(p, () => ({ m: window.__game.moves, empty: window.__game.board.paths.every((x) => !x.length) }));
    await mouseDrag(s3[0]); const t1 = await G(p, () => performance.now());
    const r2 = await G(p, () => ({ m: window.__game.moves, d: window.__game.board.pairDots }));
    out.restart = { moves_before: m0, undo_moves: u.m, undo_dots: u.dots, restart_moves: r1.m, restart_empty: r1.empty, drag_after_restart_ms: +(t1 - t0).toFixed(0), drag_after_restart_connected: r2.d[0], moves_after: r2.m, reset_clear_ms_balance: BAL.fx_ms.reset_clear_ms };
  }
  await c.close();
  out.balance = { input_lock_s: BAL.complete.input_lock_s, result_buttons_after_ms: BAL.complete.result_buttons_after_ms };
  await finish('mouse', out);
  process.exit(0);
}

// ================================================================= paint (채움 % = 칠한 칸)
if (PART === 'paint') {
  await boot();
  const { c, p } = await open(412, 915, '?test=1', { store: null });
  const out = { cases: 0, mismatch: 0, tainted: false, samples: [] };
  for (const li of [0, 2, 5, 7, 9, 11, 29, 49].filter((i) => i < LEVELS.length)) {
    const lv = LEVELS[li], xy = toXY(lv);
    const base = await G(p, ([li]) => { const g = window.__game; g.loadLevel(li); g.closeCard(); g.step(1200); return true; }, [li]);
    void base;
    for (let k = 0; k < 6; k++) {
      const run = solveRun(lv, CHILD, mixSeed(SEED, 3, li, k), { log: true });
      const cut = Math.max(1, Math.floor(run.log.length * (0.3 + 0.1 * k)));
      const drags = run.log.slice(0, Math.min(cut, run.log.length - 1)).map((d) => d.map(xy));
      const r = await G(p, ([li, drags]) => {
        const g = window.__game; g.loadLevel(li); g.closeCard(); g.step(3500);
        const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
        const gr = g.layout.grid, s = cv.width / cv.getBoundingClientRect().width;
        const pix = (x, y) => { const d = ctx.getImageData(Math.round(x * s), Math.round(y * s), 1, 1).data; return [d[0], d[1], d[2]]; };
        const pts = (cx, cy) => [[0.36, 0.36], [-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36]].map(([ox, oy]) => pix(gr.originX + (cx + 0.5 + ox) * gr.cellPx, gr.originY + (cy + 0.5 + oy) * gr.cellPx));
        const b0 = g.board; const empty = [];
        for (let y = 0; y < b0.H; y++) for (let x = 0; x < b0.W; x++) empty.push(pts(x, y));
        for (const d of drags) g.drag(d);
        g.step(1500);
        const b = g.board, holes = new Set(b.holes.map(([x, y]) => y * b.W + x));
        let tinted = 0, exp = 0;
        const conn = new Set(); b.paths.forEach((p, c) => { if (b.pairDots[c]) for (const [x, y] of p) conn.add(y * b.W + x); });
        const wrong = [];
        for (let y = 0; y < b.H; y++) for (let x = 0; x < b.W; x++) {
          const i = y * b.W + x; if (holes.has(i)) continue;
          const now = pts(x, y), was = empty[i];
          const diff = now.every((px, j) => Math.abs(px[0] - was[j][0]) + Math.abs(px[1] - was[j][1]) + Math.abs(px[2] - was[j][2]) > 24);
          if (diff) tinted++; if (conn.has(i)) exp++;
          if (diff !== conn.has(i)) wrong.push([x, y]);
        }
        const cells = b.W * b.H - holes.size;
        const fp = document.getElementById('pFillPct'); const bar = document.getElementById('pFillBar'), tr = document.getElementById('pFillTrack'); return { fillPct: b.fillPct, shown: fp ? fp.textContent : null, bar: bar && tr ? +(100 * bar.getBoundingClientRect().width / tr.getBoundingClientRect().width).toFixed(1) : null, tinted, exp, pctFromPixels: Math.floor((100 * tinted) / cells), wrong };
      }, [li, drags]).catch((e) => ({ error: String(e) }));
      if (r.error) { out.tainted = r.error; break; }
      out.cases++;
      if (r.pctFromPixels !== r.fillPct || r.wrong.length) out.mismatch++; if (r.shown != null && parseInt(r.shown) !== r.fillPct) out.shown_mismatch = (out.shown_mismatch || 0) + 1;
      out.samples.push({ level: lv.id, k, ...r });
    }
  }
  // 하나 찍어 둠(눈 확인용)
  await p.screenshot({ path: join(SDIR, 'paint-check-L10-partial-412x915.png') });
  await c.close();
  await finish('paint', out);
  process.exit(0);
}

// ================================================================= shots (화면·크기·겹침·카드 단언, round-2: 장 페이지·색 돌려쓰기·막힘·도움 신호·결과 점 줄)
if (PART === 'shots') {
  await boot();
  const RES = [[360, 640], [412, 915], [640, 360], [1280, 720]];
  const partial = { v: 1, sound: true, vibrate: true, motion: false, lang: null, levels: { '01': { done: true, star: true, bestPct: 100, bestFill: 100 }, '02': { done: true, star: false, bestPct: 66, bestFill: 100 }, '03': { done: true, star: true, bestPct: 100, bestFill: 100 }, '04': { done: false, star: false, bestPct: null, bestFill: 40 } } };
  const allDone = { v: 1, sound: true, vibrate: true, motion: false, lang: null, levels: Object.fromEntries(LEVELS.slice(0, 12).map((l) => [l.id, { done: true, star: true, bestPct: 100, bestFill: 100 }])) };
  const out = { ui: [], cells: [], shots: [], error: [], cards: [], asserts: [] };
  const shot = async (p, name) => { await p.screenshot({ path: join(SDIR, name) }); out.shots.push(name); };
  const assert = (tag, ok, info) => { out.asserts.push({ tag, ok: !!ok, info }); if (!ok) console.log('ASSERT FAIL', tag, JSON.stringify(info)); };
  async function ui(p, tag) {
    const r = await p.evaluate(() => {
      const vis = (el) => { let e = el; while (e) { const s = getComputedStyle(e); if (e.hidden || s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; e = e.parentElement; } return true; };
      const R = (el) => el.getBoundingClientRect();
      const els = [...document.querySelectorAll('.screen.show button')].filter(vis).filter((b) => !b.closest('#gConfirm[hidden]'));
      const rs = els.map((b) => ({ id: b.id || b.className + (b.dataset.i ?? b.dataset.k ?? b.dataset.lang ?? b.dataset.p ?? ''), tab: b.getAttribute('role') === 'tab', r: R(b) }));
      const g = window.__game;
      if (g.state === 'play' && g.layout.grid) { const gr = g.layout.grid, b = g.board; rs.push({ id: 'BOARD', r: { left: gr.originX, top: gr.originY, right: gr.originX + gr.cellPx * b.W, bottom: gr.originY + gr.cellPx * b.H, width: gr.cellPx * b.W, height: gr.cellPx * b.H } }); }
      const small = rs.filter((x) => x.id !== 'BOARD' && !x.tab && (x.r.width < 47.5 || x.r.height < 47.5)).map((x) => `${x.id}:${x.r.width.toFixed(0)}x${x.r.height.toFixed(0)}`);
      const tabs = rs.filter((x) => x.tab).map((x) => `${x.r.width.toFixed(0)}x${x.r.height.toFixed(0)}`);
      const ov = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
      const over = [];
      for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) if (ov(rs[i].r, rs[j].r)) over.push(rs[i].id + '×' + rs[j].id);
      const inGuard = !!document.querySelector('#guardian.show');
      const outside = inGuard ? [] : rs.filter((x) => x.r.left < -0.5 || x.r.top < -0.5 || x.r.right > innerWidth + 0.5 || x.r.bottom > innerHeight + 0.5).map((x) => x.id);
      const minBtn = Math.min(...rs.filter((x) => x.id !== 'BOARD' && !x.tab).map((x) => Math.min(x.r.width, x.r.height)));
      const gs = document.getElementById('gScroll'); const gScroll = gs && vis(gs) ? { sh: gs.scrollHeight, ch: gs.clientHeight, hint: vis(document.getElementById('gHint')) } : null;
      const texts = [...document.querySelectorAll('.screen.show .slot, .screen.show .band b, .screen.show .tb, #pFillPct')].filter(vis).filter((e) => e.textContent.trim());
      const overflow = texts.filter((e) => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2).map((e) => (e.id || e.className) + ':' + e.textContent.slice(0, 12));
      // 가림: 보이는 글 자리 ↔ 버튼·HUD, 카드 ↔ 글 자리·HUD·버튼(카드 안 글은 제외)
      // HUD 묶음(쌍 점 줄·별 줄·결과 점 줄)은 상자가 넓게 잡혀 가짜 겹침이 나므로 실제로 그려진 자식 요소 사각형을 씀
      const hud = ['pPairs', 'pFill', 'mStars', 'rDots', 'rPct', 'rStar'].map((id) => document.getElementById(id)).filter((e) => e && vis(e) && e.closest('.screen.show')).flatMap((e) => (['pPairs', 'mStars', 'rDots'].includes(e.id) && e.children.length ? [...e.children].filter(vis) : [e]));
      const covered = [];
      for (const t of texts) for (const b of [...els, ...hud]) if (!b.contains(t) && !t.contains(b) && ov(R(t), R(b))) covered.push((t.id || t.className) + '∩' + (b.id || (b.parentElement.id + '>' + b.tagName)));
      const card = document.getElementById('pCard'); let cardHits = null;
      if (card && vis(card) && document.querySelector('#play.show')) { cardHits = []; for (const e of [...texts.filter((t) => !card.contains(t)), ...hud, ...els]) if (ov(R(card), R(e))) cardHits.push(e.id || (e.parentElement.id + '>' + e.tagName)); }
      return { n: rs.length, small, tabs, over, outside, minBtn: +minBtn.toFixed(1), gScroll, overflow, covered, cardHits };
    });
    out.ui.push({ tag, ...r });
    return r;
  }
  const blockedCase = (() => { for (let li = 0; li < 12; li++) { const lv = LEVELS[li]; for (let k = 0; k < lv.pairs.length; k++) for (let m = 0; m < lv.pairs.length; m++) if (m !== k) for (const ep of [lv.pairs[m].a, lv.pairs[m].b]) { const a = lv.pairs[k].a; if (Math.abs(a[0] - ep[0]) + Math.abs(a[1] - ep[1]) === 1) return { li, drag: [a, ep] }; } } return null; })();
  for (const [W, H] of RES) {
    for (const lang of ['ko', 'en']) {
      const tag = `${W}x${H}-${lang}`;
      const { c, p } = await open(W, H, `?test=1&lang=${lang}`, { store: partial });
      await G(p, () => window.__game.step(1500)); await ui(p, tag + ' title'); await shot(p, `${tag}-title.png`);
      await G(p, () => { window.__game.toMap(0); window.__game.step(600); }); await ui(p, tag + ' map-ch1'); await shot(p, `${tag}-map-ch1.png`);
      await G(p, () => { window.__game.toMap(2); window.__game.step(600); }); await ui(p, tag + ' map-ch3-locked'); await shot(p, `${tag}-map-ch3-locked.png`);
      const ns = await G(p, () => [...document.querySelectorAll('#mNodes .node')].map((b) => b.dataset.state));
      assert(tag + ' ch3 nodes locked', ns.length === 10 && ns.every((s) => s === 'locked'), ns);
      await G(p, () => { const g = window.__game; g.loadLevel(0); g.step(500 + 250 + 150 + 260 * 2 + 100); }); await ui(p, tag + ' play-L1'); await shot(p, `${tag}-play-L1-tutorial.png`);
      const l2 = LEVELS[1], s2 = solOf(l2), straight = l2.pairs.map((pr, k) => (k === 2 ? [pr.a, pr.b] : s2[k]));
      await G(p, (paths) => { const g = window.__game; g.loadLevel(1); g.closeCard(); g.step(300); for (const c of paths) g.drag(c); g.step(630 + 2 * 2600 + 300); }, straight); await ui(p, tag + ' play-L2-gap'); await shot(p, `${tag}-play-L2-gap.png`);
      // 막힘 튕김 순간(bump)
      if (blockedCase) { await G(p, (bc) => { const g = window.__game; g.loadLevel(bc.li); g.closeCard(); g.step(300); g.press(bc.drag[0]); g.move(bc.drag[1]); g.step(50); }, blockedCase); await shot(p, `${tag}-play-blocked-bump.png`); await G(p, () => { window.__game.release(); }); }
      // L6 판정(카드 닫고 일부 이음), L12 색 돌려쓰기
      const s6 = solOf(LEVELS[5]);
      await G(p, (s6) => { const g = window.__game; g.loadLevel(5); g.closeCard(); g.step(300); g.drag(s6[0]); g.drag(s6[2]); g.step(1000); g.drag([s6[4][0], s6[4][1]]); g.drag(s6[1]); g.undo(); g.drag(s6[1]); g.step(90); }, s6); await ui(p, tag + ' play-L6'); await shot(p, `${tag}-play-L6-judge.png`);
      const s12 = solOf(LEVELS[11]);
      await G(p, (s) => { const g = window.__game; g.loadLevel(11); g.closeCard(); g.step(300); g.drag(s[0]); g.drag(s[1]); g.step(90); }, s12); await ui(p, tag + ' play-L12'); await shot(p, `${tag}-play-L12-colors.png`);
      // 도움 신호(L8, 이동 수 ≥ moves_trigger)
      const trig = BAL.help.moves_trigger_by_level['08'], l8 = LEVELS[7], s8 = solOf(l8);
      const hb = await G(p, ([s, n]) => { const g = window.__game; g.loadLevel(7); g.closeCard(); g.step(300); for (let k = 0; k < n; k++) { const q = k % 4; g.drag(q === 0 ? s[0] : q === 1 ? s[1] : q === 2 ? s[0].slice(0, 2) : s[1].slice(0, 2)); } g.step(800); return { moves: g.moves, help: g.board.helpBreath }; }, [s8, trig + 2]);
      assert(tag + ' L8 help signal', hb.help && hb.moves >= trig, hb); await shot(p, `${tag}-play-L8-help-signal.png`);
      // 결과: L6 100 % / L3 한 쌍 다시 그음(속 빈 점)
      await G(p, (s6) => { const g = window.__game; g.loadLevel(5); g.closeCard(); g.step(300); for (const c of s6) g.drag(c); g.step(1000 + 1600); }, s6); await ui(p, tag + ' result'); await shot(p, `${tag}-result.png`);
      const s3 = solOf(LEVELS[2]);
      const r3 = await G(p, (s) => { const g = window.__game; g.loadLevel(2); g.step(300); g.drag(s[0]); g.drag(s[1]); g.drag(s[2].slice(0, 2)); g.drag(s[0].slice(0, 2)); g.drag(s[0]); g.drag(s[2]); g.drag(s[3]); g.step(1000 + 1600); return { r: g.result, dots: document.getElementById('rDots').getAttribute('aria-valuenow'), star: !document.getElementById('rStar').hidden }; }, s3);
      await ui(p, tag + ' result-partial'); await shot(p, `${tag}-result-partial.png`);
      assert(tag + ' result hollow dots', r3.r && r3.r.accuracyPct === 50 && !r3.r.star && r3.r.oneShot.filter((x) => !x).length === 2 && r3.dots === '2', r3);
      await G(p, () => { window.__game.toGuardian(); window.__game.step(400); }); const gu = await ui(p, tag + ' guardian'); await shot(p, `${tag}-guardian.png`);
      if (gu.gScroll && gu.gScroll.sh > gu.gScroll.ch + 2) assert(tag + ' guardian scroll hint', gu.gScroll.hint, gu.gScroll);
      // 카드: 저장 기록을 지우고 찍음 + 카드가 실제로 떠 있음 단언 + 가림 검사
      for (const [li, nm] of [[1, 'L2-card'], [5, 'L6-card']]) {
        const st = await G(p, (li) => { const g = window.__game; g.clearProgress(); g.loadLevel(li); g.step(450); return g.board.card; }, li);
        assert(`${tag} ${nm} shown`, st === true, st);
        const u = await ui(p, `${tag} play-${nm}`); out.cards.push({ tag, nm, shown: st, hits: u.cardHits });
        await shot(p, `${tag}-play-${nm}.png`);
      }
      if (lang === 'ko') for (let i = 0; i < LEVELS.length; i++) { const cp = await G(p, (i) => { const g = window.__game; g.loadLevel(i); return g.layout.grid.cellPx; }, i); out.cells.push({ res: `${W}x${H}`, level: LEVELS[i].id, size: `${LEVELS[i].width}x${LEVELS[i].height}`, cell_px: +cp.toFixed(1) }); }
      await c.close();
      const ec = await browser.newContext({ viewport: { width: W, height: H }, locale: lang === 'ko' ? 'ko-KR' : 'en-US' }); const ep = await ec.newPage();
      watch(ep, tag + ' error');
      await ep.route('**/data/balance.json', (r) => r.fulfill({ status: 503, body: 'x' }));
      await ep.goto(BASE());
      await ep.waitForFunction(() => !document.getElementById('bootRetry').hidden, null, { timeout: 10000 });
      const er = await ep.evaluate(() => { const b = document.getElementById('bootRetry').getBoundingClientRect(); return { lang: document.documentElement.lang, title: document.title, msg: document.getElementById('bootMsg').textContent, svg: !!document.querySelector('#bootRetry svg'), btn: [Math.round(b.width), Math.round(b.height)] }; });
      out.error.push({ tag, ...er, ok: er.lang === lang && er.title === STR.title[lang] && er.msg === STR.load_error[lang] && er.svg && er.btn[0] >= 48 && er.btn[1] >= 48 });
      await ep.screenshot({ path: join(SDIR, `${tag}-error.png`) }); out.shots.push(`${tag}-error.png`);
      await ec.close();
    }
  }
  // 글 없는 화면(notext), 빈 저장소
  for (const [W, H] of [[360, 640], [640, 360]]) {
    const tag = `${W}x${H}-notext`;
    const { c, p } = await open(W, H, '?test=1&notext=1&lang=ko', { store: null });
    await G(p, () => window.__game.step(1500)); await shot(p, `${tag}-title.png`);
    await G(p, () => { window.__game.toMap(); window.__game.step(600); }); await shot(p, `${tag}-map-first.png`);
    for (const [ms, nm] of [[500 + 250 + 150 + 260, 'a'], [500 + 250 + 150 + 260 * 4, 'b']]) { await G(p, (ms) => { const g = window.__game; g.loadLevel(0); g.step(ms); }, ms); await shot(p, `${tag}-play-L1-demo-${nm}.png`); }
    for (const [li, nm] of [[1, 'L2-card'], [5, 'L6-card']]) { const st = await G(p, (li) => { const g = window.__game; g.loadLevel(li); g.step(450); return g.board.card; }, li); assert(`${tag} ${nm} shown`, st === true, st); await shot(p, `${tag}-play-${nm}.png`); }
    const s3 = solOf(LEVELS[2]);
    await G(p, (s) => { const g = window.__game; g.loadLevel(2); g.step(300); g.drag(s[0]); g.drag(s[1]); g.drag(s[2].slice(0, 2)); g.drag(s[0].slice(0, 2)); g.drag(s[0]); g.drag(s[2]); g.drag(s[3]); g.step(2600); }, s3); await shot(p, `${tag}-result-partial.png`);
    await c.close();
  }
  // 흑백 + 움직임 줄이기
  for (const [W, H] of [[412, 915], [640, 360]]) {
    const { c, p } = await open(W, H, '?test=1&lang=ko', { store: allDone });
    for (const li of [8, 11, 19]) {
      const s = solOf(LEVELS[li]);
      await G(p, ([li, s]) => { const g = window.__game; g.loadLevel(li); g.closeCard(); g.step(300); g.drag(s[0]); g.drag(s[2]); g.step(1500); }, [li, s]);
      await p.addStyleTag({ content: 'html{filter:grayscale(1)!important}' });
      await shot(p, `${W}x${H}-gray-L${LEVELS[li].id}.png`);
      await p.evaluate(() => { const s = [...document.querySelectorAll('style')].pop(); s.remove(); });
    }
    await c.close();
  }
  {
    const { c, p } = await open(412, 915, '?test=1&lang=ko', { store: null, reducedMotion: 'reduce' });
    const s = solOf(LEVELS[2]);
    await G(p, (s) => { const g = window.__game; g.loadLevel(2); g.step(300); g.drag(s[0]); g.step(40); }, s); await shot(p, '412x915-reduced-connect-L3.png');
    if (blockedCase) { await G(p, (bc) => { const g = window.__game; g.loadLevel(bc.li); g.closeCard(); g.step(300); g.press(bc.drag[0]); g.move(bc.drag[1]); g.step(50); }, blockedCase); await shot(p, '412x915-reduced-blocked.png'); await G(p, () => window.__game.release()); }
    await c.close();
  }
  const { c, p } = await open(412, 915, '?test=1', { store: null });
  out.levelCount = await G(p, () => window.__game.levelCount);
  out.layoutCells = [];
  for (const [W, H] of RES) for (const [cc, rr] of [[4, 4], [5, 5], [5, 6], [6, 6]]) out.layoutCells.push({ res: `${W}x${H}`, board: `${cc}x${rr}`, cell: +(await G(p, ([W, H, cc, rr]) => window.__game.calcLayout(W, H, cc, rr).play.cell, [W, H, cc, rr])).toFixed(1) });
  await c.close();
  await finish('shots', out);
  process.exit(0);
}

// ================================================================= perf (round-2: 실제 UI 흐름 — 타이틀 → 지도 → L6(카드) → ▶ L7 → ▶ L8 → 지도 → 장 넘김, DPR 1·2·3)
if (PART === 'perf') {
  await boot({ needBrowser: false });
  const RUNS = +opt('--runs', 3), DPRS = String(opt('--dpr', '1,2,3')).split(',').map(Number), WIDE = args.includes('--wide');
  const configs = WIDE ? [{ name: '1280x720 dpr1', w: 1280, h: 720, dsf: 1 }] : DPRS.map((d) => ({ name: `412x915 dpr${d}`, w: 412, h: 915, dsf: d }));
  const store = { v: 1, sound: true, vibrate: true, motion: false, lang: 'ko', levels: Object.fromEntries(LEVELS.slice(0, 5).map((l) => [l.id, { done: true, star: true, bestPct: 100, bestFill: 100 }])) };
  const out = { runs: [], flow: 'title→map(ch1) → L6 노드(카드 닫고 풀기) → 결과 지도 → L7 노드 → 결과 지도 → L8 노드 → 결과 지도 → 장 ▶ 넘김 (결과 ▶ 는 blocker 라 제외)' };
  const fromD = (d) => { if (!d.length) return { frames: 0 }; const tot = d.reduce((a, b) => a + b, 0); const s = [...d].sort((a, b) => b - a); const n1 = Math.max(1, Math.floor(d.length * 0.01)); return { frames: d.length, avg: +((d.length / tot) * 1000).toFixed(1), low1: +(1000 / (s.slice(0, n1).reduce((a, b) => a + b, 0) / n1)).toFixed(1), max_ms: +s[0].toFixed(1), over33: d.filter((x) => x > 33.4).length }; };
  for (const cf of configs) for (let run = 0; run < (args.includes('--blank-only') ? 0 : RUNS); run++) {
    const br = await newBrowser();
    const { c, p } = await open(cf.w, cf.h, '?lang=ko', { store, dsf: cf.dsf, br });
    const cdp = await c.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await G(p, () => {
      window.__pf = { t: [], marks: [], inp: [] };
      const g = window.__game;
      let pend = [], n0 = 0;
      const cnt = () => g.dragLog.reduce((a, d) => a + d.length, 0);
      const f = (ts) => { window.__pf.t.push(ts); if (pend.length) { for (const q of pend) window.__pf.inp.push({ frames: 1, ms: +(ts - q.t).toFixed(1) }); pend = []; } requestAnimationFrame(f); };
      requestAnimationFrame(f);
      window.addEventListener('pointermove', () => { n0 = cnt(); }, true);
      window.addEventListener('pointermove', (e) => { if (g.state === 'play' && cnt() !== n0) pend.push({ t: e.timeStamp }); }, false);
    });
    await p.waitForTimeout(1500);
    const mark = (k) => G(p, (k) => window.__pf.marks.push({ k, t: performance.now() }), k);
    const at = (gr, [x, y]) => [gr.originX + (x + 0.5) * gr.cellPx, gr.originY + (y + 0.5) * gr.cellPx];
    const clickEl = async (sel) => { const b = await p.locator(sel).boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
    const menu = {};
    const longest = async (k, fn, wait = 900) => { const t0 = await G(p, () => performance.now()); await fn(); await p.waitForTimeout(wait); const t1 = await G(p, () => performance.now()); menu[k] = await G(p, ([a, b]) => { const t = window.__pf.t.filter((x) => x >= a && x <= b + 50); let m = 0; for (let i = 1; i < t.length; i++) m = Math.max(m, t[i] - t[i - 1]); return +m.toFixed(1); }, [t0, t1]); };
    const playSolution = async (li) => {
      await mark('drag');
      for (const path of solOf(LEVELS[li])) {
        const gr = await G(p, () => window.__game.layout.grid);
        const [x0, y0] = at(gr, path[0]); await p.mouse.move(x0, y0); await p.mouse.down();
        for (const cell of path.slice(1)) { const [x, y] = at(gr, cell); await p.mouse.move(x, y, { steps: 4 }); }
        await p.mouse.up();
      }
      await mark('done'); await p.waitForTimeout(2300); await mark('result');
    };
    await longest('title_to_map', () => p.mouse.click(cf.w / 2, cf.h * 0.85));
    const node6 = p.locator('.node[data-i="5"]');
    await mark('start'); await longest('map_to_play_L6', async () => { const b = await node6.boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }, 1200);
    if (await G(p, () => window.__game.board.card)) { await p.waitForTimeout(500); await clickEl("#pCard"); }
    await playSolution(5);
    await longest('result_to_map_1', () => clickEl('#rMap'), 1000); await mark('start'); await longest('map_to_play_L7', () => clickEl('.node[data-i="6"]'), 1200);
    await playSolution(6);
    await longest('result_to_map_2', () => clickEl('#rMap'), 1000); await mark('start'); await longest('map_to_play_L8', () => clickEl('.node[data-i="7"]'), 1200);
    await playSolution(7);
    await mark('menu'); await longest('result_to_map', () => clickEl('#rMap'), 1200);
    await longest('map_page_turn', () => clickEl('#mNext'), 1000);
    const pf = await G(p, () => window.__pf);
    const win = (a, b) => { const t = pf.t.filter((x) => x >= a && x <= b); const d = []; for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]); return d; };
    const W = { all: fromD(win(pf.t[0], pf.t[pf.t.length - 1])) };
    const st = [], dr = [], dn = [];
    pf.marks.forEach((m, i) => { const nx = pf.marks[i + 1] ? pf.marks[i + 1].t : pf.t[pf.t.length - 1]; if (m.k === 'start') st.push(...win(m.t, Math.min(nx, m.t + 1200))); if (m.k === 'drag') dr.push(...win(m.t, nx)); if (m.k === 'done') dn.push(...win(m.t, Math.min(nx, m.t + 2300))); });
    W.level_start_transition = fromD(st); W.dragging_juice = fromD(dr); W.complete_fx_result = fromD(dn);
    const lat = pf.inp.map((x) => x.ms).sort((a, b) => a - b);
    const inp = { n: lat.length, frames_max: Math.max(...pf.inp.map((x) => x.frames)), ms_median: lat[Math.floor(lat.length / 2)], ms_p95: lat[Math.floor(lat.length * 0.95)], ms_max: lat[lat.length - 1] };
    const res = await G(p, () => ({ state: window.__game.state, page: window.__game.mapPage }));
    out.runs.push({ config: cf.name, run, windows: W, menu_longest_frame_ms: menu, input_to_cell: inp, end: res });
    console.log(cf.name, run, 'all', JSON.stringify(W.all), 'start', JSON.stringify(W.level_start_transition), 'drag', JSON.stringify(W.dragging_juice), 'done', JSON.stringify(W.complete_fx_result), 'menu', JSON.stringify(menu), 'input', JSON.stringify(inp), JSON.stringify(res));
    await c.close(); await br.close();
  }
  // 대조: 게임 코드 없는 빈 페이지(같은 DPR·스로틀)
  out.blank_control = [];
  for (const cf of configs) {
    const br = await newBrowser(); const c = await br.newContext({ viewport: { width: cf.w, height: cf.h }, deviceScaleFactor: cf.dsf }); const p = await c.newPage();
    await p.setContent('<html><body style="background:#eee"></body></html>');
    const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    // 스로틀을 건 직후 첫 프레임(약 117 ms)은 측정 환경 튐이라 1.5 s 기다린 뒤 잼(게임 측정도 페이지 로드 1.5 s 뒤부터)
    await p.waitForTimeout(1500);
    await p.evaluate(() => { window.__t = []; const f = (ts) => { window.__t.push(ts); if (window.__t.length < 400) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await p.waitForTimeout(7500);
    const t = await p.evaluate(() => window.__t); const d = []; for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]);
    out.blank_control.push({ config: cf.name, ...fromD(d) });
    await br.close();
  }
  console.log('blank', JSON.stringify(out.blank_control));
  await finish('perf-' + (args.includes('--blank-only') ? 'blank-' : '') + (WIDE ? 'wide' : 'dpr' + DPRS.join('')), out);
  process.exit(0);
}

// ================================================================= func
if (PART === 'func') {
  await boot();
  const out = {};
  // 1) 진행 저장: 일반 모드에서 L1 완료 + L2 절반 → 새로고침
  {
    const { c, p } = await open(412, 915, '', { store: null });
    await p.mouse.click(206, 500); await p.waitForFunction(() => window.__game.state === 'map'); await p.waitForTimeout(300);
    const s1 = solOf(LEVELS[0]), s2 = solOf(LEVELS[1]);
    await G(p, (s1) => { const g = window.__game; g.loadLevel(0); for (const c of s1) g.drag(c); }, s1);
    await G(p, (s2) => { const g = window.__game; g.loadLevel(1); g.closeCard(); g.drag(s2[0]); g.drag(s2[1]); }, s2);
    const before = await G(p, () => window.__game.store.levels);
    await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
    const after = await G(p, () => window.__game.store.levels);
    await p.mouse.click(206, 500); await p.waitForFunction(() => window.__game.state === 'map'); await p.waitForTimeout(300);
    const nodes = await G(p, () => [...document.querySelectorAll('.node')].slice(0, 4).map((b) => b.dataset.state));
    out.save = { before, after, same: JSON.stringify(before) === JSON.stringify(after), map_nodes: nodes };
    // 2) 백그라운드: 오디오 suspended, 게임 시계 멈춤
    await G(p, () => window.__game.loadLevel(2)); await p.waitForTimeout(300);
    const bg = await G(p, async () => {
      const g = window.__game; const a0 = g.audioState;
      Object.defineProperty(document, 'hidden', { value: true, configurable: true }); Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange'));
      const c0 = g.clock; await new Promise((r) => setTimeout(r, 800)); const c1 = g.clock; const a1 = g.audioState;
      Object.defineProperty(document, 'hidden', { value: false, configurable: true }); Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange'));
      await new Promise((r) => setTimeout(r, 500)); const c2 = g.clock;
      return { audio_before: a0, audio_hidden: a1, audio_back: g.audioState, clock_advance_hidden_ms: +(c1 - c0).toFixed(1), clock_advance_after_ms: +(c2 - c1).toFixed(1), state: g.state };
    });
    out.background = bg;
    // 3) 음소거: 지도 소리 버튼을 실제 마우스로 → suspended, 저장, 새로고침 뒤에도 꺼짐
    await G(p, () => window.__game.toMap()); await p.waitForTimeout(400);
    const sb = await p.locator('#mSound').boundingBox(); await p.mouse.click(sb.x + sb.width / 2, sb.y + sb.height / 2); await p.waitForTimeout(300);
    const m1 = await G(p, () => ({ audio: window.__game.audioState, sound: window.__game.store.sound, pressed: document.getElementById('mSound').getAttribute('aria-pressed') }));
    await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
    await p.mouse.click(206, 500); await p.waitForTimeout(400);
    const m2 = await G(p, () => ({ audio: window.__game.audioState, sound: window.__game.store.sound }));
    const sb2 = await p.locator('#mSound').boundingBox(); await p.mouse.click(sb2.x + sb2.width / 2, sb2.y + sb2.height / 2); await p.waitForTimeout(300);
    const m3 = await G(p, () => ({ audio: window.__game.audioState, sound: window.__game.store.sound }));
    out.mute = { after_click: m1, after_reload: m2, unmute: m3 };
    await c.close();
  }
  // 4) 테스트 훅 화면 = 일반 모드 (같은 저장소, 같은 상태에서 픽셀 비교)
  {
    const store = { v: 1, sound: false, vibrate: true, motion: false, lang: 'ko', levels: { '01': { done: true, star: true, bestPct: 100, bestFill: 100 }, '02': { done: true, star: false, bestPct: 66, bestFill: 100 }, '03': { done: false, star: false, bestPct: null, bestFill: 40 } } };
    const cmp = [];
    const capture = async (q) => {
      const { c, p } = await open(412, 915, q, { store });
      const T = q.includes('test');
      const adv = async (ms) => { if (T) await G(p, (ms) => window.__game.step(ms), ms); else await p.waitForTimeout(ms); };
      const imgs = {};
      await G(p, () => window.__game.toMap()); await adv(2000); imgs.map = (await p.screenshot()).toString('base64');
      const s6 = solOf(LEVELS[5]);
      await G(p, () => window.__game.loadLevel(5)); await adv(300); imgs.card = (await p.screenshot()).toString('base64');
      // 카드 자동 닫힘(3 s)이 게임 시계 기준인지: 테스트 모드에서 실제 3.5 s 를 기다려도 카드가 남고, 게임 시계 3.3 s 뒤에는 닫힘
      let cardT = null;
      if (T) { const ac = BAL.rule_card.auto_close_ms; const a0 = await G(p, () => window.__game.board.card); await p.waitForTimeout(ac + 500); const a1 = await G(p, () => window.__game.board.card); await G(p, (ac) => window.__game.step(ac + 300), ac); cardT = { auto_close_ms: ac, shown: a0, after_real_ms: ac + 500, still_after_real: a1, closed_after_game_ms: ac + 300, after_game: await G(p, () => window.__game.board.card) }; }
      await G(p, () => window.__game.closeCard()); await adv(1500);
      await G(p, (s6) => { const g = window.__game; g.drag(s6[0]); g.drag(s6[2]); }, s6); await adv(2500); imgs.partial = (await p.screenshot()).toString('base64');
      await G(p, (s6) => { const g = window.__game; g.drag(s6[1]); g.drag(s6[3]); g.drag(s6[4]); }, s6); await adv(3000); imgs.result = (await p.screenshot()).toString('base64');
      // 카드 자동 닫힘이 게임 시계 기준인지: 테스트 모드에서 실제 3.5 s 를 기다려도 카드가 남아 있어야 함
      let cardReal = null;
      if (T) cardReal = cardT;
      await c.close();
      return { imgs, cardReal };
    };
    const A = await capture('?test=1&lang=ko'), N = await capture('?lang=ko');
    const { c, p } = await open(412, 915, '?test=1', { store: null });
    for (const k of Object.keys(A.imgs)) {
      const d = await p.evaluate(async ([a, b]) => {
        const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        const cv = document.createElement('canvas'); cv.width = ia.width; cv.height = ia.height; const x = cv.getContext('2d', { willReadFrequently: true });
        x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, cv.width, cv.height).data; x.clearRect(0, 0, cv.width, cv.height); x.drawImage(ib, 0, 0); const db = x.getImageData(0, 0, cv.width, cv.height).data;
        let n = 0, maxd = 0; for (let i = 0; i < da.length; i += 4) { const dd = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]); if (dd > 30) n++; if (dd > maxd) maxd = dd; }
        return { diff_px: n, frac: +(n / (da.length / 4)).toFixed(5), maxd };
      }, [A.imgs[k], N.imgs[k]]);
      cmp.push({ screen: k, ...d });
      writeFileSync(join(SDIR, `hook-vs-normal-${k}-test.png`), Buffer.from(A.imgs[k], 'base64')); writeFileSync(join(SDIR, `hook-vs-normal-${k}-normal.png`), Buffer.from(N.imgs[k], 'base64'));
    }
    await c.close();
    out.hook_vs_normal = { compare: cmp, card_timer: A.cardReal };
  }
  // 4b) 같은 화면을 여러 번 다시 그려도 요소가 쌓이지 않음(tcg-01 criteria): 지도·보호자·플레이·결과 5번씩
  {
    const { c, p } = await open(412, 915, '?test=1', { store: null });
    const s1 = solOf(LEVELS[0]);
    out.dom = await G(p, (s1) => {
      const g = window.__game, cnt = () => ({ nodes: document.querySelectorAll('#mNodes .node').length, gBtns: document.querySelectorAll('#gCol button').length, pairs: document.getElementById('pPairs').childElementCount, rBoardSvg: document.querySelectorAll('#rBoard svg').length, screensShown: document.querySelectorAll('.screen.show').length, all: document.querySelectorAll('*').length });
      const rows = [];
      for (let k = 0; k < 5; k++) { g.toMap(); g.step(300); g.toGuardian(); g.step(300); g.setLang(k % 2 ? 'en' : 'ko'); g.loadLevel(0); g.step(300); for (const c of s1) g.drag(c); g.step(2400); rows.push(cnt()); }
      return rows;
    }, s1);
    await c.close();
  }
  // 4c) round-2 새 기능·회귀: S7 시계 0 closeCard, S8 카드 닫힘 즉시 누름·400 ms 무시, H2 처음부터/취소, S13 연결 연타, H4 bump, 도움 신호, 장 잠금, 색 돌려쓰기
  {
    const { c, p } = await open(412, 915, '?test=1', { store: null });
    const L = LEVELS, sol = L.map(solOf);
    const pal = J('assets/palette.json');
    const expColors = L.map((lv) => { const k = lv.pairs.length, sr = pal.slot_rotation; const rot = lv.order >= 11 && (k === 3 || k === 4) && sr.by_level[String(lv.order)] ? sr.by_level[String(lv.order)][String(k)] : null; return lv.pairs.map((pp) => pal.pairs[rot ? rot[pp.color_slot] : pp.color_slot].key); });
    const blocked = (() => { for (let li = 0; li < 12; li++) { const lv = L[li]; for (let k = 0; k < lv.pairs.length; k++) for (let m = 0; m < lv.pairs.length; m++) if (m !== k) for (const ep of [lv.pairs[m].a, lv.pairs[m].b]) { const a = lv.pairs[k].a; if (Math.abs(a[0] - ep[0]) + Math.abs(a[1] - ep[1]) === 1) return { li, drag: [a, ep] }; } } return null; })();
    out.r2 = await G(p, ({ sol, expColors, blocked, trig8 }) => {
      const g = window.__game, o = {}, sfxN = (n) => g.sfxLog.filter((x) => x === n).length, conN = () => g.sfxLog.filter((x) => x.startsWith('connect_g')).length;
      // S7: 시계 0 에서 closeCard → 바로 드래그 받음
      const c0 = g.clock; g.loadLevel(1); const shown = g.board.card; g.closeCard(); const r7 = g.drag(sol[1][0]); o.S7 = { clock: c0, card_shown: shown, pressed_after_close: !!r7.pressed, moves: g.moves };
      // S8: 카드 뜬 뒤 400 ms 안 누름은 무시(카드 남음), 그 뒤 누름은 닫힘 + 같은 프레임 드래그 받음
      g.clearProgress(); g.loadLevel(5); g.step(17); g.press(sol[5][0][0]); const early = g.board.card; g.release();
      g.step(450); const pre = g.board.card; g.closeCard(); const r8 = g.drag(sol[5][0]); o.S8 = { card_before_400ms_tap_still: early, card_at_450: pre, drag_right_after_close: !!r8.pressed && r8.changed !== false, moves: g.moves };
      // H2: 처음부터 = 새 시도, 바로 다음 되돌리기 = 처음부터 취소
      g.loadLevel(2); g.step(300); g.drag(sol[2][0]); g.drag(sol[2][1]); const m0 = g.moves;
      g.restart(); const a = { moves: g.moves, empty: g.board.paths.every((x) => !x.length) };
      g.undo(); const b = { moves: g.moves, dots: g.board.pairDots.filter(Boolean).length };
      g.restart(); g.drag(sol[2][0]); g.undo(); const c2 = { moves: g.moves, empty: g.board.paths.every((x) => !x.length) };
      g.restart(); for (const s of sol[2]) g.drag(s); const star = g.result && g.result.star;
      o.H2 = { before: m0, after_restart: a, undo_cancels_restart: b, undo_after_new_drag: c2, star_after_restart: star };
      // S13: 한 드래그 안에서 같은 연결 5번 왕복 → 연결 소리 1
      g.loadLevel(0); g.step(300); const s0 = sol[0][0]; const n0 = conN(); g.press(s0[0]); for (const cell of s0.slice(1)) g.move(cell);
      for (let k = 0; k < 5; k++) { g.move(s0[s0.length - 2]); g.move(s0[s0.length - 1]); } g.release(); o.S13 = { connect_sounds: conN() - n0, path_len: s0.length };
      // H4: 막힘 → bump 1, 같은 시각 반복은 건너뜀, 300 ms 뒤 다시 1
      if (blocked) { g.loadLevel(blocked.li); g.closeCard(); g.step(300); const hp0 = g.hapticLog.length; const b0 = sfxN('bump'); g.drag(blocked.drag); const b1 = sfxN('bump'); g.drag(blocked.drag); const b2 = sfxN('bump'); g.step(300); g.drag(blocked.drag); const b3 = sfxN('bump'); o.H4 = { level: blocked.li + 1, first: b1 - b0, repeat_same_time: b2 - b1, after_300ms: b3 - b2, moves: g.moves, haptic_added: g.hapticLog.length - hp0 }; }
      // 도움 신호: L8 이동 수 ≥ trig 에서 켜짐, 누르면 끔, 처음부터 = 다시 셈
      g.loadLevel(7); g.step(300); const s8 = sol[7]; let kk = 0; const seq = (n) => { for (let k = 0; k < n; k++) { const q = kk++ % 4; g.drag(q === 0 ? s8[0] : q === 1 ? s8[1] : q === 2 ? s8[0].slice(0, 2) : s8[1].slice(0, 2)); } };
      seq(trig8 - 2); g.step(100); const h0 = { moves: g.moves, help: g.board.helpBreath }; seq(3); g.step(100); const h1 = { moves: g.moves, help: g.board.helpBreath };
      g.help(); g.step(100); const h2 = g.board.helpBreath; seq(4); g.step(100); const h3 = g.board.helpBreath; g.restart(); g.step(100); const h4 = g.board.helpBreath;
      g.loadLevel(0); g.step(300); for (let k = 0; k < 30; k++) { g.drag(sol[0][k % 3]); g.drag(sol[0][k % 3].slice(0, 2)); } g.step(100); const hL1 = { moves: g.moves, help: g.board.helpBreath };
      o.help = { trigger: trig8, below: h0, at_or_above: h1, after_press: h2, after_more_moves_same_attempt: h3, after_restart: h4, L1_no_trigger: hL1 };
      // 색 돌려쓰기
      const bad = []; for (let i = 0; i < sol.length; i++) { g.loadLevel(i); const got = g.board.colors; if (JSON.stringify(got) !== JSON.stringify(expColors[i])) bad.push({ level: i + 1, got, exp: expColors[i] }); } o.colors = { levels: sol.length, mismatch: bad.length, bad: bad.slice(0, 5) };
      // 장 잠금: 빈 기록 → 2장 노드 모두 잠김, 잠긴 노드 클릭 무반응; 1~10 완료 → 2장 첫 노드 next
      g.clearProgress(); g.toMap(1); g.step(400); const st1 = [...document.querySelectorAll('#mNodes .node')].map((b) => b.dataset.state);
      document.querySelector('#mNodes .node').click(); g.step(400); const afterClick = g.state;
      for (let i = 0; i < 10; i++) { g.loadLevel(i); g.closeCard(); for (const s of sol[i]) g.drag(s); g.step(1100); }
      g.toMap(1); g.step(400); const st2 = [...document.querySelectorAll('#mNodes .node')].map((b) => b.dataset.state);
      const tp = g.turnPage(2); g.step(400);
      o.chapters = { ch2_empty: st1, locked_click_state: afterClick, ch2_after_ch1_done: st2, turnPage: tp, title: document.getElementById('mTitle').textContent };
      return o;
    }, { sol, expColors, blocked, trig8: BAL.help.moves_trigger_by_level['08'] });
    await c.close();
  }
  // 5) 접근성 트리(ariaSnapshot): 지도·결과·플레이, ko/en
  out.aria = {};
  for (const lang of ['ko', 'en']) {
    const store = { v: 1, sound: true, vibrate: true, motion: false, lang, levels: { '01': { done: true, star: true, bestPct: 100, bestFill: 100 }, '02': { done: true, star: false, bestPct: 66, bestFill: 100 }, '03': { done: false, star: false, bestPct: null, bestFill: 40 } } };
    const { c, p } = await open(412, 915, `?test=1&lang=${lang}`, { store });
    await G(p, () => { window.__game.toMap(); window.__game.step(400); });
    const map = await p.locator('#map').ariaSnapshot();
    const s1 = solOf(LEVELS[1]);
    await G(p, (s) => { const g = window.__game; g.loadLevel(1); g.closeCard(); g.step(300); g.drag(s[0]); g.drag(s[1]); }, s1);
    const play = await p.locator('#play').ariaSnapshot();
    await G(p, (s) => { const g = window.__game; g.drag(s[2]); g.step(2400); }, s1);
    const result = await p.locator('#result').ariaSnapshot();
    const body = await p.locator('body').ariaSnapshot();
    out.aria[lang] = { map, play, result, body_has_canvas_label: body.includes(STR.aria_board[lang]) };
    await c.close();
  }
  // 6) 동작 줄이기(prefers-reduced-motion): 조각·띠 없음(훅 상태로)
  {
    const { c, p } = await open(412, 915, '?test=1', { store: null, reducedMotion: 'reduce' });
    const s = solOf(LEVELS[2]);
    await p.evaluate((s) => { const g = window.__game; g.loadLevel(2); g.step(300); g.drag(s[0]); g.step(40); }, s);
    await p.screenshot({ path: join(SDIR, '412x915-reduced-motion-L3-connect.png') });
    await c.close();
  }
  await finish('func', out);
  process.exit(0);
}

// ================================================================= audio
if (PART === 'audio') {
  await boot();
  const { c, p } = await open(412, 915, '?test=1', { store: null });
  const got = await p.evaluate(async () => {
    const { Audio } = await import('./js/audio.js');
    const S = await (await fetch('./data/sound.json')).json();
    const SR = S.sample_rate;
    const RealAC = window.AudioContext;
    const peakRms = (d) => { let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); const n = Math.round(0.1 * SR); let s = 0; for (let i = 0; i < n; i++) s += d[i] * d[i]; const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity); return { peak_db: +db(m).toFixed(2), rms_db: +db(Math.sqrt(s / n)).toFixed(2) }; };
    const renderWith = async (lenS, fn) => {
      window.AudioContext = function () { return new OfflineAudioContext(1, Math.round(lenS * SR), SR); };
      const a = new Audio(S); a.unlock(); window.AudioContext = RealAC;
      fn(a);
      const buf = await a.ctx.startRendering();
      return buf.getChannelData(0);
    };
    // play() 와 같은 층 호출(t0 = 0). chord 는 play 의 아르페지오 그대로
    const one = (a, name, pitch, k) => { const s = a.S.sounds[name]; const bus = a.bus[s.bus] || a.master;
      if (s.pitch === 'chord') { for (let i = 0; i < k; i++) for (const L of s.layers) a._layer(L, a.S.ladder_hz[i], (i * s.arp_ms) / 1000, s.db, bus); return; }
      for (const L of s.layers) a._layer(L, pitch || 440, 0, s.db, bus); };
    const M = {};
    for (const [name, def] of Object.entries(S.sounds)) {
      if (def.pitch === 'ladder') for (let i = 0; i < S.ladder_hz.length; i++) M[`${name}@${i + 1}`] = peakRms(await renderWith(1.6, (a) => one(a, name, S.ladder_hz[i])));
      else if (def.pitch === 'tick') for (let i = 0; i < S.tick_hz.length; i++) M[`${name}@${i + 1}`] = peakRms(await renderWith(0.3, (a) => one(a, name, S.tick_hz[i])));
      else if (def.pitch === 'chord') for (let k = 3; k <= 6; k++) M[`${name}@k${k}`] = peakRms(await renderWith(2.0, (a) => one(a, name, null, k)));
      else M[name] = peakRms(await renderWith(1.6, (a) => one(a, name, null)));
    }
    // 배경음: build ambient() 와 같은 층(9 s)
    M.ambient = peakRms(await renderWith(9, (a) => { const A = a.S.ambient; let t = 0, i = 0; while (t < 9) { for (const f of A.chords_hz[i % A.chords_hz.length]) a._layer({ wave: A.layer.wave, f, env: A.layer.env }, f, t, A.db, a.bus[A.bus]); i++; t += A.chord_s; } }));
    // 사용하는 소리 이름(빌드 play 호출 키) 확인용
    return { M, keys: Object.keys(S.sounds) };
  });
  const art = SND.measured.values;
  const rows = [];
  for (const [k, v] of Object.entries(got.M)) { const a = art[k]; rows.push({ key: k, build_peak: v.peak_db, art_peak: a ? a.peak_db : null, d_peak: a ? +(v.peak_db - a.peak_db).toFixed(2) : null, build_rms: v.rms_db, art_rms: a && a.rms_db !== undefined ? a.rms_db : null, d_rms: a && a.rms_db !== undefined ? +(v.rms_db - a.rms_db).toFixed(2) : null }); }
  const maxD = Math.max(...rows.filter((r) => r.d_peak != null).map((r) => Math.max(Math.abs(r.d_peak), Math.abs(r.d_rms ?? 0))));
  const M = got.M;
  let minStep = Infinity; for (let i = 1; i <= 6; i++) { const g = [1, 2, 3].map((n) => M[`connect_g${n}@${i}`].rms_db); minStep = Math.min(minStep, g[0] - g[1], g[1] - g[2]); }
  const conn = Object.entries(M).filter(([k]) => k.startsWith('connect_')), others = Object.entries(M).filter(([k]) => !k.startsWith('connect_'));
  const minConn = Math.min(...conn.map(([, v]) => v.peak_db)), maxOther = Math.max(...others.map(([, v]) => v.peak_db)), maxOtherKey = others.find(([, v]) => v.peak_db === maxOther)[0];
  const maxTick = Math.max(...Object.entries(M).filter(([k]) => k.startsWith('tick')).map(([, v]) => v.peak_db));
  await c.close();
  await finish('audio', { rows, max_abs_diff_db: +maxD.toFixed(2), build_rules: { grade_rms_step_min_db: +minStep.toFixed(2), s1_margin_db: +(minConn - maxOther).toFixed(2), s1_max_other: maxOtherKey, s2_margin_db: +(minConn - maxTick).toFixed(2), s5_margin_db: +(minConn - M.ambient.peak_db).toFixed(2) }, art_margins: SND.measured.margins });
  process.exit(0);
}

// ================================================================= merge
if (PART === 'merge') {
  const parts = {};
  for (const f of readdirSync(PDIR).filter((f) => f.endsWith('.json'))) parts[f.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(PDIR, f), 'utf8'));
  const logs = Object.values(parts).map((x) => x.log).filter(Boolean);
  const qaRead = (x) => x.includes('willReadFrequently') || (x.includes(' error] ') && x.includes('503')); // paint 부분이 게임 캔버스를 getImageData 로 읽어서 난 경고(검사 도구 유발, 게임 코드 아님)
  const qaInduced = logs.flatMap((l) => l.console).filter(qaRead);
  const all = { console: logs.flatMap((l) => l.console).filter((x) => !qaRead(x)), failed: logs.flatMap((l) => l.failed).filter((x) => !(x.includes(' error] ') && x.includes('503'))), external: logs.flatMap((l) => l.external), requests: logs.reduce((a, l) => a + l.requests, 0) };
  // 봇: 빌드 표본 합치기
  const bot = { child: {}, skilled: {} };
  for (const [k, v] of Object.entries(parts)) if (k.startsWith('bots-')) for (const b of ['child', 'skilled']) Object.assign(bot[b], v[b]);
  const sim = parts.sim; const vr = J('tools/out/verify-report.json');
  const table = LEVELS.map((L, li) => {
    const s = sim && sim.rows[li], bc = bot.child[L.id], bs = bot.skilled[L.id];
    return { id: L.id, verify_child_full_m: vr.m[li], verify_child_seed0_m: vr.per_seed_m[0][li], verify_skilled_m: vr.levels[li].skilled_m, build_sim_same_runs_child_m: bc && bc.sim_m_same_runs, build_sim_same_runs_skilled_m: bs && bs.sim_m_same_runs, sim_child_full_m: s && s.child_full.m, sim_child_seed0_m: s && s.child_seed0.m, build_child_m: bc && bc.m, build_child_n: bc && bc.n, sim_skilled_full_m: s && s.skilled_full.m, build_skilled_m: bs && bs.m, build_skilled_n: bs && bs.n,
      run_mismatch: (bc ? bc.run_mismatch : 0) + (bs ? bs.run_mismatch : 0), steps_mismatch: (bc ? bc.steps_mismatch : 0) + (bs ? bs.steps_mismatch : 0), fill_mismatch: (bc ? bc.fill_vs_indep_mismatch : 0) + (bs ? bs.fill_vs_indep_mismatch : 0), inv_mismatch: (bc ? bc.inv_mismatch : 0) + (bs ? bs.inv_mismatch : 0) };
  });
  const metrics = { project: 'flow-01', round: +ROUND, date: new Date().toISOString().slice(0, 10), core_version: Bm.CORE_VERSION, basic: { console_errors_warnings: all.console.length, qa_tool_induced_warnings: qaInduced.length, qa_tool_induced_note: '검사 도구 유발: paint 의 getImageData willReadFrequently 경고, 오류 화면 검사가 일부러 낸 balance.json 503(콘솔·실패 응답)', failed_responses: all.failed.length, external_requests: all.external.length, requests: all.requests, console_samples: all.console.slice(0, 10), failed_samples: all.failed.slice(0, 10) },
    bots_table: table, bots_total: { build_runs: table.reduce((a, r) => a + (r.build_child_n || 0) + (r.build_skilled_n || 0), 0), drags: Object.values(bot.child).concat(Object.values(bot.skilled)).reduce((a, r) => a + r.drags, 0), run_mismatch: table.reduce((a, r) => a + r.run_mismatch, 0), steps_mismatch: table.reduce((a, r) => a + r.steps_mismatch, 0), fill_mismatch: table.reduce((a, r) => a + r.fill_mismatch, 0), inv_mismatch: table.reduce((a, r) => a + r.inv_mismatch, 0) },
    parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => { const { log, ...rest } = v; return [k, rest]; })) };
  writeFileSync(join(RDIR, 'metrics.json'), JSON.stringify(metrics, null, 1));
  console.log('→', join(RDIR, 'metrics.json'));
  console.log(JSON.stringify({ basic: metrics.basic, bots_total: metrics.bots_total }, null, 1));
  process.exit(0);
}
console.error('알 수 없는 --part ' + PART); process.exit(2);
