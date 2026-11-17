#!/usr/bin/env node
// 개발 담당 round-2 브라우저 자체 확인 (Playwright, 설치된 브라우저). QA 도구(qa-round.mjs, selfcheck-browser.mjs)와 별개.
//   node projects/runner-01/tools/serve.mjs &
//   PLAYWRIGHT_CORE=<playwright-core 경로> node projects/runner-01/tools/dev-selfcheck.mjs --channel msedge [--part replay,layout,shots,perf]
// 결과: reviews/dev-selfcheck/round2.json, 스크린샷 reviews/dev-selfcheck/r2-*.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'projects/runner-01/reviews/dev-selfcheck');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const channel = opt('--channel');
const parts = new Set(opt('--part', 'replay,layout,shots,perf').split(','));
const BASE = process.env.BASE_URL || 'http://localhost:8123/games/reverbound/';
let pw;
try { pw = await import(process.env.PLAYWRIGHT_CORE ? pathToFileURL(join(process.env.PLAYWRIGHT_CORE, 'index.mjs')).href : 'playwright'); }
catch { pw = await import('playwright-core'); }
const chromium = pw.chromium ?? pw.default.chromium;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel, headless: true });
const R = { base: BASE, console: [], external: [], replay: [], layout: {}, shots: [], perf: {} };

async function open(vw, vh, query = '?test=1', dpr = 1, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr, ...extra });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) R.console.push(`[${vw}x${vh}${query}] ${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => R.console.push(`[${vw}x${vh}${query}] pageerror: ${e.message}`));
  p.on('request', (r) => { const u = new URL(r.url()); if (!['localhost', '127.0.0.1'].includes(u.hostname) && !['data:', 'blob:'].includes(u.protocol)) R.external.push(r.url()); });
  await p.goto(BASE + query);
  await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 20000 });
  return { ctx, p };
}
const shot = async (p, name) => { await p.screenshot({ path: join(OUT, `r2-${name}.png`) }); R.shots.push(`r2-${name}.png`); };

// 1) 10레벨 × 입력열 2종 클리어
if (parts.has('replay')) {
  const { ctx, p } = await open(1280, 720);
  const n = await p.evaluate(() => window.__game.levelCount);
  for (let i = 0; i < n; i++) {
    for (const [set, holdTicks, frameDt] of [['taps', 1, 1 / 60], ['on_beat_taps', 19, 1 / 144], ['taps', 24, 1 / 30]]) {
      const r = await p.evaluate(([i, set, holdTicks, frameDt]) => {
        const g = window.__game, id = String(i + 1).padStart(2, '0');
        return g.replay(i, g.testInputs.levels[id][set], { holdTicks, frameDt });
      }, [i, set, holdTicks, frameDt]);
      R.replay.push({ level: i + 1, set, holdTicks, hz: Math.round(1 / frameDt), state: r.state, progress: +r.progress.toFixed(1), attempts: r.attempts });
    }
  }
  const ok = R.replay.filter((r) => r.state === 'clear').length; // attempts 는 저장된 레벨별 누적이라 보지 않음
  console.log(`replay: ${ok}/${R.replay.length} clear (레벨 ${n}개)`);
  await ctx.close();
}

// 2) 레이아웃: 레벨 선택 10장, 설정, 버튼 48 px, 겹침, 잘림
const RES = [[360, 640], [640, 360], [1280, 720], [412, 915]];
if (parts.has('layout')) {
  for (const lang of ['ko', 'en']) for (const [w, h] of RES) {
    const { ctx, p } = await open(w, h, `?test=1&lang=${lang}`);
    const res = {};
    for (const scr of ['title', 'levels', 'settings', 'pause']) {
      if (scr === 'pause') { await p.evaluate(() => { window.__game.loadLevel(0); window.__game.step(0.3); window.__game.pause(); }); }
      else await p.evaluate((s) => window.__game.show(s), scr);
      await p.waitForTimeout(80);
      res[scr] = await p.evaluate((scr) => {
        const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
        const root = document.getElementById(scr === 'pause' ? 'pause' : scr);
        const tgt = [...root.querySelectorAll('button, a, input')].filter(vis).map((e) => { const r = e.getBoundingClientRect(); return { id: e.id || e.className, l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; });
        const W = innerWidth, H = innerHeight;
        const small = tgt.filter((b) => b.w < 47.5 || b.h < 47.5).map((b) => `${b.id} ${b.w.toFixed(0)}x${b.h.toFixed(0)}`);
        const out = tgt.filter((b) => b.l < -0.5 || b.t < -0.5 || b.r > W + 0.5 || b.b > H + 0.5).map((b) => `${b.id} (${b.l.toFixed(0)},${b.t.toFixed(0)})-(${b.r.toFixed(0)},${b.b.toFixed(0)})`);
        const over = [];
        for (let i = 0; i < tgt.length; i++) for (let j = i + 1; j < tgt.length; j++) {
          const a = tgt[i], b = tgt[j];
          const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
          if (ox > 1 && oy > 1 && !(a.id === 'sMusic' || b.id === 'sMusic') ) over.push(`${a.id}×${b.id} ${ox.toFixed(0)}x${oy.toFixed(0)}`);
        }
        const r = { buttons: tgt.length, small, out, over };
        if (scr === 'levels') {
          const wrap = document.getElementById('cards');
          const cards = [...wrap.querySelectorAll('.card')];
          r.cards = cards.length;
          r.scroll = wrap.scrollHeight > wrap.clientHeight + 1;
          r.cardSize = cards[0] ? `${cards[0].offsetWidth}x${cards[0].offsetHeight}` : '';
          r.cardIssues = [];
          for (const c of cards) {
            const cr = c.getBoundingClientRect(), band = c.querySelector('.band').getBoundingClientRect(), obj = c.querySelector('.obj').getBoundingClientRect();
            const num = c.querySelector('.num').textContent;
            for (const sel of ['.top', '.nm', '.tag', '.best']) {
              const e = c.querySelector(sel); if (!vis(e)) continue;
              const er = e.getBoundingClientRect();
              if (e.scrollWidth > e.clientWidth + 1) r.cardIssues.push(`${num}${sel} 가로 넘침`);
              if (er.right > cr.right - 2 || er.bottom > cr.bottom - 2) r.cardIssues.push(`${num}${sel} 카드 밖`);
              if (sel !== '.best') { const rg = document.createRange(); rg.selectNodeContents(e); for (const lr of rg.getClientRects()) if (lr.right > obj.left + 1 && lr.left < obj.right - 1 && lr.bottom > obj.top + 1 && lr.top < obj.bottom - 1) r.cardIssues.push(`${num}${sel} 글자가 그림과 겹침`); }
            }
            if (!r.scroll && (cr.bottom > H + 0.5 || cr.right > W + 0.5 || cr.left < -0.5)) r.cardIssues.push(`${num} 화면 밖`);
            // 한국어 낱말 중간 줄바꿈 검사: 이름의 낱말이 두 줄에 걸치지 않음
            const nm = c.querySelector('.nm');
            const range = document.createRange();
            for (const m of nm.textContent.matchAll(/\S+/g)) {
              range.setStart(nm.firstChild, m.index); range.setEnd(nm.firstChild, m.index + m[0].length);
              if (range.getClientRects().length > 1) r.cardIssues.push(`${num} 이름 낱말 중간 줄바꿈: ${m[0]}`);
            }
          }
        }
        if (scr === 'settings') { const pn = document.getElementById('setPanel'); r.panel = `${pn.scrollHeight}/${pn.clientHeight}`; r.panelOverflow = pn.scrollHeight > pn.clientHeight + 1; r.moreHint = !document.getElementById('setMore').classList.contains('hidden'); }
        return r;
      }, scr);
      await shot(p, `${lang}-${w}x${h}-${scr}`);
    }
    R.layout[`${lang} ${w}x${h}`] = res;
    const lv = res.levels;
    console.log(`layout ${lang} ${w}x${h}: cards ${lv.cards} ${lv.cardSize} scroll=${lv.scroll} issues=${lv.cardIssues.length} | small/out/over: ` +
      Object.entries(res).map(([k, v]) => `${k} ${v.small.length}/${v.out.length}/${v.over.length}`).join(', ') + ` | settings ${res.settings.panel}${res.settings.moreHint ? ' (▼)' : ''}`);
    for (const [k, v] of Object.entries(res)) for (const x of [...v.small, ...v.out, ...v.over, ...(v.cardIssues ?? [])]) console.log(`   ${k}: ${x}`);
    await ctx.close();
  }
}

// 3) 플레이 스크린샷: 레벨마다 새 기믹 첫 등장, 튜토리얼 카드, 사망, 클리어 (4해상도)
if (parts.has('shots')) {
  for (const [w, h] of RES) {
    const { ctx, p } = await open(w, h, '?test=1&lang=ko');
    const levels = await p.evaluate(() => window.__game.levelCount);
    for (let i = 0; i < levels; i++) {
      const pts = await p.evaluate((i) => {
        const lv = window.__game.levelData(i);
        const out = [];
        if (lv.cues?.length) out.push(['cue', lv.cues[0].x + 1.5]);
        const firstOf = (t) => lv.objects.find((o) => o.type === t)?.x;
        const gim = { 4: 'platform', 6: 'orb', 7: 'spike_ceiling' }[i + 1];
        if (gim) out.push(['gimmick', firstOf(gim) - 3]);
        if (lv.speed_changes?.length) out.push(['gate', lv.speed_changes.find((s) => s.speed === (i + 1 === 8 ? 'slow' : 'fast')).x - 3]);
        if (i + 1 === 2) out.push(['stairs', lv.objects.filter((o) => o.type === 'block')[2].x - 2]);
        if (i + 1 >= 9) out.push(['mid', lv.length_tiles * 0.45]);
        return out;
      }, i);
      for (const [tag, x] of pts) {
        await p.evaluate(([i, x]) => window.__game.seek(i, x), [i, x]);
        await p.waitForTimeout(60);
        await shot(p, `${w}x${h}-L${i + 1}-${tag}`);
      }
    }
    // 레벨 1 손가락 시연 + 카드 (새 저장), 사망, 클리어
    await p.evaluate(() => { localStorage.clear(); });
    await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
    for (const t of [0.25, 2.5, 3.6, 4.0]) {
      await p.evaluate((t) => { const g = window.__game; g.seek(0, 0); g.step(t); }, t);
      await p.waitForTimeout(60);
      await shot(p, `${w}x${h}-L1-demo-${t}s`);
    }
    await p.evaluate(() => { const g = window.__game; g.loadLevel(0); for (let k = 0; k < 600 && g.state !== 'dead'; k++) g.step(1 / 60); g.step(0.2); });
    await shot(p, `${w}x${h}-death-first`);
    await p.evaluate(() => { const g = window.__game; g.replay(6); g.step(0.15); });
    await shot(p, `${w}x${h}-L7-clear-fx`);
    await p.evaluate(() => { const g = window.__game; g.replay(9); g.step(1.3); });
    await shot(p, `${w}x${h}-L10-clear-screen`);
    await ctx.close();
  }
}

// 4) 성능: 6배 CPU 스로틀링, rAF 실시간 재생 (레벨 7 전체, 레벨 1 시작·재시작 포함)
if (parts.has('perf')) {
  for (const [w, h, dpr] of [[640, 360, 3], [1280, 720, 1]]) {
    const { ctx, p } = await open(w, h, '?test=1', dpr);
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    for (const [lvl, label] of [[6, 'L7 full'], [3, 'L4 full']]) {
      const r = await p.evaluate(async (lvl) => {
        const g = window.__game;
        const ft = [];
        let last = performance.now();
        g.play(lvl);
        await new Promise((res) => {
          const loop = (t) => { ft.push(t - last); last = t; if (g.state === 'clear' || g.state === 'dead' || ft.length > 20000) res(); else requestAnimationFrame(loop); };
          requestAnimationFrame(loop);
        });
        ft.shift();
        const s = [...ft].sort((a, b) => b - a);
        const n = ft.length, avg = ft.reduce((a, b) => a + b, 0) / n;
        const low1 = s.slice(0, Math.max(1, Math.floor(n / 100))).reduce((a, b) => a + b, 0) / Math.max(1, Math.floor(n / 100));
        return { state: g.state, progress: g.progress, frames: n, avg_fps: +(1000 / avg).toFixed(1), low1_fps: +(1000 / low1).toFixed(1), max_ms: +s[0].toFixed(1), over33: ft.filter((x) => x > 33.4).length, first2s_max_ms: +Math.max(...ft.slice(0, 120)).toFixed(1) };
      }, lvl);
      R.perf[`${w}x${h}@${dpr} ${label}`] = r;
      console.log(`perf ${w}x${h}@${dpr} ${label}: ${JSON.stringify(r)}`);
    }
    // 레벨 1 시작·사망·재시작 반복 (무입력) 20 s
    const r2 = await p.evaluate(async () => {
      const g = window.__game;
      const ft = []; let last = performance.now();
      g.play(0, { taps: [] });
      const t0 = performance.now();
      await new Promise((res) => { const loop = (t) => { ft.push(t - last); last = t; if (t - t0 > 20000) res(); else requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
      ft.shift();
      const s = [...ft].sort((a, b) => b - a), n = ft.length, k = Math.max(1, Math.floor(n / 100));
      return { attempts: g.attempts, frames: n, avg_fps: +(1000 / (ft.reduce((a, b) => a + b, 0) / n)).toFixed(1), low1_fps: +(1000 / (s.slice(0, k).reduce((a, b) => a + b, 0) / k)).toFixed(1), max_ms: +s[0].toFixed(1) };
    });
    R.perf[`${w}x${h}@${dpr} L1 restarts`] = r2;
    console.log(`perf ${w}x${h}@${dpr} L1 restarts: ${JSON.stringify(r2)}`);
    await ctx.close();
  }
}

// 일반 모드(오디오 경로) 로드·첫 탭·레벨 1 시작 확인 + 영어 자동 선택
{
  const { ctx, p } = await open(640, 360, '', 1, { locale: 'en-US' });
  const lang = await p.evaluate(() => window.__game.lang);
  await p.mouse.click(320, 180); await p.waitForTimeout(300);
  await p.evaluate(() => window.__game.loadLevel(0)); await p.waitForTimeout(1500);
  R.normal = { lang_en_US: lang, state: await p.evaluate(() => window.__game.state), audio: await p.evaluate(() => window.__game.audio) };
  console.log('normal mode:', JSON.stringify(R.normal));
  await ctx.close();
  const b = await open(640, 360, '', 1, { locale: 'ko-KR' });
  R.normal.lang_ko_KR = await b.p.evaluate(() => window.__game.lang);
  await b.ctx.close();
}
await browser.close();
console.log(`console errors/warnings: ${R.console.length}, external requests: ${R.external.length}`);
for (const c of R.console.slice(0, 20)) console.log('  ' + c);
writeFileSync(join(OUT, 'round2.json'), JSON.stringify(R, null, 1));
