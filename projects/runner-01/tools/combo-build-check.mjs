#!/usr/bin/env node
// 빌드 콤보·판정 % = 기준 구현(combo-ref) 확인 (game-developer, round-2 콤보 빌드)
//
//   PLAYWRIGHT_CORE=<playwright-core 폴더> node projects/runner-01/tools/combo-build-check.mjs [시도 수/레벨·프로필=40] [--channel msedge] [--port 8137]
//
// S1 games/reverbound/js/combo.js 본문 = tools/sim/combo-ref.mjs 본문 (머리 주석 뒤 바이트 단위)
// B1 같은 입력열(봇 σ70·σ25, 시드 고정)을 node(physics.js step + combo-ref, combo-check와 같은 실행기)와
//    빌드(?test=1, window.__game.replay)에 넣어 시도마다 클리어 여부·grades(i, k, e_ms, grade, pct)·combo·accuracy가 같음
//    (탭 사이가 누름 길이 24틱보다 짧으면 뒤 탭을 뺌: 빌드 입력은 누른 채 또 누르면 새 누름이 아니라서. 두 쪽에 같은 입력열을 넣음)
// B2 완벽 입력열(검증기 taps)로 10레벨 클리어 → grades 길이 = judge_taps 길이, 모두 1등급, accuracy = combo-ref
// U1 화면: 콤보 meter aria-valuenow = combo(숨길 때 hidden만), 큰 숫자 블록(캔버스)이 보이고 HUD 버튼과 겹치지 않음, 판정 글이 그려짐,
//    결과 화면 정확도 = accuracy, 레벨 카드 최고 콤보 칩이 버튼 밖(접근성 트리). (round-3: 점 줄 DOM → 캔버스 큰 숫자 + 낭독용 meter)
// U2 combo.enabled=false / judge_pct.enabled=false (balance.json 요청 가로채기): 생사·등급·콤보 같음, 끈 층 표시·%·정확도 없음
// 결과: reviews/dev-selfcheck/combo-build.json, 스크린샷 r2c-*.png
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { compileLevel, step, startState } from '../../../games/reverbound/js/physics.js';
import { createComboJudge } from './sim/combo-ref.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const DATA = join(ROOT, 'games/reverbound/data');
const OUT = join(ROOT, 'projects/runner-01/reviews/dev-selfcheck');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const N = +(args.find((a) => /^\d+$/.test(a)) ?? 40);
const PORT = +opt('--port', 8137);
const channel = opt('--channel', 'msedge');
const read = (p) => JSON.parse(readFileSync(join(DATA, p), 'utf8'));
const bal = read('balance.json'), inputs = read('test-inputs.json');
const hz = bal.physics_hz, HOLD = 24;
const problems = [];
const R = { n_per: N, s1: null, b1: {}, b2: [], ui: {}, console: [], external: [] };

// S1
{
  const body = (s) => { s = s.replace(/\r\n/g, '\n'); return s.slice(s.indexOf('// 틱 기준 Δ(ms)')); };
  const a = body(readFileSync(join(ROOT, 'games/reverbound/js/combo.js'), 'utf8'));
  const b = body(readFileSync(join(HERE, 'sim/combo-ref.mjs'), 'utf8'));
  R.s1 = a === b;
  if (!R.s1) problems.push('S1 combo.js 본문 ≠ combo-ref.mjs 본문');
}

// 봇 입력열 (시드 고정): 박자 입력열 + 정규 오차 σ, 놓침, 헛탭(0.15~0.45 s 뒤)
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const PROF = { child_sd70: { sd: 70, miss: 0.03, extra: 0.02 }, skilled_sd25: { sd: 25, miss: 0, extra: 0 } };
function botTaps(base, p, rnd) {
  const out = [];
  for (const k of base) {
    if (rnd() < p.miss) continue;
    const g = Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
    out.push(Math.max(0, Math.round(k + (g * p.sd * hz) / 1000)));
    if (rnd() < p.extra) out.push(Math.round(k + (0.15 + 0.3 * rnd()) * hz));
  }
  out.sort((a, b) => a - b);
  const kept = [];
  for (const k of out) if (!kept.length || k >= kept[kept.length - 1] + HOLD) kept.push(k);
  return kept;
}
// node 기준 실행 (combo-check.mjs run()과 같은 규칙: 누름 HOLD틱, 새 누름마다 번호, 사망 틱 판정 없음)
function refRun(L, taps, judgeTaps) {
  const J = createComboJudge(judgeTaps, bal.combo, hz);
  const starts = new Set(taps);
  let s = startState(L), j = 0, until = -1, press = null, nextId = 0;
  J.reset(0);
  for (let k = 0; k < L.nTicks; k++) {
    while (j < taps.length && taps[j] <= k) { until = Math.max(until, taps[j] + HOLD); j++; }
    const down = k < until, edge = starts.has(k);
    if (edge) press = nextId++; else if (!down) press = null;
    const r = step(L, s, k, down, edge);
    if (r.dead) { J.onDeath(); return { clear: false, grades: J.grades, combo: 0, accuracy: null }; }
    J.onStep(k, r.ev, down ? press : null);
    if (r.clear) { J.onClear(); return { clear: true, grades: J.grades, combo: J.combo, accuracy: J.accuracy }; }
    s = r.s;
  }
  J.onClear();
  return { clear: true, grades: J.grades, combo: J.combo, accuracy: J.accuracy };
}

const levels = bal.levels.map((f) => read(f));
const cases = [];
levels.forEach((lvl, li) => {
  const L = compileLevel(lvl, bal);
  const base = inputs.levels[lvl.id].on_beat_taps;
  for (const [pn, p] of Object.entries(PROF)) {
    const rnd = mulberry(1000 * (li + 1) + (pn === 'child_sd70' ? 1 : 2));
    for (let a = 0; a < N; a++) { const taps = botTaps(base, p, rnd); cases.push({ li, pn, taps, ref: refRun(L, taps, lvl.judge_taps) }); }
  }
  const perfect = inputs.levels[lvl.id].taps;
  cases.push({ li, pn: 'perfect', taps: perfect, ref: refRun(L, [...perfect].sort((a, b) => a - b), lvl.judge_taps) });
});

// 서버 (runner-01 포트 대역, 이 도구가 띄운 PID만 종료)
const srv = spawn(process.execPath, [join(HERE, 'serve.mjs'), String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
let pw;
try { pw = await import(process.env.PLAYWRIGHT_CORE ? pathToFileURL(join(process.env.PLAYWRIGHT_CORE, 'index.mjs')).href : 'playwright-core'); }
catch (e) { srv.kill(); throw e; }
const chromium = pw.chromium ?? pw.default.chromium;
const browser = await chromium.launch({ channel, headless: true });
const BASE = `http://localhost:${PORT}/games/reverbound/`;
mkdirSync(OUT, { recursive: true });
async function open(vw, vh, q = '?test=1') {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh } });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) R.console.push(`[${vw}x${vh}] ${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => R.console.push(`[${vw}x${vh}] pageerror: ${e.message}`));
  p.on('request', (r) => { const u = new URL(r.url()); if (!['localhost', '127.0.0.1'].includes(u.hostname) && !['data:', 'blob:'].includes(u.protocol)) R.external.push(r.url()); });
  await p.goto(BASE + q);
  await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 20000 });
  return { ctx, p };
}
try {
  // B1·B2
  const { ctx, p } = await open(1280, 720);
  const strip = (g) => ({ i: g.i, k: g.k, e_ms: g.e_ms, grade: g.grade, pct: g.pct });
  const res = await p.evaluate((cs) => cs.map((c) => {
    const G = window.__game;
    const r = G.replay(c.li, c.taps, { holdTicks: 24, frameDt: 1 / 60 });
    return { clear: r.state === 'clear', grades: G.grades, combo: G.combo, accuracy: G.accuracy };
  }), cases.map((c) => ({ li: c.li, taps: c.taps })));
  let diff = 0;
  cases.forEach((c, j) => {
    const b = res[j], r = c.ref;
    const key = `${levels[c.li].id}/${c.pn}`;
    const st = (R.b1[key] ??= { n: 0, clear: 0, judged: 0, mismatch: 0 });
    st.n++; if (r.clear) st.clear++; st.judged += r.grades.length;
    const same = b.clear === r.clear && b.combo === r.combo && b.accuracy === r.accuracy && JSON.stringify(b.grades.map(strip)) === JSON.stringify(r.grades.map(strip));
    if (!same) { st.mismatch++; diff++; if (diff <= 5) problems.push(`B1 ${key} 시도 ${j}: 빌드 ${JSON.stringify({ clear: b.clear, combo: b.combo, acc: b.accuracy, n: b.grades.length })} ≠ 기준 ${JSON.stringify({ clear: r.clear, combo: r.combo, acc: r.accuracy, n: r.grades.length })}`); }
    if (c.pn === 'perfect') {
      const lv = levels[c.li];
      const ok = b.clear && b.grades.length === lv.judge_taps.length && b.grades.every((g) => g.grade === 1) && same;
      R.b2.push({ id: lv.id, clear: b.clear, grades: b.grades.length, taps: lv.judge_taps.length, accuracy: b.accuracy, ok });
      if (!ok) problems.push(`B2 ${lv.id} 완벽 입력 판정 ${b.grades.length}/${lv.judge_taps.length}`);
    }
  });
  R.b1_total = { cases: cases.length, mismatch: diff, judged: cases.reduce((a, c) => a + c.ref.grades.length, 0) };
  await ctx.close();

  // U1 화면
  for (const [vw, vh] of [[1280, 720], [640, 360], [360, 640]]) {
    const { ctx: c2, p: q } = await open(vw, vh);
    const tag = `${vw}x${vh}`;
    // 레벨 2 중간까지 완벽 입력 → 콤보 줄
    const u = await q.evaluate(async () => {
      const G = window.__game;
      G.seek(1, 120);
      const hz = 240, out = {};
      // 다음 판정까지 진행 후 1프레임: 판정 글이 그려지는지
      const n0 = G.grades.length;
      let guard = 0; while (G.grades.length === n0 && guard++ < 2000) G.step(1 / hz);
      G.step(1 / 60);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const el = document.getElementById('combo');
      out.combo = G.combo; out.aria = +el.getAttribute('aria-valuenow'); out.visible = !el.hidden && G.comboFx.visible; out.ariaHiddenLabel = el.hasAttribute('aria-hidden');
      out.judge = G.judgeShown; out.lastPct = G.lastPct;
      const fr = G.comboFx.rect, r = fr ? { left: fr.l, right: fr.r, top: fr.t, bottom: fr.b, width: fr.r - fr.l, height: fr.b - fr.t } : { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }, cue = document.getElementById('cue').getBoundingClientRect(), pb = document.getElementById('pauseBtn').getBoundingClientRect(), att = document.getElementById('att').getBoundingClientRect();
      const hit = (a, b) => a.width && b.width && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      out.comboRect = [r.left, r.top, r.width, r.height].map(Math.round);
      out.overlapPause = hit(r, pb); out.overlapAtt = hit(r, att); out.cueTop = Math.round(parseFloat(document.getElementById('cue').style.top) || cue.top); out.comboBottom = Math.round(r.bottom);
      return out;
    });
    await q.screenshot({ path: join(OUT, `r2c-${tag}-play-L2.png`) });
    if (!(u.visible && u.aria === u.combo && !u.ariaHiddenLabel && (u.judge?.drawn || u.judge?.skip))) problems.push(`U1 ${tag} 콤보 표시 ${JSON.stringify(u)}`);
    if (u.overlapPause || u.overlapAtt) problems.push(`U1 ${tag} 큰 콤보 숫자 블록이 HUD 버튼과 겹침`);
    // 결과 화면
    const cl = await q.evaluate(() => {
      const G = window.__game;
      G.replay(0);
      for (let j = 0; j < 90; j++) G.step(1 / 60);
      const st = document.getElementById('clearStats'), acc = document.getElementById('stAcc');
      const sc = document.getElementById('clearS');
      return { state: G.state, accuracy: G.accuracy, shown: !st.classList.contains('hidden'), accText: acc.querySelector('.v').textContent, accAria: acc.getAttribute('aria-valuenow'),
        overflow: sc.scrollHeight > sc.clientHeight + 1, bottom: Math.max(...[...sc.querySelectorAll('button')].map((b) => b.getBoundingClientRect().bottom)), vh: innerHeight };
    });
    await q.screenshot({ path: join(OUT, `r2c-${tag}-clear-L1.png`) });
    if (!(cl.shown && +cl.accAria === cl.accuracy && cl.bottom <= cl.vh)) problems.push(`U1 ${tag} 결과 화면 ${JSON.stringify(cl)}`);
    // 레벨 선택: 최고 콤보 표지(버튼 밖, 접근성 트리)
    await q.evaluate(() => window.__game.show('levels'));
    await q.waitForTimeout(150);
    // playwright-core 1.48: ariaSnapshot 없음 → accessibility.snapshot (Chromium 접근성 트리)
    const flat = []; const walk = (n) => { if (!n) return; flat.push(`${n.role} "${n.name ?? ''}"${n.valuetext != null ? ' = ' + n.valuetext : n.value != null ? ' = ' + n.value : ''}`); (n.children || []).forEach(walk); };
    // (interestingOnly true 는 Chromium meter를 걸러 내서 false로 보고 role meter만 셈)
    // (round-3) playwright-core 1.5x 이상은 page.accessibility가 없어 locator.ariaSnapshot (접근성 트리)
    let snap;
    if (q.accessibility) { walk(await q.accessibility.snapshot({ root: await q.$('#cards'), interestingOnly: false }).catch(() => null)); snap = flat.join('\n'); }
    else snap = await q.locator('#cards').ariaSnapshot().catch(() => '');
    const inBtn = await q.evaluate(() => document.querySelectorAll('.card .bcMark').length);
    await q.screenshot({ path: join(OUT, `r2c-${tag}-levels.png`) });
    R.ui[tag] = { play: u, clear: cl, bcMarkInsideButton: inBtn, aria: String(snap).split('\n').filter((l) => /meter/.test(l)).slice(0, 4) };
    if (inBtn) problems.push(`U1 ${tag} 최고 콤보 표지가 버튼 안에 있음`);
    if (!/meter/.test(String(snap))) problems.push(`U1 ${tag} 접근성 트리에 최고 콤보 meter 없음`);
    await c2.close();
  }
  // U2 끄기: balance.json의 combo.enabled / judge_pct.enabled를 false로 바꿔 내려보냄(요청 가로채기, 파일은 그대로).
  //    생사·등급·콤보 수는 같고, 끈 층의 표시·%·정확도만 없어야 함 (20-balance 15-5·15-10-7)
  R.u2 = {};
  for (const mode of ['combo_off', 'pct_off']) {
    const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx3.route('**/data/balance.json', async (route) => {
      const r = await route.fetch(); const j = await r.json();
      if (mode === 'combo_off') j.combo.enabled = false; else j.combo.judge_pct.enabled = false;
      await route.fulfill({ response: r, json: j });
    });
    const q = await ctx3.newPage();
    q.on('pageerror', (e) => R.console.push(`[${mode}] pageerror: ${e.message}`));
    await q.goto(BASE + '?test=1');
    await q.waitForFunction(() => window.__game?.ready === true, null, { timeout: 20000 });
    const sample = cases.filter((c) => c.pn !== 'perfect' && c.li % 3 === 0).slice(0, 40);
    const out = await q.evaluate(async (cs) => {
      const G = window.__game, res = [];
      for (const c of cs) { const r = G.replay(c.li, c.taps, { holdTicks: 24 }); res.push({ clear: r.state === 'clear', grades: G.grades.map((g) => [g.i, g.k, g.grade, g.pct ?? null]), combo: G.combo, accuracy: G.accuracy }); }
      G.seek(1, 120); G.step(1 / 60);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const comboShown = !document.getElementById('combo').hidden || G.comboFx.visible;
      const judge = G.judgeShown;
      G.replay(0); for (let j = 0; j < 90; j++) G.step(1 / 60);
      return { res, comboShown, judgeDrawn: !!judge?.drawn, stats: !document.getElementById('clearStats').classList.contains('hidden'), accShown: !document.getElementById('stAcc').classList.contains('hidden') };
    }, sample.map((c) => ({ li: c.li, taps: c.taps })));
    let bad = 0;
    out.res.forEach((b, j) => {
      const r = sample[j].ref;
      const sameLife = b.clear === r.clear && b.combo === r.combo && JSON.stringify(b.grades.map((g) => g.slice(0, 3))) === JSON.stringify(r.grades.map((g) => [g.i, g.k, g.grade]));
      const layerOk = mode === 'combo_off' ? b.accuracy === r.accuracy : b.accuracy === null && b.grades.every((g) => g[3] === null);
      if (!sameLife || !layerOk) bad++;
    });
    const uiOk = mode === 'combo_off' ? !out.comboShown && !out.judgeDrawn && !out.stats : out.comboShown && !out.judgeDrawn && out.stats && !out.accShown;
    R.u2[mode] = { n: sample.length, mismatch: bad, comboShown: out.comboShown, judgeDrawn: out.judgeDrawn, stats: out.stats, accShown: out.accShown, uiOk };
    if (bad || !uiOk) problems.push(`U2 ${mode}: ${JSON.stringify(R.u2[mode])}`);
    await ctx3.close();
  }
} finally {
  await browser.close();
  srv.kill();
}
if (R.console.length) problems.push(`콘솔 에러·경고 ${R.console.length}`);
if (R.external.length) problems.push(`외부 요청 ${R.external.length}`);
R.problems = problems;
writeFileSync(join(OUT, 'combo-build.json'), JSON.stringify(R, null, 1) + '\n');
console.log(`S1 본문 같음: ${R.s1}`);
console.log(`B1 ${R.b1_total.cases}시도 (판정 ${R.b1_total.judged}개): 빌드 ≠ 기준 ${R.b1_total.mismatch}`);
for (const [k, v] of Object.entries(R.b1)) if (!k.endsWith('perfect')) console.log(`   ${k}: 클리어 ${v.clear}/${v.n}, 판정 ${v.judged}, 불일치 ${v.mismatch}`);
console.log(`B2 완벽 입력: ${R.b2.map((b) => `${b.id} ${b.grades}/${b.taps} 정확도 ${b.accuracy}`).join(' | ')}`);
for (const [k, v] of Object.entries(R.ui)) console.log(`U1 ${k}: 콤보 ${v.play.combo} (aria ${v.play.aria}), 판정 글 ${JSON.stringify(v.play.judge)}, 블록 ${JSON.stringify(v.play.comboRect)}, 결과 정확도 ${v.clear.accText} (훅 ${v.clear.accuracy}), meter ${v.aria.length}줄`);
for (const [k, v] of Object.entries(R.u2 ?? {})) console.log(`U2 ${k}: ${v.n}시도 생사·등급·콤보 불일치 ${v.mismatch}, 콤보 줄 ${v.comboShown}, 판정 글 ${v.judgeDrawn}, 결과 줄 ${v.stats}, 정확도 ${v.accShown}`);
console.log(`콘솔 ${R.console.length}, 외부 요청 ${R.external.length}`);
for (const p of problems) console.log('  문제: ' + p);
console.log(problems.length ? `결과: FAIL (${problems.length})` : '결과: ALL OK');
process.exit(problems.length ? 1 : 0);
