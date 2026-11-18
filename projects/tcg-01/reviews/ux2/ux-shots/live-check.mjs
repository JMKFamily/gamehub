import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const pw = req('C:/Users/MINKI-MINKI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const b = await pw.chromium.launch({channel:'msedge'});
const p = await b.newPage({viewport:{width:360,height:640}});
await p.goto('http://127.0.0.1:8853/games/tcg-01/index.html?test=1&tut=0&lang=ko'); await p.waitForFunction(()=>window.__game&&window.__game.ready,{timeout:20000});
await p.evaluate(()=>window.__game.newBattle({human:0,seed:7})); await p.waitForTimeout(500);
await p.evaluate(()=>window.__game.mulligan([]));
for(let t=0;t<200;t++){ const s=await p.evaluate(()=>{const g=window.__game;const b=g.battle;if(!b||b.over)return 'over';const P=b.players[0];if(b.active===0&&!g.busy&&P.maxMana>=5)return 'ok';if(b.active===0&&!g.busy){g.runAI();} g.step(400); g.finishAnim(); return 'go'}); if(s!=='go'){console.log(s);break} await p.waitForTimeout(20)}
// play one card to have spent candles
await p.evaluate(()=>{const g=window.__game;const L=g.legal().find(a=>a.type==='play');if(L)g.act(L)}); await p.waitForTimeout(600);
console.log(await p.evaluate(()=>{const P=window.__game.battle.players[0];return P.mana+'/'+P.maxMana}));
await p.screenshot({path:'ux2/candles5.png'});
await b.close();
