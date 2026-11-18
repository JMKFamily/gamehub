// UX2 기능 흐름 검사: 로비 버튼 → 화면, 상대 실력 4단계 잠김/열림, 팩 1개·연속·모두(최대 10·희귀도 요약), 월드맵 노드(열기 조건·보상·이야기),
// 수집 이야기 열고 닫기, 덱 그림 튜토리얼 한 번, 퀘스트 위젯 줄(이름 중복), 튜토리얼 패널 가운데 띠(35~65 %)·대상 비겹침(4해상도)
//   PLAYWRIGHT_CORE=… node projects/tcg-01/tools/qa/ux2-flow.mjs <port> <outdir>
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const [port = '8852', outDir = join(HERE, '..', '..', 'reviews', 'ux2', 'qa-out')] = process.argv.slice(2);
mkdirSync(join(outDir, 'shots'), { recursive: true });
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE);
const srv = spawn(process.execPath, [join(HERE, 'serve.mjs'), port], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(700);
const b = await pw.chromium.launch({ channel: 'msedge', headless: true });
const URL0 = `http://127.0.0.1:${port}/games/tcg-01/index.html`;
const R = { errors: [] };
const fresh = async (w = 360, h = 640, q = '') => { const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1000 }); const page = await ctx.newPage(); page.on('pageerror', (e) => R.errors.push(`${w}x${h} ${e.message}`)); page.on('console', (m) => { if (m.type() === 'error') R.errors.push(`${w}x${h} ${m.text()}`); }); await page.goto(URL0 + q); await page.waitForFunction(() => window.__game && window.__game.ready); await page.mouse.click(w / 2, h / 2); await sleep(800); return { ctx, page }; };
const skipCoach = async (page) => { for (let i = 0; i < 8; i++) { const n = await page.$('[data-coach-next]'); if (!n) break; await n.click().catch(() => {}); await sleep(150); } };
try {
  // 1. 로비 버튼
  {
    const { ctx, page } = await fresh();
    await page.screenshot({ path: join(outDir, 'shots', 'lobby-360x640.png') });
    const navs = await page.evaluate(() => [...document.querySelectorAll('#dock [data-nav], #app > section [data-nav]')].map((e) => e.dataset.nav).filter((v, i, a) => a.indexOf(v) === i));
    const expect = { play: 'difficulty', market: 'market', calendar: 'calendar', commissions: 'commissions', worldmap: 'worldmap', crates: 'crates', collection: 'collection', decks: 'decks', breakthrough: 'collection', craft: 'collection', settings: 'settings' };
    R.lobby = [];
    // 퀘스트 위젯 줄
    R.quest_rows = await page.evaluate(() => ({ rows: [...document.querySelectorAll('.questW .qrow')].map((r) => r.textContent.trim()), daily: __game.state.daily.comm.map((q) => `${q.type}:${q.n}`) }));
    for (const nav of navs) {
      await page.evaluate(() => __game.go('dock')); await sleep(500); await skipCoach(page);
      const el = await page.$(`[data-nav="${nav}"]`); if (!el) { R.lobby.push({ nav, err: 'missing' }); continue; }
      await el.click().catch(() => {}); await sleep(900);
      const scr = await page.evaluate(() => ({ screen: __game.screen, mode: document.querySelector('#collection')?.dataset.mode || document.querySelector('.collMode')?.textContent || null, h2: document.querySelector('#app > section h2, #app > section .title')?.textContent || null }));
      R.lobby.push({ nav, screen: scr.screen, expect: expect[nav] || null, ok: !expect[nav] || scr.screen === expect[nav], h2: scr.h2 });
      await skipCoach(page);
    }
    // 돌파·제작: 수집 화면이 그 모드로 열리는지(카드 상세에 돌파/제작 버튼 강조)
    for (const nav of ['breakthrough', 'craft']) { await page.evaluate(() => __game.go('dock')); await sleep(500); await skipCoach(page); await page.locator(`[data-nav="${nav}"]`).first().click().catch(() => {}); await sleep(900); R[`mode_${nav}`] = await page.evaluate(() => ({ screen: __game.screen, title: document.querySelector('#app > section')?.innerText.slice(0, 80) })); }
    // 2. 상대 실력 4단계
    R.tiers = [];
    for (const wins of [{}, { 1: 1 }, { 1: 1, 2: 2 }, { 1: 1, 2: 2, 3: 3 }]) {
      await page.evaluate((w) => { __game.state.stats.tierWins = w; __game.go('difficulty'); }, wins); await sleep(700); await skipCoach(page);
      R.tiers.push({ wins, locked: await page.evaluate(() => [...document.querySelectorAll('[data-tier]')].map((e) => `${e.dataset.tier}:${e.classList.contains('locked') ? 'L' : 'o'}`).join(' ')) });
    }
    await page.screenshot({ path: join(OUT_SHOT('difficulty')) }).catch(() => {});
    // 승리가 tierWins를 올리는가(코드 경로: battleRewards → stats.tierWins[tier]++): 1단계 판 하나를 끝까지
    await page.evaluate(() => { __game.state.stats.tierWins = {}; __game.go('difficulty'); }); await sleep(600); await skipCoach(page);
    await page.locator('[data-nav=fight-tier]').first().click({ force: true }); await sleep(900); await skipCoach(page);
    await page.locator('[data-nav=fight]').last().click({ force: true }); await sleep(1500); await skipCoach(page);
    await page.evaluate(() => { __game.mulligan([]); __game.autoplay(true); __game.setAnimScale(0.1); });
    await page.waitForFunction(() => !!document.getElementById('result'), null, { timeout: 300000 }).catch(() => {});
    R.tier_win_count = await page.evaluate(() => ({ winner_is_me: __game.battle && __game.battle.winner === __game.export().heroes.indexOf(__game.state.lastHero), tierWins: __game.state.stats.tierWins, ai: __game.export().ai }));
    // 3. 팩: 1개 → 다음 팩 열기 → 모두 열기(12개 가짐 → 최대 10)
    await page.evaluate(() => { document.getElementById('result')?.remove(); __game.state.crates.bare = 12; __game.go('crates'); }); await sleep(800); await skipCoach(page);
    R.packs = { before: 12 };
    await page.locator('[data-open=bare]').last().click(); await sleep(1500);
    await page.locator('[data-act=revealAll]').last().click().catch(() => {}); await sleep(5000); await skipCoach(page);
    R.packs.next_btn = await page.evaluate(() => document.querySelector('[data-act=nextPack]')?.textContent || null);
    await page.locator('[data-act=nextPack]').first().click().catch(() => {}); await sleep(1200);
    R.packs.after_two = await page.evaluate(() => __game.state.crates.bare);
    await page.evaluate(() => __game.go('crates')); await sleep(800); await skipCoach(page);
    R.packs.openAll_label = await page.evaluate(() => document.querySelector('[data-act=openAll]')?.textContent || null);
    await page.locator('[data-act=openAll]').first().click().catch(() => {}); await sleep(500); await page.locator('[data-act=yes]').last().click().catch(() => {}); await sleep(2000);
    await page.locator('[data-act=skipAll]').first().click().catch(() => {}); await sleep(600);
    R.packs.openAll = await page.evaluate(() => ({ screen: __game.screen, cells: document.querySelectorAll('.openCell').length, summary: document.querySelector('#openAll .small')?.textContent, rarity: [...document.querySelectorAll('.raritySum .rchip')].map((e) => e.textContent).join(' / '), left: __game.state.crates.bare }));
    await page.screenshot({ path: join(outDir, 'shots', 'openAll-360x640.png') });
    // 4. 월드맵
    await page.evaluate(() => { __game.state.story = { read: [] }; __game.go('worldmap'); }); await sleep(1200); await skipCoach(page);
    R.worldmap = await page.evaluate(() => { const ns = [...document.querySelectorAll('[data-node]')]; return { nodes: ns.length, open: ns.filter((e) => e.classList.contains('open')).length, locked: ns.filter((e) => e.classList.contains('locked')).length, read: ns.filter((e) => e.classList.contains('read')).length, small: ns.filter((e) => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height) < 48; }).length, fog: !!document.querySelector('.wfog') }; });
    await page.screenshot({ path: join(outDir, 'shots', 'worldmap-360x640.png') });
    const salt0 = await page.evaluate(() => JSON.stringify(__game.state.cur));
    await page.locator('[data-act=continue]').first().click().catch(() => {}); await sleep(600);
    R.worldmap.panel = await page.evaluate(() => ({ story: (document.querySelector('.ovl .storyText')?.textContent || '').slice(0, 60), claim: !!document.querySelector('[data-act=claim]') }));
    await page.locator('[data-act=claim]').first().click().catch(() => {}); await sleep(1200);
    R.worldmap.after = await page.evaluate((s0) => ({ read: (__game.state.story.read || []).length, cur_before: JSON.parse(s0), cur_after: __game.state.cur, open: document.querySelectorAll('[data-node].open').length }), salt0);
    // 잠긴 노드 탭 → 조건 문구
    const lk = await page.$('[data-node].locked'); if (lk) { await lk.click().catch(() => {}); await sleep(500); R.worldmap.locked_text = await page.evaluate(() => document.querySelector('.ovl .small')?.textContent || null); await page.locator('.ovl [data-act=close]').last().click().catch(() => {}); }
    // 5. 수집 이야기
    await page.evaluate(() => __game.go('collection')); await sleep(1500); await skipCoach(page);
    const cid = await page.evaluate(() => document.querySelector('[data-cid]')?.dataset.cid);
    await page.locator(`[data-cid="${cid}"]`).first().click().catch(() => {}); await sleep(800);
    R.story = { cid, btn: !!(await page.$('[data-act=story]')) };
    await page.locator('[data-act=story]').first().click().catch(() => {}); await sleep(600); R.story.open = !!(await page.$('.storyPanel'));
    await page.screenshot({ path: join(outDir, 'shots', 'collection-story-360x640.png') });
    await page.locator('[data-act=storyClose]').first().click().catch(() => {}); await sleep(500); R.story.closed = !(await page.$('.storyPanel'));
    await ctx.close();
  }
  // 6. 덱 그림 튜토리얼 한 번(새 저장소)
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => __game.go('decks')); await sleep(1200);
    const seen = []; for (let i = 0; i < 8; i++) { const k = await page.evaluate(() => document.querySelector('.coach')?.dataset.coach || null); if (!k) break; seen.push(k); await page.locator('[data-coach-next]').first().click(); await sleep(250); }
    await page.evaluate(() => __game.go('dock')); await sleep(600); await page.evaluate(() => __game.go('decks')); await sleep(1200);
    R.deck_tutorial = { first: seen, second: await page.evaluate(() => document.querySelector('.coach')?.dataset.coach || null), buttons: await page.evaluate(() => [...document.querySelectorAll('#decks [data-act]')].filter((e) => e.offsetParent).map((e) => e.dataset.act)) };
    await ctx.close();
  }
  // 7. 튜토리얼 패널 가운데 띠(4해상도): 대전 튜토리얼 판의 첫 6단계, tutLayoutCheck + 패널 세로 중심 비율
  R.band = {};
  for (const [w, h] of [[360, 640], [412, 915], [640, 360], [1280, 720]]) {
    const { ctx, page } = await fresh(w, h);
    await page.locator('[data-nav=play]').last().click({ force: true }); await sleep(900); await skipCoach(page);
    await page.locator('[data-nav=fight-tier]').first().click({ force: true }); await sleep(900); await skipCoach(page);
    await page.locator('[data-nav=fight]').last().click({ force: true }); await sleep(1500); await skipCoach(page);
    await page.evaluate(() => { __game.mulligan([]); window.__hum = __game.export().heroes.indexOf(__game.state.lastHero); });
    const rows = []; let last = null;
    for (let k = 0; k < 300 && rows.length < 8; k++) {
      const s = await page.evaluate(() => { const t = document.querySelector('.tut'); const bt = __game.battle; if (!t) return { tut: null, mine: bt.active === window.__hum, busy: __game.busy, over: bt.over }; const r = t.getBoundingClientRect(); const st = document.querySelector('#battle .stage, .stage') || document.body; const sr = st.getBoundingClientRect(); return { tut: t.dataset.tut, cy: +(((r.top + r.height / 2) - sr.top) / sr.height).toFixed(3), mine: bt.active === window.__hum, busy: __game.busy, over: bt.over }; });
      if (s.over) break;
      if (s.tut && s.tut !== last) { last = s.tut; const lc = await page.evaluate(() => { try { const a = __game.tutLayoutCheck(); return Array.isArray(a) ? a.filter((x) => x.panel_ring || x.panel_slots || x.panel_next || x.panel_skip || x.next_skip || x.next_hit === false || x.skip_hit === false).map((x) => x.step) : a; } catch (e) { return 'err ' + e.message; } }); rows.push({ step: s.tut, center_y: s.cy, in_band: s.cy >= 0.35 && s.cy <= 0.65, layout_bad: lc }); if (rows.length === 1) await page.screenshot({ path: join(outDir, 'shots', `tut-band-${w}x${h}.png`) }); }
      if (s.tut) { const nx = await page.$('[data-tut-next]'); if (nx) await nx.click({ timeout: 2000, force: true }).catch(() => {}); else await page.mouse.click(w / 2, 12); await sleep(250); continue; }
      if (s.mine && !s.busy) await page.evaluate(() => __game.runAI());
      await sleep(150);
    }
    R.band[`${w}x${h}`] = rows;
    await ctx.close();
  }
} finally { await b.close(); srv.kill(); }
function OUT_SHOT(n) { return join(outDir, 'shots', `${n}-360x640.png`); }
writeFileSync(join(outDir, 'ux2-flow.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R).slice(0, 6000));
