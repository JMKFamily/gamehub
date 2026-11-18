// 첫 연습 판에서 튜토리얼 안내가 떠 있는 동안 턴 타이머(50 s)가 멈추는지: 내 턴에 안내를 열어 둔 채 60 s → 턴이 그대로면 멈춤.
// 그다음 안내를 닫고(다음/행동) 아무것도 안 하면 50 s 안팎에 자동 턴 종료가 되는지(타이머가 다시 도는지)도 확인.
//   PLAYWRIGHT_CORE=… node projects/tcg-01/tools/qa/tut-timer-check.mjs <port> [w] [h]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const [port = '8849', w = '360', h = '640'] = process.argv.slice(2);
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE);
const srv = spawn(process.execPath, [join(HERE, 'serve.mjs'), port], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(700);
const b = await pw.chromium.launch({ channel: 'msedge', headless: true });
const out = { view: `${w}x${h}` };
try {
  const page = await (await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: true })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/games/tcg-01/index.html`); await page.waitForFunction(() => window.__game && window.__game.ready);
  out.timer_setting = await page.evaluate(() => __game.state.settings.timer);
  await page.mouse.click(+w / 2, +h / 2); await sleep(300);
  await page.locator('[data-nav=play]').last().click(); await sleep(500);
  for (let i = 0; i < 6; i++) { const n = await page.$('[data-coach-next]'); if (!n) break; await n.click(); await sleep(150); }
  await page.locator('[data-nav=fight]').last().click(); await sleep(1300);
  for (let i = 0; i < 6; i++) { const n = await page.$('[data-coach-next]'); if (!n) break; await n.click(); await sleep(150); }
  await page.evaluate(() => { __game.mulligan([]); window.__hum = __game.export().heroes.indexOf(__game.state.lastHero); });
  // 내 턴 + 안내가 뜰 때까지(상대 선공이면 기다림)
  await page.waitForFunction(() => __game.battle.active === window.__hum && !__game.busy && !!document.querySelector('.tut'), null, { timeout: 90000 });
  const s0 = await page.evaluate(() => ({ half: __game.battle.half, tut: document.querySelector('.tut')?.dataset.tut, n: __game.export().actions.length }));
  out.panel_step = s0.tut;
  await sleep(60000); // 안내를 열어 둔 채 60 s(턴 시간 50 s보다 김)
  const s1 = await page.evaluate(() => ({ half: __game.battle.half, tut: document.querySelector('.tut')?.dataset.tut || null, burnOpacity: getComputedStyle(document.querySelector('.timer .burn') || document.body).opacity }));
  out.with_panel_60s = { half_before: s0.half, half_after: s1.half, turn_kept: s0.half === s1.half, panel_still: s1.tut };
  // 안내를 닫고(남은 안내도 모두 닫음) 70 s 동안 아무것도 안 함 → 자동 턴 종료가 나야 타이머가 다시 돈 것
  const t0 = Date.now(); let ended = null;
  while (Date.now() - t0 < 75000) {
    const st = await page.evaluate(() => ({ half: __game.battle.half, tut: !!document.querySelector('.tut') }));
    if (st.half !== s1.half) { ended = (Date.now() - t0) / 1000; break; }
    if (st.tut) { const nx = await page.$('[data-tut-next]'); if (nx) await nx.click().catch(() => {}); else await page.mouse.click(+w / 2, 12); }
    await sleep(500);
  }
  out.after_close = { auto_end_after_s: ended, ok: ended != null && ended <= 60 };
  out.errors = errs;
} finally { await b.close(); srv.kill(); }
console.log(JSON.stringify(out));
