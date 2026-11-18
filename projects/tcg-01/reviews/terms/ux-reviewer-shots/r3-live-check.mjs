import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const pw = req('C:/Users/MINKI-MINKI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const b = await pw.chromium.launch({channel:'msedge'});
const p = await b.newPage({viewport:{width:360,height:640}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
const U='http://127.0.0.1:8852/games/tcg-01/index.html?test=1&tut=0&lang=ko';
await p.goto(U); await p.waitForFunction(()=>window.__game&&window.__game.ready,{timeout:20000});
await p.evaluate(()=>window.__game.newBattle({human:0,seed:5})); await p.waitForTimeout(500);
await p.evaluate(()=>window.__game.mulligan([]));
const waitMine=async()=>{for(let i=0;i<300;i++){const s=await p.evaluate(()=>{const g=window.__game;g.step(500);g.finishAnim();const b=g.battle;return b&&b.active===0&&!g.busy});if(s){await p.waitForTimeout(400);return true}await p.waitForTimeout(30)}return false};
await waitMine();
const cards = await p.evaluate(async()=>{const j=await (await fetch('data/cards.json')).json();const a=Array.isArray(j)?j:(j.cards||Object.values(j));const m={};for(const c of a)m[c.id]=c.cost;return m});
const st = await p.evaluate(()=>{const P=window.__game.battle.players[0];return {mana:P.mana,hand:P.hand.map(h=>h.cid)}});
const i = st.hand.findIndex(c=>cards[c]>st.mana);
await p.evaluate((i)=>window.__game.act({type:'play',hand:i}),i); await p.waitForTimeout(150); await p.screenshot({path:'r3/deny.png'});
const shot={5:0,8:0,10:0};
for(let k=0;k<9;k++){ const n=await p.evaluate(()=>window.__game.battle.players[0].hand.length);
  if(shot[n]===0){shot[n]=1; await p.screenshot({path:`r3/fan${n}.png`}); const vis=await p.evaluate(()=>{const e=[...document.querySelectorAll('.card.hand .badge')].map(x=>{const r=x.getBoundingClientRect();const el=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return el===x});return e});console.log('n',n,'badge center visible',vis.filter(Boolean).length+'/'+vis.length);}
  if(n>=10) break; await p.evaluate(()=>window.__game.endTurn()); await p.waitForTimeout(200); await waitMine(); }
const sb = await p.evaluate(()=>{const e=document.querySelector('.sortBtn');if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,t:e.textContent,w:r.width,h:r.height,hidden:e.classList.contains('hidden')}});
console.log('sort',JSON.stringify(sb));
if(sb){for(let k=0;k<2;k++){await p.mouse.click(sb.x,sb.y); await p.waitForTimeout(500); console.log('sort label',await p.evaluate(()=>document.querySelector('.sortBtn').textContent));} await p.screenshot({path:'r3/sorted.png'});}
// glossary
await p.goto(U+'&screen=glossary'); await p.waitForTimeout(1200);
const gl = await p.evaluate(()=>document.body.innerText.split('\n').filter(l=>/심지|마나/.test(l)).slice(0,8));
console.log('glossary',JSON.stringify(gl)); await p.screenshot({path:'r3/glossary.png'});
// collection detail story
await p.goto(U+'&screen=collection'); await p.waitForTimeout(1000);
await p.evaluate(()=>{const e=document.querySelector('[data-cid="A006"]');e.scrollIntoView();e.click()}); await p.waitForTimeout(700);
const g1=await p.evaluate(()=>{const nx=[...document.querySelectorAll('button')].find(b=>/건너뛰기/.test(b.textContent));if(nx){nx.click();return 'guide skipped'}return 'no guide'}); await p.waitForTimeout(400);
const story=await p.evaluate(()=>{const s=document.querySelector('[data-act="story"]');if(!s)return null;const r=s.getBoundingClientRect();return {w:r.width,h:r.height,t:s.textContent}});
console.log(g1,'story btn',JSON.stringify(story));
if(story){await p.click('[data-act="story"]'); await p.waitForTimeout(500); await p.screenshot({path:'r3/story.png'});}
await b.close(); console.log('errs',errs.slice(0,3));
