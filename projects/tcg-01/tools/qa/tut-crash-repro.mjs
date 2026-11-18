// 튜토리얼 판에서 "Cannot read properties of undefined (reading 'cid')" 재현(qa terms 이슈): 실제 손패 끌기로 "낼 수 있는 카드 중 가장 오른쪽"을 먼저 낸다.
// battle.update()가 tutStep()(낡은 this.legal로 playEl)을 renderHints()보다 먼저 불러, 손패가 줄어든 뒤 P.hand[x.hand]가 undefined가 되면 예외 → main.js frame()의 requestAnimationFrame이 다시 걸리지 않아 판 전체가 멈춘다.
//   PLAYWRIGHT_CORE=… node projects/tcg-01/tools/qa/tut-crash-repro.mjs <port> [tries]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const [port = '8858', tries = '6'] = process.argv.slice(2);
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE);
const srv = spawn(process.execPath, [join(HERE, 'serve.mjs'), port], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(700);
const b = await pw.chromium.launch({ channel: 'msedge', headless: true });
const results = [];
try {
  for (let t = 0; t < +tries; t++) {
    const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true }); const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' | ')));
    await page.goto(`http://127.0.0.1:${port}/games/tcg-01/index.html`); await page.waitForFunction(() => window.__game && window.__game.ready);
    await page.mouse.click(180, 320); await sleep(300);
    await page.locator('[data-nav=play]').last().click(); await sleep(500);
    for (let i = 0; i < 6; i++) { const n = await page.$('[data-coach-next]'); if (!n) break; await n.click(); await sleep(150); }
    await page.locator('[data-nav=fight]').last().click(); await sleep(1300);
    for (let i = 0; i < 6; i++) { const n = await page.$('[data-coach-next]'); if (!n) break; await n.click(); await sleep(150); }
    await page.evaluate(() => { __game.mulligan([]); __game.setAnimScale(0.5); });
    let frozen = false, plays = 0;
    for (let k = 0; k < 400 && !errs.length; k++) {
      const st = await page.evaluate(() => { const bt = __game.battle; return { over: bt.over, a: bt.active, busy: __game.busy, half: bt.half, L: __game.legal().filter((x) => x.type === 'play' && x.target == null).map((x) => x.hand) }; });
      if (st.over) break;
      if (st.a === 0 && !st.busy) {
        if (st.L.length) { const hi = Math.max(...st.L); const pt = await page.evaluate((hi) => { const els = [...document.querySelectorAll('[data-hand]')].map((e) => e.getBoundingClientRect()).sort((a, c) => a.left - c.left); const r = els[hi]; return r && { x: r.left + r.width / 2, y: r.top + 25 }; }, hi); if (pt) { await page.mouse.move(pt.x, pt.y); await page.mouse.down(); for (let s = 1; s <= 6; s++) { await page.mouse.move(pt.x, pt.y - 40 * s); await sleep(20); } await page.mouse.up(); plays++; } }
        else await page.evaluate(() => __game.runAI());
      }
      const n = await page.$('[data-tut-next]'); if (n) await n.click().catch(() => {});
      await sleep(150);
    }
    if (errs.length) { const gnow = () => page.evaluate(async () => (await import(new URL('js/anim.js', location.href).href)).G.now); const a = await gnow(); await sleep(2000); const c = await gnow(); frozen = Math.abs(c - a) < 1; await page.screenshot({ path: join(HERE, '..', '..', 'reviews', 'terms', 'shots', 'tut-crash-frozen-360x640.png') }); }
    results.push({ try: t, errs, plays, frozen_after_error: frozen });
    console.log(JSON.stringify(results[results.length - 1]));
    await ctx.close();
    if (errs.length) break;
  }
} finally { await b.close(); srv.kill(); }
