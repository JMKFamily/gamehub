#!/usr/bin/env node
// round-3 성능 보완 (game-developer): 6배 스로틀에서 느린 프레임이 무엇을 그리는지 Chrome 추적(CDP Tracing)으로 확인.
//   PLAYWRIGHT_CORE=<playwright-core> QA_CHANNEL=msedge node projects/runner-01/tools/dev-trace-r3p.mjs [--res 640x360@3] [--port 8140] [--scene l1|menu] [--tag before]
// 페이지 안 rAF 간격 > 25 ms 프레임마다 console.timeStamp를 찍고, 그 구간에 겹친 추적 이벤트를 스레드·이름별로 합산.
// 결과: reviews/dev-selfcheck/r3p-trace-<tag>-<res>-<scene>.json (요약만, 원본 추적은 저장하지 않음)
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const lib = await import(pathToFileURL(join(ROOT, 'harness/qa/lib.mjs')).href);
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PORT = +opt('--port', 8140);
if (PORT < 8130 || PORT > 8149) throw new Error('포트는 8130~8149만');
const [w, h, dsf] = opt('--res', '640x360@3').split(/[x@]/).map(Number);
const SCENE = opt('--scene', 'l1');
const TAG = opt('--tag', 'before');
const LONG = +opt('--long', 25); // 이 ms를 넘는 프레임만 분석
const OUT = join(ROOT, 'projects/runner-01/reviews/dev-selfcheck');
mkdirSync(OUT, { recursive: true });
const BASE = `http://localhost:${PORT}/games/reverbound/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RT_PLAY = (page, i, maxS, noInput = false) => page.evaluate(([i, maxS, noInput]) => new Promise((done) => {
  const g = window.__game, H = 240;
  const id = g.levelData(i).id; const taps = noInput ? [] : window.__qaTaps[id];
  g.loadLevel(i);
  const est = []; let ti = 0, t0 = performance.now(), result = null, lastTick = -1, att0 = null;
  const fire = (type) => window.dispatchEvent(new KeyboardEvent(type, { code: 'Space', key: ' ', bubbles: true }));
  const onFrame = (ts) => {
    if (result) return;
    if (att0 == null && g.state === 'playing') att0 = g.attempts;
    const k = g.tick;
    if (k > 0 && g.state === 'playing' && k !== lastTick) { est.push(ts / 1000 - (k + 0.5) / H); if (est.length > 40) est.shift(); }
    lastTick = k;
    const restarted = att0 != null && g.attempts !== att0;
    if (g.state === 'clear' || (!noInput && (g.state === 'dead' || restarted)) || performance.now() - t0 > maxS * 1000) { result = { state: g.state, attempts: g.attempts, progress: +g.progress.toFixed(1), combo: g.combo }; done(result); return; }
    requestAnimationFrame(onFrame);
  };
  requestAnimationFrame(onFrame);
  const sched = () => {
    if (result) return;
    if (est.length >= 3) {
      const off = [...est].sort((a, b) => a - b)[est.length >> 1];
      while (ti < taps.length) { const target = ((taps[ti] + 0.5) / H + off) * 1000; if (performance.now() >= target - 0.5) { fire('keydown'); setTimeout(() => fire('keyup'), 80); ti++; } else break; }
    }
    setTimeout(sched, 1);
  };
  sched();
}), [i, maxS, noInput]);

const inputs = JSON.parse(readFileSync(join(ROOT, 'games/reverbound/data/test-inputs.json'), 'utf8'));
const PROBE = () => {
  window.__qa = { loaf: [], cb: [] };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (window.__qa.loaf.length < 4000) window.__qa.loaf.push({ start: e.startTime, dur: e.duration, block: e.blockingDuration, scripts: (e.scripts || []).reduce((a, s) => a + s.duration, 0) }); }).observe({ type: 'long-animation-frame', buffered: true }); } catch {}
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((ts) => { const a = performance.now(); try { cb(ts); } finally { const q = window.__qa.cb; if (q.length < 400000) q.push(ts, performance.now() - a); } });
};
const server = await lib.startServer(process.execPath, [join(ROOT, 'projects/runner-01/tools/serve.mjs'), String(PORT)], BASE);
const browser = await lib.launch();
const result = { res: `${w}x${h}@${dsf}`, scene: SCENE, tag: TAG };
try {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, locale: 'ko-KR' });
  await ctx.addInitScript((LONG) => {
    const raf = window.requestAnimationFrame.bind(window);
    let last = 0; window.__long = [];
    const tick = (ts) => { if (last && ts - last > LONG) { console.timeStamp('LONG ' + (ts - last).toFixed(1)); window.__long.push([ts, ts - last]); } last = ts; raf(tick); };
    raf(tick);
  }, LONG);
  if (args.includes('--probe')) await ctx.addInitScript(PROBE); // 측정 도구와 같은 rAF 감싸기·LoAF 관찰
  const page = await ctx.newPage();
  await page.goto(BASE + '?lang=ko');
  await page.waitForFunction(() => window.__game?.ready === true, null, { timeout: 20000 });
  const cdp = await ctx.newCDPSession(page);
  if (SCENE !== 'menu') { await page.mouse.click(w / 2, h / 2); await sleep(1500); }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); await sleep(500);
  // --pre: 측정 도구(dev-perf-r3p)와 같은 순서로 L1 10 s → L1 무입력 사망·재시작을 먼저 돌린 뒤 추적
  if (args.includes('--pre')) {
    await page.evaluate((t) => { window.__qaTaps = Object.fromEntries(Object.entries(t.levels).map(([k, v]) => [k, v.taps])); }, inputs);
    await RT_PLAY(page, 0, 10);
    await page.evaluate(() => window.__game.loadLevel(0));
    await page.waitForFunction(() => window.__game.attempts >= 2 && window.__game.state === 'playing', null, { timeout: 20000 }).catch(() => {});
    await sleep(4000);
  }
  result.requests = []; page.on('request', (r) => result.requests.push(r.url().replace(/^https?:\/\/[^/]+/, '')));
  await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'gpu', 'cc', 'viz', 'blink', 'benchmark', 'toplevel', 'v8', 'disabled-by-default-v8.gc'] });
  if (SCENE === 'l1' || SCENE === 'l4') {
    await page.evaluate((t) => { window.__qaTaps = Object.fromEntries(Object.entries(t.levels).map(([k, v]) => [k, v.taps])); }, inputs);
    await RT_PLAY(page, SCENE === 'l1' ? 0 : 3, SCENE === 'l1' ? 10 : 12);
  } else {
    await page.mouse.click(w / 2, h * 0.7); await sleep(800);
    await page.click('#btnLevels'); await sleep(800);
    await page.click('#levels [data-back]'); await sleep(800);
    await page.click('#btnSettings'); await sleep(800);
    await page.click('#settings [data-back]'); await sleep(800);
  }
  const buf = await browser.stopTracing();
  const ev = JSON.parse(buf.toString()).traceEvents ?? JSON.parse(buf.toString());
  const tn = new Map(), pn = new Map();
  for (const e of ev) if (e.ph === 'M') { if (e.name === 'thread_name') tn.set(e.pid + ':' + e.tid, e.args.name); if (e.name === 'process_name') pn.set(e.pid, e.args.name); }
  const thr = (e) => `${pn.get(e.pid) ?? e.pid}/${tn.get(e.pid + ':' + e.tid) ?? e.tid}`;
  const marks = ev.filter((e) => e.name === 'TimeStamp' && String(e.args?.data?.message ?? '').startsWith('LONG ')).map((e) => ({ ts: e.ts, ms: +e.args.data.message.slice(5) }));
  // 완료 이벤트(X)만, 같은 스레드에서 다른 X 안에 들어간 것은 제외(맨 위 이벤트만 합산)
  const X = ev.filter((e) => e.ph === 'X' && e.dur > 0).sort((a, b) => a.ts - b.ts);
  const top = []; const open = new Map();
  for (const e of X) { const k = e.pid + ':' + e.tid; const o = open.get(k); if (o && e.ts < o.ts + o.dur) { (o.kids ??= []).push(e); continue; } open.set(k, e); top.push(e); }
  const kidSum = (e, acc) => { for (const k of e.kids ?? []) acc[k.name] = (acc[k.name] || 0) + k.dur / 1000; return acc; };
  const frames = marks.map((m) => {
    const t0 = m.ts - m.ms * 1000, t1 = m.ts;
    const byThr = {};
    for (const e of top) {
      if (e.ts + e.dur < t0 || e.ts > t1) continue;
      const ov = (Math.min(t1, e.ts + e.dur) - Math.max(t0, e.ts)) / 1000;
      if (ov < 0.3) continue;
      const k = thr(e); const b = (byThr[k] ??= { total: 0, names: {} });
      b.total += ov; b.names[e.name] = (b.names[e.name] || 0) + ov;
      if (e.dur > 3000) kidSum(e, (b.kids ??= {}));
    }
    for (const b of Object.values(byThr)) { b.total = +b.total.toFixed(1); b.names = Object.fromEntries(Object.entries(b.names).sort((a, c) => c[1] - a[1]).slice(0, 6).map(([n, v]) => [n, +v.toFixed(1)])); if (b.kids) b.kids = Object.fromEntries(Object.entries(b.kids).sort((a, c) => c[1] - a[1]).slice(0, 16).map(([n, v]) => [n, +v.toFixed(1)])); }
    return { at_ms: +((m.ts - (marks[0]?.ts ?? m.ts)) / 1000).toFixed(0), ms: m.ms, threads: Object.fromEntries(Object.entries(byThr).filter(([, b]) => b.total >= 2).sort((a, c) => c[1].total - a[1].total)) };
  });
  // 전체 창 합계 (스레드별 맨 위 이벤트 이름 합, ms)
  const tot = {};
  for (const e of top) { const k = thr(e); const b = (tot[k] ??= {}); b[e.name] = (b[e.name] || 0) + e.dur / 1000; }
  result.totals = Object.fromEntries(Object.entries(tot).map(([k, b]) => [k, Object.fromEntries(Object.entries(b).sort((a, c) => c[1] - a[1]).slice(0, 8).map(([n, v]) => [n, +v.toFixed(0)]))]).filter(([, b]) => Object.values(b)[0] > 50));
  // 렌더러 메인·컴포지터·GPU 메인 스레드는 모든 깊이 이벤트 이름별 합 (겹친 이름은 중복 합산됨)
  const deep = {};
  for (const e of X) { const k = thr(e); if (!/CrRendererMain|CrGpuMain|Compositor|VizCompositor/.test(k)) continue; const b = (deep[k] ??= {}); b[e.name] = (b[e.name] || 0) + e.dur / 1000; }
  result.deep = Object.fromEntries(Object.entries(deep).map(([k, b]) => [k, Object.fromEntries(Object.entries(b).sort((a, c) => c[1] - a[1]).slice(0, 30).map(([n, v]) => [n, +v.toFixed(0)]))]));
  result.gc = {}; for (const e of X) if (/GC|Gc|Scavenge|MarkCompact/.test(e.name) && /CrRendererMain/.test(thr(e))) { const g = (result.gc[e.name] ??= { n: 0, ms: 0, max: 0 }); g.n++; g.ms += e.dur / 1000; g.max = Math.max(g.max, e.dur / 1000); }
  result.long = frames;
  result.longCount = frames.length;
  await ctx.close();
} finally {
  await browser.close();
  server.stop();
}
const f = join(OUT, `r3p-trace-${TAG}-${result.res.replace('@', 'at')}-${SCENE}.json`);
writeFileSync(f, JSON.stringify(result, null, 1) + '\n');
console.log('saved', f, 'long frames', result.longCount);
for (const fr of result.long.slice(0, 12)) { console.log(`+${fr.at_ms}ms ${fr.ms}ms`); for (const [k, b] of Object.entries(fr.threads)) console.log(`   ${k} ${b.total}: ${JSON.stringify(b.names)}${b.kids ? ' kids ' + JSON.stringify(b.kids) : ''}`); }
console.log('requests', result.requests);
console.log('gc', JSON.stringify(Object.fromEntries(Object.entries(result.gc).filter(([, g]) => g.max > 1).map(([k, g]) => [k, { n: g.n, ms: +g.ms.toFixed(1), max: +g.max.toFixed(1) }]))));
console.log('deep', JSON.stringify(result.deep, null, 1));
