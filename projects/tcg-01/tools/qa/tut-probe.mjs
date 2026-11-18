// 튜토리얼 첫 판 멈춤 재현 탐침: 새 저장소 → 메뉴 경로 → 연습 판, 사람 자리는 runAI·안내는 '다음'. 30 s마다 상태 기록, 판이 안 끝나면 마지막 상태 출력
//   PLAYWRIGHT_CORE=… node projects/tcg-01/tools/qa/tut-probe.mjs <port> <w> <h> [minutes]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const [port = '8856', w = '360', h = '640', mins = '10'] = process.argv.slice(2);
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE);
const srv = spawn(process.execPath, [join(HERE, 'serve.mjs'), port], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(700);
const b = await pw.chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await (await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: true })).newPage();
  const errs = []; page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.text()); }); page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await page.goto(`http://127.0.0.1:${port}/games/tcg-01/index.html`); await page.waitForFunction(() => window.__game && window.__game.ready);
  await page.mouse.click(+w / 2, +h / 2); await sleep(300);
  await page.locator('[data-nav=play]').last().click(); await sleep(500);
  for (let i = 0; i < 6; i++) { const n = await page.$('[data-coach-next]'); if (!n) break; await n.click(); await sleep(200); }
  await page.locator('[data-nav=fight]').last().click(); await sleep(1300);
  for (let i = 0; i < 6; i++) { const n = await page.$('[data-coach-next]'); if (!n) break; await n.click(); await sleep(200); }
  await page.evaluate(() => { __game.mulligan([]); __game.setAnimScale(0.35); });
  const t0 = Date.now(); let last = '', lastHalfAt = Date.now(), lastHalf = -1; const log = [];
  while (Date.now() - t0 < +mins * 60000) {
    const st = await page.evaluate(() => { const bt = __game.battle; return { half: bt.half, active: bt.active, over: bt.over, busy: __game.busy, queued: __game.queued, pending: bt.pending, tut: document.querySelector('.tut')?.dataset.tut || null, result: !!document.getElementById('result'), legal: __game.legal().length, paused: __game.paused, spread: !!document.querySelector('.spread'), discover: !!document.querySelector('.ovl') }; });
    if (st.result || st.over) { log.push({ t: (Date.now() - t0) / 1000, ...st }); break; }
    if (st.half !== lastHalf) { lastHalf = st.half; lastHalfAt = Date.now(); }
    const key = JSON.stringify(st); if (key !== last) { last = key; }
    if (Date.now() - lastHalfAt > 60000) { log.push({ stuck_s: (Date.now() - lastHalfAt) / 1000, ...st, tutText: await page.evaluate(() => document.querySelector('.tut')?.textContent || null) }); await page.screenshot({ path: join(HERE, '..', '..', 'reviews', 'terms', 'shots', `stuck-${w}x${h}.png`) }); break; }
    if (st.tut) { const n = await page.$('[data-tut-next]'); if (n && !/^tut_(play|attack|ability|end)/.test(st.tut)) await n.click().catch(() => {}); }
    if (st.active === 0 && !st.busy) await page.evaluate(() => __game.runAI());
    await sleep(150);
  }
  console.log(JSON.stringify({ log, errs: errs.slice(0, 5), mins: (Date.now() - t0) / 60000 }));
} finally { await b.close(); srv.kill(); }
