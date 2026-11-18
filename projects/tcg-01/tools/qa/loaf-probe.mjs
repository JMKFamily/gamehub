// 6배 스로틀 대전 중 긴 프레임 원인 보기: long-animation-frame(스크립트 출처·함수·시간) + 렌더(스타일·레이아웃) 시간 상위
//   PLAYWRIGHT_CORE=… node projects/tcg-01/tools/qa/loaf-probe.mjs <port> [seconds] [query]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const [port = '8846', secs = '60', q = '?tut=0'] = process.argv.slice(2);
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE);
const srv = spawn(process.execPath, [join(HERE, 'serve.mjs'), port], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(700);
const b = await pw.chromium.launch({ channel: 'msedge', headless: true });
try {
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true }); const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/games/tcg-01/index.html${q}`); await page.waitForFunction(() => window.__game && window.__game.ready);
  const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await page.mouse.click(180, 320); await sleep(400);
  await page.evaluate(() => __game.newBattle({ seed: 77, human: 0, noTimer: true })); await sleep(1500);
  await page.evaluate(() => { __game.mulligan([]); __game.autoplay(true); window.__loaf = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__loaf.push({ dur: Math.round(e.duration), block: Math.round(e.blockingDuration || 0), render: Math.round((e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0)), scripts: (e.scripts || []).map((s) => ({ d: Math.round(s.duration), fn: s.sourceFunctionName, src: (s.sourceURL || '').split('/').pop(), inv: s.invoker, forced: Math.round(s.forcedStyleAndLayoutDuration || 0) })) }); }).observe({ type: 'long-animation-frame', buffered: true }); });
  await sleep(+secs * 1000);
  const loaf = await page.evaluate(() => window.__loaf);
  const top = [...loaf].sort((a, c) => c.dur - a.dur).slice(0, 15);
  const byFn = {}; for (const e of loaf) for (const s of e.scripts) { const k = `${s.src}:${s.fn || s.inv}`; byFn[k] = (byFn[k] || 0) + s.d; }
  const renderTotal = loaf.reduce((a, e) => a + e.render, 0), scriptTotal = loaf.reduce((a, e) => a + e.scripts.reduce((x, s) => x + s.d, 0), 0), forced = loaf.reduce((a, e) => a + e.scripts.reduce((x, s) => x + s.forced, 0), 0);
  const out = { secs: +secs, n: loaf.length, over100: loaf.filter((e) => e.dur > 100).length, script_ms: scriptTotal, render_ms: renderTotal, forced_layout_ms: forced, by_function: Object.entries(byFn).sort((a, c) => c[1] - a[1]).slice(0, 12), top };
  writeFileSync(join(HERE, '..', '..', 'reviews', 'terms', 'qa-out', 'loaf.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ n: out.n, over100: out.over100, script_ms: out.script_ms, render_ms: out.render_ms, forced: out.forced_layout_ms, by_function: out.by_function.slice(0, 8) }));
} finally { await b.close(); srv.kill(); }
