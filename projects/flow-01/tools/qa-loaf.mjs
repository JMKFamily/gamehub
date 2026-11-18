// flow-01 6배 스로틀 long-animation-frame 원인 보기 (qa-engineer 1-4, round-2 흐름).
//   PLAYWRIGHT_CORE=<playwright-core> node projects/flow-01/tools/qa-loaf.mjs [포트=8749] [dpr=1]
// 흐름(실제 마우스): 타이틀 → 지도 → L6 노드(카드 판) → 카드 닫기 → 지도 → 장 넘김 ▶. 50 ms 넘는 프레임의 스크립트(호출자·함수·시간)·스타일·렌더 시간을 출력.
// 서버는 serve.mjs 를 그 포트에 띄우고 자기 PID 만 종료.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const P = resolve(dirname(fileURLToPath(import.meta.url)), '..') + '/';
const PORT = process.argv[2] || '8749', DPR = +(process.argv[3] || 1);
const pw = createRequire(process.env.PLAYWRIGHT_CORE + '/index.js')(process.env.PLAYWRIGHT_CORE);
const srv = spawn(process.execPath, [P + 'tools/serve.mjs', PORT], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => srv.stdout.once('data', r));
const levels = ['01', '02', '03', '04', '05'];
const store = { v: 1, sound: true, vibrate: true, motion: false, lang: 'ko', levels: Object.fromEntries(levels.map((id) => [id, { done: true, star: true, bestPct: 100, bestFill: 100 }])) };
const br = await pw.chromium.launch({ channel: 'msedge' });
const c = await br.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: DPR });
const p = await c.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await p.goto(`http://127.0.0.1:${PORT}/games/flow-01/?lang=ko`); await p.waitForFunction(() => window.__game?.ready);
await p.evaluate((s) => localStorage.setItem('flow01.v1', JSON.stringify(s)), store); await p.reload(); await p.waitForFunction(() => window.__game?.ready);
const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
await p.waitForTimeout(1500);
await p.evaluate(() => { window.__lo = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lo.push({ tag: window.__tag, dur: Math.round(e.duration), block: Math.round(e.blockingDuration), render: Math.round(e.startTime + e.duration - e.renderStart), style: Math.round(e.startTime + e.duration - e.styleAndLayoutStart), scripts: e.scripts.map((s) => ({ inv: s.invoker, d: Math.round(s.duration), fn: s.sourceFunctionName, char: s.sourceCharPosition, url: (s.sourceURL || '').split('/').pop() })) }); }).observe({ type: 'long-animation-frame', buffered: false }); });
const tag = (t) => p.evaluate((t) => (window.__tag = t), t);
const click = async (sel) => { const b = await p.locator(sel).boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
await tag('title->map'); await p.mouse.click(206, 800); await p.waitForTimeout(1500);
await tag('map->L6(card)'); await click('.node[data-i="5"]'); await p.waitForTimeout(1500);
await tag('card close'); await click('#pCard'); await p.waitForTimeout(800);
await tag('play->map'); await click('#pMap'); await p.waitForTimeout(1200);
await tag('page turn'); await click('#mNext'); await p.waitForTimeout(1200);
const lo = await p.evaluate(() => window.__lo.filter((e) => e.dur > 50));
for (const e of lo) console.log(JSON.stringify(e));
const src = readFileSync(P + '../../games/flow-01/js/main.js', 'utf8');
const where = (ch) => { const before = src.slice(0, ch); const line = before.split('\n').length; const fn = [...before.matchAll(/function\s+(\w+)/g)].pop(); return `main.js:${line} (${fn ? fn[1] : '?'})`; };
for (const e of lo) for (const s of e.scripts) if (s.url === 'main.js' && s.char >= 0) console.log(`  ${e.tag} 스크립트 ${s.d} ms → ${where(s.char)}`);
await br.close(); srv.kill();
