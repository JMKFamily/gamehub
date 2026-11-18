import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const pw = req('C:/Users/MINKI-MINKI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const b = await pw.chromium.launch({channel:'msedge'});
const p = await b.newPage({viewport:{width:360,height:640}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
await p.goto('http://127.0.0.1:8851/games/tcg-01/index.html?test=1&tut=0&lang=ko');
await p.waitForFunction(()=>window.__game&&window.__game.ready,{timeout:20000});
await p.evaluate(()=>window.__game.newBattle({human:0,seed:5}));
await p.waitForTimeout(500);
await p.evaluate(()=>window.__game.mulligan([]));
const cards = await p.evaluate(async()=>{const j=await (await fetch('data/cards.json')).json();const a=Array.isArray(j)?j:(j.cards||Object.values(j));const m={};for(const c of a)m[c.id]=c.cost;return m});
const waitMine=async()=>{for(let i=0;i<300;i++){const s=await p.evaluate(()=>{const g=window.__game;g.step(500);g.finishAnim();const b=g.battle;return b&&b.active===0&&!g.busy});if(s){await p.waitForTimeout(300);return true}await p.waitForTimeout(30)}return false};
await waitMine();
const st = await p.evaluate(()=>{const P=window.__game.battle.players[0];return {mana:P.mana,hand:P.hand.map(h=>h.cid)}});
const i = st.hand.findIndex(c=>cards[c]>st.mana);
console.log('mana',st.mana,'hand',st.hand.map(c=>c+':'+cards[c]).join(' '),'try',i);
const t0=Date.now(); const res = await p.evaluate((i)=>window.__game.act({type:'play',hand:i}),i);
await p.waitForTimeout(150); await p.screenshot({path:'z/live-deny.png'}); console.log('deny res',JSON.stringify(res));
// grow hand
for(let k=0;k<4;k++){ await p.evaluate(()=>window.__game.endTurn()); await p.waitForTimeout(200); await waitMine(); }
await p.waitForTimeout(600);
const n = await p.evaluate(()=>window.__game.battle.players[0].hand.length); console.log('hand n',n);
await p.screenshot({path:'z/live-fan.png'});
// tap a hand card to spread
const box = await p.evaluate(()=>{const e=[...document.querySelectorAll('.card.hand')];const r=e[2].getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,n:e.length}});
await p.mouse.click(box.x, box.y); await p.waitForTimeout(500); await p.screenshot({path:'z/live-spread.png'});
const sb = await p.evaluate(()=>{const e=document.querySelector('.sortBtn');if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,t:e.textContent,w:r.width,h:r.height}});
console.log('sort',JSON.stringify(sb));
if(sb){await p.mouse.click(sb.x,sb.y); await p.waitForTimeout(500); await p.screenshot({path:'z/live-sort.png'}); console.log('sort after', await p.evaluate(()=>document.querySelector('.sortBtn').textContent));}
await b.close(); console.log('errs',errs.slice(0,3));
