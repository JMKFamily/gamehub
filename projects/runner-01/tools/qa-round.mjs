#!/usr/bin/env node
// Reverbound QA 라운드 검사 (qa-engineer). harness/qa/lib.mjs 사용.
//
//   PLAYWRIGHT_CORE=<playwright-core 경로> QA_CHANNEL=msedge node projects/runner-01/tools/qa-round.mjs --round 1 [--part basic,shots,replay,bots,realtime,perf,features,age]
//
// 정적 서버(serve.mjs)는 이 스크립트가 직접 띄우고 끝나면 종료한다 (포트 QA_PORT, 기본 8124).
// 결과: projects/runner-01/reviews/round-N/{shots/, parts/<part>.json}. merge는 --merge 로 metrics.json 생성.
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const lib = await import(pathToFileURL(join(ROOT, 'harness/qa/lib.mjs')).href);
const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const ROUND = arg('--round', '1');
const OUT = join(ROOT, `projects/runner-01/reviews/round-${ROUND}`);
const SHOTS = join(OUT, 'shots');
const PARTS = join(OUT, 'parts');
mkdirSync(SHOTS, { recursive: true }); mkdirSync(PARTS, { recursive: true });
const PORT = +(process.env.QA_PORT || 8124);
const BASE = `http://localhost:${PORT}/games/reverbound/`;
const ALL = ['basic', 'shots', 'replay', 'bots', 'realtime', 'perf', 'features', 'age'];
const parts = (arg('--part', ALL.join(','))).split(',');

if (args.includes('--merge')) { merge(); process.exit(0); }

const server = await lib.startServer(process.execPath, [join(ROOT, 'projects/runner-01/tools/serve.mjs'), String(PORT)], BASE);
const browser = await lib.launch();
const log = lib.newLog();
const VIEWS = [[360, 640], [412, 915], [640, 360], [1280, 720]];
const LV = ['01', '02', '03'];
const save = (name, obj) => writeFileSync(join(PARTS, name + '.json'), JSON.stringify(obj, null, 2));
const shot = async (p, name) => { await p.screenshot({ path: join(SHOTS, name) }); return name; };
async function open(vw, vh, q = '?test=1', o = {}) {
  const r = await lib.openPage(browser, BASE + q, { width: vw, height: vh, log, ...o });
  await r.page.waitForFunction(() => window.__game?.ready === true, null, { timeout: 20000 });
  return r;
}
// 페이지 안에서: 레벨 i를 입력열대로 tick 단위 진행 (until 초까지 또는 상태 변화까지)
const PLAY_TO = ([i, until, set]) => {
  const g = window.__game; g.loadLevel(i);
  const taps = new Set(g.testInputs.levels[['01', '02', '03'][i]][set || 'taps']);
  let k = 0;
  while (g.tick < until * 240 && g.state === 'playing' && k++ < 200000) {
    if (taps.has(g.tick)) { g.press(); g.step(1 / 240); g.release(); } else g.step(1 / 240);
  }
  return { state: g.state, progress: g.progress };
};

try {
  // ------------------------------------------------------------ 1. 기본
  if (parts.includes('basic')) {
    const res = {};
    for (const q of ['?test=1', '', '?lang=en']) {
      const before = { c: log.console.length, e: log.pageerrors.length, f: log.failed.length, x: log.external.length };
      const { ctx, page } = await open(1280, 720, q);
      await page.waitForTimeout(1500);
      // 일반 모드는 첫 탭·메뉴·레벨 시작까지 해 본다 (오디오 포함)
      if (q !== '?test=1') {
        await page.mouse.click(640, 360); await page.waitForTimeout(300);
        await page.click('#btnPlay'); await page.waitForTimeout(3000);
      }
      res[q || '(normal)'] = { console: log.console.length - before.c, pageerrors: log.pageerrors.length - before.e, failed: log.failed.length - before.f, external: log.external.length - before.x };
      await ctx.close();
    }
    res.log = { ...log };
    save('basic', res);
    console.log('basic', JSON.stringify(res));
  }

  // ------------------------------------------------------------ 2. 화면별 스크린샷 (타이틀·플레이·사망·클리어 + 레벨 선택·일시정지·설정)
  if (parts.includes('shots')) {
    const res = { shots: [], overflow: {}, outside: {} };
    for (const [vw, vh] of VIEWS) {
      const tag = `${vw}x${vh}`;
      // 일반 모드 타이틀 (첫 탭 전, 세로면 회전 안내)
      {
        const { ctx, page } = await open(vw, vh, '');
        await page.waitForTimeout(400);
        res.shots.push(await shot(page, `${tag}-title-normal-first.png`));
        await page.mouse.click(Math.round(vw / 2), Math.round(vh / 2)); await page.waitForTimeout(300);
        res.shots.push(await shot(page, `${tag}-title-normal-menu.png`));
        await ctx.close();
      }
      const { ctx, page } = await open(vw, vh);
      await page.evaluate(() => window.__game.show('title')); await page.waitForTimeout(150);
      res.shots.push(await shot(page, `${tag}-01-title.png`));
      await page.evaluate(() => window.__game.show('levels')); await page.waitForTimeout(150);
      res.shots.push(await shot(page, `${tag}-02-levels.png`));
      for (const i of [0, 1, 2]) {
        await page.evaluate(PLAY_TO, [i, [6.2, 26.5, 25.6][i]]); await page.waitForTimeout(80);
        res.shots.push(await shot(page, `${tag}-03-play-level${i + 1}.png`));
      }
      // HUD·텍스트 잘림 (플레이 중)
      res.outside[tag] = await page.evaluate(([vw, vh]) => [...document.querySelectorAll('#hud *, #cue, #toast')].filter((e) => e.offsetParent).map((e) => ({ id: e.id || e.className, r: e.getBoundingClientRect() }))
        .filter(({ r }) => r.width && (r.left < -0.5 || r.top < -0.5 || r.right > vw + 0.5 || r.bottom > vh + 0.5)).map((o) => o.id), [vw, vh]);
      await page.evaluate(() => { const g = window.__game; g.loadLevel(0); for (let j = 0; j < 3000 && g.state === 'playing'; j++) g.step(1 / 240); g.step(0.2); });
      res.shots.push(await shot(page, `${tag}-04-death.png`));
      await page.evaluate(() => { const g = window.__game; g.replay(0); g.step(0.4); });
      res.shots.push(await shot(page, `${tag}-05-clear-fx.png`));
      await page.evaluate(() => window.__game.step(1));
      res.shots.push(await shot(page, `${tag}-06-clear-screen.png`));
      await page.evaluate(() => { const g = window.__game; g.loadLevel(2); g.step(2); g.pause(); }); await page.waitForTimeout(80);
      res.shots.push(await shot(page, `${tag}-07-pause.png`));
      await page.evaluate(() => window.__game.show('settings')); await page.waitForTimeout(80);
      res.shots.push(await shot(page, `${tag}-08-settings.png`));
      // 화면마다 글 넘침 검사 (scrollWidth > clientWidth 또는 뷰포트 밖)
      const ov = {};
      for (const scr of ['title', 'levels', 'settings', 'pause', 'clearS']) {
        await page.evaluate((s) => { const g = window.__game; if (s === 'pause') { g.loadLevel(0); g.step(1); g.pause(); } else if (s === 'clearS') { g.replay(0); g.step(1.3); } else g.show(s); }, scr);
        await page.waitForTimeout(60);
        ov[scr] = await page.evaluate(([vw, vh]) => [...document.querySelectorAll('.screen.show *')].filter((e) => e.offsetParent && e.children.length === 0 && e.textContent.trim()).filter((e) => {
          const r = e.getBoundingClientRect();
          return e.scrollWidth > e.clientWidth + 1 || r.left < -0.5 || r.right > vw + 0.5 || r.top < -0.5 || r.bottom > vh + 0.5;
        }).map((e) => `${e.id || e.tagName}:${e.textContent.trim().slice(0, 20)}`), [vw, vh]);
      }
      res.overflow[tag] = ov;
      await ctx.close();
    }
    save('shots', res);
    console.log('shots', res.shots.length, JSON.stringify({ overflow: res.overflow, outside: res.outside }));
  }

  // ------------------------------------------------------------ 3a. 완벽 입력열 재생 (빌드 = 시뮬레이터 확인)
  if (parts.includes('replay')) {
    const { ctx, page } = await open(1280, 720);
    const runs = await page.evaluate(() => {
      const g = window.__game, out = [];
      const frames = [['60Hz', 1 / 60], ['144Hz', 1 / 144], ['30Hz', 1 / 30], ['20Hz', 1 / 20], ['10Hz(상한 24틱)', 1 / 10]];
      for (let i = 0; i < 3; i++) for (const set of ['taps', 'on_beat_taps']) for (const hold of [1, 24]) for (const [fn, fd] of frames) {
        const taps = g.testInputs.levels[['01', '02', '03'][i]][set];
        const r = g.replay(i, taps, { holdTicks: hold, frameDt: fd });
        out.push({ level: i + 1, set, hold_ticks: hold, frame: fn, state: r.state, progress: +r.progress.toFixed(2), death: r.death });
      }
      // 음성 대조: 무입력·홀드만은 클리어되면 안 됨
      for (let i = 0; i < 3; i++) {
        const r0 = g.replay(i, []); out.push({ level: i + 1, set: 'none', state: r0.state, progress: +r0.progress.toFixed(2) });
        const rh = g.replay(i, [0], { holdTicks: 1e9 }); out.push({ level: i + 1, set: 'hold_all', state: rh.state, progress: +rh.progress.toFixed(2) });
      }
      return out;
    });
    // 경계 감도: 가장 빡빡한 탭을 ±k틱 밀었을 때 (검증기 창과 비교)
    const sens = await page.evaluate(() => {
      const g = window.__game, res = {};
      for (let i = 0; i < 3; i++) {
        const id = ['01', '02', '03'][i], taps = g.testInputs.levels[id].taps;
        let lo = 0, hi = 0;
        // 전체 탭을 같이 밀었을 때 몇 틱까지 클리어되는지 (빌드 기준 전역 오프셋 허용치)
        for (let d = 1; d < 80; d++) { if (g.replay(i, taps.map((k) => k - d)).state !== 'clear') break; lo = d; }
        for (let d = 1; d < 80; d++) { if (g.replay(i, taps.map((k) => k + d)).state !== 'clear') break; hi = d; }
        res[id] = { global_shift_ok_ms: [-(lo / 240) * 1000, (hi / 240) * 1000].map((v) => +v.toFixed(1)) };
      }
      return res;
    });
    save('replay', { runs, sensitivity: sens });
    const bad = runs.filter((r) => ['taps', 'on_beat_taps'].includes(r.set) ? r.state !== 'clear' : r.state === 'clear');
    console.log('replay', runs.length, 'bad', bad.length, JSON.stringify(sens));
    await ctx.close();
  }

  // ------------------------------------------------------------ 3b. 봇 (초보 = 완벽 입력열 + 사람 타이밍 오차, 랜덤 = 무작위 탭)
  if (parts.includes('bots')) {
    const { ctx, page } = await open(1280, 720);
    const N = +(arg('--n', '200'));
    const res = await page.evaluate((N) => {
      const g = window.__game;
      let seed = 12345;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
      const lengths = [0, 1, 2].map((i) => { g.loadLevel(i); return null; });
      const profiles = {
        'skilled_sd25': { sd: 25, miss: 0.0, extra: 0.0 },
        'novice_sd50': { sd: 50, miss: 0.01, extra: 0.01 },
        'child_sd70': { sd: 70, miss: 0.03, extra: 0.02 },   // 5~6세 대리 모델 (가정: 탭 타이밍 표준편차 70 ms, 탭 놓침 3%, 엉뚱한 탭 2%/탭)
        'child_sd90': { sd: 90, miss: 0.05, extra: 0.03 },
      };
      const out = {};
      const attempt = (i, p) => {
        const id = ['01', '02', '03'][i], base = g.testInputs.levels[id].taps;
        const taps = [];
        for (const k of base) {
          if (rnd() < p.miss) continue;
          taps.push(Math.max(0, Math.round(k + (gauss() * p.sd / 1000) * 240)));
          if (rnd() < p.extra) taps.push(Math.round(k + (0.15 + rnd() * 0.3) * 240));
        }
        taps.sort((a, b) => a - b);
        const r = g.replay(i, taps, { holdTicks: 24, frameDt: 1 / 60 });
        return r;
      };
      for (const [pn, p] of Object.entries(profiles)) {
        out[pn] = {};
        for (let i = 0; i < 3; i++) {
          const prog = [], deathsX = [];
          let clears = 0;
          for (let n = 0; n < N; n++) {
            const r = attempt(i, p);
            prog.push(r.progress);
            if (r.state === 'clear') clears++; else deathsX.push(+r.death.x.toFixed(1));
          }
          prog.sort((a, b) => a - b);
          const bins = Array(20).fill(0);
          for (const v of prog) if (v < 100) bins[Math.min(19, Math.floor(v / 5))]++;
          const hot = {};
          for (const x of deathsX) { const k = Math.round(x); hot[k] = (hot[k] || 0) + 1; }
          const top = Object.entries(hot).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([x, c]) => ({ x: +x, share: +(c / Math.max(1, deathsX.length)).toFixed(3) }));
          out[pn][['01', '02', '03'][i]] = {
            n: N, clear_rate: +(clears / N).toFixed(3), mean_progress: +(prog.reduce((a, b) => a + b, 0) / N).toFixed(1),
            median_progress: +prog[Math.floor(N / 2)].toFixed(1), death_hist_5pct: bins, top_death_x: top,
            expected_attempts_to_clear: clears ? +(N / clears).toFixed(1) : null,
          };
        }
      }
      // 레벨 1 첫 클리어까지 시도 횟수 (세션 시뮬레이션, 상한 200)
      const sessions = {};
      for (const pn of ['novice_sd50', 'child_sd70', 'child_sd90']) {
        const a = [];
        for (let s = 0; s < 60; s++) { let n = 1; while (n <= 200 && attempt(0, profiles[pn]).state !== 'clear') n++; a.push(n); }
        a.sort((x, y) => x - y);
        sessions[pn] = { sessions: 60, median: a[30], p25: a[15], p75: a[45], p90: a[54], over_200: a.filter((v) => v > 200).length };
      }
      // 랜덤 봇: 평균 0.5 s 간격 포아송 탭, 100 ms 누름
      const random = {};
      for (let i = 0; i < 3; i++) {
        const prog = [];
        for (let n = 0; n < N; n++) {
          const taps = []; let t = 0;
          while (t < 80) { t += -Math.log(1 - rnd()) * 0.5; taps.push(Math.round(t * 240)); }
          prog.push(g.replay(i, taps, { holdTicks: 24 }).progress);
        }
        prog.sort((a, b) => a - b);
        random[['01', '02', '03'][i]] = { n: N, mean_progress: +(prog.reduce((a, b) => a + b, 0) / N).toFixed(1), median_progress: +prog[Math.floor(N / 2)].toFixed(1), max_progress: +prog[N - 1].toFixed(1) };
      }
      return { profiles, by_profile: out, level1_attempts_to_first_clear: sessions, random_bot: random };
    }, N);
    save('bots', res);
    console.log('bots', JSON.stringify(Object.fromEntries(Object.entries(res.by_profile).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([l, s]) => [l, [s.clear_rate, s.mean_progress]]))]))), JSON.stringify(res.level1_attempts_to_first_clear));
    await ctx.close();
  }

  // ------------------------------------------------------------ 3c / 4. 실시간 (일반 모드, rAF 루프 + 키 이벤트 경로)
  // 페이지 안 스케줄러: 검증기 탭 틱 → 예상 perf 시각에 keydown/keyup(80 ms) 발생. rAF마다 (ts, tick)로 시계 추정.
  const RT_PLAY = async (page, i, { maxS = 90 } = {}) => page.evaluate(([i, maxS]) => new Promise((done) => {
    const g = window.__game, hz = 240;
    const taps = g.testInputs?.levels?.[['01', '02', '03'][i]]?.taps || window.__qaTaps[i];
    g.loadLevel(i);
    const att0 = g.attempts;
    const est = [];
    let ti = 0, sent = [], t0 = performance.now(), result = null, lastTick = -1;
    const fire = (type) => window.dispatchEvent(new KeyboardEvent(type, { code: 'Space', key: ' ', bubbles: true }));
    const onFrame = (ts) => {
      if (result) return;
      const k = g.tick;
      if (k > 0 && g.state === 'playing' && k !== lastTick) { est.push(ts / 1000 - (k + 0.5) / hz); if (est.length > 40) est.shift(); }
      lastTick = k;
      if (g.state === 'clear' || g.state === 'dead' || g.attempts !== att0 || performance.now() - t0 > maxS * 1000) {
        result = { state: g.state === 'playing' && g.attempts !== att0 ? 'dead(restarted)' : g.state, progress: g.progress, taps_sent: sent.length, taps_total: taps.length,
          send_err_ms: sent.length ? { mean: +(sent.reduce((a, b) => a + b, 0) / sent.length).toFixed(2), max: +Math.max(...sent.map(Math.abs)).toFixed(2) } : null };
        done(result); return;
      }
      requestAnimationFrame(onFrame);
    };
    requestAnimationFrame(onFrame);
    const sched = () => {
      if (result) return;
      if (est.length >= 3 || (g.tick === 0)) {
        const off = est.length ? [...est].sort((a, b) => a - b)[est.length >> 1] : null;
        if (off != null) {
          while (ti < taps.length) {
            const target = ((taps[ti] + 0.5) / hz + off) * 1000;
            const now = performance.now();
            if (now >= target - 0.5) { fire('keydown'); sent.push(now - target); setTimeout(() => fire('keyup'), 80); ti++; } else break;
          }
        }
      }
      setTimeout(sched, 1);
    };
    sched();
  }), [i, maxS]);

  async function normalPage(vw, vh, o = {}) {
    const r = await open(vw, vh, '', o);
    const taps = JSON.parse(readFileSync(join(ROOT, 'games/reverbound/data/test-inputs.json'), 'utf8'));
    await r.page.evaluate((t) => { window.__qaTaps = ['01', '02', '03'].map((id) => t.levels[id].taps); }, taps);
    await r.page.keyboard.press('Space'); await r.page.waitForTimeout(400); // 첫 탭 → 메뉴 (오디오 켜짐)
    return r;
  }

  if (parts.includes('realtime')) {
    const res = { runs: [] };
    const { ctx, page } = await normalPage(1280, 720);
    res.audio = await page.evaluate(() => window.__game.audio);
    for (const i of [0, 1, 2]) {
      const r = await RT_PLAY(page, i);
      res.runs.push({ level: i + 1, throttle: 1, ...r });
      console.log('realtime', i + 1, JSON.stringify(r));
    }
    await ctx.close();
    save('realtime', res);
  }

  if (parts.includes('perf')) {
    const res = {};
    for (const [vw, vh, dsf] of [[1280, 720, 1], [640, 360, 3]]) {
      const tag = `${vw}x${vh}@${dsf}x`;
      const { ctx, page } = await normalPage(vw, vh, { dsf });
      const cdp = await lib.throttle(page, 6);
      await page.waitForTimeout(500);
      // (a) 레벨 1 실시간 완주 중 FPS
      await lib.fpsStart(page);
      const run = await RT_PLAY(page, 0);
      const fps = await lib.fpsStop(page);
      // (b) 레벨 3 빠름 구간 (오브젝트 최다) FPS: 테스트 입력열로 진행 상태 유지. 30 s만
      await lib.fpsStart(page);
      const run3 = await RT_PLAY(page, 2, { maxS: 30 });
      const fps3 = await lib.fpsStop(page);
      // (c) 입력 → 점프 반응 프레임: 레벨 1 시작 후 장애물 전(4 s) 구간에서 접지 상태일 때 keydown, 이후 rAF마다 y 확인
      const react = await page.evaluate(() => new Promise((done) => {
        const g = window.__game, out = [];
        let attempt = 0;
        const run = () => {
          g.loadLevel(0);
          let phase = 'wait', frames = 0, waitUntil = performance.now() + 900;
          const f = () => {
            if (out.length >= 20 || attempt > 8) { done(out); return; }
            if (g.state !== 'playing') { requestAnimationFrame(f); return; }
            const p = g.player;
            if (phase === 'wait') {
              if (g.tick > 0 && p.grounded && p.y === 0 && performance.now() > waitUntil && g.tick < 3.3 * 240) {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
                setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true })), 60);
                phase = 'measure'; frames = 0;
              } else if (g.tick >= 3.3 * 240) { attempt++; run(); return; }
            } else {
              frames++;
              if (p.y > 0 || frames > 10) { out.push(frames); phase = 'wait'; waitUntil = performance.now() + 500; }
            }
            requestAnimationFrame(f);
          };
          requestAnimationFrame(f);
        };
        run();
      }));
      // (d) 사망 → 재시작 시간: 무입력으로 첫 장애물에 사망, rAF마다 상태 확인
      const restart = await page.evaluate(() => new Promise((done) => {
        const g = window.__game, out = [];
        const one = () => {
          g.loadLevel(0);
          const a0 = g.attempts; let tDead = null, tPlay = null;
          const f = (ts) => {
            const now = performance.now();
            if (g.state === 'dead' && tDead == null) tDead = now;
            if (tDead != null && tPlay == null && g.attempts !== a0) tPlay = now;
            if (tPlay != null && g.tick > 0) { out.push({ dead_to_new_attempt_ms: +(tPlay - tDead).toFixed(0), dead_to_moving_ms: +(now - tDead).toFixed(0) }); if (out.length >= 5) { done(out); return; } one(); return; }
            requestAnimationFrame(f);
          };
          requestAnimationFrame(f);
        };
        one();
      }));
      res[tag] = { throttle: 6, level1_run: run, fps_level1: fps, level3_30s_run: run3, fps_level3: fps3, input_to_jump_frames: react, restart };
      console.log('perf', tag, JSON.stringify({ fps, fps3, react, restart, run: run.state, run3: run3.state }));
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      // 비교: 스로틀 없이 반응 프레임·재시작 시간 (같은 측정)
      await ctx.close();
    }
    {
      const { ctx, page } = await normalPage(1280, 720);
      await lib.fpsStart(page);
      const run = await RT_PLAY(page, 0, { maxS: 20 });
      res['1280x720@1x_nothrottle'] = { fps_level1_20s: await lib.fpsStop(page), run };
      await ctx.close();
    }
    save('perf', res);
  }

  // ------------------------------------------------------------ 5. 기능 체크리스트
  if (parts.includes('features')) {
    const res = {};
    // 연습 모드: 체크포인트 재시작 위치, 클리어로 인정 안 함, 연습 최고 % 따로 저장
    {
      const { ctx, page } = await open(1280, 720);
      res.practice = await page.evaluate(() => {
        const g = window.__game, hz = 240;
        g.loadLevel(1, { practice: true });
        const taps = new Set(g.testInputs.levels['02'].taps);
        let k = 0;
        while (g.tick < 20 * hz && g.state === 'playing' && k++ < 1e6) { if (taps.has(g.tick)) { g.press(); g.step(1 / hz); g.release(); } else g.step(1 / hz); }
        const placed = g.placeCheckpoint();
        const cpTick = g.tick, cpX = g.player.x;
        // 입력 멈춤 → 사망 → 재시작
        let guard = 0; while (g.state === 'playing' && guard++ < 1e5) g.step(1 / hz);
        const deadAt = g.player.x;
        g.step(0.61);
        const after = { state: g.state, tick: g.tick, x: g.player.x, attempts: g.attempts };
        // 끝까지 클리어 (연습)
        guard = 0;
        while (g.state === 'playing' && guard++ < 1e6) { if (taps.has(g.tick)) { g.press(); g.step(1 / hz); g.release(); } else g.step(1 / hz); }
        const st = g.state;
        const sv = g.save.levels['02'] || {};
        return { placed, cp_tick: cpTick, cp_x: cpX, dead_x: deadAt, after_restart: after, restart_at_checkpoint: after.tick === cpTick, practice_end_state: st, save_02: sv, counts_as_clear: !!sv.cleared };
      });
      // 저장: 레벨 1 사망 후 최고 기록, 레벨 1 클리어 → 새로고침 후 유지
      res.save = await page.evaluate(() => {
        const g = window.__game;
        g.loadLevel(0); let j = 0; while (g.state === 'playing' && j++ < 1e5) g.step(1 / 240);
        const best = g.save.levels['01']?.best;
        g.replay(0);
        return { best_after_death: best, after_clear: g.save.levels['01'] };
      });
      await page.reload();
      await page.waitForFunction(() => window.__game?.ready === true);
      res.save.after_reload = await page.evaluate(() => window.__game.save.levels);
      res.save.persisted = !!res.save.after_reload['01']?.cleared && res.save.after_reload['01'].best === 100;
      await ctx.close();
    }
    // 잠금: 새 컨텍스트(빈 저장) 일반 모드 레벨 선택 카드
    {
      const { ctx, page } = await normalPage(1280, 720);
      await page.click('#btnLevels'); await page.waitForTimeout(200);
      res.locks_fresh = await page.evaluate(() => [...document.querySelectorAll('#cards > *')].map((c) => ({ cls: c.className, text: c.textContent.trim().slice(0, 40), disabled: c.disabled ?? null })));
      await shot(page, '1280x720-10-levels-fresh-save.png');
      // 일시정지 버튼을 눌러도 점프하지 않아야 함
      await page.keyboard.press('Escape'); await page.waitForTimeout(100);
      await page.click('#btnPlay'); await page.waitForTimeout(1200);
      const box = await page.locator('#pauseBtn').boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(50);
      res.pause_button = await page.evaluate(() => ({ state: window.__game.state, player: window.__game.player }));
      await shot(page, '1280x720-11-pause-normal.png');
      // 계속 → 카운트다운 시간
      const t0 = Date.now();
      await page.click('#pResume');
      await page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 5000 });
      res.resume_countdown_ms = Date.now() - t0;
      // 백그라운드(visibilitychange) → 자동 일시정지, 틱 정지, 오디오 suspend
      await page.waitForTimeout(500);
      const bg = await page.evaluate(async () => {
        const g = window.__game;
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
        const t1 = g.tick;
        await new Promise((r) => setTimeout(r, 1000));
        const out = { state: g.state, tick_advanced: g.tick - t1, audio: g.audio, bgText: !document.getElementById('pauseBg').classList.contains('hidden') };
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
        document.dispatchEvent(new Event('visibilitychange'));
        await new Promise((r) => setTimeout(r, 300));
        out.after_visible = { state: g.state, audio: g.audio };
        return out;
      });
      res.background = bg;
      await shot(page, '1280x720-12-background-paused.png');
      await page.click('#pResume');
      await page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 5000 });
      res.blur = await page.evaluate(async () => { window.dispatchEvent(new Event('blur')); await new Promise((r) => setTimeout(r, 200)); return window.__game.state; });
      // 사망 중 백그라운드 → 복귀 시 자동 재시작이 진행되지 않는지
      await page.click('#pQuit');
      await page.waitForTimeout(200);
      await ctx.close();
    }
    // 음소거: GainNode 값을 가로채 확인 + 새로고침 후 유지
    {
      const r = await lib.openPage(browser, BASE, { width: 1280, height: 720, log });
      const page = r.page;
      await page.waitForFunction(() => window.__game?.ready === true);
      await page.evaluate(() => {
        window.__qaGains = [];
        const orig = BaseAudioContext.prototype.createGain;
        BaseAudioContext.prototype.createGain = function () { const g = orig.call(this); window.__qaGains.push(g); return g; };
      });
      await page.keyboard.press('Space'); await page.waitForTimeout(300);
      await page.click('#btnSettings'); await page.waitForTimeout(100);
      const before = await page.evaluate(() => window.__qaGains.slice(0, 8).map((g) => +g.gain.value.toFixed(3)));
      await page.click('#bMute'); await page.waitForTimeout(100);
      const after = await page.evaluate(() => window.__qaGains.slice(0, 8).map((g) => +g.gain.value.toFixed(3)));
      await shot(page, '1280x720-13-settings-muted.png');
      await page.reload(); await page.waitForFunction(() => window.__game?.ready === true);
      const persisted = await page.evaluate(() => window.__game.save.settings);
      res.mute = { gains_before: before, gains_after: after, settings_after_reload: persisted };
      await r.ctx.close();
    }
    save('features', res);
    console.log('features', JSON.stringify(res, null, 1).slice(0, 3000));
  }

  // ------------------------------------------------------------ 7. 대상 연령: 버튼 크기, 글 없는 화면
  if (parts.includes('age')) {
    const res = { targets: {}, small: {} };
    for (const [vw, vh] of VIEWS) {
      const tag = `${vw}x${vh}`;
      const { ctx, page } = await open(vw, vh);
      const all = {};
      const go = {
        title: () => window.__game.show('title'),
        levels: () => window.__game.show('levels'),
        settings: () => window.__game.show('settings'),
        play_practice: () => { const g = window.__game; g.loadLevel(0, { practice: true }); g.step(0.5); },
        pause: () => { const g = window.__game; g.loadLevel(0); g.step(1); g.pause(); },
        clear: () => { const g = window.__game; g.replay(0); g.step(1.3); },
      };
      for (const [name, fn] of Object.entries(go)) {
        await page.evaluate(fn); await page.waitForTimeout(60);
        all[name] = await lib.measureTargets(page, '.screen.show button, .screen.show a, .screen.show input, .screen.show .card, #hud:not(.hidden) button');
      }
      res.targets[tag] = all;
      res.small[tag] = Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.filter((t) => t.w < 48 || t.h < 48).map((t) => `${t.id || t.tag + '.' + t.cls}(${t.w}x${t.h})`)]).filter(([, v]) => v.length));
      await ctx.close();
      // 글을 지운 화면 (글 없이 진행 가능한지 보는 용도)
      if (vw === 360 || vw === 640) {
        const { ctx: c2, page: p2 } = await open(vw, vh);
        await lib.blankText(p2);
        for (const [name, fn] of [['title', go.title], ['levels', go.levels], ['pause', go.pause], ['clear', go.clear]]) {
          await p2.evaluate(fn); await p2.waitForTimeout(80);
          await shot(p2, `${tag}-notext-${name}.png`);
        }
        // 튜토리얼 카드·손가락 시연은 이 페이지에서 레벨 1을 이미 클리어해(go.clear) 표시되지 않으므로 아래 일반 모드(rt) 샷으로 확인
        // 첫 사망 안내 (tut_restart)
        await p2.evaluate(() => { const g = window.__game; g.loadLevel(0); let j = 0; while (g.state === 'playing' && j++ < 1e5) g.step(1 / 240); g.step(0.1); });
        await shot(p2, `${tag}-notext-first-death.png`);
        await c2.close();
      }
    }
    // ?test=1에서는 첫 cue(x=0)가 hook.step 경로로 보이지 않아(qa.md 이슈) 일반 모드 실시간으로 다시 찍는다
    for (const [vw, vh] of [[360, 640], [640, 360]]) {
      const tag = `${vw}x${vh}`;
      for (const blank of [false, true]) {
        const { ctx, page } = await normalPage(vw, vh);
        if (blank) await lib.blankText(page);
        await page.evaluate(() => window.__game.loadLevel(0));
        const sfx = blank ? 'notext-rt' : 'rt';
        await page.waitForTimeout(1200); await shot(page, `${tag}-${sfx}-level1-1.2s-cue.png`);
        await page.waitForFunction(() => window.__game.tick >= 3.75 * 240, null, { timeout: 8000 });
        await shot(page, `${tag}-${sfx}-level1-3.75s-finger.png`);
        await page.waitForFunction(() => window.__game.tick >= 3.98 * 240, null, { timeout: 8000 });
        await shot(page, `${tag}-${sfx}-level1-4.0s-finger-press.png`);
        await ctx.close();
      }
    }
    save('age', res);
    console.log('age small', JSON.stringify(res.small));
  }
} finally {
  await browser.close().catch(() => {});
  server.stop();
}
save('log-' + parts.join('_'), log);
console.log('log', JSON.stringify({ console: log.console.length, pageerrors: log.pageerrors.length, failed: log.failed.length, external: log.external.length, requests: log.requests }));
for (const e of [...log.console, ...log.pageerrors, ...log.failed].slice(0, 20)) console.log('  ' + e);

function merge() {
  const m = { game: 'reverbound', round: +ROUND, generated: new Date().toISOString(), tool: 'projects/runner-01/tools/qa-round.mjs', browser: 'Microsoft Edge (playwright-core, channel msedge, headless)' };
  for (const f of readdirSync(PARTS)) if (f.endsWith('.json')) m[f.replace('.json', '')] = JSON.parse(readFileSync(join(PARTS, f), 'utf8'));
  writeFileSync(join(OUT, 'metrics.json'), JSON.stringify(m, null, 2));
  console.log('metrics.json written');
}
