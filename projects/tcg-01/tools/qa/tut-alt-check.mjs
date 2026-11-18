// 튜토리얼 패널이 보조 자리(alt)로 옮겨질 때 "다음" 버튼이 화면 안에 보이는지·패널이 손패를 덮는지 확인
//   PLAYWRIGHT_CORE=… node projects/tcg-01/tools/qa/tut-alt-check.mjs <port> <w> <h>
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const [port = '8847', w = '1280', h = '720'] = process.argv.slice(2);
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE);
const srv = spawn(process.execPath, [join(HERE, 'serve.mjs'), port], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(700);
const b = await pw.chromium.launch({ channel: 'msedge', headless: true });
const rows = [];
try {
  const page = await (await b.newContext({ viewport: { width: +w, height: +h } })).newPage();
  await page.goto(`http://127.0.0.1:${port}/games/tcg-01/index.html`); await page.waitForFunction(() => window.__game && window.__game.ready);
  await page.mouse.click(+w / 2, +h / 2); await sleep(300);
  await page.locator('[data-nav=play]').last().click({ force: true }); await sleep(500);
  for (let i = 0; i < 6; i++) { const n = await page.$('[data-coach-next]'); if (!n) break; await n.click(); await sleep(150); }
  await page.locator('[data-nav=fight]').last().click({ force: true }); await sleep(1300);
  for (let i = 0; i < 6; i++) { const n = await page.$('[data-coach-next]'); if (!n) break; await n.click(); await sleep(150); }
  await page.evaluate(() => { __game.mulligan([]); __game.setAnimScale(0.4); window.__hum = __game.export().heroes.indexOf(__game.state.lastHero); });
  let last = null;
  for (let k = 0; k < 900; k++) {
    const st = await page.evaluate(() => { const bt = __game.battle; if (!bt || bt.over) return { over: true }; const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), vis: r.width > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight }; }; const t = document.querySelector('.tut'); const hand = [...document.querySelectorAll('[data-hand]')].map((e) => e.getBoundingClientRect()); const p = t && t.getBoundingClientRect(); const handCovered = p ? hand.filter((r) => Math.min(r.right, p.right) - Math.max(r.left, p.left) > 4 && Math.min(r.bottom, p.bottom) - Math.max(r.top, p.top) > 4).length : 0; const topIs = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!hit && (hit === e || e.contains(hit)); }; return { nextTop: topIs('[data-tut-next]'), skipTop: topIs('[data-tut-skip]'), tut: t ? t.dataset.tut : null, panel: R(t), next: R(document.querySelector('[data-tut-next]')), skip: R(document.querySelector('[data-tut-skip]')), handCovered, handN: hand.length, mine: bt.active === window.__hum, busy: __game.busy }; });
    if (st.over) break;
    if (st.tut && st.tut !== last) { last = st.tut; rows.push({ nextTop: st.nextTop, skipTop: st.skipTop, step: st.tut, panel: st.panel, next: st.next, skip: st.skip, handCovered: `${st.handCovered}/${st.handN}` }); if (!(st.next && st.next.vis)) await page.screenshot({ path: join(HERE, '..', '..', 'reviews', 'terms', 'r2', `tut-nonext-${w}x${h}-${st.tut}.png`) }); }
    if (st.tut) { const n = await page.$('[data-tut-next]'); const vis = st.next && st.next.vis; if (vis) await n.click().catch(() => {}); else await page.mouse.click(+w / 2, 20); await sleep(150); }
    if (st.mine && !st.busy) await page.evaluate(() => __game.runAI());
    await sleep(120);
    if (rows.length >= 14) break;
  }
  console.log(JSON.stringify(rows.map((r) => ({ nextTop: r.nextTop, skipTop: r.skipTop, step: r.step, next_vis: !!(r.next && r.next.vis), next: r.next && [r.next.x, r.next.y, r.next.w, r.next.h], panel: r.panel && [r.panel.x, r.panel.y, r.panel.w, r.panel.h], hand: r.handCovered }))));
} finally { await b.close(); srv.kill(); }
