// 튜토리얼 첫 안내에서 "다음"·"건너뛰기" 가운데 점의 맨 위 요소가 무엇인지(가려짐 원인)
//   PLAYWRIGHT_CORE=… node projects/tcg-01/tools/qa/tut-top-probe.mjs <port> <w> <h>
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const [port = '8850', w = '360', h = '640'] = process.argv.slice(2);
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE);
const srv = spawn(process.execPath, [join(HERE, 'serve.mjs'), port], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(700);
const b = await pw.chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await (await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: true })).newPage();
  await page.goto(`http://127.0.0.1:${port}/games/tcg-01/index.html`); await page.waitForFunction(() => window.__game && window.__game.ready);
  await page.mouse.click(+w / 2, +h / 2); await sleep(300);
  await page.locator('[data-nav=play]').last().click(); await sleep(500);
  for (let i = 0; i < 6; i++) { const n = await page.$('[data-coach-next]'); if (!n) break; await n.click(); await sleep(150); }
  await page.locator('[data-nav=fight]').last().click(); await sleep(1300);
  for (let i = 0; i < 6; i++) { const n = await page.$('[data-coach-next]'); if (!n) break; await n.click(); await sleep(150); }
  await page.evaluate(() => { __game.mulligan([]); });
  await page.waitForSelector('.tut', { timeout: 90000 }); await sleep(600);
  const r = await page.evaluate(() => { const d = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); const pts = [[0.5, 0.5], [0.2, 0.5], [0.8, 0.5]].map(([fx, fy]) => { const t = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy); return t ? `${t.tagName.toLowerCase()}.${(t.className && t.className.baseVal !== undefined ? t.className.baseVal : t.className) || ''}${t === e || e.contains(t) ? '(self)' : ''}` : null; }); return { rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], z: getComputedStyle(e).zIndex, top: pts }; }; return { step: document.querySelector('.tut').dataset.tut, next: d('[data-tut-next]'), skip: d('[data-tut-skip]') }; });
  console.log(JSON.stringify(r));
  await page.screenshot({ path: join(HERE, '..', '..', 'reviews', 'terms', 'r3', `tut-top-${w}x${h}.png`) });
  // 실제로 눌러 보기: 다음 가운데 탭 → 단계가 바뀌는지
  if (process.argv[5] === 'skip') { const sb = r.skip && r.skip.rect; await page.mouse.click(sb[0] + sb[2] / 2, sb[1] + sb[3] / 2); await sleep(500); console.log(JSON.stringify({ after_tap_skip: await page.evaluate(() => ({ tut: document.querySelector('.tut')?.dataset.tut || null, skipped: __game.state.tut.skipped })) })); return; }
  const nb = r.next && r.next.rect; if (nb) { await page.mouse.click(nb[0] + nb[2] / 2, nb[1] + nb[3] / 2); await sleep(500); console.log(JSON.stringify({ after_tap_next: await page.evaluate(() => ({ tut: document.querySelector('.tut')?.dataset.tut || null, skipped: __game.state.tut.skipped })) })); }
} finally { await b.close(); srv.kill(); }
