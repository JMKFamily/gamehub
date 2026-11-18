// UX2 r3 회귀: 일일 퀘스트 3종 서로 다름(여러 날짜)·로비 퀘스트 이름 말줄임, 대전 촛불 실제 크기(4해상도), 월드맵 노드 그림(스크린샷), 콘솔
//   PLAYWRIGHT_CORE=… node projects/tcg-01/tools/qa/ux2-regress.mjs <port> <outdir>
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const [port = '8855', outDir] = process.argv.slice(2);
mkdirSync(join(outDir, 'shots'), { recursive: true });
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE);
const srv = spawn(process.execPath, [join(HERE, 'serve.mjs'), port], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(700);
const b = await pw.chromium.launch({ channel: 'msedge', headless: true });
const R = { errors: [], quests: {}, candles: {}, lobby_ellipsis: {} };
try {
  for (const [w, h] of [[360, 640], [412, 915], [640, 360], [1280, 720]]) for (const lang of ['ko', 'en']) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1000 }); const page = await ctx.newPage();
    page.on('pageerror', (e) => R.errors.push(`${w}x${h} ${e.message}`)); page.on('console', (m) => { if (m.type() === 'error') R.errors.push(`${w}x${h} ${m.text()}`); });
    await page.goto(`http://127.0.0.1:${port}/games/tcg-01/index.html?lang=${lang}`); await page.waitForFunction(() => window.__game && window.__game.ready);
    await page.mouse.click(w / 2, h / 2); await sleep(1200);
    // 로비 퀘스트 이름 말줄임(scrollWidth > clientWidth)
    R.lobby_ellipsis[`${lang}-${w}x${h}`] = await page.evaluate(() => [...document.querySelectorAll('.questW .qname, .questW .qrow *')].filter((e) => e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0).map((e) => e.textContent.trim()).filter((v, i, a) => a.indexOf(v) === i));
    if (lang === 'ko') await page.screenshot({ path: join(outDir, 'shots', `lobby-${w}x${h}.png`) });
    if (w === 360 && lang === 'ko') {
      // 날짜 30일 바꿔 가며 하루 3종이 서로 다른지(meta.rollDaily와 같은 코드)
      R.quests = await page.evaluate(async () => { const meta = await import(new URL('js/meta.js', location.href).href); const RD = Date; const out = { days: 0, dup_days: 0, types: {} }; for (let d = 0; d < 30; d++) { const fake = new RD(2026, 10, 1 + d, 12); globalThis.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(fake.getTime()); } static now() { return fake.getTime(); } }; __game.state.daily = null; meta.rollDaily(); globalThis.Date = RD; const ts = __game.state.daily.comm.map((q) => q.type + (q.hero ? ':' + q.hero : '')); out.days++; if (new Set(__game.state.daily.comm.map((q) => q.type)).size < 3) out.dup_days++; for (const q of __game.state.daily.comm) out.types[q.type] = (out.types[q.type] || 0) + 1; } return out; });
      await page.evaluate(() => { __game.state.daily = null; }); await page.reload(); await page.waitForFunction(() => window.__game && window.__game.ready); await page.mouse.click(w / 2, h / 2); await sleep(800);
      // 월드맵 노드 그림
      await page.evaluate(() => __game.go('worldmap')); await sleep(1500);
      for (let i = 0; i < 6; i++) { const n = await page.$('[data-coach-next]'); if (!n) break; await n.click().catch(() => {}); await sleep(150); }
      R.worldmap = await page.evaluate(() => { const ns = [...document.querySelectorAll('[data-node]')]; return { nodes: ns.length, with_img: ns.filter((e) => e.querySelector('img') || getComputedStyle(e).backgroundImage !== 'none').length, sizes: [...new Set(ns.map((e) => { const r = e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }))] }; });
      await page.screenshot({ path: join(outDir, 'shots', 'worldmap-360x640.png') });
    }
    // 대전 촛불 실제 크기
    await page.evaluate(() => __game.newBattle({ seed: 5, human: 0, noTimer: true })); await sleep(1200); await page.evaluate(() => __game.mulligan([])); await sleep(2500);
    R.candles[`${lang}-${w}x${h}`] = await page.evaluate(() => { const c = [...document.querySelectorAll('.cand')]; const sz = c.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; }); return { n: c.length, min_w: Math.min(...sz.map((s) => s[0])), min_h: Math.min(...sz.map((s) => s[1])), first: sz[0], states: [...new Set(c.map((e) => e.dataset.st))] }; });
    if (lang === 'ko') await page.screenshot({ path: join(outDir, 'shots', `battle-candles-${w}x${h}.png`) });
    await ctx.close();
  }
} finally { await b.close(); srv.kill(); }
writeFileSync(join(outDir, 'ux2-regress.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R));
