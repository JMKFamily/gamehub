// flow-01 round-3 넓은 판 실제 마우스(qa-engineer 1-4): 전체 보기 → 눌러 확대, 시작 칸이 안 보이면 미니맵 → 그 칸 눌러 확대, 다음 칸이 화면 밖이면 가장자리에 손가락을 두고 따라가기를 기다림.
//   PLAYWRIGHT_CORE=<playwright-core> node projects/flow-01/tools/qa-r3-wide-mouse.mjs H4-01 360x640   (포트 8745, 자기 PID 만 종료)
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import { readFileSync } from 'node:fs';
const P='C:/gamehub-bench/gamehub/projects/flow-01/';
const pw = createRequire(process.env.PLAYWRIGHT_CORE+'/index.js')(process.env.PLAYWRIGHT_CORE);
const srv = spawn(process.execPath,[P+'tools/serve.mjs','8745'],{stdio:['ignore','pipe','pipe']}); await new Promise(r=>srv.stdout.once('data',r));
const [W,H] = (process.argv[3]||'412x915').split('x').map(Number);
const br = await pw.chromium.launch({channel:'msedge'}); const p = await (await br.newContext({viewport:{width:W,height:H}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8745/games/flow-01/?lang=ko'); await p.waitForFunction(()=>window.__game?.ready);
const id = process.argv[2]||'H1-01';
const lv = JSON.parse(readFileSync(P+'levels-hard/'+id+'.json','utf8')); const sol = lv.pairs.map(pp=>lv.solution.find(s=>s.id===pp.id).path);
await p.mouse.click(W/2,H*0.85); await p.waitForTimeout(800);
const idx = await p.evaluate((id)=>{ return 50 + ['H1','H2','H3','H4','H5'].indexOf(id.slice(0,2))*10 + (+id.slice(3)-1); }, id);
await p.evaluate((i)=>window.__game.loadLevel(i), idx); await p.waitForTimeout(600);
const vp = await p.evaluate(()=>{ const L=window.__game.layout.play; return L.viewport || L.board; });
console.log('vp', JSON.stringify(vp));
const inV = (a, m=4) => a[0] >= vp.x+m && a[0] <= vp.x+vp.w-m && a[1] >= vp.y+m && a[1] <= vp.y+vp.h-m;
const scr = (c)=>p.evaluate((c)=>window.__game.cellScreen(c), c);
// 시작 칸이 안 보이면: 미니맵 눌러 전체 보기 → 그 칸을 눌러 확대
const bring = async (cell) => { let a = await scr(cell); if (inV(a)) return a; const m = await p.locator('#pMiniWrap').boundingBox(); await p.mouse.click(m.x+m.width/2, m.y+m.height/2); await p.waitForTimeout(500); a = await scr(cell); await p.mouse.click(a[0], a[1]); await p.waitForTimeout(600); return scr(cell); };
let a = await scr(sol[0][0]); await p.mouse.click(a[0],a[1]); await p.waitForTimeout(700);
let ok=0;
for (const [k,path] of sol.entries()) {
  a = await bring(path[0]); await p.mouse.move(a[0],a[1]); await p.mouse.down();
  for (const cell of path.slice(1)) {
    let b = await scr(cell), t0 = Date.now();
    while (!inV(b) && Date.now()-t0 < 4000) { const cx = Math.max(vp.x+6, Math.min(vp.x+vp.w-6, b[0])), cy = Math.max(vp.y+6, Math.min(vp.y+vp.h-6, b[1])); await p.mouse.move(cx, cy, {steps:2}); await p.waitForTimeout(120); b = await scr(cell); }
    await p.mouse.move(b[0],b[1],{steps:3});
  }
  await p.mouse.up(); await p.waitForTimeout(100);
  const r = await p.evaluate((k)=>({log: window.__game.dragLog.at(-1), conn: window.__game.board.pairDots[k]}), k);
  if (r.conn) ok++; else console.log(k, 'want', JSON.stringify(path), 'got', JSON.stringify(r.log));
}
const res = await p.evaluate(()=>({r: window.__game.result, moves: window.__game.moves}));
console.log(id, W+'x'+H, 'connected', ok+'/'+sol.length, JSON.stringify(res), errs);
await br.close(); srv.kill();
