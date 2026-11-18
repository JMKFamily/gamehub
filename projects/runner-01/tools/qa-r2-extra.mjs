#!/usr/bin/env node
// Reverbound round-2 1-4 추가 QA 검사 (qa-engineer). qa-round.mjs 기본 파트에 없는 criteria 항목을 잰다.
//
//   PLAYWRIGHT_CORE=<playwright-core 경로> QA_CHANNEL=msedge node projects/runner-01/tools/qa-r2-extra.mjs --round 2 --part perf3,firstrun,combo,a11y,chord,grep [--perf-runs 3] [--port 8151]
//
// 파트
//   perf3     criteria rhythm-01 round-2 성능 줄: 6배 스로틀 평균·1% low를 "매번 새 브라우저"로 --perf-runs(기본 3)회.
//             한 회 안에서 같은 시간대에 번갈아: 빌드(그대로) → 빌드(combo.enabled=false, 콤보 DOM·판정 글 없음) → 빌드(judge_pct.enabled=false, 판정 글 없음)
//             → 대조 페이지(게임 코드 없음: rAF + 캔버스 + AudioContext) → 대조+글(같은 페이지에 stroke+fill 캔버스 글 2줄).
//             창: L1 시작 0~10 s, L7(오브젝트 최다) 시작 0~20 s, L1 무입력 사망 → 재시작 +4 s. 해상도 1280x720@1, 640x360@3.
//             25 ms 넘는 프레임마다 겹치는 long-animation-frame(스크립트·blocking·렌더 시작), rAF 콜백 시간(프레임 예산), 측정 중 PC 전체 CPU 사용률(os.cpus 1 s 간격).
//   firstrun  criteria rhythm-01 round-2 지연 보정 줄의 runner-01 판: 빈 저장소 → 실제 UI 첫 실행(실제 마우스) →
//             (a) 바로 시작: 첫 시도 runComp = 그 순간 autoNow + 저장 오프셋, 시도마다 다시 읽는지
//             (b) 설정 → 박자 보정 테스트(빠르게/보통): 사람 = 들리는 박(예약 시각 + 탭 순간 autoNow) + X ms에 실제 마우스 → 저장 오프셋 = 규칙 기대값 ±10 ms,
//                 그 뒤 L1 첫 시도 runComp − autoNow = 저장 오프셋 (이중 보정 없음)
//   combo     criteria rhythm-02 재판정 줄 + 콤보 켬/끔: 봇 입력열(σ70·σ50·σ25)을 빌드 훅에 가상 시계 1 s 이하 조각으로 넣고(탭마다 press, 24틱 뒤 release),
//             "빌드 기록 탭"(press 순간 빌드 tick)과 "봇 전체 탭" 두 기준으로 node 기준(physics.js + combo-ref)과 비교. combo.enabled=false(요청 가로채기)에서 같은 비교.
//             grades pct·accuracy = combo-ref 계산.
//   a11y      CDP Accessibility.getFullAXTree + ariaSnapshot: 콤보 줄 meter·aria-valuenow, 레벨 카드 최고 콤보 표지, 레벨 선택·플레이·결과 화면 이름·상태·정확도, aria-hidden 요소의 aria-label 0
//   chord     OfflineAudioContext로 빌드 audio.js를 렌더: 콤보 10·20 화음, 킥(음악), 사망음 최고값·RMS (dB)
//   grep      games/reverbound/ 전체 원본 보호 grep (레퍼런스 이름 + 공식 한국어 번역어 + 고유 메뉴·모드 이름)
// 서버: tools/serve.mjs를 --port(기본 8151, runner-01 QA 8150~8169)로 띄우고 끝나면 그 PID만 종료.
// 결과: projects/runner-01/reviews/round-N/parts/<part>.json
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cpus } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const lib = await import(pathToFileURL(join(ROOT, 'harness/qa/lib.mjs')).href);
const { compileLevel, step, startState } = await import(pathToFileURL(join(ROOT, 'games/reverbound/js/physics.js')).href);
const { createComboJudge, deltaMs, pctOf, gradeFromPct, accuracyOf } = await import(pathToFileURL(join(ROOT, 'projects/runner-01/tools/sim/combo-ref.mjs')).href);
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const ROUND = opt('--round', '2');
const OUT = join(ROOT, `projects/runner-01/reviews/round-${ROUND}`);
const PARTS = join(OUT, 'parts'), SHOTS = join(OUT, 'shots');
mkdirSync(PARTS, { recursive: true }); mkdirSync(SHOTS, { recursive: true });
const PORT = +opt('--port', '8151');
if (PORT < 8150 || PORT > 8169) throw new Error('포트는 8150~8169만 (runner-01 QA 대역)');
const BASE = `http://localhost:${PORT}/games/reverbound/`;
const PART = opt('--part', 'perf3,firstrun,combo,a11y,chord,grep').split(',');
const DATA = join(ROOT, 'games/reverbound/data');
const readJ = (p) => JSON.parse(readFileSync(join(DATA, p), 'utf8'));
const bal = readJ('balance.json'), inputs = readJ('test-inputs.json');
const LEVELS = bal.levels.map((f) => readJ(f));
const hz = bal.physics_hz;
const r1 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);
const r3 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 1000) / 1000);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const pctl = (a, f) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(f * s.length))] : null; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const save = (name, obj) => writeFileSync(join(PARTS, name + '.json'), JSON.stringify(obj, null, 2));
const log = lib.newLog();

const NEED_BROWSER = PART.some((p) => !['grep', 'indep'].includes(p));
const server = NEED_BROWSER ? await lib.startServer(process.execPath, [join(ROOT, 'projects/runner-01/tools/serve.mjs'), String(PORT)], BASE) : { stop() {}, child: null };
console.log('server pid', server.child?.pid ?? '-', 'port', PORT);
let browser = null;
const launch = async () => { try { await browser?.close(); } catch {} browser = await lib.launch(); return browser; };

// 모든 페이지에 넣는 측정 스크립트: long-animation-frame, rAF 콜백 시간, AudioContext 만든 시각, 소리 예약 시각(start(when)), pointerdown timeStamp
const PROBE = () => {
  window.__qa = { loaf: [], cb: [], ctxAt: null, starts: [], taps: [], ctx: null };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { const q = window.__qa.loaf; if (q.length < 4000) q.push({ start: e.startTime, dur: e.duration, block: e.blockingDuration, render: e.renderStart ? e.renderStart - e.startTime : null, style: e.styleAndLayoutStart ? e.styleAndLayoutStart - e.startTime : null, scripts: (e.scripts || []).reduce((a, s) => a + s.duration, 0), top: (e.scripts || []).slice(0, 3).map((s) => `${s.invoker || ''}@${(s.sourceURL || '').split('/').pop()}:${s.sourceFunctionName || ''}:${Math.round(s.duration)}`) }); } }).observe({ type: 'long-animation-frame', buffered: true }); } catch {}
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((ts) => { const a = performance.now(); try { cb(ts); } finally { const q = window.__qa.cb; if (q.length < 200000) q.push(ts, performance.now() - a); } });
  try {
    const AC0 = window.AudioContext;
    window.AudioContext = new Proxy(AC0, { construct(t, a, nt) { const c = Reflect.construct(t, a, nt); if (window.__qa.ctxAt == null) { window.__qa.ctxAt = performance.now(); window.__qa.ctx = c; } return c; } });
    const st = AudioScheduledSourceNode.prototype.start;
    AudioScheduledSourceNode.prototype.start = function (when = 0, ...r) { const q = window.__qa.starts; if (q.length < 20000) q.push({ when, at: performance.now(), f: this.frequency ? this.frequency.value : null }); return st.call(this, when, ...r); };
  } catch {}
  document.addEventListener('pointerdown', (e) => { window.__qa.taps.push(e.timeStamp); }, true);
};

async function newPage(vw, vh, { dsf = 1, q = '?lang=ko', route = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dsf, locale: 'ko-KR' });
  await ctx.addInitScript(PROBE);
  if (route) await ctx.route('**/games/reverbound/data/balance.json', async (rt) => { const r = await rt.fetch(); const j = await r.json(); route(j); await rt.fulfill({ response: r, json: j }); });
  const page = await ctx.newPage();
  const tag = `${vw}x${vh}`;
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.console.push(`[${tag}] ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => log.pageerrors.push(`[${tag}] ${e.message}`));
  page.on('request', (r) => { log.requests++; const u = new URL(r.url()); if (['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol) && !['localhost', '127.0.0.1'].includes(u.hostname)) log.external.push(r.url()); });
  page.on('requestfailed', (r) => log.failed.push(`[${tag}] ${r.url()} ${r.failure()?.errorText}`));
  return { ctx, page };
}
async function openGame(vw, vh, o = {}) {
  const r = await newPage(vw, vh, o);
  await r.page.goto(BASE + (o.q ?? '?lang=ko'));
  await r.page.waitForFunction(() => window.__game?.ready === true, null, { timeout: 20000 });
  return r;
}
// node ↔ 페이지 performance.now 차이 (d = 페이지 − node)
async function clockMap(page) {
  let best = null;
  for (let i = 0; i < 7; i++) { const a = performance.now(); const p = await page.evaluate(() => performance.now()); const b = performance.now(); if (!best || b - a < best.rt) best = { rt: b - a, d: p - (a + b) / 2 }; }
  return best;
}

// ------------------------------------------------------------------ CPU 사용률 (PC 전체)
function cpuSampler() {
  const samples = []; let prev = cpus();
  const iv = setInterval(() => {
    const cur = cpus(); let idle = 0, tot = 0;
    cur.forEach((c, i) => { const p = prev[i].times, t = c.times; const d = (k) => t[k] - p[k]; const all = d('user') + d('nice') + d('sys') + d('idle') + d('irq'); tot += all; idle += d('idle'); });
    prev = cur; samples.push({ t: Date.now(), pct: tot ? +(100 * (1 - idle / tot)).toFixed(1) : null });
  }, 1000);
  return { stop: () => clearInterval(iv), between: (a, b) => { const s = samples.filter((x) => x.t >= a && x.t <= b + 1000).map((x) => x.pct); return s.length ? { mean: r1(s.reduce((p, q) => p + q, 0) / s.length), max: r1(Math.max(...s)), n: s.length } : null; }, all: samples };
}

// ------------------------------------------------------------------ FPS 창 (rAF performance.now 간격 + LoAF + rAF 콜백 시간)
async function fpsWindow(page, run) {
  await page.evaluate(() => { window.__qaFps = { t: [], on: true }; const f = () => { if (!window.__qaFps.on) return; window.__qaFps.t.push(performance.now()); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const w0 = Date.now();
  await run();
  const w1 = Date.now();
  const { t, loaf, cb } = await page.evaluate(() => { window.__qaFps.on = false; const t = window.__qaFps.t; const t0 = t[0] ?? 0; return { t, loaf: window.__qa.loaf.filter((e) => e.start + e.dur >= t0 - 1), cb: window.__qa.cb.slice() }; });
  const d = []; for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]);
  if (d.length < 5) return { frames: d.length, wall: [w0, w1] };
  const total = t[t.length - 1] - t[0];
  const sorted = [...d].sort((a, b) => b - a), n1 = Math.max(1, Math.floor(d.length * 0.01));
  const long = [];
  for (let i = 1; i < t.length; i++) {
    const dd = t[i] - t[i - 1]; if (dd <= 25) continue;
    const lo = loaf.filter((e) => e.start < t[i] && e.start + e.dur > t[i - 1]);
    long.push({ ms: r1(dd), atMs: r1(t[i - 1] - t[0]), loaf: lo.map((e) => ({ dur: r1(e.dur), block: r1(e.block), scripts: r1(e.scripts), render: r1(e.render), style: r1(e.style), top: e.top })) });
  }
  // rAF 콜백 합 (같은 ts끼리 합침) — 창 안 프레임만. 6배 스로틀에서 잰 값 = 스로틀된 JS 시간
  const per = new Map();
  for (let i = 0; i < cb.length; i += 2) if (cb[i] >= t[0] && cb[i] <= t[t.length - 1]) per.set(cb[i], (per.get(cb[i]) || 0) + cb[i + 1]);
  const cbs = [...per.values()];
  const loafIn = loaf.filter((e) => e.start >= t[0] - 1);
  return {
    frames: d.length, seconds: r1(total / 1000), avg_fps: r1((d.length / total) * 1000), low1_fps: r1(1000 / (sorted.slice(0, n1).reduce((a, b) => a + b, 0) / n1)),
    max_ms: r1(sorted[0]), second_max_ms: r1(sorted[1]), p99_ms: r1(sorted[n1 - 1]), over_25ms: d.filter((x) => x > 25).length, over_33ms: d.filter((x) => x > 33.4).length,
    raf_cb_ms: { median: r1(med(cbs)), p95: r1(pctl(cbs, 0.95)), p99: r1(pctl(cbs, 0.99)), max: r1(Math.max(...cbs)) },
    loaf_count: loafIn.length, loaf_scripts_sum_ms: r1(loafIn.reduce((a, e) => a + e.scripts, 0)), loaf_block_sum_ms: r1(loafIn.reduce((a, e) => a + (e.block || 0), 0)),
    long_frames: long.slice(0, 25), wall: [w0, w1],
  };
}

// 일반 모드 실시간 재생 (qa-round RT_PLAY와 같은 방식: 검증기 탭 틱 → 예상 perf 시각에 keydown/keyup 80 ms)
const RT_PLAY = (page, i, maxS, noInput = false) => page.evaluate(([i, maxS, noInput]) => new Promise((done) => {
  const g = window.__game, H = 240;
  const id = g.levelData(i).id; const taps = noInput ? [] : (g.testInputs?.levels?.[id]?.taps || window.__qaTaps[id]); // 일반 모드는 testInputs가 없어 QA가 넣은 입력열
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
    if (g.state === 'clear' || (!noInput && (g.state === 'dead' || restarted)) || performance.now() - t0 > maxS * 1000) { result = { state: g.state, attempts: g.attempts, progress: +g.progress.toFixed(1) }; done(result); return; }
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

// ------------------------------------------------------------------ perf3
const CTL_HTML = (text) => `<!doctype html><meta charset="utf-8"><title>qa-control</title><body style="margin:0;background:#1D1B36;overflow:hidden"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');function rs(){const d=devicePixelRatio||1;c.width=innerWidth*d;c.height=innerHeight*d;c.style.width=innerWidth+'px';c.style.height=innerHeight+'px';g.setTransform(d,0,0,d,0,0);}rs();
const TEXT=${text ? 'true' : 'false'};
function f(t){requestAnimationFrame(f);g.fillStyle='#1D1B36';g.fillRect(0,0,innerWidth,innerHeight);const R=Math.min(innerWidth,innerHeight)*0.3,a=t/1000*2;g.fillStyle='#2E2B55';for(let i=0;i<30;i++){g.fillRect((i*67+t/5)%innerWidth,innerHeight*0.7,30,30);}g.strokeStyle='#5A55A0';g.lineWidth=6;g.beginPath();g.arc(innerWidth/2,innerHeight/2,R,0,7);g.stroke();g.fillStyle='#7FE3FF';g.fillRect(innerWidth/2+R*Math.cos(a)-12,innerHeight/2+R*Math.sin(a)-12,24,24);
if(TEXT){const s=1+0.3*Math.sin(t/90);g.save();g.translate(innerWidth*0.35,innerHeight*0.35);g.scale(s,s);g.font='900 32px sans-serif';g.textAlign='center';g.lineJoin='round';g.lineWidth=6;g.strokeStyle='#1D1B36';g.strokeText('딱이야',0,0);g.fillStyle='#FFD34D';g.fillText('딱이야',0,0);g.font='800 20px sans-serif';g.strokeText('100%',0,26);g.fillText('100%',0,26);g.restore();}}
requestAnimationFrame(f);
document.addEventListener('pointerdown',()=>{if(window.__ctl)return;window.__ctl=1;const ac=new AudioContext();const o=ac.createOscillator(),gn=ac.createGain();gn.gain.value=0.0001;o.connect(gn);gn.connect(ac.destination);o.start();window.__ac=ac;});
</script>`;
async function partPerf3() {
  const RUNS = +opt('--perf-runs', '3');
  const RES = [[1280, 720, 1], [640, 360, 3]];
  const heavy = LEVELS.map((l, i) => ({ i, id: l.id, n: l.objects.length })).sort((a, b) => b.n - a.n)[0];
  const variants = [
    { key: 'build', label: '빌드 그대로' },
    { key: 'build_combo_off', label: '빌드 combo.enabled=false (콤보 줄 DOM·판정 글·화음 없음)', route: (j) => { j.combo.enabled = false; } },
    { key: 'build_pct_off', label: '빌드 judge_pct.enabled=false (판정 이름·% 캔버스 글 없음, 콤보 줄 있음)', route: (j) => { j.combo.judge_pct.enabled = false; } },
    { key: 'control', label: '대조 페이지 (게임 코드 없음: rAF + 캔버스 + AudioContext)', ctl: true },
    { key: 'control_text', label: '대조 페이지 + 캔버스 글 stroke+fill 2줄/프레임', ctl: true, text: true },
  ];
  const cpu = cpuSampler();
  const out = { meta: { runs: RUNS, freshBrowserPerVariant: true, throttle: 6, heavy_level: heavy, res: RES.map(([w, h, d]) => `${w}x${h}@${d}`), cpus: cpus().length, started: new Date().toISOString() }, windows: [] };
  try {
    for (let run = 1; run <= RUNS; run++) {
      for (const v of variants) {
        await launch(); // 변형마다 새 브라우저
        for (const [w, h, dsf] of RES) {
          const tag = `${w}x${h}@${dsf}`;
          const push = (win, fs) => { const c = cpu.between(fs.wall?.[0] ?? 0, fs.wall?.[1] ?? 0); out.windows.push({ run, variant: v.key, res: tag, window: win, ...fs, cpu_pc: c }); console.log(`  perf3 r${run} ${v.key} ${tag} ${win}: avg ${fs.avg_fps} low1 ${fs.low1_fps} max ${fs.max_ms} cb95 ${fs.raf_cb_ms?.p95} cpu ${c?.mean}`); };
          if (v.ctl) {
            const { ctx, page } = await newPage(w, h, { dsf });
            await page.route(`http://localhost:${PORT}/qa-control.html`, (r) => r.fulfill({ contentType: 'text/html', body: CTL_HTML(!!v.text) }));
            await page.goto(`http://localhost:${PORT}/qa-control.html`);
            await sleep(300); await page.mouse.click(w / 2, h / 2);
            const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
            await sleep(300);
            push('ctl 0-10s', await fpsWindow(page, () => sleep(10000)));
            push('ctl 10-30s', await fpsWindow(page, () => sleep(20000)));
            await ctx.close();
            continue;
          }
          const { ctx, page } = await openGame(w, h, { dsf, route: v.route });
          await page.evaluate((t) => { window.__qaTaps = Object.fromEntries(Object.entries(t.levels).map(([k, v]) => [k, v.taps])); }, inputs);
          await page.mouse.click(w / 2, h / 2); await sleep(400); // 첫 탭: 오디오 켜짐 → 메뉴
          await page.waitForFunction(() => window.__game.latency && !window.__game.latency.pending, null, { timeout: 3000 }).catch(() => {});
          await sleep(1200); // 자동 지연 안정 대기(빌드 최대 1 s) 밖에서 시작
          const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
          await sleep(300);
          push('L1 start 0-10s', await fpsWindow(page, () => RT_PLAY(page, 0, 10)));
          push(`L${heavy.id} start 0-20s`, await fpsWindow(page, () => RT_PLAY(page, heavy.i, 20)));
          // 사망 → 재시작 직후: L1 무입력, 첫 사망 감지 뒤 재시작 +4 s까지
          await page.evaluate(() => window.__game.loadLevel(0));
          await page.waitForFunction(() => window.__game.state === 'dead', null, { timeout: 20000 });
          push('L1 death → restart +4s', await fpsWindow(page, async () => { await page.waitForFunction(() => window.__game.attempts >= 2 && window.__game.state === 'playing', null, { timeout: 10000 }).catch(() => {}); await sleep(4000); }));
          // 시작 직후만: L4 시작 0-6 s (round-1·dev 측정 레벨)
          push('L4 start 0-6s', await fpsWindow(page, () => RT_PLAY(page, 3, 6)));
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
          await ctx.close();
        }
      }
    }
  } finally { cpu.stop(); }
  // 요약: 변형 × 해상도 × 창별 회차 값
  const sum = {};
  for (const wdw of out.windows) { const k = `${wdw.variant} | ${wdw.res} | ${wdw.window}`; (sum[k] ??= { avg: [], low1: [], max: [], cb95: [], cpu: [] }); sum[k].avg.push(wdw.avg_fps); sum[k].low1.push(wdw.low1_fps); sum[k].max.push(wdw.max_ms); sum[k].cb95.push(wdw.raf_cb_ms?.p95); sum[k].cpu.push(wdw.cpu_pc?.mean); }
  out.summary = sum;
  const gw = out.windows.filter((x) => x.variant === 'build');
  out.verdict = { build_windows: gw.length, build_avg_ge55: gw.filter((x) => x.avg_fps >= 55).length, build_low1_ge45: gw.filter((x) => x.low1_fps >= 45).length,
    build_fails: gw.filter((x) => x.low1_fps < 45 || x.avg_fps < 55).map((x) => `r${x.run} ${x.res} ${x.window}: ${x.avg_fps}/${x.low1_fps} (max ${x.max_ms}, cpu ${x.cpu_pc?.mean}%)`),
    control_low1_lt45: out.windows.filter((x) => x.variant.startsWith('control') && x.low1_fps < 45).map((x) => `r${x.run} ${x.variant} ${x.res} ${x.window}: ${x.avg_fps}/${x.low1_fps} (max ${x.max_ms}, cpu ${x.cpu_pc?.mean}%)`) };
  out.cpu_samples = cpu.all;
  return out;
}

// ------------------------------------------------------------------ firstrun
async function partFirstRun() {
  const out = { definition: '들리는 박 = 예약 시각(start when) + 탭 순간 autoNow(outputLatency+baseLatency). 사람 = 들리는 박 + X ms에 실제 마우스(CDP) 누름. 자기 일관 측정(게임 값으로 들리는 박 계산) 안 씀', runs: [] };
  const cases = [
    { name: 'direct_fast', mode: 'direct', gapMs: 60 },
    { name: 'direct_normal', mode: 'direct', gapMs: 1000 },
    { name: 'calib_fast', mode: 'calib', gapMs: 60, X: 0 },
    { name: 'calib_normal', mode: 'calib', gapMs: 700, X: 0 },
    { name: 'calib_normal_late60', mode: 'calib', gapMs: 700, X: 60 },
  ];
  await launch();
  for (const c of cases) {
    const { ctx, page } = await openGame(1280, 720, { q: '?lang=ko' });
    const storeBefore = await page.evaluate(() => { try { return localStorage.length; } catch { return -1; } });
    const tl = [];
    const lat = async (tag) => { const s = await page.evaluate(() => { const g = window.__game, c = window.__qa.ctx; return { ...(g.latency || {}), state: g.state, screen: g.screen, attempts: g.attempts, autoNow: c ? ((c.outputLatency || 0) + (c.baseLatency || 0)) * 1000 : null, sinceCtx: window.__qa.ctxAt == null ? null : performance.now() - window.__qa.ctxAt, offset: g.save.settings.offset }; }); tl.push({ tag, auto_ms: r1(s.auto * 1000), comp_ms: r1(s.comp * 1000), runComp_ms: r1(s.runComp * 1000), autoNow_ms: r1(s.autoNow), pending: s.pending, state: s.state, attempts: s.attempts, sinceCtx_ms: r1(s.sinceCtx), offset: s.offset }); return s; };
    const run = { name: c.name, emptyStorageAtStart: storeBefore === 0, timeline: tl };
    await page.mouse.click(640, 400); // 타이틀 첫 탭 (오디오 잠금 해제)
    await lat('첫 탭 직후');
    await sleep(c.gapMs);
    if (c.mode === 'direct') {
      await page.click('#btnPlay');
      await lat('달리기 누른 직후');
      await page.waitForFunction(() => window.__game.screen === 'playing' && window.__game.attempts >= 1, null, { timeout: 5000 });
      const a1 = await lat('첫 시도 시작');
      await page.waitForFunction(() => window.__game.attempts >= 2, null, { timeout: 20000 }); // 무입력 사망 → 2번째 시도
      await sleep(100);
      const a2 = await lat('2번째 시도');
      run.check = { first_runComp_ms: r1(a1.runComp * 1000), autoNow_at_first_ms: r1(a1.autoNow), offset_ms: a1.offset, first_minus_autoNow_minus_offset_ms: r1(a1.runComp * 1000 - a1.autoNow - a1.offset), second_runComp_ms: r1(a2.runComp * 1000), second_minus_autoNow_ms: r1(a2.runComp * 1000 - a2.autoNow - a2.offset),
        ok_pm10: Math.abs(a1.runComp * 1000 - a1.autoNow - a1.offset) <= 10 && Math.abs(a2.runComp * 1000 - a2.autoNow - a2.offset) <= 10 };
    } else {
      await page.click('#btnSettings'); await sleep(c.gapMs);
      const n0 = await page.evaluate(() => window.__qa.starts.length);
      const ct0 = await page.evaluate(() => window.__qa.ctx.currentTime);
      await page.click('#bOffsetTest');
      const atTest = await lat('보정 테스트 누른 직후');
      await sleep(250);
      // 예약된 메트로놈 8박 시각 (start when, 중복 제거)
      const whens = await page.evaluate(([n0, ct0]) => [...new Set(window.__qa.starts.slice(n0).map((s) => Math.round(s.when * 1e6) / 1e6))].filter((w) => w > ct0).sort((a, b) => a - b), [n0, ct0]);
      // 같은 박의 여러 발진기 묶기 (1 ms 이내)
      const beats = []; for (const w of whens) if (!beats.length || w - beats[beats.length - 1] > 0.01) beats.push(w);
      const blank = await page.evaluate(() => { for (const [x, y] of [[640, 12], [20, 700], [1260, 700], [640, 712]]) { const e = document.elementFromPoint(x, y); if (!e || !e.closest('button, input, label, a, .row')) return [x, y]; } return null; });
      await page.mouse.move(...(blank || [640, 712]));
      const cm = await clockMap(page);
      const heard = [], autoAt = [], gameAuto = [];
      for (const T of beats.slice(0, 8)) {
        const q = await page.evaluate(() => { const ctx = window.__qa.ctx; let off = -1e9; for (let k = 0; k < 40; k++) off = Math.max(off, ctx.currentTime - performance.now() / 1000); return { off, autoNow: ((ctx.outputLatency || 0) + (ctx.baseLatency || 0)), game: window.__game.latency.auto }; });
        const heardPerf = (T + q.autoNow - q.off) * 1000;
        const target = heardPerf + c.X - cm.d - 2;
        const wait = target - performance.now();
        if (wait < -5) { heard.push(null); continue; }
        if (wait > 25) await sleep(wait - 20);
        while (performance.now() < target) { /* spin */ }
        await page.mouse.down(); await page.mouse.up();
        heard.push(heardPerf); autoAt.push(q.autoNow * 1000); gameAuto.push(q.game * 1000);
      }
      await page.waitForFunction(() => document.getElementById('offsetTestOut').textContent !== '…', null, { timeout: 6000 }).catch(() => {});
      await sleep(200);
      const res = await page.evaluate(() => ({ offset: window.__game.save.settings.offset, out: document.getElementById('offsetTestOut').textContent, taps: window.__qa.taps.slice() }));
      const tapsT = res.taps.slice(-heard.filter((x) => x != null).length);
      const hh = heard.filter((x) => x != null);
      const diffs = tapsT.map((t, i) => t - hh[i]);
      const m = med(diffs);
      const expect = Math.max(-200, Math.min(200, Math.round((0 + m) / 5) * 5)); // 빌드 규칙(5 ms 단위 반올림)을 실제 탭 − 들리는 박에 적용
      run.calib = { beats_scheduled: beats.length, taps: hh.length, tap_minus_heard_median_ms: r1(m), tap_minus_heard_range_ms: diffs.length ? [r1(Math.min(...diffs)), r1(Math.max(...diffs))] : null, autoNow_at_taps_ms: [...new Set(autoAt.map(r1))], game_auto_at_taps_ms: [...new Set(gameAuto.map(r1))], comp_at_test_start_ms: r1(atTest.comp * 1000),
        saved_offset_ms: res.offset, expected_offset_ms: expect, offset_err_ms: res.offset - expect, ok_pm10: Math.abs(res.offset - expect) <= 10, shown: res.out };
      // 레벨 1: 뒤로 → 달리기
      await page.click('#settings [data-back]'); await sleep(300);
      await page.click('#btnPlay');
      await page.waitForFunction(() => window.__game.screen === 'playing' && window.__game.attempts >= 1, null, { timeout: 5000 });
      await sleep(50);
      const a1 = await lat('L1 첫 시도');
      run.l1 = { runComp_ms: r1(a1.runComp * 1000), autoNow_ms: r1(a1.autoNow), saved_offset_ms: a1.offset, runComp_minus_autoNow_ms: r1(a1.runComp * 1000 - a1.autoNow), should_be_ms: expect, double_correction_ms: r1(a1.runComp * 1000 - a1.autoNow - expect), ok_pm10: Math.abs(a1.runComp * 1000 - a1.autoNow - expect) <= 10 };
    }
    console.log(`  firstrun ${c.name}: ${JSON.stringify(run.check || { calib: run.calib, l1: run.l1 })}`);
    out.runs.push(run);
    await ctx.close();
  }
  return out;
}

// ------------------------------------------------------------------ combo (재판정 두 기준, 켬/끔)
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const PROF = { child_sd70: { sd: 70, miss: 0.03, extra: 0.02 }, novice_sd50: { sd: 50, miss: 0.01, extra: 0.01 }, skilled_sd25: { sd: 25, miss: 0, extra: 0 } };
const HOLD = 24;
function botTaps(base, p, rnd) {
  const o = [];
  for (const k of base) { if (rnd() < p.miss) continue; const g = Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd()); o.push(Math.max(0, Math.round(k + (g * p.sd * hz) / 1000))); if (rnd() < p.extra) o.push(Math.round(k + (0.15 + 0.3 * rnd()) * hz)); }
  o.sort((a, b) => a - b);
  const kept = []; for (const k of o) if (!kept.length || k >= kept[kept.length - 1] + HOLD) kept.push(k);
  return kept;
}
function refRun(L, taps, judgeTaps, comboCfg) {
  const J = createComboJudge(judgeTaps, comboCfg, hz);
  const starts = new Set(taps);
  let s = startState(L), j = 0, until = -1, press = null, nextId = 0;
  J.reset(0);
  for (let k = 0; k < L.nTicks; k++) {
    while (j < taps.length && taps[j] <= k) { until = Math.max(until, taps[j] + HOLD); j++; }
    const down = k < until, edge = starts.has(k);
    if (edge) press = nextId++; else if (!down) press = null;
    const r = step(L, s, k, down, edge);
    if (r.dead) { J.onDeath(); return { clear: false, deathTick: k, grades: J.grades, combo: 0, accuracy: null }; }
    J.onStep(k, r.ev, down ? press : null);
    if (r.clear) { J.onClear(); return { clear: true, grades: J.grades, combo: J.combo, accuracy: J.accuracy }; }
    s = r.s;
  }
  J.onClear();
  return { clear: true, grades: J.grades, combo: J.combo, accuracy: J.accuracy };
}
async function partCombo() {
  const N = +opt('--combo-n', '60');
  const cases = [];
  LEVELS.forEach((lvl, li) => {
    const base = inputs.levels[lvl.id].on_beat_taps;
    for (const [pn, p] of Object.entries(PROF)) { const rnd = mulberry(7000 + 100 * li + Object.keys(PROF).indexOf(pn)); for (let a = 0; a < N; a++) cases.push({ li, pn, taps: botTaps(base, p, rnd) }); }
    cases.push({ li, pn: 'perfect', taps: [...inputs.levels[lvl.id].taps].sort((a, b) => a - b) });
  });
  const Ls = LEVELS.map((l) => compileLevel(l, bal));
  const out = { n_per_level_profile: N, cases: cases.length, chunk_s: 1, modes: {} };
  await launch();
  for (const mode of ['on', 'combo_off']) {
    const { ctx, page } = await openGame(1280, 720, { q: '?test=1&lang=ko', route: mode === 'combo_off' ? (j) => { j.combo.enabled = false; } : null });
    // 가상 시계: 탭 틱까지 1 s 이하 조각으로 step, 탭 틱에서 press(빌드 tick 기록), HOLD틱 뒤 release. 사망·클리어면 그 시도에서 멈춤(재시작 경계 넘지 않음)
    const DBG = args.includes('--combo-debug');
    const res = await page.evaluate(([cs, HOLD]) => {
      const G = window.__game, H = 240, CH = H; // 1 s = 240틱 이하 조각
      const stepTo = (k) => { while (G.state === 'playing' && G.tick < k) { const n = Math.min(CH, k - G.tick); G.step(n / H); } };
      return cs.map((c) => {
        G.release(); G.loadLevel(c.li); const a0 = G.attempts; // 앞 시도에서 누른 채 끝난 입력(inputHeld)이 다음 레벨 시작 홀드로 넘어가지 않게
        const rec = []; let maxChunk = 0;
        const ev = []; for (const k of c.taps) { ev.push([k, 1]); ev.push([k + HOLD, 0]); }
        ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        for (const [k, down] of ev) { stepTo(k); if (G.state !== 'playing') break; if (down) { rec.push(G.tick); G.press(); } else G.release(); }
        let guard = 0; while (G.state === 'playing' && guard++ < 2000) G.step(1);
        const a1 = G.attempts; const death = G.state === 'dead' ? G.tick : null; const out1 = { clear: G.state === 'clear', grades: G.grades.map((g) => ({ i: g.i, k: g.k, e_ms: g.e_ms, grade: g.grade, pct: g.pct ?? null })), combo: G.combo, accuracy: G.accuracy, rec, attemptsDelta: a1 - a0, deathTick: death, tickAtEnd: G.tick };
        G.release(); const rp = G.replay(c.li, c.taps, { holdTicks: HOLD, frameDt: 1 / 60 }); out1.replay = { state: rp.state, n: G.grades.length, death: rp.death }; return out1;
      });
    }, [cases.map((c) => ({ li: c.li, taps: c.taps })), HOLD]);
    const comboCfg = mode === 'combo_off' ? { ...bal.combo, enabled: false } : bal.combo;
    const st = { total: cases.length, by: {}, mismatch_recorded: 0, mismatch_full: 0, recorded_ne_full: 0, pct_ne_ref: 0, acc_ne_ref: 0, pct_to_grade_mismatch: 0, judged: 0, attempt_boundary_crossed: 0, examples: [] };
    const strip = (g) => JSON.stringify(g.map((x) => [x.i, x.k, x.e_ms, x.grade, x.pct ?? null]));
    cases.forEach((c, j) => {
      const b = res[j], L = Ls[c.li], jt = LEVELS[c.li].judge_taps;
      const refFull = refRun(L, c.taps, jt, bal.combo); // %·정확도 기준은 항상 켠 combo-ref
      const refRec = refRun(L, b.rec, jt, bal.combo);
      const key = `${LEVELS[c.li].id}/${c.pn}`; const s = (st.by[key] ??= { n: 0, clear: 0, mm_rec: 0, mm_full: 0 });
      s.n++; if (b.clear) s.clear++;
      if (b.attemptsDelta !== 0) st.attempt_boundary_crossed++;
      const replaySame = b.replay.state === (refFull.clear ? 'clear' : 'dead') && b.replay.n === refFull.grades.length; if (!replaySame) st.replay_ne_ref = (st.replay_ne_ref || 0) + 1;
      const same = (r) => b.clear === r.clear && b.combo === r.combo && JSON.stringify(b.grades.map((x) => [x.i, x.k, x.e_ms, x.grade])) === JSON.stringify(r.grades.map((x) => [x.i, x.k, x.e_ms, x.grade]));
      if (!same(refRec) && (st.debug ??= []).length < 4) st.debug.push({ key, taps: c.taps, rec: b.rec, buildDeathTick: b.deathTick, refDeathTick: refRec.deathTick, buildClear: b.clear, refClear: refRec.clear, nb: b.grades.length, nr: refRec.grades.length, replay: b.replay });
      if (!same(refRec)) { st.mismatch_recorded++; s.mm_rec++; if (st.examples.length < 5) st.examples.push({ key, j, basis: 'recorded', build: { clear: b.clear, n: b.grades.length, combo: b.combo }, ref: { clear: refRec.clear, n: refRec.grades.length, combo: refRec.combo } }); }
      if (!same(refFull)) { st.mismatch_full++; s.mm_full++; if (st.examples.length < 5) st.examples.push({ key, j, basis: 'full', build: { clear: b.clear, n: b.grades.length }, ref: { clear: refFull.clear, n: refFull.grades.length } }); }
      if (JSON.stringify(b.rec) !== JSON.stringify(c.taps.slice(0, b.rec.length))) st.recorded_ne_full++;
      st.judged += b.grades.length;
      // pct·accuracy = combo-ref (켠 상태만 % 존재)
      if (mode === 'on') {
        if (strip(b.grades) !== strip(refFull.grades)) st.pct_ne_ref++;
        if (b.accuracy !== refFull.accuracy) st.acc_ne_ref++;
        for (const g of b.grades) if (g.pct != null && gradeFromPct(g.pct, bal.combo) !== g.grade) st.pct_to_grade_mismatch++;
      } else if (b.accuracy !== refFull.accuracy && !(b.accuracy == null || b.accuracy === refFull.accuracy)) st.acc_ne_ref++;
    });
    out.modes[mode] = st;
    console.log(`  combo ${mode}: ${cases.length}시도 판정 ${st.judged}, 불일치 기록탭 ${st.mismatch_recorded} / 전체탭 ${st.mismatch_full}, pct≠ref ${st.pct_ne_ref}, acc≠ref ${st.acc_ne_ref}, %→등급 ${st.pct_to_grade_mismatch}, 시도 경계 ${st.attempt_boundary_crossed}`);
    await ctx.close();
  }
  // 켬 ↔ 끔 사이: 생사·등급·콤보 같음
  return out;
}

// ------------------------------------------------------------------ a11y
async function axTree(page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const lines = [];
  const val = (n, k) => n.properties?.find((p) => p.name === k)?.value?.value;
  for (const n of nodes) {
    if (n.ignored) continue;
    const role = n.role?.value, name = n.name?.value ?? '';
    if (!role || ['none', 'generic', 'InlineTextBox', 'StaticText', 'LineBreak'].includes(role) && !name) continue;
    lines.push({ role, name, value: n.value?.value ?? null, valuetext: val(n, 'valuetext') ?? null, valuenow: n.value?.value ?? val(n, 'valuenow') ?? null, disabled: val(n, 'disabled') ?? null, live: val(n, 'live') ?? null });
  }
  return lines;
}
async function partA11y() {
  const out = { tool: 'CDP Accessibility.getFullAXTree (ignored 제외) + locator.ariaSnapshot()', langs: {} };
  await launch();
  for (const lang of ['ko', 'en']) {
    const L = (out.langs[lang] = {});
    const { ctx, page } = await openGame(1280, 720, { q: `?test=1&lang=${lang}` });
    // 레벨 1·2 클리어(최고 콤보 기록) → 레벨 선택
    await page.evaluate(() => { const g = window.__game; g.replay(0); g.step(1.3); g.replay(1); g.step(1.3); });
    await page.evaluate(() => window.__game.show('title')); await sleep(100);
    L.title = (await axTree(page)).filter((x) => ['button', 'link', 'heading'].includes(x.role)).map((x) => `${x.role} "${x.name}"`);
    await page.evaluate(() => window.__game.show('levels')); await sleep(200);
    const lv = await axTree(page);
    L.levels = lv.filter((x) => ['button', 'meter', 'progressbar'].includes(x.role)).map((x) => `${x.role} "${x.name}"${x.valuetext != null ? ' valuetext=' + x.valuetext : ''}${x.valuenow != null ? ' now=' + x.valuenow : ''}${x.disabled ? ' disabled' : ''}`);
    L.levels_aria = await page.locator('#levels').ariaSnapshot().catch((e) => 'ERR ' + e.message);
    L.card_meter_count = lv.filter((x) => x.role === 'meter').length;
    L.card_buttons = lv.filter((x) => x.role === 'button' && /^\d+\./.test(x.name)).length;
    // 플레이 중 (레벨 2 중간, 콤보 ≥ 2)
    await page.evaluate(() => { const g = window.__game; g.seek(1, 120); g.step(1 / 60); });
    await sleep(100);
    const pl = await axTree(page);
    const combo = await page.evaluate(() => { const e = document.getElementById('combo'); return { combo: window.__game.combo, valuenow: e.getAttribute('aria-valuenow'), valuetext: e.getAttribute('aria-valuetext'), label: e.getAttribute('aria-label'), hidden: e.classList.contains('hidden') || getComputedStyle(e).display === 'none' }; });
    L.play = { combo_dom: combo, ax_meters: pl.filter((x) => x.role === 'meter').map((x) => `meter "${x.name}" now=${x.valuenow} text=${x.valuetext}`), ax_buttons: pl.filter((x) => x.role === 'button').map((x) => x.name), canvas: pl.filter((x) => /canvas|img|image/i.test(x.role)).map((x) => `${x.role} "${x.name}"`) };
    L.play.combo_meter_in_tree = pl.some((x) => x.role === 'meter' && String(x.valuenow) === String(combo.combo));
    // 결과 화면 (레벨 1 클리어)
    await page.evaluate(() => { const g = window.__game; g.replay(0); for (let j = 0; j < 90; j++) g.step(1 / 60); });
    await sleep(100);
    const cl = await axTree(page);
    const acc = await page.evaluate(() => window.__game.accuracy);
    L.clear = { accuracy_hook: acc, ax: cl.filter((x) => ['heading', 'meter', 'button', 'paragraph', 'StaticText'].includes(x.role) && x.name).map((x) => `${x.role} "${x.name}"${x.valuenow != null ? ' now=' + x.valuenow : ''}${x.valuetext != null ? ' text=' + x.valuetext : ''}`).slice(0, 30) };
    L.clear.accuracy_in_tree = cl.some((x) => x.role === 'meter' && String(x.valuenow) === String(acc));
    L.clear.aria = await page.locator('#clearS').ariaSnapshot().catch((e) => 'ERR ' + e.message);
    // 일시정지
    await page.evaluate(() => { const g = window.__game; g.loadLevel(0); g.step(1); g.pause(); }); await sleep(100);
    L.pause = (await axTree(page)).filter((x) => ['button', 'heading'].includes(x.role)).map((x) => `${x.role} "${x.name}"`);
    // aria-hidden 요소(또는 그 안)에 aria-label
    L.aria_hidden_with_label = await page.evaluate(() => [...document.querySelectorAll('[aria-label]')].filter((e) => e.closest('[aria-hidden="true"]')).map((e) => `${e.tagName.toLowerCase()}#${e.id}.${e.className?.baseVal ?? e.className}: ${e.getAttribute('aria-label')}`));
    // 버튼 이름이 빈 것
    L.unnamed_buttons = await page.evaluate(() => { const r = []; for (const s of ['title', 'levels', 'settings', 'pause', 'clearS']) { window.__game.show(s === 'clearS' ? 'title' : s); } return r; });
    await ctx.close();
  }
  return out;
}

// ------------------------------------------------------------------ chord (OfflineAudioContext 렌더)
async function partChord() {
  await launch();
  const { ctx, page } = await newPage(800, 600);
  await page.route(`http://localhost:${PORT}/games/reverbound/qa-offline.html`, (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>qa-offline</title><body>offline</body>' }));
  await page.goto(`http://localhost:${PORT}/games/reverbound/qa-offline.html`);
  const res = await page.evaluate(async () => {
    const { createAudio, expandThemes } = await import('./js/audio.js');
    const { compileLevel } = await import('./js/physics.js');
    const music = expandThemes(await (await fetch('./data/music.json')).json());
    const bal = await (await fetch('./data/balance.json')).json();
    const lvl = await (await fetch('./data/' + bal.levels[0])).json();
    const L = compileLevel(lvl, bal);
    const SR = 48000;
    const render = async (sec, fn) => {
      const off = new OfflineAudioContext(2, SR * sec, SR);
      Object.defineProperty(off, 'state', { get: () => 'running' });
      off.resume = async () => {};
      const AC0 = window.AudioContext; window.AudioContext = function () { return off; };
      const A = createAudio(music); A.init(); window.AudioContext = AC0;
      fn(A, off);
      const buf = await off.startRendering();
      A.stopRun?.(true);
      const d = buf.getChannelData(0); let pk = 0, ss = 0, n = 0;
      for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > pk) pk = v; if (v > 1e-4) { ss += d[i] * d[i]; n++; } }
      const db = (x) => (x > 0 ? Math.round(2000 * Math.log10(x)) / 100 : null);
      return { peak: +pk.toFixed(5), peak_db: db(pk), rms_db_active: n ? db(Math.sqrt(ss / n)) : null };
    };
    const out = { level: lvl.id, theme: lvl.theme_id, vols: 'musicVol 0.8 / sfxVol 0.8 (기본 설정 80/80)' };
    // 음악만 (킥 포함 곡 첫 4 s)
    out.music_only = await render(4, (A) => { A.setVolumes(0.8, 0); A.startRun(lvl, L, lvl.theme_id, 0, 0.05); });
    // 킥 1타 (곡 없이 킥 악기만: 같은 곡을 0.6 s만)
    out.music_first_0p6s = await render(0.6, (A) => { A.setVolumes(0.8, 0); A.startRun(lvl, L, lvl.theme_id, 0, 0.02); });
    for (const mark of [10, 20]) out['combo_' + mark] = await render(2, (A) => { A.setVolumes(0, 0.8); A.startRun(lvl, L, lvl.theme_id, 0, 0.0); A.sfx('combo_mark', { mark, beatTimeS: 0.2 }); });
    out.death = await render(2, (A) => { A.setVolumes(0, 0.8); A.sfx('death'); });
    out.new_best = await render(2, (A) => { A.setVolumes(0, 0.8); A.sfx('new_best'); });
    out.menu = await render(1, (A) => { A.setVolumes(0, 0.8); A.sfx('menu'); });
    return out;
  });
  await ctx.close();
  const k = res.music_only.peak_db;
  res.relative_to_music_peak_db = Object.fromEntries(Object.entries(res).filter(([, v]) => v && v.peak_db != null).map(([n, v]) => [n, Math.round((v.peak_db - k) * 100) / 100]));
  console.log('  chord', JSON.stringify(res.relative_to_music_peak_db));
  return res;
}

// ------------------------------------------------------------------ grep (원본 보호)
function partGrep() {
  // 레퍼런스 이름 + 공식 한국어 번역어 + 레퍼런스 고유 메뉴·모드·아이템 이름 (일반어 제외)
  const terms = [
    'Geometry Dash', 'GeometryDash', 'Geometry-Dash', 'geometrydash', 'RobTop', 'Robtop', 'Rob Top', '지오메트리 대시', '지오메트리대시', '지오메트리 대쉬', '로브탑', '롭탑',
    'Stereo Madness', 'Back On Track', 'Polargeist', 'Dry Out', 'Base After Base', "Can't Let Go", 'Jumper', 'Time Machine', 'Cycles', 'xStep', 'Clutterfunk', 'Theory of Everything', 'Electroman', 'Clubstep', 'Electrodynamix', 'Hexagon Force', 'Blast Processing', 'Geometrical Dominator', 'Deadlocked', 'Fingerdash', 'Dash',
    '스테레오 매드니스', '폴라가이스트', '클럽스텝', '헥사곤 포스', '데드락드', '일렉트로맨',
    'Forte', 'ForTe', 'Waterflame', 'DJVI', 'Partition', 'MDK', 'Creo', 'F-777', 'Dex Arson',
    'The Vault', 'Vault of Secrets', 'Chamber of Time', 'Mana orb', 'mana orbs', 'Secret Coin', 'User Coin', 'Demon', 'Gauntlet', 'Map Pack', 'Treasure Room', 'The Shop', "Scratch's Shop", 'Scratch', 'Potbor', 'Gatekeeper', 'Keymaster', 'Monster', 'Diamond', 'Orbs', 'Ship', 'UFO', 'Wave', 'Robot', 'Spider', 'Swingcopter', 'Ball mode', 'Cube',
    '보관소', '비밀 코인', '유저 코인', '데몬', '건틀릿', '맵 팩', '스크래치',
    'DJMAX', 'DJ MAX', 'DJMax', 'djmax', '디제이맥스', '디맥', 'RESPECT', 'Neowiz', 'NEOWIZ', '네오위즈', 'Pentavision', '펜타비전', 'MAX COMBO', 'MAX 100%', 'MAX 90%', 'BREAK', 'Fever', 'FEVER', '피버', 'Ladder Match', '래더',
    'Practice Mode', 'Normal Mode', 'Attempt',
  ];
  // 일반어로 판단해 결과를 '참고'로만 두는 낱말 (게임에서 일반 뜻으로 쓰일 수 있음): 아래는 히트가 있으면 줄을 보여 주되 판정은 사람이 함
  const generic = new Set(['Jumper', 'Cycles', 'Dash', 'Partition', 'Demon', 'Monster', 'Diamond', 'Orbs', 'Ship', 'UFO', 'Wave', 'Robot', 'Spider', 'Ball mode', 'Cube', 'BREAK', 'Fever', 'FEVER', 'RESPECT', 'Scratch', 'Practice Mode', 'Normal Mode', 'Attempt', 'Forte', 'Creo', 'MDK', 'Gauntlet', '스크래치', '데몬', '보관소', '래더']);
  const dir = join(ROOT, 'games/reverbound');
  const files = []; const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else files.push(p); } }; walk(dir);
  const hits = [];
  for (const f of files) {
    let txt; try { txt = readFileSync(f, 'utf8'); } catch { continue; }
    if (/[\x00-\x08]/.test(txt.slice(0, 2000))) continue; // 이진 파일 제외
    const lines = txt.split(/\r?\n/);
    for (const term of terms) {
      const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(/^[\x20-\x7e]+$/.test(term) ? `(?<![A-Za-z0-9])${esc}(?![A-Za-z0-9])` : esc, generic.has(term) ? 'g' : 'gi'); // 영문은 낱말 경계(maxSteps ≠ xStep)
      lines.forEach((ln, i) => { if (re.test(ln)) hits.push({ term, generic: generic.has(term), file: relative(ROOT, f).replace(/\\/g, '/'), line: i + 1, text: ln.trim().slice(0, 160) }); re.lastIndex = 0; });
    }
  }
  // 외부 URL
  const urls = [];
  for (const f of files) { let t; try { t = readFileSync(f, 'utf8'); } catch { continue; } for (const m of t.matchAll(/https?:\/\/[^\s"'`)<>]+/g)) urls.push({ file: relative(ROOT, f).replace(/\\/g, '/'), url: m[0] }); }
  return { files: files.length, terms, generic_terms: [...generic], hits_strict: hits.filter((h) => !h.generic), hits_generic: hits.filter((h) => h.generic), urls };
}


// ------------------------------------------------------------------ indep (검증기 독립성: 판정 % 계산식을 combo-ref를 쓰지 않고 harness/benchmarks/djmax-judgement.md 7-2 의사코드로 다시 짜서 빌드 combo.js와 대조)
async function partIndep() {
  const B = await import(pathToFileURL(join(ROOT, 'games/reverbound/js/combo.js')).href); // 빌드 모듈
  const P = bal.combo.judge_pct, g = bal.combo.grade_ms[1];
  // 7-2 의사코드 그대로 (경계는 '이하', d > W 실패). 창 끝 허용 오차(edge_tol_ms)는 문서에 없어 따로 셈
  const indep = (D, W) => { const d = Math.abs(D); if (d > W) return 0; if (d <= 25) return 100; if (d <= 50) return 90; if (d <= g) { const s = (g - 50) / 3; return d <= 50 + s ? 80 : d <= 50 + 2 * s ? 70 : 60; } const s = (W - g) / 5; const k = Math.min(4, Math.ceil((d - g) / s) - 1); return 50 - 10 * k; };
  const gradeIndep = (p) => (p >= 90 ? 1 : p >= 60 ? 2 : p > 0 ? 3 : 0);
  const out = { source: 'harness/benchmarks/djmax-judgement.md 7-2 의사코드를 새로 짠 함수 vs games/reverbound/js/combo.js pctOf·gradeOf', boundary: [], sweep: { checked: 0, mismatch: 0, tol_zone: 0, examples: [] }, tick_delta: { checked: 0, mismatch: 0 } };
  // (1) 손으로 정한 경계 표 (L1 첫 탭 창 + 좁은 창 탭 하나)
  const t1 = LEVELS[0].judge_taps[0];
  const narrow = LEVELS.flatMap((l) => l.judge_taps).find((t) => Math.min(t.early_ms, t.late_ms) <= 100);
  const hand = (t) => { const W = t.late_ms; const s3 = (W - g) / 5; return [[0, 100], [25, 100], [25.001, 90], [50, 90], [50.001, 80], [66.666, 80], [66.668, 70], [83.333, 70], [83.334, 60], [100, 60], ...(W > 100 ? [[100.001, 50], [100 + s3, 50], [100 + s3 + 0.001, 40], [W - 0.001, 10], [W, 10]] : [[W, W <= 83.333 ? 70 : 60]]), [W + 0.2, 0]].filter(([d]) => d <= W + 0.2 && (d <= W || d > W + 0.15)); };
  for (const [name, t] of [['L1 탭0', t1], ['좁은 창 탭', narrow]]) {
    if (!t) continue;
    for (const [d, exp] of hand(t)) { const b = B.pctOf(d, t, bal.combo), q = indep(d, t.late_ms); out.boundary.push({ tap: name, W: t.late_ms, d, expected_by_hand: exp, indep: q, build: b, grade_build: B.gradeOf ? B.gradeOf(d, bal.combo.grade_ms) : null, ok: b === exp && q === exp }); }
  }
  // (2) 모든 레벨 모든 탭, d를 0.01 ms 간격으로 −W−1 ~ +W+1 훑기
  for (const l of LEVELS) for (const t of l.judge_taps) for (const side of [-1, 1]) { const W = side < 0 ? t.early_ms : t.late_ms; for (let d = 0; d <= W + 1; d = Math.round((d + 0.01) * 1000) / 1000) {
    const D = side * d, b = B.pctOf(D, t, bal.combo), q = indep(D, W);
    out.sweep.checked++;
    if (d > W && d <= W + P.edge_tol_ms) { out.sweep.tol_zone++; continue; } // 빌드는 창 끝 0.15 ms 허용(20-balance 15-10-1), 문서 의사코드는 없음
    const gb = b ? (B.gradeOf(D, bal.combo.grade_ms)) : 0;
    if (b !== q || (b && gradeIndep(b) !== gb)) { out.sweep.mismatch++; if (out.sweep.examples.length < 8) out.sweep.examples.push({ level: l.id, i: t.i, D, W, build: b, indep: q, gb }); }
  } }
  // (3) 틱 Δ: 빌드 deltaMs(k, hz, t_s) = 손 계산 (k/240 − t_s)·1000 을 0.001 ms로 반올림
  for (const l of LEVELS) for (const t of l.judge_taps) for (let k = Math.floor((t.t_s - 0.3) * hz); k <= Math.ceil((t.t_s + 0.3) * hz); k++) { out.tick_delta.checked++; const hd = Math.round(((k * 1000) / hz - t.t_s * 1000) * 1000) / 1000; if (Math.abs(B.deltaMs(k, hz, t.t_s) - hd) > 0.0011) out.tick_delta.mismatch++; }
  out.boundary_ok = out.boundary.every((r) => r.ok);
  console.log('  indep boundary', out.boundary_ok, 'sweep', out.sweep.checked, 'mismatch', out.sweep.mismatch, 'tol', out.sweep.tol_zone, 'tick', out.tick_delta);
  return out;
}

// ------------------------------------------------------------------ menu (criteria rhythm-02 round-1: 메뉴 전환·첫 탭(오디오 잠금 해제)도 6배 스로틀에서 가장 긴 프레임 ≤ 100 ms)
async function partMenu() {
  const RUNS = +opt('--perf-runs', '3');
  const out = { runs: [] };
  const maxFrame = async (page, act) => { await page.evaluate(() => { window.__mf = { t: [performance.now()], on: true }; const f = () => { if (!window.__mf.on) return; window.__mf.t.push(performance.now()); requestAnimationFrame(f); }; requestAnimationFrame(f); }); await act(); await sleep(700); const t = await page.evaluate(() => { window.__mf.on = false; return window.__mf.t; }); let m = 0; for (let i = 1; i < t.length; i++) m = Math.max(m, t[i] - t[i - 1]); const lo = await page.evaluate((a) => window.__qa.loaf.filter((e) => e.start >= a).map((e) => ({ dur: Math.round(e.dur), block: Math.round(e.block || 0), top: e.top })), t[0]); return { max_ms: r1(m), loaf: lo.slice(0, 3) }; };
  for (let run = 1; run <= RUNS; run++) {
    await launch();
    for (const [w, h, dsf] of [[1280, 720, 1], [640, 360, 3]]) {
      const { ctx, page } = await openGame(w, h, { dsf });
      const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
      await sleep(500);
      const r = { run, res: w + 'x' + h + '@' + dsf };
      r.first_tap_unlock = await maxFrame(page, () => page.mouse.click(w / 2, h * 0.7));
      r.title_to_levels = await maxFrame(page, () => page.click('#btnLevels'));
      r.levels_to_title = await maxFrame(page, () => page.click('#levels [data-back]'));
      r.title_to_settings = await maxFrame(page, () => page.click('#btnSettings'));
      r.settings_to_title = await maxFrame(page, () => page.click('#settings [data-back]'));
      r.play_start = await maxFrame(page, () => page.click('#btnPlay'));
      out.runs.push(r);
      console.log('  menu', run, r.res, Object.entries(r).filter(([k, v]) => v && v.max_ms != null).map(([k, v]) => k + ' ' + v.max_ms).join(', '));
      await ctx.close();
    }
  }
  out.max_over_all = Math.max(...out.runs.flatMap((r) => Object.values(r).filter((v) => v && v.max_ms != null).map((v) => v.max_ms)));
  out.pass_le100 = out.max_over_all <= 100;
  return out;
}

const PARTFN = { menu: partMenu, indep: partIndep, perf3: partPerf3, firstrun: partFirstRun, combo: partCombo, a11y: partA11y, chord: partChord, grep: async () => partGrep() };
try {
  for (const p of PART) {
    const t0 = Date.now();
    console.log('part', p);
    const r = await PARTFN[p]();
    r.seconds = r1((Date.now() - t0) / 1000);
    save(p === 'grep' ? 'grep-origin' : p, r);
    console.log('part', p, 'done', r.seconds, 's');
  }
} finally {
  try { await browser?.close(); } catch {}
  server.stop();
}
save('log-extra-' + PART.join('_'), log);
console.log('log', JSON.stringify({ console: log.console.length, pageerrors: log.pageerrors.length, failed: log.failed.length, external: log.external.length, requests: log.requests }));
for (const e of [...log.console, ...log.pageerrors, ...log.failed].slice(0, 20)) console.log('  ' + e);
