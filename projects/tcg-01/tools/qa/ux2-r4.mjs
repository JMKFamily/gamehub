// UX2 r4 확인: 촛불 끄기·켜기 연출이 보이는지(상태·opacity 변화 시간열), 4해상도 대전 한 장씩(촛불·비용 초), tutLayoutCheck 640x360, 실제 승리 → 단계 승수 증가
//   PLAYWRIGHT_CORE=… node projects/tcg-01/tools/qa/ux2-r4.mjs <port> <outdir>
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const [port = '8856', outDir] = process.argv.slice(2);
mkdirSync(join(outDir, 'shots'), { recursive: true });
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE);
const srv = spawn(process.execPath, [join(HERE, 'serve.mjs'), port], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(700);
const b = await pw.chromium.launch({ channel: 'msedge', headless: true });
const ONLY = process.argv[4] === 'candle';
const R = { errors: [], shots: {}, candle_anim: null, layout640: null, tier_win: null };
const fresh = async (w, h, q = '?tut=0') => { const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1000 }); const page = await ctx.newPage(); page.on('pageerror', (e) => R.errors.push(`${w}x${h} ${e.message}`)); page.on('console', (m) => { if (m.type() === 'error') R.errors.push(`${w}x${h} ${m.text()}`); }); await page.goto(`http://127.0.0.1:${port}/games/tcg-01/index.html${q}`); await page.waitForFunction(() => window.__game && window.__game.ready); await page.mouse.click(w / 2, h / 2); await sleep(800); return { ctx, page }; };
const skipCoach = async (page) => { for (let i = 0; i < 8; i++) { const n = await page.$('[data-coach-next]'); if (!n) break; await n.click({ timeout: 2000, force: true }).catch(() => {}); await sleep(150); } };
try {
  // 1. 4해상도 대전 한 장(내 턴, 심지 3 이상) + 촛불 크기

  for (const [w, h] of (ONLY ? [[360, 640]] : [[360, 640], [412, 915], [640, 360], [1280, 720]])) {
    const { ctx, page } = await fresh(w, h);
    await page.evaluate(() => __game.newBattle({ seed: 7, human: 0, noTimer: true })); await sleep(1200); await page.evaluate(() => __game.mulligan([]));
    for (let k = 0; k < 400; k++) { const s = await page.evaluate(() => ({ a: __game.battle.active, busy: __game.busy, mana: __game.battle.players[0].maxMana })); if (s.a === 0 && !s.busy && s.mana >= 3) break; if (s.a === 0 && !s.busy) await page.evaluate(() => __game.endTurn()); await sleep(150); }
    await sleep(1500);
    R.shots[`${w}x${h}`] = await page.evaluate(() => { const c = [...document.querySelectorAll('.cand')]; const sz = c.map((e) => e.getBoundingClientRect()); return { n: c.length, w: Math.round(Math.min(...sz.map((r) => r.width)) * 10) / 10, h: Math.round(Math.min(...sz.map((r) => r.height)) * 10) / 10, states: c.map((e) => e.dataset.st).join(','), costs: [...document.querySelectorAll('[data-hand] .cost, [data-hand] [class*=cost]')].slice(0, 3).map((e) => { const cs = getComputedStyle(e); return { bg: cs.backgroundImage === 'none' ? cs.backgroundColor : 'gradient', color: cs.color }; }) }; });
    await page.screenshot({ path: join(outDir, 'shots', `battle-${w}x${h}.png`) });
    // 2. 촛불 끄기 연출(360만): 카드 하나 내고 40 ms 간격으로 켜진 수·opacity 시간열
    if (w === 360) {
      R.candle_anim = await page.evaluate(async () => {
        const lit = () => document.querySelectorAll('.cand.lit').length;
        const op = () => [...document.querySelectorAll('.cand')].map((e) => +getComputedStyle(e, '::after').opacity).filter((x) => x > 0.02 && x < 0.98).length;
        const L = __game.legal().filter((a) => a.type === 'play' && a.target == null); if (!L.length) return { err: 'no play' };
        const before = lit(); const t0 = performance.now(); __game.act(L[0]); const seq = [];
        for (let i = 0; i < 25; i++) { await new Promise((r) => setTimeout(r, 40)); seq.push([Math.round(performance.now() - t0), lit(), op()]); }
        return { before, after: lit(), seq, mid_transition_frames: seq.filter((x) => x[2] > 0).length };
      });
      await page.screenshot({ path: join(outDir, 'shots', 'battle-after-play-360x640.png') });
      // 켜기: 턴 넘겨 내 턴 시작
      await page.evaluate(() => __game.endTurn()); for (let k = 0; k < 300; k++) { const s = await page.evaluate(() => __game.battle.active); if (s === 0) break; await sleep(100); }
      R.candle_relight = await page.evaluate(async () => { const op = () => [...document.querySelectorAll('.cand')].map((e) => +getComputedStyle(e, '::after').opacity).filter((x) => x > 0.02 && x < 0.98).length; const seq = []; for (let i = 0; i < 25; i++) { seq.push([document.querySelectorAll('.cand.lit').length, op()]); await new Promise((r) => setTimeout(r, 40)); } return seq; });
    }
    await ctx.close();
  }
  // 3. tutLayoutCheck 640x360(튜토리얼 판)
  if (!ONLY) {
    const { ctx, page } = await fresh(640, 360, '');
    await page.locator('[data-nav=play]').last().click({ force: true }); await sleep(900); await skipCoach(page);
    await page.locator('[data-nav=fight-tier]').first().click({ force: true }); await sleep(900); await skipCoach(page);
    await page.locator('[data-nav=fight]').last().click({ force: true }); await sleep(1500); await skipCoach(page);
    await page.evaluate(() => { __game.mulligan([]); window.__hum = __game.export().heroes.indexOf(__game.state.lastHero); });
    const res = []; let last = null;
    for (let k = 0; k < 200 && res.length < 10; k++) {
      const s = await page.evaluate(() => ({ t: document.querySelector('.tut')?.dataset.tut || null, mine: __game.battle.active === window.__hum, busy: __game.busy, over: __game.battle.over }));
      if (s.over) break;
      if (s.t && s.t !== last) { last = s.t; res.push(await page.evaluate(() => { try { const a = __game.tutLayoutCheck(); return { ok: true, bad: Array.isArray(a) ? a.filter((x) => x.panel_ring || x.panel_slots || x.panel_next || x.panel_skip || x.next_skip || x.next_hit === false || x.skip_hit === false).map((x) => x.step) : a }; } catch (e) { return { ok: false, err: e.message }; } })); }
      if (s.t) { const n = await page.$('[data-tut-next]'); if (n) await n.click({ timeout: 2000, force: true }).catch(() => {}); await sleep(200); continue; }
      if (s.mine && !s.busy) await page.evaluate(() => __game.runAI());
      await sleep(150);
    }
    R.layout640 = { checks: res.length, errors: res.filter((x) => !x.ok).map((x) => x.err), bad: [...new Set(res.flatMap((x) => x.bad || []))] };
    await ctx.close();
  }
  // 4. 실제 승리 → 단계 승수: 1단계 판을 이길 때까지(최대 4판)
  if (!ONLY) {
    const { ctx, page } = await fresh(360, 640, '?tut=0');
    const tries = [];
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => __game.go('dock')); await sleep(600);
      await page.locator('[data-nav=play]').last().click({ force: true }); await sleep(900); await skipCoach(page);
      await page.locator('[data-tier="1"]').first().click({ force: true }).catch(() => {}); await sleep(300);
      await page.locator('[data-nav=fight-tier]').first().click({ force: true }); await sleep(900); await skipCoach(page);
      await page.locator('[data-nav=fight]').last().click({ force: true }); await sleep(1500); await skipCoach(page);
      const before = await page.evaluate(() => JSON.stringify(__game.state.stats.tierWins || {}));
      await page.evaluate(() => { __game.mulligan([]); __game.autoplay(true); __game.setAnimScale(0.1); });
      await page.waitForFunction(() => !!document.getElementById('result'), null, { timeout: 300000 }).catch(() => {});
      const r = await page.evaluate((before) => ({ before: JSON.parse(before), after: __game.state.stats.tierWins || {}, win: __game.battle.winner === __game.export().heroes.indexOf(__game.state.lastHero), ai: __game.export().ai }), before);
      tries.push(r);
      await page.evaluate(() => document.getElementById('result')?.remove());
      if (r.win) break;
    }
    R.tier_win = tries;
    await ctx.close();
  }
} finally { await b.close(); srv.kill(); }
writeFileSync(join(outDir, ONLY ? 'ux2-r4-candle.json' : 'ux2-r4.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R).slice(0, 4000));
