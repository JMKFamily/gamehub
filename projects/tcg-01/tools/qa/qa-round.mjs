// tcg-01 「썰물 영장」 라운드 QA (qa-engineer). 재사용: 라운드 번호·포트·부분만 바꿔 다시 돌린다.
//   PLAYWRIGHT_CORE=<playwright-core 폴더> node projects/tcg-01/tools/qa/qa-round.mjs --round 1 --part <이름|all> [--port 8820] [--channel msedge]
// 부분: basic·shots(4해상도 화면·터치·잘림·스크롤) / sync(엔진 해시 + 빌드↔시뮬 AI 대 AI 18판) / human(사람 속도 한 판, 실시간·실제 포인터)
//       tempo(AI 대 AI 실시간 보통·빠르게, 정보 손실 대조) / perf(6배 스로틀 새 브라우저 3회 + 메뉴 전환) / func(저장·백그라운드·음소거·언어·덱 규칙·상자 1000개·돌파 수치)
// 결과: projects/tcg-01/reviews/round-N/qa-out/<part>.json, shots/*.png. 서버는 이 스크립트가 띄운 node PID만 종료.
// 데이터 값(시간·확률·규칙)은 박지 않고 projects/tcg-01/{art,balance}.json(기획 원본)에서 읽는다. 빌드 data/ 복사본과는 따로 대조.
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = join(HERE, '..', '..');
const REPO = join(PROJ, '..', '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const ROUND = opt('--round', '1');
const PART = opt('--part', 'all');
const PORT = +opt('--port', '8820');
const CHANNEL = opt('--channel', 'msedge');
const OUT = join(PROJ, 'reviews', opt('--outdir', `round-${ROUND}`)); // --outdir terms → reviews/terms
const QOUT = join(OUT, 'qa-out');
const SHOTS = join(OUT, 'shots');
mkdirSync(QOUT, { recursive: true }); mkdirSync(SHOTS, { recursive: true });
const rj = (p) => JSON.parse(readFileSync(p, 'utf8'));
const ART = rj(join(PROJ, 'art.json'));
const BAL = rj(join(PROJ, 'balance.json'));
const BASE = `http://127.0.0.1:${PORT}/games/tcg-01/index.html`;
const VIEWS = [[360, 640], [412, 915], [640, 360], [1280, 720]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stats = (a) => { const s = [...a].sort((x, y) => x - y); const q = (p) => s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; return { n: s.length, min: s[0] ?? null, p50: q(0.5), p90: q(0.9), p99: q(0.99), max: s[s.length - 1] ?? null, mean: s.length ? +(s.reduce((x, y) => x + y, 0) / s.length).toFixed(1) : null }; };
const save = (name, obj) => { writeFileSync(join(QOUT, name + '.json'), JSON.stringify(obj, null, 1)); console.log(`[${name}] 저장`); };

// ---------- playwright·서버 ----------
const req = createRequire(import.meta.url);
let pw = null;
for (const n of ['playwright', 'playwright-core']) { try { pw = req(n); break; } catch {} }
if (!pw && process.env.PLAYWRIGHT_CORE) pw = req(process.env.PLAYWRIGHT_CORE);
if (!pw) { console.error('playwright를 찾지 못함: PLAYWRIGHT_CORE=<playwright-core 폴더>'); process.exit(2); }
const srv = spawn(process.execPath, [join(HERE, 'serve.mjs'), String(PORT)], { stdio: 'ignore' });
appendFileSync(join(QOUT, 'pids.log'), `${new Date().toISOString()} part=${PART} server pid ${srv.pid} port ${PORT}\n`);
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await sleep(100); }
const stopAll = () => { try { srv.kill(); } catch {} };
process.on('exit', stopAll);

const LOG = { console: [], pageerrors: [], failed: [], external: [], requests: 0 };
async function browser() { return pw.chromium.launch({ channel: CHANNEL, headless: true }); }
async function open(b, url, { w = 360, h = 640, touch = true, storage = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, storageState: storage || undefined });
  const page = await ctx.newPage();
  const tag = `${w}x${h}`;
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) LOG.console.push(`[${tag}] ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => LOG.pageerrors.push(`[${tag}] ${e.message} @ ${String(e.stack || '').split(String.fromCharCode(10)).slice(1, 4).join(' | ')}`));
  page.on('request', (r) => { LOG.requests++; const u = new URL(r.url()); if (/^(https?|wss?):$/.test(u.protocol) && !['127.0.0.1', 'localhost'].includes(u.hostname)) LOG.external.push(r.url()); });
  page.on('requestfailed', (r) => LOG.failed.push(`[${tag}] ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) LOG.failed.push(`[${tag}] ${r.url()} HTTP ${r.status()}`); });
  await page.goto(url);
  await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 20000 });
  await attach(page);
  return { ctx, page };
}

async function attach(page) {
  // 같은 모듈 인스턴스(같은 URL)를 QA 전역으로 붙임: anim(A 잠금 상태), meta(상자), fx(숫자 수), audio
  await page.evaluate(async () => {
    const base = new URL('js/', location.href).href;
    window.__qa = { A: (await import(base + 'anim.js')).A, G: (await import(base + 'anim.js')).G, meta: await import(base + 'meta.js'), FX: (await import(base + 'fx.js')).FX, audio: (await import(base + 'audio.js')).audio, D: (await import(base + 'data.js')).D, nums: 0 };
    const F = window.__qa.FX; const wrap = (arr) => { arr.push = function (...a) { window.__qa.nums += a.length; return Array.prototype.push.apply(this, a); }; return arr; }; let cur = wrap(F.nums); Object.defineProperty(F, 'nums', { configurable: true, get: () => cur, set: (v) => { cur = wrap(v); } }); // fxInit가 배열을 새로 만들어도 숫자 수를 셈
  });
}
// ---------- 화면 검사 도구 (페이지 안) ----------
async function inspect(page, label) {
  return page.evaluate((label) => {
    const vw = innerWidth, vh = innerHeight;
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
    // 스크롤 상자 안에 있으면 스크롤로 닿는 요소 → 잘림이 아님
    const inScroll = (e) => { for (let p = e.parentElement; p; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1)) return p; } return null; };
    const sel = 'button, a, input, [role=button], [data-k], [data-hand], [data-uid], [data-cid], [data-chunk], .heroCard, .dline';
    const targets = [...document.querySelectorAll(sel)].filter(vis).map((e) => { const r = e.getBoundingClientRect(); return { e, tag: e.tagName.toLowerCase(), key: e.dataset.k || e.dataset.nav || e.dataset.act || e.dataset.hand && 'hand' || e.dataset.uid && 'uid' || e.dataset.cid && 'cid' || e.dataset.set || e.dataset.buy || e.dataset.open || e.dataset.mode || e.dataset.hero || e.dataset.deck || e.dataset.new || (e.textContent || '').trim().slice(0, 16), x: r.left, y: r.top, w: r.width, h: r.height, sc: !!inScroll(e) }; });
    const small = targets.filter((t) => Math.min(t.w, t.h) < 48 && t.tag !== 'input').map((t) => `${t.key}(${Math.round(t.w)}x${Math.round(t.h)})`);
    const clipped = targets.filter((t) => !t.sc && (t.x < -1 || t.y < -1 || t.x + t.w > vw + 1 || t.y + t.h > vh + 1)).map((t) => `${t.key}@${Math.round(t.x)},${Math.round(t.y)},${Math.round(t.w)}x${Math.round(t.h)}`);
    // 겹침: 버튼류끼리(손패 카드·토큰처럼 의도적으로 겹치는 부채꼴은 제외), 1 px 초과
    const btns = targets.filter((t) => !['hand', 'uid', 'cid'].includes(t.key) && !t.e.dataset.hand && !t.e.dataset.uid && !t.e.dataset.cid);
    const over = [];
    for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) {
      const a = btns[i], b = btns[j];
      if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 1 && oy > 1) over.push(`${a.key}×${b.key}(${Math.round(ox)}x${Math.round(oy)})`);
    }
    // 글 넘침: 버튼·제목·작은 글 중 내용이 상자보다 넓음(줄바꿈 없는 잘림)
    const textOver = [...document.querySelectorAll('button, b, h1, h2, h3, .small, .cname, .ctext, span')].filter(vis).filter((e) => e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible').map((e) => (e.textContent || '').trim().slice(0, 20));
    const docScroll = document.documentElement.scrollHeight > vh + 1 || document.documentElement.scrollWidth > vw + 1;
    const scrollers = [...document.querySelectorAll('*')].filter((e) => { const cs = getComputedStyle(e); return vis(e) && /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 4; }).map((e) => ({ cls: e.className, hidden: e.scrollHeight - e.clientHeight, bar: getComputedStyle(e).scrollbarWidth !== 'none' && e.offsetWidth - e.clientWidth > 0 }));
    return { label, vw, vh, screen: window.__game.screen, n_targets: targets.length, small, clipped, overlap: over.slice(0, 20), overlap_n: over.length, textOver: [...new Set(textOver)].slice(0, 15), docScroll, scrollers };
  }, label);
}

// ================= basic + shots =================
async function partShots() {
  const b = await browser();
  const res = [];
  for (const [w, h] of VIEWS) {
    const { ctx, page } = await open(b, BASE, { w, h, touch: w < 1000 });
    const tag = `${w}x${h}`;
    const shot = async (name, label) => { await page.screenshot({ path: join(SHOTS, `${name}-${tag}.png`) }); res.push(await inspect(page, `${name}-${tag}`)); };
    await sleep(400); await shot('01-title');
    await page.mouse.click(w / 2, h / 2); await sleep(400); await shot('02-dock');
    await page.locator('[data-nav=play]').last().click(); await sleep(400); await shot('03-heroes');
    await coachSkipAll(page, 'next'); await page.locator('[data-nav=fight]').last().click(); await sleep(900); await shot('04-mulligan');
    // 첫 물때 확정 → 실제 시간으로 판 진행(사람 자리도 AI, 연출 배율 0.25로 앞당김)
    await page.evaluate(() => { __game.mulligan([]); });
    await page.evaluate(() => { __game.autoplay(true); __game.setAnimScale(0.25); });
    await page.waitForFunction(() => { const b = __game.battle; return b && (b.half >= 9 || b.over); }, null, { timeout: 120000 });
    await page.evaluate(() => { __game.autoplay(false); __game.setAnimScale(1); });
    await page.waitForFunction(() => { const b = __game.battle; return b.over || (b.active === 0 && !__game.busy); }, null, { timeout: 60000 }).catch(() => {});
    await sleep(600); await shot('05-battle');
    // 카드 확대: 손패 카드 길게 누르기
    const hc = await page.$('[data-hand]');
    if (hc && !(await page.evaluate(() => __game.battle.over))) {
      const r = await hc.boundingBox();
      await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down(); await sleep(600);
      await shot('06-zoom'); await page.mouse.up(); await sleep(200); await page.mouse.click(w / 2, 5); await sleep(300);
    }
    // 결과: 끝까지
    await page.evaluate(() => { __game.autoplay(true); __game.setAnimScale(0.2); });
    await page.waitForFunction(() => !!document.getElementById('result'), null, { timeout: 180000 });
    await sleep(1200); await shot('07-result');
    await page.locator('[data-nav=menu]').last().click(); await sleep(300);
    await page.evaluate(() => __game.go('collection')); await sleep(400); await shot('08-collection');
    // 새김: 공명을 다음 단계 문턱까지 넣고 상세 → 새김 버튼
    const cid = await page.evaluate(() => { const M = __qa.meta; const id = Object.keys(__game.state.coll).find((k) => __game.state.coll[k].n > 0); const e = __game.state.coll[id]; e.res = M.thresholds(id)[1]; return id; });
    await page.evaluate((cid) => __game.go('collection'), cid); await sleep(300);
    await page.locator(`[data-cid="${cid}"]`).last().click(); await sleep(400); await shot('09-recut-ready');
    await page.locator('[data-act=recut]').last().click(); await sleep(900); await shot('10-recut-done');
    await page.locator('[data-act=close]').last().click(); await sleep(200);
    await page.evaluate(() => __game.go('decks')); await sleep(300);
    await page.locator('[data-new]').last().click(); await sleep(400);
    for (let i = 0; i < 12; i++) { const c = await page.$$('.collGrid [data-cid]'); if (c[i]) await c[i].click(); }
    await sleep(300); await shot('11-builder');
    await page.evaluate(() => __game.go('crates')); await sleep(300); await shot('12-crates');
    await page.locator('[data-open=bare]').last().click(); await sleep(1500); await shot('13-crate-tease');
    await page.locator('[data-act=revealAll]').last().click(); await sleep(4500); await shot('14-crate-reveal');
    await page.evaluate(() => __game.go('market')); await sleep(300); await shot('15-market');
    await page.evaluate(() => __game.go('settings')); await sleep(300); await shot('16-settings');
    await ctx.close();
  }
  await b.close();
  const sum = { small_by_screen: {}, clipped: {}, overlap: {}, textOver: {}, scroll640x360: {} };
  for (const r of res) {
    if (r.small.length) sum.small_by_screen[r.label] = r.small;
    if (r.clipped.length) sum.clipped[r.label] = r.clipped;
    if (r.overlap_n) sum.overlap[r.label] = r.overlap;
    if (r.textOver.length) sum.textOver[r.label] = r.textOver;
    if (r.label.endsWith('640x360')) sum.scroll640x360[r.label] = { docScroll: r.docScroll, scrollers: r.scrollers };
  }
  save('shots', { log: LOG, summary: sum, screens: res });
}

// ================= sync: 엔진 해시 + 빌드↔시뮬 =================
function simOne(...args) { return JSON.parse(execFileSync(process.execPath, [join(HERE, 'sim-one.mjs'), ...args.map(String)], { encoding: 'utf8' })); }
async function partSync() {
  let hash = '';
  try { hash = execFileSync(process.execPath, [join(PROJ, 'tools', 'sync-engine.mjs'), '--check'], { encoding: 'utf8' }); } catch (e) { hash = 'FAIL ' + (e.stdout || '') + (e.stderr || ''); }
  // 빌드 데이터 복사본 = 기획 원본(엔진이 읽는 값): balance.json 전체, cards.json 수치 필드
  const bb = rj(join(REPO, 'games', 'tcg-01', 'data', 'balance.json'));
  const bc = rj(join(REPO, 'games', 'tcg-01', 'data', 'cards.json')), pc = rj(join(PROJ, 'cards.json'));
  const numKeys = ['cost', 'attack', 'health', 'kind', 'rarity', 'owner', 'keywords', 'effects', 'breakthrough'];
  const pcm = Object.fromEntries(pc.cards.map((c) => [c.id, c]));
  const bcl = bc.cards || bc.list || Object.values(bc);
  const cardDiff = [];
  for (const c of bcl) { const o = pcm[c.id]; if (!o) { cardDiff.push(c.id + ' 원본 없음'); continue; } for (const k of numKeys) if (JSON.stringify(c[k]) !== JSON.stringify(o[k])) cardDiff.push(`${c.id}.${k}`); }
  const dataSame = { balance_equal: JSON.stringify(bb) === JSON.stringify(BAL), cards_n: bcl.length, card_field_diffs: cardDiff.slice(0, 20), card_field_diff_n: cardDiff.length };

  const b = await browser();
  const { page } = await open(b, BASE + '?test=1&anim=0&manual=1');
  const heroes = await page.evaluate(() => __qa.D.heroIds);
  const games = [];
  let k = 0;
  const syncN = +opt('--sync-n', '18');
  for (let i = 0; i < heroes.length; i++) for (let d = 1; d <= 3; d++) {
    if (k >= syncN) break;
    const hA = heroes[i], hB = heroes[(i + d) % heroes.length], seed = 9100 + (k++) * 37;
    const ex = await page.evaluate(async ({ hA, hB, seed }) => {
      await __game.newBattle({ heroA: hA, heroB: hB, seed, ai: 'eval', human: null });
      for (let g = 0; g < 4000 && !__game.battle.over; g++) __game.step(1000);
      return __game.export();
    }, { hA, hB, seed });
    const tr = simOne('trace', hA, hB, seed, 'eval');
    const pl = simOne('play', hA, hB, seed, 'eval');
    const firstDiff = (() => { const n = Math.max(ex.actions.length, tr.actions.length); for (let j = 0; j < n; j++) if (JSON.stringify(ex.actions[j]) !== JSON.stringify(tr.actions[j])) return j; return -1; })();
    games.push({ hA, hB, seed, build: { n: ex.actions.length, winner: ex.winner, half: ex.half, final: ex.final }, sim: { n: tr.actions.length, winner: tr.winner, half: tr.half, final: tr.final }, simPlay: pl,
      mulligan_same: JSON.stringify(ex.mulligan) === JSON.stringify(tr.mulligan), actions_same: firstDiff < 0, first_diff: firstDiff,
      winner_same: ex.winner === tr.winner && tr.winner === pl.winner, half_same: ex.half === tr.half && tr.half === pl.half, final_same: JSON.stringify(ex.final) === JSON.stringify(tr.final) });
    const g = games[games.length - 1];
    console.log(`${hA} vs ${hB} s${seed}: 행동 ${g.build.n}/${g.sim.n} ${g.actions_same ? '일치' : '불일치@' + firstDiff} 승자 ${ex.winner}/${tr.winner}/${pl.winner}`);
  }
  await b.close();
  const mism = games.filter((g) => !(g.mulligan_same && g.actions_same && g.winner_same && g.half_same && g.final_same)).length;
  save('sync', { log: LOG, hash_check: hash.trim(), data: dataSame, games, mismatches: mism, actions_total: games.reduce((s, g) => s + g.build.n, 0) });
}

// ================= 사람 속도 한 판 (실시간·실제 포인터) =================
// 사람 정책: 낼 수 있는 가장 비싼 카드 → 호명술 → 공격(수호 우선, 그다음 호명자) → 숨 고르기. 행동 사이 2~4 s 생각(시드 고정 난수).
async function humanGame(page, { seed = 4242, think = [2000, 4000], turnThink = null, policy = 'greedy', fast = false, tapAI = false } = {}) {
  let lastHalf = -1;
  if (policy === 'eval') await page.evaluate(async () => { const base = new URL('js/', location.href).href; window.__qa.ai = await import(base + 'engine/ai.mjs?qa=1'); window.__qa.dataMod = await import(base + 'data.js'); });
  let rs = seed; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
  await page.evaluate(({ fast }) => {
    __game.setFast(fast);
    const Q = window.__qa; Q.frames = []; Q.on = true;
    const f = (ts) => { if (!Q.on) return; const b = __game.battle; Q.frames.push([Math.round(ts), b ? b.half : -1, b ? b.active : -1, Q.A.locked ? 1 : 0, __game.busy ? 1 : 0, b && b.over ? 1 : 0]); requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }, { fast });
  const t0 = Date.now();
  const W = page.viewportSize();
  const center = async (sel) => { const el = await page.$(sel); if (!el) return null; const r = await el.boundingBox(); return r && { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
  const handPt = async (i) => page.evaluate((i) => { const els = [...document.querySelectorAll('[data-hand]')].map((e) => e.getBoundingClientRect()).sort((a, b) => a.left - b.left); const r = els[i]; return r ? { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 30) } : null; }, i);
  const boardPt = async () => page.evaluate(() => { const hs = [...document.querySelectorAll('.hero[data-uid]')].map((e) => e.getBoundingClientRect()).sort((a, b) => a.top - b.top); if (hs.length < 2) return { x: innerWidth / 2, y: innerHeight / 2 }; const top = hs[0], me = hs[hs.length - 1]; return { x: innerWidth / 2 + 4, y: top.bottom + (me.top - top.bottom) * 0.62 }; });
  const drag = async (a, z) => { await page.mouse.move(a.x, a.y); await page.mouse.down(); for (let s = 1; s <= 6; s++) { await page.mouse.move(a.x + (z.x - a.x) * s / 6, a.y + (z.y - a.y) * s / 6); await sleep(25); } await page.mouse.up(); };
  let pointerOk = 0, pointerMiss = 0, aiTaps = 0;
  // 첫 물때: 비싼 카드(4+) 바꾸기 — 화면 버튼으로 확정
  await sleep(900);
  await page.evaluate(() => __game.mulligan([]));
  for (let guard = 0; guard < 50000; guard++) { // 끝은 판 종료·20분 상한으로(반복 수 상한이 AI 턴 대기 중 판을 끊던 문제)
    const s = await page.evaluate(() => { const b = __game.battle; return { over: b.over, active: b.active, half: b.half, busy: __game.busy, pend: !!b.pending, n: __game.export().actions.length }; });
    if (s.over) break;
    if (s.active !== 0) { if (tapAI && !aiTaps) { await page.mouse.click(W.width / 2, W.height * 0.45); aiTaps++; } await sleep(120); continue; }
    if (s.pend) { await sleep(think[0]); await page.evaluate(() => __game.act({ type: 'choose', index: 0 })); continue; }
    // 생각 시간: 턴 첫 행동 앞 turnThink(있으면), 그다음 행동 사이 think
    if (turnThink && s.half !== lastHalf) { lastHalf = s.half; await sleep(turnThink[0] + rnd() * (turnThink[1] - turnThink[0])); } else await sleep(think[0] + rnd() * (think[1] - think[0]));
    let a = null;
    if (policy === 'eval') {
      // 교환형 정책: 빌드 export(첫 물때·행동열)로 엔진 상태를 페이지 안에서 다시 만들고 eval AI가 고른 수(빌드 판 상태는 건드리지 않음)
      a = await page.evaluate(() => { const ex = __game.export(), E = __game.engine, Dm = window.__qa.dataMod, D = Dm.D; const st = E.createGame({ ...Dm.engineData(), seed: ex.seed >>> 0, players: ex.heroes.map((h) => ({ hero: h, deck: D.decks.find((d) => d.hero === h).cards, bt: {} })), log: false }); st.players.forEach((P, i) => { P.aiFace = 1; }); E.applyMulligan(st, 0, ex.mulligan[0]); E.applyMulligan(st, 1, ex.mulligan[1]); E.startGame(st); for (const x of ex.actions) E.applyAction(st, x); return window.__qa.ai.chooseAction(st, 'eval'); });
    } else {
    const L = await page.evaluate(() => { const b = __game.battle, P = b.players[0]; const legal = __game.legal(); const cost = (i) => { const h = P.hand[i]; const c = h && __qa.D.cards[h.cid]; return c ? c.cost + (h.costMod || 0) : 0; }; return { legal, costs: P.hand.map((_, i) => cost(i)), enemyHero: b.players[1].hero.uid }; });
    const plays = L.legal.filter((x) => x.type === 'play').sort((x, y) => L.costs[y.hand] - L.costs[x.hand]);
    const atk = L.legal.filter((x) => x.type === 'attack');
    const pw = L.legal.filter((x) => x.type === 'power');
    a = plays[0] && (plays.find((x) => x.hand === plays[0].hand && x.target === L.enemyHero) || plays[0]);
    if (!a && pw.length) a = pw.find((x) => x.target === L.enemyHero) || pw[0];
    if (!a && atk.length) a = atk.find((x) => x.target === L.enemyHero) || atk[0];
    }
    if (!a) a = { type: 'end' };
    // 포인터로 실행
    try {
      if (a.type === 'play') { const from = await handPt(a.hand); const to = a.target != null ? await center(`[data-uid="${a.target}"]`) : await boardPt(); if (from && to) await drag(from, to); }
      else if (a.type === 'attack') { const from = await center(`[data-uid="${a.attacker}"]`), to = await center(`[data-uid="${a.target}"]`); if (from && to) await drag(from, to); }
      else if (a.type === 'power') { const from = await center('[data-k=power]'); if (a.target != null) { const to = await center(`[data-uid="${a.target}"]`); await drag(from, to); } else await page.mouse.click(from.x, from.y); }
      else { const p = await center('[data-k=end]'); await page.mouse.click(p.x, p.y); }
    } catch {}
    await sleep(80);
    const n2 = await page.evaluate(() => __game.export().actions.length);
    if (n2 > s.n) pointerOk++; else { pointerMiss++; await page.evaluate((a) => __game.act(a), a); }
    if (Date.now() - t0 > 20 * 60000) break;
  }
  await page.waitForFunction(() => !!document.getElementById('result') || __game.battle.over, null, { timeout: 20000 }).catch(() => {});
  await sleep(4500);
  const out = await page.evaluate(() => { window.__qa.on = false; return { frames: window.__qa.frames, tempo: __game.tempoLog, ex: __game.export(), nums: window.__qa.nums }; });
  return { wall_s: (Date.now() - t0) / 1000, pointerOk, pointerMiss, ...out };
}

// 연출 실측 vs art.json tempo (원본) — 실시간(start_real→end_real), 다음 연출이 앞 연출 뒤에 줄 선 경우·건너뛴 것·예약 2배속은 따로
function tempoTable(actions, fast) {
  const A = ART.tempo.actions;
  const by = {};
  let prevEnd = 0;
  for (const r of actions) {
    const queuedBehind = !r.phase_of && r.start_real_ms < prevEnd - 1; if (!r.phase_of) prevEnd = Math.max(prevEnd, r.end_real_ms || 0);
    if (r.end_real_ms == null || r.kind === 'tutorial') continue;
    const k = r.phase_of ? r.kind : (r.kind + (A[r.kind] && ['lethal_blow', 'end_breath_press', 'attack'].includes(r.kind) ? ':tl' : '')); (by[k] = by[k] || { real: [], plan: [], skipped: 0, behind: 0, deaths: 0 });
    if (r.skipped) { by[k].skipped++; continue; }
    if (queuedBehind) { by[k].behind++; continue; }
    by[k].real.push(r.end_real_ms - r.start_real_ms); by[k].plan.push(r.planned_ms);
  }
  const rows = [];
  for (const [k, v] of Object.entries(by)) {
    const k0 = k === 'attack_motion' ? 'attack' : k.replace(/:tl$/, ''); const ref = A[k0] ? (fast ? A[k0].fast_ms : A[k0].normal_ms) : null;
    const st = stats(v.real), pl = stats(v.plan);
    rows.push({ kind: k, art_ms: ref, n: st.n, real_p50: st.p50, real_mean: st.mean, real_max: st.max, planned_p50: pl.p50, err_pct_vs_art: ref && st.p50 != null ? +((st.p50 - ref) / ref * 100).toFixed(1) : null, err_pct_real_vs_planned: pl.p50 ? +(((st.mean - pl.mean) / pl.mean) * 100).toFixed(1) : null, skipped: v.skipped, queued_behind: v.behind });
  }
  return rows.sort((a, b) => a.kind.localeCompare(b.kind));
}
// 프레임 기록 → AI 턴 길이, 사람 턴 안 잠금(입력 불가) 시간
function turnStats(frames) {
  const seg = []; let cur = null;
  for (const [t, half, act, lock, busy, over] of frames) {
    if (half < 1) continue;
    if (!cur || cur.half !== half) { if (cur) seg.push(cur); cur = { half, act, t0: t, t1: t, lock: 0, busyAfterLast: 0 }; }
    if (cur.lastT != null && cur.lastLock) cur.lock += t - cur.lastT;
    cur.t1 = t; cur.lastT = t; cur.lastLock = lock;
    if (over) break;
  }
  if (cur) seg.push(cur);
  const ai = seg.filter((s) => s.act === 1).map((s) => s.t1 - s.t0), me = seg.filter((s) => s.act === 0);
  // 빈 대기: AI 턴 끝(반턴 바뀜) → 사람이 입력 가능(잠금 풀림)까지
  return { ai_turn_ms: stats(ai), ai_turn_over_12s: ai.filter((x) => x > ART.tempo.ai_turn.turn_total_cap_normal_ms + 1500).length, human_turn_ms: stats(me.map((s) => s.t1 - s.t0)), human_locked_ms_per_turn: stats(me.map((s) => s.lock)), human_locked_share: +(me.reduce((a, s) => a + s.lock, 0) / Math.max(1, me.reduce((a, s) => a + s.t1 - s.t0, 0))).toFixed(3) };
}

async function partHuman() {
  const games = +opt('--games', '1'), seed0 = +opt('--seed', '4242'), policy = opt('--policy', 'greedy');
  const think = opt('--think', '2000,4000').split(',').map(Number), tt = opt('--turn-think', '');
  const turnThink = tt ? tt.split(',').map(Number) : null;
  const tag = opt('--tag', 'human');
  const g0 = +opt('--g0', '0');
  for (let g = g0; g < g0 + games; g++) {
    const seed = seed0 + g * 101;
    const b = await browser();
    const { page } = await open(b, BASE, { w: 360, h: 640 });
    await page.mouse.click(180, 320); await sleep(300); // 타이틀 → 부두(오디오 잠금 해제 = 실제 경로)
    const heroes = await page.evaluate(() => __qa.D.heroIds);
    const hA = heroes[g % heroes.length], hB = heroes[(g + 3) % heroes.length];
    await page.evaluate(({ seed, hA, hB }) => __game.newBattle({ seed, human: 0, noTimer: true, heroA: hA, heroB: hB }), { seed, hA, hB });
    const r = await humanGame(page, { seed, think, turnThink, policy });
    await b.close();
    const resp = r.tempo.inputs.map((x) => x.response_ms).filter((x) => x != null);
    const exf = join(QOUT, `${tag}-${seed}-export.json`);
    writeFileSync(exf, JSON.stringify({ ...r.ex, decks: null }));
    const rep = simOne('replay', exf);
    const tsum = turnStats(r.frames);
    save(`${tag}-${seed}`, { log: LOG, policy, think, turnThink, heroes: [hA, hB], wall_s: r.wall_s, minutes: +(r.wall_s / 60).toFixed(2), turns: Math.ceil(r.ex.half / 2), half: r.ex.half, actions: r.ex.actions.length, pointerOk: r.pointerOk, pointerMiss: r.pointerMiss,
      response_ms: stats(resp), response_over_100: resp.filter((x) => x > 100).length, tempo: tempoTable(r.tempo.actions, false), turns_t: tsum, human_turn_over_50s: (tsum.human_turn_ms.max || 0) > 50000, winner: r.ex.winner, final: r.ex.final, replay: rep, replay_same: rep.winner === r.ex.winner && JSON.stringify(rep.final) === JSON.stringify(r.ex.final) && !rep.error });
    console.log(`${hA} vs ${hB} s${seed}: ${(r.wall_s / 60).toFixed(2)}분 ${Math.ceil(r.ex.half / 2)}턴 승자 ${r.ex.winner}`);
  }
}

// ================= tempo: AI 대 AI 실시간 보통/빠르게 + 정보 손실 + 예약 =================
async function aiGameReal(page, { seed, fast, hA, hB }) {
  await page.evaluate(({ seed, fast, hA, hB }) => { __game.setFast(fast); window.__qa.nums = 0; const Q = window.__qa; Q.frames = []; Q.on = true; const f = (ts) => { if (!Q.on) return; const b = __game.battle; Q.frames.push([Math.round(ts), b ? b.half : -1, b ? b.active : -1, Q.A.locked ? 1 : 0, __game.busy ? 1 : 0, b && b.over ? 1 : 0]); requestAnimationFrame(f); }; requestAnimationFrame(f); return __game.newBattle({ heroA: hA, heroB: hB, seed, ai: 'eval', human: null }); }, { seed, fast, hA, hB });
  const t0 = Date.now();
  await page.waitForFunction(() => __game.battle.over && !__game.busy, null, { timeout: 15 * 60000, polling: 250 });
  return page.evaluate(() => { window.__qa.on = false; return { tempo: __game.tempoLog, ex: __game.export(), nums: window.__qa.nums, frames: window.__qa.frames }; }).then((r) => ({ wall_s: (Date.now() - t0) / 1000, ...r }));
}
// AI 턴 길이(AI 대 AI는 양쪽이 AI): 반턴 길이
function halfLens(frames) { const m = new Map(); for (const [t, half] of frames) { if (half < 1) continue; const o = m.get(half) || { a: t, b: t }; o.b = t; m.set(half, o); } return [...m.values()].map((o) => o.b - o.a); }
// 화면 최종 상태 = 엔진 상태(명줄·응답자 수)
async function screenMatches(page) {
  return page.evaluate(() => { const b = __game.battle; const toks = document.querySelectorAll('[data-uid]:not(.hero)').length; const eng = b.players[0].board.length + b.players[1].board.length; return { dom_tokens: toks, engine_tokens: eng, ok: toks === eng }; });
}
async function partTempo() {
  const b = await browser();
  const runs = [];
  const pairs = [['h_rider', 'h_warden', 515], ['h_wreck', 'h_choir', 516]];
  for (const [hA, hB, seed] of pairs) for (const fast of [false, true]) {
    const { page, ctx } = await open(b, BASE + '?test=1', { w: 360, h: 640 });
    const r = await aiGameReal(page, { seed, fast, hA, hB });
    const hl = halfLens(r.frames);
    runs.push({ hA, hB, seed, fast, wall_s: r.wall_s, actions: r.ex.actions.length, half: r.ex.half, winner: r.ex.winner, final: r.ex.final, nums: r.nums, screen: await screenMatches(page), table: tempoTable(r.tempo.actions, fast), half_turn_ms: stats(hl), half_over_cap: hl.filter((x) => x > (fast ? ART.tempo.ai_turn.turn_total_cap_fast_ms : ART.tempo.ai_turn.turn_total_cap_normal_ms) + 1500).length });
    console.log(`${hA}-${hB} fast=${fast} ${r.wall_s}s 행동 ${r.ex.actions.length} 숫자 ${r.nums}`);
    await ctx.close();
  }
  // 건너뛰기(매 행동 탭 = finishAll) 같은 시드: manual 모드에서 각 행동 직후 끝 상태로
  const skip = [];
  for (const [hA, hB, seed] of pairs) {
    const { page, ctx } = await open(b, BASE + '?test=1&manual=1', { w: 360, h: 640 });
    const r = await page.evaluate(async ({ hA, hB, seed }) => { window.__qa.nums = 0; await __game.newBattle({ heroA: hA, heroB: hB, seed, ai: 'eval', human: null }); let last = 0; for (let g = 0; g < 200000 && !__game.battle.over; g++) { __game.step(16); const n = __game.tempoLog.actions.length; if (n !== last) { last = n; __game.finishAnim(); } } for (let i = 0; i < 400; i++) __game.step(16); return { ex: __game.export(), nums: window.__qa.nums, skipped: __game.tempoLog.actions.filter((a) => a.skipped).length }; }, { hA, hB, seed });
    skip.push({ hA, hB, seed, actions: r.ex.actions.length, winner: r.ex.winner, final: r.ex.final, nums: r.nums, skipped: r.skipped, screen: await screenMatches(page) });
    await ctx.close();
  }
  // 예약·2배속: 사람 판에서 잠금 중 연속 입력(act 4번) → 예약 수·4번째 거절·예약 중 연출 단축
  const { page, ctx } = await open(b, BASE + '?test=1&manual=1', { w: 360, h: 640 });
  const q = await page.evaluate(async () => {
    await __game.newBattle({ heroA: 'h_rider', heroB: 'h_warden', seed: 77, human: 0 }); __game.mulligan([]);
    const out = [];
    for (let turn = 0; turn < 14 && !__game.battle.over; turn++) {
      while (__game.battle.active !== 0 && !__game.battle.over) __game.step(50);
      for (let i = 0; i < 60; i++) __game.step(16);
      // 낼 수 있는 행동 4개를 잠금 안에 연달아(각 입력 사이 게임 시간 20 ms)
      const res = [];
      for (let k = 0; k < 4; k++) { const L = __game.legal().filter((a) => a.type !== 'end'); if (!L.length) break; const r = __game.act(L[0]); res.push(r.queued ? 'q' : r.ok === false ? (r.reason || 'x') : 'ok'); __game.step(20); }
      out.push(res.join(','));
      for (let i = 0; i < 300 && __game.busy; i++) __game.step(16);
      __game.endTurn();
    }
    const acts = __game.tempoLog.actions;
    return { per_turn: out, max_queue_seen: Math.max(...out.map((s) => s.split(',').filter((x) => x === 'q').length)), rejects: out.join(',').split(',').filter((x) => x && x !== 'q' && x !== 'ok'), short: acts.filter((a) => a.game_dur_ms != null && !a.skipped && a.game_dur_ms < 0.8 * a.planned_ms).length, total: acts.length };
  });
  await ctx.close(); await b.close();
  save('tempo', { log: LOG, runs, skip, queue: q });
}

// ================= perf: 6배 스로틀, 새 브라우저 3회 =================
async function perfRun(i) {
  const b = await browser();
  const { page, ctx } = await open(b, BASE + opt('--perf-q', ''), { w: 360, h: 640 }); // --perf-q '?tut=0' → 튜토리얼 끈 변형(원인 가르기)
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  const fr = async () => page.evaluate(() => { window.__pf = { t: [], on: true }; const f = (ts) => { if (!window.__pf.on) return; window.__pf.t.push(ts); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const stop = async () => page.evaluate(() => { window.__pf.on = false; return window.__pf.t; });
  // 메뉴 전환 최장 프레임
  const menu = {};
  const tr = async (name, fn) => { await fr(); await fn(); await sleep(1200); const t = await stop(); const d = t.slice(1).map((x, j) => x - t[j]); menu[name] = +Math.max(...d).toFixed(1); await coachSkipAll(page, 'next'); }; // 첫 진입 안내(코치)는 측정 뒤 넘김
  await tr('title→dock(첫 탭)', () => page.mouse.click(180, 320));
  await tr('dock→heroes', () => page.locator('[data-nav=play]').last().click());
  await tr('heroes→dock', () => page.evaluate(() => __game.go('dock')));
  await tr('dock→collection', () => page.locator('[data-nav=collection]').last().click());
  await tr('collection→dock', () => page.evaluate(() => __game.go('dock')));
  await tr('dock→crates', () => page.locator('[data-nav=crates]').last().click());
  await tr('crate open', () => page.locator('[data-open=bare]').last().click());
  await tr('→market', () => page.evaluate(() => __game.go('market')));
  await tr('→decks', () => page.evaluate(() => __game.go('decks')));
  await tr('dock→heroes→battle(첫 물때)', async () => { await page.evaluate(() => __game.go('heroes')); await coachSkipAll(page, 'next'); await page.locator('[data-nav=fight]').last().click(); });
  // 대전 중(AI 대 AI 실시간, 사람 자리 autoplay): 처음 150 s
  // 메뉴 경로 판은 사람이 후공일 수 있음 — AI 차례에 훅 runAI를 부르면 aiStep 예약 수와 겹쳐 낡은 행동이 실행돼 예외가 남(terms QA 하네스 오류). 사람 자리 차례에만.
  // 사람 자리는 runAI(입력 경로)로 두고 튜토리얼 패널·스포트라이트는 켠 채로(안내 단계는 6 s마다 '다음')
  if (opt('--perf-auto', '') === '1') await page.evaluate(() => { __game.mulligan([]); __game.autoplay(true); }); // round-2와 같은 운전(사람 자리 autoplay) — 원인 가르기
  else await page.evaluate((cheap) => { window.__cheap = cheap; __game.mulligan([]); let n = 0; const hum = __game.export().heroes.indexOf(__game.state.lastHero); window.__hum = hum; window.__drv = setInterval(() => { const bt = __game.battle; if (!bt || bt.over) return; n++; if (n % 9 === 0) document.querySelector('[data-tut-next]')?.click(); if (bt.active === hum && !__game.busy) { if (window.__cheap) { const L = __game.legal(); const a = L.find((x) => x.type === 'play') || L.find((x) => x.type === 'attack') || { type: 'end' }; __game.act(a); } else __game.runAI(); } }, 700); }, opt('--perf-cheap', '') === '1');
  await fr();
  const t0 = Date.now();
  await page.waitForFunction(() => __game.battle.over, null, { timeout: 150000, polling: 500 }).catch(() => {});
  const t = await stop();
  const tempo = await page.evaluate(() => __game.tempoLog.actions);
  const tutShown = tempo.filter((a) => a.kind === 'tutorial').map((a) => a.step);
  await b.close();
  const d = t.slice(1).map((x, j) => x - t[j]);
  const sum = (dd) => { if (!dd.length) return null; const s = [...dd].sort((a, b) => b - a); const n1 = Math.max(1, Math.floor(dd.length * 0.01)); const total = dd.reduce((a, b) => a + b, 0); return { frames: dd.length, avg_fps: +(dd.length / total * 1000).toFixed(1), low1_fps: +(1000 / (s.slice(0, n1).reduce((a, b) => a + b, 0) / n1)).toFixed(1), max_ms: +s[0].toFixed(1), over_33: dd.filter((x) => x > 33.4).length }; };
  // 큰 연출 구간(tier ≥ 2: 큰 카드·전멸·마지막 일격·승패) 안의 프레임만
  const big = tempo.filter((a) => a.tier >= 2 && a.end_real_ms);
  const inBig = []; for (let j = 1; j < t.length; j++) if (big.some((a) => t[j] >= a.start_real_ms && t[j] <= a.end_real_ms + 50)) inBig.push(t[j] - t[j - 1]);
  return { run: i, tutorial_steps_shown: tutShown, seconds: (Date.now() - t0) / 1000, battle: sum(d), big_moments: { n: big.length, kinds: [...new Set(big.map((a) => a.kind))], ...sum(inBig) }, menu };
}
async function partPerf() {
  const runs = [];
  for (let i = 1; i <= 3; i++) { runs.push(await perfRun(i)); console.log(JSON.stringify(runs[runs.length - 1])); }
  save(opt('--perf-tag', 'perf'), { log: LOG, rate: 6, q: opt('--perf-q', ''), runs });
}

// ================= func =================
async function partFunc() {
  const b = await browser();
  const out = {};
  // 1) 저장·새로고침
  {
    const { page, ctx } = await open(b, BASE, { w: 360, h: 640 });
    await page.mouse.click(180, 320); await sleep(200);
    const before = await page.evaluate(() => { const s = __game.state; s.settings.music = false; s.cur.salt += 123; s.coll[Object.keys(s.coll)[0]].res += 7; __game.lang('en'); __game.save(); return { salt: s.cur.salt, music: s.settings.music, lang: s.lang, res: s.coll[Object.keys(s.coll)[0]].res, crates: s.crates.bare }; });
    await page.reload(); await page.waitForFunction(() => window.__game && window.__game.ready); await attach(page);
    const after = await page.evaluate(() => { const s = __game.state; return { salt: s.cur.salt, music: s.settings.music, lang: s.lang, res: s.coll[Object.keys(s.coll)[0]].res, crates: s.crates.bare, title: document.title }; });
    out.save_reload = { before, after, ok: JSON.stringify(before) === JSON.stringify({ salt: after.salt, music: after.music, lang: after.lang, res: after.res, crates: after.crates }) };
    // 결과 보상이 저장되는가: 판 끝 → 새로고침 → 전적
    await page.evaluate(() => __game.lang('ko'));
    await page.evaluate(() => __game.go('heroes')); await coachSkipAll(page, 'next'); await page.locator('[data-nav=fight]').last().click(); await sleep(500);
    await page.evaluate(() => { __game.mulligan([]); __game.autoplay(true); __game.setAnimScale(0.05); });
    await page.waitForFunction(() => !!document.getElementById('result'), null, { timeout: 240000 });
    const g1 = await page.evaluate(() => __game.state.stats.games);
    await page.reload(); await page.waitForFunction(() => window.__game && window.__game.ready); await attach(page);
    out.save_after_battle = { games_before_reload: g1, games_after_reload: await page.evaluate(() => __game.state.stats.games) };
    // 2) 음소거: 설정 화면 버튼으로 소리·음악 끔 → audio 상태
    await page.mouse.click(180, 320); await sleep(200);
    await page.evaluate(() => __game.go('settings'));
    await page.locator('[data-set=sound]').last().click(); await page.locator('[data-set=music]').last().click();
    out.mute = await page.evaluate(() => ({ sound_setting: __game.state.settings.sound, music_setting: __game.state.settings.music, audio_enabled: __qa.audio.enabled, music_bus_gain: __qa.audio.musBus ? __qa.audio.musBus.gain.value : null, ctx_state: __qa.audio.ctx ? __qa.audio.ctx.state : null }));
    await page.locator('[data-set=sound]').last().click(); await page.locator('[data-set=music]').last().click();
    // 2b) 같은 화면 다시 그리기(설정 토글·시장 구매 등) 때 이전 화면이 남는가: ui.js show()가 같은 id는 지우지 않음
    out.stale_screens = await page.evaluate(() => { for (let i = 0; i < 5; i++) __game.go('settings'); const n1 = document.querySelectorAll('#app > #settings').length; for (let i = 0; i < 5; i++) __game.go('market'); return { settings_x5: n1, market_x5: document.querySelectorAll('#app > #market').length, app_children: document.getElementById('app').children.length }; });
    // 3) 백그라운드: visibilitychange 처리 유무 + 숨김 동안 오디오 상태 + 턴 타이머
    await page.evaluate(() => __game.go('heroes')); await coachSkipAll(page, 'next'); await page.locator('[data-nav=fight]').last().click(); await sleep(400);
    await page.evaluate(() => __game.mulligan([]));
    await page.waitForFunction(() => __game.battle.active === 0 && !__game.busy, null, { timeout: 30000 }).catch(() => {});
    const bg = await page.evaluate(async () => {
      const timerOf = () => { const el = document.querySelector('.timer .burn'); return el ? el.style.transform : null; };
      let handlers = 0; const oa = document.addEventListener; // 이후 등록은 셀 수 없으므로 소스 검사와 함께 판단
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('blur'));
      const g0 = __qa.G.now, h0 = __game.battle.half;
      await new Promise((r) => setTimeout(r, 3000));
      const res = { ctx_state_hidden: __qa.audio.ctx ? __qa.audio.ctx.state : null, game_clock_advanced_ms_while_hidden: Math.round(__qa.G.now - g0), half_changed: __game.battle.half !== h0, paused_flag_hidden: !!__game.paused };
      delete document.visibilityState; delete document.hidden; document.dispatchEvent(new Event('visibilitychange'));
      await new Promise((r) => setTimeout(r, 300));
      res.resume_overlay_after_visible = !!document.getElementById('pauseOvl'); res.still_paused_before_tap = !!__game.paused;
      document.querySelector('#pauseOvl button')?.click(); await new Promise((r) => setTimeout(r, 300));
      res.paused_after_tap = !!__game.paused; res.ctx_state_after_tap = __qa.audio.ctx ? __qa.audio.ctx.state : null; const g1 = __qa.G.now; await new Promise((r) => setTimeout(r, 500)); res.clock_runs_after_tap = __qa.G.now - g1 > 300;
      void handlers; void oa; void timerOf; return res;
    });
    // CDP 동결(실제 백그라운드 탭처럼 rAF·타이머 정지) 5 s → 재개 후 게임 시계 증가량
    const cdp = await ctx.newCDPSession(page);
    const g0 = await page.evaluate(() => __qa.G.now);
    await cdp.send('Page.setWebLifecycleState', { state: 'frozen' }); await sleep(5000); await cdp.send('Page.setWebLifecycleState', { state: 'active' });
    await sleep(100);
    bg.frozen_5s_game_clock_ms = Math.round(await page.evaluate(() => __qa.G.now) - g0);
    const src = ['main.js', 'battle.js', 'audio.js', 'anim.js', 'screens.js'].map((f) => readFileSync(join(REPO, 'games', 'tcg-01', 'js', f), 'utf8')).join('\n');
    bg.source_has_visibility_handler = /visibilitychange|document\.hidden|pagehide/.test(src);
    out.background = bg;
    await ctx.close();
  }
  // 4) 언어 ko/en: 메뉴 전 화면 글 넘침(360x640, 640x360)
  out.lang = {};
  for (const [w, h] of [[360, 640], [640, 360]]) for (const lang of ['ko', 'en']) {
    const { page, ctx } = await open(b, BASE + `?lang=${lang}`, { w, h });
    const rows = [];
    for (const sc of ['title', 'dock', 'heroes', 'collection', 'decks', 'crates', 'market', 'commissions', 'calendar', 'settings']) {
      await page.evaluate((sc) => __game.go(sc), sc); await sleep(250);
      const r = await inspect(page, `${sc}-${lang}-${w}x${h}`);
      rows.push({ sc, textOver: r.textOver, clipped: r.clipped, docScroll: r.docScroll });
      if (lang === 'en' && w === 360) await page.screenshot({ path: join(SHOTS, `en-${sc}-${w}x${h}.png`) });
    }
    await page.evaluate(() => __game.newBattle({ seed: 3, human: 0 })); await sleep(800); await page.evaluate(() => __game.mulligan([])); await sleep(2500);
    const r = await inspect(page, `battle-${lang}-${w}x${h}`); rows.push({ sc: 'battle', textOver: r.textOver, clipped: r.clipped });
    if (lang === 'en') await page.screenshot({ path: join(SHOTS, `en-battle-${w}x${h}.png`) });
    out.lang[`${lang}-${w}x${h}`] = { rows: rows.filter((x) => x.textOver.length || x.clipped.length), missingKeys: await page.evaluate(() => __game.missingKeys) };
    await ctx.close();
  }
  // 5) 덱 빌더 규칙: 실제 칸 탭으로 위반 시도
  {
    const { page, ctx } = await open(b, BASE + '?test=1', { w: 360, h: 640 });
    const r = await page.evaluate(async () => {
      const M = __qa.meta, D = __qa.D, S = __game.state;
      const hero = D.heroIds[0];
      // 모든 카드를 넉넉히 가진 상태(소유 제한이 규칙 검사를 가리지 않게)
      for (const c of D.list) S.coll[c.id] = { n: M.cap(c.id), res: 0, stage: 0 };
      __game.go('decks'); await new Promise((r) => setTimeout(r, 600)); document.querySelector(`[data-new="${hero}"]`).click(); await new Promise((r) => setTimeout(r, 600)); await new Promise((r) => setTimeout(r, 600)); 
      const deck = S.decks[S.decks.length - 1];
      const tap = (cid) => document.querySelector(`.collGrid [data-cid="${cid}"]`)?.click();
      const sand = D.list.find((c) => c.owner === hero && c.rarity !== 'abyss');
      const abyss = D.list.find((c) => (c.owner === hero || c.owner === 'neutral') && c.rarity === 'abyss');
      const other = D.list.find((c) => c.owner !== hero && c.owner !== 'neutral');
      for (let i = 0; i < 5; i++) { tap(sand.id); await new Promise((r) => setTimeout(r, 30)); }
      for (let i = 0; i < 3; i++) tap(abyss.id);
      const otherShown = !!document.querySelector(`.collGrid [data-cid="${other.id}"]`);
      // 30장 넘기기: 보이는 칸을 모두 3번씩
      for (const el of [...document.querySelectorAll('.collGrid [data-cid]')]) for (let i = 0; i < 3; i++) tap(el.dataset.cid);
      const cnt = {}; for (const c of deck.cards) cnt[c] = (cnt[c] || 0) + 1;
      const over2 = Object.entries(cnt).filter(([c, n]) => n > (D.cards[c].rarity === 'abyss' ? 1 : 2));
      // 빈 덱 저장 → 호명자 화면에서 고를 수 있는가
      const d2 = { id: 'qa-bad', name: 'qa bad', hero, cards: [sand.id] }; S.decks.push(d2);
      __game.go('heroes'); await new Promise((r) => setTimeout(r, 600)); const btn = document.querySelector('[data-deck="qa-bad"]'); btn?.click(); await new Promise((r) => setTimeout(r, 600)); 
      const selected = document.querySelector('[data-deck="qa-bad"]')?.classList.contains('sel');
      return { size: deck.cards.length, sand_copies: cnt[sand.id], abyss_copies: cnt[abyss.id], other_hero_card_shown: otherShown, over_limit: over2, owner_mismatch: deck.cards.filter((c) => D.cards[c].owner !== hero && D.cards[c].owner !== 'neutral').length, problems: M.deckProblems(deck), bad_deck_selectable: !!selected, bad_deck_btn_off: btn?.classList.contains('off') };
    });
    out.builder = r;
    // 6) 상자 1000개(훅 시뮬, 실제 meta.openCrate) + 확률 표시
    const crates = await page.evaluate(async () => {
      const M = __qa.meta, D = __qa.D; M.seedRng(20261118);
      __game.reset();
      const slot = { sand: 0, pearl: 0, coral: 0, abyss: 0 }, gslot = { sand: 0, pearl: 0, coral: 0, abyss: 0 };
      let abyssDupWhileUnowned = 0, pityGaps = [], since = 0, firstAbyssAt = null, coralGapMax = 0, sinceC = 0, packs = 1000;
      for (let i = 0; i < packs; i++) {
        const unownedAbyss = D.list.filter((c) => c.rarity === 'abyss' && M.owned(c.id) === 0).length;
        const r = M.openCrate('bare');
        r.slice(0, -1).forEach((x) => slot[x.rarity]++); gslot[r[r.length - 1].rarity]++;
        const hasA = r.some((x) => x.rarity === 'abyss'), hasC = r.some((x) => x.rarity === 'coral');
        for (const x of r) if (x.rarity === 'abyss' && !x.isNew && unownedAbyss > 0) abyssDupWhileUnowned++;
        since++; sinceC++;
        if (hasA) { pityGaps.push(since); since = 0; if (firstAbyssAt == null) firstAbyssAt = i + 1; }
        if (hasA || hasC) { coralGapMax = Math.max(coralGapMax, sinceC); sinceC = 0; }
      }
      // 확률 표 화면 글
      __game.go('crates'); [...document.querySelectorAll('button')].find((b) => b.textContent.includes(__qa.D.strings ? '' : '') && b.parentElement.classList.contains('scroll') && !b.dataset.open)?.click();
      const odds = [...document.querySelectorAll('.ovl .small')].map((e) => e.textContent);
      return { packs, slot, gslot, abyssDupWhileUnowned, pity_gap_max: Math.max(...pityGaps), first_abyss_at: firstAbyssAt, coral_gap_max: coralGapMax, abyss_packs: pityGaps.length, odds_text: odds, guarantee_text: document.querySelector('#crates .small')?.textContent };
    });
    out.crates = crates;
    // 7) 공명·새김 수치: 빌드 meta 값 vs 기획 balance.json(원본) + 카드 돌파 스탯 vs stat_rule(독립 계산) + 엔진 cardView
    out.breakthrough = await page.evaluate(() => {
      const M = __qa.meta, D = __qa.D, E = __game.engine; __game.reset();
      const rows = [];
      for (const r of ['sand', 'pearl', 'coral', 'abyss']) {
        const c = D.list.find((x) => x.rarity === r); const S = __game.state; delete S.coll[c.id];
        const got = []; for (let i = 0; i < 14; i++) got.push(M.addCopy(c.id));
        rows.push({ r, cid: c.id, cap: M.cap(c.id), thresholds: M.thresholds(c.id), per_extra: got.find((g) => g.res)?.res, ink_after_max: null, seq_res: got.map((g) => g.res) });
      }
      const views = D.list.map((c) => ({ id: c.id, kind: c.kind, cost: c.cost, base: [c.attack, c.health], bt: c.breakthrough || {}, v: [1, 2, 3].map((s) => { const v = E.cardView(c, s); return [v.attack, v.health]; }) }));
      return { rows, views };
    });
    await ctx.close();
  }
  await b.close();
  // 돌파 수치 대조(node, 기획 원본)
  const B = BAL.breakthrough, rule = B.stat_rule, pc = rj(join(PROJ, 'cards.json')).cards;
  const pcm = Object.fromEntries(pc.map((c) => [c.id, c]));
  const btRows = out.breakthrough.rows.map((r) => ({ ...r, exp_cap: B.copies_owned_before_resonance[r.r], exp_thr: B.resonance_cumulative_for_stage[r.r], exp_per: B.resonance_per_extra_copy[r.r], ok: r.cap === B.copies_owned_before_resonance[r.r] && JSON.stringify(r.thresholds) === JSON.stringify(B.resonance_cumulative_for_stage[r.r]) && r.per_extra === B.resonance_per_extra_copy[r.r] }));
  // 응답자: 1단계 체력 +1, 2단계 비용 4+면 공격 +1, 3단계 외형, 비용 ≤3 총 +1·전체 총 +2 상한
  const viol = [];
  for (const v of out.breakthrough.views) {
    const c = pcm[v.id]; if (!c || c.kind !== 'minion') continue;
    const exc = (rule.exception_cheap_charge && JSON.stringify(rule.exception_cheap_charge).includes(v.id)) || (c.breakthrough && Object.values(c.breakthrough).every((x) => !x || !Object.keys(x).some((k) => ['attack', 'health'].includes(k))) && c.cost <= 3 && (c.keywords || []).includes('charge'));
    const exp1 = exc ? [c.attack, c.health] : [c.attack, c.health + 1], exp2 = exc ? [c.attack, c.health] : [c.attack + (c.cost >= 4 ? 1 : 0), c.health + 1];
    if (JSON.stringify(v.v[0]) !== JSON.stringify(exp1)) viol.push(`${v.id} s1 ${v.v[0]} 기대 ${exp1}`);
    if (JSON.stringify(v.v[1]) !== JSON.stringify(exp2)) viol.push(`${v.id} s2 ${v.v[1]} 기대 ${exp2}`);
    if (JSON.stringify(v.v[2]) !== JSON.stringify(v.v[1])) viol.push(`${v.id} s3 ${v.v[2]} ≠ s2(외형만이어야)`);
  }
  out.breakthrough = { rows: btRows, minion_rule_violations: viol.slice(0, 30), minion_rule_violation_n: viol.length, minions_checked: out.breakthrough.views.filter((v) => pcm[v.id]?.kind === 'minion').length };
  // 상자 기대값(기획 원본 확률)
  const E = BAL.economy, n4 = out.crates.packs * (E.crates.bare_sea_crate.cards - 1);
  out.crates.expected_slot = Object.fromEntries(Object.entries(E.rarity_slot_prob).map(([k, p]) => [k, { exp: +(p * n4).toFixed(0), obs: out.crates.slot[k], z: +((out.crates.slot[k] - p * n4) / Math.sqrt(n4 * p * (1 - p))).toFixed(2) }]));
  out.crates.expected_guarantee = Object.fromEntries(Object.entries(E.rarity_guarantee_slot_prob).map(([k, p]) => [k, { exp_no_pity: +(p * out.crates.packs).toFixed(0), obs: out.crates.gslot[k] }]));
  out.crates.pity_spec = E.pity;
  // 실결제·외부 링크(정적)
  const all = ['index.html', 'js/main.js', 'js/screens.js', 'js/battle.js', 'js/meta.js', 'js/ads.js', 'js/ui.js', 'js/cards.js'].map((f) => readFileSync(join(REPO, 'games', 'tcg-01', f), 'utf8')).join('\n');
  out.static = { http_urls: [...new Set(all.match(/https?:\/\/[^\s'"`)]+/g) || [])], window_open: /window\.open|location\.href\s*=|target=['"]_blank/.test(all), payment_words: (all.match(/payment|purchase|billing|checkout|iap|PaymentRequest/gi) || []).length, ads_calls: (all.match(/ads\.(show|load|request)/g) || []).length };
  save('func', { log: LOG, ...out });
}

// ================= info: 같은 시드 AI 대 AI를 보통·빠르게·매 행동 건너뛰기로(게임 시계) → 피해·회복 숫자 수, 최종 화면 = 엔진 =================
async function partInfo() {
  const b = await browser();
  const rows = [];
  for (const [hA, hB, seed] of [['h_rider', 'h_warden', 515], ['h_wreck', 'h_choir', 516], ['h_archive', 'h_nameless', 517], ['h_choir', 'h_rider', 518]]) for (const mode of ['normal', 'fast', 'skip']) {
    const { page, ctx } = await open(b, BASE + '?test=1&manual=1', { w: 360, h: 640 });
    const r = await page.evaluate(async ({ hA, hB, seed, mode }) => {
      __game.setFast(mode === 'fast'); await __game.newBattle({ heroA: hA, heroB: hB, seed, ai: 'eval', human: null }); window.__qa.nums = 0;
      let last = 0, hpMis = 0, checks = 0;
      for (let g = 0; g < 400000 && !__game.battle.over; g++) {
        __game.step(16);
        const n = __game.tempoLog.actions.length;
        if (n !== last) { last = n; if (mode === 'skip') __game.finishAnim(); }
        if (!__game.busy && g % 25 === 0) { checks++; const bt = __game.battle; const hp = [...document.querySelectorAll('.hero[data-uid]')].map((e) => e.textContent); const want = bt.players.map((P) => String(P.hero.hp)); if (!want.every((w) => hp.some((t) => t.includes(w)))) hpMis++; }
      }
      for (let i = 0; i < 600; i++) __game.step(16);
      const toks = document.querySelectorAll('[data-uid]:not(.hero)').length; const bt = __game.battle;
      return { actions: __game.export().actions.length, winner: bt.winner, nums: window.__qa.nums, skipped: __game.tempoLog.actions.filter((a) => a.skipped).length, dom_tokens: toks, engine_tokens: bt.players[0].board.length + bt.players[1].board.length, idle_checks: checks, idle_hp_mismatch: hpMis };
    }, { hA, hB, seed, mode });
    rows.push({ hA, hB, seed, mode, ...r });
    console.log(hA, hB, mode, JSON.stringify(r));
    await ctx.close();
  }
  await b.close();
  save('info', { log: LOG, rows });
}

// ================= resp: 첫 반응 독립 측정(빌드 tempoLog를 쓰지 않음) — pointerdown(timeStamp) → 눌린 요소의 transform이 처음 바뀐 프레임 =================
async function partResp() {
  const b = await browser();
  const out = [];
  for (const rate of [1, 6]) {
    const { page, ctx } = await open(b, BASE, { w: 360, h: 640 });
    if (rate > 1) { const c = await ctx.newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate }); }
    await page.mouse.click(180, 320); await sleep(300);
    await page.evaluate(() => __game.newBattle({ seed: 31, human: 0, noTimer: true })); await sleep(1200); await page.evaluate(() => __game.mulligan([]));
    await page.waitForFunction(() => __game.battle.active === 0 && !__game.busy, null, { timeout: 60000 });
    await sleep(1500);
    await page.evaluate(() => { window.__rs = []; addEventListener('pointerdown', (e) => { const el = e.target.closest('[data-hand],[data-k],[data-uid]'); if (!el) return; const t0 = e.timeStamp, tf0 = el.style.transform + '|' + (el.firstElementChild ? el.firstElementChild.style.transform : ''); const f = (ts) => { const tf = el.style.transform + '|' + (el.firstElementChild ? el.firstElementChild.style.transform : ''); if (tf !== tf0) window.__rs.push({ k: el.dataset.k || (el.dataset.hand ? 'hand' : 'uid'), ms: Math.round(performance.now() - t0) }); else if (performance.now() - t0 < 1000) requestAnimationFrame(f); else window.__rs.push({ k: 'none', ms: 1000 }); }; requestAnimationFrame(f); }, { capture: true }); });
    for (let i = 0; i < 15; i++) {
      const pts = await page.evaluate(() => [...document.querySelectorAll('[data-hand]')].map((e) => { const r = e.getBoundingClientRect(); return { x: Math.min(355, Math.max(5, r.left + r.width / 2)), y: r.top + 20 }; }));
      const p = pts[i % pts.length]; await page.mouse.move(p.x, p.y); await page.mouse.down(); await sleep(120); await page.mouse.up(); await sleep(250);
      await page.mouse.click(180, 8); await sleep(250);
    }
    const end = await page.evaluate(() => { const r = document.querySelector('[data-k=end]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.click(end.x, end.y); await sleep(300);
    const rs = await page.evaluate(() => window.__rs);
    out.push({ cpu_rate: rate, n: rs.length, ms: stats(rs.map((x) => x.ms)), none: rs.filter((x) => x.k === 'none').length, by: rs });
    await ctx.close();
  }
  await b.close();
  save('resp', { log: LOG, runs: out });
}

// ================= tut: 첫 연습 판 튜토리얼 순서(실제 메뉴 경로, 새 저장소, 무작위 시드) =================
async function partTut() {
  const b = await browser();
  const runs = [];
  const n = +opt('--tut-runs', '8');
  for (let i = 0; i < n; i++) {
    const [w, h] = i < 2 ? [[360, 640], [640, 360]][i] : [360, 640];
    const { page, ctx } = await open(b, BASE, { w, h });
    await page.mouse.click(w / 2, h / 2); await sleep(300);
    await page.locator('[data-nav=play]').last().click(); await sleep(400);
    await coachSkipAll(page, 'next'); await page.locator('[data-nav=fight]').last().click(); await sleep(1200);
    await page.evaluate(() => __game.mulligan([]));
    const seq = [];
    for (let k = 0; k < 400 && seq.length < 10; k++) {
      const st = await page.evaluate(() => { const b = __game.battle; if (!b) return null; const el = document.querySelector('.tut'); const L = __game.legal(); return { over: b.over, half: b.half, active: b.active, busy: __game.busy, tut: el ? el.dataset.tut : null, playable: b.active === 0 && L.some((a) => a.type === 'play'), onlyEnd: b.active === 0 && L.length === 1 }; });
      if (!st || st.over) break;
      if (st.tut && (!seq.length || seq[seq.length - 1].step !== st.tut)) {
        seq.push({ step: st.tut, turn: Math.ceil(st.half / 2), playable_now: st.playable, only_end: st.onlyEnd });
        if (i < 2 && seq.length <= 3) await page.screenshot({ path: join(SHOTS, `tut-${String(seq.length).padStart(2, '0')}-${st.tut}-${w}x${h}.png`) });
        await sleep(300);
        await page.locator('.tut .btn.primary').last().click().catch(() => {}); await sleep(200);
        continue;
      }
      if (st.active === 0 && !st.busy) await page.evaluate(() => __game.runAI());
      await sleep(250);
    }
    const first3 = seq.findIndex((x) => x.step === 'tut_3_play'), first8 = seq.findIndex((x) => x.step === 'tut_8_end');
    runs.push({ view: `${w}x${h}`, seq, end_before_play: first8 >= 0 && (first3 < 0 || first8 < first3), steps_shown: seq.length });
    await ctx.close();
  }
  await b.close();
  save('tut', { log: LOG, runs, end_before_play_n: runs.filter((r) => r.end_before_play).length, runs_n: runs.length });
}

// ================= terms: 용어·튜토리얼·메뉴 안내·카드 스토리 (2026-11-18 요청자 지시 4건) =================
const coachSkipAll = async (page, mode = 'next') => { for (let i = 0; i < 12; i++) { const b = await page.$(mode === 'next' ? '[data-coach-next]' : '[data-coach-skip]'); if (!b) break; await b.click().catch(() => {}); await sleep(150); } };
function termLists() {
  const src = readFileSync(join(PROJ, 'lore', 'check-cards.mjs'), 'utf8');
  const arr = (name) => JSON.parse(src.match(new RegExp(`const ${name} = (\\[[^\\]]*\\]);`))[1].replace(/'/g, '"'));
  const S = rj(join(REPO, 'games', 'tcg-01', 'data', 'strings.json')), C = rj(join(REPO, 'games', 'tcg-01', 'data', 'cards.json')).cards;
  const STORY_KEY = /^(game_title|game_subtitle|chronicle_title|faction_|story_arc_|hero_[a-z]+_(name|title|power)|line_|result_(victory|defeat)_sub_)/;
  const allow = [];
  for (const L of ['ko', 'en']) for (const [k, v] of Object.entries(S[L])) if (STORY_KEY.test(k) && v) allow.push(v);
  for (const c of C) allow.push(c.name_ko, c.name_en, c.flavor_ko, c.flavor_en, c.story_ko, c.story_en);
  allow.push('썰물 영장', '썰물 연대기', 'Ebbwrit', 'Ebb Chronicle', '노해의 호명자들', 'Callers of the Bare Sea', '익사자'); // 익사자: 세력·부류 이름 허용(10-lore 2-8)
  return { BANNED_KO: arr('BANNED_KO'), BANNED_EN: arr('BANNED_EN'), OLD_KO: arr('OLD_KO'), OLD_EN: arr('OLD_EN'), allow: allow.filter(Boolean).sort((a, b) => b.length - a.length) };
}
function scanText(txt, TL) {
  let t = txt; for (const a of TL.allow) if (a.length >= 2) t = t.split(a).join(' ');
  const old = [...TL.OLD_KO.filter((w) => t.includes(w)), ...TL.OLD_EN.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(t))];
  const ban = [...TL.BANNED_KO.filter((w) => t.includes(w)), ...TL.BANNED_EN.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(t))];
  return { old, ban };
}
const overlapR = (a, b) => a && b && Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;
async function partTerms() {
  const TL = termLists();
  const b = await browser();
  const R = { dom: [], tutorial: [], guides: null, story: [], battle_story: null };
  const only = opt('--only', 'dom,tut,guides,story,battle').split(',');
  // T1 화면 글: 4해상도 × ko/en
  if (only.includes('dom')) for (const [w, h] of VIEWS) for (const lang of ['ko', 'en']) {
    const { page, ctx } = await open(b, BASE + `?lang=${lang}`, { w, h, touch: w < 1000 });
    for (const sc of ['title', 'dock', 'heroes', 'collection', 'decks', 'crates', 'market', 'commissions', 'calendar', 'settings', 'glossary']) {
      await page.evaluate((sc) => __game.go(sc), sc); await sleep(450);
      const coachTxt = await page.evaluate(() => [...document.querySelectorAll('.coach')].map((e) => e.textContent).join(' '));
      const ins = await inspect(page, `${sc}-${lang}-${w}x${h}`);
      const txt = await page.evaluate(() => document.body.innerText);
      const s = scanText(txt + ' ' + coachTxt, TL);
      R.dom.push({ view: `${w}x${h}`, lang, sc, old: s.old, ban: s.ban, textOver: ins.textOver, clipped: ins.clipped.filter((x) => !x.startsWith('hand')), small: ins.small, coach: coachTxt ? 1 : 0 });
      if (w === 360 || sc === 'glossary') await page.screenshot({ path: join(SHOTS, `t-${sc}-${lang}-${w}x${h}.png`) });
      await coachSkipAll(page, 'skip');
    }
    await ctx.close();
  }
  // T2 튜토리얼
  const runs = opt('--tut-runs-spec', '') ? JSON.parse(opt('--tut-runs-spec', '[]')) : [[360, 640], [412, 915], [640, 360], [1280, 720], [360, 640], [360, 640], [360, 640], [360, 640, 'skip']];
  if (only.includes('tut')) for (const [w, h, mode] of runs) {
    const { page, ctx } = await open(b, BASE, { w, h, touch: w < 1000 });
    await page.mouse.click(w / 2, h / 2); await sleep(300);
    await page.locator('[data-nav=play]').last().click(); await sleep(500);
    const menuCoach = [];
    for (let i = 0; i < 4; i++) { const k = await page.evaluate(() => document.querySelector('.coach')?.dataset.coach || null); if (!k) break; menuCoach.push(k); await page.locator(mode === 'skip' ? '[data-coach-skip]' : '[data-coach-next]').first().click(); await sleep(200); }
    await coachSkipAll(page, 'next'); await page.locator('[data-nav=fight]').last().click(); await sleep(1300);
    const mullCoach = await page.evaluate(() => document.querySelector('.coach')?.dataset.coach || document.querySelector('.tut')?.dataset.tut || null);
    await coachSkipAll(page, mode === 'skip' ? 'skip' : 'next');
    await page.evaluate(() => { __game.mulligan([]); __game.setAnimScale(0.35); window.__hum = __game.export().heroes.indexOf(__game.state.lastHero); });
    const seq = []; const cover = []; let skipped = false;
    for (let k = 0; k < 2400; k++) {
      const st = await page.evaluate(() => {
        const bt = __game.battle; if (!bt) return null; const el = document.querySelector('.tut'); const L = __game.legal();
        const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left, y: r.top, w: r.width, h: r.height } : null; };
        const ring = document.querySelector('.spotRing'); const ringR = ring && ring.style.display !== 'none' ? R(ring) : null;
        const toks = [...document.querySelectorAll('[data-uid]')].map(R).filter(Boolean);
        return { over: bt.over, half: bt.half, active: bt.active === window.__hum ? 0 : 1, busy: __game.busy, tut: el ? el.dataset.tut : null, panel: R(el), next: R(document.querySelector('[data-tut-next]')), skip: R(document.querySelector('[data-tut-skip]')), ring: ringR, toks,
          playable: bt.active === window.__hum && L.some((a) => a.type === 'play'), result: !!document.getElementById('result') };
      });
      if (!st) break;
      if (st.result || st.over) break;
      if (st.tut && (!seq.length || seq[seq.length - 1].step !== st.tut)) {
        const turn = Math.ceil(st.half / 2);
        const pr = [st.panel, st.next, st.skip];
        const hitTarget = st.ring && pr.some((r) => overlapR(r, st.ring));
        const hitTok = st.toks.filter((t) => pr.some((r) => overlapR(r, t))).length;
        seq.push({ step: st.tut, turn, playable: st.playable });
        cover.push({ step: st.tut, target: !!hitTarget, tokens: hitTok });
        if (k < 400 && (w !== 360 || seq.length <= 4) && runs.indexOf(runs.find((x) => x[0] === w && x[1] === h)) === runs.findIndex((x) => x[0] === w && x[1] === h && !x[2])) await page.screenshot({ path: join(SHOTS, `tut-${w}x${h}-${String(seq.length).padStart(2, '0')}-${st.tut}.png`) }).catch(() => {});
        if (mode === 'skip') { await page.locator('[data-tut-skip]').first().click(); skipped = true; await sleep(200); continue; }
        if (/^tut_play|^tut_attack|^tut_ability|^tut_end$/.test(st.tut)) await page.evaluate(() => __game.runAI()); else await page.locator('[data-tut-next]').first().click().catch(() => {});
        await sleep(200); continue;
      }
      if (st.active === 0 && !st.busy) await page.evaluate(() => __game.runAI());
      await sleep(120);
    }
    await page.waitForFunction(() => !!document.getElementById('result'), null, { timeout: 240000 }).catch(() => {});
    await sleep(800);
    const endState = await page.evaluate(() => ({ result: !!document.getElementById('result'), over: !!__game.battle?.over, half: __game.battle?.half, tut: { ...__game.state.tut, seen: (__game.state.tut?.seen || []).length } }));
    await page.locator('#result [data-nav=menu]').last().click().catch(() => {}); await sleep(700);
    const doneCoach = await page.evaluate(() => document.querySelector('.coach')?.dataset.coach || null);
    await coachSkipAll(page, 'next');
    await page.reload(); await page.waitForFunction(() => window.__game && window.__game.ready); await attach(page);
    await page.mouse.click(w / 2, h / 2); await sleep(300);
    await page.locator('[data-nav=play]').last().click(); await sleep(600);
    const again = { menuCoach: await page.evaluate(() => document.querySelector('.coach')?.dataset.coach || null) };
    await coachSkipAll(page, 'next');
    await coachSkipAll(page, 'next'); await page.locator('[data-nav=fight]').last().click(); await sleep(1300);
    again.mullCoach = await page.evaluate(() => document.querySelector('.coach')?.dataset.coach || null);
    await coachSkipAll(page, 'next');
    await page.evaluate(() => { __game.mulligan([]); __game.setAnimScale(0.35); window.__hum = __game.export().heroes.indexOf(__game.state.lastHero); });
    let tutAgain = 0; const againSteps = new Set();
    for (let k = 0; k < 200; k++) { const s2 = await page.evaluate(() => ({ t: document.querySelector('.tut')?.dataset.tut || null, half: __game.battle?.half || 0, a: __game.battle?.active === window.__hum ? 0 : 1, busy: __game.busy })); if (s2.t) { tutAgain++; againSteps.add(s2.t); } if (s2.half >= 5) break; if (s2.a === 0 && !s2.busy) await page.evaluate(() => __game.runAI()); await sleep(150); }
    again.tut_panels = tutAgain; again.steps = [...againSteps]; again.repeated_seen = again.steps.filter((k) => seq.some((x) => x.step === k));
    const iNo = seq.findIndex((x) => x.step === 'tut_no_play'), iPlay = seq.findIndex((x) => /^tut_play/.test(x.step)), iEnd = seq.findIndex((x) => x.step === 'tut_end');
    const firstLearn = [iNo, iPlay].filter((x) => x >= 0); const learnIdx = firstLearn.length ? Math.min(...firstLearn) : -1;
    R.tutorial.push({ view: `${w}x${h}`, mode: mode || 'complete', menuCoach, mullCoach, seq, steps: seq.length, end_before_learn: iEnd >= 0 && (learnIdx < 0 || iEnd < learnIdx), no_play_turn1: seq.some((x) => x.step === 'tut_no_play' && x.turn === 1),
      cover_target: cover.filter((c) => c.target).map((c) => c.step), cover_tokens: cover.filter((c) => c.tokens).map((c) => `${c.step}:${c.tokens}`), doneCoach, skipped, again, endState });
    console.log(w, h, mode || 'complete', seq.map((x) => x.step.replace('tut_', '') + '@' + x.turn).join(' '), '| done', doneCoach, '| again', JSON.stringify(again));
    await ctx.close();
  }
  // T3 메뉴 첫 진입 안내 8개: 한 번만
  if (only.includes('guides')) {
    const { page, ctx } = await open(b, BASE, { w: 360, h: 640 });
    await page.mouse.click(180, 320); await sleep(300);
    const seen = [];
    const grab = async () => { for (let i = 0; i < 6; i++) { const k = await page.evaluate(() => document.querySelector('.coach')?.dataset.coach || null); if (!k) break; seen.push(k); await page.locator('[data-coach-next]').first().click().catch(() => {}); await sleep(250); } };
    const visit = async () => {
      await page.evaluate(() => __game.go('crates')); await sleep(600); await grab();
      await page.evaluate(() => { const S = __game.state; const id = Object.keys(S.coll).find((k) => S.coll[k].n > 0); S.coll[id].res = __qa.meta.thresholds(id)[1]; window.__cid = id; __game.go('collection'); }); await sleep(600);
      const cid = await page.evaluate(() => window.__cid); await page.locator(`[data-cid="${cid}"]`).last().click(); await sleep(700); await grab();
      await page.locator('[data-act=close]').last().click().catch(() => {}); await sleep(200);
      await page.evaluate(() => { __game.state.crates.bare = Math.max(2, __game.state.crates.bare); __game.go('crates'); }); await sleep(500); await grab();
      await page.locator('[data-open=bare]').last().click(); await sleep(1500); await page.locator('[data-act=revealAll]').last().click().catch(() => {}); await sleep(6000); await grab();
      await page.evaluate(() => __game.go('heroes')); await sleep(600); await grab();
      await page.locator('[data-mode=mode_accord]').last().click().catch(() => {}); await sleep(500); await grab();
    };
    await visit(); const first = [...seen]; seen.length = 0; await visit();
    const guides = first.filter((k) => k.startsWith('guide_'));
    R.guides = { first, second: [...seen], guide_unique: [...new Set(guides)], repeats_second: seen.filter((k) => k.startsWith('guide_')).length, dup_first: guides.length - new Set(guides).size };
    console.log('guides', JSON.stringify(R.guides));
    await ctx.close();
  }
  // T4 카드 스토리
  const allIds = rj(join(REPO, 'games', 'tcg-01', 'data', 'cards.json')).cards.map((c) => c.id);
  if (only.includes('story')) for (const [w, h] of VIEWS) for (const lang of ['ko', 'en']) {
    const { page, ctx } = await open(b, BASE + `?lang=${lang}`, { w, h, touch: w < 1000 });
    await page.evaluate(() => { const S = __game.state; for (const c of __qa.D.list) S.coll[c.id] = S.coll[c.id] || { n: 1, res: 0, stage: 0 }; S.guides = S.guides || {}; ['guide_craft_1', 'guide_craft_2', 'guide_exp_2', 'guide_exp_1', 'guide_pack_1', 'guide_pack_2', 'guide_ranked_1', 'guide_ranked_2'].forEach((k) => (S.guides[k] = true)); });
    const sample = w === 360 ? allIds.filter((_, i) => i % 5 === 0) : allIds.filter((_, i) => i % 25 === 0);
    for (const cid of sample) {
      const r = await page.evaluate(async (cid) => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        __game.go('collection'); await wait(300);
        let cell = null; for (let i = 0; i < 20 && !(cell = document.querySelector(`[data-cid="${cid}"]`)); i++) await wait(100);
        if (!cell) return { cid, err: 'no cell' }; cell.click(); await wait(400);
        const sb = document.querySelector('[data-act=story]'); if (!sb) return { cid, err: 'no story btn' };
        const sbr = sb.getBoundingClientRect();
        const out = { cid, btn: [Math.round(sbr.width), Math.round(sbr.height)] };
        sb.click(); await wait(350);
        const p = document.querySelector('.storyPanel'); out.open1 = !!p;
        if (p) { const pr = p.getBoundingClientRect(); out.inView = pr.left >= -1 && pr.top >= -1 && pr.right <= innerWidth + 1 && pr.bottom <= innerHeight + 1; const tx = p.querySelector('.storyText'); out.scroll = tx ? tx.scrollHeight > tx.clientHeight + 2 : false; out.more = tx ? (tx.classList.contains('more') || !!p.querySelector('.more, .moreArrow')) : false; out.text = tx ? tx.textContent : ''; out.btns = [...p.querySelectorAll('button')].map((b) => { const r = b.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); }); out.wordOver = [...p.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 2 && !/(auto|scroll)/.test(getComputedStyle(e).overflowX + getComputedStyle(e).overflowY)).length; }
        const box = document.querySelector('.ovl'); if (box) { const r = box.getBoundingClientRect(); box.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + 4, clientY: r.top + 4 })); } await wait(350); out.closeOutside = !document.querySelector('.storyPanel');
        document.querySelector('[data-act=story]')?.click(); await wait(350); document.querySelector('[data-act=storyClose]')?.click(); await wait(350); out.closeBtn = !document.querySelector('.storyPanel');
        document.querySelector('[data-act=story]')?.click(); await wait(350); dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await wait(350); out.closeEsc = !document.querySelector('.storyPanel');
        document.querySelector('[data-act=story]')?.click(); await wait(350); document.querySelector('[data-act=story]')?.click(); await wait(350); out.closeToggle = !document.querySelector('.storyPanel');
        document.querySelector('[data-act=close]')?.click(); await wait(300); out.detailClosed = !document.querySelector('[data-act=story]');
        return out;
      }, cid);
      const ban = r.text ? scanText(r.text, { ...TL, allow: [] }).ban : [];
      R.story.push({ view: `${w}x${h}`, lang, ...r, textLen: r.text ? [...r.text].length : 0, text: undefined, ban });
      if (cid === sample[1]) { await page.evaluate(async (cid) => { __game.go('collection'); await new Promise((r) => setTimeout(r, 400)); document.querySelector(`[data-cid="${cid}"]`)?.click(); await new Promise((r) => setTimeout(r, 400)); document.querySelector('[data-act=story]')?.click(); }, cid); await sleep(500); await page.screenshot({ path: join(SHOTS, `story-${lang}-${w}x${h}.png`) }); await page.evaluate(() => document.querySelector('[data-act=close]')?.click()); await sleep(200); }
    }
    console.log('story', w, h, lang, R.story.filter((s) => s.view === `${w}x${h}` && s.lang === lang).length);
    await ctx.close();
  }
  // T4b 대전 중 길게 누르기: 스토리 안 열림, 시계 계속
  if (only.includes('battle')) {
    const { page, ctx } = await open(b, BASE + '?tut=0', { w: 360, h: 640 });
    await page.mouse.click(180, 320); await sleep(300);
    await page.evaluate(() => __game.newBattle({ seed: 31, human: 0, noTimer: false })); await sleep(1200); await page.evaluate(() => __game.mulligan([]));
    await page.waitForFunction(() => __game.battle.active === 0 && !__game.busy, null, { timeout: 60000 }); await sleep(800);
    const hc = await page.$('[data-hand]'); const r = await hc.boundingBox();
    const g0 = await page.evaluate(() => __qa.G.now);
    await page.mouse.move(r.x + r.width / 2, r.y + 20); await page.mouse.down(); await sleep(900);
    R.battle_story = await page.evaluate((g0) => ({ zoom: !!document.querySelector('.zoomWrap'), story: !!document.querySelector('.storyPanel'), clock_ms: Math.round(__qa.G.now - g0), paused: !!__game.paused }), g0);
    await page.screenshot({ path: join(SHOTS, 'story-battle-longpress-360x640.png') });
    await page.mouse.up(); await ctx.close();
  }
  await b.close();
  const sum = {
    dom_checked: R.dom.length, dom_old: R.dom.filter((d) => d.old.length).map((d) => `${d.sc}-${d.lang}-${d.view}: ${d.old.join('·')}`), dom_ban: R.dom.filter((d) => d.ban.length).map((d) => `${d.sc}-${d.lang}-${d.view}: ${d.ban.join('·')}`),
    dom_textOver: R.dom.filter((d) => d.textOver.length).map((d) => `${d.sc}-${d.lang}-${d.view}: ${d.textOver.join('|')}`), dom_clipped: R.dom.filter((d) => d.clipped.length).map((d) => `${d.sc}-${d.lang}-${d.view}: ${d.clipped.slice(0, 3).join('|')}`), dom_small: R.dom.filter((d) => d.small.length).map((d) => `${d.sc}-${d.lang}-${d.view}: ${d.small.slice(0, 4).join('|')}`),
    tut_runs: R.tutorial.length, tut_end_before_learn: R.tutorial.filter((t) => t.end_before_learn).length, tut_cover_target: R.tutorial.flatMap((t) => t.cover_target.map((s) => `${t.view}:${s}`)), tut_cover_tokens: R.tutorial.flatMap((t) => t.cover_tokens.map((s) => `${t.view}:${s}`)), tut_again: R.tutorial.map((t) => t.again), tut_done: R.tutorial.map((t) => t.doneCoach),
    story_n: R.story.length, story_err: R.story.filter((s) => s.err).map((s) => `${s.view}-${s.lang}-${s.cid}: ${s.err}`), story_not_open: R.story.filter((s) => !s.err && !s.open1).length, story_out_of_view: R.story.filter((s) => s.inView === false).length,
    story_btn_small: R.story.filter((s) => (s.btn && Math.min(...s.btn) < 48) || (s.btns || []).some((x) => x < 48)).map((s) => `${s.view}-${s.lang}-${s.cid} ${s.btn} ${s.btns}`).slice(0, 10),
    story_close_fail: R.story.filter((s) => !s.err && !(s.closeOutside && s.closeBtn && s.closeEsc && s.closeToggle && s.detailClosed)).map((s) => `${s.view}-${s.lang}-${s.cid}: out ${s.closeOutside} btn ${s.closeBtn} esc ${s.closeEsc} tog ${s.closeToggle} back ${s.detailClosed}`).slice(0, 10),
    story_scroll_no_hint: R.story.filter((s) => s.scroll && !s.more).length, story_word_over: R.story.filter((s) => s.wordOver).length, story_ban: R.story.filter((s) => s.ban && s.ban.length).length,
  };
  save('terms-' + only.join('_'), { log: LOG, summary: sum, ...R });
}

// ================= uxshots: 글을 가린 카드 스크린샷 세트(360x640) + 색약 3종, 정답은 따로 =================
async function partUxShots() {
  const C = rj(join(REPO, 'games', 'tcg-01', 'data', 'cards.json')).cards;
  const pick = ['D009', 'B052', 'B053', 'B056', 'B099', 'A008', 'A006', 'A034', 'A032', 'A030'].filter((id) => C.find((c) => c.id === id));
  const deck = []; for (let i = 0; deck.length < 30; i++) deck.push(pick[i % pick.length]);
  const UXD = join(PROJ, 'reviews', 'terms', 'ux-shots'); mkdirSync(UXD, { recursive: true });
  const CVD = { protan: '0.152286 1.052583 -0.204868 0 0  0.114503 0.786281 0.099216 0 0  -0.003882 -0.048116 1.051998 0 0  0 0 0 1 0', deutan: '0.367322 0.860646 -0.227968 0 0  0.280085 0.672501 0.047413 0 0  -0.011820 0.042940 0.968881 0 0  0 0 0 1 0', tritan: '1.255528 -0.076749 -0.178779 0 0  -0.078411 0.930809 0.147602 0 0  0.004733 0.691367 0.303900 0 0  0 0 0 1 0' };
  const b = await browser();
  const { page } = await open(b, BASE + '?test=1&manual=1&tut=0', { w: 360, h: 640 });
  // 시드를 바꿔 가며 손패 6장 이상 + 손패·필드의 유형×종류 조합이 가장 많은 순간을 고름
  const best = await page.evaluate(async ({ deck, meta }) => {
    const combos = () => { const bt = __game.battle; const set = new Set(); for (const h of bt.players[0].hand) if (meta[h.cid]) set.add(meta[h.cid].family + '|' + meta[h.cid].kind); for (const P of bt.players) for (const m of P.board) if (meta[m.cid]) set.add(meta[m.cid].family + '|' + meta[m.cid].kind); return set.size; };
    let best = { seed: null, score: -1, half: 0 };
    for (let seed = 2600; seed < 2640; seed++) for (const stop of [5, 7]) {
      await __game.newBattle({ heroA: 'h_rider', heroB: 'h_choir', seed, human: 0, deckA: deck, noTimer: true }); __game.mulligan([]);
      for (let g = 0; g < 6000 && __game.battle.half < stop && !__game.battle.over; g++) { const bt = __game.battle; if (bt.active === 0 && !__game.busy) { const L = __game.legal(); const pl = L.find((x) => x.type === 'play' && (x.hand % 2 === 0)) || L.find((x) => x.type === 'attack') ; __game.act(pl || { type: 'end' }); } __game.step(50); }
      if (__game.battle.over) continue;
      const sc = combos() + (__game.battle.players[0].hand.length >= 6 ? 3 : 0);
      if (sc > best.score) best = { seed, stop, score: sc };
    }
    return best;
  }, { deck, meta: Object.fromEntries(C.map((c) => [c.id, { family: c.family, kind: c.kind }])) });
  await page.evaluate(async ({ deck, best }) => {
    await __game.newBattle({ heroA: 'h_rider', heroB: 'h_choir', seed: best.seed, human: 0, deckA: deck, noTimer: true }); __game.mulligan([]);
    for (let g = 0; g < 6000 && __game.battle.half < best.stop; g++) { const bt = __game.battle; if (bt.active === 0 && !__game.busy) { const L = __game.legal(); const pl = L.find((x) => x.type === 'play' && (x.hand % 2 === 0)) || L.find((x) => x.type === 'attack'); __game.act(pl || { type: 'end' }); } __game.step(50); }
    for (let g = 0; g < 3000 && !(__game.battle.active === 0 && !__game.busy); g++) __game.step(50);
    for (let i = 0; i < 80; i++) __game.step(16);
  }, { deck, best });
  console.log('ux 시드', JSON.stringify(best));
  const answer = { note: '검수자에게 보이지 않게 따로 둔 정답. 이미지별 카드 상자(x,y,w,h px)·카드 id·유형(family)·종류(kind)', families: ['draw', 'buff', 'debuff', 'strike', 'atkdraw'], images: {} };
  const meta = Object.fromEntries(C.map((c) => [c.id, { family: c.family, kind: c.kind }]));
  const collect = async () => page.evaluate((meta) => {
    const bt = __game.battle; const uidc = {}; for (const P of bt.players) for (const m of P.board) uidc[m.uid] = m.cid;
    const R = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none'; };
    const out = [];
    for (const e of document.querySelectorAll('[data-hand]')) { const cid = e._hc && e._hc.cid; if (cid && meta[cid] && vis(e)) out.push({ where: 'hand', box: R(e), cid, ...meta[cid] }); }
    for (const e of document.querySelectorAll('[data-uid]:not(.hero)')) { const cid = uidc[+e.dataset.uid]; if (cid && meta[cid] && vis(e)) out.push({ where: 'field', box: R(e), cid, ...meta[cid] }); }
    const z = document.querySelector('.zoomWrap'); if (z && vis(z)) { const cid = window.__zcid || ([...document.querySelectorAll('[data-hand]')].find((e) => e._lift) || {})._hc?.cid; out.push({ where: 'zoom', box: R(z), cid: cid || null, ...(meta[cid] || {}) }); }
    return out.sort((a, b) => a.box[1] - b.box[1] || a.box[0] - b.box[0]);
  }, meta);
  const hide = async (on) => page.evaluate((on) => { let s = document.getElementById('qaHide'); if (!s) { s = document.createElement('style'); s.id = 'qaHide'; document.head.appendChild(s); } s.textContent = on ? '#app *, #app *::before, #app *::after, #toastLayer * { color: transparent !important; text-shadow: none !important; } #app svg text { fill: transparent !important; stroke: none !important; }' : ''; }, on);
  const cvd = async (name) => page.evaluate(({ name, m }) => { let f = document.getElementById('qaCvd'); if (!f) { f = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); f.id = 'qaCvd'; f.setAttribute('style', 'position:absolute;width:0;height:0'); f.innerHTML = '<filter id="qacvd" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter>'; document.body.appendChild(f); } if (m) f.querySelector('feColorMatrix').setAttribute('values', m); document.getElementById('app').style.filter = name ? 'url(#qacvd)' : ''; }, { name, m: CVD[name] });
  let n = 0; const shots = [];
  const order = [];
  const shoot = async (view) => { const cards = await collect(); for (const v of ['', 'protan', 'deutan', 'tritan']) { await cvd(v); await sleep(150); n++; const f = `ux-${String(n).padStart(2, '0')}.png`; await page.screenshot({ path: join(UXD, f) }); shots.push({ file: f, view, cvd: v || 'none' }); answer.images[f] = { view, cvd: v || 'none', cards }; } await cvd(''); };
  await hide(true);
  await shoot('board_hand');
  // 손패 펼침
  const hb = await page.$('[data-hand]');
  if (hb) { const r = await hb.boundingBox(); await page.mouse.click(r.x + r.width / 2, r.y + 12); for (let i = 0; i < 40; i++) await page.evaluate(() => __game.step(16)); await sleep(200); }
  const spread = await page.evaluate(() => !!document.querySelector('.spread'));
  await shoot(spread ? 'hand_spread' : 'hand_selected');
  await page.mouse.click(180, 8); for (let i = 0; i < 30; i++) await page.evaluate(() => __game.step(16));
  // 확대: 길게 누르기
  const hc = await page.$('[data-hand]');
  if (hc) { const r = await hc.boundingBox(); const zcid = await hc.evaluate((e) => e._hc && e._hc.cid); await page.evaluate((c) => { window.__zcid = c; }, zcid); await page.mouse.move(r.x + r.width / 2, r.y + 15); await page.mouse.down(); await sleep(700); for (let i = 0; i < 30; i++) await page.evaluate(() => __game.step(16)); await shoot('zoom'); await page.mouse.up(); }
  // 크게 본 카드(수집 상세) 5장: 유형 5가지 × 종류 3가지를 채움(손패·필드에 안 나온 즉시타격 포함)
  const { page: p2 } = await open(b, BASE + '?test=1&tut=0', { w: 360, h: 640 });
  await p2.evaluate(() => { const S = __game.state; for (const c of __qa.D.list) S.coll[c.id] = { n: 1, res: 0, stage: 0 }; S.guides = S.guides || {}; for (const k of ['guide_craft_1', 'guide_craft_2', 'guide_exp_2']) S.guides[k] = true; });
  const detail = ['A008', 'B052', 'A032', 'D009', 'A006', 'B056', 'A030'];
  const pageBak = page;
  for (const cid of detail) {
    await p2.evaluate(async (cid) => { document.querySelectorAll('.ovl').forEach((e) => e.remove()); __game.go('collection'); for (let i = 0; i < 30 && !document.querySelector(`[data-cid="${cid}"]`); i++) await new Promise((r) => setTimeout(r, 100)); document.querySelector(`[data-cid="${cid}"]`).click(); await new Promise((r) => setTimeout(r, 500)); }, cid);
    await p2.evaluate(() => { let s = document.getElementById('qaHide'); if (!s) { s = document.createElement('style'); s.id = 'qaHide'; document.head.appendChild(s); } s.textContent = 'body *, body *::before, body *::after { color: transparent !important; text-shadow: none !important; } svg text { fill: transparent !important; }'; });
    for (const v of ['', 'protan', 'deutan', 'tritan']) {
      await p2.evaluate(({ name, m }) => { let f = document.getElementById('qaCvd'); if (!f) { f = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); f.id = 'qaCvd'; f.setAttribute('style', 'position:absolute;width:0;height:0'); f.innerHTML = '<filter id="qacvd" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter>'; document.body.appendChild(f); } if (m) f.querySelector('feColorMatrix').setAttribute('values', m); document.body.style.filter = name ? 'url(#qacvd)' : ''; }, { name: v, m: CVD[v] });
      await sleep(150); n++; const f = `ux-${String(n).padStart(2, '0')}.png`; await p2.screenshot({ path: join(UXD, f) });
      shots.push({ file: f, view: 'detail', cvd: v || 'none' }); answer.images[f] = { view: 'detail', cvd: v || 'none', cards: [{ where: 'detail', cid, ...meta[cid] }] };
    }
  }
  void pageBak;
  await b.close();
  writeFileSync(join(PROJ, 'reviews', 'terms', 'ux-shots-answer.json'), JSON.stringify({ ...answer, deck_pick: pick.map((id) => ({ id, ...meta[id] })), made: new Date().toISOString() }, null, 1));
  save('uxshots', { log: LOG, shots, cards_per_image: Object.fromEntries(Object.entries(answer.images).map(([k, v]) => [k, v.cards.length])), combos: [...new Set(Object.values(answer.images).flatMap((v) => v.cards.map((c) => `${c.family}|${c.kind}`)))] });
}

// ================= perfctl: 게임 코드 없는 대조 페이지를 같은 조건(6배, 새 브라우저)으로 — 회차 흔들림이 환경인지 빌드인지 가름 =================
async function partPerfCtl() {
  const runs = [];
  for (let i = 1; i <= 3; i++) {
    const b = await browser(); const ctx = await b.newContext({ viewport: { width: 360, height: 640 } }); const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/projects/tcg-01/tools/qa/perfctl.html`);
    const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await page.evaluate(() => { window.__pf = { t: [], on: true }; const f = (ts) => { if (!window.__pf.on) return; window.__pf.t.push(ts); requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await sleep(60000);
    const t = await page.evaluate(() => { window.__pf.on = false; return window.__pf.t; }); await b.close();
    const d = t.slice(1).map((x, j) => x - t[j]); const s2 = [...d].sort((a, c) => c - a); const n1 = Math.max(1, Math.floor(d.length * 0.01));
    runs.push({ run: i, frames: d.length, avg_fps: +(d.length / d.reduce((a, c) => a + c, 0) * 1000).toFixed(1), low1_fps: +(1000 / (s2.slice(0, n1).reduce((a, c) => a + c, 0) / n1)).toFixed(1), max_ms: +s2[0].toFixed(1) });
    console.log(JSON.stringify(runs[runs.length - 1]));
  }
  save('perfctl', { runs });
}

const parts = { perfctl: partPerfCtl, terms: partTerms, uxshots: partUxShots, tut: partTut, resp: partResp, info: partInfo, shots: partShots, sync: partSync, human: partHuman, tempo: partTempo, perf: partPerf, func: partFunc };
try {
  for (const [k, f] of Object.entries(parts)) if (PART === 'all' || PART.split(',').includes(k)) { console.log(`== ${k}`); await f(); }
} catch (e) { console.error(e); process.exitCode = 1; } finally { stopAll(); }
