// UX2 r5 확인(r4 도구를 촛불 캔버스·교환형 사람 운전으로 고침): 4해상도 대전 한 장, 촛불 캔버스 크기·켜짐/꺼짐 alpha 시간열, 실제 승리 → 단계 승수(사람 자리 = 교환형 eval)
//   PLAYWRIGHT_CORE=… node projects/tcg-01/tools/qa/ux2-r4.mjs <port> <outdir>
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const [port = '8856', outDir] = process.argv.slice(2);
mkdirSync(join(outDir, 'shots'), { recursive: true });
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE);
const srv = spawn(process.execPath, [join(HERE, 'serve.mjs'), port], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(700);
const b = await pw.chromium.launch({ channel: 'msedge', headless: true });
const ONLY = process.argv[4] === 'candle';
const R = { errors: [], shots: {}, candle_anim: null, layout640: null, tier_win: null };
const fresh = async (w, h, q = '?tut=0') => { const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1000 }); const page = await ctx.newPage(); page.on('pageerror', (e) => R.errors.push(`${w}x${h} ${e.message}`)); page.on('console', (m) => { if (m.type() === 'error') R.errors.push(`${w}x${h} ${m.text()}`); }); await page.goto(`http://127.0.0.1:${port}/games/tcg-01/index.html${q}`); await page.waitForFunction(() => window.__game && window.__game.ready); await page.mouse.click(w / 2, h / 2); await sleep(800); return { ctx, page }; };
const skipCoach = async (page) => { for (let i = 0; i < 8; i++) { const n = await page.$('[data-coach-next]'); if (!n) break; await n.click({ timeout: 2000, force: true }).catch(() => {}); await sleep(150); } };
try {
  // 1. 4해상도 대전 한 장(내 턴, 심지 3 이상) + 촛불 크기

  for (const [w, h] of (ONLY ? [[360, 640]] : [[360, 640], [412, 915], [640, 360], [1280, 720]])) {
    const { ctx, page } = await fresh(w, h);
    await page.evaluate(() => __game.newBattle({ seed: 7, human: 0, noTimer: true })); await sleep(1200); await page.evaluate(() => __game.mulligan([]));
    for (let k = 0; k < 400; k++) { const s = await page.evaluate(() => ({ a: __game.battle.active, busy: __game.busy, mana: __game.battle.players[0].maxMana })); if (s.a === 0 && !s.busy && s.mana >= 3) break; if (s.a === 0 && !s.busy) await page.evaluate(() => __game.endTurn()); await sleep(150); }
    await sleep(1500);
    R.shots[`${w}x${h}`] = await page.evaluate(() => { const cvs = [...document.querySelectorAll('canvas.candCv')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }); const c = [...document.querySelectorAll('.cand')]; const sz = c.map((e) => e.getBoundingClientRect()); return { canvases: cvs, n: c.length, w: Math.round(Math.min(...sz.map((r) => r.width)) * 10) / 10, h: Math.round(Math.min(...sz.map((r) => r.height)) * 10) / 10, states: c.map((e) => e.dataset.st).join(','), costs: [...document.querySelectorAll('[data-hand] .cost, [data-hand] [class*=cost]')].slice(0, 3).map((e) => { const cs = getComputedStyle(e); return { bg: cs.backgroundImage === 'none' ? cs.backgroundColor : 'gradient', color: cs.color }; }) }; });
    await page.screenshot({ path: join(outDir, 'shots', `battle-${w}x${h}.png`) });
    // 2. 촛불 끄기 연출(360만): 카드 하나 내고 40 ms 간격으로 켜진 수·opacity 시간열
    if (w === 360) {
      R.candle_anim = await page.evaluate(async () => {
        const cvOf = () => { const c = [...document.querySelectorAll('.cand')].map((e) => e.parentNode._cv).filter(Boolean); return c[c.length - 1]; }; const lit = () => { const C = cvOf(); return C ? C.st.filter((q) => (q.a ?? 0) > 0.98).length : -1; };
        const op = () => { const C = cvOf(); return C ? C.st.filter((q) => (q.a ?? 0) > 0.02 && (q.a ?? 0) < 0.98).length : -1; };
        const L = __game.legal().filter((a) => a.type === 'play' && a.target == null); if (!L.length) return { err: 'no play' };
        const before = lit(); const t0 = performance.now(); __game.act(L[0]); const seq = [];
        for (let i = 0; i < 25; i++) { await new Promise((r) => setTimeout(r, 40)); seq.push([Math.round(performance.now() - t0), lit(), op()]); }
        return { before, after: lit(), seq, mid_transition_frames: seq.filter((x) => x[2] > 0).length };
      });
      await page.screenshot({ path: join(outDir, 'shots', 'battle-after-play-360x640.png') });
      // 켜기: 턴 넘겨 내 턴 시작
      await page.evaluate(() => __game.endTurn()); for (let k = 0; k < 300; k++) { const s = await page.evaluate(() => __game.battle.active); if (s === 0) break; await sleep(100); }
      R.candle_relight = await page.evaluate(async () => { const cvOf = () => { const c = [...document.querySelectorAll('.cand')].map((e) => e.parentNode._cv).filter(Boolean); return c[c.length - 1]; }; const seq = []; for (let i = 0; i < 25; i++) { const C = cvOf(); seq.push(C ? [C.st.filter((q) => (q.a ?? 0) > 0.98).length, C.st.filter((q) => (q.a ?? 0) > 0.02 && (q.a ?? 0) < 0.98).length] : [-1, -1]); await new Promise((r) => setTimeout(r, 40)); } return seq; });
    }
    await ctx.close();
  }
  // 3. tutLayoutCheck 640x360(튜토리얼 판)
  if (!ONLY) {
    const { ctx, page } = await fresh(640, 360, '');
    await page.locator('[data-nav=play]').last().click({ force: true }); await sleep(900); await skipCoach(page);
    await page.locator('[data-nav=fight-tier]').first().click({ force: true }); await sleep(900); await skipCoach(page);
    await page.locator('[data-nav=fight]').last().click({ force: true }); await sleep(1500); await skipCoach(page);
    await page.evaluate(() => { __game.mulligan([]); window.__hum = __game.export().heroes.indexOf(__game.state.lastHero); });
    const res = []; let last = null;
    for (let k = 0; k < 200 && res.length < 10; k++) {
      const s = await page.evaluate(() => ({ t: document.querySelector('.tut')?.dataset.tut || null, mine: __game.battle.active === window.__hum, busy: __game.busy, over: __game.battle.over }));
      if (s.over) break;
      if (s.t && s.t !== last) { last = s.t; res.push(await page.evaluate(() => { try { const a = __game.tutLayoutCheck(); return { ok: true, bad: Array.isArray(a) ? a.filter((x) => x.panel_ring || x.panel_slots || x.panel_next || x.panel_skip || x.next_skip || x.next_hit === false || x.skip_hit === false).map((x) => x.step) : a }; } catch (e) { return { ok: false, err: e.message }; } })); }
      if (s.t) { const n = await page.$('[data-tut-next]'); if (n) await n.click({ timeout: 2000, force: true }).catch(() => {}); await sleep(200); continue; }
      if (s.mine && !s.busy) await page.evaluate(() => __game.runAI());
      await sleep(150);
    }
    R.layout640 = { checks: res.length, errors: res.filter((x) => !x.ok).map((x) => x.err), bad: [...new Set(res.flatMap((x) => x.bad || []))] };
    await ctx.close();
  }
  // 4. 실제 승리 → 단계 승수: 1단계 판을 이길 때까지(최대 4판)
  if (!ONLY) {
    const { ctx, page } = await fresh(360, 640, '?tut=0');
    const tries = [];
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => __game.go('dock')); await sleep(600);
      await page.locator('[data-nav=play]').last().click({ force: true }); await sleep(900); await skipCoach(page);
      await page.locator('[data-tier="1"]').first().click({ force: true }).catch(() => {}); await sleep(300);
      await page.locator('[data-nav=fight-tier]').first().click({ force: true }); await sleep(900); await skipCoach(page);
      await page.locator('[data-nav=fight]').last().click({ force: true }); await sleep(1500); await skipCoach(page);
      const before = await page.evaluate(() => JSON.stringify(__game.state.stats.tierWins || {}));
      await page.evaluate(async () => { __game.mulligan([]); __game.setAnimScale(0.1); const base = new URL('js/', location.href).href; window.__ai = await import(base + 'engine/ai.mjs?qa=eval'); window.__dm = await import(base + 'data.js'); window.__hum = __game.export().heroes.indexOf(__game.state.lastHero); window.__deckOf = null; window.__evalUsed = 0; });
      for (let k = 0; k < 4000; k++) { const s = await page.evaluate(() => ({ res: !!document.getElementById('result'), over: __game.battle.over, mine: __game.battle.active === window.__hum, busy: __game.busy, pend: !!__game.battle.pending })); if (s.res || s.over) break; if (s.mine && !s.busy) { await page.evaluate(() => { const ex = __game.export(), E = __game.engine, D = window.__dm.D; const decks = ex.heroes.map((h) => (h === __game.state.lastHero ? (__game.state.decks.find((d) => d.id === __game.state.deckSel) || D.decks.find((d) => d.hero === h)).cards : null)); if (__game.battle.pending) { __game.act({ type: 'choose', index: 0 }); return; } const build = (dk) => { const st = E.createGame({ ...window.__dm.engineData(), seed: ex.seed >>> 0, players: ex.heroes.map((h, i) => ({ hero: h, deck: dk[i], bt: {} })), log: false }); E.applyMulligan(st, 0, ex.mulligan[0]); E.applyMulligan(st, 1, ex.mulligan[1]); E.startGame(st); for (const x of ex.actions) E.applyAction(st, x); return st; }; const same = (st) => JSON.stringify(st.players.map((P) => P.hand.map((x) => x.cid))) === JSON.stringify(__game.battle.players.map((P) => P.hand.map((x) => x.cid))); let a = null; try { if (!window.__deckOf) { const cand = (h) => [...(D.starters || []).filter((d) => d.hero === h), ...D.decks.filter((d) => d.hero === h), ...__game.state.decks.filter((d) => d.hero === h)].map((d) => d.cards); const c0 = cand(ex.heroes[0]), c1 = cand(ex.heroes[1]); outer: for (const x0 of c0) for (const x1 of c1) { try { if (same(build([x0, x1]))) { window.__deckOf = [x0, x1]; break outer; } } catch {} } } if (window.__deckOf) { const st = build(window.__deckOf); a = window.__ai.chooseAction(st, 'eval'); } } catch (e) { a = null; } const L = __game.legal(); if (!a || !L.some((x) => JSON.stringify(x) === JSON.stringify(a))) { const pl = L.filter((x) => x.type === 'play'); a = pl[0] || L.find((x) => x.type === 'attack' && x.target === __game.battle.players[1 - window.__hum].hero.uid) || L.find((x) => x.type === 'attack') || { type: 'end' }; } if (window.__deckOf) window.__evalUsed++; __game.act(a); void decks; }); } await sleep(120); }
      await page.waitForFunction(() => !!document.getElementById('result'), null, { timeout: 60000 }).catch(() => {});
      const r = await page.evaluate((before) => ({ before: JSON.parse(before), after: __game.state.stats.tierWins || {}, win: __game.battle.winner === __game.export().heroes.indexOf(__game.state.lastHero), ai: __game.export().ai, half: __game.battle.half, deck_found: !!window.__deckOf, eval_moves: window.__evalUsed }), before);
      tries.push(r);
      await page.evaluate(() => document.getElementById('result')?.remove());
      if (r.win) break;
    }
    R.tier_win = tries;
    if (tries.some((t) => t.win)) { await page.evaluate(() => __game.go('difficulty')); await sleep(800); R.tier2_after_win = await page.evaluate(() => [...document.querySelectorAll('[data-tier]')].map((e) => `${e.dataset.tier}:${e.classList.contains('locked') ? 'L' : 'o'}`).join(' ')); }
    await ctx.close();
  }
} finally { await b.close(); srv.kill(); }
writeFileSync(join(outDir, ONLY ? 'ux2-r5-candle.json' : 'ux2-r5.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R).slice(0, 4000));
