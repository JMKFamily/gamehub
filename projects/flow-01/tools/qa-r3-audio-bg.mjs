// flow-01 round-3: 오디오 컨텍스트가 늦게 만들어지는 빌드(K1)에서 백그라운드 일시정지·음소거를 컨텍스트가 생긴 뒤에 확인(qa-engineer 1-4, 포트 8744)
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process';
const P='C:/gamehub-bench/gamehub/projects/flow-01/';
const pw = createRequire(process.env.PLAYWRIGHT_CORE+'/index.js')(process.env.PLAYWRIGHT_CORE);
const srv = spawn(process.execPath,[P+'tools/serve.mjs','8744'],{stdio:['ignore','pipe','pipe']}); await new Promise(r=>srv.stdout.once('data',r));
const br = await pw.chromium.launch({channel:'msedge', args:['--autoplay-policy=no-user-gesture-required']}); const p = await (await br.newContext({viewport:{width:412,height:915}})).newPage();
const logs=[]; p.on('console',m=>{ if(['error','warning'].includes(m.type())) logs.push(m.text().slice(0,120)); });
await p.goto('http://127.0.0.1:8744/games/flow-01/?lang=ko'); await p.waitForFunction(()=>window.__game?.ready);
await p.mouse.click(206,800); await p.waitForTimeout(2500);
const nb = await p.locator('.node').first().boundingBox(); await p.mouse.click(nb.x+nb.width/2, nb.y+nb.height/2); await p.waitForTimeout(2000);
const r = await p.evaluate(async()=>{ const g=window.__game; const a0=g.audioState; Object.defineProperty(document,'hidden',{value:true,configurable:true}); Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true}); document.dispatchEvent(new Event('visibilitychange')); const c0=g.clock; await new Promise(r=>setTimeout(r,800)); const c1=g.clock, a1=g.audioState; Object.defineProperty(document,'hidden',{value:false,configurable:true}); Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true}); document.dispatchEvent(new Event('visibilitychange')); await new Promise(r=>setTimeout(r,500)); return {a0,a1,a2:g.audioState,hidden_clock:+(c1-c0).toFixed(1), after:+(g.clock-c1).toFixed(1)}; });
// 음소거: 지도 소리 버튼 → suspended → 다시 → running
await p.evaluate(()=>window.__game.toMap()); await p.waitForTimeout(500);
const sb = await p.locator('#mSound').boundingBox(); await p.mouse.click(sb.x+sb.width/2, sb.y+sb.height/2); await p.waitForTimeout(400); const m1 = await p.evaluate(()=>window.__game.audioState);
await p.mouse.click(sb.x+sb.width/2, sb.y+sb.height/2); await p.waitForTimeout(400); const m2 = await p.evaluate(()=>window.__game.audioState);
console.log(JSON.stringify({bg:r, mute_off:m1, mute_on:m2, logs}));
await br.close(); srv.kill();
