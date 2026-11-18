// flow-01 round-2 blocker 재현(qa-engineer 1-4): 일반 모드에서 L1 을 실제 마우스로 풀고 결과 ▶(또는 ↻)을 누르면 resultFrame 이 PS.result=null 을 읽어 pageerror → rAF 루프 멈춤.
//   PLAYWRIGHT_CORE=<playwright-core> node projects/flow-01/tools/qa-r2-next-freeze.mjs mouse '#rNext' <스크린샷.png>   (포트 8748, 자기 PID 만 종료)
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import { readFileSync } from 'node:fs';
const P='C:/gamehub-bench/gamehub/projects/flow-01/';
const pw = createRequire(process.env.PLAYWRIGHT_CORE+'/index.js')(process.env.PLAYWRIGHT_CORE);
const srv = spawn(process.execPath,[P+'tools/serve.mjs','8748'],{stdio:['ignore','pipe','pipe']}); await new Promise(r=>srv.stdout.once('data',r));
const br = await pw.chromium.launch({channel:'msedge'}); const c = await br.newContext({viewport:{width:412,height:915}}); const p = await c.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.stack));
await p.goto('http://127.0.0.1:8748/games/flow-01/'); await p.waitForFunction(()=>window.__game?.ready);
await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForFunction(()=>window.__game?.ready);
const lv = JSON.parse(readFileSync(P+'levels/01-level1.json','utf8')); const sol = lv.pairs.map(pp=>lv.solution.find(s=>s.id===pp.id).path);
await p.mouse.click(206,700); await p.waitForTimeout(800);
const nb = await p.locator('.node').first().boundingBox(); await p.mouse.click(nb.x+nb.width/2, nb.y+nb.height/2); await p.waitForTimeout(800);
const mode = process.argv[2] || 'mouse';
if (mode === 'hook') await p.evaluate((sol)=>{for(const s of sol) window.__game.drag(s);}, sol);
else for (const path of sol) { const gr = await p.evaluate(()=>window.__game.layout.grid); const at=([x,y])=>[gr.originX+(x+.5)*gr.cellPx, gr.originY+(y+.5)*gr.cellPx]; await p.mouse.move(...at(path[0])); await p.mouse.down(); for (const cc of path.slice(1)) await p.mouse.move(...at(cc), {steps:3}); await p.mouse.up(); }
await p.waitForTimeout(1500);
console.log('state', await p.evaluate(()=>window.__game.state));
for (const t of [1100, 1400]) {}
const b = await p.locator(process.argv[3] || '#rNext').boundingBox(); await p.mouse.click(b.x+b.width/2, b.y+b.height/2);
await p.waitForTimeout(1500);
console.log('after next', await p.evaluate(()=>({st:window.__game.state, li:window.__game.levelIndex, clock: window.__game.clock})));
await p.waitForTimeout(500); console.log('clock later', await p.evaluate(()=>window.__game.clock));
await p.mouse.click(206, 500); await p.waitForTimeout(600); await p.screenshot({ path: process.argv[4] || 'x.png' }); console.log('final', await p.evaluate(()=>({st:window.__game.state, clock: window.__game.clock, card: window.__game.board.card, drags: window.__game.dragLog.length}))); await br.close(); srv.kill();
