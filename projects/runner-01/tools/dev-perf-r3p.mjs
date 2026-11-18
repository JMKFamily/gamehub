#!/usr/bin/env node
// 개발 round-3 성능 보완 자체 확인 (game-developer, 결정 22). dev-perf-r3.mjs + 1280x720@3 해상도, PC 전체 CPU 기록, 해상도마다 빌드 ↔ 대조 페이지를 새 브라우저로 번갈아 잼.
//
//   PLAYWRIGHT_CORE=<playwright-core 폴더> QA_CHANNEL=msedge node projects/runner-01/tools/dev-perf-r3p.mjs [--runs 3] [--port 8141] [--part perf,menu] [--tag after] [--res 1280x720@1,640x360@3,1280x720@3]
//
// perf  6배 CPU 스로틀, 1280x720@1·640x360@3, 회차마다 "새 브라우저"로 빌드 → 대조 페이지(게임 코드 없음) 번갈아.
//       창: L1 시작 0~10 s(첫 판정 글 프레임 포함), L1 무입력 사망 → 재시작 +4 s, L4 시작 0~20 s(콤보 5·10·15·20 단계 도달 프레임), L10 시작 0~25 s(단계 도달·고리).
//       기준: 1% low ≥ 45, 레벨 시작·재시작·첫 판정 글·단계 도달 프레임 ≤ 33 ms, rAF 콜백(프레임 스크립트) p95 ≤ 4 ms.
// menu  6배 스로틀, 첫 탭(오디오 잠금 해제)·타이틀 → 레벨 선택·되돌아가기·설정·달리기 가장 긴 프레임 ≤ 100 ms
// 결과: reviews/dev-selfcheck/r3p-perf-<tag>.json. CPU = os.cpus() 1 s 간격 PC 전체 사용률(창 평균·최대), 평균 > 50 %인 창은 busy 표시
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cpus } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const lib = await import(pathToFileURL(join(ROOT, 'harness/qa/lib.mjs')).href);
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const RUNS = +opt('--runs', 3);
const PORT = +opt('--port', 8141);
const TAG = opt('--tag', 'after');
// --base <폴더>: 고치기 전 빌드 사본을 같은 시간대에 번갈아 잼 (variant base, 페이지 route로 /games/reverbound-base/ 에 그 폴더를 내줌)
const BASEDIR = opt('--base', null);
const VARIANTS = BASEDIR ? ['build', 'base', 'control'] : ['build', 'control'];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
if (PORT < 8130 || PORT > 8149) throw new Error('포트는 8130~8149만 (runner-01 개발 대역)');
const PART = opt('--part', 'perf,menu').split(',');
const OUT = join(ROOT, 'projects/runner-01/reviews/dev-selfcheck');
mkdirSync(OUT, { recursive: true });
const BASE = `http://localhost:${PORT}/games/reverbound/`;
const inputs = JSON.parse(readFileSync(join(ROOT, 'games/reverbound/data/test-inputs.json'), 'utf8'));
const r1 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = lib.newLog();
// PC 전체 CPU 사용률 (1 s 간격)
const cpuSamples = [];
let prevCpu = cpus();
const cpuTimer = setInterval(() => { const c = cpus(); let idle = 0, tot = 0; c.forEach((x, i) => { const p = prevCpu[i].times, q = x.times; const d = (k) => q[k] - p[k]; idle += d('idle'); tot += d('user') + d('nice') + d('sys') + d('idle') + d('irq'); }); prevCpu = c; cpuSamples.push([Date.now(), tot ? Math.round((1 - idle / tot) * 1000) / 10 : 0]); }, 1000);
const cpuBetween = (a, b) => { const v = cpuSamples.filter(([t]) => t >= a && t <= b + 1000).map(([, x]) => x); return v.length ? { avg: r1(v.reduce((x, y) => x + y, 0) / v.length), max: r1(Math.max(...v)) } : null; };

const PROBE = () => {
  window.__qa = { loaf: [], cb: [] };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (window.__qa.loaf.length < 4000) window.__qa.loaf.push({ start: e.startTime, dur: e.duration, block: e.blockingDuration, scripts: (e.scripts || []).reduce((a, s) => a + s.duration, 0) }); }).observe({ type: 'long-animation-frame', buffered: true }); } catch {}
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((ts) => { const a = performance.now(); try { cb(ts); } finally { const q = window.__qa.cb; if (q.length < 400000) q.push(ts, performance.now() - a); } });
};
async function gotoVariant(page, variant) {
  if (variant !== 'base') return page.goto(BASE + '?lang=ko');
  await page.route(`http://localhost:${PORT}/games/reverbound-base/**`, (r) => { const rel = decodeURIComponent(new URL(r.request().url()).pathname).replace('/games/reverbound-base/', '') || 'index.html'; const f = join(BASEDIR, rel); try { r.fulfill({ contentType: MIME[f.slice(f.lastIndexOf('.'))] || 'application/octet-stream', body: readFileSync(f) }); } catch { r.fulfill({ status: 404, body: '' }); } });
  return page.goto(`http://localhost:${PORT}/games/reverbound-base/?lang=ko`);
}
const server = await lib.startServer(process.execPath, [join(ROOT, 'projects/runner-01/tools/serve.mjs'), String(PORT)], BASE);
console.log('server pid', server.child?.pid, 'port', PORT);
let browser = null;
const launch = async () => { try { await browser?.close(); } catch {} browser = await lib.launch(); return browser; };
async function newPage(w, h, dsf) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, locale: 'ko-KR' });
  await ctx.addInitScript(PROBE);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.console.push(`[${w}x${h}] ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => log.pageerrors.push(`[${w}x${h}] ${e.message}`));
  page.on('request', (r) => { log.requests++; const u = new URL(r.url()); if (['http:', 'https:'].includes(u.protocol) && !['localhost', '127.0.0.1'].includes(u.hostname)) log.external.push(r.url()); });
  return { ctx, page };
}

// 프레임 기록: rAF 시각 + 그 프레임의 게임 상태(판정 수·콤보·시도·상태). 이벤트 프레임(시작·재시작·첫 판정·단계 도달) 길이를 따로 뽑음
async function fpsWindow(page, run) {
  const c0 = Date.now();
  const r = await fpsWindow0(page, run);
  r.cpu = cpuBetween(c0, Date.now()); r.busy = !!(r.cpu && r.cpu.avg > 50);
  return r;
}
async function fpsWindow0(page, run) {
  await page.evaluate(() => {
    window.__f = { t: [], s: [], on: true };
    const f = () => { if (!window.__f.on) return; const G = window.__game; window.__f.t.push(performance.now()); window.__f.s.push([G.grades.length, G.combo, G.attempts, G.state]); requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  await run();
  const { t, s, cb, loaf } = await page.evaluate(() => { window.__f.on = false; const t0 = window.__f.t[0] ?? 0; return { t: window.__f.t, s: window.__f.s, cb: window.__qa.cb.slice(), loaf: window.__qa.loaf.filter((e) => e.start >= t0) }; });
  const d = []; for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]);
  if (d.length < 5) return { frames: d.length };
  const total = t[t.length - 1] - t[0];
  const sorted = [...d].sort((a, b) => b - a), n1 = Math.max(1, Math.floor(d.length * 0.01));
  const worst = d.map((x, i) => [x, i]).sort((a, b) => b[0] - a[0]).slice(0, n1).map(([x, i]) => ({ ms: r1(x), at: r1(t[i + 1] - t[0]) }));
  // 이벤트 프레임: 상태가 바뀐 기록 i → 그 프레임을 그린 뒤 다음 프레임까지 d[i] (그 프레임 비용), 앞뒤 1프레임 중 최대
  const ev = [];
  const fr = (i) => r1(Math.max(d[i - 1] ?? 0, d[i] ?? 0));
  ev.push({ kind: 'window start (첫 프레임)', ms: r1(Math.max(d[0], d[1] ?? 0, d[2] ?? 0)) });
  for (let i = 1; i < s.length; i++) {
    const [g0, c0, a0, st0] = s[i - 1], [g1, c1, a1, st1] = s[i];
    if (g0 === 0 && g1 > 0) ev.push({ kind: 'first judge (첫 판정 글)', ms: fr(i), at: r1(t[i] - t[0]) });
    for (const m of [5, 10, 15, 20]) if (c0 < m && c1 >= m) ev.push({ kind: `stage ${m}`, ms: fr(i), at: r1(t[i] - t[0]) });
    if (a1 !== a0) ev.push({ kind: 'restart (새 시도 첫 프레임)', ms: fr(i), at: r1(t[i] - t[0]) });
  }
  const per = new Map();
  for (let i = 0; i < cb.length; i += 2) if (cb[i] >= t[0] && cb[i] <= t[t.length - 1]) per.set(cb[i], (per.get(cb[i]) || 0) + cb[i + 1]);
  const cbs = [...per.values()].sort((a, b) => a - b);
  const q = (f) => r1(cbs[Math.min(cbs.length - 1, Math.floor(f * cbs.length))]);
  return { frames: d.length, seconds: r1(total / 1000), avg_fps: r1((d.length / total) * 1000), low1_fps: r1(1000 / (sorted.slice(0, n1).reduce((a, b) => a + b, 0) / n1)), max_ms: r1(sorted[0]),
    over_33ms: d.filter((x) => x > 33.4).length, script_ms: { median: q(0.5), p95: q(0.95), p99: q(0.99), max: r1(cbs[cbs.length - 1]) }, loaf: loaf.length, worst, events: ev,
    events_max_ms: r1(Math.max(...ev.map((e) => e.ms ?? 0))) };
}
// 일반 모드 실시간 재생 (qa-r2-extra RT_PLAY와 같음: 검증기 탭 틱 → 예상 시각에 keydown/keyup 80 ms)
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

const CTL_HTML = `<!doctype html><meta charset="utf-8"><title>dev-control</title><link rel="icon" href="data:,"><body style="margin:0;background:#1D1B36;overflow:hidden"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');function rs(){const d=devicePixelRatio||1;c.width=innerWidth*d;c.height=innerHeight*d;c.style.width=innerWidth+'px';c.style.height=innerHeight+'px';g.setTransform(d,0,0,d,0,0);}rs();
function f(t){requestAnimationFrame(f);g.fillStyle='#1D1B36';g.fillRect(0,0,innerWidth,innerHeight);const R=Math.min(innerWidth,innerHeight)*0.3,a=t/1000*2;g.fillStyle='#2E2B55';for(let i=0;i<30;i++){g.fillRect((i*67+t/5)%innerWidth,innerHeight*0.7,30,30);}g.strokeStyle='#5A55A0';g.lineWidth=6;g.beginPath();g.arc(innerWidth/2,innerHeight/2,R,0,7);g.stroke();g.fillStyle='#7FE3FF';g.fillRect(innerWidth/2+R*Math.cos(a)-12,innerHeight/2+R*Math.sin(a)-12,24,24);}
requestAnimationFrame(f);
document.addEventListener('pointerdown',()=>{if(window.__ctl)return;window.__ctl=1;const ac=new AudioContext();const o=ac.createOscillator(),gn=ac.createGain();gn.gain.value=0.0001;o.connect(gn);gn.connect(ac.destination);o.start();});
</script>`;

const RES = opt('--res', '1280x720@1,640x360@3,1280x720@3').split(',').map((x) => x.split(/[x@]/).map(Number));
const out = { meta: { runs: RUNS, throttle: 6, freshBrowserPerVariant: true, res: RES.map(([w, h, d]) => `${w}x${h}@${d}`), cpus: cpus().length, started: new Date().toISOString() }, windows: [], menu: [] };
try {
  if (PART.includes('perf')) for (let run = 1; run <= RUNS; run++) {
    for (const [w, h, dsf] of RES) {
      for (const variant of VARIANTS) {
        await launch();
        const tag = `${w}x${h}@${dsf}`;
        const push = (win, fs) => { out.windows.push({ run, variant, res: tag, window: win, ...fs }); console.log(`  r${run} ${variant} ${tag} ${win}: avg ${fs.avg_fps} low1 ${fs.low1_fps} max ${fs.max_ms} script p95 ${fs.script_ms?.p95} ev ${fs.events_max_ms ?? '-'} cpu ${fs.cpu?.avg}/${fs.cpu?.max}${fs.busy ? ' BUSY' : ''} worst ${(fs.worst || []).map((x) => x.ms + '@' + x.at).join(' ')}`); };
        const { ctx, page } = await newPage(w, h, dsf);
        if (variant === 'control') {
          await page.route(`http://localhost:${PORT}/dev-control.html`, (r) => r.fulfill({ contentType: 'text/html', body: CTL_HTML }));
          await page.goto(`http://localhost:${PORT}/dev-control.html`);
          await sleep(300); await page.mouse.click(w / 2, h / 2);
          const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); await sleep(300);
          await page.evaluate(() => { window.__game = { grades: [], combo: 0, attempts: 0, state: 'ctl' }; });
          push('ctl 0-10s', await fpsWindow(page, () => sleep(10000)));
          await ctx.close(); continue;
        }
        await gotoVariant(page, variant);
        await page.waitForFunction(() => window.__game?.ready === true, null, { timeout: 20000 });
        await page.evaluate((t) => { window.__qaTaps = Object.fromEntries(Object.entries(t.levels).map(([k, v]) => [k, v.taps])); }, inputs);
        await page.mouse.click(w / 2, h / 2); await sleep(400);
        await sleep(1200);
        const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); await sleep(300);
        push('L1 start 0-10s', await fpsWindow(page, () => RT_PLAY(page, 0, 10)));
        await page.evaluate(() => window.__game.loadLevel(0));
        await page.waitForFunction(() => window.__game.state === 'dead', null, { timeout: 20000 });
        push('L1 death → restart +4s', await fpsWindow(page, async () => { await page.waitForFunction(() => window.__game.attempts >= 2 && window.__game.state === 'playing', null, { timeout: 10000 }).catch(() => {}); await sleep(4000); }));
        push('L4 start 0-20s', await fpsWindow(page, () => RT_PLAY(page, 3, 20)));
        push('L10 start 0-25s', await fpsWindow(page, () => RT_PLAY(page, 9, 25)));
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
        await ctx.close();
      }
    }
  }
  if (PART.includes('menu')) for (let run = 1; run <= RUNS; run++) {
    await launch();
    const maxFrame = async (page, act) => { await page.evaluate(() => { window.__mf = { t: [performance.now()], on: true }; const f = () => { if (!window.__mf.on) return; window.__mf.t.push(performance.now()); requestAnimationFrame(f); }; requestAnimationFrame(f); }); await act(); await sleep(700); const t = await page.evaluate(() => { window.__mf.on = false; return window.__mf.t; }); let m = 0; for (let i = 1; i < t.length; i++) m = Math.max(m, t[i] - t[i - 1]); return r1(m); };
    for (const [w, h, dsf] of RES) for (const variant of VARIANTS.filter((v) => v !== 'control')) {
      const { ctx, page } = await newPage(w, h, dsf);
      await gotoVariant(page, variant);
      await page.waitForFunction(() => window.__game?.ready === true, null, { timeout: 20000 });
      const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); await sleep(500);
      const r = { run, variant, res: `${w}x${h}@${dsf}` };
      const m0 = Date.now();
      r.first_tap_unlock = await maxFrame(page, () => page.mouse.click(w / 2, h * 0.7));
      r.title_to_levels = await maxFrame(page, () => page.click('#btnLevels'));
      r.levels_to_title = await maxFrame(page, () => page.click('#levels [data-back]'));
      r.title_to_settings = await maxFrame(page, () => page.click('#btnSettings'));
      r.settings_to_title = await maxFrame(page, () => page.click('#settings [data-back]'));
      r.play_start = await maxFrame(page, () => page.click('#btnPlay'));
      r.cpu = cpuBetween(m0, Date.now()); r.busy = !!(r.cpu && r.cpu.avg > 50);
      out.menu.push(r);
      console.log('  menu', run, variant, r.res, Object.entries(r).filter(([k]) => !['run', 'variant', 'res', 'cpu', 'busy'].includes(k)).map(([k, v]) => `${k} ${v}`).join(', '), 'cpu', JSON.stringify(r.cpu));
      await ctx.close();
    }
  }
} finally {
  try { await browser?.close(); } catch {}
  server.stop();
  clearInterval(cpuTimer);
}
const bw = out.windows.filter((x) => x.variant === 'build');
out.verdict = {
  low1_min: Math.min(...bw.map((x) => x.low1_fps)), low1_ge45: `${bw.filter((x) => x.low1_fps >= 45).length}/${bw.length}`,
  avg_min: Math.min(...bw.map((x) => x.avg_fps)),
  event_frame_max_ms: Math.max(...bw.map((x) => x.events_max_ms ?? 0)), event_le33: `${bw.filter((x) => (x.events_max_ms ?? 0) <= 33.4).length}/${bw.length}`,
  script_p95_max_ms: Math.max(...bw.map((x) => x.script_ms?.p95 ?? 0)),
  base_low1_min: out.windows.some((x) => x.variant === 'base') ? Math.min(...out.windows.filter((x) => x.variant === 'base').map((x) => x.low1_fps)) : null,
  base_low1_ge45: `${out.windows.filter((x) => x.variant === 'base' && x.low1_fps >= 45).length}/${out.windows.filter((x) => x.variant === 'base').length}`,
  control_low1_min: Math.min(...out.windows.filter((x) => x.variant === 'control').map((x) => x.low1_fps)),
  menu_max_ms: out.menu.length ? Math.max(...out.menu.filter((r) => r.variant === 'build').flatMap((r) => Object.entries(r).filter(([k]) => !['run', 'variant', 'res', 'cpu', 'busy'].includes(k)).map(([, v]) => v))) : null,
  base_menu_max_ms: out.menu.some((r) => r.variant === 'base') ? Math.max(...out.menu.filter((r) => r.variant === 'base').flatMap((r) => Object.entries(r).filter(([k]) => !['run', 'variant', 'res', 'cpu', 'busy'].includes(k)).map(([, v]) => v))) : null,
  menu_le100: `${out.menu.filter((r) => r.variant === 'build').filter((r) => Object.entries(r).filter(([k]) => !['run', 'variant', 'res', 'cpu', 'busy'].includes(k)).every(([, v]) => v <= 100)).length}/${out.menu.filter((r) => r.variant === 'build').length}`,
  busy_windows: bw.filter((x) => x.busy).length + '/' + bw.length,
  fails: bw.filter((x) => x.low1_fps < 45 || (x.events_max_ms ?? 0) > 33.4 || (x.script_ms?.p95 ?? 0) > 4).map((x) => `r${x.run} ${x.res} ${x.window}${x.busy ? ' [BUSY cpu ' + x.cpu.avg + ']' : ''}: low1 ${x.low1_fps}, ev ${x.events_max_ms} (${(x.events || []).filter((e) => e.ms > 33.4).map((e) => e.kind + ' ' + e.ms).join('; ')}), script p95 ${x.script_ms?.p95}`),
};
out.log = { console: log.console, pageerrors: log.pageerrors, external: log.external, requests: log.requests };
out.cpu_samples = cpuSamples;
writeFileSync(join(OUT, `r3p-perf-${TAG}.json`), JSON.stringify(out, null, 1) + '\n');
console.log('verdict', JSON.stringify(out.verdict, null, 1));
console.log('log', JSON.stringify({ console: log.console.length, pageerrors: log.pageerrors.length, external: log.external.length }));
for (const e of [...log.console, ...log.pageerrors].slice(0, 10)) console.log('  ' + e);
